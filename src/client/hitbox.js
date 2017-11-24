'use strict';

import SH from './secrethitler';
import CapsuleGeometry from './capsulegeometry';
import {lateUpdate} from './utils';

let hitboxGeo = new CapsuleGeometry(0.3, 1.8);

export default class Hitbox extends THREE.Mesh
{
	constructor(seat)
	{
		super(hitboxGeo, new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: 0,
			side: THREE.BackSide
		}));

		this.position.set(0, -0.7, -.2);
		this.visible = false;
		this.seat = seat;
		seat.add(this);

		this.addEventListener('cursorenter', () => this.material.opacity = 0.1);
		this.addEventListener('cursorleave', () => this.material.opacity = 0);
		this.addEventListener('cursorup', () => {
			SH.dispatchEvent({
				type: 'playerSelect',
				bubbles: false,
				data: this.seat.owner
			});
		});

		SH.addEventListener('update_state', lateUpdate(this.updateVisibility.bind(this)));
	}

	updateVisibility({data: {game, players}})
	{
		let livingPlayers = game.turnOrder.filter(p => players[p].state !== 'dead');
		let preconditions =
			SH.localUser.id === game.president &&
			this.seat.owner !== '' &&
			this.seat.owner !== SH.localUser.id &&
			livingPlayers.includes(this.seat.owner);

		let nominateable =
			game.state === 'nominate' &&
			this.seat.owner !== game.lastChancellor &&
			(livingPlayers.length <= 5 || this.seat.owner !== game.lastPresident);

		let investigateable =
			game.state === 'investigate' &&
			players[this.seat.owner] && players[this.seat.owner].state === 'normal';

		let succeedable = game.state === 'nameSuccessor';
		let executable = game.state === 'execute';

		this.visible = preconditions && (nominateable || investigateable || succeedable || executable);
	}
}
