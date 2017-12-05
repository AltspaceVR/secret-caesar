'use strict;'

import SH from './secrethitler';
import { BlankCard, JaCard, NeinCard, FascistPolicyCard, LiberalPolicyCard, VetoCard } from './card';
import { generateQuestion, lateUpdate } from './utils';
import * as BP from './ballotprocessor';
import * as BPBA from './bpba';
import {NText, PlaceholderMesh} from './nativecomponents';
import Animate from './animate';

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
		this.rotation.set(.5, Math.PI, 0);
		seat.add(this);

		this.lastQueued = Promise.resolve();
		this.displayed = null;
		this.blockVeto = false;

		this._yesClickHandler = null;
		this._noClickHandler = null;
		this._nominateHandler = null;
		this._cancelHandler = null;

		this.jaCard = new JaCard();
		this.neinCard = new NeinCard();
		[this.jaCard, this.neinCard].forEach(c => {
			c.position.set(c instanceof JaCard ? -0.1 : 0.1, -0.1, 0);
			c.scale.setScalar(0.15);
			c.visible = false;
		});
		this.add(this.jaCard, this.neinCard);
		this.policies = [];

		//let geo = new THREE.PlaneBufferGeometry(0.4, 0.2);
		//let mat = new THREE.MeshBasicMaterial({transparent: true, side: THREE.DoubleSide});
		this.question = PlaceholderMesh.clone();
		this.question.position.set(0, 0.05, 0);
		this.question.scale.setScalar(.5);
		this.question.visible = false;
		this.add(this.question);

		this.textComponent = new NText(this.question);
		this.textComponent.update({width: 1.1, height: .4, fontSize: 1, verticalAlign: 'top'});

		SH.addEventListener('update_votesInProgress', BP.updateVotesInProgress.bind(this));
		SH.addEventListener('update_state', lateUpdate(BP.updateState.bind(this)));
	}

	askQuestion(qText, id, {choices = BINARY, policyHand = 0x1, includeVeto = false, fake = false, isInvalid = () => true} = {})
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
				return reject('Vote no longer valid');
			}

			// show the ballot
			//self.question.material.map = generateQuestion(qText, self.question.material.map);
			self.textComponent.update({text: `${qText}`});
			self.question.visible = true;

			// hook up q/a cards
			if(choices === CONFIRM || choices === BINARY){
				self.jaCard.visible = true;
				if(!fake){
					self.jaCard.addEventListener('cursorup', respond('yes', resolve, reject));
					if(self.seat.owner === SH.localUser.id)
						self.jaCard.addBehavior( new altspace.utilities.behaviors.HoverScale() );
				}
			}
			else self.jaCard.visible = false;

			if(choices === BINARY){
				self.neinCard.visible = true;
				if(!fake){
					self.neinCard.addEventListener('cursorup', respond('no', resolve, reject));
					if(self.seat.owner === SH.localUser.id)
						self.neinCard.addBehavior( new altspace.utilities.behaviors.HoverScale() );
				}
			}
			else self.neinCard.visible = false;

			if(choices === PLAYERSELECT && !fake){
				SH.addEventListener('playerSelect', respond('player', resolve, reject));
			}
			else if(choices === POLICY){
				let cards = BPBA.toArray(policyHand);
				if(includeVeto) cards.push(-1);
				cards.forEach((val, i, arr) =>
				{
					let card = null;
					if(fake)
						card = new BlankCard();
					else if(val === -1)
						card = new VetoCard();
					else if(val === BPBA.LIBERAL)
						card = new LiberalPolicyCard();
					else
						card = new FascistPolicyCard();

					card.scale.setScalar(0.15);

					let width = .15 * arr.length;
					let x = -width/2 + .15*i + .075;
					card.position.set(x, -0.07, 0);
					self.add(card);
					self.policies.push(card);

					if(!fake){
						card.addEventListener('cursorup', respond(val === -1 ? -1 : i, resolve, reject));
						
						if(self.seat.owner === SH.localUser.id)
							card.addBehavior( new altspace.utilities.behaviors.HoverScale() );
					}
				});
			}

			self.addEventListener('cancelVote', respond('cancel', resolve, reject));

			if(self._outtroAnim){
				clearTimeout(self._outtroAnim);
			}

			if(!self.displayed)
				Animate.swingIn(self, Math.PI/2-.5, .41, 800);

			self.displayed = id;
		}

		function respond(answer, resolve, reject)
		{
			function handler(evt)
			{
				// make sure only the owner of the ballot is answering
				if(answer !== 'cancel' && self.seat.owner !== SH.localUser.id) return;

				// clean up
				self._outtroAnim = setTimeout(() => {
					Animate.swingOut(self, Math.PI/2-.5, .41, 300)
					.then(() => {
						self.jaCard.visible = false;
						self.neinCard.visible = false;
						self.question.visible = false;
						self.displayed = null;
						self.remove(...self.policies);
						self.policies = [];
					});
					
					self._outtroAnim = null;
				}, 100);

				self.jaCard.removeAllBehaviors();
				self.jaCard.removeEventListener('cursorup', self._yesClickHandler);
				self.neinCard.removeAllBehaviors();
				self.neinCard.removeEventListener('cursorup', self._noClickHandler);
				SH.removeEventListener('playerSelect', self._nominateHandler);
				self.removeEventListener('cancelVote', self._cancelHandler);

				// make sure the answer still matters
				if(!isVoteValid() || answer === 'cancel'){
					reject('vote cancelled');
				}
				else if(answer === 'yes')
					resolve(true);
				else if(answer === 'no')
					resolve(false);
				else if(answer === 'player')
					resolve(evt.data);
				else if(choices === POLICY)
				{
					// clicked card detaches and winks out
					let card = self.policies[(answer+3)%3];
					card.applyMatrix(self.matrix);
					self.seat.add(card);
					Animate.winkOut(card, 300);

					resolve(answer);
				}
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
}

export {Ballot, PLAYERSELECT, CONFIRM, BINARY, POLICY};
