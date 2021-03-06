'use strict';

const DB = require('./db'),
	Utils = require('./utils');

function requestJoin(user)
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);

	console.log(`User ${user.displayName} is requesting to join`);

	// load game state from db
	game.load().then(() => game.loadPlayers()).then(() => {

		// evaluate the join conditions
		let ids = game.get('turnOrder');
		let seatTaken = ids.find(e => game.players[e].get('seatNum') == user.seatNum);
		let playerIn = ids.includes(user.id);

		// make sure preconditions are met
		if( user.seatNum !== null && game.get('state') === 'setup' && !seatTaken && !playerIn )
		{
			// create new data structure
			let p = new DB.Player(user.id);
			for(let i in user)
				p.set(i, user[i]);
			game.players[user.id] = p;

			// hook up disconnect listener
			DB.playerForSocket[socket.id] = user.id;
			DB.socketForPlayer[user.id] = socket.id;
			socket.on('disconnect', onDisconnect.bind(socket));

			// let all players join up to minimum count
			if(ids.length < 5)
			{
				ids.push(user.id);
				ids.sort((a,b) => game.players[a].get('seatNum') - game.players[b].get('seatNum'));
				game.set('turnOrder', ids);
				return Promise.all([game.save(), p.save()]);
			}
			// after minimum count, require vote to approve
			else if(ids.length < 10)
			{
				// create new vote
				let vote = new DB.Vote(Utils.generateId());
				vote.set('type', 'join');
				vote.set('target1', user.id);
				vote.set('data', user.displayName);
				vote.set('toPass', 1);
				vote.set('requires', 1);

				// add to game
				let vips = game.get('votesInProgress');
				vips.push(vote.get('id'));
				game.set('votesInProgress', vips);

				return Promise.all([game.save(), p.save(), vote.save()]);
			}
			else {
				return Promise.reject('Player join failed: room is full');
			}
		}
		else
			return Promise.reject('Player join preconditions failed');
	})
	.then(([gd, p, v]) => {
		if(gd && gd.turnOrder){
			console.log('posting update with new player');
			let pdiff = {[p.id]: Object.assign(p, {connected: true})};
			socket.server.to(socket.gameId).emit('update', gd, pdiff);
		}
		else if(gd && gd.votesInProgress){
			console.log('Putting new join to a vote');
			socket.server.to(socket.gameId).emit('update', gd, {}, {[v.id]: v});
		}
		else {
			console.log('Nothing happens');
		}
	})
	.catch(e => {
		console.log(e)
	});
}

function requestLeave(id)
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);
	let player = new DB.Player(id);

	// fetch game and player records from db
	Promise.all([game.load(), player.load()]).then(() =>
	{
		// check if player is in game
		let ids = game.get('turnOrder');
		let i = ids.indexOf(id);
		if(i > -1)
		{
			// if so, remove from game
			ids.splice(i, 1);
			game.set('turnOrder', ids);

			return Promise.all([game.save(), player.destroy()]);
		}
		else {
			// otherwise, make no changes
			return Promise.resolve([]);
		}
	})
	.then(([gd]) => {
		if(gd){
			console.log('User', id, 'has left game', socket.gameId);
			delete DB.playerForSocket[socket.id];
			delete DB.socketForPlayer[id];
			socket.server.to(socket.gameId).emit('update', gd, {[id]: null});
		}
		else {
			console.warn('Non-player user', id, 'has attempted to leave game', socket.gameId);
		}
	})
	.catch(errs => {
		console.error(errs[0]);
		console.error(errs[1]);
	});
}

function requestKick(requesterId, targetId)
{
	console.log('kick requested');

	let socket = this;
	let game = new DB.GameState(socket.gameId);
	game.load().then(() =>
	{
		let ids = game.get('turnOrder');

		// make sure requester, target are in game
		if(ids.includes(requesterId) && ids.includes(targetId))
		{
			// initiate vote to kick
			let vote = new DB.Vote(Utils.generateId());
			vote.set('type', 'kick');
			vote.set('target1', targetId);
			vote.set('requires', 2);
			vote.set('toPass', Math.ceil((ids.length-1)/2 + 0.1));
			vote.set('nonVoters', [targetId]);

			// save vote and update
			let votes = game.get('votesInProgress');
			votes.push(vote.get('id'));
			game.set('votesInProgress', votes);
			return Promise.all([game.save(), vote.save()]);
		}
		else return Promise.reject('Target or requester not valid');
	})
	.catch(err => console.error(err))
	.then(([gd, vd]) => {
		socket.server.to(socket.gameId).emit('update', gd, {}, {[vd.id]: vd});
	})
	.catch(err => console.log(err));
}

let playersForSockets = {};

function checkIn(user)
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);
	let p = new DB.Player(user.id);

	if(DB.socketForPlayer[user.id]){
		console.log('unnecessary checkin');
		return;
	}

	console.log('checking in', user);
	Promise.all([game.load(), p.load()]).then(() =>
	{
		// update user info
		for(let i in user){
			if(user[i] !== p.get(i))
				p.set(i, user[i]);
		}

		DB.playerForSocket[socket.id] = user.id;
		DB.socketForPlayer[user.id] = socket.id;
		socket.on('disconnect', onDisconnect.bind(socket));

		p.save().then((diff) => {
			socket.server.to(socket.gameId).emit('checked_in',
				Object.assign({id: user.id, connected: !!DB.socketForPlayer[user.id]}, diff)
			);
		})
		.catch(e => console.error('checkin failed:', e));
	})
	.catch(e => console.error('game load failed:', e));
}

function onDisconnect()
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);
	let userId = DB.playerForSocket[socket.id];

	// mark player as disconnected
	delete DB.playerForSocket[socket.id];
	delete DB.socketForPlayer[userId];

	game.load().then(() => game.loadPlayers()).then(() =>
	{
		let connectedCount = game.get('turnOrder').filter(p => !!DB.socketForPlayer[p]).length;
		console.log(connectedCount);

		// no players remaining, reset
		if(connectedCount === 0)
		{
			game.destroy().then(() => {
				let cleanGame = new DB.GameState(socket.gameId);
				socket.server.to(socket.gameId).emit('update', cleanGame.serialize(), null, null);
			});
		}
		else if( game.get('turnOrder').includes(userId) ){
			socket.server.to(socket.gameId).emit('update',
				{turnOrder: game.get('turnOrder')}, {[userId]: game.players[userId].serialize()}
			);
		}
	})
	.catch(e => console.error(e));
}

exports.requestJoin = requestJoin;
exports.requestLeave = requestLeave;
exports.requestKick = requestKick;
exports.checkIn = checkIn;
