'use strict';

const redis = require('redis'),
	bluebird = require('bluebird'),
	parseCSV = require('./utils').parseCSV,
	config = require('./config');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

let client = redis.createClient(config.redis);

class GameObject
{
	constructor(type, id)
	{
		this.type = type;
		this.properties = ['id'];
		this.propTypes = {id: 'string'};
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
					if(result[i] !== null)
					{
						switch(self.propTypes[k]){

						case 'csv':
							self.cache[k] = parseCSV(result[i]);
							break;
						case 'int':
						case 'bool':
						case 'json':
							self.cache[k] = JSON.parse(result[i]);
							break;
						case 'string':
						default:
							self.cache[k] = result[i];
							break;
						}
					}
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
			if( Object.keys(self.delta).length === 0 )
				resolve({});

			let dbSafe = {};
			for(let i in self.delta){
				switch(self.propTypes[i]){
					case 'csv':
						dbSafe[i] = self.delta[i].join(',');
						break;
					case 'int':
					case 'bool':
					case 'json':
						dbSafe[i] = JSON.stringify(self.delta[i]);
						break;
					case 'string':
					default:
						dbSafe[i] = self.delta[i];
				}
			}

			client.multi()
			.hmset(self.type+':'+self.get('id'), dbSafe)
			.expire(self.type+':'+self.get('id'), 60*60*24)
			.execAsync()
			.then(result => {
				console.log('save', result);
				Object.assign(self.cache, self.delta);
				resolve(self.delta);
				self.delta = {};
			})
			.catch(err => {
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
	}

	set(field, val){
		if(this.cache[field] !== undefined || this.delta[field] !== undefined)
			this.delta[field] = val;
		else {
			throw new Error(`Field ${field} is not valid on this object`);
		}
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
			turnOrder: [], // CSV of userIds
			votesInProgress: [], // CSV of voteIds
			president: '', // userId
			chancellor: '', // userId
			lastPresident: '', // userId
			lastChancellor: '', // userId

			liberalPolicies: 0,
			fascistPolicies: 0,
			// bit-packed boolean array. liberal=1, fascist=0
			// most sig bit is 1. least sig bit is top of deck
			deck: 0x1, // bpba
			discard: 0x1, // bpba
			specialElection: false,
			failedVotes: 0
		};

		Object.assign(this.propTypes, {
			id: 'string',
			state: 'string',
			turnOrder: 'csv',
			votesInProgress: 'csv',
			president: 'string',
			chancellor: 'string',
			lastPresident: 'string',
			lastChancellor: 'string',
			liberalPolicies: 'int',
			fascistPolicies: 'int',
			deckLiberal: 'int',
			discardLiberal: 'int',
			discardFascist: 'int',
			specialElection: 'bool',
			failedVotes: 'int'
		});

		this.properties.push(...Object.keys(defaults));
		Object.assign(this.delta, defaults);
		this.players = {};
		this.votes = {};
	}

	loadPlayers()
	{
		this.get('turnOrder').forEach((e => {
			this.players[e] = new Player(e);
		}).bind(this));

		return Promise.all(
			this.get('turnOrder').map(
				(e => this.players[e].load()).bind(this)
			)
		);
	}

	serializePlayers(hideSecrets = false)
	{
		let c = {};
		for(let i in this.players){
			c[i] = this.players[i].serialize(hideSecrets);
		}
		return c;
	}

	loadVotes()
	{
		this.get('votesInProgress').forEach((e => {
			this.votes[e] = new Vote(e);
		}).bind(this));

		return Promise.all(
			this.get('votesInProgress').map(
				(e => this.votes[e].load()).bind(this)
			)
		);
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
			seatNum: null,
			role: 'unassigned', // one of 'unassigned', 'hitler', 'fascist', 'liberal'
			state: 'normal' // one of 'normal', 'investigated', 'dead'
		};

		Object.assign(this.propTypes, {
			displayName: 'string',
			isModerator: 'bool',
			seatNum: 'int',
			role: 'string',
			state: 'string'
		});

		this.properties.push(...Object.keys(defaults));
		Object.assign(this.delta, defaults);
	}

	serialize(hideSecrets = false){
		let safe = super.serialize();
		if(hideSecrets) delete safe.role;
		safe.connected = !!socketWithPlayer[this.get('id')];
		return safe;
	}
}

class Vote extends GameObject
{
	constructor(id)
	{
		super('vote', id);

		let defaults = {
			type: 'elect', // one of 'elect', 'join', 'kick', 'reset', 'confirmRole'
			target1: '', // userId of president/joiner/kicker
			target2: '', // userId of chancellor
			data: '', // display name of join requester

			toPass: 1, // number of yea votes needed to pass
			requires: 1, // number of total votes before evaluation
			yesVoters: [], // CSV of userIds that voted yes
			noVoters: [], // CSV of userIds that voted no
			nonVoters: [] // CSV of userIds that are not allowed to vote
		};

		Object.assign(this.propTypes, {
			type: 'string',
			target1: 'string',
			target2: 'string',
			data: 'string',

			toPass: 'int',
			requires: 'int',
			yesVoters: 'csv',
			noVoters: 'csv',
			nonVoters: 'csv'
		});

		this.properties.push(...Object.keys(defaults));
		Object.assign(this.delta, defaults);
	}
}

let playerWithSocket = exports.playerWithSocket = {};
let socketWithPlayer = exports.socketWithPlayer = {};

exports.GameState = GameState;
exports.Player = Player;
exports.Vote = Vote;
