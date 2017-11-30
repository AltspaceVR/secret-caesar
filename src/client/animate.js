import { Behavior } from './behavior';

class QuaternionTween extends TWEEN.Tween
{
	constructor(state, group){
		super({t: 0}, group);
		this._state = state;
		this._start = state.clone();
	}
	to(end, duration){
		super.to({t: 1}, duration);
		this._end = end instanceof THREE.Quaternion ? [end] : end;
		return this;
	}
	start(){
		this.onUpdate(({t: progress}) => {
			progress = progress * this._end.length;
			let nextPoint = Math.ceil(progress);
			let localProgress = progress - nextPoint + 1;
			let points = [this._start, ...this._end];
			THREE.Quaternion.slerp(points[nextPoint-1], points[nextPoint], this._state, localProgress);
		});
		return super.start();
	}
}

function WaitForAnims(tweens)
{
	return new Promise((resolve, reject) =>
	{
		let activeCount = tweens.length;
		function checkDone(){
			if(--activeCount === 0) resolve();
		}

		tweens.forEach(t => t.onComplete(checkDone));
		tweens.forEach(t => t.start());
	});
}

const spinPoints = [
	new THREE.Quaternion(0, Math.sqrt(2)/2, 0, Math.sqrt(2)/2),
	new THREE.Quaternion(0, 1, 0, 0),
	new THREE.Quaternion(0, Math.sqrt(2)/2, 0, -Math.sqrt(2)/2),
	new THREE.Quaternion(0, 0, 0, 1)
];

export default class Animate
{
	/**
	 * Move an object from A to B
	 * @param {THREE.Object3D} target 
	 * @param {Object} options
	 */
	static simple(target, {parent=null, pos=null, quat=null, scale=null, matrix=null, duration=600} = {})
	{
		// extract position/rotation/scale from matrix
		if(matrix){
			pos = new THREE.Vector3();
			quat = new THREE.Quaternion();
			scale = new THREE.Vector3();
			matrix.decompose(pos, quat, scale);
		}

		// shuffle hierarchy, but keep world transform the same
		if(parent && this.parent !== target.parent){
			target.applyMatrix(target.parent.matrixWorld);
			target.applyMatrix(new THREE.Matrix4().getInverse(parent.matrixWorld));
			parent.add(obj);
		}

		let anims = [];

		if(pos){
			anims.push(new TWEEN.Tween(target.position)
				.to({x: pos.x, y: pos.y, z: pos.z}, duration)
				.easing(TWEEN.Easing.Quadratic.Out)
			);
		}

		if(quat){
			anims.push(new QuaternionTween(target.quaternion)
				.to(quat, duration)
				.easing(TWEEN.Easing.Quadratic.Out)
			);
		}

		if(scale){
			anims.push(new TWEEN.Tween(target.scale)
				.to({x: scale.x, y: scale.y, z: scale.z}, duration)
				.easing(TWEEN.Easing.Quadratic.Out)
			);
		}

		return WaitForAnims(anims);
	}

	static wait(duration){
		return new Promise((resolve, reject) => {
			setTimeout(resolve, duration);
		});
	}

	/**
	 * Make the card appear with a flourish
	 * @param {THREE.Object3D} card 
	 */
	static cardFlourish(card)
	{
		card.position.set(0, 0, 0);
		card.quaternion.set(0,0,0,1);
		card.scale.setScalar(.001);

		let anims = [];

		// add position animation
		anims.push(new TWEEN.Tween(card.position)
			.to({x: 0, y: .7, z: 0}, 1500)
			.easing(TWEEN.Easing.Elastic.Out)
		);

		// add spin animation
		anims.push(new QuaternionTween(card.quaternion)
			.to(spinPoints, 2500)
			.easing(TWEEN.Easing.Quadratic.Out)
		);

		// add scale animation
		anims.push(new TWEEN.Tween(card.scale)
			.to({x: .5, y: .5, z: .5}, 200)
		);

		return WaitForAnims(anims);
	}

	static vanish(card)
	{
		let anims = [];

		// add move animation
		anims.push(new TWEEN.Tween(card.position)
			.to({y: '+0.5'}, 1000)
		);

		// add disappear animation
		anims.push(new TWEEN.Tween(card.material)
			.to({opacity: 0}, 1000)
		);

		return WaitForAnims(anims);
	}

	static bob(obj, amplitude = .08, period = 4000)
	{
		return new TWEEN.Tween(obj.position)
			.to({y: obj.position.y-amplitude}, period)
			.easing(TWEEN.Easing.Sinusoidal.InOut)
			.repeat(Infinity)
			.yoyo(true)
			.start();
	}

	static spin(obj, period = 10000)
	{
		return new QuaternionTween(obj.quaternion)
			.to(spinPoints, period)
			.repeat(Infinity)
			.start();
	}

	static winkIn(obj, duration = 200)
	{
		if(!obj.userData.scaleOrig)
			obj.userData.scaleOrig = obj.scale.clone();

		let anims = [];

		obj.scale.setScalar(.001);
		obj.visible = true;

		anims.push(new TWEEN.Tween(obj.scale)
			.to({y: obj.userData.scaleOrig.y}, duration)
			.easing(TWEEN.Easing.Cubic.In)
		);

		anims.push(new TWEEN.Tween(obj.scale)
			.to({x: obj.userData.scaleOrig.x, z: obj.userData.scaleOrig.z}, .2*duration)
			.easing(TWEEN.Easing.Cubic.In)
		);

		return WaitForAnims(anims);
	}

	static winkOut(obj, duration = 200)
	{
		if(!obj.userData.scaleOrig)
			obj.userData.scaleOrig = obj.scale.clone();

		let anims = [];

		anims.push(new TWEEN.Tween(obj.scale)
			.to({y: .001}, duration)
			.easing(TWEEN.Easing.Cubic.Out)
		);

		anims.push(new TWEEN.Tween(obj.scale)
			.to({x: .001, z: .001}, .2*duration)
			.delay(.8*duration)
			.easing(TWEEN.Easing.Cubic.Out)
		);

		return WaitForAnims(anims).then(() => obj.visible = false);
	}

	static swingOut(obj, rotation, radius, duration = 300)
	{
		let start = obj.rotation.x;
		let anim = new TWEEN.Tween({t:0})
			.to({t: 1}, duration)
			.easing(TWEEN.Easing.Quadratic.In)
			.onUpdate(({t}) => {
				obj.translateY(-radius);
				obj.rotation.x = start + t*rotation;
				obj.translateY(radius);
			});

		return WaitForAnims([anim]);
	}
}
