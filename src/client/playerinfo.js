'use strict';

import SH from './secrethitler';
import {FascistRoleCard, HitlerRoleCard, LiberalRoleCard, FascistPartyCard, LiberalPartyCard} from './card';
import {lateUpdate} from './utils';

export default class PlayerInfo extends THREE.Object3D
{
	constructor(seat)
	{
		super();
		this.seat = seat;
		this.card = null;
		this.position.set(0, 0, 0.3);
		this.scale.setScalar(0.3);
		seat.add(this);

		SH.addEventListener('update_state', lateUpdate(this.updateRole.bind(this)));
	}

	updateRole({data: {game, players, votes}})
	{
		let localPlayer = players[SH.localUser.id];
		let seatedPlayer = players[this.seat.owner];

		if(!this.seat.owner || !localPlayer)
			return;

		let seatedRoleShouldBeVisible =
			SH.localUser.id === this.seat.owner ||
			localPlayer.role === 'fascist' && (seatedPlayer.role === 'fascist' || seatedPlayer.role === 'hitler') ||
			localPlayer.role === 'hitler' && seatedPlayer.role === 'fascist' && game.turnOrder.length < 9;

		if(game.state === 'night' && this.card === null && seatedRoleShouldBeVisible)
		{
			switch(seatedPlayer.role){
				case 'fascist': this.card = new FascistRoleCard(); break;
				case 'hitler' : this.card = new HitlerRoleCard();  break;
				case 'liberal': this.card = new LiberalRoleCard(); break;
			}

			let playerPos = this.worldToLocal(SH.seats[localPlayer.seatNum].getWorldPosition());
			this.lookAt(playerPos);
			this.add(this.card);
		}
		else if(game.state !== 'night' && this.card !== null)
		{
			this.remove(this.card);
			this.card = null;
		}
	}
};
