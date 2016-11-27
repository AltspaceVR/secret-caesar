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

		this.game = {};
		this.players = {};
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
		console.log(game.state);
		this.dispatchEvent({type: game.state+'_end'});
		Object.assign(this.game, game);
		Object.assign(this.players, players);
		this.dispatchEvent({type: game.state, bubbles: false});
	}
}

export default new SecretHitler();
