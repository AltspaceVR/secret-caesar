'use strict';

const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

let client = redis.createClient();

function saveGame(game)
{
	let m = client.multi()
		.hmset('game:'+game.id,
			'id', game.id,
			'state', game.state,
			'president', game.president,
			'chancellor', game.chancellor,
			'lastPresident', game.lastPresident,
			'lastChancellor', game.lastChancellor,
			'liberalPolicies', game.liberalPolicies,
			'fascistPolicies', game.fascistPolicies,
			'deckFascist', game.deckFascist,
			'deckLiberal', game.deckLiberal,
			'discardFascist', game.discardFascist,
			'discardLiberal', game.discardLiberal,
			'specialElection', game.specialElection,
			'failedVotes', game.failedVotes
		);

	if(game.turnOrder.length > 0)
		m.lpush(`game:${game.id}:turnOrder`, game.turnOrder);

	return m.execAsync();
}

function getGame(id)
{
	
}

exports.saveGame = saveGame;
exports.getGame = getGame;

