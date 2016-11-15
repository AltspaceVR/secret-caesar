'use strict';

import SH from './secrethitler';
import { Player } from '../gameobjects';

export default class PlayerManager
{
	constructor()
	{
		this.localUser = null;
		this.players = [];
	}

	acquireLocalUser()
	{
		if(window.altspace && altspace.inClient)
		{
			this.localUser = {};

			// get the local user id and name
			altspace.getUser().then((user => {
				Object.assign(this.localUser, user);
			}).bind(this));

			// get the user tracking skeleton
			altspace.getThreeJSTrackingSkeleton().then((ts => {
				this.localUser.skeleton = ts;
				SH.add(ts);
			}).bind(this));
		}
		else
		{
			// fake user data
			this.localUser = {
				userId: Math.floor(Math.random() * 1000000),
				isModerator: false
			};
			this.localUser.displayName = 'Web User '+this.localUser.userId;
		}
	}
}
