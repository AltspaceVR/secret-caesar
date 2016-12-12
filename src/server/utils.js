'use strict';

function parseCSV(str)
{
    if(str) return str.split(',');
    else return [];
}

function generateId()
{
    return Math.floor( Math.random() * 100000000 );
}

exports.parseCSV = parseCSV;
exports.generateId = generateId;
