'use strict';

import AM from './assetmanager';
import SH from './secrethitler';
import Animate from './animate';
import {LiberalPolicyCard, FascistPolicyCard, VetoCard} from './card';

let LiberalSpots = {
	positions: [
		new THREE.Vector3(0.690, 0.001, -0.42),
		new THREE.Vector3(0.345, 0.001, -0.42),
		new THREE.Vector3(0.002, 0.001, -0.42),
		new THREE.Vector3(-.340, 0.001, -0.42),
		new THREE.Vector3(-.690, 0.001, -0.42)
	],
	quaternion: new THREE.Quaternion(0, 0.7071067811865475, 0.7071067811865475, 0),
	scale: new THREE.Vector3(0.4, 0.4, 0.4)
},
FascistSpots = {
	positions: [
		new THREE.Vector3(-.860, 0.001, .425),
		new THREE.Vector3(-.515, 0.001, .425),
		new THREE.Vector3(-.170, 0.001, .425),
		new THREE.Vector3(0.170, 0.001, .425),
		new THREE.Vector3(0.518, 0.001, .425),
		new THREE.Vector3(0.870, 0.001, .425),	
	],
	quaternion: new THREE.Quaternion(-0.7071067811865475, 0, 0, 0.7071067811865475),
	scale: new THREE.Vector3(0.4, 0.4, 0.4)
};

export default class GameTable extends THREE.Object3D
{
	constructor()
	{
		super();

		// table state
		this.liberalCards = 0;
		this.fascistCards = 0;
		this.cards = [];

		this.vetoCard = new VetoCard();
		this.vetoCard.scale.setScalar(.5);
		this.vetoCard.visible = false;
		this.vetoCard.material.transparent = true;
		this.add(this.vetoCard);

		// add table asset
		this.model = AM.cache.models.table;
		this.model.scale.setScalar(1.25);
		this.add(this.model);

		// save references to the textures
		this.textures = [
			AM.cache.textures.board_small,
			AM.cache.textures.board_med,
			AM.cache.textures.board_large
		];
		this.textures.forEach(tex => tex.flipY = false);
		this.setTexture(this.textures[0], true);
		
		// position table
		this.position.set(0, 0.88, 0);

		SH.addEventListener('update_turnOrder', this.changeMode.bind(this));
		SH.addEventListener('update_liberalPolicies', this.updatePolicies.bind(this));
		SH.addEventListener('update_fascistPolicies', this.updatePolicies.bind(this));
		SH.addEventListener('update_failedVotes', this.updatePolicies.bind(this));
	}

	changeMode({data: {game: {state, turnOrder}}})
	{
		if(turnOrder.length >= 9)
			this.setTexture(this.textures[2]);
		else if(turnOrder.length >= 7)
			this.setTexture(this.textures[1]);
		else
			this.setTexture(this.textures[0]);
	}

	setTexture(newTex, switchLightmap)
	{
		this.model.traverse(o => {
			if(o instanceof THREE.Mesh)
			{
				if(switchLightmap)
					o.material.lightMap = o.material.map;

				o.material.map = newTex;
			}
		});
	}

	updatePolicies({data: {game: {liberalPolicies, fascistPolicies, hand, state}}})
	{
		let updates = [];

		// queue up cards to be added to the table this update
		for(var i=this.liberalCards; i<liberalPolicies; i++){
			let card = new LiberalPolicyCard();
			card.animate = () => Animate.simple(card, {
				pos: LiberalSpots.positions[i],
				quat: LiberalSpots.quaternion,
				scale: LiberalSpots.scale
			}).then(() => Animate.wait(500));
			card.playSound = () => SH.audio.liberalSting.play();
			updates.push(card);
		}
		
		for(var i=this.fascistCards; i<fascistPolicies; i++){
			let card = new FascistPolicyCard();
			card.animate = () => Animate.simple(card, {
				pos: FascistSpots.positions[i],
				quat: FascistSpots.quaternion,
				scale: FascistSpots.scale
			});
			card.playSound = () => SH.audio.fascistSting.play();
			updates.push(card);
		}

		if(state === 'aftermath' && hand === 1){
			updates.push(this.vetoCard);
		}

		let animation = null;
		if(updates.length === 1)
		{
			let card = updates[0];
			if(card === this.vetoCard)
			{
				card.visible = true; card.material.opacity = 1;
				animation = Animate.cardFlourish(card);
				animation.then(() => Animate.vanish(card))
				.then(() => { card.visible = false; });
			}
			else
			{
				this.add(card);
				this.cards.push(card);
				card.playSound();
				animation = Animate.cardFlourish(card)
				.then(() => card.animate());
			}
		}
		else
		{
			// place on their spots
			updates.forEach(card => {
				card.position.copy(card.destination.pos);
				card.quaternion.copy(card.destination.quat);
				card.scale.copy(card.destination.scale);
				this.add(card);
				this.cards.push(card);
			});

			animation = Promise.resolve();
		}

		if(state === 'aftermath'){
			animation.then(() => {
				SH.dispatchEvent({
					type: 'policyAnimDone',
					bubbles: false
				});
			});
		}

		if(liberalPolicies === 0 && fascistPolicies === 0){
			this.cards.forEach(c => this.remove(c));
		}

		this.liberalCards = liberalPolicies;
		this.fascistCards = fascistPolicies;
	}
};
