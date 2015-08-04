var sys = require('sys');
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

function listChildren(client, path) {
	client.getChildren(
		path,
		function (event) {
			console.log('Got watcher event: %s', event);
			listChildren(client, path);
		},
		function (error, children, stat) {
			if (error) {
				console.log('Failed to list children of : %s.', error);
				return;
			}

			console.log('Children of %s are: %j.', path, children);

			var children1 = children.indexOf("replSet1");
			var children2 = children.indexOf("replSet2");
			var children3 = children.indexOf("replSet3");
			var children4 = children.indexOf("arbiter");

			if (children1 == -1) {
				RecoverMongo (client, "20000", "replSet1", "mongo_replSet1.log");
        console.log("Restart mongod replSet... port: 20000");
			}
			if (children2 == -1) {
				RecoverMongo (client, "30000", "replSet2", "mongo_replSet2.log");
                y
        console.log("Restart mongod replSet... port: 30000");
			}
			if (children3 == -1) {
				RecoverMongo (client, "40000", "replSet3", "mongo_replSet3.log");
        console.log("Restart mongod replSet... port: 40000");
			}
			if (children4 == -1) {
				RecoverArbiter (client, "20017", "replSet_Arbiter", "mongo-replSet_Arbiter.log", "arbiter");
	console.log("Restart mongod arbiter... port: 20017");
			}
		}
	);
}

function RecoverMongo (client, port, dbpath, log) {
    exec("sudo rm /data/db/replSet_Log/" + log + "*", function(err, stdout, stderr) {
        console.log(stdout);
    });
   	exec("sudo mongod --port " + port + " --dbpath /data/db/" + dbpath + " --replSet Mongo_study --smallfiles --oplogSize 128 --logpath /data/db/replSet_Log/" + log, function(err, stdout, stderr) {
            console.log(stdout);
    });
    replication(client, dbpath);
}

function RecoverArbiter (client, port, dbpath, log, replset) {
    function puts(error, stdout, stderr) {sys.puts(stdout)}
    exec("sudo rm /data/db/replSet_Log/" + log + "*", puts);

   	exec("sudo mongod --port " + port + " --dbpath /data/db/" + dbpath + " --replSet Mongo_study --smallfiles --noprealloc --nojournal --logpath /data/db/replSet_Log/" + log, puts);
    replication(client, replset);
}

function replication(client, replset) {
    client.create("/shard1/" + replset, new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function (error, path) {
        if (error) {
            console.log(error.stack);
            return;
        }

        console.log('Node: %s is created.', path);
    });
}

function WatchAndRecover(client, path) {
	setInterval(function() {
		listChildren(client, path)
	}, 3000);
}

function start() {

	var client = zookeeper.createClient('localhost:2181');

	client.once('connected', function () {
		console.log('Connected to ZooKeeper.');
		WatchAndRecover(client, "/shard1");
	});

	client.connect();
}

start();
