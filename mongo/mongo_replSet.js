var async = require('async');
var sys = require('sys');
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');

// zkServer에 zkroot_shard_path(/shard1)가 있는지 확인
function exists(client, replSet, zkroot_shard_path) {	
  client.exists(zkroot_shard_path,
		function (event) {
            console.log('Got event: %s.', event);
		},
		function (error, stat) {
            if (error) {
                console.log('Failed to check existence of node: %s due to: %s.', zkroot_shard_path, error);     
                return;
            }
            var path = zkroot_shard_path + "/" + replSet;

            // 만약 zkroot_shard_path가 있다면 바로 Ephemeral Node 생성
            if(stat) {
                replication(client, path);
            } else {    // 만약 zkroot_shard_path가 없다면 생성 후 Ephemeral Node 생성
                shard(client, zkroot_shard_path);
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
function shard(client, zkroot_shard_path) {
    client.create(zkroot_shard_path, new Buffer(''), function(error) {
        if (error) {
            console.log('Failed to create node : %s due to %s', zkroot_shard_path, error);
        } else {
            console.log('Node : %s is successfully created', zkroot_shard_path);
        }
    });
}

// replSet mongod 실행
function Mongod_replSet(client, port, log, config, replSetPath) {
    exec("mongod --port " + port + " --dbpath " + replSetPath + " --replSet " + config.MongoReplSetName + " --smallfiles --oplogSize " + config.OpLogSize + " --logpath " + log, function(error, stdout, stderr) {
        console.log(stdout);
        client.close();
    });
}

// Arbiter mongod 실행
function Mongod_arbiter(client, port, log, config, replSetPath) {
    exec("mongod --port " + port + " --dbpath " + replSetPath + " --replSet " + config.MongoReplSetName + " --smallfiles --noprealloc --nojournal --logpath " + log, function(error, stdout, stderr) {
        console.log(stdout);
        client.close();
    });
}

exports.start = function(port, replSet, log, config, replSetPath) {
    var client = zookeeper.createClient(config.zkServer);
    var MongoLogPath = config.MongoLogPath;

	client.once('connected', function () {
        exists(client, replSet, config.zkRootShardPath);
	});

	client.connect();

    async.series([
        // 만약 로그 파일이 이미 존재 하다면 에러가 발생할 수 있음.
        // 따라서, 에러가 발생하지 않도록 해당 로그 파일을 "로그이름.log.현재날짜+시간"으로 mv
        function asyncMvLog(cb) {
            exec("sudo mv " + MongoLogPath + log + " " + MongoLogPath + log + "." + new Date(), function(err, stdout, stderr) {
                console.log(stdout);
            });
            cb(null, 'MvLog');
        },
        // 아비터의 경우 "noprealloc" 세팅을 하기 때문에 setting 파일이 필요가 없음.
        // 따라서 이전에 실행했던 setting 파일을 제거 후 실행.
        // 제거하지 않고 실행하면 에러 발생 함.
        function asyncLaunchMongo(cb) {
            log = MongoLogPath + log;
            // 아비터일 경우 setting 파일을 제거 후 mongod를 실행시킨다.
            if (replSet == config.arbiterName) {
                async.series([
                    function asyncRmSetting(cb) {
                        exec("sudo rm " + config.arbiterPath + "*", function(err, stdout, stderr) {
                            console.log(stdout);
                        });
                        cb(null, 'RmSetting');
                    },
                    function asyncLaunchArbiter(cb) {
                        Mongod_arbiter(client, port, log, config, replSetPath);
                        cb(null, 'LaunchArbiter');
                    }
                ], function done(error, results) {
                });
            } else {
                Mongod_replSet(client, port, log, config, replSetPath);
            }
            cb(null, 'LaunchMongo');
        }
    ], function done(error, results) {
    });
}
