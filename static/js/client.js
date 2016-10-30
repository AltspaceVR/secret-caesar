'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SecretHitler = function () {
	function SecretHitler() {
		_classCallCheck(this, SecretHitler);

		this.assets = {
			models: {},
			textures: {
				board: 'img/board-small.png'
			}
		};
	}

	_createClass(SecretHitler, [{
		key: 'initialize',
		value: function initialize(env, root, assets) {
			// create the table
			var mat = new THREE.MeshBasicMaterial({ map: assets.textures.board });
			var table = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
			root.add(table);
		}
	}]);

	return SecretHitler;
}();