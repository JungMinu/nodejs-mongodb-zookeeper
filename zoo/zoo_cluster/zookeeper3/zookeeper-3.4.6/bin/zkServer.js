var exec = require('child_process').exec;

exec("sudo ./zkServer.sh start", function(error, stdout, stderr) {
    console.log(stdout);
});
