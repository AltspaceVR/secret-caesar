'use strict;'

import SH from './secrethitler';
import { JaCard, NeinCard } from './card';

export default class Ballot extends THREE.Object3D
{
    constructor(seatNum)
    {
        super();
        this.seatNum = seatNum;

        SH.addEventListener('update_votesInProgress', this.update.bind(this));
    }

    update({data: {game, players, votes}})
    {

    }
}
