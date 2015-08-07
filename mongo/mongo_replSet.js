var sys = require('sys')
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

function exists(client, replSet, root_shard_path) {	
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
                replication(client, replSet, root_shard_path);
            } else {
                shard(client, root_shard_path);
                replication(client, replSet, root_shard_path);
            }
            return;
        }
    );
}

function replication(client, replset, root_shard_path) {
    client.create(root_shard_path + "/" + replset, new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function (err, path) {
        if (err) {
            console.log('Failed to create node : %s due to %s', path);
        } else {
            console.log('Node : %s is successfully created', path);
        }
    });
}

function shard(client, root_shard_path) {
    client.create(root_shard_path, new Buffer(''), function(err, path) {
        if (err) {
            console.log('Failed to create node : %s due to %s', shard, err);
        } else {
            console.log('Node : %s is successfully created', shard);
        }
    });
}

exports.start = function(port, replSet, root_shard_path) {
  var client = zookeeper.createClient('localhost:2181');

	client.once('connected', function () {
        exists(client, replSet, root_shard_path);
	});

	client.connect();

    exec("mongod --port " + port + " --dbpath /data/db/" + replSet + " --replSet Mongo_study --smallfiles --oplogSize 128 --logpath /data/db/replSet_Log/mongo_" + replSet + ".log", function(error, stdout, stderr) {
        console.log(stdout);
        client.close();
    });
}
