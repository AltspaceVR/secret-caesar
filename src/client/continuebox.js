'use strict';

import SH from './secrethitler';

let placeholderGeo = new THREE.BoxBufferGeometry(.001, .001, .001);
let placeholderMat = new THREE.MeshBasicMaterial({color: 0xffffff});

export default class ContinueBox extends THREE.Object3D
{
	constructor(parent)
	{
		super();
		this.icon = new THREE.Mesh(
			new THREE.BoxBufferGeometry(.1, .1, .1),
			new THREE.MeshBasicMaterial({color: 0x00c000})
		);
		this.icon.addBehavior(new altspace.utilities.behaviors.Spin());
		this.add(this.icon);

		this.text = new THREE.Mesh(placeholderGeo, placeholderMat);
		this.add(this.text);

		this.position.set(0, 0.3, 0);
		parent.add(this);

		SH.addEventListener('update_state', this.onstatechange.bind(this));
		this.addEventListener('cursorup', this.onclick.bind(this));
	}

	onclick(evt)
	{
		SH.socket.emit('continue');
	}

	onstatechange({data: {game}})
	{
		console.log('continue:', game);
		let visible = game.state === 'lameDuck' || game.state === 'setup' && game.turnOrder.length >= 5;
		this.icon.visible = visible;
		this.text.visible = visible;
	}
};