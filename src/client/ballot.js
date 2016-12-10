'use strict;'

import SH from './secrethitler';
import { JaCard, NeinCard } from './card';
import { generateQuestion, parseCSV } from './utils';

export default class Ballot extends THREE.Object3D
{
    constructor(seat)
    {
        super();
        this.seat = seat;
        this.questions = [];

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

        let vips = parseCSV(game.votesInProgress);
        vips.forEach(vId =>
        {
            let asked = !!self.questions.find(e => e.voteId == vId);
            if(!asked)
            {
                let questionText;
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
                    questionText = 'Kick\n'
                        + players[votes[vId].target1].displayName
                        + '?';
                }

                self.askQuestion(questionText, vId)
                .then(answer => {
                    SH.socket.emit('vote', vId, SH.localUser.id, answer);
                })
                .catch(() => console.log('Vote scrubbed:', vId));
            }
        });
    }

    askQuestion(qText, id)
    {
        let self = this;

        let newQ = new Promise((resolve, reject) =>
        {
            // check for previous questions
            let prereq;
            if(self.questions.length > 0){
                // only run when earlier questions are answered
                prereq = self.questions[self.questions.length-1];
            }
            else {
                prereq = Promise.resolve();
            }

            prereq.then(() => {

                // make sure the answer is still relevant
                let latestVotes = parseCSV(SH.game.votesInProgress);
                if(!latestVotes.includes(id)){
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
                self.neinCard.show();

                function respond(answer){
                    function handler()
                    {
                        // make sure only the owner of the ballot is answering
                        if(self.seat.owner !== SH.localUser.id) return;

                        // hide the question and return the answer
                        self.jaCard.hide();
                        self.neinCard.hide();
                        self.question.visible = false;
                        self.jaCard.removeEventListener('cursorup', handler);
                        self.neinCard.removeEventListener('cursorup', handler);

                        // make sure the answer still matters
                        let latestVotes = parseCSV(SH.game.votesInProgress);
                        if(!latestVotes.includes(id))
                            reject();
                        else
                            resolve(answer);
                    }

                    return handler;
                }
            });
        });

        // add question to queue, remove when done
        self.questions.push(newQ);
        newQ.voteId = id;
        let splice = () => self.questions.splice( self.questions.indexOf(newQ), 1 );
        newQ.then(splice).catch(splice);

        return newQ;
    }
}
