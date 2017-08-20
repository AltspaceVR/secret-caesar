'use strict';

const BPBA = require('../src/server/bpba.js');

let hand, val, test1 = 0x203f;
console.log(test1.toString(16), 'of length', BPBA.length(test1));

test1 = BPBA.shuffle(test1);
console.log('after shuffle:', test1.toString(16));

[test1, hand] = BPBA.drawThree(test1);
console.log('top three:', hand.toString(16), 'rest of deck:', test1.toString(16));

[hand, val] = BPBA.discardOne(hand, 1);
console.log('second value:', val, 'rest of hand:', hand);