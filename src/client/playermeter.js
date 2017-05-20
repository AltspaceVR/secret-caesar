'use strict';

import AM from './assetmanager';
import SH from './secrethitler';

export default class PlayerMeter extends THREE.Object3D
{
    constructor()
    {
        super();

        let model = AM.cache.models.playermeter;
        model.position.set(0, 0.15, 0);
        model.rotation.set(-Math.PI/2, 0, 0);
        model.scale.setScalar(0.8);

        // set up rainbow meter
        this.pm = model.children[0].children[0];
        this.pm.material.vertexColors = THREE.VertexColors;
        this.pm.material.color.set(0xffffff);
        this.pm.visible = false;

        // set up label
        this.label = model.children[0].children[1];
        this.label.visible = false;

        this.add(model);

        // set up gauge
        this.gauge = new THREE.Object3D();
        this.gauge.position.set(0, 0.15, 0);

        let wedgeMat = new THREE.MeshBasicMaterial({color: 0xc0c0c0});
        for(let i=0; i<4; i++){
            let wedge = new THREE.Mesh(new THREE.BufferGeometry(), wedgeMat);
            wedge.rotation.set(0, i*Math.PI/2, 0);
            this.gauge.add(wedge);
        }
        this.setMeterValue(0);
        this.add(this.gauge);

        SH.addEventListener('update_turnOrder', this.adjustPlayerCount.bind(this));
        this.addEventListener('cursorup', this.onclick.bind(this));
    }

    setMeterValue(val)
    {
        let wedgeGeo = new THREE.CylinderBufferGeometry(
            0.4, 0.4, 0.15, 40, 1, false, -Math.PI/4, (val/10)*Math.PI/2
        );
        this.gauge.children.forEach(o => { o.geometry = wedgeGeo; });
    }

    adjustPlayerCount({data: {game: {turnOrder, state}}})
    {
        if(state === 'setup'){
            this.setMeterValue(turnOrder.length);
            this.pm.visible = turnOrder.length >= 1;
            this.label.visible = turnOrder.length >= 5;
        }
        else {
            this.pm.visible = false;
            this.label.visible = false;
        }
    }

    onclick(evt)
    {
        let to = SH.game.turnOrder;
        if(SH.game.state === 'setup' && to.length >= 5 && to.length <= 10
            && to.includes(SH.localUser.id))
        {
            SH.socket.emit('start');
        }
    }
};
