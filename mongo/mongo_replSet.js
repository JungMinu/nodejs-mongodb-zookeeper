var sys = require('sys')
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

            if(stat) {
                replication(client, replSet, zkroot_shard_path);
            } else {
                shard(client, zkroot_shard_path);
                replication(client, replSet, zkroot_shard_path);
            }
            return;
        }
    );
}

function replication(client, replSet, zkroot_shard_path) {
    client.create(zkroot_shard_path + "/" + replSet, new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function (err, path) {
        if (err) {
            console.log('Failed to create node : %s due to %s', path);
        } else {
            console.log('Node : %s is successfully created', path);
        }
    });
}

function shard(client, zkroot_shard_path) {
    client.create(zkroot_shard_path, new Buffer(''), function(err, path) {
        if (err) {
            console.log('Failed to create node : %s due to %s', shard, err);
        } else {
            console.log('Node : %s is successfully created', shard);
        }
    });
}

function Mongod_replSet(client, port, replSet) {
    exec("mongod --port " + port + " --dbpath /data/db/" + replSet + " --replSet Mongo_study --smallfiles --oplogSize 128 --logpath /data/db/replSet_Log/mongo_" + replSet + ".log", function(error, stdout, stderr) {
        console.log(stdout);
        client.close();
    });
}

function Mongod_arbiter(client, port, replSet) {
    exec("mongod --port " + port + " --dbpath /data/db/replSet_" + replSet + " --replSet Mongo_study --smallfiles --noprealloc --nojournal --logpath /data/db/replSet_Log/mongo-replSet_" + replSet + ".log", function(error, stdout, stderr) {
        console.log(stdout);
        client.close();
    });
}

exports.start = function(port, replSet, config, zkroot_shard_path) {
  var client = zookeeper.createClient('localhost:2181');

	client.once('connected', function () {
        exists(client, replSet, zkroot_shard_path);
	});

	client.connect();

    if (replSet == config.arbiterName) {
        Mongod_arbiter(client, port, replSet);
    } else {
        Mongod_replSet(client, port, replSet);
    }
}
