var async = require('async');
var sys = require('sys');
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

function exists(client, replSet, zkroot_shard_path) {	
  client.exists(zkroot_shard_path,
		function (event) {
            console.log('Got event: %s.', event);
		},
		function (error, stat) {
            if (error) {
                console.log('Failed to check existence of node: %s due to: %s.', zkroot_shard_path, error);     
                return;
            }
            var path = zkroot_shard_path + "/" + replSet;

            if(stat) {
                replication(client, path);
            } else {
                shard(client, zkroot_shard_path);
                replication(client, path);
            }
            return;
        }
    );
}

function replication(client, path) {
    client.create(path, new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function (error) {
        if (error) {
            console.log('Failed to create node : %s due to %s', path, error);
        } else {
            console.log('Node : %s is successfully created', path);
        }
    });
}

function shard(client, zkroot_shard_path) {
    client.create(zkroot_shard_path, new Buffer(''), function(error) {
        if (error) {
            console.log('Failed to create node : %s due to %s', zkroot_shard_path, error);
        } else {
            console.log('Node : %s is successfully created', zkroot_shard_path);
        }
    });
}

function Mongod_replSet(client, port, log, config, replSetPath) {
    exec("mongod --port " + port + " --dbpath " + replSetPath + " --replSet " + config.MongoReplSetName + " --smallfiles --oplogSize " + config.OpLogSize + " --logpath " + log, function(error, stdout, stderr) {
        console.log(stdout);
        client.close();
    });
}

function Mongod_arbiter(client, port, log, config, replSetPath) {
    exec("mongod --port " + port + " --dbpath " + replSetPath + " --replSet " + config.MongoReplSetName + " --smallfiles --noprealloc --nojournal --logpath " + log, function(error, stdout, stderr) {
        console.log(stdout);
        client.close();
    });
}

exports.start = function(port, replSet, log, config, replSetPath) {
    var client = zookeeper.createClient(config.zkServer);
    var MongoLogPath = config.MongoLogPath;

	client.once('connected', function () {
        exists(client, replSet, config.zkRootShardPath);
	});

	client.connect();

    async.series([
        function asyncMvLog(cb) {
            exec("sudo mv " + MongoLogPath + log + " " + MongoLogPath + log + "." + new Date(), function(err, stdout, stderr) {
                console.log(stdout);
            });
            cb(null, 'MvLog');
        },
        function asyncLaunchMongo(cb) {
            log = MongoLogPath + log;
            if (replSet == config.arbiterName) {
                async.series([
                    function asyncRmSetting(cb) {
                        exec("sudo rm /data/db/replSet_Arbiter/*", function(err, stdout, stderr) {
                            console.log(stdout);
                        });
                        cb(null, 'RmSetting');
                    },
                    function asyncLaunchArbiter(cb) {
                        Mongod_arbiter(client, port, log, config, replSetPath);
                        cb(null, 'LaunchArbiter');
                    }
                ], function done(error, results) {
                });
            } else {
                Mongod_replSet(client, port, log, config, replSetPath);
            }
            cb(null, 'LaunchMongo');
        }
    ], function done(error, results) {
    });
}
