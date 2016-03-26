var parse = require('./parse.js');
var upload = require('./upload.js');
var download = require('./download.js');
var _ = require('_');
var FS = require('fs');

var defaultSettings = {
	saveKeysFile: null //full path
};

function all(settings, callback) {
	_.defaults(settings, defaultSettings);

	var uploadfn = function() {
		upload(settings, function(err) {
			if (err) {
				return callback(err);
			}

			download(settings, callback);
		});
	};

	parse(settings)
		.fail(callback)
		.done(function (keys) {
			settings.keys = keys;

			if (settings.saveKeysFile) {
				FS.writeFile(settings.saveKeysFile, JSON.stringify(keys), function(err) {
					if (err) {
						return callback(err);
					}
					uploadfn();
				});
			}
			else {
				uploadfn();
			}
		});
}

exports = all;
module.exports = exports;