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
				console.log('Failed to list children of : %s.', error);
				return;
			}

			console.log('Children of %s are: %j.', path, children);

			var children1 = children.indexOf("replSet1");
			var children2 = children.indexOf("replSet2");
			var children3 = children.indexOf("replSet3");
			var children4 = children.indexOf("arbiter");

			if (children1 == -1) {
				RecoverMongo ("mongo_primary.js", "mongo_replSet1.log");
        console.log("Restart mongod replSet... port: 20000");
			}
			if (children2 == -1) {
				RecoverMongo ("mongo_secondary1.js", "mongo_replSet2.log");
        console.log("Restart mongod replSet... port: 30000");
			}
			if (children3 == -1) {
				RecoverMongo ("mongo_secondary2.js", "mongo_replSet3.log");
        console.log("Restart mongod replSet... port: 40000");
			}
			if (children4 == -1) {
				RecoverArbiter ("mongo-replSet_Arbiter.log");
	console.log("Restart mongod arbiter... port: 20017");
			}
		}
	);
}

function RecoverMongo (mongo, log) {
    exec("sudo rm /data/db/replSet_Log/" + log + "*", function(err, stdout, stderr) {
        console.log(stdout);
    });
    exec("sudo node " + mongo, function(err, stdout, stderr) {
        console.log(stdout);
    });
}

function RecoverArbiter (log) {
    exec("sudo rm /data/db/replSet_Log/" + log + "*", function(error, stdout, stderr) {
        console.log(stdout);
    });

   	exec("sudo node mongo_arbiter.js", function(error, stdout, stderr) {
        console.log(stdout);
    });
}

function WatchAndRecover(client, path) {
	setInterval(function() {
		listChildren(client, path)
	}, 3000);
}

function start() {

	var client = zookeeper.createClient('localhost:2181');

	client.once('connected', function () {
		console.log('Connected to ZooKeeper.');
		WatchAndRecover(client, "/shard1");
	});

	client.connect();
}

start();
