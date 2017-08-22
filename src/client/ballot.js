'use strict;'

import SH from './secrethitler';
import { JaCard, NeinCard } from './card';
import { generateQuestion, lateUpdate } from './utils';
import * as BP from './ballotprocessor';

let PLAYERSELECT = 0;
let CONFIRM = 1;
let BINARY = 2;
let POLICY = 3;

class Ballot extends THREE.Object3D
{
	constructor(seat)
	{
		super();
		this.seat = seat;
		this.position.set(0, -0.3, 0.25);
		seat.add(this);

		this.lastQueued = Promise.resolve();
		this.displayed = null;

		this._yesClickHandler = null;
		this._noClickHandler = null;
		this._nominateHandler = null;
		this._cancelHandler = null;

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
		this.question.position.set(0, 0.05, 0.08);
		this.question.rotation.set(0.3, Math.PI, 0);
		this.question.visible = false;
		this.add(this.question);

		SH.addEventListener('update_votesInProgress', BP.updateVotesInProgress.bind(this));
		SH.addEventListener('update_state', lateUpdate(BP.updateState.bind(this)));
	}

	askQuestion(qText, id, {choices = BINARY, policyHand = 0x1, fake = false, isInvalid = () => true} = {})
	{
		let self = this;

		function isVoteValid()
		{
			let isFakeValid = fake && !isInvalid();
			let isLocalVote = /^local/.test(id);
			let isFirstUpdate = !SH.game.votesInProgress;
			let vote = SH.votes[id];
			let voters = vote ? [...vote.yesVoters, ...vote.noVoters] : [];
			let alreadyVoted = voters.includes(self.seat.owner);
			return isLocalVote || isFirstUpdate || isFakeValid || vote && !alreadyVoted;
		}

		function hookUpQuestion(){
			return new Promise(questionExecutor);
		}

		function questionExecutor(resolve, reject)
		{
			// make sure the answer is still relevant
			if(!isVoteValid()){
				return reject();
			}

			// show the ballot
			self.question.material.map = generateQuestion(qText, self.question.material.map);
			self.question.visible = true;

			// hook up q/a cards
			if(!fake)
			{
				if(choices === PLAYERSELECT){
					SH.addEventListener('playerSelect', respond('player', resolve, reject));
				}
				if(choices === CONFIRM || choices === BINARY){
					self.jaCard.show();
					self.jaCard.addEventListener('cursorup', respond('yes', resolve, reject));
				}
				if(choices === BINARY){
					self.neinCard.show();
					self.neinCard.addEventListener('cursorup', respond('no', resolve, reject));
				}
			}

			self.addEventListener('cancelVote', respond('cancel', resolve, reject));

			self.displayed = id;
		}

		function respond(answer, resolve, reject)
		{
			function handler(evt)
			{
				// make sure only the owner of the ballot is answering
				if(answer !== 'cancel' && self.seat.owner !== SH.localUser.id) return;

				// clean up
				self.jaCard.hide();
				self.neinCard.hide();
				self.question.visible = false;
				self.displayed = null;
				self.jaCard.removeEventListener('cursorup', self._yesClickHandler);
				self.neinCard.removeEventListener('cursorup', self._noClickHandler);
				SH.removeEventListener('playerSelect', self._nominateHandler);
				self.removeEventListener('cancelVote', self._cancelHandler);

				// make sure the answer still matters
				if(!isVoteValid() || answer === 'cancel'){
					reject();
				}
				else if(answer === 'yes')
					resolve(true);
				else if(answer === 'no')
					resolve(false);
				else if(answer === 'player')
					resolve(evt.data);
			}

			if(answer === 'yes')
				self._yesClickHandler = handler;
			else if(answer === 'no')
				self._noClickHandler = handler;
			else if(answer === 'player')
				self._nominateHandler = handler;
			else if(answer === 'cancel')
				self._cancelHandler = handler;

			return handler;
		}

		self.lastQueued = self.lastQueued.then(hookUpQuestion, hookUpQuestion);

		return self.lastQueued;
	}

	askPlaceholder(qText, {choices = BINARY, policyHand = 0x1} = {})
	{
		// TODO: merge with askQuestion somehow?
	}
}

export {Ballot, PLAYERSELECT, CONFIRM, BINARY, POLICY};