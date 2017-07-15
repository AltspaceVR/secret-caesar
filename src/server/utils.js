'use strict';

function parseCSV(str)
{
    if(str)
        return str.split(',');
    else
        return [];
}

function generateId()
{
    return Math.floor( Math.random() * 100000000 ).toString();
}

function shuffleInPlace(array)
{
    let max = array.length;
    for(let i=0; i<max-1; i++){
        let r = Math.floor(Math.random() * (max-i-1) + i+1);
        [array[i], array[r]] = [array[r], array[i]];
    }
    return array;
}

function log(game, message)
{
    let d = new Date();
    console.log(`${d.toISOString()} [${game.get('id')}] ${message}`);
}

exports.parseCSV = parseCSV;
exports.generateId = generateId;
exports.shuffleInPlace = shuffleInPlace;
exports.log = log;
