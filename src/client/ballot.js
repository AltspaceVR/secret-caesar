'use strict;'

import SH from './secrethitler';
import { JaCard, NeinCard } from './card';
import { generateQuestion } from './utils';
import CascadingPromise from './cascadingpromise';

export default class Ballot extends THREE.Object3D
{
    constructor(seat)
    {
        super();
        this.seat = seat;
        this.questions = {};
        this.lastAsked = null;

        this._yesClickHandler = null;
        this._noClickHandler = null;

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
        let self = this;
        if(!self.seat.owner) return;

        let vips = game.votesInProgress;
        let votesFinished = (SH.game.votesInProgress || []).filter(
            e => !vips.includes(e)
        );

        vips.forEach(vId =>
        {
            let vs = [...votes[vId].yesVoters, ...votes[vId].noVoters];
            let nv = votes[vId].nonVoters;

            let asked = self.questions[vId];
            if(!asked && !nv.includes(self.seat.owner) && !vs.includes(self.seat.owner))
            {
                let questionText, isConfirm = false;
                if(votes[vId].type === 'elect'){
                    questionText = players[votes[vId].target1].displayName
                        + '\nfor president and\n'
                        + players[votes[vId].target2].displayName
                        + '\nfor chancellor?';
                }
                else if(votes[vId].type === 'join'){
                    questionText = votes[vId].data + '\nto join?';
                }
                else if(votes[vId].type === 'kick'){
                    questionText = 'Vote to kick\n'
                        + players[votes[vId].target1].displayName
                        + '?';
                }
                else if(votes[vId].type === 'confirmRole' && self.seat.owner === SH.localUser.id)
                {
                    isConfirm = true;
                    let role = players[SH.localUser.id].role;
                    role = role.charAt(0).toUpperCase() + role.slice(1);
                    questionText = 'Your role:\n' + role;
                }

                if(questionText)
                {
                    self.askQuestion(questionText, vId, isConfirm)
                    .then(answer => {
                        SH.socket.emit('vote', vId, SH.localUser.id, answer);
                    })
                    .catch(() => console.log('Vote scrubbed:', vId));
                }

            }
            else if(vs.includes(self.seat.owner))
            {
                if(self.questions[vId])
                    self.questions[vId].cancel();
            }
        });

        votesFinished.forEach((vId) => {
            if(self.questions[vId])
                self.questions[vId].cancel();
        });
    }

    askQuestion(qText, id, isConfirm)
    {
        let self = this;
        let newQ = new CascadingPromise(self.questions[self.lastAsked],
            (resolve, reject) => {

                // make sure the answer is still relevant
                let latestVotes = SH.game.votesInProgress;
                if(!/^local/.test(id) && !latestVotes.includes(id)){
                    reject();
                    return;
                }

                // hook up q/a cards
                self.question.material.map = generateQuestion(qText, this.question.material.map);
                self.jaCard.addEventListener('cursorup', respond(true));
                self.neinCard.addEventListener('cursorup', respond(false));

                // show the ballot
                self.question.visible = true;
                self.jaCard.show();
                if(!isConfirm)
                    self.neinCard.show();

                function respond(answer){
                    function handler()
                    {
                        // make sure only the owner of the ballot is answering
                        if(self.seat.owner !== SH.localUser.id) return;

                        // make sure the answer still matters
                        let latestVotes = SH.game.votesInProgress;
                        if(!/^local/.test(id) && !latestVotes.includes(id))
                            reject();
                        else
                            resolve(answer);
                    }

                    if(answer) self._yesClickHandler = handler;
                    else self._noClickHandler = handler;
                    return handler;
                }
            },
            (done) => {
                delete self.questions[id];
                if(self.lastAsked === id)
                    self.lastAsked = null;

                // hide the question
                self.jaCard.hide();
                self.neinCard.hide();
                self.question.visible = false;
                self.jaCard.removeEventListener('cursorup', self._yesClickHandler);
                self.neinCard.removeEventListener('cursorup', self._noClickHandler);
                done();
            }
        );

        // add question to queue, remove when done
        self.questions[id] = newQ;
        self.lastAsked = id;
        let splice = () => {
            delete self.questions[id];
            if(self.lastAsked === id)
                self.lastAsked = null;
        };
        newQ.then(splice, splice);

        return newQ;
    }

    presentRole(playerData)
    {

    }
}
