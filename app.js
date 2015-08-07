var async = require('async');

var gk = require("./common");
var config = gk.config;
var replSet = gk.replSet;
var watcher = gk.watcher;

var zkroot_shard_path = config.zkRootShardPath;

async.series([    
    function asyncMongoStart1(cb) {
        replSet.start(config.replSet1Port, config.replSet1Name, config, zkroot_shard_path);
        cb(null, 'mongod_replSet1');
    },
    function asyncMongoStart2(cb) {
        replSet.start(config.replSet2Port, config.replSet2Name, config, zkroot_shard_path);
        cb(null, 'mongod_replSet2');
    },
    function asyncMongoStart3(cb) {
        replSet.start(config.replSet3Port, config.replSet3Name, config, zkroot_shard_path);
        cb(null, 'mongod_replSet3');
    },
    function asyncMongoStart4(cb) {
        replSet.start(config.arbiterPort, config.arbiterName, config, zkroot_shard_path);
        cb(null, 'mongod_arbiter');
    }
], function done(error, results) {
    console.log('error: ', error);
    console.log('mongod start: ', results);
    watcher.start(config, zkroot_shard_path);
    console.log('Watcher Start');
});
