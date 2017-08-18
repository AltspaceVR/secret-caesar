'use strict';

import AM from './assetmanager';
import SH from './secrethitler';

class Hat extends THREE.Object3D
{
	constructor(model)
	{
		super();
		this.currentId = '';

		if(model.parent)
			model.parent.remove(model);
		model.updateMatrixWorld(true);

		// grab meshes
		let prop = '';
		model.traverse(obj => {
			if(obj.name === 'hat' || obj.name === 'text')
				prop = obj.name;
			else if(obj instanceof THREE.Mesh)
				this[prop] = obj;
		});

		// strip out middle nodes
		this.hat.matrix.copy(this.hat.matrixWorld);
		this.hat.matrix.decompose(this.hat.position, this.hat.quaternion, this.hat.scale);
		this.add(this.hat);

		this.text.matrix.copy(this.text.matrixWorld);
		this.text.matrix.decompose(this.text.position, this.text.quaternion, this.text.scale);
		this.add(this.text);

		d.scene.add(this);
	}

	setOwner(userId)
	{
		if(!this.currentId && userId){
			d.scene.add(this);
			altspace.addNativeComponent(this.hat, 'n-skeleton-parent');
			altspace.addNativeComponent(this.text, 'n-skeleton-parent');
		}
		else if(this.currentId && !userId){
			altspace.removeNativeComponent(this.hat, 'n-skeleton-parent');
			altspace.removeNativeComponent(this.text, 'n-skeleton-parent');
			d.scene.remove(this);
		}

		if(userId){
			let settings = {index: 0, part: 'head', side: 'center', userId: userId};
			altspace.updateNativeComponent(this.hat, 'n-skeleton-parent', settings);
			altspace.updateNativeComponent(this.text, 'n-skeleton-parent', settings);
		}

		this.currentId = userId;
	}
}

class PresidentHat extends Hat
{
	constructor(){
		super(AM.cache.models.tophat);
		this.position.set(0, 0.144/SH.env.pixelsPerMeter, .038/SH.env.pixelsPerMeter);
		this.scale.multiplyScalar(1.2/SH.env.pixelsPerMeter);
		
		SH.addEventListener('update_lastPresident', e => {
			this.setOwner(e.data.game.lastPresident);
		});
	}
};

class ChancellorHat extends Hat
{
	constructor(){
		super(AM.cache.models.visorcap);
		this.position.set(0, 0.07/SH.env.pixelsPerMeter, .038/SH.env.pixelsPerMeter);
		this.scale.multiplyScalar(1.2/SH.env.pixelsPerMeter);
		
		SH.addEventListener('update_lastChancellor', e => {
			this.setOwner(e.data.game.lastChancellor);
		});
	}
}

export { PresidentHat, ChancellorHat };
