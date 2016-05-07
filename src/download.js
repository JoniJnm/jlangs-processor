var _ = require('lodash');
var temp = require('temp');
var FS = require('fs');
var Curl = require( 'node-libcurl' ).Curl;
var zipper = require('zip-local');

var defaultSettings = {
	url: null,
	id_project: 0,
	Authorization: null,
	output_folder: null,
	output_method: null
};

function download(settings, callback) {
	var s = _.defaults(settings, defaultSettings);

	var tmpFolder = temp.mkdirSync({prefix: 'jlangs'});
	var zipFile = tmpFolder + 'langs.zip';

	var curl = new Curl();
	curl.setOpt(Curl.option.URL, s.url + '/rest/export/' + s.output_method + '?id_project=' + s.id_project);

	if (s.Authorization) {
		curl.setOpt(Curl.option.HTTPHEADER, ['Authorization: ' + s.Authorization]);
	}

	curl.enable(Curl.feature.NO_STORAGE);

	curl.onData = function(chunk) {
		FS.appendFileSync(zipFile, chunk);
		return chunk.length;
	};

	curl.on('error', function (err, curlErrCode) {
		console.error('Err: ', err);
		console.error('Code: ', curlErrCode);
		this.close();
		callback(err);
	});

	curl.on('end', function () {
		this.close();

		var outputFolder = FS.realpathSync(s.output_folder);
		zipper.unzip(zipFile, function(err, unzipped) {
			if (err) {
				return callback(err);
			}

			unzipped.save(outputFolder, function(err) {
				if (err) {
					return callback(err);
				}

				callback(); //OK!
			});
		});
	});

	curl.perform();
}

exports = download;
module.exports = exports;