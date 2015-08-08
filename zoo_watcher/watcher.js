var async = require('async');
var sys = require('sys');
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

var replSet = require('./../mongo/mongo_replSet');

function listChildren(client, config, zkroot_shard_path) {
    var replSet1Name = config.replSet1Name;
    var replSet2Name = config.replSet2Name;
    var replSet3Name = config.replSet3Name;
    var ArbiterName = config.arbiterName;

    var replSet1Port = config.replSet1Port;
    var replSet2Port = config.replSet2Port;
    var replSet3Port = config.replSet3Port;
    var ArbiterPort = config.arbiterPort;

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
			var zoo_shard1_Arbiter = children.indexOf(ArbiterName);

            async.series([
                function asyncReplSet1Recover(cb) {
                    IfRmZooChild_ThenRecover(zoo_shard1_replSet1, replSet1Port, replSet1Name, config.replSet1Log, config, config.replSet1Path);
                    cb(null, 'aysncReplSet1Recover');
                },
                function asyncReplSet2Recover(cb) {
                    IfRmZooChild_ThenRecover(zoo_shard1_replSet2, replSet2Port, replSet2Name, config.replSet2Log, config, config.replSet2Path);
                    cb(null, 'asyncReplSet2Recover');
                },
                function asyncReplSet3Recover(cb) {
                    IfRmZooChild_ThenRecover(zoo_shard1_replSet3, replSet3Port, replSet3Name, config.replSet3Log, config, config.replSet3Path);
                    cb(null, 'asyncReplSet3Recover');
                },
                function asyncArbiterRecover(cb) {
                    IfRmZooChild_ThenRecover(zoo_shard1_Arbiter, ArbiterPort, ArbiterName, config.arbiterLog, config, config.arbiterPath);
                    cb(null, 'asyncArbiterRecover');
                }
            ], function done(error, results) {
            });
		}
	);
}

function IfRmZooChild_ThenRecover(zkShard1_child, childPort, childName, childLog, config, childPath) {
    if (zkShard1_child == -1) {
        RecoverMongo (childPort, childName, childLog, config, childPath);
        console.log("Restart mongod " + childName + "... port: " + childPort);
    }
}

function RecoverMongo (port, mongo, log, config, replSetPath) {
    replSet.start(port, mongo, log, config, replSetPath);
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
