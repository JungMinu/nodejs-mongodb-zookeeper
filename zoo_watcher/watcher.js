var async = require('async');
var exec = require('child_process').exec;
var zookeeper = require('node-zookeeper-client');
var t = require('exectimer');

var replSetLauncher = require('./../mongo/mongo_replSet');

function listChildren(client, replSetArray, MongoConfig, zkRootPath, zkHost) {
    var replSetNum = replSetArray.length;
    var replSetName = [replSetArray[0].name];
    for(var i = 1; i < replSetNum; i++) {
        replSetName.push(replSetArray[i].name);
    }

	client.getChildren(
		zkRootPath,
        // 해당 zkroot_shard_path(/shard1)의 내용이 변경될 경우에 function (event)가 실행된다.
		function (event) {
			console.log('Got watcher event: %s', event);
            // 변경 된 것을 감지하면 죽은 mongod를 되살리게 된다.
            // 하지만 zookeeper는 watcher가 해당 이벤트를 감지하면 사라지게 되는 구조이므로
            // 아래와 같이 다시 watcher를 걸어줘야 한다.(listChildren을 다시 호출해야 한다.) 무한루프는 일어나지 않는다.
            // 죽은 몽고를 되살리는데 시간이 얼마나 걸리는지 ns 단위로 출력한다.
            var tick = new t.Tick("TIMER");

            tick.start();
            listChildren(client, replSetArray, MongoConfig, zkRootPath, zkHost);
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

            var zkChildSet = [children.indexOf(replSetName[0])];
            for (var i = 1; i < replSetNum; i++) {
                zkChildSet.push(children.indexOf(replSetName[i]));
            }

            // 죽은 mongod를 확인하고 해당 mongod를 되살린다.
            for (var i = 0; i < replSetNum; i++) {
                IfRmZooChild_ThenRecover(zkChildSet[i], replSetArray[i], replSetName[replSetNum-1], MongoConfig, zkRootPath, zkHost);
            }
		}
	);
}

// 만약 zkroot_shard_path(/shard1)의 해당 Ephemeral 자식 Node가 죽었다면 되살리고 해당 mongod를 실행한다.
function IfRmZooChild_ThenRecover(zkChild, replSet, ArbiterName, MongoConfig, zkRootPath, zkHost) {
    if (zkChild == -1) {
        RecoverMongo(replSet, ArbiterName, MongoConfig, zkHost, zkRootPath);
        console.log("Restart mongod " + replSet.name + "... port: " + replSet.port);
    }
}

// 해당 mongod를 되살린다.
function RecoverMongo (replSet, ArbiterName, MongoConfig, zkHost, zkRootPath) {
    replSetLauncher.start(replSet, ArbiterName, MongoConfig, zkHost, zkRootPath);
}     

// Watcher 로직을 실행한다.
function WatchAndRecover(client, replSetArray, MongoConfig, zkRootPath, zkHost) {
	listChildren(client, replSetArray, MongoConfig, zkRootPath, zkHost);
}

exports.start = function(replSetArray, MongoConfig, zkRootPath, zkHost) {

    console.log('Zookeeper_Watcher operate');
	var client = zookeeper.createClient(zkHost);

	client.once('connected', function () {
		console.log('Connected to ZooKeeper.');
        setTimeout(function() {
		    WatchAndRecover(client, replSetArray, MongoConfig, zkRootPath, zkHost);
        }, 10);
	});

	client.connect();
}
