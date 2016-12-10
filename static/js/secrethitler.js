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
	g.fillStyle = 'rgba(0,0,0,0)';
	g.fillRect(0, 0, 512, 256);
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
		console.log('Requesting to join at seat', this.seat.seatNum);
		SH.socket.emit('requestJoin', Object.assign({seatNum: this.seat.seatNum}, SH.localUser));
	};

	Nameplate.prototype.requestLeave = function requestLeave ()
	{
		var self = this;
		if(!self.question)
		{
			console.log('Prompting user to confirm leave action');
			self.question = self.seat.ballot.askQuestion('Are you sure you\nwant to leave?', 'local')
			.then(function (confirm) {
				if(confirm){
					SH.socket.emit('leave', SH.localUser.id);
				}
				self.question = null;
			});
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
        this.questions = [];

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
        vips.forEach(function (vId) {
            var asked = !!self.questions.find(function (e) { return e.voteId == vId; });
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
    };

    Ballot.prototype.askQuestion = function askQuestion (qText, id)
    {
        var this$1 = this;

        var self = this;

        var newQ = new Promise(function (resolve, reject) {
            // check for previous questions
            var prereq;
            if(self.questions.length > 0){
                // only run when earlier questions are answered
                prereq = self.questions[self.questions.length-1];
            }
            else {
                prereq = Promise.resolve();
            }

            prereq.then(function () {

                // make sure the answer is still relevant
                var latestVotes = parseCSV(SH.game.votesInProgress);
                if(!latestVotes.includes(id)){
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

                        // hide the question and return the answer
                        self.jaCard.hide();
                        self.neinCard.hide();
                        self.question.visible = false;
                        self.jaCard.removeEventListener('cursorup', handler);
                        self.neinCard.removeEventListener('cursorup', handler);

                        // make sure the answer still matters
                        var latestVotes = parseCSV(SH.game.votesInProgress);
                        if(!latestVotes.includes(id))
                            { reject(); }
                        else
                            { resolve(answer); }
                    }

                    return handler;
                }
            });
        });

        // add question to queue, remove when done
        self.questions.push(newQ);
        newQ.voteId = id;
        var splice = function () { return self.questions.splice( self.questions.indexOf(newQ), 1 ); };
        newQ.then(splice).catch(splice);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvYXNzZXRtYW5hZ2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9nYW1lb2JqZWN0cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVybWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L3V0aWxzLmpzIiwiLi4vLi4vc3JjL2NsaWVudC90YWJsZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3QuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlYXQuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlY3JldGhpdGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0bWFuaWZlc3Q6IHtcblx0XHRtb2RlbHM6IHtcblx0XHRcdHRhYmxlOiAnc3RhdGljL21vZGVsL3RhYmxlLmRhZScsXG5cdFx0XHRuYW1lcGxhdGU6ICdzdGF0aWMvbW9kZWwvbmFtZXBsYXRlLmRhZScsXG5cdFx0XHR0b3BoYXQ6ICdzdGF0aWMvbW9kZWwvdG9waGF0LmdsdGYnLFxuXHRcdFx0dmlzb3JjYXA6ICdzdGF0aWMvbW9kZWwvdmlzb3JfY2FwLmdsdGYnLFxuXHRcdFx0ZHVtbXk6ICdzdGF0aWMvbW9kZWwvZHVtbXkuZ2x0Zidcblx0XHR9LFxuXHRcdHRleHR1cmVzOiB7XG5cdFx0XHRib2FyZF9sYXJnZTogJ3N0YXRpYy9pbWcvYm9hcmQtbGFyZ2UtYmFrZWQucG5nJyxcblx0XHRcdGJvYXJkX21lZDogJ3N0YXRpYy9pbWcvYm9hcmQtbWVkaXVtLWJha2VkLnBuZycsXG5cdFx0XHRib2FyZF9zbWFsbDogJ3N0YXRpYy9pbWcvYm9hcmQtc21hbGwtYmFrZWQucG5nJyxcblx0XHRcdGNhcmRzOiAnc3RhdGljL2ltZy9jYXJkcy5wbmcnLFxuXHRcdFx0cmVzZXQ6ICdzdGF0aWMvaW1nL2JvbWIucG5nJ1xuXHRcdH1cblx0fSxcblx0Y2FjaGU6IHt9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmNsYXNzIEdhbWVTdGF0ZVxue1xuXHRjb25zdHJ1Y3RvcihpZClcblx0e1xuXHRcdHRoaXMuaWQgPSBpZDtcblxuXHRcdHRoaXMuc3RhdGUgPSAnaWRsZSc7XG5cblx0XHR0aGlzLnR1cm5PcmRlciA9IFtdOyAvLyBhcnJheSBvZiB1c2VySWRzXG5cdFx0dGhpcy5wcmVzaWRlbnQgPSAwOyAvLyB1c2VySWRcblx0XHR0aGlzLmNoYW5jZWxsb3IgPSAwOyAvLyB1c2VySWRcblx0XHR0aGlzLmxhc3RQcmVzaWRlbnQgPSAwOyAvLyB1c2VySWRcblx0XHR0aGlzLmxhc3RDaGFuY2VsbG9yID0gMDsgLy8gdXNlcklkXG5cblx0XHR0aGlzLmxpYmVyYWxQb2xpY2llcyA9IDA7XG5cdFx0dGhpcy5mYXNjaXN0UG9saWNpZXMgPSAwO1xuXHRcdHRoaXMuZGVja0Zhc2Npc3QgPSAxMTtcblx0XHR0aGlzLmRlY2tMaWJlcmFsID0gNjtcblx0XHR0aGlzLmRpc2NhcmRGYXNjaXN0ID0gMDtcblx0XHR0aGlzLmRpc2NhcmRMaWJlcmFsID0gMDtcblx0XHR0aGlzLnNwZWNpYWxFbGVjdGlvbiA9IGZhbHNlO1xuXHRcdHRoaXMuZmFpbGVkVm90ZXMgPSAwO1xuXHR9XG5cblx0bmV4dFByZXNpZGVudCgpXG5cdHtcblx0XHRsZXQgdHVybiA9IDA7XG5cblx0XHQvLyB0aGlzIGlzIHRoZSBmaXJzdCByb3VuZCwgY2hvb3NlIHByZXNpZGVudCByYW5kb21seVxuXHRcdGlmKCF0aGlzLnByZXNpZGVudClcblx0XHRcdHR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGlzLnR1cm5PcmRlci5sZW5ndGgpO1xuXG5cdFx0Ly8gdGhpcyBpcyBhIHNwZWNpYWwgZWxlY3Rpb24sIHNvIGNvdW50IGZyb20gcHJlc2lkZW50IGVtZXJpdHVzXG5cdFx0ZWxzZSBpZih0aGlzLnNwZWNpYWxFbGVjdGlvbilcblx0XHRcdHR1cm4gPSB0aGlzLnBsYXllcnNbdGhpcy5sYXN0UHJlc2lkZW50XS50dXJuT3JkZXI7XG5cblx0XHQvLyBhIHJlZ3VsYXIgZWxlY3Rpb246IHBvd2VyIHBhc3NlcyB0byB0aGUgbGVmdFxuXHRcdGVsc2Vcblx0XHRcdHR1cm4gPSB0aGlzLnBsYXllcnNbdGhpcy5wcmVzaWRlbnRdLnR1cm5PcmRlcjtcblxuXHRcdHJldHVybiB0aGlzLnR1cm5PcmRlclsgKHR1cm4rMSkldGhpcy50dXJuT3JkZXIubGVuZ3RoIF07XG5cdH1cblxuXHRkcmF3UG9saWNpZXMoKVxuXHR7XG5cblx0fVxufVxuXG5jbGFzcyBQbGF5ZXJcbntcblx0Y29uc3RydWN0b3IodXNlcklkID0gMCwgZGlzcGxheU5hbWUgPSAnZHVtbXknLCBpc01vZGVyYXRvciA9IGZhbHNlKVxuXHR7XG5cdFx0dGhpcy51c2VySWQgPSB1c2VySWQ7XG5cdFx0dGhpcy5kaXNwbGF5TmFtZSA9IGRpc3BsYXlOYW1lO1xuXHRcdHRoaXMuaXNNb2RlcmF0b3IgPSBmYWxzZTtcblx0XHR0aGlzLnR1cm5PcmRlciA9IC0xOyAvLyB1bmtub3duIHVudGlsIGdhbWUgc3RhcnRzXG5cblx0XHR0aGlzLnJvbGUgPSAndW5hc3NpZ25lZCc7IC8vIG9uZSBvZiAndW5hc3NpZ25lZCcsICdoaXRsZXInLCAnZmFzY2lzdCcsICdsaWJlcmFsJ1xuXHRcdHRoaXMuc3RhdGUgPSAnbm9ybWFsJzsgLy8gb25lIG9mICdub3JtYWwnLCAnaW52ZXN0aWdhdGVkJywgJ2RlYWQnXG5cdH1cblxuXHRnZXQgcGFydHkoKXtcblx0XHRpZih0aGlzLnJvbGUgPT09ICdoaXRsZXInKSByZXR1cm4gJ2Zhc2Npc3QnO1xuXHRcdGVsc2UgcmV0dXJuIHRoaXMucm9sZTtcblx0fVxufVxuXG5leHBvcnQgeyBHYW1lU3RhdGUsIFBsYXllciB9O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgeyBQbGF5ZXIgfSBmcm9tICcuL2dhbWVvYmplY3RzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxheWVyTWFuYWdlclxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHR0aGlzLmxvY2FsVXNlciA9IG51bGw7XG5cdFx0dGhpcy5wbGF5ZXJzID0gW107XG5cdH1cblxuXHRhY3F1aXJlTG9jYWxVc2VyKClcblx0e1xuXHRcdGlmKHdpbmRvdy5hbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudClcblx0XHR7XG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHt9O1xuXG5cdFx0XHQvLyBnZXQgdGhlIGxvY2FsIHVzZXIgaWQgYW5kIG5hbWVcblx0XHRcdGFsdHNwYWNlLmdldFVzZXIoKS50aGVuKCh1c2VyID0+IHtcblx0XHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLmxvY2FsVXNlciwgdXNlcik7XG5cdFx0XHR9KS5iaW5kKHRoaXMpKTtcblxuXHRcdFx0Ly8gZ2V0IHRoZSB1c2VyIHRyYWNraW5nIHNrZWxldG9uXG5cdFx0XHRhbHRzcGFjZS5nZXRUaHJlZUpTVHJhY2tpbmdTa2VsZXRvbigpLnRoZW4oKHRzID0+IHtcblx0XHRcdFx0dGhpcy5sb2NhbFVzZXIuc2tlbGV0b24gPSB0cztcblx0XHRcdFx0U0guYWRkKHRzKTtcblx0XHRcdH0pLmJpbmQodGhpcykpO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0Ly8gZmFrZSB1c2VyIGRhdGFcblx0XHRcdHRoaXMubG9jYWxVc2VyID0ge1xuXHRcdFx0XHR1c2VySWQ6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDApLFxuXHRcdFx0XHRpc01vZGVyYXRvcjogZmFsc2Vcblx0XHRcdH07XG5cdFx0XHR0aGlzLmxvY2FsVXNlci5kaXNwbGF5TmFtZSA9ICdXZWIgVXNlciAnK3RoaXMubG9jYWxVc2VyLnVzZXJJZDtcblx0XHR9XG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBQTSBmcm9tICcuL3BsYXllcm1hbmFnZXInO1xuXG5jbGFzcyBCZWhhdmlvclxue1xuXHRjb25zdHJ1Y3Rvcih0eXBlKXtcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xuXHR9XG5cblx0YXdha2Uob2JqKXtcblx0XHR0aGlzLm9iamVjdDNEID0gb2JqO1xuXHR9XG5cblx0c3RhcnQoKXsgfVxuXG5cdHVwZGF0ZShkVCl7IH1cblxuXHRkaXNwb3NlKCl7IH1cbn1cblxuY2xhc3MgQlN5bmMgZXh0ZW5kcyBCZWhhdmlvclxue1xuXHRjb25zdHJ1Y3RvcihldmVudE5hbWUpXG5cdHtcblx0XHRzdXBlcignQlN5bmMnKTtcblx0XHR0aGlzLl9zID0gU0guc29ja2V0O1xuXG5cdFx0Ly8gbGlzdGVuIGZvciB1cGRhdGUgZXZlbnRzXG5cdFx0dGhpcy5ob29rID0gdGhpcy5fcy5vbihldmVudE5hbWUsIHRoaXMudXBkYXRlRnJvbVNlcnZlci5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLmV2ZW50TmFtZSA9IGV2ZW50TmFtZTtcblx0XHR0aGlzLm93bmVyID0gJ3Vub3duZWQnO1xuXHR9XG5cblx0dXBkYXRlRnJvbVNlcnZlcihkYXRhKVxuXHR7XG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XG5cdFx0dGhpcy5vYmplY3QzRC5yb3RhdGlvbi5mcm9tQXJyYXkoZGF0YSwgMyk7XG5cdH1cblxuXHR0YWtlT3duZXJzaGlwKClcblx0e1xuXHRcdGlmKFBNLmxvY2FsVXNlciAmJiBQTS5sb2NhbFVzZXIudXNlcklkKVxuXHRcdFx0dGhpcy5vd25lciA9IFBNLmxvY2FsVXNlci51c2VySWQ7XG5cdH1cblxuXHR1cGRhdGUoZFQpXG5cdHtcblx0XHRpZihQTS5sb2NhbFVzZXIgJiYgUE0ubG9jYWxVc2VyLnNrZWxldG9uICYmIFBNLmxvY2FsVXNlci51c2VySWQgPT09IHRoaXMub3duZXIpXG5cdFx0e1xuXHRcdFx0bGV0IGogPSBQTS5sb2NhbFVzZXIuc2tlbGV0b24uZ2V0Sm9pbnQoJ0hlYWQnKTtcblx0XHRcdHRoaXMuX3MuZW1pdCh0aGlzLmV2ZW50TmFtZSwgWy4uLmoucG9zaXRpb24udG9BcnJheSgpLCAuLi5qLnJvdGF0aW9uLnRvQXJyYXkoKV0pO1xuXHRcdH1cblx0fVxuXG59XG5cbmV4cG9ydCB7IEJlaGF2aW9yLCBCU3luYyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgeyBCZWhhdmlvciB9IGZyb20gJy4vYmVoYXZpb3InO1xuXG5jbGFzcyBBbmltYXRlIGV4dGVuZHMgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IoLy97cGFyZW50LCBwb3MsIHF1YXQsIHNjYWxlLCBtYXRyaXgsIGR1cmF0aW9uLCBjYWxsYmFja31cblx0XHR7cGFyZW50PW51bGwsIHBvcz1udWxsLCBxdWF0PW51bGwsIHNjYWxlPW51bGwsIG1hdHJpeD1udWxsLCBkdXJhdGlvbj02MDAsIGNhbGxiYWNrPSgpPT57fX0pXG5cdHtcblx0XHRzdXBlcignQW5pbWF0ZScpO1xuXHRcdFxuXHRcdGlmKG1hdHJpeClcblx0XHR7XG5cdFx0XHQvLyBleHRyYWN0IHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlIGZyb20gbWF0cml4XG5cdFx0XHRwb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXHRcdFx0cXVhdCA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cdFx0XHRzY2FsZSA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cdFx0XHRtYXRyaXguZGVjb21wb3NlKHBvcywgcXVhdCwgc2NhbGUpO1xuXHRcdH1cblxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywge3BhcmVudCwgcG9zLCBxdWF0LCBzY2FsZSwgZHVyYXRpb24sIGNhbGxiYWNrfSk7XG5cdH1cblxuXHRhd2FrZShvYmopXG5cdHtcblx0XHRzdXBlci5hd2FrZShvYmopO1xuXG5cdFx0Ly8gc2h1ZmZsZSBoaWVyYXJjaHksIGJ1dCBrZWVwIHdvcmxkIHRyYW5zZm9ybSB0aGUgc2FtZVxuXHRcdGlmKHRoaXMucGFyZW50ICYmIHRoaXMucGFyZW50ICE9PSBvYmoucGFyZW50KVxuXHRcdHtcblx0XHRcdG9iai5hcHBseU1hdHJpeChvYmoucGFyZW50Lm1hdHJpeFdvcmxkKTtcblx0XHRcdGxldCBtYXQgPSBuZXcgVEhSRUUuTWF0cml4NCgpLmdldEludmVyc2UodGhpcy5wYXJlbnQubWF0cml4V29ybGQpO1xuXHRcdFx0b2JqLmFwcGx5TWF0cml4KG1hdCk7XG5cblx0XHRcdHRoaXMucGFyZW50LmFkZChvYmopO1xuXHRcdH1cblxuXHRcdC8vIHJlYWQgaW5pdGlhbCBwb3NpdGlvbnNcblx0XHR0aGlzLmluaXRpYWxQb3MgPSBvYmoucG9zaXRpb24uY2xvbmUoKTtcblx0XHR0aGlzLmluaXRpYWxRdWF0ID0gb2JqLnF1YXRlcm5pb24uY2xvbmUoKTtcblx0XHR0aGlzLmluaXRpYWxTY2FsZSA9IG9iai5zY2FsZS5jbG9uZSgpO1xuXHRcdHRoaXMuc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblx0fVxuXG5cdHVwZGF0ZSgpXG5cdHtcblx0XHQvLyBjb21wdXRlIGVhc2Utb3V0IGJhc2VkIG9uIGR1cmF0aW9uXG5cdFx0bGV0IG1peCA9IChEYXRlLm5vdygpLXRoaXMuc3RhcnRUaW1lKSAvIHRoaXMuZHVyYXRpb247XG5cdFx0bGV0IGVhc2UgPSBUV0VFTiA/IFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0IDogbiA9PiBuKigyLW4pO1xuXHRcdG1peCA9IG1peCA8IDEgPyBlYXNlKG1peCkgOiAxO1xuXG5cdFx0Ly8gYW5pbWF0ZSBwb3NpdGlvbiBpZiByZXF1ZXN0ZWRcblx0XHRpZiggdGhpcy5wb3MgKXtcblx0XHRcdHRoaXMub2JqZWN0M0QucG9zaXRpb24ubGVycFZlY3RvcnModGhpcy5pbml0aWFsUG9zLCB0aGlzLnBvcywgbWl4KTtcblx0XHR9XG5cblx0XHQvLyBhbmltYXRlIHJvdGF0aW9uIGlmIHJlcXVlc3RlZFxuXHRcdGlmKCB0aGlzLnF1YXQgKXtcblx0XHRcdFRIUkVFLlF1YXRlcm5pb24uc2xlcnAodGhpcy5pbml0aWFsUXVhdCwgdGhpcy5xdWF0LCB0aGlzLm9iamVjdDNELnF1YXRlcm5pb24sIG1peClcblx0XHR9XG5cblx0XHQvLyBhbmltYXRlIHNjYWxlIGlmIHJlcXVlc3RlZFxuXHRcdGlmKCB0aGlzLnNjYWxlICl7XG5cdFx0XHR0aGlzLm9iamVjdDNELnNjYWxlLmxlcnBWZWN0b3JzKHRoaXMuaW5pdGlhbFNjYWxlLCB0aGlzLnNjYWxlLCBtaXgpO1xuXHRcdH1cblxuXHRcdC8vIHRlcm1pbmF0ZSBhbmltYXRpb24gd2hlbiBkb25lXG5cdFx0aWYobWl4ID49IDEpe1xuXHRcdFx0dGhpcy5vYmplY3QzRC5yZW1vdmVCZWhhdmlvcih0aGlzKTtcblx0XHRcdHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLm9iamVjdDNEKTtcblx0XHR9XG5cdH1cbn1cblxuQW5pbWF0ZS5zdGFydCA9ICh0YXJnZXQsIG9wdHMpID0+XG57XG5cdGxldCBvbGRBbmltID0gdGFyZ2V0LmdldEJlaGF2aW9yQnlUeXBlKCdBbmltYXRlJyk7XG5cdGlmKG9sZEFuaW0pe1xuXHRcdG9sZEFuaW0uY29uc3RydWN0b3Iob3B0cyk7XG5cdFx0b2xkQW5pbS5hd2FrZSh0YXJnZXQpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHRhcmdldC5hZGRCZWhhdmlvciggbmV3IEFuaW1hdGUob3B0cykgKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBBbmltYXRlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCBBbmltYXRlIGZyb20gJy4vYW5pbWF0ZSc7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5cbi8vIGVudW0gY29uc3RhbnRzXG5sZXQgVHlwZXMgPSBPYmplY3QuZnJlZXplKHtcblx0UE9MSUNZX0xJQkVSQUw6IDAsXG5cdFBPTElDWV9GQVNDSVNUOiAxLFxuXHRST0xFX0xJQkVSQUw6IDIsXG5cdFJPTEVfRkFTQ0lTVDogMyxcblx0Uk9MRV9ISVRMRVI6IDQsXG5cdFBBUlRZX0xJQkVSQUw6IDUsXG5cdFBBUlRZX0ZBU0NJU1Q6IDYsXG5cdEpBOiA3LFxuXHRORUlOOiA4LFxuXHRCTEFOSzogOSxcblx0Q1JFRElUUzogMTBcbn0pO1xuXG5mdW5jdGlvbiBkaW1zVG9VVih7c2lkZSwgbGVmdCwgcmlnaHQsIHRvcCwgYm90dG9tfSlcbntcblx0aWYoc2lkZSlcblx0XHRyZXR1cm4gW1tcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHRvcCwgbGVmdCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIGxlZnQpLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIodG9wLCByaWdodClcblx0XHRdLFtcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGJvdHRvbSwgbGVmdCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIHJpZ2h0KSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHRvcCwgcmlnaHQpXG5cdFx0XV07XG5cdGVsc2Vcblx0XHRyZXR1cm4gW1tcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIHRvcCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihsZWZ0LCBib3R0b20pLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIocmlnaHQsIHRvcClcblx0XHRdLFtcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIGJvdHRvbSksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihyaWdodCwgYm90dG9tKSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCB0b3ApXG5cdFx0XV07XG59XG5cbmZ1bmN0aW9uIGdldFVWcyh0eXBlKVxue1xuXHRsZXQgZGltcyA9IHtsZWZ0OiAwLCByaWdodDogMSwgYm90dG9tOiAwLCB0b3A6IDF9O1xuXG5cdHN3aXRjaCh0eXBlKVxuXHR7XG5cdGNhc2UgVHlwZXMuUE9MSUNZX0xJQkVSQUw6XG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjgzNCwgcmlnaHQ6IDAuOTk2LCB0b3A6IDAuNzU0LCBib3R0b206IDAuOTk3fTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5QT0xJQ1lfRkFTQ0lTVDpcblx0XHRkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuNjYsIHJpZ2h0OiAwLjgyMiwgdG9wOiAwLjc1NCwgYm90dG9tOiAwLjk5Nn07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUk9MRV9MSUJFUkFMOlxuXHRcdGRpbXMgPSB7bGVmdDogMC41MDUsIHJpZ2h0OiAwLjc0NiwgdG9wOiAwLjk5NiwgYm90dG9tOiAwLjY1fTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5ST0xFX0ZBU0NJU1Q6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjUwNSwgcmlnaHQ6IDAuNzQ2LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUk9MRV9ISVRMRVI6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjc1NCwgcmlnaHQ6IDAuOTk2LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUEFSVFlfTElCRVJBTDpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMjU1LCByaWdodDogMC40OTUsIHRvcDogMC45OTYsIGJvdHRvbTogMC42NX07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUEFSVFlfRkFTQ0lTVDpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMjU1LCByaWdodDogMC40OTUsIHRvcDogMC42NDUsIGJvdHRvbTogMC4zfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5KQTpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMDA1LCByaWdodDogMC4yNDQsIHRvcDogMC45OTIsIGJvdHRvbTogMC42NTN9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLk5FSU46XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjAwNiwgcmlnaHQ6IDAuMjQzLCB0b3A6IDAuNjQyLCBib3R0b206IDAuMzAyfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5DUkVESVRTOlxuXHRcdGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC4wMTUsIHJpZ2h0OiAwLjI3NiwgdG9wOiAwLjM5NywgYm90dG9tOiAwLjc2NX07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuQkxBTks6XG5cdGRlZmF1bHQ6XG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjAyMiwgcmlnaHQ6IC4wMjIrMC4yNDcsIHRvcDogMC4wMjEsIGJvdHRvbTogLjAyMSswLjM1NDN9O1xuXHRcdGJyZWFrO1xuXHR9XG5cblx0cmV0dXJuIGRpbXNUb1VWKGRpbXMpO1xufVxuXG5cbmNsYXNzIENhcmQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3Rvcih0eXBlID0gVHlwZXMuQkxBTkssIGRvdWJsZVNpZGVkID0gdHJ1ZSlcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyBjcmVhdGUgdGhlIGNhcmQgZmFjZXNcblx0XHRsZXQgZnJvbnRHZW8gPSBuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSguNzE1LCAxKTtcblx0XHRsZXQgYmFja0dlbyA9IGZyb250R2VvLmNsb25lKCk7XG5cdFx0bGV0IGNhcmRNYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogQXNzZXRNYW5hZ2VyLmNhY2hlLnRleHR1cmVzLmNhcmRzfSk7XG5cdFx0bGV0IGZyb250ID0gbmV3IFRIUkVFLk1lc2goZnJvbnRHZW8sIGNhcmRNYXQpO1xuXHRcdGxldCBiYWNrID0gbmV3IFRIUkVFLk1lc2goYmFja0dlbywgY2FyZE1hdCk7XG5cdFx0YmFjay5wb3NpdGlvbi5zZXQoMC4wMDEsIDAsIDApO1xuXHRcdGZyb250LnBvc2l0aW9uLnNldCgtMC4wMDEsIDAsIDApO1xuXHRcdGJhY2sucm90YXRlWShNYXRoLlBJKTtcblxuXHRcdC8vIHNldCB0aGUgZmFjZXMgdG8gdGhlIGNvcnJlY3QgcGFydCBvZiB0aGUgdGV4dHVyZVxuXHRcdGZyb250Lmdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnMgPSBbZ2V0VVZzKHR5cGUpXTtcblx0XHRiYWNrLmdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnMgPSBbZ2V0VVZzKCBkb3VibGVTaWRlZCA/IHR5cGUgOiBUeXBlcy5CTEFOSyApXTtcblx0XHR0aGlzLnNjYWxlLnNldFNjYWxhcigwLjcpO1xuXHRcdHRoaXMuYWRkKGZyb250LCBiYWNrKTtcblx0fVxuXG5cdGhpZGUoKXtcblx0XHR0aGlzLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IGZhbHNlOyB9KTtcblx0fVxuXG5cdHNob3coKXtcblx0XHR0aGlzLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IHRydWU7IH0pO1xuXHR9XG59XG5cbmNsYXNzIEJsYW5rQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3RvcigpeyBzdXBlcigpOyB9XG59XG5cbmNsYXNzIENyZWRpdHNDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuQ1JFRElUUyk7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXG5cdFx0ZnVuY3Rpb24gc2V0VmlzaWJpbGl0eSh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSl7XG5cdFx0XHRpZihzdGF0ZSA9PT0gJ3NldHVwJylcblx0XHRcdFx0c2VsZi5jaGlsZHJlbi5mb3JFYWNoKG8gPT4geyBvLnZpc2libGUgPSB0cnVlOyB9KTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0c2VsZi5jaGlsZHJlbi5mb3JFYWNoKG8gPT4geyBvLnZpc2libGUgPSBmYWxzZTsgfSk7XG5cdFx0fVxuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgc2V0VmlzaWJpbGl0eSk7XG5cdH1cbn1cblxuY2xhc3MgTGliZXJhbFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfTElCRVJBTCwgZmFsc2UpO1xuXHR9XG5cdGdvVG9Qb3NpdGlvbihzcG90ID0gMClcblx0e1xuXHRcdHNwb3QgPSBNYXRoLm1heCgwLCBNYXRoLm1pbig0LCBzcG90KSk7XG5cdFx0bGV0IHMgPSBMaWJlcmFsUG9saWN5Q2FyZC5zcG90cztcblx0XHRBbmltYXRlLnN0YXJ0KHRoaXMsIHtwYXJlbnQ6IEFzc2V0TWFuYWdlci5yb290LCBwb3M6IHNbJ3Bvc18nK3Nwb3RdLCBxdWF0OiBzLnF1YXQsIHNjYWxlOiBzLnNjYWxlfSk7XG5cdH1cbn1cblxuTGliZXJhbFBvbGljeUNhcmQuc3BvdHMgPSB7XG5cdHBvc18wOiBuZXcgVEhSRUUuVmVjdG9yMygwLjUzMywgMC43NiwgLTAuMzM2KSxcblx0cG9zXzE6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMjYzLCAwLjc2LCAtMC4zMzYpLFxuXHRwb3NfMjogbmV3IFRIUkVFLlZlY3RvcjMoLS4wMDcsIDAuNzYsIC0wLjMzNiksXG5cdHBvc18zOiBuZXcgVEhSRUUuVmVjdG9yMygtLjI3OSwgMC43NiwgLTAuMzM2KSxcblx0cG9zXzQ6IG5ldyBUSFJFRS5WZWN0b3IzKC0uNTUyLCAwLjc2LCAtMC4zMzYpLFxuXHRxdWF0OiBuZXcgVEhSRUUuUXVhdGVybmlvbigwLCAwLjcwNzEwNjc4MTE4NjU0NzUsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMCksXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjcsIDAuNywgMC43KVxufVxuXG5jbGFzcyBGYXNjaXN0UG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlBPTElDWV9GQVNDSVNULCBmYWxzZSk7XG5cdH1cblx0Z29Ub1Bvc2l0aW9uKHNwb3QgPSAwKVxuXHR7XG5cdFx0c3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDUsIHNwb3QpKTtcblx0XHRsZXQgcyA9IEZhc2Npc3RQb2xpY3lDYXJkLnNwb3RzO1xuXHRcdEFuaW1hdGUuc3RhcnQodGhpcywge3BhcmVudDogQXNzZXRNYW5hZ2VyLnJvb3QsIHBvczogc1sncG9zXycrc3BvdF0sIHF1YXQ6IHMucXVhdCwgc2NhbGU6IHMuc2NhbGV9KTtcblx0fVxufVxuXG5GYXNjaXN0UG9saWN5Q2FyZC5zcG90cyA9IHtcblx0cG9zXzA6IG5ldyBUSFJFRS5WZWN0b3IzKC0uNjg3LCAwLjc2LCAwLjM0MSksXG5cdHBvc18xOiBuZXcgVEhSRUUuVmVjdG9yMygtLjQxNywgMC43NiwgMC4zNDEpLFxuXHRwb3NfMjogbmV3IFRIUkVFLlZlY3RvcjMoLS4xNDYsIDAuNzYsIDAuMzQxKSxcblx0cG9zXzM6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMTI3LCAwLjc2LCAwLjM0MSksXG5cdHBvc180OiBuZXcgVEhSRUUuVmVjdG9yMygwLjQwMCwgMC43NiwgMC4zNDEpLFxuXHRwb3NfNTogbmV3IFRIUkVFLlZlY3RvcjMoMC42NzMsIDAuNzYsIDAuMzQxKSxcblx0cXVhdDogbmV3IFRIUkVFLlF1YXRlcm5pb24oLTAuNzA3MTA2NzgxMTg2NTQ3NSwgMCwgMCwgMC43MDcxMDY3ODExODY1NDc1KSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNywgMC43LCAwLjcpXG59XG5cbmNsYXNzIExpYmVyYWxSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfTElCRVJBTCwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIEZhc2Npc3RSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfRkFTQ0lTVCwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIEhpdGxlclJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9ISVRMRVIsIGZhbHNlKTtcblx0fVxufVxuXG5jbGFzcyBMaWJlcmFsUGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfTElCRVJBTCwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIEZhc2Npc3RQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9GQVNDSVNULCBmYWxzZSk7XG5cdH1cbn1cblxuY2xhc3MgSmFDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuSkEsIGZhbHNlKTtcblx0XHR0aGlzLmNoaWxkcmVuWzBdLnJvdGF0ZVooLU1hdGguUEkvMik7XG5cdFx0dGhpcy5jaGlsZHJlblsxXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xuXHR9XG59XG5cbmNsYXNzIE5laW5DYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuTkVJTiwgZmFsc2UpO1xuXHRcdHRoaXMuY2hpbGRyZW5bMF0ucm90YXRlWigtTWF0aC5QSS8yKTtcblx0XHR0aGlzLmNoaWxkcmVuWzFdLnJvdGF0ZVooLU1hdGguUEkvMik7XG5cdH1cbn1cblxuXG5leHBvcnQge1xuXHRDYXJkLCBUeXBlcywgQmxhbmtDYXJkLCBDcmVkaXRzQ2FyZCxcblx0TGliZXJhbFBvbGljeUNhcmQsIEZhc2Npc3RQb2xpY3lDYXJkLCBMaWJlcmFsUm9sZUNhcmQsIEZhc2Npc3RSb2xlQ2FyZCxcblx0SGl0bGVyUm9sZUNhcmQsIExpYmVyYWxQYXJ0eUNhcmQsIEZhc2Npc3RQYXJ0eUNhcmQsIEphQ2FyZCwgTmVpbkNhcmRcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5jbGFzcyBQcmVzaWRlbnRIYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50b3BoYXQ7XG5cdFx0dGhpcy5tb2RlbC5wb3NpdGlvbi5zZXQoMCwwLDApO1xuXHRcdHRoaXMubW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJLzIsIDAsIDApO1xuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgKChlKSA9PiB7XG5cdFx0XHRpZihlLmRhdGEuZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJykgdGhpcy5pZGxlKCk7XG5cdFx0fSkuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRpZGxlKCl7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMC43NSwgMCwgMCk7XG5cdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgTWF0aC5QSS8yLCAwKTtcblx0XHRTSC5pZGxlUm9vdC5hZGQodGhpcyk7XG5cdH1cbn07XG5cbmNsYXNzIENoYW5jZWxsb3JIYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy52aXNvcmNhcDtcblx0XHR0aGlzLm1vZGVsLnBvc2l0aW9uLnNldCgwLDAuMDQsMCk7XG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoKGUpID0+IHtcblx0XHRcdGlmKGUuZGF0YS5nYW1lLnN0YXRlID09PSAnc2V0dXAnKSB0aGlzLmlkbGUoKTtcblx0XHR9KS5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdGlkbGUoKXtcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgtMC43NSwgMCwgMCk7XG5cdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEkvMiwgMCk7XG5cdFx0U0guaWRsZVJvb3QuYWRkKHRoaXMpO1xuXHR9XG59O1xuXG5leHBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuZnVuY3Rpb24gZ2V0R2FtZUlkKClcbntcblx0Ly8gZmlyc3QgY2hlY2sgdGhlIHVybFxuXHRsZXQgcmUgPSAvWz8mXWdhbWVJZD0oW14mXSspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRpZihyZSl7XG5cdFx0cmV0dXJuIHJlWzFdO1xuXHR9XG5cdGVsc2UgaWYoYWx0c3BhY2UgJiYgYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdHJldHVybiBTSC5lbnYuc2lkO1xuXHR9XG5cdGVsc2Uge1xuXHRcdGxldCBpZCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDAgKTtcblx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZSgnP2dhbWVJZD0nK2lkKTtcblx0fVxufVxuXG5mdW5jdGlvbiBwYXJzZUNTVihzdHIpe1xuXHRpZighc3RyKSByZXR1cm4gW107XG5cdGVsc2UgcmV0dXJuIHN0ci5zcGxpdCgnLCcpO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVF1ZXN0aW9uKHRleHQsIHRleHR1cmUgPSBudWxsKVxue1xuXHRsZXQgZm9udFN0YWNrID0gJ1wiSGVsdmV0aWNhIE5ldWVcIiwgSGVsdmV0aWNhLCBBcmlhbCwgU2Fucy1TZXJpZic7XG5cblx0Ly8gc2V0IHVwIGNhbnZhc1xuXHRsZXQgYm1wO1xuXHRpZighdGV4dHVyZSl7XG5cdFx0Ym1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0Ym1wLndpZHRoID0gNTEyO1xuXHRcdGJtcC5oZWlnaHQgPSAyNTY7XG5cdH1cblx0ZWxzZSB7XG5cdFx0Ym1wID0gdGV4dHVyZS5pbWFnZTtcblx0fVxuXG5cdGxldCBnID0gYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdGcuZmlsbFN0eWxlID0gJ3JnYmEoMCwwLDAsMCknO1xuXHRnLmZpbGxSZWN0KDAsIDAsIDUxMiwgMjU2KTtcblx0Zy50ZXh0QWxpZ24gPSAnY2VudGVyJztcblx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXG5cdC8vIHdyaXRlIHRleHRcblx0Zy5mb250ID0gJ2JvbGQgNTBweCAnK2ZvbnRTdGFjaztcblx0bGV0IGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG5cdGZvcihsZXQgaT0wOyBpPGxpbmVzLmxlbmd0aDsgaSsrKXtcblx0XHRnLmZpbGxUZXh0KGxpbmVzW2ldLCAyNTYsIDUwKzU1KmkpO1xuXHR9XG5cblx0aWYodGV4dHVyZSl7XG5cdFx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdFx0cmV0dXJuIHRleHR1cmU7XG5cdH1cblx0ZWxzZSB7XG5cdFx0cmV0dXJuIG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKGJtcCk7XG5cdH1cbn1cblxuZXhwb3J0IHsgZ2V0R2FtZUlkLCBwYXJzZUNTViwgZ2VuZXJhdGVRdWVzdGlvbiB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCB7IHBhcnNlQ1NWIH0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVUYWJsZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyBzYXZlIHJlZmVyZW5jZXMgdG8gdGhlIHRleHR1cmVzXG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX3NtYWxsLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbWVkLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbGFyZ2Vcblx0XHRdO1xuXG5cdFx0Ly8gYWRkIHRhYmxlIGFzc2V0XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50YWJsZS5jaGlsZHJlblswXTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCAwKTtcblx0XHR0aGlzLm1vZGVsLnNjYWxlLnNldFNjYWxhcigxLjI1KTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblxuXHRcdC8vIHNldCB0aGUgZGVmYXVsdCBtYXRlcmlhbFxuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwubWFwID0gdGhpcy50ZXh0dXJlc1swXTtcblxuXHRcdC8vIHBvc2l0aW9uIHRhYmxlXG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMCwgMS4wLCAwKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLmNoYW5nZU1vZGUuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRjaGFuZ2VNb2RlKHtkYXRhOiB7Z2FtZToge3N0YXRlLCB0dXJuT3JkZXJ9fX0pXG5cdHtcblx0XHRpZihzdGF0ZSA9PT0gJ3NldHVwJyl7XG5cdFx0XHRsZXQgaWRzID0gcGFyc2VDU1YodHVybk9yZGVyKTtcblx0XHRcdGlmKGlkcy5sZW5ndGggPCAyKVxuXHRcdFx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcCA9IHRoaXMudGV4dHVyZXNbMF07XG5cdFx0XHRlbHNlIGlmKGlkcy5sZW5ndGggPCAzKVxuXHRcdFx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcCA9IHRoaXMudGV4dHVyZXNbMV07XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRoaXMubW9kZWwubWF0ZXJpYWwubWFwID0gdGhpcy50ZXh0dXJlc1syXTtcblx0XHR9XG5cdH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IHsgcGFyc2VDU1YgfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTmFtZXBsYXRlIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xuXG5cdFx0Ly8gYWRkIDNkIG1vZGVsXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy5uYW1lcGxhdGUuY2hpbGRyZW5bMF0uY2xvbmUoKTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCBNYXRoLlBJLzIpO1xuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xuXG5cdFx0Ly8gZ2VuZXJhdGUgbWF0ZXJpYWxcblx0XHR0aGlzLmJtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMuYm1wLndpZHRoID0gTmFtZXBsYXRlLnRleHR1cmVTaXplO1xuXHRcdHRoaXMuYm1wLmhlaWdodCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAvIDI7XG5cdFx0dGhpcy5tb2RlbC5tYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG5cdFx0XHRtYXA6IG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKHRoaXMuYm1wKVxuXHRcdH0pO1xuXG5cdFx0Ly8gY3JlYXRlIGxpc3RlbmVyIHByb3hpZXNcblx0XHR0aGlzLl9ob3ZlckJlaGF2aW9yID0gbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJDb2xvcih7XG5cdFx0XHRjb2xvcjogbmV3IFRIUkVFLkNvbG9yKDB4ZmZhOGE4KVxuXHRcdH0pO1xuXHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0dGhpcy5tb2RlbC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVUZXh0KHRleHQpXG5cdHtcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcblxuXHRcdC8vIHNldCB1cCBjYW52YXNcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdFx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xuXHRcdGcuZmlsbFN0eWxlID0gJyMyMjInO1xuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XG5cdFx0Zy5mb250ID0gYGJvbGQgJHtmb250U2l6ZX1weCAke2ZvbnRTdGFja31gO1xuXHRcdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGcuZmlsbFRleHQodGV4dCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLzIsICgwLjQyIC0gMC4xMikqKE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yKSk7XG5cblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdH1cblxuXG5cblx0Y2xpY2soZSlcblx0e1xuXHRcdGlmKCF0aGlzLnNlYXQub3duZXIgJiYgU0guZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJylcblx0XHRcdHRoaXMucmVxdWVzdEpvaW4oKTtcblx0XHRlbHNlIGlmKHRoaXMuc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxuXHRcdFx0dGhpcy5yZXF1ZXN0TGVhdmUoKTtcblx0fVxuXG5cdHJlcXVlc3RKb2luKClcblx0e1xuXHRcdGNvbnNvbGUubG9nKCdSZXF1ZXN0aW5nIHRvIGpvaW4gYXQgc2VhdCcsIHRoaXMuc2VhdC5zZWF0TnVtKTtcblx0XHRTSC5zb2NrZXQuZW1pdCgncmVxdWVzdEpvaW4nLCBPYmplY3QuYXNzaWduKHtzZWF0TnVtOiB0aGlzLnNlYXQuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpO1xuXHR9XG5cblx0cmVxdWVzdExlYXZlKClcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblx0XHRpZighc2VsZi5xdWVzdGlvbilcblx0XHR7XG5cdFx0XHRjb25zb2xlLmxvZygnUHJvbXB0aW5nIHVzZXIgdG8gY29uZmlybSBsZWF2ZSBhY3Rpb24nKTtcblx0XHRcdHNlbGYucXVlc3Rpb24gPSBzZWxmLnNlYXQuYmFsbG90LmFza1F1ZXN0aW9uKCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byBsZWF2ZT8nLCAnbG9jYWwnKVxuXHRcdFx0LnRoZW4oY29uZmlybSA9PiB7XG5cdFx0XHRcdGlmKGNvbmZpcm0pe1xuXHRcdFx0XHRcdFNILnNvY2tldC5lbWl0KCdsZWF2ZScsIFNILmxvY2FsVXNlci5pZCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn1cblxuTmFtZXBsYXRlLnRleHR1cmVTaXplID0gMjU2O1xuIiwiJ3VzZSBzdHJpY3Q7J1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IHsgSmFDYXJkLCBOZWluQ2FyZCB9IGZyb20gJy4vY2FyZCc7XG5pbXBvcnQgeyBnZW5lcmF0ZVF1ZXN0aW9uLCBwYXJzZUNTViB9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBCYWxsb3QgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuICAgIGNvbnN0cnVjdG9yKHNlYXQpXG4gICAge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLnNlYXQgPSBzZWF0O1xuICAgICAgICB0aGlzLnF1ZXN0aW9ucyA9IFtdO1xuXG4gICAgICAgIHRoaXMuamFDYXJkID0gbmV3IEphQ2FyZCgpO1xuICAgICAgICB0aGlzLm5laW5DYXJkID0gbmV3IE5laW5DYXJkKCk7XG4gICAgICAgIFt0aGlzLmphQ2FyZCwgdGhpcy5uZWluQ2FyZF0uZm9yRWFjaChjID0+IHtcbiAgICAgICAgICAgIGMucG9zaXRpb24uc2V0KGMgaW5zdGFuY2VvZiBKYUNhcmQgPyAtMC4xIDogMC4xLCAtMC4xLCAwKTtcbiAgICAgICAgICAgIGMucm90YXRpb24uc2V0KDAuNSwgTWF0aC5QSSwgMCk7XG4gICAgICAgICAgICBjLnNjYWxlLnNldFNjYWxhcigwLjE1KTtcbiAgICAgICAgICAgIGMuaGlkZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hZGQodGhpcy5qYUNhcmQsIHRoaXMubmVpbkNhcmQpO1xuXG4gICAgICAgIGxldCBnZW8gPSBuZXcgVEhSRUUuUGxhbmVCdWZmZXJHZW9tZXRyeSgwLjQsIDAuMik7XG4gICAgICAgIGxldCBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe3RyYW5zcGFyZW50OiB0cnVlfSk7XG4gICAgICAgIHRoaXMucXVlc3Rpb24gPSBuZXcgVEhSRUUuTWVzaChnZW8sIG1hdCk7XG4gICAgICAgIHRoaXMucXVlc3Rpb24ucG9zaXRpb24uc2V0KDAsIDAuMDUsIDApO1xuICAgICAgICB0aGlzLnF1ZXN0aW9uLnJvdGF0aW9uLnNldCgwLCBNYXRoLlBJLCAwKTtcbiAgICAgICAgdGhpcy5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgIHRoaXMuYWRkKHRoaXMucXVlc3Rpb24pO1xuXG4gICAgICAgIFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV92b3Rlc0luUHJvZ3Jlc3MnLCB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzLCB2b3Rlc319KVxuICAgIHtcbiAgICAgICAgbGV0IHNlbGYgPSB0aGlzO1xuICAgICAgICBpZighc2VsZi5zZWF0Lm93bmVyKSByZXR1cm47XG5cbiAgICAgICAgbGV0IHZpcHMgPSBwYXJzZUNTVihnYW1lLnZvdGVzSW5Qcm9ncmVzcyk7XG4gICAgICAgIHZpcHMuZm9yRWFjaCh2SWQgPT5cbiAgICAgICAge1xuICAgICAgICAgICAgbGV0IGFza2VkID0gISFzZWxmLnF1ZXN0aW9ucy5maW5kKGUgPT4gZS52b3RlSWQgPT0gdklkKTtcbiAgICAgICAgICAgIGlmKCFhc2tlZClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBsZXQgcXVlc3Rpb25UZXh0O1xuICAgICAgICAgICAgICAgIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2VsZWN0Jyl7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXN0aW9uVGV4dCA9IHBsYXllcnNbdm90ZXNbdklkXS50YXJnZXQxXS5kaXNwbGF5TmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgKyAnXFxuZm9yIHByZXNpZGVudCBhbmRcXG4nXG4gICAgICAgICAgICAgICAgICAgICAgICArIHBsYXllcnNbdm90ZXNbdklkXS50YXJnZXQyXS5kaXNwbGF5TmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgKyAnXFxuZm9yIGNoYW5jZWxsb3I/JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdqb2luJyl7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXN0aW9uVGV4dCA9IHZvdGVzW3ZJZF0uZGF0YSArICdcXG50byBqb2luPyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAna2ljaycpe1xuICAgICAgICAgICAgICAgICAgICBxdWVzdGlvblRleHQgPSAnS2lja1xcbidcbiAgICAgICAgICAgICAgICAgICAgICAgICsgcGxheWVyc1t2b3Rlc1t2SWRdLnRhcmdldDFdLmRpc3BsYXlOYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICArICc/JztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzZWxmLmFza1F1ZXN0aW9uKHF1ZXN0aW9uVGV4dCwgdklkKVxuICAgICAgICAgICAgICAgIC50aGVuKGFuc3dlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIFNILnNvY2tldC5lbWl0KCd2b3RlJywgdklkLCBTSC5sb2NhbFVzZXIuaWQsIGFuc3dlcik7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goKCkgPT4gY29uc29sZS5sb2coJ1ZvdGUgc2NydWJiZWQ6JywgdklkKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFza1F1ZXN0aW9uKHFUZXh0LCBpZClcbiAgICB7XG4gICAgICAgIGxldCBzZWxmID0gdGhpcztcblxuICAgICAgICBsZXQgbmV3USA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIGNoZWNrIGZvciBwcmV2aW91cyBxdWVzdGlvbnNcbiAgICAgICAgICAgIGxldCBwcmVyZXE7XG4gICAgICAgICAgICBpZihzZWxmLnF1ZXN0aW9ucy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICAvLyBvbmx5IHJ1biB3aGVuIGVhcmxpZXIgcXVlc3Rpb25zIGFyZSBhbnN3ZXJlZFxuICAgICAgICAgICAgICAgIHByZXJlcSA9IHNlbGYucXVlc3Rpb25zW3NlbGYucXVlc3Rpb25zLmxlbmd0aC0xXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHByZXJlcSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmVyZXEudGhlbigoKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBpcyBzdGlsbCByZWxldmFudFxuICAgICAgICAgICAgICAgIGxldCBsYXRlc3RWb3RlcyA9IHBhcnNlQ1NWKFNILmdhbWUudm90ZXNJblByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICBpZighbGF0ZXN0Vm90ZXMuaW5jbHVkZXMoaWQpKXtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBob29rIHVwIHEvYSBjYXJkc1xuICAgICAgICAgICAgICAgIHNlbGYucXVlc3Rpb24ubWF0ZXJpYWwubWFwID0gZ2VuZXJhdGVRdWVzdGlvbihxVGV4dCwgdGhpcy5xdWVzdGlvbi5tYXRlcmlhbC5tYXApO1xuICAgICAgICAgICAgICAgIHNlbGYuamFDYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCh0cnVlKSk7XG4gICAgICAgICAgICAgICAgc2VsZi5uZWluQ2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQoZmFsc2UpKTtcblxuICAgICAgICAgICAgICAgIC8vIHNob3cgdGhlIGJhbGxvdFxuICAgICAgICAgICAgICAgIHNlbGYucXVlc3Rpb24udmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgc2VsZi5qYUNhcmQuc2hvdygpO1xuICAgICAgICAgICAgICAgIHNlbGYubmVpbkNhcmQuc2hvdygpO1xuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVzcG9uZChhbnN3ZXIpe1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVyKClcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIG9ubHkgdGhlIG93bmVyIG9mIHRoZSBiYWxsb3QgaXMgYW5zd2VyaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzZWxmLnNlYXQub3duZXIgIT09IFNILmxvY2FsVXNlci5pZCkgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBoaWRlIHRoZSBxdWVzdGlvbiBhbmQgcmV0dXJuIHRoZSBhbnN3ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuamFDYXJkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYubmVpbkNhcmQuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmphQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIGhhbmRsZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5uZWluQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIGhhbmRsZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBzdGlsbCBtYXR0ZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGF0ZXN0Vm90ZXMgPSBwYXJzZUNTVihTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZighbGF0ZXN0Vm90ZXMuaW5jbHVkZXMoaWQpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBhZGQgcXVlc3Rpb24gdG8gcXVldWUsIHJlbW92ZSB3aGVuIGRvbmVcbiAgICAgICAgc2VsZi5xdWVzdGlvbnMucHVzaChuZXdRKTtcbiAgICAgICAgbmV3US52b3RlSWQgPSBpZDtcbiAgICAgICAgbGV0IHNwbGljZSA9ICgpID0+IHNlbGYucXVlc3Rpb25zLnNwbGljZSggc2VsZi5xdWVzdGlvbnMuaW5kZXhPZihuZXdRKSwgMSApO1xuICAgICAgICBuZXdRLnRoZW4oc3BsaWNlKS5jYXRjaChzcGxpY2UpO1xuXG4gICAgICAgIHJldHVybiBuZXdRO1xuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnO1xuaW1wb3J0IEJhbGxvdCBmcm9tICcuL2JhbGxvdCc7XG5pbXBvcnQge3BhcnNlQ1NWfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2VhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG4gICAgY29uc3RydWN0b3Ioc2VhdE51bSlcbiAgICB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgdGhpcy5zZWF0TnVtID0gc2VhdE51bTtcbiAgICAgICAgdGhpcy5vd25lciA9IDA7XG5cbiAgICAgICAgLy8gcG9zaXRpb24gc2VhdFxuICAgICAgICBsZXQgeCwgeT0wLjY1LCB6O1xuICAgICAgICBzd2l0Y2goc2VhdE51bSl7XG4gICAgICAgIGNhc2UgMDogY2FzZSAxOiBjYXNlIDI6XG4gICAgICAgICAgICB4ID0gLTAuODMzICsgMC44MzMqc2VhdE51bTtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24uc2V0KHgsIHksIC0xLjA1KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6IGNhc2UgNDpcbiAgICAgICAgICAgIHogPSAtMC40MzcgKyAwLjg3NCooc2VhdE51bS0zKTtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24uc2V0KDEuNDI1LCB5LCB6KTtcbiAgICAgICAgICAgIHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLzIsIDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XG4gICAgICAgICAgICB4ID0gMC44MzMgLSAwLjgzMyooc2VhdE51bS01KTtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24uc2V0KHgsIHksIDEuMDUpO1xuICAgICAgICAgICAgdGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEksIDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgODogY2FzZSA5OlxuICAgICAgICAgICAgeiA9IDAuNDM3IC0gMC44NzQqKHNlYXROdW0tOCk7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uLnNldCgtMS40MjUsIHksIHopO1xuICAgICAgICAgICAgdGhpcy5yb3RhdGlvbi5zZXQoMCwgLTEuNSpNYXRoLlBJLCAwKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5uYW1lcGxhdGUgPSBuZXcgTmFtZXBsYXRlKHRoaXMpO1xuICAgICAgICB0aGlzLm5hbWVwbGF0ZS5wb3NpdGlvbi5zZXQoMCwgLTAuNjM1LCAwLjIyKTtcbiAgICAgICAgdGhpcy5hZGQodGhpcy5uYW1lcGxhdGUpO1xuXG4gICAgICAgIHRoaXMuYmFsbG90ID0gbmV3IEJhbGxvdCh0aGlzKTtcbiAgICAgICAgdGhpcy5iYWxsb3QucG9zaXRpb24uc2V0KDAsIC0wLjMsIDAuMjUpO1xuICAgICAgICAvL3RoaXMuYmFsbG90LnJvdGF0ZVkoMC4xKTtcbiAgICAgICAgdGhpcy5hZGQodGhpcy5iYWxsb3QpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xuICAgIH1cblxuICAgIHVwZGF0ZU93bmVyc2hpcCh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSlcblx0e1xuXHRcdGxldCBpZHMgPSBwYXJzZUNTVihnYW1lLnR1cm5PcmRlcik7XG5cblx0XHRpZiggIXRoaXMub3duZXIgKVxuXHRcdHtcblx0XHRcdC8vIGNoZWNrIGlmIGEgcGxheWVyIGhhcyBqb2luZWQgYXQgdGhpcyBzZWF0XG5cdFx0XHRmb3IobGV0IGkgaW4gaWRzKXtcblx0XHRcdFx0aWYocGxheWVyc1tpZHNbaV1dLnNlYXROdW0gPT0gdGhpcy5zZWF0TnVtKXtcblx0XHRcdFx0XHR0aGlzLm93bmVyID0gaWRzW2ldO1xuXHRcdFx0XHRcdHRoaXMubmFtZXBsYXRlLnVwZGF0ZVRleHQocGxheWVyc1tpZHNbaV1dLmRpc3BsYXlOYW1lKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiggIWlkcy5pbmNsdWRlcyh0aGlzLm93bmVyKSApXG5cdFx0e1xuXHRcdFx0dGhpcy5vd25lciA9IDA7XG5cdFx0XHRpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcblx0XHRcdFx0dGhpcy5uYW1lcGxhdGUudXBkYXRlVGV4dCgnPEpvaW4+Jyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCAqIGFzIENhcmRzIGZyb20gJy4vY2FyZCc7XG5pbXBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfSBmcm9tICcuL2hhdHMnO1xuaW1wb3J0IEdhbWVUYWJsZSBmcm9tICcuL3RhYmxlJztcbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IHsgZ2V0R2FtZUlkIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgTmFtZXBsYXRlIGZyb20gJy4vbmFtZXBsYXRlJztcbmltcG9ydCBTZWF0IGZyb20gJy4vc2VhdCc7XG5cbmNsYXNzIFNlY3JldEhpdGxlciBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5hc3NldHMgPSBBc3NldE1hbmFnZXIubWFuaWZlc3Q7XG5cdFx0dGhpcy52ZXJ0aWNhbEFsaWduID0gJ2JvdHRvbSc7XG5cdFx0dGhpcy5uZWVkc1NrZWxldG9uID0gdHJ1ZTtcblxuXHRcdC8vIHBvbHlmaWxsIGdldFVzZXIgZnVuY3Rpb25cblx0XHRpZighYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdFx0YWx0c3BhY2UuZ2V0VXNlciA9ICgpID0+IHtcblx0XHRcdFx0bGV0IGlkLCByZSA9IC9bPyZddXNlcklkPShcXGQrKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcblx0XHRcdFx0aWYocmUpXG5cdFx0XHRcdFx0aWQgPSByZVsxXTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMDApO1xuXG5cdFx0XHRcdGFsdHNwYWNlLl9sb2NhbFVzZXIgPSB7XG5cdFx0XHRcdFx0dXNlcklkOiBpZCxcblx0XHRcdFx0XHRkaXNwbGF5TmFtZTogJ0d1ZXN0JytpZCxcblx0XHRcdFx0XHRpc01vZGVyYXRvcjogZmFsc2Vcblx0XHRcdFx0fTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ01hc3F1ZXJhZGluZyBhcycsIGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xuXHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyBnZXQgbG9jYWwgdXNlclxuXHRcdGFsdHNwYWNlLmdldFVzZXIoKS50aGVuKCh1c2VyID0+XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2NhbFVzZXIgPSB7XG5cdFx0XHRcdGlkOiB1c2VyLnVzZXJJZC50b1N0cmluZygpLFxuXHRcdFx0XHRkaXNwbGF5TmFtZTogdXNlci5kaXNwbGF5TmFtZSxcblx0XHRcdFx0aXNNb2RlcmF0b3I6IHVzZXIuaXNNb2RlcmF0b3Jcblx0XHRcdH07XG5cdFx0fSkuYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLmdhbWUgPSB7fTtcblx0XHR0aGlzLnBsYXllcnMgPSB7fTtcblx0XHR0aGlzLnZvdGVzID0ge307XG5cdH1cblxuXHRpbml0aWFsaXplKGVudiwgcm9vdCwgYXNzZXRzKVxuXHR7XG5cdFx0Ly8gc2hhcmUgdGhlIGRpb3JhbWEgaW5mb1xuXHRcdEFzc2V0TWFuYWdlci5jYWNoZSA9IGFzc2V0cztcblx0XHR0aGlzLmVudiA9IGVudjtcblxuXHRcdC8vIGNvbm5lY3QgdG8gc2VydmVyXG5cdFx0dGhpcy5zb2NrZXQgPSBpby5jb25uZWN0KCcvJywge3F1ZXJ5OiAnZ2FtZUlkPScrZ2V0R2FtZUlkKCl9KTtcblxuXHRcdC8vIGNyZWF0ZSB0aGUgdGFibGVcblx0XHR0aGlzLnRhYmxlID0gbmV3IEdhbWVUYWJsZSgpO1xuXHRcdHRoaXMuYWRkKHRoaXMudGFibGUpO1xuXG5cdFx0dGhpcy5yZXNldEJ1dHRvbiA9IG5ldyBUSFJFRS5NZXNoKFxuXHRcdFx0bmV3IFRIUkVFLkJveEdlb21ldHJ5KC4yNSwuMjUsLjI1KSxcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBhc3NldHMudGV4dHVyZXMucmVzZXR9KVxuXHRcdCk7XG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5wb3NpdGlvbi5zZXQoMCwgLTAuMTgsIDApO1xuXHRcdHRoaXMucmVzZXRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLnJlc2V0LmJpbmQodGhpcykpO1xuXHRcdHRoaXMudGFibGUuYWRkKHRoaXMucmVzZXRCdXR0b24pO1xuXG5cdFx0Ly8gY3JlYXRlIGlkbGUgZGlzcGxheVxuXHRcdHRoaXMuaWRsZVJvb3QgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblx0XHR0aGlzLmlkbGVSb290LnBvc2l0aW9uLnNldCgwLCAxLjg1LCAwKTtcblx0XHR0aGlzLmlkbGVSb290LmFkZEJlaGF2aW9yKG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLlNwaW4oe3NwZWVkOiAwLjAwMDJ9KSk7XG5cdFx0dGhpcy5hZGQodGhpcy5pZGxlUm9vdCk7XG5cblx0XHQvLyBjcmVhdGUgaWRsZSBzbGlkZXNob3dcblx0XHRsZXQgY3JlZGl0cyA9IG5ldyBDYXJkcy5DcmVkaXRzQ2FyZCgpO1xuXHRcdHRoaXMuaWRsZVJvb3QuYWRkKGNyZWRpdHMpO1xuXG5cdFx0Ly8gY3JlYXRlIGhhdHNcblx0XHR0aGlzLnByZXNpZGVudEhhdCA9IG5ldyBQcmVzaWRlbnRIYXQoKTtcblx0XHR0aGlzLmNoYW5jZWxsb3JIYXQgPSBuZXcgQ2hhbmNlbGxvckhhdCgpO1xuXG5cdFx0Ly8gY3JlYXRlIHBvc2l0aW9uc1xuXHRcdHRoaXMuc2VhdHMgPSBbXTtcblx0XHRmb3IobGV0IGk9MDsgaTwxMDsgaSsrKXtcblx0XHRcdHRoaXMuc2VhdHMucHVzaCggbmV3IFNlYXQoaSkgKTtcblx0XHR9XG5cblx0XHR0aGlzLnRhYmxlLmFkZCguLi50aGlzLnNlYXRzKTtcblxuXHRcdC8vIGFkZCBhdmF0YXIgZm9yIHNjYWxlXG5cdFx0YXNzZXRzLm1vZGVscy5kdW1teS5wb3NpdGlvbi5zZXQoMCwgMCwgMS4xKTtcblx0XHRhc3NldHMubW9kZWxzLmR1bW15LnJvdGF0ZVooTWF0aC5QSSk7XG5cdFx0dGhpcy5hZGQoYXNzZXRzLm1vZGVscy5kdW1teSk7XG5cblx0XHR0aGlzLnNvY2tldC5vbigndXBkYXRlJywgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xuXHR9XG5cblx0dXBkYXRlRnJvbVNlcnZlcihnZCwgcGQsIHZkKVxuXHR7XG5cdFx0Y29uc29sZS5sb2coZ2QsIHBkLCB2ZCk7XG5cblx0XHRsZXQgZ2FtZSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2FtZSwgZ2QpO1xuXHRcdGxldCBwbGF5ZXJzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5wbGF5ZXJzLCBwZCk7XG5cdFx0bGV0IHZvdGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy52b3RlcywgdmQpO1xuXG5cdFx0bGV0IG5lZWRQbGF5ZXJJbmZvID0gWyd0dXJuT3JkZXInLCdwZW5kaW5nSm9pblJlcXVlc3QnXTtcblx0XHRmb3IobGV0IGZpZWxkIGluIGdkKVxuXHRcdHtcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHRcdHR5cGU6ICd1cGRhdGVfJytmaWVsZCxcblx0XHRcdFx0YnViYmxlczogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRnYW1lOiBnYW1lLFxuXHRcdFx0XHRcdHBsYXllcnM6IG5lZWRQbGF5ZXJJbmZvLmluY2x1ZGVzKGZpZWxkKSA/IHBsYXllcnMgOiB1bmRlZmluZWQsXG5cdFx0XHRcdFx0dm90ZXM6IGZpZWxkID09PSAndm90ZXNJblByb2dyZXNzJyA/IHZvdGVzIDogdW5kZWZpbmVkXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XG5cdFx0dGhpcy5wbGF5ZXJzID0gcGxheWVycztcblx0XHR0aGlzLnZvdGVzID0gdm90ZXM7XG5cdH1cblxuXHRyZXNldChlKXtcblx0XHRjb25zb2xlLmxvZygncmVxdWVzdGluZyByZXNldCcpO1xuXHRcdHRoaXMuc29ja2V0LmVtaXQoJ3Jlc2V0Jyk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgbmV3IFNlY3JldEhpdGxlcigpO1xuIl0sIm5hbWVzIjpbInRoaXMiLCJzdXBlciIsImxldCIsIkFzc2V0TWFuYWdlciIsIkNhcmRzLkNyZWRpdHNDYXJkIl0sIm1hcHBpbmdzIjoiOzs7QUFFQSxTQUFlO0NBQ2QsUUFBUSxFQUFFO0VBQ1QsTUFBTSxFQUFFO0dBQ1AsS0FBSyxFQUFFLHdCQUF3QjtHQUMvQixTQUFTLEVBQUUsNEJBQTRCO0dBQ3ZDLE1BQU0sRUFBRSwwQkFBMEI7R0FDbEMsUUFBUSxFQUFFLDZCQUE2QjtHQUN2QyxLQUFLLEVBQUUseUJBQXlCO0dBQ2hDO0VBQ0QsUUFBUSxFQUFFO0dBQ1QsV0FBVyxFQUFFLGtDQUFrQztHQUMvQyxTQUFTLEVBQUUsbUNBQW1DO0dBQzlDLFdBQVcsRUFBRSxrQ0FBa0M7R0FDL0MsS0FBSyxFQUFFLHNCQUFzQjtHQUM3QixLQUFLLEVBQUUscUJBQXFCO0dBQzVCO0VBQ0Q7Q0FDRCxLQUFLLEVBQUUsRUFBRTtDQUNULENBQUE7O0FDbEJE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
