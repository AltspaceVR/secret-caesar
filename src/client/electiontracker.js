import SH from './secrethitler';
import Animate from './animate';

const positions = [
	new THREE.Vector3(0.368, .005, -.717),
	new THREE.Vector3(0.135, .010, -.717),
	new THREE.Vector3(-.096, .015, -.717),
	new THREE.Vector3(-.329, .020, -.717)
];

export default class ElectionTracker extends THREE.Mesh
{
	constructor()
	{
		super(
			new THREE.CylinderBufferGeometry(.04, .04, .01, 16),
			new THREE.MeshBasicMaterial()
		);
		this.position.copy(positions[0]);
		SH.table.add(this);
		
		// fails%3 == 0 or 3?
		this.highSide = false;
		this.spot = 0;
		this.material.color.setHSL(.528, .31, .4);

		SH.addEventListener('update_failedVotes', this.updateFailedVotes.bind(this));
	}

	updateFailedVotes({data: {game: {failedVotes}}} = {data: {game: {failedVotes: -1}}})
	{
		if(failedVotes === -1)
			failedVotes = this.spot;

		this.highSide = failedVotes > 0;
		this.spot = failedVotes%3 || this.highSide && 3 || 0;

		this.anim = Animate.simple(this, {
			pos: positions[this.spot],
			scale: new THREE.Vector3(1, 1+this.spot, 1),
			hue: .528*(1-this.spot/3),
			duration: 1200
		});
	}
}