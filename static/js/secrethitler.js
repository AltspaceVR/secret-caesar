var SecretHitler = (function () {
'use strict';

var AM = {
	manifest: {
		models: {
			table: 'static/model/table.dae',
			nameplate: 'static/model/nameplate.dae',
			tophat: 'static/model/tophat.dae',
			visorcap: 'static/model/visor_cap.dae'
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
	function Card(type, doubleSided, secret)
	{
		if ( type === void 0 ) type = Types.BLANK;
		if ( doubleSided === void 0 ) doubleSided = true;
		if ( secret === void 0 ) secret = false;

		superclass.call(this);

		// create the card faces
		var front = new THREE.Mesh(
			new THREE.PlaneGeometry(.3575, .5),
			new THREE.MeshBasicMaterial({map: AM.cache.textures.cards})
		);
		var back = new THREE.Mesh(
			new THREE.PlaneGeometry(.3575, .5),
			new THREE.MeshBasicMaterial({map: AM.cache.textures.cards})
		);
		back.position.set(0.005, 0, 0);
		back.rotateY(Math.PI);

		// set the faces to the correct part of the texture
		front.geometry.faceVertexUvs = [getUVs(type)];
		back.geometry.faceVertexUvs = [getUVs( doubleSided ? type : Types.BLANK )];

		window.test = front;

		this.add(front, back);
	}

	if ( superclass ) Card.__proto__ = superclass;
	Card.prototype = Object.create( superclass && superclass.prototype );
	Card.prototype.constructor = Card;

	return Card;
}(THREE.Object3D));

var CreditsCard = (function (Card) {
	function CreditsCard(){
		Card.call(this, Types.CREDITS);
		var self = this;

		function setVisibility(){
			if(SH.game.state === 'setup')
				{ self.children.forEach(function (o) { o.visible = true; }); }
			else
				{ self.children.forEach(function (o) { o.visible = false; }); }
		}

		SH.addEventListener('init', setVisibility);
		SH.addEventListener('setup', setVisibility);
		SH.addEventListener('setup_end', setVisibility);
	}

	if ( Card ) CreditsCard.__proto__ = Card;
	CreditsCard.prototype = Object.create( Card && Card.prototype );
	CreditsCard.prototype.constructor = CreditsCard;

	return CreditsCard;
}(Card));

var LiberalPolicyCard = (function (Card) {
	function LiberalPolicyCard(secret){
		if ( secret === void 0 ) secret = false;

		Card.call(this, Types.POLICY_LIBERAL, false, secret);
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
	function FascistPolicyCard(secret){
		if ( secret === void 0 ) secret = false;

		Card.call(this, Types.POLICY_FASCIST, false, secret);
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

var PresidentHat = (function (superclass) {
	function PresidentHat(){
		var this$1 = this;

		superclass.call(this);
		this.model = AM.cache.models.tophat;
		this.model.position.set(0,0,0);
		this.model.rotation.set(-Math.PI/2, 0, 0);
		this.add(this.model);

		SH.addEventListener('init', (function () {
			if(SH.game.state === 'setup') { this$1.idle(); }
		}).bind(this));
		SH.addEventListener('setup', this.idle.bind(this));
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

		SH.addEventListener('init', (function () {
			if(SH.game.state === 'setup') { this$1.idle(); }
		}).bind(this));
		SH.addEventListener('setup', this.idle.bind(this));

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
		this.position.set(0, 0.75, 0);
	}

	if ( superclass ) GameTable.__proto__ = superclass;
	GameTable.prototype = Object.create( superclass && superclass.prototype );
	GameTable.prototype.constructor = GameTable;

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

var Nameplate = (function (superclass) {
	function Nameplate(seatNum)
	{
		superclass.call(this);

		this.seatNum = seatNum;
		this.owner = null; // userId

		// add 3d model
		this.model = AM.cache.models.nameplate.children[0].clone();
		this.model.rotation.set(-Math.PI/2, 0, 0);
		this.model.scale.setScalar(1.25);
		this.add(this.model);

		// generate material
		this.bmp = document.createElement('canvas');
		this.bmp.width = Nameplate.textureSize;
		this.bmp.height = Nameplate.textureSize / 2;
		this.model.material = new THREE.MeshBasicMaterial({
			map: new THREE.CanvasTexture(this.bmp)
		});

		// place placard
		var x, y = 0.769, z;
		switch(seatNum){
		case 0: case 1: case 2:
			this.model.rotateZ(Math.PI/2);
			x = -0.833 + 0.833*seatNum;
			this.position.set(x, y, -0.83);
			break;
		case 3: case 4:
			z = -0.437 + 0.874*(seatNum-3);
			this.position.set(1.21, y, z);
			break;
		case 5: case 6: case 7:
			this.model.rotateZ(Math.PI/2);
			x = 0.833 - 0.833*(seatNum-5);
			this.position.set(x, y, 0.83);
			break;
		case 8: case 9:
			z = 0.437 - 0.874*(seatNum-8);
			this.position.set(-1.21, y, z);
			break;
		}

		// create listener proxies
		this._requestJoin = this.requestJoin.bind(this);
		this._hoverBehavior = new altspace.utilities.behaviors.HoverColor({
			color: new THREE.Color(0xffa8a8)
		});

		// hook up listeners
		SH.addEventListener('init', this.updateOwnership.bind(this));
		SH.addEventListener('setup', this.updateOwnership.bind(this));
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

	Nameplate.prototype.requestJoin = function requestJoin ()
	{
		console.log('Requesting to join at seat', this.seatNum);
		SH.socket.emit('requestJoin', Object.assign({seatNum: this.seatNum}, SH.localUser));
	};

	Nameplate.prototype.updateOwnership = function updateOwnership ()
	{
		var this$1 = this;

		// check for player
		var owner = Object.keys(SH.players).find((function (e) { return SH.players[e].seatNum == this$1.seatNum; }).bind(this));
		console.log(owner, this.owner);

		// player joined
		if(owner && !this.owner)
		{
			console.log('owner found');
			this.owner = owner;
			this.updateText(SH.players[this.owner].displayName);

			this.model.__behaviorList = this.model.__behaviorList || []; // TODO: ugh
			this.model.removeBehavior(this._hoverBehavior);
			this.model.removeEventListener('cursorup', this._requestJoin);
		}

		// player left
		else if(!owner && (this.owner || this.owner === null))
		{
			console.log('owner lost');
			this.owner = 0;
			this.updateText('<Join>');
			this.model.addBehavior(this._hoverBehavior);
			this.model.addEventListener('cursorup', this._requestJoin);
		}
	};

	return Nameplate;
}(THREE.Object3D));

Nameplate.textureSize = 512;

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
				var id = Math.floor(Math.random() * 10000000);
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

		this.game = null;
		this.players = null;
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
		this.gameTable = new GameTable();
		this.add(this.gameTable);

		this.resetButton = new THREE.Mesh(
			new THREE.BoxGeometry(.25,.25,.25),
			new THREE.MeshBasicMaterial({map: assets.textures.reset})
		);
		this.resetButton.position.set(0, -0.18, 0);
		this.resetButton.addEventListener('cursorup', this.reset.bind(this));
		this.gameTable.add(this.resetButton);

		// create idle display
		this.idleRoot = new THREE.Object3D();
		this.idleRoot.position.set(0, 1.5, 0);
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
			var seat = new Nameplate(i);
			this$1.seats.push(seat);
		}
		(ref = this).add.apply(ref, this.seats);

		this.socket.on('update', this.updateFromServer.bind(this));
		var ref;
	};

	SecretHitler.prototype.updateFromServer = function updateFromServer (game, players)
	{
		console.log(game, players);

		if(!this.game && !this.players){
			this.game = game;
			this.players = players;
			this.dispatchEvent({type: 'init', bubbles: false});
		}
		else {
			Object.assign(this.game, game);
			Object.assign(this.players, players);
			this.dispatchEvent({type: this.game.state+'_end', bubbles: false});
			this.dispatchEvent({type: this.game.state, bubbles: false});
		}
	};

	SecretHitler.prototype.reset = function reset ()
	{
		console.log('requesting reset', this);
		this.game = null;
		this.players = null;
		this.socket.emit('reset');
	};

	return SecretHitler;
}(THREE.Object3D));

var SH = new SecretHitler();

return SH;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvYXNzZXRtYW5hZ2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9nYW1lb2JqZWN0cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVybWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RhYmxlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC91dGlscy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWNyZXRoaXRsZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG5cdG1hbmlmZXN0OiB7XHJcblx0XHRtb2RlbHM6IHtcclxuXHRcdFx0dGFibGU6ICdzdGF0aWMvbW9kZWwvdGFibGUuZGFlJyxcclxuXHRcdFx0bmFtZXBsYXRlOiAnc3RhdGljL21vZGVsL25hbWVwbGF0ZS5kYWUnLFxyXG5cdFx0XHR0b3BoYXQ6ICdzdGF0aWMvbW9kZWwvdG9waGF0LmRhZScsXHJcblx0XHRcdHZpc29yY2FwOiAnc3RhdGljL21vZGVsL3Zpc29yX2NhcC5kYWUnXHJcblx0XHR9LFxyXG5cdFx0dGV4dHVyZXM6IHtcclxuXHRcdFx0Ym9hcmRfbGFyZ2U6ICdzdGF0aWMvaW1nL2JvYXJkLWxhcmdlLWJha2VkLnBuZycsXHJcblx0XHRcdGJvYXJkX21lZDogJ3N0YXRpYy9pbWcvYm9hcmQtbWVkaXVtLWJha2VkLnBuZycsXHJcblx0XHRcdGJvYXJkX3NtYWxsOiAnc3RhdGljL2ltZy9ib2FyZC1zbWFsbC1iYWtlZC5wbmcnLFxyXG5cdFx0XHRjYXJkczogJ3N0YXRpYy9pbWcvY2FyZHMucG5nJyxcclxuXHRcdFx0cmVzZXQ6ICdzdGF0aWMvaW1nL2JvbWIucG5nJ1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0Y2FjaGU6IHt9XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuY2xhc3MgR2FtZVN0YXRlXHJcbntcclxuXHRjb25zdHJ1Y3RvcihpZClcclxuXHR7XHJcblx0XHR0aGlzLmlkID0gaWQ7XHJcblxyXG5cdFx0dGhpcy5zdGF0ZSA9ICdpZGxlJztcclxuXHJcblx0XHR0aGlzLnR1cm5PcmRlciA9IFtdOyAvLyBhcnJheSBvZiB1c2VySWRzXHJcblx0XHR0aGlzLnByZXNpZGVudCA9IDA7IC8vIHVzZXJJZFxyXG5cdFx0dGhpcy5jaGFuY2VsbG9yID0gMDsgLy8gdXNlcklkXHJcblx0XHR0aGlzLmxhc3RQcmVzaWRlbnQgPSAwOyAvLyB1c2VySWRcclxuXHRcdHRoaXMubGFzdENoYW5jZWxsb3IgPSAwOyAvLyB1c2VySWRcclxuXHJcblx0XHR0aGlzLmxpYmVyYWxQb2xpY2llcyA9IDA7XHJcblx0XHR0aGlzLmZhc2Npc3RQb2xpY2llcyA9IDA7XHJcblx0XHR0aGlzLmRlY2tGYXNjaXN0ID0gMTE7XHJcblx0XHR0aGlzLmRlY2tMaWJlcmFsID0gNjtcclxuXHRcdHRoaXMuZGlzY2FyZEZhc2Npc3QgPSAwO1xyXG5cdFx0dGhpcy5kaXNjYXJkTGliZXJhbCA9IDA7XHJcblx0XHR0aGlzLnNwZWNpYWxFbGVjdGlvbiA9IGZhbHNlO1xyXG5cdFx0dGhpcy5mYWlsZWRWb3RlcyA9IDA7XHJcblx0fVxyXG5cclxuXHRuZXh0UHJlc2lkZW50KClcclxuXHR7XHJcblx0XHRsZXQgdHVybiA9IDA7XHJcblxyXG5cdFx0Ly8gdGhpcyBpcyB0aGUgZmlyc3Qgcm91bmQsIGNob29zZSBwcmVzaWRlbnQgcmFuZG9tbHlcclxuXHRcdGlmKCF0aGlzLnByZXNpZGVudClcclxuXHRcdFx0dHVybiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMudHVybk9yZGVyLmxlbmd0aCk7XHJcblxyXG5cdFx0Ly8gdGhpcyBpcyBhIHNwZWNpYWwgZWxlY3Rpb24sIHNvIGNvdW50IGZyb20gcHJlc2lkZW50IGVtZXJpdHVzXHJcblx0XHRlbHNlIGlmKHRoaXMuc3BlY2lhbEVsZWN0aW9uKVxyXG5cdFx0XHR0dXJuID0gdGhpcy5wbGF5ZXJzW3RoaXMubGFzdFByZXNpZGVudF0udHVybk9yZGVyO1xyXG5cclxuXHRcdC8vIGEgcmVndWxhciBlbGVjdGlvbjogcG93ZXIgcGFzc2VzIHRvIHRoZSBsZWZ0XHJcblx0XHRlbHNlXHJcblx0XHRcdHR1cm4gPSB0aGlzLnBsYXllcnNbdGhpcy5wcmVzaWRlbnRdLnR1cm5PcmRlcjtcclxuXHJcblx0XHRyZXR1cm4gdGhpcy50dXJuT3JkZXJbICh0dXJuKzEpJXRoaXMudHVybk9yZGVyLmxlbmd0aCBdO1xyXG5cdH1cclxuXHJcblx0ZHJhd1BvbGljaWVzKClcclxuXHR7XHJcblxyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgUGxheWVyXHJcbntcclxuXHRjb25zdHJ1Y3Rvcih1c2VySWQgPSAwLCBkaXNwbGF5TmFtZSA9ICdkdW1teScsIGlzTW9kZXJhdG9yID0gZmFsc2UpXHJcblx0e1xyXG5cdFx0dGhpcy51c2VySWQgPSB1c2VySWQ7XHJcblx0XHR0aGlzLmRpc3BsYXlOYW1lID0gZGlzcGxheU5hbWU7XHJcblx0XHR0aGlzLmlzTW9kZXJhdG9yID0gZmFsc2U7XHJcblx0XHR0aGlzLnR1cm5PcmRlciA9IC0xOyAvLyB1bmtub3duIHVudGlsIGdhbWUgc3RhcnRzXHJcblxyXG5cdFx0dGhpcy5yb2xlID0gJ3VuYXNzaWduZWQnOyAvLyBvbmUgb2YgJ3VuYXNzaWduZWQnLCAnaGl0bGVyJywgJ2Zhc2Npc3QnLCAnbGliZXJhbCdcclxuXHRcdHRoaXMuc3RhdGUgPSAnbm9ybWFsJzsgLy8gb25lIG9mICdub3JtYWwnLCAnaW52ZXN0aWdhdGVkJywgJ2RlYWQnXHJcblx0fVxyXG5cclxuXHRnZXQgcGFydHkoKXtcclxuXHRcdGlmKHRoaXMucm9sZSA9PT0gJ2hpdGxlcicpIHJldHVybiAnZmFzY2lzdCc7XHJcblx0XHRlbHNlIHJldHVybiB0aGlzLnJvbGU7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgeyBHYW1lU3RhdGUsIFBsYXllciB9O1xyXG5cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IHsgUGxheWVyIH0gZnJvbSAnLi9nYW1lb2JqZWN0cyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGF5ZXJNYW5hZ2VyXHJcbntcclxuXHRjb25zdHJ1Y3RvcigpXHJcblx0e1xyXG5cdFx0dGhpcy5sb2NhbFVzZXIgPSBudWxsO1xyXG5cdFx0dGhpcy5wbGF5ZXJzID0gW107XHJcblx0fVxyXG5cclxuXHRhY3F1aXJlTG9jYWxVc2VyKClcclxuXHR7XHJcblx0XHRpZih3aW5kb3cuYWx0c3BhY2UgJiYgYWx0c3BhY2UuaW5DbGllbnQpXHJcblx0XHR7XHJcblx0XHRcdHRoaXMubG9jYWxVc2VyID0ge307XHJcblxyXG5cdFx0XHQvLyBnZXQgdGhlIGxvY2FsIHVzZXIgaWQgYW5kIG5hbWVcclxuXHRcdFx0YWx0c3BhY2UuZ2V0VXNlcigpLnRoZW4oKHVzZXIgPT4ge1xyXG5cdFx0XHRcdE9iamVjdC5hc3NpZ24odGhpcy5sb2NhbFVzZXIsIHVzZXIpO1xyXG5cdFx0XHR9KS5iaW5kKHRoaXMpKTtcclxuXHJcblx0XHRcdC8vIGdldCB0aGUgdXNlciB0cmFja2luZyBza2VsZXRvblxyXG5cdFx0XHRhbHRzcGFjZS5nZXRUaHJlZUpTVHJhY2tpbmdTa2VsZXRvbigpLnRoZW4oKHRzID0+IHtcclxuXHRcdFx0XHR0aGlzLmxvY2FsVXNlci5za2VsZXRvbiA9IHRzO1xyXG5cdFx0XHRcdFNILmFkZCh0cyk7XHJcblx0XHRcdH0pLmJpbmQodGhpcykpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZVxyXG5cdFx0e1xyXG5cdFx0XHQvLyBmYWtlIHVzZXIgZGF0YVxyXG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcclxuXHRcdFx0XHR1c2VySWQ6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDApLFxyXG5cdFx0XHRcdGlzTW9kZXJhdG9yOiBmYWxzZVxyXG5cdFx0XHR9O1xyXG5cdFx0XHR0aGlzLmxvY2FsVXNlci5kaXNwbGF5TmFtZSA9ICdXZWIgVXNlciAnK3RoaXMubG9jYWxVc2VyLnVzZXJJZDtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IFBNIGZyb20gJy4vcGxheWVybWFuYWdlcic7XHJcblxyXG5jbGFzcyBCZWhhdmlvclxyXG57XHJcblx0Y29uc3RydWN0b3IodHlwZSl7XHJcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xyXG5cdH1cclxuXHJcblx0YXdha2Uob2JqKXtcclxuXHRcdHRoaXMub2JqZWN0M0QgPSBvYmo7XHJcblx0fVxyXG5cclxuXHRzdGFydCgpeyB9XHJcblxyXG5cdHVwZGF0ZShkVCl7IH1cclxuXHJcblx0ZGlzcG9zZSgpeyB9XHJcbn1cclxuXHJcbmNsYXNzIEJTeW5jIGV4dGVuZHMgQmVoYXZpb3Jcclxue1xyXG5cdGNvbnN0cnVjdG9yKGV2ZW50TmFtZSlcclxuXHR7XHJcblx0XHRzdXBlcignQlN5bmMnKTtcclxuXHRcdHRoaXMuX3MgPSBTSC5zb2NrZXQ7XHJcblxyXG5cdFx0Ly8gbGlzdGVuIGZvciB1cGRhdGUgZXZlbnRzXHJcblx0XHR0aGlzLmhvb2sgPSB0aGlzLl9zLm9uKGV2ZW50TmFtZSwgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xyXG5cdFx0dGhpcy5ldmVudE5hbWUgPSBldmVudE5hbWU7XHJcblx0XHR0aGlzLm93bmVyID0gJ3Vub3duZWQnO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlRnJvbVNlcnZlcihkYXRhKVxyXG5cdHtcclxuXHRcdHRoaXMub2JqZWN0M0QucG9zaXRpb24uZnJvbUFycmF5KGRhdGEsIDApO1xyXG5cdFx0dGhpcy5vYmplY3QzRC5yb3RhdGlvbi5mcm9tQXJyYXkoZGF0YSwgMyk7XHJcblx0fVxyXG5cclxuXHR0YWtlT3duZXJzaGlwKClcclxuXHR7XHJcblx0XHRpZihQTS5sb2NhbFVzZXIgJiYgUE0ubG9jYWxVc2VyLnVzZXJJZClcclxuXHRcdFx0dGhpcy5vd25lciA9IFBNLmxvY2FsVXNlci51c2VySWQ7XHJcblx0fVxyXG5cclxuXHR1cGRhdGUoZFQpXHJcblx0e1xyXG5cdFx0aWYoUE0ubG9jYWxVc2VyICYmIFBNLmxvY2FsVXNlci5za2VsZXRvbiAmJiBQTS5sb2NhbFVzZXIudXNlcklkID09PSB0aGlzLm93bmVyKVxyXG5cdFx0e1xyXG5cdFx0XHRsZXQgaiA9IFBNLmxvY2FsVXNlci5za2VsZXRvbi5nZXRKb2ludCgnSGVhZCcpO1xyXG5cdFx0XHR0aGlzLl9zLmVtaXQodGhpcy5ldmVudE5hbWUsIFsuLi5qLnBvc2l0aW9uLnRvQXJyYXkoKSwgLi4uai5yb3RhdGlvbi50b0FycmF5KCldKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG59XHJcblxyXG5leHBvcnQgeyBCZWhhdmlvciwgQlN5bmMgfTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IHsgQmVoYXZpb3IgfSBmcm9tICcuL2JlaGF2aW9yJztcclxuXHJcbmNsYXNzIEFuaW1hdGUgZXh0ZW5kcyBCZWhhdmlvclxyXG57XHJcblx0Y29uc3RydWN0b3IoLy97cGFyZW50LCBwb3MsIHF1YXQsIHNjYWxlLCBtYXRyaXgsIGR1cmF0aW9uLCBjYWxsYmFja31cclxuXHRcdHtwYXJlbnQ9bnVsbCwgcG9zPW51bGwsIHF1YXQ9bnVsbCwgc2NhbGU9bnVsbCwgbWF0cml4PW51bGwsIGR1cmF0aW9uPTYwMCwgY2FsbGJhY2s9KCk9Pnt9fSlcclxuXHR7XHJcblx0XHRzdXBlcignQW5pbWF0ZScpO1xyXG5cdFx0XHJcblx0XHRpZihtYXRyaXgpXHJcblx0XHR7XHJcblx0XHRcdC8vIGV4dHJhY3QgcG9zaXRpb24vcm90YXRpb24vc2NhbGUgZnJvbSBtYXRyaXhcclxuXHRcdFx0cG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcclxuXHRcdFx0cXVhdCA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XHJcblx0XHRcdHNjYWxlID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcclxuXHRcdFx0bWF0cml4LmRlY29tcG9zZShwb3MsIHF1YXQsIHNjYWxlKTtcclxuXHRcdH1cclxuXHJcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHtwYXJlbnQsIHBvcywgcXVhdCwgc2NhbGUsIGR1cmF0aW9uLCBjYWxsYmFja30pO1xyXG5cdH1cclxuXHJcblx0YXdha2Uob2JqKVxyXG5cdHtcclxuXHRcdHN1cGVyLmF3YWtlKG9iaik7XHJcblxyXG5cdFx0Ly8gc2h1ZmZsZSBoaWVyYXJjaHksIGJ1dCBrZWVwIHdvcmxkIHRyYW5zZm9ybSB0aGUgc2FtZVxyXG5cdFx0aWYodGhpcy5wYXJlbnQgJiYgdGhpcy5wYXJlbnQgIT09IG9iai5wYXJlbnQpXHJcblx0XHR7XHJcblx0XHRcdG9iai5hcHBseU1hdHJpeChvYmoucGFyZW50Lm1hdHJpeFdvcmxkKTtcclxuXHRcdFx0bGV0IG1hdCA9IG5ldyBUSFJFRS5NYXRyaXg0KCkuZ2V0SW52ZXJzZSh0aGlzLnBhcmVudC5tYXRyaXhXb3JsZCk7XHJcblx0XHRcdG9iai5hcHBseU1hdHJpeChtYXQpO1xyXG5cclxuXHRcdFx0dGhpcy5wYXJlbnQuYWRkKG9iaik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gcmVhZCBpbml0aWFsIHBvc2l0aW9uc1xyXG5cdFx0dGhpcy5pbml0aWFsUG9zID0gb2JqLnBvc2l0aW9uLmNsb25lKCk7XHJcblx0XHR0aGlzLmluaXRpYWxRdWF0ID0gb2JqLnF1YXRlcm5pb24uY2xvbmUoKTtcclxuXHRcdHRoaXMuaW5pdGlhbFNjYWxlID0gb2JqLnNjYWxlLmNsb25lKCk7XHJcblx0XHR0aGlzLnN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGUoKVxyXG5cdHtcclxuXHRcdC8vIGNvbXB1dGUgZWFzZS1vdXQgYmFzZWQgb24gZHVyYXRpb25cclxuXHRcdGxldCBtaXggPSAoRGF0ZS5ub3coKS10aGlzLnN0YXJ0VGltZSkgLyB0aGlzLmR1cmF0aW9uO1xyXG5cdFx0bGV0IGVhc2UgPSBUV0VFTiA/IFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0IDogbiA9PiBuKigyLW4pO1xyXG5cdFx0bWl4ID0gbWl4IDwgMSA/IGVhc2UobWl4KSA6IDE7XHJcblxyXG5cdFx0Ly8gYW5pbWF0ZSBwb3NpdGlvbiBpZiByZXF1ZXN0ZWRcclxuXHRcdGlmKCB0aGlzLnBvcyApe1xyXG5cdFx0XHR0aGlzLm9iamVjdDNELnBvc2l0aW9uLmxlcnBWZWN0b3JzKHRoaXMuaW5pdGlhbFBvcywgdGhpcy5wb3MsIG1peCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gYW5pbWF0ZSByb3RhdGlvbiBpZiByZXF1ZXN0ZWRcclxuXHRcdGlmKCB0aGlzLnF1YXQgKXtcclxuXHRcdFx0VEhSRUUuUXVhdGVybmlvbi5zbGVycCh0aGlzLmluaXRpYWxRdWF0LCB0aGlzLnF1YXQsIHRoaXMub2JqZWN0M0QucXVhdGVybmlvbiwgbWl4KVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGFuaW1hdGUgc2NhbGUgaWYgcmVxdWVzdGVkXHJcblx0XHRpZiggdGhpcy5zY2FsZSApe1xyXG5cdFx0XHR0aGlzLm9iamVjdDNELnNjYWxlLmxlcnBWZWN0b3JzKHRoaXMuaW5pdGlhbFNjYWxlLCB0aGlzLnNjYWxlLCBtaXgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHRlcm1pbmF0ZSBhbmltYXRpb24gd2hlbiBkb25lXHJcblx0XHRpZihtaXggPj0gMSl7XHJcblx0XHRcdHRoaXMub2JqZWN0M0QucmVtb3ZlQmVoYXZpb3IodGhpcyk7XHJcblx0XHRcdHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLm9iamVjdDNEKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbkFuaW1hdGUuc3RhcnQgPSAodGFyZ2V0LCBvcHRzKSA9PlxyXG57XHJcblx0bGV0IG9sZEFuaW0gPSB0YXJnZXQuZ2V0QmVoYXZpb3JCeVR5cGUoJ0FuaW1hdGUnKTtcclxuXHRpZihvbGRBbmltKXtcclxuXHRcdG9sZEFuaW0uY29uc3RydWN0b3Iob3B0cyk7XHJcblx0XHRvbGRBbmltLmF3YWtlKHRhcmdldCk7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0dGFyZ2V0LmFkZEJlaGF2aW9yKCBuZXcgQW5pbWF0ZShvcHRzKSApO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgQW5pbWF0ZTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XHJcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcblxyXG5cclxuLy8gZW51bSBjb25zdGFudHNcclxubGV0IFR5cGVzID0gT2JqZWN0LmZyZWV6ZSh7XHJcblx0UE9MSUNZX0xJQkVSQUw6IDAsXHJcblx0UE9MSUNZX0ZBU0NJU1Q6IDEsXHJcblx0Uk9MRV9MSUJFUkFMOiAyLFxyXG5cdFJPTEVfRkFTQ0lTVDogMyxcclxuXHRST0xFX0hJVExFUjogNCxcclxuXHRQQVJUWV9MSUJFUkFMOiA1LFxyXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXHJcblx0SkE6IDcsXHJcblx0TkVJTjogOCxcclxuXHRCTEFOSzogOSxcclxuXHRDUkVESVRTOiAxMFxyXG59KTtcclxuXHJcbmZ1bmN0aW9uIGRpbXNUb1VWKHtzaWRlLCBsZWZ0LCByaWdodCwgdG9wLCBib3R0b219KVxyXG57XHJcblx0aWYoc2lkZSlcclxuXHRcdHJldHVybiBbW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMih0b3AsIGxlZnQpLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIGxlZnQpLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMih0b3AsIHJpZ2h0KVxyXG5cdFx0XSxbXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGJvdHRvbSwgbGVmdCksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGJvdHRvbSwgcmlnaHQpLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMih0b3AsIHJpZ2h0KVxyXG5cdFx0XV07XHJcblx0ZWxzZVxyXG5cdFx0cmV0dXJuIFtbXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIHRvcCksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIGJvdHRvbSksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCB0b3ApXHJcblx0XHRdLFtcclxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIobGVmdCwgYm90dG9tKSxcclxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIocmlnaHQsIGJvdHRvbSksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCB0b3ApXHJcblx0XHRdXTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0VVZzKHR5cGUpXHJcbntcclxuXHRsZXQgZGltcyA9IHtsZWZ0OiAwLCByaWdodDogMSwgYm90dG9tOiAwLCB0b3A6IDF9O1xyXG5cclxuXHRzd2l0Y2godHlwZSlcclxuXHR7XHJcblx0Y2FzZSBUeXBlcy5QT0xJQ1lfTElCRVJBTDpcclxuXHRcdGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC44MzQsIHJpZ2h0OiAwLjk5NiwgdG9wOiAwLjc1NCwgYm90dG9tOiAwLjk5N307XHJcblx0XHRicmVhaztcclxuXHRjYXNlIFR5cGVzLlBPTElDWV9GQVNDSVNUOlxyXG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjY2LCByaWdodDogMC44MjIsIHRvcDogMC43NTQsIGJvdHRvbTogMC45OTZ9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5ST0xFX0xJQkVSQUw6XHJcblx0XHRkaW1zID0ge2xlZnQ6IDAuNTA1LCByaWdodDogMC43NDYsIHRvcDogMC45OTYsIGJvdHRvbTogMC42NX07XHJcblx0XHRicmVhaztcclxuXHRjYXNlIFR5cGVzLlJPTEVfRkFTQ0lTVDpcclxuXHRcdGRpbXMgPSB7bGVmdDogMC41MDUsIHJpZ2h0OiAwLjc0NiwgdG9wOiAwLjY0NSwgYm90dG9tOiAwLjN9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5ST0xFX0hJVExFUjpcclxuXHRcdGRpbXMgPSB7bGVmdDogMC43NTQsIHJpZ2h0OiAwLjk5NiwgdG9wOiAwLjY0NSwgYm90dG9tOiAwLjN9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5QQVJUWV9MSUJFUkFMOlxyXG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjI1NSwgcmlnaHQ6IDAuNDk1LCB0b3A6IDAuOTk2LCBib3R0b206IDAuNjV9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5QQVJUWV9GQVNDSVNUOlxyXG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjI1NSwgcmlnaHQ6IDAuNDk1LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XHJcblx0XHRicmVhaztcclxuXHRjYXNlIFR5cGVzLkpBOlxyXG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjAwNSwgcmlnaHQ6IDAuMjQ0LCB0b3A6IDAuOTkyLCBib3R0b206IDAuNjUzfTtcclxuXHRcdGJyZWFrO1xyXG5cdGNhc2UgVHlwZXMuTkVJTjpcclxuXHRcdGRpbXMgPSB7bGVmdDogMC4wMDYsIHJpZ2h0OiAwLjI0MywgdG9wOiAwLjY0MiwgYm90dG9tOiAwLjMwMn07XHJcblx0XHRicmVhaztcclxuXHRjYXNlIFR5cGVzLkNSRURJVFM6XHJcblx0XHRkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuMDE1LCByaWdodDogMC4yNzYsIHRvcDogMC4zOTcsIGJvdHRvbTogMC43NjV9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5CTEFOSzpcclxuXHRkZWZhdWx0OlxyXG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjAyMiwgcmlnaHQ6IC4wMjIrMC4yNDcsIHRvcDogMC4wMjEsIGJvdHRvbTogLjAyMSswLjM1NDN9O1xyXG5cdFx0YnJlYWs7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gZGltc1RvVVYoZGltcyk7XHJcbn1cclxuXHJcblxyXG5jbGFzcyBDYXJkIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKHR5cGUgPSBUeXBlcy5CTEFOSywgZG91YmxlU2lkZWQgPSB0cnVlLCBzZWNyZXQgPSBmYWxzZSlcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSB0aGUgY2FyZCBmYWNlc1xyXG5cdFx0bGV0IGZyb250ID0gbmV3IFRIUkVFLk1lc2goXHJcblx0XHRcdG5ldyBUSFJFRS5QbGFuZUdlb21ldHJ5KC4zNTc1LCAuNSksXHJcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KVxyXG5cdFx0KTtcclxuXHRcdGxldCBiYWNrID0gbmV3IFRIUkVFLk1lc2goXHJcblx0XHRcdG5ldyBUSFJFRS5QbGFuZUdlb21ldHJ5KC4zNTc1LCAuNSksXHJcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KVxyXG5cdFx0KTtcclxuXHRcdGJhY2sucG9zaXRpb24uc2V0KDAuMDA1LCAwLCAwKTtcclxuXHRcdGJhY2sucm90YXRlWShNYXRoLlBJKTtcclxuXHJcblx0XHQvLyBzZXQgdGhlIGZhY2VzIHRvIHRoZSBjb3JyZWN0IHBhcnQgb2YgdGhlIHRleHR1cmVcclxuXHRcdGZyb250Lmdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnMgPSBbZ2V0VVZzKHR5cGUpXTtcclxuXHRcdGJhY2suZ2VvbWV0cnkuZmFjZVZlcnRleFV2cyA9IFtnZXRVVnMoIGRvdWJsZVNpZGVkID8gdHlwZSA6IFR5cGVzLkJMQU5LICldO1xyXG5cclxuXHRcdHdpbmRvdy50ZXN0ID0gZnJvbnQ7XHJcblxyXG5cdFx0dGhpcy5hZGQoZnJvbnQsIGJhY2spO1xyXG5cdH1cclxuXHJcbn1cclxuXHJcbmNsYXNzIEJsYW5rQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7IHN1cGVyKCk7IH1cclxufVxyXG5cclxuY2xhc3MgQ3JlZGl0c0NhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuQ1JFRElUUyk7XHJcblx0XHRsZXQgc2VsZiA9IHRoaXM7XHJcblxyXG5cdFx0ZnVuY3Rpb24gc2V0VmlzaWJpbGl0eSgpe1xyXG5cdFx0XHRpZihTSC5nYW1lLnN0YXRlID09PSAnc2V0dXAnKVxyXG5cdFx0XHRcdHNlbGYuY2hpbGRyZW4uZm9yRWFjaChvID0+IHsgby52aXNpYmxlID0gdHJ1ZTsgfSk7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRzZWxmLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IGZhbHNlOyB9KTtcclxuXHRcdH1cclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdpbml0Jywgc2V0VmlzaWJpbGl0eSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdzZXR1cCcsIHNldFZpc2liaWxpdHkpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignc2V0dXBfZW5kJywgc2V0VmlzaWJpbGl0eSk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBMaWJlcmFsUG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcclxuXHRcdHN1cGVyKFR5cGVzLlBPTElDWV9MSUJFUkFMLCBmYWxzZSwgc2VjcmV0KTtcclxuXHR9XHJcblx0Z29Ub1Bvc2l0aW9uKHNwb3QgPSAwKVxyXG5cdHtcclxuXHRcdHNwb3QgPSBNYXRoLm1heCgwLCBNYXRoLm1pbig0LCBzcG90KSk7XHJcblx0XHRsZXQgcyA9IExpYmVyYWxQb2xpY3lDYXJkLnNwb3RzO1xyXG5cdFx0QW5pbWF0ZS5zdGFydCh0aGlzLCB7cGFyZW50OiBBc3NldE1hbmFnZXIucm9vdCwgcG9zOiBzWydwb3NfJytzcG90XSwgcXVhdDogcy5xdWF0LCBzY2FsZTogcy5zY2FsZX0pO1xyXG5cdH1cclxufVxyXG5cclxuTGliZXJhbFBvbGljeUNhcmQuc3BvdHMgPSB7XHJcblx0cG9zXzA6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNTMzLCAwLjc2LCAtMC4zMzYpLFxyXG5cdHBvc18xOiBuZXcgVEhSRUUuVmVjdG9yMygwLjI2MywgMC43NiwgLTAuMzM2KSxcclxuXHRwb3NfMjogbmV3IFRIUkVFLlZlY3RvcjMoLS4wMDcsIDAuNzYsIC0wLjMzNiksXHJcblx0cG9zXzM6IG5ldyBUSFJFRS5WZWN0b3IzKC0uMjc5LCAwLjc2LCAtMC4zMzYpLFxyXG5cdHBvc180OiBuZXcgVEhSRUUuVmVjdG9yMygtLjU1MiwgMC43NiwgLTAuMzM2KSxcclxuXHRxdWF0OiBuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAwLjcwNzEwNjc4MTE4NjU0NzUsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMCksXHJcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNywgMC43LCAwLjcpXHJcbn1cclxuXHJcbmNsYXNzIEZhc2Npc3RQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3Ioc2VjcmV0ID0gZmFsc2Upe1xyXG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0ZBU0NJU1QsIGZhbHNlLCBzZWNyZXQpO1xyXG5cdH1cclxuXHRnb1RvUG9zaXRpb24oc3BvdCA9IDApXHJcblx0e1xyXG5cdFx0c3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDUsIHNwb3QpKTtcclxuXHRcdGxldCBzID0gRmFzY2lzdFBvbGljeUNhcmQuc3BvdHM7XHJcblx0XHRBbmltYXRlLnN0YXJ0KHRoaXMsIHtwYXJlbnQ6IEFzc2V0TWFuYWdlci5yb290LCBwb3M6IHNbJ3Bvc18nK3Nwb3RdLCBxdWF0OiBzLnF1YXQsIHNjYWxlOiBzLnNjYWxlfSk7XHJcblx0fVxyXG59XHJcblxyXG5GYXNjaXN0UG9saWN5Q2FyZC5zcG90cyA9IHtcclxuXHRwb3NfMDogbmV3IFRIUkVFLlZlY3RvcjMoLS42ODcsIDAuNzYsIDAuMzQxKSxcclxuXHRwb3NfMTogbmV3IFRIUkVFLlZlY3RvcjMoLS40MTcsIDAuNzYsIDAuMzQxKSxcclxuXHRwb3NfMjogbmV3IFRIUkVFLlZlY3RvcjMoLS4xNDYsIDAuNzYsIDAuMzQxKSxcclxuXHRwb3NfMzogbmV3IFRIUkVFLlZlY3RvcjMoMC4xMjcsIDAuNzYsIDAuMzQxKSxcclxuXHRwb3NfNDogbmV3IFRIUkVFLlZlY3RvcjMoMC40MDAsIDAuNzYsIDAuMzQxKSxcclxuXHRwb3NfNTogbmV3IFRIUkVFLlZlY3RvcjMoMC42NzMsIDAuNzYsIDAuMzQxKSxcclxuXHRxdWF0OiBuZXcgVEhSRUUuUXVhdGVybmlvbigtMC43MDcxMDY3ODExODY1NDc1LCAwLCAwLCAwLjcwNzEwNjc4MTE4NjU0NzUpLFxyXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjcsIDAuNywgMC43KVxyXG59XHJcblxyXG5jbGFzcyBMaWJlcmFsUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3RvcihzZWNyZXQgPSBmYWxzZSl7XHJcblx0XHRzdXBlcihUeXBlcy5ST0xFX0xJQkVSQUwsIGZhbHNlLCBzZWNyZXQpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgRmFzY2lzdFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3Ioc2VjcmV0ID0gZmFsc2Upe1xyXG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9GQVNDSVNULCBmYWxzZSwgc2VjcmV0KTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIEhpdGxlclJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3Ioc2VjcmV0ID0gZmFsc2Upe1xyXG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9ISVRMRVIsIGZhbHNlLCBzZWNyZXQpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgTGliZXJhbFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcclxuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0xJQkVSQUwsIGZhbHNlLCBzZWNyZXQpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgRmFzY2lzdFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcclxuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0ZBU0NJU1QsIGZhbHNlLCBzZWNyZXQpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgSmFDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKFR5cGVzLkpBLCBmYWxzZSwgZmFsc2UpO1xyXG5cdFx0dGhpcy5jaGlsZHJlblswXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xyXG5cdFx0dGhpcy5jaGlsZHJlblsxXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgTmVpbkNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuTkVJTiwgZmFsc2UsIGZhbHNlKTtcclxuXHRcdHRoaXMuY2hpbGRyZW5bMF0ucm90YXRlWigtTWF0aC5QSS8yKTtcclxuXHRcdHRoaXMuY2hpbGRyZW5bMV0ucm90YXRlWigtTWF0aC5QSS8yKTtcclxuXHR9XHJcbn1cclxuXHJcblxyXG5leHBvcnQge1xyXG5cdENhcmQsIFR5cGVzLCBCbGFua0NhcmQsIENyZWRpdHNDYXJkLFxyXG5cdExpYmVyYWxQb2xpY3lDYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgTGliZXJhbFJvbGVDYXJkLCBGYXNjaXN0Um9sZUNhcmQsXHJcblx0SGl0bGVyUm9sZUNhcmQsIExpYmVyYWxQYXJ0eUNhcmQsIEZhc2Npc3RQYXJ0eUNhcmQsIEphQ2FyZCwgTmVpbkNhcmRcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuXHJcbmNsYXNzIFByZXNpZGVudEhhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMudG9waGF0O1xyXG5cdFx0dGhpcy5tb2RlbC5wb3NpdGlvbi5zZXQoMCwwLDApO1xyXG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XHJcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdpbml0JywgKCgpID0+IHtcclxuXHRcdFx0aWYoU0guZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJykgdGhpcy5pZGxlKCk7XHJcblx0XHR9KS5iaW5kKHRoaXMpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3NldHVwJywgdGhpcy5pZGxlLmJpbmQodGhpcykpO1xyXG5cdH1cclxuXHJcblx0aWRsZSgpe1xyXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMC43NSwgMCwgMCk7XHJcblx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCBNYXRoLlBJLzIsIDApO1xyXG5cdFx0U0guaWRsZVJvb3QuYWRkKHRoaXMpO1xyXG5cdH1cclxufTtcclxuXHJcbmNsYXNzIENoYW5jZWxsb3JIYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3IoKXtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnZpc29yY2FwO1xyXG5cdFx0dGhpcy5tb2RlbC5wb3NpdGlvbi5zZXQoMCwwLjA0LDApO1xyXG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XHJcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcclxuXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdpbml0JywgKCgpID0+IHtcclxuXHRcdFx0aWYoU0guZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJykgdGhpcy5pZGxlKCk7XHJcblx0XHR9KS5iaW5kKHRoaXMpKTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3NldHVwJywgdGhpcy5pZGxlLmJpbmQodGhpcykpO1xyXG5cclxuXHR9XHJcblxyXG5cdGlkbGUoKXtcclxuXHRcdHRoaXMucG9zaXRpb24uc2V0KC0wLjc1LCAwLCAwKTtcclxuXHRcdHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLzIsIDApO1xyXG5cdFx0U0guaWRsZVJvb3QuYWRkKHRoaXMpO1xyXG5cdH1cclxufTtcclxuXHJcbmV4cG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR2FtZVRhYmxlIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdC8vIHNhdmUgcmVmZXJlbmNlcyB0byB0aGUgdGV4dHVyZXNcclxuXHRcdHRoaXMudGV4dHVyZXMgPSBbXHJcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX3NtYWxsLFxyXG5cdFx0XHRBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9tZWQsXHJcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX2xhcmdlXHJcblx0XHRdO1xyXG5cclxuXHRcdC8vIGFkZCB0YWJsZSBhc3NldFxyXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50YWJsZS5jaGlsZHJlblswXTtcclxuXHRcdHRoaXMubW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJLzIsIDAsIDApO1xyXG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XHJcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcclxuXHJcblx0XHQvLyBzZXQgdGhlIGRlZmF1bHQgbWF0ZXJpYWxcclxuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwubWFwID0gdGhpcy50ZXh0dXJlc1swXTtcclxuXHJcblx0XHQvLyBwb3NpdGlvbiB0YWJsZVxyXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC43NSwgMCk7XHJcblx0fVxyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuZnVuY3Rpb24gZ2V0R2FtZUlkKClcclxue1xyXG5cdC8vIGZpcnN0IGNoZWNrIHRoZSB1cmxcclxuXHRsZXQgcmUgPSAvWz8mXWdhbWVJZD0oW14mXSspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xyXG5cdGlmKHJlKXtcclxuXHRcdHJldHVybiByZVsxXTtcclxuXHR9XHJcblx0ZWxzZSBpZihhbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudCl7XHJcblx0XHRyZXR1cm4gU0guZW52LnNpZDtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRsZXQgaWQgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogMTAwMDAwMDAwICk7XHJcblx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZSgnP2dhbWVJZD0nK2lkKTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCB7IGdldEdhbWVJZCB9O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTmFtZXBsYXRlIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKHNlYXROdW0pXHJcblx0e1xyXG5cdFx0c3VwZXIoKTtcclxuXHJcblx0XHR0aGlzLnNlYXROdW0gPSBzZWF0TnVtO1xyXG5cdFx0dGhpcy5vd25lciA9IG51bGw7IC8vIHVzZXJJZFxyXG5cclxuXHRcdC8vIGFkZCAzZCBtb2RlbFxyXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy5uYW1lcGxhdGUuY2hpbGRyZW5bMF0uY2xvbmUoKTtcclxuXHRcdHRoaXMubW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJLzIsIDAsIDApO1xyXG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XHJcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcclxuXHJcblx0XHQvLyBnZW5lcmF0ZSBtYXRlcmlhbFxyXG5cdFx0dGhpcy5ibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuXHRcdHRoaXMuYm1wLndpZHRoID0gTmFtZXBsYXRlLnRleHR1cmVTaXplO1xyXG5cdFx0dGhpcy5ibXAuaGVpZ2h0ID0gTmFtZXBsYXRlLnRleHR1cmVTaXplIC8gMjtcclxuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xyXG5cdFx0XHRtYXA6IG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKHRoaXMuYm1wKVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcGxhY2UgcGxhY2FyZFxyXG5cdFx0bGV0IHgsIHkgPSAwLjc2OSwgejtcclxuXHRcdHN3aXRjaChzZWF0TnVtKXtcclxuXHRcdGNhc2UgMDogY2FzZSAxOiBjYXNlIDI6XHJcblx0XHRcdHRoaXMubW9kZWwucm90YXRlWihNYXRoLlBJLzIpO1xyXG5cdFx0XHR4ID0gLTAuODMzICsgMC44MzMqc2VhdE51bTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoeCwgeSwgLTAuODMpO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgMzogY2FzZSA0OlxyXG5cdFx0XHR6ID0gLTAuNDM3ICsgMC44NzQqKHNlYXROdW0tMyk7XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KDEuMjEsIHksIHopO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XHJcblx0XHRcdHRoaXMubW9kZWwucm90YXRlWihNYXRoLlBJLzIpO1xyXG5cdFx0XHR4ID0gMC44MzMgLSAwLjgzMyooc2VhdE51bS01KTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoeCwgeSwgMC44Myk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0Y2FzZSA4OiBjYXNlIDk6XHJcblx0XHRcdHogPSAwLjQzNyAtIDAuODc0KihzZWF0TnVtLTgpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgtMS4yMSwgeSwgeik7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGNyZWF0ZSBsaXN0ZW5lciBwcm94aWVzXHJcblx0XHR0aGlzLl9yZXF1ZXN0Sm9pbiA9IHRoaXMucmVxdWVzdEpvaW4uYmluZCh0aGlzKTtcclxuXHRcdHRoaXMuX2hvdmVyQmVoYXZpb3IgPSBuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5Ib3ZlckNvbG9yKHtcclxuXHRcdFx0Y29sb3I6IG5ldyBUSFJFRS5Db2xvcigweGZmYThhOClcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGhvb2sgdXAgbGlzdGVuZXJzXHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdpbml0JywgdGhpcy51cGRhdGVPd25lcnNoaXAuYmluZCh0aGlzKSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdzZXR1cCcsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlVGV4dCh0ZXh0KVxyXG5cdHtcclxuXHRcdGxldCBmb250U2l6ZSA9IDcvMzIgKiBOYW1lcGxhdGUudGV4dHVyZVNpemUgKiAwLjY1O1xyXG5cclxuXHRcdC8vIHNldCB1cCBjYW52YXNcclxuXHRcdGxldCBnID0gdGhpcy5ibXAuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHRcdGxldCBmb250U3RhY2sgPSAnXCJIZWx2ZXRpY2EgTmV1ZVwiLCBIZWx2ZXRpY2EsIEFyaWFsLCBTYW5zLVNlcmlmJztcclxuXHRcdGcuZmlsbFN0eWxlID0gJyMyMjInO1xyXG5cdFx0Zy5maWxsUmVjdCgwLCAwLCBOYW1lcGxhdGUudGV4dHVyZVNpemUsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yKTtcclxuXHRcdGcuZm9udCA9IGBib2xkICR7Zm9udFNpemV9cHggJHtmb250U3RhY2t9YDtcclxuXHRcdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcblx0XHRnLmZpbGxTdHlsZSA9ICd3aGl0ZSc7XHJcblx0XHRnLmZpbGxUZXh0KHRleHQsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yLCAoMC40MiAtIDAuMTIpKihOYW1lcGxhdGUudGV4dHVyZVNpemUvMikpO1xyXG5cclxuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwubWFwLm5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdHJlcXVlc3RKb2luKClcclxuXHR7XHJcblx0XHRjb25zb2xlLmxvZygnUmVxdWVzdGluZyB0byBqb2luIGF0IHNlYXQnLCB0aGlzLnNlYXROdW0pO1xyXG5cdFx0U0guc29ja2V0LmVtaXQoJ3JlcXVlc3RKb2luJywgT2JqZWN0LmFzc2lnbih7c2VhdE51bTogdGhpcy5zZWF0TnVtfSwgU0gubG9jYWxVc2VyKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVPd25lcnNoaXAoKVxyXG5cdHtcclxuXHRcdC8vIGNoZWNrIGZvciBwbGF5ZXJcclxuXHRcdGxldCBvd25lciA9IE9iamVjdC5rZXlzKFNILnBsYXllcnMpLmZpbmQoKGUgPT4gU0gucGxheWVyc1tlXS5zZWF0TnVtID09IHRoaXMuc2VhdE51bSkuYmluZCh0aGlzKSk7XHJcblx0XHRjb25zb2xlLmxvZyhvd25lciwgdGhpcy5vd25lcik7XHJcblxyXG5cdFx0Ly8gcGxheWVyIGpvaW5lZFxyXG5cdFx0aWYob3duZXIgJiYgIXRoaXMub3duZXIpXHJcblx0XHR7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdvd25lciBmb3VuZCcpO1xyXG5cdFx0XHR0aGlzLm93bmVyID0gb3duZXI7XHJcblx0XHRcdHRoaXMudXBkYXRlVGV4dChTSC5wbGF5ZXJzW3RoaXMub3duZXJdLmRpc3BsYXlOYW1lKTtcclxuXHJcblx0XHRcdHRoaXMubW9kZWwuX19iZWhhdmlvckxpc3QgPSB0aGlzLm1vZGVsLl9fYmVoYXZpb3JMaXN0IHx8IFtdOyAvLyBUT0RPOiB1Z2hcclxuXHRcdFx0dGhpcy5tb2RlbC5yZW1vdmVCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcclxuXHRcdFx0dGhpcy5tb2RlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuX3JlcXVlc3RKb2luKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBwbGF5ZXIgbGVmdFxyXG5cdFx0ZWxzZSBpZighb3duZXIgJiYgKHRoaXMub3duZXIgfHwgdGhpcy5vd25lciA9PT0gbnVsbCkpXHJcblx0XHR7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdvd25lciBsb3N0Jyk7XHJcblx0XHRcdHRoaXMub3duZXIgPSAwO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVRleHQoJzxKb2luPicpO1xyXG5cdFx0XHR0aGlzLm1vZGVsLmFkZEJlaGF2aW9yKHRoaXMuX2hvdmVyQmVoYXZpb3IpO1xyXG5cdFx0XHR0aGlzLm1vZGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5fcmVxdWVzdEpvaW4pO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuTmFtZXBsYXRlLnRleHR1cmVTaXplID0gNTEyO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgKiBhcyBDYXJkcyBmcm9tICcuL2NhcmQnO1xyXG5pbXBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfSBmcm9tICcuL2hhdHMnO1xyXG5pbXBvcnQgR2FtZVRhYmxlIGZyb20gJy4vdGFibGUnO1xyXG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcclxuaW1wb3J0IHsgZ2V0R2FtZUlkIH0gZnJvbSAnLi91dGlscyc7XHJcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnO1xyXG5cclxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5hc3NldHMgPSBBc3NldE1hbmFnZXIubWFuaWZlc3Q7XHJcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcclxuXHRcdHRoaXMubmVlZHNTa2VsZXRvbiA9IHRydWU7XHJcblxyXG5cdFx0Ly8gcG9seWZpbGwgZ2V0VXNlciBmdW5jdGlvblxyXG5cdFx0aWYoIWFsdHNwYWNlLmluQ2xpZW50KXtcclxuXHRcdFx0YWx0c3BhY2UuZ2V0VXNlciA9ICgpID0+IHtcclxuXHRcdFx0XHRsZXQgaWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCk7XHJcblx0XHRcdFx0YWx0c3BhY2UuX2xvY2FsVXNlciA9IHtcclxuXHRcdFx0XHRcdHVzZXJJZDogaWQsXHJcblx0XHRcdFx0XHRkaXNwbGF5TmFtZTogJ0d1ZXN0JytpZCxcclxuXHRcdFx0XHRcdGlzTW9kZXJhdG9yOiBmYWxzZVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ01hc3F1ZXJhZGluZyBhcycsIGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xyXG5cdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoYWx0c3BhY2UuX2xvY2FsVXNlcik7XHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gZ2V0IGxvY2FsIHVzZXJcclxuXHRcdGFsdHNwYWNlLmdldFVzZXIoKS50aGVuKCh1c2VyID0+XHJcblx0XHR7XHJcblx0XHRcdHRoaXMubG9jYWxVc2VyID0ge1xyXG5cdFx0XHRcdGlkOiB1c2VyLnVzZXJJZC50b1N0cmluZygpLFxyXG5cdFx0XHRcdGRpc3BsYXlOYW1lOiB1c2VyLmRpc3BsYXlOYW1lLFxyXG5cdFx0XHRcdGlzTW9kZXJhdG9yOiB1c2VyLmlzTW9kZXJhdG9yXHJcblx0XHRcdH07XHJcblx0XHR9KS5iaW5kKHRoaXMpKTtcclxuXHJcblx0XHR0aGlzLmdhbWUgPSBudWxsO1xyXG5cdFx0dGhpcy5wbGF5ZXJzID0gbnVsbDtcclxuXHR9XHJcblxyXG5cdGluaXRpYWxpemUoZW52LCByb290LCBhc3NldHMpXHJcblx0e1xyXG5cdFx0Ly8gc2hhcmUgdGhlIGRpb3JhbWEgaW5mb1xyXG5cdFx0QXNzZXRNYW5hZ2VyLmNhY2hlID0gYXNzZXRzO1xyXG5cdFx0dGhpcy5lbnYgPSBlbnY7XHJcblxyXG5cdFx0Ly8gY29ubmVjdCB0byBzZXJ2ZXJcclxuXHRcdHRoaXMuc29ja2V0ID0gaW8uY29ubmVjdCgnLycsIHtxdWVyeTogJ2dhbWVJZD0nK2dldEdhbWVJZCgpfSk7XHJcblxyXG5cdFx0Ly8gY3JlYXRlIHRoZSB0YWJsZVxyXG5cdFx0dGhpcy5nYW1lVGFibGUgPSBuZXcgR2FtZVRhYmxlKCk7XHJcblx0XHR0aGlzLmFkZCh0aGlzLmdhbWVUYWJsZSk7XHJcblxyXG5cdFx0dGhpcy5yZXNldEJ1dHRvbiA9IG5ldyBUSFJFRS5NZXNoKFxyXG5cdFx0XHRuZXcgVEhSRUUuQm94R2VvbWV0cnkoLjI1LC4yNSwuMjUpLFxyXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogYXNzZXRzLnRleHR1cmVzLnJlc2V0fSlcclxuXHRcdCk7XHJcblx0XHR0aGlzLnJlc2V0QnV0dG9uLnBvc2l0aW9uLnNldCgwLCAtMC4xOCwgMCk7XHJcblx0XHR0aGlzLnJlc2V0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5yZXNldC5iaW5kKHRoaXMpKTtcclxuXHRcdHRoaXMuZ2FtZVRhYmxlLmFkZCh0aGlzLnJlc2V0QnV0dG9uKTtcclxuXHJcblx0XHQvLyBjcmVhdGUgaWRsZSBkaXNwbGF5XHJcblx0XHR0aGlzLmlkbGVSb290ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHR0aGlzLmlkbGVSb290LnBvc2l0aW9uLnNldCgwLCAxLjUsIDApO1xyXG5cdFx0dGhpcy5pZGxlUm9vdC5hZGRCZWhhdmlvcihuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5TcGluKHtzcGVlZDogMC4wMDAyfSkpO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5pZGxlUm9vdCk7XHJcblxyXG5cdFx0Ly8gY3JlYXRlIGlkbGUgc2xpZGVzaG93XHJcblx0XHRsZXQgY3JlZGl0cyA9IG5ldyBDYXJkcy5DcmVkaXRzQ2FyZCgpO1xyXG5cdFx0dGhpcy5pZGxlUm9vdC5hZGQoY3JlZGl0cyk7XHJcblxyXG5cdFx0Ly8gY3JlYXRlIGhhdHNcclxuXHRcdHRoaXMucHJlc2lkZW50SGF0ID0gbmV3IFByZXNpZGVudEhhdCgpO1xyXG5cdFx0dGhpcy5jaGFuY2VsbG9ySGF0ID0gbmV3IENoYW5jZWxsb3JIYXQoKTtcclxuXHJcblx0XHQvLyBjcmVhdGUgcG9zaXRpb25zXHJcblx0XHR0aGlzLnNlYXRzID0gW107XHJcblx0XHRmb3IobGV0IGk9MDsgaTwxMDsgaSsrKXtcclxuXHRcdFx0bGV0IHNlYXQgPSBuZXcgTmFtZXBsYXRlKGkpO1xyXG5cdFx0XHR0aGlzLnNlYXRzLnB1c2goc2VhdCk7XHJcblx0XHR9XHJcblx0XHR0aGlzLmFkZCguLi50aGlzLnNlYXRzKTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5vbigndXBkYXRlJywgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlRnJvbVNlcnZlcihnYW1lLCBwbGF5ZXJzKVxyXG5cdHtcclxuXHRcdGNvbnNvbGUubG9nKGdhbWUsIHBsYXllcnMpO1xyXG5cclxuXHRcdGlmKCF0aGlzLmdhbWUgJiYgIXRoaXMucGxheWVycyl7XHJcblx0XHRcdHRoaXMuZ2FtZSA9IGdhbWU7XHJcblx0XHRcdHRoaXMucGxheWVycyA9IHBsYXllcnM7XHJcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTogJ2luaXQnLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdE9iamVjdC5hc3NpZ24odGhpcy5nYW1lLCBnYW1lKTtcclxuXHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLnBsYXllcnMsIHBsYXllcnMpO1xyXG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6IHRoaXMuZ2FtZS5zdGF0ZSsnX2VuZCcsIGJ1YmJsZXM6IGZhbHNlfSk7XHJcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTogdGhpcy5nYW1lLnN0YXRlLCBidWJibGVzOiBmYWxzZX0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmVzZXQoKVxyXG5cdHtcclxuXHRcdGNvbnNvbGUubG9nKCdyZXF1ZXN0aW5nIHJlc2V0JywgdGhpcyk7XHJcblx0XHR0aGlzLmdhbWUgPSBudWxsO1xyXG5cdFx0dGhpcy5wbGF5ZXJzID0gbnVsbDtcclxuXHRcdHRoaXMuc29ja2V0LmVtaXQoJ3Jlc2V0Jyk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBuZXcgU2VjcmV0SGl0bGVyKCk7XHJcbiJdLCJuYW1lcyI6WyJ0aGlzIiwic3VwZXIiLCJsZXQiLCJBc3NldE1hbmFnZXIiLCJDYXJkcy5DcmVkaXRzQ2FyZCJdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsU0FBZTtDQUNkLFFBQVEsRUFBRTtFQUNULE1BQU0sRUFBRTtHQUNQLEtBQUssRUFBRSx3QkFBd0I7R0FDL0IsU0FBUyxFQUFFLDRCQUE0QjtHQUN2QyxNQUFNLEVBQUUseUJBQXlCO0dBQ2pDLFFBQVEsRUFBRSw0QkFBNEI7R0FDdEM7RUFDRCxRQUFRLEVB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RyxDQUFDLENBQUM7OztFQUdqQixHQUFHLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxHQUFHLENBQUMsTUFBTTtFQUM1QztHQUNDLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztHQUN4Q0MsSUFBSSxHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7R0FDbEUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7R0FFckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7R0FDckI7OztFQUdELElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUN2QyxJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7RUFDMUMsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0VBQ3RDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0VBQzVCLENBQUE7O0NBRUQsa0JBQUEsTUFBTTtDQUNOOztFQUVDQSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztFQUN0REEsSUFBSSxJQUFJLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxVQUFBLENBQUMsRUFBQyxTQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQSxDQUFDO0VBQzdELEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMs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
