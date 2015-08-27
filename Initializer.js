var async = require('async');
var exec = require('child_process').exec;

var gk = require("./common");
var config = gk.config;
var rsLauncher = gk.rsLauncher;
var rsStateWatcher = gk.rsStateWatcher.rsStateWatcher;
var rsStateEventHandler = gk.rsStateWatcher.EventHandler;

var MongoConfig = config.MongoConfig;
var rsArray = config.rsArray;

var zkConfig = config.zkConfig;
var zkRsPath = zkConfig.RsPath;
var zkArray = config.zkArray;
var QuorumNum = zkArray.length;

var zkHost = zkArray[0].host;
for (var i = 1; i < zkArray.length; i++) {
    zkHost = zkHost + "," + zkArray[i].host;
}

var EventEmitter = require('events').EventEmitter;
var zkServerStart = new EventEmitter();
var MongoStart = new EventEmitter();

// zkServer Cluster 실행
zkServerStart.on('start', function() {
    for (var i = 0; i < QuorumNum; i++) {
        exec("sudo " + zkArray[i].path + "zkServer.sh start", function(error, stdout, stderr) {
            console.log(stdout);
        });
    }
});

// ./config/develop.json 에서 지정한 rs member들을 실행 및 해당 Ephemeral Node를 zk Cluster server에 생성
MongoStart.on('start', function() {
    var replSetNum = rsArray.length;
    var ArbiterName = rsArray[replSetNum-1].name;

    for (var i = 0; i < replSetNum; i++) {
        rsLauncher.start(rsArray[i], zkHost, zkRsPath);
    }
});

// Zookeeper cluster server, replica set mongod 실행
async.series([    
    function asyncZkServerStart(cb) {
        zkServerStart.emit('start');
        cb(null, "zkServer start");
    },
    function asyncMongoStart(cb) {
        MongoStart.emit('start');
        cb(null, 'mongo start');
    }
], function done(error, results) {
    console.log('error: ', error);
    console.log('nodejs-mongodb-zookeeper: ', results);
    // 몽고, Zookeeper server가 모두 실행된 후에 watcher를 부름
    rsStateWatcher.start(rsArray, rsStateEventHandler, MongoConfig, zkRsPath, zkHost);
    console.log('Watcher Start');
});
