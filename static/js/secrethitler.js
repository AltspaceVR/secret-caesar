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

var AM = {
	manifest: {
		models: {
			table: 'static/model/table.gltf',
			nameplate: 'static/model/nameplate.dae',
			tophat: 'static/model/tophat.gltf',
			visorcap: 'static/model/visor_cap.gltf',
			//dummy: 'static/model/dummy.gltf',
			//playermeter: 'static/model/playermeter.gltf'
		},
		textures: {
			board_large: 'static/img/board-large.jpg',
			board_med: 'static/img/board-medium.jpg',
			board_small: 'static/img/board-small.jpg',
			cards: 'static/img/cards.jpg',
			reset: 'static/img/bomb.png',
			//text: 'static/img/text.png'
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
			if(obj.name === 'hat' || obj.name === 'text')
				{ prop = obj.name; }
			else if(obj instanceof THREE.Mesh)
				{ this$1[prop] = obj; }
		});

		// strip out middle nodes
		this.hat.matrix.copy(this.hat.matrixWorld);
		this.hat.matrix.decompose(this.hat.position, this.hat.quaternion, this.hat.scale);
		this.add(this.hat);

		this.text.matrix.copy(this.text.matrixWorld);
		this.text.matrix.decompose(this.text.position, this.text.quaternion, this.text.scale);
		this.add(this.text);

		d.scene.add(this);
	}

	if ( superclass ) Hat.__proto__ = superclass;
	Hat.prototype = Object.create( superclass && superclass.prototype );
	Hat.prototype.constructor = Hat;

	Hat.prototype.setOwner = function setOwner (userId)
	{
		if(!this.currentId && userId){
			d.scene.add(this);
			this.components.hat = new NSkeletonParent(this.hat);
			this.components.text = new NSkeletonParent(this.text);
		}
		else if(this.currentId && !userId){
			this.components.hat.destroy();
			this.components.text.destroy();
			d.scene.remove(this);
		}

		if(userId){
			this.components.hat.update({userId: userId});
			this.components.text.update({userId: userId});
		}

		this.currentId = userId;
	};

	return Hat;
}(THREE.Object3D));

var PresidentHat = (function (Hat) {
	function PresidentHat(){
		var this$1 = this;

		Hat.call(this, AM.cache.models.tophat);
		this.position.set(0, 0.144/SH.env.pixelsPerMeter, .038/SH.env.pixelsPerMeter);
		this.scale.multiplyScalar(1.2/SH.env.pixelsPerMeter);
		
		SH.addEventListener('update_state', function (ref) {
			var game = ref.data.game;

			if(game.state === 'lameDuck' && game.failedVotes === 0){
				var sitting = game.specialElection ? game.president : game.lastPresident;
				this$1.setOwner(sitting);
			}
		});
	}

	if ( Hat ) PresidentHat.__proto__ = Hat;
	PresidentHat.prototype = Object.create( Hat && Hat.prototype );
	PresidentHat.prototype.constructor = PresidentHat;

	return PresidentHat;
}(Hat));

var ChancellorHat = (function (Hat) {
	function ChancellorHat(){
		var this$1 = this;

		Hat.call(this, AM.cache.models.visorcap);
		this.position.set(0, 0.07/SH.env.pixelsPerMeter, .038/SH.env.pixelsPerMeter);
		this.scale.multiplyScalar(1.2/SH.env.pixelsPerMeter);
		
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

	material = new THREE.MeshBasicMaterial({map: AM.cache.textures.cards});
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
		this.model = AM.cache.models.table;
		this.model.scale.setScalar(1.25);
		this.add(this.model);

		// save references to the textures
		this.textures = [
			AM.cache.textures.board_small,
			AM.cache.textures.board_med,
			AM.cache.textures.board_large
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
			card.playSound = function () { return SH.audio.liberalSting.play(); };
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
			card$1.playSound = function () { return SH.audio.fascistSting.play(); };
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
				animation = Animate.cardFlourish(card$2);
				animation.then(function () { return Animate.vanish(card$2); })
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
				card.position.copy(card.destination.pos);
				card.quaternion.copy(card.destination.quat);
				card.scale.copy(card.destination.scale);
				this$1.add(card);
				this$1.cards.push(card);
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
		this.model = AM.cache.models.nameplate.children[0].clone();
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
				+ ' for president and '
				+ players[game.chancellor].displayName
				+ ' for chancellor?';
		}
		else if(votes[vId].type === 'join'){
			questionText = votes[vId].data + '\nto join?';
		}
		else if(votes[vId].type === 'kick'){
			questionText = 'Vote to kick\n'
				+ players[votes[vId].target1].displayName
				+ '?';
		}
		else if(votes[vId].type === 'confirmRole')
		{
			opts.choices = CONFIRM;
			var role;
			if(ballot.seat.owner === SH.localUser.id){
				role = players[SH.localUser.id].role;
				role = role.charAt(0).toUpperCase() + role.slice(1);
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
			choosePlayer('Choose your\nchancellor!', 'Name {}\nas chancellor?', 'nominate')
			.then(function (userId) {
				SH.socket.emit('nominate', userId);
			});
		}
		else {
			ballot.askQuestion('Choose your\nchancellor!', 'wait_for_chancellor', {
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

		ballot.askQuestion('Executive power: The next president\'s "random" policies', 'local_peek', opts$2)
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
			choosePlayer('Executive power: Choose the next president!', '{} for president?', 'nameSuccessor')
			.then(function (userId) {
				SH.socket.emit('name_successor', userId);
			});
		}
		else {
			ballot.askQuestion('Executive power: Choose the next president!', 'wait_for_successor', {
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

		if((game.state === 'night' || game.state === 'done') && players[SH.localUser.id])
			{ this.presentRole(game, players, votes); }

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
		var vote = votes[game.lastElection];

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
			this.banner.text.update({text: (chancellor + " is not Hitler!")});

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
			this.banner.bob.stop();
			this.banner.bob = null;
		}
	};

	return Presentation;
}(THREE.Object3D));

var AudioClip = function AudioClip(context, url, volume)
{
	var this$1 = this;

	this.context = context;
	this.output = context.createGain();
	this.output.gain.value = volume;
	this.output.connect(context.destination);

	var loader = new THREE.FileLoader();
	loader.setResponseType('arraybuffer');
	loader.load(url, function (buffer) {
		context.decodeAudioData(buffer, function (decodedBuffer) {
			this$1.buffer = decodedBuffer;
		});
	});
};

AudioClip.prototype.play = function play ()
{
		var this$1 = this;

	return new Promise(function (resolve, reject) {
		var source = this$1.context.createBufferSource();
		source.buffer = this$1.buffer;
		source.connect(this$1.output);
		source.start(0, 0);
		source.onended = resolve;
	});
};

var AudioController = function AudioController(){
	this.context = new AudioContext();
	this.liberalSting = new AudioClip(this.context, 'static/audio/liberal-sting.ogg', 0.2);
	this.liberalFanfare = new AudioClip(this.context, 'static/audio/liberal-fanfare.ogg', 0.2);
	this.fascistSting = new AudioClip(this.context, 'static/audio/fascist-sting.ogg', 0.1);
	this.fascistFanfare = new AudioClip(this.context, 'static/audio/fascist-fanfare.ogg', 0.1);
};

var SecretHitler = (function (superclass) {
	function SecretHitler()
	{
		var this$1 = this;

		superclass.call(this);
		this.assets = AM.manifest;
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

	SecretHitler.prototype.initialize = function initialize (env, root, assets)
	{
		var this$1 = this;

		// share the diorama info
		AM.cache = assets;
		AM.fixMaterials();
		this.env = env;

		// connect to server
		this.socket = io.connect('/', {query: 'gameId='+getGameId()});

		this.audio = new AudioController();

		// create the table
		this.table = new GameTable();
		this.add(this.table);

		this.resetButton = new THREE.Mesh(
			new THREE.BoxGeometry(.25,.25,.25),
			new THREE.MeshBasicMaterial({map: assets.textures.reset})
		);
		this.resetButton.position.set(0, -0.18, 0);
		this.resetButton.addEventListener('cursorup', this.sendReset.bind(this));
		this.table.add(this.resetButton);

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
		this.socket.on('disconnect', this.doReset.bind(this));
		var ref;
	};

	SecretHitler.prototype.updateFromServer = function updateFromServer (gd, pd, vd)
	{
		var this$1 = this;

		console.log(gd, pd, vd);

		var game = Object.assign({}, this.game, gd);
		var players = mergeObjects(this.players, pd || {});
		var votes = mergeObjects(this.votes, vd || {});

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
		if( /&cacheBust=\d+$/.test(window.location.search) ){
			window.location.search += '1';
		}
		else {
			window.location.reload();
		}
	};

	return SecretHitler;
}(THREE.Object3D));

var SH = new SecretHitler();

return SH;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvcG9seWZpbGwuanMiLCIuLi8uLi9zcmMvY2xpZW50L2Fzc2V0bWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmF0aXZlY29tcG9uZW50cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvaGF0cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RhYmxlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC91dGlscy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3Rwcm9jZXNzb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JwYmEuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JhbGxvdC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVyaW5mby5qcyIsIi4uLy4uL3NyYy9jbGllbnQvY2Fwc3VsZWdlb21ldHJ5LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9oaXRib3guanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlYXQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NvbnRpbnVlYm94LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9lbGVjdGlvbnRyYWNrZXIuanMiLCIuLi8uLi9zcmMvY2xpZW50L3ByZXNlbnRhdGlvbi5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYXVkaW9jb250cm9sbGVyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWNyZXRoaXRsZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5pZighQXJyYXkucHJvdG90eXBlLmluY2x1ZGVzKXtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgJ2luY2x1ZGVzJywge1xuXHRcdHZhbHVlOiBmdW5jdGlvbihpdGVtKXtcblx0XHRcdHJldHVybiB0aGlzLmluZGV4T2YoaXRlbSkgPiAtMTtcblx0XHR9LFxuXHRcdHdyaXRhYmxlOiBmYWxzZSxcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRjb25maWd1cmFibGU6IGZhbHNlXG5cdH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCB7XG5cdG1hbmlmZXN0OiB7XG5cdFx0bW9kZWxzOiB7XG5cdFx0XHR0YWJsZTogJ3N0YXRpYy9tb2RlbC90YWJsZS5nbHRmJyxcblx0XHRcdG5hbWVwbGF0ZTogJ3N0YXRpYy9tb2RlbC9uYW1lcGxhdGUuZGFlJyxcblx0XHRcdHRvcGhhdDogJ3N0YXRpYy9tb2RlbC90b3BoYXQuZ2x0ZicsXG5cdFx0XHR2aXNvcmNhcDogJ3N0YXRpYy9tb2RlbC92aXNvcl9jYXAuZ2x0ZicsXG5cdFx0XHQvL2R1bW15OiAnc3RhdGljL21vZGVsL2R1bW15LmdsdGYnLFxuXHRcdFx0Ly9wbGF5ZXJtZXRlcjogJ3N0YXRpYy9tb2RlbC9wbGF5ZXJtZXRlci5nbHRmJ1xuXHRcdH0sXG5cdFx0dGV4dHVyZXM6IHtcblx0XHRcdGJvYXJkX2xhcmdlOiAnc3RhdGljL2ltZy9ib2FyZC1sYXJnZS5qcGcnLFxuXHRcdFx0Ym9hcmRfbWVkOiAnc3RhdGljL2ltZy9ib2FyZC1tZWRpdW0uanBnJyxcblx0XHRcdGJvYXJkX3NtYWxsOiAnc3RhdGljL2ltZy9ib2FyZC1zbWFsbC5qcGcnLFxuXHRcdFx0Y2FyZHM6ICdzdGF0aWMvaW1nL2NhcmRzLmpwZycsXG5cdFx0XHRyZXNldDogJ3N0YXRpYy9pbWcvYm9tYi5wbmcnLFxuXHRcdFx0Ly90ZXh0OiAnc3RhdGljL2ltZy90ZXh0LnBuZydcblx0XHR9XG5cdH0sXG5cdGNhY2hlOiB7fSxcblx0Zml4TWF0ZXJpYWxzOiBmdW5jdGlvbigpXG5cdHtcblx0XHRPYmplY3Qua2V5cyh0aGlzLmNhY2hlLm1vZGVscykuZm9yRWFjaChpZCA9PiB7XG5cdFx0XHR0aGlzLmNhY2hlLm1vZGVsc1tpZF0udHJhdmVyc2Uob2JqID0+IHtcblx0XHRcdFx0aWYob2JqLm1hdGVyaWFsIGluc3RhbmNlb2YgVEhSRUUuTWVzaFN0YW5kYXJkTWF0ZXJpYWwpe1xuXHRcdFx0XHRcdGxldCBuZXdNYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoKTtcblx0XHRcdFx0XHRuZXdNYXQubWFwID0gb2JqLm1hdGVyaWFsLm1hcDtcblx0XHRcdFx0XHRuZXdNYXQuY29sb3IuY29weShvYmoubWF0ZXJpYWwuY29sb3IpO1xuXHRcdFx0XHRcdG9iai5tYXRlcmlhbCA9IG5ld01hdDtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubGV0IHBsYWNlaG9sZGVyR2VvID0gbmV3IFRIUkVFLkJveEJ1ZmZlckdlb21ldHJ5KC4wMDEsIC4wMDEsIC4wMDEpO1xubGV0IHBsYWNlaG9sZGVyTWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHhmZmZmZmYsIHZpc2libGU6IGZhbHNlfSk7XG5sZXQgUGxhY2Vob2xkZXJNZXNoID0gbmV3IFRIUkVFLk1lc2gocGxhY2Vob2xkZXJHZW8sIHBsYWNlaG9sZGVyTWF0KTtcblxuY2xhc3MgTmF0aXZlQ29tcG9uZW50XG57XG5cdGNvbnN0cnVjdG9yKG1lc2gsIG5lZWRzVXBkYXRlKVxuXHR7XG5cdFx0dGhpcy5tZXNoID0gbWVzaDtcblx0XHRhbHRzcGFjZS5hZGROYXRpdmVDb21wb25lbnQodGhpcy5tZXNoLCB0aGlzLm5hbWUpO1xuXG5cdFx0aWYobmVlZHNVcGRhdGUpXG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXHR9XG5cblx0dXBkYXRlKGZpZWxkcyA9IHt9KVxuXHR7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLmRhdGEsIGZpZWxkcyk7XG5cdFx0YWx0c3BhY2UudXBkYXRlTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lLCB0aGlzLmRhdGEpO1xuXHR9XG5cblx0ZGVzdHJveSgpXG5cdHtcblx0XHRhbHRzcGFjZS5yZW1vdmVOYXRpdmVDb21wb25lbnQodGhpcy5tZXNoLCB0aGlzLm5hbWUpO1xuXHR9XG59XG5cbmNsYXNzIE5UZXh0IGV4dGVuZHMgTmF0aXZlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IobWVzaCl7XG5cdFx0dGhpcy5uYW1lID0gJ24tdGV4dCc7XG5cdFx0dGhpcy5kYXRhID0ge1xuXHRcdFx0Zm9udFNpemU6IDEwLFxuXHRcdFx0aGVpZ2h0OiAxLFxuXHRcdFx0d2lkdGg6IDEwLFxuXHRcdFx0dmVydGljYWxBbGlnbjogJ21pZGRsZScsXG5cdFx0XHRob3Jpem9udGFsQWxpZ246ICdtaWRkbGUnLFxuXHRcdFx0dGV4dDogJydcblx0XHR9O1xuXHRcdHN1cGVyKG1lc2gsIHRydWUpO1xuXG5cdFx0dGhpcy5jb2xvciA9ICdibGFjayc7XG5cdH1cblx0dXBkYXRlKGZpZWxkcyA9IHt9KXtcblx0XHRpZihmaWVsZHMudGV4dClcblx0XHRcdGZpZWxkcy50ZXh0ID0gYDxjb2xvcj0ke3RoaXMuY29sb3J9PiR7ZmllbGRzLnRleHR9PC9jb2xvcj5gO1xuXHRcdE5hdGl2ZUNvbXBvbmVudC5wcm90b3R5cGUudXBkYXRlLmNhbGwodGhpcywgZmllbGRzKTtcblx0fVxufVxuXG5jbGFzcyBOU2tlbGV0b25QYXJlbnQgZXh0ZW5kcyBOYXRpdmVDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcihtZXNoKXtcblx0XHR0aGlzLm5hbWUgPSAnbi1za2VsZXRvbi1wYXJlbnQnO1xuXHRcdHRoaXMuZGF0YSA9IHtcblx0XHRcdGluZGV4OiAwLFxuXHRcdFx0cGFydDogJ2hlYWQnLFxuXHRcdFx0c2lkZTogJ2NlbnRlcicsIFxuXHRcdFx0dXNlcklkOiAwXG5cdFx0fTtcblx0XHRzdXBlcihtZXNoLCB0cnVlKTtcblx0fVxufVxuXG5jbGFzcyBOQmlsbGJvYXJkIGV4dGVuZHMgTmF0aXZlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IobWVzaCl7XG5cdFx0dGhpcy5uYW1lID0gJ24tYmlsbGJvYXJkJztcblx0XHRzdXBlcihtZXNoLCBmYWxzZSk7XG5cdH1cbn1cblxuZXhwb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5UZXh0LCBOU2tlbGV0b25QYXJlbnQsIE5CaWxsYm9hcmR9OyIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQge05Ta2VsZXRvblBhcmVudH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcblxuY2xhc3MgSGF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IobW9kZWwpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuY3VycmVudElkID0gJyc7XG5cdFx0dGhpcy5jb21wb25lbnRzID0ge2hhdDogbnVsbCwgdGV4dDogbnVsbH07XG5cblx0XHRpZihtb2RlbC5wYXJlbnQpXG5cdFx0XHRtb2RlbC5wYXJlbnQucmVtb3ZlKG1vZGVsKTtcblx0XHRtb2RlbC51cGRhdGVNYXRyaXhXb3JsZCh0cnVlKTtcblxuXHRcdC8vIGdyYWIgbWVzaGVzXG5cdFx0bGV0IHByb3AgPSAnJztcblx0XHRtb2RlbC50cmF2ZXJzZShvYmogPT4ge1xuXHRcdFx0aWYob2JqLm5hbWUgPT09ICdoYXQnIHx8IG9iai5uYW1lID09PSAndGV4dCcpXG5cdFx0XHRcdHByb3AgPSBvYmoubmFtZTtcblx0XHRcdGVsc2UgaWYob2JqIGluc3RhbmNlb2YgVEhSRUUuTWVzaClcblx0XHRcdFx0dGhpc1twcm9wXSA9IG9iajtcblx0XHR9KTtcblxuXHRcdC8vIHN0cmlwIG91dCBtaWRkbGUgbm9kZXNcblx0XHR0aGlzLmhhdC5tYXRyaXguY29weSh0aGlzLmhhdC5tYXRyaXhXb3JsZCk7XG5cdFx0dGhpcy5oYXQubWF0cml4LmRlY29tcG9zZSh0aGlzLmhhdC5wb3NpdGlvbiwgdGhpcy5oYXQucXVhdGVybmlvbiwgdGhpcy5oYXQuc2NhbGUpO1xuXHRcdHRoaXMuYWRkKHRoaXMuaGF0KTtcblxuXHRcdHRoaXMudGV4dC5tYXRyaXguY29weSh0aGlzLnRleHQubWF0cml4V29ybGQpO1xuXHRcdHRoaXMudGV4dC5tYXRyaXguZGVjb21wb3NlKHRoaXMudGV4dC5wb3NpdGlvbiwgdGhpcy50ZXh0LnF1YXRlcm5pb24sIHRoaXMudGV4dC5zY2FsZSk7XG5cdFx0dGhpcy5hZGQodGhpcy50ZXh0KTtcblxuXHRcdGQuc2NlbmUuYWRkKHRoaXMpO1xuXHR9XG5cblx0c2V0T3duZXIodXNlcklkKVxuXHR7XG5cdFx0aWYoIXRoaXMuY3VycmVudElkICYmIHVzZXJJZCl7XG5cdFx0XHRkLnNjZW5lLmFkZCh0aGlzKTtcblx0XHRcdHRoaXMuY29tcG9uZW50cy5oYXQgPSBuZXcgTlNrZWxldG9uUGFyZW50KHRoaXMuaGF0KTtcblx0XHRcdHRoaXMuY29tcG9uZW50cy50ZXh0ID0gbmV3IE5Ta2VsZXRvblBhcmVudCh0aGlzLnRleHQpO1xuXHRcdH1cblx0XHRlbHNlIGlmKHRoaXMuY3VycmVudElkICYmICF1c2VySWQpe1xuXHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdC5kZXN0cm95KCk7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHMudGV4dC5kZXN0cm95KCk7XG5cdFx0XHRkLnNjZW5lLnJlbW92ZSh0aGlzKTtcblx0XHR9XG5cblx0XHRpZih1c2VySWQpe1xuXHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdC51cGRhdGUoe3VzZXJJZH0pO1xuXHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQudXBkYXRlKHt1c2VySWR9KTtcblx0XHR9XG5cblx0XHR0aGlzLmN1cnJlbnRJZCA9IHVzZXJJZDtcblx0fVxufVxuXG5jbGFzcyBQcmVzaWRlbnRIYXQgZXh0ZW5kcyBIYXRcbntcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihBTS5jYWNoZS5tb2RlbHMudG9waGF0KTtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjE0NC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHR0aGlzLnNjYWxlLm11bHRpcGx5U2NhbGFyKDEuMi9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xuXHRcdFxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWV9fSkgPT4ge1xuXHRcdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyAmJiBnYW1lLmZhaWxlZFZvdGVzID09PSAwKXtcblx0XHRcdFx0bGV0IHNpdHRpbmcgPSBnYW1lLnNwZWNpYWxFbGVjdGlvbiA/IGdhbWUucHJlc2lkZW50IDogZ2FtZS5sYXN0UHJlc2lkZW50O1xuXHRcdFx0XHR0aGlzLnNldE93bmVyKHNpdHRpbmcpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59O1xuXG5jbGFzcyBDaGFuY2VsbG9ySGF0IGV4dGVuZHMgSGF0XG57XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLnZpc29yY2FwKTtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjA3L1NILmVudi5waXhlbHNQZXJNZXRlciwgLjAzOC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xuXHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMS4yL1NILmVudi5waXhlbHNQZXJNZXRlcik7XG5cdFx0XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2xhc3RDaGFuY2VsbG9yJywgZSA9PiB7XG5cdFx0XHR0aGlzLnNldE93bmVyKGUuZGF0YS5nYW1lLmxhc3RDaGFuY2VsbG9yKTtcblx0XHR9KTtcblx0fVxufVxuXG5leHBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuY2xhc3MgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IodHlwZSl7XG5cdFx0dGhpcy50eXBlID0gdHlwZTtcblx0fVxuXG5cdGF3YWtlKG9iail7XG5cdFx0dGhpcy5vYmplY3QzRCA9IG9iajtcblx0fVxuXG5cdHN0YXJ0KCl7IH1cblxuXHR1cGRhdGUoZFQpeyB9XG5cblx0ZGlzcG9zZSgpeyB9XG59XG5cbmNsYXNzIEJTeW5jIGV4dGVuZHMgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IoZXZlbnROYW1lKVxuXHR7XG5cdFx0c3VwZXIoJ0JTeW5jJyk7XG5cdFx0dGhpcy5fcyA9IFNILnNvY2tldDtcblxuXHRcdC8vIGxpc3RlbiBmb3IgdXBkYXRlIGV2ZW50c1xuXHRcdHRoaXMuaG9vayA9IHRoaXMuX3Mub24oZXZlbnROYW1lLCB0aGlzLnVwZGF0ZUZyb21TZXJ2ZXIuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5ldmVudE5hbWUgPSBldmVudE5hbWU7XG5cdFx0dGhpcy5vd25lciA9IDA7XG5cdH1cblxuXHR1cGRhdGVGcm9tU2VydmVyKGRhdGEpXG5cdHtcblx0XHR0aGlzLm9iamVjdDNELnBvc2l0aW9uLmZyb21BcnJheShkYXRhLCAwKTtcblx0XHR0aGlzLm9iamVjdDNELnJvdGF0aW9uLmZyb21BcnJheShkYXRhLCAzKTtcblx0fVxuXG5cdHRha2VPd25lcnNoaXAoKVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyICYmIFNILmxvY2FsVXNlci51c2VySWQpXG5cdFx0XHR0aGlzLm93bmVyID0gU0gubG9jYWxVc2VyLnVzZXJJZDtcblx0fVxuXG5cdHVwZGF0ZShkVClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlciAmJiBTSC5sb2NhbFVzZXIuc2tlbGV0b24gJiYgU0gubG9jYWxVc2VyLmlkID09PSB0aGlzLm93bmVyKVxuXHRcdHtcblx0XHRcdGxldCBqID0gU0gubG9jYWxVc2VyLnNrZWxldG9uLmdldEpvaW50KCdIZWFkJyk7XG5cdFx0XHR0aGlzLl9zLmVtaXQodGhpcy5ldmVudE5hbWUsIFsuLi5qLnBvc2l0aW9uLnRvQXJyYXkoKSwgLi4uai5yb3RhdGlvbi50b0FycmF5KCldKTtcblx0XHR9XG5cdH1cblxufVxuXG5leHBvcnQgeyBCZWhhdmlvciwgQlN5bmMgfTtcbiIsImltcG9ydCB7IEJlaGF2aW9yIH0gZnJvbSAnLi9iZWhhdmlvcic7XG5cbmNsYXNzIFF1YXRlcm5pb25Ud2VlbiBleHRlbmRzIFRXRUVOLlR3ZWVuXG57XG5cdGNvbnN0cnVjdG9yKHN0YXRlLCBncm91cCl7XG5cdFx0c3VwZXIoe3Q6IDB9LCBncm91cCk7XG5cdFx0dGhpcy5fc3RhdGUgPSBzdGF0ZTtcblx0XHR0aGlzLl9zdGFydCA9IHN0YXRlLmNsb25lKCk7XG5cdH1cblx0dG8oZW5kLCBkdXJhdGlvbil7XG5cdFx0c3VwZXIudG8oe3Q6IDF9LCBkdXJhdGlvbik7XG5cdFx0dGhpcy5fZW5kID0gZW5kIGluc3RhbmNlb2YgVEhSRUUuUXVhdGVybmlvbiA/IFtlbmRdIDogZW5kO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cdHN0YXJ0KCl7XG5cdFx0dGhpcy5vblVwZGF0ZSgoe3Q6IHByb2dyZXNzfSkgPT4ge1xuXHRcdFx0cHJvZ3Jlc3MgPSBwcm9ncmVzcyAqIHRoaXMuX2VuZC5sZW5ndGg7XG5cdFx0XHRsZXQgbmV4dFBvaW50ID0gTWF0aC5jZWlsKHByb2dyZXNzKTtcblx0XHRcdGxldCBsb2NhbFByb2dyZXNzID0gcHJvZ3Jlc3MgLSBuZXh0UG9pbnQgKyAxO1xuXHRcdFx0bGV0IHBvaW50cyA9IFt0aGlzLl9zdGFydCwgLi4udGhpcy5fZW5kXTtcblx0XHRcdFRIUkVFLlF1YXRlcm5pb24uc2xlcnAocG9pbnRzW25leHRQb2ludC0xXSwgcG9pbnRzW25leHRQb2ludF0sIHRoaXMuX3N0YXRlLCBsb2NhbFByb2dyZXNzKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gc3VwZXIuc3RhcnQoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBXYWl0Rm9yQW5pbXModHdlZW5zKVxue1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cblx0e1xuXHRcdGxldCBhY3RpdmVDb3VudCA9IHR3ZWVucy5sZW5ndGg7XG5cdFx0ZnVuY3Rpb24gY2hlY2tEb25lKCl7XG5cdFx0XHRpZigtLWFjdGl2ZUNvdW50ID09PSAwKSByZXNvbHZlKCk7XG5cdFx0fVxuXG5cdFx0dHdlZW5zLmZvckVhY2godCA9PiB0Lm9uQ29tcGxldGUoY2hlY2tEb25lKSk7XG5cdFx0dHdlZW5zLmZvckVhY2godCA9PiB0LnN0YXJ0KCkpO1xuXHR9KTtcbn1cblxuY29uc3Qgc3BpblBvaW50cyA9IFtcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgTWF0aC5zcXJ0KDIpLzIsIDAsIE1hdGguc3FydCgyKS8yKSxcblx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMSwgMCwgMCksXG5cdG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIE1hdGguc3FydCgyKS8yLCAwLCAtTWF0aC5zcXJ0KDIpLzIpLFxuXHRuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAwLCAwLCAxKVxuXTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQW5pbWF0ZVxue1xuXHQvKipcblx0ICogTW92ZSBhbiBvYmplY3QgZnJvbSBBIHRvIEJcblx0ICogQHBhcmFtIHtUSFJFRS5PYmplY3QzRH0gdGFyZ2V0IFxuXHQgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuXHQgKi9cblx0c3RhdGljIHNpbXBsZSh0YXJnZXQsIHtwYXJlbnQ9bnVsbCwgcG9zPW51bGwsIHF1YXQ9bnVsbCwgc2NhbGU9bnVsbCwgbWF0cml4PW51bGwsIGR1cmF0aW9uPTYwMH0gPSB7fSlcblx0e1xuXHRcdC8vIGV4dHJhY3QgcG9zaXRpb24vcm90YXRpb24vc2NhbGUgZnJvbSBtYXRyaXhcblx0XHRpZihtYXRyaXgpe1xuXHRcdFx0cG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblx0XHRcdHF1YXQgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXHRcdFx0c2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXHRcdFx0bWF0cml4LmRlY29tcG9zZShwb3MsIHF1YXQsIHNjYWxlKTtcblx0XHR9XG5cblx0XHQvLyBzaHVmZmxlIGhpZXJhcmNoeSwgYnV0IGtlZXAgd29ybGQgdHJhbnNmb3JtIHRoZSBzYW1lXG5cdFx0aWYocGFyZW50ICYmIHRoaXMucGFyZW50ICE9PSB0YXJnZXQucGFyZW50KXtcblx0XHRcdHRhcmdldC5hcHBseU1hdHJpeCh0YXJnZXQucGFyZW50Lm1hdHJpeFdvcmxkKTtcblx0XHRcdHRhcmdldC5hcHBseU1hdHJpeChuZXcgVEhSRUUuTWF0cml4NCgpLmdldEludmVyc2UocGFyZW50Lm1hdHJpeFdvcmxkKSk7XG5cdFx0XHRwYXJlbnQuYWRkKG9iaik7XG5cdFx0fVxuXG5cdFx0bGV0IGFuaW1zID0gW107XG5cblx0XHRpZihwb3Mpe1xuXHRcdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4odGFyZ2V0LnBvc2l0aW9uKVxuXHRcdFx0XHQudG8oe3g6IHBvcy54LCB5OiBwb3MueSwgejogcG9zLnp9LCBkdXJhdGlvbilcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0aWYocXVhdCl7XG5cdFx0XHRhbmltcy5wdXNoKG5ldyBRdWF0ZXJuaW9uVHdlZW4odGFyZ2V0LnF1YXRlcm5pb24pXG5cdFx0XHRcdC50byhxdWF0LCBkdXJhdGlvbilcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0aWYoc2NhbGUpe1xuXHRcdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4odGFyZ2V0LnNjYWxlKVxuXHRcdFx0XHQudG8oe3g6IHNjYWxlLngsIHk6IHNjYWxlLnksIHo6IHNjYWxlLnp9LCBkdXJhdGlvbilcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XG5cdH1cblxuXHRzdGF0aWMgd2FpdChkdXJhdGlvbil7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdHNldFRpbWVvdXQocmVzb2x2ZSwgZHVyYXRpb24pO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIE1ha2UgdGhlIGNhcmQgYXBwZWFyIHdpdGggYSBmbG91cmlzaFxuXHQgKiBAcGFyYW0ge1RIUkVFLk9iamVjdDNEfSBjYXJkIFxuXHQgKi9cblx0c3RhdGljIGNhcmRGbG91cmlzaChjYXJkKVxuXHR7XG5cdFx0Y2FyZC5wb3NpdGlvbi5zZXQoMCwgMCwgMCk7XG5cdFx0Y2FyZC5xdWF0ZXJuaW9uLnNldCgwLDAsMCwxKTtcblx0XHRjYXJkLnNjYWxlLnNldFNjYWxhciguMDAxKTtcblxuXHRcdGxldCBhbmltcyA9IFtdO1xuXG5cdFx0Ly8gYWRkIHBvc2l0aW9uIGFuaW1hdGlvblxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKGNhcmQucG9zaXRpb24pXG5cdFx0XHQudG8oe3g6IDAsIHk6IC43LCB6OiAwfSwgMTUwMClcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLkVsYXN0aWMuT3V0KVxuXHRcdCk7XG5cblx0XHQvLyBhZGQgc3BpbiBhbmltYXRpb25cblx0XHRhbmltcy5wdXNoKG5ldyBRdWF0ZXJuaW9uVHdlZW4oY2FyZC5xdWF0ZXJuaW9uKVxuXHRcdFx0LnRvKHNwaW5Qb2ludHMsIDI1MDApXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0KVxuXHRcdCk7XG5cblx0XHQvLyBhZGQgc2NhbGUgYW5pbWF0aW9uXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4oY2FyZC5zY2FsZSlcblx0XHRcdC50byh7eDogLjUsIHk6IC41LCB6OiAuNX0sIDIwMClcblx0XHQpO1xuXG5cdFx0cmV0dXJuIFdhaXRGb3JBbmltcyhhbmltcyk7XG5cdH1cblxuXHRzdGF0aWMgdmFuaXNoKGNhcmQpXG5cdHtcblx0XHRsZXQgYW5pbXMgPSBbXTtcblxuXHRcdC8vIGFkZCBtb3ZlIGFuaW1hdGlvblxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKGNhcmQucG9zaXRpb24pXG5cdFx0XHQudG8oe3k6ICcrMC41J30sIDEwMDApXG5cdFx0KTtcblxuXHRcdC8vIGFkZCBkaXNhcHBlYXIgYW5pbWF0aW9uXG5cdFx0YW5pbXMucHVzaChuZXcgVFdFRU4uVHdlZW4oY2FyZC5tYXRlcmlhbClcblx0XHRcdC50byh7b3BhY2l0eTogMH0sIDEwMDApXG5cdFx0KTtcblxuXHRcdHJldHVybiBXYWl0Rm9yQW5pbXMoYW5pbXMpO1xuXHR9XG5cblx0c3RhdGljIGJvYihvYmosIGFtcGxpdHVkZSA9IC4wOCwgcGVyaW9kID0gNDAwMClcblx0e1xuXHRcdHJldHVybiBuZXcgVFdFRU4uVHdlZW4ob2JqLnBvc2l0aW9uKVxuXHRcdFx0LnRvKHt5OiBvYmoucG9zaXRpb24ueS1hbXBsaXR1ZGV9LCBwZXJpb2QpXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5TaW51c29pZGFsLkluT3V0KVxuXHRcdFx0LnJlcGVhdChJbmZpbml0eSlcblx0XHRcdC55b3lvKHRydWUpXG5cdFx0XHQuc3RhcnQoKTtcblx0fVxuXG5cdHN0YXRpYyBzcGluKG9iaiwgcGVyaW9kID0gMTAwMDApXG5cdHtcblx0XHRyZXR1cm4gbmV3IFF1YXRlcm5pb25Ud2VlbihvYmoucXVhdGVybmlvbilcblx0XHRcdC50byhzcGluUG9pbnRzLCBwZXJpb2QpXG5cdFx0XHQucmVwZWF0KEluZmluaXR5KVxuXHRcdFx0LnN0YXJ0KCk7XG5cdH1cbn0iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbi8vIGVudW0gY29uc3RhbnRzXG5sZXQgVHlwZXMgPSBPYmplY3QuZnJlZXplKHtcblx0UE9MSUNZX0xJQkVSQUw6IDAsXG5cdFBPTElDWV9GQVNDSVNUOiAxLFxuXHRST0xFX0xJQkVSQUw6IDIsXG5cdFJPTEVfRkFTQ0lTVDogMyxcblx0Uk9MRV9ISVRMRVI6IDQsXG5cdFBBUlRZX0xJQkVSQUw6IDUsXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXG5cdEpBOiA3LFxuXHRORUlOOiA4LFxuXHRCTEFOSzogOSxcblx0Q1JFRElUUzogMTAsXG5cdFZFVE86IDExXG59KTtcblxubGV0IGdlb21ldHJ5ID0gbnVsbCwgbWF0ZXJpYWwgPSBudWxsO1xuXG5mdW5jdGlvbiBpbml0Q2FyZERhdGEoKVxue1xuXHRsZXQgZmxvYXREYXRhID0gW1xuXHRcdC8vIHBvc2l0aW9uIChwb3J0cmFpdClcblx0XHQwLjM1NzUsIDAuNSwgMC4wMDA1LFxuXHRcdC0uMzU3NSwgMC41LCAwLjAwMDUsXG5cdFx0LS4zNTc1LCAtLjUsIDAuMDAwNSxcblx0XHQwLjM1NzUsIC0uNSwgMC4wMDA1LFxuXHRcdDAuMzU3NSwgMC41LCAtLjAwMDUsXG5cdFx0LS4zNTc1LCAwLjUsIC0uMDAwNSxcblx0XHQtLjM1NzUsIC0uNSwgLS4wMDA1LFxuXHRcdDAuMzU3NSwgLS41LCAtLjAwMDUsXG5cdFxuXHRcdC8vIHBvc2l0aW9uIChsYW5kc2NhcGUpXG5cdFx0MC41LCAtLjM1NzUsIDAuMDAwNSxcblx0XHQwLjUsIDAuMzU3NSwgMC4wMDA1LFxuXHRcdC0uNSwgMC4zNTc1LCAwLjAwMDUsXG5cdFx0LS41LCAtLjM1NzUsIDAuMDAwNSxcblx0XHQwLjUsIC0uMzU3NSwgLS4wMDA1LFxuXHRcdDAuNSwgMC4zNTc1LCAtLjAwMDUsXG5cdFx0LS41LCAwLjM1NzUsIC0uMDAwNSxcblx0XHQtLjUsIC0uMzU3NSwgLS4wMDA1LFxuXHRcblx0XHQvLyBVVnNcblx0XHQvKiAtLS0tLS0tLS0tLS0tLSBjYXJkIGZhY2UgLS0tLS0tLS0tLS0tLSAqLyAvKiAtLS0tLS0tLS0tLS0tIGNhcmQgYmFjayAtLS0tLS0tLS0tLS0tLSovXG5cdFx0Ljc1NCwuOTk2LCAuNzU0LC44MzQsIC45OTcsLjgzNCwgLjk5NywuOTk2LCAuNzU0LC44MzQsIC43NTQsLjk5NiwgLjk5NywuOTk2LCAuOTk3LC44MzQsIC8vIGxpYmVyYWwgcG9saWN5XG5cdFx0Ljc1NCwuODIyLCAuNzU0LC42NjAsIC45OTYsLjY2MCwgLjk5NiwuODIyLCAuNzU0LC42NjAsIC43NTQsLjgyMiwgLjk5NiwuODIyLCAuOTk2LC42NjAsIC8vIGZhc2Npc3QgcG9saWN5XG5cdFx0Ljc0NiwuOTk2LCAuNTA1LC45OTYsIC41MDUsLjY1MCwgLjc0NiwuNjUwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGxpYmVyYWwgcm9sZVxuXHRcdC43NDYsLjY0NSwgLjUwNSwuNjQ1LCAuNTA1LC4zMDAsIC43NDYsLjMwMCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBmYXNjaXN0IHJvbGVcblx0XHQuOTk2LC42NDUsIC43NTQsLjY0NSwgLjc1NCwuMzAwLCAuOTk2LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gaGl0bGVyIHJvbGVcblx0XHQuNDk1LC45OTYsIC4yNTUsLjk5NiwgLjI1NSwuNjUwLCAuNDk1LC42NTAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbGliZXJhbCBwYXJ0eVxuXHRcdC40OTUsLjY0NSwgLjI1NSwuNjQ1LCAuMjU1LC4zMDAsIC40OTUsLjMwMCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBmYXNjaXN0IHBhcnR5XG5cdFx0LjI0NCwuOTkyLCAuMDA1LC45OTIsIC4wMDUsLjY1MywgLjI0NCwuNjUzLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGphXG5cdFx0LjI0MywuNjQyLCAuMDA2LC42NDIsIC4wMDYsLjMwMiwgLjI0MywuMzAyLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIG5laW5cblx0XHQuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gYmxhbmtcblx0XHQuMzk3LC4yNzYsIC4zOTcsLjAxNSwgLjc2NSwuMDE1LCAuNzY1LC4yNzYsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gY3JlZGl0c1xuXHRcdC45NjMsLjI3MCwgLjgwNCwuMjcwLCAuODA0LC4wMjksIC45NjMsLjAyOSwgLjgwNCwuMjcwLCAuOTYzLC4yNzAsIC45NjMsLjAyOSwgLjgwNCwuMDI5LCAvLyB2ZXRvXG5cblx0XTtcblx0XG5cdGxldCBpbnREYXRhID0gW1xuXHRcdC8vIHRyaWFuZ2xlIGluZGV4XG5cdFx0MCwxLDIsIDAsMiwzLCA0LDcsNSwgNSw3LDZcblx0XTtcblx0XG5cdC8vIHR3byBwb3NpdGlvbiBzZXRzLCAxMSBVViBzZXRzLCAxIGluZGV4IHNldFxuXHRsZXQgZ2VvQnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDQqZmxvYXREYXRhLmxlbmd0aCArIDIqaW50RGF0YS5sZW5ndGgpO1xuXHRsZXQgdGVtcCA9IG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCAwLCBmbG9hdERhdGEubGVuZ3RoKTtcblx0dGVtcC5zZXQoZmxvYXREYXRhKTtcblx0dGVtcCA9IG5ldyBVaW50MTZBcnJheShnZW9CdWZmZXIsIDQqZmxvYXREYXRhLmxlbmd0aCwgaW50RGF0YS5sZW5ndGgpO1xuXHR0ZW1wLnNldChpbnREYXRhKTtcblx0XG5cdC8vIGNob3AgdXAgYnVmZmVyIGludG8gdmVydGV4IGF0dHJpYnV0ZXNcblx0bGV0IHBvc0xlbmd0aCA9IDgqMywgdXZMZW5ndGggPSA4KjIsIGluZGV4TGVuZ3RoID0gMTI7XG5cdGxldCBwb3NQb3J0cmFpdCA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDAsIHBvc0xlbmd0aCksIDMpLFxuXHRcdHBvc0xhbmRzY2FwZSA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDQqcG9zTGVuZ3RoLCBwb3NMZW5ndGgpLCAzKTtcblx0bGV0IHV2cyA9IFtdO1xuXHRmb3IobGV0IGk9MDsgaTwxMjsgaSsrKXtcblx0XHR1dnMucHVzaCggbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgOCpwb3NMZW5ndGggKyA0KmkqdXZMZW5ndGgsIHV2TGVuZ3RoKSwgMikgKTtcblx0fVxuXHRsZXQgaW5kZXggPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBVaW50MTZBcnJheShnZW9CdWZmZXIsIDQqZmxvYXREYXRhLmxlbmd0aCwgaW5kZXhMZW5ndGgpLCAxKTtcblx0XG5cdGdlb21ldHJ5ID0gT2JqZWN0LmtleXMoVHlwZXMpLm1hcCgoa2V5LCBpKSA9PlxuXHR7XG5cdFx0bGV0IGdlbyA9IG5ldyBUSFJFRS5CdWZmZXJHZW9tZXRyeSgpO1xuXHRcdGdlby5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgaT09VHlwZXMuSkEgfHwgaT09VHlwZXMuTkVJTiA/IHBvc0xhbmRzY2FwZSA6IHBvc1BvcnRyYWl0KTtcblx0XHRnZW8uYWRkQXR0cmlidXRlKCd1dicsIHV2c1tpXSk7XG5cdFx0Z2VvLnNldEluZGV4KGluZGV4KTtcblx0XHRyZXR1cm4gZ2VvO1xuXHR9KTtcblxuXHRtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KTtcbn1cblxuXG5jbGFzcyBDYXJkIGV4dGVuZHMgVEhSRUUuTWVzaFxue1xuXHRjb25zdHJ1Y3Rvcih0eXBlID0gVHlwZXMuQkxBTkspXG5cdHtcblx0XHRpZighZ2VvbWV0cnkgfHwgIW1hdGVyaWFsKSBpbml0Q2FyZERhdGEoKTtcblxuXHRcdGxldCBnZW8gPSBnZW9tZXRyeVt0eXBlXTtcblx0XHRzdXBlcihnZW8sIG1hdGVyaWFsKTtcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjcpO1xuXHR9XG59XG5cbmNsYXNzIEJsYW5rQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3RvcigpeyBzdXBlcigpOyB9XG59XG5cbmNsYXNzIENyZWRpdHNDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuQ1JFRElUUyk7XG5cdH1cbn1cblxuY2xhc3MgTGliZXJhbFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfTElCRVJBTCwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIEZhc2Npc3RQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0ZBU0NJU1QpO1xuXHR9XG59XG5cbmNsYXNzIFZldG9DYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuVkVUTyk7XG5cdH1cbn1cbmNsYXNzIExpYmVyYWxSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfTElCRVJBTCk7XG5cdH1cbn1cblxuY2xhc3MgRmFzY2lzdFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9GQVNDSVNUKTtcblx0fVxufVxuXG5jbGFzcyBIaXRsZXJSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfSElUTEVSKTtcblx0fVxufVxuXG5jbGFzcyBMaWJlcmFsUGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfTElCRVJBTCk7XG5cdH1cbn1cblxuY2xhc3MgRmFzY2lzdFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0ZBU0NJU1QpO1xuXHR9XG59XG5cbmNsYXNzIEphQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLkpBKTtcblx0fVxufVxuXG5jbGFzcyBOZWluQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLk5FSU4pO1xuXHR9XG59XG5cblxuZXhwb3J0IHtcblx0Q2FyZCwgVHlwZXMsIEJsYW5rQ2FyZCwgQ3JlZGl0c0NhcmQsIFZldG9DYXJkLFxuXHRMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFJvbGVDYXJkLFxuXHRIaXRsZXJSb2xlQ2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZFxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xuaW1wb3J0IHtMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIFZldG9DYXJkfSBmcm9tICcuL2NhcmQnO1xuXG5sZXQgTGliZXJhbFNwb3RzID0ge1xuXHRwb3NpdGlvbnM6IFtcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjY5MCwgMC4wMDEsIC0wLjQyKSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjM0NSwgMC4wMDEsIC0wLjQyKSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjAwMiwgMC4wMDEsIC0wLjQyKSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjM0MCwgMC4wMDEsIC0wLjQyKSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjY5MCwgMC4wMDEsIC0wLjQyKVxuXHRdLFxuXHRxdWF0ZXJuaW9uOiBuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAwLjcwNzEwNjc4MTE4NjU0NzUsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMCksXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjQsIDAuNCwgMC40KVxufSxcbkZhc2Npc3RTcG90cyA9IHtcblx0cG9zaXRpb25zOiBbXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoLS44NjAsIDAuMDAxLCAuNDI1KSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjUxNSwgMC4wMDEsIC40MjUpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uMTcwLCAwLjAwMSwgLjQyNSksXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC4xNzAsIDAuMDAxLCAuNDI1KSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjUxOCwgMC4wMDEsIC40MjUpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuODcwLCAwLjAwMSwgLjQyNSksXHRcblx0XSxcblx0cXVhdGVybmlvbjogbmV3IFRIUkVFLlF1YXRlcm5pb24oLTAuNzA3MTA2NzgxMTg2NTQ3NSwgMCwgMCwgMC43MDcxMDY3ODExODY1NDc1KSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNCwgMC40LCAwLjQpXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHYW1lVGFibGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0Ly8gdGFibGUgc3RhdGVcblx0XHR0aGlzLmxpYmVyYWxDYXJkcyA9IDA7XG5cdFx0dGhpcy5mYXNjaXN0Q2FyZHMgPSAwO1xuXHRcdHRoaXMuY2FyZHMgPSBbXTtcblxuXHRcdHRoaXMudmV0b0NhcmQgPSBuZXcgVmV0b0NhcmQoKTtcblx0XHR0aGlzLnZldG9DYXJkLnNjYWxlLnNldFNjYWxhciguNSk7XG5cdFx0dGhpcy52ZXRvQ2FyZC52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy52ZXRvQ2FyZC5tYXRlcmlhbC50cmFuc3BhcmVudCA9IHRydWU7XG5cdFx0dGhpcy5hZGQodGhpcy52ZXRvQ2FyZCk7XG5cblx0XHQvLyBhZGQgdGFibGUgYXNzZXRcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnRhYmxlO1xuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xuXG5cdFx0Ly8gc2F2ZSByZWZlcmVuY2VzIHRvIHRoZSB0ZXh0dXJlc1xuXHRcdHRoaXMudGV4dHVyZXMgPSBbXG5cdFx0XHRBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9zbWFsbCxcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX21lZCxcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX2xhcmdlXG5cdFx0XTtcblx0XHR0aGlzLnRleHR1cmVzLmZvckVhY2godGV4ID0+IHRleC5mbGlwWSA9IGZhbHNlKTtcblx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1swXSwgdHJ1ZSk7XG5cdFx0XG5cdFx0Ly8gcG9zaXRpb24gdGFibGVcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjg4LCAwKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLmNoYW5nZU1vZGUuYmluZCh0aGlzKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2xpYmVyYWxQb2xpY2llcycsIHRoaXMudXBkYXRlUG9saWNpZXMuYmluZCh0aGlzKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2Zhc2Npc3RQb2xpY2llcycsIHRoaXMudXBkYXRlUG9saWNpZXMuYmluZCh0aGlzKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2ZhaWxlZFZvdGVzJywgdGhpcy51cGRhdGVQb2xpY2llcy5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdGNoYW5nZU1vZGUoe2RhdGE6IHtnYW1lOiB7c3RhdGUsIHR1cm5PcmRlcn19fSlcblx0e1xuXHRcdGlmKHR1cm5PcmRlci5sZW5ndGggPj0gOSlcblx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzJdKTtcblx0XHRlbHNlIGlmKHR1cm5PcmRlci5sZW5ndGggPj0gNylcblx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzFdKTtcblx0XHRlbHNlXG5cdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1swXSk7XG5cdH1cblxuXHRzZXRUZXh0dXJlKG5ld1RleCwgc3dpdGNoTGlnaHRtYXApXG5cdHtcblx0XHR0aGlzLm1vZGVsLnRyYXZlcnNlKG8gPT4ge1xuXHRcdFx0aWYobyBpbnN0YW5jZW9mIFRIUkVFLk1lc2gpXG5cdFx0XHR7XG5cdFx0XHRcdGlmKHN3aXRjaExpZ2h0bWFwKVxuXHRcdFx0XHRcdG8ubWF0ZXJpYWwubGlnaHRNYXAgPSBvLm1hdGVyaWFsLm1hcDtcblxuXHRcdFx0XHRvLm1hdGVyaWFsLm1hcCA9IG5ld1RleDtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdHVwZGF0ZVBvbGljaWVzKHtkYXRhOiB7Z2FtZToge2xpYmVyYWxQb2xpY2llcywgZmFzY2lzdFBvbGljaWVzLCBoYW5kLCBzdGF0ZX19fSlcblx0e1xuXHRcdGxldCB1cGRhdGVzID0gW107XG5cblx0XHQvLyBxdWV1ZSB1cCBjYXJkcyB0byBiZSBhZGRlZCB0byB0aGUgdGFibGUgdGhpcyB1cGRhdGVcblx0XHRmb3IodmFyIGk9dGhpcy5saWJlcmFsQ2FyZHM7IGk8bGliZXJhbFBvbGljaWVzOyBpKyspe1xuXHRcdFx0bGV0IGNhcmQgPSBuZXcgTGliZXJhbFBvbGljeUNhcmQoKTtcblx0XHRcdGNhcmQuYW5pbWF0ZSA9ICgpID0+IEFuaW1hdGUuc2ltcGxlKGNhcmQsIHtcblx0XHRcdFx0cG9zOiBMaWJlcmFsU3BvdHMucG9zaXRpb25zW2ldLFxuXHRcdFx0XHRxdWF0OiBMaWJlcmFsU3BvdHMucXVhdGVybmlvbixcblx0XHRcdFx0c2NhbGU6IExpYmVyYWxTcG90cy5zY2FsZVxuXHRcdFx0fSkudGhlbigoKSA9PiBBbmltYXRlLndhaXQoNTAwKSk7XG5cdFx0XHRjYXJkLnBsYXlTb3VuZCA9ICgpID0+IFNILmF1ZGlvLmxpYmVyYWxTdGluZy5wbGF5KCk7XG5cdFx0XHR1cGRhdGVzLnB1c2goY2FyZCk7XG5cdFx0fVxuXHRcdFxuXHRcdGZvcih2YXIgaT10aGlzLmZhc2Npc3RDYXJkczsgaTxmYXNjaXN0UG9saWNpZXM7IGkrKyl7XG5cdFx0XHRsZXQgY2FyZCA9IG5ldyBGYXNjaXN0UG9saWN5Q2FyZCgpO1xuXHRcdFx0Y2FyZC5hbmltYXRlID0gKCkgPT4gQW5pbWF0ZS5zaW1wbGUoY2FyZCwge1xuXHRcdFx0XHRwb3M6IEZhc2Npc3RTcG90cy5wb3NpdGlvbnNbaV0sXG5cdFx0XHRcdHF1YXQ6IEZhc2Npc3RTcG90cy5xdWF0ZXJuaW9uLFxuXHRcdFx0XHRzY2FsZTogRmFzY2lzdFNwb3RzLnNjYWxlXG5cdFx0XHR9KTtcblx0XHRcdGNhcmQucGxheVNvdW5kID0gKCkgPT4gU0guYXVkaW8uZmFzY2lzdFN0aW5nLnBsYXkoKTtcblx0XHRcdHVwZGF0ZXMucHVzaChjYXJkKTtcblx0XHR9XG5cblx0XHRpZihzdGF0ZSA9PT0gJ2FmdGVybWF0aCcgJiYgaGFuZCA9PT0gMSl7XG5cdFx0XHR1cGRhdGVzLnB1c2godGhpcy52ZXRvQ2FyZCk7XG5cdFx0fVxuXG5cdFx0bGV0IGFuaW1hdGlvbiA9IG51bGw7XG5cdFx0aWYodXBkYXRlcy5sZW5ndGggPT09IDEpXG5cdFx0e1xuXHRcdFx0bGV0IGNhcmQgPSB1cGRhdGVzWzBdO1xuXHRcdFx0aWYoY2FyZCA9PT0gdGhpcy52ZXRvQ2FyZClcblx0XHRcdHtcblx0XHRcdFx0Y2FyZC52aXNpYmxlID0gdHJ1ZTsgY2FyZC5tYXRlcmlhbC5vcGFjaXR5ID0gMTtcblx0XHRcdFx0YW5pbWF0aW9uID0gQW5pbWF0ZS5jYXJkRmxvdXJpc2goY2FyZCk7XG5cdFx0XHRcdGFuaW1hdGlvbi50aGVuKCgpID0+IEFuaW1hdGUudmFuaXNoKGNhcmQpKVxuXHRcdFx0XHQudGhlbigoKSA9PiB7IGNhcmQudmlzaWJsZSA9IGZhbHNlOyB9KTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5hZGQoY2FyZCk7XG5cdFx0XHRcdHRoaXMuY2FyZHMucHVzaChjYXJkKTtcblx0XHRcdFx0Y2FyZC5wbGF5U291bmQoKTtcblx0XHRcdFx0YW5pbWF0aW9uID0gQW5pbWF0ZS5jYXJkRmxvdXJpc2goY2FyZClcblx0XHRcdFx0LnRoZW4oKCkgPT4gY2FyZC5hbmltYXRlKCkpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0Ly8gcGxhY2Ugb24gdGhlaXIgc3BvdHNcblx0XHRcdHVwZGF0ZXMuZm9yRWFjaChjYXJkID0+IHtcblx0XHRcdFx0Y2FyZC5wb3NpdGlvbi5jb3B5KGNhcmQuZGVzdGluYXRpb24ucG9zKTtcblx0XHRcdFx0Y2FyZC5xdWF0ZXJuaW9uLmNvcHkoY2FyZC5kZXN0aW5hdGlvbi5xdWF0KTtcblx0XHRcdFx0Y2FyZC5zY2FsZS5jb3B5KGNhcmQuZGVzdGluYXRpb24uc2NhbGUpO1xuXHRcdFx0XHR0aGlzLmFkZChjYXJkKTtcblx0XHRcdFx0dGhpcy5jYXJkcy5wdXNoKGNhcmQpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGFuaW1hdGlvbiA9IFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdH1cblxuXHRcdGlmKHN0YXRlID09PSAnYWZ0ZXJtYXRoJyl7XG5cdFx0XHRhbmltYXRpb24udGhlbigoKSA9PiB7XG5cdFx0XHRcdFNILmRpc3BhdGNoRXZlbnQoe1xuXHRcdFx0XHRcdHR5cGU6ICdwb2xpY3lBbmltRG9uZScsXG5cdFx0XHRcdFx0YnViYmxlczogZmFsc2Vcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZihsaWJlcmFsUG9saWNpZXMgPT09IDAgJiYgZmFzY2lzdFBvbGljaWVzID09PSAwKXtcblx0XHRcdHRoaXMuY2FyZHMuZm9yRWFjaChjID0+IHRoaXMucmVtb3ZlKGMpKTtcblx0XHR9XG5cblx0XHR0aGlzLmxpYmVyYWxDYXJkcyA9IGxpYmVyYWxQb2xpY2llcztcblx0XHR0aGlzLmZhc2Npc3RDYXJkcyA9IGZhc2Npc3RQb2xpY2llcztcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuZnVuY3Rpb24gZ2V0R2FtZUlkKClcbntcblx0Ly8gZmlyc3QgY2hlY2sgdGhlIHVybFxuXHRsZXQgcmUgPSAvWz8mXWdhbWVJZD0oW14mXSspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRpZihyZSl7XG5cdFx0cmV0dXJuIHJlWzFdO1xuXHR9XG5cdGVsc2UgaWYoYWx0c3BhY2UgJiYgYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdHJldHVybiBTSC5lbnYuc2lkO1xuXHR9XG5cdGVsc2Uge1xuXHRcdGxldCBpZCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDAgKTtcblx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZSgnP2dhbWVJZD0nK2lkKTtcblx0fVxufVxuXG5mdW5jdGlvbiBwYXJzZUNTVihzdHIpe1xuXHRpZighc3RyKSByZXR1cm4gW107XG5cdGVsc2UgcmV0dXJuIHN0ci5zcGxpdCgnLCcpO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVF1ZXN0aW9uKHRleHQsIHRleHR1cmUgPSBudWxsKVxue1xuXHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XG5cblx0Ly8gc2V0IHVwIGNhbnZhc1xuXHRsZXQgYm1wO1xuXHRpZighdGV4dHVyZSl7XG5cdFx0Ym1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0Ym1wLndpZHRoID0gNTEyO1xuXHRcdGJtcC5oZWlnaHQgPSAyNTY7XG5cdH1cblx0ZWxzZSB7XG5cdFx0Ym1wID0gdGV4dHVyZS5pbWFnZTtcblx0fVxuXG5cdGxldCBnID0gYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdGcuY2xlYXJSZWN0KDAsIDAsIDUxMiwgMjU2KTtcblx0Zy50ZXh0QWxpZ24gPSAnY2VudGVyJztcblx0Zy5maWxsU3R5bGUgPSAnYmxhY2snO1xuXG5cdC8vIHdyaXRlIHRleHRcblx0Zy5mb250ID0gJ2JvbGQgNTBweCAnK2ZvbnRTdGFjaztcblx0bGV0IGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG5cdGZvcihsZXQgaT0wOyBpPGxpbmVzLmxlbmd0aDsgaSsrKXtcblx0XHRnLmZpbGxUZXh0KGxpbmVzW2ldLCAyNTYsIDUwKzU1KmkpO1xuXHR9XG5cblx0aWYodGV4dHVyZSl7XG5cdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdFx0cmV0dXJuIHRleHR1cmU7XG5cdH1cblx0ZWxzZSB7XG5cdFx0cmV0dXJuIG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKGJtcCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gbWVyZ2VPYmplY3RzKGEsIGIsIGRlcHRoPTIpXG57XG5cdGZ1bmN0aW9uIHVuaXF1ZShlLCBpLCBhKXtcblx0XHRyZXR1cm4gYS5pbmRleE9mKGUpID09PSBpO1xuXHR9XG5cblx0bGV0IGFJc09iaiA9IGEgaW5zdGFuY2VvZiBPYmplY3QsIGJJc09iaiA9IGIgaW5zdGFuY2VvZiBPYmplY3Q7XG5cdGlmKGFJc09iaiAmJiBiSXNPYmogJiYgZGVwdGggPiAwKVxuXHR7XG5cdFx0bGV0IHJlc3VsdCA9IHt9O1xuXHRcdGxldCBrZXlzID0gWy4uLk9iamVjdC5rZXlzKGEpLCAuLi5PYmplY3Qua2V5cyhiKV0uZmlsdGVyKHVuaXF1ZSk7XG5cdFx0Zm9yKGxldCBpPTA7IGk8a2V5cy5sZW5ndGg7IGkrKyl7XG5cdFx0XHRyZXN1bHRba2V5c1tpXV0gPSBtZXJnZU9iamVjdHMoYVtrZXlzW2ldXSwgYltrZXlzW2ldXSwgZGVwdGgtMSk7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0ZWxzZSBpZihiICE9PSB1bmRlZmluZWQpXG5cdFx0cmV0dXJuIGI7XG5cdGVsc2Vcblx0XHRyZXR1cm4gYTtcbn1cblxuZnVuY3Rpb24gbGF0ZVVwZGF0ZShmbilcbntcblx0cmV0dXJuICguLi5hcmdzKSA9PiB7XG5cdFx0c2V0VGltZW91dCgoKSA9PiBmbiguLi5hcmdzKSwgMTUpO1xuXHR9O1xufVxuXG5leHBvcnQgeyBnZXRHYW1lSWQsIHBhcnNlQ1NWLCBnZW5lcmF0ZVF1ZXN0aW9uLCBtZXJnZU9iamVjdHMsIGxhdGVVcGRhdGUgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE5hbWVwbGF0ZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXQpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC42MzUsIDAuMjIpO1xuXHRcdHNlYXQuYWRkKHRoaXMpO1xuXG5cdFx0Ly8gYWRkIDNkIG1vZGVsXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy5uYW1lcGxhdGUuY2hpbGRyZW5bMF0uY2xvbmUoKTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCBNYXRoLlBJLzIpO1xuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xuXG5cdFx0Ly8gZ2VuZXJhdGUgbWF0ZXJpYWxcblx0XHR0aGlzLmJtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMuYm1wLndpZHRoID0gTmFtZXBsYXRlLnRleHR1cmVTaXplO1xuXHRcdHRoaXMuYm1wLmhlaWdodCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAvIDI7XG5cdFx0dGhpcy5tb2RlbC5tYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG5cdFx0XHRtYXA6IG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKHRoaXMuYm1wKVxuXHRcdH0pO1xuXG5cdFx0Ly8gY3JlYXRlIGxpc3RlbmVyIHByb3hpZXNcblx0XHR0aGlzLl9ob3ZlckJlaGF2aW9yID0gbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJDb2xvcih7XG5cdFx0XHRjb2xvcjogbmV3IFRIUkVFLkNvbG9yKDB4ZmZhOGE4KVxuXHRcdH0pO1xuXHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0dGhpcy5tb2RlbC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdGlmKHN0YXRlID09PSAnc2V0dXAnKVxuXHRcdFx0XHR0aGlzLm1vZGVsLmFkZEJlaGF2aW9yKHRoaXMuX2hvdmVyQmVoYXZpb3IpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aGlzLm1vZGVsLnJlbW92ZUJlaGF2aW9yKHRoaXMuX2hvdmVyQmVoYXZpb3IpO1xuXHRcdH0pO1xuXHR9XG5cblx0dXBkYXRlVGV4dCh0ZXh0KVxuXHR7XG5cdFx0bGV0IGZvbnRTaXplID0gNy8zMiAqIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAqIDAuNjU7XG5cblx0XHQvLyBzZXQgdXAgY2FudmFzXG5cdFx0bGV0IGcgPSB0aGlzLmJtcC5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdGxldCBmb250U3RhY2sgPSAnXCJIZWx2ZXRpY2EgTmV1ZVwiLCBIZWx2ZXRpY2EsIEFyaWFsLCBTYW5zLVNlcmlmJztcblx0XHRnLmZpbGxTdHlsZSA9ICcjMjIyJztcblx0XHRnLmZpbGxSZWN0KDAsIDAsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSwgTmFtZXBsYXRlLnRleHR1cmVTaXplLzIpO1xuXHRcdGcuZm9udCA9IGBib2xkICR7Zm9udFNpemV9cHggJHtmb250U3RhY2t9YDtcblx0XHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xuXHRcdGcuZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHRnLmZpbGxUZXh0KHRleHQsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yLCAoMC40MiAtIDAuMTIpKihOYW1lcGxhdGUudGV4dHVyZVNpemUvMikpO1xuXG5cdFx0dGhpcy5tb2RlbC5tYXRlcmlhbC5tYXAubmVlZHNVcGRhdGUgPSB0cnVlO1xuXHR9XG5cblx0Y2xpY2soZSlcblx0e1xuXHRcdGlmKFNILmdhbWUuc3RhdGUgIT09ICdzZXR1cCcpIHJldHVybjtcblxuXHRcdGlmKCF0aGlzLnNlYXQub3duZXIpXG5cdFx0XHR0aGlzLnJlcXVlc3RKb2luKCk7XG5cdFx0ZWxzZSBpZih0aGlzLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcblx0XHRcdHRoaXMucmVxdWVzdExlYXZlKCk7XG5cdFx0ZWxzZSBpZihTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxuXHRcdFx0dGhpcy5yZXF1ZXN0S2ljaygpO1xuXHR9XG5cblx0cmVxdWVzdEpvaW4oKVxuXHR7XG5cdFx0U0guc29ja2V0LmVtaXQoJ2pvaW4nLCBPYmplY3QuYXNzaWduKHtzZWF0TnVtOiB0aGlzLnNlYXQuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpO1xuXHR9XG5cblx0cmVxdWVzdExlYXZlKClcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblx0XHRpZighc2VsZi5xdWVzdGlvbilcblx0XHR7XG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VsZi5zZWF0LmJhbGxvdC5hc2tRdWVzdGlvbignQXJlIHlvdSBzdXJlIHlvdVxcbndhbnQgdG8gbGVhdmU/JywgJ2xvY2FsX2xlYXZlJylcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xuXHRcdFx0XHRpZihjb25maXJtKXtcblx0XHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbGVhdmUnLCBTSC5sb2NhbFVzZXIuaWQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNlbGYucXVlc3Rpb24gPSBudWxsO1xuXHRcdFx0fSlcblx0XHRcdC5jYXRjaCgoKSA9PiB7IHNlbGYucXVlc3Rpb24gPSBudWxsOyB9KTtcblx0XHR9XG5cdH1cblxuXHRyZXF1ZXN0S2ljaygpXG5cdHtcblx0XHRsZXQgc2VsZiA9IHRoaXM7XG5cdFx0aWYoIXNlbGYucXVlc3Rpb24pXG5cdFx0e1xuXHRcdFx0bGV0IHNlYXQgPSBTSC5zZWF0c1tTSC5wbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0uc2VhdE51bV07XG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VhdC5iYWxsb3QuYXNrUXVlc3Rpb24oXG5cdFx0XHRcdCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byB0cnkgdG8ga2lja1xcbidcblx0XHRcdFx0K1NILnBsYXllcnNbc2VsZi5zZWF0Lm93bmVyXS5kaXNwbGF5TmFtZSxcblx0XHRcdFx0J2xvY2FsX2tpY2snXG5cdFx0XHQpXG5cdFx0XHQudGhlbihjb25maXJtID0+IHtcblx0XHRcdFx0aWYoY29uZmlybSl7XG5cdFx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2tpY2snLCBTSC5sb2NhbFVzZXIuaWQsIHNlbGYuc2VhdC5vd25lcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xuXHRcdH1cblx0fVxufVxuXG5OYW1lcGxhdGUudGV4dHVyZVNpemUgPSAyNTY7XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgKiBhcyBCYWxsb3RUeXBlIGZyb20gJy4vYmFsbG90JztcblxuZnVuY3Rpb24gdXBkYXRlVm90ZXNJblByb2dyZXNzKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcbntcblx0bGV0IGJhbGxvdCA9IHRoaXM7XG5cdGlmKCFiYWxsb3Quc2VhdC5vd25lcikgcmV0dXJuO1xuXG5cdGxldCB2aXBzID0gZ2FtZS52b3Rlc0luUHJvZ3Jlc3M7XG5cdGxldCBibGFja2xpc3RlZFZvdGVzID0gdmlwcy5maWx0ZXIoaWQgPT4ge1xuXHRcdGxldCB2cyA9IFsuLi52b3Rlc1tpZF0ueWVzVm90ZXJzLCAuLi52b3Rlc1tpZF0ubm9Wb3RlcnNdO1xuXHRcdGxldCBudiA9IHZvdGVzW2lkXS5ub25Wb3RlcnM7XG5cdFx0cmV0dXJuIG52LmluY2x1ZGVzKGJhbGxvdC5zZWF0Lm93bmVyKSB8fCB2cy5pbmNsdWRlcyhiYWxsb3Quc2VhdC5vd25lcik7XG5cdH0pO1xuXHRsZXQgbmV3Vm90ZXMgPSB2aXBzLmZpbHRlcihcblx0XHRpZCA9PiAoIVNILmdhbWUudm90ZXNJblByb2dyZXNzIHx8ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcy5pbmNsdWRlcyhpZCkpICYmICFibGFja2xpc3RlZFZvdGVzLmluY2x1ZGVzKGlkKVxuXHQpO1xuXHRsZXQgZmluaXNoZWRWb3RlcyA9ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcyA/IGJsYWNrbGlzdGVkVm90ZXNcblx0XHQ6IFNILmdhbWUudm90ZXNJblByb2dyZXNzLmZpbHRlcihpZCA9PiAhdmlwcy5pbmNsdWRlcyhpZCkpLmNvbmNhdChibGFja2xpc3RlZFZvdGVzKTtcblxuXHRuZXdWb3Rlcy5mb3JFYWNoKHZJZCA9PlxuXHR7XG5cdFx0Ly8gZ2VuZXJhdGUgbmV3IHF1ZXN0aW9uIHRvIGFza1xuXHRcdGxldCBxdWVzdGlvblRleHQsIG9wdHMgPSB7fTtcblx0XHRpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdlbGVjdCcpe1xuXHRcdFx0cXVlc3Rpb25UZXh0ID0gcGxheWVyc1tnYW1lLnByZXNpZGVudF0uZGlzcGxheU5hbWVcblx0XHRcdFx0KyAnIGZvciBwcmVzaWRlbnQgYW5kICdcblx0XHRcdFx0KyBwbGF5ZXJzW2dhbWUuY2hhbmNlbGxvcl0uZGlzcGxheU5hbWVcblx0XHRcdFx0KyAnIGZvciBjaGFuY2VsbG9yPyc7XG5cdFx0fVxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAnam9pbicpe1xuXHRcdFx0cXVlc3Rpb25UZXh0ID0gdm90ZXNbdklkXS5kYXRhICsgJ1xcbnRvIGpvaW4/Jztcblx0XHR9XG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdraWNrJyl7XG5cdFx0XHRxdWVzdGlvblRleHQgPSAnVm90ZSB0byBraWNrXFxuJ1xuXHRcdFx0XHQrIHBsYXllcnNbdm90ZXNbdklkXS50YXJnZXQxXS5kaXNwbGF5TmFtZVxuXHRcdFx0XHQrICc/Jztcblx0XHR9XG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdjb25maXJtUm9sZScpXG5cdFx0e1xuXHRcdFx0b3B0cy5jaG9pY2VzID0gQmFsbG90VHlwZS5DT05GSVJNO1xuXHRcdFx0bGV0IHJvbGU7XG5cdFx0XHRpZihiYWxsb3Quc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKXtcblx0XHRcdFx0cm9sZSA9IHBsYXllcnNbU0gubG9jYWxVc2VyLmlkXS5yb2xlO1xuXHRcdFx0XHRyb2xlID0gcm9sZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHJvbGUuc2xpY2UoMSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0cm9sZSA9ICc8UkVEQUNURUQ+Jztcblx0XHRcdH1cblx0XHRcdHF1ZXN0aW9uVGV4dCA9ICdZb3VyIHJvbGU6XFxuJyArIHJvbGU7XG5cdFx0fVxuXG5cdFx0aWYocXVlc3Rpb25UZXh0KVxuXHRcdHtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbihxdWVzdGlvblRleHQsIHZJZCwgb3B0cylcblx0XHRcdC50aGVuKGFuc3dlciA9PiB7XG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCd2b3RlJywgdklkLCBTSC5sb2NhbFVzZXIuaWQsIGFuc3dlcik7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IGNvbnNvbGUubG9nKCdWb3RlIHNjcnViYmVkOicsIHZJZCkpO1xuXHRcdH1cblx0fSk7XG5cblx0aWYoZmluaXNoZWRWb3Rlcy5pbmNsdWRlcyhiYWxsb3QuZGlzcGxheWVkKSl7XG5cdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0fVxufVxuXG5mdW5jdGlvbiB1cGRhdGVTdGF0ZSh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcbntcblx0bGV0IGJhbGxvdCA9IHRoaXM7XG5cblx0ZnVuY3Rpb24gY2hvb3NlUGxheWVyKHF1ZXN0aW9uLCBjb25maXJtUXVlc3Rpb24sIGlkKVxuXHR7XG5cdFx0ZnVuY3Rpb24gY29uZmlybVBsYXllcih1c2VySWQpXG5cdFx0e1xuXHRcdFx0bGV0IHVzZXJuYW1lID0gU0gucGxheWVyc1t1c2VySWRdLmRpc3BsYXlOYW1lO1xuXHRcdFx0bGV0IHRleHQgPSBjb25maXJtUXVlc3Rpb24ucmVwbGFjZSgne30nLCB1c2VybmFtZSk7XG5cdFx0XHRyZXR1cm4gYmFsbG90LmFza1F1ZXN0aW9uKHRleHQsICdsb2NhbF8nK2lkKydfY29uZmlybScpXG5cdFx0XHQudGhlbihjb25maXJtZWQgPT4ge1xuXHRcdFx0XHRpZihjb25maXJtZWQpe1xuXHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodXNlcklkKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gY2hvb3NlUGxheWVyKHF1ZXN0aW9uLCBjb25maXJtUXVlc3Rpb24sIGlkKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGJhbGxvdC5hc2tRdWVzdGlvbihxdWVzdGlvbiwgJ2xvY2FsXycraWQsIHtjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVH0pXG5cdFx0LnRoZW4oY29uZmlybVBsYXllcik7XG5cdH1cblxuXHRmdW5jdGlvbiBoaWRlTm9taW5hdGVQbGFjZWhvbGRlcih7ZGF0YToge2dhbWV9fSlcblx0e1xuXHRcdGlmKGdhbWUuc3RhdGUgIT09ICdub21pbmF0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2NoYW5jZWxsb3InKXtcblx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XG5cdFx0fVxuXHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVOb21pbmF0ZVBsYWNlaG9sZGVyKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGhpZGVQb2xpY3lQbGFjZWhvbGRlcih7ZGF0YToge2dhbWV9fSlcblx0e1xuXHRcdGlmKGdhbWUuc3RhdGUgIT09ICdwb2xpY3kxJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcG9saWN5MScgfHxcblx0XHRcdGdhbWUuc3RhdGUgIT09ICdwb2xpY3kyJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcG9saWN5Midcblx0XHQpe1xuXHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHR9XG5cdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZVBvbGljeVBsYWNlaG9sZGVyKTtcblx0fVxuXG5cdGlmKGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRjaG9vc2VQbGF5ZXIoJ0Nob29zZSB5b3VyXFxuY2hhbmNlbGxvciEnLCAnTmFtZSB7fVxcbmFzIGNoYW5jZWxsb3I/JywgJ25vbWluYXRlJylcblx0XHRcdC50aGVuKHVzZXJJZCA9PiB7XG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCdub21pbmF0ZScsIHVzZXJJZCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0Nob29zZSB5b3VyXFxuY2hhbmNlbGxvciEnLCAnd2FpdF9mb3JfY2hhbmNlbGxvcicsIHtcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXG5cdFx0XHRcdGZha2U6IHRydWUsXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ25vbWluYXRlJ1xuXHRcdFx0fSk7XG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlTm9taW5hdGVQbGFjZWhvbGRlcik7XG5cdFx0fVxuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTEnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGxldCBvcHRzID0ge2Nob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLCBwb2xpY3lIYW5kOiBnYW1lLmhhbmR9O1xuXHRcdGlmKFNILmxvY2FsVXNlci5pZCAhPT0gZ2FtZS5wcmVzaWRlbnQpe1xuXHRcdFx0T2JqZWN0LmFzc2lnbihvcHRzLCB7ZmFrZTogdHJ1ZSwgaXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAncG9saWN5MSd9KTtcblx0XHR9XG5cblx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0Nob29zZSBvbmVcXG50byBkaXNjYXJkIScsICdsb2NhbF9wb2xpY3kxJywgb3B0cylcblx0XHQudGhlbihkaXNjYXJkID0+IHtcblx0XHRcdFNILnNvY2tldC5lbWl0KCdkaXNjYXJkX3BvbGljeTEnLCBkaXNjYXJkKTtcblx0XHR9KTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlUG9saWN5UGxhY2Vob2xkZXIpO1xuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTInICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLmNoYW5jZWxsb3IpXG5cdHtcblx0XHRsZXQgb3B0cyA9IHtcblx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLFxuXHRcdFx0cG9saWN5SGFuZDogZ2FtZS5oYW5kLFxuXHRcdFx0aW5jbHVkZVZldG86IGdhbWUuZmFzY2lzdFBvbGljaWVzID09PSA1ICYmICFiYWxsb3QuYmxvY2tWZXRvXG5cdFx0fTtcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgIT09IGdhbWUuY2hhbmNlbGxvcil7XG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwb2xpY3kyJ30pO1xuXHRcdH1cblxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQ2hvb3NlIG9uZVxcbnRvIGRpc2NhcmQhJywgJ2xvY2FsX3BvbGljeTInLCBvcHRzKVxuXHRcdC50aGVuKGRpc2NhcmQgPT4ge1xuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2Rpc2NhcmRfcG9saWN5MicsIGRpc2NhcmQpO1xuXHRcdH0sIGVyciA9PiBjb25zb2xlLmVycm9yKGVycikpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVQb2xpY3lQbGFjZWhvbGRlcik7XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnaW52ZXN0aWdhdGUnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xuXHRcdFx0Y2hvb3NlUGxheWVyKCdFeGVjdXRpdmUgcG93ZXI6IENob29zZSBvbmUgcGxheWVyIHRvIGludmVzdGlnYXRlIScsICdJbnZlc3RpZ2F0ZSB7fT8nLCAnaW52ZXN0aWdhdGUnKVxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcblx0XHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHRcdFx0dHlwZTogJ2ludmVzdGlnYXRlJyxcblx0XHRcdFx0XHRkYXRhOiB1c2VySWRcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIG9uZSBwbGF5ZXIgdG8gaW52ZXN0aWdhdGUhJywgJ3dhaXRfZm9yX2ludmVzdGlnYXRlJywge1xuXHRcdFx0XHRjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCxcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAnaW52ZXN0aWdhdGUnXG5cdFx0XHR9KTtcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdFx0aWYoc3RhdGUgIT09ICdpbnZlc3RpZ2F0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2ludmVzdGlnYXRlJylcblx0XHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHRcdFx0fTtcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0fVxuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BlZWsnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGxldCBvcHRzID0ge2Nob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLCBwb2xpY3lIYW5kOiA4IHwgKGdhbWUuZGVjayY3KX07XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkICE9PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwZWVrJ30pO1xuXHRcdH1cblxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBUaGUgbmV4dCBwcmVzaWRlbnRcXCdzIFwicmFuZG9tXCIgcG9saWNpZXMnLCAnbG9jYWxfcGVlaycsIG9wdHMpXG5cdFx0LnRoZW4oZGlzY2FyZCA9PiB7XG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnY29udGludWUnKTtcblx0XHR9KTtcblx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XG5cdFx0XHRpZihzdGF0ZSAhPT0gJ3BlZWsnICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wZWVrJylcblx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0fTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ25hbWVTdWNjZXNzb3InICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xuXHRcdFx0Y2hvb3NlUGxheWVyKCdFeGVjdXRpdmUgcG93ZXI6IENob29zZSB0aGUgbmV4dCBwcmVzaWRlbnQhJywgJ3t9IGZvciBwcmVzaWRlbnQ/JywgJ25hbWVTdWNjZXNzb3InKVxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ25hbWVfc3VjY2Vzc29yJywgdXNlcklkKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgdGhlIG5leHQgcHJlc2lkZW50IScsICd3YWl0X2Zvcl9zdWNjZXNzb3InLCB7XG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxuXHRcdFx0XHRmYWtlOiB0cnVlLFxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICduYW1lU3VjY2Vzc29yJ1xuXHRcdFx0fSk7XG5cdFx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XG5cdFx0XHRcdGlmKHN0YXRlICE9PSAnbmFtZVN1Y2Nlc3NvcicgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX3N1Y2Nlc3NvcicpXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHRcdH07XG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHRcdH1cblx0fVxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdleGVjdXRlJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXG5cdHtcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcblx0XHRcdGNob29zZVBsYXllcignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgYSBwbGF5ZXIgdG8gZXhlY3V0ZSEnLCAnRXhlY3V0ZSB7fT8nLCAnZXhlY3V0ZScpXG5cdFx0XHQudGhlbih1c2VySWQgPT4ge1xuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnZXhlY3V0ZScsIHVzZXJJZCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIGEgcGxheWVyIHRvIGV4ZWN1dGUhJywgJ3dhaXRfZm9yX2V4ZWN1dGUnLCB7XG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxuXHRcdFx0XHRmYWtlOiB0cnVlLFxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdleGVjdXRlJ1xuXHRcdFx0fSk7XG5cdFx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XG5cdFx0XHRcdGlmKHN0YXRlICE9PSAnZXhlY3V0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2V4ZWN1dGUnKVxuXHRcdFx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0XHR9O1xuXHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHR9XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAndmV0bycgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0FwcHJvdmUgdmV0bz8nLCAnbG9jYWxfdmV0bycpLnRoZW4oYXBwcm92ZWQgPT4ge1xuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnY29uZmlybV92ZXRvJywgYXBwcm92ZWQpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdBcHByb3ZlIHZldG8/JywgJ3dhaXRfZm9yX3ZldG8nLCB7XG5cdFx0XHRcdGZha2U6IHRydWUsXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3ZldG8nXG5cdFx0XHR9KTtcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdFx0aWYoc3RhdGUgIT09ICd2ZXRvJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfdmV0bycpXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHRcdH1cblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0fVxuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3ZldG8nKXtcblx0XHRiYWxsb3QuYmxvY2tWZXRvID0gdHJ1ZTtcblx0fVxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnKXtcblx0XHRiYWxsb3QuYmxvY2tWZXRvID0gZmFsc2U7XG5cdH1cbn1cblxuZXhwb3J0IHt1cGRhdGVWb3Rlc0luUHJvZ3Jlc3MsIHVwZGF0ZVN0YXRlfTsiLCIndXNlIHN0cmljdCc7XG5cbi8qXG4qIERlY2tzIGhhdmUgMTcgY2FyZHM6IDYgbGliZXJhbCwgMTEgZmFzY2lzdC5cbiogSW4gYml0LXBhY2tlZCBib29sZWFuIGFycmF5cywgMSBpcyBsaWJlcmFsLCAwIGlzIGZhc2Npc3QuXG4qIFRoZSBtb3N0IHNpZ25pZmljYW50IGJpdCBpcyBhbHdheXMgMS5cbiogRS5nLiAwYjEwMTAwMSByZXByZXNlbnRzIGEgZGVjayB3aXRoIDIgbGliZXJhbCBhbmQgMyBmYXNjaXN0IGNhcmRzXG4qL1xuXG5sZXQgRlVMTF9ERUNLID0gMHgyMDAzZixcblx0RkFTQ0lTVCA9IDAsXG5cdExJQkVSQUwgPSAxO1xuXG5sZXQgcG9zaXRpb25zID0gW1xuXHQweDEsIDB4MiwgMHg0LCAweDgsXG5cdDB4MTAsIDB4MjAsIDB4NDAsIDB4ODAsXG5cdDB4MTAwLCAweDIwMCwgMHg0MDAsIDB4ODAwLFxuXHQweDEwMDAsIDB4MjAwMCwgMHg0MDAwLCAweDgwMDAsXG5cdDB4MTAwMDAsIDB4MjAwMDAsIDB4NDAwMDBcbl07XG5cbmZ1bmN0aW9uIGxlbmd0aChkZWNrKVxue1xuXHRyZXR1cm4gcG9zaXRpb25zLmZpbmRJbmRleChzID0+IHMgPiBkZWNrKSAtMTtcbn1cblxuZnVuY3Rpb24gc2h1ZmZsZShkZWNrKVxue1xuXHRsZXQgbCA9IGxlbmd0aChkZWNrKTtcblx0Zm9yKGxldCBpPWwtMTsgaT4wOyBpLS0pXG5cdHtcblx0XHRsZXQgbyA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGkpO1xuXHRcdGxldCBpVmFsID0gZGVjayAmIDEgPDwgaSwgb1ZhbCA9IGRlY2sgJiAxIDw8IG87XG5cdFx0bGV0IHN3YXBwZWQgPSBpVmFsID4+PiBpLW8gfCBvVmFsIDw8IGktbztcblx0XHRkZWNrID0gZGVjayAtIGlWYWwgLSBvVmFsICsgc3dhcHBlZDtcblx0fVxuXG5cdHJldHVybiBkZWNrO1xufVxuXG5mdW5jdGlvbiBkcmF3VGhyZWUoZClcbntcblx0cmV0dXJuIGQgPCA4ID8gWzEsIGRdIDogW2QgPj4+IDMsIDggfCBkICYgN107XG59XG5cbmZ1bmN0aW9uIGRpc2NhcmRPbmUoZGVjaywgcG9zKVxue1xuXHRsZXQgYm90dG9tSGFsZiA9IGRlY2sgJiAoMSA8PCBwb3MpLTE7XG5cdGxldCB0b3BIYWxmID0gZGVjayAmIH4oKDEgPDwgcG9zKzEpLTEpO1xuXHR0b3BIYWxmID4+Pj0gMTtcblx0bGV0IG5ld0RlY2sgPSB0b3BIYWxmIHwgYm90dG9tSGFsZjtcblx0XG5cdGxldCB2YWwgPSAoZGVjayAmIDE8PHBvcykgPj4+IHBvcztcblxuXHRyZXR1cm4gW25ld0RlY2ssIHZhbF07XG59XG5cbmZ1bmN0aW9uIGFwcGVuZChkZWNrLCB2YWwpXG57XG5cdHJldHVybiBkZWNrIDw8IDEgfCB2YWw7XG59XG5cbmZ1bmN0aW9uIHRvQXJyYXkoZGVjaylcbntcblx0bGV0IGFyciA9IFtdO1xuXHR3aGlsZShkZWNrID4gMSl7XG5cdFx0YXJyLnB1c2goZGVjayAmIDEpO1xuXHRcdGRlY2sgPj4+PSAxO1xuXHR9XG5cblx0cmV0dXJuIGFycjtcbn1cblxuZXhwb3J0IHtsZW5ndGgsIHNodWZmbGUsIGRyYXdUaHJlZSwgZGlzY2FyZE9uZSwgYXBwZW5kLCB0b0FycmF5LCBGVUxMX0RFQ0ssIExJQkVSQUwsIEZBU0NJU1R9OyIsIid1c2Ugc3RyaWN0OydcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCB7IEJsYW5rQ2FyZCwgSmFDYXJkLCBOZWluQ2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxQb2xpY3lDYXJkLCBWZXRvQ2FyZCB9IGZyb20gJy4vY2FyZCc7XG5pbXBvcnQgeyBnZW5lcmF0ZVF1ZXN0aW9uLCBsYXRlVXBkYXRlIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyBCUCBmcm9tICcuL2JhbGxvdHByb2Nlc3Nvcic7XG5pbXBvcnQgKiBhcyBCUEJBIGZyb20gJy4vYnBiYSc7XG5pbXBvcnQge05UZXh0LCBQbGFjZWhvbGRlck1lc2h9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XG5cbmxldCBQTEFZRVJTRUxFQ1QgPSAwO1xubGV0IENPTkZJUk0gPSAxO1xubGV0IEJJTkFSWSA9IDI7XG5sZXQgUE9MSUNZID0gMztcblxuY2xhc3MgQmFsbG90IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC4zLCAwLjI1KTtcblx0XHR0aGlzLnJvdGF0aW9uLnNldCguNSwgTWF0aC5QSSwgMCk7XG5cdFx0c2VhdC5hZGQodGhpcyk7XG5cblx0XHR0aGlzLmxhc3RRdWV1ZWQgPSBQcm9taXNlLnJlc29sdmUoKTtcblx0XHR0aGlzLmRpc3BsYXllZCA9IG51bGw7XG5cdFx0dGhpcy5ibG9ja1ZldG8gPSBmYWxzZTtcblxuXHRcdHRoaXMuX3llc0NsaWNrSGFuZGxlciA9IG51bGw7XG5cdFx0dGhpcy5fbm9DbGlja0hhbmRsZXIgPSBudWxsO1xuXHRcdHRoaXMuX25vbWluYXRlSGFuZGxlciA9IG51bGw7XG5cdFx0dGhpcy5fY2FuY2VsSGFuZGxlciA9IG51bGw7XG5cblx0XHR0aGlzLmphQ2FyZCA9IG5ldyBKYUNhcmQoKTtcblx0XHR0aGlzLm5laW5DYXJkID0gbmV3IE5laW5DYXJkKCk7XG5cdFx0W3RoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkXS5mb3JFYWNoKGMgPT4ge1xuXHRcdFx0Yy5wb3NpdGlvbi5zZXQoYyBpbnN0YW5jZW9mIEphQ2FyZCA/IC0wLjEgOiAwLjEsIC0wLjEsIDApO1xuXHRcdFx0Yy5zY2FsZS5zZXRTY2FsYXIoMC4xNSk7XG5cdFx0XHRjLnZpc2libGUgPSBmYWxzZTtcblx0XHR9KTtcblx0XHR0aGlzLmFkZCh0aGlzLmphQ2FyZCwgdGhpcy5uZWluQ2FyZCk7XG5cdFx0dGhpcy5wb2xpY2llcyA9IFtdO1xuXG5cdFx0Ly9sZXQgZ2VvID0gbmV3IFRIUkVFLlBsYW5lQnVmZmVyR2VvbWV0cnkoMC40LCAwLjIpO1xuXHRcdC8vbGV0IG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7dHJhbnNwYXJlbnQ6IHRydWUsIHNpZGU6IFRIUkVFLkRvdWJsZVNpZGV9KTtcblx0XHR0aGlzLnF1ZXN0aW9uID0gUGxhY2Vob2xkZXJNZXNoLmNsb25lKCk7XG5cdFx0dGhpcy5xdWVzdGlvbi5wb3NpdGlvbi5zZXQoMCwgMC4wNSwgMCk7XG5cdFx0dGhpcy5xdWVzdGlvbi5zY2FsZS5zZXRTY2FsYXIoLjUpO1xuXHRcdHRoaXMucXVlc3Rpb24udmlzaWJsZSA9IGZhbHNlO1xuXHRcdHRoaXMuYWRkKHRoaXMucXVlc3Rpb24pO1xuXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50ID0gbmV3IE5UZXh0KHRoaXMucXVlc3Rpb24pO1xuXHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe3dpZHRoOiAxLjEsIGhlaWdodDogLjQsIGZvbnRTaXplOiAxLCB2ZXJ0aWNhbEFsaWduOiAndG9wJ30pO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3ZvdGVzSW5Qcm9ncmVzcycsIEJQLnVwZGF0ZVZvdGVzSW5Qcm9ncmVzcy5iaW5kKHRoaXMpKTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBsYXRlVXBkYXRlKEJQLnVwZGF0ZVN0YXRlLmJpbmQodGhpcykpKTtcblx0fVxuXG5cdGFza1F1ZXN0aW9uKHFUZXh0LCBpZCwge2Nob2ljZXMgPSBCSU5BUlksIHBvbGljeUhhbmQgPSAweDEsIGluY2x1ZGVWZXRvID0gZmFsc2UsIGZha2UgPSBmYWxzZSwgaXNJbnZhbGlkID0gKCkgPT4gdHJ1ZX0gPSB7fSlcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblxuXHRcdGZ1bmN0aW9uIGlzVm90ZVZhbGlkKClcblx0XHR7XG5cdFx0XHRsZXQgaXNGYWtlVmFsaWQgPSBmYWtlICYmICFpc0ludmFsaWQoKTtcblx0XHRcdGxldCBpc0xvY2FsVm90ZSA9IC9ebG9jYWwvLnRlc3QoaWQpO1xuXHRcdFx0bGV0IGlzRmlyc3RVcGRhdGUgPSAhU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3M7XG5cdFx0XHRsZXQgdm90ZSA9IFNILnZvdGVzW2lkXTtcblx0XHRcdGxldCB2b3RlcnMgPSB2b3RlID8gWy4uLnZvdGUueWVzVm90ZXJzLCAuLi52b3RlLm5vVm90ZXJzXSA6IFtdO1xuXHRcdFx0bGV0IGFscmVhZHlWb3RlZCA9IHZvdGVycy5pbmNsdWRlcyhzZWxmLnNlYXQub3duZXIpO1xuXHRcdFx0cmV0dXJuIGlzTG9jYWxWb3RlIHx8IGlzRmlyc3RVcGRhdGUgfHwgaXNGYWtlVmFsaWQgfHwgdm90ZSAmJiAhYWxyZWFkeVZvdGVkO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGhvb2tVcFF1ZXN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UocXVlc3Rpb25FeGVjdXRvcik7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcXVlc3Rpb25FeGVjdXRvcihyZXNvbHZlLCByZWplY3QpXG5cdFx0e1xuXHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBhbnN3ZXIgaXMgc3RpbGwgcmVsZXZhbnRcblx0XHRcdGlmKCFpc1ZvdGVWYWxpZCgpKXtcblx0XHRcdFx0cmV0dXJuIHJlamVjdCgnVm90ZSBubyBsb25nZXIgdmFsaWQnKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc2hvdyB0aGUgYmFsbG90XG5cdFx0XHQvL3NlbGYucXVlc3Rpb24ubWF0ZXJpYWwubWFwID0gZ2VuZXJhdGVRdWVzdGlvbihxVGV4dCwgc2VsZi5xdWVzdGlvbi5tYXRlcmlhbC5tYXApO1xuXHRcdFx0c2VsZi50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDogYCR7cVRleHR9YH0pO1xuXHRcdFx0c2VsZi5xdWVzdGlvbi52aXNpYmxlID0gdHJ1ZTtcblxuXHRcdFx0Ly8gaG9vayB1cCBxL2EgY2FyZHNcblx0XHRcdGlmKGNob2ljZXMgPT09IENPTkZJUk0gfHwgY2hvaWNlcyA9PT0gQklOQVJZKXtcblx0XHRcdFx0c2VsZi5qYUNhcmQudmlzaWJsZSA9IHRydWU7XG5cdFx0XHRcdGlmKCFmYWtlKVxuXHRcdFx0XHRcdHNlbGYuamFDYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCgneWVzJywgcmVzb2x2ZSwgcmVqZWN0KSk7XG5cdFx0XHR9XG5cdFx0XHRpZihjaG9pY2VzID09PSBCSU5BUlkpe1xuXHRcdFx0XHRzZWxmLm5laW5DYXJkLnZpc2libGUgPSB0cnVlO1xuXHRcdFx0XHRpZighZmFrZSlcblx0XHRcdFx0XHRzZWxmLm5laW5DYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCgnbm8nLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUExBWUVSU0VMRUNUICYmICFmYWtlKXtcblx0XHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigncGxheWVyU2VsZWN0JywgcmVzcG9uZCgncGxheWVyJywgcmVzb2x2ZSwgcmVqZWN0KSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKGNob2ljZXMgPT09IFBPTElDWSl7XG5cdFx0XHRcdGxldCBjYXJkcyA9IEJQQkEudG9BcnJheShwb2xpY3lIYW5kKTtcblx0XHRcdFx0aWYoaW5jbHVkZVZldG8pIGNhcmRzLnB1c2goLTEpO1xuXHRcdFx0XHRjYXJkcy5mb3JFYWNoKCh2YWwsIGksIGFycikgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxldCBjYXJkID0gbnVsbDtcblx0XHRcdFx0XHRpZihmYWtlKVxuXHRcdFx0XHRcdFx0Y2FyZCA9IG5ldyBCbGFua0NhcmQoKTtcblx0XHRcdFx0XHRlbHNlIGlmKHZhbCA9PT0gLTEpXG5cdFx0XHRcdFx0XHRjYXJkID0gbmV3IFZldG9DYXJkKCk7XG5cdFx0XHRcdFx0ZWxzZSBpZih2YWwgPT09IEJQQkEuTElCRVJBTClcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgTGliZXJhbFBvbGljeUNhcmQoKTtcblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRjYXJkID0gbmV3IEZhc2Npc3RQb2xpY3lDYXJkKCk7XG5cblx0XHRcdFx0XHRjYXJkLnNjYWxlLnNldFNjYWxhcigwLjE1KTtcblxuXHRcdFx0XHRcdGxldCB3aWR0aCA9IC4xNSAqIGFyci5sZW5ndGg7XG5cdFx0XHRcdFx0bGV0IHggPSAtd2lkdGgvMiArIC4xNSppICsgLjA3NTtcblx0XHRcdFx0XHRjYXJkLnBvc2l0aW9uLnNldCh4LCAtMC4wNywgMCk7XG5cdFx0XHRcdFx0c2VsZi5hZGQoY2FyZCk7XG5cdFx0XHRcdFx0c2VsZi5wb2xpY2llcy5wdXNoKGNhcmQpO1xuXG5cdFx0XHRcdFx0aWYoIWZha2UpXG5cdFx0XHRcdFx0XHRjYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCh2YWwgPT09IC0xID8gLTEgOiBpLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuYWRkRXZlbnRMaXN0ZW5lcignY2FuY2VsVm90ZScsIHJlc3BvbmQoJ2NhbmNlbCcsIHJlc29sdmUsIHJlamVjdCkpO1xuXG5cdFx0XHRzZWxmLmRpc3BsYXllZCA9IGlkO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlc3BvbmQoYW5zd2VyLCByZXNvbHZlLCByZWplY3QpXG5cdFx0e1xuXHRcdFx0ZnVuY3Rpb24gaGFuZGxlcihldnQpXG5cdFx0XHR7XG5cdFx0XHRcdC8vIG1ha2Ugc3VyZSBvbmx5IHRoZSBvd25lciBvZiB0aGUgYmFsbG90IGlzIGFuc3dlcmluZ1xuXHRcdFx0XHRpZihhbnN3ZXIgIT09ICdjYW5jZWwnICYmIHNlbGYuc2VhdC5vd25lciAhPT0gU0gubG9jYWxVc2VyLmlkKSByZXR1cm47XG5cblx0XHRcdFx0Ly8gY2xlYW4gdXBcblx0XHRcdFx0c2VsZi5qYUNhcmQudmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0XHRzZWxmLm5laW5DYXJkLnZpc2libGUgPSBmYWxzZTtcblx0XHRcdFx0c2VsZi5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2U7XG5cdFx0XHRcdHNlbGYuZGlzcGxheWVkID0gbnVsbDtcblx0XHRcdFx0c2VsZi5yZW1vdmUoLi4uc2VsZi5wb2xpY2llcyk7XG5cdFx0XHRcdHNlbGYucG9saWNpZXMgPSBbXTtcblxuXHRcdFx0XHRzZWxmLmphQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX3llc0NsaWNrSGFuZGxlcik7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCBzZWxmLl9ub0NsaWNrSGFuZGxlcik7XG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BsYXllclNlbGVjdCcsIHNlbGYuX25vbWluYXRlSGFuZGxlcik7XG5cdFx0XHRcdHNlbGYucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FuY2VsVm90ZScsIHNlbGYuX2NhbmNlbEhhbmRsZXIpO1xuXG5cdFx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgYW5zd2VyIHN0aWxsIG1hdHRlcnNcblx0XHRcdFx0aWYoIWlzVm90ZVZhbGlkKCkgfHwgYW5zd2VyID09PSAnY2FuY2VsJyl7XG5cdFx0XHRcdFx0cmVqZWN0KCd2b3RlIGNhbmNlbGxlZCcpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAneWVzJylcblx0XHRcdFx0XHRyZXNvbHZlKHRydWUpO1xuXHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ25vJylcblx0XHRcdFx0XHRyZXNvbHZlKGZhbHNlKTtcblx0XHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdwbGF5ZXInKVxuXHRcdFx0XHRcdHJlc29sdmUoZXZ0LmRhdGEpO1xuXHRcdFx0XHRlbHNlIGlmKGNob2ljZXMgPT09IFBPTElDWSlcblx0XHRcdFx0XHRyZXNvbHZlKGFuc3dlcik7XG5cdFx0XHR9XG5cblx0XHRcdGlmKGFuc3dlciA9PT0gJ3llcycpXG5cdFx0XHRcdHNlbGYuX3llc0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ25vJylcblx0XHRcdFx0c2VsZi5fbm9DbGlja0hhbmRsZXIgPSBoYW5kbGVyO1xuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdwbGF5ZXInKVxuXHRcdFx0XHRzZWxmLl9ub21pbmF0ZUhhbmRsZXIgPSBoYW5kbGVyO1xuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdjYW5jZWwnKVxuXHRcdFx0XHRzZWxmLl9jYW5jZWxIYW5kbGVyID0gaGFuZGxlcjtcblxuXHRcdFx0cmV0dXJuIGhhbmRsZXI7XG5cdFx0fVxuXG5cdFx0c2VsZi5sYXN0UXVldWVkID0gc2VsZi5sYXN0UXVldWVkLnRoZW4oaG9va1VwUXVlc3Rpb24sIGhvb2tVcFF1ZXN0aW9uKTtcblxuXHRcdHJldHVybiBzZWxmLmxhc3RRdWV1ZWQ7XG5cdH1cbn1cblxuZXhwb3J0IHtCYWxsb3QsIFBMQVlFUlNFTEVDVCwgQ09ORklSTSwgQklOQVJZLCBQT0xJQ1l9OyIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCB7RmFzY2lzdFJvbGVDYXJkLCBIaXRsZXJSb2xlQ2FyZCwgTGliZXJhbFJvbGVDYXJkLCBGYXNjaXN0UGFydHlDYXJkLCBMaWJlcmFsUGFydHlDYXJkLCBKYUNhcmQsIE5laW5DYXJkfSBmcm9tICcuL2NhcmQnO1xuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7TkJpbGxib2FyZH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxheWVySW5mbyBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXQpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XG5cdFx0dGhpcy5jYXJkID0gbnVsbDtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLCAwLjMpO1xuXHRcdHRoaXMuc2NhbGUuc2V0U2NhbGFyKDAuMyk7XG5cdFx0c2VhdC5hZGQodGhpcyk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBsYXRlVXBkYXRlKHRoaXMudXBkYXRlU3RhdGUuYmluZCh0aGlzKSkpO1xuXHRcdC8vU0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlVHVybk9yZGVyLmJpbmQodGhpcykpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignaW52ZXN0aWdhdGUnLCB0aGlzLnByZXNlbnRQYXJ0eS5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZVR1cm5PcmRlcih7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcblx0e1xuXHRcdFNILl91c2VyUHJvbWlzZS50aGVuKCgpID0+IHtcblx0XHRcdGxldCBsb2NhbFBsYXllciA9IHBsYXllcnNbU0gubG9jYWxVc2VyLmlkXTtcblx0XHRcdGlmKGxvY2FsUGxheWVyKXtcblx0XHRcdFx0bGV0IHBsYXllclBvcyA9IHRoaXMud29ybGRUb0xvY2FsKFNILnNlYXRzW2xvY2FsUGxheWVyLnNlYXROdW1dLmdldFdvcmxkUG9zaXRpb24oKSk7XG5cdFx0XHRcdHRoaXMubG9va0F0KHBsYXllclBvcyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHR1cGRhdGVTdGF0ZSh7ZGF0YToge2dhbWUsIHBsYXllcnMsIHZvdGVzfX0pXG5cdHtcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0aWYoKGdhbWUuc3RhdGUgPT09ICduaWdodCcgfHwgZ2FtZS5zdGF0ZSA9PT0gJ2RvbmUnKSAmJiBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0pXG5cdFx0XHR0aGlzLnByZXNlbnRSb2xlKGdhbWUsIHBsYXllcnMsIHZvdGVzKTtcblxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJylcblx0XHRcdHRoaXMucHJlc2VudFZvdGUoZ2FtZSwgcGxheWVycywgdm90ZXMpO1xuXG5cdFx0ZWxzZSBpZih0aGlzLmNhcmQgIT09IG51bGwpXG5cdFx0e1xuXHRcdFx0dGhpcy5yZW1vdmUodGhpcy5jYXJkKTtcblx0XHRcdHRoaXMuY2FyZCA9IG51bGw7XG5cdFx0fVxuXHR9XG5cblx0cHJlc2VudFJvbGUoZ2FtZSwgcGxheWVycylcblx0e1xuXHRcdGxldCBsb2NhbFBsYXllciA9IHBsYXllcnNbU0gubG9jYWxVc2VyLmlkXTtcblx0XHRsZXQgc2VhdGVkUGxheWVyID0gcGxheWVyc1t0aGlzLnNlYXQub3duZXJdO1xuXG5cdFx0bGV0IHNlYXRlZFJvbGVTaG91bGRCZVZpc2libGUgPVxuXHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ2RvbmUnIHx8XG5cdFx0XHRTSC5sb2NhbFVzZXIuaWQgPT09IHRoaXMuc2VhdC5vd25lciB8fFxuXHRcdFx0bG9jYWxQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnICYmIChzZWF0ZWRQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnIHx8IHNlYXRlZFBsYXllci5yb2xlID09PSAnaGl0bGVyJykgfHxcblx0XHRcdGxvY2FsUGxheWVyLnJvbGUgPT09ICdoaXRsZXInICYmIHNlYXRlZFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgJiYgZ2FtZS50dXJuT3JkZXIubGVuZ3RoIDwgNztcblxuXHRcdGlmKHNlYXRlZFJvbGVTaG91bGRCZVZpc2libGUpXG5cdFx0e1xuXHRcdFx0c3dpdGNoKHNlYXRlZFBsYXllci5yb2xlKXtcblx0XHRcdFx0Y2FzZSAnZmFzY2lzdCc6IHRoaXMuY2FyZCA9IG5ldyBGYXNjaXN0Um9sZUNhcmQoKTsgYnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2hpdGxlcicgOiB0aGlzLmNhcmQgPSBuZXcgSGl0bGVyUm9sZUNhcmQoKTsgIGJyZWFrO1xuXHRcdFx0XHRjYXNlICdsaWJlcmFsJzogdGhpcy5jYXJkID0gbmV3IExpYmVyYWxSb2xlQ2FyZCgpOyBicmVhaztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5hZGQodGhpcy5jYXJkKTtcblx0XHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuY2FyZCk7XG5cdFx0fVxuXHR9XG5cblx0cHJlc2VudFZvdGUoZ2FtZSwgXywgdm90ZXMpXG5cdHtcblx0XHRsZXQgdm90ZSA9IHZvdGVzW2dhbWUubGFzdEVsZWN0aW9uXTtcblxuXHRcdGxldCBwbGF5ZXJWb3RlID0gdm90ZS55ZXNWb3RlcnMuaW5jbHVkZXModGhpcy5zZWF0Lm93bmVyKTtcblx0XHR0aGlzLmNhcmQgPSBwbGF5ZXJWb3RlID8gbmV3IEphQ2FyZCgpIDogbmV3IE5laW5DYXJkKCk7XG5cblx0XHR0aGlzLmFkZCh0aGlzLmNhcmQpO1xuXHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuY2FyZCk7XG5cdH1cblxuXHRwcmVzZW50UGFydHkoe2RhdGE6IHVzZXJJZH0pXG5cdHtcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyIHx8IHRoaXMuc2VhdC5vd25lciAhPT0gdXNlcklkKSByZXR1cm47XG5cblx0XHRsZXQgcm9sZSA9IFNILnBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXS5yb2xlO1xuXHRcdHRoaXMuY2FyZCA9ICByb2xlID09PSAnbGliZXJhbCcgPyBuZXcgTGliZXJhbFBhcnR5Q2FyZCgpIDogbmV3IEZhc2Npc3RQYXJ0eUNhcmQoKTtcblxuXHRcdHRoaXMuYWRkKHRoaXMuY2FyZCk7XG5cdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2Fwc3VsZUdlb21ldHJ5IGV4dGVuZHMgVEhSRUUuQnVmZmVyR2VvbWV0cnlcbntcblx0Y29uc3RydWN0b3IocmFkaXVzLCBoZWlnaHQsIHNlZ21lbnRzID0gMTIsIHJpbmdzID0gOClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHRsZXQgbnVtVmVydHMgPSAyICogcmluZ3MgKiBzZWdtZW50cyArIDI7XG5cdFx0bGV0IG51bUZhY2VzID0gNCAqIHJpbmdzICogc2VnbWVudHM7XG5cdFx0bGV0IHRoZXRhID0gMipNYXRoLlBJL3NlZ21lbnRzO1xuXHRcdGxldCBwaGkgPSBNYXRoLlBJLygyKnJpbmdzKTtcblxuXHRcdGxldCB2ZXJ0cyA9IG5ldyBGbG9hdDMyQXJyYXkoMypudW1WZXJ0cyk7XG5cdFx0bGV0IGZhY2VzID0gbmV3IFVpbnQxNkFycmF5KDMqbnVtRmFjZXMpO1xuXHRcdGxldCB2aSA9IDAsIGZpID0gMCwgdG9wQ2FwID0gMCwgYm90Q2FwID0gMTtcblxuXHRcdHZlcnRzLnNldChbMCwgaGVpZ2h0LzIsIDBdLCAzKnZpKyspO1xuXHRcdHZlcnRzLnNldChbMCwgLWhlaWdodC8yLCAwXSwgMyp2aSsrKTtcblxuXHRcdGZvciggbGV0IHM9MDsgczxzZWdtZW50czsgcysrIClcblx0XHR7XG5cdFx0XHRmb3IoIGxldCByPTE7IHI8PXJpbmdzOyByKyspXG5cdFx0XHR7XG5cdFx0XHRcdGxldCByYWRpYWwgPSByYWRpdXMgKiBNYXRoLnNpbihyKnBoaSk7XG5cblx0XHRcdFx0Ly8gY3JlYXRlIHZlcnRzXG5cdFx0XHRcdHZlcnRzLnNldChbXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5jb3Mocyp0aGV0YSksXG5cdFx0XHRcdFx0aGVpZ2h0LzIgLSByYWRpdXMqKDEtTWF0aC5jb3MocipwaGkpKSxcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLnNpbihzKnRoZXRhKVxuXHRcdFx0XHRdLCAzKnZpKyspO1xuXG5cdFx0XHRcdHZlcnRzLnNldChbXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5jb3Mocyp0aGV0YSksXG5cdFx0XHRcdFx0LWhlaWdodC8yICsgcmFkaXVzKigxLU1hdGguY29zKHIqcGhpKSksXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5zaW4ocyp0aGV0YSlcblx0XHRcdFx0XSwgMyp2aSsrKTtcblxuXHRcdFx0XHRsZXQgdG9wX3MxcjEgPSB2aS0yLCB0b3BfczFyMCA9IHZpLTQ7XG5cdFx0XHRcdGxldCBib3RfczFyMSA9IHZpLTEsIGJvdF9zMXIwID0gdmktMztcblx0XHRcdFx0bGV0IHRvcF9zMHIxID0gdG9wX3MxcjEgLSAyKnJpbmdzLCB0b3BfczByMCA9IHRvcF9zMXIwIC0gMipyaW5ncztcblx0XHRcdFx0bGV0IGJvdF9zMHIxID0gYm90X3MxcjEgLSAyKnJpbmdzLCBib3RfczByMCA9IGJvdF9zMXIwIC0gMipyaW5ncztcblx0XHRcdFx0aWYocyA9PT0gMCl7XG5cdFx0XHRcdFx0dG9wX3MwcjEgKz0gbnVtVmVydHMtMjtcblx0XHRcdFx0XHR0b3BfczByMCArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHRcdGJvdF9zMHIxICs9IG51bVZlcnRzLTI7XG5cdFx0XHRcdFx0Ym90X3MwcjAgKz0gbnVtVmVydHMtMjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIGNyZWF0ZSBmYWNlc1xuXHRcdFx0XHRpZihyID09PSAxKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFt0b3BDYXAsIHRvcF9zMXIxLCB0b3BfczByMV0sIDMqZmkrKyk7XG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFtib3RDYXAsIGJvdF9zMHIxLCBib3RfczFyMV0sIDMqZmkrKyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFt0b3BfczFyMCwgdG9wX3MxcjEsIHRvcF9zMHIwXSwgMypmaSsrKTtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcF9zMHIwLCB0b3BfczFyMSwgdG9wX3MwcjFdLCAzKmZpKyspO1xuXG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFtib3RfczByMSwgYm90X3MxcjEsIGJvdF9zMHIwXSwgMypmaSsrKTtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdF9zMHIwLCBib3RfczFyMSwgYm90X3MxcjBdLCAzKmZpKyspO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIGNyZWF0ZSBsb25nIHNpZGVzXG5cdFx0XHRsZXQgdG9wX3MxID0gdmktMiwgdG9wX3MwID0gdG9wX3MxIC0gMipyaW5ncztcblx0XHRcdGxldCBib3RfczEgPSB2aS0xLCBib3RfczAgPSBib3RfczEgLSAyKnJpbmdzO1xuXHRcdFx0aWYocyA9PT0gMCl7XG5cdFx0XHRcdHRvcF9zMCArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHRib3RfczAgKz0gbnVtVmVydHMtMjtcblx0XHRcdH1cblxuXHRcdFx0ZmFjZXMuc2V0KFt0b3BfczAsIHRvcF9zMSwgYm90X3MxXSwgMypmaSsrKTtcblx0XHRcdGZhY2VzLnNldChbYm90X3MwLCB0b3BfczAsIGJvdF9zMV0sIDMqZmkrKyk7XG5cdFx0fVxuXG5cdFx0dGhpcy5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSh2ZXJ0cywgMykpO1xuXHRcdHRoaXMuc2V0SW5kZXgobmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShmYWNlcywgMSkpO1xuXHR9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IENhcHN1bGVHZW9tZXRyeSBmcm9tICcuL2NhcHN1bGVnZW9tZXRyeSc7XG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xuXG5sZXQgaGl0Ym94R2VvID0gbmV3IENhcHN1bGVHZW9tZXRyeSgwLjMsIDEuOCk7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhpdGJveCBleHRlbmRzIFRIUkVFLk1lc2hcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKGhpdGJveEdlbywgbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcblx0XHRcdHRyYW5zcGFyZW50OiB0cnVlLFxuXHRcdFx0b3BhY2l0eTogMCxcblx0XHRcdHNpZGU6IFRIUkVFLkJhY2tTaWRlXG5cdFx0fSkpO1xuXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLTAuNSwgMCk7XG5cdFx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHRzZWF0LmFkZCh0aGlzKTtcblxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29yZW50ZXInLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwLjEpO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ybGVhdmUnLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwKTtcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgKCkgPT4ge1xuXHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHRcdHR5cGU6ICdwbGF5ZXJTZWxlY3QnLFxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdFx0ZGF0YTogdGhpcy5zZWF0Lm93bmVyXG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUodGhpcy51cGRhdGVWaXNpYmlsaXR5LmJpbmQodGhpcykpKTtcblx0fVxuXG5cdHVwZGF0ZVZpc2liaWxpdHkoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXG5cdHtcblx0XHRsZXQgbGl2aW5nUGxheWVycyA9IGdhbWUudHVybk9yZGVyLmZpbHRlcihwID0+IHBsYXllcnNbcF0uc3RhdGUgIT09ICdkZWFkJyk7XG5cdFx0bGV0IHByZWNvbmRpdGlvbnMgPVxuXHRcdFx0U0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCAmJlxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSAnJyAmJlxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQgJiZcblx0XHRcdGxpdmluZ1BsYXllcnMuaW5jbHVkZXModGhpcy5zZWF0Lm93bmVyKTtcblxuXHRcdGxldCBub21pbmF0ZWFibGUgPVxuXHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJlxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBnYW1lLmxhc3RDaGFuY2VsbG9yICYmXG5cdFx0XHQobGl2aW5nUGxheWVycy5sZW5ndGggPD0gNSB8fCB0aGlzLnNlYXQub3duZXIgIT09IGdhbWUubGFzdFByZXNpZGVudCk7XG5cblx0XHRsZXQgaW52ZXN0aWdhdGVhYmxlID1cblx0XHRcdGdhbWUuc3RhdGUgPT09ICdpbnZlc3RpZ2F0ZScgJiZcblx0XHRcdHBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXS5zdGF0ZSA9PT0gJ25vcm1hbCc7XG5cdFx0XG5cdFx0bGV0IHN1Y2NlZWRhYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ25hbWVTdWNjZXNzb3InO1xuXHRcdGxldCBleGVjdXRhYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ2V4ZWN1dGUnO1xuXG5cdFx0dGhpcy52aXNpYmxlID0gcHJlY29uZGl0aW9ucyAmJiAobm9taW5hdGVhYmxlIHx8IGludmVzdGlnYXRlYWJsZSB8fCBzdWNjZWVkYWJsZSB8fCBleGVjdXRhYmxlKTtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XG5pbXBvcnQge0JhbGxvdH0gZnJvbSAnLi9iYWxsb3QnO1xuaW1wb3J0IFBsYXllckluZm8gZnJvbSAnLi9wbGF5ZXJpbmZvJztcbmltcG9ydCBIaXRib3ggZnJvbSAnLi9oaXRib3gnO1xuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2VhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXROdW0pXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zZWF0TnVtID0gc2VhdE51bTtcblx0XHR0aGlzLm93bmVyID0gJyc7XG5cblx0XHQvLyBwb3NpdGlvbiBzZWF0XG5cdFx0bGV0IHgsIHk9MC42NSwgejtcblx0XHRzd2l0Y2goc2VhdE51bSl7XG5cdFx0Y2FzZSAwOiBjYXNlIDE6IGNhc2UgMjpcblx0XHRcdHggPSAtMC44MzMgKyAwLjgzMypzZWF0TnVtO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoeCwgeSwgLTEuMDUpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAzOiBjYXNlIDQ6XG5cdFx0XHR6ID0gLTAuNDM3ICsgMC44NzQqKHNlYXROdW0tMyk7XG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgxLjQyNSwgeSwgeik7XG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtTWF0aC5QSS8yLCAwKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XG5cdFx0XHR4ID0gMC44MzMgLSAwLjgzMyooc2VhdE51bS01KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIDEuMDUpO1xuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEksIDApO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSA4OiBjYXNlIDk6XG5cdFx0XHR6ID0gMC40MzcgLSAwLjg3NCooc2VhdE51bS04KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KC0xLjQyNSwgeSwgeik7XG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtMS41Kk1hdGguUEksIDApO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2NoZWNrZWRfaW4nLCAoe2RhdGE6IGlkfSkgPT4ge1xuXHRcdFx0aWYodGhpcy5vd25lciA9PT0gaWQpXG5cdFx0XHRcdHRoaXMudXBkYXRlT3duZXJzaGlwKHtkYXRhOiB7Z2FtZTogU0guZ2FtZSwgcGxheWVyczogU0gucGxheWVyc319KTtcblx0XHR9KTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSkgPT4ge1xuXHRcdFx0aWYodGhpcy5vd25lciAmJiBwbGF5ZXJzW3RoaXMub3duZXJdLnN0YXRlID09PSAnZGVhZCcpe1xuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXQoMHgzZDI3ODkpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5uYW1lcGxhdGUgPSBuZXcgTmFtZXBsYXRlKHRoaXMpO1xuXHRcdHRoaXMuYmFsbG90ID0gbmV3IEJhbGxvdCh0aGlzKTtcblx0XHR0aGlzLnBsYXllckluZm8gPSBuZXcgUGxheWVySW5mbyh0aGlzKTtcblx0XHR0aGlzLmhpdGJveCA9IG5ldyBIaXRib3godGhpcyk7XG5cdH1cblxuXHR1cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXG5cdHtcblx0XHRsZXQgaWRzID0gZ2FtZS50dXJuT3JkZXIgfHwgW107XG5cblx0XHQvLyByZWdpc3RlciB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSBjbGFpbWVkXG5cdFx0aWYoICF0aGlzLm93bmVyIClcblx0XHR7XG5cdFx0XHQvLyBjaGVjayBpZiBhIHBsYXllciBoYXMgam9pbmVkIGF0IHRoaXMgc2VhdFxuXHRcdFx0Zm9yKGxldCBpIGluIGlkcyl7XG5cdFx0XHRcdGlmKHBsYXllcnNbaWRzW2ldXS5zZWF0TnVtID09IHRoaXMuc2VhdE51bSl7XG5cdFx0XHRcdFx0dGhpcy5vd25lciA9IGlkc1tpXTtcblx0XHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KHBsYXllcnNbaWRzW2ldXS5kaXNwbGF5TmFtZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyByZXNldCB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSB2YWNhdGVkXG5cdFx0aWYoICFpZHMuaW5jbHVkZXModGhpcy5vd25lcikgKVxuXHRcdHtcblx0XHRcdHRoaXMub3duZXIgPSAnJztcblx0XHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KCc8Sm9pbj4nKTtcblx0XHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ZmZmZmZmKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyB1cGRhdGUgZGlzY29ubmVjdCBjb2xvcnNcblx0XHRlbHNlIGlmKCAhcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcblx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweDgwODA4MCk7XG5cdFx0fVxuXHRcdGVsc2UgaWYoIHBsYXllcnNbdGhpcy5vd25lcl0uY29ubmVjdGVkICl7XG5cdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXRIZXgoMHhmZmZmZmYpO1xuXHRcdH1cblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5CaWxsYm9hcmQsIE5UZXh0fSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29udGludWVCb3ggZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcihwYXJlbnQpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuaWNvbiA9IG5ldyBUSFJFRS5NZXNoKFxuXHRcdFx0bmV3IFRIUkVFLkJveEJ1ZmZlckdlb21ldHJ5KC4xNSwgLjE1LCAuMTUpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHgxMGEwMTB9KVxuXHRcdCk7XG5cdFx0QW5pbWF0ZS5zcGluKHRoaXMuaWNvbik7XG5cdFx0dGhpcy5hZGQodGhpcy5pY29uKTtcblxuXHRcdHRoaXMudGV4dCA9IFBsYWNlaG9sZGVyTWVzaC5jbG9uZSgpO1xuXHRcdHRoaXMudGV4dC5wb3NpdGlvbi5zZXQoMCwgLjIsIDApO1xuXHRcdHRoaXMudGV4dC51c2VyRGF0YS5hbHRzcGFjZSA9IHtjb2xsaWRlcjoge2VuYWJsZWQ6IHRydWV9fTtcblxuXHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMudGV4dCk7XG5cblx0XHR0aGlzLnRleHRDb21wb25lbnQgPSBuZXcgTlRleHQodGhpcy50ZXh0KTtcblx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHtmb250U2l6ZTogMSwgd2lkdGg6IDIsIGhlaWdodDogMSwgaG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJywgdmVydGljYWxBbGlnbjogJ21pZGRsZSd9KTtcblxuXHRcdHRoaXMuYWRkKHRoaXMudGV4dCk7XG5cblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjI1LCAwKTtcblx0XHRwYXJlbnQuYWRkKHRoaXMpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgdGhpcy5vbnN0YXRlY2hhbmdlLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLnBsYXllclNldHVwLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLm9uY2xpY2suYmluZCh0aGlzKSk7XG5cblx0XHRsZXQgc2hvdyA9ICgpID0+IHRoaXMuc2hvdygpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2ludmVzdGlnYXRlJywgc2hvdyk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigncG9saWN5QW5pbURvbmUnLCBzaG93KTtcblx0fVxuXG5cdG9uY2xpY2soZXZ0KVxuXHR7XG5cdFx0aWYoU0guZ2FtZS50dXJuT3JkZXIuaW5jbHVkZXMoU0gubG9jYWxVc2VyLmlkKSlcblx0XHRcdFNILnNvY2tldC5lbWl0KCdjb250aW51ZScpO1xuXHR9XG5cblx0b25zdGF0ZWNoYW5nZSh7ZGF0YToge2dhbWV9fSlcblx0e1xuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdsYW1lRHVjaycgfHwgKGdhbWUuc3RhdGUgPT09ICdwZWVrJyAmJiBnYW1lLnByZXNpZGVudCA9PT0gU0gubG9jYWxVc2VyLmlkKSl7XG5cdFx0XHR0aGlzLnNob3coKTtcblx0XHR9XG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcblx0XHRcdHRoaXMucGxheWVyU2V0dXAoe2RhdGE6IHtnYW1lfX0pO1xuXHRcdH1cblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdkb25lJyl7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0dGhpcy5zaG93KCdOZXcgZ2FtZScpO1xuXHRcdFx0fSwgNDAwMCk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dGhpcy5oaWRlKCk7XG5cdFx0fVxuXHR9XG5cblx0cGxheWVyU2V0dXAoe2RhdGE6IHtnYW1lfX0pXG5cdHtcblx0XHRpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcblx0XHRcdHRoaXMudGV4dC52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdGxldCBwbGF5ZXJDb3VudCA9IGdhbWUudHVybk9yZGVyLmxlbmd0aDtcblx0XHRcdGlmKHBsYXllckNvdW50ID49IDUpe1xuXHRcdFx0XHR0aGlzLmljb24udmlzaWJsZSA9IHRydWU7XG5cdFx0XHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6XG5cdFx0XHRcdFx0YCgke3BsYXllckNvdW50fS81KSBDbGljayB3aGVuIHJlYWR5YFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLmljb24udmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OlxuXHRcdFx0XHRcdGAoJHtwbGF5ZXJDb3VudH0vNSkgTmVlZCBtb3JlIHBsYXllcnNgXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHNob3cobWVzc2FnZSA9ICdDbGljayB0byBjb250aW51ZScpe1xuXHRcdHRoaXMuaWNvbi52aXNpYmxlID0gdHJ1ZTtcblx0XHR0aGlzLnRleHQudmlzaWJsZSA9IHRydWU7XG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDogbWVzc2FnZX0pO1xuXHR9XG5cblx0aGlkZSgpe1xuXHRcdHRoaXMuaWNvbi52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy50ZXh0LnZpc2libGUgPSBmYWxzZTtcblx0fVxufTsiLCJpbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcblxuY29uc3QgcG9zaXRpb25zID0gW1xuXHRuZXcgVEhSRUUuVmVjdG9yMygwLjM2OCwgLjAxNSwgLS43MTcpLFxuXHRuZXcgVEhSRUUuVmVjdG9yMygwLjEzNSwgLjAzMCwgLS43MTcpLFxuXHRuZXcgVEhSRUUuVmVjdG9yMygtLjA5NiwgLjA0NSwgLS43MTcpLFxuXHRuZXcgVEhSRUUuVmVjdG9yMygtLjMyOSwgLjA2MCwgLS43MTcpXG5dO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFbGVjdGlvblRyYWNrZXIgZXh0ZW5kcyBUSFJFRS5NZXNoXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKFxuXHRcdFx0bmV3IFRIUkVFLkN5bGluZGVyQnVmZmVyR2VvbWV0cnkoLjA0LCAuMDQsIC4wMywgMTYpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHgxOTE5ZmZ9KVxuXHRcdCk7XG5cdFx0dGhpcy5wb3NpdGlvbi5jb3B5KHBvc2l0aW9uc1swXSk7XG5cdFx0U0gudGFibGUuYWRkKHRoaXMpO1xuXHRcdFxuXHRcdC8vIGZhaWxzJTMgPT0gMCBvciAzP1xuXHRcdHRoaXMuaGlnaFNpZGUgPSBmYWxzZTtcblx0XHR0aGlzLnNwb3QgPSAwO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2ZhaWxlZFZvdGVzJywgdGhpcy51cGRhdGVGYWlsZWRWb3Rlcy5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZUZhaWxlZFZvdGVzKHtkYXRhOiB7Z2FtZToge2ZhaWxlZFZvdGVzfX19ID0ge2RhdGE6IHtnYW1lOiB7ZmFpbGVkVm90ZXM6IC0xfX19KVxuXHR7XG5cdFx0aWYoZmFpbGVkVm90ZXMgPT09IC0xKVxuXHRcdFx0ZmFpbGVkVm90ZXMgPSB0aGlzLnNwb3Q7XG5cblx0XHR0aGlzLmhpZ2hTaWRlID0gZmFpbGVkVm90ZXMgPiAwO1xuXHRcdHRoaXMuc3BvdCA9IGZhaWxlZFZvdGVzJTMgfHwgdGhpcy5oaWdoU2lkZSAmJiAzIHx8IDA7XG5cblx0XHR0aGlzLmFuaW0gPSBBbmltYXRlLnNpbXBsZSh0aGlzLCB7XG5cdFx0XHRwb3M6IHBvc2l0aW9uc1t0aGlzLnNwb3RdLFxuXHRcdFx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDEsIDErdGhpcy5zcG90LCAxKSxcblx0XHRcdGR1cmF0aW9uOiAxMjAwXG5cdFx0fSk7XG5cdH1cbn0iLCJpbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQge0NyZWRpdHNDYXJkfSBmcm9tICcuL2NhcmQnO1xyXG5pbXBvcnQge1BsYWNlaG9sZGVyTWVzaCwgTkJpbGxib2FyZCwgTlRleHR9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XHJcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQcmVzZW50YXRpb24gZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3IoKVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHRTSC5hZGQodGhpcyk7XHJcblxyXG5cdFx0Ly8gY3JlYXRlIGlkbGUgZGlzcGxheVxyXG5cdFx0dGhpcy5jcmVkaXRzID0gbmV3IENyZWRpdHNDYXJkKCk7XHJcblx0XHR0aGlzLmNyZWRpdHMucG9zaXRpb24uc2V0KDAsIDEuODUsIDApO1xyXG5cdFx0QW5pbWF0ZS5zcGluKHRoaXMuY3JlZGl0cywgMzAwMDApO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5jcmVkaXRzKTtcclxuXHRcdFxyXG5cdFx0Ly8gY3JlYXRlIHZpY3RvcnkgYmFubmVyXHJcblx0XHR0aGlzLmJhbm5lciA9IFBsYWNlaG9sZGVyTWVzaC5jbG9uZSgpO1xyXG5cdFx0dGhpcy5iYW5uZXIudGV4dCA9IG5ldyBOVGV4dCh0aGlzLmJhbm5lcik7XHJcblx0XHR0aGlzLmJhbm5lci50ZXh0LnVwZGF0ZSh7Zm9udFNpemU6IDJ9KTtcclxuXHRcdHRoaXMuYmFubmVyLmJpbGxib2FyZCA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuYmFubmVyKTtcclxuXHRcdHRoaXMuYmFubmVyLmJvYiA9IG51bGw7XHJcblx0XHR0aGlzLmFkZCh0aGlzLmJhbm5lcik7XHJcblxyXG5cdFx0Ly8gdXBkYXRlIHN0dWZmXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCB0aGlzLnVwZGF0ZU9uU3RhdGUuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVPblN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxyXG5cdHtcclxuXHRcdHRoaXMuY3JlZGl0cy52aXNpYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJztcclxuXHJcblx0XHRpZihnYW1lLnN0YXRlID09PSAnZG9uZScpXHJcblx0XHR7XHJcblx0XHRcdGlmKC9ebGliZXJhbC8udGVzdChnYW1lLnZpY3RvcnkpKXtcclxuXHRcdFx0XHR0aGlzLmJhbm5lci50ZXh0LmNvbG9yID0gJyMxOTE5ZmYnO1xyXG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQudXBkYXRlKHt0ZXh0OiAnTGliZXJhbHMgd2luISd9KTtcclxuXHRcdFx0XHRTSC5hdWRpby5saWJlcmFsRmFuZmFyZS5wbGF5KCk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5iYW5uZXIudGV4dC5jb2xvciA9ICdyZWQnO1xyXG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQudXBkYXRlKHt0ZXh0OiAnRmFzY2lzdHMgd2luISd9KTtcclxuXHRcdFx0XHRTSC5hdWRpby5mYXNjaXN0RmFuZmFyZS5wbGF5KCk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuYmFubmVyLnBvc2l0aW9uLnNldCgwLDAuOCwwKTtcclxuXHRcdFx0dGhpcy5iYW5uZXIuc2NhbGUuc2V0U2NhbGFyKC4wMDEpO1xyXG5cdFx0XHR0aGlzLmJhbm5lci52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0QW5pbWF0ZS5zaW1wbGUodGhpcy5iYW5uZXIsIHtcclxuXHRcdFx0XHRwb3M6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEuOCwgMCksXHJcblx0XHRcdFx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDEsMSwxKSxcclxuXHRcdFx0XHRkdXJhdGlvbjogMTAwMFxyXG5cdFx0XHR9KVxyXG5cdFx0XHQudGhlbigoKSA9PiB0aGlzLmJhbm5lci5ib2IgPSBBbmltYXRlLmJvYih0aGlzLmJhbm5lcikpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncG9saWN5MScgJiYgZ2FtZS5mYXNjaXN0UG9saWNpZXMgPj0gMylcclxuXHRcdHtcclxuXHRcdFx0bGV0IGNoYW5jZWxsb3IgPSBwbGF5ZXJzW2dhbWUuY2hhbmNlbGxvcl0uZGlzcGxheU5hbWU7XHJcblx0XHRcdHRoaXMuYmFubmVyLnRleHQuY29sb3IgPSAnd2hpdGUnO1xyXG5cdFx0XHR0aGlzLmJhbm5lci50ZXh0LnVwZGF0ZSh7dGV4dDogYCR7Y2hhbmNlbGxvcn0gaXMgbm90IEhpdGxlciFgfSk7XHJcblxyXG5cdFx0XHR0aGlzLmJhbm5lci5wb3NpdGlvbi5zZXQoMCwwLjgsMCk7XHJcblx0XHRcdHRoaXMuYmFubmVyLnNjYWxlLnNldFNjYWxhciguMDAxKTtcclxuXHRcdFx0dGhpcy5iYW5uZXIudmlzaWJsZSA9IHRydWU7XHJcblx0XHRcdEFuaW1hdGUuc2ltcGxlKHRoaXMuYmFubmVyLCB7XHJcblx0XHRcdFx0cG9zOiBuZXcgVEhSRUUuVmVjdG9yMygwLCAxLjgsIDApLFxyXG5cdFx0XHRcdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygxLDEsMSlcclxuXHRcdFx0fSlcclxuXHRcdFx0LnRoZW4oKCkgPT4gdGhpcy5iYW5uZXIuYm9iID0gQW5pbWF0ZS5ib2IodGhpcy5iYW5uZXIpKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2FmdGVybWF0aCcpIHtcclxuXHRcdFx0dGhpcy5iYW5uZXIudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLmJhbm5lci5ib2Iuc3RvcCgpO1xyXG5cdFx0XHR0aGlzLmJhbm5lci5ib2IgPSBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxufSIsImltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcblxyXG5jbGFzcyBBdWRpb0NsaXBcclxue1xyXG5cdGNvbnN0cnVjdG9yKGNvbnRleHQsIHVybCwgdm9sdW1lKVxyXG5cdHtcclxuXHRcdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XHJcblx0XHR0aGlzLm91dHB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xyXG5cdFx0dGhpcy5vdXRwdXQuZ2Fpbi52YWx1ZSA9IHZvbHVtZTtcclxuXHRcdHRoaXMub3V0cHV0LmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7XHJcblxyXG5cdFx0bGV0IGxvYWRlciA9IG5ldyBUSFJFRS5GaWxlTG9hZGVyKCk7XHJcblx0XHRsb2FkZXIuc2V0UmVzcG9uc2VUeXBlKCdhcnJheWJ1ZmZlcicpO1xyXG5cdFx0bG9hZGVyLmxvYWQodXJsLCBidWZmZXIgPT4ge1xyXG5cdFx0XHRjb250ZXh0LmRlY29kZUF1ZGlvRGF0YShidWZmZXIsIGRlY29kZWRCdWZmZXIgPT4ge1xyXG5cdFx0XHRcdHRoaXMuYnVmZmVyID0gZGVjb2RlZEJ1ZmZlcjtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHBsYXkoKVxyXG5cdHtcclxuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblx0XHRcdGxldCBzb3VyY2UgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XHJcblx0XHRcdHNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcclxuXHRcdFx0c291cmNlLmNvbm5lY3QodGhpcy5vdXRwdXQpO1xyXG5cdFx0XHRzb3VyY2Uuc3RhcnQoMCwgMCk7XHJcblx0XHRcdHNvdXJjZS5vbmVuZGVkID0gcmVzb2x2ZTtcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXVkaW9Db250cm9sbGVyXHJcbntcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0dGhpcy5jb250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xyXG5cdFx0dGhpcy5saWJlcmFsU3RpbmcgPSBuZXcgQXVkaW9DbGlwKHRoaXMuY29udGV4dCwgJ3N0YXRpYy9hdWRpby9saWJlcmFsLXN0aW5nLm9nZycsIDAuMik7XHJcblx0XHR0aGlzLmxpYmVyYWxGYW5mYXJlID0gbmV3IEF1ZGlvQ2xpcCh0aGlzLmNvbnRleHQsICdzdGF0aWMvYXVkaW8vbGliZXJhbC1mYW5mYXJlLm9nZycsIDAuMik7XHJcblx0XHR0aGlzLmZhc2Npc3RTdGluZyA9IG5ldyBBdWRpb0NsaXAodGhpcy5jb250ZXh0LCAnc3RhdGljL2F1ZGlvL2Zhc2Npc3Qtc3Rpbmcub2dnJywgMC4xKTtcclxuXHRcdHRoaXMuZmFzY2lzdEZhbmZhcmUgPSBuZXcgQXVkaW9DbGlwKHRoaXMuY29udGV4dCwgJ3N0YXRpYy9hdWRpby9mYXNjaXN0LWZhbmZhcmUub2dnJywgMC4xKTtcclxuXHR9XHJcbn0iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCAnLi9wb2x5ZmlsbCc7XG5cbmltcG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9IGZyb20gJy4vaGF0cyc7XG5pbXBvcnQgR2FtZVRhYmxlIGZyb20gJy4vdGFibGUnO1xuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgeyBnZXRHYW1lSWQsIG1lcmdlT2JqZWN0cyB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XG5pbXBvcnQgU2VhdCBmcm9tICcuL3NlYXQnO1xuaW1wb3J0IFBsYXllck1ldGVyIGZyb20gJy4vcGxheWVybWV0ZXInO1xuaW1wb3J0IENvbnRpbnVlQm94IGZyb20gJy4vY29udGludWVib3gnO1xuaW1wb3J0IEVsZWN0aW9uVHJhY2tlciBmcm9tICcuL2VsZWN0aW9udHJhY2tlcic7XG5pbXBvcnQgUHJlc2VudGF0aW9uIGZyb20gJy4vcHJlc2VudGF0aW9uJztcbmltcG9ydCBBdWRpb0NvbnRyb2xsZXIgZnJvbSAnLi9hdWRpb2NvbnRyb2xsZXInO1xuXG5jbGFzcyBTZWNyZXRIaXRsZXIgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuYXNzZXRzID0gQXNzZXRNYW5hZ2VyLm1hbmlmZXN0O1xuXHRcdHRoaXMudmVydGljYWxBbGlnbiA9ICdib3R0b20nO1xuXHRcdHRoaXMubmVlZHNTa2VsZXRvbiA9IGZhbHNlO1xuXG5cdFx0Ly8gcG9seWZpbGwgZ2V0VXNlciBmdW5jdGlvblxuXHRcdGlmKCFhbHRzcGFjZS5pbkNsaWVudCl7XG5cdFx0XHRhbHRzcGFjZS5nZXRVc2VyID0gKCkgPT4ge1xuXHRcdFx0XHRsZXQgaWQsIHJlID0gL1s/Jl11c2VySWQ9KFxcZCspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRcdFx0XHRpZihyZSlcblx0XHRcdFx0XHRpZCA9IHJlWzFdO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0aWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCkudG9TdHJpbmcoKTtcblxuXHRcdFx0XHRhbHRzcGFjZS5fbG9jYWxVc2VyID0ge1xuXHRcdFx0XHRcdHVzZXJJZDogaWQsXG5cdFx0XHRcdFx0ZGlzcGxheU5hbWU6IGlkLFxuXHRcdFx0XHRcdGlzTW9kZXJhdG9yOiAvaXNNb2RlcmF0b3IvLnRlc3Qod2luZG93LmxvY2F0aW9uLnNlYXJjaClcblx0XHRcdFx0fTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ01hc3F1ZXJhZGluZyBhcycsIGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xuXHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyBnZXQgbG9jYWwgdXNlclxuXHRcdHRoaXMuX3VzZXJQcm9taXNlID0gYWx0c3BhY2UuZ2V0VXNlcigpO1xuXHRcdHRoaXMuX3VzZXJQcm9taXNlLnRoZW4odXNlciA9PiB7XG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcblx0XHRcdFx0aWQ6IHVzZXIudXNlcklkLFxuXHRcdFx0XHRkaXNwbGF5TmFtZTogdXNlci5kaXNwbGF5TmFtZSxcblx0XHRcdFx0aXNNb2RlcmF0b3I6IHVzZXIuaXNNb2RlcmF0b3Jcblx0XHRcdH07XG5cdFx0fSk7XG5cblx0XHR0aGlzLmdhbWUgPSB7fTtcblx0XHR0aGlzLnBsYXllcnMgPSB7fTtcblx0XHR0aGlzLnZvdGVzID0ge307XG5cdH1cblxuXHRpbml0aWFsaXplKGVudiwgcm9vdCwgYXNzZXRzKVxuXHR7XG5cdFx0Ly8gc2hhcmUgdGhlIGRpb3JhbWEgaW5mb1xuXHRcdEFzc2V0TWFuYWdlci5jYWNoZSA9IGFzc2V0cztcblx0XHRBc3NldE1hbmFnZXIuZml4TWF0ZXJpYWxzKCk7XG5cdFx0dGhpcy5lbnYgPSBlbnY7XG5cblx0XHQvLyBjb25uZWN0IHRvIHNlcnZlclxuXHRcdHRoaXMuc29ja2V0ID0gaW8uY29ubmVjdCgnLycsIHtxdWVyeTogJ2dhbWVJZD0nK2dldEdhbWVJZCgpfSk7XG5cblx0XHR0aGlzLmF1ZGlvID0gbmV3IEF1ZGlvQ29udHJvbGxlcigpO1xuXG5cdFx0Ly8gY3JlYXRlIHRoZSB0YWJsZVxuXHRcdHRoaXMudGFibGUgPSBuZXcgR2FtZVRhYmxlKCk7XG5cdFx0dGhpcy5hZGQodGhpcy50YWJsZSk7XG5cblx0XHR0aGlzLnJlc2V0QnV0dG9uID0gbmV3IFRIUkVFLk1lc2goXG5cdFx0XHRuZXcgVEhSRUUuQm94R2VvbWV0cnkoLjI1LC4yNSwuMjUpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IGFzc2V0cy50ZXh0dXJlcy5yZXNldH0pXG5cdFx0KTtcblx0XHR0aGlzLnJlc2V0QnV0dG9uLnBvc2l0aW9uLnNldCgwLCAtMC4xOCwgMCk7XG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuc2VuZFJlc2V0LmJpbmQodGhpcykpO1xuXHRcdHRoaXMudGFibGUuYWRkKHRoaXMucmVzZXRCdXR0b24pO1xuXG5cdFx0dGhpcy5wcmVzZW50YXRpb24gPSBuZXcgUHJlc2VudGF0aW9uKCk7XG5cblx0XHQvLyBjcmVhdGUgaGF0c1xuXHRcdHRoaXMucHJlc2lkZW50SGF0ID0gbmV3IFByZXNpZGVudEhhdCgpO1xuXHRcdHRoaXMuY2hhbmNlbGxvckhhdCA9IG5ldyBDaGFuY2VsbG9ySGF0KCk7XG5cblx0XHQvLyBjcmVhdGUgcG9zaXRpb25zXG5cdFx0dGhpcy5zZWF0cyA9IFtdO1xuXHRcdGZvcihsZXQgaT0wOyBpPDEwOyBpKyspe1xuXHRcdFx0dGhpcy5zZWF0cy5wdXNoKCBuZXcgU2VhdChpKSApO1xuXHRcdH1cblxuXHRcdHRoaXMudGFibGUuYWRkKC4uLnRoaXMuc2VhdHMpO1xuXG5cdFx0Ly90aGlzLnBsYXllck1ldGVyID0gbmV3IFBsYXllck1ldGVyKCk7XG5cdFx0Ly90aGlzLnRhYmxlLmFkZCh0aGlzLnBsYXllck1ldGVyKTtcblx0XHR0aGlzLmNvbnRpbnVlQm94ID0gbmV3IENvbnRpbnVlQm94KHRoaXMudGFibGUpO1xuXG5cdFx0dGhpcy5lbGVjdGlvblRyYWNrZXIgPSBuZXcgRWxlY3Rpb25UcmFja2VyKCk7XG5cblx0XHR0aGlzLnNvY2tldC5vbigndXBkYXRlJywgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuc29ja2V0Lm9uKCdjaGVja2VkX2luJywgdGhpcy5jaGVja2VkSW4uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLnNvY2tldC5vbigncmVzZXQnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5zb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVGcm9tU2VydmVyKGdkLCBwZCwgdmQpXG5cdHtcblx0XHRjb25zb2xlLmxvZyhnZCwgcGQsIHZkKTtcblxuXHRcdGxldCBnYW1lID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nYW1lLCBnZCk7XG5cdFx0bGV0IHBsYXllcnMgPSBtZXJnZU9iamVjdHModGhpcy5wbGF5ZXJzLCBwZCB8fCB7fSk7XG5cdFx0bGV0IHZvdGVzID0gbWVyZ2VPYmplY3RzKHRoaXMudm90ZXMsIHZkIHx8IHt9KTtcblxuXHRcdGZvcihsZXQgZmllbGQgaW4gZ2QpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdFx0dHlwZTogJ3VwZGF0ZV8nK2ZpZWxkLFxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGdhbWU6IGdhbWUsXG5cdFx0XHRcdFx0cGxheWVyczogcGxheWVycyxcblx0XHRcdFx0XHR2b3Rlczogdm90ZXNcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fdXNlclByb21pc2UudGhlbigoKSA9PiB7XG5cdFx0XHRpZihwbGF5ZXJzW3RoaXMubG9jYWxVc2VyLmlkXSAmJiAhcGxheWVyc1t0aGlzLmxvY2FsVXNlci5pZF0uY29ubmVjdGVkKXtcblx0XHRcdFx0dGhpcy5zb2NrZXQuZW1pdCgnY2hlY2tfaW4nLCB0aGlzLmxvY2FsVXNlcik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xuXHRcdHRoaXMucGxheWVycyA9IHBsYXllcnM7XG5cdFx0dGhpcy52b3RlcyA9IHZvdGVzO1xuXHR9XG5cblx0Y2hlY2tlZEluKHApXG5cdHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMucGxheWVyc1twLmlkXSwgcCk7XG5cdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdHR5cGU6ICdjaGVja2VkX2luJyxcblx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxuXHRcdFx0ZGF0YTogcC5pZFxuXHRcdH0pO1xuXHR9XG5cblx0c2VuZFJlc2V0KGUpe1xuXHRcdGlmKHRoaXMubG9jYWxVc2VyLmlzTW9kZXJhdG9yKXtcblx0XHRcdGNvbnNvbGUubG9nKCdyZXF1ZXN0aW5nIHJlc2V0Jyk7XG5cdFx0XHR0aGlzLnNvY2tldC5lbWl0KCdyZXNldCcpO1xuXHRcdH1cblx0fVxuXG5cdGRvUmVzZXQoZ2FtZSwgcGxheWVycywgdm90ZXMpXG5cdHtcblx0XHRpZiggLyZjYWNoZUJ1c3Q9XFxkKyQvLnRlc3Qod2luZG93LmxvY2F0aW9uLnNlYXJjaCkgKXtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggKz0gJzEnO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgbmV3IFNlY3JldEhpdGxlcigpO1xuIl0sIm5hbWVzIjpbInRoaXMiLCJsZXQiLCJzdXBlciIsImNvbnN0IiwiQXNzZXRNYW5hZ2VyIiwiY2FyZCIsIkJhbGxvdFR5cGUuQ09ORklSTSIsInVwZGF0ZVN0YXRlIiwiQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QiLCJCYWxsb3RUeXBlLlBPTElDWSIsIm9wdHMiLCJjbGVhblVwRmFrZVZvdGUiLCJCUC51cGRhdGVWb3Rlc0luUHJvZ3Jlc3MiLCJCUC51cGRhdGVTdGF0ZSIsIkJQQkEudG9BcnJheSIsIkJQQkEuTElCRVJBTCIsInBvc2l0aW9ucyJdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO0NBQzVCLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUU7RUFDbEQsS0FBSyxFQUFFLFNBQVMsSUFBSSxDQUFDO0dBQ3BCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztHQUMvQjtFQUNELFFBQVEsRUFBRSxLQUFLO0VBQ2YsVUFBVSxFQUFFLEtBQUs7RUFDakIsWUFBWSxFQUFFLEtBQUs7RUFDbkIsQ0FBQyxDQUFDO0NBQ0g7O0FDVEQsU0FBZTtDQUNkLFFBQVEsRUFBRTtFQUNULE1BQU0sRUFBRTtHQUNQLEtBQUssRUFBRSx5QkFBeUI7R0FDaEMsU0FBUyxFQUFFLDRCQUE0QjtHQUN2QyxNQUFNLEVBQUUsMEJBQTBCO0dBQ2xDLFFBQVEsRUFBRSw2QkFBNkI7OztHQUd2QztFQUNELFFBQVEsRUFBRTtHQUNULFdBQVcsRUFBRSw0QkFBNEI7R0FDekMsU0FBUyxFQUFFLDZCQUE2QjtHQUN4QyxXQUFXLEVBQUUsNEJBQTRCO0dBQ3pDLEtBQUssRUFBRSxzQkFBc0I7R0FDN0IsS0FBSyxFQUFFLHFCQUFxQjs7R0FFNUI7RUFDRDtDQUNELEtBQUssRUFBRSxFQUFFO0NBQ1QsWUFBWSxFQUFFO0NBQ2Q7OztFQUNDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQSxFQUFFLEVBQUM7R0FDekNBLE1BQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFBLEdBQUcsRUFBQztJQUNsQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLFlBQVks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QUFDLEVBQUE7UUFDWixHQUFHLEdBQUcsWUFBWSxLQUFLLENBQUMsSUFBSTtJQUNoQyxFQUFBRCxNQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUE7R0FDbEIsQ0FBQyxDQUFDOzs7RUFHSCxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztFQUMzQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUNsRixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzs7RUFFbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7RUFDN0MsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDdEYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O0VBRXBCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ2xCOzs7O2lDQUFBOztDQUVELGNBQUEsUUFBUSxzQkFBQyxNQUFNO0NBQ2Y7RUFDQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUM7R0FDNUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDbEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxlQUFl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QyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLO0VBQ25CLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUs7OztFQUduQixHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTTtFQUNuQixHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU07RUFDbkIsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU07RUFDbkIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTTtFQUNuQixHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLO0VBQ25CLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxLQUFLO0VBQ25CLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUs7RUFDbkIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLOzs7O0VBSW5CLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBRXRGLENBQUM7O0NBRUZBLElBQUksT0FBTyxHQUFHOztFQUViLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMxQixDQUFDOzs7Q0FHRkEsSUFBSSxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUN2RUEsSUFBSSxJQUFJLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDNUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxT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QUM7RUFDL0JBLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7O0VBRTVCQSxJQUFJLEtBQUssR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDekNBLElBQUksS0FBSyxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUN4Q0EsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsQ0FBQyxDQUFDOztFQUUzQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7RUFDcEMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0VBRXJDLEtBQUtBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRTtFQUM3QjtHQUNDLEtBQUtBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtHQUMzQjtJQUNDQSxJQUFJLE1BQU0sR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7OztJQUd0QyxLQUFLLENBQUMsR0FBRyxDQUFDO0tBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNyQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0lBRVgsS0FBSyxDQUFDLEdBQUcsQ0FBQztLQUNULE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN0QyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0lBRVhBLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckNBLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckNBLElBQUksUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNqRUEsSUFBSSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2pFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNWLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCOzs7SUFHRCxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQ1Y7S0FDQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNoRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNoRDs7SUFFRDtLQUNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOztLQUVsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNsRDtJQUNEOzs7R0FHREEsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDN0NBLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0dBQzdDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNWLE1BQU0sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLE1BQU0sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3JCOztH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
