var sys = require('sys');
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

var replSet1 = require("./mongo_primary");
var replSet2 = require("./mongo_secondary1");
var replSet3 = require("./mongo_secondary2");

var root_shard_path = "/shard1";

function listChildren(client) {
	client.getChildren(
		root_shard_path,
		function (event) {
			console.log('Got watcher event: %s', event);
		},
		function (error, children, stat) {
			if (error) console.log('Failed to list children of : %s.', error);

			var replSet1 = children.indexOf("replSet1");
			var replSet2 = children.indexOf("replSet2");
			var replSet3 = children.indexOf("replSet3");

			if (replSet1 == -1) {
				replSet1.start();
        console.log("Restart mongod replSet... port: 20000");
			} else if (replSet2 == -1) {
				replSet2.start();
        console.log("Restart mongod replSet... port: 30000");
			} else if (replSet3 == -1) {
				replSet3.start();
        console.log("Restart mongod replSet... port: 40000");
			}
		}
	);
}

function WatchAndRecover(client, path) {
	setInterval(function() {
		listChildren(client, path)
	}, 1000);
}

exports.start = function () {

	var client = zookeeper.createClient('localhost:2181');

	client.once('connected', function () {
		console.log('Connected to ZooKeeper.');
		WatchAndRecover(client, root_shard_path);
	});

	client.connect();
}
