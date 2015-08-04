var replSet1 = require("./mongo_primary");
var replSet2 = require("./mongo_secondary1");
var replSet3 = require("./mongo_secondary2");
var arbiter = require("./mongo_arbiter");

//var watcher = require("./watcher");

replSet1.start();
replSet2.start();
replSet3.start();
arbiter.start();

//watcher.start();
