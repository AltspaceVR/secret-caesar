'use strict';

export default class CapsuleGeometry extends THREE.BufferGeometry
{
	constructor(radius, height, segments = 12, rings = 8)
	{
		super();

		let numVerts = 2 * rings * segments + 2;
		let numFaces = 4 * rings * segments;
		let theta = 2*Math.PI/segments;
		let phi = Math.PI/(2*rings);

		let verts = new Float32Array(3*numVerts);
		let faces = new Uint16Array(3*numFaces);
		let vi = 0, fi = 0, topCap = 0, botCap = 1;

		verts.set([0, height/2, 0], 3*vi++);
		verts.set([0, -height/2, 0], 3*vi++);

		for( let s=0; s<segments; s++ )
		{
			for( let r=1; r<=rings; r++)
			{
				let radial = radius * Math.sin(r*phi);

				// create verts
				verts.set([
					radial * Math.cos(s*theta),
					height/2 - radius*(1-Math.cos(r*phi)),
					radial * Math.sin(s*theta)
				], 3*vi++);

				verts.set([
					radial * Math.cos(s*theta),
					-height/2 + radius*(1-Math.cos(r*phi)),
					radial * Math.sin(s*theta)
				], 3*vi++);

				let top_s1r1 = vi-2, top_s1r0 = vi-4;
				let bot_s1r1 = vi-1, bot_s1r0 = vi-3;
				let top_s0r1 = top_s1r1 - 2*rings, top_s0r0 = top_s1r0 - 2*rings;
				let bot_s0r1 = bot_s1r1 - 2*rings, bot_s0r0 = bot_s1r0 - 2*rings;
				if(s === 0){
					top_s0r1 += numVerts-2;
					top_s0r0 += numVerts-2;
					bot_s0r1 += numVerts-2;
					bot_s0r0 += numVerts-2;
				}

				// create faces
				if(r === 1)
				{
					faces.set([top_s1r1, topCap, top_s0r1], 3*fi++);
					faces.set([bot_s0r1, botCap, bot_s1r1], 3*fi++);
				}
				else
				{
					faces.set([top_s1r1, top_s1r0, top_s0r0], 3*fi++);
					faces.set([top_s1r1, top_s0r0, top_s0r1], 3*fi++);

					faces.set([bot_s1r1, bot_s0r1, bot_s0r0], 3*fi++);
					faces.set([bot_s1r1, bot_s0r0, bot_s1r0], 3*fi++);
				}
			}

			// create long sides
			let top_s1 = vi-2, top_s0 = top_s1 - 2*rings;
			let bot_s1 = vi-1, bot_s0 = bot_s1 - 2*rings;
			if(s === 0){
				top_s0 += numVerts-2;
				bot_s0 += numVerts-2;
			}

			faces.set([top_s1, top_s0, bot_s1], 3*fi++);
			faces.set([top_s0, bot_s0, bot_s1], 3*fi++);
		}

		this.addAttribute('position', new THREE.BufferAttribute(verts, 3));
		this.setIndex(new THREE.BufferAttribute(faces, 1));
	}
};
