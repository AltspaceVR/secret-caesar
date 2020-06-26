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
import ButtonGroup from './buttongroup';
import {PlaceholderMesh, NText} from './nativecomponents';

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
				let id = /userId=([^;]+)/.exec(document.cookie);
				let displayName;
				if (id) {
					id = id[1];
					displayName = /displayName=([^;]+)/.exec(document.cookie)[1];
				} else {
					id = Math.floor(Math.random * 0xffffffff).toString(16);
					displayName = prompt("What is your name?");
					document.cookie = "userId=" + id;
					document.cookie = "displayName=" + displayName;
				}

				altspace._localUser = {
					userId: id,
					displayName: displayName,
					isModerator: /isModerator/.test(window.location.search)
				};
				console.log('Masquerading as', altspace._localUser);
				return Promise.resolve(altspace._localUser);
			};
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
		if(!this.localUser){
			this._userPromise.then(() => this.initialize(env, root, assets));
			return;
		}

		// share the diorama info
		AssetManager.cache = assets;
		AssetManager.fixMaterials();
		this.env = env;

		// connect to server
		this.socket = io.connect('/', {query: `gameId=${getGameId()}&theme=${theme}`});

		// spawn self-serve tutorial dialog
		if(altspace.inClient){
			altspace.open(window.location.origin+'/static/tutorial.html', '_experience',
				{hidden: true, icon: window.location.origin+'/static/img/caesar/icon.png'});
		}

		if(env.templateSid === 'conference-room-955')
		{
			this.message = PlaceholderMesh.clone();
			this.message.position.set(6, 2, 0);
			this.message.rotation.set(0, -Math.PI/2, 0);
			let ntext = new NText(this.message);
			ntext.color = 'white';
			ntext.update({
				text: 'If things get stuck, have the broken user hit the "refresh" button under the table. -Mgmt',
				fontSize: 2,
				width: 3
			});
			this.add(this.message);
		}

		this.audio = new AudioController();
		this.tutorial = new Tutorial();

		// create the table
		this.table = new GameTable();
		this.add(this.table);

		let bg1 = new ButtonGroup(this.table);
		bg1.position.set(0, -.18, -.74);
		let bg2 = new ButtonGroup(this.table);
		bg2.position.set(-1.12, -.18, 0);
		bg2.rotation.set(0, Math.PI/2, 0);
		let bg3 = new ButtonGroup(this.table);
		bg3.position.set(0, -.18, .74);
		bg3.rotation.set(0, Math.PI, 0);
		let bg4 = new ButtonGroup(this.table);
		bg4.position.set(1.12, -.18, 0);
		bg4.rotation.set(0, Math.PI*1.5, 0);

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
		//this.socket.on('disconnect', this.doReset.bind(this));
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

	doReset(game, players, votes)
	{
		window.location.reload(true);
	}
}

export default new SecretHitler();
