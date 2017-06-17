'use strict';

import AM from './assetmanager';
import SH from './secrethitler';

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

		// de-flip textures
		this.textures.forEach(tex => tex.flipY = false);

		// add table asset
		this.model = AM.cache.models.table;
		this.model.scale.setScalar(1.25);
		this.add(this.model);

		// set the default material
		this.setTexture(this.textures[0], true);

		// position table
		this.position.set(0, 0.8, 0);

		SH.addEventListener('update_turnOrder', this.changeMode.bind(this));
	}

	changeMode({data: {game: {state, turnOrder}}})
	{
		if(state === 'setup'){
			if(turnOrder.length >= 9)
				this.setTexture(this.textures[2]);
			else if(turnOrder.length >= 7)
				this.setTexture(this.textures[1]);
			else
				this.setTexture(this.textures[0]);
		}
	}

	setTexture(newTex, switchLightmap)
	{
		this.model.traverse(o => {
			if(o instanceof THREE.Mesh)
			{
				if(switchLightmap)
					o.material.lightMap = o.material.map;

				o.material.map = newTex;
			}
		});
	}
};
