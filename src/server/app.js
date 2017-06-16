/***************************************
* Main app - loads all main routes
***************************************/
'use strict'

// constants
const express = require('express')
const libpath = require('path')
const mustache = require('mustache')
const fs = require('fs')
// const path_to_regexp = require('path-to-regexp')
const config = require('./config')
const DB = require('./db')
const ObjectSync = require('./objectsync')
const Players = require('./players')
const Game = require('./game')
const Vote = require('./vote')

// configure base path
const app = express()

// serve static files
app.get(config.basePath + '/static/socket.io/:file', (req, res, next) => {
  res.sendFile(libpath.join(__dirname, '..', '..', 'node_modules', 'socket.io-client', 'dist', req.params.file))
})

app.use(config.basePath + '/static', express.static(
  libpath.join(__dirname, '..', '..', 'static')
))

let indexCache = ''
app.get(config.basePath + '/', (req, res, next) => {
  if (!indexCache) {
// load template
    fs.readFile(
      libpath.join(__dirname, '..', 'client', 'index.mustache'),
      {encoding: 'utf8'},
      (err, data) => {
        if (err) {
          return res.status(500).send(err)
        } else {
          indexCache = mustache.render(data, config)
          res.send(indexCache)
        }
      })
  } else {
    res.send(indexCache)
  }
})

// generic 404
app.use((req, res, next) => {
  res.sendStatus(404)
})

// start server
let server = app.listen(config.port, () => {
  console.log(`Listening at :${config.port}${config.basePath}`)
})

const io = require('socket.io')(server, {serveClient: false})

// hook up all the game events
io.on('connection', socket => {
// check room id
  socket.gameId = socket.handshake.query.gameId

// ignore sockets from undefined games
  if (!socket.gameId) {
    return
  }

// add to observers channel
  socket.join(socket.gameId)

// hook up various listeners
  socket.on('objectsync', ObjectSync.pushToClients)
  socket.on('join', Players.requestJoin)
  socket.on('leave', Players.requestLeave)
  socket.on('kick', Players.requestKick)
  socket.on('checkIn', Players.checkIn)
  socket.on('reset', Game.reset)
  socket.on('vote', Vote.tallyVote)

// send the catchup signal
  let game = new DB.GameState(socket.gameId)
  game.load()
    .then(() => Promise.all([game.loadPlayers(), game.loadVotes()]))
    .then(() => {
      console.log('new client connected to game', game.get('id'))
      socket.emit('update', game.serialize(), game.serializePlayers(), game.serializeVotes())
    })
})
