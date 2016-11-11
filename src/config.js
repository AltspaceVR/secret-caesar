'use strict';

let trueConfig = {};
try {
	config = require('../config.js');
}
catch(e){
	console.warn('config.js not found, loading defaults');
}

const defaultConfig = {
	port: 3000,
	basePath: '/'
}


module.exports = Object.assign({}, defaultConfig, trueConfig);


