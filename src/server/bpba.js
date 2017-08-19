'use strict';

/*
* Decks have 17 cards: 6 liberal, 11 fascist.
* In bit-packed boolean arrays, 1 is liberal, 0 is fascist.
* The most significant bit is always 1.
* E.g. 0b101001 represents a deck with 2 liberal and 3 fascist cards
*/


/*function generate()
{
	let positions = [
		0x1, 0x10, 0x100, 0x1000,
		0x2, 0x20, 0x200, 0x2000,
		0x4, 0x40, 0x400, 0x4000,
		0x8, 0x80, 0x800, 0x8000
	];
	let deck = 0x10000;

	for(let i=0; i<6; i++){
		let position = Math.floor(Math.random() * positions.length);
		deck |= positions.splice(position, 1)[0];
	}

	return deck;
}*/

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
		let iVal = deck & 1 << i;
		let oVal = deck & 1 << o;
		let swapped = iVal >>> i-o & oVal << i-o;
		deck = deck - iVal - oVal + swapped;
	}

	return deck;
}

/**
 * Draws a new hand of three cards from the deck
 * @param {int} d - The deck
 * @returns {[int, int]} The new deck and the drawn hand
 */
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

module.exports = {length, shuffle, drawThree, discardOne, FULL_DECK: 0x2003f};