var zookeeper = require('node-zookeeper-client');

// JSON을 Stirng으로 변환
function JSONtoString(object) {
    var results = [];
    for (var property in object) {
        var value = object[property];
        if (value)
            results.push(property.toString() + ': ' + value);
    }
                                                 
    return '{' + results.join(', ') + '}';
}

// 만약 rs가 primary가 있는(장애 상태가 아닌 경우) stable한 상태라면 rs의 상태를 얻어와 '/rs1'에 저장.
function If_RsIsOk_Then_RsStatStore(zkClient, rsPort, znode, zkRsPath) {
    zkClient.getChildren(
        zkRsPath,
        function(error, children, stat) {
            var rsNum = children.length;
            // rs 멤버가 셋 이상 살아있는 경우는 항상 primary 존재(primary1, secondary2, arbiter1 기준).
            if (rsNum >= 3) {
                var MongoClient = require('mongodb').MongoClient;
                MongoClient.connect('mongodb://localhost:' + rsPort, function(err, db) {
                    // mongo server가 stable한 상태임에도 'db == null'이라면 다시 시도해 상태정보 저장.
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
            }
            // rs 멤버가 셋 미만으로 살아있다면 mongo 서버는 항상 장애(primary1, secondary2, arbiter1 기준).
            else {
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

// 만약 특정 mongod에 해당하는 Ephemeral Node가 deleted될 경우 실행.
// rs set이 primary가 존재하는 경우 rs 상태를 zkRsPath(/rs1)에 저장.
// primary가 존재하지 않는 경우(몽고 서버 장애) zkRsPath에 에러사항 저장({"ok": -1}).
function If_Deleted_Znode_Then_ChangeRsStat(zkClient, zkRsPath) {
    zkClient.getChildren(
        zkRsPath,
        function(error, children, stat) {
            var rsNum = children.length;
            if (rsNum >= 3) {
                var rsMember = children[0];
                var path = zkRsPath + '/' + rsMember;

                // mongo server가 정상 상태라면 rs member 중 특정 멤버의 port를 얻어옴.
                zkClient.getData(
                    path,
                    function(error, data, stat) {
                        if(error) {
                            console.log(error.stack);
                        }

                        // 얻어온 port로 해당 mongo server에 접속해 rs 상태를 얻어와 '/rs1' znode에 저장.
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
            }
            // 만약 mongo 서버가 장애가 있는 경우에는 '/rs1' znode에 에러사항({"ok": -1}) 저장.
            else {
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
        If_Changed_Znode_Then_StoreRsStat(zkClient, rsArray[i].port, znode, zkRsPath, isStatStore);
    }
}

// 만약 특정 mongod에 해당하는 Ephemeral Node가 변경될 경우 rs 상태를 다시 갱신하려 시도.
function If_Changed_Znode_Then_StoreRsStat(zkClient, rsPort, znode, zkRsPath, isStatStore) {
    zkClient.exists(
    znode,
    function (event) {
        console.log('Got Watcher event: %s', event);
        isStatStore = false;

        // 와쳐를 걸어 둔 Node가 생성됐다면
        if (event.type == zookeeper.Event.NODE_CREATED) {
            isStatStore = true;
            If_Changed_Znode_Then_StoreRsStat(zkClient, rsPort, znode, zkRsPath, isStatStore);
        }
        // 와쳐를 걸어 둔 Node가 삭제됐다면
        else if (event.type == zookeeper.Event.NODE_DELETED) {
            If_Deleted_Znode_Then_ChangeRsStat(zkClient, zkRsPath);

            If_Changed_Znode_Then_StoreRsStat(zkClient, rsPort, znode, zkRsPath, isStatStore);
        }
        // 와쳐를 걸어 둔 Node가 그 외의 이벤트 타입이라면
        else {
            If_Changed_Znode_Then_StoreRsStat(zkClient, rsPort, znode, zkRsPath, isStatStore);
        }
    }, function (error, stat) {
        if(error) {
            console.log(error.stack);
        }

        // 만약 와쳐를 걸어 둔 Node가 존재하고(stat) 'NODE_CREATED' event.type이었다면(isStatStore)
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
		console.log('Zookeeper_Watcher Connected to ZooKeeper.');
		Watch_And_StoreRsStat(zkClient, rsArray, MongoConfig, zkRsPath, zkHost);
	});

	zkClient.connect();
}
