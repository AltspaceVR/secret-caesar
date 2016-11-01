'use strict';

class SecretHitler
{
	constructor()
	{
		this.assets = {
			models: {
				board: 'model/table.dae'
			},
			textures: {
				board: 'img/board-large-baked.png'
			}
		};
	}
	
	initialize(env, root, assets)
	{
		// set root to the tabletop (1m from floor)
		window.root = root;
		let halfHeight = env.innerHeight/(2*env.pixelsPerMeter);
		root.position.setY(-halfHeight);

		// create the table
		let table = assets.models.board;
		let mat = new THREE.MeshBasicMaterial({ map: assets.textures.board });
		table.children[0].material = mat;
		table.rotation.set(-Math.PI/2, 0, 0);
		table.position.set(0, 1, 0);
		root.add(table);
	}
}
