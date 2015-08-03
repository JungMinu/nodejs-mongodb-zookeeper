var sys = require('sys')
var exec = require('child_process').exec;

exports.serverStart = function _startServer(dbpath, port) {
	function puts(error, stdout, stderr) {sys.puts(stdout)}
	exec("sudo mongod --replSet Mongo_study --port " + port + " --dbpath " + dbpath, puts);
}
