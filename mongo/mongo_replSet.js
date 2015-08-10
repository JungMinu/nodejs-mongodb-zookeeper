var async = require('async');
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

// zkServer에 zkroot_shard_path(/shard1)가 있는지 확인
function exists(client, replSetName, zkRootPath) {	
  client.exists(zkRootPath,
		function (event) {
            console.log('Got event: %s.', event);
		},
		function (error, stat) {
            if (error) {
                console.log('Failed to check existence of node: %s due to: %s.', zkRootPath, error);     
                return;
            }
            var path = zkRootPath + "/" + replSetName;

            // 만약 zkroot_shard_path가 있다면 바로 Ephemeral Node 생성
            if(stat) {
                replication(client, path);
            } else {    // 만약 zkroot_shard_path가 없다면 생성 후 Ephemeral Node 생성
                shard(client, zkRootPath);
                replication(client, path);
            }
            return;
        }
    );
}

// 해당 mongod의 Ephemeral Node 생성
function replication(client, path) {
    client.create(path, new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function (error) {
        if (error) {
            console.log('Failed to create node : %s due to %s', path, error);
        } else {
            console.log('Node : %s is successfully created', path);
        }
    });
}

// zkroot_shard_path(/shard1) 생성
function shard(client, zkRootPath) {
    client.create(zkRootPath, new Buffer(''), function(error) {
        if (error) {
            console.log('Failed to create node : %s due to %s', zkRootPath, error);
        } else {
            console.log('Node : %s is successfully created', zkRootPath);
        }
    });
}

// replSet mongod 실행
function Mongod_replSet(client, replSetPort, replSetPath, MongoReplName, OpLogSize, log) {
    exec("mongod --port " + replSetPort + " --dbpath " + replSetPath + " --replSet " + MongoReplName + " --smallfiles --oplogSize " + OpLogSize + " --logpath " + log, function(error, stdout, stderr) {
        console.log(stdout);
        client.close();
    });
}

// Arbiter mongod 실행
function Mongod_arbiter(client, ArbiterPort, ArbiterPath, MongoReplName, log) {
    exec("mongod --port " + ArbiterPort + " --dbpath " + ArbiterPath + " --replSet " + MongoReplName + " --smallfiles --noprealloc --nojournal --logpath " + log, function(error, stdout, stderr) {
        console.log(stdout);
        client.close();
    });
}

exports.start = function(replSet, ArbiterName, MongoConfig, zkHost, zkRootPath) {
    var client = zookeeper.createClient(zkHost);
    var MongoLogPath = MongoConfig.logpath;
    var log = MongoLogPath + replSet.log;

	client.once('connected', function () {
        exists(client, replSet.name, zkRootPath);
	});

	client.connect();

    async.series([
        // 만약 로그 파일이 이미 존재 한다면 에러가 발생할 수 있음.
        // 따라서, 에러가 발생하지 않도록 해당 로그 파일을 "로그이름.log.현재날짜+시간"으로 mv
        function asyncMvLog(cb) {
            exec("sudo mv " + log + " " + log + "." + new Date(), function(err, stdout, stderr) {
                console.log(stdout);
            });
            cb(null, 'MvLog');
        },
        // 아비터의 경우 "noprealloc" 세팅을 하기 때문에 setting 파일이 필요가 없음.
        // 따라서 이전에 실행했던 setting 파일을 제거 후 실행.
        // 제거하지 않고 실행하면 에러 발생 함.
        function asyncLaunchMongo(cb) {
            // 아비터일 경우 setting 파일을 제거 후 mongod를 실행시킨다.
            if (replSet.name == ArbiterName) {
                async.series([
                    function asyncRmSetting(cb) {
                        exec("sudo rm " + replSet.path + "*", function(err, stdout, stderr) {
                            console.log(stdout);
                        });
                        cb(null, 'RmSetting');
                    },
                    function asyncLaunchArbiter(cb) {
                        Mongod_arbiter(client, replSet.port, replSet.path, MongoConfig.name, log);
                        cb(null, 'LaunchArbiter');
                    }
                ], function done(error, results) {
                });
            } else {
                Mongod_replSet(client, replSet.port, replSet.path, MongoConfig.name, MongoConfig.OpLogSize, log);
            }
            cb(null, 'LaunchMongo');
        }
    ], function done(error, results) {
    });
}
