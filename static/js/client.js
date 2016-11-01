'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SecretHitler = function () {
	function SecretHitler() {
		_classCallCheck(this, SecretHitler);

		this.assets = {
			models: {
				board: 'model/table.dae'
			},
			textures: {
				board: 'img/board-large-baked.png'
			}
		};
	}

	_createClass(SecretHitler, [{
		key: 'initialize',
		value: function initialize(env, root, assets) {
			// set root to the tabletop (1m from floor)
			window.root = root;
			var halfHeight = env.innerHeight / (2 * env.pixelsPerMeter);
			root.position.setY(-halfHeight);

			// create the table
			var table = assets.models.board;
			var mat = new THREE.MeshBasicMaterial({ map: assets.textures.board });
			table.children[0].material = mat;
			table.rotation.set(-Math.PI / 2, 0, 0);
			table.position.set(0, 1, 0);
			root.add(table);
		}
	}]);

	return SecretHitler;
}();