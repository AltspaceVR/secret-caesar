import SH from './secrethitler';
import AM from './assetmanager';

const itemSize = 0.25;
const margin = 0.25;

export default class ButtonGroup extends THREE.Object3D
{
	constructor(parent)
	{
		super();
		parent.add(this);

		this._buttonGeo = new THREE.BoxGeometry(itemSize, itemSize, itemSize);

		// reset button
		if(SH.localUser.isModerator)
		{
			let reset = new THREE.Mesh(
				this._buttonGeo,
				new THREE.MeshBasicMaterial({map: AM.cache.textures.reset})
			);
			reset.addBehavior( new altspace.utilities.behaviors.HoverScale() );
			reset.addEventListener('cursorup', () => {
				if(SH.localUser.isModerator){
					console.log('requesting reset');
					SH.socket.emit('reset');
				}
			});
			this.add(reset);
		}

		// refresh button
		let refresh = new THREE.Mesh(
			this._buttonGeo,
			new THREE.MeshBasicMaterial({map: AM.cache.textures.refresh})
		);
		refresh.addBehavior( new altspace.utilities.behaviors.HoverScale() );
		refresh.addEventListener('cursorup', () => window.location.reload());
		this.add(refresh);

		// lay out buttons
		this.layOutChildren();
	}
	
	layOutChildren()
	{
		this.children.forEach((btn, i, arr) =>
		{
			let left = -(1+margin)*itemSize*(arr.length-1)/2;
			let each = (1+margin)*itemSize;

			btn.position.set(left+each*i, 0, 0);
		});
	}
}