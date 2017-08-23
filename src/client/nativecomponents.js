'use strict';

let placeholderGeo = new THREE.BoxBufferGeometry(.001, .001, .001);
let placeholderMat = new THREE.MeshBasicMaterial({color: 0xffffff, visible: false});
let PlaceholderMesh = new THREE.Mesh(placeholderGeo, placeholderMat);

class NativeComponent
{
	constructor(mesh, needsUpdate)
	{
		this.mesh = mesh;
		altspace.addNativeComponent(this.mesh, this.name);

		if(needsUpdate)
			this.update();
	}

	update(fields = {})
	{
		Object.assign(this.data, fields);
		altspace.updateNativeComponent(this.mesh, this.name, this.data);
	}

	destroy()
	{
		altspace.removeNativeComponent(this.mesh, this.name);
	}
}

class NText extends NativeComponent {
	constructor(mesh){
		this.name = 'n-text';
		this.data = {
			fontSize: 10,
			height: 1,
			width: 10,
			verticalAlign: 'middle',
			horizontalAlign: 'middle',
			text: ''
		};
		super(mesh, true);

		this.color = 'black';
	}
	update(fields = {}){
		if(fields.text)
			fields.text = `<color=${this.color}>${fields.text}</color>`;
		NativeComponent.prototype.update.call(this, fields);
	}
}

class NSkeletonParent extends NativeComponent {
	constructor(mesh){
		this.name = 'n-skeleton-parent';
		this.data = {
			index: 0,
			part: 'head',
			side: 'center', 
			userId: 0
		};
		super(mesh, true);
	}
}

class NBillboard extends NativeComponent {
	constructor(mesh){
		this.name = 'n-billboard';
		super(mesh, false);
	}
}

export {PlaceholderMesh, NText, NSkeletonParent, NBillboard};