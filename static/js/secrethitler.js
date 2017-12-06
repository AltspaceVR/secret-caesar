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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvcG9seWZpbGwuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RoZW1lLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hc3NldG1hbmFnZXIuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hdGl2ZWNvbXBvbmVudHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JlaGF2aW9yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hbmltYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jYXJkLmpzIiwiLi4vLi4vc3JjL2NsaWVudC90YWJsZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdXRpbHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hbWVwbGF0ZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmFsbG90cHJvY2Vzc29yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9icGJhLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3QuanMiLCIuLi8uLi9zcmMvY2xpZW50L3BsYXllcmluZm8uanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcHN1bGVnZW9tZXRyeS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvaGl0Ym94LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWF0LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jb250aW51ZWJveC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvZWxlY3Rpb250cmFja2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9wcmVzZW50YXRpb24uanMiLCIuLi8uLi9zcmMvY2xpZW50L2F1ZGlvY29udHJvbGxlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdHV0b3JpYWwuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlY3JldGhpdGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmlmKCFBcnJheS5wcm90b3R5cGUuaW5jbHVkZXMpe1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAnaW5jbHVkZXMnLCB7XG5cdFx0dmFsdWU6IGZ1bmN0aW9uKGl0ZW0pe1xuXHRcdFx0cmV0dXJuIHRoaXMuaW5kZXhPZihpdGVtKSA+IC0xO1xuXHRcdH0sXG5cdFx0d3JpdGFibGU6IGZhbHNlLFxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2Vcblx0fSk7XG59XG4iLCJsZXQgYWN0aXZlVGhlbWUgPSAnaGl0bGVyJztcbmlmKC9jYWVzYXIvLnRlc3Qod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKSl7XG5cdGFjdGl2ZVRoZW1lID0gJ2NhZXNhcic7XG59XG5cbmNvbnN0IHRoZW1lcyA9IHtcblx0aGl0bGVyOiB7XG5cdFx0aGl0bGVyOiAnaGl0bGVyJyxcblx0XHRwcmVzaWRlbnQ6ICdwcmVzaWRlbnQnLFxuXHRcdGNoYW5jZWxsb3I6ICdjaGFuY2VsbG9yJ1xuXHR9LFxuXHRjYWVzYXI6IHtcblx0XHRoaXRsZXI6ICdjYWVzYXInLFxuXHRcdHByZXNpZGVudDogJ2NvbnN1bCcsXG5cdFx0Y2hhbmNlbGxvcjogJ3ByYWV0b3InXG5cdH1cbn1cblxuZnVuY3Rpb24gdHJhbnNsYXRlKHN0cmluZylcbntcblx0bGV0IGtleSA9IHN0cmluZy50b0xvd2VyQ2FzZSgpLFxuXHRcdHZhbHVlID0gdGhlbWVzW2FjdGl2ZVRoZW1lXVtrZXldIHx8IHRoZW1lcy5oaXRsZXJba2V5XSB8fCBzdHJpbmc7XG5cblx0Ly8gc3RhcnRzIHdpdGggdXBwZXIgY2FzZSwgcmVzdCBpcyBsb3dlclxuXHRsZXQgaXNQcm9wZXIgPSBzdHJpbmcuY2hhckF0KDApID09IHN0cmluZy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSAmJiBzdHJpbmcuc2xpY2UoMSkgPT0gc3RyaW5nLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG5cdGlmKGlzUHJvcGVyKXtcblx0XHR2YWx1ZSA9IHZhbHVlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdmFsdWUuc2xpY2UoMSk7XG5cdH1cblxuXHRyZXR1cm4gdmFsdWU7XG59XG5cbmV4cG9ydCB7dHJhbnNsYXRlLCBhY3RpdmVUaGVtZX0iLCJpbXBvcnQge2FjdGl2ZVRoZW1lIGFzIHRoZW1lfSBmcm9tICcuL3RoZW1lJztcblxubGV0IHRoZW1lTW9kZWxzID0ge1xuXHRjYWVzYXI6IHtcblx0XHRsYXVyZWxzOiAnL3N0YXRpYy9tb2RlbC9sYXVyZWxzLmdsdGYnXG5cdH0sXG5cdGhpdGxlcjoge1xuXHRcdHRvcGhhdDogJy9zdGF0aWMvbW9kZWwvdG9waGF0LmdsdGYnLFxuXHRcdHZpc29yY2FwOiAnL3N0YXRpYy9tb2RlbC92aXNvcl9jYXAuZ2x0Zidcblx0fVxufTtcblxubGV0IGFzc2V0cyA9IHtcblx0bWFuaWZlc3Q6IHtcblx0XHRtb2RlbHM6IE9iamVjdC5hc3NpZ24oe1xuXHRcdFx0dGFibGU6ICcvc3RhdGljL21vZGVsL3RhYmxlLmdsdGYnLFxuXHRcdFx0bmFtZXBsYXRlOiAnL3N0YXRpYy9tb2RlbC9uYW1lcGxhdGUuZGFlJyxcblx0XHRcdC8vZHVtbXk6ICcvc3RhdGljL21vZGVsL2R1bW15LmdsdGYnLFxuXHRcdFx0Ly9wbGF5ZXJtZXRlcjogJy9zdGF0aWMvbW9kZWwvcGxheWVybWV0ZXIuZ2x0Zidcblx0XHR9LCB0aGVtZU1vZGVsc1t0aGVtZV0pLFxuXHRcdHRleHR1cmVzOiB7XG5cdFx0XHRib2FyZF9sYXJnZTogYC9zdGF0aWMvaW1nLyR7dGhlbWV9L2JvYXJkLWxhcmdlLmpwZ2AsXG5cdFx0XHRib2FyZF9tZWQ6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1tZWRpdW0uanBnYCxcblx0XHRcdGJvYXJkX3NtYWxsOiBgL3N0YXRpYy9pbWcvJHt0aGVtZX0vYm9hcmQtc21hbGwuanBnYCxcblx0XHRcdGNhcmRzOiBgL3N0YXRpYy9pbWcvJHt0aGVtZX0vY2FyZHMuanBnYCxcblx0XHRcdHJlc2V0OiAnL3N0YXRpYy9pbWcvYm9tYi5wbmcnLFxuXHRcdFx0cmVmcmVzaDogJy9zdGF0aWMvaW1nL3JlZnJlc2guanBnJ1xuXHRcdFx0Ly90ZXh0OiAnL3N0YXRpYy9pbWcvdGV4dC5wbmcnXG5cdFx0fVxuXHR9LFxuXHRjYWNoZToge30sXG5cdGZpeE1hdGVyaWFsczogZnVuY3Rpb24oKVxuXHR7XG5cdFx0T2JqZWN0LmtleXModGhpcy5jYWNoZS5tb2RlbHMpLmZvckVhY2goaWQgPT4ge1xuXHRcdFx0dGhpcy5jYWNoZS5tb2RlbHNbaWRdLnRyYXZlcnNlKG9iaiA9PiB7XG5cdFx0XHRcdGlmKG9iai5tYXRlcmlhbCBpbnN0YW5jZW9mIFRIUkVFLk1lc2hTdGFuZGFyZE1hdGVyaWFsKXtcblx0XHRcdFx0XHRsZXQgbmV3TWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKCk7XG5cdFx0XHRcdFx0bmV3TWF0Lm1hcCA9IG9iai5tYXRlcmlhbC5tYXA7XG5cdFx0XHRcdFx0bmV3TWF0LmNvbG9yLmNvcHkob2JqLm1hdGVyaWFsLmNvbG9yKTtcblx0XHRcdFx0XHRuZXdNYXQudHJhbnNwYXJlbnQgPSBvYmoubWF0ZXJpYWwudHJhbnNwYXJlbnQ7XG5cdFx0XHRcdFx0bmV3TWF0LnNpZGUgPSBvYmoubWF0ZXJpYWwuc2lkZTtcblx0XHRcdFx0XHRvYmoubWF0ZXJpYWwgPSBuZXdNYXQ7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFzc2V0czsiLCIndXNlIHN0cmljdCc7XG5cbmxldCBwbGFjZWhvbGRlckdlbyA9IG5ldyBUSFJFRS5Cb3hCdWZmZXJHZW9tZXRyeSguMDAxLCAuMDAxLCAuMDAxKTtcbmxldCBwbGFjZWhvbGRlck1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4ZmZmZmZmLCB2aXNpYmxlOiBmYWxzZX0pO1xubGV0IFBsYWNlaG9sZGVyTWVzaCA9IG5ldyBUSFJFRS5NZXNoKHBsYWNlaG9sZGVyR2VvLCBwbGFjZWhvbGRlck1hdCk7XG5cbmNsYXNzIE5hdGl2ZUNvbXBvbmVudFxue1xuXHRjb25zdHJ1Y3RvcihtZXNoLCBuZWVkc1VwZGF0ZSlcblx0e1xuXHRcdHRoaXMubWVzaCA9IG1lc2g7XG5cdFx0YWx0c3BhY2UuYWRkTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lKTtcblxuXHRcdGlmKG5lZWRzVXBkYXRlKVxuXHRcdFx0dGhpcy51cGRhdGUoKTtcblx0fVxuXG5cdHVwZGF0ZShmaWVsZHMgPSB7fSlcblx0e1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5kYXRhLCBmaWVsZHMpO1xuXHRcdGFsdHNwYWNlLnVwZGF0ZU5hdGl2ZUNvbXBvbmVudCh0aGlzLm1lc2gsIHRoaXMubmFtZSwgdGhpcy5kYXRhKTtcblx0fVxuXG5cdGRlc3Ryb3koKVxuXHR7XG5cdFx0YWx0c3BhY2UucmVtb3ZlTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lKTtcblx0fVxufVxuXG5jbGFzcyBOVGV4dCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKG1lc2gpe1xuXHRcdHRoaXMubmFtZSA9ICduLXRleHQnO1xuXHRcdHRoaXMuZGF0YSA9IHtcblx0XHRcdGZvbnRTaXplOiAxMCxcblx0XHRcdGhlaWdodDogMSxcblx0XHRcdHdpZHRoOiAxMCxcblx0XHRcdHZlcnRpY2FsQWxpZ246ICdtaWRkbGUnLFxuXHRcdFx0aG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJyxcblx0XHRcdHRleHQ6ICcnXG5cdFx0fTtcblx0XHRzdXBlcihtZXNoLCB0cnVlKTtcblxuXHRcdHRoaXMuY29sb3IgPSAnYmxhY2snO1xuXHR9XG5cdHVwZGF0ZShmaWVsZHMgPSB7fSl7XG5cdFx0aWYoZmllbGRzLnRleHQpXG5cdFx0XHRmaWVsZHMudGV4dCA9IGA8Y29sb3I9JHt0aGlzLmNvbG9yfT4ke2ZpZWxkcy50ZXh0fTwvY29sb3I+YDtcblx0XHROYXRpdmVDb21wb25lbnQucHJvdG90eXBlLnVwZGF0ZS5jYWxsKHRoaXMsIGZpZWxkcyk7XG5cdH1cbn1cblxuY2xhc3MgTlNrZWxldG9uUGFyZW50IGV4dGVuZHMgTmF0aXZlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IobWVzaCl7XG5cdFx0dGhpcy5uYW1lID0gJ24tc2tlbGV0b24tcGFyZW50Jztcblx0XHR0aGlzLmRhdGEgPSB7XG5cdFx0XHRpbmRleDogMCxcblx0XHRcdHBhcnQ6ICdoZWFkJyxcblx0XHRcdHNpZGU6ICdjZW50ZXInLCBcblx0XHRcdHVzZXJJZDogMFxuXHRcdH07XG5cdFx0c3VwZXIobWVzaCwgdHJ1ZSk7XG5cdH1cbn1cblxuY2xhc3MgTkJpbGxib2FyZCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKG1lc2gpe1xuXHRcdHRoaXMubmFtZSA9ICduLWJpbGxib2FyZCc7XG5cdFx0c3VwZXIobWVzaCwgZmFsc2UpO1xuXHR9XG59XG5cbmV4cG9ydCB7UGxhY2Vob2xkZXJNZXNoLCBOVGV4dCwgTlNrZWxldG9uUGFyZW50LCBOQmlsbGJvYXJkfTsiLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtOU2tlbGV0b25QYXJlbnR9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XG5pbXBvcnQge2FjdGl2ZVRoZW1lIGFzIHRoZW1lfSBmcm9tICcuL3RoZW1lJztcblxuY2xhc3MgSGF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IobW9kZWwpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuY3VycmVudElkID0gJyc7XG5cdFx0dGhpcy5jb21wb25lbnRzID0ge2hhdDogbnVsbCwgdGV4dDogbnVsbH07XG5cdFx0XG5cdFx0aWYobW9kZWwucGFyZW50KVxuXHRcdFx0bW9kZWwucGFyZW50LnJlbW92ZShtb2RlbCk7XG5cdFx0bW9kZWwudXBkYXRlTWF0cml4V29ybGQodHJ1ZSk7XG5cblx0XHQvLyBncmFiIG1lc2hlc1xuXHRcdGxldCBwcm9wID0gJyc7XG5cdFx0bW9kZWwudHJhdmVyc2Uob2JqID0+IHtcblx0XHRcdGlmKG9iai5uYW1lID09PSAnaGF0JyB8fCBvYmoubmFtZSA9PT0gJ3RleHQnKXtcblx0XHRcdFx0cHJvcCA9IG9iai5uYW1lO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZihvYmogaW5zdGFuY2VvZiBUSFJFRS5NZXNoKXtcblx0XHRcdFx0dGhpc1twcm9wXSA9IG9iajtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIHN0cmlwIG91dCBtaWRkbGUgbm9kZXNcblx0XHRpZih0aGlzLmhhdCl7XG5cdFx0XHR0aGlzLmhhdC5tYXRyaXguY29weSh0aGlzLmhhdC5tYXRyaXhXb3JsZCk7XG5cdFx0XHR0aGlzLmhhdC5tYXRyaXguZGVjb21wb3NlKHRoaXMuaGF0LnBvc2l0aW9uLCB0aGlzLmhhdC5xdWF0ZXJuaW9uLCB0aGlzLmhhdC5zY2FsZSk7XG5cdFx0XHR0aGlzLmFkZCh0aGlzLmhhdCk7XG5cdFx0fVxuXG5cdFx0aWYodGhpcy50ZXh0KXtcblx0XHRcdHRoaXMudGV4dC5tYXRyaXguY29weSh0aGlzLnRleHQubWF0cml4V29ybGQpO1xuXHRcdFx0dGhpcy50ZXh0Lm1hdHJpeC5kZWNvbXBvc2UodGhpcy50ZXh0LnBvc2l0aW9uLCB0aGlzLnRleHQucXVhdGVybmlvbiwgdGhpcy50ZXh0LnNjYWxlKTtcblx0XHRcdHRoaXMuYWRkKHRoaXMudGV4dCk7XG5cdFx0fVxuXG5cdFx0ZC5zY2VuZS5hZGQodGhpcyk7XG5cdH1cblxuXHRzZXRPd25lcih1c2VySWQpXG5cdHtcblx0XHRpZighdGhpcy5jdXJyZW50SWQgJiYgdXNlcklkKXtcblx0XHRcdGQuc2NlbmUuYWRkKHRoaXMpO1xuXHRcdFx0aWYodGhpcy5oYXQpXG5cdFx0XHRcdHRoaXMuY29tcG9uZW50cy5oYXQgPSBuZXcgTlNrZWxldG9uUGFyZW50KHRoaXMuaGF0KTtcblx0XHRcdGlmKHRoaXMudGV4dClcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQgPSBuZXcgTlNrZWxldG9uUGFyZW50KHRoaXMudGV4dCk7XG5cdFx0fVxuXHRcdGVsc2UgaWYodGhpcy5jdXJyZW50SWQgJiYgIXVzZXJJZCl7XG5cdFx0XHRpZih0aGlzLmhhdClcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdC5kZXN0cm95KCk7XG5cdFx0XHRpZih0aGlzLnRleHQpXG5cdFx0XHRcdHRoaXMuY29tcG9uZW50cy50ZXh0LmRlc3Ryb3koKTtcblx0XHRcdGQuc2NlbmUucmVtb3ZlKHRoaXMpO1xuXHRcdH1cblxuXHRcdGlmKHVzZXJJZCl7XG5cdFx0XHRpZih0aGlzLmhhdClcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdC51cGRhdGUoe3VzZXJJZH0pO1xuXHRcdFx0aWYodGhpcy50ZXh0KVxuXHRcdFx0XHR0aGlzLmNvbXBvbmVudHMudGV4dC51cGRhdGUoe3VzZXJJZH0pO1xuXHRcdH1cblxuXHRcdHRoaXMuY3VycmVudElkID0gdXNlcklkO1xuXHR9XG59XG5cbmNsYXNzIFByZXNpZGVudEhhdCBleHRlbmRzIEhhdFxue1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdGlmKHRoZW1lID09PSAnY2Flc2FyJylcblx0XHR7XG5cdFx0XHRzdXBlcihBTS5jYWNoZS5tb2RlbHMubGF1cmVscy5jbG9uZSgpKTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC4wOC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoLjUsIDAsIDApO1xuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigwLjgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHN1cGVyKEFNLmNhY2hlLm1vZGVscy50b3BoYXQpO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4xNDQvU0guZW52LnBpeGVsc1Blck1ldGVyLCAuMDM4L1NILmVudi5waXhlbHNQZXJNZXRlcik7XG5cdFx0XHR0aGlzLnNjYWxlLm11bHRpcGx5U2NhbGFyKDEuMi9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xuXHRcdH1cblx0XHRcblx0XHRsZXQgYXNzaWduSGF0ID0gKHtkYXRhOiB7Z2FtZX19KSA9PiB7XG5cdFx0XHRsZXQgc2l0dGluZyA9IGdhbWUuc3BlY2lhbEVsZWN0aW9uID8gZ2FtZS5wcmVzaWRlbnQgOiBnYW1lLmxhc3RQcmVzaWRlbnQ7XG5cdFx0XHR0aGlzLnNldE93bmVyKHNpdHRpbmcpO1xuXHRcdH1cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3BlY2lhbEVsZWN0aW9uJywgYXNzaWduSGF0KTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfcHJlc2lkZW50JywgYXNzaWduSGF0KTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGFzdFByZXNpZGVudCcsIGFzc2lnbkhhdCk7XG5cdH1cbn07XG5cbmNsYXNzIENoYW5jZWxsb3JIYXQgZXh0ZW5kcyBIYXRcbntcblx0Y29uc3RydWN0b3IoKXtcblx0XHRpZih0aGVtZSA9PT0gJ2NhZXNhcicpe1xuXHRcdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLmxhdXJlbHMuY2xvbmUoKSk7XG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAuMDgvU0guZW52LnBpeGVsc1Blck1ldGVyLCAuMDMvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KC41LCAwLCAwKTtcblx0XHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMC44L1NILmVudi5waXhlbHNQZXJNZXRlcik7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHRzdXBlcihBTS5jYWNoZS5tb2RlbHMudmlzb3JjYXApO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4wNy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMS4yL1NILmVudi5waXhlbHNQZXJNZXRlcik7XG5cdFx0fVxuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2xhc3RDaGFuY2VsbG9yJywgZSA9PiB7XG5cdFx0XHR0aGlzLnNldE93bmVyKGUuZGF0YS5nYW1lLmxhc3RDaGFuY2VsbG9yKTtcblx0XHR9KTtcblx0fVxufVxuXG5leHBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuY2xhc3MgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IodHlwZSl7XG5cdFx0dGhpcy50eXBlID0gdHlwZTtcblx0fVxuXG5cdGF3YWtlKG9iail7XG5cdFx0dGhpcy5vYmplY3QzRCA9IG9iajtcblx0fVxuXG5cdHN0YXJ0KCl7IH1cblxuXHR1cGRhdGUoZFQpeyB9XG5cblx0ZGlzcG9zZSgpeyB9XG59XG5cbmNsYXNzIEJTeW5jIGV4dGVuZHMgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IoZXZlbnROYW1lKVxuXHR7XG5cdFx0c3VwZXIoJ0JTeW5jJyk7XG5cdFx0dGhpcy5fcyA9IFNILnNvY2tldDtcblxuXHRcdC8vIGxpc3RlbiBmb3IgdXBkYXRlIGV2ZW50c1xuXHRcdHRoaXMuaG9vayA9IHRoaXMuX3Mub24oZXZlbnROYW1lLCB0aGlzLnVwZGF0ZUZyb21TZXJ2ZXIuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5ldmVudE5hbWUgPSBldmVudE5hbWU7XG5cdFx0dGhpcy5vd25lciA9IDA7XG5cdH1cblxuXHR1cGRhdGVGcm9tU2VydmVyKGRhdGEpXG5cdHtcblx0XHR0aGlzLm9iamVjdDNELnBvc2l0aW9uLmZyb21BcnJheShkYXRhLCAwKTtcblx0XHR0aGlzLm9iamVjdDNELnJvdGF0aW9uLmZyb21BcnJheShkYXRhLCAzKTtcblx0fVxuXG5cdHRha2VPd25lcnNoaXAoKVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyICYmIFNILmxvY2FsVXNlci51c2VySWQpXG5cdFx0XHR0aGlzLm93bmVyID0gU0gubG9jYWxVc2VyLnVzZXJJZDtcblx0fVxuXG5cdHVwZGF0ZShkVClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlciAmJiBTSC5sb2NhbFVzZXIuc2tlbGV0b24gJiYgU0gubG9jYWxVc2VyLmlkID09PSB0aGlzLm93bmVyKVxuXHRcdHtcblx0XHRcdGxldCBqID0gU0gubG9jYWxVc2VyLnNrZWxldG9uLmdldEpvaW50KCdIZWFkJyk7XG5cdFx0XHR0aGlzLl9zLmVtaXQodGhpcy5ldmVudE5hbWUsIFsuLi5qLnBvc2l0aW9uLnRvQXJyYXkoKSwgLi4uai5yb3RhdGlvbi50b0FycmF5KCldKTtcblx0XHR9XG5cdH1cblxufVxuXG5leHBvcnQgeyBCZWhhdmlvciwgQlN5bmMgfTtcbiIsImltcG9ydCB7IEJlaGF2aW9yIH0gZnJvbSAnLi9iZWhhdmlvcic7XG5cbmNsYXNzIFF1YXRlcm5pb25Ud2VlbiBleHRlbmRzIFRXRUVOLlR3ZWVuXG57XG5cdGNvbnN0cnVjdG9yKHN0YXRlLCBncm91cCl7XG5cdFx0c3VwZXIoe3Q6IDB9LCBncm91cCk7XG5cdFx0dGhpcy5fc3RhdGUgPSBzdGF0ZTtcblx0XHR0aGlzLl9zdGFydCA9IHN0YXRlLmNsb25lKCk7XG5cdH1cblx0dG8oZW5kLCBkdXJhdGlvbil7XG5cdFx0c3VwZXIudG8oe3Q6IDF9LCBkdXJhdGlvbik7XG5cdFx0dGhpcy5fZW5kID0gZW5kIGluc3RhbmNlb2YgVEhSRUUuUXVhdGVybmlvbiA/IFtlbmRdIDogZW5kO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cdHN0YXJ0KCl7XG5cdFx0dGhpcy5vblVwZGF0ZSgoe3Q6IHByb2dyZXNzfSkgPT4ge1xuXHRcdFx0cHJvZ3Jlc3MgPSBwcm9ncmVzcyAqIHRoaXMuX2VuZC5sZW5ndGg7XG5cdFx0XHRsZXQgbmV4dFBvaW50ID0gTWF0aC5jZWlsKHByb2dyZXNzKTtcblx0XHRcdGxldCBsb2NhbFByb2dyZXNzID0gcHJvZ3Jlc3MgLSBuZXh0UG9pbnQgKyAxO1xuXHRcdFx0bGV0IHBvaW50cyA9IFt0aGlzLl9zdGFydCwgLi4udGhpcy5fZW5kXTtcblx0XHRcdFRIUkVFLlF1YXRlcm5pb24uc2xlcnAocG9pbnRzW25leHRQb2ludC0xXSwgcG9pbnRzW25leHRQb2ludF0sIHRoaXMuX3N0YXRlLCBsb2NhbFByb2dyZXNzKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gc3VwZXIuc3RhcnQoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBXYWl0Rm9yQW5pbXModHdlZW5zKVxue1xuXHRsZXQgcCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XG5cdHtcblx0XHRsZXQgYWN0aXZlQ291bnQgPSB0d2VlbnMubGVuZ3RoO1xuXHRcdGZ1bmN0aW9uIGNoZWNrRG9uZSgpe1xuXHRcdFx0aWYoLS1hY3RpdmVDb3VudCA9PT0gMCkgcmVzb2x2ZSgpO1xuXHRcdH1cblxuXHRcdHR3ZWVucy5mb3JFYWNoKHQgPT4gdC5vbkNvbXBsZXRlKGNoZWNrRG9uZSkpO1xuXHRcdHR3ZWVucy5mb3JFYWNoKHQgPT4gdC5vblN0b3AocmVqZWN0KSk7XG5cdFx0dHdlZW5zLmZvckVhY2godCA9PiB0LnN0YXJ0KCkpO1xuXHR9KTtcblx0cC50d2VlbnMgPSB0d2VlbnM7XG5cdHJldHVybiBwO1xufVxuXG5jb25zdCBzcGluUG9pbnRzID0gW1xuXHRuZXcgVEhSRUUuUXVhdGVybmlvbigwLCBNYXRoLnNxcnQoMikvMiwgMCwgTWF0aC5zcXJ0KDIpLzIpLFxuXHRuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAxLCAwLCAwKSxcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgTWF0aC5zcXJ0KDIpLzIsIDAsIC1NYXRoLnNxcnQoMikvMiksXG5cdG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIDAsIDAsIDEpXG5dO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBbmltYXRlXG57XG5cdC8qKlxuXHQgKiBNb3ZlIGFuIG9iamVjdCBmcm9tIEEgdG8gQlxuXHQgKiBAcGFyYW0ge1RIUkVFLk9iamVjdDNEfSB0YXJnZXQgXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG5cdCAqL1xuXHRzdGF0aWMgc2ltcGxlKHRhcmdldCwge3BhcmVudD1udWxsLCBwb3M9bnVsbCwgcXVhdD1udWxsLCBzY2FsZT1udWxsLCBodWU9bnVsbCwgbWF0cml4PW51bGwsIGR1cmF0aW9uPTYwMH0gPSB7fSlcblx0e1xuXHRcdC8vIGV4dHJhY3QgcG9zaXRpb24vcm90YXRpb24vc2NhbGUgZnJvbSBtYXRyaXhcblx0XHRpZihtYXRyaXgpe1xuXHRcdFx0cG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblx0XHRcdHF1YXQgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXHRcdFx0c2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXHRcdFx0bWF0cml4LmRlY29tcG9zZShwb3MsIHF1YXQsIHNjYWxlKTtcblx0XHR9XG5cblx0XHQvLyBzaHVmZmxlIGhpZXJhcmNoeSwgYnV0IGtlZXAgd29ybGQgdHJhbnNmb3JtIHRoZSBzYW1lXG5cdFx0aWYocGFyZW50ICYmIHRoaXMucGFyZW50ICE9PSB0YXJnZXQucGFyZW50KXtcblx0XHRcdHRhcmdldC5hcHBseU1hdHJpeCh0YXJnZXQucGFyZW50Lm1hdHJpeFdvcmxkKTtcblx0XHRcdHRhcmdldC5hcHBseU1hdHJpeChuZXcgVEhSRUUuTWF0cml4NCgpLmdldEludmVyc2UocGFyZW50Lm1hdHJpeFdvcmxkKSk7XG5cdFx0XHRwYXJlbnQuYWRkKG9iaik7XG5cdFx0fVxuXG5cdFx0bGV0IGFuaW1zID0gW107XG5cblx0XHRpZihwb3Mpe1xuXHRcdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4odGFyZ2V0LnBvc2l0aW9uKVxuXHRcdFx0XHQudG8oe3g6IHBvcy54LCB5OiBwb3MueSwgejogcG9zLnp9LCBkdXJhdGlvbilcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0aWYocXVhdCl7XG5cdFx0XHRhbmltcy5wdXNoKG5ldyBRdWF0ZXJuaW9uVHdlZW4odGFyZ2V0LnF1YXRlcm5pb24pXG5cdFx0XHRcdC50byhxdWF0LCBkdXJhdGlvbilcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0aWYoc2NhbGUpe1xuXHRcdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4odGFyZ2V0LnNjYWxlKVxuXHRcdFx0XHQudG8oe3g6IHNjYWxlLngsIHk6IHNjYWxlLnksIHo6IHNjYWxlLnp9LCBkdXJhdGlvbilcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0aWYoaHVlICE9PSBudWxsKXtcblx0XHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKHRhcmdldC5tYXRlcmlhbC5jb2xvci5nZXRIU0woKSlcblx0XHRcdFx0LnRvKHtoOiBodWV9LCBkdXJhdGlvbilcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcblx0XHRcdFx0Lm9uVXBkYXRlKHR3ZWVuID0+IHtcblx0XHRcdFx0XHR0YXJnZXQubWF0ZXJpYWwuY29sb3Iuc2V0SFNMKHR3ZWVuLmgsIHR3ZWVuLnMsIHR3ZWVuLmwpO1xuXHRcdFx0XHR9KVxuXHRcdFx0KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKGFuaW1zKTtcblx0fVxuXG5cdHN0YXRpYyB3YWl0KGR1cmF0aW9uKXtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0c2V0VGltZW91dChyZXNvbHZlLCBkdXJhdGlvbik7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogTWFrZSB0aGUgY2FyZCBhcHBlYXIgd2l0aCBhIGZsb3VyaXNoXG5cdCAqIEBwYXJhbSB7VEhSRUUuT2JqZWN0M0R9IGNhcmQgXG5cdCAqL1xuXHRzdGF0aWMgY2FyZEZsb3VyaXNoKGNhcmQpXG5cdHtcblx0XHRjYXJkLnBvc2l0aW9uLnNldCgwLCAwLCAwKTtcblx0XHRjYXJkLnF1YXRlcm5pb24uc2V0KDAsMCwwLDEpO1xuXHRcdGNhcmQuc2NhbGUuc2V0U2NhbGFyKC4wMDEpO1xuXG5cdFx0bGV0IGFuaW1zID0gW107XG5cblx0XHQvLyBhZGQgcG9zaXRpb24gYW5pbWF0aW9uXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4oY2FyZC5wb3NpdGlvbilcblx0XHRcdC50byh7eDogMCwgeTogLjcsIHo6IDB9LCAxNTAwKVxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuRWxhc3RpYy5PdXQpXG5cdFx0KTtcblxuXHRcdC8vIGFkZCBzcGluIGFuaW1hdGlvblxuXHRcdGFuaW1zLnB1c2gobmV3IFF1YXRlcm5pb25Ud2VlbihjYXJkLnF1YXRlcm5pb24pXG5cdFx0XHQudG8oc3BpblBvaW50cywgMjUwMClcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXG5cdFx0KTtcblxuXHRcdC8vIGFkZCBzY2FsZSBhbmltYXRpb25cblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihjYXJkLnNjYWxlKVxuXHRcdFx0LnRvKHt4OiAuNSwgeTogLjUsIHo6IC41fSwgMjAwKVxuXHRcdCk7XG5cblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKGFuaW1zKTtcblx0fVxuXG5cdHN0YXRpYyB2YW5pc2goY2FyZClcblx0e1xuXHRcdGxldCBhbmltcyA9IFtdO1xuXG5cdFx0Ly8gYWRkIG1vdmUgYW5pbWF0aW9uXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4oY2FyZC5wb3NpdGlvbilcblx0XHRcdC50byh7eTogJyswLjUnfSwgMTAwMClcblx0XHQpO1xuXG5cdFx0Ly8gYWRkIGRpc2FwcGVhciBhbmltYXRpb25cblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihjYXJkLm1hdGVyaWFsKVxuXHRcdFx0LnRvKHtvcGFjaXR5OiAwfSwgMTAwMClcblx0XHQpO1xuXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XG5cdH1cblxuXHRzdGF0aWMgYm9iKG9iaiwgYW1wbGl0dWRlID0gLjA4LCBwZXJpb2QgPSA0MDAwKVxuXHR7XG5cdFx0cmV0dXJuIG5ldyBUV0VFTi5Ud2VlbihvYmoucG9zaXRpb24pXG5cdFx0XHQudG8oe3k6IG9iai5wb3NpdGlvbi55LWFtcGxpdHVkZX0sIHBlcmlvZClcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlNpbnVzb2lkYWwuSW5PdXQpXG5cdFx0XHQucmVwZWF0KEluZmluaXR5KVxuXHRcdFx0LnlveW8odHJ1ZSlcblx0XHRcdC5zdGFydCgpO1xuXHR9XG5cblx0c3RhdGljIHNwaW4ob2JqLCBwZXJpb2QgPSAxMDAwMClcblx0e1xuXHRcdHJldHVybiBuZXcgUXVhdGVybmlvblR3ZWVuKG9iai5xdWF0ZXJuaW9uKVxuXHRcdFx0LnRvKHNwaW5Qb2ludHMsIHBlcmlvZClcblx0XHRcdC5yZXBlYXQoSW5maW5pdHkpXG5cdFx0XHQuc3RhcnQoKTtcblx0fVxuXG5cdHN0YXRpYyB3aW5rSW4ob2JqLCBkdXJhdGlvbiA9IDIwMClcblx0e1xuXHRcdGlmKCFvYmoudXNlckRhdGEuc2NhbGVPcmlnKVxuXHRcdFx0b2JqLnVzZXJEYXRhLnNjYWxlT3JpZyA9IG9iai5zY2FsZS5jbG9uZSgpO1xuXG5cdFx0bGV0IGFuaW1zID0gW107XG5cblx0XHRvYmouc2NhbGUuc2V0U2NhbGFyKC4wMDEpO1xuXHRcdG9iai52aXNpYmxlID0gdHJ1ZTtcblxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKG9iai5zY2FsZSlcblx0XHRcdC50byh7eTogb2JqLnVzZXJEYXRhLnNjYWxlT3JpZy55fSwgZHVyYXRpb24pXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5DdWJpYy5Jbilcblx0XHQpO1xuXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4ob2JqLnNjYWxlKVxuXHRcdFx0LnRvKHt4OiBvYmoudXNlckRhdGEuc2NhbGVPcmlnLngsIHo6IG9iai51c2VyRGF0YS5zY2FsZU9yaWcuen0sIC4yKmR1cmF0aW9uKVxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuQ3ViaWMuSW4pXG5cdFx0KTtcblxuXHRcdHJldHVybiBXYWl0Rm9yQW5pbXMoYW5pbXMpO1xuXHR9XG5cblx0c3RhdGljIHdpbmtPdXQob2JqLCBkdXJhdGlvbiA9IDIwMClcblx0e1xuXHRcdGlmKCFvYmoudXNlckRhdGEuc2NhbGVPcmlnKVxuXHRcdFx0b2JqLnVzZXJEYXRhLnNjYWxlT3JpZyA9IG9iai5zY2FsZS5jbG9uZSgpO1xuXG5cdFx0bGV0IGFuaW1zID0gW107XG5cdFx0b2JqLnZpc2libGUgPSB0cnVlO1xuXHRcdFxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKG9iai5zY2FsZSlcblx0XHRcdC50byh7eTogLjAwMX0sIGR1cmF0aW9uKVxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuQ3ViaWMuT3V0KVxuXHRcdCk7XG5cblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihvYmouc2NhbGUpXG5cdFx0XHQudG8oe3g6IC4wMDEsIHo6IC4wMDF9LCAuMipkdXJhdGlvbilcblx0XHRcdC5kZWxheSguOCpkdXJhdGlvbilcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLkN1YmljLk91dClcblx0XHRcdC5vbkNvbXBsZXRlKCgpID0+IHsgb2JqLnZpc2libGUgPSBmYWxzZTsgfSlcblx0XHQpO1xuXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XG5cdH1cblxuXHRzdGF0aWMgc3dpbmdJbihvYmosIHJvdGF0aW9uPU1hdGguUEkvMiwgcmFkaXVzPTAuNSwgZHVyYXRpb249MzAwKVxuXHR7XG5cdFx0aWYoIW9iai51c2VyRGF0YS50cmFuc2Zvcm0pXG5cdFx0XHRvYmoudXNlckRhdGEudHJhbnNmb3JtID0ge1xuXHRcdFx0XHRyb3RhdGlvbjogb2JqLnJvdGF0aW9uLngsXG5cdFx0XHRcdHBvc2l0aW9uOiBvYmoucG9zaXRpb24uY2xvbmUoKVxuXHRcdFx0fTtcblxuXHRcdC8vIHB1dCBhdCBzdGFydCBwb3NpdGlvblxuXHRcdG9iai50cmFuc2xhdGVZKC1yYWRpdXMpO1xuXHRcdG9iai5yb3RhdGlvbi54ID0gb2JqLnVzZXJEYXRhLnRyYW5zZm9ybS5yb3RhdGlvbiArIHJvdGF0aW9uO1xuXHRcdG9iai50cmFuc2xhdGVZKHJhZGl1cyk7XG5cblx0XHRsZXQgYW5pbSA9IG5ldyBUV0VFTi5Ud2Vlbih7dDoxfSlcblx0XHRcdC50byh7dDogMH0sIGR1cmF0aW9uKVxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuQm91bmNlLk91dClcblx0XHRcdC5vblVwZGF0ZSgoe3R9KSA9PiB7XG5cdFx0XHRcdG9iai50cmFuc2xhdGVZKC1yYWRpdXMpO1xuXHRcdFx0XHRvYmoucm90YXRpb24ueCA9IG9iai51c2VyRGF0YS50cmFuc2Zvcm0ucm90YXRpb24gKyB0KnJvdGF0aW9uO1xuXHRcdFx0XHRvYmoudHJhbnNsYXRlWShyYWRpdXMpO1xuXHRcdFx0fSlcblx0XHRcdC5vblN0b3AoKCkgPT4ge1xuXHRcdFx0XHRvYmoudHJhbnNsYXRlWSgtcmFkaXVzKTtcblx0XHRcdFx0b2JqLnJvdGF0aW9uLnggPSBvYmoudXNlckRhdGEudHJhbnNmb3JtLnJvdGF0aW9uICsgcm90YXRpb247XG5cdFx0XHRcdG9iai50cmFuc2xhdGVZKHJhZGl1cyk7XG5cdFx0XHR9KTtcblxuXHRcdHJldHVybiBXYWl0Rm9yQW5pbXMoW2FuaW1dKTtcblx0fVxuXG5cdHN0YXRpYyBzd2luZ091dChvYmosIHJvdGF0aW9uPU1hdGguUEkvMiwgcmFkaXVzPTAuNSwgZHVyYXRpb249MzAwKVxuXHR7XG5cdFx0aWYoIW9iai51c2VyRGF0YS50cmFuc2Zvcm0pXG5cdFx0XHRvYmoudXNlckRhdGEudHJhbnNmb3JtID0ge1xuXHRcdFx0XHRyb3RhdGlvbjogb2JqLnJvdGF0aW9uLngsXG5cdFx0XHRcdHBvc2l0aW9uOiBvYmoucG9zaXRpb24uY2xvbmUoKVxuXHRcdFx0fTtcblxuXHRcdG9iai5yb3RhdGlvbi54ID0gb2JqLnVzZXJEYXRhLnRyYW5zZm9ybS5yb3RhdGlvbjtcblx0XHRvYmoucG9zaXRpb24uY29weShvYmoudXNlckRhdGEudHJhbnNmb3JtLnBvc2l0aW9uKTtcblxuXHRcdGxldCBhbmltID0gbmV3IFRXRUVOLlR3ZWVuKHt0OjB9KVxuXHRcdFx0LnRvKHt0OiAxfSwgZHVyYXRpb24pXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuSW4pXG5cdFx0XHQub25VcGRhdGUoKHt0fSkgPT4ge1xuXHRcdFx0XHRvYmoudHJhbnNsYXRlWSgtcmFkaXVzKTtcblx0XHRcdFx0b2JqLnJvdGF0aW9uLnggPSBvYmoudXNlckRhdGEudHJhbnNmb3JtLnJvdGF0aW9uICsgdCpyb3RhdGlvbjtcblx0XHRcdFx0b2JqLnRyYW5zbGF0ZVkocmFkaXVzKTtcblx0XHRcdH0pXG5cdFx0XHQub25TdG9wKCgpID0+IHtcblx0XHRcdFx0b2JqLnJvdGF0aW9uLnggPSBvYmoudXNlckRhdGEudHJhbnNmb3JtLnJvdGF0aW9uO1xuXHRcdFx0XHRvYmoucG9zaXRpb24uY29weShvYmoudXNlckRhdGEudHJhbnNmb3JtLnBvc2l0aW9uKTtcblx0XHRcdH0pO1xuXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhbYW5pbV0pO1xuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbi8vIGVudW0gY29uc3RhbnRzXG5sZXQgVHlwZXMgPSBPYmplY3QuZnJlZXplKHtcblx0UE9MSUNZX0xJQkVSQUw6IDAsXG5cdFBPTElDWV9GQVNDSVNUOiAxLFxuXHRST0xFX0xJQkVSQUw6IDIsXG5cdFJPTEVfRkFTQ0lTVDogMyxcblx0Uk9MRV9ISVRMRVI6IDQsXG5cdFBBUlRZX0xJQkVSQUw6IDUsXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXG5cdEpBOiA3LFxuXHRORUlOOiA4LFxuXHRCTEFOSzogOSxcblx0Q1JFRElUUzogMTAsXG5cdFZFVE86IDExXG59KTtcblxubGV0IGdlb21ldHJ5ID0gbnVsbCwgbWF0ZXJpYWwgPSBudWxsO1xuXG5mdW5jdGlvbiBpbml0Q2FyZERhdGEoKVxue1xuXHRsZXQgZmxvYXREYXRhID0gW1xuXHRcdC8vIHBvc2l0aW9uIChwb3J0cmFpdClcblx0XHQwLjM1NzUsIDAuNSwgMC4wMDA1LFxuXHRcdC0uMzU3NSwgMC41LCAwLjAwMDUsXG5cdFx0LS4zNTc1LCAtLjUsIDAuMDAwNSxcblx0XHQwLjM1NzUsIC0uNSwgMC4wMDA1LFxuXHRcdDAuMzU3NSwgMC41LCAtLjAwMDUsXG5cdFx0LS4zNTc1LCAwLjUsIC0uMDAwNSxcblx0XHQtLjM1NzUsIC0uNSwgLS4wMDA1LFxuXHRcdDAuMzU3NSwgLS41LCAtLjAwMDUsXG5cdFxuXHRcdC8vIHBvc2l0aW9uIChsYW5kc2NhcGUpXG5cdFx0MC41LCAtLjM1NzUsIDAuMDAwNSxcblx0XHQwLjUsIDAuMzU3NSwgMC4wMDA1LFxuXHRcdC0uNSwgMC4zNTc1LCAwLjAwMDUsXG5cdFx0LS41LCAtLjM1NzUsIDAuMDAwNSxcblx0XHQwLjUsIC0uMzU3NSwgLS4wMDA1LFxuXHRcdDAuNSwgMC4zNTc1LCAtLjAwMDUsXG5cdFx0LS41LCAwLjM1NzUsIC0uMDAwNSxcblx0XHQtLjUsIC0uMzU3NSwgLS4wMDA1LFxuXHRcblx0XHQvLyBVVnNcblx0XHQvKiAtLS0tLS0tLS0tLS0tLSBjYXJkIGZhY2UgLS0tLS0tLS0tLS0tLSAqLyAvKiAtLS0tLS0tLS0tLS0tIGNhcmQgYmFjayAtLS0tLS0tLS0tLS0tLSovXG5cdFx0Ljc1NCwuOTk2LCAuNzU0LC44MzQsIC45OTcsLjgzNCwgLjk5NywuOTk2LCAuNzU0LC44MzQsIC43NTQsLjk5NiwgLjk5NywuOTk2LCAuOTk3LC44MzQsIC8vIGxpYmVyYWwgcG9saWN5XG5cdFx0Ljc1NCwuODIyLCAuNzU0LC42NjAsIC45OTYsLjY2MCwgLjk5NiwuODIyLCAuNzU0LC42NjAsIC43NTQsLjgyMiwgLjk5NiwuODIyLCAuOTk2LC42NjAsIC8vIGZhc2Npc3QgcG9saWN5XG5cdFx0Ljc0NiwuOTk2LCAuNTA1LC45OTYsIC41MDUsLjY1MCwgLjc0NiwuNjUwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGxpYmVyYWwgcm9sZVxuXHRcdC43NDYsLjY0NSwgLjUwNSwuNjQ1LCAuNTA1LC4zMDAsIC43NDYsLjMwMCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBmYXNjaXN0IHJvbGVcblx0XHQuOTk2LC42NDUsIC43NTQsLjY0NSwgLjc1NCwuMzAwLCAuOTk2LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gaGl0bGVyIHJvbGVcblx0XHQuNDk1LC45OTYsIC4yNTUsLjk5NiwgLjI1NSwuNjUwLCAuNDk1LC42NTAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbGliZXJhbCBwYXJ0eVxuXHRcdC40OTUsLjY0NSwgLjI1NSwuNjQ1LCAuMjU1LC4zMDAsIC40OTUsLjMwMCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBmYXNjaXN0IHBhcnR5XG5cdFx0LjI0NCwuOTkyLCAuMDA1LC45OTIsIC4wMDUsLjY1MywgLjI0NCwuNjUzLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGphXG5cdFx0LjI0MywuNjQyLCAuMDA2LC42NDIsIC4wMDYsLjMwMiwgLjI0MywuMzAyLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIG5laW5cblx0XHQuMDIxLC4yNjksIC4wMjEsLjAyMiwgLjM3NSwuMDIyLCAuMzc1LC4yNjksIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gYmxhbmtcblx0XHQuMzk3LC4yNzYsIC4zOTcsLjAxNSwgLjc2NSwuMDE1LCAuNzY1LC4yNzYsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gY3JlZGl0c1xuXHRcdC45NjMsLjI3MCwgLjgwNCwuMjcwLCAuODA0LC4wMjksIC45NjMsLjAyOSwgLjgwNCwuMjcwLCAuOTYzLC4yNzAsIC45NjMsLjAyOSwgLjgwNCwuMDI5LCAvLyB2ZXRvXG5cblx0XTtcblx0XG5cdGxldCBpbnREYXRhID0gW1xuXHRcdC8vIHRyaWFuZ2xlIGluZGV4XG5cdFx0MCwxLDIsIDAsMiwzLCA0LDcsNSwgNSw3LDZcblx0XTtcblx0XG5cdC8vIHR3byBwb3NpdGlvbiBzZXRzLCAxMSBVViBzZXRzLCAxIGluZGV4IHNldFxuXHRsZXQgZ2VvQnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDQqZmxvYXREYXRhLmxlbmd0aCArIDIqaW50RGF0YS5sZW5ndGgpO1xuXHRsZXQgdGVtcCA9IG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCAwLCBmbG9hdERhdGEubGVuZ3RoKTtcblx0dGVtcC5zZXQoZmxvYXREYXRhKTtcblx0dGVtcCA9IG5ldyBVaW50MTZBcnJheShnZW9CdWZmZXIsIDQqZmxvYXREYXRhLmxlbmd0aCwgaW50RGF0YS5sZW5ndGgpO1xuXHR0ZW1wLnNldChpbnREYXRhKTtcblx0XG5cdC8vIGNob3AgdXAgYnVmZmVyIGludG8gdmVydGV4IGF0dHJpYnV0ZXNcblx0bGV0IHBvc0xlbmd0aCA9IDgqMywgdXZMZW5ndGggPSA4KjIsIGluZGV4TGVuZ3RoID0gMTI7XG5cdGxldCBwb3NQb3J0cmFpdCA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDAsIHBvc0xlbmd0aCksIDMpLFxuXHRcdHBvc0xhbmRzY2FwZSA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDQqcG9zTGVuZ3RoLCBwb3NMZW5ndGgpLCAzKTtcblx0bGV0IHV2cyA9IFtdO1xuXHRmb3IobGV0IGk9MDsgaTwxMjsgaSsrKXtcblx0XHR1dnMucHVzaCggbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgOCpwb3NMZW5ndGggKyA0KmkqdXZMZW5ndGgsIHV2TGVuZ3RoKSwgMikgKTtcblx0fVxuXHRsZXQgaW5kZXggPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBVaW50MTZBcnJheShnZW9CdWZmZXIsIDQqZmxvYXREYXRhLmxlbmd0aCwgaW5kZXhMZW5ndGgpLCAxKTtcblx0XG5cdGdlb21ldHJ5ID0gT2JqZWN0LmtleXMoVHlwZXMpLm1hcCgoa2V5LCBpKSA9PlxuXHR7XG5cdFx0bGV0IGdlbyA9IG5ldyBUSFJFRS5CdWZmZXJHZW9tZXRyeSgpO1xuXHRcdGdlby5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgaT09VHlwZXMuSkEgfHwgaT09VHlwZXMuTkVJTiA/IHBvc0xhbmRzY2FwZSA6IHBvc1BvcnRyYWl0KTtcblx0XHRnZW8uYWRkQXR0cmlidXRlKCd1dicsIHV2c1tpXSk7XG5cdFx0Z2VvLnNldEluZGV4KGluZGV4KTtcblx0XHRyZXR1cm4gZ2VvO1xuXHR9KTtcblxuXHRtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KTtcbn1cblxuXG5jbGFzcyBDYXJkIGV4dGVuZHMgVEhSRUUuTWVzaFxue1xuXHRjb25zdHJ1Y3Rvcih0eXBlID0gVHlwZXMuQkxBTkspXG5cdHtcblx0XHRpZighZ2VvbWV0cnkgfHwgIW1hdGVyaWFsKSBpbml0Q2FyZERhdGEoKTtcblxuXHRcdGxldCBnZW8gPSBnZW9tZXRyeVt0eXBlXTtcblx0XHRzdXBlcihnZW8sIG1hdGVyaWFsKTtcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjcpO1xuXHR9XG59XG5cbmNsYXNzIEJsYW5rQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3RvcigpeyBzdXBlcigpOyB9XG59XG5cbmNsYXNzIENyZWRpdHNDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuQ1JFRElUUyk7XG5cdH1cbn1cblxuY2xhc3MgTGliZXJhbFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfTElCRVJBTCwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIEZhc2Npc3RQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0ZBU0NJU1QpO1xuXHR9XG59XG5cbmNsYXNzIFZldG9DYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuVkVUTyk7XG5cdFx0dGhpcy5tYXRlcmlhbCA9IHRoaXMubWF0ZXJpYWwuY2xvbmUoKTtcblx0fVxufVxuY2xhc3MgTGliZXJhbFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9MSUJFUkFMKTtcblx0fVxufVxuXG5jbGFzcyBGYXNjaXN0Um9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5ST0xFX0ZBU0NJU1QpO1xuXHR9XG59XG5cbmNsYXNzIEhpdGxlclJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9ISVRMRVIpO1xuXHR9XG59XG5cbmNsYXNzIExpYmVyYWxQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9MSUJFUkFMKTtcblx0fVxufVxuXG5jbGFzcyBGYXNjaXN0UGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfRkFTQ0lTVCk7XG5cdH1cbn1cblxuY2xhc3MgSmFDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuSkEpO1xuXHR9XG59XG5cbmNsYXNzIE5laW5DYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuTkVJTik7XG5cdH1cbn1cblxuXG5leHBvcnQge1xuXHRDYXJkLCBUeXBlcywgQmxhbmtDYXJkLCBDcmVkaXRzQ2FyZCwgVmV0b0NhcmQsXG5cdExpYmVyYWxQb2xpY3lDYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgTGliZXJhbFJvbGVDYXJkLCBGYXNjaXN0Um9sZUNhcmQsXG5cdEhpdGxlclJvbGVDYXJkLCBMaWJlcmFsUGFydHlDYXJkLCBGYXNjaXN0UGFydHlDYXJkLCBKYUNhcmQsIE5laW5DYXJkXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XG5pbXBvcnQge0xpYmVyYWxQb2xpY3lDYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgVmV0b0NhcmR9IGZyb20gJy4vY2FyZCc7XG5cbmxldCBMaWJlcmFsU3BvdHMgPSB7XG5cdHBvc2l0aW9uczogW1xuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuNjkwLCAwLjAwMSwgLTAuNDIpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuMzQ1LCAwLjAwMSwgLTAuNDIpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuMDAyLCAwLjAwMSwgLTAuNDIpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uMzQwLCAwLjAwMSwgLTAuNDIpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uNjkwLCAwLjAwMSwgLTAuNDIpXG5cdF0sXG5cdHF1YXRlcm5pb246IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMC43MDcxMDY3ODExODY1NDc1LCAwKSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNCwgMC40LCAwLjQpXG59LFxuRmFzY2lzdFNwb3RzID0ge1xuXHRwb3NpdGlvbnM6IFtcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjg2MCwgMC4wMDEsIC40MjUpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uNTE1LCAwLjAwMSwgLjQyNSksXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoLS4xNzAsIDAuMDAxLCAuNDI1KSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjE3MCwgMC4wMDEsIC40MjUpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuNTE4LCAwLjAwMSwgLjQyNSksXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC44NzAsIDAuMDAxLCAuNDI1KSxcdFxuXHRdLFxuXHRxdWF0ZXJuaW9uOiBuZXcgVEhSRUUuUXVhdGVybmlvbigtMC43MDcxMDY3ODExODY1NDc1LCAwLCAwLCAwLjcwNzEwNjc4MTE4NjU0NzUpLFxuXHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMC40LCAwLjQsIDAuNClcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVUYWJsZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyB0YWJsZSBzdGF0ZVxuXHRcdHRoaXMubGliZXJhbENhcmRzID0gMDtcblx0XHR0aGlzLmZhc2Npc3RDYXJkcyA9IDA7XG5cdFx0dGhpcy5jYXJkcyA9IFtdO1xuXG5cdFx0dGhpcy52ZXRvQ2FyZCA9IG5ldyBWZXRvQ2FyZCgpO1xuXHRcdHRoaXMudmV0b0NhcmQuc2NhbGUuc2V0U2NhbGFyKC41KTtcblx0XHR0aGlzLnZldG9DYXJkLnZpc2libGUgPSBmYWxzZTtcblx0XHR0aGlzLnZldG9DYXJkLm1hdGVyaWFsLnRyYW5zcGFyZW50ID0gdHJ1ZTtcblx0XHR0aGlzLmFkZCh0aGlzLnZldG9DYXJkKTtcblxuXHRcdC8vIGFkZCB0YWJsZSBhc3NldFxuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMudGFibGU7XG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHQvLyBzYXZlIHJlZmVyZW5jZXMgdG8gdGhlIHRleHR1cmVzXG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX3NtYWxsLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbWVkLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbGFyZ2Vcblx0XHRdO1xuXHRcdHRoaXMudGV4dHVyZXMuZm9yRWFjaCh0ZXggPT4gdGV4LmZsaXBZID0gZmFsc2UpO1xuXHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzBdLCB0cnVlKTtcblx0XHRcblx0XHQvLyBwb3NpdGlvbiB0YWJsZVxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDEuMCwgMCk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy5jaGFuZ2VNb2RlLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9saWJlcmFsUG9saWNpZXMnLCB0aGlzLnVwZGF0ZVBvbGljaWVzLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9mYXNjaXN0UG9saWNpZXMnLCB0aGlzLnVwZGF0ZVBvbGljaWVzLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9mYWlsZWRWb3RlcycsIHRoaXMudXBkYXRlUG9saWNpZXMuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRjaGFuZ2VNb2RlKHtkYXRhOiB7Z2FtZToge3N0YXRlLCB0dXJuT3JkZXJ9fX0pXG5cdHtcblx0XHRpZih0dXJuT3JkZXIubGVuZ3RoID49IDkpXG5cdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1syXSk7XG5cdFx0ZWxzZSBpZih0dXJuT3JkZXIubGVuZ3RoID49IDcpXG5cdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1sxXSk7XG5cdFx0ZWxzZVxuXHRcdFx0dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbMF0pO1xuXHR9XG5cblx0c2V0VGV4dHVyZShuZXdUZXgsIHN3aXRjaExpZ2h0bWFwKVxuXHR7XG5cdFx0dGhpcy5tb2RlbC50cmF2ZXJzZShvID0+IHtcblx0XHRcdGlmKG8gaW5zdGFuY2VvZiBUSFJFRS5NZXNoKVxuXHRcdFx0e1xuXHRcdFx0XHRpZihzd2l0Y2hMaWdodG1hcClcblx0XHRcdFx0XHRvLm1hdGVyaWFsLmxpZ2h0TWFwID0gby5tYXRlcmlhbC5tYXA7XG5cblx0XHRcdFx0by5tYXRlcmlhbC5tYXAgPSBuZXdUZXg7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHR1cGRhdGVQb2xpY2llcyh7ZGF0YToge2dhbWU6IHtsaWJlcmFsUG9saWNpZXMsIGZhc2Npc3RQb2xpY2llcywgaGFuZCwgc3RhdGV9fX0pXG5cdHtcblx0XHRsZXQgdXBkYXRlcyA9IFtdO1xuXG5cdFx0Ly8gcXVldWUgdXAgY2FyZHMgdG8gYmUgYWRkZWQgdG8gdGhlIHRhYmxlIHRoaXMgdXBkYXRlXG5cdFx0Zm9yKHZhciBpPXRoaXMubGliZXJhbENhcmRzOyBpPGxpYmVyYWxQb2xpY2llczsgaSsrKXtcblx0XHRcdGxldCBjYXJkID0gbmV3IExpYmVyYWxQb2xpY3lDYXJkKCk7XG5cdFx0XHRjYXJkLmFuaW1hdGUgPSAoKSA9PiBBbmltYXRlLnNpbXBsZShjYXJkLCB7XG5cdFx0XHRcdHBvczogTGliZXJhbFNwb3RzLnBvc2l0aW9uc1tpXSxcblx0XHRcdFx0cXVhdDogTGliZXJhbFNwb3RzLnF1YXRlcm5pb24sXG5cdFx0XHRcdHNjYWxlOiBMaWJlcmFsU3BvdHMuc2NhbGVcblx0XHRcdH0pLnRoZW4oKCkgPT4gQW5pbWF0ZS53YWl0KDUwMCkpO1xuXHRcdFx0Y2FyZC5wbGF5U291bmQgPSAoKSA9PiBTSC5hdWRpby5saWJlcmFsU3RpbmcubG9hZGVkLnRoZW4oKCkgPT4gU0guYXVkaW8ubGliZXJhbFN0aW5nLnBsYXkoKSk7XG5cdFx0XHR1cGRhdGVzLnB1c2goY2FyZCk7XG5cdFx0fVxuXHRcdFxuXHRcdGZvcih2YXIgaT10aGlzLmZhc2Npc3RDYXJkczsgaTxmYXNjaXN0UG9saWNpZXM7IGkrKyl7XG5cdFx0XHRsZXQgY2FyZCA9IG5ldyBGYXNjaXN0UG9saWN5Q2FyZCgpO1xuXHRcdFx0Y2FyZC5hbmltYXRlID0gKCkgPT4gQW5pbWF0ZS5zaW1wbGUoY2FyZCwge1xuXHRcdFx0XHRwb3M6IEZhc2Npc3RTcG90cy5wb3NpdGlvbnNbaV0sXG5cdFx0XHRcdHF1YXQ6IEZhc2Npc3RTcG90cy5xdWF0ZXJuaW9uLFxuXHRcdFx0XHRzY2FsZTogRmFzY2lzdFNwb3RzLnNjYWxlXG5cdFx0XHR9KTtcblx0XHRcdGNhcmQucGxheVNvdW5kID0gKCkgPT4gU0guYXVkaW8uZmFzY2lzdFN0aW5nLmxvYWRlZC50aGVuKCgpID0+IFNILmF1ZGlvLmZhc2Npc3RTdGluZy5wbGF5KCkpO1xuXHRcdFx0dXBkYXRlcy5wdXNoKGNhcmQpO1xuXHRcdH1cblxuXHRcdGlmKHN0YXRlID09PSAnYWZ0ZXJtYXRoJyAmJiBoYW5kID09PSAxKXtcblx0XHRcdHVwZGF0ZXMucHVzaCh0aGlzLnZldG9DYXJkKTtcblx0XHR9XG5cblx0XHRsZXQgYW5pbWF0aW9uID0gbnVsbDtcblx0XHRpZih1cGRhdGVzLmxlbmd0aCA9PT0gMSlcblx0XHR7XG5cdFx0XHRsZXQgY2FyZCA9IHVwZGF0ZXNbMF07XG5cdFx0XHRpZihjYXJkID09PSB0aGlzLnZldG9DYXJkKVxuXHRcdFx0e1xuXHRcdFx0XHRjYXJkLnZpc2libGUgPSB0cnVlOyBjYXJkLm1hdGVyaWFsLm9wYWNpdHkgPSAxO1xuXHRcdFx0XHRhbmltYXRpb24gPSBBbmltYXRlLmNhcmRGbG91cmlzaChjYXJkKVxuXHRcdFx0XHRcdC50aGVuKCgpID0+IEFuaW1hdGUudmFuaXNoKGNhcmQpKVxuXHRcdFx0XHRcdC50aGVuKCgpID0+IHsgY2FyZC52aXNpYmxlID0gZmFsc2U7IH0pO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFkZChjYXJkKTtcblx0XHRcdFx0dGhpcy5jYXJkcy5wdXNoKGNhcmQpO1xuXHRcdFx0XHRjYXJkLnBsYXlTb3VuZCgpO1xuXHRcdFx0XHRhbmltYXRpb24gPSBBbmltYXRlLmNhcmRGbG91cmlzaChjYXJkKVxuXHRcdFx0XHRcdC50aGVuKCgpID0+IGNhcmQuYW5pbWF0ZSgpKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdC8vIHBsYWNlIG9uIHRoZWlyIHNwb3RzXG5cdFx0XHR1cGRhdGVzLmZvckVhY2goY2FyZCA9PiB7XG5cdFx0XHRcdHRoaXMuYWRkKGNhcmQpO1xuXHRcdFx0XHR0aGlzLmNhcmRzLnB1c2goY2FyZCk7XG5cdFx0XHRcdGNhcmQuYW5pbWF0ZSgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGFuaW1hdGlvbiA9IFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdH1cblxuXHRcdGlmKHN0YXRlID09PSAnYWZ0ZXJtYXRoJyl7XG5cdFx0XHRhbmltYXRpb24udGhlbigoKSA9PiB7XG5cdFx0XHRcdFNILmRpc3BhdGNoRXZlbnQoe1xuXHRcdFx0XHRcdHR5cGU6ICdwb2xpY3lBbmltRG9uZScsXG5cdFx0XHRcdFx0YnViYmxlczogZmFsc2Vcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZihsaWJlcmFsUG9saWNpZXMgPT09IDAgJiYgZmFzY2lzdFBvbGljaWVzID09PSAwKXtcblx0XHRcdHRoaXMuY2FyZHMuZm9yRWFjaChjID0+IHRoaXMucmVtb3ZlKGMpKTtcblx0XHR9XG5cblx0XHR0aGlzLmxpYmVyYWxDYXJkcyA9IGxpYmVyYWxQb2xpY2llcztcblx0XHR0aGlzLmZhc2Npc3RDYXJkcyA9IGZhc2Npc3RQb2xpY2llcztcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuZnVuY3Rpb24gZ2V0R2FtZUlkKClcbntcblx0Ly8gZmlyc3QgY2hlY2sgdGhlIHVybFxuXHRsZXQgcmUgPSAvWz8mXWdhbWVJZD0oW14mXSspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRpZihyZSl7XG5cdFx0cmV0dXJuIHJlWzFdO1xuXHR9XG5cdGVsc2UgaWYoYWx0c3BhY2UgJiYgYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdHJldHVybiBTSC5lbnYuc2lkO1xuXHR9XG5cdGVsc2Uge1xuXHRcdGxldCBpZCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDAgKTtcblx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZSgnP2dhbWVJZD0nK2lkKTtcblx0fVxufVxuXG5mdW5jdGlvbiBwYXJzZUNTVihzdHIpe1xuXHRpZighc3RyKSByZXR1cm4gW107XG5cdGVsc2UgcmV0dXJuIHN0ci5zcGxpdCgnLCcpO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVF1ZXN0aW9uKHRleHQsIHRleHR1cmUgPSBudWxsKVxue1xuXHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XG5cblx0Ly8gc2V0IHVwIGNhbnZhc1xuXHRsZXQgYm1wO1xuXHRpZighdGV4dHVyZSl7XG5cdFx0Ym1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0Ym1wLndpZHRoID0gNTEyO1xuXHRcdGJtcC5oZWlnaHQgPSAyNTY7XG5cdH1cblx0ZWxzZSB7XG5cdFx0Ym1wID0gdGV4dHVyZS5pbWFnZTtcblx0fVxuXG5cdGxldCBnID0gYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdGcuY2xlYXJSZWN0KDAsIDAsIDUxMiwgMjU2KTtcblx0Zy50ZXh0QWxpZ24gPSAnY2VudGVyJztcblx0Zy5maWxsU3R5bGUgPSAnYmxhY2snO1xuXG5cdC8vIHdyaXRlIHRleHRcblx0Zy5mb250ID0gJ2JvbGQgNTBweCAnK2ZvbnRTdGFjaztcblx0bGV0IGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG5cdGZvcihsZXQgaT0wOyBpPGxpbmVzLmxlbmd0aDsgaSsrKXtcblx0XHRnLmZpbGxUZXh0KGxpbmVzW2ldLCAyNTYsIDUwKzU1KmkpO1xuXHR9XG5cblx0aWYodGV4dHVyZSl7XG5cdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdFx0cmV0dXJuIHRleHR1cmU7XG5cdH1cblx0ZWxzZSB7XG5cdFx0cmV0dXJuIG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKGJtcCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gbWVyZ2VPYmplY3RzKGEsIGIsIGRlcHRoPTIpXG57XG5cdGZ1bmN0aW9uIHVuaXF1ZShlLCBpLCBhKXtcblx0XHRyZXR1cm4gYS5pbmRleE9mKGUpID09PSBpO1xuXHR9XG5cblx0bGV0IGFJc09iaiA9IGEgaW5zdGFuY2VvZiBPYmplY3QsIGJJc09iaiA9IGIgaW5zdGFuY2VvZiBPYmplY3Q7XG5cdGlmKGFJc09iaiAmJiBiSXNPYmogJiYgZGVwdGggPiAwKVxuXHR7XG5cdFx0bGV0IHJlc3VsdCA9IHt9O1xuXHRcdGxldCBrZXlzID0gWy4uLk9iamVjdC5rZXlzKGEpLCAuLi5PYmplY3Qua2V5cyhiKV0uZmlsdGVyKHVuaXF1ZSk7XG5cdFx0Zm9yKGxldCBpPTA7IGk8a2V5cy5sZW5ndGg7IGkrKyl7XG5cdFx0XHRyZXN1bHRba2V5c1tpXV0gPSBtZXJnZU9iamVjdHMoYVtrZXlzW2ldXSwgYltrZXlzW2ldXSwgZGVwdGgtMSk7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0ZWxzZSBpZihiICE9PSB1bmRlZmluZWQpXG5cdFx0cmV0dXJuIGI7XG5cdGVsc2Vcblx0XHRyZXR1cm4gYTtcbn1cblxuZnVuY3Rpb24gbGF0ZVVwZGF0ZShmbilcbntcblx0cmV0dXJuICguLi5hcmdzKSA9PiB7XG5cdFx0c2V0VGltZW91dCgoKSA9PiBmbiguLi5hcmdzKSwgMTUpO1xuXHR9O1xufVxuXG5leHBvcnQgeyBnZXRHYW1lSWQsIHBhcnNlQ1NWLCBnZW5lcmF0ZVF1ZXN0aW9uLCBtZXJnZU9iamVjdHMsIGxhdGVVcGRhdGUgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE5hbWVwbGF0ZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXQpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC42MzUsIDAuMjIpO1xuXHRcdHNlYXQuYWRkKHRoaXMpO1xuXG5cdFx0Ly8gYWRkIDNkIG1vZGVsXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy5uYW1lcGxhdGUuY2hpbGRyZW5bMF0uY2xvbmUoKTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCBNYXRoLlBJLzIpO1xuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xuXG5cdFx0Ly8gZ2VuZXJhdGUgbWF0ZXJpYWxcblx0XHR0aGlzLmJtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMuYm1wLndpZHRoID0gTmFtZXBsYXRlLnRleHR1cmVTaXplO1xuXHRcdHRoaXMuYm1wLmhlaWdodCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAvIDI7XG5cdFx0dGhpcy5tb2RlbC5tYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG5cdFx0XHRtYXA6IG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKHRoaXMuYm1wKVxuXHRcdH0pO1xuXG5cdFx0Ly8gY3JlYXRlIGxpc3RlbmVyIHByb3hpZXNcblx0XHR0aGlzLl9ob3ZlckJlaGF2aW9yID0gbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJDb2xvcih7XG5cdFx0XHRjb2xvcjogbmV3IFRIUkVFLkNvbG9yKDB4ZmZhOGE4KVxuXHRcdH0pO1xuXHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0dGhpcy5tb2RlbC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdGlmKHN0YXRlID09PSAnc2V0dXAnKVxuXHRcdFx0XHR0aGlzLm1vZGVsLmFkZEJlaGF2aW9yKHRoaXMuX2hvdmVyQmVoYXZpb3IpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aGlzLm1vZGVsLnJlbW92ZUJlaGF2aW9yKHRoaXMuX2hvdmVyQmVoYXZpb3IpO1xuXHRcdH0pO1xuXHR9XG5cblx0dXBkYXRlVGV4dCh0ZXh0KVxuXHR7XG5cdFx0bGV0IGZvbnRTaXplID0gNy8zMiAqIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAqIDAuNjU7XG5cblx0XHQvLyBzZXQgdXAgY2FudmFzXG5cdFx0bGV0IGcgPSB0aGlzLmJtcC5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdGxldCBmb250U3RhY2sgPSAnXCJIZWx2ZXRpY2EgTmV1ZVwiLCBIZWx2ZXRpY2EsIEFyaWFsLCBTYW5zLVNlcmlmJztcblx0XHRnLmZpbGxTdHlsZSA9ICcjMjIyJztcblx0XHRnLmZpbGxSZWN0KDAsIDAsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSwgTmFtZXBsYXRlLnRleHR1cmVTaXplLzIpO1xuXHRcdGcuZm9udCA9IGBib2xkICR7Zm9udFNpemV9cHggJHtmb250U3RhY2t9YDtcblx0XHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xuXHRcdGcuZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHRnLmZpbGxUZXh0KHRleHQsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yLCAoMC40MiAtIDAuMTIpKihOYW1lcGxhdGUudGV4dHVyZVNpemUvMikpO1xuXG5cdFx0dGhpcy5tb2RlbC5tYXRlcmlhbC5tYXAubmVlZHNVcGRhdGUgPSB0cnVlO1xuXHR9XG5cblx0Y2xpY2soZSlcblx0e1xuXHRcdGlmKFNILmdhbWUuc3RhdGUgIT09ICdzZXR1cCcpIHJldHVybjtcblxuXHRcdGlmKCF0aGlzLnNlYXQub3duZXIpXG5cdFx0XHR0aGlzLnJlcXVlc3RKb2luKCk7XG5cdFx0ZWxzZSBpZih0aGlzLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcblx0XHRcdHRoaXMucmVxdWVzdExlYXZlKCk7XG5cdFx0ZWxzZSBpZihTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxuXHRcdFx0dGhpcy5yZXF1ZXN0S2ljaygpO1xuXHR9XG5cblx0cmVxdWVzdEpvaW4oKVxuXHR7XG5cdFx0U0guc29ja2V0LmVtaXQoJ2pvaW4nLCBPYmplY3QuYXNzaWduKHtzZWF0TnVtOiB0aGlzLnNlYXQuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpO1xuXHR9XG5cblx0cmVxdWVzdExlYXZlKClcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblx0XHRpZighc2VsZi5xdWVzdGlvbilcblx0XHR7XG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VsZi5zZWF0LmJhbGxvdC5hc2tRdWVzdGlvbignQXJlIHlvdSBzdXJlIHlvdVxcbndhbnQgdG8gbGVhdmU/JywgJ2xvY2FsX2xlYXZlJylcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xuXHRcdFx0XHRpZihjb25maXJtKXtcblx0XHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbGVhdmUnLCBTSC5sb2NhbFVzZXIuaWQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNlbGYucXVlc3Rpb24gPSBudWxsO1xuXHRcdFx0fSlcblx0XHRcdC5jYXRjaCgoKSA9PiB7IHNlbGYucXVlc3Rpb24gPSBudWxsOyB9KTtcblx0XHR9XG5cdH1cblxuXHRyZXF1ZXN0S2ljaygpXG5cdHtcblx0XHRsZXQgc2VsZiA9IHRoaXM7XG5cdFx0aWYoIXNlbGYucXVlc3Rpb24pXG5cdFx0e1xuXHRcdFx0bGV0IHNlYXQgPSBTSC5zZWF0c1tTSC5wbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0uc2VhdE51bV07XG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VhdC5iYWxsb3QuYXNrUXVlc3Rpb24oXG5cdFx0XHRcdCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byB0cnkgdG8ga2lja1xcbidcblx0XHRcdFx0K1NILnBsYXllcnNbc2VsZi5zZWF0Lm93bmVyXS5kaXNwbGF5TmFtZSxcblx0XHRcdFx0J2xvY2FsX2tpY2snXG5cdFx0XHQpXG5cdFx0XHQudGhlbihjb25maXJtID0+IHtcblx0XHRcdFx0aWYoY29uZmlybSl7XG5cdFx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2tpY2snLCBTSC5sb2NhbFVzZXIuaWQsIHNlbGYuc2VhdC5vd25lcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xuXHRcdH1cblx0fVxufVxuXG5OYW1lcGxhdGUudGV4dHVyZVNpemUgPSAyNTY7XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgKiBhcyBCYWxsb3RUeXBlIGZyb20gJy4vYmFsbG90JztcbmltcG9ydCB7dHJhbnNsYXRlIGFzIHRyfSBmcm9tICcuL3RoZW1lJztcblxuZnVuY3Rpb24gdXBkYXRlVm90ZXNJblByb2dyZXNzKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcbntcblx0bGV0IGJhbGxvdCA9IHRoaXM7XG5cdGlmKCFiYWxsb3Quc2VhdC5vd25lcikgcmV0dXJuO1xuXG5cdGxldCB2aXBzID0gZ2FtZS52b3Rlc0luUHJvZ3Jlc3M7XG5cblx0Ly8gdm90ZXMgdGhlIHNlYXQgb3duZXIgY2Fubm90IHBhcnRpY2lwYXRlIGluIChhbHJlYWR5IHZvdGVkIG9yIGJsb2NrZWQpXG5cdGxldCBibGFja2xpc3RlZFZvdGVzID0gdmlwcy5maWx0ZXIoaWQgPT4ge1xuXHRcdGxldCB2cyA9IFsuLi52b3Rlc1tpZF0ueWVzVm90ZXJzLCAuLi52b3Rlc1tpZF0ubm9Wb3RlcnNdO1xuXHRcdGxldCBudiA9IHZvdGVzW2lkXS5ub25Wb3RlcnM7XG5cdFx0cmV0dXJuIG52LmluY2x1ZGVzKGJhbGxvdC5zZWF0Lm93bmVyKSB8fCB2cy5pbmNsdWRlcyhiYWxsb3Quc2VhdC5vd25lcik7XG5cdH0pO1xuXG5cdC8vIHZvdGVzIGFkZGVkIHRoaXMgdXBkYXRlIHRoYXQgdGhlIHNlYXRlZCB1c2VyIGlzIGVsaWdpYmxlIGZvclxuXHRsZXQgbmV3Vm90ZXMgPSB2aXBzLmZpbHRlcihcblx0XHRpZCA9PiAoIVNILmdhbWUudm90ZXNJblByb2dyZXNzIHx8ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcy5pbmNsdWRlcyhpZCkpICYmICFibGFja2xpc3RlZFZvdGVzLmluY2x1ZGVzKGlkKVxuXHQpO1xuXG5cdC8vIHZvdGVzIGFscmVhZHkgcGFydGljaXBhdGVkIGluLCBwbHVzIGNvbXBsZXRlZCB2b3Rlc1xuXHRsZXQgZmluaXNoZWRWb3RlcyA9ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcyA/IGJsYWNrbGlzdGVkVm90ZXNcblx0XHQ6IFNILmdhbWUudm90ZXNJblByb2dyZXNzLmZpbHRlcihpZCA9PiAhdmlwcy5pbmNsdWRlcyhpZCkpLmNvbmNhdChibGFja2xpc3RlZFZvdGVzKTtcblxuXHRuZXdWb3Rlcy5mb3JFYWNoKHZJZCA9PlxuXHR7XG5cdFx0Ly8gZ2VuZXJhdGUgbmV3IHF1ZXN0aW9uIHRvIGFza1xuXHRcdGxldCBxdWVzdGlvblRleHQsIG9wdHMgPSB7fTtcblx0XHRpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdlbGVjdCcpe1xuXHRcdFx0cXVlc3Rpb25UZXh0ID0gcGxheWVyc1tnYW1lLnByZXNpZGVudF0uZGlzcGxheU5hbWVcblx0XHRcdFx0KyBgIGZvciAke3RyKCdwcmVzaWRlbnQnKX0gYW5kIGBcblx0XHRcdFx0KyBwbGF5ZXJzW2dhbWUuY2hhbmNlbGxvcl0uZGlzcGxheU5hbWVcblx0XHRcdFx0KyBgIGZvciAke3RyKCdjaGFuY2VsbG9yJyl9P2A7XG5cdFx0fVxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAnam9pbicpe1xuXHRcdFx0cXVlc3Rpb25UZXh0ID0gdm90ZXNbdklkXS5kYXRhICsgJyB0byBqb2luPyc7XG5cdFx0fVxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAna2ljaycpe1xuXHRcdFx0cXVlc3Rpb25UZXh0ID0gJ1ZvdGUgdG8ga2ljayAnXG5cdFx0XHRcdCsgcGxheWVyc1t2b3Rlc1t2SWRdLnRhcmdldDFdLmRpc3BsYXlOYW1lXG5cdFx0XHRcdCsgJz8nO1xuXHRcdH1cblx0XHRlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ3R1dG9yaWFsJyl7XG5cdFx0XHRxdWVzdGlvblRleHQgPSAnUGxheSB0dXRvcmlhbD8nO1xuXHRcdH1cblx0XHRlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2NvbmZpcm1Sb2xlJylcblx0XHR7XG5cdFx0XHRvcHRzLmNob2ljZXMgPSBCYWxsb3RUeXBlLkNPTkZJUk07XG5cdFx0XHRsZXQgcm9sZTtcblx0XHRcdGlmKGJhbGxvdC5zZWF0Lm93bmVyID09PSBTSC5sb2NhbFVzZXIuaWQpe1xuXHRcdFx0XHRyb2xlID0gcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdLnJvbGU7XG5cdFx0XHRcdHJvbGUgPSB0cihyb2xlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcm9sZS5zbGljZSgxKSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0cm9sZSA9ICc8UkVEQUNURUQ+Jztcblx0XHRcdH1cblx0XHRcdHF1ZXN0aW9uVGV4dCA9ICdZb3VyIHJvbGU6XFxuJyArIHJvbGU7XG5cdFx0fVxuXG5cdFx0aWYocXVlc3Rpb25UZXh0KVxuXHRcdHtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbihxdWVzdGlvblRleHQsIHZJZCwgb3B0cylcblx0XHRcdC50aGVuKGFuc3dlciA9PiB7XG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCd2b3RlJywgdklkLCBTSC5sb2NhbFVzZXIuaWQsIGFuc3dlcik7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IGNvbnNvbGUubG9nKCdWb3RlIHNjcnViYmVkOicsIHZJZCkpO1xuXHRcdH1cblx0fSk7XG5cblx0aWYoZmluaXNoZWRWb3Rlcy5pbmNsdWRlcyhiYWxsb3QuZGlzcGxheWVkKSl7XG5cdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0fVxufVxuXG5mdW5jdGlvbiB1cGRhdGVTdGF0ZSh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcbntcblx0bGV0IGJhbGxvdCA9IHRoaXM7XG5cblx0ZnVuY3Rpb24gY2hvb3NlUGxheWVyKHF1ZXN0aW9uLCBjb25maXJtUXVlc3Rpb24sIGlkKVxuXHR7XG5cdFx0ZnVuY3Rpb24gY29uZmlybVBsYXllcih1c2VySWQpXG5cdFx0e1xuXHRcdFx0bGV0IHVzZXJuYW1lID0gU0gucGxheWVyc1t1c2VySWRdLmRpc3BsYXlOYW1lO1xuXHRcdFx0bGV0IHRleHQgPSBjb25maXJtUXVlc3Rpb24ucmVwbGFjZSgne30nLCB1c2VybmFtZSk7XG5cdFx0XHRyZXR1cm4gYmFsbG90LmFza1F1ZXN0aW9uKHRleHQsICdsb2NhbF8nK2lkKydfY29uZmlybScpXG5cdFx0XHQudGhlbihjb25maXJtZWQgPT4ge1xuXHRcdFx0XHRpZihjb25maXJtZWQpe1xuXHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodXNlcklkKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gY2hvb3NlUGxheWVyKHF1ZXN0aW9uLCBjb25maXJtUXVlc3Rpb24sIGlkKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGJhbGxvdC5hc2tRdWVzdGlvbihxdWVzdGlvbiwgJ2xvY2FsXycraWQsIHtjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVH0pXG5cdFx0LnRoZW4oY29uZmlybVBsYXllcik7XG5cdH1cblxuXHRmdW5jdGlvbiBoaWRlTm9taW5hdGVQbGFjZWhvbGRlcih7ZGF0YToge2dhbWV9fSlcblx0e1xuXHRcdGlmKGdhbWUuc3RhdGUgIT09ICdub21pbmF0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2NoYW5jZWxsb3InKXtcblx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XG5cdFx0fVxuXHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVOb21pbmF0ZVBsYWNlaG9sZGVyKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGhpZGVQb2xpY3lQbGFjZWhvbGRlcih7ZGF0YToge2dhbWV9fSlcblx0e1xuXHRcdGlmKGdhbWUuc3RhdGUgIT09ICdwb2xpY3kxJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcG9saWN5MScgfHxcblx0XHRcdGdhbWUuc3RhdGUgIT09ICdwb2xpY3kyJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcG9saWN5Midcblx0XHQpe1xuXHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHR9XG5cdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZVBvbGljeVBsYWNlaG9sZGVyKTtcblx0fVxuXG5cdGlmKGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRjaG9vc2VQbGF5ZXIoYENob29zZSB5b3VyICR7dHIoJ2NoYW5jZWxsb3InKX0hYCwgYE5hbWUge30gYXMgJHt0cignY2hhbmNlbGxvcicpfT9gLCAnbm9taW5hdGUnKVxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ25vbWluYXRlJywgdXNlcklkKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbihgQ2hvb3NlIHlvdXIgJHt0cignY2hhbmNlbGxvcicpfSFgLCAnd2FpdF9mb3JfY2hhbmNlbGxvcicsIHtcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXG5cdFx0XHRcdGZha2U6IHRydWUsXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ25vbWluYXRlJ1xuXHRcdFx0fSk7XG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlTm9taW5hdGVQbGFjZWhvbGRlcik7XG5cdFx0fVxuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTEnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGxldCBvcHRzID0ge2Nob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLCBwb2xpY3lIYW5kOiBnYW1lLmhhbmR9O1xuXHRcdGlmKFNILmxvY2FsVXNlci5pZCAhPT0gZ2FtZS5wcmVzaWRlbnQpe1xuXHRcdFx0T2JqZWN0LmFzc2lnbihvcHRzLCB7ZmFrZTogdHJ1ZSwgaXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAncG9saWN5MSd9KTtcblx0XHR9XG5cblx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0Nob29zZSBvbmVcXG50byBkaXNjYXJkIScsICdsb2NhbF9wb2xpY3kxJywgb3B0cylcblx0XHQudGhlbihkaXNjYXJkID0+IHtcblx0XHRcdFNILnNvY2tldC5lbWl0KCdkaXNjYXJkX3BvbGljeTEnLCBkaXNjYXJkKTtcblx0XHR9KTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlUG9saWN5UGxhY2Vob2xkZXIpO1xuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTInICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLmNoYW5jZWxsb3IpXG5cdHtcblx0XHRsZXQgb3B0cyA9IHtcblx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLFxuXHRcdFx0cG9saWN5SGFuZDogZ2FtZS5oYW5kLFxuXHRcdFx0aW5jbHVkZVZldG86IGdhbWUuZmFzY2lzdFBvbGljaWVzID09PSA1ICYmICFiYWxsb3QuYmxvY2tWZXRvXG5cdFx0fTtcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgIT09IGdhbWUuY2hhbmNlbGxvcil7XG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwb2xpY3kyJ30pO1xuXHRcdH1cblxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQ2hvb3NlIG9uZVxcbnRvIGRpc2NhcmQhJywgJ2xvY2FsX3BvbGljeTInLCBvcHRzKVxuXHRcdC50aGVuKGRpc2NhcmQgPT4ge1xuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2Rpc2NhcmRfcG9saWN5MicsIGRpc2NhcmQpO1xuXHRcdH0sIGVyciA9PiBjb25zb2xlLmVycm9yKGVycikpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVQb2xpY3lQbGFjZWhvbGRlcik7XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnaW52ZXN0aWdhdGUnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xuXHRcdFx0Y2hvb3NlUGxheWVyKCdFeGVjdXRpdmUgcG93ZXI6IENob29zZSBvbmUgcGxheWVyIHRvIGludmVzdGlnYXRlIScsICdJbnZlc3RpZ2F0ZSB7fT8nLCAnaW52ZXN0aWdhdGUnKVxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcblx0XHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHRcdFx0dHlwZTogJ2ludmVzdGlnYXRlJyxcblx0XHRcdFx0XHRkYXRhOiB1c2VySWRcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIG9uZSBwbGF5ZXIgdG8gaW52ZXN0aWdhdGUhJywgJ3dhaXRfZm9yX2ludmVzdGlnYXRlJywge1xuXHRcdFx0XHRjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCxcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAnaW52ZXN0aWdhdGUnXG5cdFx0XHR9KTtcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdFx0aWYoc3RhdGUgIT09ICdpbnZlc3RpZ2F0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2ludmVzdGlnYXRlJylcblx0XHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHRcdFx0fTtcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0fVxuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BlZWsnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGxldCBvcHRzID0ge2Nob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLCBwb2xpY3lIYW5kOiA4IHwgKGdhbWUuZGVjayY3KX07XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkICE9PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwZWVrJ30pO1xuXHRcdH1cblxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBUb3Agb2YgcG9saWN5IGRlY2snLCAnbG9jYWxfcGVlaycsIG9wdHMpXG5cdFx0LnRoZW4oZGlzY2FyZCA9PiB7XG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnY29udGludWUnKTtcblx0XHR9KTtcblx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XG5cdFx0XHRpZihzdGF0ZSAhPT0gJ3BlZWsnICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wZWVrJylcblx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0fTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ25hbWVTdWNjZXNzb3InICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xuXHRcdFx0Y2hvb3NlUGxheWVyKGBFeGVjdXRpdmUgcG93ZXI6IENob29zZSB0aGUgbmV4dCAke3RyKCdwcmVzaWRlbnQnKX0hYCwgYHt9IGZvciAke3RyKCdwcmVzaWRlbnQnKX0/YCwgJ25hbWVTdWNjZXNzb3InKVxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ25hbWVfc3VjY2Vzc29yJywgdXNlcklkKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbihgRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgdGhlIG5leHQgJHt0cigncHJlc2lkZW50Jyl9IWAsICd3YWl0X2Zvcl9zdWNjZXNzb3InLCB7XG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxuXHRcdFx0XHRmYWtlOiB0cnVlLFxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICduYW1lU3VjY2Vzc29yJ1xuXHRcdFx0fSk7XG5cdFx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XG5cdFx0XHRcdGlmKHN0YXRlICE9PSAnbmFtZVN1Y2Nlc3NvcicgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX3N1Y2Nlc3NvcicpXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHRcdH07XG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHRcdH1cblx0fVxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdleGVjdXRlJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXG5cdHtcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcblx0XHRcdGNob29zZVBsYXllcignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgYSBwbGF5ZXIgdG8gZXhlY3V0ZSEnLCAnRXhlY3V0ZSB7fT8nLCAnZXhlY3V0ZScpXG5cdFx0XHQudGhlbih1c2VySWQgPT4ge1xuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnZXhlY3V0ZScsIHVzZXJJZCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIGEgcGxheWVyIHRvIGV4ZWN1dGUhJywgJ3dhaXRfZm9yX2V4ZWN1dGUnLCB7XG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxuXHRcdFx0XHRmYWtlOiB0cnVlLFxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdleGVjdXRlJ1xuXHRcdFx0fSk7XG5cdFx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XG5cdFx0XHRcdGlmKHN0YXRlICE9PSAnZXhlY3V0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2V4ZWN1dGUnKVxuXHRcdFx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0XHR9O1xuXHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHR9XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAndmV0bycgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0FwcHJvdmUgdmV0bz8nLCAnbG9jYWxfdmV0bycpLnRoZW4oYXBwcm92ZWQgPT4ge1xuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnY29uZmlybV92ZXRvJywgYXBwcm92ZWQpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdBcHByb3ZlIHZldG8/JywgJ3dhaXRfZm9yX3ZldG8nLCB7XG5cdFx0XHRcdGZha2U6IHRydWUsXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3ZldG8nXG5cdFx0XHR9KTtcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdFx0aWYoc3RhdGUgIT09ICd2ZXRvJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfdmV0bycpXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHRcdH1cblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0fVxuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3ZldG8nKXtcblx0XHRiYWxsb3QuYmxvY2tWZXRvID0gdHJ1ZTtcblx0fVxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnKXtcblx0XHRiYWxsb3QuYmxvY2tWZXRvID0gZmFsc2U7XG5cdH1cbn1cblxuZXhwb3J0IHt1cGRhdGVWb3Rlc0luUHJvZ3Jlc3MsIHVwZGF0ZVN0YXRlfTsiLCIndXNlIHN0cmljdCc7XG5cbi8qXG4qIERlY2tzIGhhdmUgMTcgY2FyZHM6IDYgbGliZXJhbCwgMTEgZmFzY2lzdC5cbiogSW4gYml0LXBhY2tlZCBib29sZWFuIGFycmF5cywgMSBpcyBsaWJlcmFsLCAwIGlzIGZhc2Npc3QuXG4qIFRoZSBtb3N0IHNpZ25pZmljYW50IGJpdCBpcyBhbHdheXMgMS5cbiogRS5nLiAwYjEwMTAwMSByZXByZXNlbnRzIGEgZGVjayB3aXRoIDIgbGliZXJhbCBhbmQgMyBmYXNjaXN0IGNhcmRzXG4qL1xuXG5sZXQgRlVMTF9ERUNLID0gMHgyMDAzZixcblx0RkFTQ0lTVCA9IDAsXG5cdExJQkVSQUwgPSAxO1xuXG5sZXQgcG9zaXRpb25zID0gW1xuXHQweDEsIDB4MiwgMHg0LCAweDgsXG5cdDB4MTAsIDB4MjAsIDB4NDAsIDB4ODAsXG5cdDB4MTAwLCAweDIwMCwgMHg0MDAsIDB4ODAwLFxuXHQweDEwMDAsIDB4MjAwMCwgMHg0MDAwLCAweDgwMDAsXG5cdDB4MTAwMDAsIDB4MjAwMDAsIDB4NDAwMDBcbl07XG5cbmZ1bmN0aW9uIGxlbmd0aChkZWNrKVxue1xuXHRyZXR1cm4gcG9zaXRpb25zLmZpbmRJbmRleChzID0+IHMgPiBkZWNrKSAtMTtcbn1cblxuZnVuY3Rpb24gc2h1ZmZsZShkZWNrKVxue1xuXHRsZXQgbCA9IGxlbmd0aChkZWNrKTtcblx0Zm9yKGxldCBpPWwtMTsgaT4wOyBpLS0pXG5cdHtcblx0XHRsZXQgbyA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGkpO1xuXHRcdGxldCBpVmFsID0gZGVjayAmIDEgPDwgaSwgb1ZhbCA9IGRlY2sgJiAxIDw8IG87XG5cdFx0bGV0IHN3YXBwZWQgPSBpVmFsID4+PiBpLW8gfCBvVmFsIDw8IGktbztcblx0XHRkZWNrID0gZGVjayAtIGlWYWwgLSBvVmFsICsgc3dhcHBlZDtcblx0fVxuXG5cdHJldHVybiBkZWNrO1xufVxuXG5mdW5jdGlvbiBkcmF3VGhyZWUoZClcbntcblx0cmV0dXJuIGQgPCA4ID8gWzEsIGRdIDogW2QgPj4+IDMsIDggfCBkICYgN107XG59XG5cbmZ1bmN0aW9uIGRpc2NhcmRPbmUoZGVjaywgcG9zKVxue1xuXHRsZXQgYm90dG9tSGFsZiA9IGRlY2sgJiAoMSA8PCBwb3MpLTE7XG5cdGxldCB0b3BIYWxmID0gZGVjayAmIH4oKDEgPDwgcG9zKzEpLTEpO1xuXHR0b3BIYWxmID4+Pj0gMTtcblx0bGV0IG5ld0RlY2sgPSB0b3BIYWxmIHwgYm90dG9tSGFsZjtcblx0XG5cdGxldCB2YWwgPSAoZGVjayAmIDE8PHBvcykgPj4+IHBvcztcblxuXHRyZXR1cm4gW25ld0RlY2ssIHZhbF07XG59XG5cbmZ1bmN0aW9uIGFwcGVuZChkZWNrLCB2YWwpXG57XG5cdHJldHVybiBkZWNrIDw8IDEgfCB2YWw7XG59XG5cbmZ1bmN0aW9uIHRvQXJyYXkoZGVjaylcbntcblx0bGV0IGFyciA9IFtdO1xuXHR3aGlsZShkZWNrID4gMSl7XG5cdFx0YXJyLnB1c2goZGVjayAmIDEpO1xuXHRcdGRlY2sgPj4+PSAxO1xuXHR9XG5cblx0cmV0dXJuIGFycjtcbn1cblxuZXhwb3J0IHtsZW5ndGgsIHNodWZmbGUsIGRyYXdUaHJlZSwgZGlzY2FyZE9uZSwgYXBwZW5kLCB0b0FycmF5LCBGVUxMX0RFQ0ssIExJQkVSQUwsIEZBU0NJU1R9OyIsIid1c2Ugc3RyaWN0OydcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCB7IEJsYW5rQ2FyZCwgSmFDYXJkLCBOZWluQ2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxQb2xpY3lDYXJkLCBWZXRvQ2FyZCB9IGZyb20gJy4vY2FyZCc7XG5pbXBvcnQgeyBnZW5lcmF0ZVF1ZXN0aW9uLCBsYXRlVXBkYXRlIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyBCUCBmcm9tICcuL2JhbGxvdHByb2Nlc3Nvcic7XG5pbXBvcnQgKiBhcyBCUEJBIGZyb20gJy4vYnBiYSc7XG5pbXBvcnQge05UZXh0LCBQbGFjZWhvbGRlck1lc2h9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xuXG5sZXQgUExBWUVSU0VMRUNUID0gMDtcbmxldCBDT05GSVJNID0gMTtcbmxldCBCSU5BUlkgPSAyO1xubGV0IFBPTElDWSA9IDM7XG5cbmNsYXNzIEJhbGxvdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXQpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLTAuMywgMC4yNSk7XG5cdFx0dGhpcy5yb3RhdGlvbi5zZXQoLjUsIE1hdGguUEksIDApO1xuXHRcdHNlYXQuYWRkKHRoaXMpO1xuXG5cdFx0dGhpcy5sYXN0UXVldWVkID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdFx0dGhpcy5kaXNwbGF5ZWQgPSBudWxsO1xuXHRcdHRoaXMuYmxvY2tWZXRvID0gZmFsc2U7XG5cblx0XHR0aGlzLl95ZXNDbGlja0hhbmRsZXIgPSBudWxsO1xuXHRcdHRoaXMuX25vQ2xpY2tIYW5kbGVyID0gbnVsbDtcblx0XHR0aGlzLl9ub21pbmF0ZUhhbmRsZXIgPSBudWxsO1xuXHRcdHRoaXMuX2NhbmNlbEhhbmRsZXIgPSBudWxsO1xuXG5cdFx0dGhpcy5qYUNhcmQgPSBuZXcgSmFDYXJkKCk7XG5cdFx0dGhpcy5uZWluQ2FyZCA9IG5ldyBOZWluQ2FyZCgpO1xuXHRcdFt0aGlzLmphQ2FyZCwgdGhpcy5uZWluQ2FyZF0uZm9yRWFjaChjID0+IHtcblx0XHRcdGMucG9zaXRpb24uc2V0KGMgaW5zdGFuY2VvZiBKYUNhcmQgPyAtMC4xIDogMC4xLCAtMC4xLCAwKTtcblx0XHRcdGMuc2NhbGUuc2V0U2NhbGFyKDAuMTUpO1xuXHRcdFx0Yy52aXNpYmxlID0gZmFsc2U7XG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQodGhpcy5qYUNhcmQsIHRoaXMubmVpbkNhcmQpO1xuXHRcdHRoaXMucG9saWNpZXMgPSBbXTtcblxuXHRcdC8vbGV0IGdlbyA9IG5ldyBUSFJFRS5QbGFuZUJ1ZmZlckdlb21ldHJ5KDAuNCwgMC4yKTtcblx0XHQvL2xldCBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe3RyYW5zcGFyZW50OiB0cnVlLCBzaWRlOiBUSFJFRS5Eb3VibGVTaWRlfSk7XG5cdFx0dGhpcy5xdWVzdGlvbiA9IFBsYWNlaG9sZGVyTWVzaC5jbG9uZSgpO1xuXHRcdHRoaXMucXVlc3Rpb24ucG9zaXRpb24uc2V0KDAsIDAuMDUsIDApO1xuXHRcdHRoaXMucXVlc3Rpb24uc2NhbGUuc2V0U2NhbGFyKC41KTtcblx0XHR0aGlzLnF1ZXN0aW9uLnZpc2libGUgPSBmYWxzZTtcblx0XHR0aGlzLmFkZCh0aGlzLnF1ZXN0aW9uKTtcblxuXHRcdHRoaXMudGV4dENvbXBvbmVudCA9IG5ldyBOVGV4dCh0aGlzLnF1ZXN0aW9uKTtcblx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt3aWR0aDogMS4xLCBoZWlnaHQ6IC40LCBmb250U2l6ZTogMSwgdmVydGljYWxBbGlnbjogJ3RvcCd9KTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV92b3Rlc0luUHJvZ3Jlc3MnLCBCUC51cGRhdGVWb3Rlc0luUHJvZ3Jlc3MuYmluZCh0aGlzKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgbGF0ZVVwZGF0ZShCUC51cGRhdGVTdGF0ZS5iaW5kKHRoaXMpKSk7XG5cdH1cblxuXHRhc2tRdWVzdGlvbihxVGV4dCwgaWQsIHtjaG9pY2VzID0gQklOQVJZLCBwb2xpY3lIYW5kID0gMHgxLCBpbmNsdWRlVmV0byA9IGZhbHNlLCBmYWtlID0gZmFsc2UsIGlzSW52YWxpZCA9ICgpID0+IHRydWV9ID0ge30pXG5cdHtcblx0XHRsZXQgc2VsZiA9IHRoaXM7XG5cblx0XHRmdW5jdGlvbiBpc1ZvdGVWYWxpZCgpXG5cdFx0e1xuXHRcdFx0bGV0IGlzRmFrZVZhbGlkID0gZmFrZSAmJiAhaXNJbnZhbGlkKCk7XG5cdFx0XHRsZXQgaXNMb2NhbFZvdGUgPSAvXmxvY2FsLy50ZXN0KGlkKTtcblx0XHRcdGxldCBpc0ZpcnN0VXBkYXRlID0gIVNILmdhbWUudm90ZXNJblByb2dyZXNzO1xuXHRcdFx0bGV0IHZvdGUgPSBTSC52b3Rlc1tpZF07XG5cdFx0XHRsZXQgdm90ZXJzID0gdm90ZSA/IFsuLi52b3RlLnllc1ZvdGVycywgLi4udm90ZS5ub1ZvdGVyc10gOiBbXTtcblx0XHRcdGxldCBhbHJlYWR5Vm90ZWQgPSB2b3RlcnMuaW5jbHVkZXMoc2VsZi5zZWF0Lm93bmVyKTtcblx0XHRcdHJldHVybiBpc0xvY2FsVm90ZSB8fCBpc0ZpcnN0VXBkYXRlIHx8IGlzRmFrZVZhbGlkIHx8IHZvdGUgJiYgIWFscmVhZHlWb3RlZDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBob29rVXBRdWVzdGlvbigpe1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKHF1ZXN0aW9uRXhlY3V0b3IpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHF1ZXN0aW9uRXhlY3V0b3IocmVzb2x2ZSwgcmVqZWN0KVxuXHRcdHtcblx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgYW5zd2VyIGlzIHN0aWxsIHJlbGV2YW50XG5cdFx0XHRpZighaXNWb3RlVmFsaWQoKSl7XG5cdFx0XHRcdHJldHVybiByZWplY3QoJ1ZvdGUgbm8gbG9uZ2VyIHZhbGlkJyk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHNob3cgdGhlIGJhbGxvdFxuXHRcdFx0Ly9zZWxmLnF1ZXN0aW9uLm1hdGVyaWFsLm1hcCA9IGdlbmVyYXRlUXVlc3Rpb24ocVRleHQsIHNlbGYucXVlc3Rpb24ubWF0ZXJpYWwubWFwKTtcblx0XHRcdHNlbGYudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6IGAke3FUZXh0fWB9KTtcblx0XHRcdHNlbGYucXVlc3Rpb24udmlzaWJsZSA9IHRydWU7XG5cblx0XHRcdC8vIGhvb2sgdXAgcS9hIGNhcmRzXG5cdFx0XHRpZihjaG9pY2VzID09PSBDT05GSVJNIHx8IGNob2ljZXMgPT09IEJJTkFSWSl7XG5cdFx0XHRcdHNlbGYuamFDYXJkLnZpc2libGUgPSB0cnVlO1xuXHRcdFx0XHRpZighZmFrZSl7XG5cdFx0XHRcdFx0c2VsZi5qYUNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKCd5ZXMnLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdFx0XHRpZihzZWxmLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcblx0XHRcdFx0XHRcdHNlbGYuamFDYXJkLmFkZEJlaGF2aW9yKCBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlclNjYWxlKCkgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSBzZWxmLmphQ2FyZC52aXNpYmxlID0gZmFsc2U7XG5cblx0XHRcdGlmKGNob2ljZXMgPT09IEJJTkFSWSl7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQudmlzaWJsZSA9IHRydWU7XG5cdFx0XHRcdGlmKCFmYWtlKXtcblx0XHRcdFx0XHRzZWxmLm5laW5DYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCgnbm8nLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdFx0XHRpZihzZWxmLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcblx0XHRcdFx0XHRcdHNlbGYubmVpbkNhcmQuYWRkQmVoYXZpb3IoIG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLkhvdmVyU2NhbGUoKSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHNlbGYubmVpbkNhcmQudmlzaWJsZSA9IGZhbHNlO1xuXG5cdFx0XHRpZihjaG9pY2VzID09PSBQTEFZRVJTRUxFQ1QgJiYgIWZha2Upe1xuXHRcdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdwbGF5ZXJTZWxlY3QnLCByZXNwb25kKCdwbGF5ZXInLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUE9MSUNZKXtcblx0XHRcdFx0bGV0IGNhcmRzID0gQlBCQS50b0FycmF5KHBvbGljeUhhbmQpO1xuXHRcdFx0XHRpZihpbmNsdWRlVmV0bykgY2FyZHMucHVzaCgtMSk7XG5cdFx0XHRcdGNhcmRzLmZvckVhY2goKHZhbCwgaSwgYXJyKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bGV0IGNhcmQgPSBudWxsO1xuXHRcdFx0XHRcdGlmKGZha2UpXG5cdFx0XHRcdFx0XHRjYXJkID0gbmV3IEJsYW5rQ2FyZCgpO1xuXHRcdFx0XHRcdGVsc2UgaWYodmFsID09PSAtMSlcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgVmV0b0NhcmQoKTtcblx0XHRcdFx0XHRlbHNlIGlmKHZhbCA9PT0gQlBCQS5MSUJFUkFMKVxuXHRcdFx0XHRcdFx0Y2FyZCA9IG5ldyBMaWJlcmFsUG9saWN5Q2FyZCgpO1xuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgRmFzY2lzdFBvbGljeUNhcmQoKTtcblxuXHRcdFx0XHRcdGNhcmQuc2NhbGUuc2V0U2NhbGFyKDAuMTUpO1xuXG5cdFx0XHRcdFx0bGV0IHdpZHRoID0gLjE1ICogYXJyLmxlbmd0aDtcblx0XHRcdFx0XHRsZXQgeCA9IC13aWR0aC8yICsgLjE1KmkgKyAuMDc1O1xuXHRcdFx0XHRcdGNhcmQucG9zaXRpb24uc2V0KHgsIC0wLjA3LCAwKTtcblx0XHRcdFx0XHRzZWxmLmFkZChjYXJkKTtcblx0XHRcdFx0XHRzZWxmLnBvbGljaWVzLnB1c2goY2FyZCk7XG5cblx0XHRcdFx0XHRpZighZmFrZSl7XG5cdFx0XHRcdFx0XHRjYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCh2YWwgPT09IC0xID8gLTEgOiBpLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0aWYoc2VsZi5zZWF0Lm93bmVyID09PSBTSC5sb2NhbFVzZXIuaWQpXG5cdFx0XHRcdFx0XHRcdGNhcmQuYWRkQmVoYXZpb3IoIG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLkhvdmVyU2NhbGUoKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuYWRkRXZlbnRMaXN0ZW5lcignY2FuY2VsVm90ZScsIHJlc3BvbmQoJ2NhbmNlbCcsIHJlc29sdmUsIHJlamVjdCkpO1xuXG5cdFx0XHRpZihzZWxmLl9vdXR0cm9BbmltKXtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KHNlbGYuX291dHRyb0FuaW0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZighc2VsZi5kaXNwbGF5ZWQpXG5cdFx0XHRcdEFuaW1hdGUuc3dpbmdJbihzZWxmLCBNYXRoLlBJLzItLjUsIC40MSwgODAwKTtcblxuXHRcdFx0c2VsZi5kaXNwbGF5ZWQgPSBpZDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZXNwb25kKGFuc3dlciwgcmVzb2x2ZSwgcmVqZWN0KVxuXHRcdHtcblx0XHRcdGZ1bmN0aW9uIGhhbmRsZXIoZXZ0KVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBtYWtlIHN1cmUgb25seSB0aGUgb3duZXIgb2YgdGhlIGJhbGxvdCBpcyBhbnN3ZXJpbmdcblx0XHRcdFx0aWYoYW5zd2VyICE9PSAnY2FuY2VsJyAmJiBzZWxmLnNlYXQub3duZXIgIT09IFNILmxvY2FsVXNlci5pZCkgcmV0dXJuO1xuXG5cdFx0XHRcdC8vIGNsZWFuIHVwXG5cdFx0XHRcdHNlbGYuX291dHRyb0FuaW0gPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0XHRBbmltYXRlLnN3aW5nT3V0KHNlbGYsIE1hdGguUEkvMi0uNSwgLjQxLCAzMDApXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0c2VsZi5qYUNhcmQudmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0c2VsZi5uZWluQ2FyZC52aXNpYmxlID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSBmYWxzZTtcblx0XHRcdFx0XHRcdHNlbGYuZGlzcGxheWVkID0gbnVsbDtcblx0XHRcdFx0XHRcdHNlbGYucmVtb3ZlKC4uLnNlbGYucG9saWNpZXMpO1xuXHRcdFx0XHRcdFx0c2VsZi5wb2xpY2llcyA9IFtdO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHNlbGYuX291dHRyb0FuaW0gPSBudWxsO1xuXHRcdFx0XHR9LCAxMDApO1xuXG5cdFx0XHRcdHNlbGYuamFDYXJkLnJlbW92ZUFsbEJlaGF2aW9ycygpO1xuXHRcdFx0XHRzZWxmLmphQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX3llc0NsaWNrSGFuZGxlcik7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQucmVtb3ZlQWxsQmVoYXZpb3JzKCk7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCBzZWxmLl9ub0NsaWNrSGFuZGxlcik7XG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BsYXllclNlbGVjdCcsIHNlbGYuX25vbWluYXRlSGFuZGxlcik7XG5cdFx0XHRcdHNlbGYucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FuY2VsVm90ZScsIHNlbGYuX2NhbmNlbEhhbmRsZXIpO1xuXG5cdFx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgYW5zd2VyIHN0aWxsIG1hdHRlcnNcblx0XHRcdFx0aWYoIWlzVm90ZVZhbGlkKCkgfHwgYW5zd2VyID09PSAnY2FuY2VsJyl7XG5cdFx0XHRcdFx0aWYoY2hvaWNlcyA9PT0gUE9MSUNZKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdC8vIHJhbmRvbSBjYXJkIGRldGFjaGVzIGFuZCB3aW5rcyBvdXRcblx0XHRcdFx0XHRcdGxldCBjYXJkID0gc2VsZi5wb2xpY2llc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqc2VsZi5wb2xpY2llcy5sZW5ndGgpXTtcblx0XHRcdFx0XHRcdGNhcmQuYXBwbHlNYXRyaXgoc2VsZi5tYXRyaXgpO1xuXHRcdFx0XHRcdFx0c2VsZi5zZWF0LmFkZChjYXJkKTtcblx0XHRcdFx0XHRcdEFuaW1hdGUud2lua091dChjYXJkLCAzMDApLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRzZWxmLnNlYXQucmVtb3ZlKGNhcmQpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJlamVjdCgndm90ZSBjYW5jZWxsZWQnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3llcycpXG5cdFx0XHRcdFx0cmVzb2x2ZSh0cnVlKTtcblx0XHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdubycpXG5cdFx0XHRcdFx0cmVzb2x2ZShmYWxzZSk7XG5cdFx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAncGxheWVyJylcblx0XHRcdFx0XHRyZXNvbHZlKGV2dC5kYXRhKTtcblx0XHRcdFx0ZWxzZSBpZihjaG9pY2VzID09PSBQT0xJQ1kpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQvLyBjbGlja2VkIGNhcmQgZGV0YWNoZXMgYW5kIHdpbmtzIG91dFxuXHRcdFx0XHRcdGxldCBjYXJkID0gc2VsZi5wb2xpY2llc1soYW5zd2VyKzMpJTNdO1xuXHRcdFx0XHRcdGNhcmQuYXBwbHlNYXRyaXgoc2VsZi5tYXRyaXgpO1xuXHRcdFx0XHRcdHNlbGYuc2VhdC5hZGQoY2FyZCk7XG5cdFx0XHRcdFx0QW5pbWF0ZS53aW5rT3V0KGNhcmQsIDMwMCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRzZWxmLnNlYXQucmVtb3ZlKGNhcmQpO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0cmVzb2x2ZShhbnN3ZXIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmKGFuc3dlciA9PT0gJ3llcycpXG5cdFx0XHRcdHNlbGYuX3llc0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ25vJylcblx0XHRcdFx0c2VsZi5fbm9DbGlja0hhbmRsZXIgPSBoYW5kbGVyO1xuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdwbGF5ZXInKVxuXHRcdFx0XHRzZWxmLl9ub21pbmF0ZUhhbmRsZXIgPSBoYW5kbGVyO1xuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdjYW5jZWwnKVxuXHRcdFx0XHRzZWxmLl9jYW5jZWxIYW5kbGVyID0gaGFuZGxlcjtcblxuXHRcdFx0cmV0dXJuIGhhbmRsZXI7XG5cdFx0fVxuXG5cdFx0c2VsZi5sYXN0UXVldWVkID0gc2VsZi5sYXN0UXVldWVkLnRoZW4oaG9va1VwUXVlc3Rpb24sIGhvb2tVcFF1ZXN0aW9uKTtcblxuXHRcdHJldHVybiBzZWxmLmxhc3RRdWV1ZWQ7XG5cdH1cbn1cblxuZXhwb3J0IHtCYWxsb3QsIFBMQVlFUlNFTEVDVCwgQ09ORklSTSwgQklOQVJZLCBQT0xJQ1l9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtGYXNjaXN0Um9sZUNhcmQsIEhpdGxlclJvbGVDYXJkLCBMaWJlcmFsUm9sZUNhcmQsIEZhc2Npc3RQYXJ0eUNhcmQsIExpYmVyYWxQYXJ0eUNhcmQsIEphQ2FyZCwgTmVpbkNhcmR9IGZyb20gJy4vY2FyZCc7XG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtOQmlsbGJvYXJkfSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxheWVySW5mbyBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXQpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XG5cdFx0dGhpcy5jYXJkID0gbnVsbDtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLCAwLjMpO1xuXHRcdHRoaXMuc2NhbGUuc2V0U2NhbGFyKDAuMyk7XG5cdFx0c2VhdC5hZGQodGhpcyk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBsYXRlVXBkYXRlKHRoaXMudXBkYXRlU3RhdGUuYmluZCh0aGlzKSkpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2ludmVzdGlnYXRlJywgdGhpcy5wcmVzZW50UGFydHkuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVTdGF0ZSh7ZGF0YToge2dhbWUsIHBsYXllcnMsIHZvdGVzfX0pXG5cdHtcblx0XHRsZXQgbG9jYWxQbGF5ZXIgPSBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0gfHwge307XG5cdFx0bGV0IHNlYXRlZFBsYXllciA9IHBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXSB8fCB7fTtcblx0XHRsZXQgdm90ZSA9IHZvdGVzW2dhbWUubGFzdEVsZWN0aW9uXTtcblxuXHRcdGxldCBzZWF0ZWRSb2xlU2hvdWxkQmVWaXNpYmxlID1cblx0XHRcdGdhbWUuc3RhdGUgPT09ICdkb25lJyB8fFxuXHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ25pZ2h0JyAmJiAoXG5cdFx0XHRcdGxvY2FsUGxheWVyID09PSBzZWF0ZWRQbGF5ZXIgfHxcblx0XHRcdFx0bG9jYWxQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnICYmIChzZWF0ZWRQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnIHx8IHNlYXRlZFBsYXllci5yb2xlID09PSAnaGl0bGVyJykgfHxcblx0XHRcdFx0bG9jYWxQbGF5ZXIucm9sZSA9PT0gJ2hpdGxlcicgJiYgc2VhdGVkUGxheWVyLnJvbGUgPT09ICdmYXNjaXN0JyAmJiBnYW1lLnR1cm5PcmRlci5sZW5ndGggPCA3XG5cdFx0XHQpO1xuXG5cdFx0aWYodGhpcy5zZWF0Lm93bmVyICYmIHNlYXRlZFJvbGVTaG91bGRCZVZpc2libGUpXG5cdFx0e1xuXHRcdFx0aWYodGhpcy5jYXJkICYmIHRoaXMuY2FyZC51c2VyRGF0YS50eXBlICE9PSAncm9sZScpe1xuXHRcdFx0XHR0aGlzLnJlbW92ZSh0aGlzLmNhcmQpO1xuXHRcdFx0XHR0aGlzLmNhcmQgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRzd2l0Y2goc2VhdGVkUGxheWVyLnJvbGUpe1xuXHRcdFx0XHRjYXNlICdmYXNjaXN0JzogdGhpcy5jYXJkID0gbmV3IEZhc2Npc3RSb2xlQ2FyZCgpOyBicmVhaztcblx0XHRcdFx0Y2FzZSAnaGl0bGVyJyA6IHRoaXMuY2FyZCA9IG5ldyBIaXRsZXJSb2xlQ2FyZCgpOyAgYnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2xpYmVyYWwnOiB0aGlzLmNhcmQgPSBuZXcgTGliZXJhbFJvbGVDYXJkKCk7IGJyZWFrO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmNhcmQudXNlckRhdGEudHlwZSA9ICdyb2xlJztcblx0XHRcdHRoaXMuYWRkKHRoaXMuY2FyZCk7XG5cdFx0XHRsZXQgYmIgPSBuZXcgTkJpbGxib2FyZCh0aGlzLmNhcmQpO1xuXHRcdFx0QW5pbWF0ZS53aW5rSW4odGhpcy5jYXJkLCAzMDApO1xuXHRcdH1cblx0XHRlbHNlIGlmKHRoaXMuc2VhdC5vd25lciAmJiBnYW1lLnN0YXRlID09PSAnbGFtZUR1Y2snICYmICF2b3RlLm5vblZvdGVycy5pbmNsdWRlcyh0aGlzLnNlYXQub3duZXIpKVxuXHRcdHtcblx0XHRcdGlmKHRoaXMuY2FyZCAmJiB0aGlzLmNhcmQudXNlckRhdGEudHlwZSAhPT0gJ3ZvdGUnKXtcblx0XHRcdFx0dGhpcy5yZW1vdmUodGhpcy5jYXJkKTtcblx0XHRcdFx0dGhpcy5jYXJkID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0bGV0IHBsYXllclZvdGUgPSB2b3RlLnllc1ZvdGVycy5pbmNsdWRlcyh0aGlzLnNlYXQub3duZXIpO1xuXHRcdFx0dGhpcy5jYXJkID0gcGxheWVyVm90ZSA/IG5ldyBKYUNhcmQoKSA6IG5ldyBOZWluQ2FyZCgpO1xuXG5cdFx0XHR0aGlzLmNhcmQudXNlckRhdGEudHlwZSA9ICd2b3RlJztcblx0XHRcdHRoaXMuYWRkKHRoaXMuY2FyZCk7XG5cdFx0XHRsZXQgYmIgPSBuZXcgTkJpbGxib2FyZCh0aGlzLmNhcmQpO1xuXHRcdFx0QW5pbWF0ZS53aW5rSW4odGhpcy5jYXJkLCAzMDApO1xuXHRcdH1cblx0XHRlbHNlIGlmKHRoaXMuY2FyZCAhPT0gbnVsbClcblx0XHR7XG5cdFx0XHRBbmltYXRlLndpbmtPdXQodGhpcy5jYXJkLCAzMDApLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHR0aGlzLnJlbW92ZSh0aGlzLmNhcmQpO1xuXHRcdFx0XHR0aGlzLmNhcmQgPSBudWxsO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0cHJlc2VudFBhcnR5KHtkYXRhOiB1c2VySWR9KVxuXHR7XG5cdFx0aWYoIXRoaXMuc2VhdC5vd25lciB8fCB0aGlzLnNlYXQub3duZXIgIT09IHVzZXJJZCkgcmV0dXJuO1xuXG5cdFx0aWYodGhpcy5jYXJkICYmIHRoaXMuY2FyZC51c2VyRGF0YS50eXBlICE9PSAncGFydHknKXtcblx0XHRcdHRoaXMucmVtb3ZlKHRoaXMuY2FyZCk7XG5cdFx0XHR0aGlzLmNhcmQgPSBudWxsO1xuXHRcdH1cblxuXHRcdGxldCByb2xlID0gU0gucGxheWVyc1t0aGlzLnNlYXQub3duZXJdLnJvbGU7XG5cdFx0dGhpcy5jYXJkID0gIHJvbGUgPT09ICdsaWJlcmFsJyA/IG5ldyBMaWJlcmFsUGFydHlDYXJkKCkgOiBuZXcgRmFzY2lzdFBhcnR5Q2FyZCgpO1xuXG5cdFx0dGhpcy5jYXJkLnVzZXJEYXRhLnR5cGUgPSAncGFydHknO1xuXHRcdHRoaXMuYWRkKHRoaXMuY2FyZCk7XG5cdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcblx0XHRBbmltYXRlLndpbmtJbih0aGlzLmNhcmQsIDMwMCk7XG5cdH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENhcHN1bGVHZW9tZXRyeSBleHRlbmRzIFRIUkVFLkJ1ZmZlckdlb21ldHJ5XG57XG5cdGNvbnN0cnVjdG9yKHJhZGl1cywgaGVpZ2h0LCBzZWdtZW50cyA9IDEyLCByaW5ncyA9IDgpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0bGV0IG51bVZlcnRzID0gMiAqIHJpbmdzICogc2VnbWVudHMgKyAyO1xuXHRcdGxldCBudW1GYWNlcyA9IDQgKiByaW5ncyAqIHNlZ21lbnRzO1xuXHRcdGxldCB0aGV0YSA9IDIqTWF0aC5QSS9zZWdtZW50cztcblx0XHRsZXQgcGhpID0gTWF0aC5QSS8oMipyaW5ncyk7XG5cblx0XHRsZXQgdmVydHMgPSBuZXcgRmxvYXQzMkFycmF5KDMqbnVtVmVydHMpO1xuXHRcdGxldCBmYWNlcyA9IG5ldyBVaW50MTZBcnJheSgzKm51bUZhY2VzKTtcblx0XHRsZXQgdmkgPSAwLCBmaSA9IDAsIHRvcENhcCA9IDAsIGJvdENhcCA9IDE7XG5cblx0XHR2ZXJ0cy5zZXQoWzAsIGhlaWdodC8yLCAwXSwgMyp2aSsrKTtcblx0XHR2ZXJ0cy5zZXQoWzAsIC1oZWlnaHQvMiwgMF0sIDMqdmkrKyk7XG5cblx0XHRmb3IoIGxldCBzPTA7IHM8c2VnbWVudHM7IHMrKyApXG5cdFx0e1xuXHRcdFx0Zm9yKCBsZXQgcj0xOyByPD1yaW5nczsgcisrKVxuXHRcdFx0e1xuXHRcdFx0XHRsZXQgcmFkaWFsID0gcmFkaXVzICogTWF0aC5zaW4ocipwaGkpO1xuXG5cdFx0XHRcdC8vIGNyZWF0ZSB2ZXJ0c1xuXHRcdFx0XHR2ZXJ0cy5zZXQoW1xuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguY29zKHMqdGhldGEpLFxuXHRcdFx0XHRcdGhlaWdodC8yIC0gcmFkaXVzKigxLU1hdGguY29zKHIqcGhpKSksXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5zaW4ocyp0aGV0YSlcblx0XHRcdFx0XSwgMyp2aSsrKTtcblxuXHRcdFx0XHR2ZXJ0cy5zZXQoW1xuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguY29zKHMqdGhldGEpLFxuXHRcdFx0XHRcdC1oZWlnaHQvMiArIHJhZGl1cyooMS1NYXRoLmNvcyhyKnBoaSkpLFxuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguc2luKHMqdGhldGEpXG5cdFx0XHRcdF0sIDMqdmkrKyk7XG5cblx0XHRcdFx0bGV0IHRvcF9zMXIxID0gdmktMiwgdG9wX3MxcjAgPSB2aS00O1xuXHRcdFx0XHRsZXQgYm90X3MxcjEgPSB2aS0xLCBib3RfczFyMCA9IHZpLTM7XG5cdFx0XHRcdGxldCB0b3BfczByMSA9IHRvcF9zMXIxIC0gMipyaW5ncywgdG9wX3MwcjAgPSB0b3BfczFyMCAtIDIqcmluZ3M7XG5cdFx0XHRcdGxldCBib3RfczByMSA9IGJvdF9zMXIxIC0gMipyaW5ncywgYm90X3MwcjAgPSBib3RfczFyMCAtIDIqcmluZ3M7XG5cdFx0XHRcdGlmKHMgPT09IDApe1xuXHRcdFx0XHRcdHRvcF9zMHIxICs9IG51bVZlcnRzLTI7XG5cdFx0XHRcdFx0dG9wX3MwcjAgKz0gbnVtVmVydHMtMjtcblx0XHRcdFx0XHRib3RfczByMSArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHRcdGJvdF9zMHIwICs9IG51bVZlcnRzLTI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBjcmVhdGUgZmFjZXNcblx0XHRcdFx0aWYociA9PT0gMSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGZhY2VzLnNldChbdG9wQ2FwLCB0b3BfczFyMSwgdG9wX3MwcjFdLCAzKmZpKyspO1xuXHRcdFx0XHRcdGZhY2VzLnNldChbYm90Q2FwLCBib3RfczByMSwgYm90X3MxcjFdLCAzKmZpKyspO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGZhY2VzLnNldChbdG9wX3MxcjAsIHRvcF9zMXIxLCB0b3BfczByMF0sIDMqZmkrKyk7XG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFt0b3BfczByMCwgdG9wX3MxcjEsIHRvcF9zMHIxXSwgMypmaSsrKTtcblxuXHRcdFx0XHRcdGZhY2VzLnNldChbYm90X3MwcjEsIGJvdF9zMXIxLCBib3RfczByMF0sIDMqZmkrKyk7XG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFtib3RfczByMCwgYm90X3MxcjEsIGJvdF9zMXIwXSwgMypmaSsrKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBjcmVhdGUgbG9uZyBzaWRlc1xuXHRcdFx0bGV0IHRvcF9zMSA9IHZpLTIsIHRvcF9zMCA9IHRvcF9zMSAtIDIqcmluZ3M7XG5cdFx0XHRsZXQgYm90X3MxID0gdmktMSwgYm90X3MwID0gYm90X3MxIC0gMipyaW5ncztcblx0XHRcdGlmKHMgPT09IDApe1xuXHRcdFx0XHR0b3BfczAgKz0gbnVtVmVydHMtMjtcblx0XHRcdFx0Ym90X3MwICs9IG51bVZlcnRzLTI7XG5cdFx0XHR9XG5cblx0XHRcdGZhY2VzLnNldChbdG9wX3MwLCB0b3BfczEsIGJvdF9zMV0sIDMqZmkrKyk7XG5cdFx0XHRmYWNlcy5zZXQoW2JvdF9zMCwgdG9wX3MwLCBib3RfczFdLCAzKmZpKyspO1xuXHRcdH1cblxuXHRcdHRoaXMuYWRkQXR0cmlidXRlKCdwb3NpdGlvbicsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUodmVydHMsIDMpKTtcblx0XHR0aGlzLnNldEluZGV4KG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoZmFjZXMsIDEpKTtcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBDYXBzdWxlR2VvbWV0cnkgZnJvbSAnLi9jYXBzdWxlZ2VvbWV0cnknO1xuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcblxubGV0IGhpdGJveEdlbyA9IG5ldyBDYXBzdWxlR2VvbWV0cnkoMC4zLCAxLjgpO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBIaXRib3ggZXh0ZW5kcyBUSFJFRS5NZXNoXG57XG5cdGNvbnN0cnVjdG9yKHNlYXQpXG5cdHtcblx0XHRzdXBlcihoaXRib3hHZW8sIG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcblx0XHRcdG9wYWNpdHk6IDAsXG5cdFx0XHRzaWRlOiBUSFJFRS5CYWNrU2lkZVxuXHRcdH0pKTtcblxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC0wLjUsIC0uMik7XG5cdFx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHRzZWF0LmFkZCh0aGlzKTtcblxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29yZW50ZXInLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwLjEpO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ybGVhdmUnLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwKTtcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgKCkgPT4ge1xuXHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHRcdHR5cGU6ICdwbGF5ZXJTZWxlY3QnLFxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdFx0ZGF0YTogdGhpcy5zZWF0Lm93bmVyXG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUodGhpcy51cGRhdGVWaXNpYmlsaXR5LmJpbmQodGhpcykpKTtcblx0fVxuXG5cdHVwZGF0ZVZpc2liaWxpdHkoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXG5cdHtcblx0XHRsZXQgbGl2aW5nUGxheWVycyA9IGdhbWUudHVybk9yZGVyLmZpbHRlcihwID0+IHBsYXllcnNbcF0uc3RhdGUgIT09ICdkZWFkJyk7XG5cdFx0bGV0IHByZWNvbmRpdGlvbnMgPVxuXHRcdFx0U0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCAmJlxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSAnJyAmJlxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQgJiZcblx0XHRcdGxpdmluZ1BsYXllcnMuaW5jbHVkZXModGhpcy5zZWF0Lm93bmVyKTtcblxuXHRcdGxldCBub21pbmF0ZWFibGUgPVxuXHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJlxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBnYW1lLmxhc3RDaGFuY2VsbG9yICYmXG5cdFx0XHQobGl2aW5nUGxheWVycy5sZW5ndGggPD0gNSB8fCB0aGlzLnNlYXQub3duZXIgIT09IGdhbWUubGFzdFByZXNpZGVudCk7XG5cblx0XHRsZXQgaW52ZXN0aWdhdGVhYmxlID1cblx0XHRcdGdhbWUuc3RhdGUgPT09ICdpbnZlc3RpZ2F0ZScgJiZcblx0XHRcdHBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXSAmJiBwbGF5ZXJzW3RoaXMuc2VhdC5vd25lcl0uc3RhdGUgPT09ICdub3JtYWwnO1xuXG5cdFx0bGV0IHN1Y2NlZWRhYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ25hbWVTdWNjZXNzb3InO1xuXHRcdGxldCBleGVjdXRhYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ2V4ZWN1dGUnO1xuXG5cdFx0dGhpcy52aXNpYmxlID0gcHJlY29uZGl0aW9ucyAmJiAobm9taW5hdGVhYmxlIHx8IGludmVzdGlnYXRlYWJsZSB8fCBzdWNjZWVkYWJsZSB8fCBleGVjdXRhYmxlKTtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XG5pbXBvcnQge0JhbGxvdH0gZnJvbSAnLi9iYWxsb3QnO1xuaW1wb3J0IFBsYXllckluZm8gZnJvbSAnLi9wbGF5ZXJpbmZvJztcbmltcG9ydCBIaXRib3ggZnJvbSAnLi9oaXRib3gnO1xuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2VhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXROdW0pXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zZWF0TnVtID0gc2VhdE51bTtcblx0XHR0aGlzLm93bmVyID0gJyc7XG5cblx0XHQvLyBwb3NpdGlvbiBzZWF0XG5cdFx0bGV0IHgsIHk9MC42NSwgejtcblx0XHRzd2l0Y2goc2VhdE51bSl7XG5cdFx0Y2FzZSAwOiBjYXNlIDE6IGNhc2UgMjpcblx0XHRcdHggPSAtMC44MzMgKyAwLjgzMypzZWF0TnVtO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoeCwgeSwgLTEuMDUpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAzOiBjYXNlIDQ6XG5cdFx0XHR6ID0gLTAuNDM3ICsgMC44NzQqKHNlYXROdW0tMyk7XG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgxLjQyNSwgeSwgeik7XG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtTWF0aC5QSS8yLCAwKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XG5cdFx0XHR4ID0gMC44MzMgLSAwLjgzMyooc2VhdE51bS01KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIDEuMDUpO1xuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEksIDApO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSA4OiBjYXNlIDk6XG5cdFx0XHR6ID0gMC40MzcgLSAwLjg3NCooc2VhdE51bS04KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KC0xLjQyNSwgeSwgeik7XG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtMS41Kk1hdGguUEksIDApO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2NoZWNrZWRfaW4nLCAoe2RhdGE6IGlkfSkgPT4ge1xuXHRcdFx0aWYodGhpcy5vd25lciA9PT0gaWQpXG5cdFx0XHRcdHRoaXMudXBkYXRlT3duZXJzaGlwKHtkYXRhOiB7Z2FtZTogU0guZ2FtZSwgcGxheWVyczogU0gucGxheWVyc319KTtcblx0XHR9KTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSkgPT4ge1xuXHRcdFx0aWYodGhpcy5vd25lciAmJiBwbGF5ZXJzW3RoaXMub3duZXJdLnN0YXRlID09PSAnZGVhZCcpe1xuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXQoMHgzZDI3ODkpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5uYW1lcGxhdGUgPSBuZXcgTmFtZXBsYXRlKHRoaXMpO1xuXHRcdHRoaXMuYmFsbG90ID0gbmV3IEJhbGxvdCh0aGlzKTtcblx0XHR0aGlzLnBsYXllckluZm8gPSBuZXcgUGxheWVySW5mbyh0aGlzKTtcblx0XHR0aGlzLmhpdGJveCA9IG5ldyBIaXRib3godGhpcyk7XG5cdH1cblxuXHR1cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXG5cdHtcblx0XHRsZXQgaWRzID0gZ2FtZS50dXJuT3JkZXIgfHwgW107XG5cblx0XHQvLyByZWdpc3RlciB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSBjbGFpbWVkXG5cdFx0aWYoICF0aGlzLm93bmVyIClcblx0XHR7XG5cdFx0XHQvLyBjaGVjayBpZiBhIHBsYXllciBoYXMgam9pbmVkIGF0IHRoaXMgc2VhdFxuXHRcdFx0Zm9yKGxldCBpIGluIGlkcyl7XG5cdFx0XHRcdGlmKHBsYXllcnNbaWRzW2ldXS5zZWF0TnVtID09IHRoaXMuc2VhdE51bSl7XG5cdFx0XHRcdFx0dGhpcy5vd25lciA9IGlkc1tpXTtcblx0XHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KHBsYXllcnNbaWRzW2ldXS5kaXNwbGF5TmFtZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyByZXNldCB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSB2YWNhdGVkXG5cdFx0aWYoICFpZHMuaW5jbHVkZXModGhpcy5vd25lcikgKVxuXHRcdHtcblx0XHRcdHRoaXMub3duZXIgPSAnJztcblx0XHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KCc8Sm9pbj4nKTtcblx0XHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ZmZmZmZmKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyB1cGRhdGUgZGlzY29ubmVjdCBjb2xvcnNcblx0XHRlbHNlIGlmKCAhcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcblx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweDgwODA4MCk7XG5cdFx0fVxuXHRcdGVsc2UgaWYoIHBsYXllcnNbdGhpcy5vd25lcl0uY29ubmVjdGVkICl7XG5cdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXRIZXgoMHhmZmZmZmYpO1xuXHRcdH1cblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5CaWxsYm9hcmQsIE5UZXh0fSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29udGludWVCb3ggZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcihwYXJlbnQpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuaWNvbiA9IG5ldyBUSFJFRS5NZXNoKFxuXHRcdFx0bmV3IFRIUkVFLkJveEJ1ZmZlckdlb21ldHJ5KC4xNSwgLjE1LCAuMTUpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHgxMGEwMTB9KVxuXHRcdCk7XG5cdFx0QW5pbWF0ZS5zcGluKHRoaXMuaWNvbik7XG5cdFx0dGhpcy5hZGQodGhpcy5pY29uKTtcblxuXHRcdHRoaXMudGV4dCA9IFBsYWNlaG9sZGVyTWVzaC5jbG9uZSgpO1xuXHRcdHRoaXMudGV4dC5wb3NpdGlvbi5zZXQoMCwgLjIsIDApO1xuXHRcdHRoaXMudGV4dC51c2VyRGF0YS5hbHRzcGFjZSA9IHtjb2xsaWRlcjoge2VuYWJsZWQ6IHRydWV9fTtcblxuXHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMudGV4dCk7XG5cblx0XHR0aGlzLnRleHRDb21wb25lbnQgPSBuZXcgTlRleHQodGhpcy50ZXh0KTtcblx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHtmb250U2l6ZTogMSwgd2lkdGg6IDIsIGhlaWdodDogMSwgaG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJywgdmVydGljYWxBbGlnbjogJ21pZGRsZSd9KTtcblxuXHRcdHRoaXMuYWRkKHRoaXMudGV4dCk7XG5cblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjI1LCAwKTtcblx0XHRwYXJlbnQuYWRkKHRoaXMpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgdGhpcy5vbnN0YXRlY2hhbmdlLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLnBsYXllclNldHVwLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLm9uY2xpY2suYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5hZGRCZWhhdmlvciggbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJTY2FsZSgpICk7XG5cblx0XHRsZXQgc2hvdyA9ICgpID0+IHRoaXMuc2hvdygpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2ludmVzdGlnYXRlJywgc2hvdyk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigncG9saWN5QW5pbURvbmUnLCBzaG93KTtcblx0fVxuXG5cdG9uY2xpY2soZXZ0KVxuXHR7XG5cdFx0aWYoU0guZ2FtZS50dXJuT3JkZXIuaW5jbHVkZXMoU0gubG9jYWxVc2VyLmlkKSlcblx0XHRcdFNILnNvY2tldC5lbWl0KCdjb250aW51ZScpO1xuXHR9XG5cblx0b25zdGF0ZWNoYW5nZSh7ZGF0YToge2dhbWV9fSlcblx0e1xuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdsYW1lRHVjaycgfHwgKGdhbWUuc3RhdGUgPT09ICdwZWVrJyAmJiBnYW1lLnByZXNpZGVudCA9PT0gU0gubG9jYWxVc2VyLmlkKSl7XG5cdFx0XHR0aGlzLnNob3coKTtcblx0XHR9XG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcblx0XHRcdHRoaXMucGxheWVyU2V0dXAoe2RhdGE6IHtnYW1lfX0pO1xuXHRcdH1cblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdkb25lJyl7XG5cdFx0XHR0aGlzLmhpZGUoKTtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHR0aGlzLnNob3coJ05ldyBnYW1lJyk7XG5cdFx0XHR9LCA4MDAwKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR0aGlzLmhpZGUoKTtcblx0XHR9XG5cdH1cblxuXHRwbGF5ZXJTZXR1cCh7ZGF0YToge2dhbWV9fSlcblx0e1xuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xuXHRcdFx0dGhpcy50ZXh0LnZpc2libGUgPSB0cnVlO1xuXHRcdFx0bGV0IHBsYXllckNvdW50ID0gZ2FtZS50dXJuT3JkZXIubGVuZ3RoO1xuXHRcdFx0aWYocGxheWVyQ291bnQgPj0gNSl7XG5cdFx0XHRcdHRoaXMuaWNvbi52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDpcblx0XHRcdFx0XHRgKCR7cGxheWVyQ291bnR9LzUpIENsaWNrIHdoZW4gcmVhZHlgXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMuaWNvbi52aXNpYmxlID0gZmFsc2U7XG5cdFx0XHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6XG5cdFx0XHRcdFx0YCgke3BsYXllckNvdW50fS81KSBOZWVkIG1vcmUgcGxheWVyc2Bcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0c2hvdyhtZXNzYWdlID0gJ0NsaWNrIHRvIGNvbnRpbnVlJyl7XG5cdFx0dGhpcy5pY29uLnZpc2libGUgPSB0cnVlO1xuXHRcdHRoaXMudGV4dC52aXNpYmxlID0gdHJ1ZTtcblx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OiBtZXNzYWdlfSk7XG5cdH1cblxuXHRoaWRlKCl7XG5cdFx0dGhpcy5pY29uLnZpc2libGUgPSBmYWxzZTtcblx0XHR0aGlzLnRleHQudmlzaWJsZSA9IGZhbHNlO1xuXHR9XG59OyIsImltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xuXG5jb25zdCBwb3NpdGlvbnMgPSBbXG5cdG5ldyBUSFJFRS5WZWN0b3IzKDAuMzY4LCAuMDA1LCAtLjcxNyksXG5cdG5ldyBUSFJFRS5WZWN0b3IzKDAuMTM1LCAuMDEwLCAtLjcxNyksXG5cdG5ldyBUSFJFRS5WZWN0b3IzKC0uMDk2LCAuMDE1LCAtLjcxNyksXG5cdG5ldyBUSFJFRS5WZWN0b3IzKC0uMzI5LCAuMDIwLCAtLjcxNylcbl07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEVsZWN0aW9uVHJhY2tlciBleHRlbmRzIFRIUkVFLk1lc2hcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0c3VwZXIoXG5cdFx0XHRuZXcgVEhSRUUuQ3lsaW5kZXJCdWZmZXJHZW9tZXRyeSguMDQsIC4wNCwgLjAxLCAxNiksXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoKVxuXHRcdCk7XG5cdFx0dGhpcy5wb3NpdGlvbi5jb3B5KHBvc2l0aW9uc1swXSk7XG5cdFx0U0gudGFibGUuYWRkKHRoaXMpO1xuXHRcdFxuXHRcdC8vIGZhaWxzJTMgPT0gMCBvciAzP1xuXHRcdHRoaXMuaGlnaFNpZGUgPSBmYWxzZTtcblx0XHR0aGlzLnNwb3QgPSAwO1xuXHRcdHRoaXMubWF0ZXJpYWwuY29sb3Iuc2V0SFNMKC41MjgsIC4zMSwgLjQpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2ZhaWxlZFZvdGVzJywgdGhpcy51cGRhdGVGYWlsZWRWb3Rlcy5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZUZhaWxlZFZvdGVzKHtkYXRhOiB7Z2FtZToge2ZhaWxlZFZvdGVzfX19ID0ge2RhdGE6IHtnYW1lOiB7ZmFpbGVkVm90ZXM6IC0xfX19KVxuXHR7XG5cdFx0aWYoZmFpbGVkVm90ZXMgPT09IC0xKVxuXHRcdFx0ZmFpbGVkVm90ZXMgPSB0aGlzLnNwb3Q7XG5cblx0XHR0aGlzLmhpZ2hTaWRlID0gZmFpbGVkVm90ZXMgPiAwO1xuXHRcdHRoaXMuc3BvdCA9IGZhaWxlZFZvdGVzJTMgfHwgdGhpcy5oaWdoU2lkZSAmJiAzIHx8IDA7XG5cblx0XHR0aGlzLmFuaW0gPSBBbmltYXRlLnNpbXBsZSh0aGlzLCB7XG5cdFx0XHRwb3M6IHBvc2l0aW9uc1t0aGlzLnNwb3RdLFxuXHRcdFx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDEsIDErdGhpcy5zcG90LCAxKSxcblx0XHRcdGh1ZTogLjUyOCooMS10aGlzLnNwb3QvMyksXG5cdFx0XHRkdXJhdGlvbjogMTIwMFxuXHRcdH0pO1xuXHR9XG59IiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCB7Q3JlZGl0c0NhcmR9IGZyb20gJy4vY2FyZCc7XG5pbXBvcnQge1BsYWNlaG9sZGVyTWVzaCwgTkJpbGxib2FyZCwgTlRleHR9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xuaW1wb3J0IHt0cmFuc2xhdGUgYXMgdHJ9IGZyb20gJy4vdGhlbWUnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQcmVzZW50YXRpb24gZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdFNILnRhYmxlLmFkZCh0aGlzKTtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtLjksIDApO1xuXG5cdFx0Ly8gY3JlYXRlIGlkbGUgZGlzcGxheVxuXHRcdHRoaXMuY3JlZGl0cyA9IG5ldyBDcmVkaXRzQ2FyZCgpO1xuXHRcdHRoaXMuY3JlZGl0cy5wb3NpdGlvbi5zZXQoMCwgMS44NSwgMCk7XG5cdFx0QW5pbWF0ZS5zcGluKHRoaXMuY3JlZGl0cywgMzAwMDApO1xuXHRcdHRoaXMuYWRkKHRoaXMuY3JlZGl0cyk7XG5cdFx0XG5cdFx0Ly8gY3JlYXRlIHZpY3RvcnkgYmFubmVyXG5cdFx0dGhpcy5iYW5uZXIgPSBQbGFjZWhvbGRlck1lc2guY2xvbmUoKTtcblx0XHR0aGlzLmJhbm5lci50ZXh0ID0gbmV3IE5UZXh0KHRoaXMuYmFubmVyKTtcblx0XHR0aGlzLmJhbm5lci50ZXh0LnVwZGF0ZSh7Zm9udFNpemU6IDJ9KTtcblx0XHR0aGlzLmJhbm5lci5iaWxsYm9hcmQgPSBuZXcgTkJpbGxib2FyZCh0aGlzLmJhbm5lcik7XG5cdFx0dGhpcy5iYW5uZXIuYm9iID0gbnVsbDtcblx0XHR0aGlzLmFkZCh0aGlzLmJhbm5lcik7XG5cblx0XHQvLyB1cGRhdGUgc3R1ZmZcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCB0aGlzLnVwZGF0ZU9uU3RhdGUuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVPblN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxuXHR7XG5cdFx0dGhpcy5iYW5uZXIudmlzaWJsZSA9IGZhbHNlO1xuXHRcdHRoaXMuY3JlZGl0cy52aXNpYmxlID0gZmFsc2U7XG5cdFx0aWYodGhpcy5iYW5uZXIuYm9iKXtcblx0XHRcdHRoaXMuYmFubmVyLmJvYi5zdG9wKCk7XG5cdFx0XHR0aGlzLmJhbm5lci5ib2IgPSBudWxsO1xuXHRcdH1cblxuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xuXHRcdFx0dGhpcy5jcmVkaXRzLnZpc2libGUgPSB0cnVlO1xuXHRcdH1cblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdkb25lJylcblx0XHR7XG5cdFx0XHRpZigvXmxpYmVyYWwvLnRlc3QoZ2FtZS52aWN0b3J5KSl7XG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQuY29sb3IgPSAnIzE5MTlmZic7XG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQudXBkYXRlKHt0ZXh0OiAnTGliZXJhbHMgd2luISd9KTtcblx0XHRcdFx0U0guYXVkaW8ubGliZXJhbEZhbmZhcmUucGxheSgpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQuY29sb3IgPSAncmVkJztcblx0XHRcdFx0dGhpcy5iYW5uZXIudGV4dC51cGRhdGUoe3RleHQ6ICdGYXNjaXN0cyB3aW4hJ30pO1xuXHRcdFx0XHRTSC5hdWRpby5mYXNjaXN0RmFuZmFyZS5wbGF5KCk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHRoaXMuYmFubmVyLnBvc2l0aW9uLnNldCgwLDAuOCwwKTtcblx0XHRcdHRoaXMuYmFubmVyLnNjYWxlLnNldFNjYWxhciguMDAxKTtcblx0XHRcdHRoaXMuYmFubmVyLnZpc2libGUgPSB0cnVlO1xuXHRcdFx0QW5pbWF0ZS5zaW1wbGUodGhpcy5iYW5uZXIsIHtcblx0XHRcdFx0cG9zOiBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLjgsIDApLFxuXHRcdFx0XHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMSwxLDEpLFxuXHRcdFx0XHRkdXJhdGlvbjogMTAwMFxuXHRcdFx0fSlcblx0XHRcdC50aGVuKCgpID0+IHRoaXMuYmFubmVyLmJvYiA9IEFuaW1hdGUuYm9iKHRoaXMuYmFubmVyKSk7XG5cdFx0fVxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTEnICYmIGdhbWUuZmFzY2lzdFBvbGljaWVzID49IDMpXG5cdFx0e1xuXHRcdFx0bGV0IGNoYW5jZWxsb3IgPSBwbGF5ZXJzW2dhbWUuY2hhbmNlbGxvcl0uZGlzcGxheU5hbWU7XG5cdFx0XHR0aGlzLmJhbm5lci50ZXh0LmNvbG9yID0gJ3doaXRlJztcblx0XHRcdHRoaXMuYmFubmVyLnRleHQudXBkYXRlKHt0ZXh0OiBgJHtjaGFuY2VsbG9yfSBpcyBub3QgJHt0cignSGl0bGVyJyl9IWB9KTtcblxuXHRcdFx0dGhpcy5iYW5uZXIucG9zaXRpb24uc2V0KDAsMC44LDApO1xuXHRcdFx0dGhpcy5iYW5uZXIuc2NhbGUuc2V0U2NhbGFyKC4wMDEpO1xuXHRcdFx0dGhpcy5iYW5uZXIudmlzaWJsZSA9IHRydWU7XG5cdFx0XHRBbmltYXRlLnNpbXBsZSh0aGlzLmJhbm5lciwge1xuXHRcdFx0XHRwb3M6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEuOCwgMCksXG5cdFx0XHRcdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygxLDEsMSlcblx0XHRcdH0pXG5cdFx0XHQudGhlbigoKSA9PiB0aGlzLmJhbm5lci5ib2IgPSBBbmltYXRlLmJvYih0aGlzLmJhbm5lcikpO1xuXHRcdH1cblx0XHRcblx0fVxufVxuIiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCB7YWN0aXZlVGhlbWUgYXMgdGhlbWV9IGZyb20gJy4vdGhlbWUnO1xuXG5jbGFzcyBBdWRpb1N0cmVhbVxue1xuXHRjb25zdHJ1Y3Rvcihjb250ZXh0LCBidWZmZXIsIG91dHB1dCl7XG5cdFx0dGhpcy5zb3VyY2UgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuXHRcdHRoaXMuc291cmNlLmJ1ZmZlciA9IGJ1ZmZlcjtcblx0XHR0aGlzLnNvdXJjZS5jb25uZWN0KG91dHB1dCk7XG5cdFx0dGhpcy5maW5pc2hlZFBsYXlpbmcgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHR0aGlzLl9yZXNvbHZlID0gcmVzb2x2ZTtcblx0XHR9KTtcblx0fVxuXG5cdHBsYXkoKXtcblx0XHRpZigvQWx0c3BhY2VWUi8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSlcblx0XHRcdHRoaXMuc291cmNlLnN0YXJ0KDAsIDApO1xuXHRcdHNldFRpbWVvdXQodGhpcy5fcmVzb2x2ZSwgTWF0aC5jZWlsKHRoaXMuc291cmNlLmJ1ZmZlci5kdXJhdGlvbioxMDAwICsgNDAwKSk7XG5cdH1cblxuXHRzdG9wKCl7XG5cdFx0dGhpcy5zb3VyY2Uuc3RvcCgpO1xuXHR9XG59XG5cbmxldCBxdWV1ZWRTdHJlYW1zID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbmNsYXNzIEF1ZGlvQ2xpcFxue1xuXHRjb25zdHJ1Y3Rvcihjb250ZXh0LCB1cmwsIHZvbHVtZSwgcXVldWVkID0gdHJ1ZSlcblx0e1xuXHRcdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG5cdFx0dGhpcy5vdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblx0XHR0aGlzLm91dHB1dC5nYWluLnZhbHVlID0gdm9sdW1lO1xuXHRcdHRoaXMub3V0cHV0LmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7XG5cblx0XHR0aGlzLmxvYWRlZCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdGxldCBsb2FkZXIgPSBuZXcgVEhSRUUuRmlsZUxvYWRlcigpO1xuXHRcdFx0bG9hZGVyLnNldFJlc3BvbnNlVHlwZSgnYXJyYXlidWZmZXInKTtcblx0XHRcdGxvYWRlci5sb2FkKHVybCwgYnVmZmVyID0+IHtcblx0XHRcdFx0Y29udGV4dC5kZWNvZGVBdWRpb0RhdGEoYnVmZmVyLCBkZWNvZGVkQnVmZmVyID0+IHtcblx0XHRcdFx0XHR0aGlzLmJ1ZmZlciA9IGRlY29kZWRCdWZmZXI7XG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0pXG5cdH1cblxuXHRwbGF5KHF1ZXVlZCA9IGZhbHNlKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMubG9hZGVkLnRoZW4oKCkgPT4ge1xuXHRcdFx0bGV0IGluc3RhbmNlID0gbmV3IEF1ZGlvU3RyZWFtKHRoaXMuY29udGV4dCwgdGhpcy5idWZmZXIsIHRoaXMub3V0cHV0KTtcblx0XHRcdFxuXHRcdFx0aWYocXVldWVkKXtcblx0XHRcdFx0cXVldWVkU3RyZWFtcyA9IHF1ZXVlZFN0cmVhbXMudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0aW5zdGFuY2UucGxheSgpO1xuXHRcdFx0XHRcdHJldHVybiBpbnN0YW5jZS5maW5pc2hlZFBsYXlpbmc7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm4gcXVldWVkU3RyZWFtcztcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRpbnN0YW5jZS5wbGF5KCk7XG5cdFx0XHRcdHJldHVybiBpbnN0YW5jZS5maW5pc2hlZFBsYXlpbmc7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn1cblxuY2xhc3MgRmFrZUF1ZGlvQ2xpcFxue1xuXHRjb25zdHJ1Y3RvcigpeyB0aGlzLmZha2VzdHJlYW0gPSBuZXcgRmFrZUF1ZGlvU3RyZWFtKCk7IH1cblx0cGxheSgpeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7IH1cbn1cblxuY2xhc3MgRmFrZUF1ZGlvU3RyZWFtXG57XG5cdGNvbnN0cnVjdG9yKCl7IHRoaXMuZmluaXNoZWRQbGF5aW5nID0gUHJvbWlzZS5yZXNvbHZlKCk7IH1cblx0cGxheSgpeyB9XG5cdHN0b3AoKXsgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBdWRpb0NvbnRyb2xsZXJcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0bGV0IGNvbnRleHQgPSB0aGlzLmNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5cdFx0dGhpcy5saWJlcmFsU3RpbmcgPSBuZXcgQXVkaW9DbGlwKHRoaXMuY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vaGl0bGVyL2xpYmVyYWwtc3Rpbmcub2dnYCwgMC4yKTtcblx0XHR0aGlzLmxpYmVyYWxGYW5mYXJlID0gbmV3IEF1ZGlvQ2xpcCh0aGlzLmNvbnRleHQsIGAvc3RhdGljL2F1ZGlvL2hpdGxlci9saWJlcmFsLWZhbmZhcmUub2dnYCwgMC4yKTtcblx0XHR0aGlzLmZhc2Npc3RTdGluZyA9IG5ldyBBdWRpb0NsaXAodGhpcy5jb250ZXh0LCBgL3N0YXRpYy9hdWRpby9oaXRsZXIvZmFzY2lzdC1zdGluZy5vZ2dgLCAwLjEpO1xuXHRcdHRoaXMuZmFzY2lzdEZhbmZhcmUgPSBuZXcgQXVkaW9DbGlwKHRoaXMuY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vaGl0bGVyL2Zhc2Npc3QtZmFuZmFyZS5vZ2dgLCAwLjEpO1xuXG5cdFx0bGV0IGZha2UgPSBuZXcgRmFrZUF1ZGlvQ2xpcCgpO1xuXHRcdHRoaXMudHV0b3JpYWwgPSB7bG9hZFN0YXJ0ZWQ6IGZhbHNlfTtcblx0XHRbJ3dlbGNvbWUnLCduaWdodCcsJ25vbWluYXRpb24nLCd2b3RpbmcnLCd2b3RlRmFpbHMnLCd2b3RlUGFzc2VzJywncG9saWN5MScsJ3BvbGljeTInLCdwb2xpY3lGYXNjaXN0Jyxcblx0XHQncG9saWN5TGliZXJhbCcsJ3BvbGljeUFmdGVybWF0aCcsJ3dyYXB1cCcsJ3Bvd2VyMScsJ3Bvd2VyMicsJ2ludmVzdGlnYXRlJywncGVlaycsJ25hbWVTdWNjZXNzb3InLCdleGVjdXRlJyxcblx0XHQndmV0bycsJ3JlZHpvbmUnXS5mb3JFYWNoKHggPT4gdGhpcy50dXRvcmlhbFt4XSA9IGZha2UpO1xuXHR9XG5cblx0bG9hZFR1dG9yaWFsKGdhbWUpXG5cdHtcblx0XHRpZighZ2FtZS50dXRvcmlhbCB8fCB0aGlzLnR1dG9yaWFsLmxvYWRTdGFydGVkKSByZXR1cm47XG5cblx0XHRsZXQgcmVhZGVyID0gZ2FtZS50dXRvcmlhbCwgY29udGV4dCA9IHRoaXMuY29udGV4dCwgdm9sdW1lID0gMC41O1xuXG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLnR1dG9yaWFsLCB7XG5cdFx0XHRsb2FkU3RhcnRlZDogdHJ1ZSxcblx0XHRcdHdlbGNvbWU6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3dlbGNvbWUub2dnYCwgdm9sdW1lKSxcblx0XHRcdG5pZ2h0OiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9uaWdodC5vZ2dgLCB2b2x1bWUpLFxuXHRcdFx0bm9taW5hdGlvbjogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvbm9taW5hdGlvbi5vZ2dgLCB2b2x1bWUpLFxuXHRcdFx0dm90aW5nOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC92b3Rpbmcub2dnYCwgdm9sdW1lKSxcblx0XHRcdHZvdGVGYWlsczogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvdm90ZS1mYWlscy5vZ2dgLCB2b2x1bWUpLFxuXHRcdFx0dm90ZVBhc3NlczogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvdm90ZS1wYXNzZWQub2dnYCwgdm9sdW1lKSxcblx0XHRcdHBvbGljeTE6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3BvbGljeTEub2dnYCwgdm9sdW1lKSxcblx0XHRcdHBvbGljeTI6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3BvbGljeTIub2dnYCwgdm9sdW1lKSxcblx0XHRcdHBvbGljeUZhc2Npc3Q6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3BvbGljeS1mYXNjaXN0Lm9nZ2AsIHZvbHVtZSksXG5cdFx0XHRwb2xpY3lMaWJlcmFsOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb2xpY3ktbGliZXJhbC5vZ2dgLCB2b2x1bWUpLFxuXHRcdFx0cG9saWN5QWZ0ZXJtYXRoOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb2xpY3ktYWZ0ZXJtYXRoLm9nZ2AsIHZvbHVtZSksXG5cdFx0XHR3cmFwdXA6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3dyYXB1cC5vZ2dgLCB2b2x1bWUpLFxuXHRcdFx0cG93ZXIxOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlcjEub2dnYCwgdm9sdW1lKSxcblx0XHRcdHBvd2VyMjogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXIyLm9nZ2AsIHZvbHVtZSksXG5cdFx0XHRpbnZlc3RpZ2F0ZTogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXItaW52ZXN0aWdhdGUub2dnYCwgdm9sdW1lKSxcblx0XHRcdHBlZWs6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyLXBlZWsub2dnYCwgdm9sdW1lKSxcblx0XHRcdG5hbWVTdWNjZXNzb3I6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyLW5hbWVzdWNjZXNzb3Iub2dnYCwgdm9sdW1lKSxcblx0XHRcdGV4ZWN1dGU6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyLWV4ZWN1dGUub2dnYCwgdm9sdW1lKSxcblx0XHRcdHZldG86IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyLXZldG8ub2dnYCwgdm9sdW1lKSxcblx0XHRcdHJlZHpvbmU6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3JlZHpvbmUub2dnYCwgdm9sdW1lKVxuXHRcdH0pO1xuXHR9XG59XG4iLCJpbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUdXRvcmlhbE1hbmFnZXJcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0dGhpcy5lbmFibGVkID0gZmFsc2U7XG5cdFx0dGhpcy5sYXN0RXZlbnQgPSBudWxsO1xuXHRcdHRoaXMucGxheWVkID0gW107XG5cdH1cblxuXHRkZXRlY3RFdmVudChnYW1lLCB2b3Rlcylcblx0e1xuXHRcdGxldCBsYXN0RWxlY3Rpb24gPSB2b3Rlc1tnYW1lLmxhc3RFbGVjdGlvbl07XG5cdFx0bGV0IGZpcnN0Um91bmQgPSBnYW1lLmZhc2Npc3RQb2xpY2llcyArIGdhbWUubGliZXJhbFBvbGljaWVzID09PSAwO1xuXG5cdFx0aWYoZmlyc3RSb3VuZCAmJiBnYW1lLnN0YXRlID09PSAnbmlnaHQnKVxuXHRcdFx0cmV0dXJuICduaWdodCc7XG5cdFx0ZWxzZSBpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScpXG5cdFx0XHRyZXR1cm4gJ25vbWluYXRpb24nO1xuXHRcdGVsc2UgaWYoZmlyc3RSb3VuZCAmJiBnYW1lLnN0YXRlID09PSAnZWxlY3Rpb24nKVxuXHRcdFx0cmV0dXJuICd2b3RpbmcnO1xuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyAmJiBsYXN0RWxlY3Rpb24ueWVzVm90ZXJzLmxlbmd0aCA8IGxhc3RFbGVjdGlvbi50b1Bhc3MgJiYgIXRoaXMucGxheWVkLmluY2x1ZGVzKCd2b3RlRmFpbHMnKSl7XG5cdFx0XHR0aGlzLnBsYXllZC5wdXNoKCd2b3RlRmFpbHMnKTtcblx0XHRcdHJldHVybiAndm90ZUZhaWxzJztcblx0XHR9XG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnbGFtZUR1Y2snICYmIGxhc3RFbGVjdGlvbi55ZXNWb3RlcnMubGVuZ3RoID49IGxhc3RFbGVjdGlvbi50b1Bhc3MgJiYgIXRoaXMucGxheWVkLmluY2x1ZGVzKCd2b3RlUGFzc2VzJykpe1xuXHRcdFx0dGhpcy5wbGF5ZWQucHVzaCgndm90ZVBhc3NlcycpO1xuXHRcdFx0cmV0dXJuICd2b3RlUGFzc2VzJztcblx0XHR9XG5cdFx0ZWxzZSBpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICdwb2xpY3kxJylcblx0XHRcdHJldHVybiAncG9saWN5MSc7XG5cdFx0ZWxzZSBpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICdwb2xpY3kyJylcblx0XHRcdHJldHVybiAncG9saWN5Mic7XG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnYWZ0ZXJtYXRoJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcyA9PT0gMSAmJiBnYW1lLmhhbmQgPT09IDIpXG5cdFx0XHRyZXR1cm4gJ3BvbGljeUZhc2Npc3QnO1xuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2FmdGVybWF0aCcgJiYgZ2FtZS5saWJlcmFsUG9saWNpZXMgPT09IDEgJiYgZ2FtZS5oYW5kID09PSAzKVxuXHRcdFx0cmV0dXJuICdwb2xpY3lMaWJlcmFsJztcblxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcytnYW1lLmxpYmVyYWxQb2xpY2llcyA9PT0gMSlcblx0XHRcdHJldHVybiAnd3JhcHVwJztcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScgJiYgZ2FtZS5mYXNjaXN0UG9saWNpZXMgPT09IDMgJiYgIXRoaXMucGxheWVkLmluY2x1ZGVzKCdyZWR6b25lJykpe1xuXHRcdFx0dGhpcy5wbGF5ZWQucHVzaCgncmVkem9uZScpO1xuXHRcdFx0cmV0dXJuICdyZWR6b25lJztcblx0XHR9XG5cblx0XHRlbHNlIGlmKFsnaW52ZXN0aWdhdGUnLCdwZWVrJywnbmFtZVN1Y2Nlc3NvcicsJ2V4ZWN1dGUnXS5pbmNsdWRlcyhnYW1lLnN0YXRlKSlcblx0XHR7XG5cdFx0XHRpZih0aGlzLnBsYXllZC5pbmNsdWRlcyhnYW1lLnN0YXRlKSlcblx0XHRcdFx0cmV0dXJuIG51bGw7XG5cblx0XHRcdGxldCBzdGF0ZTtcblx0XHRcdGlmKGdhbWUuZmFzY2lzdFBvbGljaWVzID09PSA1KVxuXHRcdFx0XHRzdGF0ZSA9ICd2ZXRvJztcblx0XHRcdGVsc2Vcblx0XHRcdFx0c3RhdGUgPSBnYW1lLnN0YXRlO1xuXHRcdFx0dGhpcy5wbGF5ZWQucHVzaChzdGF0ZSk7XG5cblx0XHRcdGlmKCF0aGlzLnBsYXllZC5pbmNsdWRlcygncG93ZXInKSl7XG5cdFx0XHRcdHN0YXRlID0gJ2ZpcnN0Xycrc3RhdGU7XG5cdFx0XHRcdHRoaXMucGxheWVkLnB1c2goJ3Bvd2VyJyk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBzdGF0ZTtcblx0XHR9XG5cdFx0ZWxzZSByZXR1cm4gbnVsbDtcblx0fVxuXG5cdHN0YXRlVXBkYXRlKGdhbWUsIHZvdGVzKVxuXHR7XG5cdFx0aWYoIWdhbWUudHV0b3JpYWwpIHJldHVybjtcblxuXHRcdGxldCBzZWFtbGVzcyA9IHtcblx0XHRcdHBvbGljeUZhc2Npc3Q6IFsncG9saWN5RmFzY2lzdCcsJ3BvbGljeUFmdGVybWF0aCddLFxuXHRcdFx0cG9saWN5TGliZXJhbDogWydwb2xpY3lMaWJlcmFsJywncG9saWN5QWZ0ZXJtYXRoJ10sXG5cdFx0XHRmaXJzdF9pbnZlc3RpZ2F0ZTogWydwb3dlcjEnLCdwb3dlcjInLCdpbnZlc3RpZ2F0ZSddLFxuXHRcdFx0Zmlyc3RfcGVlazogWydwb3dlcjEnLCdwb3dlcjInLCdwZWVrJ10sXG5cdFx0XHRmaXJzdF9uYW1lU3VjY2Vzc29yOiBbJ3Bvd2VyMScsJ3Bvd2VyMicsJ25hbWVTdWNjZXNzb3InXSxcblx0XHRcdGZpcnN0X2V4ZWN1dGU6IFsncG93ZXIxJywncG93ZXIyJywnZXhlY3V0ZSddLFxuXHRcdFx0Zmlyc3RfdmV0bzogWydwb3dlcjEnLCdwb3dlcjInLCd2ZXRvJ10sXG5cdFx0XHRpbnZlc3RpZ2F0ZTogWydwb3dlcjEnLCdpbnZlc3RpZ2F0ZSddLFxuXHRcdFx0cGVlazogWydwb3dlcjEnLCdwZWVrJ10sXG5cdFx0XHRuYW1lU3VjY2Vzc29yOiBbJ3Bvd2VyMScsJ25hbWVTdWNjZXNzb3InXSxcblx0XHRcdGV4ZWN1dGU6IFsncG93ZXIxJywnZXhlY3V0ZSddLFxuXHRcdFx0dmV0bzogWydwb3dlcjEnLCd2ZXRvJ10sXG5cdFx0XHRuaWdodDogWyd3ZWxjb21lJywnbmlnaHQnXVxuXHRcdH07XG5cdFx0bGV0IGRlbGF5ZWQgPSB7XG5cdFx0XHRwb2xpY3lGYXNjaXN0OiAncG9saWN5QW5pbURvbmUnLFxuXHRcdFx0cG9saWN5TGliZXJhbDogJ3BvbGljeUFuaW1Eb25lJ1xuXHRcdH07XG5cblx0XHRsZXQgZXZlbnQgPSB0aGlzLmxhc3RFdmVudCA9IHRoaXMuZGV0ZWN0RXZlbnQoZ2FtZSwgdm90ZXMpO1xuXHRcdGNvbnNvbGUubG9nKCd0dXRvcmlhbCBldmVudDonLCBldmVudCk7XG5cblx0XHRsZXQgd2FpdCA9IFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdGlmKGRlbGF5ZWRbZXZlbnRdKXtcblx0XHRcdHdhaXQgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRcdGxldCBoYW5kbGVyID0gKCkgPT4ge1xuXHRcdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoZGVsYXllZFtldmVudF0sIGhhbmRsZXIpO1xuXHRcdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcihkZWxheWVkW2V2ZW50XSwgaGFuZGxlcik7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZihzZWFtbGVzc1tldmVudF0pXG5cdFx0e1xuXHRcdFx0d2FpdC50aGVuKCgpID0+IHtcblx0XHRcdFx0c2VhbWxlc3NbZXZlbnRdLmZvckVhY2goY2xpcCA9PiBTSC5hdWRpby50dXRvcmlhbFtjbGlwXS5wbGF5KHRydWUpKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRlbHNlIGlmKGV2ZW50ICE9PSBudWxsKVxuXHRcdHtcblx0XHRcdHdhaXQudGhlbigoKSA9PiBTSC5hdWRpby50dXRvcmlhbFtldmVudF0ucGxheSh0cnVlKSk7XG5cdFx0fVxuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCAnLi9wb2x5ZmlsbCc7XG5cbmltcG9ydCB7YWN0aXZlVGhlbWUgYXMgdGhlbWV9IGZyb20gJy4vdGhlbWUnO1xuXG5pbXBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfSBmcm9tICcuL2hhdHMnO1xuaW1wb3J0IEdhbWVUYWJsZSBmcm9tICcuL3RhYmxlJztcbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IHsgZ2V0R2FtZUlkLCBtZXJnZU9iamVjdHMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnO1xuaW1wb3J0IFNlYXQgZnJvbSAnLi9zZWF0JztcbmltcG9ydCBQbGF5ZXJNZXRlciBmcm9tICcuL3BsYXllcm1ldGVyJztcbmltcG9ydCBDb250aW51ZUJveCBmcm9tICcuL2NvbnRpbnVlYm94JztcbmltcG9ydCBFbGVjdGlvblRyYWNrZXIgZnJvbSAnLi9lbGVjdGlvbnRyYWNrZXInO1xuaW1wb3J0IFByZXNlbnRhdGlvbiBmcm9tICcuL3ByZXNlbnRhdGlvbic7XG5pbXBvcnQgQXVkaW9Db250cm9sbGVyIGZyb20gJy4vYXVkaW9jb250cm9sbGVyJztcbmltcG9ydCBUdXRvcmlhbCBmcm9tICcuL3R1dG9yaWFsJztcblxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmFzc2V0cyA9IEFzc2V0TWFuYWdlci5tYW5pZmVzdDtcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcblx0XHR0aGlzLm5lZWRzU2tlbGV0b24gPSBmYWxzZTtcblxuXHRcdC8vIHBvbHlmaWxsIGdldFVzZXIgZnVuY3Rpb25cblx0XHRpZighYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdFx0YWx0c3BhY2UuZ2V0VXNlciA9ICgpID0+IHtcblx0XHRcdFx0bGV0IGlkLCByZSA9IC9bPyZddXNlcklkPShcXGQrKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcblx0XHRcdFx0aWYocmUpXG5cdFx0XHRcdFx0aWQgPSByZVsxXTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMDApLnRvU3RyaW5nKCk7XG5cblx0XHRcdFx0YWx0c3BhY2UuX2xvY2FsVXNlciA9IHtcblx0XHRcdFx0XHR1c2VySWQ6IGlkLFxuXHRcdFx0XHRcdGRpc3BsYXlOYW1lOiBpZCxcblx0XHRcdFx0XHRpc01vZGVyYXRvcjogL2lzTW9kZXJhdG9yLy50ZXN0KHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpXG5cdFx0XHRcdH07XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdNYXNxdWVyYWRpbmcgYXMnLCBhbHRzcGFjZS5fbG9jYWxVc2VyKTtcblx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShhbHRzcGFjZS5fbG9jYWxVc2VyKTtcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8gZ2V0IGxvY2FsIHVzZXJcblx0XHR0aGlzLl91c2VyUHJvbWlzZSA9IGFsdHNwYWNlLmdldFVzZXIoKTtcblx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKHVzZXIgPT4ge1xuXHRcdFx0dGhpcy5sb2NhbFVzZXIgPSB7XG5cdFx0XHRcdGlkOiB1c2VyLnVzZXJJZCxcblx0XHRcdFx0ZGlzcGxheU5hbWU6IHVzZXIuZGlzcGxheU5hbWUsXG5cdFx0XHRcdGlzTW9kZXJhdG9yOiB1c2VyLmlzTW9kZXJhdG9yXG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5nYW1lID0ge307XG5cdFx0dGhpcy5wbGF5ZXJzID0ge307XG5cdFx0dGhpcy52b3RlcyA9IHt9O1xuXHR9XG5cblx0aW5pdGlhbGl6ZShlbnYsIHJvb3QsIGFzc2V0cylcblx0e1xuXHRcdGlmKCF0aGlzLmxvY2FsVXNlcil7XG5cdFx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKCgpID0+IHRoaXMuaW5pdGlhbGl6ZShlbnYsIHJvb3QsIGFzc2V0cykpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIHNoYXJlIHRoZSBkaW9yYW1hIGluZm9cblx0XHRBc3NldE1hbmFnZXIuY2FjaGUgPSBhc3NldHM7XG5cdFx0QXNzZXRNYW5hZ2VyLmZpeE1hdGVyaWFscygpO1xuXHRcdHRoaXMuZW52ID0gZW52O1xuXG5cdFx0Ly8gY29ubmVjdCB0byBzZXJ2ZXJcblx0XHR0aGlzLnNvY2tldCA9IGlvLmNvbm5lY3QoJy8nLCB7cXVlcnk6IGBnYW1lSWQ9JHtnZXRHYW1lSWQoKX0mdGhlbWU9JHt0aGVtZX1gfSk7XG5cblx0XHQvLyBzcGF3biBzZWxmLXNlcnZlIHR1dG9yaWFsIGRpYWxvZ1xuXHRcdGlmKGFsdHNwYWNlLmluQ2xpZW50KXtcblx0XHRcdGFsdHNwYWNlLm9wZW4od2luZG93LmxvY2F0aW9uLm9yaWdpbisnL3N0YXRpYy90dXRvcmlhbC5odG1sJywgJ19leHBlcmllbmNlJyxcblx0XHRcdFx0e2hpZGRlbjogdHJ1ZSwgaWNvbjogd2luZG93LmxvY2F0aW9uLm9yaWdpbisnL3N0YXRpYy9pbWcvY2Flc2FyL2ljb24ucG5nJ30pO1xuXHRcdH1cblxuXHRcdHRoaXMuYXVkaW8gPSBuZXcgQXVkaW9Db250cm9sbGVyKCk7XG5cdFx0dGhpcy50dXRvcmlhbCA9IG5ldyBUdXRvcmlhbCgpO1xuXG5cdFx0Ly8gY3JlYXRlIHRoZSB0YWJsZVxuXHRcdHRoaXMudGFibGUgPSBuZXcgR2FtZVRhYmxlKCk7XG5cdFx0dGhpcy5hZGQodGhpcy50YWJsZSk7XG5cblx0XHR0aGlzLnJlc2V0QnV0dG9uID0gbmV3IFRIUkVFLk1lc2goXG5cdFx0XHRuZXcgVEhSRUUuQm94R2VvbWV0cnkoLjI1LC4yNSwuMjUpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IGFzc2V0cy50ZXh0dXJlcy5yZXNldH0pXG5cdFx0KTtcblx0XHR0aGlzLnJlc2V0QnV0dG9uLnBvc2l0aW9uLnNldCgxLjEzLCAtLjksIC43NSk7XG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuc2VuZFJlc2V0LmJpbmQodGhpcykpO1xuXHRcdHRoaXMuX3VzZXJQcm9taXNlLnRoZW4oKCkgPT4ge1xuXHRcdFx0aWYodGhpcy5sb2NhbFVzZXIuaXNNb2RlcmF0b3IpXG5cdFx0XHRcdHRoaXMudGFibGUuYWRkKHRoaXMucmVzZXRCdXR0b24pO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5yZWZyZXNoQnV0dG9uID0gbmV3IFRIUkVFLk1lc2goXG5cdFx0XHRuZXcgVEhSRUUuQm94R2VvbWV0cnkoLjI1LC4yNSwuMjUpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IGFzc2V0cy50ZXh0dXJlcy5yZWZyZXNofSlcblx0XHQpO1xuXHRcdHRoaXMucmVmcmVzaEJ1dHRvbi5wb3NpdGlvbi5zZXQoMS4xMywgLS4zLCAuNzUpO1xuXHRcdHRoaXMucmVmcmVzaEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsICgpID0+IHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKSk7XG5cdFx0dGhpcy50YWJsZS5hZGQodGhpcy5yZWZyZXNoQnV0dG9uKTtcblxuXHRcdHRoaXMucHJlc2VudGF0aW9uID0gbmV3IFByZXNlbnRhdGlvbigpO1xuXG5cdFx0Ly8gY3JlYXRlIGhhdHNcblx0XHR0aGlzLnByZXNpZGVudEhhdCA9IG5ldyBQcmVzaWRlbnRIYXQoKTtcblx0XHR0aGlzLmNoYW5jZWxsb3JIYXQgPSBuZXcgQ2hhbmNlbGxvckhhdCgpO1xuXG5cdFx0Ly8gY3JlYXRlIHBvc2l0aW9uc1xuXHRcdHRoaXMuc2VhdHMgPSBbXTtcblx0XHRmb3IobGV0IGk9MDsgaTwxMDsgaSsrKXtcblx0XHRcdHRoaXMuc2VhdHMucHVzaCggbmV3IFNlYXQoaSkgKTtcblx0XHR9XG5cblx0XHR0aGlzLnRhYmxlLmFkZCguLi50aGlzLnNlYXRzKTtcblxuXHRcdC8vdGhpcy5wbGF5ZXJNZXRlciA9IG5ldyBQbGF5ZXJNZXRlcigpO1xuXHRcdC8vdGhpcy50YWJsZS5hZGQodGhpcy5wbGF5ZXJNZXRlcik7XG5cdFx0dGhpcy5jb250aW51ZUJveCA9IG5ldyBDb250aW51ZUJveCh0aGlzLnRhYmxlKTtcblxuXHRcdHRoaXMuZWxlY3Rpb25UcmFja2VyID0gbmV3IEVsZWN0aW9uVHJhY2tlcigpO1xuXG5cdFx0dGhpcy5zb2NrZXQub24oJ3VwZGF0ZScsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLnNvY2tldC5vbignY2hlY2tlZF9pbicsIHRoaXMuY2hlY2tlZEluLmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5zb2NrZXQub24oJ3Jlc2V0JywgdGhpcy5kb1Jlc2V0LmJpbmQodGhpcykpO1xuXHRcdC8vdGhpcy5zb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVGcm9tU2VydmVyKGdkLCBwZCwgdmQpXG5cdHtcblx0XHRjb25zb2xlLmxvZyhnZCwgcGQsIHZkKTtcblxuXHRcdGxldCBnYW1lID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nYW1lLCBnZCk7XG5cdFx0bGV0IHBsYXllcnMgPSBtZXJnZU9iamVjdHModGhpcy5wbGF5ZXJzLCBwZCB8fCB7fSk7XG5cdFx0bGV0IHZvdGVzID0gbWVyZ2VPYmplY3RzKHRoaXMudm90ZXMsIHZkIHx8IHt9KTtcblxuXHRcdGlmKGdkLnR1dG9yaWFsKVxuXHRcdFx0dGhpcy5hdWRpby5sb2FkVHV0b3JpYWwoZ2FtZSk7XG5cblx0XHRpZihnZC5zdGF0ZSlcblx0XHRcdHRoaXMudHV0b3JpYWwuc3RhdGVVcGRhdGUoZ2FtZSwgdm90ZXMpO1xuXG5cdFx0Zm9yKGxldCBmaWVsZCBpbiBnZClcblx0XHR7XG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe1xuXHRcdFx0XHR0eXBlOiAndXBkYXRlXycrZmllbGQsXG5cdFx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0Z2FtZTogZ2FtZSxcblx0XHRcdFx0XHRwbGF5ZXJzOiBwbGF5ZXJzLFxuXHRcdFx0XHRcdHZvdGVzOiB2b3Rlc1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKCgpID0+IHtcblx0XHRcdGlmKHBsYXllcnNbdGhpcy5sb2NhbFVzZXIuaWRdICYmICFwbGF5ZXJzW3RoaXMubG9jYWxVc2VyLmlkXS5jb25uZWN0ZWQpe1xuXHRcdFx0XHR0aGlzLnNvY2tldC5lbWl0KCdjaGVja19pbicsIHRoaXMubG9jYWxVc2VyKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XG5cdFx0dGhpcy5wbGF5ZXJzID0gcGxheWVycztcblx0XHR0aGlzLnZvdGVzID0gdm90ZXM7XG5cdH1cblxuXHRjaGVja2VkSW4ocClcblx0e1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5wbGF5ZXJzW3AuaWRdLCBwKTtcblx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe1xuXHRcdFx0dHlwZTogJ2NoZWNrZWRfaW4nLFxuXHRcdFx0YnViYmxlczogZmFsc2UsXG5cdFx0XHRkYXRhOiBwLmlkXG5cdFx0fSk7XG5cdH1cblxuXHRzZW5kUmVzZXQoZSl7XG5cdFx0aWYodGhpcy5sb2NhbFVzZXIuaXNNb2RlcmF0b3Ipe1xuXHRcdFx0Y29uc29sZS5sb2coJ3JlcXVlc3RpbmcgcmVzZXQnKTtcblx0XHRcdHRoaXMuc29ja2V0LmVtaXQoJ3Jlc2V0Jyk7XG5cdFx0fVxuXHR9XG5cblx0ZG9SZXNldChnYW1lLCBwbGF5ZXJzLCB2b3Rlcylcblx0e1xuXHRcdHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQodHJ1ZSk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgbmV3IFNlY3JldEhpdGxlcigpO1xuIl0sIm5hbWVzIjpbImxldCIsImNvbnN0IiwidGhlbWUiLCJ0aGlzIiwic3VwZXIiLCJBTSIsIkFzc2V0TWFuYWdlciIsImNhcmQiLCJ0ciIsIkJhbGxvdFR5cGUuQ09ORklSTSIsInVwZGF0ZVN0YXRlIiwiQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QiLCJCYWxsb3RUeXBlLlBPTElDWSIsIm9wdHMiLCJjbGVhblVwRmFrZVZvdGUiLCJCUC51cGRhdGVWb3Rlc0luUHJvZ3Jlc3MiLCJCUC51cGRhdGVTdGF0ZSIsIkJQQkEudG9BcnJheSIsIkJQQkEuTElCRVJBTCIsImJiIiwicG9zaXRpb25zIiwiYXNzZXRzIiwiVHV0b3JpYWwiXSwibWFwcGluZ3MiOiI7OztBQUVBLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztDQUM1QixNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFO0VBQ2xELEtBQUssRUFBRSxTQUFTLElBQUksQ0FBQztHQUNwQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7R0FDL0I7RUFDRCxRQUFRLEVBQUUsS0FBSztFQUNmLFVBQVUsRUFBRSxLQUFLO0VBQ2pCLFlBQVksRUFBRSxLQUFLO0VBQ25CLENBQUMsQ0FBQztDQUNIOztBQ1hEQSxJQUFJLFdBQVcsR0FBRyxRQUFRLENBQUM7QUFDM0IsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7Q0FDMUMsV0FBVyxHQUFHLFFBQVEsQ0FBQztDQUN2Qjs7QUFFREMsSUFBTSxNQUFNLEdBQUc7Q0FDZCxNQUFNLEVBQUU7RUFDUCxNQUFNLEVBQUUsUUFBUTtFQUNoQixTQUFTLEVBQUUsV0FBVztFQUN0QixVQUFVLEVBQUUsWUFBWTtFQUN4QjtDQUNELE1B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QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0dBQ2xGLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQ25COztFQUVELEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztHQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0dBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0dBQ3RGLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQ3BCOztFQUVELENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ2xCOzs7O2lDQUFBOztDQUVELGNBQUEsUUFBUSxzQkFBQyxNQUFNO0NBQ2Y7RUFDQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUM7R0FDNUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDbEIsR0FBRyxJQUFJLENBQUMsR0FBRztJQUNWLEVBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUE7R0FDckQsR0FBRyxJQUFJLENBQUMsSUFBSTtJQUNYLEVBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUE7R0FDdkQ7T0FDSSxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxNQUFNLENBQUM7R0FDakMsR0FBRyxJQUFJLENBQUMsR0FBRztJQUNWLEVBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBQTtHQUMvQixHQUFHLElBQUksQ0FBQyxJQUFJO0lBQ1gsRUFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFBO0dBQ2hDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQ3JCOztFQUVELEdBQUcsTUFBTSxDQUFDO0dBQ1QsR0FBRyxJQUFJLENBQUMsR0FBRztJQUNWLEVBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBQSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUE7R0FDdEMsR0FBRyxJQUFJLENBQUMsSUFBSTtJQUNYLEVBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBQSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUE7R0FDdkM7O0VBRUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUM7RUFDeEIsQ0FBQTs7O0VBaEVnQixLQUFLLENBQUMsUUFpRXZCLEdBQUE7O0FBRUQsSUFBTSxZQUFZLEdBQVk7Q0FDOUIscUJBQ1ksRUFBRTs7O0VBQ1osR0FBR0QsV0FBSyxLQUFLLFFBQVE7RUFDckI7R0FDQ0UsR0FBSyxLQUFBLENBQUMsTUFBQUMsTUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7R0FDdkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztHQUMzRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0dBQzVCLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0dBQ3JEOztFQUVEO0dBQ0NELEdBQUssS0FBQSxDQUFDLE1BQUFDLE1BQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0dBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7R0FDOUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7R0FDckQ7O0VBRURMLElBQUksU0FBUyxHQUFHLFVBQUMsR0FBQSxFQUFnQjtPQUFSLElBQUk7O0dBQzVCQSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztHQUN6RUcsTUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUN2QixDQUFBO0VBQ0QsRUFBRSxDQUFDLGdCQUFnQixDQUFDLHdCQUF3QixFQUFFLFNBQVMsQ0FBQyxDQUFDO0VBQ3pELEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsQ0FBQztFQUNuRCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCLEVBQUUsU0FBUyxDQUFDLENBQUM7RUFDdkQ7Ozs7bURBQUE7OztFQXhCeUIsR0F5QjFCLEdBQUEsQUFBQzs7QUFFRixJQUFNLGFBQWEsR0FBWTtDQUMvQixzQkFDWSxFQUFFOzs7RUFDWixHQUFHRCxXQUFLLEtBQUssUUFBUSxDQUFDO0dBQ3JCRSxHQUFLLEtBQUEsQ0FBQyxNQUFBQyxNQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztHQUN2QyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0dBQzNFLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7R0FDNUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7R0FDckQ7O0VBRUQ7R0FDQ0QsR0FBSyxLQUFBLENBQUMsTUFBQUMsTUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7R0FDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztHQUM3RSxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztHQUNyRDs7RUFFRCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsdUJBQXVCLEVBQUUsVUFBQSxDQUFDLEVBQUM7R0FDOUNGLE1BQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7R0FDMUMsQ0FBQyxDQUFDO0VBQ0g7Ozs7cURBQUE7OztFQW5CMEIsR0FvQjNCLEdBQUEsQUFFRCxBQUF1Qzs7QUN2SHZDLElBQU0sUUFBUSxHQUNkLGlCQUNZLENBQUMsSUFBSSxDQUFDO0NBQ2pCLElBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0NBQ2pCLENBQUE7O0FBRUYsbUJBQUMsS0FBSyxtQkFBQyxHQUFHLENBQUM7Q0FDVixJQUFLLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQztDQUNwQixDQUFBOztBQUVGLG1CQUFDLEtBQUssb0JBQUUsR0FBRyxDQUFBOztBQUVYLG1CQUFDLE1BQU0sb0JBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQTs7QUFFZCxtQkFBQyxPQUFPLHNCQUFFLEdBQUcsQ0FBQSxBQUdiLEFBQ0EsQUFZQyxBQU1BLEFBTUEsQUFXRCxBQUEyQjs7QUN2RDNCLElBQU0sZUFBZSxHQUFvQjtDQUN6Qyx3QkFDWSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUM7RUFDeEJDLFVBQUssS0FBQSxDQUFDLE1BQUEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7RUFDcEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7RUFDNUI7Ozs7eURBQUE7Q0FDRCwwQkFBQSxFQUFFLGdCQUFDLEdBQUcsRUFBRSxRQUFRLENBQUM7RUFDaEJBLG9CQUFLLENBQUMsRUFBRSxLQUFBLENBQUMsTUFBQSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztFQUMzQixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsWUFBWSxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO0VBQzFELE9BQU8sSUFBSSxDQUFDO0VBQ1osQ0FBQTtDQUNELDBCQUFBLEtBQUssb0JBQUU7OztFQUNOLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBQyxHQUFBLEVBQWU7T0FBWCxRQUFROztHQUMxQixRQUFRLEdBQUcsUUFBUSxHQUFHRCxNQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztHQUN2Q0gsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztHQUNwQ0EsSUFBSSxhQUFhLEdBQUcsUUFBUSxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUM7R0FDN0NBLElBQUksTUFBTSxHQUFHLENBQUNHLE1BQUksQ0FBQyxNQUFNLFdBQUUsTUFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQ3pDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFQSxNQUFJLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0dBQzNGLENBQUMsQ0FBQztFQUNILE9BQU9DLG9CQUFLLENBQUMsS0FBSyxLQUFBLENBQUMsSUFBQSxDQUFDLENBQUM7RUFDckIsQ0FBQTs7O0VBckI0QixLQUFLLENBQUMsS0FzQm5DLEdBQUE7O0FBRUQsU0FBUyxZQUFZLENBQUMsTUFBTTtBQUM1QjtDQUNDSixJQUFJLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUU7RUFFckNBLElBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7RUFDaEMsU0FBUyxTQUFTLEVBQUU7R0FDbkIsR0FBRyxFQUFFLFdBQVcsS0FBSyxDQUFDLEVBQUUsRUFBQSxPQUFPLEVBQUUsQ0FBQyxFQUFBO0dBQ2xDOztFQUVELE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBQSxDQUFDLEVBQUMsU0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFBLENBQUMsQ0FBQztFQUM3QyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQyxFQUFDLFNBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBQSxDQUFDLENBQUM7RUFDdEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUMsRUFBQyxTQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBQSxDQUFDLENBQUM7RUFDL0IsQ0FBQyxDQUFDO0NBQ0gsQ0FBQyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7Q0FDbEIsT0FBTyxDQUFDLENBQUM7Q0FDVDs7QUFFREMsSUFBTSxVQUFVLEdBQUc7Q0FDbEIsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDMUQsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztDQUNoQyxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQzNELElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Q0FDaEMsQ0FBQzs7QUFFRixJQUFxQixPQUFPLEdBQzVCOztBQUFBLFFBTUMsTUFBYSxvQkFBQyxNQUFNLEVBQUUsR0FBQTtBQUN2QjsyQkFEMEcsR0FBRyxFQUFFLENBQWhGOzZEQUFBLElBQUksQ0FBTTtpREFBQSxJQUFJLENBQU87cURBQUEsSUFBSSxDQUFRO3lEQUFBLElBQUksQ0FBTTtpREFBQSxJQUFJLENBQVM7NkRBQUEsSUFBSSxDQUFXO3FFQUFBLEdBQUc7OztDQUd4RyxHQUFJLE1BQU0sQ0FBQztFQUNWLEdBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztFQUMzQixJQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDL0IsS0FBTSxHQUFHLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0VBQzdCLE1BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztFQUNuQzs7O0NBR0YsR0FBSSxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsTUFBTSxDQUFDO0VBQzNDLE1BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztFQUMvQyxNQUFPLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztFQUN4RSxNQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ2hCOztDQUVGLElBQUssS0FBSyxHQUFHLEVBQUUsQ0FBQzs7Q0FFaEIsR0FBSSxHQUFHLENBQUM7RUFDUCxLQUFNLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO0lBQ3pDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDO0lBQzVDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7R0FDbkMsQ0FBQztFQUNGOztDQUVGLEdBQUksSUFBSSxDQUFDO0VBQ1IsS0FBTSxDQUFDLElBQUksQ0FBQyxJQUFJLGVBQWUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0lBQy9DLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO0lBQ2xCLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7R0FDbkMsQ0FBQztFQUNGOztDQUVGLEdBQUksS0FBSyxDQUFDO0VBQ1QsS0FBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUN0QyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQztJQUNsRCxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDO0dBQ25DLENBQUM7RUFDRjs7Q0FFRixHQUFJLEdBQUcsS0FBSyxJQUFJLENBQUM7RUFDaEIsS0FBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDeEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQztJQUN0QixNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDO0lBQ2xDLFFBQVEsQ0FBQyxVQUFBLEtBQUssRUFBQztJQUNoQixNQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4RCxDQUFDO0dBQ0YsQ0FBQztFQUNGOztDQUVGLE9BQVEsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQzNCLENBQUE7O0FBRUYsUUFBQyxJQUFXLGtCQUFDLFFBQVEsQ0FBQztDQUNyQixPQUFRLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRTtFQUNyQyxVQUFXLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0VBQzlCLENBQUMsQ0FBQztDQUNILENBQUE7Ozs7OztBQU1GLFFBQUMsWUFBbUIsMEJBQUMsSUFBSTtBQUN6QjtDQUNDLElBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDNUIsSUFBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDOUIsSUFBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7O0NBRTVCLElBQUssS0FBSyxHQUFHLEVBQUUsQ0FBQzs7O0NBR2hCLEtBQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7R0FDdkMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7R0FDN0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztFQUNqQyxDQUFDOzs7Q0FHSCxLQUFNLENBQUMsSUFBSSxDQUFDLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7R0FDN0MsRUFBRSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUM7R0FDcEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQztFQUNuQyxDQUFDOzs7Q0FHSCxLQUFNLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0dBQ3BDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDO0VBQy9CLENBQUM7O0NBRUgsT0FBUSxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDM0IsQ0FBQTs7QUFFRixRQUFDLE1BQWEsb0JBQUMsSUFBSTtBQUNuQjtDQUNDLElBQUssS0FBSyxHQUFHLEVBQUUsQ0FBQzs7O0NBR2hCLEtBQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7R0FDdkMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQztFQUN0QixDQUFDOzs7Q0FHSCxLQUFNLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO0dBQ3ZDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7RUFDdkIsQ0FBQzs7Q0FFSCxPQUFRLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztDQUMzQixDQUFBOztBQUVGLFFBQUMsR0FBVSxpQkFBQyxHQUFHLEVBQUUsU0FBZSxFQUFFLE1BQWE7QUFDL0M7dUNBRDBCLEdBQUcsR0FBRyxDQUFRO2lDQUFBLEdBQUcsSUFBSTs7Q0FFOUMsT0FBUSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQztHQUNsQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxDQUFDO0dBQ3pDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7R0FDckMsTUFBTSxDQUFDLFFBQVEsQ0FBQztHQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDO0dBQ1YsS0FBSyxFQUFFLENBQUM7Q0FDVixDQUFBOztBQUVGLFFBQUMsSUFBVyxrQkFBQyxHQUFHLEVBQUUsTUFBYztBQUNoQztpQ0FEd0IsR0FBRyxLQUFLOztDQUUvQixPQUFRLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUM7R0FDeEMsRUFBRSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUM7R0FDdEIsTUFBTSxDQUFDLFFBQVEsQ0FBQztHQUNoQixLQUFLLEVBQUUsQ0FBQztDQUNWLENBQUE7O0FBRUYsUUFBQyxNQUFhLG9CQUFDLEdBQUcsRUFBRSxRQUFjO0FBQ2xDO3FDQUQ0QixHQUFHLEdBQUc7O0NBRWpDLEdBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVM7RUFDMUIsRUFBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUE7O0NBRTdDLElBQUssS0FBSyxHQUFHLEVBQUUsQ0FBQzs7Q0FFaEIsR0FBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDM0IsR0FBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7O0NBRXBCLEtBQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7R0FDbkMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQztHQUMzQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO0VBQzlCLENBQUM7O0NBRUgsS0FBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztHQUNuQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDO0dBQzNFLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7RUFDOUIsQ0FBQzs7Q0FFSCxPQUFRLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztDQUMzQixDQUFBOztBQUVGLFFBQUMsT0FBYyxxQkFBQyxHQUFHLEVBQUUsUUFBYztBQUNuQztxQ0FENkIsR0FBRyxHQUFHOztDQUVsQyxHQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTO0VBQzFCLEVBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFBOztDQUU3QyxJQUFLLEtBQUssR0FBRyxFQUFFLENBQUM7Q0FDaEIsR0FBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7O0NBRXBCLEtBQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7R0FDbkMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQztHQUN2QixNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0VBQy9CLENBQUM7O0NBRUgsS0FBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztHQUNuQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDO0dBQ25DLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDO0dBQ2xCLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7R0FDOUIsVUFBVSxDQUFDLFlBQUcsRUFBSyxHQUFHLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUM7RUFDM0MsQ0FBQzs7Q0FFSCxPQUFRLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztDQUMzQixDQUFBOztBQUVGLFFBQUMsT0FBYyxxQkFBQyxHQUFHLEVBQUUsUUFBa0IsRUFBRSxNQUFVLEVBQUUsUUFBWTtBQUNqRTtxQ0FENkIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBUTtpQ0FBQSxDQUFDLEdBQUcsQ0FBVTtxQ0FBQSxDQUFDLEdBQUc7O0NBRWhFLEdBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVM7RUFDMUIsRUFBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRztHQUN6QixRQUFTLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0dBQ3pCLFFBQVMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtHQUM5QixDQUFDLEVBQUE7OztDQUdKLEdBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUN6QixHQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0NBQzdELEdBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7O0NBRXhCLElBQUssSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUMvQixFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDO0dBQ3BCLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7R0FDL0IsUUFBUSxDQUFDLFVBQUMsR0FBQSxFQUFLO1FBQUosQ0FBQzs7R0FDYixHQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7R0FDekIsR0FBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7R0FDL0QsR0FBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztHQUN2QixDQUFDO0dBQ0QsTUFBTSxDQUFDLFlBQUc7R0FDWCxHQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7R0FDekIsR0FBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztHQUM3RCxHQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0dBQ3ZCLENBQUMsQ0FBQzs7Q0FFTCxPQUFRLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDNUIsQ0FBQTs7QUFFRixRQUFDLFFBQWUsc0JBQUMsR0FBRyxFQUFFLFFBQWtCLEVBQUUsTUFBVSxFQUFFLFFBQVk7QUFDbEU7cUNBRDhCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQVE7aUNBQUEsQ0FBQyxHQUFHLENBQVU7cUNBQUEsQ0FBQyxHQUFHOztDQUVqRSxHQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTO0VBQzFCLEVBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUc7R0FDekIsUUFBUyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztHQUN6QixRQUFTLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7R0FDOUIsQ0FBQyxFQUFBOztDQUVKLEdBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztDQUNsRCxHQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQzs7Q0FFcEQsSUFBSyxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQy9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUM7R0FDcEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztHQUNqQyxRQUFRLENBQUMsVUFBQyxHQUFBLEVBQUs7UUFBSixDQUFDOztHQUNiLEdBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztHQUN6QixHQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQztHQUMvRCxHQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0dBQ3ZCLENBQUM7R0FDRCxNQUFNLENBQUMsWUFBRztHQUNYLEdBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztHQUNsRCxHQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztHQUNuRCxDQUFDLENBQUM7O0NBRUwsT0FBUSxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQzVCLENBQUEsQUFDRDs7O0FDdFJERCxJQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0NBQ3pCLGNBQWMsRUFBRSxDQUFDO0NBQ2pCLGNBQWMsRUFBRSxDQUFDO0NBQ2pCLFlBQVksRUFBRSxDQUFDO0NBQ2YsWUFBWSxFQUFFLENBQUM7Q0FDZixXQUFXLEVBQUUsQ0FBQztDQUNkLGFBQWEsRUFBRSxDQUFDO0NBQ2hCLGFBQWEsRUFBRSxDQUFDO0NBQ2hCLEVBQUUsRUFBRSxDQUFDO0NBQ0wsSUFBSSxFQUFFLENBQUM7Q0FDUCxLQUFLLEVBQUUsQ0FBQztDQUNSLE9BQU8sRUFBRSxFQUFFO0NBQ1gsSUFBSSxFQUFFLEVBQUU7Q0FDUixDQUFDLENBQUM7O0FBRUhBLElBQUksUUFBUSxHQUFHLElBQUk7SUFBRSxRQUFRLEdBQUcsSUFBSSxDQUFDOztBQUVyQyxTQUFTLFlBQVk7QUFDckI7Q0FDQ0EsSUFBSSxTQUFTLEdBQUc7O0VBRWYsTUFBTSxFQUFFLEdBQUcsRUFBRSxNQUFNO0VBQ25CLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNO0VBQ25CLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU07RUFDbkIsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU07RUFDbkIsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUs7RUFDbkIsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSztFQUNuQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUs7RUFDbkIsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSzs7O0VBR25CLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNO0VBQ25CLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTTtFQUNuQixDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTTtFQUNuQixDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNO0VBQ25CLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUs7RUFDbkIsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUs7RUFDbkIsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSztFQUNuQixDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUs7Ozs7RUFJbkIsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFFdEYsQ0FBQzs7Q0FFRkEsSUFBSSxPQUFPLEdBQUc7O0VBRWIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzFCLENBQUM7OztDQUdGQSxJQUFJLFNBQVMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0NBQ3ZFQSxJQUFJLElBQUksR0FBRyxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUM1RCxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0NBQ3BCLElBQUksR0FBRyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0NBQ3RFLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7OztDQUdsQkEsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLEdBQUcsRUFBRSxDQUFDO0NBQ3REQSxJQUFJLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDeEYsWUFBWSxHQUFHLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztDQUNsR0EsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0NBQ2IsSUFBSUEsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7RUFDdEIsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztFQUM1RztDQUNEQSxJQUFJLEtBQUssR0FBRyxJ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QUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUM7RUFDdEMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQztFQUN0QyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDO0VBQ3RDO0NBQ0QsVUFBVSxFQUFFLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO0NBQzlFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7Q0FDdkM7SUFDRCxZQUFZLEdBQUc7Q0FDZCxTQUFTLEVBQUU7RUFDVixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQztFQUNyQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQztFQUNyQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQztFQUNyQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUM7RUFDckMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDO0VBQ3JDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUNyQztDQUNELFVBQVUsRUFBRSxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLGtCQUFrQixDQUFDO0NBQy9FLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENB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QUcsUUFBUSxDQUFDO0VBQ3BDQSxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUM7RUFDL0JBLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7O0VBRTVCQSxJQUFJLEtBQUssR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDekNBLElBQUksS0FBSyxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUN4Q0EsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsQ0FBQyxDQUFDOztFQUUzQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7RUFDcEMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0VBRXJDLEtBQUtBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRTtFQUM3QjtHQUNDLEtBQUtBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtHQUMzQjtJQUNDQSxJQUFJLE1BQU0sR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7OztJQUd0QyxLQUFLLENBQUMsR0FBRyxDQUFDO0tBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNyQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0lBRVgsS0FBSyxDQUFDLEdBQUcsQ0FBQztLQUNULE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN0QyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0lBRVhBLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckNBLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckNBLElBQUksUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNqRUEsSUFBSSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2pFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNWLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCOzs7SUFHRCxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQ1Y7S0FDQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNoRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNoRDs7SUFFRDtLQUNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOztLQUVsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNsRDtJQUNEOzs7R0FHREEsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDN0NBLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0dBQzdDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNWLE1B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QU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVELFdBQUssTUFBRSxHQUFFLE1BQU0sMEJBQXNCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDakcsS0FBTSxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sd0JBQW9CLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDN0YsVUFBVyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sNkJBQXlCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDdkcsTUFBTyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0seUJBQXFCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDL0YsU0FBVSxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sNkJBQXlCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDdEcsVUFBVyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sOEJBQTBCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDeEcsT0FBUSxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sMEJBQXNCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDakcsT0FBUSxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sMEJBQXNCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDakcsYUFBYyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0saUNBQTZCLENBQUMsRUFB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
