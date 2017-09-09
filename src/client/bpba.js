'use strict';

/*
* Decks have 17 cards: 6 liberal, 11 fascist.
* In bit-packed boolean arrays, 1 is liberal, 0 is fascist.
* The most significant bit is always 1.
* E.g. 0b101001 represents a deck with 2 liberal and 3 fascist cards
*/

let FULL_DECK = 0x2003f,
	FASCIST = 0,
	LIBERAL = 1;

let positions = [
	0x1, 0x2, 0x4, 0x8,
	0x10, 0x20, 0x40, 0x80,
	0x100, 0x200, 0x400, 0x800,
	0x1000, 0x2000, 0x4000, 0x8000,
	0x10000, 0x20000, 0x40000
];

function length(deck)
{
	return positions.findIndex(s => s > deck) -1;
}

function shuffle(deck)
{
	let l = length(deck);
	for(let i=l-1; i>0; i--)
	{
		let o = Math.floor(Math.random() * i);
		let iVal = deck & 1 << i, oVal = deck & 1 << o;
		let swapped = iVal >>> i-o | oVal << i-o;
		deck = deck - iVal - oVal + swapped;
	}

	return deck;
}

function drawThree(d)
{
	return d < 8 ? [1, d] : [d >>> 3, 8 | d & 7];
}

function discardOne(deck, pos)
{
	let bottomHalf = deck & (1 << pos)-1;
	let topHalf = deck & ~((1 << pos+1)-1);
	topHalf >>>= 1;
	let newDeck = topHalf | bottomHalf;
	
	let val = (deck & 1<<pos) >>> pos;

	return [newDeck, val];
}

function append(deck, val)
{
	return deck << 1 | val;
}

function toArray(deck)
{
	let arr = [];
	while(deck > 1){
		arr.push(deck & 1);
		deck >>>= 1;
	}

	return arr;
}

export {length, shuffle, drawThree, discardOne, append, toArray, FULL_DECK, LIBERAL, FASCIST};