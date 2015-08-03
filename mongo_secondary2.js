var sys = require('sys')
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

function _startServer() {
	
	var client = zookeeper.createClient('localhost:2181');
	var path = "/shard1_replSet3";

	client.once('connected', function () {
 
		client.create(path, function (error) {
			if (error) {
				console.log('Failed to create node: %s due to: %s.', path, error);
			} else {
				console.log('Node: %s is successfully created.', path);
			}

			client.close();
		});
	});

	client.connect();
	function puts(error, stdout, stderr) {sys.puts(stdout)}
	exec("sudo mongod --replSet Mongo_study --port 40000 --dbpath /data/db/secondary2", puts);
}
 
_startServer();
