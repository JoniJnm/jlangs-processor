var _ = require('lodash');
var execParts = require('./exec.js');
var temp = require('temp');
var FS = require('fs');

var defaultSettings = {
	url: null,
	id_project: 0,
	Authorization: null,
	output_folder: null,
	output_method: null
};

function download(settings, callback) {
	var s = _.defaults(settings, defaultSettings);

	var cmd = [
		['curl', s.url + '/rest/export/' + s.output_method + '?id_project=' + s.id_project],
		['-X', 'GET'],
		['-H', 'Content-Type: multipart/form-data']
	];

	if (s.Authorization) {
		cmd.push([
			'-H', 'Authorization: ' + s.Authorization
		]);
	}

	temp.mkdir({prefix: 'jlangs'}, function (err, tmpFolder) {
		if (err) {
			callback(err);
		}
		var zipFile = tmpFolder + 'langs.zip';
		cmd.push([
			'-o', zipFile
		]);

		execParts(cmd, callback, function () {
			var outputFolder = FS.realpathSync(s.output_folder);
			var cmd = [
				['unzip'],
				['-o', zipFile],
				['-d', outputFolder]
			];

			execParts(cmd, callback, function () {
				var cmd = [
					['rm'],
					['-Rf', tmpFolder],
				];

				execParts(cmd, callback, function () {
					callback(); //OK!
				});
			});
		});
	});
}

exports = download;
module.exports = exports;