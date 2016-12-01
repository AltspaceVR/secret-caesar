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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvYXNzZXRtYW5hZ2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9nYW1lb2JqZWN0cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVybWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RhYmxlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC91dGlscy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWNyZXRoaXRsZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCB7XG5cdG1hbmlmZXN0OiB7XG5cdFx0bW9kZWxzOiB7XG5cdFx0XHR0YWJsZTogJ3N0YXRpYy9tb2RlbC90YWJsZS5kYWUnLFxuXHRcdFx0bmFtZXBsYXRlOiAnc3RhdGljL21vZGVsL25hbWVwbGF0ZS5kYWUnLFxuXHRcdFx0dG9waGF0OiAnc3RhdGljL21vZGVsL3RvcGhhdC5kYWUnLFxuXHRcdFx0dmlzb3JjYXA6ICdzdGF0aWMvbW9kZWwvdmlzb3JfY2FwLmRhZSdcblx0XHR9LFxuXHRcdHRleHR1cmVzOiB7XG5cdFx0XHRib2FyZF9sYXJnZTogJ3N0YXRpYy9pbWcvYm9hcmQtbGFyZ2UtYmFrZWQucG5nJyxcblx0XHRcdGJvYXJkX21lZDogJ3N0YXRpYy9pbWcvYm9hcmQtbWVkaXVtLWJha2VkLnBuZycsXG5cdFx0XHRib2FyZF9zbWFsbDogJ3N0YXRpYy9pbWcvYm9hcmQtc21hbGwtYmFrZWQucG5nJyxcblx0XHRcdGNhcmRzOiAnc3RhdGljL2ltZy9jYXJkcy5wbmcnLFxuXHRcdFx0cmVzZXQ6ICdzdGF0aWMvaW1nL2JvbWIucG5nJ1xuXHRcdH1cblx0fSxcblx0Y2FjaGU6IHt9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmNsYXNzIEdhbWVTdGF0ZVxue1xuXHRjb25zdHJ1Y3RvcihpZClcblx0e1xuXHRcdHRoaXMuaWQgPSBpZDtcblxuXHRcdHRoaXMuc3RhdGUgPSAnaWRsZSc7XG5cblx0XHR0aGlzLnR1cm5PcmRlciA9IFtdOyAvLyBhcnJheSBvZiB1c2VySWRzXG5cdFx0dGhpcy5wcmVzaWRlbnQgPSAwOyAvLyB1c2VySWRcblx0XHR0aGlzLmNoYW5jZWxsb3IgPSAwOyAvLyB1c2VySWRcblx0XHR0aGlzLmxhc3RQcmVzaWRlbnQgPSAwOyAvLyB1c2VySWRcblx0XHR0aGlzLmxhc3RDaGFuY2VsbG9yID0gMDsgLy8gdXNlcklkXG5cblx0XHR0aGlzLmxpYmVyYWxQb2xpY2llcyA9IDA7XG5cdFx0dGhpcy5mYXNjaXN0UG9saWNpZXMgPSAwO1xuXHRcdHRoaXMuZGVja0Zhc2Npc3QgPSAxMTtcblx0XHR0aGlzLmRlY2tMaWJlcmFsID0gNjtcblx0XHR0aGlzLmRpc2NhcmRGYXNjaXN0ID0gMDtcblx0XHR0aGlzLmRpc2NhcmRMaWJlcmFsID0gMDtcblx0XHR0aGlzLnNwZWNpYWxFbGVjdGlvbiA9IGZhbHNlO1xuXHRcdHRoaXMuZmFpbGVkVm90ZXMgPSAwO1xuXHR9XG5cblx0bmV4dFByZXNpZGVudCgpXG5cdHtcblx0XHRsZXQgdHVybiA9IDA7XG5cblx0XHQvLyB0aGlzIGlzIHRoZSBmaXJzdCByb3VuZCwgY2hvb3NlIHByZXNpZGVudCByYW5kb21seVxuXHRcdGlmKCF0aGlzLnByZXNpZGVudClcblx0XHRcdHR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGlzLnR1cm5PcmRlci5sZW5ndGgpO1xuXG5cdFx0Ly8gdGhpcyBpcyBhIHNwZWNpYWwgZWxlY3Rpb24sIHNvIGNvdW50IGZyb20gcHJlc2lkZW50IGVtZXJpdHVzXG5cdFx0ZWxzZSBpZih0aGlzLnNwZWNpYWxFbGVjdGlvbilcblx0XHRcdHR1cm4gPSB0aGlzLnBsYXllcnNbdGhpcy5sYXN0UHJlc2lkZW50XS50dXJuT3JkZXI7XG5cblx0XHQvLyBhIHJlZ3VsYXIgZWxlY3Rpb246IHBvd2VyIHBhc3NlcyB0byB0aGUgbGVmdFxuXHRcdGVsc2Vcblx0XHRcdHR1cm4gPSB0aGlzLnBsYXllcnNbdGhpcy5wcmVzaWRlbnRdLnR1cm5PcmRlcjtcblxuXHRcdHJldHVybiB0aGlzLnR1cm5PcmRlclsgKHR1cm4rMSkldGhpcy50dXJuT3JkZXIubGVuZ3RoIF07XG5cdH1cblxuXHRkcmF3UG9saWNpZXMoKVxuXHR7XG5cblx0fVxufVxuXG5jbGFzcyBQbGF5ZXJcbntcblx0Y29uc3RydWN0b3IodXNlcklkID0gMCwgZGlzcGxheU5hbWUgPSAnZHVtbXknLCBpc01vZGVyYXRvciA9IGZhbHNlKVxuXHR7XG5cdFx0dGhpcy51c2VySWQgPSB1c2VySWQ7XG5cdFx0dGhpcy5kaXNwbGF5TmFtZSA9IGRpc3BsYXlOYW1lO1xuXHRcdHRoaXMuaXNNb2RlcmF0b3IgPSBmYWxzZTtcblx0XHR0aGlzLnR1cm5PcmRlciA9IC0xOyAvLyB1bmtub3duIHVudGlsIGdhbWUgc3RhcnRzXG5cblx0XHR0aGlzLnJvbGUgPSAndW5hc3NpZ25lZCc7IC8vIG9uZSBvZiAndW5hc3NpZ25lZCcsICdoaXRsZXInLCAnZmFzY2lzdCcsICdsaWJlcmFsJ1xuXHRcdHRoaXMuc3RhdGUgPSAnbm9ybWFsJzsgLy8gb25lIG9mICdub3JtYWwnLCAnaW52ZXN0aWdhdGVkJywgJ2RlYWQnXG5cdH1cblxuXHRnZXQgcGFydHkoKXtcblx0XHRpZih0aGlzLnJvbGUgPT09ICdoaXRsZXInKSByZXR1cm4gJ2Zhc2Npc3QnO1xuXHRcdGVsc2UgcmV0dXJuIHRoaXMucm9sZTtcblx0fVxufVxuXG5leHBvcnQgeyBHYW1lU3RhdGUsIFBsYXllciB9O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgeyBQbGF5ZXIgfSBmcm9tICcuL2dhbWVvYmplY3RzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxheWVyTWFuYWdlclxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHR0aGlzLmxvY2FsVXNlciA9IG51bGw7XG5cdFx0dGhpcy5wbGF5ZXJzID0gW107XG5cdH1cblxuXHRhY3F1aXJlTG9jYWxVc2VyKClcblx0e1xuXHRcdGlmKHdpbmRvdy5hbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudClcblx0XHR7XG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHt9O1xuXG5cdFx0XHQvLyBnZXQgdGhlIGxvY2FsIHVzZXIgaWQgYW5kIG5hbWVcblx0XHRcdGFsdHNwYWNlLmdldFVzZXIoKS50aGVuKCh1c2VyID0+IHtcblx0XHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLmxvY2FsVXNlciwgdXNlcik7XG5cdFx0XHR9KS5iaW5kKHRoaXMpKTtcblxuXHRcdFx0Ly8gZ2V0IHRoZSB1c2VyIHRyYWNraW5nIHNrZWxldG9uXG5cdFx0XHRhbHRzcGFjZS5nZXRUaHJlZUpTVHJhY2tpbmdTa2VsZXRvbigpLnRoZW4oKHRzID0+IHtcblx0XHRcdFx0dGhpcy5sb2NhbFVzZXIuc2tlbGV0b24gPSB0cztcblx0XHRcdFx0U0guYWRkKHRzKTtcblx0XHRcdH0pLmJpbmQodGhpcykpO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0Ly8gZmFrZSB1c2VyIGRhdGFcblx0XHRcdHRoaXMubG9jYWxVc2VyID0ge1xuXHRcdFx0XHR1c2VySWQ6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDApLFxuXHRcdFx0XHRpc01vZGVyYXRvcjogZmFsc2Vcblx0XHRcdH07XG5cdFx0XHR0aGlzLmxvY2FsVXNlci5kaXNwbGF5TmFtZSA9ICdXZWIgVXNlciAnK3RoaXMubG9jYWxVc2VyLnVzZXJJZDtcblx0XHR9XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBQTSBmcm9tICcuL3BsYXllcm1hbmFnZXInO1xuXG5jbGFzcyBCZWhhdmlvclxue1xuXHRjb25zdHJ1Y3Rvcih0eXBlKXtcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xuXHR9XG5cblx0YXdha2Uob2JqKXtcblx0XHR0aGlzLm9iamVjdDNEID0gb2JqO1xuXHR9XG5cblx0c3RhcnQoKXsgfVxuXG5cdHVwZGF0ZShkVCl7IH1cblxuXHRkaXNwb3NlKCl7IH1cbn1cblxuY2xhc3MgQlN5bmMgZXh0ZW5kcyBCZWhhdmlvclxue1xuXHRjb25zdHJ1Y3RvcihldmVudE5hbWUpXG5cdHtcblx0XHRzdXBlcignQlN5bmMnKTtcblx0XHR0aGlzLl9zID0gU0guc29ja2V0O1xuXG5cdFx0Ly8gbGlzdGVuIGZvciB1cGRhdGUgZXZlbnRzXG5cdFx0dGhpcy5ob29rID0gdGhpcy5fcy5vbihldmVudE5hbWUsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLmV2ZW50TmFtZSA9IGV2ZW50TmFtZTtcblx0XHR0aGlzLm93bmVyID0gJ3Vub3duZWQnO1xuXHR9XG5cblx0dXBkYXRlRnJvbVNlcnZlcihkYXRhKVxuXHR7XG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XG5cdFx0dGhpcy5vYmplY3QzRC5yb3RhdGlvbi5mcm9tQXJyYXkoZGF0YSwgMyk7XG5cdH1cblxuXHR0YWtlT3duZXJzaGlwKClcblx0e1xuXHRcdGlmKFBNLmxvY2FsVXNlciAmJiBQTS5sb2NhbFVzZXIudXNlcklkKVxuXHRcdFx0dGhpcy5vd25lciA9IFBNLmxvY2FsVXNlci51c2VySWQ7XG5cdH1cblxuXHR1cGRhdGUoZFQpXG5cdHtcblx0XHRpZihQTS5sb2NhbFVzZXIgJiYgUE0ubG9jYWxVc2VyLnNrZWxldG9uICYmIFBNLmxvY2FsVXNlci51c2VySWQgPT09IHRoaXMub3duZXIpXG5cdFx0e1xuXHRcdFx0bGV0IGogPSBQTS5sb2NhbFVzZXIuc2tlbGV0b24uZ2V0Sm9pbnQoJ0hlYWQnKTtcblx0XHRcdHRoaXMuX3MuZW1pdCh0aGlzLmV2ZW50TmFtZSwgWy4uLmoucG9zaXRpb24udG9BcnJheSgpLCAuLi5qLnJvdGF0aW9uLnRvQXJyYXkoKV0pO1xuXHRcdH1cblx0fVxuXG59XG5cbmV4cG9ydCB7IEJlaGF2aW9yLCBCU3luYyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgeyBCZWhhdmlvciB9IGZyb20gJy4vYmVoYXZpb3InO1xuXG5jbGFzcyBBbmltYXRlIGV4dGVuZHMgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IoLy97cGFyZW50LCBwb3MsIHF1YXQsIHNjYWxlLCBtYXRyaXgsIGR1cmF0aW9uLCBjYWxsYmFja31cblx0XHR7cGFyZW50PW51bGwsIHBvcz1udWxsLCBxdWF0PW51bGwsIHNjYWxlPW51bGwsIG1hdHJpeD1udWxsLCBkdXJhdGlvbj02MDAsIGNhbGxiYWNrPSgpPT57fX0pXG5cdHtcblx0XHRzdXBlcignQW5pbWF0ZScpO1xuXHRcdFxuXHRcdGlmKG1hdHJpeClcblx0XHR7XG5cdFx0XHQvLyBleHRyYWN0IHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlIGZyb20gbWF0cml4XG5cdFx0XHRwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXHRcdFx0cXVhdCA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cdFx0XHRzY2FsZSA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cdFx0XHRtYXRyaXguZGVjb21wb3NlKHBvcywgcXVhdCwgc2NhbGUpO1xuXHRcdH1cblxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywge3BhcmVudCwgcG9zLCBxdWF0LCBzY2FsZSwgZHVyYXRpb24sIGNhbGxiYWNrfSk7XG5cdH1cblxuXHRhd2FrZShvYmopXG5cdHtcblx0XHRzdXBlci5hd2FrZShvYmopO1xuXG5cdFx0Ly8gc2h1ZmZsZSBoaWVyYXJjaHksIGJ1dCBrZWVwIHdvcmxkIHRyYW5zZm9ybSB0aGUgc2FtZVxuXHRcdGlmKHRoaXMucGFyZW50ICYmIHRoaXMucGFyZW50ICE9PSBvYmoucGFyZW50KVxuXHRcdHtcblx0XHRcdG9iai5hcHBseU1hdHJpeChvYmoucGFyZW50Lm1hdHJpeFdvcmxkKTtcblx0XHRcdGxldCBtYXQgPSBuZXcgVEhSRUUuTWF0cml4NCgpLmdldEludmVyc2UodGhpcy5wYXJlbnQubWF0cml4V29ybGQpO1xuXHRcdFx0b2JqLmFwcGx5TWF0cml4KG1hdCk7XG5cblx0XHRcdHRoaXMucGFyZW50LmFkZChvYmopO1xuXHRcdH1cblxuXHRcdC8vIHJlYWQgaW5pdGlhbCBwb3NpdGlvbnNcblx0XHR0aGlzLmluaXRpYWxQb3MgPSBvYmoucG9zaXRpb24uY2xvbmUoKTtcblx0XHR0aGlzLmluaXRpYWxRdWF0ID0gb2JqLnF1YXRlcm5pb24uY2xvbmUoKTtcblx0XHR0aGlzLmluaXRpYWxTY2FsZSA9IG9iai5zY2FsZS5jbG9uZSgpO1xuXHRcdHRoaXMuc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblx0fVxuXG5cdHVwZGF0ZSgpXG5cdHtcblx0XHQvLyBjb21wdXRlIGVhc2Utb3V0IGJhc2VkIG9uIGR1cmF0aW9uXG5cdFx0bGV0IG1peCA9IChEYXRlLm5vdygpLXRoaXMuc3RhcnRUaW1lKSAvIHRoaXMuZHVyYXRpb247XG5cdFx0bGV0IGVhc2UgPSBUV0VFTiA/IFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0IDogbiA9PiBuKigyLW4pO1xuXHRcdG1peCA9IG1peCA8IDEgPyBlYXNlKG1peCkgOiAxO1xuXG5cdFx0Ly8gYW5pbWF0ZSBwb3NpdGlvbiBpZiByZXF1ZXN0ZWRcblx0XHRpZiggdGhpcy5wb3MgKXtcblx0XHRcdHRoaXMub2JqZWN0M0QucG9zaXRpb24ubGVycFZlY3RvcnModGhpcy5pbml0aWFsUG9zLCB0aGlzLnBvcywgbWl4KTtcblx0XHR9XG5cblx0XHQvLyBhbmltYXRlIHJvdGF0aW9uIGlmIHJlcXVlc3RlZFxuXHRcdGlmKCB0aGlzLnF1YXQgKXtcblx0XHRcdFRIUkVFLlF1YXRlcm5pb24uc2xlcnAodGhpcy5pbml0aWFsUXVhdCwgdGhpcy5xdWF0LCB0aGlzLm9iamVjdDNELnF1YXRlcm5pb24sIG1peClcblx0XHR9XG5cblx0XHQvLyBhbmltYXRlIHNjYWxlIGlmIHJlcXVlc3RlZFxuXHRcdGlmKCB0aGlzLnNjYWxlICl7XG5cdFx0XHR0aGlzLm9iamVjdDNELnNjYWxlLmxlcnBWZWN0b3JzKHRoaXMuaW5pdGlhbFNjYWxlLCB0aGlzLnNjYWxlLCBtaXgpO1xuXHRcdH1cblxuXHRcdC8vIHRlcm1pbmF0ZSBhbmltYXRpb24gd2hlbiBkb25lXG5cdFx0aWYobWl4ID49IDEpe1xuXHRcdFx0dGhpcy5vYmplY3QzRC5yZW1vdmVCZWhhdmlvcih0aGlzKTtcblx0XHRcdHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLm9iamVjdDNEKTtcblx0XHR9XG5cdH1cbn1cblxuQW5pbWF0ZS5zdGFydCA9ICh0YXJnZXQsIG9wdHMpID0+XG57XG5cdGxldCBvbGRBbmltID0gdGFyZ2V0LmdldEJlaGF2aW9yQnlUeXBlKCdBbmltYXRlJyk7XG5cdGlmKG9sZEFuaW0pe1xuXHRcdG9sZEFuaW0uY29uc3RydWN0b3Iob3B0cyk7XG5cdFx0b2xkQW5pbS5hd2FrZSh0YXJnZXQpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHRhcmdldC5hZGRCZWhhdmlvciggbmV3IEFuaW1hdGUob3B0cykgKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBBbmltYXRlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5cbi8vIGVudW0gY29uc3RhbnRzXG5sZXQgVHlwZXMgPSBPYmplY3QuZnJlZXplKHtcblx0UE9MSUNZX0xJQkVSQUw6IDAsXG5cdFBPTElDWV9GQVNDSVNUOiAxLFxuXHRST0xFX0xJQkVSQUw6IDIsXG5cdFJPTEVfRkFTQ0lTVDogMyxcblx0Uk9MRV9ISVRMRVI6IDQsXG5cdFBBUlRZX0xJQkVSQUw6IDUsXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXG5cdEpBOiA3LFxuXHRORUlOOiA4LFxuXHRCTEFOSzogOSxcblx0Q1JFRElUUzogMTBcbn0pO1xuXG5mdW5jdGlvbiBkaW1zVG9VVih7c2lkZSwgbGVmdCwgcmlnaHQsIHRvcCwgYm90dG9tfSlcbntcblx0aWYoc2lkZSlcblx0XHRyZXR1cm4gW1tcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHRvcCwgbGVmdCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIGxlZnQpLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIodG9wLCByaWdodClcblx0XHRdLFtcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGJvdHRvbSwgbGVmdCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIHJpZ2h0KSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHRvcCwgcmlnaHQpXG5cdFx0XV07XG5cdGVsc2Vcblx0XHRyZXR1cm4gW1tcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIHRvcCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihsZWZ0LCBib3R0b20pLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIocmlnaHQsIHRvcClcblx0XHRdLFtcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIGJvdHRvbSksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihyaWdodCwgYm90dG9tKSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCB0b3ApXG5cdFx0XV07XG59XG5cbmZ1bmN0aW9uIGdldFVWcyh0eXBlKVxue1xuXHRsZXQgZGltcyA9IHtsZWZ0OiAwLCByaWdodDogMSwgYm90dG9tOiAwLCB0b3A6IDF9O1xuXG5cdHN3aXRjaCh0eXBlKVxuXHR7XG5cdGNhc2UgVHlwZXMuUE9MSUNZX0xJQkVSQUw6XG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjgzNCwgcmlnaHQ6IDAuOTk2LCB0b3A6IDAuNzU0LCBib3R0b206IDAuOTk3fTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5QT0xJQ1lfRkFTQ0lTVDpcblx0XHRkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuNjYsIHJpZ2h0OiAwLjgyMiwgdG9wOiAwLjc1NCwgYm90dG9tOiAwLjk5Nn07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUk9MRV9MSUJFUkFMOlxuXHRcdGRpbXMgPSB7bGVmdDogMC41MDUsIHJpZ2h0OiAwLjc0NiwgdG9wOiAwLjk5NiwgYm90dG9tOiAwLjY1fTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5ST0xFX0ZBU0NJU1Q6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjUwNSwgcmlnaHQ6IDAuNzQ2LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUk9MRV9ISVRMRVI6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjc1NCwgcmlnaHQ6IDAuOTk2LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUEFSVFlfTElCRVJBTDpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMjU1LCByaWdodDogMC40OTUsIHRvcDogMC45OTYsIGJvdHRvbTogMC42NX07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUEFSVFlfRkFTQ0lTVDpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMjU1LCByaWdodDogMC40OTUsIHRvcDogMC42NDUsIGJvdHRvbTogMC4zfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5KQTpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMDA1LCByaWdodDogMC4yNDQsIHRvcDogMC45OTIsIGJvdHRvbTogMC42NTN9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLk5FSU46XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjAwNiwgcmlnaHQ6IDAuMjQzLCB0b3A6IDAuNjQyLCBib3R0b206IDAuMzAyfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5DUkVESVRTOlxuXHRcdGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC4wMTUsIHJpZ2h0OiAwLjI3NiwgdG9wOiAwLjM5NywgYm90dG9tOiAwLjc2NX07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuQkxBTks6XG5cdGRlZmF1bHQ6XG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjAyMiwgcmlnaHQ6IC4wMjIrMC4yNDcsIHRvcDogMC4wMjEsIGJvdHRvbTogLjAyMSswLjM1NDN9O1xuXHRcdGJyZWFrO1xuXHR9XG5cblx0cmV0dXJuIGRpbXNUb1VWKGRpbXMpO1xufVxuXG5cbmNsYXNzIENhcmQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3Rvcih0eXBlID0gVHlwZXMuQkxBTkssIGRvdWJsZVNpZGVkID0gdHJ1ZSwgc2VjcmV0ID0gZmFsc2UpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0Ly8gY3JlYXRlIHRoZSBjYXJkIGZhY2VzXG5cdFx0bGV0IGZyb250ID0gbmV3IFRIUkVFLk1lc2goXG5cdFx0XHRuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSguMzU3NSwgLjUpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IEFzc2V0TWFuYWdlci5jYWNoZS50ZXh0dXJlcy5jYXJkc30pXG5cdFx0KTtcblx0XHRsZXQgYmFjayA9IG5ldyBUSFJFRS5NZXNoKFxuXHRcdFx0bmV3IFRIUkVFLlBsYW5lR2VvbWV0cnkoLjM1NzUsIC41KSxcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KVxuXHRcdCk7XG5cdFx0YmFjay5wb3NpdGlvbi5zZXQoMC4wMDUsIDAsIDApO1xuXHRcdGJhY2sucm90YXRlWShNYXRoLlBJKTtcblxuXHRcdC8vIHNldCB0aGUgZmFjZXMgdG8gdGhlIGNvcnJlY3QgcGFydCBvZiB0aGUgdGV4dHVyZVxuXHRcdGZyb250Lmdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnMgPSBbZ2V0VVZzKHR5cGUpXTtcblx0XHRiYWNrLmdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnMgPSBbZ2V0VVZzKCBkb3VibGVTaWRlZCA/IHR5cGUgOiBUeXBlcy5CTEFOSyApXTtcblxuXHRcdHdpbmRvdy50ZXN0ID0gZnJvbnQ7XG5cblx0XHR0aGlzLmFkZChmcm9udCwgYmFjayk7XG5cdH1cblxufVxuXG5jbGFzcyBCbGFua0NhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXsgc3VwZXIoKTsgfVxufVxuXG5jbGFzcyBDcmVkaXRzQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLkNSRURJVFMpO1xuXHRcdGxldCBzZWxmID0gdGhpcztcblxuXHRcdGZ1bmN0aW9uIHNldFZpc2liaWxpdHkoKXtcblx0XHRcdGlmKFNILmdhbWUuc3RhdGUgPT09ICdzZXR1cCcpXG5cdFx0XHRcdHNlbGYuY2hpbGRyZW4uZm9yRWFjaChvID0+IHsgby52aXNpYmxlID0gdHJ1ZTsgfSk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHNlbGYuY2hpbGRyZW4uZm9yRWFjaChvID0+IHsgby52aXNpYmxlID0gZmFsc2U7IH0pO1xuXHRcdH1cblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2luaXQnLCBzZXRWaXNpYmlsaXR5KTtcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdzZXR1cCcsIHNldFZpc2liaWxpdHkpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3NldHVwX2VuZCcsIHNldFZpc2liaWxpdHkpO1xuXHR9XG59XG5cbmNsYXNzIExpYmVyYWxQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfTElCRVJBTCwgZmFsc2UsIHNlY3JldCk7XG5cdH1cblx0Z29Ub1Bvc2l0aW9uKHNwb3QgPSAwKVxuXHR7XG5cdFx0c3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDQsIHNwb3QpKTtcblx0XHRsZXQgcyA9IExpYmVyYWxQb2xpY3lDYXJkLnNwb3RzO1xuXHRcdEFuaW1hdGUuc3RhcnQodGhpcywge3BhcmVudDogQXNzZXRNYW5hZ2VyLnJvb3QsIHBvczogc1sncG9zXycrc3BvdF0sIHF1YXQ6IHMucXVhdCwgc2NhbGU6IHMuc2NhbGV9KTtcblx0fVxufVxuXG5MaWJlcmFsUG9saWN5Q2FyZC5zcG90cyA9IHtcblx0cG9zXzA6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNTMzLCAwLjc2LCAtMC4zMzYpLFxuXHRwb3NfMTogbmV3IFRIUkVFLlZlY3RvcjMoMC4yNjMsIDAuNzYsIC0wLjMzNiksXG5cdHBvc18yOiBuZXcgVEhSRUUuVmVjdG9yMygtLjAwNywgMC43NiwgLTAuMzM2KSxcblx0cG9zXzM6IG5ldyBUSFJFRS5WZWN0b3IzKC0uMjc5LCAwLjc2LCAtMC4zMzYpLFxuXHRwb3NfNDogbmV3IFRIUkVFLlZlY3RvcjMoLS41NTIsIDAuNzYsIC0wLjMzNiksXG5cdHF1YXQ6IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMC43MDcxMDY3ODExODY1NDc1LCAwKSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNywgMC43LCAwLjcpXG59XG5cbmNsYXNzIEZhc2Npc3RQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfRkFTQ0lTVCwgZmFsc2UsIHNlY3JldCk7XG5cdH1cblx0Z29Ub1Bvc2l0aW9uKHNwb3QgPSAwKVxuXHR7XG5cdFx0c3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDUsIHNwb3QpKTtcblx0XHRsZXQgcyA9IEZhc2Npc3RQb2xpY3lDYXJkLnNwb3RzO1xuXHRcdEFuaW1hdGUuc3RhcnQodGhpcywge3BhcmVudDogQXNzZXRNYW5hZ2VyLnJvb3QsIHBvczogc1sncG9zXycrc3BvdF0sIHF1YXQ6IHMucXVhdCwgc2NhbGU6IHMuc2NhbGV9KTtcblx0fVxufVxuXG5GYXNjaXN0UG9saWN5Q2FyZC5zcG90cyA9IHtcblx0cG9zXzA6IG5ldyBUSFJFRS5WZWN0b3IzKC0uNjg3LCAwLjc2LCAwLjM0MSksXG5cdHBvc18xOiBuZXcgVEhSRUUuVmVjdG9yMygtLjQxNywgMC43NiwgMC4zNDEpLFxuXHRwb3NfMjogbmV3IFRIUkVFLlZlY3RvcjMoLS4xNDYsIDAuNzYsIDAuMzQxKSxcblx0cG9zXzM6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMTI3LCAwLjc2LCAwLjM0MSksXG5cdHBvc180OiBuZXcgVEhSRUUuVmVjdG9yMygwLjQwMCwgMC43NiwgMC4zNDEpLFxuXHRwb3NfNTogbmV3IFRIUkVFLlZlY3RvcjMoMC42NzMsIDAuNzYsIDAuMzQxKSxcblx0cXVhdDogbmV3IFRIUkVFLlF1YXRlcm5pb24oLTAuNzA3MTA2NzgxMTg2NTQ3NSwgMCwgMCwgMC43MDcxMDY3ODExODY1NDc1KSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNywgMC43LCAwLjcpXG59XG5cbmNsYXNzIExpYmVyYWxSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3RvcihzZWNyZXQgPSBmYWxzZSl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9MSUJFUkFMLCBmYWxzZSwgc2VjcmV0KTtcblx0fVxufVxuXG5jbGFzcyBGYXNjaXN0Um9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3Ioc2VjcmV0ID0gZmFsc2Upe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfRkFTQ0lTVCwgZmFsc2UsIHNlY3JldCk7XG5cdH1cbn1cblxuY2xhc3MgSGl0bGVyUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3Ioc2VjcmV0ID0gZmFsc2Upe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfSElUTEVSLCBmYWxzZSwgc2VjcmV0KTtcblx0fVxufVxuXG5jbGFzcyBMaWJlcmFsUGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9MSUJFUkFMLCBmYWxzZSwgc2VjcmV0KTtcblx0fVxufVxuXG5jbGFzcyBGYXNjaXN0UGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9GQVNDSVNULCBmYWxzZSwgc2VjcmV0KTtcblx0fVxufVxuXG5jbGFzcyBKYUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5KQSwgZmFsc2UsIGZhbHNlKTtcblx0XHR0aGlzLmNoaWxkcmVuWzBdLnJvdGF0ZVooLU1hdGguUEkvMik7XG5cdFx0dGhpcy5jaGlsZHJlblsxXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xuXHR9XG59XG5cbmNsYXNzIE5laW5DYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuTkVJTiwgZmFsc2UsIGZhbHNlKTtcblx0XHR0aGlzLmNoaWxkcmVuWzBdLnJvdGF0ZVooLU1hdGguUEkvMik7XG5cdFx0dGhpcy5jaGlsZHJlblsxXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xuXHR9XG59XG5cblxuZXhwb3J0IHtcblx0Q2FyZCwgVHlwZXMsIEJsYW5rQ2FyZCwgQ3JlZGl0c0NhcmQsXG5cdExpYmVyYWxQb2xpY3lDYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgTGliZXJhbFJvbGVDYXJkLCBGYXNjaXN0Um9sZUNhcmQsXG5cdEhpdGxlclJvbGVDYXJkLCBMaWJlcmFsUGFydHlDYXJkLCBGYXNjaXN0UGFydHlDYXJkLCBKYUNhcmQsIE5laW5DYXJkXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuY2xhc3MgUHJlc2lkZW50SGF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMudG9waGF0O1xuXHRcdHRoaXMubW9kZWwucG9zaXRpb24uc2V0KDAsMCwwKTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCAwKTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ2luaXQnLCAoKCkgPT4ge1xuXHRcdFx0aWYoU0guZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJykgdGhpcy5pZGxlKCk7XG5cdFx0fSkuYmluZCh0aGlzKSk7XG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignc2V0dXAnLCB0aGlzLmlkbGUuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRpZGxlKCl7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMC43NSwgMCwgMCk7XG5cdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgTWF0aC5QSS8yLCAwKTtcblx0XHRTSC5pZGxlUm9vdC5hZGQodGhpcyk7XG5cdH1cbn07XG5cbmNsYXNzIENoYW5jZWxsb3JIYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy52aXNvcmNhcDtcblx0XHR0aGlzLm1vZGVsLnBvc2l0aW9uLnNldCgwLDAuMDQsMCk7XG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCdpbml0JywgKCgpID0+IHtcblx0XHRcdGlmKFNILmdhbWUuc3RhdGUgPT09ICdzZXR1cCcpIHRoaXMuaWRsZSgpO1xuXHRcdH0pLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3NldHVwJywgdGhpcy5pZGxlLmJpbmQodGhpcykpO1xuXG5cdH1cblxuXHRpZGxlKCl7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoLTAuNzUsIDAsIDApO1xuXHRcdHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLzIsIDApO1xuXHRcdFNILmlkbGVSb290LmFkZCh0aGlzKTtcblx0fVxufTtcblxuZXhwb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVUYWJsZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyBzYXZlIHJlZmVyZW5jZXMgdG8gdGhlIHRleHR1cmVzXG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX3NtYWxsLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbWVkLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbGFyZ2Vcblx0XHRdO1xuXG5cdFx0Ly8gYWRkIHRhYmxlIGFzc2V0XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50YWJsZS5jaGlsZHJlblswXTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCAwKTtcblx0XHR0aGlzLm1vZGVsLnNjYWxlLnNldFNjYWxhcigxLjI1KTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblxuXHRcdC8vIHNldCB0aGUgZGVmYXVsdCBtYXRlcmlhbFxuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwubWFwID0gdGhpcy50ZXh0dXJlc1swXTtcblxuXHRcdC8vIHBvc2l0aW9uIHRhYmxlXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMC43NSwgMCk7XG5cdH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbmZ1bmN0aW9uIGdldEdhbWVJZCgpXG57XG5cdC8vIGZpcnN0IGNoZWNrIHRoZSB1cmxcblx0bGV0IHJlID0gL1s/Jl1nYW1lSWQ9KFteJl0rKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcblx0aWYocmUpe1xuXHRcdHJldHVybiByZVsxXTtcblx0fVxuXHRlbHNlIGlmKGFsdHNwYWNlICYmIGFsdHNwYWNlLmluQ2xpZW50KXtcblx0XHRyZXR1cm4gU0guZW52LnNpZDtcblx0fVxuXHRlbHNlIHtcblx0XHRsZXQgaWQgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogMTAwMDAwMDAwICk7XG5cdFx0d2luZG93LmxvY2F0aW9uLnJlcGxhY2UoJz9nYW1lSWQ9JytpZCk7XG5cdH1cbn1cblxuZXhwb3J0IHsgZ2V0R2FtZUlkIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBOYW1lcGxhdGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcihzZWF0TnVtKVxuXHR7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc2VhdE51bSA9IHNlYXROdW07XG5cdFx0dGhpcy5vd25lciA9IG51bGw7IC8vIHVzZXJJZFxuXG5cdFx0Ly8gYWRkIDNkIG1vZGVsXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy5uYW1lcGxhdGUuY2hpbGRyZW5bMF0uY2xvbmUoKTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCAwKTtcblx0XHR0aGlzLm1vZGVsLnNjYWxlLnNldFNjYWxhcigxLjI1KTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblxuXHRcdC8vIGdlbmVyYXRlIG1hdGVyaWFsXG5cdFx0dGhpcy5ibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHR0aGlzLmJtcC53aWR0aCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZTtcblx0XHR0aGlzLmJtcC5oZWlnaHQgPSBOYW1lcGxhdGUudGV4dHVyZVNpemUgLyAyO1xuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuXHRcdFx0bWFwOiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZSh0aGlzLmJtcClcblx0XHR9KTtcblxuXHRcdC8vIHBsYWNlIHBsYWNhcmRcblx0XHRsZXQgeCwgeSA9IDAuNzY5LCB6O1xuXHRcdHN3aXRjaChzZWF0TnVtKXtcblx0XHRjYXNlIDA6IGNhc2UgMTogY2FzZSAyOlxuXHRcdFx0dGhpcy5tb2RlbC5yb3RhdGVaKE1hdGguUEkvMik7XG5cdFx0XHR4ID0gLTAuODMzICsgMC44MzMqc2VhdE51bTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIC0wLjgzKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMzogY2FzZSA0OlxuXHRcdFx0eiA9IC0wLjQzNyArIDAuODc0KihzZWF0TnVtLTMpO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMS4yMSwgeSwgeik7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIDU6IGNhc2UgNjogY2FzZSA3OlxuXHRcdFx0dGhpcy5tb2RlbC5yb3RhdGVaKE1hdGguUEkvMik7XG5cdFx0XHR4ID0gMC44MzMgLSAwLjgzMyooc2VhdE51bS01KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIDAuODMpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSA4OiBjYXNlIDk6XG5cdFx0XHR6ID0gMC40MzcgLSAwLjg3NCooc2VhdE51bS04KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KC0xLjIxLCB5LCB6KTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdC8vIGNyZWF0ZSBsaXN0ZW5lciBwcm94aWVzXG5cdFx0dGhpcy5fcmVxdWVzdEpvaW4gPSB0aGlzLnJlcXVlc3RKb2luLmJpbmQodGhpcyk7XG5cdFx0dGhpcy5faG92ZXJCZWhhdmlvciA9IG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLkhvdmVyQ29sb3Ioe1xuXHRcdFx0Y29sb3I6IG5ldyBUSFJFRS5Db2xvcigweGZmYThhOClcblx0XHR9KTtcblxuXHRcdC8vIGhvb2sgdXAgbGlzdGVuZXJzXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcignaW5pdCcsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3NldHVwJywgdGhpcy51cGRhdGVPd25lcnNoaXAuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVUZXh0KHRleHQpXG5cdHtcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcblxuXHRcdC8vIHNldCB1cCBjYW52YXNcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdFx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xuXHRcdGcuZmlsbFN0eWxlID0gJyMyMjInO1xuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XG5cdFx0Zy5mb250ID0gYGJvbGQgJHtmb250U2l6ZX1weCAke2ZvbnRTdGFja31gO1xuXHRcdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGcuZmlsbFRleHQodGV4dCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLzIsICgwLjQyIC0gMC4xMikqKE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yKSk7XG5cblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdH1cblxuXHRyZXF1ZXN0Sm9pbigpXG5cdHtcblx0XHRjb25zb2xlLmxvZygnUmVxdWVzdGluZyB0byBqb2luIGF0IHNlYXQnLCB0aGlzLnNlYXROdW0pO1xuXHRcdFNILnNvY2tldC5lbWl0KCdyZXF1ZXN0Sm9pbicsIE9iamVjdC5hc3NpZ24oe3NlYXROdW06IHRoaXMuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpO1xuXHR9XG5cblx0dXBkYXRlT3duZXJzaGlwKClcblx0e1xuXHRcdC8vIGNoZWNrIGZvciBwbGF5ZXJcblx0XHRsZXQgb3duZXIgPSBPYmplY3Qua2V5cyhTSC5wbGF5ZXJzKS5maW5kKChlID0+IFNILnBsYXllcnNbZV0uc2VhdE51bSA9PSB0aGlzLnNlYXROdW0pLmJpbmQodGhpcykpO1xuXHRcdGNvbnNvbGUubG9nKG93bmVyLCB0aGlzLm93bmVyKTtcblxuXHRcdC8vIHBsYXllciBqb2luZWRcblx0XHRpZihvd25lciAmJiAhdGhpcy5vd25lcilcblx0XHR7XG5cdFx0XHRjb25zb2xlLmxvZygnb3duZXIgZm91bmQnKTtcblx0XHRcdHRoaXMub3duZXIgPSBvd25lcjtcblx0XHRcdHRoaXMudXBkYXRlVGV4dChTSC5wbGF5ZXJzW3RoaXMub3duZXJdLmRpc3BsYXlOYW1lKTtcblxuXHRcdFx0dGhpcy5tb2RlbC5fX2JlaGF2aW9yTGlzdCA9IHRoaXMubW9kZWwuX19iZWhhdmlvckxpc3QgfHwgW107IC8vIFRPRE86IHVnaFxuXHRcdFx0dGhpcy5tb2RlbC5yZW1vdmVCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcblx0XHRcdHRoaXMubW9kZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLl9yZXF1ZXN0Sm9pbik7XG5cdFx0fVxuXG5cdFx0Ly8gcGxheWVyIGxlZnRcblx0XHRlbHNlIGlmKCFvd25lciAmJiAodGhpcy5vd25lciB8fCB0aGlzLm93bmVyID09PSBudWxsKSlcblx0XHR7XG5cdFx0XHRjb25zb2xlLmxvZygnb3duZXIgbG9zdCcpO1xuXHRcdFx0dGhpcy5vd25lciA9IDA7XG5cdFx0XHR0aGlzLnVwZGF0ZVRleHQoJzxKb2luPicpO1xuXHRcdFx0dGhpcy5tb2RlbC5hZGRCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKTtcblx0XHRcdHRoaXMubW9kZWwuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLl9yZXF1ZXN0Sm9pbik7XG5cdFx0fVxuXHR9XG59XG5cbk5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSA9IDUxMjtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0ICogYXMgQ2FyZHMgZnJvbSAnLi9jYXJkJztcbmltcG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9IGZyb20gJy4vaGF0cyc7XG5pbXBvcnQgR2FtZVRhYmxlIGZyb20gJy4vdGFibGUnO1xuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgeyBnZXRHYW1lSWQgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnO1xuXG5jbGFzcyBTZWNyZXRIaXRsZXIgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuYXNzZXRzID0gQXNzZXRNYW5hZ2VyLm1hbmlmZXN0O1xuXHRcdHRoaXMudmVydGljYWxBbGlnbiA9ICdib3R0b20nO1xuXHRcdHRoaXMubmVlZHNTa2VsZXRvbiA9IHRydWU7XG5cblx0XHQvLyBwb2x5ZmlsbCBnZXRVc2VyIGZ1bmN0aW9uXG5cdFx0aWYoIWFsdHNwYWNlLmluQ2xpZW50KXtcblx0XHRcdGFsdHNwYWNlLmdldFVzZXIgPSAoKSA9PiB7XG5cdFx0XHRcdGxldCBpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwKTtcblx0XHRcdFx0YWx0c3BhY2UuX2xvY2FsVXNlciA9IHtcblx0XHRcdFx0XHR1c2VySWQ6IGlkLFxuXHRcdFx0XHRcdGRpc3BsYXlOYW1lOiAnR3Vlc3QnK2lkLFxuXHRcdFx0XHRcdGlzTW9kZXJhdG9yOiBmYWxzZVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRjb25zb2xlLmxvZygnTWFzcXVlcmFkaW5nIGFzJywgYWx0c3BhY2UuX2xvY2FsVXNlcik7XG5cdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoYWx0c3BhY2UuX2xvY2FsVXNlcik7XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIGdldCBsb2NhbCB1c2VyXG5cdFx0YWx0c3BhY2UuZ2V0VXNlcigpLnRoZW4oKHVzZXIgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcblx0XHRcdFx0aWQ6IHVzZXIudXNlcklkLnRvU3RyaW5nKCksXG5cdFx0XHRcdGRpc3BsYXlOYW1lOiB1c2VyLmRpc3BsYXlOYW1lLFxuXHRcdFx0XHRpc01vZGVyYXRvcjogdXNlci5pc01vZGVyYXRvclxuXHRcdFx0fTtcblx0XHR9KS5iaW5kKHRoaXMpKTtcblxuXHRcdHRoaXMuZ2FtZSA9IG51bGw7XG5cdFx0dGhpcy5wbGF5ZXJzID0gbnVsbDtcblx0fVxuXG5cdGluaXRpYWxpemUoZW52LCByb290LCBhc3NldHMpXG5cdHtcblx0XHQvLyBzaGFyZSB0aGUgZGlvcmFtYSBpbmZvXG5cdFx0QXNzZXRNYW5hZ2VyLmNhY2hlID0gYXNzZXRzO1xuXHRcdHRoaXMuZW52ID0gZW52O1xuXG5cdFx0Ly8gY29ubmVjdCB0byBzZXJ2ZXJcblx0XHR0aGlzLnNvY2tldCA9IGlvLmNvbm5lY3QoJy8nLCB7cXVlcnk6ICdnYW1lSWQ9JytnZXRHYW1lSWQoKX0pO1xuXG5cdFx0Ly8gY3JlYXRlIHRoZSB0YWJsZVxuXHRcdHRoaXMuZ2FtZVRhYmxlID0gbmV3IEdhbWVUYWJsZSgpO1xuXHRcdHRoaXMuYWRkKHRoaXMuZ2FtZVRhYmxlKTtcblxuXHRcdHRoaXMucmVzZXRCdXR0b24gPSBuZXcgVEhSRUUuTWVzaChcblx0XHRcdG5ldyBUSFJFRS5Cb3hHZW9tZXRyeSguMjUsLjI1LC4yNSksXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogYXNzZXRzLnRleHR1cmVzLnJlc2V0fSlcblx0XHQpO1xuXHRcdHRoaXMucmVzZXRCdXR0b24ucG9zaXRpb24uc2V0KDAsIC0wLjE4LCAwKTtcblx0XHR0aGlzLnJlc2V0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5yZXNldC5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLmdhbWVUYWJsZS5hZGQodGhpcy5yZXNldEJ1dHRvbik7XG5cblx0XHQvLyBjcmVhdGUgaWRsZSBkaXNwbGF5XG5cdFx0dGhpcy5pZGxlUm9vdCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuXHRcdHRoaXMuaWRsZVJvb3QucG9zaXRpb24uc2V0KDAsIDEuNSwgMCk7XG5cdFx0dGhpcy5pZGxlUm9vdC5hZGRCZWhhdmlvcihuZXcgYWx0c3BhY2UudXRpbGl0aWVzLmJlaGF2aW9ycy5TcGluKHtzcGVlZDogMC4wMDAyfSkpO1xuXHRcdHRoaXMuYWRkKHRoaXMuaWRsZVJvb3QpO1xuXG5cdFx0Ly8gY3JlYXRlIGlkbGUgc2xpZGVzaG93XG5cdFx0bGV0IGNyZWRpdHMgPSBuZXcgQ2FyZHMuQ3JlZGl0c0NhcmQoKTtcblx0XHR0aGlzLmlkbGVSb290LmFkZChjcmVkaXRzKTtcblxuXHRcdC8vIGNyZWF0ZSBoYXRzXG5cdFx0dGhpcy5wcmVzaWRlbnRIYXQgPSBuZXcgUHJlc2lkZW50SGF0KCk7XG5cdFx0dGhpcy5jaGFuY2VsbG9ySGF0ID0gbmV3IENoYW5jZWxsb3JIYXQoKTtcblxuXHRcdC8vIGNyZWF0ZSBwb3NpdGlvbnNcblx0XHR0aGlzLnNlYXRzID0gW107XG5cdFx0Zm9yKGxldCBpPTA7IGk8MTA7IGkrKyl7XG5cdFx0XHRsZXQgc2VhdCA9IG5ldyBOYW1lcGxhdGUoaSk7XG5cdFx0XHR0aGlzLnNlYXRzLnB1c2goc2VhdCk7XG5cdFx0fVxuXHRcdHRoaXMuYWRkKC4uLnRoaXMuc2VhdHMpO1xuXG5cdFx0dGhpcy5zb2NrZXQub24oJ3VwZGF0ZScsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZUZyb21TZXJ2ZXIoZ2FtZSwgcGxheWVycylcblx0e1xuXHRcdGNvbnNvbGUubG9nKGdhbWUsIHBsYXllcnMpO1xuXG5cdFx0aWYoIXRoaXMuZ2FtZSAmJiAhdGhpcy5wbGF5ZXJzKXtcblx0XHRcdHRoaXMuZ2FtZSA9IGdhbWU7XG5cdFx0XHR0aGlzLnBsYXllcnMgPSBwbGF5ZXJzO1xuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOiAnaW5pdCcsIGJ1YmJsZXM6IGZhbHNlfSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLmdhbWUsIGdhbWUpO1xuXHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLnBsYXllcnMsIHBsYXllcnMpO1xuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOiB0aGlzLmdhbWUuc3RhdGUrJ19lbmQnLCBidWJibGVzOiBmYWxzZX0pO1xuXHRcdFx0dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOiB0aGlzLmdhbWUuc3RhdGUsIGJ1YmJsZXM6IGZhbHNlfSk7XG5cdFx0fVxuXHR9XG5cblx0cmVzZXQoKVxuXHR7XG5cdFx0Y29uc29sZS5sb2coJ3JlcXVlc3RpbmcgcmVzZXQnLCB0aGlzKTtcblx0XHR0aGlzLmdhbWUgPSBudWxsO1xuXHRcdHRoaXMucGxheWVycyA9IG51bGw7XG5cdFx0dGhpcy5zb2NrZXQuZW1pdCgncmVzZXQnKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgU2VjcmV0SGl0bGVyKCk7XG4iXSwibmFtZXMiOlsidGhpcyIsInN1cGVyIiwibGV0IiwiQXNzZXRNYW5hZ2VyIiwiQ2FyZHMuQ3JlZGl0c0NhcmQiXSwibWFwcGluZ3MiOiI7OztBQUVBLFNBQWU7Q0FDZCxRQUFRLEVBQUU7RUFDVCxNQUFNLEVBQUU7R0FDUCxLQUFLLEVBQUUsd0JBQXdC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LEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDN0QsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLFlBQVk7RUFDdEIsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQzVELE1BQU07Q0FDUCxLQUFLLEtBQUssQ0FBQyxXQUFXO0VBQ3JCLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztFQUM1RCxNQUFNO0NBQ1AsS0FBSyxLQUFLLENBQUMsYUFBYTtFQUN2QixJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDN0QsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLGFBQWE7RUFDdkIsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQzVELE1BQU07Q0FDUCxLQUFLLEtBQUssQ0FBQyxFQUFFO0VBQ1osSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0VBQzlELE1BQU07Q0FDUCxLQUFLLEtBQUssQ0FBQyxJQUFJO0VBQ2QsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFF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
