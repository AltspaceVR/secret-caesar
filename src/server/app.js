/***************************************
* Main app - loads all main routes
***************************************/
'use strict';

// constants
const express = require('express');
const libpath = require('path');
const mustache = require('mustache');
const fs = require('fs');
const config = require('./config');
const DB = require('./db');
const ObjectSync = require('./objectsync');
const Players = require('./players');
const Game = require('./game');

// configure base path
const einst = express();
const app = express.Router();
einst.use(config.basePath, app);

// serve static files
app.use('/static', express.static( libpath.join(__dirname,'..','..','static') ) );

// serve files that are *not* game state
app.get('/socket.io/:file', (req,res,next) => {
	console.log('Fetching static file', req.params.file);
	res.sendFile( libpath.join(__dirname, '..','..','node_modules','socket.io-client','dist',req.params.file) );
});

let indexCache = '';
app.get('/', (req,res,next) => {
	if(!indexCache)
	{
		// load template
		fs.readFile(
			libpath.join(__dirname,'..','client','index.mustache'),
			{encoding: 'utf8'},
			(err,data) => {
				if(err) return res.status(500).send(err);
				else {
					indexCache = mustache.render(data, config);
					res.send(indexCache);
				}
		});
	}
	else
		res.send(indexCache);
});

// generic 404
app.use((req,res,next) => {
	res.sendStatus(404);
});

// start server
let server = einst.listen(config.port, () => {
	console.log(`Listening at :${config.port}${config.basePath}`);
});


const io = require('socket.io')(server, {serveClient: false});

// hook up all the game events
io.on('connection', socket =>
{
	// check room id
	socket.gameId = socket.handshake.query.gameId;

	// ignore sockets from undefined games
	if(!socket.gameId)
		return;

	// add to observers channel
	socket.join(socket.gameId);

	// hook up various listeners
	console.log(Game);
	socket.on('objectsync', ObjectSync.pushToClients);
	socket.on('requestJoin', Players.requestJoin);
	socket.on('reset', Game.reset);

	// send the catchup signal
	let game = new DB.GameState(socket.gameId);
	game.load().then(() => game.getPlayers()).then(() => {
		console.log('new client connected to game', game.get('id'));
		socket.emit('update', game.serialize(), game.serializePlayers());
	});
});
