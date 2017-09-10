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
	CREDITS: 10,
	VETO: 11
});

let geometry = null, material = null;

function initCardData()
{
	let floatData = [
		// position (portrait)
		0.3575, 0.5, 0.0005,
		-.3575, 0.5, 0.0005,
		-.3575, -.5, 0.0005,
		0.3575, -.5, 0.0005,
		0.3575, 0.5, -.0005,
		-.3575, 0.5, -.0005,
		-.3575, -.5, -.0005,
		0.3575, -.5, -.0005,
	
		// position (landscape)
		0.5, -.3575, 0.0005,
		0.5, 0.3575, 0.0005,
		-.5, 0.3575, 0.0005,
		-.5, -.3575, 0.0005,
		0.5, -.3575, -.0005,
		0.5, 0.3575, -.0005,
		-.5, 0.3575, -.0005,
		-.5, -.3575, -.0005,
	
		// UVs
		/* -------------- card face ------------- */ /* ------------- card back --------------*/
		.754,.996, .754,.834, .997,.834, .997,.996, .754,.996, .754,.834, .997,.834, .997,.996, // liberal policy
		.754,.822, .754,.660, .996,.660, .996,.822, .754,.822, .754,.660, .996,.660, .996,.822, // fascist policy
		.746,.996, .505,.996, .505,.650, .746,.650, .021,.022, .021,.269, .375,.269, .375,.022, // liberal role
		.746,.645, .505,.645, .505,.300, .746,.300, .021,.022, .021,.269, .375,.269, .375,.022, // fascist role
		.996,.645, .754,.645, .754,.300, .996,.300, .021,.022, .021,.269, .375,.269, .375,.022, // hitler role
		.495,.996, .255,.996, .255,.650, .495,.650, .021,.022, .021,.269, .375,.269, .375,.022, // liberal party
		.495,.645, .255,.645, .255,.300, .495,.300, .021,.022, .021,.269, .375,.269, .375,.022, // fascist party
		.244,.992, .005,.992, .005,.653, .244,.653, .021,.022, .021,.269, .375,.269, .375,.022, // ja
		.243,.642, .006,.642, .006,.302, .243,.302, .021,.022, .021,.269, .375,.269, .375,.022, // nein
		.021,.022, .021,.269, .375,.269, .375,.022, .021,.022, .021,.269, .375,.269, .375,.022, // blank
		.397,.276, .397,.015, .765,.015, .765,.276, .021,.022, .021,.269, .375,.269, .375,.022, // credits
		.963,.270, .804,.270, .804,.029, .963,.029, .804,.270, .963,.270, .963,.029, .804,.029, // veto

	];
	
	let intData = [
		// triangle index
		0,1,2, 0,2,3, 4,7,5, 5,7,6
	];
	
	// two position sets, 11 UV sets, 1 index set
	let geoBuffer = new ArrayBuffer(4*floatData.length + 2*intData.length);
	let temp = new Float32Array(geoBuffer, 0, floatData.length);
	temp.set(floatData);
	temp = new Uint16Array(geoBuffer, 4*floatData.length, intData.length);
	temp.set(intData);
	
	// chop up buffer into vertex attributes
	let posLength = 8*3, uvLength = 8*2, indexLength = 12;
	let posPortrait = new THREE.BufferAttribute(new Float32Array(geoBuffer, 0, posLength), 3),
		posLandscape = new THREE.BufferAttribute(new Float32Array(geoBuffer, 4*posLength, posLength), 3);
	let uvs = [];
	for(let i=0; i<12; i++){
		uvs.push( new THREE.BufferAttribute(new Float32Array(geoBuffer, 8*posLength + 4*i*uvLength, uvLength), 2) );
	}
	let index = new THREE.BufferAttribute(new Uint16Array(geoBuffer, 4*floatData.length, indexLength), 1);
	
	geometry = Object.keys(Types).map((key, i) =>
	{
		let geo = new THREE.BufferGeometry();
		geo.addAttribute('position', i==Types.JA || i==Types.NEIN ? posLandscape : posPortrait);
		geo.addAttribute('uv', uvs[i]);
		geo.setIndex(index);
		return geo;
	});

	material = new THREE.MeshBasicMaterial({map: AssetManager.cache.textures.cards});
}


class Card extends THREE.Mesh
{
	constructor(type = Types.BLANK)
	{
		if(!geometry || !material) initCardData();

		let geo = geometry[type];
		super(geo, material);
		this.scale.setScalar(0.7);
	}
}

class BlankCard extends Card {
	constructor(){ super(); }
}

class CreditsCard extends Card {
	constructor(){
		super(Types.CREDITS);
	}
}

class LiberalPolicyCard extends Card {
	constructor(){
		super(Types.POLICY_LIBERAL, false);
	}
}

class FascistPolicyCard extends Card {
	constructor(){
		super(Types.POLICY_FASCIST);
	}
}

class VetoCard extends Card {
	constructor(){
		super(Types.VETO);
	}
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
	Card, Types, BlankCard, CreditsCard, VetoCard,
	LiberalPolicyCard, FascistPolicyCard, LiberalRoleCard, FascistRoleCard,
	HitlerRoleCard, LiberalPartyCard, FascistPartyCard, JaCard, NeinCard
};
