'use strict';

import SH from './secrethitler';
import Nameplate from './nameplate';
import Ballot from './ballot';
import PlayerInfo from './playerinfo';
import CapsuleGeometry from './capsulegeometry';
import {lateUpdate} from './utils';

export default class Seat extends THREE.Object3D
{
	constructor(seatNum)
	{
		super();

		this.seatNum = seatNum;
		this.owner = '';

		// position seat
		let x, y=0.65, z;
		switch(seatNum){
		case 0: case 1: case 2:
			x = -0.833 + 0.833*seatNum;
			this.position.set(x, y, -1.05);
			break;
		case 3: case 4:
			z = -0.437 + 0.874*(seatNum-3);
			this.position.set(1.425, y, z);
			this.rotation.set(0, -Math.PI/2, 0);
			break;
		case 5: case 6: case 7:
			x = 0.833 - 0.833*(seatNum-5);
			this.position.set(x, y, 1.05);
			this.rotation.set(0, -Math.PI, 0);
			break;
		case 8: case 9:
			z = 0.437 - 0.874*(seatNum-8);
			this.position.set(-1.425, y, z);
			this.rotation.set(0, -1.5*Math.PI, 0);
			break;
		}

		SH.addEventListener('update_turnOrder', this.updateOwnership.bind(this));
		SH.addEventListener('update_state', lateUpdate(this.updateState.bind(this)));
		SH.addEventListener('checkedIn', id => {
			if(this.owner === id)
				this.updateOwnership({data: {game: SH.game, players: SH.players}});
		});

		this.nameplate = new Nameplate(this);
		this.nameplate.position.set(0, -0.635, 0.22);
		this.add(this.nameplate);

		this.ballot = new Ballot(this);
		this.ballot.position.set(0, -0.3, 0.25);
		//this.ballot.rotateY(0.1);
		this.add(this.ballot);

		this.playerInfo = new PlayerInfo(this);
		this.playerInfo.position.set(0, 0, 0.3);
		this.add(this.playerInfo);

		this.hitbox = new THREE.Mesh(
			Seat.Hitbox,
			new THREE.MeshBasicMaterial()
		);
		this.hitbox.position.set(0, -0.5, 0);
		this.hitbox.material.transparent = true;
		this.hitbox.material.opacity = 0;
		this.hitbox.visible = false;
		this.add(this.hitbox);

		this.hitbox.addEventListener('cursorenter', () => this.hitbox.material.opacity = 0.1);
		this.hitbox.addEventListener('cursorleave', () => this.hitbox.material.opacity = 0);
		this.hitbox.addEventListener('cursorup', () => {
			SH.dispatchEvent({
				type: 'playerSelect',
				bubbles: false,
				data: this.owner
			});
		});
	}

	updateOwnership({data: {game, players}})
	{
		let ids = game.turnOrder || [];

		// register this seat if it's newly claimed
		if( !this.owner )
		{
			// check if a player has joined at this seat
			for(let i in ids){
				if(players[ids[i]].seatNum == this.seatNum){
					this.owner = ids[i];
					this.nameplate.updateText(players[ids[i]].displayName);
				}
			}
		}

		// reset this seat if it's newly vacated
		if( !ids.includes(this.owner) )
		{
			this.owner = '';
			if(game.state === 'setup'){
				this.nameplate.updateText('<Join>');
			}
		}

		// update disconnect colors
		else if( !players[this.owner].connected ){
			this.nameplate.model.material.color.setHex(0x808080);
		}
		else if( players[this.owner].connected ){
			this.nameplate.model.material.color.setHex(0xffffff);
		}
	}

	updateState({data: {game: {state, president}, players}})
	{
		let self = this;

		function chooseChancellor(){
			return self.ballot.askQuestion('Choose your\nchancellor!', 'local_nominate', 0)
			.then(confirmChancellor);
		}

		function confirmChancellor(userId){
			let username = SH.players[userId].displayName;
			let text = `Name ${username}\nas chancellor?`;
			return self.ballot.askQuestion(text, 'local_nominate_confirm', 2)
			.then(confirmed => {
				if(confirmed){
					return Promise.resolve(userId);
				}
				else {
					return chooseChancellor();
				}
			});
		}

		if(state === 'nominate' && SH.localUser.id === president)
		{
			this.hitbox.visible = this.owner.length > 0 && this.owner !== SH.localUser.id;

			if(this.owner === SH.localUser.id)
			{
				chooseChancellor().then(userId => {
					SH.socket.emit('nominate', userId);
				});
			}
		}
	}
}

Seat.Hitbox = new CapsuleGeometry(0.3, 1.8);
