'use strict';

import * as Cards from './card';
import AssetManager from './assets';

export default //SecretHitler
{
	assets: AssetManager.manifest,
	verticalAlign: 'bottom',
	initialize: (env, root, assets) => {

		// populate the shared asset cache
		AssetManager.cache = assets;
		AssetManager.root = root;

		// create the table
		let table = assets.models.board;
		let mat = new THREE.MeshBasicMaterial({ map: assets.textures.board_large });
		table.children[0].material = mat;
		table.rotation.set(-Math.PI/2, 0, 0);
		table.position.set(0, 0.75, 0);
		root.add(table);

		// create test card
		let c = new Cards.FascistPolicyCard();
		c.translateY(1.3);
		root.add(c);

		let hat = assets.models.tophat;
		hat.position.set(0.5, 1.3, 0);
		hat.rotation.set(-Math.PI/2, 0, 0);
		root.add(hat);
		
		let hat2 = assets.models.visorcap;
		hat2.position.set(-0.5, 1.3, 0);
		hat2.rotation.set(-Math.PI/2, 0, 0);
		root.add(hat2);
	}
}

