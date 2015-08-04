var replSet1 = require("./mongo_primary");
var replSet2 = require("./mongo_secondary1");
var replSet3 = require("./mongo_secondary2");

var watcher = require("./watcher");

replSet1.start();
replSet2.start();
replSet3.start();

watcher.start();
