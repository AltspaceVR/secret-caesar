'use strict';

function parseCSV(str)
{
    if(str) return str.split(',');
    else return [];
}

exports.parseCSV = parseCSV;
