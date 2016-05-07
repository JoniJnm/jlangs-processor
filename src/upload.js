var _ = require('lodash');
var FS = require('fs');
var md5 = require('md5');
var temp = require('temp');
var Curl = require( 'node-libcurl' ).Curl;

var defaultSettings = {
	url: null,
	id_project: 0,
	Authorization: null,
	keys: []
};

function upload(settings, callback) {
	var s = _.defaults(settings, defaultSettings);

	var curl = new Curl();
	curl.setOpt(Curl.option.URL, s.url + '/rest/import/hashes?id_project=' + s.id_project);

	if (s.Authorization) {
		curl.setOpt(Curl.option.HTTPHEADER, ['Authorization: ' + s.Authorization]);
	}

	curl.on('error', function ( err, curlErrCode ) {
		console.error('Err: ', err);
		console.error('Code: ', curlErrCode);
		this.close();
	});

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
			curl.setOpt( Curl.option.HTTPPOST, [
				{
					name: 'dic',
					file: info.path
				}
			]);

			curl.on('end', function () {
				this.close();

				FS.unlink(info.path, function (err) {
					if (err) {
						return callback(err);
					}
					callback(); //ok!
				});
			});

			curl.perform();
		});
	});
}

exports = upload;
module.exports = exports;
