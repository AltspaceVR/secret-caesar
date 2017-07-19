'use strict;'

import SH from './secrethitler';
import { JaCard, NeinCard } from './card';
import { generateQuestion } from './utils';

export default class Ballot extends THREE.Object3D
{
	constructor(seat)
	{
		super();
		this.seat = seat;
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
		let blacklistedVotes = vips.filter(id => {
			let vs = [...votes[id].yesVoters, ...votes[id].noVoters];
			let nv = votes[id].nonVoters;
			return nv.includes(self.seat.owner) || vs.includes(self.seat.owner);
		});
		let newVotes = vips.filter(
			id => !SH.game.votesInProgress.includes(id) && !blacklistedVotes.includes(id)
		);
		let finishedVotes = SH.game.votesInProgress.filter(id => !vips.includes(id))
			.concat(blacklistedVotes);

		newVotes.forEach(vId =>
		{
			// generate new question to ask
			let questionText, choices = 2;
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
				choices = 1;
				let role = players[SH.localUser.id].role;
				role = role.charAt(0).toUpperCase() + role.slice(1);
				questionText = 'Your role:\n' + role;
			}

			if(questionText)
			{
				self.askQuestion(questionText, vId, choices)
				.then(answer => {
					SH.socket.emit('vote', vId, SH.localUser.id, answer);
				})
				.catch(() => console.log('Vote scrubbed:', vId));
			}
		});

		if(finishedVotes.includes(self.displayed))
			self.dispatchEvent({type: 'cancelVote', bubbles: false});
	}

	/*askQuestion(qText, id, choices = 2)
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
				SH.addEventListener('unconfirmedChancellor', respond);

				// show the ballot
				self.question.visible = true;
				if(choices >= 1)
					self.jaCard.show();
				if(choices >= 2)
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
							resolve(answer.data ? answer.data : answer);
					}

					if(answer === true) self._yesClickHandler = handler;
					else if(answer === false) self._noClickHandler = handler;
					else {
						self._nominateHandler = handler;
						handler();
					}
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
				SH.removeEventListener('unconfirmedChancellor', self._nominateHandler);
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
	}*/

	askQuestion(qText, id, choices = 2)
	{
		let self = this;

		function isVoteValid()
		{
			let isLocalVote = /^local/.test(id);
			let vote = SH.game.votesInProgress[id];
			let voters = vote ? [...vote.yesVoters, ...vote.noVoters] : [];
			let alreadyVoted = voters.includes(self.seat.owner);
			return isLocalVote || vote && !alreadyVoted;
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
			self.question.material.map = generateQuestion(qText, this.question.material.map);
			self.question.visible = true;

			// hook up q/a cards
			if(choices === 0){
				SH.addEventListener('playerSelect', respond('player', resolve, reject));
			}
			if(choices >= 1){
				self.jaCard.show();
				self.jaCard.addEventListener('cursorup', respond('yes', resolve, reject));
			}
			if(choices >= 2){
				self.neinCard.show();
				self.neinCard.addEventListener('cursorup', respond('no', resolve, reject));
			}

			self.addEventListener('cancelVote', respond('cancel', resolve, reject));

			self.displayed = id;
		}

		function respond(answer, resolve, reject)
		{
			function handler(evt)
			{
				// make sure only the owner of the ballot is answering
				if(self.seat.owner !== SH.localUser.id) return;

				// clean up
				self.jaCard.hide();
				self.neinCard.hide();
				self.question.visible = false;
				self.displayed = null;
				self.jaCard.removeEventListener('cursorup', self._yesClickHandler);
				self.neinCard.removeEventListener('cursorup', self._noClickHandler);
				SH.removeEventListener('playerSelect', self._nominateHandler);

				// make sure the answer still matters
				if(!isVoteValid() || answer === 'cancel')
					reject();
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
}
