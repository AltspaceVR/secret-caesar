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
	pos_0: new THREE.Vector3(0.533, 0.76, -0.336),
	pos_1: new THREE.Vector3(0.263, 0.76, -0.336),
	pos_2: new THREE.Vector3(-.007, 0.76, -0.336),
	pos_3: new THREE.Vector3(-.279, 0.76, -0.336),
	pos_4: new THREE.Vector3(-.552, 0.76, -0.336),
	quat: new THREE.Quaternion(0, 0.7071067811865475, 0.7071067811865475, 0),
	scale: new THREE.Vector3(0.7, 0.7, 0.7)
};

var FascistPolicyCard = (function (Card) {
	function FascistPolicyCard(){
		Card.call(this, Types.POLICY_FASCIST, false);
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
	pos_0: new THREE.Vector3(-.687, 0.76, 0.341),
	pos_1: new THREE.Vector3(-.417, 0.76, 0.341),
	pos_2: new THREE.Vector3(-.146, 0.76, 0.341),
	pos_3: new THREE.Vector3(0.127, 0.76, 0.341),
	pos_4: new THREE.Vector3(0.400, 0.76, 0.341),
	pos_5: new THREE.Vector3(0.673, 0.76, 0.341),
	quat: new THREE.Quaternion(-0.7071067811865475, 0, 0, 0.7071067811865475),
	scale: new THREE.Vector3(0.7, 0.7, 0.7)
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
		var ref_data_game = ref.data.game;
		var liberalPolicies = ref_data_game.liberalPolicies;
		var fascistPolicies = ref_data_game.fascistPolicies;


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

		if(game.state === 'lameDuck'){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvcG9seWZpbGwuanMiLCIuLi8uLi9zcmMvY2xpZW50L2Fzc2V0bWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L25hdGl2ZWNvbXBvbmVudHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RhYmxlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC91dGlscy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3Rwcm9jZXNzb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JwYmEuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JhbGxvdC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVyaW5mby5qcyIsIi4uLy4uL3NyYy9jbGllbnQvY2Fwc3VsZWdlb21ldHJ5LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9oaXRib3guanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlYXQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NvbnRpbnVlYm94LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWNyZXRoaXRsZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5pZighQXJyYXkucHJvdG90eXBlLmluY2x1ZGVzKXtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgJ2luY2x1ZGVzJywge1xuXHRcdHZhbHVlOiBmdW5jdGlvbihpdGVtKXtcblx0XHRcdHJldHVybiB0aGlzLmluZGV4T2YoaXRlbSkgPiAtMTtcblx0XHR9LFxuXHRcdHdyaXRhYmxlOiBmYWxzZSxcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRjb25maWd1cmFibGU6IGZhbHNlXG5cdH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCB7XG5cdG1hbmlmZXN0OiB7XG5cdFx0bW9kZWxzOiB7XG5cdFx0XHR0YWJsZTogJ3N0YXRpYy9tb2RlbC90YWJsZS5nbHRmJyxcblx0XHRcdG5hbWVwbGF0ZTogJ3N0YXRpYy9tb2RlbC9uYW1lcGxhdGUuZGFlJyxcblx0XHRcdHRvcGhhdDogJ3N0YXRpYy9tb2RlbC90b3BoYXQuZ2x0ZicsXG5cdFx0XHR2aXNvcmNhcDogJ3N0YXRpYy9tb2RlbC92aXNvcl9jYXAuZ2x0ZicsXG5cdFx0XHQvL2R1bW15OiAnc3RhdGljL21vZGVsL2R1bW15LmdsdGYnLFxuXHRcdFx0Ly9wbGF5ZXJtZXRlcjogJ3N0YXRpYy9tb2RlbC9wbGF5ZXJtZXRlci5nbHRmJ1xuXHRcdH0sXG5cdFx0dGV4dHVyZXM6IHtcblx0XHRcdGJvYXJkX2xhcmdlOiAnc3RhdGljL2ltZy9ib2FyZC1sYXJnZS5qcGcnLFxuXHRcdFx0Ym9hcmRfbWVkOiAnc3RhdGljL2ltZy9ib2FyZC1tZWRpdW0uanBnJyxcblx0XHRcdGJvYXJkX3NtYWxsOiAnc3RhdGljL2ltZy9ib2FyZC1zbWFsbC5qcGcnLFxuXHRcdFx0Y2FyZHM6ICdzdGF0aWMvaW1nL2NhcmRzLnBuZycsXG5cdFx0XHRyZXNldDogJ3N0YXRpYy9pbWcvYm9tYi5wbmcnLFxuXHRcdFx0dGV4dDogJ3N0YXRpYy9pbWcvdGV4dC5wbmcnXG5cdFx0fVxuXHR9LFxuXHRjYWNoZToge30sXG5cdGZpeE1hdGVyaWFsczogZnVuY3Rpb24oKVxuXHR7XG5cdFx0T2JqZWN0LmtleXModGhpcy5jYWNoZS5tb2RlbHMpLmZvckVhY2goaWQgPT4ge1xuXHRcdFx0dGhpcy5jYWNoZS5tb2RlbHNbaWRdLnRyYXZlcnNlKG9iaiA9PiB7XG5cdFx0XHRcdGlmKG9iai5tYXRlcmlhbCBpbnN0YW5jZW9mIFRIUkVFLk1lc2hTdGFuZGFyZE1hdGVyaWFsKXtcblx0XHRcdFx0XHRsZXQgbmV3TWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKCk7XG5cdFx0XHRcdFx0bmV3TWF0Lm1hcCA9IG9iai5tYXRlcmlhbC5tYXA7XG5cdFx0XHRcdFx0bmV3TWF0LmNvbG9yLmNvcHkob2JqLm1hdGVyaWFsLmNvbG9yKTtcblx0XHRcdFx0XHRvYmoubWF0ZXJpYWwgPSBuZXdNYXQ7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbmNsYXNzIEJlaGF2aW9yXG57XG5cdGNvbnN0cnVjdG9yKHR5cGUpe1xuXHRcdHRoaXMudHlwZSA9IHR5cGU7XG5cdH1cblxuXHRhd2FrZShvYmope1xuXHRcdHRoaXMub2JqZWN0M0QgPSBvYmo7XG5cdH1cblxuXHRzdGFydCgpeyB9XG5cblx0dXBkYXRlKGRUKXsgfVxuXG5cdGRpc3Bvc2UoKXsgfVxufVxuXG5jbGFzcyBCU3luYyBleHRlbmRzIEJlaGF2aW9yXG57XG5cdGNvbnN0cnVjdG9yKGV2ZW50TmFtZSlcblx0e1xuXHRcdHN1cGVyKCdCU3luYycpO1xuXHRcdHRoaXMuX3MgPSBTSC5zb2NrZXQ7XG5cblx0XHQvLyBsaXN0ZW4gZm9yIHVwZGF0ZSBldmVudHNcblx0XHR0aGlzLmhvb2sgPSB0aGlzLl9zLm9uKGV2ZW50TmFtZSwgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuZXZlbnROYW1lID0gZXZlbnROYW1lO1xuXHRcdHRoaXMub3duZXIgPSAwO1xuXHR9XG5cblx0dXBkYXRlRnJvbVNlcnZlcihkYXRhKVxuXHR7XG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XG5cdFx0dGhpcy5vYmplY3QzRC5yb3RhdGlvbi5mcm9tQXJyYXkoZGF0YSwgMyk7XG5cdH1cblxuXHR0YWtlT3duZXJzaGlwKClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlciAmJiBTSC5sb2NhbFVzZXIudXNlcklkKVxuXHRcdFx0dGhpcy5vd25lciA9IFNILmxvY2FsVXNlci51c2VySWQ7XG5cdH1cblxuXHR1cGRhdGUoZFQpXG5cdHtcblx0XHRpZihTSC5sb2NhbFVzZXIgJiYgU0gubG9jYWxVc2VyLnNrZWxldG9uICYmIFNILmxvY2FsVXNlci5pZCA9PT0gdGhpcy5vd25lcilcblx0XHR7XG5cdFx0XHRsZXQgaiA9IFNILmxvY2FsVXNlci5za2VsZXRvbi5nZXRKb2ludCgnSGVhZCcpO1xuXHRcdFx0dGhpcy5fcy5lbWl0KHRoaXMuZXZlbnROYW1lLCBbLi4uai5wb3NpdGlvbi50b0FycmF5KCksIC4uLmoucm90YXRpb24udG9BcnJheSgpXSk7XG5cdFx0fVxuXHR9XG5cbn1cblxuZXhwb3J0IHsgQmVoYXZpb3IsIEJTeW5jIH07XG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgeyBCZWhhdmlvciB9IGZyb20gJy4vYmVoYXZpb3InO1xyXG5cclxuY2xhc3MgQW5pbWF0ZSBleHRlbmRzIEJlaGF2aW9yXHJcbntcclxuXHRjb25zdHJ1Y3RvcigvL3twYXJlbnQsIHBvcywgcXVhdCwgc2NhbGUsIG1hdHJpeCwgZHVyYXRpb24sIGNhbGxiYWNrfVxyXG5cdFx0e3BhcmVudD1udWxsLCBwb3M9bnVsbCwgcXVhdD1udWxsLCBzY2FsZT1udWxsLCBtYXRyaXg9bnVsbCwgZHVyYXRpb249NjAwLCBjYWxsYmFjaz0oKT0+e319KVxyXG5cdHtcclxuXHRcdHN1cGVyKCdBbmltYXRlJyk7XHJcblx0XHRcclxuXHRcdGlmKG1hdHJpeClcclxuXHRcdHtcclxuXHRcdFx0Ly8gZXh0cmFjdCBwb3NpdGlvbi9yb3RhdGlvbi9zY2FsZSBmcm9tIG1hdHJpeFxyXG5cdFx0XHRwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRxdWF0ID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcclxuXHRcdFx0c2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xyXG5cdFx0XHRtYXRyaXguZGVjb21wb3NlKHBvcywgcXVhdCwgc2NhbGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywge3BhcmVudCwgcG9zLCBxdWF0LCBzY2FsZSwgZHVyYXRpb24sIGNhbGxiYWNrfSk7XHJcblx0fVxyXG5cclxuXHRhd2FrZShvYmopXHJcblx0e1xyXG5cdFx0c3VwZXIuYXdha2Uob2JqKTtcclxuXHJcblx0XHQvLyBzaHVmZmxlIGhpZXJhcmNoeSwgYnV0IGtlZXAgd29ybGQgdHJhbnNmb3JtIHRoZSBzYW1lXHJcblx0XHRpZih0aGlzLnBhcmVudCAmJiB0aGlzLnBhcmVudCAhPT0gb2JqLnBhcmVudClcclxuXHRcdHtcclxuXHRcdFx0b2JqLmFwcGx5TWF0cml4KG9iai5wYXJlbnQubWF0cml4V29ybGQpO1xyXG5cdFx0XHRsZXQgbWF0ID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5nZXRJbnZlcnNlKHRoaXMucGFyZW50Lm1hdHJpeFdvcmxkKTtcclxuXHRcdFx0b2JqLmFwcGx5TWF0cml4KG1hdCk7XHJcblxyXG5cdFx0XHR0aGlzLnBhcmVudC5hZGQob2JqKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyByZWFkIGluaXRpYWwgcG9zaXRpb25zXHJcblx0XHR0aGlzLmluaXRpYWxQb3MgPSBvYmoucG9zaXRpb24uY2xvbmUoKTtcclxuXHRcdHRoaXMuaW5pdGlhbFF1YXQgPSBvYmoucXVhdGVybmlvbi5jbG9uZSgpO1xyXG5cdFx0dGhpcy5pbml0aWFsU2NhbGUgPSBvYmouc2NhbGUuY2xvbmUoKTtcclxuXHRcdHRoaXMuc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZSgpXHJcblx0e1xyXG5cdFx0Ly8gY29tcHV0ZSBlYXNlLW91dCBiYXNlZCBvbiBkdXJhdGlvblxyXG5cdFx0bGV0IG1peCA9IChEYXRlLm5vdygpLXRoaXMuc3RhcnRUaW1lKSAvIHRoaXMuZHVyYXRpb247XHJcblx0XHRsZXQgZWFzZSA9IFRXRUVOID8gVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQgOiBuID0+IG4qKDItbik7XHJcblx0XHRtaXggPSBtaXggPCAxID8gZWFzZShtaXgpIDogMTtcclxuXHJcblx0XHQvLyBhbmltYXRlIHBvc2l0aW9uIGlmIHJlcXVlc3RlZFxyXG5cdFx0aWYoIHRoaXMucG9zICl7XHJcblx0XHRcdHRoaXMub2JqZWN0M0QucG9zaXRpb24ubGVycFZlY3RvcnModGhpcy5pbml0aWFsUG9zLCB0aGlzLnBvcywgbWl4KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBhbmltYXRlIHJvdGF0aW9uIGlmIHJlcXVlc3RlZFxyXG5cdFx0aWYoIHRoaXMucXVhdCApe1xyXG5cdFx0XHRUSFJFRS5RdWF0ZXJuaW9uLnNsZXJwKHRoaXMuaW5pdGlhbFF1YXQsIHRoaXMucXVhdCwgdGhpcy5vYmplY3QzRC5xdWF0ZXJuaW9uLCBtaXgpXHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gYW5pbWF0ZSBzY2FsZSBpZiByZXF1ZXN0ZWRcclxuXHRcdGlmKCB0aGlzLnNjYWxlICl7XHJcblx0XHRcdHRoaXMub2JqZWN0M0Quc2NhbGUubGVycFZlY3RvcnModGhpcy5pbml0aWFsU2NhbGUsIHRoaXMuc2NhbGUsIG1peCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gdGVybWluYXRlIGFuaW1hdGlvbiB3aGVuIGRvbmVcclxuXHRcdGlmKG1peCA+PSAxKXtcclxuXHRcdFx0dGhpcy5vYmplY3QzRC5yZW1vdmVCZWhhdmlvcih0aGlzKTtcclxuXHRcdFx0dGhpcy5jYWxsYmFjay5jYWxsKHRoaXMub2JqZWN0M0QpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuQW5pbWF0ZS5zdGFydCA9ICh0YXJnZXQsIG9wdHMpID0+XHJcbntcclxuXHRsZXQgb2xkQW5pbSA9IHRhcmdldC5nZXRCZWhhdmlvckJ5VHlwZSgnQW5pbWF0ZScpO1xyXG5cdGlmKG9sZEFuaW0pe1xyXG5cdFx0b2xkQW5pbS5jb25zdHJ1Y3RvcihvcHRzKTtcclxuXHRcdG9sZEFuaW0uYXdha2UodGFyZ2V0KTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHR0YXJnZXQuYWRkQmVoYXZpb3IoIG5ldyBBbmltYXRlKG9wdHMpICk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBBbmltYXRlO1xyXG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbi8vIGVudW0gY29uc3RhbnRzXG5sZXQgVHlwZXMgPSBPYmplY3QuZnJlZXplKHtcblx0UE9MSUNZX0xJQkVSQUw6IDAsXG5cdFBPTElDWV9GQVNDSVNUOiAxLFxuXHRST0xFX0xJQkVSQUw6IDIsXG5cdFJPTEVfRkFTQ0lTVDogMyxcblx0Uk9MRV9ISVRMRVI6IDQsXG5cdFBBUlRZX0xJQkVSQUw6IDUsXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXG5cdEpBOiA3LFxuXHRORUlOOiA4LFxuXHRCTEFOSzogOSxcblx0Q1JFRElUUzogMTBcbn0pO1xuXG5sZXQgZ2VvbWV0cnkgPSBudWxsLCBtYXRlcmlhbCA9IG51bGw7XG5cbmZ1bmN0aW9uIGluaXRDYXJkRGF0YSgpXG57XG5cdGxldCBmbG9hdERhdGEgPSBbXG5cdFx0Ly8gcG9zaXRpb24gKHBvcnRyYWl0KVxuXHRcdDAuMzU3NSwgMC41LCAwLjAwMDUsXG5cdFx0LS4zNTc1LCAwLjUsIDAuMDAwNSxcblx0XHQtLjM1NzUsIC0uNSwgMC4wMDA1LFxuXHRcdDAuMzU3NSwgLS41LCAwLjAwMDUsXG5cdFx0MC4zNTc1LCAwLjUsIC0uMDAwNSxcblx0XHQtLjM1NzUsIDAuNSwgLS4wMDA1LFxuXHRcdC0uMzU3NSwgLS41LCAtLjAwMDUsXG5cdFx0MC4zNTc1LCAtLjUsIC0uMDAwNSxcblx0XG5cdFx0Ly8gcG9zaXRpb24gKGxhbmRzY2FwZSlcblx0XHQwLjUsIC0uMzU3NSwgMC4wMDA1LFxuXHRcdDAuNSwgMC4zNTc1LCAwLjAwMDUsXG5cdFx0LS41LCAwLjM1NzUsIDAuMDAwNSxcblx0XHQtLjUsIC0uMzU3NSwgMC4wMDA1LFxuXHRcdDAuNSwgLS4zNTc1LCAtLjAwMDUsXG5cdFx0MC41LCAwLjM1NzUsIC0uMDAwNSxcblx0XHQtLjUsIDAuMzU3NSwgLS4wMDA1LFxuXHRcdC0uNSwgLS4zNTc1LCAtLjAwMDUsXG5cdFxuXHRcdC8vIFVWc1xuXHRcdC8qIC0tLS0tLS0tLS0tLS0tIGNhcmQgZmFjZSAtLS0tLS0tLS0tLS0tICovIC8qIC0tLS0tLS0tLS0tLS0gY2FyZCBiYWNrIC0tLS0tLS0tLS0tLS0tKi9cblx0XHQuNzU0LC45OTYsIC43NTQsLjgzNCwgLjk5NywuODM0LCAuOTk3LC45OTYsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbGliZXJhbCBwb2xpY3lcblx0XHQuNzU0LC44MjIsIC43NTQsLjY2MCwgLjk5NiwuNjYwLCAuOTk2LC44MjIsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gZmFzY2lzdCBwb2xpY3lcblx0XHQuNzQ2LC45OTYsIC41MDUsLjk5NiwgLjUwNSwuNjUwLCAuNzQ2LC42NTAsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbGliZXJhbCByb2xlXG5cdFx0Ljc0NiwuNjQ1LCAuNTA1LC42NDUsIC41MDUsLjMwMCwgLjc0NiwuMzAwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGZhc2Npc3Qgcm9sZVxuXHRcdC45OTYsLjY0NSwgLjc1NCwuNjQ1LCAuNzU0LC4zMDAsIC45OTYsLjMwMCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBoaXRsZXIgcm9sZVxuXHRcdC40OTUsLjk5NiwgLjI1NSwuOTk2LCAuMjU1LC42NTAsIC40OTUsLjY1MCwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBsaWJlcmFsIHBhcnR5XG5cdFx0LjQ5NSwuNjQ1LCAuMjU1LC42NDUsIC4yNTUsLjMwMCwgLjQ5NSwuMzAwLCAuMDIxLC4wMjIsIC4wMjEsLjI2OSwgLjM3NSwuMjY5LCAuMzc1LC4wMjIsIC8vIGZhc2Npc3QgcGFydHlcblx0XHQuMjQ0LC45OTIsIC4wMDUsLjk5MiwgLjAwNSwuNjUzLCAuMjQ0LC42NTMsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gamFcblx0XHQuMjQzLC42NDIsIC4wMDYsLjY0MiwgLjAwNiwuMzAyLCAuMjQzLC4zMDIsIC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLy8gbmVpblxuXHRcdC4wMjEsLjAyMiwgLjAyMSwuMjY5LCAuMzc1LC4yNjksIC4zNzUsLjAyMiwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBibGFua1xuXHRcdC4zOTcsLjI3NiwgLjM5NywuMDE1LCAuNzY1LC4wMTUsIC43NjUsLjI3NiwgLjAyMSwuMDIyLCAuMDIxLC4yNjksIC4zNzUsLjI2OSwgLjM3NSwuMDIyLCAvLyBjcmVkaXRzXG5cdF07XG5cdFxuXHRsZXQgaW50RGF0YSA9IFtcblx0XHQvLyB0cmlhbmdsZSBpbmRleFxuXHRcdDAsMSwyLCAwLDIsMywgNCw3LDUsIDUsNyw2XG5cdF07XG5cdFxuXHQvLyB0d28gcG9zaXRpb24gc2V0cywgMTEgVVYgc2V0cywgMSBpbmRleCBzZXRcblx0bGV0IGdlb0J1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcig0KmZsb2F0RGF0YS5sZW5ndGggKyAyKmludERhdGEubGVuZ3RoKTtcblx0bGV0IHRlbXAgPSBuZXcgRmxvYXQzMkFycmF5KGdlb0J1ZmZlciwgMCwgZmxvYXREYXRhLmxlbmd0aCk7XG5cdHRlbXAuc2V0KGZsb2F0RGF0YSk7XG5cdHRlbXAgPSBuZXcgVWludDE2QXJyYXkoZ2VvQnVmZmVyLCA0KmZsb2F0RGF0YS5sZW5ndGgsIGludERhdGEubGVuZ3RoKTtcblx0dGVtcC5zZXQoaW50RGF0YSk7XG5cdFxuXHQvLyBjaG9wIHVwIGJ1ZmZlciBpbnRvIHZlcnRleCBhdHRyaWJ1dGVzXG5cdGxldCBwb3NMZW5ndGggPSA4KjMsIHV2TGVuZ3RoID0gOCoyLCBpbmRleExlbmd0aCA9IDEyO1xuXHRsZXQgcG9zUG9ydHJhaXQgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCAwLCBwb3NMZW5ndGgpLCAzKSxcblx0XHRwb3NMYW5kc2NhcGUgPSBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKG5ldyBGbG9hdDMyQXJyYXkoZ2VvQnVmZmVyLCA0KnBvc0xlbmd0aCwgcG9zTGVuZ3RoKSwgMyk7XG5cdGxldCB1dnMgPSBbXTtcblx0Zm9yKGxldCBpPTA7IGk8MTE7IGkrKyl7XG5cdFx0dXZzLnB1c2goIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheShnZW9CdWZmZXIsIDgqcG9zTGVuZ3RoICsgNCppKnV2TGVuZ3RoLCB1dkxlbmd0aCksIDIpICk7XG5cdH1cblx0bGV0IGluZGV4ID0gbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgVWludDE2QXJyYXkoZ2VvQnVmZmVyLCA0KmZsb2F0RGF0YS5sZW5ndGgsIGluZGV4TGVuZ3RoKSwgMSk7XG5cdFxuXHRnZW9tZXRyeSA9IE9iamVjdC5rZXlzKFR5cGVzKS5tYXAoKGtleSwgaSkgPT5cblx0e1xuXHRcdGxldCBnZW8gPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcblx0XHRnZW8uYWRkQXR0cmlidXRlKCdwb3NpdGlvbicsIGk9PVR5cGVzLkpBIHx8IGk9PVR5cGVzLk5FSU4gPyBwb3NMYW5kc2NhcGUgOiBwb3NQb3J0cmFpdCk7XG5cdFx0Z2VvLmFkZEF0dHJpYnV0ZSgndXYnLCB1dnNbaV0pO1xuXHRcdGdlby5zZXRJbmRleChpbmRleCk7XG5cdFx0cmV0dXJuIGdlbztcblx0fSk7XG5cblx0bWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogQXNzZXRNYW5hZ2VyLmNhY2hlLnRleHR1cmVzLmNhcmRzfSk7XG59XG5cblxuY2xhc3MgQ2FyZCBleHRlbmRzIFRIUkVFLk1lc2hcbntcblx0Y29uc3RydWN0b3IodHlwZSA9IFR5cGVzLkJMQU5LKVxuXHR7XG5cdFx0aWYoIWdlb21ldHJ5IHx8ICFtYXRlcmlhbCkgaW5pdENhcmREYXRhKCk7XG5cblx0XHRsZXQgZ2VvID0gZ2VvbWV0cnlbdHlwZV07XG5cdFx0c3VwZXIoZ2VvLCBtYXRlcmlhbCk7XG5cdFx0dGhpcy5zY2FsZS5zZXRTY2FsYXIoMC43KTtcblx0fVxufVxuXG5jbGFzcyBCbGFua0NhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXsgc3VwZXIoKTsgfVxufVxuXG5jbGFzcyBDcmVkaXRzQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLkNSRURJVFMpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGUgPT4gdGhpcy52aXNpYmxlID0gZS5kYXRhLmdhbWUuc3RhdGUgPT09ICdzZXR1cCcpO1xuXHR9XG59XG5cbmNsYXNzIExpYmVyYWxQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0xJQkVSQUwsIGZhbHNlKTtcblx0fVxuXHRnb1RvUG9zaXRpb24oc3BvdCA9IDApXG5cdHtcblx0XHRzcG90ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oNCwgc3BvdCkpO1xuXHRcdGxldCBzID0gTGliZXJhbFBvbGljeUNhcmQuc3BvdHM7XG5cdFx0QW5pbWF0ZS5zdGFydCh0aGlzLCB7cGFyZW50OiBBc3NldE1hbmFnZXIucm9vdCwgcG9zOiBzWydwb3NfJytzcG90XSwgcXVhdDogcy5xdWF0LCBzY2FsZTogcy5zY2FsZX0pO1xuXHR9XG59XG5cbkxpYmVyYWxQb2xpY3lDYXJkLnNwb3RzID0ge1xuXHRwb3NfMDogbmV3IFRIUkVFLlZlY3RvcjMoMC41MzMsIDAuNzYsIC0wLjMzNiksXG5cdHBvc18xOiBuZXcgVEhSRUUuVmVjdG9yMygwLjI2MywgMC43NiwgLTAuMzM2KSxcblx0cG9zXzI6IG5ldyBUSFJFRS5WZWN0b3IzKC0uMDA3LCAwLjc2LCAtMC4zMzYpLFxuXHRwb3NfMzogbmV3IFRIUkVFLlZlY3RvcjMoLS4yNzksIDAuNzYsIC0wLjMzNiksXG5cdHBvc180OiBuZXcgVEhSRUUuVmVjdG9yMygtLjU1MiwgMC43NiwgLTAuMzM2KSxcblx0cXVhdDogbmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMC43MDcxMDY3ODExODY1NDc1LCAwLjcwNzEwNjc4MTE4NjU0NzUsIDApLFxuXHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMC43LCAwLjcsIDAuNylcbn1cblxuY2xhc3MgRmFzY2lzdFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfRkFTQ0lTVCwgZmFsc2UpO1xuXHR9XG5cdGdvVG9Qb3NpdGlvbihzcG90ID0gMClcblx0e1xuXHRcdHNwb3QgPSBNYXRoLm1heCgwLCBNYXRoLm1pbig1LCBzcG90KSk7XG5cdFx0bGV0IHMgPSBGYXNjaXN0UG9saWN5Q2FyZC5zcG90cztcblx0XHRBbmltYXRlLnN0YXJ0KHRoaXMsIHtwYXJlbnQ6IEFzc2V0TWFuYWdlci5yb290LCBwb3M6IHNbJ3Bvc18nK3Nwb3RdLCBxdWF0OiBzLnF1YXQsIHNjYWxlOiBzLnNjYWxlfSk7XG5cdH1cbn1cblxuRmFzY2lzdFBvbGljeUNhcmQuc3BvdHMgPSB7XG5cdHBvc18wOiBuZXcgVEhSRUUuVmVjdG9yMygtLjY4NywgMC43NiwgMC4zNDEpLFxuXHRwb3NfMTogbmV3IFRIUkVFLlZlY3RvcjMoLS40MTcsIDAuNzYsIDAuMzQxKSxcblx0cG9zXzI6IG5ldyBUSFJFRS5WZWN0b3IzKC0uMTQ2LCAwLjc2LCAwLjM0MSksXG5cdHBvc18zOiBuZXcgVEhSRUUuVmVjdG9yMygwLjEyNywgMC43NiwgMC4zNDEpLFxuXHRwb3NfNDogbmV3IFRIUkVFLlZlY3RvcjMoMC40MDAsIDAuNzYsIDAuMzQxKSxcblx0cG9zXzU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNjczLCAwLjc2LCAwLjM0MSksXG5cdHF1YXQ6IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKC0wLjcwNzEwNjc4MTE4NjU0NzUsIDAsIDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSksXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjcsIDAuNywgMC43KVxufVxuXG5jbGFzcyBMaWJlcmFsUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5ST0xFX0xJQkVSQUwpO1xuXHR9XG59XG5cbmNsYXNzIEZhc2Npc3RSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfRkFTQ0lTVCk7XG5cdH1cbn1cblxuY2xhc3MgSGl0bGVyUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5ST0xFX0hJVExFUik7XG5cdH1cbn1cblxuY2xhc3MgTGliZXJhbFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0xJQkVSQUwpO1xuXHR9XG59XG5cbmNsYXNzIEZhc2Npc3RQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9GQVNDSVNUKTtcblx0fVxufVxuXG5jbGFzcyBKYUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5KQSk7XG5cdH1cbn1cblxuY2xhc3MgTmVpbkNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5ORUlOKTtcblx0fVxufVxuXG5cbmV4cG9ydCB7XG5cdENhcmQsIFR5cGVzLCBCbGFua0NhcmQsIENyZWRpdHNDYXJkLFxuXHRMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFJvbGVDYXJkLFxuXHRIaXRsZXJSb2xlQ2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZFxufTtcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmxldCBwbGFjZWhvbGRlckdlbyA9IG5ldyBUSFJFRS5Cb3hCdWZmZXJHZW9tZXRyeSguMDAxLCAuMDAxLCAuMDAxKTtcclxubGV0IHBsYWNlaG9sZGVyTWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHhmZmZmZmYsIHZpc2libGU6IGZhbHNlfSk7XHJcbmxldCBQbGFjZWhvbGRlck1lc2ggPSBuZXcgVEhSRUUuTWVzaChwbGFjZWhvbGRlckdlbywgcGxhY2Vob2xkZXJNYXQpO1xyXG5cclxuY2xhc3MgTmF0aXZlQ29tcG9uZW50XHJcbntcclxuXHRjb25zdHJ1Y3RvcihtZXNoLCBuZWVkc1VwZGF0ZSlcclxuXHR7XHJcblx0XHR0aGlzLm1lc2ggPSBtZXNoO1xyXG5cdFx0YWx0c3BhY2UuYWRkTmF0aXZlQ29tcG9uZW50KHRoaXMubWVzaCwgdGhpcy5uYW1lKTtcclxuXHJcblx0XHRpZihuZWVkc1VwZGF0ZSlcclxuXHRcdFx0dGhpcy51cGRhdGUoKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZShmaWVsZHMgPSB7fSlcclxuXHR7XHJcblx0XHRPYmplY3QuYXNzaWduKHRoaXMuZGF0YSwgZmllbGRzKTtcclxuXHRcdGFsdHNwYWNlLnVwZGF0ZU5hdGl2ZUNvbXBvbmVudCh0aGlzLm1lc2gsIHRoaXMubmFtZSwgdGhpcy5kYXRhKTtcclxuXHR9XHJcblxyXG5cdGRlc3Ryb3koKVxyXG5cdHtcclxuXHRcdGFsdHNwYWNlLnJlbW92ZU5hdGl2ZUNvbXBvbmVudCh0aGlzLm1lc2gsIHRoaXMubmFtZSk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBOVGV4dCBleHRlbmRzIE5hdGl2ZUNvbXBvbmVudCB7XHJcblx0Y29uc3RydWN0b3IobWVzaCl7XHJcblx0XHR0aGlzLm5hbWUgPSAnbi10ZXh0JztcclxuXHRcdHRoaXMuZGF0YSA9IHtcclxuXHRcdFx0Zm9udFNpemU6IDEwLFxyXG5cdFx0XHRoZWlnaHQ6IDEsXHJcblx0XHRcdHdpZHRoOiAxMCxcclxuXHRcdFx0dmVydGljYWxBbGlnbjogJ21pZGRsZScsXHJcblx0XHRcdGhvcml6b250YWxBbGlnbjogJ21pZGRsZScsXHJcblx0XHRcdHRleHQ6ICcnXHJcblx0XHR9O1xyXG5cdFx0c3VwZXIobWVzaCwgdHJ1ZSk7XHJcblxyXG5cdFx0dGhpcy5jb2xvciA9ICdibGFjayc7XHJcblx0fVxyXG5cdHVwZGF0ZShmaWVsZHMgPSB7fSl7XHJcblx0XHRpZihmaWVsZHMudGV4dClcclxuXHRcdFx0ZmllbGRzLnRleHQgPSBgPGNvbG9yPSR7dGhpcy5jb2xvcn0+JHtmaWVsZHMudGV4dH08L2NvbG9yPmA7XHJcblx0XHROYXRpdmVDb21wb25lbnQucHJvdG90eXBlLnVwZGF0ZS5jYWxsKHRoaXMsIGZpZWxkcyk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBOU2tlbGV0b25QYXJlbnQgZXh0ZW5kcyBOYXRpdmVDb21wb25lbnQge1xyXG5cdGNvbnN0cnVjdG9yKG1lc2gpe1xyXG5cdFx0dGhpcy5uYW1lID0gJ24tc2tlbGV0b24tcGFyZW50JztcclxuXHRcdHRoaXMuZGF0YSA9IHtcclxuXHRcdFx0aW5kZXg6IDAsXHJcblx0XHRcdHBhcnQ6ICdoZWFkJyxcclxuXHRcdFx0c2lkZTogJ2NlbnRlcicsIFxyXG5cdFx0XHR1c2VySWQ6IDBcclxuXHRcdH07XHJcblx0XHRzdXBlcihtZXNoLCB0cnVlKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIE5CaWxsYm9hcmQgZXh0ZW5kcyBOYXRpdmVDb21wb25lbnQge1xyXG5cdGNvbnN0cnVjdG9yKG1lc2gpe1xyXG5cdFx0dGhpcy5uYW1lID0gJ24tYmlsbGJvYXJkJztcclxuXHRcdHN1cGVyKG1lc2gsIGZhbHNlKTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7UGxhY2Vob2xkZXJNZXNoLCBOVGV4dCwgTlNrZWxldG9uUGFyZW50LCBOQmlsbGJvYXJkfTsiLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtOU2tlbGV0b25QYXJlbnR9IGZyb20gJy4vbmF0aXZlY29tcG9uZW50cyc7XG5cbmNsYXNzIEhhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKG1vZGVsKVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmN1cnJlbnRJZCA9ICcnO1xuXHRcdHRoaXMuY29tcG9uZW50cyA9IHtoYXQ6IG51bGwsIHRleHQ6IG51bGx9O1xuXG5cdFx0aWYobW9kZWwucGFyZW50KVxuXHRcdFx0bW9kZWwucGFyZW50LnJlbW92ZShtb2RlbCk7XG5cdFx0bW9kZWwudXBkYXRlTWF0cml4V29ybGQodHJ1ZSk7XG5cblx0XHQvLyBncmFiIG1lc2hlc1xuXHRcdGxldCBwcm9wID0gJyc7XG5cdFx0bW9kZWwudHJhdmVyc2Uob2JqID0+IHtcblx0XHRcdGlmKG9iai5uYW1lID09PSAnaGF0JyB8fCBvYmoubmFtZSA9PT0gJ3RleHQnKVxuXHRcdFx0XHRwcm9wID0gb2JqLm5hbWU7XG5cdFx0XHRlbHNlIGlmKG9iaiBpbnN0YW5jZW9mIFRIUkVFLk1lc2gpXG5cdFx0XHRcdHRoaXNbcHJvcF0gPSBvYmo7XG5cdFx0fSk7XG5cblx0XHQvLyBzdHJpcCBvdXQgbWlkZGxlIG5vZGVzXG5cdFx0dGhpcy5oYXQubWF0cml4LmNvcHkodGhpcy5oYXQubWF0cml4V29ybGQpO1xuXHRcdHRoaXMuaGF0Lm1hdHJpeC5kZWNvbXBvc2UodGhpcy5oYXQucG9zaXRpb24sIHRoaXMuaGF0LnF1YXRlcm5pb24sIHRoaXMuaGF0LnNjYWxlKTtcblx0XHR0aGlzLmFkZCh0aGlzLmhhdCk7XG5cblx0XHR0aGlzLnRleHQubWF0cml4LmNvcHkodGhpcy50ZXh0Lm1hdHJpeFdvcmxkKTtcblx0XHR0aGlzLnRleHQubWF0cml4LmRlY29tcG9zZSh0aGlzLnRleHQucG9zaXRpb24sIHRoaXMudGV4dC5xdWF0ZXJuaW9uLCB0aGlzLnRleHQuc2NhbGUpO1xuXHRcdHRoaXMuYWRkKHRoaXMudGV4dCk7XG5cblx0XHRkLnNjZW5lLmFkZCh0aGlzKTtcblx0fVxuXG5cdHNldE93bmVyKHVzZXJJZClcblx0e1xuXHRcdGlmKCF0aGlzLmN1cnJlbnRJZCAmJiB1c2VySWQpe1xuXHRcdFx0ZC5zY2VuZS5hZGQodGhpcyk7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHMuaGF0ID0gbmV3IE5Ta2VsZXRvblBhcmVudCh0aGlzLmhhdCk7XG5cdFx0XHR0aGlzLmNvbXBvbmVudHMudGV4dCA9IG5ldyBOU2tlbGV0b25QYXJlbnQodGhpcy50ZXh0KTtcblx0XHR9XG5cdFx0ZWxzZSBpZih0aGlzLmN1cnJlbnRJZCAmJiAhdXNlcklkKXtcblx0XHRcdHRoaXMuY29tcG9uZW50cy5oYXQuZGVzdHJveSgpO1xuXHRcdFx0dGhpcy5jb21wb25lbnRzLnRleHQuZGVzdHJveSgpO1xuXHRcdFx0ZC5zY2VuZS5yZW1vdmUodGhpcyk7XG5cdFx0fVxuXG5cdFx0aWYodXNlcklkKXtcblx0XHRcdHRoaXMuY29tcG9uZW50cy5oYXQudXBkYXRlKHt1c2VySWR9KTtcblx0XHRcdHRoaXMuY29tcG9uZW50cy50ZXh0LnVwZGF0ZSh7dXNlcklkfSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5jdXJyZW50SWQgPSB1c2VySWQ7XG5cdH1cbn1cblxuY2xhc3MgUHJlc2lkZW50SGF0IGV4dGVuZHMgSGF0XG57XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLnRvcGhhdCk7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4xNDQvU0guZW52LnBpeGVsc1Blck1ldGVyLCAuMDM4L1NILmVudi5waXhlbHNQZXJNZXRlcik7XG5cdFx0dGhpcy5zY2FsZS5tdWx0aXBseVNjYWxhcigxLjIvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHRcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGFzdFByZXNpZGVudCcsIGUgPT4ge1xuXHRcdFx0dGhpcy5zZXRPd25lcihlLmRhdGEuZ2FtZS5sYXN0UHJlc2lkZW50KTtcblx0XHR9KTtcblx0fVxufTtcblxuY2xhc3MgQ2hhbmNlbGxvckhhdCBleHRlbmRzIEhhdFxue1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKEFNLmNhY2hlLm1vZGVscy52aXNvcmNhcCk7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4wNy9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcblx0XHR0aGlzLnNjYWxlLm11bHRpcGx5U2NhbGFyKDEuMi9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xuXHRcdFxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9sYXN0Q2hhbmNlbGxvcicsIGUgPT4ge1xuXHRcdFx0dGhpcy5zZXRPd25lcihlLmRhdGEuZ2FtZS5sYXN0Q2hhbmNlbGxvcik7XG5cdFx0fSk7XG5cdH1cbn1cblxuZXhwb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtDYXJkLCBUeXBlcyBhcyBDYXJkVHlwZXN9IGZyb20gJy4vY2FyZCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVUYWJsZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyB0YWJsZSBzdGF0ZVxuXHRcdHRoaXMubGliZXJhbENhcmRzID0gMDtcblx0XHR0aGlzLmZhc2Npc3RDYXJkcyA9IDA7XG5cdFx0dGhpcy5mYWlsZWRWb3RlcyA9IDA7XG5cblx0XHQvLyBhZGQgdGFibGUgYXNzZXRcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnRhYmxlO1xuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xuXG5cdFx0Ly8gc2F2ZSByZWZlcmVuY2VzIHRvIHRoZSB0ZXh0dXJlc1xuXHRcdHRoaXMudGV4dHVyZXMgPSBbXG5cdFx0XHRBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9zbWFsbCxcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX21lZCxcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX2xhcmdlXG5cdFx0XTtcblx0XHR0aGlzLnRleHR1cmVzLmZvckVhY2godGV4ID0+IHRleC5mbGlwWSA9IGZhbHNlKTtcblx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1swXSwgdHJ1ZSk7XG5cdFx0XG5cdFx0Ly8gcG9zaXRpb24gdGFibGVcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjgsIDApO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMuY2hhbmdlTW9kZS5iaW5kKHRoaXMpKTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGliZXJhbFBvbGljaWVzJywgdGhpcy51cGRhdGVQb2xpY2llcy5iaW5kKHRoaXMpKTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfZmFzY2lzdFBvbGljaWVzJywgdGhpcy51cGRhdGVQb2xpY2llcy5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdGNoYW5nZU1vZGUoe2RhdGE6IHtnYW1lOiB7c3RhdGUsIHR1cm5PcmRlcn19fSlcblx0e1xuXHRcdGlmKHN0YXRlID09PSAnc2V0dXAnKXtcblx0XHRcdGlmKHR1cm5PcmRlci5sZW5ndGggPj0gOSlcblx0XHRcdFx0dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbMl0pO1xuXHRcdFx0ZWxzZSBpZih0dXJuT3JkZXIubGVuZ3RoID49IDcpXG5cdFx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzFdKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbMF0pO1xuXHRcdH1cblx0fVxuXG5cdHNldFRleHR1cmUobmV3VGV4LCBzd2l0Y2hMaWdodG1hcClcblx0e1xuXHRcdHRoaXMubW9kZWwudHJhdmVyc2UobyA9PiB7XG5cdFx0XHRpZihvIGluc3RhbmNlb2YgVEhSRUUuTWVzaClcblx0XHRcdHtcblx0XHRcdFx0aWYoc3dpdGNoTGlnaHRtYXApXG5cdFx0XHRcdFx0by5tYXRlcmlhbC5saWdodE1hcCA9IG8ubWF0ZXJpYWwubWFwO1xuXG5cdFx0XHRcdG8ubWF0ZXJpYWwubWFwID0gbmV3VGV4O1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0dXBkYXRlUG9saWNpZXMoe2RhdGE6IHtnYW1lOiB7bGliZXJhbFBvbGljaWVzLCBmYXNjaXN0UG9saWNpZXN9fX0pXG5cdHtcblxuXHR9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5mdW5jdGlvbiBnZXRHYW1lSWQoKVxue1xuXHQvLyBmaXJzdCBjaGVjayB0aGUgdXJsXG5cdGxldCByZSA9IC9bPyZdZ2FtZUlkPShbXiZdKykvLmV4ZWMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG5cdGlmKHJlKXtcblx0XHRyZXR1cm4gcmVbMV07XG5cdH1cblx0ZWxzZSBpZihhbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudCl7XG5cdFx0cmV0dXJuIFNILmVudi5zaWQ7XG5cdH1cblx0ZWxzZSB7XG5cdFx0bGV0IGlkID0gTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwMCApO1xuXHRcdHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKCc/Z2FtZUlkPScraWQpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHBhcnNlQ1NWKHN0cil7XG5cdGlmKCFzdHIpIHJldHVybiBbXTtcblx0ZWxzZSByZXR1cm4gc3RyLnNwbGl0KCcsJyk7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlUXVlc3Rpb24odGV4dCwgdGV4dHVyZSA9IG51bGwpXG57XG5cdGxldCBmb250U3RhY2sgPSAnXCJIZWx2ZXRpY2EgTmV1ZVwiLCBIZWx2ZXRpY2EsIEFyaWFsLCBTYW5zLVNlcmlmJztcblxuXHQvLyBzZXQgdXAgY2FudmFzXG5cdGxldCBibXA7XG5cdGlmKCF0ZXh0dXJlKXtcblx0XHRibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHRibXAud2lkdGggPSA1MTI7XG5cdFx0Ym1wLmhlaWdodCA9IDI1Njtcblx0fVxuXHRlbHNlIHtcblx0XHRibXAgPSB0ZXh0dXJlLmltYWdlO1xuXHR9XG5cblx0bGV0IGcgPSBibXAuZ2V0Q29udGV4dCgnMmQnKTtcblx0Zy5jbGVhclJlY3QoMCwgMCwgNTEyLCAyNTYpO1xuXHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xuXHRnLmZpbGxTdHlsZSA9ICdibGFjayc7XG5cblx0Ly8gd3JpdGUgdGV4dFxuXHRnLmZvbnQgPSAnYm9sZCA1MHB4ICcrZm9udFN0YWNrO1xuXHRsZXQgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcblx0Zm9yKGxldCBpPTA7IGk8bGluZXMubGVuZ3RoOyBpKyspe1xuXHRcdGcuZmlsbFRleHQobGluZXNbaV0sIDI1NiwgNTArNTUqaSk7XG5cdH1cblxuXHRpZih0ZXh0dXJlKXtcblx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcblx0XHRyZXR1cm4gdGV4dHVyZTtcblx0fVxuXHRlbHNlIHtcblx0XHRyZXR1cm4gbmV3IFRIUkVFLkNhbnZhc1RleHR1cmUoYm1wKTtcblx0fVxufVxuXG5mdW5jdGlvbiBtZXJnZU9iamVjdHMoYSwgYiwgZGVwdGg9Milcbntcblx0ZnVuY3Rpb24gdW5pcXVlKGUsIGksIGEpe1xuXHRcdHJldHVybiBhLmluZGV4T2YoZSkgPT09IGk7XG5cdH1cblxuXHRsZXQgYUlzT2JqID0gYSBpbnN0YW5jZW9mIE9iamVjdCwgYklzT2JqID0gYiBpbnN0YW5jZW9mIE9iamVjdDtcblx0aWYoYUlzT2JqICYmIGJJc09iaiAmJiBkZXB0aCA+IDApXG5cdHtcblx0XHRsZXQgcmVzdWx0ID0ge307XG5cdFx0bGV0IGtleXMgPSBbLi4uT2JqZWN0LmtleXMoYSksIC4uLk9iamVjdC5rZXlzKGIpXS5maWx0ZXIodW5pcXVlKTtcblx0XHRmb3IobGV0IGk9MDsgaTxrZXlzLmxlbmd0aDsgaSsrKXtcblx0XHRcdHJlc3VsdFtrZXlzW2ldXSA9IG1lcmdlT2JqZWN0cyhhW2tleXNbaV1dLCBiW2tleXNbaV1dLCBkZXB0aC0xKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXHRlbHNlIGlmKGIgIT09IHVuZGVmaW5lZClcblx0XHRyZXR1cm4gYjtcblx0ZWxzZVxuXHRcdHJldHVybiBhO1xufVxuXG5mdW5jdGlvbiBsYXRlVXBkYXRlKGZuKVxue1xuXHRyZXR1cm4gKC4uLmFyZ3MpID0+IHtcblx0XHRzZXRUaW1lb3V0KCgpID0+IGZuKC4uLmFyZ3MpLCAxNSk7XG5cdH07XG59XG5cbmV4cG9ydCB7IGdldEdhbWVJZCwgcGFyc2VDU1YsIGdlbmVyYXRlUXVlc3Rpb24sIG1lcmdlT2JqZWN0cywgbGF0ZVVwZGF0ZSB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTmFtZXBsYXRlIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC0wLjYzNSwgMC4yMik7XG5cdFx0c2VhdC5hZGQodGhpcyk7XG5cblx0XHQvLyBhZGQgM2QgbW9kZWxcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLm5hbWVwbGF0ZS5jaGlsZHJlblswXS5jbG9uZSgpO1xuXHRcdHRoaXMubW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJLzIsIDAsIE1hdGguUEkvMik7XG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHQvLyBnZW5lcmF0ZSBtYXRlcmlhbFxuXHRcdHRoaXMuYm1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy5ibXAud2lkdGggPSBOYW1lcGxhdGUudGV4dHVyZVNpemU7XG5cdFx0dGhpcy5ibXAuaGVpZ2h0ID0gTmFtZXBsYXRlLnRleHR1cmVTaXplIC8gMjtcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcblx0XHRcdG1hcDogbmV3IFRIUkVFLkNhbnZhc1RleHR1cmUodGhpcy5ibXApXG5cdFx0fSk7XG5cblx0XHQvLyBjcmVhdGUgbGlzdGVuZXIgcHJveGllc1xuXHRcdHRoaXMuX2hvdmVyQmVoYXZpb3IgPSBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlckNvbG9yKHtcblx0XHRcdGNvbG9yOiBuZXcgVEhSRUUuQ29sb3IoMHhmZmE4YTgpXG5cdFx0fSk7XG5cdFx0dGhpcy5tb2RlbC5hZGRCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcblx0XHR0aGlzLm1vZGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5jbGljay5iaW5kKHRoaXMpKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xuXHRcdFx0aWYoc3RhdGUgPT09ICdzZXR1cCcpXG5cdFx0XHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRoaXMubW9kZWwucmVtb3ZlQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0fSk7XG5cdH1cblxuXHR1cGRhdGVUZXh0KHRleHQpXG5cdHtcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcblxuXHRcdC8vIHNldCB1cCBjYW52YXNcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdFx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xuXHRcdGcuZmlsbFN0eWxlID0gJyMyMjInO1xuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XG5cdFx0Zy5mb250ID0gYGJvbGQgJHtmb250U2l6ZX1weCAke2ZvbnRTdGFja31gO1xuXHRcdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGcuZmlsbFRleHQodGV4dCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLzIsICgwLjQyIC0gMC4xMikqKE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yKSk7XG5cblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdH1cblxuXG5cblx0Y2xpY2soZSlcblx0e1xuXHRcdGlmKFNILmdhbWUuc3RhdGUgIT09ICdzZXR1cCcpIHJldHVybjtcblxuXHRcdGlmKCF0aGlzLnNlYXQub3duZXIpXG5cdFx0XHR0aGlzLnJlcXVlc3RKb2luKCk7XG5cdFx0ZWxzZSBpZih0aGlzLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcblx0XHRcdHRoaXMucmVxdWVzdExlYXZlKCk7XG5cdFx0ZWxzZSBpZihTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxuXHRcdFx0dGhpcy5yZXF1ZXN0S2ljaygpO1xuXHR9XG5cblx0cmVxdWVzdEpvaW4oKVxuXHR7XG5cdFx0U0guc29ja2V0LmVtaXQoJ2pvaW4nLCBPYmplY3QuYXNzaWduKHtzZWF0TnVtOiB0aGlzLnNlYXQuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpO1xuXHR9XG5cblx0cmVxdWVzdExlYXZlKClcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblx0XHRpZighc2VsZi5xdWVzdGlvbilcblx0XHR7XG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VsZi5zZWF0LmJhbGxvdC5hc2tRdWVzdGlvbignQXJlIHlvdSBzdXJlIHlvdVxcbndhbnQgdG8gbGVhdmU/JywgJ2xvY2FsX2xlYXZlJylcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xuXHRcdFx0XHRpZihjb25maXJtKXtcblx0XHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbGVhdmUnLCBTSC5sb2NhbFVzZXIuaWQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNlbGYucXVlc3Rpb24gPSBudWxsO1xuXHRcdFx0fSlcblx0XHRcdC5jYXRjaCgoKSA9PiB7IHNlbGYucXVlc3Rpb24gPSBudWxsOyB9KTtcblx0XHR9XG5cdH1cblxuXHRyZXF1ZXN0S2ljaygpXG5cdHtcblx0XHRsZXQgc2VsZiA9IHRoaXM7XG5cdFx0aWYoIXNlbGYucXVlc3Rpb24pXG5cdFx0e1xuXHRcdFx0bGV0IHNlYXQgPSBTSC5zZWF0c1tTSC5wbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0uc2VhdE51bV07XG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VhdC5iYWxsb3QuYXNrUXVlc3Rpb24oXG5cdFx0XHRcdCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byB0cnkgdG8ga2lja1xcbidcblx0XHRcdFx0K1NILnBsYXllcnNbc2VsZi5zZWF0Lm93bmVyXS5kaXNwbGF5TmFtZSxcblx0XHRcdFx0J2xvY2FsX2tpY2snXG5cdFx0XHQpXG5cdFx0XHQudGhlbihjb25maXJtID0+IHtcblx0XHRcdFx0aWYoY29uZmlybSl7XG5cdFx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2tpY2snLCBTSC5sb2NhbFVzZXIuaWQsIHNlbGYuc2VhdC5vd25lcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xuXHRcdH1cblx0fVxufVxuXG5OYW1lcGxhdGUudGV4dHVyZVNpemUgPSAyNTY7XG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQgKiBhcyBCYWxsb3RUeXBlIGZyb20gJy4vYmFsbG90JztcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVZvdGVzSW5Qcm9ncmVzcyh7ZGF0YToge2dhbWUsIHBsYXllcnMsIHZvdGVzfX0pXHJcbntcclxuXHRsZXQgYmFsbG90ID0gdGhpcztcclxuXHRpZighYmFsbG90LnNlYXQub3duZXIpIHJldHVybjtcclxuXHJcblx0bGV0IHZpcHMgPSBnYW1lLnZvdGVzSW5Qcm9ncmVzcztcclxuXHRsZXQgYmxhY2tsaXN0ZWRWb3RlcyA9IHZpcHMuZmlsdGVyKGlkID0+IHtcclxuXHRcdGxldCB2cyA9IFsuLi52b3Rlc1tpZF0ueWVzVm90ZXJzLCAuLi52b3Rlc1tpZF0ubm9Wb3RlcnNdO1xyXG5cdFx0bGV0IG52ID0gdm90ZXNbaWRdLm5vblZvdGVycztcclxuXHRcdHJldHVybiBudi5pbmNsdWRlcyhiYWxsb3Quc2VhdC5vd25lcikgfHwgdnMuaW5jbHVkZXMoYmFsbG90LnNlYXQub3duZXIpO1xyXG5cdH0pO1xyXG5cdGxldCBuZXdWb3RlcyA9IHZpcHMuZmlsdGVyKFxyXG5cdFx0aWQgPT4gKCFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcyB8fCAhU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MuaW5jbHVkZXMoaWQpKSAmJiAhYmxhY2tsaXN0ZWRWb3Rlcy5pbmNsdWRlcyhpZClcclxuXHQpO1xyXG5cdGxldCBmaW5pc2hlZFZvdGVzID0gIVNILmdhbWUudm90ZXNJblByb2dyZXNzID8gYmxhY2tsaXN0ZWRWb3Rlc1xyXG5cdFx0OiBTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcy5maWx0ZXIoaWQgPT4gIXZpcHMuaW5jbHVkZXMoaWQpKS5jb25jYXQoYmxhY2tsaXN0ZWRWb3Rlcyk7XHJcblxyXG5cdG5ld1ZvdGVzLmZvckVhY2godklkID0+XHJcblx0e1xyXG5cdFx0Ly8gZ2VuZXJhdGUgbmV3IHF1ZXN0aW9uIHRvIGFza1xyXG5cdFx0bGV0IHF1ZXN0aW9uVGV4dCwgb3B0cyA9IHt9O1xyXG5cdFx0aWYodm90ZXNbdklkXS50eXBlID09PSAnZWxlY3QnKXtcclxuXHRcdFx0cXVlc3Rpb25UZXh0ID0gcGxheWVyc1tnYW1lLnByZXNpZGVudF0uZGlzcGxheU5hbWVcclxuXHRcdFx0XHQrICcgZm9yIHByZXNpZGVudCBhbmQgJ1xyXG5cdFx0XHRcdCsgcGxheWVyc1tnYW1lLmNoYW5jZWxsb3JdLmRpc3BsYXlOYW1lXHJcblx0XHRcdFx0KyAnIGZvciBjaGFuY2VsbG9yPyc7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2pvaW4nKXtcclxuXHRcdFx0cXVlc3Rpb25UZXh0ID0gdm90ZXNbdklkXS5kYXRhICsgJ1xcbnRvIGpvaW4/JztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAna2ljaycpe1xyXG5cdFx0XHRxdWVzdGlvblRleHQgPSAnVm90ZSB0byBraWNrXFxuJ1xyXG5cdFx0XHRcdCsgcGxheWVyc1t2b3Rlc1t2SWRdLnRhcmdldDFdLmRpc3BsYXlOYW1lXHJcblx0XHRcdFx0KyAnPyc7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2NvbmZpcm1Sb2xlJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxyXG5cdFx0e1xyXG5cdFx0XHRvcHRzID0ge2Nob2ljZXM6IEJhbGxvdFR5cGUuQ09ORklSTX07XHJcblx0XHRcdGxldCByb2xlID0gcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdLnJvbGU7XHJcblx0XHRcdHJvbGUgPSByb2xlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcm9sZS5zbGljZSgxKTtcclxuXHRcdFx0cXVlc3Rpb25UZXh0ID0gJ1lvdXIgcm9sZTpcXG4nICsgcm9sZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZihxdWVzdGlvblRleHQpXHJcblx0XHR7XHJcblx0XHRcdGJhbGxvdC5hc2tRdWVzdGlvbihxdWVzdGlvblRleHQsIHZJZCwgb3B0cylcclxuXHRcdFx0LnRoZW4oYW5zd2VyID0+IHtcclxuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgndm90ZScsIHZJZCwgU0gubG9jYWxVc2VyLmlkLCBhbnN3ZXIpO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuY2F0Y2goKCkgPT4gY29uc29sZS5sb2coJ1ZvdGUgc2NydWJiZWQ6JywgdklkKSk7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGlmKGZpbmlzaGVkVm90ZXMuaW5jbHVkZXMoYmFsbG90LmRpc3BsYXllZCkpe1xyXG5cdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxyXG57XHJcblx0bGV0IGJhbGxvdCA9IHRoaXM7XHJcblxyXG5cdGZ1bmN0aW9uIGNob29zZUNoYW5jZWxsb3IoKVxyXG5cdHtcclxuXHRcdHJldHVybiBiYWxsb3QuYXNrUXVlc3Rpb24oJ0Nob29zZSB5b3VyXFxuY2hhbmNlbGxvciEnLCAnbG9jYWxfbm9taW5hdGUnLCB7Y2hvaWNlczogQmFsbG90VHlwZS5QTEFZRVJTRUxFQ1R9KVxyXG5cdFx0LnRoZW4oY29uZmlybUNoYW5jZWxsb3IpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gY29uZmlybUNoYW5jZWxsb3IodXNlcklkKVxyXG5cdHtcclxuXHRcdGxldCB1c2VybmFtZSA9IFNILnBsYXllcnNbdXNlcklkXS5kaXNwbGF5TmFtZTtcclxuXHRcdGxldCB0ZXh0ID0gYE5hbWUgJHt1c2VybmFtZX1cXG5hcyBjaGFuY2VsbG9yP2A7XHJcblx0XHRyZXR1cm4gYmFsbG90LmFza1F1ZXN0aW9uKHRleHQsICdsb2NhbF9ub21pbmF0ZV9jb25maXJtJylcclxuXHRcdC50aGVuKGNvbmZpcm1lZCA9PiB7XHJcblx0XHRcdGlmKGNvbmZpcm1lZCl7XHJcblx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh1c2VySWQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdHJldHVybiBjaG9vc2VDaGFuY2VsbG9yKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gaGlkZU5vbWluYXRlUGxhY2Vob2xkZXIoe2RhdGE6IHtnYW1lfX0pXHJcblx0e1xyXG5cdFx0aWYoZ2FtZS5zdGF0ZSAhPT0gJ25vbWluYXRlJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnd2FpdF9mb3JfY2hhbmNlbGxvcicpe1xyXG5cdFx0XHRiYWxsb3QuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdFx0fVxyXG5cdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZU5vbWluYXRlUGxhY2Vob2xkZXIpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gaGlkZVBvbGljeVBsYWNlaG9sZGVyKHtkYXRhOiB7Z2FtZX19KVxyXG5cdHtcclxuXHRcdGlmKGdhbWUuc3RhdGUgIT09ICdwb2xpY3kxJyAmJiBiYWxsb3QuZGlzcGxheWVkID09PSAnbG9jYWxfcG9saWN5MScgfHxcclxuXHRcdFx0Z2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTInICYmIGJhbGxvdC5kaXNwbGF5ZWQgPT09ICdsb2NhbF9wb2xpY3kyJ1xyXG5cdFx0KXtcclxuXHRcdFx0YmFsbG90LmRpc3BhdGNoRXZlbnQoe3R5cGU6ICdjYW5jZWxWb3RlJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdH1cclxuXHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVQb2xpY3lQbGFjZWhvbGRlcik7XHJcblx0fVxyXG5cclxuXHRpZihnYW1lLnN0YXRlID09PSAnbm9taW5hdGUnICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLnByZXNpZGVudClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50KXtcclxuXHRcdFx0Y2hvb3NlQ2hhbmNlbGxvcigpLnRoZW4odXNlcklkID0+IHtcclxuXHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbm9taW5hdGUnLCB1c2VySWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0Nob29zZSB5b3VyXFxuY2hhbmNlbGxvciEnLCAnd2FpdF9mb3JfY2hhbmNlbGxvcicsIHtcclxuXHRcdFx0XHRjaG9pY2VzOiBCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCxcclxuXHRcdFx0XHRmYWtlOiB0cnVlLFxyXG5cdFx0XHRcdGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ25vbWluYXRlJ1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgaGlkZU5vbWluYXRlUGxhY2Vob2xkZXIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdwb2xpY3kxJyAmJiBiYWxsb3Quc2VhdC5vd25lciA9PT0gZ2FtZS5wcmVzaWRlbnQpXHJcblx0e1xyXG5cdFx0bGV0IG9wdHMgPSB7Y2hvaWNlczogQmFsbG90VHlwZS5QT0xJQ1ksIHBvbGljeUhhbmQ6IGdhbWUuaGFuZH07XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgIT09IGdhbWUucHJlc2lkZW50KXtcclxuXHRcdFx0T2JqZWN0LmFzc2lnbihvcHRzLCB7ZmFrZTogdHJ1ZSwgaXNJbnZhbGlkOiAoKSA9PiBTSC5nYW1lLnN0YXRlICE9PSAncG9saWN5MSd9KTtcclxuXHRcdH1cclxuXHJcblx0XHRiYWxsb3QuYXNrUXVlc3Rpb24oJ0Nob29zZSBvbmVcXG50byBkaXNjYXJkIScsICdsb2NhbF9wb2xpY3kxJywgb3B0cylcclxuXHRcdC50aGVuKGRpc2NhcmQgPT4ge1xyXG5cdFx0XHRTSC5zb2NrZXQuZW1pdCgnZGlzY2FyZF9wb2xpY3kxJywgZGlzY2FyZCk7XHJcblx0XHR9KTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGhpZGVQb2xpY3lQbGFjZWhvbGRlcik7XHJcblx0fVxyXG5cdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3BvbGljeTInICYmIGJhbGxvdC5zZWF0Lm93bmVyID09PSBnYW1lLmNoYW5jZWxsb3IpXHJcblx0e1xyXG5cdFx0bGV0IG9wdHMgPSB7Y2hvaWNlczogQmFsbG90VHlwZS5QT0xJQ1ksIHBvbGljeUhhbmQ6IGdhbWUuaGFuZH07XHJcblx0XHRpZihTSC5sb2NhbFVzZXIuaWQgIT09IGdhbWUuY2hhbmNlbGxvcil7XHJcblx0XHRcdE9iamVjdC5hc3NpZ24ob3B0cywge2Zha2U6IHRydWUsIGlzSW52YWxpZDogKCkgPT4gU0guZ2FtZS5zdGF0ZSAhPT0gJ3BvbGljeTInfSk7XHJcblx0XHR9XHJcblxyXG5cdFx0YmFsbG90LmFza1F1ZXN0aW9uKCdDaG9vc2Ugb25lXFxudG8gZGlzY2FyZCEnLCAnbG9jYWxfcG9saWN5MicsIG9wdHMpXHJcblx0XHQudGhlbihkaXNjYXJkID0+IHtcclxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2Rpc2NhcmRfcG9saWN5MicsIGRpc2NhcmQpO1xyXG5cdFx0fSwgZXJyID0+IGNvbnNvbGUuZXJyb3IoZXJyKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBoaWRlUG9saWN5UGxhY2Vob2xkZXIpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IHt1cGRhdGVWb3Rlc0luUHJvZ3Jlc3MsIHVwZGF0ZVN0YXRlfTsiLCIndXNlIHN0cmljdCc7XHJcblxyXG4vKlxyXG4qIERlY2tzIGhhdmUgMTcgY2FyZHM6IDYgbGliZXJhbCwgMTEgZmFzY2lzdC5cclxuKiBJbiBiaXQtcGFja2VkIGJvb2xlYW4gYXJyYXlzLCAxIGlzIGxpYmVyYWwsIDAgaXMgZmFzY2lzdC5cclxuKiBUaGUgbW9zdCBzaWduaWZpY2FudCBiaXQgaXMgYWx3YXlzIDEuXHJcbiogRS5nLiAwYjEwMTAwMSByZXByZXNlbnRzIGEgZGVjayB3aXRoIDIgbGliZXJhbCBhbmQgMyBmYXNjaXN0IGNhcmRzXHJcbiovXHJcblxyXG5sZXQgRlVMTF9ERUNLID0gMHgyMDAzZjtcclxuXHJcbmxldCBwb3NpdGlvbnMgPSBbXHJcblx0MHgxLCAweDIsIDB4NCwgMHg4LFxyXG5cdDB4MTAsIDB4MjAsIDB4NDAsIDB4ODAsXHJcblx0MHgxMDAsIDB4MjAwLCAweDQwMCwgMHg4MDAsXHJcblx0MHgxMDAwLCAweDIwMDAsIDB4NDAwMCwgMHg4MDAwLFxyXG5cdDB4MTAwMDAsIDB4MjAwMDAsIDB4NDAwMDBcclxuXTtcclxuXHJcbmZ1bmN0aW9uIGxlbmd0aChkZWNrKVxyXG57XHJcblx0cmV0dXJuIHBvc2l0aW9ucy5maW5kSW5kZXgocyA9PiBzID4gZGVjaykgLTE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNodWZmbGUoZGVjaylcclxue1xyXG5cdGxldCBsID0gbGVuZ3RoKGRlY2spO1xyXG5cdGZvcihsZXQgaT1sLTE7IGk+MDsgaS0tKVxyXG5cdHtcclxuXHRcdGxldCBvID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaSk7XHJcblx0XHRsZXQgaVZhbCA9IGRlY2sgJiAxIDw8IGksIG9WYWwgPSBkZWNrICYgMSA8PCBvO1xyXG5cdFx0bGV0IHN3YXBwZWQgPSBpVmFsID4+PiBpLW8gfCBvVmFsIDw8IGktbztcclxuXHRcdGRlY2sgPSBkZWNrIC0gaVZhbCAtIG9WYWwgKyBzd2FwcGVkO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIGRlY2s7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdUaHJlZShkKVxyXG57XHJcblx0cmV0dXJuIGQgPCA4ID8gWzEsIGRdIDogW2QgPj4+IDMsIDggfCBkICYgN107XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpc2NhcmRPbmUoZGVjaywgcG9zKVxyXG57XHJcblx0bGV0IGJvdHRvbUhhbGYgPSBkZWNrICYgKDEgPDwgcG9zKS0xO1xyXG5cdGxldCB0b3BIYWxmID0gZGVjayAmIH4oKDEgPDwgcG9zKzEpLTEpO1xyXG5cdHRvcEhhbGYgPj4+PSAxO1xyXG5cdGxldCBuZXdEZWNrID0gdG9wSGFsZiB8IGJvdHRvbUhhbGY7XHJcblx0XHJcblx0bGV0IHZhbCA9IChkZWNrICYgMTw8cG9zKSA+Pj4gcG9zO1xyXG5cclxuXHRyZXR1cm4gW25ld0RlY2ssIHZhbF07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFwcGVuZChkZWNrLCB2YWwpXHJcbntcclxuXHRyZXR1cm4gZGVjayA8PCAxIHwgdmFsO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0b0FycmF5KGRlY2spXHJcbntcclxuXHRsZXQgYXJyID0gW107XHJcblx0d2hpbGUoZGVjayA+IDEpe1xyXG5cdFx0YXJyLnB1c2goZGVjayAmIDEpO1xyXG5cdFx0ZGVjayA+Pj49IDE7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gYXJyO1xyXG59XHJcblxyXG5leHBvcnQge2xlbmd0aCwgc2h1ZmZsZSwgZHJhd1RocmVlLCBkaXNjYXJkT25lLCBhcHBlbmQsIHRvQXJyYXksIEZVTExfREVDS307IiwiJ3VzZSBzdHJpY3Q7J1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHsgQmxhbmtDYXJkLCBKYUNhcmQsIE5laW5DYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgTGliZXJhbFBvbGljeUNhcmQgfSBmcm9tICcuL2NhcmQnO1xuaW1wb3J0IHsgZ2VuZXJhdGVRdWVzdGlvbiwgbGF0ZVVwZGF0ZSB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0ICogYXMgQlAgZnJvbSAnLi9iYWxsb3Rwcm9jZXNzb3InO1xuaW1wb3J0ICogYXMgQlBCQSBmcm9tICcuL2JwYmEnO1xuaW1wb3J0IHtOVGV4dCwgUGxhY2Vob2xkZXJNZXNofSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xuXG5sZXQgUExBWUVSU0VMRUNUID0gMDtcbmxldCBDT05GSVJNID0gMTtcbmxldCBCSU5BUlkgPSAyO1xubGV0IFBPTElDWSA9IDM7XG5cbmNsYXNzIEJhbGxvdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXQpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLTAuMywgMC4yNSk7XG5cdFx0dGhpcy5yb3RhdGlvbi5zZXQoLjUsIE1hdGguUEksIDApO1xuXHRcdHNlYXQuYWRkKHRoaXMpO1xuXG5cdFx0dGhpcy5sYXN0UXVldWVkID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdFx0dGhpcy5kaXNwbGF5ZWQgPSBudWxsO1xuXG5cdFx0dGhpcy5feWVzQ2xpY2tIYW5kbGVyID0gbnVsbDtcblx0XHR0aGlzLl9ub0NsaWNrSGFuZGxlciA9IG51bGw7XG5cdFx0dGhpcy5fbm9taW5hdGVIYW5kbGVyID0gbnVsbDtcblx0XHR0aGlzLl9jYW5jZWxIYW5kbGVyID0gbnVsbDtcblxuXHRcdHRoaXMuamFDYXJkID0gbmV3IEphQ2FyZCgpO1xuXHRcdHRoaXMubmVpbkNhcmQgPSBuZXcgTmVpbkNhcmQoKTtcblx0XHRbdGhpcy5qYUNhcmQsIHRoaXMubmVpbkNhcmRdLmZvckVhY2goYyA9PiB7XG5cdFx0XHRjLnBvc2l0aW9uLnNldChjIGluc3RhbmNlb2YgSmFDYXJkID8gLTAuMSA6IDAuMSwgLTAuMSwgMCk7XG5cdFx0XHRjLnNjYWxlLnNldFNjYWxhcigwLjE1KTtcblx0XHRcdGMudmlzaWJsZSA9IGZhbHNlO1xuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKHRoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkKTtcblx0XHR0aGlzLnBvbGljaWVzID0gW107XG5cblx0XHQvL2xldCBnZW8gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSgwLjQsIDAuMik7XG5cdFx0Ly9sZXQgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHt0cmFuc3BhcmVudDogdHJ1ZSwgc2lkZTogVEhSRUUuRG91YmxlU2lkZX0pO1xuXHRcdHRoaXMucXVlc3Rpb24gPSBQbGFjZWhvbGRlck1lc2guY2xvbmUoKTtcblx0XHR0aGlzLnF1ZXN0aW9uLnBvc2l0aW9uLnNldCgwLCAwLjA1LCAwKTtcblx0XHR0aGlzLnF1ZXN0aW9uLnNjYWxlLnNldFNjYWxhciguNSk7XG5cdFx0dGhpcy5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy5hZGQodGhpcy5xdWVzdGlvbik7XG5cblx0XHR0aGlzLnRleHRDb21wb25lbnQgPSBuZXcgTlRleHQodGhpcy5xdWVzdGlvbik7XG5cdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7d2lkdGg6IDEuMSwgaGVpZ2h0OiAuNCwgZm9udFNpemU6IDEsIHZlcnRpY2FsQWxpZ246ICd0b3AnfSk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdm90ZXNJblByb2dyZXNzJywgQlAudXBkYXRlVm90ZXNJblByb2dyZXNzLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUoQlAudXBkYXRlU3RhdGUuYmluZCh0aGlzKSkpO1xuXHR9XG5cblx0YXNrUXVlc3Rpb24ocVRleHQsIGlkLCB7Y2hvaWNlcyA9IEJJTkFSWSwgcG9saWN5SGFuZCA9IDB4MSwgZmFrZSA9IGZhbHNlLCBpc0ludmFsaWQgPSAoKSA9PiB0cnVlfSA9IHt9KVxuXHR7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXG5cdFx0ZnVuY3Rpb24gaXNWb3RlVmFsaWQoKVxuXHRcdHtcblx0XHRcdGxldCBpc0Zha2VWYWxpZCA9IGZha2UgJiYgIWlzSW52YWxpZCgpO1xuXHRcdFx0bGV0IGlzTG9jYWxWb3RlID0gL15sb2NhbC8udGVzdChpZCk7XG5cdFx0XHRsZXQgaXNGaXJzdFVwZGF0ZSA9ICFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcztcblx0XHRcdGxldCB2b3RlID0gU0gudm90ZXNbaWRdO1xuXHRcdFx0bGV0IHZvdGVycyA9IHZvdGUgPyBbLi4udm90ZS55ZXNWb3RlcnMsIC4uLnZvdGUubm9Wb3RlcnNdIDogW107XG5cdFx0XHRsZXQgYWxyZWFkeVZvdGVkID0gdm90ZXJzLmluY2x1ZGVzKHNlbGYuc2VhdC5vd25lcik7XG5cdFx0XHRyZXR1cm4gaXNMb2NhbFZvdGUgfHwgaXNGaXJzdFVwZGF0ZSB8fCBpc0Zha2VWYWxpZCB8fCB2b3RlICYmICFhbHJlYWR5Vm90ZWQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaG9va1VwUXVlc3Rpb24oKXtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZShxdWVzdGlvbkV4ZWN1dG9yKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBxdWVzdGlvbkV4ZWN1dG9yKHJlc29sdmUsIHJlamVjdClcblx0XHR7XG5cdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBpcyBzdGlsbCByZWxldmFudFxuXHRcdFx0aWYoIWlzVm90ZVZhbGlkKCkpe1xuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KCdWb3RlIG5vIGxvbmdlciB2YWxpZCcpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzaG93IHRoZSBiYWxsb3Rcblx0XHRcdC8vc2VsZi5xdWVzdGlvbi5tYXRlcmlhbC5tYXAgPSBnZW5lcmF0ZVF1ZXN0aW9uKHFUZXh0LCBzZWxmLnF1ZXN0aW9uLm1hdGVyaWFsLm1hcCk7XG5cdFx0XHRzZWxmLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OiBgJHtxVGV4dH1gfSk7XG5cdFx0XHRzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSB0cnVlO1xuXG5cdFx0XHQvLyBob29rIHVwIHEvYSBjYXJkc1xuXHRcdFx0aWYoY2hvaWNlcyA9PT0gQ09ORklSTSB8fCBjaG9pY2VzID09PSBCSU5BUlkpe1xuXHRcdFx0XHRzZWxmLmphQ2FyZC52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdFx0aWYoIWZha2UpXG5cdFx0XHRcdFx0c2VsZi5qYUNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKCd5ZXMnLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdH1cblx0XHRcdGlmKGNob2ljZXMgPT09IEJJTkFSWSl7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQudmlzaWJsZSA9IHRydWU7XG5cdFx0XHRcdGlmKCFmYWtlKVxuXHRcdFx0XHRcdHNlbGYubmVpbkNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKCdubycsIHJlc29sdmUsIHJlamVjdCkpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZihjaG9pY2VzID09PSBQTEFZRVJTRUxFQ1QgJiYgIWZha2Upe1xuXHRcdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdwbGF5ZXJTZWxlY3QnLCByZXNwb25kKCdwbGF5ZXInLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUE9MSUNZKXtcblx0XHRcdFx0QlBCQS50b0FycmF5KHBvbGljeUhhbmQpLmZvckVhY2goKHZhbCwgaSwgYXJyKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bGV0IGNhcmQgPSBudWxsO1xuXHRcdFx0XHRcdGlmKGZha2UpXG5cdFx0XHRcdFx0XHRjYXJkID0gbmV3IEJsYW5rQ2FyZCgpO1xuXHRcdFx0XHRcdGVsc2UgaWYodmFsKVxuXHRcdFx0XHRcdFx0Y2FyZCA9IG5ldyBMaWJlcmFsUG9saWN5Q2FyZCgpO1xuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdGNhcmQgPSBuZXcgRmFzY2lzdFBvbGljeUNhcmQoKTtcblxuXHRcdFx0XHRcdGNhcmQuc2NhbGUuc2V0U2NhbGFyKDAuMTUpO1xuXG5cdFx0XHRcdFx0bGV0IHdpZHRoID0gLjE1ICogYXJyLmxlbmd0aDtcblx0XHRcdFx0XHRsZXQgeCA9IC13aWR0aC8yICsgLjE1KmkgKyAuMDc1O1xuXHRcdFx0XHRcdGNhcmQucG9zaXRpb24uc2V0KHgsIC0wLjA3LCAwKTtcblx0XHRcdFx0XHRzZWxmLmFkZChjYXJkKTtcblx0XHRcdFx0XHRzZWxmLnBvbGljaWVzLnB1c2goY2FyZCk7XG5cblx0XHRcdFx0XHRpZighZmFrZSlcblx0XHRcdFx0XHRcdGNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKGksIHJlc29sdmUsIHJlamVjdCkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0c2VsZi5hZGRFdmVudExpc3RlbmVyKCdjYW5jZWxWb3RlJywgcmVzcG9uZCgnY2FuY2VsJywgcmVzb2x2ZSwgcmVqZWN0KSk7XG5cblx0XHRcdHNlbGYuZGlzcGxheWVkID0gaWQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVzcG9uZChhbnN3ZXIsIHJlc29sdmUsIHJlamVjdClcblx0XHR7XG5cdFx0XHRmdW5jdGlvbiBoYW5kbGVyKGV2dClcblx0XHRcdHtcblx0XHRcdFx0Ly8gbWFrZSBzdXJlIG9ubHkgdGhlIG93bmVyIG9mIHRoZSBiYWxsb3QgaXMgYW5zd2VyaW5nXG5cdFx0XHRcdGlmKGFuc3dlciAhPT0gJ2NhbmNlbCcgJiYgc2VsZi5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQpIHJldHVybjtcblxuXHRcdFx0XHQvLyBjbGVhbiB1cFxuXHRcdFx0XHRzZWxmLmphQ2FyZC52aXNpYmxlID0gZmFsc2U7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQudmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSBmYWxzZTtcblx0XHRcdFx0c2VsZi5kaXNwbGF5ZWQgPSBudWxsO1xuXHRcdFx0XHRzZWxmLnJlbW92ZSguLi5zZWxmLnBvbGljaWVzKTtcblx0XHRcdFx0c2VsZi5wb2xpY2llcyA9IFtdO1xuXG5cdFx0XHRcdHNlbGYuamFDYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgc2VsZi5feWVzQ2xpY2tIYW5kbGVyKTtcblx0XHRcdFx0c2VsZi5uZWluQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX25vQ2xpY2tIYW5kbGVyKTtcblx0XHRcdFx0U0gucmVtb3ZlRXZlbnRMaXN0ZW5lcigncGxheWVyU2VsZWN0Jywgc2VsZi5fbm9taW5hdGVIYW5kbGVyKTtcblx0XHRcdFx0c2VsZi5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5jZWxWb3RlJywgc2VsZi5fY2FuY2VsSGFuZGxlcik7XG5cblx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBhbnN3ZXIgc3RpbGwgbWF0dGVyc1xuXHRcdFx0XHRpZighaXNWb3RlVmFsaWQoKSB8fCBhbnN3ZXIgPT09ICdjYW5jZWwnKXtcblx0XHRcdFx0XHRyZWplY3QoJ3ZvdGUgY2FuY2VsbGVkJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICd5ZXMnKVxuXHRcdFx0XHRcdHJlc29sdmUodHJ1ZSk7XG5cdFx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnbm8nKVxuXHRcdFx0XHRcdHJlc29sdmUoZmFsc2UpO1xuXHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3BsYXllcicpXG5cdFx0XHRcdFx0cmVzb2x2ZShldnQuZGF0YSk7XG5cdFx0XHRcdGVsc2UgaWYoY2hvaWNlcyA9PT0gUE9MSUNZKVxuXHRcdFx0XHRcdHJlc29sdmUoYW5zd2VyKTtcblx0XHRcdH1cblxuXHRcdFx0aWYoYW5zd2VyID09PSAneWVzJylcblx0XHRcdFx0c2VsZi5feWVzQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcblx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnbm8nKVxuXHRcdFx0XHRzZWxmLl9ub0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3BsYXllcicpXG5cdFx0XHRcdHNlbGYuX25vbWluYXRlSGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ2NhbmNlbCcpXG5cdFx0XHRcdHNlbGYuX2NhbmNlbEhhbmRsZXIgPSBoYW5kbGVyO1xuXG5cdFx0XHRyZXR1cm4gaGFuZGxlcjtcblx0XHR9XG5cblx0XHRzZWxmLmxhc3RRdWV1ZWQgPSBzZWxmLmxhc3RRdWV1ZWQudGhlbihob29rVXBRdWVzdGlvbiwgaG9va1VwUXVlc3Rpb24pO1xuXG5cdFx0cmV0dXJuIHNlbGYubGFzdFF1ZXVlZDtcblx0fVxufVxuXG5leHBvcnQge0JhbGxvdCwgUExBWUVSU0VMRUNULCBDT05GSVJNLCBCSU5BUlksIFBPTElDWX07IiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtGYXNjaXN0Um9sZUNhcmQsIEhpdGxlclJvbGVDYXJkLCBMaWJlcmFsUm9sZUNhcmQsIEZhc2Npc3RQYXJ0eUNhcmQsIExpYmVyYWxQYXJ0eUNhcmQsIEphQ2FyZCwgTmVpbkNhcmR9IGZyb20gJy4vY2FyZCc7XG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtOQmlsbGJvYXJkfSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGF5ZXJJbmZvIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHR0aGlzLmNhcmQgPSBudWxsO1xuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAsIDAuMyk7XG5cdFx0dGhpcy5zY2FsZS5zZXRTY2FsYXIoMC4zKTtcblx0XHRzZWF0LmFkZCh0aGlzKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUodGhpcy51cGRhdGVTdGF0ZS5iaW5kKHRoaXMpKSk7XG5cdFx0Ly9TSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy51cGRhdGVUdXJuT3JkZXIuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVUdXJuT3JkZXIoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXG5cdHtcblx0XHRTSC5fdXNlclByb21pc2UudGhlbigoKSA9PiB7XG5cdFx0XHRsZXQgbG9jYWxQbGF5ZXIgPSBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF07XG5cdFx0XHRpZihsb2NhbFBsYXllcil7XG5cdFx0XHRcdGxldCBwbGF5ZXJQb3MgPSB0aGlzLndvcmxkVG9Mb2NhbChTSC5zZWF0c1tsb2NhbFBsYXllci5zZWF0TnVtXS5nZXRXb3JsZFBvc2l0aW9uKCkpO1xuXHRcdFx0XHR0aGlzLmxvb2tBdChwbGF5ZXJQb3MpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0dXBkYXRlU3RhdGUoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzLCB2b3Rlc319KVxuXHR7XG5cdFx0aWYoIXRoaXMuc2VhdC5vd25lcilcblx0XHRcdHJldHVybjtcblxuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICduaWdodCcgJiYgcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdKVxuXHRcdFx0dGhpcy5wcmVzZW50Um9sZShnYW1lLCBwbGF5ZXJzLCB2b3Rlcyk7XG5cblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdsYW1lRHVjaycpXG5cdFx0XHR0aGlzLnByZXNlbnRWb3RlKGdhbWUsIHBsYXllcnMsIHZvdGVzKTtcblxuXHRcdGVsc2UgaWYodGhpcy5jYXJkICE9PSBudWxsKVxuXHRcdHtcblx0XHRcdHRoaXMucmVtb3ZlKHRoaXMuY2FyZCk7XG5cdFx0XHR0aGlzLmNhcmQgPSBudWxsO1xuXHRcdH1cblx0fVxuXG5cdHByZXNlbnRSb2xlKGdhbWUsIHBsYXllcnMpXG5cdHtcblx0XHRsZXQgbG9jYWxQbGF5ZXIgPSBwbGF5ZXJzW1NILmxvY2FsVXNlci5pZF07XG5cdFx0bGV0IHNlYXRlZFBsYXllciA9IHBsYXllcnNbdGhpcy5zZWF0Lm93bmVyXTtcblxuXHRcdGxldCBzZWF0ZWRSb2xlU2hvdWxkQmVWaXNpYmxlID1cblx0XHRcdFNILmxvY2FsVXNlci5pZCA9PT0gdGhpcy5zZWF0Lm93bmVyIHx8XG5cdFx0XHRsb2NhbFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgJiYgKHNlYXRlZFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgfHwgc2VhdGVkUGxheWVyLnJvbGUgPT09ICdoaXRsZXInKSB8fFxuXHRcdFx0bG9jYWxQbGF5ZXIucm9sZSA9PT0gJ2hpdGxlcicgJiYgc2VhdGVkUGxheWVyLnJvbGUgPT09ICdmYXNjaXN0JyAmJiBnYW1lLnR1cm5PcmRlci5sZW5ndGggPCA5O1xuXG5cdFx0aWYoc2VhdGVkUm9sZVNob3VsZEJlVmlzaWJsZSlcblx0XHR7XG5cdFx0XHRzd2l0Y2goc2VhdGVkUGxheWVyLnJvbGUpe1xuXHRcdFx0XHRjYXNlICdmYXNjaXN0JzogdGhpcy5jYXJkID0gbmV3IEZhc2Npc3RSb2xlQ2FyZCgpOyBicmVhaztcblx0XHRcdFx0Y2FzZSAnaGl0bGVyJyA6IHRoaXMuY2FyZCA9IG5ldyBIaXRsZXJSb2xlQ2FyZCgpOyAgYnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2xpYmVyYWwnOiB0aGlzLmNhcmQgPSBuZXcgTGliZXJhbFJvbGVDYXJkKCk7IGJyZWFrO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFkZCh0aGlzLmNhcmQpO1xuXHRcdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcblx0XHR9XG5cdH1cblxuXHRwcmVzZW50Vm90ZShnYW1lLCBfLCB2b3Rlcylcblx0e1xuXHRcdGxldCB2b3RlID0gdm90ZXNbZ2FtZS5sYXN0RWxlY3Rpb25dO1xuXG5cdFx0bGV0IHBsYXllclZvdGUgPSB2b3RlLnllc1ZvdGVycy5pbmNsdWRlcyh0aGlzLnNlYXQub3duZXIpO1xuXHRcdHRoaXMuY2FyZCA9IHBsYXllclZvdGUgPyBuZXcgSmFDYXJkKCkgOiBuZXcgTmVpbkNhcmQoKTtcblxuXHRcdHRoaXMuYWRkKHRoaXMuY2FyZCk7XG5cdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy5jYXJkKTtcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2Fwc3VsZUdlb21ldHJ5IGV4dGVuZHMgVEhSRUUuQnVmZmVyR2VvbWV0cnlcbntcblx0Y29uc3RydWN0b3IocmFkaXVzLCBoZWlnaHQsIHNlZ21lbnRzID0gMTIsIHJpbmdzID0gOClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHRsZXQgbnVtVmVydHMgPSAyICogcmluZ3MgKiBzZWdtZW50cyArIDI7XG5cdFx0bGV0IG51bUZhY2VzID0gNCAqIHJpbmdzICogc2VnbWVudHM7XG5cdFx0bGV0IHRoZXRhID0gMipNYXRoLlBJL3NlZ21lbnRzO1xuXHRcdGxldCBwaGkgPSBNYXRoLlBJLygyKnJpbmdzKTtcblxuXHRcdGxldCB2ZXJ0cyA9IG5ldyBGbG9hdDMyQXJyYXkoMypudW1WZXJ0cyk7XG5cdFx0bGV0IGZhY2VzID0gbmV3IFVpbnQxNkFycmF5KDMqbnVtRmFjZXMpO1xuXHRcdGxldCB2aSA9IDAsIGZpID0gMCwgdG9wQ2FwID0gMCwgYm90Q2FwID0gMTtcblxuXHRcdHZlcnRzLnNldChbMCwgaGVpZ2h0LzIsIDBdLCAzKnZpKyspO1xuXHRcdHZlcnRzLnNldChbMCwgLWhlaWdodC8yLCAwXSwgMyp2aSsrKTtcblxuXHRcdGZvciggbGV0IHM9MDsgczxzZWdtZW50czsgcysrIClcblx0XHR7XG5cdFx0XHRmb3IoIGxldCByPTE7IHI8PXJpbmdzOyByKyspXG5cdFx0XHR7XG5cdFx0XHRcdGxldCByYWRpYWwgPSByYWRpdXMgKiBNYXRoLnNpbihyKnBoaSk7XG5cblx0XHRcdFx0Ly8gY3JlYXRlIHZlcnRzXG5cdFx0XHRcdHZlcnRzLnNldChbXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5jb3Mocyp0aGV0YSksXG5cdFx0XHRcdFx0aGVpZ2h0LzIgLSByYWRpdXMqKDEtTWF0aC5jb3MocipwaGkpKSxcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLnNpbihzKnRoZXRhKVxuXHRcdFx0XHRdLCAzKnZpKyspO1xuXG5cdFx0XHRcdHZlcnRzLnNldChbXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5jb3Mocyp0aGV0YSksXG5cdFx0XHRcdFx0LWhlaWdodC8yICsgcmFkaXVzKigxLU1hdGguY29zKHIqcGhpKSksXG5cdFx0XHRcdFx0cmFkaWFsICogTWF0aC5zaW4ocyp0aGV0YSlcblx0XHRcdFx0XSwgMyp2aSsrKTtcblxuXHRcdFx0XHRsZXQgdG9wX3MxcjEgPSB2aS0yLCB0b3BfczFyMCA9IHZpLTQ7XG5cdFx0XHRcdGxldCBib3RfczFyMSA9IHZpLTEsIGJvdF9zMXIwID0gdmktMztcblx0XHRcdFx0bGV0IHRvcF9zMHIxID0gdG9wX3MxcjEgLSAyKnJpbmdzLCB0b3BfczByMCA9IHRvcF9zMXIwIC0gMipyaW5ncztcblx0XHRcdFx0bGV0IGJvdF9zMHIxID0gYm90X3MxcjEgLSAyKnJpbmdzLCBib3RfczByMCA9IGJvdF9zMXIwIC0gMipyaW5ncztcblx0XHRcdFx0aWYocyA9PT0gMCl7XG5cdFx0XHRcdFx0dG9wX3MwcjEgKz0gbnVtVmVydHMtMjtcblx0XHRcdFx0XHR0b3BfczByMCArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHRcdGJvdF9zMHIxICs9IG51bVZlcnRzLTI7XG5cdFx0XHRcdFx0Ym90X3MwcjAgKz0gbnVtVmVydHMtMjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIGNyZWF0ZSBmYWNlc1xuXHRcdFx0XHRpZihyID09PSAxKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFt0b3BDYXAsIHRvcF9zMXIxLCB0b3BfczByMV0sIDMqZmkrKyk7XG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFtib3RDYXAsIGJvdF9zMHIxLCBib3RfczFyMV0sIDMqZmkrKyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFt0b3BfczFyMCwgdG9wX3MxcjEsIHRvcF9zMHIwXSwgMypmaSsrKTtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcF9zMHIwLCB0b3BfczFyMSwgdG9wX3MwcjFdLCAzKmZpKyspO1xuXG5cdFx0XHRcdFx0ZmFjZXMuc2V0KFtib3RfczByMSwgYm90X3MxcjEsIGJvdF9zMHIwXSwgMypmaSsrKTtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdF9zMHIwLCBib3RfczFyMSwgYm90X3MxcjBdLCAzKmZpKyspO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIGNyZWF0ZSBsb25nIHNpZGVzXG5cdFx0XHRsZXQgdG9wX3MxID0gdmktMiwgdG9wX3MwID0gdG9wX3MxIC0gMipyaW5ncztcblx0XHRcdGxldCBib3RfczEgPSB2aS0xLCBib3RfczAgPSBib3RfczEgLSAyKnJpbmdzO1xuXHRcdFx0aWYocyA9PT0gMCl7XG5cdFx0XHRcdHRvcF9zMCArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHRib3RfczAgKz0gbnVtVmVydHMtMjtcblx0XHRcdH1cblxuXHRcdFx0ZmFjZXMuc2V0KFt0b3BfczAsIHRvcF9zMSwgYm90X3MxXSwgMypmaSsrKTtcblx0XHRcdGZhY2VzLnNldChbYm90X3MwLCB0b3BfczAsIGJvdF9zMV0sIDMqZmkrKyk7XG5cdFx0fVxuXG5cdFx0dGhpcy5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSh2ZXJ0cywgMykpO1xuXHRcdHRoaXMuc2V0SW5kZXgobmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShmYWNlcywgMSkpO1xuXHR9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IENhcHN1bGVHZW9tZXRyeSBmcm9tICcuL2NhcHN1bGVnZW9tZXRyeSc7XG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xuXG5sZXQgaGl0Ym94R2VvID0gbmV3IENhcHN1bGVHZW9tZXRyeSgwLjMsIDEuOCk7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhpdGJveCBleHRlbmRzIFRIUkVFLk1lc2hcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKGhpdGJveEdlbywgbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcblx0XHRcdHRyYW5zcGFyZW50OiB0cnVlLFxuXHRcdFx0b3BhY2l0eTogMCxcblx0XHRcdHNpZGU6IFRIUkVFLkJhY2tTaWRlXG5cdFx0fSkpO1xuXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgLTAuNSwgMCk7XG5cdFx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHRzZWF0LmFkZCh0aGlzKTtcblxuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29yZW50ZXInLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwLjEpO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ybGVhdmUnLCAoKSA9PiB0aGlzLm1hdGVyaWFsLm9wYWNpdHkgPSAwKTtcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgKCkgPT4ge1xuXHRcdFx0U0guZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHRcdHR5cGU6ICdwbGF5ZXJTZWxlY3QnLFxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdFx0ZGF0YTogdGhpcy5zZWF0Lm93bmVyXG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUoKHtkYXRhOiB7Z2FtZX19KSA9PlxuXHRcdHtcblx0XHRcdHRoaXMudmlzaWJsZSA9XG5cdFx0XHRcdGdhbWUuc3RhdGUgPT09ICdub21pbmF0ZScgJiZcblx0XHRcdFx0U0gubG9jYWxVc2VyLmlkID09PSBnYW1lLnByZXNpZGVudCAmJlxuXHRcdFx0XHR0aGlzLnNlYXQub3duZXIgIT09ICcnICYmXG5cdFx0XHRcdHRoaXMuc2VhdC5vd25lciAhPT0gU0gubG9jYWxVc2VyLmlkICYmXG5cdFx0XHRcdHRoaXMuc2VhdC5vd25lciAhPT0gZ2FtZS5sYXN0Q2hhbmNlbGxvciAmJlxuXHRcdFx0XHQoZ2FtZS50dXJuT3JkZXIubGVuZ3RoID09PSA1IHx8IHRoaXMuc2VhdC5vd25lciAhPT0gZ2FtZS5sYXN0UHJlc2lkZW50KTtcblx0XHR9KSk7XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnO1xuaW1wb3J0IHtCYWxsb3R9IGZyb20gJy4vYmFsbG90JztcbmltcG9ydCBQbGF5ZXJJbmZvIGZyb20gJy4vcGxheWVyaW5mbyc7XG5pbXBvcnQgSGl0Ym94IGZyb20gJy4vaGl0Ym94JztcbmltcG9ydCB7bGF0ZVVwZGF0ZX0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNlYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcihzZWF0TnVtKVxuXHR7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc2VhdE51bSA9IHNlYXROdW07XG5cdFx0dGhpcy5vd25lciA9ICcnO1xuXG5cdFx0Ly8gcG9zaXRpb24gc2VhdFxuXHRcdGxldCB4LCB5PTAuNjUsIHo7XG5cdFx0c3dpdGNoKHNlYXROdW0pe1xuXHRcdGNhc2UgMDogY2FzZSAxOiBjYXNlIDI6XG5cdFx0XHR4ID0gLTAuODMzICsgMC44MzMqc2VhdE51bTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIC0xLjA1KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMzogY2FzZSA0OlxuXHRcdFx0eiA9IC0wLjQzNyArIDAuODc0KihzZWF0TnVtLTMpO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMS40MjUsIHksIHopO1xuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEkvMiwgMCk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIDU6IGNhc2UgNjogY2FzZSA3OlxuXHRcdFx0eCA9IDAuODMzIC0gMC44MzMqKHNlYXROdW0tNSk7XG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCh4LCB5LCAxLjA1KTtcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLCAwKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgODogY2FzZSA5OlxuXHRcdFx0eiA9IDAuNDM3IC0gMC44NzQqKHNlYXROdW0tOCk7XG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgtMS40MjUsIHksIHopO1xuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLTEuNSpNYXRoLlBJLCAwKTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLnVwZGF0ZU93bmVyc2hpcC5iaW5kKHRoaXMpKTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdjaGVja2VkSW4nLCBpZCA9PiB7XG5cdFx0XHRpZih0aGlzLm93bmVyID09PSBpZClcblx0XHRcdFx0dGhpcy51cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lOiBTSC5nYW1lLCBwbGF5ZXJzOiBTSC5wbGF5ZXJzfX0pO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5uYW1lcGxhdGUgPSBuZXcgTmFtZXBsYXRlKHRoaXMpO1xuXHRcdHRoaXMuYmFsbG90ID0gbmV3IEJhbGxvdCh0aGlzKTtcblx0XHR0aGlzLnBsYXllckluZm8gPSBuZXcgUGxheWVySW5mbyh0aGlzKTtcblx0XHR0aGlzLmhpdGJveCA9IG5ldyBIaXRib3godGhpcyk7XG5cdH1cblxuXHR1cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXG5cdHtcblx0XHRsZXQgaWRzID0gZ2FtZS50dXJuT3JkZXIgfHwgW107XG5cblx0XHQvLyByZWdpc3RlciB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSBjbGFpbWVkXG5cdFx0aWYoICF0aGlzLm93bmVyIClcblx0XHR7XG5cdFx0XHQvLyBjaGVjayBpZiBhIHBsYXllciBoYXMgam9pbmVkIGF0IHRoaXMgc2VhdFxuXHRcdFx0Zm9yKGxldCBpIGluIGlkcyl7XG5cdFx0XHRcdGlmKHBsYXllcnNbaWRzW2ldXS5zZWF0TnVtID09IHRoaXMuc2VhdE51bSl7XG5cdFx0XHRcdFx0dGhpcy5vd25lciA9IGlkc1tpXTtcblx0XHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KHBsYXllcnNbaWRzW2ldXS5kaXNwbGF5TmFtZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyByZXNldCB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSB2YWNhdGVkXG5cdFx0aWYoICFpZHMuaW5jbHVkZXModGhpcy5vd25lcikgKVxuXHRcdHtcblx0XHRcdHRoaXMub3duZXIgPSAnJztcblx0XHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KCc8Sm9pbj4nKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyB1cGRhdGUgZGlzY29ubmVjdCBjb2xvcnNcblx0XHRlbHNlIGlmKCAhcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcblx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweDgwODA4MCk7XG5cdFx0fVxuXHRcdGVsc2UgaWYoIHBsYXllcnNbdGhpcy5vd25lcl0uY29ubmVjdGVkICl7XG5cdFx0XHR0aGlzLm5hbWVwbGF0ZS5tb2RlbC5tYXRlcmlhbC5jb2xvci5zZXRIZXgoMHhmZmZmZmYpO1xuXHRcdH1cblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtQbGFjZWhvbGRlck1lc2gsIE5CaWxsYm9hcmQsIE5UZXh0fSBmcm9tICcuL25hdGl2ZWNvbXBvbmVudHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb250aW51ZUJveCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHBhcmVudClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5pY29uID0gbmV3IFRIUkVFLk1lc2goXG5cdFx0XHRuZXcgVEhSRUUuQm94QnVmZmVyR2VvbWV0cnkoLjIsIC4xLCAuMiksXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe2NvbG9yOiAweDAwYzAwMH0pXG5cdFx0KTtcblx0XHR0aGlzLmljb24uYWRkQmVoYXZpb3IobmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuU3BpbigpKTtcblx0XHR0aGlzLmFkZCh0aGlzLmljb24pO1xuXG5cdFx0dGhpcy50ZXh0ID0gUGxhY2Vob2xkZXJNZXNoLmNsb25lKCk7XG5cdFx0dGhpcy50ZXh0LnBvc2l0aW9uLnNldCgwLCAuMiwgMCk7XG5cdFx0dGhpcy50ZXh0LnVzZXJEYXRhLmFsdHNwYWNlID0ge2NvbGxpZGVyOiB7ZW5hYmxlZDogdHJ1ZX19O1xuXG5cdFx0bGV0IGJiID0gbmV3IE5CaWxsYm9hcmQodGhpcy50ZXh0KTtcblxuXHRcdHRoaXMudGV4dENvbXBvbmVudCA9IG5ldyBOVGV4dCh0aGlzLnRleHQpO1xuXHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe2ZvbnRTaXplOiAxLCB3aWR0aDogMSwgaGVpZ2h0OiAxLCBob3Jpem9udGFsQWxpZ246ICdtaWRkbGUnLCB2ZXJ0aWNhbEFsaWduOiAnbWlkZGxlJ30pO1xuXG5cdFx0dGhpcy5hZGQodGhpcy50ZXh0KTtcblxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAuMywgMCk7XG5cdFx0cGFyZW50LmFkZCh0aGlzKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIHRoaXMub25zdGF0ZWNoYW5nZS5iaW5kKHRoaXMpKTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy5wbGF5ZXJTZXR1cC5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5vbmNsaWNrLmJpbmQodGhpcykpO1xuXHR9XG5cblx0b25jbGljayhldnQpXG5cdHtcblx0XHRpZihTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2NvbnRpbnVlJyk7XG5cdH1cblxuXHRvbnN0YXRlY2hhbmdlKHtkYXRhOiB7Z2FtZX19KVxuXHR7XG5cdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyl7XG5cdFx0XHR0aGlzLmljb24udmlzaWJsZSA9IHRydWU7XG5cdFx0XHR0aGlzLnRleHQudmlzaWJsZSA9IHRydWU7XG5cdFx0XHR0aGlzLnRleHRDb21wb25lbnQudXBkYXRlKHt0ZXh0OiAnQ2xpY2sgdG8gY29udGludWUnfSk7XG5cdFx0fVxuXHRcdGVsc2UgaWYoZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHR0aGlzLnBsYXllclNldHVwKHtkYXRhOiB7Z2FtZX19KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR0aGlzLmljb24udmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0dGhpcy50ZXh0LnZpc2libGUgPSBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRwbGF5ZXJTZXR1cCh7ZGF0YToge2dhbWV9fSlcblx0e1xuXHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xuXHRcdFx0dGhpcy50ZXh0LnZpc2libGUgPSB0cnVlO1xuXHRcdFx0XG5cdFx0XHRpZihnYW1lLnR1cm5PcmRlci5sZW5ndGggPj0gNSl7XG5cdFx0XHRcdHRoaXMuaWNvbi52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy50ZXh0Q29tcG9uZW50LnVwZGF0ZSh7dGV4dDogJ0NsaWNrIHRvIHN0YXJ0J30pO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMuaWNvbi52aXNpYmxlID0gZmFsc2U7XG5cdFx0XHRcdHRoaXMudGV4dENvbXBvbmVudC51cGRhdGUoe3RleHQ6XG5cdFx0XHRcdFx0YE5lZWQgJHs1LWdhbWUudHVybk9yZGVyLmxlbmd0aH0gbW9yZSBwbGF5ZXIke2dhbWUudHVybk9yZGVyLmxlbmd0aCE9NCA/ICdzJyA6ICcnfSFgXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTsiLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCAnLi9wb2x5ZmlsbCc7XG5cbmltcG9ydCAqIGFzIENhcmRzIGZyb20gJy4vY2FyZCc7XG5pbXBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfSBmcm9tICcuL2hhdHMnO1xuaW1wb3J0IEdhbWVUYWJsZSBmcm9tICcuL3RhYmxlJztcbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IHsgZ2V0R2FtZUlkLCBtZXJnZU9iamVjdHMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnO1xuaW1wb3J0IFNlYXQgZnJvbSAnLi9zZWF0JztcbmltcG9ydCBQbGF5ZXJNZXRlciBmcm9tICcuL3BsYXllcm1ldGVyJztcbmltcG9ydCBDb250aW51ZUJveCBmcm9tICcuL2NvbnRpbnVlYm94JztcblxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmFzc2V0cyA9IEFzc2V0TWFuYWdlci5tYW5pZmVzdDtcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcblx0XHR0aGlzLm5lZWRzU2tlbGV0b24gPSBmYWxzZTtcblxuXHRcdC8vIHBvbHlmaWxsIGdldFVzZXIgZnVuY3Rpb25cblx0XHRpZighYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdFx0YWx0c3BhY2UuZ2V0VXNlciA9ICgpID0+IHtcblx0XHRcdFx0bGV0IGlkLCByZSA9IC9bPyZddXNlcklkPShcXGQrKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcblx0XHRcdFx0aWYocmUpXG5cdFx0XHRcdFx0aWQgPSByZVsxXTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMDApLnRvU3RyaW5nKCk7XG5cblx0XHRcdFx0YWx0c3BhY2UuX2xvY2FsVXNlciA9IHtcblx0XHRcdFx0XHR1c2VySWQ6IGlkLFxuXHRcdFx0XHRcdGRpc3BsYXlOYW1lOiBpZCxcblx0XHRcdFx0XHRpc01vZGVyYXRvcjogL2lzTW9kZXJhdG9yLy50ZXN0KHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpXG5cdFx0XHRcdH07XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdNYXNxdWVyYWRpbmcgYXMnLCBhbHRzcGFjZS5fbG9jYWxVc2VyKTtcblx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShhbHRzcGFjZS5fbG9jYWxVc2VyKTtcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8gZ2V0IGxvY2FsIHVzZXJcblx0XHR0aGlzLl91c2VyUHJvbWlzZSA9IGFsdHNwYWNlLmdldFVzZXIoKTtcblx0XHR0aGlzLl91c2VyUHJvbWlzZS50aGVuKHVzZXIgPT4ge1xuXHRcdFx0dGhpcy5sb2NhbFVzZXIgPSB7XG5cdFx0XHRcdGlkOiB1c2VyLnVzZXJJZCxcblx0XHRcdFx0ZGlzcGxheU5hbWU6IHVzZXIuZGlzcGxheU5hbWUsXG5cdFx0XHRcdGlzTW9kZXJhdG9yOiB1c2VyLmlzTW9kZXJhdG9yXG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5nYW1lID0ge307XG5cdFx0dGhpcy5wbGF5ZXJzID0ge307XG5cdFx0dGhpcy52b3RlcyA9IHt9O1xuXHR9XG5cblx0aW5pdGlhbGl6ZShlbnYsIHJvb3QsIGFzc2V0cylcblx0e1xuXHRcdC8vIHNoYXJlIHRoZSBkaW9yYW1hIGluZm9cblx0XHRBc3NldE1hbmFnZXIuY2FjaGUgPSBhc3NldHM7XG5cdFx0QXNzZXRNYW5hZ2VyLmZpeE1hdGVyaWFscygpO1xuXHRcdHRoaXMuZW52ID0gZW52O1xuXG5cdFx0Ly8gY29ubmVjdCB0byBzZXJ2ZXJcblx0XHR0aGlzLnNvY2tldCA9IGlvLmNvbm5lY3QoJy8nLCB7cXVlcnk6ICdnYW1lSWQ9JytnZXRHYW1lSWQoKX0pO1xuXG5cdFx0Ly8gY3JlYXRlIHRoZSB0YWJsZVxuXHRcdHRoaXMudGFibGUgPSBuZXcgR2FtZVRhYmxlKCk7XG5cdFx0dGhpcy5hZGQodGhpcy50YWJsZSk7XG5cblx0XHR0aGlzLnJlc2V0QnV0dG9uID0gbmV3IFRIUkVFLk1lc2goXG5cdFx0XHRuZXcgVEhSRUUuQm94R2VvbWV0cnkoLjI1LC4yNSwuMjUpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IGFzc2V0cy50ZXh0dXJlcy5yZXNldH0pXG5cdFx0KTtcblx0XHR0aGlzLnJlc2V0QnV0dG9uLnBvc2l0aW9uLnNldCgwLCAtMC4xOCwgMCk7XG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuc2VuZFJlc2V0LmJpbmQodGhpcykpO1xuXHRcdHRoaXMudGFibGUuYWRkKHRoaXMucmVzZXRCdXR0b24pO1xuXG5cdFx0Ly8gY3JlYXRlIGlkbGUgZGlzcGxheVxuXHRcdHRoaXMuaWRsZVJvb3QgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblx0XHR0aGlzLmlkbGVSb290LnBvc2l0aW9uLnNldCgwLCAxLjg1LCAwKTtcblx0XHR0aGlzLmlkbGVSb290LmFkZEJlaGF2aW9yKG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLlNwaW4oe3NwZWVkOiAwLjAwMDJ9KSk7XG5cdFx0dGhpcy5hZGQodGhpcy5pZGxlUm9vdCk7XG5cblx0XHQvLyBjcmVhdGUgaWRsZSBzbGlkZXNob3dcblx0XHRsZXQgY3JlZGl0cyA9IG5ldyBDYXJkcy5DcmVkaXRzQ2FyZCgpO1xuXHRcdHRoaXMuaWRsZVJvb3QuYWRkKGNyZWRpdHMpO1xuXG5cdFx0Ly8gY3JlYXRlIGhhdHNcblx0XHR0aGlzLnByZXNpZGVudEhhdCA9IG5ldyBQcmVzaWRlbnRIYXQoKTtcblx0XHR0aGlzLmNoYW5jZWxsb3JIYXQgPSBuZXcgQ2hhbmNlbGxvckhhdCgpO1xuXG5cdFx0Ly8gY3JlYXRlIHBvc2l0aW9uc1xuXHRcdHRoaXMuc2VhdHMgPSBbXTtcblx0XHRmb3IobGV0IGk9MDsgaTwxMDsgaSsrKXtcblx0XHRcdHRoaXMuc2VhdHMucHVzaCggbmV3IFNlYXQoaSkgKTtcblx0XHR9XG5cblx0XHR0aGlzLnRhYmxlLmFkZCguLi50aGlzLnNlYXRzKTtcblxuXHRcdC8vdGhpcy5wbGF5ZXJNZXRlciA9IG5ldyBQbGF5ZXJNZXRlcigpO1xuXHRcdC8vdGhpcy50YWJsZS5hZGQodGhpcy5wbGF5ZXJNZXRlcik7XG5cdFx0dGhpcy5jb250aW51ZUJveCA9IG5ldyBDb250aW51ZUJveCh0aGlzLnRhYmxlKTtcblxuXHRcdC8vIGFkZCBhdmF0YXIgZm9yIHNjYWxlXG5cdFx0Lyphc3NldHMubW9kZWxzLmR1bW15LnBvc2l0aW9uLnNldCgwLCAtMC4xMiwgMS4xKTtcblx0XHRhc3NldHMubW9kZWxzLmR1bW15LnJvdGF0ZVooTWF0aC5QSSk7XG5cdFx0dGhpcy5hZGQoYXNzZXRzLm1vZGVscy5kdW1teSk7Ki9cblxuXHRcdHRoaXMuc29ja2V0Lm9uKCd1cGRhdGUnLCB0aGlzLnVwZGF0ZUZyb21TZXJ2ZXIuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5zb2NrZXQub24oJ2NoZWNrZWRJbicsIHRoaXMuY2hlY2tlZEluLmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5zb2NrZXQub24oJ3Jlc2V0JywgdGhpcy5kb1Jlc2V0LmJpbmQodGhpcykpO1xuXHRcdHRoaXMuc29ja2V0Lm9uKCdkaXNjb25uZWN0JywgdGhpcy5kb1Jlc2V0LmJpbmQodGhpcykpO1xuXHR9XG5cblx0dXBkYXRlRnJvbVNlcnZlcihnZCwgcGQsIHZkKVxuXHR7XG5cdFx0Y29uc29sZS5sb2coZ2QsIHBkLCB2ZCk7XG5cblx0XHRsZXQgZ2FtZSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2FtZSwgZ2QpO1xuXHRcdGxldCBwbGF5ZXJzID0gbWVyZ2VPYmplY3RzKHRoaXMucGxheWVycywgcGQgfHwge30pO1xuXHRcdGxldCB2b3RlcyA9IG1lcmdlT2JqZWN0cyh0aGlzLnZvdGVzLCB2ZCB8fCB7fSk7XG5cblx0XHRmb3IobGV0IGZpZWxkIGluIGdkKVxuXHRcdHtcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHRcdHR5cGU6ICd1cGRhdGVfJytmaWVsZCxcblx0XHRcdFx0YnViYmxlczogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRnYW1lOiBnYW1lLFxuXHRcdFx0XHRcdHBsYXllcnM6IHBsYXllcnMsXG5cdFx0XHRcdFx0dm90ZXM6IHZvdGVzXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHRoaXMuX3VzZXJQcm9taXNlLnRoZW4oKCkgPT4ge1xuXHRcdFx0aWYocGxheWVyc1t0aGlzLmxvY2FsVXNlci5pZF0gJiYgIXBsYXllcnNbdGhpcy5sb2NhbFVzZXIuaWRdLmNvbm5lY3RlZCl7XG5cdFx0XHRcdHRoaXMuc29ja2V0LmVtaXQoJ2NoZWNrX2luJywgdGhpcy5sb2NhbFVzZXIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcblx0XHR0aGlzLnBsYXllcnMgPSBwbGF5ZXJzO1xuXHRcdHRoaXMudm90ZXMgPSB2b3Rlcztcblx0fVxuXG5cdGNoZWNrZWRJbihwKVxuXHR7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLnBsYXllcnNbcC5pZF0sIHApO1xuXHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHR0eXBlOiAnY2hlY2tlZEluJyxcblx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxuXHRcdFx0ZGF0YTogcC5pZFxuXHRcdH0pO1xuXHR9XG5cblx0c2VuZFJlc2V0KGUpe1xuXHRcdGlmKHRoaXMubG9jYWxVc2VyLmlzTW9kZXJhdG9yKXtcblx0XHRcdGNvbnNvbGUubG9nKCdyZXF1ZXN0aW5nIHJlc2V0Jyk7XG5cdFx0XHR0aGlzLnNvY2tldC5lbWl0KCdyZXNldCcpO1xuXHRcdH1cblx0fVxuXG5cdGRvUmVzZXQoKVxuXHR7XG5cdFx0aWYoIC8mY2FjaGVCdXN0PVxcZCskLy50ZXN0KHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpICl7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24uc2VhcmNoICs9ICcxJztcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24uc2VhcmNoICs9ICcmY2FjaGVCdXN0PTEnO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgU2VjcmV0SGl0bGVyKCk7XG4iXSwibmFtZXMiOlsidGhpcyIsImxldCIsInN1cGVyIiwiQXNzZXRNYW5hZ2VyIiwiQmFsbG90VHlwZS5DT05GSVJNIiwidXBkYXRlU3RhdGUiLCJCYWxsb3RUeXBlLlBMQVlFUlNFTEVDVCIsIkJhbGxvdFR5cGUuUE9MSUNZIiwib3B0cyIsIkJQLnVwZGF0ZVZvdGVzSW5Qcm9ncmVzcyIsIkJQLnVwZGF0ZVN0YXRlIiwiQlBCQS50b0FycmF5IiwiQ2FyZHMuQ3JlZGl0c0NhcmQiXSwibWFwcGluZ3MiOiI7OztBQUVBLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztDQUM1QixNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFO0VBQ2xELEtBQUssRUFBRSxTQUFTLElBQUksQ0FBQztHQUNwQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7R0FDL0I7RUFDRCxRQUFRLEVBQUUsS0FBSztFQUNmLFVBQVUsRUFBRSxLQUFLO0VBQ2pCLFlBQVksRUFBRSxLQUFLO0VBQ25CLENBQUMsQ0FBQztDQUNIOztBQ1RELFNBQWU7Q0FDZCxRQUFRLEVBQUU7RUFDVCxNQUFNLEVBQUU7R0FDUCxLQUFLLEVBQUUseUJBQXlCO0dBQ2hDLFNBQVMsRUFBRSw0QkFBNEI7R0FDdkMsTUFBTSxFQUFFLDBCQUEwQjtHQUNsQyxRQUFRLEVBQUUsNkJBQTZCOzs7R0FHdkM7RUFDRCxRQUFRLEVBQUU7R0FDVCxXQUFXLEVBQUUsNEJBQTRCO0dBQ3pDLFNBQVMsRUFBRSw2QkFBNkI7R0FDeEMsV0FBVyxFQUFFLDRCQUE0QjtHQUN6QyxLQUFLLEVBQUUsc0JBQXNCO0dBQzdCLEtBQUssRUFBRSxxQkFBcUI7R0FDNUIsSUFBSSxFQUFFLHFCQUFxQjtHQUMzQjtFQUNEO0NBQ0QsS0FBSyxFQUFFLEVBQUU7Q0FDVCxZQUFZLEVBQUU7Q0FDZDs7O0VBQ0MsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEVBQUUsRUFBQztHQUN6Q0EsTUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQUEsR0FBRyxFQUFDO0lBQ2xDLEdBQUcsR0FBRyxDQUFDLFFBQVEsWUFBWSxLQUFLLENBQUMsb0JBQW9CLENBQUM7S0FDckRDLElBQUksTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLGlCQUFpQixFQUFFLENBQUM7S0FDM0MsTUFBTSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztLQUM5QixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ3RDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO0tBQ3RCO0lBQ0QsQ0FBQyxDQUFDO0dBQ0gsQ0FBQyxDQUFDO0VBQ0g7Q0FDRCxDQUFBOztBQy9CRCxJQUFNLFFBQVEsR0FDZCxpQkFDWSxDQUFDLElBQUksQ0FBQztDQUNqQixJQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztDQUNqQixDQUFBOztBQUVGLG1CQUFDLEtBQUssbUJBQUMsR0FBRyxDQUFDO0NBQ1YsSUFBSyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUM7Q0FDcEIsQ0FBQTs7QUFFRixtQkFBQyxLQUFLLG9CQUFFLEdBQUcsQ0FBQTs7QUFFWCxtQkFBQyxNQUFNLG9CQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUE7O0FBRWQsbUJBQUMsT0FBTyxzQkFBRSxHQUFHLENBQUEsQUFHYixBQUNBLEFBWUMsQUFNQSxBQU1BLEFBV0QsQUFBMkI7O0FDckQzQixJQUFNLE9BQU8sR0FBaUI7Q0FDOUIsZ0JBQ1k7RUFDVixHQUFBO0NBQ0Q7NkRBRFMsSUFBSSxDQUFNO2lEQUFBLElBQUksQ0FBTztxREFBQSxJQUFJLENBQVE7eURBQUEsSUFBSSxDQUFTOzZEQUFBLElBQUksQ0FBVztxRUFBQSxHQUFHLENBQVc7Z0ZBQUUsRUFBSTs7RUFFekZDLFdBQUssS0FBQSxDQUFDLE1BQUEsU0FBUyxDQUFDLENBQUM7O0VBRWpCLEdBQUcsTUFBTTtFQUNUOztHQUVDLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztHQUMxQixJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7R0FDOUIsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0dBQzVCLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztHQUNuQzs7RUFFRCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLFFBQUEsTUFBTSxFQUFFLEtBQUEsR0FBRyxFQUFFLE1BQUEsSUFBSSxFQUFFLE9BQUEsS0FBSyxFQUFFLFVBQUEsUUFBUSxFQUFFLFVBQUEsUUFBUSxDQUFDLENBQUMsQ0FBQztFQUNwRTs7Ozt5Q0FBQTs7Q0FFRCxrQkFBQSxLQUFLLG1CQUFDLEdBQUc7Q0FDVDtFQUNDQSxxQkFBSyxDQUFDLEtBQUssS0FBQSxDQUFDLE1BQUEsR0FBRyxDQUFDLENBQUM7OztFQUdqQixHQUFHLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxHQUFHLENBQUMsTUFBTTtFQUM1QztHQUNDLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztHQUN4Q0QsSUFBSSxHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7R0FDbEUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7R0FFckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7R0FDckI7OztFQUdELElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUN2QyxJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7RUFDMUMsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0VBQ3RDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0VBQzVCLENBQUE7O0NBRUQsa0JBQUEsTUFBTTtDQUNOOztFQUVDQSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztFQUN0REEsSUFBSSxJQUFJLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxVQUFBLENBQUMsRUFBQyxTQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQSxDQUFDO0VBQzdELEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7OztFQUc5QixJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7R0FDYixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0dBQ25FOzs7RUFHRCxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7R0FDZCxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUE7R0FDbEY7OztFQUdELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtHQUNmLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7R0FDcEU7OztFQUdELEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztHQUNYLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQ25DLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztHQUNsQztFQUNELENBQUE7OztFQW5Fb0IsUUFvRXJCLEdBQUE7O0FBRUQsT0FBTyxDQUFDLEtBQUssR0FBRyxVQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUU7Q0FFOUJBLElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztDQUNsRCxHQUFHLE9BQU8sQ0FBQztFQUNWLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDMUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztFQUN0QjtNQUNJO0VBQ0osTUFBTSxDQUFDLFdBQVcsRUFBRSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0VBQ3hDO0NBQ0QsQ0FBQSxBQUVELEFBQXVCOztBQy9FdkJBLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7Q0FDekIsY0FBYyxFQUFFLENBQUM7Q0FDakIsY0FBYyxFQUFFLENBQUM7Q0FDakIsWUFBWSxFQUFFLENBQUM7Q0FDZixZQUFZLEVBQUUsQ0FBQztDQUNmLFdBQVcsRUFBRSxDQUFDO0NBQ2QsYUFBYSxFQUFFLENBQUM7Q0FDaEIsYUFBYSxFQUFFLENBQUM7Q0FDaEIsRUFBRSxFQUFFLENBQUM7Q0FDTCxJQUFJLEVBQUUsQ0FBQztDQUNQLEtBQUssRUFBRSxDQUFDO0NBQ1IsT0FBTyxFQUFFLEVBQUU7Q0FDWCxDQUFDLENBQUM7O0FBRUhBLElBQUksUUFBUSxHQUFHLElBQUk7SUFBRSxRQUFRLEdBQUcsSUFBSSxDQUFDOztBQUVyQyxTQUFTLFlBQVk7QUFDckI7Q0FDQ0EsSUFBSSxTQUFTLEdBQUc7O0VBRWYsTUFBTSxFQUFFLEdBQUcsRUFBRSxNQUFNO0VBQ25CLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNO0VBQ25CLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU07RUFDbkIsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU07RUFDbkIsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUs7RUFDbkIsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSztFQUNuQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUs7RUFDbkIsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSzs7O0VBR25CLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNO0VBQ25CLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTTtFQUNuQixDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTTtFQUNuQixDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNO0VBQ25CLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUs7RUFDbkIsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUs7RUFDbkIsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSztFQUNuQixDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUs7Ozs7RUFJbkIsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0VBQ3RGLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7RUFDdEYsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtFQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQ3RGLENBQUM7O0NBRUZBLElBQUksT0FBTyxHQUFHOztFQUViLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMxQixDQUFDOzs7Q0FHRkEsSUFBSSxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUN2RUEsSUFBSSxJQUFJLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDNUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztDQUNwQixJQUFJLEdBQUcsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxN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TUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztFQUNwQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7RUFFckMsS0FBS0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFO0VBQzdCO0dBQ0MsS0FBS0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO0dBQzNCO0lBQ0NBLElBQUksTUFBTSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7O0lBR3RDLEtBQUssQ0FBQyxHQUFHLENBQUM7S0FDVCxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3JDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7SUFFWCxLQUFLLENBQUMsR0FBRyxDQUFDO0tBQ1QsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3RDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7SUFFWEEsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQ0EsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyQ0EsSUFBSSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2pFQSxJQUFJLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDakUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ1YsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkIsUUFBUSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDdkI7OztJQUdELEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFDVjtLQUNDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2hELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2hEOztJQUVEO0tBQ0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDbEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7O0tBRWxELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2xEO0lBQ0Q7OztHQUdEQSxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUM3Q0EsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDN0MsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ1YsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDckIsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDckI7O0dBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FDNUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FDNUM7O0VBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ25FLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsZUFBZSxD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RyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUMvQixNQUFNO0VBQ1AsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDYixDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7R0FDL0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7R0FDcEMsTUFBTTtFQUNQLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDckIsQ0FBQyxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDOUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztHQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0dBQ2xDLE1BQU07RUFDUCxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUNiLENBQUMsR0FBRyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztHQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FB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
