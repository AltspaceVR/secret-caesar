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
			{ if(this.color)
				{ fields.text = "<color=" + (this.color) + ">" + (fields.text) + "</color>"; }
			else
				{ fields.text = fields.text; } }
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
		this.material = this.material.clone();
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
		this.question.position.set(0, 0.1, 0);
		this.question.scale.setScalar(.5);
		this.question.visible = false;
		this.add(this.question);

		this.backplate = new THREE.Mesh(
			new THREE.PlaneBufferGeometry(1.1, .4),
			new THREE.MeshBasicMaterial({transparent: true, opacity: 0.25, side: THREE.DoubleSide})
		);
		this.backplate.position.set(0,0,-.01);
		this.backplate.visible = false;
		this.question.add(this.backplate);

		this.textComponent = new NText(this.question);
		this.textComponent.update({width: 1.1, height: .4, fontSize: 1});

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
			self.textComponent.update({text: qText});
			self.question.visible = true;
			self.backplate.visible = true;

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
						self.backplate.visible = false;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvcG9seWZpbGwuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RoZW1lLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hc3NldG1hbmFnZXIuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hdGl2ZWNvbXBvbmVudHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JlaGF2aW9yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hbmltYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jYXJkLmpzIiwiLi4vLi4vc3JjL2NsaWVudC90YWJsZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdXRpbHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hbWVwbGF0ZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmFsbG90cHJvY2Vzc29yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9icGJhLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3QuanMiLCIuLi8uLi9zcmMvY2xpZW50L3BsYXllcmluZm8uanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcHN1bGVnZW9tZXRyeS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvaGl0Ym94LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWF0LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jb250aW51ZWJveC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvZWxlY3Rpb250cmFja2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9wcmVzZW50YXRpb24uanMiLCIuLi8uLi9zcmMvY2xpZW50L2F1ZGlvY29udHJvbGxlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdHV0b3JpYWwuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlY3JldGhpdGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcblxyXG5pZighQXJyYXkucHJvdG90eXBlLmluY2x1ZGVzKXtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAnaW5jbHVkZXMnLCB7XHJcblx0XHR2YWx1ZTogZnVuY3Rpb24oaXRlbSl7XHJcblx0XHRcdHJldHVybiB0aGlzLmluZGV4T2YoaXRlbSkgPiAtMTtcclxuXHRcdH0sXHJcblx0XHR3cml0YWJsZTogZmFsc2UsXHJcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcclxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2VcclxuXHR9KTtcclxufVxyXG4iLCJsZXQgYWN0aXZlVGhlbWUgPSAnaGl0bGVyJztcclxuaWYoL2NhZXNhci8udGVzdCh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpKXtcclxuXHRhY3RpdmVUaGVtZSA9ICdjYWVzYXInO1xyXG59XHJcblxyXG5jb25zdCB0aGVtZXMgPSB7XHJcblx0aGl0bGVyOiB7XHJcblx0XHRoaXRsZXI6ICdoaXRsZXInLFxyXG5cdFx0cHJlc2lkZW50OiAncHJlc2lkZW50JyxcclxuXHRcdGNoYW5jZWxsb3I6ICdjaGFuY2VsbG9yJ1xyXG5cdH0sXHJcblx0Y2Flc2FyOiB7XHJcblx0XHRoaXRsZXI6ICdjYWVzYXInLFxyXG5cdFx0cHJlc2lkZW50OiAnY29uc3VsJyxcclxuXHRcdGNoYW5jZWxsb3I6ICdwcmFldG9yJ1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gdHJhbnNsYXRlKHN0cmluZylcclxue1xyXG5cdGxldCBrZXkgPSBzdHJpbmcudG9Mb3dlckNhc2UoKSxcclxuXHRcdHZhbHVlID0gdGhlbWVzW2FjdGl2ZVRoZW1lXVtrZXldIHx8IHRoZW1lcy5oaXRsZXJba2V5XSB8fCBzdHJpbmc7XHJcblxyXG5cdC8vIHN0YXJ0cyB3aXRoIHVwcGVyIGNhc2UsIHJlc3QgaXMgbG93ZXJcclxuXHRsZXQgaXNQcm9wZXIgPSBzdHJpbmcuY2hhckF0KDApID09IHN0cmluZy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSAmJiBzdHJpbmcuc2xpY2UoMSkgPT0gc3RyaW5nLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XHJcblx0aWYoaXNQcm9wZXIpe1xyXG5cdFx0dmFsdWUgPSB2YWx1ZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHZhbHVlLnNsaWNlKDEpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHZhbHVlO1xyXG59XHJcblxyXG5leHBvcnQge3RyYW5zbGF0ZSwgYWN0aXZlVGhlbWV9IiwiaW1wb3J0IHthY3RpdmVUaGVtZSBhcyB0aGVtZX0gZnJvbSAnLi90aGVtZSc7XHJcblxyXG5sZXQgdGhlbWVNb2RlbHMgPSB7XHJcblx0Y2Flc2FyOiB7XHJcblx0XHRsYXVyZWxzOiAnL3N0YXRpYy9tb2RlbC9sYXVyZWxzLmdsdGYnXHJcblx0fSxcclxuXHRoaXRsZXI6IHtcclxuXHRcdHRvcGhhdDogJy9zdGF0aWMvbW9kZWwvdG9waGF0LmdsdGYnLFxyXG5cdFx0dmlzb3JjYXA6ICcvc3RhdGljL21vZGVsL3Zpc29yX2NhcC5nbHRmJ1xyXG5cdH1cclxufTtcclxuXHJcbmxldCBhc3NldHMgPSB7XHJcblx0bWFuaWZlc3Q6IHtcclxuXHRcdG1vZGVsczogT2JqZWN0LmFzc2lnbih7XHJcblx0XHRcdHRhYmxlOiAnL3N0YXRpYy9tb2RlbC90YWJsZS5nbHRmJyxcclxuXHRcdFx0bmFtZXBsYXRlOiAnL3N0YXRpYy9tb2RlbC9uYW1lcGxhdGUuZGFlJyxcclxuXHRcdFx0Ly9kdW1teTogJy9zdGF0aWMvbW9kZWwvZHVtbXkuZ2x0ZicsXHJcblx0XHRcdC8vcGxheWVybWV0ZXI6ICcvc3RhdGljL21vZGVsL3BsYXllcm1ldGVyLmdsdGYnXHJcblx0XHR9LCB0aGVtZU1vZGVsc1t0aGVtZV0pLFxyXG5cdFx0dGV4dHVyZXM6IHtcclxuXHRcdFx0Ym9hcmRfbGFyZ2U6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1sYXJnZS5qcGdgLFxyXG5cdFx0XHRib2FyZF9tZWQ6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1tZWRpdW0uanBnYCxcclxuXHRcdFx0Ym9hcmRfc21hbGw6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1zbWFsbC5qcGdgLFxyXG5cdFx0XHRjYXJkczogYC9zdGF0aWMvaW1nLyR7dGhlbWV9L2NhcmRzLmpwZ2AsXHJcblx0XHRcdHJlc2V0OiAnL3N0YXRpYy9pbWcvYm9tYi5wbmcnLFxyXG5cdFx0XHRyZWZyZXNoOiAnL3N0YXRpYy9pbWcvcmVmcmVzaC5qcGcnXHJcblx0XHRcdC8vdGV4dDogJy9zdGF0aWMvaW1nL3RleHQucG5nJ1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0Y2FjaGU6IHt9LFxyXG5cdGZpeE1hdGVyaWFsczogZnVuY3Rpb24oKVxyXG5cdHtcclxuXHRcdE9iamVjdC5rZXlzKHRoaXMuY2FjaGUubW9kZWxzKS5mb3JFYWNoKGlkID0+IHtcclxuXHRcdFx0dGhpcy5jYWNoZS5tb2RlbHNbaWRdLnRyYXZlcnNlKG9iaiA9PiB7XHJcblx0XHRcdFx0aWYob2JqLm1hdGVyaWFsIGluc3RhbmNlb2YgVEhSRUUuTWVzaFN0YW5kYXJkTWF0ZXJpYWwpe1xyXG5cdFx0XHRcdFx0bGV0IG5ld01hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCgpO1xyXG5cdFx0XHRcdFx0bmV3TWF0Lm1hcCA9IG9iai5tYXRlcmlhbC5tYXA7XHJcblx0XHRcdFx0XHRuZXdNYXQuY29sb3IuY29weShvYmoubWF0ZXJpYWwuY29sb3IpO1xyXG5cdFx0XHRcdFx0bmV3TWF0LnRyYW5zcGFyZW50ID0gb2JqLm1hdGVyaWFsLnRyYW5zcGFyZW50O1xyXG5cdFx0XHRcdFx0bmV3TWF0LnNpZGUgPSBvYmoubWF0ZXJpYWwuc2lkZTtcclxuXHRcdFx0XHRcdG9iai5tYXRlcmlhbCA9IG5ld01hdDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBhc3NldHM7IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxubGV0IHBsYWNlaG9sZGVyR2VvID0gbmV3IFRIUkVFLkJveEJ1ZmZlckdlb21ldHJ5KC4wMDEsIC4wMDEsIC4wMDEpO1xyXG5sZXQgcGxhY2Vob2xkZXJNYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe2NvbG9yOiAweGZmZmZmZiwgdmlzaWJsZTogZmFsc2V9KTtcclxubGV0IFBsYWNlaG9sZGVyTWVzaCA9IG5ldyBUSFJFRS5NZXNoKHBsYWNlaG9sZGVyR2VvLCBwbGFjZWhvbGRlck1hdCk7XHJcblxyXG5jbGFzcyBOYXRpdmVDb21wb25lbnRcclxue1xyXG5cdGNvbnN0cnVjdG9yKG1lc2gsIG5lZWRzVXBkYXRlKVxyXG5cdHtcclxuXHRcdHRoaXMubWVzaCA9IG1lc2g7XHJcblx0XHRhbHRzcGFjZS5hZGROYXRpdmVDb21wb25lbnQodGhpcy5tZXNoLCB0aGlzLm5hbWUpO1xyXG5cclxuXHRcdGlmKG5lZWRzVXBkYXRlKVxyXG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlKGZpZWxkcyA9IHt9KVxyXG5cdHtcclxuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5kYXRhLCBmaWVsZHMpO1xyXG5cdFx0YWx0c3BhY2UudXBkYXRlTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lLCB0aGlzLmRhdGEpO1xyXG5cdH1cclxuXHJcblx0ZGVzdHJveSgpXHJcblx0e1xyXG5cdFx0YWx0c3BhY2UucmVtb3ZlTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5UZXh0IGV4dGVuZHMgTmF0aXZlQ29tcG9uZW50IHtcclxuXHRjb25zdHJ1Y3RvcihtZXNoKXtcclxuXHRcdHRoaXMubmFtZSA9ICduLXRleHQnO1xyXG5cdFx0dGhpcy5kYXRhID0ge1xyXG5cdFx0XHRmb250U2l6ZTogMTAsXHJcblx0XHRcdGhlaWdodDogMSxcclxuXHRcdFx0d2lkdGg6IDEwLFxyXG5cdFx0XHR2ZXJ0aWNhbEFsaWduOiAnbWlkZGxlJyxcclxuXHRcdFx0aG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJyxcclxuXHRcdFx0dGV4dDogJydcclxuXHRcdH07XHJcblx0XHRzdXBlcihtZXNoLCB0cnVlKTtcclxuXHJcblx0XHR0aGlzLmNvbG9yID0gJ2JsYWNrJztcclxuXHR9XHJcblx0dXBkYXRlKGZpZWxkcyA9IHt9KXtcclxuXHRcdGlmKGZpZWxkcy50ZXh0KVxyXG5cdFx0XHRpZih0aGlzLmNvbG9yKVxyXG5cdFx0XHRcdGZpZWxkcy50ZXh0ID0gYDxjb2xvcj0ke3RoaXMuY29sb3J9PiR7ZmllbGRzLnRleHR9PC9jb2xvcj5gO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0ZmllbGRzLnRleHQgPSBmaWVsZHMudGV4dDtcclxuXHRcdE5hdGl2ZUNvbXBvbmVudC5wcm90b3R5cGUudXBkYXRlLmNhbGwodGhpcywgZmllbGRzKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5Ta2VsZXRvblBhcmVudCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XHJcblx0Y29uc3RydWN0b3IobWVzaCl7XHJcblx0XHR0aGlzLm5hbWUgPSAnbi1za2VsZXRvbi1wYXJlbnQnO1xyXG5cdFx0dGhpcy5kYXRhID0ge1xyXG5cdFx0XHRpbmRleDogMCxcclxuXHRcdFx0cGFydDogJ2hlYWQnLFxyXG5cdFx0XHRzaWRlOiAnY2VudGVyJywgXHJcblx0XHRcdHVzZXJJZDogMFxyXG5cdFx0fTtcclxuXHRcdHN1cGVyKG1lc2gsIHRydWUpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgTkJpbGxib2FyZCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XHJcblx0Y29uc3RydWN0b3IobWVzaCl7XHJcblx0XHR0aGlzLm5hbWUgPSAnbi1iaWxsYm9hcmQnO1xyXG5cdFx0c3VwZXIobWVzaCwgZmFsc2UpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5UZXh0LCBOU2tlbGV0b25QYXJlbnQsIE5CaWxsYm9hcmR9OyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7TlNrZWxldG9uUGFyZW50fSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xyXG5pbXBvcnQge2FjdGl2ZVRoZW1lIGFzIHRoZW1lfSBmcm9tICcuL3RoZW1lJztcclxuXHJcbmNsYXNzIEhhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3Rvcihtb2RlbClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5jdXJyZW50SWQgPSAnJztcclxuXHRcdHRoaXMuY29tcG9uZW50cyA9IHtoYXQ6IG51bGwsIHRleHQ6IG51bGx9O1xyXG5cdFx0XHJcblx0XHRpZihtb2RlbC5wYXJlbnQpXHJcblx0XHRcdG1vZGVsLnBhcmVudC5yZW1vdmUobW9kZWwpO1xyXG5cdFx0bW9kZWwudXBkYXRlTWF0cml4V29ybGQodHJ1ZSk7XHJcblxyXG5cdFx0Ly8gZ3JhYiBtZXNoZXNcclxuXHRcdGxldCBwcm9wID0gJyc7XHJcblx0XHRtb2RlbC50cmF2ZXJzZShvYmogPT4ge1xyXG5cdFx0XHRpZihvYmoubmFtZSA9PT0gJ2hhdCcgfHwgb2JqLm5hbWUgPT09ICd0ZXh0Jyl7XHJcblx0XHRcdFx0cHJvcCA9IG9iai5uYW1lO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYob2JqIGluc3RhbmNlb2YgVEhSRUUuTWVzaCl7XHJcblx0XHRcdFx0dGhpc1twcm9wXSA9IG9iajtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gc3RyaXAgb3V0IG1pZGRsZSBub2Rlc1xyXG5cdFx0aWYodGhpcy5oYXQpe1xyXG5cdFx0XHR0aGlzLmhhdC5tYXRyaXguY29weSh0aGlzLmhhdC5tYXRyaXhXb3JsZCk7XHJcblx0XHRcdHRoaXMuaGF0Lm1hdHJpeC5kZWNvbXBvc2UodGhpcy5oYXQucG9zaXRpb24sIHRoaXMuaGF0LnF1YXRlcm5pb24sIHRoaXMuaGF0LnNjYWxlKTtcclxuXHRcdFx0dGhpcy5hZGQodGhpcy5oYXQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHRoaXMudGV4dCl7XHJcblx0XHRcdHRoaXMudGV4dC5tYXRyaXguY29weSh0aGlzLnRleHQubWF0cml4V29ybGQpO1xyXG5cdFx0XHR0aGlzLnRleHQubWF0cml4LmRlY29tcG9zZSh0aGlzLnRleHQucG9zaXRpb24sIHRoaXMudGV4dC5xdWF0ZXJuaW9uLCB0aGlzLnRleHQuc2NhbGUpO1xyXG5cdFx0XHR0aGlzLmFkZCh0aGlzLnRleHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGQuc2NlbmUuYWRkKHRoaXMpO1xyXG5cdH1cclxuXHJcblx0c2V0T3duZXIodXNlcklkKVxyXG5cdHtcclxuXHRcdGlmKCF0aGlzLmN1cnJlbnRJZCAmJiB1c2VySWQpe1xyXG5cdFx0XHRkLnNjZW5lLmFkZCh0aGlzKTtcclxuXHRcdFx0aWYodGhpcy5oYXQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdCA9IG5ldyBOU2tlbGV0b25QYXJlbnQodGhpcy5oYXQpO1xyXG5cdFx0XHRpZih0aGlzLnRleHQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQgPSBuZXcgTlNrZWxldG9uUGFyZW50KHRoaXMudGV4dCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKHRoaXMuY3VycmVudElkICYmICF1c2VySWQpe1xyXG5cdFx0XHRpZih0aGlzLmhhdClcclxuXHRcdFx0XHR0aGlzLmNvbXBvbmVudHMuaGF0LmRlc3Ryb3koKTtcclxuXHRcdFx0aWYodGhpcy50ZXh0KVxyXG5cdFx0XHRcdHRoaXMuY29tcG9uZW50cy50ZXh0LmRlc3Ryb3koKTtcclxuXHRcdFx0ZC5zY2VuZS5yZW1vdmUodGhpcyk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYodXNlcklkKXtcclxuXHRcdFx0aWYodGhpcy5oYXQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdC51cGRhdGUoe3VzZXJJZH0pO1xyXG5cdFx0XHRpZih0aGlzLnRleHQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQudXBkYXRlKHt1c2VySWR9KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmN1cnJlbnRJZCA9IHVzZXJJZDtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIFByZXNpZGVudEhhdCBleHRlbmRzIEhhdFxyXG57XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdGlmKHRoZW1lID09PSAnY2Flc2FyJylcclxuXHRcdHtcclxuXHRcdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLmxhdXJlbHMuY2xvbmUoKSk7XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC4wOC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xyXG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCguNSwgMCwgMCk7XHJcblx0XHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMC44L1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHR9XHJcblx0XHRlbHNlXHJcblx0XHR7XHJcblx0XHRcdHN1cGVyKEFNLmNhY2hlLm1vZGVscy50b3BoYXQpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjE0NC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigxLjIvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0bGV0IGFzc2lnbkhhdCA9ICh7ZGF0YToge2dhbWV9fSkgPT4ge1xyXG5cdFx0XHRsZXQgc2l0dGluZyA9IGdhbWUuc3BlY2lhbEVsZWN0aW9uID8gZ2FtZS5wcmVzaWRlbnQgOiBnYW1lLmxhc3RQcmVzaWRlbnQ7XHJcblx0XHRcdHRoaXMuc2V0T3duZXIoc2l0dGluZyk7XHJcblx0XHR9XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3BlY2lhbEVsZWN0aW9uJywgYXNzaWduSGF0KTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9wcmVzaWRlbnQnLCBhc3NpZ25IYXQpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2xhc3RQcmVzaWRlbnQnLCBhc3NpZ25IYXQpO1xyXG5cdH1cclxufTtcclxuXHJcbmNsYXNzIENoYW5jZWxsb3JIYXQgZXh0ZW5kcyBIYXRcclxue1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRpZih0aGVtZSA9PT0gJ2NhZXNhcicpe1xyXG5cdFx0XHRzdXBlcihBTS5jYWNoZS5tb2RlbHMubGF1cmVscy5jbG9uZSgpKTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLjA4L1NILmVudi5waXhlbHNQZXJNZXRlciwgLjAzL1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KC41LCAwLCAwKTtcclxuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigwLjgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdH1cclxuXHRcdGVsc2VcclxuXHRcdHtcclxuXHRcdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLnZpc29yY2FwKTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4wNy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigxLjIvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdH1cclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGFzdENoYW5jZWxsb3InLCBlID0+IHtcclxuXHRcdFx0dGhpcy5zZXRPd25lcihlLmRhdGEuZ2FtZS5sYXN0Q2hhbmNlbGxvcik7XHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuY2xhc3MgQmVoYXZpb3Jcclxue1xyXG5cdGNvbnN0cnVjdG9yKHR5cGUpe1xyXG5cdFx0dGhpcy50eXBlID0gdHlwZTtcclxuXHR9XHJcblxyXG5cdGF3YWtlKG9iail7XHJcblx0XHR0aGlzLm9iamVjdDNEID0gb2JqO1xyXG5cdH1cclxuXHJcblx0c3RhcnQoKXsgfVxyXG5cclxuXHR1cGRhdGUoZFQpeyB9XHJcblxyXG5cdGRpc3Bvc2UoKXsgfVxyXG59XHJcblxyXG5jbGFzcyBCU3luYyBleHRlbmRzIEJlaGF2aW9yXHJcbntcclxuXHRjb25zdHJ1Y3RvcihldmVudE5hbWUpXHJcblx0e1xyXG5cdFx0c3VwZXIoJ0JTeW5jJyk7XHJcblx0XHR0aGlzLl9zID0gU0guc29ja2V0O1xyXG5cclxuXHRcdC8vIGxpc3RlbiBmb3IgdXBkYXRlIGV2ZW50c1xyXG5cdFx0dGhpcy5ob29rID0gdGhpcy5fcy5vbihldmVudE5hbWUsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcclxuXHRcdHRoaXMuZXZlbnROYW1lID0gZXZlbnROYW1lO1xyXG5cdFx0dGhpcy5vd25lciA9IDA7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVGcm9tU2VydmVyKGRhdGEpXHJcblx0e1xyXG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XHJcblx0XHR0aGlzLm9iamVjdDNELnJvdGF0aW9uLmZyb21BcnJheShkYXRhLCAzKTtcclxuXHR9XHJcblxyXG5cdHRha2VPd25lcnNoaXAoKVxyXG5cdHtcclxuXHRcdGlmKFNILmxvY2FsVXNlciAmJiBTSC5sb2NhbFVzZXIudXNlcklkKVxyXG5cdFx0XHR0aGlzLm93bmVyID0gU0gubG9jYWxVc2VyLnVzZXJJZDtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZShkVClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIgJiYgU0gubG9jYWxVc2VyLnNrZWxldG9uICYmIFNILmxvY2FsVXNlci5pZCA9PT0gdGhpcy5vd25lcilcclxuXHRcdHtcclxuXHRcdFx0bGV0IGogPSBTSC5sb2NhbFVzZXIuc2tlbGV0b24uZ2V0Sm9pbnQoJ0hlYWQnKTtcclxuXHRcdFx0dGhpcy5fcy5lbWl0KHRoaXMuZXZlbnROYW1lLCBbLi4uai5wb3NpdGlvbi50b0FycmF5KCksIC4uLmoucm90YXRpb24udG9BcnJheSgpXSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxufVxyXG5cclxuZXhwb3J0IHsgQmVoYXZpb3IsIEJTeW5jIH07XHJcbiIsImltcG9ydCB7IEJlaGF2aW9yIH0gZnJvbSAnLi9iZWhhdmlvcic7XHJcblxyXG5jbGFzcyBRdWF0ZXJuaW9uVHdlZW4gZXh0ZW5kcyBUV0VFTi5Ud2VlblxyXG57XHJcblx0Y29uc3RydWN0b3Ioc3RhdGUsIGdyb3VwKXtcclxuXHRcdHN1cGVyKHt0OiAwfSwgZ3JvdXApO1xyXG5cdFx0dGhpcy5fc3RhdGUgPSBzdGF0ZTtcclxuXHRcdHRoaXMuX3N0YXJ0ID0gc3RhdGUuY2xvbmUoKTtcclxuXHR9XHJcblx0dG8oZW5kLCBkdXJhdGlvbil7XHJcblx0XHRzdXBlci50byh7dDogMX0sIGR1cmF0aW9uKTtcclxuXHRcdHRoaXMuX2VuZCA9IGVuZCBpbnN0YW5jZW9mIFRIUkVFLlF1YXRlcm5pb24gPyBbZW5kXSA6IGVuZDtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH1cclxuXHRzdGFydCgpe1xyXG5cdFx0dGhpcy5vblVwZGF0ZSgoe3Q6IHByb2dyZXNzfSkgPT4ge1xyXG5cdFx0XHRwcm9ncmVzcyA9IHByb2dyZXNzICogdGhpcy5fZW5kLmxlbmd0aDtcclxuXHRcdFx0bGV0IG5leHRQb2ludCA9IE1hdGguY2VpbChwcm9ncmVzcyk7XHJcblx0XHRcdGxldCBsb2NhbFByb2dyZXNzID0gcHJvZ3Jlc3MgLSBuZXh0UG9pbnQgKyAxO1xyXG5cdFx0XHRsZXQgcG9pbnRzID0gW3RoaXMuX3N0YXJ0LCAuLi50aGlzLl9lbmRdO1xyXG5cdFx0XHRUSFJFRS5RdWF0ZXJuaW9uLnNsZXJwKHBvaW50c1tuZXh0UG9pbnQtMV0sIHBvaW50c1tuZXh0UG9pbnRdLCB0aGlzLl9zdGF0ZSwgbG9jYWxQcm9ncmVzcyk7XHJcblx0XHR9KTtcclxuXHRcdHJldHVybiBzdXBlci5zdGFydCgpO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gV2FpdEZvckFuaW1zKHR3ZWVucylcclxue1xyXG5cdGxldCBwID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cclxuXHR7XHJcblx0XHRsZXQgYWN0aXZlQ291bnQgPSB0d2VlbnMubGVuZ3RoO1xyXG5cdFx0ZnVuY3Rpb24gY2hlY2tEb25lKCl7XHJcblx0XHRcdGlmKC0tYWN0aXZlQ291bnQgPT09IDApIHJlc29sdmUoKTtcclxuXHRcdH1cclxuXHJcblx0XHR0d2VlbnMuZm9yRWFjaCh0ID0+IHQub25Db21wbGV0ZShjaGVja0RvbmUpKTtcclxuXHRcdHR3ZWVucy5mb3JFYWNoKHQgPT4gdC5vblN0b3AocmVqZWN0KSk7XHJcblx0XHR0d2VlbnMuZm9yRWFjaCh0ID0+IHQuc3RhcnQoKSk7XHJcblx0fSk7XHJcblx0cC50d2VlbnMgPSB0d2VlbnM7XHJcblx0cmV0dXJuIHA7XHJcbn1cclxuXHJcbmNvbnN0IHNwaW5Qb2ludHMgPSBbXHJcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgTWF0aC5zcXJ0KDIpLzIsIDAsIE1hdGguc3FydCgyKS8yKSxcclxuXHRuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAxLCAwLCAwKSxcclxuXHRuZXcgVEhSRUUuUXVhdGVybmlvbigwLCBNYXRoLnNxcnQoMikvMiwgMCwgLU1hdGguc3FydCgyKS8yKSxcclxuXHRuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAwLCAwLCAxKVxyXG5dO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQW5pbWF0ZVxyXG57XHJcblx0LyoqXHJcblx0ICogTW92ZSBhbiBvYmplY3QgZnJvbSBBIHRvIEJcclxuXHQgKiBAcGFyYW0ge1RIUkVFLk9iamVjdDNEfSB0YXJnZXQgXHJcblx0ICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcclxuXHQgKi9cclxuXHRzdGF0aWMgc2ltcGxlKHRhcmdldCwge3BhcmVudD1udWxsLCBwb3M9bnVsbCwgcXVhdD1udWxsLCBzY2FsZT1udWxsLCBodWU9bnVsbCwgbWF0cml4PW51bGwsIGR1cmF0aW9uPTYwMH0gPSB7fSlcclxuXHR7XHJcblx0XHQvLyBleHRyYWN0IHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlIGZyb20gbWF0cml4XHJcblx0XHRpZihtYXRyaXgpe1xyXG5cdFx0XHRwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRxdWF0ID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcclxuXHRcdFx0c2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRtYXRyaXguZGVjb21wb3NlKHBvcywgcXVhdCwgc2NhbGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHNodWZmbGUgaGllcmFyY2h5LCBidXQga2VlcCB3b3JsZCB0cmFuc2Zvcm0gdGhlIHNhbWVcclxuXHRcdGlmKHBhcmVudCAmJiB0aGlzLnBhcmVudCAhPT0gdGFyZ2V0LnBhcmVudCl7XHJcblx0XHRcdHRhcmdldC5hcHBseU1hdHJpeCh0YXJnZXQucGFyZW50Lm1hdHJpeFdvcmxkKTtcclxuXHRcdFx0dGFyZ2V0LmFwcGx5TWF0cml4KG5ldyBUSFJFRS5NYXRyaXg0KCkuZ2V0SW52ZXJzZShwYXJlbnQubWF0cml4V29ybGQpKTtcclxuXHRcdFx0cGFyZW50LmFkZChvYmopO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBhbmltcyA9IFtdO1xyXG5cclxuXHRcdGlmKHBvcyl7XHJcblx0XHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKHRhcmdldC5wb3NpdGlvbilcclxuXHRcdFx0XHQudG8oe3g6IHBvcy54LCB5OiBwb3MueSwgejogcG9zLnp9LCBkdXJhdGlvbilcclxuXHRcdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0KVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHF1YXQpe1xyXG5cdFx0XHRhbmltcy5wdXNoKG5ldyBRdWF0ZXJuaW9uVHdlZW4odGFyZ2V0LnF1YXRlcm5pb24pXHJcblx0XHRcdFx0LnRvKHF1YXQsIGR1cmF0aW9uKVxyXG5cdFx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoc2NhbGUpe1xyXG5cdFx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2Vlbih0YXJnZXQuc2NhbGUpXHJcblx0XHRcdFx0LnRvKHt4OiBzY2FsZS54LCB5OiBzY2FsZS55LCB6OiBzY2FsZS56fSwgZHVyYXRpb24pXHJcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZihodWUgIT09IG51bGwpe1xyXG5cdFx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2Vlbih0YXJnZXQubWF0ZXJpYWwuY29sb3IuZ2V0SFNMKCkpXHJcblx0XHRcdFx0LnRvKHtoOiBodWV9LCBkdXJhdGlvbilcclxuXHRcdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0KVxyXG5cdFx0XHRcdC5vblVwZGF0ZSh0d2VlbiA9PiB7XHJcblx0XHRcdFx0XHR0YXJnZXQubWF0ZXJpYWwuY29sb3Iuc2V0SFNMKHR3ZWVuLmgsIHR3ZWVuLnMsIHR3ZWVuLmwpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgd2FpdChkdXJhdGlvbil7XHJcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG5cdFx0XHRzZXRUaW1lb3V0KHJlc29sdmUsIGR1cmF0aW9uKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWFrZSB0aGUgY2FyZCBhcHBlYXIgd2l0aCBhIGZsb3VyaXNoXHJcblx0ICogQHBhcmFtIHtUSFJFRS5PYmplY3QzRH0gY2FyZCBcclxuXHQgKi9cclxuXHRzdGF0aWMgY2FyZEZsb3VyaXNoKGNhcmQpXHJcblx0e1xyXG5cdFx0Y2FyZC5wb3NpdGlvbi5zZXQoMCwgMCwgMCk7XHJcblx0XHRjYXJkLnF1YXRlcm5pb24uc2V0KDAsMCwwLDEpO1xyXG5cdFx0Y2FyZC5zY2FsZS5zZXRTY2FsYXIoLjAwMSk7XHJcblxyXG5cdFx0bGV0IGFuaW1zID0gW107XHJcblxyXG5cdFx0Ly8gYWRkIHBvc2l0aW9uIGFuaW1hdGlvblxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4oY2FyZC5wb3NpdGlvbilcclxuXHRcdFx0LnRvKHt4OiAwLCB5OiAuNywgejogMH0sIDE1MDApXHJcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLkVsYXN0aWMuT3V0KVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBhZGQgc3BpbiBhbmltYXRpb25cclxuXHRcdGFuaW1zLnB1c2gobmV3IFF1YXRlcm5pb25Ud2VlbihjYXJkLnF1YXRlcm5pb24pXHJcblx0XHRcdC50byhzcGluUG9pbnRzLCAyNTAwKVxyXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0KVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBhZGQgc2NhbGUgYW5pbWF0aW9uXHJcblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihjYXJkLnNjYWxlKVxyXG5cdFx0XHQudG8oe3g6IC41LCB5OiAuNSwgejogLjV9LCAyMDApXHJcblx0XHQpO1xyXG5cclxuXHRcdHJldHVybiBXYWl0Rm9yQW5pbXMoYW5pbXMpO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIHZhbmlzaChjYXJkKVxyXG5cdHtcclxuXHRcdGxldCBhbmltcyA9IFtdO1xyXG5cclxuXHRcdC8vIGFkZCBtb3ZlIGFuaW1hdGlvblxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4oY2FyZC5wb3NpdGlvbilcclxuXHRcdFx0LnRvKHt5OiAnKzAuNSd9LCAxMDAwKVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBhZGQgZGlzYXBwZWFyIGFuaW1hdGlvblxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4oY2FyZC5tYXRlcmlhbClcclxuXHRcdFx0LnRvKHtvcGFjaXR5OiAwfSwgMTAwMClcclxuXHRcdCk7XHJcblxyXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgYm9iKG9iaiwgYW1wbGl0dWRlID0gLjA4LCBwZXJpb2QgPSA0MDAwKVxyXG5cdHtcclxuXHRcdHJldHVybiBuZXcgVFdFRU4uVHdlZW4ob2JqLnBvc2l0aW9uKVxyXG5cdFx0XHQudG8oe3k6IG9iai5wb3NpdGlvbi55LWFtcGxpdHVkZX0sIHBlcmlvZClcclxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuU2ludXNvaWRhbC5Jbk91dClcclxuXHRcdFx0LnJlcGVhdChJbmZpbml0eSlcclxuXHRcdFx0LnlveW8odHJ1ZSlcclxuXHRcdFx0LnN0YXJ0KCk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgc3BpbihvYmosIHBlcmlvZCA9IDEwMDAwKVxyXG5cdHtcclxuXHRcdHJldHVybiBuZXcgUXVhdGVybmlvblR3ZWVuKG9iai5xdWF0ZXJuaW9uKVxyXG5cdFx0XHQudG8oc3BpblBvaW50cywgcGVyaW9kKVxyXG5cdFx0XHQucmVwZWF0KEluZmluaXR5KVxyXG5cdFx0XHQuc3RhcnQoKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyB3aW5rSW4ob2JqLCBkdXJhdGlvbiA9IDIwMClcclxuXHR7XHJcblx0XHRpZighb2JqLnVzZXJEYXRhLnNjYWxlT3JpZylcclxuXHRcdFx0b2JqLnVzZXJEYXRhLnNjYWxlT3JpZyA9IG9iai5zY2FsZS5jbG9uZSgpO1xyXG5cclxuXHRcdGxldCBhbmltcyA9IFtdO1xyXG5cclxuXHRcdG9iai5zY2FsZS5zZXRTY2FsYXIoLjAwMSk7XHJcblx0XHRvYmoudmlzaWJsZSA9IHRydWU7XHJcblxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4ob2JqLnNjYWxlKVxyXG5cdFx0XHQudG8oe3k6IG9iai51c2VyRGF0YS5zY2FsZU9yaWcueX0sIGR1cmF0aW9uKVxyXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5DdWJpYy5JbilcclxuXHRcdCk7XHJcblxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4ob2JqLnNjYWxlKVxyXG5cdFx0XHQudG8oe3g6IG9iai51c2VyRGF0YS5zY2FsZU9yaWcueCwgejogb2JqLnVzZXJEYXRhLnNjYWxlT3JpZy56fSwgLjIqZHVyYXRpb24pXHJcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLkN1YmljLkluKVxyXG5cdFx0KTtcclxuXHJcblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKGFuaW1zKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyB3aW5rT3V0KG9iaiwgZHVyYXRpb24gPSAyMDApXHJcblx0e1xyXG5cdFx0aWYoIW9iai51c2VyRGF0YS5zY2FsZU9yaWcpXHJcblx0XHRcdG9iai51c2VyRGF0YS5zY2FsZU9yaWcgPSBvYmouc2NhbGUuY2xvbmUoKTtcclxuXHJcblx0XHRsZXQgYW5pbXMgPSBbXTtcclxuXHRcdG9iai52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4ob2JqLnNjYWxlKVxyXG5cdFx0XHQudG8oe3k6IC4wMDF9LCBkdXJhdGlvbilcclxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuQ3ViaWMuT3V0KVxyXG5cdFx0KTtcclxuXHJcblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihvYmouc2NhbGUpXHJcblx0XHRcdC50byh7eDogLjAwMSwgejogLjAwMX0sIC4yKmR1cmF0aW9uKVxyXG5cdFx0XHQuZGVsYXkoLjgqZHVyYXRpb24pXHJcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLkN1YmljLk91dClcclxuXHRcdFx0Lm9uQ29tcGxldGUoKCkgPT4geyBvYmoudmlzaWJsZSA9IGZhbHNlOyB9KVxyXG5cdFx0KTtcclxuXHJcblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKGFuaW1zKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBzd2luZ0luKG9iaiwgcm90YXRpb249TWF0aC5QSS8yLCByYWRpdXM9MC41LCBkdXJhdGlvbj0zMDApXHJcblx0e1xyXG5cdFx0aWYoIW9iai51c2VyRGF0YS50cmFuc2Zvcm0pXHJcblx0XHRcdG9iai51c2VyRGF0YS50cmFuc2Zvcm0gPSB7XHJcblx0XHRcdFx0cm90YXRpb246IG9iai5yb3RhdGlvbi54LFxyXG5cdFx0XHRcdHBvc2l0aW9uOiBvYmoucG9zaXRpb24uY2xvbmUoKVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdC8vIHB1dCBhdCBzdGFydCBwb3NpdGlvblxyXG5cdFx0b2JqLnRyYW5zbGF0ZVkoLXJhZGl1cyk7XHJcblx0XHRvYmoucm90YXRpb24ueCA9IG9iai51c2VyRGF0YS50cmFuc2Zvcm0ucm90YXRpb24gKyByb3RhdGlvbjtcclxuXHRcdG9iai50cmFuc2xhdGVZKHJhZGl1cyk7XHJcblxyXG5cdFx0bGV0IGFuaW0gPSBuZXcgVFdFRU4uVHdlZW4oe3Q6MX0pXHJcblx0XHRcdC50byh7dDogMH0sIGR1cmF0aW9uKVxyXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5Cb3VuY2UuT3V0KVxyXG5cdFx0XHQub25VcGRhdGUoKHt0fSkgPT4ge1xyXG5cdFx0XHRcdG9iai50cmFuc2xhdGVZKC1yYWRpdXMpO1xyXG5cdFx0XHRcdG9iai5yb3RhdGlvbi54ID0gb2JqLnVzZXJEYXRhLnRyYW5zZm9ybS5yb3RhdGlvbiArIHQqcm90YXRpb247XHJcblx0XHRcdFx0b2JqLnRyYW5zbGF0ZVkocmFkaXVzKTtcclxuXHRcdFx0fSlcclxuXHRcdFx0Lm9uU3RvcCgoKSA9PiB7XHJcblx0XHRcdFx0b2JqLnRyYW5zbGF0ZVkoLXJhZGl1cyk7XHJcblx0XHRcdFx0b2JqLnJvdGF0aW9uLnggPSBvYmoudXNlckRhdGEudHJhbnNmb3JtLnJvdGF0aW9uICsgcm90YXRpb247XHJcblx0XHRcdFx0b2JqLnRyYW5zbGF0ZVkocmFkaXVzKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhbYW5pbV0pO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIHN3aW5nT3V0KG9iaiwgcm90YXRpb249TWF0aC5QSS8yLCByYWRpdXM9MC41LCBkdXJhdGlvbj0zMDApXHJcblx0e1xyXG5cdFx0aWYoIW9iai51c2VyRGF0YS50cmFuc2Zvcm0pXHJcblx0XHRcdG9iai51c2VyRGF0YS50cmFuc2Zvcm0gPSB7XHJcblx0XHRcdFx0cm90YXRpb246IG9iai5yb3RhdGlvbi54LFxyXG5cdFx0XHRcdHBvc2l0aW9uOiBvYmoucG9zaXRpb24uY2xvbmUoKVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdG9iai5yb3RhdGlvbi54ID0gb2JqLnVzZXJEYXRhLnRyYW5zZm9ybS5yb3RhdGlvbjtcclxuXHRcdG9iai5wb3NpdGlvbi5jb3B5KG9iai51c2VyRGF0YS50cmFuc2Zvcm0ucG9zaXRpb24pO1xyXG5cclxuXHRcdGxldCBhbmltID0gbmV3IFRXRUVOLlR3ZWVuKHt0OjB9KVxyXG5cdFx0XHQudG8oe3Q6IDF9LCBkdXJhdGlvbilcclxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLkluKVxyXG5cdFx0XHQub25VcGRhdGUoKHt0fSkgPT4ge1xyXG5cdFx0XHRcdG9iai50cmFuc2xhdGVZKC1yYWRpdXMpO1xyXG5cdFx0XHRcdG9iai5yb3RhdGlvbi54ID0gb2JqLnVzZXJEYXRhLnRyYW5zZm9ybS5yb3RhdGlvbiArIHQqcm90YXRpb247XHJcblx0XHRcdFx0b2JqLnRyYW5zbGF0ZVkocmFkaXVzKTtcclxuXHRcdFx0fSlcclxuXHRcdFx0Lm9uU3RvcCgoKSA9PiB7XHJcblx0XHRcdFx0b2JqLnJvdGF0aW9uLnggPSBvYmoudXNlckRhdGEudHJhbnNmb3JtLnJvdGF0aW9uO1xyXG5cdFx0XHRcdG9iai5wb3NpdGlvbi5jb3B5KG9iai51c2VyRGF0YS50cmFuc2Zvcm0ucG9zaXRpb24pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKFthbmltXSk7XHJcblx0fVxyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuLy8gZW51bSBjb25zdGFudHNcclxubGV0IFR5cGVzID0gT2JqZWN0LmZyZWV6ZSh7XHJcblx0UE9MSUNZX0xJQkVSQUw6IDAsXHJcblx0UE9MSUNZX0ZBU0NJU1Q6IDEsXHJcblx0Uk9MRV9MSUJFUkFMOiAyLFxyXG5cdFJPTEVfRkFTQ0lTVDogMyxcclxuXHRST0xFX0hJVExFUjogNCxcclxuXHRQQVJUWV9MSUJFUkFMOiA1LFxyXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXHJcblx0SkE6IDcsXHJcblx0TkVJTjogOCxcclxuXHRCTEFOSzogOSxcclxuXHRDUkVESVRTOiAxMCxcclxuXHRWRVRPOiAxMVxyXG59KTtcclxuXHJcbmxldCBnZW9tZXRyeSA9IG51bGwsIG1hdGVyaWFsID0gbnVsbDtcclxuXHJcbmZ1bmN0aW9uIGluaXRDYXJkRGF0YSgpXHJcbntcclxuXHRsZXQgZmxvYXREYXRhID0gW1xyXG5cdFx0Ly8gcG9zaXRpb24gKHBvcnRyYWl0KVxyXG5cdFx0MC4zNTc1LCAwLjUsIDAuMDAwNSxcclxuXHRcdC0uMzU3NSwgMC41LCAwLjAwMDUsXHJcblx0XHQtLjM1NzUsIC0uNSwgMC4wMDA1LFxyXG5cdFx0MC4zNTc1LCAtLjUsIDAuMDAwNSxcclxuXHRcdDAuMzU3NSwgMC41LCAtLjAwMDUsXHJcblx0XHQtLjM1NzUsIDAuNSwgLS4wMDA1LFxyXG5cdFx0LS4zNTc1LCAtLjUsIC0uMDAwNSxcclxuXHRcdDAuMzU3NSwgLS41LCAtLjAwMDUsXHJcblx0XHJcblx0XHQvLyBwb3NpdGlvbiAobGFuZHNjYXBlKVxyXG5cdFx0MC41LCAtLjM1NzUsIDAuMDAwNSxcclxuXHRcdDAuNSwgMC4zNTc1LCAwLjAwMDUsXHJcblx0XHQtLjUsIDAuMzU3NSwgMC4wMDA1LFxyXG5cdFx0LS41LCAtLjM1NzUsIDAuMDAwNSxcclxuXHRcdDAuNSwgLS4zNTc1LCAtLjAwMDUsXHJcblx0XHQwLjUsIDAuMzU3NSwgLS4wMDA1LFxyXG5cdFx0LS41LCAwLjM1NzUsIC0uMDAwNSxcclxuXHRcdC0uNSwgLS4zNTc1LCAtLjAwMDUsXHJcblx0XHJcblx0XHQvLyBVVnNcclxuXHRcdC8qIC0tLS0tLS0tLS0tLS0tIGNhcmQgZmFjZSAtLS0tLS0tLS0tLS0tICovIC8qIC0tLS0tLS0tLS0tLS0gY2FyZCBiYWNrIC0tLS0tLS0tLS0tLS0tKi9cclxuXHRcdC43NTQsLjk5NiwgLjc1NCwuODM0LCAuOTk3LC44MzQsIC45OTcsLjk5NiwgLjc1NCwuODM0LCAuNzU0LC45OTYsIC45OTcsLjk5NiwgLjk5NywuODM0LCAvLyBsaWJlcmFsIHBvbGljeVxyXG5cdFx0Ljc1NCwuODIyLCAuNzU0LC42NjAsIC45OTYsLjY2MCwgLjk5NiwuODIyLCAuNzU0LC42NjAsIC43NTQsLjgyMiwgLjk5NiwuODIyLCAuOTk2LC42NjAsIC8vIGZhc2Npc3QgcG9saWN5XHJcblx0XHQuNzQ2LC45OTYsIC41MDUsLjk5NiwgLjUwNSwuNjUwLCAuNzQ2LC42NTAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbGliZXJhbCByb2xlXHJcblx0XHQuNzQ2LC42NDUsIC41MDUsLjY0NSwgLjUwNSwuMzAwLCAuNzQ2LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gZmFzY2lzdCByb2xlXHJcblx0XHQuOTk2LC42NDUsIC43NTQsLjY0NSwgLjc1NCwuMzAwLCAuOTk2LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gaGl0bGVyIHJvbGVcclxuXHRcdC40OTUsLjk5NiwgLjI1NSwuOTk2LCAuMjU1LC42NTAsIC40OTUsLjY1MCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBsaWJlcmFsIHBhcnR5XHJcblx0XHQuNDk1LC42NDUsIC4yNTUsLjY0NSwgLjI1NSwuMzAwLCAuNDk1LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gZmFzY2lzdCBwYXJ0eVxyXG5cdFx0LjI0NCwuOTkyLCAuMDA1LC45OTIsIC4wMDUsLjY1MywgLjI0NCwuNjUzLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGphXHJcblx0XHQuMjQzLC42NDIsIC4wMDYsLjY0MiwgLjAwNiwuMzAyLCAuMjQzLC4zMDIsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbmVpblxyXG5cdFx0LjAyMSwuMjY5LCAuMDIxLC4wMjIsIC4zNzUsLjAyMiwgLjM3NSwuMjY5LCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGJsYW5rXHJcblx0XHQuMzk3LC4yNzYsIC4zOTcsLjAxNSwgLjc2NSwuMDE1LCAuNzY1LC4yNzYsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gY3JlZGl0c1xyXG5cdFx0Ljk2MywuMjcwLCAuODA0LC4yNzAsIC44MDQsLjAyOSwgLjk2MywuMDI5LCAuODA0LC4yNzAsIC45NjMsLjI3MCwgLjk2MywuMDI5LCAuODA0LC4wMjksIC8vIHZldG9cclxuXHJcblx0XTtcclxuXHRcclxuXHRsZXQgaW50RGF0YSA9IFtcclxuXHRcdC8vIHRyaWFuZ2xlIGluZGV4XHJcblx0XHQwLDEsMiwgMCwyLDMsIDQsNyw1LCA1LDcsNlxyXG5cdF07XHJcblx0XHJcblx0Ly8gdHdvIHBvc2l0aW9uIHNldHMsIDExIFVWIHNldHMsIDEgaW5kZXggc2V0XHJcblx0bGV0IGdlb0J1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcig0KmZsb2F0RGF0YS5sZW5ndGggKyAyKmludERhdGEubGVuZ3RoKTtcclxuXHRsZXQgdGVtcCA9IG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCAwLCBmbG9hdERhdGEubGVuZ3RoKTtcclxuXHR0ZW1wLnNldChmbG9hdERhdGEpO1xyXG5cdHRlbXAgPSBuZXcgVWludDE2QXJyYXkoZ2VvQnVmZmVyLCA0KmZsb2F0RGF0YS5sZW5ndGgsIGludERhdGEubGVuZ3RoKTtcclxuXHR0ZW1wLnNldChpbnREYXRhKTtcclxuXHRcclxuXHQvLyBjaG9wIHVwIGJ1ZmZlciBpbnRvIHZlcnRleCBhdHRyaWJ1dGVzXHJcblx0bGV0IHBvc0xlbmd0aCA9IDgqMywgdXZMZW5ndGggPSA4KjIsIGluZGV4TGVuZ3RoID0gMTI7XHJcblx0bGV0IHBvc1BvcnRyYWl0ID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgMCwgcG9zTGVuZ3RoKSwgMyksXHJcblx0XHRwb3NMYW5kc2NhcGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCA0KnBvc0xlbmd0aCwgcG9zTGVuZ3RoKSwgMyk7XHJcblx0bGV0IHV2cyA9IFtdO1xyXG5cdGZvcihsZXQgaT0wOyBpPDEyOyBpKyspe1xyXG5cdFx0dXZzLnB1c2goIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDgqcG9zTGVuZ3RoICsgNCppKnV2TGVuZ3RoLCB1dkxlbmd0aCksIDIpICk7XHJcblx0fVxyXG5cdGxldCBpbmRleCA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IFVpbnQxNkFycmF5KGdlb0J1ZmZlciwgNCpmbG9hdERhdGEubGVuZ3RoLCBpbmRleExlbmd0aCksIDEpO1xyXG5cdFxyXG5cdGdlb21ldHJ5ID0gT2JqZWN0LmtleXMoVHlwZXMpLm1hcCgoa2V5LCBpKSA9PlxyXG5cdHtcclxuXHRcdGxldCBnZW8gPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcclxuXHRcdGdlby5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgaT09VHlwZXMuSkEgfHwgaT09VHlwZXMuTkVJTiA/IHBvc0xhbmRzY2FwZSA6IHBvc1BvcnRyYWl0KTtcclxuXHRcdGdlby5hZGRBdHRyaWJ1dGUoJ3V2JywgdXZzW2ldKTtcclxuXHRcdGdlby5zZXRJbmRleChpbmRleCk7XHJcblx0XHRyZXR1cm4gZ2VvO1xyXG5cdH0pO1xyXG5cclxuXHRtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KTtcclxufVxyXG5cclxuXHJcbmNsYXNzIENhcmQgZXh0ZW5kcyBUSFJFRS5NZXNoXHJcbntcclxuXHRjb25zdHJ1Y3Rvcih0eXBlID0gVHlwZXMuQkxBTkspXHJcblx0e1xyXG5cdFx0aWYoIWdlb21ldHJ5IHx8ICFtYXRlcmlhbCkgaW5pdENhcmREYXRhKCk7XHJcblxyXG5cdFx0bGV0IGdlbyA9IGdlb21ldHJ5W3R5cGVdO1xyXG5cdFx0c3VwZXIoZ2VvLCBtYXRlcmlhbCk7XHJcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjcpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgQmxhbmtDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXsgc3VwZXIoKTsgfVxyXG59XHJcblxyXG5jbGFzcyBDcmVkaXRzQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5DUkVESVRTKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIExpYmVyYWxQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlBPTElDWV9MSUJFUkFMLCBmYWxzZSk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0UG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfRkFTQ0lTVCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBWZXRvQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5WRVRPKTtcclxuXHRcdHRoaXMubWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFsLmNsb25lKCk7XHJcblx0fVxyXG59XHJcbmNsYXNzIExpYmVyYWxSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5ST0xFX0xJQkVSQUwpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgRmFzY2lzdFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlJPTEVfRkFTQ0lTVCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBIaXRsZXJSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5ST0xFX0hJVExFUik7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBMaWJlcmFsUGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0xJQkVSQUwpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgRmFzY2lzdFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9GQVNDSVNUKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIEphQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5KQSk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBOZWluQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5ORUlOKTtcclxuXHR9XHJcbn1cclxuXHJcblxyXG5leHBvcnQge1xyXG5cdENhcmQsIFR5cGVzLCBCbGFua0NhcmQsIENyZWRpdHNDYXJkLCBWZXRvQ2FyZCxcclxuXHRMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFJvbGVDYXJkLFxyXG5cdEhpdGxlclJvbGVDYXJkLCBMaWJlcmFsUGFydHlDYXJkLCBGYXNjaXN0UGFydHlDYXJkLCBKYUNhcmQsIE5laW5DYXJkXHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XHJcbmltcG9ydCB7TGliZXJhbFBvbGljeUNhcmQsIEZhc2Npc3RQb2xpY3lDYXJkLCBWZXRvQ2FyZH0gZnJvbSAnLi9jYXJkJztcclxuXHJcbmxldCBMaWJlcmFsU3BvdHMgPSB7XHJcblx0cG9zaXRpb25zOiBbXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjY5MCwgMC4wMDEsIC0wLjQyKSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuMzQ1LCAwLjAwMSwgLTAuNDIpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC4wMDIsIDAuMDAxLCAtMC40MiksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjM0MCwgMC4wMDEsIC0wLjQyKSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uNjkwLCAwLjAwMSwgLTAuNDIpXHJcblx0XSxcclxuXHRxdWF0ZXJuaW9uOiBuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAwLjcwNzEwNjc4MTE4NjU0NzUsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMCksXHJcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNCwgMC40LCAwLjQpXHJcbn0sXHJcbkZhc2Npc3RTcG90cyA9IHtcclxuXHRwb3NpdGlvbnM6IFtcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uODYwLCAwLjAwMSwgLjQyNSksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjUxNSwgMC4wMDEsIC40MjUpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoLS4xNzAsIDAuMDAxLCAuNDI1KSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuMTcwLCAwLjAwMSwgLjQyNSksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjUxOCwgMC4wMDEsIC40MjUpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC44NzAsIDAuMDAxLCAuNDI1KSxcdFxyXG5cdF0sXHJcblx0cXVhdGVybmlvbjogbmV3IFRIUkVFLlF1YXRlcm5pb24oLTAuNzA3MTA2NzgxMTg2NTQ3NSwgMCwgMCwgMC43MDcxMDY3ODExODY1NDc1KSxcclxuXHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMC40LCAwLjQsIDAuNClcclxufTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVUYWJsZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcigpXHJcblx0e1xyXG5cdFx0c3VwZXIoKTtcclxuXHJcblx0XHQvLyB0YWJsZSBzdGF0ZVxyXG5cdFx0dGhpcy5saWJlcmFsQ2FyZHMgPSAwO1xyXG5cdFx0dGhpcy5mYXNjaXN0Q2FyZHMgPSAwO1xyXG5cdFx0dGhpcy5jYXJkcyA9IFtdO1xyXG5cclxuXHRcdHRoaXMudmV0b0NhcmQgPSBuZXcgVmV0b0NhcmQoKTtcclxuXHRcdHRoaXMudmV0b0NhcmQuc2NhbGUuc2V0U2NhbGFyKC41KTtcclxuXHRcdHRoaXMudmV0b0NhcmQudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy52ZXRvQ2FyZC5tYXRlcmlhbC50cmFuc3BhcmVudCA9IHRydWU7XHJcblx0XHR0aGlzLmFkZCh0aGlzLnZldG9DYXJkKTtcclxuXHJcblx0XHQvLyBhZGQgdGFibGUgYXNzZXRcclxuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMudGFibGU7XHJcblx0XHR0aGlzLm1vZGVsLnNjYWxlLnNldFNjYWxhcigxLjI1KTtcclxuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xyXG5cclxuXHRcdC8vIHNhdmUgcmVmZXJlbmNlcyB0byB0aGUgdGV4dHVyZXNcclxuXHRcdHRoaXMudGV4dHVyZXMgPSBbXHJcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX3NtYWxsLFxyXG5cdFx0XHRBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9tZWQsXHJcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX2xhcmdlXHJcblx0XHRdO1xyXG5cdFx0dGhpcy50ZXh0dXJlcy5mb3JFYWNoKHRleCA9PiB0ZXguZmxpcFkgPSBmYWxzZSk7XHJcblx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1swXSwgdHJ1ZSk7XHJcblx0XHRcclxuXHRcdC8vIHBvc2l0aW9uIHRhYmxlXHJcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAxLjAsIDApO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLmNoYW5nZU1vZGUuYmluZCh0aGlzKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGliZXJhbFBvbGljaWVzJywgdGhpcy51cGRhdGVQb2xpY2llcy5iaW5kKHRoaXMpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9mYXNjaXN0UG9saWNpZXMnLCB0aGlzLnVwZGF0ZVBvbGljaWVzLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2ZhaWxlZFZvdGVzJywgdGhpcy51cGRhdGVQb2xpY2llcy5iaW5kKHRoaXMpKTtcclxuXHR9XHJcblxyXG5cdGNoYW5nZU1vZGUoe2RhdGE6IHtnYW1lOiB7c3RhdGUsIHR1cm5PcmRlcn19fSlcclxuXHR7XHJcblx0XHRpZih0dXJuT3JkZXIubGVuZ3RoID49IDkpXHJcblx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzJdKTtcclxuXHRcdGVsc2UgaWYodHVybk9yZGVyLmxlbmd0aCA+PSA3KVxyXG5cdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1sxXSk7XHJcblx0XHRlbHNlXHJcblx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzBdKTtcclxuXHR9XHJcblxyXG5cdHNldFRleHR1cmUobmV3VGV4LCBzd2l0Y2hMaWdodG1hcClcclxuXHR7XHJcblx0XHR0aGlzLm1vZGVsLnRyYXZlcnNlKG8gPT4ge1xyXG5cdFx0XHRpZihvIGluc3RhbmNlb2YgVEhSRUUuTWVzaClcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlmKHN3aXRjaExpZ2h0bWFwKVxyXG5cdFx0XHRcdFx0by5tYXRlcmlhbC5saWdodE1hcCA9IG8ubWF0ZXJpYWwubWFwO1xyXG5cclxuXHRcdFx0XHRvLm1hdGVyaWFsLm1hcCA9IG5ld1RleDtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVQb2xpY2llcyh7ZGF0YToge2dhbWU6IHtsaWJlcmFsUG9saWNpZXMsIGZhc2Npc3RQb2xpY2llcywgaGFuZCwgc3RhdGV9fX0pXHJcblx0e1xyXG5cdFx0bGV0IHVwZGF0ZXMgPSBbXTtcclxuXHJcblx0XHQvLyBxdWV1ZSB1cCBjYXJkcyB0byBiZSBhZGRlZCB0byB0aGUgdGFibGUgdGhpcyB1cGRhdGVcclxuXHRcdGZvcih2YXIgaT10aGlzLmxpYmVyYWxDYXJkczsgaTxsaWJlcmFsUG9saWNpZXM7IGkrKyl7XHJcblx0XHRcdGxldCBjYXJkID0gbmV3IExpYmVyYWxQb2xpY3lDYXJkKCk7XHJcblx0XHRcdGNhcmQuYW5pbWF0ZSA9ICgpID0+IEFuaW1hdGUuc2ltcGxlKGNhcmQsIHtcclxuXHRcdFx0XHRwb3M6IExpYmVyYWxTcG90cy5wb3NpdGlvbnNbaV0sXHJcblx0XHRcdFx0cXVhdDogTGliZXJhbFNwb3RzLnF1YXRlcm5pb24sXHJcblx0XHRcdFx0c2NhbGU6IExpYmVyYWxTcG90cy5zY2FsZVxyXG5cdFx0XHR9KS50aGVuKCgpID0+IEFuaW1hdGUud2FpdCg1MDApKTtcclxuXHRcdFx0Y2FyZC5wbGF5U291bmQgPSAoKSA9PiBTSC5hdWRpby5saWJlcmFsU3RpbmcubG9hZGVkLnRoZW4oKCkgPT4gU0guYXVkaW8ubGliZXJhbFN0aW5nLnBsYXkoKSk7XHJcblx0XHRcdHVwZGF0ZXMucHVzaChjYXJkKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Zm9yKHZhciBpPXRoaXMuZmFzY2lzdENhcmRzOyBpPGZhc2Npc3RQb2xpY2llczsgaSsrKXtcclxuXHRcdFx0bGV0IGNhcmQgPSBuZXcgRmFzY2lzdFBvbGljeUNhcmQoKTtcclxuXHRcdFx0Y2FyZC5hbmltYXRlID0gKCkgPT4gQW5pbWF0ZS5zaW1wbGUoY2FyZCwge1xyXG5cdFx0XHRcdHBvczogRmFzY2lzdFNwb3RzLnBvc2l0aW9uc1tpXSxcclxuXHRcdFx0XHRxdWF0OiBGYXNjaXN0U3BvdHMucXVhdGVybmlvbixcclxuXHRcdFx0XHRzY2FsZTogRmFzY2lzdFNwb3RzLnNjYWxlXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjYXJkLnBsYXlTb3VuZCA9ICgpID0+IFNILmF1ZGlvLmZhc2Npc3RTdGluZy5sb2FkZWQudGhlbigoKSA9PiBTSC5hdWRpby5mYXNjaXN0U3RpbmcucGxheSgpKTtcclxuXHRcdFx0dXBkYXRlcy5wdXNoKGNhcmQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHN0YXRlID09PSAnYWZ0ZXJtYXRoJyAmJiBoYW5kID09PSAxKXtcclxuXHRcdFx0dXBkYXRlcy5wdXNoKHRoaXMudmV0b0NhcmQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBhbmltYXRpb24gPSBudWxsO1xyXG5cdFx0aWYodXBkYXRlcy5sZW5ndGggPT09IDEpXHJcblx0XHR7XHJcblx0XHRcdGxldCBjYXJkID0gdXBkYXRlc1swXTtcclxuXHRcdFx0aWYoY2FyZCA9PT0gdGhpcy52ZXRvQ2FyZClcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNhcmQudmlzaWJsZSA9IHRydWU7IGNhcmQubWF0ZXJpYWwub3BhY2l0eSA9IDE7XHJcblx0XHRcdFx0YW5pbWF0aW9uID0gQW5pbWF0ZS5jYXJkRmxvdXJpc2goY2FyZClcclxuXHRcdFx0XHRcdC50aGVuKCgpID0+IEFuaW1hdGUudmFuaXNoKGNhcmQpKVxyXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4geyBjYXJkLnZpc2libGUgPSBmYWxzZTsgfSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dGhpcy5hZGQoY2FyZCk7XHJcblx0XHRcdFx0dGhpcy5jYXJkcy5wdXNoKGNhcmQpO1xyXG5cdFx0XHRcdGNhcmQucGxheVNvdW5kKCk7XHJcblx0XHRcdFx0YW5pbWF0aW9uID0gQW5pbWF0ZS5jYXJkRmxvdXJpc2goY2FyZClcclxuXHRcdFx0XHRcdC50aGVuKCgpID0+IGNhcmQuYW5pbWF0ZSgpKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZVxyXG5cdFx0e1xyXG5cdFx0XHQvLyBwbGFjZSBvbiB0aGVpciBzcG90c1xyXG5cdFx0XHR1cGRhdGVzLmZvckVhY2goY2FyZCA9PiB7XHJcblx0XHRcdFx0dGhpcy5hZGQoY2FyZCk7XHJcblx0XHRcdFx0dGhpcy5jYXJkcy5wdXNoKGNhcmQpO1xyXG5cdFx0XHRcdGNhcmQuYW5pbWF0ZSgpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGFuaW1hdGlvbiA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHN0YXRlID09PSAnYWZ0ZXJtYXRoJyl7XHJcblx0XHRcdGFuaW1hdGlvbi50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRTSC5kaXNwYXRjaEV2ZW50KHtcclxuXHRcdFx0XHRcdHR5cGU6ICdwb2xpY3lBbmltRG9uZScsXHJcblx0XHRcdFx0XHRidWJibGVzOiBmYWxzZVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZihsaWJlcmFsUG9saWNpZXMgPT09IDAgJiYgZmFzY2lzdFBvbGljaWVzID09PSAwKXtcclxuXHRcdFx0dGhpcy5jYXJkcy5mb3JFYWNoKGMgPT4gdGhpcy5yZW1vdmUoYykpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMubGliZXJhbENhcmRzID0gbGliZXJhbFBvbGljaWVzO1xyXG5cdFx0dGhpcy5mYXNjaXN0Q2FyZHMgPSBmYXNjaXN0UG9saWNpZXM7XHJcblx0fVxyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuZnVuY3Rpb24gZ2V0R2FtZUlkKClcclxue1xyXG5cdC8vIGZpcnN0IGNoZWNrIHRoZSB1cmxcclxuXHRsZXQgcmUgPSAvWz8mXWdhbWVJZD0oW14mXSspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xyXG5cdGlmKHJlKXtcclxuXHRcdHJldHVybiByZVsxXTtcclxuXHR9XHJcblx0ZWxzZSBpZihhbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudCl7XHJcblx0XHRyZXR1cm4gU0guZW52LnNpZDtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRsZXQgaWQgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogMTAwMDAwMDAwICk7XHJcblx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZSgnP2dhbWVJZD0nK2lkKTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlQ1NWKHN0cil7XHJcblx0aWYoIXN0cikgcmV0dXJuIFtdO1xyXG5cdGVsc2UgcmV0dXJuIHN0ci5zcGxpdCgnLCcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVF1ZXN0aW9uKHRleHQsIHRleHR1cmUgPSBudWxsKVxyXG57XHJcblx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xyXG5cclxuXHQvLyBzZXQgdXAgY2FudmFzXHJcblx0bGV0IGJtcDtcclxuXHRpZighdGV4dHVyZSl7XHJcblx0XHRibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuXHRcdGJtcC53aWR0aCA9IDUxMjtcclxuXHRcdGJtcC5oZWlnaHQgPSAyNTY7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0Ym1wID0gdGV4dHVyZS5pbWFnZTtcclxuXHR9XHJcblxyXG5cdGxldCBnID0gYm1wLmdldENvbnRleHQoJzJkJyk7XHJcblx0Zy5jbGVhclJlY3QoMCwgMCwgNTEyLCAyNTYpO1xyXG5cdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcblx0Zy5maWxsU3R5bGUgPSAnYmxhY2snO1xyXG5cclxuXHQvLyB3cml0ZSB0ZXh0XHJcblx0Zy5mb250ID0gJ2JvbGQgNTBweCAnK2ZvbnRTdGFjaztcclxuXHRsZXQgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcclxuXHRmb3IobGV0IGk9MDsgaTxsaW5lcy5sZW5ndGg7IGkrKyl7XHJcblx0XHRnLmZpbGxUZXh0KGxpbmVzW2ldLCAyNTYsIDUwKzU1KmkpO1xyXG5cdH1cclxuXHJcblx0aWYodGV4dHVyZSl7XHJcblx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdHJldHVybiB0ZXh0dXJlO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZShibXApO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gbWVyZ2VPYmplY3RzKGEsIGIsIGRlcHRoPTIpXHJcbntcclxuXHRmdW5jdGlvbiB1bmlxdWUoZSwgaSwgYSl7XHJcblx0XHRyZXR1cm4gYS5pbmRleE9mKGUpID09PSBpO1xyXG5cdH1cclxuXHJcblx0bGV0IGFJc09iaiA9IGEgaW5zdGFuY2VvZiBPYmplY3QsIGJJc09iaiA9IGIgaW5zdGFuY2VvZiBPYmplY3Q7XHJcblx0aWYoYUlzT2JqICYmIGJJc09iaiAmJiBkZXB0aCA+IDApXHJcblx0e1xyXG5cdFx0bGV0IHJlc3VsdCA9IHt9O1xyXG5cdFx0bGV0IGtleXMgPSBbLi4uT2JqZWN0LmtleXMoYSksIC4uLk9iamVjdC5rZXlzKGIpXS5maWx0ZXIodW5pcXVlKTtcclxuXHRcdGZvcihsZXQgaT0wOyBpPGtleXMubGVuZ3RoOyBpKyspe1xyXG5cdFx0XHRyZXN1bHRba2V5c1tpXV0gPSBtZXJnZU9iamVjdHMoYVtrZXlzW2ldXSwgYltrZXlzW2ldXSwgZGVwdGgtMSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdH1cclxuXHRlbHNlIGlmKGIgIT09IHVuZGVmaW5lZClcclxuXHRcdHJldHVybiBiO1xyXG5cdGVsc2VcclxuXHRcdHJldHVybiBhO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsYXRlVXBkYXRlKGZuKVxyXG57XHJcblx0cmV0dXJuICguLi5hcmdzKSA9PiB7XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IGZuKC4uLmFyZ3MpLCAxNSk7XHJcblx0fTtcclxufVxyXG5cclxuZXhwb3J0IHsgZ2V0R2FtZUlkLCBwYXJzZUNTViwgZ2VuZXJhdGVRdWVzdGlvbiwgbWVyZ2VPYmplY3RzLCBsYXRlVXBkYXRlIH07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBOYW1lcGxhdGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3Ioc2VhdClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XHJcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC42MzUsIDAuMjIpO1xyXG5cdFx0c2VhdC5hZGQodGhpcyk7XHJcblxyXG5cdFx0Ly8gYWRkIDNkIG1vZGVsXHJcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLm5hbWVwbGF0ZS5jaGlsZHJlblswXS5jbG9uZSgpO1xyXG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgTWF0aC5QSS8yKTtcclxuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XHJcblxyXG5cdFx0Ly8gZ2VuZXJhdGUgbWF0ZXJpYWxcclxuXHRcdHRoaXMuYm1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcblx0XHR0aGlzLmJtcC53aWR0aCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZTtcclxuXHRcdHRoaXMuYm1wLmhlaWdodCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAvIDI7XHJcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0bWFwOiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZSh0aGlzLmJtcClcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBsaXN0ZW5lciBwcm94aWVzXHJcblx0XHR0aGlzLl9ob3ZlckJlaGF2aW9yID0gbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJDb2xvcih7XHJcblx0XHRcdGNvbG9yOiBuZXcgVEhSRUUuQ29sb3IoMHhmZmE4YTgpXHJcblx0XHR9KTtcclxuXHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XHJcblx0XHR0aGlzLm1vZGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5jbGljay5iaW5kKHRoaXMpKTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0aWYoc3RhdGUgPT09ICdzZXR1cCcpXHJcblx0XHRcdFx0dGhpcy5tb2RlbC5hZGRCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHRoaXMubW9kZWwucmVtb3ZlQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZVRleHQodGV4dClcclxuXHR7XHJcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcclxuXHJcblx0XHQvLyBzZXQgdXAgY2FudmFzXHJcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XHJcblx0XHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XHJcblx0XHRnLmZpbGxTdHlsZSA9ICcjMjIyJztcclxuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XHJcblx0XHRnLmZvbnQgPSBgYm9sZCAke2ZvbnRTaXplfXB4ICR7Zm9udFN0YWNrfWA7XHJcblx0XHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xyXG5cdFx0Zy5maWxsVGV4dCh0ZXh0LCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMiwgKDAuNDIgLSAwLjEyKSooTmFtZXBsYXRlLnRleHR1cmVTaXplLzIpKTtcclxuXHJcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0fVxyXG5cclxuXHRjbGljayhlKVxyXG5cdHtcclxuXHRcdGlmKFNILmdhbWUuc3RhdGUgIT09ICdzZXR1cCcpIHJldHVybjtcclxuXHJcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyKVxyXG5cdFx0XHR0aGlzLnJlcXVlc3RKb2luKCk7XHJcblx0XHRlbHNlIGlmKHRoaXMuc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxyXG5cdFx0XHR0aGlzLnJlcXVlc3RMZWF2ZSgpO1xyXG5cdFx0ZWxzZSBpZihTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxyXG5cdFx0XHR0aGlzLnJlcXVlc3RLaWNrKCk7XHJcblx0fVxyXG5cclxuXHRyZXF1ZXN0Sm9pbigpXHJcblx0e1xyXG5cdFx0U0guc29ja2V0LmVtaXQoJ2pvaW4nLCBPYmplY3QuYXNzaWduKHtzZWF0TnVtOiB0aGlzLnNlYXQuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpO1xyXG5cdH1cclxuXHJcblx0cmVxdWVzdExlYXZlKClcclxuXHR7XHJcblx0XHRsZXQgc2VsZiA9IHRoaXM7XHJcblx0XHRpZighc2VsZi5xdWVzdGlvbilcclxuXHRcdHtcclxuXHRcdFx0c2VsZi5xdWVzdGlvbiA9IHNlbGYuc2VhdC5iYWxsb3QuYXNrUXVlc3Rpb24oJ0FyZSB5b3Ugc3VyZSB5b3VcXG53YW50IHRvIGxlYXZlPycsICdsb2NhbF9sZWF2ZScpXHJcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xyXG5cdFx0XHRcdGlmKGNvbmZpcm0pe1xyXG5cdFx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2xlYXZlJywgU0gubG9jYWxVc2VyLmlkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5jYXRjaCgoKSA9PiB7IHNlbGYucXVlc3Rpb24gPSBudWxsOyB9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJlcXVlc3RLaWNrKClcclxuXHR7XHJcblx0XHRsZXQgc2VsZiA9IHRoaXM7XHJcblx0XHRpZighc2VsZi5xdWVzdGlvbilcclxuXHRcdHtcclxuXHRcdFx0bGV0IHNlYXQgPSBTSC5zZWF0c1tTSC5wbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0uc2VhdE51bV07XHJcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWF0LmJhbGxvdC5hc2tRdWVzdGlvbihcclxuXHRcdFx0XHQnQXJlIHlvdSBzdXJlIHlvdVxcbndhbnQgdG8gdHJ5IHRvIGtpY2tcXG4nXHJcblx0XHRcdFx0K1NILnBsYXllcnNbc2VsZi5zZWF0Lm93bmVyXS5kaXNwbGF5TmFtZSxcclxuXHRcdFx0XHQnbG9jYWxfa2ljaydcclxuXHRcdFx0KVxyXG5cdFx0XHQudGhlbihjb25maXJtID0+IHtcclxuXHRcdFx0XHRpZihjb25maXJtKXtcclxuXHRcdFx0XHRcdFNILnNvY2tldC5lbWl0KCdraWNrJywgU0gubG9jYWxVc2VyLmlkLCBzZWxmLnNlYXQub3duZXIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uID0gbnVsbDtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuTmFtZXBsYXRlLnRleHR1cmVTaXplID0gMjU2O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQgKiBhcyBCYWxsb3RUeXBlIGZyb20gJy4vYmFsbG90JztcclxuaW1wb3J0IHt0cmFuc2xhdGUgYXMgdHJ9IGZyb20gJy4vdGhlbWUnO1xyXG5cclxuZnVuY3Rpb24gdXBkYXRlVm90ZXNJblByb2dyZXNzKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcclxue1xyXG5cdGxldCBiYWxsb3QgPSB0aGlzO1xyXG5cdGlmKCFiYWxsb3Quc2VhdC5vd25lcikgcmV0dXJuO1xyXG5cclxuXHRsZXQgdmlwcyA9IGdhbWUudm90ZXNJblByb2dyZXNzO1xyXG5cclxuXHQvLyB2b3RlcyB0aGUgc2VhdCBvd25lciBjYW5ub3QgcGFydGljaXBhdGUgaW4gKGFscmVhZHkgdm90ZWQgb3IgYmxvY2tlZClcclxuXHRsZXQgYmxhY2tsaXN0ZWRWb3RlcyA9IHZpcHMuZmlsdGVyKGlkID0+IHtcclxuXHRcdGxldCB2cyA9IFsuLi52b3Rlc1tpZF0ueWVzVm90ZXJzLCAuLi52b3Rlc1tpZF0ubm9Wb3RlcnNdO1xyXG5cdFx0bGV0IG52ID0gdm90ZXNbaWRdLm5vblZvdGVycztcclxuXHRcdHJldHVybiBudi5pbmNsdWRlcyhiYWxsb3Quc2VhdC5vd25lcikgfHwgdnMuaW5jbHVkZXMoYmFsbG90LnNlYXQub3duZXIpO1xyXG5cdH0pO1xyXG5cclxuXHQvLyB2b3RlcyBhZGRlZCB0aGlzIHVwZGF0ZSB0aGF0IHRoZSBzZWF0ZWQgdXNlciBpcyBlbGlnaWJsZSBmb3JcclxuXHRsZXQgbmV3Vm90ZXMgPSB2aXBzLmZpbHRlcihcclxuXHRcdGlkID0+ICghU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MgfHwgIVNILmdhbWUudm90ZXNJblByb2dyZXNzLmluY2x1ZGVzKGlkKSkgJiYgIWJsYWNrbGlzdGVkVm90ZXMuaW5jbHVkZXMoaWQpXHJcblx0KTtcclxuXHJcblx0Ly8gdm90ZXMgYWxyZWFkeSBwYXJ0aWNpcGF0ZWQgaW4sIHBsdXMgY29tcGxldGVkIHZvdGVzXHJcblx0bGV0IGZpbmlzaGVkVm90ZXMgPSAhU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MgPyBibGFja2xpc3RlZFZvdGVzXHJcblx0XHQ6IFNILmdhbWUudm90ZXNJblByb2dyZXNzLmZpbHRlcihpZCA9PiAhdmlwcy5pbmNsdWRlcyhpZCkpLmNvbmNhdChibGFja2xpc3RlZFZvdGVzKTtcclxuXHJcblx0bmV3Vm90ZXMuZm9yRWFjaCh2SWQgPT5cclxuXHR7XHJcblx0XHQvLyBnZW5lcmF0ZSBuZXcgcXVlc3Rpb24gdG8gYXNrXHJcblx0XHRsZXQgcXVlc3Rpb25UZXh0LCBvcHRzID0ge307XHJcblx0XHRpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdlbGVjdCcpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSBwbGF5ZXJzW2dhbWUucHJlc2lkZW50XS5kaXNwbGF5TmFtZVxyXG5cdFx0XHRcdCsgYCBmb3IgJHt0cigncHJlc2lkZW50Jyl9IGFuZCBgXHJcblx0XHRcdFx0KyBwbGF5ZXJzW2dhbWUuY2hhbmNlbGxvcl0uZGlzcGxheU5hbWVcclxuXHRcdFx0XHQrIGAgZm9yICR7dHIoJ2NoYW5jZWxsb3InKX0/YDtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAnam9pbicpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSB2b3Rlc1t2SWRdLmRhdGEgKyAnIHRvIGpvaW4/JztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAna2ljaycpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSAnVm90ZSB0byBraWNrICdcclxuXHRcdFx0XHQrIHBsYXllcnNbdm90ZXNbdklkXS50YXJnZXQxXS5kaXNwbGF5TmFtZVxyXG5cdFx0XHRcdCsgJz8nO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICd0dXRvcmlhbCcpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSAnUGxheSB0dXRvcmlhbD8nO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdjb25maXJtUm9sZScpXHJcblx0XHR7XHJcblx0XHRcdG9wdHMuY2hvaWNlcyA9IEJhbGxvdFR5cGUuQ09ORklSTTtcclxuXHRcdFx0bGV0IHJvbGU7XHJcblx0XHRcdGlmKGJhbGxvdC5zZWF0Lm93bmVyID09PSBTSC5sb2NhbFVzZXIuaWQpe1xyXG5cdFx0XHRcdHJvbGUgPSBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0ucm9sZTtcclxuXHRcdFx0XHRyb2xlID0gdHIocm9sZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHJvbGUuc2xpY2UoMSkpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdHJvbGUgPSAnPFJFREFDVEVEPic7XHJcblx0XHRcdH1cclxuXHRcdFx0cXVlc3Rpb25UZXh0ID0gJ1lvdXIgcm9sZTpcXG4nICsgcm9sZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZihxdWVzdGlvblRleHQpXHJcblx0XHR7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbihxdWVzdGlvblRleHQsIHZJZCwgb3B0cylcclxuXHRcdFx0LnRoZW4oYW5zd2VyID0+IHtcclxuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgndm90ZScsIHZJZCwgU0gubG9jYWxVc2VyLmlkLCBhbnN3ZXIpO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuY2F0Y2goKCkgPT4gY29uc29sZS5sb2coJ1ZvdGUgc2NydWJiZWQ6JywgdklkKSk7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGlmKGZpbmlzaGVkVm90ZXMuaW5jbHVkZXMoYmFsbG90LmRpc3BsYXllZCkpe1xyXG5cdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxyXG57XHJcblx0bGV0IGJhbGxvdCA9IHRoaXM7XHJcblxyXG5cdGZ1bmN0aW9uIGNob29zZVBsYXllcihxdWVzdGlvbiwgY29uZmlybVF1ZXN0aW9uLCBpZClcclxuXHR7XHJcblx0XHRmdW5jdGlvbiBjb25maXJtUGxheWVyKHVzZXJJZClcclxuXHRcdHtcclxuXHRcdFx0bGV0IHVzZXJuYW1lID0gU0gucGxheWVyc1t1c2VySWRdLmRpc3BsYXlOYW1lO1xyXG5cdFx0XHRsZXQgdGV4dCA9IGNvbmZpcm1RdWVzdGlvbi5yZXBsYWNlKCd7fScsIHVzZXJuYW1lKTtcclxuXHRcdFx0cmV0dXJuIGJhbGxvdC5hc2tRdWVzdGlvbih0ZXh0LCAnbG9jYWxfJytpZCsnX2NvbmZpcm0nKVxyXG5cdFx0XHQudGhlbihjb25maXJtZWQgPT4ge1xyXG5cdFx0XHRcdGlmKGNvbmZpcm1lZCl7XHJcblx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHVzZXJJZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGNob29zZVBsYXllcihxdWVzdGlvbiwgY29uZmlybVF1ZXN0aW9uLCBpZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gYmFsbG90LmFza1F1ZXN0aW9uKHF1ZXN0aW9uLCAnbG9jYWxfJytpZCwge2Nob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNUfSlcclxuXHRcdC50aGVuKGNvbmZpcm1QbGF5ZXIpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gaGlkZU5vbWluYXRlUGxhY2Vob2xkZXIoe2RhdGE6IHtnYW1lfX0pXHJcblx0e1xyXG5cdFx0aWYoZ2FtZS5zdGF0ZSAhPT0gJ25vbWluYXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfY2hhbmNlbGxvcicpe1xyXG5cdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdFx0fVxyXG5cdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZU5vbWluYXRlUGxhY2Vob2xkZXIpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gaGlkZVBvbGljeVBsYWNlaG9sZGVyKHtkYXRhOiB7Z2FtZX19KVxyXG5cdHtcclxuXHRcdGlmKGdhbWUuc3RhdGUgIT09ICdwb2xpY3kxJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcG9saWN5MScgfHxcclxuXHRcdFx0Z2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTInICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wb2xpY3kyJ1xyXG5cdFx0KXtcclxuXHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdH1cclxuXHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVQb2xpY3lQbGFjZWhvbGRlcik7XHJcblx0fVxyXG5cclxuXHRpZihnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcclxuXHRcdFx0Y2hvb3NlUGxheWVyKGBDaG9vc2UgeW91ciAke3RyKCdjaGFuY2VsbG9yJyl9IWAsIGBOYW1lIHt9IGFzICR7dHIoJ2NoYW5jZWxsb3InKX0/YCwgJ25vbWluYXRlJylcclxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcclxuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbm9taW5hdGUnLCB1c2VySWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oYENob29zZSB5b3VyICR7dHIoJ2NoYW5jZWxsb3InKX0hYCwgJ3dhaXRfZm9yX2NoYW5jZWxsb3InLCB7XHJcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXHJcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcclxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdub21pbmF0ZSdcclxuXHRcdFx0fSk7XHJcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVOb21pbmF0ZVBsYWNlaG9sZGVyKTtcclxuXHRcdH1cclxuXHR9XHJcblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncG9saWN5MScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxyXG5cdHtcclxuXHRcdGxldCBvcHRzID0ge2Nob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLCBwb2xpY3lIYW5kOiBnYW1lLmhhbmR9O1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkICE9PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdE9iamVjdC5hc3NpZ24ob3B0cywge2Zha2U6IHRydWUsIGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTEnfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdDaG9vc2Ugb25lXFxudG8gZGlzY2FyZCEnLCAnbG9jYWxfcG9saWN5MScsIG9wdHMpXHJcblx0XHQudGhlbihkaXNjYXJkID0+IHtcclxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2Rpc2NhcmRfcG9saWN5MScsIGRpc2NhcmQpO1xyXG5cdFx0fSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlUG9saWN5UGxhY2Vob2xkZXIpO1xyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdwb2xpY3kyJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5jaGFuY2VsbG9yKVxyXG5cdHtcclxuXHRcdGxldCBvcHRzID0ge1xyXG5cdFx0XHRjaG9pY2VzOiBCYWxsb3RUeXBlLlBPTElDWSxcclxuXHRcdFx0cG9saWN5SGFuZDogZ2FtZS5oYW5kLFxyXG5cdFx0XHRpbmNsdWRlVmV0bzogZ2FtZS5mYXNjaXN0UG9saWNpZXMgPT09IDUgJiYgIWJhbGxvdC5ibG9ja1ZldG9cclxuXHRcdH07XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgIT09IGdhbWUuY2hhbmNlbGxvcil7XHJcblx0XHRcdE9iamVjdC5hc3NpZ24ob3B0cywge2Zha2U6IHRydWUsIGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTInfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdDaG9vc2Ugb25lXFxudG8gZGlzY2FyZCEnLCAnbG9jYWxfcG9saWN5MicsIG9wdHMpXHJcblx0XHQudGhlbihkaXNjYXJkID0+IHtcclxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2Rpc2NhcmRfcG9saWN5MicsIGRpc2NhcmQpO1xyXG5cdFx0fSwgZXJyID0+IGNvbnNvbGUuZXJyb3IoZXJyKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlUG9saWN5UGxhY2Vob2xkZXIpO1xyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdpbnZlc3RpZ2F0ZScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxyXG5cdHtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xyXG5cdFx0XHRjaG9vc2VQbGF5ZXIoJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIG9uZSBwbGF5ZXIgdG8gaW52ZXN0aWdhdGUhJywgJ0ludmVzdGlnYXRlIHt9PycsICdpbnZlc3RpZ2F0ZScpXHJcblx0XHRcdC50aGVuKHVzZXJJZCA9PiB7XHJcblx0XHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XHJcblx0XHRcdFx0XHR0eXBlOiAnaW52ZXN0aWdhdGUnLFxyXG5cdFx0XHRcdFx0ZGF0YTogdXNlcklkXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2Ugb25lIHBsYXllciB0byBpbnZlc3RpZ2F0ZSEnLCAnd2FpdF9mb3JfaW52ZXN0aWdhdGUnLCB7XHJcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXHJcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcclxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdpbnZlc3RpZ2F0ZSdcclxuXHRcdFx0fSk7XHJcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0XHRpZihzdGF0ZSAhPT0gJ2ludmVzdGlnYXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfaW52ZXN0aWdhdGUnKVxyXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdwZWVrJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0bGV0IG9wdHMgPSB7Y2hvaWNlczogQmFsbG90VHlwZS5QT0xJQ1ksIHBvbGljeUhhbmQ6IDggfCAoZ2FtZS5kZWNrJjcpfTtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCAhPT0gZ2FtZS5wcmVzaWRlbnQpe1xyXG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwZWVrJ30pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBUb3Agb2YgcG9saWN5IGRlY2snLCAnbG9jYWxfcGVlaycsIG9wdHMpXHJcblx0XHQudGhlbihkaXNjYXJkID0+IHtcclxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2NvbnRpbnVlJyk7XHJcblx0XHR9KTtcclxuXHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0aWYoc3RhdGUgIT09ICdwZWVrJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcGVlaycpXHJcblx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcclxuXHRcdH07XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICduYW1lU3VjY2Vzc29yJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdGNob29zZVBsYXllcihgRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgdGhlIG5leHQgJHt0cigncHJlc2lkZW50Jyl9IWAsIGB7fSBmb3IgJHt0cigncHJlc2lkZW50Jyl9P2AsICduYW1lU3VjY2Vzc29yJylcclxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcclxuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbmFtZV9zdWNjZXNzb3InLCB1c2VySWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oYEV4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIHRoZSBuZXh0ICR7dHIoJ3ByZXNpZGVudCcpfSFgLCAnd2FpdF9mb3Jfc3VjY2Vzc29yJywge1xyXG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxyXG5cdFx0XHRcdGZha2U6IHRydWUsXHJcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAnbmFtZVN1Y2Nlc3NvcidcclxuXHRcdFx0fSk7XHJcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0XHRpZihzdGF0ZSAhPT0gJ25hbWVTdWNjZXNzb3InICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICd3YWl0X2Zvcl9zdWNjZXNzb3InKVxyXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdleGVjdXRlJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdGNob29zZVBsYXllcignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgYSBwbGF5ZXIgdG8gZXhlY3V0ZSEnLCAnRXhlY3V0ZSB7fT8nLCAnZXhlY3V0ZScpXHJcblx0XHRcdC50aGVuKHVzZXJJZCA9PiB7XHJcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2V4ZWN1dGUnLCB1c2VySWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIGEgcGxheWVyIHRvIGV4ZWN1dGUhJywgJ3dhaXRfZm9yX2V4ZWN1dGUnLCB7XHJcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXHJcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcclxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdleGVjdXRlJ1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0bGV0IGNsZWFuVXBGYWtlVm90ZSA9ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xyXG5cdFx0XHRcdGlmKHN0YXRlICE9PSAnZXhlY3V0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2V4ZWN1dGUnKVxyXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICd2ZXRvJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQXBwcm92ZSB2ZXRvPycsICdsb2NhbF92ZXRvJykudGhlbihhcHByb3ZlZCA9PiB7XHJcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2NvbmZpcm1fdmV0bycsIGFwcHJvdmVkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdBcHByb3ZlIHZldG8/JywgJ3dhaXRfZm9yX3ZldG8nLCB7XHJcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcclxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICd2ZXRvJ1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0bGV0IGNsZWFuVXBGYWtlVm90ZSA9ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xyXG5cdFx0XHRcdGlmKHN0YXRlICE9PSAndmV0bycgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX3ZldG8nKVxyXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3ZldG8nKXtcclxuXHRcdGJhbGxvdC5ibG9ja1ZldG8gPSB0cnVlO1xyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnKXtcclxuXHRcdGJhbGxvdC5ibG9ja1ZldG8gPSBmYWxzZTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7dXBkYXRlVm90ZXNJblByb2dyZXNzLCB1cGRhdGVTdGF0ZX07IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuLypcclxuKiBEZWNrcyBoYXZlIDE3IGNhcmRzOiA2IGxpYmVyYWwsIDExIGZhc2Npc3QuXHJcbiogSW4gYml0LXBhY2tlZCBib29sZWFuIGFycmF5cywgMSBpcyBsaWJlcmFsLCAwIGlzIGZhc2Npc3QuXHJcbiogVGhlIG1vc3Qgc2lnbmlmaWNhbnQgYml0IGlzIGFsd2F5cyAxLlxyXG4qIEUuZy4gMGIxMDEwMDEgcmVwcmVzZW50cyBhIGRlY2sgd2l0aCAyIGxpYmVyYWwgYW5kIDMgZmFzY2lzdCBjYXJkc1xyXG4qL1xyXG5cclxubGV0IEZVTExfREVDSyA9IDB4MjAwM2YsXHJcblx0RkFTQ0lTVCA9IDAsXHJcblx0TElCRVJBTCA9IDE7XHJcblxyXG5sZXQgcG9zaXRpb25zID0gW1xyXG5cdDB4MSwgMHgyLCAweDQsIDB4OCxcclxuXHQweDEwLCAweDIwLCAweDQwLCAweDgwLFxyXG5cdDB4MTAwLCAweDIwMCwgMHg0MDAsIDB4ODAwLFxyXG5cdDB4MTAwMCwgMHgyMDAwLCAweDQwMDAsIDB4ODAwMCxcclxuXHQweDEwMDAwLCAweDIwMDAwLCAweDQwMDAwXHJcbl07XHJcblxyXG5mdW5jdGlvbiBsZW5ndGgoZGVjaylcclxue1xyXG5cdHJldHVybiBwb3NpdGlvbnMuZmluZEluZGV4KHMgPT4gcyA+IGRlY2spIC0xO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzaHVmZmxlKGRlY2spXHJcbntcclxuXHRsZXQgbCA9IGxlbmd0aChkZWNrKTtcclxuXHRmb3IobGV0IGk9bC0xOyBpPjA7IGktLSlcclxuXHR7XHJcblx0XHRsZXQgbyA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGkpO1xyXG5cdFx0bGV0IGlWYWwgPSBkZWNrICYgMSA8PCBpLCBvVmFsID0gZGVjayAmIDEgPDwgbztcclxuXHRcdGxldCBzd2FwcGVkID0gaVZhbCA+Pj4gaS1vIHwgb1ZhbCA8PCBpLW87XHJcblx0XHRkZWNrID0gZGVjayAtIGlWYWwgLSBvVmFsICsgc3dhcHBlZDtcclxuXHR9XHJcblxyXG5cdHJldHVybiBkZWNrO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3VGhyZWUoZClcclxue1xyXG5cdHJldHVybiBkIDwgOCA/IFsxLCBkXSA6IFtkID4+PiAzLCA4IHwgZCAmIDddO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXNjYXJkT25lKGRlY2ssIHBvcylcclxue1xyXG5cdGxldCBib3R0b21IYWxmID0gZGVjayAmICgxIDw8IHBvcyktMTtcclxuXHRsZXQgdG9wSGFsZiA9IGRlY2sgJiB+KCgxIDw8IHBvcysxKS0xKTtcclxuXHR0b3BIYWxmID4+Pj0gMTtcclxuXHRsZXQgbmV3RGVjayA9IHRvcEhhbGYgfCBib3R0b21IYWxmO1xyXG5cdFxyXG5cdGxldCB2YWwgPSAoZGVjayAmIDE8PHBvcykgPj4+IHBvcztcclxuXHJcblx0cmV0dXJuIFtuZXdEZWNrLCB2YWxdO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhcHBlbmQoZGVjaywgdmFsKVxyXG57XHJcblx0cmV0dXJuIGRlY2sgPDwgMSB8IHZhbDtcclxufVxyXG5cclxuZnVuY3Rpb24gdG9BcnJheShkZWNrKVxyXG57XHJcblx0bGV0IGFyciA9IFtdO1xyXG5cdHdoaWxlKGRlY2sgPiAxKXtcclxuXHRcdGFyci5wdXNoKGRlY2sgJiAxKTtcclxuXHRcdGRlY2sgPj4+PSAxO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIGFycjtcclxufVxyXG5cclxuZXhwb3J0IHtsZW5ndGgsIHNodWZmbGUsIGRyYXdUaHJlZSwgZGlzY2FyZE9uZSwgYXBwZW5kLCB0b0FycmF5LCBGVUxMX0RFQ0ssIExJQkVSQUwsIEZBU0NJU1R9OyIsIid1c2Ugc3RyaWN0OydcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7IEJsYW5rQ2FyZCwgSmFDYXJkLCBOZWluQ2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxQb2xpY3lDYXJkLCBWZXRvQ2FyZCB9IGZyb20gJy4vY2FyZCc7XHJcbmltcG9ydCB7IGdlbmVyYXRlUXVlc3Rpb24sIGxhdGVVcGRhdGUgfSBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0ICogYXMgQlAgZnJvbSAnLi9iYWxsb3Rwcm9jZXNzb3InO1xyXG5pbXBvcnQgKiBhcyBCUEJBIGZyb20gJy4vYnBiYSc7XHJcbmltcG9ydCB7TlRleHQsIFBsYWNlaG9sZGVyTWVzaH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcclxuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcclxuXHJcbmxldCBQTEFZRVJTRUxFQ1QgPSAwO1xyXG5sZXQgQ09ORklSTSA9IDE7XHJcbmxldCBCSU5BUlkgPSAyO1xyXG5sZXQgUE9MSUNZID0gMztcclxuXHJcbmNsYXNzIEJhbGxvdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcihzZWF0KVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xyXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLTAuMywgMC4yNSk7XHJcblx0XHR0aGlzLnJvdGF0aW9uLnNldCguNSwgTWF0aC5QSSwgMCk7XHJcblx0XHRzZWF0LmFkZCh0aGlzKTtcclxuXHJcblx0XHR0aGlzLmxhc3RRdWV1ZWQgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdHRoaXMuZGlzcGxheWVkID0gbnVsbDtcclxuXHRcdHRoaXMuYmxvY2tWZXRvID0gZmFsc2U7XHJcblxyXG5cdFx0dGhpcy5feWVzQ2xpY2tIYW5kbGVyID0gbnVsbDtcclxuXHRcdHRoaXMuX25vQ2xpY2tIYW5kbGVyID0gbnVsbDtcclxuXHRcdHRoaXMuX25vbWluYXRlSGFuZGxlciA9IG51bGw7XHJcblx0XHR0aGlzLl9jYW5jZWxIYW5kbGVyID0gbnVsbDtcclxuXHJcblx0XHR0aGlzLmphQ2FyZCA9IG5ldyBKYUNhcmQoKTtcclxuXHRcdHRoaXMubmVpbkNhcmQgPSBuZXcgTmVpbkNhcmQoKTtcclxuXHRcdFt0aGlzLmphQ2FyZCwgdGhpcy5uZWluQ2FyZF0uZm9yRWFjaChjID0+IHtcclxuXHRcdFx0Yy5wb3NpdGlvbi5zZXQoYyBpbnN0YW5jZW9mIEphQ2FyZCA/IC0wLjEgOiAwLjEsIC0wLjEsIDApO1xyXG5cdFx0XHRjLnNjYWxlLnNldFNjYWxhcigwLjE1KTtcclxuXHRcdFx0Yy52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR9KTtcclxuXHRcdHRoaXMuYWRkKHRoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkKTtcclxuXHRcdHRoaXMucG9saWNpZXMgPSBbXTtcclxuXHJcblx0XHQvL2xldCBnZW8gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSgwLjQsIDAuMik7XHJcblx0XHQvL2xldCBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe3RyYW5zcGFyZW50OiB0cnVlLCBzaWRlOiBUSFJFRS5Eb3VibGVTaWRlfSk7XHJcblx0XHR0aGlzLnF1ZXN0aW9uID0gUGxhY2Vob2xkZXJNZXNoLmNsb25lKCk7XHJcblx0XHR0aGlzLnF1ZXN0aW9uLnBvc2l0aW9uLnNldCgwLCAwLjEsIDApO1xyXG5cdFx0dGhpcy5xdWVzdGlvbi5zY2FsZS5zZXRTY2FsYXIoLjUpO1xyXG5cdFx0dGhpcy5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLmFkZCh0aGlzLnF1ZXN0aW9uKTtcclxuXHJcblx0XHR0aGlzLmJhY2twbGF0ZSA9IG5ldyBUSFJFRS5NZXNoKFxyXG5cdFx0XHRuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSgxLjEsIC40KSxcclxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHt0cmFuc3BhcmVudDogdHJ1ZSwgb3BhY2l0eTogMC4yNSwgc2lkZTogVEhSRUUuRG91YmxlU2lkZX0pXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5iYWNrcGxhdGUucG9zaXRpb24uc2V0KDAsMCwtLjAxKTtcclxuXHRcdHRoaXMuYmFja3BsYXRlLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMucXVlc3Rpb24uYWRkKHRoaXMuYmFja3BsYXRlKTtcclxuXHJcblx0XHR0aGlzLnRleHRDb21wb25lbnQgPSBuZXcgTlRleHQodGhpcy5xdWVzdGlvbik7XHJcblx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt3aWR0aDogMS4xLCBoZWlnaHQ6IC40LCBmb250U2l6ZTogMX0pO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV92b3Rlc0luUHJvZ3Jlc3MnLCBCUC51cGRhdGVWb3Rlc0luUHJvZ3Jlc3MuYmluZCh0aGlzKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBsYXRlVXBkYXRlKEJQLnVwZGF0ZVN0YXRlLmJpbmQodGhpcykpKTtcclxuXHR9XHJcblxyXG5cdGFza1F1ZXN0aW9uKHFUZXh0LCBpZCwge2Nob2ljZXMgPSBCSU5BUlksIHBvbGljeUhhbmQgPSAweDEsIGluY2x1ZGVWZXRvID0gZmFsc2UsIGZha2UgPSBmYWxzZSwgaXNJbnZhbGlkID0gKCkgPT4gdHJ1ZX0gPSB7fSlcclxuXHR7XHJcblx0XHRsZXQgc2VsZiA9IHRoaXM7XHJcblxyXG5cdFx0ZnVuY3Rpb24gaXNWb3RlVmFsaWQoKVxyXG5cdFx0e1xyXG5cdFx0XHRsZXQgaXNGYWtlVmFsaWQgPSBmYWtlICYmICFpc0ludmFsaWQoKTtcclxuXHRcdFx0bGV0IGlzTG9jYWxWb3RlID0gL15sb2NhbC8udGVzdChpZCk7XHJcblx0XHRcdGxldCBpc0ZpcnN0VXBkYXRlID0gIVNILmdhbWUudm90ZXNJblByb2dyZXNzO1xyXG5cdFx0XHRsZXQgdm90ZSA9IFNILnZvdGVzW2lkXTtcclxuXHRcdFx0bGV0IHZvdGVycyA9IHZvdGUgPyBbLi4udm90ZS55ZXNWb3RlcnMsIC4uLnZvdGUubm9Wb3RlcnNdIDogW107XHJcblx0XHRcdGxldCBhbHJlYWR5Vm90ZWQgPSB2b3RlcnMuaW5jbHVkZXMoc2VsZi5zZWF0Lm93bmVyKTtcclxuXHRcdFx0cmV0dXJuIGlzTG9jYWxWb3RlIHx8IGlzRmlyc3RVcGRhdGUgfHwgaXNGYWtlVmFsaWQgfHwgdm90ZSAmJiAhYWxyZWFkeVZvdGVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGhvb2tVcFF1ZXN0aW9uKCl7XHJcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZShxdWVzdGlvbkV4ZWN1dG9yKTtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBxdWVzdGlvbkV4ZWN1dG9yKHJlc29sdmUsIHJlamVjdClcclxuXHRcdHtcclxuXHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBhbnN3ZXIgaXMgc3RpbGwgcmVsZXZhbnRcclxuXHRcdFx0aWYoIWlzVm90ZVZhbGlkKCkpe1xyXG5cdFx0XHRcdHJldHVybiByZWplY3QoJ1ZvdGUgbm8gbG9uZ2VyIHZhbGlkJyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNob3cgdGhlIGJhbGxvdFxyXG5cdFx0XHQvL3NlbGYucXVlc3Rpb24ubWF0ZXJpYWwubWFwID0gZ2VuZXJhdGVRdWVzdGlvbihxVGV4dCwgc2VsZi5xdWVzdGlvbi5tYXRlcmlhbC5tYXApO1xyXG5cdFx0XHRzZWxmLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OiBxVGV4dH0pO1xyXG5cdFx0XHRzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRzZWxmLmJhY2twbGF0ZS52aXNpYmxlID0gdHJ1ZTtcclxuXHJcblx0XHRcdC8vIGhvb2sgdXAgcS9hIGNhcmRzXHJcblx0XHRcdGlmKGNob2ljZXMgPT09IENPTkZJUk0gfHwgY2hvaWNlcyA9PT0gQklOQVJZKXtcclxuXHRcdFx0XHRzZWxmLmphQ2FyZC52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0XHRpZighZmFrZSl7XHJcblx0XHRcdFx0XHRzZWxmLmphQ2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQoJ3llcycsIHJlc29sdmUsIHJlamVjdCkpO1xyXG5cdFx0XHRcdFx0aWYoc2VsZi5zZWF0Lm93bmVyID09PSBTSC5sb2NhbFVzZXIuaWQpXHJcblx0XHRcdFx0XHRcdHNlbGYuamFDYXJkLmFkZEJlaGF2aW9yKCBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlclNjYWxlKCkgKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBzZWxmLmphQ2FyZC52aXNpYmxlID0gZmFsc2U7XHJcblxyXG5cdFx0XHRpZihjaG9pY2VzID09PSBCSU5BUlkpe1xyXG5cdFx0XHRcdHNlbGYubmVpbkNhcmQudmlzaWJsZSA9IHRydWU7XHJcblx0XHRcdFx0aWYoIWZha2Upe1xyXG5cdFx0XHRcdFx0c2VsZi5uZWluQ2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQoJ25vJywgcmVzb2x2ZSwgcmVqZWN0KSk7XHJcblx0XHRcdFx0XHRpZihzZWxmLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcclxuXHRcdFx0XHRcdFx0c2VsZi5uZWluQ2FyZC5hZGRCZWhhdmlvciggbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJTY2FsZSgpICk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Ugc2VsZi5uZWluQ2FyZC52aXNpYmxlID0gZmFsc2U7XHJcblxyXG5cdFx0XHRpZihjaG9pY2VzID09PSBQTEFZRVJTRUxFQ1QgJiYgIWZha2Upe1xyXG5cdFx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3BsYXllclNlbGVjdCcsIHJlc3BvbmQoJ3BsYXllcicsIHJlc29sdmUsIHJlamVjdCkpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUE9MSUNZKXtcclxuXHRcdFx0XHRsZXQgY2FyZHMgPSBCUEJBLnRvQXJyYXkocG9saWN5SGFuZCk7XHJcblx0XHRcdFx0aWYoaW5jbHVkZVZldG8pIGNhcmRzLnB1c2goLTEpO1xyXG5cdFx0XHRcdGNhcmRzLmZvckVhY2goKHZhbCwgaSwgYXJyKSA9PlxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGxldCBjYXJkID0gbnVsbDtcclxuXHRcdFx0XHRcdGlmKGZha2UpXHJcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgQmxhbmtDYXJkKCk7XHJcblx0XHRcdFx0XHRlbHNlIGlmKHZhbCA9PT0gLTEpXHJcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgVmV0b0NhcmQoKTtcclxuXHRcdFx0XHRcdGVsc2UgaWYodmFsID09PSBCUEJBLkxJQkVSQUwpXHJcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgTGliZXJhbFBvbGljeUNhcmQoKTtcclxuXHRcdFx0XHRcdGVsc2VcclxuXHRcdFx0XHRcdFx0Y2FyZCA9IG5ldyBGYXNjaXN0UG9saWN5Q2FyZCgpO1xyXG5cclxuXHRcdFx0XHRcdGNhcmQuc2NhbGUuc2V0U2NhbGFyKDAuMTUpO1xyXG5cclxuXHRcdFx0XHRcdGxldCB3aWR0aCA9IC4xNSAqIGFyci5sZW5ndGg7XHJcblx0XHRcdFx0XHRsZXQgeCA9IC13aWR0aC8yICsgLjE1KmkgKyAuMDc1O1xyXG5cdFx0XHRcdFx0Y2FyZC5wb3NpdGlvbi5zZXQoeCwgLTAuMDcsIDApO1xyXG5cdFx0XHRcdFx0c2VsZi5hZGQoY2FyZCk7XHJcblx0XHRcdFx0XHRzZWxmLnBvbGljaWVzLnB1c2goY2FyZCk7XHJcblxyXG5cdFx0XHRcdFx0aWYoIWZha2Upe1xyXG5cdFx0XHRcdFx0XHRjYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCh2YWwgPT09IC0xID8gLTEgOiBpLCByZXNvbHZlLCByZWplY3QpKTtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdGlmKHNlbGYuc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxyXG5cdFx0XHRcdFx0XHRcdGNhcmQuYWRkQmVoYXZpb3IoIG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLkhvdmVyU2NhbGUoKSApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbmNlbFZvdGUnLCByZXNwb25kKCdjYW5jZWwnLCByZXNvbHZlLCByZWplY3QpKTtcclxuXHJcblx0XHRcdGlmKHNlbGYuX291dHRyb0FuaW0pe1xyXG5cdFx0XHRcdGNsZWFyVGltZW91dChzZWxmLl9vdXR0cm9BbmltKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYoIXNlbGYuZGlzcGxheWVkKVxyXG5cdFx0XHRcdEFuaW1hdGUuc3dpbmdJbihzZWxmLCBNYXRoLlBJLzItLjUsIC40MSwgODAwKTtcclxuXHJcblx0XHRcdHNlbGYuZGlzcGxheWVkID0gaWQ7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gcmVzcG9uZChhbnN3ZXIsIHJlc29sdmUsIHJlamVjdClcclxuXHRcdHtcclxuXHRcdFx0ZnVuY3Rpb24gaGFuZGxlcihldnQpXHJcblx0XHRcdHtcclxuXHRcdFx0XHQvLyBtYWtlIHN1cmUgb25seSB0aGUgb3duZXIgb2YgdGhlIGJhbGxvdCBpcyBhbnN3ZXJpbmdcclxuXHRcdFx0XHRpZihhbnN3ZXIgIT09ICdjYW5jZWwnICYmIHNlbGYuc2VhdC5vd25lciAhPT0gU0gubG9jYWxVc2VyLmlkKSByZXR1cm47XHJcblxyXG5cdFx0XHRcdC8vIGNsZWFuIHVwXHJcblx0XHRcdFx0c2VsZi5fb3V0dHJvQW5pbSA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0QW5pbWF0ZS5zd2luZ091dChzZWxmLCBNYXRoLlBJLzItLjUsIC40MSwgMzAwKVxyXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZWxmLmphQ2FyZC52aXNpYmxlID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdHNlbGYubmVpbkNhcmQudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0c2VsZi5iYWNrcGxhdGUudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRzZWxmLmRpc3BsYXllZCA9IG51bGw7XHJcblx0XHRcdFx0XHRcdHNlbGYucmVtb3ZlKC4uLnNlbGYucG9saWNpZXMpO1xyXG5cdFx0XHRcdFx0XHRzZWxmLnBvbGljaWVzID0gW107XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0c2VsZi5fb3V0dHJvQW5pbSA9IG51bGw7XHJcblx0XHRcdFx0fSwgMTAwKTtcclxuXHJcblx0XHRcdFx0c2VsZi5qYUNhcmQucmVtb3ZlQWxsQmVoYXZpb3JzKCk7XHJcblx0XHRcdFx0c2VsZi5qYUNhcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCBzZWxmLl95ZXNDbGlja0hhbmRsZXIpO1xyXG5cdFx0XHRcdHNlbGYubmVpbkNhcmQucmVtb3ZlQWxsQmVoYXZpb3JzKCk7XHJcblx0XHRcdFx0c2VsZi5uZWluQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX25vQ2xpY2tIYW5kbGVyKTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCdwbGF5ZXJTZWxlY3QnLCBzZWxmLl9ub21pbmF0ZUhhbmRsZXIpO1xyXG5cdFx0XHRcdHNlbGYucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FuY2VsVm90ZScsIHNlbGYuX2NhbmNlbEhhbmRsZXIpO1xyXG5cclxuXHRcdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBzdGlsbCBtYXR0ZXJzXHJcblx0XHRcdFx0aWYoIWlzVm90ZVZhbGlkKCkgfHwgYW5zd2VyID09PSAnY2FuY2VsJyl7XHJcblx0XHRcdFx0XHRpZihjaG9pY2VzID09PSBQT0xJQ1kpXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdC8vIHJhbmRvbSBjYXJkIGRldGFjaGVzIGFuZCB3aW5rcyBvdXRcclxuXHRcdFx0XHRcdFx0bGV0IGNhcmQgPSBzZWxmLnBvbGljaWVzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSpzZWxmLnBvbGljaWVzLmxlbmd0aCldO1xyXG5cdFx0XHRcdFx0XHRjYXJkLmFwcGx5TWF0cml4KHNlbGYubWF0cml4KTtcclxuXHRcdFx0XHRcdFx0c2VsZi5zZWF0LmFkZChjYXJkKTtcclxuXHRcdFx0XHRcdFx0QW5pbWF0ZS53aW5rT3V0KGNhcmQsIDMwMCkudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2VsZi5zZWF0LnJlbW92ZShjYXJkKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRyZWplY3QoJ3ZvdGUgY2FuY2VsbGVkJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAneWVzJylcclxuXHRcdFx0XHRcdHJlc29sdmUodHJ1ZSk7XHJcblx0XHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdubycpXHJcblx0XHRcdFx0XHRyZXNvbHZlKGZhbHNlKTtcclxuXHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3BsYXllcicpXHJcblx0XHRcdFx0XHRyZXNvbHZlKGV2dC5kYXRhKTtcclxuXHRcdFx0XHRlbHNlIGlmKGNob2ljZXMgPT09IFBPTElDWSlcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHQvLyBjbGlja2VkIGNhcmQgZGV0YWNoZXMgYW5kIHdpbmtzIG91dFxyXG5cdFx0XHRcdFx0bGV0IGNhcmQgPSBzZWxmLnBvbGljaWVzWyhhbnN3ZXIrMyklM107XHJcblx0XHRcdFx0XHRjYXJkLmFwcGx5TWF0cml4KHNlbGYubWF0cml4KTtcclxuXHRcdFx0XHRcdHNlbGYuc2VhdC5hZGQoY2FyZCk7XHJcblx0XHRcdFx0XHRBbmltYXRlLndpbmtPdXQoY2FyZCwgMzAwKS50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0c2VsZi5zZWF0LnJlbW92ZShjYXJkKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdHJlc29sdmUoYW5zd2VyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmKGFuc3dlciA9PT0gJ3llcycpXHJcblx0XHRcdFx0c2VsZi5feWVzQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcclxuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdubycpXHJcblx0XHRcdFx0c2VsZi5fbm9DbGlja0hhbmRsZXIgPSBoYW5kbGVyO1xyXG5cdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3BsYXllcicpXHJcblx0XHRcdFx0c2VsZi5fbm9taW5hdGVIYW5kbGVyID0gaGFuZGxlcjtcclxuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdjYW5jZWwnKVxyXG5cdFx0XHRcdHNlbGYuX2NhbmNlbEhhbmRsZXIgPSBoYW5kbGVyO1xyXG5cclxuXHRcdFx0cmV0dXJuIGhhbmRsZXI7XHJcblx0XHR9XHJcblxyXG5cdFx0c2VsZi5sYXN0UXVldWVkID0gc2VsZi5sYXN0UXVldWVkLnRoZW4oaG9va1VwUXVlc3Rpb24sIGhvb2tVcFF1ZXN0aW9uKTtcclxuXHJcblx0XHRyZXR1cm4gc2VsZi5sYXN0UXVldWVkO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IHtCYWxsb3QsIFBMQVlFUlNFTEVDVCwgQ09ORklSTSwgQklOQVJZLCBQT0xJQ1l9O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQge0Zhc2Npc3RSb2xlQ2FyZCwgSGl0bGVyUm9sZUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZH0gZnJvbSAnLi9jYXJkJztcclxuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0IHtOQmlsbGJvYXJkfSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xyXG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxheWVySW5mbyBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcihzZWF0KVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xyXG5cdFx0dGhpcy5jYXJkID0gbnVsbDtcclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAsIDAuMyk7XHJcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjMpO1xyXG5cdFx0c2VhdC5hZGQodGhpcyk7XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgbGF0ZVVwZGF0ZSh0aGlzLnVwZGF0ZVN0YXRlLmJpbmQodGhpcykpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2ludmVzdGlnYXRlJywgdGhpcy5wcmVzZW50UGFydHkuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVTdGF0ZSh7ZGF0YToge2dhbWUsIHBsYXllcnMsIHZvdGVzfX0pXHJcblx0e1xyXG5cdFx0bGV0IGxvY2FsUGxheWVyID0gcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdIHx8IHt9O1xyXG5cdFx0bGV0IHNlYXRlZFBsYXllciA9IHBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXSB8fCB7fTtcclxuXHRcdGxldCB2b3RlID0gdm90ZXNbZ2FtZS5sYXN0RWxlY3Rpb25dO1xyXG5cclxuXHRcdGxldCBzZWF0ZWRSb2xlU2hvdWxkQmVWaXNpYmxlID1cclxuXHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ2RvbmUnIHx8XHJcblx0XHRcdGdhbWUuc3RhdGUgPT09ICduaWdodCcgJiYgKFxyXG5cdFx0XHRcdGxvY2FsUGxheWVyID09PSBzZWF0ZWRQbGF5ZXIgfHxcclxuXHRcdFx0XHRsb2NhbFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgJiYgKHNlYXRlZFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgfHwgc2VhdGVkUGxheWVyLnJvbGUgPT09ICdoaXRsZXInKSB8fFxyXG5cdFx0XHRcdGxvY2FsUGxheWVyLnJvbGUgPT09ICdoaXRsZXInICYmIHNlYXRlZFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgJiYgZ2FtZS50dXJuT3JkZXIubGVuZ3RoIDwgN1xyXG5cdFx0XHQpO1xyXG5cclxuXHRcdGlmKHRoaXMuc2VhdC5vd25lciAmJiBzZWF0ZWRSb2xlU2hvdWxkQmVWaXNpYmxlKVxyXG5cdFx0e1xyXG5cdFx0XHRpZih0aGlzLmNhcmQgJiYgdGhpcy5jYXJkLnVzZXJEYXRhLnR5cGUgIT09ICdyb2xlJyl7XHJcblx0XHRcdFx0dGhpcy5yZW1vdmUodGhpcy5jYXJkKTtcclxuXHRcdFx0XHR0aGlzLmNhcmQgPSBudWxsO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzd2l0Y2goc2VhdGVkUGxheWVyLnJvbGUpe1xyXG5cdFx0XHRcdGNhc2UgJ2Zhc2Npc3QnOiB0aGlzLmNhcmQgPSBuZXcgRmFzY2lzdFJvbGVDYXJkKCk7IGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2hpdGxlcicgOiB0aGlzLmNhcmQgPSBuZXcgSGl0bGVyUm9sZUNhcmQoKTsgIGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2xpYmVyYWwnOiB0aGlzLmNhcmQgPSBuZXcgTGliZXJhbFJvbGVDYXJkKCk7IGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGlzLmNhcmQudXNlckRhdGEudHlwZSA9ICdyb2xlJztcclxuXHRcdFx0dGhpcy5hZGQodGhpcy5jYXJkKTtcclxuXHRcdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcclxuXHRcdFx0QW5pbWF0ZS53aW5rSW4odGhpcy5jYXJkLCAzMDApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih0aGlzLnNlYXQub3duZXIgJiYgZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyAmJiAhdm90ZS5ub25Wb3RlcnMuaW5jbHVkZXModGhpcy5zZWF0Lm93bmVyKSlcclxuXHRcdHtcclxuXHRcdFx0aWYodGhpcy5jYXJkICYmIHRoaXMuY2FyZC51c2VyRGF0YS50eXBlICE9PSAndm90ZScpe1xyXG5cdFx0XHRcdHRoaXMucmVtb3ZlKHRoaXMuY2FyZCk7XHJcblx0XHRcdFx0dGhpcy5jYXJkID0gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bGV0IHBsYXllclZvdGUgPSB2b3RlLnllc1ZvdGVycy5pbmNsdWRlcyh0aGlzLnNlYXQub3duZXIpO1xyXG5cdFx0XHR0aGlzLmNhcmQgPSBwbGF5ZXJWb3RlID8gbmV3IEphQ2FyZCgpIDogbmV3IE5laW5DYXJkKCk7XHJcblxyXG5cdFx0XHR0aGlzLmNhcmQudXNlckRhdGEudHlwZSA9ICd2b3RlJztcclxuXHRcdFx0dGhpcy5hZGQodGhpcy5jYXJkKTtcclxuXHRcdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcclxuXHRcdFx0QW5pbWF0ZS53aW5rSW4odGhpcy5jYXJkLCAzMDApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih0aGlzLmNhcmQgIT09IG51bGwpXHJcblx0XHR7XHJcblx0XHRcdEFuaW1hdGUud2lua091dCh0aGlzLmNhcmQsIDMwMCkudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5yZW1vdmUodGhpcy5jYXJkKTtcclxuXHRcdFx0XHR0aGlzLmNhcmQgPSBudWxsO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByZXNlbnRQYXJ0eSh7ZGF0YTogdXNlcklkfSlcclxuXHR7XHJcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyIHx8IHRoaXMuc2VhdC5vd25lciAhPT0gdXNlcklkKSByZXR1cm47XHJcblxyXG5cdFx0aWYodGhpcy5jYXJkICYmIHRoaXMuY2FyZC51c2VyRGF0YS50eXBlICE9PSAncGFydHknKXtcclxuXHRcdFx0dGhpcy5yZW1vdmUodGhpcy5jYXJkKTtcclxuXHRcdFx0dGhpcy5jYXJkID0gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgcm9sZSA9IFNILnBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXS5yb2xlO1xyXG5cdFx0dGhpcy5jYXJkID0gIHJvbGUgPT09ICdsaWJlcmFsJyA/IG5ldyBMaWJlcmFsUGFydHlDYXJkKCkgOiBuZXcgRmFzY2lzdFBhcnR5Q2FyZCgpO1xyXG5cclxuXHRcdHRoaXMuY2FyZC51c2VyRGF0YS50eXBlID0gJ3BhcnR5JztcclxuXHRcdHRoaXMuYWRkKHRoaXMuY2FyZCk7XHJcblx0XHRsZXQgYmIgPSBuZXcgTkJpbGxib2FyZCh0aGlzLmNhcmQpO1xyXG5cdFx0QW5pbWF0ZS53aW5rSW4odGhpcy5jYXJkLCAzMDApO1xyXG5cdH1cclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2Fwc3VsZUdlb21ldHJ5IGV4dGVuZHMgVEhSRUUuQnVmZmVyR2VvbWV0cnlcclxue1xyXG5cdGNvbnN0cnVjdG9yKHJhZGl1cywgaGVpZ2h0LCBzZWdtZW50cyA9IDEyLCByaW5ncyA9IDgpXHJcblx0e1xyXG5cdFx0c3VwZXIoKTtcclxuXHJcblx0XHRsZXQgbnVtVmVydHMgPSAyICogcmluZ3MgKiBzZWdtZW50cyArIDI7XHJcblx0XHRsZXQgbnVtRmFjZXMgPSA0ICogcmluZ3MgKiBzZWdtZW50cztcclxuXHRcdGxldCB0aGV0YSA9IDIqTWF0aC5QSS9zZWdtZW50cztcclxuXHRcdGxldCBwaGkgPSBNYXRoLlBJLygyKnJpbmdzKTtcclxuXHJcblx0XHRsZXQgdmVydHMgPSBuZXcgRmxvYXQzMkFycmF5KDMqbnVtVmVydHMpO1xyXG5cdFx0bGV0IGZhY2VzID0gbmV3IFVpbnQxNkFycmF5KDMqbnVtRmFjZXMpO1xyXG5cdFx0bGV0IHZpID0gMCwgZmkgPSAwLCB0b3BDYXAgPSAwLCBib3RDYXAgPSAxO1xyXG5cclxuXHRcdHZlcnRzLnNldChbMCwgaGVpZ2h0LzIsIDBdLCAzKnZpKyspO1xyXG5cdFx0dmVydHMuc2V0KFswLCAtaGVpZ2h0LzIsIDBdLCAzKnZpKyspO1xyXG5cclxuXHRcdGZvciggbGV0IHM9MDsgczxzZWdtZW50czsgcysrIClcclxuXHRcdHtcclxuXHRcdFx0Zm9yKCBsZXQgcj0xOyByPD1yaW5nczsgcisrKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bGV0IHJhZGlhbCA9IHJhZGl1cyAqIE1hdGguc2luKHIqcGhpKTtcclxuXHJcblx0XHRcdFx0Ly8gY3JlYXRlIHZlcnRzXHJcblx0XHRcdFx0dmVydHMuc2V0KFtcclxuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguY29zKHMqdGhldGEpLFxyXG5cdFx0XHRcdFx0aGVpZ2h0LzIgLSByYWRpdXMqKDEtTWF0aC5jb3MocipwaGkpKSxcclxuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguc2luKHMqdGhldGEpXHJcblx0XHRcdFx0XSwgMyp2aSsrKTtcclxuXHJcblx0XHRcdFx0dmVydHMuc2V0KFtcclxuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguY29zKHMqdGhldGEpLFxyXG5cdFx0XHRcdFx0LWhlaWdodC8yICsgcmFkaXVzKigxLU1hdGguY29zKHIqcGhpKSksXHJcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLnNpbihzKnRoZXRhKVxyXG5cdFx0XHRcdF0sIDMqdmkrKyk7XHJcblxyXG5cdFx0XHRcdGxldCB0b3BfczFyMSA9IHZpLTIsIHRvcF9zMXIwID0gdmktNDtcclxuXHRcdFx0XHRsZXQgYm90X3MxcjEgPSB2aS0xLCBib3RfczFyMCA9IHZpLTM7XHJcblx0XHRcdFx0bGV0IHRvcF9zMHIxID0gdG9wX3MxcjEgLSAyKnJpbmdzLCB0b3BfczByMCA9IHRvcF9zMXIwIC0gMipyaW5ncztcclxuXHRcdFx0XHRsZXQgYm90X3MwcjEgPSBib3RfczFyMSAtIDIqcmluZ3MsIGJvdF9zMHIwID0gYm90X3MxcjAgLSAyKnJpbmdzO1xyXG5cdFx0XHRcdGlmKHMgPT09IDApe1xyXG5cdFx0XHRcdFx0dG9wX3MwcjEgKz0gbnVtVmVydHMtMjtcclxuXHRcdFx0XHRcdHRvcF9zMHIwICs9IG51bVZlcnRzLTI7XHJcblx0XHRcdFx0XHRib3RfczByMSArPSBudW1WZXJ0cy0yO1xyXG5cdFx0XHRcdFx0Ym90X3MwcjAgKz0gbnVtVmVydHMtMjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGNyZWF0ZSBmYWNlc1xyXG5cdFx0XHRcdGlmKHIgPT09IDEpXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFt0b3BDYXAsIHRvcF9zMXIxLCB0b3BfczByMV0sIDMqZmkrKyk7XHJcblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdENhcCwgYm90X3MwcjEsIGJvdF9zMXIxXSwgMypmaSsrKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGZhY2VzLnNldChbdG9wX3MxcjAsIHRvcF9zMXIxLCB0b3BfczByMF0sIDMqZmkrKyk7XHJcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcF9zMHIwLCB0b3BfczFyMSwgdG9wX3MwcjFdLCAzKmZpKyspO1xyXG5cclxuXHRcdFx0XHRcdGZhY2VzLnNldChbYm90X3MwcjEsIGJvdF9zMXIxLCBib3RfczByMF0sIDMqZmkrKyk7XHJcblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdF9zMHIwLCBib3RfczFyMSwgYm90X3MxcjBdLCAzKmZpKyspO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gY3JlYXRlIGxvbmcgc2lkZXNcclxuXHRcdFx0bGV0IHRvcF9zMSA9IHZpLTIsIHRvcF9zMCA9IHRvcF9zMSAtIDIqcmluZ3M7XHJcblx0XHRcdGxldCBib3RfczEgPSB2aS0xLCBib3RfczAgPSBib3RfczEgLSAyKnJpbmdzO1xyXG5cdFx0XHRpZihzID09PSAwKXtcclxuXHRcdFx0XHR0b3BfczAgKz0gbnVtVmVydHMtMjtcclxuXHRcdFx0XHRib3RfczAgKz0gbnVtVmVydHMtMjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZmFjZXMuc2V0KFt0b3BfczAsIHRvcF9zMSwgYm90X3MxXSwgMypmaSsrKTtcclxuXHRcdFx0ZmFjZXMuc2V0KFtib3RfczAsIHRvcF9zMCwgYm90X3MxXSwgMypmaSsrKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmFkZEF0dHJpYnV0ZSgncG9zaXRpb24nLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHZlcnRzLCAzKSk7XHJcblx0XHR0aGlzLnNldEluZGV4KG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoZmFjZXMsIDEpKTtcclxuXHR9XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCBDYXBzdWxlR2VvbWV0cnkgZnJvbSAnLi9jYXBzdWxlZ2VvbWV0cnknO1xyXG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xyXG5cclxubGV0IGhpdGJveEdlbyA9IG5ldyBDYXBzdWxlR2VvbWV0cnkoMC4zLCAxLjgpO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSGl0Ym94IGV4dGVuZHMgVEhSRUUuTWVzaFxyXG57XHJcblx0Y29uc3RydWN0b3Ioc2VhdClcclxuXHR7XHJcblx0XHRzdXBlcihoaXRib3hHZW8sIG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XHJcblx0XHRcdHRyYW5zcGFyZW50OiB0cnVlLFxyXG5cdFx0XHRvcGFjaXR5OiAwLFxyXG5cdFx0XHRzaWRlOiBUSFJFRS5CYWNrU2lkZVxyXG5cdFx0fSkpO1xyXG5cclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC0wLjUsIC0uMik7XHJcblx0XHR0aGlzLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XHJcblx0XHRzZWF0LmFkZCh0aGlzKTtcclxuXHJcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcmVudGVyJywgKCkgPT4gdGhpcy5tYXRlcmlhbC5vcGFjaXR5ID0gMC4xKTtcclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ybGVhdmUnLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwKTtcclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCAoKSA9PiB7XHJcblx0XHRcdFNILmRpc3BhdGNoRXZlbnQoe1xyXG5cdFx0XHRcdHR5cGU6ICdwbGF5ZXJTZWxlY3QnLFxyXG5cdFx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxyXG5cdFx0XHRcdGRhdGE6IHRoaXMuc2VhdC5vd25lclxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUodGhpcy51cGRhdGVWaXNpYmlsaXR5LmJpbmQodGhpcykpKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZVZpc2liaWxpdHkoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXHJcblx0e1xyXG5cdFx0bGV0IGxpdmluZ1BsYXllcnMgPSBnYW1lLnR1cm5PcmRlci5maWx0ZXIocCA9PiBwbGF5ZXJzW3BdLnN0YXRlICE9PSAnZGVhZCcpO1xyXG5cdFx0bGV0IHByZWNvbmRpdGlvbnMgPVxyXG5cdFx0XHRTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50ICYmXHJcblx0XHRcdHRoaXMuc2VhdC5vd25lciAhPT0gJycgJiZcclxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQgJiZcclxuXHRcdFx0bGl2aW5nUGxheWVycy5pbmNsdWRlcyh0aGlzLnNlYXQub3duZXIpO1xyXG5cclxuXHRcdGxldCBub21pbmF0ZWFibGUgPVxyXG5cdFx0XHRnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnICYmXHJcblx0XHRcdHRoaXMuc2VhdC5vd25lciAhPT0gZ2FtZS5sYXN0Q2hhbmNlbGxvciAmJlxyXG5cdFx0XHQobGl2aW5nUGxheWVycy5sZW5ndGggPD0gNSB8fCB0aGlzLnNlYXQub3duZXIgIT09IGdhbWUubGFzdFByZXNpZGVudCk7XHJcblxyXG5cdFx0bGV0IGludmVzdGlnYXRlYWJsZSA9XHJcblx0XHRcdGdhbWUuc3RhdGUgPT09ICdpbnZlc3RpZ2F0ZScgJiZcclxuXHRcdFx0cGxheWVyc1t0aGlzLnNlYXQub3duZXJdICYmIHBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXS5zdGF0ZSA9PT0gJ25vcm1hbCc7XHJcblxyXG5cdFx0bGV0IHN1Y2NlZWRhYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ25hbWVTdWNjZXNzb3InO1xyXG5cdFx0bGV0IGV4ZWN1dGFibGUgPSBnYW1lLnN0YXRlID09PSAnZXhlY3V0ZSc7XHJcblxyXG5cdFx0dGhpcy52aXNpYmxlID0gcHJlY29uZGl0aW9ucyAmJiAobm9taW5hdGVhYmxlIHx8IGludmVzdGlnYXRlYWJsZSB8fCBzdWNjZWVkYWJsZSB8fCBleGVjdXRhYmxlKTtcclxuXHR9XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XHJcbmltcG9ydCB7QmFsbG90fSBmcm9tICcuL2JhbGxvdCc7XHJcbmltcG9ydCBQbGF5ZXJJbmZvIGZyb20gJy4vcGxheWVyaW5mbyc7XHJcbmltcG9ydCBIaXRib3ggZnJvbSAnLi9oaXRib3gnO1xyXG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2VhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcihzZWF0TnVtKVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblxyXG5cdFx0dGhpcy5zZWF0TnVtID0gc2VhdE51bTtcclxuXHRcdHRoaXMub3duZXIgPSAnJztcclxuXHJcblx0XHQvLyBwb3NpdGlvbiBzZWF0XHJcblx0XHRsZXQgeCwgeT0wLjY1LCB6O1xyXG5cdFx0c3dpdGNoKHNlYXROdW0pe1xyXG5cdFx0Y2FzZSAwOiBjYXNlIDE6IGNhc2UgMjpcclxuXHRcdFx0eCA9IC0wLjgzMyArIDAuODMzKnNlYXROdW07XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIC0xLjA1KTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlIDM6IGNhc2UgNDpcclxuXHRcdFx0eiA9IC0wLjQzNyArIDAuODc0KihzZWF0TnVtLTMpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgxLjQyNSwgeSwgeik7XHJcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLzIsIDApO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XHJcblx0XHRcdHggPSAwLjgzMyAtIDAuODMzKihzZWF0TnVtLTUpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCh4LCB5LCAxLjA1KTtcclxuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEksIDApO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgODogY2FzZSA5OlxyXG5cdFx0XHR6ID0gMC40MzcgLSAwLjg3NCooc2VhdE51bS04KTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoLTEuNDI1LCB5LCB6KTtcclxuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLTEuNSpNYXRoLlBJLCAwKTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignY2hlY2tlZF9pbicsICh7ZGF0YTogaWR9KSA9PiB7XHJcblx0XHRcdGlmKHRoaXMub3duZXIgPT09IGlkKVxyXG5cdFx0XHRcdHRoaXMudXBkYXRlT3duZXJzaGlwKHtkYXRhOiB7Z2FtZTogU0guZ2FtZSwgcGxheWVyczogU0gucGxheWVyc319KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSkgPT4ge1xyXG5cdFx0XHRpZih0aGlzLm93bmVyICYmIHBsYXllcnNbdGhpcy5vd25lcl0uc3RhdGUgPT09ICdkZWFkJyl7XHJcblx0XHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0KDB4M2QyNzg5KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5uYW1lcGxhdGUgPSBuZXcgTmFtZXBsYXRlKHRoaXMpO1xyXG5cdFx0dGhpcy5iYWxsb3QgPSBuZXcgQmFsbG90KHRoaXMpO1xyXG5cdFx0dGhpcy5wbGF5ZXJJbmZvID0gbmV3IFBsYXllckluZm8odGhpcyk7XHJcblx0XHR0aGlzLmhpdGJveCA9IG5ldyBIaXRib3godGhpcyk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXHJcblx0e1xyXG5cdFx0bGV0IGlkcyA9IGdhbWUudHVybk9yZGVyIHx8IFtdO1xyXG5cclxuXHRcdC8vIHJlZ2lzdGVyIHRoaXMgc2VhdCBpZiBpdCdzIG5ld2x5IGNsYWltZWRcclxuXHRcdGlmKCAhdGhpcy5vd25lciApXHJcblx0XHR7XHJcblx0XHRcdC8vIGNoZWNrIGlmIGEgcGxheWVyIGhhcyBqb2luZWQgYXQgdGhpcyBzZWF0XHJcblx0XHRcdGZvcihsZXQgaSBpbiBpZHMpe1xyXG5cdFx0XHRcdGlmKHBsYXllcnNbaWRzW2ldXS5zZWF0TnVtID09IHRoaXMuc2VhdE51bSl7XHJcblx0XHRcdFx0XHR0aGlzLm93bmVyID0gaWRzW2ldO1xyXG5cdFx0XHRcdFx0dGhpcy5uYW1lcGxhdGUudXBkYXRlVGV4dChwbGF5ZXJzW2lkc1tpXV0uZGlzcGxheU5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHJlc2V0IHRoaXMgc2VhdCBpZiBpdCdzIG5ld2x5IHZhY2F0ZWRcclxuXHRcdGlmKCAhaWRzLmluY2x1ZGVzKHRoaXMub3duZXIpIClcclxuXHRcdHtcclxuXHRcdFx0dGhpcy5vd25lciA9ICcnO1xyXG5cdFx0XHRpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcclxuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KCc8Sm9pbj4nKTtcclxuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXRIZXgoMHhmZmZmZmYpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gdXBkYXRlIGRpc2Nvbm5lY3QgY29sb3JzXHJcblx0XHRlbHNlIGlmKCAhcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcclxuXHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ODA4MDgwKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoIHBsYXllcnNbdGhpcy5vd25lcl0uY29ubmVjdGVkICl7XHJcblx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweGZmZmZmZik7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7UGxhY2Vob2xkZXJNZXNoLCBOQmlsbGJvYXJkLCBOVGV4dH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcclxuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbnRpbnVlQm94IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKHBhcmVudClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5pY29uID0gbmV3IFRIUkVFLk1lc2goXHJcblx0XHRcdG5ldyBUSFJFRS5Cb3hCdWZmZXJHZW9tZXRyeSguMTUsIC4xNSwgLjE1KSxcclxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHgxMGEwMTB9KVxyXG5cdFx0KTtcclxuXHRcdEFuaW1hdGUuc3Bpbih0aGlzLmljb24pO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5pY29uKTtcclxuXHJcblx0XHR0aGlzLnRleHQgPSBQbGFjZWhvbGRlck1lc2guY2xvbmUoKTtcclxuXHRcdHRoaXMudGV4dC5wb3NpdGlvbi5zZXQoMCwgLjIsIDApO1xyXG5cdFx0dGhpcy50ZXh0LnVzZXJEYXRhLmFsdHNwYWNlID0ge2NvbGxpZGVyOiB7ZW5hYmxlZDogdHJ1ZX19O1xyXG5cclxuXHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMudGV4dCk7XHJcblxyXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50ID0gbmV3IE5UZXh0KHRoaXMudGV4dCk7XHJcblx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHtmb250U2l6ZTogMSwgd2lkdGg6IDIsIGhlaWdodDogMSwgaG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJywgdmVydGljYWxBbGlnbjogJ21pZGRsZSd9KTtcclxuXHJcblx0XHR0aGlzLmFkZCh0aGlzLnRleHQpO1xyXG5cclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAuMjUsIDApO1xyXG5cdFx0cGFyZW50LmFkZCh0aGlzKTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCB0aGlzLm9uc3RhdGVjaGFuZ2UuYmluZCh0aGlzKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy5wbGF5ZXJTZXR1cC5iaW5kKHRoaXMpKTtcclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLm9uY2xpY2suYmluZCh0aGlzKSk7XHJcblx0XHR0aGlzLmFkZEJlaGF2aW9yKCBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlclNjYWxlKCkgKTtcclxuXHJcblx0XHRsZXQgc2hvdyA9ICgpID0+IHRoaXMuc2hvdygpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignaW52ZXN0aWdhdGUnLCBzaG93KTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3BvbGljeUFuaW1Eb25lJywgc2hvdyk7XHJcblx0fVxyXG5cclxuXHRvbmNsaWNrKGV2dClcclxuXHR7XHJcblx0XHRpZihTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxyXG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnY29udGludWUnKTtcclxuXHR9XHJcblxyXG5cdG9uc3RhdGVjaGFuZ2Uoe2RhdGE6IHtnYW1lfX0pXHJcblx0e1xyXG5cdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyB8fCAoZ2FtZS5zdGF0ZSA9PT0gJ3BlZWsnICYmIGdhbWUucHJlc2lkZW50ID09PSBTSC5sb2NhbFVzZXIuaWQpKXtcclxuXHRcdFx0dGhpcy5zaG93KCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xyXG5cdFx0XHR0aGlzLnBsYXllclNldHVwKHtkYXRhOiB7Z2FtZX19KTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2RvbmUnKXtcclxuXHRcdFx0dGhpcy5oaWRlKCk7XHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuc2hvdygnTmV3IGdhbWUnKTtcclxuXHRcdFx0fSwgODAwMCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0dGhpcy5oaWRlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwbGF5ZXJTZXR1cCh7ZGF0YToge2dhbWV9fSlcclxuXHR7XHJcblx0XHRpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcclxuXHRcdFx0dGhpcy50ZXh0LnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRsZXQgcGxheWVyQ291bnQgPSBnYW1lLnR1cm5PcmRlci5sZW5ndGg7XHJcblx0XHRcdGlmKHBsYXllckNvdW50ID49IDUpe1xyXG5cdFx0XHRcdHRoaXMuaWNvbi52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OlxyXG5cdFx0XHRcdFx0YCgke3BsYXllckNvdW50fS81KSBDbGljayB3aGVuIHJlYWR5YFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuaWNvbi52aXNpYmxlID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDpcclxuXHRcdFx0XHRcdGAoJHtwbGF5ZXJDb3VudH0vNSkgTmVlZCBtb3JlIHBsYXllcnNgXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHNob3cobWVzc2FnZSA9ICdDbGljayB0byBjb250aW51ZScpe1xyXG5cdFx0dGhpcy5pY29uLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0dGhpcy50ZXh0LnZpc2libGUgPSB0cnVlO1xyXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDogbWVzc2FnZX0pO1xyXG5cdH1cclxuXHJcblx0aGlkZSgpe1xyXG5cdFx0dGhpcy5pY29uLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMudGV4dC52aXNpYmxlID0gZmFsc2U7XHJcblx0fVxyXG59OyIsImltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XHJcblxyXG5jb25zdCBwb3NpdGlvbnMgPSBbXHJcblx0bmV3IFRIUkVFLlZlY3RvcjMoMC4zNjgsIC4wMDUsIC0uNzE3KSxcclxuXHRuZXcgVEhSRUUuVmVjdG9yMygwLjEzNSwgLjAxMCwgLS43MTcpLFxyXG5cdG5ldyBUSFJFRS5WZWN0b3IzKC0uMDk2LCAuMDE1LCAtLjcxNyksXHJcblx0bmV3IFRIUkVFLlZlY3RvcjMoLS4zMjksIC4wMjAsIC0uNzE3KVxyXG5dO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRWxlY3Rpb25UcmFja2VyIGV4dGVuZHMgVEhSRUUuTWVzaFxyXG57XHJcblx0Y29uc3RydWN0b3IoKVxyXG5cdHtcclxuXHRcdHN1cGVyKFxyXG5cdFx0XHRuZXcgVEhSRUUuQ3lsaW5kZXJCdWZmZXJHZW9tZXRyeSguMDQsIC4wNCwgLjAxLCAxNiksXHJcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCgpXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5wb3NpdGlvbi5jb3B5KHBvc2l0aW9uc1swXSk7XHJcblx0XHRTSC50YWJsZS5hZGQodGhpcyk7XHJcblx0XHRcclxuXHRcdC8vIGZhaWxzJTMgPT0gMCBvciAzP1xyXG5cdFx0dGhpcy5oaWdoU2lkZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5zcG90ID0gMDtcclxuXHRcdHRoaXMubWF0ZXJpYWwuY29sb3Iuc2V0SFNMKC41MjgsIC4zMSwgLjQpO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9mYWlsZWRWb3RlcycsIHRoaXMudXBkYXRlRmFpbGVkVm90ZXMuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVGYWlsZWRWb3Rlcyh7ZGF0YToge2dhbWU6IHtmYWlsZWRWb3Rlc319fSA9IHtkYXRhOiB7Z2FtZToge2ZhaWxlZFZvdGVzOiAtMX19fSlcclxuXHR7XHJcblx0XHRpZihmYWlsZWRWb3RlcyA9PT0gLTEpXHJcblx0XHRcdGZhaWxlZFZvdGVzID0gdGhpcy5zcG90O1xyXG5cclxuXHRcdHRoaXMuaGlnaFNpZGUgPSBmYWlsZWRWb3RlcyA+IDA7XHJcblx0XHR0aGlzLnNwb3QgPSBmYWlsZWRWb3RlcyUzIHx8IHRoaXMuaGlnaFNpZGUgJiYgMyB8fCAwO1xyXG5cclxuXHRcdHRoaXMuYW5pbSA9IEFuaW1hdGUuc2ltcGxlKHRoaXMsIHtcclxuXHRcdFx0cG9zOiBwb3NpdGlvbnNbdGhpcy5zcG90XSxcclxuXHRcdFx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDEsIDErdGhpcy5zcG90LCAxKSxcclxuXHRcdFx0aHVlOiAuNTI4KigxLXRoaXMuc3BvdC8zKSxcclxuXHRcdFx0ZHVyYXRpb246IDEyMDBcclxuXHRcdH0pO1xyXG5cdH1cclxufSIsImltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7Q3JlZGl0c0NhcmR9IGZyb20gJy4vY2FyZCc7XHJcbmltcG9ydCB7UGxhY2Vob2xkZXJNZXNoLCBOQmlsbGJvYXJkLCBOVGV4dH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcclxuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcclxuaW1wb3J0IHt0cmFuc2xhdGUgYXMgdHJ9IGZyb20gJy4vdGhlbWUnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUHJlc2VudGF0aW9uIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0U0gudGFibGUuYWRkKHRoaXMpO1xyXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLS45LCAwKTtcclxuXHJcblx0XHQvLyBjcmVhdGUgaWRsZSBkaXNwbGF5XHJcblx0XHR0aGlzLmNyZWRpdHMgPSBuZXcgQ3JlZGl0c0NhcmQoKTtcclxuXHRcdHRoaXMuY3JlZGl0cy5wb3NpdGlvbi5zZXQoMCwgMS44NSwgMCk7XHJcblx0XHRBbmltYXRlLnNwaW4odGhpcy5jcmVkaXRzLCAzMDAwMCk7XHJcblx0XHR0aGlzLmFkZCh0aGlzLmNyZWRpdHMpO1xyXG5cdFx0XHJcblx0XHQvLyBjcmVhdGUgdmljdG9yeSBiYW5uZXJcclxuXHRcdHRoaXMuYmFubmVyID0gUGxhY2Vob2xkZXJNZXNoLmNsb25lKCk7XHJcblx0XHR0aGlzLmJhbm5lci50ZXh0ID0gbmV3IE5UZXh0KHRoaXMuYmFubmVyKTtcclxuXHRcdHRoaXMuYmFubmVyLnRleHQudXBkYXRlKHtmb250U2l6ZTogMn0pO1xyXG5cdFx0dGhpcy5iYW5uZXIuYmlsbGJvYXJkID0gbmV3IE5CaWxsYm9hcmQodGhpcy5iYW5uZXIpO1xyXG5cdFx0dGhpcy5iYW5uZXIuYm9iID0gbnVsbDtcclxuXHRcdHRoaXMuYWRkKHRoaXMuYmFubmVyKTtcclxuXHJcblx0XHQvLyB1cGRhdGUgc3R1ZmZcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIHRoaXMudXBkYXRlT25TdGF0ZS5iaW5kKHRoaXMpKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZU9uU3RhdGUoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXHJcblx0e1xyXG5cdFx0dGhpcy5iYW5uZXIudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5jcmVkaXRzLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdGlmKHRoaXMuYmFubmVyLmJvYil7XHJcblx0XHRcdHRoaXMuYmFubmVyLmJvYi5zdG9wKCk7XHJcblx0XHRcdHRoaXMuYmFubmVyLmJvYiA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJyl7XHJcblx0XHRcdHRoaXMuY3JlZGl0cy52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2RvbmUnKVxyXG5cdFx0e1xyXG5cdFx0XHRpZigvXmxpYmVyYWwvLnRlc3QoZ2FtZS52aWN0b3J5KSl7XHJcblx0XHRcdFx0dGhpcy5iYW5uZXIudGV4dC5jb2xvciA9ICcjMTkxOWZmJztcclxuXHRcdFx0XHR0aGlzLmJhbm5lci50ZXh0LnVwZGF0ZSh7dGV4dDogJ0xpYmVyYWxzIHdpbiEnfSk7XHJcblx0XHRcdFx0U0guYXVkaW8ubGliZXJhbEZhbmZhcmUucGxheSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQuY29sb3IgPSAncmVkJztcclxuXHRcdFx0XHR0aGlzLmJhbm5lci50ZXh0LnVwZGF0ZSh7dGV4dDogJ0Zhc2Npc3RzIHdpbiEnfSk7XHJcblx0XHRcdFx0U0guYXVkaW8uZmFzY2lzdEZhbmZhcmUucGxheSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLmJhbm5lci5wb3NpdGlvbi5zZXQoMCwwLjgsMCk7XHJcblx0XHRcdHRoaXMuYmFubmVyLnNjYWxlLnNldFNjYWxhciguMDAxKTtcclxuXHRcdFx0dGhpcy5iYW5uZXIudmlzaWJsZSA9IHRydWU7XHJcblx0XHRcdEFuaW1hdGUuc2ltcGxlKHRoaXMuYmFubmVyLCB7XHJcblx0XHRcdFx0cG9zOiBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLjgsIDApLFxyXG5cdFx0XHRcdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygxLDEsMSksXHJcblx0XHRcdFx0ZHVyYXRpb246IDEwMDBcclxuXHRcdFx0fSlcclxuXHRcdFx0LnRoZW4oKCkgPT4gdGhpcy5iYW5uZXIuYm9iID0gQW5pbWF0ZS5ib2IodGhpcy5iYW5uZXIpKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTEnICYmIGdhbWUuZmFzY2lzdFBvbGljaWVzID49IDMpXHJcblx0XHR7XHJcblx0XHRcdGxldCBjaGFuY2VsbG9yID0gcGxheWVyc1tnYW1lLmNoYW5jZWxsb3JdLmRpc3BsYXlOYW1lO1xyXG5cdFx0XHR0aGlzLmJhbm5lci50ZXh0LmNvbG9yID0gJ3doaXRlJztcclxuXHRcdFx0dGhpcy5iYW5uZXIudGV4dC51cGRhdGUoe3RleHQ6IGAke2NoYW5jZWxsb3J9IGlzIG5vdCAke3RyKCdIaXRsZXInKX0hYH0pO1xyXG5cclxuXHRcdFx0dGhpcy5iYW5uZXIucG9zaXRpb24uc2V0KDAsMC44LDApO1xyXG5cdFx0XHR0aGlzLmJhbm5lci5zY2FsZS5zZXRTY2FsYXIoLjAwMSk7XHJcblx0XHRcdHRoaXMuYmFubmVyLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRBbmltYXRlLnNpbXBsZSh0aGlzLmJhbm5lciwge1xyXG5cdFx0XHRcdHBvczogbmV3IFRIUkVFLlZlY3RvcjMoMCwgMS44LCAwKSxcclxuXHRcdFx0XHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMSwxLDEpXHJcblx0XHRcdH0pXHJcblx0XHRcdC50aGVuKCgpID0+IHRoaXMuYmFubmVyLmJvYiA9IEFuaW1hdGUuYm9iKHRoaXMuYmFubmVyKSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9XHJcbn1cclxuIiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IHthY3RpdmVUaGVtZSBhcyB0aGVtZX0gZnJvbSAnLi90aGVtZSc7XHJcblxyXG5jbGFzcyBBdWRpb1N0cmVhbVxyXG57XHJcblx0Y29uc3RydWN0b3IoY29udGV4dCwgYnVmZmVyLCBvdXRwdXQpe1xyXG5cdFx0dGhpcy5zb3VyY2UgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xyXG5cdFx0dGhpcy5zb3VyY2UuYnVmZmVyID0gYnVmZmVyO1xyXG5cdFx0dGhpcy5zb3VyY2UuY29ubmVjdChvdXRwdXQpO1xyXG5cdFx0dGhpcy5maW5pc2hlZFBsYXlpbmcgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblx0XHRcdHRoaXMuX3Jlc29sdmUgPSByZXNvbHZlO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwbGF5KCl7XHJcblx0XHRpZigvQWx0c3BhY2VWUi8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSlcclxuXHRcdFx0dGhpcy5zb3VyY2Uuc3RhcnQoMCwgMCk7XHJcblx0XHRzZXRUaW1lb3V0KHRoaXMuX3Jlc29sdmUsIE1hdGguY2VpbCh0aGlzLnNvdXJjZS5idWZmZXIuZHVyYXRpb24qMTAwMCArIDQwMCkpO1xyXG5cdH1cclxuXHJcblx0c3RvcCgpe1xyXG5cdFx0dGhpcy5zb3VyY2Uuc3RvcCgpO1xyXG5cdH1cclxufVxyXG5cclxubGV0IHF1ZXVlZFN0cmVhbXMgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHJcbmNsYXNzIEF1ZGlvQ2xpcFxyXG57XHJcblx0Y29uc3RydWN0b3IoY29udGV4dCwgdXJsLCB2b2x1bWUsIHF1ZXVlZCA9IHRydWUpXHJcblx0e1xyXG5cdFx0dGhpcy5jb250ZXh0ID0gY29udGV4dDtcclxuXHRcdHRoaXMub3V0cHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XHJcblx0XHR0aGlzLm91dHB1dC5nYWluLnZhbHVlID0gdm9sdW1lO1xyXG5cdFx0dGhpcy5vdXRwdXQuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTtcclxuXHJcblx0XHR0aGlzLmxvYWRlZCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0bGV0IGxvYWRlciA9IG5ldyBUSFJFRS5GaWxlTG9hZGVyKCk7XHJcblx0XHRcdGxvYWRlci5zZXRSZXNwb25zZVR5cGUoJ2FycmF5YnVmZmVyJyk7XHJcblx0XHRcdGxvYWRlci5sb2FkKHVybCwgYnVmZmVyID0+IHtcclxuXHRcdFx0XHRjb250ZXh0LmRlY29kZUF1ZGlvRGF0YShidWZmZXIsIGRlY29kZWRCdWZmZXIgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5idWZmZXIgPSBkZWNvZGVkQnVmZmVyO1xyXG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pXHJcblx0fVxyXG5cclxuXHRwbGF5KHF1ZXVlZCA9IGZhbHNlKVxyXG5cdHtcclxuXHRcdHJldHVybiB0aGlzLmxvYWRlZC50aGVuKCgpID0+IHtcclxuXHRcdFx0bGV0IGluc3RhbmNlID0gbmV3IEF1ZGlvU3RyZWFtKHRoaXMuY29udGV4dCwgdGhpcy5idWZmZXIsIHRoaXMub3V0cHV0KTtcclxuXHRcdFx0XHJcblx0XHRcdGlmKHF1ZXVlZCl7XHJcblx0XHRcdFx0cXVldWVkU3RyZWFtcyA9IHF1ZXVlZFN0cmVhbXMudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHRpbnN0YW5jZS5wbGF5KCk7XHJcblx0XHRcdFx0XHRyZXR1cm4gaW5zdGFuY2UuZmluaXNoZWRQbGF5aW5nO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHJldHVybiBxdWV1ZWRTdHJlYW1zO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdGluc3RhbmNlLnBsYXkoKTtcclxuXHRcdFx0XHRyZXR1cm4gaW5zdGFuY2UuZmluaXNoZWRQbGF5aW5nO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIEZha2VBdWRpb0NsaXBcclxue1xyXG5cdGNvbnN0cnVjdG9yKCl7IHRoaXMuZmFrZXN0cmVhbSA9IG5ldyBGYWtlQXVkaW9TdHJlYW0oKTsgfVxyXG5cdHBsYXkoKXsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpOyB9XHJcbn1cclxuXHJcbmNsYXNzIEZha2VBdWRpb1N0cmVhbVxyXG57XHJcblx0Y29uc3RydWN0b3IoKXsgdGhpcy5maW5pc2hlZFBsYXlpbmcgPSBQcm9taXNlLnJlc29sdmUoKTsgfVxyXG5cdHBsYXkoKXsgfVxyXG5cdHN0b3AoKXsgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBdWRpb0NvbnRyb2xsZXJcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRsZXQgY29udGV4dCA9IHRoaXMuY29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcclxuXHRcdHRoaXMubGliZXJhbFN0aW5nID0gbmV3IEF1ZGlvQ2xpcCh0aGlzLmNvbnRleHQsIGAvc3RhdGljL2F1ZGlvL2hpdGxlci9saWJlcmFsLXN0aW5nLm9nZ2AsIDAuMik7XHJcblx0XHR0aGlzLmxpYmVyYWxGYW5mYXJlID0gbmV3IEF1ZGlvQ2xpcCh0aGlzLmNvbnRleHQsIGAvc3RhdGljL2F1ZGlvL2hpdGxlci9saWJlcmFsLWZhbmZhcmUub2dnYCwgMC4yKTtcclxuXHRcdHRoaXMuZmFzY2lzdFN0aW5nID0gbmV3IEF1ZGlvQ2xpcCh0aGlzLmNvbnRleHQsIGAvc3RhdGljL2F1ZGlvL2hpdGxlci9mYXNjaXN0LXN0aW5nLm9nZ2AsIDAuMSk7XHJcblx0XHR0aGlzLmZhc2Npc3RGYW5mYXJlID0gbmV3IEF1ZGlvQ2xpcCh0aGlzLmNvbnRleHQsIGAvc3RhdGljL2F1ZGlvL2hpdGxlci9mYXNjaXN0LWZhbmZhcmUub2dnYCwgMC4xKTtcclxuXHJcblx0XHRsZXQgZmFrZSA9IG5ldyBGYWtlQXVkaW9DbGlwKCk7XHJcblx0XHR0aGlzLnR1dG9yaWFsID0ge2xvYWRTdGFydGVkOiBmYWxzZX07XHJcblx0XHRbJ3dlbGNvbWUnLCduaWdodCcsJ25vbWluYXRpb24nLCd2b3RpbmcnLCd2b3RlRmFpbHMnLCd2b3RlUGFzc2VzJywncG9saWN5MScsJ3BvbGljeTInLCdwb2xpY3lGYXNjaXN0JyxcclxuXHRcdCdwb2xpY3lMaWJlcmFsJywncG9saWN5QWZ0ZXJtYXRoJywnd3JhcHVwJywncG93ZXIxJywncG93ZXIyJywnaW52ZXN0aWdhdGUnLCdwZWVrJywnbmFtZVN1Y2Nlc3NvcicsJ2V4ZWN1dGUnLFxyXG5cdFx0J3ZldG8nLCdyZWR6b25lJ10uZm9yRWFjaCh4ID0+IHRoaXMudHV0b3JpYWxbeF0gPSBmYWtlKTtcclxuXHR9XHJcblxyXG5cdGxvYWRUdXRvcmlhbChnYW1lKVxyXG5cdHtcclxuXHRcdGlmKCFnYW1lLnR1dG9yaWFsIHx8IHRoaXMudHV0b3JpYWwubG9hZFN0YXJ0ZWQpIHJldHVybjtcclxuXHJcblx0XHRsZXQgcmVhZGVyID0gZ2FtZS50dXRvcmlhbCwgY29udGV4dCA9IHRoaXMuY29udGV4dCwgdm9sdW1lID0gMC41O1xyXG5cclxuXHRcdE9iamVjdC5hc3NpZ24odGhpcy50dXRvcmlhbCwge1xyXG5cdFx0XHRsb2FkU3RhcnRlZDogdHJ1ZSxcclxuXHRcdFx0d2VsY29tZTogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvd2VsY29tZS5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRuaWdodDogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvbmlnaHQub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0bm9taW5hdGlvbjogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvbm9taW5hdGlvbi5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHR2b3Rpbmc6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3ZvdGluZy5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHR2b3RlRmFpbHM6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3ZvdGUtZmFpbHMub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0dm90ZVBhc3NlczogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvdm90ZS1wYXNzZWQub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cG9saWN5MTogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG9saWN5MS5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRwb2xpY3kyOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb2xpY3kyLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBvbGljeUZhc2Npc3Q6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3BvbGljeS1mYXNjaXN0Lm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBvbGljeUxpYmVyYWw6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3BvbGljeS1saWJlcmFsLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBvbGljeUFmdGVybWF0aDogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG9saWN5LWFmdGVybWF0aC5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHR3cmFwdXA6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3dyYXB1cC5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRwb3dlcjE6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyMS5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRwb3dlcjI6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyMi5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRpbnZlc3RpZ2F0ZTogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXItaW52ZXN0aWdhdGUub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cGVlazogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXItcGVlay5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRuYW1lU3VjY2Vzc29yOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlci1uYW1lc3VjY2Vzc29yLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdGV4ZWN1dGU6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyLWV4ZWN1dGUub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0dmV0bzogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXItdmV0by5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRyZWR6b25lOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9yZWR6b25lLm9nZ2AsIHZvbHVtZSlcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG4iLCJpbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHV0b3JpYWxNYW5hZ2VyXHJcbntcclxuXHRjb25zdHJ1Y3RvcigpXHJcblx0e1xyXG5cdFx0dGhpcy5lbmFibGVkID0gZmFsc2U7XHJcblx0XHR0aGlzLmxhc3RFdmVudCA9IG51bGw7XHJcblx0XHR0aGlzLnBsYXllZCA9IFtdO1xyXG5cdH1cclxuXHJcblx0ZGV0ZWN0RXZlbnQoZ2FtZSwgdm90ZXMpXHJcblx0e1xyXG5cdFx0bGV0IGxhc3RFbGVjdGlvbiA9IHZvdGVzW2dhbWUubGFzdEVsZWN0aW9uXTtcclxuXHRcdGxldCBmaXJzdFJvdW5kID0gZ2FtZS5mYXNjaXN0UG9saWNpZXMgKyBnYW1lLmxpYmVyYWxQb2xpY2llcyA9PT0gMDtcclxuXHJcblx0XHRpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICduaWdodCcpXHJcblx0XHRcdHJldHVybiAnbmlnaHQnO1xyXG5cdFx0ZWxzZSBpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScpXHJcblx0XHRcdHJldHVybiAnbm9taW5hdGlvbic7XHJcblx0XHRlbHNlIGlmKGZpcnN0Um91bmQgJiYgZ2FtZS5zdGF0ZSA9PT0gJ2VsZWN0aW9uJylcclxuXHRcdFx0cmV0dXJuICd2b3RpbmcnO1xyXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnbGFtZUR1Y2snICYmIGxhc3RFbGVjdGlvbi55ZXNWb3RlcnMubGVuZ3RoIDwgbGFzdEVsZWN0aW9uLnRvUGFzcyAmJiAhdGhpcy5wbGF5ZWQuaW5jbHVkZXMoJ3ZvdGVGYWlscycpKXtcclxuXHRcdFx0dGhpcy5wbGF5ZWQucHVzaCgndm90ZUZhaWxzJyk7XHJcblx0XHRcdHJldHVybiAndm90ZUZhaWxzJztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyAmJiBsYXN0RWxlY3Rpb24ueWVzVm90ZXJzLmxlbmd0aCA+PSBsYXN0RWxlY3Rpb24udG9QYXNzICYmICF0aGlzLnBsYXllZC5pbmNsdWRlcygndm90ZVBhc3NlcycpKXtcclxuXHRcdFx0dGhpcy5wbGF5ZWQucHVzaCgndm90ZVBhc3NlcycpO1xyXG5cdFx0XHRyZXR1cm4gJ3ZvdGVQYXNzZXMnO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICdwb2xpY3kxJylcclxuXHRcdFx0cmV0dXJuICdwb2xpY3kxJztcclxuXHRcdGVsc2UgaWYoZmlyc3RSb3VuZCAmJiBnYW1lLnN0YXRlID09PSAncG9saWN5MicpXHJcblx0XHRcdHJldHVybiAncG9saWN5Mic7XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnICYmIGdhbWUuZmFzY2lzdFBvbGljaWVzID09PSAxICYmIGdhbWUuaGFuZCA9PT0gMilcclxuXHRcdFx0cmV0dXJuICdwb2xpY3lGYXNjaXN0JztcclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2FmdGVybWF0aCcgJiYgZ2FtZS5saWJlcmFsUG9saWNpZXMgPT09IDEgJiYgZ2FtZS5oYW5kID09PSAzKVxyXG5cdFx0XHRyZXR1cm4gJ3BvbGljeUxpYmVyYWwnO1xyXG5cclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcytnYW1lLmxpYmVyYWxQb2xpY2llcyA9PT0gMSlcclxuXHRcdFx0cmV0dXJuICd3cmFwdXAnO1xyXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnICYmIGdhbWUuZmFzY2lzdFBvbGljaWVzID09PSAzICYmICF0aGlzLnBsYXllZC5pbmNsdWRlcygncmVkem9uZScpKXtcclxuXHRcdFx0dGhpcy5wbGF5ZWQucHVzaCgncmVkem9uZScpO1xyXG5cdFx0XHRyZXR1cm4gJ3JlZHpvbmUnO1xyXG5cdFx0fVxyXG5cclxuXHRcdGVsc2UgaWYoWydpbnZlc3RpZ2F0ZScsJ3BlZWsnLCduYW1lU3VjY2Vzc29yJywnZXhlY3V0ZSddLmluY2x1ZGVzKGdhbWUuc3RhdGUpKVxyXG5cdFx0e1xyXG5cdFx0XHRpZih0aGlzLnBsYXllZC5pbmNsdWRlcyhnYW1lLnN0YXRlKSlcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHJcblx0XHRcdGxldCBzdGF0ZTtcclxuXHRcdFx0aWYoZ2FtZS5mYXNjaXN0UG9saWNpZXMgPT09IDUpXHJcblx0XHRcdFx0c3RhdGUgPSAndmV0byc7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRzdGF0ZSA9IGdhbWUuc3RhdGU7XHJcblx0XHRcdHRoaXMucGxheWVkLnB1c2goc3RhdGUpO1xyXG5cclxuXHRcdFx0aWYoIXRoaXMucGxheWVkLmluY2x1ZGVzKCdwb3dlcicpKXtcclxuXHRcdFx0XHRzdGF0ZSA9ICdmaXJzdF8nK3N0YXRlO1xyXG5cdFx0XHRcdHRoaXMucGxheWVkLnB1c2goJ3Bvd2VyJyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBzdGF0ZTtcclxuXHRcdH1cclxuXHRcdGVsc2UgcmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHRzdGF0ZVVwZGF0ZShnYW1lLCB2b3RlcylcclxuXHR7XHJcblx0XHRpZighZ2FtZS50dXRvcmlhbCkgcmV0dXJuO1xyXG5cclxuXHRcdGxldCBzZWFtbGVzcyA9IHtcclxuXHRcdFx0cG9saWN5RmFzY2lzdDogWydwb2xpY3lGYXNjaXN0JywncG9saWN5QWZ0ZXJtYXRoJ10sXHJcblx0XHRcdHBvbGljeUxpYmVyYWw6IFsncG9saWN5TGliZXJhbCcsJ3BvbGljeUFmdGVybWF0aCddLFxyXG5cdFx0XHRmaXJzdF9pbnZlc3RpZ2F0ZTogWydwb3dlcjEnLCdwb3dlcjInLCdpbnZlc3RpZ2F0ZSddLFxyXG5cdFx0XHRmaXJzdF9wZWVrOiBbJ3Bvd2VyMScsJ3Bvd2VyMicsJ3BlZWsnXSxcclxuXHRcdFx0Zmlyc3RfbmFtZVN1Y2Nlc3NvcjogWydwb3dlcjEnLCdwb3dlcjInLCduYW1lU3VjY2Vzc29yJ10sXHJcblx0XHRcdGZpcnN0X2V4ZWN1dGU6IFsncG93ZXIxJywncG93ZXIyJywnZXhlY3V0ZSddLFxyXG5cdFx0XHRmaXJzdF92ZXRvOiBbJ3Bvd2VyMScsJ3Bvd2VyMicsJ3ZldG8nXSxcclxuXHRcdFx0aW52ZXN0aWdhdGU6IFsncG93ZXIxJywnaW52ZXN0aWdhdGUnXSxcclxuXHRcdFx0cGVlazogWydwb3dlcjEnLCdwZWVrJ10sXHJcblx0XHRcdG5hbWVTdWNjZXNzb3I6IFsncG93ZXIxJywnbmFtZVN1Y2Nlc3NvciddLFxyXG5cdFx0XHRleGVjdXRlOiBbJ3Bvd2VyMScsJ2V4ZWN1dGUnXSxcclxuXHRcdFx0dmV0bzogWydwb3dlcjEnLCd2ZXRvJ10sXHJcblx0XHRcdG5pZ2h0OiBbJ3dlbGNvbWUnLCduaWdodCddXHJcblx0XHR9O1xyXG5cdFx0bGV0IGRlbGF5ZWQgPSB7XHJcblx0XHRcdHBvbGljeUZhc2Npc3Q6ICdwb2xpY3lBbmltRG9uZScsXHJcblx0XHRcdHBvbGljeUxpYmVyYWw6ICdwb2xpY3lBbmltRG9uZSdcclxuXHRcdH07XHJcblxyXG5cdFx0bGV0IGV2ZW50ID0gdGhpcy5sYXN0RXZlbnQgPSB0aGlzLmRldGVjdEV2ZW50KGdhbWUsIHZvdGVzKTtcclxuXHRcdGNvbnNvbGUubG9nKCd0dXRvcmlhbCBldmVudDonLCBldmVudCk7XHJcblxyXG5cdFx0bGV0IHdhaXQgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdGlmKGRlbGF5ZWRbZXZlbnRdKXtcclxuXHRcdFx0d2FpdCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0XHRsZXQgaGFuZGxlciA9ICgpID0+IHtcclxuXHRcdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoZGVsYXllZFtldmVudF0sIGhhbmRsZXIpO1xyXG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcihkZWxheWVkW2V2ZW50XSwgaGFuZGxlcik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHNlYW1sZXNzW2V2ZW50XSlcclxuXHRcdHtcclxuXHRcdFx0d2FpdC50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRzZWFtbGVzc1tldmVudF0uZm9yRWFjaChjbGlwID0+IFNILmF1ZGlvLnR1dG9yaWFsW2NsaXBdLnBsYXkodHJ1ZSkpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZXZlbnQgIT09IG51bGwpXHJcblx0XHR7XHJcblx0XHRcdHdhaXQudGhlbigoKSA9PiBTSC5hdWRpby50dXRvcmlhbFtldmVudF0ucGxheSh0cnVlKSk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCAnLi9wb2x5ZmlsbCc7XHJcblxyXG5pbXBvcnQge2FjdGl2ZVRoZW1lIGFzIHRoZW1lfSBmcm9tICcuL3RoZW1lJztcclxuXHJcbmltcG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9IGZyb20gJy4vaGF0cyc7XHJcbmltcG9ydCBHYW1lVGFibGUgZnJvbSAnLi90YWJsZSc7XHJcbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5pbXBvcnQgeyBnZXRHYW1lSWQsIG1lcmdlT2JqZWN0cyB9IGZyb20gJy4vdXRpbHMnO1xyXG5pbXBvcnQgTmFtZXBsYXRlIGZyb20gJy4vbmFtZXBsYXRlJztcclxuaW1wb3J0IFNlYXQgZnJvbSAnLi9zZWF0JztcclxuaW1wb3J0IFBsYXllck1ldGVyIGZyb20gJy4vcGxheWVybWV0ZXInO1xyXG5pbXBvcnQgQ29udGludWVCb3ggZnJvbSAnLi9jb250aW51ZWJveCc7XHJcbmltcG9ydCBFbGVjdGlvblRyYWNrZXIgZnJvbSAnLi9lbGVjdGlvbnRyYWNrZXInO1xyXG5pbXBvcnQgUHJlc2VudGF0aW9uIGZyb20gJy4vcHJlc2VudGF0aW9uJztcclxuaW1wb3J0IEF1ZGlvQ29udHJvbGxlciBmcm9tICcuL2F1ZGlvY29udHJvbGxlcic7XHJcbmltcG9ydCBUdXRvcmlhbCBmcm9tICcuL3R1dG9yaWFsJztcclxuXHJcbmNsYXNzIFNlY3JldEhpdGxlciBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcigpXHJcblx0e1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuYXNzZXRzID0gQXNzZXRNYW5hZ2VyLm1hbmlmZXN0O1xyXG5cdFx0dGhpcy52ZXJ0aWNhbEFsaWduID0gJ2JvdHRvbSc7XHJcblx0XHR0aGlzLm5lZWRzU2tlbGV0b24gPSBmYWxzZTtcclxuXHJcblx0XHQvLyBwb2x5ZmlsbCBnZXRVc2VyIGZ1bmN0aW9uXHJcblx0XHRpZighYWx0c3BhY2UuaW5DbGllbnQpe1xyXG5cdFx0XHRhbHRzcGFjZS5nZXRVc2VyID0gKCkgPT4ge1xyXG5cdFx0XHRcdGxldCBpZCwgcmUgPSAvWz8mXXVzZXJJZD0oXFxkKykvLmV4ZWMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XHJcblx0XHRcdFx0aWYocmUpXHJcblx0XHRcdFx0XHRpZCA9IHJlWzFdO1xyXG5cdFx0XHRcdGVsc2VcclxuXHRcdFx0XHRcdGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMDApLnRvU3RyaW5nKCk7XHJcblxyXG5cdFx0XHRcdGFsdHNwYWNlLl9sb2NhbFVzZXIgPSB7XHJcblx0XHRcdFx0XHR1c2VySWQ6IGlkLFxyXG5cdFx0XHRcdFx0ZGlzcGxheU5hbWU6IGlkLFxyXG5cdFx0XHRcdFx0aXNNb2RlcmF0b3I6IC9pc01vZGVyYXRvci8udGVzdCh3aW5kb3cubG9jYXRpb24uc2VhcmNoKVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ01hc3F1ZXJhZGluZyBhcycsIGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xyXG5cdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoYWx0c3BhY2UuX2xvY2FsVXNlcik7XHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gZ2V0IGxvY2FsIHVzZXJcclxuXHRcdHRoaXMuX3VzZXJQcm9taXNlID0gYWx0c3BhY2UuZ2V0VXNlcigpO1xyXG5cdFx0dGhpcy5fdXNlclByb21pc2UudGhlbih1c2VyID0+IHtcclxuXHRcdFx0dGhpcy5sb2NhbFVzZXIgPSB7XHJcblx0XHRcdFx0aWQ6IHVzZXIudXNlcklkLFxyXG5cdFx0XHRcdGRpc3BsYXlOYW1lOiB1c2VyLmRpc3BsYXlOYW1lLFxyXG5cdFx0XHRcdGlzTW9kZXJhdG9yOiB1c2VyLmlzTW9kZXJhdG9yXHJcblx0XHRcdH07XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmdhbWUgPSB7fTtcclxuXHRcdHRoaXMucGxheWVycyA9IHt9O1xyXG5cdFx0dGhpcy52b3RlcyA9IHt9O1xyXG5cdH1cclxuXHJcblx0aW5pdGlhbGl6ZShlbnYsIHJvb3QsIGFzc2V0cylcclxuXHR7XHJcblx0XHRpZighdGhpcy5sb2NhbFVzZXIpe1xyXG5cdFx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKCgpID0+IHRoaXMuaW5pdGlhbGl6ZShlbnYsIHJvb3QsIGFzc2V0cykpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gc2hhcmUgdGhlIGRpb3JhbWEgaW5mb1xyXG5cdFx0QXNzZXRNYW5hZ2VyLmNhY2hlID0gYXNzZXRzO1xyXG5cdFx0QXNzZXRNYW5hZ2VyLmZpeE1hdGVyaWFscygpO1xyXG5cdFx0dGhpcy5lbnYgPSBlbnY7XHJcblxyXG5cdFx0Ly8gY29ubmVjdCB0byBzZXJ2ZXJcclxuXHRcdHRoaXMuc29ja2V0ID0gaW8uY29ubmVjdCgnLycsIHtxdWVyeTogYGdhbWVJZD0ke2dldEdhbWVJZCgpfSZ0aGVtZT0ke3RoZW1lfWB9KTtcclxuXHJcblx0XHQvLyBzcGF3biBzZWxmLXNlcnZlIHR1dG9yaWFsIGRpYWxvZ1xyXG5cdFx0aWYoYWx0c3BhY2UuaW5DbGllbnQpe1xyXG5cdFx0XHRhbHRzcGFjZS5vcGVuKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4rJy9zdGF0aWMvdHV0b3JpYWwuaHRtbCcsICdfZXhwZXJpZW5jZScsXHJcblx0XHRcdFx0e2hpZGRlbjogdHJ1ZSwgaWNvbjogd2luZG93LmxvY2F0aW9uLm9yaWdpbisnL3N0YXRpYy9pbWcvY2Flc2FyL2ljb24ucG5nJ30pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuYXVkaW8gPSBuZXcgQXVkaW9Db250cm9sbGVyKCk7XHJcblx0XHR0aGlzLnR1dG9yaWFsID0gbmV3IFR1dG9yaWFsKCk7XHJcblxyXG5cdFx0Ly8gY3JlYXRlIHRoZSB0YWJsZVxyXG5cdFx0dGhpcy50YWJsZSA9IG5ldyBHYW1lVGFibGUoKTtcclxuXHRcdHRoaXMuYWRkKHRoaXMudGFibGUpO1xyXG5cclxuXHRcdHRoaXMucmVzZXRCdXR0b24gPSBuZXcgVEhSRUUuTWVzaChcclxuXHRcdFx0bmV3IFRIUkVFLkJveEdlb21ldHJ5KC4yNSwuMjUsLjI1KSxcclxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IGFzc2V0cy50ZXh0dXJlcy5yZXNldH0pXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5wb3NpdGlvbi5zZXQoMS4xMywgLS45LCAuNzUpO1xyXG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuc2VuZFJlc2V0LmJpbmQodGhpcykpO1xyXG5cdFx0dGhpcy5fdXNlclByb21pc2UudGhlbigoKSA9PiB7XHJcblx0XHRcdGlmKHRoaXMubG9jYWxVc2VyLmlzTW9kZXJhdG9yKVxyXG5cdFx0XHRcdHRoaXMudGFibGUuYWRkKHRoaXMucmVzZXRCdXR0b24pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5yZWZyZXNoQnV0dG9uID0gbmV3IFRIUkVFLk1lc2goXHJcblx0XHRcdG5ldyBUSFJFRS5Cb3hHZW9tZXRyeSguMjUsLjI1LC4yNSksXHJcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBhc3NldHMudGV4dHVyZXMucmVmcmVzaH0pXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZWZyZXNoQnV0dG9uLnBvc2l0aW9uLnNldCgxLjEzLCAtLjMsIC43NSk7XHJcblx0XHR0aGlzLnJlZnJlc2hCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCAoKSA9PiB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCkpO1xyXG5cdFx0dGhpcy50YWJsZS5hZGQodGhpcy5yZWZyZXNoQnV0dG9uKTtcclxuXHJcblx0XHR0aGlzLnByZXNlbnRhdGlvbiA9IG5ldyBQcmVzZW50YXRpb24oKTtcclxuXHJcblx0XHQvLyBjcmVhdGUgaGF0c1xyXG5cdFx0dGhpcy5wcmVzaWRlbnRIYXQgPSBuZXcgUHJlc2lkZW50SGF0KCk7XHJcblx0XHR0aGlzLmNoYW5jZWxsb3JIYXQgPSBuZXcgQ2hhbmNlbGxvckhhdCgpO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBwb3NpdGlvbnNcclxuXHRcdHRoaXMuc2VhdHMgPSBbXTtcclxuXHRcdGZvcihsZXQgaT0wOyBpPDEwOyBpKyspe1xyXG5cdFx0XHR0aGlzLnNlYXRzLnB1c2goIG5ldyBTZWF0KGkpICk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy50YWJsZS5hZGQoLi4udGhpcy5zZWF0cyk7XHJcblxyXG5cdFx0Ly90aGlzLnBsYXllck1ldGVyID0gbmV3IFBsYXllck1ldGVyKCk7XHJcblx0XHQvL3RoaXMudGFibGUuYWRkKHRoaXMucGxheWVyTWV0ZXIpO1xyXG5cdFx0dGhpcy5jb250aW51ZUJveCA9IG5ldyBDb250aW51ZUJveCh0aGlzLnRhYmxlKTtcclxuXHJcblx0XHR0aGlzLmVsZWN0aW9uVHJhY2tlciA9IG5ldyBFbGVjdGlvblRyYWNrZXIoKTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5vbigndXBkYXRlJywgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xyXG5cdFx0dGhpcy5zb2NrZXQub24oJ2NoZWNrZWRfaW4nLCB0aGlzLmNoZWNrZWRJbi5iaW5kKHRoaXMpKTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5vbigncmVzZXQnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XHJcblx0XHQvL3RoaXMuc29ja2V0Lm9uKCdkaXNjb25uZWN0JywgdGhpcy5kb1Jlc2V0LmJpbmQodGhpcykpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlRnJvbVNlcnZlcihnZCwgcGQsIHZkKVxyXG5cdHtcclxuXHRcdGNvbnNvbGUubG9nKGdkLCBwZCwgdmQpO1xyXG5cclxuXHRcdGxldCBnYW1lID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nYW1lLCBnZCk7XHJcblx0XHRsZXQgcGxheWVycyA9IG1lcmdlT2JqZWN0cyh0aGlzLnBsYXllcnMsIHBkIHx8IHt9KTtcclxuXHRcdGxldCB2b3RlcyA9IG1lcmdlT2JqZWN0cyh0aGlzLnZvdGVzLCB2ZCB8fCB7fSk7XHJcblxyXG5cdFx0aWYoZ2QudHV0b3JpYWwpXHJcblx0XHRcdHRoaXMuYXVkaW8ubG9hZFR1dG9yaWFsKGdhbWUpO1xyXG5cclxuXHRcdGlmKGdkLnN0YXRlKVxyXG5cdFx0XHR0aGlzLnR1dG9yaWFsLnN0YXRlVXBkYXRlKGdhbWUsIHZvdGVzKTtcclxuXHJcblx0XHRmb3IobGV0IGZpZWxkIGluIGdkKVxyXG5cdFx0e1xyXG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe1xyXG5cdFx0XHRcdHR5cGU6ICd1cGRhdGVfJytmaWVsZCxcclxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcclxuXHRcdFx0XHRkYXRhOiB7XHJcblx0XHRcdFx0XHRnYW1lOiBnYW1lLFxyXG5cdFx0XHRcdFx0cGxheWVyczogcGxheWVycyxcclxuXHRcdFx0XHRcdHZvdGVzOiB2b3Rlc1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5fdXNlclByb21pc2UudGhlbigoKSA9PiB7XHJcblx0XHRcdGlmKHBsYXllcnNbdGhpcy5sb2NhbFVzZXIuaWRdICYmICFwbGF5ZXJzW3RoaXMubG9jYWxVc2VyLmlkXS5jb25uZWN0ZWQpe1xyXG5cdFx0XHRcdHRoaXMuc29ja2V0LmVtaXQoJ2NoZWNrX2luJywgdGhpcy5sb2NhbFVzZXIpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xyXG5cdFx0dGhpcy5wbGF5ZXJzID0gcGxheWVycztcclxuXHRcdHRoaXMudm90ZXMgPSB2b3RlcztcclxuXHR9XHJcblxyXG5cdGNoZWNrZWRJbihwKVxyXG5cdHtcclxuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5wbGF5ZXJzW3AuaWRdLCBwKTtcclxuXHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7XHJcblx0XHRcdHR5cGU6ICdjaGVja2VkX2luJyxcclxuXHRcdFx0YnViYmxlczogZmFsc2UsXHJcblx0XHRcdGRhdGE6IHAuaWRcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0c2VuZFJlc2V0KGUpe1xyXG5cdFx0aWYodGhpcy5sb2NhbFVzZXIuaXNNb2RlcmF0b3Ipe1xyXG5cdFx0XHRjb25zb2xlLmxvZygncmVxdWVzdGluZyByZXNldCcpO1xyXG5cdFx0XHR0aGlzLnNvY2tldC5lbWl0KCdyZXNldCcpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZG9SZXNldChnYW1lLCBwbGF5ZXJzLCB2b3RlcylcclxuXHR7XHJcblx0XHR3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgbmV3IFNlY3JldEhpdGxlcigpO1xyXG4iXSwibmFtZXMiOlsibGV0IiwiY29uc3QiLCJ0aGVtZSIsInRoaXMiLCJzdXBlciIsIkFNIiwiQXNzZXRNYW5hZ2VyIiwiY2FyZCIsInRyIiwiQmFsbG90VHlwZS5DT05GSVJNIiwidXBkYXRlU3RhdGUiLCJCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCIsIkJhbGxvdFR5cGUuUE9MSUNZIiwib3B0cyIsImNsZWFuVXBGYWtlVm90ZSIsIkJQLnVwZGF0ZVZvdGVzSW5Qcm9ncmVzcyIsIkJQLnVwZGF0ZVN0YXRlIiwiQlBCQS50b0FycmF5IiwiQlBCQS5MSUJFUkFMIiwiYmIiLCJwb3NpdGlvbnMiLCJhc3NldHMiLCJUdXRvcmlhbCJdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO0NBQzVCLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUU7RUFDbEQsS0FBSyxFQUFFLFNBQVMsSUFBSSxDQUFDO0dBQ3BCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztHQUMvQjtFQUNELFFBQVEsRUFBRSxLQUFLO0VBQ2YsVUFBVSxFQUFFLEtBQUs7RUFDakIsWUFBWSxFQUFFLEtBQUs7RUFDbkIsQ0FBQyxDQUFDO0NBQ0g7O0FDWERBLElBQUksV0FBVyxHQUFHLFFBQVEsQ0FBQztBQUMzQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztDQUMxQyxXQUFXLEdBQUcsUUFBUSxDQUFDO0NBQ3ZCOztBQUVEQyxJQUFNLE1BQU0sR0FBRztDQUNkLE1BQU0sRUFBRTtFQUNQLE1BQU0sRUFBRSxRQUFRO0VBQ2hCLFNBQVMsRUFBRSxXQUFXO0VBQ3RCLFVBQVUsRUFBRSxZQUFZO0VBQ3hCO0NBQ0QsTUFBTSxFQUFFO0VBQ1AsTUFBTSxFQUFFLFFBQVE7RUFDaEIsU0FBUyxFQUFFLFFBQVE7RUFDbkIsVUFBVSxFQUFFLFNBQVM7RUFDckI7Q0FDRCxDQUFBOztBQUVELFNBQVMsU0FBUyxDQUFDLE1BQU07QUFDekI7Q0FDQ0QsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLFdBQVcsRUFBRTtFQUM3QixLQUFLLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENB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SyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSztFQUNuQixNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLOzs7RUFHbkIsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU07RUFDbkIsR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNO0VBQ25CLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNO0VBQ25CLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU07RUFDbkIsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSztFQUNuQixHQUFHLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSztFQUNuQixDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxLQUFLO0VBQ25CLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSzs7OztFQUluQixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUV0RixDQUFDOztDQUVGQSxJQUFJLE9BQU8sR0FBRzs7RUFFYixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDMUIsQ0FBQzs7O0NBR0ZBLElBQUksU0FBUyxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDdkVBLElBQUksSUFBSSxHQUFHLElBQUksWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0NBQzVELElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7Q0FDcEIsSUFBSSxHQUFHLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDdEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7O0NBR2xCQSxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsR0FBRyxFQUFFLENBQUM7Q0FDdERBLElBQUksV0FBVyxHQUFHLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUN4RixZQUFZLEdBQUcsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQ2xHQSxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7Q0FDYixJQUFJQSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztFQUN0QixHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0VBQzVHO0NBQ0RBLElBQUksS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7O0NBRXRHLFFBQVEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFD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RSxDQUFDLENBQUM7O0VBRXJDLEtBQUtBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRTtFQUM3QjtHQUNDLEtBQUtBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtHQUMzQjtJQUNDQSxJQUFJLE1BQU0sR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7OztJQUd0QyxLQUFLLENBQUMsR0FBRyxDQUFDO0tBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNyQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0lBRVgsS0FBSyxDQUFDLEdBQUcsQ0FBQztLQUNULE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN0QyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0lBRVhBLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckNBLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckNBLElBQUksUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNqRUEsSUFBSSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2pFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNWLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCOzs7SUFHRCxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQ1Y7S0FDQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNoRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNoRDs7SUFFRDtLQUNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOztLQUVsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNsRDtJQUNEOzs7R0FHREEsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDN0NBLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0dBQzdDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNWLE1BQU0sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLE1BQU0sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3JCOztHQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0dBQzVDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0dBQzVDOztFQUVELElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNuRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNuRDs7Ozt5REFBQTs7O0VBOUUyQyxLQUFLLENBQUMsY0ErRWxELEdBQUEsQUFBQzs7QUMzRUZBLElBQUksU0FBUyxHQUFHLElBQUksZUFBZSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQzs7QUFFOUMsSUFBcUIsTUFBTSxHQUFtQjtDQUM5QyxlQUNZLENBQUMsSUFBSTtDQUNoQjs7O0VBQ0NJLFVBQUssS0FBQSxDQUFDLE1BQUEsU0FBUyxFQUFFLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDO0dBQzVDLFdBQVcsRUFBRSxJQUFJO0dBQ2pCLE9BQU8sRUFBRSxDQUFDO0dBQ1YsSUFBSSxFQUFFLEtBQUssQ0FBQyxRQUFRO0dBQ3BCLENBQUMsQ0FBQyxDQUFDOztFQUVKLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ2hDLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0VBQ3JCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0VBQ2pCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7O0VBRWYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxZQUFHLFNBQUdELE1BQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBQSxDQUFDLENBQUM7RUFDeEUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxZQUFHLFNBQUdBLE1BQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLENBQUMsR0FBQSxDQUFDLENBQUM7RUFDdEUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxZQUFHO0dBQ3BDLEVBQUUsQ0FBQyxhQUFhLENBQUM7SUFDaEIsSUFBSSxFQUFFLGNBQWM7SUFDcEIsT0FBTyxFQUFFLEtBQUs7SUFDZCxJQUFJLEVBQUVBLE1BQUksQ0FBQyxJQUFJLENBQUMsS0FBSztJQUNyQixDQUFDLENBQUM7R0FDSCxDQUFDLENBQUM7O0VBRUgsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDbEY7Ozs7dUNBQUE7O0NBRUQsaUJBQUEsZ0JBQWdCLDhCQUFDLEdBQUE7Q0FDakI7aUJBRHdCLFFBQUMsQ0FBQTtNQUFBLElBQUksaUJBQUU7TUFBQSxPQUFPOztFQUVyQ0gsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBQSxDQUFDLEVBQUMsU0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLE1BQU0sR0FBQSxDQUFDLENBQUM7RUFDNUVBLElBQUksYUFBYTtHQUNoQixFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsU0FBUztHQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFO0dBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRTtHQUNuQyxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7O0VBRXpDQSxJQUFJLFlBQVk7R0FDZixJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVU7R0FDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLGNBQWM7R0FDdkMsQ0FBQyxhQUFhLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7O0VBRXZFQSxJQUFJLGVBQWU7R0FDbEIsSUFBSSxDQUFDLEtBQUssS0FBSyxhQUFhO0dBQzVCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssS0FBSyxRQUFRLENBQUM7O0VBRXpFQSxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLGVBQWUsQ0FBQztFQUNqREEsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLENBQUM7O0VBRTFDLElBQUksQ0FBQyxPQUFPLEdBQUcsYUFBYSxJQUFJLENBQUMsWUFBWSxJQUFJLGVBQWUsSUFBSSxXQUFXLElBQUksVUFBVSxDQUFDLENBQUM7RUFDL0YsQ0FBQTs7O0VBbERrQyxLQUFLLENBQUMsSUFtRHpDLEdBQUE7O0FDbERELElBQXFCLElBQUksR0FBdUI7Q0FDaEQsYUFDWSxDQUFDLE9BQU87Q0FDbkI7OztFQUNDSSxVQUFLLEtBQUEsQ0FBQyxJQUFBLENBQUMsQ0FBQzs7RUFFUixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztFQUN2QixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQzs7O0VBR2hCSixJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztFQUNqQixPQUFPLE9BQU87RUFDZCxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0dBQ3JCLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO0dBQzNCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUMvQixNQUFNO0VBQ1AsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDYixDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7R0FDL0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7R0FDcEMsTUFBTTtFQUNQLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDckIsQ0FBQyxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDOUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztHQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0dBQ2xDLE1BQU07RUFDUCxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUNiLENBQUMsR0FBRyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztHQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztHQUN0QyxNQUFNO0dBQ047O0VBRUQsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDekUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxVQUFDLEdBQUEsRUFBWTtPQUFMLEVBQUU7O0dBQzNDLEdBQUdHLE1BQUksQ0FBQyxLQUFLLEtBQUssRUFBRTtJQUNuQixFQUFBQSxNQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQTtHQUNwRSxDQUFDLENBQUM7O0VBRUgsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxVQUFDLEdBQUEsRUFBeUI7a0JBQWxCLFFBQUMsQ0FBQTtPQUFBLElBQUksaUJBQUU7T0FBQSxPQUFPOztHQUN6RCxHQUFHQSxNQUFJLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQ0EsTUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUM7SUFDckRBLE1BQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2xEO0dBQ0QsQ0FBQyxDQUFDOztFQUVILElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDckMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUMvQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ3ZDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDL0I7Ozs7bUNBQUE7O0NBRUQsZUFBQSxlQUFlLDZCQUFDLEdBQUE7Q0FDaEI7b0JBRHVCO2lCQUFBLFFBQUMsQ0FBQTtNQUFBLElBQUksaUJBQUU7TUFBQSxPQUFPOztFQUVwQ0gsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUM7OztFQUcvQixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUs7RUFDZjs7R0FFQyxJQUFJQSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUM7SUFDaEIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJRyxNQUFJLENBQUMsT0FBTyxDQUFDO0tBQzFDQSxNQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNwQkEsTUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0tBQ3ZEO0lBQ0Q7R0FDRDs7O0VBR0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztFQUM3QjtHQUNDLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0dBQ2hCLEdBQUcsSUFBSSxDQUFDLEtBQUssS0FBSyxPQUFPLENBQUM7SUFDekIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDckQ7R0FDRDs7O09BR0ksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxFQUFFO0dBQ3hDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0dBQ3JEO09BQ0ksSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsRUFBRTtHQUN2QyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztHQUNyRDtFQUNELENBQUE7OztFQXBGZ0MsS0FBSyxDQUFDLFFBcUZ2QyxHQUFBOztBQ3hGRCxJQUFxQixXQUFXLEdBQXVCO0NBQ3ZELG9CQUNZLENBQUMsTUFBTTtDQUNsQjs7O0VBQ0NDLFVBQUssS0FBQSxDQUFDLElBQUEsQ0FBQyxDQUFDO0VBQ1IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJO0dBQ3pCLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO0dBQzFDLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0dBQzlDLENBQUM7RUFDRixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUN4QixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs7RUFFcEIsSUFBSSxDQUFDLElBQUksR0FBRyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUM7RUFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7O0VBRTFESixJQUFJLEVBQUUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O0VBRW5DLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQzFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQzs7RUFFbEgsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O0VBRXBCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDOUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7RUFFakIsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ25FLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ3JFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUMzRCxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQzs7RUFFbEVBLElBQUksSUFBSSxHQUFHLFlBQUcsU0FBR0csTUFBSSxDQUFDLElBQUksRUFBRSxHQUFBLENBQUM7RUFDN0IsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztFQUN6QyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDNUM7Ozs7aURBQUE7O0NBRUQsc0JBQUEsT0FBTyxxQkFBQyxHQUFHO0NBQ1g7RUFDQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztHQUM3QyxFQUFBLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUE7RUFDNUIsQ0FBQTs7Q0FFRCxzQkFBQSxhQUFhLDJCQUFDLEdBQUE7Q0FDZDtvQkFEc0I7TUFBQSxJQUFJOztFQUV6QixHQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0dBQzdGLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztHQUNaO09BQ0ksR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLE9BQU8sQ0FBQztHQUM5QixJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBQSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDakM7T0FDSSxHQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssTUFBTSxDQUFDO0dBQzdCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztHQUNaLFVBQVUsQ0FBQyxZQUFHO0lBQ2JBLE1BQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDdEIsRUFBRSxJQUFJLENBQUMsQ0FBQztHQUNUO09BQ0k7R0FDSixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7R0FDWjtFQUNELENBQUE7O0NBRUQsc0JBQUEsV0FBVyx5QkFBQyxHQUFBO0NBQ1o7TUFEb0IsSUFBSTs7RUFFdkIsR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLE9BQU8sQ0FBQztHQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7R0FDekJILElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO0dBQ3hDLEdBQUcsV0FBVyxJQUFJLENBQUMsQ0FBQztJQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDekIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJO0tBQzlCLENBQUEsR0FBRSxHQUFFLFdBQVcseUJBQXFCLENBQUM7S0FDckMsQ0FBQyxDQUFDO0lBQ0g7UUFDSTtJQUNKLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztJQUMxQixJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUk7S0FDOUIsQ0FBQSxHQUFFLEdBQUUsV0FBVywwQkFBc0IsQ0FBQztLQUN0QyxDQUFDLENBQUM7SUFDSDtHQUNEO0VBQ0QsQ0FBQTs7Q0FFRCxzQkFBQSxJQUFJLGtCQUFDLE9BQTZCLENBQUM7bUNBQXZCLEdBQUcsbUJBQW1COztFQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7RUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0VBQ3pCLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7RUFDM0MsQ0FBQTs7Q0FFRCxzQkFBQSxJQUFJLG1CQUFFO0VBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0VBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztFQUMxQixDQUFBOzs7RUExRnVDLEtBQUssQ0FBQyxRQTJGOUMsR0FBQTs7QUM5RkRDLElBQU1tQixXQUFTLEdBQUc7Q0FDakIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7Q0FDckMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7Q0FDckMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQztDQUNyQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO0NBQ3JDLENBQUM7O0FBRUYsSUFBcUIsZUFBZSxHQUFtQjtDQUN2RCx3QkFDWTtDQUNYO0VBQ0NoQixVQUFLLEtBQUE7R0FDSixNQUFBLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztHQUNuRCxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsRUFBRTtHQUM3QixDQUFDO0VBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUNnQixXQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNqQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7O0VBR25CLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO0VBQ3RCLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0VBQ2QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7O0VBRTFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDN0U7Ozs7eURBQUE7O0NBRUQsMEJBQUEsaUJBQWlCLCtCQUFDLEdBQUE7Q0FDbEI7MkJBRCtDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQWxEO01BQUEsV0FBVzs7RUFFM0MsR0FBRyxXQUFXLEtBQUssQ0FBQyxDQUFDO0dBQ3BCLEVBQUEsV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQTs7RUFFekIsSUFBSSxDQUFDLFFBQVEsR0FBRyxXQUFXLEdBQUcsQ0FBQyxDQUFDO0VBQ2hDLElBQUksQ0FBQyxJQUFJLEdBQUcsV0FBVyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O0VBRXJELElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUU7R0FDaEMsR0FBRyxFQUFFQSxXQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztHQUN6QixLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7R0FDM0MsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztHQUN6QixRQUFRLEVBQUUsSUFBSTtHQUNkLENBQUMsQ0FBQztFQUNILENBQUE7OztFQWpDMkMsS0FBSyxDQUFDOztBQ0puRCxJQUFxQixZQUFZLEdBQXVCO0NBQ3hELHFCQUNZO0NBQ1g7RUFDQ2hCLFVBQUssS0FBQSxDQUFDLElBQUEsQ0FBQyxDQUFDO0VBQ1IsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDbkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDOzs7RUFHN0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO0VBQ2pDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ3RDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztFQUNsQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzs7O0VBR3ZCLElBQUksQ0FBQyxNQUFNLEdBQUcsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDO0VBQ3RDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztFQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN2QyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDcEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDO0VBQ3ZCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDOzs7RUFHdEIsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ25FOzs7O21EQUFBOztDQUVELHVCQUFBLGFBQWEsMkJBQUMsR0FBQTtDQUNkO29CQURxQjtpQkFBQSxRQUFDLENBQUE7TUFBQSxJQUFJLGlCQUFFO01BQUEsT0FBTzs7RUFFbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0VBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztFQUM3QixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO0dBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO0dBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQztHQUN2Qjs7RUFFRCxHQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssT0FBTyxDQUFDO0dBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztHQUM1QjtPQUNJLEdBQUcsSUFBSSxDQUFDLEtBQUssS0FBSyxNQUFNO0VBQzdCO0dBQ0MsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0lBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBQ2pELEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQy9CO1FBQ0k7SUFDSixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBQ2pELEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQy9COztHQUVELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ2xDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUNsQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7R0FDM0IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO0lBQzNCLEdBQUcsRUFBRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDakMsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixRQUFRLEVBQUUsSUFBSTtJQUNkLENBQUM7SUFDRCxJQUFJLENBQUMsWUFBRyxTQUFHRCxNQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDQSxNQUFJLENBQUMsTUFBTSxDQUFDLEdBQUEsQ0FBQyxDQUFDO0dBQ3hEO09BQ0ksR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsZUFBZSxJQUFJLENBQUM7RUFDN0Q7R0FDQ0gsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxXQUFXLENBQUM7R0FDdEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQztHQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQSxVQUFhLGFBQVMsSUFBRVEsU0FBRSxDQUFDLFFBQVEsQ0FBQyxDQUFBLE1BQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7R0FFekUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQ2xDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztHQUMzQixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7SUFDM0IsR0FBRyxFQUFFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUNqQyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFDRCxJQUFJLENBQUMsWUFBRyxTQUFHTCxNQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDQSxNQUFJLENBQUMsTUFBTSxDQUFDLEdBQUEsQ0FBQyxDQUFDO0dBQ3hEOztFQUVELENBQUE7OztFQTdFd0MsS0FBSyxDQUFDLFFBOEUvQyxHQUFBOztBQ2pGRCxJQUFNLFdBQVcsR0FDakIsb0JBQ1ksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQzs7O0NBQ3BDLElBQUssQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUM7Q0FDNUMsSUFBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0NBQzdCLElBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0NBQzdCLElBQUssQ0FBQyxlQUFlLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFFO0VBQ3JELE1BQUssQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO0VBQ3hCLENBQUMsQ0FBQztDQUNILENBQUE7O0FBRUYsc0JBQUMsSUFBSSxtQkFBRTtDQUNOLEdBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO0VBQ3pDLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUE7Q0FDMUIsVUFBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7Q0FDN0UsQ0FBQTs7QUFFRixzQkFBQyxJQUFJLG1CQUFFO0NBQ04sSUFBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztDQUNuQixDQUFBOztBQUdGSCxJQUFJLGFBQWEsR0FBRyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7O0FBRXRDLElBQU0sU0FBUyxHQUNmLGtCQUNZLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBYTtBQUNoRDttQkFEeUM7Z0NBQUEsR0FBRyxJQUFJOztDQUUvQyxJQUFLLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztDQUN4QixJQUFLLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztDQUNwQyxJQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO0NBQ2pDLElBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQzs7Q0FFMUMsSUFBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUU7RUFDNUMsSUFBSyxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDckMsTUFBTyxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQztFQUN2QyxNQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFBLE1BQU0sRUFBQztHQUN4QixPQUFRLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxVQUFBLGFBQWEsRUFBQztJQUM5QyxNQUFLLENBQUMsTUFBTSxHQUFHLGFBQWEsQ0FBQztJQUM3QixPQUFRLEVBQUUsQ0FBQztJQUNWLENBQUMsQ0FBQztHQUNILENBQUMsQ0FBQztFQUNILENBQUMsQ0FBQTtDQUNGLENBQUE7O0FBRUYsb0JBQUMsSUFBSSxrQkFBQyxNQUFjO0FBQ3BCO29CQURZO2lDQUFBLEdBQUcsS0FBSzs7Q0FFbkIsT0FBUSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFHO0VBQzNCLElBQUssUUFBUSxHQUFHLElBQUksV0FBVyxDQUFDRyxNQUFJLENBQUMsT0FBTyxFQUFFQSxNQUFJLENBQUMsTUFBTSxFQUFFQSxNQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7O0VBRXhFLEdBQUksTUFBTSxDQUFDO0dBQ1YsYUFBYyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsWUFBRztJQUN0QyxRQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDakIsT0FBUSxRQUFRLENBQUMsZUFBZSxDQUFDO0lBQ2hDLENBQUMsQ0FBQztHQUNKLE9BQVEsYUFBYSxDQUFDO0dBQ3JCO09BQ0k7R0FDTCxRQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7R0FDakIsT0FBUSxRQUFRLENBQUMsZUFBZSxDQUFDO0dBQ2hDO0VBQ0QsQ0FBQyxDQUFDO0NBQ0gsQ0FBQTs7QUFHRixJQUFNLGFBQWEsR0FDbkIsc0JBQ1ksRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQyxFQUFFLENBQUE7QUFDMUQsd0JBQUMsSUFBSSxtQkFBRSxFQUFFLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQTs7QUFHcEMsSUFBTSxlQUFlLEdBQ3JCLHdCQUNZLEVBQUUsRUFBRSxJQUFJLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUE7QUFDM0QsMEJBQUMsSUFBSSxtQkFBRSxHQUFHLENBQUE7QUFDViwwQkFBQyxJQUFJLG1CQUFFLEdBQUcsQ0FBQTs7QUFHVixJQUFxQixlQUFlLEdBQ3BDLHdCQUNZO0FBQ1o7OztDQUNDLElBQUssT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztDQUNqRCxJQUFLLENBQUMsWUFBWSxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsd0NBQXVDLEVBQUcsR0FBRyxDQUFDLENBQUM7Q0FDaEcsSUFBSyxDQUFDLGNBQWMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLDBDQUF5QyxFQUFHLEdBQUcsQ0FBQyxDQUFDO0NBQ3BHLElBQUssQ0FBQyxZQUFZLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSx3Q0FBdUMsRUFBRyxHQUFHLENBQUMsQ0FBQztDQUNoRyxJQUFLLENBQUMsY0FBYyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsMENBQXlDLEVBQUcsR0FBRyxDQUFDLENBQUM7O0NBRXBHLElBQUssSUFBSSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7Q0FDaEMsSUFBSyxDQUFDLFFBQVEsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztDQUN0QyxDQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsZUFBZTtDQUN0RyxlQUFnQixDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVM7Q0FDNUcsTUFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUMsRUFBQyxTQUFHQSxNQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBQSxDQUFDLENBQUM7Q0FDeEQsQ0FBQTs7QUFFRiwwQkFBQyxZQUFZLDBCQUFDLElBQUk7QUFDbEI7Q0FDQyxHQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxFQUFBLE9BQU8sRUFBQTs7Q0FFeEQsSUFBSyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEdBQUcsR0FBRyxDQUFDOztDQUVsRSxNQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDN0IsV0FBWSxFQUFFLElBQUk7RUFDbEIsT0FBUSxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVELFdBQUssTUFBRSxHQUFFLE1BQU0sMEJBQXNCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDakcsS0FBTSxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sd0JBQW9CLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDN0YsVUFBVyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sNkJBQXlCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDdkcsTUFBTyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0seUJBQXFCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDL0YsU0FBVSxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sNkJBQXlCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDdEcsVUFBVyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sOEJBQTBCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDeEcsT0FBUSxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sMEJBQXNCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDakcsT0FBUSxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sMEJBQXNCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDakcsYUFBYyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0saUNBQTZCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDOUcsYUFBYyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0saUNBQTZCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDOUcsZUFBZ0IsRUFBRSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQSxnQkFBZSxHQUFFQSxXQUFLLE1BQUUsR0FBRSxNQUFNLG1DQUErQixDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQ2xILE1BQU8sRUFBRSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQSxnQkFBZSxHQUFFQSxXQUFLLE1BQUUsR0FBRSxNQUFNLHlCQUFxQixDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQy9GLE1BQU8sRUFBRSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQSxnQkFBZSxHQUFFQSxXQUFLLE1BQUUsR0FBRSxNQUFNLHlCQUFxQixDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQy9GLE1BQU8sRUFBRSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQSxnQkFBZSxHQUFFQSxXQUFLLE1BQUUsR0FBRSxNQUFNLHlCQUFxQixDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQy9GLFdBQVksRUFBRSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQSxnQkFBZSxHQUFFQSxXQUFLLE1BQUUsR0FBRSxNQUFNLG9DQUFnQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQy9HLElBQUssRUFBRSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQSxnQkFBZSxHQUFFQSxXQUFLLE1BQUUsR0FBRSxNQUFNLDZCQUF5QixDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQ2pHLGFBQWMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQSxnQkFBZSxHQUFFQSxXQUFLLE1BQUUsR0FBRSxNQUFNLHNDQUFrQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQ25ILE9BQVEsRUFBRSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQSxnQkFBZSxHQUFFQSxXQUFLLE1BQUUsR0FBRSxNQUFNLGdDQUE0QixDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQ3ZHLElBQUssRUFBRSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQSxnQkFBZSxHQUFFQSxXQUFLLE1BQUUsR0FBRSxNQUFNLDZCQUF5QixDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQ2pHLE9BQVEsRUFBRSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQSxnQkFBZSxHQUFFQSxXQUFLLE1BQUUsR0FBRSxNQUFNLDBCQUFzQixDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQ2hHLENBQUMsQ0FBQztDQUNILENBQUEsQUFDRDs7QUM5SEQsSUFBcUIsZUFBZSxHQUNwQyx3QkFDWTtBQUNaO0NBQ0MsSUFBSyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7Q0FDdEIsSUFBSyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7Q0FDdkIsSUFBSyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7Q0FDakIsQ0FBQTs7QUFFRiwwQkFBQyxXQUFXLHlCQUFDLElBQUksRUFBRSxLQUFLO0FBQ3hCO0NBQ0MsSUFBSyxZQUFZLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztDQUM3QyxJQUFLLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlLEtBQUssQ0FBQyxDQUFDOztDQUVwRSxHQUFJLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLE9BQU87RUFDdkMsRUFBQyxPQUFPLE9BQU8sQ0FBQyxFQUFBO01BQ1gsR0FBRyxVQUFVLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxVQUFVO0VBQy9DLEVBQUMsT0FBTyxZQUFZLENBQUMsRUFBQTtNQUNoQixHQUFHLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVU7RUFDL0MsRUFBQyxPQUFPLFFBQVEsQ0FBQyxFQUFBO01BQ1osR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVUsSUFBSSxZQUFZLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7RUFDL0gsSUFBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7RUFDL0IsT0FBUSxXQUFXLENBQUM7RUFDbkI7TUFDSSxHQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssVUFBVSxJQUFJLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxJQUFJLFlBQVksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztFQUNqSSxJQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztFQUNoQyxPQUFRLFlBQVksQ0FBQztFQUNwQjtNQUNJLEdBQUcsVUFBVSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUztFQUM5QyxFQUFDLE9BQU8sU0FBUyxDQUFDLEVBQUE7TUFDYixHQUFHLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVM7RUFDOUMsRUFBQyxPQUFPLFNBQVMsQ0FBQyxFQUFBO01BQ2IsR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFdBQVcsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUM7RUFDbkYsRUFBQyxPQUFPLGVBQWUsQ0FBQyxFQUFBO01BQ25CLEdBQUcsSUFBSSxDQUFDLEtBQUssS0FBSyxXQUFXLElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDO0VBQ25GLEVBQUMsT0FBTyxlQUFlLENBQUMsRUFBQTs7TUFFbkIsR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVUsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxlQUFlLEtBQUssQ0FBQztFQUNwRixFQUFDLE9BQU8sUUFBUSxDQUFDLEVBQUE7TUFDWixHQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssVUFBVSxJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7RUFDcEcsSUFBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7RUFDN0IsT0FBUSxTQUFTLENBQUM7RUFDakI7O01BRUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0NBQzlFO0VBQ0MsR0FBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0dBQ25DLEVBQUMsT0FBTyxJQUFJLENBQUMsRUFBQTs7RUFFZCxJQUFLLEtBQUssQ0FBQztFQUNYLEdBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxDQUFDO0dBQzdCLEVBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxFQUFBOztHQUVoQixFQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUE7RUFDckIsSUFBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7O0VBRXpCLEdBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUNsQyxLQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQztHQUN4QixJQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUMxQjs7RUFFRixPQUFRLEtBQUssQ0FBQztFQUNiO01BQ0ksRUFBQSxPQUFPLElBQUksQ0FBQyxFQUFBO0NBQ2pCLENBQUE7O0FBRUYsMEJBQUMsV0FBVyx5QkFBQyxJQUFJLEVBQUUsS0FBSztBQUN4QjtDQUNDLEdBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUEsT0FBTyxFQUFBOztDQUUzQixJQUFLLFFBQVEsR0FBRztFQUNmLGFBQWMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQztFQUNuRCxhQUFjLEVBQUUsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUM7RUFDbkQsaUJBQWtCLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQztFQUNyRCxVQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztFQUN2QyxtQkFBb0IsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO0VBQ3pELGFBQWMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO0VBQzdDLFVBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO0VBQ3ZDLFdBQVksRUFBRSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7RUFDdEMsSUFBSyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztFQUN4QixhQUFjLEVBQUUsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO0VBQzFDLE9BQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7RUFDOUIsSUFBSyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztFQUN4QixLQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDO0VBQzFCLENBQUM7Q0FDSCxJQUFLLE9BQU8sR0FBRztFQUNkLGFBQWMsRUFBRSxnQkFBZ0I7RUFDaEMsYUFBYyxFQUFFLGdCQUFnQjtFQUMvQixDQUFDOztDQUVILElBQUssS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7Q0FDNUQsT0FBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLENBQUMsQ0FBQzs7Q0FFdkMsSUFBSyxJQUFJLEdBQUcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0NBQzlCLEdBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQ2xCLElBQUssR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUU7R0FDckMsSUFBSyxPQUFPLEdBQUcsWUFBRztJQUNqQixFQUFHLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2pELE9BQVEsRUFBRSxDQUFDO0lBQ1YsQ0FBQztHQUNILEVBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7R0FDN0MsQ0FBQyxDQUFDO0VBQ0g7O0NBRUYsR0FBSSxRQUFRLENBQUMsS0FBSyxDQUFDO0NBQ25CO0VBQ0MsSUFBSyxDQUFDLElBQUksQ0FBQyxZQUFHO0dBQ2IsUUFBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUksRUFBQyxTQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQSxDQUFDLENBQUM7R0FDcEUsQ0FBQyxDQUFDO0VBQ0g7TUFDSSxHQUFHLEtBQUssS0FBSyxJQUFJO0NBQ3ZCO0VBQ0MsSUFBSyxDQUFDLElBQUksQ0FBQyxZQUFHLFNBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFBLENBQUMsQ0FBQztFQUNyRDtDQUNELENBQUEsQUFDRDs7QUNsR0QsSUFBTSxZQUFZLEdBQXVCO0NBQ3pDLHFCQUNZO0NBQ1g7OztFQUNDRSxVQUFLLEtBQUEsQ0FBQyxJQUFBLENBQUMsQ0FBQztFQUNSLElBQUksQ0FBQyxNQUFNLEdBQUdFLE1BQVksQ0FBQyxRQUFRLENBQUM7RUFDcEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUM7RUFDOUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7OztFQUczQixHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztHQUNyQixRQUFRLENBQUMsT0FBTyxHQUFHLFlBQUc7SUFDckJOLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM3RCxHQUFHLEVBQUU7S0FDSixFQUFBLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQTs7S0FFWCxFQUFBLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFBOztJQUV0RCxRQUFRLENBQUMsVUFBVSxHQUFHO0tBQ3JCLE1BQU0sRUFBRSxFQUFFO0tBQ1YsV0FBVyxFQUFFLEVBQUU7S0FDZixXQUFXLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztLQUN2RCxDQUFDO0lBQ0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDcEQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM1QyxDQUFDO0dBQ0Y7OztFQUdELElBQUksQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO0VBQ3ZDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSSxFQUFDO0dBQzNCRyxNQUFJLENBQUMsU0FBUyxHQUFHO0lBQ2hCLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTTtJQUNmLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztJQUM3QixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7SUFDN0IsQ0FBQztHQUNGLENBQUMsQ0FBQzs7RUFFSCxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztFQUNmLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO0VBQ2xCLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0VBQ2hCOzs7O21EQUFBOztDQUVELHVCQUFBLFVBQVUsd0JBQUMsR0FBRyxFQUFFLElBQUksRUFBRWtCLFNBQU07Q0FDNUI7OztFQUNDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO0dBQ2xCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQUcsU0FBR2xCLE1BQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRWtCLFNBQU0sQ0FBQyxHQUFBLENBQUMsQ0FBQztHQUNqRSxPQUFPO0dBQ1A7OztFQUdEZixNQUFZLENBQUMsS0FBSyxHQUFHZSxTQUFNLENBQUM7RUFDNUJmLE1BQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQztFQUM1QixJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQzs7O0VBR2YsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFBLFNBQVEsSUFBRSxTQUFTLEVBQUUsQ0FBQSxZQUFRLEdBQUVKLFdBQUssQ0FBRSxDQUFDLENBQUMsQ0FBQzs7O0VBRy9FLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQztHQUNwQixRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLHVCQUF1QixFQUFFLGFBQWE7SUFDMUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUM7R0FDN0U7O0VBRUQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0VBQ25DLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSW9CLGVBQVEsRUFBRSxDQUFDOzs7RUFHL0IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFDO0VBQzdCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDOztFQUVyQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUk7R0FDaEMsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0dBQ2xDLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsR0FBRyxFQUFFRCxTQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0dBQ3pELENBQUM7RUFDRixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQzlDLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDekUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBRztHQUN6QixHQUFHbEIsTUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXO0lBQzVCLEVBQUFBLE1BQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDQSxNQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQTtHQUNsQyxDQUFDLENBQUM7O0VBRUgsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJO0dBQ2xDLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztHQUNsQyxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsRUFBRWtCLFNBQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDM0QsQ0FBQztFQUNGLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDaEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsWUFBRyxTQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEdBQUEsQ0FBQyxDQUFDO0VBQ2hGLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQzs7RUFFbkMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDOzs7RUFHdkMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO0VBQ3ZDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQzs7O0VBR3pDLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0VBQ2hCLElBQUlyQixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztHQUN0QkcsTUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztHQUMvQjs7RUFFRCxPQUFBLElBQUksQ0FBQyxLQUFLLENBQUEsQ0FBQyxHQUFHLE1BQUEsQ0FBQyxLQUFBLElBQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQzs7OztFQUk5QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzs7RUFFL0MsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDOztFQUU3QyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzNELElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOztFQUV4RCxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztVQUFBOztFQUVqRCxDQUFBOztDQUVELHVCQUFBLGdCQUFnQiw4QkFBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7Q0FDM0I7OztFQUNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQzs7RUFFeEJILElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7RUFDNUNBLElBQUksT0FBTyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztFQUNuREEsSUFBSSxLQUFLLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDOztFQUUvQyxHQUFHLEVBQUUsQ0FBQyxRQUFRO0dBQ2IsRUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFBOztFQUUvQixHQUFHLEVBQUUsQ0FBQyxLQUFLO0dBQ1YsRUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBQTs7RUFFeEMsSUFBSUEsSUFBSSxLQUFLLElBQUksRUFBRTtFQUNuQjtHQUNDRyxNQUFJLENBQUMsYUFBYSxDQUFDO0lBQ2xCLElBQUksRUFBRSxTQUFTLENBQUMsS0FBSztJQUNyQixPQUFPLEVBQUUsS0FBSztJQUNkLElBQUksRUFBRTtLQUNMLElBQUksRUFBRSxJQUFJO0tBQ1YsT0FBTyxFQUFFLE9BQU87S0FDaEIsS0FBSyxFQUFFLEtBQUs7S0FDWjtJQUNELENBQUMsQ0FBQztHQUNIOztFQUVELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQUc7R0FDekIsR0FBRyxPQUFPLENBQUNBLE1BQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUNBLE1BQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQ3RFQSxNQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUVBLE1BQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM3QztHQUNELENBQUMsQ0FBQzs7RUFFSCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztFQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztFQUN2QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztFQUNuQixDQUFBOztDQUVELHVCQUFBLFNBQVMsdUJBQUMsQ0FBQztDQUNYO0VBQ0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNyQyxJQUFJLENBQUMsYUFBYSxDQUFDO0dBQ2xCLElBQUksRUFBRSxZQUFZO0dBQ2xCLE9BQU8sRUFBRSxLQUFLO0dBQ2QsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFO0dBQ1YsQ0FBQyxDQUFDO0VBQ0gsQ0FBQTs7Q0FFRCx1QkFBQSxTQUFTLHVCQUFDLENBQUMsQ0FBQztFQUNYLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUM7R0FDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0dBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQzFCO0VBQ0QsQ0FBQTs7Q0FFRCx1QkFBQSxPQUFPLHFCQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSztDQUM1QjtFQUNDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQzdCLENBQUE7OztFQS9LeUIsS0FBSyxDQUFDLFFBZ0xoQyxHQUFBOztBQUVELFNBQWUsSUFBSSxZQUFZLEVBQUUsQ0FBQzs7OzsifQ==
