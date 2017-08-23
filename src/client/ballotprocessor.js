'use strict';

import SH from './secrethitler';
import * as BallotType from './ballot';

function updateVotesInProgress({data: {game, players, votes}})
{
	let ballot = this;
	if(!ballot.seat.owner) return;

	let vips = game.votesInProgress;
	let blacklistedVotes = vips.filter(id => {
		let vs = [...votes[id].yesVoters, ...votes[id].noVoters];
		let nv = votes[id].nonVoters;
		return nv.includes(ballot.seat.owner) || vs.includes(ballot.seat.owner);
	});
	let newVotes = vips.filter(
		id => (!SH.game.votesInProgress || !SH.game.votesInProgress.includes(id)) && !blacklistedVotes.includes(id)
	);
	let finishedVotes = !SH.game.votesInProgress ? blacklistedVotes
		: SH.game.votesInProgress.filter(id => !vips.includes(id)).concat(blacklistedVotes);

	newVotes.forEach(vId =>
	{
		// generate new question to ask
		let questionText, opts = {};
		if(votes[vId].type === 'elect'){
			questionText = players[game.president].displayName
				+ '\nfor president and\n'
				+ players[game.chancellor].displayName
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
		else if(votes[vId].type === 'confirmRole' && ballot.seat.owner === SH.localUser.id)
		{
			opts = {choices: BallotType.CONFIRM};
			let role = players[SH.localUser.id].role;
			role = role.charAt(0).toUpperCase() + role.slice(1);
			questionText = 'Your role:\n' + role;
		}

		if(questionText)
		{
			ballot.askQuestion(questionText, vId, opts)
			.then(answer => {
				SH.socket.emit('vote', vId, SH.localUser.id, answer);
			})
			.catch(() => console.log('Vote scrubbed:', vId));
		}
	});

	if(finishedVotes.includes(ballot.displayed)){
		ballot.dispatchEvent({type: 'cancelVote', bubbles: false});
	}
}

function updateState({data: {game, players}})
{
	let ballot = this;

	function chooseChancellor()
	{
		return ballot.askQuestion('Choose your\nchancellor!', 'local_nominate', {choices: BallotType.PLAYERSELECT})
		.then(confirmChancellor);
	}

	function confirmChancellor(userId)
	{
		let username = SH.players[userId].displayName;
		let text = `Name ${username}\nas chancellor?`;
		return ballot.askQuestion(text, 'local_nominate_confirm')
		.then(confirmed => {
			if(confirmed){
				return Promise.resolve(userId);
			}
			else {
				return chooseChancellor();
			}
		});
	}

	function hideNominatePlaceholder({data: {game}})
	{
		if(game.state !== 'nominate'){
			ballot.dispatchEvent({type: 'cancelVote', bubbles: false});
			SH.removeEventListener('update_state', hideNominatePlaceholder);
		}
	}

	if(game.state === 'nominate' && ballot.seat.owner === game.president)
	{
		if(SH.localUser.id === game.president){
			chooseChancellor().then(userId => {
				SH.socket.emit('nominate', userId);
			});
		}
		else {
			ballot.askQuestion('Choose your\nchancellor!', 'wait_for_chancellor', {
				choices: BallotType.PLAYERSELECT,
				fake: true,
				isInvalid: () => SH.game.state !== 'nominate'
			});
			SH.addEventListener('update_state', hideNominatePlaceholder);
		}
	}
	else if(game.state === 'policy1' && ballot.seat.owner === game.president)
	{
		if(SH.localUser.id === game.president)
		{
			ballot.askQuestion('Choose one\nto discard!', 'local_policy1',
				{choices: BallotType.POLICY, policyHand: game.hand})
			.then(discard => {
				console.log('Discarding', discard);
				//SH.socket.emit('discard_policy', discard);
			});
		}
		else
		{
			ballot.askQuestion('Choose one\nto discard!', 'fake_policy1', {
				choices: BallotType.POLICY, policyHand: game.hand,
				fake: true, isInvalid: () => SH.game.state !== 'policy1'
			});
		}
	}
}

export {updateVotesInProgress, updateState};