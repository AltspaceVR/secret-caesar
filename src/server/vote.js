'use strict';

const DB = require('./db'),
	Utils = require('./utils'),
	Players = require('./players'),
	Game = require('./game'),
	BPBA = require('./bpba');

function tallyVote(voteId, userId, answer)
{
	let socket = this;
	let game = new DB.GameState(socket.gameId),
		vote = new DB.Vote(voteId);

	Promise.all([game.load(), vote.load()]).then(() =>
	{
		// make sure vote is relevant
		let votes = game.get('votesInProgress'),
			players = game.get('turnOrder'),
			yesVoters = vote.get('yesVoters'),
			noVoters = vote.get('noVoters'),
			nonVoters = vote.get('nonVoters');

		let voteValid = votes.includes(voteId),
			userValid = players.includes(userId),
			notVoted = !yesVoters.includes(userId) && !noVoters.includes(userId),
			notBlacklisted = !nonVoters.includes(userId);

		Utils.log(game, `${userId} voted ${answer} on vote ${voteId}`);

		if(voteValid && userValid && notVoted && notBlacklisted)
		{
			// tally yes vote
			if(answer){
				yesVoters.push(userId);
				vote.set('yesVoters', yesVoters);
			}
			// tally no vote
			else {
				noVoters.push(userId);
				vote.set('noVoters', noVoters);
			}

			// resolve vote if threshold reached
			if( yesVoters.length + noVoters.length >= vote.get('requires') )
			{
				let totalEligibleVotes = players.length - nonVoters.length;
				let votePasses = yesVoters.length >= vote.get('toPass');
				let voteFails = noVoters.length > totalEligibleVotes - vote.get('toPass');
				if(votePasses)
					return evaluateVote.call(socket, game, vote, true);
				else if(voteFails)
					return evaluateVote.call(socket, game, vote, false);
			}

			vote.save().then(() => {
				socket.server.to(socket.gameId).emit('update',
					{votesInProgress: game.get('votesInProgress')},
					null,
					{[voteId]: vote.serialize()}
				);
			});
		}
		else
		{
			// generate reason string
			let reason;
			if(!voteValid) reason = 'vote completed';
			else if(!userValid) reason = 'user not playing';
			else if(!notVoted) reason = 'user has already voted';
			else if(!notBlacklisted) reason = 'user is not allowed to vote';

			console.warn('Invalid vote, not tallied. Reason:', reason);
		}
	});
}

function evaluateVote(game, vote, passed)
{
	if(vote.get('type') === 'join' && game.get('state') === 'setup')
	{
		evaluateJoinVote.call(this, game, vote, passed);
	}
	else if(vote.get('type') === 'kick' && game.get('state') === 'setup')
	{
		evaluateKickVote.call(this, game, vote, passed);
	}
	else if(vote.get('type') === 'confirmRole' && game.get('state') === 'night')
	{
		evaluateConfirmVote.call(this, game, vote, passed);
	}
	else if(vote.get('type') === 'elect' && game.get('state') === 'election')
	{
		evaluateElectionVote.call(this, game, vote, passed);
	}
	else if(vote.get('type') === 'tutorial' && game.get('state') === 'tutorial')
	{
		evaluateTutorialVote.call(this, game, vote, passed);
	}
}

function evaluateJoinVote(game, vote, passed)
{
	let socket = this;
	let p = new DB.Player(vote.get('target1'));
	Promise.all([game.loadPlayers(), p.load()]).then(() =>
	{
		// get prereqs
		let ids = game.get('turnOrder');
		let seatTaken = ids.find(e => game.players[e].get('seatNum') == p.get('seatNum'));
		let playerIn = ids.includes(p.get('id'));

		// add player to turn order if vote passed and still relevant
		if( passed && !seatTaken && !playerIn)
		{
			console.log('Vote passed, player joining');
			game.players[p.get('id')] = p;
			ids.push(p.get('id'));
			ids.sort((a,b) => game.players[a].get('seatNum') - game.players[b].get('seatNum'));
			game.set('turnOrder', ids);
		}
		else if(!passed){
			console.log('Vote failed, player denied entry');
		}
		else if(seatTaken){
			console.log('Vote passed, but seat became taken');
		}
		else if(playerIn){
			console.log('Vote passed, but player already seated elsewhere');
		}

		// remove completed vote from list
		let votes = game.get('votesInProgress');
		votes.splice( votes.indexOf(vote.get('id')), 1 );
		game.set('votesInProgress', votes);

		// save and update clients
		Promise.all([game.save(), vote.destroy()]).then(([gd]) => {
			socket.server.to(socket.gameId).emit('update', gd,
				passed ? {[p.get('id')]: p.serialize()} : null,
				{[vote.get('id')]: null}
			);
		});
	});
}

function evaluateKickVote(game, vote, passed)
{
	let socket = this;
	let p = new DB.Player(vote.get('target1'));

	if(passed)
	{
		// totally remove kicked player if still in setup
		let ids = game.get('turnOrder');
		ids.splice( ids.indexOf(p.get('id')), 1 );
		game.set('turnOrder', ids);

		let kickSocket = DB.socketForPlayer[p.get('id')];
		delete DB.socketForPlayer[p.get('id')];
		delete DB.playerForSocket[kickSocket];
	}
	else {
		console.log('Vote to kick failed');
	}

	// remove completed vote from list
	let votes = game.get('votesInProgress');
	votes.splice( votes.indexOf(vote.get('id')), 1 );
	game.set('votesInProgress', votes);

	// update clients
	Promise.all([game.save(), p.destroy()]).then(([gd]) => {
		socket.server.to(socket.gameId).emit('update', gd,
			passed ? {[p.get('id')]: null} : null,
			{[vote.get('id')]: null}
		);
	})
	.catch(e => console.error(e));
}

function evaluateConfirmVote(game, vote, passed)
{
	let socket = this;

	// confirmation votes only go one way, no need to check
	Utils.log(game, 'Roles confirmed, continuing');

	// choose president randomly
	let players = game.get('turnOrder');
	game.set('president', players[ Math.floor(Math.random() * players.length) ]);
	game.set('state', 'nominate');

	// remove completed vote from list
	let votes = game.get('votesInProgress');
	votes.splice( votes.indexOf(vote.get('id')), 1 );
	game.set('votesInProgress', votes);

	// update clients
	Promise.all([game.save(), vote.destroy()]).then(([gd]) => {
		socket.server.to(socket.gameId).emit('update',
			gd, null, {[vote.get('id')]: null}
		);
	})
	.catch(e => console.error(e));
}

async function evaluateElectionVote(game, vote, passed)
{
	let socket = this;

	// get election reaction
	game.set('state', 'lameDuck');

	// remove completed vote from list
	let votes = game.get('votesInProgress');
	votes.splice( votes.indexOf(vote.get('id')), 1 );
	game.set('votesInProgress', votes);
	game.set('lastElection', vote.get('id'));

	if(passed)
	{
		// update government
		if(!game.get('specialElection'))
			game.set('lastPresident', game.get('president'));
		game.set('lastChancellor', game.get('chancellor'));
		game.set('failedVotes', 0);
	}
	else
	{
		// continue to reaction, but increment fail count
		let failedVotes = game.get('failedVotes') + 1;
		game.set('failedVotes', failedVotes);

		// every third failed vote, enact a policy
		if(failedVotes >= 3 && failedVotes%3 === 0)
		{
			let [deck, card] = BPBA.discardOne(game.get('deck'), 0);
			game.set('deck', deck);
			if(card === BPBA.LIBERAL){
				game.set('liberalPolicies', game.get('liberalPolicies')+1);
				game.set('hand', 3);
			}
			else {
				game.set('fascistPolicies', game.get('fascistPolicies')+1);
				game.set('hand', 2);
			}

			// guarantee deck has enough cards to draw
			Game.guaranteeDeckSizeMinimum(game);
		}
		else {
			game.set('hand', 1);
		}

		await game.loadPlayers();

		let living = game.get('turnOrder').filter(id => game.players[id].get('state') !== 'dead');
		let sitting = null;
		if(game.get('specialElection')){
			sitting = game.get('lastPresident');
		}
		else {
			sitting = game.get('president');
		}

		let nextPres = (living.indexOf(sitting) + 1) % living.length;
		game.set('president', living[nextPres]);
		game.set('chancellor', '');
		game.set('specialElection', false);
	}

	let [gdiff, vdiff] = await Promise.all([game.save(), vote.save()])
	socket.server.to(socket.gameId).emit('update',
		gdiff, null, {[vote.get('id')]: vdiff}
	);
}

async function evaluateTutorialVote(game, vote, passed)
{
	let activeTheme = this.theme;
	const themes = {
		hitler: ['steven'],
		caesar: ['shoseki','resnauv']
	};

	if(passed){
		let readers = themes[activeTheme];
		let reader = readers[Math.floor(Math.random()*readers.length)];
		game.set('tutorial', reader);
	}
	
	Game.start(this, game);
}

exports.tallyVote = tallyVote;
