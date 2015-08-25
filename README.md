# nodejs-mongodb-zookeeper

### Setting Zookeeper, Node Server
Please set up before use as follows.

1. create /data/db/replSet1 directory
2. create /data/db/replSet2 directory
3. create /data/db/replSet3 directory
4. create /data/db/replSet_Arbiter directory
5. create /data/db/replSet_Log directory

Next, type 'mongod' operation to create mongo server as follows.

```
1. "sudo mongod --port 20000 --dbpath /data/db/replSet1 --replSet Mongo_study --smallfiles --oplogSize 128 --logpath /data/db/replSet_Log/mongo_replSet1.log"
2. "sudo mongod --port 30000 --dbpath /data/db/replSet2 --replSet Mongo_study --smallfiles --oplogSize 128 --logpath /data/db/replSet_Log/mongo_replSet2.log"
3. "sudo sudo mongod --port 40000 --dbpath /data/db/replSet3 --replSet Mongo_study --smallfiles --oplogSize 128 --logpath /data/db/replSet_Log/mongo_replSet3.log"
4. "sudo mongod --port 20017 --dbpath /data/db/replSet_Arbiter --replSet Mongo_study --smallfiles --noprealloc --nojournal --logpath /data/db/replSet_Log/mongo-replSet_Arbiter.log"
```
Now, lets enter replSet mongo server to complete setup

```
1. "mongo localhost:20000"
2. > rsconf = {
     _id: "Mongo_study",
     members: [
     	{
     		_id: 0,
     		host: "localhost:20000"
     	}]
     }
3. > rs.initiate(rsconf)
4. > rs.conf()
```

Cool!
Now, you may meet this prompt

```
Mongo_study:PRIMARY> 
```

Lets execute as follows.

```
1. rs.add("localhost:30000")
2. rs.add("localhost:40000")
3. rs.addArb("localhost:20017")
```

Now, you complete all setup. Let's start mongodb-zookeeper

<br>

### Zookeeper Cluster Info
#### Zookeeper 서버, 클라이언트 실행파일 및 설정정보
주키퍼는 3개의 서버로 클러스터링 돼 실행됩니다.<br>
./zoo/zoo_cluster 디렉토리 아래에 3개의 주키퍼 서버와 클라이언트 실행파일 및 설정정보가 각각 들어 있습니다.<br>

```
주키퍼 서버 실행파일
zkCluster1: ./zoo/zoo_cluster/zookeeper1/zookeeper-3.4.6/bin/zkServer.sh
zkCluster2: ./zoo/zoo_cluster/zookeeper2/zookeeper-3.4.6/bin/zkServer.sh
zkCluster3: ./zoo/zoo_cluster/zookeeper3/zookeeper-3.4.6/bin/zkServer.sh
```
```
주키퍼 클라이언트 실행파일
zkCluster1: ./zoo/zoo_cluster/zookeeper1/zookeeper-3.4.6/bin/zkCli.sh
zkCluster2: ./zoo/zoo_cluster/zookeeper2/zookeeper-3.4.6/bin/zkCli.sh
zkCluster3: ./zoo/zoo_cluster/zookeeper3/zookeeper-3.4.6/bin/zkCli.sh
```
```
주키퍼 config 파일
zkCluster1: ./zoo/zoo_cluster/zookeeper1/zookeeper-3.4.6/conf/zoo.cfg
zkCluster2: ./zoo/zoo_cluster/zookeeper2/zookeeper-3.4.6/conf/zoo.cfg
zkCluster3: ./zoo/zoo_cluster/zookeeper3/zookeeper-3.4.6/conf/zoo.cfg
```
<br>
각 주키퍼 서버가 실행이 되면 해당 서버의 pid 정보 및 로그와 스냅샷이 ```./zoo/zoo_cluster/zookeeper?_data``` 디렉토리 내에 저장이 되도록 ```zoo.cfg```파일을 작성 했습니다.<br>
pid 정보는 해당 주키퍼 서버가 실행이 되면 ```zookeeper?_data``` 디렉토리 안에 ```zookeeper_server.pid``` 파일로 저장이 됩니다.<br>

```
주키퍼 log, snapshot 경로
zkCluster1: ./zoo/zoo_cluster/zookeeper1_data/version-2
zkCluster2: ./zoo/zoo_cluster/zookeeper2_data/version-2
zkCluster3: ./zoo/zoo_cluster/zookeeper3_data/version-2
```
```
주키퍼 pid 파일 경로
zkCluster1: ./zoo/zoo_cluster/zookeeper1_data/zookeeper_server.pid
zkCluster2: ./zoo/zoo_cluster/zookeeper2_data/zookeeper_server.pid
zkCluster3: ./zoo/zoo_cluster/zookeeper3_data/zookeeper_server.pid
```
<br>
또한 각 주키퍼 서버의 id도 ```zookeeper?_data``` 디렉토리 내에 ```myid```파일로 저장돼 있습니다.<br>

```
주키퍼 myid 파일 경로
zkCluster1: ./zoo/zoo_cluster/zookeeper1_data/myid
zkCluster2: ./zoo/zoo_cluster/zookeeper2_data/myid
zkCluster3: ./zoo/zoo_cluster/zookeeper3_data/myid
```
<br>
### Launch Zookeeper, Node Server
Please execute commands as follows.

```
sudo node Initializer.js
```
