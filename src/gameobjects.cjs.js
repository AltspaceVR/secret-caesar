'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class GameState
{
	constructor(id)
	{
		this.id = id;

		this.state = 'idle';

		this.players = {}; // indexed by userId
		this.turnOrder = []; // array of userIds
		this.president = 0; // userId
		this.chancellor = 0; // userId
		this.lastPresident = 0; // userId
		this.lastChancellor = 0; // userId

		this.liberalPolicies = 0;
		this.fascistPolicies = 0;
		this.deckState = {fascist: 11, liberal: 6};
		this.discardState = {fascist: 0, liberal: 0};
		this.specialElection = false;
		this.failedVotes = 0;
	}

	nextPresident()
	{
		let turn = 0;

		// this is the first round, choose president randomly
		if(!this.president)
			turn = Math.floor(Math.random() * this.turnOrder.length);

		// this is a special election, so count from president emeritus
		else if(this.specialElection)
			turn = this.players[this.lastPresident].turnOrder;

		// a regular election: power passes to the left
		else
			turn = this.players[this.president].turnOrder;

		return this.turnOrder[ (turn+1)%this.turnOrder.length ];
	}

	drawPolicies()
	{

	}
}

class Player
{
	constructor(userId = 0, displayName = 'dummy', isModerator = false)
	{
		this.userId = userId;
		this.displayName = displayName;
		this.isModerator = false;
		this.turnOrder = -1; // unknown until game starts

		this.role = 'unassigned'; // one of 'unassigned', 'hitler', 'fascist', 'liberal'
		this.state = 'normal'; // one of 'normal', 'investigated', 'dead'
	}

	get party(){
		if(this.role === 'hitler') return 'fascist';
		else return this.role;
	}
}

exports.GameState = GameState;
exports.Player = Player;
