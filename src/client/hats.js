'use strict';

import AM from './assetmanager';

class PresidentHat extends THREE.Object3D {
	constructor(){
		super();
		this.model = AM.cache.models.tophat;
		this.model.position.set(0,0,0);
		this.model.rotation.set(-Math.PI/2, 0, 0);
		this.add(this.model);
	}
};

class ChancellorHat extends THREE.Object3D {
	constructor(){
		super();
		this.model = AM.cache.models.visorcap;
		this.model.position.set(0,0,0);
		this.model.rotation.set(-Math.PI/2, 0, 0);
		this.add(this.model);
	}
};

export { PresidentHat, ChancellorHat };
