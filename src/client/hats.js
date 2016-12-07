'use strict';

import AM from './assetmanager';
import SH from './secrethitler';

class PresidentHat extends THREE.Object3D
{
	constructor(){
		super();
		this.model = AM.cache.models.tophat;
		this.model.position.set(0,0,0);
		this.model.rotation.set(-Math.PI/2, 0, 0);
		this.add(this.model);

		SH.addEventListener('update_state', ((e) => {
			if(e.data.game.state === 'setup') this.idle();
		}).bind(this));
	}

	idle(){
		this.position.set(0.75, 0, 0);
		this.rotation.set(0, Math.PI/2, 0);
		SH.idleRoot.add(this);
	}
};

class ChancellorHat extends THREE.Object3D
{
	constructor(){
		super();
		this.model = AM.cache.models.visorcap;
		this.model.position.set(0,0.04,0);
		this.model.rotation.set(-Math.PI/2, 0, 0);
		this.add(this.model);

		SH.addEventListener('update_state', ((e) => {
			if(e.data.game.state === 'setup') this.idle();
		}).bind(this));
	}

	idle(){
		this.position.set(-0.75, 0, 0);
		this.rotation.set(0, -Math.PI/2, 0);
		SH.idleRoot.add(this);
	}
};

export { PresidentHat, ChancellorHat };
