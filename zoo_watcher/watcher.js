var async = require('async');
var sys = require('sys');
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');
var t = require('exectimer');

var replSet = require('./../mongo/mongo_replSet');

function listChildren(client, config, zkroot_shard_path) {
    var replSet1Name = config.replSet1Name;
    var replSet2Name = config.replSet2Name;
    var replSet3Name = config.replSet3Name;
    var ArbiterName = config.arbiterName;

    var replSet1Port = config.replSet1Port;
    var replSet2Port = config.replSet2Port;
    var replSet3Port = config.replSet3Port;
    var ArbiterPort = config.arbiterPort;

	client.getChildren(
		zkroot_shard_path,
        // 해당 zkroot_shard_path(/shard1)의 내용이 변경될 경우에 function (event)가 실행된다.
		function (event) {
			console.log('Got watcher event: %s', event);
            // 변경 된 것을 감지하면 죽은 mongod를 되살리게 된다.
            // 하지만 zookeeper는 watcher가 해당 이벤트를 감지하면 사라지게 되는 구조이므로
            // 아래와 같이 다시 watcher를 걸어줘야 한다.(listChildren을 다시 호출해야 한다.) 무한루프는 일어나지 않는다.
            // 죽은 몽고를 되살리는데 시간이 얼마나 걸리는지 ns 단위로 출력한다.
            var tick = new t.Tick("TIMER");

            tick.start();
            listChildren(client, config, zkroot_shard_path);
            tick.stop();

            var myTimer = t.timers.TIMER;
            console.log("It took: " + myTimer.duration() + "ns");
		},
        // 실질적으로 죽은 mongod를 감지하고 살리는 function
        // 주의 할 점은 이벤트를 감지할 때 실행되는 함수가 아니라 client.getchildren이 수행되자 마자 실행 된다.
        // 즉, Ephemeral Node가 죽었을 경우 실행되는 것이 아니라 곧바로 실행되는 함수인 것이다.
        // 실행 순서 : function(error, children, stat) -> wathcer가 이벤트 감지 -> function(event) -> listChildren 재실행
		function (error, children, stat) {
			if (error) {
				console.log('Failed to list children of : %s.', error);
				return;
			}

			var zoo_shard1_replSet1 = children.indexOf(replSet1Name);
			var zoo_shard1_replSet2 = children.indexOf(replSet2Name);
			var zoo_shard1_replSet3 = children.indexOf(replSet3Name);
			var zoo_shard1_Arbiter = children.indexOf(ArbiterName);

            // 죽은 mongod를 확인하고 해당 mongod를 되살린다.
            async.series([
                function asyncReplSet1Recover(cb) {
                    IfRmZooChild_ThenRecover(zoo_shard1_replSet1, replSet1Port, replSet1Name, config.replSet1Log, config, config.replSet1Path);
                    cb(null, 'aysncReplSet1Recover');
                },
                function asyncReplSet2Recover(cb) {
                    IfRmZooChild_ThenRecover(zoo_shard1_replSet2, replSet2Port, replSet2Name, config.replSet2Log, config, config.replSet2Path);
                    cb(null, 'asyncReplSet2Recover');
                },
                function asyncReplSet3Recover(cb) {
                    IfRmZooChild_ThenRecover(zoo_shard1_replSet3, replSet3Port, replSet3Name, config.replSet3Log, config, config.replSet3Path);
                    cb(null, 'asyncReplSet3Recover');
                },
                function asyncArbiterRecover(cb) {
                    IfRmZooChild_ThenRecover(zoo_shard1_Arbiter, ArbiterPort, ArbiterName, config.arbiterLog, config, config.arbiterPath);
                    cb(null, 'asyncArbiterRecover');
                }
            ], function done(error, results) {
            });
		}
	);
}

// 만약 zkroot_shard_path(/shard1)의 해당 Ephemeral 자식 Node가 죽었다면 되살리고 해당 mongod를 실행한다.
function IfRmZooChild_ThenRecover(zkShard1_child, childPort, childName, childLog, config, childPath) {
    if (zkShard1_child == -1) {
        RecoverMongo (childPort, childName, childLog, config, childPath);
        console.log("Restart mongod " + childName + "... port: " + childPort);
    }
}

// 해당 mongod를 되살린다.
function RecoverMongo (port, mongo, log, config, replSetPath) {
    replSet.start(port, mongo, log, config, replSetPath);
}     

// Watcher 로직을 실행한다.
function WatchAndRecover(client, config, zkroot_shard_path) {
	listChildren(client, config, zkroot_shard_path)
}

exports.start = function(config) {

    console.log('Zookeeper_Watcher operate');
	var client = zookeeper.createClient(config.zkServer);

	client.once('connected', function () {
		console.log('Connected to ZooKeeper.');
        setTimeout(function() {
		    WatchAndRecover(client, config, config.zkRootShardPath);
        }, 10);
	});

	client.connect();
}
