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

var whitelist;
function isInUserWhitelist(userId)
{
	if(whitelist === undefined){
		var re = /[?&]userWhitelist=([^&]+)/.exec(window.location.search);
		if(re)
			{ whitelist = parseCSV(re[1]); }
		else
			{ whitelist = null; }
	}

	if(!whitelist)
		{ return true; }
	else
		{ return whitelist.includes(userId); }
}

function parseCSV(str){
	if(!str) { return []; }
	else { return str.split(','); }
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
		if(!isInUserWhitelist(SH.localUser.id)) { return; }

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

var itemSize = 0.25;
var margin = 0.25;

var ButtonGroup = (function (superclass) {
	function ButtonGroup(parent)
	{
		superclass.call(this);
		parent.add(this);

		this._buttonGeo = new THREE.BoxGeometry(itemSize, itemSize, itemSize);

		// reset button
		if(SH.localUser.isModerator)
		{
			var reset = new THREE.Mesh(
				this._buttonGeo,
				new THREE.MeshBasicMaterial({map: assets.cache.textures.reset})
			);
			reset.addBehavior( new altspace.utilities.behaviors.HoverScale() );
			reset.addEventListener('cursorup', function () {
				if(SH.localUser.isModerator){
					console.log('requesting reset');
					SH.socket.emit('reset');
				}
			});
			this.add(reset);
		}

		// refresh button
		var refresh = new THREE.Mesh(
			this._buttonGeo,
			new THREE.MeshBasicMaterial({map: assets.cache.textures.refresh})
		);
		refresh.addBehavior( new altspace.utilities.behaviors.HoverScale() );
		refresh.addEventListener('cursorup', function () { return window.location.reload(); });
		this.add(refresh);

		// lay out buttons
		this.layOutChildren();
	}

	if ( superclass ) ButtonGroup.__proto__ = superclass;
	ButtonGroup.prototype = Object.create( superclass && superclass.prototype );
	ButtonGroup.prototype.constructor = ButtonGroup;
	
	ButtonGroup.prototype.layOutChildren = function layOutChildren ()
	{
		this.children.forEach(function (btn, i, arr) {
			var left = -(1+margin)*itemSize*(arr.length-1)/2;
			var each = (1+margin)*itemSize;

			btn.position.set(left+each*i, 0, 0);
		});
	};

	return ButtonGroup;
}(THREE.Object3D));

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

		if(env.templateSid === 'conference-room-955')
		{
			this.message = PlaceholderMesh.clone();
			this.message.position.set(6, 2, 0);
			this.message.rotation.set(0, -Math.PI/2, 0);
			var ntext = new NText(this.message);
			ntext.color = 'white';
			ntext.update({
				text: 'If things get stuck, have the broken user hit the "refresh" button under the table. -Mgmt',
				fontSize: 2,
				width: 3
			});
			this.add(this.message);
		}

		this.audio = new AudioController();
		this.tutorial = new TutorialManager();

		// create the table
		this.table = new GameTable();
		this.add(this.table);

		var bg1 = new ButtonGroup(this.table);
		bg1.position.set(0, -.18, -.74);
		var bg2 = new ButtonGroup(this.table);
		bg2.position.set(-1.12, -.18, 0);
		bg2.rotation.set(0, Math.PI/2, 0);
		var bg3 = new ButtonGroup(this.table);
		bg3.position.set(0, -.18, .74);
		bg3.rotation.set(0, Math.PI, 0);
		var bg4 = new ButtonGroup(this.table);
		bg4.position.set(1.12, -.18, 0);
		bg4.rotation.set(0, Math.PI*1.5, 0);

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

	SecretHitler.prototype.doReset = function doReset (game, players, votes)
	{
		window.location.reload(true);
	};

	return SecretHitler;
}(THREE.Object3D));

var SH = new SecretHitler();

return SH;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvcG9seWZpbGwuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RoZW1lLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hc3NldG1hbmFnZXIuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hdGl2ZWNvbXBvbmVudHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JlaGF2aW9yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hbmltYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jYXJkLmpzIiwiLi4vLi4vc3JjL2NsaWVudC90YWJsZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdXRpbHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hbWVwbGF0ZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmFsbG90cHJvY2Vzc29yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9icGJhLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3QuanMiLCIuLi8uLi9zcmMvY2xpZW50L3BsYXllcmluZm8uanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcHN1bGVnZW9tZXRyeS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvaGl0Ym94LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWF0LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jb250aW51ZWJveC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvZWxlY3Rpb250cmFja2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9wcmVzZW50YXRpb24uanMiLCIuLi8uLi9zcmMvY2xpZW50L2F1ZGlvY29udHJvbGxlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdHV0b3JpYWwuanMiLCIuLi8uLi9zcmMvY2xpZW50L2J1dHRvbmdyb3VwLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWNyZXRoaXRsZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaWYoIUFycmF5LnByb3RvdHlwZS5pbmNsdWRlcyl7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgJ2luY2x1ZGVzJywge1xyXG5cdFx0dmFsdWU6IGZ1bmN0aW9uKGl0ZW0pe1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5pbmRleE9mKGl0ZW0pID4gLTE7XHJcblx0XHR9LFxyXG5cdFx0d3JpdGFibGU6IGZhbHNlLFxyXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXHJcblx0XHRjb25maWd1cmFibGU6IGZhbHNlXHJcblx0fSk7XHJcbn1cclxuIiwibGV0IGFjdGl2ZVRoZW1lID0gJ2hpdGxlcic7XHJcbmlmKC9jYWVzYXIvLnRlc3Qod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKSl7XHJcblx0YWN0aXZlVGhlbWUgPSAnY2Flc2FyJztcclxufVxyXG5cclxuY29uc3QgdGhlbWVzID0ge1xyXG5cdGhpdGxlcjoge1xyXG5cdFx0aGl0bGVyOiAnaGl0bGVyJyxcclxuXHRcdHByZXNpZGVudDogJ3ByZXNpZGVudCcsXHJcblx0XHRjaGFuY2VsbG9yOiAnY2hhbmNlbGxvcidcclxuXHR9LFxyXG5cdGNhZXNhcjoge1xyXG5cdFx0aGl0bGVyOiAnY2Flc2FyJyxcclxuXHRcdHByZXNpZGVudDogJ2NvbnN1bCcsXHJcblx0XHRjaGFuY2VsbG9yOiAncHJhZXRvcidcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYW5zbGF0ZShzdHJpbmcpXHJcbntcclxuXHRsZXQga2V5ID0gc3RyaW5nLnRvTG93ZXJDYXNlKCksXHJcblx0XHR2YWx1ZSA9IHRoZW1lc1thY3RpdmVUaGVtZV1ba2V5XSB8fCB0aGVtZXMuaGl0bGVyW2tleV0gfHwgc3RyaW5nO1xyXG5cclxuXHQvLyBzdGFydHMgd2l0aCB1cHBlciBjYXNlLCByZXN0IGlzIGxvd2VyXHJcblx0bGV0IGlzUHJvcGVyID0gc3RyaW5nLmNoYXJBdCgwKSA9PSBzdHJpbmcuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgJiYgc3RyaW5nLnNsaWNlKDEpID09IHN0cmluZy5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xyXG5cdGlmKGlzUHJvcGVyKXtcclxuXHRcdHZhbHVlID0gdmFsdWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB2YWx1ZS5zbGljZSgxKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiB2YWx1ZTtcclxufVxyXG5cclxuZXhwb3J0IHt0cmFuc2xhdGUsIGFjdGl2ZVRoZW1lfSIsImltcG9ydCB7YWN0aXZlVGhlbWUgYXMgdGhlbWV9IGZyb20gJy4vdGhlbWUnO1xyXG5cclxubGV0IHRoZW1lTW9kZWxzID0ge1xyXG5cdGNhZXNhcjoge1xyXG5cdFx0bGF1cmVsczogJy9zdGF0aWMvbW9kZWwvbGF1cmVscy5nbHRmJ1xyXG5cdH0sXHJcblx0aGl0bGVyOiB7XHJcblx0XHR0b3BoYXQ6ICcvc3RhdGljL21vZGVsL3RvcGhhdC5nbHRmJyxcclxuXHRcdHZpc29yY2FwOiAnL3N0YXRpYy9tb2RlbC92aXNvcl9jYXAuZ2x0ZidcclxuXHR9XHJcbn07XHJcblxyXG5sZXQgYXNzZXRzID0ge1xyXG5cdG1hbmlmZXN0OiB7XHJcblx0XHRtb2RlbHM6IE9iamVjdC5hc3NpZ24oe1xyXG5cdFx0XHR0YWJsZTogJy9zdGF0aWMvbW9kZWwvdGFibGUuZ2x0ZicsXHJcblx0XHRcdG5hbWVwbGF0ZTogJy9zdGF0aWMvbW9kZWwvbmFtZXBsYXRlLmRhZScsXHJcblx0XHRcdC8vZHVtbXk6ICcvc3RhdGljL21vZGVsL2R1bW15LmdsdGYnLFxyXG5cdFx0XHQvL3BsYXllcm1ldGVyOiAnL3N0YXRpYy9tb2RlbC9wbGF5ZXJtZXRlci5nbHRmJ1xyXG5cdFx0fSwgdGhlbWVNb2RlbHNbdGhlbWVdKSxcclxuXHRcdHRleHR1cmVzOiB7XHJcblx0XHRcdGJvYXJkX2xhcmdlOiBgL3N0YXRpYy9pbWcvJHt0aGVtZX0vYm9hcmQtbGFyZ2UuanBnYCxcclxuXHRcdFx0Ym9hcmRfbWVkOiBgL3N0YXRpYy9pbWcvJHt0aGVtZX0vYm9hcmQtbWVkaXVtLmpwZ2AsXHJcblx0XHRcdGJvYXJkX3NtYWxsOiBgL3N0YXRpYy9pbWcvJHt0aGVtZX0vYm9hcmQtc21hbGwuanBnYCxcclxuXHRcdFx0Y2FyZHM6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9jYXJkcy5qcGdgLFxyXG5cdFx0XHRyZXNldDogJy9zdGF0aWMvaW1nL2JvbWIucG5nJyxcclxuXHRcdFx0cmVmcmVzaDogJy9zdGF0aWMvaW1nL3JlZnJlc2guanBnJ1xyXG5cdFx0XHQvL3RleHQ6ICcvc3RhdGljL2ltZy90ZXh0LnBuZydcclxuXHRcdH1cclxuXHR9LFxyXG5cdGNhY2hlOiB7fSxcclxuXHRmaXhNYXRlcmlhbHM6IGZ1bmN0aW9uKClcclxuXHR7XHJcblx0XHRPYmplY3Qua2V5cyh0aGlzLmNhY2hlLm1vZGVscykuZm9yRWFjaChpZCA9PiB7XHJcblx0XHRcdHRoaXMuY2FjaGUubW9kZWxzW2lkXS50cmF2ZXJzZShvYmogPT4ge1xyXG5cdFx0XHRcdGlmKG9iai5tYXRlcmlhbCBpbnN0YW5jZW9mIFRIUkVFLk1lc2hTdGFuZGFyZE1hdGVyaWFsKXtcclxuXHRcdFx0XHRcdGxldCBuZXdNYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoKTtcclxuXHRcdFx0XHRcdG5ld01hdC5tYXAgPSBvYmoubWF0ZXJpYWwubWFwO1xyXG5cdFx0XHRcdFx0bmV3TWF0LmNvbG9yLmNvcHkob2JqLm1hdGVyaWFsLmNvbG9yKTtcclxuXHRcdFx0XHRcdG5ld01hdC50cmFuc3BhcmVudCA9IG9iai5tYXRlcmlhbC50cmFuc3BhcmVudDtcclxuXHRcdFx0XHRcdG5ld01hdC5zaWRlID0gb2JqLm1hdGVyaWFsLnNpZGU7XHJcblx0XHRcdFx0XHRvYmoubWF0ZXJpYWwgPSBuZXdNYXQ7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgYXNzZXRzOyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmxldCBwbGFjZWhvbGRlckdlbyA9IG5ldyBUSFJFRS5Cb3hCdWZmZXJHZW9tZXRyeSguMDAxLCAuMDAxLCAuMDAxKTtcclxubGV0IHBsYWNlaG9sZGVyTWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHhmZmZmZmYsIHZpc2libGU6IGZhbHNlfSk7XHJcbmxldCBQbGFjZWhvbGRlck1lc2ggPSBuZXcgVEhSRUUuTWVzaChwbGFjZWhvbGRlckdlbywgcGxhY2Vob2xkZXJNYXQpO1xyXG5cclxuY2xhc3MgTmF0aXZlQ29tcG9uZW50XHJcbntcclxuXHRjb25zdHJ1Y3RvcihtZXNoLCBuZWVkc1VwZGF0ZSlcclxuXHR7XHJcblx0XHR0aGlzLm1lc2ggPSBtZXNoO1xyXG5cdFx0YWx0c3BhY2UuYWRkTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lKTtcclxuXHJcblx0XHRpZihuZWVkc1VwZGF0ZSlcclxuXHRcdFx0dGhpcy51cGRhdGUoKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZShmaWVsZHMgPSB7fSlcclxuXHR7XHJcblx0XHRPYmplY3QuYXNzaWduKHRoaXMuZGF0YSwgZmllbGRzKTtcclxuXHRcdGFsdHNwYWNlLnVwZGF0ZU5hdGl2ZUNvbXBvbmVudCh0aGlzLm1lc2gsIHRoaXMubmFtZSwgdGhpcy5kYXRhKTtcclxuXHR9XHJcblxyXG5cdGRlc3Ryb3koKVxyXG5cdHtcclxuXHRcdGFsdHNwYWNlLnJlbW92ZU5hdGl2ZUNvbXBvbmVudCh0aGlzLm1lc2gsIHRoaXMubmFtZSk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBOVGV4dCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XHJcblx0Y29uc3RydWN0b3IobWVzaCl7XHJcblx0XHR0aGlzLm5hbWUgPSAnbi10ZXh0JztcclxuXHRcdHRoaXMuZGF0YSA9IHtcclxuXHRcdFx0Zm9udFNpemU6IDEwLFxyXG5cdFx0XHRoZWlnaHQ6IDEsXHJcblx0XHRcdHdpZHRoOiAxMCxcclxuXHRcdFx0dmVydGljYWxBbGlnbjogJ21pZGRsZScsXHJcblx0XHRcdGhvcml6b250YWxBbGlnbjogJ21pZGRsZScsXHJcblx0XHRcdHRleHQ6ICcnXHJcblx0XHR9O1xyXG5cdFx0c3VwZXIobWVzaCwgdHJ1ZSk7XHJcblxyXG5cdFx0dGhpcy5jb2xvciA9ICdibGFjayc7XHJcblx0fVxyXG5cdHVwZGF0ZShmaWVsZHMgPSB7fSl7XHJcblx0XHRpZihmaWVsZHMudGV4dClcclxuXHRcdFx0aWYodGhpcy5jb2xvcilcclxuXHRcdFx0XHRmaWVsZHMudGV4dCA9IGA8Y29sb3I9JHt0aGlzLmNvbG9yfT4ke2ZpZWxkcy50ZXh0fTwvY29sb3I+YDtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdGZpZWxkcy50ZXh0ID0gZmllbGRzLnRleHQ7XHJcblx0XHROYXRpdmVDb21wb25lbnQucHJvdG90eXBlLnVwZGF0ZS5jYWxsKHRoaXMsIGZpZWxkcyk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBOU2tlbGV0b25QYXJlbnQgZXh0ZW5kcyBOYXRpdmVDb21wb25lbnQge1xyXG5cdGNvbnN0cnVjdG9yKG1lc2gpe1xyXG5cdFx0dGhpcy5uYW1lID0gJ24tc2tlbGV0b24tcGFyZW50JztcclxuXHRcdHRoaXMuZGF0YSA9IHtcclxuXHRcdFx0aW5kZXg6IDAsXHJcblx0XHRcdHBhcnQ6ICdoZWFkJyxcclxuXHRcdFx0c2lkZTogJ2NlbnRlcicsIFxyXG5cdFx0XHR1c2VySWQ6IDBcclxuXHRcdH07XHJcblx0XHRzdXBlcihtZXNoLCB0cnVlKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5CaWxsYm9hcmQgZXh0ZW5kcyBOYXRpdmVDb21wb25lbnQge1xyXG5cdGNvbnN0cnVjdG9yKG1lc2gpe1xyXG5cdFx0dGhpcy5uYW1lID0gJ24tYmlsbGJvYXJkJztcclxuXHRcdHN1cGVyKG1lc2gsIGZhbHNlKTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7UGxhY2Vob2xkZXJNZXNoLCBOVGV4dCwgTlNrZWxldG9uUGFyZW50LCBOQmlsbGJvYXJkfTsiLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQge05Ta2VsZXRvblBhcmVudH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcclxuaW1wb3J0IHthY3RpdmVUaGVtZSBhcyB0aGVtZX0gZnJvbSAnLi90aGVtZSc7XHJcblxyXG5jbGFzcyBIYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3IobW9kZWwpXHJcblx0e1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuY3VycmVudElkID0gJyc7XHJcblx0XHR0aGlzLmNvbXBvbmVudHMgPSB7aGF0OiBudWxsLCB0ZXh0OiBudWxsfTtcclxuXHRcdFxyXG5cdFx0aWYobW9kZWwucGFyZW50KVxyXG5cdFx0XHRtb2RlbC5wYXJlbnQucmVtb3ZlKG1vZGVsKTtcclxuXHRcdG1vZGVsLnVwZGF0ZU1hdHJpeFdvcmxkKHRydWUpO1xyXG5cclxuXHRcdC8vIGdyYWIgbWVzaGVzXHJcblx0XHRsZXQgcHJvcCA9ICcnO1xyXG5cdFx0bW9kZWwudHJhdmVyc2Uob2JqID0+IHtcclxuXHRcdFx0aWYob2JqLm5hbWUgPT09ICdoYXQnIHx8IG9iai5uYW1lID09PSAndGV4dCcpe1xyXG5cdFx0XHRcdHByb3AgPSBvYmoubmFtZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmKG9iaiBpbnN0YW5jZW9mIFRIUkVFLk1lc2gpe1xyXG5cdFx0XHRcdHRoaXNbcHJvcF0gPSBvYmo7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHN0cmlwIG91dCBtaWRkbGUgbm9kZXNcclxuXHRcdGlmKHRoaXMuaGF0KXtcclxuXHRcdFx0dGhpcy5oYXQubWF0cml4LmNvcHkodGhpcy5oYXQubWF0cml4V29ybGQpO1xyXG5cdFx0XHR0aGlzLmhhdC5tYXRyaXguZGVjb21wb3NlKHRoaXMuaGF0LnBvc2l0aW9uLCB0aGlzLmhhdC5xdWF0ZXJuaW9uLCB0aGlzLmhhdC5zY2FsZSk7XHJcblx0XHRcdHRoaXMuYWRkKHRoaXMuaGF0KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZih0aGlzLnRleHQpe1xyXG5cdFx0XHR0aGlzLnRleHQubWF0cml4LmNvcHkodGhpcy50ZXh0Lm1hdHJpeFdvcmxkKTtcclxuXHRcdFx0dGhpcy50ZXh0Lm1hdHJpeC5kZWNvbXBvc2UodGhpcy50ZXh0LnBvc2l0aW9uLCB0aGlzLnRleHQucXVhdGVybmlvbiwgdGhpcy50ZXh0LnNjYWxlKTtcclxuXHRcdFx0dGhpcy5hZGQodGhpcy50ZXh0KTtcclxuXHRcdH1cclxuXHJcblx0XHRkLnNjZW5lLmFkZCh0aGlzKTtcclxuXHR9XHJcblxyXG5cdHNldE93bmVyKHVzZXJJZClcclxuXHR7XHJcblx0XHRpZighdGhpcy5jdXJyZW50SWQgJiYgdXNlcklkKXtcclxuXHRcdFx0ZC5zY2VuZS5hZGQodGhpcyk7XHJcblx0XHRcdGlmKHRoaXMuaGF0KVxyXG5cdFx0XHRcdHRoaXMuY29tcG9uZW50cy5oYXQgPSBuZXcgTlNrZWxldG9uUGFyZW50KHRoaXMuaGF0KTtcclxuXHRcdFx0aWYodGhpcy50ZXh0KVxyXG5cdFx0XHRcdHRoaXMuY29tcG9uZW50cy50ZXh0ID0gbmV3IE5Ta2VsZXRvblBhcmVudCh0aGlzLnRleHQpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih0aGlzLmN1cnJlbnRJZCAmJiAhdXNlcklkKXtcclxuXHRcdFx0aWYodGhpcy5oYXQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdC5kZXN0cm95KCk7XHJcblx0XHRcdGlmKHRoaXMudGV4dClcclxuXHRcdFx0XHR0aGlzLmNvbXBvbmVudHMudGV4dC5kZXN0cm95KCk7XHJcblx0XHRcdGQuc2NlbmUucmVtb3ZlKHRoaXMpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHVzZXJJZCl7XHJcblx0XHRcdGlmKHRoaXMuaGF0KVxyXG5cdFx0XHRcdHRoaXMuY29tcG9uZW50cy5oYXQudXBkYXRlKHt1c2VySWR9KTtcclxuXHRcdFx0aWYodGhpcy50ZXh0KVxyXG5cdFx0XHRcdHRoaXMuY29tcG9uZW50cy50ZXh0LnVwZGF0ZSh7dXNlcklkfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5jdXJyZW50SWQgPSB1c2VySWQ7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBQcmVzaWRlbnRIYXQgZXh0ZW5kcyBIYXRcclxue1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRpZih0aGVtZSA9PT0gJ2NhZXNhcicpXHJcblx0XHR7XHJcblx0XHRcdHN1cGVyKEFNLmNhY2hlLm1vZGVscy5sYXVyZWxzLmNsb25lKCkpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAuMDgvU0guZW52LnBpeGVsc1Blck1ldGVyLCAuMDMvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoLjUsIDAsIDApO1xyXG5cdFx0XHR0aGlzLnNjYWxlLm11bHRpcGx5U2NhbGFyKDAuOC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZVxyXG5cdFx0e1xyXG5cdFx0XHRzdXBlcihBTS5jYWNoZS5tb2RlbHMudG9waGF0KTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4xNDQvU0guZW52LnBpeGVsc1Blck1ldGVyLCAuMDM4L1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMS4yL1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGxldCBhc3NpZ25IYXQgPSAoe2RhdGE6IHtnYW1lfX0pID0+IHtcclxuXHRcdFx0bGV0IHNpdHRpbmcgPSBnYW1lLnNwZWNpYWxFbGVjdGlvbiA/IGdhbWUucHJlc2lkZW50IDogZ2FtZS5sYXN0UHJlc2lkZW50O1xyXG5cdFx0XHR0aGlzLnNldE93bmVyKHNpdHRpbmcpO1xyXG5cdFx0fVxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3NwZWNpYWxFbGVjdGlvbicsIGFzc2lnbkhhdCk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfcHJlc2lkZW50JywgYXNzaWduSGF0KTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9sYXN0UHJlc2lkZW50JywgYXNzaWduSGF0KTtcclxuXHR9XHJcbn07XHJcblxyXG5jbGFzcyBDaGFuY2VsbG9ySGF0IGV4dGVuZHMgSGF0XHJcbntcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0aWYodGhlbWUgPT09ICdjYWVzYXInKXtcclxuXHRcdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLmxhdXJlbHMuY2xvbmUoKSk7XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC4wOC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xyXG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCguNSwgMCwgMCk7XHJcblx0XHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMC44L1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHR9XHJcblx0XHRlbHNlXHJcblx0XHR7XHJcblx0XHRcdHN1cGVyKEFNLmNhY2hlLm1vZGVscy52aXNvcmNhcCk7XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAuMDcvU0guZW52LnBpeGVsc1Blck1ldGVyLCAuMDM4L1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMS4yL1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHR9XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2xhc3RDaGFuY2VsbG9yJywgZSA9PiB7XHJcblx0XHRcdHRoaXMuc2V0T3duZXIoZS5kYXRhLmdhbWUubGFzdENoYW5jZWxsb3IpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuXHJcbmNsYXNzIEJlaGF2aW9yXHJcbntcclxuXHRjb25zdHJ1Y3Rvcih0eXBlKXtcclxuXHRcdHRoaXMudHlwZSA9IHR5cGU7XHJcblx0fVxyXG5cclxuXHRhd2FrZShvYmope1xyXG5cdFx0dGhpcy5vYmplY3QzRCA9IG9iajtcclxuXHR9XHJcblxyXG5cdHN0YXJ0KCl7IH1cclxuXHJcblx0dXBkYXRlKGRUKXsgfVxyXG5cclxuXHRkaXNwb3NlKCl7IH1cclxufVxyXG5cclxuY2xhc3MgQlN5bmMgZXh0ZW5kcyBCZWhhdmlvclxyXG57XHJcblx0Y29uc3RydWN0b3IoZXZlbnROYW1lKVxyXG5cdHtcclxuXHRcdHN1cGVyKCdCU3luYycpO1xyXG5cdFx0dGhpcy5fcyA9IFNILnNvY2tldDtcclxuXHJcblx0XHQvLyBsaXN0ZW4gZm9yIHVwZGF0ZSBldmVudHNcclxuXHRcdHRoaXMuaG9vayA9IHRoaXMuX3Mub24oZXZlbnROYW1lLCB0aGlzLnVwZGF0ZUZyb21TZXJ2ZXIuYmluZCh0aGlzKSk7XHJcblx0XHR0aGlzLmV2ZW50TmFtZSA9IGV2ZW50TmFtZTtcclxuXHRcdHRoaXMub3duZXIgPSAwO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlRnJvbVNlcnZlcihkYXRhKVxyXG5cdHtcclxuXHRcdHRoaXMub2JqZWN0M0QucG9zaXRpb24uZnJvbUFycmF5KGRhdGEsIDApO1xyXG5cdFx0dGhpcy5vYmplY3QzRC5yb3RhdGlvbi5mcm9tQXJyYXkoZGF0YSwgMyk7XHJcblx0fVxyXG5cclxuXHR0YWtlT3duZXJzaGlwKClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIgJiYgU0gubG9jYWxVc2VyLnVzZXJJZClcclxuXHRcdFx0dGhpcy5vd25lciA9IFNILmxvY2FsVXNlci51c2VySWQ7XHJcblx0fVxyXG5cclxuXHR1cGRhdGUoZFQpXHJcblx0e1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyICYmIFNILmxvY2FsVXNlci5za2VsZXRvbiAmJiBTSC5sb2NhbFVzZXIuaWQgPT09IHRoaXMub3duZXIpXHJcblx0XHR7XHJcblx0XHRcdGxldCBqID0gU0gubG9jYWxVc2VyLnNrZWxldG9uLmdldEpvaW50KCdIZWFkJyk7XHJcblx0XHRcdHRoaXMuX3MuZW1pdCh0aGlzLmV2ZW50TmFtZSwgWy4uLmoucG9zaXRpb24udG9BcnJheSgpLCAuLi5qLnJvdGF0aW9uLnRvQXJyYXkoKV0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCB7IEJlaGF2aW9yLCBCU3luYyB9O1xyXG4iLCJpbXBvcnQgeyBCZWhhdmlvciB9IGZyb20gJy4vYmVoYXZpb3InO1xyXG5cclxuY2xhc3MgUXVhdGVybmlvblR3ZWVuIGV4dGVuZHMgVFdFRU4uVHdlZW5cclxue1xyXG5cdGNvbnN0cnVjdG9yKHN0YXRlLCBncm91cCl7XHJcblx0XHRzdXBlcih7dDogMH0sIGdyb3VwKTtcclxuXHRcdHRoaXMuX3N0YXRlID0gc3RhdGU7XHJcblx0XHR0aGlzLl9zdGFydCA9IHN0YXRlLmNsb25lKCk7XHJcblx0fVxyXG5cdHRvKGVuZCwgZHVyYXRpb24pe1xyXG5cdFx0c3VwZXIudG8oe3Q6IDF9LCBkdXJhdGlvbik7XHJcblx0XHR0aGlzLl9lbmQgPSBlbmQgaW5zdGFuY2VvZiBUSFJFRS5RdWF0ZXJuaW9uID8gW2VuZF0gOiBlbmQ7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9XHJcblx0c3RhcnQoKXtcclxuXHRcdHRoaXMub25VcGRhdGUoKHt0OiBwcm9ncmVzc30pID0+IHtcclxuXHRcdFx0cHJvZ3Jlc3MgPSBwcm9ncmVzcyAqIHRoaXMuX2VuZC5sZW5ndGg7XHJcblx0XHRcdGxldCBuZXh0UG9pbnQgPSBNYXRoLmNlaWwocHJvZ3Jlc3MpO1xyXG5cdFx0XHRsZXQgbG9jYWxQcm9ncmVzcyA9IHByb2dyZXNzIC0gbmV4dFBvaW50ICsgMTtcclxuXHRcdFx0bGV0IHBvaW50cyA9IFt0aGlzLl9zdGFydCwgLi4udGhpcy5fZW5kXTtcclxuXHRcdFx0VEhSRUUuUXVhdGVybmlvbi5zbGVycChwb2ludHNbbmV4dFBvaW50LTFdLCBwb2ludHNbbmV4dFBvaW50XSwgdGhpcy5fc3RhdGUsIGxvY2FsUHJvZ3Jlc3MpO1xyXG5cdFx0fSk7XHJcblx0XHRyZXR1cm4gc3VwZXIuc3RhcnQoKTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIFdhaXRGb3JBbmltcyh0d2VlbnMpXHJcbntcclxuXHRsZXQgcCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XHJcblx0e1xyXG5cdFx0bGV0IGFjdGl2ZUNvdW50ID0gdHdlZW5zLmxlbmd0aDtcclxuXHRcdGZ1bmN0aW9uIGNoZWNrRG9uZSgpe1xyXG5cdFx0XHRpZigtLWFjdGl2ZUNvdW50ID09PSAwKSByZXNvbHZlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dHdlZW5zLmZvckVhY2godCA9PiB0Lm9uQ29tcGxldGUoY2hlY2tEb25lKSk7XHJcblx0XHR0d2VlbnMuZm9yRWFjaCh0ID0+IHQub25TdG9wKHJlamVjdCkpO1xyXG5cdFx0dHdlZW5zLmZvckVhY2godCA9PiB0LnN0YXJ0KCkpO1xyXG5cdH0pO1xyXG5cdHAudHdlZW5zID0gdHdlZW5zO1xyXG5cdHJldHVybiBwO1xyXG59XHJcblxyXG5jb25zdCBzcGluUG9pbnRzID0gW1xyXG5cdG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIE1hdGguc3FydCgyKS8yLCAwLCBNYXRoLnNxcnQoMikvMiksXHJcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMSwgMCwgMCksXHJcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgTWF0aC5zcXJ0KDIpLzIsIDAsIC1NYXRoLnNxcnQoMikvMiksXHJcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMCwgMCwgMSlcclxuXTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFuaW1hdGVcclxue1xyXG5cdC8qKlxyXG5cdCAqIE1vdmUgYW4gb2JqZWN0IGZyb20gQSB0byBCXHJcblx0ICogQHBhcmFtIHtUSFJFRS5PYmplY3QzRH0gdGFyZ2V0IFxyXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXHJcblx0ICovXHJcblx0c3RhdGljIHNpbXBsZSh0YXJnZXQsIHtwYXJlbnQ9bnVsbCwgcG9zPW51bGwsIHF1YXQ9bnVsbCwgc2NhbGU9bnVsbCwgaHVlPW51bGwsIG1hdHJpeD1udWxsLCBkdXJhdGlvbj02MDB9ID0ge30pXHJcblx0e1xyXG5cdFx0Ly8gZXh0cmFjdCBwb3NpdGlvbi9yb3RhdGlvbi9zY2FsZSBmcm9tIG1hdHJpeFxyXG5cdFx0aWYobWF0cml4KXtcclxuXHRcdFx0cG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcclxuXHRcdFx0cXVhdCA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XHJcblx0XHRcdHNjYWxlID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcclxuXHRcdFx0bWF0cml4LmRlY29tcG9zZShwb3MsIHF1YXQsIHNjYWxlKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBzaHVmZmxlIGhpZXJhcmNoeSwgYnV0IGtlZXAgd29ybGQgdHJhbnNmb3JtIHRoZSBzYW1lXHJcblx0XHRpZihwYXJlbnQgJiYgdGhpcy5wYXJlbnQgIT09IHRhcmdldC5wYXJlbnQpe1xyXG5cdFx0XHR0YXJnZXQuYXBwbHlNYXRyaXgodGFyZ2V0LnBhcmVudC5tYXRyaXhXb3JsZCk7XHJcblx0XHRcdHRhcmdldC5hcHBseU1hdHJpeChuZXcgVEhSRUUuTWF0cml4NCgpLmdldEludmVyc2UocGFyZW50Lm1hdHJpeFdvcmxkKSk7XHJcblx0XHRcdHBhcmVudC5hZGQob2JqKTtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgYW5pbXMgPSBbXTtcclxuXHJcblx0XHRpZihwb3Mpe1xyXG5cdFx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2Vlbih0YXJnZXQucG9zaXRpb24pXHJcblx0XHRcdFx0LnRvKHt4OiBwb3MueCwgeTogcG9zLnksIHo6IHBvcy56fSwgZHVyYXRpb24pXHJcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZihxdWF0KXtcclxuXHRcdFx0YW5pbXMucHVzaChuZXcgUXVhdGVybmlvblR3ZWVuKHRhcmdldC5xdWF0ZXJuaW9uKVxyXG5cdFx0XHRcdC50byhxdWF0LCBkdXJhdGlvbilcclxuXHRcdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0KVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHNjYWxlKXtcclxuXHRcdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4odGFyZ2V0LnNjYWxlKVxyXG5cdFx0XHRcdC50byh7eDogc2NhbGUueCwgeTogc2NhbGUueSwgejogc2NhbGUuen0sIGR1cmF0aW9uKVxyXG5cdFx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoaHVlICE9PSBudWxsKXtcclxuXHRcdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4odGFyZ2V0Lm1hdGVyaWFsLmNvbG9yLmdldEhTTCgpKVxyXG5cdFx0XHRcdC50byh7aDogaHVlfSwgZHVyYXRpb24pXHJcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcclxuXHRcdFx0XHQub25VcGRhdGUodHdlZW4gPT4ge1xyXG5cdFx0XHRcdFx0dGFyZ2V0Lm1hdGVyaWFsLmNvbG9yLnNldEhTTCh0d2Vlbi5oLCB0d2Vlbi5zLCB0d2Vlbi5sKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBXYWl0Rm9yQW5pbXMoYW5pbXMpO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIHdhaXQoZHVyYXRpb24pe1xyXG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0c2V0VGltZW91dChyZXNvbHZlLCBkdXJhdGlvbik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1ha2UgdGhlIGNhcmQgYXBwZWFyIHdpdGggYSBmbG91cmlzaFxyXG5cdCAqIEBwYXJhbSB7VEhSRUUuT2JqZWN0M0R9IGNhcmQgXHJcblx0ICovXHJcblx0c3RhdGljIGNhcmRGbG91cmlzaChjYXJkKVxyXG5cdHtcclxuXHRcdGNhcmQucG9zaXRpb24uc2V0KDAsIDAsIDApO1xyXG5cdFx0Y2FyZC5xdWF0ZXJuaW9uLnNldCgwLDAsMCwxKTtcclxuXHRcdGNhcmQuc2NhbGUuc2V0U2NhbGFyKC4wMDEpO1xyXG5cclxuXHRcdGxldCBhbmltcyA9IFtdO1xyXG5cclxuXHRcdC8vIGFkZCBwb3NpdGlvbiBhbmltYXRpb25cclxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKGNhcmQucG9zaXRpb24pXHJcblx0XHRcdC50byh7eDogMCwgeTogLjcsIHo6IDB9LCAxNTAwKVxyXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5FbGFzdGljLk91dClcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gYWRkIHNwaW4gYW5pbWF0aW9uXHJcblx0XHRhbmltcy5wdXNoKG5ldyBRdWF0ZXJuaW9uVHdlZW4oY2FyZC5xdWF0ZXJuaW9uKVxyXG5cdFx0XHQudG8oc3BpblBvaW50cywgMjUwMClcclxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gYWRkIHNjYWxlIGFuaW1hdGlvblxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4oY2FyZC5zY2FsZSlcclxuXHRcdFx0LnRvKHt4OiAuNSwgeTogLjUsIHo6IC41fSwgMjAwKVxyXG5cdFx0KTtcclxuXHJcblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKGFuaW1zKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyB2YW5pc2goY2FyZClcclxuXHR7XHJcblx0XHRsZXQgYW5pbXMgPSBbXTtcclxuXHJcblx0XHQvLyBhZGQgbW92ZSBhbmltYXRpb25cclxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKGNhcmQucG9zaXRpb24pXHJcblx0XHRcdC50byh7eTogJyswLjUnfSwgMTAwMClcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gYWRkIGRpc2FwcGVhciBhbmltYXRpb25cclxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKGNhcmQubWF0ZXJpYWwpXHJcblx0XHRcdC50byh7b3BhY2l0eTogMH0sIDEwMDApXHJcblx0XHQpO1xyXG5cclxuXHRcdHJldHVybiBXYWl0Rm9yQW5pbXMoYW5pbXMpO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGJvYihvYmosIGFtcGxpdHVkZSA9IC4wOCwgcGVyaW9kID0gNDAwMClcclxuXHR7XHJcblx0XHRyZXR1cm4gbmV3IFRXRUVOLlR3ZWVuKG9iai5wb3NpdGlvbilcclxuXHRcdFx0LnRvKHt5OiBvYmoucG9zaXRpb24ueS1hbXBsaXR1ZGV9LCBwZXJpb2QpXHJcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlNpbnVzb2lkYWwuSW5PdXQpXHJcblx0XHRcdC5yZXBlYXQoSW5maW5pdHkpXHJcblx0XHRcdC55b3lvKHRydWUpXHJcblx0XHRcdC5zdGFydCgpO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIHNwaW4ob2JqLCBwZXJpb2QgPSAxMDAwMClcclxuXHR7XHJcblx0XHRyZXR1cm4gbmV3IFF1YXRlcm5pb25Ud2VlbihvYmoucXVhdGVybmlvbilcclxuXHRcdFx0LnRvKHNwaW5Qb2ludHMsIHBlcmlvZClcclxuXHRcdFx0LnJlcGVhdChJbmZpbml0eSlcclxuXHRcdFx0LnN0YXJ0KCk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgd2lua0luKG9iaiwgZHVyYXRpb24gPSAyMDApXHJcblx0e1xyXG5cdFx0aWYoIW9iai51c2VyRGF0YS5zY2FsZU9yaWcpXHJcblx0XHRcdG9iai51c2VyRGF0YS5zY2FsZU9yaWcgPSBvYmouc2NhbGUuY2xvbmUoKTtcclxuXHJcblx0XHRsZXQgYW5pbXMgPSBbXTtcclxuXHJcblx0XHRvYmouc2NhbGUuc2V0U2NhbGFyKC4wMDEpO1xyXG5cdFx0b2JqLnZpc2libGUgPSB0cnVlO1xyXG5cclxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKG9iai5zY2FsZSlcclxuXHRcdFx0LnRvKHt5OiBvYmoudXNlckRhdGEuc2NhbGVPcmlnLnl9LCBkdXJhdGlvbilcclxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuQ3ViaWMuSW4pXHJcblx0XHQpO1xyXG5cclxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKG9iai5zY2FsZSlcclxuXHRcdFx0LnRvKHt4OiBvYmoudXNlckRhdGEuc2NhbGVPcmlnLngsIHo6IG9iai51c2VyRGF0YS5zY2FsZU9yaWcuen0sIC4yKmR1cmF0aW9uKVxyXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5DdWJpYy5JbilcclxuXHRcdCk7XHJcblxyXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgd2lua091dChvYmosIGR1cmF0aW9uID0gMjAwKVxyXG5cdHtcclxuXHRcdGlmKCFvYmoudXNlckRhdGEuc2NhbGVPcmlnKVxyXG5cdFx0XHRvYmoudXNlckRhdGEuc2NhbGVPcmlnID0gb2JqLnNjYWxlLmNsb25lKCk7XHJcblxyXG5cdFx0bGV0IGFuaW1zID0gW107XHJcblx0XHRvYmoudmlzaWJsZSA9IHRydWU7XHJcblx0XHRcclxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKG9iai5zY2FsZSlcclxuXHRcdFx0LnRvKHt5OiAuMDAxfSwgZHVyYXRpb24pXHJcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLkN1YmljLk91dClcclxuXHRcdCk7XHJcblxyXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4ob2JqLnNjYWxlKVxyXG5cdFx0XHQudG8oe3g6IC4wMDEsIHo6IC4wMDF9LCAuMipkdXJhdGlvbilcclxuXHRcdFx0LmRlbGF5KC44KmR1cmF0aW9uKVxyXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5DdWJpYy5PdXQpXHJcblx0XHRcdC5vbkNvbXBsZXRlKCgpID0+IHsgb2JqLnZpc2libGUgPSBmYWxzZTsgfSlcclxuXHRcdCk7XHJcblxyXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgc3dpbmdJbihvYmosIHJvdGF0aW9uPU1hdGguUEkvMiwgcmFkaXVzPTAuNSwgZHVyYXRpb249MzAwKVxyXG5cdHtcclxuXHRcdGlmKCFvYmoudXNlckRhdGEudHJhbnNmb3JtKVxyXG5cdFx0XHRvYmoudXNlckRhdGEudHJhbnNmb3JtID0ge1xyXG5cdFx0XHRcdHJvdGF0aW9uOiBvYmoucm90YXRpb24ueCxcclxuXHRcdFx0XHRwb3NpdGlvbjogb2JqLnBvc2l0aW9uLmNsb25lKClcclxuXHRcdFx0fTtcclxuXHJcblx0XHQvLyBwdXQgYXQgc3RhcnQgcG9zaXRpb25cclxuXHRcdG9iai50cmFuc2xhdGVZKC1yYWRpdXMpO1xyXG5cdFx0b2JqLnJvdGF0aW9uLnggPSBvYmoudXNlckRhdGEudHJhbnNmb3JtLnJvdGF0aW9uICsgcm90YXRpb247XHJcblx0XHRvYmoudHJhbnNsYXRlWShyYWRpdXMpO1xyXG5cclxuXHRcdGxldCBhbmltID0gbmV3IFRXRUVOLlR3ZWVuKHt0OjF9KVxyXG5cdFx0XHQudG8oe3Q6IDB9LCBkdXJhdGlvbilcclxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuQm91bmNlLk91dClcclxuXHRcdFx0Lm9uVXBkYXRlKCh7dH0pID0+IHtcclxuXHRcdFx0XHRvYmoudHJhbnNsYXRlWSgtcmFkaXVzKTtcclxuXHRcdFx0XHRvYmoucm90YXRpb24ueCA9IG9iai51c2VyRGF0YS50cmFuc2Zvcm0ucm90YXRpb24gKyB0KnJvdGF0aW9uO1xyXG5cdFx0XHRcdG9iai50cmFuc2xhdGVZKHJhZGl1cyk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5vblN0b3AoKCkgPT4ge1xyXG5cdFx0XHRcdG9iai50cmFuc2xhdGVZKC1yYWRpdXMpO1xyXG5cdFx0XHRcdG9iai5yb3RhdGlvbi54ID0gb2JqLnVzZXJEYXRhLnRyYW5zZm9ybS5yb3RhdGlvbiArIHJvdGF0aW9uO1xyXG5cdFx0XHRcdG9iai50cmFuc2xhdGVZKHJhZGl1cyk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBXYWl0Rm9yQW5pbXMoW2FuaW1dKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBzd2luZ091dChvYmosIHJvdGF0aW9uPU1hdGguUEkvMiwgcmFkaXVzPTAuNSwgZHVyYXRpb249MzAwKVxyXG5cdHtcclxuXHRcdGlmKCFvYmoudXNlckRhdGEudHJhbnNmb3JtKVxyXG5cdFx0XHRvYmoudXNlckRhdGEudHJhbnNmb3JtID0ge1xyXG5cdFx0XHRcdHJvdGF0aW9uOiBvYmoucm90YXRpb24ueCxcclxuXHRcdFx0XHRwb3NpdGlvbjogb2JqLnBvc2l0aW9uLmNsb25lKClcclxuXHRcdFx0fTtcclxuXHJcblx0XHRvYmoucm90YXRpb24ueCA9IG9iai51c2VyRGF0YS50cmFuc2Zvcm0ucm90YXRpb247XHJcblx0XHRvYmoucG9zaXRpb24uY29weShvYmoudXNlckRhdGEudHJhbnNmb3JtLnBvc2l0aW9uKTtcclxuXHJcblx0XHRsZXQgYW5pbSA9IG5ldyBUV0VFTi5Ud2Vlbih7dDowfSlcclxuXHRcdFx0LnRvKHt0OiAxfSwgZHVyYXRpb24pXHJcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5JbilcclxuXHRcdFx0Lm9uVXBkYXRlKCh7dH0pID0+IHtcclxuXHRcdFx0XHRvYmoudHJhbnNsYXRlWSgtcmFkaXVzKTtcclxuXHRcdFx0XHRvYmoucm90YXRpb24ueCA9IG9iai51c2VyRGF0YS50cmFuc2Zvcm0ucm90YXRpb24gKyB0KnJvdGF0aW9uO1xyXG5cdFx0XHRcdG9iai50cmFuc2xhdGVZKHJhZGl1cyk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5vblN0b3AoKCkgPT4ge1xyXG5cdFx0XHRcdG9iai5yb3RhdGlvbi54ID0gb2JqLnVzZXJEYXRhLnRyYW5zZm9ybS5yb3RhdGlvbjtcclxuXHRcdFx0XHRvYmoucG9zaXRpb24uY29weShvYmoudXNlckRhdGEudHJhbnNmb3JtLnBvc2l0aW9uKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhbYW5pbV0pO1xyXG5cdH1cclxufVxyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcclxuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuXHJcbi8vIGVudW0gY29uc3RhbnRzXHJcbmxldCBUeXBlcyA9IE9iamVjdC5mcmVlemUoe1xyXG5cdFBPTElDWV9MSUJFUkFMOiAwLFxyXG5cdFBPTElDWV9GQVNDSVNUOiAxLFxyXG5cdFJPTEVfTElCRVJBTDogMixcclxuXHRST0xFX0ZBU0NJU1Q6IDMsXHJcblx0Uk9MRV9ISVRMRVI6IDQsXHJcblx0UEFSVFlfTElCRVJBTDogNSxcclxuXHRQQVJUWV9GQVNDSVNUOiA2LFxyXG5cdEpBOiA3LFxyXG5cdE5FSU46IDgsXHJcblx0QkxBTks6IDksXHJcblx0Q1JFRElUUzogMTAsXHJcblx0VkVUTzogMTFcclxufSk7XHJcblxyXG5sZXQgZ2VvbWV0cnkgPSBudWxsLCBtYXRlcmlhbCA9IG51bGw7XHJcblxyXG5mdW5jdGlvbiBpbml0Q2FyZERhdGEoKVxyXG57XHJcblx0bGV0IGZsb2F0RGF0YSA9IFtcclxuXHRcdC8vIHBvc2l0aW9uIChwb3J0cmFpdClcclxuXHRcdDAuMzU3NSwgMC41LCAwLjAwMDUsXHJcblx0XHQtLjM1NzUsIDAuNSwgMC4wMDA1LFxyXG5cdFx0LS4zNTc1LCAtLjUsIDAuMDAwNSxcclxuXHRcdDAuMzU3NSwgLS41LCAwLjAwMDUsXHJcblx0XHQwLjM1NzUsIDAuNSwgLS4wMDA1LFxyXG5cdFx0LS4zNTc1LCAwLjUsIC0uMDAwNSxcclxuXHRcdC0uMzU3NSwgLS41LCAtLjAwMDUsXHJcblx0XHQwLjM1NzUsIC0uNSwgLS4wMDA1LFxyXG5cdFxyXG5cdFx0Ly8gcG9zaXRpb24gKGxhbmRzY2FwZSlcclxuXHRcdDAuNSwgLS4zNTc1LCAwLjAwMDUsXHJcblx0XHQwLjUsIDAuMzU3NSwgMC4wMDA1LFxyXG5cdFx0LS41LCAwLjM1NzUsIDAuMDAwNSxcclxuXHRcdC0uNSwgLS4zNTc1LCAwLjAwMDUsXHJcblx0XHQwLjUsIC0uMzU3NSwgLS4wMDA1LFxyXG5cdFx0MC41LCAwLjM1NzUsIC0uMDAwNSxcclxuXHRcdC0uNSwgMC4zNTc1LCAtLjAwMDUsXHJcblx0XHQtLjUsIC0uMzU3NSwgLS4wMDA1LFxyXG5cdFxyXG5cdFx0Ly8gVVZzXHJcblx0XHQvKiAtLS0tLS0tLS0tLS0tLSBjYXJkIGZhY2UgLS0tLS0tLS0tLS0tLSAqLyAvKiAtLS0tLS0tLS0tLS0tIGNhcmQgYmFjayAtLS0tLS0tLS0tLS0tLSovXHJcblx0XHQuNzU0LC45OTYsIC43NTQsLjgzNCwgLjk5NywuODM0LCAuOTk3LC45OTYsIC43NTQsLjgzNCwgLjc1NCwuOTk2LCAuOTk3LC45OTYsIC45OTcsLjgzNCwgLy8gbGliZXJhbCBwb2xpY3lcclxuXHRcdC43NTQsLjgyMiwgLjc1NCwuNjYwLCAuOTk2LC42NjAsIC45OTYsLjgyMiwgLjc1NCwuNjYwLCAuNzU0LC44MjIsIC45OTYsLjgyMiwgLjk5NiwuNjYwLCAvLyBmYXNjaXN0IHBvbGljeVxyXG5cdFx0Ljc0NiwuOTk2LCAuNTA1LC45OTYsIC41MDUsLjY1MCwgLjc0NiwuNjUwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGxpYmVyYWwgcm9sZVxyXG5cdFx0Ljc0NiwuNjQ1LCAuNTA1LC42NDUsIC41MDUsLjMwMCwgLjc0NiwuMzAwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGZhc2Npc3Qgcm9sZVxyXG5cdFx0Ljk5NiwuNjQ1LCAuNzU0LC42NDUsIC43NTQsLjMwMCwgLjk5NiwuMzAwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGhpdGxlciByb2xlXHJcblx0XHQuNDk1LC45OTYsIC4yNTUsLjk5NiwgLjI1NSwuNjUwLCAuNDk1LC42NTAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbGliZXJhbCBwYXJ0eVxyXG5cdFx0LjQ5NSwuNjQ1LCAuMjU1LC42NDUsIC4yNTUsLjMwMCwgLjQ5NSwuMzAwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGZhc2Npc3QgcGFydHlcclxuXHRcdC4yNDQsLjk5MiwgLjAwNSwuOTkyLCAuMDA1LC42NTMsIC4yNDQsLjY1MywgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBqYVxyXG5cdFx0LjI0MywuNjQyLCAuMDA2LC42NDIsIC4wMDYsLjMwMiwgLjI0MywuMzAyLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIG5laW5cclxuXHRcdC4wMjEsLjI2OSwgLjAyMSwuMDIyLCAuMzc1LC4wMjIsIC4zNzUsLjI2OSwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBibGFua1xyXG5cdFx0LjM5NywuMjc2LCAuMzk3LC4wMTUsIC43NjUsLjAxNSwgLjc2NSwuMjc2LCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGNyZWRpdHNcclxuXHRcdC45NjMsLjI3MCwgLjgwNCwuMjcwLCAuODA0LC4wMjksIC45NjMsLjAyOSwgLjgwNCwuMjcwLCAuOTYzLC4yNzAsIC45NjMsLjAyOSwgLjgwNCwuMDI5LCAvLyB2ZXRvXHJcblxyXG5cdF07XHJcblx0XHJcblx0bGV0IGludERhdGEgPSBbXHJcblx0XHQvLyB0cmlhbmdsZSBpbmRleFxyXG5cdFx0MCwxLDIsIDAsMiwzLCA0LDcsNSwgNSw3LDZcclxuXHRdO1xyXG5cdFxyXG5cdC8vIHR3byBwb3NpdGlvbiBzZXRzLCAxMSBVViBzZXRzLCAxIGluZGV4IHNldFxyXG5cdGxldCBnZW9CdWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoNCpmbG9hdERhdGEubGVuZ3RoICsgMippbnREYXRhLmxlbmd0aCk7XHJcblx0bGV0IHRlbXAgPSBuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgMCwgZmxvYXREYXRhLmxlbmd0aCk7XHJcblx0dGVtcC5zZXQoZmxvYXREYXRhKTtcclxuXHR0ZW1wID0gbmV3IFVpbnQxNkFycmF5KGdlb0J1ZmZlciwgNCpmbG9hdERhdGEubGVuZ3RoLCBpbnREYXRhLmxlbmd0aCk7XHJcblx0dGVtcC5zZXQoaW50RGF0YSk7XHJcblx0XHJcblx0Ly8gY2hvcCB1cCBidWZmZXIgaW50byB2ZXJ0ZXggYXR0cmlidXRlc1xyXG5cdGxldCBwb3NMZW5ndGggPSA4KjMsIHV2TGVuZ3RoID0gOCoyLCBpbmRleExlbmd0aCA9IDEyO1xyXG5cdGxldCBwb3NQb3J0cmFpdCA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDAsIHBvc0xlbmd0aCksIDMpLFxyXG5cdFx0cG9zTGFuZHNjYXBlID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgNCpwb3NMZW5ndGgsIHBvc0xlbmd0aCksIDMpO1xyXG5cdGxldCB1dnMgPSBbXTtcclxuXHRmb3IobGV0IGk9MDsgaTwxMjsgaSsrKXtcclxuXHRcdHV2cy5wdXNoKCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCA4KnBvc0xlbmd0aCArIDQqaSp1dkxlbmd0aCwgdXZMZW5ndGgpLCAyKSApO1xyXG5cdH1cclxuXHRsZXQgaW5kZXggPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBVaW50MTZBcnJheShnZW9CdWZmZXIsIDQqZmxvYXREYXRhLmxlbmd0aCwgaW5kZXhMZW5ndGgpLCAxKTtcclxuXHRcclxuXHRnZW9tZXRyeSA9IE9iamVjdC5rZXlzKFR5cGVzKS5tYXAoKGtleSwgaSkgPT5cclxuXHR7XHJcblx0XHRsZXQgZ2VvID0gbmV3IFRIUkVFLkJ1ZmZlckdlb21ldHJ5KCk7XHJcblx0XHRnZW8uYWRkQXR0cmlidXRlKCdwb3NpdGlvbicsIGk9PVR5cGVzLkpBIHx8IGk9PVR5cGVzLk5FSU4gPyBwb3NMYW5kc2NhcGUgOiBwb3NQb3J0cmFpdCk7XHJcblx0XHRnZW8uYWRkQXR0cmlidXRlKCd1dicsIHV2c1tpXSk7XHJcblx0XHRnZW8uc2V0SW5kZXgoaW5kZXgpO1xyXG5cdFx0cmV0dXJuIGdlbztcclxuXHR9KTtcclxuXHJcblx0bWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogQXNzZXRNYW5hZ2VyLmNhY2hlLnRleHR1cmVzLmNhcmRzfSk7XHJcbn1cclxuXHJcblxyXG5jbGFzcyBDYXJkIGV4dGVuZHMgVEhSRUUuTWVzaFxyXG57XHJcblx0Y29uc3RydWN0b3IodHlwZSA9IFR5cGVzLkJMQU5LKVxyXG5cdHtcclxuXHRcdGlmKCFnZW9tZXRyeSB8fCAhbWF0ZXJpYWwpIGluaXRDYXJkRGF0YSgpO1xyXG5cclxuXHRcdGxldCBnZW8gPSBnZW9tZXRyeVt0eXBlXTtcclxuXHRcdHN1cGVyKGdlbywgbWF0ZXJpYWwpO1xyXG5cdFx0dGhpcy5zY2FsZS5zZXRTY2FsYXIoMC43KTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIEJsYW5rQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7IHN1cGVyKCk7IH1cclxufVxyXG5cclxuY2xhc3MgQ3JlZGl0c0NhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuQ1JFRElUUyk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBMaWJlcmFsUG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfTElCRVJBTCwgZmFsc2UpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgRmFzY2lzdFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0ZBU0NJU1QpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgVmV0b0NhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuVkVUTyk7XHJcblx0XHR0aGlzLm1hdGVyaWFsID0gdGhpcy5tYXRlcmlhbC5jbG9uZSgpO1xyXG5cdH1cclxufVxyXG5jbGFzcyBMaWJlcmFsUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9MSUJFUkFMKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIEZhc2Npc3RSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5ST0xFX0ZBU0NJU1QpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgSGl0bGVyUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9ISVRMRVIpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgTGliZXJhbFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9MSUJFUkFMKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIEZhc2Npc3RQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfRkFTQ0lTVCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBKYUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuSkEpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgTmVpbkNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuTkVJTik7XHJcblx0fVxyXG59XHJcblxyXG5cclxuZXhwb3J0IHtcclxuXHRDYXJkLCBUeXBlcywgQmxhbmtDYXJkLCBDcmVkaXRzQ2FyZCwgVmV0b0NhcmQsXHJcblx0TGliZXJhbFBvbGljeUNhcmQsIEZhc2Npc3RQb2xpY3lDYXJkLCBMaWJlcmFsUm9sZUNhcmQsIEZhc2Npc3RSb2xlQ2FyZCxcclxuXHRIaXRsZXJSb2xlQ2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZFxyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xyXG5pbXBvcnQge0xpYmVyYWxQb2xpY3lDYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgVmV0b0NhcmR9IGZyb20gJy4vY2FyZCc7XHJcblxyXG5sZXQgTGliZXJhbFNwb3RzID0ge1xyXG5cdHBvc2l0aW9uczogW1xyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC42OTAsIDAuMDAxLCAtMC40MiksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjM0NSwgMC4wMDEsIC0wLjQyKSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuMDAyLCAwLjAwMSwgLTAuNDIpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoLS4zNDAsIDAuMDAxLCAtMC40MiksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjY5MCwgMC4wMDEsIC0wLjQyKVxyXG5cdF0sXHJcblx0cXVhdGVybmlvbjogbmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMC43MDcxMDY3ODExODY1NDc1LCAwLjcwNzEwNjc4MTE4NjU0NzUsIDApLFxyXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjQsIDAuNCwgMC40KVxyXG59LFxyXG5GYXNjaXN0U3BvdHMgPSB7XHJcblx0cG9zaXRpb25zOiBbXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjg2MCwgMC4wMDEsIC40MjUpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoLS41MTUsIDAuMDAxLCAuNDI1KSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uMTcwLCAwLjAwMSwgLjQyNSksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjE3MCwgMC4wMDEsIC40MjUpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC41MTgsIDAuMDAxLCAuNDI1KSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuODcwLCAwLjAwMSwgLjQyNSksXHRcclxuXHRdLFxyXG5cdHF1YXRlcm5pb246IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKC0wLjcwNzEwNjc4MTE4NjU0NzUsIDAsIDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSksXHJcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNCwgMC40LCAwLjQpXHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHYW1lVGFibGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3IoKVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblxyXG5cdFx0Ly8gdGFibGUgc3RhdGVcclxuXHRcdHRoaXMubGliZXJhbENhcmRzID0gMDtcclxuXHRcdHRoaXMuZmFzY2lzdENhcmRzID0gMDtcclxuXHRcdHRoaXMuY2FyZHMgPSBbXTtcclxuXHJcblx0XHR0aGlzLnZldG9DYXJkID0gbmV3IFZldG9DYXJkKCk7XHJcblx0XHR0aGlzLnZldG9DYXJkLnNjYWxlLnNldFNjYWxhciguNSk7XHJcblx0XHR0aGlzLnZldG9DYXJkLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMudmV0b0NhcmQubWF0ZXJpYWwudHJhbnNwYXJlbnQgPSB0cnVlO1xyXG5cdFx0dGhpcy5hZGQodGhpcy52ZXRvQ2FyZCk7XHJcblxyXG5cdFx0Ly8gYWRkIHRhYmxlIGFzc2V0XHJcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnRhYmxlO1xyXG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XHJcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcclxuXHJcblx0XHQvLyBzYXZlIHJlZmVyZW5jZXMgdG8gdGhlIHRleHR1cmVzXHJcblx0XHR0aGlzLnRleHR1cmVzID0gW1xyXG5cdFx0XHRBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9zbWFsbCxcclxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbWVkLFxyXG5cdFx0XHRBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9sYXJnZVxyXG5cdFx0XTtcclxuXHRcdHRoaXMudGV4dHVyZXMuZm9yRWFjaCh0ZXggPT4gdGV4LmZsaXBZID0gZmFsc2UpO1xyXG5cdFx0dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbMF0sIHRydWUpO1xyXG5cdFx0XHJcblx0XHQvLyBwb3NpdGlvbiB0YWJsZVxyXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMS4wLCAwKTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy5jaGFuZ2VNb2RlLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2xpYmVyYWxQb2xpY2llcycsIHRoaXMudXBkYXRlUG9saWNpZXMuYmluZCh0aGlzKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfZmFzY2lzdFBvbGljaWVzJywgdGhpcy51cGRhdGVQb2xpY2llcy5iaW5kKHRoaXMpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9mYWlsZWRWb3RlcycsIHRoaXMudXBkYXRlUG9saWNpZXMuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHRjaGFuZ2VNb2RlKHtkYXRhOiB7Z2FtZToge3N0YXRlLCB0dXJuT3JkZXJ9fX0pXHJcblx0e1xyXG5cdFx0aWYodHVybk9yZGVyLmxlbmd0aCA+PSA5KVxyXG5cdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1syXSk7XHJcblx0XHRlbHNlIGlmKHR1cm5PcmRlci5sZW5ndGggPj0gNylcclxuXHRcdFx0dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbMV0pO1xyXG5cdFx0ZWxzZVxyXG5cdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1swXSk7XHJcblx0fVxyXG5cclxuXHRzZXRUZXh0dXJlKG5ld1RleCwgc3dpdGNoTGlnaHRtYXApXHJcblx0e1xyXG5cdFx0dGhpcy5tb2RlbC50cmF2ZXJzZShvID0+IHtcclxuXHRcdFx0aWYobyBpbnN0YW5jZW9mIFRIUkVFLk1lc2gpXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZihzd2l0Y2hMaWdodG1hcClcclxuXHRcdFx0XHRcdG8ubWF0ZXJpYWwubGlnaHRNYXAgPSBvLm1hdGVyaWFsLm1hcDtcclxuXHJcblx0XHRcdFx0by5tYXRlcmlhbC5tYXAgPSBuZXdUZXg7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlUG9saWNpZXMoe2RhdGE6IHtnYW1lOiB7bGliZXJhbFBvbGljaWVzLCBmYXNjaXN0UG9saWNpZXMsIGhhbmQsIHN0YXRlfX19KVxyXG5cdHtcclxuXHRcdGxldCB1cGRhdGVzID0gW107XHJcblxyXG5cdFx0Ly8gcXVldWUgdXAgY2FyZHMgdG8gYmUgYWRkZWQgdG8gdGhlIHRhYmxlIHRoaXMgdXBkYXRlXHJcblx0XHRmb3IodmFyIGk9dGhpcy5saWJlcmFsQ2FyZHM7IGk8bGliZXJhbFBvbGljaWVzOyBpKyspe1xyXG5cdFx0XHRsZXQgY2FyZCA9IG5ldyBMaWJlcmFsUG9saWN5Q2FyZCgpO1xyXG5cdFx0XHRjYXJkLmFuaW1hdGUgPSAoKSA9PiBBbmltYXRlLnNpbXBsZShjYXJkLCB7XHJcblx0XHRcdFx0cG9zOiBMaWJlcmFsU3BvdHMucG9zaXRpb25zW2ldLFxyXG5cdFx0XHRcdHF1YXQ6IExpYmVyYWxTcG90cy5xdWF0ZXJuaW9uLFxyXG5cdFx0XHRcdHNjYWxlOiBMaWJlcmFsU3BvdHMuc2NhbGVcclxuXHRcdFx0fSkudGhlbigoKSA9PiBBbmltYXRlLndhaXQoNTAwKSk7XHJcblx0XHRcdGNhcmQucGxheVNvdW5kID0gKCkgPT4gU0guYXVkaW8ubGliZXJhbFN0aW5nLmxvYWRlZC50aGVuKCgpID0+IFNILmF1ZGlvLmxpYmVyYWxTdGluZy5wbGF5KCkpO1xyXG5cdFx0XHR1cGRhdGVzLnB1c2goY2FyZCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGZvcih2YXIgaT10aGlzLmZhc2Npc3RDYXJkczsgaTxmYXNjaXN0UG9saWNpZXM7IGkrKyl7XHJcblx0XHRcdGxldCBjYXJkID0gbmV3IEZhc2Npc3RQb2xpY3lDYXJkKCk7XHJcblx0XHRcdGNhcmQuYW5pbWF0ZSA9ICgpID0+IEFuaW1hdGUuc2ltcGxlKGNhcmQsIHtcclxuXHRcdFx0XHRwb3M6IEZhc2Npc3RTcG90cy5wb3NpdGlvbnNbaV0sXHJcblx0XHRcdFx0cXVhdDogRmFzY2lzdFNwb3RzLnF1YXRlcm5pb24sXHJcblx0XHRcdFx0c2NhbGU6IEZhc2Npc3RTcG90cy5zY2FsZVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0Y2FyZC5wbGF5U291bmQgPSAoKSA9PiBTSC5hdWRpby5mYXNjaXN0U3RpbmcubG9hZGVkLnRoZW4oKCkgPT4gU0guYXVkaW8uZmFzY2lzdFN0aW5nLnBsYXkoKSk7XHJcblx0XHRcdHVwZGF0ZXMucHVzaChjYXJkKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZihzdGF0ZSA9PT0gJ2FmdGVybWF0aCcgJiYgaGFuZCA9PT0gMSl7XHJcblx0XHRcdHVwZGF0ZXMucHVzaCh0aGlzLnZldG9DYXJkKTtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgYW5pbWF0aW9uID0gbnVsbDtcclxuXHRcdGlmKHVwZGF0ZXMubGVuZ3RoID09PSAxKVxyXG5cdFx0e1xyXG5cdFx0XHRsZXQgY2FyZCA9IHVwZGF0ZXNbMF07XHJcblx0XHRcdGlmKGNhcmQgPT09IHRoaXMudmV0b0NhcmQpXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjYXJkLnZpc2libGUgPSB0cnVlOyBjYXJkLm1hdGVyaWFsLm9wYWNpdHkgPSAxO1xyXG5cdFx0XHRcdGFuaW1hdGlvbiA9IEFuaW1hdGUuY2FyZEZsb3VyaXNoKGNhcmQpXHJcblx0XHRcdFx0XHQudGhlbigoKSA9PiBBbmltYXRlLnZhbmlzaChjYXJkKSlcclxuXHRcdFx0XHRcdC50aGVuKCgpID0+IHsgY2FyZC52aXNpYmxlID0gZmFsc2U7IH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRoaXMuYWRkKGNhcmQpO1xyXG5cdFx0XHRcdHRoaXMuY2FyZHMucHVzaChjYXJkKTtcclxuXHRcdFx0XHRjYXJkLnBsYXlTb3VuZCgpO1xyXG5cdFx0XHRcdGFuaW1hdGlvbiA9IEFuaW1hdGUuY2FyZEZsb3VyaXNoKGNhcmQpXHJcblx0XHRcdFx0XHQudGhlbigoKSA9PiBjYXJkLmFuaW1hdGUoKSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGVsc2VcclxuXHRcdHtcclxuXHRcdFx0Ly8gcGxhY2Ugb24gdGhlaXIgc3BvdHNcclxuXHRcdFx0dXBkYXRlcy5mb3JFYWNoKGNhcmQgPT4ge1xyXG5cdFx0XHRcdHRoaXMuYWRkKGNhcmQpO1xyXG5cdFx0XHRcdHRoaXMuY2FyZHMucHVzaChjYXJkKTtcclxuXHRcdFx0XHRjYXJkLmFuaW1hdGUoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRhbmltYXRpb24gPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZihzdGF0ZSA9PT0gJ2FmdGVybWF0aCcpe1xyXG5cdFx0XHRhbmltYXRpb24udGhlbigoKSA9PiB7XHJcblx0XHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XHJcblx0XHRcdFx0XHR0eXBlOiAncG9saWN5QW5pbURvbmUnLFxyXG5cdFx0XHRcdFx0YnViYmxlczogZmFsc2VcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYobGliZXJhbFBvbGljaWVzID09PSAwICYmIGZhc2Npc3RQb2xpY2llcyA9PT0gMCl7XHJcblx0XHRcdHRoaXMuY2FyZHMuZm9yRWFjaChjID0+IHRoaXMucmVtb3ZlKGMpKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmxpYmVyYWxDYXJkcyA9IGxpYmVyYWxQb2xpY2llcztcclxuXHRcdHRoaXMuZmFzY2lzdENhcmRzID0gZmFzY2lzdFBvbGljaWVzO1xyXG5cdH1cclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuXHJcbmZ1bmN0aW9uIGdldEdhbWVJZCgpXHJcbntcclxuXHQvLyBmaXJzdCBjaGVjayB0aGUgdXJsXHJcblx0bGV0IHJlID0gL1s/Jl1nYW1lSWQ9KFteJl0rKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcclxuXHRpZihyZSl7XHJcblx0XHRyZXR1cm4gcmVbMV07XHJcblx0fVxyXG5cdGVsc2UgaWYoYWx0c3BhY2UgJiYgYWx0c3BhY2UuaW5DbGllbnQpe1xyXG5cdFx0cmV0dXJuIFNILmVudi5zaWQ7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0bGV0IGlkID0gTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwMCApO1xyXG5cdFx0d2luZG93LmxvY2F0aW9uLnJlcGxhY2UoJz9nYW1lSWQ9JytpZCk7XHJcblx0fVxyXG59XHJcblxyXG5sZXQgd2hpdGVsaXN0O1xyXG5mdW5jdGlvbiBpc0luVXNlcldoaXRlbGlzdCh1c2VySWQpXHJcbntcclxuXHRpZih3aGl0ZWxpc3QgPT09IHVuZGVmaW5lZCl7XHJcblx0XHRsZXQgcmUgPSAvWz8mXXVzZXJXaGl0ZWxpc3Q9KFteJl0rKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcclxuXHRcdGlmKHJlKVxyXG5cdFx0XHR3aGl0ZWxpc3QgPSBwYXJzZUNTVihyZVsxXSk7XHJcblx0XHRlbHNlXHJcblx0XHRcdHdoaXRlbGlzdCA9IG51bGw7XHJcblx0fVxyXG5cclxuXHRpZighd2hpdGVsaXN0KVxyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0ZWxzZVxyXG5cdFx0cmV0dXJuIHdoaXRlbGlzdC5pbmNsdWRlcyh1c2VySWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYXJzZUNTVihzdHIpe1xyXG5cdGlmKCFzdHIpIHJldHVybiBbXTtcclxuXHRlbHNlIHJldHVybiBzdHIuc3BsaXQoJywnKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVRdWVzdGlvbih0ZXh0LCB0ZXh0dXJlID0gbnVsbClcclxue1xyXG5cdGxldCBmb250U3RhY2sgPSAnXCJIZWx2ZXRpY2EgTmV1ZVwiLCBIZWx2ZXRpY2EsIEFyaWFsLCBTYW5zLVNlcmlmJztcclxuXHJcblx0Ly8gc2V0IHVwIGNhbnZhc1xyXG5cdGxldCBibXA7XHJcblx0aWYoIXRleHR1cmUpe1xyXG5cdFx0Ym1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcblx0XHRibXAud2lkdGggPSA1MTI7XHJcblx0XHRibXAuaGVpZ2h0ID0gMjU2O1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdGJtcCA9IHRleHR1cmUuaW1hZ2U7XHJcblx0fVxyXG5cclxuXHRsZXQgZyA9IGJtcC5nZXRDb250ZXh0KCcyZCcpO1xyXG5cdGcuY2xlYXJSZWN0KDAsIDAsIDUxMiwgMjU2KTtcclxuXHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG5cdGcuZmlsbFN0eWxlID0gJ2JsYWNrJztcclxuXHJcblx0Ly8gd3JpdGUgdGV4dFxyXG5cdGcuZm9udCA9ICdib2xkIDUwcHggJytmb250U3RhY2s7XHJcblx0bGV0IGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XHJcblx0Zm9yKGxldCBpPTA7IGk8bGluZXMubGVuZ3RoOyBpKyspe1xyXG5cdFx0Zy5maWxsVGV4dChsaW5lc1tpXSwgMjU2LCA1MCs1NSppKTtcclxuXHR9XHJcblxyXG5cdGlmKHRleHR1cmUpe1xyXG5cdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0XHRyZXR1cm4gdGV4dHVyZTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRyZXR1cm4gbmV3IFRIUkVFLkNhbnZhc1RleHR1cmUoYm1wKTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1lcmdlT2JqZWN0cyhhLCBiLCBkZXB0aD0yKVxyXG57XHJcblx0ZnVuY3Rpb24gdW5pcXVlKGUsIGksIGEpe1xyXG5cdFx0cmV0dXJuIGEuaW5kZXhPZihlKSA9PT0gaTtcclxuXHR9XHJcblxyXG5cdGxldCBhSXNPYmogPSBhIGluc3RhbmNlb2YgT2JqZWN0LCBiSXNPYmogPSBiIGluc3RhbmNlb2YgT2JqZWN0O1xyXG5cdGlmKGFJc09iaiAmJiBiSXNPYmogJiYgZGVwdGggPiAwKVxyXG5cdHtcclxuXHRcdGxldCByZXN1bHQgPSB7fTtcclxuXHRcdGxldCBrZXlzID0gWy4uLk9iamVjdC5rZXlzKGEpLCAuLi5PYmplY3Qua2V5cyhiKV0uZmlsdGVyKHVuaXF1ZSk7XHJcblx0XHRmb3IobGV0IGk9MDsgaTxrZXlzLmxlbmd0aDsgaSsrKXtcclxuXHRcdFx0cmVzdWx0W2tleXNbaV1dID0gbWVyZ2VPYmplY3RzKGFba2V5c1tpXV0sIGJba2V5c1tpXV0sIGRlcHRoLTEpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblx0ZWxzZSBpZihiICE9PSB1bmRlZmluZWQpXHJcblx0XHRyZXR1cm4gYjtcclxuXHRlbHNlXHJcblx0XHRyZXR1cm4gYTtcclxufVxyXG5cclxuZnVuY3Rpb24gbGF0ZVVwZGF0ZShmbilcclxue1xyXG5cdHJldHVybiAoLi4uYXJncykgPT4ge1xyXG5cdFx0c2V0VGltZW91dCgoKSA9PiBmbiguLi5hcmdzKSwgMTUpO1xyXG5cdH07XHJcbn1cclxuXHJcbmV4cG9ydCB7IGdldEdhbWVJZCwgaXNJblVzZXJXaGl0ZWxpc3QsIHBhcnNlQ1NWLCBnZW5lcmF0ZVF1ZXN0aW9uLCBtZXJnZU9iamVjdHMsIGxhdGVVcGRhdGUgfTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcclxuaW1wb3J0IHtpc0luVXNlcldoaXRlbGlzdH0gZnJvbSAnLi91dGlscyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBOYW1lcGxhdGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3Ioc2VhdClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XHJcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC42MzUsIDAuMjIpO1xyXG5cdFx0c2VhdC5hZGQodGhpcyk7XHJcblxyXG5cdFx0Ly8gYWRkIDNkIG1vZGVsXHJcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLm5hbWVwbGF0ZS5jaGlsZHJlblswXS5jbG9uZSgpO1xyXG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgTWF0aC5QSS8yKTtcclxuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XHJcblxyXG5cdFx0Ly8gZ2VuZXJhdGUgbWF0ZXJpYWxcclxuXHRcdHRoaXMuYm1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcblx0XHR0aGlzLmJtcC53aWR0aCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZTtcclxuXHRcdHRoaXMuYm1wLmhlaWdodCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAvIDI7XHJcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0bWFwOiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZSh0aGlzLmJtcClcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBsaXN0ZW5lciBwcm94aWVzXHJcblx0XHR0aGlzLl9ob3ZlckJlaGF2aW9yID0gbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJDb2xvcih7XHJcblx0XHRcdGNvbG9yOiBuZXcgVEhSRUUuQ29sb3IoMHhmZmE4YTgpXHJcblx0XHR9KTtcclxuXHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XHJcblx0XHR0aGlzLm1vZGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5jbGljay5iaW5kKHRoaXMpKTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0aWYoc3RhdGUgPT09ICdzZXR1cCcpXHJcblx0XHRcdFx0dGhpcy5tb2RlbC5hZGRCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHRoaXMubW9kZWwucmVtb3ZlQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZVRleHQodGV4dClcclxuXHR7XHJcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcclxuXHJcblx0XHQvLyBzZXQgdXAgY2FudmFzXHJcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XHJcblx0XHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XHJcblx0XHRnLmZpbGxTdHlsZSA9ICcjMjIyJztcclxuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XHJcblx0XHRnLmZvbnQgPSBgYm9sZCAke2ZvbnRTaXplfXB4ICR7Zm9udFN0YWNrfWA7XHJcblx0XHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xyXG5cdFx0Zy5maWxsVGV4dCh0ZXh0LCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMiwgKDAuNDIgLSAwLjEyKSooTmFtZXBsYXRlLnRleHR1cmVTaXplLzIpKTtcclxuXHJcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0fVxyXG5cclxuXHRjbGljayhlKVxyXG5cdHtcclxuXHRcdGlmKFNILmdhbWUuc3RhdGUgIT09ICdzZXR1cCcpIHJldHVybjtcclxuXHRcdGlmKCFpc0luVXNlcldoaXRlbGlzdChTSC5sb2NhbFVzZXIuaWQpKSByZXR1cm47XHJcblxyXG5cdFx0aWYoIXRoaXMuc2VhdC5vd25lcilcclxuXHRcdFx0dGhpcy5yZXF1ZXN0Sm9pbigpO1xyXG5cdFx0ZWxzZSBpZih0aGlzLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcclxuXHRcdFx0dGhpcy5yZXF1ZXN0TGVhdmUoKTtcclxuXHRcdGVsc2UgaWYoU0guZ2FtZS50dXJuT3JkZXIuaW5jbHVkZXMoU0gubG9jYWxVc2VyLmlkKSlcclxuXHRcdFx0dGhpcy5yZXF1ZXN0S2ljaygpO1xyXG5cdH1cclxuXHJcblx0cmVxdWVzdEpvaW4oKVxyXG5cdHtcclxuXHRcdFNILnNvY2tldC5lbWl0KCdqb2luJywgT2JqZWN0LmFzc2lnbih7c2VhdE51bTogdGhpcy5zZWF0LnNlYXROdW19LCBTSC5sb2NhbFVzZXIpKTtcclxuXHR9XHJcblxyXG5cdHJlcXVlc3RMZWF2ZSgpXHJcblx0e1xyXG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xyXG5cdFx0aWYoIXNlbGYucXVlc3Rpb24pXHJcblx0XHR7XHJcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWxmLnNlYXQuYmFsbG90LmFza1F1ZXN0aW9uKCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byBsZWF2ZT8nLCAnbG9jYWxfbGVhdmUnKVxyXG5cdFx0XHQudGhlbihjb25maXJtID0+IHtcclxuXHRcdFx0XHRpZihjb25maXJtKXtcclxuXHRcdFx0XHRcdFNILnNvY2tldC5lbWl0KCdsZWF2ZScsIFNILmxvY2FsVXNlci5pZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHNlbGYucXVlc3Rpb24gPSBudWxsO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuY2F0Y2goKCkgPT4geyBzZWxmLnF1ZXN0aW9uID0gbnVsbDsgfSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXF1ZXN0S2ljaygpXHJcblx0e1xyXG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xyXG5cdFx0aWYoIXNlbGYucXVlc3Rpb24pXHJcblx0XHR7XHJcblx0XHRcdGxldCBzZWF0ID0gU0guc2VhdHNbU0gucGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdLnNlYXROdW1dO1xyXG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VhdC5iYWxsb3QuYXNrUXVlc3Rpb24oXHJcblx0XHRcdFx0J0FyZSB5b3Ugc3VyZSB5b3VcXG53YW50IHRvIHRyeSB0byBraWNrXFxuJ1xyXG5cdFx0XHRcdCtTSC5wbGF5ZXJzW3NlbGYuc2VhdC5vd25lcl0uZGlzcGxheU5hbWUsXHJcblx0XHRcdFx0J2xvY2FsX2tpY2snXHJcblx0XHRcdClcclxuXHRcdFx0LnRoZW4oY29uZmlybSA9PiB7XHJcblx0XHRcdFx0aWYoY29uZmlybSl7XHJcblx0XHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgna2ljaycsIFNILmxvY2FsVXNlci5pZCwgc2VsZi5zZWF0Lm93bmVyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5jYXRjaCgoKSA9PiB7IHNlbGYucXVlc3Rpb24gPSBudWxsOyB9KTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbk5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSA9IDI1NjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0ICogYXMgQmFsbG90VHlwZSBmcm9tICcuL2JhbGxvdCc7XHJcbmltcG9ydCB7dHJhbnNsYXRlIGFzIHRyfSBmcm9tICcuL3RoZW1lJztcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVZvdGVzSW5Qcm9ncmVzcyh7ZGF0YToge2dhbWUsIHBsYXllcnMsIHZvdGVzfX0pXHJcbntcclxuXHRsZXQgYmFsbG90ID0gdGhpcztcclxuXHRpZighYmFsbG90LnNlYXQub3duZXIpIHJldHVybjtcclxuXHJcblx0bGV0IHZpcHMgPSBnYW1lLnZvdGVzSW5Qcm9ncmVzcztcclxuXHJcblx0Ly8gdm90ZXMgdGhlIHNlYXQgb3duZXIgY2Fubm90IHBhcnRpY2lwYXRlIGluIChhbHJlYWR5IHZvdGVkIG9yIGJsb2NrZWQpXHJcblx0bGV0IGJsYWNrbGlzdGVkVm90ZXMgPSB2aXBzLmZpbHRlcihpZCA9PiB7XHJcblx0XHRsZXQgdnMgPSBbLi4udm90ZXNbaWRdLnllc1ZvdGVycywgLi4udm90ZXNbaWRdLm5vVm90ZXJzXTtcclxuXHRcdGxldCBudiA9IHZvdGVzW2lkXS5ub25Wb3RlcnM7XHJcblx0XHRyZXR1cm4gbnYuaW5jbHVkZXMoYmFsbG90LnNlYXQub3duZXIpIHx8IHZzLmluY2x1ZGVzKGJhbGxvdC5zZWF0Lm93bmVyKTtcclxuXHR9KTtcclxuXHJcblx0Ly8gdm90ZXMgYWRkZWQgdGhpcyB1cGRhdGUgdGhhdCB0aGUgc2VhdGVkIHVzZXIgaXMgZWxpZ2libGUgZm9yXHJcblx0bGV0IG5ld1ZvdGVzID0gdmlwcy5maWx0ZXIoXHJcblx0XHRpZCA9PiAoIVNILmdhbWUudm90ZXNJblByb2dyZXNzIHx8ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcy5pbmNsdWRlcyhpZCkpICYmICFibGFja2xpc3RlZFZvdGVzLmluY2x1ZGVzKGlkKVxyXG5cdCk7XHJcblxyXG5cdC8vIHZvdGVzIGFscmVhZHkgcGFydGljaXBhdGVkIGluLCBwbHVzIGNvbXBsZXRlZCB2b3Rlc1xyXG5cdGxldCBmaW5pc2hlZFZvdGVzID0gIVNILmdhbWUudm90ZXNJblByb2dyZXNzID8gYmxhY2tsaXN0ZWRWb3Rlc1xyXG5cdFx0OiBTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcy5maWx0ZXIoaWQgPT4gIXZpcHMuaW5jbHVkZXMoaWQpKS5jb25jYXQoYmxhY2tsaXN0ZWRWb3Rlcyk7XHJcblxyXG5cdG5ld1ZvdGVzLmZvckVhY2godklkID0+XHJcblx0e1xyXG5cdFx0Ly8gZ2VuZXJhdGUgbmV3IHF1ZXN0aW9uIHRvIGFza1xyXG5cdFx0bGV0IHF1ZXN0aW9uVGV4dCwgb3B0cyA9IHt9O1xyXG5cdFx0aWYodm90ZXNbdklkXS50eXBlID09PSAnZWxlY3QnKXtcclxuXHRcdFx0cXVlc3Rpb25UZXh0ID0gcGxheWVyc1tnYW1lLnByZXNpZGVudF0uZGlzcGxheU5hbWVcclxuXHRcdFx0XHQrIGAgZm9yICR7dHIoJ3ByZXNpZGVudCcpfSBhbmQgYFxyXG5cdFx0XHRcdCsgcGxheWVyc1tnYW1lLmNoYW5jZWxsb3JdLmRpc3BsYXlOYW1lXHJcblx0XHRcdFx0KyBgIGZvciAke3RyKCdjaGFuY2VsbG9yJyl9P2A7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2pvaW4nKXtcclxuXHRcdFx0cXVlc3Rpb25UZXh0ID0gdm90ZXNbdklkXS5kYXRhICsgJyB0byBqb2luPyc7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2tpY2snKXtcclxuXHRcdFx0cXVlc3Rpb25UZXh0ID0gJ1ZvdGUgdG8ga2ljayAnXHJcblx0XHRcdFx0KyBwbGF5ZXJzW3ZvdGVzW3ZJZF0udGFyZ2V0MV0uZGlzcGxheU5hbWVcclxuXHRcdFx0XHQrICc/JztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAndHV0b3JpYWwnKXtcclxuXHRcdFx0cXVlc3Rpb25UZXh0ID0gJ1BsYXkgdHV0b3JpYWw/JztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAnY29uZmlybVJvbGUnKVxyXG5cdFx0e1xyXG5cdFx0XHRvcHRzLmNob2ljZXMgPSBCYWxsb3RUeXBlLkNPTkZJUk07XHJcblx0XHRcdGxldCByb2xlO1xyXG5cdFx0XHRpZihiYWxsb3Quc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKXtcclxuXHRcdFx0XHRyb2xlID0gcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdLnJvbGU7XHJcblx0XHRcdFx0cm9sZSA9IHRyKHJvbGUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyByb2xlLnNsaWNlKDEpKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRyb2xlID0gJzxSRURBQ1RFRD4nO1xyXG5cdFx0XHR9XHJcblx0XHRcdHF1ZXN0aW9uVGV4dCA9ICdZb3VyIHJvbGU6XFxuJyArIHJvbGU7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYocXVlc3Rpb25UZXh0KVxyXG5cdFx0e1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24ocXVlc3Rpb25UZXh0LCB2SWQsIG9wdHMpXHJcblx0XHRcdC50aGVuKGFuc3dlciA9PiB7XHJcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ3ZvdGUnLCB2SWQsIFNILmxvY2FsVXNlci5pZCwgYW5zd2VyKTtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmNhdGNoKCgpID0+IGNvbnNvbGUubG9nKCdWb3RlIHNjcnViYmVkOicsIHZJZCkpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRpZihmaW5pc2hlZFZvdGVzLmluY2x1ZGVzKGJhbGxvdC5kaXNwbGF5ZWQpKXtcclxuXHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVTdGF0ZSh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcclxue1xyXG5cdGxldCBiYWxsb3QgPSB0aGlzO1xyXG5cclxuXHRmdW5jdGlvbiBjaG9vc2VQbGF5ZXIocXVlc3Rpb24sIGNvbmZpcm1RdWVzdGlvbiwgaWQpXHJcblx0e1xyXG5cdFx0ZnVuY3Rpb24gY29uZmlybVBsYXllcih1c2VySWQpXHJcblx0XHR7XHJcblx0XHRcdGxldCB1c2VybmFtZSA9IFNILnBsYXllcnNbdXNlcklkXS5kaXNwbGF5TmFtZTtcclxuXHRcdFx0bGV0IHRleHQgPSBjb25maXJtUXVlc3Rpb24ucmVwbGFjZSgne30nLCB1c2VybmFtZSk7XHJcblx0XHRcdHJldHVybiBiYWxsb3QuYXNrUXVlc3Rpb24odGV4dCwgJ2xvY2FsXycraWQrJ19jb25maXJtJylcclxuXHRcdFx0LnRoZW4oY29uZmlybWVkID0+IHtcclxuXHRcdFx0XHRpZihjb25maXJtZWQpe1xyXG5cdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh1c2VySWQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdHJldHVybiBjaG9vc2VQbGF5ZXIocXVlc3Rpb24sIGNvbmZpcm1RdWVzdGlvbiwgaWQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGJhbGxvdC5hc2tRdWVzdGlvbihxdWVzdGlvbiwgJ2xvY2FsXycraWQsIHtjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVH0pXHJcblx0XHQudGhlbihjb25maXJtUGxheWVyKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGhpZGVOb21pbmF0ZVBsYWNlaG9sZGVyKHtkYXRhOiB7Z2FtZX19KVxyXG5cdHtcclxuXHRcdGlmKGdhbWUuc3RhdGUgIT09ICdub21pbmF0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2NoYW5jZWxsb3InKXtcclxuXHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdH1cclxuXHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVOb21pbmF0ZVBsYWNlaG9sZGVyKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGhpZGVQb2xpY3lQbGFjZWhvbGRlcih7ZGF0YToge2dhbWV9fSlcclxuXHR7XHJcblx0XHRpZihnYW1lLnN0YXRlICE9PSAncG9saWN5MScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ2xvY2FsX3BvbGljeTEnIHx8XHJcblx0XHRcdGdhbWUuc3RhdGUgIT09ICdwb2xpY3kyJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcG9saWN5MidcclxuXHRcdCl7XHJcblx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XHJcblx0XHR9XHJcblx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlUG9saWN5UGxhY2Vob2xkZXIpO1xyXG5cdH1cclxuXHJcblx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdGNob29zZVBsYXllcihgQ2hvb3NlIHlvdXIgJHt0cignY2hhbmNlbGxvcicpfSFgLCBgTmFtZSB7fSBhcyAke3RyKCdjaGFuY2VsbG9yJyl9P2AsICdub21pbmF0ZScpXHJcblx0XHRcdC50aGVuKHVzZXJJZCA9PiB7XHJcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ25vbWluYXRlJywgdXNlcklkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKGBDaG9vc2UgeW91ciAke3RyKCdjaGFuY2VsbG9yJyl9IWAsICd3YWl0X2Zvcl9jaGFuY2VsbG9yJywge1xyXG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxyXG5cdFx0XHRcdGZha2U6IHRydWUsXHJcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAnbm9taW5hdGUnXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlTm9taW5hdGVQbGFjZWhvbGRlcik7XHJcblx0XHR9XHJcblx0fVxyXG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTEnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcclxuXHR7XHJcblx0XHRsZXQgb3B0cyA9IHtjaG9pY2VzOiBCYWxsb3RUeXBlLlBPTElDWSwgcG9saWN5SGFuZDogZ2FtZS5oYW5kfTtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCAhPT0gZ2FtZS5wcmVzaWRlbnQpe1xyXG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwb2xpY3kxJ30pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQ2hvb3NlIG9uZVxcbnRvIGRpc2NhcmQhJywgJ2xvY2FsX3BvbGljeTEnLCBvcHRzKVxyXG5cdFx0LnRoZW4oZGlzY2FyZCA9PiB7XHJcblx0XHRcdFNILnNvY2tldC5lbWl0KCdkaXNjYXJkX3BvbGljeTEnLCBkaXNjYXJkKTtcclxuXHRcdH0pO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZVBvbGljeVBsYWNlaG9sZGVyKTtcclxuXHR9XHJcblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncG9saWN5MicgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUuY2hhbmNlbGxvcilcclxuXHR7XHJcblx0XHRsZXQgb3B0cyA9IHtcclxuXHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QT0xJQ1ksXHJcblx0XHRcdHBvbGljeUhhbmQ6IGdhbWUuaGFuZCxcclxuXHRcdFx0aW5jbHVkZVZldG86IGdhbWUuZmFzY2lzdFBvbGljaWVzID09PSA1ICYmICFiYWxsb3QuYmxvY2tWZXRvXHJcblx0XHR9O1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkICE9PSBnYW1lLmNoYW5jZWxsb3Ipe1xyXG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwb2xpY3kyJ30pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQ2hvb3NlIG9uZVxcbnRvIGRpc2NhcmQhJywgJ2xvY2FsX3BvbGljeTInLCBvcHRzKVxyXG5cdFx0LnRoZW4oZGlzY2FyZCA9PiB7XHJcblx0XHRcdFNILnNvY2tldC5lbWl0KCdkaXNjYXJkX3BvbGljeTInLCBkaXNjYXJkKTtcclxuXHRcdH0sIGVyciA9PiBjb25zb2xlLmVycm9yKGVycikpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZVBvbGljeVBsYWNlaG9sZGVyKTtcclxuXHR9XHJcblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnaW52ZXN0aWdhdGUnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcclxuXHRcdFx0Y2hvb3NlUGxheWVyKCdFeGVjdXRpdmUgcG93ZXI6IENob29zZSBvbmUgcGxheWVyIHRvIGludmVzdGlnYXRlIScsICdJbnZlc3RpZ2F0ZSB7fT8nLCAnaW52ZXN0aWdhdGUnKVxyXG5cdFx0XHQudGhlbih1c2VySWQgPT4ge1xyXG5cdFx0XHRcdFNILmRpc3BhdGNoRXZlbnQoe1xyXG5cdFx0XHRcdFx0dHlwZTogJ2ludmVzdGlnYXRlJyxcclxuXHRcdFx0XHRcdGRhdGE6IHVzZXJJZFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIG9uZSBwbGF5ZXIgdG8gaW52ZXN0aWdhdGUhJywgJ3dhaXRfZm9yX2ludmVzdGlnYXRlJywge1xyXG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxyXG5cdFx0XHRcdGZha2U6IHRydWUsXHJcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAnaW52ZXN0aWdhdGUnXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XHJcblx0XHRcdFx0aWYoc3RhdGUgIT09ICdpbnZlc3RpZ2F0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2ludmVzdGlnYXRlJylcclxuXHRcdFx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XHJcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcclxuXHRcdFx0fTtcclxuXHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcclxuXHRcdH1cclxuXHR9XHJcblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncGVlaycgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxyXG5cdHtcclxuXHRcdGxldCBvcHRzID0ge2Nob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLCBwb2xpY3lIYW5kOiA4IHwgKGdhbWUuZGVjayY3KX07XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgIT09IGdhbWUucHJlc2lkZW50KXtcclxuXHRcdFx0T2JqZWN0LmFzc2lnbihvcHRzLCB7ZmFrZTogdHJ1ZSwgaXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAncGVlayd9KTtcclxuXHRcdH1cclxuXHJcblx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0V4ZWN1dGl2ZSBwb3dlcjogVG9wIG9mIHBvbGljeSBkZWNrJywgJ2xvY2FsX3BlZWsnLCBvcHRzKVxyXG5cdFx0LnRoZW4oZGlzY2FyZCA9PiB7XHJcblx0XHRcdFNILnNvY2tldC5lbWl0KCdjb250aW51ZScpO1xyXG5cdFx0fSk7XHJcblx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XHJcblx0XHRcdGlmKHN0YXRlICE9PSAncGVlaycgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ2xvY2FsX3BlZWsnKVxyXG5cdFx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XHJcblx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XHJcblx0XHR9O1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcclxuXHR9XHJcblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnbmFtZVN1Y2Nlc3NvcicgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxyXG5cdHtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xyXG5cdFx0XHRjaG9vc2VQbGF5ZXIoYEV4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIHRoZSBuZXh0ICR7dHIoJ3ByZXNpZGVudCcpfSFgLCBge30gZm9yICR7dHIoJ3ByZXNpZGVudCcpfT9gLCAnbmFtZVN1Y2Nlc3NvcicpXHJcblx0XHRcdC50aGVuKHVzZXJJZCA9PiB7XHJcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ25hbWVfc3VjY2Vzc29yJywgdXNlcklkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKGBFeGVjdXRpdmUgcG93ZXI6IENob29zZSB0aGUgbmV4dCAke3RyKCdwcmVzaWRlbnQnKX0hYCwgJ3dhaXRfZm9yX3N1Y2Nlc3NvcicsIHtcclxuXHRcdFx0XHRjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCxcclxuXHRcdFx0XHRmYWtlOiB0cnVlLFxyXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ25hbWVTdWNjZXNzb3InXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XHJcblx0XHRcdFx0aWYoc3RhdGUgIT09ICduYW1lU3VjY2Vzc29yJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3Jfc3VjY2Vzc29yJylcclxuXHRcdFx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XHJcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcclxuXHRcdFx0fTtcclxuXHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcclxuXHRcdH1cclxuXHR9XHJcblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnZXhlY3V0ZScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxyXG5cdHtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xyXG5cdFx0XHRjaG9vc2VQbGF5ZXIoJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIGEgcGxheWVyIHRvIGV4ZWN1dGUhJywgJ0V4ZWN1dGUge30/JywgJ2V4ZWN1dGUnKVxyXG5cdFx0XHQudGhlbih1c2VySWQgPT4ge1xyXG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCdleGVjdXRlJywgdXNlcklkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdFeGVjdXRpdmUgcG93ZXI6IENob29zZSBhIHBsYXllciB0byBleGVjdXRlIScsICd3YWl0X2Zvcl9leGVjdXRlJywge1xyXG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxyXG5cdFx0XHRcdGZha2U6IHRydWUsXHJcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAnZXhlY3V0ZSdcclxuXHRcdFx0fSk7XHJcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0XHRpZihzdGF0ZSAhPT0gJ2V4ZWN1dGUnICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICd3YWl0X2Zvcl9leGVjdXRlJylcclxuXHRcdFx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XHJcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcclxuXHRcdFx0fTtcclxuXHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcclxuXHRcdH1cclxuXHR9XHJcblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAndmV0bycgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxyXG5cdHtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0FwcHJvdmUgdmV0bz8nLCAnbG9jYWxfdmV0bycpLnRoZW4oYXBwcm92ZWQgPT4ge1xyXG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCdjb25maXJtX3ZldG8nLCBhcHByb3ZlZCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQXBwcm92ZSB2ZXRvPycsICd3YWl0X2Zvcl92ZXRvJywge1xyXG5cdFx0XHRcdGZha2U6IHRydWUsXHJcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAndmV0bydcclxuXHRcdFx0fSk7XHJcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0XHRpZihzdGF0ZSAhPT0gJ3ZldG8nICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICd3YWl0X2Zvcl92ZXRvJylcclxuXHRcdFx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XHJcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICd2ZXRvJyl7XHJcblx0XHRiYWxsb3QuYmxvY2tWZXRvID0gdHJ1ZTtcclxuXHR9XHJcblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnYWZ0ZXJtYXRoJyl7XHJcblx0XHRiYWxsb3QuYmxvY2tWZXRvID0gZmFsc2U7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQge3VwZGF0ZVZvdGVzSW5Qcm9ncmVzcywgdXBkYXRlU3RhdGV9OyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbi8qXHJcbiogRGVja3MgaGF2ZSAxNyBjYXJkczogNiBsaWJlcmFsLCAxMSBmYXNjaXN0LlxyXG4qIEluIGJpdC1wYWNrZWQgYm9vbGVhbiBhcnJheXMsIDEgaXMgbGliZXJhbCwgMCBpcyBmYXNjaXN0LlxyXG4qIFRoZSBtb3N0IHNpZ25pZmljYW50IGJpdCBpcyBhbHdheXMgMS5cclxuKiBFLmcuIDBiMTAxMDAxIHJlcHJlc2VudHMgYSBkZWNrIHdpdGggMiBsaWJlcmFsIGFuZCAzIGZhc2Npc3QgY2FyZHNcclxuKi9cclxuXHJcbmxldCBGVUxMX0RFQ0sgPSAweDIwMDNmLFxyXG5cdEZBU0NJU1QgPSAwLFxyXG5cdExJQkVSQUwgPSAxO1xyXG5cclxubGV0IHBvc2l0aW9ucyA9IFtcclxuXHQweDEsIDB4MiwgMHg0LCAweDgsXHJcblx0MHgxMCwgMHgyMCwgMHg0MCwgMHg4MCxcclxuXHQweDEwMCwgMHgyMDAsIDB4NDAwLCAweDgwMCxcclxuXHQweDEwMDAsIDB4MjAwMCwgMHg0MDAwLCAweDgwMDAsXHJcblx0MHgxMDAwMCwgMHgyMDAwMCwgMHg0MDAwMFxyXG5dO1xyXG5cclxuZnVuY3Rpb24gbGVuZ3RoKGRlY2spXHJcbntcclxuXHRyZXR1cm4gcG9zaXRpb25zLmZpbmRJbmRleChzID0+IHMgPiBkZWNrKSAtMTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2h1ZmZsZShkZWNrKVxyXG57XHJcblx0bGV0IGwgPSBsZW5ndGgoZGVjayk7XHJcblx0Zm9yKGxldCBpPWwtMTsgaT4wOyBpLS0pXHJcblx0e1xyXG5cdFx0bGV0IG8gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBpKTtcclxuXHRcdGxldCBpVmFsID0gZGVjayAmIDEgPDwgaSwgb1ZhbCA9IGRlY2sgJiAxIDw8IG87XHJcblx0XHRsZXQgc3dhcHBlZCA9IGlWYWwgPj4+IGktbyB8IG9WYWwgPDwgaS1vO1xyXG5cdFx0ZGVjayA9IGRlY2sgLSBpVmFsIC0gb1ZhbCArIHN3YXBwZWQ7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gZGVjaztcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd1RocmVlKGQpXHJcbntcclxuXHRyZXR1cm4gZCA8IDggPyBbMSwgZF0gOiBbZCA+Pj4gMywgOCB8IGQgJiA3XTtcclxufVxyXG5cclxuZnVuY3Rpb24gZGlzY2FyZE9uZShkZWNrLCBwb3MpXHJcbntcclxuXHRsZXQgYm90dG9tSGFsZiA9IGRlY2sgJiAoMSA8PCBwb3MpLTE7XHJcblx0bGV0IHRvcEhhbGYgPSBkZWNrICYgfigoMSA8PCBwb3MrMSktMSk7XHJcblx0dG9wSGFsZiA+Pj49IDE7XHJcblx0bGV0IG5ld0RlY2sgPSB0b3BIYWxmIHwgYm90dG9tSGFsZjtcclxuXHRcclxuXHRsZXQgdmFsID0gKGRlY2sgJiAxPDxwb3MpID4+PiBwb3M7XHJcblxyXG5cdHJldHVybiBbbmV3RGVjaywgdmFsXTtcclxufVxyXG5cclxuZnVuY3Rpb24gYXBwZW5kKGRlY2ssIHZhbClcclxue1xyXG5cdHJldHVybiBkZWNrIDw8IDEgfCB2YWw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRvQXJyYXkoZGVjaylcclxue1xyXG5cdGxldCBhcnIgPSBbXTtcclxuXHR3aGlsZShkZWNrID4gMSl7XHJcblx0XHRhcnIucHVzaChkZWNrICYgMSk7XHJcblx0XHRkZWNrID4+Pj0gMTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBhcnI7XHJcbn1cclxuXHJcbmV4cG9ydCB7bGVuZ3RoLCBzaHVmZmxlLCBkcmF3VGhyZWUsIGRpc2NhcmRPbmUsIGFwcGVuZCwgdG9BcnJheSwgRlVMTF9ERUNLLCBMSUJFUkFMLCBGQVNDSVNUfTsiLCIndXNlIHN0cmljdDsnXHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQgeyBCbGFua0NhcmQsIEphQ2FyZCwgTmVpbkNhcmQsIEZhc2Npc3RQb2xpY3lDYXJkLCBMaWJlcmFsUG9saWN5Q2FyZCwgVmV0b0NhcmQgfSBmcm9tICcuL2NhcmQnO1xyXG5pbXBvcnQgeyBnZW5lcmF0ZVF1ZXN0aW9uLCBsYXRlVXBkYXRlIH0gZnJvbSAnLi91dGlscyc7XHJcbmltcG9ydCAqIGFzIEJQIGZyb20gJy4vYmFsbG90cHJvY2Vzc29yJztcclxuaW1wb3J0ICogYXMgQlBCQSBmcm9tICcuL2JwYmEnO1xyXG5pbXBvcnQge05UZXh0LCBQbGFjZWhvbGRlck1lc2h9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XHJcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XHJcblxyXG5sZXQgUExBWUVSU0VMRUNUID0gMDtcclxubGV0IENPTkZJUk0gPSAxO1xyXG5sZXQgQklOQVJZID0gMjtcclxubGV0IFBPTElDWSA9IDM7XHJcblxyXG5jbGFzcyBCYWxsb3QgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3Ioc2VhdClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC0wLjMsIDAuMjUpO1xyXG5cdFx0dGhpcy5yb3RhdGlvbi5zZXQoLjUsIE1hdGguUEksIDApO1xyXG5cdFx0c2VhdC5hZGQodGhpcyk7XHJcblxyXG5cdFx0dGhpcy5sYXN0UXVldWVkID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblx0XHR0aGlzLmRpc3BsYXllZCA9IG51bGw7XHJcblx0XHR0aGlzLmJsb2NrVmV0byA9IGZhbHNlO1xyXG5cclxuXHRcdHRoaXMuX3llc0NsaWNrSGFuZGxlciA9IG51bGw7XHJcblx0XHR0aGlzLl9ub0NsaWNrSGFuZGxlciA9IG51bGw7XHJcblx0XHR0aGlzLl9ub21pbmF0ZUhhbmRsZXIgPSBudWxsO1xyXG5cdFx0dGhpcy5fY2FuY2VsSGFuZGxlciA9IG51bGw7XHJcblxyXG5cdFx0dGhpcy5qYUNhcmQgPSBuZXcgSmFDYXJkKCk7XHJcblx0XHR0aGlzLm5laW5DYXJkID0gbmV3IE5laW5DYXJkKCk7XHJcblx0XHRbdGhpcy5qYUNhcmQsIHRoaXMubmVpbkNhcmRdLmZvckVhY2goYyA9PiB7XHJcblx0XHRcdGMucG9zaXRpb24uc2V0KGMgaW5zdGFuY2VvZiBKYUNhcmQgPyAtMC4xIDogMC4xLCAtMC4xLCAwKTtcclxuXHRcdFx0Yy5zY2FsZS5zZXRTY2FsYXIoMC4xNSk7XHJcblx0XHRcdGMudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmFkZCh0aGlzLmphQ2FyZCwgdGhpcy5uZWluQ2FyZCk7XHJcblx0XHR0aGlzLnBvbGljaWVzID0gW107XHJcblxyXG5cdFx0Ly9sZXQgZ2VvID0gbmV3IFRIUkVFLlBsYW5lQnVmZmVyR2VvbWV0cnkoMC40LCAwLjIpO1xyXG5cdFx0Ly9sZXQgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHt0cmFuc3BhcmVudDogdHJ1ZSwgc2lkZTogVEhSRUUuRG91YmxlU2lkZX0pO1xyXG5cdFx0dGhpcy5xdWVzdGlvbiA9IFBsYWNlaG9sZGVyTWVzaC5jbG9uZSgpO1xyXG5cdFx0dGhpcy5xdWVzdGlvbi5wb3NpdGlvbi5zZXQoMCwgMC4xLCAwKTtcclxuXHRcdHRoaXMucXVlc3Rpb24uc2NhbGUuc2V0U2NhbGFyKC41KTtcclxuXHRcdHRoaXMucXVlc3Rpb24udmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5xdWVzdGlvbik7XHJcblxyXG5cdFx0dGhpcy5iYWNrcGxhdGUgPSBuZXcgVEhSRUUuTWVzaChcclxuXHRcdFx0bmV3IFRIUkVFLlBsYW5lQnVmZmVyR2VvbWV0cnkoMS4xLCAuNCksXHJcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7dHJhbnNwYXJlbnQ6IHRydWUsIG9wYWNpdHk6IDAuMjUsIHNpZGU6IFRIUkVFLkRvdWJsZVNpZGV9KVxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYmFja3BsYXRlLnBvc2l0aW9uLnNldCgwLDAsLS4wMSk7XHJcblx0XHR0aGlzLmJhY2twbGF0ZS52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLnF1ZXN0aW9uLmFkZCh0aGlzLmJhY2twbGF0ZSk7XHJcblxyXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50ID0gbmV3IE5UZXh0KHRoaXMucXVlc3Rpb24pO1xyXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7d2lkdGg6IDEuMSwgaGVpZ2h0OiAuNCwgZm9udFNpemU6IDF9KTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdm90ZXNJblByb2dyZXNzJywgQlAudXBkYXRlVm90ZXNJblByb2dyZXNzLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgbGF0ZVVwZGF0ZShCUC51cGRhdGVTdGF0ZS5iaW5kKHRoaXMpKSk7XHJcblx0fVxyXG5cclxuXHRhc2tRdWVzdGlvbihxVGV4dCwgaWQsIHtjaG9pY2VzID0gQklOQVJZLCBwb2xpY3lIYW5kID0gMHgxLCBpbmNsdWRlVmV0byA9IGZhbHNlLCBmYWtlID0gZmFsc2UsIGlzSW52YWxpZCA9ICgpID0+IHRydWV9ID0ge30pXHJcblx0e1xyXG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xyXG5cclxuXHRcdGZ1bmN0aW9uIGlzVm90ZVZhbGlkKClcclxuXHRcdHtcclxuXHRcdFx0bGV0IGlzRmFrZVZhbGlkID0gZmFrZSAmJiAhaXNJbnZhbGlkKCk7XHJcblx0XHRcdGxldCBpc0xvY2FsVm90ZSA9IC9ebG9jYWwvLnRlc3QoaWQpO1xyXG5cdFx0XHRsZXQgaXNGaXJzdFVwZGF0ZSA9ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcztcclxuXHRcdFx0bGV0IHZvdGUgPSBTSC52b3Rlc1tpZF07XHJcblx0XHRcdGxldCB2b3RlcnMgPSB2b3RlID8gWy4uLnZvdGUueWVzVm90ZXJzLCAuLi52b3RlLm5vVm90ZXJzXSA6IFtdO1xyXG5cdFx0XHRsZXQgYWxyZWFkeVZvdGVkID0gdm90ZXJzLmluY2x1ZGVzKHNlbGYuc2VhdC5vd25lcik7XHJcblx0XHRcdHJldHVybiBpc0xvY2FsVm90ZSB8fCBpc0ZpcnN0VXBkYXRlIHx8IGlzRmFrZVZhbGlkIHx8IHZvdGUgJiYgIWFscmVhZHlWb3RlZDtcclxuXHRcdH1cclxuXHJcblx0XHRmdW5jdGlvbiBob29rVXBRdWVzdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UocXVlc3Rpb25FeGVjdXRvcik7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gcXVlc3Rpb25FeGVjdXRvcihyZXNvbHZlLCByZWplY3QpXHJcblx0XHR7XHJcblx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgYW5zd2VyIGlzIHN0aWxsIHJlbGV2YW50XHJcblx0XHRcdGlmKCFpc1ZvdGVWYWxpZCgpKXtcclxuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KCdWb3RlIG5vIGxvbmdlciB2YWxpZCcpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzaG93IHRoZSBiYWxsb3RcclxuXHRcdFx0Ly9zZWxmLnF1ZXN0aW9uLm1hdGVyaWFsLm1hcCA9IGdlbmVyYXRlUXVlc3Rpb24ocVRleHQsIHNlbGYucXVlc3Rpb24ubWF0ZXJpYWwubWFwKTtcclxuXHRcdFx0c2VsZi50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDogcVRleHR9KTtcclxuXHRcdFx0c2VsZi5xdWVzdGlvbi52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0c2VsZi5iYWNrcGxhdGUudmlzaWJsZSA9IHRydWU7XHJcblxyXG5cdFx0XHQvLyBob29rIHVwIHEvYSBjYXJkc1xyXG5cdFx0XHRpZihjaG9pY2VzID09PSBDT05GSVJNIHx8IGNob2ljZXMgPT09IEJJTkFSWSl7XHJcblx0XHRcdFx0c2VsZi5qYUNhcmQudmlzaWJsZSA9IHRydWU7XHJcblx0XHRcdFx0aWYoIWZha2Upe1xyXG5cdFx0XHRcdFx0c2VsZi5qYUNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKCd5ZXMnLCByZXNvbHZlLCByZWplY3QpKTtcclxuXHRcdFx0XHRcdGlmKHNlbGYuc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxyXG5cdFx0XHRcdFx0XHRzZWxmLmphQ2FyZC5hZGRCZWhhdmlvciggbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJTY2FsZSgpICk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Ugc2VsZi5qYUNhcmQudmlzaWJsZSA9IGZhbHNlO1xyXG5cclxuXHRcdFx0aWYoY2hvaWNlcyA9PT0gQklOQVJZKXtcclxuXHRcdFx0XHRzZWxmLm5laW5DYXJkLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRcdGlmKCFmYWtlKXtcclxuXHRcdFx0XHRcdHNlbGYubmVpbkNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKCdubycsIHJlc29sdmUsIHJlamVjdCkpO1xyXG5cdFx0XHRcdFx0aWYoc2VsZi5zZWF0Lm93bmVyID09PSBTSC5sb2NhbFVzZXIuaWQpXHJcblx0XHRcdFx0XHRcdHNlbGYubmVpbkNhcmQuYWRkQmVoYXZpb3IoIG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLkhvdmVyU2NhbGUoKSApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHNlbGYubmVpbkNhcmQudmlzaWJsZSA9IGZhbHNlO1xyXG5cclxuXHRcdFx0aWYoY2hvaWNlcyA9PT0gUExBWUVSU0VMRUNUICYmICFmYWtlKXtcclxuXHRcdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdwbGF5ZXJTZWxlY3QnLCByZXNwb25kKCdwbGF5ZXInLCByZXNvbHZlLCByZWplY3QpKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmKGNob2ljZXMgPT09IFBPTElDWSl7XHJcblx0XHRcdFx0bGV0IGNhcmRzID0gQlBCQS50b0FycmF5KHBvbGljeUhhbmQpO1xyXG5cdFx0XHRcdGlmKGluY2x1ZGVWZXRvKSBjYXJkcy5wdXNoKC0xKTtcclxuXHRcdFx0XHRjYXJkcy5mb3JFYWNoKCh2YWwsIGksIGFycikgPT5cclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRsZXQgY2FyZCA9IG51bGw7XHJcblx0XHRcdFx0XHRpZihmYWtlKVxyXG5cdFx0XHRcdFx0XHRjYXJkID0gbmV3IEJsYW5rQ2FyZCgpO1xyXG5cdFx0XHRcdFx0ZWxzZSBpZih2YWwgPT09IC0xKVxyXG5cdFx0XHRcdFx0XHRjYXJkID0gbmV3IFZldG9DYXJkKCk7XHJcblx0XHRcdFx0XHRlbHNlIGlmKHZhbCA9PT0gQlBCQS5MSUJFUkFMKVxyXG5cdFx0XHRcdFx0XHRjYXJkID0gbmV3IExpYmVyYWxQb2xpY3lDYXJkKCk7XHJcblx0XHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgRmFzY2lzdFBvbGljeUNhcmQoKTtcclxuXHJcblx0XHRcdFx0XHRjYXJkLnNjYWxlLnNldFNjYWxhcigwLjE1KTtcclxuXHJcblx0XHRcdFx0XHRsZXQgd2lkdGggPSAuMTUgKiBhcnIubGVuZ3RoO1xyXG5cdFx0XHRcdFx0bGV0IHggPSAtd2lkdGgvMiArIC4xNSppICsgLjA3NTtcclxuXHRcdFx0XHRcdGNhcmQucG9zaXRpb24uc2V0KHgsIC0wLjA3LCAwKTtcclxuXHRcdFx0XHRcdHNlbGYuYWRkKGNhcmQpO1xyXG5cdFx0XHRcdFx0c2VsZi5wb2xpY2llcy5wdXNoKGNhcmQpO1xyXG5cclxuXHRcdFx0XHRcdGlmKCFmYWtlKXtcclxuXHRcdFx0XHRcdFx0Y2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQodmFsID09PSAtMSA/IC0xIDogaSwgcmVzb2x2ZSwgcmVqZWN0KSk7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRpZihzZWxmLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcclxuXHRcdFx0XHRcdFx0XHRjYXJkLmFkZEJlaGF2aW9yKCBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlclNjYWxlKCkgKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c2VsZi5hZGRFdmVudExpc3RlbmVyKCdjYW5jZWxWb3RlJywgcmVzcG9uZCgnY2FuY2VsJywgcmVzb2x2ZSwgcmVqZWN0KSk7XHJcblxyXG5cdFx0XHRpZihzZWxmLl9vdXR0cm9BbmltKXtcclxuXHRcdFx0XHRjbGVhclRpbWVvdXQoc2VsZi5fb3V0dHJvQW5pbSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmKCFzZWxmLmRpc3BsYXllZClcclxuXHRcdFx0XHRBbmltYXRlLnN3aW5nSW4oc2VsZiwgTWF0aC5QSS8yLS41LCAuNDEsIDgwMCk7XHJcblxyXG5cdFx0XHRzZWxmLmRpc3BsYXllZCA9IGlkO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHJlc3BvbmQoYW5zd2VyLCByZXNvbHZlLCByZWplY3QpXHJcblx0XHR7XHJcblx0XHRcdGZ1bmN0aW9uIGhhbmRsZXIoZXZ0KVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Ly8gbWFrZSBzdXJlIG9ubHkgdGhlIG93bmVyIG9mIHRoZSBiYWxsb3QgaXMgYW5zd2VyaW5nXHJcblx0XHRcdFx0aWYoYW5zd2VyICE9PSAnY2FuY2VsJyAmJiBzZWxmLnNlYXQub3duZXIgIT09IFNILmxvY2FsVXNlci5pZCkgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHQvLyBjbGVhbiB1cFxyXG5cdFx0XHRcdHNlbGYuX291dHRyb0FuaW0gPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdEFuaW1hdGUuc3dpbmdPdXQoc2VsZiwgTWF0aC5QSS8yLS41LCAuNDEsIDMwMClcclxuXHRcdFx0XHRcdC50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRcdFx0c2VsZi5qYUNhcmQudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRzZWxmLm5laW5DYXJkLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0c2VsZi5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdHNlbGYuYmFja3BsYXRlLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0c2VsZi5kaXNwbGF5ZWQgPSBudWxsO1xyXG5cdFx0XHRcdFx0XHRzZWxmLnJlbW92ZSguLi5zZWxmLnBvbGljaWVzKTtcclxuXHRcdFx0XHRcdFx0c2VsZi5wb2xpY2llcyA9IFtdO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdHNlbGYuX291dHRyb0FuaW0gPSBudWxsO1xyXG5cdFx0XHRcdH0sIDEwMCk7XHJcblxyXG5cdFx0XHRcdHNlbGYuamFDYXJkLnJlbW92ZUFsbEJlaGF2aW9ycygpO1xyXG5cdFx0XHRcdHNlbGYuamFDYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgc2VsZi5feWVzQ2xpY2tIYW5kbGVyKTtcclxuXHRcdFx0XHRzZWxmLm5laW5DYXJkLnJlbW92ZUFsbEJlaGF2aW9ycygpO1xyXG5cdFx0XHRcdHNlbGYubmVpbkNhcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCBzZWxmLl9ub0NsaWNrSGFuZGxlcik7XHJcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigncGxheWVyU2VsZWN0Jywgc2VsZi5fbm9taW5hdGVIYW5kbGVyKTtcclxuXHRcdFx0XHRzZWxmLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbmNlbFZvdGUnLCBzZWxmLl9jYW5jZWxIYW5kbGVyKTtcclxuXHJcblx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBhbnN3ZXIgc3RpbGwgbWF0dGVyc1xyXG5cdFx0XHRcdGlmKCFpc1ZvdGVWYWxpZCgpIHx8IGFuc3dlciA9PT0gJ2NhbmNlbCcpe1xyXG5cdFx0XHRcdFx0aWYoY2hvaWNlcyA9PT0gUE9MSUNZKVxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHQvLyByYW5kb20gY2FyZCBkZXRhY2hlcyBhbmQgd2lua3Mgb3V0XHJcblx0XHRcdFx0XHRcdGxldCBjYXJkID0gc2VsZi5wb2xpY2llc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqc2VsZi5wb2xpY2llcy5sZW5ndGgpXTtcclxuXHRcdFx0XHRcdFx0Y2FyZC5hcHBseU1hdHJpeChzZWxmLm1hdHJpeCk7XHJcblx0XHRcdFx0XHRcdHNlbGYuc2VhdC5hZGQoY2FyZCk7XHJcblx0XHRcdFx0XHRcdEFuaW1hdGUud2lua091dChjYXJkLCAzMDApLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHNlbGYuc2VhdC5yZW1vdmUoY2FyZCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0cmVqZWN0KCd2b3RlIGNhbmNlbGxlZCcpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3llcycpXHJcblx0XHRcdFx0XHRyZXNvbHZlKHRydWUpO1xyXG5cdFx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnbm8nKVxyXG5cdFx0XHRcdFx0cmVzb2x2ZShmYWxzZSk7XHJcblx0XHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdwbGF5ZXInKVxyXG5cdFx0XHRcdFx0cmVzb2x2ZShldnQuZGF0YSk7XHJcblx0XHRcdFx0ZWxzZSBpZihjaG9pY2VzID09PSBQT0xJQ1kpXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Ly8gY2xpY2tlZCBjYXJkIGRldGFjaGVzIGFuZCB3aW5rcyBvdXRcclxuXHRcdFx0XHRcdGxldCBjYXJkID0gc2VsZi5wb2xpY2llc1soYW5zd2VyKzMpJTNdO1xyXG5cdFx0XHRcdFx0Y2FyZC5hcHBseU1hdHJpeChzZWxmLm1hdHJpeCk7XHJcblx0XHRcdFx0XHRzZWxmLnNlYXQuYWRkKGNhcmQpO1xyXG5cdFx0XHRcdFx0QW5pbWF0ZS53aW5rT3V0KGNhcmQsIDMwMCkudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNlbGYuc2VhdC5yZW1vdmUoY2FyZCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRyZXNvbHZlKGFuc3dlcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZihhbnN3ZXIgPT09ICd5ZXMnKVxyXG5cdFx0XHRcdHNlbGYuX3llc0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XHJcblx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnbm8nKVxyXG5cdFx0XHRcdHNlbGYuX25vQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcclxuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdwbGF5ZXInKVxyXG5cdFx0XHRcdHNlbGYuX25vbWluYXRlSGFuZGxlciA9IGhhbmRsZXI7XHJcblx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnY2FuY2VsJylcclxuXHRcdFx0XHRzZWxmLl9jYW5jZWxIYW5kbGVyID0gaGFuZGxlcjtcclxuXHJcblx0XHRcdHJldHVybiBoYW5kbGVyO1xyXG5cdFx0fVxyXG5cclxuXHRcdHNlbGYubGFzdFF1ZXVlZCA9IHNlbGYubGFzdFF1ZXVlZC50aGVuKGhvb2tVcFF1ZXN0aW9uLCBob29rVXBRdWVzdGlvbik7XHJcblxyXG5cdFx0cmV0dXJuIHNlbGYubGFzdFF1ZXVlZDtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7QmFsbG90LCBQTEFZRVJTRUxFQ1QsIENPTkZJUk0sIEJJTkFSWSwgUE9MSUNZfTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IHtGYXNjaXN0Um9sZUNhcmQsIEhpdGxlclJvbGVDYXJkLCBMaWJlcmFsUm9sZUNhcmQsIEZhc2Npc3RQYXJ0eUNhcmQsIExpYmVyYWxQYXJ0eUNhcmQsIEphQ2FyZCwgTmVpbkNhcmR9IGZyb20gJy4vY2FyZCc7XHJcbmltcG9ydCB7bGF0ZVVwZGF0ZX0gZnJvbSAnLi91dGlscyc7XHJcbmltcG9ydCB7TkJpbGxib2FyZH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcclxuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBsYXllckluZm8gZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3Ioc2VhdClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcclxuXHRcdHRoaXMuY2FyZCA9IG51bGw7XHJcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLCAwLjMpO1xyXG5cdFx0dGhpcy5zY2FsZS5zZXRTY2FsYXIoMC4zKTtcclxuXHRcdHNlYXQuYWRkKHRoaXMpO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUodGhpcy51cGRhdGVTdGF0ZS5iaW5kKHRoaXMpKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdpbnZlc3RpZ2F0ZScsIHRoaXMucHJlc2VudFBhcnR5LmJpbmQodGhpcykpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlU3RhdGUoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzLCB2b3Rlc319KVxyXG5cdHtcclxuXHRcdGxldCBsb2NhbFBsYXllciA9IHBsYXllcnNbU0gubG9jYWxVc2VyLmlkXSB8fCB7fTtcclxuXHRcdGxldCBzZWF0ZWRQbGF5ZXIgPSBwbGF5ZXJzW3RoaXMuc2VhdC5vd25lcl0gfHwge307XHJcblx0XHRsZXQgdm90ZSA9IHZvdGVzW2dhbWUubGFzdEVsZWN0aW9uXTtcclxuXHJcblx0XHRsZXQgc2VhdGVkUm9sZVNob3VsZEJlVmlzaWJsZSA9XHJcblx0XHRcdGdhbWUuc3RhdGUgPT09ICdkb25lJyB8fFxyXG5cdFx0XHRnYW1lLnN0YXRlID09PSAnbmlnaHQnICYmIChcclxuXHRcdFx0XHRsb2NhbFBsYXllciA9PT0gc2VhdGVkUGxheWVyIHx8XHJcblx0XHRcdFx0bG9jYWxQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnICYmIChzZWF0ZWRQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnIHx8IHNlYXRlZFBsYXllci5yb2xlID09PSAnaGl0bGVyJykgfHxcclxuXHRcdFx0XHRsb2NhbFBsYXllci5yb2xlID09PSAnaGl0bGVyJyAmJiBzZWF0ZWRQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnICYmIGdhbWUudHVybk9yZGVyLmxlbmd0aCA8IDdcclxuXHRcdFx0KTtcclxuXHJcblx0XHRpZih0aGlzLnNlYXQub3duZXIgJiYgc2VhdGVkUm9sZVNob3VsZEJlVmlzaWJsZSlcclxuXHRcdHtcclxuXHRcdFx0aWYodGhpcy5jYXJkICYmIHRoaXMuY2FyZC51c2VyRGF0YS50eXBlICE9PSAncm9sZScpe1xyXG5cdFx0XHRcdHRoaXMucmVtb3ZlKHRoaXMuY2FyZCk7XHJcblx0XHRcdFx0dGhpcy5jYXJkID0gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c3dpdGNoKHNlYXRlZFBsYXllci5yb2xlKXtcclxuXHRcdFx0XHRjYXNlICdmYXNjaXN0JzogdGhpcy5jYXJkID0gbmV3IEZhc2Npc3RSb2xlQ2FyZCgpOyBicmVhaztcclxuXHRcdFx0XHRjYXNlICdoaXRsZXInIDogdGhpcy5jYXJkID0gbmV3IEhpdGxlclJvbGVDYXJkKCk7ICBicmVhaztcclxuXHRcdFx0XHRjYXNlICdsaWJlcmFsJzogdGhpcy5jYXJkID0gbmV3IExpYmVyYWxSb2xlQ2FyZCgpOyBicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhpcy5jYXJkLnVzZXJEYXRhLnR5cGUgPSAncm9sZSc7XHJcblx0XHRcdHRoaXMuYWRkKHRoaXMuY2FyZCk7XHJcblx0XHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuY2FyZCk7XHJcblx0XHRcdEFuaW1hdGUud2lua0luKHRoaXMuY2FyZCwgMzAwKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodGhpcy5zZWF0Lm93bmVyICYmIGdhbWUuc3RhdGUgPT09ICdsYW1lRHVjaycgJiYgIXZvdGUubm9uVm90ZXJzLmluY2x1ZGVzKHRoaXMuc2VhdC5vd25lcikpXHJcblx0XHR7XHJcblx0XHRcdGlmKHRoaXMuY2FyZCAmJiB0aGlzLmNhcmQudXNlckRhdGEudHlwZSAhPT0gJ3ZvdGUnKXtcclxuXHRcdFx0XHR0aGlzLnJlbW92ZSh0aGlzLmNhcmQpO1xyXG5cdFx0XHRcdHRoaXMuY2FyZCA9IG51bGw7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGxldCBwbGF5ZXJWb3RlID0gdm90ZS55ZXNWb3RlcnMuaW5jbHVkZXModGhpcy5zZWF0Lm93bmVyKTtcclxuXHRcdFx0dGhpcy5jYXJkID0gcGxheWVyVm90ZSA/IG5ldyBKYUNhcmQoKSA6IG5ldyBOZWluQ2FyZCgpO1xyXG5cclxuXHRcdFx0dGhpcy5jYXJkLnVzZXJEYXRhLnR5cGUgPSAndm90ZSc7XHJcblx0XHRcdHRoaXMuYWRkKHRoaXMuY2FyZCk7XHJcblx0XHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuY2FyZCk7XHJcblx0XHRcdEFuaW1hdGUud2lua0luKHRoaXMuY2FyZCwgMzAwKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodGhpcy5jYXJkICE9PSBudWxsKVxyXG5cdFx0e1xyXG5cdFx0XHRBbmltYXRlLndpbmtPdXQodGhpcy5jYXJkLCAzMDApLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMucmVtb3ZlKHRoaXMuY2FyZCk7XHJcblx0XHRcdFx0dGhpcy5jYXJkID0gbnVsbDtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcmVzZW50UGFydHkoe2RhdGE6IHVzZXJJZH0pXHJcblx0e1xyXG5cdFx0aWYoIXRoaXMuc2VhdC5vd25lciB8fCB0aGlzLnNlYXQub3duZXIgIT09IHVzZXJJZCkgcmV0dXJuO1xyXG5cclxuXHRcdGlmKHRoaXMuY2FyZCAmJiB0aGlzLmNhcmQudXNlckRhdGEudHlwZSAhPT0gJ3BhcnR5Jyl7XHJcblx0XHRcdHRoaXMucmVtb3ZlKHRoaXMuY2FyZCk7XHJcblx0XHRcdHRoaXMuY2FyZCA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0bGV0IHJvbGUgPSBTSC5wbGF5ZXJzW3RoaXMuc2VhdC5vd25lcl0ucm9sZTtcclxuXHRcdHRoaXMuY2FyZCA9ICByb2xlID09PSAnbGliZXJhbCcgPyBuZXcgTGliZXJhbFBhcnR5Q2FyZCgpIDogbmV3IEZhc2Npc3RQYXJ0eUNhcmQoKTtcclxuXHJcblx0XHR0aGlzLmNhcmQudXNlckRhdGEudHlwZSA9ICdwYXJ0eSc7XHJcblx0XHR0aGlzLmFkZCh0aGlzLmNhcmQpO1xyXG5cdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcclxuXHRcdEFuaW1hdGUud2lua0luKHRoaXMuY2FyZCwgMzAwKTtcclxuXHR9XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENhcHN1bGVHZW9tZXRyeSBleHRlbmRzIFRIUkVFLkJ1ZmZlckdlb21ldHJ5XHJcbntcclxuXHRjb25zdHJ1Y3RvcihyYWRpdXMsIGhlaWdodCwgc2VnbWVudHMgPSAxMiwgcmluZ3MgPSA4KVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblxyXG5cdFx0bGV0IG51bVZlcnRzID0gMiAqIHJpbmdzICogc2VnbWVudHMgKyAyO1xyXG5cdFx0bGV0IG51bUZhY2VzID0gNCAqIHJpbmdzICogc2VnbWVudHM7XHJcblx0XHRsZXQgdGhldGEgPSAyKk1hdGguUEkvc2VnbWVudHM7XHJcblx0XHRsZXQgcGhpID0gTWF0aC5QSS8oMipyaW5ncyk7XHJcblxyXG5cdFx0bGV0IHZlcnRzID0gbmV3IEZsb2F0MzJBcnJheSgzKm51bVZlcnRzKTtcclxuXHRcdGxldCBmYWNlcyA9IG5ldyBVaW50MTZBcnJheSgzKm51bUZhY2VzKTtcclxuXHRcdGxldCB2aSA9IDAsIGZpID0gMCwgdG9wQ2FwID0gMCwgYm90Q2FwID0gMTtcclxuXHJcblx0XHR2ZXJ0cy5zZXQoWzAsIGhlaWdodC8yLCAwXSwgMyp2aSsrKTtcclxuXHRcdHZlcnRzLnNldChbMCwgLWhlaWdodC8yLCAwXSwgMyp2aSsrKTtcclxuXHJcblx0XHRmb3IoIGxldCBzPTA7IHM8c2VnbWVudHM7IHMrKyApXHJcblx0XHR7XHJcblx0XHRcdGZvciggbGV0IHI9MTsgcjw9cmluZ3M7IHIrKylcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxldCByYWRpYWwgPSByYWRpdXMgKiBNYXRoLnNpbihyKnBoaSk7XHJcblxyXG5cdFx0XHRcdC8vIGNyZWF0ZSB2ZXJ0c1xyXG5cdFx0XHRcdHZlcnRzLnNldChbXHJcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLmNvcyhzKnRoZXRhKSxcclxuXHRcdFx0XHRcdGhlaWdodC8yIC0gcmFkaXVzKigxLU1hdGguY29zKHIqcGhpKSksXHJcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLnNpbihzKnRoZXRhKVxyXG5cdFx0XHRcdF0sIDMqdmkrKyk7XHJcblxyXG5cdFx0XHRcdHZlcnRzLnNldChbXHJcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLmNvcyhzKnRoZXRhKSxcclxuXHRcdFx0XHRcdC1oZWlnaHQvMiArIHJhZGl1cyooMS1NYXRoLmNvcyhyKnBoaSkpLFxyXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5zaW4ocyp0aGV0YSlcclxuXHRcdFx0XHRdLCAzKnZpKyspO1xyXG5cclxuXHRcdFx0XHRsZXQgdG9wX3MxcjEgPSB2aS0yLCB0b3BfczFyMCA9IHZpLTQ7XHJcblx0XHRcdFx0bGV0IGJvdF9zMXIxID0gdmktMSwgYm90X3MxcjAgPSB2aS0zO1xyXG5cdFx0XHRcdGxldCB0b3BfczByMSA9IHRvcF9zMXIxIC0gMipyaW5ncywgdG9wX3MwcjAgPSB0b3BfczFyMCAtIDIqcmluZ3M7XHJcblx0XHRcdFx0bGV0IGJvdF9zMHIxID0gYm90X3MxcjEgLSAyKnJpbmdzLCBib3RfczByMCA9IGJvdF9zMXIwIC0gMipyaW5ncztcclxuXHRcdFx0XHRpZihzID09PSAwKXtcclxuXHRcdFx0XHRcdHRvcF9zMHIxICs9IG51bVZlcnRzLTI7XHJcblx0XHRcdFx0XHR0b3BfczByMCArPSBudW1WZXJ0cy0yO1xyXG5cdFx0XHRcdFx0Ym90X3MwcjEgKz0gbnVtVmVydHMtMjtcclxuXHRcdFx0XHRcdGJvdF9zMHIwICs9IG51bVZlcnRzLTI7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBjcmVhdGUgZmFjZXNcclxuXHRcdFx0XHRpZihyID09PSAxKVxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGZhY2VzLnNldChbdG9wQ2FwLCB0b3BfczFyMSwgdG9wX3MwcjFdLCAzKmZpKyspO1xyXG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFtib3RDYXAsIGJvdF9zMHIxLCBib3RfczFyMV0sIDMqZmkrKyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2VcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcF9zMXIwLCB0b3BfczFyMSwgdG9wX3MwcjBdLCAzKmZpKyspO1xyXG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFt0b3BfczByMCwgdG9wX3MxcjEsIHRvcF9zMHIxXSwgMypmaSsrKTtcclxuXHJcblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdF9zMHIxLCBib3RfczFyMSwgYm90X3MwcjBdLCAzKmZpKyspO1xyXG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFtib3RfczByMCwgYm90X3MxcjEsIGJvdF9zMXIwXSwgMypmaSsrKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGNyZWF0ZSBsb25nIHNpZGVzXHJcblx0XHRcdGxldCB0b3BfczEgPSB2aS0yLCB0b3BfczAgPSB0b3BfczEgLSAyKnJpbmdzO1xyXG5cdFx0XHRsZXQgYm90X3MxID0gdmktMSwgYm90X3MwID0gYm90X3MxIC0gMipyaW5ncztcclxuXHRcdFx0aWYocyA9PT0gMCl7XHJcblx0XHRcdFx0dG9wX3MwICs9IG51bVZlcnRzLTI7XHJcblx0XHRcdFx0Ym90X3MwICs9IG51bVZlcnRzLTI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZhY2VzLnNldChbdG9wX3MwLCB0b3BfczEsIGJvdF9zMV0sIDMqZmkrKyk7XHJcblx0XHRcdGZhY2VzLnNldChbYm90X3MwLCB0b3BfczAsIGJvdF9zMV0sIDMqZmkrKyk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSh2ZXJ0cywgMykpO1xyXG5cdFx0dGhpcy5zZXRJbmRleChuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKGZhY2VzLCAxKSk7XHJcblx0fVxyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQgQ2Fwc3VsZUdlb21ldHJ5IGZyb20gJy4vY2Fwc3VsZWdlb21ldHJ5JztcclxuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcclxuXHJcbmxldCBoaXRib3hHZW8gPSBuZXcgQ2Fwc3VsZUdlb21ldHJ5KDAuMywgMS44KTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhpdGJveCBleHRlbmRzIFRIUkVFLk1lc2hcclxue1xyXG5cdGNvbnN0cnVjdG9yKHNlYXQpXHJcblx0e1xyXG5cdFx0c3VwZXIoaGl0Ym94R2VvLCBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xyXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdFx0b3BhY2l0eTogMCxcclxuXHRcdFx0c2lkZTogVEhSRUUuQmFja1NpZGVcclxuXHRcdH0pKTtcclxuXHJcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC41LCAtLjIpO1xyXG5cdFx0dGhpcy52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xyXG5cdFx0c2VhdC5hZGQodGhpcyk7XHJcblxyXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3JlbnRlcicsICgpID0+IHRoaXMubWF0ZXJpYWwub3BhY2l0eSA9IDAuMSk7XHJcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcmxlYXZlJywgKCkgPT4gdGhpcy5tYXRlcmlhbC5vcGFjaXR5ID0gMCk7XHJcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgKCkgPT4ge1xyXG5cdFx0XHRTSC5kaXNwYXRjaEV2ZW50KHtcclxuXHRcdFx0XHR0eXBlOiAncGxheWVyU2VsZWN0JyxcclxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcclxuXHRcdFx0XHRkYXRhOiB0aGlzLnNlYXQub3duZXJcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBsYXRlVXBkYXRlKHRoaXMudXBkYXRlVmlzaWJpbGl0eS5iaW5kKHRoaXMpKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVWaXNpYmlsaXR5KHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxyXG5cdHtcclxuXHRcdGxldCBsaXZpbmdQbGF5ZXJzID0gZ2FtZS50dXJuT3JkZXIuZmlsdGVyKHAgPT4gcGxheWVyc1twXS5zdGF0ZSAhPT0gJ2RlYWQnKTtcclxuXHRcdGxldCBwcmVjb25kaXRpb25zID1cclxuXHRcdFx0U0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCAmJlxyXG5cdFx0XHR0aGlzLnNlYXQub3duZXIgIT09ICcnICYmXHJcblx0XHRcdHRoaXMuc2VhdC5vd25lciAhPT0gU0gubG9jYWxVc2VyLmlkICYmXHJcblx0XHRcdGxpdmluZ1BsYXllcnMuaW5jbHVkZXModGhpcy5zZWF0Lm93bmVyKTtcclxuXHJcblx0XHRsZXQgbm9taW5hdGVhYmxlID1cclxuXHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJlxyXG5cdFx0XHR0aGlzLnNlYXQub3duZXIgIT09IGdhbWUubGFzdENoYW5jZWxsb3IgJiZcclxuXHRcdFx0KGxpdmluZ1BsYXllcnMubGVuZ3RoIDw9IDUgfHwgdGhpcy5zZWF0Lm93bmVyICE9PSBnYW1lLmxhc3RQcmVzaWRlbnQpO1xyXG5cclxuXHRcdGxldCBpbnZlc3RpZ2F0ZWFibGUgPVxyXG5cdFx0XHRnYW1lLnN0YXRlID09PSAnaW52ZXN0aWdhdGUnICYmXHJcblx0XHRcdHBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXSAmJiBwbGF5ZXJzW3RoaXMuc2VhdC5vd25lcl0uc3RhdGUgPT09ICdub3JtYWwnO1xyXG5cclxuXHRcdGxldCBzdWNjZWVkYWJsZSA9IGdhbWUuc3RhdGUgPT09ICduYW1lU3VjY2Vzc29yJztcclxuXHRcdGxldCBleGVjdXRhYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ2V4ZWN1dGUnO1xyXG5cclxuXHRcdHRoaXMudmlzaWJsZSA9IHByZWNvbmRpdGlvbnMgJiYgKG5vbWluYXRlYWJsZSB8fCBpbnZlc3RpZ2F0ZWFibGUgfHwgc3VjY2VlZGFibGUgfHwgZXhlY3V0YWJsZSk7XHJcblx0fVxyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnO1xyXG5pbXBvcnQge0JhbGxvdH0gZnJvbSAnLi9iYWxsb3QnO1xyXG5pbXBvcnQgUGxheWVySW5mbyBmcm9tICcuL3BsYXllcmluZm8nO1xyXG5pbXBvcnQgSGl0Ym94IGZyb20gJy4vaGl0Ym94JztcclxuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNlYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3Ioc2VhdE51bSlcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdHRoaXMuc2VhdE51bSA9IHNlYXROdW07XHJcblx0XHR0aGlzLm93bmVyID0gJyc7XHJcblxyXG5cdFx0Ly8gcG9zaXRpb24gc2VhdFxyXG5cdFx0bGV0IHgsIHk9MC42NSwgejtcclxuXHRcdHN3aXRjaChzZWF0TnVtKXtcclxuXHRcdGNhc2UgMDogY2FzZSAxOiBjYXNlIDI6XHJcblx0XHRcdHggPSAtMC44MzMgKyAwLjgzMypzZWF0TnVtO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCh4LCB5LCAtMS4wNSk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0Y2FzZSAzOiBjYXNlIDQ6XHJcblx0XHRcdHogPSAtMC40MzcgKyAwLjg3NCooc2VhdE51bS0zKTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMS40MjUsIHksIHopO1xyXG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtTWF0aC5QSS8yLCAwKTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlIDU6IGNhc2UgNjogY2FzZSA3OlxyXG5cdFx0XHR4ID0gMC44MzMgLSAwLjgzMyooc2VhdE51bS01KTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoeCwgeSwgMS4wNSk7XHJcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLCAwKTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlIDg6IGNhc2UgOTpcclxuXHRcdFx0eiA9IDAuNDM3IC0gMC44NzQqKHNlYXROdW0tOCk7XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KC0xLjQyNSwgeSwgeik7XHJcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KDAsIC0xLjUqTWF0aC5QSSwgMCk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLnVwZGF0ZU93bmVyc2hpcC5iaW5kKHRoaXMpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2NoZWNrZWRfaW4nLCAoe2RhdGE6IGlkfSkgPT4ge1xyXG5cdFx0XHRpZih0aGlzLm93bmVyID09PSBpZClcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZU93bmVyc2hpcCh7ZGF0YToge2dhbWU6IFNILmdhbWUsIHBsYXllcnM6IFNILnBsYXllcnN9fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pID0+IHtcclxuXHRcdFx0aWYodGhpcy5vd25lciAmJiBwbGF5ZXJzW3RoaXMub3duZXJdLnN0YXRlID09PSAnZGVhZCcpe1xyXG5cdFx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldCgweDNkMjc4OSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMubmFtZXBsYXRlID0gbmV3IE5hbWVwbGF0ZSh0aGlzKTtcclxuXHRcdHRoaXMuYmFsbG90ID0gbmV3IEJhbGxvdCh0aGlzKTtcclxuXHRcdHRoaXMucGxheWVySW5mbyA9IG5ldyBQbGF5ZXJJbmZvKHRoaXMpO1xyXG5cdFx0dGhpcy5oaXRib3ggPSBuZXcgSGl0Ym94KHRoaXMpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlT3duZXJzaGlwKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxyXG5cdHtcclxuXHRcdGxldCBpZHMgPSBnYW1lLnR1cm5PcmRlciB8fCBbXTtcclxuXHJcblx0XHQvLyByZWdpc3RlciB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSBjbGFpbWVkXHJcblx0XHRpZiggIXRoaXMub3duZXIgKVxyXG5cdFx0e1xyXG5cdFx0XHQvLyBjaGVjayBpZiBhIHBsYXllciBoYXMgam9pbmVkIGF0IHRoaXMgc2VhdFxyXG5cdFx0XHRmb3IobGV0IGkgaW4gaWRzKXtcclxuXHRcdFx0XHRpZihwbGF5ZXJzW2lkc1tpXV0uc2VhdE51bSA9PSB0aGlzLnNlYXROdW0pe1xyXG5cdFx0XHRcdFx0dGhpcy5vd25lciA9IGlkc1tpXTtcclxuXHRcdFx0XHRcdHRoaXMubmFtZXBsYXRlLnVwZGF0ZVRleHQocGxheWVyc1tpZHNbaV1dLmRpc3BsYXlOYW1lKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyByZXNldCB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSB2YWNhdGVkXHJcblx0XHRpZiggIWlkcy5pbmNsdWRlcyh0aGlzLm93bmVyKSApXHJcblx0XHR7XHJcblx0XHRcdHRoaXMub3duZXIgPSAnJztcclxuXHRcdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJyl7XHJcblx0XHRcdFx0dGhpcy5uYW1lcGxhdGUudXBkYXRlVGV4dCgnPEpvaW4+Jyk7XHJcblx0XHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ZmZmZmZmKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHVwZGF0ZSBkaXNjb25uZWN0IGNvbG9yc1xyXG5cdFx0ZWxzZSBpZiggIXBsYXllcnNbdGhpcy5vd25lcl0uY29ubmVjdGVkICl7XHJcblx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweDgwODA4MCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKCBwbGF5ZXJzW3RoaXMub3duZXJdLmNvbm5lY3RlZCApe1xyXG5cdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXRIZXgoMHhmZmZmZmYpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQge1BsYWNlaG9sZGVyTWVzaCwgTkJpbGxib2FyZCwgTlRleHR9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XHJcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb250aW51ZUJveCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcihwYXJlbnQpXHJcblx0e1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuaWNvbiA9IG5ldyBUSFJFRS5NZXNoKFxyXG5cdFx0XHRuZXcgVEhSRUUuQm94QnVmZmVyR2VvbWV0cnkoLjE1LCAuMTUsIC4xNSksXHJcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4MTBhMDEwfSlcclxuXHRcdCk7XHJcblx0XHRBbmltYXRlLnNwaW4odGhpcy5pY29uKTtcclxuXHRcdHRoaXMuYWRkKHRoaXMuaWNvbik7XHJcblxyXG5cdFx0dGhpcy50ZXh0ID0gUGxhY2Vob2xkZXJNZXNoLmNsb25lKCk7XHJcblx0XHR0aGlzLnRleHQucG9zaXRpb24uc2V0KDAsIC4yLCAwKTtcclxuXHRcdHRoaXMudGV4dC51c2VyRGF0YS5hbHRzcGFjZSA9IHtjb2xsaWRlcjoge2VuYWJsZWQ6IHRydWV9fTtcclxuXHJcblx0XHRsZXQgYmIgPSBuZXcgTkJpbGxib2FyZCh0aGlzLnRleHQpO1xyXG5cclxuXHRcdHRoaXMudGV4dENvbXBvbmVudCA9IG5ldyBOVGV4dCh0aGlzLnRleHQpO1xyXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7Zm9udFNpemU6IDEsIHdpZHRoOiAyLCBoZWlnaHQ6IDEsIGhvcml6b250YWxBbGlnbjogJ21pZGRsZScsIHZlcnRpY2FsQWxpZ246ICdtaWRkbGUnfSk7XHJcblxyXG5cdFx0dGhpcy5hZGQodGhpcy50ZXh0KTtcclxuXHJcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjI1LCAwKTtcclxuXHRcdHBhcmVudC5hZGQodGhpcyk7XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgdGhpcy5vbnN0YXRlY2hhbmdlLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMucGxheWVyU2V0dXAuYmluZCh0aGlzKSk7XHJcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5vbmNsaWNrLmJpbmQodGhpcykpO1xyXG5cdFx0dGhpcy5hZGRCZWhhdmlvciggbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJTY2FsZSgpICk7XHJcblxyXG5cdFx0bGV0IHNob3cgPSAoKSA9PiB0aGlzLnNob3coKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2ludmVzdGlnYXRlJywgc2hvdyk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdwb2xpY3lBbmltRG9uZScsIHNob3cpO1xyXG5cdH1cclxuXHJcblx0b25jbGljayhldnQpXHJcblx0e1xyXG5cdFx0aWYoU0guZ2FtZS50dXJuT3JkZXIuaW5jbHVkZXMoU0gubG9jYWxVc2VyLmlkKSlcclxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2NvbnRpbnVlJyk7XHJcblx0fVxyXG5cclxuXHRvbnN0YXRlY2hhbmdlKHtkYXRhOiB7Z2FtZX19KVxyXG5cdHtcclxuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdsYW1lRHVjaycgfHwgKGdhbWUuc3RhdGUgPT09ICdwZWVrJyAmJiBnYW1lLnByZXNpZGVudCA9PT0gU0gubG9jYWxVc2VyLmlkKSl7XHJcblx0XHRcdHRoaXMuc2hvdygpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcclxuXHRcdFx0dGhpcy5wbGF5ZXJTZXR1cCh7ZGF0YToge2dhbWV9fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdkb25lJyl7XHJcblx0XHRcdHRoaXMuaGlkZSgpO1xyXG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnNob3coJ05ldyBnYW1lJyk7XHJcblx0XHRcdH0sIDgwMDApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHRoaXMuaGlkZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cGxheWVyU2V0dXAoe2RhdGE6IHtnYW1lfX0pXHJcblx0e1xyXG5cdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJyl7XHJcblx0XHRcdHRoaXMudGV4dC52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0bGV0IHBsYXllckNvdW50ID0gZ2FtZS50dXJuT3JkZXIubGVuZ3RoO1xyXG5cdFx0XHRpZihwbGF5ZXJDb3VudCA+PSA1KXtcclxuXHRcdFx0XHR0aGlzLmljb24udmlzaWJsZSA9IHRydWU7XHJcblx0XHRcdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDpcclxuXHRcdFx0XHRcdGAoJHtwbGF5ZXJDb3VudH0vNSkgQ2xpY2sgd2hlbiByZWFkeWBcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHR0aGlzLmljb24udmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6XHJcblx0XHRcdFx0XHRgKCR7cGxheWVyQ291bnR9LzUpIE5lZWQgbW9yZSBwbGF5ZXJzYFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzaG93KG1lc3NhZ2UgPSAnQ2xpY2sgdG8gY29udGludWUnKXtcclxuXHRcdHRoaXMuaWNvbi52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdHRoaXMudGV4dC52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6IG1lc3NhZ2V9KTtcclxuXHR9XHJcblxyXG5cdGhpZGUoKXtcclxuXHRcdHRoaXMuaWNvbi52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLnRleHQudmlzaWJsZSA9IGZhbHNlO1xyXG5cdH1cclxufTsiLCJpbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xyXG5cclxuY29uc3QgcG9zaXRpb25zID0gW1xyXG5cdG5ldyBUSFJFRS5WZWN0b3IzKDAuMzY4LCAuMDA1LCAtLjcxNyksXHJcblx0bmV3IFRIUkVFLlZlY3RvcjMoMC4xMzUsIC4wMTAsIC0uNzE3KSxcclxuXHRuZXcgVEhSRUUuVmVjdG9yMygtLjA5NiwgLjAxNSwgLS43MTcpLFxyXG5cdG5ldyBUSFJFRS5WZWN0b3IzKC0uMzI5LCAuMDIwLCAtLjcxNylcclxuXTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEVsZWN0aW9uVHJhY2tlciBleHRlbmRzIFRIUkVFLk1lc2hcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcihcclxuXHRcdFx0bmV3IFRIUkVFLkN5bGluZGVyQnVmZmVyR2VvbWV0cnkoLjA0LCAuMDQsIC4wMSwgMTYpLFxyXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMucG9zaXRpb24uY29weShwb3NpdGlvbnNbMF0pO1xyXG5cdFx0U0gudGFibGUuYWRkKHRoaXMpO1xyXG5cdFx0XHJcblx0XHQvLyBmYWlscyUzID09IDAgb3IgMz9cclxuXHRcdHRoaXMuaGlnaFNpZGUgPSBmYWxzZTtcclxuXHRcdHRoaXMuc3BvdCA9IDA7XHJcblx0XHR0aGlzLm1hdGVyaWFsLmNvbG9yLnNldEhTTCguNTI4LCAuMzEsIC40KTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfZmFpbGVkVm90ZXMnLCB0aGlzLnVwZGF0ZUZhaWxlZFZvdGVzLmJpbmQodGhpcykpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlRmFpbGVkVm90ZXMoe2RhdGE6IHtnYW1lOiB7ZmFpbGVkVm90ZXN9fX0gPSB7ZGF0YToge2dhbWU6IHtmYWlsZWRWb3RlczogLTF9fX0pXHJcblx0e1xyXG5cdFx0aWYoZmFpbGVkVm90ZXMgPT09IC0xKVxyXG5cdFx0XHRmYWlsZWRWb3RlcyA9IHRoaXMuc3BvdDtcclxuXHJcblx0XHR0aGlzLmhpZ2hTaWRlID0gZmFpbGVkVm90ZXMgPiAwO1xyXG5cdFx0dGhpcy5zcG90ID0gZmFpbGVkVm90ZXMlMyB8fCB0aGlzLmhpZ2hTaWRlICYmIDMgfHwgMDtcclxuXHJcblx0XHR0aGlzLmFuaW0gPSBBbmltYXRlLnNpbXBsZSh0aGlzLCB7XHJcblx0XHRcdHBvczogcG9zaXRpb25zW3RoaXMuc3BvdF0sXHJcblx0XHRcdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygxLCAxK3RoaXMuc3BvdCwgMSksXHJcblx0XHRcdGh1ZTogLjUyOCooMS10aGlzLnNwb3QvMyksXHJcblx0XHRcdGR1cmF0aW9uOiAxMjAwXHJcblx0XHR9KTtcclxuXHR9XHJcbn0iLCJpbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQge0NyZWRpdHNDYXJkfSBmcm9tICcuL2NhcmQnO1xyXG5pbXBvcnQge1BsYWNlaG9sZGVyTWVzaCwgTkJpbGxib2FyZCwgTlRleHR9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XHJcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XHJcbmltcG9ydCB7dHJhbnNsYXRlIGFzIHRyfSBmcm9tICcuL3RoZW1lJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFByZXNlbnRhdGlvbiBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcigpXHJcblx0e1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdFNILnRhYmxlLmFkZCh0aGlzKTtcclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC0uOSwgMCk7XHJcblxyXG5cdFx0Ly8gY3JlYXRlIGlkbGUgZGlzcGxheVxyXG5cdFx0dGhpcy5jcmVkaXRzID0gbmV3IENyZWRpdHNDYXJkKCk7XHJcblx0XHR0aGlzLmNyZWRpdHMucG9zaXRpb24uc2V0KDAsIDEuODUsIDApO1xyXG5cdFx0QW5pbWF0ZS5zcGluKHRoaXMuY3JlZGl0cywgMzAwMDApO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5jcmVkaXRzKTtcclxuXHRcdFxyXG5cdFx0Ly8gY3JlYXRlIHZpY3RvcnkgYmFubmVyXHJcblx0XHR0aGlzLmJhbm5lciA9IFBsYWNlaG9sZGVyTWVzaC5jbG9uZSgpO1xyXG5cdFx0dGhpcy5iYW5uZXIudGV4dCA9IG5ldyBOVGV4dCh0aGlzLmJhbm5lcik7XHJcblx0XHR0aGlzLmJhbm5lci50ZXh0LnVwZGF0ZSh7Zm9udFNpemU6IDJ9KTtcclxuXHRcdHRoaXMuYmFubmVyLmJpbGxib2FyZCA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuYmFubmVyKTtcclxuXHRcdHRoaXMuYmFubmVyLmJvYiA9IG51bGw7XHJcblx0XHR0aGlzLmFkZCh0aGlzLmJhbm5lcik7XHJcblxyXG5cdFx0Ly8gdXBkYXRlIHN0dWZmXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCB0aGlzLnVwZGF0ZU9uU3RhdGUuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVPblN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxyXG5cdHtcclxuXHRcdHRoaXMuYmFubmVyLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMuY3JlZGl0cy52aXNpYmxlID0gZmFsc2U7XHJcblx0XHRpZih0aGlzLmJhbm5lci5ib2Ipe1xyXG5cdFx0XHR0aGlzLmJhbm5lci5ib2Iuc3RvcCgpO1xyXG5cdFx0XHR0aGlzLmJhbm5lci5ib2IgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xyXG5cdFx0XHR0aGlzLmNyZWRpdHMudmlzaWJsZSA9IHRydWU7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdkb25lJylcclxuXHRcdHtcclxuXHRcdFx0aWYoL15saWJlcmFsLy50ZXN0KGdhbWUudmljdG9yeSkpe1xyXG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQuY29sb3IgPSAnIzE5MTlmZic7XHJcblx0XHRcdFx0dGhpcy5iYW5uZXIudGV4dC51cGRhdGUoe3RleHQ6ICdMaWJlcmFscyB3aW4hJ30pO1xyXG5cdFx0XHRcdFNILmF1ZGlvLmxpYmVyYWxGYW5mYXJlLnBsYXkoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHR0aGlzLmJhbm5lci50ZXh0LmNvbG9yID0gJ3JlZCc7XHJcblx0XHRcdFx0dGhpcy5iYW5uZXIudGV4dC51cGRhdGUoe3RleHQ6ICdGYXNjaXN0cyB3aW4hJ30pO1xyXG5cdFx0XHRcdFNILmF1ZGlvLmZhc2Npc3RGYW5mYXJlLnBsYXkoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dGhpcy5iYW5uZXIucG9zaXRpb24uc2V0KDAsMC44LDApO1xyXG5cdFx0XHR0aGlzLmJhbm5lci5zY2FsZS5zZXRTY2FsYXIoLjAwMSk7XHJcblx0XHRcdHRoaXMuYmFubmVyLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRBbmltYXRlLnNpbXBsZSh0aGlzLmJhbm5lciwge1xyXG5cdFx0XHRcdHBvczogbmV3IFRIUkVFLlZlY3RvcjMoMCwgMS44LCAwKSxcclxuXHRcdFx0XHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMSwxLDEpLFxyXG5cdFx0XHRcdGR1cmF0aW9uOiAxMDAwXHJcblx0XHRcdH0pXHJcblx0XHRcdC50aGVuKCgpID0+IHRoaXMuYmFubmVyLmJvYiA9IEFuaW1hdGUuYm9iKHRoaXMuYmFubmVyKSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdwb2xpY3kxJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcyA+PSAzKVxyXG5cdFx0e1xyXG5cdFx0XHRsZXQgY2hhbmNlbGxvciA9IHBsYXllcnNbZ2FtZS5jaGFuY2VsbG9yXS5kaXNwbGF5TmFtZTtcclxuXHRcdFx0dGhpcy5iYW5uZXIudGV4dC5jb2xvciA9ICd3aGl0ZSc7XHJcblx0XHRcdHRoaXMuYmFubmVyLnRleHQudXBkYXRlKHt0ZXh0OiBgJHtjaGFuY2VsbG9yfSBpcyBub3QgJHt0cignSGl0bGVyJyl9IWB9KTtcclxuXHJcblx0XHRcdHRoaXMuYmFubmVyLnBvc2l0aW9uLnNldCgwLDAuOCwwKTtcclxuXHRcdFx0dGhpcy5iYW5uZXIuc2NhbGUuc2V0U2NhbGFyKC4wMDEpO1xyXG5cdFx0XHR0aGlzLmJhbm5lci52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0QW5pbWF0ZS5zaW1wbGUodGhpcy5iYW5uZXIsIHtcclxuXHRcdFx0XHRwb3M6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEuOCwgMCksXHJcblx0XHRcdFx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDEsMSwxKVxyXG5cdFx0XHR9KVxyXG5cdFx0XHQudGhlbigoKSA9PiB0aGlzLmJhbm5lci5ib2IgPSBBbmltYXRlLmJvYih0aGlzLmJhbm5lcikpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fVxyXG59XHJcbiIsImltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7YWN0aXZlVGhlbWUgYXMgdGhlbWV9IGZyb20gJy4vdGhlbWUnO1xyXG5cclxuY2xhc3MgQXVkaW9TdHJlYW1cclxue1xyXG5cdGNvbnN0cnVjdG9yKGNvbnRleHQsIGJ1ZmZlciwgb3V0cHV0KXtcclxuXHRcdHRoaXMuc291cmNlID0gY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcclxuXHRcdHRoaXMuc291cmNlLmJ1ZmZlciA9IGJ1ZmZlcjtcclxuXHRcdHRoaXMuc291cmNlLmNvbm5lY3Qob3V0cHV0KTtcclxuXHRcdHRoaXMuZmluaXNoZWRQbGF5aW5nID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG5cdFx0XHR0aGlzLl9yZXNvbHZlID0gcmVzb2x2ZTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cGxheSgpe1xyXG5cdFx0aWYoL0FsdHNwYWNlVlIvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpXHJcblx0XHRcdHRoaXMuc291cmNlLnN0YXJ0KDAsIDApO1xyXG5cdFx0c2V0VGltZW91dCh0aGlzLl9yZXNvbHZlLCBNYXRoLmNlaWwodGhpcy5zb3VyY2UuYnVmZmVyLmR1cmF0aW9uKjEwMDAgKyA0MDApKTtcclxuXHR9XHJcblxyXG5cdHN0b3AoKXtcclxuXHRcdHRoaXMuc291cmNlLnN0b3AoKTtcclxuXHR9XHJcbn1cclxuXHJcbmxldCBxdWV1ZWRTdHJlYW1zID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblxyXG5jbGFzcyBBdWRpb0NsaXBcclxue1xyXG5cdGNvbnN0cnVjdG9yKGNvbnRleHQsIHVybCwgdm9sdW1lLCBxdWV1ZWQgPSB0cnVlKVxyXG5cdHtcclxuXHRcdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XHJcblx0XHR0aGlzLm91dHB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xyXG5cdFx0dGhpcy5vdXRwdXQuZ2Fpbi52YWx1ZSA9IHZvbHVtZTtcclxuXHRcdHRoaXMub3V0cHV0LmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7XHJcblxyXG5cdFx0dGhpcy5sb2FkZWQgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblx0XHRcdGxldCBsb2FkZXIgPSBuZXcgVEhSRUUuRmlsZUxvYWRlcigpO1xyXG5cdFx0XHRsb2FkZXIuc2V0UmVzcG9uc2VUeXBlKCdhcnJheWJ1ZmZlcicpO1xyXG5cdFx0XHRsb2FkZXIubG9hZCh1cmwsIGJ1ZmZlciA9PiB7XHJcblx0XHRcdFx0Y29udGV4dC5kZWNvZGVBdWRpb0RhdGEoYnVmZmVyLCBkZWNvZGVkQnVmZmVyID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuYnVmZmVyID0gZGVjb2RlZEJ1ZmZlcjtcclxuXHRcdFx0XHRcdHJlc29sdmUoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KVxyXG5cdH1cclxuXHJcblx0cGxheShxdWV1ZWQgPSBmYWxzZSlcclxuXHR7XHJcblx0XHRyZXR1cm4gdGhpcy5sb2FkZWQudGhlbigoKSA9PiB7XHJcblx0XHRcdGxldCBpbnN0YW5jZSA9IG5ldyBBdWRpb1N0cmVhbSh0aGlzLmNvbnRleHQsIHRoaXMuYnVmZmVyLCB0aGlzLm91dHB1dCk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZihxdWV1ZWQpe1xyXG5cdFx0XHRcdHF1ZXVlZFN0cmVhbXMgPSBxdWV1ZWRTdHJlYW1zLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdFx0aW5zdGFuY2UucGxheSgpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIGluc3RhbmNlLmZpbmlzaGVkUGxheWluZztcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRyZXR1cm4gcXVldWVkU3RyZWFtcztcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRpbnN0YW5jZS5wbGF5KCk7XHJcblx0XHRcdFx0cmV0dXJuIGluc3RhbmNlLmZpbmlzaGVkUGxheWluZztcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYWtlQXVkaW9DbGlwXHJcbntcclxuXHRjb25zdHJ1Y3RvcigpeyB0aGlzLmZha2VzdHJlYW0gPSBuZXcgRmFrZUF1ZGlvU3RyZWFtKCk7IH1cclxuXHRwbGF5KCl7IHJldHVybiBQcm9taXNlLnJlc29sdmUoKTsgfVxyXG59XHJcblxyXG5jbGFzcyBGYWtlQXVkaW9TdHJlYW1cclxue1xyXG5cdGNvbnN0cnVjdG9yKCl7IHRoaXMuZmluaXNoZWRQbGF5aW5nID0gUHJvbWlzZS5yZXNvbHZlKCk7IH1cclxuXHRwbGF5KCl7IH1cclxuXHRzdG9wKCl7IH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXVkaW9Db250cm9sbGVyXHJcbntcclxuXHRjb25zdHJ1Y3RvcigpXHJcblx0e1xyXG5cdFx0bGV0IGNvbnRleHQgPSB0aGlzLmNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XHJcblx0XHR0aGlzLmxpYmVyYWxTdGluZyA9IG5ldyBBdWRpb0NsaXAodGhpcy5jb250ZXh0LCBgL3N0YXRpYy9hdWRpby9oaXRsZXIvbGliZXJhbC1zdGluZy5vZ2dgLCAwLjIpO1xyXG5cdFx0dGhpcy5saWJlcmFsRmFuZmFyZSA9IG5ldyBBdWRpb0NsaXAodGhpcy5jb250ZXh0LCBgL3N0YXRpYy9hdWRpby9oaXRsZXIvbGliZXJhbC1mYW5mYXJlLm9nZ2AsIDAuMik7XHJcblx0XHR0aGlzLmZhc2Npc3RTdGluZyA9IG5ldyBBdWRpb0NsaXAodGhpcy5jb250ZXh0LCBgL3N0YXRpYy9hdWRpby9oaXRsZXIvZmFzY2lzdC1zdGluZy5vZ2dgLCAwLjEpO1xyXG5cdFx0dGhpcy5mYXNjaXN0RmFuZmFyZSA9IG5ldyBBdWRpb0NsaXAodGhpcy5jb250ZXh0LCBgL3N0YXRpYy9hdWRpby9oaXRsZXIvZmFzY2lzdC1mYW5mYXJlLm9nZ2AsIDAuMSk7XHJcblxyXG5cdFx0bGV0IGZha2UgPSBuZXcgRmFrZUF1ZGlvQ2xpcCgpO1xyXG5cdFx0dGhpcy50dXRvcmlhbCA9IHtsb2FkU3RhcnRlZDogZmFsc2V9O1xyXG5cdFx0Wyd3ZWxjb21lJywnbmlnaHQnLCdub21pbmF0aW9uJywndm90aW5nJywndm90ZUZhaWxzJywndm90ZVBhc3NlcycsJ3BvbGljeTEnLCdwb2xpY3kyJywncG9saWN5RmFzY2lzdCcsXHJcblx0XHQncG9saWN5TGliZXJhbCcsJ3BvbGljeUFmdGVybWF0aCcsJ3dyYXB1cCcsJ3Bvd2VyMScsJ3Bvd2VyMicsJ2ludmVzdGlnYXRlJywncGVlaycsJ25hbWVTdWNjZXNzb3InLCdleGVjdXRlJyxcclxuXHRcdCd2ZXRvJywncmVkem9uZSddLmZvckVhY2goeCA9PiB0aGlzLnR1dG9yaWFsW3hdID0gZmFrZSk7XHJcblx0fVxyXG5cclxuXHRsb2FkVHV0b3JpYWwoZ2FtZSlcclxuXHR7XHJcblx0XHRpZighZ2FtZS50dXRvcmlhbCB8fCB0aGlzLnR1dG9yaWFsLmxvYWRTdGFydGVkKSByZXR1cm47XHJcblxyXG5cdFx0bGV0IHJlYWRlciA9IGdhbWUudHV0b3JpYWwsIGNvbnRleHQgPSB0aGlzLmNvbnRleHQsIHZvbHVtZSA9IDAuNTtcclxuXHJcblx0XHRPYmplY3QuYXNzaWduKHRoaXMudHV0b3JpYWwsIHtcclxuXHRcdFx0bG9hZFN0YXJ0ZWQ6IHRydWUsXHJcblx0XHRcdHdlbGNvbWU6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3dlbGNvbWUub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0bmlnaHQ6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL25pZ2h0Lm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdG5vbWluYXRpb246IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL25vbWluYXRpb24ub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0dm90aW5nOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC92b3Rpbmcub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0dm90ZUZhaWxzOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC92b3RlLWZhaWxzLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHZvdGVQYXNzZXM6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3ZvdGUtcGFzc2VkLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBvbGljeTE6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3BvbGljeTEub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cG9saWN5MjogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG9saWN5Mi5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRwb2xpY3lGYXNjaXN0OiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb2xpY3ktZmFzY2lzdC5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRwb2xpY3lMaWJlcmFsOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb2xpY3ktbGliZXJhbC5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRwb2xpY3lBZnRlcm1hdGg6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3BvbGljeS1hZnRlcm1hdGgub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0d3JhcHVwOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC93cmFwdXAub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cG93ZXIxOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlcjEub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cG93ZXIyOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlcjIub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0aW52ZXN0aWdhdGU6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyLWludmVzdGlnYXRlLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBlZWs6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyLXBlZWsub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0bmFtZVN1Y2Nlc3NvcjogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXItbmFtZXN1Y2Nlc3Nvci5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRleGVjdXRlOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlci1leGVjdXRlLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHZldG86IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyLXZldG8ub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cmVkem9uZTogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcmVkem9uZS5vZ2dgLCB2b2x1bWUpXHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuIiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFR1dG9yaWFsTWFuYWdlclxyXG57XHJcblx0Y29uc3RydWN0b3IoKVxyXG5cdHtcclxuXHRcdHRoaXMuZW5hYmxlZCA9IGZhbHNlO1xyXG5cdFx0dGhpcy5sYXN0RXZlbnQgPSBudWxsO1xyXG5cdFx0dGhpcy5wbGF5ZWQgPSBbXTtcclxuXHR9XHJcblxyXG5cdGRldGVjdEV2ZW50KGdhbWUsIHZvdGVzKVxyXG5cdHtcclxuXHRcdGxldCBsYXN0RWxlY3Rpb24gPSB2b3Rlc1tnYW1lLmxhc3RFbGVjdGlvbl07XHJcblx0XHRsZXQgZmlyc3RSb3VuZCA9IGdhbWUuZmFzY2lzdFBvbGljaWVzICsgZ2FtZS5saWJlcmFsUG9saWNpZXMgPT09IDA7XHJcblxyXG5cdFx0aWYoZmlyc3RSb3VuZCAmJiBnYW1lLnN0YXRlID09PSAnbmlnaHQnKVxyXG5cdFx0XHRyZXR1cm4gJ25pZ2h0JztcclxuXHRcdGVsc2UgaWYoZmlyc3RSb3VuZCAmJiBnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnKVxyXG5cdFx0XHRyZXR1cm4gJ25vbWluYXRpb24nO1xyXG5cdFx0ZWxzZSBpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICdlbGVjdGlvbicpXHJcblx0XHRcdHJldHVybiAndm90aW5nJztcclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyAmJiBsYXN0RWxlY3Rpb24ueWVzVm90ZXJzLmxlbmd0aCA8IGxhc3RFbGVjdGlvbi50b1Bhc3MgJiYgIXRoaXMucGxheWVkLmluY2x1ZGVzKCd2b3RlRmFpbHMnKSl7XHJcblx0XHRcdHRoaXMucGxheWVkLnB1c2goJ3ZvdGVGYWlscycpO1xyXG5cdFx0XHRyZXR1cm4gJ3ZvdGVGYWlscyc7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdsYW1lRHVjaycgJiYgbGFzdEVsZWN0aW9uLnllc1ZvdGVycy5sZW5ndGggPj0gbGFzdEVsZWN0aW9uLnRvUGFzcyAmJiAhdGhpcy5wbGF5ZWQuaW5jbHVkZXMoJ3ZvdGVQYXNzZXMnKSl7XHJcblx0XHRcdHRoaXMucGxheWVkLnB1c2goJ3ZvdGVQYXNzZXMnKTtcclxuXHRcdFx0cmV0dXJuICd2b3RlUGFzc2VzJztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZmlyc3RSb3VuZCAmJiBnYW1lLnN0YXRlID09PSAncG9saWN5MScpXHJcblx0XHRcdHJldHVybiAncG9saWN5MSc7XHJcblx0XHRlbHNlIGlmKGZpcnN0Um91bmQgJiYgZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTInKVxyXG5cdFx0XHRyZXR1cm4gJ3BvbGljeTInO1xyXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnYWZ0ZXJtYXRoJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcyA9PT0gMSAmJiBnYW1lLmhhbmQgPT09IDIpXHJcblx0XHRcdHJldHVybiAncG9saWN5RmFzY2lzdCc7XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnICYmIGdhbWUubGliZXJhbFBvbGljaWVzID09PSAxICYmIGdhbWUuaGFuZCA9PT0gMylcclxuXHRcdFx0cmV0dXJuICdwb2xpY3lMaWJlcmFsJztcclxuXHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScgJiYgZ2FtZS5mYXNjaXN0UG9saWNpZXMrZ2FtZS5saWJlcmFsUG9saWNpZXMgPT09IDEpXHJcblx0XHRcdHJldHVybiAnd3JhcHVwJztcclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcyA9PT0gMyAmJiAhdGhpcy5wbGF5ZWQuaW5jbHVkZXMoJ3JlZHpvbmUnKSl7XHJcblx0XHRcdHRoaXMucGxheWVkLnB1c2goJ3JlZHpvbmUnKTtcclxuXHRcdFx0cmV0dXJuICdyZWR6b25lJztcclxuXHRcdH1cclxuXHJcblx0XHRlbHNlIGlmKFsnaW52ZXN0aWdhdGUnLCdwZWVrJywnbmFtZVN1Y2Nlc3NvcicsJ2V4ZWN1dGUnXS5pbmNsdWRlcyhnYW1lLnN0YXRlKSlcclxuXHRcdHtcclxuXHRcdFx0aWYodGhpcy5wbGF5ZWQuaW5jbHVkZXMoZ2FtZS5zdGF0ZSkpXHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblxyXG5cdFx0XHRsZXQgc3RhdGU7XHJcblx0XHRcdGlmKGdhbWUuZmFzY2lzdFBvbGljaWVzID09PSA1KVxyXG5cdFx0XHRcdHN0YXRlID0gJ3ZldG8nO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0c3RhdGUgPSBnYW1lLnN0YXRlO1xyXG5cdFx0XHR0aGlzLnBsYXllZC5wdXNoKHN0YXRlKTtcclxuXHJcblx0XHRcdGlmKCF0aGlzLnBsYXllZC5pbmNsdWRlcygncG93ZXInKSl7XHJcblx0XHRcdFx0c3RhdGUgPSAnZmlyc3RfJytzdGF0ZTtcclxuXHRcdFx0XHR0aGlzLnBsYXllZC5wdXNoKCdwb3dlcicpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gc3RhdGU7XHJcblx0XHR9XHJcblx0XHRlbHNlIHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0c3RhdGVVcGRhdGUoZ2FtZSwgdm90ZXMpXHJcblx0e1xyXG5cdFx0aWYoIWdhbWUudHV0b3JpYWwpIHJldHVybjtcclxuXHJcblx0XHRsZXQgc2VhbWxlc3MgPSB7XHJcblx0XHRcdHBvbGljeUZhc2Npc3Q6IFsncG9saWN5RmFzY2lzdCcsJ3BvbGljeUFmdGVybWF0aCddLFxyXG5cdFx0XHRwb2xpY3lMaWJlcmFsOiBbJ3BvbGljeUxpYmVyYWwnLCdwb2xpY3lBZnRlcm1hdGgnXSxcclxuXHRcdFx0Zmlyc3RfaW52ZXN0aWdhdGU6IFsncG93ZXIxJywncG93ZXIyJywnaW52ZXN0aWdhdGUnXSxcclxuXHRcdFx0Zmlyc3RfcGVlazogWydwb3dlcjEnLCdwb3dlcjInLCdwZWVrJ10sXHJcblx0XHRcdGZpcnN0X25hbWVTdWNjZXNzb3I6IFsncG93ZXIxJywncG93ZXIyJywnbmFtZVN1Y2Nlc3NvciddLFxyXG5cdFx0XHRmaXJzdF9leGVjdXRlOiBbJ3Bvd2VyMScsJ3Bvd2VyMicsJ2V4ZWN1dGUnXSxcclxuXHRcdFx0Zmlyc3RfdmV0bzogWydwb3dlcjEnLCdwb3dlcjInLCd2ZXRvJ10sXHJcblx0XHRcdGludmVzdGlnYXRlOiBbJ3Bvd2VyMScsJ2ludmVzdGlnYXRlJ10sXHJcblx0XHRcdHBlZWs6IFsncG93ZXIxJywncGVlayddLFxyXG5cdFx0XHRuYW1lU3VjY2Vzc29yOiBbJ3Bvd2VyMScsJ25hbWVTdWNjZXNzb3InXSxcclxuXHRcdFx0ZXhlY3V0ZTogWydwb3dlcjEnLCdleGVjdXRlJ10sXHJcblx0XHRcdHZldG86IFsncG93ZXIxJywndmV0byddLFxyXG5cdFx0XHRuaWdodDogWyd3ZWxjb21lJywnbmlnaHQnXVxyXG5cdFx0fTtcclxuXHRcdGxldCBkZWxheWVkID0ge1xyXG5cdFx0XHRwb2xpY3lGYXNjaXN0OiAncG9saWN5QW5pbURvbmUnLFxyXG5cdFx0XHRwb2xpY3lMaWJlcmFsOiAncG9saWN5QW5pbURvbmUnXHJcblx0XHR9O1xyXG5cclxuXHRcdGxldCBldmVudCA9IHRoaXMubGFzdEV2ZW50ID0gdGhpcy5kZXRlY3RFdmVudChnYW1lLCB2b3Rlcyk7XHJcblx0XHRjb25zb2xlLmxvZygndHV0b3JpYWwgZXZlbnQ6JywgZXZlbnQpO1xyXG5cclxuXHRcdGxldCB3YWl0ID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblx0XHRpZihkZWxheWVkW2V2ZW50XSl7XHJcblx0XHRcdHdhaXQgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblx0XHRcdFx0bGV0IGhhbmRsZXIgPSAoKSA9PiB7XHJcblx0XHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKGRlbGF5ZWRbZXZlbnRdLCBoYW5kbGVyKTtcclxuXHRcdFx0XHRcdHJlc29sdmUoKTtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoZGVsYXllZFtldmVudF0sIGhhbmRsZXIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZihzZWFtbGVzc1tldmVudF0pXHJcblx0XHR7XHJcblx0XHRcdHdhaXQudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0c2VhbWxlc3NbZXZlbnRdLmZvckVhY2goY2xpcCA9PiBTSC5hdWRpby50dXRvcmlhbFtjbGlwXS5wbGF5KHRydWUpKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGV2ZW50ICE9PSBudWxsKVxyXG5cdFx0e1xyXG5cdFx0XHR3YWl0LnRoZW4oKCkgPT4gU0guYXVkaW8udHV0b3JpYWxbZXZlbnRdLnBsYXkodHJ1ZSkpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iLCJpbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5cclxuY29uc3QgaXRlbVNpemUgPSAwLjI1O1xyXG5jb25zdCBtYXJnaW4gPSAwLjI1O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQnV0dG9uR3JvdXAgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3IocGFyZW50KVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHRwYXJlbnQuYWRkKHRoaXMpO1xyXG5cclxuXHRcdHRoaXMuX2J1dHRvbkdlbyA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeShpdGVtU2l6ZSwgaXRlbVNpemUsIGl0ZW1TaXplKTtcclxuXHJcblx0XHQvLyByZXNldCBidXR0b25cclxuXHRcdGlmKFNILmxvY2FsVXNlci5pc01vZGVyYXRvcilcclxuXHRcdHtcclxuXHRcdFx0bGV0IHJlc2V0ID0gbmV3IFRIUkVFLk1lc2goXHJcblx0XHRcdFx0dGhpcy5fYnV0dG9uR2VvLFxyXG5cdFx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBTS5jYWNoZS50ZXh0dXJlcy5yZXNldH0pXHJcblx0XHRcdCk7XHJcblx0XHRcdHJlc2V0LmFkZEJlaGF2aW9yKCBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlclNjYWxlKCkgKTtcclxuXHRcdFx0cmVzZXQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCAoKSA9PiB7XHJcblx0XHRcdFx0aWYoU0gubG9jYWxVc2VyLmlzTW9kZXJhdG9yKXtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXF1ZXN0aW5nIHJlc2V0Jyk7XHJcblx0XHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgncmVzZXQnKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0XHR0aGlzLmFkZChyZXNldCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gcmVmcmVzaCBidXR0b25cclxuXHRcdGxldCByZWZyZXNoID0gbmV3IFRIUkVFLk1lc2goXHJcblx0XHRcdHRoaXMuX2J1dHRvbkdlbyxcclxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IEFNLmNhY2hlLnRleHR1cmVzLnJlZnJlc2h9KVxyXG5cdFx0KTtcclxuXHRcdHJlZnJlc2guYWRkQmVoYXZpb3IoIG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLkhvdmVyU2NhbGUoKSApO1xyXG5cdFx0cmVmcmVzaC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsICgpID0+IHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKSk7XHJcblx0XHR0aGlzLmFkZChyZWZyZXNoKTtcclxuXHJcblx0XHQvLyBsYXkgb3V0IGJ1dHRvbnNcclxuXHRcdHRoaXMubGF5T3V0Q2hpbGRyZW4oKTtcclxuXHR9XHJcblx0XHJcblx0bGF5T3V0Q2hpbGRyZW4oKVxyXG5cdHtcclxuXHRcdHRoaXMuY2hpbGRyZW4uZm9yRWFjaCgoYnRuLCBpLCBhcnIpID0+XHJcblx0XHR7XHJcblx0XHRcdGxldCBsZWZ0ID0gLSgxK21hcmdpbikqaXRlbVNpemUqKGFyci5sZW5ndGgtMSkvMjtcclxuXHRcdFx0bGV0IGVhY2ggPSAoMSttYXJnaW4pKml0ZW1TaXplO1xyXG5cclxuXHRcdFx0YnRuLnBvc2l0aW9uLnNldChsZWZ0K2VhY2gqaSwgMCwgMCk7XHJcblx0XHR9KTtcclxuXHR9XHJcbn0iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgJy4vcG9seWZpbGwnO1xyXG5cclxuaW1wb3J0IHthY3RpdmVUaGVtZSBhcyB0aGVtZX0gZnJvbSAnLi90aGVtZSc7XHJcblxyXG5pbXBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfSBmcm9tICcuL2hhdHMnO1xyXG5pbXBvcnQgR2FtZVRhYmxlIGZyb20gJy4vdGFibGUnO1xyXG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcclxuaW1wb3J0IHsgZ2V0R2FtZUlkLCBtZXJnZU9iamVjdHMgfSBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XHJcbmltcG9ydCBTZWF0IGZyb20gJy4vc2VhdCc7XHJcbmltcG9ydCBQbGF5ZXJNZXRlciBmcm9tICcuL3BsYXllcm1ldGVyJztcclxuaW1wb3J0IENvbnRpbnVlQm94IGZyb20gJy4vY29udGludWVib3gnO1xyXG5pbXBvcnQgRWxlY3Rpb25UcmFja2VyIGZyb20gJy4vZWxlY3Rpb250cmFja2VyJztcclxuaW1wb3J0IFByZXNlbnRhdGlvbiBmcm9tICcuL3ByZXNlbnRhdGlvbic7XHJcbmltcG9ydCBBdWRpb0NvbnRyb2xsZXIgZnJvbSAnLi9hdWRpb2NvbnRyb2xsZXInO1xyXG5pbXBvcnQgVHV0b3JpYWwgZnJvbSAnLi90dXRvcmlhbCc7XHJcbmltcG9ydCBCdXR0b25Hcm91cCBmcm9tICcuL2J1dHRvbmdyb3VwJztcclxuaW1wb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5UZXh0fSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xyXG5cclxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5hc3NldHMgPSBBc3NldE1hbmFnZXIubWFuaWZlc3Q7XHJcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcclxuXHRcdHRoaXMubmVlZHNTa2VsZXRvbiA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIHBvbHlmaWxsIGdldFVzZXIgZnVuY3Rpb25cclxuXHRcdGlmKCFhbHRzcGFjZS5pbkNsaWVudCl7XHJcblx0XHRcdGFsdHNwYWNlLmdldFVzZXIgPSAoKSA9PiB7XHJcblx0XHRcdFx0bGV0IGlkLCByZSA9IC9bPyZddXNlcklkPShcXGQrKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcclxuXHRcdFx0XHRpZihyZSlcclxuXHRcdFx0XHRcdGlkID0gcmVbMV07XHJcblx0XHRcdFx0ZWxzZVxyXG5cdFx0XHRcdFx0aWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCkudG9TdHJpbmcoKTtcclxuXHJcblx0XHRcdFx0YWx0c3BhY2UuX2xvY2FsVXNlciA9IHtcclxuXHRcdFx0XHRcdHVzZXJJZDogaWQsXHJcblx0XHRcdFx0XHRkaXNwbGF5TmFtZTogaWQsXHJcblx0XHRcdFx0XHRpc01vZGVyYXRvcjogL2lzTW9kZXJhdG9yLy50ZXN0KHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnTWFzcXVlcmFkaW5nIGFzJywgYWx0c3BhY2UuX2xvY2FsVXNlcik7XHJcblx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShhbHRzcGFjZS5fbG9jYWxVc2VyKTtcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBnZXQgbG9jYWwgdXNlclxyXG5cdFx0dGhpcy5fdXNlclByb21pc2UgPSBhbHRzcGFjZS5nZXRVc2VyKCk7XHJcblx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKHVzZXIgPT4ge1xyXG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcclxuXHRcdFx0XHRpZDogdXNlci51c2VySWQsXHJcblx0XHRcdFx0ZGlzcGxheU5hbWU6IHVzZXIuZGlzcGxheU5hbWUsXHJcblx0XHRcdFx0aXNNb2RlcmF0b3I6IHVzZXIuaXNNb2RlcmF0b3JcclxuXHRcdFx0fTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuZ2FtZSA9IHt9O1xyXG5cdFx0dGhpcy5wbGF5ZXJzID0ge307XHJcblx0XHR0aGlzLnZvdGVzID0ge307XHJcblx0fVxyXG5cclxuXHRpbml0aWFsaXplKGVudiwgcm9vdCwgYXNzZXRzKVxyXG5cdHtcclxuXHRcdGlmKCF0aGlzLmxvY2FsVXNlcil7XHJcblx0XHRcdHRoaXMuX3VzZXJQcm9taXNlLnRoZW4oKCkgPT4gdGhpcy5pbml0aWFsaXplKGVudiwgcm9vdCwgYXNzZXRzKSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBzaGFyZSB0aGUgZGlvcmFtYSBpbmZvXHJcblx0XHRBc3NldE1hbmFnZXIuY2FjaGUgPSBhc3NldHM7XHJcblx0XHRBc3NldE1hbmFnZXIuZml4TWF0ZXJpYWxzKCk7XHJcblx0XHR0aGlzLmVudiA9IGVudjtcclxuXHJcblx0XHQvLyBjb25uZWN0IHRvIHNlcnZlclxyXG5cdFx0dGhpcy5zb2NrZXQgPSBpby5jb25uZWN0KCcvJywge3F1ZXJ5OiBgZ2FtZUlkPSR7Z2V0R2FtZUlkKCl9JnRoZW1lPSR7dGhlbWV9YH0pO1xyXG5cclxuXHRcdC8vIHNwYXduIHNlbGYtc2VydmUgdHV0b3JpYWwgZGlhbG9nXHJcblx0XHRpZihhbHRzcGFjZS5pbkNsaWVudCl7XHJcblx0XHRcdGFsdHNwYWNlLm9wZW4od2luZG93LmxvY2F0aW9uLm9yaWdpbisnL3N0YXRpYy90dXRvcmlhbC5odG1sJywgJ19leHBlcmllbmNlJyxcclxuXHRcdFx0XHR7aGlkZGVuOiB0cnVlLCBpY29uOiB3aW5kb3cubG9jYXRpb24ub3JpZ2luKycvc3RhdGljL2ltZy9jYWVzYXIvaWNvbi5wbmcnfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoZW52LnRlbXBsYXRlU2lkID09PSAnY29uZmVyZW5jZS1yb29tLTk1NScpXHJcblx0XHR7XHJcblx0XHRcdHRoaXMubWVzc2FnZSA9IFBsYWNlaG9sZGVyTWVzaC5jbG9uZSgpO1xyXG5cdFx0XHR0aGlzLm1lc3NhZ2UucG9zaXRpb24uc2V0KDYsIDIsIDApO1xyXG5cdFx0XHR0aGlzLm1lc3NhZ2Uucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLzIsIDApO1xyXG5cdFx0XHRsZXQgbnRleHQgPSBuZXcgTlRleHQodGhpcy5tZXNzYWdlKTtcclxuXHRcdFx0bnRleHQuY29sb3IgPSAnd2hpdGUnO1xyXG5cdFx0XHRudGV4dC51cGRhdGUoe1xyXG5cdFx0XHRcdHRleHQ6ICdJZiB0aGluZ3MgZ2V0IHN0dWNrLCBoYXZlIHRoZSBicm9rZW4gdXNlciBoaXQgdGhlIFwicmVmcmVzaFwiIGJ1dHRvbiB1bmRlciB0aGUgdGFibGUuIC1NZ210JyxcclxuXHRcdFx0XHRmb250U2l6ZTogMixcclxuXHRcdFx0XHR3aWR0aDogM1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGhpcy5hZGQodGhpcy5tZXNzYWdlKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmF1ZGlvID0gbmV3IEF1ZGlvQ29udHJvbGxlcigpO1xyXG5cdFx0dGhpcy50dXRvcmlhbCA9IG5ldyBUdXRvcmlhbCgpO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSB0aGUgdGFibGVcclxuXHRcdHRoaXMudGFibGUgPSBuZXcgR2FtZVRhYmxlKCk7XHJcblx0XHR0aGlzLmFkZCh0aGlzLnRhYmxlKTtcclxuXHJcblx0XHRsZXQgYmcxID0gbmV3IEJ1dHRvbkdyb3VwKHRoaXMudGFibGUpO1xyXG5cdFx0YmcxLnBvc2l0aW9uLnNldCgwLCAtLjE4LCAtLjc0KTtcclxuXHRcdGxldCBiZzIgPSBuZXcgQnV0dG9uR3JvdXAodGhpcy50YWJsZSk7XHJcblx0XHRiZzIucG9zaXRpb24uc2V0KC0xLjEyLCAtLjE4LCAwKTtcclxuXHRcdGJnMi5yb3RhdGlvbi5zZXQoMCwgTWF0aC5QSS8yLCAwKTtcclxuXHRcdGxldCBiZzMgPSBuZXcgQnV0dG9uR3JvdXAodGhpcy50YWJsZSk7XHJcblx0XHRiZzMucG9zaXRpb24uc2V0KDAsIC0uMTgsIC43NCk7XHJcblx0XHRiZzMucm90YXRpb24uc2V0KDAsIE1hdGguUEksIDApO1xyXG5cdFx0bGV0IGJnNCA9IG5ldyBCdXR0b25Hcm91cCh0aGlzLnRhYmxlKTtcclxuXHRcdGJnNC5wb3NpdGlvbi5zZXQoMS4xMiwgLS4xOCwgMCk7XHJcblx0XHRiZzQucm90YXRpb24uc2V0KDAsIE1hdGguUEkqMS41LCAwKTtcclxuXHJcblx0XHR0aGlzLnByZXNlbnRhdGlvbiA9IG5ldyBQcmVzZW50YXRpb24oKTtcclxuXHJcblx0XHQvLyBjcmVhdGUgaGF0c1xyXG5cdFx0dGhpcy5wcmVzaWRlbnRIYXQgPSBuZXcgUHJlc2lkZW50SGF0KCk7XHJcblx0XHR0aGlzLmNoYW5jZWxsb3JIYXQgPSBuZXcgQ2hhbmNlbGxvckhhdCgpO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBwb3NpdGlvbnNcclxuXHRcdHRoaXMuc2VhdHMgPSBbXTtcclxuXHRcdGZvcihsZXQgaT0wOyBpPDEwOyBpKyspe1xyXG5cdFx0XHR0aGlzLnNlYXRzLnB1c2goIG5ldyBTZWF0KGkpICk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy50YWJsZS5hZGQoLi4udGhpcy5zZWF0cyk7XHJcblxyXG5cdFx0Ly90aGlzLnBsYXllck1ldGVyID0gbmV3IFBsYXllck1ldGVyKCk7XHJcblx0XHQvL3RoaXMudGFibGUuYWRkKHRoaXMucGxheWVyTWV0ZXIpO1xyXG5cdFx0dGhpcy5jb250aW51ZUJveCA9IG5ldyBDb250aW51ZUJveCh0aGlzLnRhYmxlKTtcclxuXHJcblx0XHR0aGlzLmVsZWN0aW9uVHJhY2tlciA9IG5ldyBFbGVjdGlvblRyYWNrZXIoKTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5vbigndXBkYXRlJywgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xyXG5cdFx0dGhpcy5zb2NrZXQub24oJ2NoZWNrZWRfaW4nLCB0aGlzLmNoZWNrZWRJbi5iaW5kKHRoaXMpKTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5vbigncmVzZXQnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XHJcblx0XHQvL3RoaXMuc29ja2V0Lm9uKCdkaXNjb25uZWN0JywgdGhpcy5kb1Jlc2V0LmJpbmQodGhpcykpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlRnJvbVNlcnZlcihnZCwgcGQsIHZkKVxyXG5cdHtcclxuXHRcdGNvbnNvbGUubG9nKGdkLCBwZCwgdmQpO1xyXG5cclxuXHRcdGxldCBnYW1lID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nYW1lLCBnZCk7XHJcblx0XHRsZXQgcGxheWVycyA9IG1lcmdlT2JqZWN0cyh0aGlzLnBsYXllcnMsIHBkIHx8IHt9KTtcclxuXHRcdGxldCB2b3RlcyA9IG1lcmdlT2JqZWN0cyh0aGlzLnZvdGVzLCB2ZCB8fCB7fSk7XHJcblxyXG5cdFx0aWYoZ2QudHV0b3JpYWwpXHJcblx0XHRcdHRoaXMuYXVkaW8ubG9hZFR1dG9yaWFsKGdhbWUpO1xyXG5cclxuXHRcdGlmKGdkLnN0YXRlKVxyXG5cdFx0XHR0aGlzLnR1dG9yaWFsLnN0YXRlVXBkYXRlKGdhbWUsIHZvdGVzKTtcclxuXHJcblx0XHRmb3IobGV0IGZpZWxkIGluIGdkKVxyXG5cdFx0e1xyXG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe1xyXG5cdFx0XHRcdHR5cGU6ICd1cGRhdGVfJytmaWVsZCxcclxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcclxuXHRcdFx0XHRkYXRhOiB7XHJcblx0XHRcdFx0XHRnYW1lOiBnYW1lLFxyXG5cdFx0XHRcdFx0cGxheWVyczogcGxheWVycyxcclxuXHRcdFx0XHRcdHZvdGVzOiB2b3Rlc1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5fdXNlclByb21pc2UudGhlbigoKSA9PiB7XHJcblx0XHRcdGlmKHBsYXllcnNbdGhpcy5sb2NhbFVzZXIuaWRdICYmICFwbGF5ZXJzW3RoaXMubG9jYWxVc2VyLmlkXS5jb25uZWN0ZWQpe1xyXG5cdFx0XHRcdHRoaXMuc29ja2V0LmVtaXQoJ2NoZWNrX2luJywgdGhpcy5sb2NhbFVzZXIpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xyXG5cdFx0dGhpcy5wbGF5ZXJzID0gcGxheWVycztcclxuXHRcdHRoaXMudm90ZXMgPSB2b3RlcztcclxuXHR9XHJcblxyXG5cdGNoZWNrZWRJbihwKVxyXG5cdHtcclxuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5wbGF5ZXJzW3AuaWRdLCBwKTtcclxuXHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7XHJcblx0XHRcdHR5cGU6ICdjaGVja2VkX2luJyxcclxuXHRcdFx0YnViYmxlczogZmFsc2UsXHJcblx0XHRcdGRhdGE6IHAuaWRcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0ZG9SZXNldChnYW1lLCBwbGF5ZXJzLCB2b3RlcylcclxuXHR7XHJcblx0XHR3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgbmV3IFNlY3JldEhpdGxlcigpO1xyXG4iXSwibmFtZXMiOlsibGV0IiwiY29uc3QiLCJ0aGVtZSIsInRoaXMiLCJzdXBlciIsIkFNIiwiQXNzZXRNYW5hZ2VyIiwiY2FyZCIsInRyIiwiQmFsbG90VHlwZS5DT05GSVJNIiwidXBkYXRlU3RhdGUiLCJCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCIsIkJhbGxvdFR5cGUuUE9MSUNZIiwib3B0cyIsImNsZWFuVXBGYWtlVm90ZSIsIkJQLnVwZGF0ZVZvdGVzSW5Qcm9ncmVzcyIsIkJQLnVwZGF0ZVN0YXRlIiwiQlBCQS50b0FycmF5IiwiQlBCQS5MSUJFUkFMIiwiYmIiLCJwb3NpdGlvbnMiLCJhc3NldHMiLCJUdXRvcmlhbCJdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO0NBQzVCLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUU7RUFDbEQsS0FBSyxFQUFFLFNBQVMsSUFBSSxDQUFDO0dBQ3BCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztHQUMvQjtFQUNELFFBQVEsRUFBRSxLQUFLO0VBQ2YsVUFBVSxFQUFFLEtBQUs7RUFDakIsWUFBWSxFQUFFLEtBQUs7RUFDbkIsQ0FBQyxDQUFDO0NBQ0g7O0FDWERBLElBQUksV0FBVyxHQUFHLFFBQVEs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QUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMs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QkFDWSxDQUFDLElBQUk7Q0FDaEI7OztFQUNDSSxVQUFLLEtBQUEsQ0FBQyxJQUFBLENBQUMsQ0FBQzs7RUFFUixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztFQUNqQixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7O0VBR2YsSUFBSSxDQUFDLEtBQUssR0FBR0MsTUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUMzRCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNsRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDakMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7OztFQUdyQixJQUFJLENBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDNUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQztFQUN2QyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztFQUM1QyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQztHQUNqRCxHQUFHLEVBQUUsSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7R0FDdEMsQ0FBQyxDQUFDOzs7RUFHSCxJQUFJLENBQUMs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TUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztFQUNwQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7RUFFckMsS0FBS0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFO0VBQzdCO0dBQ0MsS0FBS0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO0dBQzNCO0lBQ0NBLElBQUksTUFBTSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7O0lBR3RDLEtBQUssQ0FBQyxHQUFHLENBQUM7S0FDVCxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3JDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7SUFFWCxLQUFLLENBQUMsR0FBRyxDQUFDO0tBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3RDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7SUFFWEEsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQ0EsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQ0EsSUFBSSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2pFQSxJQUFJLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDakUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ1YsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkI7OztJQUdELEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFDVjtLQUNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2hELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2hEOztJQUVEO0tBQ0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDbEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0tBRWxELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xEO0lBQ0Q7OztHQUdEQSxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUM3Q0EsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDN0MsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ1YsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDckIsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDckI7O0dBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FDNUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FDNUM7O0VBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ25FLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsZUFBZSxD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LENBQUMsQ0FBQzs7RUFFckJ0QixJQUFJLEdBQUcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDdEMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDaENBLElBQUksR0FBRyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUN0QyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNqQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDbENBLElBQUksR0FBRyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUN0QyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDL0IsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDaENBLElBQUksR0FBRyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUN0QyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDaEMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDOztFQUVwQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7OztFQUd2QyxJQUFJLENB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
