var _ = require('lodash');
var FS = require('fs');
var md5 = require('md5');
var temp = require('temp');
var execParts = require('./exec.js');

var defaultSettings = {
	url: null,
	id_project: 0,
	Authorization: null,
	keys: []
};

function upload(settings, callback) {
	var s = _.defaults(settings, defaultSettings);

	var cmd = [
		['curl', s.url + '/rest/import/hashes?id_project=' + s.id_project],
		['-X', 'POST'],
		['-H', 'Content-Type: multipart/form-data']
	];

	if (s.Authorization) {
		cmd.push([
			'-H', 'Authorization: ' + s.Authorization
		]);
	}

	var keys = {};
	s.keys.forEach(function (key) {
		keys[md5(key)] = key;
	});

	temp.open({prefix: 'jlangs'}, function (err, info) {
		if (err) {
			return callback(err);
		}
		FS.write(info.fd, JSON.stringify(keys));
		FS.close(info.fd, function (err) {
			if (err) {
				return callback(err);
			}
			cmd.push([
				'-F',
				'dic=@' + info.path
			]);

			execParts(cmd, callback, function () {
				FS.unlink(info.path, function (err) {
					if (err) {
						return callback(err);
					}
					callback(); //ok!
				});
			});
		});
	});
}

exports = upload;
module.exports = exports;
