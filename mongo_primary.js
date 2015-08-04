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
		},
		function (error, stat) {
      if (error) console.log('Failed to check existence of node: %s due to: %s.', path, error);     
      
      util.shard(client, root_shard_path);
		  util.replication(client, root_shard_path, replSet);
    }
	);
}

exports.start = function () {

  var client = zookeeper.createClient('localhost:2181');

	client.once('connected', function () {
    exists(client);
	});

	client.connect();

	exec("sudo mongod --replSet Mongo_study --port 20000 --dbpath /data/db/primary", function (err, stdout, stderr) {
    sys.puts(stdout);
  });
}
