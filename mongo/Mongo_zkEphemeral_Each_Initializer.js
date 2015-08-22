var async = require('async');
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');
var t = require('exectimer');

var EventEmitter = require('events').EventEmitter;
var Mongod_And_CreateZkEphemeral = new EventEmitter();
var Mongod = new EventEmitter();

// zkServer에 zkRs_path(/rs1)가 있는지 확인
function exists(zkClient, rsName, rsPort, zkRsPath) {
  zkClient.exists(zkRsPath,
		function (event) {
		},
		function (error, stat) {
            if (error) {
                console.log('Failed to check existence of node: %s due to: %s.', zkRsPath, error);
                return;
            }
            var path = zkRsPath + "/" + rsName;

            // 만약 zkRs_path가 있다면 바로 Ephemeral Node 생성
            if(stat) {
                replication(zkClient, rsPort, path);
            } else {    // 만약 zkRs_path가 없다면 생성 후 Ephemeral Node 생성
                async.series([
                    function asyncCreateZkRsPath(cb) {
                        CreateZkRsPath(zkClient, zkRsPath);
                        cb(null, 'asyncCreateZkRsPath');
                    },
                    function asyncreplication(cb) {
                        replication(zkClient, rsPort, path);
                        cb(null, 'asyncreplication');
                    }
                ], function done(error, results) {
                });
            }
            return;
        }
    );
}

// 해당 mongod의 Ephemeral Node 생성
function replication(zkClient, rsPort, path) {
    zkClient.create(path, new Buffer(rsPort), zookeeper.CreateMode.EPHEMERAL, function (error) {
        if (error) {
            console.log('Failed to create node : %s due to %s', path, error);
        } else {
            console.log('Node : %s is successfully created', path);
        }
    });
}

// zkRs_path(/rs1) 생성
function CreateZkRsPath(zkClient, zkRsPath) {
    zkClient.create(zkRsPath, new Buffer(''), function(error) {
        if (error) {
            console.log('Failed to create node : %s due to %s', zkRsPath, error);
        } else {
            console.log('Node : %s is successfully created', zkRsPath);
        }
    });
}

Mongod.on('start', function(zkClient, rsName, rsPort, mongod, zkHost, zkRsPath) {
    exec(mongod, function(error, stdout, stderr) {
        var tick = new t.Tick("TIMER");

        tick.start();
        console.log(stdout);

        // 몽고가 죽었으므로 connection을 끊어 Ephemeral Node를 삭제
        zkClient.close();

        var path = zkRsPath + '/' + rsName;

        console.log(rsName + " is dead... port: " + rsPort);
        console.log("zk znode \'" + path + "\' is deleted");

        // 다시 몽고를 살리고 해당 Ephemeral Node를 생성한다.
        Mongod_And_CreateZkEphemeral.emit('start', rsName, rsPort, mongod, zkHost, zkRsPath);
        console.log("Restart mongod " + rsName + "... port: " + rsPort);

        tick.stop();
        var myTimer = t.timers.TIMER;

        // 몽고를 다시 살리는데 걸린 시간을 대략적으로 출력한다.
        console.log("It took: " + myTimer.duration() + "ns");
    });
});

// replSet mongod, zk create Ephemeral 실행
Mongod_And_CreateZkEphemeral.on('start', function(rsName, rsPort, mongod, zkHost, zkRsPath) {
    var zkClient = zookeeper.createClient(zkHost);

    async.series([
        function asyncMongod(cb) {
            Mongod.emit('start', zkClient, rsName, rsPort, mongod, zkHost, zkRsPath);
            cb(null, 'asyncMongod');
        },
        function asyncCreateZkEphemeral(cb) {
	        zkClient.once('connected', function () {
                exists(zkClient, rsName, rsPort, zkRsPath);
	        });
            
            zkClient.connect();
            cb(null, 'asyncCreateZkEphemeral');
        }
    ], function done(error, results) {
    });
});

exports.start = function(rs, zkHost, zkRsPath) {
    Mongod_And_CreateZkEphemeral.emit('start', rs.name, rs.port, rs.mongod, zkHost, zkRsPath); 
}
