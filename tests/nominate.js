let DB = require('../src/server/db');

var game = new DB.GameState('test');
game.delta = {
	"id": "test",
	"state": "nominate",
	"turnOrder": ["3333333","2222222","1111111","5555555","4444444"],
	"votesInProgress": [],
	"president": "1111111",
	"chancellor": "",
	"lastPresident": "",
	"lastChancellor": "",
	"lastElection": "",
	"liberalPolicies": 0,
	"fascistPolicies": 0,
	"deck": 164808,
	"discard": 1,
	"hand": 1,
	"specialElection": false,
	"failedVotes": 0,
	"tutorial": "",
	"victory": ""
};

var players = [
	new DB.Player('1111111'),
	new DB.Player('2222222'),
	new DB.Player('3333333'),
	new DB.Player('4444444'),
	new DB.Player('5555555')
];
players[0].delta = {
	"id": "1111111",
	"displayName": "1111111",
	"isModerator": "true",
	"seatNum": "2",
	"role": "liberal",
	"state": "normal"
};
players[1].delta = {
	"id": "2222222",
	"displayName": "2222222",
	"isModerator": "false",
	"seatNum": "1",
	"role": "liberal",
	"state": "normal"
};
players[2].delta = {
	"id": "3333333",
	"displayName": "3333333",
	"isModerator": "false",
	"seatNum": "0",
	"role": "fascist",
	"state": "normal"
};
players[3].delta = {
	"id": "4444444",
	"displayName": "4444444",
	"isModerator": "false",
	"seatNum": "9",
	"role": "liberal",
	"state": "normal"
};
players[4].delta = {
	"id": "5555555",
	"displayName": "5555555",
	"isModerator": "false",
	"seatNum": "8",
	"role": "hitler",
	"state": "normal"
};

Promise.all([game.save(), Promise.all(players.map(p => p.save()))])
.then(() => console.log('Saved'))
.catch(e => console.error(e))
.then(() => DB.client.quit());
