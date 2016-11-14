'use strict';

import AM from './assetmanager';

export default class GameTable extends THREE.Object3D
{
	constructor()
	{
		super();

		// save references to the textures
		this.textures = [
			AM.cache.textures.board_small,
			AM.cache.textures.board_med,
			AM.cache.textures.board_large
		];

		// add table asset
		this.tableModel = AM.cache.models.table.children[0];
		this.tableModel.rotation.set(-Math.PI/2, 0, 0);
		this.add(this.tableModel);

		// set the default material
		this.tableModel.material.map = this.textures[0];

		// position table
		this.position.set(0, 0.75, 0);
	}
};
