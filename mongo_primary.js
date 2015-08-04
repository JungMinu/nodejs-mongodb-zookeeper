var sys = require('sys')
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');
var util = require('./utils');

var root_shard_path = "/shard1";
var replSet = "replSet1"

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
		util.replication(client, root_shard_path, replSet);
	} else {
      util.shard(client, root_shard_path);
		  util.replication(client, root_shard_path, replSet);
	}
    }
	);
}

exports.start = function () {

  var client = zookeeper.createClient('localhost:2181');

	client.once('connected', function () {
    exists(client);
	});

	client.connect();

	exec("sudo screen -S replSet1 sudo mongod --port 20000 --dbpath /data/db/replSet1 --replSet Mongo_study --smallfiles --oplogSize 128 --logpath /data/db/replSet_Log/mongo_replSet1.log", function(err, stdout, stderr) {
		sys.puts(stdout);
	});
}
