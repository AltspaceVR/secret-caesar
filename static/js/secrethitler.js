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

var Animate$1 = function Animate$1 () {};

Animate$1.simple = function simple (target, ref)
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

Animate$1.wait = function wait (duration){
	return new Promise(function (resolve, reject) {
		setTimeout(resolve, duration);
	});
};

/**
	 * Make the card appear with a flourish
	 * @param {THREE.Object3D} card 
	 */
Animate$1.cardFlourish = function cardFlourish (card)
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

	var spinPoints = [
		new THREE.Quaternion(0, Math.sqrt(2)/2, 0, Math.sqrt(2)/2),
		new THREE.Quaternion(0, 1, 0, 0),
		new THREE.Quaternion(0, Math.sqrt(2)/2, 0, -Math.sqrt(2)/2),
		new THREE.Quaternion(0, 0, 0, 1)
	];

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

Animate$1.vanish = function vanish (card)
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
		.754,.996, .754,.834, .997,.834, .997,.996, .754,.996, .754,.834, .997,.834, .997,.996, // liberal policy
		.754,.822, .754,.660, .996,.660, .996,.822, .754,.822, .754,.660, .996,.660, .996,.822, // fascist policy
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
		for(var i=this.liberalCards; i<liberalPolicies; i++){
			var card = new LiberalPolicyCard();
			card.destination = {
				pos: LiberalSpots.positions[i],
				quat: LiberalSpots.quaternion,
				scale: LiberalSpots.scale
			};
			updates.push(card);
		}
		
		for(var i=this.fascistCards; i<fascistPolicies; i++){
			var card$1 = new FascistPolicyCard();
			card$1.destination = {
				pos: FascistSpots.positions[i],
				quat: FascistSpots.quaternion,
				scale: FascistSpots.scale
			};
			updates.push(card$1);
		}

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
				animation = Animate$1.cardFlourish(card$2);
				animation.then(function () { return Animate$1.vanish(card$2); })
				.then(function () { card$2.visible = false; });
			}
			else
			{
				this.add(card$2);
				this.cards.push(card$2);
				animation = Animate$1.cardFlourish(card$2);
				animation.then(function () { return Animate$1.simple(card$2, card$2.destination); });
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

	Hitbox.prototype.updateVisibility = function updateVisibility (ref, specialPlayer)
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
			new THREE.BoxBufferGeometry(.2, .1, .2),
			new THREE.MeshBasicMaterial({color: 0x00c000})
		);
		this.icon.addBehavior(new altspace.utilities.behaviors.Spin());
		this.add(this.icon);

		this.text = PlaceholderMesh.clone();
		this.text.position.set(0, .2, 0);
		this.text.userData.altspace = {collider: {enabled: true}};

		var bb = new NBillboard(this.text);

		this.textComponent = new NText(this.text);
		this.textComponent.update({fontSize: 1, width: 1, height: 1, horizontalAlign: 'middle', verticalAlign: 'middle'});

		this.add(this.text);

		this.position.set(0, 0.3, 0);
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

		this.anim = Animate$1.simple(this, {
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
		this.credits.addBehavior(new altspace.utilities.behaviors.Spin({speed: 0.0002}));
		this.add(this.credits);
		
		// create victory banner
		this.banner = PlaceholderMesh.clone();
		this.banner.text = new NText(this.banner);
		this.banner.text.update({fontSize: 2});
		this.banner.billboard = new NBillboard(this.banner);
		this.add(this.banner);

		// update stuff
		SH.addEventListener('update_state', this.updateOnState.bind(this));
	}

	if ( superclass ) Presentation.__proto__ = superclass;
	Presentation.prototype = Object.create( superclass && superclass.prototype );
	Presentation.prototype.constructor = Presentation;

	Presentation.prototype.updateOnState = function updateOnState (ref)
	{
		var ref_data = ref.data;
		var game = ref_data.game;
		var players = ref_data.players;

		this.credits.visible = game.state === 'setup';

		if(game.state === 'done')
		{
			if(/^liberal/.test(game.victory)){
				this.banner.text.color = 'blue';
				this.banner.text.update({text: 'Liberals win!'});
			}
			else {
				this.banner.text.color = 'red';
				this.banner.text.update({text: 'Fascists win!'});
			}
			
			this.banner.position.set(0,0.8,0);
			this.banner.scale.setScalar(.001);
			this.banner.visible = true;
			Animate.simple(this.banner, {
				pos: new THREE.Vector3(0, 1.85, 0),
				scale: new THREE.Vector3(1,1,1)
			});
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
				pos: new THREE.Vector3(0, 1.85, 0),
				scale: new THREE.Vector3(1,1,1)
			});
		}
		else if(game.state === 'aftermath') {
			this.banner.visible = false;
		}
	};

	return Presentation;
}(THREE.Object3D));

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvcG9seWZpbGwuanMiLCIuLi8uLi9zcmMvY2xpZW50L2Fzc2V0bWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmF0aXZlY29tcG9uZW50cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvaGF0cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RhYmxlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC91dGlscy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3Rwcm9jZXNzb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JwYmEuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JhbGxvdC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVyaW5mby5qcyIsIi4uLy4uL3NyYy9jbGllbnQvY2Fwc3VsZWdlb21ldHJ5LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9oaXRib3guanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlYXQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NvbnRpbnVlYm94LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9lbGVjdGlvbnRyYWNrZXIuanMiLCIuLi8uLi9zcmMvY2xpZW50L3ByZXNlbnRhdGlvbi5qcyIsIi4uLy4uL3NyYy9jbGllbnQvc2VjcmV0aGl0bGVyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuaWYoIUFycmF5LnByb3RvdHlwZS5pbmNsdWRlcyl7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsICdpbmNsdWRlcycsIHtcblx0XHR2YWx1ZTogZnVuY3Rpb24oaXRlbSl7XG5cdFx0XHRyZXR1cm4gdGhpcy5pbmRleE9mKGl0ZW0pID4gLTE7XG5cdFx0fSxcblx0XHR3cml0YWJsZTogZmFsc2UsXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZVxuXHR9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0IGRlZmF1bHQge1xuXHRtYW5pZmVzdDoge1xuXHRcdG1vZGVsczoge1xuXHRcdFx0dGFibGU6ICdzdGF0aWMvbW9kZWwvdGFibGUuZ2x0ZicsXG5cdFx0XHRuYW1lcGxhdGU6ICdzdGF0aWMvbW9kZWwvbmFtZXBsYXRlLmRhZScsXG5cdFx0XHR0b3BoYXQ6ICdzdGF0aWMvbW9kZWwvdG9waGF0LmdsdGYnLFxuXHRcdFx0dmlzb3JjYXA6ICdzdGF0aWMvbW9kZWwvdmlzb3JfY2FwLmdsdGYnLFxuXHRcdFx0Ly9kdW1teTogJ3N0YXRpYy9tb2RlbC9kdW1teS5nbHRmJyxcblx0XHRcdC8vcGxheWVybWV0ZXI6ICdzdGF0aWMvbW9kZWwvcGxheWVybWV0ZXIuZ2x0Zidcblx0XHR9LFxuXHRcdHRleHR1cmVzOiB7XG5cdFx0XHRib2FyZF9sYXJnZTogJ3N0YXRpYy9pbWcvYm9hcmQtbGFyZ2UuanBnJyxcblx0XHRcdGJvYXJkX21lZDogJ3N0YXRpYy9pbWcvYm9hcmQtbWVkaXVtLmpwZycsXG5cdFx0XHRib2FyZF9zbWFsbDogJ3N0YXRpYy9pbWcvYm9hcmQtc21hbGwuanBnJyxcblx0XHRcdGNhcmRzOiAnc3RhdGljL2ltZy9jYXJkcy5qcGcnLFxuXHRcdFx0cmVzZXQ6ICdzdGF0aWMvaW1nL2JvbWIucG5nJyxcblx0XHRcdC8vdGV4dDogJ3N0YXRpYy9pbWcvdGV4dC5wbmcnXG5cdFx0fVxuXHR9LFxuXHRjYWNoZToge30sXG5cdGZpeE1hdGVyaWFsczogZnVuY3Rpb24oKVxuXHR7XG5cdFx0T2JqZWN0LmtleXModGhpcy5jYWNoZS5tb2RlbHMpLmZvckVhY2goaWQgPT4ge1xuXHRcdFx0dGhpcy5jYWNoZS5tb2RlbHNbaWRdLnRyYXZlcnNlKG9iaiA9PiB7XG5cdFx0XHRcdGlmKG9iai5tYXRlcmlhbCBpbnN0YW5jZW9mIFRIUkVFLk1lc2hTdGFuZGFyZE1hdGVyaWFsKXtcblx0XHRcdFx0XHRsZXQgbmV3TWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKCk7XG5cdFx0XHRcdFx0bmV3TWF0Lm1hcCA9IG9iai5tYXRlcmlhbC5tYXA7XG5cdFx0XHRcdFx0bmV3TWF0LmNvbG9yLmNvcHkob2JqLm1hdGVyaWFsLmNvbG9yKTtcblx0XHRcdFx0XHRvYmoubWF0ZXJpYWwgPSBuZXdNYXQ7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmxldCBwbGFjZWhvbGRlckdlbyA9IG5ldyBUSFJFRS5Cb3hCdWZmZXJHZW9tZXRyeSguMDAxLCAuMDAxLCAuMDAxKTtcbmxldCBwbGFjZWhvbGRlck1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4ZmZmZmZmLCB2aXNpYmxlOiBmYWxzZX0pO1xubGV0IFBsYWNlaG9sZGVyTWVzaCA9IG5ldyBUSFJFRS5NZXNoKHBsYWNlaG9sZGVyR2VvLCBwbGFjZWhvbGRlck1hdCk7XG5cbmNsYXNzIE5hdGl2ZUNvbXBvbmVudFxue1xuXHRjb25zdHJ1Y3RvcihtZXNoLCBuZWVkc1VwZGF0ZSlcblx0e1xuXHRcdHRoaXMubWVzaCA9IG1lc2g7XG5cdFx0YWx0c3BhY2UuYWRkTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lKTtcblxuXHRcdGlmKG5lZWRzVXBkYXRlKVxuXHRcdFx0dGhpcy51cGRhdGUoKTtcblx0fVxuXG5cdHVwZGF0ZShmaWVsZHMgPSB7fSlcblx0e1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5kYXRhLCBmaWVsZHMpO1xuXHRcdGFsdHNwYWNlLnVwZGF0ZU5hdGl2ZUNvbXBvbmVudCh0aGlzLm1lc2gsIHRoaXMubmFtZSwgdGhpcy5kYXRhKTtcblx0fVxuXG5cdGRlc3Ryb3koKVxuXHR7XG5cdFx0YWx0c3BhY2UucmVtb3ZlTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lKTtcblx0fVxufVxuXG5jbGFzcyBOVGV4dCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKG1lc2gpe1xuXHRcdHRoaXMubmFtZSA9ICduLXRleHQnO1xuXHRcdHRoaXMuZGF0YSA9IHtcblx0XHRcdGZvbnRTaXplOiAxMCxcblx0XHRcdGhlaWdodDogMSxcblx0XHRcdHdpZHRoOiAxMCxcblx0XHRcdHZlcnRpY2FsQWxpZ246ICdtaWRkbGUnLFxuXHRcdFx0aG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJyxcblx0XHRcdHRleHQ6ICcnXG5cdFx0fTtcblx0XHRzdXBlcihtZXNoLCB0cnVlKTtcblxuXHRcdHRoaXMuY29sb3IgPSAnYmxhY2snO1xuXHR9XG5cdHVwZGF0ZShmaWVsZHMgPSB7fSl7XG5cdFx0aWYoZmllbGRzLnRleHQpXG5cdFx0XHRmaWVsZHMudGV4dCA9IGA8Y29sb3I9JHt0aGlzLmNvbG9yfT4ke2ZpZWxkcy50ZXh0fTwvY29sb3I+YDtcblx0XHROYXRpdmVDb21wb25lbnQucHJvdG90eXBlLnVwZGF0ZS5jYWxsKHRoaXMsIGZpZWxkcyk7XG5cdH1cbn1cblxuY2xhc3MgTlNrZWxldG9uUGFyZW50IGV4dGVuZHMgTmF0aXZlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IobWVzaCl7XG5cdFx0dGhpcy5uYW1lID0gJ24tc2tlbGV0b24tcGFyZW50Jztcblx0XHR0aGlzLmRhdGEgPSB7XG5cdFx0XHRpbmRleDogMCxcblx0XHRcdHBhcnQ6ICdoZWFkJyxcblx0XHRcdHNpZGU6ICdjZW50ZXInLCBcblx0XHRcdHVzZXJJZDogMFxuXHRcdH07XG5cdFx0c3VwZXIobWVzaCwgdHJ1ZSk7XG5cdH1cbn1cblxuY2xhc3MgTkJpbGxib2FyZCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKG1lc2gpe1xuXHRcdHRoaXMubmFtZSA9ICduLWJpbGxib2FyZCc7XG5cdFx0c3VwZXIobWVzaCwgZmFsc2UpO1xuXHR9XG59XG5cbmV4cG9ydCB7UGxhY2Vob2xkZXJNZXNoLCBOVGV4dCwgTlNrZWxldG9uUGFyZW50LCBOQmlsbGJvYXJkfTsiLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtOU2tlbGV0b25QYXJlbnR9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XG5cbmNsYXNzIEhhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKG1vZGVsKVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmN1cnJlbnRJZCA9ICcnO1xuXHRcdHRoaXMuY29tcG9uZW50cyA9IHtoYXQ6IG51bGwsIHRleHQ6IG51bGx9O1xuXG5cdFx0aWYobW9kZWwucGFyZW50KVxuXHRcdFx0bW9kZWwucGFyZW50LnJlbW92ZShtb2RlbCk7XG5cdFx0bW9kZWwudXBkYXRlTWF0cml4V29ybGQodHJ1ZSk7XG5cblx0XHQvLyBncmFiIG1lc2hlc1xuXHRcdGxldCBwcm9wID0gJyc7XG5cdFx0bW9kZWwudHJhdmVyc2Uob2JqID0+IHtcblx0XHRcdGlmKG9iai5uYW1lID09PSAnaGF0JyB8fCBvYmoubmFtZSA9PT0gJ3RleHQnKVxuXHRcdFx0XHRwcm9wID0gb2JqLm5hbWU7XG5cdFx0XHRlbHNlIGlmKG9iaiBpbnN0YW5jZW9mIFRIUkVFLk1lc2gpXG5cdFx0XHRcdHRoaXNbcHJvcF0gPSBvYmo7XG5cdFx0fSk7XG5cblx0XHQvLyBzdHJpcCBvdXQgbWlkZGxlIG5vZGVzXG5cdFx0dGhpcy5oYXQubWF0cml4LmNvcHkodGhpcy5oYXQubWF0cml4V29ybGQpO1xuXHRcdHRoaXMuaGF0Lm1hdHJpeC5kZWNvbXBvc2UodGhpcy5oYXQucG9zaXRpb24sIHRoaXMuaGF0LnF1YXRlcm5pb24sIHRoaXMuaGF0LnNjYWxlKTtcblx0XHR0aGlzLmFkZCh0aGlzLmhhdCk7XG5cblx0XHR0aGlzLnRleHQubWF0cml4LmNvcHkodGhpcy50ZXh0Lm1hdHJpeFdvcmxkKTtcblx0XHR0aGlzLnRleHQubWF0cml4LmRlY29tcG9zZSh0aGlzLnRleHQucG9zaXRpb24sIHRoaXMudGV4dC5xdWF0ZXJuaW9uLCB0aGlzLnRleHQuc2NhbGUpO1xuXHRcdHRoaXMuYWRkKHRoaXMudGV4dCk7XG5cblx0XHRkLnNjZW5lLmFkZCh0aGlzKTtcblx0fVxuXG5cdHNldE93bmVyKHVzZXJJZClcblx0e1xuXHRcdGlmKCF0aGlzLmN1cnJlbnRJZCAmJiB1c2VySWQpe1xuXHRcdFx0ZC5zY2VuZS5hZGQodGhpcyk7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHMuaGF0ID0gbmV3IE5Ta2VsZXRvblBhcmVudCh0aGlzLmhhdCk7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHMudGV4dCA9IG5ldyBOU2tlbGV0b25QYXJlbnQodGhpcy50ZXh0KTtcblx0XHR9XG5cdFx0ZWxzZSBpZih0aGlzLmN1cnJlbnRJZCAmJiAhdXNlcklkKXtcblx0XHRcdHRoaXMuY29tcG9uZW50cy5oYXQuZGVzdHJveSgpO1xuXHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQuZGVzdHJveSgpO1xuXHRcdFx0ZC5zY2VuZS5yZW1vdmUodGhpcyk7XG5cdFx0fVxuXG5cdFx0aWYodXNlcklkKXtcblx0XHRcdHRoaXMuY29tcG9uZW50cy5oYXQudXBkYXRlKHt1c2VySWR9KTtcblx0XHRcdHRoaXMuY29tcG9uZW50cy50ZXh0LnVwZGF0ZSh7dXNlcklkfSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5jdXJyZW50SWQgPSB1c2VySWQ7XG5cdH1cbn1cblxuY2xhc3MgUHJlc2lkZW50SGF0IGV4dGVuZHMgSGF0XG57XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLnRvcGhhdCk7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4xNDQvU0guZW52LnBpeGVsc1Blck1ldGVyLCAuMDM4L1NILmVudi5waXhlbHNQZXJNZXRlcik7XG5cdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigxLjIvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHRcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoe2RhdGE6IHtnYW1lfX0pID0+IHtcblx0XHRcdGlmKGdhbWUuc3RhdGUgPT09ICdsYW1lRHVjaycgJiYgZ2FtZS5mYWlsZWRWb3RlcyA9PT0gMCl7XG5cdFx0XHRcdGxldCBzaXR0aW5nID0gZ2FtZS5zcGVjaWFsRWxlY3Rpb24gPyBnYW1lLnByZXNpZGVudCA6IGdhbWUubGFzdFByZXNpZGVudDtcblx0XHRcdFx0dGhpcy5zZXRPd25lcihzaXR0aW5nKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufTtcblxuY2xhc3MgQ2hhbmNlbGxvckhhdCBleHRlbmRzIEhhdFxue1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKEFNLmNhY2hlLm1vZGVscy52aXNvcmNhcCk7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4wNy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHR0aGlzLnNjYWxlLm11bHRpcGx5U2NhbGFyKDEuMi9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xuXHRcdFxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9sYXN0Q2hhbmNlbGxvcicsIGUgPT4ge1xuXHRcdFx0dGhpcy5zZXRPd25lcihlLmRhdGEuZ2FtZS5sYXN0Q2hhbmNlbGxvcik7XG5cdFx0fSk7XG5cdH1cbn1cblxuZXhwb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbmNsYXNzIEJlaGF2aW9yXG57XG5cdGNvbnN0cnVjdG9yKHR5cGUpe1xuXHRcdHRoaXMudHlwZSA9IHR5cGU7XG5cdH1cblxuXHRhd2FrZShvYmope1xuXHRcdHRoaXMub2JqZWN0M0QgPSBvYmo7XG5cdH1cblxuXHRzdGFydCgpeyB9XG5cblx0dXBkYXRlKGRUKXsgfVxuXG5cdGRpc3Bvc2UoKXsgfVxufVxuXG5jbGFzcyBCU3luYyBleHRlbmRzIEJlaGF2aW9yXG57XG5cdGNvbnN0cnVjdG9yKGV2ZW50TmFtZSlcblx0e1xuXHRcdHN1cGVyKCdCU3luYycpO1xuXHRcdHRoaXMuX3MgPSBTSC5zb2NrZXQ7XG5cblx0XHQvLyBsaXN0ZW4gZm9yIHVwZGF0ZSBldmVudHNcblx0XHR0aGlzLmhvb2sgPSB0aGlzLl9zLm9uKGV2ZW50TmFtZSwgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuZXZlbnROYW1lID0gZXZlbnROYW1lO1xuXHRcdHRoaXMub3duZXIgPSAwO1xuXHR9XG5cblx0dXBkYXRlRnJvbVNlcnZlcihkYXRhKVxuXHR7XG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XG5cdFx0dGhpcy5vYmplY3QzRC5yb3RhdGlvbi5mcm9tQXJyYXkoZGF0YSwgMyk7XG5cdH1cblxuXHR0YWtlT3duZXJzaGlwKClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlciAmJiBTSC5sb2NhbFVzZXIudXNlcklkKVxuXHRcdFx0dGhpcy5vd25lciA9IFNILmxvY2FsVXNlci51c2VySWQ7XG5cdH1cblxuXHR1cGRhdGUoZFQpXG5cdHtcblx0XHRpZihTSC5sb2NhbFVzZXIgJiYgU0gubG9jYWxVc2VyLnNrZWxldG9uICYmIFNILmxvY2FsVXNlci5pZCA9PT0gdGhpcy5vd25lcilcblx0XHR7XG5cdFx0XHRsZXQgaiA9IFNILmxvY2FsVXNlci5za2VsZXRvbi5nZXRKb2ludCgnSGVhZCcpO1xuXHRcdFx0dGhpcy5fcy5lbWl0KHRoaXMuZXZlbnROYW1lLCBbLi4uai5wb3NpdGlvbi50b0FycmF5KCksIC4uLmoucm90YXRpb24udG9BcnJheSgpXSk7XG5cdFx0fVxuXHR9XG5cbn1cblxuZXhwb3J0IHsgQmVoYXZpb3IsIEJTeW5jIH07XG4iLCJpbXBvcnQgeyBCZWhhdmlvciB9IGZyb20gJy4vYmVoYXZpb3InO1xuXG5jbGFzcyBRdWF0ZXJuaW9uVHdlZW4gZXh0ZW5kcyBUV0VFTi5Ud2Vlblxue1xuXHRjb25zdHJ1Y3RvcihzdGF0ZSwgZ3JvdXApe1xuXHRcdHN1cGVyKHt0OiAwfSwgZ3JvdXApO1xuXHRcdHRoaXMuX3N0YXRlID0gc3RhdGU7XG5cdFx0dGhpcy5fc3RhcnQgPSBzdGF0ZS5jbG9uZSgpO1xuXHR9XG5cdHRvKGVuZCwgZHVyYXRpb24pe1xuXHRcdHN1cGVyLnRvKHt0OiAxfSwgZHVyYXRpb24pO1xuXHRcdHRoaXMuX2VuZCA9IGVuZCBpbnN0YW5jZW9mIFRIUkVFLlF1YXRlcm5pb24gPyBbZW5kXSA6IGVuZDtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXHRzdGFydCgpe1xuXHRcdHRoaXMub25VcGRhdGUoKHt0OiBwcm9ncmVzc30pID0+IHtcblx0XHRcdHByb2dyZXNzID0gcHJvZ3Jlc3MgKiB0aGlzLl9lbmQubGVuZ3RoO1xuXHRcdFx0bGV0IG5leHRQb2ludCA9IE1hdGguY2VpbChwcm9ncmVzcyk7XG5cdFx0XHRsZXQgbG9jYWxQcm9ncmVzcyA9IHByb2dyZXNzIC0gbmV4dFBvaW50ICsgMTtcblx0XHRcdGxldCBwb2ludHMgPSBbdGhpcy5fc3RhcnQsIC4uLnRoaXMuX2VuZF07XG5cdFx0XHRUSFJFRS5RdWF0ZXJuaW9uLnNsZXJwKHBvaW50c1tuZXh0UG9pbnQtMV0sIHBvaW50c1tuZXh0UG9pbnRdLCB0aGlzLl9zdGF0ZSwgbG9jYWxQcm9ncmVzcyk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHN1cGVyLnN0YXJ0KCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gV2FpdEZvckFuaW1zKHR3ZWVucylcbntcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XG5cdHtcblx0XHRsZXQgYWN0aXZlQ291bnQgPSB0d2VlbnMubGVuZ3RoO1xuXHRcdGZ1bmN0aW9uIGNoZWNrRG9uZSgpe1xuXHRcdFx0aWYoLS1hY3RpdmVDb3VudCA9PT0gMCkgcmVzb2x2ZSgpO1xuXHRcdH1cblxuXHRcdHR3ZWVucy5mb3JFYWNoKHQgPT4gdC5vbkNvbXBsZXRlKGNoZWNrRG9uZSkpO1xuXHRcdHR3ZWVucy5mb3JFYWNoKHQgPT4gdC5zdGFydCgpKTtcblx0fSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFuaW1hdGVcbntcblx0LyoqXG5cdCAqIE1vdmUgYW4gb2JqZWN0IGZyb20gQSB0byBCXG5cdCAqIEBwYXJhbSB7VEhSRUUuT2JqZWN0M0R9IHRhcmdldCBcblx0ICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcblx0ICovXG5cdHN0YXRpYyBzaW1wbGUodGFyZ2V0LCB7cGFyZW50PW51bGwsIHBvcz1udWxsLCBxdWF0PW51bGwsIHNjYWxlPW51bGwsIG1hdHJpeD1udWxsLCBkdXJhdGlvbj02MDB9ID0ge30pXG5cdHtcblx0XHQvLyBleHRyYWN0IHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlIGZyb20gbWF0cml4XG5cdFx0aWYobWF0cml4KXtcblx0XHRcdHBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cdFx0XHRxdWF0ID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblx0XHRcdHNjYWxlID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblx0XHRcdG1hdHJpeC5kZWNvbXBvc2UocG9zLCBxdWF0LCBzY2FsZSk7XG5cdFx0fVxuXG5cdFx0Ly8gc2h1ZmZsZSBoaWVyYXJjaHksIGJ1dCBrZWVwIHdvcmxkIHRyYW5zZm9ybSB0aGUgc2FtZVxuXHRcdGlmKHBhcmVudCAmJiB0aGlzLnBhcmVudCAhPT0gdGFyZ2V0LnBhcmVudCl7XG5cdFx0XHR0YXJnZXQuYXBwbHlNYXRyaXgodGFyZ2V0LnBhcmVudC5tYXRyaXhXb3JsZCk7XG5cdFx0XHR0YXJnZXQuYXBwbHlNYXRyaXgobmV3IFRIUkVFLk1hdHJpeDQoKS5nZXRJbnZlcnNlKHBhcmVudC5tYXRyaXhXb3JsZCkpO1xuXHRcdFx0cGFyZW50LmFkZChvYmopO1xuXHRcdH1cblxuXHRcdGxldCBhbmltcyA9IFtdO1xuXG5cdFx0aWYocG9zKXtcblx0XHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKHRhcmdldC5wb3NpdGlvbilcblx0XHRcdFx0LnRvKHt4OiBwb3MueCwgeTogcG9zLnksIHo6IHBvcy56fSwgZHVyYXRpb24pXG5cdFx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdGlmKHF1YXQpe1xuXHRcdFx0YW5pbXMucHVzaChuZXcgUXVhdGVybmlvblR3ZWVuKHRhcmdldC5xdWF0ZXJuaW9uKVxuXHRcdFx0XHQudG8ocXVhdCwgZHVyYXRpb24pXG5cdFx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdGlmKHNjYWxlKXtcblx0XHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKHRhcmdldC5zY2FsZSlcblx0XHRcdFx0LnRvKHt4OiBzY2FsZS54LCB5OiBzY2FsZS55LCB6OiBzY2FsZS56fSwgZHVyYXRpb24pXG5cdFx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdHJldHVybiBXYWl0Rm9yQW5pbXMoYW5pbXMpO1xuXHR9XG5cblx0c3RhdGljIHdhaXQoZHVyYXRpb24pe1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRzZXRUaW1lb3V0KHJlc29sdmUsIGR1cmF0aW9uKTtcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBNYWtlIHRoZSBjYXJkIGFwcGVhciB3aXRoIGEgZmxvdXJpc2hcblx0ICogQHBhcmFtIHtUSFJFRS5PYmplY3QzRH0gY2FyZCBcblx0ICovXG5cdHN0YXRpYyBjYXJkRmxvdXJpc2goY2FyZClcblx0e1xuXHRcdGNhcmQucG9zaXRpb24uc2V0KDAsIDAsIDApO1xuXHRcdGNhcmQucXVhdGVybmlvbi5zZXQoMCwwLDAsMSk7XG5cdFx0Y2FyZC5zY2FsZS5zZXRTY2FsYXIoLjAwMSk7XG5cblx0XHRsZXQgYW5pbXMgPSBbXTtcblxuXHRcdC8vIGFkZCBwb3NpdGlvbiBhbmltYXRpb25cblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihjYXJkLnBvc2l0aW9uKVxuXHRcdFx0LnRvKHt4OiAwLCB5OiAuNywgejogMH0sIDE1MDApXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5FbGFzdGljLk91dClcblx0XHQpO1xuXG5cdFx0Y29uc3Qgc3BpblBvaW50cyA9IFtcblx0XHRcdG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIE1hdGguc3FydCgyKS8yLCAwLCBNYXRoLnNxcnQoMikvMiksXG5cdFx0XHRuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAxLCAwLCAwKSxcblx0XHRcdG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIE1hdGguc3FydCgyKS8yLCAwLCAtTWF0aC5zcXJ0KDIpLzIpLFxuXHRcdFx0bmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMCwgMCwgMSlcblx0XHRdO1xuXG5cdFx0Ly8gYWRkIHNwaW4gYW5pbWF0aW9uXG5cdFx0YW5pbXMucHVzaChuZXcgUXVhdGVybmlvblR3ZWVuKGNhcmQucXVhdGVybmlvbilcblx0XHRcdC50byhzcGluUG9pbnRzLCAyNTAwKVxuXHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcblx0XHQpO1xuXG5cdFx0Ly8gYWRkIHNjYWxlIGFuaW1hdGlvblxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKGNhcmQuc2NhbGUpXG5cdFx0XHQudG8oe3g6IC41LCB5OiAuNSwgejogLjV9LCAyMDApXG5cdFx0KTtcblxuXHRcdHJldHVybiBXYWl0Rm9yQW5pbXMoYW5pbXMpO1xuXHR9XG5cblx0c3RhdGljIHZhbmlzaChjYXJkKVxuXHR7XG5cdFx0bGV0IGFuaW1zID0gW107XG5cblx0XHQvLyBhZGQgbW92ZSBhbmltYXRpb25cblx0XHRhbmltcy5wdXNoKG5ldyBUV0VFTi5Ud2VlbihjYXJkLnBvc2l0aW9uKVxuXHRcdFx0LnRvKHt5OiAnKzAuNSd9LCAxMDAwKVxuXHRcdCk7XG5cblx0XHQvLyBhZGQgZGlzYXBwZWFyIGFuaW1hdGlvblxuXHRcdGFuaW1zLnB1c2gobmV3IFRXRUVOLlR3ZWVuKGNhcmQubWF0ZXJpYWwpXG5cdFx0XHQudG8oe29wYWNpdHk6IDB9LCAxMDAwKVxuXHRcdCk7XG5cblx0XHRyZXR1cm4gV2FpdEZvckFuaW1zKGFuaW1zKTtcblx0fVxufSIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuLy8gZW51bSBjb25zdGFudHNcbmxldCBUeXBlcyA9IE9iamVjdC5mcmVlemUoe1xuXHRQT0xJQ1lfTElCRVJBTDogMCxcblx0UE9MSUNZX0ZBU0NJU1Q6IDEsXG5cdFJPTEVfTElCRVJBTDogMixcblx0Uk9MRV9GQVNDSVNUOiAzLFxuXHRST0xFX0hJVExFUjogNCxcblx0UEFSVFlfTElCRVJBTDogNSxcblx0UEFSVFlfRkFTQ0lTVDogNixcblx0SkE6IDcsXG5cdE5FSU46IDgsXG5cdEJMQU5LOiA5LFxuXHRDUkVESVRTOiAxMCxcblx0VkVUTzogMTFcbn0pO1xuXG5sZXQgZ2VvbWV0cnkgPSBudWxsLCBtYXRlcmlhbCA9IG51bGw7XG5cbmZ1bmN0aW9uIGluaXRDYXJkRGF0YSgpXG57XG5cdGxldCBmbG9hdERhdGEgPSBbXG5cdFx0Ly8gcG9zaXRpb24gKHBvcnRyYWl0KVxuXHRcdDAuMzU3NSwgMC41LCAwLjAwMDUsXG5cdFx0LS4zNTc1LCAwLjUsIDAuMDAwNSxcblx0XHQtLjM1NzUsIC0uNSwgMC4wMDA1LFxuXHRcdDAuMzU3NSwgLS41LCAwLjAwMDUsXG5cdFx0MC4zNTc1LCAwLjUsIC0uMDAwNSxcblx0XHQtLjM1NzUsIDAuNSwgLS4wMDA1LFxuXHRcdC0uMzU3NSwgLS41LCAtLjAwMDUsXG5cdFx0MC4zNTc1LCAtLjUsIC0uMDAwNSxcblx0XG5cdFx0Ly8gcG9zaXRpb24gKGxhbmRzY2FwZSlcblx0XHQwLjUsIC0uMzU3NSwgMC4wMDA1LFxuXHRcdDAuNSwgMC4zNTc1LCAwLjAwMDUsXG5cdFx0LS41LCAwLjM1NzUsIDAuMDAwNSxcblx0XHQtLjUsIC0uMzU3NSwgMC4wMDA1LFxuXHRcdDAuNSwgLS4zNTc1LCAtLjAwMDUsXG5cdFx0MC41LCAwLjM1NzUsIC0uMDAwNSxcblx0XHQtLjUsIDAuMzU3NSwgLS4wMDA1LFxuXHRcdC0uNSwgLS4zNTc1LCAtLjAwMDUsXG5cdFxuXHRcdC8vIFVWc1xuXHRcdC8qIC0tLS0tLS0tLS0tLS0tIGNhcmQgZmFjZSAtLS0tLS0tLS0tLS0tICovIC8qIC0tLS0tLS0tLS0tLS0gY2FyZCBiYWNrIC0tLS0tLS0tLS0tLS0tKi9cblx0XHQuNzU0LC45OTYsIC43NTQsLjgzNCwgLjk5NywuODM0LCAuOTk3LC45OTYsIC43NTQsLjk5NiwgLjc1NCwuODM0LCAuOTk3LC44MzQsIC45OTcsLjk5NiwgLy8gbGliZXJhbCBwb2xpY3lcblx0XHQuNzU0LC44MjIsIC43NTQsLjY2MCwgLjk5NiwuNjYwLCAuOTk2LC44MjIsIC43NTQsLjgyMiwgLjc1NCwuNjYwLCAuOTk2LC42NjAsIC45OTYsLjgyMiwgLy8gZmFzY2lzdCBwb2xpY3lcblx0XHQuNzQ2LC45OTYsIC41MDUsLjk5NiwgLjUwNSwuNjUwLCAuNzQ2LC42NTAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbGliZXJhbCByb2xlXG5cdFx0Ljc0NiwuNjQ1LCAuNTA1LC42NDUsIC41MDUsLjMwMCwgLjc0NiwuMzAwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGZhc2Npc3Qgcm9sZVxuXHRcdC45OTYsLjY0NSwgLjc1NCwuNjQ1LCAuNzU0LC4zMDAsIC45OTYsLjMwMCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBoaXRsZXIgcm9sZVxuXHRcdC40OTUsLjk5NiwgLjI1NSwuOTk2LCAuMjU1LC42NTAsIC40OTUsLjY1MCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBsaWJlcmFsIHBhcnR5XG5cdFx0LjQ5NSwuNjQ1LCAuMjU1LC42NDUsIC4yNTUsLjMwMCwgLjQ5NSwuMzAwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGZhc2Npc3QgcGFydHlcblx0XHQuMjQ0LC45OTIsIC4wMDUsLjk5MiwgLjAwNSwuNjUzLCAuMjQ0LC42NTMsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gamFcblx0XHQuMjQzLC42NDIsIC4wMDYsLjY0MiwgLjAwNiwuMzAyLCAuMjQzLC4zMDIsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbmVpblxuXHRcdC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBibGFua1xuXHRcdC4zOTcsLjI3NiwgLjM5NywuMDE1LCAuNzY1LC4wMTUsIC43NjUsLjI3NiwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBjcmVkaXRzXG5cdFx0Ljk2MywuMjcwLCAuODA0LC4yNzAsIC44MDQsLjAyOSwgLjk2MywuMDI5LCAuODA0LC4yNzAsIC45NjMsLjI3MCwgLjk2MywuMDI5LCAuODA0LC4wMjksIC8vIHZldG9cblxuXHRdO1xuXHRcblx0bGV0IGludERhdGEgPSBbXG5cdFx0Ly8gdHJpYW5nbGUgaW5kZXhcblx0XHQwLDEsMiwgMCwyLDMsIDQsNyw1LCA1LDcsNlxuXHRdO1xuXHRcblx0Ly8gdHdvIHBvc2l0aW9uIHNldHMsIDExIFVWIHNldHMsIDEgaW5kZXggc2V0XG5cdGxldCBnZW9CdWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoNCpmbG9hdERhdGEubGVuZ3RoICsgMippbnREYXRhLmxlbmd0aCk7XG5cdGxldCB0ZW1wID0gbmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDAsIGZsb2F0RGF0YS5sZW5ndGgpO1xuXHR0ZW1wLnNldChmbG9hdERhdGEpO1xuXHR0ZW1wID0gbmV3IFVpbnQxNkFycmF5KGdlb0J1ZmZlciwgNCpmbG9hdERhdGEubGVuZ3RoLCBpbnREYXRhLmxlbmd0aCk7XG5cdHRlbXAuc2V0KGludERhdGEpO1xuXHRcblx0Ly8gY2hvcCB1cCBidWZmZXIgaW50byB2ZXJ0ZXggYXR0cmlidXRlc1xuXHRsZXQgcG9zTGVuZ3RoID0gOCozLCB1dkxlbmd0aCA9IDgqMiwgaW5kZXhMZW5ndGggPSAxMjtcblx0bGV0IHBvc1BvcnRyYWl0ID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgMCwgcG9zTGVuZ3RoKSwgMyksXG5cdFx0cG9zTGFuZHNjYXBlID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgNCpwb3NMZW5ndGgsIHBvc0xlbmd0aCksIDMpO1xuXHRsZXQgdXZzID0gW107XG5cdGZvcihsZXQgaT0wOyBpPDEyOyBpKyspe1xuXHRcdHV2cy5wdXNoKCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCA4KnBvc0xlbmd0aCArIDQqaSp1dkxlbmd0aCwgdXZMZW5ndGgpLCAyKSApO1xuXHR9XG5cdGxldCBpbmRleCA9IG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IFVpbnQxNkFycmF5KGdlb0J1ZmZlciwgNCpmbG9hdERhdGEubGVuZ3RoLCBpbmRleExlbmd0aCksIDEpO1xuXHRcblx0Z2VvbWV0cnkgPSBPYmplY3Qua2V5cyhUeXBlcykubWFwKChrZXksIGkpID0+XG5cdHtcblx0XHRsZXQgZ2VvID0gbmV3IFRIUkVFLkJ1ZmZlckdlb21ldHJ5KCk7XG5cdFx0Z2VvLmFkZEF0dHJpYnV0ZSgncG9zaXRpb24nLCBpPT1UeXBlcy5KQSB8fCBpPT1UeXBlcy5ORUlOID8gcG9zTGFuZHNjYXBlIDogcG9zUG9ydHJhaXQpO1xuXHRcdGdlby5hZGRBdHRyaWJ1dGUoJ3V2JywgdXZzW2ldKTtcblx0XHRnZW8uc2V0SW5kZXgoaW5kZXgpO1xuXHRcdHJldHVybiBnZW87XG5cdH0pO1xuXG5cdG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IEFzc2V0TWFuYWdlci5jYWNoZS50ZXh0dXJlcy5jYXJkc30pO1xufVxuXG5cbmNsYXNzIENhcmQgZXh0ZW5kcyBUSFJFRS5NZXNoXG57XG5cdGNvbnN0cnVjdG9yKHR5cGUgPSBUeXBlcy5CTEFOSylcblx0e1xuXHRcdGlmKCFnZW9tZXRyeSB8fCAhbWF0ZXJpYWwpIGluaXRDYXJkRGF0YSgpO1xuXG5cdFx0bGV0IGdlbyA9IGdlb21ldHJ5W3R5cGVdO1xuXHRcdHN1cGVyKGdlbywgbWF0ZXJpYWwpO1xuXHRcdHRoaXMuc2NhbGUuc2V0U2NhbGFyKDAuNyk7XG5cdH1cbn1cblxuY2xhc3MgQmxhbmtDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7IHN1cGVyKCk7IH1cbn1cblxuY2xhc3MgQ3JlZGl0c0NhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5DUkVESVRTKTtcblx0fVxufVxuXG5jbGFzcyBMaWJlcmFsUG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlBPTElDWV9MSUJFUkFMLCBmYWxzZSk7XG5cdH1cbn1cblxuY2xhc3MgRmFzY2lzdFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfRkFTQ0lTVCk7XG5cdH1cbn1cblxuY2xhc3MgVmV0b0NhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5WRVRPKTtcblx0fVxufVxuY2xhc3MgTGliZXJhbFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9MSUJFUkFMKTtcblx0fVxufVxuXG5jbGFzcyBGYXNjaXN0Um9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5ST0xFX0ZBU0NJU1QpO1xuXHR9XG59XG5cbmNsYXNzIEhpdGxlclJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9ISVRMRVIpO1xuXHR9XG59XG5cbmNsYXNzIExpYmVyYWxQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9MSUJFUkFMKTtcblx0fVxufVxuXG5jbGFzcyBGYXNjaXN0UGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfRkFTQ0lTVCk7XG5cdH1cbn1cblxuY2xhc3MgSmFDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuSkEpO1xuXHR9XG59XG5cbmNsYXNzIE5laW5DYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuTkVJTik7XG5cdH1cbn1cblxuXG5leHBvcnQge1xuXHRDYXJkLCBUeXBlcywgQmxhbmtDYXJkLCBDcmVkaXRzQ2FyZCwgVmV0b0NhcmQsXG5cdExpYmVyYWxQb2xpY3lDYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgTGliZXJhbFJvbGVDYXJkLCBGYXNjaXN0Um9sZUNhcmQsXG5cdEhpdGxlclJvbGVDYXJkLCBMaWJlcmFsUGFydHlDYXJkLCBGYXNjaXN0UGFydHlDYXJkLCBKYUNhcmQsIE5laW5DYXJkXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XG5pbXBvcnQge0xpYmVyYWxQb2xpY3lDYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgVmV0b0NhcmR9IGZyb20gJy4vY2FyZCc7XG5cbmxldCBMaWJlcmFsU3BvdHMgPSB7XG5cdHBvc2l0aW9uczogW1xuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuNjkwLCAwLjAwMSwgLTAuNDIpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuMzQ1LCAwLjAwMSwgLTAuNDIpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuMDAyLCAwLjAwMSwgLTAuNDIpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uMzQwLCAwLjAwMSwgLTAuNDIpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uNjkwLCAwLjAwMSwgLTAuNDIpXG5cdF0sXG5cdHF1YXRlcm5pb246IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMC43MDcxMDY3ODExODY1NDc1LCAwKSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNCwgMC40LCAwLjQpXG59LFxuRmFzY2lzdFNwb3RzID0ge1xuXHRwb3NpdGlvbnM6IFtcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygtLjg2MCwgMC4wMDEsIC40MjUpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0uNTE1LCAwLjAwMSwgLjQyNSksXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoLS4xNzAsIDAuMDAxLCAuNDI1KSxcblx0XHRuZXcgVEhSRUUuVmVjdG9yMygwLjE3MCwgMC4wMDEsIC40MjUpLFxuXHRcdG5ldyBUSFJFRS5WZWN0b3IzKDAuNTE4LCAwLjAwMSwgLjQyNSksXG5cdFx0bmV3IFRIUkVFLlZlY3RvcjMoMC44NzAsIDAuMDAxLCAuNDI1KSxcdFxuXHRdLFxuXHRxdWF0ZXJuaW9uOiBuZXcgVEhSRUUuUXVhdGVybmlvbigtMC43MDcxMDY3ODExODY1NDc1LCAwLCAwLCAwLjcwNzEwNjc4MTE4NjU0NzUpLFxuXHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMC40LCAwLjQsIDAuNClcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVUYWJsZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyB0YWJsZSBzdGF0ZVxuXHRcdHRoaXMubGliZXJhbENhcmRzID0gMDtcblx0XHR0aGlzLmZhc2Npc3RDYXJkcyA9IDA7XG5cdFx0dGhpcy5jYXJkcyA9IFtdO1xuXG5cdFx0dGhpcy52ZXRvQ2FyZCA9IG5ldyBWZXRvQ2FyZCgpO1xuXHRcdHRoaXMudmV0b0NhcmQuc2NhbGUuc2V0U2NhbGFyKC41KTtcblx0XHR0aGlzLnZldG9DYXJkLnZpc2libGUgPSBmYWxzZTtcblx0XHR0aGlzLnZldG9DYXJkLm1hdGVyaWFsLnRyYW5zcGFyZW50ID0gdHJ1ZTtcblx0XHR0aGlzLmFkZCh0aGlzLnZldG9DYXJkKTtcblxuXHRcdC8vIGFkZCB0YWJsZSBhc3NldFxuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMudGFibGU7XG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHQvLyBzYXZlIHJlZmVyZW5jZXMgdG8gdGhlIHRleHR1cmVzXG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX3NtYWxsLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbWVkLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbGFyZ2Vcblx0XHRdO1xuXHRcdHRoaXMudGV4dHVyZXMuZm9yRWFjaCh0ZXggPT4gdGV4LmZsaXBZID0gZmFsc2UpO1xuXHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzBdLCB0cnVlKTtcblx0XHRcblx0XHQvLyBwb3NpdGlvbiB0YWJsZVxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAuODgsIDApO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMuY2hhbmdlTW9kZS5iaW5kKHRoaXMpKTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGliZXJhbFBvbGljaWVzJywgdGhpcy51cGRhdGVQb2xpY2llcy5iaW5kKHRoaXMpKTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfZmFzY2lzdFBvbGljaWVzJywgdGhpcy51cGRhdGVQb2xpY2llcy5iaW5kKHRoaXMpKTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfZmFpbGVkVm90ZXMnLCB0aGlzLnVwZGF0ZVBvbGljaWVzLmJpbmQodGhpcykpO1xuXHR9XG5cblx0Y2hhbmdlTW9kZSh7ZGF0YToge2dhbWU6IHtzdGF0ZSwgdHVybk9yZGVyfX19KVxuXHR7XG5cdFx0aWYodHVybk9yZGVyLmxlbmd0aCA+PSA5KVxuXHRcdFx0dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbMl0pO1xuXHRcdGVsc2UgaWYodHVybk9yZGVyLmxlbmd0aCA+PSA3KVxuXHRcdFx0dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbMV0pO1xuXHRcdGVsc2Vcblx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzBdKTtcblx0fVxuXG5cdHNldFRleHR1cmUobmV3VGV4LCBzd2l0Y2hMaWdodG1hcClcblx0e1xuXHRcdHRoaXMubW9kZWwudHJhdmVyc2UobyA9PiB7XG5cdFx0XHRpZihvIGluc3RhbmNlb2YgVEhSRUUuTWVzaClcblx0XHRcdHtcblx0XHRcdFx0aWYoc3dpdGNoTGlnaHRtYXApXG5cdFx0XHRcdFx0by5tYXRlcmlhbC5saWdodE1hcCA9IG8ubWF0ZXJpYWwubWFwO1xuXG5cdFx0XHRcdG8ubWF0ZXJpYWwubWFwID0gbmV3VGV4O1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0dXBkYXRlUG9saWNpZXMoe2RhdGE6IHtnYW1lOiB7bGliZXJhbFBvbGljaWVzLCBmYXNjaXN0UG9saWNpZXMsIGhhbmQsIHN0YXRlfX19KVxuXHR7XG5cdFx0bGV0IHVwZGF0ZXMgPSBbXTtcblxuXHRcdC8vIHF1ZXVlIHVwIGNhcmRzIHRvIGJlIGFkZGVkIHRvIHRoZSB0YWJsZSB0aGlzIHVwZGF0ZVxuXHRcdGZvcih2YXIgaT10aGlzLmxpYmVyYWxDYXJkczsgaTxsaWJlcmFsUG9saWNpZXM7IGkrKyl7XG5cdFx0XHRsZXQgY2FyZCA9IG5ldyBMaWJlcmFsUG9saWN5Q2FyZCgpO1xuXHRcdFx0Y2FyZC5kZXN0aW5hdGlvbiA9IHtcblx0XHRcdFx0cG9zOiBMaWJlcmFsU3BvdHMucG9zaXRpb25zW2ldLFxuXHRcdFx0XHRxdWF0OiBMaWJlcmFsU3BvdHMucXVhdGVybmlvbixcblx0XHRcdFx0c2NhbGU6IExpYmVyYWxTcG90cy5zY2FsZVxuXHRcdFx0fTtcblx0XHRcdHVwZGF0ZXMucHVzaChjYXJkKTtcblx0XHR9XG5cdFx0XG5cdFx0Zm9yKHZhciBpPXRoaXMuZmFzY2lzdENhcmRzOyBpPGZhc2Npc3RQb2xpY2llczsgaSsrKXtcblx0XHRcdGxldCBjYXJkID0gbmV3IEZhc2Npc3RQb2xpY3lDYXJkKCk7XG5cdFx0XHRjYXJkLmRlc3RpbmF0aW9uID0ge1xuXHRcdFx0XHRwb3M6IEZhc2Npc3RTcG90cy5wb3NpdGlvbnNbaV0sXG5cdFx0XHRcdHF1YXQ6IEZhc2Npc3RTcG90cy5xdWF0ZXJuaW9uLFxuXHRcdFx0XHRzY2FsZTogRmFzY2lzdFNwb3RzLnNjYWxlXG5cdFx0XHR9O1xuXHRcdFx0dXBkYXRlcy5wdXNoKGNhcmQpO1xuXHRcdH1cblxuXHRcdGlmKHN0YXRlID09PSAnYWZ0ZXJtYXRoJyAmJiBoYW5kID09PSAxKXtcblx0XHRcdHVwZGF0ZXMucHVzaCh0aGlzLnZldG9DYXJkKTtcblx0XHR9XG5cblx0XHRsZXQgYW5pbWF0aW9uID0gbnVsbDtcblx0XHRpZih1cGRhdGVzLmxlbmd0aCA9PT0gMSlcblx0XHR7XG5cdFx0XHRsZXQgY2FyZCA9IHVwZGF0ZXNbMF07XG5cdFx0XHRpZihjYXJkID09PSB0aGlzLnZldG9DYXJkKVxuXHRcdFx0e1xuXHRcdFx0XHRjYXJkLnZpc2libGUgPSB0cnVlOyBjYXJkLm1hdGVyaWFsLm9wYWNpdHkgPSAxO1xuXHRcdFx0XHRhbmltYXRpb24gPSBBbmltYXRlLmNhcmRGbG91cmlzaChjYXJkKTtcblx0XHRcdFx0YW5pbWF0aW9uLnRoZW4oKCkgPT4gQW5pbWF0ZS52YW5pc2goY2FyZCkpXG5cdFx0XHRcdC50aGVuKCgpID0+IHsgY2FyZC52aXNpYmxlID0gZmFsc2U7IH0pO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmFkZChjYXJkKTtcblx0XHRcdFx0dGhpcy5jYXJkcy5wdXNoKGNhcmQpO1xuXHRcdFx0XHRhbmltYXRpb24gPSBBbmltYXRlLmNhcmRGbG91cmlzaChjYXJkKTtcblx0XHRcdFx0YW5pbWF0aW9uLnRoZW4oKCkgPT4gQW5pbWF0ZS5zaW1wbGUoY2FyZCwgY2FyZC5kZXN0aW5hdGlvbikpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0Ly8gcGxhY2Ugb24gdGhlaXIgc3BvdHNcblx0XHRcdHVwZGF0ZXMuZm9yRWFjaChjYXJkID0+IHtcblx0XHRcdFx0Y2FyZC5wb3NpdGlvbi5jb3B5KGNhcmQuZGVzdGluYXRpb24ucG9zKTtcblx0XHRcdFx0Y2FyZC5xdWF0ZXJuaW9uLmNvcHkoY2FyZC5kZXN0aW5hdGlvbi5xdWF0KTtcblx0XHRcdFx0Y2FyZC5zY2FsZS5jb3B5KGNhcmQuZGVzdGluYXRpb24uc2NhbGUpO1xuXHRcdFx0XHR0aGlzLmFkZChjYXJkKTtcblx0XHRcdFx0dGhpcy5jYXJkcy5wdXNoKGNhcmQpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGFuaW1hdGlvbiA9IFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdH1cblxuXHRcdGlmKHN0YXRlID09PSAnYWZ0ZXJtYXRoJyl7XG5cdFx0XHRhbmltYXRpb24udGhlbigoKSA9PiB7XG5cdFx0XHRcdFNILmRpc3BhdGNoRXZlbnQoe1xuXHRcdFx0XHRcdHR5cGU6ICdwb2xpY3lBbmltRG9uZScsXG5cdFx0XHRcdFx0YnViYmxlczogZmFsc2Vcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZihsaWJlcmFsUG9saWNpZXMgPT09IDAgJiYgZmFzY2lzdFBvbGljaWVzID09PSAwKXtcblx0XHRcdHRoaXMuY2FyZHMuZm9yRWFjaChjID0+IHRoaXMucmVtb3ZlKGMpKTtcblx0XHR9XG5cblx0XHR0aGlzLmxpYmVyYWxDYXJkcyA9IGxpYmVyYWxQb2xpY2llcztcblx0XHR0aGlzLmZhc2Npc3RDYXJkcyA9IGZhc2Npc3RQb2xpY2llcztcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuZnVuY3Rpb24gZ2V0R2FtZUlkKClcbntcblx0Ly8gZmlyc3QgY2hlY2sgdGhlIHVybFxuXHRsZXQgcmUgPSAvWz8mXWdhbWVJZD0oW14mXSspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRpZihyZSl7XG5cdFx0cmV0dXJuIHJlWzFdO1xuXHR9XG5cdGVsc2UgaWYoYWx0c3BhY2UgJiYgYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdHJldHVybiBTSC5lbnYuc2lkO1xuXHR9XG5cdGVsc2Uge1xuXHRcdGxldCBpZCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDAgKTtcblx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZSgnP2dhbWVJZD0nK2lkKTtcblx0fVxufVxuXG5mdW5jdGlvbiBwYXJzZUNTVihzdHIpe1xuXHRpZighc3RyKSByZXR1cm4gW107XG5cdGVsc2UgcmV0dXJuIHN0ci5zcGxpdCgnLCcpO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVF1ZXN0aW9uKHRleHQsIHRleHR1cmUgPSBudWxsKVxue1xuXHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XG5cblx0Ly8gc2V0IHVwIGNhbnZhc1xuXHRsZXQgYm1wO1xuXHRpZighdGV4dHVyZSl7XG5cdFx0Ym1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0Ym1wLndpZHRoID0gNTEyO1xuXHRcdGJtcC5oZWlnaHQgPSAyNTY7XG5cdH1cblx0ZWxzZSB7XG5cdFx0Ym1wID0gdGV4dHVyZS5pbWFnZTtcblx0fVxuXG5cdGxldCBnID0gYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdGcuY2xlYXJSZWN0KDAsIDAsIDUxMiwgMjU2KTtcblx0Zy50ZXh0QWxpZ24gPSAnY2VudGVyJztcblx0Zy5maWxsU3R5bGUgPSAnYmxhY2snO1xuXG5cdC8vIHdyaXRlIHRleHRcblx0Zy5mb250ID0gJ2JvbGQgNTBweCAnK2ZvbnRTdGFjaztcblx0bGV0IGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG5cdGZvcihsZXQgaT0wOyBpPGxpbmVzLmxlbmd0aDsgaSsrKXtcblx0XHRnLmZpbGxUZXh0KGxpbmVzW2ldLCAyNTYsIDUwKzU1KmkpO1xuXHR9XG5cblx0aWYodGV4dHVyZSl7XG5cdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdFx0cmV0dXJuIHRleHR1cmU7XG5cdH1cblx0ZWxzZSB7XG5cdFx0cmV0dXJuIG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKGJtcCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gbWVyZ2VPYmplY3RzKGEsIGIsIGRlcHRoPTIpXG57XG5cdGZ1bmN0aW9uIHVuaXF1ZShlLCBpLCBhKXtcblx0XHRyZXR1cm4gYS5pbmRleE9mKGUpID09PSBpO1xuXHR9XG5cblx0bGV0IGFJc09iaiA9IGEgaW5zdGFuY2VvZiBPYmplY3QsIGJJc09iaiA9IGIgaW5zdGFuY2VvZiBPYmplY3Q7XG5cdGlmKGFJc09iaiAmJiBiSXNPYmogJiYgZGVwdGggPiAwKVxuXHR7XG5cdFx0bGV0IHJlc3VsdCA9IHt9O1xuXHRcdGxldCBrZXlzID0gWy4uLk9iamVjdC5rZXlzKGEpLCAuLi5PYmplY3Qua2V5cyhiKV0uZmlsdGVyKHVuaXF1ZSk7XG5cdFx0Zm9yKGxldCBpPTA7IGk8a2V5cy5sZW5ndGg7IGkrKyl7XG5cdFx0XHRyZXN1bHRba2V5c1tpXV0gPSBtZXJnZU9iamVjdHMoYVtrZXlzW2ldXSwgYltrZXlzW2ldXSwgZGVwdGgtMSk7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0ZWxzZSBpZihiICE9PSB1bmRlZmluZWQpXG5cdFx0cmV0dXJuIGI7XG5cdGVsc2Vcblx0XHRyZXR1cm4gYTtcbn1cblxuZnVuY3Rpb24gbGF0ZVVwZGF0ZShmbilcbntcblx0cmV0dXJuICguLi5hcmdzKSA9PiB7XG5cdFx0c2V0VGltZW91dCgoKSA9PiBmbiguLi5hcmdzKSwgMTUpO1xuXHR9O1xufVxuXG5leHBvcnQgeyBnZXRHYW1lSWQsIHBhcnNlQ1NWLCBnZW5lcmF0ZVF1ZXN0aW9uLCBtZXJnZU9iamVjdHMsIGxhdGVVcGRhdGUgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE5hbWVwbGF0ZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXQpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC42MzUsIDAuMjIpO1xuXHRcdHNlYXQuYWRkKHRoaXMpO1xuXG5cdFx0Ly8gYWRkIDNkIG1vZGVsXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy5uYW1lcGxhdGUuY2hpbGRyZW5bMF0uY2xvbmUoKTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCBNYXRoLlBJLzIpO1xuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xuXG5cdFx0Ly8gZ2VuZXJhdGUgbWF0ZXJpYWxcblx0XHR0aGlzLmJtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMuYm1wLndpZHRoID0gTmFtZXBsYXRlLnRleHR1cmVTaXplO1xuXHRcdHRoaXMuYm1wLmhlaWdodCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAvIDI7XG5cdFx0dGhpcy5tb2RlbC5tYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG5cdFx0XHRtYXA6IG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKHRoaXMuYm1wKVxuXHRcdH0pO1xuXG5cdFx0Ly8gY3JlYXRlIGxpc3RlbmVyIHByb3hpZXNcblx0XHR0aGlzLl9ob3ZlckJlaGF2aW9yID0gbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJDb2xvcih7XG5cdFx0XHRjb2xvcjogbmV3IFRIUkVFLkNvbG9yKDB4ZmZhOGE4KVxuXHRcdH0pO1xuXHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0dGhpcy5tb2RlbC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdGlmKHN0YXRlID09PSAnc2V0dXAnKVxuXHRcdFx0XHR0aGlzLm1vZGVsLmFkZEJlaGF2aW9yKHRoaXMuX2hvdmVyQmVoYXZpb3IpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aGlzLm1vZGVsLnJlbW92ZUJlaGF2aW9yKHRoaXMuX2hvdmVyQmVoYXZpb3IpO1xuXHRcdH0pO1xuXHR9XG5cblx0dXBkYXRlVGV4dCh0ZXh0KVxuXHR7XG5cdFx0bGV0IGZvbnRTaXplID0gNy8zMiAqIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAqIDAuNjU7XG5cblx0XHQvLyBzZXQgdXAgY2FudmFzXG5cdFx0bGV0IGcgPSB0aGlzLmJtcC5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdGxldCBmb250U3RhY2sgPSAnXCJIZWx2ZXRpY2EgTmV1ZVwiLCBIZWx2ZXRpY2EsIEFyaWFsLCBTYW5zLVNlcmlmJztcblx0XHRnLmZpbGxTdHlsZSA9ICcjMjIyJztcblx0XHRnLmZpbGxSZWN0KDAsIDAsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSwgTmFtZXBsYXRlLnRleHR1cmVTaXplLzIpO1xuXHRcdGcuZm9udCA9IGBib2xkICR7Zm9udFNpemV9cHggJHtmb250U3RhY2t9YDtcblx0XHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xuXHRcdGcuZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHRnLmZpbGxUZXh0KHRleHQsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yLCAoMC40MiAtIDAuMTIpKihOYW1lcGxhdGUudGV4dHVyZVNpemUvMikpO1xuXG5cdFx0dGhpcy5tb2RlbC5tYXRlcmlhbC5tYXAubmVlZHNVcGRhdGUgPSB0cnVlO1xuXHR9XG5cblx0Y2xpY2soZSlcblx0e1xuXHRcdGlmKFNILmdhbWUuc3RhdGUgIT09ICdzZXR1cCcpIHJldHVybjtcblxuXHRcdGlmKCF0aGlzLnNlYXQub3duZXIpXG5cdFx0XHR0aGlzLnJlcXVlc3RKb2luKCk7XG5cdFx0ZWxzZSBpZih0aGlzLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcblx0XHRcdHRoaXMucmVxdWVzdExlYXZlKCk7XG5cdFx0ZWxzZSBpZihTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxuXHRcdFx0dGhpcy5yZXF1ZXN0S2ljaygpO1xuXHR9XG5cblx0cmVxdWVzdEpvaW4oKVxuXHR7XG5cdFx0U0guc29ja2V0LmVtaXQoJ2pvaW4nLCBPYmplY3QuYXNzaWduKHtzZWF0TnVtOiB0aGlzLnNlYXQuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpO1xuXHR9XG5cblx0cmVxdWVzdExlYXZlKClcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblx0XHRpZighc2VsZi5xdWVzdGlvbilcblx0XHR7XG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VsZi5zZWF0LmJhbGxvdC5hc2tRdWVzdGlvbignQXJlIHlvdSBzdXJlIHlvdVxcbndhbnQgdG8gbGVhdmU/JywgJ2xvY2FsX2xlYXZlJylcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xuXHRcdFx0XHRpZihjb25maXJtKXtcblx0XHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbGVhdmUnLCBTSC5sb2NhbFVzZXIuaWQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNlbGYucXVlc3Rpb24gPSBudWxsO1xuXHRcdFx0fSlcblx0XHRcdC5jYXRjaCgoKSA9PiB7IHNlbGYucXVlc3Rpb24gPSBudWxsOyB9KTtcblx0XHR9XG5cdH1cblxuXHRyZXF1ZXN0S2ljaygpXG5cdHtcblx0XHRsZXQgc2VsZiA9IHRoaXM7XG5cdFx0aWYoIXNlbGYucXVlc3Rpb24pXG5cdFx0e1xuXHRcdFx0bGV0IHNlYXQgPSBTSC5zZWF0c1tTSC5wbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0uc2VhdE51bV07XG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VhdC5iYWxsb3QuYXNrUXVlc3Rpb24oXG5cdFx0XHRcdCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byB0cnkgdG8ga2lja1xcbidcblx0XHRcdFx0K1NILnBsYXllcnNbc2VsZi5zZWF0Lm93bmVyXS5kaXNwbGF5TmFtZSxcblx0XHRcdFx0J2xvY2FsX2tpY2snXG5cdFx0XHQpXG5cdFx0XHQudGhlbihjb25maXJtID0+IHtcblx0XHRcdFx0aWYoY29uZmlybSl7XG5cdFx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2tpY2snLCBTSC5sb2NhbFVzZXIuaWQsIHNlbGYuc2VhdC5vd25lcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xuXHRcdH1cblx0fVxufVxuXG5OYW1lcGxhdGUudGV4dHVyZVNpemUgPSAyNTY7XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgKiBhcyBCYWxsb3RUeXBlIGZyb20gJy4vYmFsbG90JztcblxuZnVuY3Rpb24gdXBkYXRlVm90ZXNJblByb2dyZXNzKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcbntcblx0bGV0IGJhbGxvdCA9IHRoaXM7XG5cdGlmKCFiYWxsb3Quc2VhdC5vd25lcikgcmV0dXJuO1xuXG5cdGxldCB2aXBzID0gZ2FtZS52b3Rlc0luUHJvZ3Jlc3M7XG5cdGxldCBibGFja2xpc3RlZFZvdGVzID0gdmlwcy5maWx0ZXIoaWQgPT4ge1xuXHRcdGxldCB2cyA9IFsuLi52b3Rlc1tpZF0ueWVzVm90ZXJzLCAuLi52b3Rlc1tpZF0ubm9Wb3RlcnNdO1xuXHRcdGxldCBudiA9IHZvdGVzW2lkXS5ub25Wb3RlcnM7XG5cdFx0cmV0dXJuIG52LmluY2x1ZGVzKGJhbGxvdC5zZWF0Lm93bmVyKSB8fCB2cy5pbmNsdWRlcyhiYWxsb3Quc2VhdC5vd25lcik7XG5cdH0pO1xuXHRsZXQgbmV3Vm90ZXMgPSB2aXBzLmZpbHRlcihcblx0XHRpZCA9PiAoIVNILmdhbWUudm90ZXNJblByb2dyZXNzIHx8ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcy5pbmNsdWRlcyhpZCkpICYmICFibGFja2xpc3RlZFZvdGVzLmluY2x1ZGVzKGlkKVxuXHQpO1xuXHRsZXQgZmluaXNoZWRWb3RlcyA9ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcyA/IGJsYWNrbGlzdGVkVm90ZXNcblx0XHQ6IFNILmdhbWUudm90ZXNJblByb2dyZXNzLmZpbHRlcihpZCA9PiAhdmlwcy5pbmNsdWRlcyhpZCkpLmNvbmNhdChibGFja2xpc3RlZFZvdGVzKTtcblxuXHRuZXdWb3Rlcy5mb3JFYWNoKHZJZCA9PlxuXHR7XG5cdFx0Ly8gZ2VuZXJhdGUgbmV3IHF1ZXN0aW9uIHRvIGFza1xuXHRcdGxldCBxdWVzdGlvblRleHQsIG9wdHMgPSB7fTtcblx0XHRpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdlbGVjdCcpe1xuXHRcdFx0cXVlc3Rpb25UZXh0ID0gcGxheWVyc1tnYW1lLnByZXNpZGVudF0uZGlzcGxheU5hbWVcblx0XHRcdFx0KyAnIGZvciBwcmVzaWRlbnQgYW5kICdcblx0XHRcdFx0KyBwbGF5ZXJzW2dhbWUuY2hhbmNlbGxvcl0uZGlzcGxheU5hbWVcblx0XHRcdFx0KyAnIGZvciBjaGFuY2VsbG9yPyc7XG5cdFx0fVxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAnam9pbicpe1xuXHRcdFx0cXVlc3Rpb25UZXh0ID0gdm90ZXNbdklkXS5kYXRhICsgJ1xcbnRvIGpvaW4/Jztcblx0XHR9XG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdraWNrJyl7XG5cdFx0XHRxdWVzdGlvblRleHQgPSAnVm90ZSB0byBraWNrXFxuJ1xuXHRcdFx0XHQrIHBsYXllcnNbdm90ZXNbdklkXS50YXJnZXQxXS5kaXNwbGF5TmFtZVxuXHRcdFx0XHQrICc/Jztcblx0XHR9XG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdjb25maXJtUm9sZScpXG5cdFx0e1xuXHRcdFx0b3B0cy5jaG9pY2VzID0gQmFsbG90VHlwZS5DT05GSVJNO1xuXHRcdFx0bGV0IHJvbGU7XG5cdFx0XHRpZihiYWxsb3Quc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKXtcblx0XHRcdFx0cm9sZSA9IHBsYXllcnNbU0gubG9jYWxVc2VyLmlkXS5yb2xlO1xuXHRcdFx0XHRyb2xlID0gcm9sZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHJvbGUuc2xpY2UoMSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0cm9sZSA9ICc8UkVEQUNURUQ+Jztcblx0XHRcdH1cblx0XHRcdHF1ZXN0aW9uVGV4dCA9ICdZb3VyIHJvbGU6XFxuJyArIHJvbGU7XG5cdFx0fVxuXG5cdFx0aWYocXVlc3Rpb25UZXh0KVxuXHRcdHtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbihxdWVzdGlvblRleHQsIHZJZCwgb3B0cylcblx0XHRcdC50aGVuKGFuc3dlciA9PiB7XG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCd2b3RlJywgdklkLCBTSC5sb2NhbFVzZXIuaWQsIGFuc3dlcik7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IGNvbnNvbGUubG9nKCdWb3RlIHNjcnViYmVkOicsIHZJZCkpO1xuXHRcdH1cblx0fSk7XG5cblx0aWYoZmluaXNoZWRWb3Rlcy5pbmNsdWRlcyhiYWxsb3QuZGlzcGxheWVkKSl7XG5cdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0fVxufVxuXG5mdW5jdGlvbiB1cGRhdGVTdGF0ZSh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcbntcblx0bGV0IGJhbGxvdCA9IHRoaXM7XG5cblx0ZnVuY3Rpb24gY2hvb3NlUGxheWVyKHF1ZXN0aW9uLCBjb25maXJtUXVlc3Rpb24sIGlkKVxuXHR7XG5cdFx0ZnVuY3Rpb24gY29uZmlybVBsYXllcih1c2VySWQpXG5cdFx0e1xuXHRcdFx0bGV0IHVzZXJuYW1lID0gU0gucGxheWVyc1t1c2VySWRdLmRpc3BsYXlOYW1lO1xuXHRcdFx0bGV0IHRleHQgPSBjb25maXJtUXVlc3Rpb24ucmVwbGFjZSgne30nLCB1c2VybmFtZSk7XG5cdFx0XHRyZXR1cm4gYmFsbG90LmFza1F1ZXN0aW9uKHRleHQsICdsb2NhbF8nK2lkKydfY29uZmlybScpXG5cdFx0XHQudGhlbihjb25maXJtZWQgPT4ge1xuXHRcdFx0XHRpZihjb25maXJtZWQpe1xuXHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodXNlcklkKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gY2hvb3NlUGxheWVyKHF1ZXN0aW9uLCBjb25maXJtUXVlc3Rpb24sIGlkKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGJhbGxvdC5hc2tRdWVzdGlvbihxdWVzdGlvbiwgJ2xvY2FsXycraWQsIHtjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVH0pXG5cdFx0LnRoZW4oY29uZmlybVBsYXllcik7XG5cdH1cblxuXHRmdW5jdGlvbiBoaWRlTm9taW5hdGVQbGFjZWhvbGRlcih7ZGF0YToge2dhbWV9fSlcblx0e1xuXHRcdGlmKGdhbWUuc3RhdGUgIT09ICdub21pbmF0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2NoYW5jZWxsb3InKXtcblx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XG5cdFx0fVxuXHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVOb21pbmF0ZVBsYWNlaG9sZGVyKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGhpZGVQb2xpY3lQbGFjZWhvbGRlcih7ZGF0YToge2dhbWV9fSlcblx0e1xuXHRcdGlmKGdhbWUuc3RhdGUgIT09ICdwb2xpY3kxJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcG9saWN5MScgfHxcblx0XHRcdGdhbWUuc3RhdGUgIT09ICdwb2xpY3kyJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcG9saWN5Midcblx0XHQpe1xuXHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHR9XG5cdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZVBvbGljeVBsYWNlaG9sZGVyKTtcblx0fVxuXG5cdGlmKGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRjaG9vc2VQbGF5ZXIoJ0Nob29zZSB5b3VyXFxuY2hhbmNlbGxvciEnLCAnTmFtZSB7fVxcbmFzIGNoYW5jZWxsb3I/JywgJ25vbWluYXRlJylcblx0XHRcdC50aGVuKHVzZXJJZCA9PiB7XG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCdub21pbmF0ZScsIHVzZXJJZCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0Nob29zZSB5b3VyXFxuY2hhbmNlbGxvciEnLCAnd2FpdF9mb3JfY2hhbmNlbGxvcicsIHtcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXG5cdFx0XHRcdGZha2U6IHRydWUsXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ25vbWluYXRlJ1xuXHRcdFx0fSk7XG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlTm9taW5hdGVQbGFjZWhvbGRlcik7XG5cdFx0fVxuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTEnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGxldCBvcHRzID0ge2Nob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLCBwb2xpY3lIYW5kOiBnYW1lLmhhbmR9O1xuXHRcdGlmKFNILmxvY2FsVXNlci5pZCAhPT0gZ2FtZS5wcmVzaWRlbnQpe1xuXHRcdFx0T2JqZWN0LmFzc2lnbihvcHRzLCB7ZmFrZTogdHJ1ZSwgaXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAncG9saWN5MSd9KTtcblx0XHR9XG5cblx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0Nob29zZSBvbmVcXG50byBkaXNjYXJkIScsICdsb2NhbF9wb2xpY3kxJywgb3B0cylcblx0XHQudGhlbihkaXNjYXJkID0+IHtcblx0XHRcdFNILnNvY2tldC5lbWl0KCdkaXNjYXJkX3BvbGljeTEnLCBkaXNjYXJkKTtcblx0XHR9KTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlUG9saWN5UGxhY2Vob2xkZXIpO1xuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTInICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLmNoYW5jZWxsb3IpXG5cdHtcblx0XHRsZXQgb3B0cyA9IHtcblx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLFxuXHRcdFx0cG9saWN5SGFuZDogZ2FtZS5oYW5kLFxuXHRcdFx0aW5jbHVkZVZldG86IGdhbWUuZmFzY2lzdFBvbGljaWVzID09PSA1ICYmICFiYWxsb3QuYmxvY2tWZXRvXG5cdFx0fTtcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgIT09IGdhbWUuY2hhbmNlbGxvcil7XG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwb2xpY3kyJ30pO1xuXHRcdH1cblxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQ2hvb3NlIG9uZVxcbnRvIGRpc2NhcmQhJywgJ2xvY2FsX3BvbGljeTInLCBvcHRzKVxuXHRcdC50aGVuKGRpc2NhcmQgPT4ge1xuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2Rpc2NhcmRfcG9saWN5MicsIGRpc2NhcmQpO1xuXHRcdH0sIGVyciA9PiBjb25zb2xlLmVycm9yKGVycikpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVQb2xpY3lQbGFjZWhvbGRlcik7XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnaW52ZXN0aWdhdGUnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xuXHRcdFx0Y2hvb3NlUGxheWVyKCdFeGVjdXRpdmUgcG93ZXI6IENob29zZSBvbmUgcGxheWVyIHRvIGludmVzdGlnYXRlIScsICdJbnZlc3RpZ2F0ZSB7fT8nLCAnaW52ZXN0aWdhdGUnKVxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcblx0XHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHRcdFx0dHlwZTogJ2ludmVzdGlnYXRlJyxcblx0XHRcdFx0XHRkYXRhOiB1c2VySWRcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIG9uZSBwbGF5ZXIgdG8gaW52ZXN0aWdhdGUhJywgJ3dhaXRfZm9yX2ludmVzdGlnYXRlJywge1xuXHRcdFx0XHRjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCxcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAnaW52ZXN0aWdhdGUnXG5cdFx0XHR9KTtcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdFx0aWYoc3RhdGUgIT09ICdpbnZlc3RpZ2F0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2ludmVzdGlnYXRlJylcblx0XHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHRcdFx0fTtcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0fVxuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BlZWsnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGxldCBvcHRzID0ge2Nob2ljZXM6IEJhbGxvdFR5cGUuUE9MSUNZLCBwb2xpY3lIYW5kOiA4IHwgKGdhbWUuZGVjayY3KX07XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkICE9PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwZWVrJ30pO1xuXHRcdH1cblxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBUaGUgbmV4dCBwcmVzaWRlbnRcXCdzIFwicmFuZG9tXCIgcG9saWNpZXMnLCAnbG9jYWxfcGVlaycsIG9wdHMpXG5cdFx0LnRoZW4oZGlzY2FyZCA9PiB7XG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnY29udGludWUnKTtcblx0XHR9KTtcblx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XG5cdFx0XHRpZihzdGF0ZSAhPT0gJ3BlZWsnICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wZWVrJylcblx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0fTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ25hbWVTdWNjZXNzb3InICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xuXHRcdFx0Y2hvb3NlUGxheWVyKCdFeGVjdXRpdmUgcG93ZXI6IENob29zZSB0aGUgbmV4dCBwcmVzaWRlbnQhJywgJ3t9IGZvciBwcmVzaWRlbnQ/JywgJ25hbWVTdWNjZXNzb3InKVxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ25hbWVfc3VjY2Vzc29yJywgdXNlcklkKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgdGhlIG5leHQgcHJlc2lkZW50IScsICd3YWl0X2Zvcl9zdWNjZXNzb3InLCB7XG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxuXHRcdFx0XHRmYWtlOiB0cnVlLFxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICduYW1lU3VjY2Vzc29yJ1xuXHRcdFx0fSk7XG5cdFx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XG5cdFx0XHRcdGlmKHN0YXRlICE9PSAnbmFtZVN1Y2Nlc3NvcicgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX3N1Y2Nlc3NvcicpXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHRcdH07XG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHRcdH1cblx0fVxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdleGVjdXRlJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXG5cdHtcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcblx0XHRcdGNob29zZVBsYXllcignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgYSBwbGF5ZXIgdG8gZXhlY3V0ZSEnLCAnRXhlY3V0ZSB7fT8nLCAnZXhlY3V0ZScpXG5cdFx0XHQudGhlbih1c2VySWQgPT4ge1xuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnZXhlY3V0ZScsIHVzZXJJZCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIGEgcGxheWVyIHRvIGV4ZWN1dGUhJywgJ3dhaXRfZm9yX2V4ZWN1dGUnLCB7XG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxuXHRcdFx0XHRmYWtlOiB0cnVlLFxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdleGVjdXRlJ1xuXHRcdFx0fSk7XG5cdFx0XHRsZXQgY2xlYW5VcEZha2VWb3RlID0gKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XG5cdFx0XHRcdGlmKHN0YXRlICE9PSAnZXhlY3V0ZScgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ3dhaXRfZm9yX2V4ZWN1dGUnKVxuXHRcdFx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0XHR9O1xuXHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHR9XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAndmV0bycgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0FwcHJvdmUgdmV0bz8nLCAnbG9jYWxfdmV0bycpLnRoZW4oYXBwcm92ZWQgPT4ge1xuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnY29uZmlybV92ZXRvJywgYXBwcm92ZWQpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdBcHByb3ZlIHZldG8/JywgJ3dhaXRfZm9yX3ZldG8nLCB7XG5cdFx0XHRcdGZha2U6IHRydWUsXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3ZldG8nXG5cdFx0XHR9KTtcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdFx0aWYoc3RhdGUgIT09ICd2ZXRvJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfdmV0bycpXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHRcdH1cblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0fVxuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3ZldG8nKXtcblx0XHRiYWxsb3QuYmxvY2tWZXRvID0gdHJ1ZTtcblx0fVxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnKXtcblx0XHRiYWxsb3QuYmxvY2tWZXRvID0gZmFsc2U7XG5cdH1cbn1cblxuZXhwb3J0IHt1cGRhdGVWb3Rlc0luUHJvZ3Jlc3MsIHVwZGF0ZVN0YXRlfTsiLCIndXNlIHN0cmljdCc7XG5cbi8qXG4qIERlY2tzIGhhdmUgMTcgY2FyZHM6IDYgbGliZXJhbCwgMTEgZmFzY2lzdC5cbiogSW4gYml0LXBhY2tlZCBib29sZWFuIGFycmF5cywgMSBpcyBsaWJlcmFsLCAwIGlzIGZhc2Npc3QuXG4qIFRoZSBtb3N0IHNpZ25pZmljYW50IGJpdCBpcyBhbHdheXMgMS5cbiogRS5nLiAwYjEwMTAwMSByZXByZXNlbnRzIGEgZGVjayB3aXRoIDIgbGliZXJhbCBhbmQgMyBmYXNjaXN0IGNhcmRzXG4qL1xuXG5sZXQgRlVMTF9ERUNLID0gMHgyMDAzZixcblx0RkFTQ0lTVCA9IDAsXG5cdExJQkVSQUwgPSAxO1xuXG5sZXQgcG9zaXRpb25zID0gW1xuXHQweDEsIDB4MiwgMHg0LCAweDgsXG5cdDB4MTAsIDB4MjAsIDB4NDAsIDB4ODAsXG5cdDB4MTAwLCAweDIwMCwgMHg0MDAsIDB4ODAwLFxuXHQweDEwMDAsIDB4MjAwMCwgMHg0MDAwLCAweDgwMDAsXG5cdDB4MTAwMDAsIDB4MjAwMDAsIDB4NDAwMDBcbl07XG5cbmZ1bmN0aW9uIGxlbmd0aChkZWNrKVxue1xuXHRyZXR1cm4gcG9zaXRpb25zLmZpbmRJbmRleChzID0+IHMgPiBkZWNrKSAtMTtcbn1cblxuZnVuY3Rpb24gc2h1ZmZsZShkZWNrKVxue1xuXHRsZXQgbCA9IGxlbmd0aChkZWNrKTtcblx0Zm9yKGxldCBpPWwtMTsgaT4wOyBpLS0pXG5cdHtcblx0XHRsZXQgbyA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGkpO1xuXHRcdGxldCBpVmFsID0gZGVjayAmIDEgPDwgaSwgb1ZhbCA9IGRlY2sgJiAxIDw8IG87XG5cdFx0bGV0IHN3YXBwZWQgPSBpVmFsID4+PiBpLW8gfCBvVmFsIDw8IGktbztcblx0XHRkZWNrID0gZGVjayAtIGlWYWwgLSBvVmFsICsgc3dhcHBlZDtcblx0fVxuXG5cdHJldHVybiBkZWNrO1xufVxuXG5mdW5jdGlvbiBkcmF3VGhyZWUoZClcbntcblx0cmV0dXJuIGQgPCA4ID8gWzEsIGRdIDogW2QgPj4+IDMsIDggfCBkICYgN107XG59XG5cbmZ1bmN0aW9uIGRpc2NhcmRPbmUoZGVjaywgcG9zKVxue1xuXHRsZXQgYm90dG9tSGFsZiA9IGRlY2sgJiAoMSA8PCBwb3MpLTE7XG5cdGxldCB0b3BIYWxmID0gZGVjayAmIH4oKDEgPDwgcG9zKzEpLTEpO1xuXHR0b3BIYWxmID4+Pj0gMTtcblx0bGV0IG5ld0RlY2sgPSB0b3BIYWxmIHwgYm90dG9tSGFsZjtcblx0XG5cdGxldCB2YWwgPSAoZGVjayAmIDE8PHBvcykgPj4+IHBvcztcblxuXHRyZXR1cm4gW25ld0RlY2ssIHZhbF07XG59XG5cbmZ1bmN0aW9uIGFwcGVuZChkZWNrLCB2YWwpXG57XG5cdHJldHVybiBkZWNrIDw8IDEgfCB2YWw7XG59XG5cbmZ1bmN0aW9uIHRvQXJyYXkoZGVjaylcbntcblx0bGV0IGFyciA9IFtdO1xuXHR3aGlsZShkZWNrID4gMSl7XG5cdFx0YXJyLnB1c2goZGVjayAmIDEpO1xuXHRcdGRlY2sgPj4+PSAxO1xuXHR9XG5cblx0cmV0dXJuIGFycjtcbn1cblxuZXhwb3J0IHtsZW5ndGgsIHNodWZmbGUsIGRyYXdUaHJlZSwgZGlzY2FyZE9uZSwgYXBwZW5kLCB0b0FycmF5LCBGVUxMX0RFQ0ssIExJQkVSQUwsIEZBU0NJU1R9OyIsIid1c2Ugc3RyaWN0OydcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCB7IEJsYW5rQ2FyZCwgSmFDYXJkLCBOZWluQ2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxQb2xpY3lDYXJkLCBWZXRvQ2FyZCB9IGZyb20gJy4vY2FyZCc7XG5pbXBvcnQgeyBnZW5lcmF0ZVF1ZXN0aW9uLCBsYXRlVXBkYXRlIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyBCUCBmcm9tICcuL2JhbGxvdHByb2Nlc3Nvcic7XG5pbXBvcnQgKiBhcyBCUEJBIGZyb20gJy4vYnBiYSc7XG5pbXBvcnQge05UZXh0LCBQbGFjZWhvbGRlck1lc2h9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XG5cbmxldCBQTEFZRVJTRUxFQ1QgPSAwO1xubGV0IENPTkZJUk0gPSAxO1xubGV0IEJJTkFSWSA9IDI7XG5sZXQgUE9MSUNZID0gMztcblxuY2xhc3MgQmFsbG90IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC4zLCAwLjI1KTtcblx0XHR0aGlzLnJvdGF0aW9uLnNldCguNSwgTWF0aC5QSSwgMCk7XG5cdFx0c2VhdC5hZGQodGhpcyk7XG5cblx0XHR0aGlzLmxhc3RRdWV1ZWQgPSBQcm9taXNlLnJlc29sdmUoKTtcblx0XHR0aGlzLmRpc3BsYXllZCA9IG51bGw7XG5cdFx0dGhpcy5ibG9ja1ZldG8gPSBmYWxzZTtcblxuXHRcdHRoaXMuX3llc0NsaWNrSGFuZGxlciA9IG51bGw7XG5cdFx0dGhpcy5fbm9DbGlja0hhbmRsZXIgPSBudWxsO1xuXHRcdHRoaXMuX25vbWluYXRlSGFuZGxlciA9IG51bGw7XG5cdFx0dGhpcy5fY2FuY2VsSGFuZGxlciA9IG51bGw7XG5cblx0XHR0aGlzLmphQ2FyZCA9IG5ldyBKYUNhcmQoKTtcblx0XHR0aGlzLm5laW5DYXJkID0gbmV3IE5laW5DYXJkKCk7XG5cdFx0W3RoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkXS5mb3JFYWNoKGMgPT4ge1xuXHRcdFx0Yy5wb3NpdGlvbi5zZXQoYyBpbnN0YW5jZW9mIEphQ2FyZCA/IC0wLjEgOiAwLjEsIC0wLjEsIDApO1xuXHRcdFx0Yy5zY2FsZS5zZXRTY2FsYXIoMC4xNSk7XG5cdFx0XHRjLnZpc2libGUgPSBmYWxzZTtcblx0XHR9KTtcblx0XHR0aGlzLmFkZCh0aGlzLmphQ2FyZCwgdGhpcy5uZWluQ2FyZCk7XG5cdFx0dGhpcy5wb2xpY2llcyA9IFtdO1xuXG5cdFx0Ly9sZXQgZ2VvID0gbmV3IFRIUkVFLlBsYW5lQnVmZmVyR2VvbWV0cnkoMC40LCAwLjIpO1xuXHRcdC8vbGV0IG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7dHJhbnNwYXJlbnQ6IHRydWUsIHNpZGU6IFRIUkVFLkRvdWJsZVNpZGV9KTtcblx0XHR0aGlzLnF1ZXN0aW9uID0gUGxhY2Vob2xkZXJNZXNoLmNsb25lKCk7XG5cdFx0dGhpcy5xdWVzdGlvbi5wb3NpdGlvbi5zZXQoMCwgMC4wNSwgMCk7XG5cdFx0dGhpcy5xdWVzdGlvbi5zY2FsZS5zZXRTY2FsYXIoLjUpO1xuXHRcdHRoaXMucXVlc3Rpb24udmlzaWJsZSA9IGZhbHNlO1xuXHRcdHRoaXMuYWRkKHRoaXMucXVlc3Rpb24pO1xuXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50ID0gbmV3IE5UZXh0KHRoaXMucXVlc3Rpb24pO1xuXHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe3dpZHRoOiAxLjEsIGhlaWdodDogLjQsIGZvbnRTaXplOiAxLCB2ZXJ0aWNhbEFsaWduOiAndG9wJ30pO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3ZvdGVzSW5Qcm9ncmVzcycsIEJQLnVwZGF0ZVZvdGVzSW5Qcm9ncmVzcy5iaW5kKHRoaXMpKTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBsYXRlVXBkYXRlKEJQLnVwZGF0ZVN0YXRlLmJpbmQodGhpcykpKTtcblx0fVxuXG5cdGFza1F1ZXN0aW9uKHFUZXh0LCBpZCwge2Nob2ljZXMgPSBCSU5BUlksIHBvbGljeUhhbmQgPSAweDEsIGluY2x1ZGVWZXRvID0gZmFsc2UsIGZha2UgPSBmYWxzZSwgaXNJbnZhbGlkID0gKCkgPT4gdHJ1ZX0gPSB7fSlcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblxuXHRcdGZ1bmN0aW9uIGlzVm90ZVZhbGlkKClcblx0XHR7XG5cdFx0XHRsZXQgaXNGYWtlVmFsaWQgPSBmYWtlICYmICFpc0ludmFsaWQoKTtcblx0XHRcdGxldCBpc0xvY2FsVm90ZSA9IC9ebG9jYWwvLnRlc3QoaWQpO1xuXHRcdFx0bGV0IGlzRmlyc3RVcGRhdGUgPSAhU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3M7XG5cdFx0XHRsZXQgdm90ZSA9IFNILnZvdGVzW2lkXTtcblx0XHRcdGxldCB2b3RlcnMgPSB2b3RlID8gWy4uLnZvdGUueWVzVm90ZXJzLCAuLi52b3RlLm5vVm90ZXJzXSA6IFtdO1xuXHRcdFx0bGV0IGFscmVhZHlWb3RlZCA9IHZvdGVycy5pbmNsdWRlcyhzZWxmLnNlYXQub3duZXIpO1xuXHRcdFx0cmV0dXJuIGlzTG9jYWxWb3RlIHx8IGlzRmlyc3RVcGRhdGUgfHwgaXNGYWtlVmFsaWQgfHwgdm90ZSAmJiAhYWxyZWFkeVZvdGVkO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGhvb2tVcFF1ZXN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UocXVlc3Rpb25FeGVjdXRvcik7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcXVlc3Rpb25FeGVjdXRvcihyZXNvbHZlLCByZWplY3QpXG5cdFx0e1xuXHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBhbnN3ZXIgaXMgc3RpbGwgcmVsZXZhbnRcblx0XHRcdGlmKCFpc1ZvdGVWYWxpZCgpKXtcblx0XHRcdFx0cmV0dXJuIHJlamVjdCgnVm90ZSBubyBsb25nZXIgdmFsaWQnKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc2hvdyB0aGUgYmFsbG90XG5cdFx0XHQvL3NlbGYucXVlc3Rpb24ubWF0ZXJpYWwubWFwID0gZ2VuZXJhdGVRdWVzdGlvbihxVGV4dCwgc2VsZi5xdWVzdGlvbi5tYXRlcmlhbC5tYXApO1xuXHRcdFx0c2VsZi50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDogYCR7cVRleHR9YH0pO1xuXHRcdFx0c2VsZi5xdWVzdGlvbi52aXNpYmxlID0gdHJ1ZTtcblxuXHRcdFx0Ly8gaG9vayB1cCBxL2EgY2FyZHNcblx0XHRcdGlmKGNob2ljZXMgPT09IENPTkZJUk0gfHwgY2hvaWNlcyA9PT0gQklOQVJZKXtcblx0XHRcdFx0c2VsZi5qYUNhcmQudmlzaWJsZSA9IHRydWU7XG5cdFx0XHRcdGlmKCFmYWtlKVxuXHRcdFx0XHRcdHNlbGYuamFDYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCgneWVzJywgcmVzb2x2ZSwgcmVqZWN0KSk7XG5cdFx0XHR9XG5cdFx0XHRpZihjaG9pY2VzID09PSBCSU5BUlkpe1xuXHRcdFx0XHRzZWxmLm5laW5DYXJkLnZpc2libGUgPSB0cnVlO1xuXHRcdFx0XHRpZighZmFrZSlcblx0XHRcdFx0XHRzZWxmLm5laW5DYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCgnbm8nLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUExBWUVSU0VMRUNUICYmICFmYWtlKXtcblx0XHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigncGxheWVyU2VsZWN0JywgcmVzcG9uZCgncGxheWVyJywgcmVzb2x2ZSwgcmVqZWN0KSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKGNob2ljZXMgPT09IFBPTElDWSl7XG5cdFx0XHRcdGxldCBjYXJkcyA9IEJQQkEudG9BcnJheShwb2xpY3lIYW5kKTtcblx0XHRcdFx0aWYoaW5jbHVkZVZldG8pIGNhcmRzLnB1c2goLTEpO1xuXHRcdFx0XHRjYXJkcy5mb3JFYWNoKCh2YWwsIGksIGFycikgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxldCBjYXJkID0gbnVsbDtcblx0XHRcdFx0XHRpZihmYWtlKVxuXHRcdFx0XHRcdFx0Y2FyZCA9IG5ldyBCbGFua0NhcmQoKTtcblx0XHRcdFx0XHRlbHNlIGlmKHZhbCA9PT0gLTEpXG5cdFx0XHRcdFx0XHRjYXJkID0gbmV3IFZldG9DYXJkKCk7XG5cdFx0XHRcdFx0ZWxzZSBpZih2YWwgPT09IEJQQkEuTElCRVJBTClcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgTGliZXJhbFBvbGljeUNhcmQoKTtcblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRjYXJkID0gbmV3IEZhc2Npc3RQb2xpY3lDYXJkKCk7XG5cblx0XHRcdFx0XHRjYXJkLnNjYWxlLnNldFNjYWxhcigwLjE1KTtcblxuXHRcdFx0XHRcdGxldCB3aWR0aCA9IC4xNSAqIGFyci5sZW5ndGg7XG5cdFx0XHRcdFx0bGV0IHggPSAtd2lkdGgvMiArIC4xNSppICsgLjA3NTtcblx0XHRcdFx0XHRjYXJkLnBvc2l0aW9uLnNldCh4LCAtMC4wNywgMCk7XG5cdFx0XHRcdFx0c2VsZi5hZGQoY2FyZCk7XG5cdFx0XHRcdFx0c2VsZi5wb2xpY2llcy5wdXNoKGNhcmQpO1xuXG5cdFx0XHRcdFx0aWYoIWZha2UpXG5cdFx0XHRcdFx0XHRjYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCh2YWwgPT09IC0xID8gLTEgOiBpLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuYWRkRXZlbnRMaXN0ZW5lcignY2FuY2VsVm90ZScsIHJlc3BvbmQoJ2NhbmNlbCcsIHJlc29sdmUsIHJlamVjdCkpO1xuXG5cdFx0XHRzZWxmLmRpc3BsYXllZCA9IGlkO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlc3BvbmQoYW5zd2VyLCByZXNvbHZlLCByZWplY3QpXG5cdFx0e1xuXHRcdFx0ZnVuY3Rpb24gaGFuZGxlcihldnQpXG5cdFx0XHR7XG5cdFx0XHRcdC8vIG1ha2Ugc3VyZSBvbmx5IHRoZSBvd25lciBvZiB0aGUgYmFsbG90IGlzIGFuc3dlcmluZ1xuXHRcdFx0XHRpZihhbnN3ZXIgIT09ICdjYW5jZWwnICYmIHNlbGYuc2VhdC5vd25lciAhPT0gU0gubG9jYWxVc2VyLmlkKSByZXR1cm47XG5cblx0XHRcdFx0Ly8gY2xlYW4gdXBcblx0XHRcdFx0c2VsZi5qYUNhcmQudmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0XHRzZWxmLm5laW5DYXJkLnZpc2libGUgPSBmYWxzZTtcblx0XHRcdFx0c2VsZi5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2U7XG5cdFx0XHRcdHNlbGYuZGlzcGxheWVkID0gbnVsbDtcblx0XHRcdFx0c2VsZi5yZW1vdmUoLi4uc2VsZi5wb2xpY2llcyk7XG5cdFx0XHRcdHNlbGYucG9saWNpZXMgPSBbXTtcblxuXHRcdFx0XHRzZWxmLmphQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX3llc0NsaWNrSGFuZGxlcik7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCBzZWxmLl9ub0NsaWNrSGFuZGxlcik7XG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BsYXllclNlbGVjdCcsIHNlbGYuX25vbWluYXRlSGFuZGxlcik7XG5cdFx0XHRcdHNlbGYucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FuY2VsVm90ZScsIHNlbGYuX2NhbmNlbEhhbmRsZXIpO1xuXG5cdFx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgYW5zd2VyIHN0aWxsIG1hdHRlcnNcblx0XHRcdFx0aWYoIWlzVm90ZVZhbGlkKCkgfHwgYW5zd2VyID09PSAnY2FuY2VsJyl7XG5cdFx0XHRcdFx0cmVqZWN0KCd2b3RlIGNhbmNlbGxlZCcpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAneWVzJylcblx0XHRcdFx0XHRyZXNvbHZlKHRydWUpO1xuXHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ25vJylcblx0XHRcdFx0XHRyZXNvbHZlKGZhbHNlKTtcblx0XHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdwbGF5ZXInKVxuXHRcdFx0XHRcdHJlc29sdmUoZXZ0LmRhdGEpO1xuXHRcdFx0XHRlbHNlIGlmKGNob2ljZXMgPT09IFBPTElDWSlcblx0XHRcdFx0XHRyZXNvbHZlKGFuc3dlcik7XG5cdFx0XHR9XG5cblx0XHRcdGlmKGFuc3dlciA9PT0gJ3llcycpXG5cdFx0XHRcdHNlbGYuX3llc0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ25vJylcblx0XHRcdFx0c2VsZi5fbm9DbGlja0hhbmRsZXIgPSBoYW5kbGVyO1xuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdwbGF5ZXInKVxuXHRcdFx0XHRzZWxmLl9ub21pbmF0ZUhhbmRsZXIgPSBoYW5kbGVyO1xuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdjYW5jZWwnKVxuXHRcdFx0XHRzZWxmLl9jYW5jZWxIYW5kbGVyID0gaGFuZGxlcjtcblxuXHRcdFx0cmV0dXJuIGhhbmRsZXI7XG5cdFx0fVxuXG5cdFx0c2VsZi5sYXN0UXVldWVkID0gc2VsZi5sYXN0UXVldWVkLnRoZW4oaG9va1VwUXVlc3Rpb24sIGhvb2tVcFF1ZXN0aW9uKTtcblxuXHRcdHJldHVybiBzZWxmLmxhc3RRdWV1ZWQ7XG5cdH1cbn1cblxuZXhwb3J0IHtCYWxsb3QsIFBMQVlFUlNFTEVDVCwgQ09ORklSTSwgQklOQVJZLCBQT0xJQ1l9OyIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCB7RmFzY2lzdFJvbGVDYXJkLCBIaXRsZXJSb2xlQ2FyZCwgTGliZXJhbFJvbGVDYXJkLCBGYXNjaXN0UGFydHlDYXJkLCBMaWJlcmFsUGFydHlDYXJkLCBKYUNhcmQsIE5laW5DYXJkfSBmcm9tICcuL2NhcmQnO1xuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7TkJpbGxib2FyZH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxheWVySW5mbyBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXQpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XG5cdFx0dGhpcy5jYXJkID0gbnVsbDtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLCAwLjMpO1xuXHRcdHRoaXMuc2NhbGUuc2V0U2NhbGFyKDAuMyk7XG5cdFx0c2VhdC5hZGQodGhpcyk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBsYXRlVXBkYXRlKHRoaXMudXBkYXRlU3RhdGUuYmluZCh0aGlzKSkpO1xuXHRcdC8vU0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlVHVybk9yZGVyLmJpbmQodGhpcykpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignaW52ZXN0aWdhdGUnLCB0aGlzLnByZXNlbnRQYXJ0eS5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZVR1cm5PcmRlcih7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcblx0e1xuXHRcdFNILl91c2VyUHJvbWlzZS50aGVuKCgpID0+IHtcblx0XHRcdGxldCBsb2NhbFBsYXllciA9IHBsYXllcnNbU0gubG9jYWxVc2VyLmlkXTtcblx0XHRcdGlmKGxvY2FsUGxheWVyKXtcblx0XHRcdFx0bGV0IHBsYXllclBvcyA9IHRoaXMud29ybGRUb0xvY2FsKFNILnNlYXRzW2xvY2FsUGxheWVyLnNlYXROdW1dLmdldFdvcmxkUG9zaXRpb24oKSk7XG5cdFx0XHRcdHRoaXMubG9va0F0KHBsYXllclBvcyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHR1cGRhdGVTdGF0ZSh7ZGF0YToge2dhbWUsIHBsYXllcnMsIHZvdGVzfX0pXG5cdHtcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0aWYoKGdhbWUuc3RhdGUgPT09ICduaWdodCcgfHwgZ2FtZS5zdGF0ZSA9PT0gJ2RvbmUnKSAmJiBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0pXG5cdFx0XHR0aGlzLnByZXNlbnRSb2xlKGdhbWUsIHBsYXllcnMsIHZvdGVzKTtcblxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJylcblx0XHRcdHRoaXMucHJlc2VudFZvdGUoZ2FtZSwgcGxheWVycywgdm90ZXMpO1xuXG5cdFx0ZWxzZSBpZih0aGlzLmNhcmQgIT09IG51bGwpXG5cdFx0e1xuXHRcdFx0dGhpcy5yZW1vdmUodGhpcy5jYXJkKTtcblx0XHRcdHRoaXMuY2FyZCA9IG51bGw7XG5cdFx0fVxuXHR9XG5cblx0cHJlc2VudFJvbGUoZ2FtZSwgcGxheWVycylcblx0e1xuXHRcdGxldCBsb2NhbFBsYXllciA9IHBsYXllcnNbU0gubG9jYWxVc2VyLmlkXTtcblx0XHRsZXQgc2VhdGVkUGxheWVyID0gcGxheWVyc1t0aGlzLnNlYXQub3duZXJdO1xuXG5cdFx0bGV0IHNlYXRlZFJvbGVTaG91bGRCZVZpc2libGUgPVxuXHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ2RvbmUnIHx8XG5cdFx0XHRTSC5sb2NhbFVzZXIuaWQgPT09IHRoaXMuc2VhdC5vd25lciB8fFxuXHRcdFx0bG9jYWxQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnICYmIChzZWF0ZWRQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnIHx8IHNlYXRlZFBsYXllci5yb2xlID09PSAnaGl0bGVyJykgfHxcblx0XHRcdGxvY2FsUGxheWVyLnJvbGUgPT09ICdoaXRsZXInICYmIHNlYXRlZFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgJiYgZ2FtZS50dXJuT3JkZXIubGVuZ3RoIDwgNztcblxuXHRcdGlmKHNlYXRlZFJvbGVTaG91bGRCZVZpc2libGUpXG5cdFx0e1xuXHRcdFx0c3dpdGNoKHNlYXRlZFBsYXllci5yb2xlKXtcblx0XHRcdFx0Y2FzZSAnZmFzY2lzdCc6IHRoaXMuY2FyZCA9IG5ldyBGYXNjaXN0Um9sZUNhcmQoKTsgYnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2hpdGxlcicgOiB0aGlzLmNhcmQgPSBuZXcgSGl0bGVyUm9sZUNhcmQoKTsgIGJyZWFrO1xuXHRcdFx0XHRjYXNlICdsaWJlcmFsJzogdGhpcy5jYXJkID0gbmV3IExpYmVyYWxSb2xlQ2FyZCgpOyBicmVhaztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5hZGQodGhpcy5jYXJkKTtcblx0XHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuY2FyZCk7XG5cdFx0fVxuXHR9XG5cblx0cHJlc2VudFZvdGUoZ2FtZSwgXywgdm90ZXMpXG5cdHtcblx0XHRsZXQgdm90ZSA9IHZvdGVzW2dhbWUubGFzdEVsZWN0aW9uXTtcblxuXHRcdGxldCBwbGF5ZXJWb3RlID0gdm90ZS55ZXNWb3RlcnMuaW5jbHVkZXModGhpcy5zZWF0Lm93bmVyKTtcblx0XHR0aGlzLmNhcmQgPSBwbGF5ZXJWb3RlID8gbmV3IEphQ2FyZCgpIDogbmV3IE5laW5DYXJkKCk7XG5cblx0XHR0aGlzLmFkZCh0aGlzLmNhcmQpO1xuXHRcdGxldCBiYiA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuY2FyZCk7XG5cdH1cblxuXHRwcmVzZW50UGFydHkoe2RhdGE6IHVzZXJJZH0pXG5cdHtcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyIHx8IHRoaXMuc2VhdC5vd25lciAhPT0gdXNlcklkKSByZXR1cm47XG5cblx0XHRsZXQgcm9sZSA9IFNILnBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXS5yb2xlO1xuXHRcdHRoaXMuY2FyZCA9ICByb2xlID09PSAnbGliZXJhbCcgPyBuZXcgTGliZXJhbFBhcnR5Q2FyZCgpIDogbmV3IEZhc2Npc3RQYXJ0eUNhcmQoKTtcblxuXHRcdHRoaXMuYWRkKHRoaXMuY2FyZCk7XG5cdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2Fwc3VsZUdlb21ldHJ5IGV4dGVuZHMgVEhSRUUuQnVmZmVyR2VvbWV0cnlcbntcblx0Y29uc3RydWN0b3IocmFkaXVzLCBoZWlnaHQsIHNlZ21lbnRzID0gMTIsIHJpbmdzID0gOClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHRsZXQgbnVtVmVydHMgPSAyICogcmluZ3MgKiBzZWdtZW50cyArIDI7XG5cdFx0bGV0IG51bUZhY2VzID0gNCAqIHJpbmdzICogc2VnbWVudHM7XG5cdFx0bGV0IHRoZXRhID0gMipNYXRoLlBJL3NlZ21lbnRzO1xuXHRcdGxldCBwaGkgPSBNYXRoLlBJLygyKnJpbmdzKTtcblxuXHRcdGxldCB2ZXJ0cyA9IG5ldyBGbG9hdDMyQXJyYXkoMypudW1WZXJ0cyk7XG5cdFx0bGV0IGZhY2VzID0gbmV3IFVpbnQxNkFycmF5KDMqbnVtRmFjZXMpO1xuXHRcdGxldCB2aSA9IDAsIGZpID0gMCwgdG9wQ2FwID0gMCwgYm90Q2FwID0gMTtcblxuXHRcdHZlcnRzLnNldChbMCwgaGVpZ2h0LzIsIDBdLCAzKnZpKyspO1xuXHRcdHZlcnRzLnNldChbMCwgLWhlaWdodC8yLCAwXSwgMyp2aSsrKTtcblxuXHRcdGZvciggbGV0IHM9MDsgczxzZWdtZW50czsgcysrIClcblx0XHR7XG5cdFx0XHRmb3IoIGxldCByPTE7IHI8PXJpbmdzOyByKyspXG5cdFx0XHR7XG5cdFx0XHRcdGxldCByYWRpYWwgPSByYWRpdXMgKiBNYXRoLnNpbihyKnBoaSk7XG5cblx0XHRcdFx0Ly8gY3JlYXRlIHZlcnRzXG5cdFx0XHRcdHZlcnRzLnNldChbXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5jb3Mocyp0aGV0YSksXG5cdFx0XHRcdFx0aGVpZ2h0LzIgLSByYWRpdXMqKDEtTWF0aC5jb3MocipwaGkpKSxcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLnNpbihzKnRoZXRhKVxuXHRcdFx0XHRdLCAzKnZpKyspO1xuXG5cdFx0XHRcdHZlcnRzLnNldChbXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5jb3Mocyp0aGV0YSksXG5cdFx0XHRcdFx0LWhlaWdodC8yICsgcmFkaXVzKigxLU1hdGguY29zKHIqcGhpKSksXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5zaW4ocyp0aGV0YSlcblx0XHRcdFx0XSwgMyp2aSsrKTtcblxuXHRcdFx0XHRsZXQgdG9wX3MxcjEgPSB2aS0yLCB0b3BfczFyMCA9IHZpLTQ7XG5cdFx0XHRcdGxldCBib3RfczFyMSA9IHZpLTEsIGJvdF9zMXIwID0gdmktMztcblx0XHRcdFx0bGV0IHRvcF9zMHIxID0gdG9wX3MxcjEgLSAyKnJpbmdzLCB0b3BfczByMCA9IHRvcF9zMXIwIC0gMipyaW5ncztcblx0XHRcdFx0bGV0IGJvdF9zMHIxID0gYm90X3MxcjEgLSAyKnJpbmdzLCBib3RfczByMCA9IGJvdF9zMXIwIC0gMipyaW5ncztcblx0XHRcdFx0aWYocyA9PT0gMCl7XG5cdFx0XHRcdFx0dG9wX3MwcjEgKz0gbnVtVmVydHMtMjtcblx0XHRcdFx0XHR0b3BfczByMCArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHRcdGJvdF9zMHIxICs9IG51bVZlcnRzLTI7XG5cdFx0XHRcdFx0Ym90X3MwcjAgKz0gbnVtVmVydHMtMjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIGNyZWF0ZSBmYWNlc1xuXHRcdFx0XHRpZihyID09PSAxKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFt0b3BDYXAsIHRvcF9zMXIxLCB0b3BfczByMV0sIDMqZmkrKyk7XG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFtib3RDYXAsIGJvdF9zMHIxLCBib3RfczFyMV0sIDMqZmkrKyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFt0b3BfczFyMCwgdG9wX3MxcjEsIHRvcF9zMHIwXSwgMypmaSsrKTtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcF9zMHIwLCB0b3BfczFyMSwgdG9wX3MwcjFdLCAzKmZpKyspO1xuXG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFtib3RfczByMSwgYm90X3MxcjEsIGJvdF9zMHIwXSwgMypmaSsrKTtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdF9zMHIwLCBib3RfczFyMSwgYm90X3MxcjBdLCAzKmZpKyspO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIGNyZWF0ZSBsb25nIHNpZGVzXG5cdFx0XHRsZXQgdG9wX3MxID0gdmktMiwgdG9wX3MwID0gdG9wX3MxIC0gMipyaW5ncztcblx0XHRcdGxldCBib3RfczEgPSB2aS0xLCBib3RfczAgPSBib3RfczEgLSAyKnJpbmdzO1xuXHRcdFx0aWYocyA9PT0gMCl7XG5cdFx0XHRcdHRvcF9zMCArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHRib3RfczAgKz0gbnVtVmVydHMtMjtcblx0XHRcdH1cblxuXHRcdFx0ZmFjZXMuc2V0KFt0b3BfczAsIHRvcF9zMSwgYm90X3MxXSwgMypmaSsrKTtcblx0XHRcdGZhY2VzLnNldChbYm90X3MwLCB0b3BfczAsIGJvdF9zMV0sIDMqZmkrKyk7XG5cdFx0fVxuXG5cdFx0dGhpcy5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSh2ZXJ0cywgMykpO1xuXHRcdHRoaXMuc2V0SW5kZXgobmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShmYWNlcywgMSkpO1xuXHR9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IENhcHN1bGVHZW9tZXRyeSBmcm9tICcuL2NhcHN1bGVnZW9tZXRyeSc7XG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xuXG5sZXQgaGl0Ym94R2VvID0gbmV3IENhcHN1bGVHZW9tZXRyeSgwLjMsIDEuOCk7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhpdGJveCBleHRlbmRzIFRIUkVFLk1lc2hcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKGhpdGJveEdlbywgbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcblx0XHRcdHRyYW5zcGFyZW50OiB0cnVlLFxuXHRcdFx0b3BhY2l0eTogMCxcblx0XHRcdHNpZGU6IFRIUkVFLkJhY2tTaWRlXG5cdFx0fSkpO1xuXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLTAuNSwgMCk7XG5cdFx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHRzZWF0LmFkZCh0aGlzKTtcblxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29yZW50ZXInLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwLjEpO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ybGVhdmUnLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwKTtcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgKCkgPT4ge1xuXHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHRcdHR5cGU6ICdwbGF5ZXJTZWxlY3QnLFxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdFx0ZGF0YTogdGhpcy5zZWF0Lm93bmVyXG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUodGhpcy51cGRhdGVWaXNpYmlsaXR5LmJpbmQodGhpcykpKTtcblx0fVxuXG5cdHVwZGF0ZVZpc2liaWxpdHkoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0sIHNwZWNpYWxQbGF5ZXIpXG5cdHtcblx0XHRsZXQgbGl2aW5nUGxheWVycyA9IGdhbWUudHVybk9yZGVyLmZpbHRlcihwID0+IHBsYXllcnNbcF0uc3RhdGUgIT09ICdkZWFkJyk7XG5cdFx0bGV0IHByZWNvbmRpdGlvbnMgPVxuXHRcdFx0U0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCAmJlxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSAnJyAmJlxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQgJiZcblx0XHRcdGxpdmluZ1BsYXllcnMuaW5jbHVkZXModGhpcy5zZWF0Lm93bmVyKTtcblxuXHRcdGxldCBub21pbmF0ZWFibGUgPVxuXHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJlxuXHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBnYW1lLmxhc3RDaGFuY2VsbG9yICYmXG5cdFx0XHQobGl2aW5nUGxheWVycy5sZW5ndGggPD0gNSB8fCB0aGlzLnNlYXQub3duZXIgIT09IGdhbWUubGFzdFByZXNpZGVudCk7XG5cblx0XHRsZXQgaW52ZXN0aWdhdGVhYmxlID1cblx0XHRcdGdhbWUuc3RhdGUgPT09ICdpbnZlc3RpZ2F0ZScgJiZcblx0XHRcdHBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXS5zdGF0ZSA9PT0gJ25vcm1hbCc7XG5cdFx0XG5cdFx0bGV0IHN1Y2NlZWRhYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ25hbWVTdWNjZXNzb3InO1xuXHRcdGxldCBleGVjdXRhYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ2V4ZWN1dGUnO1xuXG5cdFx0dGhpcy52aXNpYmxlID0gcHJlY29uZGl0aW9ucyAmJiAobm9taW5hdGVhYmxlIHx8IGludmVzdGlnYXRlYWJsZSB8fCBzdWNjZWVkYWJsZSB8fCBleGVjdXRhYmxlKTtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XG5pbXBvcnQge0JhbGxvdH0gZnJvbSAnLi9iYWxsb3QnO1xuaW1wb3J0IFBsYXllckluZm8gZnJvbSAnLi9wbGF5ZXJpbmZvJztcbmltcG9ydCBIaXRib3ggZnJvbSAnLi9oaXRib3gnO1xuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2VhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXROdW0pXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zZWF0TnVtID0gc2VhdE51bTtcblx0XHR0aGlzLm93bmVyID0gJyc7XG5cblx0XHQvLyBwb3NpdGlvbiBzZWF0XG5cdFx0bGV0IHgsIHk9MC42NSwgejtcblx0XHRzd2l0Y2goc2VhdE51bSl7XG5cdFx0Y2FzZSAwOiBjYXNlIDE6IGNhc2UgMjpcblx0XHRcdHggPSAtMC44MzMgKyAwLjgzMypzZWF0TnVtO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoeCwgeSwgLTEuMDUpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAzOiBjYXNlIDQ6XG5cdFx0XHR6ID0gLTAuNDM3ICsgMC44NzQqKHNlYXROdW0tMyk7XG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgxLjQyNSwgeSwgeik7XG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtTWF0aC5QSS8yLCAwKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XG5cdFx0XHR4ID0gMC44MzMgLSAwLjgzMyooc2VhdE51bS01KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIDEuMDUpO1xuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEksIDApO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSA4OiBjYXNlIDk6XG5cdFx0XHR6ID0gMC40MzcgLSAwLjg3NCooc2VhdE51bS04KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KC0xLjQyNSwgeSwgeik7XG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtMS41Kk1hdGguUEksIDApO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2NoZWNrZWRfaW4nLCAoe2RhdGE6IGlkfSkgPT4ge1xuXHRcdFx0aWYodGhpcy5vd25lciA9PT0gaWQpXG5cdFx0XHRcdHRoaXMudXBkYXRlT3duZXJzaGlwKHtkYXRhOiB7Z2FtZTogU0guZ2FtZSwgcGxheWVyczogU0gucGxheWVyc319KTtcblx0XHR9KTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSkgPT4ge1xuXHRcdFx0aWYodGhpcy5vd25lciAmJiBwbGF5ZXJzW3RoaXMub3duZXJdLnN0YXRlID09PSAnZGVhZCcpe1xuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXQoMHgzZDI3ODkpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5uYW1lcGxhdGUgPSBuZXcgTmFtZXBsYXRlKHRoaXMpO1xuXHRcdHRoaXMuYmFsbG90ID0gbmV3IEJhbGxvdCh0aGlzKTtcblx0XHR0aGlzLnBsYXllckluZm8gPSBuZXcgUGxheWVySW5mbyh0aGlzKTtcblx0XHR0aGlzLmhpdGJveCA9IG5ldyBIaXRib3godGhpcyk7XG5cdH1cblxuXHR1cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXG5cdHtcblx0XHRsZXQgaWRzID0gZ2FtZS50dXJuT3JkZXIgfHwgW107XG5cblx0XHQvLyByZWdpc3RlciB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSBjbGFpbWVkXG5cdFx0aWYoICF0aGlzLm93bmVyIClcblx0XHR7XG5cdFx0XHQvLyBjaGVjayBpZiBhIHBsYXllciBoYXMgam9pbmVkIGF0IHRoaXMgc2VhdFxuXHRcdFx0Zm9yKGxldCBpIGluIGlkcyl7XG5cdFx0XHRcdGlmKHBsYXllcnNbaWRzW2ldXS5zZWF0TnVtID09IHRoaXMuc2VhdE51bSl7XG5cdFx0XHRcdFx0dGhpcy5vd25lciA9IGlkc1tpXTtcblx0XHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KHBsYXllcnNbaWRzW2ldXS5kaXNwbGF5TmFtZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyByZXNldCB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSB2YWNhdGVkXG5cdFx0aWYoICFpZHMuaW5jbHVkZXModGhpcy5vd25lcikgKVxuXHRcdHtcblx0XHRcdHRoaXMub3duZXIgPSAnJztcblx0XHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KCc8Sm9pbj4nKTtcblx0XHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ZmZmZmZmKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyB1cGRhdGUgZGlzY29ubmVjdCBjb2xvcnNcblx0XHRlbHNlIGlmKCAhcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcblx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweDgwODA4MCk7XG5cdFx0fVxuXHRcdGVsc2UgaWYoIHBsYXllcnNbdGhpcy5vd25lcl0uY29ubmVjdGVkICl7XG5cdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXRIZXgoMHhmZmZmZmYpO1xuXHRcdH1cblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5CaWxsYm9hcmQsIE5UZXh0fSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb250aW51ZUJveCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHBhcmVudClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5pY29uID0gbmV3IFRIUkVFLk1lc2goXG5cdFx0XHRuZXcgVEhSRUUuQm94QnVmZmVyR2VvbWV0cnkoLjIsIC4xLCAuMiksXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe2NvbG9yOiAweDAwYzAwMH0pXG5cdFx0KTtcblx0XHR0aGlzLmljb24uYWRkQmVoYXZpb3IobmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuU3BpbigpKTtcblx0XHR0aGlzLmFkZCh0aGlzLmljb24pO1xuXG5cdFx0dGhpcy50ZXh0ID0gUGxhY2Vob2xkZXJNZXNoLmNsb25lKCk7XG5cdFx0dGhpcy50ZXh0LnBvc2l0aW9uLnNldCgwLCAuMiwgMCk7XG5cdFx0dGhpcy50ZXh0LnVzZXJEYXRhLmFsdHNwYWNlID0ge2NvbGxpZGVyOiB7ZW5hYmxlZDogdHJ1ZX19O1xuXG5cdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy50ZXh0KTtcblxuXHRcdHRoaXMudGV4dENvbXBvbmVudCA9IG5ldyBOVGV4dCh0aGlzLnRleHQpO1xuXHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe2ZvbnRTaXplOiAxLCB3aWR0aDogMSwgaGVpZ2h0OiAxLCBob3Jpem9udGFsQWxpZ246ICdtaWRkbGUnLCB2ZXJ0aWNhbEFsaWduOiAnbWlkZGxlJ30pO1xuXG5cdFx0dGhpcy5hZGQodGhpcy50ZXh0KTtcblxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAuMywgMCk7XG5cdFx0cGFyZW50LmFkZCh0aGlzKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIHRoaXMub25zdGF0ZWNoYW5nZS5iaW5kKHRoaXMpKTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy5wbGF5ZXJTZXR1cC5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5vbmNsaWNrLmJpbmQodGhpcykpO1xuXG5cdFx0bGV0IHNob3cgPSAoKSA9PiB0aGlzLnNob3coKTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdpbnZlc3RpZ2F0ZScsIHNob3cpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3BvbGljeUFuaW1Eb25lJywgc2hvdyk7XG5cdH1cblxuXHRvbmNsaWNrKGV2dClcblx0e1xuXHRcdGlmKFNILmdhbWUudHVybk9yZGVyLmluY2x1ZGVzKFNILmxvY2FsVXNlci5pZCkpXG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnY29udGludWUnKTtcblx0fVxuXG5cdG9uc3RhdGVjaGFuZ2Uoe2RhdGE6IHtnYW1lfX0pXG5cdHtcblx0XHRpZihnYW1lLnN0YXRlID09PSAnbGFtZUR1Y2snIHx8IChnYW1lLnN0YXRlID09PSAncGVlaycgJiYgZ2FtZS5wcmVzaWRlbnQgPT09IFNILmxvY2FsVXNlci5pZCkpe1xuXHRcdFx0dGhpcy5zaG93KCk7XG5cdFx0fVxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHR0aGlzLnBsYXllclNldHVwKHtkYXRhOiB7Z2FtZX19KTtcblx0XHR9XG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnZG9uZScpe1xuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdHRoaXMuc2hvdygnTmV3IGdhbWUnKTtcblx0XHRcdH0sIDQwMDApO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMuaGlkZSgpO1xuXHRcdH1cblx0fVxuXG5cdHBsYXllclNldHVwKHtkYXRhOiB7Z2FtZX19KVxuXHR7XG5cdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHR0aGlzLnRleHQudmlzaWJsZSA9IHRydWU7XG5cdFx0XHRsZXQgcGxheWVyQ291bnQgPSBnYW1lLnR1cm5PcmRlci5sZW5ndGg7XG5cdFx0XHRpZihwbGF5ZXJDb3VudCA+PSA1KXtcblx0XHRcdFx0dGhpcy5pY29uLnZpc2libGUgPSB0cnVlO1xuXHRcdFx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OlxuXHRcdFx0XHRcdGAoJHtwbGF5ZXJDb3VudH0vNSkgQ2xpY2sgd2hlbiByZWFkeWBcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0dGhpcy5pY29uLnZpc2libGUgPSBmYWxzZTtcblx0XHRcdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDpcblx0XHRcdFx0XHRgKCR7cGxheWVyQ291bnR9LzUpIE5lZWQgbW9yZSBwbGF5ZXJzYFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRzaG93KG1lc3NhZ2UgPSAnQ2xpY2sgdG8gY29udGludWUnKXtcblx0XHR0aGlzLmljb24udmlzaWJsZSA9IHRydWU7XG5cdFx0dGhpcy50ZXh0LnZpc2libGUgPSB0cnVlO1xuXHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6IG1lc3NhZ2V9KTtcblx0fVxuXG5cdGhpZGUoKXtcblx0XHR0aGlzLmljb24udmlzaWJsZSA9IGZhbHNlO1xuXHRcdHRoaXMudGV4dC52aXNpYmxlID0gZmFsc2U7XG5cdH1cbn07IiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XG5cbmNvbnN0IHBvc2l0aW9ucyA9IFtcblx0bmV3IFRIUkVFLlZlY3RvcjMoMC4zNjgsIC4wMTUsIC0uNzE3KSxcblx0bmV3IFRIUkVFLlZlY3RvcjMoMC4xMzUsIC4wMzAsIC0uNzE3KSxcblx0bmV3IFRIUkVFLlZlY3RvcjMoLS4wOTYsIC4wNDUsIC0uNzE3KSxcblx0bmV3IFRIUkVFLlZlY3RvcjMoLS4zMjksIC4wNjAsIC0uNzE3KVxuXTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRWxlY3Rpb25UcmFja2VyIGV4dGVuZHMgVEhSRUUuTWVzaFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcihcblx0XHRcdG5ldyBUSFJFRS5DeWxpbmRlckJ1ZmZlckdlb21ldHJ5KC4wNCwgLjA0LCAuMDMsIDE2KSxcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4MTkxOWZmfSlcblx0XHQpO1xuXHRcdHRoaXMucG9zaXRpb24uY29weShwb3NpdGlvbnNbMF0pO1xuXHRcdFNILnRhYmxlLmFkZCh0aGlzKTtcblx0XHRcblx0XHQvLyBmYWlscyUzID09IDAgb3IgMz9cblx0XHR0aGlzLmhpZ2hTaWRlID0gZmFsc2U7XG5cdFx0dGhpcy5zcG90ID0gMDtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9mYWlsZWRWb3RlcycsIHRoaXMudXBkYXRlRmFpbGVkVm90ZXMuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVGYWlsZWRWb3Rlcyh7ZGF0YToge2dhbWU6IHtmYWlsZWRWb3Rlc319fSA9IHtkYXRhOiB7Z2FtZToge2ZhaWxlZFZvdGVzOiAtMX19fSlcblx0e1xuXHRcdGlmKGZhaWxlZFZvdGVzID09PSAtMSlcblx0XHRcdGZhaWxlZFZvdGVzID0gdGhpcy5zcG90O1xuXG5cdFx0dGhpcy5oaWdoU2lkZSA9IGZhaWxlZFZvdGVzID4gMDtcblx0XHR0aGlzLnNwb3QgPSBmYWlsZWRWb3RlcyUzIHx8IHRoaXMuaGlnaFNpZGUgJiYgMyB8fCAwO1xuXG5cdFx0dGhpcy5hbmltID0gQW5pbWF0ZS5zaW1wbGUodGhpcywge1xuXHRcdFx0cG9zOiBwb3NpdGlvbnNbdGhpcy5zcG90XSxcblx0XHRcdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygxLCAxK3RoaXMuc3BvdCwgMSksXG5cdFx0XHRkdXJhdGlvbjogMTIwMFxuXHRcdH0pO1xuXHR9XG59IiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IHtDcmVkaXRzQ2FyZH0gZnJvbSAnLi9jYXJkJztcclxuaW1wb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5CaWxsYm9hcmQsIE5UZXh0fSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUHJlc2VudGF0aW9uIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0U0guYWRkKHRoaXMpO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBpZGxlIGRpc3BsYXlcclxuXHRcdHRoaXMuY3JlZGl0cyA9IG5ldyBDcmVkaXRzQ2FyZCgpO1xyXG5cdFx0dGhpcy5jcmVkaXRzLnBvc2l0aW9uLnNldCgwLCAxLjg1LCAwKTtcclxuXHRcdHRoaXMuY3JlZGl0cy5hZGRCZWhhdmlvcihuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5TcGluKHtzcGVlZDogMC4wMDAyfSkpO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5jcmVkaXRzKTtcclxuXHRcdFxyXG5cdFx0Ly8gY3JlYXRlIHZpY3RvcnkgYmFubmVyXHJcblx0XHR0aGlzLmJhbm5lciA9IFBsYWNlaG9sZGVyTWVzaC5jbG9uZSgpO1xyXG5cdFx0dGhpcy5iYW5uZXIudGV4dCA9IG5ldyBOVGV4dCh0aGlzLmJhbm5lcik7XHJcblx0XHR0aGlzLmJhbm5lci50ZXh0LnVwZGF0ZSh7Zm9udFNpemU6IDJ9KTtcclxuXHRcdHRoaXMuYmFubmVyLmJpbGxib2FyZCA9IG5ldyBOQmlsbGJvYXJkKHRoaXMuYmFubmVyKTtcclxuXHRcdHRoaXMuYWRkKHRoaXMuYmFubmVyKTtcclxuXHJcblx0XHQvLyB1cGRhdGUgc3R1ZmZcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIHRoaXMudXBkYXRlT25TdGF0ZS5iaW5kKHRoaXMpKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZU9uU3RhdGUoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXHJcblx0e1xyXG5cdFx0dGhpcy5jcmVkaXRzLnZpc2libGUgPSBnYW1lLnN0YXRlID09PSAnc2V0dXAnO1xyXG5cclxuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdkb25lJylcclxuXHRcdHtcclxuXHRcdFx0aWYoL15saWJlcmFsLy50ZXN0KGdhbWUudmljdG9yeSkpe1xyXG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQuY29sb3IgPSAnYmx1ZSc7XHJcblx0XHRcdFx0dGhpcy5iYW5uZXIudGV4dC51cGRhdGUoe3RleHQ6ICdMaWJlcmFscyB3aW4hJ30pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuYmFubmVyLnRleHQuY29sb3IgPSAncmVkJztcclxuXHRcdFx0XHR0aGlzLmJhbm5lci50ZXh0LnVwZGF0ZSh7dGV4dDogJ0Zhc2Npc3RzIHdpbiEnfSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHRoaXMuYmFubmVyLnBvc2l0aW9uLnNldCgwLDAuOCwwKTtcclxuXHRcdFx0dGhpcy5iYW5uZXIuc2NhbGUuc2V0U2NhbGFyKC4wMDEpO1xyXG5cdFx0XHR0aGlzLmJhbm5lci52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0QW5pbWF0ZS5zaW1wbGUodGhpcy5iYW5uZXIsIHtcclxuXHRcdFx0XHRwb3M6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEuODUsIDApLFxyXG5cdFx0XHRcdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygxLDEsMSlcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdwb2xpY3kxJyAmJiBnYW1lLmZhc2Npc3RQb2xpY2llcyA+PSAzKVxyXG5cdFx0e1xyXG5cdFx0XHRsZXQgY2hhbmNlbGxvciA9IHBsYXllcnNbZ2FtZS5jaGFuY2VsbG9yXS5kaXNwbGF5TmFtZTtcclxuXHRcdFx0dGhpcy5iYW5uZXIudGV4dC5jb2xvciA9ICd3aGl0ZSc7XHJcblx0XHRcdHRoaXMuYmFubmVyLnRleHQudXBkYXRlKHt0ZXh0OiBgJHtjaGFuY2VsbG9yfSBpcyBub3QgSGl0bGVyIWB9KTtcclxuXHJcblx0XHRcdHRoaXMuYmFubmVyLnBvc2l0aW9uLnNldCgwLDAuOCwwKTtcclxuXHRcdFx0dGhpcy5iYW5uZXIuc2NhbGUuc2V0U2NhbGFyKC4wMDEpO1xyXG5cdFx0XHR0aGlzLmJhbm5lci52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdFx0QW5pbWF0ZS5zaW1wbGUodGhpcy5iYW5uZXIsIHtcclxuXHRcdFx0XHRwb3M6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEuODUsIDApLFxyXG5cdFx0XHRcdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygxLDEsMSlcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnKSB7XHJcblx0XHRcdHRoaXMuYmFubmVyLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcbn0iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCAnLi9wb2x5ZmlsbCc7XG5cbmltcG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9IGZyb20gJy4vaGF0cyc7XG5pbXBvcnQgR2FtZVRhYmxlIGZyb20gJy4vdGFibGUnO1xuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgeyBnZXRHYW1lSWQsIG1lcmdlT2JqZWN0cyB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XG5pbXBvcnQgU2VhdCBmcm9tICcuL3NlYXQnO1xuaW1wb3J0IFBsYXllck1ldGVyIGZyb20gJy4vcGxheWVybWV0ZXInO1xuaW1wb3J0IENvbnRpbnVlQm94IGZyb20gJy4vY29udGludWVib3gnO1xuaW1wb3J0IEVsZWN0aW9uVHJhY2tlciBmcm9tICcuL2VsZWN0aW9udHJhY2tlcic7XG5pbXBvcnQgUHJlc2VudGF0aW9uIGZyb20gJy4vcHJlc2VudGF0aW9uJztcblxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmFzc2V0cyA9IEFzc2V0TWFuYWdlci5tYW5pZmVzdDtcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcblx0XHR0aGlzLm5lZWRzU2tlbGV0b24gPSBmYWxzZTtcblxuXHRcdC8vIHBvbHlmaWxsIGdldFVzZXIgZnVuY3Rpb25cblx0XHRpZighYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdFx0YWx0c3BhY2UuZ2V0VXNlciA9ICgpID0+IHtcblx0XHRcdFx0bGV0IGlkLCByZSA9IC9bPyZddXNlcklkPShcXGQrKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcblx0XHRcdFx0aWYocmUpXG5cdFx0XHRcdFx0aWQgPSByZVsxXTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMDApLnRvU3RyaW5nKCk7XG5cblx0XHRcdFx0YWx0c3BhY2UuX2xvY2FsVXNlciA9IHtcblx0XHRcdFx0XHR1c2VySWQ6IGlkLFxuXHRcdFx0XHRcdGRpc3BsYXlOYW1lOiBpZCxcblx0XHRcdFx0XHRpc01vZGVyYXRvcjogL2lzTW9kZXJhdG9yLy50ZXN0KHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpXG5cdFx0XHRcdH07XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdNYXNxdWVyYWRpbmcgYXMnLCBhbHRzcGFjZS5fbG9jYWxVc2VyKTtcblx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShhbHRzcGFjZS5fbG9jYWxVc2VyKTtcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8gZ2V0IGxvY2FsIHVzZXJcblx0XHR0aGlzLl91c2VyUHJvbWlzZSA9IGFsdHNwYWNlLmdldFVzZXIoKTtcblx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKHVzZXIgPT4ge1xuXHRcdFx0dGhpcy5sb2NhbFVzZXIgPSB7XG5cdFx0XHRcdGlkOiB1c2VyLnVzZXJJZCxcblx0XHRcdFx0ZGlzcGxheU5hbWU6IHVzZXIuZGlzcGxheU5hbWUsXG5cdFx0XHRcdGlzTW9kZXJhdG9yOiB1c2VyLmlzTW9kZXJhdG9yXG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5nYW1lID0ge307XG5cdFx0dGhpcy5wbGF5ZXJzID0ge307XG5cdFx0dGhpcy52b3RlcyA9IHt9O1xuXHR9XG5cblx0aW5pdGlhbGl6ZShlbnYsIHJvb3QsIGFzc2V0cylcblx0e1xuXHRcdC8vIHNoYXJlIHRoZSBkaW9yYW1hIGluZm9cblx0XHRBc3NldE1hbmFnZXIuY2FjaGUgPSBhc3NldHM7XG5cdFx0QXNzZXRNYW5hZ2VyLmZpeE1hdGVyaWFscygpO1xuXHRcdHRoaXMuZW52ID0gZW52O1xuXG5cdFx0Ly8gY29ubmVjdCB0byBzZXJ2ZXJcblx0XHR0aGlzLnNvY2tldCA9IGlvLmNvbm5lY3QoJy8nLCB7cXVlcnk6ICdnYW1lSWQ9JytnZXRHYW1lSWQoKX0pO1xuXG5cdFx0Ly8gY3JlYXRlIHRoZSB0YWJsZVxuXHRcdHRoaXMudGFibGUgPSBuZXcgR2FtZVRhYmxlKCk7XG5cdFx0dGhpcy5hZGQodGhpcy50YWJsZSk7XG5cblx0XHR0aGlzLnJlc2V0QnV0dG9uID0gbmV3IFRIUkVFLk1lc2goXG5cdFx0XHRuZXcgVEhSRUUuQm94R2VvbWV0cnkoLjI1LC4yNSwuMjUpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IGFzc2V0cy50ZXh0dXJlcy5yZXNldH0pXG5cdFx0KTtcblx0XHR0aGlzLnJlc2V0QnV0dG9uLnBvc2l0aW9uLnNldCgwLCAtMC4xOCwgMCk7XG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuc2VuZFJlc2V0LmJpbmQodGhpcykpO1xuXHRcdHRoaXMudGFibGUuYWRkKHRoaXMucmVzZXRCdXR0b24pO1xuXG5cdFx0dGhpcy5wcmVzZW50YXRpb24gPSBuZXcgUHJlc2VudGF0aW9uKCk7XG5cblx0XHQvLyBjcmVhdGUgaGF0c1xuXHRcdHRoaXMucHJlc2lkZW50SGF0ID0gbmV3IFByZXNpZGVudEhhdCgpO1xuXHRcdHRoaXMuY2hhbmNlbGxvckhhdCA9IG5ldyBDaGFuY2VsbG9ySGF0KCk7XG5cblx0XHQvLyBjcmVhdGUgcG9zaXRpb25zXG5cdFx0dGhpcy5zZWF0cyA9IFtdO1xuXHRcdGZvcihsZXQgaT0wOyBpPDEwOyBpKyspe1xuXHRcdFx0dGhpcy5zZWF0cy5wdXNoKCBuZXcgU2VhdChpKSApO1xuXHRcdH1cblxuXHRcdHRoaXMudGFibGUuYWRkKC4uLnRoaXMuc2VhdHMpO1xuXG5cdFx0Ly90aGlzLnBsYXllck1ldGVyID0gbmV3IFBsYXllck1ldGVyKCk7XG5cdFx0Ly90aGlzLnRhYmxlLmFkZCh0aGlzLnBsYXllck1ldGVyKTtcblx0XHR0aGlzLmNvbnRpbnVlQm94ID0gbmV3IENvbnRpbnVlQm94KHRoaXMudGFibGUpO1xuXG5cdFx0dGhpcy5lbGVjdGlvblRyYWNrZXIgPSBuZXcgRWxlY3Rpb25UcmFja2VyKCk7XG5cblx0XHR0aGlzLnNvY2tldC5vbigndXBkYXRlJywgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuc29ja2V0Lm9uKCdjaGVja2VkX2luJywgdGhpcy5jaGVja2VkSW4uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLnNvY2tldC5vbigncmVzZXQnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5zb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVGcm9tU2VydmVyKGdkLCBwZCwgdmQpXG5cdHtcblx0XHRjb25zb2xlLmxvZyhnZCwgcGQsIHZkKTtcblxuXHRcdGxldCBnYW1lID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nYW1lLCBnZCk7XG5cdFx0bGV0IHBsYXllcnMgPSBtZXJnZU9iamVjdHModGhpcy5wbGF5ZXJzLCBwZCB8fCB7fSk7XG5cdFx0bGV0IHZvdGVzID0gbWVyZ2VPYmplY3RzKHRoaXMudm90ZXMsIHZkIHx8IHt9KTtcblxuXHRcdGZvcihsZXQgZmllbGQgaW4gZ2QpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdFx0dHlwZTogJ3VwZGF0ZV8nK2ZpZWxkLFxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGdhbWU6IGdhbWUsXG5cdFx0XHRcdFx0cGxheWVyczogcGxheWVycyxcblx0XHRcdFx0XHR2b3Rlczogdm90ZXNcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fdXNlclByb21pc2UudGhlbigoKSA9PiB7XG5cdFx0XHRpZihwbGF5ZXJzW3RoaXMubG9jYWxVc2VyLmlkXSAmJiAhcGxheWVyc1t0aGlzLmxvY2FsVXNlci5pZF0uY29ubmVjdGVkKXtcblx0XHRcdFx0dGhpcy5zb2NrZXQuZW1pdCgnY2hlY2tfaW4nLCB0aGlzLmxvY2FsVXNlcik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xuXHRcdHRoaXMucGxheWVycyA9IHBsYXllcnM7XG5cdFx0dGhpcy52b3RlcyA9IHZvdGVzO1xuXHR9XG5cblx0Y2hlY2tlZEluKHApXG5cdHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMucGxheWVyc1twLmlkXSwgcCk7XG5cdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdHR5cGU6ICdjaGVja2VkX2luJyxcblx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxuXHRcdFx0ZGF0YTogcC5pZFxuXHRcdH0pO1xuXHR9XG5cblx0c2VuZFJlc2V0KGUpe1xuXHRcdGlmKHRoaXMubG9jYWxVc2VyLmlzTW9kZXJhdG9yKXtcblx0XHRcdGNvbnNvbGUubG9nKCdyZXF1ZXN0aW5nIHJlc2V0Jyk7XG5cdFx0XHR0aGlzLnNvY2tldC5lbWl0KCdyZXNldCcpO1xuXHRcdH1cblx0fVxuXG5cdGRvUmVzZXQoZ2FtZSwgcGxheWVycywgdm90ZXMpXG5cdHtcblx0XHRpZiggLyZjYWNoZUJ1c3Q9XFxkKyQvLnRlc3Qod2luZG93LmxvY2F0aW9uLnNlYXJjaCkgKXtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggKz0gJzEnO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgbmV3IFNlY3JldEhpdGxlcigpO1xuIl0sIm5hbWVzIjpbInRoaXMiLCJsZXQiLCJzdXBlciIsIkFuaW1hdGUiLCJBc3NldE1hbmFnZXIiLCJjYXJkIiwiQmFsbG90VHlwZS5DT05GSVJNIiwidXBkYXRlU3RhdGUiLCJCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCIsIkJhbGxvdFR5cGUuUE9MSUNZIiwib3B0cyIsImNsZWFuVXBGYWtlVm90ZSIsIkJQLnVwZGF0ZVZvdGVzSW5Qcm9ncmVzcyIsIkJQLnVwZGF0ZVN0YXRlIiwiQlBCQS50b0FycmF5IiwiQlBCQS5MSUJFUkFMIiwiY29uc3QiLCJwb3NpdGlvbnMiXSwibWFwcGluZ3MiOiI7OztBQUVBLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztDQUM1QixNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFO0VBQ2xELEtBQUssRUFBRSxTQUFTLElBQUksQ0FBQztHQUNwQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7R0FDL0I7RUFDRCxRQUFRLEVBQUUsS0FBSztFQUNmLFVBQVUsRUFBRSxLQUFLO0VBQ2pCLFlBQVksRUFBRSxLQUFLO0VBQ25CLENBQUMsQ0FBQztDQUNIOztBQ1RELFNBQWU7Q0FDZCxRQUFRLEVBQUU7RUFDVCxNQUFNLEVBQUU7R0FDUCxLQUFLLEVBQUUseUJBQXlCO0dBQ2hDLFNBQVMsRUFBRSw0QkFBNEI7R0FDdkMsTUFBTSxFQUFFLDBCQUEwQjtHQUNsQyxRQUFRLEVBQUUsNkJBQTZCOzs7R0FHdkM7RUFDRCxRQUFRLEVBQUU7R0FDVCxXQUFXLEVBQUUsNEJBQTRCO0dBQ3pDLFNB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QUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLO0VBQ25CLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxLQUFLO0VBQ25CLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUs7RUFDbkIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLOzs7O0VBSW5CLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBRXRGLENBQUM7O0NBRUZBLElBQUksT0FBTyxHQUFHOztFQUViLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMxQixDQUFDOzs7Q0FHRkEsSUFBSSxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUN2RUEsSUFBSSxJQUFJLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDNUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztDQUNwQixJQUFJLEdBQUcsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUN0RSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDOzs7Q0FHbEJBLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxHQUFHLEVBQUUsQ0FBQztDQUN0REEsSUFBSSxXQUFXLEdBQUcsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ3hGLFlBQVksR0FBRyxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDbEdBLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztDQUNiLElBQUlBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0VBQ3RCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7RUFDNUc7Q0FDREEsSUFBSSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7Q0FFdEcsUUFBUSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRTtFQUUxQ0EsSUFBSSxHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7RUFDckMsR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLEdBQUcsWUFBWSxHQUFHLFdBQVcsQ0FBQyxDQUFDO0VBQ3hGLEdB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QUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7R0FDM0I7SUFDQ0EsSUFBSSxNQUFNLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzs7SUFHdEMsS0FBSyxDQUFDLEdBQUcsQ0FBQztLQUNULE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsTUFBTSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDckMsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOztJQUVYLEtBQUssQ0FBQyxHQUFHLENBQUM7S0FDVCxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDdEMsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOztJQUVYQSxJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JDQSxJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JDQSxJQUFJLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDakVBLElBQUksUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNqRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDVixRQUFRLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztLQUN2QixRQUFRLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztLQUN2QixRQUFRLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztLQUN2QixRQUFRLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztLQUN2Qjs7O0lBR0QsR0FBRyxDQUFDLEtBQUssQ0FBQztJQUNWO0tBQ0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDaEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDaEQ7O0lBRUQ7S0FDQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7S0FFbEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDbEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVB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
