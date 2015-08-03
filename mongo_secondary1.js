var sys = require('sys')
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

function exists(client, path) {
	client.exists(
		path,
		function (event) {
			console.log('Got event: %s.', event);
			exists(client, path);
		},
		function (error, stat) {
			if (error) {
				console.log(
					'Failed to check existence of node: %s due to: %s.',
					path,
					error
				);
				return;
			}

			if (stat) {
				console.log(
					'Node: %s exists and its version is: %j',
					path,
					stat.version
				);

				replSet(client, path);
			} else {
				client.create('/shard1', function(error) {
					if (error) {
						console.log('Failed to create node: %s due to: %s.', path, error);
					} else {
						console.log('Node: %s is successfully created.', path);
					}
				});

				replSet(client, path);
			}
		}
	);
}

function replSet(client, path) {
	
	client.create(path + "/replSet2", new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function(error) {
		if (error) {
			console.log('Failed to create node: %s due to: %s.', path + "/replSet2", error);
		} else {
			console.log('Node: %s is successfully created.', path + "/replSet2");
		}
	});
}

function _startServer() {
	
	var client = zookeeper.createClient('localhost:2181');
	var path = "/shard1";

	client.once('connected', function () {
		exists(client, path);
	});

	client.connect();

	function puts(error, stdout, stderr) {sys.puts(stdout)}
	exec("sudo mongod --replSet Mongo_study --port 30000 --dbpath /data/db/secondary1", puts, function() {
	});
}
 
_startServer();
