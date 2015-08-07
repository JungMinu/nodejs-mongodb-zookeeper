'use strict';

var gk = {
    config:require('./config'),
    replSet:require('./mongo/mongo_replSet'),
    arbiter:require('./mongo/mongo_arbiter'),
    watcher:require('./zoo_watcher/watcher')
};

module.exports = gk;
