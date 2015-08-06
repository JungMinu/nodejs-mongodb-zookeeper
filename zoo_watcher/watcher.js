var async = require('async');
var sys = require('sys');
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

var replSet = require('./../mongo/mongo_replSet');
var arbiter = require('./../mongo/mongo_arbiter');

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

			var children1 = children.indexOf("replSet1");
			var children2 = children.indexOf("replSet2");
			var children3 = children.indexOf("replSet3");
			var children4 = children.indexOf("arbiter");

            async.series([
                function asyncFunction1(cb) {
			        if (children1 == -1) {
				        RecoverMongo ("20000", "replSet1", "mongo_replSet1.log");
                        console.log("Restart mongod replSet... port: 20000");
			        }
                    cb(null, 'asyncFunction1');
                },
                function asyncFunction2(cb) {
			        if (children2 == -1) {
				        RecoverMongo ("30000", "replSet2", "mongo_replSet2.log");
                        console.log("Restart mongod replSet... port: 30000");
			        }
                    cb(null, 'asyncFunction2');
                },
                function asyncFunction3(cb) {
			        if (children3 == -1) {
				        RecoverMongo ("40000", "replSet3", "mongo_replSet3.log");
                        console.log("Restart mongod replSet... port: 40000");
			        }
                    cb(null, 'asyncFunction3');
                },
                function asyncFunction4(cb) {
			        if (children4 == -1) {
				        RecoverMongo ("20017", "arbiter", "mongo-replSet_Arbiter.log");
	                    console.log("Restart mongod arbiter... port: 20017");
			        }
                    cb(null, 'asyncFunction4');
                }
            ], function done(error, results) {
            });
		}
	);
}

function RecoverMongo (port, mongo, log) {
    async.series([
        function asyncFunction1(cb) {
            exec("sudo rm /data/db/replSet_Log/" + log + "*", function(err, stdout, stderr) {
                console.log(stdout);
            });
            cb(null, 'log');
        },
        function asyncFunction2(cb) {
            if (mongo == "arbiter") {
                arbiter.start();
            } else {
                replSet.start(port, mongo);
            }

            cb(null, 'mongod');
        }
    ], function done(error, results) {
        console.log('error: ', error);
        console.log('Successfully recover mongod');
    });
}

function WatchAndRecover(client, path) {
	listChildren(client, path)
}

exports.start = function() {

    console.log('Zookeeper_Watcher operate');
	var client = zookeeper.createClient('localhost:2181');

	client.once('connected', function () {
		console.log('Connected to ZooKeeper.');
        setTimeout(function() {
		    WatchAndRecover(client, "/shard1");
        }, 10);
	});

	client.connect();
}
