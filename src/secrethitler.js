'use strict';

import * as Cards from './card';
import AssetManager from './assets';
import { getGameId } from './utils';

class SecretHitler extends THREE.Object3D
{
	constructor()
	{
		super();
		this.assets = AssetManager.manifest;
		this.verticalAlign = 'bottom';
	}

	initialize(env, root, assets)
	{
		// populate the shared asset cache
		AssetManager.cache = assets;

		this.env = env;

		// create the table
		let table = assets.models.board;
		let mat = new THREE.MeshBasicMaterial({ map: assets.textures.board_large });
		table.children[0].material = mat;
		table.rotation.set(-Math.PI/2, 0, 0);
		table.position.set(0, 0.75, 0);
		this.add(table);

		// create test card
		let c = new Cards.HitlerRoleCard();
		c.translateY(1.3);
		this.add(c);

		// create president hat
		let hat = assets.models.tophat;
		hat.position.set(0.5, 1.3, 0);
		hat.rotation.set(-Math.PI/2, 0, 0);
		this.add(hat);
		
		let hat2 = assets.models.visorcap;
		hat2.position.set(-0.5, 1.3, 0);
		hat2.rotation.set(-Math.PI/2, 0, 0);
		this.add(hat2);

		// connect to server
		this.socket = io.connect('/', {query: 'gameId='+getGameId()});
		this.socket.on('idle', (data) => console.log(data));
	}

	// pass along client events to the server
	notifyServer(evt)
	{

	}
}

export default new SecretHitler();
