/***************************************
* Main app - loads all main routes
***************************************/
'use strict';

// constants
const express = require('express'),
	libpath = require('path'),
	mustache = require('mustache'),
	fs = require('fs'),
	path_to_regexp = require('path-to-regexp'),

	config = require('./config'),
	DB = require('./db'),
	ObjectSync = require('./objectsync'),
	Players = require('./players'),
	Game = require('./game'),
	Vote = require('./vote');

// configure base path
const app = express();

// serve static files
app.get(config.basePath+'/static/socket.io/:file', (req,res,next) => {
	res.sendFile( libpath.join(__dirname, '..','..','node_modules',
		'socket.io-client','dist',req.params.file)
	);
});

app.use(config.basePath+'/static', express.static(
	libpath.join(__dirname,'..','..','static')
) );

app.get(config.basePath+'/', (req,res,next) => {
	res.redirect('/caesar/');
});

let indexCache = {};
app.get(config.basePath+'/:theme(hitler|caesar)/', (req,res,next) => {
	if(!indexCache[req.params.theme])
	{
		let theme = {
			hitler: req.params.theme === 'hitler',
			caesar: req.params.theme === 'caesar'
		};

		// load template
		fs.readFile(
			libpath.join(__dirname,'..','client','index.mustache'),
			{encoding: 'utf8'},
			(err,data) => {
				if(err) return res.status(500).send(err);
				else {
					indexCache[req.params.theme] = mustache.render(data, {...config, ...theme});
					res.send(indexCache[req.params.theme]);
				}
		});
	}
	else
		res.send(indexCache[req.params.theme]);
});

// generic 404
app.use((req,res,next) => {
	res.sendStatus(404);
});

// start server
let server = app.listen(config.port, () => {
	console.log(`Listening at :${config.port}${config.basePath}`);
});


const io = require('socket.io')(server, {serveClient: false});

// hook up all the game events
io.on('connection', socket =>
{
	// check room id
	socket.gameId = socket.handshake.query.gameId;
	socket.theme = socket.handshake.query.theme;

	// ignore sockets from undefined games
	if(!socket.gameId)
		return;

	// add to observers channel
	socket.join(socket.gameId);

	// hook up various listeners
	socket.on('objectsync', ObjectSync.pushToClients);
	socket.on('join', Players.requestJoin);
	socket.on('leave', Players.requestLeave);
	socket.on('kick', Players.requestKick);
	socket.on('check_in', Players.checkIn);
	socket.on('reset', Game.reset);
	socket.on('vote', Vote.tallyVote);
	socket.on('nominate', Game.nominate);
	socket.on('continue', Game.handleContinue);
	socket.on('discard_policy1', Game.discardPolicy1);
	socket.on('discard_policy2', Game.discardPolicy2);
	socket.on('name_successor', Game.nameSuccessor);
	socket.on('execute', Game.execute);
	socket.on('confirm_veto', Game.confirmVeto);

	// send the catchup signal
	let game = new DB.GameState(socket.gameId);
	game.load()
	.then(() => Promise.all([game.loadPlayers(), game.loadVotes()]) )
	.then(() => {
		console.log('new client connected to game', game.get('id'));
		socket.emit('update', game.serialize(), game.serializePlayers(), game.serializeVotes());
	});
});
