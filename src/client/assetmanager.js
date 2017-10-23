import {activeTheme as theme} from './theme';

export default {
	manifest: {
		models: {
			table: '/static/model/table.gltf',
			nameplate: '/static/model/nameplate.dae',
			tophat: '/static/model/tophat.gltf',
			visorcap: '/static/model/visor_cap.gltf',
			//dummy: '/static/model/dummy.gltf',
			//playermeter: '/static/model/playermeter.gltf'
		},
		textures: {
			board_large: `/static/img/${theme}/board-large.jpg`,
			board_med: `/static/img/${theme}/board-medium.jpg`,
			board_small: `/static/img/${theme}/board-small.jpg`,
			cards: `/static/img/${theme}/cards.jpg`,
			reset: '/static/img/bomb.png',
			//text: '/static/img/text.png'
		}
	},
	cache: {},
	fixMaterials: function()
	{
		Object.keys(this.cache.models).forEach(id => {
			this.cache.models[id].traverse(obj => {
				if(obj.material instanceof THREE.MeshStandardMaterial){
					let newMat = new THREE.MeshBasicMaterial();
					newMat.map = obj.material.map;
					newMat.color.copy(obj.material.color);
					obj.material = newMat;
				}
			});
		});
	}
}
