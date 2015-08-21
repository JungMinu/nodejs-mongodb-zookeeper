var zookeeper = require('node-zookeeper-client');

// Watcher 로직을 실행한다.
function Watch_And_StoreRsStat(zkClient, rsArray, MongoConfig, zkRsPath, zkHost) {
    var rsNum = rsArray.length;

    for(var i = 0; i < rsNum; i++) {
        var znode = zkRsPath + '/' + rsArray[i].name;
        If_Created_Znode_Then_StoreRsStat(zkClient, rsArray[i].port, znode, zkRsPath);
    }
}

function If_Created_Znode_Then_StoreRsStat(zkClient, rsPort, znode, zkRsPath) {
    zkClient.exists(
    znode,
    function (event) {
        console.log('Got Watcher event: %s', event);
        If_Created_Znode_Then_StoreRsStat(zkClient, rsPort, znode, zkRsPath);
        zkClient.setData(zkRsPath, new Buffer('{\"ok\": -1}'), -1, function(error, stat) {
            if(error) {
                console.log(error.stack);
            }
        });
    }, function (error, stat) {
        if(error) {
            console.log(error.stack);
        }

        if(stat) {
            var MongoClient = require('mongodb').MongoClient;
            setTimeout(function () {
                MongoClient.connect('mongodb://localhost:' + rsPort, function(err, db) {

                    if (db == null) {
                        var rsStats = '{\"ok\": -1}';
                        JSON.parse(rsStats);
                        zkClient.setData(zkRsPath, new Buffer(rsStats), -1, function(error, stat) {
                            if(error) {
                                console.log(error.stack);
                            }
                        });
                    } else {
                        var rsStats = db.admin().s.topology.isMasterDoc;

                        function JSONtoString(object) {
                        var results = [];
                            for (var property in object) {
                                var value = object[property];
                                if (value)
                                    results.push(property.toString() + ': ' + value);
                            }
                                                 
                            return '{' + results.join(', ') + '}';
                        }

                        rsStats = JSONtoString(rsStats);
                        zkClient.setData(zkRsPath, new Buffer(rsStats), -1, function(error, stat) {
                            if(error) {
                                console.log(error.stack);
                            }
                            db.close();
                        });
                    }
                });
            }, 2000);
        }
    });
} 

exports.start = function(rsArray, MongoConfig, zkRsPath, zkHost) {

    console.log('Zookeeper_Watcher operate');
	var zkClient = zookeeper.createClient(zkHost);

	zkClient.once('connected', function () {
		console.log('Connected to ZooKeeper.');
		Watch_And_StoreRsStat(zkClient, rsArray, MongoConfig, zkRsPath, zkHost);
	});

	zkClient.connect();
}
