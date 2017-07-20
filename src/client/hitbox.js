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

		this.position.set(0, -0.5, 0);
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

		SH.addEventListener('update_state', lateUpdate(({data: {game}}) =>
		{
			this.visible =
				game.state === 'nominate' &&
				SH.localUser.id === game.president &&
				this.seat.owner !== '' &&
				this.seat.owner !== SH.localUser.id &&
				this.seat.owner !== game.lastChancellor &&
				(game.turnOrder.length === 5 || this.seat.owner !== game.lastPresident);
		}));
	}
}
