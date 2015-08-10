var async = require('async');
var exec = require('child_process').exec;

var gk = require("./common");
var config = gk.config;
var replSetLauncher = gk.replSet;
var watcher = gk.watcher;

var MongoConfig = config.MongoConfig;
var replSetArray = config.replSetArray;

var zkConfig = config.zkConfig;
var zkRootPath = zkConfig.RootPath;
var zkArray = config.zkArray;
var QuorumNum = zkArray.length;

var zkHost = zkArray[0].host;
for (var i = 1; i < zkArray.length; i++) {
    zkHost = zkHost + "," + zkArray[i].host;
}

function zkServerStart() {
    async.series([
        function asyncZkServerStop(cb) {
            for (var i = 0; i < QuorumNum; i++) {
                exec("sudo " + zkArray[i].path + "zkServer.sh stop", function(error, stdout, stderr) {
                    console.log(stdout);
                });
            }
            cb(null, "zkServer stop");
        },
        function asyncZkServerStart(cb) {
            for (var i = 0; i < QuorumNum; i++) {
                exec("sudo " + zkArray[i].path + "zkServer.sh start", function(error, stdout, stderr) {
                    console.log(stdout);
                });
            }
            cb(null, "zkServer start");
        }
    ], function done(error, results) {
        console.log("zkServer Error: " + error);
        console.log("zkServer Launcher: " + results);
    });
}

function MongoStart() {
    var replSetNum = replSetArray.length;
    var ArbiterName = replSetArray[replSetNum-1].name;

    for (var i = 0; i < replSetNum; i++) {
        replSetLauncher.start(replSetArray[i], ArbiterName, MongoConfig, zkHost, zkRootPath);
    }
}

// Zookeeper server, replica set mongod 실행
async.series([    
    function asyncZkServerStart(cb) {
        zkServerStart();
        cb(null, "zkServer start");
    },
    function asyncMongoStart(cb) {
        setTimeout(function() {
            MongoStart();
        }, 2000);
        cb(null, 'mongo start');
    }
], function done(error, results) {
    console.log('error: ', error);
    console.log('nodejs-mongodb-zookeeper: ', results);
    // 몽고, Zookeeper server가 모두 실행된 후에 watcher를 부름
    setTimeout(function() {
        watcher.start(replSetArray, MongoConfig, zkRootPath, zkHost);
    }, 3000);
    console.log('Watcher Start');
});
