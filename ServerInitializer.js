var mongo = require('./mongo/Launch_mongo');

function _startServer() {
	mongo.serverStart('/data/db/primary', '20000');
	mongo.serverStart('/data/db/secondary1', '30000');
	mongo.serverStart('/data/db/secondary2', '40000');
}

_startServer();
