'use strict';

const DB = require('./db'),
	Utils = require('./utils');

async function evaluate()
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);
	let votePromise;

	await game.load();

	switch(game.get('state'))
	{
	case 'setup':
		game.set('state', 'night');
		votePromise = Promise.resolve();
		break;
	case 'lameDuck':
		game.set('state', 'policy1');
		let vote = new DB.Vote(game.get('lastElection'));
		votePromise = vote.destroy();
		game.set('lastElection', '');
		break;
	}

	let [gdiff, vdiff] = await Promise.all([game.save(), votePromise]);

	Utils.log(game, 'Continuing');
	socket.server.to(socket.gameId).emit('update', gdiff, null, vdiff && {[vdiff.get('id')]: null});
}

exports.evaluate = evaluate;