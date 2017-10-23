import SH from './secrethitler';
import {activeTheme as theme} from './theme';

class AudioStream
{
	constructor(context, buffer, output){
		this.source = context.createBufferSource();
		this.source.buffer = buffer;
		this.source.connect(output);
	}

	play(){
		this.finishedPlaying = new Promise((resolve, reject) => {
			this.source.onended = resolve;
		});
		this.source.start(0, 0);
	}

	stop(){
		this.source.stop();
	}
}

class AudioClip
{
	constructor(context, url, volume)
	{
		this.context = context;
		this.output = context.createGain();
		this.output.gain.value = volume;
		this.output.connect(context.destination);

		this.loaded = new Promise((resolve, reject) => {
			let loader = new THREE.FileLoader();
			loader.setResponseType('arraybuffer');
			loader.load(url, buffer => {
				context.decodeAudioData(buffer, decodedBuffer => {
					this.buffer = decodedBuffer;
					resolve();
				});
			});
		})
	}

	play()
	{
		let instance = new AudioStream(this.context, this.buffer, this.output);
		instance.play();
		return instance;
	}
}

export default class AudioController
{
	constructor()
	{
		let context = this.context = new AudioContext();
		this.liberalSting = new AudioClip(this.context, `/static/audio/hitler/liberal-sting.ogg`, 0.2);
		this.liberalFanfare = new AudioClip(this.context, `/static/audio/hitler/liberal-fanfare.ogg`, 0.2);
		this.fascistSting = new AudioClip(this.context, `/static/audio/hitler/fascist-sting.ogg`, 0.1);
		this.fascistFanfare = new AudioClip(this.context, `/static/audio/hitler/fascist-fanfare.ogg`, 0.1);

		let readers = {hitler: ['steven'], caesar: []};
		let reader = readers[theme][Math.floor(Math.random()*readers[theme].length)];
		let volume = 0.3;

		if(!reader){
			this.tutorial = {};
			return;
		}

		this.tutorial = {
			welcome: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/welcome.ogg`, volume),
			night: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/night.ogg`, volume),
			nomination: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/nomination.ogg`, volume),
			voting: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/voting.ogg`, volume),
			voteFails: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/vote-fails.ogg`, volume),
			votePasses: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/vote-passed.ogg`, volume),
			policy1: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/policy1.ogg`, volume),
			policy2: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/policy2.ogg`, volume),
			policyFascist: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/policy-fascist.ogg`, volume),
			policyLiberal: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/policy-liberal.ogg`, volume),
			policyAftermath: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/policy-aftermath.ogg`, volume),
			wrapup: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/wrapup.ogg`, volume),
			power1: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/power1.ogg`, volume),
			power2: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/power2.ogg`, volume),
			investigate: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/power-investigate.ogg`, volume),
			peek: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/power-peek.ogg`, volume),
			nameSuccessor: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/power-namesuccessor.ogg`, volume),
			execute: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/power-execute.ogg`, volume),
			veto: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/power-veto.ogg`, volume),
			redzone: new AudioClip(context, `/static/audio/${theme}/${reader}-tutorial/redzone.ogg`, volume)
		};
	}
}