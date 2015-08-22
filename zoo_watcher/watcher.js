var zookeeper = require('node-zookeeper-client');

function JSONtoString(object) {
    var results = [];
    for (var property in object) {
        var value = object[property];
        if (value)
            results.push(property.toString() + ': ' + value);
    }
                                                 
    return '{' + results.join(', ') + '}';
}

function If_RsIsOk_Then_RsStatStore(zkClient, rsPort, znode, zkRsPath) {
    zkClient.getChildren(
        zkRsPath,
        function(error, children, stat) {
            var rsNum = children.length;
            if (rsNum >= 3) {
                var MongoClient = require('mongodb').MongoClient;
                MongoClient.connect('mongodb://localhost:' + rsPort, function(err, db) {
                    if (db == null) {
                        If_RsIsOk_Then_RsStatStore(zkClient, rsPort, znode, zkRsPath);
                    } else {
                        var rsStats = db.admin().s.topology.isMasterDoc;

                        rsStats = JSONtoString(rsStats);
                        zkClient.setData(zkRsPath, new Buffer(rsStats), -1, function(error, stat) {
                            if(error) {
                                console.log(error.stack);
                            }
                            return db.close();
                        });
                    }
                });
            } else {
                zkClient.setData(zkRsPath, new Buffer('{\"ok\": -1}'), -1, function(error, stat) {
                    if(error) {
                        console.log(error.stack);
                    }
                });
                return;
            }
        }
    );
}

function If_Deleted_Znode_Then_ChangeRsStat(zkClient, zkRsPath) {
    zkClient.getChildren(
        zkRsPath,
        function(error, children, stat) {
            var rsNum = children.length;
            if (rsNum >= 3) {
                var rsMember = children[0];
                var path = zkRsPath + '/' + rsMember;

                zkClient.getData(
                    path,
                    function(error, data, stat) {
                        if(error) {
                            console.log(error.stack);
                        }

                        rsPort = data.toString();
                        var MongoClient = require('mongodb').MongoClient;
                        MongoClient.connect('mongodb://localhost:' + rsPort, function(err, db) {
                            if(db == null) {
                                zkClient.setData(zkRsPath, new Buffer('{\"ok\": -1}'), -1, function(error, stat) {
                                    if(error) {
                                        console.log(error.stack);
                                    }
                                });

                                If_Deleted_Znode_Then_ChangeRsStat(zkClient, zkRsPath);
                                return;
                            } else {
                                var rsStats = db.admin().s.topology.isMasterDoc;

                                rsStats = JSONtoString(rsStats);
                                zkClient.setData(zkRsPath, new Buffer(rsStats), -1, function(error, stat) {
                                    if(error) {
                                        console.log(error.stack);
                                    }
                                    return db.close();
                                }); // zkClient.setData
                            }
                        });
                    }
                );  // zkClient.getData
            } else {
                zkClient.setData(zkRsPath, new Buffer('{\"ok\": -1}'), -1, function(error, stat) {
                    if(error) {
                        console.log(error.stack);
                    }
                });
                return;
            }   // else : rsNum < 3
        }
    );  // zkClient.getChildren
}

// Watcher 로직을 실행한다.
function Watch_And_StoreRsStat(zkClient, rsArray, MongoConfig, zkRsPath, zkHost) {
    var rsNum = rsArray.length;
    var isStatStore = true;

    for(var i = 0; i < rsNum; i++) {
        var znode = zkRsPath + '/' + rsArray[i].name;
        If_Created_Znode_Then_StoreRsStat(zkClient, rsArray[i].port, znode, zkRsPath, isStatStore);
    }
}

function If_Created_Znode_Then_StoreRsStat(zkClient, rsPort, znode, zkRsPath, isStatStore) {
    zkClient.exists(
    znode,
    function (event) {
        console.log('Got Watcher event: %s', event);
        isStatStore = false;

        if (event.type == zookeeper.Event.NODE_CREATED) {
            isStatStore = true;
            If_Created_Znode_Then_StoreRsStat(zkClient, rsPort, znode, zkRsPath, isStatStore);
        } else if (event.type == zookeeper.Event.NODE_DELETED) {
            If_Deleted_Znode_Then_ChangeRsStat(zkClient, zkRsPath);

            If_Created_Znode_Then_StoreRsStat(zkClient, rsPort, znode, zkRsPath, isStatStore);
        } else {
            If_Created_Znode_Then_StoreRsStat(zkClient, rsPort, znode, zkRsPath, isStatStore);
        }
    }, function (error, stat) {
        if(error) {
            console.log(error.stack);
        }

        if(stat && isStatStore) {
            var MongoClient = require('mongodb').MongoClient;
            MongoClient.connect('mongodb://localhost:' + rsPort, function(err, db) {
                if (db == null) {
                    If_RsIsOk_Then_RsStatStore(zkClient, rsPort, znode, zkRsPath);
                } else {
                    var rsStats = db.admin().s.topology.isMasterDoc;

                    rsStats = JSONtoString(rsStats);
                    zkClient.setData(zkRsPath, new Buffer(rsStats), -1, function(error, stat) {
                        if(error) {
                            console.log(error.stack);
                        }
                        db.close();
                    });
                }
            });
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
