'use strict';

import SH from './secrethitler';

function getGameId()
{
	// first check the url
	let re = /[?&]gameId=([^&]+)/.exec(window.location.search);
	if(re){
		return re[1];
	}
	else if(altspace && altspace.inClient){
		return SH.env.sid;
	}
	else {
		let id = Math.floor( Math.random() * 100000000 );
		window.location.replace('?gameId='+id);
	}
}

export { getGameId };
