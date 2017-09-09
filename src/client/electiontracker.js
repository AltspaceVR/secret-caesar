import SH from './secrethitler';
import Animate from './animate';

const positions = [
	new THREE.Vector3(0.368, .015, -.717),
	new THREE.Vector3(0.135, .030, -.717),
	new THREE.Vector3(-.096, .045, -.717),
	new THREE.Vector3(-.329, .060, -.717)
];

export default class ElectionTracker extends THREE.Mesh
{
	constructor()
	{
		super(
			new THREE.CylinderBufferGeometry(.04, .04, .03, 16),
			new THREE.MeshBasicMaterial({color: 0x1919ff})
		);
		this.position.copy(positions[0]);
		SH.table.add(this);
		
		// fails%3 == 0 or 3?
		this.highSide = false;
		this.spot = 0;

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
			duration: 1200
		});
	}
}