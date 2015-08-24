'use strict';

var gk = {
    config:require('./config'),
    rsLauncher:require('./mongo/mongo_zkEphemeral_Each_Initializer.js'),
    watcher:require('./zoo_watcher/watcher')
};

module.exports = gk;
