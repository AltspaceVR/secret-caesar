import SH from './secrethitler';

export default class TutorialManager
{
	constructor()
	{
		this.enabled = false;
		this.wait = Promise.resolve();
		this.activeClip = null;
		this.played = [];
		/*['welcome','night','nomination','voting','voteFails','votePasses','policy1','policy2',
			'policyFascist','policyLiberal','policyAftermath','wrapup','power1','power2',
			'investigate','peek','nameSuccessor','execute','veto','redzone']
		.forEach(phase => this.hasPlayed[phase] = false);*/
	}

	stateUpdate(game)
	{
		if(!game.tutorial)
			return;

		if(this.activeClip){
			this.activeClip.stop();
			this.activeClip = null;
		}

		if(game.state === 'night' && !this.played.includes('night'))
		{
			this.played.push('night');
			this.wait = SH.audio.tutorial.welcome.loaded
			.then(() => {
				this.activeClip = SH.audio.tutorial.welcome.play();
				return this.activeClip.finishedPlaying;
			});

			this.wait
			.then(() => SH.audio.tutorial.night.loaded)
			.then(() => {
				this.activeClip = SH.audio.tutorial.night.play();
				return this.activeClip.finishedPlaying;
			})
			.then(() => this.activeClip = null);
		}
		else if(game.state === 'nominate' && !this.played.includes('nominate'))
		{
			this.played.push('nominate');
			this.wait = Promise.resolve();
			SH.audio.tutorial.nomination.loaded
			.then(() => {
				this.activeClip = SH.audio.tutorial.nomination.play();
			});
		}
	}
}