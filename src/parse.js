var FS = require('fs');
var PATH = require('path');
var _ = require('lodash');
var Q = require('q');
var recursive = require('./recursive');
var escapeStringRegexp = require('escape-string-regexp');

var defaultSettings = {
	folders: ['.'],
	folders_excluded: [],
	folders_names_excluded: ['node_modules', 'bower_components', 'libs', 'vendor'],
	ignore_hidden_files: true, //ignore folders and files whose name starts with a dot
	exts_included: ['js', 'php', 'html', 'phtml', 'tpl'],
	exts_excluded: [],
	funcs_names: ['translate'],
	attrs_names: ['data-translate']
};

var replaceRegex = function (regex, replaceDic, options) {
	regex = regex.toString();
	for (var i in replaceDic) {
		if (!replaceDic.hasOwnProperty(i)) {
			continue;
		}
		regex = regex.replace(i, replaceDic[i]);
	}
	regex = regex.substr(1, regex.length - 2);
	regex = new RegExp(regex, options);
	return regex;
};

var parseFuncs = function (content, funcs) {
	var keys = [];
	if (!funcs.length) {
		return keys;
	}
	funcs = _.map(funcs, escapeStringRegexp).join('|');
	var regex = /[^a-zA-Z0-9-_](?:__FUNCS__)\s*\((?:'|")(.*?)(?:(?!\\)'|")/;
	regex = replaceRegex(regex, {
		__FUNCS__: funcs
	}, 'g');
	var match;
	while ((match = regex.exec(content)) !== null) {
		keys.push(match[1]);
	}

	return keys;
};

var parseAttrs = function (content, attrs) {
	var keys = [];
	if (!attrs.length) {
		return keys;
	}
	attrs = _.map(attrs, escapeStringRegexp).join('|');
	var tagRegex = /<[a-z].*?\s.*?>/gi;
	var attrRegex = /\s(__ATTRS__)\s*=("|')/;
	attrRegex = replaceRegex(attrRegex, {
		__ATTRS__: attrs
	}, 'g');
	var tag;
	while ((tag = tagRegex.exec(content)) !== null) {
		tag = tag[0];
		var match = tag.match(attrRegex);
		if (match) {
			match = match[0];
			var endChar = match[match.length - 1];
			attrRegex = /\s__ATTRS__\s*=__STARTCHAR__([^__ENDCHAR__]+)/;
			attrRegex = replaceRegex(attrRegex, {
				__ATTRS__: attrs,
				__STARTCHAR__: endChar,
				__ENDCHAR__: endChar
			}, 'g');
			match = attrRegex.exec(tag);
			if (match) {
				keys.push(match[1]);
			}
		}
	}
	return keys;
};

var parseContent = function (file, settings) {
	var defer = Q.defer();
	FS.readFile(file, 'utf8', function (err, content) {
		if (err) {
			defer.reject(err);
			return;
		}

		var keys = [];

		_.merge(keys, parseFuncs(content, settings.funcs_names));
		_.merge(keys, parseAttrs(content, settings.attrs_names));

		defer.resolve(keys);
	});
	return defer.promise;
};

var filterFunc = function (settings) {
	var exts_included = settings.exts_included;
	var folders_excluded = settings.folders_excluded;
	var exts_excluded = settings.exts_excluded;
	var folders_names_excluded = settings.folders_names_excluded;

	return function (file, stats) {
		var name = PATH.basename(file);

		if (settings.ignore_hidden_files && name[0] === '.') {
			return false;
		}

		if (stats.isDirectory()) {
			if (folders_names_excluded.indexOf(name) !== -1) {
				return false;
			}
			if (folders_excluded.indexOf(file) !== -1) {
				return false;
			}
		}
		else {
			var ext = PATH.extname(file);
			ext = ext.replace(/^\./, '');
			if (exts_included.length && exts_included.indexOf(ext) === -1) {
				return false;
			}
			if (exts_excluded.indexOf(ext) !== -1) {
				return false;
			}
		}
		return true; //continue
	};
};

var prepareSettings = function (settings) {
	_.defaults(settings, defaultSettings);

	settings.folders_excluded = _.map(settings.folders_excluded, function (folder) {
		try {
			return FS.realpathSync(folder);
		}
		catch (e) {
		}
		return null;
	});

	settings.folders_excluded = _.filter(settings.folders_excluded, function (folder) {
		return folder;
	});
};

function when(defs) {
	return Q.all(_.map(defs, function (def) {
		return def.promise;
	}));
}

exports = function (settings, callback) {
	prepareSettings(settings);

	if (!callback) {
		callback = function () {
		};
	}

	var keys = [];
	var def = Q.defer();

	var defs = _.map(settings.folders, function (folder) {
		var def = Q.defer();
		recursive(folder, filterFunc(settings), function (file) {
			var promise = parseContent(file, settings);
			promise.done(function (nKeys) {
				keys.push(nKeys);
			});
			return promise;
		}).then(def.resolve, def.reject);
		return def;
	});

	when(defs).then(function () {
		keys = _.union.apply(_, keys);
		keys = keys.sort();
		callback(null, keys);
		def.resolve(keys);
	}, function (err) {
		callback(err);
		def.reject(err);
	});

	return def.promise;
};

module.exports = exports;