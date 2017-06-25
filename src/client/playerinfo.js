'use strict';

import SH from './secrethitler';
import * as Cards from './card';

export default class PlayerInfo extends THREE.Object3D
{
    constructor(seat)
    {
        super();
        this.seat = seat;

        this.scale.setScalar(0.25);

        let card = new Cards.LiberalRoleCard();
        card.scale.setScalar(0.3);
        card.rotateY(Math.PI);
        this.add(card);
    }
};
