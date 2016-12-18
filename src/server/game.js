'use strict';

const DB = require('./db');

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

exports.reset = reset;
