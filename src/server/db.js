'use strict';

const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

let client = redis.createClient();

class GameObject
{
	constructor(type, id)
	{
		this.type = type;
		this._cache = {};
		this._delta = {};
	}

	load()
	{
		let self = this;
		return new Promise((resolve,reject) =>
		{
			let keys = Object.keys(self._cache);
			client.hmgetAsync(self.type+':'+self.get('id'), keys)
			.then(result => {
				keys.forEach((k,i) => { if(result[i]) self._cache[k] = result[i]; });
				self._delta = {};
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
			.hmset(self.type+':'+self.get('id'), self._delta)
			.expire(self.type+':'+self.get('id'), 60*60*24)
			.execAsync()
			.then(result => {
				console.log('save', result);
				Object.assign(self._cache, self._delta);
				resolve(self._delta);
				self._delta = {};
			})
			.catch(err => {
				console.error(err);
				reject(err);
			});
		});
	}

	discard()
	{
		self._delta = {};
	}

	get(field){
		return this._delta[field] || this._cache[field] || null;
	}

	set(field, val){
		this._delta[field] = val;
	}

	serialize()
	{
		let safe = {};
		Object.assign(safe, this._cache, this._delta);
		return safe;
	}

	destroy()
	{
		let self = this;
		return new Promise((resolve,reject) =>
		{
			console.log('attempting reset');
			client.delAsync(self.type+':'+self.get('id'))
			.then(result => {
				console.log('reset successful');
				self._delta = Object.assign({}, self._cache, self._delta);
				self._cache = {};
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

		this._cache = {
			id,
			state: 'setup',
			turnOrder: '', // CSV of userIds
			pendingJoinRequest: '', // CSV of userIds
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

		this.players = {};
	}

	getPlayers()
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
}

class Player extends GameObject
{
	constructor(id)
	{
		super('player', id);

		this._cache = {
			id,
			displayName: '',
			isModerator: false,
			seatNum: null,
			role: 'unassigned', // one of 'unassigned', 'hitler', 'fascist', 'liberal'
			state: 'normal' // one of 'normal', 'investigated', 'dead'
		};
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

		this._cache = {
			id,
			type: 'elect', // one of 'elect', 'join', 'kick', 'reset'
			target1: 0, // userId of president/joiner/kicker
			target2: 0, // userId of chancellor
			data: '', // display name of join requester

			needs: 0, // number of yea votes needed to pass
			yesCount: 0,
			noCount: 0,
			participants: '', // CSV of userIds of users that have voted
			nonvoters: '' // CSV of userIds that are not allowed to vote
		};
	}
}

exports.SocketForPlayer = {};

exports.GameState = GameState;
exports.Player = Player;
