'use strict';

import * as Cards from './card';
import { PresidentHat, ChancellorHat } from './hats';
import GameTable from './table';
import AssetManager from './assetmanager';
import { getGameId } from './utils';
import Nameplate from './nameplate';

class SecretHitler extends THREE.Object3D
{
	constructor()
	{
		super();
		this.assets = AssetManager.manifest;
		this.verticalAlign = 'bottom';
		this.needsSkeleton = true;

		// polyfill getUser function
		if(!altspace.inClient){
			altspace.getUser = () => {
				let id = Math.floor(Math.random() * 10000000);
				altspace._localUser = {
					userId: id,
					displayName: 'Guest'+id,
					isModerator: false
				};
				console.log('Masquerading as', altspace._localUser);
				return Promise.resolve(altspace._localUser);
			};
		}

		// get local user
		altspace.getUser().then((user =>
		{
			this.localUser = {
				id: user.userId,
				displayName: user.displayName,
				isModerator: user.isModerator
			};
		}).bind(this));

		this.game = null;
		this.players = null;
	}

	initialize(env, root, assets)
	{
		// share the diorama info
		AssetManager.cache = assets;
		this.env = env;

		// connect to server
		this.socket = io.connect('/', {query: 'gameId='+getGameId()});

		// create the table
		this.gameTable = new GameTable();
		this.add(this.gameTable);

		// create idle display
		this.idleRoot = new THREE.Object3D();
		this.idleRoot.position.set(0, 1.5, 0);
		this.idleRoot.addBehavior(new altspace.utilities.behaviors.Spin({speed: 0.0002}));
		this.add(this.idleRoot);

		// create idle slideshow
		let credits = new Cards.CreditsCard();
		this.idleRoot.add(credits);

		// create hats
		this.presidentHat = new PresidentHat();
		this.chancellorHat = new ChancellorHat();

		// create positions
		this.seats = [];
		for(let i=0; i<10; i++){
			let seat = new Nameplate(i);
			this.seats.push(seat);
		}
		this.add(...this.seats);

		this.socket.on('update', this.updateFromServer.bind(this));
	}

	updateFromServer(game, players)
	{
		console.log(game, players);

		if(!this.game && !this.players){
			this.game = game;
			this.players = players;
			this.dispatchEvent({type: 'init', bubbles: false});
		}
		else {
			this.dispatchEvent({type: this.game.state+'_end'});
			Object.assign(this.game, game);
			Object.assign(this.players, players);
			this.dispatchEvent({type: this.game.state, bubbles: false});
		}
	}
}

export default new SecretHitler();
