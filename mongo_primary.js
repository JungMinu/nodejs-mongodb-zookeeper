var sys = require('sys')
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

function _startServer() {
	
	var client = zookeeper.createClient('localhost:2181');
	var path = "/shard1";

	client.connect();

	client.once('connected', function () {
	
		client.create('/shard1', function(error) {
			if (error) {
				console.log('Failed to create node: %s due to: %s.', path, error);
			} else {
				console.log('Node: %s is successfully created.', path);
			}
		});

		client.create(path + "/replSet1", new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function(error) {
			if (error) {
				console.log('Failed to create node: %s due to: %s.', path + "/replSet1", error);
			} else {
				console.log('Node: %s is successfully created.', path + "/replSet1");
			}

			client.close();
		});
	});

	function puts(error, stdout, stderr) {sys.puts(stdout)}
	exec("sudo mongod --replSet Mongo_study --port 20000 --dbpath /data/db/primary", puts);
}
 
_startServer();
