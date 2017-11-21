'use strict';

const DB = require('./db'),
	Utils = require('./utils'),
	BPBA = require('./bpba');

let winTime = {};

function reset(reloadClient)
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);
	game.save().then(() => {
		if(reloadClient)
			socket.server.to(socket.gameId).emit('reset');
		else
			socket.server.to(socket.gameId).emit('update', game.serialize(), {}, {});
	})
	.catch(err => console.error(err));
}

async function handleContinue()
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);

	await game.load();

	let state = game.get('state');
	if(state === 'setup')
	{
		// kick off tutorial vote
		let vote = new DB.Vote(Utils.generateId());
		game.set('state', 'tutorial');		
		vote.set('type', 'tutorial');
		game.set('votesInProgress', [vote.get('id')]);
		
		let diff = await game.save();
		await vote.save();

		socket.server.to(socket.gameId).emit('update', diff, null, {[vote.get('id')]: vote.serialize()});
	}
	else if(state === 'lameDuck')
	{
		// election successful, continue
		// election successful, victory
		// election fail, continue
		// election fail, policy victory

		if(game.get('failedVotes') === 0)
		{
			await game.loadPlayers();
			let victory = await evaluateVictory(socket, game);
			if(!victory)
				drawPolicies(socket, game);
			else {
				let vote = new DB.Vote(game.get('lastElection'));
				game.set('lastElection', '');

				winTime[socket.gameId] = Date.now();
				game.set('state', 'done');
				let [diff] = await Promise.all([game.save(), vote.destroy()]);
				socket.server.to(socket.gameId).emit('update', diff, null, {[vote.get('id')]: null});
			}
		}
		else {
			let vote = new DB.Vote(game.get('lastElection'));
			game.set('lastElection', '');

			game.set('state', 'nominate');
			let [diff] = await Promise.all([game.save(), vote.destroy()]);
			socket.server.to(socket.gameId).emit('update', diff, null, {[vote.get('id')]: null});
		}
	}
	else if(state === 'aftermath')
	{
		await game.loadPlayers();
		let victory = await evaluateVictory(socket, game);
		if(!victory)
			execPowers(socket, game);
		else {
			winTime[socket.gameId] = Date.now();
			game.set('state', 'done');
			let diff = await game.save();
			socket.server.to(socket.gameId).emit('update', diff);
		}
	}
	else if(state === 'investigate' || state === 'peek')
	{
		await game.loadPlayers();
		advanceRound(socket, game);
	}
	else if(state === 'done')
	{
		if(Date.now() > winTime[socket.gameId] + 5000)
			reset.call(socket, false);
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

	// cancel all join/kick votes in progress
	let oldVotes = game.get('votesInProgress').map(id => new DB.Vote(id));

	// start role confirmation vote
	let vote = new DB.Vote(Utils.generateId());
	vote.set('type', 'confirmRole');
	vote.set('toPass', pc);
	vote.set('requires', pc);
	game.set('votesInProgress', [vote.get('id')]);

	let [gdiff, vdiff] = await Promise.all([game.save(), vote.save(),
		Promise.all(game.get('turnOrder').map(u => game.players[u].save())),
		Promise.all(oldVotes.map(v => v.destroy()))
	]);

	// format array of player info changes to identify players
	let pdiff = {};
	for(let i in game.players){
		pdiff[i] = {role: game.players[i].get('role')};
	}

	vdiff = {[vdiff.id]: vdiff};
	socket.server.to(socket.gameId).emit('update', gdiff, pdiff, vdiff);
}

function nominate(chancellor)
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);

	game.load().then(() => game.loadPlayers()).then(() =>
	{
		let turnOrder = game.get('turnOrder');
		let living = turnOrder.filter(id => game.players[id].get('state') !== 'dead');
		let dead = turnOrder.filter(id => game.players[id].get('state') === 'dead');

		if(game.get('state') !== 'nominate')
			return Promise.reject('Nomination out of turn');

		else if(game.get('president') !== DB.playerForSocket[socket.id])
			return Promise.reject('Nomination not by president elect');

		else if(game.get('lastChancellor') === chancellor || living.length > 5 && game.get('lastPresident') === chancellor)
			return Promise.reject('Chancellor elect is term-limited');

		else
		{
			Utils.log(game, `${game.get('president')} nominated ${game.get('chancellor')} as chancellor`);
			game.set('chancellor', chancellor);
			game.set('state', 'election');

			// set up election vote
			let vote = new DB.Vote(Utils.generateId());
			vote.set('type', 'elect');
			vote.set('toPass', Math.ceil(living.length/2 + 0.1));
			vote.set('requires', living.length);
			vote.set('nonVoters', dead);
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

	let [deck, hand] = BPBA.drawThree(game.get('deck'));
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

	if(val === -1)
	{
		game.set('state', 'veto');
	}
	else
	{
		// transfer selected card from hand to discard
		let [hand, discard] = BPBA.discardOne(game.get('hand'), val);
		discard = BPBA.appendCard(game.get('discard'), discard);
		game.set('hand', hand);
		game.set('discard', discard);

		if(hand & 1 === BPBA.LIBERAL)
			game.set('liberalPolicies', game.get('liberalPolicies')+1);
		else
			game.set('fascistPolicies', game.get('fascistPolicies')+1);

		game.set('state', 'aftermath');

		// guarantee deck has enough cards to draw
		guaranteeDeckSizeMinimum(game);
	}

	let diff = await game.save();
	socket.server.to(socket.gameId).emit('update', diff);
}

async function execPowers(socket, game)
{
	let fascistPolicies = game.get('fascistPolicies'),
		lastCardIsFascist = (game.get('hand') & 1) === BPBA.FASCIST,
		playerCount = game.get('turnOrder').length,
		specialPhase = false;

	if(lastCardIsFascist)
	{
		specialPhase = true;

		if(fascistPolicies === 1 && playerCount >= 9 ||
			fascistPolicies === 2 && playerCount >= 7
		){
			// president investigates party membership
			game.set('state', 'investigate');
		}
		else if(fascistPolicies === 3 && playerCount <= 6){
			// president peeks at top of policy stack
			game.set('state', 'peek');
		}
		else if(fascistPolicies === 3 && playerCount >= 7){
			// president names successor
			game.set('state', 'nameSuccessor');
		}
		else if(fascistPolicies >= 4 && fascistPolicies < 6){
			// president executes player
			game.set('state', 'execute');
		}
		else {
			specialPhase = false;
		}
	}

	if(specialPhase){
		let diff = await game.save();
		socket.server.to(socket.gameId).emit('update', diff);
	}
	else {
		await game.loadPlayers();
		advanceRound(socket, game);
	}
}

async function evaluateVictory(socket, game)
{
	let hitlerId = Object.keys(game.players).find(pid => game.players[pid].get('role') === 'hitler');
	let turnOrder = game.get('turnOrder');

	if(game.get('liberalPolicies') === 5){
		Utils.log(game, 'liberal policy victory');
		game.set('victory', 'liberal-policy');
	}
	else if(game.get('state') === 'execute' && game.players[hitlerId].get('state') === 'dead'){
		Utils.log(game, 'hitler assassinated');
		game.set('victory', 'liberal-assassination');
	}
	else if(game.get('fascistPolicies') === 6){
		Utils.log(game, 'fascist policy victory');
		game.set('victory', 'fascist-policy');
	}
	else if(game.get('state') === 'lameDuck' && game.get('fascistPolicies') >= 3 && game.get('lastChancellor') === hitlerId){
		Utils.log(game, 'hitler elected');
		game.set('victory', 'fascist-election');
	}

	return game.get('victory');
}

async function advanceRound(socket, game, player)
{
	// no executive powers gained, continue
	let living = game.get('turnOrder').filter(id => game.players[id].get('state') !== 'dead');
	let oldPresident = game.get('lastPresident');
	let newIndex = (living.indexOf(oldPresident)+1) % living.length;
	game.set('president', living[newIndex]);
	game.set('chancellor', '');
	game.set('specialElection', false);
	game.set('state', 'nominate');

	let diff = await game.save();
	let pdiff = {};
	if(player)
		pdiff[player.get('id')] = await player.save();
	socket.server.to(socket.gameId).emit('update', diff, pdiff);
}

async function nameSuccessor(userId)
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);
	await game.load();

	game.set('president', userId);
	game.set('chancellor', '');
	game.set('specialElection', true);
	game.set('state', 'nominate');

	let diff = await game.save();
	socket.server.to(socket.gameId).emit('update', diff);
}

async function execute(userId)
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);
	await game.load();
	await game.loadPlayers();

	let player = game.players[userId];
	player.set('state', 'dead');

	let victory = await evaluateVictory(socket, game);
	if(!victory)
		advanceRound(socket, game, player);
	else {
		game.set('state', 'done');
		let diff = await game.save();
		let pdiff = await player.save();
		socket.server.to(socket.gameId).emit('update', diff, {[player.get('id')]: pdiff});
	}
}

function guaranteeDeckSizeMinimum(game)
{
	let deck = game.get('deck'), discard = game.get('discard');
	if(BPBA.length(deck) < 3)
	{
		discard = BPBA.concat(discard, deck);

		// shuffle discard, it's new deck
		deck = BPBA.shuffle(discard);
		game.set('discard', 1);
		game.set('deck', deck);
	}
}

async function confirmVeto(confirmed)
{
	let socket = this;
	let game = new DB.GameState(socket.gameId);
	await game.load();

	if(confirmed)
	{
		// discard both policies
		let hand = game.get('hand'), discard = game.get('discard');
		discard = BPBA.concat(discard, hand);
		game.set('hand', 1);
		game.set('discard', discard);

		game.set('failedVotes', game.get('failedVotes')+1);
		game.set('state', 'aftermath');
	}
	else
	{
		game.set('state', 'policy2');
	}

	let diff = await game.save();
	socket.server.to(socket.gameId).emit('update', diff);
}

exports.reset = reset;
exports.start = start;
exports.handleContinue = handleContinue;
exports.nominate = nominate;
exports.discardPolicy1 = discardPolicy1;
exports.discardPolicy2 = discardPolicy2;
exports.nameSuccessor = nameSuccessor;
exports.execute = execute;
exports.guaranteeDeckSizeMinimum = guaranteeDeckSizeMinimum;
exports.confirmVeto = confirmVeto;