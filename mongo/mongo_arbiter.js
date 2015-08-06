var sys = require('sys')
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

var root_shard_path = "/shard1";
var replSet = "arbiter"

function exists(client) {	
  client.exists(root_shard_path,
		function (event) {
            console.log('Got event: %s.', event);
		},
		function (error, stat) {
            if (error) {
                console.log('Failed to check existence of node: %s due to: %s.', path, error);     
                return;
            }

            if(stat) {
                replication(client, root_shard_path, replSet);
            } else {
                shard(client, root_shard_path);
                replication(client, root_shard_path, replSet);
            }
            return;
        }
    );
}

function replication(client, path, replset) {
    client.create(path + "/" + replset, new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function (err, path) {
        if (err) {
            console.log('Failed to create node : %s due to %s', path);
        } else {
            console.log('Node : %s is successfully created', path);
        }
    });
}

function shard(client, shard) {
    client.create(shard, new Buffer(''), function(err, path) {
        if (err) {
            console.log('Failed to create node : %s due to %s', shard, err);
        } else {
            console.log('Node : %s is successfully created', shard);
        }
    });
}

exports.start = function() {
  var client = zookeeper.createClient('localhost:2181');

	client.once('connected', function () {
        exists(client);
	});

	client.connect();

    exec("mongod --port 20017 --dbpath /data/db/replSet_Arbiter --replSet Mongo_study --smallfiles --noprealloc --nojournal --logpath /data/db/replSet_Log/mongo-replSet_Arbiter.log", function(error, stdout, stderr) {
        console.log(stdout);
        client.close();
    });
}
