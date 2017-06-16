'use strict'

import { Behavior } from './behavior'

class Animate extends Behavior
{
  constructor (// {parent, pos, quat, scale, matrix, duration, callback}
    {parent = null, pos = null, quat = null, scale = null, matrix = null, duration = 600, callback = () => {}}) {
    super('Animate')

    if (matrix) {
// extract position/rotation/scale from matrix
      pos = new THREE.Vector3()
      quat = new THREE.Quaternion()
      scale = new THREE.Vector3()
      matrix.decompose(pos, quat, scale)
    }

    Object.assign(this, {parent, pos, quat, scale, duration, callback})
  }

  awake (obj) {
    super.awake(obj)

// shuffle hierarchy, but keep world transform the same
    if (this.parent && this.parent !== obj.parent) {
      obj.applyMatrix(obj.parent.matrixWorld)
      let mat = new THREE.Matrix4().getInverse(this.parent.matrixWorld)
      obj.applyMatrix(mat)

      this.parent.add(obj)
    }

// read initial positions
    this.initialPos = obj.position.clone()
    this.initialQuat = obj.quaternion.clone()
    this.initialScale = obj.scale.clone()
    this.startTime = Date.now()
  }

  update () {
// compute ease-out based on duration
    let mix = (Date.now() - this.startTime) / this.duration
    let ease = TWEEN ? TWEEN.Easing.Quadratic.Out : n => n * (2 - n)
    mix = mix < 1 ? ease(mix) : 1

// animate position if requested
    if (this.pos) {
      this.object3D.position.lerpVectors(this.initialPos, this.pos, mix)
    }

// animate rotation if requested
    if (this.quat) {
      THREE.Quaternion.slerp(this.initialQuat, this.quat, this.object3D.quaternion, mix)
    }

// animate scale if requested
    if (this.scale) {
      this.object3D.scale.lerpVectors(this.initialScale, this.scale, mix)
    }

// terminate animation when done
    if (mix >= 1) {
      this.object3D.removeBehavior(this)
      this.callback.call(this.object3D)
    }
  }
}

Animate.start = (target, opts) => {
  let oldAnim = target.getBehaviorByType('Animate')
  if (oldAnim) {
    oldAnim.constructor(opts)
    oldAnim.awake(target)
  } else {
    target.addBehavior(new Animate(opts))
  }
}

export default Animate
