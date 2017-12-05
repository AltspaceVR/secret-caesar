var SecretHitler = (function () {
'use strict';

if(!Array.prototype.includes){
	Object.defineProperty(Array.prototype, 'includes', {
		value: function(item){
			return this.indexOf(item) > -1;
		},
		writable: false,
		enumerable: false,
		configurable: false
	});
}

var activeTheme = 'hitler';
if(/caesar/.test(window.location.pathname)){
	activeTheme = 'caesar';
}

var themes = {
	hitler: {
		hitler: 'hitler',
		president: 'president',
		chancellor: 'chancellor'
	},
	caesar: {
		hitler: 'caesar',
		president: 'consul',
		chancellor: 'praetor'
	}
};

function translate(string)
{
	var key = string.toLowerCase(),
		value = themes[activeTheme][key] || themes.hitler[key] || string;

	// starts with upper case, rest is lower
	var isProper = string.charAt(0) == string.charAt(0).toUpperCase() && string.slice(1) == string.slice(1).toLowerCase();
	if(isProper){
		value = value.charAt(0).toUpperCase() + value.slice(1);
	}

	return value;
}

var themeModels = {
	caesar: {
		laurels: '/static/model/laurels.gltf'
	},
	hitler: {
		tophat: '/static/model/tophat.gltf',
		visorcap: '/static/model/visor_cap.gltf'
	}
};

var assets = {
	manifest: {
		models: Object.assign({
			table: '/static/model/table.gltf',
			nameplate: '/static/model/nameplate.dae',
			//dummy: '/static/model/dummy.gltf',
			//playermeter: '/static/model/playermeter.gltf'
		}, themeModels[activeTheme]),
		textures: {
			board_large: ("/static/img/" + activeTheme + "/board-large.jpg"),
			board_med: ("/static/img/" + activeTheme + "/board-medium.jpg"),
			board_small: ("/static/img/" + activeTheme + "/board-small.jpg"),
			cards: ("/static/img/" + activeTheme + "/cards.jpg"),
			reset: '/static/img/bomb.png',
			refresh: '/static/img/refresh.jpg'
			//text: '/static/img/text.png'
		}
	},
	cache: {},
	fixMaterials: function()
	{
		var this$1 = this;

		Object.keys(this.cache.models).forEach(function (id) {
			this$1.cache.models[id].traverse(function (obj) {
				if(obj.material instanceof THREE.MeshStandardMaterial){
					var newMat = new THREE.MeshBasicMaterial();
					newMat.map = obj.material.map;
					newMat.color.copy(obj.material.color);
					newMat.transparent = obj.material.transparent;
					newMat.side = obj.material.side;
					obj.material = newMat;
				}
			});
		});
	}
};

var placeholderGeo = new THREE.BoxBufferGeometry(.001, .001, .001);
var placeholderMat = new THREE.MeshBasicMaterial({color: 0xffffff, visible: false});
var PlaceholderMesh = new THREE.Mesh(placeholderGeo, placeholderMat);

var NativeComponent = function NativeComponent(mesh, needsUpdate)
{
	this.mesh = mesh;
	altspace.addNativeComponent(this.mesh, this.name);

	if(needsUpdate)
		{ this.update(); }
};

NativeComponent.prototype.update = function update (fields)
{
		if ( fields === void 0 ) fields = {};

	Object.assign(this.data, fields);
	altspace.updateNativeComponent(this.mesh, this.name, this.data);
};

NativeComponent.prototype.destroy = function destroy ()
{
	altspace.removeNativeComponent(this.mesh, this.name);
};

var NText = (function (NativeComponent) {
	function NText(mesh){
		this.name = 'n-text';
		this.data = {
			fontSize: 10,
			height: 1,
			width: 10,
			verticalAlign: 'middle',
			horizontalAlign: 'middle',
			text: ''
		};
		NativeComponent.call(this, mesh, true);

		this.color = 'black';
	}

	if ( NativeComponent ) NText.__proto__ = NativeComponent;
	NText.prototype = Object.create( NativeComponent && NativeComponent.prototype );
	NText.prototype.constructor = NText;
	NText.prototype.update = function update (fields){
		if ( fields === void 0 ) fields = {};

		if(fields.text)
			{ fields.text = "<color=" + (this.color) + ">" + (fields.text) + "</color>"; }
		NativeComponent.prototype.update.call(this, fields);
	};

	return NText;
}(NativeComponent));

var NSkeletonParent = (function (NativeComponent) {
	function NSkeletonParent(mesh){
		this.name = 'n-skeleton-parent';
		this.data = {
			index: 0,
			part: 'head',
			side: 'center', 
			userId: 0
		};
		NativeComponent.call(this, mesh, true);
	}

	if ( NativeComponent ) NSkeletonParent.__proto__ = NativeComponent;
	NSkeletonParent.prototype = Object.create( NativeComponent && NativeComponent.prototype );
	NSkeletonParent.prototype.constructor = NSkeletonParent;

	return NSkeletonParent;
}(NativeComponent));

var NBillboard = (function (NativeComponent) {
	function NBillboard(mesh){
		this.name = 'n-billboard';
		NativeComponent.call(this, mesh, false);
	}

	if ( NativeComponent ) NBillboard.__proto__ = NativeComponent;
	NBillboard.prototype = Object.create( NativeComponent && NativeComponent.prototype );
	NBillboard.prototype.constructor = NBillboard;

	return NBillboard;
}(NativeComponent));

var Hat = (function (superclass) {
	function Hat(model)
	{
		var this$1 = this;

		superclass.call(this);
		this.currentId = '';
		this.components = {hat: null, text: null};
		
		if(model.parent)
			{ model.parent.remove(model); }
		model.updateMatrixWorld(true);

		// grab meshes
		var prop = '';
		model.traverse(function (obj) {
			if(obj.name === 'hat' || obj.name === 'text'){
				prop = obj.name;
			}
			else if(obj instanceof THREE.Mesh){
				this$1[prop] = obj;
			}
		});

		// strip out middle nodes
		if(this.hat){
			this.hat.matrix.copy(this.hat.matrixWorld);
			this.hat.matrix.decompose(this.hat.position, this.hat.quaternion, this.hat.scale);
			this.add(this.hat);
		}

		if(this.text){
			this.text.matrix.copy(this.text.matrixWorld);
			this.text.matrix.decompose(this.text.position, this.text.quaternion, this.text.scale);
			this.add(this.text);
		}

		d.scene.add(this);
	}

	if ( superclass ) Hat.__proto__ = superclass;
	Hat.prototype = Object.create( superclass && superclass.prototype );
	Hat.prototype.constructor = Hat;

	Hat.prototype.setOwner = function setOwner (userId)
	{
		if(!this.currentId && userId){
			d.scene.add(this);
			if(this.hat)
				{ this.components.hat = new NSkeletonParent(this.hat); }
			if(this.text)
				{ this.components.text = new NSkeletonParent(this.text); }
		}
		else if(this.currentId && !userId){
			if(this.hat)
				{ this.components.hat.destroy(); }
			if(this.text)
				{ this.components.text.destroy(); }
			d.scene.remove(this);
		}

		if(userId){
			if(this.hat)
				{ this.components.hat.update({userId: userId}); }
			if(this.text)
				{ this.components.text.update({userId: userId}); }
		}

		this.currentId = userId;
	};

	return Hat;
}(THREE.Object3D));

var PresidentHat = (function (Hat) {
	function PresidentHat(){
		var this$1 = this;

		if(activeTheme === 'caesar')
		{
			Hat.call(this, assets.cache.models.laurels.clone());
			this.position.set(0, .08/SH.env.pixelsPerMeter, .03/SH.env.pixelsPerMeter);
			this.rotation.set(.5, 0, 0);
			this.scale.multiplyScalar(0.8/SH.env.pixelsPerMeter);
		}
		else
		{
			Hat.call(this, assets.cache.models.tophat);
			this.position.set(0, 0.144/SH.env.pixelsPerMeter, .038/SH.env.pixelsPerMeter);
			this.scale.multiplyScalar(1.2/SH.env.pixelsPerMeter);
		}
		
		var assignHat = function (ref) {
			var game = ref.data.game;

			var sitting = game.specialElection ? game.president : game.lastPresident;
			this$1.setOwner(sitting);
		};
		SH.addEventListener('update_specialElection', assignHat);
		SH.addEventListener('update_president', assignHat);
		SH.addEventListener('update_lastPresident', assignHat);
	}

	if ( Hat ) PresidentHat.__proto__ = Hat;
	PresidentHat.prototype = Object.create( Hat && Hat.prototype );
	PresidentHat.prototype.constructor = PresidentHat;

	return PresidentHat;
}(Hat));

var ChancellorHat = (function (Hat) {
	function ChancellorHat(){
		var this$1 = this;

		if(activeTheme === 'caesar'){
			Hat.call(this, assets.cache.models.laurels.clone());
			this.position.set(0, .08/SH.env.pixelsPerMeter, .03/SH.env.pixelsPerMeter);
			this.rotation.set(.5, 0, 0);
			this.scale.multiplyScalar(0.8/SH.env.pixelsPerMeter);
		}
		else
		{
			Hat.call(this, assets.cache.models.visorcap);
			this.position.set(0, 0.07/SH.env.pixelsPerMeter, .038/SH.env.pixelsPerMeter);
			this.scale.multiplyScalar(1.2/SH.env.pixelsPerMeter);
		}

		SH.addEventListener('update_lastChancellor', function (e) {
			this$1.setOwner(e.data.game.lastChancellor);
		});
	}

	if ( Hat ) ChancellorHat.__proto__ = Hat;
	ChancellorHat.prototype = Object.create( Hat && Hat.prototype );
	ChancellorHat.prototype.constructor = ChancellorHat;

	return ChancellorHat;
}(Hat));

var Behavior = function Behavior(type){
	this.type = type;
};

Behavior.prototype.awake = function awake (obj){
	this.object3D = obj;
};

Behavior.prototype.start = function start (){ };

Behavior.prototype.update = function update (dT){ };

Behavior.prototype.dispose = function dispose (){ };

var QuaternionTween = (function (superclass) {
	function QuaternionTween(state, group){
		superclass.call(this, {t: 0}, group);
		this._state = state;
		this._start = state.clone();
	}

	if ( superclass ) QuaternionTween.__proto__ = superclass;
	QuaternionTween.prototype = Object.create( superclass && superclass.prototype );
	QuaternionTween.prototype.constructor = QuaternionTween;
	QuaternionTween.prototype.to = function to (end, duration){
		superclass.prototype.to.call(this, {t: 1}, duration);
		this._end = end instanceof THREE.Quaternion ? [end] : end;
		return this;
	};
	QuaternionTween.prototype.start = function start (){
		var this$1 = this;

		this.onUpdate(function (ref) {
			var progress = ref.t;

			progress = progress * this$1._end.length;
			var nextPoint = Math.ceil(progress);
			var localProgress = progress - nextPoint + 1;
			var points = [this$1._start ].concat( this$1._end);
			THREE.Quaternion.slerp(points[nextPoint-1], points[nextPoint], this$1._state, localProgress);
		});
		return superclass.prototype.start.call(this);
	};

	return QuaternionTween;
}(TWEEN.Tween));

function WaitForAnims(tweens)
{
	var p = new Promise(function (resolve, reject) {
		var activeCount = tweens.length;
		function checkDone(){
			if(--activeCount === 0) { resolve(); }
		}

		tweens.forEach(function (t) { return t.onComplete(checkDone); });
		tweens.forEach(function (t) { return t.onStop(reject); });
		tweens.forEach(function (t) { return t.start(); });
	});
	p.tweens = tweens;
	return p;
}

var spinPoints = [
	new THREE.Quaternion(0, Math.sqrt(2)/2, 0, Math.sqrt(2)/2),
	new THREE.Quaternion(0, 1, 0, 0),
	new THREE.Quaternion(0, Math.sqrt(2)/2, 0, -Math.sqrt(2)/2),
	new THREE.Quaternion(0, 0, 0, 1)
];

var Animate = function Animate () {};

Animate.simple = function simple (target, ref)
{
		if ( ref === void 0 ) ref = {};
		var parent = ref.parent; if ( parent === void 0 ) parent = null;
		var pos = ref.pos; if ( pos === void 0 ) pos = null;
		var quat = ref.quat; if ( quat === void 0 ) quat = null;
		var scale = ref.scale; if ( scale === void 0 ) scale = null;
		var hue = ref.hue; if ( hue === void 0 ) hue = null;
		var matrix = ref.matrix; if ( matrix === void 0 ) matrix = null;
		var duration = ref.duration; if ( duration === void 0 ) duration = 600;

	// extract position/rotation/scale from matrix
	if(matrix){
		pos = new THREE.Vector3();
		quat = new THREE.Quaternion();
		scale = new THREE.Vector3();
		matrix.decompose(pos, quat, scale);
	}

	// shuffle hierarchy, but keep world transform the same
	if(parent && this.parent !== target.parent){
		target.applyMatrix(target.parent.matrixWorld);
		target.applyMatrix(new THREE.Matrix4().getInverse(parent.matrixWorld));
		parent.add(obj);
	}

	var anims = [];

	if(pos){
		anims.push(new TWEEN.Tween(target.position)
			.to({x: pos.x, y: pos.y, z: pos.z}, duration)
			.easing(TWEEN.Easing.Quadratic.Out)
		);
	}

	if(quat){
		anims.push(new QuaternionTween(target.quaternion)
			.to(quat, duration)
			.easing(TWEEN.Easing.Quadratic.Out)
		);
	}

	if(scale){
		anims.push(new TWEEN.Tween(target.scale)
			.to({x: scale.x, y: scale.y, z: scale.z}, duration)
			.easing(TWEEN.Easing.Quadratic.Out)
		);
	}

	if(hue !== null){
		anims.push(new TWEEN.Tween(target.material.color.getHSL())
			.to({h: hue}, duration)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onUpdate(function (tween) {
				target.material.color.setHSL(tween.h, tween.s, tween.l);
			})
		);
	}

	return WaitForAnims(anims);
};

Animate.wait = function wait (duration){
	return new Promise(function (resolve, reject) {
		setTimeout(resolve, duration);
	});
};

/**
	 * Make the card appear with a flourish
	 * @param {THREE.Object3D} card 
	 */
Animate.cardFlourish = function cardFlourish (card)
{
	card.position.set(0, 0, 0);
	card.quaternion.set(0,0,0,1);
	card.scale.setScalar(.001);

	var anims = [];

	// add position animation
	anims.push(new TWEEN.Tween(card.position)
		.to({x: 0, y: .7, z: 0}, 1500)
		.easing(TWEEN.Easing.Elastic.Out)
	);

	// add spin animation
	anims.push(new QuaternionTween(card.quaternion)
		.to(spinPoints, 2500)
		.easing(TWEEN.Easing.Quadratic.Out)
	);

	// add scale animation
	anims.push(new TWEEN.Tween(card.scale)
		.to({x: .5, y: .5, z: .5}, 200)
	);

	return WaitForAnims(anims);
};

Animate.vanish = function vanish (card)
{
	var anims = [];

	// add move animation
	anims.push(new TWEEN.Tween(card.position)
		.to({y: '+0.5'}, 1000)
	);

	// add disappear animation
	anims.push(new TWEEN.Tween(card.material)
		.to({opacity: 0}, 1000)
	);

	return WaitForAnims(anims);
};

Animate.bob = function bob (obj, amplitude, period)
{
		if ( amplitude === void 0 ) amplitude = .08;
		if ( period === void 0 ) period = 4000;

	return new TWEEN.Tween(obj.position)
		.to({y: obj.position.y-amplitude}, period)
		.easing(TWEEN.Easing.Sinusoidal.InOut)
		.repeat(Infinity)
		.yoyo(true)
		.start();
};

Animate.spin = function spin (obj, period)
{
		if ( period === void 0 ) period = 10000;

	return new QuaternionTween(obj.quaternion)
		.to(spinPoints, period)
		.repeat(Infinity)
		.start();
};

Animate.winkIn = function winkIn (obj, duration)
{
		if ( duration === void 0 ) duration = 200;

	if(!obj.userData.scaleOrig)
		{ obj.userData.scaleOrig = obj.scale.clone(); }

	var anims = [];

	obj.scale.setScalar(.001);
	obj.visible = true;

	anims.push(new TWEEN.Tween(obj.scale)
		.to({y: obj.userData.scaleOrig.y}, duration)
		.easing(TWEEN.Easing.Cubic.In)
	);

	anims.push(new TWEEN.Tween(obj.scale)
		.to({x: obj.userData.scaleOrig.x, z: obj.userData.scaleOrig.z}, .2*duration)
		.easing(TWEEN.Easing.Cubic.In)
	);

	return WaitForAnims(anims);
};

Animate.winkOut = function winkOut (obj, duration)
{
		if ( duration === void 0 ) duration = 200;

	if(!obj.userData.scaleOrig)
		{ obj.userData.scaleOrig = obj.scale.clone(); }

	var anims = [];
	obj.visible = true;
		
	anims.push(new TWEEN.Tween(obj.scale)
		.to({y: .001}, duration)
		.easing(TWEEN.Easing.Cubic.Out)
	);

	anims.push(new TWEEN.Tween(obj.scale)
		.to({x: .001, z: .001}, .2*duration)
		.delay(.8*duration)
		.easing(TWEEN.Easing.Cubic.Out)
		.onComplete(function () { obj.visible = false; })
	);

	return WaitForAnims(anims);
};

Animate.swingIn = function swingIn (obj, rotation, radius, duration)
{
		if ( rotation === void 0 ) rotation=Math.PI/2;
		if ( radius === void 0 ) radius=0.5;
		if ( duration === void 0 ) duration=300;

	if(!obj.userData.transform)
		{ obj.userData.transform = {
			rotation: obj.rotation.x,
			position: obj.position.clone()
		}; }

	// put at start position
	obj.translateY(-radius);
	obj.rotation.x = obj.userData.transform.rotation + rotation;
	obj.translateY(radius);

	var anim = new TWEEN.Tween({t:1})
		.to({t: 0}, duration)
		.easing(TWEEN.Easing.Bounce.Out)
		.onUpdate(function (ref) {
				var t = ref.t;

			obj.translateY(-radius);
			obj.rotation.x = obj.userData.transform.rotation + t*rotation;
			obj.translateY(radius);
		})
		.onStop(function () {
			obj.translateY(-radius);
			obj.rotation.x = obj.userData.transform.rotation + rotation;
			obj.translateY(radius);
		});

	return WaitForAnims([anim]);
};

Animate.swingOut = function swingOut (obj, rotation, radius, duration)
{
		if ( rotation === void 0 ) rotation=Math.PI/2;
		if ( radius === void 0 ) radius=0.5;
		if ( duration === void 0 ) duration=300;

	if(!obj.userData.transform)
		{ obj.userData.transform = {
			rotation: obj.rotation.x,
			position: obj.position.clone()
		}; }

	obj.rotation.x = obj.userData.transform.rotation;
	obj.position.copy(obj.userData.transform.position);

	var anim = new TWEEN.Tween({t:0})
		.to({t: 1}, duration)
		.easing(TWEEN.Easing.Quadratic.In)
		.onUpdate(function (ref) {
				var t = ref.t;

			obj.translateY(-radius);
			obj.rotation.x = obj.userData.transform.rotation + t*rotation;
			obj.translateY(radius);
		})
		.onStop(function () {
			obj.rotation.x = obj.userData.transform.rotation;
			obj.position.copy(obj.userData.transform.position);
		});

	return WaitForAnims([anim]);
};

// enum constants
var Types = Object.freeze({
	POLICY_LIBERAL: 0,
	POLICY_FASCIST: 1,
	ROLE_LIBERAL: 2,
	ROLE_FASCIST: 3,
	ROLE_HITLER: 4,
	PARTY_LIBERAL: 5,
	PARTY_FASCIST: 6,
	JA: 7,
	NEIN: 8,
	BLANK: 9,
	CREDITS: 10,
	VETO: 11
});

var geometry = null;
var material = null;

function initCardData()
{
	var floatData = [
		// position (portrait)
		0.3575, 0.5, 0.0005,
		-.3575, 0.5, 0.0005,
		-.3575, -.5, 0.0005,
		0.3575, -.5, 0.0005,
		0.3575, 0.5, -.0005,
		-.3575, 0.5, -.0005,
		-.3575, -.5, -.0005,
		0.3575, -.5, -.0005,
	
		// position (landscape)
		0.5, -.3575, 0.0005,
		0.5, 0.3575, 0.0005,
		-.5, 0.3575, 0.0005,
		-.5, -.3575, 0.0005,
		0.5, -.3575, -.0005,
		0.5, 0.3575, -.0005,
		-.5, 0.3575, -.0005,
		-.5, -.3575, -.0005,
	
		// UVs
		/* -------------- card face ------------- */ /* ------------- card back --------------*/
		.754,.996, .754,.834, .997,.834, .997,.996, .754,.834, .754,.996, .997,.996, .997,.834, // liberal policy
		.754,.822, .754,.660, .996,.660, .996,.822, .754,.660, .754,.822, .996,.822, .996,.660, // fascist policy
		.746,.996, .505,.996, .505,.650, .746,.650, .021,.022, .021,.269, .375,.269, .375,.022, // liberal role
		.746,.645, .505,.645, .505,.300, .746,.300, .021,.022, .021,.269, .375,.269, .375,.022, // fascist role
		.996,.645, .754,.645, .754,.300, .996,.300, .021,.022, .021,.269, .375,.269, .375,.022, // hitler role
		.495,.996, .255,.996, .255,.650, .495,.650, .021,.022, .021,.269, .375,.269, .375,.022, // liberal party
		.495,.645, .255,.645, .255,.300, .495,.300, .021,.022, .021,.269, .375,.269, .375,.022, // fascist party
		.244,.992, .005,.992, .005,.653, .244,.653, .021,.022, .021,.269, .375,.269, .375,.022, // ja
		.243,.642, .006,.642, .006,.302, .243,.302, .021,.022, .021,.269, .375,.269, .375,.022, // nein
		.021,.269, .021,.022, .375,.022, .375,.269, .021,.022, .021,.269, .375,.269, .375,.022, // blank
		.397,.276, .397,.015, .765,.015, .765,.276, .021,.022, .021,.269, .375,.269, .375,.022, // credits
		.963,.270, .804,.270, .804,.029, .963,.029, .804,.270, .963,.270, .963,.029, .804,.029 ];
	
	var intData = [
		// triangle index
		0,1,2, 0,2,3, 4,7,5, 5,7,6
	];
	
	// two position sets, 11 UV sets, 1 index set
	var geoBuffer = new ArrayBuffer(4*floatData.length + 2*intData.length);
	var temp = new Float32Array(geoBuffer, 0, floatData.length);
	temp.set(floatData);
	temp = new Uint16Array(geoBuffer, 4*floatData.length, intData.length);
	temp.set(intData);
	
	// chop up buffer into vertex attributes
	var posLength = 8*3, uvLength = 8*2, indexLength = 12;
	var posPortrait = new THREE.BufferAttribute(new Float32Array(geoBuffer, 0, posLength), 3),
		posLandscape = new THREE.BufferAttribute(new Float32Array(geoBuffer, 4*posLength, posLength), 3);
	var uvs = [];
	for(var i=0; i<12; i++){
		uvs.push( new THREE.BufferAttribute(new Float32Array(geoBuffer, 8*posLength + 4*i*uvLength, uvLength), 2) );
	}
	var index = new THREE.BufferAttribute(new Uint16Array(geoBuffer, 4*floatData.length, indexLength), 1);
	
	geometry = Object.keys(Types).map(function (key, i) {
		var geo = new THREE.BufferGeometry();
		geo.addAttribute('position', i==Types.JA || i==Types.NEIN ? posLandscape : posPortrait);
		geo.addAttribute('uv', uvs[i]);
		geo.setIndex(index);
		return geo;
	});

	material = new THREE.MeshBasicMaterial({map: assets.cache.textures.cards});
}


var Card = (function (superclass) {
	function Card(type)
	{
		if ( type === void 0 ) type = Types.BLANK;

		if(!geometry || !material) { initCardData(); }

		var geo = geometry[type];
		superclass.call(this, geo, material);
		this.scale.setScalar(0.7);
	}

	if ( superclass ) Card.__proto__ = superclass;
	Card.prototype = Object.create( superclass && superclass.prototype );
	Card.prototype.constructor = Card;

	return Card;
}(THREE.Mesh));

var BlankCard = (function (Card) {
	function BlankCard(){ Card.call(this); }

	if ( Card ) BlankCard.__proto__ = Card;
	BlankCard.prototype = Object.create( Card && Card.prototype );
	BlankCard.prototype.constructor = BlankCard;

	return BlankCard;
}(Card));

var CreditsCard = (function (Card) {
	function CreditsCard(){
		Card.call(this, Types.CREDITS);
	}

	if ( Card ) CreditsCard.__proto__ = Card;
	CreditsCard.prototype = Object.create( Card && Card.prototype );
	CreditsCard.prototype.constructor = CreditsCard;

	return CreditsCard;
}(Card));

var LiberalPolicyCard = (function (Card) {
	function LiberalPolicyCard(){
		Card.call(this, Types.POLICY_LIBERAL, false);
	}

	if ( Card ) LiberalPolicyCard.__proto__ = Card;
	LiberalPolicyCard.prototype = Object.create( Card && Card.prototype );
	LiberalPolicyCard.prototype.constructor = LiberalPolicyCard;

	return LiberalPolicyCard;
}(Card));

var FascistPolicyCard = (function (Card) {
	function FascistPolicyCard(){
		Card.call(this, Types.POLICY_FASCIST);
	}

	if ( Card ) FascistPolicyCard.__proto__ = Card;
	FascistPolicyCard.prototype = Object.create( Card && Card.prototype );
	FascistPolicyCard.prototype.constructor = FascistPolicyCard;

	return FascistPolicyCard;
}(Card));

var VetoCard = (function (Card) {
	function VetoCard(){
		Card.call(this, Types.VETO);
	}

	if ( Card ) VetoCard.__proto__ = Card;
	VetoCard.prototype = Object.create( Card && Card.prototype );
	VetoCard.prototype.constructor = VetoCard;

	return VetoCard;
}(Card));
var LiberalRoleCard = (function (Card) {
	function LiberalRoleCard(){
		Card.call(this, Types.ROLE_LIBERAL);
	}

	if ( Card ) LiberalRoleCard.__proto__ = Card;
	LiberalRoleCard.prototype = Object.create( Card && Card.prototype );
	LiberalRoleCard.prototype.constructor = LiberalRoleCard;

	return LiberalRoleCard;
}(Card));

var FascistRoleCard = (function (Card) {
	function FascistRoleCard(){
		Card.call(this, Types.ROLE_FASCIST);
	}

	if ( Card ) FascistRoleCard.__proto__ = Card;
	FascistRoleCard.prototype = Object.create( Card && Card.prototype );
	FascistRoleCard.prototype.constructor = FascistRoleCard;

	return FascistRoleCard;
}(Card));

var HitlerRoleCard = (function (Card) {
	function HitlerRoleCard(){
		Card.call(this, Types.ROLE_HITLER);
	}

	if ( Card ) HitlerRoleCard.__proto__ = Card;
	HitlerRoleCard.prototype = Object.create( Card && Card.prototype );
	HitlerRoleCard.prototype.constructor = HitlerRoleCard;

	return HitlerRoleCard;
}(Card));

var LiberalPartyCard = (function (Card) {
	function LiberalPartyCard(){
		Card.call(this, Types.PARTY_LIBERAL);
	}

	if ( Card ) LiberalPartyCard.__proto__ = Card;
	LiberalPartyCard.prototype = Object.create( Card && Card.prototype );
	LiberalPartyCard.prototype.constructor = LiberalPartyCard;

	return LiberalPartyCard;
}(Card));

var FascistPartyCard = (function (Card) {
	function FascistPartyCard(){
		Card.call(this, Types.PARTY_FASCIST);
	}

	if ( Card ) FascistPartyCard.__proto__ = Card;
	FascistPartyCard.prototype = Object.create( Card && Card.prototype );
	FascistPartyCard.prototype.constructor = FascistPartyCard;

	return FascistPartyCard;
}(Card));

var JaCard = (function (Card) {
	function JaCard(){
		Card.call(this, Types.JA);
	}

	if ( Card ) JaCard.__proto__ = Card;
	JaCard.prototype = Object.create( Card && Card.prototype );
	JaCard.prototype.constructor = JaCard;

	return JaCard;
}(Card));

var NeinCard = (function (Card) {
	function NeinCard(){
		Card.call(this, Types.NEIN);
	}

	if ( Card ) NeinCard.__proto__ = Card;
	NeinCard.prototype = Object.create( Card && Card.prototype );
	NeinCard.prototype.constructor = NeinCard;

	return NeinCard;
}(Card));

var LiberalSpots = {
	positions: [
		new THREE.Vector3(0.690, 0.001, -0.42),
		new THREE.Vector3(0.345, 0.001, -0.42),
		new THREE.Vector3(0.002, 0.001, -0.42),
		new THREE.Vector3(-.340, 0.001, -0.42),
		new THREE.Vector3(-.690, 0.001, -0.42)
	],
	quaternion: new THREE.Quaternion(0, 0.7071067811865475, 0.7071067811865475, 0),
	scale: new THREE.Vector3(0.4, 0.4, 0.4)
};
var FascistSpots = {
	positions: [
		new THREE.Vector3(-.860, 0.001, .425),
		new THREE.Vector3(-.515, 0.001, .425),
		new THREE.Vector3(-.170, 0.001, .425),
		new THREE.Vector3(0.170, 0.001, .425),
		new THREE.Vector3(0.518, 0.001, .425),
		new THREE.Vector3(0.870, 0.001, .425) ],
	quaternion: new THREE.Quaternion(-0.7071067811865475, 0, 0, 0.7071067811865475),
	scale: new THREE.Vector3(0.4, 0.4, 0.4)
};

var GameTable = (function (superclass) {
	function GameTable()
	{
		superclass.call(this);

		// table state
		this.liberalCards = 0;
		this.fascistCards = 0;
		this.cards = [];

		this.vetoCard = new VetoCard();
		this.vetoCard.scale.setScalar(.5);
		this.vetoCard.visible = false;
		this.vetoCard.material.transparent = true;
		this.add(this.vetoCard);

		// add table asset
		this.model = assets.cache.models.table;
		this.model.scale.setScalar(1.25);
		this.add(this.model);

		// save references to the textures
		this.textures = [
			assets.cache.textures.board_small,
			assets.cache.textures.board_med,
			assets.cache.textures.board_large
		];
		this.textures.forEach(function (tex) { return tex.flipY = false; });
		this.setTexture(this.textures[0], true);
		
		// position table
		this.position.set(0, 1.0, 0);

		SH.addEventListener('update_turnOrder', this.changeMode.bind(this));
		SH.addEventListener('update_liberalPolicies', this.updatePolicies.bind(this));
		SH.addEventListener('update_fascistPolicies', this.updatePolicies.bind(this));
		SH.addEventListener('update_failedVotes', this.updatePolicies.bind(this));
	}

	if ( superclass ) GameTable.__proto__ = superclass;
	GameTable.prototype = Object.create( superclass && superclass.prototype );
	GameTable.prototype.constructor = GameTable;

	GameTable.prototype.changeMode = function changeMode (ref)
	{
		var ref_data_game = ref.data.game;
		var state = ref_data_game.state;
		var turnOrder = ref_data_game.turnOrder;

		if(turnOrder.length >= 9)
			{ this.setTexture(this.textures[2]); }
		else if(turnOrder.length >= 7)
			{ this.setTexture(this.textures[1]); }
		else
			{ this.setTexture(this.textures[0]); }
	};

	GameTable.prototype.setTexture = function setTexture (newTex, switchLightmap)
	{
		this.model.traverse(function (o) {
			if(o instanceof THREE.Mesh)
			{
				if(switchLightmap)
					{ o.material.lightMap = o.material.map; }

				o.material.map = newTex;
			}
		});
	};

	GameTable.prototype.updatePolicies = function updatePolicies (ref)
	{
		var this$1 = this;
		var ref_data_game = ref.data.game;
		var liberalPolicies = ref_data_game.liberalPolicies;
		var fascistPolicies = ref_data_game.fascistPolicies;
		var hand = ref_data_game.hand;
		var state = ref_data_game.state;

		var updates = [];

		// queue up cards to be added to the table this update
		var loop = function ( i ) {
			var card = new LiberalPolicyCard();
			card.animate = function () { return Animate.simple(card, {
				pos: LiberalSpots.positions[i],
				quat: LiberalSpots.quaternion,
				scale: LiberalSpots.scale
			}).then(function () { return Animate.wait(500); }); };
			card.playSound = function () { return SH.audio.liberalSting.loaded.then(function () { return SH.audio.liberalSting.play(); }); };
			updates.push(card);
		};

		for(var i=this.liberalCards; i<liberalPolicies; i++)loop( i );
		
		var loop$1 = function ( i ) {
			var card$1 = new FascistPolicyCard();
			card$1.animate = function () { return Animate.simple(card$1, {
				pos: FascistSpots.positions[i],
				quat: FascistSpots.quaternion,
				scale: FascistSpots.scale
			}); };
			card$1.playSound = function () { return SH.audio.fascistSting.loaded.then(function () { return SH.audio.fascistSting.play(); }); };
			updates.push(card$1);
		};

		for(var i=this.fascistCards; i<fascistPolicies; i++)loop$1( i );

		if(state === 'aftermath' && hand === 1){
			updates.push(this.vetoCard);
		}

		var animation = null;
		if(updates.length === 1)
		{
			var card$2 = updates[0];
			if(card$2 === this.vetoCard)
			{
				card$2.visible = true; card$2.material.opacity = 1;
				animation = Animate.cardFlourish(card$2)
					.then(function () { return Animate.vanish(card$2); })
					.then(function () { card$2.visible = false; });
			}
			else
			{
				this.add(card$2);
				this.cards.push(card$2);
				card$2.playSound();
				animation = Animate.cardFlourish(card$2)
					.then(function () { return card$2.animate(); });
			}
		}
		else
		{
			// place on their spots
			updates.forEach(function (card) {
				this$1.add(card);
				this$1.cards.push(card);
				card.animate();
			});

			animation = Promise.resolve();
		}

		if(state === 'aftermath'){
			animation.then(function () {
				SH.dispatchEvent({
					type: 'policyAnimDone',
					bubbles: false
				});
			});
		}

		if(liberalPolicies === 0 && fascistPolicies === 0){
			this.cards.forEach(function (c) { return this$1.remove(c); });
		}

		this.liberalCards = liberalPolicies;
		this.fascistCards = fascistPolicies;
	};

	return GameTable;
}(THREE.Object3D));

function getGameId()
{
	// first check the url
	var re = /[?&]gameId=([^&]+)/.exec(window.location.search);
	if(re){
		return re[1];
	}
	else if(altspace && altspace.inClient){
		return SH.env.sid;
	}
	else {
		var id = Math.floor( Math.random() * 100000000 );
		window.location.replace('?gameId='+id);
	}
}

function mergeObjects(a, b, depth)
{
	if ( depth === void 0 ) depth=2;

	function unique(e, i, a){
		return a.indexOf(e) === i;
	}

	var aIsObj = a instanceof Object, bIsObj = b instanceof Object;
	if(aIsObj && bIsObj && depth > 0)
	{
		var result = {};
		var keys = Object.keys(a).concat( Object.keys(b)).filter(unique);
		for(var i=0; i<keys.length; i++){
			result[keys[i]] = mergeObjects(a[keys[i]], b[keys[i]], depth-1);
		}
		return result;
	}
	else if(b !== undefined)
		{ return b; }
	else
		{ return a; }
}

function lateUpdate(fn)
{
	return function () {
		var args = [], len = arguments.length;
		while ( len-- ) args[ len ] = arguments[ len ];

		setTimeout(function () { return fn.apply(void 0, args); }, 15);
	};
}

var Nameplate = (function (superclass) {
	function Nameplate(seat)
	{
		var this$1 = this;

		superclass.call(this);

		this.seat = seat;
		this.position.set(0, -0.635, 0.22);
		seat.add(this);

		// add 3d model
		this.model = assets.cache.models.nameplate.children[0].clone();
		this.model.rotation.set(-Math.PI/2, 0, Math.PI/2);
		this.model.scale.setScalar(1.25);
		this.add(this.model);

		// generate material
		this.bmp = document.createElement('canvas');
		this.bmp.width = Nameplate.textureSize;
		this.bmp.height = Nameplate.textureSize / 2;
		this.model.material = new THREE.MeshBasicMaterial({
			map: new THREE.CanvasTexture(this.bmp)
		});

		// create listener proxies
		this._hoverBehavior = new altspace.utilities.behaviors.HoverColor({
			color: new THREE.Color(0xffa8a8)
		});
		this.model.addBehavior(this._hoverBehavior);
		this.model.addEventListener('cursorup', this.click.bind(this));

		SH.addEventListener('update_state', function (ref) {
			var state = ref.data.game.state;

			if(state === 'setup')
				{ this$1.model.addBehavior(this$1._hoverBehavior); }
			else
				{ this$1.model.removeBehavior(this$1._hoverBehavior); }
		});
	}

	if ( superclass ) Nameplate.__proto__ = superclass;
	Nameplate.prototype = Object.create( superclass && superclass.prototype );
	Nameplate.prototype.constructor = Nameplate;

	Nameplate.prototype.updateText = function updateText (text)
	{
		var fontSize = 7/32 * Nameplate.textureSize * 0.65;

		// set up canvas
		var g = this.bmp.getContext('2d');
		var fontStack = '"Helvetica Neue", Helvetica, Arial, Sans-Serif';
		g.fillStyle = '#222';
		g.fillRect(0, 0, Nameplate.textureSize, Nameplate.textureSize/2);
		g.font = "bold " + fontSize + "px " + fontStack;
		g.textAlign = 'center';
		g.fillStyle = 'white';
		g.fillText(text, Nameplate.textureSize/2, (0.42 - 0.12)*(Nameplate.textureSize/2));

		this.model.material.map.needsUpdate = true;
	};

	Nameplate.prototype.click = function click (e)
	{
		if(SH.game.state !== 'setup') { return; }

		if(!this.seat.owner)
			{ this.requestJoin(); }
		else if(this.seat.owner === SH.localUser.id)
			{ this.requestLeave(); }
		else if(SH.game.turnOrder.includes(SH.localUser.id))
			{ this.requestKick(); }
	};

	Nameplate.prototype.requestJoin = function requestJoin ()
	{
		SH.socket.emit('join', Object.assign({seatNum: this.seat.seatNum}, SH.localUser));
	};

	Nameplate.prototype.requestLeave = function requestLeave ()
	{
		var self = this;
		if(!self.question)
		{
			self.question = self.seat.ballot.askQuestion('Are you sure you\nwant to leave?', 'local_leave')
			.then(function (confirm) {
				if(confirm){
					SH.socket.emit('leave', SH.localUser.id);
				}
				self.question = null;
			})
			.catch(function () { self.question = null; });
		}
	};

	Nameplate.prototype.requestKick = function requestKick ()
	{
		var self = this;
		if(!self.question)
		{
			var seat = SH.seats[SH.players[SH.localUser.id].seatNum];
			self.question = seat.ballot.askQuestion(
				'Are you sure you\nwant to try to kick\n'
				+SH.players[self.seat.owner].displayName,
				'local_kick'
			)
			.then(function (confirm) {
				if(confirm){
					SH.socket.emit('kick', SH.localUser.id, self.seat.owner);
				}
				self.question = null;
			})
			.catch(function () { self.question = null; });
		}
	};

	return Nameplate;
}(THREE.Object3D));

Nameplate.textureSize = 256;

function updateVotesInProgress(ref)
{
	var ref_data = ref.data;
	var game = ref_data.game;
	var players = ref_data.players;
	var votes = ref_data.votes;

	var ballot = this;
	if(!ballot.seat.owner) { return; }

	var vips = game.votesInProgress;

	// votes the seat owner cannot participate in (already voted or blocked)
	var blacklistedVotes = vips.filter(function (id) {
		var vs = votes[id].yesVoters.concat( votes[id].noVoters);
		var nv = votes[id].nonVoters;
		return nv.includes(ballot.seat.owner) || vs.includes(ballot.seat.owner);
	});

	// votes added this update that the seated user is eligible for
	var newVotes = vips.filter(
		function (id) { return (!SH.game.votesInProgress || !SH.game.votesInProgress.includes(id)) && !blacklistedVotes.includes(id); }
	);

	// votes already participated in, plus completed votes
	var finishedVotes = !SH.game.votesInProgress ? blacklistedVotes
		: SH.game.votesInProgress.filter(function (id) { return !vips.includes(id); }).concat(blacklistedVotes);

	newVotes.forEach(function (vId) {
		// generate new question to ask
		var questionText, opts = {};
		if(votes[vId].type === 'elect'){
			questionText = players[game.president].displayName
				+ " for " + (translate('president')) + " and "
				+ players[game.chancellor].displayName
				+ " for " + (translate('chancellor')) + "?";
		}
		else if(votes[vId].type === 'join'){
			questionText = votes[vId].data + ' to join?';
		}
		else if(votes[vId].type === 'kick'){
			questionText = 'Vote to kick '
				+ players[votes[vId].target1].displayName
				+ '?';
		}
		else if(votes[vId].type === 'tutorial'){
			questionText = 'Play tutorial?';
		}
		else if(votes[vId].type === 'confirmRole')
		{
			opts.choices = CONFIRM;
			var role;
			if(ballot.seat.owner === SH.localUser.id){
				role = players[SH.localUser.id].role;
				role = translate(role.charAt(0).toUpperCase() + role.slice(1));
			}
			else {
				role = '<REDACTED>';
			}
			questionText = 'Your role:\n' + role;
		}

		if(questionText)
		{
			ballot.askQuestion(questionText, vId, opts)
			.then(function (answer) {
				SH.socket.emit('vote', vId, SH.localUser.id, answer);
			})
			.catch(function () { return console.log('Vote scrubbed:', vId); });
		}
	});

	if(finishedVotes.includes(ballot.displayed)){
		ballot.dispatchEvent({type: 'cancelVote', bubbles: false});
	}
}

function updateState$1(ref)
{
	var ref_data = ref.data;
	var game = ref_data.game;
	var players = ref_data.players;

	var ballot = this;

	function choosePlayer(question, confirmQuestion, id)
	{
		function confirmPlayer(userId)
		{
			var username = SH.players[userId].displayName;
			var text = confirmQuestion.replace('{}', username);
			return ballot.askQuestion(text, 'local_'+id+'_confirm')
			.then(function (confirmed) {
				if(confirmed){
					return Promise.resolve(userId);
				}
				else {
					return choosePlayer(question, confirmQuestion, id);
				}
			});
		}

		return ballot.askQuestion(question, 'local_'+id, {choices: PLAYERSELECT})
		.then(confirmPlayer);
	}

	function hideNominatePlaceholder(ref)
	{
		var game = ref.data.game;

		if(game.state !== 'nominate' && ballot.displayed === 'wait_for_chancellor'){
			ballot.dispatchEvent({type: 'cancelVote', bubbles: false});
		}
		SH.removeEventListener('update_state', hideNominatePlaceholder);
	}

	function hidePolicyPlaceholder(ref)
	{
		var game = ref.data.game;

		if(game.state !== 'policy1' && ballot.displayed === 'local_policy1' ||
			game.state !== 'policy2' && ballot.displayed === 'local_policy2'
		){
			ballot.dispatchEvent({type: 'cancelVote', bubbles: false});
		}
		SH.removeEventListener('update_state', hidePolicyPlaceholder);
	}

	if(game.state === 'nominate' && ballot.seat.owner === game.president)
	{
		if(SH.localUser.id === game.president){
			choosePlayer(("Choose your " + (translate('chancellor')) + "!"), ("Name {} as " + (translate('chancellor')) + "?"), 'nominate')
			.then(function (userId) {
				SH.socket.emit('nominate', userId);
			});
		}
		else {
			ballot.askQuestion(("Choose your " + (translate('chancellor')) + "!"), 'wait_for_chancellor', {
				choices: PLAYERSELECT,
				fake: true,
				isInvalid: function () { return SH.game.state !== 'nominate'; }
			});
			SH.addEventListener('update_state', hideNominatePlaceholder);
		}
	}
	else if(game.state === 'policy1' && ballot.seat.owner === game.president)
	{
		var opts = {choices: POLICY, policyHand: game.hand};
		if(SH.localUser.id !== game.president){
			Object.assign(opts, {fake: true, isInvalid: function () { return SH.game.state !== 'policy1'; }});
		}

		ballot.askQuestion('Choose one\nto discard!', 'local_policy1', opts)
		.then(function (discard) {
			SH.socket.emit('discard_policy1', discard);
		});
		SH.addEventListener('update_state', hidePolicyPlaceholder);
	}
	else if(game.state === 'policy2' && ballot.seat.owner === game.chancellor)
	{
		var opts$1 = {
			choices: POLICY,
			policyHand: game.hand,
			includeVeto: game.fascistPolicies === 5 && !ballot.blockVeto
		};
		if(SH.localUser.id !== game.chancellor){
			Object.assign(opts$1, {fake: true, isInvalid: function () { return SH.game.state !== 'policy2'; }});
		}

		ballot.askQuestion('Choose one\nto discard!', 'local_policy2', opts$1)
		.then(function (discard) {
			SH.socket.emit('discard_policy2', discard);
		}, function (err) { return console.error(err); });
		SH.addEventListener('update_state', hidePolicyPlaceholder);
	}
	else if(game.state === 'investigate' && ballot.seat.owner === game.president)
	{
		if(SH.localUser.id === game.president){
			choosePlayer('Executive power: Choose one player to investigate!', 'Investigate {}?', 'investigate')
			.then(function (userId) {
				SH.dispatchEvent({
					type: 'investigate',
					data: userId
				});
			});
		}
		else {
			ballot.askQuestion('Executive power: Choose one player to investigate!', 'wait_for_investigate', {
				choices: PLAYERSELECT,
				fake: true,
				isInvalid: function () { return SH.game.state !== 'investigate'; }
			});
			var cleanUpFakeVote = function (ref) {
				var state = ref.data.game.state;

				if(state !== 'investigate' && ballot.displayed === 'wait_for_investigate')
					{ ballot.dispatchEvent({type: 'cancelVote', bubbles: false}); }
				SH.removeEventListener('update_state', cleanUpFakeVote);
			};
			SH.addEventListener('update_state', cleanUpFakeVote);
		}
	}
	else if(game.state === 'peek' && ballot.seat.owner === game.president)
	{
		var opts$2 = {choices: POLICY, policyHand: 8 | (game.deck&7)};
		if(SH.localUser.id !== game.president){
			Object.assign(opts$2, {fake: true, isInvalid: function () { return SH.game.state !== 'peek'; }});
		}

		ballot.askQuestion('Executive power: Top of policy deck', 'local_peek', opts$2)
		.then(function (discard) {
			SH.socket.emit('continue');
		});
		var cleanUpFakeVote$1 = function (ref) {
			var state = ref.data.game.state;

			if(state !== 'peek' && ballot.displayed === 'local_peek')
				{ ballot.dispatchEvent({type: 'cancelVote', bubbles: false}); }
			SH.removeEventListener('update_state', cleanUpFakeVote$1);
		};
		SH.addEventListener('update_state', cleanUpFakeVote$1);
	}
	else if(game.state === 'nameSuccessor' && ballot.seat.owner === game.president)
	{
		if(SH.localUser.id === game.president){
			choosePlayer(("Executive power: Choose the next " + (translate('president')) + "!"), ("{} for " + (translate('president')) + "?"), 'nameSuccessor')
			.then(function (userId) {
				SH.socket.emit('name_successor', userId);
			});
		}
		else {
			ballot.askQuestion(("Executive power: Choose the next " + (translate('president')) + "!"), 'wait_for_successor', {
				choices: PLAYERSELECT,
				fake: true,
				isInvalid: function () { return SH.game.state !== 'nameSuccessor'; }
			});
			var cleanUpFakeVote$2 = function (ref) {
				var state = ref.data.game.state;

				if(state !== 'nameSuccessor' && ballot.displayed === 'wait_for_successor')
					{ ballot.dispatchEvent({type: 'cancelVote', bubbles: false}); }
				SH.removeEventListener('update_state', cleanUpFakeVote$2);
			};
			SH.addEventListener('update_state', cleanUpFakeVote$2);
		}
	}
	else if(game.state === 'execute' && ballot.seat.owner === game.president)
	{
		if(SH.localUser.id === game.president){
			choosePlayer('Executive power: Choose a player to execute!', 'Execute {}?', 'execute')
			.then(function (userId) {
				SH.socket.emit('execute', userId);
			});
		}
		else {
			ballot.askQuestion('Executive power: Choose a player to execute!', 'wait_for_execute', {
				choices: PLAYERSELECT,
				fake: true,
				isInvalid: function () { return SH.game.state !== 'execute'; }
			});
			var cleanUpFakeVote$3 = function (ref) {
				var state = ref.data.game.state;

				if(state !== 'execute' && ballot.displayed === 'wait_for_execute')
					{ ballot.dispatchEvent({type: 'cancelVote', bubbles: false}); }
				SH.removeEventListener('update_state', cleanUpFakeVote$3);
			};
			SH.addEventListener('update_state', cleanUpFakeVote$3);
		}
	}
	else if(game.state === 'veto' && ballot.seat.owner === game.president)
	{
		if(SH.localUser.id === game.president){
			ballot.askQuestion('Approve veto?', 'local_veto').then(function (approved) {
				SH.socket.emit('confirm_veto', approved);
			});
		}
		else {
			ballot.askQuestion('Approve veto?', 'wait_for_veto', {
				fake: true,
				isInvalid: function () { return SH.game.state !== 'veto'; }
			});
			var cleanUpFakeVote$4 = function (ref) {
				var state = ref.data.game.state;

				if(state !== 'veto' && ballot.displayed === 'wait_for_veto')
					{ ballot.dispatchEvent({type: 'cancelVote', bubbles: false}); }
				SH.removeEventListener('update_state', cleanUpFakeVote$4);
			};
			SH.addEventListener('update_state', cleanUpFakeVote$4);
		}
	}
	else if(game.state === 'veto'){
		ballot.blockVeto = true;
	}
	else if(game.state === 'aftermath'){
		ballot.blockVeto = false;
	}
}

/*
* Decks have 17 cards: 6 liberal, 11 fascist.
* In bit-packed boolean arrays, 1 is liberal, 0 is fascist.
* The most significant bit is always 1.
* E.g. 0b101001 represents a deck with 2 liberal and 3 fascist cards
*/

var LIBERAL = 1;

var positions = [
	0x1, 0x2, 0x4, 0x8,
	0x10, 0x20, 0x40, 0x80,
	0x100, 0x200, 0x400, 0x800,
	0x1000, 0x2000, 0x4000, 0x8000,
	0x10000, 0x20000, 0x40000
];

function length(deck)
{
	return positions.findIndex(function (s) { return s > deck; }) -1;
}

function toArray(deck)
{
	var arr = [];
	while(deck > 1){
		arr.push(deck & 1);
		deck >>>= 1;
	}

	return arr;
}

var PLAYERSELECT = 0;
var CONFIRM = 1;
var BINARY = 2;
var POLICY = 3;

var Ballot = (function (superclass) {
	function Ballot(seat)
	{
		superclass.call(this);
		this.seat = seat;
		this.position.set(0, -0.3, 0.25);
		this.rotation.set(.5, Math.PI, 0);
		seat.add(this);

		this.lastQueued = Promise.resolve();
		this.displayed = null;
		this.blockVeto = false;

		this._yesClickHandler = null;
		this._noClickHandler = null;
		this._nominateHandler = null;
		this._cancelHandler = null;

		this.jaCard = new JaCard();
		this.neinCard = new NeinCard();
		[this.jaCard, this.neinCard].forEach(function (c) {
			c.position.set(c instanceof JaCard ? -0.1 : 0.1, -0.1, 0);
			c.scale.setScalar(0.15);
			c.visible = false;
		});
		this.add(this.jaCard, this.neinCard);
		this.policies = [];

		//let geo = new THREE.PlaneBufferGeometry(0.4, 0.2);
		//let mat = new THREE.MeshBasicMaterial({transparent: true, side: THREE.DoubleSide});
		this.question = PlaceholderMesh.clone();
		this.question.position.set(0, 0.05, 0);
		this.question.scale.setScalar(.5);
		this.question.visible = false;
		this.add(this.question);

		this.textComponent = new NText(this.question);
		this.textComponent.update({width: 1.1, height: .4, fontSize: 1, verticalAlign: 'top'});

		SH.addEventListener('update_votesInProgress', updateVotesInProgress.bind(this));
		SH.addEventListener('update_state', lateUpdate(updateState$1.bind(this)));
	}

	if ( superclass ) Ballot.__proto__ = superclass;
	Ballot.prototype = Object.create( superclass && superclass.prototype );
	Ballot.prototype.constructor = Ballot;

	Ballot.prototype.askQuestion = function askQuestion (qText, id, ref)
	{
		if ( ref === void 0 ) ref = {};
		var choices = ref.choices; if ( choices === void 0 ) choices = BINARY;
		var policyHand = ref.policyHand; if ( policyHand === void 0 ) policyHand = 0x1;
		var includeVeto = ref.includeVeto; if ( includeVeto === void 0 ) includeVeto = false;
		var fake = ref.fake; if ( fake === void 0 ) fake = false;
		var isInvalid = ref.isInvalid; if ( isInvalid === void 0 ) isInvalid = function () { return true; };

		var self = this;

		function isVoteValid()
		{
			var isFakeValid = fake && !isInvalid();
			var isLocalVote = /^local/.test(id);
			var isFirstUpdate = !SH.game.votesInProgress;
			var vote = SH.votes[id];
			var voters = vote ? vote.yesVoters.concat( vote.noVoters) : [];
			var alreadyVoted = voters.includes(self.seat.owner);
			return isLocalVote || isFirstUpdate || isFakeValid || vote && !alreadyVoted;
		}

		function hookUpQuestion(){
			return new Promise(questionExecutor);
		}

		function questionExecutor(resolve, reject)
		{
			// make sure the answer is still relevant
			if(!isVoteValid()){
				return reject('Vote no longer valid');
			}

			// show the ballot
			//self.question.material.map = generateQuestion(qText, self.question.material.map);
			self.textComponent.update({text: ("" + qText)});
			self.question.visible = true;

			// hook up q/a cards
			if(choices === CONFIRM || choices === BINARY){
				self.jaCard.visible = true;
				if(!fake){
					self.jaCard.addEventListener('cursorup', respond('yes', resolve, reject));
					if(self.seat.owner === SH.localUser.id)
						{ self.jaCard.addBehavior( new altspace.utilities.behaviors.HoverScale() ); }
				}
			}
			else { self.jaCard.visible = false; }

			if(choices === BINARY){
				self.neinCard.visible = true;
				if(!fake){
					self.neinCard.addEventListener('cursorup', respond('no', resolve, reject));
					if(self.seat.owner === SH.localUser.id)
						{ self.neinCard.addBehavior( new altspace.utilities.behaviors.HoverScale() ); }
				}
			}
			else { self.neinCard.visible = false; }

			if(choices === PLAYERSELECT && !fake){
				SH.addEventListener('playerSelect', respond('player', resolve, reject));
			}
			else if(choices === POLICY){
				var cards = toArray(policyHand);
				if(includeVeto) { cards.push(-1); }
				cards.forEach(function (val, i, arr) {
					var card = null;
					if(fake)
						{ card = new BlankCard(); }
					else if(val === -1)
						{ card = new VetoCard(); }
					else if(val === LIBERAL)
						{ card = new LiberalPolicyCard(); }
					else
						{ card = new FascistPolicyCard(); }

					card.scale.setScalar(0.15);

					var width = .15 * arr.length;
					var x = -width/2 + .15*i + .075;
					card.position.set(x, -0.07, 0);
					self.add(card);
					self.policies.push(card);

					if(!fake){
						card.addEventListener('cursorup', respond(val === -1 ? -1 : i, resolve, reject));
						
						if(self.seat.owner === SH.localUser.id)
							{ card.addBehavior( new altspace.utilities.behaviors.HoverScale() ); }
					}
				});
			}

			self.addEventListener('cancelVote', respond('cancel', resolve, reject));

			if(self._outtroAnim){
				clearTimeout(self._outtroAnim);
			}

			if(!self.displayed)
				{ Animate.swingIn(self, Math.PI/2-.5, .41, 800); }

			self.displayed = id;
		}

		function respond(answer, resolve, reject)
		{
			function handler(evt)
			{
				// make sure only the owner of the ballot is answering
				if(answer !== 'cancel' && self.seat.owner !== SH.localUser.id) { return; }

				// clean up
				self._outtroAnim = setTimeout(function () {
					Animate.swingOut(self, Math.PI/2-.5, .41, 300)
					.then(function () {
						self.jaCard.visible = false;
						self.neinCard.visible = false;
						self.question.visible = false;
						self.displayed = null;
						self.remove.apply(self, self.policies);
						self.policies = [];
					});
					
					self._outtroAnim = null;
				}, 100);

				self.jaCard.removeAllBehaviors();
				self.jaCard.removeEventListener('cursorup', self._yesClickHandler);
				self.neinCard.removeAllBehaviors();
				self.neinCard.removeEventListener('cursorup', self._noClickHandler);
				SH.removeEventListener('playerSelect', self._nominateHandler);
				self.removeEventListener('cancelVote', self._cancelHandler);

				// make sure the answer still matters
				if(!isVoteValid() || answer === 'cancel'){
					if(choices === POLICY)
					{
						// random card detaches and winks out
						var card = self.policies[Math.floor(Math.random()*self.policies.length)];
						card.applyMatrix(self.matrix);
						self.seat.add(card);
						Animate.winkOut(card, 300).then(function () {
							self.seat.remove(card);
						});
					}
					reject('vote cancelled');
				}
				else if(answer === 'yes')
					{ resolve(true); }
				else if(answer === 'no')
					{ resolve(false); }
				else if(answer === 'player')
					{ resolve(evt.data); }
				else if(choices === POLICY)
				{
					// clicked card detaches and winks out
					var card$1 = self.policies[(answer+3)%3];
					card$1.applyMatrix(self.matrix);
					self.seat.add(card$1);
					Animate.winkOut(card$1, 300).then(function () {
						self.seat.remove(card$1);
					});

					resolve(answer);
				}
			}

			if(answer === 'yes')
				{ self._yesClickHandler = handler; }
			else if(answer === 'no')
				{ self._noClickHandler = handler; }
			else if(answer === 'player')
				{ self._nominateHandler = handler; }
			else if(answer === 'cancel')
				{ self._cancelHandler = handler; }

			return handler;
		}

		self.lastQueued = self.lastQueued.then(hookUpQuestion, hookUpQuestion);

		return self.lastQueued;
	};

	return Ballot;
}(THREE.Object3D));

var PlayerInfo = (function (superclass) {
	function PlayerInfo(seat)
	{
		superclass.call(this);
		this.seat = seat;
		this.card = null;
		this.position.set(0, 0, 0.3);
		this.scale.setScalar(0.3);
		seat.add(this);

		SH.addEventListener('update_state', lateUpdate(this.updateState.bind(this)));
		SH.addEventListener('investigate', this.presentParty.bind(this));
	}

	if ( superclass ) PlayerInfo.__proto__ = superclass;
	PlayerInfo.prototype = Object.create( superclass && superclass.prototype );
	PlayerInfo.prototype.constructor = PlayerInfo;

	PlayerInfo.prototype.updateState = function updateState (ref)
	{
		var this$1 = this;
		var ref_data = ref.data;
		var game = ref_data.game;
		var players = ref_data.players;
		var votes = ref_data.votes;

		var localPlayer = players[SH.localUser.id] || {};
		var seatedPlayer = players[this.seat.owner] || {};
		var vote = votes[game.lastElection];

		var seatedRoleShouldBeVisible =
			game.state === 'done' ||
			game.state === 'night' && (
				localPlayer === seatedPlayer ||
				localPlayer.role === 'fascist' && (seatedPlayer.role === 'fascist' || seatedPlayer.role === 'hitler') ||
				localPlayer.role === 'hitler' && seatedPlayer.role === 'fascist' && game.turnOrder.length < 7
			);

		if(this.seat.owner && seatedRoleShouldBeVisible)
		{
			if(this.card && this.card.userData.type !== 'role'){
				this.remove(this.card);
				this.card = null;
			}

			switch(seatedPlayer.role){
				case 'fascist': this.card = new FascistRoleCard(); break;
				case 'hitler' : this.card = new HitlerRoleCard();  break;
				case 'liberal': this.card = new LiberalRoleCard(); break;
			}

			this.card.userData.type = 'role';
			this.add(this.card);
			var bb = new NBillboard(this.card);
			Animate.winkIn(this.card, 300);
		}
		else if(this.seat.owner && game.state === 'lameDuck' && !vote.nonVoters.includes(this.seat.owner))
		{
			if(this.card && this.card.userData.type !== 'vote'){
				this.remove(this.card);
				this.card = null;
			}

			var playerVote = vote.yesVoters.includes(this.seat.owner);
			this.card = playerVote ? new JaCard() : new NeinCard();

			this.card.userData.type = 'vote';
			this.add(this.card);
			var bb$1 = new NBillboard(this.card);
			Animate.winkIn(this.card, 300);
		}
		else if(this.card !== null)
		{
			Animate.winkOut(this.card, 300).then(function () {
				this$1.remove(this$1.card);
				this$1.card = null;
			});
		}
	};

	PlayerInfo.prototype.presentParty = function presentParty (ref)
	{
		var userId = ref.data;

		if(!this.seat.owner || this.seat.owner !== userId) { return; }

		if(this.card && this.card.userData.type !== 'party'){
			this.remove(this.card);
			this.card = null;
		}

		var role = SH.players[this.seat.owner].role;
		this.card =  role === 'liberal' ? new LiberalPartyCard() : new FascistPartyCard();

		this.card.userData.type = 'party';
		this.add(this.card);
		var bb = new NBillboard(this.card);
		Animate.winkIn(this.card, 300);
	};

	return PlayerInfo;
}(THREE.Object3D));

var CapsuleGeometry = (function (superclass) {
	function CapsuleGeometry(radius, height, segments, rings)
	{
		if ( segments === void 0 ) segments = 12;
		if ( rings === void 0 ) rings = 8;

		superclass.call(this);

		var numVerts = 2 * rings * segments + 2;
		var numFaces = 4 * rings * segments;
		var theta = 2*Math.PI/segments;
		var phi = Math.PI/(2*rings);

		var verts = new Float32Array(3*numVerts);
		var faces = new Uint16Array(3*numFaces);
		var vi = 0, fi = 0, topCap = 0, botCap = 1;

		verts.set([0, height/2, 0], 3*vi++);
		verts.set([0, -height/2, 0], 3*vi++);

		for( var s=0; s<segments; s++ )
		{
			for( var r=1; r<=rings; r++)
			{
				var radial = radius * Math.sin(r*phi);

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

				var top_s1r1 = vi-2, top_s1r0 = vi-4;
				var bot_s1r1 = vi-1, bot_s1r0 = vi-3;
				var top_s0r1 = top_s1r1 - 2*rings, top_s0r0 = top_s1r0 - 2*rings;
				var bot_s0r1 = bot_s1r1 - 2*rings, bot_s0r0 = bot_s1r0 - 2*rings;
				if(s === 0){
					top_s0r1 += numVerts-2;
					top_s0r0 += numVerts-2;
					bot_s0r1 += numVerts-2;
					bot_s0r0 += numVerts-2;
				}

				// create faces
				if(r === 1)
				{
					faces.set([topCap, top_s1r1, top_s0r1], 3*fi++);
					faces.set([botCap, bot_s0r1, bot_s1r1], 3*fi++);
				}
				else
				{
					faces.set([top_s1r0, top_s1r1, top_s0r0], 3*fi++);
					faces.set([top_s0r0, top_s1r1, top_s0r1], 3*fi++);

					faces.set([bot_s0r1, bot_s1r1, bot_s0r0], 3*fi++);
					faces.set([bot_s0r0, bot_s1r1, bot_s1r0], 3*fi++);
				}
			}

			// create long sides
			var top_s1 = vi-2, top_s0 = top_s1 - 2*rings;
			var bot_s1 = vi-1, bot_s0 = bot_s1 - 2*rings;
			if(s === 0){
				top_s0 += numVerts-2;
				bot_s0 += numVerts-2;
			}

			faces.set([top_s0, top_s1, bot_s1], 3*fi++);
			faces.set([bot_s0, top_s0, bot_s1], 3*fi++);
		}

		this.addAttribute('position', new THREE.BufferAttribute(verts, 3));
		this.setIndex(new THREE.BufferAttribute(faces, 1));
	}

	if ( superclass ) CapsuleGeometry.__proto__ = superclass;
	CapsuleGeometry.prototype = Object.create( superclass && superclass.prototype );
	CapsuleGeometry.prototype.constructor = CapsuleGeometry;

	return CapsuleGeometry;
}(THREE.BufferGeometry));

var hitboxGeo = new CapsuleGeometry(0.3, 1.8);

var Hitbox = (function (superclass) {
	function Hitbox(seat)
	{
		var this$1 = this;

		superclass.call(this, hitboxGeo, new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: 0,
			side: THREE.BackSide
		}));

		this.position.set(0, -0.5, -.2);
		this.visible = false;
		this.seat = seat;
		seat.add(this);

		this.addEventListener('cursorenter', function () { return this$1.material.opacity = 0.1; });
		this.addEventListener('cursorleave', function () { return this$1.material.opacity = 0; });
		this.addEventListener('cursorup', function () {
			SH.dispatchEvent({
				type: 'playerSelect',
				bubbles: false,
				data: this$1.seat.owner
			});
		});

		SH.addEventListener('update_state', lateUpdate(this.updateVisibility.bind(this)));
	}

	if ( superclass ) Hitbox.__proto__ = superclass;
	Hitbox.prototype = Object.create( superclass && superclass.prototype );
	Hitbox.prototype.constructor = Hitbox;

	Hitbox.prototype.updateVisibility = function updateVisibility (ref)
	{
		var ref_data = ref.data;
		var game = ref_data.game;
		var players = ref_data.players;

		var livingPlayers = game.turnOrder.filter(function (p) { return players[p].state !== 'dead'; });
		var preconditions =
			SH.localUser.id === game.president &&
			this.seat.owner !== '' &&
			this.seat.owner !== SH.localUser.id &&
			livingPlayers.includes(this.seat.owner);

		var nominateable =
			game.state === 'nominate' &&
			this.seat.owner !== game.lastChancellor &&
			(livingPlayers.length <= 5 || this.seat.owner !== game.lastPresident);

		var investigateable =
			game.state === 'investigate' &&
			players[this.seat.owner] && players[this.seat.owner].state === 'normal';

		var succeedable = game.state === 'nameSuccessor';
		var executable = game.state === 'execute';

		this.visible = preconditions && (nominateable || investigateable || succeedable || executable);
	};

	return Hitbox;
}(THREE.Mesh));

var Seat = (function (superclass) {
	function Seat(seatNum)
	{
		var this$1 = this;

		superclass.call(this);

		this.seatNum = seatNum;
		this.owner = '';

		// position seat
		var x, y=0.65, z;
		switch(seatNum){
		case 0: case 1: case 2:
			x = -0.833 + 0.833*seatNum;
			this.position.set(x, y, -1.05);
			break;
		case 3: case 4:
			z = -0.437 + 0.874*(seatNum-3);
			this.position.set(1.425, y, z);
			this.rotation.set(0, -Math.PI/2, 0);
			break;
		case 5: case 6: case 7:
			x = 0.833 - 0.833*(seatNum-5);
			this.position.set(x, y, 1.05);
			this.rotation.set(0, -Math.PI, 0);
			break;
		case 8: case 9:
			z = 0.437 - 0.874*(seatNum-8);
			this.position.set(-1.425, y, z);
			this.rotation.set(0, -1.5*Math.PI, 0);
			break;
		}

		SH.addEventListener('update_turnOrder', this.updateOwnership.bind(this));
		SH.addEventListener('checked_in', function (ref) {
			var id = ref.data;

			if(this$1.owner === id)
				{ this$1.updateOwnership({data: {game: SH.game, players: SH.players}}); }
		});

		SH.addEventListener('update_state', function (ref) {
			var ref_data = ref.data;
			var game = ref_data.game;
			var players = ref_data.players;

			if(this$1.owner && players[this$1.owner].state === 'dead'){
				this$1.nameplate.model.material.color.set(0x3d2789);
			}
		});

		this.nameplate = new Nameplate(this);
		this.ballot = new Ballot(this);
		this.playerInfo = new PlayerInfo(this);
		this.hitbox = new Hitbox(this);
	}

	if ( superclass ) Seat.__proto__ = superclass;
	Seat.prototype = Object.create( superclass && superclass.prototype );
	Seat.prototype.constructor = Seat;

	Seat.prototype.updateOwnership = function updateOwnership (ref)
	{
		var this$1 = this;
		var ref_data = ref.data;
		var game = ref_data.game;
		var players = ref_data.players;

		var ids = game.turnOrder || [];

		// register this seat if it's newly claimed
		if( !this.owner )
		{
			// check if a player has joined at this seat
			for(var i in ids){
				if(players[ids[i]].seatNum == this$1.seatNum){
					this$1.owner = ids[i];
					this$1.nameplate.updateText(players[ids[i]].displayName);
				}
			}
		}

		// reset this seat if it's newly vacated
		if( !ids.includes(this.owner) )
		{
			this.owner = '';
			if(game.state === 'setup'){
				this.nameplate.updateText('<Join>');
				this.nameplate.model.material.color.setHex(0xffffff);
			}
		}

		// update disconnect colors
		else if( !players[this.owner].connected ){
			this.nameplate.model.material.color.setHex(0x808080);
		}
		else if( players[this.owner].connected ){
			this.nameplate.model.material.color.setHex(0xffffff);
		}
	};

	return Seat;
}(THREE.Object3D));

var ContinueBox = (function (superclass) {
	function ContinueBox(parent)
	{
		var this$1 = this;

		superclass.call(this);
		this.icon = new THREE.Mesh(
			new THREE.BoxBufferGeometry(.15, .15, .15),
			new THREE.MeshBasicMaterial({color: 0x10a010})
		);
		Animate.spin(this.icon);
		this.add(this.icon);

		this.text = PlaceholderMesh.clone();
		this.text.position.set(0, .2, 0);
		this.text.userData.altspace = {collider: {enabled: true}};

		var bb = new NBillboard(this.text);

		this.textComponent = new NText(this.text);
		this.textComponent.update({fontSize: 1, width: 2, height: 1, horizontalAlign: 'middle', verticalAlign: 'middle'});

		this.add(this.text);

		this.position.set(0, 0.25, 0);
		parent.add(this);

		SH.addEventListener('update_state', this.onstatechange.bind(this));
		SH.addEventListener('update_turnOrder', this.playerSetup.bind(this));
		this.addEventListener('cursorup', this.onclick.bind(this));
		this.addBehavior( new altspace.utilities.behaviors.HoverScale() );

		var show = function () { return this$1.show(); };
		SH.addEventListener('investigate', show);
		SH.addEventListener('policyAnimDone', show);
	}

	if ( superclass ) ContinueBox.__proto__ = superclass;
	ContinueBox.prototype = Object.create( superclass && superclass.prototype );
	ContinueBox.prototype.constructor = ContinueBox;

	ContinueBox.prototype.onclick = function onclick (evt)
	{
		if(SH.game.turnOrder.includes(SH.localUser.id))
			{ SH.socket.emit('continue'); }
	};

	ContinueBox.prototype.onstatechange = function onstatechange (ref)
	{
		var this$1 = this;
		var game = ref.data.game;

		if(game.state === 'lameDuck' || (game.state === 'peek' && game.president === SH.localUser.id)){
			this.show();
		}
		else if(game.state === 'setup'){
			this.playerSetup({data: {game: game}});
		}
		else if(game.state === 'done'){
			this.hide();
			setTimeout(function () {
				this$1.show('New game');
			}, 8000);
		}
		else {
			this.hide();
		}
	};

	ContinueBox.prototype.playerSetup = function playerSetup (ref)
	{
		var game = ref.data.game;

		if(game.state === 'setup'){
			this.text.visible = true;
			var playerCount = game.turnOrder.length;
			if(playerCount >= 5){
				this.icon.visible = true;
				this.textComponent.update({text:
					("(" + playerCount + "/5) Click when ready")
				});
			}
			else {
				this.icon.visible = false;
				this.textComponent.update({text:
					("(" + playerCount + "/5) Need more players")
				});
			}
		}
	};

	ContinueBox.prototype.show = function show (message){
		if ( message === void 0 ) message = 'Click to continue';

		this.icon.visible = true;
		this.text.visible = true;
		this.textComponent.update({text: message});
	};

	ContinueBox.prototype.hide = function hide (){
		this.icon.visible = false;
		this.text.visible = false;
	};

	return ContinueBox;
}(THREE.Object3D));

var positions$1 = [
	new THREE.Vector3(0.368, .005, -.717),
	new THREE.Vector3(0.135, .010, -.717),
	new THREE.Vector3(-.096, .015, -.717),
	new THREE.Vector3(-.329, .020, -.717)
];

var ElectionTracker = (function (superclass) {
	function ElectionTracker()
	{
		superclass.call(
			this, new THREE.CylinderBufferGeometry(.04, .04, .01, 16),
			new THREE.MeshBasicMaterial()
		);
		this.position.copy(positions$1[0]);
		SH.table.add(this);
		
		// fails%3 == 0 or 3?
		this.highSide = false;
		this.spot = 0;
		this.material.color.setHSL(.528, .31, .4);

		SH.addEventListener('update_failedVotes', this.updateFailedVotes.bind(this));
	}

	if ( superclass ) ElectionTracker.__proto__ = superclass;
	ElectionTracker.prototype = Object.create( superclass && superclass.prototype );
	ElectionTracker.prototype.constructor = ElectionTracker;

	ElectionTracker.prototype.updateFailedVotes = function updateFailedVotes (ref)
	{
		if ( ref === void 0 ) ref = {data: {game: {failedVotes: -1}}};
		var failedVotes = ref.data.game.failedVotes;

		if(failedVotes === -1)
			{ failedVotes = this.spot; }

		this.highSide = failedVotes > 0;
		this.spot = failedVotes%3 || this.highSide && 3 || 0;

		this.anim = Animate.simple(this, {
			pos: positions$1[this.spot],
			scale: new THREE.Vector3(1, 1+this.spot, 1),
			hue: .528*(1-this.spot/3),
			duration: 1200
		});
	};

	return ElectionTracker;
}(THREE.Mesh));

var Presentation = (function (superclass) {
	function Presentation()
	{
		superclass.call(this);
		SH.table.add(this);
		this.position.set(0, -.9, 0);

		// create idle display
		this.credits = new CreditsCard();
		this.credits.position.set(0, 1.85, 0);
		Animate.spin(this.credits, 30000);
		this.add(this.credits);
		
		// create victory banner
		this.banner = PlaceholderMesh.clone();
		this.banner.text = new NText(this.banner);
		this.banner.text.update({fontSize: 2});
		this.banner.billboard = new NBillboard(this.banner);
		this.banner.bob = null;
		this.add(this.banner);

		// update stuff
		SH.addEventListener('update_state', this.updateOnState.bind(this));
	}

	if ( superclass ) Presentation.__proto__ = superclass;
	Presentation.prototype = Object.create( superclass && superclass.prototype );
	Presentation.prototype.constructor = Presentation;

	Presentation.prototype.updateOnState = function updateOnState (ref)
	{
		var this$1 = this;
		var ref_data = ref.data;
		var game = ref_data.game;
		var players = ref_data.players;

		this.banner.visible = false;
		this.credits.visible = false;
		if(this.banner.bob){
			this.banner.bob.stop();
			this.banner.bob = null;
		}

		if(game.state === 'setup'){
			this.credits.visible = true;
		}
		else if(game.state === 'done')
		{
			if(/^liberal/.test(game.victory)){
				this.banner.text.color = '#1919ff';
				this.banner.text.update({text: 'Liberals win!'});
				SH.audio.liberalFanfare.play();
			}
			else {
				this.banner.text.color = 'red';
				this.banner.text.update({text: 'Fascists win!'});
				SH.audio.fascistFanfare.play();
			}
			
			this.banner.position.set(0,0.8,0);
			this.banner.scale.setScalar(.001);
			this.banner.visible = true;
			Animate.simple(this.banner, {
				pos: new THREE.Vector3(0, 1.8, 0),
				scale: new THREE.Vector3(1,1,1),
				duration: 1000
			})
			.then(function () { return this$1.banner.bob = Animate.bob(this$1.banner); });
		}
		else if(game.state === 'policy1' && game.fascistPolicies >= 3)
		{
			var chancellor = players[game.chancellor].displayName;
			this.banner.text.color = 'white';
			this.banner.text.update({text: (chancellor + " is not " + (translate('Hitler')) + "!")});

			this.banner.position.set(0,0.8,0);
			this.banner.scale.setScalar(.001);
			this.banner.visible = true;
			Animate.simple(this.banner, {
				pos: new THREE.Vector3(0, 1.8, 0),
				scale: new THREE.Vector3(1,1,1)
			})
			.then(function () { return this$1.banner.bob = Animate.bob(this$1.banner); });
		}
		
	};

	return Presentation;
}(THREE.Object3D));

var AudioStream = function AudioStream(context, buffer, output){
	var this$1 = this;

	this.source = context.createBufferSource();
	this.source.buffer = buffer;
	this.source.connect(output);
	this.finishedPlaying = new Promise(function (resolve, reject) {
		this$1._resolve = resolve;
	});
};

AudioStream.prototype.play = function play (){
	if(/AltspaceVR/.test(navigator.userAgent))
		{ this.source.start(0, 0); }
	setTimeout(this._resolve, Math.ceil(this.source.buffer.duration*1000 + 400));
};

AudioStream.prototype.stop = function stop (){
	this.source.stop();
};

var queuedStreams = Promise.resolve();

var AudioClip = function AudioClip(context, url, volume, queued)
{
	var this$1 = this;
	if ( queued === void 0 ) queued = true;

	this.context = context;
	this.output = context.createGain();
	this.output.gain.value = volume;
	this.output.connect(context.destination);

	this.loaded = new Promise(function (resolve, reject) {
		var loader = new THREE.FileLoader();
		loader.setResponseType('arraybuffer');
		loader.load(url, function (buffer) {
			context.decodeAudioData(buffer, function (decodedBuffer) {
				this$1.buffer = decodedBuffer;
				resolve();
			});
		});
	});
};

AudioClip.prototype.play = function play (queued)
{
		var this$1 = this;
		if ( queued === void 0 ) queued = false;

	return this.loaded.then(function () {
		var instance = new AudioStream(this$1.context, this$1.buffer, this$1.output);
			
		if(queued){
			queuedStreams = queuedStreams.then(function () {
				instance.play();
				return instance.finishedPlaying;
			});
			return queuedStreams;
		}
		else {
			instance.play();
			return instance.finishedPlaying;
		}
	});
};

var FakeAudioClip = function FakeAudioClip(){ this.fakestream = new FakeAudioStream(); };
FakeAudioClip.prototype.play = function play (){ return Promise.resolve(); };

var FakeAudioStream = function FakeAudioStream(){ this.finishedPlaying = Promise.resolve(); };
FakeAudioStream.prototype.play = function play (){ };
FakeAudioStream.prototype.stop = function stop (){ };

var AudioController = function AudioController()
{
	var this$1 = this;

	var context = this.context = new AudioContext();
	this.liberalSting = new AudioClip(this.context, "/static/audio/hitler/liberal-sting.ogg", 0.2);
	this.liberalFanfare = new AudioClip(this.context, "/static/audio/hitler/liberal-fanfare.ogg", 0.2);
	this.fascistSting = new AudioClip(this.context, "/static/audio/hitler/fascist-sting.ogg", 0.1);
	this.fascistFanfare = new AudioClip(this.context, "/static/audio/hitler/fascist-fanfare.ogg", 0.1);

	var fake = new FakeAudioClip();
	this.tutorial = {loadStarted: false};
	['welcome','night','nomination','voting','voteFails','votePasses','policy1','policy2','policyFascist',
	'policyLiberal','policyAftermath','wrapup','power1','power2','investigate','peek','nameSuccessor','execute',
	'veto','redzone'].forEach(function (x) { return this$1.tutorial[x] = fake; });
};

AudioController.prototype.loadTutorial = function loadTutorial (game)
{
	if(!game.tutorial || this.tutorial.loadStarted) { return; }

	var reader = game.tutorial, context = this.context, volume = 0.5;

	Object.assign(this.tutorial, {
		loadStarted: true,
		welcome: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/welcome.ogg"), volume),
		night: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/night.ogg"), volume),
		nomination: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/nomination.ogg"), volume),
		voting: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/voting.ogg"), volume),
		voteFails: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/vote-fails.ogg"), volume),
		votePasses: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/vote-passed.ogg"), volume),
		policy1: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/policy1.ogg"), volume),
		policy2: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/policy2.ogg"), volume),
		policyFascist: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/policy-fascist.ogg"), volume),
		policyLiberal: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/policy-liberal.ogg"), volume),
		policyAftermath: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/policy-aftermath.ogg"), volume),
		wrapup: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/wrapup.ogg"), volume),
		power1: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/power1.ogg"), volume),
		power2: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/power2.ogg"), volume),
		investigate: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/power-investigate.ogg"), volume),
		peek: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/power-peek.ogg"), volume),
		nameSuccessor: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/power-namesuccessor.ogg"), volume),
		execute: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/power-execute.ogg"), volume),
		veto: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/power-veto.ogg"), volume),
		redzone: new AudioClip(context, ("/static/audio/" + activeTheme + "/" + reader + "-tutorial/redzone.ogg"), volume)
	});
};

var TutorialManager = function TutorialManager()
{
	this.enabled = false;
	this.lastEvent = null;
	this.played = [];
};

TutorialManager.prototype.detectEvent = function detectEvent (game, votes)
{
	var lastElection = votes[game.lastElection];
	var firstRound = game.fascistPolicies + game.liberalPolicies === 0;

	if(firstRound && game.state === 'night')
		{ return 'night'; }
	else if(firstRound && game.state === 'nominate')
		{ return 'nomination'; }
	else if(firstRound && game.state === 'election')
		{ return 'voting'; }
	else if(game.state === 'lameDuck' && lastElection.yesVoters.length < lastElection.toPass && !this.played.includes('voteFails')){
		this.played.push('voteFails');
		return 'voteFails';
	}
	else if(game.state === 'lameDuck' && lastElection.yesVoters.length >= lastElection.toPass && !this.played.includes('votePasses')){
		this.played.push('votePasses');
		return 'votePasses';
	}
	else if(firstRound && game.state === 'policy1')
		{ return 'policy1'; }
	else if(firstRound && game.state === 'policy2')
		{ return 'policy2'; }
	else if(game.state === 'aftermath' && game.fascistPolicies === 1 && game.hand === 2)
		{ return 'policyFascist'; }
	else if(game.state === 'aftermath' && game.liberalPolicies === 1 && game.hand === 3)
		{ return 'policyLiberal'; }

	else if(game.state === 'nominate' && game.fascistPolicies+game.liberalPolicies === 1)
		{ return 'wrapup'; }
	else if(game.state === 'nominate' && game.fascistPolicies === 3 && !this.played.includes('redzone')){
		this.played.push('redzone');
		return 'redzone';
	}

	else if(['investigate','peek','nameSuccessor','execute'].includes(game.state))
	{
		if(this.played.includes(game.state))
			{ return null; }

		var state;
		if(game.fascistPolicies === 5)
			{ state = 'veto'; }
		else
			{ state = game.state; }
		this.played.push(state);

		if(!this.played.includes('power')){
			state = 'first_'+state;
			this.played.push('power');
		}

		return state;
	}
	else { return null; }
};

TutorialManager.prototype.stateUpdate = function stateUpdate (game, votes)
{
	if(!game.tutorial) { return; }

	var seamless = {
		policyFascist: ['policyFascist','policyAftermath'],
		policyLiberal: ['policyLiberal','policyAftermath'],
		first_investigate: ['power1','power2','investigate'],
		first_peek: ['power1','power2','peek'],
		first_nameSuccessor: ['power1','power2','nameSuccessor'],
		first_execute: ['power1','power2','execute'],
		first_veto: ['power1','power2','veto'],
		investigate: ['power1','investigate'],
		peek: ['power1','peek'],
		nameSuccessor: ['power1','nameSuccessor'],
		execute: ['power1','execute'],
		veto: ['power1','veto'],
		night: ['welcome','night']
	};
	var delayed = {
		policyFascist: 'policyAnimDone',
		policyLiberal: 'policyAnimDone'
	};

	var event = this.lastEvent = this.detectEvent(game, votes);
	console.log('tutorial event:', event);

	var wait = Promise.resolve();
	if(delayed[event]){
		wait = new Promise(function (resolve, reject) {
			var handler = function () {
				SH.removeEventListener(delayed[event], handler);
				resolve();
			};
			SH.addEventListener(delayed[event], handler);
		});
	}

	if(seamless[event])
	{
		wait.then(function () {
			seamless[event].forEach(function (clip) { return SH.audio.tutorial[clip].play(true); });
		});
	}
	else if(event !== null)
	{
		wait.then(function () { return SH.audio.tutorial[event].play(true); });
	}
};

var SecretHitler = (function (superclass) {
	function SecretHitler()
	{
		var this$1 = this;

		superclass.call(this);
		this.assets = assets.manifest;
		this.verticalAlign = 'bottom';
		this.needsSkeleton = false;

		// polyfill getUser function
		if(!altspace.inClient){
			altspace.getUser = function () {
				var id, re = /[?&]userId=(\d+)/.exec(window.location.search);
				if(re)
					{ id = re[1]; }
				else
					{ id = Math.floor(Math.random() * 10000000).toString(); }

				altspace._localUser = {
					userId: id,
					displayName: id,
					isModerator: /isModerator/.test(window.location.search)
				};
				console.log('Masquerading as', altspace._localUser);
				return Promise.resolve(altspace._localUser);
			};
		}

		// get local user
		this._userPromise = altspace.getUser();
		this._userPromise.then(function (user) {
			this$1.localUser = {
				id: user.userId,
				displayName: user.displayName,
				isModerator: user.isModerator
			};
		});

		this.game = {};
		this.players = {};
		this.votes = {};
	}

	if ( superclass ) SecretHitler.__proto__ = superclass;
	SecretHitler.prototype = Object.create( superclass && superclass.prototype );
	SecretHitler.prototype.constructor = SecretHitler;

	SecretHitler.prototype.initialize = function initialize (env, root, assets$$1)
	{
		var this$1 = this;

		if(!this.localUser){
			this._userPromise.then(function () { return this$1.initialize(env, root, assets$$1); });
			return;
		}

		// share the diorama info
		assets.cache = assets$$1;
		assets.fixMaterials();
		this.env = env;

		// connect to server
		this.socket = io.connect('/', {query: ("gameId=" + (getGameId()) + "&theme=" + activeTheme)});

		// spawn self-serve tutorial dialog
		if(altspace.inClient){
			altspace.open(window.location.origin+'/static/tutorial.html', '_experience',
				{hidden: true, icon: window.location.origin+'/static/img/caesar/icon.png'});
		}

		this.audio = new AudioController();
		this.tutorial = new TutorialManager();

		// create the table
		this.table = new GameTable();
		this.add(this.table);

		this.resetButton = new THREE.Mesh(
			new THREE.BoxGeometry(.25,.25,.25),
			new THREE.MeshBasicMaterial({map: assets$$1.textures.reset})
		);
		this.resetButton.position.set(1.13, -.9, .75);
		this.resetButton.addEventListener('cursorup', this.sendReset.bind(this));
		this._userPromise.then(function () {
			if(this$1.localUser.isModerator)
				{ this$1.table.add(this$1.resetButton); }
		});

		this.refreshButton = new THREE.Mesh(
			new THREE.BoxGeometry(.25,.25,.25),
			new THREE.MeshBasicMaterial({map: assets$$1.textures.refresh})
		);
		this.refreshButton.position.set(1.13, -.3, .75);
		this.refreshButton.addEventListener('cursorup', function () { return window.location.reload(); });
		this.table.add(this.refreshButton);

		this.presentation = new Presentation();

		// create hats
		this.presidentHat = new PresidentHat();
		this.chancellorHat = new ChancellorHat();

		// create positions
		this.seats = [];
		for(var i=0; i<10; i++){
			this$1.seats.push( new Seat(i) );
		}

		(ref = this.table).add.apply(ref, this.seats);

		//this.playerMeter = new PlayerMeter();
		//this.table.add(this.playerMeter);
		this.continueBox = new ContinueBox(this.table);

		this.electionTracker = new ElectionTracker();

		this.socket.on('update', this.updateFromServer.bind(this));
		this.socket.on('checked_in', this.checkedIn.bind(this));

		this.socket.on('reset', this.doReset.bind(this));
		var ref;
		//this.socket.on('disconnect', this.doReset.bind(this));
	};

	SecretHitler.prototype.updateFromServer = function updateFromServer (gd, pd, vd)
	{
		var this$1 = this;

		console.log(gd, pd, vd);

		var game = Object.assign({}, this.game, gd);
		var players = mergeObjects(this.players, pd || {});
		var votes = mergeObjects(this.votes, vd || {});

		if(gd.tutorial)
			{ this.audio.loadTutorial(game); }

		if(gd.state)
			{ this.tutorial.stateUpdate(game, votes); }

		for(var field in gd)
		{
			this$1.dispatchEvent({
				type: 'update_'+field,
				bubbles: false,
				data: {
					game: game,
					players: players,
					votes: votes
				}
			});
		}

		this._userPromise.then(function () {
			if(players[this$1.localUser.id] && !players[this$1.localUser.id].connected){
				this$1.socket.emit('check_in', this$1.localUser);
			}
		});

		this.game = game;
		this.players = players;
		this.votes = votes;
	};

	SecretHitler.prototype.checkedIn = function checkedIn (p)
	{
		Object.assign(this.players[p.id], p);
		this.dispatchEvent({
			type: 'checked_in',
			bubbles: false,
			data: p.id
		});
	};

	SecretHitler.prototype.sendReset = function sendReset (e){
		if(this.localUser.isModerator){
			console.log('requesting reset');
			this.socket.emit('reset');
		}
	};

	SecretHitler.prototype.doReset = function doReset (game, players, votes)
	{
		window.location.reload(true);
	};

	return SecretHitler;
}(THREE.Object3D));

var SH = new SecretHitler();

return SH;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvcG9seWZpbGwuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RoZW1lLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hc3NldG1hbmFnZXIuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hdGl2ZWNvbXBvbmVudHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JlaGF2aW9yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hbmltYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jYXJkLmpzIiwiLi4vLi4vc3JjL2NsaWVudC90YWJsZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdXRpbHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hbWVwbGF0ZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmFsbG90cHJvY2Vzc29yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9icGJhLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3QuanMiLCIuLi8uLi9zcmMvY2xpZW50L3BsYXllcmluZm8uanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcHN1bGVnZW9tZXRyeS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvaGl0Ym94LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWF0LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jb250aW51ZWJveC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvZWxlY3Rpb250cmFja2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9wcmVzZW50YXRpb24uanMiLCIuLi8uLi9zcmMvY2xpZW50L2F1ZGlvY29udHJvbGxlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdHV0b3JpYWwuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlY3JldGhpdGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcblxyXG5pZighQXJyYXkucHJvdG90eXBlLmluY2x1ZGVzKXtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAnaW5jbHVkZXMnLCB7XHJcblx0XHR2YWx1ZTogZnVuY3Rpb24oaXRlbSl7XHJcblx0XHRcdHJldHVybiB0aGlzLmluZGV4T2YoaXRlbSkgPiAtMTtcclxuXHRcdH0sXHJcblx0XHR3cml0YWJsZTogZmFsc2UsXHJcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcclxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2VcclxuXHR9KTtcclxufVxyXG4iLCJsZXQgYWN0aXZlVGhlbWUgPSAnaGl0bGVyJztcclxuaWYoL2NhZXNhci8udGVzdCh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpKXtcclxuXHRhY3RpdmVUaGVtZSA9ICdjYWVzYXInO1xyXG59XHJcblxyXG5jb25zdCB0aGVtZXMgPSB7XHJcblx0aGl0bGVyOiB7XHJcblx0XHRoaXRsZXI6ICdoaXRsZXInLFxyXG5cdFx0cHJlc2lkZW50OiAncHJlc2lkZW50JyxcclxuXHRcdGNoYW5jZWxsb3I6ICdjaGFuY2VsbG9yJ1xyXG5cdH0sXHJcblx0Y2Flc2FyOiB7XHJcblx0XHRoaXRsZXI6ICdjYWVzYXInLFxyXG5cdFx0cHJlc2lkZW50OiAnY29uc3VsJyxcclxuXHRcdGNoYW5jZWxsb3I6ICdwcmFldG9yJ1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gdHJhbnNsYXRlKHN0cmluZylcclxue1xyXG5cdGxldCBrZXkgPSBzdHJpbmcudG9Mb3dlckNhc2UoKSxcclxuXHRcdHZhbHVlID0gdGhlbWVzW2FjdGl2ZVRoZW1lXVtrZXldIHx8IHRoZW1lcy5oaXRsZXJba2V5XSB8fCBzdHJpbmc7XHJcblxyXG5cdC8vIHN0YXJ0cyB3aXRoIHVwcGVyIGNhc2UsIHJlc3QgaXMgbG93ZXJcclxuXHRsZXQgaXNQcm9wZXIgPSBzdHJpbmcuY2hhckF0KDApID09IHN0cmluZy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSAmJiBzdHJpbmcuc2xpY2UoMSkgPT0gc3RyaW5nLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XHJcblx0aWYoaXNQcm9wZXIpe1xyXG5cdFx0dmFsdWUgPSB2YWx1ZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHZhbHVlLnNsaWNlKDEpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHZhbHVlO1xyXG59XHJcblxyXG5leHBvcnQge3RyYW5zbGF0ZSwgYWN0aXZlVGhlbWV9IiwiaW1wb3J0IHthY3RpdmVUaGVtZSBhcyB0aGVtZX0gZnJvbSAnLi90aGVtZSc7XHJcblxyXG5sZXQgdGhlbWVNb2RlbHMgPSB7XHJcblx0Y2Flc2FyOiB7XHJcblx0XHRsYXVyZWxzOiAnL3N0YXRpYy9tb2RlbC9sYXVyZWxzLmdsdGYnXHJcblx0fSxcclxuXHRoaXRsZXI6IHtcclxuXHRcdHRvcGhhdDogJy9zdGF0aWMvbW9kZWwvdG9waGF0LmdsdGYnLFxyXG5cdFx0dmlzb3JjYXA6ICcvc3RhdGljL21vZGVsL3Zpc29yX2NhcC5nbHRmJ1xyXG5cdH1cclxufTtcclxuXHJcbmxldCBhc3NldHMgPSB7XHJcblx0bWFuaWZlc3Q6IHtcclxuXHRcdG1vZGVsczogT2JqZWN0LmFzc2lnbih7XHJcblx0XHRcdHRhYmxlOiAnL3N0YXRpYy9tb2RlbC90YWJsZS5nbHRmJyxcclxuXHRcdFx0bmFtZXBsYXRlOiAnL3N0YXRpYy9tb2RlbC9uYW1lcGxhdGUuZGFlJyxcclxuXHRcdFx0Ly9kdW1teTogJy9zdGF0aWMvbW9kZWwvZHVtbXkuZ2x0ZicsXHJcblx0XHRcdC8vcGxheWVybWV0ZXI6ICcvc3RhdGljL21vZGVsL3BsYXllcm1ldGVyLmdsdGYnXHJcblx0XHR9LCB0aGVtZU1vZGVsc1t0aGVtZV0pLFxyXG5cdFx0dGV4dHVyZXM6IHtcclxuXHRcdFx0Ym9hcmRfbGFyZ2U6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1sYXJnZS5qcGdgLFxyXG5cdFx0XHRib2FyZF9tZWQ6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1tZWRpdW0uanBnYCxcclxuXHRcdFx0Ym9hcmRfc21hbGw6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1zbWFsbC5qcGdgLFxyXG5cdFx0XHRjYXJkczogYC9zdGF0aWMvaW1nLyR7dGhlbWV9L2NhcmRzLmpwZ2AsXHJcblx0XHRcdHJlc2V0OiAnL3N0YXRpYy9pbWcvYm9tYi5wbmcnLFxyXG5cdFx0XHRyZWZyZXNoOiAnL3N0YXRpYy9pbWcvcmVmcmVzaC5qcGcnXHJcblx0XHRcdC8vdGV4dDogJy9zdGF0aWMvaW1nL3RleHQucG5nJ1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0Y2FjaGU6IHt9LFxyXG5cdGZpeE1hdGVyaWFsczogZnVuY3Rpb24oKVxyXG5cdHtcclxuXHRcdE9iamVjdC5rZXlzKHRoaXMuY2FjaGUubW9kZWxzKS5mb3JFYWNoKGlkID0+IHtcclxuXHRcdFx0dGhpcy5jYWNoZS5tb2RlbHNbaWRdLnRyYXZlcnNlKG9iaiA9PiB7XHJcblx0XHRcdFx0aWYob2JqLm1hdGVyaWFsIGluc3RhbmNlb2YgVEhSRUUuTWVzaFN0YW5kYXJkTWF0ZXJpYWwpe1xyXG5cdFx0XHRcdFx0bGV0IG5ld01hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCgpO1xyXG5cdFx0XHRcdFx0bmV3TWF0Lm1hcCA9IG9iai5tYXRlcmlhbC5tYXA7XHJcblx0XHRcdFx0XHRuZXdNYXQuY29sb3IuY29weShvYmoubWF0ZXJpYWwuY29sb3IpO1xyXG5cdFx0XHRcdFx0bmV3TWF0LnRyYW5zcGFyZW50ID0gb2JqLm1hdGVyaWFsLnRyYW5zcGFyZW50O1xyXG5cdFx0XHRcdFx0bmV3TWF0LnNpZGUgPSBvYmoubWF0ZXJpYWwuc2lkZTtcclxuXHRcdFx0XHRcdG9iai5tYXRlcmlhbCA9IG5ld01hdDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBhc3NldHM7IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxubGV0IHBsYWNlaG9sZGVyR2VvID0gbmV3IFRIUkVFLkJveEJ1ZmZlckdlb21ldHJ5KC4wMDEsIC4wMDEsIC4wMDEpO1xyXG5sZXQgcGxhY2Vob2xkZXJNYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe2NvbG9yOiAweGZmZmZmZiwgdmlzaWJsZTogZmFsc2V9KTtcclxubGV0IFBsYWNlaG9sZGVyTWVzaCA9IG5ldyBUSFJFRS5NZXNoKHBsYWNlaG9sZGVyR2VvLCBwbGFjZWhvbGRlck1hdCk7XHJcblxyXG5jbGFzcyBOYXRpdmVDb21wb25lbnRcclxue1xyXG5cdGNvbnN0cnVjdG9yKG1lc2gsIG5lZWRzVXBkYXRlKVxyXG5cdHtcclxuXHRcdHRoaXMubWVzaCA9IG1lc2g7XHJcblx0XHRhbHRzcGFjZS5hZGROYXRpdmVDb21wb25lbnQodGhpcy5tZXNoLCB0aGlzLm5hbWUpO1xyXG5cclxuXHRcdGlmKG5lZWRzVXBkYXRlKVxyXG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlKGZpZWxkcyA9IHt9KVxyXG5cdHtcclxuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5kYXRhLCBmaWVsZHMpO1xyXG5cdFx0YWx0c3BhY2UudXBkYXRlTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lLCB0aGlzLmRhdGEpO1xyXG5cdH1cclxuXHJcblx0ZGVzdHJveSgpXHJcblx0e1xyXG5cdFx0YWx0c3BhY2UucmVtb3ZlTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5UZXh0IGV4dGVuZHMgTmF0aXZlQ29tcG9uZW50IHtcclxuXHRjb25zdHJ1Y3RvcihtZXNoKXtcclxuXHRcdHRoaXMubmFtZSA9ICduLXRleHQnO1xyXG5cdFx0dGhpcy5kYXRhID0ge1xyXG5cdFx0XHRmb250U2l6ZTogMTAsXHJcblx0XHRcdGhlaWdodDogMSxcclxuXHRcdFx0d2lkdGg6IDEwLFxyXG5cdFx0XHR2ZXJ0aWNhbEFsaWduOiAnbWlkZGxlJyxcclxuXHRcdFx0aG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJyxcclxuXHRcdFx0dGV4dDogJydcclxuXHRcdH07XHJcblx0XHRzdXBlcihtZXNoLCB0cnVlKTtcclxuXHJcblx0XHR0aGlzLmNvbG9yID0gJ2JsYWNrJztcclxuXHR9XHJcblx0dXBkYXRlKGZpZWxkcyA9IHt9KXtcclxuXHRcdGlmKGZpZWxkcy50ZXh0KVxyXG5cdFx0XHRmaWVsZHMudGV4dCA9IGA8Y29sb3I9JHt0aGlzLmNvbG9yfT4ke2ZpZWxkcy50ZXh0fTwvY29sb3I+YDtcclxuXHRcdE5hdGl2ZUNvbXBvbmVudC5wcm90b3R5cGUudXBkYXRlLmNhbGwodGhpcywgZmllbGRzKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5Ta2VsZXRvblBhcmVudCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XHJcblx0Y29uc3RydWN0b3IobWVzaCl7XHJcblx0XHR0aGlzLm5hbWUgPSAnbi1za2VsZXRvbi1wYXJlbnQnO1xyXG5cdFx0dGhpcy5kYXRhID0ge1xyXG5cdFx0XHRpbmRleDogMCxcclxuXHRcdFx0cGFydDogJ2hlYWQnLFxyXG5cdFx0XHRzaWRlOiAnY2VudGVyJywgXHJcblx0XHRcdHVzZXJJZDogMFxyXG5cdFx0fTtcclxuXHRcdHN1cGVyKG1lc2gsIHRydWUpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgTkJpbGxib2FyZCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XHJcblx0Y29uc3RydWN0b3IobWVzaCl7XHJcblx0XHR0aGlzLm5hbWUgPSAnbi1iaWxsYm9hcmQnO1xyXG5cdFx0c3VwZXIobWVzaCwgZmFsc2UpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5UZXh0LCBOU2tlbGV0b25QYXJlbnQsIE5CaWxsYm9hcmR9OyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7TlNrZWxldG9uUGFyZW50fSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xyXG5pbXBvcnQge2FjdGl2ZVRoZW1lIGFzIHRoZW1lfSBmcm9tICcuL3RoZW1lJztcclxuXHJcbmNsYXNzIEhhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3Rvcihtb2RlbClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5jdXJyZW50SWQgPSAnJztcclxuXHRcdHRoaXMuY29tcG9uZW50cyA9IHtoYXQ6IG51bGwsIHRleHQ6IG51bGx9O1xyXG5cdFx0XHJcblx0XHRpZihtb2RlbC5wYXJlbnQpXHJcblx0XHRcdG1vZGVsLnBhcmVudC5yZW1vdmUobW9kZWwpO1xyXG5cdFx0bW9kZWwudXBkYXRlTWF0cml4V29ybGQodHJ1ZSk7XHJcblxyXG5cdFx0Ly8gZ3JhYiBtZXNoZXNcclxuXHRcdGxldCBwcm9wID0gJyc7XHJcblx0XHRtb2RlbC50cmF2ZXJzZShvYmogPT4ge1xyXG5cdFx0XHRpZihvYmoubmFtZSA9PT0gJ2hhdCcgfHwgb2JqLm5hbWUgPT09ICd0ZXh0Jyl7XHJcblx0XHRcdFx0cHJvcCA9IG9iai5uYW1lO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYob2JqIGluc3RhbmNlb2YgVEhSRUUuTWVzaCl7XHJcblx0XHRcdFx0dGhpc1twcm9wXSA9IG9iajtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gc3RyaXAgb3V0IG1pZGRsZSBub2Rlc1xyXG5cdFx0aWYodGhpcy5oYXQpe1xyXG5cdFx0XHR0aGlzLmhhdC5tYXRyaXguY29weSh0aGlzLmhhdC5tYXRyaXhXb3JsZCk7XHJcblx0XHRcdHRoaXMuaGF0Lm1hdHJpeC5kZWNvbXBvc2UodGhpcy5oYXQucG9zaXRpb24sIHRoaXMuaGF0LnF1YXRlcm5pb24sIHRoaXMuaGF0LnNjYWxlKTtcclxuXHRcdFx0dGhpcy5hZGQodGhpcy5oYXQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHRoaXMudGV4dCl7XHJcblx0XHRcdHRoaXMudGV4dC5tYXRyaXguY29weSh0aGlzLnRleHQubWF0cml4V29ybGQpO1xyXG5cdFx0XHR0aGlzLnRleHQubWF0cml4LmRlY29tcG9zZSh0aGlzLnRleHQucG9zaXRpb24sIHRoaXMudGV4dC5xdWF0ZXJuaW9uLCB0aGlzLnRleHQuc2NhbGUpO1xyXG5cdFx0XHR0aGlzLmFkZCh0aGlzLnRleHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGQuc2NlbmUuYWRkKHRoaXMpO1xyXG5cdH1cclxuXHJcblx0c2V0T3duZXIodXNlcklkKVxyXG5cdHtcclxuXHRcdGlmKCF0aGlzLmN1cnJlbnRJZCAmJiB1c2VySWQpe1xyXG5cdFx0XHRkLnNjZW5lLmFkZCh0aGlzKTtcclxuXHRcdFx0aWYodGhpcy5oYXQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdCA9IG5ldyBOU2tlbGV0b25QYXJlbnQodGhpcy5oYXQpO1xyXG5cdFx0XHRpZih0aGlzLnRleHQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQgPSBuZXcgTlNrZWxldG9uUGFyZW50KHRoaXMudGV4dCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKHRoaXMuY3VycmVudElkICYmICF1c2VySWQpe1xyXG5cdFx0XHRpZih0aGlzLmhhdClcclxuXHRcdFx0XHR0aGlzLmNvbXBvbmVudHMuaGF0LmRlc3Ryb3koKTtcclxuXHRcdFx0aWYodGhpcy50ZXh0KVxyXG5cdFx0XHRcdHRoaXMuY29tcG9uZW50cy50ZXh0LmRlc3Ryb3koKTtcclxuXHRcdFx0ZC5zY2VuZS5yZW1vdmUodGhpcyk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYodXNlcklkKXtcclxuXHRcdFx0aWYodGhpcy5oYXQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdC51cGRhdGUoe3VzZXJJZH0pO1xyXG5cdFx0XHRpZih0aGlzLnRleHQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQudXBkYXRlKHt1c2VySWR9KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmN1cnJlbnRJZCA9IHVzZXJJZDtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIFByZXNpZGVudEhhdCBleHRlbmRzIEhhdFxyXG57XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdGlmKHRoZW1lID09PSAnY2Flc2FyJylcclxuXHRcdHtcclxuXHRcdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLmxhdXJlbHMuY2xvbmUoKSk7XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC4wOC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xyXG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCguNSwgMCwgMCk7XHJcblx0XHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMC44L1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHR9XHJcblx0XHRlbHNlXHJcblx0XHR7XHJcblx0XHRcdHN1cGVyKEFNLmNhY2hlLm1vZGVscy50b3BoYXQpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjE0NC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigxLjIvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0bGV0IGFzc2lnbkhhdCA9ICh7ZGF0YToge2dhbWV9fSkgPT4ge1xyXG5cdFx0XHRsZXQgc2l0dGluZyA9IGdhbWUuc3BlY2lhbEVsZWN0aW9uID8gZ2FtZS5wcmVzaWRlbnQgOiBnYW1lLmxhc3RQcmVzaWRlbnQ7XHJcblx0XHRcdHRoaXMuc2V0T3duZXIoc2l0dGluZyk7XHJcblx0XHR9XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3BlY2lhbEVsZWN0aW9uJywgYXNzaWduSGF0KTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9wcmVzaWRlbnQnLCBhc3NpZ25IYXQpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2xhc3RQcmVzaWRlbnQnLCBhc3NpZ25IYXQpO1xyXG5cdH1cclxufTtcclxuXHJcbmNsYXNzIENoYW5jZWxsb3JIYXQgZXh0ZW5kcyBIYXRcclxue1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRpZih0aGVtZSA9PT0gJ2NhZXNhcicpe1xyXG5cdFx0XHRzdXBlcihBTS5jYWNoZS5tb2RlbHMubGF1cmVscy5jbG9uZSgpKTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLjA4L1NILmVudi5waXhlbHNQZXJNZXRlciwgLjAzL1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KC41LCAwLCAwKTtcclxuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigwLjgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdH1cclxuXHRcdGVsc2VcclxuXHRcdHtcclxuXHRcdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLnZpc29yY2FwKTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4wNy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigxLjIvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdH1cclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGFzdENoYW5jZWxsb3InLCBlID0+IHtcclxuXHRcdFx0dGhpcy5zZXRPd25lcihlLmRhdGEuZ2FtZS5sYXN0Q2hhbmNlbGxvcik7XHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuY2xhc3MgQmVoYXZpb3Jcclxue1xyXG5cdGNvbnN0cnVjdG9yKHR5cGUpe1xyXG5cdFx0dGhpcy50eXBlID0gdHlwZTtcclxuXHR9XHJcblxyXG5cdGF3YWtlKG9iail7XHJcblx0XHR0aGlzLm9iamVjdDNEID0gb2JqO1xyXG5cdH1cclxuXHJcblx0c3RhcnQoKXsgfVxyXG5cclxuXHR1cGRhdGUoZFQpeyB9XHJcblxyXG5cdGRpc3Bvc2UoKXsgfVxyXG59XHJcblxyXG5jbGFzcyBCU3luYyBleHRlbmRzIEJlaGF2aW9yXHJcbntcclxuXHRjb25zdHJ1Y3RvcihldmVudE5hbWUpXHJcblx0e1xyXG5cdFx0c3VwZXIoJ0JTeW5jJyk7XHJcblx0XHR0aGlzLl9zID0gU0guc29ja2V0O1xyXG5cclxuXHRcdC8vIGxpc3RlbiBmb3IgdXBkYXRlIGV2ZW50c1xyXG5cdFx0dGhpcy5ob29rID0gdGhpcy5fcy5vbihldmVudE5hbWUsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcclxuXHRcdHRoaXMuZXZlbnROYW1lID0gZXZlbnROYW1lO1xyXG5cdFx0dGhpcy5vd25lciA9IDA7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVGcm9tU2VydmVyKGRhdGEpXHJcblx0e1xyXG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XHJcblx0XHR0aGlzLm9iamVjdDNELnJvdGF0aW9uLmZyb21BcnJheShkYXRhLCAzKTtcclxuXHR9XHJcblxyXG5cdHRha2VPd25lcnNoaXAoKVxyXG5cdHtcclxuXHRcdGlmKFNILmxvY2FsVXNlciAmJiBTSC5sb2NhbFVzZXIudXNlcklkKVxyXG5cdFx0XHR0aGlzLm93bmVyID0gU0gubG9jYWxVc2VyLnVzZXJJZDtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZShkVClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIgJiYgU0gubG9jYWxVc2VyLnNrZWxldG9uICYmIFNILmxvY2FsVXNlci5pZCA9PT0gdGhpcy5vd25lcilcclxuXHRcdHtcclxuXHRcdFx0bGV0IGogPSBTSC5sb2NhbFVzZXIuc2tlbGV0b24uZ2V0Sm9pbnQoJ0hlYWQnKTtcclxuXHRcdFx0dGhpcy5fcy5lbWl0KHRoaXMuZXZlbnROYW1lLCBbLi4uai5wb3NpdGlvbi50b0FycmF5KCksIC4uLmoucm90YXRpb24udG9BcnJheSgpXSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxufVxyXG5cclxuZXhwb3J0IHsgQmVoYXZpb3IsIEJTeW5jIH07XHJcbiIsImltcG9ydCB7IEJlaGF2aW9yIH0gZnJvbSAnLi9iZWhhdmlvcic7XHJcblxyXG5jbGFzcyBRdWF0ZXJuaW9uVHdlZW4gZXh0ZW5kcyBUV0VFTi5Ud2VlblxyXG57XHJcblx0Y29uc3RydWN0b3Ioc3RhdGUsIGdyb3VwKXtcclxuXHRcdHN1cGVyKHt0OiAwfSwgZ3JvdXApO1xyXG5cdFx0dGhpcy5fc3RhdGUgPSBzdGF0ZTtcclxuXHRcdHRoaXMuX3N0YXJ0ID0gc3RhdGUuY2xvbmUoKTtcclxuXHR9XHJcblx0dG8oZW5kLCBkdXJhdGlvbil7XHJcblx0XHRzdXBlci50byh7dDogMX0sIGR1cmF0aW9uKTtcclxuXHRcdHRoaXMuX2VuZCA9IGVuZCBpbnN0YW5jZW9mIFRIUkVFLlF1YXRlcm5pb24gPyBbZW5kXSA6IGVuZDtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH1cclxuXHRzdGFydCgpe1xyXG5cdFx0dGhpcy5vblVwZGF0ZSgoe3Q6IHByb2dyZXNzfSkgPT4ge1xyXG5cdFx0XHRwcm9ncmVzcyA9IHByb2dyZXNzICogdGhpcy5fZW5kLmxlbmd0aDtcclxuXHRcdFx0bGV0IG5leHRQb2ludCA9IE1hdGguY2VpbChwcm9ncmVzcyk7XHJcblx0XHRcdGxldCBsb2NhbFByb2dyZXNzID0gcHJvZ3Jlc3MgLSBuZXh0UG9pbnQgKyAxO1xyXG5cdFx0XHRsZXQgcG9pbnRzID0gW3RoaXMuX3N0YXJ0LCAuLi50aGlzLl9lbmRdO1xyXG5cdFx0XHRUSFJFRS5RdWF0ZXJuaW9uLnNsZXJwKHBvaW50c1tuZXh0UG9pbnQtMV0sIHBvaW50c1tuZXh0UG9pbnRdLCB0aGlzLl9zdGF0ZSwgbG9jYWxQcm9ncmVzcyk7XHJcblx0XHR9KTtcclxuXHRcdHJldHVybiBzdXBlci5zdGFydCgpO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gV2FpdEZvckFuaW1zKHR3ZWVucylcclxue1xyXG5cdGxldCBwID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cclxuXHR7XHJcblx0XHRsZXQgYWN0aXZlQ291bnQgPSB0d2VlbnMubGVuZ3RoO1xyXG5cdFx0ZnVuY3Rpb24gY2hlY2tEb25lKCl7XHJcblx0XHRcdGlmKC0tYWN0aXZlQ291bnQgPT09IDApIHJlc29sdmUoKTtcclxuXHRcdH1cclxuXHJcblx0XHR0d2VlbnMuZm9yRWFjaCh0ID0+IHQub25Db21wbGV0ZShjaGVja0RvbmUpKTtcclxuXHRcdHR3ZWVucy5mb3JFYWNoKHQgPT4gdC5vblN0b3AocmVqZWN0KSk7XHJcblx0XHR0d2VlbnMuZm9yRWFjaCh0ID0+IHQuc3RhcnQoKSk7XHJcblx0fSk7XHJcblx0cC50d2VlbnMgPSB0d2VlbnM7XHJcblx0cmV0dXJuIHA7XHJcbn1cclxuXHJcbmNvbnN0IHNwaW5Qb2ludHMgPSBbXHJcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgTWF0aC5zcXJ0KDIpLzIsIDAsIE1hdGguc3FydCgyKS8yKSxcclxuXHRuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAxLCAwLCAwKSxcclxuXHRuZXcgVEhSRUUuUXVhdGVybmlvbigwLCBNYXRoLnNxcnQoMikvMiwgMCwgLU1hdGguc3FydCgyKS8yKSxcclxuXHRuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAwLCAwLCAxKVxyXG5dO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQW5pbWF0ZVxyXG57XHJcblx0LyoqXHJcblx0ICogTW92ZSBhbiBvYmplY3QgZnJvbSBBIHRvIEJcclxuXHQgKiBAcGFyYW0ge1RIUkVFLk9iamVjdDNEfSB0YXJnZXQgXHJcblx0ICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcclxuXHQgKi9cclxuXHRzdGF0aWMgc2ltcGxlKHRhcmdldCwge3BhcmVudD1udWxsLCBwb3M9bnVsbCwgcXVhdD1udWxsLCBzY2FsZT1udWxsLCBodWU9bnVsbCwgbWF0cml4PW51bGwsIGR1cmF0aW9uPTYwMH0gPSB7fSlcclxuXHR7XHJcblx0XHQvLyBleHRyYWN0IHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlIGZyb20gbWF0cml4XHJcblx0XHRpZihtYXRyaXgpe1xyXG5cdFx0XHRwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRxdWF0ID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcclxuXHRcdFx0c2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRtYXRyaXguZGVjb21wb3NlKHBvcywgcXVhdCwgc2NhbGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHNodWZmbGUgaGllcmFyY2h5LCBidXQga2VlcCB3b3JsZCB0cmFuc2Zvcm0gdGhlIHNhbWVcclxuXHRcdGlmKHBhcmVudCAmJiB0aGlzLnBhcmVudCAhPT0gdGFyZ2V0LnBhcmVudCl7XHJcblx0XHRcdHRhcmdldC5hcHBseU1hdHJpeCh0YXJnZXQucGFyZW50Lm1hdHJpeFdvcmxkKTtcclxuXHRcdFx0dGFyZ2V0LmFwcGx5TWF0cml4KG5ldyBUSFJFRS5NYXRyaXg0KCkuZ2V0SW52ZXJzZShwYXJlbnQubWF0cml4V29ybGQpKTtcclxuXHRcdFx0cGFyZW50LmFkZChvYmopO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBhbmltcyA9IFtdO1xyXG5cclxuXHRcdGlmKHBvcyl7XHJcblx0XHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKHRhcmdldC5wb3NpdGlvbilcclxuXHRcdFx0XHQudG8oe3g6IHBvcy54LCB5OiBwb3MueSwgejogcG9zLnp9LCBkdXJhdGlvbilcclxuXHRcdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0KVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHF1YXQpe1xyXG5cdFx0XHRhbmltcy5wdXNoKG5ldyBRdWF0ZXJuaW9uVHdlZW4odGFyZ2V0LnF1YXRlcm5pb24pXHJcblx0XHRcdFx0LnRvKHF1YXQsIGR1cmF0aW9uKVxyXG5cdFx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoc2NhbGUpe1xyXG5cdFx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2Vlbih0YXJnZXQuc2NhbGUpXHJcblx0XHRcdFx0LnRvKHt4OiBzY2FsZS54LCB5OiBzY2FsZS55LCB6OiBzY2FsZS56fSwgZHVyYXRpb24pXHJcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZihodWUgIT09IG51bGwpe1xyXG5cdFx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2Vlbih0YXJnZXQubWF0ZXJpYWwuY29sb3IuZ2V0SFNMKCkpXHJcblx0XHRcdFx0LnRvKHtoOiBodWV9LCBkdXJhdGlvbilcclxuXHRcdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0KVxyXG5cdFx0XHRcdC5vblVwZGF0ZSh0d2VlbiA9PiB7XHJcblx0XHRcdFx0XHR0YXJnZXQubWF0ZXJpYWwuY29sb3Iuc2V0SFNMKHR3ZWVuLmgsIHR3ZWVuLnMsIHR3ZWVuLmwpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgd2FpdChkdXJhdGlvbil7XHJcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG5cdFx0XHRzZXRUaW1lb3V0KHJlc29sdmUsIGR1cmF0aW9uKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWFrZSB0aGUgY2FyZCBhcHBlYXIgd2l0aCBhIGZsb3VyaXNoXHJcblx0ICogQHBhcmFtIHtUSFJFRS5PYmplY3QzRH0gY2FyZCBcclxuXHQgKi9cclxuXHRzdGF0aWMgY2FyZEZsb3VyaXNoKGNhcmQpXHJcblx0e1xyXG5cdFx0Y2FyZC5wb3NpdGlvbi5zZXQoMCwgMCwgMCk7XHJcblx0XHRjYXJkLnF1YXRlcm5pb24uc2V0KDAsMCwwLDEpO1xyXG5cdFx0Y2FyZC5zY2FsZS5zZXRTY2FsYXIoLjAwMSk7XHJcblxyXG5cdFx0bGV0IGFuaW1zID0gW107XHJcblxyXG5cdFx0Ly8gYWRkIHBvc2l0aW9uIGFuaW1hdGlvblxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4oY2FyZC5wb3NpdGlvbilcclxuXHRcdFx0LnRvKHt4OiAwLCB5OiAuNywgejogMH0sIDE1MDApXHJcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLkVsYXN0aWMuT3V0KVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBhZGQgc3BpbiBhbmltYXRpb25cclxuXHRcdGFuaW1zLnB1c2gobmV3IFF1YXRlcm5pb25Ud2VlbihjYXJkLnF1YXRlcm5pb24pXHJcblx0XHRcdC50byhzcGluUG9pbnRzLCAyNTAwKVxyXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0KVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBhZGQgc2NhbGUgYW5pbWF0aW9uXHJcblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihjYXJkLnNjYWxlKVxyXG5cdFx0XHQudG8oe3g6IC41LCB5OiAuNSwgejogLjV9LCAyMDApXHJcblx0XHQpO1xyXG5cclxuXHRcdHJldHVybiBXYWl0Rm9yQW5pbXMoYW5pbXMpO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIHZhbmlzaChjYXJkKVxyXG5cdHtcclxuXHRcdGxldCBhbmltcyA9IFtdO1xyXG5cclxuXHRcdC8vIGFkZCBtb3ZlIGFuaW1hdGlvblxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4oY2FyZC5wb3NpdGlvbilcclxuXHRcdFx0LnRvKHt5OiAnKzAuNSd9LCAxMDAwKVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBhZGQgZGlzYXBwZWFyIGFuaW1hdGlvblxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4oY2FyZC5tYXRlcmlhbClcclxuXHRcdFx0LnRvKHtvcGFjaXR5OiAwfSwgMTAwMClcclxuXHRcdCk7XHJcblxyXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgYm9iKG9iaiwgYW1wbGl0dWRlID0gLjA4LCBwZXJpb2QgPSA0MDAwKVxyXG5cdHtcclxuXHRcdHJldHVybiBuZXcgVFdFRU4uVHdlZW4ob2JqLnBvc2l0aW9uKVxyXG5cdFx0XHQudG8oe3k6IG9iai5wb3NpdGlvbi55LWFtcGxpdHVkZX0sIHBlcmlvZClcclxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuU2ludXNvaWRhbC5Jbk91dClcclxuXHRcdFx0LnJlcGVhdChJbmZpbml0eSlcclxuXHRcdFx0LnlveW8odHJ1ZSlcclxuXHRcdFx0LnN0YXJ0KCk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgc3BpbihvYmosIHBlcmlvZCA9IDEwMDAwKVxyXG5cdHtcclxuXHRcdHJldHVybiBuZXcgUXVhdGVybmlvblR3ZWVuKG9iai5xdWF0ZXJuaW9uKVxyXG5cdFx0XHQudG8oc3BpblBvaW50cywgcGVyaW9kKVxyXG5cdFx0XHQucmVwZWF0KEluZmluaXR5KVxyXG5cdFx0XHQuc3RhcnQoKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyB3aW5rSW4ob2JqLCBkdXJhdGlvbiA9IDIwMClcclxuXHR7XHJcblx0XHRpZighb2JqLnVzZXJEYXRhLnNjYWxlT3JpZylcclxuXHRcdFx0b2JqLnVzZXJEYXRhLnNjYWxlT3JpZyA9IG9iai5zY2FsZS5jbG9uZSgpO1xyXG5cclxuXHRcdGxldCBhbmltcyA9IFtdO1xyXG5cclxuXHRcdG9iai5zY2FsZS5zZXRTY2FsYXIoLjAwMSk7XHJcblx0XHRvYmoudmlzaWJsZSA9IHRydWU7XHJcblxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4ob2JqLnNjYWxlKVxyXG5cdFx0XHQudG8oe3k6IG9iai51c2VyRGF0YS5zY2FsZU9yaWcueX0sIGR1cmF0aW9uKVxyXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5DdWJpYy5JbilcclxuXHRcdCk7XHJcblxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4ob2JqLnNjYWxlKVxyXG5cdFx0XHQudG8oe3g6IG9iai51c2VyRGF0YS5zY2FsZU9yaWcueCwgejogb2JqLnVzZXJEYXRhLnNjYWxlT3JpZy56fSwgLjIqZHVyYXRpb24pXHJcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLkN1YmljLkluKVxyXG5cdFx0KTtcclxuXHJcblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKGFuaW1zKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyB3aW5rT3V0KG9iaiwgZHVyYXRpb24gPSAyMDApXHJcblx0e1xyXG5cdFx0aWYoIW9iai51c2VyRGF0YS5zY2FsZU9yaWcpXHJcblx0XHRcdG9iai51c2VyRGF0YS5zY2FsZU9yaWcgPSBvYmouc2NhbGUuY2xvbmUoKTtcclxuXHJcblx0XHRsZXQgYW5pbXMgPSBbXTtcclxuXHRcdG9iai52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4ob2JqLnNjYWxlKVxyXG5cdFx0XHQudG8oe3k6IC4wMDF9LCBkdXJhdGlvbilcclxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuQ3ViaWMuT3V0KVxyXG5cdFx0KTtcclxuXHJcblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihvYmouc2NhbGUpXHJcblx0XHRcdC50byh7eDogLjAwMSwgejogLjAwMX0sIC4yKmR1cmF0aW9uKVxyXG5cdFx0XHQuZGVsYXkoLjgqZHVyYXRpb24pXHJcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLkN1YmljLk91dClcclxuXHRcdFx0Lm9uQ29tcGxldGUoKCkgPT4geyBvYmoudmlzaWJsZSA9IGZhbHNlOyB9KVxyXG5cdFx0KTtcclxuXHJcblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKGFuaW1zKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBzd2luZ0luKG9iaiwgcm90YXRpb249TWF0aC5QSS8yLCByYWRpdXM9MC41LCBkdXJhdGlvbj0zMDApXHJcblx0e1xyXG5cdFx0aWYoIW9iai51c2VyRGF0YS50cmFuc2Zvcm0pXHJcblx0XHRcdG9iai51c2VyRGF0YS50cmFuc2Zvcm0gPSB7XHJcblx0XHRcdFx0cm90YXRpb246IG9iai5yb3RhdGlvbi54LFxyXG5cdFx0XHRcdHBvc2l0aW9uOiBvYmoucG9zaXRpb24uY2xvbmUoKVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdC8vIHB1dCBhdCBzdGFydCBwb3NpdGlvblxyXG5cdFx0b2JqLnRyYW5zbGF0ZVkoLXJhZGl1cyk7XHJcblx0XHRvYmoucm90YXRpb24ueCA9IG9iai51c2VyRGF0YS50cmFuc2Zvcm0ucm90YXRpb24gKyByb3RhdGlvbjtcclxuXHRcdG9iai50cmFuc2xhdGVZKHJhZGl1cyk7XHJcblxyXG5cdFx0bGV0IGFuaW0gPSBuZXcgVFdFRU4uVHdlZW4oe3Q6MX0pXHJcblx0XHRcdC50byh7dDogMH0sIGR1cmF0aW9uKVxyXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5Cb3VuY2UuT3V0KVxyXG5cdFx0XHQub25VcGRhdGUoKHt0fSkgPT4ge1xyXG5cdFx0XHRcdG9iai50cmFuc2xhdGVZKC1yYWRpdXMpO1xyXG5cdFx0XHRcdG9iai5yb3RhdGlvbi54ID0gb2JqLnVzZXJEYXRhLnRyYW5zZm9ybS5yb3RhdGlvbiArIHQqcm90YXRpb247XHJcblx0XHRcdFx0b2JqLnRyYW5zbGF0ZVkocmFkaXVzKTtcclxuXHRcdFx0fSlcclxuXHRcdFx0Lm9uU3RvcCgoKSA9PiB7XHJcblx0XHRcdFx0b2JqLnRyYW5zbGF0ZVkoLXJhZGl1cyk7XHJcblx0XHRcdFx0b2JqLnJvdGF0aW9uLnggPSBvYmoudXNlckRhdGEudHJhbnNmb3JtLnJvdGF0aW9uICsgcm90YXRpb247XHJcblx0XHRcdFx0b2JqLnRyYW5zbGF0ZVkocmFkaXVzKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhbYW5pbV0pO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIHN3aW5nT3V0KG9iaiwgcm90YXRpb249TWF0aC5QSS8yLCByYWRpdXM9MC41LCBkdXJhdGlvbj0zMDApXHJcblx0e1xyXG5cdFx0aWYoIW9iai51c2VyRGF0YS50cmFuc2Zvcm0pXHJcblx0XHRcdG9iai51c2VyRGF0YS50cmFuc2Zvcm0gPSB7XHJcblx0XHRcdFx0cm90YXRpb246IG9iai5yb3RhdGlvbi54LFxyXG5cdFx0XHRcdHBvc2l0aW9uOiBvYmoucG9zaXRpb24uY2xvbmUoKVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdG9iai5yb3RhdGlvbi54ID0gb2JqLnVzZXJEYXRhLnRyYW5zZm9ybS5yb3RhdGlvbjtcclxuXHRcdG9iai5wb3NpdGlvbi5jb3B5KG9iai51c2VyRGF0YS50cmFuc2Zvcm0ucG9zaXRpb24pO1xyXG5cclxuXHRcdGxldCBhbmltID0gbmV3IFRXRUVOLlR3ZWVuKHt0OjB9KVxyXG5cdFx0XHQudG8oe3Q6IDF9LCBkdXJhdGlvbilcclxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLkluKVxyXG5cdFx0XHQub25VcGRhdGUoKHt0fSkgPT4ge1xyXG5cdFx0XHRcdG9iai50cmFuc2xhdGVZKC1yYWRpdXMpO1xyXG5cdFx0XHRcdG9iai5yb3RhdGlvbi54ID0gb2JqLnVzZXJEYXRhLnRyYW5zZm9ybS5yb3RhdGlvbiArIHQqcm90YXRpb247XHJcblx0XHRcdFx0b2JqLnRyYW5zbGF0ZVkocmFkaXVzKTtcclxuXHRcdFx0fSlcclxuXHRcdFx0Lm9uU3RvcCgoKSA9PiB7XHJcblx0XHRcdFx0b2JqLnJvdGF0aW9uLnggPSBvYmoudXNlckRhdGEudHJhbnNmb3JtLnJvdGF0aW9uO1xyXG5cdFx0XHRcdG9iai5wb3NpdGlvbi5jb3B5KG9iai51c2VyRGF0YS50cmFuc2Zvcm0ucG9zaXRpb24pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKFthbmltXSk7XHJcblx0fVxyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuLy8gZW51bSBjb25zdGFudHNcclxubGV0IFR5cGVzID0gT2JqZWN0LmZyZWV6ZSh7XHJcblx0UE9MSUNZX0xJQkVSQUw6IDAsXHJcblx0UE9MSUNZX0ZBU0NJU1Q6IDEsXHJcblx0Uk9MRV9MSUJFUkFMOiAyLFxyXG5cdFJPTEVfRkFTQ0lTVDogMyxcclxuXHRST0xFX0hJVExFUjogNCxcclxuXHRQQVJUWV9MSUJFUkFMOiA1LFxyXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXHJcblx0SkE6IDcsXHJcblx0TkVJTjogOCxcclxuXHRCTEFOSzogOSxcclxuXHRDUkVESVRTOiAxMCxcclxuXHRWRVRPOiAxMVxyXG59KTtcclxuXHJcbmxldCBnZW9tZXRyeSA9IG51bGwsIG1hdGVyaWFsID0gbnVsbDtcclxuXHJcbmZ1bmN0aW9uIGluaXRDYXJkRGF0YSgpXHJcbntcclxuXHRsZXQgZmxvYXREYXRhID0gW1xyXG5cdFx0Ly8gcG9zaXRpb24gKHBvcnRyYWl0KVxyXG5cdFx0MC4zNTc1LCAwLjUsIDAuMDAwNSxcclxuXHRcdC0uMzU3NSwgMC41LCAwLjAwMDUsXHJcblx0XHQtLjM1NzUsIC0uNSwgMC4wMDA1LFxyXG5cdFx0MC4zNTc1LCAtLjUsIDAuMDAwNSxcclxuXHRcdDAuMzU3NSwgMC41LCAtLjAwMDUsXHJcblx0XHQtLjM1NzUsIDAuNSwgLS4wMDA1LFxyXG5cdFx0LS4zNTc1LCAtLjUsIC0uMDAwNSxcclxuXHRcdDAuMzU3NSwgLS41LCAtLjAwMDUsXHJcblx0XHJcblx0XHQvLyBwb3NpdGlvbiAobGFuZHNjYXBlKVxyXG5cdFx0MC41LCAtLjM1NzUsIDAuMDAwNSxcclxuXHRcdDAuNSwgMC4zNTc1LCAwLjAwMDUsXHJcblx0XHQtLjUsIDAuMzU3NSwgMC4wMDA1LFxyXG5cdFx0LS41LCAtLjM1NzUsIDAuMDAwNSxcclxuXHRcdDAuNSwgLS4zNTc1LCAtLjAwMDUsXHJcblx0XHQwLjUsIDAuMzU3NSwgLS4wMDA1LFxyXG5cdFx0LS41LCAwLjM1NzUsIC0uMDAwNSxcclxuXHRcdC0uNSwgLS4zNTc1LCAtLjAwMDUsXHJcblx0XHJcblx0XHQvLyBVVnNcclxuXHRcdC8qIC0tLS0tLS0tLS0tLS0tIGNhcmQgZmFjZSAtLS0tLS0tLS0tLS0tICovIC8qIC0tLS0tLS0tLS0tLS0gY2FyZCBiYWNrIC0tLS0tLS0tLS0tLS0tKi9cclxuXHRcdC43NTQsLjk5NiwgLjc1NCwuODM0LCAuOTk3LC44MzQsIC45OTcsLjk5NiwgLjc1NCwuODM0LCAuNzU0LC45OTYsIC45OTcsLjk5NiwgLjk5NywuODM0LCAvLyBsaWJlcmFsIHBvbGljeVxyXG5cdFx0Ljc1NCwuODIyLCAuNzU0LC42NjAsIC45OTYsLjY2MCwgLjk5NiwuODIyLCAuNzU0LC42NjAsIC43NTQsLjgyMiwgLjk5NiwuODIyLCAuOTk2LC42NjAsIC8vIGZhc2Npc3QgcG9saWN5XHJcblx0XHQuNzQ2LC45OTYsIC41MDUsLjk5NiwgLjUwNSwuNjUwLCAuNzQ2LC42NTAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbGliZXJhbCByb2xlXHJcblx0XHQuNzQ2LC42NDUsIC41MDUsLjY0NSwgLjUwNSwuMzAwLCAuNzQ2LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gZmFzY2lzdCByb2xlXHJcblx0XHQuOTk2LC42NDUsIC43NTQsLjY0NSwgLjc1NCwuMzAwLCAuOTk2LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gaGl0bGVyIHJvbGVcclxuXHRcdC40OTUsLjk5NiwgLjI1NSwuOTk2LCAuMjU1LC42NTAsIC40OTUsLjY1MCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBsaWJlcmFsIHBhcnR5XHJcblx0XHQuNDk1LC42NDUsIC4yNTUsLjY0NSwgLjI1NSwuMzAwLCAuNDk1LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gZmFzY2lzdCBwYXJ0eVxyXG5cdFx0LjI0NCwuOTkyLCAuMDA1LC45OTIsIC4wMDUsLjY1MywgLjI0NCwuNjUzLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGphXHJcblx0XHQuMjQzLC42NDIsIC4wMDYsLjY0MiwgLjAwNiwuMzAyLCAuMjQzLC4zMDIsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbmVpblxyXG5cdFx0LjAyMSwuMjY5LCAuMDIxLC4wMjIsIC4zNzUsLjAyMiwgLjM3NSwuMjY5LCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGJsYW5rXHJcblx0XHQuMzk3LC4yNzYsIC4zOTcsLjAxNSwgLjc2NSwuMDE1LCAuNzY1LC4yNzYsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gY3JlZGl0c1xyXG5cdFx0Ljk2MywuMjcwLCAuODA0LC4yNzAsIC44MDQsLjAyOSwgLjk2MywuMDI5LCAuODA0LC4yNzAsIC45NjMsLjI3MCwgLjk2MywuMDI5LCAuODA0LC4wMjksIC8vIHZldG9cclxuXHJcblx0XTtcclxuXHRcclxuXHRsZXQgaW50RGF0YSA9IFtcclxuXHRcdC8vIHRyaWFuZ2xlIGluZGV4XHJcblx0XHQwLDEsMiwgMCwyLDMsIDQsNyw1LCA1LDcsNlxyXG5cdF07XHJcblx0XHJcblx0Ly8gdHdvIHBvc2l0aW9uIHNldHMsIDExIFVWIHNldHMsIDEgaW5kZXggc2V0XHJcblx0bGV0IGdlb0J1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcig0KmZsb2F0RGF0YS5sZW5ndGggKyAyKmludERhdGEubGVuZ3RoKTtcclxuXHRsZXQgdGVtcCA9IG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCAwLCBmbG9hdERhdGEubGVuZ3RoKTtcclxuXHR0ZW1wLnNldChmbG9hdERhdGEpO1xyXG5cdHRlbXAgPSBuZXcgVWludDE2QXJyYXkoZ2VvQnVmZmVyLCA0KmZsb2F0RGF0YS5sZW5ndGgsIGludERhdGEubGVuZ3RoKTtcclxuXHR0ZW1wLnNldChpbnREYXRhKTtcclxuXHRcclxuXHQvLyBjaG9wIHVwIGJ1ZmZlciBpbnRvIHZlcnRleCBhdHRyaWJ1dGVzXHJcblx0bGV0IHBvc0xlbmd0aCA9IDgqMywgdXZMZW5ndGggPSA4KjIsIGluZGV4TGVuZ3RoID0gMTI7XHJcblx0bGV0IHBvc1BvcnRyYWl0ID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgMCwgcG9zTGVuZ3RoKSwgMyksXHJcblx0XHRwb3NMYW5kc2NhcGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCA0KnBvc0xlbmd0aCwgcG9zTGVuZ3RoKSwgMyk7XHJcblx0bGV0IHV2cyA9IFtdO1xyXG5cdGZvcihsZXQgaT0wOyBpPDEyOyBpKyspe1xyXG5cdFx0dXZzLnB1c2goIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDgqcG9zTGVuZ3RoICsgNCppKnV2TGVuZ3RoLCB1dkxlbmd0aCksIDIpICk7XHJcblx0fVxyXG5cdGxldCBpbmRleCA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IFVpbnQxNkFycmF5KGdlb0J1ZmZlciwgNCpmbG9hdERhdGEubGVuZ3RoLCBpbmRleExlbmd0aCksIDEpO1xyXG5cdFxyXG5cdGdlb21ldHJ5ID0gT2JqZWN0LmtleXMoVHlwZXMpLm1hcCgoa2V5LCBpKSA9PlxyXG5cdHtcclxuXHRcdGxldCBnZW8gPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcclxuXHRcdGdlby5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgaT09VHlwZXMuSkEgfHwgaT09VHlwZXMuTkVJTiA/IHBvc0xhbmRzY2FwZSA6IHBvc1BvcnRyYWl0KTtcclxuXHRcdGdlby5hZGRBdHRyaWJ1dGUoJ3V2JywgdXZzW2ldKTtcclxuXHRcdGdlby5zZXRJbmRleChpbmRleCk7XHJcblx0XHRyZXR1cm4gZ2VvO1xyXG5cdH0pO1xyXG5cclxuXHRtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KTtcclxufVxyXG5cclxuXHJcbmNsYXNzIENhcmQgZXh0ZW5kcyBUSFJFRS5NZXNoXHJcbntcclxuXHRjb25zdHJ1Y3Rvcih0eXBlID0gVHlwZXMuQkxBTkspXHJcblx0e1xyXG5cdFx0aWYoIWdlb21ldHJ5IHx8ICFtYXRlcmlhbCkgaW5pdENhcmREYXRhKCk7XHJcblxyXG5cdFx0bGV0IGdlbyA9IGdlb21ldHJ5W3R5cGVdO1xyXG5cdFx0c3VwZXIoZ2VvLCBtYXRlcmlhbCk7XHJcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjcpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgQmxhbmtDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXsgc3VwZXIoKTsgfVxyXG59XHJcblxyXG5jbGFzcyBDcmVkaXRzQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5DUkVESVRTKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIExpYmVyYWxQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlBPTElDWV9MSUJFUkFMLCBmYWxzZSk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0UG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfRkFTQ0lTVCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBWZXRvQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5WRVRPKTtcclxuXHR9XHJcbn1cclxuY2xhc3MgTGliZXJhbFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlJPTEVfTElCRVJBTCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0Um9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9GQVNDSVNUKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIEhpdGxlclJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlJPTEVfSElUTEVSKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIExpYmVyYWxQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfTElCRVJBTCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0UGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0ZBU0NJU1QpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgSmFDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLkpBKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5laW5DYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLk5FSU4pO1xyXG5cdH1cclxufVxyXG5cclxuXHJcbmV4cG9ydCB7XHJcblx0Q2FyZCwgVHlwZXMsIEJsYW5rQ2FyZCwgQ3JlZGl0c0NhcmQsIFZldG9DYXJkLFxyXG5cdExpYmVyYWxQb2xpY3lDYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgTGliZXJhbFJvbGVDYXJkLCBGYXNjaXN0Um9sZUNhcmQsXHJcblx0SGl0bGVyUm9sZUNhcmQsIExpYmVyYWxQYXJ0eUNhcmQsIEZhc2Npc3RQYXJ0eUNhcmQsIEphQ2FyZCwgTmVpbkNhcmRcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcclxuaW1wb3J0IHtMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIFZldG9DYXJkfSBmcm9tICcuL2NhcmQnO1xyXG5cclxubGV0IExpYmVyYWxTcG90cyA9IHtcclxuXHRwb3NpdGlvbnM6IFtcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuNjkwLCAwLjAwMSwgLTAuNDIpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC4zNDUsIDAuMDAxLCAtMC40MiksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjAwMiwgMC4wMDEsIC0wLjQyKSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uMzQwLCAwLjAwMSwgLTAuNDIpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoLS42OTAsIDAuMDAxLCAtMC40MilcclxuXHRdLFxyXG5cdHF1YXRlcm5pb246IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMC43MDcxMDY3ODExODY1NDc1LCAwKSxcclxuXHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMC40LCAwLjQsIDAuNClcclxufSxcclxuRmFzY2lzdFNwb3RzID0ge1xyXG5cdHBvc2l0aW9uczogW1xyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoLS44NjAsIDAuMDAxLCAuNDI1KSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uNTE1LCAwLjAwMSwgLjQyNSksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjE3MCwgMC4wMDEsIC40MjUpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC4xNzAsIDAuMDAxLCAuNDI1KSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuNTE4LCAwLjAwMSwgLjQyNSksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjg3MCwgMC4wMDEsIC40MjUpLFx0XHJcblx0XSxcclxuXHRxdWF0ZXJuaW9uOiBuZXcgVEhSRUUuUXVhdGVybmlvbigtMC43MDcxMDY3ODExODY1NDc1LCAwLCAwLCAwLjcwNzEwNjc4MTE4NjU0NzUpLFxyXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjQsIDAuNCwgMC40KVxyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR2FtZVRhYmxlIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdC8vIHRhYmxlIHN0YXRlXHJcblx0XHR0aGlzLmxpYmVyYWxDYXJkcyA9IDA7XHJcblx0XHR0aGlzLmZhc2Npc3RDYXJkcyA9IDA7XHJcblx0XHR0aGlzLmNhcmRzID0gW107XHJcblxyXG5cdFx0dGhpcy52ZXRvQ2FyZCA9IG5ldyBWZXRvQ2FyZCgpO1xyXG5cdFx0dGhpcy52ZXRvQ2FyZC5zY2FsZS5zZXRTY2FsYXIoLjUpO1xyXG5cdFx0dGhpcy52ZXRvQ2FyZC52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLnZldG9DYXJkLm1hdGVyaWFsLnRyYW5zcGFyZW50ID0gdHJ1ZTtcclxuXHRcdHRoaXMuYWRkKHRoaXMudmV0b0NhcmQpO1xyXG5cclxuXHRcdC8vIGFkZCB0YWJsZSBhc3NldFxyXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50YWJsZTtcclxuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XHJcblxyXG5cdFx0Ly8gc2F2ZSByZWZlcmVuY2VzIHRvIHRoZSB0ZXh0dXJlc1xyXG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtcclxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfc21hbGwsXHJcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX21lZCxcclxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbGFyZ2VcclxuXHRcdF07XHJcblx0XHR0aGlzLnRleHR1cmVzLmZvckVhY2godGV4ID0+IHRleC5mbGlwWSA9IGZhbHNlKTtcclxuXHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzBdLCB0cnVlKTtcclxuXHRcdFxyXG5cdFx0Ly8gcG9zaXRpb24gdGFibGVcclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDEuMCwgMCk7XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMuY2hhbmdlTW9kZS5iaW5kKHRoaXMpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9saWJlcmFsUG9saWNpZXMnLCB0aGlzLnVwZGF0ZVBvbGljaWVzLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2Zhc2Npc3RQb2xpY2llcycsIHRoaXMudXBkYXRlUG9saWNpZXMuYmluZCh0aGlzKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfZmFpbGVkVm90ZXMnLCB0aGlzLnVwZGF0ZVBvbGljaWVzLmJpbmQodGhpcykpO1xyXG5cdH1cclxuXHJcblx0Y2hhbmdlTW9kZSh7ZGF0YToge2dhbWU6IHtzdGF0ZSwgdHVybk9yZGVyfX19KVxyXG5cdHtcclxuXHRcdGlmKHR1cm5PcmRlci5sZW5ndGggPj0gOSlcclxuXHRcdFx0dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbMl0pO1xyXG5cdFx0ZWxzZSBpZih0dXJuT3JkZXIubGVuZ3RoID49IDcpXHJcblx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzFdKTtcclxuXHRcdGVsc2VcclxuXHRcdFx0dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbMF0pO1xyXG5cdH1cclxuXHJcblx0c2V0VGV4dHVyZShuZXdUZXgsIHN3aXRjaExpZ2h0bWFwKVxyXG5cdHtcclxuXHRcdHRoaXMubW9kZWwudHJhdmVyc2UobyA9PiB7XHJcblx0XHRcdGlmKG8gaW5zdGFuY2VvZiBUSFJFRS5NZXNoKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWYoc3dpdGNoTGlnaHRtYXApXHJcblx0XHRcdFx0XHRvLm1hdGVyaWFsLmxpZ2h0TWFwID0gby5tYXRlcmlhbC5tYXA7XHJcblxyXG5cdFx0XHRcdG8ubWF0ZXJpYWwubWFwID0gbmV3VGV4O1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZVBvbGljaWVzKHtkYXRhOiB7Z2FtZToge2xpYmVyYWxQb2xpY2llcywgZmFzY2lzdFBvbGljaWVzLCBoYW5kLCBzdGF0ZX19fSlcclxuXHR7XHJcblx0XHRsZXQgdXBkYXRlcyA9IFtdO1xyXG5cclxuXHRcdC8vIHF1ZXVlIHVwIGNhcmRzIHRvIGJlIGFkZGVkIHRvIHRoZSB0YWJsZSB0aGlzIHVwZGF0ZVxyXG5cdFx0Zm9yKHZhciBpPXRoaXMubGliZXJhbENhcmRzOyBpPGxpYmVyYWxQb2xpY2llczsgaSsrKXtcclxuXHRcdFx0bGV0IGNhcmQgPSBuZXcgTGliZXJhbFBvbGljeUNhcmQoKTtcclxuXHRcdFx0Y2FyZC5hbmltYXRlID0gKCkgPT4gQW5pbWF0ZS5zaW1wbGUoY2FyZCwge1xyXG5cdFx0XHRcdHBvczogTGliZXJhbFNwb3RzLnBvc2l0aW9uc1tpXSxcclxuXHRcdFx0XHRxdWF0OiBMaWJlcmFsU3BvdHMucXVhdGVybmlvbixcclxuXHRcdFx0XHRzY2FsZTogTGliZXJhbFNwb3RzLnNjYWxlXHJcblx0XHRcdH0pLnRoZW4oKCkgPT4gQW5pbWF0ZS53YWl0KDUwMCkpO1xyXG5cdFx0XHRjYXJkLnBsYXlTb3VuZCA9ICgpID0+IFNILmF1ZGlvLmxpYmVyYWxTdGluZy5sb2FkZWQudGhlbigoKSA9PiBTSC5hdWRpby5saWJlcmFsU3RpbmcucGxheSgpKTtcclxuXHRcdFx0dXBkYXRlcy5wdXNoKGNhcmQpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRmb3IodmFyIGk9dGhpcy5mYXNjaXN0Q2FyZHM7IGk8ZmFzY2lzdFBvbGljaWVzOyBpKyspe1xyXG5cdFx0XHRsZXQgY2FyZCA9IG5ldyBGYXNjaXN0UG9saWN5Q2FyZCgpO1xyXG5cdFx0XHRjYXJkLmFuaW1hdGUgPSAoKSA9PiBBbmltYXRlLnNpbXBsZShjYXJkLCB7XHJcblx0XHRcdFx0cG9zOiBGYXNjaXN0U3BvdHMucG9zaXRpb25zW2ldLFxyXG5cdFx0XHRcdHF1YXQ6IEZhc2Npc3RTcG90cy5xdWF0ZXJuaW9uLFxyXG5cdFx0XHRcdHNjYWxlOiBGYXNjaXN0U3BvdHMuc2NhbGVcclxuXHRcdFx0fSk7XHJcblx0XHRcdGNhcmQucGxheVNvdW5kID0gKCkgPT4gU0guYXVkaW8uZmFzY2lzdFN0aW5nLmxvYWRlZC50aGVuKCgpID0+IFNILmF1ZGlvLmZhc2Npc3RTdGluZy5wbGF5KCkpO1xyXG5cdFx0XHR1cGRhdGVzLnB1c2goY2FyZCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoc3RhdGUgPT09ICdhZnRlcm1hdGgnICYmIGhhbmQgPT09IDEpe1xyXG5cdFx0XHR1cGRhdGVzLnB1c2godGhpcy52ZXRvQ2FyZCk7XHJcblx0XHR9XHJcblxyXG5cdFx0bGV0IGFuaW1hdGlvbiA9IG51bGw7XHJcblx0XHRpZih1cGRhdGVzLmxlbmd0aCA9PT0gMSlcclxuXHRcdHtcclxuXHRcdFx0bGV0IGNhcmQgPSB1cGRhdGVzWzBdO1xyXG5cdFx0XHRpZihjYXJkID09PSB0aGlzLnZldG9DYXJkKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2FyZC52aXNpYmxlID0gdHJ1ZTsgY2FyZC5tYXRlcmlhbC5vcGFjaXR5ID0gMTtcclxuXHRcdFx0XHRhbmltYXRpb24gPSBBbmltYXRlLmNhcmRGbG91cmlzaChjYXJkKVxyXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4gQW5pbWF0ZS52YW5pc2goY2FyZCkpXHJcblx0XHRcdFx0XHQudGhlbigoKSA9PiB7IGNhcmQudmlzaWJsZSA9IGZhbHNlOyB9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0aGlzLmFkZChjYXJkKTtcclxuXHRcdFx0XHR0aGlzLmNhcmRzLnB1c2goY2FyZCk7XHJcblx0XHRcdFx0Y2FyZC5wbGF5U291bmQoKTtcclxuXHRcdFx0XHRhbmltYXRpb24gPSBBbmltYXRlLmNhcmRGbG91cmlzaChjYXJkKVxyXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4gY2FyZC5hbmltYXRlKCkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRlbHNlXHJcblx0XHR7XHJcblx0XHRcdC8vIHBsYWNlIG9uIHRoZWlyIHNwb3RzXHJcblx0XHRcdHVwZGF0ZXMuZm9yRWFjaChjYXJkID0+IHtcclxuXHRcdFx0XHR0aGlzLmFkZChjYXJkKTtcclxuXHRcdFx0XHR0aGlzLmNhcmRzLnB1c2goY2FyZCk7XHJcblx0XHRcdFx0Y2FyZC5hbmltYXRlKCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0YW5pbWF0aW9uID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoc3RhdGUgPT09ICdhZnRlcm1hdGgnKXtcclxuXHRcdFx0YW5pbWF0aW9uLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdFNILmRpc3BhdGNoRXZlbnQoe1xyXG5cdFx0XHRcdFx0dHlwZTogJ3BvbGljeUFuaW1Eb25lJyxcclxuXHRcdFx0XHRcdGJ1YmJsZXM6IGZhbHNlXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKGxpYmVyYWxQb2xpY2llcyA9PT0gMCAmJiBmYXNjaXN0UG9saWNpZXMgPT09IDApe1xyXG5cdFx0XHR0aGlzLmNhcmRzLmZvckVhY2goYyA9PiB0aGlzLnJlbW92ZShjKSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5saWJlcmFsQ2FyZHMgPSBsaWJlcmFsUG9saWNpZXM7XHJcblx0XHR0aGlzLmZhc2Npc3RDYXJkcyA9IGZhc2Npc3RQb2xpY2llcztcclxuXHR9XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcblxyXG5mdW5jdGlvbiBnZXRHYW1lSWQoKVxyXG57XHJcblx0Ly8gZmlyc3QgY2hlY2sgdGhlIHVybFxyXG5cdGxldCByZSA9IC9bPyZdZ2FtZUlkPShbXiZdKykvLmV4ZWMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XHJcblx0aWYocmUpe1xyXG5cdFx0cmV0dXJuIHJlWzFdO1xyXG5cdH1cclxuXHRlbHNlIGlmKGFsdHNwYWNlICYmIGFsdHNwYWNlLmluQ2xpZW50KXtcclxuXHRcdHJldHVybiBTSC5lbnYuc2lkO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdGxldCBpZCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDAgKTtcclxuXHRcdHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKCc/Z2FtZUlkPScraWQpO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGFyc2VDU1Yoc3RyKXtcclxuXHRpZighc3RyKSByZXR1cm4gW107XHJcblx0ZWxzZSByZXR1cm4gc3RyLnNwbGl0KCcsJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUXVlc3Rpb24odGV4dCwgdGV4dHVyZSA9IG51bGwpXHJcbntcclxuXHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XHJcblxyXG5cdC8vIHNldCB1cCBjYW52YXNcclxuXHRsZXQgYm1wO1xyXG5cdGlmKCF0ZXh0dXJlKXtcclxuXHRcdGJtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xyXG5cdFx0Ym1wLndpZHRoID0gNTEyO1xyXG5cdFx0Ym1wLmhlaWdodCA9IDI1NjtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRibXAgPSB0ZXh0dXJlLmltYWdlO1xyXG5cdH1cclxuXHJcblx0bGV0IGcgPSBibXAuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHRnLmNsZWFyUmVjdCgwLCAwLCA1MTIsIDI1Nik7XHJcblx0Zy50ZXh0QWxpZ24gPSAnY2VudGVyJztcclxuXHRnLmZpbGxTdHlsZSA9ICdibGFjayc7XHJcblxyXG5cdC8vIHdyaXRlIHRleHRcclxuXHRnLmZvbnQgPSAnYm9sZCA1MHB4ICcrZm9udFN0YWNrO1xyXG5cdGxldCBsaW5lcyA9IHRleHQuc3BsaXQoJ1xcbicpO1xyXG5cdGZvcihsZXQgaT0wOyBpPGxpbmVzLmxlbmd0aDsgaSsrKXtcclxuXHRcdGcuZmlsbFRleHQobGluZXNbaV0sIDI1NiwgNTArNTUqaSk7XHJcblx0fVxyXG5cclxuXHRpZih0ZXh0dXJlKXtcclxuXHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdFx0cmV0dXJuIHRleHR1cmU7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0cmV0dXJuIG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKGJtcCk7XHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiBtZXJnZU9iamVjdHMoYSwgYiwgZGVwdGg9Milcclxue1xyXG5cdGZ1bmN0aW9uIHVuaXF1ZShlLCBpLCBhKXtcclxuXHRcdHJldHVybiBhLmluZGV4T2YoZSkgPT09IGk7XHJcblx0fVxyXG5cclxuXHRsZXQgYUlzT2JqID0gYSBpbnN0YW5jZW9mIE9iamVjdCwgYklzT2JqID0gYiBpbnN0YW5jZW9mIE9iamVjdDtcclxuXHRpZihhSXNPYmogJiYgYklzT2JqICYmIGRlcHRoID4gMClcclxuXHR7XHJcblx0XHRsZXQgcmVzdWx0ID0ge307XHJcblx0XHRsZXQga2V5cyA9IFsuLi5PYmplY3Qua2V5cyhhKSwgLi4uT2JqZWN0LmtleXMoYildLmZpbHRlcih1bmlxdWUpO1xyXG5cdFx0Zm9yKGxldCBpPTA7IGk8a2V5cy5sZW5ndGg7IGkrKyl7XHJcblx0XHRcdHJlc3VsdFtrZXlzW2ldXSA9IG1lcmdlT2JqZWN0cyhhW2tleXNbaV1dLCBiW2tleXNbaV1dLCBkZXB0aC0xKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblx0fVxyXG5cdGVsc2UgaWYoYiAhPT0gdW5kZWZpbmVkKVxyXG5cdFx0cmV0dXJuIGI7XHJcblx0ZWxzZVxyXG5cdFx0cmV0dXJuIGE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxhdGVVcGRhdGUoZm4pXHJcbntcclxuXHRyZXR1cm4gKC4uLmFyZ3MpID0+IHtcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4gZm4oLi4uYXJncyksIDE1KTtcclxuXHR9O1xyXG59XHJcblxyXG5leHBvcnQgeyBnZXRHYW1lSWQsIHBhcnNlQ1NWLCBnZW5lcmF0ZVF1ZXN0aW9uLCBtZXJnZU9iamVjdHMsIGxhdGVVcGRhdGUgfTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE5hbWVwbGF0ZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcihzZWF0KVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblxyXG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC0wLjYzNSwgMC4yMik7XHJcblx0XHRzZWF0LmFkZCh0aGlzKTtcclxuXHJcblx0XHQvLyBhZGQgM2QgbW9kZWxcclxuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMubmFtZXBsYXRlLmNoaWxkcmVuWzBdLmNsb25lKCk7XHJcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCBNYXRoLlBJLzIpO1xyXG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XHJcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcclxuXHJcblx0XHQvLyBnZW5lcmF0ZSBtYXRlcmlhbFxyXG5cdFx0dGhpcy5ibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuXHRcdHRoaXMuYm1wLndpZHRoID0gTmFtZXBsYXRlLnRleHR1cmVTaXplO1xyXG5cdFx0dGhpcy5ibXAuaGVpZ2h0ID0gTmFtZXBsYXRlLnRleHR1cmVTaXplIC8gMjtcclxuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xyXG5cdFx0XHRtYXA6IG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKHRoaXMuYm1wKVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gY3JlYXRlIGxpc3RlbmVyIHByb3hpZXNcclxuXHRcdHRoaXMuX2hvdmVyQmVoYXZpb3IgPSBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlckNvbG9yKHtcclxuXHRcdFx0Y29sb3I6IG5ldyBUSFJFRS5Db2xvcigweGZmYThhOClcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5tb2RlbC5hZGRCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcclxuXHRcdHRoaXMubW9kZWwuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLmNsaWNrLmJpbmQodGhpcykpO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xyXG5cdFx0XHRpZihzdGF0ZSA9PT0gJ3NldHVwJylcclxuXHRcdFx0XHR0aGlzLm1vZGVsLmFkZEJlaGF2aW9yKHRoaXMuX2hvdmVyQmVoYXZpb3IpO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0dGhpcy5tb2RlbC5yZW1vdmVCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlVGV4dCh0ZXh0KVxyXG5cdHtcclxuXHRcdGxldCBmb250U2l6ZSA9IDcvMzIgKiBOYW1lcGxhdGUudGV4dHVyZVNpemUgKiAwLjY1O1xyXG5cclxuXHRcdC8vIHNldCB1cCBjYW52YXNcclxuXHRcdGxldCBnID0gdGhpcy5ibXAuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHRcdGxldCBmb250U3RhY2sgPSAnXCJIZWx2ZXRpY2EgTmV1ZVwiLCBIZWx2ZXRpY2EsIEFyaWFsLCBTYW5zLVNlcmlmJztcclxuXHRcdGcuZmlsbFN0eWxlID0gJyMyMjInO1xyXG5cdFx0Zy5maWxsUmVjdCgwLCAwLCBOYW1lcGxhdGUudGV4dHVyZVNpemUsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yKTtcclxuXHRcdGcuZm9udCA9IGBib2xkICR7Zm9udFNpemV9cHggJHtmb250U3RhY2t9YDtcclxuXHRcdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcblx0XHRnLmZpbGxTdHlsZSA9ICd3aGl0ZSc7XHJcblx0XHRnLmZpbGxUZXh0KHRleHQsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yLCAoMC40MiAtIDAuMTIpKihOYW1lcGxhdGUudGV4dHVyZVNpemUvMikpO1xyXG5cclxuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwubWFwLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdGNsaWNrKGUpXHJcblx0e1xyXG5cdFx0aWYoU0guZ2FtZS5zdGF0ZSAhPT0gJ3NldHVwJykgcmV0dXJuO1xyXG5cclxuXHRcdGlmKCF0aGlzLnNlYXQub3duZXIpXHJcblx0XHRcdHRoaXMucmVxdWVzdEpvaW4oKTtcclxuXHRcdGVsc2UgaWYodGhpcy5zZWF0Lm93bmVyID09PSBTSC5sb2NhbFVzZXIuaWQpXHJcblx0XHRcdHRoaXMucmVxdWVzdExlYXZlKCk7XHJcblx0XHRlbHNlIGlmKFNILmdhbWUudHVybk9yZGVyLmluY2x1ZGVzKFNILmxvY2FsVXNlci5pZCkpXHJcblx0XHRcdHRoaXMucmVxdWVzdEtpY2soKTtcclxuXHR9XHJcblxyXG5cdHJlcXVlc3RKb2luKClcclxuXHR7XHJcblx0XHRTSC5zb2NrZXQuZW1pdCgnam9pbicsIE9iamVjdC5hc3NpZ24oe3NlYXROdW06IHRoaXMuc2VhdC5zZWF0TnVtfSwgU0gubG9jYWxVc2VyKSk7XHJcblx0fVxyXG5cclxuXHRyZXF1ZXN0TGVhdmUoKVxyXG5cdHtcclxuXHRcdGxldCBzZWxmID0gdGhpcztcclxuXHRcdGlmKCFzZWxmLnF1ZXN0aW9uKVxyXG5cdFx0e1xyXG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VsZi5zZWF0LmJhbGxvdC5hc2tRdWVzdGlvbignQXJlIHlvdSBzdXJlIHlvdVxcbndhbnQgdG8gbGVhdmU/JywgJ2xvY2FsX2xlYXZlJylcclxuXHRcdFx0LnRoZW4oY29uZmlybSA9PiB7XHJcblx0XHRcdFx0aWYoY29uZmlybSl7XHJcblx0XHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbGVhdmUnLCBTSC5sb2NhbFVzZXIuaWQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uID0gbnVsbDtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmVxdWVzdEtpY2soKVxyXG5cdHtcclxuXHRcdGxldCBzZWxmID0gdGhpcztcclxuXHRcdGlmKCFzZWxmLnF1ZXN0aW9uKVxyXG5cdFx0e1xyXG5cdFx0XHRsZXQgc2VhdCA9IFNILnNlYXRzW1NILnBsYXllcnNbU0gubG9jYWxVc2VyLmlkXS5zZWF0TnVtXTtcclxuXHRcdFx0c2VsZi5xdWVzdGlvbiA9IHNlYXQuYmFsbG90LmFza1F1ZXN0aW9uKFxyXG5cdFx0XHRcdCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byB0cnkgdG8ga2lja1xcbidcclxuXHRcdFx0XHQrU0gucGxheWVyc1tzZWxmLnNlYXQub3duZXJdLmRpc3BsYXlOYW1lLFxyXG5cdFx0XHRcdCdsb2NhbF9raWNrJ1xyXG5cdFx0XHQpXHJcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xyXG5cdFx0XHRcdGlmKGNvbmZpcm0pe1xyXG5cdFx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2tpY2snLCBTSC5sb2NhbFVzZXIuaWQsIHNlbGYuc2VhdC5vd25lcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHNlbGYucXVlc3Rpb24gPSBudWxsO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuY2F0Y2goKCkgPT4geyBzZWxmLnF1ZXN0aW9uID0gbnVsbDsgfSk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5OYW1lcGxhdGUudGV4dHVyZVNpemUgPSAyNTY7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCAqIGFzIEJhbGxvdFR5cGUgZnJvbSAnLi9iYWxsb3QnO1xyXG5pbXBvcnQge3RyYW5zbGF0ZSBhcyB0cn0gZnJvbSAnLi90aGVtZSc7XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVWb3Rlc0luUHJvZ3Jlc3Moe2RhdGE6IHtnYW1lLCBwbGF5ZXJzLCB2b3Rlc319KVxyXG57XHJcblx0bGV0IGJhbGxvdCA9IHRoaXM7XHJcblx0aWYoIWJhbGxvdC5zZWF0Lm93bmVyKSByZXR1cm47XHJcblxyXG5cdGxldCB2aXBzID0gZ2FtZS52b3Rlc0luUHJvZ3Jlc3M7XHJcblxyXG5cdC8vIHZvdGVzIHRoZSBzZWF0IG93bmVyIGNhbm5vdCBwYXJ0aWNpcGF0ZSBpbiAoYWxyZWFkeSB2b3RlZCBvciBibG9ja2VkKVxyXG5cdGxldCBibGFja2xpc3RlZFZvdGVzID0gdmlwcy5maWx0ZXIoaWQgPT4ge1xyXG5cdFx0bGV0IHZzID0gWy4uLnZvdGVzW2lkXS55ZXNWb3RlcnMsIC4uLnZvdGVzW2lkXS5ub1ZvdGVyc107XHJcblx0XHRsZXQgbnYgPSB2b3Rlc1tpZF0ubm9uVm90ZXJzO1xyXG5cdFx0cmV0dXJuIG52LmluY2x1ZGVzKGJhbGxvdC5zZWF0Lm93bmVyKSB8fCB2cy5pbmNsdWRlcyhiYWxsb3Quc2VhdC5vd25lcik7XHJcblx0fSk7XHJcblxyXG5cdC8vIHZvdGVzIGFkZGVkIHRoaXMgdXBkYXRlIHRoYXQgdGhlIHNlYXRlZCB1c2VyIGlzIGVsaWdpYmxlIGZvclxyXG5cdGxldCBuZXdWb3RlcyA9IHZpcHMuZmlsdGVyKFxyXG5cdFx0aWQgPT4gKCFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcyB8fCAhU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MuaW5jbHVkZXMoaWQpKSAmJiAhYmxhY2tsaXN0ZWRWb3Rlcy5pbmNsdWRlcyhpZClcclxuXHQpO1xyXG5cclxuXHQvLyB2b3RlcyBhbHJlYWR5IHBhcnRpY2lwYXRlZCBpbiwgcGx1cyBjb21wbGV0ZWQgdm90ZXNcclxuXHRsZXQgZmluaXNoZWRWb3RlcyA9ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcyA/IGJsYWNrbGlzdGVkVm90ZXNcclxuXHRcdDogU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MuZmlsdGVyKGlkID0+ICF2aXBzLmluY2x1ZGVzKGlkKSkuY29uY2F0KGJsYWNrbGlzdGVkVm90ZXMpO1xyXG5cclxuXHRuZXdWb3Rlcy5mb3JFYWNoKHZJZCA9PlxyXG5cdHtcclxuXHRcdC8vIGdlbmVyYXRlIG5ldyBxdWVzdGlvbiB0byBhc2tcclxuXHRcdGxldCBxdWVzdGlvblRleHQsIG9wdHMgPSB7fTtcclxuXHRcdGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2VsZWN0Jyl7XHJcblx0XHRcdHF1ZXN0aW9uVGV4dCA9IHBsYXllcnNbZ2FtZS5wcmVzaWRlbnRdLmRpc3BsYXlOYW1lXHJcblx0XHRcdFx0KyBgIGZvciAke3RyKCdwcmVzaWRlbnQnKX0gYW5kIGBcclxuXHRcdFx0XHQrIHBsYXllcnNbZ2FtZS5jaGFuY2VsbG9yXS5kaXNwbGF5TmFtZVxyXG5cdFx0XHRcdCsgYCBmb3IgJHt0cignY2hhbmNlbGxvcicpfT9gO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdqb2luJyl7XHJcblx0XHRcdHF1ZXN0aW9uVGV4dCA9IHZvdGVzW3ZJZF0uZGF0YSArICcgdG8gam9pbj8nO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdraWNrJyl7XHJcblx0XHRcdHF1ZXN0aW9uVGV4dCA9ICdWb3RlIHRvIGtpY2sgJ1xyXG5cdFx0XHRcdCsgcGxheWVyc1t2b3Rlc1t2SWRdLnRhcmdldDFdLmRpc3BsYXlOYW1lXHJcblx0XHRcdFx0KyAnPyc7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ3R1dG9yaWFsJyl7XHJcblx0XHRcdHF1ZXN0aW9uVGV4dCA9ICdQbGF5IHR1dG9yaWFsPyc7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2NvbmZpcm1Sb2xlJylcclxuXHRcdHtcclxuXHRcdFx0b3B0cy5jaG9pY2VzID0gQmFsbG90VHlwZS5DT05GSVJNO1xyXG5cdFx0XHRsZXQgcm9sZTtcclxuXHRcdFx0aWYoYmFsbG90LnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZCl7XHJcblx0XHRcdFx0cm9sZSA9IHBsYXllcnNbU0gubG9jYWxVc2VyLmlkXS5yb2xlO1xyXG5cdFx0XHRcdHJvbGUgPSB0cihyb2xlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcm9sZS5zbGljZSgxKSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0cm9sZSA9ICc8UkVEQUNURUQ+JztcclxuXHRcdFx0fVxyXG5cdFx0XHRxdWVzdGlvblRleHQgPSAnWW91ciByb2xlOlxcbicgKyByb2xlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHF1ZXN0aW9uVGV4dClcclxuXHRcdHtcclxuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKHF1ZXN0aW9uVGV4dCwgdklkLCBvcHRzKVxyXG5cdFx0XHQudGhlbihhbnN3ZXIgPT4ge1xyXG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCd2b3RlJywgdklkLCBTSC5sb2NhbFVzZXIuaWQsIGFuc3dlcik7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5jYXRjaCgoKSA9PiBjb25zb2xlLmxvZygnVm90ZSBzY3J1YmJlZDonLCB2SWQpKTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0aWYoZmluaXNoZWRWb3Rlcy5pbmNsdWRlcyhiYWxsb3QuZGlzcGxheWVkKSl7XHJcblx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlU3RhdGUoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXHJcbntcclxuXHRsZXQgYmFsbG90ID0gdGhpcztcclxuXHJcblx0ZnVuY3Rpb24gY2hvb3NlUGxheWVyKHF1ZXN0aW9uLCBjb25maXJtUXVlc3Rpb24sIGlkKVxyXG5cdHtcclxuXHRcdGZ1bmN0aW9uIGNvbmZpcm1QbGF5ZXIodXNlcklkKVxyXG5cdFx0e1xyXG5cdFx0XHRsZXQgdXNlcm5hbWUgPSBTSC5wbGF5ZXJzW3VzZXJJZF0uZGlzcGxheU5hbWU7XHJcblx0XHRcdGxldCB0ZXh0ID0gY29uZmlybVF1ZXN0aW9uLnJlcGxhY2UoJ3t9JywgdXNlcm5hbWUpO1xyXG5cdFx0XHRyZXR1cm4gYmFsbG90LmFza1F1ZXN0aW9uKHRleHQsICdsb2NhbF8nK2lkKydfY29uZmlybScpXHJcblx0XHRcdC50aGVuKGNvbmZpcm1lZCA9PiB7XHJcblx0XHRcdFx0aWYoY29uZmlybWVkKXtcclxuXHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodXNlcklkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gY2hvb3NlUGxheWVyKHF1ZXN0aW9uLCBjb25maXJtUXVlc3Rpb24sIGlkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBiYWxsb3QuYXNrUXVlc3Rpb24ocXVlc3Rpb24sICdsb2NhbF8nK2lkLCB7Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1R9KVxyXG5cdFx0LnRoZW4oY29uZmlybVBsYXllcik7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBoaWRlTm9taW5hdGVQbGFjZWhvbGRlcih7ZGF0YToge2dhbWV9fSlcclxuXHR7XHJcblx0XHRpZihnYW1lLnN0YXRlICE9PSAnbm9taW5hdGUnICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICd3YWl0X2Zvcl9jaGFuY2VsbG9yJyl7XHJcblx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XHJcblx0XHR9XHJcblx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlTm9taW5hdGVQbGFjZWhvbGRlcik7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBoaWRlUG9saWN5UGxhY2Vob2xkZXIoe2RhdGE6IHtnYW1lfX0pXHJcblx0e1xyXG5cdFx0aWYoZ2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTEnICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wb2xpY3kxJyB8fFxyXG5cdFx0XHRnYW1lLnN0YXRlICE9PSAncG9saWN5MicgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ2xvY2FsX3BvbGljeTInXHJcblx0XHQpe1xyXG5cdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdFx0fVxyXG5cdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZVBvbGljeVBsYWNlaG9sZGVyKTtcclxuXHR9XHJcblxyXG5cdGlmKGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxyXG5cdHtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xyXG5cdFx0XHRjaG9vc2VQbGF5ZXIoYENob29zZSB5b3VyICR7dHIoJ2NoYW5jZWxsb3InKX0hYCwgYE5hbWUge30gYXMgJHt0cignY2hhbmNlbGxvcicpfT9gLCAnbm9taW5hdGUnKVxyXG5cdFx0XHQudGhlbih1c2VySWQgPT4ge1xyXG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCdub21pbmF0ZScsIHVzZXJJZCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbihgQ2hvb3NlIHlvdXIgJHt0cignY2hhbmNlbGxvcicpfSFgLCAnd2FpdF9mb3JfY2hhbmNlbGxvcicsIHtcclxuXHRcdFx0XHRjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCxcclxuXHRcdFx0XHRmYWtlOiB0cnVlLFxyXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ25vbWluYXRlJ1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZU5vbWluYXRlUGxhY2Vob2xkZXIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdwb2xpY3kxJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0bGV0IG9wdHMgPSB7Y2hvaWNlczogQmFsbG90VHlwZS5QT0xJQ1ksIHBvbGljeUhhbmQ6IGdhbWUuaGFuZH07XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgIT09IGdhbWUucHJlc2lkZW50KXtcclxuXHRcdFx0T2JqZWN0LmFzc2lnbihvcHRzLCB7ZmFrZTogdHJ1ZSwgaXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAncG9saWN5MSd9KTtcclxuXHRcdH1cclxuXHJcblx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0Nob29zZSBvbmVcXG50byBkaXNjYXJkIScsICdsb2NhbF9wb2xpY3kxJywgb3B0cylcclxuXHRcdC50aGVuKGRpc2NhcmQgPT4ge1xyXG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnZGlzY2FyZF9wb2xpY3kxJywgZGlzY2FyZCk7XHJcblx0XHR9KTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVQb2xpY3lQbGFjZWhvbGRlcik7XHJcblx0fVxyXG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTInICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLmNoYW5jZWxsb3IpXHJcblx0e1xyXG5cdFx0bGV0IG9wdHMgPSB7XHJcblx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLFxyXG5cdFx0XHRwb2xpY3lIYW5kOiBnYW1lLmhhbmQsXHJcblx0XHRcdGluY2x1ZGVWZXRvOiBnYW1lLmZhc2Npc3RQb2xpY2llcyA9PT0gNSAmJiAhYmFsbG90LmJsb2NrVmV0b1xyXG5cdFx0fTtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCAhPT0gZ2FtZS5jaGFuY2VsbG9yKXtcclxuXHRcdFx0T2JqZWN0LmFzc2lnbihvcHRzLCB7ZmFrZTogdHJ1ZSwgaXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAncG9saWN5Mid9KTtcclxuXHRcdH1cclxuXHJcblx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0Nob29zZSBvbmVcXG50byBkaXNjYXJkIScsICdsb2NhbF9wb2xpY3kyJywgb3B0cylcclxuXHRcdC50aGVuKGRpc2NhcmQgPT4ge1xyXG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnZGlzY2FyZF9wb2xpY3kyJywgZGlzY2FyZCk7XHJcblx0XHR9LCBlcnIgPT4gY29uc29sZS5lcnJvcihlcnIpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVQb2xpY3lQbGFjZWhvbGRlcik7XHJcblx0fVxyXG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2ludmVzdGlnYXRlJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdGNob29zZVBsYXllcignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2Ugb25lIHBsYXllciB0byBpbnZlc3RpZ2F0ZSEnLCAnSW52ZXN0aWdhdGUge30/JywgJ2ludmVzdGlnYXRlJylcclxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcclxuXHRcdFx0XHRTSC5kaXNwYXRjaEV2ZW50KHtcclxuXHRcdFx0XHRcdHR5cGU6ICdpbnZlc3RpZ2F0ZScsXHJcblx0XHRcdFx0XHRkYXRhOiB1c2VySWRcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdFeGVjdXRpdmUgcG93ZXI6IENob29zZSBvbmUgcGxheWVyIHRvIGludmVzdGlnYXRlIScsICd3YWl0X2Zvcl9pbnZlc3RpZ2F0ZScsIHtcclxuXHRcdFx0XHRjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCxcclxuXHRcdFx0XHRmYWtlOiB0cnVlLFxyXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ2ludmVzdGlnYXRlJ1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0bGV0IGNsZWFuVXBGYWtlVm90ZSA9ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xyXG5cdFx0XHRcdGlmKHN0YXRlICE9PSAnaW52ZXN0aWdhdGUnICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICd3YWl0X2Zvcl9pbnZlc3RpZ2F0ZScpXHJcblx0XHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XHJcblx0XHRcdH07XHJcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BlZWsnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcclxuXHR7XHJcblx0XHRsZXQgb3B0cyA9IHtjaG9pY2VzOiBCYWxsb3RUeXBlLlBPTElDWSwgcG9saWN5SGFuZDogOCB8IChnYW1lLmRlY2smNyl9O1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkICE9PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdE9iamVjdC5hc3NpZ24ob3B0cywge2Zha2U6IHRydWUsIGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3BlZWsnfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdFeGVjdXRpdmUgcG93ZXI6IFRvcCBvZiBwb2xpY3kgZGVjaycsICdsb2NhbF9wZWVrJywgb3B0cylcclxuXHRcdC50aGVuKGRpc2NhcmQgPT4ge1xyXG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnY29udGludWUnKTtcclxuXHRcdH0pO1xyXG5cdFx0bGV0IGNsZWFuVXBGYWtlVm90ZSA9ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xyXG5cdFx0XHRpZihzdGF0ZSAhPT0gJ3BlZWsnICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wZWVrJylcclxuXHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0fTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XHJcblx0fVxyXG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ25hbWVTdWNjZXNzb3InICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcclxuXHRcdFx0Y2hvb3NlUGxheWVyKGBFeGVjdXRpdmUgcG93ZXI6IENob29zZSB0aGUgbmV4dCAke3RyKCdwcmVzaWRlbnQnKX0hYCwgYHt9IGZvciAke3RyKCdwcmVzaWRlbnQnKX0/YCwgJ25hbWVTdWNjZXNzb3InKVxyXG5cdFx0XHQudGhlbih1c2VySWQgPT4ge1xyXG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCduYW1lX3N1Y2Nlc3NvcicsIHVzZXJJZCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbihgRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgdGhlIG5leHQgJHt0cigncHJlc2lkZW50Jyl9IWAsICd3YWl0X2Zvcl9zdWNjZXNzb3InLCB7XHJcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXHJcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcclxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICduYW1lU3VjY2Vzc29yJ1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0bGV0IGNsZWFuVXBGYWtlVm90ZSA9ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xyXG5cdFx0XHRcdGlmKHN0YXRlICE9PSAnbmFtZVN1Y2Nlc3NvcicgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX3N1Y2Nlc3NvcicpXHJcblx0XHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XHJcblx0XHRcdH07XHJcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2V4ZWN1dGUnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcclxuXHRcdFx0Y2hvb3NlUGxheWVyKCdFeGVjdXRpdmUgcG93ZXI6IENob29zZSBhIHBsYXllciB0byBleGVjdXRlIScsICdFeGVjdXRlIHt9PycsICdleGVjdXRlJylcclxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcclxuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnZXhlY3V0ZScsIHVzZXJJZCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgYSBwbGF5ZXIgdG8gZXhlY3V0ZSEnLCAnd2FpdF9mb3JfZXhlY3V0ZScsIHtcclxuXHRcdFx0XHRjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCxcclxuXHRcdFx0XHRmYWtlOiB0cnVlLFxyXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ2V4ZWN1dGUnXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XHJcblx0XHRcdFx0aWYoc3RhdGUgIT09ICdleGVjdXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfZXhlY3V0ZScpXHJcblx0XHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XHJcblx0XHRcdH07XHJcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3ZldG8nICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcclxuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdBcHByb3ZlIHZldG8/JywgJ2xvY2FsX3ZldG8nKS50aGVuKGFwcHJvdmVkID0+IHtcclxuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnY29uZmlybV92ZXRvJywgYXBwcm92ZWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0FwcHJvdmUgdmV0bz8nLCAnd2FpdF9mb3JfdmV0bycsIHtcclxuXHRcdFx0XHRmYWtlOiB0cnVlLFxyXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3ZldG8nXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XHJcblx0XHRcdFx0aWYoc3RhdGUgIT09ICd2ZXRvJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfdmV0bycpXHJcblx0XHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcclxuXHRcdH1cclxuXHR9XHJcblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAndmV0bycpe1xyXG5cdFx0YmFsbG90LmJsb2NrVmV0byA9IHRydWU7XHJcblx0fVxyXG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2FmdGVybWF0aCcpe1xyXG5cdFx0YmFsbG90LmJsb2NrVmV0byA9IGZhbHNlO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IHt1cGRhdGVWb3Rlc0luUHJvZ3Jlc3MsIHVwZGF0ZVN0YXRlfTsiLCIndXNlIHN0cmljdCc7XHJcblxyXG4vKlxyXG4qIERlY2tzIGhhdmUgMTcgY2FyZHM6IDYgbGliZXJhbCwgMTEgZmFzY2lzdC5cclxuKiBJbiBiaXQtcGFja2VkIGJvb2xlYW4gYXJyYXlzLCAxIGlzIGxpYmVyYWwsIDAgaXMgZmFzY2lzdC5cclxuKiBUaGUgbW9zdCBzaWduaWZpY2FudCBiaXQgaXMgYWx3YXlzIDEuXHJcbiogRS5nLiAwYjEwMTAwMSByZXByZXNlbnRzIGEgZGVjayB3aXRoIDIgbGliZXJhbCBhbmQgMyBmYXNjaXN0IGNhcmRzXHJcbiovXHJcblxyXG5sZXQgRlVMTF9ERUNLID0gMHgyMDAzZixcclxuXHRGQVNDSVNUID0gMCxcclxuXHRMSUJFUkFMID0gMTtcclxuXHJcbmxldCBwb3NpdGlvbnMgPSBbXHJcblx0MHgxLCAweDIsIDB4NCwgMHg4LFxyXG5cdDB4MTAsIDB4MjAsIDB4NDAsIDB4ODAsXHJcblx0MHgxMDAsIDB4MjAwLCAweDQwMCwgMHg4MDAsXHJcblx0MHgxMDAwLCAweDIwMDAsIDB4NDAwMCwgMHg4MDAwLFxyXG5cdDB4MTAwMDAsIDB4MjAwMDAsIDB4NDAwMDBcclxuXTtcclxuXHJcbmZ1bmN0aW9uIGxlbmd0aChkZWNrKVxyXG57XHJcblx0cmV0dXJuIHBvc2l0aW9ucy5maW5kSW5kZXgocyA9PiBzID4gZGVjaykgLTE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNodWZmbGUoZGVjaylcclxue1xyXG5cdGxldCBsID0gbGVuZ3RoKGRlY2spO1xyXG5cdGZvcihsZXQgaT1sLTE7IGk+MDsgaS0tKVxyXG5cdHtcclxuXHRcdGxldCBvID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaSk7XHJcblx0XHRsZXQgaVZhbCA9IGRlY2sgJiAxIDw8IGksIG9WYWwgPSBkZWNrICYgMSA8PCBvO1xyXG5cdFx0bGV0IHN3YXBwZWQgPSBpVmFsID4+PiBpLW8gfCBvVmFsIDw8IGktbztcclxuXHRcdGRlY2sgPSBkZWNrIC0gaVZhbCAtIG9WYWwgKyBzd2FwcGVkO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIGRlY2s7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdUaHJlZShkKVxyXG57XHJcblx0cmV0dXJuIGQgPCA4ID8gWzEsIGRdIDogW2QgPj4+IDMsIDggfCBkICYgN107XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpc2NhcmRPbmUoZGVjaywgcG9zKVxyXG57XHJcblx0bGV0IGJvdHRvbUhhbGYgPSBkZWNrICYgKDEgPDwgcG9zKS0xO1xyXG5cdGxldCB0b3BIYWxmID0gZGVjayAmIH4oKDEgPDwgcG9zKzEpLTEpO1xyXG5cdHRvcEhhbGYgPj4+PSAxO1xyXG5cdGxldCBuZXdEZWNrID0gdG9wSGFsZiB8IGJvdHRvbUhhbGY7XHJcblx0XHJcblx0bGV0IHZhbCA9IChkZWNrICYgMTw8cG9zKSA+Pj4gcG9zO1xyXG5cclxuXHRyZXR1cm4gW25ld0RlY2ssIHZhbF07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFwcGVuZChkZWNrLCB2YWwpXHJcbntcclxuXHRyZXR1cm4gZGVjayA8PCAxIHwgdmFsO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0b0FycmF5KGRlY2spXHJcbntcclxuXHRsZXQgYXJyID0gW107XHJcblx0d2hpbGUoZGVjayA+IDEpe1xyXG5cdFx0YXJyLnB1c2goZGVjayAmIDEpO1xyXG5cdFx0ZGVjayA+Pj49IDE7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gYXJyO1xyXG59XHJcblxyXG5leHBvcnQge2xlbmd0aCwgc2h1ZmZsZSwgZHJhd1RocmVlLCBkaXNjYXJkT25lLCBhcHBlbmQsIHRvQXJyYXksIEZVTExfREVDSywgTElCRVJBTCwgRkFTQ0lTVH07IiwiJ3VzZSBzdHJpY3Q7J1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IHsgQmxhbmtDYXJkLCBKYUNhcmQsIE5laW5DYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgTGliZXJhbFBvbGljeUNhcmQsIFZldG9DYXJkIH0gZnJvbSAnLi9jYXJkJztcclxuaW1wb3J0IHsgZ2VuZXJhdGVRdWVzdGlvbiwgbGF0ZVVwZGF0ZSB9IGZyb20gJy4vdXRpbHMnO1xyXG5pbXBvcnQgKiBhcyBCUCBmcm9tICcuL2JhbGxvdHByb2Nlc3Nvcic7XHJcbmltcG9ydCAqIGFzIEJQQkEgZnJvbSAnLi9icGJhJztcclxuaW1wb3J0IHtOVGV4dCwgUGxhY2Vob2xkZXJNZXNofSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xyXG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xyXG5cclxubGV0IFBMQVlFUlNFTEVDVCA9IDA7XHJcbmxldCBDT05GSVJNID0gMTtcclxubGV0IEJJTkFSWSA9IDI7XHJcbmxldCBQT0xJQ1kgPSAzO1xyXG5cclxuY2xhc3MgQmFsbG90IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKHNlYXQpXHJcblx0e1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XHJcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC4zLCAwLjI1KTtcclxuXHRcdHRoaXMucm90YXRpb24uc2V0KC41LCBNYXRoLlBJLCAwKTtcclxuXHRcdHNlYXQuYWRkKHRoaXMpO1xyXG5cclxuXHRcdHRoaXMubGFzdFF1ZXVlZCA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cdFx0dGhpcy5kaXNwbGF5ZWQgPSBudWxsO1xyXG5cdFx0dGhpcy5ibG9ja1ZldG8gPSBmYWxzZTtcclxuXHJcblx0XHR0aGlzLl95ZXNDbGlja0hhbmRsZXIgPSBudWxsO1xyXG5cdFx0dGhpcy5fbm9DbGlja0hhbmRsZXIgPSBudWxsO1xyXG5cdFx0dGhpcy5fbm9taW5hdGVIYW5kbGVyID0gbnVsbDtcclxuXHRcdHRoaXMuX2NhbmNlbEhhbmRsZXIgPSBudWxsO1xyXG5cclxuXHRcdHRoaXMuamFDYXJkID0gbmV3IEphQ2FyZCgpO1xyXG5cdFx0dGhpcy5uZWluQ2FyZCA9IG5ldyBOZWluQ2FyZCgpO1xyXG5cdFx0W3RoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkXS5mb3JFYWNoKGMgPT4ge1xyXG5cdFx0XHRjLnBvc2l0aW9uLnNldChjIGluc3RhbmNlb2YgSmFDYXJkID8gLTAuMSA6IDAuMSwgLTAuMSwgMCk7XHJcblx0XHRcdGMuc2NhbGUuc2V0U2NhbGFyKDAuMTUpO1xyXG5cdFx0XHRjLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5qYUNhcmQsIHRoaXMubmVpbkNhcmQpO1xyXG5cdFx0dGhpcy5wb2xpY2llcyA9IFtdO1xyXG5cclxuXHRcdC8vbGV0IGdlbyA9IG5ldyBUSFJFRS5QbGFuZUJ1ZmZlckdlb21ldHJ5KDAuNCwgMC4yKTtcclxuXHRcdC8vbGV0IG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7dHJhbnNwYXJlbnQ6IHRydWUsIHNpZGU6IFRIUkVFLkRvdWJsZVNpZGV9KTtcclxuXHRcdHRoaXMucXVlc3Rpb24gPSBQbGFjZWhvbGRlck1lc2guY2xvbmUoKTtcclxuXHRcdHRoaXMucXVlc3Rpb24ucG9zaXRpb24uc2V0KDAsIDAuMDUsIDApO1xyXG5cdFx0dGhpcy5xdWVzdGlvbi5zY2FsZS5zZXRTY2FsYXIoLjUpO1xyXG5cdFx0dGhpcy5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLmFkZCh0aGlzLnF1ZXN0aW9uKTtcclxuXHJcblx0XHR0aGlzLnRleHRDb21wb25lbnQgPSBuZXcgTlRleHQodGhpcy5xdWVzdGlvbik7XHJcblx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt3aWR0aDogMS4xLCBoZWlnaHQ6IC40LCBmb250U2l6ZTogMSwgdmVydGljYWxBbGlnbjogJ3RvcCd9KTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdm90ZXNJblByb2dyZXNzJywgQlAudXBkYXRlVm90ZXNJblByb2dyZXNzLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgbGF0ZVVwZGF0ZShCUC51cGRhdGVTdGF0ZS5iaW5kKHRoaXMpKSk7XHJcblx0fVxyXG5cclxuXHRhc2tRdWVzdGlvbihxVGV4dCwgaWQsIHtjaG9pY2VzID0gQklOQVJZLCBwb2xpY3lIYW5kID0gMHgxLCBpbmNsdWRlVmV0byA9IGZhbHNlLCBmYWtlID0gZmFsc2UsIGlzSW52YWxpZCA9ICgpID0+IHRydWV9ID0ge30pXHJcblx0e1xyXG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xyXG5cclxuXHRcdGZ1bmN0aW9uIGlzVm90ZVZhbGlkKClcclxuXHRcdHtcclxuXHRcdFx0bGV0IGlzRmFrZVZhbGlkID0gZmFrZSAmJiAhaXNJbnZhbGlkKCk7XHJcblx0XHRcdGxldCBpc0xvY2FsVm90ZSA9IC9ebG9jYWwvLnRlc3QoaWQpO1xyXG5cdFx0XHRsZXQgaXNGaXJzdFVwZGF0ZSA9ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcztcclxuXHRcdFx0bGV0IHZvdGUgPSBTSC52b3Rlc1tpZF07XHJcblx0XHRcdGxldCB2b3RlcnMgPSB2b3RlID8gWy4uLnZvdGUueWVzVm90ZXJzLCAuLi52b3RlLm5vVm90ZXJzXSA6IFtdO1xyXG5cdFx0XHRsZXQgYWxyZWFkeVZvdGVkID0gdm90ZXJzLmluY2x1ZGVzKHNlbGYuc2VhdC5vd25lcik7XHJcblx0XHRcdHJldHVybiBpc0xvY2FsVm90ZSB8fCBpc0ZpcnN0VXBkYXRlIHx8IGlzRmFrZVZhbGlkIHx8IHZvdGUgJiYgIWFscmVhZHlWb3RlZDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBob29rVXBRdWVzdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UocXVlc3Rpb25FeGVjdXRvcik7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gcXVlc3Rpb25FeGVjdXRvcihyZXNvbHZlLCByZWplY3QpXHJcblx0XHR7XHJcblx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgYW5zd2VyIGlzIHN0aWxsIHJlbGV2YW50XHJcblx0XHRcdGlmKCFpc1ZvdGVWYWxpZCgpKXtcclxuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KCdWb3RlIG5vIGxvbmdlciB2YWxpZCcpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzaG93IHRoZSBiYWxsb3RcclxuXHRcdFx0Ly9zZWxmLnF1ZXN0aW9uLm1hdGVyaWFsLm1hcCA9IGdlbmVyYXRlUXVlc3Rpb24ocVRleHQsIHNlbGYucXVlc3Rpb24ubWF0ZXJpYWwubWFwKTtcclxuXHRcdFx0c2VsZi50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDogYCR7cVRleHR9YH0pO1xyXG5cdFx0XHRzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSB0cnVlO1xyXG5cclxuXHRcdFx0Ly8gaG9vayB1cCBxL2EgY2FyZHNcclxuXHRcdFx0aWYoY2hvaWNlcyA9PT0gQ09ORklSTSB8fCBjaG9pY2VzID09PSBCSU5BUlkpe1xyXG5cdFx0XHRcdHNlbGYuamFDYXJkLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRcdGlmKCFmYWtlKXtcclxuXHRcdFx0XHRcdHNlbGYuamFDYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCgneWVzJywgcmVzb2x2ZSwgcmVqZWN0KSk7XHJcblx0XHRcdFx0XHRpZihzZWxmLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcclxuXHRcdFx0XHRcdFx0c2VsZi5qYUNhcmQuYWRkQmVoYXZpb3IoIG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLkhvdmVyU2NhbGUoKSApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHNlbGYuamFDYXJkLnZpc2libGUgPSBmYWxzZTtcclxuXHJcblx0XHRcdGlmKGNob2ljZXMgPT09IEJJTkFSWSl7XHJcblx0XHRcdFx0c2VsZi5uZWluQ2FyZC52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0XHRpZighZmFrZSl7XHJcblx0XHRcdFx0XHRzZWxmLm5laW5DYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCgnbm8nLCByZXNvbHZlLCByZWplY3QpKTtcclxuXHRcdFx0XHRcdGlmKHNlbGYuc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxyXG5cdFx0XHRcdFx0XHRzZWxmLm5laW5DYXJkLmFkZEJlaGF2aW9yKCBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlclNjYWxlKCkgKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBzZWxmLm5laW5DYXJkLnZpc2libGUgPSBmYWxzZTtcclxuXHJcblx0XHRcdGlmKGNob2ljZXMgPT09IFBMQVlFUlNFTEVDVCAmJiAhZmFrZSl7XHJcblx0XHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigncGxheWVyU2VsZWN0JywgcmVzcG9uZCgncGxheWVyJywgcmVzb2x2ZSwgcmVqZWN0KSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZihjaG9pY2VzID09PSBQT0xJQ1kpe1xyXG5cdFx0XHRcdGxldCBjYXJkcyA9IEJQQkEudG9BcnJheShwb2xpY3lIYW5kKTtcclxuXHRcdFx0XHRpZihpbmNsdWRlVmV0bykgY2FyZHMucHVzaCgtMSk7XHJcblx0XHRcdFx0Y2FyZHMuZm9yRWFjaCgodmFsLCBpLCBhcnIpID0+XHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bGV0IGNhcmQgPSBudWxsO1xyXG5cdFx0XHRcdFx0aWYoZmFrZSlcclxuXHRcdFx0XHRcdFx0Y2FyZCA9IG5ldyBCbGFua0NhcmQoKTtcclxuXHRcdFx0XHRcdGVsc2UgaWYodmFsID09PSAtMSlcclxuXHRcdFx0XHRcdFx0Y2FyZCA9IG5ldyBWZXRvQ2FyZCgpO1xyXG5cdFx0XHRcdFx0ZWxzZSBpZih2YWwgPT09IEJQQkEuTElCRVJBTClcclxuXHRcdFx0XHRcdFx0Y2FyZCA9IG5ldyBMaWJlcmFsUG9saWN5Q2FyZCgpO1xyXG5cdFx0XHRcdFx0ZWxzZVxyXG5cdFx0XHRcdFx0XHRjYXJkID0gbmV3IEZhc2Npc3RQb2xpY3lDYXJkKCk7XHJcblxyXG5cdFx0XHRcdFx0Y2FyZC5zY2FsZS5zZXRTY2FsYXIoMC4xNSk7XHJcblxyXG5cdFx0XHRcdFx0bGV0IHdpZHRoID0gLjE1ICogYXJyLmxlbmd0aDtcclxuXHRcdFx0XHRcdGxldCB4ID0gLXdpZHRoLzIgKyAuMTUqaSArIC4wNzU7XHJcblx0XHRcdFx0XHRjYXJkLnBvc2l0aW9uLnNldCh4LCAtMC4wNywgMCk7XHJcblx0XHRcdFx0XHRzZWxmLmFkZChjYXJkKTtcclxuXHRcdFx0XHRcdHNlbGYucG9saWNpZXMucHVzaChjYXJkKTtcclxuXHJcblx0XHRcdFx0XHRpZighZmFrZSl7XHJcblx0XHRcdFx0XHRcdGNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKHZhbCA9PT0gLTEgPyAtMSA6IGksIHJlc29sdmUsIHJlamVjdCkpO1xyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0aWYoc2VsZi5zZWF0Lm93bmVyID09PSBTSC5sb2NhbFVzZXIuaWQpXHJcblx0XHRcdFx0XHRcdFx0Y2FyZC5hZGRCZWhhdmlvciggbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJTY2FsZSgpICk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHNlbGYuYWRkRXZlbnRMaXN0ZW5lcignY2FuY2VsVm90ZScsIHJlc3BvbmQoJ2NhbmNlbCcsIHJlc29sdmUsIHJlamVjdCkpO1xyXG5cclxuXHRcdFx0aWYoc2VsZi5fb3V0dHJvQW5pbSl7XHJcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KHNlbGYuX291dHRyb0FuaW0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZighc2VsZi5kaXNwbGF5ZWQpXHJcblx0XHRcdFx0QW5pbWF0ZS5zd2luZ0luKHNlbGYsIE1hdGguUEkvMi0uNSwgLjQxLCA4MDApO1xyXG5cclxuXHRcdFx0c2VsZi5kaXNwbGF5ZWQgPSBpZDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiByZXNwb25kKGFuc3dlciwgcmVzb2x2ZSwgcmVqZWN0KVxyXG5cdFx0e1xyXG5cdFx0XHRmdW5jdGlvbiBoYW5kbGVyKGV2dClcclxuXHRcdFx0e1xyXG5cdFx0XHRcdC8vIG1ha2Ugc3VyZSBvbmx5IHRoZSBvd25lciBvZiB0aGUgYmFsbG90IGlzIGFuc3dlcmluZ1xyXG5cdFx0XHRcdGlmKGFuc3dlciAhPT0gJ2NhbmNlbCcgJiYgc2VsZi5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQpIHJldHVybjtcclxuXHJcblx0XHRcdFx0Ly8gY2xlYW4gdXBcclxuXHRcdFx0XHRzZWxmLl9vdXR0cm9BbmltID0gc2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRBbmltYXRlLnN3aW5nT3V0KHNlbGYsIE1hdGguUEkvMi0uNSwgLjQxLCAzMDApXHJcblx0XHRcdFx0XHQudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNlbGYuamFDYXJkLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0c2VsZi5uZWluQ2FyZC52aXNpYmxlID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdHNlbGYucXVlc3Rpb24udmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRzZWxmLmRpc3BsYXllZCA9IG51bGw7XHJcblx0XHRcdFx0XHRcdHNlbGYucmVtb3ZlKC4uLnNlbGYucG9saWNpZXMpO1xyXG5cdFx0XHRcdFx0XHRzZWxmLnBvbGljaWVzID0gW107XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0c2VsZi5fb3V0dHJvQW5pbSA9IG51bGw7XHJcblx0XHRcdFx0fSwgMTAwKTtcclxuXHJcblx0XHRcdFx0c2VsZi5qYUNhcmQucmVtb3ZlQWxsQmVoYXZpb3JzKCk7XHJcblx0XHRcdFx0c2VsZi5qYUNhcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCBzZWxmLl95ZXNDbGlja0hhbmRsZXIpO1xyXG5cdFx0XHRcdHNlbGYubmVpbkNhcmQucmVtb3ZlQWxsQmVoYXZpb3JzKCk7XHJcblx0XHRcdFx0c2VsZi5uZWluQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX25vQ2xpY2tIYW5kbGVyKTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCdwbGF5ZXJTZWxlY3QnLCBzZWxmLl9ub21pbmF0ZUhhbmRsZXIpO1xyXG5cdFx0XHRcdHNlbGYucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FuY2VsVm90ZScsIHNlbGYuX2NhbmNlbEhhbmRsZXIpO1xyXG5cclxuXHRcdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBzdGlsbCBtYXR0ZXJzXHJcblx0XHRcdFx0aWYoIWlzVm90ZVZhbGlkKCkgfHwgYW5zd2VyID09PSAnY2FuY2VsJyl7XHJcblx0XHRcdFx0XHRpZihjaG9pY2VzID09PSBQT0xJQ1kpXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdC8vIHJhbmRvbSBjYXJkIGRldGFjaGVzIGFuZCB3aW5rcyBvdXRcclxuXHRcdFx0XHRcdFx0bGV0IGNhcmQgPSBzZWxmLnBvbGljaWVzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSpzZWxmLnBvbGljaWVzLmxlbmd0aCldO1xyXG5cdFx0XHRcdFx0XHRjYXJkLmFwcGx5TWF0cml4KHNlbGYubWF0cml4KTtcclxuXHRcdFx0XHRcdFx0c2VsZi5zZWF0LmFkZChjYXJkKTtcclxuXHRcdFx0XHRcdFx0QW5pbWF0ZS53aW5rT3V0KGNhcmQsIDMwMCkudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2VsZi5zZWF0LnJlbW92ZShjYXJkKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRyZWplY3QoJ3ZvdGUgY2FuY2VsbGVkJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAneWVzJylcclxuXHRcdFx0XHRcdHJlc29sdmUodHJ1ZSk7XHJcblx0XHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdubycpXHJcblx0XHRcdFx0XHRyZXNvbHZlKGZhbHNlKTtcclxuXHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3BsYXllcicpXHJcblx0XHRcdFx0XHRyZXNvbHZlKGV2dC5kYXRhKTtcclxuXHRcdFx0XHRlbHNlIGlmKGNob2ljZXMgPT09IFBPTElDWSlcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHQvLyBjbGlja2VkIGNhcmQgZGV0YWNoZXMgYW5kIHdpbmtzIG91dFxyXG5cdFx0XHRcdFx0bGV0IGNhcmQgPSBzZWxmLnBvbGljaWVzWyhhbnN3ZXIrMyklM107XHJcblx0XHRcdFx0XHRjYXJkLmFwcGx5TWF0cml4KHNlbGYubWF0cml4KTtcclxuXHRcdFx0XHRcdHNlbGYuc2VhdC5hZGQoY2FyZCk7XHJcblx0XHRcdFx0XHRBbmltYXRlLndpbmtPdXQoY2FyZCwgMzAwKS50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0c2VsZi5zZWF0LnJlbW92ZShjYXJkKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdHJlc29sdmUoYW5zd2VyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmKGFuc3dlciA9PT0gJ3llcycpXHJcblx0XHRcdFx0c2VsZi5feWVzQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcclxuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdubycpXHJcblx0XHRcdFx0c2VsZi5fbm9DbGlja0hhbmRsZXIgPSBoYW5kbGVyO1xyXG5cdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3BsYXllcicpXHJcblx0XHRcdFx0c2VsZi5fbm9taW5hdGVIYW5kbGVyID0gaGFuZGxlcjtcclxuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdjYW5jZWwnKVxyXG5cdFx0XHRcdHNlbGYuX2NhbmNlbEhhbmRsZXIgPSBoYW5kbGVyO1xyXG5cclxuXHRcdFx0cmV0dXJuIGhhbmRsZXI7XHJcblx0XHR9XHJcblxyXG5cdFx0c2VsZi5sYXN0UXVldWVkID0gc2VsZi5sYXN0UXVldWVkLnRoZW4oaG9va1VwUXVlc3Rpb24sIGhvb2tVcFF1ZXN0aW9uKTtcclxuXHJcblx0XHRyZXR1cm4gc2VsZi5sYXN0UXVldWVkO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IHtCYWxsb3QsIFBMQVlFUlNFTEVDVCwgQ09ORklSTSwgQklOQVJZLCBQT0xJQ1l9O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQge0Zhc2Npc3RSb2xlQ2FyZCwgSGl0bGVyUm9sZUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZH0gZnJvbSAnLi9jYXJkJztcclxuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0IHtOQmlsbGJvYXJkfSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xyXG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxheWVySW5mbyBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcihzZWF0KVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xyXG5cdFx0dGhpcy5jYXJkID0gbnVsbDtcclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAsIDAuMyk7XHJcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjMpO1xyXG5cdFx0c2VhdC5hZGQodGhpcyk7XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgbGF0ZVVwZGF0ZSh0aGlzLnVwZGF0ZVN0YXRlLmJpbmQodGhpcykpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2ludmVzdGlnYXRlJywgdGhpcy5wcmVzZW50UGFydHkuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVTdGF0ZSh7ZGF0YToge2dhbWUsIHBsYXllcnMsIHZvdGVzfX0pXHJcblx0e1xyXG5cdFx0bGV0IGxvY2FsUGxheWVyID0gcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdIHx8IHt9O1xyXG5cdFx0bGV0IHNlYXRlZFBsYXllciA9IHBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXSB8fCB7fTtcclxuXHRcdGxldCB2b3RlID0gdm90ZXNbZ2FtZS5sYXN0RWxlY3Rpb25dO1xyXG5cclxuXHRcdGxldCBzZWF0ZWRSb2xlU2hvdWxkQmVWaXNpYmxlID1cclxuXHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ2RvbmUnIHx8XHJcblx0XHRcdGdhbWUuc3RhdGUgPT09ICduaWdodCcgJiYgKFxyXG5cdFx0XHRcdGxvY2FsUGxheWVyID09PSBzZWF0ZWRQbGF5ZXIgfHxcclxuXHRcdFx0XHRsb2NhbFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgJiYgKHNlYXRlZFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgfHwgc2VhdGVkUGxheWVyLnJvbGUgPT09ICdoaXRsZXInKSB8fFxyXG5cdFx0XHRcdGxvY2FsUGxheWVyLnJvbGUgPT09ICdoaXRsZXInICYmIHNlYXRlZFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgJiYgZ2FtZS50dXJuT3JkZXIubGVuZ3RoIDwgN1xyXG5cdFx0XHQpO1xyXG5cclxuXHRcdGlmKHRoaXMuc2VhdC5vd25lciAmJiBzZWF0ZWRSb2xlU2hvdWxkQmVWaXNpYmxlKVxyXG5cdFx0e1xyXG5cdFx0XHRpZih0aGlzLmNhcmQgJiYgdGhpcy5jYXJkLnVzZXJEYXRhLnR5cGUgIT09ICdyb2xlJyl7XHJcblx0XHRcdFx0dGhpcy5yZW1vdmUodGhpcy5jYXJkKTtcclxuXHRcdFx0XHR0aGlzLmNhcmQgPSBudWxsO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzd2l0Y2goc2VhdGVkUGxheWVyLnJvbGUpe1xyXG5cdFx0XHRcdGNhc2UgJ2Zhc2Npc3QnOiB0aGlzLmNhcmQgPSBuZXcgRmFzY2lzdFJvbGVDYXJkKCk7IGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2hpdGxlcicgOiB0aGlzLmNhcmQgPSBuZXcgSGl0bGVyUm9sZUNhcmQoKTsgIGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2xpYmVyYWwnOiB0aGlzLmNhcmQgPSBuZXcgTGliZXJhbFJvbGVDYXJkKCk7IGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGlzLmNhcmQudXNlckRhdGEudHlwZSA9ICdyb2xlJztcclxuXHRcdFx0dGhpcy5hZGQodGhpcy5jYXJkKTtcclxuXHRcdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcclxuXHRcdFx0QW5pbWF0ZS53aW5rSW4odGhpcy5jYXJkLCAzMDApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih0aGlzLnNlYXQub3duZXIgJiYgZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyAmJiAhdm90ZS5ub25Wb3RlcnMuaW5jbHVkZXModGhpcy5zZWF0Lm93bmVyKSlcclxuXHRcdHtcclxuXHRcdFx0aWYodGhpcy5jYXJkICYmIHRoaXMuY2FyZC51c2VyRGF0YS50eXBlICE9PSAndm90ZScpe1xyXG5cdFx0XHRcdHRoaXMucmVtb3ZlKHRoaXMuY2FyZCk7XHJcblx0XHRcdFx0dGhpcy5jYXJkID0gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bGV0IHBsYXllclZvdGUgPSB2b3RlLnllc1ZvdGVycy5pbmNsdWRlcyh0aGlzLnNlYXQub3duZXIpO1xyXG5cdFx0XHR0aGlzLmNhcmQgPSBwbGF5ZXJWb3RlID8gbmV3IEphQ2FyZCgpIDogbmV3IE5laW5DYXJkKCk7XHJcblxyXG5cdFx0XHR0aGlzLmNhcmQudXNlckRhdGEudHlwZSA9ICd2b3RlJztcclxuXHRcdFx0dGhpcy5hZGQodGhpcy5jYXJkKTtcclxuXHRcdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcclxuXHRcdFx0QW5pbWF0ZS53aW5rSW4odGhpcy5jYXJkLCAzMDApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih0aGlzLmNhcmQgIT09IG51bGwpXHJcblx0XHR7XHJcblx0XHRcdEFuaW1hdGUud2lua091dCh0aGlzLmNhcmQsIDMwMCkudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5yZW1vdmUodGhpcy5jYXJkKTtcclxuXHRcdFx0XHR0aGlzLmNhcmQgPSBudWxsO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByZXNlbnRQYXJ0eSh7ZGF0YTogdXNlcklkfSlcclxuXHR7XHJcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyIHx8IHRoaXMuc2VhdC5vd25lciAhPT0gdXNlcklkKSByZXR1cm47XHJcblxyXG5cdFx0aWYodGhpcy5jYXJkICYmIHRoaXMuY2FyZC51c2VyRGF0YS50eXBlICE9PSAncGFydHknKXtcclxuXHRcdFx0dGhpcy5yZW1vdmUodGhpcy5jYXJkKTtcclxuXHRcdFx0dGhpcy5jYXJkID0gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgcm9sZSA9IFNILnBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXS5yb2xlO1xyXG5cdFx0dGhpcy5jYXJkID0gIHJvbGUgPT09ICdsaWJlcmFsJyA/IG5ldyBMaWJlcmFsUGFydHlDYXJkKCkgOiBuZXcgRmFzY2lzdFBhcnR5Q2FyZCgpO1xyXG5cclxuXHRcdHRoaXMuY2FyZC51c2VyRGF0YS50eXBlID0gJ3BhcnR5JztcclxuXHRcdHRoaXMuYWRkKHRoaXMuY2FyZCk7XHJcblx0XHRsZXQgYmIgPSBuZXcgTkJpbGxib2FyZCh0aGlzLmNhcmQpO1xyXG5cdFx0QW5pbWF0ZS53aW5rSW4odGhpcy5jYXJkLCAzMDApO1xyXG5cdH1cclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2Fwc3VsZUdlb21ldHJ5IGV4dGVuZHMgVEhSRUUuQnVmZmVyR2VvbWV0cnlcclxue1xyXG5cdGNvbnN0cnVjdG9yKHJhZGl1cywgaGVpZ2h0LCBzZWdtZW50cyA9IDEyLCByaW5ncyA9IDgpXHJcblx0e1xyXG5cdFx0c3VwZXIoKTtcclxuXHJcblx0XHRsZXQgbnVtVmVydHMgPSAyICogcmluZ3MgKiBzZWdtZW50cyArIDI7XHJcblx0XHRsZXQgbnVtRmFjZXMgPSA0ICogcmluZ3MgKiBzZWdtZW50cztcclxuXHRcdGxldCB0aGV0YSA9IDIqTWF0aC5QSS9zZWdtZW50cztcclxuXHRcdGxldCBwaGkgPSBNYXRoLlBJLygyKnJpbmdzKTtcclxuXHJcblx0XHRsZXQgdmVydHMgPSBuZXcgRmxvYXQzMkFycmF5KDMqbnVtVmVydHMpO1xyXG5cdFx0bGV0IGZhY2VzID0gbmV3IFVpbnQxNkFycmF5KDMqbnVtRmFjZXMpO1xyXG5cdFx0bGV0IHZpID0gMCwgZmkgPSAwLCB0b3BDYXAgPSAwLCBib3RDYXAgPSAxO1xyXG5cclxuXHRcdHZlcnRzLnNldChbMCwgaGVpZ2h0LzIsIDBdLCAzKnZpKyspO1xyXG5cdFx0dmVydHMuc2V0KFswLCAtaGVpZ2h0LzIsIDBdLCAzKnZpKyspO1xyXG5cclxuXHRcdGZvciggbGV0IHM9MDsgczxzZWdtZW50czsgcysrIClcclxuXHRcdHtcclxuXHRcdFx0Zm9yKCBsZXQgcj0xOyByPD1yaW5nczsgcisrKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bGV0IHJhZGlhbCA9IHJhZGl1cyAqIE1hdGguc2luKHIqcGhpKTtcclxuXHJcblx0XHRcdFx0Ly8gY3JlYXRlIHZlcnRzXHJcblx0XHRcdFx0dmVydHMuc2V0KFtcclxuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguY29zKHMqdGhldGEpLFxyXG5cdFx0XHRcdFx0aGVpZ2h0LzIgLSByYWRpdXMqKDEtTWF0aC5jb3MocipwaGkpKSxcclxuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguc2luKHMqdGhldGEpXHJcblx0XHRcdFx0XSwgMyp2aSsrKTtcclxuXHJcblx0XHRcdFx0dmVydHMuc2V0KFtcclxuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguY29zKHMqdGhldGEpLFxyXG5cdFx0XHRcdFx0LWhlaWdodC8yICsgcmFkaXVzKigxLU1hdGguY29zKHIqcGhpKSksXHJcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLnNpbihzKnRoZXRhKVxyXG5cdFx0XHRcdF0sIDMqdmkrKyk7XHJcblxyXG5cdFx0XHRcdGxldCB0b3BfczFyMSA9IHZpLTIsIHRvcF9zMXIwID0gdmktNDtcclxuXHRcdFx0XHRsZXQgYm90X3MxcjEgPSB2aS0xLCBib3RfczFyMCA9IHZpLTM7XHJcblx0XHRcdFx0bGV0IHRvcF9zMHIxID0gdG9wX3MxcjEgLSAyKnJpbmdzLCB0b3BfczByMCA9IHRvcF9zMXIwIC0gMipyaW5ncztcclxuXHRcdFx0XHRsZXQgYm90X3MwcjEgPSBib3RfczFyMSAtIDIqcmluZ3MsIGJvdF9zMHIwID0gYm90X3MxcjAgLSAyKnJpbmdzO1xyXG5cdFx0XHRcdGlmKHMgPT09IDApe1xyXG5cdFx0XHRcdFx0dG9wX3MwcjEgKz0gbnVtVmVydHMtMjtcclxuXHRcdFx0XHRcdHRvcF9zMHIwICs9IG51bVZlcnRzLTI7XHJcblx0XHRcdFx0XHRib3RfczByMSArPSBudW1WZXJ0cy0yO1xyXG5cdFx0XHRcdFx0Ym90X3MwcjAgKz0gbnVtVmVydHMtMjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGNyZWF0ZSBmYWNlc1xyXG5cdFx0XHRcdGlmKHIgPT09IDEpXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFt0b3BDYXAsIHRvcF9zMXIxLCB0b3BfczByMV0sIDMqZmkrKyk7XHJcblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdENhcCwgYm90X3MwcjEsIGJvdF9zMXIxXSwgMypmaSsrKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGZhY2VzLnNldChbdG9wX3MxcjAsIHRvcF9zMXIxLCB0b3BfczByMF0sIDMqZmkrKyk7XHJcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcF9zMHIwLCB0b3BfczFyMSwgdG9wX3MwcjFdLCAzKmZpKyspO1xyXG5cclxuXHRcdFx0XHRcdGZhY2VzLnNldChbYm90X3MwcjEsIGJvdF9zMXIxLCBib3RfczByMF0sIDMqZmkrKyk7XHJcblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdF9zMHIwLCBib3RfczFyMSwgYm90X3MxcjBdLCAzKmZpKyspO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gY3JlYXRlIGxvbmcgc2lkZXNcclxuXHRcdFx0bGV0IHRvcF9zMSA9IHZpLTIsIHRvcF9zMCA9IHRvcF9zMSAtIDIqcmluZ3M7XHJcblx0XHRcdGxldCBib3RfczEgPSB2aS0xLCBib3RfczAgPSBib3RfczEgLSAyKnJpbmdzO1xyXG5cdFx0XHRpZihzID09PSAwKXtcclxuXHRcdFx0XHR0b3BfczAgKz0gbnVtVmVydHMtMjtcclxuXHRcdFx0XHRib3RfczAgKz0gbnVtVmVydHMtMjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZmFjZXMuc2V0KFt0b3BfczAsIHRvcF9zMSwgYm90X3MxXSwgMypmaSsrKTtcclxuXHRcdFx0ZmFjZXMuc2V0KFtib3RfczAsIHRvcF9zMCwgYm90X3MxXSwgMypmaSsrKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmFkZEF0dHJpYnV0ZSgncG9zaXRpb24nLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHZlcnRzLCAzKSk7XHJcblx0XHR0aGlzLnNldEluZGV4KG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoZmFjZXMsIDEpKTtcclxuXHR9XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCBDYXBzdWxlR2VvbWV0cnkgZnJvbSAnLi9jYXBzdWxlZ2VvbWV0cnknO1xyXG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xyXG5cclxubGV0IGhpdGJveEdlbyA9IG5ldyBDYXBzdWxlR2VvbWV0cnkoMC4zLCAxLjgpO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSGl0Ym94IGV4dGVuZHMgVEhSRUUuTWVzaFxyXG57XHJcblx0Y29uc3RydWN0b3Ioc2VhdClcclxuXHR7XHJcblx0XHRzdXBlcihoaXRib3hHZW8sIG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XHJcblx0XHRcdHRyYW5zcGFyZW50OiB0cnVlLFxyXG5cdFx0XHRvcGFjaXR5OiAwLFxyXG5cdFx0XHRzaWRlOiBUSFJFRS5CYWNrU2lkZVxyXG5cdFx0fSkpO1xyXG5cclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC0wLjUsIC0uMik7XHJcblx0XHR0aGlzLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XHJcblx0XHRzZWF0LmFkZCh0aGlzKTtcclxuXHJcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcmVudGVyJywgKCkgPT4gdGhpcy5tYXRlcmlhbC5vcGFjaXR5ID0gMC4xKTtcclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ybGVhdmUnLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwKTtcclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCAoKSA9PiB7XHJcblx0XHRcdFNILmRpc3BhdGNoRXZlbnQoe1xyXG5cdFx0XHRcdHR5cGU6ICdwbGF5ZXJTZWxlY3QnLFxyXG5cdFx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxyXG5cdFx0XHRcdGRhdGE6IHRoaXMuc2VhdC5vd25lclxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUodGhpcy51cGRhdGVWaXNpYmlsaXR5LmJpbmQodGhpcykpKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZVZpc2liaWxpdHkoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXHJcblx0e1xyXG5cdFx0bGV0IGxpdmluZ1BsYXllcnMgPSBnYW1lLnR1cm5PcmRlci5maWx0ZXIocCA9PiBwbGF5ZXJzW3BdLnN0YXRlICE9PSAnZGVhZCcpO1xyXG5cdFx0bGV0IHByZWNvbmRpdGlvbnMgPVxyXG5cdFx0XHRTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50ICYmXHJcblx0XHRcdHRoaXMuc2VhdC5vd25lciAhPT0gJycgJiZcclxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQgJiZcclxuXHRcdFx0bGl2aW5nUGxheWVycy5pbmNsdWRlcyh0aGlzLnNlYXQub3duZXIpO1xyXG5cclxuXHRcdGxldCBub21pbmF0ZWFibGUgPVxyXG5cdFx0XHRnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnICYmXHJcblx0XHRcdHRoaXMuc2VhdC5vd25lciAhPT0gZ2FtZS5sYXN0Q2hhbmNlbGxvciAmJlxyXG5cdFx0XHQobGl2aW5nUGxheWVycy5sZW5ndGggPD0gNSB8fCB0aGlzLnNlYXQub3duZXIgIT09IGdhbWUubGFzdFByZXNpZGVudCk7XHJcblxyXG5cdFx0bGV0IGludmVzdGlnYXRlYWJsZSA9XHJcblx0XHRcdGdhbWUuc3RhdGUgPT09ICdpbnZlc3RpZ2F0ZScgJiZcclxuXHRcdFx0cGxheWVyc1t0aGlzLnNlYXQub3duZXJdICYmIHBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXS5zdGF0ZSA9PT0gJ25vcm1hbCc7XHJcblxyXG5cdFx0bGV0IHN1Y2NlZWRhYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ25hbWVTdWNjZXNzb3InO1xyXG5cdFx0bGV0IGV4ZWN1dGFibGUgPSBnYW1lLnN0YXRlID09PSAnZXhlY3V0ZSc7XHJcblxyXG5cdFx0dGhpcy52aXNpYmxlID0gcHJlY29uZGl0aW9ucyAmJiAobm9taW5hdGVhYmxlIHx8IGludmVzdGlnYXRlYWJsZSB8fCBzdWNjZWVkYWJsZSB8fCBleGVjdXRhYmxlKTtcclxuXHR9XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XHJcbmltcG9ydCB7QmFsbG90fSBmcm9tICcuL2JhbGxvdCc7XHJcbmltcG9ydCBQbGF5ZXJJbmZvIGZyb20gJy4vcGxheWVyaW5mbyc7XHJcbmltcG9ydCBIaXRib3ggZnJvbSAnLi9oaXRib3gnO1xyXG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2VhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcihzZWF0TnVtKVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblxyXG5cdFx0dGhpcy5zZWF0TnVtID0gc2VhdE51bTtcclxuXHRcdHRoaXMub3duZXIgPSAnJztcclxuXHJcblx0XHQvLyBwb3NpdGlvbiBzZWF0XHJcblx0XHRsZXQgeCwgeT0wLjY1LCB6O1xyXG5cdFx0c3dpdGNoKHNlYXROdW0pe1xyXG5cdFx0Y2FzZSAwOiBjYXNlIDE6IGNhc2UgMjpcclxuXHRcdFx0eCA9IC0wLjgzMyArIDAuODMzKnNlYXROdW07XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIC0xLjA1KTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlIDM6IGNhc2UgNDpcclxuXHRcdFx0eiA9IC0wLjQzNyArIDAuODc0KihzZWF0TnVtLTMpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgxLjQyNSwgeSwgeik7XHJcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLzIsIDApO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XHJcblx0XHRcdHggPSAwLjgzMyAtIDAuODMzKihzZWF0TnVtLTUpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCh4LCB5LCAxLjA1KTtcclxuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEksIDApO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgODogY2FzZSA5OlxyXG5cdFx0XHR6ID0gMC40MzcgLSAwLjg3NCooc2VhdE51bS04KTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoLTEuNDI1LCB5LCB6KTtcclxuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLTEuNSpNYXRoLlBJLCAwKTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignY2hlY2tlZF9pbicsICh7ZGF0YTogaWR9KSA9PiB7XHJcblx0XHRcdGlmKHRoaXMub3duZXIgPT09IGlkKVxyXG5cdFx0XHRcdHRoaXMudXBkYXRlT3duZXJzaGlwKHtkYXRhOiB7Z2FtZTogU0guZ2FtZSwgcGxheWVyczogU0gucGxheWVyc319KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSkgPT4ge1xyXG5cdFx0XHRpZih0aGlzLm93bmVyICYmIHBsYXllcnNbdGhpcy5vd25lcl0uc3RhdGUgPT09ICdkZWFkJyl7XHJcblx0XHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0KDB4M2QyNzg5KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5uYW1lcGxhdGUgPSBuZXcgTmFtZXBsYXRlKHRoaXMpO1xyXG5cdFx0dGhpcy5iYWxsb3QgPSBuZXcgQmFsbG90KHRoaXMpO1xyXG5cdFx0dGhpcy5wbGF5ZXJJbmZvID0gbmV3IFBsYXllckluZm8odGhpcyk7XHJcblx0XHR0aGlzLmhpdGJveCA9IG5ldyBIaXRib3godGhpcyk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXHJcblx0e1xyXG5cdFx0bGV0IGlkcyA9IGdhbWUudHVybk9yZGVyIHx8IFtdO1xyXG5cclxuXHRcdC8vIHJlZ2lzdGVyIHRoaXMgc2VhdCBpZiBpdCdzIG5ld2x5IGNsYWltZWRcclxuXHRcdGlmKCAhdGhpcy5vd25lciApXHJcblx0XHR7XHJcblx0XHRcdC8vIGNoZWNrIGlmIGEgcGxheWVyIGhhcyBqb2luZWQgYXQgdGhpcyBzZWF0XHJcblx0XHRcdGZvcihsZXQgaSBpbiBpZHMpe1xyXG5cdFx0XHRcdGlmKHBsYXllcnNbaWRzW2ldXS5zZWF0TnVtID09IHRoaXMuc2VhdE51bSl7XHJcblx0XHRcdFx0XHR0aGlzLm93bmVyID0gaWRzW2ldO1xyXG5cdFx0XHRcdFx0dGhpcy5uYW1lcGxhdGUudXBkYXRlVGV4dChwbGF5ZXJzW2lkc1tpXV0uZGlzcGxheU5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHJlc2V0IHRoaXMgc2VhdCBpZiBpdCdzIG5ld2x5IHZhY2F0ZWRcclxuXHRcdGlmKCAhaWRzLmluY2x1ZGVzKHRoaXMub3duZXIpIClcclxuXHRcdHtcclxuXHRcdFx0dGhpcy5vd25lciA9ICcnO1xyXG5cdFx0XHRpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcclxuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KCc8Sm9pbj4nKTtcclxuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXRIZXgoMHhmZmZmZmYpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gdXBkYXRlIGRpc2Nvbm5lY3QgY29sb3JzXHJcblx0XHRlbHNlIGlmKCAhcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcclxuXHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ODA4MDgwKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoIHBsYXllcnNbdGhpcy5vd25lcl0uY29ubmVjdGVkICl7XHJcblx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweGZmZmZmZik7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7UGxhY2Vob2xkZXJNZXNoLCBOQmlsbGJvYXJkLCBOVGV4dH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcclxuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbnRpbnVlQm94IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKHBhcmVudClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5pY29uID0gbmV3IFRIUkVFLk1lc2goXHJcblx0XHRcdG5ldyBUSFJFRS5Cb3hCdWZmZXJHZW9tZXRyeSguMTUsIC4xNSwgLjE1KSxcclxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHgxMGEwMTB9KVxyXG5cdFx0KTtcclxuXHRcdEFuaW1hdGUuc3Bpbih0aGlzLmljb24pO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5pY29uKTtcclxuXHJcblx0XHR0aGlzLnRleHQgPSBQbGFjZWhvbGRlck1lc2guY2xvbmUoKTtcclxuXHRcdHRoaXMudGV4dC5wb3NpdGlvbi5zZXQoMCwgLjIsIDApO1xyXG5cdFx0dGhpcy50ZXh0LnVzZXJEYXRhLmFsdHNwYWNlID0ge2NvbGxpZGVyOiB7ZW5hYmxlZDogdHJ1ZX19O1xyXG5cclxuXHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMudGV4dCk7XHJcblxyXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50ID0gbmV3IE5UZXh0KHRoaXMudGV4dCk7XHJcblx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHtmb250U2l6ZTogMSwgd2lkdGg6IDIsIGhlaWdodDogMSwgaG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJywgdmVydGljYWxBbGlnbjogJ21pZGRsZSd9KTtcclxuXHJcblx0XHR0aGlzLmFkZCh0aGlzLnRleHQpO1xyXG5cclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAuMjUsIDApO1xyXG5cdFx0cGFyZW50LmFkZCh0aGlzKTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCB0aGlzLm9uc3RhdGVjaGFuZ2UuYmluZCh0aGlzKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy5wbGF5ZXJTZXR1cC5iaW5kKHRoaXMpKTtcclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLm9uY2xpY2suYmluZCh0aGlzKSk7XHJcblx0XHR0aGlzLmFkZEJlaGF2aW9yKCBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlclNjYWxlKCkgKTtcclxuXHJcblx0XHRsZXQgc2hvdyA9ICgpID0+IHRoaXMuc2hvdygpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignaW52ZXN0aWdhdGUnLCBzaG93KTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3BvbGljeUFuaW1Eb25lJywgc2hvdyk7XHJcblx0fVxyXG5cclxuXHRvbmNsaWNrKGV2dClcclxuXHR7XHJcblx0XHRpZihTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxyXG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnY29udGludWUnKTtcclxuXHR9XHJcblxyXG5cdG9uc3RhdGVjaGFuZ2Uoe2RhdGE6IHtnYW1lfX0pXHJcblx0e1xyXG5cdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyB8fCAoZ2FtZS5zdGF0ZSA9PT0gJ3BlZWsnICYmIGdhbWUucHJlc2lkZW50ID09PSBTSC5sb2NhbFVzZXIuaWQpKXtcclxuXHRcdFx0dGhpcy5zaG93KCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xyXG5cdFx0XHR0aGlzLnBsYXllclNldHVwKHtkYXRhOiB7Z2FtZX19KTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2RvbmUnKXtcclxuXHRcdFx0dGhpcy5oaWRlKCk7XHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuc2hvdygnTmV3IGdhbWUnKTtcclxuXHRcdFx0fSwgODAwMCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0dGhpcy5oaWRlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwbGF5ZXJTZXR1cCh7ZGF0YToge2dhbWV9fSlcclxuXHR7XHJcblx0XHRpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcclxuXHRcdFx0dGhpcy50ZXh0LnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRsZXQgcGxheWVyQ291bnQgPSBnYW1lLnR1cm5PcmRlci5sZW5ndGg7XHJcblx0XHRcdGlmKHBsYXllckNvdW50ID49IDUpe1xyXG5cdFx0XHRcdHRoaXMuaWNvbi52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OlxyXG5cdFx0XHRcdFx0YCgke3BsYXllckNvdW50fS81KSBDbGljayB3aGVuIHJlYWR5YFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuaWNvbi52aXNpYmxlID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDpcclxuXHRcdFx0XHRcdGAoJHtwbGF5ZXJDb3VudH0vNSkgTmVlZCBtb3JlIHBsYXllcnNgXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHNob3cobWVzc2FnZSA9ICdDbGljayB0byBjb250aW51ZScpe1xyXG5cdFx0dGhpcy5pY29uLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0dGhpcy50ZXh0LnZpc2libGUgPSB0cnVlO1xyXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDogbWVzc2FnZX0pO1xyXG5cdH1cclxuXHJcblx0aGlkZSgpe1xyXG5cdFx0dGhpcy5pY29uLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMudGV4dC52aXNpYmxlID0gZmFsc2U7XHJcblx0fVxyXG59OyIsImltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XHJcblxyXG5jb25zdCBwb3NpdGlvbnMgPSBbXHJcblx0bmV3IFRIUkVFLlZlY3RvcjMoMC4zNjgsIC4wMDUsIC0uNzE3KSxcclxuXHRuZXcgVEhSRUUuVmVjdG9yMygwLjEzNSwgLjAxMCwgLS43MTcpLFxyXG5cdG5ldyBUSFJFRS5WZWN0b3IzKC0uMDk2LCAuMDE1LCAtLjcxNyksXHJcblx0bmV3IFRIUkVFLlZlY3RvcjMoLS4zMjksIC4wMjAsIC0uNzE3KVxyXG5dO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRWxlY3Rpb25UcmFja2VyIGV4dGVuZHMgVEhSRUUuTWVzaFxyXG57XHJcblx0Y29uc3RydWN0b3IoKVxyXG5cdHtcclxuXHRcdHN1cGVyKFxyXG5cdFx0XHRuZXcgVEhSRUUuQ3lsaW5kZXJCdWZmZXJHZW9tZXRyeSguMDQsIC4wNCwgLjAxLCAxNiksXHJcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCgpXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5wb3NpdGlvbi5jb3B5KHBvc2l0aW9uc1swXSk7XHJcblx0XHRTSC50YWJsZS5hZGQodGhpcyk7XHJcblx0XHRcclxuXHRcdC8vIGZhaWxzJTMgPT0gMCBvciAzP1xyXG5cdFx0dGhpcy5oaWdoU2lkZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5zcG90ID0gMDtcclxuXHRcdHRoaXMubWF0ZXJpYWwuY29sb3Iuc2V0SFNMKC41MjgsIC4zMSwgLjQpO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9mYWlsZWRWb3RlcycsIHRoaXMudXBkYXRlRmFpbGVkVm90ZXMuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVGYWlsZWRWb3Rlcyh7ZGF0YToge2dhbWU6IHtmYWlsZWRWb3Rlc319fSA9IHtkYXRhOiB7Z2FtZToge2ZhaWxlZFZvdGVzOiAtMX19fSlcclxuXHR7XHJcblx0XHRpZihmYWlsZWRWb3RlcyA9PT0gLTEpXHJcblx0XHRcdGZhaWxlZFZvdGVzID0gdGhpcy5zcG90O1xyXG5cclxuXHRcdHRoaXMuaGlnaFNpZGUgPSBmYWlsZWRWb3RlcyA+IDA7XHJcblx0XHR0aGlzLnNwb3QgPSBmYWlsZWRWb3RlcyUzIHx8IHRoaXMuaGlnaFNpZGUgJiYgMyB8fCAwO1xyXG5cclxuXHRcdHRoaXMuYW5pbSA9IEFuaW1hdGUuc2ltcGxlKHRoaXMsIHtcclxuXHRcdFx0cG9zOiBwb3NpdGlvbnNbdGhpcy5zcG90XSxcclxuXHRcdFx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDEsIDErdGhpcy5zcG90LCAxKSxcclxuXHRcdFx0aHVlOiAuNTI4KigxLXRoaXMuc3BvdC8zKSxcclxuXHRcdFx0ZHVyYXRpb246IDEyMDBcclxuXHRcdH0pO1xyXG5cdH1cclxufSIsImltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7Q3JlZGl0c0NhcmR9IGZyb20gJy4vY2FyZCc7XHJcbmltcG9ydCB7UGxhY2Vob2xkZXJNZXNoLCBOQmlsbGJvYXJkLCBOVGV4dH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcclxuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcclxuaW1wb3J0IHt0cmFuc2xhdGUgYXMgdHJ9IGZyb20gJy4vdGhlbWUnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUHJlc2VudGF0aW9uIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0U0gudGFibGUuYWRkKHRoaXMpO1xyXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLS45LCAwKTtcclxuXHJcblx0XHQvLyBjcmVhdGUgaWRsZSBkaXNwbGF5XHJcblx0XHR0aGlzLmNyZWRpdHMgPSBuZXcgQ3JlZGl0c0NhcmQoKTtcclxuXHRcdHRoaXMuY3JlZGl0cy5wb3NpdGlvbi5zZXQoMCwgMS44NSwgMCk7XHJcblx0XHRBbmltYXRlLnNwaW4odGhpcy5jcmVkaXRzLCAzMDAwMCk7XHJcblx0XHR0aGlzLmFkZCh0aGlzLmNyZWRpdHMpO1xyXG5cdFx0XHJcblx0XHQvLyBjcmVhdGUgdmljdG9yeSBiYW5uZXJcclxuXHRcdHRoaXMuYmFubmVyID0gUGxhY2Vob2xkZXJNZXNoLmNsb25lKCk7XHJcblx0XHR0aGlzLmJhbm5lci50ZXh0ID0gbmV3IE5UZXh0KHRoaXMuYmFubmVyKTtcclxuXHRcdHRoaXMuYmFubmVyLnRleHQudXBkYXRlKHtmb250U2l6ZTogMn0pO1xyXG5cdFx0dGhpcy5iYW5uZXIuYmlsbGJvYXJkID0gbmV3IE5CaWxsYm9hcmQodGhpcy5iYW5uZXIpO1xyXG5cdFx0dGhpcy5iYW5uZXIuYm9iID0gbnVsbDtcclxuXHRcdHRoaXMuYWRkKHRoaXMuYmFubmVyKTtcclxuXHJcblx0XHQvLyB1cGRhdGUgc3R1ZmZcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIHRoaXMudXBkYXRlT25TdGF0ZS5iaW5kKHRoaXMpKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZU9uU3RhdGUoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXHJcblx0e1xyXG5cdFx0dGhpcy5iYW5uZXIudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5jcmVkaXRzLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdGlmKHRoaXMuYmFubmVyLmJvYil7XHJcblx0XHRcdHRoaXMuYmFubmVyLmJvYi5zdG9wKCk7XHJcblx0XHRcdHRoaXMuYmFubmVyLmJvYiA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJyl7XHJcblx0XHRcdHRoaXMuY3JlZGl0cy52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2RvbmUnKVxyXG5cdFx0e1xyXG5cdFx0XHRpZigvXmxpYmVyYWwvLnRlc3QoZ2FtZS52aWN0b3J5KSl7XHJcblx0XHRcdFx0dGhpcy5iYW5uZXIudGV4dC5jb2xvciA9ICcjMTkxOWZmJztcclxuXHRcdFx0XHR0aGlzLmJhbm5lci50ZXh0LnVwZGF0ZSh7dGV4dDogJ0xpYmVyYWxzIHdpbiEnfSk7XHJcblx0XHRcdFx0U0guYXVkaW8ubGliZXJhbEZhbmZhcmUucGxheSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQuY29sb3IgPSAncmVkJztcclxuXHRcdFx0XHR0aGlzLmJhbm5lci50ZXh0LnVwZGF0ZSh7dGV4dDogJ0Zhc2Npc3RzIHdpbiEnfSk7XHJcblx0XHRcdFx0U0guYXVkaW8uZmFzY2lzdEZhbmZhcmUucGxheSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLmJhbm5lci5wb3NpdGlvbi5zZXQoMCwwLjgsMCk7XHJcblx0XHRcdHRoaXMuYmFubmVyLnNjYWxlLnNldFNjYWxhciguMDAxKTtcclxuXHRcdFx0dGhpcy5iYW5uZXIudmlzaWJsZSA9IHRydWU7XHJcblx0XHRcdEFuaW1hdGUuc2ltcGxlKHRoaXMuYmFubmVyLCB7XHJcblx0XHRcdFx0cG9zOiBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLjgsIDApLFxyXG5cdFx0XHRcdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygxLDEsMSksXHJcblx0XHRcdFx0ZHVyYXRpb246IDEwMDBcclxuXHRcdFx0fSlcclxuXHRcdFx0LnRoZW4oKCkgPT4gdGhpcy5iYW5uZXIuYm9iID0gQW5pbWF0ZS5ib2IodGhpcy5iYW5uZXIpKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTEnICYmIGdhbWUuZmFzY2lzdFBvbGljaWVzID49IDMpXHJcblx0XHR7XHJcblx0XHRcdGxldCBjaGFuY2VsbG9yID0gcGxheWVyc1tnYW1lLmNoYW5jZWxsb3JdLmRpc3BsYXlOYW1lO1xyXG5cdFx0XHR0aGlzLmJhbm5lci50ZXh0LmNvbG9yID0gJ3doaXRlJztcclxuXHRcdFx0dGhpcy5iYW5uZXIudGV4dC51cGRhdGUoe3RleHQ6IGAke2NoYW5jZWxsb3J9IGlzIG5vdCAke3RyKCdIaXRsZXInKX0hYH0pO1xyXG5cclxuXHRcdFx0dGhpcy5iYW5uZXIucG9zaXRpb24uc2V0KDAsMC44LDApO1xyXG5cdFx0XHR0aGlzLmJhbm5lci5zY2FsZS5zZXRTY2FsYXIoLjAwMSk7XHJcblx0XHRcdHRoaXMuYmFubmVyLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRBbmltYXRlLnNpbXBsZSh0aGlzLmJhbm5lciwge1xyXG5cdFx0XHRcdHBvczogbmV3IFRIUkVFLlZlY3RvcjMoMCwgMS44LCAwKSxcclxuXHRcdFx0XHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMSwxLDEpXHJcblx0XHRcdH0pXHJcblx0XHRcdC50aGVuKCgpID0+IHRoaXMuYmFubmVyLmJvYiA9IEFuaW1hdGUuYm9iKHRoaXMuYmFubmVyKSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9XHJcbn1cclxuIiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IHthY3RpdmVUaGVtZSBhcyB0aGVtZX0gZnJvbSAnLi90aGVtZSc7XHJcblxyXG5jbGFzcyBBdWRpb1N0cmVhbVxyXG57XHJcblx0Y29uc3RydWN0b3IoY29udGV4dCwgYnVmZmVyLCBvdXRwdXQpe1xyXG5cdFx0dGhpcy5zb3VyY2UgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xyXG5cdFx0dGhpcy5zb3VyY2UuYnVmZmVyID0gYnVmZmVyO1xyXG5cdFx0dGhpcy5zb3VyY2UuY29ubmVjdChvdXRwdXQpO1xyXG5cdFx0dGhpcy5maW5pc2hlZFBsYXlpbmcgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblx0XHRcdHRoaXMuX3Jlc29sdmUgPSByZXNvbHZlO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwbGF5KCl7XHJcblx0XHRpZigvQWx0c3BhY2VWUi8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSlcclxuXHRcdFx0dGhpcy5zb3VyY2Uuc3RhcnQoMCwgMCk7XHJcblx0XHRzZXRUaW1lb3V0KHRoaXMuX3Jlc29sdmUsIE1hdGguY2VpbCh0aGlzLnNvdXJjZS5idWZmZXIuZHVyYXRpb24qMTAwMCArIDQwMCkpO1xyXG5cdH1cclxuXHJcblx0c3RvcCgpe1xyXG5cdFx0dGhpcy5zb3VyY2Uuc3RvcCgpO1xyXG5cdH1cclxufVxyXG5cclxubGV0IHF1ZXVlZFN0cmVhbXMgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHJcbmNsYXNzIEF1ZGlvQ2xpcFxyXG57XHJcblx0Y29uc3RydWN0b3IoY29udGV4dCwgdXJsLCB2b2x1bWUsIHF1ZXVlZCA9IHRydWUpXHJcblx0e1xyXG5cdFx0dGhpcy5jb250ZXh0ID0gY29udGV4dDtcclxuXHRcdHRoaXMub3V0cHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XHJcblx0XHR0aGlzLm91dHB1dC5nYWluLnZhbHVlID0gdm9sdW1lO1xyXG5cdFx0dGhpcy5vdXRwdXQuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTtcclxuXHJcblx0XHR0aGlzLmxvYWRlZCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0bGV0IGxvYWRlciA9IG5ldyBUSFJFRS5GaWxlTG9hZGVyKCk7XHJcblx0XHRcdGxvYWRlci5zZXRSZXNwb25zZVR5cGUoJ2FycmF5YnVmZmVyJyk7XHJcblx0XHRcdGxvYWRlci5sb2FkKHVybCwgYnVmZmVyID0+IHtcclxuXHRcdFx0XHRjb250ZXh0LmRlY29kZUF1ZGlvRGF0YShidWZmZXIsIGRlY29kZWRCdWZmZXIgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5idWZmZXIgPSBkZWNvZGVkQnVmZmVyO1xyXG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pXHJcblx0fVxyXG5cclxuXHRwbGF5KHF1ZXVlZCA9IGZhbHNlKVxyXG5cdHtcclxuXHRcdHJldHVybiB0aGlzLmxvYWRlZC50aGVuKCgpID0+IHtcclxuXHRcdFx0bGV0IGluc3RhbmNlID0gbmV3IEF1ZGlvU3RyZWFtKHRoaXMuY29udGV4dCwgdGhpcy5idWZmZXIsIHRoaXMub3V0cHV0KTtcclxuXHRcdFx0XHJcblx0XHRcdGlmKHF1ZXVlZCl7XHJcblx0XHRcdFx0cXVldWVkU3RyZWFtcyA9IHF1ZXVlZFN0cmVhbXMudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHRpbnN0YW5jZS5wbGF5KCk7XHJcblx0XHRcdFx0XHRyZXR1cm4gaW5zdGFuY2UuZmluaXNoZWRQbGF5aW5nO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHJldHVybiBxdWV1ZWRTdHJlYW1zO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdGluc3RhbmNlLnBsYXkoKTtcclxuXHRcdFx0XHRyZXR1cm4gaW5zdGFuY2UuZmluaXNoZWRQbGF5aW5nO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIEZha2VBdWRpb0NsaXBcclxue1xyXG5cdGNvbnN0cnVjdG9yKCl7IHRoaXMuZmFrZXN0cmVhbSA9IG5ldyBGYWtlQXVkaW9TdHJlYW0oKTsgfVxyXG5cdHBsYXkoKXsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpOyB9XHJcbn1cclxuXHJcbmNsYXNzIEZha2VBdWRpb1N0cmVhbVxyXG57XHJcblx0Y29uc3RydWN0b3IoKXsgdGhpcy5maW5pc2hlZFBsYXlpbmcgPSBQcm9taXNlLnJlc29sdmUoKTsgfVxyXG5cdHBsYXkoKXsgfVxyXG5cdHN0b3AoKXsgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBdWRpb0NvbnRyb2xsZXJcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRsZXQgY29udGV4dCA9IHRoaXMuY29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcclxuXHRcdHRoaXMubGliZXJhbFN0aW5nID0gbmV3IEF1ZGlvQ2xpcCh0aGlzLmNvbnRleHQsIGAvc3RhdGljL2F1ZGlvL2hpdGxlci9saWJlcmFsLXN0aW5nLm9nZ2AsIDAuMik7XHJcblx0XHR0aGlzLmxpYmVyYWxGYW5mYXJlID0gbmV3IEF1ZGlvQ2xpcCh0aGlzLmNvbnRleHQsIGAvc3RhdGljL2F1ZGlvL2hpdGxlci9saWJlcmFsLWZhbmZhcmUub2dnYCwgMC4yKTtcclxuXHRcdHRoaXMuZmFzY2lzdFN0aW5nID0gbmV3IEF1ZGlvQ2xpcCh0aGlzLmNvbnRleHQsIGAvc3RhdGljL2F1ZGlvL2hpdGxlci9mYXNjaXN0LXN0aW5nLm9nZ2AsIDAuMSk7XHJcblx0XHR0aGlzLmZhc2Npc3RGYW5mYXJlID0gbmV3IEF1ZGlvQ2xpcCh0aGlzLmNvbnRleHQsIGAvc3RhdGljL2F1ZGlvL2hpdGxlci9mYXNjaXN0LWZhbmZhcmUub2dnYCwgMC4xKTtcclxuXHJcblx0XHRsZXQgZmFrZSA9IG5ldyBGYWtlQXVkaW9DbGlwKCk7XHJcblx0XHR0aGlzLnR1dG9yaWFsID0ge2xvYWRTdGFydGVkOiBmYWxzZX07XHJcblx0XHRbJ3dlbGNvbWUnLCduaWdodCcsJ25vbWluYXRpb24nLCd2b3RpbmcnLCd2b3RlRmFpbHMnLCd2b3RlUGFzc2VzJywncG9saWN5MScsJ3BvbGljeTInLCdwb2xpY3lGYXNjaXN0JyxcclxuXHRcdCdwb2xpY3lMaWJlcmFsJywncG9saWN5QWZ0ZXJtYXRoJywnd3JhcHVwJywncG93ZXIxJywncG93ZXIyJywnaW52ZXN0aWdhdGUnLCdwZWVrJywnbmFtZVN1Y2Nlc3NvcicsJ2V4ZWN1dGUnLFxyXG5cdFx0J3ZldG8nLCdyZWR6b25lJ10uZm9yRWFjaCh4ID0+IHRoaXMudHV0b3JpYWxbeF0gPSBmYWtlKTtcclxuXHR9XHJcblxyXG5cdGxvYWRUdXRvcmlhbChnYW1lKVxyXG5cdHtcclxuXHRcdGlmKCFnYW1lLnR1dG9yaWFsIHx8IHRoaXMudHV0b3JpYWwubG9hZFN0YXJ0ZWQpIHJldHVybjtcclxuXHJcblx0XHRsZXQgcmVhZGVyID0gZ2FtZS50dXRvcmlhbCwgY29udGV4dCA9IHRoaXMuY29udGV4dCwgdm9sdW1lID0gMC41O1xyXG5cclxuXHRcdE9iamVjdC5hc3NpZ24odGhpcy50dXRvcmlhbCwge1xyXG5cdFx0XHRsb2FkU3RhcnRlZDogdHJ1ZSxcclxuXHRcdFx0d2VsY29tZTogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvd2VsY29tZS5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRuaWdodDogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvbmlnaHQub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0bm9taW5hdGlvbjogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvbm9taW5hdGlvbi5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHR2b3Rpbmc6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3ZvdGluZy5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHR2b3RlRmFpbHM6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3ZvdGUtZmFpbHMub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0dm90ZVBhc3NlczogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvdm90ZS1wYXNzZWQub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cG9saWN5MTogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG9saWN5MS5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRwb2xpY3kyOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb2xpY3kyLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBvbGljeUZhc2Npc3Q6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3BvbGljeS1mYXNjaXN0Lm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBvbGljeUxpYmVyYWw6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3BvbGljeS1saWJlcmFsLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBvbGljeUFmdGVybWF0aDogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG9saWN5LWFmdGVybWF0aC5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHR3cmFwdXA6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3dyYXB1cC5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRwb3dlcjE6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyMS5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRwb3dlcjI6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyMi5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRpbnZlc3RpZ2F0ZTogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXItaW52ZXN0aWdhdGUub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cGVlazogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXItcGVlay5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRuYW1lU3VjY2Vzc29yOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlci1uYW1lc3VjY2Vzc29yLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdGV4ZWN1dGU6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyLWV4ZWN1dGUub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0dmV0bzogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXItdmV0by5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRyZWR6b25lOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9yZWR6b25lLm9nZ2AsIHZvbHVtZSlcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG4iLCJpbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHV0b3JpYWxNYW5hZ2VyXHJcbntcclxuXHRjb25zdHJ1Y3RvcigpXHJcblx0e1xyXG5cdFx0dGhpcy5lbmFibGVkID0gZmFsc2U7XHJcblx0XHR0aGlzLmxhc3RFdmVudCA9IG51bGw7XHJcblx0XHR0aGlzLnBsYXllZCA9IFtdO1xyXG5cdH1cclxuXHJcblx0ZGV0ZWN0RXZlbnQoZ2FtZSwgdm90ZXMpXHJcblx0e1xyXG5cdFx0bGV0IGxhc3RFbGVjdGlvbiA9IHZvdGVzW2dhbWUubGFzdEVsZWN0aW9uXTtcclxuXHRcdGxldCBmaXJzdFJvdW5kID0gZ2FtZS5mYXNjaXN0UG9saWNpZXMgKyBnYW1lLmxpYmVyYWxQb2xpY2llcyA9PT0gMDtcclxuXHJcblx0XHRpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICduaWdodCcpXHJcblx0XHRcdHJldHVybiAnbmlnaHQnO1xyXG5cdFx0ZWxzZSBpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScpXHJcblx0XHRcdHJldHVybiAnbm9taW5hdGlvbic7XHJcblx0XHRlbHNlIGlmKGZpcnN0Um91bmQgJiYgZ2FtZS5zdGF0ZSA9PT0gJ2VsZWN0aW9uJylcclxuXHRcdFx0cmV0dXJuICd2b3RpbmcnO1xyXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnbGFtZUR1Y2snICYmIGxhc3RFbGVjdGlvbi55ZXNWb3RlcnMubGVuZ3RoIDwgbGFzdEVsZWN0aW9uLnRvUGFzcyAmJiAhdGhpcy5wbGF5ZWQuaW5jbHVkZXMoJ3ZvdGVGYWlscycpKXtcclxuXHRcdFx0dGhpcy5wbGF5ZWQucHVzaCgndm90ZUZhaWxzJyk7XHJcblx0XHRcdHJldHVybiAndm90ZUZhaWxzJztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyAmJiBsYXN0RWxlY3Rpb24ueWVzVm90ZXJzLmxlbmd0aCA+PSBsYXN0RWxlY3Rpb24udG9QYXNzICYmICF0aGlzLnBsYXllZC5pbmNsdWRlcygndm90ZVBhc3NlcycpKXtcclxuXHRcdFx0dGhpcy5wbGF5ZWQucHVzaCgndm90ZVBhc3NlcycpO1xyXG5cdFx0XHRyZXR1cm4gJ3ZvdGVQYXNzZXMnO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICdwb2xpY3kxJylcclxuXHRcdFx0cmV0dXJuICdwb2xpY3kxJztcclxuXHRcdGVsc2UgaWYoZmlyc3RSb3VuZCAmJiBnYW1lLnN0YXRlID09PSAncG9saWN5MicpXHJcblx0XHRcdHJldHVybiAncG9saWN5Mic7XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnICYmIGdhbWUuZmFzY2lzdFBvbGljaWVzID09PSAxICYmIGdhbWUuaGFuZCA9PT0gMilcclxuXHRcdFx0cmV0dXJuICdwb2xpY3lGYXNjaXN0JztcclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2FmdGVybWF0aCcgJiYgZ2FtZS5saWJlcmFsUG9saWNpZXMgPT09IDEgJiYgZ2FtZS5oYW5kID09PSAzKVxyXG5cdFx0XHRyZXR1cm4gJ3BvbGljeUxpYmVyYWwnO1xyXG5cclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcytnYW1lLmxpYmVyYWxQb2xpY2llcyA9PT0gMSlcclxuXHRcdFx0cmV0dXJuICd3cmFwdXAnO1xyXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnICYmIGdhbWUuZmFzY2lzdFBvbGljaWVzID09PSAzICYmICF0aGlzLnBsYXllZC5pbmNsdWRlcygncmVkem9uZScpKXtcclxuXHRcdFx0dGhpcy5wbGF5ZWQucHVzaCgncmVkem9uZScpO1xyXG5cdFx0XHRyZXR1cm4gJ3JlZHpvbmUnO1xyXG5cdFx0fVxyXG5cclxuXHRcdGVsc2UgaWYoWydpbnZlc3RpZ2F0ZScsJ3BlZWsnLCduYW1lU3VjY2Vzc29yJywnZXhlY3V0ZSddLmluY2x1ZGVzKGdhbWUuc3RhdGUpKVxyXG5cdFx0e1xyXG5cdFx0XHRpZih0aGlzLnBsYXllZC5pbmNsdWRlcyhnYW1lLnN0YXRlKSlcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHJcblx0XHRcdGxldCBzdGF0ZTtcclxuXHRcdFx0aWYoZ2FtZS5mYXNjaXN0UG9saWNpZXMgPT09IDUpXHJcblx0XHRcdFx0c3RhdGUgPSAndmV0byc7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRzdGF0ZSA9IGdhbWUuc3RhdGU7XHJcblx0XHRcdHRoaXMucGxheWVkLnB1c2goc3RhdGUpO1xyXG5cclxuXHRcdFx0aWYoIXRoaXMucGxheWVkLmluY2x1ZGVzKCdwb3dlcicpKXtcclxuXHRcdFx0XHRzdGF0ZSA9ICdmaXJzdF8nK3N0YXRlO1xyXG5cdFx0XHRcdHRoaXMucGxheWVkLnB1c2goJ3Bvd2VyJyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBzdGF0ZTtcclxuXHRcdH1cclxuXHRcdGVsc2UgcmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHRzdGF0ZVVwZGF0ZShnYW1lLCB2b3RlcylcclxuXHR7XHJcblx0XHRpZighZ2FtZS50dXRvcmlhbCkgcmV0dXJuO1xyXG5cclxuXHRcdGxldCBzZWFtbGVzcyA9IHtcclxuXHRcdFx0cG9saWN5RmFzY2lzdDogWydwb2xpY3lGYXNjaXN0JywncG9saWN5QWZ0ZXJtYXRoJ10sXHJcblx0XHRcdHBvbGljeUxpYmVyYWw6IFsncG9saWN5TGliZXJhbCcsJ3BvbGljeUFmdGVybWF0aCddLFxyXG5cdFx0XHRmaXJzdF9pbnZlc3RpZ2F0ZTogWydwb3dlcjEnLCdwb3dlcjInLCdpbnZlc3RpZ2F0ZSddLFxyXG5cdFx0XHRmaXJzdF9wZWVrOiBbJ3Bvd2VyMScsJ3Bvd2VyMicsJ3BlZWsnXSxcclxuXHRcdFx0Zmlyc3RfbmFtZVN1Y2Nlc3NvcjogWydwb3dlcjEnLCdwb3dlcjInLCduYW1lU3VjY2Vzc29yJ10sXHJcblx0XHRcdGZpcnN0X2V4ZWN1dGU6IFsncG93ZXIxJywncG93ZXIyJywnZXhlY3V0ZSddLFxyXG5cdFx0XHRmaXJzdF92ZXRvOiBbJ3Bvd2VyMScsJ3Bvd2VyMicsJ3ZldG8nXSxcclxuXHRcdFx0aW52ZXN0aWdhdGU6IFsncG93ZXIxJywnaW52ZXN0aWdhdGUnXSxcclxuXHRcdFx0cGVlazogWydwb3dlcjEnLCdwZWVrJ10sXHJcblx0XHRcdG5hbWVTdWNjZXNzb3I6IFsncG93ZXIxJywnbmFtZVN1Y2Nlc3NvciddLFxyXG5cdFx0XHRleGVjdXRlOiBbJ3Bvd2VyMScsJ2V4ZWN1dGUnXSxcclxuXHRcdFx0dmV0bzogWydwb3dlcjEnLCd2ZXRvJ10sXHJcblx0XHRcdG5pZ2h0OiBbJ3dlbGNvbWUnLCduaWdodCddXHJcblx0XHR9O1xyXG5cdFx0bGV0IGRlbGF5ZWQgPSB7XHJcblx0XHRcdHBvbGljeUZhc2Npc3Q6ICdwb2xpY3lBbmltRG9uZScsXHJcblx0XHRcdHBvbGljeUxpYmVyYWw6ICdwb2xpY3lBbmltRG9uZSdcclxuXHRcdH07XHJcblxyXG5cdFx0bGV0IGV2ZW50ID0gdGhpcy5sYXN0RXZlbnQgPSB0aGlzLmRldGVjdEV2ZW50KGdhbWUsIHZvdGVzKTtcclxuXHRcdGNvbnNvbGUubG9nKCd0dXRvcmlhbCBldmVudDonLCBldmVudCk7XHJcblxyXG5cdFx0bGV0IHdhaXQgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdGlmKGRlbGF5ZWRbZXZlbnRdKXtcclxuXHRcdFx0d2FpdCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0XHRsZXQgaGFuZGxlciA9ICgpID0+IHtcclxuXHRcdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoZGVsYXllZFtldmVudF0sIGhhbmRsZXIpO1xyXG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcihkZWxheWVkW2V2ZW50XSwgaGFuZGxlcik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHNlYW1sZXNzW2V2ZW50XSlcclxuXHRcdHtcclxuXHRcdFx0d2FpdC50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRzZWFtbGVzc1tldmVudF0uZm9yRWFjaChjbGlwID0+IFNILmF1ZGlvLnR1dG9yaWFsW2NsaXBdLnBsYXkodHJ1ZSkpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZXZlbnQgIT09IG51bGwpXHJcblx0XHR7XHJcblx0XHRcdHdhaXQudGhlbigoKSA9PiBTSC5hdWRpby50dXRvcmlhbFtldmVudF0ucGxheSh0cnVlKSk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCAnLi9wb2x5ZmlsbCc7XHJcblxyXG5pbXBvcnQge2FjdGl2ZVRoZW1lIGFzIHRoZW1lfSBmcm9tICcuL3RoZW1lJztcclxuXHJcbmltcG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9IGZyb20gJy4vaGF0cyc7XHJcbmltcG9ydCBHYW1lVGFibGUgZnJvbSAnLi90YWJsZSc7XHJcbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5pbXBvcnQgeyBnZXRHYW1lSWQsIG1lcmdlT2JqZWN0cyB9IGZyb20gJy4vdXRpbHMnO1xyXG5pbXBvcnQgTmFtZXBsYXRlIGZyb20gJy4vbmFtZXBsYXRlJztcclxuaW1wb3J0IFNlYXQgZnJvbSAnLi9zZWF0JztcclxuaW1wb3J0IFBsYXllck1ldGVyIGZyb20gJy4vcGxheWVybWV0ZXInO1xyXG5pbXBvcnQgQ29udGludWVCb3ggZnJvbSAnLi9jb250aW51ZWJveCc7XHJcbmltcG9ydCBFbGVjdGlvblRyYWNrZXIgZnJvbSAnLi9lbGVjdGlvbnRyYWNrZXInO1xyXG5pbXBvcnQgUHJlc2VudGF0aW9uIGZyb20gJy4vcHJlc2VudGF0aW9uJztcclxuaW1wb3J0IEF1ZGlvQ29udHJvbGxlciBmcm9tICcuL2F1ZGlvY29udHJvbGxlcic7XHJcbmltcG9ydCBUdXRvcmlhbCBmcm9tICcuL3R1dG9yaWFsJztcclxuXHJcbmNsYXNzIFNlY3JldEhpdGxlciBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcigpXHJcblx0e1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuYXNzZXRzID0gQXNzZXRNYW5hZ2VyLm1hbmlmZXN0O1xyXG5cdFx0dGhpcy52ZXJ0aWNhbEFsaWduID0gJ2JvdHRvbSc7XHJcblx0XHR0aGlzLm5lZWRzU2tlbGV0b24gPSBmYWxzZTtcclxuXHJcblx0XHQvLyBwb2x5ZmlsbCBnZXRVc2VyIGZ1bmN0aW9uXHJcblx0XHRpZighYWx0c3BhY2UuaW5DbGllbnQpe1xyXG5cdFx0XHRhbHRzcGFjZS5nZXRVc2VyID0gKCkgPT4ge1xyXG5cdFx0XHRcdGxldCBpZCwgcmUgPSAvWz8mXXVzZXJJZD0oXFxkKykvLmV4ZWMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XHJcblx0XHRcdFx0aWYocmUpXHJcblx0XHRcdFx0XHRpZCA9IHJlWzFdO1xyXG5cdFx0XHRcdGVsc2VcclxuXHRcdFx0XHRcdGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMDApLnRvU3RyaW5nKCk7XHJcblxyXG5cdFx0XHRcdGFsdHNwYWNlLl9sb2NhbFVzZXIgPSB7XHJcblx0XHRcdFx0XHR1c2VySWQ6IGlkLFxyXG5cdFx0XHRcdFx0ZGlzcGxheU5hbWU6IGlkLFxyXG5cdFx0XHRcdFx0aXNNb2RlcmF0b3I6IC9pc01vZGVyYXRvci8udGVzdCh3aW5kb3cubG9jYXRpb24uc2VhcmNoKVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ01hc3F1ZXJhZGluZyBhcycsIGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xyXG5cdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoYWx0c3BhY2UuX2xvY2FsVXNlcik7XHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gZ2V0IGxvY2FsIHVzZXJcclxuXHRcdHRoaXMuX3VzZXJQcm9taXNlID0gYWx0c3BhY2UuZ2V0VXNlcigpO1xyXG5cdFx0dGhpcy5fdXNlclByb21pc2UudGhlbih1c2VyID0+IHtcclxuXHRcdFx0dGhpcy5sb2NhbFVzZXIgPSB7XHJcblx0XHRcdFx0aWQ6IHVzZXIudXNlcklkLFxyXG5cdFx0XHRcdGRpc3BsYXlOYW1lOiB1c2VyLmRpc3BsYXlOYW1lLFxyXG5cdFx0XHRcdGlzTW9kZXJhdG9yOiB1c2VyLmlzTW9kZXJhdG9yXHJcblx0XHRcdH07XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmdhbWUgPSB7fTtcclxuXHRcdHRoaXMucGxheWVycyA9IHt9O1xyXG5cdFx0dGhpcy52b3RlcyA9IHt9O1xyXG5cdH1cclxuXHJcblx0aW5pdGlhbGl6ZShlbnYsIHJvb3QsIGFzc2V0cylcclxuXHR7XHJcblx0XHRpZighdGhpcy5sb2NhbFVzZXIpe1xyXG5cdFx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKCgpID0+IHRoaXMuaW5pdGlhbGl6ZShlbnYsIHJvb3QsIGFzc2V0cykpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gc2hhcmUgdGhlIGRpb3JhbWEgaW5mb1xyXG5cdFx0QXNzZXRNYW5hZ2VyLmNhY2hlID0gYXNzZXRzO1xyXG5cdFx0QXNzZXRNYW5hZ2VyLmZpeE1hdGVyaWFscygpO1xyXG5cdFx0dGhpcy5lbnYgPSBlbnY7XHJcblxyXG5cdFx0Ly8gY29ubmVjdCB0byBzZXJ2ZXJcclxuXHRcdHRoaXMuc29ja2V0ID0gaW8uY29ubmVjdCgnLycsIHtxdWVyeTogYGdhbWVJZD0ke2dldEdhbWVJZCgpfSZ0aGVtZT0ke3RoZW1lfWB9KTtcclxuXHJcblx0XHQvLyBzcGF3biBzZWxmLXNlcnZlIHR1dG9yaWFsIGRpYWxvZ1xyXG5cdFx0aWYoYWx0c3BhY2UuaW5DbGllbnQpe1xyXG5cdFx0XHRhbHRzcGFjZS5vcGVuKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4rJy9zdGF0aWMvdHV0b3JpYWwuaHRtbCcsICdfZXhwZXJpZW5jZScsXHJcblx0XHRcdFx0e2hpZGRlbjogdHJ1ZSwgaWNvbjogd2luZG93LmxvY2F0aW9uLm9yaWdpbisnL3N0YXRpYy9pbWcvY2Flc2FyL2ljb24ucG5nJ30pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuYXVkaW8gPSBuZXcgQXVkaW9Db250cm9sbGVyKCk7XHJcblx0XHR0aGlzLnR1dG9yaWFsID0gbmV3IFR1dG9yaWFsKCk7XHJcblxyXG5cdFx0Ly8gY3JlYXRlIHRoZSB0YWJsZVxyXG5cdFx0dGhpcy50YWJsZSA9IG5ldyBHYW1lVGFibGUoKTtcclxuXHRcdHRoaXMuYWRkKHRoaXMudGFibGUpO1xyXG5cclxuXHRcdHRoaXMucmVzZXRCdXR0b24gPSBuZXcgVEhSRUUuTWVzaChcclxuXHRcdFx0bmV3IFRIUkVFLkJveEdlb21ldHJ5KC4yNSwuMjUsLjI1KSxcclxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IGFzc2V0cy50ZXh0dXJlcy5yZXNldH0pXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5wb3NpdGlvbi5zZXQoMS4xMywgLS45LCAuNzUpO1xyXG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuc2VuZFJlc2V0LmJpbmQodGhpcykpO1xyXG5cdFx0dGhpcy5fdXNlclByb21pc2UudGhlbigoKSA9PiB7XHJcblx0XHRcdGlmKHRoaXMubG9jYWxVc2VyLmlzTW9kZXJhdG9yKVxyXG5cdFx0XHRcdHRoaXMudGFibGUuYWRkKHRoaXMucmVzZXRCdXR0b24pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5yZWZyZXNoQnV0dG9uID0gbmV3IFRIUkVFLk1lc2goXHJcblx0XHRcdG5ldyBUSFJFRS5Cb3hHZW9tZXRyeSguMjUsLjI1LC4yNSksXHJcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBhc3NldHMudGV4dHVyZXMucmVmcmVzaH0pXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZWZyZXNoQnV0dG9uLnBvc2l0aW9uLnNldCgxLjEzLCAtLjMsIC43NSk7XHJcblx0XHR0aGlzLnJlZnJlc2hCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCAoKSA9PiB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCkpO1xyXG5cdFx0dGhpcy50YWJsZS5hZGQodGhpcy5yZWZyZXNoQnV0dG9uKTtcclxuXHJcblx0XHR0aGlzLnByZXNlbnRhdGlvbiA9IG5ldyBQcmVzZW50YXRpb24oKTtcclxuXHJcblx0XHQvLyBjcmVhdGUgaGF0c1xyXG5cdFx0dGhpcy5wcmVzaWRlbnRIYXQgPSBuZXcgUHJlc2lkZW50SGF0KCk7XHJcblx0XHR0aGlzLmNoYW5jZWxsb3JIYXQgPSBuZXcgQ2hhbmNlbGxvckhhdCgpO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBwb3NpdGlvbnNcclxuXHRcdHRoaXMuc2VhdHMgPSBbXTtcclxuXHRcdGZvcihsZXQgaT0wOyBpPDEwOyBpKyspe1xyXG5cdFx0XHR0aGlzLnNlYXRzLnB1c2goIG5ldyBTZWF0KGkpICk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy50YWJsZS5hZGQoLi4udGhpcy5zZWF0cyk7XHJcblxyXG5cdFx0Ly90aGlzLnBsYXllck1ldGVyID0gbmV3IFBsYXllck1ldGVyKCk7XHJcblx0XHQvL3RoaXMudGFibGUuYWRkKHRoaXMucGxheWVyTWV0ZXIpO1xyXG5cdFx0dGhpcy5jb250aW51ZUJveCA9IG5ldyBDb250aW51ZUJveCh0aGlzLnRhYmxlKTtcclxuXHJcblx0XHR0aGlzLmVsZWN0aW9uVHJhY2tlciA9IG5ldyBFbGVjdGlvblRyYWNrZXIoKTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5vbigndXBkYXRlJywgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xyXG5cdFx0dGhpcy5zb2NrZXQub24oJ2NoZWNrZWRfaW4nLCB0aGlzLmNoZWNrZWRJbi5iaW5kKHRoaXMpKTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5vbigncmVzZXQnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XHJcblx0XHQvL3RoaXMuc29ja2V0Lm9uKCdkaXNjb25uZWN0JywgdGhpcy5kb1Jlc2V0LmJpbmQodGhpcykpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlRnJvbVNlcnZlcihnZCwgcGQsIHZkKVxyXG5cdHtcclxuXHRcdGNvbnNvbGUubG9nKGdkLCBwZCwgdmQpO1xyXG5cclxuXHRcdGxldCBnYW1lID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nYW1lLCBnZCk7XHJcblx0XHRsZXQgcGxheWVycyA9IG1lcmdlT2JqZWN0cyh0aGlzLnBsYXllcnMsIHBkIHx8IHt9KTtcclxuXHRcdGxldCB2b3RlcyA9IG1lcmdlT2JqZWN0cyh0aGlzLnZvdGVzLCB2ZCB8fCB7fSk7XHJcblxyXG5cdFx0aWYoZ2QudHV0b3JpYWwpXHJcblx0XHRcdHRoaXMuYXVkaW8ubG9hZFR1dG9yaWFsKGdhbWUpO1xyXG5cclxuXHRcdGlmKGdkLnN0YXRlKVxyXG5cdFx0XHR0aGlzLnR1dG9yaWFsLnN0YXRlVXBkYXRlKGdhbWUsIHZvdGVzKTtcclxuXHJcblx0XHRmb3IobGV0IGZpZWxkIGluIGdkKVxyXG5cdFx0e1xyXG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe1xyXG5cdFx0XHRcdHR5cGU6ICd1cGRhdGVfJytmaWVsZCxcclxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcclxuXHRcdFx0XHRkYXRhOiB7XHJcblx0XHRcdFx0XHRnYW1lOiBnYW1lLFxyXG5cdFx0XHRcdFx0cGxheWVyczogcGxheWVycyxcclxuXHRcdFx0XHRcdHZvdGVzOiB2b3Rlc1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5fdXNlclByb21pc2UudGhlbigoKSA9PiB7XHJcblx0XHRcdGlmKHBsYXllcnNbdGhpcy5sb2NhbFVzZXIuaWRdICYmICFwbGF5ZXJzW3RoaXMubG9jYWxVc2VyLmlkXS5jb25uZWN0ZWQpe1xyXG5cdFx0XHRcdHRoaXMuc29ja2V0LmVtaXQoJ2NoZWNrX2luJywgdGhpcy5sb2NhbFVzZXIpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xyXG5cdFx0dGhpcy5wbGF5ZXJzID0gcGxheWVycztcclxuXHRcdHRoaXMudm90ZXMgPSB2b3RlcztcclxuXHR9XHJcblxyXG5cdGNoZWNrZWRJbihwKVxyXG5cdHtcclxuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5wbGF5ZXJzW3AuaWRdLCBwKTtcclxuXHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7XHJcblx0XHRcdHR5cGU6ICdjaGVja2VkX2luJyxcclxuXHRcdFx0YnViYmxlczogZmFsc2UsXHJcblx0XHRcdGRhdGE6IHAuaWRcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0c2VuZFJlc2V0KGUpe1xyXG5cdFx0aWYodGhpcy5sb2NhbFVzZXIuaXNNb2RlcmF0b3Ipe1xyXG5cdFx0XHRjb25zb2xlLmxvZygncmVxdWVzdGluZyByZXNldCcpO1xyXG5cdFx0XHR0aGlzLnNvY2tldC5lbWl0KCdyZXNldCcpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZG9SZXNldChnYW1lLCBwbGF5ZXJzLCB2b3RlcylcclxuXHR7XHJcblx0XHR3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgbmV3IFNlY3JldEhpdGxlcigpO1xyXG4iXSwibmFtZXMiOlsibGV0IiwiY29uc3QiLCJ0aGVtZSIsInRoaXMiLCJzdXBlciIsIkFNIiwiQXNzZXRNYW5hZ2VyIiwiY2FyZCIsInRyIiwiQmFsbG90VHlwZS5DT05GSVJNIiwidXBkYXRlU3RhdGUiLCJCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCIsIkJhbGxvdFR5cGUuUE9MSUNZIiwib3B0cyIsImNsZWFuVXBGYWtlVm90ZSIsIkJQLnVwZGF0ZVZvdGVzSW5Qcm9ncmVzcyIsIkJQLnVwZGF0ZVN0YXRlIiwiQlBCQS50b0FycmF5IiwiQlBCQS5MSUJFUkFMIiwiYmIiLCJwb3NpdGlvbnMiLCJhc3NldHMiLCJUdXRvcmlhbCJdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO0NBQzVCLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUU7RUFDbEQsS0FBSyxFQUFFLFNBQVMsSUFBSSxDQUFDO0dBQ3BCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztHQUMvQjtFQUNELFFBQVEsRUFBRSxLQUFLO0VBQ2YsVUFBVSxFQUFFLEtBQUs7RUFDakIsWUFBWSxFQUFFLEtBQUs7RUFDbkIsQ0FBQyxDQUFDO0NBQ0g7O0FDWERBLElBQUksV0FBVyxHQUFHLFFBQVEsQ0FBQztBQUMzQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxR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Qzs7O0VBR0gsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0dBQ1gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7R0FDM0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDbEYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7R0FDbkI7O0VBRUQsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0dBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7R0FDN0MsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDdEYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDcEI7O0VBRUQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDbEI7Ozs7aUNBQUE7O0NBRUQsY0FBQSxRQUFRLHNCQUFDLE1BQU07Q0FDZjtFQUNDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLE1BQU0sQ0FBQztHQUM1QixDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUNsQixHQUFHLElBQUksQ0FBQyxHQUFHO0lBQ1YsRUFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxJQUFJLGVBQWUsQ0FBQyxJQUFJ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QUFFLFFBQVEsR0FBRyxJQUFJLENBQUM7O0FBRXJDLFNBQVMsWUFBWTtBQUNyQjtDQUNDQSxJQUFJLFNBQVMsR0FBRzs7RUFFZixNQUFNLEVBQUUsR0FBRyxFQUFFLE1BQU07RUFDbkIsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU07RUFDbkIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTTtFQUNuQixNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTTtFQUNuQixNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSztFQUNuQixDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLO0VBQ25CLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSztFQUNuQixNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLOzs7RUFHbkIsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU07RUFDbkIsR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNO0VBQ25CLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNO0VBQ25CLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU07RUFDbkIsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSztFQUNuQixHQUFHLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSztFQUNuQixDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxLQUFLO0VBQ25CLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSzs7OztFQUluQixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUV0RixDQUFDOztDQUVGQSxJQUFJLE9BQU8sR0FBRzs7RUFFYixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDMUIsQ0FBQzs7O0NBR0ZBLElBQUksU0FBUyxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDdkVBLElBQUksSUFBSSxHQUFHLElBQUksWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0NBQzVELElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7Q0FDcEIsSUFBSSxHQUFHLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDdEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7O0NBR2xCQSxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsR0FBRyxFQUFFLENBQUM7Q0FDdERBLElBQUksV0FBVyxHQUFHLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUN4RixZQUFZLEdBQUcsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQ2xHQSxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7Q0FDYixJQUFJQSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztFQUN0QixHQUFHLENBQUMsSUFBSSxFQUFFLElBQUks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QUM7O0VBRVJKLElBQUksUUFBUSxHQUFHLENBQUMsR0FBRyxLQUFLLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQztFQUN4Q0EsSUFBSSxRQUFRLEdBQUcsQ0FBQyxHQUFHLEtBQUssR0FBRyxRQUFRLENBQUM7RUFDcENBLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQztFQUMvQkEsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7RUFFNUJBLElBQUksS0FBSyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUN6Q0EsSUFBSSxLQUFLLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQ3hDQSxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxDQUFDLENBQUM7O0VBRTNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztFQUNwQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7RUFFckMsS0FBS0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFO0VBQzdCO0dBQ0MsS0FBS0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO0dBQzNCO0lBQ0NBLElBQUksTUFBTSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7O0lBR3RDLEtBQUssQ0FBQyxHQUFHLENBQUM7S0FDVCxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3JDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7SUFFWCxLQUFLLENBQUMsR0FBRyxDQUFDO0tBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3RDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7SUFFWEEsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQ0EsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQ0EsSUFBSSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2pFQSxJQUFJLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDakUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ1YsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkI7OztJQUdELEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFDVjtLQUNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2hELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2hEOztJQUVEO0tBQ0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDbEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0tBRWxELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xEO0lBQ0Q7OztHQUdEQSxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUM3Q0EsSUFBSSxNQUFN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
