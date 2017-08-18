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
			board_large: 'static/img/board-large.png',
			board_med: 'static/img/board-medium.png',
			board_small: 'static/img/board-small.png',
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

function dimsToUV(ref)
{
	var side = ref.side;
	var left = ref.left;
	var right = ref.right;
	var top = ref.top;
	var bottom = ref.bottom;

	if(side)
		{ return [[
			new THREE.Vector2(top, left),
			new THREE.Vector2(bottom, left),
			new THREE.Vector2(top, right)
		],[
			new THREE.Vector2(bottom, left),
			new THREE.Vector2(bottom, right),
			new THREE.Vector2(top, right)
		]]; }
	else
		{ return [[
			new THREE.Vector2(left, top),
			new THREE.Vector2(left, bottom),
			new THREE.Vector2(right, top)
		],[
			new THREE.Vector2(left, bottom),
			new THREE.Vector2(right, bottom),
			new THREE.Vector2(right, top)
		]]; }
}

function getUVs(type)
{
	var dims = {left: 0, right: 1, bottom: 0, top: 1};

	switch(type)
	{
	case Types.POLICY_LIBERAL:
		dims = {side: true, left: 0.834, right: 0.996, top: 0.754, bottom: 0.997};
		break;
	case Types.POLICY_FASCIST:
		dims = {side: true, left: 0.66, right: 0.822, top: 0.754, bottom: 0.996};
		break;
	case Types.ROLE_LIBERAL:
		dims = {left: 0.505, right: 0.746, top: 0.996, bottom: 0.65};
		break;
	case Types.ROLE_FASCIST:
		dims = {left: 0.505, right: 0.746, top: 0.645, bottom: 0.3};
		break;
	case Types.ROLE_HITLER:
		dims = {left: 0.754, right: 0.996, top: 0.645, bottom: 0.3};
		break;
	case Types.PARTY_LIBERAL:
		dims = {left: 0.255, right: 0.495, top: 0.996, bottom: 0.65};
		break;
	case Types.PARTY_FASCIST:
		dims = {left: 0.255, right: 0.495, top: 0.645, bottom: 0.3};
		break;
	case Types.JA:
		dims = {left: 0.005, right: 0.244, top: 0.992, bottom: 0.653};
		break;
	case Types.NEIN:
		dims = {left: 0.006, right: 0.243, top: 0.642, bottom: 0.302};
		break;
	case Types.CREDITS:
		dims = {side: true, left: 0.015, right: 0.276, top: 0.397, bottom: 0.765};
		break;
	case Types.BLANK:
	default:
		dims = {side: true, left: 0.022, right: .022+0.247, top: 0.021, bottom: .021+0.3543};
		break;
	}

	return dimsToUV(dims);
}


var Card = (function (superclass) {
	function Card(type, doubleSided)
	{
		if ( type === void 0 ) type = Types.BLANK;
		if ( doubleSided === void 0 ) doubleSided = true;

		superclass.call(this);

		// create the card faces
		var frontGeo = new THREE.PlaneGeometry(.715, 1);
		var backGeo = frontGeo.clone();
		var cardMat = new THREE.MeshBasicMaterial({map: AM.cache.textures.cards});
		var front = new THREE.Mesh(frontGeo, cardMat);
		var back = new THREE.Mesh(backGeo, cardMat);
		back.position.set(0.001, 0, 0);
		front.position.set(-0.001, 0, 0);
		back.rotateY(Math.PI);

		// set the faces to the correct part of the texture
		front.geometry.faceVertexUvs = [getUVs(type)];
		back.geometry.faceVertexUvs = [getUVs( doubleSided ? type : Types.BLANK )];
		this.scale.setScalar(0.7);
		this.add(front, back);
	}

	if ( superclass ) Card.__proto__ = superclass;
	Card.prototype = Object.create( superclass && superclass.prototype );
	Card.prototype.constructor = Card;

	Card.prototype.hide = function hide (){
		this.children.forEach(function (o) { o.visible = false; });
	};

	Card.prototype.show = function show (){
		this.children.forEach(function (o) { o.visible = true; });
	};

	return Card;
}(THREE.Object3D));

var CreditsCard = (function (Card) {
	function CreditsCard(){
		Card.call(this, Types.CREDITS);
		var self = this;

		function setVisibility(ref){
			var state = ref.data.game.state;

			if(state === 'setup')
				{ self.children.forEach(function (o) { o.visible = true; }); }
			else
				{ self.children.forEach(function (o) { o.visible = false; }); }
		}

		SH.addEventListener('update_state', setVisibility);
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
		Card.call(this, Types.ROLE_LIBERAL, false);
	}

	if ( Card ) LiberalRoleCard.__proto__ = Card;
	LiberalRoleCard.prototype = Object.create( Card && Card.prototype );
	LiberalRoleCard.prototype.constructor = LiberalRoleCard;

	return LiberalRoleCard;
}(Card));

var FascistRoleCard = (function (Card) {
	function FascistRoleCard(){
		Card.call(this, Types.ROLE_FASCIST, false);
	}

	if ( Card ) FascistRoleCard.__proto__ = Card;
	FascistRoleCard.prototype = Object.create( Card && Card.prototype );
	FascistRoleCard.prototype.constructor = FascistRoleCard;

	return FascistRoleCard;
}(Card));

var HitlerRoleCard = (function (Card) {
	function HitlerRoleCard(){
		Card.call(this, Types.ROLE_HITLER, false);
	}

	if ( Card ) HitlerRoleCard.__proto__ = Card;
	HitlerRoleCard.prototype = Object.create( Card && Card.prototype );
	HitlerRoleCard.prototype.constructor = HitlerRoleCard;

	return HitlerRoleCard;
}(Card));

var JaCard = (function (Card) {
	function JaCard(){
		Card.call(this, Types.JA, false);
		this.children[0].rotateZ(-Math.PI/2);
		this.children[1].rotateZ(-Math.PI/2);
	}

	if ( Card ) JaCard.__proto__ = Card;
	JaCard.prototype = Object.create( Card && Card.prototype );
	JaCard.prototype.constructor = JaCard;

	return JaCard;
}(Card));

var NeinCard = (function (Card) {
	function NeinCard(){
		Card.call(this, Types.NEIN, false);
		this.children[0].rotateZ(-Math.PI/2);
		this.children[1].rotateZ(-Math.PI/2);
	}

	if ( Card ) NeinCard.__proto__ = Card;
	NeinCard.prototype = Object.create( Card && Card.prototype );
	NeinCard.prototype.constructor = NeinCard;

	return NeinCard;
}(Card));

var Hat = (function (superclass) {
	function Hat(model)
	{
		var this$1 = this;

		superclass.call(this);
		this.currentId = '';

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
			altspace.addNativeComponent(this.hat, 'n-skeleton-parent');
			altspace.addNativeComponent(this.text, 'n-skeleton-parent');
		}
		else if(this.currentId && !userId){
			altspace.removeNativeComponent(this.hat, 'n-skeleton-parent');
			altspace.removeNativeComponent(this.text, 'n-skeleton-parent');
			d.scene.remove(this);
		}

		if(userId){
			var settings = {index: 0, part: 'head', side: 'center', userId: userId};
			altspace.updateNativeComponent(this.hat, 'n-skeleton-parent', settings);
			altspace.updateNativeComponent(this.text, 'n-skeleton-parent', settings);
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

		// save references to the textures
		this.textures = [
			AM.cache.textures.board_small,
			AM.cache.textures.board_med,
			AM.cache.textures.board_large
		];

		// de-flip textures
		this.textures.forEach(function (tex) { return tex.flipY = false; });

		// add table asset
		this.model = AM.cache.models.table;
		this.model.scale.setScalar(1.25);
		this.add(this.model);

		// set the default material
		this.setTexture(this.textures[0], true);

		// position table
		this.position.set(0, 0.8, 0);

		SH.addEventListener('update_turnOrder', this.changeMode.bind(this));
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

function generateQuestion(text, texture)
{
	if ( texture === void 0 ) texture = null;

	var fontStack = '"Helvetica Neue", Helvetica, Arial, Sans-Serif';

	// set up canvas
	var bmp;
	if(!texture){
		bmp = document.createElement('canvas');
		bmp.width = 512;
		bmp.height = 256;
	}
	else {
		bmp = texture.image;
	}

	var g = bmp.getContext('2d');
	g.clearRect(0, 0, 512, 256);
	g.textAlign = 'center';
	g.fillStyle = 'white';

	// write text
	g.font = 'bold 50px '+fontStack;
	var lines = text.split('\n');
	for(var i=0; i<lines.length; i++){
		g.fillText(lines[i], 256, 50+55*i);
	}

	if(texture){
		texture.needsUpdate = true;
		return texture;
	}
	else {
		return new THREE.CanvasTexture(bmp);
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

var Ballot = (function (superclass) {
	function Ballot(seat)
	{
		superclass.call(this);
		this.seat = seat;
		this.position.set(0, -0.3, 0.25);
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
			c.rotation.set(0.5, Math.PI, 0);
			c.scale.setScalar(0.15);
			c.hide();
		});
		this.add(this.jaCard, this.neinCard);

		var geo = new THREE.PlaneBufferGeometry(0.4, 0.2);
		var mat = new THREE.MeshBasicMaterial({transparent: true});
		this.question = new THREE.Mesh(geo, mat);
		this.question.position.set(0, 0.05, 0);
		this.question.rotation.set(0, Math.PI, 0);
		this.question.visible = false;
		this.add(this.question);

		SH.addEventListener('update_votesInProgress', this.update.bind(this));
	}

	if ( superclass ) Ballot.__proto__ = superclass;
	Ballot.prototype = Object.create( superclass && superclass.prototype );
	Ballot.prototype.constructor = Ballot;

	Ballot.prototype.update = function update (ref)
	{
		var ref_data = ref.data;
		var game = ref_data.game;
		var players = ref_data.players;
		var votes = ref_data.votes;

		var self = this;
		if(!self.seat.owner) { return; }

		var vips = game.votesInProgress;
		var blacklistedVotes = vips.filter(function (id) {
			var vs = votes[id].yesVoters.concat( votes[id].noVoters);
			var nv = votes[id].nonVoters;
			return nv.includes(self.seat.owner) || vs.includes(self.seat.owner);
		});
		var newVotes = vips.filter(
			function (id) { return (!SH.game.votesInProgress || !SH.game.votesInProgress.includes(id)) && !blacklistedVotes.includes(id); }
		);
		var finishedVotes = !SH.game.votesInProgress ? blacklistedVotes
			: SH.game.votesInProgress.filter(function (id) { return !vips.includes(id); }).concat(blacklistedVotes);

		newVotes.forEach(function (vId) {
			// generate new question to ask
			var questionText, choices = 2;
			if(votes[vId].type === 'elect'){
				questionText = players[game.president].displayName
					+ '\nfor president and\n'
					+ players[game.chancellor].displayName
					+ '\nfor chancellor?';
			}
			else if(votes[vId].type === 'join'){
				questionText = votes[vId].data + '\nto join?';
			}
			else if(votes[vId].type === 'kick'){
				questionText = 'Vote to kick\n'
					+ players[votes[vId].target1].displayName
					+ '?';
			}
			else if(votes[vId].type === 'confirmRole' && self.seat.owner === SH.localUser.id)
			{
				choices = 1;
				var role = players[SH.localUser.id].role;
				role = role.charAt(0).toUpperCase() + role.slice(1);
				questionText = 'Your role:\n' + role;
			}

			if(questionText)
			{
				self.askQuestion(questionText, vId, choices)
				.then(function (answer) {
					SH.socket.emit('vote', vId, SH.localUser.id, answer);
				})
				.catch(function () { return console.log('Vote scrubbed:', vId); });
			}
		});

		if(finishedVotes.includes(self.displayed)){
			self.dispatchEvent({type: 'cancelVote', bubbles: false});
		}
	};

	/*askQuestion(qText, id, choices = 2)
	{
		let self = this;
		let newQ = new CascadingPromise(self.questions[self.lastAsked],
			(resolve, reject) => {

				// make sure the answer is still relevant
				let latestVotes = SH.game.votesInProgress;
				if(!/^local/.test(id) && !latestVotes.includes(id)){
					reject();
					return;
				}

				// hook up q/a cards
				self.question.material.map = generateQuestion(qText, this.question.material.map);
				self.jaCard.addEventListener('cursorup', respond(true));
				self.neinCard.addEventListener('cursorup', respond(false));
				SH.addEventListener('unconfirmedChancellor', respond);

				// show the ballot
				self.question.visible = true;
				if(choices >= 1)
					self.jaCard.show();
				if(choices >= 2)
					self.neinCard.show();

				function respond(answer){
					function handler()
					{
						// make sure only the owner of the ballot is answering
						if(self.seat.owner !== SH.localUser.id) return;

						// make sure the answer still matters
						let latestVotes = SH.game.votesInProgress;
						if(!/^local/.test(id) && !latestVotes.includes(id))
							reject();
						else
							resolve(answer.data ? answer.data : answer);
					}

					if(answer === true) self._yesClickHandler = handler;
					else if(answer === false) self._noClickHandler = handler;
					else {
						self._nominateHandler = handler;
						handler();
					}
					return handler;
				}
			},
			(done) => {
				delete self.questions[id];
				if(self.lastAsked === id)
					self.lastAsked = null;

				// hide the question
				self.jaCard.hide();
				self.neinCard.hide();
				self.question.visible = false;
				self.jaCard.removeEventListener('cursorup', self._yesClickHandler);
				self.neinCard.removeEventListener('cursorup', self._noClickHandler);
				SH.removeEventListener('unconfirmedChancellor', self._nominateHandler);
				done();
			}
		);

		// add question to queue, remove when done
		self.questions[id] = newQ;
		self.lastAsked = id;
		let splice = () => {
			delete self.questions[id];
			if(self.lastAsked === id)
				self.lastAsked = null;
		};
		newQ.then(splice, splice);

		return newQ;
	}*/

	Ballot.prototype.askQuestion = function askQuestion (qText, id, choices)
	{
		if ( choices === void 0 ) choices = 2;

		var self = this;

		function isVoteValid()
		{
			var isLocalVote = /^local/.test(id);
			var isFirstUpdate = !SH.game.votesInProgress;
			var vote = SH.votes[id];
			var voters = vote ? vote.yesVoters.concat( vote.noVoters) : [];
			var alreadyVoted = voters.includes(self.seat.owner);
			return isLocalVote || isFirstUpdate || vote && !alreadyVoted;
		}

		function hookUpQuestion(){
			return new Promise(questionExecutor);
		}

		function questionExecutor(resolve, reject)
		{
			// make sure the answer is still relevant
			if(!isVoteValid()){
				return reject();
			}

			// show the ballot
			self.question.material.map = generateQuestion(qText, self.question.material.map);
			self.question.visible = true;

			// hook up q/a cards
			if(choices === 0){
				SH.addEventListener('playerSelect', respond('player', resolve, reject));
			}
			if(choices >= 1){
				self.jaCard.show();
				self.jaCard.addEventListener('cursorup', respond('yes', resolve, reject));
			}
			if(choices >= 2){
				self.neinCard.show();
				self.neinCard.addEventListener('cursorup', respond('no', resolve, reject));
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
				self.jaCard.hide();
				self.neinCard.hide();
				self.question.visible = false;
				self.displayed = null;
				self.jaCard.removeEventListener('cursorup', self._yesClickHandler);
				self.neinCard.removeEventListener('cursorup', self._noClickHandler);
				SH.removeEventListener('playerSelect', self._nominateHandler);

				// make sure the answer still matters
				if(!isVoteValid() || answer === 'cancel'){
					reject();
				}
				else if(answer === 'yes')
					{ resolve(true); }
				else if(answer === 'no')
					{ resolve(false); }
				else if(answer === 'player')
					{ resolve(evt.data); }
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
		SH.addEventListener('update_turnOrder', this.updateTurnOrder.bind(this));
	}

	if ( superclass ) PlayerInfo.__proto__ = superclass;
	PlayerInfo.prototype = Object.create( superclass && superclass.prototype );
	PlayerInfo.prototype.constructor = PlayerInfo;

	PlayerInfo.prototype.updateTurnOrder = function updateTurnOrder (ref)
	{
		var ref_data = ref.data;
		var game = ref_data.game;
		var players = ref_data.players;

		var localPlayer = players[SH.localUser.id];

		if(localPlayer){
			var playerPos = this.worldToLocal(SH.seats[localPlayer.seatNum].getWorldPosition());
			this.lookAt(playerPos);
		}
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
		}
	};

	PlayerInfo.prototype.presentVote = function presentVote (game, _, votes)
	{
		var vote = votes[game.lastElection];

		var playerVote = vote.yesVoters.includes(this.seat.owner);
		this.card = playerVote ? new JaCard() : new NeinCard();
		this.add(this.card);
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
		SH.addEventListener('update_state', lateUpdate(this.updateState.bind(this)));
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

	Seat.prototype.updateState = function updateState (ref)
	{
		var ref_data = ref.data;
		var ref_data_game = ref_data.game;
		var state = ref_data_game.state;
		var president = ref_data_game.president;
		var players = ref_data.players;

		var self = this;

		function chooseChancellor(){
			return self.ballot.askQuestion('Choose your\nchancellor!', 'local_nominate', 0)
			.then(confirmChancellor);
		}

		function confirmChancellor(userId){
			var username = SH.players[userId].displayName;
			var text = "Name " + username + "\nas chancellor?";
			return self.ballot.askQuestion(text, 'local_nominate_confirm', 2)
			.then(function (confirmed) {
				if(confirmed){
					return Promise.resolve(userId);
				}
				else {
					return chooseChancellor();
				}
			});
		}

		if(state === 'nominate' && SH.localUser.id === president && this.owner === SH.localUser.id)
		{
			chooseChancellor().then(function (userId) {
				SH.socket.emit('nominate', userId);
			});
		}
	};

	return Seat;
}(THREE.Object3D));

var placeholderGeo = new THREE.BoxBufferGeometry(.001, .001, .001);
var placeholderMat = new THREE.MeshBasicMaterial({color: 0xffffff});

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

		this.text = new THREE.Mesh(placeholderGeo, placeholderMat);
		this.text.position.set(0, .2, 0);
		this.text.material.visible = false;
		this.text.userData.altspace = {collider: {enabled: false}};

		altspace.addNativeComponent(this.text, 'n-billboard');

		// must send all properties every update, or they'll zero out
		this.textData = {fontSize: 1, width: 1, height: 1, horizontalAlign: 'middle', verticalAlign: 'middle'};
		altspace.addNativeComponent(this.text, 'n-text');
		altspace.updateNativeComponent(this.text, 'n-text', this.textData);

		this.add(this.text);

		this.position.set(0, 0.3, 0);
		parent.add(this);

		SH.addEventListener('update_state', this.onstatechange.bind(this));
		this.addEventListener('cursorup', this.onclick.bind(this));
	}

	if ( superclass ) ContinueBox.__proto__ = superclass;
	ContinueBox.prototype = Object.create( superclass && superclass.prototype );
	ContinueBox.prototype.constructor = ContinueBox;

	ContinueBox.prototype.onclick = function onclick (evt)
	{
		if(SH.turnOrder.includes(SH.localUser.id))
			{ SH.socket.emit('continue'); }
	};

	ContinueBox.prototype.onstatechange = function onstatechange (ref)
	{
		var game = ref.data.game;

		if(game.state === 'lameDuck'){
			this.icon.visible = true;
			this.text.visible = true;
			this.textData.text = 'Click to continue';
			altspace.updateNativeComponent(this.text, 'n-text', this.textData);
		}
		else if(game.state === 'setup' && game.turnOrder.length >= 5){
			this.icon.visible = true;
			this.text.visible = true;
			this.textData.text = 'Click to start';
			altspace.updateNativeComponent(this.text, 'n-text', this.textData);
		}
		else {
			this.icon.visible = false;
			this.text.visible = false;
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
		altspace.getUser().then((function (user) {
			this$1.localUser = {
				id: user.userId,
				displayName: user.displayName,
				isModerator: user.isModerator
			};
		}).bind(this));

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

		if(players[this.localUser.id] && !players[this.localUser.id].connected){
			this.socket.emit('checkIn', this.localUser);
		}

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvcG9seWZpbGwuanMiLCIuLi8uLi9zcmMvY2xpZW50L2Fzc2V0bWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RhYmxlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC91dGlscy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3QuanMiLCIuLi8uLi9zcmMvY2xpZW50L3BsYXllcmluZm8uanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcHN1bGVnZW9tZXRyeS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvaGl0Ym94LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWF0LmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jb250aW51ZWJveC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvc2VjcmV0aGl0bGVyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxuXHJcbmlmKCFBcnJheS5wcm90b3R5cGUuaW5jbHVkZXMpe1xyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsICdpbmNsdWRlcycsIHtcclxuXHRcdHZhbHVlOiBmdW5jdGlvbihpdGVtKXtcclxuXHRcdFx0cmV0dXJuIHRoaXMuaW5kZXhPZihpdGVtKSA+IC0xO1xyXG5cdFx0fSxcclxuXHRcdHdyaXRhYmxlOiBmYWxzZSxcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZVxyXG5cdH0pO1xyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuXHRtYW5pZmVzdDoge1xyXG5cdFx0bW9kZWxzOiB7XHJcblx0XHRcdHRhYmxlOiAnc3RhdGljL21vZGVsL3RhYmxlLmdsdGYnLFxyXG5cdFx0XHRuYW1lcGxhdGU6ICdzdGF0aWMvbW9kZWwvbmFtZXBsYXRlLmRhZScsXHJcblx0XHRcdHRvcGhhdDogJ3N0YXRpYy9tb2RlbC90b3BoYXQuZ2x0ZicsXHJcblx0XHRcdHZpc29yY2FwOiAnc3RhdGljL21vZGVsL3Zpc29yX2NhcC5nbHRmJyxcclxuXHRcdFx0Ly9kdW1teTogJ3N0YXRpYy9tb2RlbC9kdW1teS5nbHRmJyxcclxuXHRcdFx0Ly9wbGF5ZXJtZXRlcjogJ3N0YXRpYy9tb2RlbC9wbGF5ZXJtZXRlci5nbHRmJ1xyXG5cdFx0fSxcclxuXHRcdHRleHR1cmVzOiB7XHJcblx0XHRcdGJvYXJkX2xhcmdlOiAnc3RhdGljL2ltZy9ib2FyZC1sYXJnZS5wbmcnLFxyXG5cdFx0XHRib2FyZF9tZWQ6ICdzdGF0aWMvaW1nL2JvYXJkLW1lZGl1bS5wbmcnLFxyXG5cdFx0XHRib2FyZF9zbWFsbDogJ3N0YXRpYy9pbWcvYm9hcmQtc21hbGwucG5nJyxcclxuXHRcdFx0Y2FyZHM6ICdzdGF0aWMvaW1nL2NhcmRzLnBuZycsXHJcblx0XHRcdHJlc2V0OiAnc3RhdGljL2ltZy9ib21iLnBuZycsXHJcblx0XHRcdHRleHQ6ICdzdGF0aWMvaW1nL3RleHQucG5nJ1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0Y2FjaGU6IHt9LFxyXG5cdGZpeE1hdGVyaWFsczogZnVuY3Rpb24oKVxyXG5cdHtcclxuXHRcdE9iamVjdC5rZXlzKHRoaXMuY2FjaGUubW9kZWxzKS5mb3JFYWNoKGlkID0+IHtcclxuXHRcdFx0dGhpcy5jYWNoZS5tb2RlbHNbaWRdLnRyYXZlcnNlKG9iaiA9PiB7XHJcblx0XHRcdFx0aWYob2JqLm1hdGVyaWFsIGluc3RhbmNlb2YgVEhSRUUuTWVzaFN0YW5kYXJkTWF0ZXJpYWwpe1xyXG5cdFx0XHRcdFx0bGV0IG5ld01hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCgpO1xyXG5cdFx0XHRcdFx0bmV3TWF0Lm1hcCA9IG9iai5tYXRlcmlhbC5tYXA7XHJcblx0XHRcdFx0XHRvYmoubWF0ZXJpYWwgPSBuZXdNYXQ7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuY2xhc3MgQmVoYXZpb3Jcclxue1xyXG5cdGNvbnN0cnVjdG9yKHR5cGUpe1xyXG5cdFx0dGhpcy50eXBlID0gdHlwZTtcclxuXHR9XHJcblxyXG5cdGF3YWtlKG9iail7XHJcblx0XHR0aGlzLm9iamVjdDNEID0gb2JqO1xyXG5cdH1cclxuXHJcblx0c3RhcnQoKXsgfVxyXG5cclxuXHR1cGRhdGUoZFQpeyB9XHJcblxyXG5cdGRpc3Bvc2UoKXsgfVxyXG59XHJcblxyXG5jbGFzcyBCU3luYyBleHRlbmRzIEJlaGF2aW9yXHJcbntcclxuXHRjb25zdHJ1Y3RvcihldmVudE5hbWUpXHJcblx0e1xyXG5cdFx0c3VwZXIoJ0JTeW5jJyk7XHJcblx0XHR0aGlzLl9zID0gU0guc29ja2V0O1xyXG5cclxuXHRcdC8vIGxpc3RlbiBmb3IgdXBkYXRlIGV2ZW50c1xyXG5cdFx0dGhpcy5ob29rID0gdGhpcy5fcy5vbihldmVudE5hbWUsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcclxuXHRcdHRoaXMuZXZlbnROYW1lID0gZXZlbnROYW1lO1xyXG5cdFx0dGhpcy5vd25lciA9IDA7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVGcm9tU2VydmVyKGRhdGEpXHJcblx0e1xyXG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XHJcblx0XHR0aGlzLm9iamVjdDNELnJvdGF0aW9uLmZyb21BcnJheShkYXRhLCAzKTtcclxuXHR9XHJcblxyXG5cdHRha2VPd25lcnNoaXAoKVxyXG5cdHtcclxuXHRcdGlmKFNILmxvY2FsVXNlciAmJiBTSC5sb2NhbFVzZXIudXNlcklkKVxyXG5cdFx0XHR0aGlzLm93bmVyID0gU0gubG9jYWxVc2VyLnVzZXJJZDtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZShkVClcclxuXHR7XHJcblx0XHRpZihTSC5sb2NhbFVzZXIgJiYgU0gubG9jYWxVc2VyLnNrZWxldG9uICYmIFNILmxvY2FsVXNlci5pZCA9PT0gdGhpcy5vd25lcilcclxuXHRcdHtcclxuXHRcdFx0bGV0IGogPSBTSC5sb2NhbFVzZXIuc2tlbGV0b24uZ2V0Sm9pbnQoJ0hlYWQnKTtcclxuXHRcdFx0dGhpcy5fcy5lbWl0KHRoaXMuZXZlbnROYW1lLCBbLi4uai5wb3NpdGlvbi50b0FycmF5KCksIC4uLmoucm90YXRpb24udG9BcnJheSgpXSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxufVxyXG5cclxuZXhwb3J0IHsgQmVoYXZpb3IsIEJTeW5jIH07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCB7IEJlaGF2aW9yIH0gZnJvbSAnLi9iZWhhdmlvcic7XHJcblxyXG5jbGFzcyBBbmltYXRlIGV4dGVuZHMgQmVoYXZpb3Jcclxue1xyXG5cdGNvbnN0cnVjdG9yKC8ve3BhcmVudCwgcG9zLCBxdWF0LCBzY2FsZSwgbWF0cml4LCBkdXJhdGlvbiwgY2FsbGJhY2t9XHJcblx0XHR7cGFyZW50PW51bGwsIHBvcz1udWxsLCBxdWF0PW51bGwsIHNjYWxlPW51bGwsIG1hdHJpeD1udWxsLCBkdXJhdGlvbj02MDAsIGNhbGxiYWNrPSgpPT57fX0pXHJcblx0e1xyXG5cdFx0c3VwZXIoJ0FuaW1hdGUnKTtcclxuXHRcdFxyXG5cdFx0aWYobWF0cml4KVxyXG5cdFx0e1xyXG5cdFx0XHQvLyBleHRyYWN0IHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlIGZyb20gbWF0cml4XHJcblx0XHRcdHBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XHJcblx0XHRcdHF1YXQgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xyXG5cdFx0XHRzY2FsZSA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XHJcblx0XHRcdG1hdHJpeC5kZWNvbXBvc2UocG9zLCBxdWF0LCBzY2FsZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCB7cGFyZW50LCBwb3MsIHF1YXQsIHNjYWxlLCBkdXJhdGlvbiwgY2FsbGJhY2t9KTtcclxuXHR9XHJcblxyXG5cdGF3YWtlKG9iailcclxuXHR7XHJcblx0XHRzdXBlci5hd2FrZShvYmopO1xyXG5cclxuXHRcdC8vIHNodWZmbGUgaGllcmFyY2h5LCBidXQga2VlcCB3b3JsZCB0cmFuc2Zvcm0gdGhlIHNhbWVcclxuXHRcdGlmKHRoaXMucGFyZW50ICYmIHRoaXMucGFyZW50ICE9PSBvYmoucGFyZW50KVxyXG5cdFx0e1xyXG5cdFx0XHRvYmouYXBwbHlNYXRyaXgob2JqLnBhcmVudC5tYXRyaXhXb3JsZCk7XHJcblx0XHRcdGxldCBtYXQgPSBuZXcgVEhSRUUuTWF0cml4NCgpLmdldEludmVyc2UodGhpcy5wYXJlbnQubWF0cml4V29ybGQpO1xyXG5cdFx0XHRvYmouYXBwbHlNYXRyaXgobWF0KTtcclxuXHJcblx0XHRcdHRoaXMucGFyZW50LmFkZChvYmopO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHJlYWQgaW5pdGlhbCBwb3NpdGlvbnNcclxuXHRcdHRoaXMuaW5pdGlhbFBvcyA9IG9iai5wb3NpdGlvbi5jbG9uZSgpO1xyXG5cdFx0dGhpcy5pbml0aWFsUXVhdCA9IG9iai5xdWF0ZXJuaW9uLmNsb25lKCk7XHJcblx0XHR0aGlzLmluaXRpYWxTY2FsZSA9IG9iai5zY2FsZS5jbG9uZSgpO1xyXG5cdFx0dGhpcy5zdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlKClcclxuXHR7XHJcblx0XHQvLyBjb21wdXRlIGVhc2Utb3V0IGJhc2VkIG9uIGR1cmF0aW9uXHJcblx0XHRsZXQgbWl4ID0gKERhdGUubm93KCktdGhpcy5zdGFydFRpbWUpIC8gdGhpcy5kdXJhdGlvbjtcclxuXHRcdGxldCBlYXNlID0gVFdFRU4gPyBUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dCA6IG4gPT4gbiooMi1uKTtcclxuXHRcdG1peCA9IG1peCA8IDEgPyBlYXNlKG1peCkgOiAxO1xyXG5cclxuXHRcdC8vIGFuaW1hdGUgcG9zaXRpb24gaWYgcmVxdWVzdGVkXHJcblx0XHRpZiggdGhpcy5wb3MgKXtcclxuXHRcdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5sZXJwVmVjdG9ycyh0aGlzLmluaXRpYWxQb3MsIHRoaXMucG9zLCBtaXgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGFuaW1hdGUgcm90YXRpb24gaWYgcmVxdWVzdGVkXHJcblx0XHRpZiggdGhpcy5xdWF0ICl7XHJcblx0XHRcdFRIUkVFLlF1YXRlcm5pb24uc2xlcnAodGhpcy5pbml0aWFsUXVhdCwgdGhpcy5xdWF0LCB0aGlzLm9iamVjdDNELnF1YXRlcm5pb24sIG1peClcclxuXHRcdH1cclxuXHJcblx0XHQvLyBhbmltYXRlIHNjYWxlIGlmIHJlcXVlc3RlZFxyXG5cdFx0aWYoIHRoaXMuc2NhbGUgKXtcclxuXHRcdFx0dGhpcy5vYmplY3QzRC5zY2FsZS5sZXJwVmVjdG9ycyh0aGlzLmluaXRpYWxTY2FsZSwgdGhpcy5zY2FsZSwgbWl4KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyB0ZXJtaW5hdGUgYW5pbWF0aW9uIHdoZW4gZG9uZVxyXG5cdFx0aWYobWl4ID49IDEpe1xyXG5cdFx0XHR0aGlzLm9iamVjdDNELnJlbW92ZUJlaGF2aW9yKHRoaXMpO1xyXG5cdFx0XHR0aGlzLmNhbGxiYWNrLmNhbGwodGhpcy5vYmplY3QzRCk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5BbmltYXRlLnN0YXJ0ID0gKHRhcmdldCwgb3B0cykgPT5cclxue1xyXG5cdGxldCBvbGRBbmltID0gdGFyZ2V0LmdldEJlaGF2aW9yQnlUeXBlKCdBbmltYXRlJyk7XHJcblx0aWYob2xkQW5pbSl7XHJcblx0XHRvbGRBbmltLmNvbnN0cnVjdG9yKG9wdHMpO1xyXG5cdFx0b2xkQW5pbS5hd2FrZSh0YXJnZXQpO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdHRhcmdldC5hZGRCZWhhdmlvciggbmV3IEFuaW1hdGUob3B0cykgKTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IEFuaW1hdGU7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuXHJcbi8vIGVudW0gY29uc3RhbnRzXHJcbmxldCBUeXBlcyA9IE9iamVjdC5mcmVlemUoe1xyXG5cdFBPTElDWV9MSUJFUkFMOiAwLFxyXG5cdFBPTElDWV9GQVNDSVNUOiAxLFxyXG5cdFJPTEVfTElCRVJBTDogMixcclxuXHRST0xFX0ZBU0NJU1Q6IDMsXHJcblx0Uk9MRV9ISVRMRVI6IDQsXHJcblx0UEFSVFlfTElCRVJBTDogNSxcclxuXHRQQVJUWV9GQVNDSVNUOiA2LFxyXG5cdEpBOiA3LFxyXG5cdE5FSU46IDgsXHJcblx0QkxBTks6IDksXHJcblx0Q1JFRElUUzogMTBcclxufSk7XHJcblxyXG5mdW5jdGlvbiBkaW1zVG9VVih7c2lkZSwgbGVmdCwgcmlnaHQsIHRvcCwgYm90dG9tfSlcclxue1xyXG5cdGlmKHNpZGUpXHJcblx0XHRyZXR1cm4gW1tcclxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIodG9wLCBsZWZ0KSxcclxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIoYm90dG9tLCBsZWZ0KSxcclxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIodG9wLCByaWdodClcclxuXHRcdF0sW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIGxlZnQpLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIHJpZ2h0KSxcclxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIodG9wLCByaWdodClcclxuXHRcdF1dO1xyXG5cdGVsc2VcclxuXHRcdHJldHVybiBbW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihsZWZ0LCB0b3ApLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihsZWZ0LCBib3R0b20pLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihyaWdodCwgdG9wKVxyXG5cdFx0XSxbXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIGJvdHRvbSksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCBib3R0b20pLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihyaWdodCwgdG9wKVxyXG5cdFx0XV07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFVWcyh0eXBlKVxyXG57XHJcblx0bGV0IGRpbXMgPSB7bGVmdDogMCwgcmlnaHQ6IDEsIGJvdHRvbTogMCwgdG9wOiAxfTtcclxuXHJcblx0c3dpdGNoKHR5cGUpXHJcblx0e1xyXG5cdGNhc2UgVHlwZXMuUE9MSUNZX0xJQkVSQUw6XHJcblx0XHRkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuODM0LCByaWdodDogMC45OTYsIHRvcDogMC43NTQsIGJvdHRvbTogMC45OTd9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5QT0xJQ1lfRkFTQ0lTVDpcclxuXHRcdGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC42NiwgcmlnaHQ6IDAuODIyLCB0b3A6IDAuNzU0LCBib3R0b206IDAuOTk2fTtcclxuXHRcdGJyZWFrO1xyXG5cdGNhc2UgVHlwZXMuUk9MRV9MSUJFUkFMOlxyXG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjUwNSwgcmlnaHQ6IDAuNzQ2LCB0b3A6IDAuOTk2LCBib3R0b206IDAuNjV9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5ST0xFX0ZBU0NJU1Q6XHJcblx0XHRkaW1zID0ge2xlZnQ6IDAuNTA1LCByaWdodDogMC43NDYsIHRvcDogMC42NDUsIGJvdHRvbTogMC4zfTtcclxuXHRcdGJyZWFrO1xyXG5cdGNhc2UgVHlwZXMuUk9MRV9ISVRMRVI6XHJcblx0XHRkaW1zID0ge2xlZnQ6IDAuNzU0LCByaWdodDogMC45OTYsIHRvcDogMC42NDUsIGJvdHRvbTogMC4zfTtcclxuXHRcdGJyZWFrO1xyXG5cdGNhc2UgVHlwZXMuUEFSVFlfTElCRVJBTDpcclxuXHRcdGRpbXMgPSB7bGVmdDogMC4yNTUsIHJpZ2h0OiAwLjQ5NSwgdG9wOiAwLjk5NiwgYm90dG9tOiAwLjY1fTtcclxuXHRcdGJyZWFrO1xyXG5cdGNhc2UgVHlwZXMuUEFSVFlfRkFTQ0lTVDpcclxuXHRcdGRpbXMgPSB7bGVmdDogMC4yNTUsIHJpZ2h0OiAwLjQ5NSwgdG9wOiAwLjY0NSwgYm90dG9tOiAwLjN9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5KQTpcclxuXHRcdGRpbXMgPSB7bGVmdDogMC4wMDUsIHJpZ2h0OiAwLjI0NCwgdG9wOiAwLjk5MiwgYm90dG9tOiAwLjY1M307XHJcblx0XHRicmVhaztcclxuXHRjYXNlIFR5cGVzLk5FSU46XHJcblx0XHRkaW1zID0ge2xlZnQ6IDAuMDA2LCByaWdodDogMC4yNDMsIHRvcDogMC42NDIsIGJvdHRvbTogMC4zMDJ9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5DUkVESVRTOlxyXG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjAxNSwgcmlnaHQ6IDAuMjc2LCB0b3A6IDAuMzk3LCBib3R0b206IDAuNzY1fTtcclxuXHRcdGJyZWFrO1xyXG5cdGNhc2UgVHlwZXMuQkxBTks6XHJcblx0ZGVmYXVsdDpcclxuXHRcdGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC4wMjIsIHJpZ2h0OiAuMDIyKzAuMjQ3LCB0b3A6IDAuMDIxLCBib3R0b206IC4wMjErMC4zNTQzfTtcclxuXHRcdGJyZWFrO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIGRpbXNUb1VWKGRpbXMpO1xyXG59XHJcblxyXG5cclxuY2xhc3MgQ2FyZCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3Rvcih0eXBlID0gVHlwZXMuQkxBTkssIGRvdWJsZVNpZGVkID0gdHJ1ZSlcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSB0aGUgY2FyZCBmYWNlc1xyXG5cdFx0bGV0IGZyb250R2VvID0gbmV3IFRIUkVFLlBsYW5lR2VvbWV0cnkoLjcxNSwgMSk7XHJcblx0XHRsZXQgYmFja0dlbyA9IGZyb250R2VvLmNsb25lKCk7XHJcblx0XHRsZXQgY2FyZE1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KTtcclxuXHRcdGxldCBmcm9udCA9IG5ldyBUSFJFRS5NZXNoKGZyb250R2VvLCBjYXJkTWF0KTtcclxuXHRcdGxldCBiYWNrID0gbmV3IFRIUkVFLk1lc2goYmFja0dlbywgY2FyZE1hdCk7XHJcblx0XHRiYWNrLnBvc2l0aW9uLnNldCgwLjAwMSwgMCwgMCk7XHJcblx0XHRmcm9udC5wb3NpdGlvbi5zZXQoLTAuMDAxLCAwLCAwKTtcclxuXHRcdGJhY2sucm90YXRlWShNYXRoLlBJKTtcclxuXHJcblx0XHQvLyBzZXQgdGhlIGZhY2VzIHRvIHRoZSBjb3JyZWN0IHBhcnQgb2YgdGhlIHRleHR1cmVcclxuXHRcdGZyb250Lmdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnMgPSBbZ2V0VVZzKHR5cGUpXTtcclxuXHRcdGJhY2suZ2VvbWV0cnkuZmFjZVZlcnRleFV2cyA9IFtnZXRVVnMoIGRvdWJsZVNpZGVkID8gdHlwZSA6IFR5cGVzLkJMQU5LICldO1xyXG5cdFx0dGhpcy5zY2FsZS5zZXRTY2FsYXIoMC43KTtcclxuXHRcdHRoaXMuYWRkKGZyb250LCBiYWNrKTtcclxuXHR9XHJcblxyXG5cdGhpZGUoKXtcclxuXHRcdHRoaXMuY2hpbGRyZW4uZm9yRWFjaChvID0+IHsgby52aXNpYmxlID0gZmFsc2U7IH0pO1xyXG5cdH1cclxuXHJcblx0c2hvdygpe1xyXG5cdFx0dGhpcy5jaGlsZHJlbi5mb3JFYWNoKG8gPT4geyBvLnZpc2libGUgPSB0cnVlOyB9KTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIEJsYW5rQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7IHN1cGVyKCk7IH1cclxufVxyXG5cclxuY2xhc3MgQ3JlZGl0c0NhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuQ1JFRElUUyk7XHJcblx0XHRsZXQgc2VsZiA9IHRoaXM7XHJcblxyXG5cdFx0ZnVuY3Rpb24gc2V0VmlzaWJpbGl0eSh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSl7XHJcblx0XHRcdGlmKHN0YXRlID09PSAnc2V0dXAnKVxyXG5cdFx0XHRcdHNlbGYuY2hpbGRyZW4uZm9yRWFjaChvID0+IHsgby52aXNpYmxlID0gdHJ1ZTsgfSk7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRzZWxmLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IGZhbHNlOyB9KTtcclxuXHRcdH1cclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBzZXRWaXNpYmlsaXR5KTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIExpYmVyYWxQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlBPTElDWV9MSUJFUkFMLCBmYWxzZSk7XHJcblx0fVxyXG5cdGdvVG9Qb3NpdGlvbihzcG90ID0gMClcclxuXHR7XHJcblx0XHRzcG90ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oNCwgc3BvdCkpO1xyXG5cdFx0bGV0IHMgPSBMaWJlcmFsUG9saWN5Q2FyZC5zcG90cztcclxuXHRcdEFuaW1hdGUuc3RhcnQodGhpcywge3BhcmVudDogQXNzZXRNYW5hZ2VyLnJvb3QsIHBvczogc1sncG9zXycrc3BvdF0sIHF1YXQ6IHMucXVhdCwgc2NhbGU6IHMuc2NhbGV9KTtcclxuXHR9XHJcbn1cclxuXHJcbkxpYmVyYWxQb2xpY3lDYXJkLnNwb3RzID0ge1xyXG5cdHBvc18wOiBuZXcgVEhSRUUuVmVjdG9yMygwLjUzMywgMC43NiwgLTAuMzM2KSxcclxuXHRwb3NfMTogbmV3IFRIUkVFLlZlY3RvcjMoMC4yNjMsIDAuNzYsIC0wLjMzNiksXHJcblx0cG9zXzI6IG5ldyBUSFJFRS5WZWN0b3IzKC0uMDA3LCAwLjc2LCAtMC4zMzYpLFxyXG5cdHBvc18zOiBuZXcgVEhSRUUuVmVjdG9yMygtLjI3OSwgMC43NiwgLTAuMzM2KSxcclxuXHRwb3NfNDogbmV3IFRIUkVFLlZlY3RvcjMoLS41NTIsIDAuNzYsIC0wLjMzNiksXHJcblx0cXVhdDogbmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMC43MDcxMDY3ODExODY1NDc1LCAwLjcwNzEwNjc4MTE4NjU0NzUsIDApLFxyXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjcsIDAuNywgMC43KVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0UG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfRkFTQ0lTVCwgZmFsc2UpO1xyXG5cdH1cclxuXHRnb1RvUG9zaXRpb24oc3BvdCA9IDApXHJcblx0e1xyXG5cdFx0c3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDUsIHNwb3QpKTtcclxuXHRcdGxldCBzID0gRmFzY2lzdFBvbGljeUNhcmQuc3BvdHM7XHJcblx0XHRBbmltYXRlLnN0YXJ0KHRoaXMsIHtwYXJlbnQ6IEFzc2V0TWFuYWdlci5yb290LCBwb3M6IHNbJ3Bvc18nK3Nwb3RdLCBxdWF0OiBzLnF1YXQsIHNjYWxlOiBzLnNjYWxlfSk7XHJcblx0fVxyXG59XHJcblxyXG5GYXNjaXN0UG9saWN5Q2FyZC5zcG90cyA9IHtcclxuXHRwb3NfMDogbmV3IFRIUkVFLlZlY3RvcjMoLS42ODcsIDAuNzYsIDAuMzQxKSxcclxuXHRwb3NfMTogbmV3IFRIUkVFLlZlY3RvcjMoLS40MTcsIDAuNzYsIDAuMzQxKSxcclxuXHRwb3NfMjogbmV3IFRIUkVFLlZlY3RvcjMoLS4xNDYsIDAuNzYsIDAuMzQxKSxcclxuXHRwb3NfMzogbmV3IFRIUkVFLlZlY3RvcjMoMC4xMjcsIDAuNzYsIDAuMzQxKSxcclxuXHRwb3NfNDogbmV3IFRIUkVFLlZlY3RvcjMoMC40MDAsIDAuNzYsIDAuMzQxKSxcclxuXHRwb3NfNTogbmV3IFRIUkVFLlZlY3RvcjMoMC42NzMsIDAuNzYsIDAuMzQxKSxcclxuXHRxdWF0OiBuZXcgVEhSRUUuUXVhdGVybmlvbigtMC43MDcxMDY3ODExODY1NDc1LCAwLCAwLCAwLjcwNzEwNjc4MTE4NjU0NzUpLFxyXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjcsIDAuNywgMC43KVxyXG59XHJcblxyXG5jbGFzcyBMaWJlcmFsUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9MSUJFUkFMLCBmYWxzZSk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0Um9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9GQVNDSVNULCBmYWxzZSk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBIaXRsZXJSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5ST0xFX0hJVExFUiwgZmFsc2UpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgTGliZXJhbFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9MSUJFUkFMLCBmYWxzZSk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0UGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0ZBU0NJU1QsIGZhbHNlKTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIEphQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5KQSwgZmFsc2UpO1xyXG5cdFx0dGhpcy5jaGlsZHJlblswXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xyXG5cdFx0dGhpcy5jaGlsZHJlblsxXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgTmVpbkNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuTkVJTiwgZmFsc2UpO1xyXG5cdFx0dGhpcy5jaGlsZHJlblswXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xyXG5cdFx0dGhpcy5jaGlsZHJlblsxXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xyXG5cdH1cclxufVxyXG5cclxuXHJcbmV4cG9ydCB7XHJcblx0Q2FyZCwgVHlwZXMsIEJsYW5rQ2FyZCwgQ3JlZGl0c0NhcmQsXHJcblx0TGliZXJhbFBvbGljeUNhcmQsIEZhc2Npc3RQb2xpY3lDYXJkLCBMaWJlcmFsUm9sZUNhcmQsIEZhc2Npc3RSb2xlQ2FyZCxcclxuXHRIaXRsZXJSb2xlQ2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZFxyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuY2xhc3MgSGF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKG1vZGVsKVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmN1cnJlbnRJZCA9ICcnO1xyXG5cclxuXHRcdGlmKG1vZGVsLnBhcmVudClcclxuXHRcdFx0bW9kZWwucGFyZW50LnJlbW92ZShtb2RlbCk7XHJcblx0XHRtb2RlbC51cGRhdGVNYXRyaXhXb3JsZCh0cnVlKTtcclxuXHJcblx0XHQvLyBncmFiIG1lc2hlc1xyXG5cdFx0bGV0IHByb3AgPSAnJztcclxuXHRcdG1vZGVsLnRyYXZlcnNlKG9iaiA9PiB7XHJcblx0XHRcdGlmKG9iai5uYW1lID09PSAnaGF0JyB8fCBvYmoubmFtZSA9PT0gJ3RleHQnKVxyXG5cdFx0XHRcdHByb3AgPSBvYmoubmFtZTtcclxuXHRcdFx0ZWxzZSBpZihvYmogaW5zdGFuY2VvZiBUSFJFRS5NZXNoKVxyXG5cdFx0XHRcdHRoaXNbcHJvcF0gPSBvYmo7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBzdHJpcCBvdXQgbWlkZGxlIG5vZGVzXHJcblx0XHR0aGlzLmhhdC5tYXRyaXguY29weSh0aGlzLmhhdC5tYXRyaXhXb3JsZCk7XHJcblx0XHR0aGlzLmhhdC5tYXRyaXguZGVjb21wb3NlKHRoaXMuaGF0LnBvc2l0aW9uLCB0aGlzLmhhdC5xdWF0ZXJuaW9uLCB0aGlzLmhhdC5zY2FsZSk7XHJcblx0XHR0aGlzLmFkZCh0aGlzLmhhdCk7XHJcblxyXG5cdFx0dGhpcy50ZXh0Lm1hdHJpeC5jb3B5KHRoaXMudGV4dC5tYXRyaXhXb3JsZCk7XHJcblx0XHR0aGlzLnRleHQubWF0cml4LmRlY29tcG9zZSh0aGlzLnRleHQucG9zaXRpb24sIHRoaXMudGV4dC5xdWF0ZXJuaW9uLCB0aGlzLnRleHQuc2NhbGUpO1xyXG5cdFx0dGhpcy5hZGQodGhpcy50ZXh0KTtcclxuXHJcblx0XHRkLnNjZW5lLmFkZCh0aGlzKTtcclxuXHR9XHJcblxyXG5cdHNldE93bmVyKHVzZXJJZClcclxuXHR7XHJcblx0XHRpZighdGhpcy5jdXJyZW50SWQgJiYgdXNlcklkKXtcclxuXHRcdFx0ZC5zY2VuZS5hZGQodGhpcyk7XHJcblx0XHRcdGFsdHNwYWNlLmFkZE5hdGl2ZUNvbXBvbmVudCh0aGlzLmhhdCwgJ24tc2tlbGV0b24tcGFyZW50Jyk7XHJcblx0XHRcdGFsdHNwYWNlLmFkZE5hdGl2ZUNvbXBvbmVudCh0aGlzLnRleHQsICduLXNrZWxldG9uLXBhcmVudCcpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih0aGlzLmN1cnJlbnRJZCAmJiAhdXNlcklkKXtcclxuXHRcdFx0YWx0c3BhY2UucmVtb3ZlTmF0aXZlQ29tcG9uZW50KHRoaXMuaGF0LCAnbi1za2VsZXRvbi1wYXJlbnQnKTtcclxuXHRcdFx0YWx0c3BhY2UucmVtb3ZlTmF0aXZlQ29tcG9uZW50KHRoaXMudGV4dCwgJ24tc2tlbGV0b24tcGFyZW50Jyk7XHJcblx0XHRcdGQuc2NlbmUucmVtb3ZlKHRoaXMpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHVzZXJJZCl7XHJcblx0XHRcdGxldCBzZXR0aW5ncyA9IHtpbmRleDogMCwgcGFydDogJ2hlYWQnLCBzaWRlOiAnY2VudGVyJywgdXNlcklkOiB1c2VySWR9O1xyXG5cdFx0XHRhbHRzcGFjZS51cGRhdGVOYXRpdmVDb21wb25lbnQodGhpcy5oYXQsICduLXNrZWxldG9uLXBhcmVudCcsIHNldHRpbmdzKTtcclxuXHRcdFx0YWx0c3BhY2UudXBkYXRlTmF0aXZlQ29tcG9uZW50KHRoaXMudGV4dCwgJ24tc2tlbGV0b24tcGFyZW50Jywgc2V0dGluZ3MpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuY3VycmVudElkID0gdXNlcklkO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgUHJlc2lkZW50SGF0IGV4dGVuZHMgSGF0XHJcbntcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLnRvcGhhdCk7XHJcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjE0NC9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIsIC4wMzgvU0guZW52LnBpeGVsc1Blck1ldGVyKTtcclxuXHRcdHRoaXMuc2NhbGUubXVsdGlwbHlTY2FsYXIoMS4yL1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHRcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9sYXN0UHJlc2lkZW50JywgZSA9PiB7XHJcblx0XHRcdHRoaXMuc2V0T3duZXIoZS5kYXRhLmdhbWUubGFzdFByZXNpZGVudCk7XHJcblx0XHR9KTtcclxuXHR9XHJcbn07XHJcblxyXG5jbGFzcyBDaGFuY2VsbG9ySGF0IGV4dGVuZHMgSGF0XHJcbntcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoQU0uY2FjaGUubW9kZWxzLnZpc29yY2FwKTtcclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAuMDcvU0guZW52LnBpeGVsc1Blck1ldGVyLCAuMDM4L1NILmVudi5waXhlbHNQZXJNZXRlcik7XHJcblx0XHR0aGlzLnNjYWxlLm11bHRpcGx5U2NhbGFyKDEuMi9TSC5lbnYucGl4ZWxzUGVyTWV0ZXIpO1xyXG5cdFx0XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfbGFzdENoYW5jZWxsb3InLCBlID0+IHtcclxuXHRcdFx0dGhpcy5zZXRPd25lcihlLmRhdGEuZ2FtZS5sYXN0Q2hhbmNlbGxvcik7XHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9O1xyXG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtDYXJkLCBUeXBlcyBhcyBDYXJkVHlwZXN9IGZyb20gJy4vY2FyZCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVUYWJsZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyBzYXZlIHJlZmVyZW5jZXMgdG8gdGhlIHRleHR1cmVzXG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX3NtYWxsLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbWVkLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbGFyZ2Vcblx0XHRdO1xuXG5cdFx0Ly8gZGUtZmxpcCB0ZXh0dXJlc1xuXHRcdHRoaXMudGV4dHVyZXMuZm9yRWFjaCh0ZXggPT4gdGV4LmZsaXBZID0gZmFsc2UpO1xuXG5cdFx0Ly8gYWRkIHRhYmxlIGFzc2V0XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50YWJsZTtcblx0XHR0aGlzLm1vZGVsLnNjYWxlLnNldFNjYWxhcigxLjI1KTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblxuXHRcdC8vIHNldCB0aGUgZGVmYXVsdCBtYXRlcmlhbFxuXHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzBdLCB0cnVlKTtcblxuXHRcdC8vIHBvc2l0aW9uIHRhYmxlXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC44LCAwKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLmNoYW5nZU1vZGUuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRjaGFuZ2VNb2RlKHtkYXRhOiB7Z2FtZToge3N0YXRlLCB0dXJuT3JkZXJ9fX0pXG5cdHtcblx0XHRpZihzdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHRpZih0dXJuT3JkZXIubGVuZ3RoID49IDkpXG5cdFx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzJdKTtcblx0XHRcdGVsc2UgaWYodHVybk9yZGVyLmxlbmd0aCA+PSA3KVxuXHRcdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1sxXSk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzWzBdKTtcblx0XHR9XG5cdH1cblxuXHRzZXRUZXh0dXJlKG5ld1RleCwgc3dpdGNoTGlnaHRtYXApXG5cdHtcblx0XHR0aGlzLm1vZGVsLnRyYXZlcnNlKG8gPT4ge1xuXHRcdFx0aWYobyBpbnN0YW5jZW9mIFRIUkVFLk1lc2gpXG5cdFx0XHR7XG5cdFx0XHRcdGlmKHN3aXRjaExpZ2h0bWFwKVxuXHRcdFx0XHRcdG8ubWF0ZXJpYWwubGlnaHRNYXAgPSBvLm1hdGVyaWFsLm1hcDtcblxuXHRcdFx0XHRvLm1hdGVyaWFsLm1hcCA9IG5ld1RleDtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcblxyXG5mdW5jdGlvbiBnZXRHYW1lSWQoKVxyXG57XHJcblx0Ly8gZmlyc3QgY2hlY2sgdGhlIHVybFxyXG5cdGxldCByZSA9IC9bPyZdZ2FtZUlkPShbXiZdKykvLmV4ZWMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XHJcblx0aWYocmUpe1xyXG5cdFx0cmV0dXJuIHJlWzFdO1xyXG5cdH1cclxuXHRlbHNlIGlmKGFsdHNwYWNlICYmIGFsdHNwYWNlLmluQ2xpZW50KXtcclxuXHRcdHJldHVybiBTSC5lbnYuc2lkO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdGxldCBpZCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDAgKTtcclxuXHRcdHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKCc/Z2FtZUlkPScraWQpO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGFyc2VDU1Yoc3RyKXtcclxuXHRpZighc3RyKSByZXR1cm4gW107XHJcblx0ZWxzZSByZXR1cm4gc3RyLnNwbGl0KCcsJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUXVlc3Rpb24odGV4dCwgdGV4dHVyZSA9IG51bGwpXHJcbntcclxuXHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XHJcblxyXG5cdC8vIHNldCB1cCBjYW52YXNcclxuXHRsZXQgYm1wO1xyXG5cdGlmKCF0ZXh0dXJlKXtcclxuXHRcdGJtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xyXG5cdFx0Ym1wLndpZHRoID0gNTEyO1xyXG5cdFx0Ym1wLmhlaWdodCA9IDI1NjtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRibXAgPSB0ZXh0dXJlLmltYWdlO1xyXG5cdH1cclxuXHJcblx0bGV0IGcgPSBibXAuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHRnLmNsZWFyUmVjdCgwLCAwLCA1MTIsIDI1Nik7XHJcblx0Zy50ZXh0QWxpZ24gPSAnY2VudGVyJztcclxuXHRnLmZpbGxTdHlsZSA9ICd3aGl0ZSc7XHJcblxyXG5cdC8vIHdyaXRlIHRleHRcclxuXHRnLmZvbnQgPSAnYm9sZCA1MHB4ICcrZm9udFN0YWNrO1xyXG5cdGxldCBsaW5lcyA9IHRleHQuc3BsaXQoJ1xcbicpO1xyXG5cdGZvcihsZXQgaT0wOyBpPGxpbmVzLmxlbmd0aDsgaSsrKXtcclxuXHRcdGcuZmlsbFRleHQobGluZXNbaV0sIDI1NiwgNTArNTUqaSk7XHJcblx0fVxyXG5cclxuXHRpZih0ZXh0dXJlKXtcclxuXHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xyXG5cdFx0cmV0dXJuIHRleHR1cmU7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0cmV0dXJuIG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKGJtcCk7XHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiBtZXJnZU9iamVjdHMoYSwgYiwgZGVwdGg9Milcclxue1xyXG5cdGZ1bmN0aW9uIHVuaXF1ZShlLCBpLCBhKXtcclxuXHRcdHJldHVybiBhLmluZGV4T2YoZSkgPT09IGk7XHJcblx0fVxyXG5cclxuXHRsZXQgYUlzT2JqID0gYSBpbnN0YW5jZW9mIE9iamVjdCwgYklzT2JqID0gYiBpbnN0YW5jZW9mIE9iamVjdDtcclxuXHRpZihhSXNPYmogJiYgYklzT2JqICYmIGRlcHRoID4gMClcclxuXHR7XHJcblx0XHRsZXQgcmVzdWx0ID0ge307XHJcblx0XHRsZXQga2V5cyA9IFsuLi5PYmplY3Qua2V5cyhhKSwgLi4uT2JqZWN0LmtleXMoYildLmZpbHRlcih1bmlxdWUpO1xyXG5cdFx0Zm9yKGxldCBpPTA7IGk8a2V5cy5sZW5ndGg7IGkrKyl7XHJcblx0XHRcdHJlc3VsdFtrZXlzW2ldXSA9IG1lcmdlT2JqZWN0cyhhW2tleXNbaV1dLCBiW2tleXNbaV1dLCBkZXB0aC0xKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblx0fVxyXG5cdGVsc2UgaWYoYiAhPT0gdW5kZWZpbmVkKVxyXG5cdFx0cmV0dXJuIGI7XHJcblx0ZWxzZVxyXG5cdFx0cmV0dXJuIGE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxhdGVVcGRhdGUoZm4pXHJcbntcclxuXHRyZXR1cm4gKC4uLmFyZ3MpID0+IHtcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4gZm4oLi4uYXJncyksIDE1KTtcclxuXHR9O1xyXG59XHJcblxyXG5leHBvcnQgeyBnZXRHYW1lSWQsIHBhcnNlQ1NWLCBnZW5lcmF0ZVF1ZXN0aW9uLCBtZXJnZU9iamVjdHMsIGxhdGVVcGRhdGUgfTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTmFtZXBsYXRlIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIC0wLjYzNSwgMC4yMik7XG5cdFx0c2VhdC5hZGQodGhpcyk7XG5cblx0XHQvLyBhZGQgM2QgbW9kZWxcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLm5hbWVwbGF0ZS5jaGlsZHJlblswXS5jbG9uZSgpO1xuXHRcdHRoaXMubW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJLzIsIDAsIE1hdGguUEkvMik7XG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHQvLyBnZW5lcmF0ZSBtYXRlcmlhbFxuXHRcdHRoaXMuYm1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy5ibXAud2lkdGggPSBOYW1lcGxhdGUudGV4dHVyZVNpemU7XG5cdFx0dGhpcy5ibXAuaGVpZ2h0ID0gTmFtZXBsYXRlLnRleHR1cmVTaXplIC8gMjtcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcblx0XHRcdG1hcDogbmV3IFRIUkVFLkNhbnZhc1RleHR1cmUodGhpcy5ibXApXG5cdFx0fSk7XG5cblx0XHQvLyBjcmVhdGUgbGlzdGVuZXIgcHJveGllc1xuXHRcdHRoaXMuX2hvdmVyQmVoYXZpb3IgPSBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlckNvbG9yKHtcblx0XHRcdGNvbG9yOiBuZXcgVEhSRUUuQ29sb3IoMHhmZmE4YTgpXG5cdFx0fSk7XG5cdFx0dGhpcy5tb2RlbC5hZGRCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcblx0XHR0aGlzLm1vZGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5jbGljay5iaW5kKHRoaXMpKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkgPT4ge1xuXHRcdFx0aWYoc3RhdGUgPT09ICdzZXR1cCcpXG5cdFx0XHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRoaXMubW9kZWwucmVtb3ZlQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0fSk7XG5cdH1cblxuXHR1cGRhdGVUZXh0KHRleHQpXG5cdHtcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcblxuXHRcdC8vIHNldCB1cCBjYW52YXNcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdFx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xuXHRcdGcuZmlsbFN0eWxlID0gJyMyMjInO1xuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XG5cdFx0Zy5mb250ID0gYGJvbGQgJHtmb250U2l6ZX1weCAke2ZvbnRTdGFja31gO1xuXHRcdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGcuZmlsbFRleHQodGV4dCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLzIsICgwLjQyIC0gMC4xMikqKE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yKSk7XG5cblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdH1cblxuXG5cblx0Y2xpY2soZSlcblx0e1xuXHRcdGlmKFNILmdhbWUuc3RhdGUgIT09ICdzZXR1cCcpIHJldHVybjtcblxuXHRcdGlmKCF0aGlzLnNlYXQub3duZXIpXG5cdFx0XHR0aGlzLnJlcXVlc3RKb2luKCk7XG5cdFx0ZWxzZSBpZih0aGlzLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcblx0XHRcdHRoaXMucmVxdWVzdExlYXZlKCk7XG5cdFx0ZWxzZSBpZihTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxuXHRcdFx0dGhpcy5yZXF1ZXN0S2ljaygpO1xuXHR9XG5cblx0cmVxdWVzdEpvaW4oKVxuXHR7XG5cdFx0U0guc29ja2V0LmVtaXQoJ2pvaW4nLCBPYmplY3QuYXNzaWduKHtzZWF0TnVtOiB0aGlzLnNlYXQuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpO1xuXHR9XG5cblx0cmVxdWVzdExlYXZlKClcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblx0XHRpZighc2VsZi5xdWVzdGlvbilcblx0XHR7XG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VsZi5zZWF0LmJhbGxvdC5hc2tRdWVzdGlvbignQXJlIHlvdSBzdXJlIHlvdVxcbndhbnQgdG8gbGVhdmU/JywgJ2xvY2FsX2xlYXZlJylcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xuXHRcdFx0XHRpZihjb25maXJtKXtcblx0XHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbGVhdmUnLCBTSC5sb2NhbFVzZXIuaWQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNlbGYucXVlc3Rpb24gPSBudWxsO1xuXHRcdFx0fSlcblx0XHRcdC5jYXRjaCgoKSA9PiB7IHNlbGYucXVlc3Rpb24gPSBudWxsOyB9KTtcblx0XHR9XG5cdH1cblxuXHRyZXF1ZXN0S2ljaygpXG5cdHtcblx0XHRsZXQgc2VsZiA9IHRoaXM7XG5cdFx0aWYoIXNlbGYucXVlc3Rpb24pXG5cdFx0e1xuXHRcdFx0bGV0IHNlYXQgPSBTSC5zZWF0c1tTSC5wbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0uc2VhdE51bV07XG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VhdC5iYWxsb3QuYXNrUXVlc3Rpb24oXG5cdFx0XHRcdCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byB0cnkgdG8ga2lja1xcbidcblx0XHRcdFx0K1NILnBsYXllcnNbc2VsZi5zZWF0Lm93bmVyXS5kaXNwbGF5TmFtZSxcblx0XHRcdFx0J2xvY2FsX2tpY2snXG5cdFx0XHQpXG5cdFx0XHQudGhlbihjb25maXJtID0+IHtcblx0XHRcdFx0aWYoY29uZmlybSl7XG5cdFx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2tpY2snLCBTSC5sb2NhbFVzZXIuaWQsIHNlbGYuc2VhdC5vd25lcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xuXHRcdH1cblx0fVxufVxuXG5OYW1lcGxhdGUudGV4dHVyZVNpemUgPSAyNTY7XG4iLCIndXNlIHN0cmljdDsnXG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgeyBKYUNhcmQsIE5laW5DYXJkIH0gZnJvbSAnLi9jYXJkJztcbmltcG9ydCB7IGdlbmVyYXRlUXVlc3Rpb24gfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFsbG90IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC4zLCAwLjI1KTtcblx0XHRzZWF0LmFkZCh0aGlzKTtcblxuXHRcdHRoaXMubGFzdFF1ZXVlZCA9IFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdHRoaXMuZGlzcGxheWVkID0gbnVsbDtcblxuXHRcdHRoaXMuX3llc0NsaWNrSGFuZGxlciA9IG51bGw7XG5cdFx0dGhpcy5fbm9DbGlja0hhbmRsZXIgPSBudWxsO1xuXHRcdHRoaXMuX25vbWluYXRlSGFuZGxlciA9IG51bGw7XG5cdFx0dGhpcy5fY2FuY2VsSGFuZGxlciA9IG51bGw7XG5cblx0XHR0aGlzLmphQ2FyZCA9IG5ldyBKYUNhcmQoKTtcblx0XHR0aGlzLm5laW5DYXJkID0gbmV3IE5laW5DYXJkKCk7XG5cdFx0W3RoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkXS5mb3JFYWNoKGMgPT4ge1xuXHRcdFx0Yy5wb3NpdGlvbi5zZXQoYyBpbnN0YW5jZW9mIEphQ2FyZCA/IC0wLjEgOiAwLjEsIC0wLjEsIDApO1xuXHRcdFx0Yy5yb3RhdGlvbi5zZXQoMC41LCBNYXRoLlBJLCAwKTtcblx0XHRcdGMuc2NhbGUuc2V0U2NhbGFyKDAuMTUpO1xuXHRcdFx0Yy5oaWRlKCk7XG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQodGhpcy5qYUNhcmQsIHRoaXMubmVpbkNhcmQpO1xuXG5cdFx0bGV0IGdlbyA9IG5ldyBUSFJFRS5QbGFuZUJ1ZmZlckdlb21ldHJ5KDAuNCwgMC4yKTtcblx0XHRsZXQgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHt0cmFuc3BhcmVudDogdHJ1ZX0pO1xuXHRcdHRoaXMucXVlc3Rpb24gPSBuZXcgVEhSRUUuTWVzaChnZW8sIG1hdCk7XG5cdFx0dGhpcy5xdWVzdGlvbi5wb3NpdGlvbi5zZXQoMCwgMC4wNSwgMCk7XG5cdFx0dGhpcy5xdWVzdGlvbi5yb3RhdGlvbi5zZXQoMCwgTWF0aC5QSSwgMCk7XG5cdFx0dGhpcy5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy5hZGQodGhpcy5xdWVzdGlvbik7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdm90ZXNJblByb2dyZXNzJywgdGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGUoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzLCB2b3Rlc319KVxuXHR7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXHRcdGlmKCFzZWxmLnNlYXQub3duZXIpIHJldHVybjtcblxuXHRcdGxldCB2aXBzID0gZ2FtZS52b3Rlc0luUHJvZ3Jlc3M7XG5cdFx0bGV0IGJsYWNrbGlzdGVkVm90ZXMgPSB2aXBzLmZpbHRlcihpZCA9PiB7XG5cdFx0XHRsZXQgdnMgPSBbLi4udm90ZXNbaWRdLnllc1ZvdGVycywgLi4udm90ZXNbaWRdLm5vVm90ZXJzXTtcblx0XHRcdGxldCBudiA9IHZvdGVzW2lkXS5ub25Wb3RlcnM7XG5cdFx0XHRyZXR1cm4gbnYuaW5jbHVkZXMoc2VsZi5zZWF0Lm93bmVyKSB8fCB2cy5pbmNsdWRlcyhzZWxmLnNlYXQub3duZXIpO1xuXHRcdH0pO1xuXHRcdGxldCBuZXdWb3RlcyA9IHZpcHMuZmlsdGVyKFxuXHRcdFx0aWQgPT4gKCFTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcyB8fCAhU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MuaW5jbHVkZXMoaWQpKSAmJiAhYmxhY2tsaXN0ZWRWb3Rlcy5pbmNsdWRlcyhpZClcblx0XHQpO1xuXHRcdGxldCBmaW5pc2hlZFZvdGVzID0gIVNILmdhbWUudm90ZXNJblByb2dyZXNzID8gYmxhY2tsaXN0ZWRWb3Rlc1xuXHRcdFx0OiBTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcy5maWx0ZXIoaWQgPT4gIXZpcHMuaW5jbHVkZXMoaWQpKS5jb25jYXQoYmxhY2tsaXN0ZWRWb3Rlcyk7XG5cblx0XHRuZXdWb3Rlcy5mb3JFYWNoKHZJZCA9PlxuXHRcdHtcblx0XHRcdC8vIGdlbmVyYXRlIG5ldyBxdWVzdGlvbiB0byBhc2tcblx0XHRcdGxldCBxdWVzdGlvblRleHQsIGNob2ljZXMgPSAyO1xuXHRcdFx0aWYodm90ZXNbdklkXS50eXBlID09PSAnZWxlY3QnKXtcblx0XHRcdFx0cXVlc3Rpb25UZXh0ID0gcGxheWVyc1tnYW1lLnByZXNpZGVudF0uZGlzcGxheU5hbWVcblx0XHRcdFx0XHQrICdcXG5mb3IgcHJlc2lkZW50IGFuZFxcbidcblx0XHRcdFx0XHQrIHBsYXllcnNbZ2FtZS5jaGFuY2VsbG9yXS5kaXNwbGF5TmFtZVxuXHRcdFx0XHRcdCsgJ1xcbmZvciBjaGFuY2VsbG9yPyc7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2pvaW4nKXtcblx0XHRcdFx0cXVlc3Rpb25UZXh0ID0gdm90ZXNbdklkXS5kYXRhICsgJ1xcbnRvIGpvaW4/Jztcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAna2ljaycpe1xuXHRcdFx0XHRxdWVzdGlvblRleHQgPSAnVm90ZSB0byBraWNrXFxuJ1xuXHRcdFx0XHRcdCsgcGxheWVyc1t2b3Rlc1t2SWRdLnRhcmdldDFdLmRpc3BsYXlOYW1lXG5cdFx0XHRcdFx0KyAnPyc7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2NvbmZpcm1Sb2xlJyAmJiBzZWxmLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcblx0XHRcdHtcblx0XHRcdFx0Y2hvaWNlcyA9IDE7XG5cdFx0XHRcdGxldCByb2xlID0gcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdLnJvbGU7XG5cdFx0XHRcdHJvbGUgPSByb2xlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcm9sZS5zbGljZSgxKTtcblx0XHRcdFx0cXVlc3Rpb25UZXh0ID0gJ1lvdXIgcm9sZTpcXG4nICsgcm9sZTtcblx0XHRcdH1cblxuXHRcdFx0aWYocXVlc3Rpb25UZXh0KVxuXHRcdFx0e1xuXHRcdFx0XHRzZWxmLmFza1F1ZXN0aW9uKHF1ZXN0aW9uVGV4dCwgdklkLCBjaG9pY2VzKVxuXHRcdFx0XHQudGhlbihhbnN3ZXIgPT4ge1xuXHRcdFx0XHRcdFNILnNvY2tldC5lbWl0KCd2b3RlJywgdklkLCBTSC5sb2NhbFVzZXIuaWQsIGFuc3dlcik7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5jYXRjaCgoKSA9PiBjb25zb2xlLmxvZygnVm90ZSBzY3J1YmJlZDonLCB2SWQpKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGlmKGZpbmlzaGVkVm90ZXMuaW5jbHVkZXMoc2VsZi5kaXNwbGF5ZWQpKXtcblx0XHRcdHNlbGYuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2NhbmNlbFZvdGUnLCBidWJibGVzOiBmYWxzZX0pO1xuXHRcdH1cblx0fVxuXG5cdC8qYXNrUXVlc3Rpb24ocVRleHQsIGlkLCBjaG9pY2VzID0gMilcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblx0XHRsZXQgbmV3USA9IG5ldyBDYXNjYWRpbmdQcm9taXNlKHNlbGYucXVlc3Rpb25zW3NlbGYubGFzdEFza2VkXSxcblx0XHRcdChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuXHRcdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBpcyBzdGlsbCByZWxldmFudFxuXHRcdFx0XHRsZXQgbGF0ZXN0Vm90ZXMgPSBTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcztcblx0XHRcdFx0aWYoIS9ebG9jYWwvLnRlc3QoaWQpICYmICFsYXRlc3RWb3Rlcy5pbmNsdWRlcyhpZCkpe1xuXHRcdFx0XHRcdHJlamVjdCgpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIGhvb2sgdXAgcS9hIGNhcmRzXG5cdFx0XHRcdHNlbGYucXVlc3Rpb24ubWF0ZXJpYWwubWFwID0gZ2VuZXJhdGVRdWVzdGlvbihxVGV4dCwgdGhpcy5xdWVzdGlvbi5tYXRlcmlhbC5tYXApO1xuXHRcdFx0XHRzZWxmLmphQ2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQodHJ1ZSkpO1xuXHRcdFx0XHRzZWxmLm5laW5DYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZChmYWxzZSkpO1xuXHRcdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1bmNvbmZpcm1lZENoYW5jZWxsb3InLCByZXNwb25kKTtcblxuXHRcdFx0XHQvLyBzaG93IHRoZSBiYWxsb3Rcblx0XHRcdFx0c2VsZi5xdWVzdGlvbi52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdFx0aWYoY2hvaWNlcyA+PSAxKVxuXHRcdFx0XHRcdHNlbGYuamFDYXJkLnNob3coKTtcblx0XHRcdFx0aWYoY2hvaWNlcyA+PSAyKVxuXHRcdFx0XHRcdHNlbGYubmVpbkNhcmQuc2hvdygpO1xuXG5cdFx0XHRcdGZ1bmN0aW9uIHJlc3BvbmQoYW5zd2VyKXtcblx0XHRcdFx0XHRmdW5jdGlvbiBoYW5kbGVyKClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHQvLyBtYWtlIHN1cmUgb25seSB0aGUgb3duZXIgb2YgdGhlIGJhbGxvdCBpcyBhbnN3ZXJpbmdcblx0XHRcdFx0XHRcdGlmKHNlbGYuc2VhdC5vd25lciAhPT0gU0gubG9jYWxVc2VyLmlkKSByZXR1cm47XG5cblx0XHRcdFx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgYW5zd2VyIHN0aWxsIG1hdHRlcnNcblx0XHRcdFx0XHRcdGxldCBsYXRlc3RWb3RlcyA9IFNILmdhbWUudm90ZXNJblByb2dyZXNzO1xuXHRcdFx0XHRcdFx0aWYoIS9ebG9jYWwvLnRlc3QoaWQpICYmICFsYXRlc3RWb3Rlcy5pbmNsdWRlcyhpZCkpXG5cdFx0XHRcdFx0XHRcdHJlamVjdCgpO1xuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRyZXNvbHZlKGFuc3dlci5kYXRhID8gYW5zd2VyLmRhdGEgOiBhbnN3ZXIpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmKGFuc3dlciA9PT0gdHJ1ZSkgc2VsZi5feWVzQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcblx0XHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gZmFsc2UpIHNlbGYuX25vQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdHNlbGYuX25vbWluYXRlSGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRcdFx0XHRoYW5kbGVyKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBoYW5kbGVyO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0KGRvbmUpID0+IHtcblx0XHRcdFx0ZGVsZXRlIHNlbGYucXVlc3Rpb25zW2lkXTtcblx0XHRcdFx0aWYoc2VsZi5sYXN0QXNrZWQgPT09IGlkKVxuXHRcdFx0XHRcdHNlbGYubGFzdEFza2VkID0gbnVsbDtcblxuXHRcdFx0XHQvLyBoaWRlIHRoZSBxdWVzdGlvblxuXHRcdFx0XHRzZWxmLmphQ2FyZC5oaWRlKCk7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQuaGlkZSgpO1xuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSBmYWxzZTtcblx0XHRcdFx0c2VsZi5qYUNhcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCBzZWxmLl95ZXNDbGlja0hhbmRsZXIpO1xuXHRcdFx0XHRzZWxmLm5laW5DYXJkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgc2VsZi5fbm9DbGlja0hhbmRsZXIpO1xuXHRcdFx0XHRTSC5yZW1vdmVFdmVudExpc3RlbmVyKCd1bmNvbmZpcm1lZENoYW5jZWxsb3InLCBzZWxmLl9ub21pbmF0ZUhhbmRsZXIpO1xuXHRcdFx0XHRkb25lKCk7XG5cdFx0XHR9XG5cdFx0KTtcblxuXHRcdC8vIGFkZCBxdWVzdGlvbiB0byBxdWV1ZSwgcmVtb3ZlIHdoZW4gZG9uZVxuXHRcdHNlbGYucXVlc3Rpb25zW2lkXSA9IG5ld1E7XG5cdFx0c2VsZi5sYXN0QXNrZWQgPSBpZDtcblx0XHRsZXQgc3BsaWNlID0gKCkgPT4ge1xuXHRcdFx0ZGVsZXRlIHNlbGYucXVlc3Rpb25zW2lkXTtcblx0XHRcdGlmKHNlbGYubGFzdEFza2VkID09PSBpZClcblx0XHRcdFx0c2VsZi5sYXN0QXNrZWQgPSBudWxsO1xuXHRcdH07XG5cdFx0bmV3US50aGVuKHNwbGljZSwgc3BsaWNlKTtcblxuXHRcdHJldHVybiBuZXdRO1xuXHR9Ki9cblxuXHRhc2tRdWVzdGlvbihxVGV4dCwgaWQsIGNob2ljZXMgPSAyKVxuXHR7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXG5cdFx0ZnVuY3Rpb24gaXNWb3RlVmFsaWQoKVxuXHRcdHtcblx0XHRcdGxldCBpc0xvY2FsVm90ZSA9IC9ebG9jYWwvLnRlc3QoaWQpO1xuXHRcdFx0bGV0IGlzRmlyc3RVcGRhdGUgPSAhU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3M7XG5cdFx0XHRsZXQgdm90ZSA9IFNILnZvdGVzW2lkXTtcblx0XHRcdGxldCB2b3RlcnMgPSB2b3RlID8gWy4uLnZvdGUueWVzVm90ZXJzLCAuLi52b3RlLm5vVm90ZXJzXSA6IFtdO1xuXHRcdFx0bGV0IGFscmVhZHlWb3RlZCA9IHZvdGVycy5pbmNsdWRlcyhzZWxmLnNlYXQub3duZXIpO1xuXHRcdFx0cmV0dXJuIGlzTG9jYWxWb3RlIHx8IGlzRmlyc3RVcGRhdGUgfHwgdm90ZSAmJiAhYWxyZWFkeVZvdGVkO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGhvb2tVcFF1ZXN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UocXVlc3Rpb25FeGVjdXRvcik7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcXVlc3Rpb25FeGVjdXRvcihyZXNvbHZlLCByZWplY3QpXG5cdFx0e1xuXHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBhbnN3ZXIgaXMgc3RpbGwgcmVsZXZhbnRcblx0XHRcdGlmKCFpc1ZvdGVWYWxpZCgpKXtcblx0XHRcdFx0cmV0dXJuIHJlamVjdCgpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzaG93IHRoZSBiYWxsb3Rcblx0XHRcdHNlbGYucXVlc3Rpb24ubWF0ZXJpYWwubWFwID0gZ2VuZXJhdGVRdWVzdGlvbihxVGV4dCwgc2VsZi5xdWVzdGlvbi5tYXRlcmlhbC5tYXApO1xuXHRcdFx0c2VsZi5xdWVzdGlvbi52aXNpYmxlID0gdHJ1ZTtcblxuXHRcdFx0Ly8gaG9vayB1cCBxL2EgY2FyZHNcblx0XHRcdGlmKGNob2ljZXMgPT09IDApe1xuXHRcdFx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdwbGF5ZXJTZWxlY3QnLCByZXNwb25kKCdwbGF5ZXInLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdH1cblx0XHRcdGlmKGNob2ljZXMgPj0gMSl7XG5cdFx0XHRcdHNlbGYuamFDYXJkLnNob3coKTtcblx0XHRcdFx0c2VsZi5qYUNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKCd5ZXMnLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdH1cblx0XHRcdGlmKGNob2ljZXMgPj0gMil7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQuc2hvdygpO1xuXHRcdFx0XHRzZWxmLm5laW5DYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCgnbm8nLCByZXNvbHZlLCByZWplY3QpKTtcblx0XHRcdH1cblxuXHRcdFx0c2VsZi5hZGRFdmVudExpc3RlbmVyKCdjYW5jZWxWb3RlJywgcmVzcG9uZCgnY2FuY2VsJywgcmVzb2x2ZSwgcmVqZWN0KSk7XG5cblx0XHRcdHNlbGYuZGlzcGxheWVkID0gaWQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVzcG9uZChhbnN3ZXIsIHJlc29sdmUsIHJlamVjdClcblx0XHR7XG5cdFx0XHRmdW5jdGlvbiBoYW5kbGVyKGV2dClcblx0XHRcdHtcblx0XHRcdFx0Ly8gbWFrZSBzdXJlIG9ubHkgdGhlIG93bmVyIG9mIHRoZSBiYWxsb3QgaXMgYW5zd2VyaW5nXG5cdFx0XHRcdGlmKGFuc3dlciAhPT0gJ2NhbmNlbCcgJiYgc2VsZi5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQpIHJldHVybjtcblxuXHRcdFx0XHQvLyBjbGVhbiB1cFxuXHRcdFx0XHRzZWxmLmphQ2FyZC5oaWRlKCk7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQuaGlkZSgpO1xuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSBmYWxzZTtcblx0XHRcdFx0c2VsZi5kaXNwbGF5ZWQgPSBudWxsO1xuXHRcdFx0XHRzZWxmLmphQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX3llc0NsaWNrSGFuZGxlcik7XG5cdFx0XHRcdHNlbGYubmVpbkNhcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCBzZWxmLl9ub0NsaWNrSGFuZGxlcik7XG5cdFx0XHRcdFNILnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BsYXllclNlbGVjdCcsIHNlbGYuX25vbWluYXRlSGFuZGxlcik7XG5cblx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBhbnN3ZXIgc3RpbGwgbWF0dGVyc1xuXHRcdFx0XHRpZighaXNWb3RlVmFsaWQoKSB8fCBhbnN3ZXIgPT09ICdjYW5jZWwnKXtcblx0XHRcdFx0XHRyZWplY3QoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3llcycpXG5cdFx0XHRcdFx0cmVzb2x2ZSh0cnVlKTtcblx0XHRcdFx0ZWxzZSBpZihhbnN3ZXIgPT09ICdubycpXG5cdFx0XHRcdFx0cmVzb2x2ZShmYWxzZSk7XG5cdFx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAncGxheWVyJylcblx0XHRcdFx0XHRyZXNvbHZlKGV2dC5kYXRhKTtcblx0XHRcdH1cblxuXHRcdFx0aWYoYW5zd2VyID09PSAneWVzJylcblx0XHRcdFx0c2VsZi5feWVzQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcblx0XHRcdGVsc2UgaWYoYW5zd2VyID09PSAnbm8nKVxuXHRcdFx0XHRzZWxmLl9ub0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ3BsYXllcicpXG5cdFx0XHRcdHNlbGYuX25vbWluYXRlSGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRlbHNlIGlmKGFuc3dlciA9PT0gJ2NhbmNlbCcpXG5cdFx0XHRcdHNlbGYuX2NhbmNlbEhhbmRsZXIgPSBoYW5kbGVyO1xuXG5cdFx0XHRyZXR1cm4gaGFuZGxlcjtcblx0XHR9XG5cblx0XHRzZWxmLmxhc3RRdWV1ZWQgPSBzZWxmLmxhc3RRdWV1ZWQudGhlbihob29rVXBRdWVzdGlvbiwgaG9va1VwUXVlc3Rpb24pO1xuXG5cdFx0cmV0dXJuIHNlbGYubGFzdFF1ZXVlZDtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHtGYXNjaXN0Um9sZUNhcmQsIEhpdGxlclJvbGVDYXJkLCBMaWJlcmFsUm9sZUNhcmQsIEZhc2Npc3RQYXJ0eUNhcmQsIExpYmVyYWxQYXJ0eUNhcmQsIEphQ2FyZCwgTmVpbkNhcmR9IGZyb20gJy4vY2FyZCc7XG5pbXBvcnQge2xhdGVVcGRhdGV9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGF5ZXJJbmZvIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblx0XHR0aGlzLmNhcmQgPSBudWxsO1xuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAsIDAuMyk7XG5cdFx0dGhpcy5zY2FsZS5zZXRTY2FsYXIoMC4zKTtcblx0XHRzZWF0LmFkZCh0aGlzKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIGxhdGVVcGRhdGUodGhpcy51cGRhdGVTdGF0ZS5iaW5kKHRoaXMpKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlVHVybk9yZGVyLmJpbmQodGhpcykpO1xuXHR9XG5cblx0dXBkYXRlVHVybk9yZGVyKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxuXHR7XG5cdFx0bGV0IGxvY2FsUGxheWVyID0gcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdO1xuXG5cdFx0aWYobG9jYWxQbGF5ZXIpe1xuXHRcdFx0bGV0IHBsYXllclBvcyA9IHRoaXMud29ybGRUb0xvY2FsKFNILnNlYXRzW2xvY2FsUGxheWVyLnNlYXROdW1dLmdldFdvcmxkUG9zaXRpb24oKSk7XG5cdFx0XHR0aGlzLmxvb2tBdChwbGF5ZXJQb3MpO1xuXHRcdH1cblx0fVxuXG5cdHVwZGF0ZVN0YXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcblx0e1xuXHRcdGlmKCF0aGlzLnNlYXQub3duZXIpXG5cdFx0XHRyZXR1cm47XG5cblx0XHRpZihnYW1lLnN0YXRlID09PSAnbmlnaHQnICYmIHBsYXllcnNbU0gubG9jYWxVc2VyLmlkXSlcblx0XHRcdHRoaXMucHJlc2VudFJvbGUoZ2FtZSwgcGxheWVycywgdm90ZXMpO1xuXG5cdFx0ZWxzZSBpZihnYW1lLnN0YXRlID09PSAnbGFtZUR1Y2snKVxuXHRcdFx0dGhpcy5wcmVzZW50Vm90ZShnYW1lLCBwbGF5ZXJzLCB2b3Rlcyk7XG5cblx0XHRlbHNlIGlmKHRoaXMuY2FyZCAhPT0gbnVsbClcblx0XHR7XG5cdFx0XHR0aGlzLnJlbW92ZSh0aGlzLmNhcmQpO1xuXHRcdFx0dGhpcy5jYXJkID0gbnVsbDtcblx0XHR9XG5cdH1cblxuXHRwcmVzZW50Um9sZShnYW1lLCBwbGF5ZXJzKVxuXHR7XG5cdFx0bGV0IGxvY2FsUGxheWVyID0gcGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdO1xuXHRcdGxldCBzZWF0ZWRQbGF5ZXIgPSBwbGF5ZXJzW3RoaXMuc2VhdC5vd25lcl07XG5cblx0XHRsZXQgc2VhdGVkUm9sZVNob3VsZEJlVmlzaWJsZSA9XG5cdFx0XHRTSC5sb2NhbFVzZXIuaWQgPT09IHRoaXMuc2VhdC5vd25lciB8fFxuXHRcdFx0bG9jYWxQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnICYmIChzZWF0ZWRQbGF5ZXIucm9sZSA9PT0gJ2Zhc2Npc3QnIHx8IHNlYXRlZFBsYXllci5yb2xlID09PSAnaGl0bGVyJykgfHxcblx0XHRcdGxvY2FsUGxheWVyLnJvbGUgPT09ICdoaXRsZXInICYmIHNlYXRlZFBsYXllci5yb2xlID09PSAnZmFzY2lzdCcgJiYgZ2FtZS50dXJuT3JkZXIubGVuZ3RoIDwgOTtcblxuXHRcdGlmKHNlYXRlZFJvbGVTaG91bGRCZVZpc2libGUpXG5cdFx0e1xuXHRcdFx0c3dpdGNoKHNlYXRlZFBsYXllci5yb2xlKXtcblx0XHRcdFx0Y2FzZSAnZmFzY2lzdCc6IHRoaXMuY2FyZCA9IG5ldyBGYXNjaXN0Um9sZUNhcmQoKTsgYnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2hpdGxlcicgOiB0aGlzLmNhcmQgPSBuZXcgSGl0bGVyUm9sZUNhcmQoKTsgIGJyZWFrO1xuXHRcdFx0XHRjYXNlICdsaWJlcmFsJzogdGhpcy5jYXJkID0gbmV3IExpYmVyYWxSb2xlQ2FyZCgpOyBicmVhaztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5hZGQodGhpcy5jYXJkKTtcblx0XHR9XG5cdH1cblxuXHRwcmVzZW50Vm90ZShnYW1lLCBfLCB2b3Rlcylcblx0e1xuXHRcdGxldCB2b3RlID0gdm90ZXNbZ2FtZS5sYXN0RWxlY3Rpb25dO1xuXG5cdFx0bGV0IHBsYXllclZvdGUgPSB2b3RlLnllc1ZvdGVycy5pbmNsdWRlcyh0aGlzLnNlYXQub3duZXIpO1xuXHRcdHRoaXMuY2FyZCA9IHBsYXllclZvdGUgPyBuZXcgSmFDYXJkKCkgOiBuZXcgTmVpbkNhcmQoKTtcblx0XHR0aGlzLmFkZCh0aGlzLmNhcmQpO1xuXHR9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDYXBzdWxlR2VvbWV0cnkgZXh0ZW5kcyBUSFJFRS5CdWZmZXJHZW9tZXRyeVxue1xuXHRjb25zdHJ1Y3RvcihyYWRpdXMsIGhlaWdodCwgc2VnbWVudHMgPSAxMiwgcmluZ3MgPSA4KVxuXHR7XG5cdFx0c3VwZXIoKTtcblxuXHRcdGxldCBudW1WZXJ0cyA9IDIgKiByaW5ncyAqIHNlZ21lbnRzICsgMjtcblx0XHRsZXQgbnVtRmFjZXMgPSA0ICogcmluZ3MgKiBzZWdtZW50cztcblx0XHRsZXQgdGhldGEgPSAyKk1hdGguUEkvc2VnbWVudHM7XG5cdFx0bGV0IHBoaSA9IE1hdGguUEkvKDIqcmluZ3MpO1xuXG5cdFx0bGV0IHZlcnRzID0gbmV3IEZsb2F0MzJBcnJheSgzKm51bVZlcnRzKTtcblx0XHRsZXQgZmFjZXMgPSBuZXcgVWludDE2QXJyYXkoMypudW1GYWNlcyk7XG5cdFx0bGV0IHZpID0gMCwgZmkgPSAwLCB0b3BDYXAgPSAwLCBib3RDYXAgPSAxO1xuXG5cdFx0dmVydHMuc2V0KFswLCBoZWlnaHQvMiwgMF0sIDMqdmkrKyk7XG5cdFx0dmVydHMuc2V0KFswLCAtaGVpZ2h0LzIsIDBdLCAzKnZpKyspO1xuXG5cdFx0Zm9yKCBsZXQgcz0wOyBzPHNlZ21lbnRzOyBzKysgKVxuXHRcdHtcblx0XHRcdGZvciggbGV0IHI9MTsgcjw9cmluZ3M7IHIrKylcblx0XHRcdHtcblx0XHRcdFx0bGV0IHJhZGlhbCA9IHJhZGl1cyAqIE1hdGguc2luKHIqcGhpKTtcblxuXHRcdFx0XHQvLyBjcmVhdGUgdmVydHNcblx0XHRcdFx0dmVydHMuc2V0KFtcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLmNvcyhzKnRoZXRhKSxcblx0XHRcdFx0XHRoZWlnaHQvMiAtIHJhZGl1cyooMS1NYXRoLmNvcyhyKnBoaSkpLFxuXHRcdFx0XHRcdHJhZGlhbCAqIE1hdGguc2luKHMqdGhldGEpXG5cdFx0XHRcdF0sIDMqdmkrKyk7XG5cblx0XHRcdFx0dmVydHMuc2V0KFtcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLmNvcyhzKnRoZXRhKSxcblx0XHRcdFx0XHQtaGVpZ2h0LzIgKyByYWRpdXMqKDEtTWF0aC5jb3MocipwaGkpKSxcblx0XHRcdFx0XHRyYWRpYWwgKiBNYXRoLnNpbihzKnRoZXRhKVxuXHRcdFx0XHRdLCAzKnZpKyspO1xuXG5cdFx0XHRcdGxldCB0b3BfczFyMSA9IHZpLTIsIHRvcF9zMXIwID0gdmktNDtcblx0XHRcdFx0bGV0IGJvdF9zMXIxID0gdmktMSwgYm90X3MxcjAgPSB2aS0zO1xuXHRcdFx0XHRsZXQgdG9wX3MwcjEgPSB0b3BfczFyMSAtIDIqcmluZ3MsIHRvcF9zMHIwID0gdG9wX3MxcjAgLSAyKnJpbmdzO1xuXHRcdFx0XHRsZXQgYm90X3MwcjEgPSBib3RfczFyMSAtIDIqcmluZ3MsIGJvdF9zMHIwID0gYm90X3MxcjAgLSAyKnJpbmdzO1xuXHRcdFx0XHRpZihzID09PSAwKXtcblx0XHRcdFx0XHR0b3BfczByMSArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHRcdHRvcF9zMHIwICs9IG51bVZlcnRzLTI7XG5cdFx0XHRcdFx0Ym90X3MwcjEgKz0gbnVtVmVydHMtMjtcblx0XHRcdFx0XHRib3RfczByMCArPSBudW1WZXJ0cy0yO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gY3JlYXRlIGZhY2VzXG5cdFx0XHRcdGlmKHIgPT09IDEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcENhcCwgdG9wX3MxcjEsIHRvcF9zMHIxXSwgMypmaSsrKTtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdENhcCwgYm90X3MwcjEsIGJvdF9zMXIxXSwgMypmaSsrKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmYWNlcy5zZXQoW3RvcF9zMXIwLCB0b3BfczFyMSwgdG9wX3MwcjBdLCAzKmZpKyspO1xuXHRcdFx0XHRcdGZhY2VzLnNldChbdG9wX3MwcjAsIHRvcF9zMXIxLCB0b3BfczByMV0sIDMqZmkrKyk7XG5cblx0XHRcdFx0XHRmYWNlcy5zZXQoW2JvdF9zMHIxLCBib3RfczFyMSwgYm90X3MwcjBdLCAzKmZpKyspO1xuXHRcdFx0XHRcdGZhY2VzLnNldChbYm90X3MwcjAsIGJvdF9zMXIxLCBib3RfczFyMF0sIDMqZmkrKyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gY3JlYXRlIGxvbmcgc2lkZXNcblx0XHRcdGxldCB0b3BfczEgPSB2aS0yLCB0b3BfczAgPSB0b3BfczEgLSAyKnJpbmdzO1xuXHRcdFx0bGV0IGJvdF9zMSA9IHZpLTEsIGJvdF9zMCA9IGJvdF9zMSAtIDIqcmluZ3M7XG5cdFx0XHRpZihzID09PSAwKXtcblx0XHRcdFx0dG9wX3MwICs9IG51bVZlcnRzLTI7XG5cdFx0XHRcdGJvdF9zMCArPSBudW1WZXJ0cy0yO1xuXHRcdFx0fVxuXG5cdFx0XHRmYWNlcy5zZXQoW3RvcF9zMCwgdG9wX3MxLCBib3RfczFdLCAzKmZpKyspO1xuXHRcdFx0ZmFjZXMuc2V0KFtib3RfczAsIHRvcF9zMCwgYm90X3MxXSwgMypmaSsrKTtcblx0XHR9XG5cblx0XHR0aGlzLmFkZEF0dHJpYnV0ZSgncG9zaXRpb24nLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHZlcnRzLCAzKSk7XG5cdFx0dGhpcy5zZXRJbmRleChuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKGZhY2VzLCAxKSk7XG5cdH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgQ2Fwc3VsZUdlb21ldHJ5IGZyb20gJy4vY2Fwc3VsZWdlb21ldHJ5JztcbmltcG9ydCB7bGF0ZVVwZGF0ZX0gZnJvbSAnLi91dGlscyc7XG5cbmxldCBoaXRib3hHZW8gPSBuZXcgQ2Fwc3VsZUdlb21ldHJ5KDAuMywgMS44KTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSGl0Ym94IGV4dGVuZHMgVEhSRUUuTWVzaFxue1xuXHRjb25zdHJ1Y3RvcihzZWF0KVxuXHR7XG5cdFx0c3VwZXIoaGl0Ym94R2VvLCBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuXHRcdFx0dHJhbnNwYXJlbnQ6IHRydWUsXG5cdFx0XHRvcGFjaXR5OiAwLFxuXHRcdFx0c2lkZTogVEhSRUUuQmFja1NpZGVcblx0XHR9KSk7XG5cblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAtMC41LCAwKTtcblx0XHR0aGlzLnZpc2libGUgPSBmYWxzZTtcblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xuXHRcdHNlYXQuYWRkKHRoaXMpO1xuXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3JlbnRlcicsICgpID0+IHRoaXMubWF0ZXJpYWwub3BhY2l0eSA9IDAuMSk7XG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3JsZWF2ZScsICgpID0+IHRoaXMubWF0ZXJpYWwub3BhY2l0eSA9IDApO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCAoKSA9PiB7XG5cdFx0XHRTSC5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdFx0dHlwZTogJ3BsYXllclNlbGVjdCcsXG5cdFx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB0aGlzLnNlYXQub3duZXJcblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgbGF0ZVVwZGF0ZSgoe2RhdGE6IHtnYW1lfX0pID0+XG5cdFx0e1xuXHRcdFx0dGhpcy52aXNpYmxlID1cblx0XHRcdFx0Z2FtZS5zdGF0ZSA9PT0gJ25vbWluYXRlJyAmJlxuXHRcdFx0XHRTSC5sb2NhbFVzZXIuaWQgPT09IGdhbWUucHJlc2lkZW50ICYmXG5cdFx0XHRcdHRoaXMuc2VhdC5vd25lciAhPT0gJycgJiZcblx0XHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQgJiZcblx0XHRcdFx0dGhpcy5zZWF0Lm93bmVyICE9PSBnYW1lLmxhc3RDaGFuY2VsbG9yICYmXG5cdFx0XHRcdChnYW1lLnR1cm5PcmRlci5sZW5ndGggPT09IDUgfHwgdGhpcy5zZWF0Lm93bmVyICE9PSBnYW1lLmxhc3RQcmVzaWRlbnQpO1xuXHRcdH0pKTtcblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XG5pbXBvcnQgQmFsbG90IGZyb20gJy4vYmFsbG90JztcbmltcG9ydCBQbGF5ZXJJbmZvIGZyb20gJy4vcGxheWVyaW5mbyc7XG5pbXBvcnQgSGl0Ym94IGZyb20gJy4vaGl0Ym94JztcbmltcG9ydCB7bGF0ZVVwZGF0ZX0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNlYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcihzZWF0TnVtKVxuXHR7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc2VhdE51bSA9IHNlYXROdW07XG5cdFx0dGhpcy5vd25lciA9ICcnO1xuXG5cdFx0Ly8gcG9zaXRpb24gc2VhdFxuXHRcdGxldCB4LCB5PTAuNjUsIHo7XG5cdFx0c3dpdGNoKHNlYXROdW0pe1xuXHRcdGNhc2UgMDogY2FzZSAxOiBjYXNlIDI6XG5cdFx0XHR4ID0gLTAuODMzICsgMC44MzMqc2VhdE51bTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIC0xLjA1KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMzogY2FzZSA0OlxuXHRcdFx0eiA9IC0wLjQzNyArIDAuODc0KihzZWF0TnVtLTMpO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMS40MjUsIHksIHopO1xuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEkvMiwgMCk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIDU6IGNhc2UgNjogY2FzZSA3OlxuXHRcdFx0eCA9IDAuODMzIC0gMC44MzMqKHNlYXROdW0tNSk7XG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCh4LCB5LCAxLjA1KTtcblx0XHRcdHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLCAwKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgODogY2FzZSA5OlxuXHRcdFx0eiA9IDAuNDM3IC0gMC44NzQqKHNlYXROdW0tOCk7XG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgtMS40MjUsIHksIHopO1xuXHRcdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLTEuNSpNYXRoLlBJLCAwKTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLnVwZGF0ZU93bmVyc2hpcC5iaW5kKHRoaXMpKTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBsYXRlVXBkYXRlKHRoaXMudXBkYXRlU3RhdGUuYmluZCh0aGlzKSkpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2NoZWNrZWRJbicsIGlkID0+IHtcblx0XHRcdGlmKHRoaXMub3duZXIgPT09IGlkKVxuXHRcdFx0XHR0aGlzLnVwZGF0ZU93bmVyc2hpcCh7ZGF0YToge2dhbWU6IFNILmdhbWUsIHBsYXllcnM6IFNILnBsYXllcnN9fSk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLm5hbWVwbGF0ZSA9IG5ldyBOYW1lcGxhdGUodGhpcyk7XG5cdFx0dGhpcy5iYWxsb3QgPSBuZXcgQmFsbG90KHRoaXMpO1xuXHRcdHRoaXMucGxheWVySW5mbyA9IG5ldyBQbGF5ZXJJbmZvKHRoaXMpO1xuXHRcdHRoaXMuaGl0Ym94ID0gbmV3IEhpdGJveCh0aGlzKTtcblx0fVxuXG5cdHVwZGF0ZU93bmVyc2hpcCh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcblx0e1xuXHRcdGxldCBpZHMgPSBnYW1lLnR1cm5PcmRlciB8fCBbXTtcblxuXHRcdC8vIHJlZ2lzdGVyIHRoaXMgc2VhdCBpZiBpdCdzIG5ld2x5IGNsYWltZWRcblx0XHRpZiggIXRoaXMub3duZXIgKVxuXHRcdHtcblx0XHRcdC8vIGNoZWNrIGlmIGEgcGxheWVyIGhhcyBqb2luZWQgYXQgdGhpcyBzZWF0XG5cdFx0XHRmb3IobGV0IGkgaW4gaWRzKXtcblx0XHRcdFx0aWYocGxheWVyc1tpZHNbaV1dLnNlYXROdW0gPT0gdGhpcy5zZWF0TnVtKXtcblx0XHRcdFx0XHR0aGlzLm93bmVyID0gaWRzW2ldO1xuXHRcdFx0XHRcdHRoaXMubmFtZXBsYXRlLnVwZGF0ZVRleHQocGxheWVyc1tpZHNbaV1dLmRpc3BsYXlOYW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHJlc2V0IHRoaXMgc2VhdCBpZiBpdCdzIG5ld2x5IHZhY2F0ZWRcblx0XHRpZiggIWlkcy5pbmNsdWRlcyh0aGlzLm93bmVyKSApXG5cdFx0e1xuXHRcdFx0dGhpcy5vd25lciA9ICcnO1xuXHRcdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHRcdHRoaXMubmFtZXBsYXRlLnVwZGF0ZVRleHQoJzxKb2luPicpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHVwZGF0ZSBkaXNjb25uZWN0IGNvbG9yc1xuXHRcdGVsc2UgaWYoICFwbGF5ZXJzW3RoaXMub3duZXJdLmNvbm5lY3RlZCApe1xuXHRcdFx0dGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ODA4MDgwKTtcblx0XHR9XG5cdFx0ZWxzZSBpZiggcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcblx0XHRcdHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweGZmZmZmZik7XG5cdFx0fVxuXHR9XG5cblx0dXBkYXRlU3RhdGUoe2RhdGE6IHtnYW1lOiB7c3RhdGUsIHByZXNpZGVudH0sIHBsYXllcnN9fSlcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblxuXHRcdGZ1bmN0aW9uIGNob29zZUNoYW5jZWxsb3IoKXtcblx0XHRcdHJldHVybiBzZWxmLmJhbGxvdC5hc2tRdWVzdGlvbignQ2hvb3NlIHlvdXJcXG5jaGFuY2VsbG9yIScsICdsb2NhbF9ub21pbmF0ZScsIDApXG5cdFx0XHQudGhlbihjb25maXJtQ2hhbmNlbGxvcik7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY29uZmlybUNoYW5jZWxsb3IodXNlcklkKXtcblx0XHRcdGxldCB1c2VybmFtZSA9IFNILnBsYXllcnNbdXNlcklkXS5kaXNwbGF5TmFtZTtcblx0XHRcdGxldCB0ZXh0ID0gYE5hbWUgJHt1c2VybmFtZX1cXG5hcyBjaGFuY2VsbG9yP2A7XG5cdFx0XHRyZXR1cm4gc2VsZi5iYWxsb3QuYXNrUXVlc3Rpb24odGV4dCwgJ2xvY2FsX25vbWluYXRlX2NvbmZpcm0nLCAyKVxuXHRcdFx0LnRoZW4oY29uZmlybWVkID0+IHtcblx0XHRcdFx0aWYoY29uZmlybWVkKXtcblx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHVzZXJJZCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNob29zZUNoYW5jZWxsb3IoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYoc3RhdGUgPT09ICdub21pbmF0ZScgJiYgU0gubG9jYWxVc2VyLmlkID09PSBwcmVzaWRlbnQgJiYgdGhpcy5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxuXHRcdHtcblx0XHRcdGNob29zZUNoYW5jZWxsb3IoKS50aGVuKHVzZXJJZCA9PiB7XG5cdFx0XHRcdFNILnNvY2tldC5lbWl0KCdub21pbmF0ZScsIHVzZXJJZCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxubGV0IHBsYWNlaG9sZGVyR2VvID0gbmV3IFRIUkVFLkJveEJ1ZmZlckdlb21ldHJ5KC4wMDEsIC4wMDEsIC4wMDEpO1xubGV0IHBsYWNlaG9sZGVyTWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHhmZmZmZmZ9KTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29udGludWVCb3ggZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcihwYXJlbnQpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuaWNvbiA9IG5ldyBUSFJFRS5NZXNoKFxuXHRcdFx0bmV3IFRIUkVFLkJveEJ1ZmZlckdlb21ldHJ5KC4yLCAuMSwgLjIpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHgwMGMwMDB9KVxuXHRcdCk7XG5cdFx0dGhpcy5pY29uLmFkZEJlaGF2aW9yKG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLlNwaW4oKSk7XG5cdFx0dGhpcy5hZGQodGhpcy5pY29uKTtcblxuXHRcdHRoaXMudGV4dCA9IG5ldyBUSFJFRS5NZXNoKHBsYWNlaG9sZGVyR2VvLCBwbGFjZWhvbGRlck1hdCk7XG5cdFx0dGhpcy50ZXh0LnBvc2l0aW9uLnNldCgwLCAuMiwgMCk7XG5cdFx0dGhpcy50ZXh0Lm1hdGVyaWFsLnZpc2libGUgPSBmYWxzZTtcblx0XHR0aGlzLnRleHQudXNlckRhdGEuYWx0c3BhY2UgPSB7Y29sbGlkZXI6IHtlbmFibGVkOiBmYWxzZX19O1xuXG5cdFx0YWx0c3BhY2UuYWRkTmF0aXZlQ29tcG9uZW50KHRoaXMudGV4dCwgJ24tYmlsbGJvYXJkJyk7XG5cblx0XHQvLyBtdXN0IHNlbmQgYWxsIHByb3BlcnRpZXMgZXZlcnkgdXBkYXRlLCBvciB0aGV5J2xsIHplcm8gb3V0XG5cdFx0dGhpcy50ZXh0RGF0YSA9IHtmb250U2l6ZTogMSwgd2lkdGg6IDEsIGhlaWdodDogMSwgaG9yaXpvbnRhbEFsaWduOiAnbWlkZGxlJywgdmVydGljYWxBbGlnbjogJ21pZGRsZSd9O1xuXHRcdGFsdHNwYWNlLmFkZE5hdGl2ZUNvbXBvbmVudCh0aGlzLnRleHQsICduLXRleHQnKTtcblx0XHRhbHRzcGFjZS51cGRhdGVOYXRpdmVDb21wb25lbnQodGhpcy50ZXh0LCAnbi10ZXh0JywgdGhpcy50ZXh0RGF0YSk7XG5cblx0XHR0aGlzLmFkZCh0aGlzLnRleHQpO1xuXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC4zLCAwKTtcblx0XHRwYXJlbnQuYWRkKHRoaXMpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgdGhpcy5vbnN0YXRlY2hhbmdlLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLm9uY2xpY2suYmluZCh0aGlzKSk7XG5cdH1cblxuXHRvbmNsaWNrKGV2dClcblx0e1xuXHRcdGlmKFNILnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxuXHRcdFx0U0guc29ja2V0LmVtaXQoJ2NvbnRpbnVlJyk7XG5cdH1cblxuXHRvbnN0YXRlY2hhbmdlKHtkYXRhOiB7Z2FtZX19KVxuXHR7XG5cdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ2xhbWVEdWNrJyl7XG5cdFx0XHR0aGlzLmljb24udmlzaWJsZSA9IHRydWU7XG5cdFx0XHR0aGlzLnRleHQudmlzaWJsZSA9IHRydWU7XG5cdFx0XHR0aGlzLnRleHREYXRhLnRleHQgPSAnQ2xpY2sgdG8gY29udGludWUnO1xuXHRcdFx0YWx0c3BhY2UudXBkYXRlTmF0aXZlQ29tcG9uZW50KHRoaXMudGV4dCwgJ24tdGV4dCcsIHRoaXMudGV4dERhdGEpO1xuXHRcdH1cblx0XHRlbHNlIGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcgJiYgZ2FtZS50dXJuT3JkZXIubGVuZ3RoID49IDUpe1xuXHRcdFx0dGhpcy5pY29uLnZpc2libGUgPSB0cnVlO1xuXHRcdFx0dGhpcy50ZXh0LnZpc2libGUgPSB0cnVlO1xuXHRcdFx0dGhpcy50ZXh0RGF0YS50ZXh0ID0gJ0NsaWNrIHRvIHN0YXJ0Jztcblx0XHRcdGFsdHNwYWNlLnVwZGF0ZU5hdGl2ZUNvbXBvbmVudCh0aGlzLnRleHQsICduLXRleHQnLCB0aGlzLnRleHREYXRhKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR0aGlzLmljb24udmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0dGhpcy50ZXh0LnZpc2libGUgPSBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdH1cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgJy4vcG9seWZpbGwnO1xuXG5pbXBvcnQgKiBhcyBDYXJkcyBmcm9tICcuL2NhcmQnO1xuaW1wb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH0gZnJvbSAnLi9oYXRzJztcbmltcG9ydCBHYW1lVGFibGUgZnJvbSAnLi90YWJsZSc7XG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCB7IGdldEdhbWVJZCwgbWVyZ2VPYmplY3RzIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgTmFtZXBsYXRlIGZyb20gJy4vbmFtZXBsYXRlJztcbmltcG9ydCBTZWF0IGZyb20gJy4vc2VhdCc7XG5pbXBvcnQgUGxheWVyTWV0ZXIgZnJvbSAnLi9wbGF5ZXJtZXRlcic7XG5pbXBvcnQgQ29udGludWVCb3ggZnJvbSAnLi9jb250aW51ZWJveCc7XG5cbmNsYXNzIFNlY3JldEhpdGxlciBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5hc3NldHMgPSBBc3NldE1hbmFnZXIubWFuaWZlc3Q7XG5cdFx0dGhpcy52ZXJ0aWNhbEFsaWduID0gJ2JvdHRvbSc7XG5cdFx0dGhpcy5uZWVkc1NrZWxldG9uID0gZmFsc2U7XG5cblx0XHQvLyBwb2x5ZmlsbCBnZXRVc2VyIGZ1bmN0aW9uXG5cdFx0aWYoIWFsdHNwYWNlLmluQ2xpZW50KXtcblx0XHRcdGFsdHNwYWNlLmdldFVzZXIgPSAoKSA9PiB7XG5cdFx0XHRcdGxldCBpZCwgcmUgPSAvWz8mXXVzZXJJZD0oXFxkKykvLmV4ZWMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG5cdFx0XHRcdGlmKHJlKVxuXHRcdFx0XHRcdGlkID0gcmVbMV07XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwKS50b1N0cmluZygpO1xuXG5cdFx0XHRcdGFsdHNwYWNlLl9sb2NhbFVzZXIgPSB7XG5cdFx0XHRcdFx0dXNlcklkOiBpZCxcblx0XHRcdFx0XHRkaXNwbGF5TmFtZTogaWQsXG5cdFx0XHRcdFx0aXNNb2RlcmF0b3I6IC9pc01vZGVyYXRvci8udGVzdCh3aW5kb3cubG9jYXRpb24uc2VhcmNoKVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRjb25zb2xlLmxvZygnTWFzcXVlcmFkaW5nIGFzJywgYWx0c3BhY2UuX2xvY2FsVXNlcik7XG5cdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoYWx0c3BhY2UuX2xvY2FsVXNlcik7XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIGdldCBsb2NhbCB1c2VyXG5cdFx0YWx0c3BhY2UuZ2V0VXNlcigpLnRoZW4oKHVzZXIgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcblx0XHRcdFx0aWQ6IHVzZXIudXNlcklkLFxuXHRcdFx0XHRkaXNwbGF5TmFtZTogdXNlci5kaXNwbGF5TmFtZSxcblx0XHRcdFx0aXNNb2RlcmF0b3I6IHVzZXIuaXNNb2RlcmF0b3Jcblx0XHRcdH07XG5cdFx0fSkuYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLmdhbWUgPSB7fTtcblx0XHR0aGlzLnBsYXllcnMgPSB7fTtcblx0XHR0aGlzLnZvdGVzID0ge307XG5cdH1cblxuXHRpbml0aWFsaXplKGVudiwgcm9vdCwgYXNzZXRzKVxuXHR7XG5cdFx0Ly8gc2hhcmUgdGhlIGRpb3JhbWEgaW5mb1xuXHRcdEFzc2V0TWFuYWdlci5jYWNoZSA9IGFzc2V0cztcblx0XHRBc3NldE1hbmFnZXIuZml4TWF0ZXJpYWxzKCk7XG5cdFx0dGhpcy5lbnYgPSBlbnY7XG5cblx0XHQvLyBjb25uZWN0IHRvIHNlcnZlclxuXHRcdHRoaXMuc29ja2V0ID0gaW8uY29ubmVjdCgnLycsIHtxdWVyeTogJ2dhbWVJZD0nK2dldEdhbWVJZCgpfSk7XG5cblx0XHQvLyBjcmVhdGUgdGhlIHRhYmxlXG5cdFx0dGhpcy50YWJsZSA9IG5ldyBHYW1lVGFibGUoKTtcblx0XHR0aGlzLmFkZCh0aGlzLnRhYmxlKTtcblxuXHRcdHRoaXMucmVzZXRCdXR0b24gPSBuZXcgVEhSRUUuTWVzaChcblx0XHRcdG5ldyBUSFJFRS5Cb3hHZW9tZXRyeSguMjUsLjI1LC4yNSksXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogYXNzZXRzLnRleHR1cmVzLnJlc2V0fSlcblx0XHQpO1xuXHRcdHRoaXMucmVzZXRCdXR0b24ucG9zaXRpb24uc2V0KDAsIC0wLjE4LCAwKTtcblx0XHR0aGlzLnJlc2V0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5zZW5kUmVzZXQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy50YWJsZS5hZGQodGhpcy5yZXNldEJ1dHRvbik7XG5cblx0XHQvLyBjcmVhdGUgaWRsZSBkaXNwbGF5XG5cdFx0dGhpcy5pZGxlUm9vdCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuXHRcdHRoaXMuaWRsZVJvb3QucG9zaXRpb24uc2V0KDAsIDEuODUsIDApO1xuXHRcdHRoaXMuaWRsZVJvb3QuYWRkQmVoYXZpb3IobmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuU3Bpbih7c3BlZWQ6IDAuMDAwMn0pKTtcblx0XHR0aGlzLmFkZCh0aGlzLmlkbGVSb290KTtcblxuXHRcdC8vIGNyZWF0ZSBpZGxlIHNsaWRlc2hvd1xuXHRcdGxldCBjcmVkaXRzID0gbmV3IENhcmRzLkNyZWRpdHNDYXJkKCk7XG5cdFx0dGhpcy5pZGxlUm9vdC5hZGQoY3JlZGl0cyk7XG5cblx0XHQvLyBjcmVhdGUgaGF0c1xuXHRcdHRoaXMucHJlc2lkZW50SGF0ID0gbmV3IFByZXNpZGVudEhhdCgpO1xuXHRcdHRoaXMuY2hhbmNlbGxvckhhdCA9IG5ldyBDaGFuY2VsbG9ySGF0KCk7XG5cblx0XHQvLyBjcmVhdGUgcG9zaXRpb25zXG5cdFx0dGhpcy5zZWF0cyA9IFtdO1xuXHRcdGZvcihsZXQgaT0wOyBpPDEwOyBpKyspe1xuXHRcdFx0dGhpcy5zZWF0cy5wdXNoKCBuZXcgU2VhdChpKSApO1xuXHRcdH1cblxuXHRcdHRoaXMudGFibGUuYWRkKC4uLnRoaXMuc2VhdHMpO1xuXG5cdFx0Ly90aGlzLnBsYXllck1ldGVyID0gbmV3IFBsYXllck1ldGVyKCk7XG5cdFx0Ly90aGlzLnRhYmxlLmFkZCh0aGlzLnBsYXllck1ldGVyKTtcblx0XHR0aGlzLmNvbnRpbnVlQm94ID0gbmV3IENvbnRpbnVlQm94KHRoaXMudGFibGUpO1xuXG5cdFx0Ly8gYWRkIGF2YXRhciBmb3Igc2NhbGVcblx0XHQvKmFzc2V0cy5tb2RlbHMuZHVtbXkucG9zaXRpb24uc2V0KDAsIC0wLjEyLCAxLjEpO1xuXHRcdGFzc2V0cy5tb2RlbHMuZHVtbXkucm90YXRlWihNYXRoLlBJKTtcblx0XHR0aGlzLmFkZChhc3NldHMubW9kZWxzLmR1bW15KTsqL1xuXG5cdFx0dGhpcy5zb2NrZXQub24oJ3VwZGF0ZScsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLnNvY2tldC5vbignY2hlY2tlZEluJywgdGhpcy5jaGVja2VkSW4uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLnNvY2tldC5vbigncmVzZXQnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5zb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCB0aGlzLmRvUmVzZXQuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVGcm9tU2VydmVyKGdkLCBwZCwgdmQpXG5cdHtcblx0XHRjb25zb2xlLmxvZyhnZCwgcGQsIHZkKTtcblxuXHRcdGxldCBnYW1lID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nYW1lLCBnZCk7XG5cdFx0bGV0IHBsYXllcnMgPSBtZXJnZU9iamVjdHModGhpcy5wbGF5ZXJzLCBwZCB8fCB7fSk7XG5cdFx0bGV0IHZvdGVzID0gbWVyZ2VPYmplY3RzKHRoaXMudm90ZXMsIHZkIHx8IHt9KTtcblxuXHRcdGZvcihsZXQgZmllbGQgaW4gZ2QpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdFx0dHlwZTogJ3VwZGF0ZV8nK2ZpZWxkLFxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGdhbWU6IGdhbWUsXG5cdFx0XHRcdFx0cGxheWVyczogcGxheWVycyxcblx0XHRcdFx0XHR2b3Rlczogdm90ZXNcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYocGxheWVyc1t0aGlzLmxvY2FsVXNlci5pZF0gJiYgIXBsYXllcnNbdGhpcy5sb2NhbFVzZXIuaWRdLmNvbm5lY3RlZCl7XG5cdFx0XHR0aGlzLnNvY2tldC5lbWl0KCdjaGVja0luJywgdGhpcy5sb2NhbFVzZXIpO1xuXHRcdH1cblxuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XG5cdFx0dGhpcy5wbGF5ZXJzID0gcGxheWVycztcblx0XHR0aGlzLnZvdGVzID0gdm90ZXM7XG5cdH1cblxuXHRjaGVja2VkSW4ocClcblx0e1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcy5wbGF5ZXJzW3AuaWRdLCBwKTtcblx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe1xuXHRcdFx0dHlwZTogJ2NoZWNrZWRJbicsXG5cdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdGRhdGE6IHAuaWRcblx0XHR9KTtcblx0fVxuXG5cdHNlbmRSZXNldChlKXtcblx0XHRpZih0aGlzLmxvY2FsVXNlci5pc01vZGVyYXRvcil7XG5cdFx0XHRjb25zb2xlLmxvZygncmVxdWVzdGluZyByZXNldCcpO1xuXHRcdFx0dGhpcy5zb2NrZXQuZW1pdCgncmVzZXQnKTtcblx0XHR9XG5cdH1cblxuXHRkb1Jlc2V0KClcblx0e1xuXHRcdGlmKCAvJmNhY2hlQnVzdD1cXGQrJC8udGVzdCh3aW5kb3cubG9jYXRpb24uc2VhcmNoKSApe1xuXHRcdFx0d2luZG93LmxvY2F0aW9uLnNlYXJjaCArPSAnMSc7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0d2luZG93LmxvY2F0aW9uLnNlYXJjaCArPSAnJmNhY2hlQnVzdD0xJztcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgbmV3IFNlY3JldEhpdGxlcigpO1xuIl0sIm5hbWVzIjpbInRoaXMiLCJsZXQiLCJzdXBlciIsIkFzc2V0TWFuYWdlciIsIkNhcmRzLkNyZWRpdHNDYXJkIl0sIm1hcHBpbmdzIjoiOzs7QUFFQSxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7Q0FDNUIsTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRTtFQUNsRCxLQUFLLEVBQUUsU0FBUyxJQUFJLENBQUM7R0FDcEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0dBQy9CO0VBQ0QsUUFBUSxFQUFFLEtBQUs7RUFDZixVQUFVLEVBQUUsS0FBSztFQUNqQixZQUFZLEVBQUUsS0FB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QUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7OztFQUdmLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUMzRCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNsRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDakMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7OztFQUdyQixJQUFJLENBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDNUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQztFQUN2QyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztFQUM1QyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQztHQUNqRCxHQUFHLEVBQUUsSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7R0FDdEMsQ0FBQyxDQUFDOzs7RUFHSCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDO0dBQ2pFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO0dBQ2hDLENBQUMsQ0FBQztFQUNILElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FB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LEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDO0VBQy9CQSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDOztFQUU1QkEsSUFBSSxLQUFLLEdBQUcsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQ3pDQSxJQUFJLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDeENBLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQzs7RUFFM0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0VBQ3BDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOztFQUVyQyxLQUFLQSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUU7RUFDN0I7R0FDQyxLQUFLQSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7R0FDM0I7SUFDQ0EsSUFBSSxNQUFNLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzs7SUFHdEMsS0FBSyxDQUFDLEdBQUcsQ0FBQztLQUNULE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7S0FDMUIsTUFBTSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDckMsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOztJQUVYLEtBQUssQ0FBQyxHQUFHLENBQUM7S0FDVCxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQzFCLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDdEMsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUMxQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOztJQUVYQSxJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JDQSxJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JDQSxJQUFJLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDakVBLElBQUksUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNqRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDVixRQUFRLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztLQUN2QixRQUFRLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztLQUN2QixRQUFRLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztLQUN2QixRQUFRLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztLQUN2Qjs7O0lBR0QsR0FBRyxDQUFDLEtBQUssQ0FBQztJQUNWO0tBQ0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDaEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDaEQ7O0lBRUQ7S0FDQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNsRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs7S0FFbEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDbEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDbEQ7SUFDRDs7O0dBR0RBLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0dBQzdDQSxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUM3QyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDVixNQUFNLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztJ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QUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0dBQy9COztFQUVELE9BQUEsSUFBSSxDQUFDLEtBQUssQ0FBQSxDQUFDLEdBQUcsTUFBQSxDQUFDLEtBQUEsSUFBTyxDQUFDLEtBQUssQ0FBQyxDQUFDOzs7O0VBSTlCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDOzs7Ozs7O0VBTy9DLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDM0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7O0VBRXZELElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ2pELElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1VBQUE7RUFDdEQsQ0FBQTs7Q0FFRCx1QkFBQSxnQkFBZ0IsOEJBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0NBQzNCOzs7RUFDQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7O0VBRXhCQyxJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0VBQzVDQSxJQUFJLE9BQU8sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7RUFDbkRBLElBQUksS0FBSyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQzs7RUFFL0MsSUFBSUEsSUFBSSxLQUFLLElBQUksRUFBRTtFQUNuQjtHQUNDRCxNQUFJLENBQUMsYUFBYSxDQUFDO0lBQ2xCLElBQUksRUFBRSxTQUFTLENBQUMsS0FBSztJQUNyQixPQUFPLEVBQUUsS0FBSztJQUNkLElBQUksRUFBRTtLQUNMLElBQUksRUFBRSxJQUFJO0tBQ1YsT0FBTyxFQUFFLE9BQU87S0FDaEIsS0FBSyxFQUFFLEtBQUs7S0FDWjtJQUNELENBQUMsQ0FBQztHQUNIOztFQUVELEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUM7R0FDdEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztHQUM1Qzs7RUFFRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztFQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztFQUN2QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztFQUNuQixDQUFBOztDQUVELHVCQUFBLFNBQVMsdUJBQUMsQ0FBQztDQUNYO0VBQ0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNyQyxJQUFJLENBQUMsYUFBYSxDQUFDO0dBQ2xCLElBQUksRUFBRSxXQUFXO0dBQ2pCLE9BQU8sRUFBRSxLQUFLO0dBQ2QsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFO0dBQ1YsQ0FBQyxDQUFDO0VBQ0gsQ0FBQTs7Q0FFRCx1QkFBQSxTQUFTLHVCQUFDLENBQUMsQ0FBQztFQUNYLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUM7R0FDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0dBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQzFCO0VBQ0QsQ0FBQTs7Q0FFRCx1QkFBQSxPQUFPO0NBQ1A7RUFDQyxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO0dBQ25ELE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQztHQUM5QjtPQUNJO0dBQ0osTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksY0FBYyxDQUFDO0dBQ3pDO0VBQ0QsQ0FBQTs7O0VBOUp5QixLQUFLLENBQUMsUUErSmhDLEdBQUE7O0FBRUQsU0FBZSxJQUFJLFlBQVksRUFBRSxDQUFDOzs7OyJ9
