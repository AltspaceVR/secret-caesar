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
					cache.models[url] = result.scene;
					cache.models[url].matrixAutoUpdate = true;

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
				self._lookDirection.applyAxisAngle(right, Math.PI/6);
				//self.gridHelper.rotateOnAxis(right, Math.PI/2);
				self.recomputeViewport();
			}
			else if(e.key === 'ArrowUp'){
				var right$1 = new THREE.Vector3().crossVectors(self._lookDirection, self.up);
				self._lookDirection.applyAxisAngle(right$1, -Math.PI/6);
				//self.gridHelper.rotateOnAxis(right, -Math.PI/2);
				self.recomputeViewport();

			}
			else if(e.key === 'ArrowLeft'){
				self._lookDirection.applyAxisAngle(self.up, -Math.PI/6);
				//self.gridHelper.rotateOnAxis(self.up, -Math.PI/2);
				self.recomputeViewport();
			}
			else if(e.key === 'ArrowRight'){
				self._lookDirection.applyAxisAngle(self.up, Math.PI/6);
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

function ResolveButComplain(data, promise)
{
	return promise.then(
		function (result) { return Promise.resolve(result); },
		function (err) {
			console.error('Failed to load', data, '\n', err.stack);
			return Promise.resolve();
		}
	);
}

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
		if(window.TWEEN) { TWEEN.update(timestamp); }
		self.renderer.render(self.scene, self.previewCamera);
	});
};

Diorama.prototype.loadAssets = function loadAssets (manifest, singletons)
{
	var self = this;

	return new Promise(function (resolve, reject) {
		// populate cache
		Promise.all(Object.keys(manifest.models || {}).map(function (id) { return ResolveButComplain(id, ModelPromise(manifest.models[id])); }).concat( Object.keys(manifest.textures || {}).map(function (id) { return ResolveButComplain(id, TexturePromise(manifest.textures[id])); }),

			// generate all posters
			Object.keys(manifest.posters || {}).map(function (id) { return ResolveButComplain(id, PosterPromise(manifest.posters[id])); })
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uL3NyYy9sb2FkZXJzLmpzIiwiLi4vc3JjL2NhbWVyYS5qcyIsIi4uL3NyYy9tYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxuXHJcbmxldCBvcmlnaW5hbEdldFRleHR1cmUgPSBUSFJFRS5UZXh0dXJlTG9hZGVyLnByb3RvdHlwZS5sb2FkO1xyXG5cclxuZnVuY3Rpb24gZ2V0VGV4dHVyZSAodXJsLCByZXNvbHZlKVxyXG57XHJcblx0aWYodGhpcy5mb3JjZUxvYWQpIHJldHVybiBvcmlnaW5hbEdldFRleHR1cmUuY2FsbCh0aGlzLCB1cmwsIHJlc29sdmUpO1xyXG5cclxuXHQvLyBjb25zdHJ1Y3QgYWJzb2x1dGUgdXJsXHJcblx0aWYgKHVybCAmJiAhdXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKSAmJiAhdXJsLnN0YXJ0c1dpdGgoJy8vJykpIHtcclxuXHRcdGlmICh1cmwuc3RhcnRzV2l0aCgnLycpKSB7XHJcblx0XHRcdHVybCA9IGxvY2F0aW9uLm9yaWdpbiArIHVybDtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHR2YXIgY3VyclBhdGggPSBsb2NhdGlvbi5wYXRobmFtZTtcclxuXHRcdFx0aWYgKCFjdXJyUGF0aC5lbmRzV2l0aCgnLycpKSB7XHJcblx0XHRcdFx0Y3VyclBhdGggPSBsb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpLnNsaWNlKDAsIC0xKS5qb2luKCcvJykgKyAnLyc7XHJcblx0XHRcdH1cclxuXHRcdFx0dXJsID0gbG9jYXRpb24ub3JpZ2luICsgY3VyclBhdGggKyB1cmw7XHJcblx0XHR9XHJcblx0fVxyXG5cdGNvbnNvbGUuaW5mbygnQWxsb3dpbmcgQWx0c3BhY2UgdG8gbG9hZCAnICsgdXJsKTtcclxuXHR2YXIgaW1hZ2UgPSB7c3JjOiB1cmx9O1xyXG5cdHZhciB0ZXggPSBuZXcgVEhSRUUuVGV4dHVyZShpbWFnZSk7XHJcblx0aWYgKHJlc29sdmUpIHtcclxuXHRcdHJlc29sdmUodGV4KTtcclxuXHR9XHJcblx0cmV0dXJuIHRleDtcclxufVxyXG5cclxuaWYoYWx0c3BhY2UuaW5DbGllbnQpXHJcbntcclxuXHRsZXQgbm9vcCA9ICgpID0+IHt9O1xyXG5cdFRIUkVFLkxvYWRlci5IYW5kbGVycy5hZGQoL2pwZT9nfHBuZy9pLCB7IGxvYWQ6IGdldFRleHR1cmUsIHNldENyb3NzT3JpZ2luOiBub29wIH0pO1xyXG5cdFRIUkVFLlRleHR1cmVMb2FkZXIucHJvdG90eXBlLmxvYWQgPSBnZXRUZXh0dXJlO1xyXG59XHJcblxyXG5sZXQgY2FjaGUgPSB7bW9kZWxzOiB7fSwgdGV4dHVyZXM6IHt9LCBwb3N0ZXJzOiB7fX07XHJcblxyXG5mdW5jdGlvbiBNb2RlbFByb21pc2UodXJsKVxyXG57XHJcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XHJcblx0e1xyXG5cdFx0aWYoY2FjaGUubW9kZWxzW3VybF0pe1xyXG5cdFx0XHRyZXR1cm4gcmVzb2x2ZShjYWNoZS5tb2RlbHNbdXJsXSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gTk9URTogZ2xURiBsb2FkZXIgZG9lcyBub3QgY2F0Y2ggZXJyb3JzXHJcblx0XHRlbHNlIGlmKC9cXC5nbHRmJC9pLnRlc3QodXJsKSl7XHJcblx0XHRcdGlmKFRIUkVFLmdsVEZMb2FkZXIpe1xyXG5cdFx0XHRcdGxldCBsb2FkZXIgPSBuZXcgVEhSRUUuZ2xURkxvYWRlcigpO1xyXG5cdFx0XHRcdGxvYWRlci5sb2FkKHVybCwgKHJlc3VsdCkgPT4ge1xyXG5cdFx0XHRcdFx0Y2FjaGUubW9kZWxzW3VybF0gPSByZXN1bHQuc2NlbmUuY2hpbGRyZW5bMF0uY2hpbGRyZW5bMF07XHJcblx0XHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShjYWNoZS5tb2RlbHNbdXJsXSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZihUSFJFRS5HTFRGTG9hZGVyKXtcclxuXHRcdFx0XHRsZXQgbG9hZGVyID0gbmV3IFRIUkVFLkdMVEZMb2FkZXIoKTtcclxuXHRcdFx0XHRsb2FkZXIubG9hZCh1cmwsIHJlc3VsdCA9PiB7XHJcblx0XHRcdFx0XHRjYWNoZS5tb2RlbHNbdXJsXSA9IHJlc3VsdC5zY2VuZTtcclxuXHRcdFx0XHRcdGNhY2hlLm1vZGVsc1t1cmxdLm1hdHJpeEF1dG9VcGRhdGUgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybiByZXNvbHZlKGNhY2hlLm1vZGVsc1t1cmxdKTtcclxuXHRcdFx0XHR9LCAoKSA9PiB7fSwgcmVqZWN0KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKGBnbFRGIGxvYWRlciBub3QgZm91bmQuIFwiJHt1cmx9XCIgbm90IGxvYWRlZC5gKTtcclxuXHRcdFx0XHRyZWplY3QoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGVsc2UgaWYoL1xcLmRhZSQvaS50ZXN0KHVybCkpe1xyXG5cdFx0XHRpZihUSFJFRS5Db2xsYWRhTG9hZGVyKXtcclxuXHRcdFx0XHRsZXQgbG9hZGVyID0gbmV3IFRIUkVFLkNvbGxhZGFMb2FkZXIoKTtcclxuXHRcdFx0XHRsb2FkZXIubG9hZCh1cmwsIHJlc3VsdCA9PiB7XHJcblx0XHRcdFx0XHRjYWNoZS5tb2RlbHNbdXJsXSA9IHJlc3VsdC5zY2VuZS5jaGlsZHJlblswXTtcclxuXHRcdFx0XHRcdHJldHVybiByZXNvbHZlKHJlc3VsdC5zY2VuZS5jaGlsZHJlblswXSlcclxuXHRcdFx0XHR9LCBudWxsLCByZWplY3QpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoYENvbGxhZGEgbG9hZGVyIG5vdCBmb3VuZC4gXCIke3VybH1cIiBub3QgbG9hZGVkLmApO1xyXG5cdFx0XHRcdHJlamVjdCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIFRleHR1cmVQcm9taXNlKHVybCwgY29uZmlnID0ge2ZvcmNlTG9hZDogZmFsc2V9KXtcclxuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cclxuXHR7XHJcblx0XHRpZihjYWNoZS50ZXh0dXJlc1t1cmxdKVxyXG5cdFx0XHRyZXR1cm4gcmVzb2x2ZShjYWNoZS50ZXh0dXJlc1t1cmxdKTtcclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRsZXQgbG9hZGVyID0gbmV3IFRIUkVFLlRleHR1cmVMb2FkZXIoKTtcclxuXHRcdFx0bG9hZGVyLmZvcmNlTG9hZCA9IGNvbmZpZy5mb3JjZUxvYWQ7XHJcblx0XHRcdGxvYWRlci5sb2FkKHVybCwgdGV4dHVyZSA9PiB7XHJcblx0XHRcdFx0Y2FjaGUudGV4dHVyZXNbdXJsXSA9IHRleHR1cmU7XHJcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUodGV4dHVyZSk7XHJcblx0XHRcdH0sIG51bGwsIHJlamVjdCk7XHJcblx0XHR9XHJcblx0fSk7XHJcbn1cclxuXHJcbmNsYXNzIFZpZGVvUHJvbWlzZSBleHRlbmRzIFByb21pc2Uge1xyXG5cdGNvbnN0cnVjdG9yKHVybClcclxuXHR7XHJcblx0XHQvLyBzdGFydCBsb2FkZXJcclxuXHRcdHZhciB2aWRTcmMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpO1xyXG5cdFx0dmlkU3JjLmF1dG9wbGF5ID0gdHJ1ZTtcclxuXHRcdHZpZFNyYy5sb29wID0gdHJ1ZTtcclxuXHRcdHZpZFNyYy5zcmMgPSB1cmw7XHJcblx0XHR2aWRTcmMuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodmlkU3JjKTtcclxuXHJcblx0XHR2YXIgdGV4ID0gbmV3IFRIUkVFLlZpZGVvVGV4dHVyZSh2aWRTcmMpO1xyXG5cdFx0dGV4Lm1pbkZpbHRlciA9IFRIUkVFLkxpbmVhckZpbHRlcjtcclxuXHRcdHRleC5tYWdGaWx0ZXIgPSBUSFJFRS5MaW5lYXJGaWx0ZXI7XHJcblx0XHR0ZXguZm9ybWF0ID0gVEhSRUUuUkdCRm9ybWF0O1xyXG5cclxuXHRcdC8vY2FjaGUudmlkZW9zW3VybF0gPSB0ZXg7XHJcblx0XHQvL3BheWxvYWQudmlkZW9zW2lkXSA9IGNhY2hlLnZpZGVvc1t1cmxdO1xyXG5cclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodGV4KTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIFBvc3RlclByb21pc2UodXJsLCByYXRpbyA9IC0xKXtcclxuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cclxuXHR7XHJcblx0XHRpZihjYWNoZS5wb3N0ZXJzW3VybF0pe1xyXG5cdFx0XHRyZXR1cm4gcmVzb2x2ZShjYWNoZS5wb3N0ZXJzW3VybF0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSByZXR1cm4gKG5ldyBUZXh0dXJlUHJvbWlzZSh1cmwsIHtmb3JjZUxvYWQ6IHJhdGlvIDwgMH0pKS50aGVuKHRleCA9PlxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWYocmF0aW8gPCAwKVxyXG5cdFx0XHRcdFx0cmF0aW8gPSB0ZXguaW1hZ2Uud2lkdGggLyB0ZXguaW1hZ2UuaGVpZ2h0O1xyXG5cclxuXHRcdFx0XHRsZXQgZ2VvLCBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogdGV4LCBzaWRlOiBUSFJFRS5Eb3VibGVTaWRlfSk7XHJcblxyXG5cdFx0XHRcdGlmKHJhdGlvID4gMSl7XHJcblx0XHRcdFx0XHRnZW8gPSBuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSgxLCAxL3JhdGlvKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRnZW8gPSBuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeShyYXRpbywgMSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjYWNoZS5wb3N0ZXJzW3VybF0gPSBuZXcgVEhSRUUuTWVzaChnZW8sIG1hdCk7XHJcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUoY2FjaGUucG9zdGVyc1t1cmxdKTtcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHR9KTtcclxufVxyXG5cclxuZXhwb3J0IHsgTW9kZWxQcm9taXNlLCBUZXh0dXJlUHJvbWlzZSwgVmlkZW9Qcm9taXNlLCBQb3N0ZXJQcm9taXNlLCBjYWNoZSBhcyBfY2FjaGUgfTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUHJldmlld0NhbWVyYSBleHRlbmRzIFRIUkVFLk9ydGhvZ3JhcGhpY0NhbWVyYVxyXG57XHJcblx0Y29uc3RydWN0b3IoZm9jdXMsIHZpZXdTaXplLCBsb29rRGlyZWN0aW9uKVxyXG5cdHtcclxuXHRcdHN1cGVyKC0xLCAxLCAxLCAtMSwgLjEsIDQwMCk7XHJcblxyXG5cdFx0bGV0IHNldHRpbmdzID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdkaW9yYW1hVmlld1NldHRpbmdzJyk7XHJcblx0XHRpZihzZXR0aW5ncyl7XHJcblx0XHRcdHNldHRpbmdzID0gSlNPTi5wYXJzZShzZXR0aW5ncyk7XHJcblx0XHRcdGlmKCFmb2N1cylcclxuXHRcdFx0XHRmb2N1cyA9IG5ldyBUSFJFRS5WZWN0b3IzKCkuZnJvbUFycmF5KHNldHRpbmdzLmZvY3VzKTtcclxuXHRcdFx0aWYoIXZpZXdTaXplKVxyXG5cdFx0XHRcdHZpZXdTaXplID0gc2V0dGluZ3Mudmlld1NpemU7XHJcblx0XHRcdGlmKCFsb29rRGlyZWN0aW9uKVxyXG5cdFx0XHRcdGxvb2tEaXJlY3Rpb24gPSBuZXcgVEhSRUUuVmVjdG9yMygpLmZyb21BcnJheShzZXR0aW5ncy5sb29rRGlyZWN0aW9uKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLl92aWV3U2l6ZSA9IHZpZXdTaXplIHx8IDQwO1xyXG5cdFx0dGhpcy5fZm9jdXMgPSBmb2N1cyB8fCBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0dGhpcy5fbG9va0RpcmVjdGlvbiA9IGxvb2tEaXJlY3Rpb24gfHwgbmV3IFRIUkVFLlZlY3RvcjMoMCwtMSwwKTtcclxuXHRcdHRoaXMuZ3JpZEhlbHBlciA9IG5ldyBUSFJFRS5HcmlkSGVscGVyKDMwMCwgMSk7XHJcblx0XHR0aGlzLmdyaWRIZWxwZXIudXNlckRhdGEgPSB7YWx0c3BhY2U6IHtjb2xsaWRlcjoge2VuYWJsZWQ6IGZhbHNlfX19O1xyXG5cdFx0Ly90aGlzLmdyaWRIZWxwZXIucXVhdGVybmlvbi5zZXRGcm9tVW5pdFZlY3RvcnMoIG5ldyBUSFJFRS5WZWN0b3IzKDAsLTEsMCksIHRoaXMuX2xvb2tEaXJlY3Rpb24gKTtcclxuXHR9XHJcblxyXG5cdGdldCB2aWV3U2l6ZSgpe1xyXG5cdFx0cmV0dXJuIHRoaXMuX3ZpZXdTaXplO1xyXG5cdH1cclxuXHRzZXQgdmlld1NpemUodmFsKXtcclxuXHRcdHRoaXMuX3ZpZXdTaXplID0gdmFsO1xyXG5cdFx0dGhpcy5yZWNvbXB1dGVWaWV3cG9ydCgpO1xyXG5cdH1cclxuXHJcblx0Z2V0IGZvY3VzKCl7XHJcblx0XHRyZXR1cm4gdGhpcy5fZm9jdXM7XHJcblx0fVxyXG5cdHNldCBmb2N1cyh2YWwpe1xyXG5cdFx0dGhpcy5fZm9jdXMuY29weSh2YWwpO1xyXG5cdFx0dGhpcy5yZWNvbXB1dGVWaWV3cG9ydCgpO1xyXG5cdH1cclxuXHJcblx0Z2V0IGxvb2tEaXJlY3Rpb24oKXtcclxuXHRcdHJldHVybiB0aGlzLl9sb29rRGlyZWN0aW9uO1xyXG5cdH1cclxuXHRzZXQgbG9va0RpcmVjdGlvbih2YWwpe1xyXG5cdFx0dGhpcy5fbG9va0RpcmVjdGlvbi5jb3B5KHZhbCk7XHJcblx0XHR0aGlzLnJlY29tcHV0ZVZpZXdwb3J0KCk7XHJcblx0fVxyXG5cclxuXHRyZWdpc3Rlckhvb2tzKHJlbmRlcmVyKVxyXG5cdHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHNlbGYucmVuZGVyZXIgPSByZW5kZXJlcjtcclxuXHJcblx0XHQvLyBzZXQgc3R5bGVzIG9uIHRoZSBwYWdlLCBzbyB0aGUgcHJldmlldyB3b3JrcyByaWdodFxyXG5cdFx0ZG9jdW1lbnQuYm9keS5wYXJlbnRFbGVtZW50LnN0eWxlLmhlaWdodCA9ICcxMDAlJztcclxuXHRcdGRvY3VtZW50LmJvZHkuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xyXG5cdFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5tYXJnaW4gPSAnMCc7XHJcblx0XHRkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XHJcblxyXG5cdFx0dmFyIGluZm8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcblx0XHRpbmZvLmlubmVySFRNTCA9IFsnTWlkZGxlIGNsaWNrIGFuZCBkcmFnIHRvIHBhbicsICdNb3VzZSB3aGVlbCB0byB6b29tJywgJ0Fycm93IGtleXMgdG8gcm90YXRlJ10uam9pbignPGJyLz4nKTtcclxuXHRcdE9iamVjdC5hc3NpZ24oaW5mby5zdHlsZSwge1xyXG5cdFx0XHRwb3NpdGlvbjogJ2ZpeGVkJyxcclxuXHRcdFx0dG9wOiAnMTBweCcsXHJcblx0XHRcdGxlZnQ6ICcxMHB4JyxcclxuXHRcdFx0bWFyZ2luOiAwXHJcblx0XHR9KTtcclxuXHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaW5mbyk7XHJcblxyXG5cdFx0Ly8gcmVzaXplIHRoZSBwcmV2aWV3IGNhbnZhcyB3aGVuIHdpbmRvdyByZXNpemVzXHJcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgZSA9PiBzZWxmLnJlY29tcHV0ZVZpZXdwb3J0KCkpO1xyXG5cdFx0c2VsZi5yZWNvbXB1dGVWaWV3cG9ydCgpO1xyXG5cclxuXHRcdC8vIG1pZGRsZSBjbGljayBhbmQgZHJhZyB0byBwYW4gdmlld1xyXG5cdFx0dmFyIGRyYWdTdGFydCA9IG51bGwsIGZvY3VzU3RhcnQgPSBudWxsO1xyXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGUgPT4ge1xyXG5cdFx0XHRpZihlLmJ1dHRvbiA9PT0gMSl7XHJcblx0XHRcdFx0ZHJhZ1N0YXJ0ID0ge3g6IGUuY2xpZW50WCwgeTogZS5jbGllbnRZfTtcclxuXHRcdFx0XHRmb2N1c1N0YXJ0ID0gc2VsZi5fZm9jdXMuY2xvbmUoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGUgPT4ge1xyXG5cdFx0XHRpZihlLmJ1dHRvbiA9PT0gMSl7XHJcblx0XHRcdFx0ZHJhZ1N0YXJ0ID0gbnVsbDtcclxuXHRcdFx0XHRmb2N1c1N0YXJ0ID0gbnVsbDtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZSA9PiB7XHJcblx0XHRcdGlmKGRyYWdTdGFydClcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxldCB7Y2xpZW50V2lkdGg6IHcsIGNsaWVudEhlaWdodDogaH0gPSBkb2N1bWVudC5ib2R5O1xyXG5cdFx0XHRcdGxldCBwaXhlbHNQZXJNZXRlciA9IE1hdGguc3FydCh3KncraCpoKSAvIHNlbGYuX3ZpZXdTaXplO1xyXG5cdFx0XHRcdGxldCBkeCA9IGUuY2xpZW50WCAtIGRyYWdTdGFydC54LCBkeSA9IGUuY2xpZW50WSAtIGRyYWdTdGFydC55O1xyXG5cdFx0XHRcdGxldCByaWdodCA9IG5ldyBUSFJFRS5WZWN0b3IzKCkuY3Jvc3NWZWN0b3JzKHNlbGYuX2xvb2tEaXJlY3Rpb24sIHNlbGYudXApO1xyXG5cclxuXHRcdFx0XHRzZWxmLl9mb2N1cy5jb3B5KGZvY3VzU3RhcnQpXHJcblx0XHRcdFx0XHQuYWRkKHNlbGYudXAuY2xvbmUoKS5tdWx0aXBseVNjYWxhcihkeS9waXhlbHNQZXJNZXRlcikpXHJcblx0XHRcdFx0XHQuYWRkKHJpZ2h0Lm11bHRpcGx5U2NhbGFyKC1keC9waXhlbHNQZXJNZXRlcikpO1xyXG5cclxuXHRcdFx0XHRzZWxmLnJlY29tcHV0ZVZpZXdwb3J0KCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHdoZWVsIHRvIHpvb21cclxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd3aGVlbCcsIGUgPT4ge1xyXG5cdFx0XHRpZihlLmRlbHRhWSA8IDApe1xyXG5cdFx0XHRcdHNlbGYuX3ZpZXdTaXplICo9IDAuOTA7XHJcblx0XHRcdFx0c2VsZi5yZWNvbXB1dGVWaWV3cG9ydCgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYoZS5kZWx0YVkgPiAwKXtcclxuXHRcdFx0XHRzZWxmLl92aWV3U2l6ZSAqPSAxLjE7XHJcblx0XHRcdFx0c2VsZi5yZWNvbXB1dGVWaWV3cG9ydCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBhcnJvdyBrZXlzIHRvIHJvdGF0ZVxyXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBlID0+IHtcclxuXHRcdFx0aWYoZS5rZXkgPT09ICdBcnJvd0Rvd24nKXtcclxuXHRcdFx0XHRsZXQgcmlnaHQgPSBuZXcgVEhSRUUuVmVjdG9yMygpLmNyb3NzVmVjdG9ycyhzZWxmLl9sb29rRGlyZWN0aW9uLCBzZWxmLnVwKTtcclxuXHRcdFx0XHRzZWxmLl9sb29rRGlyZWN0aW9uLmFwcGx5QXhpc0FuZ2xlKHJpZ2h0LCBNYXRoLlBJLzYpO1xyXG5cdFx0XHRcdC8vc2VsZi5ncmlkSGVscGVyLnJvdGF0ZU9uQXhpcyhyaWdodCwgTWF0aC5QSS8yKTtcclxuXHRcdFx0XHRzZWxmLnJlY29tcHV0ZVZpZXdwb3J0KCk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZihlLmtleSA9PT0gJ0Fycm93VXAnKXtcclxuXHRcdFx0XHRsZXQgcmlnaHQgPSBuZXcgVEhSRUUuVmVjdG9yMygpLmNyb3NzVmVjdG9ycyhzZWxmLl9sb29rRGlyZWN0aW9uLCBzZWxmLnVwKTtcclxuXHRcdFx0XHRzZWxmLl9sb29rRGlyZWN0aW9uLmFwcGx5QXhpc0FuZ2xlKHJpZ2h0LCAtTWF0aC5QSS82KTtcclxuXHRcdFx0XHQvL3NlbGYuZ3JpZEhlbHBlci5yb3RhdGVPbkF4aXMocmlnaHQsIC1NYXRoLlBJLzIpO1xyXG5cdFx0XHRcdHNlbGYucmVjb21wdXRlVmlld3BvcnQoKTtcclxuXHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZihlLmtleSA9PT0gJ0Fycm93TGVmdCcpe1xyXG5cdFx0XHRcdHNlbGYuX2xvb2tEaXJlY3Rpb24uYXBwbHlBeGlzQW5nbGUoc2VsZi51cCwgLU1hdGguUEkvNik7XHJcblx0XHRcdFx0Ly9zZWxmLmdyaWRIZWxwZXIucm90YXRlT25BeGlzKHNlbGYudXAsIC1NYXRoLlBJLzIpO1xyXG5cdFx0XHRcdHNlbGYucmVjb21wdXRlVmlld3BvcnQoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmKGUua2V5ID09PSAnQXJyb3dSaWdodCcpe1xyXG5cdFx0XHRcdHNlbGYuX2xvb2tEaXJlY3Rpb24uYXBwbHlBeGlzQW5nbGUoc2VsZi51cCwgTWF0aC5QSS82KTtcclxuXHRcdFx0XHQvL3NlbGYuZ3JpZEhlbHBlci5yb3RhdGVPbkF4aXMoc2VsZi51cCwgTWF0aC5QSS8yKTtcclxuXHRcdFx0XHRzZWxmLnJlY29tcHV0ZVZpZXdwb3J0KCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cmVjb21wdXRlVmlld3BvcnQoKVxyXG5cdHtcclxuXHRcdHZhciB7Y2xpZW50V2lkdGg6IHcsIGNsaWVudEhlaWdodDogaH0gPSBkb2N1bWVudC5ib2R5O1xyXG5cclxuXHRcdC8vIHJlc2l6ZSBjYW52YXNcclxuXHRcdHRoaXMucmVuZGVyZXIuc2V0U2l6ZSh3LCBoKTtcclxuXHJcblx0XHQvLyBjb21wdXRlIHdpbmRvdyBkaW1lbnNpb25zIGZyb20gdmlldyBzaXplXHJcblx0XHR2YXIgcmF0aW8gPSB3L2g7XHJcblx0XHR2YXIgaGVpZ2h0ID0gTWF0aC5zcXJ0KCAodGhpcy5fdmlld1NpemUqdGhpcy5fdmlld1NpemUpIC8gKHJhdGlvKnJhdGlvICsgMSkgKTtcclxuXHRcdHZhciB3aWR0aCA9IHJhdGlvICogaGVpZ2h0O1xyXG5cclxuXHRcdC8vIHNldCBmcnVzdHJ1bSBlZGdlc1xyXG5cdFx0dGhpcy5sZWZ0ID0gLXdpZHRoLzI7XHJcblx0XHR0aGlzLnJpZ2h0ID0gd2lkdGgvMjtcclxuXHRcdHRoaXMudG9wID0gaGVpZ2h0LzI7XHJcblx0XHR0aGlzLmJvdHRvbSA9IC1oZWlnaHQvMjtcclxuXHJcblx0XHR0aGlzLnVwZGF0ZVByb2plY3Rpb25NYXRyaXgoKTtcclxuXHJcblx0XHQvLyB1cGRhdGUgcG9zaXRpb25cclxuXHRcdHRoaXMucG9zaXRpb24uY29weSh0aGlzLl9mb2N1cykuc3ViKCB0aGlzLl9sb29rRGlyZWN0aW9uLmNsb25lKCkubXVsdGlwbHlTY2FsYXIoMjAwKSApO1xyXG5cdFx0aWYoIE1hdGguYWJzKCB0aGlzLl9sb29rRGlyZWN0aW9uLm5vcm1hbGl6ZSgpLmRvdChuZXcgVEhSRUUuVmVjdG9yMygwLC0xLDApKSApID09PSAxIClcclxuXHRcdFx0dGhpcy51cC5zZXQoMCwwLDEpOyAvLyBpZiB3ZSdyZSBsb29raW5nIGRvd24gdGhlIFkgYXhpc1xyXG5cdFx0ZWxzZVxyXG5cdFx0XHR0aGlzLnVwLnNldCgwLDEsMCk7XHJcblx0XHR0aGlzLmxvb2tBdCggdGhpcy5fZm9jdXMgKTtcclxuXHJcblx0XHR3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Rpb3JhbWFWaWV3U2V0dGluZ3MnLCBKU09OLnN0cmluZ2lmeSh7XHJcblx0XHRcdGZvY3VzOiB0aGlzLl9mb2N1cy50b0FycmF5KCksXHJcblx0XHRcdHZpZXdTaXplOiB0aGlzLl92aWV3U2l6ZSxcclxuXHRcdFx0bG9va0RpcmVjdGlvbjogdGhpcy5fbG9va0RpcmVjdGlvbi50b0FycmF5KClcclxuXHRcdH0pKTtcclxuXHR9XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0ICogYXMgTG9hZGVycyBmcm9tICcuL2xvYWRlcnMnO1xyXG5pbXBvcnQgUHJldmlld0NhbWVyYSBmcm9tICcuL2NhbWVyYSc7XHJcblxyXG5mdW5jdGlvbiBSZXNvbHZlQnV0Q29tcGxhaW4oZGF0YSwgcHJvbWlzZSlcclxue1xyXG5cdHJldHVybiBwcm9taXNlLnRoZW4oXHJcblx0XHRyZXN1bHQgPT4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCksXHJcblx0XHRlcnIgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gbG9hZCcsIGRhdGEsICdcXG4nLCBlcnIuc3RhY2spO1xyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblx0XHR9XHJcblx0KTtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGlvcmFtYVxyXG57XHJcblx0Y29uc3RydWN0b3Ioe2JnQ29sb3I9MHhhYWFhYWEsIGdyaWRPZmZzZXQ9WzAsMCwwXSwgZnVsbHNwYWNlPWZhbHNlLCByZW5kZXJlck9wdGlvbnM9e319ID0ge30pXHJcblx0e1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cdFx0c2VsZi5fY2FjaGUgPSBMb2FkZXJzLl9jYWNoZTtcclxuXHRcdHNlbGYuc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcclxuXHJcblx0XHQvLyBzZXQgdXAgcmVuZGVyZXIgYW5kIHNjYWxlXHJcblx0XHRpZihhbHRzcGFjZS5pbkNsaWVudClcclxuXHRcdHtcclxuXHRcdFx0c2VsZi5yZW5kZXJlciA9IGFsdHNwYWNlLmdldFRocmVlSlNSZW5kZXJlcihyZW5kZXJlck9wdGlvbnMpO1xyXG5cdFx0XHRzZWxmLl9lbnZQcm9taXNlID0gUHJvbWlzZS5hbGwoW2FsdHNwYWNlLmdldEVuY2xvc3VyZSgpLCBhbHRzcGFjZS5nZXRTcGFjZSgpXSlcclxuXHRcdFx0LnRoZW4oKFtlLCBzXSkgPT4ge1xyXG5cclxuXHRcdFx0XHRmdW5jdGlvbiBhZGp1c3RTY2FsZSgpe1xyXG5cdFx0XHRcdFx0c2VsZi5zY2VuZS5zY2FsZS5zZXRTY2FsYXIoZS5waXhlbHNQZXJNZXRlcik7XHJcblx0XHRcdFx0XHRzZWxmLmVudiA9IE9iamVjdC5hc3NpZ24oe30sIGUsIHMpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRhZGp1c3RTY2FsZSgpO1xyXG5cclxuXHRcdFx0XHRpZihmdWxsc3BhY2Upe1xyXG5cdFx0XHRcdFx0c2VsZi5fZnNQcm9taXNlID0gZS5yZXF1ZXN0RnVsbHNwYWNlKCkuY2F0Y2goKGUpID0+IGNvbnNvbGUud2FybignUmVxdWVzdCBmb3IgZnVsbHNwYWNlIGRlbmllZCcpKTtcclxuXHRcdFx0XHRcdGUuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNwYWNlY2hhbmdlJywgYWRqdXN0U2NhbGUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0XHRzZWxmLl9mc1Byb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlXHJcblx0XHR7XHJcblx0XHRcdC8vIHNldCB1cCBwcmV2aWV3IHJlbmRlcmVyLCBpbiBjYXNlIHdlJ3JlIG91dCBvZiB3b3JsZFxyXG5cdFx0XHRzZWxmLnJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoKTtcclxuXHRcdFx0c2VsZi5yZW5kZXJlci5zZXRTaXplKGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgsIGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0KTtcclxuXHRcdFx0c2VsZi5yZW5kZXJlci5zZXRDbGVhckNvbG9yKCBiZ0NvbG9yICk7XHJcblx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2VsZi5yZW5kZXJlci5kb21FbGVtZW50KTtcclxuXHJcblx0XHRcdHNlbGYucHJldmlld0NhbWVyYSA9IG5ldyBQcmV2aWV3Q2FtZXJhKCk7XHJcblx0XHRcdHNlbGYucHJldmlld0NhbWVyYS5ncmlkSGVscGVyLnBvc2l0aW9uLmZyb21BcnJheShncmlkT2Zmc2V0KTtcclxuXHRcdFx0c2VsZi5zY2VuZS5hZGQoc2VsZi5wcmV2aWV3Q2FtZXJhLCBzZWxmLnByZXZpZXdDYW1lcmEuZ3JpZEhlbHBlcik7XHJcblx0XHRcdHNlbGYucHJldmlld0NhbWVyYS5yZWdpc3Rlckhvb2tzKHNlbGYucmVuZGVyZXIpO1xyXG5cclxuXHRcdFx0Ly8gc2V0IHVwIGN1cnNvciBlbXVsYXRpb25cclxuXHRcdFx0YWx0c3BhY2UudXRpbGl0aWVzLnNoaW1zLmN1cnNvci5pbml0KHNlbGYuc2NlbmUsIHNlbGYucHJldmlld0NhbWVyYSwge3JlbmRlcmVyOiBzZWxmLnJlbmRlcmVyfSk7XHJcblxyXG5cdFx0XHQvLyBzdHViIGVudmlyb25tZW50XHJcblx0XHRcdHNlbGYuZW52ID0ge1xyXG5cdFx0XHRcdGlubmVyV2lkdGg6IDEwMjQsXHJcblx0XHRcdFx0aW5uZXJIZWlnaHQ6IDEwMjQsXHJcblx0XHRcdFx0aW5uZXJEZXB0aDogMTAyNCxcclxuXHRcdFx0XHRwaXhlbHNQZXJNZXRlcjogZnVsbHNwYWNlID8gMSA6IDEwMjQvMyxcclxuXHRcdFx0XHRzaWQ6ICdicm93c2VyJyxcclxuXHRcdFx0XHRuYW1lOiAnYnJvd3NlcicsXHJcblx0XHRcdFx0dGVtcGxhdGVTaWQ6ICdicm93c2VyJ1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0c2VsZi5fZW52UHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cdFx0XHRzZWxmLl9mc1Byb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cclxuXHRzdGFydCguLi5tb2R1bGVzKVxyXG5cdHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHJcblx0XHQvLyBkZXRlcm1pbmUgd2hpY2ggYXNzZXRzIGFyZW4ndCBzaGFyZWRcclxuXHRcdHZhciBzaW5nbGV0b25zID0ge307XHJcblx0XHRtb2R1bGVzLmZvckVhY2gobW9kID0+XHJcblx0XHR7XHJcblx0XHRcdGZ1bmN0aW9uIGNoZWNrQXNzZXQodXJsKXtcclxuXHRcdFx0XHRpZihzaW5nbGV0b25zW3VybF0gPT09IHVuZGVmaW5lZCkgc2luZ2xldG9uc1t1cmxdID0gdHJ1ZTtcclxuXHRcdFx0XHRlbHNlIGlmKHNpbmdsZXRvbnNbdXJsXSA9PT0gdHJ1ZSkgc2luZ2xldG9uc1t1cmxdID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdFx0T2JqZWN0LmtleXMobW9kLmFzc2V0cy50ZXh0dXJlcyB8fCB7fSkubWFwKGsgPT4gbW9kLmFzc2V0cy50ZXh0dXJlc1trXSkuZm9yRWFjaChjaGVja0Fzc2V0KTtcclxuXHRcdFx0T2JqZWN0LmtleXMobW9kLmFzc2V0cy5tb2RlbHMgfHwge30pLm1hcChrID0+IG1vZC5hc3NldHMubW9kZWxzW2tdKS5mb3JFYWNoKGNoZWNrQXNzZXQpO1xyXG5cdFx0XHRPYmplY3Qua2V5cyhtb2QuYXNzZXRzLnBvc3RlcnMgfHwge30pLm1hcChrID0+IG1vZC5hc3NldHMucG9zdGVyc1trXSkuZm9yRWFjaChjaGVja0Fzc2V0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGRldGVybWluZSBpZiB0aGUgdHJhY2tpbmcgc2tlbGV0b24gaXMgbmVlZGVkXHJcblx0XHRsZXQgbmVlZHNTa2VsZXRvbiA9IG1vZHVsZXMucmVkdWNlKChucyxtKSA9PiBucyB8fCBtLm5lZWRzU2tlbGV0b24sIGZhbHNlKTtcclxuXHRcdGlmKG5lZWRzU2tlbGV0b24gJiYgYWx0c3BhY2UuaW5DbGllbnQpe1xyXG5cdFx0XHRzZWxmLl9za2VsUHJvbWlzZSA9IFByb21pc2UuYWxsKFtcclxuXHRcdFx0XHRhbHRzcGFjZS5nZXRUaHJlZUpTVHJhY2tpbmdTa2VsZXRvbigpLFxyXG5cdFx0XHRcdHNlbGYuX2VudlByb21pc2VcclxuXHRcdFx0XSkudGhlbigoW3NrZWwsIF9dKSA9PiB7XHJcblx0XHRcdFx0c2VsZi5zY2VuZS5hZGQoc2tlbCk7XHJcblx0XHRcdFx0c2VsZi5lbnYuc2tlbCA9IHNrZWw7XHJcblx0XHRcdFx0c2VsZi5lbnYgPSBPYmplY3QuZnJlZXplKHNlbGYuZW52KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0c2VsZi5fZW52UHJvbWlzZS50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRzZWxmLmVudiA9IE9iamVjdC5mcmVlemUoc2VsZi5lbnYpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2VsZi5fc2tlbFByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdH1cclxuXHJcblx0XHRQcm9taXNlLmFsbChbc2VsZi5fZW52UHJvbWlzZSwgc2VsZi5fZnNQcm9taXNlLCBzZWxmLl9za2VsUHJvbWlzZV0pLnRoZW4oKCkgPT5cclxuXHRcdHtcclxuXHRcdFx0Ly8gY29uc3RydWN0IGRpb3JhbWFzXHJcblx0XHRcdG1vZHVsZXMuZm9yRWFjaChmdW5jdGlvbihtb2R1bGUpXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsZXQgcm9vdCA9IG51bGw7XHJcblxyXG5cdFx0XHRcdGlmKG1vZHVsZSBpbnN0YW5jZW9mIFRIUkVFLk9iamVjdDNEKXtcclxuXHRcdFx0XHRcdHJvb3QgPSBtb2R1bGU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2VcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRyb290ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gaGFuZGxlIGFic29sdXRlIHBvc2l0aW9uaW5nXHJcblx0XHRcdFx0XHRpZihtb2R1bGUudHJhbnNmb3JtKXtcclxuXHRcdFx0XHRcdFx0cm9vdC5tYXRyaXguZnJvbUFycmF5KG1vZHVsZS50cmFuc2Zvcm0pO1xyXG5cdFx0XHRcdFx0XHRyb290Lm1hdHJpeC5kZWNvbXBvc2Uocm9vdC5wb3NpdGlvbiwgcm9vdC5xdWF0ZXJuaW9uLCByb290LnNjYWxlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRpZihtb2R1bGUucG9zaXRpb24pe1xyXG5cdFx0XHRcdFx0XHRcdHJvb3QucG9zaXRpb24uZnJvbUFycmF5KG1vZHVsZS5wb3NpdGlvbik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0aWYobW9kdWxlLnJvdGF0aW9uKXtcclxuXHRcdFx0XHRcdFx0XHRyb290LnJvdGF0aW9uLmZyb21BcnJheShtb2R1bGUucm90YXRpb24pO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBoYW5kbGUgcmVsYXRpdmUgcG9zaXRpb25pbmdcclxuXHRcdFx0XHRpZihtb2R1bGUudmVydGljYWxBbGlnbil7XHJcblx0XHRcdFx0XHRsZXQgaGFsZkhlaWdodCA9IHNlbGYuZW52LmlubmVySGVpZ2h0LygyKnNlbGYuZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdFx0XHRcdHN3aXRjaChtb2R1bGUudmVydGljYWxBbGlnbil7XHJcblx0XHRcdFx0XHRjYXNlICd0b3AnOlxyXG5cdFx0XHRcdFx0XHRyb290LnRyYW5zbGF0ZVkoaGFsZkhlaWdodCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSAnYm90dG9tJzpcclxuXHRcdFx0XHRcdFx0cm9vdC50cmFuc2xhdGVZKC1oYWxmSGVpZ2h0KTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlICdtaWRkbGUnOlxyXG5cdFx0XHRcdFx0XHQvLyBkZWZhdWx0XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKCdJbnZhbGlkIHZhbHVlIGZvciBcInZlcnRpY2FsQWxpZ25cIiAtICcsIG1vZHVsZS52ZXJ0aWNhbEFsaWduKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRzZWxmLnNjZW5lLmFkZChyb290KTtcclxuXHJcblx0XHRcdFx0aWYoc2VsZi5wcmV2aWV3Q2FtZXJhKXtcclxuXHRcdFx0XHRcdGxldCBheGlzID0gbmV3IFRIUkVFLkF4aXNIZWxwZXIoMSk7XHJcblx0XHRcdFx0XHRheGlzLnVzZXJEYXRhLmFsdHNwYWNlID0ge2NvbGxpZGVyOiB7ZW5hYmxlZDogZmFsc2V9fTtcclxuXHRcdFx0XHRcdHJvb3QuYWRkKGF4aXMpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0c2VsZi5sb2FkQXNzZXRzKG1vZHVsZS5hc3NldHMsIHNpbmdsZXRvbnMpLnRoZW4oKHJlc3VsdHMpID0+IHtcclxuXHRcdFx0XHRcdG1vZHVsZS5pbml0aWFsaXplKHNlbGYuZW52LCByb290LCByZXN1bHRzKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBzdGFydCBhbmltYXRpbmdcclxuXHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24gYW5pbWF0ZSh0aW1lc3RhbXApXHJcblx0XHR7XHJcblx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XHJcblx0XHRcdHNlbGYuc2NlbmUudXBkYXRlQWxsQmVoYXZpb3JzKCk7XHJcblx0XHRcdGlmKHdpbmRvdy5UV0VFTikgVFdFRU4udXBkYXRlKHRpbWVzdGFtcCk7XHJcblx0XHRcdHNlbGYucmVuZGVyZXIucmVuZGVyKHNlbGYuc2NlbmUsIHNlbGYucHJldmlld0NhbWVyYSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGxvYWRBc3NldHMobWFuaWZlc3QsIHNpbmdsZXRvbnMpXHJcblx0e1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PlxyXG5cdFx0e1xyXG5cdFx0XHQvLyBwb3B1bGF0ZSBjYWNoZVxyXG5cdFx0XHRQcm9taXNlLmFsbChbXHJcblxyXG5cdFx0XHRcdC8vIHBvcHVsYXRlIG1vZGVsIGNhY2hlXHJcblx0XHRcdFx0Li4uT2JqZWN0LmtleXMobWFuaWZlc3QubW9kZWxzIHx8IHt9KS5tYXAoaWQgPT4gUmVzb2x2ZUJ1dENvbXBsYWluKGlkLCBMb2FkZXJzLk1vZGVsUHJvbWlzZShtYW5pZmVzdC5tb2RlbHNbaWRdKSkpLFxyXG5cclxuXHRcdFx0XHQvLyBwb3B1bGF0ZSBleHBsaWNpdCB0ZXh0dXJlIGNhY2hlXHJcblx0XHRcdFx0Li4uT2JqZWN0LmtleXMobWFuaWZlc3QudGV4dHVyZXMgfHwge30pLm1hcChpZCA9PiBSZXNvbHZlQnV0Q29tcGxhaW4oaWQsIExvYWRlcnMuVGV4dHVyZVByb21pc2UobWFuaWZlc3QudGV4dHVyZXNbaWRdKSkpLFxyXG5cclxuXHRcdFx0XHQvLyBnZW5lcmF0ZSBhbGwgcG9zdGVyc1xyXG5cdFx0XHRcdC4uLk9iamVjdC5rZXlzKG1hbmlmZXN0LnBvc3RlcnMgfHwge30pLm1hcChpZCA9PiBSZXNvbHZlQnV0Q29tcGxhaW4oaWQsIExvYWRlcnMuUG9zdGVyUHJvbWlzZShtYW5pZmVzdC5wb3N0ZXJzW2lkXSkpKVxyXG5cdFx0XHRdKVxyXG5cclxuXHRcdFx0LnRoZW4oKCkgPT5cclxuXHRcdFx0e1xyXG5cdFx0XHRcdC8vIHBvcHVsYXRlIHBheWxvYWQgZnJvbSBjYWNoZVxyXG5cdFx0XHRcdHZhciBwYXlsb2FkID0ge21vZGVsczoge30sIHRleHR1cmVzOiB7fSwgcG9zdGVyczoge319O1xyXG5cclxuXHRcdFx0XHRmb3IobGV0IGkgaW4gbWFuaWZlc3QubW9kZWxzKXtcclxuXHRcdFx0XHRcdGxldCB1cmwgPSBtYW5pZmVzdC5tb2RlbHNbaV07XHJcblx0XHRcdFx0XHRsZXQgdCA9IExvYWRlcnMuX2NhY2hlLm1vZGVsc1t1cmxdO1xyXG5cdFx0XHRcdFx0cGF5bG9hZC5tb2RlbHNbaV0gPSB0ID8gc2luZ2xldG9uc1t1cmxdID8gdCA6IHQuY2xvbmUoKSA6IG51bGw7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRmb3IobGV0IGkgaW4gbWFuaWZlc3QudGV4dHVyZXMpe1xyXG5cdFx0XHRcdFx0bGV0IHVybCA9IG1hbmlmZXN0LnRleHR1cmVzW2ldO1xyXG5cdFx0XHRcdFx0bGV0IHQgPSBMb2FkZXJzLl9jYWNoZS50ZXh0dXJlc1t1cmxdO1xyXG5cdFx0XHRcdFx0cGF5bG9hZC50ZXh0dXJlc1tpXSA9IHQgPyBzaW5nbGV0b25zW3VybF0gPyB0IDogdC5jbG9uZSgpIDogbnVsbDtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGZvcihsZXQgaSBpbiBtYW5pZmVzdC5wb3N0ZXJzKXtcclxuXHRcdFx0XHRcdGxldCB1cmwgPSBtYW5pZmVzdC5wb3N0ZXJzW2ldO1xyXG5cdFx0XHRcdFx0bGV0IHQgPSBMb2FkZXJzLl9jYWNoZS5wb3N0ZXJzW3VybF07XHJcblx0XHRcdFx0XHRwYXlsb2FkLnBvc3RlcnNbaV0gPSB0ID8gc2luZ2xldG9uc1t1cmxdID8gdCA6IHQuY2xvbmUoKSA6IG51bGw7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXNvbHZlKHBheWxvYWQpO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuY2F0Y2goZSA9PiBjb25zb2xlLmVycm9yKGUuc3RhY2spKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcbn07XHJcbiJdLCJuYW1lcyI6WyJsZXQiLCJsb2FkZXIiLCJzdXBlciIsInJpZ2h0IiwiTG9hZGVycy5fY2FjaGUiLCJMb2FkZXJzLk1vZGVsUHJvbWlzZSIsIkxvYWRlcnMuVGV4dHVyZVByb21pc2UiLCJMb2FkZXJzLlBvc3RlclByb21pc2UiLCJpIiwidXJsIiwidCJdLCJtYXBwaW5ncyI6Ijs7O0FBRUFBLElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDOztBQUU1RCxTQUFTLFVBQVUsRUFBRSxHQUFHLEVBQUUsT0FBTztBQUNqQztDQUNDLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFBLE9BQU8sa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBQTs7O0NBR3RFLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFD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
