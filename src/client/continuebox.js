'use strict';

import SH from './secrethitler';
import {PlaceholderMesh, NBillboard, NText} from './nativecomponents';

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

		this.text = PlaceholderMesh.clone();
		this.text.position.set(0, .2, 0);
		this.text.userData.altspace = {collider: {enabled: true}};

		let bb = new NBillboard(this.text);

		this.textComponent = new NText(this.text);
		this.textComponent.update({fontSize: 1, width: 1, height: 1, horizontalAlign: 'middle', verticalAlign: 'middle'});

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
			this.textComponent.update({text: 'Click to continue'});
		}
		else if(game.state === 'setup' && game.turnOrder.length >= 5){
			this.icon.visible = true;
			this.text.visible = true;
			this.textComponent.update({text: 'Click to start'});
		}
		else {
			this.icon.visible = false;
			this.text.visible = false;
		}
	}
};