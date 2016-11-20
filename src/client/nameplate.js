'use strict';

import SH from './secrethitler';
import AM from './assetmanager';

export default class Nameplate extends THREE.Object3D
{
	constructor(seatNum)
	{
		super();

		this.seatNum = seatNum;
		this.model = AM.cache.models.nameplate.clone();
		this.model.rotation.set(-Math.PI/2, 0, Math.PI/2);
		this.add(this.model);

		// generate material
		this.bmp = document.createElement('canvas');
		this.bmp.width = Nameplate.textureSize;
		this.bmp.height = Nameplate.textureSize / 2;
		this.model.children[0].material = new THREE.MeshBasicMaterial({
			map: new THREE.CanvasTexture(this.bmp)
		});

		// place placard
		let x = -0.8 + 0.4*( seatNum % 5 );
		let z = -0.67 + 1.34* Math.floor(seatNum/5);
		this.position.set(x, 0.765, z);
	}

	updateText(text)
	{
		// set up canvas
		let g = this.bmp.getContext('2d');
		let fontStack = '"Helvetica Neue", Helvetica, Arial, Sans-Serif';
		g.fillStyle = '#222'; // neutral brown
		g.fillRect(0, 0, Nameplate.textureSize, Nameplate.textureSize/2);
		g.font = `bold ${0.9*Nameplate.textureSize/6}px ${fontStack}`;
		g.textAlign = 'center';
		g.fillStyle = 'white';
		g.fillText(text, Nameplate.textureSize/2, (0.42 - 0.12)*(Nameplate.textureSize/2));
	}
}

Nameplate.textureSize = 512;
