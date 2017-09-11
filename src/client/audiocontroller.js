import SH from './secrethitler';

class AudioClip
{
	constructor(context, url, volume)
	{
		this.context = context;
		this.output = context.createGain();
		this.output.gain.value = volume;
		this.output.connect(context.destination);

		let loader = new THREE.FileLoader();
		loader.setResponseType('arraybuffer');
		loader.load(url, buffer => {
			context.decodeAudioData(buffer, decodedBuffer => {
				this.buffer = decodedBuffer;
			});
		});
	}

	play()
	{
		return new Promise((resolve, reject) => {
			let source = this.context.createBufferSource();
			source.buffer = this.buffer;
			source.connect(this.output);
			source.start(0, 0);
			source.onended = resolve;
		});
	}
}

export default class AudioController
{
	constructor(){
		this.context = new AudioContext();
		this.liberalSting = new AudioClip(this.context, 'static/audio/liberal-sting.ogg', 0.2);
		this.liberalFanfare = new AudioClip(this.context, 'static/audio/liberal-fanfare.ogg', 0.2);
		this.fascistSting = new AudioClip(this.context, 'static/audio/fascist-sting.ogg', 0.1);
		this.fascistFanfare = new AudioClip(this.context, 'static/audio/fascist-fanfare.ogg', 0.1);
	}
}