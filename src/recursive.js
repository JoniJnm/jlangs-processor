var PATH = require('path');
var FS = require('fs');
var _ = require('lodash');
var Q = require('q');

function propagate(promise, defer) {
	promise.then(function () {
		defer.resolve(arguments);
	}, function (err) {
		defer.reject(err);
	});
}

function when(defs) {
	return Q.all(_.map(defs, function (def) {
		return def.promise;
	}));
}

function recursive(path, _filterFunc, callback) {
	var hasError = false;

	var filterFunc = function (file, stats) {
		return !hasError && _filterFunc(file, stats);
	};

	var fail = function (def, err) {
		def.reject(err);
		hasError = true;
	};

	var r = function (path, filterFunc, callback) {
		var def = Q.defer();
		FS.readdir(path, function (err, files) {
			if (err) {
				fail(def, err);
				return;
			}

			files = _.map(files, function (file) {
				file = PATH.join(path, file);
				file = FS.realpathSync(file);
				return file;
			});

			var defs = [];

			files.forEach(function (v, index) {
				defs[index] = Q.defer();
			});

			files.forEach(function (file, index) {
				var def = defs[index];
				FS.stat(file, function (err, stats) {
					if (err) {
						fail(def, err);
						return;
					}
					else if (!filterFunc(file, stats)) {
						def.resolve();
					}
					else if (stats.isDirectory()) {
						propagate(r(file, filterFunc, callback), def);
					}
					else {
						var promise = callback(file, stats);
						if (promise && promise.then) {
							propagate(promise, def);
						}
						else {
							def.resolve();
						}
					}
				});
			});

			propagate(when(defs), def);
		});
		return def.promise;
	};

	return r(path, filterFunc, callback);
}

exports = recursive;

module.exports = exports;