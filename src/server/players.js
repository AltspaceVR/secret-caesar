'use strict';

const DB = require('./db');

function requestJoin(user)
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);

	console.log(`User ${user.displayName} is requesting to join`);

	// load game state from db
	game.load().then(() => game.getPlayers()).then(() => {

		// evaluate the join conditions
		let ids = game.get('turnOrder') ? game.get('turnOrder').split(',') : [];
		let seatTaken = ids.reduce(
			(v,e) => v || game.players[e].get('seatNum') == user.seatNum, false
		);
		let playerIn = ids.includes(user.id);
		let pending = game.get('pendingJoinRequests') ? game.get('pendingJoinRequests').split(',') : [];

		if( user.seatNum !== null && game.get('state') === 'idle' && !seatTaken && !playerIn )
		{
			// let all players join up to minimum count, then require approval
			if(ids.length < 5 || pending.includes(user.id))
			{
				// create new player structure
				let p = new DB.Player(user.id);
				game.players[user.id] = p;
				for(let i in user){
					p.set(i, user[i]);
				}

				// add player to game roster
				ids.push(user.id);
				ids.sort((a,b) => game.players[b].get('seatNum') - game.players[a].get('seatNum'));
				game.set('turnOrder', ids.join(','));

				return Promise.all([game.save(), p.save()]);
			}
			else {
				// TODO: resolve approval mechanic
				return Promise.resolve([]);
			}
		}
		else
			return Promise.reject('Player join failed');
	})
	.then(([gd, p]) => {
		if(gd || p){
			console.log('posting update with new player');
			socket.server.to(socket.gameId).emit('update', gd, {[p.id]: p});
		}
		else {
			console.log('Nothing happens');
		}
	})
	.catch(e => {
		console.log(e)
	});
}

exports.requestJoin = requestJoin;
