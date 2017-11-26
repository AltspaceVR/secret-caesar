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
		SH.addEventListener('investigate', this.presentParty.bind(this));
	}

	if ( superclass ) PlayerInfo.__proto__ = superclass;
	PlayerInfo.prototype = Object.create( superclass && superclass.prototype );
	PlayerInfo.prototype.constructor = PlayerInfo;

	PlayerInfo.prototype.updateState = function updateState (ref)
	{
		var ref_data = ref.data;
		var game = ref_data.game;
		var players = ref_data.players;
		var votes = ref_data.votes;

		if(this.card !== null)
		{
			this.remove(this.card);
			this.card = null;
		}

		if(this.seat.owner)
		{
			this.presentRole(game, players, votes);
			this.presentVote(game, players, votes);
		}
	};

	PlayerInfo.prototype.presentRole = function presentRole (game, players)
	{
		var localPlayer = players[SH.localUser.id];
		var seatedPlayer = players[this.seat.owner];

		var seatedRoleShouldBeVisible =
			game.state === 'done' ||
			game.state === 'night' && SH.localUser.id === this.seat.owner ||
			localPlayer && localPlayer.role === 'fascist' && (seatedPlayer.role === 'fascist' || seatedPlayer.role === 'hitler') ||
			localPlayer && localPlayer.role === 'hitler' && seatedPlayer.role === 'fascist' && game.turnOrder.length < 7;

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
		var vote = votes[game.lastElection];

		if(game.state === 'lameDuck' && !vote.nonVoters.includes(this.seat.owner))
		{
			var playerVote = vote.yesVoters.includes(this.seat.owner);
			this.card = playerVote ? new JaCard() : new NeinCard();

			this.add(this.card);
			var bb = new NBillboard(this.card);
		}
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

		this.position.set(0, -0.7, -.2);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvcG9seWZpbGwuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RoZW1lLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hc3NldG1hbmFnZXIuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hdGl2ZWNvbXBvbmVudHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JlaGF2aW9yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9hbmltYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jYXJkLmpzIiwiLi4vLi4vc3JjL2NsaWVudC90YWJsZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdXRpbHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hbWVwbGF0ZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmFsbG90cHJvY2Vzc29yLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9icGJhLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3QuanMiLCIuLi8uLi9zcmMvY2xpZW50L3BsYXllcmluZm8uanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcHN1bGVnZW9tZXRyeS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvaGl0Ym94LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWF0LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jb250aW51ZWJveC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvZWxlY3Rpb250cmFja2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9wcmVzZW50YXRpb24uanMiLCIuLi8uLi9zcmMvY2xpZW50L2F1ZGlvY29udHJvbGxlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdHV0b3JpYWwuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlY3JldGhpdGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmlmKCFBcnJheS5wcm90b3R5cGUuaW5jbHVkZXMpe1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAnaW5jbHVkZXMnLCB7XG5cdFx0dmFsdWU6IGZ1bmN0aW9uKGl0ZW0pe1xuXHRcdFx0cmV0dXJuIHRoaXMuaW5kZXhPZihpdGVtKSA+IC0xO1xuXHRcdH0sXG5cdFx0d3JpdGFibGU6IGZhbHNlLFxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2Vcblx0fSk7XG59XG4iLCJsZXQgYWN0aXZlVGhlbWUgPSAnaGl0bGVyJztcbmlmKC9jYWVzYXIvLnRlc3Qod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKSl7XG5cdGFjdGl2ZVRoZW1lID0gJ2NhZXNhcic7XG59XG5cbmNvbnN0IHRoZW1lcyA9IHtcblx0aGl0bGVyOiB7XG5cdFx0aGl0bGVyOiAnaGl0bGVyJyxcblx0XHRwcmVzaWRlbnQ6ICdwcmVzaWRlbnQnLFxuXHRcdGNoYW5jZWxsb3I6ICdjaGFuY2VsbG9yJ1xuXHR9LFxuXHRjYWVzYXI6IHtcblx0XHRoaXRsZXI6ICdjYWVzYXInLFxuXHRcdHByZXNpZGVudDogJ2NvbnN1bCcsXG5cdFx0Y2hhbmNlbGxvcjogJ3ByYWV0b3InXG5cdH1cbn1cblxuZnVuY3Rpb24gdHJhbnNsYXRlKHN0cmluZylcbntcblx0bGV0IGtleSA9IHN0cmluZy50b0xvd2VyQ2FzZSgpLFxuXHRcdHZhbHVlID0gdGhlbWVzW2FjdGl2ZVRoZW1lXVtrZXldIHx8IHRoZW1lcy5oaXRsZXJba2V5XSB8fCBzdHJpbmc7XG5cblx0Ly8gc3RhcnRzIHdpdGggdXBwZXIgY2FzZSwgcmVzdCBpcyBsb3dlclxuXHRsZXQgaXNQcm9wZXIgPSBzdHJpbmcuY2hhckF0KDApID09IHN0cmluZy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSAmJiBzdHJpbmcuc2xpY2UoMSkgPT0gc3RyaW5nLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG5cdGlmKGlzUHJvcGVyKXtcblx0XHR2YWx1ZSA9IHZhbHVlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdmFsdWUuc2xpY2UoMSk7XG5cdH1cblxuXHRyZXR1cm4gdmFsdWU7XG59XG5cbmV4cG9ydCB7dHJhbnNsYXRlLCBhY3RpdmVUaGVtZX0iLCJpbXBvcnQge2FjdGl2ZVRoZW1lIGFzIHRoZW1lfSBmcm9tICcuL3RoZW1lJztcblxubGV0IHRoZW1lTW9kZWxzID0ge1xuXHRjYWVzYXI6IHtcblx0XHRsYXVyZWxzOiAnL3N0YXRpYy9tb2RlbC9sYXVyZWxzLmdsdGYnXG5cdH0sXG5cdGhpdGxlcjoge1xuXHRcdHRvcGhhdDogJy9zdGF0aWMvbW9kZWwvdG9waGF0LmdsdGYnLFxuXHRcdHZpc29yY2FwOiAnL3N0YXRpYy9tb2RlbC92aXNvcl9jYXAuZ2x0Zidcblx0fVxufTtcblxubGV0IGFzc2V0cyA9IHtcblx0bWFuaWZlc3Q6IHtcblx0XHRtb2RlbHM6IE9iamVjdC5hc3NpZ24oe1xuXHRcdFx0dGFibGU6ICcvc3RhdGljL21vZGVsL3RhYmxlLmdsdGYnLFxuXHRcdFx0bmFtZXBsYXRlOiAnL3N0YXRpYy9tb2RlbC9uYW1lcGxhdGUuZGFlJyxcblx0XHRcdC8vZHVtbXk6ICcvc3RhdGljL21vZGVsL2R1bW15LmdsdGYnLFxuXHRcdFx0Ly9wbGF5ZXJtZXRlcjogJy9zdGF0aWMvbW9kZWwvcGxheWVybWV0ZXIuZ2x0Zidcblx0XHR9LCB0aGVtZU1vZGVsc1t0aGVtZV0pLFxuXHRcdHRleHR1cmVzOiB7XG5cdFx0XHRib2FyZF9sYXJnZTogYC9zdGF0aWMvaW1nLyR7dGhlbWV9L2JvYXJkLWxhcmdlLmpwZ2AsXG5cdFx0XHRib2FyZF9tZWQ6IGAvc3RhdGljL2ltZy8ke3RoZW1lfS9ib2FyZC1tZWRpdW0uanBnYCxcblx0XHRcdGJvYXJkX3NtYWxsOiBgL3N0YXRpYy9pbWcvJHt0aGVtZX0vYm9hcmQtc21hbGwuanBnYCxcblx0XHRcdGNhcmRzOiBgL3N0YXRpYy9pbWcvJHt0aGVtZX0vY2FyZHMuanBnYCxcblx0XHRcdHJlc2V0OiAnL3N0YXRpYy9pbWcvYm9tYi5wbmcnLFxuXHRcdFx0cmVmcmVzaDogJy9zdGF0aWMvaW1nL3JlZnJlc2guanBnJ1xuXHRcdFx0Ly90ZXh0OiAnL3N0YXRpYy9pbWcvdGV4dC5wbmcnXG5cdFx0fVxuXHR9LFxuXHRjYWNoZToge30sXG5cdGZpeE1hdGVyaWFsczogZnVuY3Rpb24oKVxuXHR7XG5cdFx0T2JqZWN0LmtleXModGhpcy5jYWNoZS5tb2RlbHMpLmZvckVhY2goaWQgPT4ge1xuXHRcdFx0dGhpcy5jYWNoZS5tb2RlbHNbaWRdLnRyYXZlcnNlKG9iaiA9PiB7XG5cdFx0XHRcdGlmKG9iai5tYXRlcmlhbCBpbnN0YW5jZW9mIFRIUkVFLk1lc2hTdGFuZGFyZE1hdGVyaWFsKXtcblx0XHRcdFx0XHRsZXQgbmV3TWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKCk7XG5cdFx0XHRcdFx0bmV3TWF0Lm1hcCA9IG9iai5tYXRlcmlhbC5tYXA7XG5cdFx0XHRcdFx0bmV3TWF0LmNvbG9yLmNvcHkob2JqLm1hdGVyaWFsLmNvbG9yKTtcblx0XHRcdFx0XHRuZXdNYXQudHJhbnNwYXJlbnQgPSBvYmoubWF0ZXJpYWwudHJhbnNwYXJlbnQ7XG5cdFx0XHRcdFx0bmV3TWF0LnNpZGUgPSBvYmoubWF0ZXJpYWwuc2lkZTtcblx0XHRcdFx0XHRvYmoubWF0ZXJpYWwgPSBuZXdNYXQ7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFzc2V0czsiLCIndXNlIHN0cmljdCc7XG5cbmxldCBwbGFjZWhvbGRlckdlbyA9IG5ldyBUSFJFRS5Cb3hCdWZmZXJHZW9tZXRyeSguMDAxLCAuMDAxLCAuMDAxKTtcbmxldCBwbGFjZWhvbGRlck1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4ZmZmZmZmLCB2aXNpYmxlOiBmYWxzZX0pO1xubGV0IFBsYWNlaG9sZGVyTWVzaCA9IG5ldyBUSFJFRS5NZXNoKHBsYWNlaG9sZGVyR2VvLCBwbGFjZWhvbGRlck1hdCk7XG5cbmNsYXNzIE5hdGl2ZUNvbXBvbmVudFxue1xuXHRjb25zdHJ1Y3RvcihtZXNoLCBuZWVkc1VwZGF0ZSlcblx0e1xuXHRcdHRoaXMubWVzaCA9IG1lc2g7XG5cdFx0YWx0c3BhY2UuYWRkTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lKTtcblxuXHRcdGlmKG5lZWRzVXBkYXRlKVxuXHRcdFx0dGhpcy51cGRhdGUoKTtcblx0fVxuXG5cdHVwZGF0ZShmaWVsZHMgPSB7fSlcblx0e1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5kYXRhLCBmaWVsZHMpO1xuXHRcdGFsdHNwYWNlLnVwZGF0ZU5hdGl2ZUNvbXBvbmVudCh0aGlzLm1lc2gsIHRoaXMubmFtZSwgdGhpcy5kYXRhKTtcblx0fVxuXG5cdGRlc3Ryb3koKVxuXHR7XG5cdFx0YWx0c3BhY2UucmVtb3ZlTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lKTtcblx0fVxufVxuXG5jbGFzcyBOVGV4dCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKG1lc2gpe1xuXHRcdHRoaXMubmFtZSA9ICduLXRleHQnO1xuXHRcdHRoaXMuZGF0YSA9IHtcblx0XHRcdGZvbnRTaXplOiAxMCxcblx0XHRcdGhlaWdodDogMSxcblx0XHRcdHdpZHRoOiAxMCxcblx0XHRcdHZlcnRpY2FsQWxpZ246ICdtaWRkbGUnLFxuXHRcdFx0aG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJyxcblx0XHRcdHRleHQ6ICcnXG5cdFx0fTtcblx0XHRzdXBlcihtZXNoLCB0cnVlKTtcblxuXHRcdHRoaXMuY29sb3IgPSAnYmxhY2snO1xuXHR9XG5cdHVwZGF0ZShmaWVsZHMgPSB7fSl7XG5cdFx0aWYoZmllbGRzLnRleHQpXG5cdFx0XHRmaWVsZHMudGV4dCA9IGA8Y29sb3I9JHt0aGlzLmNvbG9yfT4ke2ZpZWxkcy50ZXh0fTwvY29sb3I+YDtcblx0XHROYXRpdmVDb21wb25lbnQucHJvdG90eXBlLnVwZGF0ZS5jYWxsKHRoaXMsIGZpZWxkcyk7XG5cdH1cbn1cblxuY2xhc3MgTlNrZWxldG9uUGFyZW50IGV4dGVuZHMgTmF0aXZlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IobWVzaCl7XG5cdFx0dGhpcy5uYW1lID0gJ24tc2tlbGV0b24tcGFyZW50Jztcblx0XHR0aGlzLmRhdGEgPSB7XG5cdFx0XHRpbmRleDogMCxcblx0XHRcdHBhcnQ6ICdoZWFkJyxcblx0XHRcdHNpZGU6ICdjZW50ZXInLCBcblx0XHRcdHVzZXJJZDogMFxuXHRcdH07XG5cdFx0c3VwZXIobWVzaCwgdHJ1ZSk7XG5cdH1cbn1cblxuY2xhc3MgTkJpbGxib2FyZCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKG1lc2gpe1xuXHRcdHRoaXMubmFtZSA9ICduLWJpbGxib2FyZCc7XG5cdFx0c3VwZXIobWVzaCwgZmFsc2UpO1xuXHR9XG59XG5cbmV4cG9ydCB7UGxhY2Vob2xkZXJNZXNoLCBOVGV4dCwgTlNrZWxldG9uUGFyZW50LCBOQmlsbGJvYXJkfTsiLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtOU2tlbGV0b25QYXJlbnR9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XG5pbXBvcnQge2FjdGl2ZVRoZW1lIGFzIHRoZW1lfSBmcm9tICcuL3RoZW1lJztcblxuY2xhc3MgSGF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IobW9kZWwpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuY3VycmVudElkID0gJyc7XG5cdFx0dGhpcy5jb21wb25lbnRzID0ge2hhdDogbnVsbCwgdGV4dDogbnVsbH07XG5cdFx0XG5cdFx0aWYobW9kZWwucGFyZW50KVxuXHRcdFx0bW9kZWwucGFyZW50LnJlbW92ZShtb2RlbCk7XG5cdFx0bW9kZWwudXBkYXRlTWF0cml4V29ybGQodHJ1ZSk7XG5cblx0XHQvLyBncmFiIG1lc2hlc1xuXHRcdGxldCBwcm9wID0gJyc7XG5cdFx0bW9kZWwudHJhdmVyc2Uob2JqID0+IHtcblx0XHRcdGlmKG9iai5uYW1lID09PSAnaGF0JyB8fCBvYmoubmFtZSA9PT0gJ3RleHQnKXtcblx0XHRcdFx0cHJvcCA9IG9iai5uYW1lO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZihvYmogaW5zdGFuY2VvZiBUSFJFRS5NZXNoKXtcblx0XHRcdFx0dGhpc1twcm9wXSA9IG9iajtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIHN0cmlwIG91dCBtaWRkbGUgbm9kZXNcblx0XHRpZih0aGlzLmhhdCl7XG5cdFx0XHR0aGlzLmhhdC5tYXRyaXguY29weSh0aGlzLmhhdC5tYXRyaXhXb3JsZCk7XG5cdFx0XHR0aGlzLmhhdC5tYXRyaXguZGVjb21wb3NlKHRoaXMuaGF0LnBvc2l0aW9uLCB0aGlzLmhhdC5xdWF0ZXJuaW9uLCB0aGlzLmhhdC5zY2FsZSk7XG5cdFx0XHR0aGlzLmFkZCh0aGlzLmhhdCk7XG5cdFx0fVxuXG5cdFx0aWYodGhpcy50ZXh0KXtcblx0XHRcdHRoaXMudGV4dC5tYXRyaXguY29weSh0aGlzLnRleHQubWF0cml4V29ybGQpO1xuXHRcdFx0dGhpcy50ZXh0Lm1hdHJpeC5kZWNvbXBvc2UodGhpcy50ZXh0LnBvc2l0aW9uLCB0aGlzLnRleHQucXVhdGVybmlvbiwgdGhpcy50ZXh0LnNjYWxlKTtcblx0XHRcdHRoaXMuYWRkKHRoaXMudGV4dCk7XG5cdFx0fVxuXG5cdFx0ZC5zY2VuZS5hZGQodGhpcyk7XG5cdH1cblxuXHRzZXRPd25lcih1c2VySWQpXG5cdHtcblx0XHRpZighdGhpcy5jdXJyZW50SWQgJiYgdXNlcklkKXtcblx0XHRcdGQuc2NlbmUuYWRkKHRoaXMpO1xuXHRcdFx0aWYodGhpcy5oYXQpXG5cdFx0XHRcdHRoaXMuY29tcG9uZW50cy5oYXQgPSBuZXcgTlNrZWxldG9uUGFyZW50KHRoaXMuaGF0KTtcblx0XHRcdGlmKHRoaXMudGV4dClcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQgPSBuZXcgTlNrZWxldG9uUGFyZW50KHRoaXMudGV4dCk7XG5cdFx0fVxuXHRcdGVsc2UgaWYodGhpcy5jdXJyZW50SWQgJiYgIXVzZXJJZCl7XG5cdFx0XHRpZih0aGlzLmhhdClcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdC5kZXN0cm95KCk7XG5cdFx0XHRpZih0aGlzLnRleHQpXG5cdFx0XHRcdHRoaXMuY29tcG9uZW50cy50ZXh0LmRlc3Ryb3koKTtcblx0XHRcdGQuc2NlbmUucmVtb3ZlKHRoaXMpO1xuXHRcdH1cblxuXHRcdGlmKHVzZXJJZCl7XG5cdFx0XHRpZih0aGlzLmhhdClcblx0XHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdC51cGRhdGUoe3VzZXJJZH0pO1xuXHRcdFx0aWYodGhpcy50ZXh0KVxuXHRcdFx0XHR0aGlzLmNvbXBvbmVudHMudGV4dC51cGRhdGUoe3VzZXJJZH0pO1xuXHRcdH1cblxuXHRcdHRoaXMuY3VycmVudElkID0gdXNlcklkO1xuXHR9XG59XG5cbmNsYXNzIFByZXNpZGVudEhhdCBleHRlbmRzIEhhdFxue1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdGlmKHRoZW1lID09PSAnY2Flc2FyJylcblx0XHR7XG5cdFx0XHRzdXBlcihBTS5jYWNoZS5tb2RlbHMubGF1cmVscy5jbG9uZSgpKTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC4wOC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoLjUsIDAsIDApO1xuXHRcdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigwLjgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHN1cGVyKEFNLmNhY2hlLm1vZGVscy50b3BoYXQpO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4xNDQvU0guZW52LnBpeGVsc1Blck1ldGVyLCAuMDM4L1NILmVudi5waXhlbHNQZXJNZXRlcik7XG5cdFx0XHR0aGlzLnNjYWxlLm11bHRpcGx5U2NhbGFyKDEuMi9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xuXHRcdH1cblx0XHRcblx0XHRsZXQgYXNzaWduSGF0ID0gKHtkYXRhOiB7Z2FtZX19KSA9PiB7XG5cdFx0XHRsZXQgc2l0dGluZyA9IGdhbWUuc3BlY2lhbEVsZWN0aW9uID8gZ2FtZS5wcmVzaWRlbnQgOiBnYW1lLmxhc3RQcmVzaWRlbnQ7XG5cdFx0XHR0aGlzLnNldE93bmVyKHNpdHRpbmcpO1xuXHRcdH1cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3BlY2lhbEVsZWN0aW9uJywgYXNzaWduSGF0KTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfcHJlc2lkZW50JywgYXNzaWduSGF0KTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGFzdFByZXNpZGVudCcsIGFzc2lnbkhhdCk7XG5cdH1cbn07XG5cbmNsYXNzIENoYW5jZWxsb3JIYXQgZXh0ZW5kcyBIYXRcbntcblx0Y29uc3RydWN0b3IoKXtcblx0XHRpZih0aGVtZSA9PT0gJ2NhZXNhcicpe1xuXHRcdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLmxhdXJlbHMuY2xvbmUoKSk7XG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAuMDgvU0guZW52LnBpeGVsc1Blck1ldGVyLCAuMDMvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KC41LCAwLCAwKTtcblx0XHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMC44L1NILmVudi5waXhlbHNQZXJNZXRlcik7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHRzdXBlcihBTS5jYWNoZS5tb2RlbHMudmlzb3JjYXApO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4wNy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMS4yL1NILmVudi5waXhlbHNQZXJNZXRlcik7XG5cdFx0fVxuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2xhc3RDaGFuY2VsbG9yJywgZSA9PiB7XG5cdFx0XHR0aGlzLnNldE93bmVyKGUuZGF0YS5nYW1lLmxhc3RDaGFuY2VsbG9yKTtcblx0XHR9KTtcblx0fVxufVxuXG5leHBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuY2xhc3MgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IodHlwZSl7XG5cdFx0dGhpcy50eXBlID0gdHlwZTtcblx0fVxuXG5cdGF3YWtlKG9iail7XG5cdFx0dGhpcy5vYmplY3QzRCA9IG9iajtcblx0fVxuXG5cdHN0YXJ0KCl7IH1cblxuXHR1cGRhdGUoZFQpeyB9XG5cblx0ZGlzcG9zZSgpeyB9XG59XG5cbmNsYXNzIEJTeW5jIGV4dGVuZHMgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IoZXZlbnROYW1lKVxuXHR7XG5cdFx0c3VwZXIoJ0JTeW5jJyk7XG5cdFx0dGhpcy5fcyA9IFNILnNvY2tldDtcblxuXHRcdC8vIGxpc3RlbiBmb3IgdXBkYXRlIGV2ZW50c1xuXHRcdHRoaXMuaG9vayA9IHRoaXMuX3Mub24oZXZlbnROYW1lLCB0aGlzLnVwZGF0ZUZyb21TZXJ2ZXIuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5ldmVudE5hbWUgPSBldmVudE5hbWU7XG5cdFx0dGhpcy5vd25lciA9IDA7XG5cdH1cblxuXHR1cGRhdGVGcm9tU2VydmVyKGRhdGEpXG5cdHtcblx0XHR0aGlzLm9iamVjdDNELnBvc2l0aW9uLmZyb21BcnJheShkYXRhLCAwKTtcblx0XHR0aGlzLm9iamVjdDNELnJvdGF0aW9uLmZyb21BcnJheShkYXRhLCAzKTtcblx0fVxuXG5cdHRha2VPd25lcnNoaXAoKVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyICYmIFNILmxvY2FsVXNlci51c2VySWQpXG5cdFx0XHR0aGlzLm93bmVyID0gU0gubG9jYWxVc2VyLnVzZXJJZDtcblx0fVxuXG5cdHVwZGF0ZShkVClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlciAmJiBTSC5sb2NhbFVzZXIuc2tlbGV0b24gJiYgU0gubG9jYWxVc2VyLmlkID09PSB0aGlzLm93bmVyKVxuXHRcdHtcblx0XHRcdGxldCBqID0gU0gubG9jYWxVc2VyLnNrZWxldG9uLmdldEpvaW50KCdIZWFkJyk7XG5cdFx0XHR0aGlzLl9zLmVtaXQodGhpcy5ldmVudE5hbWUsIFsuLi5qLnBvc2l0aW9uLnRvQXJyYXkoKSwgLi4uai5yb3RhdGlvbi50b0FycmF5KCldKTtcblx0XHR9XG5cdH1cblxufVxuXG5leHBvcnQgeyBCZWhhdmlvciwgQlN5bmMgfTtcbiIsImltcG9ydCB7IEJlaGF2aW9yIH0gZnJvbSAnLi9iZWhhdmlvcic7XG5cbmNsYXNzIFF1YXRlcm5pb25Ud2VlbiBleHRlbmRzIFRXRUVOLlR3ZWVuXG57XG5cdGNvbnN0cnVjdG9yKHN0YXRlLCBncm91cCl7XG5cdFx0c3VwZXIoe3Q6IDB9LCBncm91cCk7XG5cdFx0dGhpcy5fc3RhdGUgPSBzdGF0ZTtcblx0XHR0aGlzLl9zdGFydCA9IHN0YXRlLmNsb25lKCk7XG5cdH1cblx0dG8oZW5kLCBkdXJhdGlvbil7XG5cdFx0c3VwZXIudG8oe3Q6IDF9LCBkdXJhdGlvbik7XG5cdFx0dGhpcy5fZW5kID0gZW5kIGluc3RhbmNlb2YgVEhSRUUuUXVhdGVybmlvbiA/IFtlbmRdIDogZW5kO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cdHN0YXJ0KCl7XG5cdFx0dGhpcy5vblVwZGF0ZSgoe3Q6IHByb2dyZXNzfSkgPT4ge1xuXHRcdFx0cHJvZ3Jlc3MgPSBwcm9ncmVzcyAqIHRoaXMuX2VuZC5sZW5ndGg7XG5cdFx0XHRsZXQgbmV4dFBvaW50ID0gTWF0aC5jZWlsKHByb2dyZXNzKTtcblx0XHRcdGxldCBsb2NhbFByb2dyZXNzID0gcHJvZ3Jlc3MgLSBuZXh0UG9pbnQgKyAxO1xuXHRcdFx0bGV0IHBvaW50cyA9IFt0aGlzLl9zdGFydCwgLi4udGhpcy5fZW5kXTtcblx0XHRcdFRIUkVFLlF1YXRlcm5pb24uc2xlcnAocG9pbnRzW25leHRQb2ludC0xXSwgcG9pbnRzW25leHRQb2ludF0sIHRoaXMuX3N0YXRlLCBsb2NhbFByb2dyZXNzKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gc3VwZXIuc3RhcnQoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBXYWl0Rm9yQW5pbXModHdlZW5zKVxue1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cblx0e1xuXHRcdGxldCBhY3RpdmVDb3VudCA9IHR3ZWVucy5sZW5ndGg7XG5cdFx0ZnVuY3Rpb24gY2hlY2tEb25lKCl7XG5cdFx0XHRpZigtLWFjdGl2ZUNvdW50ID09PSAwKSByZXNvbHZlKCk7XG5cdFx0fVxuXG5cdFx0dHdlZW5zLmZvckVhY2godCA9PiB0Lm9uQ29tcGxldGUoY2hlY2tEb25lKSk7XG5cdFx0dHdlZW5zLmZvckVhY2godCA9PiB0LnN0YXJ0KCkpO1xuXHR9KTtcbn1cblxuY29uc3Qgc3BpblBvaW50cyA9IFtcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgTWF0aC5zcXJ0KDIpLzIsIDAsIE1hdGguc3FydCgyKS8yKSxcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMSwgMCwgMCksXG5cdG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIE1hdGguc3FydCgyKS8yLCAwLCAtTWF0aC5zcXJ0KDIpLzIpLFxuXHRuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAwLCAwLCAxKVxuXTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQW5pbWF0ZVxue1xuXHQvKipcblx0ICogTW92ZSBhbiBvYmplY3QgZnJvbSBBIHRvIEJcblx0ICogQHBhcmFtIHtUSFJFRS5PYmplY3QzRH0gdGFyZ2V0IFxuXHQgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuXHQgKi9cblx0c3RhdGljIHNpbXBsZSh0YXJnZXQsIHtwYXJlbnQ9bnVsbCwgcG9zPW51bGwsIHF1YXQ9bnVsbCwgc2NhbGU9bnVsbCwgbWF0cml4PW51bGwsIGR1cmF0aW9uPTYwMH0gPSB7fSlcblx0e1xuXHRcdC8vIGV4dHJhY3QgcG9zaXRpb24vcm90YXRpb24vc2NhbGUgZnJvbSBtYXRyaXhcblx0XHRpZihtYXRyaXgpe1xuXHRcdFx0cG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblx0XHRcdHF1YXQgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXHRcdFx0c2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXHRcdFx0bWF0cml4LmRlY29tcG9zZShwb3MsIHF1YXQsIHNjYWxlKTtcblx0XHR9XG5cblx0XHQvLyBzaHVmZmxlIGhpZXJhcmNoeSwgYnV0IGtlZXAgd29ybGQgdHJhbnNmb3JtIHRoZSBzYW1lXG5cdFx0aWYocGFyZW50ICYmIHRoaXMucGFyZW50ICE9PSB0YXJnZXQucGFyZW50KXtcblx0XHRcdHRhcmdldC5hcHBseU1hdHJpeCh0YXJnZXQucGFyZW50Lm1hdHJpeFdvcmxkKTtcblx0XHRcdHRhcmdldC5hcHBseU1hdHJpeChuZXcgVEhSRUUuTWF0cml4NCgpLmdldEludmVyc2UocGFyZW50Lm1hdHJpeFdvcmxkKSk7XG5cdFx0XHRwYXJlbnQuYWRkKG9iaik7XG5cdFx0fVxuXG5cdFx0bGV0IGFuaW1zID0gW107XG5cblx0XHRpZihwb3Mpe1xuXHRcdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4odGFyZ2V0LnBvc2l0aW9uKVxuXHRcdFx0XHQudG8oe3g6IHBvcy54LCB5OiBwb3MueSwgejogcG9zLnp9LCBkdXJhdGlvbilcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0aWYocXVhdCl7XG5cdFx0XHRhbmltcy5wdXNoKG5ldyBRdWF0ZXJuaW9uVHdlZW4odGFyZ2V0LnF1YXRlcm5pb24pXG5cdFx0XHRcdC50byhxdWF0LCBkdXJhdGlvbilcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0aWYoc2NhbGUpe1xuXHRcdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4odGFyZ2V0LnNjYWxlKVxuXHRcdFx0XHQudG8oe3g6IHNjYWxlLngsIHk6IHNjYWxlLnksIHo6IHNjYWxlLnp9LCBkdXJhdGlvbilcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XG5cdH1cblxuXHRzdGF0aWMgd2FpdChkdXJhdGlvbil7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdHNldFRpbWVvdXQocmVzb2x2ZSwgZHVyYXRpb24pO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIE1ha2UgdGhlIGNhcmQgYXBwZWFyIHdpdGggYSBmbG91cmlzaFxuXHQgKiBAcGFyYW0ge1RIUkVFLk9iamVjdDNEfSBjYXJkIFxuXHQgKi9cblx0c3RhdGljIGNhcmRGbG91cmlzaChjYXJkKVxuXHR7XG5cdFx0Y2FyZC5wb3NpdGlvbi5zZXQoMCwgMCwgMCk7XG5cdFx0Y2FyZC5xdWF0ZXJuaW9uLnNldCgwLDAsMCwxKTtcblx0XHRjYXJkLnNjYWxlLnNldFNjYWxhciguMDAxKTtcblxuXHRcdGxldCBhbmltcyA9IFtdO1xuXG5cdFx0Ly8gYWRkIHBvc2l0aW9uIGFuaW1hdGlvblxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKGNhcmQucG9zaXRpb24pXG5cdFx0XHQudG8oe3g6IDAsIHk6IC43LCB6OiAwfSwgMTUwMClcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLkVsYXN0aWMuT3V0KVxuXHRcdCk7XG5cblx0XHQvLyBhZGQgc3BpbiBhbmltYXRpb25cblx0XHRhbmltcy5wdXNoKG5ldyBRdWF0ZXJuaW9uVHdlZW4oY2FyZC5xdWF0ZXJuaW9uKVxuXHRcdFx0LnRvKHNwaW5Qb2ludHMsIDI1MDApXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0KVxuXHRcdCk7XG5cblx0XHQvLyBhZGQgc2NhbGUgYW5pbWF0aW9uXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4oY2FyZC5zY2FsZSlcblx0XHRcdC50byh7eDogLjUsIHk6IC41LCB6OiAuNX0sIDIwMClcblx0XHQpO1xuXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XG5cdH1cblxuXHRzdGF0aWMgdmFuaXNoKGNhcmQpXG5cdHtcblx0XHRsZXQgYW5pbXMgPSBbXTtcblxuXHRcdC8vIGFkZCBtb3ZlIGFuaW1hdGlvblxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKGNhcmQucG9zaXRpb24pXG5cdFx0XHQudG8oe3k6ICcrMC41J30sIDEwMDApXG5cdFx0KTtcblxuXHRcdC8vIGFkZCBkaXNhcHBlYXIgYW5pbWF0aW9uXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4oY2FyZC5tYXRlcmlhbClcblx0XHRcdC50byh7b3BhY2l0eTogMH0sIDEwMDApXG5cdFx0KTtcblxuXHRcdHJldHVybiBXYWl0Rm9yQW5pbXMoYW5pbXMpO1xuXHR9XG5cblx0c3RhdGljIGJvYihvYmosIGFtcGxpdHVkZSA9IC4wOCwgcGVyaW9kID0gNDAwMClcblx0e1xuXHRcdHJldHVybiBuZXcgVFdFRU4uVHdlZW4ob2JqLnBvc2l0aW9uKVxuXHRcdFx0LnRvKHt5OiBvYmoucG9zaXRpb24ueS1hbXBsaXR1ZGV9LCBwZXJpb2QpXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5TaW51c29pZGFsLkluT3V0KVxuXHRcdFx0LnJlcGVhdChJbmZpbml0eSlcblx0XHRcdC55b3lvKHRydWUpXG5cdFx0XHQuc3RhcnQoKTtcblx0fVxuXG5cdHN0YXRpYyBzcGluKG9iaiwgcGVyaW9kID0gMTAwMDApXG5cdHtcblx0XHRyZXR1cm4gbmV3IFF1YXRlcm5pb25Ud2VlbihvYmoucXVhdGVybmlvbilcblx0XHRcdC50byhzcGluUG9pbnRzLCBwZXJpb2QpXG5cdFx0XHQucmVwZWF0KEluZmluaXR5KVxuXHRcdFx0LnN0YXJ0KCk7XG5cdH1cbn0iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbi8vIGVudW0gY29uc3RhbnRzXG5sZXQgVHlwZXMgPSBPYmplY3QuZnJlZXplKHtcblx0UE9MSUNZX0xJQkVSQUw6IDAsXG5cdFBPTElDWV9GQVNDSVNUOiAxLFxuXHRST0xFX0xJQkVSQUw6IDIsXG5cdFJPTEVfRkFTQ0lTVDogMyxcblx0Uk9MRV9ISVRMRVI6IDQsXG5cdFBBUlRZX0xJQkVSQUw6IDUsXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXG5cdEpBOiA3LFxuXHRORUlOOiA4LFxuXHRCTEFOSzogOSxcblx0Q1JFRElUUzogMTAsXG5cdFZFVE86IDExXG59KTtcblxubGV0IGdlb21ldHJ5ID0gbnVsbCwgbWF0ZXJpYWwgPSBudWxsO1xuXG5mdW5jdGlvbiBpbml0Q2FyZERhdGEoKVxue1xuXHRsZXQgZmxvYXREYXRhID0gW1xuXHRcdC8vIHBvc2l0aW9uIChwb3J0cmFpdClcblx0XHQwLjM1NzUsIDAuNSwgMC4wMDA1LFxuXHRcdC0uMzU3NSwgMC41LCAwLjAwMDUsXG5cdFx0LS4zNTc1LCAtLjUsIDAuMDAwNSxcblx0XHQwLjM1NzUsIC0uNSwgMC4wMDA1LFxuXHRcdDAuMzU3NSwgMC41LCAtLjAwMDUsXG5cdFx0LS4zNTc1LCAwLjUsIC0uMDAwNSxcblx0XHQtLjM1NzUsIC0uNSwgLS4wMDA1LFxuXHRcdDAuMzU3NSwgLS41LCAtLjAwMDUsXG5cdFxuXHRcdC8vIHBvc2l0aW9uIChsYW5kc2NhcGUpXG5cdFx0MC41LCAtLjM1NzUsIDAuMDAwNSxcblx0XHQwLjUsIDAuMzU3NSwgMC4wMDA1LFxuXHRcdC0uNSwgMC4zNTc1LCAwLjAwMDUsXG5cdFx0LS41LCAtLjM1NzUsIDAuMDAwNSxcblx0XHQwLjUsIC0uMzU3NSwgLS4wMDA1LFxuXHRcdDAuNSwgMC4zNTc1LCAtLjAwMDUsXG5cdFx0LS41LCAwLjM1NzUsIC0uMDAwNSxcblx0XHQtLjUsIC0uMzU3NSwgLS4wMDA1LFxuXHRcblx0XHQvLyBVVnNcblx0XHQvKiAtLS0tLS0tLS0tLS0tLSBjYXJkIGZhY2UgLS0tLS0tLS0tLS0tLSAqLyAvKiAtLS0tLS0tLS0tLS0tIGNhcmQgYmFjayAtLS0tLS0tLS0tLS0tLSovXG5cdFx0Ljc1NCwuOTk2LCAuNzU0LC44MzQsIC45OTcsLjgzNCwgLjk5NywuOTk2LCAuNzU0LC44MzQsIC43NTQsLjk5NiwgLjk5NywuOTk2LCAuOTk3LC44MzQsIC8vIGxpYmVyYWwgcG9saWN5XG5cdFx0Ljc1NCwuODIyLCAuNzU0LC42NjAsIC45OTYsLjY2MCwgLjk5NiwuODIyLCAuNzU0LC42NjAsIC43NTQsLjgyMiwgLjk5NiwuODIyLCAuOTk2LC42NjAsIC8vIGZhc2Npc3QgcG9saWN5XG5cdFx0Ljc0NiwuOTk2LCAuNTA1LC45OTYsIC41MDUsLjY1MCwgLjc0NiwuNjUwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGxpYmVyYWwgcm9sZVxuXHRcdC43NDYsLjY0NSwgLjUwNSwuNjQ1LCAuNTA1LC4zMDAsIC43NDYsLjMwMCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBmYXNjaXN0IHJvbGVcblx0XHQuOTk2LC42NDUsIC43NTQsLjY0NSwgLjc1NCwuMzAwLCAuOTk2LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gaGl0bGVyIHJvbGVcblx0XHQuNDk1LC45OTYsIC4yNTUsLjk5NiwgLjI1NSwuNjUwLCAuNDk1LC42NTAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbGliZXJhbCBwYXJ0eVxuXHRcdC40OTUsLjY0NSwgLjI1NSwuNjQ1LCAuMjU1LC4zMDAsIC40OTUsLjMwMCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBmYXNjaXN0IHBhcnR5XG5cdFx0LjI0NCwuOTkyLCAuMDA1LC45OTIsIC4wMDUsLjY1MywgLjI0NCwuNjUzLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGphXG5cdFx0LjI0MywuNjQyLCAuMDA2LC42NDIsIC4wMDYsLjMwMiwgLjI0MywuMzAyLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIG5laW5cblx0XHQuMDIxLC4yNjksIC4wMjEsLjAyMiwgLjM3NSwuMDIyLCAuMzc1LC4yNjksIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gYmxhbmtcblx0XHQuMzk3LC4yNzYsIC4zOTcsLjAxNSwgLjc2NSwuMDE1LCAuNzY1LC4yNzYsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gY3JlZGl0c1xuXHRcdC45NjMsLjI3MCwgLjgwNCwuMjcwLCAuODA0LC4wMjksIC45NjMsLjAyOSwgLjgwNCwuMjcwLCAuOTYzLC4yNzAsIC45NjMsLjAyOSwgLjgwNCwuMDI5LCAvLyB2ZXRvXG5cblx0XTtcblx0XG5cdGxldCBpbnREYXRhID0gW1xuXHRcdC8vIHRyaWFuZ2xlIGluZGV4XG5cdFx0MCwxLDIsIDAsMiwzLCA0LDcsNSwgNSw3LDZcblx0XTtcblx0XG5cdC8vIHR3byBwb3NpdGlvbiBzZXRzLCAxMSBVViBzZXRzLCAxIGluZGV4IHNldFxuXHRsZXQgZ2VvQnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDQqZmxvYXREYXRhLmxlbmd0aCArIDIqaW50RGF0YS5sZW5ndGgpO1xuXHRsZXQgdGVtcCA9IG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCAwLCBmbG9hdERhdGEubGVuZ3RoKTtcblx0dGVtcC5zZXQoZmxvYXREYXRhKTtcblx0dGVtcCA9IG5ldyBVaW50MTZBcnJheShnZW9CdWZmZXIsIDQqZmxvYXREYXRhLmxlbmd0aCwgaW50RGF0YS5sZW5ndGgpO1xuXHR0ZW1wLnNldChpbnREYXRhKTtcblx0XG5cdC8vIGNob3AgdXAgYnVmZmVyIGludG8gdmVydGV4IGF0dHJpYnV0ZXNcblx0bGV0IHBvc0xlbmd0aCA9IDgqMywgdXZMZW5ndGggPSA4KjIsIGluZGV4TGVuZ3RoID0gMTI7XG5cdGxldCBwb3NQb3J0cmFpdCA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDAsIHBvc0xlbmd0aCksIDMpLFxuXHRcdHBvc0xhbmRzY2FwZSA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDQqcG9zTGVuZ3RoLCBwb3NMZW5ndGgpLCAzKTtcblx0bGV0IHV2cyA9IFtdO1xuXHRmb3IobGV0IGk9MDsgaTwxMjsgaSsrKXtcblx0XHR1dnMucHVzaCggbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgOCpwb3NMZW5ndGggKyA0KmkqdXZMZW5ndGgsIHV2TGVuZ3RoKSwgMikgKTtcblx0fVxuXHRsZXQgaW5kZXggPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBVaW50MTZBcnJheShnZW9CdWZmZXIsIDQqZmxvYXREYXRhLmxlbmd0aCwgaW5kZXhMZW5ndGgpLCAxKTtcblx0XG5cdGdlb21ldHJ5ID0gT2JqZWN0LmtleXMoVHlwZXMpLm1hcCgoa2V5LCBpKSA9PlxuXHR7XG5cdFx0bGV0IGdlbyA9IG5ldyBUSFJFRS5CdWZmZXJHZW9tZXRyeSgpO1xuXHRcdGdlby5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgaT09VHlwZXMuSkEgfHwgaT09VHlwZXMuTkVJTiA/IHBvc0xhbmRzY2FwZSA6IHBvc1BvcnRyYWl0KTtcblx0XHRnZW8uYWRkQXR0cmlidXRlKCd1dicsIHV2c1tpXSk7XG5cdFx0Z2VvLnNldEluZGV4KGluZGV4KTtcblx0XHRyZXR1cm4gZ2VvO1xuXHR9KTtcblxuXHRtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KTtcbn1cblxuXG5jbGFzcyBDYXJkIGV4dGVuZHMgVEhSRUUuTWVzaFxue1xuXHRjb25zdHJ1Y3Rvcih0eXBlID0gVHlwZXMuQkxBTkspXG5cdHtcblx0XHRpZighZ2VvbWV0cnkgfHwgIW1hdGVyaWFsKSBpbml0Q2FyZERhdGEoKTtcblxuXHRcdGxldCBnZW8gPSBnZW9tZXRyeVt0eXBlXTtcblx0XHRzdXBlcihnZW8sIG1hdGVyaWFsKTtcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjcpO1xuXHR9XG59XG5cbmNsYXNzIEJsYW5rQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3RvcigpeyBzdXBlcigpOyB9XG59XG5cbmNsYXNzIENyZWRpdHNDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuQ1JFRElUUyk7XG5cdH1cbn1cblxuY2xhc3MgTGliZXJhbFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfTElCRVJBTCwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIEZhc2Npc3RQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0ZBU0NJU1QpO1xuXHR9XG59XG5cbmNsYXNzIFZldG9DYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuVkVUTyk7XG5cdH1cbn1cbmNsYXNzIExpYmVyYWxSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfTElCRVJBTCk7XG5cdH1cbn1cblxuY2xhc3MgRmFzY2lzdFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9GQVNDSVNUKTtcblx0fVxufVxuXG5jbGFzcyBIaXRsZXJSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfSElUTEVSKTtcblx0fVxufVxuXG5jbGFzcyBMaWJlcmFsUGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfTElCRVJBTCk7XG5cdH1cbn1cblxuY2xhc3MgRmFzY2lzdFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0ZBU0NJU1QpO1xuXHR9XG59XG5cbmNsYXNzIEphQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLkpBKTtcblx0fVxufVxuXG5jbGFzcyBOZWluQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLk5FSU4pO1xuXHR9XG59XG5cblxuZXhwb3J0IHtcblx0Q2FyZCwgVHlwZXMsIEJsYW5rQ2FyZCwgQ3JlZGl0c0NhcmQsIFZldG9DYXJkLFxuXHRMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFJvbGVDYXJkLFxuXHRIaXRsZXJSb2xlQ2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZFxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xuaW1wb3J0IHtMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIFZldG9DYXJkfSBmcm9tICcuL2NhcmQnO1xuXG5sZXQgTGliZXJhbFNwb3RzID0ge1xuXHRwb3NpdGlvbnM6IFtcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjY5MCwgMC4wMDEsIC0wLjQyKSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjM0NSwgMC4wMDEsIC0wLjQyKSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjAwMiwgMC4wMDEsIC0wLjQyKSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjM0MCwgMC4wMDEsIC0wLjQyKSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjY5MCwgMC4wMDEsIC0wLjQyKVxuXHRdLFxuXHRxdWF0ZXJuaW9uOiBuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAwLjcwNzEwNjc4MTE4NjU0NzUsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMCksXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjQsIDAuNCwgMC40KVxufSxcbkZhc2Npc3RTcG90cyA9IHtcblx0cG9zaXRpb25zOiBbXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoLS44NjAsIDAuMDAxLCAuNDI1KSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjUxNSwgMC4wMDEsIC40MjUpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uMTcwLCAwLjAwMSwgLjQyNSksXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC4xNzAsIDAuMDAxLCAuNDI1KSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjUxOCwgMC4wMDEsIC40MjUpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuODcwLCAwLjAwMSwgLjQyNSksXHRcblx0XSxcblx0cXVhdGVybmlvbjogbmV3IFRIUkVFLlF1YXRlcm5pb24oLTAuNzA3MTA2NzgxMTg2NTQ3NSwgMCwgMCwgMC43MDcxMDY3ODExODY1NDc1KSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNCwgMC40LCAwLjQpXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHYW1lVGFibGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0Ly8gdGFibGUgc3RhdGVcblx0XHR0aGlzLmxpYmVyYWxDYXJkcyA9IDA7XG5cdFx0dGhpcy5mYXNjaXN0Q2FyZHMgPSAwO1xuXHRcdHRoaXMuY2FyZHMgPSBbXTtcblxuXHRcdHRoaXMudmV0b0NhcmQgPSBuZXcgVmV0b0NhcmQoKTtcblx0XHR0aGlzLnZldG9DYXJkLnNjYWxlLnNldFNjYWxhciguNSk7XG5cdFx0dGhpcy52ZXRvQ2FyZC52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy52ZXRvQ2FyZC5tYXRlcmlhbC50cmFuc3BhcmVudCA9IHRydWU7XG5cdFx0dGhpcy5hZGQodGhpcy52ZXRvQ2FyZCk7XG5cblx0XHQvLyBhZGQgdGFibGUgYXNzZXRcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnRhYmxlO1xuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xuXG5cdFx0Ly8gc2F2ZSByZWZlcmVuY2VzIHRvIHRoZSB0ZXh0dXJlc1xuXHRcdHRoaXMudGV4dHVyZXMgPSBbXG5cdFx0XHRBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9zbWFsbCxcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX21lZCxcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX2xhcmdlXG5cdFx0XTtcblx0XHR0aGlzLnRleHR1cmVzLmZvckVhY2godGV4ID0+IHRleC5mbGlwWSA9IGZhbHNlKTtcblx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1swXSwgdHJ1ZSk7XG5cdFx0XG5cdFx0Ly8gcG9zaXRpb24gdGFibGVcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjg4LCAwKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLmNoYW5nZU1vZGUuYmluZCh0aGlzKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2xpYmVyYWxQb2xpY2llcycsIHRoaXMudXBkYXRlUG9saWNpZXMuYmluZCh0aGlzKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2Zhc2Npc3RQb2xpY2llcycsIHRoaXMudXBkYXRlUG9saWNpZXMuYmluZCh0aGlzKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2ZhaWxlZFZvdGVzJywgdGhpcy51cGRhdGVQb2xpY2llcy5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdGNoYW5nZU1vZGUoe2RhdGE6IHtnYW1lOiB7c3RhdGUsIHR1cm5PcmRlcn19fSlcblx0e1xuXHRcdGlmKHR1cm5PcmRlci5sZW5ndGggPj0gOSlcblx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzJdKTtcblx0XHRlbHNlIGlmKHR1cm5PcmRlci5sZW5ndGggPj0gNylcblx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzFdKTtcblx0XHRlbHNlXG5cdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1swXSk7XG5cdH1cblxuXHRzZXRUZXh0dXJlKG5ld1RleCwgc3dpdGNoTGlnaHRtYXApXG5cdHtcblx0XHR0aGlzLm1vZGVsLnRyYXZlcnNlKG8gPT4ge1xuXHRcdFx0aWYobyBpbnN0YW5jZW9mIFRIUkVFLk1lc2gpXG5cdFx0XHR7XG5cdFx0XHRcdGlmKHN3aXRjaExpZ2h0bWFwKVxuXHRcdFx0XHRcdG8ubWF0ZXJpYWwubGlnaHRNYXAgPSBvLm1hdGVyaWFsLm1hcDtcblxuXHRcdFx0XHRvLm1hdGVyaWFsLm1hcCA9IG5ld1RleDtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdHVwZGF0ZVBvbGljaWVzKHtkYXRhOiB7Z2FtZToge2xpYmVyYWxQb2xpY2llcywgZmFzY2lzdFBvbGljaWVzLCBoYW5kLCBzdGF0ZX19fSlcblx0e1xuXHRcdGxldCB1cGRhdGVzID0gW107XG5cblx0XHQvLyBxdWV1ZSB1cCBjYXJkcyB0byBiZSBhZGRlZCB0byB0aGUgdGFibGUgdGhpcyB1cGRhdGVcblx0XHRmb3IodmFyIGk9dGhpcy5saWJlcmFsQ2FyZHM7IGk8bGliZXJhbFBvbGljaWVzOyBpKyspe1xuXHRcdFx0bGV0IGNhcmQgPSBuZXcgTGliZXJhbFBvbGljeUNhcmQoKTtcblx0XHRcdGNhcmQuYW5pbWF0ZSA9ICgpID0+IEFuaW1hdGUuc2ltcGxlKGNhcmQsIHtcblx0XHRcdFx0cG9zOiBMaWJlcmFsU3BvdHMucG9zaXRpb25zW2ldLFxuXHRcdFx0XHRxdWF0OiBMaWJlcmFsU3BvdHMucXVhdGVybmlvbixcblx0XHRcdFx0c2NhbGU6IExpYmVyYWxTcG90cy5zY2FsZVxuXHRcdFx0fSkudGhlbigoKSA9PiBBbmltYXRlLndhaXQoNTAwKSk7XG5cdFx0XHRjYXJkLnBsYXlTb3VuZCA9ICgpID0+IFNILmF1ZGlvLmxpYmVyYWxTdGluZy5sb2FkZWQudGhlbigoKSA9PiBTSC5hdWRpby5saWJlcmFsU3RpbmcucGxheSgpKTtcblx0XHRcdHVwZGF0ZXMucHVzaChjYXJkKTtcblx0XHR9XG5cdFx0XG5cdFx0Zm9yKHZhciBpPXRoaXMuZmFzY2lzdENhcmRzOyBpPGZhc2Npc3RQb2xpY2llczsgaSsrKXtcblx0XHRcdGxldCBjYXJkID0gbmV3IEZhc2Npc3RQb2xpY3lDYXJkKCk7XG5cdFx0XHRjYXJkLmFuaW1hdGUgPSAoKSA9PiBBbmltYXRlLnNpbXBsZShjYXJkLCB7XG5cdFx0XHRcdHBvczogRmFzY2lzdFNwb3RzLnBvc2l0aW9uc1tpXSxcblx0XHRcdFx0cXVhdDogRmFzY2lzdFNwb3RzLnF1YXRlcm5pb24sXG5cdFx0XHRcdHNjYWxlOiBGYXNjaXN0U3BvdHMuc2NhbGVcblx0XHRcdH0pO1xuXHRcdFx0Y2FyZC5wbGF5U291bmQgPSAoKSA9PiBTSC5hdWRpby5mYXNjaXN0U3RpbmcubG9hZGVkLnRoZW4oKCkgPT4gU0guYXVkaW8uZmFzY2lzdFN0aW5nLnBsYXkoKSk7XG5cdFx0XHR1cGRhdGVzLnB1c2goY2FyZCk7XG5cdFx0fVxuXG5cdFx0aWYoc3RhdGUgPT09ICdhZnRlcm1hdGgnICYmIGhhbmQgPT09IDEpe1xuXHRcdFx0dXBkYXRlcy5wdXNoKHRoaXMudmV0b0NhcmQpO1xuXHRcdH1cblxuXHRcdGxldCBhbmltYXRpb24gPSBudWxsO1xuXHRcdGlmKHVwZGF0ZXMubGVuZ3RoID09PSAxKVxuXHRcdHtcblx0XHRcdGxldCBjYXJkID0gdXBkYXRlc1swXTtcblx0XHRcdGlmKGNhcmQgPT09IHRoaXMudmV0b0NhcmQpXG5cdFx0XHR7XG5cdFx0XHRcdGNhcmQudmlzaWJsZSA9IHRydWU7IGNhcmQubWF0ZXJpYWwub3BhY2l0eSA9IDE7XG5cdFx0XHRcdGFuaW1hdGlvbiA9IEFuaW1hdGUuY2FyZEZsb3VyaXNoKGNhcmQpXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4gQW5pbWF0ZS52YW5pc2goY2FyZCkpXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4geyBjYXJkLnZpc2libGUgPSBmYWxzZTsgfSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuYWRkKGNhcmQpO1xuXHRcdFx0XHR0aGlzLmNhcmRzLnB1c2goY2FyZCk7XG5cdFx0XHRcdGNhcmQucGxheVNvdW5kKCk7XG5cdFx0XHRcdGFuaW1hdGlvbiA9IEFuaW1hdGUuY2FyZEZsb3VyaXNoKGNhcmQpXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4gY2FyZC5hbmltYXRlKCkpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0Ly8gcGxhY2Ugb24gdGhlaXIgc3BvdHNcblx0XHRcdHVwZGF0ZXMuZm9yRWFjaChjYXJkID0+IHtcblx0XHRcdFx0dGhpcy5hZGQoY2FyZCk7XG5cdFx0XHRcdHRoaXMuY2FyZHMucHVzaChjYXJkKTtcblx0XHRcdFx0Y2FyZC5hbmltYXRlKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0YW5pbWF0aW9uID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdFx0fVxuXG5cdFx0aWYoc3RhdGUgPT09ICdhZnRlcm1hdGgnKXtcblx0XHRcdGFuaW1hdGlvbi50aGVuKCgpID0+IHtcblx0XHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHRcdFx0dHlwZTogJ3BvbGljeUFuaW1Eb25lJyxcblx0XHRcdFx0XHRidWJibGVzOiBmYWxzZVxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmKGxpYmVyYWxQb2xpY2llcyA9PT0gMCAmJiBmYXNjaXN0UG9saWNpZXMgPT09IDApe1xuXHRcdFx0dGhpcy5jYXJkcy5mb3JFYWNoKGMgPT4gdGhpcy5yZW1vdmUoYykpO1xuXHRcdH1cblxuXHRcdHRoaXMubGliZXJhbENhcmRzID0gbGliZXJhbFBvbGljaWVzO1xuXHRcdHRoaXMuZmFzY2lzdENhcmRzID0gZmFzY2lzdFBvbGljaWVzO1xuXHR9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5mdW5jdGlvbiBnZXRHYW1lSWQoKVxue1xuXHQvLyBmaXJzdCBjaGVjayB0aGUgdXJsXG5cdGxldCByZSA9IC9bPyZdZ2FtZUlkPShbXiZdKykvLmV4ZWMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG5cdGlmKHJlKXtcblx0XHRyZXR1cm4gcmVbMV07XG5cdH1cblx0ZWxzZSBpZihhbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudCl7XG5cdFx0cmV0dXJuIFNILmVudi5zaWQ7XG5cdH1cblx0ZWxzZSB7XG5cdFx0bGV0IGlkID0gTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwMCApO1xuXHRcdHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKCc/Z2FtZUlkPScraWQpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHBhcnNlQ1NWKHN0cil7XG5cdGlmKCFzdHIpIHJldHVybiBbXTtcblx0ZWxzZSByZXR1cm4gc3RyLnNwbGl0KCcsJyk7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlUXVlc3Rpb24odGV4dCwgdGV4dHVyZSA9IG51bGwpXG57XG5cdGxldCBmb250U3RhY2sgPSAnXCJIZWx2ZXRpY2EgTmV1ZVwiLCBIZWx2ZXRpY2EsIEFyaWFsLCBTYW5zLVNlcmlmJztcblxuXHQvLyBzZXQgdXAgY2FudmFzXG5cdGxldCBibXA7XG5cdGlmKCF0ZXh0dXJlKXtcblx0XHRibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHRibXAud2lkdGggPSA1MTI7XG5cdFx0Ym1wLmhlaWdodCA9IDI1Njtcblx0fVxuXHRlbHNlIHtcblx0XHRibXAgPSB0ZXh0dXJlLmltYWdlO1xuXHR9XG5cblx0bGV0IGcgPSBibXAuZ2V0Q29udGV4dCgnMmQnKTtcblx0Zy5jbGVhclJlY3QoMCwgMCwgNTEyLCAyNTYpO1xuXHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xuXHRnLmZpbGxTdHlsZSA9ICdibGFjayc7XG5cblx0Ly8gd3JpdGUgdGV4dFxuXHRnLmZvbnQgPSAnYm9sZCA1MHB4ICcrZm9udFN0YWNrO1xuXHRsZXQgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcblx0Zm9yKGxldCBpPTA7IGk8bGluZXMubGVuZ3RoOyBpKyspe1xuXHRcdGcuZmlsbFRleHQobGluZXNbaV0sIDI1NiwgNTArNTUqaSk7XG5cdH1cblxuXHRpZih0ZXh0dXJlKXtcblx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcblx0XHRyZXR1cm4gdGV4dHVyZTtcblx0fVxuXHRlbHNlIHtcblx0XHRyZXR1cm4gbmV3IFRIUkVFLkNhbnZhc1RleHR1cmUoYm1wKTtcblx0fVxufVxuXG5mdW5jdGlvbiBtZXJnZU9iamVjdHMoYSwgYiwgZGVwdGg9Milcbntcblx0ZnVuY3Rpb24gdW5pcXVlKGUsIGksIGEpe1xuXHRcdHJldHVybiBhLmluZGV4T2YoZSkgPT09IGk7XG5cdH1cblxuXHRsZXQgYUlzT2JqID0gYSBpbnN0YW5jZW9mIE9iamVjdCwgYklzT2JqID0gYiBpbnN0YW5jZW9mIE9iamVjdDtcblx0aWYoYUlzT2JqICYmIGJJc09iaiAmJiBkZXB0aCA+IDApXG5cdHtcblx0XHRsZXQgcmVzdWx0ID0ge307XG5cdFx0bGV0IGtleXMgPSBbLi4uT2JqZWN0LmtleXMoYSksIC4uLk9iamVjdC5rZXlzKGIpXS5maWx0ZXIodW5pcXVlKTtcblx0XHRmb3IobGV0IGk9MDsgaTxrZXlzLmxlbmd0aDsgaSsrKXtcblx0XHRcdHJlc3VsdFtrZXlzW2ldXSA9IG1lcmdlT2JqZWN0cyhhW2tleXNbaV1dLCBiW2tleXNbaV1dLCBkZXB0aC0xKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXHRlbHNlIGlmKGIgIT09IHVuZGVmaW5lZClcblx0XHRyZXR1cm4gYjtcblx0ZWxzZVxuXHRcdHJldHVybiBhO1xufVxuXG5mdW5jdGlvbiBsYXRlVXBkYXRlKGZuKVxue1xuXHRyZXR1cm4gKC4uLmFyZ3MpID0+IHtcblx0XHRzZXRUaW1lb3V0KCgpID0+IGZuKC4uLmFyZ3MpLCAxNSk7XG5cdH07XG59XG5cbmV4cG9ydCB7IGdldEdhbWVJZCwgcGFyc2VDU1YsIGdlbmVyYXRlUXVlc3Rpb24sIG1lcmdlT2JqZWN0cywgbGF0ZVVwZGF0ZSB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTmFtZXBsYXRlIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC0wLjYzNSwgMC4yMik7XG5cdFx0c2VhdC5hZGQodGhpcyk7XG5cblx0XHQvLyBhZGQgM2QgbW9kZWxcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLm5hbWVwbGF0ZS5jaGlsZHJlblswXS5jbG9uZSgpO1xuXHRcdHRoaXMubW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJLzIsIDAsIE1hdGguUEkvMik7XG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHQvLyBnZW5lcmF0ZSBtYXRlcmlhbFxuXHRcdHRoaXMuYm1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy5ibXAud2lkdGggPSBOYW1lcGxhdGUudGV4dHVyZVNpemU7XG5cdFx0dGhpcy5ibXAuaGVpZ2h0ID0gTmFtZXBsYXRlLnRleHR1cmVTaXplIC8gMjtcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcblx0XHRcdG1hcDogbmV3IFRIUkVFLkNhbnZhc1RleHR1cmUodGhpcy5ibXApXG5cdFx0fSk7XG5cblx0XHQvLyBjcmVhdGUgbGlzdGVuZXIgcHJveGllc1xuXHRcdHRoaXMuX2hvdmVyQmVoYXZpb3IgPSBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlckNvbG9yKHtcblx0XHRcdGNvbG9yOiBuZXcgVEhSRUUuQ29sb3IoMHhmZmE4YTgpXG5cdFx0fSk7XG5cdFx0dGhpcy5tb2RlbC5hZGRCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcblx0XHR0aGlzLm1vZGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5jbGljay5iaW5kKHRoaXMpKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xuXHRcdFx0aWYoc3RhdGUgPT09ICdzZXR1cCcpXG5cdFx0XHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRoaXMubW9kZWwucmVtb3ZlQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0fSk7XG5cdH1cblxuXHR1cGRhdGVUZXh0KHRleHQpXG5cdHtcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcblxuXHRcdC8vIHNldCB1cCBjYW52YXNcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdFx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xuXHRcdGcuZmlsbFN0eWxlID0gJyMyMjInO1xuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XG5cdFx0Zy5mb250ID0gYGJvbGQgJHtmb250U2l6ZX1weCAke2ZvbnRTdGFja31gO1xuXHRcdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGcuZmlsbFRleHQodGV4dCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLzIsICgwLjQyIC0gMC4xMikqKE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yKSk7XG5cblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdH1cblxuXHRjbGljayhlKVxuXHR7XG5cdFx0aWYoU0guZ2FtZS5zdGF0ZSAhPT0gJ3NldHVwJykgcmV0dXJuO1xuXG5cdFx0aWYoIXRoaXMuc2VhdC5vd25lcilcblx0XHRcdHRoaXMucmVxdWVzdEpvaW4oKTtcblx0XHRlbHNlIGlmKHRoaXMuc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxuXHRcdFx0dGhpcy5yZXF1ZXN0TGVhdmUoKTtcblx0XHRlbHNlIGlmKFNILmdhbWUudHVybk9yZGVyLmluY2x1ZGVzKFNILmxvY2FsVXNlci5pZCkpXG5cdFx0XHR0aGlzLnJlcXVlc3RLaWNrKCk7XG5cdH1cblxuXHRyZXF1ZXN0Sm9pbigpXG5cdHtcblx0XHRTSC5zb2NrZXQuZW1pdCgnam9pbicsIE9iamVjdC5hc3NpZ24oe3NlYXROdW06IHRoaXMuc2VhdC5zZWF0TnVtfSwgU0gubG9jYWxVc2VyKSk7XG5cdH1cblxuXHRyZXF1ZXN0TGVhdmUoKVxuXHR7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXHRcdGlmKCFzZWxmLnF1ZXN0aW9uKVxuXHRcdHtcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWxmLnNlYXQuYmFsbG90LmFza1F1ZXN0aW9uKCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byBsZWF2ZT8nLCAnbG9jYWxfbGVhdmUnKVxuXHRcdFx0LnRoZW4oY29uZmlybSA9PiB7XG5cdFx0XHRcdGlmKGNvbmZpcm0pe1xuXHRcdFx0XHRcdFNILnNvY2tldC5lbWl0KCdsZWF2ZScsIFNILmxvY2FsVXNlci5pZCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xuXHRcdH1cblx0fVxuXG5cdHJlcXVlc3RLaWNrKClcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblx0XHRpZighc2VsZi5xdWVzdGlvbilcblx0XHR7XG5cdFx0XHRsZXQgc2VhdCA9IFNILnNlYXRzW1NILnBsYXllcnNbU0gubG9jYWxVc2VyLmlkXS5zZWF0TnVtXTtcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWF0LmJhbGxvdC5hc2tRdWVzdGlvbihcblx0XHRcdFx0J0FyZSB5b3Ugc3VyZSB5b3VcXG53YW50IHRvIHRyeSB0byBraWNrXFxuJ1xuXHRcdFx0XHQrU0gucGxheWVyc1tzZWxmLnNlYXQub3duZXJdLmRpc3BsYXlOYW1lLFxuXHRcdFx0XHQnbG9jYWxfa2ljaydcblx0XHRcdClcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xuXHRcdFx0XHRpZihjb25maXJtKXtcblx0XHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgna2ljaycsIFNILmxvY2FsVXNlci5pZCwgc2VsZi5zZWF0Lm93bmVyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uID0gbnVsbDtcblx0XHRcdH0pXG5cdFx0XHQuY2F0Y2goKCkgPT4geyBzZWxmLnF1ZXN0aW9uID0gbnVsbDsgfSk7XG5cdFx0fVxuXHR9XG59XG5cbk5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSA9IDI1NjtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCAqIGFzIEJhbGxvdFR5cGUgZnJvbSAnLi9iYWxsb3QnO1xuaW1wb3J0IHt0cmFuc2xhdGUgYXMgdHJ9IGZyb20gJy4vdGhlbWUnO1xuXG5mdW5jdGlvbiB1cGRhdGVWb3Rlc0luUHJvZ3Jlc3Moe2RhdGE6IHtnYW1lLCBwbGF5ZXJzLCB2b3Rlc319KVxue1xuXHRsZXQgYmFsbG90ID0gdGhpcztcblx0aWYoIWJhbGxvdC5zZWF0Lm93bmVyKSByZXR1cm47XG5cblx0bGV0IHZpcHMgPSBnYW1lLnZvdGVzSW5Qcm9ncmVzcztcblxuXHQvLyB2b3RlcyB0aGUgc2VhdCBvd25lciBjYW5ub3QgcGFydGljaXBhdGUgaW4gKGFscmVhZHkgdm90ZWQgb3IgYmxvY2tlZClcblx0bGV0IGJsYWNrbGlzdGVkVm90ZXMgPSB2aXBzLmZpbHRlcihpZCA9PiB7XG5cdFx0bGV0IHZzID0gWy4uLnZvdGVzW2lkXS55ZXNWb3RlcnMsIC4uLnZvdGVzW2lkXS5ub1ZvdGVyc107XG5cdFx0bGV0IG52ID0gdm90ZXNbaWRdLm5vblZvdGVycztcblx0XHRyZXR1cm4gbnYuaW5jbHVkZXMoYmFsbG90LnNlYXQub3duZXIpIHx8IHZzLmluY2x1ZGVzKGJhbGxvdC5zZWF0Lm93bmVyKTtcblx0fSk7XG5cblx0Ly8gdm90ZXMgYWRkZWQgdGhpcyB1cGRhdGUgdGhhdCB0aGUgc2VhdGVkIHVzZXIgaXMgZWxpZ2libGUgZm9yXG5cdGxldCBuZXdWb3RlcyA9IHZpcHMuZmlsdGVyKFxuXHRcdGlkID0+ICghU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MgfHwgIVNILmdhbWUudm90ZXNJblByb2dyZXNzLmluY2x1ZGVzKGlkKSkgJiYgIWJsYWNrbGlzdGVkVm90ZXMuaW5jbHVkZXMoaWQpXG5cdCk7XG5cblx0Ly8gdm90ZXMgYWxyZWFkeSBwYXJ0aWNpcGF0ZWQgaW4sIHBsdXMgY29tcGxldGVkIHZvdGVzXG5cdGxldCBmaW5pc2hlZFZvdGVzID0gIVNILmdhbWUudm90ZXNJblByb2dyZXNzID8gYmxhY2tsaXN0ZWRWb3Rlc1xuXHRcdDogU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MuZmlsdGVyKGlkID0+ICF2aXBzLmluY2x1ZGVzKGlkKSkuY29uY2F0KGJsYWNrbGlzdGVkVm90ZXMpO1xuXG5cdG5ld1ZvdGVzLmZvckVhY2godklkID0+XG5cdHtcblx0XHQvLyBnZW5lcmF0ZSBuZXcgcXVlc3Rpb24gdG8gYXNrXG5cdFx0bGV0IHF1ZXN0aW9uVGV4dCwgb3B0cyA9IHt9O1xuXHRcdGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2VsZWN0Jyl7XG5cdFx0XHRxdWVzdGlvblRleHQgPSBwbGF5ZXJzW2dhbWUucHJlc2lkZW50XS5kaXNwbGF5TmFtZVxuXHRcdFx0XHQrIGAgZm9yICR7dHIoJ3ByZXNpZGVudCcpfSBhbmQgYFxuXHRcdFx0XHQrIHBsYXllcnNbZ2FtZS5jaGFuY2VsbG9yXS5kaXNwbGF5TmFtZVxuXHRcdFx0XHQrIGAgZm9yICR7dHIoJ2NoYW5jZWxsb3InKX0/YDtcblx0XHR9XG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdqb2luJyl7XG5cdFx0XHRxdWVzdGlvblRleHQgPSB2b3Rlc1t2SWRdLmRhdGEgKyAnIHRvIGpvaW4/Jztcblx0XHR9XG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdraWNrJyl7XG5cdFx0XHRxdWVzdGlvblRleHQgPSAnVm90ZSB0byBraWNrICdcblx0XHRcdFx0KyBwbGF5ZXJzW3ZvdGVzW3ZJZF0udGFyZ2V0MV0uZGlzcGxheU5hbWVcblx0XHRcdFx0KyAnPyc7XG5cdFx0fVxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAndHV0b3JpYWwnKXtcblx0XHRcdHF1ZXN0aW9uVGV4dCA9ICdQbGF5IHR1dG9yaWFsPyc7XG5cdFx0fVxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAnY29uZmlybVJvbGUnKVxuXHRcdHtcblx0XHRcdG9wdHMuY2hvaWNlcyA9IEJhbGxvdFR5cGUuQ09ORklSTTtcblx0XHRcdGxldCByb2xlO1xuXHRcdFx0aWYoYmFsbG90LnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZCl7XG5cdFx0XHRcdHJvbGUgPSBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0ucm9sZTtcblx0XHRcdFx0cm9sZSA9IHRyKHJvbGUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyByb2xlLnNsaWNlKDEpKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRyb2xlID0gJzxSRURBQ1RFRD4nO1xuXHRcdFx0fVxuXHRcdFx0cXVlc3Rpb25UZXh0ID0gJ1lvdXIgcm9sZTpcXG4nICsgcm9sZTtcblx0XHR9XG5cblx0XHRpZihxdWVzdGlvblRleHQpXG5cdFx0e1xuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKHF1ZXN0aW9uVGV4dCwgdklkLCBvcHRzKVxuXHRcdFx0LnRoZW4oYW5zd2VyID0+IHtcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ3ZvdGUnLCB2SWQsIFNILmxvY2FsVXNlci5pZCwgYW5zd2VyKTtcblx0XHRcdH0pXG5cdFx0XHQuY2F0Y2goKCkgPT4gY29uc29sZS5sb2coJ1ZvdGUgc2NydWJiZWQ6JywgdklkKSk7XG5cdFx0fVxuXHR9KTtcblxuXHRpZihmaW5pc2hlZFZvdGVzLmluY2x1ZGVzKGJhbGxvdC5kaXNwbGF5ZWQpKXtcblx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxue1xuXHRsZXQgYmFsbG90ID0gdGhpcztcblxuXHRmdW5jdGlvbiBjaG9vc2VQbGF5ZXIocXVlc3Rpb24sIGNvbmZpcm1RdWVzdGlvbiwgaWQpXG5cdHtcblx0XHRmdW5jdGlvbiBjb25maXJtUGxheWVyKHVzZXJJZClcblx0XHR7XG5cdFx0XHRsZXQgdXNlcm5hbWUgPSBTSC5wbGF5ZXJzW3VzZXJJZF0uZGlzcGxheU5hbWU7XG5cdFx0XHRsZXQgdGV4dCA9IGNvbmZpcm1RdWVzdGlvbi5yZXBsYWNlKCd7fScsIHVzZXJuYW1lKTtcblx0XHRcdHJldHVybiBiYWxsb3QuYXNrUXVlc3Rpb24odGV4dCwgJ2xvY2FsXycraWQrJ19jb25maXJtJylcblx0XHRcdC50aGVuKGNvbmZpcm1lZCA9PiB7XG5cdFx0XHRcdGlmKGNvbmZpcm1lZCl7XG5cdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh1c2VySWQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBjaG9vc2VQbGF5ZXIocXVlc3Rpb24sIGNvbmZpcm1RdWVzdGlvbiwgaWQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gYmFsbG90LmFza1F1ZXN0aW9uKHF1ZXN0aW9uLCAnbG9jYWxfJytpZCwge2Nob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNUfSlcblx0XHQudGhlbihjb25maXJtUGxheWVyKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGhpZGVOb21pbmF0ZVBsYWNlaG9sZGVyKHtkYXRhOiB7Z2FtZX19KVxuXHR7XG5cdFx0aWYoZ2FtZS5zdGF0ZSAhPT0gJ25vbWluYXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfY2hhbmNlbGxvcicpe1xuXHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHR9XG5cdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZU5vbWluYXRlUGxhY2Vob2xkZXIpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaGlkZVBvbGljeVBsYWNlaG9sZGVyKHtkYXRhOiB7Z2FtZX19KVxuXHR7XG5cdFx0aWYoZ2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTEnICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wb2xpY3kxJyB8fFxuXHRcdFx0Z2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTInICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wb2xpY3kyJ1xuXHRcdCl7XG5cdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHRcdH1cblx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlUG9saWN5UGxhY2Vob2xkZXIpO1xuXHR9XG5cblx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXG5cdHtcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcblx0XHRcdGNob29zZVBsYXllcihgQ2hvb3NlIHlvdXIgJHt0cignY2hhbmNlbGxvcicpfSFgLCBgTmFtZSB7fSBhcyAke3RyKCdjaGFuY2VsbG9yJyl9P2AsICdub21pbmF0ZScpXG5cdFx0XHQudGhlbih1c2VySWQgPT4ge1xuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbm9taW5hdGUnLCB1c2VySWQpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKGBDaG9vc2UgeW91ciAke3RyKCdjaGFuY2VsbG9yJyl9IWAsICd3YWl0X2Zvcl9jaGFuY2VsbG9yJywge1xuXHRcdFx0XHRjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCxcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAnbm9taW5hdGUnXG5cdFx0XHR9KTtcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVOb21pbmF0ZVBsYWNlaG9sZGVyKTtcblx0XHR9XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncG9saWN5MScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0bGV0IG9wdHMgPSB7Y2hvaWNlczogQmFsbG90VHlwZS5QT0xJQ1ksIHBvbGljeUhhbmQ6IGdhbWUuaGFuZH07XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkICE9PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwb2xpY3kxJ30pO1xuXHRcdH1cblxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQ2hvb3NlIG9uZVxcbnRvIGRpc2NhcmQhJywgJ2xvY2FsX3BvbGljeTEnLCBvcHRzKVxuXHRcdC50aGVuKGRpc2NhcmQgPT4ge1xuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2Rpc2NhcmRfcG9saWN5MScsIGRpc2NhcmQpO1xuXHRcdH0pO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVQb2xpY3lQbGFjZWhvbGRlcik7XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncG9saWN5MicgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUuY2hhbmNlbGxvcilcblx0e1xuXHRcdGxldCBvcHRzID0ge1xuXHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QT0xJQ1ksXG5cdFx0XHRwb2xpY3lIYW5kOiBnYW1lLmhhbmQsXG5cdFx0XHRpbmNsdWRlVmV0bzogZ2FtZS5mYXNjaXN0UG9saWNpZXMgPT09IDUgJiYgIWJhbGxvdC5ibG9ja1ZldG9cblx0XHR9O1xuXHRcdGlmKFNILmxvY2FsVXNlci5pZCAhPT0gZ2FtZS5jaGFuY2VsbG9yKXtcblx0XHRcdE9iamVjdC5hc3NpZ24ob3B0cywge2Zha2U6IHRydWUsIGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTInfSk7XG5cdFx0fVxuXG5cdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdDaG9vc2Ugb25lXFxudG8gZGlzY2FyZCEnLCAnbG9jYWxfcG9saWN5MicsIG9wdHMpXG5cdFx0LnRoZW4oZGlzY2FyZCA9PiB7XG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnZGlzY2FyZF9wb2xpY3kyJywgZGlzY2FyZCk7XG5cdFx0fSwgZXJyID0+IGNvbnNvbGUuZXJyb3IoZXJyKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZVBvbGljeVBsYWNlaG9sZGVyKTtcblx0fVxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdpbnZlc3RpZ2F0ZScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRjaG9vc2VQbGF5ZXIoJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIG9uZSBwbGF5ZXIgdG8gaW52ZXN0aWdhdGUhJywgJ0ludmVzdGlnYXRlIHt9PycsICdpbnZlc3RpZ2F0ZScpXG5cdFx0XHQudGhlbih1c2VySWQgPT4ge1xuXHRcdFx0XHRTSC5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdFx0XHR0eXBlOiAnaW52ZXN0aWdhdGUnLFxuXHRcdFx0XHRcdGRhdGE6IHVzZXJJZFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2Ugb25lIHBsYXllciB0byBpbnZlc3RpZ2F0ZSEnLCAnd2FpdF9mb3JfaW52ZXN0aWdhdGUnLCB7XG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxuXHRcdFx0XHRmYWtlOiB0cnVlLFxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdpbnZlc3RpZ2F0ZSdcblx0XHRcdH0pO1xuXHRcdFx0bGV0IGNsZWFuVXBGYWtlVm90ZSA9ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xuXHRcdFx0XHRpZihzdGF0ZSAhPT0gJ2ludmVzdGlnYXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfaW52ZXN0aWdhdGUnKVxuXHRcdFx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0XHR9O1xuXHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHR9XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncGVlaycgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0bGV0IG9wdHMgPSB7Y2hvaWNlczogQmFsbG90VHlwZS5QT0xJQ1ksIHBvbGljeUhhbmQ6IDggfCAoZ2FtZS5kZWNrJjcpfTtcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgIT09IGdhbWUucHJlc2lkZW50KXtcblx0XHRcdE9iamVjdC5hc3NpZ24ob3B0cywge2Zha2U6IHRydWUsIGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3BlZWsnfSk7XG5cdFx0fVxuXG5cdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdFeGVjdXRpdmUgcG93ZXI6IFRvcCBvZiBwb2xpY3kgZGVjaycsICdsb2NhbF9wZWVrJywgb3B0cylcblx0XHQudGhlbihkaXNjYXJkID0+IHtcblx0XHRcdFNILnNvY2tldC5lbWl0KCdjb250aW51ZScpO1xuXHRcdH0pO1xuXHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdGlmKHN0YXRlICE9PSAncGVlaycgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ2xvY2FsX3BlZWsnKVxuXHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHR9O1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnbmFtZVN1Y2Nlc3NvcicgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRjaG9vc2VQbGF5ZXIoYEV4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIHRoZSBuZXh0ICR7dHIoJ3ByZXNpZGVudCcpfSFgLCBge30gZm9yICR7dHIoJ3ByZXNpZGVudCcpfT9gLCAnbmFtZVN1Y2Nlc3NvcicpXG5cdFx0XHQudGhlbih1c2VySWQgPT4ge1xuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbmFtZV9zdWNjZXNzb3InLCB1c2VySWQpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKGBFeGVjdXRpdmUgcG93ZXI6IENob29zZSB0aGUgbmV4dCAke3RyKCdwcmVzaWRlbnQnKX0hYCwgJ3dhaXRfZm9yX3N1Y2Nlc3NvcicsIHtcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXG5cdFx0XHRcdGZha2U6IHRydWUsXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ25hbWVTdWNjZXNzb3InXG5cdFx0XHR9KTtcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdFx0aWYoc3RhdGUgIT09ICduYW1lU3VjY2Vzc29yJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3Jfc3VjY2Vzc29yJylcblx0XHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHRcdFx0fTtcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0fVxuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2V4ZWN1dGUnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xuXHRcdFx0Y2hvb3NlUGxheWVyKCdFeGVjdXRpdmUgcG93ZXI6IENob29zZSBhIHBsYXllciB0byBleGVjdXRlIScsICdFeGVjdXRlIHt9PycsICdleGVjdXRlJylcblx0XHRcdC50aGVuKHVzZXJJZCA9PiB7XG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCdleGVjdXRlJywgdXNlcklkKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgYSBwbGF5ZXIgdG8gZXhlY3V0ZSEnLCAnd2FpdF9mb3JfZXhlY3V0ZScsIHtcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXG5cdFx0XHRcdGZha2U6IHRydWUsXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ2V4ZWN1dGUnXG5cdFx0XHR9KTtcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdFx0aWYoc3RhdGUgIT09ICdleGVjdXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfZXhlY3V0ZScpXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHRcdH07XG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHRcdH1cblx0fVxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICd2ZXRvJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXG5cdHtcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQXBwcm92ZSB2ZXRvPycsICdsb2NhbF92ZXRvJykudGhlbihhcHByb3ZlZCA9PiB7XG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCdjb25maXJtX3ZldG8nLCBhcHByb3ZlZCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0FwcHJvdmUgdmV0bz8nLCAnd2FpdF9mb3JfdmV0bycsIHtcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAndmV0bydcblx0XHRcdH0pO1xuXHRcdFx0bGV0IGNsZWFuVXBGYWtlVm90ZSA9ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xuXHRcdFx0XHRpZihzdGF0ZSAhPT0gJ3ZldG8nICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICd3YWl0X2Zvcl92ZXRvJylcblx0XHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHRcdFx0fVxuXHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHR9XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAndmV0bycpe1xuXHRcdGJhbGxvdC5ibG9ja1ZldG8gPSB0cnVlO1xuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2FmdGVybWF0aCcpe1xuXHRcdGJhbGxvdC5ibG9ja1ZldG8gPSBmYWxzZTtcblx0fVxufVxuXG5leHBvcnQge3VwZGF0ZVZvdGVzSW5Qcm9ncmVzcywgdXBkYXRlU3RhdGV9OyIsIid1c2Ugc3RyaWN0JztcblxuLypcbiogRGVja3MgaGF2ZSAxNyBjYXJkczogNiBsaWJlcmFsLCAxMSBmYXNjaXN0LlxuKiBJbiBiaXQtcGFja2VkIGJvb2xlYW4gYXJyYXlzLCAxIGlzIGxpYmVyYWwsIDAgaXMgZmFzY2lzdC5cbiogVGhlIG1vc3Qgc2lnbmlmaWNhbnQgYml0IGlzIGFsd2F5cyAxLlxuKiBFLmcuIDBiMTAxMDAxIHJlcHJlc2VudHMgYSBkZWNrIHdpdGggMiBsaWJlcmFsIGFuZCAzIGZhc2Npc3QgY2FyZHNcbiovXG5cbmxldCBGVUxMX0RFQ0sgPSAweDIwMDNmLFxuXHRGQVNDSVNUID0gMCxcblx0TElCRVJBTCA9IDE7XG5cbmxldCBwb3NpdGlvbnMgPSBbXG5cdDB4MSwgMHgyLCAweDQsIDB4OCxcblx0MHgxMCwgMHgyMCwgMHg0MCwgMHg4MCxcblx0MHgxMDAsIDB4MjAwLCAweDQwMCwgMHg4MDAsXG5cdDB4MTAwMCwgMHgyMDAwLCAweDQwMDAsIDB4ODAwMCxcblx0MHgxMDAwMCwgMHgyMDAwMCwgMHg0MDAwMFxuXTtcblxuZnVuY3Rpb24gbGVuZ3RoKGRlY2spXG57XG5cdHJldHVybiBwb3NpdGlvbnMuZmluZEluZGV4KHMgPT4gcyA+IGRlY2spIC0xO1xufVxuXG5mdW5jdGlvbiBzaHVmZmxlKGRlY2spXG57XG5cdGxldCBsID0gbGVuZ3RoKGRlY2spO1xuXHRmb3IobGV0IGk9bC0xOyBpPjA7IGktLSlcblx0e1xuXHRcdGxldCBvID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaSk7XG5cdFx0bGV0IGlWYWwgPSBkZWNrICYgMSA8PCBpLCBvVmFsID0gZGVjayAmIDEgPDwgbztcblx0XHRsZXQgc3dhcHBlZCA9IGlWYWwgPj4+IGktbyB8IG9WYWwgPDwgaS1vO1xuXHRcdGRlY2sgPSBkZWNrIC0gaVZhbCAtIG9WYWwgKyBzd2FwcGVkO1xuXHR9XG5cblx0cmV0dXJuIGRlY2s7XG59XG5cbmZ1bmN0aW9uIGRyYXdUaHJlZShkKVxue1xuXHRyZXR1cm4gZCA8IDggPyBbMSwgZF0gOiBbZCA+Pj4gMywgOCB8IGQgJiA3XTtcbn1cblxuZnVuY3Rpb24gZGlzY2FyZE9uZShkZWNrLCBwb3MpXG57XG5cdGxldCBib3R0b21IYWxmID0gZGVjayAmICgxIDw8IHBvcyktMTtcblx0bGV0IHRvcEhhbGYgPSBkZWNrICYgfigoMSA8PCBwb3MrMSktMSk7XG5cdHRvcEhhbGYgPj4+PSAxO1xuXHRsZXQgbmV3RGVjayA9IHRvcEhhbGYgfCBib3R0b21IYWxmO1xuXHRcblx0bGV0IHZhbCA9IChkZWNrICYgMTw8cG9zKSA+Pj4gcG9zO1xuXG5cdHJldHVybiBbbmV3RGVjaywgdmFsXTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kKGRlY2ssIHZhbClcbntcblx0cmV0dXJuIGRlY2sgPDwgMSB8IHZhbDtcbn1cblxuZnVuY3Rpb24gdG9BcnJheShkZWNrKVxue1xuXHRsZXQgYXJyID0gW107XG5cdHdoaWxlKGRlY2sgPiAxKXtcblx0XHRhcnIucHVzaChkZWNrICYgMSk7XG5cdFx0ZGVjayA+Pj49IDE7XG5cdH1cblxuXHRyZXR1cm4gYXJyO1xufVxuXG5leHBvcnQge2xlbmd0aCwgc2h1ZmZsZSwgZHJhd1RocmVlLCBkaXNjYXJkT25lLCBhcHBlbmQsIHRvQXJyYXksIEZVTExfREVDSywgTElCRVJBTCwgRkFTQ0lTVH07IiwiJ3VzZSBzdHJpY3Q7J1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHsgQmxhbmtDYXJkLCBKYUNhcmQsIE5laW5DYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgTGliZXJhbFBvbGljeUNhcmQsIFZldG9DYXJkIH0gZnJvbSAnLi9jYXJkJztcbmltcG9ydCB7IGdlbmVyYXRlUXVlc3Rpb24sIGxhdGVVcGRhdGUgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIEJQIGZyb20gJy4vYmFsbG90cHJvY2Vzc29yJztcbmltcG9ydCAqIGFzIEJQQkEgZnJvbSAnLi9icGJhJztcbmltcG9ydCB7TlRleHQsIFBsYWNlaG9sZGVyTWVzaH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcblxubGV0IFBMQVlFUlNFTEVDVCA9IDA7XG5sZXQgQ09ORklSTSA9IDE7XG5sZXQgQklOQVJZID0gMjtcbmxldCBQT0xJQ1kgPSAzO1xuXG5jbGFzcyBCYWxsb3QgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcihzZWF0KVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC0wLjMsIDAuMjUpO1xuXHRcdHRoaXMucm90YXRpb24uc2V0KC41LCBNYXRoLlBJLCAwKTtcblx0XHRzZWF0LmFkZCh0aGlzKTtcblxuXHRcdHRoaXMubGFzdFF1ZXVlZCA9IFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdHRoaXMuZGlzcGxheWVkID0gbnVsbDtcblx0XHR0aGlzLmJsb2NrVmV0byA9IGZhbHNlO1xuXG5cdFx0dGhpcy5feWVzQ2xpY2tIYW5kbGVyID0gbnVsbDtcblx0XHR0aGlzLl9ub0NsaWNrSGFuZGxlciA9IG51bGw7XG5cdFx0dGhpcy5fbm9taW5hdGVIYW5kbGVyID0gbnVsbDtcblx0XHR0aGlzLl9jYW5jZWxIYW5kbGVyID0gbnVsbDtcblxuXHRcdHRoaXMuamFDYXJkID0gbmV3IEphQ2FyZCgpO1xuXHRcdHRoaXMubmVpbkNhcmQgPSBuZXcgTmVpbkNhcmQoKTtcblx0XHRbdGhpcy5qYUNhcmQsIHRoaXMubmVpbkNhcmRdLmZvckVhY2goYyA9PiB7XG5cdFx0XHRjLnBvc2l0aW9uLnNldChjIGluc3RhbmNlb2YgSmFDYXJkID8gLTAuMSA6IDAuMSwgLTAuMSwgMCk7XG5cdFx0XHRjLnNjYWxlLnNldFNjYWxhcigwLjE1KTtcblx0XHRcdGMudmlzaWJsZSA9IGZhbHNlO1xuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKHRoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkKTtcblx0XHR0aGlzLnBvbGljaWVzID0gW107XG5cblx0XHQvL2xldCBnZW8gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSgwLjQsIDAuMik7XG5cdFx0Ly9sZXQgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHt0cmFuc3BhcmVudDogdHJ1ZSwgc2lkZTogVEhSRUUuRG91YmxlU2lkZX0pO1xuXHRcdHRoaXMucXVlc3Rpb24gPSBQbGFjZWhvbGRlck1lc2guY2xvbmUoKTtcblx0XHR0aGlzLnF1ZXN0aW9uLnBvc2l0aW9uLnNldCgwLCAwLjA1LCAwKTtcblx0XHR0aGlzLnF1ZXN0aW9uLnNjYWxlLnNldFNjYWxhciguNSk7XG5cdFx0dGhpcy5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy5hZGQodGhpcy5xdWVzdGlvbik7XG5cblx0XHR0aGlzLnRleHRDb21wb25lbnQgPSBuZXcgTlRleHQodGhpcy5xdWVzdGlvbik7XG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7d2lkdGg6IDEuMSwgaGVpZ2h0OiAuNCwgZm9udFNpemU6IDEsIHZlcnRpY2FsQWxpZ246ICd0b3AnfSk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdm90ZXNJblByb2dyZXNzJywgQlAudXBkYXRlVm90ZXNJblByb2dyZXNzLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUoQlAudXBkYXRlU3RhdGUuYmluZCh0aGlzKSkpO1xuXHR9XG5cblx0YXNrUXVlc3Rpb24ocVRleHQsIGlkLCB7Y2hvaWNlcyA9IEJJTkFSWSwgcG9saWN5SGFuZCA9IDB4MSwgaW5jbHVkZVZldG8gPSBmYWxzZSwgZmFrZSA9IGZhbHNlLCBpc0ludmFsaWQgPSAoKSA9PiB0cnVlfSA9IHt9KVxuXHR7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXG5cdFx0ZnVuY3Rpb24gaXNWb3RlVmFsaWQoKVxuXHRcdHtcblx0XHRcdGxldCBpc0Zha2VWYWxpZCA9IGZha2UgJiYgIWlzSW52YWxpZCgpO1xuXHRcdFx0bGV0IGlzTG9jYWxWb3RlID0gL15sb2NhbC8udGVzdChpZCk7XG5cdFx0XHRsZXQgaXNGaXJzdFVwZGF0ZSA9ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcztcblx0XHRcdGxldCB2b3RlID0gU0gudm90ZXNbaWRdO1xuXHRcdFx0bGV0IHZvdGVycyA9IHZvdGUgPyBbLi4udm90ZS55ZXNWb3RlcnMsIC4uLnZvdGUubm9Wb3RlcnNdIDogW107XG5cdFx0XHRsZXQgYWxyZWFkeVZvdGVkID0gdm90ZXJzLmluY2x1ZGVzKHNlbGYuc2VhdC5vd25lcik7XG5cdFx0XHRyZXR1cm4gaXNMb2NhbFZvdGUgfHwgaXNGaXJzdFVwZGF0ZSB8fCBpc0Zha2VWYWxpZCB8fCB2b3RlICYmICFhbHJlYWR5Vm90ZWQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaG9va1VwUXVlc3Rpb24oKXtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZShxdWVzdGlvbkV4ZWN1dG9yKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBxdWVzdGlvbkV4ZWN1dG9yKHJlc29sdmUsIHJlamVjdClcblx0XHR7XG5cdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBpcyBzdGlsbCByZWxldmFudFxuXHRcdFx0aWYoIWlzVm90ZVZhbGlkKCkpe1xuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KCdWb3RlIG5vIGxvbmdlciB2YWxpZCcpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzaG93IHRoZSBiYWxsb3Rcblx0XHRcdC8vc2VsZi5xdWVzdGlvbi5tYXRlcmlhbC5tYXAgPSBnZW5lcmF0ZVF1ZXN0aW9uKHFUZXh0LCBzZWxmLnF1ZXN0aW9uLm1hdGVyaWFsLm1hcCk7XG5cdFx0XHRzZWxmLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OiBgJHtxVGV4dH1gfSk7XG5cdFx0XHRzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSB0cnVlO1xuXG5cdFx0XHQvLyBob29rIHVwIHEvYSBjYXJkc1xuXHRcdFx0aWYoY2hvaWNlcyA9PT0gQ09ORklSTSB8fCBjaG9pY2VzID09PSBCSU5BUlkpe1xuXHRcdFx0XHRzZWxmLmphQ2FyZC52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdFx0aWYoIWZha2UpXG5cdFx0XHRcdFx0c2VsZi5qYUNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKCd5ZXMnLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdH1cblx0XHRcdGlmKGNob2ljZXMgPT09IEJJTkFSWSl7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQudmlzaWJsZSA9IHRydWU7XG5cdFx0XHRcdGlmKCFmYWtlKVxuXHRcdFx0XHRcdHNlbGYubmVpbkNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKCdubycsIHJlc29sdmUsIHJlamVjdCkpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZihjaG9pY2VzID09PSBQTEFZRVJTRUxFQ1QgJiYgIWZha2Upe1xuXHRcdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdwbGF5ZXJTZWxlY3QnLCByZXNwb25kKCdwbGF5ZXInLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUE9MSUNZKXtcblx0XHRcdFx0bGV0IGNhcmRzID0gQlBCQS50b0FycmF5KHBvbGljeUhhbmQpO1xuXHRcdFx0XHRpZihpbmNsdWRlVmV0bykgY2FyZHMucHVzaCgtMSk7XG5cdFx0XHRcdGNhcmRzLmZvckVhY2goKHZhbCwgaSwgYXJyKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bGV0IGNhcmQgPSBudWxsO1xuXHRcdFx0XHRcdGlmKGZha2UpXG5cdFx0XHRcdFx0XHRjYXJkID0gbmV3IEJsYW5rQ2FyZCgpO1xuXHRcdFx0XHRcdGVsc2UgaWYodmFsID09PSAtMSlcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgVmV0b0NhcmQoKTtcblx0XHRcdFx0XHRlbHNlIGlmKHZhbCA9PT0gQlBCQS5MSUJFUkFMKVxuXHRcdFx0XHRcdFx0Y2FyZCA9IG5ldyBMaWJlcmFsUG9saWN5Q2FyZCgpO1xuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgRmFzY2lzdFBvbGljeUNhcmQoKTtcblxuXHRcdFx0XHRcdGNhcmQuc2NhbGUuc2V0U2NhbGFyKDAuMTUpO1xuXG5cdFx0XHRcdFx0bGV0IHdpZHRoID0gLjE1ICogYXJyLmxlbmd0aDtcblx0XHRcdFx0XHRsZXQgeCA9IC13aWR0aC8yICsgLjE1KmkgKyAuMDc1O1xuXHRcdFx0XHRcdGNhcmQucG9zaXRpb24uc2V0KHgsIC0wLjA3LCAwKTtcblx0XHRcdFx0XHRzZWxmLmFkZChjYXJkKTtcblx0XHRcdFx0XHRzZWxmLnBvbGljaWVzLnB1c2goY2FyZCk7XG5cblx0XHRcdFx0XHRpZighZmFrZSlcblx0XHRcdFx0XHRcdGNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKHZhbCA9PT0gLTEgPyAtMSA6IGksIHJlc29sdmUsIHJlamVjdCkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0c2VsZi5hZGRFdmVudExpc3RlbmVyKCdjYW5jZWxWb3RlJywgcmVzcG9uZCgnY2FuY2VsJywgcmVzb2x2ZSwgcmVqZWN0KSk7XG5cblx0XHRcdHNlbGYuZGlzcGxheWVkID0gaWQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVzcG9uZChhbnN3ZXIsIHJlc29sdmUsIHJlamVjdClcblx0XHR7XG5cdFx0XHRmdW5jdGlvbiBoYW5kbGVyKGV2dClcblx0XHRcdHtcblx0XHRcdFx0Ly8gbWFrZSBzdXJlIG9ubHkgdGhlIG93bmVyIG9mIHRoZSBiYWxsb3QgaXMgYW5zd2VyaW5nXG5cdFx0XHRcdGlmKGFuc3dlciAhPT0gJ2NhbmNlbCcgJiYgc2VsZi5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQpIHJldHVybjtcblxuXHRcdFx0XHQvLyBjbGVhbiB1cFxuXHRcdFx0XHRzZWxmLmphQ2FyZC52aXNpYmxlID0gZmFsc2U7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQudmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSBmYWxzZTtcblx0XHRcdFx0c2VsZi5kaXNwbGF5ZWQgPSBudWxsO1xuXHRcdFx0XHRzZWxmLnJlbW92ZSguLi5zZWxmLnBvbGljaWVzKTtcblx0XHRcdFx0c2VsZi5wb2xpY2llcyA9IFtdO1xuXG5cdFx0XHRcdHNlbGYuamFDYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgc2VsZi5feWVzQ2xpY2tIYW5kbGVyKTtcblx0XHRcdFx0c2VsZi5uZWluQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX25vQ2xpY2tIYW5kbGVyKTtcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigncGxheWVyU2VsZWN0Jywgc2VsZi5fbm9taW5hdGVIYW5kbGVyKTtcblx0XHRcdFx0c2VsZi5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5jZWxWb3RlJywgc2VsZi5fY2FuY2VsSGFuZGxlcik7XG5cblx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBhbnN3ZXIgc3RpbGwgbWF0dGVyc1xuXHRcdFx0XHRpZighaXNWb3RlVmFsaWQoKSB8fCBhbnN3ZXIgPT09ICdjYW5jZWwnKXtcblx0XHRcdFx0XHRyZWplY3QoJ3ZvdGUgY2FuY2VsbGVkJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICd5ZXMnKVxuXHRcdFx0XHRcdHJlc29sdmUodHJ1ZSk7XG5cdFx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnbm8nKVxuXHRcdFx0XHRcdHJlc29sdmUoZmFsc2UpO1xuXHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3BsYXllcicpXG5cdFx0XHRcdFx0cmVzb2x2ZShldnQuZGF0YSk7XG5cdFx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUE9MSUNZKVxuXHRcdFx0XHRcdHJlc29sdmUoYW5zd2VyKTtcblx0XHRcdH1cblxuXHRcdFx0aWYoYW5zd2VyID09PSAneWVzJylcblx0XHRcdFx0c2VsZi5feWVzQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcblx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnbm8nKVxuXHRcdFx0XHRzZWxmLl9ub0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3BsYXllcicpXG5cdFx0XHRcdHNlbGYuX25vbWluYXRlSGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ2NhbmNlbCcpXG5cdFx0XHRcdHNlbGYuX2NhbmNlbEhhbmRsZXIgPSBoYW5kbGVyO1xuXG5cdFx0XHRyZXR1cm4gaGFuZGxlcjtcblx0XHR9XG5cblx0XHRzZWxmLmxhc3RRdWV1ZWQgPSBzZWxmLmxhc3RRdWV1ZWQudGhlbihob29rVXBRdWVzdGlvbiwgaG9va1VwUXVlc3Rpb24pO1xuXG5cdFx0cmV0dXJuIHNlbGYubGFzdFF1ZXVlZDtcblx0fVxufVxuXG5leHBvcnQge0JhbGxvdCwgUExBWUVSU0VMRUNULCBDT05GSVJNLCBCSU5BUlksIFBPTElDWX07IiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtGYXNjaXN0Um9sZUNhcmQsIEhpdGxlclJvbGVDYXJkLCBMaWJlcmFsUm9sZUNhcmQsIEZhc2Npc3RQYXJ0eUNhcmQsIExpYmVyYWxQYXJ0eUNhcmQsIEphQ2FyZCwgTmVpbkNhcmR9IGZyb20gJy4vY2FyZCc7XG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtOQmlsbGJvYXJkfSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGF5ZXJJbmZvIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHR0aGlzLmNhcmQgPSBudWxsO1xuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAsIDAuMyk7XG5cdFx0dGhpcy5zY2FsZS5zZXRTY2FsYXIoMC4zKTtcblx0XHRzZWF0LmFkZCh0aGlzKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUodGhpcy51cGRhdGVTdGF0ZS5iaW5kKHRoaXMpKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignaW52ZXN0aWdhdGUnLCB0aGlzLnByZXNlbnRQYXJ0eS5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZVN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcblx0e1xuXHRcdGlmKHRoaXMuY2FyZCAhPT0gbnVsbClcblx0XHR7XG5cdFx0XHR0aGlzLnJlbW92ZSh0aGlzLmNhcmQpO1xuXHRcdFx0dGhpcy5jYXJkID0gbnVsbDtcblx0XHR9XG5cblx0XHRpZih0aGlzLnNlYXQub3duZXIpXG5cdFx0e1xuXHRcdFx0dGhpcy5wcmVzZW50Um9sZShnYW1lLCBwbGF5ZXJzLCB2b3Rlcyk7XG5cdFx0XHR0aGlzLnByZXNlbnRWb3RlKGdhbWUsIHBsYXllcnMsIHZvdGVzKTtcblx0XHR9XG5cdH1cblxuXHRwcmVzZW50Um9sZShnYW1lLCBwbGF5ZXJzKVxuXHR7XG5cdFx0bGV0IGxvY2FsUGxheWVyID0gcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdO1xuXHRcdGxldCBzZWF0ZWRQbGF5ZXIgPSBwbGF5ZXJzW3RoaXMuc2VhdC5vd25lcl07XG5cblx0XHRsZXQgc2VhdGVkUm9sZVNob3VsZEJlVmlzaWJsZSA9XG5cdFx0XHRnYW1lLnN0YXRlID09PSAnZG9uZScgfHxcblx0XHRcdGdhbWUuc3RhdGUgPT09ICduaWdodCcgJiYgU0gubG9jYWxVc2VyLmlkID09PSB0aGlzLnNlYXQub3duZXIgfHxcblx0XHRcdGxvY2FsUGxheWVyICYmIGxvY2FsUGxheWVyLnJvbGUgPT09ICdmYXNjaXN0JyAmJiAoc2VhdGVkUGxheWVyLnJvbGUgPT09ICdmYXNjaXN0JyB8fCBzZWF0ZWRQbGF5ZXIucm9sZSA9PT0gJ2hpdGxlcicpIHx8XG5cdFx0XHRsb2NhbFBsYXllciAmJiBsb2NhbFBsYXllci5yb2xlID09PSAnaGl0bGVyJyAmJiBzZWF0ZWRQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnICYmIGdhbWUudHVybk9yZGVyLmxlbmd0aCA8IDc7XG5cblx0XHRpZihzZWF0ZWRSb2xlU2hvdWxkQmVWaXNpYmxlKVxuXHRcdHtcblx0XHRcdHN3aXRjaChzZWF0ZWRQbGF5ZXIucm9sZSl7XG5cdFx0XHRcdGNhc2UgJ2Zhc2Npc3QnOiB0aGlzLmNhcmQgPSBuZXcgRmFzY2lzdFJvbGVDYXJkKCk7IGJyZWFrO1xuXHRcdFx0XHRjYXNlICdoaXRsZXInIDogdGhpcy5jYXJkID0gbmV3IEhpdGxlclJvbGVDYXJkKCk7ICBicmVhaztcblx0XHRcdFx0Y2FzZSAnbGliZXJhbCc6IHRoaXMuY2FyZCA9IG5ldyBMaWJlcmFsUm9sZUNhcmQoKTsgYnJlYWs7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYWRkKHRoaXMuY2FyZCk7XG5cdFx0XHRsZXQgYmIgPSBuZXcgTkJpbGxib2FyZCh0aGlzLmNhcmQpO1xuXHRcdH1cblx0fVxuXG5cdHByZXNlbnRWb3RlKGdhbWUsIF8sIHZvdGVzKVxuXHR7XG5cdFx0bGV0IHZvdGUgPSB2b3Rlc1tnYW1lLmxhc3RFbGVjdGlvbl07XG5cblx0XHRpZihnYW1lLnN0YXRlID09PSAnbGFtZUR1Y2snICYmICF2b3RlLm5vblZvdGVycy5pbmNsdWRlcyh0aGlzLnNlYXQub3duZXIpKVxuXHRcdHtcblx0XHRcdGxldCBwbGF5ZXJWb3RlID0gdm90ZS55ZXNWb3RlcnMuaW5jbHVkZXModGhpcy5zZWF0Lm93bmVyKTtcblx0XHRcdHRoaXMuY2FyZCA9IHBsYXllclZvdGUgPyBuZXcgSmFDYXJkKCkgOiBuZXcgTmVpbkNhcmQoKTtcblxuXHRcdFx0dGhpcy5hZGQodGhpcy5jYXJkKTtcblx0XHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuY2FyZCk7XG5cdFx0fVxuXHR9XG5cblx0cHJlc2VudFBhcnR5KHtkYXRhOiB1c2VySWR9KVxuXHR7XG5cdFx0aWYoIXRoaXMuc2VhdC5vd25lciB8fCB0aGlzLnNlYXQub3duZXIgIT09IHVzZXJJZCkgcmV0dXJuO1xuXG5cdFx0bGV0IHJvbGUgPSBTSC5wbGF5ZXJzW3RoaXMuc2VhdC5vd25lcl0ucm9sZTtcblx0XHR0aGlzLmNhcmQgPSAgcm9sZSA9PT0gJ2xpYmVyYWwnID8gbmV3IExpYmVyYWxQYXJ0eUNhcmQoKSA6IG5ldyBGYXNjaXN0UGFydHlDYXJkKCk7XG5cblx0XHR0aGlzLmFkZCh0aGlzLmNhcmQpO1xuXHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuY2FyZCk7XG5cdH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENhcHN1bGVHZW9tZXRyeSBleHRlbmRzIFRIUkVFLkJ1ZmZlckdlb21ldHJ5XG57XG5cdGNvbnN0cnVjdG9yKHJhZGl1cywgaGVpZ2h0LCBzZWdtZW50cyA9IDEyLCByaW5ncyA9IDgpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0bGV0IG51bVZlcnRzID0gMiAqIHJpbmdzICogc2VnbWVudHMgKyAyO1xuXHRcdGxldCBudW1GYWNlcyA9IDQgKiByaW5ncyAqIHNlZ21lbnRzO1xuXHRcdGxldCB0aGV0YSA9IDIqTWF0aC5QSS9zZWdtZW50cztcblx0XHRsZXQgcGhpID0gTWF0aC5QSS8oMipyaW5ncyk7XG5cblx0XHRsZXQgdmVydHMgPSBuZXcgRmxvYXQzMkFycmF5KDMqbnVtVmVydHMpO1xuXHRcdGxldCBmYWNlcyA9IG5ldyBVaW50MTZBcnJheSgzKm51bUZhY2VzKTtcblx0XHRsZXQgdmkgPSAwLCBmaSA9IDAsIHRvcENhcCA9IDAsIGJvdENhcCA9IDE7XG5cblx0XHR2ZXJ0cy5zZXQoWzAsIGhlaWdodC8yLCAwXSwgMyp2aSsrKTtcblx0XHR2ZXJ0cy5zZXQoWzAsIC1oZWlnaHQvMiwgMF0sIDMqdmkrKyk7XG5cblx0XHRmb3IoIGxldCBzPTA7IHM8c2VnbWVudHM7IHMrKyApXG5cdFx0e1xuXHRcdFx0Zm9yKCBsZXQgcj0xOyByPD1yaW5nczsgcisrKVxuXHRcdFx0e1xuXHRcdFx0XHRsZXQgcmFkaWFsID0gcmFkaXVzICogTWF0aC5zaW4ocipwaGkpO1xuXG5cdFx0XHRcdC8vIGNyZWF0ZSB2ZXJ0c1xuXHRcdFx0XHR2ZXJ0cy5zZXQoW1xuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguY29zKHMqdGhldGEpLFxuXHRcdFx0XHRcdGhlaWdodC8yIC0gcmFkaXVzKigxLU1hdGguY29zKHIqcGhpKSksXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5zaW4ocyp0aGV0YSlcblx0XHRcdFx0XSwgMyp2aSsrKTtcblxuXHRcdFx0XHR2ZXJ0cy5zZXQoW1xuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguY29zKHMqdGhldGEpLFxuXHRcdFx0XHRcdC1oZWlnaHQvMiArIHJhZGl1cyooMS1NYXRoLmNvcyhyKnBoaSkpLFxuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguc2luKHMqdGhldGEpXG5cdFx0XHRcdF0sIDMqdmkrKyk7XG5cblx0XHRcdFx0bGV0IHRvcF9zMXIxID0gdmktMiwgdG9wX3MxcjAgPSB2aS00O1xuXHRcdFx0XHRsZXQgYm90X3MxcjEgPSB2aS0xLCBib3RfczFyMCA9IHZpLTM7XG5cdFx0XHRcdGxldCB0b3BfczByMSA9IHRvcF9zMXIxIC0gMipyaW5ncywgdG9wX3MwcjAgPSB0b3BfczFyMCAtIDIqcmluZ3M7XG5cdFx0XHRcdGxldCBib3RfczByMSA9IGJvdF9zMXIxIC0gMipyaW5ncywgYm90X3MwcjAgPSBib3RfczFyMCAtIDIqcmluZ3M7XG5cdFx0XHRcdGlmKHMgPT09IDApe1xuXHRcdFx0XHRcdHRvcF9zMHIxICs9IG51bVZlcnRzLTI7XG5cdFx0XHRcdFx0dG9wX3MwcjAgKz0gbnVtVmVydHMtMjtcblx0XHRcdFx0XHRib3RfczByMSArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHRcdGJvdF9zMHIwICs9IG51bVZlcnRzLTI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBjcmVhdGUgZmFjZXNcblx0XHRcdFx0aWYociA9PT0gMSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGZhY2VzLnNldChbdG9wQ2FwLCB0b3BfczFyMSwgdG9wX3MwcjFdLCAzKmZpKyspO1xuXHRcdFx0XHRcdGZhY2VzLnNldChbYm90Q2FwLCBib3RfczByMSwgYm90X3MxcjFdLCAzKmZpKyspO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGZhY2VzLnNldChbdG9wX3MxcjAsIHRvcF9zMXIxLCB0b3BfczByMF0sIDMqZmkrKyk7XG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFt0b3BfczByMCwgdG9wX3MxcjEsIHRvcF9zMHIxXSwgMypmaSsrKTtcblxuXHRcdFx0XHRcdGZhY2VzLnNldChbYm90X3MwcjEsIGJvdF9zMXIxLCBib3RfczByMF0sIDMqZmkrKyk7XG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFtib3RfczByMCwgYm90X3MxcjEsIGJvdF9zMXIwXSwgMypmaSsrKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBjcmVhdGUgbG9uZyBzaWRlc1xuXHRcdFx0bGV0IHRvcF9zMSA9IHZpLTIsIHRvcF9zMCA9IHRvcF9zMSAtIDIqcmluZ3M7XG5cdFx0XHRsZXQgYm90X3MxID0gdmktMSwgYm90X3MwID0gYm90X3MxIC0gMipyaW5ncztcblx0XHRcdGlmKHMgPT09IDApe1xuXHRcdFx0XHR0b3BfczAgKz0gbnVtVmVydHMtMjtcblx0XHRcdFx0Ym90X3MwICs9IG51bVZlcnRzLTI7XG5cdFx0XHR9XG5cblx0XHRcdGZhY2VzLnNldChbdG9wX3MwLCB0b3BfczEsIGJvdF9zMV0sIDMqZmkrKyk7XG5cdFx0XHRmYWNlcy5zZXQoW2JvdF9zMCwgdG9wX3MwLCBib3RfczFdLCAzKmZpKyspO1xuXHRcdH1cblxuXHRcdHRoaXMuYWRkQXR0cmlidXRlKCdwb3NpdGlvbicsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUodmVydHMsIDMpKTtcblx0XHR0aGlzLnNldEluZGV4KG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoZmFjZXMsIDEpKTtcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBDYXBzdWxlR2VvbWV0cnkgZnJvbSAnLi9jYXBzdWxlZ2VvbWV0cnknO1xuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcblxubGV0IGhpdGJveEdlbyA9IG5ldyBDYXBzdWxlR2VvbWV0cnkoMC4zLCAxLjgpO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBIaXRib3ggZXh0ZW5kcyBUSFJFRS5NZXNoXG57XG5cdGNvbnN0cnVjdG9yKHNlYXQpXG5cdHtcblx0XHRzdXBlcihoaXRib3hHZW8sIG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZSxcblx0XHRcdG9wYWNpdHk6IDAsXG5cdFx0XHRzaWRlOiBUSFJFRS5CYWNrU2lkZVxuXHRcdH0pKTtcblxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC0wLjcsIC0uMik7XG5cdFx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHRzZWF0LmFkZCh0aGlzKTtcblxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29yZW50ZXInLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwLjEpO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ybGVhdmUnLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwKTtcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgKCkgPT4ge1xuXHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHRcdHR5cGU6ICdwbGF5ZXJTZWxlY3QnLFxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdFx0ZGF0YTogdGhpcy5zZWF0Lm93bmVyXG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUodGhpcy51cGRhdGVWaXNpYmlsaXR5LmJpbmQodGhpcykpKTtcblx0fVxuXG5cdHVwZGF0ZVZpc2liaWxpdHkoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXG5cdHtcblx0XHRsZXQgbGl2aW5nUGxheWVycyA9IGdhbWUudHVybk9yZGVyLmZpbHRlcihwID0+IHBsYXllcnNbcF0uc3RhdGUgIT09ICdkZWFkJyk7XG5cdFx0bGV0IHByZWNvbmRpdGlvbnMgPVxuXHRcdFx0U0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCAmJlxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSAnJyAmJlxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQgJiZcblx0XHRcdGxpdmluZ1BsYXllcnMuaW5jbHVkZXModGhpcy5zZWF0Lm93bmVyKTtcblxuXHRcdGxldCBub21pbmF0ZWFibGUgPVxuXHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJlxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBnYW1lLmxhc3RDaGFuY2VsbG9yICYmXG5cdFx0XHQobGl2aW5nUGxheWVycy5sZW5ndGggPD0gNSB8fCB0aGlzLnNlYXQub3duZXIgIT09IGdhbWUubGFzdFByZXNpZGVudCk7XG5cblx0XHRsZXQgaW52ZXN0aWdhdGVhYmxlID1cblx0XHRcdGdhbWUuc3RhdGUgPT09ICdpbnZlc3RpZ2F0ZScgJiZcblx0XHRcdHBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXSAmJiBwbGF5ZXJzW3RoaXMuc2VhdC5vd25lcl0uc3RhdGUgPT09ICdub3JtYWwnO1xuXG5cdFx0bGV0IHN1Y2NlZWRhYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ25hbWVTdWNjZXNzb3InO1xuXHRcdGxldCBleGVjdXRhYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ2V4ZWN1dGUnO1xuXG5cdFx0dGhpcy52aXNpYmxlID0gcHJlY29uZGl0aW9ucyAmJiAobm9taW5hdGVhYmxlIHx8IGludmVzdGlnYXRlYWJsZSB8fCBzdWNjZWVkYWJsZSB8fCBleGVjdXRhYmxlKTtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XG5pbXBvcnQge0JhbGxvdH0gZnJvbSAnLi9iYWxsb3QnO1xuaW1wb3J0IFBsYXllckluZm8gZnJvbSAnLi9wbGF5ZXJpbmZvJztcbmltcG9ydCBIaXRib3ggZnJvbSAnLi9oaXRib3gnO1xuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2VhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXROdW0pXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zZWF0TnVtID0gc2VhdE51bTtcblx0XHR0aGlzLm93bmVyID0gJyc7XG5cblx0XHQvLyBwb3NpdGlvbiBzZWF0XG5cdFx0bGV0IHgsIHk9MC42NSwgejtcblx0XHRzd2l0Y2goc2VhdE51bSl7XG5cdFx0Y2FzZSAwOiBjYXNlIDE6IGNhc2UgMjpcblx0XHRcdHggPSAtMC44MzMgKyAwLjgzMypzZWF0TnVtO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoeCwgeSwgLTEuMDUpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAzOiBjYXNlIDQ6XG5cdFx0XHR6ID0gLTAuNDM3ICsgMC44NzQqKHNlYXROdW0tMyk7XG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgxLjQyNSwgeSwgeik7XG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtTWF0aC5QSS8yLCAwKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XG5cdFx0XHR4ID0gMC44MzMgLSAwLjgzMyooc2VhdE51bS01KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIDEuMDUpO1xuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEksIDApO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSA4OiBjYXNlIDk6XG5cdFx0XHR6ID0gMC40MzcgLSAwLjg3NCooc2VhdE51bS04KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KC0xLjQyNSwgeSwgeik7XG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtMS41Kk1hdGguUEksIDApO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2NoZWNrZWRfaW4nLCAoe2RhdGE6IGlkfSkgPT4ge1xuXHRcdFx0aWYodGhpcy5vd25lciA9PT0gaWQpXG5cdFx0XHRcdHRoaXMudXBkYXRlT3duZXJzaGlwKHtkYXRhOiB7Z2FtZTogU0guZ2FtZSwgcGxheWVyczogU0gucGxheWVyc319KTtcblx0XHR9KTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSkgPT4ge1xuXHRcdFx0aWYodGhpcy5vd25lciAmJiBwbGF5ZXJzW3RoaXMub3duZXJdLnN0YXRlID09PSAnZGVhZCcpe1xuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXQoMHgzZDI3ODkpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5uYW1lcGxhdGUgPSBuZXcgTmFtZXBsYXRlKHRoaXMpO1xuXHRcdHRoaXMuYmFsbG90ID0gbmV3IEJhbGxvdCh0aGlzKTtcblx0XHR0aGlzLnBsYXllckluZm8gPSBuZXcgUGxheWVySW5mbyh0aGlzKTtcblx0XHR0aGlzLmhpdGJveCA9IG5ldyBIaXRib3godGhpcyk7XG5cdH1cblxuXHR1cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXG5cdHtcblx0XHRsZXQgaWRzID0gZ2FtZS50dXJuT3JkZXIgfHwgW107XG5cblx0XHQvLyByZWdpc3RlciB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSBjbGFpbWVkXG5cdFx0aWYoICF0aGlzLm93bmVyIClcblx0XHR7XG5cdFx0XHQvLyBjaGVjayBpZiBhIHBsYXllciBoYXMgam9pbmVkIGF0IHRoaXMgc2VhdFxuXHRcdFx0Zm9yKGxldCBpIGluIGlkcyl7XG5cdFx0XHRcdGlmKHBsYXllcnNbaWRzW2ldXS5zZWF0TnVtID09IHRoaXMuc2VhdE51bSl7XG5cdFx0XHRcdFx0dGhpcy5vd25lciA9IGlkc1tpXTtcblx0XHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KHBsYXllcnNbaWRzW2ldXS5kaXNwbGF5TmFtZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyByZXNldCB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSB2YWNhdGVkXG5cdFx0aWYoICFpZHMuaW5jbHVkZXModGhpcy5vd25lcikgKVxuXHRcdHtcblx0XHRcdHRoaXMub3duZXIgPSAnJztcblx0XHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KCc8Sm9pbj4nKTtcblx0XHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ZmZmZmZmKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyB1cGRhdGUgZGlzY29ubmVjdCBjb2xvcnNcblx0XHRlbHNlIGlmKCAhcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcblx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweDgwODA4MCk7XG5cdFx0fVxuXHRcdGVsc2UgaWYoIHBsYXllcnNbdGhpcy5vd25lcl0uY29ubmVjdGVkICl7XG5cdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXRIZXgoMHhmZmZmZmYpO1xuXHRcdH1cblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5CaWxsYm9hcmQsIE5UZXh0fSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29udGludWVCb3ggZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcihwYXJlbnQpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuaWNvbiA9IG5ldyBUSFJFRS5NZXNoKFxuXHRcdFx0bmV3IFRIUkVFLkJveEJ1ZmZlckdlb21ldHJ5KC4xNSwgLjE1LCAuMTUpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHgxMGEwMTB9KVxuXHRcdCk7XG5cdFx0QW5pbWF0ZS5zcGluKHRoaXMuaWNvbik7XG5cdFx0dGhpcy5hZGQodGhpcy5pY29uKTtcblxuXHRcdHRoaXMudGV4dCA9IFBsYWNlaG9sZGVyTWVzaC5jbG9uZSgpO1xuXHRcdHRoaXMudGV4dC5wb3NpdGlvbi5zZXQoMCwgLjIsIDApO1xuXHRcdHRoaXMudGV4dC51c2VyRGF0YS5hbHRzcGFjZSA9IHtjb2xsaWRlcjoge2VuYWJsZWQ6IHRydWV9fTtcblxuXHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMudGV4dCk7XG5cblx0XHR0aGlzLnRleHRDb21wb25lbnQgPSBuZXcgTlRleHQodGhpcy50ZXh0KTtcblx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHtmb250U2l6ZTogMSwgd2lkdGg6IDIsIGhlaWdodDogMSwgaG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJywgdmVydGljYWxBbGlnbjogJ21pZGRsZSd9KTtcblxuXHRcdHRoaXMuYWRkKHRoaXMudGV4dCk7XG5cblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjI1LCAwKTtcblx0XHRwYXJlbnQuYWRkKHRoaXMpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgdGhpcy5vbnN0YXRlY2hhbmdlLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLnBsYXllclNldHVwLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLm9uY2xpY2suYmluZCh0aGlzKSk7XG5cblx0XHRsZXQgc2hvdyA9ICgpID0+IHRoaXMuc2hvdygpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2ludmVzdGlnYXRlJywgc2hvdyk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigncG9saWN5QW5pbURvbmUnLCBzaG93KTtcblx0fVxuXG5cdG9uY2xpY2soZXZ0KVxuXHR7XG5cdFx0aWYoU0guZ2FtZS50dXJuT3JkZXIuaW5jbHVkZXMoU0gubG9jYWxVc2VyLmlkKSlcblx0XHRcdFNILnNvY2tldC5lbWl0KCdjb250aW51ZScpO1xuXHR9XG5cblx0b25zdGF0ZWNoYW5nZSh7ZGF0YToge2dhbWV9fSlcblx0e1xuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdsYW1lRHVjaycgfHwgKGdhbWUuc3RhdGUgPT09ICdwZWVrJyAmJiBnYW1lLnByZXNpZGVudCA9PT0gU0gubG9jYWxVc2VyLmlkKSl7XG5cdFx0XHR0aGlzLnNob3coKTtcblx0XHR9XG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcblx0XHRcdHRoaXMucGxheWVyU2V0dXAoe2RhdGE6IHtnYW1lfX0pO1xuXHRcdH1cblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdkb25lJyl7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0dGhpcy5zaG93KCdOZXcgZ2FtZScpO1xuXHRcdFx0fSwgODAwMCk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dGhpcy5oaWRlKCk7XG5cdFx0fVxuXHR9XG5cblx0cGxheWVyU2V0dXAoe2RhdGE6IHtnYW1lfX0pXG5cdHtcblx0XHRpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcblx0XHRcdHRoaXMudGV4dC52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdGxldCBwbGF5ZXJDb3VudCA9IGdhbWUudHVybk9yZGVyLmxlbmd0aDtcblx0XHRcdGlmKHBsYXllckNvdW50ID49IDUpe1xuXHRcdFx0XHR0aGlzLmljb24udmlzaWJsZSA9IHRydWU7XG5cdFx0XHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6XG5cdFx0XHRcdFx0YCgke3BsYXllckNvdW50fS81KSBDbGljayB3aGVuIHJlYWR5YFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLmljb24udmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OlxuXHRcdFx0XHRcdGAoJHtwbGF5ZXJDb3VudH0vNSkgTmVlZCBtb3JlIHBsYXllcnNgXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHNob3cobWVzc2FnZSA9ICdDbGljayB0byBjb250aW51ZScpe1xuXHRcdHRoaXMuaWNvbi52aXNpYmxlID0gdHJ1ZTtcblx0XHR0aGlzLnRleHQudmlzaWJsZSA9IHRydWU7XG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDogbWVzc2FnZX0pO1xuXHR9XG5cblx0aGlkZSgpe1xuXHRcdHRoaXMuaWNvbi52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy50ZXh0LnZpc2libGUgPSBmYWxzZTtcblx0fVxufTsiLCJpbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcblxuY29uc3QgcG9zaXRpb25zID0gW1xuXHRuZXcgVEhSRUUuVmVjdG9yMygwLjM2OCwgLjAxNSwgLS43MTcpLFxuXHRuZXcgVEhSRUUuVmVjdG9yMygwLjEzNSwgLjAzMCwgLS43MTcpLFxuXHRuZXcgVEhSRUUuVmVjdG9yMygtLjA5NiwgLjA0NSwgLS43MTcpLFxuXHRuZXcgVEhSRUUuVmVjdG9yMygtLjMyOSwgLjA2MCwgLS43MTcpXG5dO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFbGVjdGlvblRyYWNrZXIgZXh0ZW5kcyBUSFJFRS5NZXNoXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKFxuXHRcdFx0bmV3IFRIUkVFLkN5bGluZGVyQnVmZmVyR2VvbWV0cnkoLjA0LCAuMDQsIC4wMywgMTYpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHgxOTE5ZmZ9KVxuXHRcdCk7XG5cdFx0dGhpcy5wb3NpdGlvbi5jb3B5KHBvc2l0aW9uc1swXSk7XG5cdFx0U0gudGFibGUuYWRkKHRoaXMpO1xuXHRcdFxuXHRcdC8vIGZhaWxzJTMgPT0gMCBvciAzP1xuXHRcdHRoaXMuaGlnaFNpZGUgPSBmYWxzZTtcblx0XHR0aGlzLnNwb3QgPSAwO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2ZhaWxlZFZvdGVzJywgdGhpcy51cGRhdGVGYWlsZWRWb3Rlcy5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZUZhaWxlZFZvdGVzKHtkYXRhOiB7Z2FtZToge2ZhaWxlZFZvdGVzfX19ID0ge2RhdGE6IHtnYW1lOiB7ZmFpbGVkVm90ZXM6IC0xfX19KVxuXHR7XG5cdFx0aWYoZmFpbGVkVm90ZXMgPT09IC0xKVxuXHRcdFx0ZmFpbGVkVm90ZXMgPSB0aGlzLnNwb3Q7XG5cblx0XHR0aGlzLmhpZ2hTaWRlID0gZmFpbGVkVm90ZXMgPiAwO1xuXHRcdHRoaXMuc3BvdCA9IGZhaWxlZFZvdGVzJTMgfHwgdGhpcy5oaWdoU2lkZSAmJiAzIHx8IDA7XG5cblx0XHR0aGlzLmFuaW0gPSBBbmltYXRlLnNpbXBsZSh0aGlzLCB7XG5cdFx0XHRwb3M6IHBvc2l0aW9uc1t0aGlzLnNwb3RdLFxuXHRcdFx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDEsIDErdGhpcy5zcG90LCAxKSxcblx0XHRcdGR1cmF0aW9uOiAxMjAwXG5cdFx0fSk7XG5cdH1cbn0iLCJpbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtDcmVkaXRzQ2FyZH0gZnJvbSAnLi9jYXJkJztcbmltcG9ydCB7UGxhY2Vob2xkZXJNZXNoLCBOQmlsbGJvYXJkLCBOVGV4dH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XG5pbXBvcnQge3RyYW5zbGF0ZSBhcyB0cn0gZnJvbSAnLi90aGVtZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFByZXNlbnRhdGlvbiBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0U0guYWRkKHRoaXMpO1xuXG5cdFx0Ly8gY3JlYXRlIGlkbGUgZGlzcGxheVxuXHRcdHRoaXMuY3JlZGl0cyA9IG5ldyBDcmVkaXRzQ2FyZCgpO1xuXHRcdHRoaXMuY3JlZGl0cy5wb3NpdGlvbi5zZXQoMCwgMS44NSwgMCk7XG5cdFx0QW5pbWF0ZS5zcGluKHRoaXMuY3JlZGl0cywgMzAwMDApO1xuXHRcdHRoaXMuYWRkKHRoaXMuY3JlZGl0cyk7XG5cdFx0XG5cdFx0Ly8gY3JlYXRlIHZpY3RvcnkgYmFubmVyXG5cdFx0dGhpcy5iYW5uZXIgPSBQbGFjZWhvbGRlck1lc2guY2xvbmUoKTtcblx0XHR0aGlzLmJhbm5lci50ZXh0ID0gbmV3IE5UZXh0KHRoaXMuYmFubmVyKTtcblx0XHR0aGlzLmJhbm5lci50ZXh0LnVwZGF0ZSh7Zm9udFNpemU6IDJ9KTtcblx0XHR0aGlzLmJhbm5lci5iaWxsYm9hcmQgPSBuZXcgTkJpbGxib2FyZCh0aGlzLmJhbm5lcik7XG5cdFx0dGhpcy5iYW5uZXIuYm9iID0gbnVsbDtcblx0XHR0aGlzLmFkZCh0aGlzLmJhbm5lcik7XG5cblx0XHQvLyB1cGRhdGUgc3R1ZmZcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCB0aGlzLnVwZGF0ZU9uU3RhdGUuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVPblN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxuXHR7XG5cdFx0dGhpcy5iYW5uZXIudmlzaWJsZSA9IGZhbHNlO1xuXHRcdHRoaXMuY3JlZGl0cy52aXNpYmxlID0gZmFsc2U7XG5cdFx0aWYodGhpcy5iYW5uZXIuYm9iKXtcblx0XHRcdHRoaXMuYmFubmVyLmJvYi5zdG9wKCk7XG5cdFx0XHR0aGlzLmJhbm5lci5ib2IgPSBudWxsO1xuXHRcdH1cblxuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xuXHRcdFx0dGhpcy5jcmVkaXRzLnZpc2libGUgPSB0cnVlO1xuXHRcdH1cblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdkb25lJylcblx0XHR7XG5cdFx0XHRpZigvXmxpYmVyYWwvLnRlc3QoZ2FtZS52aWN0b3J5KSl7XG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQuY29sb3IgPSAnIzE5MTlmZic7XG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQudXBkYXRlKHt0ZXh0OiAnTGliZXJhbHMgd2luISd9KTtcblx0XHRcdFx0U0guYXVkaW8ubGliZXJhbEZhbmZhcmUucGxheSgpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQuY29sb3IgPSAncmVkJztcblx0XHRcdFx0dGhpcy5iYW5uZXIudGV4dC51cGRhdGUoe3RleHQ6ICdGYXNjaXN0cyB3aW4hJ30pO1xuXHRcdFx0XHRTSC5hdWRpby5mYXNjaXN0RmFuZmFyZS5wbGF5KCk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHRoaXMuYmFubmVyLnBvc2l0aW9uLnNldCgwLDAuOCwwKTtcblx0XHRcdHRoaXMuYmFubmVyLnNjYWxlLnNldFNjYWxhciguMDAxKTtcblx0XHRcdHRoaXMuYmFubmVyLnZpc2libGUgPSB0cnVlO1xuXHRcdFx0QW5pbWF0ZS5zaW1wbGUodGhpcy5iYW5uZXIsIHtcblx0XHRcdFx0cG9zOiBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLjgsIDApLFxuXHRcdFx0XHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMSwxLDEpLFxuXHRcdFx0XHRkdXJhdGlvbjogMTAwMFxuXHRcdFx0fSlcblx0XHRcdC50aGVuKCgpID0+IHRoaXMuYmFubmVyLmJvYiA9IEFuaW1hdGUuYm9iKHRoaXMuYmFubmVyKSk7XG5cdFx0fVxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTEnICYmIGdhbWUuZmFzY2lzdFBvbGljaWVzID49IDMpXG5cdFx0e1xuXHRcdFx0bGV0IGNoYW5jZWxsb3IgPSBwbGF5ZXJzW2dhbWUuY2hhbmNlbGxvcl0uZGlzcGxheU5hbWU7XG5cdFx0XHR0aGlzLmJhbm5lci50ZXh0LmNvbG9yID0gJ3doaXRlJztcblx0XHRcdHRoaXMuYmFubmVyLnRleHQudXBkYXRlKHt0ZXh0OiBgJHtjaGFuY2VsbG9yfSBpcyBub3QgJHt0cignSGl0bGVyJyl9IWB9KTtcblxuXHRcdFx0dGhpcy5iYW5uZXIucG9zaXRpb24uc2V0KDAsMC44LDApO1xuXHRcdFx0dGhpcy5iYW5uZXIuc2NhbGUuc2V0U2NhbGFyKC4wMDEpO1xuXHRcdFx0dGhpcy5iYW5uZXIudmlzaWJsZSA9IHRydWU7XG5cdFx0XHRBbmltYXRlLnNpbXBsZSh0aGlzLmJhbm5lciwge1xuXHRcdFx0XHRwb3M6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEuOCwgMCksXG5cdFx0XHRcdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygxLDEsMSlcblx0XHRcdH0pXG5cdFx0XHQudGhlbigoKSA9PiB0aGlzLmJhbm5lci5ib2IgPSBBbmltYXRlLmJvYih0aGlzLmJhbm5lcikpO1xuXHRcdH1cblx0XHRcblx0fVxufVxuIiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCB7YWN0aXZlVGhlbWUgYXMgdGhlbWV9IGZyb20gJy4vdGhlbWUnO1xuXG5jbGFzcyBBdWRpb1N0cmVhbVxue1xuXHRjb25zdHJ1Y3Rvcihjb250ZXh0LCBidWZmZXIsIG91dHB1dCl7XG5cdFx0dGhpcy5zb3VyY2UgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuXHRcdHRoaXMuc291cmNlLmJ1ZmZlciA9IGJ1ZmZlcjtcblx0XHR0aGlzLnNvdXJjZS5jb25uZWN0KG91dHB1dCk7XG5cdFx0dGhpcy5maW5pc2hlZFBsYXlpbmcgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHR0aGlzLl9yZXNvbHZlID0gcmVzb2x2ZTtcblx0XHR9KTtcblx0fVxuXG5cdHBsYXkoKXtcblx0XHR0aGlzLnNvdXJjZS5zdGFydCgwLCAwKTtcblx0XHRzZXRUaW1lb3V0KHRoaXMuX3Jlc29sdmUsIE1hdGguY2VpbCh0aGlzLnNvdXJjZS5idWZmZXIuZHVyYXRpb24qMTAwMCArIDQwMCkpO1xuXHR9XG5cblx0c3RvcCgpe1xuXHRcdHRoaXMuc291cmNlLnN0b3AoKTtcblx0fVxufVxuXG5sZXQgcXVldWVkU3RyZWFtcyA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG5jbGFzcyBBdWRpb0NsaXBcbntcblx0Y29uc3RydWN0b3IoY29udGV4dCwgdXJsLCB2b2x1bWUsIHF1ZXVlZCA9IHRydWUpXG5cdHtcblx0XHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuXHRcdHRoaXMub3V0cHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG5cdFx0dGhpcy5vdXRwdXQuZ2Fpbi52YWx1ZSA9IHZvbHVtZTtcblx0XHR0aGlzLm91dHB1dC5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pO1xuXG5cdFx0dGhpcy5sb2FkZWQgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRsZXQgbG9hZGVyID0gbmV3IFRIUkVFLkZpbGVMb2FkZXIoKTtcblx0XHRcdGxvYWRlci5zZXRSZXNwb25zZVR5cGUoJ2FycmF5YnVmZmVyJyk7XG5cdFx0XHRsb2FkZXIubG9hZCh1cmwsIGJ1ZmZlciA9PiB7XG5cdFx0XHRcdGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGJ1ZmZlciwgZGVjb2RlZEJ1ZmZlciA9PiB7XG5cdFx0XHRcdFx0dGhpcy5idWZmZXIgPSBkZWNvZGVkQnVmZmVyO1xuXHRcdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9KVxuXHR9XG5cblx0cGxheShxdWV1ZWQgPSBmYWxzZSlcblx0e1xuXHRcdHJldHVybiB0aGlzLmxvYWRlZC50aGVuKCgpID0+IHtcblx0XHRcdGxldCBpbnN0YW5jZSA9IG5ldyBBdWRpb1N0cmVhbSh0aGlzLmNvbnRleHQsIHRoaXMuYnVmZmVyLCB0aGlzLm91dHB1dCk7XG5cdFx0XHRcblx0XHRcdGlmKHF1ZXVlZCl7XG5cdFx0XHRcdHF1ZXVlZFN0cmVhbXMgPSBxdWV1ZWRTdHJlYW1zLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdGluc3RhbmNlLnBsYXkoKTtcblx0XHRcdFx0XHRyZXR1cm4gaW5zdGFuY2UuZmluaXNoZWRQbGF5aW5nO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIHF1ZXVlZFN0cmVhbXM7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0aW5zdGFuY2UucGxheSgpO1xuXHRcdFx0XHRyZXR1cm4gaW5zdGFuY2UuZmluaXNoZWRQbGF5aW5nO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59XG5cbmNsYXNzIEZha2VBdWRpb0NsaXBcbntcblx0Y29uc3RydWN0b3IoKXsgdGhpcy5mYWtlc3RyZWFtID0gbmV3IEZha2VBdWRpb1N0cmVhbSgpOyB9XG5cdHBsYXkoKXsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpOyB9XG59XG5cbmNsYXNzIEZha2VBdWRpb1N0cmVhbVxue1xuXHRjb25zdHJ1Y3RvcigpeyB0aGlzLmZpbmlzaGVkUGxheWluZyA9IFByb21pc2UucmVzb2x2ZSgpOyB9XG5cdHBsYXkoKXsgfVxuXHRzdG9wKCl7IH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXVkaW9Db250cm9sbGVyXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdGxldCBjb250ZXh0ID0gdGhpcy5jb250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xuXHRcdHRoaXMubGliZXJhbFN0aW5nID0gbmV3IEF1ZGlvQ2xpcCh0aGlzLmNvbnRleHQsIGAvc3RhdGljL2F1ZGlvL2hpdGxlci9saWJlcmFsLXN0aW5nLm9nZ2AsIDAuMik7XG5cdFx0dGhpcy5saWJlcmFsRmFuZmFyZSA9IG5ldyBBdWRpb0NsaXAodGhpcy5jb250ZXh0LCBgL3N0YXRpYy9hdWRpby9oaXRsZXIvbGliZXJhbC1mYW5mYXJlLm9nZ2AsIDAuMik7XG5cdFx0dGhpcy5mYXNjaXN0U3RpbmcgPSBuZXcgQXVkaW9DbGlwKHRoaXMuY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vaGl0bGVyL2Zhc2Npc3Qtc3Rpbmcub2dnYCwgMC4xKTtcblx0XHR0aGlzLmZhc2Npc3RGYW5mYXJlID0gbmV3IEF1ZGlvQ2xpcCh0aGlzLmNvbnRleHQsIGAvc3RhdGljL2F1ZGlvL2hpdGxlci9mYXNjaXN0LWZhbmZhcmUub2dnYCwgMC4xKTtcblxuXHRcdGxldCBmYWtlID0gbmV3IEZha2VBdWRpb0NsaXAoKTtcblx0XHR0aGlzLnR1dG9yaWFsID0ge2xvYWRTdGFydGVkOiBmYWxzZX07XG5cdFx0Wyd3ZWxjb21lJywnbmlnaHQnLCdub21pbmF0aW9uJywndm90aW5nJywndm90ZUZhaWxzJywndm90ZVBhc3NlcycsJ3BvbGljeTEnLCdwb2xpY3kyJywncG9saWN5RmFzY2lzdCcsXG5cdFx0J3BvbGljeUxpYmVyYWwnLCdwb2xpY3lBZnRlcm1hdGgnLCd3cmFwdXAnLCdwb3dlcjEnLCdwb3dlcjInLCdpbnZlc3RpZ2F0ZScsJ3BlZWsnLCduYW1lU3VjY2Vzc29yJywnZXhlY3V0ZScsXG5cdFx0J3ZldG8nLCdyZWR6b25lJ10uZm9yRWFjaCh4ID0+IHRoaXMudHV0b3JpYWxbeF0gPSBmYWtlKTtcblx0fVxuXG5cdGxvYWRUdXRvcmlhbChnYW1lKVxuXHR7XG5cdFx0aWYoIWdhbWUudHV0b3JpYWwgfHwgdGhpcy50dXRvcmlhbC5sb2FkU3RhcnRlZCkgcmV0dXJuO1xuXG5cdFx0bGV0IHJlYWRlciA9IGdhbWUudHV0b3JpYWwsIGNvbnRleHQgPSB0aGlzLmNvbnRleHQsIHZvbHVtZSA9IDAuNTtcblxuXHRcdE9iamVjdC5hc3NpZ24odGhpcy50dXRvcmlhbCwge1xuXHRcdFx0bG9hZFN0YXJ0ZWQ6IHRydWUsXG5cdFx0XHR3ZWxjb21lOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC93ZWxjb21lLm9nZ2AsIHZvbHVtZSksXG5cdFx0XHRuaWdodDogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvbmlnaHQub2dnYCwgdm9sdW1lKSxcblx0XHRcdG5vbWluYXRpb246IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL25vbWluYXRpb24ub2dnYCwgdm9sdW1lKSxcblx0XHRcdHZvdGluZzogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvdm90aW5nLm9nZ2AsIHZvbHVtZSksXG5cdFx0XHR2b3RlRmFpbHM6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3ZvdGUtZmFpbHMub2dnYCwgdm9sdW1lKSxcblx0XHRcdHZvdGVQYXNzZXM6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3ZvdGUtcGFzc2VkLm9nZ2AsIHZvbHVtZSksXG5cdFx0XHRwb2xpY3kxOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb2xpY3kxLm9nZ2AsIHZvbHVtZSksXG5cdFx0XHRwb2xpY3kyOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb2xpY3kyLm9nZ2AsIHZvbHVtZSksXG5cdFx0XHRwb2xpY3lGYXNjaXN0OiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb2xpY3ktZmFzY2lzdC5vZ2dgLCB2b2x1bWUpLFxuXHRcdFx0cG9saWN5TGliZXJhbDogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG9saWN5LWxpYmVyYWwub2dnYCwgdm9sdW1lKSxcblx0XHRcdHBvbGljeUFmdGVybWF0aDogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG9saWN5LWFmdGVybWF0aC5vZ2dgLCB2b2x1bWUpLFxuXHRcdFx0d3JhcHVwOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC93cmFwdXAub2dnYCwgdm9sdW1lKSxcblx0XHRcdHBvd2VyMTogbmV3IEF1ZGlvQ2xpcChjb250ZXh0LCBgL3N0YXRpYy9hdWRpby8ke3RoZW1lfS8ke3JlYWRlcn0tdHV0b3JpYWwvcG93ZXIxLm9nZ2AsIHZvbHVtZSksXG5cdFx0XHRwb3dlcjI6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyMi5vZ2dgLCB2b2x1bWUpLFxuXHRcdFx0aW52ZXN0aWdhdGU6IG5ldyBBdWRpb0NsaXAoY29udGV4dCwgYC9zdGF0aWMvYXVkaW8vJHt0aGVtZX0vJHtyZWFkZXJ9LXR1dG9yaWFsL3Bvd2VyLWludmVzdGlnYXRlLm9nZ2AsIHZvbHVtZSksXG5cdFx0XHRwZWVrOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlci1wZWVrLm9nZ2AsIHZvbHVtZSksXG5cdFx0XHRuYW1lU3VjY2Vzc29yOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlci1uYW1lc3VjY2Vzc29yLm9nZ2AsIHZvbHVtZSksXG5cdFx0XHRleGVjdXRlOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlci1leGVjdXRlLm9nZ2AsIHZvbHVtZSksXG5cdFx0XHR2ZXRvOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9wb3dlci12ZXRvLm9nZ2AsIHZvbHVtZSksXG5cdFx0XHRyZWR6b25lOiBuZXcgQXVkaW9DbGlwKGNvbnRleHQsIGAvc3RhdGljL2F1ZGlvLyR7dGhlbWV9LyR7cmVhZGVyfS10dXRvcmlhbC9yZWR6b25lLm9nZ2AsIHZvbHVtZSlcblx0XHR9KTtcblx0fVxufSIsImltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFR1dG9yaWFsTWFuYWdlclxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHR0aGlzLmVuYWJsZWQgPSBmYWxzZTtcblx0XHR0aGlzLmxhc3RFdmVudCA9IG51bGw7XG5cdFx0dGhpcy5wbGF5ZWQgPSBbXTtcblx0fVxuXG5cdGRldGVjdEV2ZW50KGdhbWUsIHZvdGVzKVxuXHR7XG5cdFx0bGV0IGxhc3RFbGVjdGlvbiA9IHZvdGVzW2dhbWUubGFzdEVsZWN0aW9uXTtcblx0XHRsZXQgZmlyc3RSb3VuZCA9IGdhbWUuZmFzY2lzdFBvbGljaWVzICsgZ2FtZS5saWJlcmFsUG9saWNpZXMgPT09IDA7XG5cblx0XHRpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICduaWdodCcpXG5cdFx0XHRyZXR1cm4gJ25pZ2h0Jztcblx0XHRlbHNlIGlmKGZpcnN0Um91bmQgJiYgZ2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJylcblx0XHRcdHJldHVybiAnbm9taW5hdGlvbic7XG5cdFx0ZWxzZSBpZihmaXJzdFJvdW5kICYmIGdhbWUuc3RhdGUgPT09ICdlbGVjdGlvbicpXG5cdFx0XHRyZXR1cm4gJ3ZvdGluZyc7XG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnbGFtZUR1Y2snICYmIGxhc3RFbGVjdGlvbi55ZXNWb3RlcnMubGVuZ3RoIDwgbGFzdEVsZWN0aW9uLnRvUGFzcyAmJiAhdGhpcy5wbGF5ZWQuaW5jbHVkZXMoJ3ZvdGVGYWlscycpKXtcblx0XHRcdHRoaXMucGxheWVkLnB1c2goJ3ZvdGVGYWlscycpO1xuXHRcdFx0cmV0dXJuICd2b3RlRmFpbHMnO1xuXHRcdH1cblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdsYW1lRHVjaycgJiYgbGFzdEVsZWN0aW9uLnllc1ZvdGVycy5sZW5ndGggPj0gbGFzdEVsZWN0aW9uLnRvUGFzcyAmJiAhdGhpcy5wbGF5ZWQuaW5jbHVkZXMoJ3ZvdGVQYXNzZXMnKSl7XG5cdFx0XHR0aGlzLnBsYXllZC5wdXNoKCd2b3RlUGFzc2VzJyk7XG5cdFx0XHRyZXR1cm4gJ3ZvdGVQYXNzZXMnO1xuXHRcdH1cblx0XHRlbHNlIGlmKGZpcnN0Um91bmQgJiYgZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTEnKVxuXHRcdFx0cmV0dXJuICdwb2xpY3kxJztcblx0XHRlbHNlIGlmKGZpcnN0Um91bmQgJiYgZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTInKVxuXHRcdFx0cmV0dXJuICdwb2xpY3kyJztcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnICYmIGdhbWUuZmFzY2lzdFBvbGljaWVzID09PSAxICYmIGdhbWUuaGFuZCA9PT0gMilcblx0XHRcdHJldHVybiAncG9saWN5RmFzY2lzdCc7XG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnYWZ0ZXJtYXRoJyAmJiBnYW1lLmxpYmVyYWxQb2xpY2llcyA9PT0gMSAmJiBnYW1lLmhhbmQgPT09IDMpXG5cdFx0XHRyZXR1cm4gJ3BvbGljeUxpYmVyYWwnO1xuXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnICYmIGdhbWUuZmFzY2lzdFBvbGljaWVzK2dhbWUubGliZXJhbFBvbGljaWVzID09PSAxKVxuXHRcdFx0cmV0dXJuICd3cmFwdXAnO1xuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcyA9PT0gMyAmJiAhdGhpcy5wbGF5ZWQuaW5jbHVkZXMoJ3JlZHpvbmUnKSl7XG5cdFx0XHR0aGlzLnBsYXllZC5wdXNoKCdyZWR6b25lJyk7XG5cdFx0XHRyZXR1cm4gJ3JlZHpvbmUnO1xuXHRcdH1cblxuXHRcdGVsc2UgaWYoWydpbnZlc3RpZ2F0ZScsJ3BlZWsnLCduYW1lU3VjY2Vzc29yJywnZXhlY3V0ZSddLmluY2x1ZGVzKGdhbWUuc3RhdGUpKVxuXHRcdHtcblx0XHRcdGlmKHRoaXMucGxheWVkLmluY2x1ZGVzKGdhbWUuc3RhdGUpKVxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcblxuXHRcdFx0bGV0IHN0YXRlO1xuXHRcdFx0aWYoZ2FtZS5mYXNjaXN0UG9saWNpZXMgPT09IDUpXG5cdFx0XHRcdHN0YXRlID0gJ3ZldG8nO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRzdGF0ZSA9IGdhbWUuc3RhdGU7XG5cdFx0XHR0aGlzLnBsYXllZC5wdXNoKHN0YXRlKTtcblxuXHRcdFx0aWYoIXRoaXMucGxheWVkLmluY2x1ZGVzKCdwb3dlcicpKXtcblx0XHRcdFx0c3RhdGUgPSAnZmlyc3RfJytzdGF0ZTtcblx0XHRcdFx0dGhpcy5wbGF5ZWQucHVzaCgncG93ZXInKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHN0YXRlO1xuXHRcdH1cblx0XHRlbHNlIHJldHVybiBudWxsO1xuXHR9XG5cblx0c3RhdGVVcGRhdGUoZ2FtZSwgdm90ZXMpXG5cdHtcblx0XHRpZighZ2FtZS50dXRvcmlhbCB8fCBnYW1lLnR1cm5PcmRlci5pbmNsdWRlcygnMTExMTExMScpICYmIFNILmxvY2FsVXNlci5pZCAhPT0gJzExMTExMTEnKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0bGV0IHNlYW1sZXNzID0ge1xuXHRcdFx0cG9saWN5RmFzY2lzdDogWydwb2xpY3lGYXNjaXN0JywncG9saWN5QWZ0ZXJtYXRoJ10sXG5cdFx0XHRwb2xpY3lMaWJlcmFsOiBbJ3BvbGljeUxpYmVyYWwnLCdwb2xpY3lBZnRlcm1hdGgnXSxcblx0XHRcdGZpcnN0X2ludmVzdGlnYXRlOiBbJ3Bvd2VyMScsJ3Bvd2VyMicsJ2ludmVzdGlnYXRlJ10sXG5cdFx0XHRmaXJzdF9wZWVrOiBbJ3Bvd2VyMScsJ3Bvd2VyMicsJ3BlZWsnXSxcblx0XHRcdGZpcnN0X25hbWVTdWNjZXNzb3I6IFsncG93ZXIxJywncG93ZXIyJywnbmFtZVN1Y2Nlc3NvciddLFxuXHRcdFx0Zmlyc3RfZXhlY3V0ZTogWydwb3dlcjEnLCdwb3dlcjInLCdleGVjdXRlJ10sXG5cdFx0XHRmaXJzdF92ZXRvOiBbJ3Bvd2VyMScsJ3Bvd2VyMicsJ3ZldG8nXSxcblx0XHRcdGludmVzdGlnYXRlOiBbJ3Bvd2VyMScsJ2ludmVzdGlnYXRlJ10sXG5cdFx0XHRwZWVrOiBbJ3Bvd2VyMScsJ3BlZWsnXSxcblx0XHRcdG5hbWVTdWNjZXNzb3I6IFsncG93ZXIxJywnbmFtZVN1Y2Nlc3NvciddLFxuXHRcdFx0ZXhlY3V0ZTogWydwb3dlcjEnLCdleGVjdXRlJ10sXG5cdFx0XHR2ZXRvOiBbJ3Bvd2VyMScsJ3ZldG8nXSxcblx0XHRcdG5pZ2h0OiBbJ3dlbGNvbWUnLCduaWdodCddXG5cdFx0fTtcblx0XHRsZXQgZGVsYXllZCA9IHtcblx0XHRcdHBvbGljeUZhc2Npc3Q6ICdwb2xpY3lBbmltRG9uZScsXG5cdFx0XHRwb2xpY3lMaWJlcmFsOiAncG9saWN5QW5pbURvbmUnXG5cdFx0fTtcblxuXHRcdGxldCBldmVudCA9IHRoaXMubGFzdEV2ZW50ID0gdGhpcy5kZXRlY3RFdmVudChnYW1lLCB2b3Rlcyk7XG5cdFx0Y29uc29sZS5sb2coJ3R1dG9yaWFsIGV2ZW50OicsIGV2ZW50KTtcblxuXHRcdGxldCB3YWl0ID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdFx0aWYoZGVsYXllZFtldmVudF0pe1xuXHRcdFx0d2FpdCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdFx0bGV0IGhhbmRsZXIgPSAoKSA9PiB7XG5cdFx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcihkZWxheWVkW2V2ZW50XSwgaGFuZGxlcik7XG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKGRlbGF5ZWRbZXZlbnRdLCBoYW5kbGVyKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmKHNlYW1sZXNzW2V2ZW50XSlcblx0XHR7XG5cdFx0XHR3YWl0LnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRzZWFtbGVzc1tldmVudF0uZm9yRWFjaChjbGlwID0+IFNILmF1ZGlvLnR1dG9yaWFsW2NsaXBdLnBsYXkodHJ1ZSkpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGVsc2UgaWYoZXZlbnQgIT09IG51bGwpXG5cdFx0e1xuXHRcdFx0d2FpdC50aGVuKCgpID0+IFNILmF1ZGlvLnR1dG9yaWFsW2V2ZW50XS5wbGF5KHRydWUpKTtcblx0XHR9XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0ICcuL3BvbHlmaWxsJztcblxuaW1wb3J0IHthY3RpdmVUaGVtZSBhcyB0aGVtZX0gZnJvbSAnLi90aGVtZSc7XG5cbmltcG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9IGZyb20gJy4vaGF0cyc7XG5pbXBvcnQgR2FtZVRhYmxlIGZyb20gJy4vdGFibGUnO1xuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgeyBnZXRHYW1lSWQsIG1lcmdlT2JqZWN0cyB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XG5pbXBvcnQgU2VhdCBmcm9tICcuL3NlYXQnO1xuaW1wb3J0IFBsYXllck1ldGVyIGZyb20gJy4vcGxheWVybWV0ZXInO1xuaW1wb3J0IENvbnRpbnVlQm94IGZyb20gJy4vY29udGludWVib3gnO1xuaW1wb3J0IEVsZWN0aW9uVHJhY2tlciBmcm9tICcuL2VsZWN0aW9udHJhY2tlcic7XG5pbXBvcnQgUHJlc2VudGF0aW9uIGZyb20gJy4vcHJlc2VudGF0aW9uJztcbmltcG9ydCBBdWRpb0NvbnRyb2xsZXIgZnJvbSAnLi9hdWRpb2NvbnRyb2xsZXInO1xuaW1wb3J0IFR1dG9yaWFsIGZyb20gJy4vdHV0b3JpYWwnO1xuXG5jbGFzcyBTZWNyZXRIaXRsZXIgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuYXNzZXRzID0gQXNzZXRNYW5hZ2VyLm1hbmlmZXN0O1xuXHRcdHRoaXMudmVydGljYWxBbGlnbiA9ICdib3R0b20nO1xuXHRcdHRoaXMubmVlZHNTa2VsZXRvbiA9IGZhbHNlO1xuXG5cdFx0Ly8gcG9seWZpbGwgZ2V0VXNlciBmdW5jdGlvblxuXHRcdGlmKCFhbHRzcGFjZS5pbkNsaWVudCl7XG5cdFx0XHRhbHRzcGFjZS5nZXRVc2VyID0gKCkgPT4ge1xuXHRcdFx0XHRsZXQgaWQsIHJlID0gL1s/Jl11c2VySWQ9KFxcZCspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRcdFx0XHRpZihyZSlcblx0XHRcdFx0XHRpZCA9IHJlWzFdO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0aWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCkudG9TdHJpbmcoKTtcblxuXHRcdFx0XHRhbHRzcGFjZS5fbG9jYWxVc2VyID0ge1xuXHRcdFx0XHRcdHVzZXJJZDogaWQsXG5cdFx0XHRcdFx0ZGlzcGxheU5hbWU6IGlkLFxuXHRcdFx0XHRcdGlzTW9kZXJhdG9yOiAvaXNNb2RlcmF0b3IvLnRlc3Qod2luZG93LmxvY2F0aW9uLnNlYXJjaClcblx0XHRcdFx0fTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ01hc3F1ZXJhZGluZyBhcycsIGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xuXHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyBnZXQgbG9jYWwgdXNlclxuXHRcdHRoaXMuX3VzZXJQcm9taXNlID0gYWx0c3BhY2UuZ2V0VXNlcigpO1xuXHRcdHRoaXMuX3VzZXJQcm9taXNlLnRoZW4odXNlciA9PiB7XG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcblx0XHRcdFx0aWQ6IHVzZXIudXNlcklkLFxuXHRcdFx0XHRkaXNwbGF5TmFtZTogdXNlci5kaXNwbGF5TmFtZSxcblx0XHRcdFx0aXNNb2RlcmF0b3I6IHVzZXIuaXNNb2RlcmF0b3Jcblx0XHRcdH07XG5cdFx0fSk7XG5cblx0XHR0aGlzLmdhbWUgPSB7fTtcblx0XHR0aGlzLnBsYXllcnMgPSB7fTtcblx0XHR0aGlzLnZvdGVzID0ge307XG5cdH1cblxuXHRpbml0aWFsaXplKGVudiwgcm9vdCwgYXNzZXRzKVxuXHR7XG5cdFx0aWYoIXRoaXMubG9jYWxVc2VyKXtcblx0XHRcdHRoaXMuX3VzZXJQcm9taXNlLnRoZW4oKCkgPT4gdGhpcy5pbml0aWFsaXplKGVudiwgcm9vdCwgYXNzZXRzKSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gc2hhcmUgdGhlIGRpb3JhbWEgaW5mb1xuXHRcdEFzc2V0TWFuYWdlci5jYWNoZSA9IGFzc2V0cztcblx0XHRBc3NldE1hbmFnZXIuZml4TWF0ZXJpYWxzKCk7XG5cdFx0dGhpcy5lbnYgPSBlbnY7XG5cblx0XHQvLyBjb25uZWN0IHRvIHNlcnZlclxuXHRcdHRoaXMuc29ja2V0ID0gaW8uY29ubmVjdCgnLycsIHtxdWVyeTogYGdhbWVJZD0ke2dldEdhbWVJZCgpfSZ0aGVtZT0ke3RoZW1lfWB9KTtcblxuXHRcdC8vIHNwYXduIHNlbGYtc2VydmUgdHV0b3JpYWwgZGlhbG9nXG5cdFx0aWYoYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdFx0YWx0c3BhY2Uub3Blbih3aW5kb3cubG9jYXRpb24ub3JpZ2luKycvc3RhdGljL3R1dG9yaWFsLmh0bWwnLCAnX2V4cGVyaWVuY2UnLFxuXHRcdFx0XHR7aGlkZGVuOiB0cnVlLCBpY29uOiB3aW5kb3cubG9jYXRpb24ub3JpZ2luKycvc3RhdGljL2ltZy9jYWVzYXIvaWNvbi5wbmcnfSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5hdWRpbyA9IG5ldyBBdWRpb0NvbnRyb2xsZXIoKTtcblx0XHR0aGlzLnR1dG9yaWFsID0gbmV3IFR1dG9yaWFsKCk7XG5cblx0XHQvLyBjcmVhdGUgdGhlIHRhYmxlXG5cdFx0dGhpcy50YWJsZSA9IG5ldyBHYW1lVGFibGUoKTtcblx0XHR0aGlzLmFkZCh0aGlzLnRhYmxlKTtcblxuXHRcdHRoaXMucmVzZXRCdXR0b24gPSBuZXcgVEhSRUUuTWVzaChcblx0XHRcdG5ldyBUSFJFRS5Cb3hHZW9tZXRyeSguMjUsLjI1LC4yNSksXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogYXNzZXRzLnRleHR1cmVzLnJlc2V0fSlcblx0XHQpO1xuXHRcdHRoaXMucmVzZXRCdXR0b24ucG9zaXRpb24uc2V0KDEuMTMsIC0uOSwgLjc1KTtcblx0XHR0aGlzLnJlc2V0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5zZW5kUmVzZXQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5fdXNlclByb21pc2UudGhlbigoKSA9PiB7XG5cdFx0XHRpZih0aGlzLmxvY2FsVXNlci5pc01vZGVyYXRvcilcblx0XHRcdFx0dGhpcy50YWJsZS5hZGQodGhpcy5yZXNldEJ1dHRvbik7XG5cdFx0fSk7XG5cblx0XHR0aGlzLnJlZnJlc2hCdXR0b24gPSBuZXcgVEhSRUUuTWVzaChcblx0XHRcdG5ldyBUSFJFRS5Cb3hHZW9tZXRyeSguMjUsLjI1LC4yNSksXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogYXNzZXRzLnRleHR1cmVzLnJlZnJlc2h9KVxuXHRcdCk7XG5cdFx0dGhpcy5yZWZyZXNoQnV0dG9uLnBvc2l0aW9uLnNldCgxLjEzLCAtLjMsIC43NSk7XG5cdFx0dGhpcy5yZWZyZXNoQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgKCkgPT4gd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpKTtcblx0XHR0aGlzLnRhYmxlLmFkZCh0aGlzLnJlZnJlc2hCdXR0b24pO1xuXG5cdFx0dGhpcy5wcmVzZW50YXRpb24gPSBuZXcgUHJlc2VudGF0aW9uKCk7XG5cblx0XHQvLyBjcmVhdGUgaGF0c1xuXHRcdHRoaXMucHJlc2lkZW50SGF0ID0gbmV3IFByZXNpZGVudEhhdCgpO1xuXHRcdHRoaXMuY2hhbmNlbGxvckhhdCA9IG5ldyBDaGFuY2VsbG9ySGF0KCk7XG5cblx0XHQvLyBjcmVhdGUgcG9zaXRpb25zXG5cdFx0dGhpcy5zZWF0cyA9IFtdO1xuXHRcdGZvcihsZXQgaT0wOyBpPDEwOyBpKyspe1xuXHRcdFx0dGhpcy5zZWF0cy5wdXNoKCBuZXcgU2VhdChpKSApO1xuXHRcdH1cblxuXHRcdHRoaXMudGFibGUuYWRkKC4uLnRoaXMuc2VhdHMpO1xuXG5cdFx0Ly90aGlzLnBsYXllck1ldGVyID0gbmV3IFBsYXllck1ldGVyKCk7XG5cdFx0Ly90aGlzLnRhYmxlLmFkZCh0aGlzLnBsYXllck1ldGVyKTtcblx0XHR0aGlzLmNvbnRpbnVlQm94ID0gbmV3IENvbnRpbnVlQm94KHRoaXMudGFibGUpO1xuXG5cdFx0dGhpcy5lbGVjdGlvblRyYWNrZXIgPSBuZXcgRWxlY3Rpb25UcmFja2VyKCk7XG5cblx0XHR0aGlzLnNvY2tldC5vbigndXBkYXRlJywgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuc29ja2V0Lm9uKCdjaGVja2VkX2luJywgdGhpcy5jaGVja2VkSW4uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLnNvY2tldC5vbigncmVzZXQnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XG5cdFx0Ly90aGlzLnNvY2tldC5vbignZGlzY29ubmVjdCcsIHRoaXMuZG9SZXNldC5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZUZyb21TZXJ2ZXIoZ2QsIHBkLCB2ZClcblx0e1xuXHRcdGNvbnNvbGUubG9nKGdkLCBwZCwgdmQpO1xuXG5cdFx0bGV0IGdhbWUgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdhbWUsIGdkKTtcblx0XHRsZXQgcGxheWVycyA9IG1lcmdlT2JqZWN0cyh0aGlzLnBsYXllcnMsIHBkIHx8IHt9KTtcblx0XHRsZXQgdm90ZXMgPSBtZXJnZU9iamVjdHModGhpcy52b3RlcywgdmQgfHwge30pO1xuXG5cdFx0aWYoZ2QudHV0b3JpYWwpXG5cdFx0XHR0aGlzLmF1ZGlvLmxvYWRUdXRvcmlhbChnYW1lKTtcblxuXHRcdGlmKGdkLnN0YXRlKVxuXHRcdFx0dGhpcy50dXRvcmlhbC5zdGF0ZVVwZGF0ZShnYW1lLCB2b3Rlcyk7XG5cblx0XHRmb3IobGV0IGZpZWxkIGluIGdkKVxuXHRcdHtcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHRcdHR5cGU6ICd1cGRhdGVfJytmaWVsZCxcblx0XHRcdFx0YnViYmxlczogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRnYW1lOiBnYW1lLFxuXHRcdFx0XHRcdHBsYXllcnM6IHBsYXllcnMsXG5cdFx0XHRcdFx0dm90ZXM6IHZvdGVzXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHRoaXMuX3VzZXJQcm9taXNlLnRoZW4oKCkgPT4ge1xuXHRcdFx0aWYocGxheWVyc1t0aGlzLmxvY2FsVXNlci5pZF0gJiYgIXBsYXllcnNbdGhpcy5sb2NhbFVzZXIuaWRdLmNvbm5lY3RlZCl7XG5cdFx0XHRcdHRoaXMuc29ja2V0LmVtaXQoJ2NoZWNrX2luJywgdGhpcy5sb2NhbFVzZXIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcblx0XHR0aGlzLnBsYXllcnMgPSBwbGF5ZXJzO1xuXHRcdHRoaXMudm90ZXMgPSB2b3Rlcztcblx0fVxuXG5cdGNoZWNrZWRJbihwKVxuXHR7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLnBsYXllcnNbcC5pZF0sIHApO1xuXHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHR0eXBlOiAnY2hlY2tlZF9pbicsXG5cdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdGRhdGE6IHAuaWRcblx0XHR9KTtcblx0fVxuXG5cdHNlbmRSZXNldChlKXtcblx0XHRpZih0aGlzLmxvY2FsVXNlci5pc01vZGVyYXRvcil7XG5cdFx0XHRjb25zb2xlLmxvZygncmVxdWVzdGluZyByZXNldCcpO1xuXHRcdFx0dGhpcy5zb2NrZXQuZW1pdCgncmVzZXQnKTtcblx0XHR9XG5cdH1cblxuXHRkb1Jlc2V0KGdhbWUsIHBsYXllcnMsIHZvdGVzKVxuXHR7XG5cdFx0d2luZG93LmxvY2F0aW9uLnJlbG9hZCh0cnVlKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgU2VjcmV0SGl0bGVyKCk7XG4iXSwibmFtZXMiOlsibGV0IiwiY29uc3QiLCJ0aGVtZSIsInRoaXMiLCJzdXBlciIsIkFNIiwiQXNzZXRNYW5hZ2VyIiwiY2FyZCIsInRyIiwiQmFsbG90VHlwZS5DT05GSVJNIiwidXBkYXRlU3RhdGUiLCJCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCIsIkJhbGxvdFR5cGUuUE9MSUNZIiwib3B0cyIsImNsZWFuVXBGYWtlVm90ZSIsIkJQLnVwZGF0ZVZvdGVzSW5Qcm9ncmVzcyIsIkJQLnVwZGF0ZVN0YXRlIiwiQlBCQS50b0FycmF5IiwiQlBCQS5MSUJFUkFMIiwicG9zaXRpb25zIiwiYXNzZXRzIiwiVHV0b3Jp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QUFDLEtBQUs7RUFDbkIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLOzs7O0VBSW5CLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBRXRGLENBQUM7O0NBRUZBLElBQUksT0FBTyxHQUFHOztFQUViLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMxQixDQUFDOzs7Q0FHRkEsSUFBSSxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUN2RUEsSUFBSSxJQUFJLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDNUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztDQUNwQixJQUFJLEdBQUcsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUN0RSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDOzs7Q0FHbEJBLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxHQUFHLEVBQUUsQ0FBQztDQUN0REEsSUFBSSxXQUFXLEdBQUcsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ3hGLFlBQVksR0FBRyxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDbEdBLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztDQUNiLElBQUlBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0VBQ3RCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7RUFDNUc7Q0FDREEsSUFBSSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7Q0FFdEcsUUFBUSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRTtFQUUxQ0EsSUFBSSxHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7RUFDckMsR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLEdBQUcsWUFBWSxHQUFHLFdBQVcsQ0FBQyxDQUFDO0VBQ3hGLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQy9CLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENB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QUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztFQUNwQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7RUFFckMsS0FBS0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFO0VBQzdCO0dBQ0MsS0FBS0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO0dBQzNCO0lBQ0NBLElBQUksTUFBTSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7O0lBR3RDLEtBQUssQ0FBQyxHQUFHLENBQUM7S0FDVCxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3JDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7SUFFWCxLQUFLLENBQUMsR0FBRyxDQUFDO0tBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3RDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7SUFFWEEsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQ0EsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQ0EsSUFBSSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2pFQSxJQUFJLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDakUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ1YsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkI7OztJQUdELEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFDVjtLQUNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2hELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2hEOztJQUVEO0tBQ0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDbEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0tBRWxELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xEO0lBQ0Q7OztHQUdEQSxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUM3Q0EsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDN0MsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ1YsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDckIsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDckI7O0dBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FDNUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FDNUM7O0VBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ25FLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FB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
