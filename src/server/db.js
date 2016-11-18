'use strict';

const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

let client = redis.createClient();

class GameState
{
	constructor(id)
	{
		this._cache = {
			id: id,
			state: 'idle',
			turnOrder: '', // string of dash-delineated userIds
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
		this._delta = {};
	}

	load()
	{
		let self = this;
		return new Promise((resolve,reject) =>
		{
			let keys = Object.keys(self._cache);
			client.hmgetAsync('game:'+self.get('id'), keys)
			.then(result => {
				console.log(result);
				keys.forEach((k,i) => { self._cache[k] = result[i]; });
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
			.hmset('game:'+self.get('id'), self._delta)
			.expire('game:'+self.id, 60*60*24)
			.execAsync()
			.then(result => {
				console.log(result);
				Object.apply(self._cache, self._delta);
				self._delta = {};
				resolve();
			})
			.catch(err => {
				console.error(err);
				reject();
			});
		});
	}

	get(field){
		return this._delta[field] || this._cache[field] || null;
	}

	set(field, val){
		this._delta[field] = val;
	}
}

exports.GameState = GameState;

