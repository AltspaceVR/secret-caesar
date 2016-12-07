'use strict;'

import SH from './secrethitler';
import { JaCard, NeinCard } from './card';

export default class Ballot extends THREE.Object3D
{
    constructor(seat)
    {
        super();
        this.seat = seat;

        this.jaCard = new JaCard();
        this.neinCard = new NeinCard();

        this.jaCard.position.set(-0.1, -0.15, 0);
        this.neinCard.position.set(0.1, -0.15, 0);
        this.jaCard.scale.setScalar(0.13);
        this.neinCard.scale.setScalar(0.13);
        this.add(this.jaCard, this.neinCard);

        SH.addEventListener('update_votesInProgress', this.update.bind(this));
    }

    update({data: {game, players, votes}})
    {

    }
}
