'use strict';

var gk = {
    config:require('./config'),
    rsLauncher:require('./mongo/mongo_zkEphemeral_Each_Initializer.js'),
    rsStateWatcher:{
        rsStateWatcher:require('./zoo_watcher/rsStateWatcher'),
        EventHandler:{
            NodeCreatedEventHandler:require('./zoo_watcher/handler/NodeCreatedEventHandler'),
            NodeDeletedEventHandler:require('./zoo_watcher/handler/NodeDeletedEventHandler')
        }
    }
};

module.exports = gk;
