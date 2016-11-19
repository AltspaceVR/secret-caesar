'use strict';

let trueConfig = {};
try {
	trueConfig = require('../../config.js');
}
catch(e){
	console.warn('config.js not found, loading defaults');
}

const defaultConfig = {
	port: 3000,
	basePath: '/',
	objectSyncInterval: 100
}


module.exports = Object.assign({}, defaultConfig, trueConfig);


