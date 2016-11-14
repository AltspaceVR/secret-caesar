'use strict';

import SH from './secrethitler';
import PM from './playermanager';

class Behavior
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

class BSync extends Behavior
{
	constructor(eventName)
	{
		super('BSync');
		this._s = SH.socket;

		// listen for update events
		this.hook = this._s.on(eventName, this.updateFromServer.bind(this));
		this.owner = '';
	}

	updateFromServer(data)
	{
		this.object3D.position.fromArray(data, 0);
		this.object3D.quaternion.fromArray(data, 3);
	}

	takeOwnership()
	{
		if(PM.localUser && PM.localUser.userId)
			this.owner = PM.localUser.userId;
	}

	update(dT)
	{
		
	}

}

export { Behavior, BSync };
