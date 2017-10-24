'use strict';

import AM from './assetmanager';
import SH from './secrethitler';
import {NSkeletonParent} from './nativecomponents';
import {activeTheme as theme} from './theme';

class Hat extends THREE.Object3D
{
	constructor(model)
	{
		super();
		this.currentId = '';
		this.components = {hat: null, text: null};
		
		if(model.parent)
			model.parent.remove(model);
		model.updateMatrixWorld(true);

		// grab meshes
		let prop = '';
		model.traverse(obj => {
			if(obj.name === 'hat' || obj.name === 'text'){
				prop = obj.name;
			}
			else if(obj instanceof THREE.Mesh){
				this[prop] = obj;
			}
		});

		// strip out middle nodes
		if(this.hat){
			this.hat.matrix.copy(this.hat.matrixWorld);
			this.hat.matrix.decompose(this.hat.position, this.hat.quaternion, this.hat.scale);
			this.add(this.hat);
		}

		if(this.text){
			this.text.matrix.copy(this.text.matrixWorld);
			this.text.matrix.decompose(this.text.position, this.text.quaternion, this.text.scale);
			this.add(this.text);
		}

		d.scene.add(this);
	}

	setOwner(userId)
	{
		if(!this.currentId && userId){
			d.scene.add(this);
			if(this.hat)
				this.components.hat = new NSkeletonParent(this.hat);
			if(this.text)
				this.components.text = new NSkeletonParent(this.text);
		}
		else if(this.currentId && !userId){
			if(this.hat)
				this.components.hat.destroy();
			if(this.text)
				this.components.text.destroy();
			d.scene.remove(this);
		}

		if(userId){
			if(this.hat)
				this.components.hat.update({userId});
			if(this.text)
				this.components.text.update({userId});
		}

		this.currentId = userId;
	}
}

class PresidentHat extends Hat
{
	constructor(){
		if(theme === 'caesar')
		{
			super(AM.cache.models.laurels.clone());
			this.position.set(0, .08/SH.env.pixelsPerMeter, .03/SH.env.pixelsPerMeter);
			this.rotation.set(.5, 0, 0);
			this.scale.multiplyScalar(0.8/SH.env.pixelsPerMeter);
		}
		else
		{
			super(AM.cache.models.tophat);
			this.position.set(0, 0.144/SH.env.pixelsPerMeter, .038/SH.env.pixelsPerMeter);
			this.scale.multiplyScalar(1.2/SH.env.pixelsPerMeter);
		}
		
		let assignHat = ({data: {game}}) => {
			let sitting = game.specialElection ? game.president : game.lastPresident;
			this.setOwner(sitting);
		}
		SH.addEventListener('update_specialElection', assignHat);
		SH.addEventListener('update_president', assignHat);
		SH.addEventListener('update_lastPresident', assignHat);
	}
};

class ChancellorHat extends Hat
{
	constructor(){
		if(theme === 'caesar'){
			super(AM.cache.models.laurels.clone());
			this.position.set(0, .08/SH.env.pixelsPerMeter, .03/SH.env.pixelsPerMeter);
			this.rotation.set(.5, 0, 0);
			this.scale.multiplyScalar(0.8/SH.env.pixelsPerMeter);
		}
		else
		{
			super(AM.cache.models.visorcap);
			this.position.set(0, 0.07/SH.env.pixelsPerMeter, .038/SH.env.pixelsPerMeter);
			this.scale.multiplyScalar(1.2/SH.env.pixelsPerMeter);
		}

		SH.addEventListener('update_lastChancellor', e => {
			this.setOwner(e.data.game.lastChancellor);
		});
	}
}

export { PresidentHat, ChancellorHat };
