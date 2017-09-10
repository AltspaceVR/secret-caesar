import { Behavior } from './behavior';

class QuaternionTween extends TWEEN.Tween
{
	constructor(state, group){
		super({t: 0}, group);
		this.state = state;
		this.start = state.clone();
	}
	to(end, duration){
		super.to({t: 1}, duration);
		this.end = end;
	}
	start(){
		this.onUpdate(t => THREE.Quaternion.slerp(this.start, this.end, this.state, t.t));
		super.start();
	}
}

export default class Animate extends Behavior
{
	constructor(){
		super('Animate');
		this.group = new TWEEN.Group();
	}
	update(){
		this.group.update(performance.now());
	}

	/**
	 * Move an object from A to B
	 * @param {THREE.Object3D} target 
	 * @param {Object} options
	 */
	static simple(target, {parent=null, pos=null, quat=null, scale=null, matrix=null, duration=600} = {})
	{
		// extract position/rotation/scale from matrix
		if(matrix)
		{
			pos = new THREE.Vector3();
			quat = new THREE.Quaternion();
			scale = new THREE.Vector3();
			matrix.decompose(pos, quat, scale);
		}

		// shuffle hierarchy, but keep world transform the same
		if(parent && this.parent !== target.parent)
		{
			target.applyMatrix(target.parent.matrixWorld);
			target.applyMatrix(new THREE.Matrix4().getInverse(parent.matrixWorld));
			parent.add(obj);
		}

		let initialQuat = target.quaternion.clone();

		let anim = target.getBehaviorByType('Animate');
		if(!anim){
			target.addBehavior( anim = new Animate() );
		}

		function executor(resolve, reject)
		{
			let toComplete = 0;
			if(pos)
			{
				new TWEEN.Tween(target.position, anim.group)
				.to({x: pos.x, y: pos.y, z: pos.z}, duration)
				.easing(TWEEN.Easing.Quadratic.Out)
				.onComplete(groupIsDone)
				.start();
				toComplete++;
			}

			if(quat)
			{
				new QuaternionTween(target.quaternion, anim.group)
				.to(quat, duration)
				.easing(TWEEN.Easing.Quadratic.Out)
				.onComplete(groupIsDone)
				.start();
				toComplete++;
			}

			if(scale)
			{
				new TWEEN.Tween(target.scale, anim.group)
				.to({x: scale.x, y: scale.y, z: scale.z}, duration)
				.easing(TWEEN.Easing.Quadratic.Out)
				.onComplete(groupIsDone)
				.start();
				toComplete++;
			}

			function groupIsDone(){
				if(--toComplete === 0){
					resolve();
				}
			}
		}

		return new Promise(executor);
	}

	static wait(duration){
		return new Promise((resolve, reject) => {
			setTimeout(resolve, duration);
		});
	}
}