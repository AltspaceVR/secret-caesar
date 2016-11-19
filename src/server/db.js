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
				console.log('load', result);
				keys.forEach((k,i) => { if(result[i]) self._cache[k] = result[i]; });
				self._delta = {};
				resolve();
			})
			.catch(err => {
				console.error(err);
				reject();
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
			.expire(self.type+':'+self.id, 60*60*24)
			.execAsync()
			.then(result => {
				console.log('save', result);
				Object.assign(self._cache, self._delta);
				self._delta = {};
				resolve();
			})
			.catch(err => {
				console.error(err);
				reject();
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
}

class GameState extends GameObject
{
	constructor(id)
	{
		super('game', id);

		this._cache = {
			id: id,
			state: 'idle',
			turnOrder: '', // CSV of userIds
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
	}
}

class Player extends GameObject
{
	constructor(id)
	{
		super('player', id);

		this._cache = {
			id: id,
			displayName: displayName,
			isModerator: false,
			role: 'unassigned', // one of 'unassigned', 'hitler', 'fascist', 'liberal'
			state: 'normal' // one of 'normal', 'investigated', 'dead'
		};
	}
}

exports.SocketForPlayer = {};

exports.GameState = GameState;
exports.Player = Player;

