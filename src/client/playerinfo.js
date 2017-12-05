'use strict';

import SH from './secrethitler';
import {FascistRoleCard, HitlerRoleCard, LiberalRoleCard, FascistPartyCard, LiberalPartyCard, JaCard, NeinCard} from './card';
import {lateUpdate} from './utils';
import {NBillboard} from './nativecomponents';
import Animate from './animate';

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

		SH.addEventListener('update_state', lateUpdate(this.updateState.bind(this)));
		SH.addEventListener('investigate', this.presentParty.bind(this));
	}

	updateState({data: {game, players, votes}})
	{
		let localPlayer = players[SH.localUser.id] || {};
		let seatedPlayer = players[this.seat.owner] || {};
		let vote = votes[game.lastElection];

		let seatedRoleShouldBeVisible =
			game.state === 'done' ||
			game.state === 'night' && (
				localPlayer === seatedPlayer ||
				localPlayer.role === 'fascist' && (seatedPlayer.role === 'fascist' || seatedPlayer.role === 'hitler') ||
				localPlayer.role === 'hitler' && seatedPlayer.role === 'fascist' && game.turnOrder.length < 7
			);

		if(this.seat.owner && seatedRoleShouldBeVisible)
		{
			if(this.card && this.card.userData.type !== 'role'){
				this.remove(this.card);
				this.card = null;
			}

			switch(seatedPlayer.role){
				case 'fascist': this.card = new FascistRoleCard(); break;
				case 'hitler' : this.card = new HitlerRoleCard();  break;
				case 'liberal': this.card = new LiberalRoleCard(); break;
			}

			this.card.userData.type = 'role';
			this.add(this.card);
			let bb = new NBillboard(this.card);
			Animate.winkIn(this.card, 300);
		}
		else if(this.seat.owner && game.state === 'lameDuck' && !vote.nonVoters.includes(this.seat.owner))
		{
			if(this.card && this.card.userData.type !== 'vote'){
				this.remove(this.card);
				this.card = null;
			}

			let playerVote = vote.yesVoters.includes(this.seat.owner);
			this.card = playerVote ? new JaCard() : new NeinCard();

			this.card.userData.type = 'vote';
			this.add(this.card);
			let bb = new NBillboard(this.card);
			Animate.winkIn(this.card, 300);
		}
		else if(this.card !== null)
		{
			Animate.winkOut(this.card, 300).then(() => {
				this.remove(this.card);
				this.card = null;
			});
		}
	}

	presentParty({data: userId})
	{
		if(!this.seat.owner || this.seat.owner !== userId) return;

		if(this.card && this.card.userData.type !== 'party'){
			this.remove(this.card);
			this.card = null;
		}

		let role = SH.players[this.seat.owner].role;
		this.card =  role === 'liberal' ? new LiberalPartyCard() : new FascistPartyCard();

		this.card.userData.type = 'party';
		this.add(this.card);
		let bb = new NBillboard(this.card);
		Animate.winkIn(this.card, 300);
	}
};
