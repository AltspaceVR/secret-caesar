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
		this.idleRoot.position.set(0, 1.3, 0);
		this.idleRoot.addBehavior(new altspace.utilities.behaviors.Spin({speed: 0.0002}));
		this.add(this.idleRoot);

		// create idle slideshow
		let credits = new Cards.CreditsCard();
		this.idleRoot.add(credits);

		// create hats
		this.presidentHat = new PresidentHat();
		this.chancellorHat = new ChancellorHat();

		// create positions
		for(let i=0; i<10; i++){
			let seat = new Nameplate(i);
			seat.updateText('Seat '+i);
			this.add(seat);
		}

		this.socket.on('update', this.updateFromServer.bind(this));
	}

	updateFromServer(game)
	{
		Object.assign(this.game, game);
		this.dispatchEvent({type: game.state, bubbles: false});
	}
}

export default new SecretHitler();
