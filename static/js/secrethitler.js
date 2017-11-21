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

		if(!this.seat.owner)
			{ return; }

		if(game.state === 'night' && players[SH.localUser.id] || game.state === 'done'){
			this.presentRole(game, players, votes);
		}

		else if(game.state === 'lameDuck')
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
			}, 4000);
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

		this.credits.visible = game.state === 'setup';

		if(game.state === 'done')
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
		else if(game.state === 'aftermath') {
			this.banner.visible = false;
			if(this.banner.bob){
				this.banner.bob.stop();
				this.banner.bob = null;
			}
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
		this$1.source.onended = resolve;
	});
};

AudioStream.prototype.play = function play (){
	this.source.start(0, 0);
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

	var reader = game.tutorial, context = this.context, volume = 0.3;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvcG9seWZpbGwuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RoZW1lLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hc3NldG1hbmFnZXIuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hdGl2ZWNvbXBvbmVudHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JlaGF2aW9yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hbmltYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jYXJkLmpzIiwiLi4vLi4vc3JjL2NsaWVudC90YWJsZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdXRpbHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hbWVwbGF0ZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmFsbG90cHJvY2Vzc29yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9icGJhLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3QuanMiLCIuLi8uLi9zcmMvY2xpZW50L3BsYXllcmluZm8uanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcHN1bGVnZW9tZXRyeS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvaGl0Ym94LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWF0LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jb250aW51ZWJveC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvZWxlY3Rpb250cmFja2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9wcmVzZW50YXRpb24uanMiLCIuLi8uLi9zcmMvY2xpZW50L2F1ZGlvY29udHJvbGxlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdHV0b3JpYWwuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlY3JldGhpdGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcblxyXG5pZighQXJyYXkucHJvdG90eXBlLmluY2x1ZGVzKXtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAnaW5jbHVkZXMnLCB7XHJcblx0XHR2YWx1ZTogZnVuY3Rpb24oaXRlbSl7XHJcblx0XHRcdHJldHVybiB0aGlzLmluZGV4T2YoaXRlbSkgPiAtMTtcclxuXHRcdH0sXHJcblx0XHR3cml0YWJsZTogZmFsc2UsXHJcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcclxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2VcclxuXHR9KTtcclxufVxyXG4iLCJsZXQgYWN0aXZlVGhlbWUgPSAnaGl0bGVyJztcclxuaWYoL2NhZXNhci8udGVzdCh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpKXtcclxuXHRhY3RpdmVUaGVtZSA9ICdjYWVzYXInO1xyXG59XHJcblxyXG5jb25zdCB0aGVtZXMgPSB7XHJcblx0aGl0bGVyOiB7XHJcblx0XHRoaXRsZXI6ICdoaXRsZXInLFxyXG5cdFx0cHJlc2lkZW50OiAncHJlc2lkZW50JyxcclxuXHRcdGNoYW5jZWxsb3I6ICdjaGFuY2VsbG9yJ1xyXG5cdH0sXHJcblx0Y2Flc2FyOiB7XHJcblx0XHRoaXRsZXI6ICdjYWVzYXInLFxyXG5cdFx0cHJlc2lkZW50OiAnY29uc3VsJyxcclxuXHRcdGNoYW5jZWxsb3I6ICdwcmFldG9yJ1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gdHJhbnNsYXRlKHN0cmluZylcclxue1xyXG5cdGxldCBrZXkgPSBzdHJpbmcudG9Mb3dlckNhc2UoKSxcclxuXHRcdHZhbHVlID0gdGhlbWVzW2FjdGl2ZVRoZW1lXVtrZXldIHx8IHRoZW1lcy5oaXRsZXJba2V5XSB8fCBzdHJpbmc7XHJcblxyXG5cdC8vIHN0YXJ0cyB3aXRoIHVwcGVyIGNhc2UsIHJlc3QgaXMgbG93ZXJcclxuXHRsZXQgaXNQcm9wZXIgPSBzdHJpbmcuY2hhckF0KDApID09IHN0cmluZy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSAmJiBzdHJpbmcuc2xpY2UoMSkgPT0gc3RyaW5nLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XHJcblx0aWYoaXNQcm9wZXIpe1xyXG5cdFx0dmFsdWUgPSB2YWx1ZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHZhbHVlLnNsaWNlKDEpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHZhbHVlO1xyXG59XHJcblxyXG5leHBvcnQge3RyYW5zbGF0ZSwgYWN0aXZlVGhlbWV9IiwiaW1wb3J0IHthY3RpdmVUaGVtZSBhcyB0aGVtZX0gZnJvbSAnLi90aGVtZSc7XHJcblxyXG5sZXQgdGhlbWVNb2RlbHMgPSB7XHJcblx0Y2Flc2FyOiB7XHJcblx0XHRsYXVyZWxzOiAnL3N0YXRpYy9tb2RlbC9sYXVyZWxzLmdsdGYnXHJcblx0fSxcclxuXHRoaXRsZXI6IHtcclxuXHRcdHRvcGhhdDogJy9zdGF0aWMvbW9kZWwvdG9waGF0LmdsdGYnLFxyXG5cdFx0dmlzb3JjYXA6ICcvc3RhdGljL21vZGVsL3Zpc29yX2NhcC5nbHRmJ1xyXG5cdH1cclxufTtcclxuXHJcbmxldCBhc3NldHMgPSB7XHJcblx0bWFuaWZlc3Q6IHtcclxuXHRcdG1vZGVsczogT2JqZWN0LmFzc2lnbih7XHJcblx0XHRcdHRhYmxlOiAnL3N0YXRpYy9tb2RlbC90YWJsZS5nbHRmJyxcclxuXHRcdFx0bmFtZXBsYXRlOiAnL3N0YXRpYy9tb2RlbC9uYW1lcGxhdGUuZGFlJyxcclxuXHRcdFx0Ly9kdW1teTogJy9zdGF0aWMvbW9kZWwvZHVtbXkuZ2x0ZicsXHJcblx0XHRcdC8vcGxheWVybWV0ZXI6ICcvc3RhdGljL21vZGVsL3BsYXllcm1ldGVyLmdsdGYnXHJcblx0XHR9LCB0aGVtZU1vZGVsc1t0aGVtZV0pLFxyXG5cdFx0dGV4dHVyZXM6IHtcclxuXHRcdFx0Ym9hcmRfbGFyZ2U6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1sYXJnZS5qcGdgLFxyXG5cdFx0XHRib2FyZF9tZWQ6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1tZWRpdW0uanBnYCxcclxuXHRcdFx0Ym9hcmRfc21hbGw6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1zbWFsbC5qcGdgLFxyXG5cdFx0XHRjYXJkczogYC9zdGF0aWMvaW1nLyR7dGhlbWV9L2NhcmRzLmpwZ2AsXHJcblx0XHRcdHJlc2V0OiAnL3N0YXRpYy9pbWcvYm9tYi5wbmcnLFxyXG5cdFx0XHRyZWZyZXNoOiAnL3N0YXRpYy9pbWcvcmVmcmVzaC5qcGcnXHJcblx0XHRcdC8vdGV4dDogJy9zdGF0aWMvaW1nL3RleHQucG5nJ1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0Y2FjaGU6IHt9LFxyXG5cdGZpeE1hdGVyaWFsczogZnVuY3Rpb24oKVxyXG5cdHtcclxuXHRcdE9iamVjdC5rZXlzKHRoaXMuY2FjaGUubW9kZWxzKS5mb3JFYWNoKGlkID0+IHtcclxuXHRcdFx0dGhpcy5jYWNoZS5tb2RlbHNbaWRdLnRyYXZlcnNlKG9iaiA9PiB7XHJcblx0XHRcdFx0aWYob2JqLm1hdGVyaWFsIGluc3RhbmNlb2YgVEhSRUUuTWVzaFN0YW5kYXJkTWF0ZXJpYWwpe1xyXG5cdFx0XHRcdFx0bGV0IG5ld01hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCgpO1xyXG5cdFx0XHRcdFx0bmV3TWF0Lm1hcCA9IG9iai5tYXRlcmlhbC5tYXA7XHJcblx0XHRcdFx0XHRuZXdNYXQuY29sb3IuY29weShvYmoubWF0ZXJpYWwuY29sb3IpO1xyXG5cdFx0XHRcdFx0bmV3TWF0LnRyYW5zcGFyZW50ID0gb2JqLm1hdGVyaWFsLnRyYW5zcGFyZW50O1xyXG5cdFx0XHRcdFx0bmV3TWF0LnNpZGUgPSBvYmoubWF0ZXJpYWwuc2lkZTtcclxuXHRcdFx0XHRcdG9iai5tYXRlcmlhbCA9IG5ld01hdDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBhc3NldHM7IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxubGV0IHBsYWNlaG9sZGVyR2VvID0gbmV3IFRIUkVFLkJveEJ1ZmZlckdlb21ldHJ5KC4wMDEsIC4wMDEsIC4wMDEpO1xyXG5sZXQgcGxhY2Vob2xkZXJNYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe2NvbG9yOiAweGZmZmZmZiwgdmlzaWJsZTogZmFsc2V9KTtcclxubGV0IFBsYWNlaG9sZGVyTWVzaCA9IG5ldyBUSFJFRS5NZXNoKHBsYWNlaG9sZGVyR2VvLCBwbGFjZWhvbGRlck1hdCk7XHJcblxyXG5jbGFzcyBOYXRpdmVDb21wb25lbnRcclxue1xyXG5cdGNvbnN0cnVjdG9yKG1lc2gsIG5lZWRzVXBkYXRlKVxyXG5cdHtcclxuXHRcdHRoaXMubWVzaCA9IG1lc2g7XHJcblx0XHRhbHRzcGFjZS5hZGROYXRpdmVDb21wb25lbnQodGhpcy5tZXNoLCB0aGlzLm5hbWUpO1xyXG5cclxuXHRcdGlmKG5lZWRzVXBkYXRlKVxyXG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlKGZpZWxkcyA9IHt9KVxyXG5cdHtcclxuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5kYXRhLCBmaWVsZHMpO1xyXG5cdFx0YWx0c3BhY2UudXBkYXRlTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lLCB0aGlzLmRhdGEpO1xyXG5cdH1cclxuXHJcblx0ZGVzdHJveSgpXHJcblx0e1xyXG5cdFx0YWx0c3BhY2UucmVtb3ZlTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5UZXh0IGV4dGVuZHMgTmF0aXZlQ29tcG9uZW50IHtcclxuXHRjb25zdHJ1Y3RvcihtZXNoKXtcclxuXHRcdHRoaXMubmFtZSA9ICduLXRleHQnO1xyXG5cdFx0dGhpcy5kYXRhID0ge1xyXG5cdFx0XHRmb250U2l6ZTogMTAsXHJcblx0XHRcdGhlaWdodDogMSxcclxuXHRcdFx0d2lkdGg6IDEwLFxyXG5cdFx0XHR2ZXJ0aWNhbEFsaWduOiAnbWlkZGxlJyxcclxuXHRcdFx0aG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJyxcclxuXHRcdFx0dGV4dDogJydcclxuXHRcdH07XHJcblx0XHRzdXBlcihtZXNoLCB0cnVlKTtcclxuXHJcblx0XHR0aGlzLmNvbG9yID0gJ2JsYWNrJztcclxuXHR9XHJcblx0dXBkYXRlKGZpZWxkcyA9IHt9KXtcclxuXHRcdGlmKGZpZWxkcy50ZXh0KVxyXG5cdFx0XHRmaWVsZHMudGV4dCA9IGA8Y29sb3I9JHt0aGlzLmNvbG9yfT4ke2ZpZWxkcy50ZXh0fTwvY29sb3I+YDtcclxuXHRcdE5hdGl2ZUNvbXBvbmVudC5wcm90b3R5cGUudXBkYXRlLmNhbGwodGhpcywgZmllbGRzKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5Ta2VsZXRvblBhcmVudCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XHJcblx0Y29uc3RydWN0b3IobWVzaCl7XHJcblx0XHR0aGlzLm5hbWUgPSAnbi1za2VsZXRvbi1wYXJlbnQnO1xyXG5cdFx0dGhpcy5kYXRhID0ge1xyXG5cdFx0XHRpbmRleDogMCxcclxuXHRcdFx0cGFydDogJ2hlYWQnLFxyXG5cdFx0XHRzaWRlOiAnY2VudGVyJywgXHJcblx0XHRcdHVzZXJJZDogMFxyXG5cdFx0fTtcclxuXHRcdHN1cGVyKG1lc2gsIHRydWUpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgTkJpbGxib2FyZCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XHJcblx0Y29uc3RydWN0b3IobWVzaCl7XHJcblx0XHR0aGlzLm5hbWUgPSAnbi1iaWxsYm9hcmQnO1xyXG5cdFx0c3VwZXIobWVzaCwgZmFsc2UpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5UZXh0LCBOU2tlbGV0b25QYXJlbnQsIE5CaWxsYm9hcmR9OyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7TlNrZWxldG9uUGFyZW50fSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xyXG5pbXBvcnQge2FjdGl2ZVRoZW1lIGFzIHRoZW1lfSBmcm9tICcuL3RoZW1lJztcclxuXHJcbmNsYXNzIEhhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3Rvcihtb2RlbClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5jdXJyZW50SWQgPSAnJztcclxuXHRcdHRoaXMuY29tcG9uZW50cyA9IHtoYXQ6IG51bGwsIHRleHQ6IG51bGx9O1xyXG5cdFx0XHJcblx0XHRpZihtb2RlbC5wYXJlbnQpXHJcblx0XHRcdG1vZGVsLnBhcmVudC5yZW1vdmUobW9kZWwpO1xyXG5cdFx0bW9kZWwudXBkYXRlTWF0cml4V29ybGQodHJ1ZSk7XHJcblxyXG5cdFx0Ly8gZ3JhYiBtZXNoZXNcclxuXHRcdGxldCBwcm9wID0gJyc7XHJcblx0XHRtb2RlbC50cmF2ZXJzZShvYmogPT4ge1xyXG5cdFx0XHRpZihvYmoubmFtZSA9PT0gJ2hhdCcgfHwgb2JqLm5hbWUgPT09ICd0ZXh0Jyl7XHJcblx0XHRcdFx0cHJvcCA9IG9iai5uYW1lO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYob2JqIGluc3RhbmNlb2YgVEhSRUUuTWVzaCl7XHJcblx0XHRcdFx0dGhpc1twcm9wXSA9IG9iajtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gc3RyaXAgb3V0IG1pZGRsZSBub2Rlc1xyXG5cdFx0aWYodGhpcy5oYXQpe1xyXG5cdFx0XHR0aGlzLmhhdC5tYXRyaXguY29weSh0aGlzLmhhdC5tYXRyaXhXb3JsZCk7XHJcblx0XHRcdHRoaXMuaGF0Lm1hdHJpeC5kZWNvbXBvc2UodGhpcy5oYXQucG9zaXRpb24sIHRoaXMuaGF0LnF1YXRlcm5pb24sIHRoaXMuaGF0LnNjYWxlKTtcclxuXHRcdFx0dGhpcy5hZGQodGhpcy5oYXQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHRoaXMudGV4dCl7XHJcblx0XHRcdHRoaXMudGV4dC5tYXRyaXguY29weSh0aGlzLnRleHQubWF0cml4V29ybGQpO1xyXG5cdFx0XHR0aGlzLnRleHQubWF0cml4LmRlY29tcG9zZSh0aGlzLnRleHQucG9zaXRpb24sIHRoaXMudGV4dC5xdWF0ZXJuaW9uLCB0aGlzLnRleHQuc2NhbGUpO1xyXG5cdFx0XHR0aGlzLmFkZCh0aGlzLnRleHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGQuc2NlbmUuYWRkKHRoaXMpO1xyXG5cdH1cclxuXHJcblx0c2V0T3duZXIodXNlcklkKVxyXG5cdHtcclxuXHRcdGlmKCF0aGlzLmN1cnJlbnRJZCAmJiB1c2VySWQpe1xyXG5cdFx0XHRkLnNjZW5lLmFkZCh0aGlzKTtcclxuXHRcdFx0aWYodGhpcy5oYXQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdCA9IG5ldyBOU2tlbGV0b25QYXJlbnQodGhpcy5oYXQpO1xyXG5cdFx0XHRpZih0aGlzLnRleHQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQgPSBuZXcgTlNrZWxldG9uUGFyZW50KHRoaXMudGV4dCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKHRoaXMuY3VycmVudElkICYmICF1c2VySWQpe1xyXG5cdFx0XHRpZih0aGlzLmhhdClcclxuXHRcdFx0XHR0aGlzLmNvbXBvbmVudHMuaGF0LmRlc3Ryb3koKTtcclxuXHRcdFx0aWYodGhpcy50ZXh0KVxyXG5cdFx0XHRcdHRoaXMuY29tcG9uZW50cy50ZXh0LmRlc3Ryb3koKTtcclxuXHRcdFx0ZC5zY2VuZS5yZW1vdmUodGhpcyk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYodXNlcklkKXtcclxuXHRcdFx0aWYodGhpcy5oYXQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdC51cGRhdGUoe3VzZXJJZH0pO1xyXG5cdFx0XHRpZih0aGlzLnRleHQpXHJcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQudXBkYXRlKHt1c2VySWR9KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmN1cnJlbnRJZCA9IHVzZXJJZDtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIFByZXNpZGVudEhhdCBleHRlbmRzIEhhdFxyXG57XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdGlmKHRoZW1lID09PSAnY2Flc2FyJylcclxuXHRcdHtcclxuXHRcdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLmxhdXJlbHMuY2xvbmUoKSk7XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC4wOC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xyXG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCguNSwgMCwgMCk7XHJcblx0XHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMC44L1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHR9XHJcblx0XHRlbHNlXHJcblx0XHR7XHJcblx0XHRcdHN1cGVyKEFNLmNhY2hlLm1vZGVscy50b3BoYXQpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjE0NC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigxLjIvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0bGV0IGFzc2lnbkhhdCA9ICh7ZGF0YToge2dhbWV9fSkgPT4ge1xyXG5cdFx0XHRsZXQgc2l0dGluZyA9IGdhbWUuc3BlY2lhbEVsZWN0aW9uID8gZ2FtZS5wcmVzaWRlbnQgOiBnYW1lLmxhc3RQcmVzaWRlbnQ7XHJcblx0XHRcdHRoaXMuc2V0T3duZXIoc2l0dGluZyk7XHJcblx0XHR9XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3BlY2lhbEVsZWN0aW9uJywgYXNzaWduSGF0KTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9wcmVzaWRlbnQnLCBhc3NpZ25IYXQpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2xhc3RQcmVzaWRlbnQnLCBhc3NpZ25IYXQpO1xyXG5cdH1cclxufTtcclxuXHJcbmNsYXNzIENoYW5jZWxsb3JIYXQgZXh0ZW5kcyBIYXRcclxue1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRpZih0aGVtZSA9PT0gJ2NhZXNhcicpe1xyXG5cdFx0XHRzdXBlcihBTS5jYWNoZS5tb2RlbHMubGF1cmVscy5jbG9uZSgpKTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLjA4L1NILmVudi5waXhlbHNQZXJNZXRlciwgLjAzL1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KC41LCAwLCAwKTtcclxuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigwLjgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdH1cclxuXHRcdGVsc2VcclxuXHRcdHtcclxuXHRcdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLnZpc29yY2FwKTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4wNy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigxLjIvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdH1cclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGFzdENoYW5jZWxsb3InLCBlID0+IHtcclxuXHRcdFx0dGhpcy5zZXRPd25lcihlLmRhdGEuZ2FtZS5sYXN0Q2hhbmNlbGxvcik7XHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuY2xhc3MgQmVoYXZpb3Jcclxue1xyXG5cdGNvbnN0cnVjdG9yKHR5cGUpe1xyXG5cdFx0dGhpcy50eXBlID0gdHlwZTtcclxuXHR9XHJcblxyXG5cdGF3YWtlKG9iail7XHJcblx0XHR0aGlzLm9iamVjdDNEID0gb2JqO1xyXG5cdH1cclxuXHJcblx0c3RhcnQoKXsgfVxyXG5cclxuXHR1cGRhdGUoZFQpeyB9XHJcblxyXG5cdGRpc3Bvc2UoKXsgfVxyXG59XHJcblxyXG5jbGFzcyBCU3luYyBleHRlbmRzIEJlaGF2aW9yXHJcbntcclxuXHRjb25zdHJ1Y3RvcihldmVudE5hbWUpXHJcblx0e1xyXG5cdFx0c3VwZXIoJ0JTeW5jJyk7XHJcblx0XHR0aGlzLl9zID0gU0guc29ja2V0O1xyXG5cclxuXHRcdC8vIGxpc3RlbiBmb3IgdXBkYXRlIGV2ZW50c1xyXG5cdFx0dGhpcy5ob29rID0gdGhpcy5fcy5vbihldmVudE5hbWUsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcclxuXHRcdHRoaXMuZXZlbnROYW1lID0gZXZlbnROYW1lO1xyXG5cdFx0dGhpcy5vd25lciA9IDA7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVGcm9tU2VydmVyKGRhdGEpXHJcblx0e1xyXG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XHJcblx0XHR0aGlzLm9iamVjdDNELnJvdGF0aW9uLmZyb21BcnJheShkYXRhLCAzKTtcclxuXHR9XHJcblxyXG5cdHRha2VPd25lcnNoaXAoKVxyXG5cdHtcclxuXHRcdGlmKFNILmxvY2FsVXNlciAmJiBTSC5sb2NhbFVzZXIudXNlcklkKVxyXG5cdFx0XHR0aGlzLm93bmVyID0gU0gubG9jYWxVc2VyLnVzZXJJZDtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZShkVClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIgJiYgU0gubG9jYWxVc2VyLnNrZWxldG9uICYmIFNILmxvY2FsVXNlci5pZCA9PT0gdGhpcy5vd25lcilcclxuXHRcdHtcclxuXHRcdFx0bGV0IGogPSBTSC5sb2NhbFVzZXIuc2tlbGV0b24uZ2V0Sm9pbnQoJ0hlYWQnKTtcclxuXHRcdFx0dGhpcy5fcy5lbWl0KHRoaXMuZXZlbnROYW1lLCBbLi4uai5wb3NpdGlvbi50b0FycmF5KCksIC4uLmoucm90YXRpb24udG9BcnJheSgpXSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxufVxyXG5cclxuZXhwb3J0IHsgQmVoYXZpb3IsIEJTeW5jIH07XHJcbiIsImltcG9ydCB7IEJlaGF2aW9yIH0gZnJvbSAnLi9iZWhhdmlvcic7XHJcblxyXG5jbGFzcyBRdWF0ZXJuaW9uVHdlZW4gZXh0ZW5kcyBUV0VFTi5Ud2VlblxyXG57XHJcblx0Y29uc3RydWN0b3Ioc3RhdGUsIGdyb3VwKXtcclxuXHRcdHN1cGVyKHt0OiAwfSwgZ3JvdXApO1xyXG5cdFx0dGhpcy5fc3RhdGUgPSBzdGF0ZTtcclxuXHRcdHRoaXMuX3N0YXJ0ID0gc3RhdGUuY2xvbmUoKTtcclxuXHR9XHJcblx0dG8oZW5kLCBkdXJhdGlvbil7XHJcblx0XHRzdXBlci50byh7dDogMX0sIGR1cmF0aW9uKTtcclxuXHRcdHRoaXMuX2VuZCA9IGVuZCBpbnN0YW5jZW9mIFRIUkVFLlF1YXRlcm5pb24gPyBbZW5kXSA6IGVuZDtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH1cclxuXHRzdGFydCgpe1xyXG5cdFx0dGhpcy5vblVwZGF0ZSgoe3Q6IHByb2dyZXNzfSkgPT4ge1xyXG5cdFx0XHRwcm9ncmVzcyA9IHByb2dyZXNzICogdGhpcy5fZW5kLmxlbmd0aDtcclxuXHRcdFx0bGV0IG5leHRQb2ludCA9IE1hdGguY2VpbChwcm9ncmVzcyk7XHJcblx0XHRcdGxldCBsb2NhbFByb2dyZXNzID0gcHJvZ3Jlc3MgLSBuZXh0UG9pbnQgKyAxO1xyXG5cdFx0XHRsZXQgcG9pbnRzID0gW3RoaXMuX3N0YXJ0LCAuLi50aGlzLl9lbmRdO1xyXG5cdFx0XHRUSFJFRS5RdWF0ZXJuaW9uLnNsZXJwKHBvaW50c1tuZXh0UG9pbnQtMV0sIHBvaW50c1tuZXh0UG9pbnRdLCB0aGlzLl9zdGF0ZSwgbG9jYWxQcm9ncmVzcyk7XHJcblx0XHR9KTtcclxuXHRcdHJldHVybiBzdXBlci5zdGFydCgpO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gV2FpdEZvckFuaW1zKHR3ZWVucylcclxue1xyXG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PlxyXG5cdHtcclxuXHRcdGxldCBhY3RpdmVDb3VudCA9IHR3ZWVucy5sZW5ndGg7XHJcblx0XHRmdW5jdGlvbiBjaGVja0RvbmUoKXtcclxuXHRcdFx0aWYoLS1hY3RpdmVDb3VudCA9PT0gMCkgcmVzb2x2ZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHR3ZWVucy5mb3JFYWNoKHQgPT4gdC5vbkNvbXBsZXRlKGNoZWNrRG9uZSkpO1xyXG5cdFx0dHdlZW5zLmZvckVhY2godCA9PiB0LnN0YXJ0KCkpO1xyXG5cdH0pO1xyXG59XHJcblxyXG5jb25zdCBzcGluUG9pbnRzID0gW1xyXG5cdG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIE1hdGguc3FydCgyKS8yLCAwLCBNYXRoLnNxcnQoMikvMiksXHJcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMSwgMCwgMCksXHJcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgTWF0aC5zcXJ0KDIpLzIsIDAsIC1NYXRoLnNxcnQoMikvMiksXHJcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMCwgMCwgMSlcclxuXTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFuaW1hdGVcclxue1xyXG5cdC8qKlxyXG5cdCAqIE1vdmUgYW4gb2JqZWN0IGZyb20gQSB0byBCXHJcblx0ICogQHBhcmFtIHtUSFJFRS5PYmplY3QzRH0gdGFyZ2V0IFxyXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXHJcblx0ICovXHJcblx0c3RhdGljIHNpbXBsZSh0YXJnZXQsIHtwYXJlbnQ9bnVsbCwgcG9zPW51bGwsIHF1YXQ9bnVsbCwgc2NhbGU9bnVsbCwgbWF0cml4PW51bGwsIGR1cmF0aW9uPTYwMH0gPSB7fSlcclxuXHR7XHJcblx0XHQvLyBleHRyYWN0IHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlIGZyb20gbWF0cml4XHJcblx0XHRpZihtYXRyaXgpe1xyXG5cdFx0XHRwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRxdWF0ID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcclxuXHRcdFx0c2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRtYXRyaXguZGVjb21wb3NlKHBvcywgcXVhdCwgc2NhbGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHNodWZmbGUgaGllcmFyY2h5LCBidXQga2VlcCB3b3JsZCB0cmFuc2Zvcm0gdGhlIHNhbWVcclxuXHRcdGlmKHBhcmVudCAmJiB0aGlzLnBhcmVudCAhPT0gdGFyZ2V0LnBhcmVudCl7XHJcblx0XHRcdHRhcmdldC5hcHBseU1hdHJpeCh0YXJnZXQucGFyZW50Lm1hdHJpeFdvcmxkKTtcclxuXHRcdFx0dGFyZ2V0LmFwcGx5TWF0cml4KG5ldyBUSFJFRS5NYXRyaXg0KCkuZ2V0SW52ZXJzZShwYXJlbnQubWF0cml4V29ybGQpKTtcclxuXHRcdFx0cGFyZW50LmFkZChvYmopO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBhbmltcyA9IFtdO1xyXG5cclxuXHRcdGlmKHBvcyl7XHJcblx0XHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKHRhcmdldC5wb3NpdGlvbilcclxuXHRcdFx0XHQudG8oe3g6IHBvcy54LCB5OiBwb3MueSwgejogcG9zLnp9LCBkdXJhdGlvbilcclxuXHRcdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0KVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHF1YXQpe1xyXG5cdFx0XHRhbmltcy5wdXNoKG5ldyBRdWF0ZXJuaW9uVHdlZW4odGFyZ2V0LnF1YXRlcm5pb24pXHJcblx0XHRcdFx0LnRvKHF1YXQsIGR1cmF0aW9uKVxyXG5cdFx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoc2NhbGUpe1xyXG5cdFx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2Vlbih0YXJnZXQuc2NhbGUpXHJcblx0XHRcdFx0LnRvKHt4OiBzY2FsZS54LCB5OiBzY2FsZS55LCB6OiBzY2FsZS56fSwgZHVyYXRpb24pXHJcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKGFuaW1zKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyB3YWl0KGR1cmF0aW9uKXtcclxuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblx0XHRcdHNldFRpbWVvdXQocmVzb2x2ZSwgZHVyYXRpb24pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNYWtlIHRoZSBjYXJkIGFwcGVhciB3aXRoIGEgZmxvdXJpc2hcclxuXHQgKiBAcGFyYW0ge1RIUkVFLk9iamVjdDNEfSBjYXJkIFxyXG5cdCAqL1xyXG5cdHN0YXRpYyBjYXJkRmxvdXJpc2goY2FyZClcclxuXHR7XHJcblx0XHRjYXJkLnBvc2l0aW9uLnNldCgwLCAwLCAwKTtcclxuXHRcdGNhcmQucXVhdGVybmlvbi5zZXQoMCwwLDAsMSk7XHJcblx0XHRjYXJkLnNjYWxlLnNldFNjYWxhciguMDAxKTtcclxuXHJcblx0XHRsZXQgYW5pbXMgPSBbXTtcclxuXHJcblx0XHQvLyBhZGQgcG9zaXRpb24gYW5pbWF0aW9uXHJcblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihjYXJkLnBvc2l0aW9uKVxyXG5cdFx0XHQudG8oe3g6IDAsIHk6IC43LCB6OiAwfSwgMTUwMClcclxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuRWxhc3RpYy5PdXQpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIGFkZCBzcGluIGFuaW1hdGlvblxyXG5cdFx0YW5pbXMucHVzaChuZXcgUXVhdGVybmlvblR3ZWVuKGNhcmQucXVhdGVybmlvbilcclxuXHRcdFx0LnRvKHNwaW5Qb2ludHMsIDI1MDApXHJcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIGFkZCBzY2FsZSBhbmltYXRpb25cclxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKGNhcmQuc2NhbGUpXHJcblx0XHRcdC50byh7eDogLjUsIHk6IC41LCB6OiAuNX0sIDIwMClcclxuXHRcdCk7XHJcblxyXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgdmFuaXNoKGNhcmQpXHJcblx0e1xyXG5cdFx0bGV0IGFuaW1zID0gW107XHJcblxyXG5cdFx0Ly8gYWRkIG1vdmUgYW5pbWF0aW9uXHJcblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihjYXJkLnBvc2l0aW9uKVxyXG5cdFx0XHQudG8oe3k6ICcrMC41J30sIDEwMDApXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIGFkZCBkaXNhcHBlYXIgYW5pbWF0aW9uXHJcblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihjYXJkLm1hdGVyaWFsKVxyXG5cdFx0XHQudG8oe29wYWNpdHk6IDB9LCAxMDAwKVxyXG5cdFx0KTtcclxuXHJcblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKGFuaW1zKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBib2Iob2JqLCBhbXBsaXR1ZGUgPSAuMDgsIHBlcmlvZCA9IDQwMDApXHJcblx0e1xyXG5cdFx0cmV0dXJuIG5ldyBUV0VFTi5Ud2VlbihvYmoucG9zaXRpb24pXHJcblx0XHRcdC50byh7eTogb2JqLnBvc2l0aW9uLnktYW1wbGl0dWRlfSwgcGVyaW9kKVxyXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5TaW51c29pZGFsLkluT3V0KVxyXG5cdFx0XHQucmVwZWF0KEluZmluaXR5KVxyXG5cdFx0XHQueW95byh0cnVlKVxyXG5cdFx0XHQuc3RhcnQoKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBzcGluKG9iaiwgcGVyaW9kID0gMTAwMDApXHJcblx0e1xyXG5cdFx0cmV0dXJuIG5ldyBRdWF0ZXJuaW9uVHdlZW4ob2JqLnF1YXRlcm5pb24pXHJcblx0XHRcdC50byhzcGluUG9pbnRzLCBwZXJpb2QpXHJcblx0XHRcdC5yZXBlYXQoSW5maW5pdHkpXHJcblx0XHRcdC5zdGFydCgpO1xyXG5cdH1cclxufSIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuLy8gZW51bSBjb25zdGFudHNcclxubGV0IFR5cGVzID0gT2JqZWN0LmZyZWV6ZSh7XHJcblx0UE9MSUNZX0xJQkVSQUw6IDAsXHJcblx0UE9MSUNZX0ZBU0NJU1Q6IDEsXHJcblx0Uk9MRV9MSUJFUkFMOiAyLFxyXG5cdFJPTEVfRkFTQ0lTVDogMyxcclxuXHRST0xFX0hJVExFUjogNCxcclxuXHRQQVJUWV9MSUJFUkFMOiA1LFxyXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXHJcblx0SkE6IDcsXHJcblx0TkVJTjogOCxcclxuXHRCTEFOSzogOSxcclxuXHRDUkVESVRTOiAxMCxcclxuXHRWRVRPOiAxMVxyXG59KTtcclxuXHJcbmxldCBnZW9tZXRyeSA9IG51bGwsIG1hdGVyaWFsID0gbnVsbDtcclxuXHJcbmZ1bmN0aW9uIGluaXRDYXJkRGF0YSgpXHJcbntcclxuXHRsZXQgZmxvYXREYXRhID0gW1xyXG5cdFx0Ly8gcG9zaXRpb24gKHBvcnRyYWl0KVxyXG5cdFx0MC4zNTc1LCAwLjUsIDAuMDAwNSxcclxuXHRcdC0uMzU3NSwgMC41LCAwLjAwMDUsXHJcblx0XHQtLjM1NzUsIC0uNSwgMC4wMDA1LFxyXG5cdFx0MC4zNTc1LCAtLjUsIDAuMDAwNSxcclxuXHRcdDAuMzU3NSwgMC41LCAtLjAwMDUsXHJcblx0XHQtLjM1NzUsIDAuNSwgLS4wMDA1LFxyXG5cdFx0LS4zNTc1LCAtLjUsIC0uMDAwNSxcclxuXHRcdDAuMzU3NSwgLS41LCAtLjAwMDUsXHJcblx0XHJcblx0XHQvLyBwb3NpdGlvbiAobGFuZHNjYXBlKVxyXG5cdFx0MC41LCAtLjM1NzUsIDAuMDAwNSxcclxuXHRcdDAuNSwgMC4zNTc1LCAwLjAwMDUsXHJcblx0XHQtLjUsIDAuMzU3NSwgMC4wMDA1LFxyXG5cdFx0LS41LCAtLjM1NzUsIDAuMDAwNSxcclxuXHRcdDAuNSwgLS4zNTc1LCAtLjAwMDUsXHJcblx0XHQwLjUsIDAuMzU3NSwgLS4wMDA1LFxyXG5cdFx0LS41LCAwLjM1NzUsIC0uMDAwNSxcclxuXHRcdC0uNSwgLS4zNTc1LCAtLjAwMDUsXHJcblx0XHJcblx0XHQvLyBVVnNcclxuXHRcdC8qIC0tLS0tLS0tLS0tLS0tIGNhcmQgZmFjZSAtLS0tLS0tLS0tLS0tICovIC8qIC0tLS0tLS0tLS0tLS0gY2FyZCBiYWNrIC0tLS0tLS0tLS0tLS0tKi9cclxuXHRcdC43NTQsLjk5NiwgLjc1NCwuODM0LCAuOTk3LC44MzQsIC45OTcsLjk5NiwgLjc1NCwuODM0LCAuNzU0LC45OTYsIC45OTcsLjk5NiwgLjk5NywuODM0LCAvLyBsaWJlcmFsIHBvbGljeVxyXG5cdFx0Ljc1NCwuODIyLCAuNzU0LC42NjAsIC45OTYsLjY2MCwgLjk5NiwuODIyLCAuNzU0LC42NjAsIC43NTQsLjgyMiwgLjk5NiwuODIyLCAuOTk2LC42NjAsIC8vIGZhc2Npc3QgcG9saWN5XHJcblx0XHQuNzQ2LC45OTYsIC41MDUsLjk5NiwgLjUwNSwuNjUwLCAuNzQ2LC42NTAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbGliZXJhbCByb2xlXHJcblx0XHQuNzQ2LC42NDUsIC41MDUsLjY0NSwgLjUwNSwuMzAwLCAuNzQ2LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gZmFzY2lzdCByb2xlXHJcblx0XHQuOTk2LC42NDUsIC43NTQsLjY0NSwgLjc1NCwuMzAwLCAuOTk2LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gaGl0bGVyIHJvbGVcclxuXHRcdC40OTUsLjk5NiwgLjI1NSwuOTk2LCAuMjU1LC42NTAsIC40OTUsLjY1MCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBsaWJlcmFsIHBhcnR5XHJcblx0XHQuNDk1LC42NDUsIC4yNTUsLjY0NSwgLjI1NSwuMzAwLCAuNDk1LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gZmFzY2lzdCBwYXJ0eVxyXG5cdFx0LjI0NCwuOTkyLCAuMDA1LC45OTIsIC4wMDUsLjY1MywgLjI0NCwuNjUzLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGphXHJcblx0XHQuMjQzLC42NDIsIC4wMDYsLjY0MiwgLjAwNiwuMzAyLCAuMjQzLC4zMDIsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbmVpblxyXG5cdFx0LjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGJsYW5rXHJcblx0XHQuMzk3LC4yNzYsIC4zOTcsLjAxNSwgLjc2NSwuMDE1LCAuNzY1LC4yNzYsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gY3JlZGl0c1xyXG5cdFx0Ljk2MywuMjcwLCAuODA0LC4yNzAsIC44MDQsLjAyOSwgLjk2MywuMDI5LCAuODA0LC4yNzAsIC45NjMsLjI3MCwgLjk2MywuMDI5LCAuODA0LC4wMjksIC8vIHZldG9cclxuXHJcblx0XTtcclxuXHRcclxuXHRsZXQgaW50RGF0YSA9IFtcclxuXHRcdC8vIHRyaWFuZ2xlIGluZGV4XHJcblx0XHQwLDEsMiwgMCwyLDMsIDQsNyw1LCA1LDcsNlxyXG5cdF07XHJcblx0XHJcblx0Ly8gdHdvIHBvc2l0aW9uIHNldHMsIDExIFVWIHNldHMsIDEgaW5kZXggc2V0XHJcblx0bGV0IGdlb0J1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcig0KmZsb2F0RGF0YS5sZW5ndGggKyAyKmludERhdGEubGVuZ3RoKTtcclxuXHRsZXQgdGVtcCA9IG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCAwLCBmbG9hdERhdGEubGVuZ3RoKTtcclxuXHR0ZW1wLnNldChmbG9hdERhdGEpO1xyXG5cdHRlbXAgPSBuZXcgVWludDE2QXJyYXkoZ2VvQnVmZmVyLCA0KmZsb2F0RGF0YS5sZW5ndGgsIGludERhdGEubGVuZ3RoKTtcclxuXHR0ZW1wLnNldChpbnREYXRhKTtcclxuXHRcclxuXHQvLyBjaG9wIHVwIGJ1ZmZlciBpbnRvIHZlcnRleCBhdHRyaWJ1dGVzXHJcblx0bGV0IHBvc0xlbmd0aCA9IDgqMywgdXZMZW5ndGggPSA4KjIsIGluZGV4TGVuZ3RoID0gMTI7XHJcblx0bGV0IHBvc1BvcnRyYWl0ID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgMCwgcG9zTGVuZ3RoKSwgMyksXHJcblx0XHRwb3NMYW5kc2NhcGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCA0KnBvc0xlbmd0aCwgcG9zTGVuZ3RoKSwgMyk7XHJcblx0bGV0IHV2cyA9IFtdO1xyXG5cdGZvcihsZXQgaT0wOyBpPDEyOyBpKyspe1xyXG5cdFx0dXZzLnB1c2goIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDgqcG9zTGVuZ3RoICsgNCppKnV2TGVuZ3RoLCB1dkxlbmd0aCksIDIpICk7XHJcblx0fVxyXG5cdGxldCBpbmRleCA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IFVpbnQxNkFycmF5KGdlb0J1ZmZlciwgNCpmbG9hdERhdGEubGVuZ3RoLCBpbmRleExlbmd0aCksIDEpO1xyXG5cdFxyXG5cdGdlb21ldHJ5ID0gT2JqZWN0LmtleXMoVHlwZXMpLm1hcCgoa2V5LCBpKSA9PlxyXG5cdHtcclxuXHRcdGxldCBnZW8gPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcclxuXHRcdGdlby5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgaT09VHlwZXMuSkEgfHwgaT09VHlwZXMuTkVJTiA/IHBvc0xhbmRzY2FwZSA6IHBvc1BvcnRyYWl0KTtcclxuXHRcdGdlby5hZGRBdHRyaWJ1dGUoJ3V2JywgdXZzW2ldKTtcclxuXHRcdGdlby5zZXRJbmRleChpbmRleCk7XHJcblx0XHRyZXR1cm4gZ2VvO1xyXG5cdH0pO1xyXG5cclxuXHRtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KTtcclxufVxyXG5cclxuXHJcbmNsYXNzIENhcmQgZXh0ZW5kcyBUSFJFRS5NZXNoXHJcbntcclxuXHRjb25zdHJ1Y3Rvcih0eXBlID0gVHlwZXMuQkxBTkspXHJcblx0e1xyXG5cdFx0aWYoIWdlb21ldHJ5IHx8ICFtYXRlcmlhbCkgaW5pdENhcmREYXRhKCk7XHJcblxyXG5cdFx0bGV0IGdlbyA9IGdlb21ldHJ5W3R5cGVdO1xyXG5cdFx0c3VwZXIoZ2VvLCBtYXRlcmlhbCk7XHJcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjcpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgQmxhbmtDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXsgc3VwZXIoKTsgfVxyXG59XHJcblxyXG5jbGFzcyBDcmVkaXRzQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5DUkVESVRTKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIExpYmVyYWxQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlBPTElDWV9MSUJFUkFMLCBmYWxzZSk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0UG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfRkFTQ0lTVCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBWZXRvQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5WRVRPKTtcclxuXHR9XHJcbn1cclxuY2xhc3MgTGliZXJhbFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlJPTEVfTElCRVJBTCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0Um9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9GQVNDSVNUKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIEhpdGxlclJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlJPTEVfSElUTEVSKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIExpYmVyYWxQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfTElCRVJBTCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0UGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0ZBU0NJU1QpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgSmFDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLkpBKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5laW5DYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLk5FSU4pO1xyXG5cdH1cclxufVxyXG5cclxuXHJcbmV4cG9ydCB7XHJcblx0Q2FyZCwgVHlwZXMsIEJsYW5rQ2FyZCwgQ3JlZGl0c0NhcmQsIFZldG9DYXJkLFxyXG5cdExpYmVyYWxQb2xpY3lDYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgTGliZXJhbFJvbGVDYXJkLCBGYXNjaXN0Um9sZUNhcmQsXHJcblx0SGl0bGVyUm9sZUNhcmQsIExpYmVyYWxQYXJ0eUNhcmQsIEZhc2Npc3RQYXJ0eUNhcmQsIEphQ2FyZCwgTmVpbkNhcmRcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcclxuaW1wb3J0IHtMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIFZldG9DYXJkfSBmcm9tICcuL2NhcmQnO1xyXG5cclxubGV0IExpYmVyYWxTcG90cyA9IHtcclxuXHRwb3NpdGlvbnM6IFtcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuNjkwLCAwLjAwMSwgLTAuNDIpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC4zNDUsIDAuMDAxLCAtMC40MiksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjAwMiwgMC4wMDEsIC0wLjQyKSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uMzQwLCAwLjAwMSwgLTAuNDIpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoLS42OTAsIDAuMDAxLCAtMC40MilcclxuXHRdLFxyXG5cdHF1YXRlcm5pb246IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMC43MDcxMDY3ODExODY1NDc1LCAwKSxcclxuXHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMC40LCAwLjQsIDAuNClcclxufSxcclxuRmFzY2lzdFNwb3RzID0ge1xyXG5cdHBvc2l0aW9uczogW1xyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoLS44NjAsIDAuMDAxLCAuNDI1KSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uNTE1LCAwLjAwMSwgLjQyNSksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjE3MCwgMC4wMDEsIC40MjUpLFxyXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC4xNzAsIDAuMDAxLCAuNDI1KSxcclxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuNTE4LCAwLjAwMSwgLjQyNSksXHJcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjg3MCwgMC4wMDEsIC40MjUpLFx0XHJcblx0XSxcclxuXHRxdWF0ZXJuaW9uOiBuZXcgVEhSRUUuUXVhdGVybmlvbigtMC43MDcxMDY3ODExODY1NDc1LCAwLCAwLCAwLjcwNzEwNjc4MTE4NjU0NzUpLFxyXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjQsIDAuNCwgMC40KVxyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR2FtZVRhYmxlIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdC8vIHRhYmxlIHN0YXRlXHJcblx0XHR0aGlzLmxpYmVyYWxDYXJkcyA9IDA7XHJcblx0XHR0aGlzLmZhc2Npc3RDYXJkcyA9IDA7XHJcblx0XHR0aGlzLmNhcmRzID0gW107XHJcblxyXG5cdFx0dGhpcy52ZXRvQ2FyZCA9IG5ldyBWZXRvQ2FyZCgpO1xyXG5cdFx0dGhpcy52ZXRvQ2FyZC5zY2FsZS5zZXRTY2FsYXIoLjUpO1xyXG5cdFx0dGhpcy52ZXRvQ2FyZC52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR0aGlzLnZldG9DYXJkLm1hdGVyaWFsLnRyYW5zcGFyZW50ID0gdHJ1ZTtcclxuXHRcdHRoaXMuYWRkKHRoaXMudmV0b0NhcmQpO1xyXG5cclxuXHRcdC8vIGFkZCB0YWJsZSBhc3NldFxyXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50YWJsZTtcclxuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XHJcblxyXG5cdFx0Ly8gc2F2ZSByZWZlcmVuY2VzIHRvIHRoZSB0ZXh0dXJlc1xyXG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtcclxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfc21hbGwsXHJcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX21lZCxcclxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbGFyZ2VcclxuXHRcdF07XHJcblx0XHR0aGlzLnRleHR1cmVzLmZvckVhY2godGV4ID0+IHRleC5mbGlwWSA9IGZhbHNlKTtcclxuXHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzBdLCB0cnVlKTtcclxuXHRcdFxyXG5cdFx0Ly8gcG9zaXRpb24gdGFibGVcclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAuODgsIDApO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLmNoYW5nZU1vZGUuYmluZCh0aGlzKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGliZXJhbFBvbGljaWVzJywgdGhpcy51cGRhdGVQb2xpY2llcy5iaW5kKHRoaXMpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9mYXNjaXN0UG9saWNpZXMnLCB0aGlzLnVwZGF0ZVBvbGljaWVzLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2ZhaWxlZFZvdGVzJywgdGhpcy51cGRhdGVQb2xpY2llcy5iaW5kKHRoaXMpKTtcclxuXHR9XHJcblxyXG5cdGNoYW5nZU1vZGUoe2RhdGE6IHtnYW1lOiB7c3RhdGUsIHR1cm5PcmRlcn19fSlcclxuXHR7XHJcblx0XHRpZih0dXJuT3JkZXIubGVuZ3RoID49IDkpXHJcblx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzJdKTtcclxuXHRcdGVsc2UgaWYodHVybk9yZGVyLmxlbmd0aCA+PSA3KVxyXG5cdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1sxXSk7XHJcblx0XHRlbHNlXHJcblx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzBdKTtcclxuXHR9XHJcblxyXG5cdHNldFRleHR1cmUobmV3VGV4LCBzd2l0Y2hMaWdodG1hcClcclxuXHR7XHJcblx0XHR0aGlzLm1vZGVsLnRyYXZlcnNlKG8gPT4ge1xyXG5cdFx0XHRpZihvIGluc3RhbmNlb2YgVEhSRUUuTWVzaClcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlmKHN3aXRjaExpZ2h0bWFwKVxyXG5cdFx0XHRcdFx0by5tYXRlcmlhbC5saWdodE1hcCA9IG8ubWF0ZXJpYWwubWFwO1xyXG5cclxuXHRcdFx0XHRvLm1hdGVyaWFsLm1hcCA9IG5ld1RleDtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVQb2xpY2llcyh7ZGF0YToge2dhbWU6IHtsaWJlcmFsUG9saWNpZXMsIGZhc2Npc3RQb2xpY2llcywgaGFuZCwgc3RhdGV9fX0pXHJcblx0e1xyXG5cdFx0bGV0IHVwZGF0ZXMgPSBbXTtcclxuXHJcblx0XHQvLyBxdWV1ZSB1cCBjYXJkcyB0byBiZSBhZGRlZCB0byB0aGUgdGFibGUgdGhpcyB1cGRhdGVcclxuXHRcdGZvcih2YXIgaT10aGlzLmxpYmVyYWxDYXJkczsgaTxsaWJlcmFsUG9saWNpZXM7IGkrKyl7XHJcblx0XHRcdGxldCBjYXJkID0gbmV3IExpYmVyYWxQb2xpY3lDYXJkKCk7XHJcblx0XHRcdGNhcmQuYW5pbWF0ZSA9ICgpID0+IEFuaW1hdGUuc2ltcGxlKGNhcmQsIHtcclxuXHRcdFx0XHRwb3M6IExpYmVyYWxTcG90cy5wb3NpdGlvbnNbaV0sXHJcblx0XHRcdFx0cXVhdDogTGliZXJhbFNwb3RzLnF1YXRlcm5pb24sXHJcblx0XHRcdFx0c2NhbGU6IExpYmVyYWxTcG90cy5zY2FsZVxyXG5cdFx0XHR9KS50aGVuKCgpID0+IEFuaW1hdGUud2FpdCg1MDApKTtcclxuXHRcdFx0Y2FyZC5wbGF5U291bmQgPSAoKSA9PiBTSC5hdWRpby5saWJlcmFsU3RpbmcubG9hZGVkLnRoZW4oKCkgPT4gU0guYXVkaW8ubGliZXJhbFN0aW5nLnBsYXkoKSk7XHJcblx0XHRcdHVwZGF0ZXMucHVzaChjYXJkKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Zm9yKHZhciBpPXRoaXMuZmFzY2lzdENhcmRzOyBpPGZhc2Npc3RQb2xpY2llczsgaSsrKXtcclxuXHRcdFx0bGV0IGNhcmQgPSBuZXcgRmFzY2lzdFBvbGljeUNhcmQoKTtcclxuXHRcdFx0Y2FyZC5hbmltYXRlID0gKCkgPT4gQW5pbWF0ZS5zaW1wbGUoY2FyZCwge1xyXG5cdFx0XHRcdHBvczogRmFzY2lzdFNwb3RzLnBvc2l0aW9uc1tpXSxcclxuXHRcdFx0XHRxdWF0OiBGYXNjaXN0U3BvdHMucXVhdGVybmlvbixcclxuXHRcdFx0XHRzY2FsZTogRmFzY2lzdFNwb3RzLnNjYWxlXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjYXJkLnBsYXlTb3VuZCA9ICgpID0+IFNILmF1ZGlvLmZhc2Npc3RTdGluZy5sb2FkZWQudGhlbigoKSA9PiBTSC5hdWRpby5mYXNjaXN0U3RpbmcucGxheSgpKTtcclxuXHRcdFx0dXBkYXRlcy5wdXNoKGNhcmQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHN0YXRlID09PSAnYWZ0ZXJtYXRoJyAmJiBoYW5kID09PSAxKXtcclxuXHRcdFx0dXBkYXRlcy5wdXNoKHRoaXMudmV0b0NhcmQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBhbmltYXRpb24gPSBudWxsO1xyXG5cdFx0aWYodXBkYXRlcy5sZW5ndGggPT09IDEpXHJcblx0XHR7XHJcblx0XHRcdGxldCBjYXJkID0gdXBkYXRlc1swXTtcclxuXHRcdFx0aWYoY2FyZCA9PT0gdGhpcy52ZXRvQ2FyZClcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNhcmQudmlzaWJsZSA9IHRydWU7IGNhcmQubWF0ZXJpYWwub3BhY2l0eSA9IDE7XHJcblx0XHRcdFx0YW5pbWF0aW9uID0gQW5pbWF0ZS5jYXJkRmxvdXJpc2goY2FyZClcclxuXHRcdFx0XHRcdC50aGVuKCgpID0+IEFuaW1hdGUudmFuaXNoKGNhcmQpKVxyXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4geyBjYXJkLnZpc2libGUgPSBmYWxzZTsgfSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dGhpcy5hZGQoY2FyZCk7XHJcblx0XHRcdFx0dGhpcy5jYXJkcy5wdXNoKGNhcmQpO1xyXG5cdFx0XHRcdGNhcmQucGxheVNvdW5kKCk7XHJcblx0XHRcdFx0YW5pbWF0aW9uID0gQW5pbWF0ZS5jYXJkRmxvdXJpc2goY2FyZClcclxuXHRcdFx0XHRcdC50aGVuKCgpID0+IGNhcmQuYW5pbWF0ZSgpKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZVxyXG5cdFx0e1xyXG5cdFx0XHQvLyBwbGFjZSBvbiB0aGVpciBzcG90c1xyXG5cdFx0XHR1cGRhdGVzLmZvckVhY2goY2FyZCA9PiB7XHJcblx0XHRcdFx0dGhpcy5hZGQoY2FyZCk7XHJcblx0XHRcdFx0dGhpcy5jYXJkcy5wdXNoKGNhcmQpO1xyXG5cdFx0XHRcdGNhcmQuYW5pbWF0ZSgpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGFuaW1hdGlvbiA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHN0YXRlID09PSAnYWZ0ZXJtYXRoJyl7XHJcblx0XHRcdGFuaW1hdGlvbi50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRTSC5kaXNwYXRjaEV2ZW50KHtcclxuXHRcdFx0XHRcdHR5cGU6ICdwb2xpY3lBbmltRG9uZScsXHJcblx0XHRcdFx0XHRidWJibGVzOiBmYWxzZVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZihsaWJlcmFsUG9saWNpZXMgPT09IDAgJiYgZmFzY2lzdFBvbGljaWVzID09PSAwKXtcclxuXHRcdFx0dGhpcy5jYXJkcy5mb3JFYWNoKGMgPT4gdGhpcy5yZW1vdmUoYykpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMubGliZXJhbENhcmRzID0gbGliZXJhbFBvbGljaWVzO1xyXG5cdFx0dGhpcy5mYXNjaXN0Q2FyZHMgPSBmYXNjaXN0UG9saWNpZXM7XHJcblx0fVxyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuZnVuY3Rpb24gZ2V0R2FtZUlkKClcclxue1xyXG5cdC8vIGZpcnN0IGNoZWNrIHRoZSB1cmxcclxuXHRsZXQgcmUgPSAvWz8mXWdhbWVJZD0oW14mXSspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xyXG5cdGlmKHJlKXtcclxuXHRcdHJldHVybiByZVsxXTtcclxuXHR9XHJcblx0ZWxzZSBpZihhbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudCl7XHJcblx0XHRyZXR1cm4gU0guZW52LnNpZDtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRsZXQgaWQgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogMTAwMDAwMDAwICk7XHJcblx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZSgnP2dhbWVJZD0nK2lkKTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlQ1NWKHN0cil7XHJcblx0aWYoIXN0cikgcmV0dXJuIFtdO1xyXG5cdGVsc2UgcmV0dXJuIHN0ci5zcGxpdCgnLCcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVF1ZXN0aW9uKHRleHQsIHRleHR1cmUgPSBudWxsKVxyXG57XHJcblx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xyXG5cclxuXHQvLyBzZXQgdXAgY2FudmFzXHJcblx0bGV0IGJtcDtcclxuXHRpZighdGV4dHVyZSl7XHJcblx0XHRibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuXHRcdGJtcC53aWR0aCA9IDUxMjtcclxuXHRcdGJtcC5oZWlnaHQgPSAyNTY7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0Ym1wID0gdGV4dHVyZS5pbWFnZTtcclxuXHR9XHJcblxyXG5cdGxldCBnID0gYm1wLmdldENvbnRleHQoJzJkJyk7XHJcblx0Zy5jbGVhclJlY3QoMCwgMCwgNTEyLCAyNTYpO1xyXG5cdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcblx0Zy5maWxsU3R5bGUgPSAnYmxhY2snO1xyXG5cclxuXHQvLyB3cml0ZSB0ZXh0XHJcblx0Zy5mb250ID0gJ2JvbGQgNTBweCAnK2ZvbnRTdGFjaztcclxuXHRsZXQgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcclxuXHRmb3IobGV0IGk9MDsgaTxsaW5lcy5sZW5ndGg7IGkrKyl7XHJcblx0XHRnLmZpbGxUZXh0KGxpbmVzW2ldLCAyNTYsIDUwKzU1KmkpO1xyXG5cdH1cclxuXHJcblx0aWYodGV4dHVyZSl7XHJcblx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHRcdHJldHVybiB0ZXh0dXJlO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZShibXApO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gbWVyZ2VPYmplY3RzKGEsIGIsIGRlcHRoPTIpXHJcbntcclxuXHRmdW5jdGlvbiB1bmlxdWUoZSwgaSwgYSl7XHJcblx0XHRyZXR1cm4gYS5pbmRleE9mKGUpID09PSBpO1xyXG5cdH1cclxuXHJcblx0bGV0IGFJc09iaiA9IGEgaW5zdGFuY2VvZiBPYmplY3QsIGJJc09iaiA9IGIgaW5zdGFuY2VvZiBPYmplY3Q7XHJcblx0aWYoYUlzT2JqICYmIGJJc09iaiAmJiBkZXB0aCA+IDApXHJcblx0e1xyXG5cdFx0bGV0IHJlc3VsdCA9IHt9O1xyXG5cdFx0bGV0IGtleXMgPSBbLi4uT2JqZWN0LmtleXMoYSksIC4uLk9iamVjdC5rZXlzKGIpXS5maWx0ZXIodW5pcXVlKTtcclxuXHRcdGZvcihsZXQgaT0wOyBpPGtleXMubGVuZ3RoOyBpKyspe1xyXG5cdFx0XHRyZXN1bHRba2V5c1tpXV0gPSBtZXJnZU9iamVjdHMoYVtrZXlzW2ldXSwgYltrZXlzW2ldXSwgZGVwdGgtMSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdH1cclxuXHRlbHNlIGlmKGIgIT09IHVuZGVmaW5lZClcclxuXHRcdHJldHVybiBiO1xyXG5cdGVsc2VcclxuXHRcdHJldHVybiBhO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsYXRlVXBkYXRlKGZuKVxyXG57XHJcblx0cmV0dXJuICguLi5hcmdzKSA9PiB7XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IGZuKC4uLmFyZ3MpLCAxNSk7XHJcblx0fTtcclxufVxyXG5cclxuZXhwb3J0IHsgZ2V0R2FtZUlkLCBwYXJzZUNTViwgZ2VuZXJhdGVRdWVzdGlvbiwgbWVyZ2VPYmplY3RzLCBsYXRlVXBkYXRlIH07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBOYW1lcGxhdGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3Ioc2VhdClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XHJcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC42MzUsIDAuMjIpO1xyXG5cdFx0c2VhdC5hZGQodGhpcyk7XHJcblxyXG5cdFx0Ly8gYWRkIDNkIG1vZGVsXHJcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLm5hbWVwbGF0ZS5jaGlsZHJlblswXS5jbG9uZSgpO1xyXG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgTWF0aC5QSS8yKTtcclxuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XHJcblxyXG5cdFx0Ly8gZ2VuZXJhdGUgbWF0ZXJpYWxcclxuXHRcdHRoaXMuYm1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcblx0XHR0aGlzLmJtcC53aWR0aCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZTtcclxuXHRcdHRoaXMuYm1wLmhlaWdodCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAvIDI7XHJcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0bWFwOiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZSh0aGlzLmJtcClcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBsaXN0ZW5lciBwcm94aWVzXHJcblx0XHR0aGlzLl9ob3ZlckJlaGF2aW9yID0gbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJDb2xvcih7XHJcblx0XHRcdGNvbG9yOiBuZXcgVEhSRUUuQ29sb3IoMHhmZmE4YTgpXHJcblx0XHR9KTtcclxuXHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XHJcblx0XHR0aGlzLm1vZGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5jbGljay5iaW5kKHRoaXMpKTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0aWYoc3RhdGUgPT09ICdzZXR1cCcpXHJcblx0XHRcdFx0dGhpcy5tb2RlbC5hZGRCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHRoaXMubW9kZWwucmVtb3ZlQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZVRleHQodGV4dClcclxuXHR7XHJcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcclxuXHJcblx0XHQvLyBzZXQgdXAgY2FudmFzXHJcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XHJcblx0XHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XHJcblx0XHRnLmZpbGxTdHlsZSA9ICcjMjIyJztcclxuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XHJcblx0XHRnLmZvbnQgPSBgYm9sZCAke2ZvbnRTaXplfXB4ICR7Zm9udFN0YWNrfWA7XHJcblx0XHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xyXG5cdFx0Zy5maWxsVGV4dCh0ZXh0LCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMiwgKDAuNDIgLSAwLjEyKSooTmFtZXBsYXRlLnRleHR1cmVTaXplLzIpKTtcclxuXHJcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0fVxyXG5cclxuXHRjbGljayhlKVxyXG5cdHtcclxuXHRcdGlmKFNILmdhbWUuc3RhdGUgIT09ICdzZXR1cCcpIHJldHVybjtcclxuXHJcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyKVxyXG5cdFx0XHR0aGlzLnJlcXVlc3RKb2luKCk7XHJcblx0XHRlbHNlIGlmKHRoaXMuc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxyXG5cdFx0XHR0aGlzLnJlcXVlc3RMZWF2ZSgpO1xyXG5cdFx0ZWxzZSBpZihTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxyXG5cdFx0XHR0aGlzLnJlcXVlc3RLaWNrKCk7XHJcblx0fVxyXG5cclxuXHRyZXF1ZXN0Sm9pbigpXHJcblx0e1xyXG5cdFx0U0guc29ja2V0LmVtaXQoJ2pvaW4nLCBPYmplY3QuYXNzaWduKHtzZWF0TnVtOiB0aGlzLnNlYXQuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpO1xyXG5cdH1cclxuXHJcblx0cmVxdWVzdExlYXZlKClcclxuXHR7XHJcblx0XHRsZXQgc2VsZiA9IHRoaXM7XHJcblx0XHRpZighc2VsZi5xdWVzdGlvbilcclxuXHRcdHtcclxuXHRcdFx0c2VsZi5xdWVzdGlvbiA9IHNlbGYuc2VhdC5iYWxsb3QuYXNrUXVlc3Rpb24oJ0FyZSB5b3Ugc3VyZSB5b3VcXG53YW50IHRvIGxlYXZlPycsICdsb2NhbF9sZWF2ZScpXHJcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xyXG5cdFx0XHRcdGlmKGNvbmZpcm0pe1xyXG5cdFx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2xlYXZlJywgU0gubG9jYWxVc2VyLmlkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5jYXRjaCgoKSA9PiB7IHNlbGYucXVlc3Rpb24gPSBudWxsOyB9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJlcXVlc3RLaWNrKClcclxuXHR7XHJcblx0XHRsZXQgc2VsZiA9IHRoaXM7XHJcblx0XHRpZighc2VsZi5xdWVzdGlvbilcclxuXHRcdHtcclxuXHRcdFx0bGV0IHNlYXQgPSBTSC5zZWF0c1tTSC5wbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0uc2VhdE51bV07XHJcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWF0LmJhbGxvdC5hc2tRdWVzdGlvbihcclxuXHRcdFx0XHQnQXJlIHlvdSBzdXJlIHlvdVxcbndhbnQgdG8gdHJ5IHRvIGtpY2tcXG4nXHJcblx0XHRcdFx0K1NILnBsYXllcnNbc2VsZi5zZWF0Lm93bmVyXS5kaXNwbGF5TmFtZSxcclxuXHRcdFx0XHQnbG9jYWxfa2ljaydcclxuXHRcdFx0KVxyXG5cdFx0XHQudGhlbihjb25maXJtID0+IHtcclxuXHRcdFx0XHRpZihjb25maXJtKXtcclxuXHRcdFx0XHRcdFNILnNvY2tldC5lbWl0KCdraWNrJywgU0gubG9jYWxVc2VyLmlkLCBzZWxmLnNlYXQub3duZXIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uID0gbnVsbDtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuTmFtZXBsYXRlLnRleHR1cmVTaXplID0gMjU2O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQgKiBhcyBCYWxsb3RUeXBlIGZyb20gJy4vYmFsbG90JztcclxuaW1wb3J0IHt0cmFuc2xhdGUgYXMgdHJ9IGZyb20gJy4vdGhlbWUnO1xyXG5cclxuZnVuY3Rpb24gdXBkYXRlVm90ZXNJblByb2dyZXNzKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcclxue1xyXG5cdGxldCBiYWxsb3QgPSB0aGlzO1xyXG5cdGlmKCFiYWxsb3Quc2VhdC5vd25lcikgcmV0dXJuO1xyXG5cclxuXHRsZXQgdmlwcyA9IGdhbWUudm90ZXNJblByb2dyZXNzO1xyXG5cdGxldCBibGFja2xpc3RlZFZvdGVzID0gdmlwcy5maWx0ZXIoaWQgPT4ge1xyXG5cdFx0bGV0IHZzID0gWy4uLnZvdGVzW2lkXS55ZXNWb3RlcnMsIC4uLnZvdGVzW2lkXS5ub1ZvdGVyc107XHJcblx0XHRsZXQgbnYgPSB2b3Rlc1tpZF0ubm9uVm90ZXJzO1xyXG5cdFx0cmV0dXJuIG52LmluY2x1ZGVzKGJhbGxvdC5zZWF0Lm93bmVyKSB8fCB2cy5pbmNsdWRlcyhiYWxsb3Quc2VhdC5vd25lcik7XHJcblx0fSk7XHJcblx0bGV0IG5ld1ZvdGVzID0gdmlwcy5maWx0ZXIoXHJcblx0XHRpZCA9PiAoIVNILmdhbWUudm90ZXNJblByb2dyZXNzIHx8ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcy5pbmNsdWRlcyhpZCkpICYmICFibGFja2xpc3RlZFZvdGVzLmluY2x1ZGVzKGlkKVxyXG5cdCk7XHJcblx0bGV0IGZpbmlzaGVkVm90ZXMgPSAhU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MgPyBibGFja2xpc3RlZFZvdGVzXHJcblx0XHQ6IFNILmdhbWUudm90ZXNJblByb2dyZXNzLmZpbHRlcihpZCA9PiAhdmlwcy5pbmNsdWRlcyhpZCkpLmNvbmNhdChibGFja2xpc3RlZFZvdGVzKTtcclxuXHJcblx0bmV3Vm90ZXMuZm9yRWFjaCh2SWQgPT5cclxuXHR7XHJcblx0XHQvLyBnZW5lcmF0ZSBuZXcgcXVlc3Rpb24gdG8gYXNrXHJcblx0XHRsZXQgcXVlc3Rpb25UZXh0LCBvcHRzID0ge307XHJcblx0XHRpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdlbGVjdCcpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSBwbGF5ZXJzW2dhbWUucHJlc2lkZW50XS5kaXNwbGF5TmFtZVxyXG5cdFx0XHRcdCsgYCBmb3IgJHt0cigncHJlc2lkZW50Jyl9IGFuZCBgXHJcblx0XHRcdFx0KyBwbGF5ZXJzW2dhbWUuY2hhbmNlbGxvcl0uZGlzcGxheU5hbWVcclxuXHRcdFx0XHQrIGAgZm9yICR7dHIoJ2NoYW5jZWxsb3InKX0/YDtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAnam9pbicpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSB2b3Rlc1t2SWRdLmRhdGEgKyAnIHRvIGpvaW4/JztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAna2ljaycpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSAnVm90ZSB0byBraWNrICdcclxuXHRcdFx0XHQrIHBsYXllcnNbdm90ZXNbdklkXS50YXJnZXQxXS5kaXNwbGF5TmFtZVxyXG5cdFx0XHRcdCsgJz8nO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICd0dXRvcmlhbCcpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSAnUGxheSB0dXRvcmlhbD8nO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdjb25maXJtUm9sZScpXHJcblx0XHR7XHJcblx0XHRcdG9wdHMuY2hvaWNlcyA9IEJhbGxvdFR5cGUuQ09ORklSTTtcclxuXHRcdFx0bGV0IHJvbGU7XHJcblx0XHRcdGlmKGJhbGxvdC5zZWF0Lm93bmVyID09PSBTSC5sb2NhbFVzZXIuaWQpe1xyXG5cdFx0XHRcdHJvbGUgPSBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0ucm9sZTtcclxuXHRcdFx0XHRyb2xlID0gdHIocm9sZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHJvbGUuc2xpY2UoMSkpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdHJvbGUgPSAnPFJFREFDVEVEPic7XHJcblx0XHRcdH1cclxuXHRcdFx0cXVlc3Rpb25UZXh0ID0gJ1lvdXIgcm9sZTpcXG4nICsgcm9sZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZihxdWVzdGlvblRleHQpXHJcblx0XHR7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbihxdWVzdGlvblRleHQsIHZJZCwgb3B0cylcclxuXHRcdFx0LnRoZW4oYW5zd2VyID0+IHtcclxuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgndm90ZScsIHZJZCwgU0gubG9jYWxVc2VyLmlkLCBhbnN3ZXIpO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuY2F0Y2goKCkgPT4gY29uc29sZS5sb2coJ1ZvdGUgc2NydWJiZWQ6JywgdklkKSk7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGlmKGZpbmlzaGVkVm90ZXMuaW5jbHVkZXMoYmFsbG90LmRpc3BsYXllZCkpe1xyXG5cdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxyXG57XHJcblx0bGV0IGJhbGxvdCA9IHRoaXM7XHJcblxyXG5cdGZ1bmN0aW9uIGNob29zZVBsYXllcihxdWVzdGlvbiwgY29uZmlybVF1ZXN0aW9uLCBpZClcclxuXHR7XHJcblx0XHRmdW5jdGlvbiBjb25maXJtUGxheWVyKHVzZXJJZClcclxuXHRcdHtcclxuXHRcdFx0bGV0IHVzZXJuYW1lID0gU0gucGxheWVyc1t1c2VySWRdLmRpc3BsYXlOYW1lO1xyXG5cdFx0XHRsZXQgdGV4dCA9IGNvbmZpcm1RdWVzdGlvbi5yZXBsYWNlKCd7fScsIHVzZXJuYW1lKTtcclxuXHRcdFx0cmV0dXJuIGJhbGxvdC5hc2tRdWVzdGlvbih0ZXh0LCAnbG9jYWxfJytpZCsnX2NvbmZpcm0nKVxyXG5cdFx0XHQudGhlbihjb25maXJtZWQgPT4ge1xyXG5cdFx0XHRcdGlmKGNvbmZpcm1lZCl7XHJcblx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHVzZXJJZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGNob29zZVBsYXllcihxdWVzdGlvbiwgY29uZmlybVF1ZXN0aW9uLCBpZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gYmFsbG90LmFza1F1ZXN0aW9uKHF1ZXN0aW9uLCAnbG9jYWxfJytpZCwge2Nob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNUfSlcclxuXHRcdC50aGVuKGNvbmZpcm1QbGF5ZXIpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gaGlkZU5vbWluYXRlUGxhY2Vob2xkZXIoe2RhdGE6IHtnYW1lfX0pXHJcblx0e1xyXG5cdFx0aWYoZ2FtZS5zdGF0ZSAhPT0gJ25vbWluYXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfY2hhbmNlbGxvcicpe1xyXG5cdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdFx0fVxyXG5cdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZU5vbWluYXRlUGxhY2Vob2xkZXIpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gaGlkZVBvbGljeVBsYWNlaG9sZGVyKHtkYXRhOiB7Z2FtZX19KVxyXG5cdHtcclxuXHRcdGlmKGdhbWUuc3RhdGUgIT09ICdwb2xpY3kxJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcG9saWN5MScgfHxcclxuXHRcdFx0Z2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTInICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wb2xpY3kyJ1xyXG5cdFx0KXtcclxuXHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdH1cclxuXHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVQb2xpY3lQbGFjZWhvbGRlcik7XHJcblx0fVxyXG5cclxuXHRpZihnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcclxuXHRcdFx0Y2hvb3NlUGxheWVyKGBDaG9vc2UgeW91ciAke3RyKCdjaGFuY2VsbG9yJyl9IWAsIGBOYW1lIHt9IGFzICR7dHIoJ2NoYW5jZWxsb3InKX0/YCwgJ25vbWluYXRlJylcclxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcclxuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbm9taW5hdGUnLCB1c2VySWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oYENob29zZSB5b3VyICR7dHIoJ2NoYW5jZWxsb3InKX0hYCwgJ3dhaXRfZm9yX2NoYW5jZWxsb3InLCB7XHJcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXHJcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcclxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdub21pbmF0ZSdcclxuXHRcdFx0fSk7XHJcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVOb21pbmF0ZVBsYWNlaG9sZGVyKTtcclxuXHRcdH1cclxuXHR9XHJcblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncG9saWN5MScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxyXG5cdHtcclxuXHRcdGxldCBvcHRzID0ge2Nob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLCBwb2xpY3lIYW5kOiBnYW1lLmhhbmR9O1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkICE9PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdE9iamVjdC5hc3NpZ24ob3B0cywge2Zha2U6IHRydWUsIGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTEnfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdDaG9vc2Ugb25lXFxudG8gZGlzY2FyZCEnLCAnbG9jYWxfcG9saWN5MScsIG9wdHMpXHJcblx0XHQudGhlbihkaXNjYXJkID0+IHtcclxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2Rpc2NhcmRfcG9saWN5MScsIGRpc2NhcmQpO1xyXG5cdFx0fSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlUG9saWN5UGxhY2Vob2xkZXIpO1xyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdwb2xpY3kyJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5jaGFuY2VsbG9yKVxyXG5cdHtcclxuXHRcdGxldCBvcHRzID0ge1xyXG5cdFx0XHRjaG9pY2VzOiBCYWxsb3RUeXBlLlBPTElDWSxcclxuXHRcdFx0cG9saWN5SGFuZDogZ2FtZS5oYW5kLFxyXG5cdFx0XHRpbmNsdWRlVmV0bzogZ2FtZS5mYXNjaXN0UG9saWNpZXMgPT09IDUgJiYgIWJhbGxvdC5ibG9ja1ZldG9cclxuXHRcdH07XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgIT09IGdhbWUuY2hhbmNlbGxvcil7XHJcblx0XHRcdE9iamVjdC5hc3NpZ24ob3B0cywge2Zha2U6IHRydWUsIGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTInfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdDaG9vc2Ugb25lXFxudG8gZGlzY2FyZCEnLCAnbG9jYWxfcG9saWN5MicsIG9wdHMpXHJcblx0XHQudGhlbihkaXNjYXJkID0+IHtcclxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2Rpc2NhcmRfcG9saWN5MicsIGRpc2NhcmQpO1xyXG5cdFx0fSwgZXJyID0+IGNvbnNvbGUuZXJyb3IoZXJyKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlUG9saWN5UGxhY2Vob2xkZXIpO1xyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdpbnZlc3RpZ2F0ZScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxyXG5cdHtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xyXG5cdFx0XHRjaG9vc2VQbGF5ZXIoJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIG9uZSBwbGF5ZXIgdG8gaW52ZXN0aWdhdGUhJywgJ0ludmVzdGlnYXRlIHt9PycsICdpbnZlc3RpZ2F0ZScpXHJcblx0XHRcdC50aGVuKHVzZXJJZCA9PiB7XHJcblx0XHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XHJcblx0XHRcdFx0XHR0eXBlOiAnaW52ZXN0aWdhdGUnLFxyXG5cdFx0XHRcdFx0ZGF0YTogdXNlcklkXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2Ugb25lIHBsYXllciB0byBpbnZlc3RpZ2F0ZSEnLCAnd2FpdF9mb3JfaW52ZXN0aWdhdGUnLCB7XHJcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXHJcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcclxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdpbnZlc3RpZ2F0ZSdcclxuXHRcdFx0fSk7XHJcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0XHRpZihzdGF0ZSAhPT0gJ2ludmVzdGlnYXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfaW52ZXN0aWdhdGUnKVxyXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdwZWVrJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0bGV0IG9wdHMgPSB7Y2hvaWNlczogQmFsbG90VHlwZS5QT0xJQ1ksIHBvbGljeUhhbmQ6IDggfCAoZ2FtZS5kZWNrJjcpfTtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCAhPT0gZ2FtZS5wcmVzaWRlbnQpe1xyXG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwZWVrJ30pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBUb3Agb2YgcG9saWN5IGRlY2snLCAnbG9jYWxfcGVlaycsIG9wdHMpXHJcblx0XHQudGhlbihkaXNjYXJkID0+IHtcclxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2NvbnRpbnVlJyk7XHJcblx0XHR9KTtcclxuXHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0aWYoc3RhdGUgIT09ICdwZWVrJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcGVlaycpXHJcblx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcclxuXHRcdH07XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICduYW1lU3VjY2Vzc29yJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdGNob29zZVBsYXllcihgRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgdGhlIG5leHQgJHt0cigncHJlc2lkZW50Jyl9IWAsIGB7fSBmb3IgJHt0cigncHJlc2lkZW50Jyl9P2AsICduYW1lU3VjY2Vzc29yJylcclxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcclxuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbmFtZV9zdWNjZXNzb3InLCB1c2VySWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oYEV4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIHRoZSBuZXh0ICR7dHIoJ3ByZXNpZGVudCcpfSFgLCAnd2FpdF9mb3Jfc3VjY2Vzc29yJywge1xyXG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxyXG5cdFx0XHRcdGZha2U6IHRydWUsXHJcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAnbmFtZVN1Y2Nlc3NvcidcclxuXHRcdFx0fSk7XHJcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcclxuXHRcdFx0XHRpZihzdGF0ZSAhPT0gJ25hbWVTdWNjZXNzb3InICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICd3YWl0X2Zvcl9zdWNjZXNzb3InKVxyXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdleGVjdXRlJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdGNob29zZVBsYXllcignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgYSBwbGF5ZXIgdG8gZXhlY3V0ZSEnLCAnRXhlY3V0ZSB7fT8nLCAnZXhlY3V0ZScpXHJcblx0XHRcdC50aGVuKHVzZXJJZCA9PiB7XHJcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2V4ZWN1dGUnLCB1c2VySWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIGEgcGxheWVyIHRvIGV4ZWN1dGUhJywgJ3dhaXRfZm9yX2V4ZWN1dGUnLCB7XHJcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXHJcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcclxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdleGVjdXRlJ1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0bGV0IGNsZWFuVXBGYWtlVm90ZSA9ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xyXG5cdFx0XHRcdGlmKHN0YXRlICE9PSAnZXhlY3V0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2V4ZWN1dGUnKVxyXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICd2ZXRvJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQXBwcm92ZSB2ZXRvPycsICdsb2NhbF92ZXRvJykudGhlbihhcHByb3ZlZCA9PiB7XHJcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2NvbmZpcm1fdmV0bycsIGFwcHJvdmVkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdBcHByb3ZlIHZldG8/JywgJ3dhaXRfZm9yX3ZldG8nLCB7XHJcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcclxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICd2ZXRvJ1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0bGV0IGNsZWFuVXBGYWtlVm90ZSA9ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xyXG5cdFx0XHRcdGlmKHN0YXRlICE9PSAndmV0bycgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX3ZldG8nKVxyXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3ZldG8nKXtcclxuXHRcdGJhbGxvdC5ibG9ja1ZldG8gPSB0cnVlO1xyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnKXtcclxuXHRcdGJhbGxvdC5ibG9ja1ZldG8gPSBmYWxzZTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7dXBkYXRlVm90ZXNJblByb2dyZXNzLCB1cGRhdGVTdGF0ZX07IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuLypcclxuKiBEZWNrcyBoYXZlIDE3IGNhcmRzOiA2IGxpYmVyYWwsIDExIGZhc2Npc3QuXHJcbiogSW4gYml0LXBhY2tlZCBib29sZWFuIGFycmF5cywgMSBpcyBsaWJlcmFsLCAwIGlzIGZhc2Npc3QuXHJcbiogVGhlIG1vc3Qgc2lnbmlmaWNhbnQgYml0IGlzIGFsd2F5cyAxLlxyXG4qIEUuZy4gMGIxMDEwMDEgcmVwcmVzZW50cyBhIGRlY2sgd2l0aCAyIGxpYmVyYWwgYW5kIDMgZmFzY2lzdCBjYXJkc1xyXG4qL1xyXG5cclxubGV0IEZVTExfREVDSyA9IDB4MjAwM2YsXHJcblx0RkFTQ0lTVCA9IDAsXHJcblx0TElCRVJBTCA9IDE7XHJcblxyXG5sZXQgcG9zaXRpb25zID0gW1xyXG5cdDB4MSwgMHgyLCAweDQsIDB4OCxcclxuXHQweDEwLCAweDIwLCAweDQwLCAweDgwLFxyXG5cdDB4MTAwLCAweDIwMCwgMHg0MDAsIDB4ODAwLFxyXG5cdDB4MTAwMCwgMHgyMDAwLCAweDQwMDAsIDB4ODAwMCxcclxuXHQweDEwMDAwLCAweDIwMDAwLCAweDQwMDAwXHJcbl07XHJcblxyXG5mdW5jdGlvbiBsZW5ndGgoZGVjaylcclxue1xyXG5cdHJldHVybiBwb3NpdGlvbnMuZmluZEluZGV4KHMgPT4gcyA+IGRlY2spIC0xO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzaHVmZmxlKGRlY2spXHJcbntcclxuXHRsZXQgbCA9IGxlbmd0aChkZWNrKTtcclxuXHRmb3IobGV0IGk9bC0xOyBpPjA7IGktLSlcclxuXHR7XHJcblx0XHRsZXQgbyA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGkpO1xyXG5cdFx0bGV0IGlWYWwgPSBkZWNrICYgMSA8PCBpLCBvVmFsID0gZGVjayAmIDEgPDwgbztcclxuXHRcdGxldCBzd2FwcGVkID0gaVZhbCA+Pj4gaS1vIHwgb1ZhbCA8PCBpLW87XHJcblx0XHRkZWNrID0gZGVjayAtIGlWYWwgLSBvVmFsICsgc3dhcHBlZDtcclxuXHR9XHJcblxyXG5cdHJldHVybiBkZWNrO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3VGhyZWUoZClcclxue1xyXG5cdHJldHVybiBkIDwgOCA/IFsxLCBkXSA6IFtkID4+PiAzLCA4IHwgZCAmIDddO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXNjYXJkT25lKGRlY2ssIHBvcylcclxue1xyXG5cdGxldCBib3R0b21IYWxmID0gZGVjayAmICgxIDw8IHBvcyktMTtcclxuXHRsZXQgdG9wSGFsZiA9IGRlY2sgJiB+KCgxIDw8IHBvcysxKS0xKTtcclxuXHR0b3BIYWxmID4+Pj0gMTtcclxuXHRsZXQgbmV3RGVjayA9IHRvcEhhbGYgfCBib3R0b21IYWxmO1xyXG5cdFxyXG5cdGxldCB2YWwgPSAoZGVjayAmIDE8PHBvcykgPj4+IHBvcztcclxuXHJcblx0cmV0dXJuIFtuZXdEZWNrLCB2YWxdO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhcHBlbmQoZGVjaywgdmFsKVxyXG57XHJcblx0cmV0dXJuIGRlY2sgPDwgMSB8IHZhbDtcclxufVxyXG5cclxuZnVuY3Rpb24gdG9BcnJheShkZWNrKVxyXG57XHJcblx0bGV0IGFyciA9IFtdO1xyXG5cdHdoaWxlKGRlY2sgPiAxKXtcclxuXHRcdGFyci5wdXNoKGRlY2sgJiAxKTtcclxuXHRcdGRlY2sgPj4+PSAxO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIGFycjtcclxufVxyXG5cclxuZXhwb3J0IHtsZW5ndGgsIHNodWZmbGUsIGRyYXdUaHJlZSwgZGlzY2FyZE9uZSwgYXBwZW5kLCB0b0FycmF5LCBGVUxMX0RFQ0ssIExJQkVSQUwsIEZBU0NJU1R9OyIsIid1c2Ugc3RyaWN0OydcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7IEJsYW5rQ2FyZCwgSmFDYXJkLCBOZWluQ2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxQb2xpY3lDYXJkLCBWZXRvQ2FyZCB9IGZyb20gJy4vY2FyZCc7XHJcbmltcG9ydCB7IGdlbmVyYXRlUXVlc3Rpb24sIGxhdGVVcGRhdGUgfSBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0ICogYXMgQlAgZnJvbSAnLi9iYWxsb3Rwcm9jZXNzb3InO1xyXG5pbXBvcnQgKiBhcyBCUEJBIGZyb20gJy4vYnBiYSc7XHJcbmltcG9ydCB7TlRleHQsIFBsYWNlaG9sZGVyTWVzaH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcclxuXHJcbmxldCBQTEFZRVJTRUxFQ1QgPSAwO1xyXG5sZXQgQ09ORklSTSA9IDE7XHJcbmxldCBCSU5BUlkgPSAyO1xyXG5sZXQgUE9MSUNZID0gMztcclxuXHJcbmNsYXNzIEJhbGxvdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcihzZWF0KVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xyXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLTAuMywgMC4yNSk7XHJcblx0XHR0aGlzLnJvdGF0aW9uLnNldCguNSwgTWF0aC5QSSwgMCk7XHJcblx0XHRzZWF0LmFkZCh0aGlzKTtcclxuXHJcblx0XHR0aGlzLmxhc3RRdWV1ZWQgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdHRoaXMuZGlzcGxheWVkID0gbnVsbDtcclxuXHRcdHRoaXMuYmxvY2tWZXRvID0gZmFsc2U7XHJcblxyXG5cdFx0dGhpcy5feWVzQ2xpY2tIYW5kbGVyID0gbnVsbDtcclxuXHRcdHRoaXMuX25vQ2xpY2tIYW5kbGVyID0gbnVsbDtcclxuXHRcdHRoaXMuX25vbWluYXRlSGFuZGxlciA9IG51bGw7XHJcblx0XHR0aGlzLl9jYW5jZWxIYW5kbGVyID0gbnVsbDtcclxuXHJcblx0XHR0aGlzLmphQ2FyZCA9IG5ldyBKYUNhcmQoKTtcclxuXHRcdHRoaXMubmVpbkNhcmQgPSBuZXcgTmVpbkNhcmQoKTtcclxuXHRcdFt0aGlzLmphQ2FyZCwgdGhpcy5uZWluQ2FyZF0uZm9yRWFjaChjID0+IHtcclxuXHRcdFx0Yy5wb3NpdGlvbi5zZXQoYyBpbnN0YW5jZW9mIEphQ2FyZCA/IC0wLjEgOiAwLjEsIC0wLjEsIDApO1xyXG5cdFx0XHRjLnNjYWxlLnNldFNjYWxhcigwLjE1KTtcclxuXHRcdFx0Yy52aXNpYmxlID0gZmFsc2U7XHJcblx0XHR9KTtcclxuXHRcdHRoaXMuYWRkKHRoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkKTtcclxuXHRcdHRoaXMucG9saWNpZXMgPSBbXTtcclxuXHJcblx0XHQvL2xldCBnZW8gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSgwLjQsIDAuMik7XHJcblx0XHQvL2xldCBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe3RyYW5zcGFyZW50OiB0cnVlLCBzaWRlOiBUSFJFRS5Eb3VibGVTaWRlfSk7XHJcblx0XHR0aGlzLnF1ZXN0aW9uID0gUGxhY2Vob2xkZXJNZXNoLmNsb25lKCk7XHJcblx0XHR0aGlzLnF1ZXN0aW9uLnBvc2l0aW9uLnNldCgwLCAwLjA1LCAwKTtcclxuXHRcdHRoaXMucXVlc3Rpb24uc2NhbGUuc2V0U2NhbGFyKC41KTtcclxuXHRcdHRoaXMucXVlc3Rpb24udmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5xdWVzdGlvbik7XHJcblxyXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50ID0gbmV3IE5UZXh0KHRoaXMucXVlc3Rpb24pO1xyXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7d2lkdGg6IDEuMSwgaGVpZ2h0OiAuNCwgZm9udFNpemU6IDEsIHZlcnRpY2FsQWxpZ246ICd0b3AnfSk7XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3ZvdGVzSW5Qcm9ncmVzcycsIEJQLnVwZGF0ZVZvdGVzSW5Qcm9ncmVzcy5iaW5kKHRoaXMpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUoQlAudXBkYXRlU3RhdGUuYmluZCh0aGlzKSkpO1xyXG5cdH1cclxuXHJcblx0YXNrUXVlc3Rpb24ocVRleHQsIGlkLCB7Y2hvaWNlcyA9IEJJTkFSWSwgcG9saWN5SGFuZCA9IDB4MSwgaW5jbHVkZVZldG8gPSBmYWxzZSwgZmFrZSA9IGZhbHNlLCBpc0ludmFsaWQgPSAoKSA9PiB0cnVlfSA9IHt9KVxyXG5cdHtcclxuXHRcdGxldCBzZWxmID0gdGhpcztcclxuXHJcblx0XHRmdW5jdGlvbiBpc1ZvdGVWYWxpZCgpXHJcblx0XHR7XHJcblx0XHRcdGxldCBpc0Zha2VWYWxpZCA9IGZha2UgJiYgIWlzSW52YWxpZCgpO1xyXG5cdFx0XHRsZXQgaXNMb2NhbFZvdGUgPSAvXmxvY2FsLy50ZXN0KGlkKTtcclxuXHRcdFx0bGV0IGlzRmlyc3RVcGRhdGUgPSAhU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3M7XHJcblx0XHRcdGxldCB2b3RlID0gU0gudm90ZXNbaWRdO1xyXG5cdFx0XHRsZXQgdm90ZXJzID0gdm90ZSA/IFsuLi52b3RlLnllc1ZvdGVycywgLi4udm90ZS5ub1ZvdGVyc10gOiBbXTtcclxuXHRcdFx0bGV0IGFscmVhZHlWb3RlZCA9IHZvdGVycy5pbmNsdWRlcyhzZWxmLnNlYXQub3duZXIpO1xyXG5cdFx0XHRyZXR1cm4gaXNMb2NhbFZvdGUgfHwgaXNGaXJzdFVwZGF0ZSB8fCBpc0Zha2VWYWxpZCB8fCB2b3RlICYmICFhbHJlYWR5Vm90ZWQ7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gaG9va1VwUXVlc3Rpb24oKXtcclxuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKHF1ZXN0aW9uRXhlY3V0b3IpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIHF1ZXN0aW9uRXhlY3V0b3IocmVzb2x2ZSwgcmVqZWN0KVxyXG5cdFx0e1xyXG5cdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBpcyBzdGlsbCByZWxldmFudFxyXG5cdFx0XHRpZighaXNWb3RlVmFsaWQoKSl7XHJcblx0XHRcdFx0cmV0dXJuIHJlamVjdCgnVm90ZSBubyBsb25nZXIgdmFsaWQnKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2hvdyB0aGUgYmFsbG90XHJcblx0XHRcdC8vc2VsZi5xdWVzdGlvbi5tYXRlcmlhbC5tYXAgPSBnZW5lcmF0ZVF1ZXN0aW9uKHFUZXh0LCBzZWxmLnF1ZXN0aW9uLm1hdGVyaWFsLm1hcCk7XHJcblx0XHRcdHNlbGYudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6IGAke3FUZXh0fWB9KTtcclxuXHRcdFx0c2VsZi5xdWVzdGlvbi52aXNpYmxlID0gdHJ1ZTtcclxuXHJcblx0XHRcdC8vIGhvb2sgdXAgcS9hIGNhcmRzXHJcblx0XHRcdGlmKGNob2ljZXMgPT09IENPTkZJUk0gfHwgY2hvaWNlcyA9PT0gQklOQVJZKXtcclxuXHRcdFx0XHRzZWxmLmphQ2FyZC52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0XHRpZighZmFrZSlcclxuXHRcdFx0XHRcdHNlbGYuamFDYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCgneWVzJywgcmVzb2x2ZSwgcmVqZWN0KSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYoY2hvaWNlcyA9PT0gQklOQVJZKXtcclxuXHRcdFx0XHRzZWxmLm5laW5DYXJkLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRcdGlmKCFmYWtlKVxyXG5cdFx0XHRcdFx0c2VsZi5uZWluQ2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQoJ25vJywgcmVzb2x2ZSwgcmVqZWN0KSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZihjaG9pY2VzID09PSBQTEFZRVJTRUxFQ1QgJiYgIWZha2Upe1xyXG5cdFx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3BsYXllclNlbGVjdCcsIHJlc3BvbmQoJ3BsYXllcicsIHJlc29sdmUsIHJlamVjdCkpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUE9MSUNZKXtcclxuXHRcdFx0XHRsZXQgY2FyZHMgPSBCUEJBLnRvQXJyYXkocG9saWN5SGFuZCk7XHJcblx0XHRcdFx0aWYoaW5jbHVkZVZldG8pIGNhcmRzLnB1c2goLTEpO1xyXG5cdFx0XHRcdGNhcmRzLmZvckVhY2goKHZhbCwgaSwgYXJyKSA9PlxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGxldCBjYXJkID0gbnVsbDtcclxuXHRcdFx0XHRcdGlmKGZha2UpXHJcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgQmxhbmtDYXJkKCk7XHJcblx0XHRcdFx0XHRlbHNlIGlmKHZhbCA9PT0gLTEpXHJcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgVmV0b0NhcmQoKTtcclxuXHRcdFx0XHRcdGVsc2UgaWYodmFsID09PSBCUEJBLkxJQkVSQUwpXHJcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgTGliZXJhbFBvbGljeUNhcmQoKTtcclxuXHRcdFx0XHRcdGVsc2VcclxuXHRcdFx0XHRcdFx0Y2FyZCA9IG5ldyBGYXNjaXN0UG9saWN5Q2FyZCgpO1xyXG5cclxuXHRcdFx0XHRcdGNhcmQuc2NhbGUuc2V0U2NhbGFyKDAuMTUpO1xyXG5cclxuXHRcdFx0XHRcdGxldCB3aWR0aCA9IC4xNSAqIGFyci5sZW5ndGg7XHJcblx0XHRcdFx0XHRsZXQgeCA9IC13aWR0aC8yICsgLjE1KmkgKyAuMDc1O1xyXG5cdFx0XHRcdFx0Y2FyZC5wb3NpdGlvbi5zZXQoeCwgLTAuMDcsIDApO1xyXG5cdFx0XHRcdFx0c2VsZi5hZGQoY2FyZCk7XHJcblx0XHRcdFx0XHRzZWxmLnBvbGljaWVzLnB1c2goY2FyZCk7XHJcblxyXG5cdFx0XHRcdFx0aWYoIWZha2UpXHJcblx0XHRcdFx0XHRcdGNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKHZhbCA9PT0gLTEgPyAtMSA6IGksIHJlc29sdmUsIHJlamVjdCkpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbmNlbFZvdGUnLCByZXNwb25kKCdjYW5jZWwnLCByZXNvbHZlLCByZWplY3QpKTtcclxuXHJcblx0XHRcdHNlbGYuZGlzcGxheWVkID0gaWQ7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gcmVzcG9uZChhbnN3ZXIsIHJlc29sdmUsIHJlamVjdClcclxuXHRcdHtcclxuXHRcdFx0ZnVuY3Rpb24gaGFuZGxlcihldnQpXHJcblx0XHRcdHtcclxuXHRcdFx0XHQvLyBtYWtlIHN1cmUgb25seSB0aGUgb3duZXIgb2YgdGhlIGJhbGxvdCBpcyBhbnN3ZXJpbmdcclxuXHRcdFx0XHRpZihhbnN3ZXIgIT09ICdjYW5jZWwnICYmIHNlbGYuc2VhdC5vd25lciAhPT0gU0gubG9jYWxVc2VyLmlkKSByZXR1cm47XHJcblxyXG5cdFx0XHRcdC8vIGNsZWFuIHVwXHJcblx0XHRcdFx0c2VsZi5qYUNhcmQudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHRcdHNlbGYubmVpbkNhcmQudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHRcdHNlbGYucXVlc3Rpb24udmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHRcdHNlbGYuZGlzcGxheWVkID0gbnVsbDtcclxuXHRcdFx0XHRzZWxmLnJlbW92ZSguLi5zZWxmLnBvbGljaWVzKTtcclxuXHRcdFx0XHRzZWxmLnBvbGljaWVzID0gW107XHJcblxyXG5cdFx0XHRcdHNlbGYuamFDYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgc2VsZi5feWVzQ2xpY2tIYW5kbGVyKTtcclxuXHRcdFx0XHRzZWxmLm5laW5DYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgc2VsZi5fbm9DbGlja0hhbmRsZXIpO1xyXG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BsYXllclNlbGVjdCcsIHNlbGYuX25vbWluYXRlSGFuZGxlcik7XHJcblx0XHRcdFx0c2VsZi5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5jZWxWb3RlJywgc2VsZi5fY2FuY2VsSGFuZGxlcik7XHJcblxyXG5cdFx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgYW5zd2VyIHN0aWxsIG1hdHRlcnNcclxuXHRcdFx0XHRpZighaXNWb3RlVmFsaWQoKSB8fCBhbnN3ZXIgPT09ICdjYW5jZWwnKXtcclxuXHRcdFx0XHRcdHJlamVjdCgndm90ZSBjYW5jZWxsZWQnKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICd5ZXMnKVxyXG5cdFx0XHRcdFx0cmVzb2x2ZSh0cnVlKTtcclxuXHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ25vJylcclxuXHRcdFx0XHRcdHJlc29sdmUoZmFsc2UpO1xyXG5cdFx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAncGxheWVyJylcclxuXHRcdFx0XHRcdHJlc29sdmUoZXZ0LmRhdGEpO1xyXG5cdFx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUE9MSUNZKVxyXG5cdFx0XHRcdFx0cmVzb2x2ZShhbnN3ZXIpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZihhbnN3ZXIgPT09ICd5ZXMnKVxyXG5cdFx0XHRcdHNlbGYuX3llc0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XHJcblx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnbm8nKVxyXG5cdFx0XHRcdHNlbGYuX25vQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcclxuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdwbGF5ZXInKVxyXG5cdFx0XHRcdHNlbGYuX25vbWluYXRlSGFuZGxlciA9IGhhbmRsZXI7XHJcblx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnY2FuY2VsJylcclxuXHRcdFx0XHRzZWxmLl9jYW5jZWxIYW5kbGVyID0gaGFuZGxlcjtcclxuXHJcblx0XHRcdHJldHVybiBoYW5kbGVyO1xyXG5cdFx0fVxyXG5cclxuXHRcdHNlbGYubGFzdFF1ZXVlZCA9IHNlbGYubGFzdFF1ZXVlZC50aGVuKGhvb2tVcFF1ZXN0aW9uLCBob29rVXBRdWVzdGlvbik7XHJcblxyXG5cdFx0cmV0dXJuIHNlbGYubGFzdFF1ZXVlZDtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7QmFsbG90LCBQTEFZRVJTRUxFQ1QsIENPTkZJUk0sIEJJTkFSWSwgUE9MSUNZfTsiLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQge0Zhc2Npc3RSb2xlQ2FyZCwgSGl0bGVyUm9sZUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZH0gZnJvbSAnLi9jYXJkJztcclxuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0IHtOQmlsbGJvYXJkfSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxheWVySW5mbyBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcihzZWF0KVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xyXG5cdFx0dGhpcy5jYXJkID0gbnVsbDtcclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAsIDAuMyk7XHJcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjMpO1xyXG5cdFx0c2VhdC5hZGQodGhpcyk7XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgbGF0ZVVwZGF0ZSh0aGlzLnVwZGF0ZVN0YXRlLmJpbmQodGhpcykpKTtcclxuXHRcdC8vU0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlVHVybk9yZGVyLmJpbmQodGhpcykpO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2ludmVzdGlnYXRlJywgdGhpcy5wcmVzZW50UGFydHkuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVUdXJuT3JkZXIoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXHJcblx0e1xyXG5cdFx0U0guX3VzZXJQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRsZXQgbG9jYWxQbGF5ZXIgPSBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF07XHJcblx0XHRcdGlmKGxvY2FsUGxheWVyKXtcclxuXHRcdFx0XHRsZXQgcGxheWVyUG9zID0gdGhpcy53b3JsZFRvTG9jYWwoU0guc2VhdHNbbG9jYWxQbGF5ZXIuc2VhdE51bV0uZ2V0V29ybGRQb3NpdGlvbigpKTtcclxuXHRcdFx0XHR0aGlzLmxvb2tBdChwbGF5ZXJQb3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZVN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcclxuXHR7XHJcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ25pZ2h0JyAmJiBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0gfHwgZ2FtZS5zdGF0ZSA9PT0gJ2RvbmUnKXtcclxuXHRcdFx0dGhpcy5wcmVzZW50Um9sZShnYW1lLCBwbGF5ZXJzLCB2b3Rlcyk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnbGFtZUR1Y2snKVxyXG5cdFx0XHR0aGlzLnByZXNlbnRWb3RlKGdhbWUsIHBsYXllcnMsIHZvdGVzKTtcclxuXHJcblx0XHRlbHNlIGlmKHRoaXMuY2FyZCAhPT0gbnVsbClcclxuXHRcdHtcclxuXHRcdFx0dGhpcy5yZW1vdmUodGhpcy5jYXJkKTtcclxuXHRcdFx0dGhpcy5jYXJkID0gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByZXNlbnRSb2xlKGdhbWUsIHBsYXllcnMpXHJcblx0e1xyXG5cdFx0aWYodGhpcy5jYXJkICE9PSBudWxsKXtcclxuXHRcdFx0dGhpcy5yZW1vdmUodGhpcy5jYXJkKTtcclxuXHRcdFx0dGhpcy5jYXJkID0gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgbG9jYWxQbGF5ZXIgPSBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF07XHJcblx0XHRsZXQgc2VhdGVkUGxheWVyID0gcGxheWVyc1t0aGlzLnNlYXQub3duZXJdO1xyXG5cclxuXHRcdGxldCBzZWF0ZWRSb2xlU2hvdWxkQmVWaXNpYmxlID1cclxuXHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ2RvbmUnIHx8XHJcblx0XHRcdFNILmxvY2FsVXNlci5pZCA9PT0gdGhpcy5zZWF0Lm93bmVyIHx8XHJcblx0XHRcdGxvY2FsUGxheWVyLnJvbGUgPT09ICdmYXNjaXN0JyAmJiAoc2VhdGVkUGxheWVyLnJvbGUgPT09ICdmYXNjaXN0JyB8fCBzZWF0ZWRQbGF5ZXIucm9sZSA9PT0gJ2hpdGxlcicpIHx8XHJcblx0XHRcdGxvY2FsUGxheWVyLnJvbGUgPT09ICdoaXRsZXInICYmIHNlYXRlZFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgJiYgZ2FtZS50dXJuT3JkZXIubGVuZ3RoIDwgNztcclxuXHJcblx0XHRpZihzZWF0ZWRSb2xlU2hvdWxkQmVWaXNpYmxlKVxyXG5cdFx0e1xyXG5cdFx0XHRzd2l0Y2goc2VhdGVkUGxheWVyLnJvbGUpe1xyXG5cdFx0XHRcdGNhc2UgJ2Zhc2Npc3QnOiB0aGlzLmNhcmQgPSBuZXcgRmFzY2lzdFJvbGVDYXJkKCk7IGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2hpdGxlcicgOiB0aGlzLmNhcmQgPSBuZXcgSGl0bGVyUm9sZUNhcmQoKTsgIGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2xpYmVyYWwnOiB0aGlzLmNhcmQgPSBuZXcgTGliZXJhbFJvbGVDYXJkKCk7IGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGlzLmFkZCh0aGlzLmNhcmQpO1xyXG5cdFx0XHRsZXQgYmIgPSBuZXcgTkJpbGxib2FyZCh0aGlzLmNhcmQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJlc2VudFZvdGUoZ2FtZSwgXywgdm90ZXMpXHJcblx0e1xyXG5cdFx0aWYodGhpcy5jYXJkICE9PSBudWxsKXtcclxuXHRcdFx0dGhpcy5yZW1vdmUodGhpcy5jYXJkKTtcclxuXHRcdFx0dGhpcy5jYXJkID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0bGV0IHZvdGUgPSB2b3Rlc1tnYW1lLmxhc3RFbGVjdGlvbl07XHJcblxyXG5cdFx0aWYodm90ZS5ub25Wb3RlcnMuaW5jbHVkZXModGhpcy5zZWF0Lm93bmVyKSlcclxuXHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdGxldCBwbGF5ZXJWb3RlID0gdm90ZS55ZXNWb3RlcnMuaW5jbHVkZXModGhpcy5zZWF0Lm93bmVyKTtcclxuXHRcdHRoaXMuY2FyZCA9IHBsYXllclZvdGUgPyBuZXcgSmFDYXJkKCkgOiBuZXcgTmVpbkNhcmQoKTtcclxuXHJcblx0XHR0aGlzLmFkZCh0aGlzLmNhcmQpO1xyXG5cdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcclxuXHR9XHJcblxyXG5cdHByZXNlbnRQYXJ0eSh7ZGF0YTogdXNlcklkfSlcclxuXHR7XHJcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyIHx8IHRoaXMuc2VhdC5vd25lciAhPT0gdXNlcklkKSByZXR1cm47XHJcblxyXG5cdFx0bGV0IHJvbGUgPSBTSC5wbGF5ZXJzW3RoaXMuc2VhdC5vd25lcl0ucm9sZTtcclxuXHRcdHRoaXMuY2FyZCA9ICByb2xlID09PSAnbGliZXJhbCcgPyBuZXcgTGliZXJhbFBhcnR5Q2FyZCgpIDogbmV3IEZhc2Npc3RQYXJ0eUNhcmQoKTtcclxuXHJcblx0XHR0aGlzLmFkZCh0aGlzLmNhcmQpO1xyXG5cdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcclxuXHR9XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENhcHN1bGVHZW9tZXRyeSBleHRlbmRzIFRIUkVFLkJ1ZmZlckdlb21ldHJ5XHJcbntcclxuXHRjb25zdHJ1Y3RvcihyYWRpdXMsIGhlaWdodCwgc2VnbWVudHMgPSAxMiwgcmluZ3MgPSA4KVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblxyXG5cdFx0bGV0IG51bVZlcnRzID0gMiAqIHJpbmdzICogc2VnbWVudHMgKyAyO1xyXG5cdFx0bGV0IG51bUZhY2VzID0gNCAqIHJpbmdzICogc2VnbWVudHM7XHJcblx0XHRsZXQgdGhldGEgPSAyKk1hdGguUEkvc2VnbWVudHM7XHJcblx0XHRsZXQgcGhpID0gTWF0aC5QSS8oMipyaW5ncyk7XHJcblxyXG5cdFx0bGV0IHZlcnRzID0gbmV3IEZsb2F0MzJBcnJheSgzKm51bVZlcnRzKTtcclxuXHRcdGxldCBmYWNlcyA9IG5ldyBVaW50MTZBcnJheSgzKm51bUZhY2VzKTtcclxuXHRcdGxldCB2aSA9IDAsIGZpID0gMCwgdG9wQ2FwID0gMCwgYm90Q2FwID0gMTtcclxuXHJcblx0XHR2ZXJ0cy5zZXQoWzAsIGhlaWdodC8yLCAwXSwgMyp2aSsrKTtcclxuXHRcdHZlcnRzLnNldChbMCwgLWhlaWdodC8yLCAwXSwgMyp2aSsrKTtcclxuXHJcblx0XHRmb3IoIGxldCBzPTA7IHM8c2VnbWVudHM7IHMrKyApXHJcblx0XHR7XHJcblx0XHRcdGZvciggbGV0IHI9MTsgcjw9cmluZ3M7IHIrKylcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGxldCByYWRpYWwgPSByYWRpdXMgKiBNYXRoLnNpbihyKnBoaSk7XHJcblxyXG5cdFx0XHRcdC8vIGNyZWF0ZSB2ZXJ0c1xyXG5cdFx0XHRcdHZlcnRzLnNldChbXHJcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLmNvcyhzKnRoZXRhKSxcclxuXHRcdFx0XHRcdGhlaWdodC8yIC0gcmFkaXVzKigxLU1hdGguY29zKHIqcGhpKSksXHJcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLnNpbihzKnRoZXRhKVxyXG5cdFx0XHRcdF0sIDMqdmkrKyk7XHJcblxyXG5cdFx0XHRcdHZlcnRzLnNldChbXHJcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLmNvcyhzKnRoZXRhKSxcclxuXHRcdFx0XHRcdC1oZWlnaHQvMiArIHJhZGl1cyooMS1NYXRoLmNvcyhyKnBoaSkpLFxyXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5zaW4ocyp0aGV0YSlcclxuXHRcdFx0XHRdLCAzKnZpKyspO1xyXG5cclxuXHRcdFx0XHRsZXQgdG9wX3MxcjEgPSB2aS0yLCB0b3BfczFyMCA9IHZpLTQ7XHJcblx0XHRcdFx0bGV0IGJvdF9zMXIxID0gdmktMSwgYm90X3MxcjAgPSB2aS0zO1xyXG5cdFx0XHRcdGxldCB0b3BfczByMSA9IHRvcF9zMXIxIC0gMipyaW5ncywgdG9wX3MwcjAgPSB0b3BfczFyMCAtIDIqcmluZ3M7XHJcblx0XHRcdFx0bGV0IGJvdF9zMHIxID0gYm90X3MxcjEgLSAyKnJpbmdzLCBib3RfczByMCA9IGJvdF9zMXIwIC0gMipyaW5ncztcclxuXHRcdFx0XHRpZihzID09PSAwKXtcclxuXHRcdFx0XHRcdHRvcF9zMHIxICs9IG51bVZlcnRzLTI7XHJcblx0XHRcdFx0XHR0b3BfczByMCArPSBudW1WZXJ0cy0yO1xyXG5cdFx0XHRcdFx0Ym90X3MwcjEgKz0gbnVtVmVydHMtMjtcclxuXHRcdFx0XHRcdGJvdF9zMHIwICs9IG51bVZlcnRzLTI7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBjcmVhdGUgZmFjZXNcclxuXHRcdFx0XHRpZihyID09PSAxKVxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGZhY2VzLnNldChbdG9wQ2FwLCB0b3BfczFyMSwgdG9wX3MwcjFdLCAzKmZpKyspO1xyXG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFtib3RDYXAsIGJvdF9zMHIxLCBib3RfczFyMV0sIDMqZmkrKyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2VcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcF9zMXIwLCB0b3BfczFyMSwgdG9wX3MwcjBdLCAzKmZpKyspO1xyXG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFt0b3BfczByMCwgdG9wX3MxcjEsIHRvcF9zMHIxXSwgMypmaSsrKTtcclxuXHJcblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdF9zMHIxLCBib3RfczFyMSwgYm90X3MwcjBdLCAzKmZpKyspO1xyXG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFtib3RfczByMCwgYm90X3MxcjEsIGJvdF9zMXIwXSwgMypmaSsrKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGNyZWF0ZSBsb25nIHNpZGVzXHJcblx0XHRcdGxldCB0b3BfczEgPSB2aS0yLCB0b3BfczAgPSB0b3BfczEgLSAyKnJpbmdzO1xyXG5cdFx0XHRsZXQgYm90X3MxID0gdmktMSwgYm90X3MwID0gYm90X3MxIC0gMipyaW5ncztcclxuXHRcdFx0aWYocyA9PT0gMCl7XHJcblx0XHRcdFx0dG9wX3MwICs9IG51bVZlcnRzLTI7XHJcblx0XHRcdFx0Ym90X3MwICs9IG51bVZlcnRzLTI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZhY2VzLnNldChbdG9wX3MwLCB0b3BfczEsIGJvdF9zMV0sIDMqZmkrKyk7XHJcblx0XHRcdGZhY2VzLnNldChbYm90X3MwLCB0b3BfczAsIGJvdF9zMV0sIDMqZmkrKyk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSh2ZXJ0cywgMykpO1xyXG5cdFx0dGhpcy5zZXRJbmRleChuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKGZhY2VzLCAxKSk7XHJcblx0fVxyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQgQ2Fwc3VsZUdlb21ldHJ5IGZyb20gJy4vY2Fwc3VsZWdlb21ldHJ5JztcclxuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcclxuXHJcbmxldCBoaXRib3hHZW8gPSBuZXcgQ2Fwc3VsZUdlb21ldHJ5KDAuMywgMS44KTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhpdGJveCBleHRlbmRzIFRIUkVFLk1lc2hcclxue1xyXG5cdGNvbnN0cnVjdG9yKHNlYXQpXHJcblx0e1xyXG5cdFx0c3VwZXIoaGl0Ym94R2VvLCBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xyXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcclxuXHRcdFx0b3BhY2l0eTogMCxcclxuXHRcdFx0c2lkZTogVEhSRUUuQmFja1NpZGVcclxuXHRcdH0pKTtcclxuXHJcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC41LCAwKTtcclxuXHRcdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcclxuXHRcdHNlYXQuYWRkKHRoaXMpO1xyXG5cclxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29yZW50ZXInLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwLjEpO1xyXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3JsZWF2ZScsICgpID0+IHRoaXMubWF0ZXJpYWwub3BhY2l0eSA9IDApO1xyXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsICgpID0+IHtcclxuXHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XHJcblx0XHRcdFx0dHlwZTogJ3BsYXllclNlbGVjdCcsXHJcblx0XHRcdFx0YnViYmxlczogZmFsc2UsXHJcblx0XHRcdFx0ZGF0YTogdGhpcy5zZWF0Lm93bmVyXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgbGF0ZVVwZGF0ZSh0aGlzLnVwZGF0ZVZpc2liaWxpdHkuYmluZCh0aGlzKSkpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlVmlzaWJpbGl0eSh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcclxuXHR7XHJcblx0XHRsZXQgbGl2aW5nUGxheWVycyA9IGdhbWUudHVybk9yZGVyLmZpbHRlcihwID0+IHBsYXllcnNbcF0uc3RhdGUgIT09ICdkZWFkJyk7XHJcblx0XHRsZXQgcHJlY29uZGl0aW9ucyA9XHJcblx0XHRcdFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQgJiZcclxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSAnJyAmJlxyXG5cdFx0XHR0aGlzLnNlYXQub3duZXIgIT09IFNILmxvY2FsVXNlci5pZCAmJlxyXG5cdFx0XHRsaXZpbmdQbGF5ZXJzLmluY2x1ZGVzKHRoaXMuc2VhdC5vd25lcik7XHJcblxyXG5cdFx0bGV0IG5vbWluYXRlYWJsZSA9XHJcblx0XHRcdGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScgJiZcclxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBnYW1lLmxhc3RDaGFuY2VsbG9yICYmXHJcblx0XHRcdChsaXZpbmdQbGF5ZXJzLmxlbmd0aCA8PSA1IHx8IHRoaXMuc2VhdC5vd25lciAhPT0gZ2FtZS5sYXN0UHJlc2lkZW50KTtcclxuXHJcblx0XHRsZXQgaW52ZXN0aWdhdGVhYmxlID1cclxuXHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ2ludmVzdGlnYXRlJyAmJlxyXG5cdFx0XHRwbGF5ZXJzW3RoaXMuc2VhdC5vd25lcl0uc3RhdGUgPT09ICdub3JtYWwnO1xyXG5cdFx0XHJcblx0XHRsZXQgc3VjY2VlZGFibGUgPSBnYW1lLnN0YXRlID09PSAnbmFtZVN1Y2Nlc3Nvcic7XHJcblx0XHRsZXQgZXhlY3V0YWJsZSA9IGdhbWUuc3RhdGUgPT09ICdleGVjdXRlJztcclxuXHJcblx0XHR0aGlzLnZpc2libGUgPSBwcmVjb25kaXRpb25zICYmIChub21pbmF0ZWFibGUgfHwgaW52ZXN0aWdhdGVhYmxlIHx8IHN1Y2NlZWRhYmxlIHx8IGV4ZWN1dGFibGUpO1xyXG5cdH1cclxufVxyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQgTmFtZXBsYXRlIGZyb20gJy4vbmFtZXBsYXRlJztcclxuaW1wb3J0IHtCYWxsb3R9IGZyb20gJy4vYmFsbG90JztcclxuaW1wb3J0IFBsYXllckluZm8gZnJvbSAnLi9wbGF5ZXJpbmZvJztcclxuaW1wb3J0IEhpdGJveCBmcm9tICcuL2hpdGJveCc7XHJcbmltcG9ydCB7bGF0ZVVwZGF0ZX0gZnJvbSAnLi91dGlscyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTZWF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKHNlYXROdW0pXHJcblx0e1xyXG5cdFx0c3VwZXIoKTtcclxuXHJcblx0XHR0aGlzLnNlYXROdW0gPSBzZWF0TnVtO1xyXG5cdFx0dGhpcy5vd25lciA9ICcnO1xyXG5cclxuXHRcdC8vIHBvc2l0aW9uIHNlYXRcclxuXHRcdGxldCB4LCB5PTAuNjUsIHo7XHJcblx0XHRzd2l0Y2goc2VhdE51bSl7XHJcblx0XHRjYXNlIDA6IGNhc2UgMTogY2FzZSAyOlxyXG5cdFx0XHR4ID0gLTAuODMzICsgMC44MzMqc2VhdE51bTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoeCwgeSwgLTEuMDUpO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgMzogY2FzZSA0OlxyXG5cdFx0XHR6ID0gLTAuNDM3ICsgMC44NzQqKHNlYXROdW0tMyk7XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KDEuNDI1LCB5LCB6KTtcclxuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEkvMiwgMCk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0Y2FzZSA1OiBjYXNlIDY6IGNhc2UgNzpcclxuXHRcdFx0eCA9IDAuODMzIC0gMC44MzMqKHNlYXROdW0tNSk7XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIDEuMDUpO1xyXG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtTWF0aC5QSSwgMCk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0Y2FzZSA4OiBjYXNlIDk6XHJcblx0XHRcdHogPSAwLjQzNyAtIDAuODc0KihzZWF0TnVtLTgpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgtMS40MjUsIHksIHopO1xyXG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtMS41Kk1hdGguUEksIDApO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy51cGRhdGVPd25lcnNoaXAuYmluZCh0aGlzKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdjaGVja2VkX2luJywgKHtkYXRhOiBpZH0pID0+IHtcclxuXHRcdFx0aWYodGhpcy5vd25lciA9PT0gaWQpXHJcblx0XHRcdFx0dGhpcy51cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lOiBTSC5nYW1lLCBwbGF5ZXJzOiBTSC5wbGF5ZXJzfX0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KSA9PiB7XHJcblx0XHRcdGlmKHRoaXMub3duZXIgJiYgcGxheWVyc1t0aGlzLm93bmVyXS5zdGF0ZSA9PT0gJ2RlYWQnKXtcclxuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXQoMHgzZDI3ODkpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLm5hbWVwbGF0ZSA9IG5ldyBOYW1lcGxhdGUodGhpcyk7XHJcblx0XHR0aGlzLmJhbGxvdCA9IG5ldyBCYWxsb3QodGhpcyk7XHJcblx0XHR0aGlzLnBsYXllckluZm8gPSBuZXcgUGxheWVySW5mbyh0aGlzKTtcclxuXHRcdHRoaXMuaGl0Ym94ID0gbmV3IEhpdGJveCh0aGlzKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZU93bmVyc2hpcCh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcclxuXHR7XHJcblx0XHRsZXQgaWRzID0gZ2FtZS50dXJuT3JkZXIgfHwgW107XHJcblxyXG5cdFx0Ly8gcmVnaXN0ZXIgdGhpcyBzZWF0IGlmIGl0J3MgbmV3bHkgY2xhaW1lZFxyXG5cdFx0aWYoICF0aGlzLm93bmVyIClcclxuXHRcdHtcclxuXHRcdFx0Ly8gY2hlY2sgaWYgYSBwbGF5ZXIgaGFzIGpvaW5lZCBhdCB0aGlzIHNlYXRcclxuXHRcdFx0Zm9yKGxldCBpIGluIGlkcyl7XHJcblx0XHRcdFx0aWYocGxheWVyc1tpZHNbaV1dLnNlYXROdW0gPT0gdGhpcy5zZWF0TnVtKXtcclxuXHRcdFx0XHRcdHRoaXMub3duZXIgPSBpZHNbaV07XHJcblx0XHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KHBsYXllcnNbaWRzW2ldXS5kaXNwbGF5TmFtZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gcmVzZXQgdGhpcyBzZWF0IGlmIGl0J3MgbmV3bHkgdmFjYXRlZFxyXG5cdFx0aWYoICFpZHMuaW5jbHVkZXModGhpcy5vd25lcikgKVxyXG5cdFx0e1xyXG5cdFx0XHR0aGlzLm93bmVyID0gJyc7XHJcblx0XHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xyXG5cdFx0XHRcdHRoaXMubmFtZXBsYXRlLnVwZGF0ZVRleHQoJzxKb2luPicpO1xyXG5cdFx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweGZmZmZmZik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyB1cGRhdGUgZGlzY29ubmVjdCBjb2xvcnNcclxuXHRcdGVsc2UgaWYoICFwbGF5ZXJzW3RoaXMub3duZXJdLmNvbm5lY3RlZCApe1xyXG5cdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXRIZXgoMHg4MDgwODApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZiggcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcclxuXHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ZmZmZmZmKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5CaWxsYm9hcmQsIE5UZXh0fSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xyXG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29udGludWVCb3ggZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3IocGFyZW50KVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmljb24gPSBuZXcgVEhSRUUuTWVzaChcclxuXHRcdFx0bmV3IFRIUkVFLkJveEJ1ZmZlckdlb21ldHJ5KC4xNSwgLjE1LCAuMTUpLFxyXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe2NvbG9yOiAweDEwYTAxMH0pXHJcblx0XHQpO1xyXG5cdFx0QW5pbWF0ZS5zcGluKHRoaXMuaWNvbik7XHJcblx0XHR0aGlzLmFkZCh0aGlzLmljb24pO1xyXG5cclxuXHRcdHRoaXMudGV4dCA9IFBsYWNlaG9sZGVyTWVzaC5jbG9uZSgpO1xyXG5cdFx0dGhpcy50ZXh0LnBvc2l0aW9uLnNldCgwLCAuMiwgMCk7XHJcblx0XHR0aGlzLnRleHQudXNlckRhdGEuYWx0c3BhY2UgPSB7Y29sbGlkZXI6IHtlbmFibGVkOiB0cnVlfX07XHJcblxyXG5cdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy50ZXh0KTtcclxuXHJcblx0XHR0aGlzLnRleHRDb21wb25lbnQgPSBuZXcgTlRleHQodGhpcy50ZXh0KTtcclxuXHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe2ZvbnRTaXplOiAxLCB3aWR0aDogMiwgaGVpZ2h0OiAxLCBob3Jpem9udGFsQWxpZ246ICdtaWRkbGUnLCB2ZXJ0aWNhbEFsaWduOiAnbWlkZGxlJ30pO1xyXG5cclxuXHRcdHRoaXMuYWRkKHRoaXMudGV4dCk7XHJcblxyXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4yNSwgMCk7XHJcblx0XHRwYXJlbnQuYWRkKHRoaXMpO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIHRoaXMub25zdGF0ZWNoYW5nZS5iaW5kKHRoaXMpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLnBsYXllclNldHVwLmJpbmQodGhpcykpO1xyXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMub25jbGljay5iaW5kKHRoaXMpKTtcclxuXHJcblx0XHRsZXQgc2hvdyA9ICgpID0+IHRoaXMuc2hvdygpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignaW52ZXN0aWdhdGUnLCBzaG93KTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3BvbGljeUFuaW1Eb25lJywgc2hvdyk7XHJcblx0fVxyXG5cclxuXHRvbmNsaWNrKGV2dClcclxuXHR7XHJcblx0XHRpZihTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxyXG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnY29udGludWUnKTtcclxuXHR9XHJcblxyXG5cdG9uc3RhdGVjaGFuZ2Uoe2RhdGE6IHtnYW1lfX0pXHJcblx0e1xyXG5cdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyB8fCAoZ2FtZS5zdGF0ZSA9PT0gJ3BlZWsnICYmIGdhbWUucHJlc2lkZW50ID09PSBTSC5sb2NhbFVzZXIuaWQpKXtcclxuXHRcdFx0dGhpcy5zaG93KCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xyXG5cdFx0XHR0aGlzLnBsYXllclNldHVwKHtkYXRhOiB7Z2FtZX19KTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2RvbmUnKXtcclxuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zaG93KCdOZXcgZ2FtZScpO1xyXG5cdFx0XHR9LCA0MDAwKTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHR0aGlzLmhpZGUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHBsYXllclNldHVwKHtkYXRhOiB7Z2FtZX19KVxyXG5cdHtcclxuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xyXG5cdFx0XHR0aGlzLnRleHQudmlzaWJsZSA9IHRydWU7XHJcblx0XHRcdGxldCBwbGF5ZXJDb3VudCA9IGdhbWUudHVybk9yZGVyLmxlbmd0aDtcclxuXHRcdFx0aWYocGxheWVyQ291bnQgPj0gNSl7XHJcblx0XHRcdFx0dGhpcy5pY29uLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0XHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6XHJcblx0XHRcdFx0XHRgKCR7cGxheWVyQ291bnR9LzUpIENsaWNrIHdoZW4gcmVhZHlgXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5pY29uLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdFx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OlxyXG5cdFx0XHRcdFx0YCgke3BsYXllckNvdW50fS81KSBOZWVkIG1vcmUgcGxheWVyc2BcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0c2hvdyhtZXNzYWdlID0gJ0NsaWNrIHRvIGNvbnRpbnVlJyl7XHJcblx0XHR0aGlzLmljb24udmlzaWJsZSA9IHRydWU7XHJcblx0XHR0aGlzLnRleHQudmlzaWJsZSA9IHRydWU7XHJcblx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OiBtZXNzYWdlfSk7XHJcblx0fVxyXG5cclxuXHRoaWRlKCl7XHJcblx0XHR0aGlzLmljb24udmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy50ZXh0LnZpc2libGUgPSBmYWxzZTtcclxuXHR9XHJcbn07IiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcclxuXHJcbmNvbnN0IHBvc2l0aW9ucyA9IFtcclxuXHRuZXcgVEhSRUUuVmVjdG9yMygwLjM2OCwgLjAxNSwgLS43MTcpLFxyXG5cdG5ldyBUSFJFRS5WZWN0b3IzKDAuMTM1LCAuMDMwLCAtLjcxNyksXHJcblx0bmV3IFRIUkVFLlZlY3RvcjMoLS4wOTYsIC4wNDUsIC0uNzE3KSxcclxuXHRuZXcgVEhSRUUuVmVjdG9yMygtLjMyOSwgLjA2MCwgLS43MTcpXHJcbl07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFbGVjdGlvblRyYWNrZXIgZXh0ZW5kcyBUSFJFRS5NZXNoXHJcbntcclxuXHRjb25zdHJ1Y3RvcigpXHJcblx0e1xyXG5cdFx0c3VwZXIoXHJcblx0XHRcdG5ldyBUSFJFRS5DeWxpbmRlckJ1ZmZlckdlb21ldHJ5KC4wNCwgLjA0LCAuMDMsIDE2KSxcclxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHgxOTE5ZmZ9KVxyXG5cdFx0KTtcclxuXHRcdHRoaXMucG9zaXRpb24uY29weShwb3NpdGlvbnNbMF0pO1xyXG5cdFx0U0gudGFibGUuYWRkKHRoaXMpO1xyXG5cdFx0XHJcblx0XHQvLyBmYWlscyUzID09IDAgb3IgMz9cclxuXHRcdHRoaXMuaGlnaFNpZGUgPSBmYWxzZTtcclxuXHRcdHRoaXMuc3BvdCA9IDA7XHJcblxyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2ZhaWxlZFZvdGVzJywgdGhpcy51cGRhdGVGYWlsZWRWb3Rlcy5iaW5kKHRoaXMpKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZUZhaWxlZFZvdGVzKHtkYXRhOiB7Z2FtZToge2ZhaWxlZFZvdGVzfX19ID0ge2RhdGE6IHtnYW1lOiB7ZmFpbGVkVm90ZXM6IC0xfX19KVxyXG5cdHtcclxuXHRcdGlmKGZhaWxlZFZvdGVzID09PSAtMSlcclxuXHRcdFx0ZmFpbGVkVm90ZXMgPSB0aGlzLnNwb3Q7XHJcblxyXG5cdFx0dGhpcy5oaWdoU2lkZSA9IGZhaWxlZFZvdGVzID4gMDtcclxuXHRcdHRoaXMuc3BvdCA9IGZhaWxlZFZvdGVzJTMgfHwgdGhpcy5oaWdoU2lkZSAmJiAzIHx8IDA7XHJcblxyXG5cdFx0dGhpcy5hbmltID0gQW5pbWF0ZS5zaW1wbGUodGhpcywge1xyXG5cdFx0XHRwb3M6IHBvc2l0aW9uc1t0aGlzLnNwb3RdLFxyXG5cdFx0XHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMSwgMSt0aGlzLnNwb3QsIDEpLFxyXG5cdFx0XHRkdXJhdGlvbjogMTIwMFxyXG5cdFx0fSk7XHJcblx0fVxyXG59IiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IHtDcmVkaXRzQ2FyZH0gZnJvbSAnLi9jYXJkJztcclxuaW1wb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5CaWxsYm9hcmQsIE5UZXh0fSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xyXG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xyXG5pbXBvcnQge3RyYW5zbGF0ZSBhcyB0cn0gZnJvbSAnLi90aGVtZSc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQcmVzZW50YXRpb24gZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3IoKVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHRTSC5hZGQodGhpcyk7XHJcblxyXG5cdFx0Ly8gY3JlYXRlIGlkbGUgZGlzcGxheVxyXG5cdFx0dGhpcy5jcmVkaXRzID0gbmV3IENyZWRpdHNDYXJkKCk7XHJcblx0XHR0aGlzLmNyZWRpdHMucG9zaXRpb24uc2V0KDAsIDEuODUsIDApO1xyXG5cdFx0QW5pbWF0ZS5zcGluKHRoaXMuY3JlZGl0cywgMzAwMDApO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5jcmVkaXRzKTtcclxuXHRcdFxyXG5cdFx0Ly8gY3JlYXRlIHZpY3RvcnkgYmFubmVyXHJcblx0XHR0aGlzLmJhbm5lciA9IFBsYWNlaG9sZGVyTWVzaC5jbG9uZSgpO1xyXG5cdFx0dGhpcy5iYW5uZXIudGV4dCA9IG5ldyBOVGV4dCh0aGlzLmJhbm5lcik7XHJcblx0XHR0aGlzLmJhbm5lci50ZXh0LnVwZGF0ZSh7Zm9udFNpemU6IDJ9KTtcclxuXHRcdHRoaXMuYmFubmVyLmJpbGxib2FyZCA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuYmFubmVyKTtcclxuXHRcdHRoaXMuYmFubmVyLmJvYiA9IG51bGw7XHJcblx0XHR0aGlzLmFkZCh0aGlzLmJhbm5lcik7XHJcblxyXG5cdFx0Ly8gdXBkYXRlIHN0dWZmXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCB0aGlzLnVwZGF0ZU9uU3RhdGUuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVPblN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxyXG5cdHtcclxuXHRcdHRoaXMuY3JlZGl0cy52aXNpYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJztcclxuXHJcblx0XHRpZihnYW1lLnN0YXRlID09PSAnZG9uZScpXHJcblx0XHR7XHJcblx0XHRcdGlmKC9ebGliZXJhbC8udGVzdChnYW1lLnZpY3RvcnkpKXtcclxuXHRcdFx0XHR0aGlzLmJhbm5lci50ZXh0LmNvbG9yID0gJyMxOTE5ZmYnO1xyXG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQudXBkYXRlKHt0ZXh0OiAnTGliZXJhbHMgd2luISd9KTtcclxuXHRcdFx0XHRTSC5hdWRpby5saWJlcmFsRmFuZmFyZS5wbGF5KCk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5iYW5uZXIudGV4dC5jb2xvciA9ICdyZWQnO1xyXG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQudXBkYXRlKHt0ZXh0OiAnRmFzY2lzdHMgd2luISd9KTtcclxuXHRcdFx0XHRTSC5hdWRpby5mYXNjaXN0RmFuZmFyZS5wbGF5KCk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuYmFubmVyLnBvc2l0aW9uLnNldCgwLDAuOCwwKTtcclxuXHRcdFx0dGhpcy5iYW5uZXIuc2NhbGUuc2V0U2NhbGFyKC4wMDEpO1xyXG5cdFx0XHR0aGlzLmJhbm5lci52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0QW5pbWF0ZS5zaW1wbGUodGhpcy5iYW5uZXIsIHtcclxuXHRcdFx0XHRwb3M6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEuOCwgMCksXHJcblx0XHRcdFx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDEsMSwxKSxcclxuXHRcdFx0XHRkdXJhdGlvbjogMTAwMFxyXG5cdFx0XHR9KVxyXG5cdFx0XHQudGhlbigoKSA9PiB0aGlzLmJhbm5lci5ib2IgPSBBbmltYXRlLmJvYih0aGlzLmJhbm5lcikpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncG9saWN5MScgJiYgZ2FtZS5mYXNjaXN0UG9saWNpZXMgPj0gMylcclxuXHRcdHtcclxuXHRcdFx0bGV0IGNoYW5jZWxsb3IgPSBwbGF5ZXJzW2dhbWUuY2hhbmNlbGxvcl0uZGlzcGxheU5hbWU7XHJcblx0XHRcdHRoaXMuYmFubmVyLnRleHQuY29sb3IgPSAnd2hpdGUnO1xyXG5cdFx0XHR0aGlzLmJhbm5lci50ZXh0LnVwZGF0ZSh7dGV4dDogYCR7Y2hhbmNlbGxvcn0gaXMgbm90ICR7dHIoJ0hpdGxlcicpfSFgfSk7XHJcblxyXG5cdFx0XHR0aGlzLmJhbm5lci5wb3NpdGlvbi5zZXQoMCwwLjgsMCk7XHJcblx0XHRcdHRoaXMuYmFubmVyLnNjYWxlLnNldFNjYWxhciguMDAxKTtcclxuXHRcdFx0dGhpcy5iYW5uZXIudmlzaWJsZSA9IHRydWU7XHJcblx0XHRcdEFuaW1hdGUuc2ltcGxlKHRoaXMuYmFubmVyLCB7XHJcblx0XHRcdFx0cG9zOiBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLjgsIDApLFxyXG5cdFx0XHRcdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygxLDEsMSlcclxuXHRcdFx0fSlcclxuXHRcdFx0LnRoZW4oKCkgPT4gdGhpcy5iYW5uZXIuYm9iID0gQW5pbWF0ZS5ib2IodGhpcy5iYW5uZXIpKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2FmdGVybWF0aCcpIHtcclxuXHRcdFx0dGhpcy5iYW5uZXIudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHRpZih0aGlzLmJhbm5lci5ib2Ipe1xyXG5cdFx0XHRcdHRoaXMuYmFubmVyLmJvYi5zdG9wKCk7XHJcblx0XHRcdFx0dGhpcy5iYW5uZXIuYm9iID0gbnVsbDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufSIsImltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCB7YWN0aXZlVGhlbWUgYXMgdGhlbWV9IGZyb20gJy4vdGhlbWUnO1xyXG5cclxuY2xhc3MgQXVkaW9TdHJlYW1cclxue1xyXG5cdGNvbnN0cnVjdG9yKGNvbnRleHQsIGJ1ZmZlciwgb3V0cHV0KXtcclxuXHRcdHRoaXMuc291cmNlID0gY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcclxuXHRcdHRoaXMuc291cmNlLmJ1ZmZlciA9IGJ1ZmZlcjtcclxuXHRcdHRoaXMuc291cmNlLmNvbm5lY3Qob3V0cHV0KTtcclxuXHRcdHRoaXMuZmluaXNoZWRQbGF5aW5nID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG5cdFx0XHR0aGlzLnNvdXJjZS5vbmVuZGVkID0gcmVzb2x2ZTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cGxheSgpe1xyXG5cdFx0dGhpcy5zb3VyY2Uuc3RhcnQoMCwgMCk7XHJcblx0fVxyXG5cclxuXHRzdG9wKCl7XHJcblx0XHR0aGlzLnNvdXJjZS5zdG9wKCk7XHJcblx0fVxyXG59XHJcblxyXG5sZXQgcXVldWVkU3RyZWFtcyA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cclxuY2xhc3MgQXVkaW9DbGlwXHJcbntcclxuXHRjb25zdHJ1Y3Rvcihjb250ZXh0LCB1cmwsIHZvbHVtZSwgcXVldWVkID0gdHJ1ZSlcclxuXHR7XHJcblx0XHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xyXG5cdFx0dGhpcy5vdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcclxuXHRcdHRoaXMub3V0cHV0LmdhaW4udmFsdWUgPSB2b2x1bWU7XHJcblx0XHR0aGlzLm91dHB1dC5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pO1xyXG5cclxuXHRcdHRoaXMubG9hZGVkID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG5cdFx0XHRsZXQgbG9hZGVyID0gbmV3IFRIUkVFLkZpbGVMb2FkZXIoKTtcclxuXHRcdFx0bG9hZGVyLnNldFJlc3BvbnNlVHlwZSgnYXJyYXlidWZmZXInKTtcclxuXHRcdFx0bG9hZGVyLmxvYWQodXJsLCBidWZmZXIgPT4ge1xyXG5cdFx0XHRcdGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGJ1ZmZlciwgZGVjb2RlZEJ1ZmZlciA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmJ1ZmZlciA9IGRlY29kZWRCdWZmZXI7XHJcblx0XHRcdFx0XHRyZXNvbHZlKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSlcclxuXHR9XHJcblxyXG5cdHBsYXkocXVldWVkID0gZmFsc2UpXHJcblx0e1xyXG5cdFx0cmV0dXJuIHRoaXMubG9hZGVkLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRsZXQgaW5zdGFuY2UgPSBuZXcgQXVkaW9TdHJlYW0odGhpcy5jb250ZXh0LCB0aGlzLmJ1ZmZlciwgdGhpcy5vdXRwdXQpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYocXVldWVkKXtcclxuXHRcdFx0XHRxdWV1ZWRTdHJlYW1zID0gcXVldWVkU3RyZWFtcy50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRcdGluc3RhbmNlLnBsYXkoKTtcclxuXHRcdFx0XHRcdHJldHVybiBpbnN0YW5jZS5maW5pc2hlZFBsYXlpbmc7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0cmV0dXJuIHF1ZXVlZFN0cmVhbXM7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0aW5zdGFuY2UucGxheSgpO1xyXG5cdFx0XHRcdHJldHVybiBpbnN0YW5jZS5maW5pc2hlZFBsYXlpbmc7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgRmFrZUF1ZGlvQ2xpcFxyXG57XHJcblx0Y29uc3RydWN0b3IoKXsgdGhpcy5mYWtlc3RyZWFtID0gbmV3IEZha2VBdWRpb1N0cmVhbSgpOyB9XHJcblx0cGxheSgpeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7IH1cclxufVxyXG5cclxuY2xhc3MgRmFrZUF1ZGlvU3RyZWFtXHJcbntcclxuXHRjb25zdHJ1Y3RvcigpeyB0aGlzLmZpbmlzaGVkUGxheWluZyA9IFByb21pc2UucmVzb2x2ZSgpOyB9XHJcblx0cGxheSgpeyB9XHJcblx0c3RvcCgpeyB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEF1ZGlvQ29udHJvbGxlclxyXG57XHJcblx0Y29uc3RydWN0b3IoKVxyXG5cdHtcclxuXHRcdGxldCBjb250ZXh0ID0gdGhpcy5jb250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xyXG5cdFx0dGhpcy5saWJlcmFsU3RpbmcgPSBuZXcgQXVkaW9DbGlwKHRoaXMuY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vaGl0bGVyL2xpYmVyYWwtc3Rpbmcub2dnYCwgMC4yKTtcclxuXHRcdHRoaXMubGliZXJhbEZhbmZhcmUgPSBuZXcgQXVkaW9DbGlwKHRoaXMuY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vaGl0bGVyL2xpYmVyYWwtZmFuZmFyZS5vZ2dgLCAwLjIpO1xyXG5cdFx0dGhpcy5mYXNjaXN0U3RpbmcgPSBuZXcgQXVkaW9DbGlwKHRoaXMuY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vaGl0bGVyL2Zhc2Npc3Qtc3Rpbmcub2dnYCwgMC4xKTtcclxuXHRcdHRoaXMuZmFzY2lzdEZhbmZhcmUgPSBuZXcgQXVkaW9DbGlwKHRoaXMuY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vaGl0bGVyL2Zhc2Npc3QtZmFuZmFyZS5vZ2dgLCAwLjEpO1xyXG5cclxuXHRcdGxldCBmYWtlID0gbmV3IEZha2VBdWRpb0NsaXAoKTtcclxuXHRcdHRoaXMudHV0b3JpYWwgPSB7bG9hZFN0YXJ0ZWQ6IGZhbHNlfTtcclxuXHRcdFsnd2VsY29tZScsJ25pZ2h0Jywnbm9taW5hdGlvbicsJ3ZvdGluZycsJ3ZvdGVGYWlscycsJ3ZvdGVQYXNzZXMnLCdwb2xpY3kxJywncG9saWN5MicsJ3BvbGljeUZhc2Npc3QnLFxyXG5cdFx0J3BvbGljeUxpYmVyYWwnLCdwb2xpY3lBZnRlcm1hdGgnLCd3cmFwdXAnLCdwb3dlcjEnLCdwb3dlcjInLCdpbnZlc3RpZ2F0ZScsJ3BlZWsnLCduYW1lU3VjY2Vzc29yJywnZXhlY3V0ZScsXHJcblx0XHQndmV0bycsJ3JlZHpvbmUnXS5mb3JFYWNoKHggPT4gdGhpcy50dXRvcmlhbFt4XSA9IGZha2UpO1xyXG5cdH1cclxuXHJcblx0bG9hZFR1dG9yaWFsKGdhbWUpXHJcblx0e1xyXG5cdFx0aWYoIWdhbWUudHV0b3JpYWwgfHwgdGhpcy50dXRvcmlhbC5sb2FkU3RhcnRlZCkgcmV0dXJuO1xyXG5cclxuXHRcdGxldCByZWFkZXIgPSBnYW1lLnR1dG9yaWFsLCBjb250ZXh0ID0gdGhpcy5jb250ZXh0LCB2b2x1bWUgPSAwLjM7XHJcblxyXG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLnR1dG9yaWFsLCB7XHJcblx0XHRcdGxvYWRTdGFydGVkOiB0cnVlLFxyXG5cdFx0XHR3ZWxjb21lOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC93ZWxjb21lLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdG5pZ2h0OiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9uaWdodC5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRub21pbmF0aW9uOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9ub21pbmF0aW9uLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHZvdGluZzogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvdm90aW5nLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHZvdGVGYWlsczogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvdm90ZS1mYWlscy5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHR2b3RlUGFzc2VzOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC92b3RlLXBhc3NlZC5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRwb2xpY3kxOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb2xpY3kxLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBvbGljeTI6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3BvbGljeTIub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cG9saWN5RmFzY2lzdDogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG9saWN5LWZhc2Npc3Qub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cG9saWN5TGliZXJhbDogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG9saWN5LWxpYmVyYWwub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0cG9saWN5QWZ0ZXJtYXRoOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb2xpY3ktYWZ0ZXJtYXRoLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHdyYXB1cDogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvd3JhcHVwLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBvd2VyMTogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXIxLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHBvd2VyMjogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXIyLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdGludmVzdGlnYXRlOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlci1pbnZlc3RpZ2F0ZS5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHRwZWVrOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlci1wZWVrLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdG5hbWVTdWNjZXNzb3I6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyLW5hbWVzdWNjZXNzb3Iub2dnYCwgdm9sdW1lKSxcclxuXHRcdFx0ZXhlY3V0ZTogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXItZXhlY3V0ZS5vZ2dgLCB2b2x1bWUpLFxyXG5cdFx0XHR2ZXRvOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlci12ZXRvLm9nZ2AsIHZvbHVtZSksXHJcblx0XHRcdHJlZHpvbmU6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3JlZHpvbmUub2dnYCwgdm9sdW1lKVxyXG5cdFx0fSk7XHJcblx0fVxyXG59IiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFR1dG9yaWFsTWFuYWdlclxyXG57XHJcblx0Y29uc3RydWN0b3IoKVxyXG5cdHtcclxuXHRcdHRoaXMuZW5hYmxlZCA9IGZhbHNlO1xyXG5cdFx0dGhpcy5sYXN0RXZlbnQgPSBudWxsO1xyXG5cdFx0dGhpcy5wbGF5ZWQgPSBbXTtcclxuXHR9XHJcblxyXG5cdGRldGVjdEV2ZW50KGdhbWUsIHZvdGVzKVxyXG5cdHtcclxuXHRcdGxldCBsYXN0RWxlY3Rpb24gPSB2b3Rlc1tnYW1lLmxhc3RFbGVjdGlvbl07XHJcblx0XHRsZXQgZmlyc3RSb3VuZCA9IGdhbWUuZmFzY2lzdFBvbGljaWVzICsgZ2FtZS5saWJlcmFsUG9saWNpZXMgPT09IDA7XHJcblxyXG5cdFx0aWYoZmlyc3RSb3VuZCAmJiBnYW1lLnN0YXRlID09PSAnbmlnaHQnKVxyXG5cdFx0XHRyZXR1cm4gJ25pZ2h0JztcclxuXHRcdGVsc2UgaWYoZmlyc3RSb3VuZCAmJiBnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnKVxyXG5cdFx0XHRyZXR1cm4gJ25vbWluYXRpb24nO1xyXG5cdFx0ZWxzZSBpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICdlbGVjdGlvbicpXHJcblx0XHRcdHJldHVybiAndm90aW5nJztcclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyAmJiBsYXN0RWxlY3Rpb24ueWVzVm90ZXJzLmxlbmd0aCA8IGxhc3RFbGVjdGlvbi50b1Bhc3MgJiYgIXRoaXMucGxheWVkLmluY2x1ZGVzKCd2b3RlRmFpbHMnKSl7XHJcblx0XHRcdHRoaXMucGxheWVkLnB1c2goJ3ZvdGVGYWlscycpO1xyXG5cdFx0XHRyZXR1cm4gJ3ZvdGVGYWlscyc7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdsYW1lRHVjaycgJiYgbGFzdEVsZWN0aW9uLnllc1ZvdGVycy5sZW5ndGggPj0gbGFzdEVsZWN0aW9uLnRvUGFzcyAmJiAhdGhpcy5wbGF5ZWQuaW5jbHVkZXMoJ3ZvdGVQYXNzZXMnKSl7XHJcblx0XHRcdHRoaXMucGxheWVkLnB1c2goJ3ZvdGVQYXNzZXMnKTtcclxuXHRcdFx0cmV0dXJuICd2b3RlUGFzc2VzJztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZmlyc3RSb3VuZCAmJiBnYW1lLnN0YXRlID09PSAncG9saWN5MScpXHJcblx0XHRcdHJldHVybiAncG9saWN5MSc7XHJcblx0XHRlbHNlIGlmKGZpcnN0Um91bmQgJiYgZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTInKVxyXG5cdFx0XHRyZXR1cm4gJ3BvbGljeTInO1xyXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnYWZ0ZXJtYXRoJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcyA9PT0gMSAmJiBnYW1lLmhhbmQgPT09IDIpXHJcblx0XHRcdHJldHVybiAncG9saWN5RmFzY2lzdCc7XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnICYmIGdhbWUubGliZXJhbFBvbGljaWVzID09PSAxICYmIGdhbWUuaGFuZCA9PT0gMylcclxuXHRcdFx0cmV0dXJuICdwb2xpY3lMaWJlcmFsJztcclxuXHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScgJiYgZ2FtZS5mYXNjaXN0UG9saWNpZXMrZ2FtZS5saWJlcmFsUG9saWNpZXMgPT09IDEpXHJcblx0XHRcdHJldHVybiAnd3JhcHVwJztcclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcyA9PT0gMylcclxuXHRcdFx0cmV0dXJuICdyZWR6b25lJztcclxuXHJcblx0XHRlbHNlIGlmKFsnaW52ZXN0aWdhdGUnLCdwZWVrJywnbmFtZVN1Y2Nlc3NvcicsJ2V4ZWN1dGUnXS5pbmNsdWRlcyhnYW1lLnN0YXRlKSlcclxuXHRcdHtcclxuXHRcdFx0aWYodGhpcy5wbGF5ZWQuaW5jbHVkZXMoZ2FtZS5zdGF0ZSkpXHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblxyXG5cdFx0XHRsZXQgc3RhdGU7XHJcblx0XHRcdGlmKGdhbWUuZmFzY2lzdFBvbGljaWVzID09PSA1KVxyXG5cdFx0XHRcdHN0YXRlID0gJ3ZldG8nO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0c3RhdGUgPSBnYW1lLnN0YXRlO1xyXG5cdFx0XHR0aGlzLnBsYXllZC5wdXNoKHN0YXRlKTtcclxuXHJcblx0XHRcdGlmKCF0aGlzLnBsYXllZC5pbmNsdWRlcygncG93ZXInKSl7XHJcblx0XHRcdFx0c3RhdGUgPSAnZmlyc3RfJytzdGF0ZTtcclxuXHRcdFx0XHR0aGlzLnBsYXllZC5wdXNoKCdwb3dlcicpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gc3RhdGU7XHJcblx0XHR9XHJcblx0XHRlbHNlIHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0c3RhdGVVcGRhdGUoZ2FtZSwgdm90ZXMpXHJcblx0e1xyXG5cdFx0aWYoIWdhbWUudHV0b3JpYWwgfHwgZ2FtZS50dXJuT3JkZXIuaW5jbHVkZXMoJzExMTExMTEnKSAmJiBTSC5sb2NhbFVzZXIuaWQgIT09ICcxMTExMTExJylcclxuXHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdGxldCBzZWFtbGVzcyA9IHtcclxuXHRcdFx0cG9saWN5RmFzY2lzdDogWydwb2xpY3lGYXNjaXN0JywncG9saWN5QWZ0ZXJtYXRoJ10sXHJcblx0XHRcdHBvbGljeUxpYmVyYWw6IFsncG9saWN5TGliZXJhbCcsJ3BvbGljeUFmdGVybWF0aCddLFxyXG5cdFx0XHRmaXJzdF9pbnZlc3RpZ2F0ZTogWydwb3dlcjEnLCdwb3dlcjInLCdpbnZlc3RpZ2F0ZSddLFxyXG5cdFx0XHRmaXJzdF9wZWVrOiBbJ3Bvd2VyMScsJ3Bvd2VyMicsJ3BlZWsnXSxcclxuXHRcdFx0Zmlyc3RfbmFtZVN1Y2Nlc3NvcjogWydwb3dlcjEnLCdwb3dlcjInLCduYW1lU3VjY2Vzc29yJ10sXHJcblx0XHRcdGZpcnN0X2V4ZWN1dGU6IFsncG93ZXIxJywncG93ZXIyJywnZXhlY3V0ZSddLFxyXG5cdFx0XHRmaXJzdF92ZXRvOiBbJ3Bvd2VyMScsJ3Bvd2VyMicsJ3ZldG8nXSxcclxuXHRcdFx0aW52ZXN0aWdhdGU6IFsncG93ZXIxJywnaW52ZXN0aWdhdGUnXSxcclxuXHRcdFx0cGVlazogWydwb3dlcjEnLCdwZWVrJ10sXHJcblx0XHRcdG5hbWVTdWNjZXNzb3I6IFsncG93ZXIxJywnbmFtZVN1Y2Nlc3NvciddLFxyXG5cdFx0XHRleGVjdXRlOiBbJ3Bvd2VyMScsJ2V4ZWN1dGUnXSxcclxuXHRcdFx0dmV0bzogWydwb3dlcjEnLCd2ZXRvJ10sXHJcblx0XHRcdG5pZ2h0OiBbJ3dlbGNvbWUnLCduaWdodCddXHJcblx0XHR9O1xyXG5cdFx0bGV0IGRlbGF5ZWQgPSB7XHJcblx0XHRcdHBvbGljeUZhc2Npc3Q6ICdwb2xpY3lBbmltRG9uZScsXHJcblx0XHRcdHBvbGljeUxpYmVyYWw6ICdwb2xpY3lBbmltRG9uZSdcclxuXHRcdH07XHJcblxyXG5cdFx0bGV0IGV2ZW50ID0gdGhpcy5sYXN0RXZlbnQgPSB0aGlzLmRldGVjdEV2ZW50KGdhbWUsIHZvdGVzKTtcclxuXHRcdGNvbnNvbGUubG9nKCd0dXRvcmlhbCBldmVudDonLCBldmVudCk7XHJcblxyXG5cdFx0bGV0IHdhaXQgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHRcdGlmKGRlbGF5ZWRbZXZlbnRdKXtcclxuXHRcdFx0d2FpdCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0XHRsZXQgaGFuZGxlciA9ICgpID0+IHtcclxuXHRcdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoZGVsYXllZFtldmVudF0sIGhhbmRsZXIpO1xyXG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcihkZWxheWVkW2V2ZW50XSwgaGFuZGxlcik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHNlYW1sZXNzW2V2ZW50XSlcclxuXHRcdHtcclxuXHRcdFx0bGV0IHN1YmV2ZW50ID0gL15maXJzdF8vLnRlc3QoZXZlbnQpID8gZXZlbnQuc2xpY2UoNikgOiBldmVudDtcclxuXHRcdFx0d2FpdC50aGVuKCgpID0+IHtcclxuXHRcdFx0XHRzZWFtbGVzc1tldmVudF0uZm9yRWFjaChjbGlwID0+IFNILmF1ZGlvLnR1dG9yaWFsW2NsaXBdLnBsYXkodHJ1ZSkpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZXZlbnQgIT09IG51bGwpXHJcblx0XHR7XHJcblx0XHRcdHdhaXQudGhlbigoKSA9PiBTSC5hdWRpby50dXRvcmlhbFtldmVudF0ucGxheSh0cnVlKSk7XHJcblx0XHR9XHJcblx0fVxyXG59IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0ICcuL3BvbHlmaWxsJztcclxuXHJcbmltcG9ydCB7YWN0aXZlVGhlbWUgYXMgdGhlbWV9IGZyb20gJy4vdGhlbWUnO1xyXG5cclxuaW1wb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH0gZnJvbSAnLi9oYXRzJztcclxuaW1wb3J0IEdhbWVUYWJsZSBmcm9tICcuL3RhYmxlJztcclxuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XHJcbmltcG9ydCB7IGdldEdhbWVJZCwgbWVyZ2VPYmplY3RzIH0gZnJvbSAnLi91dGlscyc7XHJcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnO1xyXG5pbXBvcnQgU2VhdCBmcm9tICcuL3NlYXQnO1xyXG5pbXBvcnQgUGxheWVyTWV0ZXIgZnJvbSAnLi9wbGF5ZXJtZXRlcic7XHJcbmltcG9ydCBDb250aW51ZUJveCBmcm9tICcuL2NvbnRpbnVlYm94JztcclxuaW1wb3J0IEVsZWN0aW9uVHJhY2tlciBmcm9tICcuL2VsZWN0aW9udHJhY2tlcic7XHJcbmltcG9ydCBQcmVzZW50YXRpb24gZnJvbSAnLi9wcmVzZW50YXRpb24nO1xyXG5pbXBvcnQgQXVkaW9Db250cm9sbGVyIGZyb20gJy4vYXVkaW9jb250cm9sbGVyJztcclxuaW1wb3J0IFR1dG9yaWFsIGZyb20gJy4vdHV0b3JpYWwnO1xyXG5cclxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5hc3NldHMgPSBBc3NldE1hbmFnZXIubWFuaWZlc3Q7XHJcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcclxuXHRcdHRoaXMubmVlZHNTa2VsZXRvbiA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIHBvbHlmaWxsIGdldFVzZXIgZnVuY3Rpb25cclxuXHRcdGlmKCFhbHRzcGFjZS5pbkNsaWVudCl7XHJcblx0XHRcdGFsdHNwYWNlLmdldFVzZXIgPSAoKSA9PiB7XHJcblx0XHRcdFx0bGV0IGlkLCByZSA9IC9bPyZddXNlcklkPShcXGQrKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcclxuXHRcdFx0XHRpZihyZSlcclxuXHRcdFx0XHRcdGlkID0gcmVbMV07XHJcblx0XHRcdFx0ZWxzZVxyXG5cdFx0XHRcdFx0aWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCkudG9TdHJpbmcoKTtcclxuXHJcblx0XHRcdFx0YWx0c3BhY2UuX2xvY2FsVXNlciA9IHtcclxuXHRcdFx0XHRcdHVzZXJJZDogaWQsXHJcblx0XHRcdFx0XHRkaXNwbGF5TmFtZTogaWQsXHJcblx0XHRcdFx0XHRpc01vZGVyYXRvcjogL2lzTW9kZXJhdG9yLy50ZXN0KHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnTWFzcXVlcmFkaW5nIGFzJywgYWx0c3BhY2UuX2xvY2FsVXNlcik7XHJcblx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShhbHRzcGFjZS5fbG9jYWxVc2VyKTtcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBnZXQgbG9jYWwgdXNlclxyXG5cdFx0dGhpcy5fdXNlclByb21pc2UgPSBhbHRzcGFjZS5nZXRVc2VyKCk7XHJcblx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKHVzZXIgPT4ge1xyXG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcclxuXHRcdFx0XHRpZDogdXNlci51c2VySWQsXHJcblx0XHRcdFx0ZGlzcGxheU5hbWU6IHVzZXIuZGlzcGxheU5hbWUsXHJcblx0XHRcdFx0aXNNb2RlcmF0b3I6IHVzZXIuaXNNb2RlcmF0b3JcclxuXHRcdFx0fTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuZ2FtZSA9IHt9O1xyXG5cdFx0dGhpcy5wbGF5ZXJzID0ge307XHJcblx0XHR0aGlzLnZvdGVzID0ge307XHJcblx0fVxyXG5cclxuXHRpbml0aWFsaXplKGVudiwgcm9vdCwgYXNzZXRzKVxyXG5cdHtcclxuXHRcdC8vIHNoYXJlIHRoZSBkaW9yYW1hIGluZm9cclxuXHRcdEFzc2V0TWFuYWdlci5jYWNoZSA9IGFzc2V0cztcclxuXHRcdEFzc2V0TWFuYWdlci5maXhNYXRlcmlhbHMoKTtcclxuXHRcdHRoaXMuZW52ID0gZW52O1xyXG5cclxuXHRcdC8vIGNvbm5lY3QgdG8gc2VydmVyXHJcblx0XHR0aGlzLnNvY2tldCA9IGlvLmNvbm5lY3QoJy8nLCB7cXVlcnk6IGBnYW1lSWQ9JHtnZXRHYW1lSWQoKX0mdGhlbWU9JHt0aGVtZX1gfSk7XHJcblxyXG5cdFx0Ly8gc3Bhd24gc2VsZi1zZXJ2ZSB0dXRvcmlhbCBkaWFsb2dcclxuXHRcdGlmKGFsdHNwYWNlLmluQ2xpZW50KXtcclxuXHRcdFx0YWx0c3BhY2Uub3Blbih3aW5kb3cubG9jYXRpb24ub3JpZ2luKycvc3RhdGljL3R1dG9yaWFsLmh0bWwnLCAnX2V4cGVyaWVuY2UnLFxyXG5cdFx0XHRcdHtoaWRkZW46IHRydWUsIGljb246IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4rJy9zdGF0aWMvaW1nL2NhZXNhci9pY29uLnBuZyd9KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmF1ZGlvID0gbmV3IEF1ZGlvQ29udHJvbGxlcigpO1xyXG5cdFx0dGhpcy50dXRvcmlhbCA9IG5ldyBUdXRvcmlhbCgpO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSB0aGUgdGFibGVcclxuXHRcdHRoaXMudGFibGUgPSBuZXcgR2FtZVRhYmxlKCk7XHJcblx0XHR0aGlzLmFkZCh0aGlzLnRhYmxlKTtcclxuXHJcblx0XHR0aGlzLnJlc2V0QnV0dG9uID0gbmV3IFRIUkVFLk1lc2goXHJcblx0XHRcdG5ldyBUSFJFRS5Cb3hHZW9tZXRyeSguMjUsLjI1LC4yNSksXHJcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBhc3NldHMudGV4dHVyZXMucmVzZXR9KVxyXG5cdFx0KTtcclxuXHRcdHRoaXMucmVzZXRCdXR0b24ucG9zaXRpb24uc2V0KDEuMTMsIC0uOSwgLjc1KTtcclxuXHRcdHRoaXMucmVzZXRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLnNlbmRSZXNldC5iaW5kKHRoaXMpKTtcclxuXHRcdHRoaXMuX3VzZXJQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRpZih0aGlzLmxvY2FsVXNlci5pc01vZGVyYXRvcilcclxuXHRcdFx0XHR0aGlzLnRhYmxlLmFkZCh0aGlzLnJlc2V0QnV0dG9uKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucmVmcmVzaEJ1dHRvbiA9IG5ldyBUSFJFRS5NZXNoKFxyXG5cdFx0XHRuZXcgVEhSRUUuQm94R2VvbWV0cnkoLjI1LC4yNSwuMjUpLFxyXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogYXNzZXRzLnRleHR1cmVzLnJlZnJlc2h9KVxyXG5cdFx0KTtcclxuXHRcdHRoaXMucmVmcmVzaEJ1dHRvbi5wb3NpdGlvbi5zZXQoMS4xMywgLS4zLCAuNzUpO1xyXG5cdFx0dGhpcy5yZWZyZXNoQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgKCkgPT4gd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpKTtcclxuXHRcdHRoaXMudGFibGUuYWRkKHRoaXMucmVmcmVzaEJ1dHRvbik7XHJcblxyXG5cdFx0dGhpcy5wcmVzZW50YXRpb24gPSBuZXcgUHJlc2VudGF0aW9uKCk7XHJcblxyXG5cdFx0Ly8gY3JlYXRlIGhhdHNcclxuXHRcdHRoaXMucHJlc2lkZW50SGF0ID0gbmV3IFByZXNpZGVudEhhdCgpO1xyXG5cdFx0dGhpcy5jaGFuY2VsbG9ySGF0ID0gbmV3IENoYW5jZWxsb3JIYXQoKTtcclxuXHJcblx0XHQvLyBjcmVhdGUgcG9zaXRpb25zXHJcblx0XHR0aGlzLnNlYXRzID0gW107XHJcblx0XHRmb3IobGV0IGk9MDsgaTwxMDsgaSsrKXtcclxuXHRcdFx0dGhpcy5zZWF0cy5wdXNoKCBuZXcgU2VhdChpKSApO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMudGFibGUuYWRkKC4uLnRoaXMuc2VhdHMpO1xyXG5cclxuXHRcdC8vdGhpcy5wbGF5ZXJNZXRlciA9IG5ldyBQbGF5ZXJNZXRlcigpO1xyXG5cdFx0Ly90aGlzLnRhYmxlLmFkZCh0aGlzLnBsYXllck1ldGVyKTtcclxuXHRcdHRoaXMuY29udGludWVCb3ggPSBuZXcgQ29udGludWVCb3godGhpcy50YWJsZSk7XHJcblxyXG5cdFx0dGhpcy5lbGVjdGlvblRyYWNrZXIgPSBuZXcgRWxlY3Rpb25UcmFja2VyKCk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQub24oJ3VwZGF0ZScsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcclxuXHRcdHRoaXMuc29ja2V0Lm9uKCdjaGVja2VkX2luJywgdGhpcy5jaGVja2VkSW4uYmluZCh0aGlzKSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQub24oJ3Jlc2V0JywgdGhpcy5kb1Jlc2V0LmJpbmQodGhpcykpO1xyXG5cdFx0Ly90aGlzLnNvY2tldC5vbignZGlzY29ubmVjdCcsIHRoaXMuZG9SZXNldC5iaW5kKHRoaXMpKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZUZyb21TZXJ2ZXIoZ2QsIHBkLCB2ZClcclxuXHR7XHJcblx0XHRjb25zb2xlLmxvZyhnZCwgcGQsIHZkKTtcclxuXHJcblx0XHRsZXQgZ2FtZSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2FtZSwgZ2QpO1xyXG5cdFx0bGV0IHBsYXllcnMgPSBtZXJnZU9iamVjdHModGhpcy5wbGF5ZXJzLCBwZCB8fCB7fSk7XHJcblx0XHRsZXQgdm90ZXMgPSBtZXJnZU9iamVjdHModGhpcy52b3RlcywgdmQgfHwge30pO1xyXG5cclxuXHRcdGlmKGdkLnR1dG9yaWFsKVxyXG5cdFx0XHR0aGlzLmF1ZGlvLmxvYWRUdXRvcmlhbChnYW1lKTtcclxuXHJcblx0XHRpZihnZC5zdGF0ZSlcclxuXHRcdFx0dGhpcy50dXRvcmlhbC5zdGF0ZVVwZGF0ZShnYW1lLCB2b3Rlcyk7XHJcblxyXG5cdFx0Zm9yKGxldCBmaWVsZCBpbiBnZClcclxuXHRcdHtcclxuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHtcclxuXHRcdFx0XHR0eXBlOiAndXBkYXRlXycrZmllbGQsXHJcblx0XHRcdFx0YnViYmxlczogZmFsc2UsXHJcblx0XHRcdFx0ZGF0YToge1xyXG5cdFx0XHRcdFx0Z2FtZTogZ2FtZSxcclxuXHRcdFx0XHRcdHBsYXllcnM6IHBsYXllcnMsXHJcblx0XHRcdFx0XHR2b3Rlczogdm90ZXNcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuX3VzZXJQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRpZihwbGF5ZXJzW3RoaXMubG9jYWxVc2VyLmlkXSAmJiAhcGxheWVyc1t0aGlzLmxvY2FsVXNlci5pZF0uY29ubmVjdGVkKXtcclxuXHRcdFx0XHR0aGlzLnNvY2tldC5lbWl0KCdjaGVja19pbicsIHRoaXMubG9jYWxVc2VyKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcclxuXHRcdHRoaXMucGxheWVycyA9IHBsYXllcnM7XHJcblx0XHR0aGlzLnZvdGVzID0gdm90ZXM7XHJcblx0fVxyXG5cclxuXHRjaGVja2VkSW4ocClcclxuXHR7XHJcblx0XHRPYmplY3QuYXNzaWduKHRoaXMucGxheWVyc1twLmlkXSwgcCk7XHJcblx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe1xyXG5cdFx0XHR0eXBlOiAnY2hlY2tlZF9pbicsXHJcblx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxyXG5cdFx0XHRkYXRhOiBwLmlkXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHNlbmRSZXNldChlKXtcclxuXHRcdGlmKHRoaXMubG9jYWxVc2VyLmlzTW9kZXJhdG9yKXtcclxuXHRcdFx0Y29uc29sZS5sb2coJ3JlcXVlc3RpbmcgcmVzZXQnKTtcclxuXHRcdFx0dGhpcy5zb2NrZXQuZW1pdCgncmVzZXQnKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGRvUmVzZXQoZ2FtZSwgcGxheWVycywgdm90ZXMpXHJcblx0e1xyXG5cdFx0d2luZG93LmxvY2F0aW9uLnJlbG9hZCh0cnVlKTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IG5ldyBTZWNyZXRIaXRsZXIoKTtcclxuIl0sIm5hbWVzIjpbImxldCIsImNvbnN0IiwidGhlbWUiLCJ0aGlzIiwic3VwZXIiLCJBTSIsIkFzc2V0TWFuYWdlciIsImNhcmQiLCJ0ciIsIkJhbGxvdFR5cGUuQ09ORklSTSIsInVwZGF0ZVN0YXRlIiwiQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QiLCJCYWxsb3RUeXBlLlBPTElDWSIsIm9wdHMiLCJjbGVhblVwRmFrZVZvdGUiLCJCUC51cGRhdGVWb3Rlc0luUHJvZ3Jlc3MiLCJCUC51cGRhdGVTdGF0ZSIsIkJQQkEudG9BcnJheSIsIkJQQkEuTElCRVJB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RUFDbkIsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSztFQUNuQixDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUs7Ozs7RUFJbkIsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFFdEYsQ0FBQzs7Q0FFRkEsSUFBSSxPQUFPLEdBQUc7O0VBRWIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzFCLENBQUM7OztDQUdGQSxJQUFJLFNBQVMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0NBQ3ZFQSxJQUFJLElBQUksR0FBRyxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUM1RCxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0NBQ3BCLElBQUksR0FBRyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0NBQ3RFLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7OztDQUdsQkEsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLEdBQUcsRUFBRSxDQUFDO0NBQ3REQSxJQUFJLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDeEYsWUFBWSxHQUFHLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztDQUNsR0EsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0NBQ2IsSUFBSUEsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7RUFDdEIsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztFQUM1RztDQUNEQSxJQUFJLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOztDQUV0RyxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFO0VBRTFDQSxJQUFJLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztFQUNyQyxHQUFHLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksR0FBRyxZQUFZLEdBQUcsV0FBVyxDQUFDLENBQUM7RUFDeEYsR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDL0Is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QyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0VBRXJDLEtBQUtBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRTtFQUM3QjtHQUNDLEtBQUtBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtHQUMzQjtJQUNDQSxJQUFJLE1BQU0sR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7OztJQUd0QyxLQUFLLENBQUMsR0FBRyxDQUFDO0tBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNyQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0lBRVgsS0FBSyxDQUFDLEdBQUcsQ0FBQztLQUNULE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN0QyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0lBRVhBLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckNBLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckNBLElBQUksUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNqRUEsSUFBSSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2pFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNWLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCOzs7SUFHRCxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQ1Y7S0FDQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNoRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNoRDs7SUFFRDtLQUNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOztLQUVsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNsRDtJQUNEOzs7R0FHREEsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDN0NBLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0dBQzdDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNWLE1BQU0sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLE1BQU0sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3JCOztHQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0dBQzVDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0dBQzVDOztFQUVELElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNuRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNuRDs7Ozt5REFBQTs7O0VBOUUyQyxLQUFLLENBQUMsY0ErRWxELEdBQUEsQUFBQzs7QUMzRUZBLElBQUksU0FBUyxHQUFHLElBQUksZUFBZSxD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QUFNLENBQUM7RUFDbEgsTUFBTyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0seUJBQXFCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDL0YsTUFBTyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0seUJBQXFCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDL0YsTUFBTyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0seUJBQXFCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDL0YsV0FBWSxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sb0NBQWdDLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDL0csSUFBSyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sNkJBQXlCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDakcsYUFBYyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sc0NBQWtDLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDbkgsT0FBUSxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sZ0NBQTRCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDdkcsSUFBSyxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sNkJBQXlCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDakcsT0FBUSxFQUFFLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFlLEdBQUVBLFdBQUssTUFBRSxHQUFFLE1BQU0sMEJBQXNCLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDaEcsQ0FBQyxDQUFDO0NBQ0gsQ0FBQTs7QUMzSEYsSUFBcUIsZUFBZSxHQUNwQyx3QkFDWTtBQUNaO0NBQ0MsSUFBSyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7Q0FDdEIsSUFBSyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7Q0FDdkIsSUFBSyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7Q0FDakIsQ0FBQTs7QUFFRiwwQkFBQyxXQUFXLHlCQUFDLElBQUksRUFBRSxLQUFLO0FBQ3hCO0NBQ0MsSUFBSyxZQUFZLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztDQUM3QyxJQUFLLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlLEtBQUssQ0FBQyxDQUFDOztDQUVwRSxHQUFJLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLE9BQU87RUFDdkMsRUFBQyxPQUFPLE9BQU8sQ0FBQyxFQUFBO01BQ1gsR0FBRyxVQUFVLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxVQUFVO0VBQy9DLEVBQUMsT0FBTyxZQUFZLENBQUMsRUFBQTtNQUNoQixHQUFHLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVU7RUFDL0MsRUFBQyxPQUFPLFFBQVEsQ0FBQyxFQUFBO01BQ1osR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVUsSUFBSSxZQUFZLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7RUFDL0gsSUFBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7RUFDL0IsT0FBUSxXQUFXLENBQUM7RUFDbkI7TUFDSSxHQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssVUFBVSxJQUFJLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxJQUFJLFlBQVksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztFQUNqSSxJQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztFQUNoQyxPQUFRLFlBQVksQ0FBQztFQUNwQjtNQUNJLEdBQUcsVUFBVSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUztFQUM5QyxFQUFDLE9BQU8sU0FBUyxDQUFDLEVBQUE7TUFDYixHQUFHLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVM7RUFDOUMsRUFBQyxPQUFPLFNBQVMsQ0FBQyxFQUFBO01BQ2IsR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFdBQVcsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUM7RUFDbkYsRUFBQyxPQUFPLGVBQWUsQ0FBQyxFQUFBO01BQ25CLEdBQUcsSUFBSSxDQUFDLEtBQUssS0FBSyxXQUFXLElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDO0VBQ25GLEVBQUMsT0FBTyxlQUFlLENBQUMsRUFBQTs7TUFFbkIsR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVUsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxlQUFlLEtBQUssQ0FBQztFQUNwRixFQUFDLE9BQU8sUUFBUSxDQUFDLEVBQUE7TUFDWixHQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssVUFBVSxJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUssQ0FBQztFQUMvRCxFQUFDLE9BQU8sU0FBUyxDQUFDLEVBQUE7O01BRWIsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0NBQzlFO0VBQ0MsR0FBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0dBQ25DLEVBQUMsT0FBTyxJQUFJLENBQUMsRUFBQTs7RUFFZCxJQUFLLEtBQUssQ0FBQztFQUNYLEdBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxDQUFDO0dBQzdCLEVBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxFQUFBOztHQUVoQixFQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUE7RUFDckIsSUFBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7O0VBRXpCLEdBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUNsQyxLQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQztHQUN4QixJQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUMxQjs7RUFFRixPQUFRLEtBQUssQ0FBQztFQUNiO01BQ0ksRUFBQSxPQUFPLElBQUksQ0FBQyxFQUFBO0NBQ2pCLENBQUE7O0FBRUYsMEJBQUMsV0FBVyx5QkFBQyxJQUFJLEVBQUUsS0FBSztBQUN4QjtDQUNDLEdBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLFNBQVM7RUFDeEYsRUFBQyxPQUFPLEVBQUE7O0NBRVQsSUFBSyxRQUFRLEdBQUc7RUFDZixhQUFjLEVBQUUsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUM7RUFDbkQsYUFBYyxFQUFFLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDO0VBQ25ELGlCQUFrQixFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7RUFDckQsVUFBVyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7RUFDdkMsbUJBQW9CLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQztFQUN6RCxhQUFjLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQztFQUM3QyxVQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztFQUN2QyxXQUFZLEVBQUUsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDO0VBQ3RDLElBQUssRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7RUFDeEIsYUFBYyxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQztFQUMxQyxPQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO0VBQzlCLElBQUssRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7RUFDeEIsS0FBTSxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztFQUMxQixDQUFDO0NBQ0gsSUFBSyxPQUFPLEdBQUc7RUFDZCxhQUFjLEVBQUUsZ0JBQWdCO0VBQ2hDLGFBQWMsRUFBRSxnQkFBZ0I7RUFDL0IsQ0FBQzs7Q0FFSCxJQUFLLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0NBQzVELE9BQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUM7O0NBRXZDLElBQUssSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztDQUM5QixHQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUNsQixJQUFLLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFFO0dBQ3JDLElBQUssT0FBTyxHQUFHLFlBQUc7SUFDakIsRUFBRyxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNqRCxPQUFRLEVBQUUsQ0FBQztJQUNWLENBQUM7R0FDSCxFQUFHLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0dBQzdDLENBQUMsQ0FBQztFQUNIOztDQUVGLEdBQUksUUFBUSxDQUFDLEtBQUssQ0FBQztDQUNuQjtFQUNDLElBQUssUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7RUFDL0QsSUFBSyxDQUFDLElBQUksQ0FBQyxZQUFHO0dBQ2IsUUFBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUksRUFBQyxTQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQSxDQUFDLENBQUM7R0FDcEUsQ0FBQyxDQUFDO0VBQ0g7TUFDSSxHQUFHLEtBQUssS0FBSyxJQUFJO0NBQ3ZCO0VBQ0MsSUFBSyxDQUFDLElBQUksQ0FBQyxZQUFHLFNBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFBLENBQUMsQ0FBQztFQUNyRDtDQUNELENBQUE7O0FDakdGLElBQU0sWUFBWSxHQUF1QjtDQUN6QyxxQkFDWTtDQUNYOzs7RUFDQ0UsVUFBSyxLQUFBLENBQUMsSUFBQSxDQUFDLENBQUM7RUFDUixJQUFJLENBQUMsTUFBTSxHQUFHRSxNQUFZLENBQUMsUUFBUSxDQUFDO0VBQ3BDLElBQUksQ0FBQyxhQUFhLEdBQUcsUUFBUSxDQUFDO0VBQzlCLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDOzs7RUFHM0IsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7R0FDckIsUUFBUSxDQUFDLE9BQU8sR0FBRyxZQUFHO0lBQ3JCTixJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDN0QsR0FBRyxFQUFFO0tBQ0osRUFBQSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUE7O0tBRVgsRUFBQSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBQTs7SUFFdEQsUUFBUSxDQUFDLFVBQVUsR0FBRztLQUNyQixNQUFNLEVBQUUsRUFBRTtLQUNWLFdBQVcsRUFBRSxFQUFFO0tBQ2YsV0FBVyxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7S0FDdkQsQ0FBQztJQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3BELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUMsQ0FBQztHQUNGOzs7RUFHRCxJQUFJLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztFQUN2QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFBLElBQUksRUFBQztHQUMzQkcsTUFBSSxDQUFDLFNBQVMsR0FBRztJQUNoQixFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU07SUFDZixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7SUFDN0IsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO0lBQzdCLENBQUM7R0FDRixDQUFDLENBQUM7O0VBRUgsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7RUFDZixJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztFQUNsQixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztFQUNoQjs7OzttREFBQTs7Q0FFRCx1QkFBQSxVQUFVLHdCQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUVpQixTQUFNO0NBQzVCOzs7O0VBRUNkLE1BQVksQ0FBQyxLQUFLLEdBQUdjLFNBQU0sQ0FBQztFQUM1QmQsTUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDO0VBQzVCLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDOzs7RUFHZixJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUEsU0FBUSxJQUFFLFNBQVMsRUFBRSxDQUFBLFlBQVEsR0FBRUosV0FBSyxDQUFFLENBQUMsQ0FBQyxDQUFDOzs7RUFHL0UsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDO0dBQ3BCLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQUUsYUFBYTtJQUMxRSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQztHQUM3RTs7RUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7RUFDbkMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJbUIsZUFBUSxFQUFFLENBQUM7OztFQUcvQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7RUFDN0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7O0VBRXJCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSTtHQUNoQyxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7R0FDbEMsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLEVBQUVELFNBQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDekQsQ0FBQztFQUNGLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDOUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUN6RSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFHO0dBQ3pCLEdBQUdqQixNQUFJLENBQUMsU0FBUyxDQUFDLFdBQVc7SUFDNUIsRUFBQUEsTUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUNBLE1BQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFBO0dBQ2xDLENBQUMsQ0FBQzs7RUFFSCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksS0FBSyxDQUFDLElBQUk7R0FDbEMsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0dBQ2xDLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsR0FBRyxFQUFFaUIsU0FBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUMzRCxDQUFDO0VBQ0YsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztFQUNoRCxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxZQUFHLFNBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsR0FBQSxDQUFDLENBQUM7RUFDaEYsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDOztFQUVuQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7OztFQUd2QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7RUFDdkMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDOzs7RUFHekMsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7RUFDaEIsSUFBSXBCLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0dBQ3RCRyxNQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0dBQy9COztFQUVELE9BQUEsSUFBSSxDQUFDLEtBQUssQ0FBQSxDQUFDLEdBQUcsTUFBQSxDQUFDLEtBQUEsSUFBTyxDQUFDLEtBQUssQ0FBQyxDQUFDOzs7O0VBSTlCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDOztFQUUvQyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7O0VBRTdDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDM0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7O0VBRXhELElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1VBQUE7O0VBRWpELENBQUE7O0NBRUQsdUJBQUEsZ0JBQWdCLDhCQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtDQUMzQjs7O0VBQ0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDOztFQUV4QkgsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztFQUM1Q0EsSUFBSSxPQUFPLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0VBQ25EQSxJQUFJLEtBQUssR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7O0VBRS9DLEdBQUcsRUFBRSxDQUFDLFFBQVE7R0FDYixFQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUE7O0VBRS9CLEdBQUcsRUFBRSxDQUFDLEtBQUs7R0FDVixFQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFBOztFQUV4QyxJQUFJQSxJQUFJLEtBQUssSUFBSSxFQUFFO0VBQ25CO0dBQ0NHLE1BQUksQ0FBQyxhQUFhLENBQUM7SUFDbEIsSUFBSSxFQUFFLFNBQVMsQ0FBQyxLQUFLO0lBQ3JCLE9BQU8sRUFBRSxLQUFLO0lBQ2QsSUFBSSxFQUFFO0tBQ0wsSUFBSSxFQUFFLElBQUk7S0FDVixPQUFPLEVBQUUsT0FBTztLQUNoQixLQUFLLEVBQUUsS0FBSztLQUNaO0lBQ0QsQ0FBQyxDQUFDO0dBQ0g7O0VBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBRztHQUN6QixHQUFHLE9BQU8sQ0FBQ0EsTUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQ0EsTUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDdEVBLE1BQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRUEsTUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzdDO0dBQ0QsQ0FBQyxDQUFDOztFQUVILElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0VBQ2pCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0VBQ3ZCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0VBQ25CLENBQUE7O0NBRUQsdUJBQUEsU0FBUyx1QkFBQyxDQUFDO0NBQ1g7RUFDQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ3JDLElBQUksQ0FBQyxhQUFhLENBQUM7R0FDbEIsSUFBSSxFQUFFLFlBQVk7R0FDbEIsT0FBTyxFQUFFLEtBQUs7R0FDZCxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUU7R0FDVixDQUFDLENBQUM7RUFDSCxDQUFBOztDQUVELHVCQUFBLFNBQVMsdUJBQUMsQ0FBQyxDQUFDO0VBQ1gsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQztHQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7R0FDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDMUI7RUFDRCxDQUFBOztDQUVELHVCQUFBLE9BQU8scUJBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLO0NBQzVCO0VBQ0MsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDN0IsQ0FBQTs7O0VBMUt5QixLQUFLLENBQUMsUUEyS2hDLEdBQUE7O0FBRUQsU0FBZSxJQUFJLFlBQVksRUFBRSxDQUFDOzs7OyJ9
