import {activeTheme as theme} from './theme';

let themeModels = {
	caesar: {
		laurels: '/static/model/laurels.gltf'
	},
	hitler: {
		tophat: '/static/model/tophat.gltf',
		visorcap: '/static/model/visor_cap.gltf'
	}
};

let assets = {
	manifest: {
		models: Object.assign({
			table: '/static/model/table.gltf',
			nameplate: '/static/model/nameplate.dae',
			//dummy: '/static/model/dummy.gltf',
			//playermeter: '/static/model/playermeter.gltf'
		}, themeModels[theme]),
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
					newMat.transparent = obj.material.transparent;
					newMat.side = obj.material.side;
					obj.material = newMat;
				}
			});
		});
	}
}

export default assets;