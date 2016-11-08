'use strict';

import * as Cards from './card';
import AssetManager from './assets';

export default //SecretHitler
{
	assets: AssetManager.manifest,
	initialize: (env, root, assets) => {

		// set root to the tabletop (1m from floor)
		let halfHeight = env.innerHeight/(2*env.pixelsPerMeter);
		root.position.setY(-halfHeight);

		// populate the shared asset cache
		AssetManager.cache = assets;

		// create the table
		let table = assets.models.board;
		let mat = new THREE.MeshBasicMaterial({ map: assets.textures.board_large });
		table.children[0].material = mat;
		table.rotation.set(-Math.PI/2, 0, 0);
		table.position.set(0, 1, 0);
		root.add(table);

		// create test card
		let c = new Cards.HitlerRoleCard();
		c.translateY(1.3);
		root.add(c);
	},

}

