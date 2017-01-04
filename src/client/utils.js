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

function parseCSV(str){
	if(!str) return [];
	else return str.split(',');
}

function generateQuestion(text, texture = null)
{
	let fontStack = '"Helvetica Neue", Helvetica, Arial, Sans-Serif';

	// set up canvas
	let bmp;
	if(!texture){
		bmp = document.createElement('canvas');
		bmp.width = 512;
		bmp.height = 256;
	}
	else {
		bmp = texture.image;
	}

	let g = bmp.getContext('2d');
	g.clearRect(0, 0, 512, 256);
	g.textAlign = 'center';
	g.fillStyle = 'white';

	// write text
	g.font = 'bold 50px '+fontStack;
	let lines = text.split('\n');
	for(let i=0; i<lines.length; i++){
		g.fillText(lines[i], 256, 50+55*i);
	}

	if(texture){
		texture.needsUpdate = true;
		return texture;
	}
	else {
		return new THREE.CanvasTexture(bmp);
	}
}

function mergeObjects(a, b, depth=2)
{
	let aIsObj = a instanceof Object, bIsObj = b instanceof Object;
	if(aIsObj && bIsObj && depth > 0)
	{
		function unique(e, i, a){
			return a.indexOf(e) === i;
		}

		let result = {};
		let keys = [...Object.keys(a), ...Object.keys(b)].filter(unique);
		for(let i=0; i<keys.length; i++){
			result[keys[i]] = mergeObjects(a[keys[i]], b[keys[i]], depth-1);
		}
		return result;
	}
	else if(b !== undefined)
		return b;
	else
		return a;
}

export { getGameId, parseCSV, generateQuestion, mergeObjects };
