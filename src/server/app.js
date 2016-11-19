/***************************************
* Main app - loads all main routes
***************************************/

// constants
const express = require('express');
const libpath = require('path');
const config = require('./config');
const DB = require('./db');
const ObjectSync = require('./objectsync');

// configure base path
const einst = express();
const app = express.Router();
einst.use(config.basePath, app);

// serve static files
app.use('/static', express.static( libpath.join(__dirname,'..','..','static') ) );

// serve files that are *not* game state
app.get('/socket.io.js', (req,res,next) => {
	res.sendFile( libpath.join(__dirname, '..','..','node_modules','socket.io-client','socket.io.js') );
});

app.get('/', (req,res,next) => {
	res.sendFile( libpath.join(__dirname, '..','..','static','index.html') );
});

// generic 404
app.use((req,res,next) => {
	res.sendStatus(404);
});

// start server
let server = einst.listen(config.port, () => {
	console.log('Listening on port', config.port);
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
	socket.on('objectsync', ObjectSync.pushToClients);

	// send the catchup signal
	let game = new DB.GameState(socket.gameId);
	game.load().then(() => {
		console.log('new client connected to game', game.get('id'));
		socket.emit('helo', game.serialize());
	});
});

