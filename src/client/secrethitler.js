'use strict';

import './polyfill';

import {activeTheme as theme} from './theme';

import { PresidentHat, ChancellorHat } from './hats';
import GameTable from './table';
import AssetManager from './assetmanager';
import { getGameId, mergeObjects } from './utils';
import Nameplate from './nameplate';
import Seat from './seat';
import PlayerMeter from './playermeter';
import ContinueBox from './continuebox';
import ElectionTracker from './electiontracker';
import Presentation from './presentation';
import AudioController from './audiocontroller';
import Tutorial from './tutorial';

class SecretHitler extends THREE.Object3D
{
	constructor()
	{
		super();
		this.assets = AssetManager.manifest;
		this.verticalAlign = 'bottom';
		this.needsSkeleton = false;

		// polyfill getUser function
		if(!altspace.inClient){
			altspace.getUser = () => {
				let id, re = /[?&]userId=(\d+)/.exec(window.location.search);
				if(re)
					id = re[1];
				else
					id = Math.floor(Math.random() * 10000000).toString();

				altspace._localUser = {
					userId: id,
					displayName: id,
					isModerator: /isModerator/.test(window.location.search)
				};
				console.log('Masquerading as', altspace._localUser);
				return Promise.resolve(altspace._localUser);
			};
		}
		else {
			altspace.open('/static/tutorial.html', '_experience', {hidden: true});
		}

		// get local user
		this._userPromise = altspace.getUser();
		this._userPromise.then(user => {
			this.localUser = {
				id: user.userId,
				displayName: user.displayName,
				isModerator: user.isModerator
			};
		});

		this.game = {};
		this.players = {};
		this.votes = {};
	}

	initialize(env, root, assets)
	{
		// share the diorama info
		AssetManager.cache = assets;
		AssetManager.fixMaterials();
		this.env = env;

		// connect to server
		this.socket = io.connect('/', {query: `gameId=${getGameId()}&theme=${theme}`});

		this.audio = new AudioController();
		this.tutorial = new Tutorial();

		// create the table
		this.table = new GameTable();
		this.add(this.table);

		this.resetButton = new THREE.Mesh(
			new THREE.BoxGeometry(.25,.25,.25),
			new THREE.MeshBasicMaterial({map: assets.textures.reset})
		);
		this.resetButton.position.set(0, -0.18, 0);
		this.resetButton.addEventListener('cursorup', this.sendReset.bind(this));
		this.table.add(this.resetButton);

		this.presentation = new Presentation();

		// create hats
		this.presidentHat = new PresidentHat();
		this.chancellorHat = new ChancellorHat();

		// create positions
		this.seats = [];
		for(let i=0; i<10; i++){
			this.seats.push( new Seat(i) );
		}

		this.table.add(...this.seats);

		//this.playerMeter = new PlayerMeter();
		//this.table.add(this.playerMeter);
		this.continueBox = new ContinueBox(this.table);

		this.electionTracker = new ElectionTracker();

		this.socket.on('update', this.updateFromServer.bind(this));
		this.socket.on('checked_in', this.checkedIn.bind(this));

		this.socket.on('reset', this.doReset.bind(this));
		this.socket.on('disconnect', this.doReset.bind(this));
	}

	updateFromServer(gd, pd, vd)
	{
		console.log(gd, pd, vd);

		let game = Object.assign({}, this.game, gd);
		let players = mergeObjects(this.players, pd || {});
		let votes = mergeObjects(this.votes, vd || {});

		if(gd.tutorial)
			this.audio.loadTutorial(game);

		if(gd.state)
			this.tutorial.stateUpdate(game, votes);

		for(let field in gd)
		{
			this.dispatchEvent({
				type: 'update_'+field,
				bubbles: false,
				data: {
					game: game,
					players: players,
					votes: votes
				}
			});
		}

		this._userPromise.then(() => {
			if(players[this.localUser.id] && !players[this.localUser.id].connected){
				this.socket.emit('check_in', this.localUser);
			}
		});

		this.game = game;
		this.players = players;
		this.votes = votes;
	}

	checkedIn(p)
	{
		Object.assign(this.players[p.id], p);
		this.dispatchEvent({
			type: 'checked_in',
			bubbles: false,
			data: p.id
		});
	}

	sendReset(e){
		if(this.localUser.isModerator){
			console.log('requesting reset');
			this.socket.emit('reset');
		}
	}

	doReset(game, players, votes)
	{
		if( /&cacheBust=\d+$/.test(window.location.search) ){
			window.location.search += '1';
		}
		else {
			window.location.reload();
		}
	}
}

export default new SecretHitler();
