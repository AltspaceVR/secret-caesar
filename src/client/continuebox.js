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
			new THREE.BoxBufferGeometry(.2, .1, .2),
			new THREE.MeshBasicMaterial({color: 0x00c000})
		);
		this.icon.addBehavior(new altspace.utilities.behaviors.Spin());
		this.add(this.icon);

		this.text = new THREE.Mesh(placeholderGeo, placeholderMat);
		this.text.position.set(0, .2, 0);
		this.text.material.visible = false;
		this.text.userData.altspace = {collider: {enabled: false}};

		altspace.addNativeComponent(this.text, 'n-billboard');

		// must send all properties every update, or they'll zero out
		this.textData = {fontSize: 1, text: 'Test', width: 1, height: 1, horizontalAlign: 'middle', verticalAlign: 'middle'};
		altspace.addNativeComponent(this.text, 'n-text');
		altspace.updateNativeComponent(this.text, 'n-text', this.textData);

		this.add(this.text);

		this.position.set(0, 0.3, 0);
		parent.add(this);

		SH.addEventListener('update_state', this.onstatechange.bind(this));
		this.addEventListener('cursorup', this.onclick.bind(this));
	}

	onclick(evt)
	{
		if(SH.turnOrder.includes(SH.localUser.id))
			SH.socket.emit('continue');
	}

	onstatechange({data: {game}})
	{
		if(game.state === 'lameDuck'){
			this.icon.visible = true;
			this.text.visible = true;
			this.textData.text = 'Click to continue';
			altspace.updateNativeComponent(this.text, 'n-text', this.textData);
		}
		else if(game.state === 'setup' && game.turnOrder.length >= 5){
			this.icon.visible = true;
			this.text.visible = true;
			this.textData.text = 'Click to start';
			altspace.updateNativeComponent(this.text, 'n-text', this.textData);
		}
		else {
			this.icon.visible = false;
			this.text.visible = false;
		}
		
	}
};