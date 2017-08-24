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
			cards: 'static/img/cards.png',
			reset: 'static/img/bomb.png',
			text: 'static/img/text.png'
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
	function Animate(//{parent, pos, quat, scale, matrix, duration, callback}
		ref)
	{
		var parent = ref.parent; if ( parent === void 0 ) parent = null;
		var pos = ref.pos; if ( pos === void 0 ) pos = null;
		var quat = ref.quat; if ( quat === void 0 ) quat = null;
		var scale = ref.scale; if ( scale === void 0 ) scale = null;
		var matrix = ref.matrix; if ( matrix === void 0 ) matrix = null;
		var duration = ref.duration; if ( duration === void 0 ) duration = 600;
		var callback = ref.callback; if ( callback === void 0 ) callback = function (){};

		Behavior$$1.call(this, 'Animate');
		
		if(matrix)
		{
			// extract position/rotation/scale from matrix
			pos = new THREE.Vector3();
			quat = new THREE.Quaternion();
			scale = new THREE.Vector3();
			matrix.decompose(pos, quat, scale);
		}

		Object.assign(this, {parent: parent, pos: pos, quat: quat, scale: scale, duration: duration, callback: callback});
	}

	if ( Behavior$$1 ) Animate.__proto__ = Behavior$$1;
	Animate.prototype = Object.create( Behavior$$1 && Behavior$$1.prototype );
	Animate.prototype.constructor = Animate;

	Animate.prototype.awake = function awake (obj)
	{
		Behavior$$1.prototype.awake.call(this, obj);

		// shuffle hierarchy, but keep world transform the same
		if(this.parent && this.parent !== obj.parent)
		{
			obj.applyMatrix(obj.parent.matrixWorld);
			var mat = new THREE.Matrix4().getInverse(this.parent.matrixWorld);
			obj.applyMatrix(mat);

			this.parent.add(obj);
		}

		// read initial positions
		this.initialPos = obj.position.clone();
		this.initialQuat = obj.quaternion.clone();
		this.initialScale = obj.scale.clone();
		this.startTime = Date.now();
	};

	Animate.prototype.update = function update ()
	{
		// compute ease-out based on duration
		var mix = (Date.now()-this.startTime) / this.duration;
		var ease = TWEEN ? TWEEN.Easing.Quadratic.Out : function (n) { return n*(2-n); };
		mix = mix < 1 ? ease(mix) : 1;

		// animate position if requested
		if( this.pos ){
			this.object3D.position.lerpVectors(this.initialPos, this.pos, mix);
		}

		// animate rotation if requested
		if( this.quat ){
			THREE.Quaternion.slerp(this.initialQuat, this.quat, this.object3D.quaternion, mix);
		}

		// animate scale if requested
		if( this.scale ){
			this.object3D.scale.lerpVectors(this.initialScale, this.scale, mix);
		}

		// terminate animation when done
		if(mix >= 1){
			this.object3D.removeBehavior(this);
			this.callback.call(this.object3D);
		}
	};

	return Animate;
}(Behavior));

Animate.start = function (target, opts) {
	var oldAnim = target.getBehaviorByType('Animate');
	if(oldAnim){
		oldAnim.constructor(opts);
		oldAnim.awake(target);
	}
	else {
		target.addBehavior( new Animate(opts) );
	}
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
	CREDITS: 10
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
		.754,.996, .754,.834, .997,.834, .997,.996, .021,.022, .021,.269, .375,.269, .375,.022, // liberal policy
		.754,.822, .754,.660, .996,.660, .996,.822, .021,.022, .021,.269, .375,.269, .375,.022, // fascist policy
		.746,.996, .505,.996, .505,.650, .746,.650, .021,.022, .021,.269, .375,.269, .375,.022, // liberal role
		.746,.645, .505,.645, .505,.300, .746,.300, .021,.022, .021,.269, .375,.269, .375,.022, // fascist role
		.996,.645, .754,.645, .754,.300, .996,.300, .021,.022, .021,.269, .375,.269, .375,.022, // hitler role
		.495,.996, .255,.996, .255,.650, .495,.650, .021,.022, .021,.269, .375,.269, .375,.022, // liberal party
		.495,.645, .255,.645, .255,.300, .495,.300, .021,.022, .021,.269, .375,.269, .375,.022, // fascist party
		.244,.992, .005,.992, .005,.653, .244,.653, .021,.022, .021,.269, .375,.269, .375,.022, // ja
		.243,.642, .006,.642, .006,.302, .243,.302, .021,.022, .021,.269, .375,.269, .375,.022, // nein
		.021,.022, .021,.269, .375,.269, .375,.022, .021,.022, .021,.269, .375,.269, .375,.022, // blank
		.397,.276, .397,.015, .765,.015, .765,.276, .021,.022, .021,.269, .375,.269, .375,.022 ];
	
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
	for(var i=0; i<11; i++){
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
		var this$1 = this;

		Card.call(this, Types.CREDITS);
		SH.addEventListener('update_state', function (e) { return this$1.visible = e.data.game.state === 'setup'; });
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
	LiberalPolicyCard.prototype.goToPosition = function goToPosition (spot)
	{
		if ( spot === void 0 ) spot = 0;

		spot = Math.max(0, Math.min(4, spot));
		var s = LiberalPolicyCard.spots;
		Animate.start(this, {parent: AM.root, pos: s['pos_'+spot], quat: s.quat, scale: s.scale});
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
	FascistPolicyCard.prototype.goToPosition = function goToPosition (spot)
	{
		if ( spot === void 0 ) spot = 0;

		spot = Math.max(0, Math.min(5, spot));
		var s = FascistPolicyCard.spots;
		Animate.start(this, {parent: AM.root, pos: s['pos_'+spot], quat: s.quat, scale: s.scale});
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
		
		SH.addEventListener('update_lastPresident', function (e) {
			this$1.setOwner(e.data.game.lastPresident);
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
	}

	if ( superclass ) GameTable.__proto__ = superclass;
	GameTable.prototype = Object.create( superclass && superclass.prototype );
	GameTable.prototype.constructor = GameTable;

	GameTable.prototype.changeMode = function changeMode (ref)
	{
		var ref_data_game = ref.data.game;
		var state = ref_data_game.state;
		var turnOrder = ref_data_game.turnOrder;

		if(state === 'setup'){
			if(turnOrder.length >= 9)
				{ this.setTexture(this.textures[2]); }
			else if(turnOrder.length >= 7)
				{ this.setTexture(this.textures[1]); }
			else
				{ this.setTexture(this.textures[0]); }
		}
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

		for(var i=this.liberalCards; i<liberalPolicies; i++){
			var card = new LiberalPolicyCard();
			this$1.cards.push(card);
			this$1.add(card);
			card.goToPosition(i);
		}
		this.liberalCards = liberalPolicies;

		for(var i=this.fascistCards; i<fascistPolicies; i++){
			var card$1 = new FascistPolicyCard();
			this$1.cards.push(card$1);
			this$1.add(card$1);
			card$1.goToPosition(i);
		}
		this.fascistCards = fascistPolicies;

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
		else if(votes[vId].type === 'confirmRole' && ballot.seat.owner === SH.localUser.id)
		{
			opts = {choices: CONFIRM};
			var role = players[SH.localUser.id].role;
			role = role.charAt(0).toUpperCase() + role.slice(1);
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

	function chooseChancellor()
	{
		return ballot.askQuestion('Choose your\nchancellor!', 'local_nominate', {choices: PLAYERSELECT})
		.then(confirmChancellor);
	}

	function confirmChancellor(userId)
	{
		var username = SH.players[userId].displayName;
		var text = "Name " + username + "\nas chancellor?";
		return ballot.askQuestion(text, 'local_nominate_confirm')
		.then(function (confirmed) {
			if(confirmed){
				return Promise.resolve(userId);
			}
			else {
				return chooseChancellor();
			}
		});
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
			chooseChancellor().then(function (userId) {
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
		var opts$1 = {choices: POLICY, policyHand: game.hand};
		if(SH.localUser.id !== game.chancellor){
			Object.assign(opts$1, {fake: true, isInvalid: function () { return SH.game.state !== 'policy2'; }});
		}

		ballot.askQuestion('Choose one\nto discard!', 'local_policy2', opts$1)
		.then(function (discard) {
			SH.socket.emit('discard_policy2', discard);
		}, function (err) { return console.error(err); });
		SH.addEventListener('update_state', hidePolicyPlaceholder);
	}
}

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
				toArray(policyHand).forEach(function (val, i, arr) {
					var card = null;
					if(fake)
						{ card = new BlankCard(); }
					else if(val)
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
						{ card.addEventListener('cursorup', respond(i, resolve, reject)); }
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

		if(game.state === 'night' && players[SH.localUser.id])
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
			SH.localUser.id === this.seat.owner ||
			localPlayer.role === 'fascist' && (seatedPlayer.role === 'fascist' || seatedPlayer.role === 'hitler') ||
			localPlayer.role === 'hitler' && seatedPlayer.role === 'fascist' && game.turnOrder.length < 9;

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

		SH.addEventListener('update_state', lateUpdate(function (ref) {
			var game = ref.data.game;

			this$1.visible =
				game.state === 'nominate' &&
				SH.localUser.id === game.president &&
				this$1.seat.owner !== '' &&
				this$1.seat.owner !== SH.localUser.id &&
				this$1.seat.owner !== game.lastChancellor &&
				(game.turnOrder.length === 5 || this$1.seat.owner !== game.lastPresident);
		}));
	}

	if ( superclass ) Hitbox.__proto__ = superclass;
	Hitbox.prototype = Object.create( superclass && superclass.prototype );
	Hitbox.prototype.constructor = Hitbox;

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
		SH.addEventListener('checkedIn', function (id) {
			if(this$1.owner === id)
				{ this$1.updateOwnership({data: {game: SH.game, players: SH.players}}); }
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

		if(game.state === 'lameDuck' || game.state === 'aftermath'){
			this.icon.visible = true;
			this.text.visible = true;
			this.textComponent.update({text: 'Click to continue'});
		}
		else if(game.state === 'setup'){
			this.playerSetup({data: {game: game}});
		}
		else {
			this.icon.visible = false;
			this.text.visible = false;
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

	return ContinueBox;
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

		// create idle display
		this.idleRoot = new THREE.Object3D();
		this.idleRoot.position.set(0, 1.85, 0);
		this.idleRoot.addBehavior(new altspace.utilities.behaviors.Spin({speed: 0.0002}));
		this.add(this.idleRoot);

		// create idle slideshow
		var credits = new CreditsCard();
		this.idleRoot.add(credits);

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

		// add avatar for scale
		/*assets.models.dummy.position.set(0, -0.12, 1.1);
		assets.models.dummy.rotateZ(Math.PI);
		this.add(assets.models.dummy);*/

		this.socket.on('update', this.updateFromServer.bind(this));
		this.socket.on('checkedIn', this.checkedIn.bind(this));

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
			type: 'checkedIn',
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

	SecretHitler.prototype.doReset = function doReset ()
	{
		if( /&cacheBust=\d+$/.test(window.location.search) ){
			window.location.search += '1';
		}
		else {
			window.location.search += '&cacheBust=1';
		}
	};

	return SecretHitler;
}(THREE.Object3D));

var SH = new SecretHitler();

return SH;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvcG9seWZpbGwuanMiLCIuLi8uLi9zcmMvY2xpZW50L2Fzc2V0bWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hdGl2ZWNvbXBvbmVudHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RhYmxlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC91dGlscy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3Rwcm9jZXNzb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JwYmEuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JhbGxvdC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVyaW5mby5qcyIsIi4uLy4uL3NyYy9jbGllbnQvY2Fwc3VsZWdlb21ldHJ5LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9oaXRib3guanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlYXQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NvbnRpbnVlYm94LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWNyZXRoaXRsZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5pZighQXJyYXkucHJvdG90eXBlLmluY2x1ZGVzKXtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgJ2luY2x1ZGVzJywge1xuXHRcdHZhbHVlOiBmdW5jdGlvbihpdGVtKXtcblx0XHRcdHJldHVybiB0aGlzLmluZGV4T2YoaXRlbSkgPiAtMTtcblx0XHR9LFxuXHRcdHdyaXRhYmxlOiBmYWxzZSxcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRjb25maWd1cmFibGU6IGZhbHNlXG5cdH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCB7XG5cdG1hbmlmZXN0OiB7XG5cdFx0bW9kZWxzOiB7XG5cdFx0XHR0YWJsZTogJ3N0YXRpYy9tb2RlbC90YWJsZS5nbHRmJyxcblx0XHRcdG5hbWVwbGF0ZTogJ3N0YXRpYy9tb2RlbC9uYW1lcGxhdGUuZGFlJyxcblx0XHRcdHRvcGhhdDogJ3N0YXRpYy9tb2RlbC90b3BoYXQuZ2x0ZicsXG5cdFx0XHR2aXNvcmNhcDogJ3N0YXRpYy9tb2RlbC92aXNvcl9jYXAuZ2x0ZicsXG5cdFx0XHQvL2R1bW15OiAnc3RhdGljL21vZGVsL2R1bW15LmdsdGYnLFxuXHRcdFx0Ly9wbGF5ZXJtZXRlcjogJ3N0YXRpYy9tb2RlbC9wbGF5ZXJtZXRlci5nbHRmJ1xuXHRcdH0sXG5cdFx0dGV4dHVyZXM6IHtcblx0XHRcdGJvYXJkX2xhcmdlOiAnc3RhdGljL2ltZy9ib2FyZC1sYXJnZS5qcGcnLFxuXHRcdFx0Ym9hcmRfbWVkOiAnc3RhdGljL2ltZy9ib2FyZC1tZWRpdW0uanBnJyxcblx0XHRcdGJvYXJkX3NtYWxsOiAnc3RhdGljL2ltZy9ib2FyZC1zbWFsbC5qcGcnLFxuXHRcdFx0Y2FyZHM6ICdzdGF0aWMvaW1nL2NhcmRzLnBuZycsXG5cdFx0XHRyZXNldDogJ3N0YXRpYy9pbWcvYm9tYi5wbmcnLFxuXHRcdFx0dGV4dDogJ3N0YXRpYy9pbWcvdGV4dC5wbmcnXG5cdFx0fVxuXHR9LFxuXHRjYWNoZToge30sXG5cdGZpeE1hdGVyaWFsczogZnVuY3Rpb24oKVxuXHR7XG5cdFx0T2JqZWN0LmtleXModGhpcy5jYWNoZS5tb2RlbHMpLmZvckVhY2goaWQgPT4ge1xuXHRcdFx0dGhpcy5jYWNoZS5tb2RlbHNbaWRdLnRyYXZlcnNlKG9iaiA9PiB7XG5cdFx0XHRcdGlmKG9iai5tYXRlcmlhbCBpbnN0YW5jZW9mIFRIUkVFLk1lc2hTdGFuZGFyZE1hdGVyaWFsKXtcblx0XHRcdFx0XHRsZXQgbmV3TWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKCk7XG5cdFx0XHRcdFx0bmV3TWF0Lm1hcCA9IG9iai5tYXRlcmlhbC5tYXA7XG5cdFx0XHRcdFx0bmV3TWF0LmNvbG9yLmNvcHkob2JqLm1hdGVyaWFsLmNvbG9yKTtcblx0XHRcdFx0XHRvYmoubWF0ZXJpYWwgPSBuZXdNYXQ7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbmNsYXNzIEJlaGF2aW9yXG57XG5cdGNvbnN0cnVjdG9yKHR5cGUpe1xuXHRcdHRoaXMudHlwZSA9IHR5cGU7XG5cdH1cblxuXHRhd2FrZShvYmope1xuXHRcdHRoaXMub2JqZWN0M0QgPSBvYmo7XG5cdH1cblxuXHRzdGFydCgpeyB9XG5cblx0dXBkYXRlKGRUKXsgfVxuXG5cdGRpc3Bvc2UoKXsgfVxufVxuXG5jbGFzcyBCU3luYyBleHRlbmRzIEJlaGF2aW9yXG57XG5cdGNvbnN0cnVjdG9yKGV2ZW50TmFtZSlcblx0e1xuXHRcdHN1cGVyKCdCU3luYycpO1xuXHRcdHRoaXMuX3MgPSBTSC5zb2NrZXQ7XG5cblx0XHQvLyBsaXN0ZW4gZm9yIHVwZGF0ZSBldmVudHNcblx0XHR0aGlzLmhvb2sgPSB0aGlzLl9zLm9uKGV2ZW50TmFtZSwgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuZXZlbnROYW1lID0gZXZlbnROYW1lO1xuXHRcdHRoaXMub3duZXIgPSAwO1xuXHR9XG5cblx0dXBkYXRlRnJvbVNlcnZlcihkYXRhKVxuXHR7XG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XG5cdFx0dGhpcy5vYmplY3QzRC5yb3RhdGlvbi5mcm9tQXJyYXkoZGF0YSwgMyk7XG5cdH1cblxuXHR0YWtlT3duZXJzaGlwKClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlciAmJiBTSC5sb2NhbFVzZXIudXNlcklkKVxuXHRcdFx0dGhpcy5vd25lciA9IFNILmxvY2FsVXNlci51c2VySWQ7XG5cdH1cblxuXHR1cGRhdGUoZFQpXG5cdHtcblx0XHRpZihTSC5sb2NhbFVzZXIgJiYgU0gubG9jYWxVc2VyLnNrZWxldG9uICYmIFNILmxvY2FsVXNlci5pZCA9PT0gdGhpcy5vd25lcilcblx0XHR7XG5cdFx0XHRsZXQgaiA9IFNILmxvY2FsVXNlci5za2VsZXRvbi5nZXRKb2ludCgnSGVhZCcpO1xuXHRcdFx0dGhpcy5fcy5lbWl0KHRoaXMuZXZlbnROYW1lLCBbLi4uai5wb3NpdGlvbi50b0FycmF5KCksIC4uLmoucm90YXRpb24udG9BcnJheSgpXSk7XG5cdFx0fVxuXHR9XG5cbn1cblxuZXhwb3J0IHsgQmVoYXZpb3IsIEJTeW5jIH07XG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgeyBCZWhhdmlvciB9IGZyb20gJy4vYmVoYXZpb3InO1xyXG5cclxuY2xhc3MgQW5pbWF0ZSBleHRlbmRzIEJlaGF2aW9yXHJcbntcclxuXHRjb25zdHJ1Y3RvcigvL3twYXJlbnQsIHBvcywgcXVhdCwgc2NhbGUsIG1hdHJpeCwgZHVyYXRpb24sIGNhbGxiYWNrfVxyXG5cdFx0e3BhcmVudD1udWxsLCBwb3M9bnVsbCwgcXVhdD1udWxsLCBzY2FsZT1udWxsLCBtYXRyaXg9bnVsbCwgZHVyYXRpb249NjAwLCBjYWxsYmFjaz0oKT0+e319KVxyXG5cdHtcclxuXHRcdHN1cGVyKCdBbmltYXRlJyk7XHJcblx0XHRcclxuXHRcdGlmKG1hdHJpeClcclxuXHRcdHtcclxuXHRcdFx0Ly8gZXh0cmFjdCBwb3NpdGlvbi9yb3RhdGlvbi9zY2FsZSBmcm9tIG1hdHJpeFxyXG5cdFx0XHRwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRxdWF0ID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcclxuXHRcdFx0c2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRtYXRyaXguZGVjb21wb3NlKHBvcywgcXVhdCwgc2NhbGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywge3BhcmVudCwgcG9zLCBxdWF0LCBzY2FsZSwgZHVyYXRpb24sIGNhbGxiYWNrfSk7XHJcblx0fVxyXG5cclxuXHRhd2FrZShvYmopXHJcblx0e1xyXG5cdFx0c3VwZXIuYXdha2Uob2JqKTtcclxuXHJcblx0XHQvLyBzaHVmZmxlIGhpZXJhcmNoeSwgYnV0IGtlZXAgd29ybGQgdHJhbnNmb3JtIHRoZSBzYW1lXHJcblx0XHRpZih0aGlzLnBhcmVudCAmJiB0aGlzLnBhcmVudCAhPT0gb2JqLnBhcmVudClcclxuXHRcdHtcclxuXHRcdFx0b2JqLmFwcGx5TWF0cml4KG9iai5wYXJlbnQubWF0cml4V29ybGQpO1xyXG5cdFx0XHRsZXQgbWF0ID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5nZXRJbnZlcnNlKHRoaXMucGFyZW50Lm1hdHJpeFdvcmxkKTtcclxuXHRcdFx0b2JqLmFwcGx5TWF0cml4KG1hdCk7XHJcblxyXG5cdFx0XHR0aGlzLnBhcmVudC5hZGQob2JqKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyByZWFkIGluaXRpYWwgcG9zaXRpb25zXHJcblx0XHR0aGlzLmluaXRpYWxQb3MgPSBvYmoucG9zaXRpb24uY2xvbmUoKTtcclxuXHRcdHRoaXMuaW5pdGlhbFF1YXQgPSBvYmoucXVhdGVybmlvbi5jbG9uZSgpO1xyXG5cdFx0dGhpcy5pbml0aWFsU2NhbGUgPSBvYmouc2NhbGUuY2xvbmUoKTtcclxuXHRcdHRoaXMuc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZSgpXHJcblx0e1xyXG5cdFx0Ly8gY29tcHV0ZSBlYXNlLW91dCBiYXNlZCBvbiBkdXJhdGlvblxyXG5cdFx0bGV0IG1peCA9IChEYXRlLm5vdygpLXRoaXMuc3RhcnRUaW1lKSAvIHRoaXMuZHVyYXRpb247XHJcblx0XHRsZXQgZWFzZSA9IFRXRUVOID8gVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQgOiBuID0+IG4qKDItbik7XHJcblx0XHRtaXggPSBtaXggPCAxID8gZWFzZShtaXgpIDogMTtcclxuXHJcblx0XHQvLyBhbmltYXRlIHBvc2l0aW9uIGlmIHJlcXVlc3RlZFxyXG5cdFx0aWYoIHRoaXMucG9zICl7XHJcblx0XHRcdHRoaXMub2JqZWN0M0QucG9zaXRpb24ubGVycFZlY3RvcnModGhpcy5pbml0aWFsUG9zLCB0aGlzLnBvcywgbWl4KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBhbmltYXRlIHJvdGF0aW9uIGlmIHJlcXVlc3RlZFxyXG5cdFx0aWYoIHRoaXMucXVhdCApe1xyXG5cdFx0XHRUSFJFRS5RdWF0ZXJuaW9uLnNsZXJwKHRoaXMuaW5pdGlhbFF1YXQsIHRoaXMucXVhdCwgdGhpcy5vYmplY3QzRC5xdWF0ZXJuaW9uLCBtaXgpXHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gYW5pbWF0ZSBzY2FsZSBpZiByZXF1ZXN0ZWRcclxuXHRcdGlmKCB0aGlzLnNjYWxlICl7XHJcblx0XHRcdHRoaXMub2JqZWN0M0Quc2NhbGUubGVycFZlY3RvcnModGhpcy5pbml0aWFsU2NhbGUsIHRoaXMuc2NhbGUsIG1peCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gdGVybWluYXRlIGFuaW1hdGlvbiB3aGVuIGRvbmVcclxuXHRcdGlmKG1peCA+PSAxKXtcclxuXHRcdFx0dGhpcy5vYmplY3QzRC5yZW1vdmVCZWhhdmlvcih0aGlzKTtcclxuXHRcdFx0dGhpcy5jYWxsYmFjay5jYWxsKHRoaXMub2JqZWN0M0QpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuQW5pbWF0ZS5zdGFydCA9ICh0YXJnZXQsIG9wdHMpID0+XHJcbntcclxuXHRsZXQgb2xkQW5pbSA9IHRhcmdldC5nZXRCZWhhdmlvckJ5VHlwZSgnQW5pbWF0ZScpO1xyXG5cdGlmKG9sZEFuaW0pe1xyXG5cdFx0b2xkQW5pbS5jb25zdHJ1Y3RvcihvcHRzKTtcclxuXHRcdG9sZEFuaW0uYXdha2UodGFyZ2V0KTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHR0YXJnZXQuYWRkQmVoYXZpb3IoIG5ldyBBbmltYXRlKG9wdHMpICk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBBbmltYXRlO1xyXG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbi8vIGVudW0gY29uc3RhbnRzXG5sZXQgVHlwZXMgPSBPYmplY3QuZnJlZXplKHtcblx0UE9MSUNZX0xJQkVSQUw6IDAsXG5cdFBPTElDWV9GQVNDSVNUOiAxLFxuXHRST0xFX0xJQkVSQUw6IDIsXG5cdFJPTEVfRkFTQ0lTVDogMyxcblx0Uk9MRV9ISVRMRVI6IDQsXG5cdFBBUlRZX0xJQkVSQUw6IDUsXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXG5cdEpBOiA3LFxuXHRORUlOOiA4LFxuXHRCTEFOSzogOSxcblx0Q1JFRElUUzogMTBcbn0pO1xuXG5sZXQgZ2VvbWV0cnkgPSBudWxsLCBtYXRlcmlhbCA9IG51bGw7XG5cbmZ1bmN0aW9uIGluaXRDYXJkRGF0YSgpXG57XG5cdGxldCBmbG9hdERhdGEgPSBbXG5cdFx0Ly8gcG9zaXRpb24gKHBvcnRyYWl0KVxuXHRcdDAuMzU3NSwgMC41LCAwLjAwMDUsXG5cdFx0LS4zNTc1LCAwLjUsIDAuMDAwNSxcblx0XHQtLjM1NzUsIC0uNSwgMC4wMDA1LFxuXHRcdDAuMzU3NSwgLS41LCAwLjAwMDUsXG5cdFx0MC4zNTc1LCAwLjUsIC0uMDAwNSxcblx0XHQtLjM1NzUsIDAuNSwgLS4wMDA1LFxuXHRcdC0uMzU3NSwgLS41LCAtLjAwMDUsXG5cdFx0MC4zNTc1LCAtLjUsIC0uMDAwNSxcblx0XG5cdFx0Ly8gcG9zaXRpb24gKGxhbmRzY2FwZSlcblx0XHQwLjUsIC0uMzU3NSwgMC4wMDA1LFxuXHRcdDAuNSwgMC4zNTc1LCAwLjAwMDUsXG5cdFx0LS41LCAwLjM1NzUsIDAuMDAwNSxcblx0XHQtLjUsIC0uMzU3NSwgMC4wMDA1LFxuXHRcdDAuNSwgLS4zNTc1LCAtLjAwMDUsXG5cdFx0MC41LCAwLjM1NzUsIC0uMDAwNSxcblx0XHQtLjUsIDAuMzU3NSwgLS4wMDA1LFxuXHRcdC0uNSwgLS4zNTc1LCAtLjAwMDUsXG5cdFxuXHRcdC8vIFVWc1xuXHRcdC8qIC0tLS0tLS0tLS0tLS0tIGNhcmQgZmFjZSAtLS0tLS0tLS0tLS0tICovIC8qIC0tLS0tLS0tLS0tLS0gY2FyZCBiYWNrIC0tLS0tLS0tLS0tLS0tKi9cblx0XHQuNzU0LC45OTYsIC43NTQsLjgzNCwgLjk5NywuODM0LCAuOTk3LC45OTYsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbGliZXJhbCBwb2xpY3lcblx0XHQuNzU0LC44MjIsIC43NTQsLjY2MCwgLjk5NiwuNjYwLCAuOTk2LC44MjIsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gZmFzY2lzdCBwb2xpY3lcblx0XHQuNzQ2LC45OTYsIC41MDUsLjk5NiwgLjUwNSwuNjUwLCAuNzQ2LC42NTAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbGliZXJhbCByb2xlXG5cdFx0Ljc0NiwuNjQ1LCAuNTA1LC42NDUsIC41MDUsLjMwMCwgLjc0NiwuMzAwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGZhc2Npc3Qgcm9sZVxuXHRcdC45OTYsLjY0NSwgLjc1NCwuNjQ1LCAuNzU0LC4zMDAsIC45OTYsLjMwMCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBoaXRsZXIgcm9sZVxuXHRcdC40OTUsLjk5NiwgLjI1NSwuOTk2LCAuMjU1LC42NTAsIC40OTUsLjY1MCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBsaWJlcmFsIHBhcnR5XG5cdFx0LjQ5NSwuNjQ1LCAuMjU1LC42NDUsIC4yNTUsLjMwMCwgLjQ5NSwuMzAwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGZhc2Npc3QgcGFydHlcblx0XHQuMjQ0LC45OTIsIC4wMDUsLjk5MiwgLjAwNSwuNjUzLCAuMjQ0LC42NTMsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gamFcblx0XHQuMjQzLC42NDIsIC4wMDYsLjY0MiwgLjAwNiwuMzAyLCAuMjQzLC4zMDIsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbmVpblxuXHRcdC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBibGFua1xuXHRcdC4zOTcsLjI3NiwgLjM5NywuMDE1LCAuNzY1LC4wMTUsIC43NjUsLjI3NiwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBjcmVkaXRzXG5cdF07XG5cdFxuXHRsZXQgaW50RGF0YSA9IFtcblx0XHQvLyB0cmlhbmdsZSBpbmRleFxuXHRcdDAsMSwyLCAwLDIsMywgNCw3LDUsIDUsNyw2XG5cdF07XG5cdFxuXHQvLyB0d28gcG9zaXRpb24gc2V0cywgMTEgVVYgc2V0cywgMSBpbmRleCBzZXRcblx0bGV0IGdlb0J1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcig0KmZsb2F0RGF0YS5sZW5ndGggKyAyKmludERhdGEubGVuZ3RoKTtcblx0bGV0IHRlbXAgPSBuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgMCwgZmxvYXREYXRhLmxlbmd0aCk7XG5cdHRlbXAuc2V0KGZsb2F0RGF0YSk7XG5cdHRlbXAgPSBuZXcgVWludDE2QXJyYXkoZ2VvQnVmZmVyLCA0KmZsb2F0RGF0YS5sZW5ndGgsIGludERhdGEubGVuZ3RoKTtcblx0dGVtcC5zZXQoaW50RGF0YSk7XG5cdFxuXHQvLyBjaG9wIHVwIGJ1ZmZlciBpbnRvIHZlcnRleCBhdHRyaWJ1dGVzXG5cdGxldCBwb3NMZW5ndGggPSA4KjMsIHV2TGVuZ3RoID0gOCoyLCBpbmRleExlbmd0aCA9IDEyO1xuXHRsZXQgcG9zUG9ydHJhaXQgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCAwLCBwb3NMZW5ndGgpLCAzKSxcblx0XHRwb3NMYW5kc2NhcGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCA0KnBvc0xlbmd0aCwgcG9zTGVuZ3RoKSwgMyk7XG5cdGxldCB1dnMgPSBbXTtcblx0Zm9yKGxldCBpPTA7IGk8MTE7IGkrKyl7XG5cdFx0dXZzLnB1c2goIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDgqcG9zTGVuZ3RoICsgNCppKnV2TGVuZ3RoLCB1dkxlbmd0aCksIDIpICk7XG5cdH1cblx0bGV0IGluZGV4ID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgVWludDE2QXJyYXkoZ2VvQnVmZmVyLCA0KmZsb2F0RGF0YS5sZW5ndGgsIGluZGV4TGVuZ3RoKSwgMSk7XG5cdFxuXHRnZW9tZXRyeSA9IE9iamVjdC5rZXlzKFR5cGVzKS5tYXAoKGtleSwgaSkgPT5cblx0e1xuXHRcdGxldCBnZW8gPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcblx0XHRnZW8uYWRkQXR0cmlidXRlKCdwb3NpdGlvbicsIGk9PVR5cGVzLkpBIHx8IGk9PVR5cGVzLk5FSU4gPyBwb3NMYW5kc2NhcGUgOiBwb3NQb3J0cmFpdCk7XG5cdFx0Z2VvLmFkZEF0dHJpYnV0ZSgndXYnLCB1dnNbaV0pO1xuXHRcdGdlby5zZXRJbmRleChpbmRleCk7XG5cdFx0cmV0dXJuIGdlbztcblx0fSk7XG5cblx0bWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogQXNzZXRNYW5hZ2VyLmNhY2hlLnRleHR1cmVzLmNhcmRzfSk7XG59XG5cblxuY2xhc3MgQ2FyZCBleHRlbmRzIFRIUkVFLk1lc2hcbntcblx0Y29uc3RydWN0b3IodHlwZSA9IFR5cGVzLkJMQU5LKVxuXHR7XG5cdFx0aWYoIWdlb21ldHJ5IHx8ICFtYXRlcmlhbCkgaW5pdENhcmREYXRhKCk7XG5cblx0XHRsZXQgZ2VvID0gZ2VvbWV0cnlbdHlwZV07XG5cdFx0c3VwZXIoZ2VvLCBtYXRlcmlhbCk7XG5cdFx0dGhpcy5zY2FsZS5zZXRTY2FsYXIoMC43KTtcblx0fVxufVxuXG5jbGFzcyBCbGFua0NhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXsgc3VwZXIoKTsgfVxufVxuXG5jbGFzcyBDcmVkaXRzQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLkNSRURJVFMpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGUgPT4gdGhpcy52aXNpYmxlID0gZS5kYXRhLmdhbWUuc3RhdGUgPT09ICdzZXR1cCcpO1xuXHR9XG59XG5cbmNsYXNzIExpYmVyYWxQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0xJQkVSQUwsIGZhbHNlKTtcblx0fVxuXHRnb1RvUG9zaXRpb24oc3BvdCA9IDApXG5cdHtcblx0XHRzcG90ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oNCwgc3BvdCkpO1xuXHRcdGxldCBzID0gTGliZXJhbFBvbGljeUNhcmQuc3BvdHM7XG5cdFx0QW5pbWF0ZS5zdGFydCh0aGlzLCB7cGFyZW50OiBBc3NldE1hbmFnZXIucm9vdCwgcG9zOiBzWydwb3NfJytzcG90XSwgcXVhdDogcy5xdWF0LCBzY2FsZTogcy5zY2FsZX0pO1xuXHR9XG59XG5cbkxpYmVyYWxQb2xpY3lDYXJkLnNwb3RzID0ge1xuXHRwb3NfMDogbmV3IFRIUkVFLlZlY3RvcjMoMC42OSwgMC4wMDEsIC0wLjQyKSxcblx0cG9zXzE6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMzQ1LCAwLjAwMSwgLTAuNDIpLFxuXHRwb3NfMjogbmV3IFRIUkVFLlZlY3RvcjMoMC4wMDIsIDAuMDAxLCAtMC40MiksXG5cdHBvc18zOiBuZXcgVEhSRUUuVmVjdG9yMygtLjM0LCAwLjAwMSwgLTAuNDIpLFxuXHRwb3NfNDogbmV3IFRIUkVFLlZlY3RvcjMoLS42OSwgMC4wMDEsIC0wLjQyKSxcblx0cXVhdDogbmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMC43MDcxMDY3ODExODY1NDc1LCAwLjcwNzEwNjc4MTE4NjU0NzUsIDApLFxuXHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMC40LCAwLjQsIDAuNClcbn1cblxuY2xhc3MgRmFzY2lzdFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfRkFTQ0lTVCk7XG5cdH1cblx0Z29Ub1Bvc2l0aW9uKHNwb3QgPSAwKVxuXHR7XG5cdFx0c3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDUsIHNwb3QpKTtcblx0XHRsZXQgcyA9IEZhc2Npc3RQb2xpY3lDYXJkLnNwb3RzO1xuXHRcdEFuaW1hdGUuc3RhcnQodGhpcywge3BhcmVudDogQXNzZXRNYW5hZ2VyLnJvb3QsIHBvczogc1sncG9zXycrc3BvdF0sIHF1YXQ6IHMucXVhdCwgc2NhbGU6IHMuc2NhbGV9KTtcblx0fVxufVxuXG5GYXNjaXN0UG9saWN5Q2FyZC5zcG90cyA9IHtcblx0cG9zXzA6IG5ldyBUSFJFRS5WZWN0b3IzKC0uODYsIDAuMDAxLCAuNDI1KSxcblx0cG9zXzE6IG5ldyBUSFJFRS5WZWN0b3IzKC0uNTE1LCAwLjAwMSwgLjQyNSksXG5cdHBvc18yOiBuZXcgVEhSRUUuVmVjdG9yMygtLjE3LCAwLjAwMSwgLjQyNSksXG5cdHBvc18zOiBuZXcgVEhSRUUuVmVjdG9yMygwLjE3LCAwLjAwMSwgLjQyNSksXG5cdHBvc180OiBuZXcgVEhSRUUuVmVjdG9yMyguNTE4LCAwLjAwMSwgLjQyNSksXG5cdHBvc181OiBuZXcgVEhSRUUuVmVjdG9yMygwLjg3LCAwLjAwMSwgLjQyNSksXG5cdHF1YXQ6IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKC0wLjcwNzEwNjc4MTE4NjU0NzUsIDAsIDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSksXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjQsIDAuNCwgMC40KVxufVxuXG5jbGFzcyBMaWJlcmFsUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5ST0xFX0xJQkVSQUwpO1xuXHR9XG59XG5cbmNsYXNzIEZhc2Npc3RSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfRkFTQ0lTVCk7XG5cdH1cbn1cblxuY2xhc3MgSGl0bGVyUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5ST0xFX0hJVExFUik7XG5cdH1cbn1cblxuY2xhc3MgTGliZXJhbFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0xJQkVSQUwpO1xuXHR9XG59XG5cbmNsYXNzIEZhc2Npc3RQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9GQVNDSVNUKTtcblx0fVxufVxuXG5jbGFzcyBKYUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5KQSk7XG5cdH1cbn1cblxuY2xhc3MgTmVpbkNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5ORUlOKTtcblx0fVxufVxuXG5cbmV4cG9ydCB7XG5cdENhcmQsIFR5cGVzLCBCbGFua0NhcmQsIENyZWRpdHNDYXJkLFxuXHRMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFJvbGVDYXJkLFxuXHRIaXRsZXJSb2xlQ2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZFxufTtcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmxldCBwbGFjZWhvbGRlckdlbyA9IG5ldyBUSFJFRS5Cb3hCdWZmZXJHZW9tZXRyeSguMDAxLCAuMDAxLCAuMDAxKTtcclxubGV0IHBsYWNlaG9sZGVyTWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHhmZmZmZmYsIHZpc2libGU6IGZhbHNlfSk7XHJcbmxldCBQbGFjZWhvbGRlck1lc2ggPSBuZXcgVEhSRUUuTWVzaChwbGFjZWhvbGRlckdlbywgcGxhY2Vob2xkZXJNYXQpO1xyXG5cclxuY2xhc3MgTmF0aXZlQ29tcG9uZW50XHJcbntcclxuXHRjb25zdHJ1Y3RvcihtZXNoLCBuZWVkc1VwZGF0ZSlcclxuXHR7XHJcblx0XHR0aGlzLm1lc2ggPSBtZXNoO1xyXG5cdFx0YWx0c3BhY2UuYWRkTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lKTtcclxuXHJcblx0XHRpZihuZWVkc1VwZGF0ZSlcclxuXHRcdFx0dGhpcy51cGRhdGUoKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZShmaWVsZHMgPSB7fSlcclxuXHR7XHJcblx0XHRPYmplY3QuYXNzaWduKHRoaXMuZGF0YSwgZmllbGRzKTtcclxuXHRcdGFsdHNwYWNlLnVwZGF0ZU5hdGl2ZUNvbXBvbmVudCh0aGlzLm1lc2gsIHRoaXMubmFtZSwgdGhpcy5kYXRhKTtcclxuXHR9XHJcblxyXG5cdGRlc3Ryb3koKVxyXG5cdHtcclxuXHRcdGFsdHNwYWNlLnJlbW92ZU5hdGl2ZUNvbXBvbmVudCh0aGlzLm1lc2gsIHRoaXMubmFtZSk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBOVGV4dCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XHJcblx0Y29uc3RydWN0b3IobWVzaCl7XHJcblx0XHR0aGlzLm5hbWUgPSAnbi10ZXh0JztcclxuXHRcdHRoaXMuZGF0YSA9IHtcclxuXHRcdFx0Zm9udFNpemU6IDEwLFxyXG5cdFx0XHRoZWlnaHQ6IDEsXHJcblx0XHRcdHdpZHRoOiAxMCxcclxuXHRcdFx0dmVydGljYWxBbGlnbjogJ21pZGRsZScsXHJcblx0XHRcdGhvcml6b250YWxBbGlnbjogJ21pZGRsZScsXHJcblx0XHRcdHRleHQ6ICcnXHJcblx0XHR9O1xyXG5cdFx0c3VwZXIobWVzaCwgdHJ1ZSk7XHJcblxyXG5cdFx0dGhpcy5jb2xvciA9ICdibGFjayc7XHJcblx0fVxyXG5cdHVwZGF0ZShmaWVsZHMgPSB7fSl7XHJcblx0XHRpZihmaWVsZHMudGV4dClcclxuXHRcdFx0ZmllbGRzLnRleHQgPSBgPGNvbG9yPSR7dGhpcy5jb2xvcn0+JHtmaWVsZHMudGV4dH08L2NvbG9yPmA7XHJcblx0XHROYXRpdmVDb21wb25lbnQucHJvdG90eXBlLnVwZGF0ZS5jYWxsKHRoaXMsIGZpZWxkcyk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBOU2tlbGV0b25QYXJlbnQgZXh0ZW5kcyBOYXRpdmVDb21wb25lbnQge1xyXG5cdGNvbnN0cnVjdG9yKG1lc2gpe1xyXG5cdFx0dGhpcy5uYW1lID0gJ24tc2tlbGV0b24tcGFyZW50JztcclxuXHRcdHRoaXMuZGF0YSA9IHtcclxuXHRcdFx0aW5kZXg6IDAsXHJcblx0XHRcdHBhcnQ6ICdoZWFkJyxcclxuXHRcdFx0c2lkZTogJ2NlbnRlcicsIFxyXG5cdFx0XHR1c2VySWQ6IDBcclxuXHRcdH07XHJcblx0XHRzdXBlcihtZXNoLCB0cnVlKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5CaWxsYm9hcmQgZXh0ZW5kcyBOYXRpdmVDb21wb25lbnQge1xyXG5cdGNvbnN0cnVjdG9yKG1lc2gpe1xyXG5cdFx0dGhpcy5uYW1lID0gJ24tYmlsbGJvYXJkJztcclxuXHRcdHN1cGVyKG1lc2gsIGZhbHNlKTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7UGxhY2Vob2xkZXJNZXNoLCBOVGV4dCwgTlNrZWxldG9uUGFyZW50LCBOQmlsbGJvYXJkfTsiLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtOU2tlbGV0b25QYXJlbnR9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XG5cbmNsYXNzIEhhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKG1vZGVsKVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmN1cnJlbnRJZCA9ICcnO1xuXHRcdHRoaXMuY29tcG9uZW50cyA9IHtoYXQ6IG51bGwsIHRleHQ6IG51bGx9O1xuXG5cdFx0aWYobW9kZWwucGFyZW50KVxuXHRcdFx0bW9kZWwucGFyZW50LnJlbW92ZShtb2RlbCk7XG5cdFx0bW9kZWwudXBkYXRlTWF0cml4V29ybGQodHJ1ZSk7XG5cblx0XHQvLyBncmFiIG1lc2hlc1xuXHRcdGxldCBwcm9wID0gJyc7XG5cdFx0bW9kZWwudHJhdmVyc2Uob2JqID0+IHtcblx0XHRcdGlmKG9iai5uYW1lID09PSAnaGF0JyB8fCBvYmoubmFtZSA9PT0gJ3RleHQnKVxuXHRcdFx0XHRwcm9wID0gb2JqLm5hbWU7XG5cdFx0XHRlbHNlIGlmKG9iaiBpbnN0YW5jZW9mIFRIUkVFLk1lc2gpXG5cdFx0XHRcdHRoaXNbcHJvcF0gPSBvYmo7XG5cdFx0fSk7XG5cblx0XHQvLyBzdHJpcCBvdXQgbWlkZGxlIG5vZGVzXG5cdFx0dGhpcy5oYXQubWF0cml4LmNvcHkodGhpcy5oYXQubWF0cml4V29ybGQpO1xuXHRcdHRoaXMuaGF0Lm1hdHJpeC5kZWNvbXBvc2UodGhpcy5oYXQucG9zaXRpb24sIHRoaXMuaGF0LnF1YXRlcm5pb24sIHRoaXMuaGF0LnNjYWxlKTtcblx0XHR0aGlzLmFkZCh0aGlzLmhhdCk7XG5cblx0XHR0aGlzLnRleHQubWF0cml4LmNvcHkodGhpcy50ZXh0Lm1hdHJpeFdvcmxkKTtcblx0XHR0aGlzLnRleHQubWF0cml4LmRlY29tcG9zZSh0aGlzLnRleHQucG9zaXRpb24sIHRoaXMudGV4dC5xdWF0ZXJuaW9uLCB0aGlzLnRleHQuc2NhbGUpO1xuXHRcdHRoaXMuYWRkKHRoaXMudGV4dCk7XG5cblx0XHRkLnNjZW5lLmFkZCh0aGlzKTtcblx0fVxuXG5cdHNldE93bmVyKHVzZXJJZClcblx0e1xuXHRcdGlmKCF0aGlzLmN1cnJlbnRJZCAmJiB1c2VySWQpe1xuXHRcdFx0ZC5zY2VuZS5hZGQodGhpcyk7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHMuaGF0ID0gbmV3IE5Ta2VsZXRvblBhcmVudCh0aGlzLmhhdCk7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHMudGV4dCA9IG5ldyBOU2tlbGV0b25QYXJlbnQodGhpcy50ZXh0KTtcblx0XHR9XG5cdFx0ZWxzZSBpZih0aGlzLmN1cnJlbnRJZCAmJiAhdXNlcklkKXtcblx0XHRcdHRoaXMuY29tcG9uZW50cy5oYXQuZGVzdHJveSgpO1xuXHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQuZGVzdHJveSgpO1xuXHRcdFx0ZC5zY2VuZS5yZW1vdmUodGhpcyk7XG5cdFx0fVxuXG5cdFx0aWYodXNlcklkKXtcblx0XHRcdHRoaXMuY29tcG9uZW50cy5oYXQudXBkYXRlKHt1c2VySWR9KTtcblx0XHRcdHRoaXMuY29tcG9uZW50cy50ZXh0LnVwZGF0ZSh7dXNlcklkfSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5jdXJyZW50SWQgPSB1c2VySWQ7XG5cdH1cbn1cblxuY2xhc3MgUHJlc2lkZW50SGF0IGV4dGVuZHMgSGF0XG57XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLnRvcGhhdCk7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4xNDQvU0guZW52LnBpeGVsc1Blck1ldGVyLCAuMDM4L1NILmVudi5waXhlbHNQZXJNZXRlcik7XG5cdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigxLjIvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHRcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGFzdFByZXNpZGVudCcsIGUgPT4ge1xuXHRcdFx0dGhpcy5zZXRPd25lcihlLmRhdGEuZ2FtZS5sYXN0UHJlc2lkZW50KTtcblx0XHR9KTtcblx0fVxufTtcblxuY2xhc3MgQ2hhbmNlbGxvckhhdCBleHRlbmRzIEhhdFxue1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKEFNLmNhY2hlLm1vZGVscy52aXNvcmNhcCk7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4wNy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHR0aGlzLnNjYWxlLm11bHRpcGx5U2NhbGFyKDEuMi9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xuXHRcdFxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9sYXN0Q2hhbmNlbGxvcicsIGUgPT4ge1xuXHRcdFx0dGhpcy5zZXRPd25lcihlLmRhdGEuZ2FtZS5sYXN0Q2hhbmNlbGxvcik7XG5cdFx0fSk7XG5cdH1cbn1cblxuZXhwb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmR9IGZyb20gJy4vY2FyZCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVUYWJsZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyB0YWJsZSBzdGF0ZVxuXHRcdHRoaXMubGliZXJhbENhcmRzID0gMDtcblx0XHR0aGlzLmZhc2Npc3RDYXJkcyA9IDA7XG5cdFx0dGhpcy5mYWlsZWRWb3RlcyA9IDA7XG5cdFx0dGhpcy5jYXJkcyA9IFtdO1xuXG5cdFx0Ly8gYWRkIHRhYmxlIGFzc2V0XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50YWJsZTtcblx0XHR0aGlzLm1vZGVsLnNjYWxlLnNldFNjYWxhcigxLjI1KTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblxuXHRcdC8vIHNhdmUgcmVmZXJlbmNlcyB0byB0aGUgdGV4dHVyZXNcblx0XHR0aGlzLnRleHR1cmVzID0gW1xuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfc21hbGwsXG5cdFx0XHRBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9tZWQsXG5cdFx0XHRBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9sYXJnZVxuXHRcdF07XG5cdFx0dGhpcy50ZXh0dXJlcy5mb3JFYWNoKHRleCA9PiB0ZXguZmxpcFkgPSBmYWxzZSk7XG5cdFx0dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbMF0sIHRydWUpO1xuXHRcdFxuXHRcdC8vIHBvc2l0aW9uIHRhYmxlXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC44LCAwKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLmNoYW5nZU1vZGUuYmluZCh0aGlzKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2xpYmVyYWxQb2xpY2llcycsIHRoaXMudXBkYXRlUG9saWNpZXMuYmluZCh0aGlzKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX2Zhc2Npc3RQb2xpY2llcycsIHRoaXMudXBkYXRlUG9saWNpZXMuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRjaGFuZ2VNb2RlKHtkYXRhOiB7Z2FtZToge3N0YXRlLCB0dXJuT3JkZXJ9fX0pXG5cdHtcblx0XHRpZihzdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHRpZih0dXJuT3JkZXIubGVuZ3RoID49IDkpXG5cdFx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzJdKTtcblx0XHRcdGVsc2UgaWYodHVybk9yZGVyLmxlbmd0aCA+PSA3KVxuXHRcdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1sxXSk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzBdKTtcblx0XHR9XG5cdH1cblxuXHRzZXRUZXh0dXJlKG5ld1RleCwgc3dpdGNoTGlnaHRtYXApXG5cdHtcblx0XHR0aGlzLm1vZGVsLnRyYXZlcnNlKG8gPT4ge1xuXHRcdFx0aWYobyBpbnN0YW5jZW9mIFRIUkVFLk1lc2gpXG5cdFx0XHR7XG5cdFx0XHRcdGlmKHN3aXRjaExpZ2h0bWFwKVxuXHRcdFx0XHRcdG8ubWF0ZXJpYWwubGlnaHRNYXAgPSBvLm1hdGVyaWFsLm1hcDtcblxuXHRcdFx0XHRvLm1hdGVyaWFsLm1hcCA9IG5ld1RleDtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdHVwZGF0ZVBvbGljaWVzKHtkYXRhOiB7Z2FtZToge2xpYmVyYWxQb2xpY2llcywgZmFzY2lzdFBvbGljaWVzfX19KVxuXHR7XG5cdFx0Zm9yKHZhciBpPXRoaXMubGliZXJhbENhcmRzOyBpPGxpYmVyYWxQb2xpY2llczsgaSsrKXtcblx0XHRcdGxldCBjYXJkID0gbmV3IExpYmVyYWxQb2xpY3lDYXJkKCk7XG5cdFx0XHR0aGlzLmNhcmRzLnB1c2goY2FyZCk7XG5cdFx0XHR0aGlzLmFkZChjYXJkKTtcblx0XHRcdGNhcmQuZ29Ub1Bvc2l0aW9uKGkpO1xuXHRcdH1cblx0XHR0aGlzLmxpYmVyYWxDYXJkcyA9IGxpYmVyYWxQb2xpY2llcztcblxuXHRcdGZvcih2YXIgaT10aGlzLmZhc2Npc3RDYXJkczsgaTxmYXNjaXN0UG9saWNpZXM7IGkrKyl7XG5cdFx0XHRsZXQgY2FyZCA9IG5ldyBGYXNjaXN0UG9saWN5Q2FyZCgpO1xuXHRcdFx0dGhpcy5jYXJkcy5wdXNoKGNhcmQpO1xuXHRcdFx0dGhpcy5hZGQoY2FyZCk7XG5cdFx0XHRjYXJkLmdvVG9Qb3NpdGlvbihpKTtcblx0XHR9XG5cdFx0dGhpcy5mYXNjaXN0Q2FyZHMgPSBmYXNjaXN0UG9saWNpZXM7XG5cblx0XHRpZihsaWJlcmFsUG9saWNpZXMgPT09IDAgJiYgZmFzY2lzdFBvbGljaWVzID09PSAwKXtcblx0XHRcdHRoaXMuY2FyZHMuZm9yRWFjaChjID0+IHRoaXMucmVtb3ZlKGMpKTtcblx0XHR9XG5cdH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbmZ1bmN0aW9uIGdldEdhbWVJZCgpXG57XG5cdC8vIGZpcnN0IGNoZWNrIHRoZSB1cmxcblx0bGV0IHJlID0gL1s/Jl1nYW1lSWQ9KFteJl0rKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcblx0aWYocmUpe1xuXHRcdHJldHVybiByZVsxXTtcblx0fVxuXHRlbHNlIGlmKGFsdHNwYWNlICYmIGFsdHNwYWNlLmluQ2xpZW50KXtcblx0XHRyZXR1cm4gU0guZW52LnNpZDtcblx0fVxuXHRlbHNlIHtcblx0XHRsZXQgaWQgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogMTAwMDAwMDAwICk7XG5cdFx0d2luZG93LmxvY2F0aW9uLnJlcGxhY2UoJz9nYW1lSWQ9JytpZCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gcGFyc2VDU1Yoc3RyKXtcblx0aWYoIXN0cikgcmV0dXJuIFtdO1xuXHRlbHNlIHJldHVybiBzdHIuc3BsaXQoJywnKTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVRdWVzdGlvbih0ZXh0LCB0ZXh0dXJlID0gbnVsbClcbntcblx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xuXG5cdC8vIHNldCB1cCBjYW52YXNcblx0bGV0IGJtcDtcblx0aWYoIXRleHR1cmUpe1xuXHRcdGJtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdGJtcC53aWR0aCA9IDUxMjtcblx0XHRibXAuaGVpZ2h0ID0gMjU2O1xuXHR9XG5cdGVsc2Uge1xuXHRcdGJtcCA9IHRleHR1cmUuaW1hZ2U7XG5cdH1cblxuXHRsZXQgZyA9IGJtcC5nZXRDb250ZXh0KCcyZCcpO1xuXHRnLmNsZWFyUmVjdCgwLCAwLCA1MTIsIDI1Nik7XG5cdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cdGcuZmlsbFN0eWxlID0gJ2JsYWNrJztcblxuXHQvLyB3cml0ZSB0ZXh0XG5cdGcuZm9udCA9ICdib2xkIDUwcHggJytmb250U3RhY2s7XG5cdGxldCBsaW5lcyA9IHRleHQuc3BsaXQoJ1xcbicpO1xuXHRmb3IobGV0IGk9MDsgaTxsaW5lcy5sZW5ndGg7IGkrKyl7XG5cdFx0Zy5maWxsVGV4dChsaW5lc1tpXSwgMjU2LCA1MCs1NSppKTtcblx0fVxuXG5cdGlmKHRleHR1cmUpe1xuXHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xuXHRcdHJldHVybiB0ZXh0dXJlO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHJldHVybiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZShibXApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIG1lcmdlT2JqZWN0cyhhLCBiLCBkZXB0aD0yKVxue1xuXHRmdW5jdGlvbiB1bmlxdWUoZSwgaSwgYSl7XG5cdFx0cmV0dXJuIGEuaW5kZXhPZihlKSA9PT0gaTtcblx0fVxuXG5cdGxldCBhSXNPYmogPSBhIGluc3RhbmNlb2YgT2JqZWN0LCBiSXNPYmogPSBiIGluc3RhbmNlb2YgT2JqZWN0O1xuXHRpZihhSXNPYmogJiYgYklzT2JqICYmIGRlcHRoID4gMClcblx0e1xuXHRcdGxldCByZXN1bHQgPSB7fTtcblx0XHRsZXQga2V5cyA9IFsuLi5PYmplY3Qua2V5cyhhKSwgLi4uT2JqZWN0LmtleXMoYildLmZpbHRlcih1bmlxdWUpO1xuXHRcdGZvcihsZXQgaT0wOyBpPGtleXMubGVuZ3RoOyBpKyspe1xuXHRcdFx0cmVzdWx0W2tleXNbaV1dID0gbWVyZ2VPYmplY3RzKGFba2V5c1tpXV0sIGJba2V5c1tpXV0sIGRlcHRoLTEpO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cdGVsc2UgaWYoYiAhPT0gdW5kZWZpbmVkKVxuXHRcdHJldHVybiBiO1xuXHRlbHNlXG5cdFx0cmV0dXJuIGE7XG59XG5cbmZ1bmN0aW9uIGxhdGVVcGRhdGUoZm4pXG57XG5cdHJldHVybiAoLi4uYXJncykgPT4ge1xuXHRcdHNldFRpbWVvdXQoKCkgPT4gZm4oLi4uYXJncyksIDE1KTtcblx0fTtcbn1cblxuZXhwb3J0IHsgZ2V0R2FtZUlkLCBwYXJzZUNTViwgZ2VuZXJhdGVRdWVzdGlvbiwgbWVyZ2VPYmplY3RzLCBsYXRlVXBkYXRlIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBOYW1lcGxhdGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcihzZWF0KVxuXHR7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLTAuNjM1LCAwLjIyKTtcblx0XHRzZWF0LmFkZCh0aGlzKTtcblxuXHRcdC8vIGFkZCAzZCBtb2RlbFxuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMubmFtZXBsYXRlLmNoaWxkcmVuWzBdLmNsb25lKCk7XG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgTWF0aC5QSS8yKTtcblx0XHR0aGlzLm1vZGVsLnNjYWxlLnNldFNjYWxhcigxLjI1KTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblxuXHRcdC8vIGdlbmVyYXRlIG1hdGVyaWFsXG5cdFx0dGhpcy5ibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHR0aGlzLmJtcC53aWR0aCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZTtcblx0XHR0aGlzLmJtcC5oZWlnaHQgPSBOYW1lcGxhdGUudGV4dHVyZVNpemUgLyAyO1xuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuXHRcdFx0bWFwOiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZSh0aGlzLmJtcClcblx0XHR9KTtcblxuXHRcdC8vIGNyZWF0ZSBsaXN0ZW5lciBwcm94aWVzXG5cdFx0dGhpcy5faG92ZXJCZWhhdmlvciA9IG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLkhvdmVyQ29sb3Ioe1xuXHRcdFx0Y29sb3I6IG5ldyBUSFJFRS5Db2xvcigweGZmYThhOClcblx0XHR9KTtcblx0XHR0aGlzLm1vZGVsLmFkZEJlaGF2aW9yKHRoaXMuX2hvdmVyQmVoYXZpb3IpO1xuXHRcdHRoaXMubW9kZWwuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLmNsaWNrLmJpbmQodGhpcykpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgKHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KSA9PiB7XG5cdFx0XHRpZihzdGF0ZSA9PT0gJ3NldHVwJylcblx0XHRcdFx0dGhpcy5tb2RlbC5hZGRCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0dGhpcy5tb2RlbC5yZW1vdmVCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcblx0XHR9KTtcblx0fVxuXG5cdHVwZGF0ZVRleHQodGV4dClcblx0e1xuXHRcdGxldCBmb250U2l6ZSA9IDcvMzIgKiBOYW1lcGxhdGUudGV4dHVyZVNpemUgKiAwLjY1O1xuXG5cdFx0Ly8gc2V0IHVwIGNhbnZhc1xuXHRcdGxldCBnID0gdGhpcy5ibXAuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XG5cdFx0Zy5maWxsU3R5bGUgPSAnIzIyMic7XG5cdFx0Zy5maWxsUmVjdCgwLCAwLCBOYW1lcGxhdGUudGV4dHVyZVNpemUsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yKTtcblx0XHRnLmZvbnQgPSBgYm9sZCAke2ZvbnRTaXplfXB4ICR7Zm9udFN0YWNrfWA7XG5cdFx0Zy50ZXh0QWxpZ24gPSAnY2VudGVyJztcblx0XHRnLmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG5cdFx0Zy5maWxsVGV4dCh0ZXh0LCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMiwgKDAuNDIgLSAwLjEyKSooTmFtZXBsYXRlLnRleHR1cmVTaXplLzIpKTtcblxuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwubWFwLm5lZWRzVXBkYXRlID0gdHJ1ZTtcblx0fVxuXG5cblxuXHRjbGljayhlKVxuXHR7XG5cdFx0aWYoU0guZ2FtZS5zdGF0ZSAhPT0gJ3NldHVwJykgcmV0dXJuO1xuXG5cdFx0aWYoIXRoaXMuc2VhdC5vd25lcilcblx0XHRcdHRoaXMucmVxdWVzdEpvaW4oKTtcblx0XHRlbHNlIGlmKHRoaXMuc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxuXHRcdFx0dGhpcy5yZXF1ZXN0TGVhdmUoKTtcblx0XHRlbHNlIGlmKFNILmdhbWUudHVybk9yZGVyLmluY2x1ZGVzKFNILmxvY2FsVXNlci5pZCkpXG5cdFx0XHR0aGlzLnJlcXVlc3RLaWNrKCk7XG5cdH1cblxuXHRyZXF1ZXN0Sm9pbigpXG5cdHtcblx0XHRTSC5zb2NrZXQuZW1pdCgnam9pbicsIE9iamVjdC5hc3NpZ24oe3NlYXROdW06IHRoaXMuc2VhdC5zZWF0TnVtfSwgU0gubG9jYWxVc2VyKSk7XG5cdH1cblxuXHRyZXF1ZXN0TGVhdmUoKVxuXHR7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXHRcdGlmKCFzZWxmLnF1ZXN0aW9uKVxuXHRcdHtcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWxmLnNlYXQuYmFsbG90LmFza1F1ZXN0aW9uKCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byBsZWF2ZT8nLCAnbG9jYWxfbGVhdmUnKVxuXHRcdFx0LnRoZW4oY29uZmlybSA9PiB7XG5cdFx0XHRcdGlmKGNvbmZpcm0pe1xuXHRcdFx0XHRcdFNILnNvY2tldC5lbWl0KCdsZWF2ZScsIFNILmxvY2FsVXNlci5pZCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xuXHRcdH1cblx0fVxuXG5cdHJlcXVlc3RLaWNrKClcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblx0XHRpZighc2VsZi5xdWVzdGlvbilcblx0XHR7XG5cdFx0XHRsZXQgc2VhdCA9IFNILnNlYXRzW1NILnBsYXllcnNbU0gubG9jYWxVc2VyLmlkXS5zZWF0TnVtXTtcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWF0LmJhbGxvdC5hc2tRdWVzdGlvbihcblx0XHRcdFx0J0FyZSB5b3Ugc3VyZSB5b3VcXG53YW50IHRvIHRyeSB0byBraWNrXFxuJ1xuXHRcdFx0XHQrU0gucGxheWVyc1tzZWxmLnNlYXQub3duZXJdLmRpc3BsYXlOYW1lLFxuXHRcdFx0XHQnbG9jYWxfa2ljaydcblx0XHRcdClcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xuXHRcdFx0XHRpZihjb25maXJtKXtcblx0XHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgna2ljaycsIFNILmxvY2FsVXNlci5pZCwgc2VsZi5zZWF0Lm93bmVyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uID0gbnVsbDtcblx0XHRcdH0pXG5cdFx0XHQuY2F0Y2goKCkgPT4geyBzZWxmLnF1ZXN0aW9uID0gbnVsbDsgfSk7XG5cdFx0fVxuXHR9XG59XG5cbk5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSA9IDI1NjtcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcbmltcG9ydCAqIGFzIEJhbGxvdFR5cGUgZnJvbSAnLi9iYWxsb3QnO1xyXG5cclxuZnVuY3Rpb24gdXBkYXRlVm90ZXNJblByb2dyZXNzKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcclxue1xyXG5cdGxldCBiYWxsb3QgPSB0aGlzO1xyXG5cdGlmKCFiYWxsb3Quc2VhdC5vd25lcikgcmV0dXJuO1xyXG5cclxuXHRsZXQgdmlwcyA9IGdhbWUudm90ZXNJblByb2dyZXNzO1xyXG5cdGxldCBibGFja2xpc3RlZFZvdGVzID0gdmlwcy5maWx0ZXIoaWQgPT4ge1xyXG5cdFx0bGV0IHZzID0gWy4uLnZvdGVzW2lkXS55ZXNWb3RlcnMsIC4uLnZvdGVzW2lkXS5ub1ZvdGVyc107XHJcblx0XHRsZXQgbnYgPSB2b3Rlc1tpZF0ubm9uVm90ZXJzO1xyXG5cdFx0cmV0dXJuIG52LmluY2x1ZGVzKGJhbGxvdC5zZWF0Lm93bmVyKSB8fCB2cy5pbmNsdWRlcyhiYWxsb3Quc2VhdC5vd25lcik7XHJcblx0fSk7XHJcblx0bGV0IG5ld1ZvdGVzID0gdmlwcy5maWx0ZXIoXHJcblx0XHRpZCA9PiAoIVNILmdhbWUudm90ZXNJblByb2dyZXNzIHx8ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcy5pbmNsdWRlcyhpZCkpICYmICFibGFja2xpc3RlZFZvdGVzLmluY2x1ZGVzKGlkKVxyXG5cdCk7XHJcblx0bGV0IGZpbmlzaGVkVm90ZXMgPSAhU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MgPyBibGFja2xpc3RlZFZvdGVzXHJcblx0XHQ6IFNILmdhbWUudm90ZXNJblByb2dyZXNzLmZpbHRlcihpZCA9PiAhdmlwcy5pbmNsdWRlcyhpZCkpLmNvbmNhdChibGFja2xpc3RlZFZvdGVzKTtcclxuXHJcblx0bmV3Vm90ZXMuZm9yRWFjaCh2SWQgPT5cclxuXHR7XHJcblx0XHQvLyBnZW5lcmF0ZSBuZXcgcXVlc3Rpb24gdG8gYXNrXHJcblx0XHRsZXQgcXVlc3Rpb25UZXh0LCBvcHRzID0ge307XHJcblx0XHRpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdlbGVjdCcpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSBwbGF5ZXJzW2dhbWUucHJlc2lkZW50XS5kaXNwbGF5TmFtZVxyXG5cdFx0XHRcdCsgJyBmb3IgcHJlc2lkZW50IGFuZCAnXHJcblx0XHRcdFx0KyBwbGF5ZXJzW2dhbWUuY2hhbmNlbGxvcl0uZGlzcGxheU5hbWVcclxuXHRcdFx0XHQrICcgZm9yIGNoYW5jZWxsb3I/JztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAnam9pbicpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSB2b3Rlc1t2SWRdLmRhdGEgKyAnXFxudG8gam9pbj8nO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdraWNrJyl7XHJcblx0XHRcdHF1ZXN0aW9uVGV4dCA9ICdWb3RlIHRvIGtpY2tcXG4nXHJcblx0XHRcdFx0KyBwbGF5ZXJzW3ZvdGVzW3ZJZF0udGFyZ2V0MV0uZGlzcGxheU5hbWVcclxuXHRcdFx0XHQrICc/JztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAnY29uZmlybVJvbGUnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBTSC5sb2NhbFVzZXIuaWQpXHJcblx0XHR7XHJcblx0XHRcdG9wdHMgPSB7Y2hvaWNlczogQmFsbG90VHlwZS5DT05GSVJNfTtcclxuXHRcdFx0bGV0IHJvbGUgPSBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0ucm9sZTtcclxuXHRcdFx0cm9sZSA9IHJvbGUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyByb2xlLnNsaWNlKDEpO1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSAnWW91ciByb2xlOlxcbicgKyByb2xlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHF1ZXN0aW9uVGV4dClcclxuXHRcdHtcclxuXHRcdFx0YmFsbG90LmFza1F1ZXN0aW9uKHF1ZXN0aW9uVGV4dCwgdklkLCBvcHRzKVxyXG5cdFx0XHQudGhlbihhbnN3ZXIgPT4ge1xyXG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCd2b3RlJywgdklkLCBTSC5sb2NhbFVzZXIuaWQsIGFuc3dlcik7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5jYXRjaCgoKSA9PiBjb25zb2xlLmxvZygnVm90ZSBzY3J1YmJlZDonLCB2SWQpKTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0aWYoZmluaXNoZWRWb3Rlcy5pbmNsdWRlcyhiYWxsb3QuZGlzcGxheWVkKSl7XHJcblx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlU3RhdGUoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXHJcbntcclxuXHRsZXQgYmFsbG90ID0gdGhpcztcclxuXHJcblx0ZnVuY3Rpb24gY2hvb3NlQ2hhbmNlbGxvcigpXHJcblx0e1xyXG5cdFx0cmV0dXJuIGJhbGxvdC5hc2tRdWVzdGlvbignQ2hvb3NlIHlvdXJcXG5jaGFuY2VsbG9yIScsICdsb2NhbF9ub21pbmF0ZScsIHtjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVH0pXHJcblx0XHQudGhlbihjb25maXJtQ2hhbmNlbGxvcik7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBjb25maXJtQ2hhbmNlbGxvcih1c2VySWQpXHJcblx0e1xyXG5cdFx0bGV0IHVzZXJuYW1lID0gU0gucGxheWVyc1t1c2VySWRdLmRpc3BsYXlOYW1lO1xyXG5cdFx0bGV0IHRleHQgPSBgTmFtZSAke3VzZXJuYW1lfVxcbmFzIGNoYW5jZWxsb3I/YDtcclxuXHRcdHJldHVybiBiYWxsb3QuYXNrUXVlc3Rpb24odGV4dCwgJ2xvY2FsX25vbWluYXRlX2NvbmZpcm0nKVxyXG5cdFx0LnRoZW4oY29uZmlybWVkID0+IHtcclxuXHRcdFx0aWYoY29uZmlybWVkKXtcclxuXHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHVzZXJJZCk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0cmV0dXJuIGNob29zZUNoYW5jZWxsb3IoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBoaWRlTm9taW5hdGVQbGFjZWhvbGRlcih7ZGF0YToge2dhbWV9fSlcclxuXHR7XHJcblx0XHRpZihnYW1lLnN0YXRlICE9PSAnbm9taW5hdGUnICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICd3YWl0X2Zvcl9jaGFuY2VsbG9yJyl7XHJcblx0XHRcdGJhbGxvdC5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnY2FuY2VsVm90ZScsIGJ1YmJsZXM6IGZhbHNlfSk7XHJcblx0XHR9XHJcblx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlTm9taW5hdGVQbGFjZWhvbGRlcik7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBoaWRlUG9saWN5UGxhY2Vob2xkZXIoe2RhdGE6IHtnYW1lfX0pXHJcblx0e1xyXG5cdFx0aWYoZ2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTEnICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wb2xpY3kxJyB8fFxyXG5cdFx0XHRnYW1lLnN0YXRlICE9PSAncG9saWN5MicgJiYgYmFsbG90LmRpc3BsYXllZCA9PT0gJ2xvY2FsX3BvbGljeTInXHJcblx0XHQpe1xyXG5cdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdFx0fVxyXG5cdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZVBvbGljeVBsYWNlaG9sZGVyKTtcclxuXHR9XHJcblxyXG5cdGlmKGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUucHJlc2lkZW50KVxyXG5cdHtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCA9PT0gZ2FtZS5wcmVzaWRlbnQpe1xyXG5cdFx0XHRjaG9vc2VDaGFuY2VsbG9yKCkudGhlbih1c2VySWQgPT4ge1xyXG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCdub21pbmF0ZScsIHVzZXJJZCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQ2hvb3NlIHlvdXJcXG5jaGFuY2VsbG9yIScsICd3YWl0X2Zvcl9jaGFuY2VsbG9yJywge1xyXG5cdFx0XHRcdGNob2ljZXM6IEJhbGxvdFR5cGUuUExBWUVSU0VMRUNULFxyXG5cdFx0XHRcdGZha2U6IHRydWUsXHJcblx0XHRcdFx0aXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAnbm9taW5hdGUnXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlTm9taW5hdGVQbGFjZWhvbGRlcik7XHJcblx0XHR9XHJcblx0fVxyXG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTEnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcclxuXHR7XHJcblx0XHRsZXQgb3B0cyA9IHtjaG9pY2VzOiBCYWxsb3RUeXBlLlBPTElDWSwgcG9saWN5SGFuZDogZ2FtZS5oYW5kfTtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCAhPT0gZ2FtZS5wcmVzaWRlbnQpe1xyXG5cdFx0XHRPYmplY3QuYXNzaWduKG9wdHMsIHtmYWtlOiB0cnVlLCBpc0ludmFsaWQ6ICgpID0+IFNILmdhbWUuc3RhdGUgIT09ICdwb2xpY3kxJ30pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGJhbGxvdC5hc2tRdWVzdGlvbignQ2hvb3NlIG9uZVxcbnRvIGRpc2NhcmQhJywgJ2xvY2FsX3BvbGljeTEnLCBvcHRzKVxyXG5cdFx0LnRoZW4oZGlzY2FyZCA9PiB7XHJcblx0XHRcdFNILnNvY2tldC5lbWl0KCdkaXNjYXJkX3BvbGljeTEnLCBkaXNjYXJkKTtcclxuXHRcdH0pO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZVBvbGljeVBsYWNlaG9sZGVyKTtcclxuXHR9XHJcblx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAncG9saWN5MicgJiYgYmFsbG90LnNlYXQub3duZXIgPT09IGdhbWUuY2hhbmNlbGxvcilcclxuXHR7XHJcblx0XHRsZXQgb3B0cyA9IHtjaG9pY2VzOiBCYWxsb3RUeXBlLlBPTElDWSwgcG9saWN5SGFuZDogZ2FtZS5oYW5kfTtcclxuXHRcdGlmKFNILmxvY2FsVXNlci5pZCAhPT0gZ2FtZS5jaGFuY2VsbG9yKXtcclxuXHRcdFx0T2JqZWN0LmFzc2lnbihvcHRzLCB7ZmFrZTogdHJ1ZSwgaXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAncG9saWN5Mid9KTtcclxuXHRcdH1cclxuXHJcblx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0Nob29zZSBvbmVcXG50byBkaXNjYXJkIScsICdsb2NhbF9wb2xpY3kyJywgb3B0cylcclxuXHRcdC50aGVuKGRpc2NhcmQgPT4ge1xyXG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnZGlzY2FyZF9wb2xpY3kyJywgZGlzY2FyZCk7XHJcblx0XHR9LCBlcnIgPT4gY29uc29sZS5lcnJvcihlcnIpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVQb2xpY3lQbGFjZWhvbGRlcik7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQge3VwZGF0ZVZvdGVzSW5Qcm9ncmVzcywgdXBkYXRlU3RhdGV9OyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbi8qXHJcbiogRGVja3MgaGF2ZSAxNyBjYXJkczogNiBsaWJlcmFsLCAxMSBmYXNjaXN0LlxyXG4qIEluIGJpdC1wYWNrZWQgYm9vbGVhbiBhcnJheXMsIDEgaXMgbGliZXJhbCwgMCBpcyBmYXNjaXN0LlxyXG4qIFRoZSBtb3N0IHNpZ25pZmljYW50IGJpdCBpcyBhbHdheXMgMS5cclxuKiBFLmcuIDBiMTAxMDAxIHJlcHJlc2VudHMgYSBkZWNrIHdpdGggMiBsaWJlcmFsIGFuZCAzIGZhc2Npc3QgY2FyZHNcclxuKi9cclxuXHJcbmxldCBGVUxMX0RFQ0sgPSAweDIwMDNmO1xyXG5cclxubGV0IHBvc2l0aW9ucyA9IFtcclxuXHQweDEsIDB4MiwgMHg0LCAweDgsXHJcblx0MHgxMCwgMHgyMCwgMHg0MCwgMHg4MCxcclxuXHQweDEwMCwgMHgyMDAsIDB4NDAwLCAweDgwMCxcclxuXHQweDEwMDAsIDB4MjAwMCwgMHg0MDAwLCAweDgwMDAsXHJcblx0MHgxMDAwMCwgMHgyMDAwMCwgMHg0MDAwMFxyXG5dO1xyXG5cclxuZnVuY3Rpb24gbGVuZ3RoKGRlY2spXHJcbntcclxuXHRyZXR1cm4gcG9zaXRpb25zLmZpbmRJbmRleChzID0+IHMgPiBkZWNrKSAtMTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2h1ZmZsZShkZWNrKVxyXG57XHJcblx0bGV0IGwgPSBsZW5ndGgoZGVjayk7XHJcblx0Zm9yKGxldCBpPWwtMTsgaT4wOyBpLS0pXHJcblx0e1xyXG5cdFx0bGV0IG8gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBpKTtcclxuXHRcdGxldCBpVmFsID0gZGVjayAmIDEgPDwgaSwgb1ZhbCA9IGRlY2sgJiAxIDw8IG87XHJcblx0XHRsZXQgc3dhcHBlZCA9IGlWYWwgPj4+IGktbyB8IG9WYWwgPDwgaS1vO1xyXG5cdFx0ZGVjayA9IGRlY2sgLSBpVmFsIC0gb1ZhbCArIHN3YXBwZWQ7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gZGVjaztcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd1RocmVlKGQpXHJcbntcclxuXHRyZXR1cm4gZCA8IDggPyBbMSwgZF0gOiBbZCA+Pj4gMywgOCB8IGQgJiA3XTtcclxufVxyXG5cclxuZnVuY3Rpb24gZGlzY2FyZE9uZShkZWNrLCBwb3MpXHJcbntcclxuXHRsZXQgYm90dG9tSGFsZiA9IGRlY2sgJiAoMSA8PCBwb3MpLTE7XHJcblx0bGV0IHRvcEhhbGYgPSBkZWNrICYgfigoMSA8PCBwb3MrMSktMSk7XHJcblx0dG9wSGFsZiA+Pj49IDE7XHJcblx0bGV0IG5ld0RlY2sgPSB0b3BIYWxmIHwgYm90dG9tSGFsZjtcclxuXHRcclxuXHRsZXQgdmFsID0gKGRlY2sgJiAxPDxwb3MpID4+PiBwb3M7XHJcblxyXG5cdHJldHVybiBbbmV3RGVjaywgdmFsXTtcclxufVxyXG5cclxuZnVuY3Rpb24gYXBwZW5kKGRlY2ssIHZhbClcclxue1xyXG5cdHJldHVybiBkZWNrIDw8IDEgfCB2YWw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRvQXJyYXkoZGVjaylcclxue1xyXG5cdGxldCBhcnIgPSBbXTtcclxuXHR3aGlsZShkZWNrID4gMSl7XHJcblx0XHRhcnIucHVzaChkZWNrICYgMSk7XHJcblx0XHRkZWNrID4+Pj0gMTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBhcnI7XHJcbn1cclxuXHJcbmV4cG9ydCB7bGVuZ3RoLCBzaHVmZmxlLCBkcmF3VGhyZWUsIGRpc2NhcmRPbmUsIGFwcGVuZCwgdG9BcnJheSwgRlVMTF9ERUNLfTsiLCIndXNlIHN0cmljdDsnXG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgeyBCbGFua0NhcmQsIEphQ2FyZCwgTmVpbkNhcmQsIEZhc2Npc3RQb2xpY3lDYXJkLCBMaWJlcmFsUG9saWN5Q2FyZCB9IGZyb20gJy4vY2FyZCc7XG5pbXBvcnQgeyBnZW5lcmF0ZVF1ZXN0aW9uLCBsYXRlVXBkYXRlIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyBCUCBmcm9tICcuL2JhbGxvdHByb2Nlc3Nvcic7XG5pbXBvcnQgKiBhcyBCUEJBIGZyb20gJy4vYnBiYSc7XG5pbXBvcnQge05UZXh0LCBQbGFjZWhvbGRlck1lc2h9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XG5cbmxldCBQTEFZRVJTRUxFQ1QgPSAwO1xubGV0IENPTkZJUk0gPSAxO1xubGV0IEJJTkFSWSA9IDI7XG5sZXQgUE9MSUNZID0gMztcblxuY2xhc3MgQmFsbG90IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC4zLCAwLjI1KTtcblx0XHR0aGlzLnJvdGF0aW9uLnNldCguNSwgTWF0aC5QSSwgMCk7XG5cdFx0c2VhdC5hZGQodGhpcyk7XG5cblx0XHR0aGlzLmxhc3RRdWV1ZWQgPSBQcm9taXNlLnJlc29sdmUoKTtcblx0XHR0aGlzLmRpc3BsYXllZCA9IG51bGw7XG5cblx0XHR0aGlzLl95ZXNDbGlja0hhbmRsZXIgPSBudWxsO1xuXHRcdHRoaXMuX25vQ2xpY2tIYW5kbGVyID0gbnVsbDtcblx0XHR0aGlzLl9ub21pbmF0ZUhhbmRsZXIgPSBudWxsO1xuXHRcdHRoaXMuX2NhbmNlbEhhbmRsZXIgPSBudWxsO1xuXG5cdFx0dGhpcy5qYUNhcmQgPSBuZXcgSmFDYXJkKCk7XG5cdFx0dGhpcy5uZWluQ2FyZCA9IG5ldyBOZWluQ2FyZCgpO1xuXHRcdFt0aGlzLmphQ2FyZCwgdGhpcy5uZWluQ2FyZF0uZm9yRWFjaChjID0+IHtcblx0XHRcdGMucG9zaXRpb24uc2V0KGMgaW5zdGFuY2VvZiBKYUNhcmQgPyAtMC4xIDogMC4xLCAtMC4xLCAwKTtcblx0XHRcdGMuc2NhbGUuc2V0U2NhbGFyKDAuMTUpO1xuXHRcdFx0Yy52aXNpYmxlID0gZmFsc2U7XG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQodGhpcy5qYUNhcmQsIHRoaXMubmVpbkNhcmQpO1xuXHRcdHRoaXMucG9saWNpZXMgPSBbXTtcblxuXHRcdC8vbGV0IGdlbyA9IG5ldyBUSFJFRS5QbGFuZUJ1ZmZlckdlb21ldHJ5KDAuNCwgMC4yKTtcblx0XHQvL2xldCBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe3RyYW5zcGFyZW50OiB0cnVlLCBzaWRlOiBUSFJFRS5Eb3VibGVTaWRlfSk7XG5cdFx0dGhpcy5xdWVzdGlvbiA9IFBsYWNlaG9sZGVyTWVzaC5jbG9uZSgpO1xuXHRcdHRoaXMucXVlc3Rpb24ucG9zaXRpb24uc2V0KDAsIDAuMDUsIDApO1xuXHRcdHRoaXMucXVlc3Rpb24uc2NhbGUuc2V0U2NhbGFyKC41KTtcblx0XHR0aGlzLnF1ZXN0aW9uLnZpc2libGUgPSBmYWxzZTtcblx0XHR0aGlzLmFkZCh0aGlzLnF1ZXN0aW9uKTtcblxuXHRcdHRoaXMudGV4dENvbXBvbmVudCA9IG5ldyBOVGV4dCh0aGlzLnF1ZXN0aW9uKTtcblx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt3aWR0aDogMS4xLCBoZWlnaHQ6IC40LCBmb250U2l6ZTogMSwgdmVydGljYWxBbGlnbjogJ3RvcCd9KTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV92b3Rlc0luUHJvZ3Jlc3MnLCBCUC51cGRhdGVWb3Rlc0luUHJvZ3Jlc3MuYmluZCh0aGlzKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgbGF0ZVVwZGF0ZShCUC51cGRhdGVTdGF0ZS5iaW5kKHRoaXMpKSk7XG5cdH1cblxuXHRhc2tRdWVzdGlvbihxVGV4dCwgaWQsIHtjaG9pY2VzID0gQklOQVJZLCBwb2xpY3lIYW5kID0gMHgxLCBmYWtlID0gZmFsc2UsIGlzSW52YWxpZCA9ICgpID0+IHRydWV9ID0ge30pXG5cdHtcblx0XHRsZXQgc2VsZiA9IHRoaXM7XG5cblx0XHRmdW5jdGlvbiBpc1ZvdGVWYWxpZCgpXG5cdFx0e1xuXHRcdFx0bGV0IGlzRmFrZVZhbGlkID0gZmFrZSAmJiAhaXNJbnZhbGlkKCk7XG5cdFx0XHRsZXQgaXNMb2NhbFZvdGUgPSAvXmxvY2FsLy50ZXN0KGlkKTtcblx0XHRcdGxldCBpc0ZpcnN0VXBkYXRlID0gIVNILmdhbWUudm90ZXNJblByb2dyZXNzO1xuXHRcdFx0bGV0IHZvdGUgPSBTSC52b3Rlc1tpZF07XG5cdFx0XHRsZXQgdm90ZXJzID0gdm90ZSA/IFsuLi52b3RlLnllc1ZvdGVycywgLi4udm90ZS5ub1ZvdGVyc10gOiBbXTtcblx0XHRcdGxldCBhbHJlYWR5Vm90ZWQgPSB2b3RlcnMuaW5jbHVkZXMoc2VsZi5zZWF0Lm93bmVyKTtcblx0XHRcdHJldHVybiBpc0xvY2FsVm90ZSB8fCBpc0ZpcnN0VXBkYXRlIHx8IGlzRmFrZVZhbGlkIHx8IHZvdGUgJiYgIWFscmVhZHlWb3RlZDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBob29rVXBRdWVzdGlvbigpe1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKHF1ZXN0aW9uRXhlY3V0b3IpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHF1ZXN0aW9uRXhlY3V0b3IocmVzb2x2ZSwgcmVqZWN0KVxuXHRcdHtcblx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgYW5zd2VyIGlzIHN0aWxsIHJlbGV2YW50XG5cdFx0XHRpZighaXNWb3RlVmFsaWQoKSl7XG5cdFx0XHRcdHJldHVybiByZWplY3QoJ1ZvdGUgbm8gbG9uZ2VyIHZhbGlkJyk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHNob3cgdGhlIGJhbGxvdFxuXHRcdFx0Ly9zZWxmLnF1ZXN0aW9uLm1hdGVyaWFsLm1hcCA9IGdlbmVyYXRlUXVlc3Rpb24ocVRleHQsIHNlbGYucXVlc3Rpb24ubWF0ZXJpYWwubWFwKTtcblx0XHRcdHNlbGYudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6IGAke3FUZXh0fWB9KTtcblx0XHRcdHNlbGYucXVlc3Rpb24udmlzaWJsZSA9IHRydWU7XG5cblx0XHRcdC8vIGhvb2sgdXAgcS9hIGNhcmRzXG5cdFx0XHRpZihjaG9pY2VzID09PSBDT05GSVJNIHx8IGNob2ljZXMgPT09IEJJTkFSWSl7XG5cdFx0XHRcdHNlbGYuamFDYXJkLnZpc2libGUgPSB0cnVlO1xuXHRcdFx0XHRpZighZmFrZSlcblx0XHRcdFx0XHRzZWxmLmphQ2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQoJ3llcycsIHJlc29sdmUsIHJlamVjdCkpO1xuXHRcdFx0fVxuXHRcdFx0aWYoY2hvaWNlcyA9PT0gQklOQVJZKXtcblx0XHRcdFx0c2VsZi5uZWluQ2FyZC52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdFx0aWYoIWZha2UpXG5cdFx0XHRcdFx0c2VsZi5uZWluQ2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQoJ25vJywgcmVzb2x2ZSwgcmVqZWN0KSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKGNob2ljZXMgPT09IFBMQVlFUlNFTEVDVCAmJiAhZmFrZSl7XG5cdFx0XHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3BsYXllclNlbGVjdCcsIHJlc3BvbmQoJ3BsYXllcicsIHJlc29sdmUsIHJlamVjdCkpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZihjaG9pY2VzID09PSBQT0xJQ1kpe1xuXHRcdFx0XHRCUEJBLnRvQXJyYXkocG9saWN5SGFuZCkuZm9yRWFjaCgodmFsLCBpLCBhcnIpID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRsZXQgY2FyZCA9IG51bGw7XG5cdFx0XHRcdFx0aWYoZmFrZSlcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgQmxhbmtDYXJkKCk7XG5cdFx0XHRcdFx0ZWxzZSBpZih2YWwpXG5cdFx0XHRcdFx0XHRjYXJkID0gbmV3IExpYmVyYWxQb2xpY3lDYXJkKCk7XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0Y2FyZCA9IG5ldyBGYXNjaXN0UG9saWN5Q2FyZCgpO1xuXG5cdFx0XHRcdFx0Y2FyZC5zY2FsZS5zZXRTY2FsYXIoMC4xNSk7XG5cblx0XHRcdFx0XHRsZXQgd2lkdGggPSAuMTUgKiBhcnIubGVuZ3RoO1xuXHRcdFx0XHRcdGxldCB4ID0gLXdpZHRoLzIgKyAuMTUqaSArIC4wNzU7XG5cdFx0XHRcdFx0Y2FyZC5wb3NpdGlvbi5zZXQoeCwgLTAuMDcsIDApO1xuXHRcdFx0XHRcdHNlbGYuYWRkKGNhcmQpO1xuXHRcdFx0XHRcdHNlbGYucG9saWNpZXMucHVzaChjYXJkKTtcblxuXHRcdFx0XHRcdGlmKCFmYWtlKVxuXHRcdFx0XHRcdFx0Y2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQoaSwgcmVzb2x2ZSwgcmVqZWN0KSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbmNlbFZvdGUnLCByZXNwb25kKCdjYW5jZWwnLCByZXNvbHZlLCByZWplY3QpKTtcblxuXHRcdFx0c2VsZi5kaXNwbGF5ZWQgPSBpZDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZXNwb25kKGFuc3dlciwgcmVzb2x2ZSwgcmVqZWN0KVxuXHRcdHtcblx0XHRcdGZ1bmN0aW9uIGhhbmRsZXIoZXZ0KVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBtYWtlIHN1cmUgb25seSB0aGUgb3duZXIgb2YgdGhlIGJhbGxvdCBpcyBhbnN3ZXJpbmdcblx0XHRcdFx0aWYoYW5zd2VyICE9PSAnY2FuY2VsJyAmJiBzZWxmLnNlYXQub3duZXIgIT09IFNILmxvY2FsVXNlci5pZCkgcmV0dXJuO1xuXG5cdFx0XHRcdC8vIGNsZWFuIHVwXG5cdFx0XHRcdHNlbGYuamFDYXJkLnZpc2libGUgPSBmYWxzZTtcblx0XHRcdFx0c2VsZi5uZWluQ2FyZC52aXNpYmxlID0gZmFsc2U7XG5cdFx0XHRcdHNlbGYucXVlc3Rpb24udmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0XHRzZWxmLmRpc3BsYXllZCA9IG51bGw7XG5cdFx0XHRcdHNlbGYucmVtb3ZlKC4uLnNlbGYucG9saWNpZXMpO1xuXHRcdFx0XHRzZWxmLnBvbGljaWVzID0gW107XG5cblx0XHRcdFx0c2VsZi5qYUNhcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCBzZWxmLl95ZXNDbGlja0hhbmRsZXIpO1xuXHRcdFx0XHRzZWxmLm5laW5DYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgc2VsZi5fbm9DbGlja0hhbmRsZXIpO1xuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCdwbGF5ZXJTZWxlY3QnLCBzZWxmLl9ub21pbmF0ZUhhbmRsZXIpO1xuXHRcdFx0XHRzZWxmLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbmNlbFZvdGUnLCBzZWxmLl9jYW5jZWxIYW5kbGVyKTtcblxuXHRcdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBzdGlsbCBtYXR0ZXJzXG5cdFx0XHRcdGlmKCFpc1ZvdGVWYWxpZCgpIHx8IGFuc3dlciA9PT0gJ2NhbmNlbCcpe1xuXHRcdFx0XHRcdHJlamVjdCgndm90ZSBjYW5jZWxsZWQnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3llcycpXG5cdFx0XHRcdFx0cmVzb2x2ZSh0cnVlKTtcblx0XHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdubycpXG5cdFx0XHRcdFx0cmVzb2x2ZShmYWxzZSk7XG5cdFx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAncGxheWVyJylcblx0XHRcdFx0XHRyZXNvbHZlKGV2dC5kYXRhKTtcblx0XHRcdFx0ZWxzZSBpZihjaG9pY2VzID09PSBQT0xJQ1kpXG5cdFx0XHRcdFx0cmVzb2x2ZShhbnN3ZXIpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZihhbnN3ZXIgPT09ICd5ZXMnKVxuXHRcdFx0XHRzZWxmLl95ZXNDbGlja0hhbmRsZXIgPSBoYW5kbGVyO1xuXHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdubycpXG5cdFx0XHRcdHNlbGYuX25vQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcblx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAncGxheWVyJylcblx0XHRcdFx0c2VsZi5fbm9taW5hdGVIYW5kbGVyID0gaGFuZGxlcjtcblx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnY2FuY2VsJylcblx0XHRcdFx0c2VsZi5fY2FuY2VsSGFuZGxlciA9IGhhbmRsZXI7XG5cblx0XHRcdHJldHVybiBoYW5kbGVyO1xuXHRcdH1cblxuXHRcdHNlbGYubGFzdFF1ZXVlZCA9IHNlbGYubGFzdFF1ZXVlZC50aGVuKGhvb2tVcFF1ZXN0aW9uLCBob29rVXBRdWVzdGlvbik7XG5cblx0XHRyZXR1cm4gc2VsZi5sYXN0UXVldWVkO1xuXHR9XG59XG5cbmV4cG9ydCB7QmFsbG90LCBQTEFZRVJTRUxFQ1QsIENPTkZJUk0sIEJJTkFSWSwgUE9MSUNZfTsiLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQge0Zhc2Npc3RSb2xlQ2FyZCwgSGl0bGVyUm9sZUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZH0gZnJvbSAnLi9jYXJkJztcbmltcG9ydCB7bGF0ZVVwZGF0ZX0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge05CaWxsYm9hcmR9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBsYXllckluZm8gZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcihzZWF0KVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xuXHRcdHRoaXMuY2FyZCA9IG51bGw7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMCwgMC4zKTtcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjMpO1xuXHRcdHNlYXQuYWRkKHRoaXMpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgbGF0ZVVwZGF0ZSh0aGlzLnVwZGF0ZVN0YXRlLmJpbmQodGhpcykpKTtcblx0XHQvL1NILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLnVwZGF0ZVR1cm5PcmRlci5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZVR1cm5PcmRlcih7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcblx0e1xuXHRcdFNILl91c2VyUHJvbWlzZS50aGVuKCgpID0+IHtcblx0XHRcdGxldCBsb2NhbFBsYXllciA9IHBsYXllcnNbU0gubG9jYWxVc2VyLmlkXTtcblx0XHRcdGlmKGxvY2FsUGxheWVyKXtcblx0XHRcdFx0bGV0IHBsYXllclBvcyA9IHRoaXMud29ybGRUb0xvY2FsKFNILnNlYXRzW2xvY2FsUGxheWVyLnNlYXROdW1dLmdldFdvcmxkUG9zaXRpb24oKSk7XG5cdFx0XHRcdHRoaXMubG9va0F0KHBsYXllclBvcyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHR1cGRhdGVTdGF0ZSh7ZGF0YToge2dhbWUsIHBsYXllcnMsIHZvdGVzfX0pXG5cdHtcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ25pZ2h0JyAmJiBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0pXG5cdFx0XHR0aGlzLnByZXNlbnRSb2xlKGdhbWUsIHBsYXllcnMsIHZvdGVzKTtcblxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJylcblx0XHRcdHRoaXMucHJlc2VudFZvdGUoZ2FtZSwgcGxheWVycywgdm90ZXMpO1xuXG5cdFx0ZWxzZSBpZih0aGlzLmNhcmQgIT09IG51bGwpXG5cdFx0e1xuXHRcdFx0dGhpcy5yZW1vdmUodGhpcy5jYXJkKTtcblx0XHRcdHRoaXMuY2FyZCA9IG51bGw7XG5cdFx0fVxuXHR9XG5cblx0cHJlc2VudFJvbGUoZ2FtZSwgcGxheWVycylcblx0e1xuXHRcdGxldCBsb2NhbFBsYXllciA9IHBsYXllcnNbU0gubG9jYWxVc2VyLmlkXTtcblx0XHRsZXQgc2VhdGVkUGxheWVyID0gcGxheWVyc1t0aGlzLnNlYXQub3duZXJdO1xuXG5cdFx0bGV0IHNlYXRlZFJvbGVTaG91bGRCZVZpc2libGUgPVxuXHRcdFx0U0gubG9jYWxVc2VyLmlkID09PSB0aGlzLnNlYXQub3duZXIgfHxcblx0XHRcdGxvY2FsUGxheWVyLnJvbGUgPT09ICdmYXNjaXN0JyAmJiAoc2VhdGVkUGxheWVyLnJvbGUgPT09ICdmYXNjaXN0JyB8fCBzZWF0ZWRQbGF5ZXIucm9sZSA9PT0gJ2hpdGxlcicpIHx8XG5cdFx0XHRsb2NhbFBsYXllci5yb2xlID09PSAnaGl0bGVyJyAmJiBzZWF0ZWRQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnICYmIGdhbWUudHVybk9yZGVyLmxlbmd0aCA8IDk7XG5cblx0XHRpZihzZWF0ZWRSb2xlU2hvdWxkQmVWaXNpYmxlKVxuXHRcdHtcblx0XHRcdHN3aXRjaChzZWF0ZWRQbGF5ZXIucm9sZSl7XG5cdFx0XHRcdGNhc2UgJ2Zhc2Npc3QnOiB0aGlzLmNhcmQgPSBuZXcgRmFzY2lzdFJvbGVDYXJkKCk7IGJyZWFrO1xuXHRcdFx0XHRjYXNlICdoaXRsZXInIDogdGhpcy5jYXJkID0gbmV3IEhpdGxlclJvbGVDYXJkKCk7ICBicmVhaztcblx0XHRcdFx0Y2FzZSAnbGliZXJhbCc6IHRoaXMuY2FyZCA9IG5ldyBMaWJlcmFsUm9sZUNhcmQoKTsgYnJlYWs7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYWRkKHRoaXMuY2FyZCk7XG5cdFx0XHRsZXQgYmIgPSBuZXcgTkJpbGxib2FyZCh0aGlzLmNhcmQpO1xuXHRcdH1cblx0fVxuXG5cdHByZXNlbnRWb3RlKGdhbWUsIF8sIHZvdGVzKVxuXHR7XG5cdFx0bGV0IHZvdGUgPSB2b3Rlc1tnYW1lLmxhc3RFbGVjdGlvbl07XG5cblx0XHRsZXQgcGxheWVyVm90ZSA9IHZvdGUueWVzVm90ZXJzLmluY2x1ZGVzKHRoaXMuc2VhdC5vd25lcik7XG5cdFx0dGhpcy5jYXJkID0gcGxheWVyVm90ZSA/IG5ldyBKYUNhcmQoKSA6IG5ldyBOZWluQ2FyZCgpO1xuXG5cdFx0dGhpcy5hZGQodGhpcy5jYXJkKTtcblx0XHRsZXQgYmIgPSBuZXcgTkJpbGxib2FyZCh0aGlzLmNhcmQpO1xuXHR9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDYXBzdWxlR2VvbWV0cnkgZXh0ZW5kcyBUSFJFRS5CdWZmZXJHZW9tZXRyeVxue1xuXHRjb25zdHJ1Y3RvcihyYWRpdXMsIGhlaWdodCwgc2VnbWVudHMgPSAxMiwgcmluZ3MgPSA4KVxuXHR7XG5cdFx0c3VwZXIoKTtcblxuXHRcdGxldCBudW1WZXJ0cyA9IDIgKiByaW5ncyAqIHNlZ21lbnRzICsgMjtcblx0XHRsZXQgbnVtRmFjZXMgPSA0ICogcmluZ3MgKiBzZWdtZW50cztcblx0XHRsZXQgdGhldGEgPSAyKk1hdGguUEkvc2VnbWVudHM7XG5cdFx0bGV0IHBoaSA9IE1hdGguUEkvKDIqcmluZ3MpO1xuXG5cdFx0bGV0IHZlcnRzID0gbmV3IEZsb2F0MzJBcnJheSgzKm51bVZlcnRzKTtcblx0XHRsZXQgZmFjZXMgPSBuZXcgVWludDE2QXJyYXkoMypudW1GYWNlcyk7XG5cdFx0bGV0IHZpID0gMCwgZmkgPSAwLCB0b3BDYXAgPSAwLCBib3RDYXAgPSAxO1xuXG5cdFx0dmVydHMuc2V0KFswLCBoZWlnaHQvMiwgMF0sIDMqdmkrKyk7XG5cdFx0dmVydHMuc2V0KFswLCAtaGVpZ2h0LzIsIDBdLCAzKnZpKyspO1xuXG5cdFx0Zm9yKCBsZXQgcz0wOyBzPHNlZ21lbnRzOyBzKysgKVxuXHRcdHtcblx0XHRcdGZvciggbGV0IHI9MTsgcjw9cmluZ3M7IHIrKylcblx0XHRcdHtcblx0XHRcdFx0bGV0IHJhZGlhbCA9IHJhZGl1cyAqIE1hdGguc2luKHIqcGhpKTtcblxuXHRcdFx0XHQvLyBjcmVhdGUgdmVydHNcblx0XHRcdFx0dmVydHMuc2V0KFtcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLmNvcyhzKnRoZXRhKSxcblx0XHRcdFx0XHRoZWlnaHQvMiAtIHJhZGl1cyooMS1NYXRoLmNvcyhyKnBoaSkpLFxuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguc2luKHMqdGhldGEpXG5cdFx0XHRcdF0sIDMqdmkrKyk7XG5cblx0XHRcdFx0dmVydHMuc2V0KFtcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLmNvcyhzKnRoZXRhKSxcblx0XHRcdFx0XHQtaGVpZ2h0LzIgKyByYWRpdXMqKDEtTWF0aC5jb3MocipwaGkpKSxcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLnNpbihzKnRoZXRhKVxuXHRcdFx0XHRdLCAzKnZpKyspO1xuXG5cdFx0XHRcdGxldCB0b3BfczFyMSA9IHZpLTIsIHRvcF9zMXIwID0gdmktNDtcblx0XHRcdFx0bGV0IGJvdF9zMXIxID0gdmktMSwgYm90X3MxcjAgPSB2aS0zO1xuXHRcdFx0XHRsZXQgdG9wX3MwcjEgPSB0b3BfczFyMSAtIDIqcmluZ3MsIHRvcF9zMHIwID0gdG9wX3MxcjAgLSAyKnJpbmdzO1xuXHRcdFx0XHRsZXQgYm90X3MwcjEgPSBib3RfczFyMSAtIDIqcmluZ3MsIGJvdF9zMHIwID0gYm90X3MxcjAgLSAyKnJpbmdzO1xuXHRcdFx0XHRpZihzID09PSAwKXtcblx0XHRcdFx0XHR0b3BfczByMSArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHRcdHRvcF9zMHIwICs9IG51bVZlcnRzLTI7XG5cdFx0XHRcdFx0Ym90X3MwcjEgKz0gbnVtVmVydHMtMjtcblx0XHRcdFx0XHRib3RfczByMCArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gY3JlYXRlIGZhY2VzXG5cdFx0XHRcdGlmKHIgPT09IDEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcENhcCwgdG9wX3MxcjEsIHRvcF9zMHIxXSwgMypmaSsrKTtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdENhcCwgYm90X3MwcjEsIGJvdF9zMXIxXSwgMypmaSsrKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcF9zMXIwLCB0b3BfczFyMSwgdG9wX3MwcjBdLCAzKmZpKyspO1xuXHRcdFx0XHRcdGZhY2VzLnNldChbdG9wX3MwcjAsIHRvcF9zMXIxLCB0b3BfczByMV0sIDMqZmkrKyk7XG5cblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdF9zMHIxLCBib3RfczFyMSwgYm90X3MwcjBdLCAzKmZpKyspO1xuXHRcdFx0XHRcdGZhY2VzLnNldChbYm90X3MwcjAsIGJvdF9zMXIxLCBib3RfczFyMF0sIDMqZmkrKyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gY3JlYXRlIGxvbmcgc2lkZXNcblx0XHRcdGxldCB0b3BfczEgPSB2aS0yLCB0b3BfczAgPSB0b3BfczEgLSAyKnJpbmdzO1xuXHRcdFx0bGV0IGJvdF9zMSA9IHZpLTEsIGJvdF9zMCA9IGJvdF9zMSAtIDIqcmluZ3M7XG5cdFx0XHRpZihzID09PSAwKXtcblx0XHRcdFx0dG9wX3MwICs9IG51bVZlcnRzLTI7XG5cdFx0XHRcdGJvdF9zMCArPSBudW1WZXJ0cy0yO1xuXHRcdFx0fVxuXG5cdFx0XHRmYWNlcy5zZXQoW3RvcF9zMCwgdG9wX3MxLCBib3RfczFdLCAzKmZpKyspO1xuXHRcdFx0ZmFjZXMuc2V0KFtib3RfczAsIHRvcF9zMCwgYm90X3MxXSwgMypmaSsrKTtcblx0XHR9XG5cblx0XHR0aGlzLmFkZEF0dHJpYnV0ZSgncG9zaXRpb24nLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHZlcnRzLCAzKSk7XG5cdFx0dGhpcy5zZXRJbmRleChuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKGZhY2VzLCAxKSk7XG5cdH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgQ2Fwc3VsZUdlb21ldHJ5IGZyb20gJy4vY2Fwc3VsZWdlb21ldHJ5JztcbmltcG9ydCB7bGF0ZVVwZGF0ZX0gZnJvbSAnLi91dGlscyc7XG5cbmxldCBoaXRib3hHZW8gPSBuZXcgQ2Fwc3VsZUdlb21ldHJ5KDAuMywgMS44KTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSGl0Ym94IGV4dGVuZHMgVEhSRUUuTWVzaFxue1xuXHRjb25zdHJ1Y3RvcihzZWF0KVxuXHR7XG5cdFx0c3VwZXIoaGl0Ym94R2VvLCBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuXHRcdFx0dHJhbnNwYXJlbnQ6IHRydWUsXG5cdFx0XHRvcGFjaXR5OiAwLFxuXHRcdFx0c2lkZTogVEhSRUUuQmFja1NpZGVcblx0XHR9KSk7XG5cblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC41LCAwKTtcblx0XHR0aGlzLnZpc2libGUgPSBmYWxzZTtcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xuXHRcdHNlYXQuYWRkKHRoaXMpO1xuXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3JlbnRlcicsICgpID0+IHRoaXMubWF0ZXJpYWwub3BhY2l0eSA9IDAuMSk7XG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3JsZWF2ZScsICgpID0+IHRoaXMubWF0ZXJpYWwub3BhY2l0eSA9IDApO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCAoKSA9PiB7XG5cdFx0XHRTSC5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdFx0dHlwZTogJ3BsYXllclNlbGVjdCcsXG5cdFx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB0aGlzLnNlYXQub3duZXJcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgbGF0ZVVwZGF0ZSgoe2RhdGE6IHtnYW1lfX0pID0+XG5cdFx0e1xuXHRcdFx0dGhpcy52aXNpYmxlID1cblx0XHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJlxuXHRcdFx0XHRTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50ICYmXG5cdFx0XHRcdHRoaXMuc2VhdC5vd25lciAhPT0gJycgJiZcblx0XHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQgJiZcblx0XHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBnYW1lLmxhc3RDaGFuY2VsbG9yICYmXG5cdFx0XHRcdChnYW1lLnR1cm5PcmRlci5sZW5ndGggPT09IDUgfHwgdGhpcy5zZWF0Lm93bmVyICE9PSBnYW1lLmxhc3RQcmVzaWRlbnQpO1xuXHRcdH0pKTtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XG5pbXBvcnQge0JhbGxvdH0gZnJvbSAnLi9iYWxsb3QnO1xuaW1wb3J0IFBsYXllckluZm8gZnJvbSAnLi9wbGF5ZXJpbmZvJztcbmltcG9ydCBIaXRib3ggZnJvbSAnLi9oaXRib3gnO1xuaW1wb3J0IHtsYXRlVXBkYXRlfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2VhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXROdW0pXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zZWF0TnVtID0gc2VhdE51bTtcblx0XHR0aGlzLm93bmVyID0gJyc7XG5cblx0XHQvLyBwb3NpdGlvbiBzZWF0XG5cdFx0bGV0IHgsIHk9MC42NSwgejtcblx0XHRzd2l0Y2goc2VhdE51bSl7XG5cdFx0Y2FzZSAwOiBjYXNlIDE6IGNhc2UgMjpcblx0XHRcdHggPSAtMC44MzMgKyAwLjgzMypzZWF0TnVtO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoeCwgeSwgLTEuMDUpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAzOiBjYXNlIDQ6XG5cdFx0XHR6ID0gLTAuNDM3ICsgMC44NzQqKHNlYXROdW0tMyk7XG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgxLjQyNSwgeSwgeik7XG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtTWF0aC5QSS8yLCAwKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XG5cdFx0XHR4ID0gMC44MzMgLSAwLjgzMyooc2VhdE51bS01KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIDEuMDUpO1xuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEksIDApO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSA4OiBjYXNlIDk6XG5cdFx0XHR6ID0gMC40MzcgLSAwLjg3NCooc2VhdE51bS04KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KC0xLjQyNSwgeSwgeik7XG5cdFx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtMS41Kk1hdGguUEksIDApO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2NoZWNrZWRJbicsIGlkID0+IHtcblx0XHRcdGlmKHRoaXMub3duZXIgPT09IGlkKVxuXHRcdFx0XHR0aGlzLnVwZGF0ZU93bmVyc2hpcCh7ZGF0YToge2dhbWU6IFNILmdhbWUsIHBsYXllcnM6IFNILnBsYXllcnN9fSk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLm5hbWVwbGF0ZSA9IG5ldyBOYW1lcGxhdGUodGhpcyk7XG5cdFx0dGhpcy5iYWxsb3QgPSBuZXcgQmFsbG90KHRoaXMpO1xuXHRcdHRoaXMucGxheWVySW5mbyA9IG5ldyBQbGF5ZXJJbmZvKHRoaXMpO1xuXHRcdHRoaXMuaGl0Ym94ID0gbmV3IEhpdGJveCh0aGlzKTtcblx0fVxuXG5cdHVwZGF0ZU93bmVyc2hpcCh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcblx0e1xuXHRcdGxldCBpZHMgPSBnYW1lLnR1cm5PcmRlciB8fCBbXTtcblxuXHRcdC8vIHJlZ2lzdGVyIHRoaXMgc2VhdCBpZiBpdCdzIG5ld2x5IGNsYWltZWRcblx0XHRpZiggIXRoaXMub3duZXIgKVxuXHRcdHtcblx0XHRcdC8vIGNoZWNrIGlmIGEgcGxheWVyIGhhcyBqb2luZWQgYXQgdGhpcyBzZWF0XG5cdFx0XHRmb3IobGV0IGkgaW4gaWRzKXtcblx0XHRcdFx0aWYocGxheWVyc1tpZHNbaV1dLnNlYXROdW0gPT0gdGhpcy5zZWF0TnVtKXtcblx0XHRcdFx0XHR0aGlzLm93bmVyID0gaWRzW2ldO1xuXHRcdFx0XHRcdHRoaXMubmFtZXBsYXRlLnVwZGF0ZVRleHQocGxheWVyc1tpZHNbaV1dLmRpc3BsYXlOYW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHJlc2V0IHRoaXMgc2VhdCBpZiBpdCdzIG5ld2x5IHZhY2F0ZWRcblx0XHRpZiggIWlkcy5pbmNsdWRlcyh0aGlzLm93bmVyKSApXG5cdFx0e1xuXHRcdFx0dGhpcy5vd25lciA9ICcnO1xuXHRcdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHRcdHRoaXMubmFtZXBsYXRlLnVwZGF0ZVRleHQoJzxKb2luPicpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHVwZGF0ZSBkaXNjb25uZWN0IGNvbG9yc1xuXHRcdGVsc2UgaWYoICFwbGF5ZXJzW3RoaXMub3duZXJdLmNvbm5lY3RlZCApe1xuXHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ODA4MDgwKTtcblx0XHR9XG5cdFx0ZWxzZSBpZiggcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcblx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweGZmZmZmZik7XG5cdFx0fVxuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQge1BsYWNlaG9sZGVyTWVzaCwgTkJpbGxib2FyZCwgTlRleHR9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbnRpbnVlQm94IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IocGFyZW50KVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmljb24gPSBuZXcgVEhSRUUuTWVzaChcblx0XHRcdG5ldyBUSFJFRS5Cb3hCdWZmZXJHZW9tZXRyeSguMiwgLjEsIC4yKSxcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4MDBjMDAwfSlcblx0XHQpO1xuXHRcdHRoaXMuaWNvbi5hZGRCZWhhdmlvcihuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5TcGluKCkpO1xuXHRcdHRoaXMuYWRkKHRoaXMuaWNvbik7XG5cblx0XHR0aGlzLnRleHQgPSBQbGFjZWhvbGRlck1lc2guY2xvbmUoKTtcblx0XHR0aGlzLnRleHQucG9zaXRpb24uc2V0KDAsIC4yLCAwKTtcblx0XHR0aGlzLnRleHQudXNlckRhdGEuYWx0c3BhY2UgPSB7Y29sbGlkZXI6IHtlbmFibGVkOiB0cnVlfX07XG5cblx0XHRsZXQgYmIgPSBuZXcgTkJpbGxib2FyZCh0aGlzLnRleHQpO1xuXG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50ID0gbmV3IE5UZXh0KHRoaXMudGV4dCk7XG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7Zm9udFNpemU6IDEsIHdpZHRoOiAxLCBoZWlnaHQ6IDEsIGhvcml6b250YWxBbGlnbjogJ21pZGRsZScsIHZlcnRpY2FsQWxpZ246ICdtaWRkbGUnfSk7XG5cblx0XHR0aGlzLmFkZCh0aGlzLnRleHQpO1xuXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4zLCAwKTtcblx0XHRwYXJlbnQuYWRkKHRoaXMpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgdGhpcy5vbnN0YXRlY2hhbmdlLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLnBsYXllclNldHVwLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLm9uY2xpY2suYmluZCh0aGlzKSk7XG5cdH1cblxuXHRvbmNsaWNrKGV2dClcblx0e1xuXHRcdGlmKFNILmdhbWUudHVybk9yZGVyLmluY2x1ZGVzKFNILmxvY2FsVXNlci5pZCkpXG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnY29udGludWUnKTtcblx0fVxuXG5cdG9uc3RhdGVjaGFuZ2Uoe2RhdGE6IHtnYW1lfX0pXG5cdHtcblx0XHRpZihnYW1lLnN0YXRlID09PSAnbGFtZUR1Y2snIHx8IGdhbWUuc3RhdGUgPT09ICdhZnRlcm1hdGgnKXtcblx0XHRcdHRoaXMuaWNvbi52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdHRoaXMudGV4dC52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6ICdDbGljayB0byBjb250aW51ZSd9KTtcblx0XHR9XG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcblx0XHRcdHRoaXMucGxheWVyU2V0dXAoe2RhdGE6IHtnYW1lfX0pO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMuaWNvbi52aXNpYmxlID0gZmFsc2U7XG5cdFx0XHR0aGlzLnRleHQudmlzaWJsZSA9IGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHBsYXllclNldHVwKHtkYXRhOiB7Z2FtZX19KVxuXHR7XG5cdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHR0aGlzLnRleHQudmlzaWJsZSA9IHRydWU7XG5cdFx0XHRcblx0XHRcdGlmKGdhbWUudHVybk9yZGVyLmxlbmd0aCA+PSA1KXtcblx0XHRcdFx0dGhpcy5pY29uLnZpc2libGUgPSB0cnVlO1xuXHRcdFx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OiAnQ2xpY2sgdG8gc3RhcnQnfSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0dGhpcy5pY29uLnZpc2libGUgPSBmYWxzZTtcblx0XHRcdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDpcblx0XHRcdFx0XHRgTmVlZCAkezUtZ2FtZS50dXJuT3JkZXIubGVuZ3RofSBtb3JlIHBsYXllciR7Z2FtZS50dXJuT3JkZXIubGVuZ3RoIT00ID8gJ3MnIDogJyd9IWBcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59OyIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0ICcuL3BvbHlmaWxsJztcblxuaW1wb3J0ICogYXMgQ2FyZHMgZnJvbSAnLi9jYXJkJztcbmltcG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9IGZyb20gJy4vaGF0cyc7XG5pbXBvcnQgR2FtZVRhYmxlIGZyb20gJy4vdGFibGUnO1xuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgeyBnZXRHYW1lSWQsIG1lcmdlT2JqZWN0cyB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XG5pbXBvcnQgU2VhdCBmcm9tICcuL3NlYXQnO1xuaW1wb3J0IFBsYXllck1ldGVyIGZyb20gJy4vcGxheWVybWV0ZXInO1xuaW1wb3J0IENvbnRpbnVlQm94IGZyb20gJy4vY29udGludWVib3gnO1xuXG5jbGFzcyBTZWNyZXRIaXRsZXIgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuYXNzZXRzID0gQXNzZXRNYW5hZ2VyLm1hbmlmZXN0O1xuXHRcdHRoaXMudmVydGljYWxBbGlnbiA9ICdib3R0b20nO1xuXHRcdHRoaXMubmVlZHNTa2VsZXRvbiA9IGZhbHNlO1xuXG5cdFx0Ly8gcG9seWZpbGwgZ2V0VXNlciBmdW5jdGlvblxuXHRcdGlmKCFhbHRzcGFjZS5pbkNsaWVudCl7XG5cdFx0XHRhbHRzcGFjZS5nZXRVc2VyID0gKCkgPT4ge1xuXHRcdFx0XHRsZXQgaWQsIHJlID0gL1s/Jl11c2VySWQ9KFxcZCspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRcdFx0XHRpZihyZSlcblx0XHRcdFx0XHRpZCA9IHJlWzFdO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0aWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCkudG9TdHJpbmcoKTtcblxuXHRcdFx0XHRhbHRzcGFjZS5fbG9jYWxVc2VyID0ge1xuXHRcdFx0XHRcdHVzZXJJZDogaWQsXG5cdFx0XHRcdFx0ZGlzcGxheU5hbWU6IGlkLFxuXHRcdFx0XHRcdGlzTW9kZXJhdG9yOiAvaXNNb2RlcmF0b3IvLnRlc3Qod2luZG93LmxvY2F0aW9uLnNlYXJjaClcblx0XHRcdFx0fTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ01hc3F1ZXJhZGluZyBhcycsIGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xuXHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyBnZXQgbG9jYWwgdXNlclxuXHRcdHRoaXMuX3VzZXJQcm9taXNlID0gYWx0c3BhY2UuZ2V0VXNlcigpO1xuXHRcdHRoaXMuX3VzZXJQcm9taXNlLnRoZW4odXNlciA9PiB7XG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcblx0XHRcdFx0aWQ6IHVzZXIudXNlcklkLFxuXHRcdFx0XHRkaXNwbGF5TmFtZTogdXNlci5kaXNwbGF5TmFtZSxcblx0XHRcdFx0aXNNb2RlcmF0b3I6IHVzZXIuaXNNb2RlcmF0b3Jcblx0XHRcdH07XG5cdFx0fSk7XG5cblx0XHR0aGlzLmdhbWUgPSB7fTtcblx0XHR0aGlzLnBsYXllcnMgPSB7fTtcblx0XHR0aGlzLnZvdGVzID0ge307XG5cdH1cblxuXHRpbml0aWFsaXplKGVudiwgcm9vdCwgYXNzZXRzKVxuXHR7XG5cdFx0Ly8gc2hhcmUgdGhlIGRpb3JhbWEgaW5mb1xuXHRcdEFzc2V0TWFuYWdlci5jYWNoZSA9IGFzc2V0cztcblx0XHRBc3NldE1hbmFnZXIuZml4TWF0ZXJpYWxzKCk7XG5cdFx0dGhpcy5lbnYgPSBlbnY7XG5cblx0XHQvLyBjb25uZWN0IHRvIHNlcnZlclxuXHRcdHRoaXMuc29ja2V0ID0gaW8uY29ubmVjdCgnLycsIHtxdWVyeTogJ2dhbWVJZD0nK2dldEdhbWVJZCgpfSk7XG5cblx0XHQvLyBjcmVhdGUgdGhlIHRhYmxlXG5cdFx0dGhpcy50YWJsZSA9IG5ldyBHYW1lVGFibGUoKTtcblx0XHR0aGlzLmFkZCh0aGlzLnRhYmxlKTtcblxuXHRcdHRoaXMucmVzZXRCdXR0b24gPSBuZXcgVEhSRUUuTWVzaChcblx0XHRcdG5ldyBUSFJFRS5Cb3hHZW9tZXRyeSguMjUsLjI1LC4yNSksXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogYXNzZXRzLnRleHR1cmVzLnJlc2V0fSlcblx0XHQpO1xuXHRcdHRoaXMucmVzZXRCdXR0b24ucG9zaXRpb24uc2V0KDAsIC0wLjE4LCAwKTtcblx0XHR0aGlzLnJlc2V0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5zZW5kUmVzZXQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy50YWJsZS5hZGQodGhpcy5yZXNldEJ1dHRvbik7XG5cblx0XHQvLyBjcmVhdGUgaWRsZSBkaXNwbGF5XG5cdFx0dGhpcy5pZGxlUm9vdCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuXHRcdHRoaXMuaWRsZVJvb3QucG9zaXRpb24uc2V0KDAsIDEuODUsIDApO1xuXHRcdHRoaXMuaWRsZVJvb3QuYWRkQmVoYXZpb3IobmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuU3Bpbih7c3BlZWQ6IDAuMDAwMn0pKTtcblx0XHR0aGlzLmFkZCh0aGlzLmlkbGVSb290KTtcblxuXHRcdC8vIGNyZWF0ZSBpZGxlIHNsaWRlc2hvd1xuXHRcdGxldCBjcmVkaXRzID0gbmV3IENhcmRzLkNyZWRpdHNDYXJkKCk7XG5cdFx0dGhpcy5pZGxlUm9vdC5hZGQoY3JlZGl0cyk7XG5cblx0XHQvLyBjcmVhdGUgaGF0c1xuXHRcdHRoaXMucHJlc2lkZW50SGF0ID0gbmV3IFByZXNpZGVudEhhdCgpO1xuXHRcdHRoaXMuY2hhbmNlbGxvckhhdCA9IG5ldyBDaGFuY2VsbG9ySGF0KCk7XG5cblx0XHQvLyBjcmVhdGUgcG9zaXRpb25zXG5cdFx0dGhpcy5zZWF0cyA9IFtdO1xuXHRcdGZvcihsZXQgaT0wOyBpPDEwOyBpKyspe1xuXHRcdFx0dGhpcy5zZWF0cy5wdXNoKCBuZXcgU2VhdChpKSApO1xuXHRcdH1cblxuXHRcdHRoaXMudGFibGUuYWRkKC4uLnRoaXMuc2VhdHMpO1xuXG5cdFx0Ly90aGlzLnBsYXllck1ldGVyID0gbmV3IFBsYXllck1ldGVyKCk7XG5cdFx0Ly90aGlzLnRhYmxlLmFkZCh0aGlzLnBsYXllck1ldGVyKTtcblx0XHR0aGlzLmNvbnRpbnVlQm94ID0gbmV3IENvbnRpbnVlQm94KHRoaXMudGFibGUpO1xuXG5cdFx0Ly8gYWRkIGF2YXRhciBmb3Igc2NhbGVcblx0XHQvKmFzc2V0cy5tb2RlbHMuZHVtbXkucG9zaXRpb24uc2V0KDAsIC0wLjEyLCAxLjEpO1xuXHRcdGFzc2V0cy5tb2RlbHMuZHVtbXkucm90YXRlWihNYXRoLlBJKTtcblx0XHR0aGlzLmFkZChhc3NldHMubW9kZWxzLmR1bW15KTsqL1xuXG5cdFx0dGhpcy5zb2NrZXQub24oJ3VwZGF0ZScsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLnNvY2tldC5vbignY2hlY2tlZEluJywgdGhpcy5jaGVja2VkSW4uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLnNvY2tldC5vbigncmVzZXQnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5zb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVGcm9tU2VydmVyKGdkLCBwZCwgdmQpXG5cdHtcblx0XHRjb25zb2xlLmxvZyhnZCwgcGQsIHZkKTtcblxuXHRcdGxldCBnYW1lID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nYW1lLCBnZCk7XG5cdFx0bGV0IHBsYXllcnMgPSBtZXJnZU9iamVjdHModGhpcy5wbGF5ZXJzLCBwZCB8fCB7fSk7XG5cdFx0bGV0IHZvdGVzID0gbWVyZ2VPYmplY3RzKHRoaXMudm90ZXMsIHZkIHx8IHt9KTtcblxuXHRcdGZvcihsZXQgZmllbGQgaW4gZ2QpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdFx0dHlwZTogJ3VwZGF0ZV8nK2ZpZWxkLFxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGdhbWU6IGdhbWUsXG5cdFx0XHRcdFx0cGxheWVyczogcGxheWVycyxcblx0XHRcdFx0XHR2b3Rlczogdm90ZXNcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fdXNlclByb21pc2UudGhlbigoKSA9PiB7XG5cdFx0XHRpZihwbGF5ZXJzW3RoaXMubG9jYWxVc2VyLmlkXSAmJiAhcGxheWVyc1t0aGlzLmxvY2FsVXNlci5pZF0uY29ubmVjdGVkKXtcblx0XHRcdFx0dGhpcy5zb2NrZXQuZW1pdCgnY2hlY2tfaW4nLCB0aGlzLmxvY2FsVXNlcik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmdhbWUgPSBnYW1lO1xuXHRcdHRoaXMucGxheWVycyA9IHBsYXllcnM7XG5cdFx0dGhpcy52b3RlcyA9IHZvdGVzO1xuXHR9XG5cblx0Y2hlY2tlZEluKHApXG5cdHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMucGxheWVyc1twLmlkXSwgcCk7XG5cdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdHR5cGU6ICdjaGVja2VkSW4nLFxuXHRcdFx0YnViYmxlczogZmFsc2UsXG5cdFx0XHRkYXRhOiBwLmlkXG5cdFx0fSk7XG5cdH1cblxuXHRzZW5kUmVzZXQoZSl7XG5cdFx0aWYodGhpcy5sb2NhbFVzZXIuaXNNb2RlcmF0b3Ipe1xuXHRcdFx0Y29uc29sZS5sb2coJ3JlcXVlc3RpbmcgcmVzZXQnKTtcblx0XHRcdHRoaXMuc29ja2V0LmVtaXQoJ3Jlc2V0Jyk7XG5cdFx0fVxuXHR9XG5cblx0ZG9SZXNldCgpXG5cdHtcblx0XHRpZiggLyZjYWNoZUJ1c3Q9XFxkKyQvLnRlc3Qod2luZG93LmxvY2F0aW9uLnNlYXJjaCkgKXtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggKz0gJzEnO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggKz0gJyZjYWNoZUJ1c3Q9MSc7XG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBTZWNyZXRIaXRsZXIoKTtcbiJdLCJuYW1lcyI6WyJ0aGlzIiwibGV0Iiwic3VwZXIiLCJBc3NldE1hbmFnZXIiLCJjYXJkIiwiQmFsbG90VHlwZS5DT05GSVJNIiwidXBkYXRlU3RhdGUiLCJCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCIsIkJhbGxvdFR5cGUuUE9MSUNZIiwib3B0cyIsIkJQLnVwZGF0ZVZvdGVzSW5Qcm9ncmVzcyIsIkJQLnVwZGF0ZVN0YXRlIiwiQlBCQS50b0FycmF5IiwiQ2FyZHMuQ3JlZGl0c0NhcmQiXSwibWFwcGluZ3MiOiI7OztBQUVBLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztDQUM1QixNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFO0VBQ2xELEtBQUssRUFBRSxTQUFTLElBQUksQ0FBQztHQUNwQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7R0FDL0I7RUFDRCxRQUFRLEVBQUUsS0FBSztFQUNmLFVBQVUs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LEdBQUc7Q0FDVDtFQUNDQSxxQkFBSyxDQUFDLEtBQUssS0FBQSxDQUFDLE1BQUEsR0FBRyxDQUFDLENBQUM7OztFQUdqQixHQUFHLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxHQUFHLENBQUMsTUFBTTtFQUM1QztHQUNDLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztHQUN4Q0QsSUFBSSxHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7R0FDbEUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7R0FFckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7R0FDckI7OztFQUdELElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUN2QyxJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7RUFDMUMsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0VBQ3RDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0VBQzVCLENBQUE7O0NBRUQsa0JBQUEsTUFBTTtDQUNOOztFQUVDQSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztFQUN0REEsSUFBSSxJQUFJLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxVQUFBLENBQUMsRUFBQyxTQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQSxDQUFDO0VBQzdE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RUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNO0VBQ25CLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUs7RUFDbkIsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUs7RUFDbkIsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSztFQUNuQixDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUs7Ozs7RUFJbkIsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQ3RGLENBQUM7O0NBRUZBLElBQUksT0FBTyxHQUFHOztFQUViLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMxQixDQUFDOzs7Q0FHRkEsSUFBSSxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUN2RUEsSUFBSSxJQUFJLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDNUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztDQUNwQixJQUFJLEdBQUcsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUN0RSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDOzs7Q0FHbEJBLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxHQUFHLEVBQUUsQ0FBQztDQUN0REEsSUFBSSxXQUFXLEdBQUcsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ3hGLFlB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QUFDLElBQUEsQ0FBQyxDQUFDOztFQUVSRCxJQUFJLFFBQVEsR0FBRyxDQUFDLEdBQUcsS0FBSyxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUM7RUFDeENBLElBQUksUUFBUSxHQUFHLENBQUMsR0FBRyxLQUFLLEdBQUcsUUFBUSxDQUFDO0VBQ3BDQSxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUM7RUFDL0JBLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7O0VBRTVCQSxJQUFJLEtBQUssR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDekNBLElBQUksS0FBSyxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUN4Q0EsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsQ0FBQyxDQUFDOztFQUUzQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7RUFDcEMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0VBRXJDLEtBQUtBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRTtFQUM3QjtHQUNDLEtBQUtBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtHQUMzQjtJQUNDQSxJQUFJLE1BQU0sR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7OztJQUd0QyxLQUFLLENBQUMsR0FBRyxDQUFDO0tBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNyQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0lBRVgsS0FBSyxDQUFDLEdBQUcsQ0FBQztLQUNULE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN0QyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0lBRVhBLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckNBLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckNBLElBQUksUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNqRUEsSUFBSSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2pFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNWLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3ZCOzs7SUFHRCxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQ1Y7S0FDQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNoRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNoRDs7SUFFRDtLQUNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOztLQUVsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNsRDtJQUNEOzs7R0FHREEsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7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
