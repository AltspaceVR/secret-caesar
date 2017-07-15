var Diorama = (function () {
'use strict';

var originalGetTexture = THREE.TextureLoader.prototype.load;

function getTexture (url, resolve)
{
	if(this.forceLoad) { return originalGetTexture.call(this, url, resolve); }

	// construct absolute url
	if (url && !url.startsWith('http') && !url.startsWith('//')) {
		if (url.startsWith('/')) {
			url = location.origin + url;
		}
		else {
			var currPath = location.pathname;
			if (!currPath.endsWith('/')) {
				currPath = location.pathname.split('/').slice(0, -1).join('/') + '/';
			}
			url = location.origin + currPath + url;
		}
	}
	console.info('Allowing Altspace to load ' + url);
	var image = {src: url};
	var tex = new THREE.Texture(image);
	if (resolve) {
		resolve(tex);
	}
	return tex;
}

if(altspace.inClient)
{
	var noop = function () {};
	THREE.Loader.Handlers.add(/jpe?g|png/i, { load: getTexture, setCrossOrigin: noop });
	THREE.TextureLoader.prototype.load = getTexture;
}

var cache = {models: {}, textures: {}, posters: {}};

function ModelPromise(url)
{
	return new Promise(function (resolve, reject) {
		if(cache.models[url]){
			return resolve(cache.models[url]);
		}

		// NOTE: glTF loader does not catch errors
		else if(/\.gltf$/i.test(url)){
			if(THREE.glTFLoader){
				var loader = new THREE.glTFLoader();
				loader.load(url, function (result) {
					cache.models[url] = result.scene.children[0].children[0];
					return resolve(cache.models[url]);
				});
			}
			else if(THREE.GLTFLoader){
				var loader$1 = new THREE.GLTFLoader();
				loader$1.load(url, function (result) {
					cache.models[url] = result.scene.children[0];
					cache.models[url].matrixAutoUpdate = true;
					/*result.scene.traverse((o) => {
						if(o.material && o.material.map)
							console.log('flipY', o.material.map.flipY);
					});*/


					return resolve(cache.models[url]);
				}, function () {}, reject);
			}
			else {
				console.error(("glTF loader not found. \"" + url + "\" not loaded."));
				reject();
			}
		}

		else if(/\.dae$/i.test(url)){
			if(THREE.ColladaLoader){
				var loader$2 = new THREE.ColladaLoader();
				loader$2.load(url, function (result) {
					cache.models[url] = result.scene.children[0];
					return resolve(result.scene.children[0])
				}, null, reject);
			}
			else {
				console.error(("Collada loader not found. \"" + url + "\" not loaded."));
				reject();
			}
		}
	});
}

function TexturePromise(url, config){
	if ( config === void 0 ) config = {forceLoad: false};

	return new Promise(function (resolve, reject) {
		if(cache.textures[url])
			{ return resolve(cache.textures[url]); }
		else {
			var loader = new THREE.TextureLoader();
			loader.forceLoad = config.forceLoad;
			loader.load(url, function (texture) {
				cache.textures[url] = texture;
				return resolve(texture);
			}, null, reject);
		}
	});
}

function PosterPromise(url, ratio){
	if ( ratio === void 0 ) ratio = -1;

	return new Promise(function (resolve, reject) {
		if(cache.posters[url]){
			return resolve(cache.posters[url]);
		}
		else { return (new TexturePromise(url, {forceLoad: ratio < 0})).then(function (tex) {
				if(ratio < 0)
					{ ratio = tex.image.width / tex.image.height; }

				var geo, mat = new THREE.MeshBasicMaterial({map: tex, side: THREE.DoubleSide});

				if(ratio > 1){
					geo = new THREE.PlaneGeometry(1, 1/ratio);
				}
				else {
					geo = new THREE.PlaneGeometry(ratio, 1);
				}

				cache.posters[url] = new THREE.Mesh(geo, mat);
				return resolve(cache.posters[url]);
			}
		); }
	});
}

var PreviewCamera = (function (superclass) {
	function PreviewCamera(focus, viewSize, lookDirection)
	{
		superclass.call(this, -1, 1, 1, -1, .1, 400);

		var settings = window.localStorage.getItem('dioramaViewSettings');
		if(settings){
			settings = JSON.parse(settings);
			if(!focus)
				{ focus = new THREE.Vector3().fromArray(settings.focus); }
			if(!viewSize)
				{ viewSize = settings.viewSize; }
			if(!lookDirection)
				{ lookDirection = new THREE.Vector3().fromArray(settings.lookDirection); }
		}

		this._viewSize = viewSize || 40;
		this._focus = focus || new THREE.Vector3();
		this._lookDirection = lookDirection || new THREE.Vector3(0,-1,0);
		this.gridHelper = new THREE.GridHelper(300, 1);
		this.gridHelper.userData = {altspace: {collider: {enabled: false}}};
		//this.gridHelper.quaternion.setFromUnitVectors( new THREE.Vector3(0,-1,0), this._lookDirection );
	}

	if ( superclass ) PreviewCamera.__proto__ = superclass;
	PreviewCamera.prototype = Object.create( superclass && superclass.prototype );
	PreviewCamera.prototype.constructor = PreviewCamera;

	var prototypeAccessors = { viewSize: {},focus: {},lookDirection: {} };

	prototypeAccessors.viewSize.get = function (){
		return this._viewSize;
	};
	prototypeAccessors.viewSize.set = function (val){
		this._viewSize = val;
		this.recomputeViewport();
	};

	prototypeAccessors.focus.get = function (){
		return this._focus;
	};
	prototypeAccessors.focus.set = function (val){
		this._focus.copy(val);
		this.recomputeViewport();
	};

	prototypeAccessors.lookDirection.get = function (){
		return this._lookDirection;
	};
	prototypeAccessors.lookDirection.set = function (val){
		this._lookDirection.copy(val);
		this.recomputeViewport();
	};

	PreviewCamera.prototype.registerHooks = function registerHooks (renderer)
	{
		var self = this;
		self.renderer = renderer;

		// set styles on the page, so the preview works right
		document.body.parentElement.style.height = '100%';
		document.body.style.height = '100%';
		document.body.style.margin = '0';
		document.body.style.overflow = 'hidden';

		var info = document.createElement('p');
		info.innerHTML = ['Middle click and drag to pan', 'Mouse wheel to zoom', 'Arrow keys to rotate'].join('<br/>');
		Object.assign(info.style, {
			position: 'fixed',
			top: '10px',
			left: '10px',
			margin: 0
		});
		document.body.appendChild(info);

		// resize the preview canvas when window resizes
		window.addEventListener('resize', function (e) { return self.recomputeViewport(); });
		self.recomputeViewport();

		// middle click and drag to pan view
		var dragStart = null, focusStart = null;
		window.addEventListener('mousedown', function (e) {
			if(e.button === 1){
				dragStart = {x: e.clientX, y: e.clientY};
				focusStart = self._focus.clone();
			}
		});
		window.addEventListener('mouseup', function (e) {
			if(e.button === 1){
				dragStart = null;
				focusStart = null;
			}
		});
		window.addEventListener('mousemove', function (e) {
			if(dragStart)
			{
				var ref = document.body;
				var w = ref.clientWidth;
				var h = ref.clientHeight;
				var pixelsPerMeter = Math.sqrt(w*w+h*h) / self._viewSize;
				var dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
				var right = new THREE.Vector3().crossVectors(self._lookDirection, self.up);

				self._focus.copy(focusStart)
					.add(self.up.clone().multiplyScalar(dy/pixelsPerMeter))
					.add(right.multiplyScalar(-dx/pixelsPerMeter));

				self.recomputeViewport();
			}
		});

		// wheel to zoom
		window.addEventListener('wheel', function (e) {
			if(e.deltaY < 0){
				self._viewSize *= 0.90;
				self.recomputeViewport();
			}
			else if(e.deltaY > 0){
				self._viewSize *= 1.1;
				self.recomputeViewport();
			}
		});

		// arrow keys to rotate
		window.addEventListener('keydown', function (e) {
			if(e.key === 'ArrowDown'){
				var right = new THREE.Vector3().crossVectors(self._lookDirection, self.up);
				self._lookDirection.applyAxisAngle(right, Math.PI/2);
				//self.gridHelper.rotateOnAxis(right, Math.PI/2);
				self.recomputeViewport();
			}
			else if(e.key === 'ArrowUp'){
				var right$1 = new THREE.Vector3().crossVectors(self._lookDirection, self.up);
				self._lookDirection.applyAxisAngle(right$1, -Math.PI/2);
				//self.gridHelper.rotateOnAxis(right, -Math.PI/2);
				self.recomputeViewport();

			}
			else if(e.key === 'ArrowLeft'){
				self._lookDirection.applyAxisAngle(self.up, -Math.PI/2);
				//self.gridHelper.rotateOnAxis(self.up, -Math.PI/2);
				self.recomputeViewport();
			}
			else if(e.key === 'ArrowRight'){
				self._lookDirection.applyAxisAngle(self.up, Math.PI/2);
				//self.gridHelper.rotateOnAxis(self.up, Math.PI/2);
				self.recomputeViewport();
			}
		});
	};

	PreviewCamera.prototype.recomputeViewport = function recomputeViewport ()
	{
		var ref = document.body;
		var w = ref.clientWidth;
		var h = ref.clientHeight;

		// resize canvas
		this.renderer.setSize(w, h);

		// compute window dimensions from view size
		var ratio = w/h;
		var height = Math.sqrt( (this._viewSize*this._viewSize) / (ratio*ratio + 1) );
		var width = ratio * height;

		// set frustrum edges
		this.left = -width/2;
		this.right = width/2;
		this.top = height/2;
		this.bottom = -height/2;

		this.updateProjectionMatrix();

		// update position
		this.position.copy(this._focus).sub( this._lookDirection.clone().multiplyScalar(200) );
		if( Math.abs( this._lookDirection.normalize().dot(new THREE.Vector3(0,-1,0)) ) === 1 )
			{ this.up.set(0,0,1); } // if we're looking down the Y axis
		else
			{ this.up.set(0,1,0); }
		this.lookAt( this._focus );

		window.localStorage.setItem('dioramaViewSettings', JSON.stringify({
			focus: this._focus.toArray(),
			viewSize: this._viewSize,
			lookDirection: this._lookDirection.toArray()
		}));
	};

	Object.defineProperties( PreviewCamera.prototype, prototypeAccessors );

	return PreviewCamera;
}(THREE.OrthographicCamera));

var Diorama = function Diorama(ref)
{
	if ( ref === void 0 ) ref = {};
	var bgColor = ref.bgColor; if ( bgColor === void 0 ) bgColor = 0xaaaaaa;
	var gridOffset = ref.gridOffset; if ( gridOffset === void 0 ) gridOffset = [0,0,0];
	var fullspace = ref.fullspace; if ( fullspace === void 0 ) fullspace = false;
	var rendererOptions = ref.rendererOptions; if ( rendererOptions === void 0 ) rendererOptions = {};

	var self = this;
	self._cache = cache;
	self.scene = new THREE.Scene();

	// set up renderer and scale
	if(altspace.inClient)
	{
		self.renderer = altspace.getThreeJSRenderer(rendererOptions);
		self._envPromise = Promise.all([altspace.getEnclosure(), altspace.getSpace()])
		.then(function (ref) {
			var e = ref[0];
			var s = ref[1];


			function adjustScale(){
				self.scene.scale.setScalar(e.pixelsPerMeter);
				self.env = Object.assign({}, e, s);
			}
			adjustScale();

			if(fullspace){
				self._fsPromise = e.requestFullspace().catch(function (e) { return console.warn('Request for fullspace denied'); });
				e.addEventListener('fullspacechange', adjustScale);
			}
			else
				{ self._fsPromise = Promise.resolve(); }
		});
	}
	else
	{
		// set up preview renderer, in case we're out of world
		self.renderer = new THREE.WebGLRenderer();
		self.renderer.setSize(document.body.clientWidth, document.body.clientHeight);
		self.renderer.setClearColor( bgColor );
		document.body.appendChild(self.renderer.domElement);

		self.previewCamera = new PreviewCamera();
		self.previewCamera.gridHelper.position.fromArray(gridOffset);
		self.scene.add(self.previewCamera, self.previewCamera.gridHelper);
		self.previewCamera.registerHooks(self.renderer);

		// set up cursor emulation
		altspace.utilities.shims.cursor.init(self.scene, self.previewCamera, {renderer: self.renderer});

		// stub environment
		self.env = {
			innerWidth: 1024,
			innerHeight: 1024,
			innerDepth: 1024,
			pixelsPerMeter: fullspace ? 1 : 1024/3,
			sid: 'browser',
			name: 'browser',
			templateSid: 'browser'
		};

		self._envPromise = Promise.resolve();
		self._fsPromise = Promise.resolve();
	}
};


Diorama.prototype.start = function start ()
{
		var modules = [], len = arguments.length;
		while ( len-- ) modules[ len ] = arguments[ len ];

	var self = this;

	// determine which assets aren't shared
	var singletons = {};
	modules.forEach(function (mod) {
		function checkAsset(url){
			if(singletons[url] === undefined) { singletons[url] = true; }
			else if(singletons[url] === true) { singletons[url] = false; }
		}
		Object.keys(mod.assets.textures || {}).map(function (k) { return mod.assets.textures[k]; }).forEach(checkAsset);
		Object.keys(mod.assets.models || {}).map(function (k) { return mod.assets.models[k]; }).forEach(checkAsset);
		Object.keys(mod.assets.posters || {}).map(function (k) { return mod.assets.posters[k]; }).forEach(checkAsset);
	});

	// determine if the tracking skeleton is needed
	var needsSkeleton = modules.reduce(function (ns,m) { return ns || m.needsSkeleton; }, false);
	if(needsSkeleton && altspace.inClient){
		self._skelPromise = Promise.all([
			altspace.getThreeJSTrackingSkeleton(),
			self._envPromise
		]).then(function (ref) {
				var skel = ref[0];
				var _ = ref[1];

			self.scene.add(skel);
			self.env.skel = skel;
			self.env = Object.freeze(self.env);
		});
	}
	else {
		self._envPromise.then(function () {
			self.env = Object.freeze(self.env);
		});
		self._skelPromise = Promise.resolve();
	}

	Promise.all([self._envPromise, self._fsPromise, self._skelPromise]).then(function () {
		// construct dioramas
		modules.forEach(function(module)
		{
			var root = null;

			if(module instanceof THREE.Object3D){
				root = module;
			}
			else
			{
				root = new THREE.Object3D();

				// handle absolute positioning
				if(module.transform){
					root.matrix.fromArray(module.transform);
					root.matrix.decompose(root.position, root.quaternion, root.scale);
				}
				else {
					if(module.position){
						root.position.fromArray(module.position);
					}
					if(module.rotation){
						root.rotation.fromArray(module.rotation);
					}
				}
			}

			// handle relative positioning
			if(module.verticalAlign){
				var halfHeight = self.env.innerHeight/(2*self.env.pixelsPerMeter);
				switch(module.verticalAlign){
				case 'top':
					root.translateY(halfHeight);
					break;
				case 'bottom':
					root.translateY(-halfHeight);
					break;
				case 'middle':
					// default
					break;
				default:
					console.warn('Invalid value for "verticalAlign" - ', module.verticalAlign);
					break;
				}
			}

			self.scene.add(root);

			if(self.previewCamera){
				var axis = new THREE.AxisHelper(1);
				axis.userData.altspace = {collider: {enabled: false}};
				root.add(axis);
			}

			self.loadAssets(module.assets, singletons).then(function (results) {
				module.initialize(self.env, root, results);
			});
		});
	});

	// start animating
	window.requestAnimationFrame(function animate(timestamp)
	{
		window.requestAnimationFrame(animate);
		self.scene.updateAllBehaviors();
		if(window.TWEEN) { TWEEN.update(); }
		self.renderer.render(self.scene, self.previewCamera);
	});
};

Diorama.prototype.loadAssets = function loadAssets (manifest, singletons)
{
	var self = this;

	return new Promise(function (resolve, reject) {
		// populate cache
		Promise.all(Object.keys(manifest.models || {}).map(function (id) { return ModelPromise(manifest.models[id]); }).concat( Object.keys(manifest.textures || {}).map(function (id) { return TexturePromise(manifest.textures[id]); }),

			// generate all posters
			Object.keys(manifest.posters || {}).map(function (id) { return PosterPromise(manifest.posters[id]); })
		))

		.then(function () {
			// populate payload from cache
			var payload = {models: {}, textures: {}, posters: {}};

			for(var i in manifest.models){
				var url = manifest.models[i];
				var t = cache.models[url];
				payload.models[i] = t ? singletons[url] ? t : t.clone() : null;
			}

			for(var i$1 in manifest.textures){
				var url$1 = manifest.textures[i$1];
				var t$1 = cache.textures[url$1];
				payload.textures[i$1] = t$1 ? singletons[url$1] ? t$1 : t$1.clone() : null;
			}

			for(var i$2 in manifest.posters){
				var url$2 = manifest.posters[i$2];
				var t$2 = cache.posters[url$2];
				payload.posters[i$2] = t$2 ? singletons[url$2] ? t$2 : t$2.clone() : null;
			}

			resolve(payload);
		})
		.catch(function (e) { return console.error(e.stack); });
	});
};

return Diorama;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uL3NyYy9sb2FkZXJzLmpzIiwiLi4vc3JjL2NhbWVyYS5qcyIsIi4uL3NyYy9tYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxubGV0IG9yaWdpbmFsR2V0VGV4dHVyZSA9IFRIUkVFLlRleHR1cmVMb2FkZXIucHJvdG90eXBlLmxvYWQ7XG5cbmZ1bmN0aW9uIGdldFRleHR1cmUgKHVybCwgcmVzb2x2ZSlcbntcblx0aWYodGhpcy5mb3JjZUxvYWQpIHJldHVybiBvcmlnaW5hbEdldFRleHR1cmUuY2FsbCh0aGlzLCB1cmwsIHJlc29sdmUpO1xuXG5cdC8vIGNvbnN0cnVjdCBhYnNvbHV0ZSB1cmxcblx0aWYgKHVybCAmJiAhdXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKSAmJiAhdXJsLnN0YXJ0c1dpdGgoJy8vJykpIHtcblx0XHRpZiAodXJsLnN0YXJ0c1dpdGgoJy8nKSkge1xuXHRcdFx0dXJsID0gbG9jYXRpb24ub3JpZ2luICsgdXJsO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHZhciBjdXJyUGF0aCA9IGxvY2F0aW9uLnBhdGhuYW1lO1xuXHRcdFx0aWYgKCFjdXJyUGF0aC5lbmRzV2l0aCgnLycpKSB7XG5cdFx0XHRcdGN1cnJQYXRoID0gbG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKS5zbGljZSgwLCAtMSkuam9pbignLycpICsgJy8nO1xuXHRcdFx0fVxuXHRcdFx0dXJsID0gbG9jYXRpb24ub3JpZ2luICsgY3VyclBhdGggKyB1cmw7XG5cdFx0fVxuXHR9XG5cdGNvbnNvbGUuaW5mbygnQWxsb3dpbmcgQWx0c3BhY2UgdG8gbG9hZCAnICsgdXJsKTtcblx0dmFyIGltYWdlID0ge3NyYzogdXJsfTtcblx0dmFyIHRleCA9IG5ldyBUSFJFRS5UZXh0dXJlKGltYWdlKTtcblx0aWYgKHJlc29sdmUpIHtcblx0XHRyZXNvbHZlKHRleCk7XG5cdH1cblx0cmV0dXJuIHRleDtcbn1cblxuaWYoYWx0c3BhY2UuaW5DbGllbnQpXG57XG5cdGxldCBub29wID0gKCkgPT4ge307XG5cdFRIUkVFLkxvYWRlci5IYW5kbGVycy5hZGQoL2pwZT9nfHBuZy9pLCB7IGxvYWQ6IGdldFRleHR1cmUsIHNldENyb3NzT3JpZ2luOiBub29wIH0pO1xuXHRUSFJFRS5UZXh0dXJlTG9hZGVyLnByb3RvdHlwZS5sb2FkID0gZ2V0VGV4dHVyZTtcbn1cblxubGV0IGNhY2hlID0ge21vZGVsczoge30sIHRleHR1cmVzOiB7fSwgcG9zdGVyczoge319O1xuXG5mdW5jdGlvbiBNb2RlbFByb21pc2UodXJsKVxue1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cblx0e1xuXHRcdGlmKGNhY2hlLm1vZGVsc1t1cmxdKXtcblx0XHRcdHJldHVybiByZXNvbHZlKGNhY2hlLm1vZGVsc1t1cmxdKTtcblx0XHR9XG5cblx0XHQvLyBOT1RFOiBnbFRGIGxvYWRlciBkb2VzIG5vdCBjYXRjaCBlcnJvcnNcblx0XHRlbHNlIGlmKC9cXC5nbHRmJC9pLnRlc3QodXJsKSl7XG5cdFx0XHRpZihUSFJFRS5nbFRGTG9hZGVyKXtcblx0XHRcdFx0bGV0IGxvYWRlciA9IG5ldyBUSFJFRS5nbFRGTG9hZGVyKCk7XG5cdFx0XHRcdGxvYWRlci5sb2FkKHVybCwgKHJlc3VsdCkgPT4ge1xuXHRcdFx0XHRcdGNhY2hlLm1vZGVsc1t1cmxdID0gcmVzdWx0LnNjZW5lLmNoaWxkcmVuWzBdLmNoaWxkcmVuWzBdO1xuXHRcdFx0XHRcdHJldHVybiByZXNvbHZlKGNhY2hlLm1vZGVsc1t1cmxdKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKFRIUkVFLkdMVEZMb2FkZXIpe1xuXHRcdFx0XHRsZXQgbG9hZGVyID0gbmV3IFRIUkVFLkdMVEZMb2FkZXIoKTtcblx0XHRcdFx0bG9hZGVyLmxvYWQodXJsLCByZXN1bHQgPT4ge1xuXHRcdFx0XHRcdGNhY2hlLm1vZGVsc1t1cmxdID0gcmVzdWx0LnNjZW5lLmNoaWxkcmVuWzBdO1xuXHRcdFx0XHRcdGNhY2hlLm1vZGVsc1t1cmxdLm1hdHJpeEF1dG9VcGRhdGUgPSB0cnVlO1xuXHRcdFx0XHRcdC8qcmVzdWx0LnNjZW5lLnRyYXZlcnNlKChvKSA9PiB7XG5cdFx0XHRcdFx0XHRpZihvLm1hdGVyaWFsICYmIG8ubWF0ZXJpYWwubWFwKVxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZmxpcFknLCBvLm1hdGVyaWFsLm1hcC5mbGlwWSk7XG5cdFx0XHRcdFx0fSk7Ki9cblxuXG5cdFx0XHRcdFx0cmV0dXJuIHJlc29sdmUoY2FjaGUubW9kZWxzW3VybF0pO1xuXHRcdFx0XHR9LCAoKSA9PiB7fSwgcmVqZWN0KTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKGBnbFRGIGxvYWRlciBub3QgZm91bmQuIFwiJHt1cmx9XCIgbm90IGxvYWRlZC5gKTtcblx0XHRcdFx0cmVqZWN0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZWxzZSBpZigvXFwuZGFlJC9pLnRlc3QodXJsKSl7XG5cdFx0XHRpZihUSFJFRS5Db2xsYWRhTG9hZGVyKXtcblx0XHRcdFx0bGV0IGxvYWRlciA9IG5ldyBUSFJFRS5Db2xsYWRhTG9hZGVyKCk7XG5cdFx0XHRcdGxvYWRlci5sb2FkKHVybCwgcmVzdWx0ID0+IHtcblx0XHRcdFx0XHRjYWNoZS5tb2RlbHNbdXJsXSA9IHJlc3VsdC5zY2VuZS5jaGlsZHJlblswXTtcblx0XHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShyZXN1bHQuc2NlbmUuY2hpbGRyZW5bMF0pXG5cdFx0XHRcdH0sIG51bGwsIHJlamVjdCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcihgQ29sbGFkYSBsb2FkZXIgbm90IGZvdW5kLiBcIiR7dXJsfVwiIG5vdCBsb2FkZWQuYCk7XG5cdFx0XHRcdHJlamVjdCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIFRleHR1cmVQcm9taXNlKHVybCwgY29uZmlnID0ge2ZvcmNlTG9hZDogZmFsc2V9KXtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XG5cdHtcblx0XHRpZihjYWNoZS50ZXh0dXJlc1t1cmxdKVxuXHRcdFx0cmV0dXJuIHJlc29sdmUoY2FjaGUudGV4dHVyZXNbdXJsXSk7XG5cdFx0ZWxzZSB7XG5cdFx0XHRsZXQgbG9hZGVyID0gbmV3IFRIUkVFLlRleHR1cmVMb2FkZXIoKTtcblx0XHRcdGxvYWRlci5mb3JjZUxvYWQgPSBjb25maWcuZm9yY2VMb2FkO1xuXHRcdFx0bG9hZGVyLmxvYWQodXJsLCB0ZXh0dXJlID0+IHtcblx0XHRcdFx0Y2FjaGUudGV4dHVyZXNbdXJsXSA9IHRleHR1cmU7XG5cdFx0XHRcdHJldHVybiByZXNvbHZlKHRleHR1cmUpO1xuXHRcdFx0fSwgbnVsbCwgcmVqZWN0KTtcblx0XHR9XG5cdH0pO1xufVxuXG5jbGFzcyBWaWRlb1Byb21pc2UgZXh0ZW5kcyBQcm9taXNlIHtcblx0Y29uc3RydWN0b3IodXJsKVxuXHR7XG5cdFx0Ly8gc3RhcnQgbG9hZGVyXG5cdFx0dmFyIHZpZFNyYyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJyk7XG5cdFx0dmlkU3JjLmF1dG9wbGF5ID0gdHJ1ZTtcblx0XHR2aWRTcmMubG9vcCA9IHRydWU7XG5cdFx0dmlkU3JjLnNyYyA9IHVybDtcblx0XHR2aWRTcmMuc3R5bGUuZGlzcGxheSA9ICdub25lJztcblx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHZpZFNyYyk7XG5cblx0XHR2YXIgdGV4ID0gbmV3IFRIUkVFLlZpZGVvVGV4dHVyZSh2aWRTcmMpO1xuXHRcdHRleC5taW5GaWx0ZXIgPSBUSFJFRS5MaW5lYXJGaWx0ZXI7XG5cdFx0dGV4Lm1hZ0ZpbHRlciA9IFRIUkVFLkxpbmVhckZpbHRlcjtcblx0XHR0ZXguZm9ybWF0ID0gVEhSRUUuUkdCRm9ybWF0O1xuXG5cdFx0Ly9jYWNoZS52aWRlb3NbdXJsXSA9IHRleDtcblx0XHQvL3BheWxvYWQudmlkZW9zW2lkXSA9IGNhY2hlLnZpZGVvc1t1cmxdO1xuXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh0ZXgpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIFBvc3RlclByb21pc2UodXJsLCByYXRpbyA9IC0xKXtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XG5cdHtcblx0XHRpZihjYWNoZS5wb3N0ZXJzW3VybF0pe1xuXHRcdFx0cmV0dXJuIHJlc29sdmUoY2FjaGUucG9zdGVyc1t1cmxdKTtcblx0XHR9XG5cdFx0ZWxzZSByZXR1cm4gKG5ldyBUZXh0dXJlUHJvbWlzZSh1cmwsIHtmb3JjZUxvYWQ6IHJhdGlvIDwgMH0pKS50aGVuKHRleCA9PlxuXHRcdFx0e1xuXHRcdFx0XHRpZihyYXRpbyA8IDApXG5cdFx0XHRcdFx0cmF0aW8gPSB0ZXguaW1hZ2Uud2lkdGggLyB0ZXguaW1hZ2UuaGVpZ2h0O1xuXG5cdFx0XHRcdGxldCBnZW8sIG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiB0ZXgsIHNpZGU6IFRIUkVFLkRvdWJsZVNpZGV9KTtcblxuXHRcdFx0XHRpZihyYXRpbyA+IDEpe1xuXHRcdFx0XHRcdGdlbyA9IG5ldyBUSFJFRS5QbGFuZUdlb21ldHJ5KDEsIDEvcmF0aW8pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGdlbyA9IG5ldyBUSFJFRS5QbGFuZUdlb21ldHJ5KHJhdGlvLCAxKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhY2hlLnBvc3RlcnNbdXJsXSA9IG5ldyBUSFJFRS5NZXNoKGdlbywgbWF0KTtcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUoY2FjaGUucG9zdGVyc1t1cmxdKTtcblx0XHRcdH1cblx0XHQpO1xuXHR9KTtcbn1cblxuZXhwb3J0IHsgTW9kZWxQcm9taXNlLCBUZXh0dXJlUHJvbWlzZSwgVmlkZW9Qcm9taXNlLCBQb3N0ZXJQcm9taXNlLCBjYWNoZSBhcyBfY2FjaGUgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUHJldmlld0NhbWVyYSBleHRlbmRzIFRIUkVFLk9ydGhvZ3JhcGhpY0NhbWVyYVxue1xuXHRjb25zdHJ1Y3Rvcihmb2N1cywgdmlld1NpemUsIGxvb2tEaXJlY3Rpb24pXG5cdHtcblx0XHRzdXBlcigtMSwgMSwgMSwgLTEsIC4xLCA0MDApO1xuXG5cdFx0bGV0IHNldHRpbmdzID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdkaW9yYW1hVmlld1NldHRpbmdzJyk7XG5cdFx0aWYoc2V0dGluZ3Mpe1xuXHRcdFx0c2V0dGluZ3MgPSBKU09OLnBhcnNlKHNldHRpbmdzKTtcblx0XHRcdGlmKCFmb2N1cylcblx0XHRcdFx0Zm9jdXMgPSBuZXcgVEhSRUUuVmVjdG9yMygpLmZyb21BcnJheShzZXR0aW5ncy5mb2N1cyk7XG5cdFx0XHRpZighdmlld1NpemUpXG5cdFx0XHRcdHZpZXdTaXplID0gc2V0dGluZ3Mudmlld1NpemU7XG5cdFx0XHRpZighbG9va0RpcmVjdGlvbilcblx0XHRcdFx0bG9va0RpcmVjdGlvbiA9IG5ldyBUSFJFRS5WZWN0b3IzKCkuZnJvbUFycmF5KHNldHRpbmdzLmxvb2tEaXJlY3Rpb24pO1xuXHRcdH1cblxuXHRcdHRoaXMuX3ZpZXdTaXplID0gdmlld1NpemUgfHwgNDA7XG5cdFx0dGhpcy5fZm9jdXMgPSBmb2N1cyB8fCBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXHRcdHRoaXMuX2xvb2tEaXJlY3Rpb24gPSBsb29rRGlyZWN0aW9uIHx8IG5ldyBUSFJFRS5WZWN0b3IzKDAsLTEsMCk7XG5cdFx0dGhpcy5ncmlkSGVscGVyID0gbmV3IFRIUkVFLkdyaWRIZWxwZXIoMzAwLCAxKTtcblx0XHR0aGlzLmdyaWRIZWxwZXIudXNlckRhdGEgPSB7YWx0c3BhY2U6IHtjb2xsaWRlcjoge2VuYWJsZWQ6IGZhbHNlfX19O1xuXHRcdC8vdGhpcy5ncmlkSGVscGVyLnF1YXRlcm5pb24uc2V0RnJvbVVuaXRWZWN0b3JzKCBuZXcgVEhSRUUuVmVjdG9yMygwLC0xLDApLCB0aGlzLl9sb29rRGlyZWN0aW9uICk7XG5cdH1cblxuXHRnZXQgdmlld1NpemUoKXtcblx0XHRyZXR1cm4gdGhpcy5fdmlld1NpemU7XG5cdH1cblx0c2V0IHZpZXdTaXplKHZhbCl7XG5cdFx0dGhpcy5fdmlld1NpemUgPSB2YWw7XG5cdFx0dGhpcy5yZWNvbXB1dGVWaWV3cG9ydCgpO1xuXHR9XG5cblx0Z2V0IGZvY3VzKCl7XG5cdFx0cmV0dXJuIHRoaXMuX2ZvY3VzO1xuXHR9XG5cdHNldCBmb2N1cyh2YWwpe1xuXHRcdHRoaXMuX2ZvY3VzLmNvcHkodmFsKTtcblx0XHR0aGlzLnJlY29tcHV0ZVZpZXdwb3J0KCk7XG5cdH1cblxuXHRnZXQgbG9va0RpcmVjdGlvbigpe1xuXHRcdHJldHVybiB0aGlzLl9sb29rRGlyZWN0aW9uO1xuXHR9XG5cdHNldCBsb29rRGlyZWN0aW9uKHZhbCl7XG5cdFx0dGhpcy5fbG9va0RpcmVjdGlvbi5jb3B5KHZhbCk7XG5cdFx0dGhpcy5yZWNvbXB1dGVWaWV3cG9ydCgpO1xuXHR9XG5cblx0cmVnaXN0ZXJIb29rcyhyZW5kZXJlcilcblx0e1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRzZWxmLnJlbmRlcmVyID0gcmVuZGVyZXI7XG5cblx0XHQvLyBzZXQgc3R5bGVzIG9uIHRoZSBwYWdlLCBzbyB0aGUgcHJldmlldyB3b3JrcyByaWdodFxuXHRcdGRvY3VtZW50LmJvZHkucGFyZW50RWxlbWVudC5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XG5cdFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XG5cdFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5tYXJnaW4gPSAnMCc7XG5cdFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuXG5cdFx0dmFyIGluZm8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG5cdFx0aW5mby5pbm5lckhUTUwgPSBbJ01pZGRsZSBjbGljayBhbmQgZHJhZyB0byBwYW4nLCAnTW91c2Ugd2hlZWwgdG8gem9vbScsICdBcnJvdyBrZXlzIHRvIHJvdGF0ZSddLmpvaW4oJzxici8+Jyk7XG5cdFx0T2JqZWN0LmFzc2lnbihpbmZvLnN0eWxlLCB7XG5cdFx0XHRwb3NpdGlvbjogJ2ZpeGVkJyxcblx0XHRcdHRvcDogJzEwcHgnLFxuXHRcdFx0bGVmdDogJzEwcHgnLFxuXHRcdFx0bWFyZ2luOiAwXG5cdFx0fSk7XG5cdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChpbmZvKTtcblxuXHRcdC8vIHJlc2l6ZSB0aGUgcHJldmlldyBjYW52YXMgd2hlbiB3aW5kb3cgcmVzaXplc1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBlID0+IHNlbGYucmVjb21wdXRlVmlld3BvcnQoKSk7XG5cdFx0c2VsZi5yZWNvbXB1dGVWaWV3cG9ydCgpO1xuXG5cdFx0Ly8gbWlkZGxlIGNsaWNrIGFuZCBkcmFnIHRvIHBhbiB2aWV3XG5cdFx0dmFyIGRyYWdTdGFydCA9IG51bGwsIGZvY3VzU3RhcnQgPSBudWxsO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBlID0+IHtcblx0XHRcdGlmKGUuYnV0dG9uID09PSAxKXtcblx0XHRcdFx0ZHJhZ1N0YXJ0ID0ge3g6IGUuY2xpZW50WCwgeTogZS5jbGllbnRZfTtcblx0XHRcdFx0Zm9jdXNTdGFydCA9IHNlbGYuX2ZvY3VzLmNsb25lKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBlID0+IHtcblx0XHRcdGlmKGUuYnV0dG9uID09PSAxKXtcblx0XHRcdFx0ZHJhZ1N0YXJ0ID0gbnVsbDtcblx0XHRcdFx0Zm9jdXNTdGFydCA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGUgPT4ge1xuXHRcdFx0aWYoZHJhZ1N0YXJ0KVxuXHRcdFx0e1xuXHRcdFx0XHRsZXQge2NsaWVudFdpZHRoOiB3LCBjbGllbnRIZWlnaHQ6IGh9ID0gZG9jdW1lbnQuYm9keTtcblx0XHRcdFx0bGV0IHBpeGVsc1Blck1ldGVyID0gTWF0aC5zcXJ0KHcqdytoKmgpIC8gc2VsZi5fdmlld1NpemU7XG5cdFx0XHRcdGxldCBkeCA9IGUuY2xpZW50WCAtIGRyYWdTdGFydC54LCBkeSA9IGUuY2xpZW50WSAtIGRyYWdTdGFydC55O1xuXHRcdFx0XHRsZXQgcmlnaHQgPSBuZXcgVEhSRUUuVmVjdG9yMygpLmNyb3NzVmVjdG9ycyhzZWxmLl9sb29rRGlyZWN0aW9uLCBzZWxmLnVwKTtcblxuXHRcdFx0XHRzZWxmLl9mb2N1cy5jb3B5KGZvY3VzU3RhcnQpXG5cdFx0XHRcdFx0LmFkZChzZWxmLnVwLmNsb25lKCkubXVsdGlwbHlTY2FsYXIoZHkvcGl4ZWxzUGVyTWV0ZXIpKVxuXHRcdFx0XHRcdC5hZGQocmlnaHQubXVsdGlwbHlTY2FsYXIoLWR4L3BpeGVsc1Blck1ldGVyKSk7XG5cblx0XHRcdFx0c2VsZi5yZWNvbXB1dGVWaWV3cG9ydCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gd2hlZWwgdG8gem9vbVxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd3aGVlbCcsIGUgPT4ge1xuXHRcdFx0aWYoZS5kZWx0YVkgPCAwKXtcblx0XHRcdFx0c2VsZi5fdmlld1NpemUgKj0gMC45MDtcblx0XHRcdFx0c2VsZi5yZWNvbXB1dGVWaWV3cG9ydCgpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZihlLmRlbHRhWSA+IDApe1xuXHRcdFx0XHRzZWxmLl92aWV3U2l6ZSAqPSAxLjE7XG5cdFx0XHRcdHNlbGYucmVjb21wdXRlVmlld3BvcnQoKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIGFycm93IGtleXMgdG8gcm90YXRlXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBlID0+IHtcblx0XHRcdGlmKGUua2V5ID09PSAnQXJyb3dEb3duJyl7XG5cdFx0XHRcdGxldCByaWdodCA9IG5ldyBUSFJFRS5WZWN0b3IzKCkuY3Jvc3NWZWN0b3JzKHNlbGYuX2xvb2tEaXJlY3Rpb24sIHNlbGYudXApO1xuXHRcdFx0XHRzZWxmLl9sb29rRGlyZWN0aW9uLmFwcGx5QXhpc0FuZ2xlKHJpZ2h0LCBNYXRoLlBJLzIpO1xuXHRcdFx0XHQvL3NlbGYuZ3JpZEhlbHBlci5yb3RhdGVPbkF4aXMocmlnaHQsIE1hdGguUEkvMik7XG5cdFx0XHRcdHNlbGYucmVjb21wdXRlVmlld3BvcnQoKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYoZS5rZXkgPT09ICdBcnJvd1VwJyl7XG5cdFx0XHRcdGxldCByaWdodCA9IG5ldyBUSFJFRS5WZWN0b3IzKCkuY3Jvc3NWZWN0b3JzKHNlbGYuX2xvb2tEaXJlY3Rpb24sIHNlbGYudXApO1xuXHRcdFx0XHRzZWxmLl9sb29rRGlyZWN0aW9uLmFwcGx5QXhpc0FuZ2xlKHJpZ2h0LCAtTWF0aC5QSS8yKTtcblx0XHRcdFx0Ly9zZWxmLmdyaWRIZWxwZXIucm90YXRlT25BeGlzKHJpZ2h0LCAtTWF0aC5QSS8yKTtcblx0XHRcdFx0c2VsZi5yZWNvbXB1dGVWaWV3cG9ydCgpO1xuXG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKGUua2V5ID09PSAnQXJyb3dMZWZ0Jyl7XG5cdFx0XHRcdHNlbGYuX2xvb2tEaXJlY3Rpb24uYXBwbHlBeGlzQW5nbGUoc2VsZi51cCwgLU1hdGguUEkvMik7XG5cdFx0XHRcdC8vc2VsZi5ncmlkSGVscGVyLnJvdGF0ZU9uQXhpcyhzZWxmLnVwLCAtTWF0aC5QSS8yKTtcblx0XHRcdFx0c2VsZi5yZWNvbXB1dGVWaWV3cG9ydCgpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZihlLmtleSA9PT0gJ0Fycm93UmlnaHQnKXtcblx0XHRcdFx0c2VsZi5fbG9va0RpcmVjdGlvbi5hcHBseUF4aXNBbmdsZShzZWxmLnVwLCBNYXRoLlBJLzIpO1xuXHRcdFx0XHQvL3NlbGYuZ3JpZEhlbHBlci5yb3RhdGVPbkF4aXMoc2VsZi51cCwgTWF0aC5QSS8yKTtcblx0XHRcdFx0c2VsZi5yZWNvbXB1dGVWaWV3cG9ydCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0cmVjb21wdXRlVmlld3BvcnQoKVxuXHR7XG5cdFx0dmFyIHtjbGllbnRXaWR0aDogdywgY2xpZW50SGVpZ2h0OiBofSA9IGRvY3VtZW50LmJvZHk7XG5cblx0XHQvLyByZXNpemUgY2FudmFzXG5cdFx0dGhpcy5yZW5kZXJlci5zZXRTaXplKHcsIGgpO1xuXG5cdFx0Ly8gY29tcHV0ZSB3aW5kb3cgZGltZW5zaW9ucyBmcm9tIHZpZXcgc2l6ZVxuXHRcdHZhciByYXRpbyA9IHcvaDtcblx0XHR2YXIgaGVpZ2h0ID0gTWF0aC5zcXJ0KCAodGhpcy5fdmlld1NpemUqdGhpcy5fdmlld1NpemUpIC8gKHJhdGlvKnJhdGlvICsgMSkgKTtcblx0XHR2YXIgd2lkdGggPSByYXRpbyAqIGhlaWdodDtcblxuXHRcdC8vIHNldCBmcnVzdHJ1bSBlZGdlc1xuXHRcdHRoaXMubGVmdCA9IC13aWR0aC8yO1xuXHRcdHRoaXMucmlnaHQgPSB3aWR0aC8yO1xuXHRcdHRoaXMudG9wID0gaGVpZ2h0LzI7XG5cdFx0dGhpcy5ib3R0b20gPSAtaGVpZ2h0LzI7XG5cblx0XHR0aGlzLnVwZGF0ZVByb2plY3Rpb25NYXRyaXgoKTtcblxuXHRcdC8vIHVwZGF0ZSBwb3NpdGlvblxuXHRcdHRoaXMucG9zaXRpb24uY29weSh0aGlzLl9mb2N1cykuc3ViKCB0aGlzLl9sb29rRGlyZWN0aW9uLmNsb25lKCkubXVsdGlwbHlTY2FsYXIoMjAwKSApO1xuXHRcdGlmKCBNYXRoLmFicyggdGhpcy5fbG9va0RpcmVjdGlvbi5ub3JtYWxpemUoKS5kb3QobmV3IFRIUkVFLlZlY3RvcjMoMCwtMSwwKSkgKSA9PT0gMSApXG5cdFx0XHR0aGlzLnVwLnNldCgwLDAsMSk7IC8vIGlmIHdlJ3JlIGxvb2tpbmcgZG93biB0aGUgWSBheGlzXG5cdFx0ZWxzZVxuXHRcdFx0dGhpcy51cC5zZXQoMCwxLDApO1xuXHRcdHRoaXMubG9va0F0KCB0aGlzLl9mb2N1cyApO1xuXG5cdFx0d2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdkaW9yYW1hVmlld1NldHRpbmdzJywgSlNPTi5zdHJpbmdpZnkoe1xuXHRcdFx0Zm9jdXM6IHRoaXMuX2ZvY3VzLnRvQXJyYXkoKSxcblx0XHRcdHZpZXdTaXplOiB0aGlzLl92aWV3U2l6ZSxcblx0XHRcdGxvb2tEaXJlY3Rpb246IHRoaXMuX2xvb2tEaXJlY3Rpb24udG9BcnJheSgpXG5cdFx0fSkpO1xuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCAqIGFzIExvYWRlcnMgZnJvbSAnLi9sb2FkZXJzJztcbmltcG9ydCBQcmV2aWV3Q2FtZXJhIGZyb20gJy4vY2FtZXJhJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGlvcmFtYVxue1xuXHRjb25zdHJ1Y3Rvcih7YmdDb2xvcj0weGFhYWFhYSwgZ3JpZE9mZnNldD1bMCwwLDBdLCBmdWxsc3BhY2U9ZmFsc2UsIHJlbmRlcmVyT3B0aW9ucz17fX0gPSB7fSlcblx0e1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRzZWxmLl9jYWNoZSA9IExvYWRlcnMuX2NhY2hlO1xuXHRcdHNlbGYuc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcblxuXHRcdC8vIHNldCB1cCByZW5kZXJlciBhbmQgc2NhbGVcblx0XHRpZihhbHRzcGFjZS5pbkNsaWVudClcblx0XHR7XG5cdFx0XHRzZWxmLnJlbmRlcmVyID0gYWx0c3BhY2UuZ2V0VGhyZWVKU1JlbmRlcmVyKHJlbmRlcmVyT3B0aW9ucyk7XG5cdFx0XHRzZWxmLl9lbnZQcm9taXNlID0gUHJvbWlzZS5hbGwoW2FsdHNwYWNlLmdldEVuY2xvc3VyZSgpLCBhbHRzcGFjZS5nZXRTcGFjZSgpXSlcblx0XHRcdC50aGVuKChbZSwgc10pID0+IHtcblxuXHRcdFx0XHRmdW5jdGlvbiBhZGp1c3RTY2FsZSgpe1xuXHRcdFx0XHRcdHNlbGYuc2NlbmUuc2NhbGUuc2V0U2NhbGFyKGUucGl4ZWxzUGVyTWV0ZXIpO1xuXHRcdFx0XHRcdHNlbGYuZW52ID0gT2JqZWN0LmFzc2lnbih7fSwgZSwgcyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0YWRqdXN0U2NhbGUoKTtcblxuXHRcdFx0XHRpZihmdWxsc3BhY2Upe1xuXHRcdFx0XHRcdHNlbGYuX2ZzUHJvbWlzZSA9IGUucmVxdWVzdEZ1bGxzcGFjZSgpLmNhdGNoKChlKSA9PiBjb25zb2xlLndhcm4oJ1JlcXVlc3QgZm9yIGZ1bGxzcGFjZSBkZW5pZWQnKSk7XG5cdFx0XHRcdFx0ZS5hZGRFdmVudExpc3RlbmVyKCdmdWxsc3BhY2VjaGFuZ2UnLCBhZGp1c3RTY2FsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHNlbGYuX2ZzUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHQvLyBzZXQgdXAgcHJldmlldyByZW5kZXJlciwgaW4gY2FzZSB3ZSdyZSBvdXQgb2Ygd29ybGRcblx0XHRcdHNlbGYucmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcigpO1xuXHRcdFx0c2VsZi5yZW5kZXJlci5zZXRTaXplKGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgsIGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0KTtcblx0XHRcdHNlbGYucmVuZGVyZXIuc2V0Q2xlYXJDb2xvciggYmdDb2xvciApO1xuXHRcdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzZWxmLnJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuXG5cdFx0XHRzZWxmLnByZXZpZXdDYW1lcmEgPSBuZXcgUHJldmlld0NhbWVyYSgpO1xuXHRcdFx0c2VsZi5wcmV2aWV3Q2FtZXJhLmdyaWRIZWxwZXIucG9zaXRpb24uZnJvbUFycmF5KGdyaWRPZmZzZXQpO1xuXHRcdFx0c2VsZi5zY2VuZS5hZGQoc2VsZi5wcmV2aWV3Q2FtZXJhLCBzZWxmLnByZXZpZXdDYW1lcmEuZ3JpZEhlbHBlcik7XG5cdFx0XHRzZWxmLnByZXZpZXdDYW1lcmEucmVnaXN0ZXJIb29rcyhzZWxmLnJlbmRlcmVyKTtcblxuXHRcdFx0Ly8gc2V0IHVwIGN1cnNvciBlbXVsYXRpb25cblx0XHRcdGFsdHNwYWNlLnV0aWxpdGllcy5zaGltcy5jdXJzb3IuaW5pdChzZWxmLnNjZW5lLCBzZWxmLnByZXZpZXdDYW1lcmEsIHtyZW5kZXJlcjogc2VsZi5yZW5kZXJlcn0pO1xuXG5cdFx0XHQvLyBzdHViIGVudmlyb25tZW50XG5cdFx0XHRzZWxmLmVudiA9IHtcblx0XHRcdFx0aW5uZXJXaWR0aDogMTAyNCxcblx0XHRcdFx0aW5uZXJIZWlnaHQ6IDEwMjQsXG5cdFx0XHRcdGlubmVyRGVwdGg6IDEwMjQsXG5cdFx0XHRcdHBpeGVsc1Blck1ldGVyOiBmdWxsc3BhY2UgPyAxIDogMTAyNC8zLFxuXHRcdFx0XHRzaWQ6ICdicm93c2VyJyxcblx0XHRcdFx0bmFtZTogJ2Jyb3dzZXInLFxuXHRcdFx0XHR0ZW1wbGF0ZVNpZDogJ2Jyb3dzZXInXG5cdFx0XHR9O1xuXG5cdFx0XHRzZWxmLl9lbnZQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdFx0XHRzZWxmLl9mc1Byb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcblx0XHR9XG5cdH1cblxuXG5cdHN0YXJ0KC4uLm1vZHVsZXMpXG5cdHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHQvLyBkZXRlcm1pbmUgd2hpY2ggYXNzZXRzIGFyZW4ndCBzaGFyZWRcblx0XHR2YXIgc2luZ2xldG9ucyA9IHt9O1xuXHRcdG1vZHVsZXMuZm9yRWFjaChtb2QgPT5cblx0XHR7XG5cdFx0XHRmdW5jdGlvbiBjaGVja0Fzc2V0KHVybCl7XG5cdFx0XHRcdGlmKHNpbmdsZXRvbnNbdXJsXSA9PT0gdW5kZWZpbmVkKSBzaW5nbGV0b25zW3VybF0gPSB0cnVlO1xuXHRcdFx0XHRlbHNlIGlmKHNpbmdsZXRvbnNbdXJsXSA9PT0gdHJ1ZSkgc2luZ2xldG9uc1t1cmxdID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHRPYmplY3Qua2V5cyhtb2QuYXNzZXRzLnRleHR1cmVzIHx8IHt9KS5tYXAoayA9PiBtb2QuYXNzZXRzLnRleHR1cmVzW2tdKS5mb3JFYWNoKGNoZWNrQXNzZXQpO1xuXHRcdFx0T2JqZWN0LmtleXMobW9kLmFzc2V0cy5tb2RlbHMgfHwge30pLm1hcChrID0+IG1vZC5hc3NldHMubW9kZWxzW2tdKS5mb3JFYWNoKGNoZWNrQXNzZXQpO1xuXHRcdFx0T2JqZWN0LmtleXMobW9kLmFzc2V0cy5wb3N0ZXJzIHx8IHt9KS5tYXAoayA9PiBtb2QuYXNzZXRzLnBvc3RlcnNba10pLmZvckVhY2goY2hlY2tBc3NldCk7XG5cdFx0fSk7XG5cblx0XHQvLyBkZXRlcm1pbmUgaWYgdGhlIHRyYWNraW5nIHNrZWxldG9uIGlzIG5lZWRlZFxuXHRcdGxldCBuZWVkc1NrZWxldG9uID0gbW9kdWxlcy5yZWR1Y2UoKG5zLG0pID0+IG5zIHx8IG0ubmVlZHNTa2VsZXRvbiwgZmFsc2UpO1xuXHRcdGlmKG5lZWRzU2tlbGV0b24gJiYgYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdFx0c2VsZi5fc2tlbFByb21pc2UgPSBQcm9taXNlLmFsbChbXG5cdFx0XHRcdGFsdHNwYWNlLmdldFRocmVlSlNUcmFja2luZ1NrZWxldG9uKCksXG5cdFx0XHRcdHNlbGYuX2VudlByb21pc2Vcblx0XHRcdF0pLnRoZW4oKFtza2VsLCBfXSkgPT4ge1xuXHRcdFx0XHRzZWxmLnNjZW5lLmFkZChza2VsKTtcblx0XHRcdFx0c2VsZi5lbnYuc2tlbCA9IHNrZWw7XG5cdFx0XHRcdHNlbGYuZW52ID0gT2JqZWN0LmZyZWV6ZShzZWxmLmVudik7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRzZWxmLl9lbnZQcm9taXNlLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRzZWxmLmVudiA9IE9iamVjdC5mcmVlemUoc2VsZi5lbnYpO1xuXHRcdFx0fSk7XG5cdFx0XHRzZWxmLl9za2VsUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdH1cblxuXHRcdFByb21pc2UuYWxsKFtzZWxmLl9lbnZQcm9taXNlLCBzZWxmLl9mc1Byb21pc2UsIHNlbGYuX3NrZWxQcm9taXNlXSkudGhlbigoKSA9PlxuXHRcdHtcblx0XHRcdC8vIGNvbnN0cnVjdCBkaW9yYW1hc1xuXHRcdFx0bW9kdWxlcy5mb3JFYWNoKGZ1bmN0aW9uKG1vZHVsZSlcblx0XHRcdHtcblx0XHRcdFx0bGV0IHJvb3QgPSBudWxsO1xuXG5cdFx0XHRcdGlmKG1vZHVsZSBpbnN0YW5jZW9mIFRIUkVFLk9iamVjdDNEKXtcblx0XHRcdFx0XHRyb290ID0gbW9kdWxlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHJvb3QgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuXHRcdFx0XHRcdC8vIGhhbmRsZSBhYnNvbHV0ZSBwb3NpdGlvbmluZ1xuXHRcdFx0XHRcdGlmKG1vZHVsZS50cmFuc2Zvcm0pe1xuXHRcdFx0XHRcdFx0cm9vdC5tYXRyaXguZnJvbUFycmF5KG1vZHVsZS50cmFuc2Zvcm0pO1xuXHRcdFx0XHRcdFx0cm9vdC5tYXRyaXguZGVjb21wb3NlKHJvb3QucG9zaXRpb24sIHJvb3QucXVhdGVybmlvbiwgcm9vdC5zY2FsZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0aWYobW9kdWxlLnBvc2l0aW9uKXtcblx0XHRcdFx0XHRcdFx0cm9vdC5wb3NpdGlvbi5mcm9tQXJyYXkobW9kdWxlLnBvc2l0aW9uKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmKG1vZHVsZS5yb3RhdGlvbil7XG5cdFx0XHRcdFx0XHRcdHJvb3Qucm90YXRpb24uZnJvbUFycmF5KG1vZHVsZS5yb3RhdGlvbik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gaGFuZGxlIHJlbGF0aXZlIHBvc2l0aW9uaW5nXG5cdFx0XHRcdGlmKG1vZHVsZS52ZXJ0aWNhbEFsaWduKXtcblx0XHRcdFx0XHRsZXQgaGFsZkhlaWdodCA9IHNlbGYuZW52LmlubmVySGVpZ2h0LygyKnNlbGYuZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHRcdFx0XHRzd2l0Y2gobW9kdWxlLnZlcnRpY2FsQWxpZ24pe1xuXHRcdFx0XHRcdGNhc2UgJ3RvcCc6XG5cdFx0XHRcdFx0XHRyb290LnRyYW5zbGF0ZVkoaGFsZkhlaWdodCk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlICdib3R0b20nOlxuXHRcdFx0XHRcdFx0cm9vdC50cmFuc2xhdGVZKC1oYWxmSGVpZ2h0KTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ21pZGRsZSc6XG5cdFx0XHRcdFx0XHQvLyBkZWZhdWx0XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKCdJbnZhbGlkIHZhbHVlIGZvciBcInZlcnRpY2FsQWxpZ25cIiAtICcsIG1vZHVsZS52ZXJ0aWNhbEFsaWduKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdHNlbGYuc2NlbmUuYWRkKHJvb3QpO1xuXG5cdFx0XHRcdGlmKHNlbGYucHJldmlld0NhbWVyYSl7XG5cdFx0XHRcdFx0bGV0IGF4aXMgPSBuZXcgVEhSRUUuQXhpc0hlbHBlcigxKTtcblx0XHRcdFx0XHRheGlzLnVzZXJEYXRhLmFsdHNwYWNlID0ge2NvbGxpZGVyOiB7ZW5hYmxlZDogZmFsc2V9fTtcblx0XHRcdFx0XHRyb290LmFkZChheGlzKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHNlbGYubG9hZEFzc2V0cyhtb2R1bGUuYXNzZXRzLCBzaW5nbGV0b25zKS50aGVuKChyZXN1bHRzKSA9PiB7XG5cdFx0XHRcdFx0bW9kdWxlLmluaXRpYWxpemUoc2VsZi5lbnYsIHJvb3QsIHJlc3VsdHMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0Ly8gc3RhcnQgYW5pbWF0aW5nXG5cdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbiBhbmltYXRlKHRpbWVzdGFtcClcblx0XHR7XG5cdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xuXHRcdFx0c2VsZi5zY2VuZS51cGRhdGVBbGxCZWhhdmlvcnMoKTtcblx0XHRcdGlmKHdpbmRvdy5UV0VFTikgVFdFRU4udXBkYXRlKCk7XG5cdFx0XHRzZWxmLnJlbmRlcmVyLnJlbmRlcihzZWxmLnNjZW5lLCBzZWxmLnByZXZpZXdDYW1lcmEpO1xuXHRcdH0pO1xuXHR9XG5cblx0bG9hZEFzc2V0cyhtYW5pZmVzdCwgc2luZ2xldG9ucylcblx0e1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PlxuXHRcdHtcblx0XHRcdC8vIHBvcHVsYXRlIGNhY2hlXG5cdFx0XHRQcm9taXNlLmFsbChbXG5cblx0XHRcdFx0Ly8gcG9wdWxhdGUgbW9kZWwgY2FjaGVcblx0XHRcdFx0Li4uT2JqZWN0LmtleXMobWFuaWZlc3QubW9kZWxzIHx8IHt9KS5tYXAoaWQgPT4gTG9hZGVycy5Nb2RlbFByb21pc2UobWFuaWZlc3QubW9kZWxzW2lkXSkpLFxuXG5cdFx0XHRcdC8vIHBvcHVsYXRlIGV4cGxpY2l0IHRleHR1cmUgY2FjaGVcblx0XHRcdFx0Li4uT2JqZWN0LmtleXMobWFuaWZlc3QudGV4dHVyZXMgfHwge30pLm1hcChpZCA9PiBMb2FkZXJzLlRleHR1cmVQcm9taXNlKG1hbmlmZXN0LnRleHR1cmVzW2lkXSkpLFxuXG5cdFx0XHRcdC8vIGdlbmVyYXRlIGFsbCBwb3N0ZXJzXG5cdFx0XHRcdC4uLk9iamVjdC5rZXlzKG1hbmlmZXN0LnBvc3RlcnMgfHwge30pLm1hcChpZCA9PiBMb2FkZXJzLlBvc3RlclByb21pc2UobWFuaWZlc3QucG9zdGVyc1tpZF0pKVxuXHRcdFx0XSlcblxuXHRcdFx0LnRoZW4oKCkgPT5cblx0XHRcdHtcblx0XHRcdFx0Ly8gcG9wdWxhdGUgcGF5bG9hZCBmcm9tIGNhY2hlXG5cdFx0XHRcdHZhciBwYXlsb2FkID0ge21vZGVsczoge30sIHRleHR1cmVzOiB7fSwgcG9zdGVyczoge319O1xuXG5cdFx0XHRcdGZvcihsZXQgaSBpbiBtYW5pZmVzdC5tb2RlbHMpe1xuXHRcdFx0XHRcdGxldCB1cmwgPSBtYW5pZmVzdC5tb2RlbHNbaV07XG5cdFx0XHRcdFx0bGV0IHQgPSBMb2FkZXJzLl9jYWNoZS5tb2RlbHNbdXJsXTtcblx0XHRcdFx0XHRwYXlsb2FkLm1vZGVsc1tpXSA9IHQgPyBzaW5nbGV0b25zW3VybF0gPyB0IDogdC5jbG9uZSgpIDogbnVsbDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZvcihsZXQgaSBpbiBtYW5pZmVzdC50ZXh0dXJlcyl7XG5cdFx0XHRcdFx0bGV0IHVybCA9IG1hbmlmZXN0LnRleHR1cmVzW2ldO1xuXHRcdFx0XHRcdGxldCB0ID0gTG9hZGVycy5fY2FjaGUudGV4dHVyZXNbdXJsXTtcblx0XHRcdFx0XHRwYXlsb2FkLnRleHR1cmVzW2ldID0gdCA/IHNpbmdsZXRvbnNbdXJsXSA/IHQgOiB0LmNsb25lKCkgOiBudWxsO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yKGxldCBpIGluIG1hbmlmZXN0LnBvc3RlcnMpe1xuXHRcdFx0XHRcdGxldCB1cmwgPSBtYW5pZmVzdC5wb3N0ZXJzW2ldO1xuXHRcdFx0XHRcdGxldCB0ID0gTG9hZGVycy5fY2FjaGUucG9zdGVyc1t1cmxdO1xuXHRcdFx0XHRcdHBheWxvYWQucG9zdGVyc1tpXSA9IHQgPyBzaW5nbGV0b25zW3VybF0gPyB0IDogdC5jbG9uZSgpIDogbnVsbDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJlc29sdmUocGF5bG9hZCk7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKGUgPT4gY29uc29sZS5lcnJvcihlLnN0YWNrKSk7XG5cdFx0fSk7XG5cdH1cblxufTtcbiJdLCJuYW1lcyI6WyJsZXQiLCJsb2FkZXIiLCJzdXBlciIsInJpZ2h0IiwiTG9hZGVycy5fY2FjaGUiLCJMb2FkZXJzLk1vZGVsUHJvbWlzZSIsIkxvYWRlcnMuVGV4dHVyZVByb21pc2UiLCJMb2FkZXJzLlBvc3RlclByb21pc2UiLCJpIiwidXJsIiwidCJdLCJtYXBwaW5ncyI6Ijs7O0FBRUFBLElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDOztBQUU1RCxTQUFTLFVBQVUsRUFBRSxHQUFHLEVBQUUsT0FBTztBQUNqQztDQUNDLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFBLE9BQU8sa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBQTs7O0NBR3RFLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDNUQsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0dBQ3hCLEdBQUcsR0FBRyxRQUFRLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztHQUM1QjtPQUNJO0dBQ0osSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQztHQUNqQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUM1QixRQUFRLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDckU7R0FDRCxHQUFH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
