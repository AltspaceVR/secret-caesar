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

function parseCSV(str){
	if(!str) { return []; }
	else { return str.split(','); }
}

var Nameplate = (function (superclass) {
	function Nameplate(seatNum)
	{
		superclass.call(this);

		this.seatNum = seatNum;
		this.owner = 0; // userId

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
		this._hoverBehavior = new altspace.utilities.behaviors.HoverColor({
			color: new THREE.Color(0xffa8a8)
		});
		this.model.addBehavior(this._hoverBehavior);
		this.model.addEventListener('cursorup', this.click.bind(this));

		// hook up listeners
		SH.addEventListener('update_turnOrder', this.updateOwnership.bind(this));
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

	Nameplate.prototype.updateOwnership = function updateOwnership (ref)
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
					this$1.updateText(players[ids[i]].displayName);
					return;
				}
			}
		}

		if( !ids.includes(this.owner) )
		{
			this.owner = 0;
			if(game.state === 'setup'){
				this.updateText('<Join>');
			}
		}
	};

	Nameplate.prototype.click = function click (e)
	{
		if(!this.owner && SH.game.state === 'setup')
			{ this.requestJoin(); }
	};

	Nameplate.prototype.requestJoin = function requestJoin ()
	{
		console.log('Requesting to join at seat', this.seatNum);
		SH.socket.emit('requestJoin', Object.assign({seatNum: this.seatNum}, SH.localUser));
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
			var seat = new Nameplate(i);
			this$1.seats.push(seat);
		}
		(ref = this.table).add.apply(ref, this.seats);

		// add avatar for scale
		assets.models.dummy.position.set(0, 0, 1.2);
		assets.models.dummy.rotateZ(Math.PI);
		this.add(assets.models.dummy);

		this.socket.on('update', this.updateFromServer.bind(this));
		var ref;
	};

	SecretHitler.prototype.updateFromServer = function updateFromServer (game, players)
	{
		var this$1 = this;

		console.log(game, players);

		var newGameInfo = Object.assign({}, this.game, game);
		var newPlayerInfo = Object.assign({}, this.players, players);
		//let newVoteInfo = Object.assign({}, this.votes, votes);

		var needPlayerInfo = ['turnOrder','pendingJoinRequest'];
		for(var field in game)
		{
			this$1.dispatchEvent({
				type: 'update_'+field,
				bubbles: false,
				data: {
					game: newGameInfo,
					players: needPlayerInfo.includes(field) ? newPlayerInfo : undefined
				}
			});
		}

		this.game = newGameInfo;
		this.players = newPlayerInfo;
	};

	SecretHitler.prototype.reset = function reset (){
		this.socket.emit('reset');
	};

	return SecretHitler;
}(THREE.Object3D));

var SH = new SecretHitler();

return SH;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvYXNzZXRtYW5hZ2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9nYW1lb2JqZWN0cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVybWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RhYmxlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC91dGlscy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWNyZXRoaXRsZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCB7XG5cdG1hbmlmZXN0OiB7XG5cdFx0bW9kZWxzOiB7XG5cdFx0XHR0YWJsZTogJ3N0YXRpYy9tb2RlbC90YWJsZS5kYWUnLFxuXHRcdFx0bmFtZXBsYXRlOiAnc3RhdGljL21vZGVsL25hbWVwbGF0ZS5kYWUnLFxuXHRcdFx0dG9waGF0OiAnc3RhdGljL21vZGVsL3RvcGhhdC5nbHRmJyxcblx0XHRcdHZpc29yY2FwOiAnc3RhdGljL21vZGVsL3Zpc29yX2NhcC5nbHRmJyxcblx0XHRcdGR1bW15OiAnc3RhdGljL21vZGVsL2R1bW15LmdsdGYnXG5cdFx0fSxcblx0XHR0ZXh0dXJlczoge1xuXHRcdFx0Ym9hcmRfbGFyZ2U6ICdzdGF0aWMvaW1nL2JvYXJkLWxhcmdlLWJha2VkLnBuZycsXG5cdFx0XHRib2FyZF9tZWQ6ICdzdGF0aWMvaW1nL2JvYXJkLW1lZGl1bS1iYWtlZC5wbmcnLFxuXHRcdFx0Ym9hcmRfc21hbGw6ICdzdGF0aWMvaW1nL2JvYXJkLXNtYWxsLWJha2VkLnBuZycsXG5cdFx0XHRjYXJkczogJ3N0YXRpYy9pbWcvY2FyZHMucG5nJyxcblx0XHRcdHJlc2V0OiAnc3RhdGljL2ltZy9ib21iLnBuZydcblx0XHR9XG5cdH0sXG5cdGNhY2hlOiB7fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jbGFzcyBHYW1lU3RhdGVcbntcblx0Y29uc3RydWN0b3IoaWQpXG5cdHtcblx0XHR0aGlzLmlkID0gaWQ7XG5cblx0XHR0aGlzLnN0YXRlID0gJ2lkbGUnO1xuXG5cdFx0dGhpcy50dXJuT3JkZXIgPSBbXTsgLy8gYXJyYXkgb2YgdXNlcklkc1xuXHRcdHRoaXMucHJlc2lkZW50ID0gMDsgLy8gdXNlcklkXG5cdFx0dGhpcy5jaGFuY2VsbG9yID0gMDsgLy8gdXNlcklkXG5cdFx0dGhpcy5sYXN0UHJlc2lkZW50ID0gMDsgLy8gdXNlcklkXG5cdFx0dGhpcy5sYXN0Q2hhbmNlbGxvciA9IDA7IC8vIHVzZXJJZFxuXG5cdFx0dGhpcy5saWJlcmFsUG9saWNpZXMgPSAwO1xuXHRcdHRoaXMuZmFzY2lzdFBvbGljaWVzID0gMDtcblx0XHR0aGlzLmRlY2tGYXNjaXN0ID0gMTE7XG5cdFx0dGhpcy5kZWNrTGliZXJhbCA9IDY7XG5cdFx0dGhpcy5kaXNjYXJkRmFzY2lzdCA9IDA7XG5cdFx0dGhpcy5kaXNjYXJkTGliZXJhbCA9IDA7XG5cdFx0dGhpcy5zcGVjaWFsRWxlY3Rpb24gPSBmYWxzZTtcblx0XHR0aGlzLmZhaWxlZFZvdGVzID0gMDtcblx0fVxuXG5cdG5leHRQcmVzaWRlbnQoKVxuXHR7XG5cdFx0bGV0IHR1cm4gPSAwO1xuXG5cdFx0Ly8gdGhpcyBpcyB0aGUgZmlyc3Qgcm91bmQsIGNob29zZSBwcmVzaWRlbnQgcmFuZG9tbHlcblx0XHRpZighdGhpcy5wcmVzaWRlbnQpXG5cdFx0XHR0dXJuID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhpcy50dXJuT3JkZXIubGVuZ3RoKTtcblxuXHRcdC8vIHRoaXMgaXMgYSBzcGVjaWFsIGVsZWN0aW9uLCBzbyBjb3VudCBmcm9tIHByZXNpZGVudCBlbWVyaXR1c1xuXHRcdGVsc2UgaWYodGhpcy5zcGVjaWFsRWxlY3Rpb24pXG5cdFx0XHR0dXJuID0gdGhpcy5wbGF5ZXJzW3RoaXMubGFzdFByZXNpZGVudF0udHVybk9yZGVyO1xuXG5cdFx0Ly8gYSByZWd1bGFyIGVsZWN0aW9uOiBwb3dlciBwYXNzZXMgdG8gdGhlIGxlZnRcblx0XHRlbHNlXG5cdFx0XHR0dXJuID0gdGhpcy5wbGF5ZXJzW3RoaXMucHJlc2lkZW50XS50dXJuT3JkZXI7XG5cblx0XHRyZXR1cm4gdGhpcy50dXJuT3JkZXJbICh0dXJuKzEpJXRoaXMudHVybk9yZGVyLmxlbmd0aCBdO1xuXHR9XG5cblx0ZHJhd1BvbGljaWVzKClcblx0e1xuXG5cdH1cbn1cblxuY2xhc3MgUGxheWVyXG57XG5cdGNvbnN0cnVjdG9yKHVzZXJJZCA9IDAsIGRpc3BsYXlOYW1lID0gJ2R1bW15JywgaXNNb2RlcmF0b3IgPSBmYWxzZSlcblx0e1xuXHRcdHRoaXMudXNlcklkID0gdXNlcklkO1xuXHRcdHRoaXMuZGlzcGxheU5hbWUgPSBkaXNwbGF5TmFtZTtcblx0XHR0aGlzLmlzTW9kZXJhdG9yID0gZmFsc2U7XG5cdFx0dGhpcy50dXJuT3JkZXIgPSAtMTsgLy8gdW5rbm93biB1bnRpbCBnYW1lIHN0YXJ0c1xuXG5cdFx0dGhpcy5yb2xlID0gJ3VuYXNzaWduZWQnOyAvLyBvbmUgb2YgJ3VuYXNzaWduZWQnLCAnaGl0bGVyJywgJ2Zhc2Npc3QnLCAnbGliZXJhbCdcblx0XHR0aGlzLnN0YXRlID0gJ25vcm1hbCc7IC8vIG9uZSBvZiAnbm9ybWFsJywgJ2ludmVzdGlnYXRlZCcsICdkZWFkJ1xuXHR9XG5cblx0Z2V0IHBhcnR5KCl7XG5cdFx0aWYodGhpcy5yb2xlID09PSAnaGl0bGVyJykgcmV0dXJuICdmYXNjaXN0Jztcblx0XHRlbHNlIHJldHVybiB0aGlzLnJvbGU7XG5cdH1cbn1cblxuZXhwb3J0IHsgR2FtZVN0YXRlLCBQbGF5ZXIgfTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHsgUGxheWVyIH0gZnJvbSAnLi9nYW1lb2JqZWN0cyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBsYXllck1hbmFnZXJcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0dGhpcy5sb2NhbFVzZXIgPSBudWxsO1xuXHRcdHRoaXMucGxheWVycyA9IFtdO1xuXHR9XG5cblx0YWNxdWlyZUxvY2FsVXNlcigpXG5cdHtcblx0XHRpZih3aW5kb3cuYWx0c3BhY2UgJiYgYWx0c3BhY2UuaW5DbGllbnQpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2NhbFVzZXIgPSB7fTtcblxuXHRcdFx0Ly8gZ2V0IHRoZSBsb2NhbCB1c2VyIGlkIGFuZCBuYW1lXG5cdFx0XHRhbHRzcGFjZS5nZXRVc2VyKCkudGhlbigodXNlciA9PiB7XG5cdFx0XHRcdE9iamVjdC5hc3NpZ24odGhpcy5sb2NhbFVzZXIsIHVzZXIpO1xuXHRcdFx0fSkuYmluZCh0aGlzKSk7XG5cblx0XHRcdC8vIGdldCB0aGUgdXNlciB0cmFja2luZyBza2VsZXRvblxuXHRcdFx0YWx0c3BhY2UuZ2V0VGhyZWVKU1RyYWNraW5nU2tlbGV0b24oKS50aGVuKCh0cyA9PiB7XG5cdFx0XHRcdHRoaXMubG9jYWxVc2VyLnNrZWxldG9uID0gdHM7XG5cdFx0XHRcdFNILmFkZCh0cyk7XG5cdFx0XHR9KS5iaW5kKHRoaXMpKTtcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdC8vIGZha2UgdXNlciBkYXRhXG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcblx0XHRcdFx0dXNlcklkOiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwKSxcblx0XHRcdFx0aXNNb2RlcmF0b3I6IGZhbHNlXG5cdFx0XHR9O1xuXHRcdFx0dGhpcy5sb2NhbFVzZXIuZGlzcGxheU5hbWUgPSAnV2ViIFVzZXIgJyt0aGlzLmxvY2FsVXNlci51c2VySWQ7XG5cdFx0fVxuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgUE0gZnJvbSAnLi9wbGF5ZXJtYW5hZ2VyJztcblxuY2xhc3MgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IodHlwZSl7XG5cdFx0dGhpcy50eXBlID0gdHlwZTtcblx0fVxuXG5cdGF3YWtlKG9iail7XG5cdFx0dGhpcy5vYmplY3QzRCA9IG9iajtcblx0fVxuXG5cdHN0YXJ0KCl7IH1cblxuXHR1cGRhdGUoZFQpeyB9XG5cblx0ZGlzcG9zZSgpeyB9XG59XG5cbmNsYXNzIEJTeW5jIGV4dGVuZHMgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IoZXZlbnROYW1lKVxuXHR7XG5cdFx0c3VwZXIoJ0JTeW5jJyk7XG5cdFx0dGhpcy5fcyA9IFNILnNvY2tldDtcblxuXHRcdC8vIGxpc3RlbiBmb3IgdXBkYXRlIGV2ZW50c1xuXHRcdHRoaXMuaG9vayA9IHRoaXMuX3Mub24oZXZlbnROYW1lLCB0aGlzLnVwZGF0ZUZyb21TZXJ2ZXIuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5ldmVudE5hbWUgPSBldmVudE5hbWU7XG5cdFx0dGhpcy5vd25lciA9ICd1bm93bmVkJztcblx0fVxuXG5cdHVwZGF0ZUZyb21TZXJ2ZXIoZGF0YSlcblx0e1xuXHRcdHRoaXMub2JqZWN0M0QucG9zaXRpb24uZnJvbUFycmF5KGRhdGEsIDApO1xuXHRcdHRoaXMub2JqZWN0M0Qucm90YXRpb24uZnJvbUFycmF5KGRhdGEsIDMpO1xuXHR9XG5cblx0dGFrZU93bmVyc2hpcCgpXG5cdHtcblx0XHRpZihQTS5sb2NhbFVzZXIgJiYgUE0ubG9jYWxVc2VyLnVzZXJJZClcblx0XHRcdHRoaXMub3duZXIgPSBQTS5sb2NhbFVzZXIudXNlcklkO1xuXHR9XG5cblx0dXBkYXRlKGRUKVxuXHR7XG5cdFx0aWYoUE0ubG9jYWxVc2VyICYmIFBNLmxvY2FsVXNlci5za2VsZXRvbiAmJiBQTS5sb2NhbFVzZXIudXNlcklkID09PSB0aGlzLm93bmVyKVxuXHRcdHtcblx0XHRcdGxldCBqID0gUE0ubG9jYWxVc2VyLnNrZWxldG9uLmdldEpvaW50KCdIZWFkJyk7XG5cdFx0XHR0aGlzLl9zLmVtaXQodGhpcy5ldmVudE5hbWUsIFsuLi5qLnBvc2l0aW9uLnRvQXJyYXkoKSwgLi4uai5yb3RhdGlvbi50b0FycmF5KCldKTtcblx0XHR9XG5cdH1cblxufVxuXG5leHBvcnQgeyBCZWhhdmlvciwgQlN5bmMgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IHsgQmVoYXZpb3IgfSBmcm9tICcuL2JlaGF2aW9yJztcblxuY2xhc3MgQW5pbWF0ZSBleHRlbmRzIEJlaGF2aW9yXG57XG5cdGNvbnN0cnVjdG9yKC8ve3BhcmVudCwgcG9zLCBxdWF0LCBzY2FsZSwgbWF0cml4LCBkdXJhdGlvbiwgY2FsbGJhY2t9XG5cdFx0e3BhcmVudD1udWxsLCBwb3M9bnVsbCwgcXVhdD1udWxsLCBzY2FsZT1udWxsLCBtYXRyaXg9bnVsbCwgZHVyYXRpb249NjAwLCBjYWxsYmFjaz0oKT0+e319KVxuXHR7XG5cdFx0c3VwZXIoJ0FuaW1hdGUnKTtcblx0XHRcblx0XHRpZihtYXRyaXgpXG5cdFx0e1xuXHRcdFx0Ly8gZXh0cmFjdCBwb3NpdGlvbi9yb3RhdGlvbi9zY2FsZSBmcm9tIG1hdHJpeFxuXHRcdFx0cG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblx0XHRcdHF1YXQgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXHRcdFx0c2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXHRcdFx0bWF0cml4LmRlY29tcG9zZShwb3MsIHF1YXQsIHNjYWxlKTtcblx0XHR9XG5cblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHtwYXJlbnQsIHBvcywgcXVhdCwgc2NhbGUsIGR1cmF0aW9uLCBjYWxsYmFja30pO1xuXHR9XG5cblx0YXdha2Uob2JqKVxuXHR7XG5cdFx0c3VwZXIuYXdha2Uob2JqKTtcblxuXHRcdC8vIHNodWZmbGUgaGllcmFyY2h5LCBidXQga2VlcCB3b3JsZCB0cmFuc2Zvcm0gdGhlIHNhbWVcblx0XHRpZih0aGlzLnBhcmVudCAmJiB0aGlzLnBhcmVudCAhPT0gb2JqLnBhcmVudClcblx0XHR7XG5cdFx0XHRvYmouYXBwbHlNYXRyaXgob2JqLnBhcmVudC5tYXRyaXhXb3JsZCk7XG5cdFx0XHRsZXQgbWF0ID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5nZXRJbnZlcnNlKHRoaXMucGFyZW50Lm1hdHJpeFdvcmxkKTtcblx0XHRcdG9iai5hcHBseU1hdHJpeChtYXQpO1xuXG5cdFx0XHR0aGlzLnBhcmVudC5hZGQob2JqKTtcblx0XHR9XG5cblx0XHQvLyByZWFkIGluaXRpYWwgcG9zaXRpb25zXG5cdFx0dGhpcy5pbml0aWFsUG9zID0gb2JqLnBvc2l0aW9uLmNsb25lKCk7XG5cdFx0dGhpcy5pbml0aWFsUXVhdCA9IG9iai5xdWF0ZXJuaW9uLmNsb25lKCk7XG5cdFx0dGhpcy5pbml0aWFsU2NhbGUgPSBvYmouc2NhbGUuY2xvbmUoKTtcblx0XHR0aGlzLnN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cdH1cblxuXHR1cGRhdGUoKVxuXHR7XG5cdFx0Ly8gY29tcHV0ZSBlYXNlLW91dCBiYXNlZCBvbiBkdXJhdGlvblxuXHRcdGxldCBtaXggPSAoRGF0ZS5ub3coKS10aGlzLnN0YXJ0VGltZSkgLyB0aGlzLmR1cmF0aW9uO1xuXHRcdGxldCBlYXNlID0gVFdFRU4gPyBUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dCA6IG4gPT4gbiooMi1uKTtcblx0XHRtaXggPSBtaXggPCAxID8gZWFzZShtaXgpIDogMTtcblxuXHRcdC8vIGFuaW1hdGUgcG9zaXRpb24gaWYgcmVxdWVzdGVkXG5cdFx0aWYoIHRoaXMucG9zICl7XG5cdFx0XHR0aGlzLm9iamVjdDNELnBvc2l0aW9uLmxlcnBWZWN0b3JzKHRoaXMuaW5pdGlhbFBvcywgdGhpcy5wb3MsIG1peCk7XG5cdFx0fVxuXG5cdFx0Ly8gYW5pbWF0ZSByb3RhdGlvbiBpZiByZXF1ZXN0ZWRcblx0XHRpZiggdGhpcy5xdWF0ICl7XG5cdFx0XHRUSFJFRS5RdWF0ZXJuaW9uLnNsZXJwKHRoaXMuaW5pdGlhbFF1YXQsIHRoaXMucXVhdCwgdGhpcy5vYmplY3QzRC5xdWF0ZXJuaW9uLCBtaXgpXG5cdFx0fVxuXG5cdFx0Ly8gYW5pbWF0ZSBzY2FsZSBpZiByZXF1ZXN0ZWRcblx0XHRpZiggdGhpcy5zY2FsZSApe1xuXHRcdFx0dGhpcy5vYmplY3QzRC5zY2FsZS5sZXJwVmVjdG9ycyh0aGlzLmluaXRpYWxTY2FsZSwgdGhpcy5zY2FsZSwgbWl4KTtcblx0XHR9XG5cblx0XHQvLyB0ZXJtaW5hdGUgYW5pbWF0aW9uIHdoZW4gZG9uZVxuXHRcdGlmKG1peCA+PSAxKXtcblx0XHRcdHRoaXMub2JqZWN0M0QucmVtb3ZlQmVoYXZpb3IodGhpcyk7XG5cdFx0XHR0aGlzLmNhbGxiYWNrLmNhbGwodGhpcy5vYmplY3QzRCk7XG5cdFx0fVxuXHR9XG59XG5cbkFuaW1hdGUuc3RhcnQgPSAodGFyZ2V0LCBvcHRzKSA9Plxue1xuXHRsZXQgb2xkQW5pbSA9IHRhcmdldC5nZXRCZWhhdmlvckJ5VHlwZSgnQW5pbWF0ZScpO1xuXHRpZihvbGRBbmltKXtcblx0XHRvbGRBbmltLmNvbnN0cnVjdG9yKG9wdHMpO1xuXHRcdG9sZEFuaW0uYXdha2UodGFyZ2V0KTtcblx0fVxuXHRlbHNlIHtcblx0XHR0YXJnZXQuYWRkQmVoYXZpb3IoIG5ldyBBbmltYXRlKG9wdHMpICk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQW5pbWF0ZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuXG4vLyBlbnVtIGNvbnN0YW50c1xubGV0IFR5cGVzID0gT2JqZWN0LmZyZWV6ZSh7XG5cdFBPTElDWV9MSUJFUkFMOiAwLFxuXHRQT0xJQ1lfRkFTQ0lTVDogMSxcblx0Uk9MRV9MSUJFUkFMOiAyLFxuXHRST0xFX0ZBU0NJU1Q6IDMsXG5cdFJPTEVfSElUTEVSOiA0LFxuXHRQQVJUWV9MSUJFUkFMOiA1LFxuXHRQQVJUWV9GQVNDSVNUOiA2LFxuXHRKQTogNyxcblx0TkVJTjogOCxcblx0QkxBTks6IDksXG5cdENSRURJVFM6IDEwXG59KTtcblxuZnVuY3Rpb24gZGltc1RvVVYoe3NpZGUsIGxlZnQsIHJpZ2h0LCB0b3AsIGJvdHRvbX0pXG57XG5cdGlmKHNpZGUpXG5cdFx0cmV0dXJuIFtbXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMih0b3AsIGxlZnQpLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIoYm90dG9tLCBsZWZ0KSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHRvcCwgcmlnaHQpXG5cdFx0XSxbXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIGxlZnQpLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIoYm90dG9tLCByaWdodCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMih0b3AsIHJpZ2h0KVxuXHRcdF1dO1xuXHRlbHNlXG5cdFx0cmV0dXJuIFtbXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihsZWZ0LCB0b3ApLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIobGVmdCwgYm90dG9tKSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCB0b3ApXG5cdFx0XSxbXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihsZWZ0LCBib3R0b20pLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIocmlnaHQsIGJvdHRvbSksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihyaWdodCwgdG9wKVxuXHRcdF1dO1xufVxuXG5mdW5jdGlvbiBnZXRVVnModHlwZSlcbntcblx0bGV0IGRpbXMgPSB7bGVmdDogMCwgcmlnaHQ6IDEsIGJvdHRvbTogMCwgdG9wOiAxfTtcblxuXHRzd2l0Y2godHlwZSlcblx0e1xuXHRjYXNlIFR5cGVzLlBPTElDWV9MSUJFUkFMOlxuXHRcdGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC44MzQsIHJpZ2h0OiAwLjk5NiwgdG9wOiAwLjc1NCwgYm90dG9tOiAwLjk5N307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUE9MSUNZX0ZBU0NJU1Q6XG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjY2LCByaWdodDogMC44MjIsIHRvcDogMC43NTQsIGJvdHRvbTogMC45OTZ9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLlJPTEVfTElCRVJBTDpcblx0XHRkaW1zID0ge2xlZnQ6IDAuNTA1LCByaWdodDogMC43NDYsIHRvcDogMC45OTYsIGJvdHRvbTogMC42NX07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUk9MRV9GQVNDSVNUOlxuXHRcdGRpbXMgPSB7bGVmdDogMC41MDUsIHJpZ2h0OiAwLjc0NiwgdG9wOiAwLjY0NSwgYm90dG9tOiAwLjN9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLlJPTEVfSElUTEVSOlxuXHRcdGRpbXMgPSB7bGVmdDogMC43NTQsIHJpZ2h0OiAwLjk5NiwgdG9wOiAwLjY0NSwgYm90dG9tOiAwLjN9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLlBBUlRZX0xJQkVSQUw6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjI1NSwgcmlnaHQ6IDAuNDk1LCB0b3A6IDAuOTk2LCBib3R0b206IDAuNjV9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLlBBUlRZX0ZBU0NJU1Q6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjI1NSwgcmlnaHQ6IDAuNDk1LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuSkE6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjAwNSwgcmlnaHQ6IDAuMjQ0LCB0b3A6IDAuOTkyLCBib3R0b206IDAuNjUzfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5ORUlOOlxuXHRcdGRpbXMgPSB7bGVmdDogMC4wMDYsIHJpZ2h0OiAwLjI0MywgdG9wOiAwLjY0MiwgYm90dG9tOiAwLjMwMn07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuQ1JFRElUUzpcblx0XHRkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuMDE1LCByaWdodDogMC4yNzYsIHRvcDogMC4zOTcsIGJvdHRvbTogMC43NjV9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLkJMQU5LOlxuXHRkZWZhdWx0OlxuXHRcdGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC4wMjIsIHJpZ2h0OiAuMDIyKzAuMjQ3LCB0b3A6IDAuMDIxLCBib3R0b206IC4wMjErMC4zNTQzfTtcblx0XHRicmVhaztcblx0fVxuXG5cdHJldHVybiBkaW1zVG9VVihkaW1zKTtcbn1cblxuXG5jbGFzcyBDYXJkIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IodHlwZSA9IFR5cGVzLkJMQU5LLCBkb3VibGVTaWRlZCA9IHRydWUsIHNlY3JldCA9IGZhbHNlKVxuXHR7XG5cdFx0c3VwZXIoKTtcblxuXHRcdC8vIGNyZWF0ZSB0aGUgY2FyZCBmYWNlc1xuXHRcdGxldCBjYXJkR2VvID0gbmV3IFRIUkVFLlBsYW5lR2VvbWV0cnkoLjcxNSwgMSk7XG5cdFx0bGV0IGZyb250ID0gbmV3IFRIUkVFLk1lc2goY2FyZEdlbyxcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KVxuXHRcdCk7XG5cdFx0bGV0IGJhY2sgPSBuZXcgVEhSRUUuTWVzaChjYXJkR2VvLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IEFzc2V0TWFuYWdlci5jYWNoZS50ZXh0dXJlcy5jYXJkc30pXG5cdFx0KTtcblx0XHRiYWNrLnBvc2l0aW9uLnNldCgwLjAwMSwgMCwgMCk7XG5cdFx0ZnJvbnQucG9zaXRpb24uc2V0KC0wLjAwMSwgMCwgMCk7XG5cdFx0YmFjay5yb3RhdGVZKE1hdGguUEkpO1xuXG5cdFx0Ly8gc2V0IHRoZSBmYWNlcyB0byB0aGUgY29ycmVjdCBwYXJ0IG9mIHRoZSB0ZXh0dXJlXG5cdFx0ZnJvbnQuZ2VvbWV0cnkuZmFjZVZlcnRleFV2cyA9IFtnZXRVVnModHlwZSldO1xuXHRcdGJhY2suZ2VvbWV0cnkuZmFjZVZlcnRleFV2cyA9IFtnZXRVVnMoIGRvdWJsZVNpZGVkID8gdHlwZSA6IFR5cGVzLkJMQU5LICldO1xuXHRcdHRoaXMuc2NhbGUuc2V0U2NhbGFyKDAuNyk7XG5cdFx0dGhpcy5hZGQoZnJvbnQsIGJhY2spO1xuXHR9XG5cbn1cblxuY2xhc3MgQmxhbmtDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7IHN1cGVyKCk7IH1cbn1cblxuY2xhc3MgQ3JlZGl0c0NhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5DUkVESVRTKTtcblx0XHRsZXQgc2VsZiA9IHRoaXM7XG5cblx0XHRmdW5jdGlvbiBzZXRWaXNpYmlsaXR5KHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KXtcblx0XHRcdGlmKHN0YXRlID09PSAnc2V0dXAnKVxuXHRcdFx0XHRzZWxmLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IHRydWU7IH0pO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRzZWxmLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IGZhbHNlOyB9KTtcblx0XHR9XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBzZXRWaXNpYmlsaXR5KTtcblx0fVxufVxuXG5jbGFzcyBMaWJlcmFsUG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3RvcihzZWNyZXQgPSBmYWxzZSl7XG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0xJQkVSQUwsIGZhbHNlLCBzZWNyZXQpO1xuXHR9XG5cdGdvVG9Qb3NpdGlvbihzcG90ID0gMClcblx0e1xuXHRcdHNwb3QgPSBNYXRoLm1heCgwLCBNYXRoLm1pbig0LCBzcG90KSk7XG5cdFx0bGV0IHMgPSBMaWJlcmFsUG9saWN5Q2FyZC5zcG90cztcblx0XHRBbmltYXRlLnN0YXJ0KHRoaXMsIHtwYXJlbnQ6IEFzc2V0TWFuYWdlci5yb290LCBwb3M6IHNbJ3Bvc18nK3Nwb3RdLCBxdWF0OiBzLnF1YXQsIHNjYWxlOiBzLnNjYWxlfSk7XG5cdH1cbn1cblxuTGliZXJhbFBvbGljeUNhcmQuc3BvdHMgPSB7XG5cdHBvc18wOiBuZXcgVEhSRUUuVmVjdG9yMygwLjUzMywgMC43NiwgLTAuMzM2KSxcblx0cG9zXzE6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMjYzLCAwLjc2LCAtMC4zMzYpLFxuXHRwb3NfMjogbmV3IFRIUkVFLlZlY3RvcjMoLS4wMDcsIDAuNzYsIC0wLjMzNiksXG5cdHBvc18zOiBuZXcgVEhSRUUuVmVjdG9yMygtLjI3OSwgMC43NiwgLTAuMzM2KSxcblx0cG9zXzQ6IG5ldyBUSFJFRS5WZWN0b3IzKC0uNTUyLCAwLjc2LCAtMC4zMzYpLFxuXHRxdWF0OiBuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAwLjcwNzEwNjc4MTE4NjU0NzUsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMCksXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjcsIDAuNywgMC43KVxufVxuXG5jbGFzcyBGYXNjaXN0UG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3RvcihzZWNyZXQgPSBmYWxzZSl7XG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0ZBU0NJU1QsIGZhbHNlLCBzZWNyZXQpO1xuXHR9XG5cdGdvVG9Qb3NpdGlvbihzcG90ID0gMClcblx0e1xuXHRcdHNwb3QgPSBNYXRoLm1heCgwLCBNYXRoLm1pbig1LCBzcG90KSk7XG5cdFx0bGV0IHMgPSBGYXNjaXN0UG9saWN5Q2FyZC5zcG90cztcblx0XHRBbmltYXRlLnN0YXJ0KHRoaXMsIHtwYXJlbnQ6IEFzc2V0TWFuYWdlci5yb290LCBwb3M6IHNbJ3Bvc18nK3Nwb3RdLCBxdWF0OiBzLnF1YXQsIHNjYWxlOiBzLnNjYWxlfSk7XG5cdH1cbn1cblxuRmFzY2lzdFBvbGljeUNhcmQuc3BvdHMgPSB7XG5cdHBvc18wOiBuZXcgVEhSRUUuVmVjdG9yMygtLjY4NywgMC43NiwgMC4zNDEpLFxuXHRwb3NfMTogbmV3IFRIUkVFLlZlY3RvcjMoLS40MTcsIDAuNzYsIDAuMzQxKSxcblx0cG9zXzI6IG5ldyBUSFJFRS5WZWN0b3IzKC0uMTQ2LCAwLjc2LCAwLjM0MSksXG5cdHBvc18zOiBuZXcgVEhSRUUuVmVjdG9yMygwLjEyNywgMC43NiwgMC4zNDEpLFxuXHRwb3NfNDogbmV3IFRIUkVFLlZlY3RvcjMoMC40MDAsIDAuNzYsIDAuMzQxKSxcblx0cG9zXzU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNjczLCAwLjc2LCAwLjM0MSksXG5cdHF1YXQ6IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKC0wLjcwNzEwNjc4MTE4NjU0NzUsIDAsIDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSksXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjcsIDAuNywgMC43KVxufVxuXG5jbGFzcyBMaWJlcmFsUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3Ioc2VjcmV0ID0gZmFsc2Upe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfTElCRVJBTCwgZmFsc2UsIHNlY3JldCk7XG5cdH1cbn1cblxuY2xhc3MgRmFzY2lzdFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcblx0XHRzdXBlcihUeXBlcy5ST0xFX0ZBU0NJU1QsIGZhbHNlLCBzZWNyZXQpO1xuXHR9XG59XG5cbmNsYXNzIEhpdGxlclJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcblx0XHRzdXBlcihUeXBlcy5ST0xFX0hJVExFUiwgZmFsc2UsIHNlY3JldCk7XG5cdH1cbn1cblxuY2xhc3MgTGliZXJhbFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3RvcihzZWNyZXQgPSBmYWxzZSl7XG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfTElCRVJBTCwgZmFsc2UsIHNlY3JldCk7XG5cdH1cbn1cblxuY2xhc3MgRmFzY2lzdFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3RvcihzZWNyZXQgPSBmYWxzZSl7XG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfRkFTQ0lTVCwgZmFsc2UsIHNlY3JldCk7XG5cdH1cbn1cblxuY2xhc3MgSmFDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuSkEsIGZhbHNlLCBmYWxzZSk7XG5cdFx0dGhpcy5jaGlsZHJlblswXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xuXHRcdHRoaXMuY2hpbGRyZW5bMV0ucm90YXRlWigtTWF0aC5QSS8yKTtcblx0fVxufVxuXG5jbGFzcyBOZWluQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLk5FSU4sIGZhbHNlLCBmYWxzZSk7XG5cdFx0dGhpcy5jaGlsZHJlblswXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xuXHRcdHRoaXMuY2hpbGRyZW5bMV0ucm90YXRlWigtTWF0aC5QSS8yKTtcblx0fVxufVxuXG5cbmV4cG9ydCB7XG5cdENhcmQsIFR5cGVzLCBCbGFua0NhcmQsIENyZWRpdHNDYXJkLFxuXHRMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFJvbGVDYXJkLFxuXHRIaXRsZXJSb2xlQ2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZFxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbmNsYXNzIFByZXNpZGVudEhhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnRvcGhhdDtcblx0XHR0aGlzLm1vZGVsLnBvc2l0aW9uLnNldCgwLDAsMCk7XG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoKGUpID0+IHtcblx0XHRcdGlmKGUuZGF0YS5nYW1lLnN0YXRlID09PSAnc2V0dXAnKSB0aGlzLmlkbGUoKTtcblx0XHR9KS5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdGlkbGUoKXtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLjc1LCAwLCAwKTtcblx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCBNYXRoLlBJLzIsIDApO1xuXHRcdFNILmlkbGVSb290LmFkZCh0aGlzKTtcblx0fVxufTtcblxuY2xhc3MgQ2hhbmNlbGxvckhhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnZpc29yY2FwO1xuXHRcdHRoaXMubW9kZWwucG9zaXRpb24uc2V0KDAsMC4wNCwwKTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCAwKTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICgoZSkgPT4ge1xuXHRcdFx0aWYoZS5kYXRhLmdhbWUuc3RhdGUgPT09ICdzZXR1cCcpIHRoaXMuaWRsZSgpO1xuXHRcdH0pLmJpbmQodGhpcykpO1xuXHR9XG5cblx0aWRsZSgpe1xuXHRcdHRoaXMucG9zaXRpb24uc2V0KC0wLjc1LCAwLCAwKTtcblx0XHR0aGlzLnJvdGF0aW9uLnNldCgwLCAtTWF0aC5QSS8yLCAwKTtcblx0XHRTSC5pZGxlUm9vdC5hZGQodGhpcyk7XG5cdH1cbn07XG5cbmV4cG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHYW1lVGFibGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0Ly8gc2F2ZSByZWZlcmVuY2VzIHRvIHRoZSB0ZXh0dXJlc1xuXHRcdHRoaXMudGV4dHVyZXMgPSBbXG5cdFx0XHRBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9zbWFsbCxcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX21lZCxcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX2xhcmdlXG5cdFx0XTtcblxuXHRcdC8vIGFkZCB0YWJsZSBhc3NldFxuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMudGFibGUuY2hpbGRyZW5bMF07XG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHQvLyBzZXQgdGhlIGRlZmF1bHQgbWF0ZXJpYWxcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcCA9IHRoaXMudGV4dHVyZXNbMF07XG5cblx0XHQvLyBwb3NpdGlvbiB0YWJsZVxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDEuMCwgMCk7XG5cdH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbmZ1bmN0aW9uIGdldEdhbWVJZCgpXG57XG5cdC8vIGZpcnN0IGNoZWNrIHRoZSB1cmxcblx0bGV0IHJlID0gL1s/Jl1nYW1lSWQ9KFteJl0rKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcblx0aWYocmUpe1xuXHRcdHJldHVybiByZVsxXTtcblx0fVxuXHRlbHNlIGlmKGFsdHNwYWNlICYmIGFsdHNwYWNlLmluQ2xpZW50KXtcblx0XHRyZXR1cm4gU0guZW52LnNpZDtcblx0fVxuXHRlbHNlIHtcblx0XHRsZXQgaWQgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogMTAwMDAwMDAwICk7XG5cdFx0d2luZG93LmxvY2F0aW9uLnJlcGxhY2UoJz9nYW1lSWQ9JytpZCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gcGFyc2VDU1Yoc3RyKXtcblx0aWYoIXN0cikgcmV0dXJuIFtdO1xuXHRlbHNlIHJldHVybiBzdHIuc3BsaXQoJywnKTtcbn1cbmV4cG9ydCB7IGdldEdhbWVJZCwgcGFyc2VDU1YgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgeyBwYXJzZUNTViB9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBOYW1lcGxhdGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcihzZWF0TnVtKVxuXHR7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc2VhdE51bSA9IHNlYXROdW07XG5cdFx0dGhpcy5vd25lciA9IDA7IC8vIHVzZXJJZFxuXG5cdFx0Ly8gYWRkIDNkIG1vZGVsXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy5uYW1lcGxhdGUuY2hpbGRyZW5bMF0uY2xvbmUoKTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCAwKTtcblx0XHR0aGlzLm1vZGVsLnNjYWxlLnNldFNjYWxhcigxLjI1KTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblxuXHRcdC8vIGdlbmVyYXRlIG1hdGVyaWFsXG5cdFx0dGhpcy5ibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHR0aGlzLmJtcC53aWR0aCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZTtcblx0XHR0aGlzLmJtcC5oZWlnaHQgPSBOYW1lcGxhdGUudGV4dHVyZVNpemUgLyAyO1xuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuXHRcdFx0bWFwOiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZSh0aGlzLmJtcClcblx0XHR9KTtcblxuXHRcdC8vIHBsYWNlIHBsYWNhcmRcblx0XHRsZXQgeCwgeSA9IDAuMDE4LCB6O1xuXHRcdHN3aXRjaChzZWF0TnVtKXtcblx0XHRjYXNlIDA6IGNhc2UgMTogY2FzZSAyOlxuXHRcdFx0dGhpcy5tb2RlbC5yb3RhdGVaKE1hdGguUEkvMik7XG5cdFx0XHR4ID0gLTAuODMzICsgMC44MzMqc2VhdE51bTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIC0wLjgzKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgMzogY2FzZSA0OlxuXHRcdFx0eiA9IC0wLjQzNyArIDAuODc0KihzZWF0TnVtLTMpO1xuXHRcdFx0dGhpcy5wb3NpdGlvbi5zZXQoMS4yMSwgeSwgeik7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIDU6IGNhc2UgNjogY2FzZSA3OlxuXHRcdFx0dGhpcy5tb2RlbC5yb3RhdGVaKE1hdGguUEkvMik7XG5cdFx0XHR4ID0gMC44MzMgLSAwLjgzMyooc2VhdE51bS01KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KHgsIHksIDAuODMpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSA4OiBjYXNlIDk6XG5cdFx0XHR6ID0gMC40MzcgLSAwLjg3NCooc2VhdE51bS04KTtcblx0XHRcdHRoaXMucG9zaXRpb24uc2V0KC0xLjIxLCB5LCB6KTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdC8vIGNyZWF0ZSBsaXN0ZW5lciBwcm94aWVzXG5cdFx0dGhpcy5faG92ZXJCZWhhdmlvciA9IG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLkhvdmVyQ29sb3Ioe1xuXHRcdFx0Y29sb3I6IG5ldyBUSFJFRS5Db2xvcigweGZmYThhOClcblx0XHR9KTtcblx0XHR0aGlzLm1vZGVsLmFkZEJlaGF2aW9yKHRoaXMuX2hvdmVyQmVoYXZpb3IpO1xuXHRcdHRoaXMubW9kZWwuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLmNsaWNrLmJpbmQodGhpcykpO1xuXG5cdFx0Ly8gaG9vayB1cCBsaXN0ZW5lcnNcblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy51cGRhdGVPd25lcnNoaXAuYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVUZXh0KHRleHQpXG5cdHtcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcblxuXHRcdC8vIHNldCB1cCBjYW52YXNcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdFx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xuXHRcdGcuZmlsbFN0eWxlID0gJyMyMjInO1xuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XG5cdFx0Zy5mb250ID0gYGJvbGQgJHtmb250U2l6ZX1weCAke2ZvbnRTdGFja31gO1xuXHRcdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGcuZmlsbFRleHQodGV4dCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLzIsICgwLjQyIC0gMC4xMikqKE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yKSk7XG5cblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdH1cblxuXHR1cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXG5cdHtcblx0XHRsZXQgaWRzID0gcGFyc2VDU1YoZ2FtZS50dXJuT3JkZXIpO1xuXHRcdFxuXHRcdGlmKCAhdGhpcy5vd25lciApXG5cdFx0e1xuXHRcdFx0Ly8gY2hlY2sgaWYgYSBwbGF5ZXIgaGFzIGpvaW5lZCBhdCB0aGlzIHNlYXRcblx0XHRcdGZvcihsZXQgaSBpbiBpZHMpe1xuXHRcdFx0XHRpZihwbGF5ZXJzW2lkc1tpXV0uc2VhdE51bSA9PSB0aGlzLnNlYXROdW0pe1xuXHRcdFx0XHRcdHRoaXMub3duZXIgPSBpZHNbaV07XG5cdFx0XHRcdFx0dGhpcy51cGRhdGVUZXh0KHBsYXllcnNbaWRzW2ldXS5kaXNwbGF5TmFtZSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYoICFpZHMuaW5jbHVkZXModGhpcy5vd25lcikgKVxuXHRcdHtcblx0XHRcdHRoaXMub3duZXIgPSAwO1xuXHRcdFx0aWYoZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHRcdHRoaXMudXBkYXRlVGV4dCgnPEpvaW4+Jyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Y2xpY2soZSlcblx0e1xuXHRcdGlmKCF0aGlzLm93bmVyICYmIFNILmdhbWUuc3RhdGUgPT09ICdzZXR1cCcpXG5cdFx0XHR0aGlzLnJlcXVlc3RKb2luKCk7XG5cdH1cblxuXHRyZXF1ZXN0Sm9pbigpXG5cdHtcblx0XHRjb25zb2xlLmxvZygnUmVxdWVzdGluZyB0byBqb2luIGF0IHNlYXQnLCB0aGlzLnNlYXROdW0pO1xuXHRcdFNILnNvY2tldC5lbWl0KCdyZXF1ZXN0Sm9pbicsIE9iamVjdC5hc3NpZ24oe3NlYXROdW06IHRoaXMuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpO1xuXHR9XG5cblxufVxuXG5OYW1lcGxhdGUudGV4dHVyZVNpemUgPSA1MTI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCAqIGFzIENhcmRzIGZyb20gJy4vY2FyZCc7XG5pbXBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfSBmcm9tICcuL2hhdHMnO1xuaW1wb3J0IEdhbWVUYWJsZSBmcm9tICcuL3RhYmxlJztcbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IHsgZ2V0R2FtZUlkIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgTmFtZXBsYXRlIGZyb20gJy4vbmFtZXBsYXRlJztcblxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmFzc2V0cyA9IEFzc2V0TWFuYWdlci5tYW5pZmVzdDtcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcblx0XHR0aGlzLm5lZWRzU2tlbGV0b24gPSB0cnVlO1xuXG5cdFx0Ly8gcG9seWZpbGwgZ2V0VXNlciBmdW5jdGlvblxuXHRcdGlmKCFhbHRzcGFjZS5pbkNsaWVudCl7XG5cdFx0XHRhbHRzcGFjZS5nZXRVc2VyID0gKCkgPT4ge1xuXHRcdFx0XHRsZXQgaWQsIHJlID0gL1s/Jl11c2VySWQ9KFxcZCspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRcdFx0XHRpZihyZSlcblx0XHRcdFx0XHRpZCA9IHJlWzFdO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0aWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCk7XG5cblx0XHRcdFx0YWx0c3BhY2UuX2xvY2FsVXNlciA9IHtcblx0XHRcdFx0XHR1c2VySWQ6IGlkLFxuXHRcdFx0XHRcdGRpc3BsYXlOYW1lOiAnR3Vlc3QnK2lkLFxuXHRcdFx0XHRcdGlzTW9kZXJhdG9yOiBmYWxzZVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRjb25zb2xlLmxvZygnTWFzcXVlcmFkaW5nIGFzJywgYWx0c3BhY2UuX2xvY2FsVXNlcik7XG5cdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoYWx0c3BhY2UuX2xvY2FsVXNlcik7XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIGdldCBsb2NhbCB1c2VyXG5cdFx0YWx0c3BhY2UuZ2V0VXNlcigpLnRoZW4oKHVzZXIgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcblx0XHRcdFx0aWQ6IHVzZXIudXNlcklkLnRvU3RyaW5nKCksXG5cdFx0XHRcdGRpc3BsYXlOYW1lOiB1c2VyLmRpc3BsYXlOYW1lLFxuXHRcdFx0XHRpc01vZGVyYXRvcjogdXNlci5pc01vZGVyYXRvclxuXHRcdFx0fTtcblx0XHR9KS5iaW5kKHRoaXMpKTtcblxuXHRcdHRoaXMuZ2FtZSA9IHt9O1xuXHRcdHRoaXMucGxheWVycyA9IHt9O1xuXHRcdHRoaXMudm90ZXMgPSB7fTtcblx0fVxuXG5cdGluaXRpYWxpemUoZW52LCByb290LCBhc3NldHMpXG5cdHtcblx0XHQvLyBzaGFyZSB0aGUgZGlvcmFtYSBpbmZvXG5cdFx0QXNzZXRNYW5hZ2VyLmNhY2hlID0gYXNzZXRzO1xuXHRcdHRoaXMuZW52ID0gZW52O1xuXG5cdFx0Ly8gY29ubmVjdCB0byBzZXJ2ZXJcblx0XHR0aGlzLnNvY2tldCA9IGlvLmNvbm5lY3QoJy8nLCB7cXVlcnk6ICdnYW1lSWQ9JytnZXRHYW1lSWQoKX0pO1xuXG5cdFx0Ly8gY3JlYXRlIHRoZSB0YWJsZVxuXHRcdHRoaXMudGFibGUgPSBuZXcgR2FtZVRhYmxlKCk7XG5cdFx0dGhpcy5hZGQodGhpcy50YWJsZSk7XG5cblx0XHR0aGlzLnJlc2V0QnV0dG9uID0gbmV3IFRIUkVFLk1lc2goXG5cdFx0XHRuZXcgVEhSRUUuQm94R2VvbWV0cnkoLjI1LC4yNSwuMjUpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IGFzc2V0cy50ZXh0dXJlcy5yZXNldH0pXG5cdFx0KTtcblx0XHR0aGlzLnJlc2V0QnV0dG9uLnBvc2l0aW9uLnNldCgwLCAtMC4xOCwgMCk7XG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMucmVzZXQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy50YWJsZS5hZGQodGhpcy5yZXNldEJ1dHRvbik7XG5cblx0XHQvLyBjcmVhdGUgaWRsZSBkaXNwbGF5XG5cdFx0dGhpcy5pZGxlUm9vdCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuXHRcdHRoaXMuaWRsZVJvb3QucG9zaXRpb24uc2V0KDAsIDEuODUsIDApO1xuXHRcdHRoaXMuaWRsZVJvb3QuYWRkQmVoYXZpb3IobmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuU3Bpbih7c3BlZWQ6IDAuMDAwMn0pKTtcblx0XHR0aGlzLmFkZCh0aGlzLmlkbGVSb290KTtcblxuXHRcdC8vIGNyZWF0ZSBpZGxlIHNsaWRlc2hvd1xuXHRcdGxldCBjcmVkaXRzID0gbmV3IENhcmRzLkNyZWRpdHNDYXJkKCk7XG5cdFx0dGhpcy5pZGxlUm9vdC5hZGQoY3JlZGl0cyk7XG5cblx0XHQvLyBjcmVhdGUgaGF0c1xuXHRcdHRoaXMucHJlc2lkZW50SGF0ID0gbmV3IFByZXNpZGVudEhhdCgpO1xuXHRcdHRoaXMuY2hhbmNlbGxvckhhdCA9IG5ldyBDaGFuY2VsbG9ySGF0KCk7XG5cblx0XHQvLyBjcmVhdGUgcG9zaXRpb25zXG5cdFx0dGhpcy5zZWF0cyA9IFtdO1xuXHRcdGZvcihsZXQgaT0wOyBpPDEwOyBpKyspe1xuXHRcdFx0bGV0IHNlYXQgPSBuZXcgTmFtZXBsYXRlKGkpO1xuXHRcdFx0dGhpcy5zZWF0cy5wdXNoKHNlYXQpO1xuXHRcdH1cblx0XHR0aGlzLnRhYmxlLmFkZCguLi50aGlzLnNlYXRzKTtcblxuXHRcdC8vIGFkZCBhdmF0YXIgZm9yIHNjYWxlXG5cdFx0YXNzZXRzLm1vZGVscy5kdW1teS5wb3NpdGlvbi5zZXQoMCwgMCwgMS4yKTtcblx0XHRhc3NldHMubW9kZWxzLmR1bW15LnJvdGF0ZVooTWF0aC5QSSk7XG5cdFx0dGhpcy5hZGQoYXNzZXRzLm1vZGVscy5kdW1teSk7XG5cblx0XHR0aGlzLnNvY2tldC5vbigndXBkYXRlJywgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xuXHR9XG5cblx0dXBkYXRlRnJvbVNlcnZlcihnYW1lLCBwbGF5ZXJzKVxuXHR7XG5cdFx0Y29uc29sZS5sb2coZ2FtZSwgcGxheWVycyk7XG5cblx0XHRsZXQgbmV3R2FtZUluZm8gPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdhbWUsIGdhbWUpO1xuXHRcdGxldCBuZXdQbGF5ZXJJbmZvID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5wbGF5ZXJzLCBwbGF5ZXJzKTtcblx0XHQvL2xldCBuZXdWb3RlSW5mbyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMudm90ZXMsIHZvdGVzKTtcblxuXHRcdGxldCBuZWVkUGxheWVySW5mbyA9IFsndHVybk9yZGVyJywncGVuZGluZ0pvaW5SZXF1ZXN0J107XG5cdFx0Zm9yKGxldCBmaWVsZCBpbiBnYW1lKVxuXHRcdHtcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHRcdHR5cGU6ICd1cGRhdGVfJytmaWVsZCxcblx0XHRcdFx0YnViYmxlczogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRnYW1lOiBuZXdHYW1lSW5mbyxcblx0XHRcdFx0XHRwbGF5ZXJzOiBuZWVkUGxheWVySW5mby5pbmNsdWRlcyhmaWVsZCkgPyBuZXdQbGF5ZXJJbmZvIDogdW5kZWZpbmVkXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHRoaXMuZ2FtZSA9IG5ld0dhbWVJbmZvO1xuXHRcdHRoaXMucGxheWVycyA9IG5ld1BsYXllckluZm87XG5cdH1cblxuXHRyZXNldCgpe1xuXHRcdHRoaXMuc29ja2V0LmVtaXQoJ3Jlc2V0Jyk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgbmV3IFNlY3JldEhpdGxlcigpO1xuIl0sIm5hbWVzIjpbInRoaXMiLCJzdXBlciIsImxldCIsIkFzc2V0TWFuYWdlciIsIkNhcmRzLkNyZWRpdHNDYXJkIl0sIm1hcHBpbmdzIjoiOzs7QUFFQSxTQUFlO0NBQ2QsUUFBUSxFQUFFO0VBQ1QsTUFBTSxFQUFFO0dBQ1AsS0FBSyxFQUFFLHdCQUF3QjtHQUMvQixTQUFTLEVBQUUsNEJBQTRCO0dBQ3ZDLE1BQU0sRUFBRSwwQkFBMEI7R0FDbEMsUUFBUSxFQUFFLDZCQUE2QjtHQUN2QyxLQUFLLEVBQUUseUJBQXlCO0dBQ2hDO0VBQ0QsUUFBUSxFQUFFO0dBQ1QsV0FBVyxFQUFFLGtDQUFrQztHQUMvQyxTQUFTLEVBQUUsbUNBQW1DO0dBQzlDLFdBQVcsRUFBRSxrQ0FBa0M7R0FDL0MsS0FBSyxFQUFFLHNCQUFzQjtHQUM3QixLQUFLLEVBQUUscUJBQXFCO0dBQzVCO0VBQ0Q7Q0FDRCxLQUFLLEVBQUUsRUFBRTtDQUNULENBQUE7O0FDbEJELElBQU0sU0FBUyxHQUNmLGtCQUNZLENBQUMsRUFBRTtBQUNmO0NBQ0MsSUFBSyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7O0NBRWQsSUFBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7O0NBRXJCLElBQUssQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO0NBQ3JCLElBQUssQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO0NBQ3BCLElBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO0NBQ3JCLElBQUssQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO0NBQ3hCLElBQUssQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDOztDQUV6QixJQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQztDQUMxQixJQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQztDQUMxQixJQUFLLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztDQUN2QixJQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztDQUN0QixJQUFLLENB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RUFFQ0EsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7RUFDdERBLElBQUksSUFBSSxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsVUFBQSxDQUFDLEVBQUMsU0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUEsQ0FBQztFQUM3RCxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzs7RUFHOUIsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO0dBQ2IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztHQUNuRTs7O0VBR0QsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO0dBQ2QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0dBQ2xGOzs7RUFHRCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7R0FDZixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0dBQ3BFOzs7RUFHRCxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7R0FDWCxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUNuQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7R0FDbEM7RUFDRCxDQUFBOzs7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RUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDekUsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLFlBQVk7RUFDdEIsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0VBQzdELE1BQU07Q0FDUCxLQUFLLEtBQUssQ0FBQyxZQUFZO0VBQ3RCLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztFQUM1RCxNQUFNO0NBQ1AsS0FBSyxLQUFLLENBQUMsV0FBVztFQUNyQixJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDNUQsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLGFBQWE7RUFDdkIsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0VBQzdELE1BQU07Q0FDUCxLQUFLLEtBQUssQ0FBQyxhQUFhO0VBQ3ZCLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztFQUM1RCxNQUFNO0NBQ1AsS0FBSyxLQUFLLENBQUMsRUFBRTtFQUNaLElBQUksR0FBRyxDQUFDLElBQUksRUFB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
