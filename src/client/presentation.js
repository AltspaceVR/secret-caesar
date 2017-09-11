import SH from './secrethitler';
import {CreditsCard} from './card';
import {PlaceholderMesh, NBillboard, NText} from './nativecomponents';
import Animate from './animate';

export default class Presentation extends THREE.Object3D
{
	constructor()
	{
		super();
		SH.add(this);

		// create idle display
		this.credits = new CreditsCard();
		this.credits.position.set(0, 1.85, 0);
		Animate.spin(this.credits, 30000);
		this.add(this.credits);
		
		// create victory banner
		this.banner = PlaceholderMesh.clone();
		this.banner.text = new NText(this.banner);
		this.banner.text.update({fontSize: 2});
		this.banner.billboard = new NBillboard(this.banner);
		this.banner.bob = null;
		this.add(this.banner);

		// update stuff
		SH.addEventListener('update_state', this.updateOnState.bind(this));
	}

	updateOnState({data: {game, players}})
	{
		this.credits.visible = game.state === 'setup';

		if(game.state === 'done')
		{
			if(/^liberal/.test(game.victory)){
				this.banner.text.color = '#1919ff';
				this.banner.text.update({text: 'Liberals win!'});
				SH.audio.liberalFanfare.play();
			}
			else {
				this.banner.text.color = 'red';
				this.banner.text.update({text: 'Fascists win!'});
				SH.audio.fascistFanfare.play();
			}
			
			this.banner.position.set(0,0.8,0);
			this.banner.scale.setScalar(.001);
			this.banner.visible = true;
			Animate.simple(this.banner, {
				pos: new THREE.Vector3(0, 1.8, 0),
				scale: new THREE.Vector3(1,1,1),
				duration: 1000
			})
			.then(() => this.banner.bob = Animate.bob(this.banner));
		}
		else if(game.state === 'policy1' && game.fascistPolicies >= 3)
		{
			let chancellor = players[game.chancellor].displayName;
			this.banner.text.color = 'white';
			this.banner.text.update({text: `${chancellor} is not Hitler!`});

			this.banner.position.set(0,0.8,0);
			this.banner.scale.setScalar(.001);
			this.banner.visible = true;
			Animate.simple(this.banner, {
				pos: new THREE.Vector3(0, 1.8, 0),
				scale: new THREE.Vector3(1,1,1)
			})
			.then(() => this.banner.bob = Animate.bob(this.banner));
		}
		else if(game.state === 'aftermath') {
			this.banner.visible = false;
			this.banner.bob.stop();
			this.banner.bob = null;
		}
	}
}