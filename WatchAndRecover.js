var sys = require('sys');
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

function listChildren(client, path) {
	client.getChildren(
		path,
		function (event) {
			console.log('Got watcher event: %s', event);
			listChildren(client, path);
		},
		function (error, children, stat) {
			if (error) {
				console.log(
					'Failed to list children of %s due to: %s.',
					path,
					error
				);
				return;
			}

			console.log('Children of %s are: %j.', path, children);
			var replSet1 = children.indexOf("replSet1");
			var replSet2 = children.indexOf("replSet2");
			var replSet3 = children.indexOf("replSet3");

			if(replSet1 == -1) {
				mongoLaunch("mongo_primary.js");
				console.log("Restart mongod replSet... port: 20000);
			}
			if(replSet2 == -1) {
				mongoLaunch("mongo_secondary1.js");
				console.log("Restart mongod replSet... port: 30000);
			}
			if(replSet3 == -1) {
				mongoLaunch("mongo_secondary2.js");
				console.log("Restart mongod replSet... port: 40000);
			}
		}
	);
}

function mongoLaunch(mongo) {
	function puts(error, stdout, stderr) {sys.puts(stdout)}
	exec("node " + mongo, puts)
}

function WatchAndRecover(client, path) {
	setInterval(function() {
		listChildren(client, path)
	}, 3000);
}

function _startServer() {
	
	var client = zookeeper.createClient('localhost:2181');
	var path = "/shard1";

	client.once('connected', function () {
		console.log('Connected to ZooKeeper.');
		WatchAndRecover(client, path);
	});

	client.connect();
}
 
_startServer();
