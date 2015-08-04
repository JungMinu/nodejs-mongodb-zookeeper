# nodejs-mongodb-zookeeper

### Launch Zookeeper, Node Server
Please execute commands as follows.

1. zkCli => "create /shard1 ''"
2. "sudo node mongo_primary.js"
3. "sudo node mongo_secondary1.js"
4. "sudo node mongo_secondary2.js"
5. "sudo node mongo_arbiter.js"
6. "sudo node watcher.js"