'use strict';

import SH from './secrethitler';
import AM from './assetmanager';

export default class Nameplate extends THREE.Object3D
{
	constructor(seat)
	{
		super();

		this.seat = seat;

		// add 3d model
		this.model = AM.cache.models.nameplate.children[0].clone();
		this.model.rotation.set(-Math.PI/2, 0, Math.PI/2);
		this.model.scale.setScalar(1.25);
		this.add(this.model);

		// generate material
		this.bmp = document.createElement('canvas');
		this.bmp.width = Nameplate.textureSize;
		this.bmp.height = Nameplate.textureSize / 2;
		this.model.material = new THREE.MeshBasicMaterial({
			map: new THREE.CanvasTexture(this.bmp)
		});

		// create listener proxies
		this._hoverBehavior = new altspace.utilities.behaviors.HoverColor({
			color: new THREE.Color(0xffa8a8)
		});
		this.model.addBehavior(this._hoverBehavior);
		this.model.addEventListener('cursorup', this.click.bind(this));
	}

	updateText(text)
	{
		let fontSize = 7/32 * Nameplate.textureSize * 0.65;

		// set up canvas
		let g = this.bmp.getContext('2d');
		let fontStack = '"Helvetica Neue", Helvetica, Arial, Sans-Serif';
		g.fillStyle = '#222';
		g.fillRect(0, 0, Nameplate.textureSize, Nameplate.textureSize/2);
		g.font = `bold ${fontSize}px ${fontStack}`;
		g.textAlign = 'center';
		g.fillStyle = 'white';
		g.fillText(text, Nameplate.textureSize/2, (0.42 - 0.12)*(Nameplate.textureSize/2));

		this.model.material.map.needsUpdate = true;
	}



	click(e)
	{
		if(SH.game.state !== 'setup') return;

		if(!this.seat.owner)
			this.requestJoin();
		else if(this.seat.owner === SH.localUser.id)
			this.requestLeave();
		else if(this.seat.owner && SH.game.turnOrder.includes(SH.localUser.id))
			this.requestKick();
	}

	requestJoin()
	{
		SH.socket.emit('join', Object.assign({seatNum: this.seat.seatNum}, SH.localUser));
	}

	requestLeave()
	{
		let self = this;
		if(!self.question)
		{
			self.question = self.seat.ballot.askQuestion('Are you sure you\nwant to leave?', 'local_leave')
			.then(confirm => {
				if(confirm){
					SH.socket.emit('leave', SH.localUser.id);
				}
				self.question = null;
			})
			.catch(() => { self.question = null; });
		}
	}

	requestKick()
	{
		let self = this;
		if(!self.question)
		{
			let seat = SH.seats[SH.players[SH.localUser.id].seatNum];
			self.question = seat.ballot.askQuestion(
				'Are you sure you\nwant to try to kick\n'
				+SH.players[self.seat.owner].displayName,
				'local_kick'
			)
			.then(confirm => {
				if(confirm){
					SH.socket.emit('kick', SH.localUser.id, self.seat.owner);
				}
				self.question = null;
			})
			.catch(() => { self.question = null; });
		}
	}
}

Nameplate.textureSize = 256;
