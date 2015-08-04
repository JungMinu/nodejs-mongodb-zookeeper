var sys = require('sys');
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

var replSet_1 = require("./mongo_primary");
var replSet_2 = require("./mongo_secondary1");
var replSet_3 = require("./mongo_secondary2");
var arbiter_1 = require("./mongo_arbiter");

var root_shard_path = "/shard1";

function listChildren(client) {
	client.getChildren(
		root_shard_path,
		function (event) {
			console.log('Got watcher event: %s', event);
		},
		function (error, children, stat) {
			if (error) console.log('Failed to list children of : %s.', error);

			var children1 = children.indexOf("replSet1");
			var children2 = children.indexOf("replSet2");
			var children3 = children.indexOf("replSet3");
			var children4 = children.indexOf("arbiter");

			if (children1 == -1) {
				replSet_1.start();
        console.log("Restart mongod replSet... port: 20000");
			}
			if (children2 == -1) {
				replSet_2.start();
        console.log("Restart mongod replSet... port: 30000");
			}
			if (children3 == -1) {
				replSet_3.start();
        console.log("Restart mongod replSet... port: 40000");
			}
			if (children4 == -1) {
				arbiter_1.start();
	console.log("Restart mongod arbiter... port: 20017");
			}
		}
	);
}

function WatchAndRecover(client, path) {
	setInterval(function() {
		listChildren(client, path)
	}, 3000);
}

exports.start = function () {

	var client = zookeeper.createClient('localhost:2181');

	client.once('connected', function () {
		console.log('Connected to ZooKeeper.');
		WatchAndRecover(client, root_shard_path);
	});

	client.connect();
}
