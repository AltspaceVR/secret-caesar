'use strict';

import SH from './secrethitler';
import {FascistRoleCard, HitlerRoleCard, LiberalRoleCard, FascistPartyCard, LiberalPartyCard, JaCard, NeinCard} from './card';
import {lateUpdate} from './utils';
import {NBillboard} from './nativecomponents';

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
		if(this.card !== null)
		{
			this.remove(this.card);
			this.card = null;
		}

		if(this.seat.owner)
		{
			this.presentRole(game, players, votes);
			this.presentVote(game, players, votes);
		}
	}

	presentRole(game, players)
	{
		let localPlayer = players[SH.localUser.id];
		let seatedPlayer = players[this.seat.owner];

		let seatedRoleShouldBeVisible =
			game.state === 'done' ||
			SH.localUser.id === this.seat.owner ||
			localPlayer && localPlayer.role === 'fascist' && (seatedPlayer.role === 'fascist' || seatedPlayer.role === 'hitler') ||
			localPlayer && localPlayer.role === 'hitler' && seatedPlayer.role === 'fascist' && game.turnOrder.length < 7;

		if(seatedRoleShouldBeVisible)
		{
			switch(seatedPlayer.role){
				case 'fascist': this.card = new FascistRoleCard(); break;
				case 'hitler' : this.card = new HitlerRoleCard();  break;
				case 'liberal': this.card = new LiberalRoleCard(); break;
			}

			this.add(this.card);
			let bb = new NBillboard(this.card);
		}
	}

	presentVote(game, _, votes)
	{
		let vote = votes[game.lastElection];

		if(game.state === 'lameDuck' && !vote.nonVoters.includes(this.seat.owner))
		{
			let playerVote = vote.yesVoters.includes(this.seat.owner);
			this.card = playerVote ? new JaCard() : new NeinCard();

			this.add(this.card);
			let bb = new NBillboard(this.card);
		}
	}

	presentParty({data: userId})
	{
		if(!this.seat.owner || this.seat.owner !== userId) return;

		let role = SH.players[this.seat.owner].role;
		this.card =  role === 'liberal' ? new LiberalPartyCard() : new FascistPartyCard();

		this.add(this.card);
		let bb = new NBillboard(this.card);
	}
};
