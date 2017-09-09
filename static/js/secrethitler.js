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

var Behavior = function Behavior(type){
	this.type = type;
};

Behavior.prototype.awake = function awake (obj){
	this.object3D = obj;
};

Behavior.prototype.start = function start (){ };

Behavior.prototype.update = function update (dT){ };

Behavior.prototype.dispose = function dispose (){ };

var Animate = (function (Behavior$$1) {
	function Animate(){
		Behavior$$1.call(this, 'Animate');
		this.group = new TWEEN.Group();
	}

	if ( Behavior$$1 ) Animate.__proto__ = Behavior$$1;
	Animate.prototype = Object.create( Behavior$$1 && Behavior$$1.prototype );
	Animate.prototype.constructor = Animate;
	Animate.prototype.update = function update (){
		this.group.update(performance.now());
	};

	/**
	 * Move an object from A to B
	 * @param {THREE.Object3D} target 
	 * @param {Object} options
	 */
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
		if(matrix)
		{
			pos = new THREE.Vector3();
			quat = new THREE.Quaternion();
			scale = new THREE.Vector3();
			matrix.decompose(pos, quat, scale);
		}

		// shuffle hierarchy, but keep world transform the same
		if(parent && this.parent !== target.parent)
		{
			target.applyMatrix(target.parent.matrixWorld);
			target.applyMatrix(new THREE.Matrix4().getInverse(parent.matrixWorld));
			parent.add(obj);
		}

		var initialQuat = target.quaternion.clone();

		var anim = target.getBehaviorByType('Animate');
		if(!anim){
			target.addBehavior( anim = new Animate() );
		}

		function executor(resolve, reject)
		{
			var toComplete = 0;
			if(pos)
			{
				new TWEEN.Tween(target.position, anim.group)
				.to({x: pos.x, y: pos.y, z: pos.z}, duration)
				.easing(TWEEN.Easing.Quadratic.Out)
				.onComplete(groupIsDone)
				.start();
				toComplete++;
			}

			if(quat)
			{
				new TWEEN.Tween({t:0}, anim.group)
				.to({t:1}, duration)
				.easing(TWEEN.Easing.Quadratic.Out)
				.onUpdate(function (t) { return THREE.Quaternion.slerp(initialQuat, quat, target.quaternion, t.t); })
				.onComplete(groupIsDone)
				.start();
				toComplete++;
			}

			if(scale)
			{
				new TWEEN.Tween(target.scale, anim.group)
				.to({x: scale.x, y: scale.y, z: scale.z}, duration)
				.easing(TWEEN.Easing.Quadratic.Out)
				.onComplete(groupIsDone)
				.start();
				toComplete++;
			}

			function groupIsDone(){
				if(--toComplete === 0){
					resolve();
				}
			}
		}

		return new Promise(executor);
	};

	Animate.wait = function wait (duration){
		return new Promise(function (resolve, reject) {
			setTimeout(resolve, duration);
		});
	};

	return Animate;
}(Behavior));

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
	LiberalPolicyCard.prototype.goToPosition = function goToPosition (spot, animate)
	{
		if ( spot === void 0 ) spot = 0;
		if ( animate === void 0 ) animate = false;

		spot = Math.max(0, Math.min(4, spot));
		var s = LiberalPolicyCard.spots;
		if(animate){
			return Animate.simple(this, {
				pos: s['pos_'+spot],
				quat: s.quat,
				scale: s.scale
			});
		}
		else {
			this.position.copy(s['pos_'+spot]);
			this.quaternion.copy(s.quat);
			this.scale.copy(s.scale);
			return Promise.resolve();
		}
	};

	return LiberalPolicyCard;
}(Card));

LiberalPolicyCard.spots = {
	pos_0: new THREE.Vector3(0.69, 0.001, -0.42),
	pos_1: new THREE.Vector3(0.345, 0.001, -0.42),
	pos_2: new THREE.Vector3(0.002, 0.001, -0.42),
	pos_3: new THREE.Vector3(-.34, 0.001, -0.42),
	pos_4: new THREE.Vector3(-.69, 0.001, -0.42),
	quat: new THREE.Quaternion(0, 0.7071067811865475, 0.7071067811865475, 0),
	scale: new THREE.Vector3(0.4, 0.4, 0.4)
};

var FascistPolicyCard = (function (Card) {
	function FascistPolicyCard(){
		Card.call(this, Types.POLICY_FASCIST);
	}

	if ( Card ) FascistPolicyCard.__proto__ = Card;
	FascistPolicyCard.prototype = Object.create( Card && Card.prototype );
	FascistPolicyCard.prototype.constructor = FascistPolicyCard;
	FascistPolicyCard.prototype.goToPosition = function goToPosition (spot, animate)
	{
		if ( spot === void 0 ) spot = 0;
		if ( animate === void 0 ) animate = false;

		spot = Math.max(0, Math.min(5, spot));
		var s = FascistPolicyCard.spots;
		if(animate){
			return Animate.simple(this, {
				pos: s['pos_'+spot],
				quat: s.quat,
				scale: s.scale
			});
		}
		else {
			this.position.copy(s['pos_'+spot]);
			this.quaternion.copy(s.quat);
			this.scale.copy(s.scale);
			return Promise.resolve();
		}
	};

	return FascistPolicyCard;
}(Card));

FascistPolicyCard.spots = {
	pos_0: new THREE.Vector3(-.86, 0.001, .425),
	pos_1: new THREE.Vector3(-.515, 0.001, .425),
	pos_2: new THREE.Vector3(-.17, 0.001, .425),
	pos_3: new THREE.Vector3(0.17, 0.001, .425),
	pos_4: new THREE.Vector3(.518, 0.001, .425),
	pos_5: new THREE.Vector3(0.87, 0.001, .425),
	quat: new THREE.Quaternion(-0.7071067811865475, 0, 0, 0.7071067811865475),
	scale: new THREE.Vector3(0.4, 0.4, 0.4)
};

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

var GameTable = (function (superclass) {
	function GameTable()
	{
		superclass.call(this);

		// table state
		this.liberalCards = 0;
		this.fascistCards = 0;
		this.failedVotes = 0;
		this.cards = [];

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
		this.position.set(0, 0.8, 0);

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
		var failedVotes = ref_data_game.failedVotes;
		var hand = ref_data_game.hand;
		var state = ref_data_game.state;

		var cardsInUpdate = liberalPolicies + fascistPolicies - this.liberalCards - this.fascistCards;
		var animate = cardsInUpdate === 1;

		var promises = [];

		for(var i=this.liberalCards; i<liberalPolicies; i++){
			var card = new LiberalPolicyCard();
			this$1.cards.push(card);
			this$1.add(card);
			promises.push(card.goToPosition(i, animate));
		}
		this.liberalCards = liberalPolicies;

		for(var i=this.fascistCards; i<fascistPolicies; i++){
			var card$1 = new FascistPolicyCard();
			this$1.cards.push(card$1);
			this$1.add(card$1);
			promises.push(card$1.goToPosition(i, animate));
		}
		this.fascistCards = fascistPolicies;

		if(state === 'aftermath' && hand === 1){
			var card$2 = new VetoCard();
			card$2.position.set(0,1,0);
			this.add(card$2);
			promises.push(Animate.wait(1000).then(function () {
				this$1.remove(card$2);
				return SH.electionTracker.anim;
			}));
		}

		if(state === 'aftermath'){
			Promise.all(promises).then(function () {
				SH.dispatchEvent({
					type: 'policyAnimDone',
					bubbles: false
				});
			});
		}

		if(liberalPolicies === 0 && fascistPolicies === 0){
			this.cards.forEach(function (c) { return this$1.remove(c); });
		}
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
		var game = ref.data.game;

		if(game.state === 'lameDuck' || (game.state === 'peek' && game.president === SH.localUser.id))
		{
			this.show();
		}
		else if(game.state === 'setup'){
			this.playerSetup({data: {game: game}});
		}
		else if(game.state === 'done'){
			this.show('New game');
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
			
			if(game.turnOrder.length >= 5){
				this.icon.visible = true;
				this.textComponent.update({text: 'Click to start'});
			}
			else {
				this.icon.visible = false;
				this.textComponent.update({text:
					("Need " + (5-game.turnOrder.length) + " more player" + (game.turnOrder.length!=4 ? 's' : '') + "!")
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

		// create idle display
		this.credits = new CreditsCard();
		this.credits.position.set(0, 1.85, 0);
		this.credits.addBehavior(new altspace.utilities.behaviors.Spin({speed: 0.0002}));
		this.add(this.credits);

		// create victory banner
		this.victoryBanner = PlaceholderMesh.clone();
		this.victoryBanner.text = new NText(this.victoryBanner);
		this.victoryBanner.text.update({fontSize: 2});
		this.victoryBanner.billboard = new NBillboard(this.victoryBanner);
		this.add(this.victoryBanner);

		// update credits/victory
		this.addEventListener('update_state', function (ref) {
			var game = ref.data.game;

			this$1.credits.visible = game.state === 'setup';
			if(game.state === 'done'){
				if(/^liberal/.test(game.victory)){
					this$1.victoryBanner.text.color = 'blue';
					this$1.victoryBanner.text.update({text: 'Liberals win!'});
				}
				else {
					this$1.victoryBanner.text.color = 'red';
					this$1.victoryBanner.text.update({text: 'Fascists win!'});
				}
				
				this$1.victoryBanner.position.set(0,0.8,0);
				this$1.victoryBanner.scale.setScalar(.001);
				this$1.victoryBanner.visible = true;
				Animate.simple(this$1.victoryBanner, {
					pos: new THREE.Vector3(0, 1.85, 0),
					scale: new THREE.Vector3(1,1,1)
				});
			}
			else {
				this$1.victoryBanner.visible = false;
			}
		});

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvcG9seWZpbGwuanMiLCIuLi8uLi9zcmMvY2xpZW50L2Fzc2V0bWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hdGl2ZWNvbXBvbmVudHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RhYmxlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC91dGlscy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3Rwcm9jZXNzb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JwYmEuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JhbGxvdC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVyaW5mby5qcyIsIi4uLy4uL3NyYy9jbGllbnQvY2Fwc3VsZWdlb21ldHJ5LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9oaXRib3guanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlYXQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NvbnRpbnVlYm94LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9lbGVjdGlvbnRyYWNrZXIuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlY3JldGhpdGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmlmKCFBcnJheS5wcm90b3R5cGUuaW5jbHVkZXMpe1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAnaW5jbHVkZXMnLCB7XG5cdFx0dmFsdWU6IGZ1bmN0aW9uKGl0ZW0pe1xuXHRcdFx0cmV0dXJuIHRoaXMuaW5kZXhPZihpdGVtKSA+IC0xO1xuXHRcdH0sXG5cdFx0d3JpdGFibGU6IGZhbHNlLFxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2Vcblx0fSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0bWFuaWZlc3Q6IHtcblx0XHRtb2RlbHM6IHtcblx0XHRcdHRhYmxlOiAnc3RhdGljL21vZGVsL3RhYmxlLmdsdGYnLFxuXHRcdFx0bmFtZXBsYXRlOiAnc3RhdGljL21vZGVsL25hbWVwbGF0ZS5kYWUnLFxuXHRcdFx0dG9waGF0OiAnc3RhdGljL21vZGVsL3RvcGhhdC5nbHRmJyxcblx0XHRcdHZpc29yY2FwOiAnc3RhdGljL21vZGVsL3Zpc29yX2NhcC5nbHRmJyxcblx0XHRcdC8vZHVtbXk6ICdzdGF0aWMvbW9kZWwvZHVtbXkuZ2x0ZicsXG5cdFx0XHQvL3BsYXllcm1ldGVyOiAnc3RhdGljL21vZGVsL3BsYXllcm1ldGVyLmdsdGYnXG5cdFx0fSxcblx0XHR0ZXh0dXJlczoge1xuXHRcdFx0Ym9hcmRfbGFyZ2U6ICdzdGF0aWMvaW1nL2JvYXJkLWxhcmdlLmpwZycsXG5cdFx0XHRib2FyZF9tZWQ6ICdzdGF0aWMvaW1nL2JvYXJkLW1lZGl1bS5qcGcnLFxuXHRcdFx0Ym9hcmRfc21hbGw6ICdzdGF0aWMvaW1nL2JvYXJkLXNtYWxsLmpwZycsXG5cdFx0XHRjYXJkczogJ3N0YXRpYy9pbWcvY2FyZHMuanBnJyxcblx0XHRcdHJlc2V0OiAnc3RhdGljL2ltZy9ib21iLnBuZycsXG5cdFx0XHQvL3RleHQ6ICdzdGF0aWMvaW1nL3RleHQucG5nJ1xuXHRcdH1cblx0fSxcblx0Y2FjaGU6IHt9LFxuXHRmaXhNYXRlcmlhbHM6IGZ1bmN0aW9uKClcblx0e1xuXHRcdE9iamVjdC5rZXlzKHRoaXMuY2FjaGUubW9kZWxzKS5mb3JFYWNoKGlkID0+IHtcblx0XHRcdHRoaXMuY2FjaGUubW9kZWxzW2lkXS50cmF2ZXJzZShvYmogPT4ge1xuXHRcdFx0XHRpZihvYmoubWF0ZXJpYWwgaW5zdGFuY2VvZiBUSFJFRS5NZXNoU3RhbmRhcmRNYXRlcmlhbCl7XG5cdFx0XHRcdFx0bGV0IG5ld01hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCgpO1xuXHRcdFx0XHRcdG5ld01hdC5tYXAgPSBvYmoubWF0ZXJpYWwubWFwO1xuXHRcdFx0XHRcdG5ld01hdC5jb2xvci5jb3B5KG9iai5tYXRlcmlhbC5jb2xvcik7XG5cdFx0XHRcdFx0b2JqLm1hdGVyaWFsID0gbmV3TWF0O1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5jbGFzcyBCZWhhdmlvclxue1xuXHRjb25zdHJ1Y3Rvcih0eXBlKXtcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xuXHR9XG5cblx0YXdha2Uob2JqKXtcblx0XHR0aGlzLm9iamVjdDNEID0gb2JqO1xuXHR9XG5cblx0c3RhcnQoKXsgfVxuXG5cdHVwZGF0ZShkVCl7IH1cblxuXHRkaXNwb3NlKCl7IH1cbn1cblxuY2xhc3MgQlN5bmMgZXh0ZW5kcyBCZWhhdmlvclxue1xuXHRjb25zdHJ1Y3RvcihldmVudE5hbWUpXG5cdHtcblx0XHRzdXBlcignQlN5bmMnKTtcblx0XHR0aGlzLl9zID0gU0guc29ja2V0O1xuXG5cdFx0Ly8gbGlzdGVuIGZvciB1cGRhdGUgZXZlbnRzXG5cdFx0dGhpcy5ob29rID0gdGhpcy5fcy5vbihldmVudE5hbWUsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLmV2ZW50TmFtZSA9IGV2ZW50TmFtZTtcblx0XHR0aGlzLm93bmVyID0gMDtcblx0fVxuXG5cdHVwZGF0ZUZyb21TZXJ2ZXIoZGF0YSlcblx0e1xuXHRcdHRoaXMub2JqZWN0M0QucG9zaXRpb24uZnJvbUFycmF5KGRhdGEsIDApO1xuXHRcdHRoaXMub2JqZWN0M0Qucm90YXRpb24uZnJvbUFycmF5KGRhdGEsIDMpO1xuXHR9XG5cblx0dGFrZU93bmVyc2hpcCgpXG5cdHtcblx0XHRpZihTSC5sb2NhbFVzZXIgJiYgU0gubG9jYWxVc2VyLnVzZXJJZClcblx0XHRcdHRoaXMub3duZXIgPSBTSC5sb2NhbFVzZXIudXNlcklkO1xuXHR9XG5cblx0dXBkYXRlKGRUKVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyICYmIFNILmxvY2FsVXNlci5za2VsZXRvbiAmJiBTSC5sb2NhbFVzZXIuaWQgPT09IHRoaXMub3duZXIpXG5cdFx0e1xuXHRcdFx0bGV0IGogPSBTSC5sb2NhbFVzZXIuc2tlbGV0b24uZ2V0Sm9pbnQoJ0hlYWQnKTtcblx0XHRcdHRoaXMuX3MuZW1pdCh0aGlzLmV2ZW50TmFtZSwgWy4uLmoucG9zaXRpb24udG9BcnJheSgpLCAuLi5qLnJvdGF0aW9uLnRvQXJyYXkoKV0pO1xuXHRcdH1cblx0fVxuXG59XG5cbmV4cG9ydCB7IEJlaGF2aW9yLCBCU3luYyB9O1xuIiwiaW1wb3J0IHsgQmVoYXZpb3IgfSBmcm9tICcuL2JlaGF2aW9yJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQW5pbWF0ZSBleHRlbmRzIEJlaGF2aW9yXG57XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoJ0FuaW1hdGUnKTtcblx0XHR0aGlzLmdyb3VwID0gbmV3IFRXRUVOLkdyb3VwKCk7XG5cdH1cblx0dXBkYXRlKCl7XG5cdFx0dGhpcy5ncm91cC51cGRhdGUocGVyZm9ybWFuY2Uubm93KCkpO1xuXHR9XG5cblx0LyoqXG5cdCAqIE1vdmUgYW4gb2JqZWN0IGZyb20gQSB0byBCXG5cdCAqIEBwYXJhbSB7VEhSRUUuT2JqZWN0M0R9IHRhcmdldCBcblx0ICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcblx0ICovXG5cdHN0YXRpYyBzaW1wbGUodGFyZ2V0LCB7cGFyZW50PW51bGwsIHBvcz1udWxsLCBxdWF0PW51bGwsIHNjYWxlPW51bGwsIG1hdHJpeD1udWxsLCBkdXJhdGlvbj02MDB9ID0ge30pXG5cdHtcblx0XHQvLyBleHRyYWN0IHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlIGZyb20gbWF0cml4XG5cdFx0aWYobWF0cml4KVxuXHRcdHtcblx0XHRcdHBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cdFx0XHRxdWF0ID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblx0XHRcdHNjYWxlID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblx0XHRcdG1hdHJpeC5kZWNvbXBvc2UocG9zLCBxdWF0LCBzY2FsZSk7XG5cdFx0fVxuXG5cdFx0Ly8gc2h1ZmZsZSBoaWVyYXJjaHksIGJ1dCBrZWVwIHdvcmxkIHRyYW5zZm9ybSB0aGUgc2FtZVxuXHRcdGlmKHBhcmVudCAmJiB0aGlzLnBhcmVudCAhPT0gdGFyZ2V0LnBhcmVudClcblx0XHR7XG5cdFx0XHR0YXJnZXQuYXBwbHlNYXRyaXgodGFyZ2V0LnBhcmVudC5tYXRyaXhXb3JsZCk7XG5cdFx0XHR0YXJnZXQuYXBwbHlNYXRyaXgobmV3IFRIUkVFLk1hdHJpeDQoKS5nZXRJbnZlcnNlKHBhcmVudC5tYXRyaXhXb3JsZCkpO1xuXHRcdFx0cGFyZW50LmFkZChvYmopO1xuXHRcdH1cblxuXHRcdGxldCBpbml0aWFsUXVhdCA9IHRhcmdldC5xdWF0ZXJuaW9uLmNsb25lKCk7XG5cblx0XHRsZXQgYW5pbSA9IHRhcmdldC5nZXRCZWhhdmlvckJ5VHlwZSgnQW5pbWF0ZScpO1xuXHRcdGlmKCFhbmltKXtcblx0XHRcdHRhcmdldC5hZGRCZWhhdmlvciggYW5pbSA9IG5ldyBBbmltYXRlKCkgKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBleGVjdXRvcihyZXNvbHZlLCByZWplY3QpXG5cdFx0e1xuXHRcdFx0bGV0IHRvQ29tcGxldGUgPSAwO1xuXHRcdFx0aWYocG9zKVxuXHRcdFx0e1xuXHRcdFx0XHRuZXcgVFdFRU4uVHdlZW4odGFyZ2V0LnBvc2l0aW9uLCBhbmltLmdyb3VwKVxuXHRcdFx0XHQudG8oe3g6IHBvcy54LCB5OiBwb3MueSwgejogcG9zLnp9LCBkdXJhdGlvbilcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcblx0XHRcdFx0Lm9uQ29tcGxldGUoZ3JvdXBJc0RvbmUpXG5cdFx0XHRcdC5zdGFydCgpO1xuXHRcdFx0XHR0b0NvbXBsZXRlKys7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHF1YXQpXG5cdFx0XHR7XG5cdFx0XHRcdG5ldyBUV0VFTi5Ud2Vlbih7dDowfSwgYW5pbS5ncm91cClcblx0XHRcdFx0LnRvKHt0OjF9LCBkdXJhdGlvbilcblx0XHRcdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcblx0XHRcdFx0Lm9uVXBkYXRlKHQgPT4gVEhSRUUuUXVhdGVybmlvbi5zbGVycChpbml0aWFsUXVhdCwgcXVhdCwgdGFyZ2V0LnF1YXRlcm5pb24sIHQudCkpXG5cdFx0XHRcdC5vbkNvbXBsZXRlKGdyb3VwSXNEb25lKVxuXHRcdFx0XHQuc3RhcnQoKTtcblx0XHRcdFx0dG9Db21wbGV0ZSsrO1xuXHRcdFx0fVxuXG5cdFx0XHRpZihzY2FsZSlcblx0XHRcdHtcblx0XHRcdFx0bmV3IFRXRUVOLlR3ZWVuKHRhcmdldC5zY2FsZSwgYW5pbS5ncm91cClcblx0XHRcdFx0LnRvKHt4OiBzY2FsZS54LCB5OiBzY2FsZS55LCB6OiBzY2FsZS56fSwgZHVyYXRpb24pXG5cdFx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXG5cdFx0XHRcdC5vbkNvbXBsZXRlKGdyb3VwSXNEb25lKVxuXHRcdFx0XHQuc3RhcnQoKTtcblx0XHRcdFx0dG9Db21wbGV0ZSsrO1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBncm91cElzRG9uZSgpe1xuXHRcdFx0XHRpZigtLXRvQ29tcGxldGUgPT09IDApe1xuXHRcdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBuZXcgUHJvbWlzZShleGVjdXRvcik7XG5cdH1cblxuXHRzdGF0aWMgd2FpdChkdXJhdGlvbil7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdHNldFRpbWVvdXQocmVzb2x2ZSwgZHVyYXRpb24pO1xuXHRcdH0pO1xuXHR9XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG4vLyBlbnVtIGNvbnN0YW50c1xubGV0IFR5cGVzID0gT2JqZWN0LmZyZWV6ZSh7XG5cdFBPTElDWV9MSUJFUkFMOiAwLFxuXHRQT0xJQ1lfRkFTQ0lTVDogMSxcblx0Uk9MRV9MSUJFUkFMOiAyLFxuXHRST0xFX0ZBU0NJU1Q6IDMsXG5cdFJPTEVfSElUTEVSOiA0LFxuXHRQQVJUWV9MSUJFUkFMOiA1LFxuXHRQQVJUWV9GQVNDSVNUOiA2LFxuXHRKQTogNyxcblx0TkVJTjogOCxcblx0QkxBTks6IDksXG5cdENSRURJVFM6IDEwLFxuXHRWRVRPOiAxMVxufSk7XG5cbmxldCBnZW9tZXRyeSA9IG51bGwsIG1hdGVyaWFsID0gbnVsbDtcblxuZnVuY3Rpb24gaW5pdENhcmREYXRhKClcbntcblx0bGV0IGZsb2F0RGF0YSA9IFtcblx0XHQvLyBwb3NpdGlvbiAocG9ydHJhaXQpXG5cdFx0MC4zNTc1LCAwLjUsIDAuMDAwNSxcblx0XHQtLjM1NzUsIDAuNSwgMC4wMDA1LFxuXHRcdC0uMzU3NSwgLS41LCAwLjAwMDUsXG5cdFx0MC4zNTc1LCAtLjUsIDAuMDAwNSxcblx0XHQwLjM1NzUsIDAuNSwgLS4wMDA1LFxuXHRcdC0uMzU3NSwgMC41LCAtLjAwMDUsXG5cdFx0LS4zNTc1LCAtLjUsIC0uMDAwNSxcblx0XHQwLjM1NzUsIC0uNSwgLS4wMDA1LFxuXHRcblx0XHQvLyBwb3NpdGlvbiAobGFuZHNjYXBlKVxuXHRcdDAuNSwgLS4zNTc1LCAwLjAwMDUsXG5cdFx0MC41LCAwLjM1NzUsIDAuMDAwNSxcblx0XHQtLjUsIDAuMzU3NSwgMC4wMDA1LFxuXHRcdC0uNSwgLS4zNTc1LCAwLjAwMDUsXG5cdFx0MC41LCAtLjM1NzUsIC0uMDAwNSxcblx0XHQwLjUsIDAuMzU3NSwgLS4wMDA1LFxuXHRcdC0uNSwgMC4zNTc1LCAtLjAwMDUsXG5cdFx0LS41LCAtLjM1NzUsIC0uMDAwNSxcblx0XG5cdFx0Ly8gVVZzXG5cdFx0LyogLS0tLS0tLS0tLS0tLS0gY2FyZCBmYWNlIC0tLS0tLS0tLS0tLS0gKi8gLyogLS0tLS0tLS0tLS0tLSBjYXJkIGJhY2sgLS0tLS0tLS0tLS0tLS0qL1xuXHRcdC43NTQsLjk5NiwgLjc1NCwuODM0LCAuOTk3LC44MzQsIC45OTcsLjk5NiwgLjc1NCwuOTk2LCAuNzU0LC44MzQsIC45OTcsLjgzNCwgLjk5NywuOTk2LCAvLyBsaWJlcmFsIHBvbGljeVxuXHRcdC43NTQsLjgyMiwgLjc1NCwuNjYwLCAuOTk2LC42NjAsIC45OTYsLjgyMiwgLjc1NCwuODIyLCAuNzU0LC42NjAsIC45OTYsLjY2MCwgLjk5NiwuODIyLCAvLyBmYXNjaXN0IHBvbGljeVxuXHRcdC43NDYsLjk5NiwgLjUwNSwuOTk2LCAuNTA1LC42NTAsIC43NDYsLjY1MCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBsaWJlcmFsIHJvbGVcblx0XHQuNzQ2LC42NDUsIC41MDUsLjY0NSwgLjUwNSwuMzAwLCAuNzQ2LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gZmFzY2lzdCByb2xlXG5cdFx0Ljk5NiwuNjQ1LCAuNzU0LC42NDUsIC43NTQsLjMwMCwgLjk5NiwuMzAwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGhpdGxlciByb2xlXG5cdFx0LjQ5NSwuOTk2LCAuMjU1LC45OTYsIC4yNTUsLjY1MCwgLjQ5NSwuNjUwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGxpYmVyYWwgcGFydHlcblx0XHQuNDk1LC42NDUsIC4yNTUsLjY0NSwgLjI1NSwuMzAwLCAuNDk1LC4zMDAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gZmFzY2lzdCBwYXJ0eVxuXHRcdC4yNDQsLjk5MiwgLjAwNSwuOTkyLCAuMDA1LC42NTMsIC4yNDQsLjY1MywgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBqYVxuXHRcdC4yNDMsLjY0MiwgLjAwNiwuNjQyLCAuMDA2LC4zMDIsIC4yNDMsLjMwMiwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBuZWluXG5cdFx0LjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGJsYW5rXG5cdFx0LjM5NywuMjc2LCAuMzk3LC4wMTUsIC43NjUsLjAxNSwgLjc2NSwuMjc2LCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGNyZWRpdHNcblx0XHQuOTYzLC4yNzAsIC44MDQsLjI3MCwgLjgwNCwuMDI5LCAuOTYzLC4wMjksIC44MDQsLjI3MCwgLjk2MywuMjcwLCAuOTYzLC4wMjksIC44MDQsLjAyOSwgLy8gdmV0b1xuXG5cdF07XG5cdFxuXHRsZXQgaW50RGF0YSA9IFtcblx0XHQvLyB0cmlhbmdsZSBpbmRleFxuXHRcdDAsMSwyLCAwLDIsMywgNCw3LDUsIDUsNyw2XG5cdF07XG5cdFxuXHQvLyB0d28gcG9zaXRpb24gc2V0cywgMTEgVVYgc2V0cywgMSBpbmRleCBzZXRcblx0bGV0IGdlb0J1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcig0KmZsb2F0RGF0YS5sZW5ndGggKyAyKmludERhdGEubGVuZ3RoKTtcblx0bGV0IHRlbXAgPSBuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgMCwgZmxvYXREYXRhLmxlbmd0aCk7XG5cdHRlbXAuc2V0KGZsb2F0RGF0YSk7XG5cdHRlbXAgPSBuZXcgVWludDE2QXJyYXkoZ2VvQnVmZmVyLCA0KmZsb2F0RGF0YS5sZW5ndGgsIGludERhdGEubGVuZ3RoKTtcblx0dGVtcC5zZXQoaW50RGF0YSk7XG5cdFxuXHQvLyBjaG9wIHVwIGJ1ZmZlciBpbnRvIHZlcnRleCBhdHRyaWJ1dGVzXG5cdGxldCBwb3NMZW5ndGggPSA4KjMsIHV2TGVuZ3RoID0gOCoyLCBpbmRleExlbmd0aCA9IDEyO1xuXHRsZXQgcG9zUG9ydHJhaXQgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCAwLCBwb3NMZW5ndGgpLCAzKSxcblx0XHRwb3NMYW5kc2NhcGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCA0KnBvc0xlbmd0aCwgcG9zTGVuZ3RoKSwgMyk7XG5cdGxldCB1dnMgPSBbXTtcblx0Zm9yKGxldCBpPTA7IGk8MTI7IGkrKyl7XG5cdFx0dXZzLnB1c2goIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDgqcG9zTGVuZ3RoICsgNCppKnV2TGVuZ3RoLCB1dkxlbmd0aCksIDIpICk7XG5cdH1cblx0bGV0IGluZGV4ID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgVWludDE2QXJyYXkoZ2VvQnVmZmVyLCA0KmZsb2F0RGF0YS5sZW5ndGgsIGluZGV4TGVuZ3RoKSwgMSk7XG5cdFxuXHRnZW9tZXRyeSA9IE9iamVjdC5rZXlzKFR5cGVzKS5tYXAoKGtleSwgaSkgPT5cblx0e1xuXHRcdGxldCBnZW8gPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcblx0XHRnZW8uYWRkQXR0cmlidXRlKCdwb3NpdGlvbicsIGk9PVR5cGVzLkpBIHx8IGk9PVR5cGVzLk5FSU4gPyBwb3NMYW5kc2NhcGUgOiBwb3NQb3J0cmFpdCk7XG5cdFx0Z2VvLmFkZEF0dHJpYnV0ZSgndXYnLCB1dnNbaV0pO1xuXHRcdGdlby5zZXRJbmRleChpbmRleCk7XG5cdFx0cmV0dXJuIGdlbztcblx0fSk7XG5cblx0bWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogQXNzZXRNYW5hZ2VyLmNhY2hlLnRleHR1cmVzLmNhcmRzfSk7XG59XG5cblxuY2xhc3MgQ2FyZCBleHRlbmRzIFRIUkVFLk1lc2hcbntcblx0Y29uc3RydWN0b3IodHlwZSA9IFR5cGVzLkJMQU5LKVxuXHR7XG5cdFx0aWYoIWdlb21ldHJ5IHx8ICFtYXRlcmlhbCkgaW5pdENhcmREYXRhKCk7XG5cblx0XHRsZXQgZ2VvID0gZ2VvbWV0cnlbdHlwZV07XG5cdFx0c3VwZXIoZ2VvLCBtYXRlcmlhbCk7XG5cdFx0dGhpcy5zY2FsZS5zZXRTY2FsYXIoMC43KTtcblx0fVxufVxuXG5jbGFzcyBCbGFua0NhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXsgc3VwZXIoKTsgfVxufVxuXG5jbGFzcyBDcmVkaXRzQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLkNSRURJVFMpO1xuXHR9XG59XG5cbmNsYXNzIExpYmVyYWxQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0xJQkVSQUwsIGZhbHNlKTtcblx0fVxuXHRnb1RvUG9zaXRpb24oc3BvdCA9IDAsIGFuaW1hdGUgPSBmYWxzZSlcblx0e1xuXHRcdHNwb3QgPSBNYXRoLm1heCgwLCBNYXRoLm1pbig0LCBzcG90KSk7XG5cdFx0bGV0IHMgPSBMaWJlcmFsUG9saWN5Q2FyZC5zcG90cztcblx0XHRpZihhbmltYXRlKXtcblx0XHRcdHJldHVybiBBbmltYXRlLnNpbXBsZSh0aGlzLCB7XG5cdFx0XHRcdHBvczogc1sncG9zXycrc3BvdF0sXG5cdFx0XHRcdHF1YXQ6IHMucXVhdCxcblx0XHRcdFx0c2NhbGU6IHMuc2NhbGVcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMucG9zaXRpb24uY29weShzWydwb3NfJytzcG90XSk7XG5cdFx0XHR0aGlzLnF1YXRlcm5pb24uY29weShzLnF1YXQpO1xuXHRcdFx0dGhpcy5zY2FsZS5jb3B5KHMuc2NhbGUpO1xuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdH1cblx0fVxufVxuXG5MaWJlcmFsUG9saWN5Q2FyZC5zcG90cyA9IHtcblx0cG9zXzA6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNjksIDAuMDAxLCAtMC40MiksXG5cdHBvc18xOiBuZXcgVEhSRUUuVmVjdG9yMygwLjM0NSwgMC4wMDEsIC0wLjQyKSxcblx0cG9zXzI6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMDAyLCAwLjAwMSwgLTAuNDIpLFxuXHRwb3NfMzogbmV3IFRIUkVFLlZlY3RvcjMoLS4zNCwgMC4wMDEsIC0wLjQyKSxcblx0cG9zXzQ6IG5ldyBUSFJFRS5WZWN0b3IzKC0uNjksIDAuMDAxLCAtMC40MiksXG5cdHF1YXQ6IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMC43MDcxMDY3ODExODY1NDc1LCAwKSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNCwgMC40LCAwLjQpXG59XG5cbmNsYXNzIEZhc2Npc3RQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0ZBU0NJU1QpO1xuXHR9XG5cdGdvVG9Qb3NpdGlvbihzcG90ID0gMCwgYW5pbWF0ZSA9IGZhbHNlKVxuXHR7XG5cdFx0c3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDUsIHNwb3QpKTtcblx0XHRsZXQgcyA9IEZhc2Npc3RQb2xpY3lDYXJkLnNwb3RzO1xuXHRcdGlmKGFuaW1hdGUpe1xuXHRcdFx0cmV0dXJuIEFuaW1hdGUuc2ltcGxlKHRoaXMsIHtcblx0XHRcdFx0cG9zOiBzWydwb3NfJytzcG90XSxcblx0XHRcdFx0cXVhdDogcy5xdWF0LFxuXHRcdFx0XHRzY2FsZTogcy5zY2FsZVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5jb3B5KHNbJ3Bvc18nK3Nwb3RdKTtcblx0XHRcdHRoaXMucXVhdGVybmlvbi5jb3B5KHMucXVhdCk7XG5cdFx0XHR0aGlzLnNjYWxlLmNvcHkocy5zY2FsZSk7XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdFx0fVxuXHR9XG59XG5cbkZhc2Npc3RQb2xpY3lDYXJkLnNwb3RzID0ge1xuXHRwb3NfMDogbmV3IFRIUkVFLlZlY3RvcjMoLS44NiwgMC4wMDEsIC40MjUpLFxuXHRwb3NfMTogbmV3IFRIUkVFLlZlY3RvcjMoLS41MTUsIDAuMDAxLCAuNDI1KSxcblx0cG9zXzI6IG5ldyBUSFJFRS5WZWN0b3IzKC0uMTcsIDAuMDAxLCAuNDI1KSxcblx0cG9zXzM6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMTcsIDAuMDAxLCAuNDI1KSxcblx0cG9zXzQ6IG5ldyBUSFJFRS5WZWN0b3IzKC41MTgsIDAuMDAxLCAuNDI1KSxcblx0cG9zXzU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuODcsIDAuMDAxLCAuNDI1KSxcblx0cXVhdDogbmV3IFRIUkVFLlF1YXRlcm5pb24oLTAuNzA3MTA2NzgxMTg2NTQ3NSwgMCwgMCwgMC43MDcxMDY3ODExODY1NDc1KSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNCwgMC40LCAwLjQpXG59XG5cbmNsYXNzIFZldG9DYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuVkVUTyk7XG5cdH1cbn1cbmNsYXNzIExpYmVyYWxSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfTElCRVJBTCk7XG5cdH1cbn1cblxuY2xhc3MgRmFzY2lzdFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9GQVNDSVNUKTtcblx0fVxufVxuXG5jbGFzcyBIaXRsZXJSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfSElUTEVSKTtcblx0fVxufVxuXG5jbGFzcyBMaWJlcmFsUGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfTElCRVJBTCk7XG5cdH1cbn1cblxuY2xhc3MgRmFzY2lzdFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0ZBU0NJU1QpO1xuXHR9XG59XG5cbmNsYXNzIEphQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLkpBKTtcblx0fVxufVxuXG5jbGFzcyBOZWluQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLk5FSU4pO1xuXHR9XG59XG5cblxuZXhwb3J0IHtcblx0Q2FyZCwgVHlwZXMsIEJsYW5rQ2FyZCwgQ3JlZGl0c0NhcmQsIFZldG9DYXJkLFxuXHRMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFJvbGVDYXJkLFxuXHRIaXRsZXJSb2xlQ2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZFxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubGV0IHBsYWNlaG9sZGVyR2VvID0gbmV3IFRIUkVFLkJveEJ1ZmZlckdlb21ldHJ5KC4wMDEsIC4wMDEsIC4wMDEpO1xubGV0IHBsYWNlaG9sZGVyTWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHhmZmZmZmYsIHZpc2libGU6IGZhbHNlfSk7XG5sZXQgUGxhY2Vob2xkZXJNZXNoID0gbmV3IFRIUkVFLk1lc2gocGxhY2Vob2xkZXJHZW8sIHBsYWNlaG9sZGVyTWF0KTtcblxuY2xhc3MgTmF0aXZlQ29tcG9uZW50XG57XG5cdGNvbnN0cnVjdG9yKG1lc2gsIG5lZWRzVXBkYXRlKVxuXHR7XG5cdFx0dGhpcy5tZXNoID0gbWVzaDtcblx0XHRhbHRzcGFjZS5hZGROYXRpdmVDb21wb25lbnQodGhpcy5tZXNoLCB0aGlzLm5hbWUpO1xuXG5cdFx0aWYobmVlZHNVcGRhdGUpXG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXHR9XG5cblx0dXBkYXRlKGZpZWxkcyA9IHt9KVxuXHR7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLmRhdGEsIGZpZWxkcyk7XG5cdFx0YWx0c3BhY2UudXBkYXRlTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lLCB0aGlzLmRhdGEpO1xuXHR9XG5cblx0ZGVzdHJveSgpXG5cdHtcblx0XHRhbHRzcGFjZS5yZW1vdmVOYXRpdmVDb21wb25lbnQodGhpcy5tZXNoLCB0aGlzLm5hbWUpO1xuXHR9XG59XG5cbmNsYXNzIE5UZXh0IGV4dGVuZHMgTmF0aXZlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IobWVzaCl7XG5cdFx0dGhpcy5uYW1lID0gJ24tdGV4dCc7XG5cdFx0dGhpcy5kYXRhID0ge1xuXHRcdFx0Zm9udFNpemU6IDEwLFxuXHRcdFx0aGVpZ2h0OiAxLFxuXHRcdFx0d2lkdGg6IDEwLFxuXHRcdFx0dmVydGljYWxBbGlnbjogJ21pZGRsZScsXG5cdFx0XHRob3Jpem9udGFsQWxpZ246ICdtaWRkbGUnLFxuXHRcdFx0dGV4dDogJydcblx0XHR9O1xuXHRcdHN1cGVyKG1lc2gsIHRydWUpO1xuXG5cdFx0dGhpcy5jb2xvciA9ICdibGFjayc7XG5cdH1cblx0dXBkYXRlKGZpZWxkcyA9IHt9KXtcblx0XHRpZihmaWVsZHMudGV4dClcblx0XHRcdGZpZWxkcy50ZXh0ID0gYDxjb2xvcj0ke3RoaXMuY29sb3J9PiR7ZmllbGRzLnRleHR9PC9jb2xvcj5gO1xuXHRcdE5hdGl2ZUNvbXBvbmVudC5wcm90b3R5cGUudXBkYXRlLmNhbGwodGhpcywgZmllbGRzKTtcblx0fVxufVxuXG5jbGFzcyBOU2tlbGV0b25QYXJlbnQgZXh0ZW5kcyBOYXRpdmVDb21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcihtZXNoKXtcblx0XHR0aGlzLm5hbWUgPSAnbi1za2VsZXRvbi1wYXJlbnQnO1xuXHRcdHRoaXMuZGF0YSA9IHtcblx0XHRcdGluZGV4OiAwLFxuXHRcdFx0cGFydDogJ2hlYWQnLFxuXHRcdFx0c2lkZTogJ2NlbnRlcicsIFxuXHRcdFx0dXNlcklkOiAwXG5cdFx0fTtcblx0XHRzdXBlcihtZXNoLCB0cnVlKTtcblx0fVxufVxuXG5jbGFzcyBOQmlsbGJvYXJkIGV4dGVuZHMgTmF0aXZlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IobWVzaCl7XG5cdFx0dGhpcy5uYW1lID0gJ24tYmlsbGJvYXJkJztcblx0XHRzdXBlcihtZXNoLCBmYWxzZSk7XG5cdH1cbn1cblxuZXhwb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5UZXh0LCBOU2tlbGV0b25QYXJlbnQsIE5CaWxsYm9hcmR9OyIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQge05Ta2VsZXRvblBhcmVudH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcblxuY2xhc3MgSGF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IobW9kZWwpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuY3VycmVudElkID0gJyc7XG5cdFx0dGhpcy5jb21wb25lbnRzID0ge2hhdDogbnVsbCwgdGV4dDogbnVsbH07XG5cblx0XHRpZihtb2RlbC5wYXJlbnQpXG5cdFx0XHRtb2RlbC5wYXJlbnQucmVtb3ZlKG1vZGVsKTtcblx0XHRtb2RlbC51cGRhdGVNYXRyaXhXb3JsZCh0cnVlKTtcblxuXHRcdC8vIGdyYWIgbWVzaGVzXG5cdFx0bGV0IHByb3AgPSAnJztcblx0XHRtb2RlbC50cmF2ZXJzZShvYmogPT4ge1xuXHRcdFx0aWYob2JqLm5hbWUgPT09ICdoYXQnIHx8IG9iai5uYW1lID09PSAndGV4dCcpXG5cdFx0XHRcdHByb3AgPSBvYmoubmFtZTtcblx0XHRcdGVsc2UgaWYob2JqIGluc3RhbmNlb2YgVEhSRUUuTWVzaClcblx0XHRcdFx0dGhpc1twcm9wXSA9IG9iajtcblx0XHR9KTtcblxuXHRcdC8vIHN0cmlwIG91dCBtaWRkbGUgbm9kZXNcblx0XHR0aGlzLmhhdC5tYXRyaXguY29weSh0aGlzLmhhdC5tYXRyaXhXb3JsZCk7XG5cdFx0dGhpcy5oYXQubWF0cml4LmRlY29tcG9zZSh0aGlzLmhhdC5wb3NpdGlvbiwgdGhpcy5oYXQucXVhdGVybmlvbiwgdGhpcy5oYXQuc2NhbGUpO1xuXHRcdHRoaXMuYWRkKHRoaXMuaGF0KTtcblxuXHRcdHRoaXMudGV4dC5tYXRyaXguY29weSh0aGlzLnRleHQubWF0cml4V29ybGQpO1xuXHRcdHRoaXMudGV4dC5tYXRyaXguZGVjb21wb3NlKHRoaXMudGV4dC5wb3NpdGlvbiwgdGhpcy50ZXh0LnF1YXRlcm5pb24sIHRoaXMudGV4dC5zY2FsZSk7XG5cdFx0dGhpcy5hZGQodGhpcy50ZXh0KTtcblxuXHRcdGQuc2NlbmUuYWRkKHRoaXMpO1xuXHR9XG5cblx0c2V0T3duZXIodXNlcklkKVxuXHR7XG5cdFx0aWYoIXRoaXMuY3VycmVudElkICYmIHVzZXJJZCl7XG5cdFx0XHRkLnNjZW5lLmFkZCh0aGlzKTtcblx0XHRcdHRoaXMuY29tcG9uZW50cy5oYXQgPSBuZXcgTlNrZWxldG9uUGFyZW50KHRoaXMuaGF0KTtcblx0XHRcdHRoaXMuY29tcG9uZW50cy50ZXh0ID0gbmV3IE5Ta2VsZXRvblBhcmVudCh0aGlzLnRleHQpO1xuXHRcdH1cblx0XHRlbHNlIGlmKHRoaXMuY3VycmVudElkICYmICF1c2VySWQpe1xuXHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdC5kZXN0cm95KCk7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHMudGV4dC5kZXN0cm95KCk7XG5cdFx0XHRkLnNjZW5lLnJlbW92ZSh0aGlzKTtcblx0XHR9XG5cblx0XHRpZih1c2VySWQpe1xuXHRcdFx0dGhpcy5jb21wb25lbnRzLmhhdC51cGRhdGUoe3VzZXJJZH0pO1xuXHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQudXBkYXRlKHt1c2VySWR9KTtcblx0XHR9XG5cblx0XHR0aGlzLmN1cnJlbnRJZCA9IHVzZXJJZDtcblx0fVxufVxuXG5jbGFzcyBQcmVzaWRlbnRIYXQgZXh0ZW5kcyBIYXRcbntcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihBTS5jYWNoZS5tb2RlbHMudG9waGF0KTtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjE0NC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHR0aGlzLnNjYWxlLm11bHRpcGx5U2NhbGFyKDEuMi9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xuXHRcdFxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWV9fSkgPT4ge1xuXHRcdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyAmJiBnYW1lLmZhaWxlZFZvdGVzID09PSAwKXtcblx0XHRcdFx0bGV0IHNpdHRpbmcgPSBnYW1lLnNwZWNpYWxFbGVjdGlvbiA/IGdhbWUucHJlc2lkZW50IDogZ2FtZS5sYXN0UHJlc2lkZW50O1xuXHRcdFx0XHR0aGlzLnNldE93bmVyKHNpdHRpbmcpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59O1xuXG5jbGFzcyBDaGFuY2VsbG9ySGF0IGV4dGVuZHMgSGF0XG57XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLnZpc29yY2FwKTtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjA3L1NILmVudi5waXhlbHNQZXJNZXRlciwgLjAzOC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xuXHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMS4yL1NILmVudi5waXhlbHNQZXJNZXRlcik7XG5cdFx0XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2xhc3RDaGFuY2VsbG9yJywgZSA9PiB7XG5cdFx0XHR0aGlzLnNldE93bmVyKGUuZGF0YS5nYW1lLmxhc3RDaGFuY2VsbG9yKTtcblx0XHR9KTtcblx0fVxufVxuXG5leHBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xuaW1wb3J0IHtMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIFZldG9DYXJkfSBmcm9tICcuL2NhcmQnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHYW1lVGFibGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0Ly8gdGFibGUgc3RhdGVcblx0XHR0aGlzLmxpYmVyYWxDYXJkcyA9IDA7XG5cdFx0dGhpcy5mYXNjaXN0Q2FyZHMgPSAwO1xuXHRcdHRoaXMuZmFpbGVkVm90ZXMgPSAwO1xuXHRcdHRoaXMuY2FyZHMgPSBbXTtcblxuXHRcdC8vIGFkZCB0YWJsZSBhc3NldFxuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMudGFibGU7XG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHQvLyBzYXZlIHJlZmVyZW5jZXMgdG8gdGhlIHRleHR1cmVzXG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX3NtYWxsLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbWVkLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbGFyZ2Vcblx0XHRdO1xuXHRcdHRoaXMudGV4dHVyZXMuZm9yRWFjaCh0ZXggPT4gdGV4LmZsaXBZID0gZmFsc2UpO1xuXHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzBdLCB0cnVlKTtcblx0XHRcblx0XHQvLyBwb3NpdGlvbiB0YWJsZVxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAuOCwgMCk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy5jaGFuZ2VNb2RlLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9saWJlcmFsUG9saWNpZXMnLCB0aGlzLnVwZGF0ZVBvbGljaWVzLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9mYXNjaXN0UG9saWNpZXMnLCB0aGlzLnVwZGF0ZVBvbGljaWVzLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9mYWlsZWRWb3RlcycsIHRoaXMudXBkYXRlUG9saWNpZXMuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRjaGFuZ2VNb2RlKHtkYXRhOiB7Z2FtZToge3N0YXRlLCB0dXJuT3JkZXJ9fX0pXG5cdHtcblx0XHRpZih0dXJuT3JkZXIubGVuZ3RoID49IDkpXG5cdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1syXSk7XG5cdFx0ZWxzZSBpZih0dXJuT3JkZXIubGVuZ3RoID49IDcpXG5cdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1sxXSk7XG5cdFx0ZWxzZVxuXHRcdFx0dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbMF0pO1xuXHR9XG5cblx0c2V0VGV4dHVyZShuZXdUZXgsIHN3aXRjaExpZ2h0bWFwKVxuXHR7XG5cdFx0dGhpcy5tb2RlbC50cmF2ZXJzZShvID0+IHtcblx0XHRcdGlmKG8gaW5zdGFuY2VvZiBUSFJFRS5NZXNoKVxuXHRcdFx0e1xuXHRcdFx0XHRpZihzd2l0Y2hMaWdodG1hcClcblx0XHRcdFx0XHRvLm1hdGVyaWFsLmxpZ2h0TWFwID0gby5tYXRlcmlhbC5tYXA7XG5cblx0XHRcdFx0by5tYXRlcmlhbC5tYXAgPSBuZXdUZXg7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHR1cGRhdGVQb2xpY2llcyh7ZGF0YToge2dhbWU6IHtsaWJlcmFsUG9saWNpZXMsIGZhc2Npc3RQb2xpY2llcywgZmFpbGVkVm90ZXMsIGhhbmQsIHN0YXRlfX19KVxuXHR7XG5cdFx0bGV0IGNhcmRzSW5VcGRhdGUgPSBsaWJlcmFsUG9saWNpZXMgKyBmYXNjaXN0UG9saWNpZXMgLSB0aGlzLmxpYmVyYWxDYXJkcyAtIHRoaXMuZmFzY2lzdENhcmRzO1xuXHRcdGxldCBhbmltYXRlID0gY2FyZHNJblVwZGF0ZSA9PT0gMTtcblxuXHRcdGxldCBwcm9taXNlcyA9IFtdO1xuXG5cdFx0Zm9yKHZhciBpPXRoaXMubGliZXJhbENhcmRzOyBpPGxpYmVyYWxQb2xpY2llczsgaSsrKXtcblx0XHRcdGxldCBjYXJkID0gbmV3IExpYmVyYWxQb2xpY3lDYXJkKCk7XG5cdFx0XHR0aGlzLmNhcmRzLnB1c2goY2FyZCk7XG5cdFx0XHR0aGlzLmFkZChjYXJkKTtcblx0XHRcdHByb21pc2VzLnB1c2goY2FyZC5nb1RvUG9zaXRpb24oaSwgYW5pbWF0ZSkpO1xuXHRcdH1cblx0XHR0aGlzLmxpYmVyYWxDYXJkcyA9IGxpYmVyYWxQb2xpY2llcztcblxuXHRcdGZvcih2YXIgaT10aGlzLmZhc2Npc3RDYXJkczsgaTxmYXNjaXN0UG9saWNpZXM7IGkrKyl7XG5cdFx0XHRsZXQgY2FyZCA9IG5ldyBGYXNjaXN0UG9saWN5Q2FyZCgpO1xuXHRcdFx0dGhpcy5jYXJkcy5wdXNoKGNhcmQpO1xuXHRcdFx0dGhpcy5hZGQoY2FyZCk7XG5cdFx0XHRwcm9taXNlcy5wdXNoKGNhcmQuZ29Ub1Bvc2l0aW9uKGksIGFuaW1hdGUpKTtcblx0XHR9XG5cdFx0dGhpcy5mYXNjaXN0Q2FyZHMgPSBmYXNjaXN0UG9saWNpZXM7XG5cblx0XHRpZihzdGF0ZSA9PT0gJ2FmdGVybWF0aCcgJiYgaGFuZCA9PT0gMSl7XG5cdFx0XHRsZXQgY2FyZCA9IG5ldyBWZXRvQ2FyZCgpO1xuXHRcdFx0Y2FyZC5wb3NpdGlvbi5zZXQoMCwxLDApO1xuXHRcdFx0dGhpcy5hZGQoY2FyZCk7XG5cdFx0XHRwcm9taXNlcy5wdXNoKEFuaW1hdGUud2FpdCgxMDAwKS50aGVuKCgpID0+IHtcblx0XHRcdFx0dGhpcy5yZW1vdmUoY2FyZCk7XG5cdFx0XHRcdHJldHVybiBTSC5lbGVjdGlvblRyYWNrZXIuYW5pbTtcblx0XHRcdH0pKTtcblx0XHR9XG5cblx0XHRpZihzdGF0ZSA9PT0gJ2FmdGVybWF0aCcpe1xuXHRcdFx0UHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRTSC5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdFx0XHR0eXBlOiAncG9saWN5QW5pbURvbmUnLFxuXHRcdFx0XHRcdGJ1YmJsZXM6IGZhbHNlXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYobGliZXJhbFBvbGljaWVzID09PSAwICYmIGZhc2Npc3RQb2xpY2llcyA9PT0gMCl7XG5cdFx0XHR0aGlzLmNhcmRzLmZvckVhY2goYyA9PiB0aGlzLnJlbW92ZShjKSk7XG5cdFx0fVxuXHR9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5mdW5jdGlvbiBnZXRHYW1lSWQoKVxue1xuXHQvLyBmaXJzdCBjaGVjayB0aGUgdXJsXG5cdGxldCByZSA9IC9bPyZdZ2FtZUlkPShbXiZdKykvLmV4ZWMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG5cdGlmKHJlKXtcblx0XHRyZXR1cm4gcmVbMV07XG5cdH1cblx0ZWxzZSBpZihhbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudCl7XG5cdFx0cmV0dXJuIFNILmVudi5zaWQ7XG5cdH1cblx0ZWxzZSB7XG5cdFx0bGV0IGlkID0gTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwMCApO1xuXHRcdHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKCc/Z2FtZUlkPScraWQpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHBhcnNlQ1NWKHN0cil7XG5cdGlmKCFzdHIpIHJldHVybiBbXTtcblx0ZWxzZSByZXR1cm4gc3RyLnNwbGl0KCcsJyk7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlUXVlc3Rpb24odGV4dCwgdGV4dHVyZSA9IG51bGwpXG57XG5cdGxldCBmb250U3RhY2sgPSAnXCJIZWx2ZXRpY2EgTmV1ZVwiLCBIZWx2ZXRpY2EsIEFyaWFsLCBTYW5zLVNlcmlmJztcblxuXHQvLyBzZXQgdXAgY2FudmFzXG5cdGxldCBibXA7XG5cdGlmKCF0ZXh0dXJlKXtcblx0XHRibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHRibXAud2lkdGggPSA1MTI7XG5cdFx0Ym1wLmhlaWdodCA9IDI1Njtcblx0fVxuXHRlbHNlIHtcblx0XHRibXAgPSB0ZXh0dXJlLmltYWdlO1xuXHR9XG5cblx0bGV0IGcgPSBibXAuZ2V0Q29udGV4dCgnMmQnKTtcblx0Zy5jbGVhclJlY3QoMCwgMCwgNTEyLCAyNTYpO1xuXHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xuXHRnLmZpbGxTdHlsZSA9ICdibGFjayc7XG5cblx0Ly8gd3JpdGUgdGV4dFxuXHRnLmZvbnQgPSAnYm9sZCA1MHB4ICcrZm9udFN0YWNrO1xuXHRsZXQgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcblx0Zm9yKGxldCBpPTA7IGk8bGluZXMubGVuZ3RoOyBpKyspe1xuXHRcdGcuZmlsbFRleHQobGluZXNbaV0sIDI1NiwgNTArNTUqaSk7XG5cdH1cblxuXHRpZih0ZXh0dXJlKXtcblx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcblx0XHRyZXR1cm4gdGV4dHVyZTtcblx0fVxuXHRlbHNlIHtcblx0XHRyZXR1cm4gbmV3IFRIUkVFLkNhbnZhc1RleHR1cmUoYm1wKTtcblx0fVxufVxuXG5mdW5jdGlvbiBtZXJnZU9iamVjdHMoYSwgYiwgZGVwdGg9Milcbntcblx0ZnVuY3Rpb24gdW5pcXVlKGUsIGksIGEpe1xuXHRcdHJldHVybiBhLmluZGV4T2YoZSkgPT09IGk7XG5cdH1cblxuXHRsZXQgYUlzT2JqID0gYSBpbnN0YW5jZW9mIE9iamVjdCwgYklzT2JqID0gYiBpbnN0YW5jZW9mIE9iamVjdDtcblx0aWYoYUlzT2JqICYmIGJJc09iaiAmJiBkZXB0aCA+IDApXG5cdHtcblx0XHRsZXQgcmVzdWx0ID0ge307XG5cdFx0bGV0IGtleXMgPSBbLi4uT2JqZWN0LmtleXMoYSksIC4uLk9iamVjdC5rZXlzKGIpXS5maWx0ZXIodW5pcXVlKTtcblx0XHRmb3IobGV0IGk9MDsgaTxrZXlzLmxlbmd0aDsgaSsrKXtcblx0XHRcdHJlc3VsdFtrZXlzW2ldXSA9IG1lcmdlT2JqZWN0cyhhW2tleXNbaV1dLCBiW2tleXNbaV1dLCBkZXB0aC0xKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXHRlbHNlIGlmKGIgIT09IHVuZGVmaW5lZClcblx0XHRyZXR1cm4gYjtcblx0ZWxzZVxuXHRcdHJldHVybiBhO1xufVxuXG5mdW5jdGlvbiBsYXRlVXBkYXRlKGZuKVxue1xuXHRyZXR1cm4gKC4uLmFyZ3MpID0+IHtcblx0XHRzZXRUaW1lb3V0KCgpID0+IGZuKC4uLmFyZ3MpLCAxNSk7XG5cdH07XG59XG5cbmV4cG9ydCB7IGdldEdhbWVJZCwgcGFyc2VDU1YsIGdlbmVyYXRlUXVlc3Rpb24sIG1lcmdlT2JqZWN0cywgbGF0ZVVwZGF0ZSB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTmFtZXBsYXRlIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC0wLjYzNSwgMC4yMik7XG5cdFx0c2VhdC5hZGQodGhpcyk7XG5cblx0XHQvLyBhZGQgM2QgbW9kZWxcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLm5hbWVwbGF0ZS5jaGlsZHJlblswXS5jbG9uZSgpO1xuXHRcdHRoaXMubW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJLzIsIDAsIE1hdGguUEkvMik7XG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHQvLyBnZW5lcmF0ZSBtYXRlcmlhbFxuXHRcdHRoaXMuYm1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy5ibXAud2lkdGggPSBOYW1lcGxhdGUudGV4dHVyZVNpemU7XG5cdFx0dGhpcy5ibXAuaGVpZ2h0ID0gTmFtZXBsYXRlLnRleHR1cmVTaXplIC8gMjtcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcblx0XHRcdG1hcDogbmV3IFRIUkVFLkNhbnZhc1RleHR1cmUodGhpcy5ibXApXG5cdFx0fSk7XG5cblx0XHQvLyBjcmVhdGUgbGlzdGVuZXIgcHJveGllc1xuXHRcdHRoaXMuX2hvdmVyQmVoYXZpb3IgPSBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlckNvbG9yKHtcblx0XHRcdGNvbG9yOiBuZXcgVEhSRUUuQ29sb3IoMHhmZmE4YTgpXG5cdFx0fSk7XG5cdFx0dGhpcy5tb2RlbC5hZGRCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcblx0XHR0aGlzLm1vZGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5jbGljay5iaW5kKHRoaXMpKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xuXHRcdFx0aWYoc3RhdGUgPT09ICdzZXR1cCcpXG5cdFx0XHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRoaXMubW9kZWwucmVtb3ZlQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0fSk7XG5cdH1cblxuXHR1cGRhdGVUZXh0KHRleHQpXG5cdHtcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcblxuXHRcdC8vIHNldCB1cCBjYW52YXNcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdFx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xuXHRcdGcuZmlsbFN0eWxlID0gJyMyMjInO1xuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XG5cdFx0Zy5mb250ID0gYGJvbGQgJHtmb250U2l6ZX1weCAke2ZvbnRTdGFja31gO1xuXHRcdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGcuZmlsbFRleHQodGV4dCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLzIsICgwLjQyIC0gMC4xMikqKE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yKSk7XG5cblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdH1cblxuXHRjbGljayhlKVxuXHR7XG5cdFx0aWYoU0guZ2FtZS5zdGF0ZSAhPT0gJ3NldHVwJykgcmV0dXJuO1xuXG5cdFx0aWYoIXRoaXMuc2VhdC5vd25lcilcblx0XHRcdHRoaXMucmVxdWVzdEpvaW4oKTtcblx0XHRlbHNlIGlmKHRoaXMuc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxuXHRcdFx0dGhpcy5yZXF1ZXN0TGVhdmUoKTtcblx0XHRlbHNlIGlmKFNILmdhbWUudHVybk9yZGVyLmluY2x1ZGVzKFNILmxvY2FsVXNlci5pZCkpXG5cdFx0XHR0aGlzLnJlcXVlc3RLaWNrKCk7XG5cdH1cblxuXHRyZXF1ZXN0Sm9pbigpXG5cdHtcblx0XHRTSC5zb2NrZXQuZW1pdCgnam9pbicsIE9iamVjdC5hc3NpZ24oe3NlYXROdW06IHRoaXMuc2VhdC5zZWF0TnVtfSwgU0gubG9jYWxVc2VyKSk7XG5cdH1cblxuXHRyZXF1ZXN0TGVhdmUoKVxuXHR7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXHRcdGlmKCFzZWxmLnF1ZXN0aW9uKVxuXHRcdHtcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWxmLnNlYXQuYmFsbG90LmFza1F1ZXN0aW9uKCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byBsZWF2ZT8nLCAnbG9jYWxfbGVhdmUnKVxuXHRcdFx0LnRoZW4oY29uZmlybSA9PiB7XG5cdFx0XHRcdGlmKGNvbmZpcm0pe1xuXHRcdFx0XHRcdFNILnNvY2tldC5lbWl0KCdsZWF2ZScsIFNILmxvY2FsVXNlci5pZCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xuXHRcdH1cblx0fVxuXG5cdHJlcXVlc3RLaWNrKClcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblx0XHRpZighc2VsZi5xdWVzdGlvbilcblx0XHR7XG5cdFx0XHRsZXQgc2VhdCA9IFNILnNlYXRzW1NILnBsYXllcnNbU0gubG9jYWxVc2VyLmlkXS5zZWF0TnVtXTtcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWF0LmJhbGxvdC5hc2tRdWVzdGlvbihcblx0XHRcdFx0J0FyZSB5b3Ugc3VyZSB5b3VcXG53YW50IHRvIHRyeSB0byBraWNrXFxuJ1xuXHRcdFx0XHQrU0gucGxheWVyc1tzZWxmLnNlYXQub3duZXJdLmRpc3BsYXlOYW1lLFxuXHRcdFx0XHQnbG9jYWxfa2ljaydcblx0XHRcdClcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xuXHRcdFx0XHRpZihjb25maXJtKXtcblx0XHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgna2ljaycsIFNILmxvY2FsVXNlci5pZCwgc2VsZi5zZWF0Lm93bmVyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uID0gbnVsbDtcblx0XHRcdH0pXG5cdFx0XHQuY2F0Y2goKCkgPT4geyBzZWxmLnF1ZXN0aW9uID0gbnVsbDsgfSk7XG5cdFx0fVxuXHR9XG59XG5cbk5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSA9IDI1NjtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCAqIGFzIEJhbGxvdFR5cGUgZnJvbSAnLi9iYWxsb3QnO1xuXG5mdW5jdGlvbiB1cGRhdGVWb3Rlc0luUHJvZ3Jlc3Moe2RhdGE6IHtnYW1lLCBwbGF5ZXJzLCB2b3Rlc319KVxue1xuXHRsZXQgYmFsbG90ID0gdGhpcztcblx0aWYoIWJhbGxvdC5zZWF0Lm93bmVyKSByZXR1cm47XG5cblx0bGV0IHZpcHMgPSBnYW1lLnZvdGVzSW5Qcm9ncmVzcztcblx0bGV0IGJsYWNrbGlzdGVkVm90ZXMgPSB2aXBzLmZpbHRlcihpZCA9PiB7XG5cdFx0bGV0IHZzID0gWy4uLnZvdGVzW2lkXS55ZXNWb3RlcnMsIC4uLnZvdGVzW2lkXS5ub1ZvdGVyc107XG5cdFx0bGV0IG52ID0gdm90ZXNbaWRdLm5vblZvdGVycztcblx0XHRyZXR1cm4gbnYuaW5jbHVkZXMoYmFsbG90LnNlYXQub3duZXIpIHx8IHZzLmluY2x1ZGVzKGJhbGxvdC5zZWF0Lm93bmVyKTtcblx0fSk7XG5cdGxldCBuZXdWb3RlcyA9IHZpcHMuZmlsdGVyKFxuXHRcdGlkID0+ICghU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MgfHwgIVNILmdhbWUudm90ZXNJblByb2dyZXNzLmluY2x1ZGVzKGlkKSkgJiYgIWJsYWNrbGlzdGVkVm90ZXMuaW5jbHVkZXMoaWQpXG5cdCk7XG5cdGxldCBmaW5pc2hlZFZvdGVzID0gIVNILmdhbWUudm90ZXNJblByb2dyZXNzID8gYmxhY2tsaXN0ZWRWb3Rlc1xuXHRcdDogU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MuZmlsdGVyKGlkID0+ICF2aXBzLmluY2x1ZGVzKGlkKSkuY29uY2F0KGJsYWNrbGlzdGVkVm90ZXMpO1xuXG5cdG5ld1ZvdGVzLmZvckVhY2godklkID0+XG5cdHtcblx0XHQvLyBnZW5lcmF0ZSBuZXcgcXVlc3Rpb24gdG8gYXNrXG5cdFx0bGV0IHF1ZXN0aW9uVGV4dCwgb3B0cyA9IHt9O1xuXHRcdGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2VsZWN0Jyl7XG5cdFx0XHRxdWVzdGlvblRleHQgPSBwbGF5ZXJzW2dhbWUucHJlc2lkZW50XS5kaXNwbGF5TmFtZVxuXHRcdFx0XHQrICcgZm9yIHByZXNpZGVudCBhbmQgJ1xuXHRcdFx0XHQrIHBsYXllcnNbZ2FtZS5jaGFuY2VsbG9yXS5kaXNwbGF5TmFtZVxuXHRcdFx0XHQrICcgZm9yIGNoYW5jZWxsb3I/Jztcblx0XHR9XG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdqb2luJyl7XG5cdFx0XHRxdWVzdGlvblRleHQgPSB2b3Rlc1t2SWRdLmRhdGEgKyAnXFxudG8gam9pbj8nO1xuXHRcdH1cblx0XHRlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2tpY2snKXtcblx0XHRcdHF1ZXN0aW9uVGV4dCA9ICdWb3RlIHRvIGtpY2tcXG4nXG5cdFx0XHRcdCsgcGxheWVyc1t2b3Rlc1t2SWRdLnRhcmdldDFdLmRpc3BsYXlOYW1lXG5cdFx0XHRcdCsgJz8nO1xuXHRcdH1cblx0XHRlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2NvbmZpcm1Sb2xlJylcblx0XHR7XG5cdFx0XHRvcHRzLmNob2ljZXMgPSBCYWxsb3RUeXBlLkNPTkZJUk07XG5cdFx0XHRsZXQgcm9sZTtcblx0XHRcdGlmKGJhbGxvdC5zZWF0Lm93bmVyID09PSBTSC5sb2NhbFVzZXIuaWQpe1xuXHRcdFx0XHRyb2xlID0gcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdLnJvbGU7XG5cdFx0XHRcdHJvbGUgPSByb2xlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcm9sZS5zbGljZSgxKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRyb2xlID0gJzxSRURBQ1RFRD4nO1xuXHRcdFx0fVxuXHRcdFx0cXVlc3Rpb25UZXh0ID0gJ1lvdXIgcm9sZTpcXG4nICsgcm9sZTtcblx0XHR9XG5cblx0XHRpZihxdWVzdGlvblRleHQpXG5cdFx0e1xuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKHF1ZXN0aW9uVGV4dCwgdklkLCBvcHRzKVxuXHRcdFx0LnRoZW4oYW5zd2VyID0+IHtcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ3ZvdGUnLCB2SWQsIFNILmxvY2FsVXNlci5pZCwgYW5zd2VyKTtcblx0XHRcdH0pXG5cdFx0XHQuY2F0Y2goKCkgPT4gY29uc29sZS5sb2coJ1ZvdGUgc2NydWJiZWQ6JywgdklkKSk7XG5cdFx0fVxuXHR9KTtcblxuXHRpZihmaW5pc2hlZFZvdGVzLmluY2x1ZGVzKGJhbGxvdC5kaXNwbGF5ZWQpKXtcblx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxue1xuXHRsZXQgYmFsbG90ID0gdGhpcztcblxuXHRmdW5jdGlvbiBjaG9vc2VQbGF5ZXIocXVlc3Rpb24sIGNvbmZpcm1RdWVzdGlvbiwgaWQpXG5cdHtcblx0XHRmdW5jdGlvbiBjb25maXJtUGxheWVyKHVzZXJJZClcblx0XHR7XG5cdFx0XHRsZXQgdXNlcm5hbWUgPSBTSC5wbGF5ZXJzW3VzZXJJZF0uZGlzcGxheU5hbWU7XG5cdFx0XHRsZXQgdGV4dCA9IGNvbmZpcm1RdWVzdGlvbi5yZXBsYWNlKCd7fScsIHVzZXJuYW1lKTtcblx0XHRcdHJldHVybiBiYWxsb3QuYXNrUXVlc3Rpb24odGV4dCwgJ2xvY2FsXycraWQrJ19jb25maXJtJylcblx0XHRcdC50aGVuKGNvbmZpcm1lZCA9PiB7XG5cdFx0XHRcdGlmKGNvbmZpcm1lZCl7XG5cdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh1c2VySWQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBjaG9vc2VQbGF5ZXIocXVlc3Rpb24sIGNvbmZpcm1RdWVzdGlvbiwgaWQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gYmFsbG90LmFza1F1ZXN0aW9uKHF1ZXN0aW9uLCAnbG9jYWxfJytpZCwge2Nob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNUfSlcblx0XHQudGhlbihjb25maXJtUGxheWVyKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGhpZGVOb21pbmF0ZVBsYWNlaG9sZGVyKHtkYXRhOiB7Z2FtZX19KVxuXHR7XG5cdFx0aWYoZ2FtZS5zdGF0ZSAhPT0gJ25vbWluYXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfY2hhbmNlbGxvcicpe1xuXHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHR9XG5cdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZU5vbWluYXRlUGxhY2Vob2xkZXIpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaGlkZVBvbGljeVBsYWNlaG9sZGVyKHtkYXRhOiB7Z2FtZX19KVxuXHR7XG5cdFx0aWYoZ2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTEnICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wb2xpY3kxJyB8fFxuXHRcdFx0Z2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTInICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wb2xpY3kyJ1xuXHRcdCl7XG5cdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHRcdH1cblx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlUG9saWN5UGxhY2Vob2xkZXIpO1xuXHR9XG5cblx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXG5cdHtcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcblx0XHRcdGNob29zZVBsYXllcignQ2hvb3NlIHlvdXJcXG5jaGFuY2VsbG9yIScsICdOYW1lIHt9XFxuYXMgY2hhbmNlbGxvcj8nLCAnbm9taW5hdGUnKVxuXHRcdFx0LnRoZW4odXNlcklkID0+IHtcblx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ25vbWluYXRlJywgdXNlcklkKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQ2hvb3NlIHlvdXJcXG5jaGFuY2VsbG9yIScsICd3YWl0X2Zvcl9jaGFuY2VsbG9yJywge1xuXHRcdFx0XHRjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCxcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAnbm9taW5hdGUnXG5cdFx0XHR9KTtcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVOb21pbmF0ZVBsYWNlaG9sZGVyKTtcblx0XHR9XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncG9saWN5MScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0bGV0IG9wdHMgPSB7Y2hvaWNlczogQmFsbG90VHlwZS5QT0xJQ1ksIHBvbGljeUhhbmQ6IGdhbWUuaGFuZH07XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkICE9PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwb2xpY3kxJ30pO1xuXHRcdH1cblxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQ2hvb3NlIG9uZVxcbnRvIGRpc2NhcmQhJywgJ2xvY2FsX3BvbGljeTEnLCBvcHRzKVxuXHRcdC50aGVuKGRpc2NhcmQgPT4ge1xuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2Rpc2NhcmRfcG9saWN5MScsIGRpc2NhcmQpO1xuXHRcdH0pO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVQb2xpY3lQbGFjZWhvbGRlcik7XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncG9saWN5MicgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUuY2hhbmNlbGxvcilcblx0e1xuXHRcdGxldCBvcHRzID0ge1xuXHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QT0xJQ1ksXG5cdFx0XHRwb2xpY3lIYW5kOiBnYW1lLmhhbmQsXG5cdFx0XHRpbmNsdWRlVmV0bzogZ2FtZS5mYXNjaXN0UG9saWNpZXMgPT09IDUgJiYgIWJhbGxvdC5ibG9ja1ZldG9cblx0XHR9O1xuXHRcdGlmKFNILmxvY2FsVXNlci5pZCAhPT0gZ2FtZS5jaGFuY2VsbG9yKXtcblx0XHRcdE9iamVjdC5hc3NpZ24ob3B0cywge2Zha2U6IHRydWUsIGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTInfSk7XG5cdFx0fVxuXG5cdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdDaG9vc2Ugb25lXFxudG8gZGlzY2FyZCEnLCAnbG9jYWxfcG9saWN5MicsIG9wdHMpXG5cdFx0LnRoZW4oZGlzY2FyZCA9PiB7XG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnZGlzY2FyZF9wb2xpY3kyJywgZGlzY2FyZCk7XG5cdFx0fSwgZXJyID0+IGNvbnNvbGUuZXJyb3IoZXJyKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZVBvbGljeVBsYWNlaG9sZGVyKTtcblx0fVxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdpbnZlc3RpZ2F0ZScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRjaG9vc2VQbGF5ZXIoJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIG9uZSBwbGF5ZXIgdG8gaW52ZXN0aWdhdGUhJywgJ0ludmVzdGlnYXRlIHt9PycsICdpbnZlc3RpZ2F0ZScpXG5cdFx0XHQudGhlbih1c2VySWQgPT4ge1xuXHRcdFx0XHRTSC5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdFx0XHR0eXBlOiAnaW52ZXN0aWdhdGUnLFxuXHRcdFx0XHRcdGRhdGE6IHVzZXJJZFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2Ugb25lIHBsYXllciB0byBpbnZlc3RpZ2F0ZSEnLCAnd2FpdF9mb3JfaW52ZXN0aWdhdGUnLCB7XG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxuXHRcdFx0XHRmYWtlOiB0cnVlLFxuXHRcdFx0XHRpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdpbnZlc3RpZ2F0ZSdcblx0XHRcdH0pO1xuXHRcdFx0bGV0IGNsZWFuVXBGYWtlVm90ZSA9ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xuXHRcdFx0XHRpZihzdGF0ZSAhPT0gJ2ludmVzdGlnYXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfaW52ZXN0aWdhdGUnKVxuXHRcdFx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0XHR9O1xuXHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHR9XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncGVlaycgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0bGV0IG9wdHMgPSB7Y2hvaWNlczogQmFsbG90VHlwZS5QT0xJQ1ksIHBvbGljeUhhbmQ6IDggfCAoZ2FtZS5kZWNrJjcpfTtcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgIT09IGdhbWUucHJlc2lkZW50KXtcblx0XHRcdE9iamVjdC5hc3NpZ24ob3B0cywge2Zha2U6IHRydWUsIGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3BlZWsnfSk7XG5cdFx0fVxuXG5cdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdFeGVjdXRpdmUgcG93ZXI6IFRoZSBuZXh0IHByZXNpZGVudFxcJ3MgXCJyYW5kb21cIiBwb2xpY2llcycsICdsb2NhbF9wZWVrJywgb3B0cylcblx0XHQudGhlbihkaXNjYXJkID0+IHtcblx0XHRcdFNILnNvY2tldC5lbWl0KCdjb250aW51ZScpO1xuXHRcdH0pO1xuXHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdGlmKHN0YXRlICE9PSAncGVlaycgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ2xvY2FsX3BlZWsnKVxuXHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHR9O1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnbmFtZVN1Y2Nlc3NvcicgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCl7XG5cdFx0XHRjaG9vc2VQbGF5ZXIoJ0V4ZWN1dGl2ZSBwb3dlcjogQ2hvb3NlIHRoZSBuZXh0IHByZXNpZGVudCEnLCAne30gZm9yIHByZXNpZGVudD8nLCAnbmFtZVN1Y2Nlc3NvcicpXG5cdFx0XHQudGhlbih1c2VySWQgPT4ge1xuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbmFtZV9zdWNjZXNzb3InLCB1c2VySWQpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdFeGVjdXRpdmUgcG93ZXI6IENob29zZSB0aGUgbmV4dCBwcmVzaWRlbnQhJywgJ3dhaXRfZm9yX3N1Y2Nlc3NvcicsIHtcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXG5cdFx0XHRcdGZha2U6IHRydWUsXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ25hbWVTdWNjZXNzb3InXG5cdFx0XHR9KTtcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdFx0aWYoc3RhdGUgIT09ICduYW1lU3VjY2Vzc29yJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3Jfc3VjY2Vzc29yJylcblx0XHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHRcdFx0fTtcblx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGNsZWFuVXBGYWtlVm90ZSk7XG5cdFx0fVxuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2V4ZWN1dGUnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xuXHRcdFx0Y2hvb3NlUGxheWVyKCdFeGVjdXRpdmUgcG93ZXI6IENob29zZSBhIHBsYXllciB0byBleGVjdXRlIScsICdFeGVjdXRlIHt9PycsICdleGVjdXRlJylcblx0XHRcdC50aGVuKHVzZXJJZCA9PiB7XG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCdleGVjdXRlJywgdXNlcklkKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignRXhlY3V0aXZlIHBvd2VyOiBDaG9vc2UgYSBwbGF5ZXIgdG8gZXhlY3V0ZSEnLCAnd2FpdF9mb3JfZXhlY3V0ZScsIHtcblx0XHRcdFx0Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QsXG5cdFx0XHRcdGZha2U6IHRydWUsXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ2V4ZWN1dGUnXG5cdFx0XHR9KTtcblx0XHRcdGxldCBjbGVhblVwRmFrZVZvdGUgPSAoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pID0+IHtcblx0XHRcdFx0aWYoc3RhdGUgIT09ICdleGVjdXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfZXhlY3V0ZScpXG5cdFx0XHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHRcdH07XG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHRcdH1cblx0fVxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICd2ZXRvJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXG5cdHtcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQXBwcm92ZSB2ZXRvPycsICdsb2NhbF92ZXRvJykudGhlbihhcHByb3ZlZCA9PiB7XG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCdjb25maXJtX3ZldG8nLCBhcHByb3ZlZCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0FwcHJvdmUgdmV0bz8nLCAnd2FpdF9mb3JfdmV0bycsIHtcblx0XHRcdFx0ZmFrZTogdHJ1ZSxcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAndmV0bydcblx0XHRcdH0pO1xuXHRcdFx0bGV0IGNsZWFuVXBGYWtlVm90ZSA9ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xuXHRcdFx0XHRpZihzdGF0ZSAhPT0gJ3ZldG8nICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICd3YWl0X2Zvcl92ZXRvJylcblx0XHRcdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBjbGVhblVwRmFrZVZvdGUpO1xuXHRcdFx0fVxuXHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgY2xlYW5VcEZha2VWb3RlKTtcblx0XHR9XG5cdH1cblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAndmV0bycpe1xuXHRcdGJhbGxvdC5ibG9ja1ZldG8gPSB0cnVlO1xuXHR9XG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2FmdGVybWF0aCcpe1xuXHRcdGJhbGxvdC5ibG9ja1ZldG8gPSBmYWxzZTtcblx0fVxufVxuXG5leHBvcnQge3VwZGF0ZVZvdGVzSW5Qcm9ncmVzcywgdXBkYXRlU3RhdGV9OyIsIid1c2Ugc3RyaWN0JztcblxuLypcbiogRGVja3MgaGF2ZSAxNyBjYXJkczogNiBsaWJlcmFsLCAxMSBmYXNjaXN0LlxuKiBJbiBiaXQtcGFja2VkIGJvb2xlYW4gYXJyYXlzLCAxIGlzIGxpYmVyYWwsIDAgaXMgZmFzY2lzdC5cbiogVGhlIG1vc3Qgc2lnbmlmaWNhbnQgYml0IGlzIGFsd2F5cyAxLlxuKiBFLmcuIDBiMTAxMDAxIHJlcHJlc2VudHMgYSBkZWNrIHdpdGggMiBsaWJlcmFsIGFuZCAzIGZhc2Npc3QgY2FyZHNcbiovXG5cbmxldCBGVUxMX0RFQ0sgPSAweDIwMDNmLFxuXHRGQVNDSVNUID0gMCxcblx0TElCRVJBTCA9IDE7XG5cbmxldCBwb3NpdGlvbnMgPSBbXG5cdDB4MSwgMHgyLCAweDQsIDB4OCxcblx0MHgxMCwgMHgyMCwgMHg0MCwgMHg4MCxcblx0MHgxMDAsIDB4MjAwLCAweDQwMCwgMHg4MDAsXG5cdDB4MTAwMCwgMHgyMDAwLCAweDQwMDAsIDB4ODAwMCxcblx0MHgxMDAwMCwgMHgyMDAwMCwgMHg0MDAwMFxuXTtcblxuZnVuY3Rpb24gbGVuZ3RoKGRlY2spXG57XG5cdHJldHVybiBwb3NpdGlvbnMuZmluZEluZGV4KHMgPT4gcyA+IGRlY2spIC0xO1xufVxuXG5mdW5jdGlvbiBzaHVmZmxlKGRlY2spXG57XG5cdGxldCBsID0gbGVuZ3RoKGRlY2spO1xuXHRmb3IobGV0IGk9bC0xOyBpPjA7IGktLSlcblx0e1xuXHRcdGxldCBvID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaSk7XG5cdFx0bGV0IGlWYWwgPSBkZWNrICYgMSA8PCBpLCBvVmFsID0gZGVjayAmIDEgPDwgbztcblx0XHRsZXQgc3dhcHBlZCA9IGlWYWwgPj4+IGktbyB8IG9WYWwgPDwgaS1vO1xuXHRcdGRlY2sgPSBkZWNrIC0gaVZhbCAtIG9WYWwgKyBzd2FwcGVkO1xuXHR9XG5cblx0cmV0dXJuIGRlY2s7XG59XG5cbmZ1bmN0aW9uIGRyYXdUaHJlZShkKVxue1xuXHRyZXR1cm4gZCA8IDggPyBbMSwgZF0gOiBbZCA+Pj4gMywgOCB8IGQgJiA3XTtcbn1cblxuZnVuY3Rpb24gZGlzY2FyZE9uZShkZWNrLCBwb3MpXG57XG5cdGxldCBib3R0b21IYWxmID0gZGVjayAmICgxIDw8IHBvcyktMTtcblx0bGV0IHRvcEhhbGYgPSBkZWNrICYgfigoMSA8PCBwb3MrMSktMSk7XG5cdHRvcEhhbGYgPj4+PSAxO1xuXHRsZXQgbmV3RGVjayA9IHRvcEhhbGYgfCBib3R0b21IYWxmO1xuXHRcblx0bGV0IHZhbCA9IChkZWNrICYgMTw8cG9zKSA+Pj4gcG9zO1xuXG5cdHJldHVybiBbbmV3RGVjaywgdmFsXTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kKGRlY2ssIHZhbClcbntcblx0cmV0dXJuIGRlY2sgPDwgMSB8IHZhbDtcbn1cblxuZnVuY3Rpb24gdG9BcnJheShkZWNrKVxue1xuXHRsZXQgYXJyID0gW107XG5cdHdoaWxlKGRlY2sgPiAxKXtcblx0XHRhcnIucHVzaChkZWNrICYgMSk7XG5cdFx0ZGVjayA+Pj49IDE7XG5cdH1cblxuXHRyZXR1cm4gYXJyO1xufVxuXG5leHBvcnQge2xlbmd0aCwgc2h1ZmZsZSwgZHJhd1RocmVlLCBkaXNjYXJkT25lLCBhcHBlbmQsIHRvQXJyYXksIEZVTExfREVDSywgTElCRVJBTCwgRkFTQ0lTVH07IiwiJ3VzZSBzdHJpY3Q7J1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHsgQmxhbmtDYXJkLCBKYUNhcmQsIE5laW5DYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgTGliZXJhbFBvbGljeUNhcmQsIFZldG9DYXJkIH0gZnJvbSAnLi9jYXJkJztcbmltcG9ydCB7IGdlbmVyYXRlUXVlc3Rpb24sIGxhdGVVcGRhdGUgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIEJQIGZyb20gJy4vYmFsbG90cHJvY2Vzc29yJztcbmltcG9ydCAqIGFzIEJQQkEgZnJvbSAnLi9icGJhJztcbmltcG9ydCB7TlRleHQsIFBsYWNlaG9sZGVyTWVzaH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcblxubGV0IFBMQVlFUlNFTEVDVCA9IDA7XG5sZXQgQ09ORklSTSA9IDE7XG5sZXQgQklOQVJZID0gMjtcbmxldCBQT0xJQ1kgPSAzO1xuXG5jbGFzcyBCYWxsb3QgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcihzZWF0KVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC0wLjMsIDAuMjUpO1xuXHRcdHRoaXMucm90YXRpb24uc2V0KC41LCBNYXRoLlBJLCAwKTtcblx0XHRzZWF0LmFkZCh0aGlzKTtcblxuXHRcdHRoaXMubGFzdFF1ZXVlZCA9IFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdHRoaXMuZGlzcGxheWVkID0gbnVsbDtcblx0XHR0aGlzLmJsb2NrVmV0byA9IGZhbHNlO1xuXG5cdFx0dGhpcy5feWVzQ2xpY2tIYW5kbGVyID0gbnVsbDtcblx0XHR0aGlzLl9ub0NsaWNrSGFuZGxlciA9IG51bGw7XG5cdFx0dGhpcy5fbm9taW5hdGVIYW5kbGVyID0gbnVsbDtcblx0XHR0aGlzLl9jYW5jZWxIYW5kbGVyID0gbnVsbDtcblxuXHRcdHRoaXMuamFDYXJkID0gbmV3IEphQ2FyZCgpO1xuXHRcdHRoaXMubmVpbkNhcmQgPSBuZXcgTmVpbkNhcmQoKTtcblx0XHRbdGhpcy5qYUNhcmQsIHRoaXMubmVpbkNhcmRdLmZvckVhY2goYyA9PiB7XG5cdFx0XHRjLnBvc2l0aW9uLnNldChjIGluc3RhbmNlb2YgSmFDYXJkID8gLTAuMSA6IDAuMSwgLTAuMSwgMCk7XG5cdFx0XHRjLnNjYWxlLnNldFNjYWxhcigwLjE1KTtcblx0XHRcdGMudmlzaWJsZSA9IGZhbHNlO1xuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKHRoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkKTtcblx0XHR0aGlzLnBvbGljaWVzID0gW107XG5cblx0XHQvL2xldCBnZW8gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSgwLjQsIDAuMik7XG5cdFx0Ly9sZXQgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHt0cmFuc3BhcmVudDogdHJ1ZSwgc2lkZTogVEhSRUUuRG91YmxlU2lkZX0pO1xuXHRcdHRoaXMucXVlc3Rpb24gPSBQbGFjZWhvbGRlck1lc2guY2xvbmUoKTtcblx0XHR0aGlzLnF1ZXN0aW9uLnBvc2l0aW9uLnNldCgwLCAwLjA1LCAwKTtcblx0XHR0aGlzLnF1ZXN0aW9uLnNjYWxlLnNldFNjYWxhciguNSk7XG5cdFx0dGhpcy5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy5hZGQodGhpcy5xdWVzdGlvbik7XG5cblx0XHR0aGlzLnRleHRDb21wb25lbnQgPSBuZXcgTlRleHQodGhpcy5xdWVzdGlvbik7XG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7d2lkdGg6IDEuMSwgaGVpZ2h0OiAuNCwgZm9udFNpemU6IDEsIHZlcnRpY2FsQWxpZ246ICd0b3AnfSk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdm90ZXNJblByb2dyZXNzJywgQlAudXBkYXRlVm90ZXNJblByb2dyZXNzLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUoQlAudXBkYXRlU3RhdGUuYmluZCh0aGlzKSkpO1xuXHR9XG5cblx0YXNrUXVlc3Rpb24ocVRleHQsIGlkLCB7Y2hvaWNlcyA9IEJJTkFSWSwgcG9saWN5SGFuZCA9IDB4MSwgaW5jbHVkZVZldG8gPSBmYWxzZSwgZmFrZSA9IGZhbHNlLCBpc0ludmFsaWQgPSAoKSA9PiB0cnVlfSA9IHt9KVxuXHR7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXG5cdFx0ZnVuY3Rpb24gaXNWb3RlVmFsaWQoKVxuXHRcdHtcblx0XHRcdGxldCBpc0Zha2VWYWxpZCA9IGZha2UgJiYgIWlzSW52YWxpZCgpO1xuXHRcdFx0bGV0IGlzTG9jYWxWb3RlID0gL15sb2NhbC8udGVzdChpZCk7XG5cdFx0XHRsZXQgaXNGaXJzdFVwZGF0ZSA9ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcztcblx0XHRcdGxldCB2b3RlID0gU0gudm90ZXNbaWRdO1xuXHRcdFx0bGV0IHZvdGVycyA9IHZvdGUgPyBbLi4udm90ZS55ZXNWb3RlcnMsIC4uLnZvdGUubm9Wb3RlcnNdIDogW107XG5cdFx0XHRsZXQgYWxyZWFkeVZvdGVkID0gdm90ZXJzLmluY2x1ZGVzKHNlbGYuc2VhdC5vd25lcik7XG5cdFx0XHRyZXR1cm4gaXNMb2NhbFZvdGUgfHwgaXNGaXJzdFVwZGF0ZSB8fCBpc0Zha2VWYWxpZCB8fCB2b3RlICYmICFhbHJlYWR5Vm90ZWQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaG9va1VwUXVlc3Rpb24oKXtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZShxdWVzdGlvbkV4ZWN1dG9yKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBxdWVzdGlvbkV4ZWN1dG9yKHJlc29sdmUsIHJlamVjdClcblx0XHR7XG5cdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBpcyBzdGlsbCByZWxldmFudFxuXHRcdFx0aWYoIWlzVm90ZVZhbGlkKCkpe1xuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KCdWb3RlIG5vIGxvbmdlciB2YWxpZCcpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzaG93IHRoZSBiYWxsb3Rcblx0XHRcdC8vc2VsZi5xdWVzdGlvbi5tYXRlcmlhbC5tYXAgPSBnZW5lcmF0ZVF1ZXN0aW9uKHFUZXh0LCBzZWxmLnF1ZXN0aW9uLm1hdGVyaWFsLm1hcCk7XG5cdFx0XHRzZWxmLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OiBgJHtxVGV4dH1gfSk7XG5cdFx0XHRzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSB0cnVlO1xuXG5cdFx0XHQvLyBob29rIHVwIHEvYSBjYXJkc1xuXHRcdFx0aWYoY2hvaWNlcyA9PT0gQ09ORklSTSB8fCBjaG9pY2VzID09PSBCSU5BUlkpe1xuXHRcdFx0XHRzZWxmLmphQ2FyZC52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdFx0aWYoIWZha2UpXG5cdFx0XHRcdFx0c2VsZi5qYUNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKCd5ZXMnLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdH1cblx0XHRcdGlmKGNob2ljZXMgPT09IEJJTkFSWSl7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQudmlzaWJsZSA9IHRydWU7XG5cdFx0XHRcdGlmKCFmYWtlKVxuXHRcdFx0XHRcdHNlbGYubmVpbkNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKCdubycsIHJlc29sdmUsIHJlamVjdCkpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZihjaG9pY2VzID09PSBQTEFZRVJTRUxFQ1QgJiYgIWZha2Upe1xuXHRcdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdwbGF5ZXJTZWxlY3QnLCByZXNwb25kKCdwbGF5ZXInLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUE9MSUNZKXtcblx0XHRcdFx0bGV0IGNhcmRzID0gQlBCQS50b0FycmF5KHBvbGljeUhhbmQpO1xuXHRcdFx0XHRpZihpbmNsdWRlVmV0bykgY2FyZHMucHVzaCgtMSk7XG5cdFx0XHRcdGNhcmRzLmZvckVhY2goKHZhbCwgaSwgYXJyKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bGV0IGNhcmQgPSBudWxsO1xuXHRcdFx0XHRcdGlmKGZha2UpXG5cdFx0XHRcdFx0XHRjYXJkID0gbmV3IEJsYW5rQ2FyZCgpO1xuXHRcdFx0XHRcdGVsc2UgaWYodmFsID09PSAtMSlcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgVmV0b0NhcmQoKTtcblx0XHRcdFx0XHRlbHNlIGlmKHZhbCA9PT0gQlBCQS5MSUJFUkFMKVxuXHRcdFx0XHRcdFx0Y2FyZCA9IG5ldyBMaWJlcmFsUG9saWN5Q2FyZCgpO1xuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgRmFzY2lzdFBvbGljeUNhcmQoKTtcblxuXHRcdFx0XHRcdGNhcmQuc2NhbGUuc2V0U2NhbGFyKDAuMTUpO1xuXG5cdFx0XHRcdFx0bGV0IHdpZHRoID0gLjE1ICogYXJyLmxlbmd0aDtcblx0XHRcdFx0XHRsZXQgeCA9IC13aWR0aC8yICsgLjE1KmkgKyAuMDc1O1xuXHRcdFx0XHRcdGNhcmQucG9zaXRpb24uc2V0KHgsIC0wLjA3LCAwKTtcblx0XHRcdFx0XHRzZWxmLmFkZChjYXJkKTtcblx0XHRcdFx0XHRzZWxmLnBvbGljaWVzLnB1c2goY2FyZCk7XG5cblx0XHRcdFx0XHRpZighZmFrZSlcblx0XHRcdFx0XHRcdGNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKHZhbCA9PT0gLTEgPyAtMSA6IGksIHJlc29sdmUsIHJlamVjdCkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0c2VsZi5hZGRFdmVudExpc3RlbmVyKCdjYW5jZWxWb3RlJywgcmVzcG9uZCgnY2FuY2VsJywgcmVzb2x2ZSwgcmVqZWN0KSk7XG5cblx0XHRcdHNlbGYuZGlzcGxheWVkID0gaWQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVzcG9uZChhbnN3ZXIsIHJlc29sdmUsIHJlamVjdClcblx0XHR7XG5cdFx0XHRmdW5jdGlvbiBoYW5kbGVyKGV2dClcblx0XHRcdHtcblx0XHRcdFx0Ly8gbWFrZSBzdXJlIG9ubHkgdGhlIG93bmVyIG9mIHRoZSBiYWxsb3QgaXMgYW5zd2VyaW5nXG5cdFx0XHRcdGlmKGFuc3dlciAhPT0gJ2NhbmNlbCcgJiYgc2VsZi5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQpIHJldHVybjtcblxuXHRcdFx0XHQvLyBjbGVhbiB1cFxuXHRcdFx0XHRzZWxmLmphQ2FyZC52aXNpYmxlID0gZmFsc2U7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQudmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSBmYWxzZTtcblx0XHRcdFx0c2VsZi5kaXNwbGF5ZWQgPSBudWxsO1xuXHRcdFx0XHRzZWxmLnJlbW92ZSguLi5zZWxmLnBvbGljaWVzKTtcblx0XHRcdFx0c2VsZi5wb2xpY2llcyA9IFtdO1xuXG5cdFx0XHRcdHNlbGYuamFDYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgc2VsZi5feWVzQ2xpY2tIYW5kbGVyKTtcblx0XHRcdFx0c2VsZi5uZWluQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX25vQ2xpY2tIYW5kbGVyKTtcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigncGxheWVyU2VsZWN0Jywgc2VsZi5fbm9taW5hdGVIYW5kbGVyKTtcblx0XHRcdFx0c2VsZi5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5jZWxWb3RlJywgc2VsZi5fY2FuY2VsSGFuZGxlcik7XG5cblx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBhbnN3ZXIgc3RpbGwgbWF0dGVyc1xuXHRcdFx0XHRpZighaXNWb3RlVmFsaWQoKSB8fCBhbnN3ZXIgPT09ICdjYW5jZWwnKXtcblx0XHRcdFx0XHRyZWplY3QoJ3ZvdGUgY2FuY2VsbGVkJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICd5ZXMnKVxuXHRcdFx0XHRcdHJlc29sdmUodHJ1ZSk7XG5cdFx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnbm8nKVxuXHRcdFx0XHRcdHJlc29sdmUoZmFsc2UpO1xuXHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3BsYXllcicpXG5cdFx0XHRcdFx0cmVzb2x2ZShldnQuZGF0YSk7XG5cdFx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUE9MSUNZKVxuXHRcdFx0XHRcdHJlc29sdmUoYW5zd2VyKTtcblx0XHRcdH1cblxuXHRcdFx0aWYoYW5zd2VyID09PSAneWVzJylcblx0XHRcdFx0c2VsZi5feWVzQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcblx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnbm8nKVxuXHRcdFx0XHRzZWxmLl9ub0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3BsYXllcicpXG5cdFx0XHRcdHNlbGYuX25vbWluYXRlSGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ2NhbmNlbCcpXG5cdFx0XHRcdHNlbGYuX2NhbmNlbEhhbmRsZXIgPSBoYW5kbGVyO1xuXG5cdFx0XHRyZXR1cm4gaGFuZGxlcjtcblx0XHR9XG5cblx0XHRzZWxmLmxhc3RRdWV1ZWQgPSBzZWxmLmxhc3RRdWV1ZWQudGhlbihob29rVXBRdWVzdGlvbiwgaG9va1VwUXVlc3Rpb24pO1xuXG5cdFx0cmV0dXJuIHNlbGYubGFzdFF1ZXVlZDtcblx0fVxufVxuXG5leHBvcnQge0JhbGxvdCwgUExBWUVSU0VMRUNULCBDT05GSVJNLCBCSU5BUlksIFBPTElDWX07IiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtGYXNjaXN0Um9sZUNhcmQsIEhpdGxlclJvbGVDYXJkLCBMaWJlcmFsUm9sZUNhcmQsIEZhc2Npc3RQYXJ0eUNhcmQsIExpYmVyYWxQYXJ0eUNhcmQsIEphQ2FyZCwgTmVpbkNhcmR9IGZyb20gJy4vY2FyZCc7XG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtOQmlsbGJvYXJkfSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGF5ZXJJbmZvIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHR0aGlzLmNhcmQgPSBudWxsO1xuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAsIDAuMyk7XG5cdFx0dGhpcy5zY2FsZS5zZXRTY2FsYXIoMC4zKTtcblx0XHRzZWF0LmFkZCh0aGlzKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUodGhpcy51cGRhdGVTdGF0ZS5iaW5kKHRoaXMpKSk7XG5cdFx0Ly9TSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy51cGRhdGVUdXJuT3JkZXIuYmluZCh0aGlzKSk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdpbnZlc3RpZ2F0ZScsIHRoaXMucHJlc2VudFBhcnR5LmJpbmQodGhpcykpO1xuXHR9XG5cblx0dXBkYXRlVHVybk9yZGVyKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxuXHR7XG5cdFx0U0guX3VzZXJQcm9taXNlLnRoZW4oKCkgPT4ge1xuXHRcdFx0bGV0IGxvY2FsUGxheWVyID0gcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdO1xuXHRcdFx0aWYobG9jYWxQbGF5ZXIpe1xuXHRcdFx0XHRsZXQgcGxheWVyUG9zID0gdGhpcy53b3JsZFRvTG9jYWwoU0guc2VhdHNbbG9jYWxQbGF5ZXIuc2VhdE51bV0uZ2V0V29ybGRQb3NpdGlvbigpKTtcblx0XHRcdFx0dGhpcy5sb29rQXQocGxheWVyUG9zKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdHVwZGF0ZVN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcblx0e1xuXHRcdGlmKCF0aGlzLnNlYXQub3duZXIpXG5cdFx0XHRyZXR1cm47XG5cblx0XHRpZigoZ2FtZS5zdGF0ZSA9PT0gJ25pZ2h0JyB8fCBnYW1lLnN0YXRlID09PSAnZG9uZScpICYmIHBsYXllcnNbU0gubG9jYWxVc2VyLmlkXSlcblx0XHRcdHRoaXMucHJlc2VudFJvbGUoZ2FtZSwgcGxheWVycywgdm90ZXMpO1xuXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnbGFtZUR1Y2snKVxuXHRcdFx0dGhpcy5wcmVzZW50Vm90ZShnYW1lLCBwbGF5ZXJzLCB2b3Rlcyk7XG5cblx0XHRlbHNlIGlmKHRoaXMuY2FyZCAhPT0gbnVsbClcblx0XHR7XG5cdFx0XHR0aGlzLnJlbW92ZSh0aGlzLmNhcmQpO1xuXHRcdFx0dGhpcy5jYXJkID0gbnVsbDtcblx0XHR9XG5cdH1cblxuXHRwcmVzZW50Um9sZShnYW1lLCBwbGF5ZXJzKVxuXHR7XG5cdFx0bGV0IGxvY2FsUGxheWVyID0gcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdO1xuXHRcdGxldCBzZWF0ZWRQbGF5ZXIgPSBwbGF5ZXJzW3RoaXMuc2VhdC5vd25lcl07XG5cblx0XHRsZXQgc2VhdGVkUm9sZVNob3VsZEJlVmlzaWJsZSA9XG5cdFx0XHRnYW1lLnN0YXRlID09PSAnZG9uZScgfHxcblx0XHRcdFNILmxvY2FsVXNlci5pZCA9PT0gdGhpcy5zZWF0Lm93bmVyIHx8XG5cdFx0XHRsb2NhbFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgJiYgKHNlYXRlZFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgfHwgc2VhdGVkUGxheWVyLnJvbGUgPT09ICdoaXRsZXInKSB8fFxuXHRcdFx0bG9jYWxQbGF5ZXIucm9sZSA9PT0gJ2hpdGxlcicgJiYgc2VhdGVkUGxheWVyLnJvbGUgPT09ICdmYXNjaXN0JyAmJiBnYW1lLnR1cm5PcmRlci5sZW5ndGggPCA3O1xuXG5cdFx0aWYoc2VhdGVkUm9sZVNob3VsZEJlVmlzaWJsZSlcblx0XHR7XG5cdFx0XHRzd2l0Y2goc2VhdGVkUGxheWVyLnJvbGUpe1xuXHRcdFx0XHRjYXNlICdmYXNjaXN0JzogdGhpcy5jYXJkID0gbmV3IEZhc2Npc3RSb2xlQ2FyZCgpOyBicmVhaztcblx0XHRcdFx0Y2FzZSAnaGl0bGVyJyA6IHRoaXMuY2FyZCA9IG5ldyBIaXRsZXJSb2xlQ2FyZCgpOyAgYnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2xpYmVyYWwnOiB0aGlzLmNhcmQgPSBuZXcgTGliZXJhbFJvbGVDYXJkKCk7IGJyZWFrO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFkZCh0aGlzLmNhcmQpO1xuXHRcdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcblx0XHR9XG5cdH1cblxuXHRwcmVzZW50Vm90ZShnYW1lLCBfLCB2b3Rlcylcblx0e1xuXHRcdGxldCB2b3RlID0gdm90ZXNbZ2FtZS5sYXN0RWxlY3Rpb25dO1xuXG5cdFx0bGV0IHBsYXllclZvdGUgPSB2b3RlLnllc1ZvdGVycy5pbmNsdWRlcyh0aGlzLnNlYXQub3duZXIpO1xuXHRcdHRoaXMuY2FyZCA9IHBsYXllclZvdGUgPyBuZXcgSmFDYXJkKCkgOiBuZXcgTmVpbkNhcmQoKTtcblxuXHRcdHRoaXMuYWRkKHRoaXMuY2FyZCk7XG5cdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcblx0fVxuXG5cdHByZXNlbnRQYXJ0eSh7ZGF0YTogdXNlcklkfSlcblx0e1xuXHRcdGlmKCF0aGlzLnNlYXQub3duZXIgfHwgdGhpcy5zZWF0Lm93bmVyICE9PSB1c2VySWQpIHJldHVybjtcblxuXHRcdGxldCByb2xlID0gU0gucGxheWVyc1t0aGlzLnNlYXQub3duZXJdLnJvbGU7XG5cdFx0dGhpcy5jYXJkID0gIHJvbGUgPT09ICdsaWJlcmFsJyA/IG5ldyBMaWJlcmFsUGFydHlDYXJkKCkgOiBuZXcgRmFzY2lzdFBhcnR5Q2FyZCgpO1xuXG5cdFx0dGhpcy5hZGQodGhpcy5jYXJkKTtcblx0XHRsZXQgYmIgPSBuZXcgTkJpbGxib2FyZCh0aGlzLmNhcmQpO1xuXHR9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDYXBzdWxlR2VvbWV0cnkgZXh0ZW5kcyBUSFJFRS5CdWZmZXJHZW9tZXRyeVxue1xuXHRjb25zdHJ1Y3RvcihyYWRpdXMsIGhlaWdodCwgc2VnbWVudHMgPSAxMiwgcmluZ3MgPSA4KVxuXHR7XG5cdFx0c3VwZXIoKTtcblxuXHRcdGxldCBudW1WZXJ0cyA9IDIgKiByaW5ncyAqIHNlZ21lbnRzICsgMjtcblx0XHRsZXQgbnVtRmFjZXMgPSA0ICogcmluZ3MgKiBzZWdtZW50cztcblx0XHRsZXQgdGhldGEgPSAyKk1hdGguUEkvc2VnbWVudHM7XG5cdFx0bGV0IHBoaSA9IE1hdGguUEkvKDIqcmluZ3MpO1xuXG5cdFx0bGV0IHZlcnRzID0gbmV3IEZsb2F0MzJBcnJheSgzKm51bVZlcnRzKTtcblx0XHRsZXQgZmFjZXMgPSBuZXcgVWludDE2QXJyYXkoMypudW1GYWNlcyk7XG5cdFx0bGV0IHZpID0gMCwgZmkgPSAwLCB0b3BDYXAgPSAwLCBib3RDYXAgPSAxO1xuXG5cdFx0dmVydHMuc2V0KFswLCBoZWlnaHQvMiwgMF0sIDMqdmkrKyk7XG5cdFx0dmVydHMuc2V0KFswLCAtaGVpZ2h0LzIsIDBdLCAzKnZpKyspO1xuXG5cdFx0Zm9yKCBsZXQgcz0wOyBzPHNlZ21lbnRzOyBzKysgKVxuXHRcdHtcblx0XHRcdGZvciggbGV0IHI9MTsgcjw9cmluZ3M7IHIrKylcblx0XHRcdHtcblx0XHRcdFx0bGV0IHJhZGlhbCA9IHJhZGl1cyAqIE1hdGguc2luKHIqcGhpKTtcblxuXHRcdFx0XHQvLyBjcmVhdGUgdmVydHNcblx0XHRcdFx0dmVydHMuc2V0KFtcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLmNvcyhzKnRoZXRhKSxcblx0XHRcdFx0XHRoZWlnaHQvMiAtIHJhZGl1cyooMS1NYXRoLmNvcyhyKnBoaSkpLFxuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguc2luKHMqdGhldGEpXG5cdFx0XHRcdF0sIDMqdmkrKyk7XG5cblx0XHRcdFx0dmVydHMuc2V0KFtcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLmNvcyhzKnRoZXRhKSxcblx0XHRcdFx0XHQtaGVpZ2h0LzIgKyByYWRpdXMqKDEtTWF0aC5jb3MocipwaGkpKSxcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLnNpbihzKnRoZXRhKVxuXHRcdFx0XHRdLCAzKnZpKyspO1xuXG5cdFx0XHRcdGxldCB0b3BfczFyMSA9IHZpLTIsIHRvcF9zMXIwID0gdmktNDtcblx0XHRcdFx0bGV0IGJvdF9zMXIxID0gdmktMSwgYm90X3MxcjAgPSB2aS0zO1xuXHRcdFx0XHRsZXQgdG9wX3MwcjEgPSB0b3BfczFyMSAtIDIqcmluZ3MsIHRvcF9zMHIwID0gdG9wX3MxcjAgLSAyKnJpbmdzO1xuXHRcdFx0XHRsZXQgYm90X3MwcjEgPSBib3RfczFyMSAtIDIqcmluZ3MsIGJvdF9zMHIwID0gYm90X3MxcjAgLSAyKnJpbmdzO1xuXHRcdFx0XHRpZihzID09PSAwKXtcblx0XHRcdFx0XHR0b3BfczByMSArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHRcdHRvcF9zMHIwICs9IG51bVZlcnRzLTI7XG5cdFx0XHRcdFx0Ym90X3MwcjEgKz0gbnVtVmVydHMtMjtcblx0XHRcdFx0XHRib3RfczByMCArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gY3JlYXRlIGZhY2VzXG5cdFx0XHRcdGlmKHIgPT09IDEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcENhcCwgdG9wX3MxcjEsIHRvcF9zMHIxXSwgMypmaSsrKTtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdENhcCwgYm90X3MwcjEsIGJvdF9zMXIxXSwgMypmaSsrKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcF9zMXIwLCB0b3BfczFyMSwgdG9wX3MwcjBdLCAzKmZpKyspO1xuXHRcdFx0XHRcdGZhY2VzLnNldChbdG9wX3MwcjAsIHRvcF9zMXIxLCB0b3BfczByMV0sIDMqZmkrKyk7XG5cblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdF9zMHIxLCBib3RfczFyMSwgYm90X3MwcjBdLCAzKmZpKyspO1xuXHRcdFx0XHRcdGZhY2VzLnNldChbYm90X3MwcjAsIGJvdF9zMXIxLCBib3RfczFyMF0sIDMqZmkrKyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gY3JlYXRlIGxvbmcgc2lkZXNcblx0XHRcdGxldCB0b3BfczEgPSB2aS0yLCB0b3BfczAgPSB0b3BfczEgLSAyKnJpbmdzO1xuXHRcdFx0bGV0IGJvdF9zMSA9IHZpLTEsIGJvdF9zMCA9IGJvdF9zMSAtIDIqcmluZ3M7XG5cdFx0XHRpZihzID09PSAwKXtcblx0XHRcdFx0dG9wX3MwICs9IG51bVZlcnRzLTI7XG5cdFx0XHRcdGJvdF9zMCArPSBudW1WZXJ0cy0yO1xuXHRcdFx0fVxuXG5cdFx0XHRmYWNlcy5zZXQoW3RvcF9zMCwgdG9wX3MxLCBib3RfczFdLCAzKmZpKyspO1xuXHRcdFx0ZmFjZXMuc2V0KFtib3RfczAsIHRvcF9zMCwgYm90X3MxXSwgMypmaSsrKTtcblx0XHR9XG5cblx0XHR0aGlzLmFkZEF0dHJpYnV0ZSgncG9zaXRpb24nLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHZlcnRzLCAzKSk7XG5cdFx0dGhpcy5zZXRJbmRleChuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKGZhY2VzLCAxKSk7XG5cdH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgQ2Fwc3VsZUdlb21ldHJ5IGZyb20gJy4vY2Fwc3VsZWdlb21ldHJ5JztcbmltcG9ydCB7bGF0ZVVwZGF0ZX0gZnJvbSAnLi91dGlscyc7XG5cbmxldCBoaXRib3hHZW8gPSBuZXcgQ2Fwc3VsZUdlb21ldHJ5KDAuMywgMS44KTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSGl0Ym94IGV4dGVuZHMgVEhSRUUuTWVzaFxue1xuXHRjb25zdHJ1Y3RvcihzZWF0KVxuXHR7XG5cdFx0c3VwZXIoaGl0Ym94R2VvLCBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuXHRcdFx0dHJhbnNwYXJlbnQ6IHRydWUsXG5cdFx0XHRvcGFjaXR5OiAwLFxuXHRcdFx0c2lkZTogVEhSRUUuQmFja1NpZGVcblx0XHR9KSk7XG5cblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC41LCAwKTtcblx0XHR0aGlzLnZpc2libGUgPSBmYWxzZTtcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xuXHRcdHNlYXQuYWRkKHRoaXMpO1xuXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3JlbnRlcicsICgpID0+IHRoaXMubWF0ZXJpYWwub3BhY2l0eSA9IDAuMSk7XG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3JsZWF2ZScsICgpID0+IHRoaXMubWF0ZXJpYWwub3BhY2l0eSA9IDApO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCAoKSA9PiB7XG5cdFx0XHRTSC5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdFx0dHlwZTogJ3BsYXllclNlbGVjdCcsXG5cdFx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB0aGlzLnNlYXQub3duZXJcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgbGF0ZVVwZGF0ZSh0aGlzLnVwZGF0ZVZpc2liaWxpdHkuYmluZCh0aGlzKSkpO1xuXHR9XG5cblx0dXBkYXRlVmlzaWJpbGl0eSh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSwgc3BlY2lhbFBsYXllcilcblx0e1xuXHRcdGxldCBsaXZpbmdQbGF5ZXJzID0gZ2FtZS50dXJuT3JkZXIuZmlsdGVyKHAgPT4gcGxheWVyc1twXS5zdGF0ZSAhPT0gJ2RlYWQnKTtcblx0XHRsZXQgcHJlY29uZGl0aW9ucyA9XG5cdFx0XHRTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50ICYmXG5cdFx0XHR0aGlzLnNlYXQub3duZXIgIT09ICcnICYmXG5cdFx0XHR0aGlzLnNlYXQub3duZXIgIT09IFNILmxvY2FsVXNlci5pZCAmJlxuXHRcdFx0bGl2aW5nUGxheWVycy5pbmNsdWRlcyh0aGlzLnNlYXQub3duZXIpO1xuXG5cdFx0bGV0IG5vbWluYXRlYWJsZSA9XG5cdFx0XHRnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnICYmXG5cdFx0XHR0aGlzLnNlYXQub3duZXIgIT09IGdhbWUubGFzdENoYW5jZWxsb3IgJiZcblx0XHRcdChsaXZpbmdQbGF5ZXJzLmxlbmd0aCA8PSA1IHx8IHRoaXMuc2VhdC5vd25lciAhPT0gZ2FtZS5sYXN0UHJlc2lkZW50KTtcblxuXHRcdGxldCBpbnZlc3RpZ2F0ZWFibGUgPVxuXHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ2ludmVzdGlnYXRlJyAmJlxuXHRcdFx0cGxheWVyc1t0aGlzLnNlYXQub3duZXJdLnN0YXRlID09PSAnbm9ybWFsJztcblx0XHRcblx0XHRsZXQgc3VjY2VlZGFibGUgPSBnYW1lLnN0YXRlID09PSAnbmFtZVN1Y2Nlc3Nvcic7XG5cdFx0bGV0IGV4ZWN1dGFibGUgPSBnYW1lLnN0YXRlID09PSAnZXhlY3V0ZSc7XG5cblx0XHR0aGlzLnZpc2libGUgPSBwcmVjb25kaXRpb25zICYmIChub21pbmF0ZWFibGUgfHwgaW52ZXN0aWdhdGVhYmxlIHx8IHN1Y2NlZWRhYmxlIHx8IGV4ZWN1dGFibGUpO1xuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgTmFtZXBsYXRlIGZyb20gJy4vbmFtZXBsYXRlJztcbmltcG9ydCB7QmFsbG90fSBmcm9tICcuL2JhbGxvdCc7XG5pbXBvcnQgUGxheWVySW5mbyBmcm9tICcuL3BsYXllcmluZm8nO1xuaW1wb3J0IEhpdGJveCBmcm9tICcuL2hpdGJveCc7XG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTZWF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdE51bSlcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLnNlYXROdW0gPSBzZWF0TnVtO1xuXHRcdHRoaXMub3duZXIgPSAnJztcblxuXHRcdC8vIHBvc2l0aW9uIHNlYXRcblx0XHRsZXQgeCwgeT0wLjY1LCB6O1xuXHRcdHN3aXRjaChzZWF0TnVtKXtcblx0XHRjYXNlIDA6IGNhc2UgMTogY2FzZSAyOlxuXHRcdFx0eCA9IC0wLjgzMyArIDAuODMzKnNlYXROdW07XG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCh4LCB5LCAtMS4wNSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIDM6IGNhc2UgNDpcblx0XHRcdHogPSAtMC40MzcgKyAwLjg3NCooc2VhdE51bS0zKTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KDEuNDI1LCB5LCB6KTtcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLzIsIDApO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSA1OiBjYXNlIDY6IGNhc2UgNzpcblx0XHRcdHggPSAwLjgzMyAtIDAuODMzKihzZWF0TnVtLTUpO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoeCwgeSwgMS4wNSk7XG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtTWF0aC5QSSwgMCk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIDg6IGNhc2UgOTpcblx0XHRcdHogPSAwLjQzNyAtIDAuODc0KihzZWF0TnVtLTgpO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoLTEuNDI1LCB5LCB6KTtcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KDAsIC0xLjUqTWF0aC5QSSwgMCk7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy51cGRhdGVPd25lcnNoaXAuYmluZCh0aGlzKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignY2hlY2tlZF9pbicsICh7ZGF0YTogaWR9KSA9PiB7XG5cdFx0XHRpZih0aGlzLm93bmVyID09PSBpZClcblx0XHRcdFx0dGhpcy51cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lOiBTSC5nYW1lLCBwbGF5ZXJzOiBTSC5wbGF5ZXJzfX0pO1xuXHRcdH0pO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KSA9PiB7XG5cdFx0XHRpZih0aGlzLm93bmVyICYmIHBsYXllcnNbdGhpcy5vd25lcl0uc3RhdGUgPT09ICdkZWFkJyl7XG5cdFx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldCgweDNkMjc4OSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLm5hbWVwbGF0ZSA9IG5ldyBOYW1lcGxhdGUodGhpcyk7XG5cdFx0dGhpcy5iYWxsb3QgPSBuZXcgQmFsbG90KHRoaXMpO1xuXHRcdHRoaXMucGxheWVySW5mbyA9IG5ldyBQbGF5ZXJJbmZvKHRoaXMpO1xuXHRcdHRoaXMuaGl0Ym94ID0gbmV3IEhpdGJveCh0aGlzKTtcblx0fVxuXG5cdHVwZGF0ZU93bmVyc2hpcCh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcblx0e1xuXHRcdGxldCBpZHMgPSBnYW1lLnR1cm5PcmRlciB8fCBbXTtcblxuXHRcdC8vIHJlZ2lzdGVyIHRoaXMgc2VhdCBpZiBpdCdzIG5ld2x5IGNsYWltZWRcblx0XHRpZiggIXRoaXMub3duZXIgKVxuXHRcdHtcblx0XHRcdC8vIGNoZWNrIGlmIGEgcGxheWVyIGhhcyBqb2luZWQgYXQgdGhpcyBzZWF0XG5cdFx0XHRmb3IobGV0IGkgaW4gaWRzKXtcblx0XHRcdFx0aWYocGxheWVyc1tpZHNbaV1dLnNlYXROdW0gPT0gdGhpcy5zZWF0TnVtKXtcblx0XHRcdFx0XHR0aGlzLm93bmVyID0gaWRzW2ldO1xuXHRcdFx0XHRcdHRoaXMubmFtZXBsYXRlLnVwZGF0ZVRleHQocGxheWVyc1tpZHNbaV1dLmRpc3BsYXlOYW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHJlc2V0IHRoaXMgc2VhdCBpZiBpdCdzIG5ld2x5IHZhY2F0ZWRcblx0XHRpZiggIWlkcy5pbmNsdWRlcyh0aGlzLm93bmVyKSApXG5cdFx0e1xuXHRcdFx0dGhpcy5vd25lciA9ICcnO1xuXHRcdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHRcdHRoaXMubmFtZXBsYXRlLnVwZGF0ZVRleHQoJzxKb2luPicpO1xuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXRIZXgoMHhmZmZmZmYpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHVwZGF0ZSBkaXNjb25uZWN0IGNvbG9yc1xuXHRcdGVsc2UgaWYoICFwbGF5ZXJzW3RoaXMub3duZXJdLmNvbm5lY3RlZCApe1xuXHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ODA4MDgwKTtcblx0XHR9XG5cdFx0ZWxzZSBpZiggcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcblx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweGZmZmZmZik7XG5cdFx0fVxuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQge1BsYWNlaG9sZGVyTWVzaCwgTkJpbGxib2FyZCwgTlRleHR9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbnRpbnVlQm94IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IocGFyZW50KVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmljb24gPSBuZXcgVEhSRUUuTWVzaChcblx0XHRcdG5ldyBUSFJFRS5Cb3hCdWZmZXJHZW9tZXRyeSguMiwgLjEsIC4yKSxcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4MDBjMDAwfSlcblx0XHQpO1xuXHRcdHRoaXMuaWNvbi5hZGRCZWhhdmlvcihuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5TcGluKCkpO1xuXHRcdHRoaXMuYWRkKHRoaXMuaWNvbik7XG5cblx0XHR0aGlzLnRleHQgPSBQbGFjZWhvbGRlck1lc2guY2xvbmUoKTtcblx0XHR0aGlzLnRleHQucG9zaXRpb24uc2V0KDAsIC4yLCAwKTtcblx0XHR0aGlzLnRleHQudXNlckRhdGEuYWx0c3BhY2UgPSB7Y29sbGlkZXI6IHtlbmFibGVkOiB0cnVlfX07XG5cblx0XHRsZXQgYmIgPSBuZXcgTkJpbGxib2FyZCh0aGlzLnRleHQpO1xuXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50ID0gbmV3IE5UZXh0KHRoaXMudGV4dCk7XG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7Zm9udFNpemU6IDEsIHdpZHRoOiAxLCBoZWlnaHQ6IDEsIGhvcml6b250YWxBbGlnbjogJ21pZGRsZScsIHZlcnRpY2FsQWxpZ246ICdtaWRkbGUnfSk7XG5cblx0XHR0aGlzLmFkZCh0aGlzLnRleHQpO1xuXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4zLCAwKTtcblx0XHRwYXJlbnQuYWRkKHRoaXMpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgdGhpcy5vbnN0YXRlY2hhbmdlLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLnBsYXllclNldHVwLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLm9uY2xpY2suYmluZCh0aGlzKSk7XG5cblx0XHRsZXQgc2hvdyA9ICgpID0+IHRoaXMuc2hvdygpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2ludmVzdGlnYXRlJywgc2hvdyk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigncG9saWN5QW5pbURvbmUnLCBzaG93KTtcblx0fVxuXG5cdG9uY2xpY2soZXZ0KVxuXHR7XG5cdFx0aWYoU0guZ2FtZS50dXJuT3JkZXIuaW5jbHVkZXMoU0gubG9jYWxVc2VyLmlkKSlcblx0XHRcdFNILnNvY2tldC5lbWl0KCdjb250aW51ZScpO1xuXHR9XG5cblx0b25zdGF0ZWNoYW5nZSh7ZGF0YToge2dhbWV9fSlcblx0e1xuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdsYW1lRHVjaycgfHwgKGdhbWUuc3RhdGUgPT09ICdwZWVrJyAmJiBnYW1lLnByZXNpZGVudCA9PT0gU0gubG9jYWxVc2VyLmlkKSlcblx0XHR7XG5cdFx0XHR0aGlzLnNob3coKTtcblx0XHR9XG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcblx0XHRcdHRoaXMucGxheWVyU2V0dXAoe2RhdGE6IHtnYW1lfX0pO1xuXHRcdH1cblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdkb25lJyl7XG5cdFx0XHR0aGlzLnNob3coJ05ldyBnYW1lJyk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dGhpcy5oaWRlKCk7XG5cdFx0fVxuXHR9XG5cblx0cGxheWVyU2V0dXAoe2RhdGE6IHtnYW1lfX0pXG5cdHtcblx0XHRpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcblx0XHRcdHRoaXMudGV4dC52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdFxuXHRcdFx0aWYoZ2FtZS50dXJuT3JkZXIubGVuZ3RoID49IDUpe1xuXHRcdFx0XHR0aGlzLmljb24udmlzaWJsZSA9IHRydWU7XG5cdFx0XHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6ICdDbGljayB0byBzdGFydCd9KTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLmljb24udmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OlxuXHRcdFx0XHRcdGBOZWVkICR7NS1nYW1lLnR1cm5PcmRlci5sZW5ndGh9IG1vcmUgcGxheWVyJHtnYW1lLnR1cm5PcmRlci5sZW5ndGghPTQgPyAncycgOiAnJ30hYFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRzaG93KG1lc3NhZ2UgPSAnQ2xpY2sgdG8gY29udGludWUnKXtcblx0XHR0aGlzLmljb24udmlzaWJsZSA9IHRydWU7XG5cdFx0dGhpcy50ZXh0LnZpc2libGUgPSB0cnVlO1xuXHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6IG1lc3NhZ2V9KTtcblx0fVxuXG5cdGhpZGUoKXtcblx0XHR0aGlzLmljb24udmlzaWJsZSA9IGZhbHNlO1xuXHRcdHRoaXMudGV4dC52aXNpYmxlID0gZmFsc2U7XG5cdH1cbn07IiwiaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XG5cbmNvbnN0IHBvc2l0aW9ucyA9IFtcblx0bmV3IFRIUkVFLlZlY3RvcjMoMC4zNjgsIC4wMTUsIC0uNzE3KSxcblx0bmV3IFRIUkVFLlZlY3RvcjMoMC4xMzUsIC4wMzAsIC0uNzE3KSxcblx0bmV3IFRIUkVFLlZlY3RvcjMoLS4wOTYsIC4wNDUsIC0uNzE3KSxcblx0bmV3IFRIUkVFLlZlY3RvcjMoLS4zMjksIC4wNjAsIC0uNzE3KVxuXTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRWxlY3Rpb25UcmFja2VyIGV4dGVuZHMgVEhSRUUuTWVzaFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcihcblx0XHRcdG5ldyBUSFJFRS5DeWxpbmRlckJ1ZmZlckdlb21ldHJ5KC4wNCwgLjA0LCAuMDMsIDE2KSxcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4MTkxOWZmfSlcblx0XHQpO1xuXHRcdHRoaXMucG9zaXRpb24uY29weShwb3NpdGlvbnNbMF0pO1xuXHRcdFNILnRhYmxlLmFkZCh0aGlzKTtcblx0XHRcblx0XHQvLyBmYWlscyUzID09IDAgb3IgMz9cblx0XHR0aGlzLmhpZ2hTaWRlID0gZmFsc2U7XG5cdFx0dGhpcy5zcG90ID0gMDtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9mYWlsZWRWb3RlcycsIHRoaXMudXBkYXRlRmFpbGVkVm90ZXMuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVGYWlsZWRWb3Rlcyh7ZGF0YToge2dhbWU6IHtmYWlsZWRWb3Rlc319fSA9IHtkYXRhOiB7Z2FtZToge2ZhaWxlZFZvdGVzOiAtMX19fSlcblx0e1xuXHRcdGlmKGZhaWxlZFZvdGVzID09PSAtMSlcblx0XHRcdGZhaWxlZFZvdGVzID0gdGhpcy5zcG90O1xuXG5cdFx0dGhpcy5oaWdoU2lkZSA9IGZhaWxlZFZvdGVzID4gMDtcblx0XHR0aGlzLnNwb3QgPSBmYWlsZWRWb3RlcyUzIHx8IHRoaXMuaGlnaFNpZGUgJiYgMyB8fCAwO1xuXG5cdFx0dGhpcy5hbmltID0gQW5pbWF0ZS5zaW1wbGUodGhpcywge1xuXHRcdFx0cG9zOiBwb3NpdGlvbnNbdGhpcy5zcG90XSxcblx0XHRcdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygxLCAxK3RoaXMuc3BvdCwgMSksXG5cdFx0XHRkdXJhdGlvbjogMTIwMFxuXHRcdH0pO1xuXHR9XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgJy4vcG9seWZpbGwnO1xuXG5pbXBvcnQgKiBhcyBDYXJkcyBmcm9tICcuL2NhcmQnO1xuaW1wb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH0gZnJvbSAnLi9oYXRzJztcbmltcG9ydCBHYW1lVGFibGUgZnJvbSAnLi90YWJsZSc7XG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCB7IGdldEdhbWVJZCwgbWVyZ2VPYmplY3RzIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgTmFtZXBsYXRlIGZyb20gJy4vbmFtZXBsYXRlJztcbmltcG9ydCBTZWF0IGZyb20gJy4vc2VhdCc7XG5pbXBvcnQgUGxheWVyTWV0ZXIgZnJvbSAnLi9wbGF5ZXJtZXRlcic7XG5pbXBvcnQgQ29udGludWVCb3ggZnJvbSAnLi9jb250aW51ZWJveCc7XG5pbXBvcnQgeyBOVGV4dCwgTkJpbGxib2FyZCwgUGxhY2Vob2xkZXJNZXNoIH0gZnJvbSAnLi9uYXRpdmVjb21wb25lbnRzJztcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XG5pbXBvcnQgRWxlY3Rpb25UcmFja2VyIGZyb20gJy4vZWxlY3Rpb250cmFja2VyJztcblxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmFzc2V0cyA9IEFzc2V0TWFuYWdlci5tYW5pZmVzdDtcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcblx0XHR0aGlzLm5lZWRzU2tlbGV0b24gPSBmYWxzZTtcblxuXHRcdC8vIHBvbHlmaWxsIGdldFVzZXIgZnVuY3Rpb25cblx0XHRpZighYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdFx0YWx0c3BhY2UuZ2V0VXNlciA9ICgpID0+IHtcblx0XHRcdFx0bGV0IGlkLCByZSA9IC9bPyZddXNlcklkPShcXGQrKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcblx0XHRcdFx0aWYocmUpXG5cdFx0XHRcdFx0aWQgPSByZVsxXTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMDApLnRvU3RyaW5nKCk7XG5cblx0XHRcdFx0YWx0c3BhY2UuX2xvY2FsVXNlciA9IHtcblx0XHRcdFx0XHR1c2VySWQ6IGlkLFxuXHRcdFx0XHRcdGRpc3BsYXlOYW1lOiBpZCxcblx0XHRcdFx0XHRpc01vZGVyYXRvcjogL2lzTW9kZXJhdG9yLy50ZXN0KHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpXG5cdFx0XHRcdH07XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdNYXNxdWVyYWRpbmcgYXMnLCBhbHRzcGFjZS5fbG9jYWxVc2VyKTtcblx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShhbHRzcGFjZS5fbG9jYWxVc2VyKTtcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8gZ2V0IGxvY2FsIHVzZXJcblx0XHR0aGlzLl91c2VyUHJvbWlzZSA9IGFsdHNwYWNlLmdldFVzZXIoKTtcblx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKHVzZXIgPT4ge1xuXHRcdFx0dGhpcy5sb2NhbFVzZXIgPSB7XG5cdFx0XHRcdGlkOiB1c2VyLnVzZXJJZCxcblx0XHRcdFx0ZGlzcGxheU5hbWU6IHVzZXIuZGlzcGxheU5hbWUsXG5cdFx0XHRcdGlzTW9kZXJhdG9yOiB1c2VyLmlzTW9kZXJhdG9yXG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5nYW1lID0ge307XG5cdFx0dGhpcy5wbGF5ZXJzID0ge307XG5cdFx0dGhpcy52b3RlcyA9IHt9O1xuXHR9XG5cblx0aW5pdGlhbGl6ZShlbnYsIHJvb3QsIGFzc2V0cylcblx0e1xuXHRcdC8vIHNoYXJlIHRoZSBkaW9yYW1hIGluZm9cblx0XHRBc3NldE1hbmFnZXIuY2FjaGUgPSBhc3NldHM7XG5cdFx0QXNzZXRNYW5hZ2VyLmZpeE1hdGVyaWFscygpO1xuXHRcdHRoaXMuZW52ID0gZW52O1xuXG5cdFx0Ly8gY29ubmVjdCB0byBzZXJ2ZXJcblx0XHR0aGlzLnNvY2tldCA9IGlvLmNvbm5lY3QoJy8nLCB7cXVlcnk6ICdnYW1lSWQ9JytnZXRHYW1lSWQoKX0pO1xuXG5cdFx0Ly8gY3JlYXRlIHRoZSB0YWJsZVxuXHRcdHRoaXMudGFibGUgPSBuZXcgR2FtZVRhYmxlKCk7XG5cdFx0dGhpcy5hZGQodGhpcy50YWJsZSk7XG5cblx0XHR0aGlzLnJlc2V0QnV0dG9uID0gbmV3IFRIUkVFLk1lc2goXG5cdFx0XHRuZXcgVEhSRUUuQm94R2VvbWV0cnkoLjI1LC4yNSwuMjUpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IGFzc2V0cy50ZXh0dXJlcy5yZXNldH0pXG5cdFx0KTtcblx0XHR0aGlzLnJlc2V0QnV0dG9uLnBvc2l0aW9uLnNldCgwLCAtMC4xOCwgMCk7XG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuc2VuZFJlc2V0LmJpbmQodGhpcykpO1xuXHRcdHRoaXMudGFibGUuYWRkKHRoaXMucmVzZXRCdXR0b24pO1xuXG5cdFx0Ly8gY3JlYXRlIGlkbGUgZGlzcGxheVxuXHRcdHRoaXMuY3JlZGl0cyA9IG5ldyBDYXJkcy5DcmVkaXRzQ2FyZCgpO1xuXHRcdHRoaXMuY3JlZGl0cy5wb3NpdGlvbi5zZXQoMCwgMS44NSwgMCk7XG5cdFx0dGhpcy5jcmVkaXRzLmFkZEJlaGF2aW9yKG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLlNwaW4oe3NwZWVkOiAwLjAwMDJ9KSk7XG5cdFx0dGhpcy5hZGQodGhpcy5jcmVkaXRzKTtcblxuXHRcdC8vIGNyZWF0ZSB2aWN0b3J5IGJhbm5lclxuXHRcdHRoaXMudmljdG9yeUJhbm5lciA9IFBsYWNlaG9sZGVyTWVzaC5jbG9uZSgpO1xuXHRcdHRoaXMudmljdG9yeUJhbm5lci50ZXh0ID0gbmV3IE5UZXh0KHRoaXMudmljdG9yeUJhbm5lcik7XG5cdFx0dGhpcy52aWN0b3J5QmFubmVyLnRleHQudXBkYXRlKHtmb250U2l6ZTogMn0pO1xuXHRcdHRoaXMudmljdG9yeUJhbm5lci5iaWxsYm9hcmQgPSBuZXcgTkJpbGxib2FyZCh0aGlzLnZpY3RvcnlCYW5uZXIpO1xuXHRcdHRoaXMuYWRkKHRoaXMudmljdG9yeUJhbm5lcik7XG5cblx0XHQvLyB1cGRhdGUgY3JlZGl0cy92aWN0b3J5XG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoe2RhdGE6IHtnYW1lfX0pID0+IHtcblx0XHRcdHRoaXMuY3JlZGl0cy52aXNpYmxlID0gZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJztcblx0XHRcdGlmKGdhbWUuc3RhdGUgPT09ICdkb25lJyl7XG5cdFx0XHRcdGlmKC9ebGliZXJhbC8udGVzdChnYW1lLnZpY3RvcnkpKXtcblx0XHRcdFx0XHR0aGlzLnZpY3RvcnlCYW5uZXIudGV4dC5jb2xvciA9ICdibHVlJztcblx0XHRcdFx0XHR0aGlzLnZpY3RvcnlCYW5uZXIudGV4dC51cGRhdGUoe3RleHQ6ICdMaWJlcmFscyB3aW4hJ30pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMudmljdG9yeUJhbm5lci50ZXh0LmNvbG9yID0gJ3JlZCc7XG5cdFx0XHRcdFx0dGhpcy52aWN0b3J5QmFubmVyLnRleHQudXBkYXRlKHt0ZXh0OiAnRmFzY2lzdHMgd2luISd9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0dGhpcy52aWN0b3J5QmFubmVyLnBvc2l0aW9uLnNldCgwLDAuOCwwKTtcblx0XHRcdFx0dGhpcy52aWN0b3J5QmFubmVyLnNjYWxlLnNldFNjYWxhciguMDAxKTtcblx0XHRcdFx0dGhpcy52aWN0b3J5QmFubmVyLnZpc2libGUgPSB0cnVlO1xuXHRcdFx0XHRBbmltYXRlLnNpbXBsZSh0aGlzLnZpY3RvcnlCYW5uZXIsIHtcblx0XHRcdFx0XHRwb3M6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEuODUsIDApLFxuXHRcdFx0XHRcdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygxLDEsMSlcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0dGhpcy52aWN0b3J5QmFubmVyLnZpc2libGUgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIGNyZWF0ZSBoYXRzXG5cdFx0dGhpcy5wcmVzaWRlbnRIYXQgPSBuZXcgUHJlc2lkZW50SGF0KCk7XG5cdFx0dGhpcy5jaGFuY2VsbG9ySGF0ID0gbmV3IENoYW5jZWxsb3JIYXQoKTtcblxuXHRcdC8vIGNyZWF0ZSBwb3NpdGlvbnNcblx0XHR0aGlzLnNlYXRzID0gW107XG5cdFx0Zm9yKGxldCBpPTA7IGk8MTA7IGkrKyl7XG5cdFx0XHR0aGlzLnNlYXRzLnB1c2goIG5ldyBTZWF0KGkpICk7XG5cdFx0fVxuXG5cdFx0dGhpcy50YWJsZS5hZGQoLi4udGhpcy5zZWF0cyk7XG5cblx0XHQvL3RoaXMucGxheWVyTWV0ZXIgPSBuZXcgUGxheWVyTWV0ZXIoKTtcblx0XHQvL3RoaXMudGFibGUuYWRkKHRoaXMucGxheWVyTWV0ZXIpO1xuXHRcdHRoaXMuY29udGludWVCb3ggPSBuZXcgQ29udGludWVCb3godGhpcy50YWJsZSk7XG5cblx0XHR0aGlzLmVsZWN0aW9uVHJhY2tlciA9IG5ldyBFbGVjdGlvblRyYWNrZXIoKTtcblxuXHRcdHRoaXMuc29ja2V0Lm9uKCd1cGRhdGUnLCB0aGlzLnVwZGF0ZUZyb21TZXJ2ZXIuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5zb2NrZXQub24oJ2NoZWNrZWRfaW4nLCB0aGlzLmNoZWNrZWRJbi5iaW5kKHRoaXMpKTtcblxuXHRcdHRoaXMuc29ja2V0Lm9uKCdyZXNldCcsIHRoaXMuZG9SZXNldC5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLnNvY2tldC5vbignZGlzY29ubmVjdCcsIHRoaXMuZG9SZXNldC5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZUZyb21TZXJ2ZXIoZ2QsIHBkLCB2ZClcblx0e1xuXHRcdGNvbnNvbGUubG9nKGdkLCBwZCwgdmQpO1xuXG5cdFx0bGV0IGdhbWUgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdhbWUsIGdkKTtcblx0XHRsZXQgcGxheWVycyA9IG1lcmdlT2JqZWN0cyh0aGlzLnBsYXllcnMsIHBkIHx8IHt9KTtcblx0XHRsZXQgdm90ZXMgPSBtZXJnZU9iamVjdHModGhpcy52b3RlcywgdmQgfHwge30pO1xuXG5cdFx0Zm9yKGxldCBmaWVsZCBpbiBnZClcblx0XHR7XG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe1xuXHRcdFx0XHR0eXBlOiAndXBkYXRlXycrZmllbGQsXG5cdFx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0Z2FtZTogZ2FtZSxcblx0XHRcdFx0XHRwbGF5ZXJzOiBwbGF5ZXJzLFxuXHRcdFx0XHRcdHZvdGVzOiB2b3Rlc1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKCgpID0+IHtcblx0XHRcdGlmKHBsYXllcnNbdGhpcy5sb2NhbFVzZXIuaWRdICYmICFwbGF5ZXJzW3RoaXMubG9jYWxVc2VyLmlkXS5jb25uZWN0ZWQpe1xuXHRcdFx0XHR0aGlzLnNvY2tldC5lbWl0KCdjaGVja19pbicsIHRoaXMubG9jYWxVc2VyKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XG5cdFx0dGhpcy5wbGF5ZXJzID0gcGxheWVycztcblx0XHR0aGlzLnZvdGVzID0gdm90ZXM7XG5cdH1cblxuXHRjaGVja2VkSW4ocClcblx0e1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5wbGF5ZXJzW3AuaWRdLCBwKTtcblx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe1xuXHRcdFx0dHlwZTogJ2NoZWNrZWRfaW4nLFxuXHRcdFx0YnViYmxlczogZmFsc2UsXG5cdFx0XHRkYXRhOiBwLmlkXG5cdFx0fSk7XG5cdH1cblxuXHRzZW5kUmVzZXQoZSl7XG5cdFx0aWYodGhpcy5sb2NhbFVzZXIuaXNNb2RlcmF0b3Ipe1xuXHRcdFx0Y29uc29sZS5sb2coJ3JlcXVlc3RpbmcgcmVzZXQnKTtcblx0XHRcdHRoaXMuc29ja2V0LmVtaXQoJ3Jlc2V0Jyk7XG5cdFx0fVxuXHR9XG5cblx0ZG9SZXNldChnYW1lLCBwbGF5ZXJzLCB2b3Rlcylcblx0e1xuXHRcdGlmKCAvJmNhY2hlQnVzdD1cXGQrJC8udGVzdCh3aW5kb3cubG9jYXRpb24uc2VhcmNoKSApe1xuXHRcdFx0d2luZG93LmxvY2F0aW9uLnNlYXJjaCArPSAnMSc7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0d2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgU2VjcmV0SGl0bGVyKCk7XG4iXSwibmFtZXMiOlsidGhpcyIsImxldCIsInN1cGVyIiwiQXNzZXRNYW5hZ2VyIiwiY2FyZCIsIkJhbGxvdFR5cGUuQ09ORklSTSIsInVwZGF0ZVN0YXRlIiwiQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1QiLCJCYWxsb3RUeXBlLlBPTElDWSIsIm9wdHMiLCJjbGVhblVwRmFrZVZvdGUiLCJCUC51cGRhdGVWb3Rlc0luUHJvZ3Jlc3MiLCJCUC51cGRhdGVTdGF0ZSIsIkJQQkEudG9BcnJheSIsIkJQQkEuTElCRVJBTCIsImNvbnN0IiwicG9zaXRpb25zIiwiQ2FyZHMuQ3JlZGl0c0NhcmQiXSwibWFwcGluZ3MiOiI7OztBQUVBLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztDQUM1QixNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFO0VBQ2xELEtBQUssRUFBRSxTQUFTLElBQUksQ0FBQztHQUNwQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMs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QUFDLEtBQUs7RUFDbkIsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSzs7O0VBR25CLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNO0VBQ25CLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTTtFQUNuQixDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTTtFQUNuQixDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNO0VBQ25CLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUs7RUFDbkIsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUs7RUFDbkIsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSztFQUNuQixDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUs7Ozs7RUFJbkIsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFFdEYsQ0FBQzs7Q0FFRkEsSUFBSSxPQUFPLEdBQUc7O0VBRWIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzFCLENBQUM7OztDQUdGQSxJQUFJLFNBQVMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0NBQ3ZFQSxJQUFJLElBQUksR0FBRyxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUM1RCxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0NBQ3BCLElBQUksR0FBRyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0NBQ3RFLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7OztDQUdsQkEsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLEdBQUcsRUFBRSxDQUFDO0NBQ3REQSxJQUFJLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDeEYsWUFBWSxHQUFHLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztDQUNsR0EsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0NBQ2IsSUFBSUEsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7RUFDdEIsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztFQUM1RztDQUNEQSxJQUFJLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOztDQUV0RyxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENB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QUFJLEtBQUssTUFBTTtJQUMzQyxFQUFBLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUE7UUFDWixHQUFHLEdBQUcsWUFBWSxLQUFLLENBQUMsSUFBSTtJQUNoQyxFQUFBRCxNQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUE7R0FDbEIsQ0FBQyxDQUFDOzs7RUFHSCxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztFQUMzQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUNsRixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzs7RUFFbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7RUFDN0MsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDdEYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O0VBRXBCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ2xCOzs7O2lDQUFBOztDQUVELGNBQUEsUUFBUSxzQkFBQyxNQUFNO0NBQ2Y7RUFDQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUM7R0FDNUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDbEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQ3BELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUN0RDtPQUNJLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLE1BQU0sQ0FBQztHQUNqQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztHQUM5QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztHQUMvQixDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUNyQjs7RUFFRCxHQUFHLE1BQU0sQ0FBQztHQUNULElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQUEsTUFBTSxDQUFDLENBQUMsQ0FBQztHQUNyQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFBLE1BQU0sQ0FBQyxDQUFDLENBQUM7R0FDdEM7O0VBRUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUM7RUFDeEIsQ0FBQTs7O0VBcERnQixLQUFLLENBQUMsUUFxRHZCLEdBQUE7O0FBRUQsSUFBTSxZQUFZLEdBQVk7Q0FDOUIscUJBQ1ksRUFBRTs7O0VBQ1pFLEdBQUssS0FBQSxDQUFDLE1BQUEsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDOUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztFQUM5RSxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQzs7RUFFckQsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxVQUFDLEdBQUEsRUFBZ0I7T0FBUixJQUFJOztHQUNoRCxHQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssVUFBVSxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDO0lBQ3RERCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUN6RUQsTUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QjtHQUNELENBQUMsQ0FBQztFQUNIOzs7O21EQUFBOzs7RUFieUIsR0FjMUIsR0FBQSxBQUFDOztBQUVGLElBQU0sYUFBYSxHQUFZO0NBQy9CLHNCQUNZLEVBQUU7OztFQUNaRSxHQUFLLEtBQUEsQ0FBQyxNQUFBLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQ2hDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7RUFDN0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7O0VBRXJELEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyx1QkFBdUIsRUFBRSxVQUFBLENBQUMsRUFBQztHQUM5Q0YsTUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztHQUMxQyxDQUFDLENBQUM7RUFDSDs7OztxREFBQTs7O0VBVjBCLEdBVzNCLEdBQUEsQUFFRCxBQUF1Qzs7QUNuRnZDLElBQXFCLFNBQVMsR0FBdUI7Q0FDckQsa0JBQ1k7Q0FDWDtFQUNDRSxVQUFLLEtBQUEsQ0FBQyxJQUFBLENBQUMsQ0FBQzs7O0VBR1IsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7RUFDdEIsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7RUFDdEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUM7RUFDckIsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7OztFQUdoQixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztFQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDakMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7OztFQUdyQixJQUFJLENBQUMsUUFBUSxHQUFHO0dBQ2YsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVztHQUM3QixFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTO0dBQzNCLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVc7R0FDN0IsQ0FBQztFQUNGLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRyxFQUFDLFNBQUcsR0FBRyxDQUFDLEtBQUssR0FBRyxLQUFLLEdBQUEsQ0FBQyxDQUFDO0VBQ2hELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQzs7O0VBR3hDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7O0VBRTdCLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ3BFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzlFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzlFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzFFOzs7OzZDQUFBOztDQUVELG9CQUFBLFVBQVUsd0JBQUMsR0FBQTtDQUNYO3NCQUR5QixhQUFDLENBQUE7TUFBQSxLQUFLLHVCQUFFO01BQUEsU0FBUzs7RUFFekMsR0FBRyxTQUFTLENBQUMsTUFBTSxJQUFJLENBQUM7R0FDdkIsRUFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFBO09BQzlCLEdBQUcsU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDO0dBQzVCLEVBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQTs7R0FFbEMsRUFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFBO0VBQ25DLENBQUE7O0NBRUQsb0JBQUEsVUFBVSx3QkFBQyxNQUFNLEVBQUUsY0FBYztDQUNqQztFQUNDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQUEsQ0FBQyxFQUFDO0dBQ3JCLEdBQUcsQ0FBQyxZQUFZLEtBQUssQ0FBQyxJQUFJO0dBQzFCO0lBQ0MsR0FBRyxjQUFjO0tBQ2hCLEVBQUEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBQTs7SUFFdEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDO0lBQ3hCO0dBQ0QsQ0FBQyxDQUFDO0VBQ0gsQ0FBQTs7Q0FFRCxvQkFBQSxjQUFjLDRCQUFDLEdBQUE7Q0FDZjtvQkFENkI7c0JBQUEsYUFBQyxDQUFBO01BQUEsZUFBZSxpQ0FBRTtNQUFBLGVBQWUsaUNBQUU7TUFBQSxXQUFXLDZCQUFFO01BQUEsSUFBSSxzQkFBRTtNQUFBLEtBQUs7O0VBRXZGRCxJQUFJLGFBQWEsR0FBRyxlQUFlLEdBQUcsZUFBZSxHQUFHLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztFQUM5RkEsSUFBSSxPQUFPLEdBQUcsYUFBYSxLQUFLLENBQUMsQ0FBQzs7RUFFbENBLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQzs7RUFFbEIsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLENBQUM7R0FDbkRBLElBQUksSUFBSSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztHQUNuQ0QsTUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDdEJBLE1BQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDZixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7R0FDN0M7RUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLGVBQWUsQ0FBQzs7RUFFcEMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLENBQUM7R0FDbkRDLElBQUlHLE1BQUksR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7R0FDbkNKLE1BQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDSSxNQUFJLENBQUMsQ0FBQztHQUN0QkosTUFBSSxDQUFDLEdBQUcsQ0FBQ0ksTUFBSSxDQUFDLENBQUM7R0FDZixRQUFRLENBQUMsSUFBSSxDQUFDQSxNQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0dBQzdDO0VBQ0QsSUFBSSxDQUFDLFlBQVksR0FBRyxlQUFlLENBQUM7O0VBRXBDLEdBQUcsS0FBSyxLQUFLLFdBQVcsSUFBSSxJQUFJLEtBQUssQ0FBQyxDQUFDO0dBQ3RDSCxJQUFJRyxNQUFJLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQztHQUMxQkEsTUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUN6QixJQUFJLENBQUMsR0FBRyxDQUFDQSxNQUFJLENBQUMsQ0FBQztHQUNmLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBRztJQUN4Q0osTUFBSSxDQUFDLE1BQU0sQ0FBQ0ksTUFBSSxDQUFDLENBQUM7SUFDbEIsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQztHQUNKOztFQUVELEdBQUcsS0FBSyxLQUFLLFdBQVcsQ0FBQztHQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFHO0lBQzdCLEVBQUUsQ0FBQyxhQUFhLENBQUM7S0FDaEIsSUFBSSxFQUFFLGdCQUFnQjtLQUN0QixPQUFPLEVBQUUsS0FBSztLQUNkLENBQUMsQ0FBQztJQUNILENBQUMsQ0FBQztHQUNIOztFQUVELEdBQUcsZUFBZSxLQUFLLENBQUMsSUFBSSxlQUFlLEtBQUssQ0FBQyxDQUFDO0dBQ2pELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQyxFQUFDLFNBQUdKLE1BQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUEsQ0FBQyxDQUFDO0dBQ3hDO0VBQ0QsQ0FBQTs7O0VBdkdxQyxLQUFLLENBQUMsUUF3RzVDLEdBQUEsQUFBQzs7QUMzR0YsU0FBUyxTQUFTO0FBQ2xCOztDQUVDQyxJQUFJLEVBQUUsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUMzRCxHQUFHLEVBQUUsQ0FBQztFQUNMLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ2I7TUFDSSxHQUFHLFFBQVEsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDO0VBQ3JDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7RUFDbEI7TUFDSTtFQUNKQSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxTQUFTLEVBQUUsQ0FBQztFQUNqRCxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDdkM7Q0FDRDs7QUFFRCxBQUtBLEFBb0NBLFNBQVMsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBTztBQUNuQzs4QkFEaUMsQ0FBQyxDQUFDOztDQUVsQyxTQUFTLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUN2QixPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQzFCOztDQUVEQSxJQUFJLE1BQU0sR0FBRyxDQUFDLFlBQVksTUFBTSxFQUFFLE1BQU0sR0FBRyxDQUFDLFlBQVksTUFBTSxDQUFDO0NBQy9ELEdBQUcsTUFBTSxJQUFJLE1BQU0sSUFBSSxLQUFLLEdBQUcsQ0FBQztDQUNoQztFQUNDQSxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7RUFDaEJBLElBQUksSUFBSSxHQUFHLE1BQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQUUsTUFBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztFQUNqRSxJQUFJQSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUM7R0FDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUNoRTtFQUNELE9BQU8sTUFBTSxDQUFDO0VBQ2Q7TUFDSSxHQUFHLENBQUMsS0FBSyxTQUFTO0VBQ3RCLEVBQUEsT0FBTyxDQUFDLENBQUMsRUFBQTs7RUFFVCxFQUFBLE9BQU8sQ0FBQyxDQUFDLEVBQUE7Q0FDVjs7QUFFRCxTQUFTLFVBQVUsQ0FBQyxFQUFFO0FBQ3RCO0NBQ0MsT0FBTyxZQUFVOzs7O0VBQ2hCLFVBQVUsQ0FBQyxZQUFHLFNBQUcsRUFBRSxNQUFBLENBQUMsUUFBQSxJQUFPLENBQUMsR0FBQSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0VBQ2xDLENBQUM7Q0FDRixBQUVELEFBQTJFOztBQ3JGM0UsSUFBcUIsU0FBUyxHQUF1QjtDQUNyRCxrQkFDWSxDQUFDLElBQUk7Q0FDaEI7OztFQUNDQyxVQUFLLEtBQUEsQ0FBQyxJQUFBLENBQUMsQ0FBQzs7RUFFUixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztFQUNqQixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7O0VBR2YsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0VBQzNELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ2xELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUNqQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzs7O0VBR3JCLElBQUksQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUM1QyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDO0VBQ3ZDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO0VBQzVDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDO0dBQ2pELEdBQUcsRUFBRSxJQUFJLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztHQUN0QyxDQUFDLENBQUM7OztFQUdILElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUM7R0FDakUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7R0FDaEMsQ0FBQyxDQUFDO0VBQ0gsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0VBQzVDLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7O0VBRS9ELEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsVUFBQyxHQUFBLEVBQXlCO09BQVYsS0FBSzs7R0FDeEQsR0FBRyxLQUFLLEtBQUssT0FBTztJQUNuQixFQUFBRixNQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQ0EsTUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUE7O0lBRTVDLEVBQUFBLE1BQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDQSxNQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBQTtHQUNoRCxDQUFDLENBQUM7RUFDSDs7Ozs2Q0FBQTs7Q0FFRCxvQkFBQSxVQUFVLHdCQUFDLElBQUk7Q0FDZjtFQUNDQyxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDOzs7RUFHbkRBLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ2xDQSxJQUFJLFNBQVMsR0FBRyxnREFBZ0QsQ0FBQztFQUNqRSxDQUFDLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQztFQUNyQixDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ2pFLENBQUMsQ0FBQyxJQUFJLEdBQUcsT0FBTSxHQUFFLFFBQVEsUUFBSSxHQUFFLFNBQVMsQ0FBRztFQUMzQyxDQUFDLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztFQUN2QixDQUFDLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztFQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7RUFFbkYsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7RUFDM0MsQ0FBQTs7Q0FFRCxvQkFBQSxLQUFLLG1CQUFDLENBQUM7Q0FDUDtFQUNDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssT0FBTyxFQUFFLEVBQUEsT0FBTyxFQUFBOztFQUVyQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLO0dBQ2xCLEVBQUEsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUE7T0FDZixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRTtHQUMxQyxFQUFBLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFBO09BQ2hCLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO0dBQ2xELEVBQUEsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUE7RUFDcEIsQ0FBQTs7Q0FFRCxvQkFBQSxXQUFXO0NBQ1g7RUFDQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0VBQ2xGLENBQUE7O0NBRUQsb0JBQUEsWUFBWTtDQUNaO0VBQ0NBLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztFQUNoQixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVE7RUFDakI7R0FDQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQ0FBa0MsRUFBRSxhQUFhLENBQUM7SUFDOUYsSUFBSSxDQUFDLFVBQUEsT0FBTyxFQUFDO0lBQ2IsR0FBRyxPQUFPLENBQUM7S0FDVixFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUN6QztJQUNELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLENBQUM7SUFDRCxLQUFLLENBQUMsWUFBRyxFQUFLLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0dBQ3hDO0VBQ0QsQ0FBQTs7Q0FFRCxvQkFBQSxXQUFXO0NBQ1g7RUFDQ0EsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO0VBQ2hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUTtFQUNqQjtHQUNDQSxJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUN6RCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVztJQUN0Qyx5Q0FBeUM7S0FDeEMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVc7SUFDeEMsWUFBWTtJQUNaO0lBQ0EsSUFBSSxDQUFDLFVBQUEsT0FBTyxFQUFDO0lBQ2IsR0FBRyxPQUFPLENBQUM7S0FDVixFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUN6RDtJQUNELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLENBQUM7SUFDRCxLQUFLLENBQUMsWUFBRyxFQUFLLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0dBQ3hDO0VBQ0QsQ0FBQTs7O0VBNUdxQyxLQUFLLENBQUMsUUE2RzVDOztBQUVELFNBQVMsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDOztBQy9HNUIsU0FBUyxxQkFBcUIsQ0FBQyxHQUFBO0FBQy9CO2dCQURzQyxRQUFDLENBQUE7S0FBQSxJQUFJLGlCQUFFO0tBQUEsT0FBTyxvQkFBRTtLQUFBLEtBQUs7O0NBRTFEQSxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUM7Q0FDbEIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUEsT0FBTyxFQUFBOztDQUU5QkEsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztDQUNoQ0EsSUFBSSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQUEsRUFBRSxFQUFDO0VBQ3JDQSxJQUFJLEVBQUUsR0FBRyxLQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxTQUFFLEtBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUN6REEsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQztFQUM3QixPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDeEUsQ0FBQyxDQUFDO0NBQ0hBLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNO0VBQ3pCLFVBQUEsRUFBRSxFQUFDLFNBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEdBQUE7RUFDM0csQ0FBQztDQUNGQSxJQUFJLGFBQWEsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxHQUFHLGdCQUFnQjtJQUM1RCxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsVUFBQSxFQUFFLEVBQUMsU0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEdBQUEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDOztDQUVyRixRQUFRLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRyxFQUFDOztFQUdwQkEsSUFBSSxZQUFZLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQztFQUM1QixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDO0dBQzlCLFlBQVksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVc7TUFDL0MscUJBQXFCO01BQ3JCLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsV0FBVztNQUNwQyxrQkFBa0IsQ0FBQztHQUN0QjtPQUNJLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLENBQUM7R0FDbEMsWUFBWSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDO0dBQzlDO09BQ0ksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQztHQUNsQyxZQUFZLEdBQUcsZ0JBQWdCO01BQzVCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVztNQUN2QyxHQUFHLENBQUM7R0FDUDtPQUNJLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxhQUFhO0VBQ3pDO0dBQ0MsSUFBSSxDQUFDLE9BQU8sR0FBR0ksT0FBa0IsQ0FBQztHQUNsQ0osSUFBSSxJQUFJLENBQUM7R0FDVCxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO0lBQ3hDLElBQUksR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDckMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRDtRQUNJO0lBQ0osSUFBSSxHQUFHLFlBQVksQ0FBQztJQUNwQjtHQUNELFlBQVksR0FBRyxjQUFjLEdBQUcsSUFBSSxDQUFDO0dBQ3JDOztFQUVELEdBQUcsWUFBWTtFQUNmO0dBQ0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQztJQUMxQyxJQUFJLENBQUMsVUFBQSxNQUFNLEVBQUM7SUFDWixFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFDRCxLQUFLLENBQUMsWUFBRyxTQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLEdBQUEsQ0FBQyxDQUFDO0dBQ2pEO0VBQ0QsQ0FBQyxDQUFDOztDQUVILEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7RUFDM0MsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7RUFDM0Q7Q0FDRDs7QUFFRCxTQUFTSyxhQUFXLENBQUMsR0FBQTtBQUNyQjtnQkFENEIsUUFBQyxDQUFBO0tBQUEsSUFBSSxpQkFBRTtLQUFBLE9BQU87O0NBRXpDTCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUM7O0NBRWxCLFNBQVMsWUFBWSxDQUFDLFFBQVEsRUFBRSxlQUFlLEVBQUUsRUFBRTtDQUNuRDtFQUNDLFNBQVMsYUFBYSxDQUFDLE1BQU07RUFDN0I7R0FDQ0EsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLENBQUM7R0FDOUNBLElBQUksSUFBSSxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0dBQ25ELE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUM7SUFDdEQsSUFBSSxDQUFDLFVBQUEsU0FBUyxFQUFDO0lBQ2YsR0FBRyxTQUFTLENBQUM7S0FDWixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDL0I7U0FDSTtLQUNKLE9BQU8sWUFBWSxDQUFDLFFBQVEsRUFBRSxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDbkQ7SUFDRCxDQUFDLENBQUM7R0FDSDs7RUFFRCxPQUFPLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLEVBQUVNLFlBQXVCLENBQUMsQ0FBQztHQUNuRixJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7RUFDckI7O0NBRUQsU0FBUyx1QkFBdUIsQ0FBQyxHQUFBO0NBQ2pDO01BRHlDLElBQUk7O0VBRTVDLEdBQUcsSUFBSSxDQUFDLEtBQUssS0FBSyxVQUFVLElBQUksTUFBTSxDQUFDLFNBQVMsS0FBSyxxQkFBcUIsQ0FBQztHQUMxRSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztHQUMzRDtFQUNELEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztFQUNoRTs7Q0FFRCxTQUFTLHFCQUFxQixDQUFDLEdBQUE7Q0FDL0I7TUFEdUMsSUFBSTs7RUFFMUMsR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsU0FBUyxLQUFLLGVBQWU7R0FDbEUsSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLElBQUksTUFBTSxDQUFDLFNBQVMsS0FBSyxlQUFlO0dBQ2hFO0dBQ0EsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7R0FDM0Q7RUFDRCxFQUFFLENBQUMsbUJBQW1CLENBQUMsY0FBYyxFQUFFLHFCQUFxQixDQUFDLENBQUM7RUFDOUQ7O0NBRUQsR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVUsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsU0FBUztDQUNwRTtFQUNDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQztHQUNyQyxZQUFZLENBQUMsMEJBQTBCLEVBQUUseUJBQXlCLEVBQUUsVUFBVSxDQUFDO0lBQzlFLElBQUksQ0FBQyxVQUFBLE1BQU0sRUFBQztJQUNaLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNuQyxDQUFDLENBQUM7R0FDSDtPQUNJO0dBQ0osTUFBTSxDQUFDLFdBQVcsQ0FBQywwQkFBMEIsRUFBRSxxQkFBcUIsRUFBRTtJQUNyRSxPQUFPLEVBQUVBLFlBQXVCO0lBQ2hDLElBQUksRUFBRSxJQUFJO0lBQ1YsU0FBUyxFQUFFLFlBQUcsU0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxVQUFVLEdBQUE7SUFDN0MsQ0FBQyxDQUFDO0dBQ0gsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0dBQzdEO0VBQ0Q7TUFDSSxHQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxTQUFTO0NBQ3hFO0VBQ0NOLElBQUksSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFTyxNQUFpQixFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDL0QsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDO0dBQ3JDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsWUFBRyxTQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsR0FBQSxDQUFDLENBQUMsQ0FBQztHQUNoRjs7RUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUM7R0FDbkUsSUFBSSxDQUFDLFVBQUEsT0FBTyxFQUFDO0dBQ2IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLENBQUM7R0FDM0MsQ0FBQyxDQUFDO0VBQ0gsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0VBQzNEO01BQ0ksR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsVUFBVTtDQUN6RTtFQUNDUCxJQUFJUSxNQUFJLEdBQUc7R0FDVixPQUFPLEVBQUVELE1BQWlCO0dBQzFCLFVBQVUsRUFBRSxJQUFJLENBQUMsSUFBSTtHQUNyQixXQUFXLEVBQUUsSUFBSSxDQUFDLGVBQWUsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUztHQUM1RCxDQUFDO0VBQ0YsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDO0dBQ3RDLE1BQU0sQ0FBQyxNQUFNLENBQUNDLE1BQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFlBQUcsU0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLEdBQUEsQ0FBQyxDQUFDLENBQUM7R0FDaEY7O0VBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsRUFBRSxlQUFlLEVBQUVBLE1BQUksQ0FBQztHQUNuRSxJQUFJLENBQUMsVUFBQSxPQUFPLEVBQUM7R0FDYixFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsQ0FBQztHQUMzQyxFQUFFLFVBQUEsR0FBRyxFQUFDLFNBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBQSxDQUFDLENBQUM7RUFDOUIsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0VBQzNEO01BQ0ksR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLGFBQWEsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsU0FBUztDQUM1RTtFQUNDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQztHQUNyQyxZQUFZLENBQUMsb0RBQW9ELEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxDQUFDO0lBQ25HLElBQUksQ0FBQyxVQUFBLE1BQU0sRUFBQztJQUNaLEVBQUUsQ0FBQyxhQUFhLENBQUM7S0FDaEIsSUFBSSxFQUFFLGFBQWE7S0FDbkIsSUFBSSxFQUFFLE1BQU07S0FDWixDQUFDLENBQUM7SUFDSCxDQUFDLENBQUM7R0FDSDtPQUNJO0dBQ0osTUFBTSxDQUFDLFdBQVcsQ0FBQyxvREFBb0QsRUFBRSxzQkFBc0IsRUFBRTtJQUNoRyxPQUFPLEVBQUVGLFlBQXVCO0lBQ2hDLElBQUksRUFBRSxJQUFJO0lBQ1YsU0FBUyxFQUFFLFlBQUcsU0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxhQUFhLEdBQUE7SUFDaEQsQ0FBQyxDQUFDO0dBQ0hOLElBQUksZUFBZSxHQUFHLFVBQUMsR0FBQSxFQUF5QjtRQUFWLEtBQUs7O0lBQzFDLEdBQUcsS0FBSyxLQUFLLGFBQWEsSUFBSSxNQUFNLENBQUMsU0FBUyxLQUFLLHNCQUFzQjtLQUN4RSxFQUFBLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUE7SUFDNUQsRUFBRSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUN4RCxDQUFDO0dBQ0YsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUMsQ0FBQztHQUNyRDtFQUNEO01BQ0ksR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLE1BQU0sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsU0FBUztDQUNyRTtFQUNDQSxJQUFJUSxNQUFJLEdBQUcsQ0FBQyxPQUFPLEVBQUVELE1BQWlCLEVBQUUsVUFBVSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN2RSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUM7R0FDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQ0MsTUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsWUFBRyxTQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLE1BQU0sR0FBQSxDQUFDLENBQUMsQ0FBQztHQUM3RTs7RUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLDBEQUEwRCxFQUFFLFlBQVksRUFBRUEsTUFBSSxDQUFDO0dBQ2pHLElBQUksQ0FBQyxVQUFBLE9BQU8sRUFBQztHQUNiLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0dBQzNCLENBQUMsQ0FBQztFQUNIUixJQUFJUyxpQkFBZSxHQUFHLFVBQUMsR0FBQSxFQUF5QjtPQUFWLEtBQUs7O0dBQzFDLEdBQUcsS0FBSyxLQUFLLE1BQU0sSUFBSSxNQUFNLENBQUMsU0FBUyxLQUFLLFlBQVk7SUFDdkQsRUFBQSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFBO0dBQzVELEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLEVBQUVBLGlCQUFlLENBQUMsQ0FBQztHQUN4RCxDQUFDO0VBQ0YsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRUEsaUJBQWUsQ0FBQyxDQUFDO0VBQ3JEO01BQ0ksR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLGVBQWUsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsU0FBUztDQUM5RTtFQUNDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQztHQUNyQyxZQUFZLENBQUMsNkNBQTZDLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxDQUFDO0lBQ2hHLElBQUksQ0FBQyxVQUFBLE1BQU0sRUFBQztJQUNaLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQztHQUNIO09BQ0k7R0FDSixNQUFNLENBQUMsV0FBVyxDQUFDLDZDQUE2QyxFQUFFLG9CQUFvQixFQUFFO0lBQ3ZGLE9BQU8sRUFBRUgsWUFBdUI7SUFDaEMsSUFBSSxFQUFFLElBQUk7SUFDVixTQUFTLEVBQUUsWUFBRyxTQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLGVBQWUsR0FBQTtJQUNsRCxDQUFDLENBQUM7R0FDSE4sSUFBSVMsaUJBQWUsR0FBRyxVQUFDLEdBQUEsRUFBeUI7UUFBVixLQUFLOztJQUMxQyxHQUFHLEtBQUssS0FBSyxlQUFlLElBQUksTUFBTSxDQUFDLFNBQVMsS0FBSyxvQkFBb0I7S0FDeEUsRUFBQSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFBO0lBQzVELEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLEVBQUVBLGlCQUFlLENBQUMsQ0FBQztJQUN4RCxDQUFDO0dBQ0YsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRUEsaUJBQWUsQ0FBQyxDQUFDO0dBQ3JEO0VBQ0Q7TUFDSSxHQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxTQUFTO0NBQ3hFO0VBQ0MsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDO0dBQ3JDLFlBQVksQ0FBQyw4Q0FBOEMsRUFBRSxhQUFhLEVBQUUsU0FBUyxDQUFDO0lBQ3JGLElBQUksQ0FBQyxVQUFBLE1BQU0sRUFBQztJQUNaLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNsQyxDQUFDLENBQUM7R0FDSDtPQUNJO0dBQ0osTUFBTSxDQUFDLFdBQVcsQ0FBQyw4Q0FBOEMsRUFBRSxrQkFBa0IsRUFBRTtJQUN0RixPQUFPLEVBQUVILFlBQXVCO0lBQ2hDLElBQUksRUFBRSxJQUFJO0lBQ1YsU0FBUyxFQUFFLFlBQUcsU0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLEdBQUE7SUFDNUMsQ0FBQyxDQUFDO0dBQ0hOLElBQUlTLGlCQUFlLEdBQUcsVUFBQyxHQUFBLEVBQXlCO1FBQVYsS0FBSzs7SUFDMUMsR0FBRyxLQUFLLEtBQUssU0FBUyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEtBQUssa0JBQWtCO0tBQ2hFLEVBQUEsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQTtJQUM1RCxFQUFFLENBQUMsbUJBQW1CLENBQUMsY0FBYyxFQUFFQSxpQkFBZSxDQUFDLENBQUM7SUFDeEQsQ0FBQztHQUNGLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUVBLGlCQUFlLENBQUMsQ0FBQztHQUNyRDtFQUNEO01BQ0ksR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLE1BQU0sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsU0FBUztDQUNyRTtFQUNDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQztHQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxRQUFRLEVBQUM7SUFDL0QsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQztHQUNIO09BQ0k7R0FDSixNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxlQUFlLEVBQUU7SUFDcEQsSUFBSSxFQUFFLElBQUk7SUFDVixTQUFTLEVBQUUsWUFBRyxTQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLE1BQU0sR0FBQTtJQUN6QyxDQUFDLENBQUM7R0FDSFQsSUFBSVMsaUJBQWUsR0FBRyxVQUFDLEdBQUEsRUFBeUI7UUFBVixLQUFLOztJQUMxQyxHQUFHLEtBQUssS0FBSyxNQUFNLElBQUksTUFBTSxDQUFDLFNBQVMsS0FBSyxlQUFlO0tBQzFELEVBQUEsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQTtJQUM1RCxFQUFFLENBQUMsbUJBQW1CLENBQUMsY0FBYyxFQUFFQSxpQkFBZSxDQUFDLENBQUM7SUFDeEQsQ0FBQTtHQUNELEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUVBLGlCQUFlLENBQUMsQ0FBQztHQUNyRDtFQUNEO01BQ0ksR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLE1BQU0sQ0FBQztFQUM3QixNQUFNLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztFQUN4QjtNQUNJLEdBQUcsSUFBSSxDQUFDLEtBQUssS0FBSyxXQUFXLENBQUM7RUFDbEMsTUFBTSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7RUFDekI7Q0FDRCxBQUVEOzs7Ozs7Ozs7QUN6UUFULElBRUMsT0FBTyxHQUFHLENBQUMsQ0FBQzs7QUFFYkEsSUFBSSxTQUFTLEdBQUc7Q0FDZixHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHO0NBQ2xCLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUk7Q0FDdEIsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSztDQUMxQixNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNO0NBQzlCLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTztDQUN6QixDQUFDOztBQUVGLFNBQVMsTUFBTSxDQUFDLElBQUk7QUFDcEI7Q0FDQyxPQUFPLFNBQVMsQ0FBQyxTQUFTLENBQUMsVUFBQSxDQUFDLEVBQUMsU0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFBLENBQUMsRUFBRSxDQUFDLENBQUM7Q0FDN0M7O0FBRUQsQUFjQSxBQUtBLEFBWUEsQUFLQSxTQUFTLE9BQU8sQ0FBQyxJQUFJO0FBQ3JCO0NBQ0NBLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztDQUNiLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQztFQUNkLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ25CLElBQUksTUFBTSxDQUFDLENBQUM7RUFDWjs7Q0FFRCxPQUFPLEdBQUcsQ0FBQztDQUNYLEFBRUQ7O0FDaEVBQSxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUM7QUFDckJBLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztBQUNoQkEsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQ2ZBLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQzs7QUFFZixJQUFNLE1BQU0sR0FBdUI7Q0FDbkMsZUFDWSxDQUFDLElBQUk7Q0FDaEI7RUFDQ0MsVUFBSyxLQUFBLENBQUMsSUFBQSxDQUFDLENBQUM7RUFDUixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztFQUNqQixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDbEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7RUFFZixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztFQUNwQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztFQUN0QixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQzs7RUFFdkIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztFQUM3QixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztFQUM1QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO0VBQzdCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDOztFQUUzQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7RUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO0VBQy9CLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQyxFQUFDO0dBQ3RDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsWUFBWSxNQUFNLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0dBQzFELENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQ3hCLENBQUMsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0dBQ2xCLENBQUMsQ0FBQztFQUNILElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDckMsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7Ozs7RUFJbkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUM7RUFDeEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDdkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztFQUM5QixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzs7RUFFeEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDOUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQzs7RUFFdkYsRUFBRSxDQUFDLGdCQUFnQixDQUFDLHdCQUF3QixFQUFFUyxxQkFBd0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNuRixFQUFFLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQ0MsYUFBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDM0U7Ozs7dUNBQUE7O0NBRUQsaUJBQUEsV0FBVyx5QkFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUE7Q0FDdkI7MkJBRHNILEdBQUcsRUFBRSxDQUF6RjtpRUFBQSxNQUFNLENBQWU7NkVBQUEsR0FBRyxDQUFnQjtpRkFBQSxLQUFLLENBQVM7cURBQUEsS0FBSyxDQUFjO3FGQUFHLFNBQUcsSUFBSTs7RUFFcEhYLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQzs7RUFFaEIsU0FBUyxXQUFXO0VBQ3BCO0dBQ0NBLElBQUksV0FBVyxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0dBQ3ZDQSxJQUFJLFdBQVcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0dBQ3BDQSxJQUFJLGFBQWEsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO0dBQzdDQSxJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0dBQ3hCQSxJQUFJLE1BQU0sR0FBRyxJQUFJLEdBQUcsSUFBUSxDQUFDLFNBQVMsU0FBRSxJQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDO0dBQy9EQSxJQUFJLFlBQVksR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDcEQsT0FBTyxXQUFXLElBQUksYUFBYSxJQUFJLFdBQVcsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUM7R0FDNUU7O0VBRUQsU0FBUyxjQUFjLEVBQUU7R0FDeEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0dBQ3JDOztFQUVELFNBQVMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQU07RUFDekM7O0dBRUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ2pCLE9BQU8sTUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDdEM7Ozs7R0FJRCxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBLEVBQUMsR0FBRSxLQUFLLENBQUUsQ0FBQyxDQUFDLENBQUM7R0FDOUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDOzs7R0FHN0IsR0FBRyxPQUFPLEtBQUssT0FBTyxJQUFJLE9BQU8sS0FBSyxNQUFNLENBQUM7SUFDNUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQzNCLEdBQUcsQ0FBQyxJQUFJO0tBQ1AsRUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUE7SUFDM0U7R0FDRCxHQUFHLE9BQU8sS0FBSyxNQUFNLENBQUM7SUFDckIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQzdCLEdBQUcsQ0FBQyxJQUFJO0tBQ1AsRUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUE7SUFDNUU7UUFDSSxHQUFHLE9BQU8sS0FBSyxZQUFZLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDekMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3hFO1FBQ0ksR0FBRyxPQUFPLEtBQUssTUFBTSxDQUFDO0lBQzFCQSxJQUFJLEtBQUssR0FBR1ksT0FBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3JDLEdBQUcsV0FBVyxFQUFFLEVBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUE7SUFDL0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO0tBRTNCWixJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7S0FDaEIsR0FBRyxJQUFJO01BQ04sRUFBQSxJQUFJLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQyxFQUFBO1VBQ25CLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQztNQUNqQixFQUFBLElBQUksR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDLEVBQUE7VUFDbEIsR0FBRyxHQUFHLEtBQUthLE9BQVk7TUFDM0IsRUFBQSxJQUFJLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLEVBQUE7O01BRS9CLEVBQUEsSUFBSSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxFQUFBOztLQUVoQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7S0FFM0JiLElBQUksS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO0tBQzdCQSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7S0FDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQy9CLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDZixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs7S0FFekIsR0FBRyxDQUFDLElBQUk7TUFDUCxFQUFBLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBQTtLQUNsRixDQUFDLENBQUM7SUFDSDs7R0FFRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7O0dBRXhFLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO0dBQ3BCOztFQUVELFNBQVMsT0FBTyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTTtFQUN4QztHQUNDLFNBQVMsT0FBTyxDQUFDLEdBQUc7R0FDcEI7O0lBRUMsR0FBRyxNQUFNLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUEsT0FBTyxFQUFBOzs7SUFHdEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQzVCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztJQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7SUFDOUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7SUFDdEIsSUFBSSxDQUFDLE1BQU0sTUFBQSxDQUFDLE1BQUEsSUFBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlCLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDOztJQUVuQixJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNuRSxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDcEUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUM5RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQzs7O0lBRzVELEdBQUcsQ0FBQyxXQUFXLEVBQUUsSUFBSSxNQUFNLEtBQUssUUFBUSxDQUFDO0tBQ3hDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0tBQ3pCO1NBQ0ksR0FBRyxNQUFNLEtBQUssS0FBSztLQUN2QixFQUFBLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFBO1NBQ1YsR0FBRyxNQUFNLEtBQUssSUFBSTtLQUN0QixFQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFBO1NBQ1gsR0FBRyxNQUFNLEtBQUssUUFBUTtLQUMxQixFQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQTtTQUNkLEdBQUcsT0FBTyxLQUFLLE1BQU07S0FDekIsRUFBQSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQTtJQUNqQjs7R0FFRCxHQUFHLE1BQU0sS0FBSyxLQUFLO0lBQ2xCLEVBQUEsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxFQUFBO1FBQzVCLEdBQUcsTUFBTSxLQUFLLElBQUk7SUFDdEIsRUFBQSxJQUFJLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxFQUFBO1FBQzNCLEdBQUcsTUFBTSxLQUFLLFFBQVE7SUFDMUIsRUFBQSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLEVBQUE7UUFDNUIsR0FBRyxNQUFNLEtBQUssUUFBUTtJQUMxQixFQUFBLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDLEVBQUE7O0dBRS9CLE9BQU8sT0FBTyxDQUFDO0dBQ2Y7O0VBRUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUM7O0VBRXZFLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztFQUN2QixDQUFBOzs7RUEzS21CLEtBQUssQ0FBQyxRQTRLMUIsR0FBQSxBQUVEOztBQ3JMQSxJQUFxQixVQUFVLEdBQXVCO0NBQ3RELG1CQUNZLENBQUMsSUFBSTtDQUNoQjtFQUNDQyxVQUFLLEtBQUEsQ0FBQyxJQUFBLENBQUMsQ0FBQztFQUNSLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0VBQ2pCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0VBQ2pCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDN0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDMUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7RUFFZixFQUFFLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7OztFQUc3RSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDakU7Ozs7K0NBQUE7O0NBRUQscUJBQUEsZUFBZSw2QkFBQyxHQUFBO0NBQ2hCO29CQUR1QjtpQkFBQSxRQUFDLENBQUE7TUFBQSxJQUFJLGlCQUFFO01BQUEsT0FBTzs7RUFFcEMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBRztHQUN2QkQsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7R0FDM0MsR0FBRyxXQUFXLENBQUM7SUFDZEEsSUFBSSxTQUFTLEdBQUdELE1BQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO0lBQ3BGQSxNQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZCO0dBQ0QsQ0FBQyxDQUFDO0VBQ0gsQ0FBQTs7Q0FFRCxxQkFBQSxXQUFXLHlCQUFDLEdBQUE7Q0FDWjtpQkFEbUIsUUFBQyxDQUFBO01BQUEsSUFBSSxpQkFBRTtNQUFBLE9BQU8sb0JBQUU7TUFBQSxLQUFLOztFQUV2QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLO0dBQ2xCLEVBQUEsT0FBTyxFQUFBOztFQUVSLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztHQUMvRSxFQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFBOztPQUVuQyxHQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssVUFBVTtHQUNoQyxFQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFBOztPQUVuQyxHQUFHLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSTtFQUMxQjtHQUNDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0dBQ2pCO0VBQ0QsQ0FBQTs7Q0FFRCxxQkFBQSxXQUFXLHlCQUFDLElBQUksRUFBRSxPQUFPO0NBQ3pCO0VBQ0NDLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQzNDQSxJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzs7RUFFNUNBLElBQUkseUJBQXlCO0dBQzVCLElBQUksQ0FBQyxLQUFLLEtBQUssTUFBTTtHQUNyQixFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUs7R0FDbkMsV0FBVyxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxLQUFLLFNBQVMsSUFBSSxZQUFZLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQztHQUNyRyxXQUFXLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxZQUFZLENBQUMsSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7O0VBRS9GLEdBQUcseUJBQXlCO0VBQzVCO0dBQ0MsT0FBTyxZQUFZLENBQUMsSUFBSTtJQUN2QixLQUFLLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQyxNQUFNO0lBQ3pELEtBQUssUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQyxFQUFFLE1BQU07SUFDekQsS0FBSyxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUMsTUFBTTtJQUN6RDs7R0FFRCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUNwQkEsSUFBSSxFQUFFLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQ25DO0VBQ0QsQ0FBQTs7Q0FFRCxxQkFBQSxXQUFXLHlCQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSztDQUMxQjtFQUNDQSxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDOztFQUVwQ0EsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUMxRCxJQUFJLENBQUMsSUFBSSxHQUFHLFVBQVUsR0FBRyxJQUFJLE1BQU0sRUFBRSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7O0VBRXZELElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ3BCQSxJQUFJLEVBQUUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDbkMsQ0FBQTs7Q0FFRCxxQkFBQSxZQUFZLDBCQUFDLEdBQUE7Q0FDYjtNQURvQixNQUFNOztFQUV6QixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssTUFBTSxFQUFFLEVBQUEsT0FBTyxFQUFBOztFQUUxREEsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQztFQUM1QyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksS0FBSyxTQUFTLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQzs7RUFFbEYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDcEJBLElBQUksRUFBRSxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUNuQyxDQUFBOzs7RUExRnNDLEtBQUssQ0FBQyxRQTJGN0MsR0FBQSxBQUFDOztBQ2hHRixJQUFxQixlQUFlLEdBQTZCO0NBQ2pFLHdCQUNZLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFhLEVBQUUsS0FBUztDQUNwRDtxQ0FEb0MsR0FBRyxFQUFFLENBQU87K0JBQUEsR0FBRyxDQUFDOztFQUVuREMsVUFBSyxLQUFBLENBQUMsSUFBQSxDQUFDLENBQUM7O0VBRVJELElBQUksUUFBUSxHQUFHLENBQUMsR0FBRyxLQUFLLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQztFQUN4Q0EsSUFBSSxRQUFRLEdBQUcsQ0FBQyxHQUFHLEtBQUssR0FBRyxRQUFRLENBQUM7RUFDcENBLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQztFQUMvQkEsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7RUFFNUJBLElBQUksS0FBSyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUN6Q0EsSUFBSSxLQUFLLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQ3hDQSxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxDQUFDLENBQUM7O0VBRTNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztFQUNwQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7RUFFckMsS0FBS0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFO0VBQzdCO0dBQ0MsS0FBS0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO0dBQzNCO0lBQ0NBLElBQUksTUFBTSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7O0lBR3RDLEtBQUssQ0FBQyxHQUFHLENBQUM7S0FDVCxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3JDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7SUFFWCxLQUFLLENBQUMsR0FBRyxDQUFDO0tBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3RDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7SUFFWEEsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQ0EsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQ0EsSUFBSSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2pFQSxJQUFJLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDakUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ1YsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkI7OztJQUdELEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFDVjtLQUNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2hELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2hEOztJQUVEO0tBQ0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDbEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0tBRWxELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xEO0lBQ0Q7OztHQUdEQSxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUM3Q0EsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDN0MsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ1YsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDckIsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDckI7O0dBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FDNUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FDNUM7O0VBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLEtB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
