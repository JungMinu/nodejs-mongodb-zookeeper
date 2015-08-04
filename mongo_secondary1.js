var sys = require('sys')
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

var root_shard_path = "/shard1";
var replSet = "replSet2"

function exists(client) {	
  client.exists(root_shard_path,
		function (event) {
            console.log('Got event: %s.', event);
            exists(client, path);
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
        }
    );
}

function replication(client, path, replset) {
    client.create(path + "/" + replset, new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function (err, path) {
        if (err) {
            console.log('Failed to create node : %s due to %s', path + "/" + replset, err);
            return;
        } else {
            console.log('Node: %s is successfully created', path + "/" + replset);
        }
    });
}

function shard(client, shard) {
    client.create(shard, new Buffer(''), function(err, path) {
        if (err) {
            console.log('Failed to create node : %s due to %s', shard, err);
            return;
        } else {
            console.log('Node : %s is successfully created', shard);
        }
    });
}

function start() {

  var client = zookeeper.createClient('localhost:2181');

	client.once('connected', function () {
    exists(client);
	});

	client.connect();

	exec("sudo mongod --port 30000 --dbpath /data/db/replSet2 --replSet Mongo_study --smallfiles --oplogSize 128 --logpath /data/db/replSet_Log/mongo_replSet2.log", function(err, stdout, stderr) {
		sys.puts(stdout);
	});
}

start();
