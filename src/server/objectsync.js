'use strict';

const config = require('./config');

let updates = {};
let io = null;

function pushToClients(id, data)
{
	let socket = this;
	if(!io) io = socket.server;

	if( !updates[socket.gameId] )
		updates[socket.gameId] = {[id]: data};
	else
		updates[socket.gameId][id] = data;
}

setInterval(() =>
{
	let keys = Object.keys(updates);
	keys.forEach(g => {
		io.sockets.to(g).emit('objectsync', updates[g]);
		delete updates[g];
	});

}, config.objectSyncInterval);

exports.pushToClients = pushToClients;
