var parse = require('./parse.js');
var upload = require('./upload.js');
var download = require('./download.js');

function all(settings, callback) {
	parse(settings)
		.fail(callback)
		.done(function (keys) {
			settings.keys = keys;
			upload(settings, function (err) {
				if (err) {
					callback(err);
				}

				download(settings, callback);
			});
		});
}

exports = all;
module.exports = exports;