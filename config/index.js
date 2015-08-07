'use strict';

var os = require('os');
var hostname = os.hostname();

var config = require('./develop.json');
module.exports = config;
