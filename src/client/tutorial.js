import SH from './secrethitler';

export default class TutorialManager
{
	constructor()
	{
		this.enabled = false;
		this.wait = Promise.resolve();
		this.activeClip = null;
		this.lastEvent = null;
		this.played = [];
		/*['welcome','night','nomination','voting','voteFails','votePasses','policy1','policy2',
			'policyFascist','policyLiberal','policyAftermath','wrapup','power1','power2',
			'investigate','peek','nameSuccessor','execute','veto','redzone']
		.forEach(phase => this.hasPlayed[phase] = false);*/
	}

	detectEvent(game, votes)
	{
		let lastElection = votes[game.lastElection];
		
		if(game.state === 'night' && !this.played.includes('night'))
			return 'night';
		else if(game.state === 'nominate' && !this.played.includes('nomination'))
			return 'nomination';
		else if(game.state === 'election' && !this.played.includes('voting'))
			return 'voting';
		else if(game.state === 'lameDuck' && lastElection.yesVoters.length < lastElection.requires && !this.played.includes('voteFails'))
			return 'voteFails';
		else if(game.state === 'lameDuck' && lastElection.yesVoters.length >= lastElection.requires && !this.played.includes('votePasses'))
			return 'votePasses';
		else if(game.state === 'policy1' && !this.played.includes('policy1'))
			return 'policy1';
		else if(game.state === 'policy2' && !this.played.includes('policy2'))
			return 'policy2';
		else if(game.state === 'aftermath' && game.hand === 2 && !this.played.includes('policyFascist'))
			return 'policyFascist';
		else if(game.state === 'aftermath' && game.hand === 3 && !this.played.includes('policyLiberal'))
			return 'policyLiberal';

		else if(game.state === 'nominate' && game.fascistPolicies+game.liberalPolicies === 1 && !this.played.includes('wrapup'))
			return 'wrapup';
		else if(game.state === 'nominate' && game.fascistPolicies === 3 && !this.played.includes('redzone'))
			return 'redzone';

		else if(['investigate','peek','nameSuccessor','execute'].includes(game.state))
		{
			let state = game.state;
			if(game.fascistPolicies === 5)
				state = 'veto';
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

		if(this.activeClip){
			this.activeClip.stop();
			this.activeClip = null;
		}

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
			veto: ['power1','veto']
		};
		let gapped = {
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

		if(gapped[event])
		{
			this.played.push(event);
			this.wait = Promise.all([wait, SH.audio.tutorial[gapped[event][0]].loaded])
			.then(() => {
				this.activeClip = SH.audio.tutorial[gapped[event][0]].play();
				return this.activeClip.finishedPlaying;
			});

			this.wait
			.then(() => SH.audio.tutorial[gapped[event][1]].loaded)
			.then(() => {
				this.activeClip = SH.audio.tutorial[gapped[event][1]].play();
				return this.activeClip.finishedPlaying;
			})
			.then(() => this.activeClip = null);
		}
		else if(seamless[event])
		{
			this.wait = Promise.resolve();
			Promise.all([wait, ...seamless[event].map(c => SH.audio.tutorial[c].loaded)])
			.then(() => {
				return seamless[event].reduce((promise,clip) => {
					return promise.then(() => {
						if(this.lastEvent === event)
							this.activeClip = SH.audio.tutorial[clip].play();
						return this.activeClip.finishedPlaying;
					});
				}, Promise.resolve());
			})
			.then(() => this.activeClip = null);
		}
		else if(event !== null)
		{
			this.played.push(event);
			this.wait = Promise.resolve();
			Promise.all([wait, SH.audio.tutorial[event].loaded])
			.then(() => {
				this.activeClip = SH.audio.tutorial[event].play();
				return this.activeClip.finishedPlaying;
			})
			.then(() => this.activeClip = null);
		}
	}
}