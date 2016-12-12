var SecretHitler = (function () {
'use strict';

var AM = {
	manifest: {
		models: {
			table: 'static/model/table.dae',
			nameplate: 'static/model/nameplate.dae',
			tophat: 'static/model/tophat.gltf',
			visorcap: 'static/model/visor_cap.gltf',
			dummy: 'static/model/dummy.gltf'
		},
		textures: {
			board_large: 'static/img/board-large-baked.png',
			board_med: 'static/img/board-medium-baked.png',
			board_small: 'static/img/board-small-baked.png',
			cards: 'static/img/cards.png',
			reset: 'static/img/bomb.png'
		}
	},
	cache: {}
};

var GameState = function GameState(id)
{
	this.id = id;

	this.state = 'idle';

	this.turnOrder = []; // array of userIds
	this.president = 0; // userId
	this.chancellor = 0; // userId
	this.lastPresident = 0; // userId
	this.lastChancellor = 0; // userId

	this.liberalPolicies = 0;
	this.fascistPolicies = 0;
	this.deckFascist = 11;
	this.deckLiberal = 6;
	this.discardFascist = 0;
	this.discardLiberal = 0;
	this.specialElection = false;
	this.failedVotes = 0;
};

GameState.prototype.nextPresident = function nextPresident ()
{
	var turn = 0;

	// this is the first round, choose president randomly
	if(!this.president)
		{ turn = Math.floor(Math.random() * this.turnOrder.length); }

	// this is a special election, so count from president emeritus
	else if(this.specialElection)
		{ turn = this.players[this.lastPresident].turnOrder; }

	// a regular election: power passes to the left
	else
		{ turn = this.players[this.president].turnOrder; }

	return this.turnOrder[ (turn+1)%this.turnOrder.length ];
};

GameState.prototype.drawPolicies = function drawPolicies ()
{

};

var Player = function Player(userId, displayName, isModerator)
{
	if ( userId === void 0 ) userId = 0;
	if ( displayName === void 0 ) displayName = 'dummy';
	if ( isModerator === void 0 ) isModerator = false;

	this.userId = userId;
	this.displayName = displayName;
	this.isModerator = false;
	this.turnOrder = -1; // unknown until game starts

	this.role = 'unassigned'; // one of 'unassigned', 'hitler', 'fascist', 'liberal'
	this.state = 'normal'; // one of 'normal', 'investigated', 'dead'
};

var prototypeAccessors = { party: {} };

prototypeAccessors.party.get = function (){
	if(this.role === 'hitler') { return 'fascist'; }
	else { return this.role; }
};

Object.defineProperties( Player.prototype, prototypeAccessors );

var PlayerManager = function PlayerManager()
{
	this.localUser = null;
	this.players = [];
};

PlayerManager.prototype.acquireLocalUser = function acquireLocalUser ()
{
		var this$1 = this;

	if(window.altspace && altspace.inClient)
	{
		this.localUser = {};

		// get the local user id and name
		altspace.getUser().then((function (user) {
			Object.assign(this$1.localUser, user);
		}).bind(this));

		// get the user tracking skeleton
		altspace.getThreeJSTrackingSkeleton().then((function (ts) {
			this$1.localUser.skeleton = ts;
			SH.add(ts);
		}).bind(this));
	}
	else
	{
		// fake user data
		this.localUser = {
			userId: Math.floor(Math.random() * 1000000),
			isModerator: false
		};
		this.localUser.displayName = 'Web User '+this.localUser.userId;
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

var PresidentHat = (function (superclass) {
	function PresidentHat(){
		var this$1 = this;

		superclass.call(this);
		this.model = AM.cache.models.tophat;
		this.model.position.set(0,0,0);
		this.model.rotation.set(-Math.PI/2, 0, 0);
		this.add(this.model);

		SH.addEventListener('update_state', (function (e) {
			if(e.data.game.state === 'setup') { this$1.idle(); }
		}).bind(this));
	}

	if ( superclass ) PresidentHat.__proto__ = superclass;
	PresidentHat.prototype = Object.create( superclass && superclass.prototype );
	PresidentHat.prototype.constructor = PresidentHat;

	PresidentHat.prototype.idle = function idle (){
		this.position.set(0.75, 0, 0);
		this.rotation.set(0, Math.PI/2, 0);
		SH.idleRoot.add(this);
	};

	return PresidentHat;
}(THREE.Object3D));

var ChancellorHat = (function (superclass) {
	function ChancellorHat(){
		var this$1 = this;

		superclass.call(this);
		this.model = AM.cache.models.visorcap;
		this.model.position.set(0,0.04,0);
		this.model.rotation.set(-Math.PI/2, 0, 0);
		this.add(this.model);

		SH.addEventListener('update_state', (function (e) {
			if(e.data.game.state === 'setup') { this$1.idle(); }
		}).bind(this));
	}

	if ( superclass ) ChancellorHat.__proto__ = superclass;
	ChancellorHat.prototype = Object.create( superclass && superclass.prototype );
	ChancellorHat.prototype.constructor = ChancellorHat;

	ChancellorHat.prototype.idle = function idle (){
		this.position.set(-0.75, 0, 0);
		this.rotation.set(0, -Math.PI/2, 0);
		SH.idleRoot.add(this);
	};

	return ChancellorHat;
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

function parseCSV(str){
	if(!str) { return []; }
	else { return str.split(','); }
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

		// add table asset
		this.model = AM.cache.models.table.children[0];
		this.model.rotation.set(-Math.PI/2, 0, 0);
		this.model.scale.setScalar(1.25);
		this.add(this.model);

		// set the default material
		this.model.material.map = this.textures[0];

		// position table
		this.position.set(0, 1.0, 0);

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
			var ids = parseCSV(turnOrder);
			if(ids.length >= 9)
				{ this.model.material.map = this.textures[2]; }
			else if(ids.length >= 7)
				{ this.model.material.map = this.textures[1]; }
			else
				{ this.model.material.map = this.textures[0]; }
		}
	};

	return GameTable;
}(THREE.Object3D));

var Nameplate = (function (superclass) {
	function Nameplate(seat)
	{
		superclass.call(this);

		this.seat = seat;

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
		var playerIds = parseCSV(SH.game.turnOrder);
		if(!this.seat.owner && SH.game.state === 'setup')
			{ this.requestJoin(); }
		else if(this.seat.owner === SH.localUser.id)
			{ this.requestLeave(); }
		else if(this.seat.owner && playerIds.includes(SH.localUser.id))
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

var CascadingPromise = function CascadingPromise(prereqPromise, execFn, cleanupFn)
{
    // set up state information
    this.state = 'pending';
    this.prereqPromise = prereqPromise || Promise.resolve();
    this.execFn = execFn;
    this.cleanupFn = cleanupFn;

    // track callbacks
    this._resolveCallbacks = [];
    this._rejectCallbacks = [];
    this._execType = null;
    this._execResult = [];

    // bind events
    var cb = this._prereqSettled.bind(this);
    this.prereqPromise.then(cb, cb);
};

CascadingPromise.prototype._prereqSettled = function _prereqSettled (){
    if(this.state === 'pending'){
        this.state = 'running';
        function settle(type){
            return function(){
                    var args = [], len = arguments.length;
                    while ( len-- ) args[ len ] = arguments[ len ];

                this._execSettled(type, args);
            }
        }

        this.execFn(
            settle('resolve').bind(this),
            settle('reject').bind(this)
        );
    }
    else if(this.state === 'cancelled'){
        this.state = 'settled';
        this._resolveCallbacks.forEach(function (cb) { return cb(); });
    }
};

CascadingPromise.prototype._execSettled = function _execSettled (type, result){
    if(this.state === 'running'){
        this._execType = type;
        this._execResult = result;
        this.state = 'cleaningup';
        this.cleanupFn(this._cleanupDone.bind(this));
    }
};

CascadingPromise.prototype._cleanupDone = function _cleanupDone (){
        var this$1 = this;

    if(this.state === 'cleaningup'){
        this.state = 'settled';
        if(this._execType === 'resolve'){
            this._resolveCallbacks.forEach(
                (function (cb) { return cb.apply(void 0, this$1._execResult); }).bind(this)
            );
        }
        else {
            this._rejectCallbacks.forEach(
                (function (cb) { return cb.apply(void 0, this$1._execResult); }).bind(this)
            );
        }
    }
};

CascadingPromise.prototype.cancel = function cancel (){
    if(this.state === 'running'){
        this.state = 'cleaningup';
        this.cleanupFn(this._cleanupDone.bind(this));
    }
    else if(this.state === 'pending'){
        this.state = 'cancelled';
    }
};

CascadingPromise.prototype.then = function then (doneCb, errCb)
{
    if(this.state === 'settled')
    {
        if(this._execType === 'resolve'){
            doneCb.apply(void 0, this._execResult);
        }
        else {
            errCb.apply(void 0, this._execResult);
        }
    }
    else {
        this._resolveCallbacks.push(doneCb);
        if(errCb)
            { this._rejectCallbacks.push(errCb); }
    }

    return this;
};

CascadingPromise.prototype.catch = function catch$1 (cb){
    if(this.state === 'settled'){
        if(this._execType === 'reject')
            { cb.apply(void 0, this._execResult); }
    }
    else
        { this._rejectCallbacks.push(cb); }

    return this;
};

var Ballot = (function (superclass) {
    function Ballot(seat)
    {
        superclass.call(this);
        this.seat = seat;
        this.questions = {};
        this.lastAsked = null;

        this._yesClickHandler = null;
        this._noClickHandler = null;

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

        var vips = parseCSV(game.votesInProgress);
        var votesFinished = parseCSV(SH.game.votesInProgress).filter(
            function (e) { return !vips.includes(e); }
        );

        vips.forEach(function (vId) {
            var vs = parseCSV(votes[vId].yesVoters+','+votes[vId].noVoters);
            var nv = parseCSV(votes[vId].nonVoters);

            var asked = self.questions[vId];
            if(!asked && !nv.includes(self.seat.owner) && !vs.includes(self.seat.owner))
            {
                var questionText;
                if(votes[vId].type === 'elect'){
                    questionText = players[votes[vId].target1].displayName
                        + '\nfor president and\n'
                        + players[votes[vId].target2].displayName
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

                self.askQuestion(questionText, vId)
                .then(function (answer) {
                    SH.socket.emit('vote', vId, SH.localUser.id, answer);
                })
                .catch(function () { return console.log('Vote scrubbed:', vId); });
            }
            else if(vs.includes(self.seat.owner))
            {
                if(self.questions[vId])
                    { self.questions[vId].cancel(); }
            }
        });

        votesFinished.forEach(function (vId) {
            if(self.questions[vId])
                { self.questions[vId].cancel(); }
        });
    };

    Ballot.prototype.askQuestion = function askQuestion (qText, id)
    {
        var this$1 = this;

        var self = this;
        var newQ = new CascadingPromise(self.questions[self.lastAsked],
            function (resolve, reject) {

                // make sure the answer is still relevant
                var latestVotes = parseCSV(SH.game.votesInProgress);
                if(!/^local/.test(id) && !latestVotes.includes(id)){
                    reject();
                    return;
                }

                // hook up q/a cards
                self.question.material.map = generateQuestion(qText, this$1.question.material.map);
                self.jaCard.addEventListener('cursorup', respond(true));
                self.neinCard.addEventListener('cursorup', respond(false));

                // show the ballot
                self.question.visible = true;
                self.jaCard.show();
                self.neinCard.show();

                function respond(answer){
                    function handler()
                    {
                        // make sure only the owner of the ballot is answering
                        if(self.seat.owner !== SH.localUser.id) { return; }

                        // make sure the answer still matters
                        var latestVotes = parseCSV(SH.game.votesInProgress);
                        if(!/^local/.test(id) && !latestVotes.includes(id))
                            { reject(); }
                        else
                            { resolve(answer); }
                    }

                    if(answer) { self._yesClickHandler = handler; }
                    else { self._noClickHandler = handler; }
                    return handler;
                }
            },
            function (done) {
                delete self.questions[id];
                if(self.lastAsked === id)
                    { self.lastAsked = null; }

                // hide the question
                self.jaCard.hide();
                self.neinCard.hide();
                self.question.visible = false;
                self.jaCard.removeEventListener('cursorup', self._yesClickHandler);
                self.neinCard.removeEventListener('cursorup', self._noClickHandler);
                done();
            }
        );

        // add question to queue, remove when done
        self.questions[id] = newQ;
        self.lastAsked = id;
        var splice = function () {
            delete self.questions[id];
            if(self.lastAsked === id)
                { self.lastAsked = null; }
        };
        newQ.then(splice, splice);

        return newQ;
    };

    return Ballot;
}(THREE.Object3D));

var Seat = (function (superclass) {
    function Seat(seatNum)
    {
        superclass.call(this);

        this.seatNum = seatNum;
        this.owner = 0;

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

        this.nameplate = new Nameplate(this);
        this.nameplate.position.set(0, -0.635, 0.22);
        this.add(this.nameplate);

        this.ballot = new Ballot(this);
        this.ballot.position.set(0, -0.3, 0.25);
        //this.ballot.rotateY(0.1);
        this.add(this.ballot);

		SH.addEventListener('update_turnOrder', this.updateOwnership.bind(this));
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

		var ids = parseCSV(game.turnOrder);

		if( !this.owner )
		{
			// check if a player has joined at this seat
			for(var i in ids){
				if(players[ids[i]].seatNum == this$1.seatNum){
					this$1.owner = ids[i];
					this$1.nameplate.updateText(players[ids[i]].displayName);
					return;
				}
			}
		}

		if( !ids.includes(this.owner) )
		{
			this.owner = 0;
			if(game.state === 'setup'){
				this.nameplate.updateText('<Join>');
			}
		}
	};

    return Seat;
}(THREE.Object3D));

var SecretHitler = (function (superclass) {
	function SecretHitler()
	{
		var this$1 = this;

		superclass.call(this);
		this.assets = AM.manifest;
		this.verticalAlign = 'bottom';
		this.needsSkeleton = true;

		// polyfill getUser function
		if(!altspace.inClient){
			altspace.getUser = function () {
				var id, re = /[?&]userId=(\d+)/.exec(window.location.search);
				if(re)
					{ id = re[1]; }
				else
					{ id = Math.floor(Math.random() * 10000000); }

				altspace._localUser = {
					userId: id,
					displayName: 'Guest'+id,
					isModerator: false
				};
				console.log('Masquerading as', altspace._localUser);
				return Promise.resolve(altspace._localUser);
			};
		}

		// get local user
		altspace.getUser().then((function (user) {
			this$1.localUser = {
				id: user.userId.toString(),
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
		this.resetButton.addEventListener('cursorup', this.reset.bind(this));
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

		// add avatar for scale
		assets.models.dummy.position.set(0, 0, 1.1);
		assets.models.dummy.rotateZ(Math.PI);
		this.add(assets.models.dummy);

		this.socket.on('update', this.updateFromServer.bind(this));
		var ref;
	};

	SecretHitler.prototype.updateFromServer = function updateFromServer (gd, pd, vd)
	{
		var this$1 = this;

		console.log(gd, pd, vd);

		var game = Object.assign({}, this.game, gd);
		var players = Object.assign({}, this.players, pd);
		var votes = Object.assign({}, this.votes, vd);

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

		this.game = game;
		this.players = players;
		this.votes = votes;
	};

	SecretHitler.prototype.reset = function reset (e){
		console.log('requesting reset');
		this.socket.emit('reset');
	};

	return SecretHitler;
}(THREE.Object3D));

var SH = new SecretHitler();

return SH;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvYXNzZXRtYW5hZ2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9nYW1lb2JqZWN0cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVybWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L3V0aWxzLmpzIiwiLi4vLi4vc3JjL2NsaWVudC90YWJsZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jYXNjYWRpbmdwcm9taXNlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3QuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlYXQuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlY3JldGhpdGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0bWFuaWZlc3Q6IHtcblx0XHRtb2RlbHM6IHtcblx0XHRcdHRhYmxlOiAnc3RhdGljL21vZGVsL3RhYmxlLmRhZScsXG5cdFx0XHRuYW1lcGxhdGU6ICdzdGF0aWMvbW9kZWwvbmFtZXBsYXRlLmRhZScsXG5cdFx0XHR0b3BoYXQ6ICdzdGF0aWMvbW9kZWwvdG9waGF0LmdsdGYnLFxuXHRcdFx0dmlzb3JjYXA6ICdzdGF0aWMvbW9kZWwvdmlzb3JfY2FwLmdsdGYnLFxuXHRcdFx0ZHVtbXk6ICdzdGF0aWMvbW9kZWwvZHVtbXkuZ2x0Zidcblx0XHR9LFxuXHRcdHRleHR1cmVzOiB7XG5cdFx0XHRib2FyZF9sYXJnZTogJ3N0YXRpYy9pbWcvYm9hcmQtbGFyZ2UtYmFrZWQucG5nJyxcblx0XHRcdGJvYXJkX21lZDogJ3N0YXRpYy9pbWcvYm9hcmQtbWVkaXVtLWJha2VkLnBuZycsXG5cdFx0XHRib2FyZF9zbWFsbDogJ3N0YXRpYy9pbWcvYm9hcmQtc21hbGwtYmFrZWQucG5nJyxcblx0XHRcdGNhcmRzOiAnc3RhdGljL2ltZy9jYXJkcy5wbmcnLFxuXHRcdFx0cmVzZXQ6ICdzdGF0aWMvaW1nL2JvbWIucG5nJ1xuXHRcdH1cblx0fSxcblx0Y2FjaGU6IHt9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmNsYXNzIEdhbWVTdGF0ZVxue1xuXHRjb25zdHJ1Y3RvcihpZClcblx0e1xuXHRcdHRoaXMuaWQgPSBpZDtcblxuXHRcdHRoaXMuc3RhdGUgPSAnaWRsZSc7XG5cblx0XHR0aGlzLnR1cm5PcmRlciA9IFtdOyAvLyBhcnJheSBvZiB1c2VySWRzXG5cdFx0dGhpcy5wcmVzaWRlbnQgPSAwOyAvLyB1c2VySWRcblx0XHR0aGlzLmNoYW5jZWxsb3IgPSAwOyAvLyB1c2VySWRcblx0XHR0aGlzLmxhc3RQcmVzaWRlbnQgPSAwOyAvLyB1c2VySWRcblx0XHR0aGlzLmxhc3RDaGFuY2VsbG9yID0gMDsgLy8gdXNlcklkXG5cblx0XHR0aGlzLmxpYmVyYWxQb2xpY2llcyA9IDA7XG5cdFx0dGhpcy5mYXNjaXN0UG9saWNpZXMgPSAwO1xuXHRcdHRoaXMuZGVja0Zhc2Npc3QgPSAxMTtcblx0XHR0aGlzLmRlY2tMaWJlcmFsID0gNjtcblx0XHR0aGlzLmRpc2NhcmRGYXNjaXN0ID0gMDtcblx0XHR0aGlzLmRpc2NhcmRMaWJlcmFsID0gMDtcblx0XHR0aGlzLnNwZWNpYWxFbGVjdGlvbiA9IGZhbHNlO1xuXHRcdHRoaXMuZmFpbGVkVm90ZXMgPSAwO1xuXHR9XG5cblx0bmV4dFByZXNpZGVudCgpXG5cdHtcblx0XHRsZXQgdHVybiA9IDA7XG5cblx0XHQvLyB0aGlzIGlzIHRoZSBmaXJzdCByb3VuZCwgY2hvb3NlIHByZXNpZGVudCByYW5kb21seVxuXHRcdGlmKCF0aGlzLnByZXNpZGVudClcblx0XHRcdHR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGlzLnR1cm5PcmRlci5sZW5ndGgpO1xuXG5cdFx0Ly8gdGhpcyBpcyBhIHNwZWNpYWwgZWxlY3Rpb24sIHNvIGNvdW50IGZyb20gcHJlc2lkZW50IGVtZXJpdHVzXG5cdFx0ZWxzZSBpZih0aGlzLnNwZWNpYWxFbGVjdGlvbilcblx0XHRcdHR1cm4gPSB0aGlzLnBsYXllcnNbdGhpcy5sYXN0UHJlc2lkZW50XS50dXJuT3JkZXI7XG5cblx0XHQvLyBhIHJlZ3VsYXIgZWxlY3Rpb246IHBvd2VyIHBhc3NlcyB0byB0aGUgbGVmdFxuXHRcdGVsc2Vcblx0XHRcdHR1cm4gPSB0aGlzLnBsYXllcnNbdGhpcy5wcmVzaWRlbnRdLnR1cm5PcmRlcjtcblxuXHRcdHJldHVybiB0aGlzLnR1cm5PcmRlclsgKHR1cm4rMSkldGhpcy50dXJuT3JkZXIubGVuZ3RoIF07XG5cdH1cblxuXHRkcmF3UG9saWNpZXMoKVxuXHR7XG5cblx0fVxufVxuXG5jbGFzcyBQbGF5ZXJcbntcblx0Y29uc3RydWN0b3IodXNlcklkID0gMCwgZGlzcGxheU5hbWUgPSAnZHVtbXknLCBpc01vZGVyYXRvciA9IGZhbHNlKVxuXHR7XG5cdFx0dGhpcy51c2VySWQgPSB1c2VySWQ7XG5cdFx0dGhpcy5kaXNwbGF5TmFtZSA9IGRpc3BsYXlOYW1lO1xuXHRcdHRoaXMuaXNNb2RlcmF0b3IgPSBmYWxzZTtcblx0XHR0aGlzLnR1cm5PcmRlciA9IC0xOyAvLyB1bmtub3duIHVudGlsIGdhbWUgc3RhcnRzXG5cblx0XHR0aGlzLnJvbGUgPSAndW5hc3NpZ25lZCc7IC8vIG9uZSBvZiAndW5hc3NpZ25lZCcsICdoaXRsZXInLCAnZmFzY2lzdCcsICdsaWJlcmFsJ1xuXHRcdHRoaXMuc3RhdGUgPSAnbm9ybWFsJzsgLy8gb25lIG9mICdub3JtYWwnLCAnaW52ZXN0aWdhdGVkJywgJ2RlYWQnXG5cdH1cblxuXHRnZXQgcGFydHkoKXtcblx0XHRpZih0aGlzLnJvbGUgPT09ICdoaXRsZXInKSByZXR1cm4gJ2Zhc2Npc3QnO1xuXHRcdGVsc2UgcmV0dXJuIHRoaXMucm9sZTtcblx0fVxufVxuXG5leHBvcnQgeyBHYW1lU3RhdGUsIFBsYXllciB9O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgeyBQbGF5ZXIgfSBmcm9tICcuL2dhbWVvYmplY3RzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxheWVyTWFuYWdlclxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHR0aGlzLmxvY2FsVXNlciA9IG51bGw7XG5cdFx0dGhpcy5wbGF5ZXJzID0gW107XG5cdH1cblxuXHRhY3F1aXJlTG9jYWxVc2VyKClcblx0e1xuXHRcdGlmKHdpbmRvdy5hbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudClcblx0XHR7XG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHt9O1xuXG5cdFx0XHQvLyBnZXQgdGhlIGxvY2FsIHVzZXIgaWQgYW5kIG5hbWVcblx0XHRcdGFsdHNwYWNlLmdldFVzZXIoKS50aGVuKCh1c2VyID0+IHtcblx0XHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLmxvY2FsVXNlciwgdXNlcik7XG5cdFx0XHR9KS5iaW5kKHRoaXMpKTtcblxuXHRcdFx0Ly8gZ2V0IHRoZSB1c2VyIHRyYWNraW5nIHNrZWxldG9uXG5cdFx0XHRhbHRzcGFjZS5nZXRUaHJlZUpTVHJhY2tpbmdTa2VsZXRvbigpLnRoZW4oKHRzID0+IHtcblx0XHRcdFx0dGhpcy5sb2NhbFVzZXIuc2tlbGV0b24gPSB0cztcblx0XHRcdFx0U0guYWRkKHRzKTtcblx0XHRcdH0pLmJpbmQodGhpcykpO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0Ly8gZmFrZSB1c2VyIGRhdGFcblx0XHRcdHRoaXMubG9jYWxVc2VyID0ge1xuXHRcdFx0XHR1c2VySWQ6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDApLFxuXHRcdFx0XHRpc01vZGVyYXRvcjogZmFsc2Vcblx0XHRcdH07XG5cdFx0XHR0aGlzLmxvY2FsVXNlci5kaXNwbGF5TmFtZSA9ICdXZWIgVXNlciAnK3RoaXMubG9jYWxVc2VyLnVzZXJJZDtcblx0XHR9XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBQTSBmcm9tICcuL3BsYXllcm1hbmFnZXInO1xuXG5jbGFzcyBCZWhhdmlvclxue1xuXHRjb25zdHJ1Y3Rvcih0eXBlKXtcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xuXHR9XG5cblx0YXdha2Uob2JqKXtcblx0XHR0aGlzLm9iamVjdDNEID0gb2JqO1xuXHR9XG5cblx0c3RhcnQoKXsgfVxuXG5cdHVwZGF0ZShkVCl7IH1cblxuXHRkaXNwb3NlKCl7IH1cbn1cblxuY2xhc3MgQlN5bmMgZXh0ZW5kcyBCZWhhdmlvclxue1xuXHRjb25zdHJ1Y3RvcihldmVudE5hbWUpXG5cdHtcblx0XHRzdXBlcignQlN5bmMnKTtcblx0XHR0aGlzLl9zID0gU0guc29ja2V0O1xuXG5cdFx0Ly8gbGlzdGVuIGZvciB1cGRhdGUgZXZlbnRzXG5cdFx0dGhpcy5ob29rID0gdGhpcy5fcy5vbihldmVudE5hbWUsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLmV2ZW50TmFtZSA9IGV2ZW50TmFtZTtcblx0XHR0aGlzLm93bmVyID0gJ3Vub3duZWQnO1xuXHR9XG5cblx0dXBkYXRlRnJvbVNlcnZlcihkYXRhKVxuXHR7XG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XG5cdFx0dGhpcy5vYmplY3QzRC5yb3RhdGlvbi5mcm9tQXJyYXkoZGF0YSwgMyk7XG5cdH1cblxuXHR0YWtlT3duZXJzaGlwKClcblx0e1xuXHRcdGlmKFBNLmxvY2FsVXNlciAmJiBQTS5sb2NhbFVzZXIudXNlcklkKVxuXHRcdFx0dGhpcy5vd25lciA9IFBNLmxvY2FsVXNlci51c2VySWQ7XG5cdH1cblxuXHR1cGRhdGUoZFQpXG5cdHtcblx0XHRpZihQTS5sb2NhbFVzZXIgJiYgUE0ubG9jYWxVc2VyLnNrZWxldG9uICYmIFBNLmxvY2FsVXNlci51c2VySWQgPT09IHRoaXMub3duZXIpXG5cdFx0e1xuXHRcdFx0bGV0IGogPSBQTS5sb2NhbFVzZXIuc2tlbGV0b24uZ2V0Sm9pbnQoJ0hlYWQnKTtcblx0XHRcdHRoaXMuX3MuZW1pdCh0aGlzLmV2ZW50TmFtZSwgWy4uLmoucG9zaXRpb24udG9BcnJheSgpLCAuLi5qLnJvdGF0aW9uLnRvQXJyYXkoKV0pO1xuXHRcdH1cblx0fVxuXG59XG5cbmV4cG9ydCB7IEJlaGF2aW9yLCBCU3luYyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgeyBCZWhhdmlvciB9IGZyb20gJy4vYmVoYXZpb3InO1xuXG5jbGFzcyBBbmltYXRlIGV4dGVuZHMgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IoLy97cGFyZW50LCBwb3MsIHF1YXQsIHNjYWxlLCBtYXRyaXgsIGR1cmF0aW9uLCBjYWxsYmFja31cblx0XHR7cGFyZW50PW51bGwsIHBvcz1udWxsLCBxdWF0PW51bGwsIHNjYWxlPW51bGwsIG1hdHJpeD1udWxsLCBkdXJhdGlvbj02MDAsIGNhbGxiYWNrPSgpPT57fX0pXG5cdHtcblx0XHRzdXBlcignQW5pbWF0ZScpO1xuXHRcdFxuXHRcdGlmKG1hdHJpeClcblx0XHR7XG5cdFx0XHQvLyBleHRyYWN0IHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlIGZyb20gbWF0cml4XG5cdFx0XHRwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXHRcdFx0cXVhdCA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cdFx0XHRzY2FsZSA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cdFx0XHRtYXRyaXguZGVjb21wb3NlKHBvcywgcXVhdCwgc2NhbGUpO1xuXHRcdH1cblxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywge3BhcmVudCwgcG9zLCBxdWF0LCBzY2FsZSwgZHVyYXRpb24sIGNhbGxiYWNrfSk7XG5cdH1cblxuXHRhd2FrZShvYmopXG5cdHtcblx0XHRzdXBlci5hd2FrZShvYmopO1xuXG5cdFx0Ly8gc2h1ZmZsZSBoaWVyYXJjaHksIGJ1dCBrZWVwIHdvcmxkIHRyYW5zZm9ybSB0aGUgc2FtZVxuXHRcdGlmKHRoaXMucGFyZW50ICYmIHRoaXMucGFyZW50ICE9PSBvYmoucGFyZW50KVxuXHRcdHtcblx0XHRcdG9iai5hcHBseU1hdHJpeChvYmoucGFyZW50Lm1hdHJpeFdvcmxkKTtcblx0XHRcdGxldCBtYXQgPSBuZXcgVEhSRUUuTWF0cml4NCgpLmdldEludmVyc2UodGhpcy5wYXJlbnQubWF0cml4V29ybGQpO1xuXHRcdFx0b2JqLmFwcGx5TWF0cml4KG1hdCk7XG5cblx0XHRcdHRoaXMucGFyZW50LmFkZChvYmopO1xuXHRcdH1cblxuXHRcdC8vIHJlYWQgaW5pdGlhbCBwb3NpdGlvbnNcblx0XHR0aGlzLmluaXRpYWxQb3MgPSBvYmoucG9zaXRpb24uY2xvbmUoKTtcblx0XHR0aGlzLmluaXRpYWxRdWF0ID0gb2JqLnF1YXRlcm5pb24uY2xvbmUoKTtcblx0XHR0aGlzLmluaXRpYWxTY2FsZSA9IG9iai5zY2FsZS5jbG9uZSgpO1xuXHRcdHRoaXMuc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblx0fVxuXG5cdHVwZGF0ZSgpXG5cdHtcblx0XHQvLyBjb21wdXRlIGVhc2Utb3V0IGJhc2VkIG9uIGR1cmF0aW9uXG5cdFx0bGV0IG1peCA9IChEYXRlLm5vdygpLXRoaXMuc3RhcnRUaW1lKSAvIHRoaXMuZHVyYXRpb247XG5cdFx0bGV0IGVhc2UgPSBUV0VFTiA/IFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0IDogbiA9PiBuKigyLW4pO1xuXHRcdG1peCA9IG1peCA8IDEgPyBlYXNlKG1peCkgOiAxO1xuXG5cdFx0Ly8gYW5pbWF0ZSBwb3NpdGlvbiBpZiByZXF1ZXN0ZWRcblx0XHRpZiggdGhpcy5wb3MgKXtcblx0XHRcdHRoaXMub2JqZWN0M0QucG9zaXRpb24ubGVycFZlY3RvcnModGhpcy5pbml0aWFsUG9zLCB0aGlzLnBvcywgbWl4KTtcblx0XHR9XG5cblx0XHQvLyBhbmltYXRlIHJvdGF0aW9uIGlmIHJlcXVlc3RlZFxuXHRcdGlmKCB0aGlzLnF1YXQgKXtcblx0XHRcdFRIUkVFLlF1YXRlcm5pb24uc2xlcnAodGhpcy5pbml0aWFsUXVhdCwgdGhpcy5xdWF0LCB0aGlzLm9iamVjdDNELnF1YXRlcm5pb24sIG1peClcblx0XHR9XG5cblx0XHQvLyBhbmltYXRlIHNjYWxlIGlmIHJlcXVlc3RlZFxuXHRcdGlmKCB0aGlzLnNjYWxlICl7XG5cdFx0XHR0aGlzLm9iamVjdDNELnNjYWxlLmxlcnBWZWN0b3JzKHRoaXMuaW5pdGlhbFNjYWxlLCB0aGlzLnNjYWxlLCBtaXgpO1xuXHRcdH1cblxuXHRcdC8vIHRlcm1pbmF0ZSBhbmltYXRpb24gd2hlbiBkb25lXG5cdFx0aWYobWl4ID49IDEpe1xuXHRcdFx0dGhpcy5vYmplY3QzRC5yZW1vdmVCZWhhdmlvcih0aGlzKTtcblx0XHRcdHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLm9iamVjdDNEKTtcblx0XHR9XG5cdH1cbn1cblxuQW5pbWF0ZS5zdGFydCA9ICh0YXJnZXQsIG9wdHMpID0+XG57XG5cdGxldCBvbGRBbmltID0gdGFyZ2V0LmdldEJlaGF2aW9yQnlUeXBlKCdBbmltYXRlJyk7XG5cdGlmKG9sZEFuaW0pe1xuXHRcdG9sZEFuaW0uY29uc3RydWN0b3Iob3B0cyk7XG5cdFx0b2xkQW5pbS5hd2FrZSh0YXJnZXQpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHRhcmdldC5hZGRCZWhhdmlvciggbmV3IEFuaW1hdGUob3B0cykgKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBBbmltYXRlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5cbi8vIGVudW0gY29uc3RhbnRzXG5sZXQgVHlwZXMgPSBPYmplY3QuZnJlZXplKHtcblx0UE9MSUNZX0xJQkVSQUw6IDAsXG5cdFBPTElDWV9GQVNDSVNUOiAxLFxuXHRST0xFX0xJQkVSQUw6IDIsXG5cdFJPTEVfRkFTQ0lTVDogMyxcblx0Uk9MRV9ISVRMRVI6IDQsXG5cdFBBUlRZX0xJQkVSQUw6IDUsXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXG5cdEpBOiA3LFxuXHRORUlOOiA4LFxuXHRCTEFOSzogOSxcblx0Q1JFRElUUzogMTBcbn0pO1xuXG5mdW5jdGlvbiBkaW1zVG9VVih7c2lkZSwgbGVmdCwgcmlnaHQsIHRvcCwgYm90dG9tfSlcbntcblx0aWYoc2lkZSlcblx0XHRyZXR1cm4gW1tcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHRvcCwgbGVmdCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIGxlZnQpLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIodG9wLCByaWdodClcblx0XHRdLFtcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGJvdHRvbSwgbGVmdCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIHJpZ2h0KSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHRvcCwgcmlnaHQpXG5cdFx0XV07XG5cdGVsc2Vcblx0XHRyZXR1cm4gW1tcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIHRvcCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihsZWZ0LCBib3R0b20pLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIocmlnaHQsIHRvcClcblx0XHRdLFtcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIGJvdHRvbSksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihyaWdodCwgYm90dG9tKSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCB0b3ApXG5cdFx0XV07XG59XG5cbmZ1bmN0aW9uIGdldFVWcyh0eXBlKVxue1xuXHRsZXQgZGltcyA9IHtsZWZ0OiAwLCByaWdodDogMSwgYm90dG9tOiAwLCB0b3A6IDF9O1xuXG5cdHN3aXRjaCh0eXBlKVxuXHR7XG5cdGNhc2UgVHlwZXMuUE9MSUNZX0xJQkVSQUw6XG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjgzNCwgcmlnaHQ6IDAuOTk2LCB0b3A6IDAuNzU0LCBib3R0b206IDAuOTk3fTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5QT0xJQ1lfRkFTQ0lTVDpcblx0XHRkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuNjYsIHJpZ2h0OiAwLjgyMiwgdG9wOiAwLjc1NCwgYm90dG9tOiAwLjk5Nn07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUk9MRV9MSUJFUkFMOlxuXHRcdGRpbXMgPSB7bGVmdDogMC41MDUsIHJpZ2h0OiAwLjc0NiwgdG9wOiAwLjk5NiwgYm90dG9tOiAwLjY1fTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5ST0xFX0ZBU0NJU1Q6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjUwNSwgcmlnaHQ6IDAuNzQ2LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUk9MRV9ISVRMRVI6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjc1NCwgcmlnaHQ6IDAuOTk2LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUEFSVFlfTElCRVJBTDpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMjU1LCByaWdodDogMC40OTUsIHRvcDogMC45OTYsIGJvdHRvbTogMC42NX07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUEFSVFlfRkFTQ0lTVDpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMjU1LCByaWdodDogMC40OTUsIHRvcDogMC42NDUsIGJvdHRvbTogMC4zfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5KQTpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMDA1LCByaWdodDogMC4yNDQsIHRvcDogMC45OTIsIGJvdHRvbTogMC42NTN9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLk5FSU46XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjAwNiwgcmlnaHQ6IDAuMjQzLCB0b3A6IDAuNjQyLCBib3R0b206IDAuMzAyfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5DUkVESVRTOlxuXHRcdGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC4wMTUsIHJpZ2h0OiAwLjI3NiwgdG9wOiAwLjM5NywgYm90dG9tOiAwLjc2NX07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuQkxBTks6XG5cdGRlZmF1bHQ6XG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjAyMiwgcmlnaHQ6IC4wMjIrMC4yNDcsIHRvcDogMC4wMjEsIGJvdHRvbTogLjAyMSswLjM1NDN9O1xuXHRcdGJyZWFrO1xuXHR9XG5cblx0cmV0dXJuIGRpbXNUb1VWKGRpbXMpO1xufVxuXG5cbmNsYXNzIENhcmQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3Rvcih0eXBlID0gVHlwZXMuQkxBTkssIGRvdWJsZVNpZGVkID0gdHJ1ZSlcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyBjcmVhdGUgdGhlIGNhcmQgZmFjZXNcblx0XHRsZXQgZnJvbnRHZW8gPSBuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSguNzE1LCAxKTtcblx0XHRsZXQgYmFja0dlbyA9IGZyb250R2VvLmNsb25lKCk7XG5cdFx0bGV0IGNhcmRNYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogQXNzZXRNYW5hZ2VyLmNhY2hlLnRleHR1cmVzLmNhcmRzfSk7XG5cdFx0bGV0IGZyb250ID0gbmV3IFRIUkVFLk1lc2goZnJvbnRHZW8sIGNhcmRNYXQpO1xuXHRcdGxldCBiYWNrID0gbmV3IFRIUkVFLk1lc2goYmFja0dlbywgY2FyZE1hdCk7XG5cdFx0YmFjay5wb3NpdGlvbi5zZXQoMC4wMDEsIDAsIDApO1xuXHRcdGZyb250LnBvc2l0aW9uLnNldCgtMC4wMDEsIDAsIDApO1xuXHRcdGJhY2sucm90YXRlWShNYXRoLlBJKTtcblxuXHRcdC8vIHNldCB0aGUgZmFjZXMgdG8gdGhlIGNvcnJlY3QgcGFydCBvZiB0aGUgdGV4dHVyZVxuXHRcdGZyb250Lmdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnMgPSBbZ2V0VVZzKHR5cGUpXTtcblx0XHRiYWNrLmdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnMgPSBbZ2V0VVZzKCBkb3VibGVTaWRlZCA/IHR5cGUgOiBUeXBlcy5CTEFOSyApXTtcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjcpO1xuXHRcdHRoaXMuYWRkKGZyb250LCBiYWNrKTtcblx0fVxuXG5cdGhpZGUoKXtcblx0XHR0aGlzLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IGZhbHNlOyB9KTtcblx0fVxuXG5cdHNob3coKXtcblx0XHR0aGlzLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IHRydWU7IH0pO1xuXHR9XG59XG5cbmNsYXNzIEJsYW5rQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3RvcigpeyBzdXBlcigpOyB9XG59XG5cbmNsYXNzIENyZWRpdHNDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuQ1JFRElUUyk7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXG5cdFx0ZnVuY3Rpb24gc2V0VmlzaWJpbGl0eSh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSl7XG5cdFx0XHRpZihzdGF0ZSA9PT0gJ3NldHVwJylcblx0XHRcdFx0c2VsZi5jaGlsZHJlbi5mb3JFYWNoKG8gPT4geyBvLnZpc2libGUgPSB0cnVlOyB9KTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0c2VsZi5jaGlsZHJlbi5mb3JFYWNoKG8gPT4geyBvLnZpc2libGUgPSBmYWxzZTsgfSk7XG5cdFx0fVxuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgc2V0VmlzaWJpbGl0eSk7XG5cdH1cbn1cblxuY2xhc3MgTGliZXJhbFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfTElCRVJBTCwgZmFsc2UpO1xuXHR9XG5cdGdvVG9Qb3NpdGlvbihzcG90ID0gMClcblx0e1xuXHRcdHNwb3QgPSBNYXRoLm1heCgwLCBNYXRoLm1pbig0LCBzcG90KSk7XG5cdFx0bGV0IHMgPSBMaWJlcmFsUG9saWN5Q2FyZC5zcG90cztcblx0XHRBbmltYXRlLnN0YXJ0KHRoaXMsIHtwYXJlbnQ6IEFzc2V0TWFuYWdlci5yb290LCBwb3M6IHNbJ3Bvc18nK3Nwb3RdLCBxdWF0OiBzLnF1YXQsIHNjYWxlOiBzLnNjYWxlfSk7XG5cdH1cbn1cblxuTGliZXJhbFBvbGljeUNhcmQuc3BvdHMgPSB7XG5cdHBvc18wOiBuZXcgVEhSRUUuVmVjdG9yMygwLjUzMywgMC43NiwgLTAuMzM2KSxcblx0cG9zXzE6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMjYzLCAwLjc2LCAtMC4zMzYpLFxuXHRwb3NfMjogbmV3IFRIUkVFLlZlY3RvcjMoLS4wMDcsIDAuNzYsIC0wLjMzNiksXG5cdHBvc18zOiBuZXcgVEhSRUUuVmVjdG9yMygtLjI3OSwgMC43NiwgLTAuMzM2KSxcblx0cG9zXzQ6IG5ldyBUSFJFRS5WZWN0b3IzKC0uNTUyLCAwLjc2LCAtMC4zMzYpLFxuXHRxdWF0OiBuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAwLjcwNzEwNjc4MTE4NjU0NzUsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMCksXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjcsIDAuNywgMC43KVxufVxuXG5jbGFzcyBGYXNjaXN0UG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlBPTElDWV9GQVNDSVNULCBmYWxzZSk7XG5cdH1cblx0Z29Ub1Bvc2l0aW9uKHNwb3QgPSAwKVxuXHR7XG5cdFx0c3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDUsIHNwb3QpKTtcblx0XHRsZXQgcyA9IEZhc2Npc3RQb2xpY3lDYXJkLnNwb3RzO1xuXHRcdEFuaW1hdGUuc3RhcnQodGhpcywge3BhcmVudDogQXNzZXRNYW5hZ2VyLnJvb3QsIHBvczogc1sncG9zXycrc3BvdF0sIHF1YXQ6IHMucXVhdCwgc2NhbGU6IHMuc2NhbGV9KTtcblx0fVxufVxuXG5GYXNjaXN0UG9saWN5Q2FyZC5zcG90cyA9IHtcblx0cG9zXzA6IG5ldyBUSFJFRS5WZWN0b3IzKC0uNjg3LCAwLjc2LCAwLjM0MSksXG5cdHBvc18xOiBuZXcgVEhSRUUuVmVjdG9yMygtLjQxNywgMC43NiwgMC4zNDEpLFxuXHRwb3NfMjogbmV3IFRIUkVFLlZlY3RvcjMoLS4xNDYsIDAuNzYsIDAuMzQxKSxcblx0cG9zXzM6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMTI3LCAwLjc2LCAwLjM0MSksXG5cdHBvc180OiBuZXcgVEhSRUUuVmVjdG9yMygwLjQwMCwgMC43NiwgMC4zNDEpLFxuXHRwb3NfNTogbmV3IFRIUkVFLlZlY3RvcjMoMC42NzMsIDAuNzYsIDAuMzQxKSxcblx0cXVhdDogbmV3IFRIUkVFLlF1YXRlcm5pb24oLTAuNzA3MTA2NzgxMTg2NTQ3NSwgMCwgMCwgMC43MDcxMDY3ODExODY1NDc1KSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNywgMC43LCAwLjcpXG59XG5cbmNsYXNzIExpYmVyYWxSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfTElCRVJBTCwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIEZhc2Npc3RSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfRkFTQ0lTVCwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIEhpdGxlclJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9ISVRMRVIsIGZhbHNlKTtcblx0fVxufVxuXG5jbGFzcyBMaWJlcmFsUGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfTElCRVJBTCwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIEZhc2Npc3RQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9GQVNDSVNULCBmYWxzZSk7XG5cdH1cbn1cblxuY2xhc3MgSmFDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuSkEsIGZhbHNlKTtcblx0XHR0aGlzLmNoaWxkcmVuWzBdLnJvdGF0ZVooLU1hdGguUEkvMik7XG5cdFx0dGhpcy5jaGlsZHJlblsxXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xuXHR9XG59XG5cbmNsYXNzIE5laW5DYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuTkVJTiwgZmFsc2UpO1xuXHRcdHRoaXMuY2hpbGRyZW5bMF0ucm90YXRlWigtTWF0aC5QSS8yKTtcblx0XHR0aGlzLmNoaWxkcmVuWzFdLnJvdGF0ZVooLU1hdGguUEkvMik7XG5cdH1cbn1cblxuXG5leHBvcnQge1xuXHRDYXJkLCBUeXBlcywgQmxhbmtDYXJkLCBDcmVkaXRzQ2FyZCxcblx0TGliZXJhbFBvbGljeUNhcmQsIEZhc2Npc3RQb2xpY3lDYXJkLCBMaWJlcmFsUm9sZUNhcmQsIEZhc2Npc3RSb2xlQ2FyZCxcblx0SGl0bGVyUm9sZUNhcmQsIExpYmVyYWxQYXJ0eUNhcmQsIEZhc2Npc3RQYXJ0eUNhcmQsIEphQ2FyZCwgTmVpbkNhcmRcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5jbGFzcyBQcmVzaWRlbnRIYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50b3BoYXQ7XG5cdFx0dGhpcy5tb2RlbC5wb3NpdGlvbi5zZXQoMCwwLDApO1xuXHRcdHRoaXMubW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJLzIsIDAsIDApO1xuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgKChlKSA9PiB7XG5cdFx0XHRpZihlLmRhdGEuZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJykgdGhpcy5pZGxlKCk7XG5cdFx0fSkuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRpZGxlKCl7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMC43NSwgMCwgMCk7XG5cdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgTWF0aC5QSS8yLCAwKTtcblx0XHRTSC5pZGxlUm9vdC5hZGQodGhpcyk7XG5cdH1cbn07XG5cbmNsYXNzIENoYW5jZWxsb3JIYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy52aXNvcmNhcDtcblx0XHR0aGlzLm1vZGVsLnBvc2l0aW9uLnNldCgwLDAuMDQsMCk7XG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoKGUpID0+IHtcblx0XHRcdGlmKGUuZGF0YS5nYW1lLnN0YXRlID09PSAnc2V0dXAnKSB0aGlzLmlkbGUoKTtcblx0XHR9KS5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdGlkbGUoKXtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgtMC43NSwgMCwgMCk7XG5cdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEkvMiwgMCk7XG5cdFx0U0guaWRsZVJvb3QuYWRkKHRoaXMpO1xuXHR9XG59O1xuXG5leHBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuZnVuY3Rpb24gZ2V0R2FtZUlkKClcbntcblx0Ly8gZmlyc3QgY2hlY2sgdGhlIHVybFxuXHRsZXQgcmUgPSAvWz8mXWdhbWVJZD0oW14mXSspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRpZihyZSl7XG5cdFx0cmV0dXJuIHJlWzFdO1xuXHR9XG5cdGVsc2UgaWYoYWx0c3BhY2UgJiYgYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdHJldHVybiBTSC5lbnYuc2lkO1xuXHR9XG5cdGVsc2Uge1xuXHRcdGxldCBpZCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDAgKTtcblx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZSgnP2dhbWVJZD0nK2lkKTtcblx0fVxufVxuXG5mdW5jdGlvbiBwYXJzZUNTVihzdHIpe1xuXHRpZighc3RyKSByZXR1cm4gW107XG5cdGVsc2UgcmV0dXJuIHN0ci5zcGxpdCgnLCcpO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVF1ZXN0aW9uKHRleHQsIHRleHR1cmUgPSBudWxsKVxue1xuXHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XG5cblx0Ly8gc2V0IHVwIGNhbnZhc1xuXHRsZXQgYm1wO1xuXHRpZighdGV4dHVyZSl7XG5cdFx0Ym1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0Ym1wLndpZHRoID0gNTEyO1xuXHRcdGJtcC5oZWlnaHQgPSAyNTY7XG5cdH1cblx0ZWxzZSB7XG5cdFx0Ym1wID0gdGV4dHVyZS5pbWFnZTtcblx0fVxuXG5cdGxldCBnID0gYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdGcuY2xlYXJSZWN0KDAsIDAsIDUxMiwgMjU2KTtcblx0Zy50ZXh0QWxpZ24gPSAnY2VudGVyJztcblx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXG5cdC8vIHdyaXRlIHRleHRcblx0Zy5mb250ID0gJ2JvbGQgNTBweCAnK2ZvbnRTdGFjaztcblx0bGV0IGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG5cdGZvcihsZXQgaT0wOyBpPGxpbmVzLmxlbmd0aDsgaSsrKXtcblx0XHRnLmZpbGxUZXh0KGxpbmVzW2ldLCAyNTYsIDUwKzU1KmkpO1xuXHR9XG5cblx0aWYodGV4dHVyZSl7XG5cdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdFx0cmV0dXJuIHRleHR1cmU7XG5cdH1cblx0ZWxzZSB7XG5cdFx0cmV0dXJuIG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKGJtcCk7XG5cdH1cbn1cblxuZXhwb3J0IHsgZ2V0R2FtZUlkLCBwYXJzZUNTViwgZ2VuZXJhdGVRdWVzdGlvbiB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCB7IHBhcnNlQ1NWIH0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVUYWJsZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyBzYXZlIHJlZmVyZW5jZXMgdG8gdGhlIHRleHR1cmVzXG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX3NtYWxsLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbWVkLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbGFyZ2Vcblx0XHRdO1xuXG5cdFx0Ly8gYWRkIHRhYmxlIGFzc2V0XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50YWJsZS5jaGlsZHJlblswXTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCAwKTtcblx0XHR0aGlzLm1vZGVsLnNjYWxlLnNldFNjYWxhcigxLjI1KTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblxuXHRcdC8vIHNldCB0aGUgZGVmYXVsdCBtYXRlcmlhbFxuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwubWFwID0gdGhpcy50ZXh0dXJlc1swXTtcblxuXHRcdC8vIHBvc2l0aW9uIHRhYmxlXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMS4wLCAwKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLmNoYW5nZU1vZGUuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRjaGFuZ2VNb2RlKHtkYXRhOiB7Z2FtZToge3N0YXRlLCB0dXJuT3JkZXJ9fX0pXG5cdHtcblx0XHRpZihzdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHRsZXQgaWRzID0gcGFyc2VDU1YodHVybk9yZGVyKTtcblx0XHRcdGlmKGlkcy5sZW5ndGggPj0gOSlcblx0XHRcdFx0dGhpcy5tb2RlbC5tYXRlcmlhbC5tYXAgPSB0aGlzLnRleHR1cmVzWzJdO1xuXHRcdFx0ZWxzZSBpZihpZHMubGVuZ3RoID49IDcpXG5cdFx0XHRcdHRoaXMubW9kZWwubWF0ZXJpYWwubWFwID0gdGhpcy50ZXh0dXJlc1sxXTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0dGhpcy5tb2RlbC5tYXRlcmlhbC5tYXAgPSB0aGlzLnRleHR1cmVzWzBdO1xuXHRcdH1cblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgeyBwYXJzZUNTViB9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBOYW1lcGxhdGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcihzZWF0KVxuXHR7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc2VhdCA9IHNlYXQ7XG5cblx0XHQvLyBhZGQgM2QgbW9kZWxcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLm5hbWVwbGF0ZS5jaGlsZHJlblswXS5jbG9uZSgpO1xuXHRcdHRoaXMubW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJLzIsIDAsIE1hdGguUEkvMik7XG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHQvLyBnZW5lcmF0ZSBtYXRlcmlhbFxuXHRcdHRoaXMuYm1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy5ibXAud2lkdGggPSBOYW1lcGxhdGUudGV4dHVyZVNpemU7XG5cdFx0dGhpcy5ibXAuaGVpZ2h0ID0gTmFtZXBsYXRlLnRleHR1cmVTaXplIC8gMjtcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcblx0XHRcdG1hcDogbmV3IFRIUkVFLkNhbnZhc1RleHR1cmUodGhpcy5ibXApXG5cdFx0fSk7XG5cblx0XHQvLyBjcmVhdGUgbGlzdGVuZXIgcHJveGllc1xuXHRcdHRoaXMuX2hvdmVyQmVoYXZpb3IgPSBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlckNvbG9yKHtcblx0XHRcdGNvbG9yOiBuZXcgVEhSRUUuQ29sb3IoMHhmZmE4YTgpXG5cdFx0fSk7XG5cdFx0dGhpcy5tb2RlbC5hZGRCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcblx0XHR0aGlzLm1vZGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5jbGljay5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZVRleHQodGV4dClcblx0e1xuXHRcdGxldCBmb250U2l6ZSA9IDcvMzIgKiBOYW1lcGxhdGUudGV4dHVyZVNpemUgKiAwLjY1O1xuXG5cdFx0Ly8gc2V0IHVwIGNhbnZhc1xuXHRcdGxldCBnID0gdGhpcy5ibXAuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XG5cdFx0Zy5maWxsU3R5bGUgPSAnIzIyMic7XG5cdFx0Zy5maWxsUmVjdCgwLCAwLCBOYW1lcGxhdGUudGV4dHVyZVNpemUsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yKTtcblx0XHRnLmZvbnQgPSBgYm9sZCAke2ZvbnRTaXplfXB4ICR7Zm9udFN0YWNrfWA7XG5cdFx0Zy50ZXh0QWxpZ24gPSAnY2VudGVyJztcblx0XHRnLmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG5cdFx0Zy5maWxsVGV4dCh0ZXh0LCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMiwgKDAuNDIgLSAwLjEyKSooTmFtZXBsYXRlLnRleHR1cmVTaXplLzIpKTtcblxuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwubWFwLm5lZWRzVXBkYXRlID0gdHJ1ZTtcblx0fVxuXG5cblxuXHRjbGljayhlKVxuXHR7XG5cdFx0bGV0IHBsYXllcklkcyA9IHBhcnNlQ1NWKFNILmdhbWUudHVybk9yZGVyKTtcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyICYmIFNILmdhbWUuc3RhdGUgPT09ICdzZXR1cCcpXG5cdFx0XHR0aGlzLnJlcXVlc3RKb2luKCk7XG5cdFx0ZWxzZSBpZih0aGlzLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcblx0XHRcdHRoaXMucmVxdWVzdExlYXZlKCk7XG5cdFx0ZWxzZSBpZih0aGlzLnNlYXQub3duZXIgJiYgcGxheWVySWRzLmluY2x1ZGVzKFNILmxvY2FsVXNlci5pZCkpXG5cdFx0XHR0aGlzLnJlcXVlc3RLaWNrKCk7XG5cdH1cblxuXHRyZXF1ZXN0Sm9pbigpXG5cdHtcblx0XHRTSC5zb2NrZXQuZW1pdCgnam9pbicsIE9iamVjdC5hc3NpZ24oe3NlYXROdW06IHRoaXMuc2VhdC5zZWF0TnVtfSwgU0gubG9jYWxVc2VyKSk7XG5cdH1cblxuXHRyZXF1ZXN0TGVhdmUoKVxuXHR7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXHRcdGlmKCFzZWxmLnF1ZXN0aW9uKVxuXHRcdHtcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWxmLnNlYXQuYmFsbG90LmFza1F1ZXN0aW9uKCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byBsZWF2ZT8nLCAnbG9jYWxfbGVhdmUnKVxuXHRcdFx0LnRoZW4oY29uZmlybSA9PiB7XG5cdFx0XHRcdGlmKGNvbmZpcm0pe1xuXHRcdFx0XHRcdFNILnNvY2tldC5lbWl0KCdsZWF2ZScsIFNILmxvY2FsVXNlci5pZCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xuXHRcdH1cblx0fVxuXG5cdHJlcXVlc3RLaWNrKClcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblx0XHRpZighc2VsZi5xdWVzdGlvbilcblx0XHR7XG5cdFx0XHRsZXQgc2VhdCA9IFNILnNlYXRzW1NILnBsYXllcnNbU0gubG9jYWxVc2VyLmlkXS5zZWF0TnVtXTtcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWF0LmJhbGxvdC5hc2tRdWVzdGlvbihcblx0XHRcdFx0J0FyZSB5b3Ugc3VyZSB5b3VcXG53YW50IHRvIHRyeSB0byBraWNrXFxuJ1xuXHRcdFx0XHQrU0gucGxheWVyc1tzZWxmLnNlYXQub3duZXJdLmRpc3BsYXlOYW1lLFxuXHRcdFx0XHQnbG9jYWxfa2ljaydcblx0XHRcdClcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xuXHRcdFx0XHRpZihjb25maXJtKXtcblx0XHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgna2ljaycsIFNILmxvY2FsVXNlci5pZCwgc2VsZi5zZWF0Lm93bmVyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uID0gbnVsbDtcblx0XHRcdH0pXG5cdFx0XHQuY2F0Y2goKCkgPT4geyBzZWxmLnF1ZXN0aW9uID0gbnVsbDsgfSk7XG5cdFx0fVxuXHR9XG59XG5cbk5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSA9IDI1NjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLypcbiogSGF2ZSB0byBjb21wbGV0ZWx5IHJlaW1wbGVtZW50IHByb21pc2VzIGZyb20gc2NyYXRjaCBmb3IgdGhpcyA6KFxuKiBUaGlzIGNsYXNzIGlzIGEgcHJvbWlzZSB0aGF0IHRyYWNrcyBkZXBlbmRlbmNpZXMsIGFuZCBldmFsdWF0ZXNcbiogd2hlbiB0aGV5IGFyZSBtZXQuIEl0J3MgYWxzbyBjYW5jZWxsYWJsZSwgY2FsbGluZyBpdHMgZGVwZW5kZW50c1xuKiBhcyBzb29uIGFzIGl0cyBkZXBlbmRlbmNpZXMgYXJlIG1ldC5cbiovXG5jbGFzcyBDYXNjYWRpbmdQcm9taXNlXG57XG4gICAgY29uc3RydWN0b3IocHJlcmVxUHJvbWlzZSwgZXhlY0ZuLCBjbGVhbnVwRm4pXG4gICAge1xuICAgICAgICAvLyBzZXQgdXAgc3RhdGUgaW5mb3JtYXRpb25cbiAgICAgICAgdGhpcy5zdGF0ZSA9ICdwZW5kaW5nJztcbiAgICAgICAgdGhpcy5wcmVyZXFQcm9taXNlID0gcHJlcmVxUHJvbWlzZSB8fCBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgdGhpcy5leGVjRm4gPSBleGVjRm47XG4gICAgICAgIHRoaXMuY2xlYW51cEZuID0gY2xlYW51cEZuO1xuXG4gICAgICAgIC8vIHRyYWNrIGNhbGxiYWNrc1xuICAgICAgICB0aGlzLl9yZXNvbHZlQ2FsbGJhY2tzID0gW107XG4gICAgICAgIHRoaXMuX3JlamVjdENhbGxiYWNrcyA9IFtdO1xuICAgICAgICB0aGlzLl9leGVjVHlwZSA9IG51bGw7XG4gICAgICAgIHRoaXMuX2V4ZWNSZXN1bHQgPSBbXTtcblxuICAgICAgICAvLyBiaW5kIGV2ZW50c1xuICAgICAgICBsZXQgY2IgPSB0aGlzLl9wcmVyZXFTZXR0bGVkLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMucHJlcmVxUHJvbWlzZS50aGVuKGNiLCBjYik7XG4gICAgfVxuXG4gICAgX3ByZXJlcVNldHRsZWQoKXtcbiAgICAgICAgaWYodGhpcy5zdGF0ZSA9PT0gJ3BlbmRpbmcnKXtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSAncnVubmluZyc7XG4gICAgICAgICAgICBmdW5jdGlvbiBzZXR0bGUodHlwZSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKC4uLmFyZ3Mpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9leGVjU2V0dGxlZCh0eXBlLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuZXhlY0ZuKFxuICAgICAgICAgICAgICAgIHNldHRsZSgncmVzb2x2ZScpLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgc2V0dGxlKCdyZWplY3QnKS5iaW5kKHRoaXMpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYodGhpcy5zdGF0ZSA9PT0gJ2NhbmNlbGxlZCcpe1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9ICdzZXR0bGVkJztcbiAgICAgICAgICAgIHRoaXMuX3Jlc29sdmVDYWxsYmFja3MuZm9yRWFjaChjYiA9PiBjYigpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9leGVjU2V0dGxlZCh0eXBlLCByZXN1bHQpe1xuICAgICAgICBpZih0aGlzLnN0YXRlID09PSAncnVubmluZycpe1xuICAgICAgICAgICAgdGhpcy5fZXhlY1R5cGUgPSB0eXBlO1xuICAgICAgICAgICAgdGhpcy5fZXhlY1Jlc3VsdCA9IHJlc3VsdDtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSAnY2xlYW5pbmd1cCc7XG4gICAgICAgICAgICB0aGlzLmNsZWFudXBGbih0aGlzLl9jbGVhbnVwRG9uZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9jbGVhbnVwRG9uZSgpe1xuICAgICAgICBpZih0aGlzLnN0YXRlID09PSAnY2xlYW5pbmd1cCcpe1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9ICdzZXR0bGVkJztcbiAgICAgICAgICAgIGlmKHRoaXMuX2V4ZWNUeXBlID09PSAncmVzb2x2ZScpe1xuICAgICAgICAgICAgICAgIHRoaXMuX3Jlc29sdmVDYWxsYmFja3MuZm9yRWFjaChcbiAgICAgICAgICAgICAgICAgICAgKGNiID0+IGNiKC4uLnRoaXMuX2V4ZWNSZXN1bHQpKS5iaW5kKHRoaXMpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlamVjdENhbGxiYWNrcy5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAoY2IgPT4gY2IoLi4udGhpcy5fZXhlY1Jlc3VsdCkpLmJpbmQodGhpcylcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2FuY2VsKCl7XG4gICAgICAgIGlmKHRoaXMuc3RhdGUgPT09ICdydW5uaW5nJyl7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gJ2NsZWFuaW5ndXAnO1xuICAgICAgICAgICAgdGhpcy5jbGVhbnVwRm4odGhpcy5fY2xlYW51cERvbmUuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZih0aGlzLnN0YXRlID09PSAncGVuZGluZycpe1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9ICdjYW5jZWxsZWQnO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhlbihkb25lQ2IsIGVyckNiKVxuICAgIHtcbiAgICAgICAgaWYodGhpcy5zdGF0ZSA9PT0gJ3NldHRsZWQnKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZih0aGlzLl9leGVjVHlwZSA9PT0gJ3Jlc29sdmUnKXtcbiAgICAgICAgICAgICAgICBkb25lQ2IoLi4udGhpcy5fZXhlY1Jlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBlcnJDYiguLi50aGlzLl9leGVjUmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3Jlc29sdmVDYWxsYmFja3MucHVzaChkb25lQ2IpO1xuICAgICAgICAgICAgaWYoZXJyQ2IpXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVqZWN0Q2FsbGJhY2tzLnB1c2goZXJyQ2IpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgY2F0Y2goY2Ipe1xuICAgICAgICBpZih0aGlzLnN0YXRlID09PSAnc2V0dGxlZCcpe1xuICAgICAgICAgICAgaWYodGhpcy5fZXhlY1R5cGUgPT09ICdyZWplY3QnKVxuICAgICAgICAgICAgICAgIGNiKC4uLnRoaXMuX2V4ZWNSZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMuX3JlamVjdENhbGxiYWNrcy5wdXNoKGNiKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IENhc2NhZGluZ1Byb21pc2U7XG4iLCIndXNlIHN0cmljdDsnXG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgeyBKYUNhcmQsIE5laW5DYXJkIH0gZnJvbSAnLi9jYXJkJztcbmltcG9ydCB7IGdlbmVyYXRlUXVlc3Rpb24sIHBhcnNlQ1NWIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgQ2FzY2FkaW5nUHJvbWlzZSBmcm9tICcuL2Nhc2NhZGluZ3Byb21pc2UnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBCYWxsb3QgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuICAgIGNvbnN0cnVjdG9yKHNlYXQpXG4gICAge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLnNlYXQgPSBzZWF0O1xuICAgICAgICB0aGlzLnF1ZXN0aW9ucyA9IHt9O1xuICAgICAgICB0aGlzLmxhc3RBc2tlZCA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5feWVzQ2xpY2tIYW5kbGVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fbm9DbGlja0hhbmRsZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuamFDYXJkID0gbmV3IEphQ2FyZCgpO1xuICAgICAgICB0aGlzLm5laW5DYXJkID0gbmV3IE5laW5DYXJkKCk7XG4gICAgICAgIFt0aGlzLmphQ2FyZCwgdGhpcy5uZWluQ2FyZF0uZm9yRWFjaChjID0+IHtcbiAgICAgICAgICAgIGMucG9zaXRpb24uc2V0KGMgaW5zdGFuY2VvZiBKYUNhcmQgPyAtMC4xIDogMC4xLCAtMC4xLCAwKTtcbiAgICAgICAgICAgIGMucm90YXRpb24uc2V0KDAuNSwgTWF0aC5QSSwgMCk7XG4gICAgICAgICAgICBjLnNjYWxlLnNldFNjYWxhcigwLjE1KTtcbiAgICAgICAgICAgIGMuaGlkZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hZGQodGhpcy5qYUNhcmQsIHRoaXMubmVpbkNhcmQpO1xuXG4gICAgICAgIGxldCBnZW8gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSgwLjQsIDAuMik7XG4gICAgICAgIGxldCBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe3RyYW5zcGFyZW50OiB0cnVlfSk7XG4gICAgICAgIHRoaXMucXVlc3Rpb24gPSBuZXcgVEhSRUUuTWVzaChnZW8sIG1hdCk7XG4gICAgICAgIHRoaXMucXVlc3Rpb24ucG9zaXRpb24uc2V0KDAsIDAuMDUsIDApO1xuICAgICAgICB0aGlzLnF1ZXN0aW9uLnJvdGF0aW9uLnNldCgwLCBNYXRoLlBJLCAwKTtcbiAgICAgICAgdGhpcy5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMuYWRkKHRoaXMucXVlc3Rpb24pO1xuXG4gICAgICAgIFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV92b3Rlc0luUHJvZ3Jlc3MnLCB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzLCB2b3Rlc319KVxuICAgIHtcbiAgICAgICAgbGV0IHNlbGYgPSB0aGlzO1xuICAgICAgICBpZighc2VsZi5zZWF0Lm93bmVyKSByZXR1cm47XG5cbiAgICAgICAgbGV0IHZpcHMgPSBwYXJzZUNTVihnYW1lLnZvdGVzSW5Qcm9ncmVzcyk7XG4gICAgICAgIGxldCB2b3Rlc0ZpbmlzaGVkID0gcGFyc2VDU1YoU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MpLmZpbHRlcihcbiAgICAgICAgICAgIGUgPT4gIXZpcHMuaW5jbHVkZXMoZSlcbiAgICAgICAgKTtcblxuICAgICAgICB2aXBzLmZvckVhY2godklkID0+XG4gICAgICAgIHtcbiAgICAgICAgICAgIGxldCB2cyA9IHBhcnNlQ1NWKHZvdGVzW3ZJZF0ueWVzVm90ZXJzKycsJyt2b3Rlc1t2SWRdLm5vVm90ZXJzKTtcbiAgICAgICAgICAgIGxldCBudiA9IHBhcnNlQ1NWKHZvdGVzW3ZJZF0ubm9uVm90ZXJzKTtcblxuICAgICAgICAgICAgbGV0IGFza2VkID0gc2VsZi5xdWVzdGlvbnNbdklkXTtcbiAgICAgICAgICAgIGlmKCFhc2tlZCAmJiAhbnYuaW5jbHVkZXMoc2VsZi5zZWF0Lm93bmVyKSAmJiAhdnMuaW5jbHVkZXMoc2VsZi5zZWF0Lm93bmVyKSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBsZXQgcXVlc3Rpb25UZXh0O1xuICAgICAgICAgICAgICAgIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2VsZWN0Jyl7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXN0aW9uVGV4dCA9IHBsYXllcnNbdm90ZXNbdklkXS50YXJnZXQxXS5kaXNwbGF5TmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgKyAnXFxuZm9yIHByZXNpZGVudCBhbmRcXG4nXG4gICAgICAgICAgICAgICAgICAgICAgICArIHBsYXllcnNbdm90ZXNbdklkXS50YXJnZXQyXS5kaXNwbGF5TmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgKyAnXFxuZm9yIGNoYW5jZWxsb3I/JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdqb2luJyl7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXN0aW9uVGV4dCA9IHZvdGVzW3ZJZF0uZGF0YSArICdcXG50byBqb2luPyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAna2ljaycpe1xuICAgICAgICAgICAgICAgICAgICBxdWVzdGlvblRleHQgPSAnVm90ZSB0byBraWNrXFxuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgKyBwbGF5ZXJzW3ZvdGVzW3ZJZF0udGFyZ2V0MV0uZGlzcGxheU5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJz8nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNlbGYuYXNrUXVlc3Rpb24ocXVlc3Rpb25UZXh0LCB2SWQpXG4gICAgICAgICAgICAgICAgLnRoZW4oYW5zd2VyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgU0guc29ja2V0LmVtaXQoJ3ZvdGUnLCB2SWQsIFNILmxvY2FsVXNlci5pZCwgYW5zd2VyKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoKSA9PiBjb25zb2xlLmxvZygnVm90ZSBzY3J1YmJlZDonLCB2SWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYodnMuaW5jbHVkZXMoc2VsZi5zZWF0Lm93bmVyKSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZihzZWxmLnF1ZXN0aW9uc1t2SWRdKVxuICAgICAgICAgICAgICAgICAgICBzZWxmLnF1ZXN0aW9uc1t2SWRdLmNhbmNlbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2b3Rlc0ZpbmlzaGVkLmZvckVhY2goKHZJZCkgPT4ge1xuICAgICAgICAgICAgaWYoc2VsZi5xdWVzdGlvbnNbdklkXSlcbiAgICAgICAgICAgICAgICBzZWxmLnF1ZXN0aW9uc1t2SWRdLmNhbmNlbCgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhc2tRdWVzdGlvbihxVGV4dCwgaWQpXG4gICAge1xuICAgICAgICBsZXQgc2VsZiA9IHRoaXM7XG4gICAgICAgIGxldCBuZXdRID0gbmV3IENhc2NhZGluZ1Byb21pc2Uoc2VsZi5xdWVzdGlvbnNbc2VsZi5sYXN0QXNrZWRdLFxuICAgICAgICAgICAgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIHRoZSBhbnN3ZXIgaXMgc3RpbGwgcmVsZXZhbnRcbiAgICAgICAgICAgICAgICBsZXQgbGF0ZXN0Vm90ZXMgPSBwYXJzZUNTVihTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgaWYoIS9ebG9jYWwvLnRlc3QoaWQpICYmICFsYXRlc3RWb3Rlcy5pbmNsdWRlcyhpZCkpe1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGhvb2sgdXAgcS9hIGNhcmRzXG4gICAgICAgICAgICAgICAgc2VsZi5xdWVzdGlvbi5tYXRlcmlhbC5tYXAgPSBnZW5lcmF0ZVF1ZXN0aW9uKHFUZXh0LCB0aGlzLnF1ZXN0aW9uLm1hdGVyaWFsLm1hcCk7XG4gICAgICAgICAgICAgICAgc2VsZi5qYUNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKHRydWUpKTtcbiAgICAgICAgICAgICAgICBzZWxmLm5laW5DYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZChmYWxzZSkpO1xuXG4gICAgICAgICAgICAgICAgLy8gc2hvdyB0aGUgYmFsbG90XG4gICAgICAgICAgICAgICAgc2VsZi5xdWVzdGlvbi52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzZWxmLmphQ2FyZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgc2VsZi5uZWluQ2FyZC5zaG93KCk7XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiByZXNwb25kKGFuc3dlcil7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZXIoKVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgb25seSB0aGUgb3duZXIgb2YgdGhlIGJhbGxvdCBpcyBhbnN3ZXJpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHNlbGYuc2VhdC5vd25lciAhPT0gU0gubG9jYWxVc2VyLmlkKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSB0aGUgYW5zd2VyIHN0aWxsIG1hdHRlcnNcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBsYXRlc3RWb3RlcyA9IHBhcnNlQ1NWKFNILmdhbWUudm90ZXNJblByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCEvXmxvY2FsLy50ZXN0KGlkKSAmJiAhbGF0ZXN0Vm90ZXMuaW5jbHVkZXMoaWQpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKGFuc3dlcikgc2VsZi5feWVzQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBzZWxmLl9ub0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoZG9uZSkgPT4ge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBzZWxmLnF1ZXN0aW9uc1tpZF07XG4gICAgICAgICAgICAgICAgaWYoc2VsZi5sYXN0QXNrZWQgPT09IGlkKVxuICAgICAgICAgICAgICAgICAgICBzZWxmLmxhc3RBc2tlZCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICAvLyBoaWRlIHRoZSBxdWVzdGlvblxuICAgICAgICAgICAgICAgIHNlbGYuamFDYXJkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBzZWxmLm5laW5DYXJkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzZWxmLmphQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX3llc0NsaWNrSGFuZGxlcik7XG4gICAgICAgICAgICAgICAgc2VsZi5uZWluQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX25vQ2xpY2tIYW5kbGVyKTtcbiAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gYWRkIHF1ZXN0aW9uIHRvIHF1ZXVlLCByZW1vdmUgd2hlbiBkb25lXG4gICAgICAgIHNlbGYucXVlc3Rpb25zW2lkXSA9IG5ld1E7XG4gICAgICAgIHNlbGYubGFzdEFza2VkID0gaWQ7XG4gICAgICAgIGxldCBzcGxpY2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBkZWxldGUgc2VsZi5xdWVzdGlvbnNbaWRdO1xuICAgICAgICAgICAgaWYoc2VsZi5sYXN0QXNrZWQgPT09IGlkKVxuICAgICAgICAgICAgICAgIHNlbGYubGFzdEFza2VkID0gbnVsbDtcbiAgICAgICAgfTtcbiAgICAgICAgbmV3US50aGVuKHNwbGljZSwgc3BsaWNlKTtcblxuICAgICAgICByZXR1cm4gbmV3UTtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgTmFtZXBsYXRlIGZyb20gJy4vbmFtZXBsYXRlJztcbmltcG9ydCBCYWxsb3QgZnJvbSAnLi9iYWxsb3QnO1xuaW1wb3J0IHtwYXJzZUNTVn0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNlYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuICAgIGNvbnN0cnVjdG9yKHNlYXROdW0pXG4gICAge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIHRoaXMuc2VhdE51bSA9IHNlYXROdW07XG4gICAgICAgIHRoaXMub3duZXIgPSAwO1xuXG4gICAgICAgIC8vIHBvc2l0aW9uIHNlYXRcbiAgICAgICAgbGV0IHgsIHk9MC42NSwgejtcbiAgICAgICAgc3dpdGNoKHNlYXROdW0pe1xuICAgICAgICBjYXNlIDA6IGNhc2UgMTogY2FzZSAyOlxuICAgICAgICAgICAgeCA9IC0wLjgzMyArIDAuODMzKnNlYXROdW07XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uLnNldCh4LCB5LCAtMS4wNSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOiBjYXNlIDQ6XG4gICAgICAgICAgICB6ID0gLTAuNDM3ICsgMC44NzQqKHNlYXROdW0tMyk7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uLnNldCgxLjQyNSwgeSwgeik7XG4gICAgICAgICAgICB0aGlzLnJvdGF0aW9uLnNldCgwLCAtTWF0aC5QSS8yLCAwKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDU6IGNhc2UgNjogY2FzZSA3OlxuICAgICAgICAgICAgeCA9IDAuODMzIC0gMC44MzMqKHNlYXROdW0tNSk7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uLnNldCh4LCB5LCAxLjA1KTtcbiAgICAgICAgICAgIHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLCAwKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDg6IGNhc2UgOTpcbiAgICAgICAgICAgIHogPSAwLjQzNyAtIDAuODc0KihzZWF0TnVtLTgpO1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbi5zZXQoLTEuNDI1LCB5LCB6KTtcbiAgICAgICAgICAgIHRoaXMucm90YXRpb24uc2V0KDAsIC0xLjUqTWF0aC5QSSwgMCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubmFtZXBsYXRlID0gbmV3IE5hbWVwbGF0ZSh0aGlzKTtcbiAgICAgICAgdGhpcy5uYW1lcGxhdGUucG9zaXRpb24uc2V0KDAsIC0wLjYzNSwgMC4yMik7XG4gICAgICAgIHRoaXMuYWRkKHRoaXMubmFtZXBsYXRlKTtcblxuICAgICAgICB0aGlzLmJhbGxvdCA9IG5ldyBCYWxsb3QodGhpcyk7XG4gICAgICAgIHRoaXMuYmFsbG90LnBvc2l0aW9uLnNldCgwLCAtMC4zLCAwLjI1KTtcbiAgICAgICAgLy90aGlzLmJhbGxvdC5yb3RhdGVZKDAuMSk7XG4gICAgICAgIHRoaXMuYWRkKHRoaXMuYmFsbG90KTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLnVwZGF0ZU93bmVyc2hpcC5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICB1cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXG5cdHtcblx0XHRsZXQgaWRzID0gcGFyc2VDU1YoZ2FtZS50dXJuT3JkZXIpO1xuXG5cdFx0aWYoICF0aGlzLm93bmVyIClcblx0XHR7XG5cdFx0XHQvLyBjaGVjayBpZiBhIHBsYXllciBoYXMgam9pbmVkIGF0IHRoaXMgc2VhdFxuXHRcdFx0Zm9yKGxldCBpIGluIGlkcyl7XG5cdFx0XHRcdGlmKHBsYXllcnNbaWRzW2ldXS5zZWF0TnVtID09IHRoaXMuc2VhdE51bSl7XG5cdFx0XHRcdFx0dGhpcy5vd25lciA9IGlkc1tpXTtcblx0XHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KHBsYXllcnNbaWRzW2ldXS5kaXNwbGF5TmFtZSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYoICFpZHMuaW5jbHVkZXModGhpcy5vd25lcikgKVxuXHRcdHtcblx0XHRcdHRoaXMub3duZXIgPSAwO1xuXHRcdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHRcdHRoaXMubmFtZXBsYXRlLnVwZGF0ZVRleHQoJzxKb2luPicpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgKiBhcyBDYXJkcyBmcm9tICcuL2NhcmQnO1xuaW1wb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH0gZnJvbSAnLi9oYXRzJztcbmltcG9ydCBHYW1lVGFibGUgZnJvbSAnLi90YWJsZSc7XG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCB7IGdldEdhbWVJZCB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XG5pbXBvcnQgU2VhdCBmcm9tICcuL3NlYXQnO1xuXG5jbGFzcyBTZWNyZXRIaXRsZXIgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuYXNzZXRzID0gQXNzZXRNYW5hZ2VyLm1hbmlmZXN0O1xuXHRcdHRoaXMudmVydGljYWxBbGlnbiA9ICdib3R0b20nO1xuXHRcdHRoaXMubmVlZHNTa2VsZXRvbiA9IHRydWU7XG5cblx0XHQvLyBwb2x5ZmlsbCBnZXRVc2VyIGZ1bmN0aW9uXG5cdFx0aWYoIWFsdHNwYWNlLmluQ2xpZW50KXtcblx0XHRcdGFsdHNwYWNlLmdldFVzZXIgPSAoKSA9PiB7XG5cdFx0XHRcdGxldCBpZCwgcmUgPSAvWz8mXXVzZXJJZD0oXFxkKykvLmV4ZWMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG5cdFx0XHRcdGlmKHJlKVxuXHRcdFx0XHRcdGlkID0gcmVbMV07XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwKTtcblxuXHRcdFx0XHRhbHRzcGFjZS5fbG9jYWxVc2VyID0ge1xuXHRcdFx0XHRcdHVzZXJJZDogaWQsXG5cdFx0XHRcdFx0ZGlzcGxheU5hbWU6ICdHdWVzdCcraWQsXG5cdFx0XHRcdFx0aXNNb2RlcmF0b3I6IGZhbHNlXG5cdFx0XHRcdH07XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdNYXNxdWVyYWRpbmcgYXMnLCBhbHRzcGFjZS5fbG9jYWxVc2VyKTtcblx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShhbHRzcGFjZS5fbG9jYWxVc2VyKTtcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8gZ2V0IGxvY2FsIHVzZXJcblx0XHRhbHRzcGFjZS5nZXRVc2VyKCkudGhlbigodXNlciA9PlxuXHRcdHtcblx0XHRcdHRoaXMubG9jYWxVc2VyID0ge1xuXHRcdFx0XHRpZDogdXNlci51c2VySWQudG9TdHJpbmcoKSxcblx0XHRcdFx0ZGlzcGxheU5hbWU6IHVzZXIuZGlzcGxheU5hbWUsXG5cdFx0XHRcdGlzTW9kZXJhdG9yOiB1c2VyLmlzTW9kZXJhdG9yXG5cdFx0XHR9O1xuXHRcdH0pLmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5nYW1lID0ge307XG5cdFx0dGhpcy5wbGF5ZXJzID0ge307XG5cdFx0dGhpcy52b3RlcyA9IHt9O1xuXHR9XG5cblx0aW5pdGlhbGl6ZShlbnYsIHJvb3QsIGFzc2V0cylcblx0e1xuXHRcdC8vIHNoYXJlIHRoZSBkaW9yYW1hIGluZm9cblx0XHRBc3NldE1hbmFnZXIuY2FjaGUgPSBhc3NldHM7XG5cdFx0dGhpcy5lbnYgPSBlbnY7XG5cblx0XHQvLyBjb25uZWN0IHRvIHNlcnZlclxuXHRcdHRoaXMuc29ja2V0ID0gaW8uY29ubmVjdCgnLycsIHtxdWVyeTogJ2dhbWVJZD0nK2dldEdhbWVJZCgpfSk7XG5cblx0XHQvLyBjcmVhdGUgdGhlIHRhYmxlXG5cdFx0dGhpcy50YWJsZSA9IG5ldyBHYW1lVGFibGUoKTtcblx0XHR0aGlzLmFkZCh0aGlzLnRhYmxlKTtcblxuXHRcdHRoaXMucmVzZXRCdXR0b24gPSBuZXcgVEhSRUUuTWVzaChcblx0XHRcdG5ldyBUSFJFRS5Cb3hHZW9tZXRyeSguMjUsLjI1LC4yNSksXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogYXNzZXRzLnRleHR1cmVzLnJlc2V0fSlcblx0XHQpO1xuXHRcdHRoaXMucmVzZXRCdXR0b24ucG9zaXRpb24uc2V0KDAsIC0wLjE4LCAwKTtcblx0XHR0aGlzLnJlc2V0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5yZXNldC5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLnRhYmxlLmFkZCh0aGlzLnJlc2V0QnV0dG9uKTtcblxuXHRcdC8vIGNyZWF0ZSBpZGxlIGRpc3BsYXlcblx0XHR0aGlzLmlkbGVSb290ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG5cdFx0dGhpcy5pZGxlUm9vdC5wb3NpdGlvbi5zZXQoMCwgMS44NSwgMCk7XG5cdFx0dGhpcy5pZGxlUm9vdC5hZGRCZWhhdmlvcihuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5TcGluKHtzcGVlZDogMC4wMDAyfSkpO1xuXHRcdHRoaXMuYWRkKHRoaXMuaWRsZVJvb3QpO1xuXG5cdFx0Ly8gY3JlYXRlIGlkbGUgc2xpZGVzaG93XG5cdFx0bGV0IGNyZWRpdHMgPSBuZXcgQ2FyZHMuQ3JlZGl0c0NhcmQoKTtcblx0XHR0aGlzLmlkbGVSb290LmFkZChjcmVkaXRzKTtcblxuXHRcdC8vIGNyZWF0ZSBoYXRzXG5cdFx0dGhpcy5wcmVzaWRlbnRIYXQgPSBuZXcgUHJlc2lkZW50SGF0KCk7XG5cdFx0dGhpcy5jaGFuY2VsbG9ySGF0ID0gbmV3IENoYW5jZWxsb3JIYXQoKTtcblxuXHRcdC8vIGNyZWF0ZSBwb3NpdGlvbnNcblx0XHR0aGlzLnNlYXRzID0gW107XG5cdFx0Zm9yKGxldCBpPTA7IGk8MTA7IGkrKyl7XG5cdFx0XHR0aGlzLnNlYXRzLnB1c2goIG5ldyBTZWF0KGkpICk7XG5cdFx0fVxuXG5cdFx0dGhpcy50YWJsZS5hZGQoLi4udGhpcy5zZWF0cyk7XG5cblx0XHQvLyBhZGQgYXZhdGFyIGZvciBzY2FsZVxuXHRcdGFzc2V0cy5tb2RlbHMuZHVtbXkucG9zaXRpb24uc2V0KDAsIDAsIDEuMSk7XG5cdFx0YXNzZXRzLm1vZGVscy5kdW1teS5yb3RhdGVaKE1hdGguUEkpO1xuXHRcdHRoaXMuYWRkKGFzc2V0cy5tb2RlbHMuZHVtbXkpO1xuXG5cdFx0dGhpcy5zb2NrZXQub24oJ3VwZGF0ZScsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZUZyb21TZXJ2ZXIoZ2QsIHBkLCB2ZClcblx0e1xuXHRcdGNvbnNvbGUubG9nKGdkLCBwZCwgdmQpO1xuXG5cdFx0bGV0IGdhbWUgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdhbWUsIGdkKTtcblx0XHRsZXQgcGxheWVycyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMucGxheWVycywgcGQpO1xuXHRcdGxldCB2b3RlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMudm90ZXMsIHZkKTtcblxuXHRcdGZvcihsZXQgZmllbGQgaW4gZ2QpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdFx0dHlwZTogJ3VwZGF0ZV8nK2ZpZWxkLFxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGdhbWU6IGdhbWUsXG5cdFx0XHRcdFx0cGxheWVyczogcGxheWVycyxcblx0XHRcdFx0XHR2b3Rlczogdm90ZXNcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcblx0XHR0aGlzLnBsYXllcnMgPSBwbGF5ZXJzO1xuXHRcdHRoaXMudm90ZXMgPSB2b3Rlcztcblx0fVxuXG5cdHJlc2V0KGUpe1xuXHRcdGNvbnNvbGUubG9nKCdyZXF1ZXN0aW5nIHJlc2V0Jyk7XG5cdFx0dGhpcy5zb2NrZXQuZW1pdCgncmVzZXQnKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgU2VjcmV0SGl0bGVyKCk7XG4iXSwibmFtZXMiOlsidGhpcyIsInN1cGVyIiwibGV0IiwiQXNzZXRNYW5hZ2VyIiwiQ2FyZHMuQ3JlZGl0c0NhcmQiXSwibWFwcGluZ3MiOiI7OztBQUVBLFNBQWU7Q0FDZCxRQUFRLEVBQUU7RUFDVCxNQUFNLEVBQUU7R0FDUCxLQUFLLEVBQUUsd0JBQXdCO0dBQy9CLFNBQVMsRUFBRSw0QkFBNEI7R0FDdkMsTUFBTSxFQUFFLDBCQUEwQjtHQUNsQyxRQUFRLEVBQUUsNkJBQTZCO0dBQ3ZDLEtBQUssRUFBRSx5QkFBeUI7R0FDaEM7RUFDRCxRQUFRLEVBQUU7R0FDVCxXQUFXLEVBQUUsa0NBQWtDO0dBQy9DLFNBQVMsRUFBRSxtQ0FBbUM7R0FDOUMsV0FBVyxFQUFFLGtDQUFrQztHQUMvQyxLQUFLLEVBQUUsc0JBQXNCO0dBQzdCLEtBQUssRUFBRSxxQkFBcUI7R0FDNUI7RUFDRDtDQUNELEtBQUssRUFBRSxFQUFFO0NBQ1QsQ0FBQTs7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QUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7R0FDbEUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7R0FFckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7R0FDckI7OztFQUdELElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUN2QyxJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7RUFDMUMsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0VBQ3RDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0VBQzVCLENBQUE7O0NBRUQsa0JBQUEsTUFBTTtDQUNOOztFQUVDQSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztFQUN0REEsSUFBSSxJQUFJLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxVQUFBLENBQUMsRUFBQyxTQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQSxDQUFDO0VBQzdELEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7OztFQUc5QixJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7R0FDYixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0dBQ25FOzs7RUFH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
