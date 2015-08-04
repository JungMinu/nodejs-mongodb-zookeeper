var sys = require('sys')
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

function exists(client, path) {
	client.exists(path,
		function (event) {
			console.log('Got event: %s.', event);
			exists(client, path);
		},
		function (error, stat) {
			if (error) console.log('Failed to check existence of node: %s due to: %s.', path, error);

			if (stat) {
				replSet(client, path);
			} else {
        shardSet(client);
				replSet(client, path);
			}
		}
	);
}

function replSet(client, path) {
	client.create(path + "/replSet1", new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function(error) {
		if (error) console.log('Failed to create node: %s due to: %s.', path + "/replSet1", error);
	  else console.log('Node: %s is successfully created.', path + "/replSet1");
	
    client.close();
  });
}

function shardSet(client) {
  client.create("/shard1", new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function (err) {
    if (err) console.log("Failed to create node : %s due to %s", path + "/shard1", error);
    else console.log("Node: %s is successfully created.", path + "/shard1")
  
    client.close();
  });
}

/**
 *
 */
exports.start = function () {

	var client = zookeeper.createClient('localhost:2181');
	var path = "/shard1";

	client.once('connected', function () {
		exists(client, path);
	});

	client.connect();

	exec("sudo mongod --replSet Mongo_study --port 20000 --dbpath /data/db/primary", function (err, stdout, stderr) {
    sys.puts(stdout);
  });
}

