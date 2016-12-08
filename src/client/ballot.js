'use strict;'

import SH from './secrethitler';
import { JaCard, NeinCard } from './card';
import {generateQuestion} from './utils';

export default class Ballot extends THREE.Object3D
{
    constructor(seat)
    {
        super();
        this.seat = seat;

        this.jaCard = new JaCard();
        this.neinCard = new NeinCard();
        [this.jaCard, this.neinCard].forEach(c => {
            c.position.set(c instanceof JaCard ? -0.1 : 0.1, -0.1, 0);
            c.rotation.set(0.5, Math.PI, 0);
            c.scale.setScalar(0.15);
            c.hide();
        });
        this.add(this.jaCard, this.neinCard);

        let geo = new THREE.PlaneBufferGeometry(0.4, 0.2);
        let mat = new THREE.MeshBasicMaterial({transparent: true});
        this.question = new THREE.Mesh(geo, mat);
        this.question.position.set(0, 0.05, 0);
        this.question.rotation.set(0, Math.PI, 0);
        this.question.visible = false;
        this.add(this.question);

        SH.addEventListener('update_votesInProgress', this.update.bind(this));
    }

    update({data: {game, players, votes}})
    {

    }

    askQuestion(qText)
    {
        let self = this;

        return new Promise((resolve, reject) =>
        {
            self.question.material.map = generateQuestion(qText, this.question.material.map);
            self.jaCard.addEventListener('cursorup', respond(true));
            self.neinCard.addEventListener('cursorup', respond(false));

            self.question.visible = true;
            self.jaCard.show();
            self.neinCard.show();

            function respond(answer){
                function handler(){
                    self.jaCard.hide();
                    self.neinCard.hide();
                    self.question.visible = false;
                    self.jaCard.removeEventListener('cursorup', handler);
                    self.neinCard.removeEventListener('cursorup', handler);
                    resolve(answer);
                }

                return handler;
            }

        });
    }
}
