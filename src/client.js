'use strict';

class SecretHitler
{
	constructor()
	{
		this.assets = {
			models: {
				
			},
			textures: {
				board: 'img/board-small.png'
			}
		};
	}
	
	initialize(env, root, assets)
	{
		// create the table
		let mat = new THREE.MeshBasicMaterial({ map: assets.textures.board });
		let table = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mat);
		root.add(table);
	}
}