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
			if(ids.length < 2)
				{ this.model.material.map = this.textures[0]; }
			else if(ids.length < 3)
				{ this.model.material.map = this.textures[1]; }
			else
				{ this.model.material.map = this.textures[2]; }
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
		if(!this.seat.owner && SH.game.state === 'setup')
			{ this.requestJoin(); }
		else if(this.seat.owner === SH.localUser.id)
			{ this.requestLeave(); }
	};

	Nameplate.prototype.requestJoin = function requestJoin ()
	{
		SH.socket.emit('requestJoin', Object.assign({seatNum: this.seat.seatNum}, SH.localUser));
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
            var asked = self.questions[vId];
            if(!asked)
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
                    questionText = 'Kick\n'
                        + players[votes[vId].target1].displayName
                        + '?';
                }

                self.askQuestion(questionText, vId)
                .then(function (answer) {
                    SH.socket.emit('vote', vId, SH.localUser.id, answer);
                })
                .catch(function () { return console.log('Vote scrubbed:', vId); });
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

		var needPlayerInfo = ['turnOrder','pendingJoinRequest'];
		for(var field in gd)
		{
			this$1.dispatchEvent({
				type: 'update_'+field,
				bubbles: false,
				data: {
					game: game,
					players: needPlayerInfo.includes(field) ? players : undefined,
					votes: field === 'votesInProgress' ? votes : undefined
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvYXNzZXRtYW5hZ2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9nYW1lb2JqZWN0cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVybWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L3V0aWxzLmpzIiwiLi4vLi4vc3JjL2NsaWVudC90YWJsZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jYXNjYWRpbmdwcm9taXNlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3QuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlYXQuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlY3JldGhpdGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0bWFuaWZlc3Q6IHtcblx0XHRtb2RlbHM6IHtcblx0XHRcdHRhYmxlOiAnc3RhdGljL21vZGVsL3RhYmxlLmRhZScsXG5cdFx0XHRuYW1lcGxhdGU6ICdzdGF0aWMvbW9kZWwvbmFtZXBsYXRlLmRhZScsXG5cdFx0XHR0b3BoYXQ6ICdzdGF0aWMvbW9kZWwvdG9waGF0LmdsdGYnLFxuXHRcdFx0dmlzb3JjYXA6ICdzdGF0aWMvbW9kZWwvdmlzb3JfY2FwLmdsdGYnLFxuXHRcdFx0ZHVtbXk6ICdzdGF0aWMvbW9kZWwvZHVtbXkuZ2x0Zidcblx0XHR9LFxuXHRcdHRleHR1cmVzOiB7XG5cdFx0XHRib2FyZF9sYXJnZTogJ3N0YXRpYy9pbWcvYm9hcmQtbGFyZ2UtYmFrZWQucG5nJyxcblx0XHRcdGJvYXJkX21lZDogJ3N0YXRpYy9pbWcvYm9hcmQtbWVkaXVtLWJha2VkLnBuZycsXG5cdFx0XHRib2FyZF9zbWFsbDogJ3N0YXRpYy9pbWcvYm9hcmQtc21hbGwtYmFrZWQucG5nJyxcblx0XHRcdGNhcmRzOiAnc3RhdGljL2ltZy9jYXJkcy5wbmcnLFxuXHRcdFx0cmVzZXQ6ICdzdGF0aWMvaW1nL2JvbWIucG5nJ1xuXHRcdH1cblx0fSxcblx0Y2FjaGU6IHt9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmNsYXNzIEdhbWVTdGF0ZVxue1xuXHRjb25zdHJ1Y3RvcihpZClcblx0e1xuXHRcdHRoaXMuaWQgPSBpZDtcblxuXHRcdHRoaXMuc3RhdGUgPSAnaWRsZSc7XG5cblx0XHR0aGlzLnR1cm5PcmRlciA9IFtdOyAvLyBhcnJheSBvZiB1c2VySWRzXG5cdFx0dGhpcy5wcmVzaWRlbnQgPSAwOyAvLyB1c2VySWRcblx0XHR0aGlzLmNoYW5jZWxsb3IgPSAwOyAvLyB1c2VySWRcblx0XHR0aGlzLmxhc3RQcmVzaWRlbnQgPSAwOyAvLyB1c2VySWRcblx0XHR0aGlzLmxhc3RDaGFuY2VsbG9yID0gMDsgLy8gdXNlcklkXG5cblx0XHR0aGlzLmxpYmVyYWxQb2xpY2llcyA9IDA7XG5cdFx0dGhpcy5mYXNjaXN0UG9saWNpZXMgPSAwO1xuXHRcdHRoaXMuZGVja0Zhc2Npc3QgPSAxMTtcblx0XHR0aGlzLmRlY2tMaWJlcmFsID0gNjtcblx0XHR0aGlzLmRpc2NhcmRGYXNjaXN0ID0gMDtcblx0XHR0aGlzLmRpc2NhcmRMaWJlcmFsID0gMDtcblx0XHR0aGlzLnNwZWNpYWxFbGVjdGlvbiA9IGZhbHNlO1xuXHRcdHRoaXMuZmFpbGVkVm90ZXMgPSAwO1xuXHR9XG5cblx0bmV4dFByZXNpZGVudCgpXG5cdHtcblx0XHRsZXQgdHVybiA9IDA7XG5cblx0XHQvLyB0aGlzIGlzIHRoZSBmaXJzdCByb3VuZCwgY2hvb3NlIHByZXNpZGVudCByYW5kb21seVxuXHRcdGlmKCF0aGlzLnByZXNpZGVudClcblx0XHRcdHR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGlzLnR1cm5PcmRlci5sZW5ndGgpO1xuXG5cdFx0Ly8gdGhpcyBpcyBhIHNwZWNpYWwgZWxlY3Rpb24sIHNvIGNvdW50IGZyb20gcHJlc2lkZW50IGVtZXJpdHVzXG5cdFx0ZWxzZSBpZih0aGlzLnNwZWNpYWxFbGVjdGlvbilcblx0XHRcdHR1cm4gPSB0aGlzLnBsYXllcnNbdGhpcy5sYXN0UHJlc2lkZW50XS50dXJuT3JkZXI7XG5cblx0XHQvLyBhIHJlZ3VsYXIgZWxlY3Rpb246IHBvd2VyIHBhc3NlcyB0byB0aGUgbGVmdFxuXHRcdGVsc2Vcblx0XHRcdHR1cm4gPSB0aGlzLnBsYXllcnNbdGhpcy5wcmVzaWRlbnRdLnR1cm5PcmRlcjtcblxuXHRcdHJldHVybiB0aGlzLnR1cm5PcmRlclsgKHR1cm4rMSkldGhpcy50dXJuT3JkZXIubGVuZ3RoIF07XG5cdH1cblxuXHRkcmF3UG9saWNpZXMoKVxuXHR7XG5cblx0fVxufVxuXG5jbGFzcyBQbGF5ZXJcbntcblx0Y29uc3RydWN0b3IodXNlcklkID0gMCwgZGlzcGxheU5hbWUgPSAnZHVtbXknLCBpc01vZGVyYXRvciA9IGZhbHNlKVxuXHR7XG5cdFx0dGhpcy51c2VySWQgPSB1c2VySWQ7XG5cdFx0dGhpcy5kaXNwbGF5TmFtZSA9IGRpc3BsYXlOYW1lO1xuXHRcdHRoaXMuaXNNb2RlcmF0b3IgPSBmYWxzZTtcblx0XHR0aGlzLnR1cm5PcmRlciA9IC0xOyAvLyB1bmtub3duIHVudGlsIGdhbWUgc3RhcnRzXG5cblx0XHR0aGlzLnJvbGUgPSAndW5hc3NpZ25lZCc7IC8vIG9uZSBvZiAndW5hc3NpZ25lZCcsICdoaXRsZXInLCAnZmFzY2lzdCcsICdsaWJlcmFsJ1xuXHRcdHRoaXMuc3RhdGUgPSAnbm9ybWFsJzsgLy8gb25lIG9mICdub3JtYWwnLCAnaW52ZXN0aWdhdGVkJywgJ2RlYWQnXG5cdH1cblxuXHRnZXQgcGFydHkoKXtcblx0XHRpZih0aGlzLnJvbGUgPT09ICdoaXRsZXInKSByZXR1cm4gJ2Zhc2Npc3QnO1xuXHRcdGVsc2UgcmV0dXJuIHRoaXMucm9sZTtcblx0fVxufVxuXG5leHBvcnQgeyBHYW1lU3RhdGUsIFBsYXllciB9O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgeyBQbGF5ZXIgfSBmcm9tICcuL2dhbWVvYmplY3RzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxheWVyTWFuYWdlclxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHR0aGlzLmxvY2FsVXNlciA9IG51bGw7XG5cdFx0dGhpcy5wbGF5ZXJzID0gW107XG5cdH1cblxuXHRhY3F1aXJlTG9jYWxVc2VyKClcblx0e1xuXHRcdGlmKHdpbmRvdy5hbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudClcblx0XHR7XG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHt9O1xuXG5cdFx0XHQvLyBnZXQgdGhlIGxvY2FsIHVzZXIgaWQgYW5kIG5hbWVcblx0XHRcdGFsdHNwYWNlLmdldFVzZXIoKS50aGVuKCh1c2VyID0+IHtcblx0XHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLmxvY2FsVXNlciwgdXNlcik7XG5cdFx0XHR9KS5iaW5kKHRoaXMpKTtcblxuXHRcdFx0Ly8gZ2V0IHRoZSB1c2VyIHRyYWNraW5nIHNrZWxldG9uXG5cdFx0XHRhbHRzcGFjZS5nZXRUaHJlZUpTVHJhY2tpbmdTa2VsZXRvbigpLnRoZW4oKHRzID0+IHtcblx0XHRcdFx0dGhpcy5sb2NhbFVzZXIuc2tlbGV0b24gPSB0cztcblx0XHRcdFx0U0guYWRkKHRzKTtcblx0XHRcdH0pLmJpbmQodGhpcykpO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0Ly8gZmFrZSB1c2VyIGRhdGFcblx0XHRcdHRoaXMubG9jYWxVc2VyID0ge1xuXHRcdFx0XHR1c2VySWQ6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDApLFxuXHRcdFx0XHRpc01vZGVyYXRvcjogZmFsc2Vcblx0XHRcdH07XG5cdFx0XHR0aGlzLmxvY2FsVXNlci5kaXNwbGF5TmFtZSA9ICdXZWIgVXNlciAnK3RoaXMubG9jYWxVc2VyLnVzZXJJZDtcblx0XHR9XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBQTSBmcm9tICcuL3BsYXllcm1hbmFnZXInO1xuXG5jbGFzcyBCZWhhdmlvclxue1xuXHRjb25zdHJ1Y3Rvcih0eXBlKXtcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xuXHR9XG5cblx0YXdha2Uob2JqKXtcblx0XHR0aGlzLm9iamVjdDNEID0gb2JqO1xuXHR9XG5cblx0c3RhcnQoKXsgfVxuXG5cdHVwZGF0ZShkVCl7IH1cblxuXHRkaXNwb3NlKCl7IH1cbn1cblxuY2xhc3MgQlN5bmMgZXh0ZW5kcyBCZWhhdmlvclxue1xuXHRjb25zdHJ1Y3RvcihldmVudE5hbWUpXG5cdHtcblx0XHRzdXBlcignQlN5bmMnKTtcblx0XHR0aGlzLl9zID0gU0guc29ja2V0O1xuXG5cdFx0Ly8gbGlzdGVuIGZvciB1cGRhdGUgZXZlbnRzXG5cdFx0dGhpcy5ob29rID0gdGhpcy5fcy5vbihldmVudE5hbWUsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLmV2ZW50TmFtZSA9IGV2ZW50TmFtZTtcblx0XHR0aGlzLm93bmVyID0gJ3Vub3duZWQnO1xuXHR9XG5cblx0dXBkYXRlRnJvbVNlcnZlcihkYXRhKVxuXHR7XG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XG5cdFx0dGhpcy5vYmplY3QzRC5yb3RhdGlvbi5mcm9tQXJyYXkoZGF0YSwgMyk7XG5cdH1cblxuXHR0YWtlT3duZXJzaGlwKClcblx0e1xuXHRcdGlmKFBNLmxvY2FsVXNlciAmJiBQTS5sb2NhbFVzZXIudXNlcklkKVxuXHRcdFx0dGhpcy5vd25lciA9IFBNLmxvY2FsVXNlci51c2VySWQ7XG5cdH1cblxuXHR1cGRhdGUoZFQpXG5cdHtcblx0XHRpZihQTS5sb2NhbFVzZXIgJiYgUE0ubG9jYWxVc2VyLnNrZWxldG9uICYmIFBNLmxvY2FsVXNlci51c2VySWQgPT09IHRoaXMub3duZXIpXG5cdFx0e1xuXHRcdFx0bGV0IGogPSBQTS5sb2NhbFVzZXIuc2tlbGV0b24uZ2V0Sm9pbnQoJ0hlYWQnKTtcblx0XHRcdHRoaXMuX3MuZW1pdCh0aGlzLmV2ZW50TmFtZSwgWy4uLmoucG9zaXRpb24udG9BcnJheSgpLCAuLi5qLnJvdGF0aW9uLnRvQXJyYXkoKV0pO1xuXHRcdH1cblx0fVxuXG59XG5cbmV4cG9ydCB7IEJlaGF2aW9yLCBCU3luYyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgeyBCZWhhdmlvciB9IGZyb20gJy4vYmVoYXZpb3InO1xuXG5jbGFzcyBBbmltYXRlIGV4dGVuZHMgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IoLy97cGFyZW50LCBwb3MsIHF1YXQsIHNjYWxlLCBtYXRyaXgsIGR1cmF0aW9uLCBjYWxsYmFja31cblx0XHR7cGFyZW50PW51bGwsIHBvcz1udWxsLCBxdWF0PW51bGwsIHNjYWxlPW51bGwsIG1hdHJpeD1udWxsLCBkdXJhdGlvbj02MDAsIGNhbGxiYWNrPSgpPT57fX0pXG5cdHtcblx0XHRzdXBlcignQW5pbWF0ZScpO1xuXHRcdFxuXHRcdGlmKG1hdHJpeClcblx0XHR7XG5cdFx0XHQvLyBleHRyYWN0IHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlIGZyb20gbWF0cml4XG5cdFx0XHRwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXHRcdFx0cXVhdCA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cdFx0XHRzY2FsZSA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cdFx0XHRtYXRyaXguZGVjb21wb3NlKHBvcywgcXVhdCwgc2NhbGUpO1xuXHRcdH1cblxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywge3BhcmVudCwgcG9zLCBxdWF0LCBzY2FsZSwgZHVyYXRpb24sIGNhbGxiYWNrfSk7XG5cdH1cblxuXHRhd2FrZShvYmopXG5cdHtcblx0XHRzdXBlci5hd2FrZShvYmopO1xuXG5cdFx0Ly8gc2h1ZmZsZSBoaWVyYXJjaHksIGJ1dCBrZWVwIHdvcmxkIHRyYW5zZm9ybSB0aGUgc2FtZVxuXHRcdGlmKHRoaXMucGFyZW50ICYmIHRoaXMucGFyZW50ICE9PSBvYmoucGFyZW50KVxuXHRcdHtcblx0XHRcdG9iai5hcHBseU1hdHJpeChvYmoucGFyZW50Lm1hdHJpeFdvcmxkKTtcblx0XHRcdGxldCBtYXQgPSBuZXcgVEhSRUUuTWF0cml4NCgpLmdldEludmVyc2UodGhpcy5wYXJlbnQubWF0cml4V29ybGQpO1xuXHRcdFx0b2JqLmFwcGx5TWF0cml4KG1hdCk7XG5cblx0XHRcdHRoaXMucGFyZW50LmFkZChvYmopO1xuXHRcdH1cblxuXHRcdC8vIHJlYWQgaW5pdGlhbCBwb3NpdGlvbnNcblx0XHR0aGlzLmluaXRpYWxQb3MgPSBvYmoucG9zaXRpb24uY2xvbmUoKTtcblx0XHR0aGlzLmluaXRpYWxRdWF0ID0gb2JqLnF1YXRlcm5pb24uY2xvbmUoKTtcblx0XHR0aGlzLmluaXRpYWxTY2FsZSA9IG9iai5zY2FsZS5jbG9uZSgpO1xuXHRcdHRoaXMuc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblx0fVxuXG5cdHVwZGF0ZSgpXG5cdHtcblx0XHQvLyBjb21wdXRlIGVhc2Utb3V0IGJhc2VkIG9uIGR1cmF0aW9uXG5cdFx0bGV0IG1peCA9IChEYXRlLm5vdygpLXRoaXMuc3RhcnRUaW1lKSAvIHRoaXMuZHVyYXRpb247XG5cdFx0bGV0IGVhc2UgPSBUV0VFTiA/IFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0IDogbiA9PiBuKigyLW4pO1xuXHRcdG1peCA9IG1peCA8IDEgPyBlYXNlKG1peCkgOiAxO1xuXG5cdFx0Ly8gYW5pbWF0ZSBwb3NpdGlvbiBpZiByZXF1ZXN0ZWRcblx0XHRpZiggdGhpcy5wb3MgKXtcblx0XHRcdHRoaXMub2JqZWN0M0QucG9zaXRpb24ubGVycFZlY3RvcnModGhpcy5pbml0aWFsUG9zLCB0aGlzLnBvcywgbWl4KTtcblx0XHR9XG5cblx0XHQvLyBhbmltYXRlIHJvdGF0aW9uIGlmIHJlcXVlc3RlZFxuXHRcdGlmKCB0aGlzLnF1YXQgKXtcblx0XHRcdFRIUkVFLlF1YXRlcm5pb24uc2xlcnAodGhpcy5pbml0aWFsUXVhdCwgdGhpcy5xdWF0LCB0aGlzLm9iamVjdDNELnF1YXRlcm5pb24sIG1peClcblx0XHR9XG5cblx0XHQvLyBhbmltYXRlIHNjYWxlIGlmIHJlcXVlc3RlZFxuXHRcdGlmKCB0aGlzLnNjYWxlICl7XG5cdFx0XHR0aGlzLm9iamVjdDNELnNjYWxlLmxlcnBWZWN0b3JzKHRoaXMuaW5pdGlhbFNjYWxlLCB0aGlzLnNjYWxlLCBtaXgpO1xuXHRcdH1cblxuXHRcdC8vIHRlcm1pbmF0ZSBhbmltYXRpb24gd2hlbiBkb25lXG5cdFx0aWYobWl4ID49IDEpe1xuXHRcdFx0dGhpcy5vYmplY3QzRC5yZW1vdmVCZWhhdmlvcih0aGlzKTtcblx0XHRcdHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLm9iamVjdDNEKTtcblx0XHR9XG5cdH1cbn1cblxuQW5pbWF0ZS5zdGFydCA9ICh0YXJnZXQsIG9wdHMpID0+XG57XG5cdGxldCBvbGRBbmltID0gdGFyZ2V0LmdldEJlaGF2aW9yQnlUeXBlKCdBbmltYXRlJyk7XG5cdGlmKG9sZEFuaW0pe1xuXHRcdG9sZEFuaW0uY29uc3RydWN0b3Iob3B0cyk7XG5cdFx0b2xkQW5pbS5hd2FrZSh0YXJnZXQpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHRhcmdldC5hZGRCZWhhdmlvciggbmV3IEFuaW1hdGUob3B0cykgKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBBbmltYXRlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5cbi8vIGVudW0gY29uc3RhbnRzXG5sZXQgVHlwZXMgPSBPYmplY3QuZnJlZXplKHtcblx0UE9MSUNZX0xJQkVSQUw6IDAsXG5cdFBPTElDWV9GQVNDSVNUOiAxLFxuXHRST0xFX0xJQkVSQUw6IDIsXG5cdFJPTEVfRkFTQ0lTVDogMyxcblx0Uk9MRV9ISVRMRVI6IDQsXG5cdFBBUlRZX0xJQkVSQUw6IDUsXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXG5cdEpBOiA3LFxuXHRORUlOOiA4LFxuXHRCTEFOSzogOSxcblx0Q1JFRElUUzogMTBcbn0pO1xuXG5mdW5jdGlvbiBkaW1zVG9VVih7c2lkZSwgbGVmdCwgcmlnaHQsIHRvcCwgYm90dG9tfSlcbntcblx0aWYoc2lkZSlcblx0XHRyZXR1cm4gW1tcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHRvcCwgbGVmdCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIGxlZnQpLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIodG9wLCByaWdodClcblx0XHRdLFtcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGJvdHRvbSwgbGVmdCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIHJpZ2h0KSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHRvcCwgcmlnaHQpXG5cdFx0XV07XG5cdGVsc2Vcblx0XHRyZXR1cm4gW1tcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIHRvcCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihsZWZ0LCBib3R0b20pLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIocmlnaHQsIHRvcClcblx0XHRdLFtcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIGJvdHRvbSksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihyaWdodCwgYm90dG9tKSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCB0b3ApXG5cdFx0XV07XG59XG5cbmZ1bmN0aW9uIGdldFVWcyh0eXBlKVxue1xuXHRsZXQgZGltcyA9IHtsZWZ0OiAwLCByaWdodDogMSwgYm90dG9tOiAwLCB0b3A6IDF9O1xuXG5cdHN3aXRjaCh0eXBlKVxuXHR7XG5cdGNhc2UgVHlwZXMuUE9MSUNZX0xJQkVSQUw6XG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjgzNCwgcmlnaHQ6IDAuOTk2LCB0b3A6IDAuNzU0LCBib3R0b206IDAuOTk3fTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5QT0xJQ1lfRkFTQ0lTVDpcblx0XHRkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuNjYsIHJpZ2h0OiAwLjgyMiwgdG9wOiAwLjc1NCwgYm90dG9tOiAwLjk5Nn07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUk9MRV9MSUJFUkFMOlxuXHRcdGRpbXMgPSB7bGVmdDogMC41MDUsIHJpZ2h0OiAwLjc0NiwgdG9wOiAwLjk5NiwgYm90dG9tOiAwLjY1fTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5ST0xFX0ZBU0NJU1Q6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjUwNSwgcmlnaHQ6IDAuNzQ2LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUk9MRV9ISVRMRVI6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjc1NCwgcmlnaHQ6IDAuOTk2LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUEFSVFlfTElCRVJBTDpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMjU1LCByaWdodDogMC40OTUsIHRvcDogMC45OTYsIGJvdHRvbTogMC42NX07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUEFSVFlfRkFTQ0lTVDpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMjU1LCByaWdodDogMC40OTUsIHRvcDogMC42NDUsIGJvdHRvbTogMC4zfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5KQTpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMDA1LCByaWdodDogMC4yNDQsIHRvcDogMC45OTIsIGJvdHRvbTogMC42NTN9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLk5FSU46XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjAwNiwgcmlnaHQ6IDAuMjQzLCB0b3A6IDAuNjQyLCBib3R0b206IDAuMzAyfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5DUkVESVRTOlxuXHRcdGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC4wMTUsIHJpZ2h0OiAwLjI3NiwgdG9wOiAwLjM5NywgYm90dG9tOiAwLjc2NX07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuQkxBTks6XG5cdGRlZmF1bHQ6XG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjAyMiwgcmlnaHQ6IC4wMjIrMC4yNDcsIHRvcDogMC4wMjEsIGJvdHRvbTogLjAyMSswLjM1NDN9O1xuXHRcdGJyZWFrO1xuXHR9XG5cblx0cmV0dXJuIGRpbXNUb1VWKGRpbXMpO1xufVxuXG5cbmNsYXNzIENhcmQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3Rvcih0eXBlID0gVHlwZXMuQkxBTkssIGRvdWJsZVNpZGVkID0gdHJ1ZSlcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyBjcmVhdGUgdGhlIGNhcmQgZmFjZXNcblx0XHRsZXQgZnJvbnRHZW8gPSBuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSguNzE1LCAxKTtcblx0XHRsZXQgYmFja0dlbyA9IGZyb250R2VvLmNsb25lKCk7XG5cdFx0bGV0IGNhcmRNYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogQXNzZXRNYW5hZ2VyLmNhY2hlLnRleHR1cmVzLmNhcmRzfSk7XG5cdFx0bGV0IGZyb250ID0gbmV3IFRIUkVFLk1lc2goZnJvbnRHZW8sIGNhcmRNYXQpO1xuXHRcdGxldCBiYWNrID0gbmV3IFRIUkVFLk1lc2goYmFja0dlbywgY2FyZE1hdCk7XG5cdFx0YmFjay5wb3NpdGlvbi5zZXQoMC4wMDEsIDAsIDApO1xuXHRcdGZyb250LnBvc2l0aW9uLnNldCgtMC4wMDEsIDAsIDApO1xuXHRcdGJhY2sucm90YXRlWShNYXRoLlBJKTtcblxuXHRcdC8vIHNldCB0aGUgZmFjZXMgdG8gdGhlIGNvcnJlY3QgcGFydCBvZiB0aGUgdGV4dHVyZVxuXHRcdGZyb250Lmdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnMgPSBbZ2V0VVZzKHR5cGUpXTtcblx0XHRiYWNrLmdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnMgPSBbZ2V0VVZzKCBkb3VibGVTaWRlZCA/IHR5cGUgOiBUeXBlcy5CTEFOSyApXTtcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjcpO1xuXHRcdHRoaXMuYWRkKGZyb250LCBiYWNrKTtcblx0fVxuXG5cdGhpZGUoKXtcblx0XHR0aGlzLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IGZhbHNlOyB9KTtcblx0fVxuXG5cdHNob3coKXtcblx0XHR0aGlzLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IHRydWU7IH0pO1xuXHR9XG59XG5cbmNsYXNzIEJsYW5rQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3RvcigpeyBzdXBlcigpOyB9XG59XG5cbmNsYXNzIENyZWRpdHNDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuQ1JFRElUUyk7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXG5cdFx0ZnVuY3Rpb24gc2V0VmlzaWJpbGl0eSh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSl7XG5cdFx0XHRpZihzdGF0ZSA9PT0gJ3NldHVwJylcblx0XHRcdFx0c2VsZi5jaGlsZHJlbi5mb3JFYWNoKG8gPT4geyBvLnZpc2libGUgPSB0cnVlOyB9KTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0c2VsZi5jaGlsZHJlbi5mb3JFYWNoKG8gPT4geyBvLnZpc2libGUgPSBmYWxzZTsgfSk7XG5cdFx0fVxuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgc2V0VmlzaWJpbGl0eSk7XG5cdH1cbn1cblxuY2xhc3MgTGliZXJhbFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfTElCRVJBTCwgZmFsc2UpO1xuXHR9XG5cdGdvVG9Qb3NpdGlvbihzcG90ID0gMClcblx0e1xuXHRcdHNwb3QgPSBNYXRoLm1heCgwLCBNYXRoLm1pbig0LCBzcG90KSk7XG5cdFx0bGV0IHMgPSBMaWJlcmFsUG9saWN5Q2FyZC5zcG90cztcblx0XHRBbmltYXRlLnN0YXJ0KHRoaXMsIHtwYXJlbnQ6IEFzc2V0TWFuYWdlci5yb290LCBwb3M6IHNbJ3Bvc18nK3Nwb3RdLCBxdWF0OiBzLnF1YXQsIHNjYWxlOiBzLnNjYWxlfSk7XG5cdH1cbn1cblxuTGliZXJhbFBvbGljeUNhcmQuc3BvdHMgPSB7XG5cdHBvc18wOiBuZXcgVEhSRUUuVmVjdG9yMygwLjUzMywgMC43NiwgLTAuMzM2KSxcblx0cG9zXzE6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMjYzLCAwLjc2LCAtMC4zMzYpLFxuXHRwb3NfMjogbmV3IFRIUkVFLlZlY3RvcjMoLS4wMDcsIDAuNzYsIC0wLjMzNiksXG5cdHBvc18zOiBuZXcgVEhSRUUuVmVjdG9yMygtLjI3OSwgMC43NiwgLTAuMzM2KSxcblx0cG9zXzQ6IG5ldyBUSFJFRS5WZWN0b3IzKC0uNTUyLCAwLjc2LCAtMC4zMzYpLFxuXHRxdWF0OiBuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAwLjcwNzEwNjc4MTE4NjU0NzUsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMCksXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjcsIDAuNywgMC43KVxufVxuXG5jbGFzcyBGYXNjaXN0UG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlBPTElDWV9GQVNDSVNULCBmYWxzZSk7XG5cdH1cblx0Z29Ub1Bvc2l0aW9uKHNwb3QgPSAwKVxuXHR7XG5cdFx0c3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDUsIHNwb3QpKTtcblx0XHRsZXQgcyA9IEZhc2Npc3RQb2xpY3lDYXJkLnNwb3RzO1xuXHRcdEFuaW1hdGUuc3RhcnQodGhpcywge3BhcmVudDogQXNzZXRNYW5hZ2VyLnJvb3QsIHBvczogc1sncG9zXycrc3BvdF0sIHF1YXQ6IHMucXVhdCwgc2NhbGU6IHMuc2NhbGV9KTtcblx0fVxufVxuXG5GYXNjaXN0UG9saWN5Q2FyZC5zcG90cyA9IHtcblx0cG9zXzA6IG5ldyBUSFJFRS5WZWN0b3IzKC0uNjg3LCAwLjc2LCAwLjM0MSksXG5cdHBvc18xOiBuZXcgVEhSRUUuVmVjdG9yMygtLjQxNywgMC43NiwgMC4zNDEpLFxuXHRwb3NfMjogbmV3IFRIUkVFLlZlY3RvcjMoLS4xNDYsIDAuNzYsIDAuMzQxKSxcblx0cG9zXzM6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMTI3LCAwLjc2LCAwLjM0MSksXG5cdHBvc180OiBuZXcgVEhSRUUuVmVjdG9yMygwLjQwMCwgMC43NiwgMC4zNDEpLFxuXHRwb3NfNTogbmV3IFRIUkVFLlZlY3RvcjMoMC42NzMsIDAuNzYsIDAuMzQxKSxcblx0cXVhdDogbmV3IFRIUkVFLlF1YXRlcm5pb24oLTAuNzA3MTA2NzgxMTg2NTQ3NSwgMCwgMCwgMC43MDcxMDY3ODExODY1NDc1KSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNywgMC43LCAwLjcpXG59XG5cbmNsYXNzIExpYmVyYWxSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfTElCRVJBTCwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIEZhc2Npc3RSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfRkFTQ0lTVCwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIEhpdGxlclJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9ISVRMRVIsIGZhbHNlKTtcblx0fVxufVxuXG5jbGFzcyBMaWJlcmFsUGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfTElCRVJBTCwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIEZhc2Npc3RQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9GQVNDSVNULCBmYWxzZSk7XG5cdH1cbn1cblxuY2xhc3MgSmFDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuSkEsIGZhbHNlKTtcblx0XHR0aGlzLmNoaWxkcmVuWzBdLnJvdGF0ZVooLU1hdGguUEkvMik7XG5cdFx0dGhpcy5jaGlsZHJlblsxXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xuXHR9XG59XG5cbmNsYXNzIE5laW5DYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuTkVJTiwgZmFsc2UpO1xuXHRcdHRoaXMuY2hpbGRyZW5bMF0ucm90YXRlWigtTWF0aC5QSS8yKTtcblx0XHR0aGlzLmNoaWxkcmVuWzFdLnJvdGF0ZVooLU1hdGguUEkvMik7XG5cdH1cbn1cblxuXG5leHBvcnQge1xuXHRDYXJkLCBUeXBlcywgQmxhbmtDYXJkLCBDcmVkaXRzQ2FyZCxcblx0TGliZXJhbFBvbGljeUNhcmQsIEZhc2Npc3RQb2xpY3lDYXJkLCBMaWJlcmFsUm9sZUNhcmQsIEZhc2Npc3RSb2xlQ2FyZCxcblx0SGl0bGVyUm9sZUNhcmQsIExpYmVyYWxQYXJ0eUNhcmQsIEZhc2Npc3RQYXJ0eUNhcmQsIEphQ2FyZCwgTmVpbkNhcmRcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5jbGFzcyBQcmVzaWRlbnRIYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50b3BoYXQ7XG5cdFx0dGhpcy5tb2RlbC5wb3NpdGlvbi5zZXQoMCwwLDApO1xuXHRcdHRoaXMubW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJLzIsIDAsIDApO1xuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgKChlKSA9PiB7XG5cdFx0XHRpZihlLmRhdGEuZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJykgdGhpcy5pZGxlKCk7XG5cdFx0fSkuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRpZGxlKCl7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMC43NSwgMCwgMCk7XG5cdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgTWF0aC5QSS8yLCAwKTtcblx0XHRTSC5pZGxlUm9vdC5hZGQodGhpcyk7XG5cdH1cbn07XG5cbmNsYXNzIENoYW5jZWxsb3JIYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy52aXNvcmNhcDtcblx0XHR0aGlzLm1vZGVsLnBvc2l0aW9uLnNldCgwLDAuMDQsMCk7XG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoKGUpID0+IHtcblx0XHRcdGlmKGUuZGF0YS5nYW1lLnN0YXRlID09PSAnc2V0dXAnKSB0aGlzLmlkbGUoKTtcblx0XHR9KS5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdGlkbGUoKXtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgtMC43NSwgMCwgMCk7XG5cdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEkvMiwgMCk7XG5cdFx0U0guaWRsZVJvb3QuYWRkKHRoaXMpO1xuXHR9XG59O1xuXG5leHBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuZnVuY3Rpb24gZ2V0R2FtZUlkKClcbntcblx0Ly8gZmlyc3QgY2hlY2sgdGhlIHVybFxuXHRsZXQgcmUgPSAvWz8mXWdhbWVJZD0oW14mXSspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRpZihyZSl7XG5cdFx0cmV0dXJuIHJlWzFdO1xuXHR9XG5cdGVsc2UgaWYoYWx0c3BhY2UgJiYgYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdHJldHVybiBTSC5lbnYuc2lkO1xuXHR9XG5cdGVsc2Uge1xuXHRcdGxldCBpZCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDAgKTtcblx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZSgnP2dhbWVJZD0nK2lkKTtcblx0fVxufVxuXG5mdW5jdGlvbiBwYXJzZUNTVihzdHIpe1xuXHRpZighc3RyKSByZXR1cm4gW107XG5cdGVsc2UgcmV0dXJuIHN0ci5zcGxpdCgnLCcpO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVF1ZXN0aW9uKHRleHQsIHRleHR1cmUgPSBudWxsKVxue1xuXHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XG5cblx0Ly8gc2V0IHVwIGNhbnZhc1xuXHRsZXQgYm1wO1xuXHRpZighdGV4dHVyZSl7XG5cdFx0Ym1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0Ym1wLndpZHRoID0gNTEyO1xuXHRcdGJtcC5oZWlnaHQgPSAyNTY7XG5cdH1cblx0ZWxzZSB7XG5cdFx0Ym1wID0gdGV4dHVyZS5pbWFnZTtcblx0fVxuXG5cdGxldCBnID0gYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdGcuY2xlYXJSZWN0KDAsIDAsIDUxMiwgMjU2KTtcblx0Zy50ZXh0QWxpZ24gPSAnY2VudGVyJztcblx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXG5cdC8vIHdyaXRlIHRleHRcblx0Zy5mb250ID0gJ2JvbGQgNTBweCAnK2ZvbnRTdGFjaztcblx0bGV0IGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG5cdGZvcihsZXQgaT0wOyBpPGxpbmVzLmxlbmd0aDsgaSsrKXtcblx0XHRnLmZpbGxUZXh0KGxpbmVzW2ldLCAyNTYsIDUwKzU1KmkpO1xuXHR9XG5cblx0aWYodGV4dHVyZSl7XG5cdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdFx0cmV0dXJuIHRleHR1cmU7XG5cdH1cblx0ZWxzZSB7XG5cdFx0cmV0dXJuIG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKGJtcCk7XG5cdH1cbn1cblxuZXhwb3J0IHsgZ2V0R2FtZUlkLCBwYXJzZUNTViwgZ2VuZXJhdGVRdWVzdGlvbiB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCB7IHBhcnNlQ1NWIH0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVUYWJsZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyBzYXZlIHJlZmVyZW5jZXMgdG8gdGhlIHRleHR1cmVzXG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX3NtYWxsLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbWVkLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbGFyZ2Vcblx0XHRdO1xuXG5cdFx0Ly8gYWRkIHRhYmxlIGFzc2V0XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50YWJsZS5jaGlsZHJlblswXTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCAwKTtcblx0XHR0aGlzLm1vZGVsLnNjYWxlLnNldFNjYWxhcigxLjI1KTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblxuXHRcdC8vIHNldCB0aGUgZGVmYXVsdCBtYXRlcmlhbFxuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwubWFwID0gdGhpcy50ZXh0dXJlc1swXTtcblxuXHRcdC8vIHBvc2l0aW9uIHRhYmxlXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMS4wLCAwKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLmNoYW5nZU1vZGUuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRjaGFuZ2VNb2RlKHtkYXRhOiB7Z2FtZToge3N0YXRlLCB0dXJuT3JkZXJ9fX0pXG5cdHtcblx0XHRpZihzdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHRsZXQgaWRzID0gcGFyc2VDU1YodHVybk9yZGVyKTtcblx0XHRcdGlmKGlkcy5sZW5ndGggPCAyKVxuXHRcdFx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcCA9IHRoaXMudGV4dHVyZXNbMF07XG5cdFx0XHRlbHNlIGlmKGlkcy5sZW5ndGggPCAzKVxuXHRcdFx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcCA9IHRoaXMudGV4dHVyZXNbMV07XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRoaXMubW9kZWwubWF0ZXJpYWwubWFwID0gdGhpcy50ZXh0dXJlc1syXTtcblx0XHR9XG5cdH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IHsgcGFyc2VDU1YgfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTmFtZXBsYXRlIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xuXG5cdFx0Ly8gYWRkIDNkIG1vZGVsXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy5uYW1lcGxhdGUuY2hpbGRyZW5bMF0uY2xvbmUoKTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCBNYXRoLlBJLzIpO1xuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xuXG5cdFx0Ly8gZ2VuZXJhdGUgbWF0ZXJpYWxcblx0XHR0aGlzLmJtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMuYm1wLndpZHRoID0gTmFtZXBsYXRlLnRleHR1cmVTaXplO1xuXHRcdHRoaXMuYm1wLmhlaWdodCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAvIDI7XG5cdFx0dGhpcy5tb2RlbC5tYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG5cdFx0XHRtYXA6IG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKHRoaXMuYm1wKVxuXHRcdH0pO1xuXG5cdFx0Ly8gY3JlYXRlIGxpc3RlbmVyIHByb3hpZXNcblx0XHR0aGlzLl9ob3ZlckJlaGF2aW9yID0gbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJDb2xvcih7XG5cdFx0XHRjb2xvcjogbmV3IFRIUkVFLkNvbG9yKDB4ZmZhOGE4KVxuXHRcdH0pO1xuXHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0dGhpcy5tb2RlbC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVUZXh0KHRleHQpXG5cdHtcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcblxuXHRcdC8vIHNldCB1cCBjYW52YXNcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdFx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xuXHRcdGcuZmlsbFN0eWxlID0gJyMyMjInO1xuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XG5cdFx0Zy5mb250ID0gYGJvbGQgJHtmb250U2l6ZX1weCAke2ZvbnRTdGFja31gO1xuXHRcdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGcuZmlsbFRleHQodGV4dCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLzIsICgwLjQyIC0gMC4xMikqKE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yKSk7XG5cblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdH1cblxuXG5cblx0Y2xpY2soZSlcblx0e1xuXHRcdGlmKCF0aGlzLnNlYXQub3duZXIgJiYgU0guZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJylcblx0XHRcdHRoaXMucmVxdWVzdEpvaW4oKTtcblx0XHRlbHNlIGlmKHRoaXMuc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxuXHRcdFx0dGhpcy5yZXF1ZXN0TGVhdmUoKTtcblx0fVxuXG5cdHJlcXVlc3RKb2luKClcblx0e1xuXHRcdFNILnNvY2tldC5lbWl0KCdyZXF1ZXN0Sm9pbicsIE9iamVjdC5hc3NpZ24oe3NlYXROdW06IHRoaXMuc2VhdC5zZWF0TnVtfSwgU0gubG9jYWxVc2VyKSk7XG5cdH1cblxuXHRyZXF1ZXN0TGVhdmUoKVxuXHR7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXHRcdGlmKCFzZWxmLnF1ZXN0aW9uKVxuXHRcdHtcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWxmLnNlYXQuYmFsbG90LmFza1F1ZXN0aW9uKCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byBsZWF2ZT8nLCAnbG9jYWxfbGVhdmUnKVxuXHRcdFx0LnRoZW4oY29uZmlybSA9PiB7XG5cdFx0XHRcdGlmKGNvbmZpcm0pe1xuXHRcdFx0XHRcdFNILnNvY2tldC5lbWl0KCdsZWF2ZScsIFNILmxvY2FsVXNlci5pZCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xuXHRcdH1cblx0fVxufVxuXG5OYW1lcGxhdGUudGV4dHVyZVNpemUgPSAyNTY7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qXG4qIEhhdmUgdG8gY29tcGxldGVseSByZWltcGxlbWVudCBwcm9taXNlcyBmcm9tIHNjcmF0Y2ggZm9yIHRoaXMgOihcbiogVGhpcyBjbGFzcyBpcyBhIHByb21pc2UgdGhhdCB0cmFja3MgZGVwZW5kZW5jaWVzLCBhbmQgZXZhbHVhdGVzXG4qIHdoZW4gdGhleSBhcmUgbWV0LiBJdCdzIGFsc28gY2FuY2VsbGFibGUsIGNhbGxpbmcgaXRzIGRlcGVuZGVudHNcbiogYXMgc29vbiBhcyBpdHMgZGVwZW5kZW5jaWVzIGFyZSBtZXQuXG4qL1xuY2xhc3MgQ2FzY2FkaW5nUHJvbWlzZVxue1xuICAgIGNvbnN0cnVjdG9yKHByZXJlcVByb21pc2UsIGV4ZWNGbiwgY2xlYW51cEZuKVxuICAgIHtcbiAgICAgICAgLy8gc2V0IHVwIHN0YXRlIGluZm9ybWF0aW9uXG4gICAgICAgIHRoaXMuc3RhdGUgPSAncGVuZGluZyc7XG4gICAgICAgIHRoaXMucHJlcmVxUHJvbWlzZSA9IHByZXJlcVByb21pc2UgfHwgUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIHRoaXMuZXhlY0ZuID0gZXhlY0ZuO1xuICAgICAgICB0aGlzLmNsZWFudXBGbiA9IGNsZWFudXBGbjtcblxuICAgICAgICAvLyB0cmFjayBjYWxsYmFja3NcbiAgICAgICAgdGhpcy5fcmVzb2x2ZUNhbGxiYWNrcyA9IFtdO1xuICAgICAgICB0aGlzLl9yZWplY3RDYWxsYmFja3MgPSBbXTtcbiAgICAgICAgdGhpcy5fZXhlY1R5cGUgPSBudWxsO1xuICAgICAgICB0aGlzLl9leGVjUmVzdWx0ID0gW107XG5cbiAgICAgICAgLy8gYmluZCBldmVudHNcbiAgICAgICAgbGV0IGNiID0gdGhpcy5fcHJlcmVxU2V0dGxlZC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnByZXJlcVByb21pc2UudGhlbihjYiwgY2IpO1xuICAgIH1cblxuICAgIF9wcmVyZXFTZXR0bGVkKCl7XG4gICAgICAgIGlmKHRoaXMuc3RhdGUgPT09ICdwZW5kaW5nJyl7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gJ3J1bm5pbmcnO1xuICAgICAgICAgICAgZnVuY3Rpb24gc2V0dGxlKHR5cGUpe1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiguLi5hcmdzKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXhlY1NldHRsZWQodHlwZSwgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmV4ZWNGbihcbiAgICAgICAgICAgICAgICBzZXR0bGUoJ3Jlc29sdmUnKS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgIHNldHRsZSgncmVqZWN0JykuYmluZCh0aGlzKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKHRoaXMuc3RhdGUgPT09ICdjYW5jZWxsZWQnKXtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSAnc2V0dGxlZCc7XG4gICAgICAgICAgICB0aGlzLl9yZXNvbHZlQ2FsbGJhY2tzLmZvckVhY2goY2IgPT4gY2IoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBfZXhlY1NldHRsZWQodHlwZSwgcmVzdWx0KXtcbiAgICAgICAgaWYodGhpcy5zdGF0ZSA9PT0gJ3J1bm5pbmcnKXtcbiAgICAgICAgICAgIHRoaXMuX2V4ZWNUeXBlID0gdHlwZTtcbiAgICAgICAgICAgIHRoaXMuX2V4ZWNSZXN1bHQgPSByZXN1bHQ7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gJ2NsZWFuaW5ndXAnO1xuICAgICAgICAgICAgdGhpcy5jbGVhbnVwRm4odGhpcy5fY2xlYW51cERvbmUuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBfY2xlYW51cERvbmUoKXtcbiAgICAgICAgaWYodGhpcy5zdGF0ZSA9PT0gJ2NsZWFuaW5ndXAnKXtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSAnc2V0dGxlZCc7XG4gICAgICAgICAgICBpZih0aGlzLl9leGVjVHlwZSA9PT0gJ3Jlc29sdmUnKXtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZXNvbHZlQ2FsbGJhY2tzLmZvckVhY2goXG4gICAgICAgICAgICAgICAgICAgIChjYiA9PiBjYiguLi50aGlzLl9leGVjUmVzdWx0KSkuYmluZCh0aGlzKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWplY3RDYWxsYmFja3MuZm9yRWFjaChcbiAgICAgICAgICAgICAgICAgICAgKGNiID0+IGNiKC4uLnRoaXMuX2V4ZWNSZXN1bHQpKS5iaW5kKHRoaXMpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNhbmNlbCgpe1xuICAgICAgICBpZih0aGlzLnN0YXRlID09PSAncnVubmluZycpe1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9ICdjbGVhbmluZ3VwJztcbiAgICAgICAgICAgIHRoaXMuY2xlYW51cEZuKHRoaXMuX2NsZWFudXBEb25lLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYodGhpcy5zdGF0ZSA9PT0gJ3BlbmRpbmcnKXtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSAnY2FuY2VsbGVkJztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoZW4oZG9uZUNiLCBlcnJDYilcbiAgICB7XG4gICAgICAgIGlmKHRoaXMuc3RhdGUgPT09ICdzZXR0bGVkJylcbiAgICAgICAge1xuICAgICAgICAgICAgaWYodGhpcy5fZXhlY1R5cGUgPT09ICdyZXNvbHZlJyl7XG4gICAgICAgICAgICAgICAgZG9uZUNiKC4uLnRoaXMuX2V4ZWNSZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZXJyQ2IoLi4udGhpcy5fZXhlY1Jlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZXNvbHZlQ2FsbGJhY2tzLnB1c2goZG9uZUNiKTtcbiAgICAgICAgICAgIGlmKGVyckNiKVxuICAgICAgICAgICAgICAgIHRoaXMuX3JlamVjdENhbGxiYWNrcy5wdXNoKGVyckNiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGNhdGNoKGNiKXtcbiAgICAgICAgaWYodGhpcy5zdGF0ZSA9PT0gJ3NldHRsZWQnKXtcbiAgICAgICAgICAgIGlmKHRoaXMuX2V4ZWNUeXBlID09PSAncmVqZWN0JylcbiAgICAgICAgICAgICAgICBjYiguLi50aGlzLl9leGVjUmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aGlzLl9yZWplY3RDYWxsYmFja3MucHVzaChjYik7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBDYXNjYWRpbmdQcm9taXNlO1xuIiwiJ3VzZSBzdHJpY3Q7J1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHsgSmFDYXJkLCBOZWluQ2FyZCB9IGZyb20gJy4vY2FyZCc7XG5pbXBvcnQgeyBnZW5lcmF0ZVF1ZXN0aW9uLCBwYXJzZUNTViB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IENhc2NhZGluZ1Byb21pc2UgZnJvbSAnLi9jYXNjYWRpbmdwcm9taXNlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFsbG90IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0RcbntcbiAgICBjb25zdHJ1Y3RvcihzZWF0KVxuICAgIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5zZWF0ID0gc2VhdDtcbiAgICAgICAgdGhpcy5xdWVzdGlvbnMgPSB7fTtcbiAgICAgICAgdGhpcy5sYXN0QXNrZWQgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuX3llc0NsaWNrSGFuZGxlciA9IG51bGw7XG4gICAgICAgIHRoaXMuX25vQ2xpY2tIYW5kbGVyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmphQ2FyZCA9IG5ldyBKYUNhcmQoKTtcbiAgICAgICAgdGhpcy5uZWluQ2FyZCA9IG5ldyBOZWluQ2FyZCgpO1xuICAgICAgICBbdGhpcy5qYUNhcmQsIHRoaXMubmVpbkNhcmRdLmZvckVhY2goYyA9PiB7XG4gICAgICAgICAgICBjLnBvc2l0aW9uLnNldChjIGluc3RhbmNlb2YgSmFDYXJkID8gLTAuMSA6IDAuMSwgLTAuMSwgMCk7XG4gICAgICAgICAgICBjLnJvdGF0aW9uLnNldCgwLjUsIE1hdGguUEksIDApO1xuICAgICAgICAgICAgYy5zY2FsZS5zZXRTY2FsYXIoMC4xNSk7XG4gICAgICAgICAgICBjLmhpZGUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYWRkKHRoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkKTtcblxuICAgICAgICBsZXQgZ2VvID0gbmV3IFRIUkVFLlBsYW5lQnVmZmVyR2VvbWV0cnkoMC40LCAwLjIpO1xuICAgICAgICBsZXQgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHt0cmFuc3BhcmVudDogdHJ1ZX0pO1xuICAgICAgICB0aGlzLnF1ZXN0aW9uID0gbmV3IFRIUkVFLk1lc2goZ2VvLCBtYXQpO1xuICAgICAgICB0aGlzLnF1ZXN0aW9uLnBvc2l0aW9uLnNldCgwLCAwLjA1LCAwKTtcbiAgICAgICAgdGhpcy5xdWVzdGlvbi5yb3RhdGlvbi5zZXQoMCwgTWF0aC5QSSwgMCk7XG4gICAgICAgIHRoaXMucXVlc3Rpb24udmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmFkZCh0aGlzLnF1ZXN0aW9uKTtcblxuICAgICAgICBTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdm90ZXNJblByb2dyZXNzJywgdGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcbiAgICB7XG4gICAgICAgIGxldCBzZWxmID0gdGhpcztcbiAgICAgICAgaWYoIXNlbGYuc2VhdC5vd25lcikgcmV0dXJuO1xuXG4gICAgICAgIGxldCB2aXBzID0gcGFyc2VDU1YoZ2FtZS52b3Rlc0luUHJvZ3Jlc3MpO1xuICAgICAgICBsZXQgdm90ZXNGaW5pc2hlZCA9IHBhcnNlQ1NWKFNILmdhbWUudm90ZXNJblByb2dyZXNzKS5maWx0ZXIoXG4gICAgICAgICAgICBlID0+ICF2aXBzLmluY2x1ZGVzKGUpXG4gICAgICAgICk7XG5cbiAgICAgICAgdmlwcy5mb3JFYWNoKHZJZCA9PlxuICAgICAgICB7XG4gICAgICAgICAgICBsZXQgYXNrZWQgPSBzZWxmLnF1ZXN0aW9uc1t2SWRdO1xuICAgICAgICAgICAgaWYoIWFza2VkKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGxldCBxdWVzdGlvblRleHQ7XG4gICAgICAgICAgICAgICAgaWYodm90ZXNbdklkXS50eXBlID09PSAnZWxlY3QnKXtcbiAgICAgICAgICAgICAgICAgICAgcXVlc3Rpb25UZXh0ID0gcGxheWVyc1t2b3Rlc1t2SWRdLnRhcmdldDFdLmRpc3BsYXlOYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICArICdcXG5mb3IgcHJlc2lkZW50IGFuZFxcbidcbiAgICAgICAgICAgICAgICAgICAgICAgICsgcGxheWVyc1t2b3Rlc1t2SWRdLnRhcmdldDJdLmRpc3BsYXlOYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICArICdcXG5mb3IgY2hhbmNlbGxvcj8nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2pvaW4nKXtcbiAgICAgICAgICAgICAgICAgICAgcXVlc3Rpb25UZXh0ID0gdm90ZXNbdklkXS5kYXRhICsgJ1xcbnRvIGpvaW4/JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdraWNrJyl7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXN0aW9uVGV4dCA9ICdLaWNrXFxuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgKyBwbGF5ZXJzW3ZvdGVzW3ZJZF0udGFyZ2V0MV0uZGlzcGxheU5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJz8nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNlbGYuYXNrUXVlc3Rpb24ocXVlc3Rpb25UZXh0LCB2SWQpXG4gICAgICAgICAgICAgICAgLnRoZW4oYW5zd2VyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgU0guc29ja2V0LmVtaXQoJ3ZvdGUnLCB2SWQsIFNILmxvY2FsVXNlci5pZCwgYW5zd2VyKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoKSA9PiBjb25zb2xlLmxvZygnVm90ZSBzY3J1YmJlZDonLCB2SWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdm90ZXNGaW5pc2hlZC5mb3JFYWNoKCh2SWQpID0+IHtcbiAgICAgICAgICAgIGlmKHNlbGYucXVlc3Rpb25zW3ZJZF0pXG4gICAgICAgICAgICAgICAgc2VsZi5xdWVzdGlvbnNbdklkXS5jYW5jZWwoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXNrUXVlc3Rpb24ocVRleHQsIGlkKVxuICAgIHtcbiAgICAgICAgbGV0IHNlbGYgPSB0aGlzO1xuICAgICAgICBsZXQgbmV3USA9IG5ldyBDYXNjYWRpbmdQcm9taXNlKHNlbGYucXVlc3Rpb25zW3NlbGYubGFzdEFza2VkXSxcbiAgICAgICAgICAgIChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSB0aGUgYW5zd2VyIGlzIHN0aWxsIHJlbGV2YW50XG4gICAgICAgICAgICAgICAgbGV0IGxhdGVzdFZvdGVzID0gcGFyc2VDU1YoU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGlmKCEvXmxvY2FsLy50ZXN0KGlkKSAmJiAhbGF0ZXN0Vm90ZXMuaW5jbHVkZXMoaWQpKXtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBob29rIHVwIHEvYSBjYXJkc1xuICAgICAgICAgICAgICAgIHNlbGYucXVlc3Rpb24ubWF0ZXJpYWwubWFwID0gZ2VuZXJhdGVRdWVzdGlvbihxVGV4dCwgdGhpcy5xdWVzdGlvbi5tYXRlcmlhbC5tYXApO1xuICAgICAgICAgICAgICAgIHNlbGYuamFDYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCh0cnVlKSk7XG4gICAgICAgICAgICAgICAgc2VsZi5uZWluQ2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQoZmFsc2UpKTtcblxuICAgICAgICAgICAgICAgIC8vIHNob3cgdGhlIGJhbGxvdFxuICAgICAgICAgICAgICAgIHNlbGYucXVlc3Rpb24udmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgc2VsZi5qYUNhcmQuc2hvdygpO1xuICAgICAgICAgICAgICAgIHNlbGYubmVpbkNhcmQuc2hvdygpO1xuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVzcG9uZChhbnN3ZXIpe1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVyKClcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIG9ubHkgdGhlIG93bmVyIG9mIHRoZSBiYWxsb3QgaXMgYW5zd2VyaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzZWxmLnNlYXQub3duZXIgIT09IFNILmxvY2FsVXNlci5pZCkgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBzdGlsbCBtYXR0ZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGF0ZXN0Vm90ZXMgPSBwYXJzZUNTVihTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZighL15sb2NhbC8udGVzdChpZCkgJiYgIWxhdGVzdFZvdGVzLmluY2x1ZGVzKGlkKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZihhbnN3ZXIpIHNlbGYuX3llc0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XG4gICAgICAgICAgICAgICAgICAgIGVsc2Ugc2VsZi5fbm9DbGlja0hhbmRsZXIgPSBoYW5kbGVyO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKGRvbmUpID0+IHtcbiAgICAgICAgICAgICAgICBkZWxldGUgc2VsZi5xdWVzdGlvbnNbaWRdO1xuICAgICAgICAgICAgICAgIGlmKHNlbGYubGFzdEFza2VkID09PSBpZClcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sYXN0QXNrZWQgPSBudWxsO1xuXG4gICAgICAgICAgICAgICAgLy8gaGlkZSB0aGUgcXVlc3Rpb25cbiAgICAgICAgICAgICAgICBzZWxmLmphQ2FyZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgc2VsZi5uZWluQ2FyZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgc2VsZi5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgc2VsZi5qYUNhcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCBzZWxmLl95ZXNDbGlja0hhbmRsZXIpO1xuICAgICAgICAgICAgICAgIHNlbGYubmVpbkNhcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCBzZWxmLl9ub0NsaWNrSGFuZGxlcik7XG4gICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIC8vIGFkZCBxdWVzdGlvbiB0byBxdWV1ZSwgcmVtb3ZlIHdoZW4gZG9uZVxuICAgICAgICBzZWxmLnF1ZXN0aW9uc1tpZF0gPSBuZXdRO1xuICAgICAgICBzZWxmLmxhc3RBc2tlZCA9IGlkO1xuICAgICAgICBsZXQgc3BsaWNlID0gKCkgPT4ge1xuICAgICAgICAgICAgZGVsZXRlIHNlbGYucXVlc3Rpb25zW2lkXTtcbiAgICAgICAgICAgIGlmKHNlbGYubGFzdEFza2VkID09PSBpZClcbiAgICAgICAgICAgICAgICBzZWxmLmxhc3RBc2tlZCA9IG51bGw7XG4gICAgICAgIH07XG4gICAgICAgIG5ld1EudGhlbihzcGxpY2UsIHNwbGljZSk7XG5cbiAgICAgICAgcmV0dXJuIG5ld1E7XG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSc7XG5pbXBvcnQgQmFsbG90IGZyb20gJy4vYmFsbG90JztcbmltcG9ydCB7cGFyc2VDU1Z9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTZWF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0RcbntcbiAgICBjb25zdHJ1Y3RvcihzZWF0TnVtKVxuICAgIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLnNlYXROdW0gPSBzZWF0TnVtO1xuICAgICAgICB0aGlzLm93bmVyID0gMDtcblxuICAgICAgICAvLyBwb3NpdGlvbiBzZWF0XG4gICAgICAgIGxldCB4LCB5PTAuNjUsIHo7XG4gICAgICAgIHN3aXRjaChzZWF0TnVtKXtcbiAgICAgICAgY2FzZSAwOiBjYXNlIDE6IGNhc2UgMjpcbiAgICAgICAgICAgIHggPSAtMC44MzMgKyAwLjgzMypzZWF0TnVtO1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbi5zZXQoeCwgeSwgLTEuMDUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzogY2FzZSA0OlxuICAgICAgICAgICAgeiA9IC0wLjQzNyArIDAuODc0KihzZWF0TnVtLTMpO1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbi5zZXQoMS40MjUsIHksIHopO1xuICAgICAgICAgICAgdGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEkvMiwgMCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA1OiBjYXNlIDY6IGNhc2UgNzpcbiAgICAgICAgICAgIHggPSAwLjgzMyAtIDAuODMzKihzZWF0TnVtLTUpO1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbi5zZXQoeCwgeSwgMS4wNSk7XG4gICAgICAgICAgICB0aGlzLnJvdGF0aW9uLnNldCgwLCAtTWF0aC5QSSwgMCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA4OiBjYXNlIDk6XG4gICAgICAgICAgICB6ID0gMC40MzcgLSAwLjg3NCooc2VhdE51bS04KTtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24uc2V0KC0xLjQyNSwgeSwgeik7XG4gICAgICAgICAgICB0aGlzLnJvdGF0aW9uLnNldCgwLCAtMS41Kk1hdGguUEksIDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm5hbWVwbGF0ZSA9IG5ldyBOYW1lcGxhdGUodGhpcyk7XG4gICAgICAgIHRoaXMubmFtZXBsYXRlLnBvc2l0aW9uLnNldCgwLCAtMC42MzUsIDAuMjIpO1xuICAgICAgICB0aGlzLmFkZCh0aGlzLm5hbWVwbGF0ZSk7XG5cbiAgICAgICAgdGhpcy5iYWxsb3QgPSBuZXcgQmFsbG90KHRoaXMpO1xuICAgICAgICB0aGlzLmJhbGxvdC5wb3NpdGlvbi5zZXQoMCwgLTAuMywgMC4yNSk7XG4gICAgICAgIC8vdGhpcy5iYWxsb3Qucm90YXRlWSgwLjEpO1xuICAgICAgICB0aGlzLmFkZCh0aGlzLmJhbGxvdCk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy51cGRhdGVPd25lcnNoaXAuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgdXBkYXRlT3duZXJzaGlwKHtkYXRhOiB7Z2FtZSwgcGxheWVyc319KVxuXHR7XG5cdFx0bGV0IGlkcyA9IHBhcnNlQ1NWKGdhbWUudHVybk9yZGVyKTtcblxuXHRcdGlmKCAhdGhpcy5vd25lciApXG5cdFx0e1xuXHRcdFx0Ly8gY2hlY2sgaWYgYSBwbGF5ZXIgaGFzIGpvaW5lZCBhdCB0aGlzIHNlYXRcblx0XHRcdGZvcihsZXQgaSBpbiBpZHMpe1xuXHRcdFx0XHRpZihwbGF5ZXJzW2lkc1tpXV0uc2VhdE51bSA9PSB0aGlzLnNlYXROdW0pe1xuXHRcdFx0XHRcdHRoaXMub3duZXIgPSBpZHNbaV07XG5cdFx0XHRcdFx0dGhpcy5uYW1lcGxhdGUudXBkYXRlVGV4dChwbGF5ZXJzW2lkc1tpXV0uZGlzcGxheU5hbWUpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmKCAhaWRzLmluY2x1ZGVzKHRoaXMub3duZXIpIClcblx0XHR7XG5cdFx0XHR0aGlzLm93bmVyID0gMDtcblx0XHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KCc8Sm9pbj4nKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0ICogYXMgQ2FyZHMgZnJvbSAnLi9jYXJkJztcbmltcG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9IGZyb20gJy4vaGF0cyc7XG5pbXBvcnQgR2FtZVRhYmxlIGZyb20gJy4vdGFibGUnO1xuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgeyBnZXRHYW1lSWQgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnO1xuaW1wb3J0IFNlYXQgZnJvbSAnLi9zZWF0JztcblxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmFzc2V0cyA9IEFzc2V0TWFuYWdlci5tYW5pZmVzdDtcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcblx0XHR0aGlzLm5lZWRzU2tlbGV0b24gPSB0cnVlO1xuXG5cdFx0Ly8gcG9seWZpbGwgZ2V0VXNlciBmdW5jdGlvblxuXHRcdGlmKCFhbHRzcGFjZS5pbkNsaWVudCl7XG5cdFx0XHRhbHRzcGFjZS5nZXRVc2VyID0gKCkgPT4ge1xuXHRcdFx0XHRsZXQgaWQsIHJlID0gL1s/Jl11c2VySWQ9KFxcZCspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRcdFx0XHRpZihyZSlcblx0XHRcdFx0XHRpZCA9IHJlWzFdO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0aWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCk7XG5cblx0XHRcdFx0YWx0c3BhY2UuX2xvY2FsVXNlciA9IHtcblx0XHRcdFx0XHR1c2VySWQ6IGlkLFxuXHRcdFx0XHRcdGRpc3BsYXlOYW1lOiAnR3Vlc3QnK2lkLFxuXHRcdFx0XHRcdGlzTW9kZXJhdG9yOiBmYWxzZVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRjb25zb2xlLmxvZygnTWFzcXVlcmFkaW5nIGFzJywgYWx0c3BhY2UuX2xvY2FsVXNlcik7XG5cdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoYWx0c3BhY2UuX2xvY2FsVXNlcik7XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIGdldCBsb2NhbCB1c2VyXG5cdFx0YWx0c3BhY2UuZ2V0VXNlcigpLnRoZW4oKHVzZXIgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcblx0XHRcdFx0aWQ6IHVzZXIudXNlcklkLnRvU3RyaW5nKCksXG5cdFx0XHRcdGRpc3BsYXlOYW1lOiB1c2VyLmRpc3BsYXlOYW1lLFxuXHRcdFx0XHRpc01vZGVyYXRvcjogdXNlci5pc01vZGVyYXRvclxuXHRcdFx0fTtcblx0XHR9KS5iaW5kKHRoaXMpKTtcblxuXHRcdHRoaXMuZ2FtZSA9IHt9O1xuXHRcdHRoaXMucGxheWVycyA9IHt9O1xuXHRcdHRoaXMudm90ZXMgPSB7fTtcblx0fVxuXG5cdGluaXRpYWxpemUoZW52LCByb290LCBhc3NldHMpXG5cdHtcblx0XHQvLyBzaGFyZSB0aGUgZGlvcmFtYSBpbmZvXG5cdFx0QXNzZXRNYW5hZ2VyLmNhY2hlID0gYXNzZXRzO1xuXHRcdHRoaXMuZW52ID0gZW52O1xuXG5cdFx0Ly8gY29ubmVjdCB0byBzZXJ2ZXJcblx0XHR0aGlzLnNvY2tldCA9IGlvLmNvbm5lY3QoJy8nLCB7cXVlcnk6ICdnYW1lSWQ9JytnZXRHYW1lSWQoKX0pO1xuXG5cdFx0Ly8gY3JlYXRlIHRoZSB0YWJsZVxuXHRcdHRoaXMudGFibGUgPSBuZXcgR2FtZVRhYmxlKCk7XG5cdFx0dGhpcy5hZGQodGhpcy50YWJsZSk7XG5cblx0XHR0aGlzLnJlc2V0QnV0dG9uID0gbmV3IFRIUkVFLk1lc2goXG5cdFx0XHRuZXcgVEhSRUUuQm94R2VvbWV0cnkoLjI1LC4yNSwuMjUpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IGFzc2V0cy50ZXh0dXJlcy5yZXNldH0pXG5cdFx0KTtcblx0XHR0aGlzLnJlc2V0QnV0dG9uLnBvc2l0aW9uLnNldCgwLCAtMC4xOCwgMCk7XG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMucmVzZXQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy50YWJsZS5hZGQodGhpcy5yZXNldEJ1dHRvbik7XG5cblx0XHQvLyBjcmVhdGUgaWRsZSBkaXNwbGF5XG5cdFx0dGhpcy5pZGxlUm9vdCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuXHRcdHRoaXMuaWRsZVJvb3QucG9zaXRpb24uc2V0KDAsIDEuODUsIDApO1xuXHRcdHRoaXMuaWRsZVJvb3QuYWRkQmVoYXZpb3IobmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuU3Bpbih7c3BlZWQ6IDAuMDAwMn0pKTtcblx0XHR0aGlzLmFkZCh0aGlzLmlkbGVSb290KTtcblxuXHRcdC8vIGNyZWF0ZSBpZGxlIHNsaWRlc2hvd1xuXHRcdGxldCBjcmVkaXRzID0gbmV3IENhcmRzLkNyZWRpdHNDYXJkKCk7XG5cdFx0dGhpcy5pZGxlUm9vdC5hZGQoY3JlZGl0cyk7XG5cblx0XHQvLyBjcmVhdGUgaGF0c1xuXHRcdHRoaXMucHJlc2lkZW50SGF0ID0gbmV3IFByZXNpZGVudEhhdCgpO1xuXHRcdHRoaXMuY2hhbmNlbGxvckhhdCA9IG5ldyBDaGFuY2VsbG9ySGF0KCk7XG5cblx0XHQvLyBjcmVhdGUgcG9zaXRpb25zXG5cdFx0dGhpcy5zZWF0cyA9IFtdO1xuXHRcdGZvcihsZXQgaT0wOyBpPDEwOyBpKyspe1xuXHRcdFx0dGhpcy5zZWF0cy5wdXNoKCBuZXcgU2VhdChpKSApO1xuXHRcdH1cblxuXHRcdHRoaXMudGFibGUuYWRkKC4uLnRoaXMuc2VhdHMpO1xuXG5cdFx0Ly8gYWRkIGF2YXRhciBmb3Igc2NhbGVcblx0XHRhc3NldHMubW9kZWxzLmR1bW15LnBvc2l0aW9uLnNldCgwLCAwLCAxLjEpO1xuXHRcdGFzc2V0cy5tb2RlbHMuZHVtbXkucm90YXRlWihNYXRoLlBJKTtcblx0XHR0aGlzLmFkZChhc3NldHMubW9kZWxzLmR1bW15KTtcblxuXHRcdHRoaXMuc29ja2V0Lm9uKCd1cGRhdGUnLCB0aGlzLnVwZGF0ZUZyb21TZXJ2ZXIuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVGcm9tU2VydmVyKGdkLCBwZCwgdmQpXG5cdHtcblx0XHRjb25zb2xlLmxvZyhnZCwgcGQsIHZkKTtcblxuXHRcdGxldCBnYW1lID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nYW1lLCBnZCk7XG5cdFx0bGV0IHBsYXllcnMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnBsYXllcnMsIHBkKTtcblx0XHRsZXQgdm90ZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnZvdGVzLCB2ZCk7XG5cblx0XHRsZXQgbmVlZFBsYXllckluZm8gPSBbJ3R1cm5PcmRlcicsJ3BlbmRpbmdKb2luUmVxdWVzdCddO1xuXHRcdGZvcihsZXQgZmllbGQgaW4gZ2QpXG5cdFx0e1xuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHtcblx0XHRcdFx0dHlwZTogJ3VwZGF0ZV8nK2ZpZWxkLFxuXHRcdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGdhbWU6IGdhbWUsXG5cdFx0XHRcdFx0cGxheWVyczogbmVlZFBsYXllckluZm8uaW5jbHVkZXMoZmllbGQpID8gcGxheWVycyA6IHVuZGVmaW5lZCxcblx0XHRcdFx0XHR2b3RlczogZmllbGQgPT09ICd2b3Rlc0luUHJvZ3Jlc3MnID8gdm90ZXMgOiB1bmRlZmluZWRcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcblx0XHR0aGlzLnBsYXllcnMgPSBwbGF5ZXJzO1xuXHRcdHRoaXMudm90ZXMgPSB2b3Rlcztcblx0fVxuXG5cdHJlc2V0KGUpe1xuXHRcdGNvbnNvbGUubG9nKCdyZXF1ZXN0aW5nIHJlc2V0Jyk7XG5cdFx0dGhpcy5zb2NrZXQuZW1pdCgncmVzZXQnKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgU2VjcmV0SGl0bGVyKCk7XG4iXSwibmFtZXMiOlsidGhpcyIsInN1cGVyIiwibGV0IiwiQXNzZXRNYW5hZ2VyIiwiQ2FyZHMuQ3JlZGl0c0NhcmQiXSwibWFwcGluZ3MiOiI7OztBQUVBLFNBQWU7Q0FDZCxRQUFRLEVBQUU7RUFDVCxNQUFNLEVBQUU7R0FDUCxLQUFLLEVBQUUsd0JBQXdCO0dBQy9CLFNBQVMsRUFBRSw0QkFBNEI7R0FDdkMsTUFBTSxFQUFFLDBCQUEwQjtHQUNsQyxRQUFRLEVBQUUsNkJBQTZCO0dBQ3ZDLEtBQUssRUFBRSx5QkFBeUI7R0FDaEM7RUFDRCxRQUFRLEVBQUU7R0FDVCxXQUFXLEVBQUUsa0NBQWtDO0dBQy9DLFNBQVMsRUFBRSxtQ0FBbUM7R0FDOUMsV0FBVyxFQUFFLGtDQUFrQztHQUMvQyxLQUFLLEVBQUUsc0JBQXNCO0dBQzdCLEtBQUssRUFBRSxxQkFBcUI7R0FDNUI7RUFDRDtDQUNELEtBQUssRUFBRSxFQUFFO0NBQ1QsQ0FBQTs7QUNsQkQsSUFBTSxTQUFTLEdBQ2Ysa0JBQ1ks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TyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7R0FDbEUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7R0FFckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7R0FDckI7OztFQUdELElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUN2QyxJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7RUFDMUMsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0VBQ3RDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0VBQzVCLENBQUE7O0NBRUQsa0JBQUEsTUFBTTtDQUNOOztFQUVDQSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztFQUN0REEsSUFBSSxJQUFJLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxVQUFBLENBQUMsRUFBQyxTQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQSxDQUFDO0VBQzdELEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7OztFQUc5QixJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7R0FDYixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0dBQ25FOzs7RUFHRCxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7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
