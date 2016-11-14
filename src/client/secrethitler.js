'use strict';

import * as Cards from './card';
import { PresidentHat, ChancellorHat } from './hats';
import GameTable from './table';
import AssetManager from './assetmanager';
import { getGameId } from './utils';

class SecretHitler extends THREE.Object3D
{
	constructor()
	{
		super();
		this.assets = AssetManager.manifest;
		this.verticalAlign = 'bottom';
		this.state = 'uninitialized';
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

		// create president hat
		this.presidentHat = new PresidentHat();
		this.presidentHat.position.set(0.5, 1.3, 0);
		this.add(this.presidentHat);
	
		// create chancellor hat
		this.chancellorHat = new ChancellorHat();
		this.chancellorHat.position.set(-0.5, 1.3, 0);
		this.add(this.chancellorHat);

		// create test card
		let c = new Cards.HitlerRoleCard();
		c.translateY(1.3);
		this.add(c);
	}

}

export default new SecretHitler();
