'use strict';

const DB = require('./db');
const shuffleInPlace = require('./utils').shuffleInPlace;

function reset()
{
    let socket = this;
    let game = new DB.GameState(socket.gameId);

    game.destroy().then(() => {
        let cleanGame = new DB.GameState();
        socket.server.to(socket.gameId).emit('update', cleanGame.serialize(), {});
    })
    .catch(err => console.error(err));
}

function start()
{
    let socket = this;
    let game = new DB.GameState(socket.gameId);
    console.log('starting game', socket.gameId);

    game.load().then(() => game.loadPlayers()).then(() =>
    {
        // generate roles
        let pc = game.get('turnOrder').length;
        let roles = ['hitler'];
        let libCount = Math.ceil( (pc+1)/2 );
        let fasCount = Math.floor( (pc+1)/2 ) - 2;
        for(let i=0; i<libCount; i++) roles.push('liberal');
        for(let i=0; i<fasCount; i++) roles.push('fascist');
        shuffleInPlace(roles);

        // assign roles
        game.get('turnOrder').forEach((id,i) => {
            game.players[id].set('role', roles[i]);
        });

        // generate deck
        let pack = 0x1;
        let deck = shuffleInPlace([1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0]);
        deck.forEach((e,i) => {
            pack = (pack << 1) | e;
        });
        game.set('deck', pack);
        game.set('state', 'night');

        return Promise.all([game.save(),
            Promise.all(game.get('turnOrder').map(u => game.players[u].save()))
        ]);
    })
    .then(diffs => {
        let pdiff = {};
        for(let i in game.players){
            pdiff[i] = {role: game.players[i].get('role')};
        }
        socket.server.to(socket.gameId).emit('update', diffs[0], pdiff);
    })
    .catch(e => {
        console.error(e.stack);
    });
}

exports.reset = reset;
exports.start = start;
