'use strict';

const DB = require('./db'),
	Utils = require('./utils');

async function evaluate()
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);

	await game.load();

	switch(game.get('state'))
	{
	case 'setup':
		game.set('state', 'night');
		break;
	case 'lameDuck':
		game.set('state', 'policy1');
		break;
	}

	let gdiff = await game.save();

	Utils.log(game, 'Continuing');
	socket.server.to(socket.gameId).emit('update', gdiff);
}

exports.evaluate = evaluate;