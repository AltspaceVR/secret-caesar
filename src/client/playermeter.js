'use strict';

import AM from './assetmanager';

export default class PlayerMeter extends THREE.Object3D
{
    constructor()
    {
        super();

        this.scale.set(0.4, 0.2, 0.15);

        // root offset for meter
        let mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            vertexColors: THREE.VertexColors
        });
        this.meter = AM.cache.models.playermeter;
        this.meter.rotation.set(Math.PI/2, 0, Math.PI/2);
        this.meter.traverse(o => {
            if(o instanceof THREE.Mesh)
                o.material = mat;
        });
        this.add(this.meter);

        this.setMeter(0);
    }

    setMeter(val)
    {

    }
};
