'use strict';

import AM from './assetmanager';
import SH from './secrethitler';
import { parseCSV } from './utils';

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
		this.model = AM.cache.models.table.children[0];
		this.model.rotation.set(-Math.PI/2, 0, 0);
		this.model.scale.setScalar(1.25);
		this.add(this.model);

		// set the default material
		this.model.material.map = this.textures[0];

		// position table
		this.position.set(0, 1.0, 0);

		SH.addEventListener('update_turnOrder', this.changeMode.bind(this));
	}

	changeMode({data: {game: {state, turnOrder}}})
	{
		if(state === 'setup'){
			let ids = parseCSV(turnOrder);
			if(ids.length < 2)
				this.model.material.map = this.textures[0];
			else if(ids.length < 3)
				this.model.material.map = this.textures[1];
			else
				this.model.material.map = this.textures[2];
		}
	}
};
