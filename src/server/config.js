'use strict';

let trueConfig = null;

try {
	trueConfig = require('../../config.js');
}
catch(e){
	console.warn('config.js not found, loading defaults');
}

const defaultConfig = {
	port: 3000,
	basePath: '',
	objectSyncInterval: 100,
	redis: {
		host: '127.0.0.1',
		port: 6379
	},
	localLibs: false,
	sentry_client: null,
	sentry_server: null
}

module.exports = Object.assign({}, defaultConfig, trueConfig);
if(trueConfig && trueConfig.redis)
	module.exports.redis = Object.assign({}, defaultConfig.redis, trueConfig.redis);
