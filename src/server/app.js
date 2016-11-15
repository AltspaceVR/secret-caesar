/***************************************
* Main app - loads all main routes
***************************************/

// constants
const express = require('express');
const libpath = require('path');
const config = require('./config');
const go = require('../gameobjects');

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
	socket.roomId = socket.handshake.query.roomId;

	socket.emit('idle', 'we got this far!');
});

