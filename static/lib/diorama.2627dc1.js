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
		]).then(function (skel, _) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uL3NyYy9sb2FkZXJzLmpzIiwiLi4vc3JjL2NhbWVyYS5qcyIsIi4uL3NyYy9tYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxuXHJcbmxldCBvcmlnaW5hbEdldFRleHR1cmUgPSBUSFJFRS5UZXh0dXJlTG9hZGVyLnByb3RvdHlwZS5sb2FkO1xyXG5cclxuZnVuY3Rpb24gZ2V0VGV4dHVyZSAodXJsLCByZXNvbHZlKVxyXG57XHJcblx0aWYodGhpcy5mb3JjZUxvYWQpIHJldHVybiBvcmlnaW5hbEdldFRleHR1cmUuY2FsbCh0aGlzLCB1cmwsIHJlc29sdmUpO1xyXG5cclxuXHQvLyBjb25zdHJ1Y3QgYWJzb2x1dGUgdXJsXHJcblx0aWYgKHVybCAmJiAhdXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKSAmJiAhdXJsLnN0YXJ0c1dpdGgoJy8vJykpIHtcclxuXHRcdGlmICh1cmwuc3RhcnRzV2l0aCgnLycpKSB7XHJcblx0XHRcdHVybCA9IGxvY2F0aW9uLm9yaWdpbiArIHVybDtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHR2YXIgY3VyclBhdGggPSBsb2NhdGlvbi5wYXRobmFtZTtcclxuXHRcdFx0aWYgKCFjdXJyUGF0aC5lbmRzV2l0aCgnLycpKSB7XHJcblx0XHRcdFx0Y3VyclBhdGggPSBsb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpLnNsaWNlKDAsIC0xKS5qb2luKCcvJykgKyAnLyc7XHJcblx0XHRcdH1cclxuXHRcdFx0dXJsID0gbG9jYXRpb24ub3JpZ2luICsgY3VyclBhdGggKyB1cmw7XHJcblx0XHR9XHJcblx0fVxyXG5cdGNvbnNvbGUuaW5mbygnQWxsb3dpbmcgQWx0c3BhY2UgdG8gbG9hZCAnICsgdXJsKTtcclxuXHR2YXIgaW1hZ2UgPSB7c3JjOiB1cmx9O1xyXG5cdHZhciB0ZXggPSBuZXcgVEhSRUUuVGV4dHVyZShpbWFnZSk7XHJcblx0aWYgKHJlc29sdmUpIHtcclxuXHRcdHJlc29sdmUodGV4KTtcclxuXHR9XHJcblx0cmV0dXJuIHRleDtcclxufVxyXG5cclxuaWYoYWx0c3BhY2UuaW5DbGllbnQpXHJcbntcclxuXHRsZXQgbm9vcCA9ICgpID0+IHt9O1xyXG5cdFRIUkVFLkxvYWRlci5IYW5kbGVycy5hZGQoL2pwZT9nfHBuZy9pLCB7IGxvYWQ6IGdldFRleHR1cmUsIHNldENyb3NzT3JpZ2luOiBub29wIH0pO1xyXG5cdFRIUkVFLlRleHR1cmVMb2FkZXIucHJvdG90eXBlLmxvYWQgPSBnZXRUZXh0dXJlO1xyXG59XHJcblxyXG5sZXQgY2FjaGUgPSB7bW9kZWxzOiB7fSwgdGV4dHVyZXM6IHt9LCBwb3N0ZXJzOiB7fX07XHJcblxyXG5mdW5jdGlvbiBNb2RlbFByb21pc2UodXJsKVxyXG57XHJcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XHJcblx0e1xyXG5cdFx0aWYoY2FjaGUubW9kZWxzW3VybF0pe1xyXG5cdFx0XHRyZXR1cm4gcmVzb2x2ZShjYWNoZS5tb2RlbHNbdXJsXSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gTk9URTogZ2xURiBsb2FkZXIgZG9lcyBub3QgY2F0Y2ggZXJyb3JzXHJcblx0XHRlbHNlIGlmKC9cXC5nbHRmJC9pLnRlc3QodXJsKSl7XHJcblx0XHRcdGlmKFRIUkVFLmdsVEZMb2FkZXIpe1xyXG5cdFx0XHRcdGxldCBsb2FkZXIgPSBuZXcgVEhSRUUuZ2xURkxvYWRlcigpO1xyXG5cdFx0XHRcdGxvYWRlci5sb2FkKHVybCwgKHJlc3VsdCkgPT4ge1xyXG5cdFx0XHRcdFx0Y2FjaGUubW9kZWxzW3VybF0gPSByZXN1bHQuc2NlbmUuY2hpbGRyZW5bMF0uY2hpbGRyZW5bMF07XHJcblx0XHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShjYWNoZS5tb2RlbHNbdXJsXSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZihUSFJFRS5HTFRGTG9hZGVyKXtcclxuXHRcdFx0XHRsZXQgbG9hZGVyID0gbmV3IFRIUkVFLkdMVEZMb2FkZXIoKTtcclxuXHRcdFx0XHRsb2FkZXIubG9hZCh1cmwsIHJlc3VsdCA9PiB7XHJcblx0XHRcdFx0XHRjYWNoZS5tb2RlbHNbdXJsXSA9IHJlc3VsdC5zY2VuZS5jaGlsZHJlblswXTtcclxuXHRcdFx0XHRcdGNhY2hlLm1vZGVsc1t1cmxdLm1hdHJpeEF1dG9VcGRhdGUgPSB0cnVlO1xyXG5cdFx0XHRcdFx0LypyZXN1bHQuc2NlbmUudHJhdmVyc2UoKG8pID0+IHtcclxuXHRcdFx0XHRcdFx0aWYoby5tYXRlcmlhbCAmJiBvLm1hdGVyaWFsLm1hcClcclxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZmxpcFknLCBvLm1hdGVyaWFsLm1hcC5mbGlwWSk7XHJcblx0XHRcdFx0XHR9KTsqL1xyXG5cclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShjYWNoZS5tb2RlbHNbdXJsXSk7XHJcblx0XHRcdFx0fSwgKCkgPT4ge30sIHJlamVjdCk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihgZ2xURiBsb2FkZXIgbm90IGZvdW5kLiBcIiR7dXJsfVwiIG5vdCBsb2FkZWQuYCk7XHJcblx0XHRcdFx0cmVqZWN0KCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRlbHNlIGlmKC9cXC5kYWUkL2kudGVzdCh1cmwpKXtcclxuXHRcdFx0aWYoVEhSRUUuQ29sbGFkYUxvYWRlcil7XHJcblx0XHRcdFx0bGV0IGxvYWRlciA9IG5ldyBUSFJFRS5Db2xsYWRhTG9hZGVyKCk7XHJcblx0XHRcdFx0bG9hZGVyLmxvYWQodXJsLCByZXN1bHQgPT4ge1xyXG5cdFx0XHRcdFx0Y2FjaGUubW9kZWxzW3VybF0gPSByZXN1bHQuc2NlbmUuY2hpbGRyZW5bMF07XHJcblx0XHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShyZXN1bHQuc2NlbmUuY2hpbGRyZW5bMF0pXHJcblx0XHRcdFx0fSwgbnVsbCwgcmVqZWN0KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKGBDb2xsYWRhIGxvYWRlciBub3QgZm91bmQuIFwiJHt1cmx9XCIgbm90IGxvYWRlZC5gKTtcclxuXHRcdFx0XHRyZWplY3QoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBUZXh0dXJlUHJvbWlzZSh1cmwsIGNvbmZpZyA9IHtmb3JjZUxvYWQ6IGZhbHNlfSl7XHJcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XHJcblx0e1xyXG5cdFx0aWYoY2FjaGUudGV4dHVyZXNbdXJsXSlcclxuXHRcdFx0cmV0dXJuIHJlc29sdmUoY2FjaGUudGV4dHVyZXNbdXJsXSk7XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0bGV0IGxvYWRlciA9IG5ldyBUSFJFRS5UZXh0dXJlTG9hZGVyKCk7XHJcblx0XHRcdGxvYWRlci5mb3JjZUxvYWQgPSBjb25maWcuZm9yY2VMb2FkO1xyXG5cdFx0XHRsb2FkZXIubG9hZCh1cmwsIHRleHR1cmUgPT4ge1xyXG5cdFx0XHRcdGNhY2hlLnRleHR1cmVzW3VybF0gPSB0ZXh0dXJlO1xyXG5cdFx0XHRcdHJldHVybiByZXNvbHZlKHRleHR1cmUpO1xyXG5cdFx0XHR9LCBudWxsLCByZWplY3QpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcblxyXG5jbGFzcyBWaWRlb1Byb21pc2UgZXh0ZW5kcyBQcm9taXNlIHtcclxuXHRjb25zdHJ1Y3Rvcih1cmwpXHJcblx0e1xyXG5cdFx0Ly8gc3RhcnQgbG9hZGVyXHJcblx0XHR2YXIgdmlkU3JjID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndmlkZW8nKTtcclxuXHRcdHZpZFNyYy5hdXRvcGxheSA9IHRydWU7XHJcblx0XHR2aWRTcmMubG9vcCA9IHRydWU7XHJcblx0XHR2aWRTcmMuc3JjID0gdXJsO1xyXG5cdFx0dmlkU3JjLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHZpZFNyYyk7XHJcblxyXG5cdFx0dmFyIHRleCA9IG5ldyBUSFJFRS5WaWRlb1RleHR1cmUodmlkU3JjKTtcclxuXHRcdHRleC5taW5GaWx0ZXIgPSBUSFJFRS5MaW5lYXJGaWx0ZXI7XHJcblx0XHR0ZXgubWFnRmlsdGVyID0gVEhSRUUuTGluZWFyRmlsdGVyO1xyXG5cdFx0dGV4LmZvcm1hdCA9IFRIUkVFLlJHQkZvcm1hdDtcclxuXHJcblx0XHQvL2NhY2hlLnZpZGVvc1t1cmxdID0gdGV4O1xyXG5cdFx0Ly9wYXlsb2FkLnZpZGVvc1tpZF0gPSBjYWNoZS52aWRlb3NbdXJsXTtcclxuXHJcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRleCk7XHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiBQb3N0ZXJQcm9taXNlKHVybCwgcmF0aW8gPSAtMSl7XHJcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XHJcblx0e1xyXG5cdFx0aWYoY2FjaGUucG9zdGVyc1t1cmxdKXtcclxuXHRcdFx0cmV0dXJuIHJlc29sdmUoY2FjaGUucG9zdGVyc1t1cmxdKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgcmV0dXJuIChuZXcgVGV4dHVyZVByb21pc2UodXJsLCB7Zm9yY2VMb2FkOiByYXRpbyA8IDB9KSkudGhlbih0ZXggPT5cclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlmKHJhdGlvIDwgMClcclxuXHRcdFx0XHRcdHJhdGlvID0gdGV4LmltYWdlLndpZHRoIC8gdGV4LmltYWdlLmhlaWdodDtcclxuXHJcblx0XHRcdFx0bGV0IGdlbywgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IHRleCwgc2lkZTogVEhSRUUuRG91YmxlU2lkZX0pO1xyXG5cclxuXHRcdFx0XHRpZihyYXRpbyA+IDEpe1xyXG5cdFx0XHRcdFx0Z2VvID0gbmV3IFRIUkVFLlBsYW5lR2VvbWV0cnkoMSwgMS9yYXRpbyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0Z2VvID0gbmV3IFRIUkVFLlBsYW5lR2VvbWV0cnkocmF0aW8sIDEpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y2FjaGUucG9zdGVyc1t1cmxdID0gbmV3IFRIUkVFLk1lc2goZ2VvLCBtYXQpO1xyXG5cdFx0XHRcdHJldHVybiByZXNvbHZlKGNhY2hlLnBvc3RlcnNbdXJsXSk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0fSk7XHJcbn1cclxuXHJcbmV4cG9ydCB7IE1vZGVsUHJvbWlzZSwgVGV4dHVyZVByb21pc2UsIFZpZGVvUHJvbWlzZSwgUG9zdGVyUHJvbWlzZSwgY2FjaGUgYXMgX2NhY2hlIH07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFByZXZpZXdDYW1lcmEgZXh0ZW5kcyBUSFJFRS5PcnRob2dyYXBoaWNDYW1lcmFcclxue1xyXG5cdGNvbnN0cnVjdG9yKGZvY3VzLCB2aWV3U2l6ZSwgbG9va0RpcmVjdGlvbilcclxuXHR7XHJcblx0XHRzdXBlcigtMSwgMSwgMSwgLTEsIC4xLCA0MDApO1xyXG5cclxuXHRcdGxldCBzZXR0aW5ncyA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZGlvcmFtYVZpZXdTZXR0aW5ncycpO1xyXG5cdFx0aWYoc2V0dGluZ3Mpe1xyXG5cdFx0XHRzZXR0aW5ncyA9IEpTT04ucGFyc2Uoc2V0dGluZ3MpO1xyXG5cdFx0XHRpZighZm9jdXMpXHJcblx0XHRcdFx0Zm9jdXMgPSBuZXcgVEhSRUUuVmVjdG9yMygpLmZyb21BcnJheShzZXR0aW5ncy5mb2N1cyk7XHJcblx0XHRcdGlmKCF2aWV3U2l6ZSlcclxuXHRcdFx0XHR2aWV3U2l6ZSA9IHNldHRpbmdzLnZpZXdTaXplO1xyXG5cdFx0XHRpZighbG9va0RpcmVjdGlvbilcclxuXHRcdFx0XHRsb29rRGlyZWN0aW9uID0gbmV3IFRIUkVFLlZlY3RvcjMoKS5mcm9tQXJyYXkoc2V0dGluZ3MubG9va0RpcmVjdGlvbik7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5fdmlld1NpemUgPSB2aWV3U2l6ZSB8fCA0MDtcclxuXHRcdHRoaXMuX2ZvY3VzID0gZm9jdXMgfHwgbmV3IFRIUkVFLlZlY3RvcjMoKTtcclxuXHRcdHRoaXMuX2xvb2tEaXJlY3Rpb24gPSBsb29rRGlyZWN0aW9uIHx8IG5ldyBUSFJFRS5WZWN0b3IzKDAsLTEsMCk7XHJcblx0XHR0aGlzLmdyaWRIZWxwZXIgPSBuZXcgVEhSRUUuR3JpZEhlbHBlcigzMDAsIDEpO1xyXG5cdFx0dGhpcy5ncmlkSGVscGVyLnVzZXJEYXRhID0ge2FsdHNwYWNlOiB7Y29sbGlkZXI6IHtlbmFibGVkOiBmYWxzZX19fTtcclxuXHRcdC8vdGhpcy5ncmlkSGVscGVyLnF1YXRlcm5pb24uc2V0RnJvbVVuaXRWZWN0b3JzKCBuZXcgVEhSRUUuVmVjdG9yMygwLC0xLDApLCB0aGlzLl9sb29rRGlyZWN0aW9uICk7XHJcblx0fVxyXG5cclxuXHRnZXQgdmlld1NpemUoKXtcclxuXHRcdHJldHVybiB0aGlzLl92aWV3U2l6ZTtcclxuXHR9XHJcblx0c2V0IHZpZXdTaXplKHZhbCl7XHJcblx0XHR0aGlzLl92aWV3U2l6ZSA9IHZhbDtcclxuXHRcdHRoaXMucmVjb21wdXRlVmlld3BvcnQoKTtcclxuXHR9XHJcblxyXG5cdGdldCBmb2N1cygpe1xyXG5cdFx0cmV0dXJuIHRoaXMuX2ZvY3VzO1xyXG5cdH1cclxuXHRzZXQgZm9jdXModmFsKXtcclxuXHRcdHRoaXMuX2ZvY3VzLmNvcHkodmFsKTtcclxuXHRcdHRoaXMucmVjb21wdXRlVmlld3BvcnQoKTtcclxuXHR9XHJcblxyXG5cdGdldCBsb29rRGlyZWN0aW9uKCl7XHJcblx0XHRyZXR1cm4gdGhpcy5fbG9va0RpcmVjdGlvbjtcclxuXHR9XHJcblx0c2V0IGxvb2tEaXJlY3Rpb24odmFsKXtcclxuXHRcdHRoaXMuX2xvb2tEaXJlY3Rpb24uY29weSh2YWwpO1xyXG5cdFx0dGhpcy5yZWNvbXB1dGVWaWV3cG9ydCgpO1xyXG5cdH1cclxuXHJcblx0cmVnaXN0ZXJIb29rcyhyZW5kZXJlcilcclxuXHR7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRzZWxmLnJlbmRlcmVyID0gcmVuZGVyZXI7XHJcblxyXG5cdFx0Ly8gc2V0IHN0eWxlcyBvbiB0aGUgcGFnZSwgc28gdGhlIHByZXZpZXcgd29ya3MgcmlnaHRcclxuXHRcdGRvY3VtZW50LmJvZHkucGFyZW50RWxlbWVudC5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XHJcblx0XHRkb2N1bWVudC5ib2R5LnN0eWxlLmhlaWdodCA9ICcxMDAlJztcclxuXHRcdGRvY3VtZW50LmJvZHkuc3R5bGUubWFyZ2luID0gJzAnO1xyXG5cdFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xyXG5cclxuXHRcdHZhciBpbmZvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG5cdFx0aW5mby5pbm5lckhUTUwgPSBbJ01pZGRsZSBjbGljayBhbmQgZHJhZyB0byBwYW4nLCAnTW91c2Ugd2hlZWwgdG8gem9vbScsICdBcnJvdyBrZXlzIHRvIHJvdGF0ZSddLmpvaW4oJzxici8+Jyk7XHJcblx0XHRPYmplY3QuYXNzaWduKGluZm8uc3R5bGUsIHtcclxuXHRcdFx0cG9zaXRpb246ICdmaXhlZCcsXHJcblx0XHRcdHRvcDogJzEwcHgnLFxyXG5cdFx0XHRsZWZ0OiAnMTBweCcsXHJcblx0XHRcdG1hcmdpbjogMFxyXG5cdFx0fSk7XHJcblx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGluZm8pO1xyXG5cclxuXHRcdC8vIHJlc2l6ZSB0aGUgcHJldmlldyBjYW52YXMgd2hlbiB3aW5kb3cgcmVzaXplc1xyXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGUgPT4gc2VsZi5yZWNvbXB1dGVWaWV3cG9ydCgpKTtcclxuXHRcdHNlbGYucmVjb21wdXRlVmlld3BvcnQoKTtcclxuXHJcblx0XHQvLyBtaWRkbGUgY2xpY2sgYW5kIGRyYWcgdG8gcGFuIHZpZXdcclxuXHRcdHZhciBkcmFnU3RhcnQgPSBudWxsLCBmb2N1c1N0YXJ0ID0gbnVsbDtcclxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBlID0+IHtcclxuXHRcdFx0aWYoZS5idXR0b24gPT09IDEpe1xyXG5cdFx0XHRcdGRyYWdTdGFydCA9IHt4OiBlLmNsaWVudFgsIHk6IGUuY2xpZW50WX07XHJcblx0XHRcdFx0Zm9jdXNTdGFydCA9IHNlbGYuX2ZvY3VzLmNsb25lKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBlID0+IHtcclxuXHRcdFx0aWYoZS5idXR0b24gPT09IDEpe1xyXG5cdFx0XHRcdGRyYWdTdGFydCA9IG51bGw7XHJcblx0XHRcdFx0Zm9jdXNTdGFydCA9IG51bGw7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGUgPT4ge1xyXG5cdFx0XHRpZihkcmFnU3RhcnQpXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsZXQge2NsaWVudFdpZHRoOiB3LCBjbGllbnRIZWlnaHQ6IGh9ID0gZG9jdW1lbnQuYm9keTtcclxuXHRcdFx0XHRsZXQgcGl4ZWxzUGVyTWV0ZXIgPSBNYXRoLnNxcnQodyp3K2gqaCkgLyBzZWxmLl92aWV3U2l6ZTtcclxuXHRcdFx0XHRsZXQgZHggPSBlLmNsaWVudFggLSBkcmFnU3RhcnQueCwgZHkgPSBlLmNsaWVudFkgLSBkcmFnU3RhcnQueTtcclxuXHRcdFx0XHRsZXQgcmlnaHQgPSBuZXcgVEhSRUUuVmVjdG9yMygpLmNyb3NzVmVjdG9ycyhzZWxmLl9sb29rRGlyZWN0aW9uLCBzZWxmLnVwKTtcclxuXHJcblx0XHRcdFx0c2VsZi5fZm9jdXMuY29weShmb2N1c1N0YXJ0KVxyXG5cdFx0XHRcdFx0LmFkZChzZWxmLnVwLmNsb25lKCkubXVsdGlwbHlTY2FsYXIoZHkvcGl4ZWxzUGVyTWV0ZXIpKVxyXG5cdFx0XHRcdFx0LmFkZChyaWdodC5tdWx0aXBseVNjYWxhcigtZHgvcGl4ZWxzUGVyTWV0ZXIpKTtcclxuXHJcblx0XHRcdFx0c2VsZi5yZWNvbXB1dGVWaWV3cG9ydCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyB3aGVlbCB0byB6b29tXHJcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignd2hlZWwnLCBlID0+IHtcclxuXHRcdFx0aWYoZS5kZWx0YVkgPCAwKXtcclxuXHRcdFx0XHRzZWxmLl92aWV3U2l6ZSAqPSAwLjkwO1xyXG5cdFx0XHRcdHNlbGYucmVjb21wdXRlVmlld3BvcnQoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmKGUuZGVsdGFZID4gMCl7XHJcblx0XHRcdFx0c2VsZi5fdmlld1NpemUgKj0gMS4xO1xyXG5cdFx0XHRcdHNlbGYucmVjb21wdXRlVmlld3BvcnQoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gYXJyb3cga2V5cyB0byByb3RhdGVcclxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZSA9PiB7XHJcblx0XHRcdGlmKGUua2V5ID09PSAnQXJyb3dEb3duJyl7XHJcblx0XHRcdFx0bGV0IHJpZ2h0ID0gbmV3IFRIUkVFLlZlY3RvcjMoKS5jcm9zc1ZlY3RvcnMoc2VsZi5fbG9va0RpcmVjdGlvbiwgc2VsZi51cCk7XHJcblx0XHRcdFx0c2VsZi5fbG9va0RpcmVjdGlvbi5hcHBseUF4aXNBbmdsZShyaWdodCwgTWF0aC5QSS8yKTtcclxuXHRcdFx0XHQvL3NlbGYuZ3JpZEhlbHBlci5yb3RhdGVPbkF4aXMocmlnaHQsIE1hdGguUEkvMik7XHJcblx0XHRcdFx0c2VsZi5yZWNvbXB1dGVWaWV3cG9ydCgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYoZS5rZXkgPT09ICdBcnJvd1VwJyl7XHJcblx0XHRcdFx0bGV0IHJpZ2h0ID0gbmV3IFRIUkVFLlZlY3RvcjMoKS5jcm9zc1ZlY3RvcnMoc2VsZi5fbG9va0RpcmVjdGlvbiwgc2VsZi51cCk7XHJcblx0XHRcdFx0c2VsZi5fbG9va0RpcmVjdGlvbi5hcHBseUF4aXNBbmdsZShyaWdodCwgLU1hdGguUEkvMik7XHJcblx0XHRcdFx0Ly9zZWxmLmdyaWRIZWxwZXIucm90YXRlT25BeGlzKHJpZ2h0LCAtTWF0aC5QSS8yKTtcclxuXHRcdFx0XHRzZWxmLnJlY29tcHV0ZVZpZXdwb3J0KCk7XHJcblxyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYoZS5rZXkgPT09ICdBcnJvd0xlZnQnKXtcclxuXHRcdFx0XHRzZWxmLl9sb29rRGlyZWN0aW9uLmFwcGx5QXhpc0FuZ2xlKHNlbGYudXAsIC1NYXRoLlBJLzIpO1xyXG5cdFx0XHRcdC8vc2VsZi5ncmlkSGVscGVyLnJvdGF0ZU9uQXhpcyhzZWxmLnVwLCAtTWF0aC5QSS8yKTtcclxuXHRcdFx0XHRzZWxmLnJlY29tcHV0ZVZpZXdwb3J0KCk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZihlLmtleSA9PT0gJ0Fycm93UmlnaHQnKXtcclxuXHRcdFx0XHRzZWxmLl9sb29rRGlyZWN0aW9uLmFwcGx5QXhpc0FuZ2xlKHNlbGYudXAsIE1hdGguUEkvMik7XHJcblx0XHRcdFx0Ly9zZWxmLmdyaWRIZWxwZXIucm90YXRlT25BeGlzKHNlbGYudXAsIE1hdGguUEkvMik7XHJcblx0XHRcdFx0c2VsZi5yZWNvbXB1dGVWaWV3cG9ydCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHJlY29tcHV0ZVZpZXdwb3J0KClcclxuXHR7XHJcblx0XHR2YXIge2NsaWVudFdpZHRoOiB3LCBjbGllbnRIZWlnaHQ6IGh9ID0gZG9jdW1lbnQuYm9keTtcclxuXHJcblx0XHQvLyByZXNpemUgY2FudmFzXHJcblx0XHR0aGlzLnJlbmRlcmVyLnNldFNpemUodywgaCk7XHJcblxyXG5cdFx0Ly8gY29tcHV0ZSB3aW5kb3cgZGltZW5zaW9ucyBmcm9tIHZpZXcgc2l6ZVxyXG5cdFx0dmFyIHJhdGlvID0gdy9oO1xyXG5cdFx0dmFyIGhlaWdodCA9IE1hdGguc3FydCggKHRoaXMuX3ZpZXdTaXplKnRoaXMuX3ZpZXdTaXplKSAvIChyYXRpbypyYXRpbyArIDEpICk7XHJcblx0XHR2YXIgd2lkdGggPSByYXRpbyAqIGhlaWdodDtcclxuXHJcblx0XHQvLyBzZXQgZnJ1c3RydW0gZWRnZXNcclxuXHRcdHRoaXMubGVmdCA9IC13aWR0aC8yO1xyXG5cdFx0dGhpcy5yaWdodCA9IHdpZHRoLzI7XHJcblx0XHR0aGlzLnRvcCA9IGhlaWdodC8yO1xyXG5cdFx0dGhpcy5ib3R0b20gPSAtaGVpZ2h0LzI7XHJcblxyXG5cdFx0dGhpcy51cGRhdGVQcm9qZWN0aW9uTWF0cml4KCk7XHJcblxyXG5cdFx0Ly8gdXBkYXRlIHBvc2l0aW9uXHJcblx0XHR0aGlzLnBvc2l0aW9uLmNvcHkodGhpcy5fZm9jdXMpLnN1YiggdGhpcy5fbG9va0RpcmVjdGlvbi5jbG9uZSgpLm11bHRpcGx5U2NhbGFyKDIwMCkgKTtcclxuXHRcdGlmKCBNYXRoLmFicyggdGhpcy5fbG9va0RpcmVjdGlvbi5ub3JtYWxpemUoKS5kb3QobmV3IFRIUkVFLlZlY3RvcjMoMCwtMSwwKSkgKSA9PT0gMSApXHJcblx0XHRcdHRoaXMudXAuc2V0KDAsMCwxKTsgLy8gaWYgd2UncmUgbG9va2luZyBkb3duIHRoZSBZIGF4aXNcclxuXHRcdGVsc2VcclxuXHRcdFx0dGhpcy51cC5zZXQoMCwxLDApO1xyXG5cdFx0dGhpcy5sb29rQXQoIHRoaXMuX2ZvY3VzICk7XHJcblxyXG5cdFx0d2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdkaW9yYW1hVmlld1NldHRpbmdzJywgSlNPTi5zdHJpbmdpZnkoe1xyXG5cdFx0XHRmb2N1czogdGhpcy5fZm9jdXMudG9BcnJheSgpLFxyXG5cdFx0XHR2aWV3U2l6ZTogdGhpcy5fdmlld1NpemUsXHJcblx0XHRcdGxvb2tEaXJlY3Rpb246IHRoaXMuX2xvb2tEaXJlY3Rpb24udG9BcnJheSgpXHJcblx0XHR9KSk7XHJcblx0fVxyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCAqIGFzIExvYWRlcnMgZnJvbSAnLi9sb2FkZXJzJztcclxuaW1wb3J0IFByZXZpZXdDYW1lcmEgZnJvbSAnLi9jYW1lcmEnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGlvcmFtYVxyXG57XHJcblx0Y29uc3RydWN0b3Ioe2JnQ29sb3I9MHhhYWFhYWEsIGdyaWRPZmZzZXQ9WzAsMCwwXSwgZnVsbHNwYWNlPWZhbHNlLCByZW5kZXJlck9wdGlvbnM9e319ID0ge30pXHJcblx0e1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0c2VsZi5fY2FjaGUgPSBMb2FkZXJzLl9jYWNoZTtcclxuXHRcdHNlbGYuc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcclxuXHJcblx0XHQvLyBzZXQgdXAgcmVuZGVyZXIgYW5kIHNjYWxlXHJcblx0XHRpZihhbHRzcGFjZS5pbkNsaWVudClcclxuXHRcdHtcclxuXHRcdFx0c2VsZi5yZW5kZXJlciA9IGFsdHNwYWNlLmdldFRocmVlSlNSZW5kZXJlcihyZW5kZXJlck9wdGlvbnMpO1xyXG5cdFx0XHRzZWxmLl9lbnZQcm9taXNlID0gUHJvbWlzZS5hbGwoW2FsdHNwYWNlLmdldEVuY2xvc3VyZSgpLCBhbHRzcGFjZS5nZXRTcGFjZSgpXSlcclxuXHRcdFx0LnRoZW4oKFtlLCBzXSkgPT4ge1xyXG5cclxuXHRcdFx0XHRmdW5jdGlvbiBhZGp1c3RTY2FsZSgpe1xyXG5cdFx0XHRcdFx0c2VsZi5zY2VuZS5zY2FsZS5zZXRTY2FsYXIoZS5waXhlbHNQZXJNZXRlcik7XHJcblx0XHRcdFx0XHRzZWxmLmVudiA9IE9iamVjdC5hc3NpZ24oe30sIGUsIHMpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRhZGp1c3RTY2FsZSgpO1xyXG5cclxuXHRcdFx0XHRpZihmdWxsc3BhY2Upe1xyXG5cdFx0XHRcdFx0c2VsZi5fZnNQcm9taXNlID0gZS5yZXF1ZXN0RnVsbHNwYWNlKCkuY2F0Y2goKGUpID0+IGNvbnNvbGUud2FybignUmVxdWVzdCBmb3IgZnVsbHNwYWNlIGRlbmllZCcpKTtcclxuXHRcdFx0XHRcdGUuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNwYWNlY2hhbmdlJywgYWRqdXN0U2NhbGUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0XHRzZWxmLl9mc1Byb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlXHJcblx0XHR7XHJcblx0XHRcdC8vIHNldCB1cCBwcmV2aWV3IHJlbmRlcmVyLCBpbiBjYXNlIHdlJ3JlIG91dCBvZiB3b3JsZFxyXG5cdFx0XHRzZWxmLnJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoKTtcclxuXHRcdFx0c2VsZi5yZW5kZXJlci5zZXRTaXplKGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgsIGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0KTtcclxuXHRcdFx0c2VsZi5yZW5kZXJlci5zZXRDbGVhckNvbG9yKCBiZ0NvbG9yICk7XHJcblx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2VsZi5yZW5kZXJlci5kb21FbGVtZW50KTtcclxuXHJcblx0XHRcdHNlbGYucHJldmlld0NhbWVyYSA9IG5ldyBQcmV2aWV3Q2FtZXJhKCk7XHJcblx0XHRcdHNlbGYucHJldmlld0NhbWVyYS5ncmlkSGVscGVyLnBvc2l0aW9uLmZyb21BcnJheShncmlkT2Zmc2V0KTtcclxuXHRcdFx0c2VsZi5zY2VuZS5hZGQoc2VsZi5wcmV2aWV3Q2FtZXJhLCBzZWxmLnByZXZpZXdDYW1lcmEuZ3JpZEhlbHBlcik7XHJcblx0XHRcdHNlbGYucHJldmlld0NhbWVyYS5yZWdpc3Rlckhvb2tzKHNlbGYucmVuZGVyZXIpO1xyXG5cclxuXHRcdFx0Ly8gc2V0IHVwIGN1cnNvciBlbXVsYXRpb25cclxuXHRcdFx0YWx0c3BhY2UudXRpbGl0aWVzLnNoaW1zLmN1cnNvci5pbml0KHNlbGYuc2NlbmUsIHNlbGYucHJldmlld0NhbWVyYSwge3JlbmRlcmVyOiBzZWxmLnJlbmRlcmVyfSk7XHJcblxyXG5cdFx0XHQvLyBzdHViIGVudmlyb25tZW50XHJcblx0XHRcdHNlbGYuZW52ID0ge1xyXG5cdFx0XHRcdGlubmVyV2lkdGg6IDEwMjQsXHJcblx0XHRcdFx0aW5uZXJIZWlnaHQ6IDEwMjQsXHJcblx0XHRcdFx0aW5uZXJEZXB0aDogMTAyNCxcclxuXHRcdFx0XHRwaXhlbHNQZXJNZXRlcjogZnVsbHNwYWNlID8gMSA6IDEwMjQvMyxcclxuXHRcdFx0XHRzaWQ6ICdicm93c2VyJyxcclxuXHRcdFx0XHRuYW1lOiAnYnJvd3NlcicsXHJcblx0XHRcdFx0dGVtcGxhdGVTaWQ6ICdicm93c2VyJ1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2VsZi5fZW52UHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cdFx0XHRzZWxmLl9mc1Byb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cclxuXHRzdGFydCguLi5tb2R1bGVzKVxyXG5cdHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHJcblx0XHQvLyBkZXRlcm1pbmUgd2hpY2ggYXNzZXRzIGFyZW4ndCBzaGFyZWRcclxuXHRcdHZhciBzaW5nbGV0b25zID0ge307XHJcblx0XHRtb2R1bGVzLmZvckVhY2gobW9kID0+XHJcblx0XHR7XHJcblx0XHRcdGZ1bmN0aW9uIGNoZWNrQXNzZXQodXJsKXtcclxuXHRcdFx0XHRpZihzaW5nbGV0b25zW3VybF0gPT09IHVuZGVmaW5lZCkgc2luZ2xldG9uc1t1cmxdID0gdHJ1ZTtcclxuXHRcdFx0XHRlbHNlIGlmKHNpbmdsZXRvbnNbdXJsXSA9PT0gdHJ1ZSkgc2luZ2xldG9uc1t1cmxdID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdFx0T2JqZWN0LmtleXMobW9kLmFzc2V0cy50ZXh0dXJlcyB8fCB7fSkubWFwKGsgPT4gbW9kLmFzc2V0cy50ZXh0dXJlc1trXSkuZm9yRWFjaChjaGVja0Fzc2V0KTtcclxuXHRcdFx0T2JqZWN0LmtleXMobW9kLmFzc2V0cy5tb2RlbHMgfHwge30pLm1hcChrID0+IG1vZC5hc3NldHMubW9kZWxzW2tdKS5mb3JFYWNoKGNoZWNrQXNzZXQpO1xyXG5cdFx0XHRPYmplY3Qua2V5cyhtb2QuYXNzZXRzLnBvc3RlcnMgfHwge30pLm1hcChrID0+IG1vZC5hc3NldHMucG9zdGVyc1trXSkuZm9yRWFjaChjaGVja0Fzc2V0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGRldGVybWluZSBpZiB0aGUgdHJhY2tpbmcgc2tlbGV0b24gaXMgbmVlZGVkXHJcblx0XHRsZXQgbmVlZHNTa2VsZXRvbiA9IG1vZHVsZXMucmVkdWNlKChucyxtKSA9PiBucyB8fCBtLm5lZWRzU2tlbGV0b24sIGZhbHNlKTtcclxuXHRcdGlmKG5lZWRzU2tlbGV0b24gJiYgYWx0c3BhY2UuaW5DbGllbnQpe1xyXG5cdFx0XHRzZWxmLl9za2VsUHJvbWlzZSA9IFByb21pc2UuYWxsKFtcclxuXHRcdFx0XHRhbHRzcGFjZS5nZXRUaHJlZUpTVHJhY2tpbmdTa2VsZXRvbigpLFxyXG5cdFx0XHRcdHNlbGYuX2VudlByb21pc2VcclxuXHRcdFx0XSkudGhlbigoc2tlbCwgXykgPT4ge1xyXG5cdFx0XHRcdHNlbGYuc2NlbmUuYWRkKHNrZWwpO1xyXG5cdFx0XHRcdHNlbGYuZW52LnNrZWwgPSBza2VsO1xyXG5cdFx0XHRcdHNlbGYuZW52ID0gT2JqZWN0LmZyZWV6ZShzZWxmLmVudik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHNlbGYuX2VudlByb21pc2UudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0c2VsZi5lbnYgPSBPYmplY3QuZnJlZXplKHNlbGYuZW52KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdHNlbGYuX3NrZWxQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0UHJvbWlzZS5hbGwoW3NlbGYuX2VudlByb21pc2UsIHNlbGYuX2ZzUHJvbWlzZSwgc2VsZi5fc2tlbFByb21pc2VdKS50aGVuKCgpID0+XHJcblx0XHR7XHJcblx0XHRcdC8vIGNvbnN0cnVjdCBkaW9yYW1hc1xyXG5cdFx0XHRtb2R1bGVzLmZvckVhY2goZnVuY3Rpb24obW9kdWxlKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bGV0IHJvb3QgPSBudWxsO1xyXG5cclxuXHRcdFx0XHRpZihtb2R1bGUgaW5zdGFuY2VvZiBUSFJFRS5PYmplY3QzRCl7XHJcblx0XHRcdFx0XHRyb290ID0gbW9kdWxlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0cm9vdCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xyXG5cclxuXHRcdFx0XHRcdC8vIGhhbmRsZSBhYnNvbHV0ZSBwb3NpdGlvbmluZ1xyXG5cdFx0XHRcdFx0aWYobW9kdWxlLnRyYW5zZm9ybSl7XHJcblx0XHRcdFx0XHRcdHJvb3QubWF0cml4LmZyb21BcnJheShtb2R1bGUudHJhbnNmb3JtKTtcclxuXHRcdFx0XHRcdFx0cm9vdC5tYXRyaXguZGVjb21wb3NlKHJvb3QucG9zaXRpb24sIHJvb3QucXVhdGVybmlvbiwgcm9vdC5zY2FsZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdFx0aWYobW9kdWxlLnBvc2l0aW9uKXtcclxuXHRcdFx0XHRcdFx0XHRyb290LnBvc2l0aW9uLmZyb21BcnJheShtb2R1bGUucG9zaXRpb24pO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGlmKG1vZHVsZS5yb3RhdGlvbil7XHJcblx0XHRcdFx0XHRcdFx0cm9vdC5yb3RhdGlvbi5mcm9tQXJyYXkobW9kdWxlLnJvdGF0aW9uKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gaGFuZGxlIHJlbGF0aXZlIHBvc2l0aW9uaW5nXHJcblx0XHRcdFx0aWYobW9kdWxlLnZlcnRpY2FsQWxpZ24pe1xyXG5cdFx0XHRcdFx0bGV0IGhhbGZIZWlnaHQgPSBzZWxmLmVudi5pbm5lckhlaWdodC8oMipzZWxmLmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHRcdFx0XHRzd2l0Y2gobW9kdWxlLnZlcnRpY2FsQWxpZ24pe1xyXG5cdFx0XHRcdFx0Y2FzZSAndG9wJzpcclxuXHRcdFx0XHRcdFx0cm9vdC50cmFuc2xhdGVZKGhhbGZIZWlnaHQpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgJ2JvdHRvbSc6XHJcblx0XHRcdFx0XHRcdHJvb3QudHJhbnNsYXRlWSgtaGFsZkhlaWdodCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSAnbWlkZGxlJzpcclxuXHRcdFx0XHRcdFx0Ly8gZGVmYXVsdFxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUud2FybignSW52YWxpZCB2YWx1ZSBmb3IgXCJ2ZXJ0aWNhbEFsaWduXCIgLSAnLCBtb2R1bGUudmVydGljYWxBbGlnbik7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0c2VsZi5zY2VuZS5hZGQocm9vdCk7XHJcblxyXG5cdFx0XHRcdGlmKHNlbGYucHJldmlld0NhbWVyYSl7XHJcblx0XHRcdFx0XHRsZXQgYXhpcyA9IG5ldyBUSFJFRS5BeGlzSGVscGVyKDEpO1xyXG5cdFx0XHRcdFx0YXhpcy51c2VyRGF0YS5hbHRzcGFjZSA9IHtjb2xsaWRlcjoge2VuYWJsZWQ6IGZhbHNlfX07XHJcblx0XHRcdFx0XHRyb290LmFkZChheGlzKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHNlbGYubG9hZEFzc2V0cyhtb2R1bGUuYXNzZXRzLCBzaW5nbGV0b25zKS50aGVuKChyZXN1bHRzKSA9PiB7XHJcblx0XHRcdFx0XHRtb2R1bGUuaW5pdGlhbGl6ZShzZWxmLmVudiwgcm9vdCwgcmVzdWx0cyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gc3RhcnQgYW5pbWF0aW5nXHJcblx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uIGFuaW1hdGUodGltZXN0YW1wKVxyXG5cdFx0e1xyXG5cdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xyXG5cdFx0XHRzZWxmLnNjZW5lLnVwZGF0ZUFsbEJlaGF2aW9ycygpO1xyXG5cdFx0XHRpZih3aW5kb3cuVFdFRU4pIFRXRUVOLnVwZGF0ZSgpO1xyXG5cdFx0XHRzZWxmLnJlbmRlcmVyLnJlbmRlcihzZWxmLnNjZW5lLCBzZWxmLnByZXZpZXdDYW1lcmEpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRsb2FkQXNzZXRzKG1hbmlmZXN0LCBzaW5nbGV0b25zKVxyXG5cdHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHJcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cclxuXHRcdHtcclxuXHRcdFx0Ly8gcG9wdWxhdGUgY2FjaGVcclxuXHRcdFx0UHJvbWlzZS5hbGwoW1xyXG5cclxuXHRcdFx0XHQvLyBwb3B1bGF0ZSBtb2RlbCBjYWNoZVxyXG5cdFx0XHRcdC4uLk9iamVjdC5rZXlzKG1hbmlmZXN0Lm1vZGVscyB8fCB7fSkubWFwKGlkID0+IExvYWRlcnMuTW9kZWxQcm9taXNlKG1hbmlmZXN0Lm1vZGVsc1tpZF0pKSxcclxuXHJcblx0XHRcdFx0Ly8gcG9wdWxhdGUgZXhwbGljaXQgdGV4dHVyZSBjYWNoZVxyXG5cdFx0XHRcdC4uLk9iamVjdC5rZXlzKG1hbmlmZXN0LnRleHR1cmVzIHx8IHt9KS5tYXAoaWQgPT4gTG9hZGVycy5UZXh0dXJlUHJvbWlzZShtYW5pZmVzdC50ZXh0dXJlc1tpZF0pKSxcclxuXHJcblx0XHRcdFx0Ly8gZ2VuZXJhdGUgYWxsIHBvc3RlcnNcclxuXHRcdFx0XHQuLi5PYmplY3Qua2V5cyhtYW5pZmVzdC5wb3N0ZXJzIHx8IHt9KS5tYXAoaWQgPT4gTG9hZGVycy5Qb3N0ZXJQcm9taXNlKG1hbmlmZXN0LnBvc3RlcnNbaWRdKSlcclxuXHRcdFx0XSlcclxuXHJcblx0XHRcdC50aGVuKCgpID0+XHJcblx0XHRcdHtcclxuXHRcdFx0XHQvLyBwb3B1bGF0ZSBwYXlsb2FkIGZyb20gY2FjaGVcclxuXHRcdFx0XHR2YXIgcGF5bG9hZCA9IHttb2RlbHM6IHt9LCB0ZXh0dXJlczoge30sIHBvc3RlcnM6IHt9fTtcclxuXHJcblx0XHRcdFx0Zm9yKGxldCBpIGluIG1hbmlmZXN0Lm1vZGVscyl7XHJcblx0XHRcdFx0XHRsZXQgdXJsID0gbWFuaWZlc3QubW9kZWxzW2ldO1xyXG5cdFx0XHRcdFx0bGV0IHQgPSBMb2FkZXJzLl9jYWNoZS5tb2RlbHNbdXJsXTtcclxuXHRcdFx0XHRcdHBheWxvYWQubW9kZWxzW2ldID0gdCA/IHNpbmdsZXRvbnNbdXJsXSA/IHQgOiB0LmNsb25lKCkgOiBudWxsO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Zm9yKGxldCBpIGluIG1hbmlmZXN0LnRleHR1cmVzKXtcclxuXHRcdFx0XHRcdGxldCB1cmwgPSBtYW5pZmVzdC50ZXh0dXJlc1tpXTtcclxuXHRcdFx0XHRcdGxldCB0ID0gTG9hZGVycy5fY2FjaGUudGV4dHVyZXNbdXJsXTtcclxuXHRcdFx0XHRcdHBheWxvYWQudGV4dHVyZXNbaV0gPSB0ID8gc2luZ2xldG9uc1t1cmxdID8gdCA6IHQuY2xvbmUoKSA6IG51bGw7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRmb3IobGV0IGkgaW4gbWFuaWZlc3QucG9zdGVycyl7XHJcblx0XHRcdFx0XHRsZXQgdXJsID0gbWFuaWZlc3QucG9zdGVyc1tpXTtcclxuXHRcdFx0XHRcdGxldCB0ID0gTG9hZGVycy5fY2FjaGUucG9zdGVyc1t1cmxdO1xyXG5cdFx0XHRcdFx0cGF5bG9hZC5wb3N0ZXJzW2ldID0gdCA/IHNpbmdsZXRvbnNbdXJsXSA/IHQgOiB0LmNsb25lKCkgOiBudWxsO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0cmVzb2x2ZShwYXlsb2FkKTtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmNhdGNoKGUgPT4gY29uc29sZS5lcnJvcihlLnN0YWNrKSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG59O1xyXG4iXSwibmFtZXMiOlsibGV0IiwibG9hZGVyIiwic3VwZXIiLCJyaWdodCIsIkxvYWRlcnMuX2NhY2hlIiwiTG9hZGVycy5Nb2RlbFByb21pc2UiLCJMb2FkZXJzLlRleHR1cmVQcm9taXNlIiwiTG9hZGVycy5Qb3N0ZXJQcm9taXNlIiwiaSIsInVybCIsInQiXSwibWFwcGluZ3MiOiI7OztBQUVBQSxJQUFJLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQzs7QUFFNUQsU0FBUyxVQUFVLEVBQUUsR0FBRyxFQUFFLE9BQU87QUFDakM7Q0FDQyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBQSxPQUFPLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUE7OztDQUd0RSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQzVELElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtHQUN4QixHQUFHLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7R0FDNUI7T0FDSTtHQUNKLElBQUksUUFBUSxH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
