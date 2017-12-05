'use strict';

import SH from './secrethitler';
import {PlaceholderMesh, NBillboard, NText} from './nativecomponents';
import Animate from './animate';

export default class ContinueBox extends THREE.Object3D
{
	constructor(parent)
	{
		super();
		this.icon = new THREE.Mesh(
			new THREE.BoxBufferGeometry(.15, .15, .15),
			new THREE.MeshBasicMaterial({color: 0x10a010})
		);
		Animate.spin(this.icon);
		this.add(this.icon);

		this.text = PlaceholderMesh.clone();
		this.text.position.set(0, .2, 0);
		this.text.userData.altspace = {collider: {enabled: true}};

		let bb = new NBillboard(this.text);

		this.textComponent = new NText(this.text);
		this.textComponent.update({fontSize: 1, width: 2, height: 1, horizontalAlign: 'middle', verticalAlign: 'middle'});

		this.add(this.text);

		this.position.set(0, 0.25, 0);
		parent.add(this);

		SH.addEventListener('update_state', this.onstatechange.bind(this));
		SH.addEventListener('update_turnOrder', this.playerSetup.bind(this));
		this.addEventListener('cursorup', this.onclick.bind(this));
		this.addBehavior( new altspace.utilities.behaviors.HoverScale() );

		let show = () => this.show();
		SH.addEventListener('investigate', show);
		SH.addEventListener('policyAnimDone', show);
	}

	onclick(evt)
	{
		if(SH.game.turnOrder.includes(SH.localUser.id))
			SH.socket.emit('continue');
	}

	onstatechange({data: {game}})
	{
		if(game.state === 'lameDuck' || (game.state === 'peek' && game.president === SH.localUser.id)){
			this.show();
		}
		else if(game.state === 'setup'){
			this.playerSetup({data: {game}});
		}
		else if(game.state === 'done'){
			this.hide();
			setTimeout(() => {
				this.show('New game');
			}, 8000);
		}
		else {
			this.hide();
		}
	}

	playerSetup({data: {game}})
	{
		if(game.state === 'setup'){
			this.text.visible = true;
			let playerCount = game.turnOrder.length;
			if(playerCount >= 5){
				this.icon.visible = true;
				this.textComponent.update({text:
					`(${playerCount}/5) Click when ready`
				});
			}
			else {
				this.icon.visible = false;
				this.textComponent.update({text:
					`(${playerCount}/5) Need more players`
				});
			}
		}
	}

	show(message = 'Click to continue'){
		this.icon.visible = true;
		this.text.visible = true;
		this.textComponent.update({text: message});
	}

	hide(){
		this.icon.visible = false;
		this.text.visible = false;
	}
};