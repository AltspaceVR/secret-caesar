'use strict';

const DB = require('./db');
const Utils = require('./utils');

function reset()
{
	let socket = this;
	socket.server.to(socket.gameId).emit('reset');

	let game = new DB.GameState(socket.gameId);

	game.destroy().then(() => {
		let cleanGame = new DB.GameState();
		socket.server.to(socket.gameId).emit('update', cleanGame.serialize(), {});
	})
	.catch(err => console.error(err));
}

function start()
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);
	console.log('starting game', socket.gameId);

	game.load().then(() => game.loadPlayers()).then(() =>
	{
		// generate roles
		let pc = game.get('turnOrder').length;
		let roles = ['hitler'];
		let libCount = Math.ceil( (pc+1)/2 );
		let fasCount = Math.floor( (pc+1)/2 ) - 2;
		for(let i=0; i<libCount; i++) roles.push('liberal');
		for(let i=0; i<fasCount; i++) roles.push('fascist');
		Utils.shuffleInPlace(roles);

		// assign roles
		game.get('turnOrder').forEach((id,i) => {
			game.players[id].set('role', roles[i]);
		});

		// generate deck
		let pack = 0x1;
		let deck = Utils.shuffleInPlace([1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0]);
		deck.forEach((e,i) => {
			pack = (pack << 1) | e;
		});
		game.set('deck', pack);
		game.set('state', 'night');

		// start role confirmation vote
		let vote = new DB.Vote(Utils.generateId());
		vote.set('type', 'confirmRole');
		vote.set('toPass', pc);
		vote.set('requires', pc);
		game.set('votesInProgress', [...game.get('votesInProgress'), vote.get('id')]);

		return Promise.all([game.save(), vote.save(),
			Promise.all(game.get('turnOrder').map(u => game.players[u].save()))
		]);
	})
	.then(diffs =>
	{
		// format array of player info changes to identify players
		let pdiff = {};
		for(let i in game.players){
			pdiff[i] = {role: game.players[i].get('role')};
		}

		let vdiffs = {};
		vdiffs[diffs[1].id] = diffs[1];
		socket.server.to(socket.gameId).emit('update', diffs[0], pdiff, vdiffs);
	})
	.catch(e => {
		console.error(e.stack);
	});
}

function nominate(chancellor)
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);

	game.load().then(() =>
	{
		let pc = game.get('turnOrder').length;

		if(game.get('state') !== 'nominate')
			return Promise.reject('Nomination out of turn');

		else if(game.get('president') !== DB.playerForSocket[socket.id])
			return Promise.reject('Nomination not by president elect');

		else if(game.get('lastChancellor') === chancellor || pc > 5 && game.get('lastPresident') === chancellor)
			return Promise.reject('Chancellor elect is term-limited');

		else
		{
			Utils.log(game, `${game.get('president')} nominated ${game.get('chancellor')} as chancellor`);
			game.set('chancellor', chancellor);
			game.set('state', 'election');

			// set up election vote
			let vote = new DB.Vote(Utils.generateId());
			vote.set('type', 'elect');
			vote.set('toPass', Math.ceil(pc/2 + 0.1));
			vote.set('requires', pc);
			game.set('votesInProgress', [...game.get('votesInProgress'), vote.get('id')]);

			return Promise.all([game.save(), vote.save()]);
		}

	}, err => Utils.log(game, err))

	.then(([game, vote]) => {
		socket.server.to(socket.gameId).emit('update', game, null, {[vote.id]: vote});
	}, err => Utils.log(game, err));
}

exports.reset = reset;
exports.start = start;
exports.nominate = nominate;
