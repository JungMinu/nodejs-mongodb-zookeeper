'use strict';

var gk = {
    config:require('./config'),
    replSet:require('./mongo/mongo_replSet'),
    watcher:require('./zoo_watcher/watcher')
};

module.exports = gk;
