'use strict';

import AssetManager from './assetmanager';
import Animate from './animate';
import SH from './secrethitler';

// enum constants
let Types = Object.freeze({
	POLICY_LIBERAL: 0,
	POLICY_FASCIST: 1,
	ROLE_LIBERAL: 2,
	ROLE_FASCIST: 3,
	ROLE_HITLER: 4,
	PARTY_LIBERAL: 5,
	PARTY_FASCIST: 6,
	JA: 7,
	NEIN: 8,
	BLANK: 9,
	CREDITS: 10
});

let temp = new Float32Array([
	0.3575, 0.5, 0.0005,
	-.3575, 0.5, 0.0005,
	-.3575, -.5, 0.0005,
	0.3575, -.5, 0.0005,
	0.3575, 0.5, -.0005,
	-.3575, 0.5, -.0005,
	-.3575, -.5, -.0005,
	0.3575, -.5, -.0005
]);
let cardPosPortrait = new THREE.BufferAttribute(temp, 3);

temp = new Float32Array([
	0.5, -.3575, 0.0005,
	0.5, 0.3575, 0.0005,
	-.5, 0.3575, 0.0005,
	-.5, -.3575, 0.0005,
	0.5, -.3575, -.0005,
	0.5, 0.3575, -.0005,
	-.5, 0.3575, -.0005,
	-.5, -.3575, -.0005
]);
let cardPosLandscape = new THREE.BufferAttribute(temp, 3);

let cardIndex = new THREE.BufferAttribute(new Uint16Array([0,1,2, 0,2,3, 4,7,5, 5,7,6]), 1);
let cardUVs = {
	[Types.POLICY_LIBERAL]: [.754,.996, .754,.834, .997,.834, .997,.996],
	[Types.POLICY_FASCIST]: [.754,.822, .754,.660, .996,.660, .996,.822],
	[Types.ROLE_LIBERAL]:   [.746,.996, .505,.996, .505,.650, .746,.650],
	[Types.ROLE_FASCIST]:   [.746,.645, .505,.645, .505,.300, .746,.300],
	[Types.ROLE_HITLER]:    [.996,.645, .754,.645, .754,.300, .996,.300],
	[Types.PARTY_LIBERAL]:  [.495,.996, .255,.996, .255,.650, .495,.650],
	[Types.PARTY_FASCIST]:  [.495,.645, .255,.645, .255,.300, .495,.300],
	[Types.JA]:             [.244,.992, .005,.992, .005,.653, .244,.653],
	[Types.NEIN]:           [.243,.642, .006,.642, .006,.302, .243,.302],
	[Types.BLANK]:          [.021,.022, .021,.269, .375,.269, .375,.022],
	[Types.CREDITS]:        [.397,.276, .397,.015, .765,.015, .765,.276]
};

let cardMat = new THREE.MeshBasicMaterial();

class Card extends THREE.Mesh
{
	constructor(type = Types.BLANK)
	{
		let geo = new THREE.BufferGeometry();
		if(type === Types.JA || type === Types.NEIN)
			geo.addAttribute('position', cardPosLandscape);
		else
			geo.addAttribute('position', cardPosPortrait);
		
		let uvs = new THREE.BufferAttribute(
			new Float32Array(cardUVs[type].concat(cardUVs[Types.BLANK])),
			2);
		geo.addAttribute('uv', uvs);
		geo.setIndex(cardIndex);

		cardMat.map = AssetManager.cache.textures.cards;
		super(geo, cardMat);
		this.scale.setScalar(0.7);
	}
}

class BlankCard extends Card {
	constructor(){ super(); }
}

class CreditsCard extends Card {
	constructor(){
		super(Types.CREDITS);
		SH.addEventListener('update_state', e => this.visible = e.data.game.state === 'setup');
	}
}

class LiberalPolicyCard extends Card {
	constructor(){
		super(Types.POLICY_LIBERAL, false);
	}
	goToPosition(spot = 0)
	{
		spot = Math.max(0, Math.min(4, spot));
		let s = LiberalPolicyCard.spots;
		Animate.start(this, {parent: AssetManager.root, pos: s['pos_'+spot], quat: s.quat, scale: s.scale});
	}
}

LiberalPolicyCard.spots = {
	pos_0: new THREE.Vector3(0.533, 0.76, -0.336),
	pos_1: new THREE.Vector3(0.263, 0.76, -0.336),
	pos_2: new THREE.Vector3(-.007, 0.76, -0.336),
	pos_3: new THREE.Vector3(-.279, 0.76, -0.336),
	pos_4: new THREE.Vector3(-.552, 0.76, -0.336),
	quat: new THREE.Quaternion(0, 0.7071067811865475, 0.7071067811865475, 0),
	scale: new THREE.Vector3(0.7, 0.7, 0.7)
}

class FascistPolicyCard extends Card {
	constructor(){
		super(Types.POLICY_FASCIST, false);
	}
	goToPosition(spot = 0)
	{
		spot = Math.max(0, Math.min(5, spot));
		let s = FascistPolicyCard.spots;
		Animate.start(this, {parent: AssetManager.root, pos: s['pos_'+spot], quat: s.quat, scale: s.scale});
	}
}

FascistPolicyCard.spots = {
	pos_0: new THREE.Vector3(-.687, 0.76, 0.341),
	pos_1: new THREE.Vector3(-.417, 0.76, 0.341),
	pos_2: new THREE.Vector3(-.146, 0.76, 0.341),
	pos_3: new THREE.Vector3(0.127, 0.76, 0.341),
	pos_4: new THREE.Vector3(0.400, 0.76, 0.341),
	pos_5: new THREE.Vector3(0.673, 0.76, 0.341),
	quat: new THREE.Quaternion(-0.7071067811865475, 0, 0, 0.7071067811865475),
	scale: new THREE.Vector3(0.7, 0.7, 0.7)
}

class LiberalRoleCard extends Card {
	constructor(){
		super(Types.ROLE_LIBERAL);
	}
}

class FascistRoleCard extends Card {
	constructor(){
		super(Types.ROLE_FASCIST);
	}
}

class HitlerRoleCard extends Card {
	constructor(){
		super(Types.ROLE_HITLER);
	}
}

class LiberalPartyCard extends Card {
	constructor(){
		super(Types.PARTY_LIBERAL);
	}
}

class FascistPartyCard extends Card {
	constructor(){
		super(Types.PARTY_FASCIST);
	}
}

class JaCard extends Card {
	constructor(){
		super(Types.JA);
	}
}

class NeinCard extends Card {
	constructor(){
		super(Types.NEIN);
	}
}


export {
	Card, Types, BlankCard, CreditsCard,
	LiberalPolicyCard, FascistPolicyCard, LiberalRoleCard, FascistRoleCard,
	HitlerRoleCard, LiberalPartyCard, FascistPartyCard, JaCard, NeinCard
};
