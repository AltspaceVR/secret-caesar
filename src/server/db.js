'use strict';

const redis = require('redis');
const bluebird = require('bluebird');
const config = require('./config');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

let client = redis.createClient(config.redis);

class GameObject
{
	constructor(type, id)
	{
		this.type = type;
		this.properties = ['id'];
		this.cache = {};
		this.delta = {id};
	}

	load()
	{
		let self = this;
		return new Promise((resolve,reject) =>
		{
			client.hmgetAsync(self.type+':'+self.get('id'), self.properties)
			.then(result => {
				self.properties.forEach((k,i) => {
					if(result[i] !== null) self.cache[k] = result[i];
				});
				if(Object.keys(self.cache).length > 0)
					self.delta = {};
				resolve(this);
			})
			.catch(err => {
				console.error(err);
				reject(err);
			});
		});
	}

	save()
	{
		let self = this;
		return new Promise((resolve,reject) =>
		{
			client.multi()
			.hmset(self.type+':'+self.get('id'), self.delta)
			.expire(self.type+':'+self.get('id'), 60*60*24)
			.execAsync()
			.then(result => {
				console.log('save', result);
				Object.assign(self.cache, self.delta);
				resolve(self.delta);
				self.delta = {};
			})
			.catch(err => {
				console.error(err);
				reject(err);
			});
		});
	}

	discard()
	{
		self.delta = {};
	}

	get(field){
		if(this.delta[field] !== undefined)
			return this.delta[field];
		else if(this.cache[field] !== undefined)
			return this.cache[field];
		else return null;
	}

	set(field, val){
		this.delta[field] = val;
	}

	serialize()
	{
		let safe = {};
		Object.assign(safe, this.cache, this.delta);
		return safe;
	}

	destroy()
	{
		let self = this;
		return new Promise((resolve,reject) =>
		{
			client.delAsync(self.type+':'+self.get('id'))
			.then(result => {
				self.delta = Object.assign({}, self.cache, self.delta);
				self.cache = {};
				resolve();
			})
			.catch(err => {
				console.error(err);
				reject(err);
			});
		});
	}
}

class GameState extends GameObject
{
	constructor(id)
	{
		super('game', id);
		let defaults = {
			state: 'setup',
			turnOrder: '', // CSV of userIds
			votesInProgress: '', // CSV of voteIds
			president: 0, // userId
			chancellor: 0, // userId
			lastPresident: 0, // userId
			lastChancellor: 0, // userId

			liberalPolicies: 0,
			fascistPolicies: 0,
			deckFascist: 11,
			deckLiberal: 6,
			discardFascist: 0,
			discardLiberal: 0,
			specialElection: false,
			failedVotes: 0
		};

		this.properties.push(...Object.keys(defaults));
		Object.assign(this.delta, defaults);
		this.players = {};
		this.votes = {};
	}

	loadPlayers()
	{
		let ids = this.get('turnOrder') ? this.get('turnOrder').split(',') : [];
		ids.forEach((e => {
			this.players[e] = new Player(e);
		}).bind(this));

		return Promise.all( ids.map((e => this.players[e].load()).bind(this)) );
	}

	serializePlayers(hideSecrets = true)
	{
		let c = {};
		for(let i in this.players){
			c[i] = this.players[i].serialize(hideSecrets);
		}
		return c;
	}

	loadVotes()
	{
		let ids = this.get('votesInProgress') ? this.get('votesInProgress').split(',') : [];
		ids.forEach((e => {
			this.votes[e] = new Vote(e);
		}).bind(this));

		return Promise.all( ids.map((e => this.votes[e].load()).bind(this)) );
	}

	serializeVotes()
	{
		let c = {};
		for(let i in this.votes){
			c[i] = this.votes[i].serialize();
		}
		return c;
	}
}

class Player extends GameObject
{
	constructor(id)
	{
		super('player', id);

		let defaults = {
			displayName: '',
			isModerator: false,
			seatNum: '',
			role: 'unassigned', // one of 'unassigned', 'hitler', 'fascist', 'liberal'
			state: 'normal' // one of 'normal', 'investigated', 'dead'
		};

		this.properties.push(...Object.keys(defaults));
		Object.assign(this.delta, defaults);
	}

	serialize(hideSecrets = true){
		let safe = super.serialize();
		if(hideSecrets) delete safe.role;
		return safe;
	}
}

class Vote extends GameObject
{
	constructor(id)
	{
		super('vote', id);

		let defaults = {
			type: 'elect', // one of 'elect', 'join', 'kick', 'reset'
			target1: 0, // userId of president/joiner/kicker
			target2: 0, // userId of chancellor
			data: '', // display name of join requester

			toPass: 1, // number of yea votes needed to pass
			requires: 1, // number of total votes before evaluation
			yesCount: 0,
			noCount: 0,
			yesVoters: '', // CSV of userIds that voted yes
			noVoters: '', // CSV of userIds that voted no
			nonVoters: '' // CSV of userIds that are not allowed to vote
		};

		this.properties.push(...Object.keys(defaults));
		Object.assign(this.delta, defaults);
	}
}

exports.SocketForPlayer = {};

exports.GameState = GameState;
exports.Player = Player;
exports.Vote = Vote;
