import SH from './secrethitler';

export default class TutorialManager
{
	constructor()
	{
		this.enabled = false;
		this.lastEvent = null;
		this.played = [];
	}

	detectEvent(game, votes)
	{
		let lastElection = votes[game.lastElection];
		let firstRound = game.fascistPolicies + game.liberalPolicies === 0;

		if(firstRound && game.state === 'night')
			return 'night';
		else if(firstRound && game.state === 'nominate')
			return 'nomination';
		else if(firstRound && game.state === 'election')
			return 'voting';
		else if(game.state === 'lameDuck' && lastElection.yesVoters.length < lastElection.toPass && !this.played.includes('voteFails')){
			this.played.push('voteFails');
			return 'voteFails';
		}
		else if(game.state === 'lameDuck' && lastElection.yesVoters.length >= lastElection.toPass && !this.played.includes('votePasses')){
			this.played.push('votePasses');
			return 'votePasses';
		}
		else if(firstRound && game.state === 'policy1')
			return 'policy1';
		else if(firstRound && game.state === 'policy2')
			return 'policy2';
		else if(game.state === 'aftermath' && game.fascistPolicies === 1 && game.hand === 2)
			return 'policyFascist';
		else if(game.state === 'aftermath' && game.liberalPolicies === 1 && game.hand === 3)
			return 'policyLiberal';

		else if(game.state === 'nominate' && game.fascistPolicies+game.liberalPolicies === 1)
			return 'wrapup';
		else if(game.state === 'nominate' && game.fascistPolicies === 3)
			return 'redzone';

		else if(['investigate','peek','nameSuccessor','execute'].includes(game.state))
		{
			if(this.played.includes(game.state))
				return null;

			let state;
			if(game.fascistPolicies === 5)
				state = 'veto';
			else
				state = game.state;
			this.played.push(state);

			if(!this.played.includes('power')){
				state = 'first_'+state;
				this.played.push('power');
			}

			return state;
		}
		else return null;
	}

	stateUpdate(game, votes)
	{
		if(!game.tutorial || game.turnOrder.includes('1111111') && SH.localUser.id !== '1111111')
			return;

		let seamless = {
			policyFascist: ['policyFascist','policyAftermath'],
			policyLiberal: ['policyLiberal','policyAftermath'],
			first_investigate: ['power1','power2','investigate'],
			first_peek: ['power1','power2','peek'],
			first_nameSuccessor: ['power1','power2','nameSuccessor'],
			first_execute: ['power1','power2','execute'],
			first_veto: ['power1','power2','veto'],
			investigate: ['power1','investigate'],
			peek: ['power1','peek'],
			nameSuccessor: ['power1','nameSuccessor'],
			execute: ['power1','execute'],
			veto: ['power1','veto'],
			night: ['welcome','night']
		};
		let delayed = {
			policyFascist: 'policyAnimDone',
			policyLiberal: 'policyAnimDone'
		};

		let event = this.lastEvent = this.detectEvent(game, votes);
		console.log('tutorial event:', event);

		let wait = Promise.resolve();
		if(delayed[event]){
			wait = new Promise((resolve, reject) => {
				let handler = () => {
					SH.removeEventListener(delayed[event], handler);
					resolve();
				};
				SH.addEventListener(delayed[event], handler);
			});
		}

		if(seamless[event])
		{
			let subevent = /^first_/.test(event) ? event.slice(6) : event;
			wait.then(() => {
				seamless[subevent].forEach(clip => SH.audio.tutorial[clip].play(true));
			});
		}
		else if(event !== null)
		{
			wait.then(() => SH.audio.tutorial[event].play(true));
		}
	}
}