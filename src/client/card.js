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

function dimsToUV({side, left, right, top, bottom})
{
	if(side)
		return [[
			new THREE.Vector2(top, left),
			new THREE.Vector2(bottom, left),
			new THREE.Vector2(top, right)
		],[
			new THREE.Vector2(bottom, left),
			new THREE.Vector2(bottom, right),
			new THREE.Vector2(top, right)
		]];
	else
		return [[
			new THREE.Vector2(left, top),
			new THREE.Vector2(left, bottom),
			new THREE.Vector2(right, top)
		],[
			new THREE.Vector2(left, bottom),
			new THREE.Vector2(right, bottom),
			new THREE.Vector2(right, top)
		]];
}

function getUVs(type)
{
	let dims = {left: 0, right: 1, bottom: 0, top: 1};

	switch(type)
	{
	case Types.POLICY_LIBERAL:
		dims = {side: true, left: 0.834, right: 0.996, top: 0.754, bottom: 0.997};
		break;
	case Types.POLICY_FASCIST:
		dims = {side: true, left: 0.66, right: 0.822, top: 0.754, bottom: 0.996};
		break;
	case Types.ROLE_LIBERAL:
		dims = {left: 0.505, right: 0.746, top: 0.996, bottom: 0.65};
		break;
	case Types.ROLE_FASCIST:
		dims = {left: 0.505, right: 0.746, top: 0.645, bottom: 0.3};
		break;
	case Types.ROLE_HITLER:
		dims = {left: 0.754, right: 0.996, top: 0.645, bottom: 0.3};
		break;
	case Types.PARTY_LIBERAL:
		dims = {left: 0.255, right: 0.495, top: 0.996, bottom: 0.65};
		break;
	case Types.PARTY_FASCIST:
		dims = {left: 0.255, right: 0.495, top: 0.645, bottom: 0.3};
		break;
	case Types.JA:
		dims = {left: 0.005, right: 0.244, top: 0.992, bottom: 0.653};
		break;
	case Types.NEIN:
		dims = {left: 0.006, right: 0.243, top: 0.642, bottom: 0.302};
		break;
	case Types.CREDITS:
		dims = {side: true, left: 0.015, right: 0.276, top: 0.397, bottom: 0.765};
		break;
	case Types.BLANK:
	default:
		dims = {side: true, left: 0.022, right: .022+0.247, top: 0.021, bottom: .021+0.3543};
		break;
	}

	return dimsToUV(dims);
}


class Card extends THREE.Object3D
{
	constructor(type = Types.BLANK, doubleSided = true, secret = false)
	{
		super();

		// create the card faces
		let front = new THREE.Mesh(
			new THREE.PlaneGeometry(.3575, .5),
			new THREE.MeshBasicMaterial({map: AssetManager.cache.textures.cards})
		);
		let back = new THREE.Mesh(
			new THREE.PlaneGeometry(.3575, .5),
			new THREE.MeshBasicMaterial({map: AssetManager.cache.textures.cards})
		);
		back.position.set(0.005, 0, 0);
		back.rotateY(Math.PI);

		// set the faces to the correct part of the texture
		front.geometry.faceVertexUvs = [getUVs(type)];
		back.geometry.faceVertexUvs = [getUVs( doubleSided ? type : Types.BLANK )];

		window.test = front;

		this.add(front, back);
	}

}

class BlankCard extends Card {
	constructor(){ super(); }
}

class CreditsCard extends Card {
	constructor(){
		super(Types.CREDITS);
		let self = this;

		function setVisibility(){
			if(SH.game.state === 'setup')
				self.children.forEach(o => { o.visible = true; });
			else
				self.children.forEach(o => { o.visible = false; });
		}

		SH.addEventListener('init', setVisibility);
		SH.addEventListener('setup', setVisibility);
		SH.addEventListener('setup_end', setVisibility);
	}
}

class LiberalPolicyCard extends Card {
	constructor(secret = false){
		super(Types.POLICY_LIBERAL, false, secret);
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
	constructor(secret = false){
		super(Types.POLICY_FASCIST, false, secret);
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
	constructor(secret = false){
		super(Types.ROLE_LIBERAL, false, secret);
	}
}

class FascistRoleCard extends Card {
	constructor(secret = false){
		super(Types.ROLE_FASCIST, false, secret);
	}
}

class HitlerRoleCard extends Card {
	constructor(secret = false){
		super(Types.ROLE_HITLER, false, secret);
	}
}

class LiberalPartyCard extends Card {
	constructor(secret = false){
		super(Types.PARTY_LIBERAL, false, secret);
	}
}

class FascistPartyCard extends Card {
	constructor(secret = false){
		super(Types.PARTY_FASCIST, false, secret);
	}
}

class JaCard extends Card {
	constructor(){
		super(Types.JA, false, false);
		this.children[0].rotateZ(-Math.PI/2);
		this.children[1].rotateZ(-Math.PI/2);
	}
}

class NeinCard extends Card {
	constructor(){
		super(Types.NEIN, false, false);
		this.children[0].rotateZ(-Math.PI/2);
		this.children[1].rotateZ(-Math.PI/2);
	}
}


export {
	Card, Types, BlankCard, CreditsCard,
	LiberalPolicyCard, FascistPolicyCard, LiberalRoleCard, FascistRoleCard,
	HitlerRoleCard, LiberalPartyCard, FascistPartyCard, JaCard, NeinCard
};
