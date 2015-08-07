var async = require('async');
var sys = require('sys');
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

var replSet = require('./../mongo/mongo_replSet');

function listChildren(client, config, zkroot_shard_path) {
    var replSet1Name = config.replSet1Name;
    var replSet2Name = config.replSet2Name;
    var replSet3Name = config.replSet3Name;
    var arbiterName = config.arbiterName;

    var replSet1Port = config.replSet1Port;
    var replSet2Port = config.replSet2Port;
    var replSet3Port = config.replSet3Port;
    var arbiterPort = config.arbiterPort;

	client.getChildren(
		zkroot_shard_path,
		function (event) {
			console.log('Got watcher event: %s', event);
            listChildren(client, config, zkroot_shard_path);
		},
		function (error, children, stat) {
			if (error) {
				console.log('Failed to list children of : %s.', error);
				return;
			}

			var zoo_shard1_replSet1 = children.indexOf(replSet1Name);
			var zoo_shard1_replSet2 = children.indexOf(replSet2Name);
			var zoo_shard1_replSet3 = children.indexOf(replSet3Name);
			var zoo_shard1_arbiter = children.indexOf(arbiterName);

            async.series([
                function asyncMongoRecover1(cb) {
			        if (zoo_shard1_replSet1 == -1) {
				        RecoverMongo (replSet1Port, replSet1Name, config.replSet1Log, config, config.replSet1Path);
                        console.log("Restart mongod replSet... port: ", replSet1Port);
			        }
                    cb(null, 'asyncMongoRecover1');
                },
                function asyncMongoRecover2(cb) {
			        if (zoo_shard1_replSet2 == -1) {
				        RecoverMongo (replSet2Port, replSet2Name, config.replSet2Log, config, config.replSet2Path);
                        console.log("Restart mongod replSet... port: " + replSet2Port);
			        }
                    cb(null, 'asyncMongoRecover2');
                },
                function asyncMongoRecover3(cb) {
			        if (zoo_shard1_replSet3 == -1) {
				        RecoverMongo (replSet3Port, replSet3Name, config.replSet3Log, config, config.replSet3Path);
                        console.log("Restart mongod replSet... port: " + replSet3Port);
			        }
                    cb(null, 'asyncMongoRecover3');
                },
                function asyncArbiterRecover(cb) {
			        if (zoo_shard1_arbiter == -1) {
				        RecoverMongo (arbiterPort, arbiterName, config.arbiterLog, config, config.arbiterPath);
	                    console.log("Restart mongod arbiter... port: " + arbiterPort);
			        }
                    cb(null, 'asyncArbiterRecover');
                }
            ], function done(error, results) {
            });
		}
	);
}

function RecoverMongo (port, mongo, log, config, replSetPath) {
    if (mongo == config.arbiterName) {
        async.series([
            function asyncRmSetting(cb) {
                exec("sudo rm /data/db/replSet_Arbiter/*", function(err, stdout, stderr) {
                    console.log(stdout);
                });
                cb(null, 'RmSetting');
            },
            function aysncRecoverArbiter(cb) {
                replSet.start(port, mongo, log, config, replSetPath);
                cb(null, 'arbiter');
            }
        ], function done(error, results) {
        });
    } else {
        replSet.start(port, mongo, log, config, replSetPath);
    }
}     

function WatchAndRecover(client, config, zkroot_shard_path) {
	listChildren(client, config, zkroot_shard_path)
}

exports.start = function(config) {

    console.log('Zookeeper_Watcher operate');
	var client = zookeeper.createClient(config.zkServer);

	client.once('connected', function () {
		console.log('Connected to ZooKeeper.');
        setTimeout(function() {
		    WatchAndRecover(client, config, config.zkRootShardPath);
        }, 10);
	});

	client.connect();
}
