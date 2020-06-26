'use strict';

let trueConfig = null;

try {
	trueConfig = require('../../config.js');
}
catch(e){
	console.warn('config.js not found, loading defaults');
}

const defaultConfig = {
	port: process.env.PORT || 3000,
	basePath: '',
	objectSyncInterval: 100,
	redis: {
		host: process.env.REDIS_HOST || '127.0.0.1',
		port: process.env.REDIS_PORT || 6379
	},
	localLibs: true,
	sentry_client: null,
	sentry_server: null
}

module.exports = Object.assign({}, defaultConfig, trueConfig);
if(trueConfig && trueConfig.redis)
	module.exports.redis = Object.assign({}, defaultConfig.redis, trueConfig.redis);
