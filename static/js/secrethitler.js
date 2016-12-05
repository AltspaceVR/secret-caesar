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
	function Card(type, doubleSided, secret)
	{
		if ( type === void 0 ) type = Types.BLANK;
		if ( doubleSided === void 0 ) doubleSided = true;
		if ( secret === void 0 ) secret = false;

		superclass.call(this);

		// create the card faces
		var cardGeo = new THREE.PlaneGeometry(.715, 1);
		var front = new THREE.Mesh(cardGeo,
			new THREE.MeshBasicMaterial({map: AM.cache.textures.cards})
		);
		var back = new THREE.Mesh(cardGeo,
			new THREE.MeshBasicMaterial({map: AM.cache.textures.cards})
		);
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
		this.position.set(0, 1.0, 0);
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
		var x, y = 0.018, z;
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

		// player joined
		if(owner && !this.owner)
		{
			this.owner = owner;
			this.updateText(SH.players[this.owner].displayName);

			this.model.__behaviorList = this.model.__behaviorList || []; // TODO: ugh
			this.model.removeBehavior(this._hoverBehavior);
			this.model.removeEventListener('cursorup', this._requestJoin);
		}

		// player left
		else if(!owner && (this.owner || this.owner === null))
		{
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
			var seat = new Nameplate(i);
			this$1.seats.push(seat);
		}
		(ref = this.table).add.apply(ref, this.seats);

		// add avatar for scale
		assets.models.dummy.position.set(0, 0, 1.2);
		assets.models.dummy.rotation.set(0, Math.PI, 0);
		this.add(assets.models.dummy);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvYXNzZXRtYW5hZ2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9nYW1lb2JqZWN0cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVybWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RhYmxlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC91dGlscy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWNyZXRoaXRsZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG5cdG1hbmlmZXN0OiB7XHJcblx0XHRtb2RlbHM6IHtcclxuXHRcdFx0dGFibGU6ICdzdGF0aWMvbW9kZWwvdGFibGUuZGFlJyxcclxuXHRcdFx0bmFtZXBsYXRlOiAnc3RhdGljL21vZGVsL25hbWVwbGF0ZS5kYWUnLFxyXG5cdFx0XHR0b3BoYXQ6ICdzdGF0aWMvbW9kZWwvdG9waGF0LmdsdGYnLFxyXG5cdFx0XHR2aXNvcmNhcDogJ3N0YXRpYy9tb2RlbC92aXNvcl9jYXAuZ2x0ZicsXHJcblx0XHRcdGR1bW15OiAnc3RhdGljL21vZGVsL2R1bW15LmdsdGYnXHJcblx0XHR9LFxyXG5cdFx0dGV4dHVyZXM6IHtcclxuXHRcdFx0Ym9hcmRfbGFyZ2U6ICdzdGF0aWMvaW1nL2JvYXJkLWxhcmdlLWJha2VkLnBuZycsXHJcblx0XHRcdGJvYXJkX21lZDogJ3N0YXRpYy9pbWcvYm9hcmQtbWVkaXVtLWJha2VkLnBuZycsXHJcblx0XHRcdGJvYXJkX3NtYWxsOiAnc3RhdGljL2ltZy9ib2FyZC1zbWFsbC1iYWtlZC5wbmcnLFxyXG5cdFx0XHRjYXJkczogJ3N0YXRpYy9pbWcvY2FyZHMucG5nJyxcclxuXHRcdFx0cmVzZXQ6ICdzdGF0aWMvaW1nL2JvbWIucG5nJ1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0Y2FjaGU6IHt9XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuY2xhc3MgR2FtZVN0YXRlXHJcbntcclxuXHRjb25zdHJ1Y3RvcihpZClcclxuXHR7XHJcblx0XHR0aGlzLmlkID0gaWQ7XHJcblxyXG5cdFx0dGhpcy5zdGF0ZSA9ICdpZGxlJztcclxuXHJcblx0XHR0aGlzLnR1cm5PcmRlciA9IFtdOyAvLyBhcnJheSBvZiB1c2VySWRzXHJcblx0XHR0aGlzLnByZXNpZGVudCA9IDA7IC8vIHVzZXJJZFxyXG5cdFx0dGhpcy5jaGFuY2VsbG9yID0gMDsgLy8gdXNlcklkXHJcblx0XHR0aGlzLmxhc3RQcmVzaWRlbnQgPSAwOyAvLyB1c2VySWRcclxuXHRcdHRoaXMubGFzdENoYW5jZWxsb3IgPSAwOyAvLyB1c2VySWRcclxuXHJcblx0XHR0aGlzLmxpYmVyYWxQb2xpY2llcyA9IDA7XHJcblx0XHR0aGlzLmZhc2Npc3RQb2xpY2llcyA9IDA7XHJcblx0XHR0aGlzLmRlY2tGYXNjaXN0ID0gMTE7XHJcblx0XHR0aGlzLmRlY2tMaWJlcmFsID0gNjtcclxuXHRcdHRoaXMuZGlzY2FyZEZhc2Npc3QgPSAwO1xyXG5cdFx0dGhpcy5kaXNjYXJkTGliZXJhbCA9IDA7XHJcblx0XHR0aGlzLnNwZWNpYWxFbGVjdGlvbiA9IGZhbHNlO1xyXG5cdFx0dGhpcy5mYWlsZWRWb3RlcyA9IDA7XHJcblx0fVxyXG5cclxuXHRuZXh0UHJlc2lkZW50KClcclxuXHR7XHJcblx0XHRsZXQgdHVybiA9IDA7XHJcblxyXG5cdFx0Ly8gdGhpcyBpcyB0aGUgZmlyc3Qgcm91bmQsIGNob29zZSBwcmVzaWRlbnQgcmFuZG9tbHlcclxuXHRcdGlmKCF0aGlzLnByZXNpZGVudClcclxuXHRcdFx0dHVybiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMudHVybk9yZGVyLmxlbmd0aCk7XHJcblxyXG5cdFx0Ly8gdGhpcyBpcyBhIHNwZWNpYWwgZWxlY3Rpb24sIHNvIGNvdW50IGZyb20gcHJlc2lkZW50IGVtZXJpdHVzXHJcblx0XHRlbHNlIGlmKHRoaXMuc3BlY2lhbEVsZWN0aW9uKVxyXG5cdFx0XHR0dXJuID0gdGhpcy5wbGF5ZXJzW3RoaXMubGFzdFByZXNpZGVudF0udHVybk9yZGVyO1xyXG5cclxuXHRcdC8vIGEgcmVndWxhciBlbGVjdGlvbjogcG93ZXIgcGFzc2VzIHRvIHRoZSBsZWZ0XHJcblx0XHRlbHNlXHJcblx0XHRcdHR1cm4gPSB0aGlzLnBsYXllcnNbdGhpcy5wcmVzaWRlbnRdLnR1cm5PcmRlcjtcclxuXHJcblx0XHRyZXR1cm4gdGhpcy50dXJuT3JkZXJbICh0dXJuKzEpJXRoaXMudHVybk9yZGVyLmxlbmd0aCBdO1xyXG5cdH1cclxuXHJcblx0ZHJhd1BvbGljaWVzKClcclxuXHR7XHJcblxyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgUGxheWVyXHJcbntcclxuXHRjb25zdHJ1Y3Rvcih1c2VySWQgPSAwLCBkaXNwbGF5TmFtZSA9ICdkdW1teScsIGlzTW9kZXJhdG9yID0gZmFsc2UpXHJcblx0e1xyXG5cdFx0dGhpcy51c2VySWQgPSB1c2VySWQ7XHJcblx0XHR0aGlzLmRpc3BsYXlOYW1lID0gZGlzcGxheU5hbWU7XHJcblx0XHR0aGlzLmlzTW9kZXJhdG9yID0gZmFsc2U7XHJcblx0XHR0aGlzLnR1cm5PcmRlciA9IC0xOyAvLyB1bmtub3duIHVudGlsIGdhbWUgc3RhcnRzXHJcblxyXG5cdFx0dGhpcy5yb2xlID0gJ3VuYXNzaWduZWQnOyAvLyBvbmUgb2YgJ3VuYXNzaWduZWQnLCAnaGl0bGVyJywgJ2Zhc2Npc3QnLCAnbGliZXJhbCdcclxuXHRcdHRoaXMuc3RhdGUgPSAnbm9ybWFsJzsgLy8gb25lIG9mICdub3JtYWwnLCAnaW52ZXN0aWdhdGVkJywgJ2RlYWQnXHJcblx0fVxyXG5cclxuXHRnZXQgcGFydHkoKXtcclxuXHRcdGlmKHRoaXMucm9sZSA9PT0gJ2hpdGxlcicpIHJldHVybiAnZmFzY2lzdCc7XHJcblx0XHRlbHNlIHJldHVybiB0aGlzLnJvbGU7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgeyBHYW1lU3RhdGUsIFBsYXllciB9O1xyXG5cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IHsgUGxheWVyIH0gZnJvbSAnLi9nYW1lb2JqZWN0cyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGF5ZXJNYW5hZ2VyXHJcbntcclxuXHRjb25zdHJ1Y3RvcigpXHJcblx0e1xyXG5cdFx0dGhpcy5sb2NhbFVzZXIgPSBudWxsO1xyXG5cdFx0dGhpcy5wbGF5ZXJzID0gW107XHJcblx0fVxyXG5cclxuXHRhY3F1aXJlTG9jYWxVc2VyKClcclxuXHR7XHJcblx0XHRpZih3aW5kb3cuYWx0c3BhY2UgJiYgYWx0c3BhY2UuaW5DbGllbnQpXHJcblx0XHR7XHJcblx0XHRcdHRoaXMubG9jYWxVc2VyID0ge307XHJcblxyXG5cdFx0XHQvLyBnZXQgdGhlIGxvY2FsIHVzZXIgaWQgYW5kIG5hbWVcclxuXHRcdFx0YWx0c3BhY2UuZ2V0VXNlcigpLnRoZW4oKHVzZXIgPT4ge1xyXG5cdFx0XHRcdE9iamVjdC5hc3NpZ24odGhpcy5sb2NhbFVzZXIsIHVzZXIpO1xyXG5cdFx0XHR9KS5iaW5kKHRoaXMpKTtcclxuXHJcblx0XHRcdC8vIGdldCB0aGUgdXNlciB0cmFja2luZyBza2VsZXRvblxyXG5cdFx0XHRhbHRzcGFjZS5nZXRUaHJlZUpTVHJhY2tpbmdTa2VsZXRvbigpLnRoZW4oKHRzID0+IHtcclxuXHRcdFx0XHR0aGlzLmxvY2FsVXNlci5za2VsZXRvbiA9IHRzO1xyXG5cdFx0XHRcdFNILmFkZCh0cyk7XHJcblx0XHRcdH0pLmJpbmQodGhpcykpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZVxyXG5cdFx0e1xyXG5cdFx0XHQvLyBmYWtlIHVzZXIgZGF0YVxyXG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcclxuXHRcdFx0XHR1c2VySWQ6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDApLFxyXG5cdFx0XHRcdGlzTW9kZXJhdG9yOiBmYWxzZVxyXG5cdFx0XHR9O1xyXG5cdFx0XHR0aGlzLmxvY2FsVXNlci5kaXNwbGF5TmFtZSA9ICdXZWIgVXNlciAnK3RoaXMubG9jYWxVc2VyLnVzZXJJZDtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IFBNIGZyb20gJy4vcGxheWVybWFuYWdlcic7XHJcblxyXG5jbGFzcyBCZWhhdmlvclxyXG57XHJcblx0Y29uc3RydWN0b3IodHlwZSl7XHJcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xyXG5cdH1cclxuXHJcblx0YXdha2Uob2JqKXtcclxuXHRcdHRoaXMub2JqZWN0M0QgPSBvYmo7XHJcblx0fVxyXG5cclxuXHRzdGFydCgpeyB9XHJcblxyXG5cdHVwZGF0ZShkVCl7IH1cclxuXHJcblx0ZGlzcG9zZSgpeyB9XHJcbn1cclxuXHJcbmNsYXNzIEJTeW5jIGV4dGVuZHMgQmVoYXZpb3Jcclxue1xyXG5cdGNvbnN0cnVjdG9yKGV2ZW50TmFtZSlcclxuXHR7XHJcblx0XHRzdXBlcignQlN5bmMnKTtcclxuXHRcdHRoaXMuX3MgPSBTSC5zb2NrZXQ7XHJcblxyXG5cdFx0Ly8gbGlzdGVuIGZvciB1cGRhdGUgZXZlbnRzXHJcblx0XHR0aGlzLmhvb2sgPSB0aGlzLl9zLm9uKGV2ZW50TmFtZSwgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xyXG5cdFx0dGhpcy5ldmVudE5hbWUgPSBldmVudE5hbWU7XHJcblx0XHR0aGlzLm93bmVyID0gJ3Vub3duZWQnO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlRnJvbVNlcnZlcihkYXRhKVxyXG5cdHtcclxuXHRcdHRoaXMub2JqZWN0M0QucG9zaXRpb24uZnJvbUFycmF5KGRhdGEsIDApO1xyXG5cdFx0dGhpcy5vYmplY3QzRC5yb3RhdGlvbi5mcm9tQXJyYXkoZGF0YSwgMyk7XHJcblx0fVxyXG5cclxuXHR0YWtlT3duZXJzaGlwKClcclxuXHR7XHJcblx0XHRpZihQTS5sb2NhbFVzZXIgJiYgUE0ubG9jYWxVc2VyLnVzZXJJZClcclxuXHRcdFx0dGhpcy5vd25lciA9IFBNLmxvY2FsVXNlci51c2VySWQ7XHJcblx0fVxyXG5cclxuXHR1cGRhdGUoZFQpXHJcblx0e1xyXG5cdFx0aWYoUE0ubG9jYWxVc2VyICYmIFBNLmxvY2FsVXNlci5za2VsZXRvbiAmJiBQTS5sb2NhbFVzZXIudXNlcklkID09PSB0aGlzLm93bmVyKVxyXG5cdFx0e1xyXG5cdFx0XHRsZXQgaiA9IFBNLmxvY2FsVXNlci5za2VsZXRvbi5nZXRKb2ludCgnSGVhZCcpO1xyXG5cdFx0XHR0aGlzLl9zLmVtaXQodGhpcy5ldmVudE5hbWUsIFsuLi5qLnBvc2l0aW9uLnRvQXJyYXkoKSwgLi4uai5yb3RhdGlvbi50b0FycmF5KCldKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG59XHJcblxyXG5leHBvcnQgeyBCZWhhdmlvciwgQlN5bmMgfTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IHsgQmVoYXZpb3IgfSBmcm9tICcuL2JlaGF2aW9yJztcclxuXHJcbmNsYXNzIEFuaW1hdGUgZXh0ZW5kcyBCZWhhdmlvclxyXG57XHJcblx0Y29uc3RydWN0b3IoLy97cGFyZW50LCBwb3MsIHF1YXQsIHNjYWxlLCBtYXRyaXgsIGR1cmF0aW9uLCBjYWxsYmFja31cclxuXHRcdHtwYXJlbnQ9bnVsbCwgcG9zPW51bGwsIHF1YXQ9bnVsbCwgc2NhbGU9bnVsbCwgbWF0cml4PW51bGwsIGR1cmF0aW9uPTYwMCwgY2FsbGJhY2s9KCk9Pnt9fSlcclxuXHR7XHJcblx0XHRzdXBlcignQW5pbWF0ZScpO1xyXG5cdFx0XHJcblx0XHRpZihtYXRyaXgpXHJcblx0XHR7XHJcblx0XHRcdC8vIGV4dHJhY3QgcG9zaXRpb24vcm90YXRpb24vc2NhbGUgZnJvbSBtYXRyaXhcclxuXHRcdFx0cG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcclxuXHRcdFx0cXVhdCA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XHJcblx0XHRcdHNjYWxlID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcclxuXHRcdFx0bWF0cml4LmRlY29tcG9zZShwb3MsIHF1YXQsIHNjYWxlKTtcclxuXHRcdH1cclxuXHJcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHtwYXJlbnQsIHBvcywgcXVhdCwgc2NhbGUsIGR1cmF0aW9uLCBjYWxsYmFja30pO1xyXG5cdH1cclxuXHJcblx0YXdha2Uob2JqKVxyXG5cdHtcclxuXHRcdHN1cGVyLmF3YWtlKG9iaik7XHJcblxyXG5cdFx0Ly8gc2h1ZmZsZSBoaWVyYXJjaHksIGJ1dCBrZWVwIHdvcmxkIHRyYW5zZm9ybSB0aGUgc2FtZVxyXG5cdFx0aWYodGhpcy5wYXJlbnQgJiYgdGhpcy5wYXJlbnQgIT09IG9iai5wYXJlbnQpXHJcblx0XHR7XHJcblx0XHRcdG9iai5hcHBseU1hdHJpeChvYmoucGFyZW50Lm1hdHJpeFdvcmxkKTtcclxuXHRcdFx0bGV0IG1hdCA9IG5ldyBUSFJFRS5NYXRyaXg0KCkuZ2V0SW52ZXJzZSh0aGlzLnBhcmVudC5tYXRyaXhXb3JsZCk7XHJcblx0XHRcdG9iai5hcHBseU1hdHJpeChtYXQpO1xyXG5cclxuXHRcdFx0dGhpcy5wYXJlbnQuYWRkKG9iaik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gcmVhZCBpbml0aWFsIHBvc2l0aW9uc1xyXG5cdFx0dGhpcy5pbml0aWFsUG9zID0gb2JqLnBvc2l0aW9uLmNsb25lKCk7XHJcblx0XHR0aGlzLmluaXRpYWxRdWF0ID0gb2JqLnF1YXRlcm5pb24uY2xvbmUoKTtcclxuXHRcdHRoaXMuaW5pdGlhbFNjYWxlID0gb2JqLnNjYWxlLmNsb25lKCk7XHJcblx0XHR0aGlzLnN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGUoKVxyXG5cdHtcclxuXHRcdC8vIGNvbXB1dGUgZWFzZS1vdXQgYmFzZWQgb24gZHVyYXRpb25cclxuXHRcdGxldCBtaXggPSAoRGF0ZS5ub3coKS10aGlzLnN0YXJ0VGltZSkgLyB0aGlzLmR1cmF0aW9uO1xyXG5cdFx0bGV0IGVhc2UgPSBUV0VFTiA/IFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0IDogbiA9PiBuKigyLW4pO1xyXG5cdFx0bWl4ID0gbWl4IDwgMSA/IGVhc2UobWl4KSA6IDE7XHJcblxyXG5cdFx0Ly8gYW5pbWF0ZSBwb3NpdGlvbiBpZiByZXF1ZXN0ZWRcclxuXHRcdGlmKCB0aGlzLnBvcyApe1xyXG5cdFx0XHR0aGlzLm9iamVjdDNELnBvc2l0aW9uLmxlcnBWZWN0b3JzKHRoaXMuaW5pdGlhbFBvcywgdGhpcy5wb3MsIG1peCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gYW5pbWF0ZSByb3RhdGlvbiBpZiByZXF1ZXN0ZWRcclxuXHRcdGlmKCB0aGlzLnF1YXQgKXtcclxuXHRcdFx0VEhSRUUuUXVhdGVybmlvbi5zbGVycCh0aGlzLmluaXRpYWxRdWF0LCB0aGlzLnF1YXQsIHRoaXMub2JqZWN0M0QucXVhdGVybmlvbiwgbWl4KVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGFuaW1hdGUgc2NhbGUgaWYgcmVxdWVzdGVkXHJcblx0XHRpZiggdGhpcy5zY2FsZSApe1xyXG5cdFx0XHR0aGlzLm9iamVjdDNELnNjYWxlLmxlcnBWZWN0b3JzKHRoaXMuaW5pdGlhbFNjYWxlLCB0aGlzLnNjYWxlLCBtaXgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHRlcm1pbmF0ZSBhbmltYXRpb24gd2hlbiBkb25lXHJcblx0XHRpZihtaXggPj0gMSl7XHJcblx0XHRcdHRoaXMub2JqZWN0M0QucmVtb3ZlQmVoYXZpb3IodGhpcyk7XHJcblx0XHRcdHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLm9iamVjdDNEKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbkFuaW1hdGUuc3RhcnQgPSAodGFyZ2V0LCBvcHRzKSA9PlxyXG57XHJcblx0bGV0IG9sZEFuaW0gPSB0YXJnZXQuZ2V0QmVoYXZpb3JCeVR5cGUoJ0FuaW1hdGUnKTtcclxuXHRpZihvbGRBbmltKXtcclxuXHRcdG9sZEFuaW0uY29uc3RydWN0b3Iob3B0cyk7XHJcblx0XHRvbGRBbmltLmF3YWtlKHRhcmdldCk7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0dGFyZ2V0LmFkZEJlaGF2aW9yKCBuZXcgQW5pbWF0ZShvcHRzKSApO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgQW5pbWF0ZTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XHJcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XHJcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XHJcblxyXG5cclxuLy8gZW51bSBjb25zdGFudHNcclxubGV0IFR5cGVzID0gT2JqZWN0LmZyZWV6ZSh7XHJcblx0UE9MSUNZX0xJQkVSQUw6IDAsXHJcblx0UE9MSUNZX0ZBU0NJU1Q6IDEsXHJcblx0Uk9MRV9MSUJFUkFMOiAyLFxyXG5cdFJPTEVfRkFTQ0lTVDogMyxcclxuXHRST0xFX0hJVExFUjogNCxcclxuXHRQQVJUWV9MSUJFUkFMOiA1LFxyXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXHJcblx0SkE6IDcsXHJcblx0TkVJTjogOCxcclxuXHRCTEFOSzogOSxcclxuXHRDUkVESVRTOiAxMFxyXG59KTtcclxuXHJcbmZ1bmN0aW9uIGRpbXNUb1VWKHtzaWRlLCBsZWZ0LCByaWdodCwgdG9wLCBib3R0b219KVxyXG57XHJcblx0aWYoc2lkZSlcclxuXHRcdHJldHVybiBbW1xyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMih0b3AsIGxlZnQpLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIGxlZnQpLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMih0b3AsIHJpZ2h0KVxyXG5cdFx0XSxbXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGJvdHRvbSwgbGVmdCksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGJvdHRvbSwgcmlnaHQpLFxyXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMih0b3AsIHJpZ2h0KVxyXG5cdFx0XV07XHJcblx0ZWxzZVxyXG5cdFx0cmV0dXJuIFtbXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIHRvcCksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIGJvdHRvbSksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCB0b3ApXHJcblx0XHRdLFtcclxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIobGVmdCwgYm90dG9tKSxcclxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIocmlnaHQsIGJvdHRvbSksXHJcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCB0b3ApXHJcblx0XHRdXTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0VVZzKHR5cGUpXHJcbntcclxuXHRsZXQgZGltcyA9IHtsZWZ0OiAwLCByaWdodDogMSwgYm90dG9tOiAwLCB0b3A6IDF9O1xyXG5cclxuXHRzd2l0Y2godHlwZSlcclxuXHR7XHJcblx0Y2FzZSBUeXBlcy5QT0xJQ1lfTElCRVJBTDpcclxuXHRcdGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC44MzQsIHJpZ2h0OiAwLjk5NiwgdG9wOiAwLjc1NCwgYm90dG9tOiAwLjk5N307XHJcblx0XHRicmVhaztcclxuXHRjYXNlIFR5cGVzLlBPTElDWV9GQVNDSVNUOlxyXG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjY2LCByaWdodDogMC44MjIsIHRvcDogMC43NTQsIGJvdHRvbTogMC45OTZ9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5ST0xFX0xJQkVSQUw6XHJcblx0XHRkaW1zID0ge2xlZnQ6IDAuNTA1LCByaWdodDogMC43NDYsIHRvcDogMC45OTYsIGJvdHRvbTogMC42NX07XHJcblx0XHRicmVhaztcclxuXHRjYXNlIFR5cGVzLlJPTEVfRkFTQ0lTVDpcclxuXHRcdGRpbXMgPSB7bGVmdDogMC41MDUsIHJpZ2h0OiAwLjc0NiwgdG9wOiAwLjY0NSwgYm90dG9tOiAwLjN9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5ST0xFX0hJVExFUjpcclxuXHRcdGRpbXMgPSB7bGVmdDogMC43NTQsIHJpZ2h0OiAwLjk5NiwgdG9wOiAwLjY0NSwgYm90dG9tOiAwLjN9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5QQVJUWV9MSUJFUkFMOlxyXG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjI1NSwgcmlnaHQ6IDAuNDk1LCB0b3A6IDAuOTk2LCBib3R0b206IDAuNjV9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5QQVJUWV9GQVNDSVNUOlxyXG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjI1NSwgcmlnaHQ6IDAuNDk1LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XHJcblx0XHRicmVhaztcclxuXHRjYXNlIFR5cGVzLkpBOlxyXG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjAwNSwgcmlnaHQ6IDAuMjQ0LCB0b3A6IDAuOTkyLCBib3R0b206IDAuNjUzfTtcclxuXHRcdGJyZWFrO1xyXG5cdGNhc2UgVHlwZXMuTkVJTjpcclxuXHRcdGRpbXMgPSB7bGVmdDogMC4wMDYsIHJpZ2h0OiAwLjI0MywgdG9wOiAwLjY0MiwgYm90dG9tOiAwLjMwMn07XHJcblx0XHRicmVhaztcclxuXHRjYXNlIFR5cGVzLkNSRURJVFM6XHJcblx0XHRkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuMDE1LCByaWdodDogMC4yNzYsIHRvcDogMC4zOTcsIGJvdHRvbTogMC43NjV9O1xyXG5cdFx0YnJlYWs7XHJcblx0Y2FzZSBUeXBlcy5CTEFOSzpcclxuXHRkZWZhdWx0OlxyXG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjAyMiwgcmlnaHQ6IC4wMjIrMC4yNDcsIHRvcDogMC4wMjEsIGJvdHRvbTogLjAyMSswLjM1NDN9O1xyXG5cdFx0YnJlYWs7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gZGltc1RvVVYoZGltcyk7XHJcbn1cclxuXHJcblxyXG5jbGFzcyBDYXJkIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKHR5cGUgPSBUeXBlcy5CTEFOSywgZG91YmxlU2lkZWQgPSB0cnVlLCBzZWNyZXQgPSBmYWxzZSlcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSB0aGUgY2FyZCBmYWNlc1xyXG5cdFx0bGV0IGNhcmRHZW8gPSBuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSguNzE1LCAxKTtcclxuXHRcdGxldCBmcm9udCA9IG5ldyBUSFJFRS5NZXNoKGNhcmRHZW8sXHJcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KVxyXG5cdFx0KTtcclxuXHRcdGxldCBiYWNrID0gbmV3IFRIUkVFLk1lc2goY2FyZEdlbyxcclxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IEFzc2V0TWFuYWdlci5jYWNoZS50ZXh0dXJlcy5jYXJkc30pXHJcblx0XHQpO1xyXG5cdFx0YmFjay5wb3NpdGlvbi5zZXQoMC4wMDEsIDAsIDApO1xyXG5cdFx0ZnJvbnQucG9zaXRpb24uc2V0KC0wLjAwMSwgMCwgMCk7XHJcblx0XHRiYWNrLnJvdGF0ZVkoTWF0aC5QSSk7XHJcblxyXG5cdFx0Ly8gc2V0IHRoZSBmYWNlcyB0byB0aGUgY29ycmVjdCBwYXJ0IG9mIHRoZSB0ZXh0dXJlXHJcblx0XHRmcm9udC5nZW9tZXRyeS5mYWNlVmVydGV4VXZzID0gW2dldFVWcyh0eXBlKV07XHJcblx0XHRiYWNrLmdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnMgPSBbZ2V0VVZzKCBkb3VibGVTaWRlZCA/IHR5cGUgOiBUeXBlcy5CTEFOSyApXTtcclxuXHRcdHRoaXMuc2NhbGUuc2V0U2NhbGFyKDAuNyk7XHJcblx0XHR0aGlzLmFkZChmcm9udCwgYmFjayk7XHJcblx0fVxyXG5cclxufVxyXG5cclxuY2xhc3MgQmxhbmtDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3IoKXsgc3VwZXIoKTsgfVxyXG59XHJcblxyXG5jbGFzcyBDcmVkaXRzQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5DUkVESVRTKTtcclxuXHRcdGxldCBzZWxmID0gdGhpcztcclxuXHJcblx0XHRmdW5jdGlvbiBzZXRWaXNpYmlsaXR5KCl7XHJcblx0XHRcdGlmKFNILmdhbWUuc3RhdGUgPT09ICdzZXR1cCcpXHJcblx0XHRcdFx0c2VsZi5jaGlsZHJlbi5mb3JFYWNoKG8gPT4geyBvLnZpc2libGUgPSB0cnVlOyB9KTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHNlbGYuY2hpbGRyZW4uZm9yRWFjaChvID0+IHsgby52aXNpYmxlID0gZmFsc2U7IH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2luaXQnLCBzZXRWaXNpYmlsaXR5KTtcclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3NldHVwJywgc2V0VmlzaWJpbGl0eSk7XHJcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdzZXR1cF9lbmQnLCBzZXRWaXNpYmlsaXR5KTtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIExpYmVyYWxQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3Ioc2VjcmV0ID0gZmFsc2Upe1xyXG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0xJQkVSQUwsIGZhbHNlLCBzZWNyZXQpO1xyXG5cdH1cclxuXHRnb1RvUG9zaXRpb24oc3BvdCA9IDApXHJcblx0e1xyXG5cdFx0c3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDQsIHNwb3QpKTtcclxuXHRcdGxldCBzID0gTGliZXJhbFBvbGljeUNhcmQuc3BvdHM7XHJcblx0XHRBbmltYXRlLnN0YXJ0KHRoaXMsIHtwYXJlbnQ6IEFzc2V0TWFuYWdlci5yb290LCBwb3M6IHNbJ3Bvc18nK3Nwb3RdLCBxdWF0OiBzLnF1YXQsIHNjYWxlOiBzLnNjYWxlfSk7XHJcblx0fVxyXG59XHJcblxyXG5MaWJlcmFsUG9saWN5Q2FyZC5zcG90cyA9IHtcclxuXHRwb3NfMDogbmV3IFRIUkVFLlZlY3RvcjMoMC41MzMsIDAuNzYsIC0wLjMzNiksXHJcblx0cG9zXzE6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMjYzLCAwLjc2LCAtMC4zMzYpLFxyXG5cdHBvc18yOiBuZXcgVEhSRUUuVmVjdG9yMygtLjAwNywgMC43NiwgLTAuMzM2KSxcclxuXHRwb3NfMzogbmV3IFRIUkVFLlZlY3RvcjMoLS4yNzksIDAuNzYsIC0wLjMzNiksXHJcblx0cG9zXzQ6IG5ldyBUSFJFRS5WZWN0b3IzKC0uNTUyLCAwLjc2LCAtMC4zMzYpLFxyXG5cdHF1YXQ6IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMC43MDcxMDY3ODExODY1NDc1LCAwKSxcclxuXHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMC43LCAwLjcsIDAuNylcclxufVxyXG5cclxuY2xhc3MgRmFzY2lzdFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3RvcihzZWNyZXQgPSBmYWxzZSl7XHJcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfRkFTQ0lTVCwgZmFsc2UsIHNlY3JldCk7XHJcblx0fVxyXG5cdGdvVG9Qb3NpdGlvbihzcG90ID0gMClcclxuXHR7XHJcblx0XHRzcG90ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oNSwgc3BvdCkpO1xyXG5cdFx0bGV0IHMgPSBGYXNjaXN0UG9saWN5Q2FyZC5zcG90cztcclxuXHRcdEFuaW1hdGUuc3RhcnQodGhpcywge3BhcmVudDogQXNzZXRNYW5hZ2VyLnJvb3QsIHBvczogc1sncG9zXycrc3BvdF0sIHF1YXQ6IHMucXVhdCwgc2NhbGU6IHMuc2NhbGV9KTtcclxuXHR9XHJcbn1cclxuXHJcbkZhc2Npc3RQb2xpY3lDYXJkLnNwb3RzID0ge1xyXG5cdHBvc18wOiBuZXcgVEhSRUUuVmVjdG9yMygtLjY4NywgMC43NiwgMC4zNDEpLFxyXG5cdHBvc18xOiBuZXcgVEhSRUUuVmVjdG9yMygtLjQxNywgMC43NiwgMC4zNDEpLFxyXG5cdHBvc18yOiBuZXcgVEhSRUUuVmVjdG9yMygtLjE0NiwgMC43NiwgMC4zNDEpLFxyXG5cdHBvc18zOiBuZXcgVEhSRUUuVmVjdG9yMygwLjEyNywgMC43NiwgMC4zNDEpLFxyXG5cdHBvc180OiBuZXcgVEhSRUUuVmVjdG9yMygwLjQwMCwgMC43NiwgMC4zNDEpLFxyXG5cdHBvc181OiBuZXcgVEhSRUUuVmVjdG9yMygwLjY3MywgMC43NiwgMC4zNDEpLFxyXG5cdHF1YXQ6IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKC0wLjcwNzEwNjc4MTE4NjU0NzUsIDAsIDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSksXHJcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNywgMC43LCAwLjcpXHJcbn1cclxuXHJcbmNsYXNzIExpYmVyYWxSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcclxuXHRcdHN1cGVyKFR5cGVzLlJPTEVfTElCRVJBTCwgZmFsc2UsIHNlY3JldCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0Um9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3RvcihzZWNyZXQgPSBmYWxzZSl7XHJcblx0XHRzdXBlcihUeXBlcy5ST0xFX0ZBU0NJU1QsIGZhbHNlLCBzZWNyZXQpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgSGl0bGVyUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3RvcihzZWNyZXQgPSBmYWxzZSl7XHJcblx0XHRzdXBlcihUeXBlcy5ST0xFX0hJVExFUiwgZmFsc2UsIHNlY3JldCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBMaWJlcmFsUGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3Ioc2VjcmV0ID0gZmFsc2Upe1xyXG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfTElCRVJBTCwgZmFsc2UsIHNlY3JldCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBGYXNjaXN0UGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XHJcblx0Y29uc3RydWN0b3Ioc2VjcmV0ID0gZmFsc2Upe1xyXG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfRkFTQ0lTVCwgZmFsc2UsIHNlY3JldCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBKYUNhcmQgZXh0ZW5kcyBDYXJkIHtcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoVHlwZXMuSkEsIGZhbHNlLCBmYWxzZSk7XHJcblx0XHR0aGlzLmNoaWxkcmVuWzBdLnJvdGF0ZVooLU1hdGguUEkvMik7XHJcblx0XHR0aGlzLmNoaWxkcmVuWzFdLnJvdGF0ZVooLU1hdGguUEkvMik7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBOZWluQ2FyZCBleHRlbmRzIENhcmQge1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcihUeXBlcy5ORUlOLCBmYWxzZSwgZmFsc2UpO1xyXG5cdFx0dGhpcy5jaGlsZHJlblswXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xyXG5cdFx0dGhpcy5jaGlsZHJlblsxXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xyXG5cdH1cclxufVxyXG5cclxuXHJcbmV4cG9ydCB7XHJcblx0Q2FyZCwgVHlwZXMsIEJsYW5rQ2FyZCwgQ3JlZGl0c0NhcmQsXHJcblx0TGliZXJhbFBvbGljeUNhcmQsIEZhc2Npc3RQb2xpY3lDYXJkLCBMaWJlcmFsUm9sZUNhcmQsIEZhc2Npc3RSb2xlQ2FyZCxcclxuXHRIaXRsZXJSb2xlQ2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZFxyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xyXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xyXG5cclxuY2xhc3MgUHJlc2lkZW50SGF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKCl7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50b3BoYXQ7XHJcblx0XHR0aGlzLm1vZGVsLnBvc2l0aW9uLnNldCgwLDAsMCk7XHJcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCAwKTtcclxuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2luaXQnLCAoKCkgPT4ge1xyXG5cdFx0XHRpZihTSC5nYW1lLnN0YXRlID09PSAnc2V0dXAnKSB0aGlzLmlkbGUoKTtcclxuXHRcdH0pLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignc2V0dXAnLCB0aGlzLmlkbGUuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHRpZGxlKCl7XHJcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLjc1LCAwLCAwKTtcclxuXHRcdHRoaXMucm90YXRpb24uc2V0KDAsIE1hdGguUEkvMiwgMCk7XHJcblx0XHRTSC5pZGxlUm9vdC5hZGQodGhpcyk7XHJcblx0fVxyXG59O1xyXG5cclxuY2xhc3MgQ2hhbmNlbGxvckhhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3Rvcigpe1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMudmlzb3JjYXA7XHJcblx0XHR0aGlzLm1vZGVsLnBvc2l0aW9uLnNldCgwLDAuMDQsMCk7XHJcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCAwKTtcclxuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xyXG5cclxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2luaXQnLCAoKCkgPT4ge1xyXG5cdFx0XHRpZihTSC5nYW1lLnN0YXRlID09PSAnc2V0dXAnKSB0aGlzLmlkbGUoKTtcclxuXHRcdH0pLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignc2V0dXAnLCB0aGlzLmlkbGUuYmluZCh0aGlzKSk7XHJcblxyXG5cdH1cclxuXHJcblx0aWRsZSgpe1xyXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoLTAuNzUsIDAsIDApO1xyXG5cdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEkvMiwgMCk7XHJcblx0XHRTSC5pZGxlUm9vdC5hZGQodGhpcyk7XHJcblx0fVxyXG59O1xyXG5cclxuZXhwb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHYW1lVGFibGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxyXG57XHJcblx0Y29uc3RydWN0b3IoKVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblxyXG5cdFx0Ly8gc2F2ZSByZWZlcmVuY2VzIHRvIHRoZSB0ZXh0dXJlc1xyXG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtcclxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfc21hbGwsXHJcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX21lZCxcclxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbGFyZ2VcclxuXHRcdF07XHJcblxyXG5cdFx0Ly8gYWRkIHRhYmxlIGFzc2V0XHJcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnRhYmxlLmNoaWxkcmVuWzBdO1xyXG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XHJcblx0XHR0aGlzLm1vZGVsLnNjYWxlLnNldFNjYWxhcigxLjI1KTtcclxuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xyXG5cclxuXHRcdC8vIHNldCB0aGUgZGVmYXVsdCBtYXRlcmlhbFxyXG5cdFx0dGhpcy5tb2RlbC5tYXRlcmlhbC5tYXAgPSB0aGlzLnRleHR1cmVzWzBdO1xyXG5cclxuXHRcdC8vIHBvc2l0aW9uIHRhYmxlXHJcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAxLjAsIDApO1xyXG5cdH1cclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuXHJcbmZ1bmN0aW9uIGdldEdhbWVJZCgpXHJcbntcclxuXHQvLyBmaXJzdCBjaGVjayB0aGUgdXJsXHJcblx0bGV0IHJlID0gL1s/Jl1nYW1lSWQ9KFteJl0rKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcclxuXHRpZihyZSl7XHJcblx0XHRyZXR1cm4gcmVbMV07XHJcblx0fVxyXG5cdGVsc2UgaWYoYWx0c3BhY2UgJiYgYWx0c3BhY2UuaW5DbGllbnQpe1xyXG5cdFx0cmV0dXJuIFNILmVudi5zaWQ7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0bGV0IGlkID0gTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwMCApO1xyXG5cdFx0d2luZG93LmxvY2F0aW9uLnJlcGxhY2UoJz9nYW1lSWQ9JytpZCk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgeyBnZXRHYW1lSWQgfTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcclxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE5hbWVwbGF0ZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXHJcbntcclxuXHRjb25zdHJ1Y3RvcihzZWF0TnVtKVxyXG5cdHtcclxuXHRcdHN1cGVyKCk7XHJcblxyXG5cdFx0dGhpcy5zZWF0TnVtID0gc2VhdE51bTtcclxuXHRcdHRoaXMub3duZXIgPSBudWxsOyAvLyB1c2VySWRcclxuXHJcblx0XHQvLyBhZGQgM2QgbW9kZWxcclxuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMubmFtZXBsYXRlLmNoaWxkcmVuWzBdLmNsb25lKCk7XHJcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCAwKTtcclxuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xyXG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XHJcblxyXG5cdFx0Ly8gZ2VuZXJhdGUgbWF0ZXJpYWxcclxuXHRcdHRoaXMuYm1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcblx0XHR0aGlzLmJtcC53aWR0aCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZTtcclxuXHRcdHRoaXMuYm1wLmhlaWdodCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAvIDI7XHJcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcclxuXHRcdFx0bWFwOiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZSh0aGlzLmJtcClcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHBsYWNlIHBsYWNhcmRcclxuXHRcdGxldCB4LCB5ID0gMC4wMTgsIHo7XHJcblx0XHRzd2l0Y2goc2VhdE51bSl7XHJcblx0XHRjYXNlIDA6IGNhc2UgMTogY2FzZSAyOlxyXG5cdFx0XHR0aGlzLm1vZGVsLnJvdGF0ZVooTWF0aC5QSS8yKTtcclxuXHRcdFx0eCA9IC0wLjgzMyArIDAuODMzKnNlYXROdW07XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIC0wLjgzKTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlIDM6IGNhc2UgNDpcclxuXHRcdFx0eiA9IC0wLjQzNyArIDAuODc0KihzZWF0TnVtLTMpO1xyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnNldCgxLjIxLCB5LCB6KTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlIDU6IGNhc2UgNjogY2FzZSA3OlxyXG5cdFx0XHR0aGlzLm1vZGVsLnJvdGF0ZVooTWF0aC5QSS8yKTtcclxuXHRcdFx0eCA9IDAuODMzIC0gMC44MzMqKHNlYXROdW0tNSk7XHJcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIDAuODMpO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgODogY2FzZSA5OlxyXG5cdFx0XHR6ID0gMC40MzcgLSAwLjg3NCooc2VhdE51bS04KTtcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoLTEuMjEsIHksIHopO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHQvLyBjcmVhdGUgbGlzdGVuZXIgcHJveGllc1xyXG5cdFx0dGhpcy5fcmVxdWVzdEpvaW4gPSB0aGlzLnJlcXVlc3RKb2luLmJpbmQodGhpcyk7XHJcblx0XHR0aGlzLl9ob3ZlckJlaGF2aW9yID0gbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJDb2xvcih7XHJcblx0XHRcdGNvbG9yOiBuZXcgVEhSRUUuQ29sb3IoMHhmZmE4YTgpXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBob29rIHVwIGxpc3RlbmVyc1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignaW5pdCcsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xyXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignc2V0dXAnLCB0aGlzLnVwZGF0ZU93bmVyc2hpcC5iaW5kKHRoaXMpKTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZVRleHQodGV4dClcclxuXHR7XHJcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcclxuXHJcblx0XHQvLyBzZXQgdXAgY2FudmFzXHJcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XHJcblx0XHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XHJcblx0XHRnLmZpbGxTdHlsZSA9ICcjMjIyJztcclxuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XHJcblx0XHRnLmZvbnQgPSBgYm9sZCAke2ZvbnRTaXplfXB4ICR7Zm9udFN0YWNrfWA7XHJcblx0XHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xyXG5cdFx0Zy5maWxsVGV4dCh0ZXh0LCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMiwgKDAuNDIgLSAwLjEyKSooTmFtZXBsYXRlLnRleHR1cmVTaXplLzIpKTtcclxuXHJcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XHJcblx0fVxyXG5cclxuXHRyZXF1ZXN0Sm9pbigpXHJcblx0e1xyXG5cdFx0Y29uc29sZS5sb2coJ1JlcXVlc3RpbmcgdG8gam9pbiBhdCBzZWF0JywgdGhpcy5zZWF0TnVtKTtcclxuXHRcdFNILnNvY2tldC5lbWl0KCdyZXF1ZXN0Sm9pbicsIE9iamVjdC5hc3NpZ24oe3NlYXROdW06IHRoaXMuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlT3duZXJzaGlwKClcclxuXHR7XHJcblx0XHQvLyBjaGVjayBmb3IgcGxheWVyXHJcblx0XHRsZXQgb3duZXIgPSBPYmplY3Qua2V5cyhTSC5wbGF5ZXJzKS5maW5kKChlID0+IFNILnBsYXllcnNbZV0uc2VhdE51bSA9PSB0aGlzLnNlYXROdW0pLmJpbmQodGhpcykpO1xyXG5cclxuXHRcdC8vIHBsYXllciBqb2luZWRcclxuXHRcdGlmKG93bmVyICYmICF0aGlzLm93bmVyKVxyXG5cdFx0e1xyXG5cdFx0XHR0aGlzLm93bmVyID0gb3duZXI7XHJcblx0XHRcdHRoaXMudXBkYXRlVGV4dChTSC5wbGF5ZXJzW3RoaXMub3duZXJdLmRpc3BsYXlOYW1lKTtcclxuXHJcblx0XHRcdHRoaXMubW9kZWwuX19iZWhhdmlvckxpc3QgPSB0aGlzLm1vZGVsLl9fYmVoYXZpb3JMaXN0IHx8IFtdOyAvLyBUT0RPOiB1Z2hcclxuXHRcdFx0dGhpcy5tb2RlbC5yZW1vdmVCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcclxuXHRcdFx0dGhpcy5tb2RlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuX3JlcXVlc3RKb2luKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBwbGF5ZXIgbGVmdFxyXG5cdFx0ZWxzZSBpZighb3duZXIgJiYgKHRoaXMub3duZXIgfHwgdGhpcy5vd25lciA9PT0gbnVsbCkpXHJcblx0XHR7XHJcblx0XHRcdHRoaXMub3duZXIgPSAwO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVRleHQoJzxKb2luPicpO1xyXG5cdFx0XHR0aGlzLm1vZGVsLmFkZEJlaGF2aW9yKHRoaXMuX2hvdmVyQmVoYXZpb3IpO1xyXG5cdFx0XHR0aGlzLm1vZGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5fcmVxdWVzdEpvaW4pO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuTmFtZXBsYXRlLnRleHR1cmVTaXplID0gNTEyO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgKiBhcyBDYXJkcyBmcm9tICcuL2NhcmQnO1xyXG5pbXBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfSBmcm9tICcuL2hhdHMnO1xyXG5pbXBvcnQgR2FtZVRhYmxlIGZyb20gJy4vdGFibGUnO1xyXG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcclxuaW1wb3J0IHsgZ2V0R2FtZUlkIH0gZnJvbSAnLi91dGlscyc7XHJcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnO1xyXG5cclxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcclxue1xyXG5cdGNvbnN0cnVjdG9yKClcclxuXHR7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5hc3NldHMgPSBBc3NldE1hbmFnZXIubWFuaWZlc3Q7XHJcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcclxuXHRcdHRoaXMubmVlZHNTa2VsZXRvbiA9IHRydWU7XHJcblxyXG5cdFx0Ly8gcG9seWZpbGwgZ2V0VXNlciBmdW5jdGlvblxyXG5cdFx0aWYoIWFsdHNwYWNlLmluQ2xpZW50KXtcclxuXHRcdFx0YWx0c3BhY2UuZ2V0VXNlciA9ICgpID0+IHtcclxuXHRcdFx0XHRsZXQgaWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCk7XHJcblx0XHRcdFx0YWx0c3BhY2UuX2xvY2FsVXNlciA9IHtcclxuXHRcdFx0XHRcdHVzZXJJZDogaWQsXHJcblx0XHRcdFx0XHRkaXNwbGF5TmFtZTogJ0d1ZXN0JytpZCxcclxuXHRcdFx0XHRcdGlzTW9kZXJhdG9yOiBmYWxzZVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ01hc3F1ZXJhZGluZyBhcycsIGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xyXG5cdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoYWx0c3BhY2UuX2xvY2FsVXNlcik7XHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gZ2V0IGxvY2FsIHVzZXJcclxuXHRcdGFsdHNwYWNlLmdldFVzZXIoKS50aGVuKCh1c2VyID0+XHJcblx0XHR7XHJcblx0XHRcdHRoaXMubG9jYWxVc2VyID0ge1xyXG5cdFx0XHRcdGlkOiB1c2VyLnVzZXJJZC50b1N0cmluZygpLFxyXG5cdFx0XHRcdGRpc3BsYXlOYW1lOiB1c2VyLmRpc3BsYXlOYW1lLFxyXG5cdFx0XHRcdGlzTW9kZXJhdG9yOiB1c2VyLmlzTW9kZXJhdG9yXHJcblx0XHRcdH07XHJcblx0XHR9KS5iaW5kKHRoaXMpKTtcclxuXHJcblx0XHR0aGlzLmdhbWUgPSBudWxsO1xyXG5cdFx0dGhpcy5wbGF5ZXJzID0gbnVsbDtcclxuXHR9XHJcblxyXG5cdGluaXRpYWxpemUoZW52LCByb290LCBhc3NldHMpXHJcblx0e1xyXG5cdFx0Ly8gc2hhcmUgdGhlIGRpb3JhbWEgaW5mb1xyXG5cdFx0QXNzZXRNYW5hZ2VyLmNhY2hlID0gYXNzZXRzO1xyXG5cdFx0dGhpcy5lbnYgPSBlbnY7XHJcblxyXG5cdFx0Ly8gY29ubmVjdCB0byBzZXJ2ZXJcclxuXHRcdHRoaXMuc29ja2V0ID0gaW8uY29ubmVjdCgnLycsIHtxdWVyeTogJ2dhbWVJZD0nK2dldEdhbWVJZCgpfSk7XHJcblxyXG5cdFx0Ly8gY3JlYXRlIHRoZSB0YWJsZVxyXG5cdFx0dGhpcy50YWJsZSA9IG5ldyBHYW1lVGFibGUoKTtcclxuXHRcdHRoaXMuYWRkKHRoaXMudGFibGUpO1xyXG5cclxuXHRcdHRoaXMucmVzZXRCdXR0b24gPSBuZXcgVEhSRUUuTWVzaChcclxuXHRcdFx0bmV3IFRIUkVFLkJveEdlb21ldHJ5KC4yNSwuMjUsLjI1KSxcclxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IGFzc2V0cy50ZXh0dXJlcy5yZXNldH0pXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5wb3NpdGlvbi5zZXQoMCwgLTAuMTgsIDApO1xyXG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMucmVzZXQuYmluZCh0aGlzKSk7XHJcblx0XHR0aGlzLnRhYmxlLmFkZCh0aGlzLnJlc2V0QnV0dG9uKTtcclxuXHJcblx0XHQvLyBjcmVhdGUgaWRsZSBkaXNwbGF5XHJcblx0XHR0aGlzLmlkbGVSb290ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XHJcblx0XHR0aGlzLmlkbGVSb290LnBvc2l0aW9uLnNldCgwLCAxLjg1LCAwKTtcclxuXHRcdHRoaXMuaWRsZVJvb3QuYWRkQmVoYXZpb3IobmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuU3Bpbih7c3BlZWQ6IDAuMDAwMn0pKTtcclxuXHRcdHRoaXMuYWRkKHRoaXMuaWRsZVJvb3QpO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBpZGxlIHNsaWRlc2hvd1xyXG5cdFx0bGV0IGNyZWRpdHMgPSBuZXcgQ2FyZHMuQ3JlZGl0c0NhcmQoKTtcclxuXHRcdHRoaXMuaWRsZVJvb3QuYWRkKGNyZWRpdHMpO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBoYXRzXHJcblx0XHR0aGlzLnByZXNpZGVudEhhdCA9IG5ldyBQcmVzaWRlbnRIYXQoKTtcclxuXHRcdHRoaXMuY2hhbmNlbGxvckhhdCA9IG5ldyBDaGFuY2VsbG9ySGF0KCk7XHJcblxyXG5cdFx0Ly8gY3JlYXRlIHBvc2l0aW9uc1xyXG5cdFx0dGhpcy5zZWF0cyA9IFtdO1xyXG5cdFx0Zm9yKGxldCBpPTA7IGk8MTA7IGkrKyl7XHJcblx0XHRcdGxldCBzZWF0ID0gbmV3IE5hbWVwbGF0ZShpKTtcclxuXHRcdFx0dGhpcy5zZWF0cy5wdXNoKHNlYXQpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy50YWJsZS5hZGQoLi4udGhpcy5zZWF0cyk7XHJcblxyXG5cdFx0Ly8gYWRkIGF2YXRhciBmb3Igc2NhbGVcclxuXHRcdGFzc2V0cy5tb2RlbHMuZHVtbXkucG9zaXRpb24uc2V0KDAsIDAsIDEuMik7XHJcblx0XHRhc3NldHMubW9kZWxzLmR1bW15LnJvdGF0aW9uLnNldCgwLCBNYXRoLlBJLCAwKTtcclxuXHRcdHRoaXMuYWRkKGFzc2V0cy5tb2RlbHMuZHVtbXkpO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0Lm9uKCd1cGRhdGUnLCB0aGlzLnVwZGF0ZUZyb21TZXJ2ZXIuYmluZCh0aGlzKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVGcm9tU2VydmVyKGdhbWUsIHBsYXllcnMpXHJcblx0e1xyXG5cdFx0Y29uc29sZS5sb2coZ2FtZSwgcGxheWVycyk7XHJcblxyXG5cdFx0aWYoIXRoaXMuZ2FtZSAmJiAhdGhpcy5wbGF5ZXJzKXtcclxuXHRcdFx0dGhpcy5nYW1lID0gZ2FtZTtcclxuXHRcdFx0dGhpcy5wbGF5ZXJzID0gcGxheWVycztcclxuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnaW5pdCcsIGJ1YmJsZXM6IGZhbHNlfSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLmdhbWUsIGdhbWUpO1xyXG5cdFx0XHRPYmplY3QuYXNzaWduKHRoaXMucGxheWVycywgcGxheWVycyk7XHJcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTogdGhpcy5nYW1lLnN0YXRlKydfZW5kJywgYnViYmxlczogZmFsc2V9KTtcclxuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOiB0aGlzLmdhbWUuc3RhdGUsIGJ1YmJsZXM6IGZhbHNlfSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXNldCgpXHJcblx0e1xyXG5cdFx0Y29uc29sZS5sb2coJ3JlcXVlc3RpbmcgcmVzZXQnLCB0aGlzKTtcclxuXHRcdHRoaXMuZ2FtZSA9IG51bGw7XHJcblx0XHR0aGlzLnBsYXllcnMgPSBudWxsO1xyXG5cdFx0dGhpcy5zb2NrZXQuZW1pdCgncmVzZXQnKTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IG5ldyBTZWNyZXRIaXRsZXIoKTtcclxuIl0sIm5hbWVzIjpbInRoaXMiLCJzdXBlciIsImxldCIsIkFzc2V0TWFuYWdlciIsIkNhcmRzLkNyZWRpdHNDYXJkIl0sIm1hcHBpbmdzIjoiOzs7QUFFQSxTQUFlO0NBQ2QsUUFBUSxF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Q1AsS0FBSyxLQUFLLENBQUMsWUFBWTtFQUN0QixJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDN0QsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLFlBQVk7RUFDdEIsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQzVELE1BQU07Q0FDUCxLQUFLLEtBQUssQ0FBQyxXQUFXO0VBQ3JCLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztFQUM1RCxNQUFNO0NBQ1AsS0FBSyxLQUFLLENBQUMsYUFBYTtFQUN2QixJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDN0QsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLGFBQWE7RUFDdkIsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQzVELE1BQU07Q0FDUCxLQUFLLEtBQUssQ0FBQyxFQUFFO0VBQ1osSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0VBQzlELE1BQU07Q0FDUCxLQUFLLEtBQUssQ0FBQyxJQUFJO0VBQ2QsSUFBSSxHQUFHLENBQUMsSUFBSSxF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
