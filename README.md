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
sudo node app.js
```

<br>
ps
-
If you stop app.js with ^C then please connect to zkCli and checkout with 'ls /shard1' command before restarting app.js


If you aren't sure to check the /shard1 znode's child znodes are exists, you may encounter error.

If you find '/shard1' znode's child znodes, please remove that child znodes with 'rmr /shard1/'child znode's name'.