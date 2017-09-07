'use strict';

const DB = require('./db'),
	Utils = require('./utils'),
	BPBA = require('./bpba');

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

async function handleContinue()
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);

	await game.load();

	if(game.get('state') === 'setup')
		start(socket, game);
	else if(game.get('state') === 'lameDuck')
	{
		let victory = await evaluateVictory(socket, game);
		if(!victory)
			drawPolicies(socket, game);
		else {
			game.set('state', 'done');
			let diff = await game.save();
			socket.server.to(socket.gameId).emit('update', diff);
		}
	}
	else if(game.get('state') === 'aftermath')
	{
		let victory = await evaluateVictory(socket, game);
		if(!victory)
			execPowers(socket, game);
		else {
			game.set('state', 'done');
			let diff = await game.save();
			socket.server.to(socket.gameId).emit('update', diff);
		}
	}
}

async function start(socket, game)
{
	console.log('starting game', socket.gameId);

	await game.loadPlayers();

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
	game.set('deck', BPBA.shuffle(BPBA.FULL_DECK));
	game.set('state', 'night');

	// start role confirmation vote
	let vote = new DB.Vote(Utils.generateId());
	vote.set('type', 'confirmRole');
	vote.set('toPass', pc);
	vote.set('requires', pc);
	game.set('votesInProgress', [...game.get('votesInProgress'), vote.get('id')]);

	let diffs = await Promise.all([game.save(), vote.save(),
		Promise.all(game.get('turnOrder').map(u => game.players[u].save()))
	]);

	// format array of player info changes to identify players
	let pdiff = {};
	for(let i in game.players){
		pdiff[i] = {role: game.players[i].get('role')};
	}

	let vdiffs = {};
	vdiffs[diffs[1].id] = diffs[1];
	socket.server.to(socket.gameId).emit('update', diffs[0], pdiff, vdiffs);
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

async function drawPolicies(socket, game)
{
	Utils.log(game, 'Drawing policies');
	let vote = new DB.Vote(game.get('lastElection'));
	
	game.set('lastElection', '');
	game.set('state', 'policy1');

	// guarantee deck has enough cards to draw
	let deck = game.get('deck'), discard = game.get('discard'), hand = 1;
	if(BPBA.length(deck) < 3)
	{
		// discard whole remaining deck
		while(deck > 1){
			let card = 0;
			[deck, card] = BPBA.discardOne(deck, 0);
			discard = BPBA.appendCard(discard, card);
		}

		// shuffle discard, it's new deck
		deck = BPBA.shuffle(discard);
		game.set('discard', 1);
	}

	[deck, hand] = BPBA.drawThree(deck);
	game.set('deck', deck);
	game.set('hand', hand);

	let [gdiff, vdiff] = await Promise.all([game.save(), vote.destroy()]);
	socket.server.to(socket.gameId).emit('update', 
		gdiff, null, {[vote.get('id')]: null}
	);
}

async function discardPolicy1(val)
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);

	await game.load();

	// transfer selected card from hand to discard
	let [hand, discard] = BPBA.discardOne(game.get('hand'), val);
	discard = BPBA.appendCard(game.get('discard'), discard);
	game.set('hand', hand);
	game.set('discard', discard);

	game.set('state', 'policy2');
		
	let diff = await game.save();
	socket.server.to(socket.gameId).emit('update', diff);
}

async function discardPolicy2(val)
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);

	await game.load();

	// transfer selected card from hand to discard
	let [hand, discard] = BPBA.discardOne(game.get('hand'), val);
	discard = BPBA.appendCard(game.get('discard'), discard);
	game.set('hand', 1);
	game.set('discard', discard);

	if(hand & 1)
		game.set('liberalPolicies', game.get('liberalPolicies')+1);
	else
		game.set('fascistPolicies', game.get('fascistPolicies')+1);
	
	game.set('state', 'aftermath');
		
	let diff = await game.save();
	socket.server.to(socket.gameId).emit('update', diff);
}

async function execPowers(socket, game)
{
	let fascistPolicies = game.get('fascistPolicies'),
		playerCount = game.get('turnOrder').length,
		specialPhase = true;

	/*if(fascistPolicies === 1 && playerCount >= 9 ||
		fascistPolicies === 2 && game.turnOrder.length >= 7
	){
		// president investigates party membership
	}
	else if(fascistPolicies === 3 && playerCount <= 6){
		// president peeks at top of policy stack
	}
	else if(fascistPolicies === 3 && playerCount >= 7){
		// president names successor
	}
	else if(fascistPolicies >= 4 && fascistPolicies < 6){
		// president assassinates 
	}
	else {*/
		specialPhase = false;
	//}

	if(specialPhase){
		let diff = await game.save();
		socket.server.to(socket.gameId).emit('update', diff);
	}
	else {
		advanceRound(socket, game);
	}
}

async function evaluateVictory(socket, game)
{
	await game.loadPlayers();
	let hitlerId = Object.keys(game.players).find(pid => game.players[pid].get('role') === 'hitler');
	let turnOrder = game.get('turnOrder');

	if(game.get('liberalPolicies') === 5){
		Utils.log(game, 'liberal policy victory');
		game.set('victory', 'liberal-policy');
	}
	else if(game.players[hitlerId].get('state') === 'dead'){
		Utils.log(game, 'hitler assassinated');
		game.set('victory', 'liberal-assassination');
	}
	else if(game.get('fascistPolicies') === 6){
		Utils.log(game, 'fascist policy victory');
		game.set('victory', 'fascist-policy');
	}
	else if(game.get('fascistPolicies') >= 3 && game.get('lastChancellor') === hitlerId){
		Utils.log(game, 'hitler elected');
		game.set('victory', 'fascist-election');
	}

	return game.get('victory');
}

async function advanceRound(socket, game)
{
	// no executive powers gained, continue
	let turnOrder = game.get('turnOrder');
	let oldPresident = game.get('lastPresident');
	let newIndex = (turnOrder.indexOf(oldPresident)+1) % turnOrder.length;
	game.set('president', turnOrder[newIndex]);
	game.set('chancellor', '');
	game.set('state', 'nominate');

	let diff = await game.save();
	socket.server.to(socket.gameId).emit('update', diff);
}

exports.reset = reset;
exports.handleContinue = handleContinue;
exports.nominate = nominate;
exports.discardPolicy1 = discardPolicy1;
exports.discardPolicy2 = discardPolicy2;