'use strict';

export default class Behavior
{
	constructor(type){
		this.type = type;
	}

	awake(obj){
		this.object3D = obj;
	}

	start(){ }

	update(dT){ }

	dispose(){ }
}
