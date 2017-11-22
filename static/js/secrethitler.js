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
	return new Promise(function (resolve, reject) {
		var activeCount = tweens.length;
		function checkDone(){
			if(--activeCount === 0) { resolve(); }
		}

		tweens.forEach(function (t) { return t.onComplete(checkDone); });
		tweens.forEach(function (t) { return t.start(); });
	});
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
		.021,.022, .021,.269, .375,.269, .375,.022, .021,.022, .021,.269, .375,.269, .375,.022, // blank
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
		this.position.set(0, 0.88, 0);

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
	var blacklistedVotes = vips.filter(function (id) {
		var vs = votes[id].yesVoters.concat( votes[id].noVoters);
		var nv = votes[id].nonVoters;
		return nv.includes(ballot.seat.owner) || vs.includes(ballot.seat.owner);
	});
	var newVotes = vips.filter(
		function (id) { return (!SH.game.votesInProgress || !SH.game.votesInProgress.includes(id)) && !blacklistedVotes.includes(id); }
	);
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
				if(!fake)
					{ self.jaCard.addEventListener('cursorup', respond('yes', resolve, reject)); }
			}
			if(choices === BINARY){
				self.neinCard.visible = true;
				if(!fake)
					{ self.neinCard.addEventListener('cursorup', respond('no', resolve, reject)); }
			}
			else if(choices === PLAYERSELECT && !fake){
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

					if(!fake)
						{ card.addEventListener('cursorup', respond(val === -1 ? -1 : i, resolve, reject)); }
				});
			}

			self.addEventListener('cancelVote', respond('cancel', resolve, reject));

			self.displayed = id;
		}

		function respond(answer, resolve, reject)
		{
			function handler(evt)
			{
				// make sure only the owner of the ballot is answering
				if(answer !== 'cancel' && self.seat.owner !== SH.localUser.id) { return; }

				// clean up
				self.jaCard.visible = false;
				self.neinCard.visible = false;
				self.question.visible = false;
				self.displayed = null;
				self.remove.apply(self, self.policies);
				self.policies = [];

				self.jaCard.removeEventListener('cursorup', self._yesClickHandler);
				self.neinCard.removeEventListener('cursorup', self._noClickHandler);
				SH.removeEventListener('playerSelect', self._nominateHandler);
				self.removeEventListener('cancelVote', self._cancelHandler);

				// make sure the answer still matters
				if(!isVoteValid() || answer === 'cancel'){
					reject('vote cancelled');
				}
				else if(answer === 'yes')
					{ resolve(true); }
				else if(answer === 'no')
					{ resolve(false); }
				else if(answer === 'player')
					{ resolve(evt.data); }
				else if(choices === POLICY)
					{ resolve(answer); }
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
		//SH.addEventListener('update_turnOrder', this.updateTurnOrder.bind(this));

		SH.addEventListener('investigate', this.presentParty.bind(this));
	}

	if ( superclass ) PlayerInfo.__proto__ = superclass;
	PlayerInfo.prototype = Object.create( superclass && superclass.prototype );
	PlayerInfo.prototype.constructor = PlayerInfo;

	PlayerInfo.prototype.updateTurnOrder = function updateTurnOrder (ref)
	{
		var this$1 = this;
		var ref_data = ref.data;
		var game = ref_data.game;
		var players = ref_data.players;

		SH._userPromise.then(function () {
			var localPlayer = players[SH.localUser.id];
			if(localPlayer){
				var playerPos = this$1.worldToLocal(SH.seats[localPlayer.seatNum].getWorldPosition());
				this$1.lookAt(playerPos);
			}
		});
	};

	PlayerInfo.prototype.updateState = function updateState (ref)
	{
		var ref_data = ref.data;
		var game = ref_data.game;
		var players = ref_data.players;
		var votes = ref_data.votes;

		if(this.seat.owner && game.state === 'night' && players[SH.localUser.id] || game.state === 'done'){
			this.presentRole(game, players, votes);
		}

		else if(this.seat.owner && game.state === 'lameDuck')
			{ this.presentVote(game, players, votes); }

		else if(this.card !== null)
		{
			this.remove(this.card);
			this.card = null;
		}
	};

	PlayerInfo.prototype.presentRole = function presentRole (game, players)
	{
		if(this.card !== null){
			this.remove(this.card);
			this.card = null;
		}

		var localPlayer = players[SH.localUser.id];
		var seatedPlayer = players[this.seat.owner];

		var seatedRoleShouldBeVisible =
			game.state === 'done' ||
			SH.localUser.id === this.seat.owner ||
			localPlayer.role === 'fascist' && (seatedPlayer.role === 'fascist' || seatedPlayer.role === 'hitler') ||
			localPlayer.role === 'hitler' && seatedPlayer.role === 'fascist' && game.turnOrder.length < 7;

		if(seatedRoleShouldBeVisible)
		{
			switch(seatedPlayer.role){
				case 'fascist': this.card = new FascistRoleCard(); break;
				case 'hitler' : this.card = new HitlerRoleCard();  break;
				case 'liberal': this.card = new LiberalRoleCard(); break;
			}

			this.add(this.card);
			var bb = new NBillboard(this.card);
		}
	};

	PlayerInfo.prototype.presentVote = function presentVote (game, _, votes)
	{
		if(this.card !== null){
			this.remove(this.card);
			this.card = null;
		}
		
		var vote = votes[game.lastElection];

		if(vote.nonVoters.includes(this.seat.owner))
			{ return; }

		var playerVote = vote.yesVoters.includes(this.seat.owner);
		this.card = playerVote ? new JaCard() : new NeinCard();

		this.add(this.card);
		var bb = new NBillboard(this.card);
	};

	PlayerInfo.prototype.presentParty = function presentParty (ref)
	{
		var userId = ref.data;

		if(!this.seat.owner || this.seat.owner !== userId) { return; }

		var role = SH.players[this.seat.owner].role;
		this.card =  role === 'liberal' ? new LiberalPartyCard() : new FascistPartyCard();

		this.add(this.card);
		var bb = new NBillboard(this.card);
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

		this.position.set(0, -0.5, 0);
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
			players[this.seat.owner].state === 'normal';
		
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
	new THREE.Vector3(0.368, .015, -.717),
	new THREE.Vector3(0.135, .030, -.717),
	new THREE.Vector3(-.096, .045, -.717),
	new THREE.Vector3(-.329, .060, -.717)
];

var ElectionTracker = (function (superclass) {
	function ElectionTracker()
	{
		superclass.call(
			this, new THREE.CylinderBufferGeometry(.04, .04, .03, 16),
			new THREE.MeshBasicMaterial({color: 0x1919ff})
		);
		this.position.copy(positions$1[0]);
		SH.table.add(this);
		
		// fails%3 == 0 or 3?
		this.highSide = false;
		this.spot = 0;

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
			duration: 1200
		});
	};

	return ElectionTracker;
}(THREE.Mesh));

var Presentation = (function (superclass) {
	function Presentation()
	{
		superclass.call(this);
		SH.add(this);

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
	this.source.start(0, 0);
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
	else if(game.state === 'nominate' && game.fascistPolicies === 3)
		{ return 'redzone'; }

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
	if(!game.tutorial || game.turnOrder.includes('1111111') && SH.localUser.id !== '1111111')
		{ return; }

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
		var subevent = /^first_/.test(event) ? event.slice(6) : event;
		wait.then(function () {
			seamless[subevent].forEach(function (clip) { return SH.audio.tutorial[clip].play(true); });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvcG9seWZpbGwuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RoZW1lLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hc3NldG1hbmFnZXIuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hdGl2ZWNvbXBvbmVudHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JlaGF2aW9yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hbmltYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jYXJkLmpzIiwiLi4vLi4vc3JjL2NsaWVudC90YWJsZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdXRpbHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hbWVwbGF0ZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmFsbG90cHJvY2Vzc29yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9icGJhLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3QuanMiLCIuLi8uLi9zcmMvY2xpZW50L3BsYXllcmluZm8uanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcHN1bGVnZW9tZXRyeS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvaGl0Ym94LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWF0LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jb250aW51ZWJveC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvZWxlY3Rpb250cmFja2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9wcmVzZW50YXRpb24uanMiLCIuLi8uLi9zcmMvY2xpZW50L2F1ZGlvY29udHJvbGxlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdHV0b3JpYWwuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlY3JldGhpdGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcblxyXG5pZighQXJyYXkucHJvdG90eXBlLmluY2x1ZGVzKXtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAnaW5jbHVkZXMnLCB7XHJcblx0XHR2YWx1ZTogZnVuY3Rpb24oaXRlbSl7XHJcblx0XHRcdHJldHVybiB0aGlzLmluZGV4T2YoaXRlbSkgPiAtMTtcclxuXHRcdH0sXHJcblx0XHR3cml0YWJsZTogZmFsc2UsXHJcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcclxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2VcclxuXHR9KTtcclxufVxyXG4iLCJsZXQgYWN0aXZlVGhlbWUgPSAnaGl0bGVyJztcclxuaWYoL2NhZXNhci8udGVzdCh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpKXtcclxuXHRhY3RpdmVUaGVtZSA9ICdjYWVzYXInO1xyXG59XHJcblxyXG5jb25zdCB0aGVtZXMgPSB7XHJcblx0aGl0bGVyOiB7XHJcblx0XHRoaXRsZXI6ICdoaXRsZXInLFxyXG5cdFx0cHJlc2lkZW50OiAncHJlc2lkZW50JyxcclxuXHRcdGNoYW5jZWxsb3I6ICdjaGFuY2VsbG9yJ1xyXG5cdH0sXHJcblx0Y2Flc2FyOiB7XHJcblx0XHRoaXRsZXI6ICdjYWVzYXInLFxyXG5cdFx0cHJlc2lkZW50OiAnY29uc3VsJyxcclxuXHRcdGNoYW5jZWxsb3I6ICdwcmFldG9yJ1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gdHJhbnNsYXRlKHN0cmluZylcclxue1xyXG5cdGxldCBrZXkgPSBzdHJpbmcudG9Mb3dlckNhc2UoKSxcclxuXHRcdHZhbHVlID0gdGhlbWVzW2FjdGl2ZVRoZW1lXVtrZXldIHx8IHRoZW1lcy5oaXRsZXJba2V5XSB8fCBzdHJpbmc7XHJcblxyXG5cdC8vIHN0YXJ0cyB3aXRoIHVwcGVyIGNhc2UsIHJlc3QgaXMgbG93ZXJcclxuXHRsZXQgaXNQcm9wZXIgPSBzdHJpbmcuY2hhckF0KDApID09IHN0cmluZy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSAmJiBzdHJpbmcuc2xpY2UoMSkgPT0gc3RyaW5nLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XHJcblx0aWYoaXNQcm9wZXIpe1xyXG5cdFx0dmFsdWUgPSB2YWx1ZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHZhbHVlLnNsaWNlKDEpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHZhbHVlO1xyXG59XHJcblxyXG5leHBvcnQge3RyYW5zbGF0ZSwgYWN0aXZlVGhlbWV9IiwiaW1wb3J0IHthY3RpdmVUaGVtZSBhcyB0aGVtZX0gZnJvbSAnLi90aGVtZSc7XHJcblxyXG5sZXQgdGhlbWVNb2RlbHMgPSB7XHJcblx0Y2Flc2FyOiB7XHJcblx0XHRsYXVyZWxzOiAnL3N0YXRpYy9tb2RlbC9sYXVyZWxzLmdsdGYnXHJcblx0fSxcclxuXHRoaXRsZXI6IHtcclxuXHRcdHRvcGhhdDogJy9zdGF0aWMvbW9kZWwvdG9waGF0LmdsdGYnLFxyXG5cdFx0dmlzb3JjYXA6ICcvc3RhdGljL21vZGVsL3Zpc29yX2NhcC5nbHRmJ1xyXG5cdH1cclxufTtcclxuXHJcbmxldCBhc3NldHMgPSB7XHJcblx0bWFuaWZlc3Q6IHtcclxuXHRcdG1vZGVsczogT2JqZWN0LmFzc2lnbih7XHJcblx0XHRcdHRhYmxlOiAnL3N0YXRpYy9tb2RlbC90YWJsZS5nbHRmJyxcclxuXHRcdFx0bmFtZXBsYXRlOiAnL3N0YXRpYy9tb2RlbC9uYW1lcGxhdGUuZGFlJyxcclxuXHRcdFx0Ly9kdW1teTogJy9zdGF0aWMvbW9kZWwvZHVtbXkuZ2x0ZicsXHJcblx0XHRcdC8vcGxheWVybWV0ZXI6ICcvc3RhdGljL21vZGVsL3BsYXllcm1ldGVyLmdsdGYnXHJcblx0XHR9LCB0aGVtZU1vZGVsc1t0aGVtZV0pLFxyXG5cdFx0dGV4dHVyZXM6IHtcclxuXHRcdFx0Ym9hcmRfbGFyZ2U6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1sYXJnZS5qcGdgLFxyXG5cdFx0XHRib2FyZF9tZWQ6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1tZWRpdW0uanBnYCxcclxuXHRcdFx0Ym9hcmRfc21hbGw6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1zbWFsbC5qcGdgLFxyXG5cdFx0XHRjYXJkczogYC9zdGF0aWMvaW1nLyR7dGhlbWV9L2NhcmRzLmpwZ2AsXHJcblx0XHRcdHJlc2V0OiAnL3N0YXRpYy9pbWcvYm9tYi5wbmcnLFxyXG5cdFx0XHRyZWZyZXNoOiAnL3N0YXRpYy9pbWcvcmVmcmVzaC5qcGcnXHJcblx0XHRcdC8vdGV4dDogJy9zdGF0aWMvaW1nL3RleHQucG5nJ1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0Y2FjaGU6IHt9LFxyXG5cdGZpeE1hdGVyaWFsczogZnVuY3Rpb24oKVxyXG5cdHtcclxuXHRcdE9iamVjdC5rZXlzKHRoaXMuY2FjaGUubW9kZWxzKS5mb3JFYWNoKGlkID0+IHtcclxuXHRcdFx0dGhpcy5jYWNoZS5tb2RlbHNbaWRdLnRyYXZlcnNlKG9iaiA9PiB7XHJcblx0XHRcdFx0aWYob2JqLm1hdGVyaWFsIGluc3RhbmNlb2YgVEhSRUUuTWVzaFN0YW5kYXJkTWF0ZXJpYWwpe1xyXG5cdFx0XHRcdFx0bGV0IG5ld01hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCgpO1xyXG5cdFx0XHRcdFx0bmV3TWF0Lm1hcCA9IG9iai5tYXRlcmlhbC5tYXA7XHJcblx0XHRcdFx0XHRuZXdNYXQuY29sb3IuY29weShvYmoubWF0ZXJpYWwuY29sb3IpO1xyXG5cdFx0XHRcdFx0bmV3TWF0LnRyYW5zcGFyZW50ID0gb2JqLm1hdGVyaWFsLnRyYW5zcGFyZW50O1xyXG5cdFx0XHRcdFx0bmV3TWF0LnNpZGUgPSBvYmoubWF0ZXJpYWwuc2lkZTtcclxuXHRcdFx0XHRcdG9iai5tYXRlcmlhbCA9IG5ld01hdDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBhc3NldHM7IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxubGV0IHBsYWNlaG9sZGVyR2VvID0gbmV3IFRIUkVFLkJveEJ1ZmZlckdlb21ldHJ5KC4wMDEsIC4wMDEsIC4wMDEpO1xyXG5sZXQgcGxhY2Vob2xkZXJNYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe2NvbG9yOiAweGZmZmZmZiwgdmlzaWJsZTogZmFsc2V9KTtcclxubGV0IFBsYWNlaG9sZGVyTWVzaCA9IG5ldyBUSFJFRS5NZXNoKHBsYWNlaG9sZGVyR2VvLCBwbGFjZWhvbGRlck1hdCk7XHJcblxyXG5jbGFzcyBOYXRpdmVDb21wb25lbnRcclxue1xyXG5cdGNvbnN0cnVjdG9yKG1lc2gsIG5lZWRzVXBkYXRlKVxyXG5cdHtcclxuXHRcdHRoaXMubWVzaCA9IG1lc2g7XHJcblx0XHRhbHRzcGFjZS5hZGROYXRpdmVDb21wb25lbnQodGhpcy5tZXNoLCB0aGlzLm5hbWUpO1xyXG5cclxuXHRcdGlmKG5lZWRzVXBkYXRlKVxyXG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlKGZpZWxkcyA9IHt9KVxyXG5cdHtcclxuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5kYXRhLCBmaWVsZHMpO1xyXG5cdFx0YWx0c3BhY2UudXBkYXRlTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lLCB0aGlzLmRhdGEpO1xyXG5cdH1cclxuXHJcblx0ZGVzdHJveSgpXHJcblx0e1xyXG5cdFx0YWx0c3BhY2UucmVtb3ZlTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5UZXh0IGV4dGVuZHMgTmF0aXZlQ29tcG9uZW50IHtcclxuXHRjb25zdHJ1Y3RvcihtZXNoKXtcclxuXHRcdHRoaXMubmFtZSA9ICduLXRleHQnO1xyXG5cdFx0dGhpcy5kYXRhID0ge1xyXG5cdFx0XHRmb250U2l6ZTogMTAsXHJcblx0XHRcdGhlaWdodDogMSxcclxuXHRcdFx0d2lkdGg6IDEwLFxyXG5cdFx0XHR2ZXJ0aWNhbEFsaWduOiAnbWlkZGxlJyxcclxuXHRcdFx0aG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJyxcclxuXHRcdFx0dGV4dDogJydcclxuXHRcdH07XHJcblx0XHRzdXBlcihtZXNoLCB0cnVlKTtcclxuXHJcblx0XHR0aGlzLmNvbG9yID0gJ2JsYWNrJztcclxuXHR9XHJcblx0dXBkYXRlKGZpZWxkcyA9IHt9KXtcclxuXHRcdGlmKGZpZWxkcy50ZXh0KVxyXG5cdFx0XHRmaWVsZHMudGV4dCA9IGA8Y29sb3I9JHt0aGlzLmNvbG9yfT4ke2ZpZWxkcy50ZXh0fTwvY29sb3I+YDtcclxuXHRcdE5hdGl2ZUNvbXBvbmVudC5wcm90b3R5cGUudXBkYXRlLmNhbGwodGhpcywgZmllbGRzKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5Ta2VsZXRvblBhcmVudCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XHJcblx0Y29uc3RydWN0b3IobWVzaCl7XHJcblx0XHR0aGlzLm5hbWUgPSAnbi1za2VsZXRvbi1wYXJlbnQnO1xyXG5cdFx0dGhpcy5kYXRhID0ge1xyXG5cdFx0XHRpbmRleDogMCxcclxuXHRcdFx0cGFydDogJ2hlYWQnLFxyXG5cdFx0XHRzaWRlOiAnY2VudGVyJywgXHJcblx0XHRcdHVzZXJJZDogMFxyXG5cdFx0fTtcclxuXHRcdHN1cGVyKG1lc2gsIHRydWUpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgTkJpbGxib2FyZCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XHJcblx0Y29uc3RydWN0b3IobWVzaCl7XHJcblx0XHR0aGlzLm5hbWUgPSAnbi1iaWxsYm9hcmQnO1xyXG5cdFx0c3VwZXIobWVzaCwgZmFsc2UpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5UZXh0LCBOU2tlbGV0b25QYXJlbnQsIE5CaWxsYm9hcmR9OyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7TlNrZWxldG9uUGFyZW50fSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xyXG5pbXBvcnQge2FjdGl2ZVRoZW1lIGFzIHRoZW1lfSBmcm9tICcuL3RoZW1lJztcclxuXHJcbmNsYXNzIEhhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3Rvcihtb2RlbClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5jdXJyZW50SWQgPSAnJztcclxuXHRcdHRoaXMuY29tcG9uZW50cyA9IHtoYXQ6IG51bGwsIHRleHQ6IG51bGx9O1xyXG5cdFx0XHJcblx0XHRpZihtb2RlbC5wYXJlbnQpXHJcblx0XHRcdG1vZGVsLnBhcmVudC5yZW1vdmUobW9kZWwpO1xyXG5cdFx0bW9kZWwudXBkYXRlTWF0cml4V29ybGQodHJ1ZSk7XHJcblxyXG5cdFx0Ly8gZ3JhYiBtZXNoZXNcclxuXHRcdGxldCBwcm9wID0gJyc7XHJcblx0XHRtb2RlbC50cmF2ZXJzZShvYmogPT4ge1xyXG5cdFx0XHRpZihvYmoubmFtZSA9PT0gJ2hhdCcgfHwgb2JqLm5hbWUgPT09ICd0ZXh0Jyl7XHJcblx0XHRcdFx0cHJvcCA9IG9iai5uYW1lO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYob2JqIGluc3RhbmNlb2YgVEhSRUUuTWVzaCl7XHJcblx0XHRcdFx0dGhpc1twcm9wXSA9IG9iajtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gc3RyaXAgb3V0IG1pZGRsZSBub2Rlc1xyXG5cdFx0aWYodGhpcy5oYXQpe1xyXG5cdFx0XHR0aGlzLmhhdC5tYXRyaXguY29weSh0aGlzLmhhdC5tYXRyaXhXb3JsZCk7XHJcblx0XHRcdHRoaXMuaGF0Lm1hdHJpeC5kZWNvbXBvc2UodGhpcy5oYXQucG9zaXRpb24sIHRoaXMuaGF0LnF1YXRlcm5pb24sIHRoaXMuaGF0LnNjYWxlKTtcclxuXHRcdFx0dGhpcy5hZGQodGhpcy5oYXQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHRoaXMudGV4dCl7XHJcblx0XHRcdHRoaXMudGV4dC5tYXRyaXguY29weSh0aGlzLnRleHQubWF0cml4V29ybGQpO1xyXG5cdFx0XHR0aGlzLnRleHQubWF0cml4LmRlY29tcG9zZSh0aGlzLnRleHQucG9zaXRpb24sIHRoaXMudGV4dC5xdWF0ZXJuaW9uLCB0aGlzLnRleHQuc2NhbGUpO1xyXG5cdFx0XHR0aGlzLmFkZCh0aGlzLnRleHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGQuc2NlbmUuYWRkKHRoaXMpO1xyXG5cdH1cclxuXHJcblx0c2V0T3duZXIodXNlcklkKVxyXG5cdHtcclxuXHRcdGlmKCF0aGlzLmN1cnJlbnRJZCAmJiB1c2VySWQpe1xyXG5cdFx0XHRkLnNjZW5lLmFkZCh0aGlzKTtcclxuXHRcdFx0aWYodGhpcy5oYXQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdCA9IG5ldyBOU2tlbGV0b25QYXJlbnQodGhpcy5oYXQpO1xyXG5cdFx0XHRpZih0aGlzLnRleHQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQgPSBuZXcgTlNrZWxldG9uUGFyZW50KHRoaXMudGV4dCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKHRoaXMuY3VycmVudElkICYmICF1c2VySWQpe1xyXG5cdFx0XHRpZih0aGlzLmhhdClcclxuXHRcdFx0XHR0aGlzLmNvbXBvbmVudHMuaGF0LmRlc3Ryb3koKTtcclxuXHRcdFx0aWYodGhpcy50ZXh0KVxyXG5cdFx0XHRcdHRoaXMuY29tcG9uZW50cy50ZXh0LmRlc3Ryb3koKTtcclxuXHRcdFx0ZC5zY2VuZS5yZW1vdmUodGhpcyk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYodXNlcklkKXtcclxuXHRcdFx0aWYodGhpcy5oYXQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdC51cGRhdGUoe3VzZXJJZH0pO1xyXG5cdFx0XHRpZih0aGlzLnRleHQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQudXBkYXRlKHt1c2VySWR9KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmN1cnJlbnRJZCA9IHVzZXJJZDtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIFByZXNpZGVudEhhdCBleHRlbmRzIEhhdFxyXG57XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdGlmKHRoZW1lID09PSAnY2Flc2FyJylcclxuXHRcdHtcclxuXHRcdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLmxhdXJlbHMuY2xvbmUoKSk7XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC4wOC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xyXG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCguNSwgMCwgMCk7XHJcblx0XHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMC44L1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHR9XHJcblx0XHRlbHNlXHJcblx0XHR7XHJcblx0XHRcdHN1cGVyKEFNLmNhY2hlLm1vZGVscy50b3BoYXQpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjE0NC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigxLjIvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0bGV0IGFzc2lnbkhhdCA9ICh7ZGF0YToge2dhbWV9fSkgPT4ge1xyXG5cdFx0XHRsZXQgc2l0dGluZyA9IGdhbWUuc3BlY2lhbEVsZWN0aW9uID8gZ2FtZS5wcmVzaWRlbnQgOiBnYW1lLmxhc3RQcmVzaWRlbnQ7XHJcblx0XHRcdHRoaXMuc2V0T3duZXIoc2l0dGluZyk7XHJcblx0XHR9XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3BlY2lhbEVsZWN0aW9uJywgYXNzaWduSGF0KTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9wcmVzaWRlbnQnLCBhc3NpZ25IYXQpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2xhc3RQcmVzaWRlbnQnLCBhc3NpZ25IYXQpO1xyXG5cdH1cclxufTtcclxuXHJcbmNsYXNzIENoYW5jZWxsb3JIYXQgZXh0ZW5kcyBIYXRcclxue1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRpZih0aGVtZSA9PT0gJ2NhZXNhcicpe1xyXG5cdFx0XHRzdXBlcihBTS5jYWNoZS5tb2RlbHMubGF1cmVscy5jbG9uZSgpKTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLjA4L1NILmVudi5waXhlbHNQZXJNZXRlciwgLjAzL1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KC41LCAwLCAwKTtcclxuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigwLjgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdH1cclxuXHRcdGVsc2VcclxuXHRcdHtcclxuXHRcdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLnZpc29yY2FwKTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4wNy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigxLjIvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdH1cclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGFzdENoYW5jZWxsb3InLCBlID0+IHtcclxuXHRcdFx0dGhpcy5zZXRPd25lcihlLmRhdGEuZ2FtZS5sYXN0Q2hhbmNlbGxvcik7XHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuY2xhc3MgQmVoYXZpb3Jcclxue1xyXG5cdGNvbnN0cnVjdG9yKHR5cGUpe1xyXG5cdFx0dGhpcy50eXBlID0gdHlwZTtcclxuXHR9XHJcblxyXG5cdGF3YWtlKG9iail7XHJcblx0XHR0aGlzLm9iamVjdDNEID0gb2JqO1xyXG5cdH1cclxuXHJcblx0c3RhcnQoKXsgfVxyXG5cclxuXHR1cGRhdGUoZFQpeyB9XHJcblxyXG5cdGRpc3Bvc2UoKXsgfVxyXG59XHJcblxyXG5jbGFzcyBCU3luYyBleHRlbmRzIEJlaGF2aW9yXHJcbntcclxuXHRjb25zdHJ1Y3RvcihldmVudE5hbWUpXHJcblx0e1xyXG5cdFx0c3VwZXIoJ0JTeW5jJyk7XHJcblx0XHR0aGlzLl9zID0gU0guc29ja2V0O1xyXG5cclxuXHRcdC8vIGxpc3RlbiBmb3IgdXBkYXRlIGV2ZW50c1xyXG5cdFx0dGhpcy5ob29rID0gdGhpcy5fcy5vbihldmVudE5hbWUsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcclxuXHRcdHRoaXMuZXZlbnROYW1lID0gZXZlbnROYW1lO1xyXG5cdFx0dGhpcy5vd25lciA9IDA7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVGcm9tU2VydmVyKGRhdGEpXHJcblx0e1xyXG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XHJcblx0XHR0aGlzLm9iamVjdDNELnJvdGF0aW9uLmZyb21BcnJheShkYXRhLCAzKTtcclxuXHR9XHJcblxyXG5cdHRha2VPd25lcnNoaXAoKVxyXG5cdHtcclxuXHRcdGlmKFNILmxvY2FsVXNlciAmJiBTSC5sb2NhbFVzZXIudXNlcklkKVxyXG5cdFx0XHR0aGlzLm93bmVyID0gU0gubG9jYWxVc2VyLnVzZXJJZDtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZShkVClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIgJiYgU0gubG9jYWxVc2VyLnNrZWxldG9uICYmIFNILmxvY2FsVXNlci5pZCA9PT0gdGhpcy5vd25lcilcclxuXHRcdHtcclxuXHRcdFx0bGV0IGogPSBTSC5sb2NhbFVzZXIuc2tlbGV0b24uZ2V0Sm9pbnQoJ0hlYWQnKTtcclxuXHRcdFx0dGhpcy5fcy5lbWl0KHRoaXMuZXZlbnROYW1lLCBbLi4uai5wb3NpdGlvbi50b0FycmF5KCksIC4uLmoucm90YXRpb24udG9BcnJheSgpXSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxufVxyXG5cclxuZXhwb3J0IHsgQmVoYXZpb3IsIEJTeW5jIH07XHJcbiIsImltcG9ydCB7IEJlaGF2aW9yIH0gZnJvbSAnLi9iZWhhdmlvcic7XHJcblxyXG5jbGFzcyBRdWF0ZXJuaW9uVHdlZW4gZXh0ZW5kcyBUV0VFTi5Ud2VlblxyXG57XHJcblx0Y29uc3RydWN0b3Ioc3RhdGUsIGdyb3VwKXtcclxuXHRcdHN1cGVyKHt0OiAwfSwgZ3JvdXApO1xyXG5cdFx0dGhpcy5fc3RhdGUgPSBzdGF0ZTtcclxuXHRcdHRoaXMuX3N0YXJ0ID0gc3RhdGUuY2xvbmUoKTtcclxuXHR9XHJcblx0dG8oZW5kLCBkdXJhdGlvbil7XHJcblx0XHRzdXBlci50byh7dDogMX0sIGR1cmF0aW9uKTtcclxuXHRcdHRoaXMuX2VuZCA9IGVuZCBpbnN0YW5jZW9mIFRIUkVFLlF1YXRlcm5pb24gPyBbZW5kXSA6IGVuZDtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH1cclxuXHRzdGFydCgpe1xyXG5cdFx0dGhpcy5vblVwZGF0ZSgoe3Q6IHByb2dyZXNzfSkgPT4ge1xyXG5cdFx0XHRwcm9ncmVzcyA9IHByb2dyZXNzICogdGhpcy5fZW5kLmxlbmd0aDtcclxuXHRcdFx0bGV0IG5leHRQb2ludCA9IE1hdGguY2VpbChwcm9ncmVzcyk7XHJcblx0XHRcdGxldCBsb2NhbFByb2dyZXNzID0gcHJvZ3Jlc3MgLSBuZXh0UG9pbnQgKyAxO1xyXG5cdFx0XHRsZXQgcG9pbnRzID0gW3RoaXMuX3N0YXJ0LCAuLi50aGlzLl9lbmRdO1xyXG5cdFx0XHRUSFJFRS5RdWF0ZXJuaW9uLnNsZXJwKHBvaW50c1tuZXh0UG9pbnQtMV0sIHBvaW50c1tuZXh0UG9pbnRdLCB0aGlzLl9zdGF0ZSwgbG9jYWxQcm9ncmVzcyk7XHJcblx0XHR9KTtcclxuXHRcdHJldHVybiBzdXBlci5zdGFydCgpO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gV2FpdEZvckFuaW1zKHR3ZWVucylcclxue1xyXG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PlxyXG5cdHtcclxuXHRcdGxldCBhY3RpdmVDb3VudCA9IHR3ZWVucy5sZW5ndGg7XHJcblx0XHRmdW5jdGlvbiBjaGVja0RvbmUoKXtcclxuXHRcdFx0aWYoLS1hY3RpdmVDb3VudCA9PT0gMCkgcmVzb2x2ZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHR3ZWVucy5mb3JFYWNoKHQgPT4gdC5vbkNvbXBsZXRlKGNoZWNrRG9uZSkpO1xyXG5cdFx0dHdlZW5zLmZvckVhY2godCA9PiB0LnN0YXJ0KCkpO1xyXG5cdH0pO1xyXG59XHJcblxyXG5jb25zdCBzcGluUG9pbnRzID0gW1xyXG5cdG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIE1hdGguc3FydCgyKS8yLCAwLCBNYXRoLnNxcnQoMikvMiksXHJcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMSwgMCwgMCksXHJcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgTWF0aC5zcXJ0KDIpLzIsIDAsIC1NYXRoLnNxcnQoMikvMiksXHJcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMCwgMCwgMSlcclxuXTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFuaW1hdGVcclxue1xyXG5cdC8qKlxyXG5cdCAqIE1vdmUgYW4gb2JqZWN0IGZyb20gQSB0byBCXHJcblx0ICogQHBhcmFtIHtUSFJFRS5PYmplY3QzRH0gdGFyZ2V0IFxyXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXHJcblx0ICovXHJcblx0c3RhdGljIHNpbXBsZSh0YXJnZXQsIHtwYXJlbnQ9bnVsbCwgcG9zPW51bGwsIHF1YXQ9bnVsbCwgc2NhbGU9bnVsbCwgbWF0cml4PW51bGwsIGR1cmF0aW9uPTYwMH0gPSB7fSlcclxuXHR7XHJcblx0XHQvLyBleHRyYWN0IHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlIGZyb20gbWF0cml4XHJcblx0XHRpZihtYXRyaXgpe1xyXG5cdFx0XHRwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRxdWF0ID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcclxuXHRcdFx0c2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRtYXRyaXguZGVjb21wb3NlKHBvcywgcXVhdCwgc2NhbGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHNodWZmbGUgaGllcmFyY2h5LCBidXQga2VlcCB3b3JsZCB0cmFuc2Zvcm0gdGhlIHNhbWVcclxuXHRcdGlmKHBhcmVudCAmJiB0aGlzLnBhcmVudCAhPT0gdGFyZ2V0LnBhcmVudCl7XHJcblx0XHRcdHRhcmdldC5hcHBseU1hdHJpeCh0YXJnZXQucGFyZW50Lm1hdHJpeFdvcmxkKTtcclxuXHRcdFx0dGFyZ2V0LmFwcGx5TWF0cml4KG5ldyBUSFJFRS5NYXRyaXg0KCkuZ2V0SW52ZXJzZShwYXJlbnQubWF0cml4V29ybGQpKTtcclxuXHRcdFx0cGFyZW50LmFkZChvYmopO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBhbmltcyA9IFtdO1xyXG5cclxuXHRcdGlmKHBvcyl7XHJcblx0XHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKHRhcmdldC5wb3NpdGlvbilcclxuXHRcdFx0XHQudG8oe3g6IHBvcy54LCB5OiBwb3MueSwgejogcG9zLnp9LCBkdXJhdGlvbilcclxuXHRcdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0KVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHF1YXQpe1xyXG5cdFx0XHRhbmltcy5wdXNoKG5ldyBRdWF0ZXJuaW9uVHdlZW4odGFyZ2V0LnF1YXRlcm5pb24pXHJcblx0XHRcdFx0LnRvKHF1YXQsIGR1cmF0aW9uKVxyXG5cdFx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoc2NhbGUpe1xyXG5cdFx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2Vlbih0YXJnZXQuc2NhbGUpXHJcblx0XHRcdFx0LnRvKHt4OiBzY2FsZS54LCB5OiBzY2FsZS55LCB6OiBzY2FsZS56fSwgZHVyYXRpb24pXHJcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKGFuaW1zKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyB3YWl0KGR1cmF0aW9uKXtcclxuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblx0XHRcdHNldFRpbWVvdXQocmVzb2x2ZSwgZHVyYXRpb24pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNYWtlIHRoZSBjYXJkIGFwcGVhciB3aXRoIGEgZmxvdXJpc2hcclxuXHQgKiBAcGFyYW0ge1RIUkVFLk9iamVjdDNEfSBjYXJkIFxyXG5cdCAqL1xyXG5cdHN0YXRpYyBjYXJkRmxvdXJpc2goY2FyZClcclxuXHR7XHJcblx0XHRjYXJkLnBvc2l0aW9uLnNldCgwLCAwLCAwKTtcclxuXHRcdGNhcmQucXVhdGVybmlvbi5zZXQoMCwwLDAsMSk7XHJcblx0XHRjYXJkLnNjYWxlLnNldFNjYWxhciguMDAxKTtcclxuXHJcblx0XHRsZXQgYW5pbXMgPSBbXTtcclxuXHJcblx0XHQvLyBhZGQgcG9zaXRpb24gYW5pbWF0aW9uXHJcblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihjYXJkLnBvc2l0aW9uKVxyXG5cdFx0XHQudG8oe3g6IDAsIHk6IC43LCB6OiAwfSwgMTUwMClcclxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuRWxhc3RpYy5PdXQpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIGFkZCBzcGluIGFuaW1hdGlvblxyXG5cdFx0YW5pbXMucHVzaChuZXcgUXVhdGVybmlvblR3ZWVuKGNhcmQucXVhdGVybmlvbilcclxuXHRcdFx0LnRvKHNwaW5Qb2ludHMsIDI1MDApXHJcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIGFkZCBzY2FsZSBhbmltYXRpb25cclxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKGNhcmQuc2NhbGUpXHJcblx0XHRcdC50byh7eDogLjUsIHk6IC41LCB6OiAuNX0sIDIwMClcclxuXHRcdCk7XHJcblxyXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgdmFuaXNoKGNhcmQpXHJcblx0e1xyXG5cdFx0bGV0IGFuaW1zID0gW107XHJcblxyXG5cdFx0Ly8gYWRkIG1vdmUgYW5pbWF0aW9uXHJcblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihjYXJkLnBvc2l0aW9uKVxyXG5cdFx0XHQudG8oe3k6ICcrMC41J30sIDEwMDApXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIGFkZCBkaXNhcHBlYXIgYW5pbWF0aW9uXHJcblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihjYXJkLm1hdGVyaWFsKVxyXG5cdFx0XHQudG8oe29wYWNpdHk6IDB9LCAxMDAwKVxyXG5cdFx0KTtcclxuXHJcblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKGFuaW1zKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBib2Iob2JqLCBhbXBsaXR1ZGUgPSAuMDgsIHBlcmlvZCA9IDQwMDApXHJcblx0e1xyXG5cdFx0cmV0dXJuIG5ldyBUV0VFTi5Ud2VlbihvYmoucG9zaXRpb24pXHJcblx0XHRcdC50byh7eTogb2JqLnBvc2l0aW9uLnktYW1wbGl0dWRlfSwgcGVyaW9kKVxyXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5TaW51c29pZGFsLkluT3V0KVxyXG5cdFx0XHQucmVwZWF0KEluZmluaXR5KVxyXG5cdFx0XHQueW95byh0cnVlKVxyXG5cdFx0XHQuc3RhcnQoKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBzcGluKG9iaiwgcGVyaW9kID0gMTAwMDApXHJcblx0e1xyXG5cdFx0cmV0dXJuIG5ldyBRdWF0ZXJuaW9uVHdlZW4ob2JqLnF1YXRlcm5pb24pXHJcblx0XHRcdC50byhzcGluUG9pbnRzLCBwZXJpb2QpXHJcblx0XHRcdC5yZXBlYXQoSW5maW5pdHkpXHJcblx0XHRcdC5zdGFydCgpO1xyXG5cdH1cclxufSIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuLy8gZW51bSBjb25zdGFudHNcclxubGV0IFR5cGVzID0gT2JqZWN0LmZyZWV6ZSh7XHJcblx0UE9MSUNZX0xJQkVSQUw6IDAsXHJcblx0UE9MSUNZX0ZBU0NJU1Q6IDEsXHJcblx0Uk9MRV9MSUJFUkFMOiAyLFxyXG5cdFJPTEVfRkFTQ0lTVDogMyxcclxuXHRST0xFX0hJVExFUjogNCxcclxuXHRQQVJUWV9MSUJFUkFMOiA1LFxyXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXHJcblx0SkE6IDcsXHJcblx0TkVJTjogOCxcclxuXHRCTEFOSzogOSxcclxuXHRDUkVESVRTOiAxMCxcclxuXHRWRVRPOiAxMVxyXG59KTtcclxuXHJcbmxldCBnZW9tZXRyeSA9IG51bGwsIG1hdGVyaWFsID0gbnVsbDtcclxuXHJcbmZ1bmN0aW9uIGluaXRDYXJkRGF0YSgpXHJcbntcclxuXHRsZXQgZmxvYXREYXRhID0gW1xyXG5cdFx0Ly8gcG9zaXRpb24gKHBvcnRyYWl0KVxyXG5cdFx0MC4zNTc1LCAwLjUsIDAuMDAwNSxcclxuXHRcdC0uMzU3NSwgMC41LCAwLjAwMDUsXHJcblx0XHQtLjM1NzUsIC0uNSwgMC4wMDA1LFxyXG5cdFx0MC4zNTc1LCAtLjUsIDAuMDAwNSxcclxuXHRcdDAuMzU3NSwgMC41LCAtLjAwMDUsXHJcblx0XHQtLjM1NzUsIDAuNSwgLS4wMDA1LFxyXG5cdFx0LS4zNTc1LCAtLjUsIC0uMDAwNSxcclxuXHRcdDAuMzU3NSwgLS41LCAtLjAwMDUsXHJcblx0XHJcblx0XHQvLyBwb3NpdGlvbiAobGFuZHNjYXBlKVxyXG5cdFx0MC41LCAtLjM1NzUsIDAuMDAwNSxcclxuXHRcdDAuNSwgMC4zNTc1LCAwLjAwMDUsXHJcblx0XHQtLjUsIDAuMzU3NSwgMC4wMDA1LFxyXG5cdFx0LS41LCAtLjM1NzUsIDAuMDAwNSxcclxuXHRcdDAuNSwgLS4zNTc1LCAtLjAwMDUsXHJcblx0XHQwLjUsIDAuMzU3NSwgLS4wMDA1LFxyXG5cdFx0LS41LCAwLjM1NzUsIC0uMDAwNSxcclxuXHRcdC0uNSwgLS4zNTc1LCAtLjAwMDUsXHJcblx0XHJcblx0XHQvLyBVVnNcclxuXHRcdC8qIC0tLS0tLS0tLS0tLS0tIGNhcmQgZmFjZSAtLS0tLS0tLS0tLS0tICovIC8qIC0tLS0tLS0tLS0tLS0gY2FyZCBiYWNrIC0tLS0tLS0tLS0tLS0tKi9cclxuXHRcdC43NTQsLjk5NiwgLjc1NCwuODM0LCAuOTk3LC44MzQsIC45OTcsLjk5NiwgLjc1NCwuODM0LCAuNzU0LC45OTYsIC45OTcsLjk5NiwgLjk5NywuODM0LCAvLyBsaWJlcmFsIHBvbGljeVxyXG5cdFx0Ljc1NCwuODIyLCAuNzU0LC42NjAsIC45OTYsLjY2MCwgLjk5NiwuODIyLCAuNzU0LC42NjAsIC43NTQsLjgyMiwgLjk5NiwuODIyLCAuOTk2LC42NjAsIC8vIGZhc2Npc3QgcG9saWN5XHJcblx0XHQuNzQ2LC45OTYsIC41MDUsLjk5NiwgLjUwNSwuNjUwLCAuNzQ2LC42NTAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbGliZXJhbCByb2xlXHJcblx0XHQuNzQ2LC42NDUsIC41MDUsLjY0NSwgLjUwNSwuMzAwLCAuNzQ2LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gZmFzY2lzdCByb2xlXHJcblx0XHQuOTk2LC42NDUsIC43NTQsLjY0NSwgLjc1NCwuMzAwLCAuOTk2LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gaGl0bGVyIHJvbGVcclxuXHRcdC40OTUsLjk5NiwgLjI1NSwuOTk2LCAuMjU1LC42NTAsIC40OTUsLjY1MCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBsaWJlcmFsIHBhcnR5XHJcblx0XHQuNDk1LC42NDUsIC4yNTUsLjY0NSwgLjI1NSwuMzAwLCAuNDk1LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gZmFzY2lzdCBwYXJ0eVxyXG5cdFx0LjI0NCwuOTkyLCAuMDA1LC45OTIsIC4wMDUsLjY1MywgLjI0NCwuNjUzLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGphXHJcblx0XHQuMjQzLC42NDIsIC4wMDYsLjY0MiwgLjAwNiwuMzAyLCAuMjQzLC4zMDIsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbmVpblxyXG5cdFx0LjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGJsYW5rXHJcblx0XHQuMzk3LC4yNzYsIC4zOTcsLjAxNSwgLjc2NSwuMDE1LCAuNzY1LC4yNzYsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gY3JlZGl0c1xyXG5cdFx0Ljk2MywuMjcwLCAuODA0LC4yNzAsIC44MDQsLjAyOSwgLjk2MywuMDI5LCAuODA0LC4yNzAsIC45NjMsLjI3MCwgLjk2MywuMDI5LCAuODA0LC4wMjksIC8vIHZldG9cclxuXHJcblx0XTtcclxuXHRcclxuXHRsZXQgaW50RGF0YSA9IFtcclxuXHRcdC8vIHRyaWFuZ2xlIGluZGV4XHJcblx0XHQwLDEsMiwgMCwyLDMsIDQsNyw1LCA1LDcsNlxyXG5cdF07XHJcblx0XHJcblx0Ly8gdHdvIHBvc2l0aW9uIHNldHMsIDExIFVWIHNldHMsIDEgaW5kZXggc2V0XHJcblx0bGV0IGdlb0J1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcig0KmZsb2F0RGF0YS5sZW5ndGggKyAyKmludERhdGEubGVuZ3RoKTtcclxuXHRsZXQgdGVtcCA9IG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCAwLCBmbG9hdERhdGEubGVuZ3RoKTtcclxuXHR0ZW1wLnNldChmbG9hdERhdGEpO1xyXG5cdHRlbXAgPSBuZXcgVWludDE2QXJyYXkoZ2VvQnVmZmVyLCA0KmZsb2F0RGF0YS5sZW5ndGgsIGludERhdGEubGVuZ3RoKTtcclxuXHR0ZW1wLnNldChpbnREYXRhKTtcclxuXHRcclxuXHQvLyBjaG9wIHVwIGJ1ZmZlciBpbnRvIHZlcnRleCBhdHRyaWJ1dGVzXHJcblx0bGV0IHBvc0xlbmd0aCA9IDgqMywgdXZMZW5ndGggPSA4KjIsIGluZGV4TGVuZ3RoID0gMTI7XHJcblx0bGV0IHBvc1BvcnRyYWl0ID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgMCwgcG9zTGVuZ3RoKSwgMyksXHJcblx0XHRwb3NMYW5kc2NhcGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCA0KnBvc0xlbmd0aCwgcG9zTGVuZ3RoKSwgMyk7XHJcblx0bGV0IHV2cyA9IFtdO1xyXG5cdGZvcihsZXQgaT0wOyBpPDEyOyBpKyspe1xyXG5cdFx0dXZzLnB1c2goIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDgqcG9zTGVuZ3RoICsgNCppKnV2TGVuZ3RoLCB1dkxlbmd0aCksIDIpICk7XHJcblx0fVxyXG5cdGxldCBpbmRleCA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IFVpbnQxNkFycmF5KGdlb0J1ZmZlciwgNCpmbG9hdERhdGEubGVuZ3RoLCBpbmRleExlbmd0aCksIDEpO1xyXG5cdFxyXG5cdGdlb21ldHJ5ID0gT2JqZWN0LmtleXMoVHlwZXMpLm1hcCgoa2V5LCBpKSA9PlxyXG5cdHtcclxuXHRcdGxldCBnZW8gPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcclxuXHRcdGdlby5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgaT09VHlwZXMuSkEgfHwgaT09VHlwZXMuTkVJTiA/IHBvc0xhbmRzY2FwZSA6IHBvc1BvcnRyYWl0KTtcclxuXHRcdGdlby5hZGRBdHRyaWJ1dGUoJ3V2JywgdXZzW2ldKTtcclxuXHRcdGdlby5zZXRJbmRleChpbmRleCk7XHJcblx0XHRyZXR1cm4gZ2VvO1xyXG5cdH0pO1xyXG5cclxuXHRtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KTtcclxufVxyXG5cclxuXHJcbmNsYXNzIENhcmQgZXh0ZW5kcyBUSFJFRS5NZXNoXHJcbntcclxuXHRjb25zdHJ1Y3Rvcih0eXBlID0gVHlwZXMuQkxBTkspXHJcblx0e1xyXG5cdFx0aWYoIWdlb21ldHJ5IHx8ICFtYXRlcmlhbCkgaW5pdENhcmREYXRhKCk7XHJcblxyXG5cdFx0bGV0IGdlbyA9IGdlb21ldHJ5W3R5cGVdO1xyXG5cdFx0c3VwZXIoZ2VvLCBtYXRlcmlhbCk7XHJcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjcpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgQmxhbmtDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXsgc3VwZXIoKTsgfVxyXG59XHJcblxyXG5jbGFzcyBDcmVkaXRzQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5DUkVESVRTKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIExpYmVyYWxQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlBPTElDWV9MSUJFUkFMLCBmYWxzZSk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0UG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfRkFTQ0lTVCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBWZXRvQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5WRVRPKTtcclxuXHR9XHJcbn1cclxuY2xhc3MgTGliZXJhbFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlJPTEVfTElCRVJBTCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0Um9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9GQVNDSVNUKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIEhpdGxlclJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlJPTEVfSElUTEVSKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIExpYmVyYWxQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfTElCRVJBTCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0UGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0ZBU0NJU1QpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgSmFDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLkpBKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5laW5DYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLk5FSU4pO1xyXG5cdH1cclxufVxyXG5cclxuXHJcbmV4cG9ydCB7XHJcblx0Q2FyZCwgVHlwZXMsIEJsYW5rQ2FyZCwgQ3JlZGl0c0NhcmQsIFZldG9DYXJkLFxyXG5cdExpYmVyYWxQb2xpY3lDYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgTGliZXJhbFJvbGVDYXJkLCBGYXNjaXN0Um9sZUNhcmQsXHJcblx0SGl0bGVyUm9sZUNhcmQsIExpYmVyYWxQYXJ0eUNhcmQsIEZhc2Npc3RQYXJ0eUNhcmQsIEphQ2FyZCwgTmVpbkNhcmRcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcclxuaW1wb3J0IHtMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIFZldG9DYXJkfSBmcm9tICcuL2NhcmQnO1xyXG5cclxubGV0IExpYmVyYWxTcG90cyA9IHtcclxuXHRwb3NpdGlvbnM6IFtcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuNjkwLCAwLjAwMSwgLTAuNDIpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC4zNDUsIDAuMDAxLCAtMC40MiksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjAwMiwgMC4wMDEsIC0wLjQyKSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uMzQwLCAwLjAwMSwgLTAuNDIpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoLS42OTAsIDAuMDAxLCAtMC40MilcclxuXHRdLFxyXG5cdHF1YXRlcm5pb246IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMC43MDcxMDY3ODExODY1NDc1LCAwKSxcclxuXHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMC40LCAwLjQsIDAuNClcclxufSxcclxuRmFzY2lzdFNwb3RzID0ge1xyXG5cdHBvc2l0aW9uczogW1xyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoLS44NjAsIDAuMDAxLCAuNDI1KSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uNTE1LCAwLjAwMSwgLjQyNSksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjE3MCwgMC4wMDEsIC40MjUpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC4xNzAsIDAuMDAxLCAuNDI1KSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuNTE4LCAwLjAwMSwgLjQyNSksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjg3MCwgMC4wMDEsIC40MjUpLFx0XHJcblx0XSxcclxuXHRxdWF0ZXJuaW9uOiBuZXcgVEhSRUUuUXVhdGVybmlvbigtMC43MDcxMDY3ODExODY1NDc1LCAwLCAwLCAwLjcwNzEwNjc4MTE4NjU0NzUpLFxyXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjQsIDAuNCwgMC40KVxyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR2FtZVRhYmxlIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdC8vIHRhYmxlIHN0YXRlXHJcblx0XHR0aGlzLmxpYmVyYWxDYXJkcyA9IDA7XHJcblx0XHR0aGlzLmZhc2Npc3RDYXJkcyA9IDA7XHJcblx0XHR0aGlzLmNhcmRzID0gW107XHJcblxyXG5cdFx0dGhpcy52ZXRvQ2FyZCA9IG5ldyBWZXRvQ2FyZCgpO1xyXG5cdFx0dGhpcy52ZXRvQ2FyZC5zY2FsZS5zZXRTY2FsYXIoLjUpO1xyXG5cdFx0dGhpcy52ZXRvQ2FyZC52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLnZldG9DYXJkLm1hdGVyaWFsLnRyYW5zcGFyZW50ID0gdHJ1ZTtcclxuXHRcdHRoaXMuYWRkKHRoaXMudmV0b0NhcmQpO1xyXG5cclxuXHRcdC8vIGFkZCB0YWJsZSBhc3NldFxyXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50YWJsZTtcclxuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XHJcblxyXG5cdFx0Ly8gc2F2ZSByZWZlcmVuY2VzIHRvIHRoZSB0ZXh0dXJlc1xyXG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtcclxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfc21hbGwsXHJcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX21lZCxcclxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbGFyZ2VcclxuXHRcdF07XHJcblx0XHR0aGlzLnRleHR1cmVzLmZvckVhY2godGV4ID0+IHRleC5mbGlwWSA9IGZhbHNlKTtcclxuXHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzBdLCB0cnVlKTtcclxuXHRcdFxyXG5cdFx0Ly8gcG9zaXRpb24gdGFibGVcclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAuODgsIDApO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLmNoYW5nZU1vZGUuYmluZCh0aGlzKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGliZXJhbFBvbGljaWVzJywgdGhpcy51cGRhdGVQb2xpY2llcy5iaW5kKHRoaXMpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9mYXNjaXN0UG9saWNpZXMnLCB0aGlzLnVwZGF0ZVBvbGljaWVzLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2ZhaWxlZFZvdGVzJywgdGhpcy51cGRhdGVQb2xpY2llcy5iaW5kKHRoaXMpKTtcclxuXHR9XHJcblxyXG5cdGNoYW5nZU1vZGUoe2RhdGE6IHtnYW1lOiB7c3RhdGUsIHR1cm5PcmRlcn19fSlcclxuXHR7XHJcblx0XHRpZih0dXJuT3JkZXIubGVuZ3RoID49IDkpXHJcblx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzJdKTtcclxuXHRcdGVsc2UgaWYodHVybk9yZGVyLmxlbmd0aCA+PSA3KVxyXG5cdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1sxXSk7XHJcblx0XHRlbHNlXHJcblx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzBdKTtcclxuXHR9XHJcblxyXG5cdHNldFRleHR1cmUobmV3VGV4LCBzd2l0Y2hMaWdodG1hcClcclxuXHR7XHJcblx0XHR0aGlzLm1vZGVsLnRyYXZlcnNlKG8gPT4ge1xyXG5cdFx0XHRpZihvIGluc3RhbmNlb2YgVEhSRUUuTWVzaClcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlmKHN3aXRjaExpZ2h0bWFwKVxyXG5cdFx0XHRcdFx0by5tYXRlcmlhbC5saWdodE1hcCA9IG8ubWF0ZXJpYWwubWFwO1xyXG5cclxuXHRcdFx0XHRvLm1hdGVyaWFsLm1hcCA9IG5ld1RleDtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVQb2xpY2llcyh7ZGF0YToge2dhbWU6IHtsaWJlcmFsUG9saWNpZXMsIGZhc2Npc3RQb2xpY2llcywgaGFuZCwgc3RhdGV9fX0pXHJcblx0e1xyXG5cdFx0bGV0IHVwZGF0ZXMgPSBbXTtcclxuXHJcblx0XHQvLyBxdWV1ZSB1cCBjYXJkcyB0byBiZSBhZGRlZCB0byB0aGUgdGFibGUgdGhpcyB1cGRhdGVcclxuXHRcdGZvcih2YXIgaT10aGlzLmxpYmVyYWxDYXJkczsgaTxsaWJlcmFsUG9saWNpZXM7IGkrKyl7XHJcblx0XHRcdGxldCBjYXJkID0gbmV3IExpYmVyYWxQb2xpY3lDYXJkKCk7XHJcblx0XHRcdGNhcmQuYW5pbWF0ZSA9ICgpID0+IEFuaW1hdGUuc2ltcGxlKGNhcmQsIHtcclxuXHRcdFx0XHRwb3M6IExpYmVyYWxTcG90cy5wb3NpdGlvbnNbaV0sXHJcblx0XHRcdFx0cXVhdDogTGliZXJhbFNwb3RzLnF1YXRlcm5pb24sXHJcblx0XHRcdFx0c2NhbGU6IExpYmVyYWxTcG90cy5zY2FsZVxyXG5cdFx0XHR9KS50aGVuKCgpID0+IEFuaW1hdGUud2FpdCg1MDApKTtcclxuXHRcdFx0Y2FyZC5wbGF5U291bmQgPSAoKSA9PiBTSC5hdWRpby5saWJlcmFsU3RpbmcubG9hZGVkLnRoZW4oKCkgPT4gU0guYXVkaW8ubGliZXJhbFN0aW5nLnBsYXkoKSk7XHJcblx0XHRcdHVwZGF0ZXMucHVzaChjYXJkKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Zm9yKHZhciBpPXRoaXMuZmFzY2lzdENhcmRzOyBpPGZhc2Npc3RQb2xpY2llczsgaSsrKXtcclxuXHRcdFx0bGV0IGNhcmQgPSBuZXcgRmFzY2lzdFBvbGljeUNhcmQoKTtcclxuXHRcdFx0Y2FyZC5hbmltYXRlID0gKCkgPT4gQW5pbWF0ZS5zaW1wbGUoY2FyZCwge1xyXG5cdFx0XHRcdHBvczogRmFzY2lzdFNwb3RzLnBvc2l0aW9uc1tpXSxcclxuXHRcdFx0XHRxdWF0OiBGYXNjaXN0U3BvdHMucXVhdGVybmlvbixcclxuXHRcdFx0XHRzY2FsZTogRmFzY2lzdFNwb3RzLnNjYWxlXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjYXJkLnBsYXlTb3VuZCA9ICgpID0+IFNILmF1ZGlvLmZhc2Npc3RTdGluZy5sb2FkZWQudGhlbigoKSA9PiBTSC5hdWRpby5mYXNjaXN0U3RpbmcucGxheSgpKTtcclxuXHRcdFx0dXBkYXRlcy5wdXNoKGNhcmQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHN0YXRlID09PSAnYWZ0ZXJtYXRoJyAmJiBoYW5kID09PSAxKXtcclxuXHRcdFx0dXBkYXRlcy5wdXNoKHRoaXMudmV0b0NhcmQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBhbmltYXRpb24gPSBudWxsO1xyXG5cdFx0aWYodXBkYXRlcy5sZW5ndGggPT09IDEpXHJcblx0XHR7XHJcblx0XHRcdGxldCBjYXJkID0gdXBkYXRlc1swXTtcclxuXHRcdFx0aWYoY2FyZCA9PT0gdGhpcy52ZXRvQ2FyZClcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNhcmQudmlzaWJsZSA9IHRydWU7IGNhcmQubWF0ZXJpYWwub3BhY2l0eSA9IDE7XHJcblx0XHRcdFx0YW5pbWF0aW9uID0gQW5pbWF0ZS5jYXJkRmxvdXJpc2goY2FyZClcclxuXHRcdFx0XHRcdC50aGVuKCgpID0+IEFuaW1hdGUudmFuaXNoKGNhcmQpKVxyXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4geyBjYXJkLnZpc2libGUgPSBmYWxzZTsgfSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dGhpcy5hZGQoY2FyZCk7XHJcblx0XHRcdFx0dGhpcy5jYXJkcy5wdXNoKGNhcmQpO1xyXG5cdFx0XHRcdGNhcmQucGxheVNvdW5kKCk7XHJcblx0XHRcdFx0YW5pbWF0aW9uID0gQW5pbWF0ZS5jYXJkRmxvdXJpc2goY2FyZClcclxuXHRcdFx0XHRcdC50aGVuKCgpID0+IGNhcmQuYW5pbWF0ZSgpKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZVxyXG5cdFx0e1xyXG5cdFx0XHQvLyBwbGFjZSBvbiB0aGVpciBzcG90c1xyXG5cdFx0XHR1cGRhdGVzLmZvckVhY2goY2FyZCA9PiB7XHJcblx0XHRcdFx0dGhpcy5hZGQoY2FyZCk7XHJcblx0XHRcdFx0dGhpcy5jYXJkcy5wdXNoKGNhcmQpO1xyXG5cdFx0XHRcdGNhcmQuYW5pbWF0ZSgpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGFuaW1hdGlvbiA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHN0YXRlID09PSAnYWZ0ZXJtYXRoJyl7XHJcblx0XHRcdGFuaW1hdGlvbi50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRTSC5kaXNwYXRjaEV2ZW50KHtcclxuXHRcdFx0XHRcdHR5cGU6ICdwb2xpY3lBbmltRG9uZScsXHJcblx0XHRcdFx0XHRidWJibGVzOiBmYWxzZVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZihsaWJlcmFsUG9saWNpZXMgPT09IDAgJiYgZmFzY2lzdFBvbGljaWVzID09PSAwKXtcclxuXHRcdFx0dGhpcy5jYXJkcy5mb3JFYWNoKGMgPT4gdGhpcy5yZW1vdmUoYykpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMubGliZXJhbENhcmRzID0gbGliZXJhbFBvbGljaWVzO1xyXG5cdFx0dGhpcy5mYXNjaXN0Q2FyZHMgPSBmYXNjaXN0UG9saWNpZXM7XHJcblx0fVxyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuZnVuY3Rpb24gZ2V0R2FtZUlkKClcclxue1xyXG5cdC8vIGZpcnN0IGNoZWNrIHRoZSB1cmxcclxuXHRsZXQgcmUgPSAvWz8mXWdhbWVJZD0oW14mXSspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xyXG5cdGlmKHJlKXtcclxuXHRcdHJldHVybiByZVsxXTtcclxuXHR9XHJcblx0ZWxzZSBpZihhbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudCl7XHJcblx0XHRyZXR1cm4gU0guZW52LnNpZDtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRsZXQgaWQgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogMTAwMDAwMDAwICk7XHJcblx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZSgnP2dhbWVJZD0nK2lkKTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlQ1NWKHN0cil7XHJcblx0aWYoIXN0cikgcmV0dXJuIFtdO1xyXG5cdGVsc2UgcmV0dXJuIHN0ci5zcGxpdCgnLCcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVF1ZXN0aW9uKHRleHQsIHRleHR1cmUgPSBudWxsKVxyXG57XHJcblx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xyXG5cclxuXHQvLyBzZXQgdXAgY2FudmFzXHJcblx0bGV0IGJtcDtcclxuXHRpZighdGV4dHVyZSl7XHJcblx0XHRibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuXHRcdGJtcC53aWR0aCA9IDUxMjtcclxuXHRcdGJtcC5oZWlnaHQgPSAyNTY7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0Ym1wID0gdGV4dHVyZS5pbWFnZTtcclxuXHR9XHJcblxyXG5cdGxldCBnID0gYm1wLmdldENvbnRleHQoJzJkJyk7XHJcblx0Zy5jbGVhclJlY3QoMCwgMCwgNTEyLCAyNTYpO1xyXG5cdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcblx0Zy5maWxsU3R5bGUgPSAnYmxhY2snO1xyXG5cclxuXHQvLyB3cml0ZSB0ZXh0XHJcblx0Zy5mb250ID0gJ2JvbGQgNTBweCAnK2ZvbnRTdGFjaztcclxuXHRsZXQgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcclxuXHRmb3IobGV0IGk9MDsgaTxsaW5lcy5sZW5ndGg7IGkrKyl7XHJcblx0XHRnLmZpbGxUZXh0KGxpbmVzW2ldLCAyNTYsIDUwKzU1KmkpO1xyXG5cdH1cclxuXHJcblx0aWYodGV4dHVyZSl7XHJcblx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdHJldHVybiB0ZXh0dXJlO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZShibXApO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gbWVyZ2VPYmplY3RzKGEsIGIsIGRlcHRoPTIpXHJcbntcclxuXHRmdW5jdGlvbiB1bmlxdWUoZSwgaSwgYSl7XHJcblx0XHRyZXR1cm4gYS5pbmRleE9mKGUpID09PSBpO1xyXG5cdH1cclxuXHJcblx0bGV0IGFJc09iaiA9IGEgaW5zdGFuY2VvZiBPYmplY3QsIGJJc09iaiA9IGIgaW5zdGFuY2VvZiBPYmplY3Q7XHJcblx0aWYoYUlzT2JqICYmIGJJc09iaiAmJiBkZXB0aCA+IDApXHJcblx0e1xyXG5cdFx0bGV0IHJlc3VsdCA9IHt9O1xyXG5cdFx0bGV0IGtleXMgPSBbLi4uT2JqZWN0LmtleXMoYSksIC4uLk9iamVjdC5rZXlzKGIpXS5maWx0ZXIodW5pcXVlKTtcclxuXHRcdGZvcihsZXQgaT0wOyBpPGtleXMubGVuZ3RoOyBpKyspe1xyXG5cdFx0XHRyZXN1bHRba2V5c1tpXV0gPSBtZXJnZU9iamVjdHMoYVtrZXlzW2ldXSwgYltrZXlzW2ldXSwgZGVwdGgtMSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdH1cclxuXHRlbHNlIGlmKGIgIT09IHVuZGVmaW5lZClcclxuXHRcdHJldHVybiBiO1xyXG5cdGVsc2VcclxuXHRcdHJldHVybiBhO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsYXRlVXBkYXRlKGZuKVxyXG57XHJcblx0cmV0dXJuICguLi5hcmdzKSA9PiB7XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IGZuKC4uLmFyZ3MpLCAxNSk7XHJcblx0fTtcclxufVxyXG5cclxuZXhwb3J0IHsgZ2V0R2FtZUlkLCBwYXJzZUNTViwgZ2VuZXJhdGVRdWVzdGlvbiwgbWVyZ2VPYmplY3RzLCBsYXRlVXBkYXRlIH07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBOYW1lcGxhdGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3Ioc2VhdClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XHJcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC42MzUsIDAuMjIpO1xyXG5cdFx0c2VhdC5hZGQodGhpcyk7XHJcblxyXG5cdFx0Ly8gYWRkIDNkIG1vZGVsXHJcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLm5hbWVwbGF0ZS5jaGlsZHJlblswXS5jbG9uZSgpO1xyXG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgTWF0aC5QSS8yKTtcclxuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XHJcblxyXG5cdFx0Ly8gZ2VuZXJhdGUgbWF0ZXJpYWxcclxuXHRcdHRoaXMuYm1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcblx0XHR0aGlzLmJtcC53aWR0aCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZTtcclxuXHRcdHRoaXMuYm1wLmhlaWdodCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAvIDI7XHJcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0bWFwOiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZSh0aGlzLmJtcClcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBsaXN0ZW5lciBwcm94aWVzXHJcblx0XHR0aGlzLl9ob3ZlckJlaGF2aW9yID0gbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJDb2xvcih7XHJcblx0XHRcdGNvbG9yOiBuZXcgVEhSRUUuQ29sb3IoMHhmZmE4YTgpXHJcblx0XHR9KTtcclxuXHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XHJcblx0XHR0aGlzLm1vZGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5jbGljay5iaW5kKHRoaXMpKTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0aWYoc3RhdGUgPT09ICdzZXR1cCcpXHJcblx0XHRcdFx0dGhpcy5tb2RlbC5hZGRCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHRoaXMubW9kZWwucmVtb3ZlQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZVRleHQodGV4dClcclxuXHR7XHJcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcclxuXHJcblx0XHQvLyBzZXQgdXAgY2FudmFzXHJcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XHJcblx0XHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XHJcblx0XHRnLmZpbGxTdHlsZSA9ICcjMjIyJztcclxuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XHJcblx0XHRnLmZvbnQgPSBgYm9sZCAke2ZvbnRTaXplfXB4ICR7Zm9udFN0YWNrfWA7XHJcblx0XHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xyXG5cdFx0Zy5maWxsVGV4dCh0ZXh0LCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMiwgKDAuNDIgLSAwLjEyKSooTmFtZXBsYXRlLnRleHR1cmVTaXplLzIpKTtcclxuXHJcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0fVxyXG5cclxuXHRjbGljayhlKVxyXG5cdHtcclxuXHRcdGlmKFNILmdhbWUuc3RhdGUgIT09ICdzZXR1cCcpIHJldHVybjtcclxuXHJcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyKVxyXG5cdFx0XHR0aGlzLnJlcXVlc3RKb2luKCk7XHJcblx0XHRlbHNlIGlmKHRoaXMuc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxyXG5cdFx0XHR0aGlzLnJlcXVlc3RMZWF2ZSgpO1xyXG5cdFx0ZWxzZSBpZihTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxyXG5cdFx0XHR0aGlzLnJlcXVlc3RLaWNrKCk7XHJcblx0fVxyXG5cclxuXHRyZXF1ZXN0Sm9pbigpXHJcblx0e1xyXG5cdFx0U0guc29ja2V0LmVtaXQoJ2pvaW4nLCBPYmplY3QuYXNzaWduKHtzZWF0TnVtOiB0aGlzLnNlYXQuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpO1xyXG5cdH1cclxuXHJcblx0cmVxdWVzdExlYXZlKClcclxuXHR7XHJcblx0XHRsZXQgc2VsZiA9IHRoaXM7XHJcblx0XHRpZighc2VsZi5xdWVzdGlvbilcclxuXHRcdHtcclxuXHRcdFx0c2VsZi5xdWVzdGlvbiA9IHNlbGYuc2VhdC5iYWxsb3QuYXNrUXVlc3Rpb24oJ0FyZSB5b3Ugc3VyZSB5b3VcXG53YW50IHRvIGxlYXZlPycsICdsb2NhbF9sZWF2ZScpXHJcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xyXG5cdFx0XHRcdGlmKGNvbmZpcm0pe1xyXG5cdFx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2xlYXZlJywgU0gubG9jYWxVc2VyLmlkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5jYXRjaCgoKSA9PiB7IHNlbGYucXVlc3Rpb24gPSBudWxsOyB9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJlcXVlc3RLaWNrKClcclxuXHR7XHJcblx0XHRsZXQgc2VsZiA9IHRoaXM7XHJcblx0XHRpZighc2VsZi5xdWVzdGlvbilcclxuXHRcdHtcclxuXHRcdFx0bGV0IHNlYXQgPSBTSC5zZWF0c1tTSC5wbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0uc2VhdE51bV07XHJcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWF0LmJhbGxvdC5hc2tRdWVzdGlvbihcclxuXHRcdFx0XHQnQXJlIHlvdSBzdXJlIHlvdVxcbndhbnQgdG8gdHJ5IHRvIGtpY2tcXG4nXHJcblx0XHRcdFx0K1NILnBsYXllcnNbc2VsZi5zZWF0Lm93bmVyXS5kaXNwbGF5TmFtZSxcclxuXHRcdFx0XHQnbG9jYWxfa2ljaydcclxuXHRcdFx0KVxyXG5cdFx0XHQudGhlbihjb25maXJtID0+IHtcclxuXHRcdFx0XHRpZihjb25maXJtKXtcclxuXHRcdFx0XHRcdFNILnNvY2tldC5lbWl0KCdraWNrJywgU0gubG9jYWxVc2VyLmlkLCBzZWxmLnNlYXQub3duZXIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uID0gbnVsbDtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuTmFtZXBsYXRlLnRleHR1cmVTaXplID0gMjU2O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQgKiBhcyBCYWxsb3RUeXBlIGZyb20gJy4vYmFsbG90JztcclxuaW1wb3J0IHt0cmFuc2xhdGUgYXMgdHJ9IGZyb20gJy4vdGhlbWUnO1xyXG5cclxuZnVuY3Rpb24gdXBkYXRlVm90ZXNJblByb2dyZXNzKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcclxue1xyXG5cdGxldCBiYWxsb3QgPSB0aGlzO1xyXG5cdGlmKCFiYWxsb3Quc2VhdC5vd25lcikgcmV0dXJuO1xyXG5cclxuXHRsZXQgdmlwcyA9IGdhbWUudm90ZXNJblByb2dyZXNzO1xyXG5cdGxldCBibGFja2xpc3RlZFZvdGVzID0gdmlwcy5maWx0ZXIoaWQgPT4ge1xyXG5cdFx0bGV0IHZzID0gWy4uLnZvdGVzW2lkXS55ZXNWb3RlcnMsIC4uLnZvdGVzW2lkXS5ub1ZvdGVyc107XHJcblx0XHRsZXQgbnYgPSB2b3Rlc1tpZF0ubm9uVm90ZXJzO1xyXG5cdFx0cmV0dXJuIG52LmluY2x1ZGVzKGJhbGxvdC5zZWF0Lm93bmVyKSB8fCB2cy5pbmNsdWRlcyhiYWxsb3Quc2VhdC5vd25lcik7XHJcblx0fSk7XHJcblx0bGV0IG5ld1ZvdGVzID0gdmlwcy5maWx0ZXIoXHJcblx0XHRpZCA9PiAoIVNILmdhbWUudm90ZXNJblByb2dyZXNzIHx8ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcy5pbmNsdWRlcyhpZCkpICYmICFibGFja2xpc3RlZFZvdGVzLmluY2x1ZGVzKGlkKVxyXG5cdCk7XHJcblx0bGV0IGZpbmlzaGVkVm90ZXMgPSAhU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MgPyBibGFja2xpc3RlZFZvdGVzXHJcblx0XHQ6IFNILmdhbWUudm90ZXNJblByb2dyZXNzLmZpbHRlcihpZCA9PiAhdmlwcy5pbmNsdWRlcyhpZCkpLmNvbmNhdChibGFja2xpc3RlZFZvdGVzKTtcclxuXHJcblx0bmV3Vm90ZXMuZm9yRWFjaCh2SWQgPT5cclxuXHR7XHJcblx0XHQvLyBnZW5lcmF0ZSBuZXcgcXVlc3Rpb24gdG8gYXNrXHJcblx0XHRsZXQgcXVlc3Rpb25UZXh0LCBvcHRzID0ge307XHJcblx0XHRpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdlbGVjdCcpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSBwbGF5ZXJzW2dhbWUucHJlc2lkZW50XS5kaXNwbGF5TmFtZVxyXG5cdFx0XHRcdCsgYCBmb3IgJHt0cigncHJlc2lkZW50Jyl9IGFuZCBgXHJcblx0XHRcdFx0KyBwbGF5ZXJzW2dhbWUuY2hhbmNlbGxvcl0uZGlzcGxheU5hbWVcclxuXHRcdFx0XHQrIGAgZm9yICR7dHIoJ2NoYW5jZWxsb3InKX0/YDtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAnam9pbicpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSB2b3Rlc1t2SWRdLmRhdGEgKyAnIHRvIGpvaW4/JztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAna2ljaycpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSAnVm90ZSB0byBraWNrICdcclxuXHRcdFx0XHQrIHBsYXllcnNbdm90ZXNbdklkXS50YXJnZXQxXS5kaXNwbGF5TmFtZVxyXG5cdFx0XHRcdCsgJz8nO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICd0dXRvcmlhbCcpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSAnUGxheSB0dXRvcmlhbD8nO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdjb25maXJtUm9sZScpXHJcblx0XHR7XHJcblx0XHRcdG9wdHMuY2hvaWNlcyA9IEJhbGxvdFR5cGUuQ09ORklSTTtcclxuXHRcdFx0bGV0IHJvbGU7XHJcblx0XHRcdGlmKGJhbGxvdC5zZWF0Lm93bmVyID09PSBTSC5sb2NhbFVzZXIuaWQpe1xyXG5cdFx0XHRcdHJvbGUgPSBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0ucm9sZTtcclxuXHRcdFx0XHRyb2xlID0gdHIocm9sZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHJvbGUuc2xpY2UoMSkpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdHJvbGUgPSAnPFJFREFDVEVEPic7XHJcblx0XHRcdH1cclxuXHRcdFx0cXVlc3Rpb25UZXh0ID0gJ1lvdXIgcm9sZTpcXG4nICsgcm9sZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZihxdWVzdGlvblRleHQpXHJcblx0XHR7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbihxdWVzdGlvblRleHQsIHZJZCwgb3B0cylcclxuXHRcdFx0LnRoZW4oYW5zd2VyID0+IHtcclxuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgndm90ZScsIHZJZCwgU0gubG9jYWxVc2VyLmlkLCBhbnN3ZXIpO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuY2F0Y2goKCkgPT4gY29uc29sZS5sb2coJ1ZvdGUgc2NydWJiZWQ6JywgdklkKSk7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGlmKGZpbmlzaGVkVm90ZXMuaW5jbHVkZXMoYmFsbG90LmRpc3BsYXllZCkpe1xyXG5cdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxyXG57XHJcblx0bGV0IGJhbGxvdCA9IHRoaXM7XHJcblxyXG5cdGZ1bmN0aW9uIGNob29zZVBsYXllcihxdWVzdGlvbiwgY29uZmlybVF1ZXN0aW9uLCBpZClcclxuXHR7XHJcblx0XHRmdW5jdGlvbiBjb25maXJtUGxheWVyKHVzZXJJZClcclxuXHRcdHtcclxuXHRcdFx0bGV0IHVzZXJuYW1lID0gU0gucGxheWVyc1t1c2VySWRdLmRpc3BsYXlOYW1lO1xyXG5cdFx0XHRsZXQgdGV4dCA9IGNvbmZpcm1RdWVzdGlvbi5yZXBsYWNlKCd7fScsIHVzZXJuYW1lKTtcclxuXHRcdFx0cmV0dXJuIGJhbGxvdC5hc2tRdWVzdGlvbih0ZXh0LCAnbG9jYWxfJytpZCsnX2NvbmZpcm0nKVxyXG5cdFx0XHQudGhlbihjb25maXJtZWQgPT4ge1xyXG5cdFx0XHRcdGlmKGNvbmZpcm1lZCl7XHJcblx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHVzZXJJZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGNob29zZVBsYXllcihxdWVzdGlvbiwgY29uZmlybVF1ZXN0aW9uLCBpZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gYmFsbG90LmFza1F1ZXN0aW9uKHF1ZXN0aW9uLCAnbG9jYWxfJytpZCwge2Nob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNUfSlcclxuXHRcdC50aGVuKGNvbmZpcm1QbGF5ZXIpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gaGlkZU5vbWluYXRlUGxhY2Vob2xkZXIoe2RhdGE6IHtnYW1lfX0pXHJcblx0e1xyXG5cdFx0aWYoZ2FtZS5zdGF0ZSAhPT0gJ25vbWluYXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfY2hhbmNlbGxvcicpe1xyXG5cdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdFx0fVxyXG5cdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZU5vbWluYXRlUGxhY2Vob2xkZXIpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gaGlkZVBvbGljeVBsYWNlaG9sZGVyKHtkYXRhOiB7Z2FtZX19KVxyXG5cdHtcclxuXHRcdGlmKGdhbWUuc3RhdGUgIT09ICdwb2xpY3kxJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcG9saWN5MScgfHxcclxuXHRcdFx0Z2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTInICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wb2xpY3kyJ1xyXG5cdFx0KXtcclxuXHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdH1cclxuXHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVQb2xpY3lQbGFjZWhvbGRlcik7XHJcblx0fVxyXG5cclxuXHRpZihnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcclxuXHRcdFx0Y2hvb3NlUGxheWVyKGBDaG9vc2UgeW91ciAke3RyKCdjaGFuY2VsbG9yJyl9IWAsIGBOYW1lIHt9IGFzICR7dHIoJ2NoYW5jZWxsb3InKX0/YCwgJ25vbWluYXRlJylcclxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcclxuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbm9taW5hdGUnLCB1c2VySWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oYENob29zZSB5b3VyICR7dHIoJ2NoYW5jZWxsb3InKX0hYCwgJ3dhaXRfZm9yX2NoYW5jZWxsb3InLCB7XHJcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXHJcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcclxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdub21pbmF0ZSdcclxuXHRcdFx0fSk7XHJcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVOb21pbmF0ZVBsYWNlaG9sZGVyKTtcclxuXHRcdH1cclxuXHR9XHJcblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncG9saWN5MScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxyXG5cdHtcclxuXHRcdGxldCBvcHRzID0ge2Nob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLCBwb2xpY3lIYW5kOiBnYW1lLmhhbmR9O1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkICE9PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdE9iamVjdC5hc3NpZ24ob3B0cywge2Zha2U6IHRydWUsIGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTEnfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdDaG9vc2Ugb25lXFxudG8gZGlzY2FyZCEnLCAnbG9jYWxfcG9saWN5MScsIG9wdHMpXHJcblx0XHQudGhlbihkaXNjYXJkID0+IHtcclxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2Rpc2NhcmRfcG9saWN5MScsIGRpc2NhcmQpO1xyXG5cdFx0fSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlUG9saWN5UGxhY2Vob2xkZXIpO1xyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdwb2xpY3kyJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5jaGFuY2VsbG9yKVxyXG5cdHtcclxuXHRcdGxldCBvcHRzID0ge1xyXG5cdFx0XHRjaG9pY2VzOiBCYWxsb3RUeXBlLlBPTElDWSxcclxuXHRcdFx0cG9saWN5SGFuZDogZ2FtZS5oYW5kLFxyXG5cdFx0XHRpbmNsdWRlVmV0bzogZ2FtZS5mYXNjaXN0UG9saWNpZXMgPT09IDUgJiYgIWJhbGxvdC5ibG9ja1ZldG9cclxuXHRcdH07XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgIT09IGdhbWUuY2hhbmNlbGxvcil7XHJcblx0XHRcdE9iamVjdC5hc3NpZ24ob3B0cywge2Zha2U6IHRydWUsIGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTInfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdDaG9vc2Ugb25lXFxudG8gZGlzY2FyZCEnLCAnbG9jYWxfcG9saWN5MicsIG9wdHMpXHJcblx0XHQudGhlbihkaXNjYXJkID0+IHtcclxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2Rpc2NhcmRfcG9saWN5MicsIGRpc2NhcmQpO1xyXG5cdFx0fSwgZXJyID0+IGNvbnNvbGUuZXJyb3IoZXJyKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlUG9saWN5UGxhY2Vob2xkZXIpO1xyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdpbnZlc3RpZ2F0ZScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxyXG5cdHtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xyXG5cdFx0XHRjaG9vc2VQbGF5ZXIoJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIG9uZSBwbGF5ZXIgdG8gaW52ZXN0aWdhdGUhJywgJ0ludmVzdGlnYXRlIHt9PycsICdpbnZlc3RpZ2F0ZScpXHJcblx0XHRcdC50aGVuKHVzZXJJZCA9PiB7XHJcblx0XHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XHJcblx0XHRcdFx0XHR0eXBlOiAnaW52ZXN0aWdhdGUnLFxyXG5cdFx0XHRcdFx0ZGF0YTogdXNlcklkXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2Ugb25lIHBsYXllciB0byBpbnZlc3RpZ2F0ZSEnLCAnd2FpdF9mb3JfaW52ZXN0aWdhdGUnLCB7XHJcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXHJcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcclxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdpbnZlc3RpZ2F0ZSdcclxuXHRcdFx0fSk7XHJcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0XHRpZihzdGF0ZSAhPT0gJ2ludmVzdGlnYXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfaW52ZXN0aWdhdGUnKVxyXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdwZWVrJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0bGV0IG9wdHMgPSB7Y2hvaWNlczogQmFsbG90VHlwZS5QT0xJQ1ksIHBvbGljeUhhbmQ6IDggfCAoZ2FtZS5kZWNrJjcpfTtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCAhPT0gZ2FtZS5wcmVzaWRlbnQpe1xyXG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwZWVrJ30pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBUb3Agb2YgcG9saWN5IGRlY2snLCAnbG9jYWxfcGVlaycsIG9wdHMpXHJcblx0XHQudGhlbihkaXNjYXJkID0+IHtcclxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2NvbnRpbnVlJyk7XHJcblx0XHR9KTtcclxuXHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0aWYoc3RhdGUgIT09ICdwZWVrJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcGVlaycpXHJcblx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcclxuXHRcdH07XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICduYW1lU3VjY2Vzc29yJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdGNob29zZVBsYXllcihgRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgdGhlIG5leHQgJHt0cigncHJlc2lkZW50Jyl9IWAsIGB7fSBmb3IgJHt0cigncHJlc2lkZW50Jyl9P2AsICduYW1lU3VjY2Vzc29yJylcclxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcclxuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbmFtZV9zdWNjZXNzb3InLCB1c2VySWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oYEV4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIHRoZSBuZXh0ICR7dHIoJ3ByZXNpZGVudCcpfSFgLCAnd2FpdF9mb3Jfc3VjY2Vzc29yJywge1xyXG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxyXG5cdFx0XHRcdGZha2U6IHRydWUsXHJcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAnbmFtZVN1Y2Nlc3NvcidcclxuXHRcdFx0fSk7XHJcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0XHRpZihzdGF0ZSAhPT0gJ25hbWVTdWNjZXNzb3InICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICd3YWl0X2Zvcl9zdWNjZXNzb3InKVxyXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdleGVjdXRlJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdGNob29zZVBsYXllcignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgYSBwbGF5ZXIgdG8gZXhlY3V0ZSEnLCAnRXhlY3V0ZSB7fT8nLCAnZXhlY3V0ZScpXHJcblx0XHRcdC50aGVuKHVzZXJJZCA9PiB7XHJcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2V4ZWN1dGUnLCB1c2VySWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIGEgcGxheWVyIHRvIGV4ZWN1dGUhJywgJ3dhaXRfZm9yX2V4ZWN1dGUnLCB7XHJcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXHJcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcclxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdleGVjdXRlJ1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0bGV0IGNsZWFuVXBGYWtlVm90ZSA9ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xyXG5cdFx0XHRcdGlmKHN0YXRlICE9PSAnZXhlY3V0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2V4ZWN1dGUnKVxyXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICd2ZXRvJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQXBwcm92ZSB2ZXRvPycsICdsb2NhbF92ZXRvJykudGhlbihhcHByb3ZlZCA9PiB7XHJcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2NvbmZpcm1fdmV0bycsIGFwcHJvdmVkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdBcHByb3ZlIHZldG8/JywgJ3dhaXRfZm9yX3ZldG8nLCB7XHJcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcclxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICd2ZXRvJ1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0bGV0IGNsZWFuVXBGYWtlVm90ZSA9ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xyXG5cdFx0XHRcdGlmKHN0YXRlICE9PSAndmV0bycgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX3ZldG8nKVxyXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3ZldG8nKXtcclxuXHRcdGJhbGxvdC5ibG9ja1ZldG8gPSB0cnVlO1xyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnKXtcclxuXHRcdGJhbGxvdC5ibG9ja1ZldG8gPSBmYWxzZTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7dXBkYXRlVm90ZXNJblByb2dyZXNzLCB1cGRhdGVTdGF0ZX07IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuLypcclxuKiBEZWNrcyBoYXZlIDE3IGNhcmRzOiA2IGxpYmVyYWwsIDExIGZhc2Npc3QuXHJcbiogSW4gYml0LXBhY2tlZCBib29sZWFuIGFycmF5cywgMSBpcyBsaWJlcmFsLCAwIGlzIGZhc2Npc3QuXHJcbiogVGhlIG1vc3Qgc2lnbmlmaWNhbnQgYml0IGlzIGFsd2F5cyAxLlxyXG4qIEUuZy4gMGIxMDEwMDEgcmVwcmVzZW50cyBhIGRlY2sgd2l0aCAyIGxpYmVyYWwgYW5kIDMgZmFzY2lzdCBjYXJkc1xyXG4qL1xyXG5cclxubGV0IEZVTExfREVDSyA9IDB4MjAwM2YsXHJcblx0RkFTQ0lTVCA9IDAsXHJcblx0TElCRVJBTCA9IDE7XHJcblxyXG5sZXQgcG9zaXRpb25zID0gW1xyXG5cdDB4MSwgMHgyLCAweDQsIDB4OCxcclxuXHQweDEwLCAweDIwLCAweDQwLCAweDgwLFxyXG5cdDB4MTAwLCAweDIwMCwgMHg0MDAsIDB4ODAwLFxyXG5cdDB4MTAwMCwgMHgyMDAwLCAweDQwMDAsIDB4ODAwMCxcclxuXHQweDEwMDAwLCAweDIwMDAwLCAweDQwMDAwXHJcbl07XHJcblxyXG5mdW5jdGlvbiBsZW5ndGgoZGVjaylcclxue1xyXG5cdHJldHVybiBwb3NpdGlvbnMuZmluZEluZGV4KHMgPT4gcyA+IGRlY2spIC0xO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzaHVmZmxlKGRlY2spXHJcbntcclxuXHRsZXQgbCA9IGxlbmd0aChkZWNrKTtcclxuXHRmb3IobGV0IGk9bC0xOyBpPjA7IGktLSlcclxuXHR7XHJcblx0XHRsZXQgbyA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGkpO1xyXG5cdFx0bGV0IGlWYWwgPSBkZWNrICYgMSA8PCBpLCBvVmFsID0gZGVjayAmIDEgPDwgbztcclxuXHRcdGxldCBzd2FwcGVkID0gaVZhbCA+Pj4gaS1vIHwgb1ZhbCA8PCBpLW87XHJcblx0XHRkZWNrID0gZGVjayAtIGlWYWwgLSBvVmFsICsgc3dhcHBlZDtcclxuXHR9XHJcblxyXG5cdHJldHVybiBkZWNrO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3VGhyZWUoZClcclxue1xyXG5cdHJldHVybiBkIDwgOCA/IFsxLCBkXSA6IFtkID4+PiAzLCA4IHwgZCAmIDddO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXNjYXJkT25lKGRlY2ssIHBvcylcclxue1xyXG5cdGxldCBib3R0b21IYWxmID0gZGVjayAmICgxIDw8IHBvcyktMTtcclxuXHRsZXQgdG9wSGFsZiA9IGRlY2sgJiB+KCgxIDw8IHBvcysxKS0xKTtcclxuXHR0b3BIYWxmID4+Pj0gMTtcclxuXHRsZXQgbmV3RGVjayA9IHRvcEhhbGYgfCBib3R0b21IYWxmO1xyXG5cdFxyXG5cdGxldCB2YWwgPSAoZGVjayAmIDE8PHBvcykgPj4+IHBvcztcclxuXHJcblx0cmV0dXJuIFtuZXdEZWNrLCB2YWxdO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhcHBlbmQoZGVjaywgdmFsKVxyXG57XHJcblx0cmV0dXJuIGRlY2sgPDwgMSB8IHZhbDtcclxufVxyXG5cclxuZnVuY3Rpb24gdG9BcnJheShkZWNrKVxyXG57XHJcblx0bGV0IGFyciA9IFtdO1xyXG5cdHdoaWxlKGRlY2sgPiAxKXtcclxuXHRcdGFyci5wdXNoKGRlY2sgJiAxKTtcclxuXHRcdGRlY2sgPj4+PSAxO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIGFycjtcclxufVxyXG5cclxuZXhwb3J0IHtsZW5ndGgsIHNodWZmbGUsIGRyYXdUaHJlZSwgZGlzY2FyZE9uZSwgYXBwZW5kLCB0b0FycmF5LCBGVUxMX0RFQ0ssIExJQkVSQUwsIEZBU0NJU1R9OyIsIid1c2Ugc3RyaWN0OydcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7IEJsYW5rQ2FyZCwgSmFDYXJkLCBOZWluQ2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxQb2xpY3lDYXJkLCBWZXRvQ2FyZCB9IGZyb20gJy4vY2FyZCc7XHJcbmltcG9ydCB7IGdlbmVyYXRlUXVlc3Rpb24sIGxhdGVVcGRhdGUgfSBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0ICogYXMgQlAgZnJvbSAnLi9iYWxsb3Rwcm9jZXNzb3InO1xyXG5pbXBvcnQgKiBhcyBCUEJBIGZyb20gJy4vYnBiYSc7XHJcbmltcG9ydCB7TlRleHQsIFBsYWNlaG9sZGVyTWVzaH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcclxuXHJcbmxldCBQTEFZRVJTRUxFQ1QgPSAwO1xyXG5sZXQgQ09ORklSTSA9IDE7XHJcbmxldCBCSU5BUlkgPSAyO1xyXG5sZXQgUE9MSUNZID0gMztcclxuXHJcbmNsYXNzIEJhbGxvdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcihzZWF0KVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xyXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLTAuMywgMC4yNSk7XHJcblx0XHR0aGlzLnJvdGF0aW9uLnNldCguNSwgTWF0aC5QSSwgMCk7XHJcblx0XHRzZWF0LmFkZCh0aGlzKTtcclxuXHJcblx0XHR0aGlzLmxhc3RRdWV1ZWQgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdHRoaXMuZGlzcGxheWVkID0gbnVsbDtcclxuXHRcdHRoaXMuYmxvY2tWZXRvID0gZmFsc2U7XHJcblxyXG5cdFx0dGhpcy5feWVzQ2xpY2tIYW5kbGVyID0gbnVsbDtcclxuXHRcdHRoaXMuX25vQ2xpY2tIYW5kbGVyID0gbnVsbDtcclxuXHRcdHRoaXMuX25vbWluYXRlSGFuZGxlciA9IG51bGw7XHJcblx0XHR0aGlzLl9jYW5jZWxIYW5kbGVyID0gbnVsbDtcclxuXHJcblx0XHR0aGlzLmphQ2FyZCA9IG5ldyBKYUNhcmQoKTtcclxuXHRcdHRoaXMubmVpbkNhcmQgPSBuZXcgTmVpbkNhcmQoKTtcclxuXHRcdFt0aGlzLmphQ2FyZCwgdGhpcy5uZWluQ2FyZF0uZm9yRWFjaChjID0+IHtcclxuXHRcdFx0Yy5wb3NpdGlvbi5zZXQoYyBpbnN0YW5jZW9mIEphQ2FyZCA/IC0wLjEgOiAwLjEsIC0wLjEsIDApO1xyXG5cdFx0XHRjLnNjYWxlLnNldFNjYWxhcigwLjE1KTtcclxuXHRcdFx0Yy52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR9KTtcclxuXHRcdHRoaXMuYWRkKHRoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkKTtcclxuXHRcdHRoaXMucG9saWNpZXMgPSBbXTtcclxuXHJcblx0XHQvL2xldCBnZW8gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSgwLjQsIDAuMik7XHJcblx0XHQvL2xldCBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe3RyYW5zcGFyZW50OiB0cnVlLCBzaWRlOiBUSFJFRS5Eb3VibGVTaWRlfSk7XHJcblx0XHR0aGlzLnF1ZXN0aW9uID0gUGxhY2Vob2xkZXJNZXNoLmNsb25lKCk7XHJcblx0XHR0aGlzLnF1ZXN0aW9uLnBvc2l0aW9uLnNldCgwLCAwLjA1LCAwKTtcclxuXHRcdHRoaXMucXVlc3Rpb24uc2NhbGUuc2V0U2NhbGFyKC41KTtcclxuXHRcdHRoaXMucXVlc3Rpb24udmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5xdWVzdGlvbik7XHJcblxyXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50ID0gbmV3IE5UZXh0KHRoaXMucXVlc3Rpb24pO1xyXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7d2lkdGg6IDEuMSwgaGVpZ2h0OiAuNCwgZm9udFNpemU6IDEsIHZlcnRpY2FsQWxpZ246ICd0b3AnfSk7XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3ZvdGVzSW5Qcm9ncmVzcycsIEJQLnVwZGF0ZVZvdGVzSW5Qcm9ncmVzcy5iaW5kKHRoaXMpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUoQlAudXBkYXRlU3RhdGUuYmluZCh0aGlzKSkpO1xyXG5cdH1cclxuXHJcblx0YXNrUXVlc3Rpb24ocVRleHQsIGlkLCB7Y2hvaWNlcyA9IEJJTkFSWSwgcG9saWN5SGFuZCA9IDB4MSwgaW5jbHVkZVZldG8gPSBmYWxzZSwgZmFrZSA9IGZhbHNlLCBpc0ludmFsaWQgPSAoKSA9PiB0cnVlfSA9IHt9KVxyXG5cdHtcclxuXHRcdGxldCBzZWxmID0gdGhpcztcclxuXHJcblx0XHRmdW5jdGlvbiBpc1ZvdGVWYWxpZCgpXHJcblx0XHR7XHJcblx0XHRcdGxldCBpc0Zha2VWYWxpZCA9IGZha2UgJiYgIWlzSW52YWxpZCgpO1xyXG5cdFx0XHRsZXQgaXNMb2NhbFZvdGUgPSAvXmxvY2FsLy50ZXN0KGlkKTtcclxuXHRcdFx0bGV0IGlzRmlyc3RVcGRhdGUgPSAhU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3M7XHJcblx0XHRcdGxldCB2b3RlID0gU0gudm90ZXNbaWRdO1xyXG5cdFx0XHRsZXQgdm90ZXJzID0gdm90ZSA/IFsuLi52b3RlLnllc1ZvdGVycywgLi4udm90ZS5ub1ZvdGVyc10gOiBbXTtcclxuXHRcdFx0bGV0IGFscmVhZHlWb3RlZCA9IHZvdGVycy5pbmNsdWRlcyhzZWxmLnNlYXQub3duZXIpO1xyXG5cdFx0XHRyZXR1cm4gaXNMb2NhbFZvdGUgfHwgaXNGaXJzdFVwZGF0ZSB8fCBpc0Zha2VWYWxpZCB8fCB2b3RlICYmICFhbHJlYWR5Vm90ZWQ7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gaG9va1VwUXVlc3Rpb24oKXtcclxuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKHF1ZXN0aW9uRXhlY3V0b3IpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHF1ZXN0aW9uRXhlY3V0b3IocmVzb2x2ZSwgcmVqZWN0KVxyXG5cdFx0e1xyXG5cdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBpcyBzdGlsbCByZWxldmFudFxyXG5cdFx0XHRpZighaXNWb3RlVmFsaWQoKSl7XHJcblx0XHRcdFx0cmV0dXJuIHJlamVjdCgnVm90ZSBubyBsb25nZXIgdmFsaWQnKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2hvdyB0aGUgYmFsbG90XHJcblx0XHRcdC8vc2VsZi5xdWVzdGlvbi5tYXRlcmlhbC5tYXAgPSBnZW5lcmF0ZVF1ZXN0aW9uKHFUZXh0LCBzZWxmLnF1ZXN0aW9uLm1hdGVyaWFsLm1hcCk7XHJcblx0XHRcdHNlbGYudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6IGAke3FUZXh0fWB9KTtcclxuXHRcdFx0c2VsZi5xdWVzdGlvbi52aXNpYmxlID0gdHJ1ZTtcclxuXHJcblx0XHRcdC8vIGhvb2sgdXAgcS9hIGNhcmRzXHJcblx0XHRcdGlmKGNob2ljZXMgPT09IENPTkZJUk0gfHwgY2hvaWNlcyA9PT0gQklOQVJZKXtcclxuXHRcdFx0XHRzZWxmLmphQ2FyZC52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0XHRpZighZmFrZSlcclxuXHRcdFx0XHRcdHNlbGYuamFDYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCgneWVzJywgcmVzb2x2ZSwgcmVqZWN0KSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYoY2hvaWNlcyA9PT0gQklOQVJZKXtcclxuXHRcdFx0XHRzZWxmLm5laW5DYXJkLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRcdGlmKCFmYWtlKVxyXG5cdFx0XHRcdFx0c2VsZi5uZWluQ2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQoJ25vJywgcmVzb2x2ZSwgcmVqZWN0KSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZihjaG9pY2VzID09PSBQTEFZRVJTRUxFQ1QgJiYgIWZha2Upe1xyXG5cdFx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3BsYXllclNlbGVjdCcsIHJlc3BvbmQoJ3BsYXllcicsIHJlc29sdmUsIHJlamVjdCkpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUE9MSUNZKXtcclxuXHRcdFx0XHRsZXQgY2FyZHMgPSBCUEJBLnRvQXJyYXkocG9saWN5SGFuZCk7XHJcblx0XHRcdFx0aWYoaW5jbHVkZVZldG8pIGNhcmRzLnB1c2goLTEpO1xyXG5cdFx0XHRcdGNhcmRzLmZvckVhY2goKHZhbCwgaSwgYXJyKSA9PlxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGxldCBjYXJkID0gbnVsbDtcclxuXHRcdFx0XHRcdGlmKGZha2UpXHJcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgQmxhbmtDYXJkKCk7XHJcblx0XHRcdFx0XHRlbHNlIGlmKHZhbCA9PT0gLTEpXHJcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgVmV0b0NhcmQoKTtcclxuXHRcdFx0XHRcdGVsc2UgaWYodmFsID09PSBCUEJBLkxJQkVSQUwpXHJcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgTGliZXJhbFBvbGljeUNhcmQoKTtcclxuXHRcdFx0XHRcdGVsc2VcclxuXHRcdFx0XHRcdFx0Y2FyZCA9IG5ldyBGYXNjaXN0UG9saWN5Q2FyZCgpO1xyXG5cclxuXHRcdFx0XHRcdGNhcmQuc2NhbGUuc2V0U2NhbGFyKDAuMTUpO1xyXG5cclxuXHRcdFx0XHRcdGxldCB3aWR0aCA9IC4xNSAqIGFyci5sZW5ndGg7XHJcblx0XHRcdFx0XHRsZXQgeCA9IC13aWR0aC8yICsgLjE1KmkgKyAuMDc1O1xyXG5cdFx0XHRcdFx0Y2FyZC5wb3NpdGlvbi5zZXQoeCwgLTAuMDcsIDApO1xyXG5cdFx0XHRcdFx0c2VsZi5hZGQoY2FyZCk7XHJcblx0XHRcdFx0XHRzZWxmLnBvbGljaWVzLnB1c2goY2FyZCk7XHJcblxyXG5cdFx0XHRcdFx0aWYoIWZha2UpXHJcblx0XHRcdFx0XHRcdGNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKHZhbCA9PT0gLTEgPyAtMSA6IGksIHJlc29sdmUsIHJlamVjdCkpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbmNlbFZvdGUnLCByZXNwb25kKCdjYW5jZWwnLCByZXNvbHZlLCByZWplY3QpKTtcclxuXHJcblx0XHRcdHNlbGYuZGlzcGxheWVkID0gaWQ7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gcmVzcG9uZChhbnN3ZXIsIHJlc29sdmUsIHJlamVjdClcclxuXHRcdHtcclxuXHRcdFx0ZnVuY3Rpb24gaGFuZGxlcihldnQpXHJcblx0XHRcdHtcclxuXHRcdFx0XHQvLyBtYWtlIHN1cmUgb25seSB0aGUgb3duZXIgb2YgdGhlIGJhbGxvdCBpcyBhbnN3ZXJpbmdcclxuXHRcdFx0XHRpZihhbnN3ZXIgIT09ICdjYW5jZWwnICYmIHNlbGYuc2VhdC5vd25lciAhPT0gU0gubG9jYWxVc2VyLmlkKSByZXR1cm47XHJcblxyXG5cdFx0XHRcdC8vIGNsZWFuIHVwXHJcblx0XHRcdFx0c2VsZi5qYUNhcmQudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHRcdHNlbGYubmVpbkNhcmQudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHRcdHNlbGYucXVlc3Rpb24udmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHRcdHNlbGYuZGlzcGxheWVkID0gbnVsbDtcclxuXHRcdFx0XHRzZWxmLnJlbW92ZSguLi5zZWxmLnBvbGljaWVzKTtcclxuXHRcdFx0XHRzZWxmLnBvbGljaWVzID0gW107XHJcblxyXG5cdFx0XHRcdHNlbGYuamFDYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgc2VsZi5feWVzQ2xpY2tIYW5kbGVyKTtcclxuXHRcdFx0XHRzZWxmLm5laW5DYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgc2VsZi5fbm9DbGlja0hhbmRsZXIpO1xyXG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BsYXllclNlbGVjdCcsIHNlbGYuX25vbWluYXRlSGFuZGxlcik7XHJcblx0XHRcdFx0c2VsZi5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5jZWxWb3RlJywgc2VsZi5fY2FuY2VsSGFuZGxlcik7XHJcblxyXG5cdFx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgYW5zd2VyIHN0aWxsIG1hdHRlcnNcclxuXHRcdFx0XHRpZighaXNWb3RlVmFsaWQoKSB8fCBhbnN3ZXIgPT09ICdjYW5jZWwnKXtcclxuXHRcdFx0XHRcdHJlamVjdCgndm90ZSBjYW5jZWxsZWQnKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICd5ZXMnKVxyXG5cdFx0XHRcdFx0cmVzb2x2ZSh0cnVlKTtcclxuXHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ25vJylcclxuXHRcdFx0XHRcdHJlc29sdmUoZmFsc2UpO1xyXG5cdFx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAncGxheWVyJylcclxuXHRcdFx0XHRcdHJlc29sdmUoZXZ0LmRhdGEpO1xyXG5cdFx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUE9MSUNZKVxyXG5cdFx0XHRcdFx0cmVzb2x2ZShhbnN3ZXIpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZihhbnN3ZXIgPT09ICd5ZXMnKVxyXG5cdFx0XHRcdHNlbGYuX3llc0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XHJcblx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnbm8nKVxyXG5cdFx0XHRcdHNlbGYuX25vQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcclxuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdwbGF5ZXInKVxyXG5cdFx0XHRcdHNlbGYuX25vbWluYXRlSGFuZGxlciA9IGhhbmRsZXI7XHJcblx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnY2FuY2VsJylcclxuXHRcdFx0XHRzZWxmLl9jYW5jZWxIYW5kbGVyID0gaGFuZGxlcjtcclxuXHJcblx0XHRcdHJldHVybiBoYW5kbGVyO1xyXG5cdFx0fVxyXG5cclxuXHRcdHNlbGYubGFzdFF1ZXVlZCA9IHNlbGYubGFzdFF1ZXVlZC50aGVuKGhvb2tVcFF1ZXN0aW9uLCBob29rVXBRdWVzdGlvbik7XHJcblxyXG5cdFx0cmV0dXJuIHNlbGYubGFzdFF1ZXVlZDtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7QmFsbG90LCBQTEFZRVJTRUxFQ1QsIENPTkZJUk0sIEJJTkFSWSwgUE9MSUNZfTsiLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQge0Zhc2Npc3RSb2xlQ2FyZCwgSGl0bGVyUm9sZUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZH0gZnJvbSAnLi9jYXJkJztcclxuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0IHtOQmlsbGJvYXJkfSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxheWVySW5mbyBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcihzZWF0KVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xyXG5cdFx0dGhpcy5jYXJkID0gbnVsbDtcclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAsIDAuMyk7XHJcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjMpO1xyXG5cdFx0c2VhdC5hZGQodGhpcyk7XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgbGF0ZVVwZGF0ZSh0aGlzLnVwZGF0ZVN0YXRlLmJpbmQodGhpcykpKTtcclxuXHRcdC8vU0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlVHVybk9yZGVyLmJpbmQodGhpcykpO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2ludmVzdGlnYXRlJywgdGhpcy5wcmVzZW50UGFydHkuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVUdXJuT3JkZXIoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXHJcblx0e1xyXG5cdFx0U0guX3VzZXJQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRsZXQgbG9jYWxQbGF5ZXIgPSBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF07XHJcblx0XHRcdGlmKGxvY2FsUGxheWVyKXtcclxuXHRcdFx0XHRsZXQgcGxheWVyUG9zID0gdGhpcy53b3JsZFRvTG9jYWwoU0guc2VhdHNbbG9jYWxQbGF5ZXIuc2VhdE51bV0uZ2V0V29ybGRQb3NpdGlvbigpKTtcclxuXHRcdFx0XHR0aGlzLmxvb2tBdChwbGF5ZXJQb3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZVN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcclxuXHR7XHJcblx0XHRpZih0aGlzLnNlYXQub3duZXIgJiYgZ2FtZS5zdGF0ZSA9PT0gJ25pZ2h0JyAmJiBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0gfHwgZ2FtZS5zdGF0ZSA9PT0gJ2RvbmUnKXtcclxuXHRcdFx0dGhpcy5wcmVzZW50Um9sZShnYW1lLCBwbGF5ZXJzLCB2b3Rlcyk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZWxzZSBpZih0aGlzLnNlYXQub3duZXIgJiYgZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJylcclxuXHRcdFx0dGhpcy5wcmVzZW50Vm90ZShnYW1lLCBwbGF5ZXJzLCB2b3Rlcyk7XHJcblxyXG5cdFx0ZWxzZSBpZih0aGlzLmNhcmQgIT09IG51bGwpXHJcblx0XHR7XHJcblx0XHRcdHRoaXMucmVtb3ZlKHRoaXMuY2FyZCk7XHJcblx0XHRcdHRoaXMuY2FyZCA9IG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcmVzZW50Um9sZShnYW1lLCBwbGF5ZXJzKVxyXG5cdHtcclxuXHRcdGlmKHRoaXMuY2FyZCAhPT0gbnVsbCl7XHJcblx0XHRcdHRoaXMucmVtb3ZlKHRoaXMuY2FyZCk7XHJcblx0XHRcdHRoaXMuY2FyZCA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0bGV0IGxvY2FsUGxheWVyID0gcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdO1xyXG5cdFx0bGV0IHNlYXRlZFBsYXllciA9IHBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXTtcclxuXHJcblx0XHRsZXQgc2VhdGVkUm9sZVNob3VsZEJlVmlzaWJsZSA9XHJcblx0XHRcdGdhbWUuc3RhdGUgPT09ICdkb25lJyB8fFxyXG5cdFx0XHRTSC5sb2NhbFVzZXIuaWQgPT09IHRoaXMuc2VhdC5vd25lciB8fFxyXG5cdFx0XHRsb2NhbFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgJiYgKHNlYXRlZFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgfHwgc2VhdGVkUGxheWVyLnJvbGUgPT09ICdoaXRsZXInKSB8fFxyXG5cdFx0XHRsb2NhbFBsYXllci5yb2xlID09PSAnaGl0bGVyJyAmJiBzZWF0ZWRQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnICYmIGdhbWUudHVybk9yZGVyLmxlbmd0aCA8IDc7XHJcblxyXG5cdFx0aWYoc2VhdGVkUm9sZVNob3VsZEJlVmlzaWJsZSlcclxuXHRcdHtcclxuXHRcdFx0c3dpdGNoKHNlYXRlZFBsYXllci5yb2xlKXtcclxuXHRcdFx0XHRjYXNlICdmYXNjaXN0JzogdGhpcy5jYXJkID0gbmV3IEZhc2Npc3RSb2xlQ2FyZCgpOyBicmVhaztcclxuXHRcdFx0XHRjYXNlICdoaXRsZXInIDogdGhpcy5jYXJkID0gbmV3IEhpdGxlclJvbGVDYXJkKCk7ICBicmVhaztcclxuXHRcdFx0XHRjYXNlICdsaWJlcmFsJzogdGhpcy5jYXJkID0gbmV3IExpYmVyYWxSb2xlQ2FyZCgpOyBicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhpcy5hZGQodGhpcy5jYXJkKTtcclxuXHRcdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByZXNlbnRWb3RlKGdhbWUsIF8sIHZvdGVzKVxyXG5cdHtcclxuXHRcdGlmKHRoaXMuY2FyZCAhPT0gbnVsbCl7XHJcblx0XHRcdHRoaXMucmVtb3ZlKHRoaXMuY2FyZCk7XHJcblx0XHRcdHRoaXMuY2FyZCA9IG51bGw7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGxldCB2b3RlID0gdm90ZXNbZ2FtZS5sYXN0RWxlY3Rpb25dO1xyXG5cclxuXHRcdGlmKHZvdGUubm9uVm90ZXJzLmluY2x1ZGVzKHRoaXMuc2VhdC5vd25lcikpXHJcblx0XHRcdHJldHVybjtcclxuXHJcblx0XHRsZXQgcGxheWVyVm90ZSA9IHZvdGUueWVzVm90ZXJzLmluY2x1ZGVzKHRoaXMuc2VhdC5vd25lcik7XHJcblx0XHR0aGlzLmNhcmQgPSBwbGF5ZXJWb3RlID8gbmV3IEphQ2FyZCgpIDogbmV3IE5laW5DYXJkKCk7XHJcblxyXG5cdFx0dGhpcy5hZGQodGhpcy5jYXJkKTtcclxuXHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuY2FyZCk7XHJcblx0fVxyXG5cclxuXHRwcmVzZW50UGFydHkoe2RhdGE6IHVzZXJJZH0pXHJcblx0e1xyXG5cdFx0aWYoIXRoaXMuc2VhdC5vd25lciB8fCB0aGlzLnNlYXQub3duZXIgIT09IHVzZXJJZCkgcmV0dXJuO1xyXG5cclxuXHRcdGxldCByb2xlID0gU0gucGxheWVyc1t0aGlzLnNlYXQub3duZXJdLnJvbGU7XHJcblx0XHR0aGlzLmNhcmQgPSAgcm9sZSA9PT0gJ2xpYmVyYWwnID8gbmV3IExpYmVyYWxQYXJ0eUNhcmQoKSA6IG5ldyBGYXNjaXN0UGFydHlDYXJkKCk7XHJcblxyXG5cdFx0dGhpcy5hZGQodGhpcy5jYXJkKTtcclxuXHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuY2FyZCk7XHJcblx0fVxyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDYXBzdWxlR2VvbWV0cnkgZXh0ZW5kcyBUSFJFRS5CdWZmZXJHZW9tZXRyeVxyXG57XHJcblx0Y29uc3RydWN0b3IocmFkaXVzLCBoZWlnaHQsIHNlZ21lbnRzID0gMTIsIHJpbmdzID0gOClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdGxldCBudW1WZXJ0cyA9IDIgKiByaW5ncyAqIHNlZ21lbnRzICsgMjtcclxuXHRcdGxldCBudW1GYWNlcyA9IDQgKiByaW5ncyAqIHNlZ21lbnRzO1xyXG5cdFx0bGV0IHRoZXRhID0gMipNYXRoLlBJL3NlZ21lbnRzO1xyXG5cdFx0bGV0IHBoaSA9IE1hdGguUEkvKDIqcmluZ3MpO1xyXG5cclxuXHRcdGxldCB2ZXJ0cyA9IG5ldyBGbG9hdDMyQXJyYXkoMypudW1WZXJ0cyk7XHJcblx0XHRsZXQgZmFjZXMgPSBuZXcgVWludDE2QXJyYXkoMypudW1GYWNlcyk7XHJcblx0XHRsZXQgdmkgPSAwLCBmaSA9IDAsIHRvcENhcCA9IDAsIGJvdENhcCA9IDE7XHJcblxyXG5cdFx0dmVydHMuc2V0KFswLCBoZWlnaHQvMiwgMF0sIDMqdmkrKyk7XHJcblx0XHR2ZXJ0cy5zZXQoWzAsIC1oZWlnaHQvMiwgMF0sIDMqdmkrKyk7XHJcblxyXG5cdFx0Zm9yKCBsZXQgcz0wOyBzPHNlZ21lbnRzOyBzKysgKVxyXG5cdFx0e1xyXG5cdFx0XHRmb3IoIGxldCByPTE7IHI8PXJpbmdzOyByKyspXHJcblx0XHRcdHtcclxuXHRcdFx0XHRsZXQgcmFkaWFsID0gcmFkaXVzICogTWF0aC5zaW4ocipwaGkpO1xyXG5cclxuXHRcdFx0XHQvLyBjcmVhdGUgdmVydHNcclxuXHRcdFx0XHR2ZXJ0cy5zZXQoW1xyXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5jb3Mocyp0aGV0YSksXHJcblx0XHRcdFx0XHRoZWlnaHQvMiAtIHJhZGl1cyooMS1NYXRoLmNvcyhyKnBoaSkpLFxyXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5zaW4ocyp0aGV0YSlcclxuXHRcdFx0XHRdLCAzKnZpKyspO1xyXG5cclxuXHRcdFx0XHR2ZXJ0cy5zZXQoW1xyXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5jb3Mocyp0aGV0YSksXHJcblx0XHRcdFx0XHQtaGVpZ2h0LzIgKyByYWRpdXMqKDEtTWF0aC5jb3MocipwaGkpKSxcclxuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguc2luKHMqdGhldGEpXHJcblx0XHRcdFx0XSwgMyp2aSsrKTtcclxuXHJcblx0XHRcdFx0bGV0IHRvcF9zMXIxID0gdmktMiwgdG9wX3MxcjAgPSB2aS00O1xyXG5cdFx0XHRcdGxldCBib3RfczFyMSA9IHZpLTEsIGJvdF9zMXIwID0gdmktMztcclxuXHRcdFx0XHRsZXQgdG9wX3MwcjEgPSB0b3BfczFyMSAtIDIqcmluZ3MsIHRvcF9zMHIwID0gdG9wX3MxcjAgLSAyKnJpbmdzO1xyXG5cdFx0XHRcdGxldCBib3RfczByMSA9IGJvdF9zMXIxIC0gMipyaW5ncywgYm90X3MwcjAgPSBib3RfczFyMCAtIDIqcmluZ3M7XHJcblx0XHRcdFx0aWYocyA9PT0gMCl7XHJcblx0XHRcdFx0XHR0b3BfczByMSArPSBudW1WZXJ0cy0yO1xyXG5cdFx0XHRcdFx0dG9wX3MwcjAgKz0gbnVtVmVydHMtMjtcclxuXHRcdFx0XHRcdGJvdF9zMHIxICs9IG51bVZlcnRzLTI7XHJcblx0XHRcdFx0XHRib3RfczByMCArPSBudW1WZXJ0cy0yO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gY3JlYXRlIGZhY2VzXHJcblx0XHRcdFx0aWYociA9PT0gMSlcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcENhcCwgdG9wX3MxcjEsIHRvcF9zMHIxXSwgMypmaSsrKTtcclxuXHRcdFx0XHRcdGZhY2VzLnNldChbYm90Q2FwLCBib3RfczByMSwgYm90X3MxcjFdLCAzKmZpKyspO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFt0b3BfczFyMCwgdG9wX3MxcjEsIHRvcF9zMHIwXSwgMypmaSsrKTtcclxuXHRcdFx0XHRcdGZhY2VzLnNldChbdG9wX3MwcjAsIHRvcF9zMXIxLCB0b3BfczByMV0sIDMqZmkrKyk7XHJcblxyXG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFtib3RfczByMSwgYm90X3MxcjEsIGJvdF9zMHIwXSwgMypmaSsrKTtcclxuXHRcdFx0XHRcdGZhY2VzLnNldChbYm90X3MwcjAsIGJvdF9zMXIxLCBib3RfczFyMF0sIDMqZmkrKyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgbG9uZyBzaWRlc1xyXG5cdFx0XHRsZXQgdG9wX3MxID0gdmktMiwgdG9wX3MwID0gdG9wX3MxIC0gMipyaW5ncztcclxuXHRcdFx0bGV0IGJvdF9zMSA9IHZpLTEsIGJvdF9zMCA9IGJvdF9zMSAtIDIqcmluZ3M7XHJcblx0XHRcdGlmKHMgPT09IDApe1xyXG5cdFx0XHRcdHRvcF9zMCArPSBudW1WZXJ0cy0yO1xyXG5cdFx0XHRcdGJvdF9zMCArPSBudW1WZXJ0cy0yO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmYWNlcy5zZXQoW3RvcF9zMCwgdG9wX3MxLCBib3RfczFdLCAzKmZpKyspO1xyXG5cdFx0XHRmYWNlcy5zZXQoW2JvdF9zMCwgdG9wX3MwLCBib3RfczFdLCAzKmZpKyspO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuYWRkQXR0cmlidXRlKCdwb3NpdGlvbicsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUodmVydHMsIDMpKTtcclxuXHRcdHRoaXMuc2V0SW5kZXgobmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShmYWNlcywgMSkpO1xyXG5cdH1cclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IENhcHN1bGVHZW9tZXRyeSBmcm9tICcuL2NhcHN1bGVnZW9tZXRyeSc7XHJcbmltcG9ydCB7bGF0ZVVwZGF0ZX0gZnJvbSAnLi91dGlscyc7XHJcblxyXG5sZXQgaGl0Ym94R2VvID0gbmV3IENhcHN1bGVHZW9tZXRyeSgwLjMsIDEuOCk7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBIaXRib3ggZXh0ZW5kcyBUSFJFRS5NZXNoXHJcbntcclxuXHRjb25zdHJ1Y3RvcihzZWF0KVxyXG5cdHtcclxuXHRcdHN1cGVyKGhpdGJveEdlbywgbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0dHJhbnNwYXJlbnQ6IHRydWUsXHJcblx0XHRcdG9wYWNpdHk6IDAsXHJcblx0XHRcdHNpZGU6IFRIUkVFLkJhY2tTaWRlXHJcblx0XHR9KSk7XHJcblxyXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLTAuNSwgMCk7XHJcblx0XHR0aGlzLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XHJcblx0XHRzZWF0LmFkZCh0aGlzKTtcclxuXHJcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcmVudGVyJywgKCkgPT4gdGhpcy5tYXRlcmlhbC5vcGFjaXR5ID0gMC4xKTtcclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ybGVhdmUnLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwKTtcclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCAoKSA9PiB7XHJcblx0XHRcdFNILmRpc3BhdGNoRXZlbnQoe1xyXG5cdFx0XHRcdHR5cGU6ICdwbGF5ZXJTZWxlY3QnLFxyXG5cdFx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxyXG5cdFx0XHRcdGRhdGE6IHRoaXMuc2VhdC5vd25lclxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUodGhpcy51cGRhdGVWaXNpYmlsaXR5LmJpbmQodGhpcykpKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZVZpc2liaWxpdHkoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXHJcblx0e1xyXG5cdFx0bGV0IGxpdmluZ1BsYXllcnMgPSBnYW1lLnR1cm5PcmRlci5maWx0ZXIocCA9PiBwbGF5ZXJzW3BdLnN0YXRlICE9PSAnZGVhZCcpO1xyXG5cdFx0bGV0IHByZWNvbmRpdGlvbnMgPVxyXG5cdFx0XHRTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50ICYmXHJcblx0XHRcdHRoaXMuc2VhdC5vd25lciAhPT0gJycgJiZcclxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQgJiZcclxuXHRcdFx0bGl2aW5nUGxheWVycy5pbmNsdWRlcyh0aGlzLnNlYXQub3duZXIpO1xyXG5cclxuXHRcdGxldCBub21pbmF0ZWFibGUgPVxyXG5cdFx0XHRnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnICYmXHJcblx0XHRcdHRoaXMuc2VhdC5vd25lciAhPT0gZ2FtZS5sYXN0Q2hhbmNlbGxvciAmJlxyXG5cdFx0XHQobGl2aW5nUGxheWVycy5sZW5ndGggPD0gNSB8fCB0aGlzLnNlYXQub3duZXIgIT09IGdhbWUubGFzdFByZXNpZGVudCk7XHJcblxyXG5cdFx0bGV0IGludmVzdGlnYXRlYWJsZSA9XHJcblx0XHRcdGdhbWUuc3RhdGUgPT09ICdpbnZlc3RpZ2F0ZScgJiZcclxuXHRcdFx0cGxheWVyc1t0aGlzLnNlYXQub3duZXJdLnN0YXRlID09PSAnbm9ybWFsJztcclxuXHRcdFxyXG5cdFx0bGV0IHN1Y2NlZWRhYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ25hbWVTdWNjZXNzb3InO1xyXG5cdFx0bGV0IGV4ZWN1dGFibGUgPSBnYW1lLnN0YXRlID09PSAnZXhlY3V0ZSc7XHJcblxyXG5cdFx0dGhpcy52aXNpYmxlID0gcHJlY29uZGl0aW9ucyAmJiAobm9taW5hdGVhYmxlIHx8IGludmVzdGlnYXRlYWJsZSB8fCBzdWNjZWVkYWJsZSB8fCBleGVjdXRhYmxlKTtcclxuXHR9XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XHJcbmltcG9ydCB7QmFsbG90fSBmcm9tICcuL2JhbGxvdCc7XHJcbmltcG9ydCBQbGF5ZXJJbmZvIGZyb20gJy4vcGxheWVyaW5mbyc7XHJcbmltcG9ydCBIaXRib3ggZnJvbSAnLi9oaXRib3gnO1xyXG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2VhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcihzZWF0TnVtKVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblxyXG5cdFx0dGhpcy5zZWF0TnVtID0gc2VhdE51bTtcclxuXHRcdHRoaXMub3duZXIgPSAnJztcclxuXHJcblx0XHQvLyBwb3NpdGlvbiBzZWF0XHJcblx0XHRsZXQgeCwgeT0wLjY1LCB6O1xyXG5cdFx0c3dpdGNoKHNlYXROdW0pe1xyXG5cdFx0Y2FzZSAwOiBjYXNlIDE6IGNhc2UgMjpcclxuXHRcdFx0eCA9IC0wLjgzMyArIDAuODMzKnNlYXROdW07XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIC0xLjA1KTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlIDM6IGNhc2UgNDpcclxuXHRcdFx0eiA9IC0wLjQzNyArIDAuODc0KihzZWF0TnVtLTMpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgxLjQyNSwgeSwgeik7XHJcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLzIsIDApO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XHJcblx0XHRcdHggPSAwLjgzMyAtIDAuODMzKihzZWF0TnVtLTUpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCh4LCB5LCAxLjA1KTtcclxuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEksIDApO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgODogY2FzZSA5OlxyXG5cdFx0XHR6ID0gMC40MzcgLSAwLjg3NCooc2VhdE51bS04KTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoLTEuNDI1LCB5LCB6KTtcclxuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLTEuNSpNYXRoLlBJLCAwKTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignY2hlY2tlZF9pbicsICh7ZGF0YTogaWR9KSA9PiB7XHJcblx0XHRcdGlmKHRoaXMub3duZXIgPT09IGlkKVxyXG5cdFx0XHRcdHRoaXMudXBkYXRlT3duZXJzaGlwKHtkYXRhOiB7Z2FtZTogU0guZ2FtZSwgcGxheWVyczogU0gucGxheWVyc319KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSkgPT4ge1xyXG5cdFx0XHRpZih0aGlzLm93bmVyICYmIHBsYXllcnNbdGhpcy5vd25lcl0uc3RhdGUgPT09ICdkZWFkJyl7XHJcblx0XHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0KDB4M2QyNzg5KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5uYW1lcGxhdGUgPSBuZXcgTmFtZXBsYXRlKHRoaXMpO1xyXG5cdFx0dGhpcy5iYWxsb3QgPSBuZXcgQmFsbG90KHRoaXMpO1xyXG5cdFx0dGhpcy5wbGF5ZXJJbmZvID0gbmV3IFBsYXllckluZm8odGhpcyk7XHJcblx0XHR0aGlzLmhpdGJveCA9IG5ldyBIaXRib3godGhpcyk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXHJcblx0e1xyXG5cdFx0bGV0IGlkcyA9IGdhbWUudHVybk9yZGVyIHx8IFtdO1xyXG5cclxuXHRcdC8vIHJlZ2lzdGVyIHRoaXMgc2VhdCBpZiBpdCdzIG5ld2x5IGNsYWltZWRcclxuXHRcdGlmKCAhdGhpcy5vd25lciApXHJcblx0XHR7XHJcblx0XHRcdC8vIGNoZWNrIGlmIGEgcGxheWVyIGhhcyBqb2luZWQgYXQgdGhpcyBzZWF0XHJcblx0XHRcdGZvcihsZXQgaSBpbiBpZHMpe1xyXG5cdFx0XHRcdGlmKHBsYXllcnNbaWRzW2ldXS5zZWF0TnVtID09IHRoaXMuc2VhdE51bSl7XHJcblx0XHRcdFx0XHR0aGlzLm93bmVyID0gaWRzW2ldO1xyXG5cdFx0XHRcdFx0dGhpcy5uYW1lcGxhdGUudXBkYXRlVGV4dChwbGF5ZXJzW2lkc1tpXV0uZGlzcGxheU5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHJlc2V0IHRoaXMgc2VhdCBpZiBpdCdzIG5ld2x5IHZhY2F0ZWRcclxuXHRcdGlmKCAhaWRzLmluY2x1ZGVzKHRoaXMub3duZXIpIClcclxuXHRcdHtcclxuXHRcdFx0dGhpcy5vd25lciA9ICcnO1xyXG5cdFx0XHRpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcclxuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KCc8Sm9pbj4nKTtcclxuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXRIZXgoMHhmZmZmZmYpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gdXBkYXRlIGRpc2Nvbm5lY3QgY29sb3JzXHJcblx0XHRlbHNlIGlmKCAhcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcclxuXHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ODA4MDgwKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoIHBsYXllcnNbdGhpcy5vd25lcl0uY29ubmVjdGVkICl7XHJcblx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweGZmZmZmZik7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7UGxhY2Vob2xkZXJNZXNoLCBOQmlsbGJvYXJkLCBOVGV4dH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcclxuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbnRpbnVlQm94IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKHBhcmVudClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5pY29uID0gbmV3IFRIUkVFLk1lc2goXHJcblx0XHRcdG5ldyBUSFJFRS5Cb3hCdWZmZXJHZW9tZXRyeSguMTUsIC4xNSwgLjE1KSxcclxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHgxMGEwMTB9KVxyXG5cdFx0KTtcclxuXHRcdEFuaW1hdGUuc3Bpbih0aGlzLmljb24pO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5pY29uKTtcclxuXHJcblx0XHR0aGlzLnRleHQgPSBQbGFjZWhvbGRlck1lc2guY2xvbmUoKTtcclxuXHRcdHRoaXMudGV4dC5wb3NpdGlvbi5zZXQoMCwgLjIsIDApO1xyXG5cdFx0dGhpcy50ZXh0LnVzZXJEYXRhLmFsdHNwYWNlID0ge2NvbGxpZGVyOiB7ZW5hYmxlZDogdHJ1ZX19O1xyXG5cclxuXHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMudGV4dCk7XHJcblxyXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50ID0gbmV3IE5UZXh0KHRoaXMudGV4dCk7XHJcblx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHtmb250U2l6ZTogMSwgd2lkdGg6IDIsIGhlaWdodDogMSwgaG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJywgdmVydGljYWxBbGlnbjogJ21pZGRsZSd9KTtcclxuXHJcblx0XHR0aGlzLmFkZCh0aGlzLnRleHQpO1xyXG5cclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAuMjUsIDApO1xyXG5cdFx0cGFyZW50LmFkZCh0aGlzKTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCB0aGlzLm9uc3RhdGVjaGFuZ2UuYmluZCh0aGlzKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy5wbGF5ZXJTZXR1cC5iaW5kKHRoaXMpKTtcclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLm9uY2xpY2suYmluZCh0aGlzKSk7XHJcblxyXG5cdFx0bGV0IHNob3cgPSAoKSA9PiB0aGlzLnNob3coKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2ludmVzdGlnYXRlJywgc2hvdyk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdwb2xpY3lBbmltRG9uZScsIHNob3cpO1xyXG5cdH1cclxuXHJcblx0b25jbGljayhldnQpXHJcblx0e1xyXG5cdFx0aWYoU0guZ2FtZS50dXJuT3JkZXIuaW5jbHVkZXMoU0gubG9jYWxVc2VyLmlkKSlcclxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2NvbnRpbnVlJyk7XHJcblx0fVxyXG5cclxuXHRvbnN0YXRlY2hhbmdlKHtkYXRhOiB7Z2FtZX19KVxyXG5cdHtcclxuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdsYW1lRHVjaycgfHwgKGdhbWUuc3RhdGUgPT09ICdwZWVrJyAmJiBnYW1lLnByZXNpZGVudCA9PT0gU0gubG9jYWxVc2VyLmlkKSl7XHJcblx0XHRcdHRoaXMuc2hvdygpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcclxuXHRcdFx0dGhpcy5wbGF5ZXJTZXR1cCh7ZGF0YToge2dhbWV9fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdkb25lJyl7XHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuc2hvdygnTmV3IGdhbWUnKTtcclxuXHRcdFx0fSwgODAwMCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0dGhpcy5oaWRlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwbGF5ZXJTZXR1cCh7ZGF0YToge2dhbWV9fSlcclxuXHR7XHJcblx0XHRpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcclxuXHRcdFx0dGhpcy50ZXh0LnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRsZXQgcGxheWVyQ291bnQgPSBnYW1lLnR1cm5PcmRlci5sZW5ndGg7XHJcblx0XHRcdGlmKHBsYXllckNvdW50ID49IDUpe1xyXG5cdFx0XHRcdHRoaXMuaWNvbi52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OlxyXG5cdFx0XHRcdFx0YCgke3BsYXllckNvdW50fS81KSBDbGljayB3aGVuIHJlYWR5YFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuaWNvbi52aXNpYmxlID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDpcclxuXHRcdFx0XHRcdGAoJHtwbGF5ZXJDb3VudH0vNSkgTmVlZCBtb3JlIHBsYXllcnNgXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHNob3cobWVzc2FnZSA9ICdDbGljayB0byBjb250aW51ZScpe1xyXG5cdFx0dGhpcy5pY29uLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0dGhpcy50ZXh0LnZpc2libGUgPSB0cnVlO1xyXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDogbWVzc2FnZX0pO1xyXG5cdH1cclxuXHJcblx0aGlkZSgpe1xyXG5cdFx0dGhpcy5pY29uLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMudGV4dC52aXNpYmxlID0gZmFsc2U7XHJcblx0fVxyXG59OyIsImltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XHJcblxyXG5jb25zdCBwb3NpdGlvbnMgPSBbXHJcblx0bmV3IFRIUkVFLlZlY3RvcjMoMC4zNjgsIC4wMTUsIC0uNzE3KSxcclxuXHRuZXcgVEhSRUUuVmVjdG9yMygwLjEzNSwgLjAzMCwgLS43MTcpLFxyXG5cdG5ldyBUSFJFRS5WZWN0b3IzKC0uMDk2LCAuMDQ1LCAtLjcxNyksXHJcblx0bmV3IFRIUkVFLlZlY3RvcjMoLS4zMjksIC4wNjAsIC0uNzE3KVxyXG5dO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRWxlY3Rpb25UcmFja2VyIGV4dGVuZHMgVEhSRUUuTWVzaFxyXG57XHJcblx0Y29uc3RydWN0b3IoKVxyXG5cdHtcclxuXHRcdHN1cGVyKFxyXG5cdFx0XHRuZXcgVEhSRUUuQ3lsaW5kZXJCdWZmZXJHZW9tZXRyeSguMDQsIC4wNCwgLjAzLCAxNiksXHJcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4MTkxOWZmfSlcclxuXHRcdCk7XHJcblx0XHR0aGlzLnBvc2l0aW9uLmNvcHkocG9zaXRpb25zWzBdKTtcclxuXHRcdFNILnRhYmxlLmFkZCh0aGlzKTtcclxuXHRcdFxyXG5cdFx0Ly8gZmFpbHMlMyA9PSAwIG9yIDM/XHJcblx0XHR0aGlzLmhpZ2hTaWRlID0gZmFsc2U7XHJcblx0XHR0aGlzLnNwb3QgPSAwO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9mYWlsZWRWb3RlcycsIHRoaXMudXBkYXRlRmFpbGVkVm90ZXMuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVGYWlsZWRWb3Rlcyh7ZGF0YToge2dhbWU6IHtmYWlsZWRWb3Rlc319fSA9IHtkYXRhOiB7Z2FtZToge2ZhaWxlZFZvdGVzOiAtMX19fSlcclxuXHR7XHJcblx0XHRpZihmYWlsZWRWb3RlcyA9PT0gLTEpXHJcblx0XHRcdGZhaWxlZFZvdGVzID0gdGhpcy5zcG90O1xyXG5cclxuXHRcdHRoaXMuaGlnaFNpZGUgPSBmYWlsZWRWb3RlcyA+IDA7XHJcblx0XHR0aGlzLnNwb3QgPSBmYWlsZWRWb3RlcyUzIHx8IHRoaXMuaGlnaFNpZGUgJiYgMyB8fCAwO1xyXG5cclxuXHRcdHRoaXMuYW5pbSA9IEFuaW1hdGUuc2ltcGxlKHRoaXMsIHtcclxuXHRcdFx0cG9zOiBwb3NpdGlvbnNbdGhpcy5zcG90XSxcclxuXHRcdFx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDEsIDErdGhpcy5zcG90LCAxKSxcclxuXHRcdFx0ZHVyYXRpb246IDEyMDBcclxuXHRcdH0pO1xyXG5cdH1cclxufSIsImltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7Q3JlZGl0c0NhcmR9IGZyb20gJy4vY2FyZCc7XHJcbmltcG9ydCB7UGxhY2Vob2xkZXJNZXNoLCBOQmlsbGJvYXJkLCBOVGV4dH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcclxuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcclxuaW1wb3J0IHt0cmFuc2xhdGUgYXMgdHJ9IGZyb20gJy4vdGhlbWUnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUHJlc2VudGF0aW9uIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0U0guYWRkKHRoaXMpO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBpZGxlIGRpc3BsYXlcclxuXHRcdHRoaXMuY3JlZGl0cyA9IG5ldyBDcmVkaXRzQ2FyZCgpO1xyXG5cdFx0dGhpcy5jcmVkaXRzLnBvc2l0aW9uLnNldCgwLCAxLjg1LCAwKTtcclxuXHRcdEFuaW1hdGUuc3Bpbih0aGlzLmNyZWRpdHMsIDMwMDAwKTtcclxuXHRcdHRoaXMuYWRkKHRoaXMuY3JlZGl0cyk7XHJcblx0XHRcclxuXHRcdC8vIGNyZWF0ZSB2aWN0b3J5IGJhbm5lclxyXG5cdFx0dGhpcy5iYW5uZXIgPSBQbGFjZWhvbGRlck1lc2guY2xvbmUoKTtcclxuXHRcdHRoaXMuYmFubmVyLnRleHQgPSBuZXcgTlRleHQodGhpcy5iYW5uZXIpO1xyXG5cdFx0dGhpcy5iYW5uZXIudGV4dC51cGRhdGUoe2ZvbnRTaXplOiAyfSk7XHJcblx0XHR0aGlzLmJhbm5lci5iaWxsYm9hcmQgPSBuZXcgTkJpbGxib2FyZCh0aGlzLmJhbm5lcik7XHJcblx0XHR0aGlzLmJhbm5lci5ib2IgPSBudWxsO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5iYW5uZXIpO1xyXG5cclxuXHRcdC8vIHVwZGF0ZSBzdHVmZlxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgdGhpcy51cGRhdGVPblN0YXRlLmJpbmQodGhpcykpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlT25TdGF0ZSh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcclxuXHR7XHJcblx0XHR0aGlzLmJhbm5lci52aXNpYmxlID0gZmFsc2U7XHJcblx0XHRpZih0aGlzLmJhbm5lci5ib2Ipe1xyXG5cdFx0XHR0aGlzLmJhbm5lci5ib2Iuc3RvcCgpO1xyXG5cdFx0XHR0aGlzLmJhbm5lci5ib2IgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xyXG5cdFx0XHR0aGlzLmNyZWRpdHMudmlzaWJsZSA9IHRydWU7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdkb25lJylcclxuXHRcdHtcclxuXHRcdFx0aWYoL15saWJlcmFsLy50ZXN0KGdhbWUudmljdG9yeSkpe1xyXG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQuY29sb3IgPSAnIzE5MTlmZic7XHJcblx0XHRcdFx0dGhpcy5iYW5uZXIudGV4dC51cGRhdGUoe3RleHQ6ICdMaWJlcmFscyB3aW4hJ30pO1xyXG5cdFx0XHRcdFNILmF1ZGlvLmxpYmVyYWxGYW5mYXJlLnBsYXkoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHR0aGlzLmJhbm5lci50ZXh0LmNvbG9yID0gJ3JlZCc7XHJcblx0XHRcdFx0dGhpcy5iYW5uZXIudGV4dC51cGRhdGUoe3RleHQ6ICdGYXNjaXN0cyB3aW4hJ30pO1xyXG5cdFx0XHRcdFNILmF1ZGlvLmZhc2Npc3RGYW5mYXJlLnBsYXkoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0dGhpcy5iYW5uZXIucG9zaXRpb24uc2V0KDAsMC44LDApO1xyXG5cdFx0XHR0aGlzLmJhbm5lci5zY2FsZS5zZXRTY2FsYXIoLjAwMSk7XHJcblx0XHRcdHRoaXMuYmFubmVyLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRBbmltYXRlLnNpbXBsZSh0aGlzLmJhbm5lciwge1xyXG5cdFx0XHRcdHBvczogbmV3IFRIUkVFLlZlY3RvcjMoMCwgMS44LCAwKSxcclxuXHRcdFx0XHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMSwxLDEpLFxyXG5cdFx0XHRcdGR1cmF0aW9uOiAxMDAwXHJcblx0XHRcdH0pXHJcblx0XHRcdC50aGVuKCgpID0+IHRoaXMuYmFubmVyLmJvYiA9IEFuaW1hdGUuYm9iKHRoaXMuYmFubmVyKSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdwb2xpY3kxJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcyA+PSAzKVxyXG5cdFx0e1xyXG5cdFx0XHRsZXQgY2hhbmNlbGxvciA9IHBsYXllcnNbZ2FtZS5jaGFuY2VsbG9yXS5kaXNwbGF5TmFtZTtcclxuXHRcdFx0dGhpcy5iYW5uZXIudGV4dC5jb2xvciA9ICd3aGl0ZSc7XHJcblx0XHRcdHRoaXMuYmFubmVyLnRleHQudXBkYXRlKHt0ZXh0OiBgJHtjaGFuY2VsbG9yfSBpcyBub3QgJHt0cignSGl0bGVyJyl9IWB9KTtcclxuXHJcblx0XHRcdHRoaXMuYmFubmVyLnBvc2l0aW9uLnNldCgwLDAuOCwwKTtcclxuXHRcdFx0dGhpcy5iYW5uZXIuc2NhbGUuc2V0U2NhbGFyKC4wMDEpO1xyXG5cdFx0XHR0aGlzLmJhbm5lci52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0QW5pbWF0ZS5zaW1wbGUodGhpcy5iYW5uZXIsIHtcclxuXHRcdFx0XHRwb3M6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEuOCwgMCksXHJcblx0XHRcdFx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDEsMSwxKVxyXG5cdFx0XHR9KVxyXG5cdFx0XHQudGhlbigoKSA9PiB0aGlzLmJhbm5lci5ib2IgPSBBbmltYXRlLmJvYih0aGlzLmJhbm5lcikpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fVxyXG59IiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IHthY3RpdmVUaGVtZSBhcyB0aGVtZX0gZnJvbSAnLi90aGVtZSc7XHJcblxyXG5jbGFzcyBBdWRpb1N0cmVhbVxyXG57XHJcblx0Y29uc3RydWN0b3IoY29udGV4dCwgYnVmZmVyLCBvdXRwdXQpe1xyXG5cdFx0dGhpcy5zb3VyY2UgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xyXG5cdFx0dGhpcy5zb3VyY2UuYnVmZmVyID0gYnVmZmVyO1xyXG5cdFx0dGhpcy5zb3VyY2UuY29ubmVjdChvdXRwdXQpO1xyXG5cdFx0dGhpcy5maW5pc2hlZFBsYXlpbmcgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblx0XHRcdHRoaXMuX3Jlc29sdmUgPSByZXNvbHZlO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwbGF5KCl7XHJcblx0XHR0aGlzLnNvdXJjZS5zdGFydCgwLCAwKTtcclxuXHRcdHNldFRpbWVvdXQodGhpcy5fcmVzb2x2ZSwgTWF0aC5jZWlsKHRoaXMuc291cmNlLmJ1ZmZlci5kdXJhdGlvbioxMDAwICsgNDAwKSk7XHJcblx0fVxyXG5cclxuXHRzdG9wKCl7XHJcblx0XHR0aGlzLnNvdXJjZS5zdG9wKCk7XHJcblx0fVxyXG59XHJcblxyXG5sZXQgcXVldWVkU3RyZWFtcyA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cclxuY2xhc3MgQXVkaW9DbGlwXHJcbntcclxuXHRjb25zdHJ1Y3Rvcihjb250ZXh0LCB1cmwsIHZvbHVtZSwgcXVldWVkID0gdHJ1ZSlcclxuXHR7XHJcblx0XHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xyXG5cdFx0dGhpcy5vdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcclxuXHRcdHRoaXMub3V0cHV0LmdhaW4udmFsdWUgPSB2b2x1bWU7XHJcblx0XHR0aGlzLm91dHB1dC5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pO1xyXG5cclxuXHRcdHRoaXMubG9hZGVkID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG5cdFx0XHRsZXQgbG9hZGVyID0gbmV3IFRIUkVFLkZpbGVMb2FkZXIoKTtcclxuXHRcdFx0bG9hZGVyLnNldFJlc3BvbnNlVHlwZSgnYXJyYXlidWZmZXInKTtcclxuXHRcdFx0bG9hZGVyLmxvYWQodXJsLCBidWZmZXIgPT4ge1xyXG5cdFx0XHRcdGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGJ1ZmZlciwgZGVjb2RlZEJ1ZmZlciA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmJ1ZmZlciA9IGRlY29kZWRCdWZmZXI7XHJcblx0XHRcdFx0XHRyZXNvbHZlKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSlcclxuXHR9XHJcblxyXG5cdHBsYXkocXVldWVkID0gZmFsc2UpXHJcblx0e1xyXG5cdFx0cmV0dXJuIHRoaXMubG9hZGVkLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRsZXQgaW5zdGFuY2UgPSBuZXcgQXVkaW9TdHJlYW0odGhpcy5jb250ZXh0LCB0aGlzLmJ1ZmZlciwgdGhpcy5vdXRwdXQpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYocXVldWVkKXtcclxuXHRcdFx0XHRxdWV1ZWRTdHJlYW1zID0gcXVldWVkU3RyZWFtcy50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRcdGluc3RhbmNlLnBsYXkoKTtcclxuXHRcdFx0XHRcdHJldHVybiBpbnN0YW5jZS5maW5pc2hlZFBsYXlpbmc7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0cmV0dXJuIHF1ZXVlZFN0cmVhbXM7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0aW5zdGFuY2UucGxheSgpO1xyXG5cdFx0XHRcdHJldHVybiBpbnN0YW5jZS5maW5pc2hlZFBsYXlpbmc7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgRmFrZUF1ZGlvQ2xpcFxyXG57XHJcblx0Y29uc3RydWN0b3IoKXsgdGhpcy5mYWtlc3RyZWFtID0gbmV3IEZha2VBdWRpb1N0cmVhbSgpOyB9XHJcblx0cGxheSgpeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7IH1cclxufVxyXG5cclxuY2xhc3MgRmFrZUF1ZGlvU3RyZWFtXHJcbntcclxuXHRjb25zdHJ1Y3RvcigpeyB0aGlzLmZpbmlzaGVkUGxheWluZyA9IFByb21pc2UucmVzb2x2ZSgpOyB9XHJcblx0cGxheSgpeyB9XHJcblx0c3RvcCgpeyB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEF1ZGlvQ29udHJvbGxlclxyXG57XHJcblx0Y29uc3RydWN0b3IoKVxyXG5cdHtcclxuXHRcdGxldCBjb250ZXh0ID0gdGhpcy5jb250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xyXG5cdFx0dGhpcy5saWJlcmFsU3RpbmcgPSBuZXcgQXVkaW9DbGlwKHRoaXMuY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vaGl0bGVyL2xpYmVyYWwtc3Rpbmcub2dnYCwgMC4yKTtcclxuXHRcdHRoaXMubGliZXJhbEZhbmZhcmUgPSBuZXcgQXVkaW9DbGlwKHRoaXMuY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vaGl0bGVyL2xpYmVyYWwtZmFuZmFyZS5vZ2dgLCAwLjIpO1xyXG5cdFx0dGhpcy5mYXNjaXN0U3RpbmcgPSBuZXcgQXVkaW9DbGlwKHRoaXMuY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vaGl0bGVyL2Zhc2Npc3Qtc3Rpbmcub2dnYCwgMC4xKTtcclxuXHRcdHRoaXMuZmFzY2lzdEZhbmZhcmUgPSBuZXcgQXVkaW9DbGlwKHRoaXMuY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vaGl0bGVyL2Zhc2Npc3QtZmFuZmFyZS5vZ2dgLCAwLjEpO1xyXG5cclxuXHRcdGxldCBmYWtlID0gbmV3IEZha2VBdWRpb0NsaXAoKTtcclxuXHRcdHRoaXMudHV0b3JpYWwgPSB7bG9hZFN0YXJ0ZWQ6IGZhbHNlfTtcclxuXHRcdFsnd2VsY29tZScsJ25pZ2h0Jywnbm9taW5hdGlvbicsJ3ZvdGluZycsJ3ZvdGVGYWlscycsJ3ZvdGVQYXNzZXMnLCdwb2xpY3kxJywncG9saWN5MicsJ3BvbGljeUZhc2Npc3QnLFxyXG5cdFx0J3BvbGljeUxpYmVyYWwnLCdwb2xpY3lBZnRlcm1hdGgnLCd3cmFwdXAnLCdwb3dlcjEnLCdwb3dlcjInLCdpbnZlc3RpZ2F0ZScsJ3BlZWsnLCduYW1lU3VjY2Vzc29yJywnZXhlY3V0ZScsXHJcblx0XHQndmV0bycsJ3JlZHpvbmUnXS5mb3JFYWNoKHggPT4gdGhpcy50dXRvcmlhbFt4XSA9IGZha2UpO1xyXG5cdH1cclxuXHJcblx0bG9hZFR1dG9yaWFsKGdhbWUpXHJcblx0e1xyXG5cdFx0aWYoIWdhbWUudHV0b3JpYWwgfHwgdGhpcy50dXRvcmlhbC5sb2FkU3RhcnRlZCkgcmV0dXJuO1xyXG5cclxuXHRcdGxldCByZWFkZXIgPSBnYW1lLnR1dG9yaWFsLCBjb250ZXh0ID0gdGhpcy5jb250ZXh0LCB2b2x1bWUgPSAwLjU7XHJcblxyXG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLnR1dG9yaWFsLCB7XHJcblx0XHRcdGxvYWRTdGFydGVkOiB0cnVlLFxyXG5cdFx0XHR3ZWxjb21lOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC93ZWxjb21lLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdG5pZ2h0OiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9uaWdodC5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRub21pbmF0aW9uOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9ub21pbmF0aW9uLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHZvdGluZzogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvdm90aW5nLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHZvdGVGYWlsczogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvdm90ZS1mYWlscy5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHR2b3RlUGFzc2VzOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC92b3RlLXBhc3NlZC5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRwb2xpY3kxOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb2xpY3kxLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBvbGljeTI6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3BvbGljeTIub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cG9saWN5RmFzY2lzdDogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG9saWN5LWZhc2Npc3Qub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cG9saWN5TGliZXJhbDogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG9saWN5LWxpYmVyYWwub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cG9saWN5QWZ0ZXJtYXRoOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb2xpY3ktYWZ0ZXJtYXRoLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHdyYXB1cDogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvd3JhcHVwLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBvd2VyMTogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXIxLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBvd2VyMjogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXIyLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdGludmVzdGlnYXRlOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlci1pbnZlc3RpZ2F0ZS5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRwZWVrOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlci1wZWVrLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdG5hbWVTdWNjZXNzb3I6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyLW5hbWVzdWNjZXNzb3Iub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0ZXhlY3V0ZTogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXItZXhlY3V0ZS5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHR2ZXRvOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlci12ZXRvLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHJlZHpvbmU6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3JlZHpvbmUub2dnYCwgdm9sdW1lKVxyXG5cdFx0fSk7XHJcblx0fVxyXG59IiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFR1dG9yaWFsTWFuYWdlclxyXG57XHJcblx0Y29uc3RydWN0b3IoKVxyXG5cdHtcclxuXHRcdHRoaXMuZW5hYmxlZCA9IGZhbHNlO1xyXG5cdFx0dGhpcy5sYXN0RXZlbnQgPSBudWxsO1xyXG5cdFx0dGhpcy5wbGF5ZWQgPSBbXTtcclxuXHR9XHJcblxyXG5cdGRldGVjdEV2ZW50KGdhbWUsIHZvdGVzKVxyXG5cdHtcclxuXHRcdGxldCBsYXN0RWxlY3Rpb24gPSB2b3Rlc1tnYW1lLmxhc3RFbGVjdGlvbl07XHJcblx0XHRsZXQgZmlyc3RSb3VuZCA9IGdhbWUuZmFzY2lzdFBvbGljaWVzICsgZ2FtZS5saWJlcmFsUG9saWNpZXMgPT09IDA7XHJcblxyXG5cdFx0aWYoZmlyc3RSb3VuZCAmJiBnYW1lLnN0YXRlID09PSAnbmlnaHQnKVxyXG5cdFx0XHRyZXR1cm4gJ25pZ2h0JztcclxuXHRcdGVsc2UgaWYoZmlyc3RSb3VuZCAmJiBnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnKVxyXG5cdFx0XHRyZXR1cm4gJ25vbWluYXRpb24nO1xyXG5cdFx0ZWxzZSBpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICdlbGVjdGlvbicpXHJcblx0XHRcdHJldHVybiAndm90aW5nJztcclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyAmJiBsYXN0RWxlY3Rpb24ueWVzVm90ZXJzLmxlbmd0aCA8IGxhc3RFbGVjdGlvbi50b1Bhc3MgJiYgIXRoaXMucGxheWVkLmluY2x1ZGVzKCd2b3RlRmFpbHMnKSl7XHJcblx0XHRcdHRoaXMucGxheWVkLnB1c2goJ3ZvdGVGYWlscycpO1xyXG5cdFx0XHRyZXR1cm4gJ3ZvdGVGYWlscyc7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdsYW1lRHVjaycgJiYgbGFzdEVsZWN0aW9uLnllc1ZvdGVycy5sZW5ndGggPj0gbGFzdEVsZWN0aW9uLnRvUGFzcyAmJiAhdGhpcy5wbGF5ZWQuaW5jbHVkZXMoJ3ZvdGVQYXNzZXMnKSl7XHJcblx0XHRcdHRoaXMucGxheWVkLnB1c2goJ3ZvdGVQYXNzZXMnKTtcclxuXHRcdFx0cmV0dXJuICd2b3RlUGFzc2VzJztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZmlyc3RSb3VuZCAmJiBnYW1lLnN0YXRlID09PSAncG9saWN5MScpXHJcblx0XHRcdHJldHVybiAncG9saWN5MSc7XHJcblx0XHRlbHNlIGlmKGZpcnN0Um91bmQgJiYgZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTInKVxyXG5cdFx0XHRyZXR1cm4gJ3BvbGljeTInO1xyXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnYWZ0ZXJtYXRoJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcyA9PT0gMSAmJiBnYW1lLmhhbmQgPT09IDIpXHJcblx0XHRcdHJldHVybiAncG9saWN5RmFzY2lzdCc7XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnICYmIGdhbWUubGliZXJhbFBvbGljaWVzID09PSAxICYmIGdhbWUuaGFuZCA9PT0gMylcclxuXHRcdFx0cmV0dXJuICdwb2xpY3lMaWJlcmFsJztcclxuXHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScgJiYgZ2FtZS5mYXNjaXN0UG9saWNpZXMrZ2FtZS5saWJlcmFsUG9saWNpZXMgPT09IDEpXHJcblx0XHRcdHJldHVybiAnd3JhcHVwJztcclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcyA9PT0gMylcclxuXHRcdFx0cmV0dXJuICdyZWR6b25lJztcclxuXHJcblx0XHRlbHNlIGlmKFsnaW52ZXN0aWdhdGUnLCdwZWVrJywnbmFtZVN1Y2Nlc3NvcicsJ2V4ZWN1dGUnXS5pbmNsdWRlcyhnYW1lLnN0YXRlKSlcclxuXHRcdHtcclxuXHRcdFx0aWYodGhpcy5wbGF5ZWQuaW5jbHVkZXMoZ2FtZS5zdGF0ZSkpXHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblxyXG5cdFx0XHRsZXQgc3RhdGU7XHJcblx0XHRcdGlmKGdhbWUuZmFzY2lzdFBvbGljaWVzID09PSA1KVxyXG5cdFx0XHRcdHN0YXRlID0gJ3ZldG8nO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0c3RhdGUgPSBnYW1lLnN0YXRlO1xyXG5cdFx0XHR0aGlzLnBsYXllZC5wdXNoKHN0YXRlKTtcclxuXHJcblx0XHRcdGlmKCF0aGlzLnBsYXllZC5pbmNsdWRlcygncG93ZXInKSl7XHJcblx0XHRcdFx0c3RhdGUgPSAnZmlyc3RfJytzdGF0ZTtcclxuXHRcdFx0XHR0aGlzLnBsYXllZC5wdXNoKCdwb3dlcicpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gc3RhdGU7XHJcblx0XHR9XHJcblx0XHRlbHNlIHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0c3RhdGVVcGRhdGUoZ2FtZSwgdm90ZXMpXHJcblx0e1xyXG5cdFx0aWYoIWdhbWUudHV0b3JpYWwgfHwgZ2FtZS50dXJuT3JkZXIuaW5jbHVkZXMoJzExMTExMTEnKSAmJiBTSC5sb2NhbFVzZXIuaWQgIT09ICcxMTExMTExJylcclxuXHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdGxldCBzZWFtbGVzcyA9IHtcclxuXHRcdFx0cG9saWN5RmFzY2lzdDogWydwb2xpY3lGYXNjaXN0JywncG9saWN5QWZ0ZXJtYXRoJ10sXHJcblx0XHRcdHBvbGljeUxpYmVyYWw6IFsncG9saWN5TGliZXJhbCcsJ3BvbGljeUFmdGVybWF0aCddLFxyXG5cdFx0XHRmaXJzdF9pbnZlc3RpZ2F0ZTogWydwb3dlcjEnLCdwb3dlcjInLCdpbnZlc3RpZ2F0ZSddLFxyXG5cdFx0XHRmaXJzdF9wZWVrOiBbJ3Bvd2VyMScsJ3Bvd2VyMicsJ3BlZWsnXSxcclxuXHRcdFx0Zmlyc3RfbmFtZVN1Y2Nlc3NvcjogWydwb3dlcjEnLCdwb3dlcjInLCduYW1lU3VjY2Vzc29yJ10sXHJcblx0XHRcdGZpcnN0X2V4ZWN1dGU6IFsncG93ZXIxJywncG93ZXIyJywnZXhlY3V0ZSddLFxyXG5cdFx0XHRmaXJzdF92ZXRvOiBbJ3Bvd2VyMScsJ3Bvd2VyMicsJ3ZldG8nXSxcclxuXHRcdFx0aW52ZXN0aWdhdGU6IFsncG93ZXIxJywnaW52ZXN0aWdhdGUnXSxcclxuXHRcdFx0cGVlazogWydwb3dlcjEnLCdwZWVrJ10sXHJcblx0XHRcdG5hbWVTdWNjZXNzb3I6IFsncG93ZXIxJywnbmFtZVN1Y2Nlc3NvciddLFxyXG5cdFx0XHRleGVjdXRlOiBbJ3Bvd2VyMScsJ2V4ZWN1dGUnXSxcclxuXHRcdFx0dmV0bzogWydwb3dlcjEnLCd2ZXRvJ10sXHJcblx0XHRcdG5pZ2h0OiBbJ3dlbGNvbWUnLCduaWdodCddXHJcblx0XHR9O1xyXG5cdFx0bGV0IGRlbGF5ZWQgPSB7XHJcblx0XHRcdHBvbGljeUZhc2Npc3Q6ICdwb2xpY3lBbmltRG9uZScsXHJcblx0XHRcdHBvbGljeUxpYmVyYWw6ICdwb2xpY3lBbmltRG9uZSdcclxuXHRcdH07XHJcblxyXG5cdFx0bGV0IGV2ZW50ID0gdGhpcy5sYXN0RXZlbnQgPSB0aGlzLmRldGVjdEV2ZW50KGdhbWUsIHZvdGVzKTtcclxuXHRcdGNvbnNvbGUubG9nKCd0dXRvcmlhbCBldmVudDonLCBldmVudCk7XHJcblxyXG5cdFx0bGV0IHdhaXQgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdGlmKGRlbGF5ZWRbZXZlbnRdKXtcclxuXHRcdFx0d2FpdCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0XHRsZXQgaGFuZGxlciA9ICgpID0+IHtcclxuXHRcdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoZGVsYXllZFtldmVudF0sIGhhbmRsZXIpO1xyXG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcihkZWxheWVkW2V2ZW50XSwgaGFuZGxlcik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHNlYW1sZXNzW2V2ZW50XSlcclxuXHRcdHtcclxuXHRcdFx0bGV0IHN1YmV2ZW50ID0gL15maXJzdF8vLnRlc3QoZXZlbnQpID8gZXZlbnQuc2xpY2UoNikgOiBldmVudDtcclxuXHRcdFx0d2FpdC50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRzZWFtbGVzc1tzdWJldmVudF0uZm9yRWFjaChjbGlwID0+IFNILmF1ZGlvLnR1dG9yaWFsW2NsaXBdLnBsYXkodHJ1ZSkpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZXZlbnQgIT09IG51bGwpXHJcblx0XHR7XHJcblx0XHRcdHdhaXQudGhlbigoKSA9PiBTSC5hdWRpby50dXRvcmlhbFtldmVudF0ucGxheSh0cnVlKSk7XHJcblx0XHR9XHJcblx0fVxyXG59IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0ICcuL3BvbHlmaWxsJztcclxuXHJcbmltcG9ydCB7YWN0aXZlVGhlbWUgYXMgdGhlbWV9IGZyb20gJy4vdGhlbWUnO1xyXG5cclxuaW1wb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH0gZnJvbSAnLi9oYXRzJztcclxuaW1wb3J0IEdhbWVUYWJsZSBmcm9tICcuL3RhYmxlJztcclxuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XHJcbmltcG9ydCB7IGdldEdhbWVJZCwgbWVyZ2VPYmplY3RzIH0gZnJvbSAnLi91dGlscyc7XHJcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnO1xyXG5pbXBvcnQgU2VhdCBmcm9tICcuL3NlYXQnO1xyXG5pbXBvcnQgUGxheWVyTWV0ZXIgZnJvbSAnLi9wbGF5ZXJtZXRlcic7XHJcbmltcG9ydCBDb250aW51ZUJveCBmcm9tICcuL2NvbnRpbnVlYm94JztcclxuaW1wb3J0IEVsZWN0aW9uVHJhY2tlciBmcm9tICcuL2VsZWN0aW9udHJhY2tlcic7XHJcbmltcG9ydCBQcmVzZW50YXRpb24gZnJvbSAnLi9wcmVzZW50YXRpb24nO1xyXG5pbXBvcnQgQXVkaW9Db250cm9sbGVyIGZyb20gJy4vYXVkaW9jb250cm9sbGVyJztcclxuaW1wb3J0IFR1dG9yaWFsIGZyb20gJy4vdHV0b3JpYWwnO1xyXG5cclxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5hc3NldHMgPSBBc3NldE1hbmFnZXIubWFuaWZlc3Q7XHJcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcclxuXHRcdHRoaXMubmVlZHNTa2VsZXRvbiA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIHBvbHlmaWxsIGdldFVzZXIgZnVuY3Rpb25cclxuXHRcdGlmKCFhbHRzcGFjZS5pbkNsaWVudCl7XHJcblx0XHRcdGFsdHNwYWNlLmdldFVzZXIgPSAoKSA9PiB7XHJcblx0XHRcdFx0bGV0IGlkLCByZSA9IC9bPyZddXNlcklkPShcXGQrKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcclxuXHRcdFx0XHRpZihyZSlcclxuXHRcdFx0XHRcdGlkID0gcmVbMV07XHJcblx0XHRcdFx0ZWxzZVxyXG5cdFx0XHRcdFx0aWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCkudG9TdHJpbmcoKTtcclxuXHJcblx0XHRcdFx0YWx0c3BhY2UuX2xvY2FsVXNlciA9IHtcclxuXHRcdFx0XHRcdHVzZXJJZDogaWQsXHJcblx0XHRcdFx0XHRkaXNwbGF5TmFtZTogaWQsXHJcblx0XHRcdFx0XHRpc01vZGVyYXRvcjogL2lzTW9kZXJhdG9yLy50ZXN0KHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnTWFzcXVlcmFkaW5nIGFzJywgYWx0c3BhY2UuX2xvY2FsVXNlcik7XHJcblx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShhbHRzcGFjZS5fbG9jYWxVc2VyKTtcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBnZXQgbG9jYWwgdXNlclxyXG5cdFx0dGhpcy5fdXNlclByb21pc2UgPSBhbHRzcGFjZS5nZXRVc2VyKCk7XHJcblx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKHVzZXIgPT4ge1xyXG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcclxuXHRcdFx0XHRpZDogdXNlci51c2VySWQsXHJcblx0XHRcdFx0ZGlzcGxheU5hbWU6IHVzZXIuZGlzcGxheU5hbWUsXHJcblx0XHRcdFx0aXNNb2RlcmF0b3I6IHVzZXIuaXNNb2RlcmF0b3JcclxuXHRcdFx0fTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuZ2FtZSA9IHt9O1xyXG5cdFx0dGhpcy5wbGF5ZXJzID0ge307XHJcblx0XHR0aGlzLnZvdGVzID0ge307XHJcblx0fVxyXG5cclxuXHRpbml0aWFsaXplKGVudiwgcm9vdCwgYXNzZXRzKVxyXG5cdHtcclxuXHRcdGlmKCF0aGlzLmxvY2FsVXNlcil7XHJcblx0XHRcdHRoaXMuX3VzZXJQcm9taXNlLnRoZW4oKCkgPT4gdGhpcy5pbml0aWFsaXplKGVudiwgcm9vdCwgYXNzZXRzKSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBzaGFyZSB0aGUgZGlvcmFtYSBpbmZvXHJcblx0XHRBc3NldE1hbmFnZXIuY2FjaGUgPSBhc3NldHM7XHJcblx0XHRBc3NldE1hbmFnZXIuZml4TWF0ZXJpYWxzKCk7XHJcblx0XHR0aGlzLmVudiA9IGVudjtcclxuXHJcblx0XHQvLyBjb25uZWN0IHRvIHNlcnZlclxyXG5cdFx0dGhpcy5zb2NrZXQgPSBpby5jb25uZWN0KCcvJywge3F1ZXJ5OiBgZ2FtZUlkPSR7Z2V0R2FtZUlkKCl9JnRoZW1lPSR7dGhlbWV9YH0pO1xyXG5cclxuXHRcdC8vIHNwYXduIHNlbGYtc2VydmUgdHV0b3JpYWwgZGlhbG9nXHJcblx0XHRpZihhbHRzcGFjZS5pbkNsaWVudCl7XHJcblx0XHRcdGFsdHNwYWNlLm9wZW4od2luZG93LmxvY2F0aW9uLm9yaWdpbisnL3N0YXRpYy90dXRvcmlhbC5odG1sJywgJ19leHBlcmllbmNlJyxcclxuXHRcdFx0XHR7aGlkZGVuOiB0cnVlLCBpY29uOiB3aW5kb3cubG9jYXRpb24ub3JpZ2luKycvc3RhdGljL2ltZy9jYWVzYXIvaWNvbi5wbmcnfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5hdWRpbyA9IG5ldyBBdWRpb0NvbnRyb2xsZXIoKTtcclxuXHRcdHRoaXMudHV0b3JpYWwgPSBuZXcgVHV0b3JpYWwoKTtcclxuXHJcblx0XHQvLyBjcmVhdGUgdGhlIHRhYmxlXHJcblx0XHR0aGlzLnRhYmxlID0gbmV3IEdhbWVUYWJsZSgpO1xyXG5cdFx0dGhpcy5hZGQodGhpcy50YWJsZSk7XHJcblxyXG5cdFx0dGhpcy5yZXNldEJ1dHRvbiA9IG5ldyBUSFJFRS5NZXNoKFxyXG5cdFx0XHRuZXcgVEhSRUUuQm94R2VvbWV0cnkoLjI1LC4yNSwuMjUpLFxyXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogYXNzZXRzLnRleHR1cmVzLnJlc2V0fSlcclxuXHRcdCk7XHJcblx0XHR0aGlzLnJlc2V0QnV0dG9uLnBvc2l0aW9uLnNldCgxLjEzLCAtLjksIC43NSk7XHJcblx0XHR0aGlzLnJlc2V0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5zZW5kUmVzZXQuYmluZCh0aGlzKSk7XHJcblx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKCgpID0+IHtcclxuXHRcdFx0aWYodGhpcy5sb2NhbFVzZXIuaXNNb2RlcmF0b3IpXHJcblx0XHRcdFx0dGhpcy50YWJsZS5hZGQodGhpcy5yZXNldEJ1dHRvbik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLnJlZnJlc2hCdXR0b24gPSBuZXcgVEhSRUUuTWVzaChcclxuXHRcdFx0bmV3IFRIUkVFLkJveEdlb21ldHJ5KC4yNSwuMjUsLjI1KSxcclxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IGFzc2V0cy50ZXh0dXJlcy5yZWZyZXNofSlcclxuXHRcdCk7XHJcblx0XHR0aGlzLnJlZnJlc2hCdXR0b24ucG9zaXRpb24uc2V0KDEuMTMsIC0uMywgLjc1KTtcclxuXHRcdHRoaXMucmVmcmVzaEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsICgpID0+IHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKSk7XHJcblx0XHR0aGlzLnRhYmxlLmFkZCh0aGlzLnJlZnJlc2hCdXR0b24pO1xyXG5cclxuXHRcdHRoaXMucHJlc2VudGF0aW9uID0gbmV3IFByZXNlbnRhdGlvbigpO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBoYXRzXHJcblx0XHR0aGlzLnByZXNpZGVudEhhdCA9IG5ldyBQcmVzaWRlbnRIYXQoKTtcclxuXHRcdHRoaXMuY2hhbmNlbGxvckhhdCA9IG5ldyBDaGFuY2VsbG9ySGF0KCk7XHJcblxyXG5cdFx0Ly8gY3JlYXRlIHBvc2l0aW9uc1xyXG5cdFx0dGhpcy5zZWF0cyA9IFtdO1xyXG5cdFx0Zm9yKGxldCBpPTA7IGk8MTA7IGkrKyl7XHJcblx0XHRcdHRoaXMuc2VhdHMucHVzaCggbmV3IFNlYXQoaSkgKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnRhYmxlLmFkZCguLi50aGlzLnNlYXRzKTtcclxuXHJcblx0XHQvL3RoaXMucGxheWVyTWV0ZXIgPSBuZXcgUGxheWVyTWV0ZXIoKTtcclxuXHRcdC8vdGhpcy50YWJsZS5hZGQodGhpcy5wbGF5ZXJNZXRlcik7XHJcblx0XHR0aGlzLmNvbnRpbnVlQm94ID0gbmV3IENvbnRpbnVlQm94KHRoaXMudGFibGUpO1xyXG5cclxuXHRcdHRoaXMuZWxlY3Rpb25UcmFja2VyID0gbmV3IEVsZWN0aW9uVHJhY2tlcigpO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0Lm9uKCd1cGRhdGUnLCB0aGlzLnVwZGF0ZUZyb21TZXJ2ZXIuYmluZCh0aGlzKSk7XHJcblx0XHR0aGlzLnNvY2tldC5vbignY2hlY2tlZF9pbicsIHRoaXMuY2hlY2tlZEluLmJpbmQodGhpcykpO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0Lm9uKCdyZXNldCcsIHRoaXMuZG9SZXNldC5iaW5kKHRoaXMpKTtcclxuXHRcdC8vdGhpcy5zb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVGcm9tU2VydmVyKGdkLCBwZCwgdmQpXHJcblx0e1xyXG5cdFx0Y29uc29sZS5sb2coZ2QsIHBkLCB2ZCk7XHJcblxyXG5cdFx0bGV0IGdhbWUgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdhbWUsIGdkKTtcclxuXHRcdGxldCBwbGF5ZXJzID0gbWVyZ2VPYmplY3RzKHRoaXMucGxheWVycywgcGQgfHwge30pO1xyXG5cdFx0bGV0IHZvdGVzID0gbWVyZ2VPYmplY3RzKHRoaXMudm90ZXMsIHZkIHx8IHt9KTtcclxuXHJcblx0XHRpZihnZC50dXRvcmlhbClcclxuXHRcdFx0dGhpcy5hdWRpby5sb2FkVHV0b3JpYWwoZ2FtZSk7XHJcblxyXG5cdFx0aWYoZ2Quc3RhdGUpXHJcblx0XHRcdHRoaXMudHV0b3JpYWwuc3RhdGVVcGRhdGUoZ2FtZSwgdm90ZXMpO1xyXG5cclxuXHRcdGZvcihsZXQgZmllbGQgaW4gZ2QpXHJcblx0XHR7XHJcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7XHJcblx0XHRcdFx0dHlwZTogJ3VwZGF0ZV8nK2ZpZWxkLFxyXG5cdFx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxyXG5cdFx0XHRcdGRhdGE6IHtcclxuXHRcdFx0XHRcdGdhbWU6IGdhbWUsXHJcblx0XHRcdFx0XHRwbGF5ZXJzOiBwbGF5ZXJzLFxyXG5cdFx0XHRcdFx0dm90ZXM6IHZvdGVzXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKCgpID0+IHtcclxuXHRcdFx0aWYocGxheWVyc1t0aGlzLmxvY2FsVXNlci5pZF0gJiYgIXBsYXllcnNbdGhpcy5sb2NhbFVzZXIuaWRdLmNvbm5lY3RlZCl7XHJcblx0XHRcdFx0dGhpcy5zb2NrZXQuZW1pdCgnY2hlY2tfaW4nLCB0aGlzLmxvY2FsVXNlcik7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XHJcblx0XHR0aGlzLnBsYXllcnMgPSBwbGF5ZXJzO1xyXG5cdFx0dGhpcy52b3RlcyA9IHZvdGVzO1xyXG5cdH1cclxuXHJcblx0Y2hlY2tlZEluKHApXHJcblx0e1xyXG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLnBsYXllcnNbcC5pZF0sIHApO1xyXG5cdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHtcclxuXHRcdFx0dHlwZTogJ2NoZWNrZWRfaW4nLFxyXG5cdFx0XHRidWJibGVzOiBmYWxzZSxcclxuXHRcdFx0ZGF0YTogcC5pZFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRzZW5kUmVzZXQoZSl7XHJcblx0XHRpZih0aGlzLmxvY2FsVXNlci5pc01vZGVyYXRvcil7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdyZXF1ZXN0aW5nIHJlc2V0Jyk7XHJcblx0XHRcdHRoaXMuc29ja2V0LmVtaXQoJ3Jlc2V0Jyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRkb1Jlc2V0KGdhbWUsIHBsYXllcnMsIHZvdGVzKVxyXG5cdHtcclxuXHRcdHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQodHJ1ZSk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBuZXcgU2VjcmV0SGl0bGVyKCk7XHJcbiJdLCJuYW1lcyI6WyJsZXQiLCJjb25zdCIsInRoZW1lIiwidGhpcyIsInN1cGVyIiwiQU0iLCJBc3NldE1hbmFnZXIiLCJjYXJkIiwidHIiLCJCYWxsb3RUeXBlLkNPTkZJUk0iLCJ1cGRhdGVTdGF0ZSIsIkJhbGxvdFR5cGUuUExBWUVSU0VMRUNUIiwiQmFsbG90VHlwZS5QT0xJQ1kiLCJvcHRzIiwiY2xlYW5VcEZha2VWb3RlIiwiQlAudXBkYXRlVm90ZXNJblByb2dyZXNzIiwiQlAudXBkYXRlU3RhdGUiLCJCUEJBLnRvQXJyYXkiLCJCUEJBLkxJQkVSQUwiLCJwb3NpdGlvbnMiLCJhc3NldHMiLCJUdXRvcmlhbCJdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO0NBQzVCLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUU7RUFDbEQsS0FBSyxFQUFFLFNBQVMsSUFBSSxDQUFDO0dBQ3BCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztHQUMvQjtFQUNELFFBQVEsRUFBRSxLQUFLO0VBQ2YsVUFBVSxFQUFFLEtBQUs7RUFDakIsWUFBWSxFQUFFLEtBQUs7RUFDbkIsQ0FBQyxDQUFDO0NBQ0g7O0FDWERBLElBQUksV0FBVyxHQUFHLFFBQVEsQ0FBQztBQUMzQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztDQUMxQyxXQUFXLEdBQUcsUUFBUSxDQUFDO0NBQ3ZCOztBQUVEQyxJQUFNLE1BQU0sR0FBRztDQUNkLE1BQU0sRUFBRTtFQUNQLE1BQU0sRUFBRSxRQUFRO0VBQ2hCLFNBQVMsRUFBRSxXQUFXO0VBQ3RCLFVBQVUsRUFBRSxZQUFZO0VBQ3hCO0NBQ0QsTUFBTSxFQUFFO0VBQ1AsTUFBTSxFQUFFLFFBQVE7RUFDaEIsU0FBUyxFQUFFLFFBQVE7RUFDbkIsVUFBVSxFQUFFLFNBQVM7RUFDckI7Q0FDRCxDQUFBOztBQUVELFNBQVMsU0FBUyxDQUFDLE1BQU07QUFDekI7Q0FDQ0QsSUFBSSxHQUFHLEdBQUcsTUFBTSxD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QixHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU07RUFDbkIsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU07RUFDbkIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTTtFQUNuQixHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLO0VBQ25CLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxLQUFLO0VBQ25CLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUs7RUFDbkIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLOzs7O0VBSW5CLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBRXRGLENBQUM7O0NBRUZBLElBQUksT0FBTyxHQUFHOztFQUViLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMxQixDQUFDOzs7Q0FHRkEsSUFBSSxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUN2RUEsSUFBSSxJQUFJLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDNUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztDQUNwQixJQUFJLEdBQUcsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUN0RSxJQUFJ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QU0sR0FBRyxDQUFDLENBQUM7O0VBRTNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztFQUNwQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7RUFFckMsS0FBS0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFO0VBQzdCO0dBQ0MsS0FBS0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO0dBQzNCO0lBQ0NBLElBQUksTUFBTSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7O0lBR3RDLEtBQUssQ0FBQyxHQUFHLENBQUM7S0FDVCxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3JDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7SUFFWCxLQUFLLENBQUMsR0FBRyxDQUFDO0tBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3RDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7SUFFWEEsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQ0EsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQ0EsSUFBSSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2pFQSxJQUFJLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDakUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ1YsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkI7OztJQUdELEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFDVjtLQUNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2hELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2hEOztJQUVEO0tBQ0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDbEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0tBRWxELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xEO0lBQ0Q7OztHQUdEQSxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUM3Q0EsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDN0MsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ1YsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDckIsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDckI7O0dBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FDNUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FDNUM7O0VBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENB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
