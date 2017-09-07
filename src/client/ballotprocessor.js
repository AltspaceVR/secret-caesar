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
				+ ' for president and '
				+ players[game.chancellor].displayName
				+ ' for chancellor?';
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

	function choosePlayer(question, confirmQuestion, id)
	{
		function confirmPlayer(userId)
		{
			let username = SH.players[userId].displayName;
			let text = confirmQuestion.replace('{}', username);
			return ballot.askQuestion(text, 'local_'+id+'_confirm')
			.then(confirmed => {
				if(confirmed){
					return Promise.resolve(userId);
				}
				else {
					return choosePlayer(question, confirmQuestion, id);
				}
			});
		}

		return ballot.askQuestion(question, 'local_'+id, {choices: BallotType.PLAYERSELECT})
		.then(confirmPlayer);
	}

	function hideNominatePlaceholder({data: {game}})
	{
		if(game.state !== 'nominate' && ballot.displayed === 'wait_for_chancellor'){
			ballot.dispatchEvent({type: 'cancelVote', bubbles: false});
		}
		SH.removeEventListener('update_state', hideNominatePlaceholder);
	}

	function hidePolicyPlaceholder({data: {game}})
	{
		if(game.state !== 'policy1' && ballot.displayed === 'local_policy1' ||
			game.state !== 'policy2' && ballot.displayed === 'local_policy2'
		){
			ballot.dispatchEvent({type: 'cancelVote', bubbles: false});
		}
		SH.removeEventListener('update_state', hidePolicyPlaceholder);
	}

	if(game.state === 'nominate' && ballot.seat.owner === game.president)
	{
		if(SH.localUser.id === game.president){
			choosePlayer('Choose your\nchancellor!', 'Name {}\nas chancellor?', 'nominate')
			.then(userId => {
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
		let opts = {choices: BallotType.POLICY, policyHand: game.hand};
		if(SH.localUser.id !== game.president){
			Object.assign(opts, {fake: true, isInvalid: () => SH.game.state !== 'policy1'});
		}

		ballot.askQuestion('Choose one\nto discard!', 'local_policy1', opts)
		.then(discard => {
			SH.socket.emit('discard_policy1', discard);
		});
		SH.addEventListener('update_state', hidePolicyPlaceholder);
	}
	else if(game.state === 'policy2' && ballot.seat.owner === game.chancellor)
	{
		let opts = {choices: BallotType.POLICY, policyHand: game.hand};
		if(SH.localUser.id !== game.chancellor){
			Object.assign(opts, {fake: true, isInvalid: () => SH.game.state !== 'policy2'});
		}

		ballot.askQuestion('Choose one\nto discard!', 'local_policy2', opts)
		.then(discard => {
			SH.socket.emit('discard_policy2', discard);
		}, err => console.error(err));
		SH.addEventListener('update_state', hidePolicyPlaceholder);
	}
	else if(game.state === 'investigate' && ballot.seat.owner === game.president)
	{
		if(SH.localUser.id === game.president){
			choosePlayer('Executive power:\nChoose one player\nto investigate!', 'Investigate\n{}?', 'investigate')
			.then(userId => {
				SH.dispatchEvent({
					type: 'investigate',
					data: userId
				});
			});
		}
		else {
			ballot.askQuestion('Executive power:\nChoose one player\nto investigate!', 'wait_for_investigate', {
				choices: BallotType.PLAYERSELECT,
				fake: true,
				isInvalid: () => SH.game.state !== 'investigate'
			});
			let cleanUpFakeVote = ({data: {game: {state}}}) => {
				if(state !== 'investigate' && ballot.displayed === 'wait_for_investigate')
					ballot.dispatchEvent({type: 'cancelVote', bubbles: false});
				SH.removeEventListener('update_state', cleanUpFakeVote);
			};
			SH.addEventListener('update_state', cleanUpFakeVote);
		}
	}
	else if(game.state === 'peek' && ballot.seat.owner === game.president)
	{
		let opts = {choices: BallotType.POLICY, policyHand: 8 | (game.deck&7)};
		if(SH.localUser.id !== game.president){
			Object.assign(opts, {fake: true, isInvalid: () => SH.game.state !== 'peek'});
		}

		ballot.askQuestion('Executive power:\nThe next president\'s\n"random" policies.', 'local_peek', opts)
		.then(discard => {
			SH.socket.emit('continue');
		});
		let cleanUpFakeVote = ({data: {game: {state}}}) => {
			if(state !== 'peek' && ballot.displayed === 'local_peek')
				ballot.dispatchEvent({type: 'cancelVote', bubbles: false});
			SH.removeEventListener('update_state', cleanUpFakeVote);
		};
		SH.addEventListener('update_state', cleanUpFakeVote);
	}
}

export {updateVotesInProgress, updateState};