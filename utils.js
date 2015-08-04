var async = require('Async');
var zookeeper = require('node-zookeeper-client');

/**
 * Create Replication Set
 *
 * client : Zookeeper
 * path : location of replication set
 * replset : name of replication set 
 */
exports.replication = function (client, path, replset) {
  client.create(path + replset, new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function (err) {
    if (err) console.log('Failed to create node : %s due to %s', path + repleset, err);
    else console.log('Node : %s is successfully created', path + replset);
  });
}

/**
 * Create Shard Set
 *
 * client : Zookeeper
 * shard : location of shard
 */
exports.shard = function (client, shard) {
  client.create(shard, new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function (err) {
    if (err) console.log('Failed to create node : %s due to %s', shard, err);
    else console.log('Node : %s is successfully created', shard);
  });
}

/**
 * Create Shard and Replication Set
 *
 * client : zookeeper
 * path : path of replication set
 * shard : path of shard
 * replset : name of replication set
 */
exports.allSet = function (client, path, shard, replset) {
  async.waterfall([
    function (cb) {
      client.create(shard, new Buffer(''), zookeeper.CreateMode.EPHERMERAL, cb);
    },
    function () {
      client.create(path + replSet, new Buffer(''), zookeeper.CreateMode.EPHERMERAL, cb);
    }
  ], function (err) {
    if (err) console.log("Zookeeper Node Failed");
    else console.log("Zookeeper Node Success");
  }); 
}
