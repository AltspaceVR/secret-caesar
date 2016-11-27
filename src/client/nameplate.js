'use strict';

import SH from './secrethitler';
import AM from './assetmanager';

export default class Nameplate extends THREE.Object3D
{
	constructor(seatNum)
	{
		super();

		this.seatNum = seatNum;
		this.model = AM.cache.models.nameplate.children[0].clone();
		this.model.rotation.set(-Math.PI/2, 0, 0);
		this.model.scale.setScalar(1.25);
		this.add(this.model);

		// generate material
		this.bmp = document.createElement('canvas');
		this.bmp.width = Nameplate.textureSize;
		this.bmp.height = Nameplate.textureSize / 2;
		this.model.material = new THREE.MeshBasicMaterial({
			map: new THREE.CanvasTexture(this.bmp)
		});

		// place placard
		let x, y = 0.769, z;
		switch(seatNum){
		case 0: case 1: case 2:
			this.model.rotateZ(Math.PI/2);
			x = -0.833 + 0.833*seatNum;
			this.position.set(x, y, -0.83);
			break;
		case 3: case 4:
			z = -0.437 + 0.874*(seatNum-3);
			this.position.set(1.21, y, z);
			break;
		case 5: case 6: case 7:
			this.model.rotateZ(Math.PI/2);
			x = 0.833 - 0.833*(seatNum-5);
			this.position.set(x, y, 0.83);
			break;
		case 8: case 9:
			z = 0.437 - 0.874*(seatNum-8);
			this.position.set(-1.21, y, z);
			break;
		}

		// hook up listeners
		SH.addEventListener('idle', this.onIdle.bind(this));
	}

	updateText(text)
	{
		console.log('drawing', text);
		// set up canvas
		let g = this.bmp.getContext('2d');
		let fontStack = '"Helvetica Neue", Helvetica, Arial, Sans-Serif';
		g.fillStyle = '#222';
		g.fillRect(0, 0, Nameplate.textureSize, Nameplate.textureSize/2);
		g.font = `bold ${0.9*Nameplate.textureSize/6}px ${fontStack}`;
		g.textAlign = 'center';
		g.fillStyle = 'white';
		g.fillText(text, Nameplate.textureSize/2, (0.42 - 0.12)*(Nameplate.textureSize/2));
	}

	onIdle()
	{
		// check for player
		this.playerId = Object.keys(SH.players).find((e => SH.players[e].seatNum === this.seatNum).bind(this));
		if(this.playerId)
		{
			console.log('updating');
			this.updateText(SH.players[this.playerId].displayName);
		}
		else
		{
			console.log('setting up');
			this.updateText('<Click to join>');
			this.model.addEventListener('cursorenter', (() => { this.model.material.color = 0x7c00ff; }).bind(this));
			this.model.addEventListener('cursorleave', (() => { this.model.material.color = 0xffffff; }).bind(this));
		}
	}
}

Nameplate.textureSize = 512;
