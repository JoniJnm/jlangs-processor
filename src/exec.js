var exec = require('child_process').exec;
var _ = require('lodash');


function execParts(parts, currentCallback, callback) {
	var cmd = _.map(parts, function (part) {
		if (part.length === 2) {
			return part[0] + ' "' + part[1] + '"';
		}
		else {
			return part[0];
		}
	}).join(' ');
	
	return exec(cmd, function (err, stdout, stderr) {
		if (err) {
			currentCallback(err);
		}
		if (stderr) {
			//currentCallback(new Error(stderr));
		}

		callback(stdout);
	});
}

exports = execParts;
module.exports = exports;