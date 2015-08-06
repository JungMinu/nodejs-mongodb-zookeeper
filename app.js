var async = require('async');
var replSet = require("./mongo/mongo_replSet");
var arbiter = require("./mongo/mongo_arbiter");

var watcher = require("./zoo_watcher/watcher");

async.series([    
    function asyncFunction1(cb) {
        replSet.start("20000", "replSet1");
        cb(null, 'mongod_replSet1');
    },
    function asyncFunction2(cb) {
        replSet.start("30000", "replSet2");
        cb(null, 'mongod_replSet2');
    },
    function asyncFunction3(cb) {
        replSet.start("40000", "replSet3");
        cb(null, 'mongod_replSet3');
    },
    function asyncFunction4(cb) {
        arbiter.start();
        cb(null, 'mongod_arbiter');
    }
], function done(error, results) {
    console.log('error: ', error);
    console.log('mongod start: ', results);
    watcher.start();
    console.log('Watcher Start');
});
