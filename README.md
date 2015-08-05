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

Now, you complete all setup. Enjoy mongodb-zookeeper

<br>


### Launch Zookeeper, Node Server
Please execute commands as follows.

```
1. zkCli => "create /shard1 ''"
2. "sudo node mongo_primary.js"
3. "sudo node mongo_secondary1.js"
4. "sudo node mongo_secondary2.js"
5. "sudo node mongo_arbiter.js"
6. "sudo node watcher.js"
```