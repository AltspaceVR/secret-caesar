var SecretHitler = (function () {
'use strict';

var AM = {
	manifest: {
		models: {
			table: 'static/model/table.gltf',
			nameplate: 'static/model/nameplate.dae',
			tophat: 'static/model/tophat.gltf',
			visorcap: 'static/model/visor_cap.gltf',
			dummy: 'static/model/dummy.gltf',
			playermeter: 'static/model/playermeter.gltf'
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
	cache: {}
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

		SH.addEventListener('update_state', function (e) {
			if(e.data.game.state === 'setup')
				{ this$1.idle(); }
			else {
				SH.idleRoot.remove(this$1);
			}
		});
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

		SH.addEventListener('update_state', function (e) {
			if(e.data.game.state === 'setup')
				{ this$1.idle(); }
			else {
				SH.idleRoot.remove(this$1);
			}
		});
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
		else if(this.seat.owner && SH.game.turnOrder.includes(SH.localUser.id))
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

/*
* Have to completely reimplement promises from scratch for this :(
* This class is a promise that tracks dependencies, and evaluates
* when they are met. It's also cancellable, calling its dependents
* as soon as its dependencies are met.
*/
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
    function settle(type){
        return function(){
                var args = [], len = arguments.length;
                while ( len-- ) args[ len ] = arguments[ len ];

            this._execSettled(type, args);
        }
    }

    if(this.state === 'pending'){
        this.state = 'running';
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

        var vips = game.votesInProgress;
        var votesFinished = (SH.game.votesInProgress || []).filter(
            function (e) { return !vips.includes(e); }
        );

        vips.forEach(function (vId) {
            var vs = votes[vId].yesVoters.concat( votes[vId].noVoters);
            var nv = votes[vId].nonVoters;

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
                else if(votes[vId].type === 'confirmRole'){
                    questionText = 'Your role is:';
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
                var latestVotes = SH.game.votesInProgress;
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
                        var latestVotes = SH.game.votesInProgress;
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

        this.nameplate = new Nameplate(this);
        this.nameplate.position.set(0, -0.635, 0.22);
        this.add(this.nameplate);

        this.ballot = new Ballot(this);
        this.ballot.position.set(0, -0.3, 0.25);
        //this.ballot.rotateY(0.1);
        this.add(this.ballot);

		SH.addEventListener('update_turnOrder', this.updateOwnership.bind(this));
        SH.addEventListener('checkedIn', (function (id) {
            if(this$1.owner === id)
                { this$1.updateOwnership({data: {game: SH.game, players: SH.players}}); }
        }).bind(this));
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

		var ids = game.turnOrder;

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

var PlayerMeter = (function (superclass) {
    function PlayerMeter()
    {
        var this$1 = this;

        superclass.call(this);

        var model = AM.cache.models.playermeter;
        model.position.set(0, 0.15, 0);
        model.rotation.set(-Math.PI/2, 0, 0);
        model.scale.setScalar(0.8);

        // set up rainbow meter
        this.pm = model.children[0].children[0];
        this.pm.material.vertexColors = THREE.VertexColors;
        this.pm.material.color.set(0xffffff);
        this.pm.visible = false;

        // set up label
        this.label = model.children[0].children[1];
        this.label.visible = false;

        this.add(model);

        // set up gauge
        this.gauge = new THREE.Object3D();
        this.gauge.position.set(0, 0.15, 0);

        var wedgeMat = new THREE.MeshBasicMaterial({color: 0xc0c0c0});
        for(var i=0; i<4; i++){
            var wedge = new THREE.Mesh(new THREE.BufferGeometry(), wedgeMat);
            wedge.rotation.set(0, i*Math.PI/2, 0);
            this$1.gauge.add(wedge);
        }
        this.setMeterValue(0);
        this.add(this.gauge);

        SH.addEventListener('update_turnOrder', this.adjustPlayerCount.bind(this));
        SH.addEventListener('update_state', this.adjustPlayerCount.bind(this));
        this.addEventListener('cursorup', this.onclick.bind(this));
    }

    if ( superclass ) PlayerMeter.__proto__ = superclass;
    PlayerMeter.prototype = Object.create( superclass && superclass.prototype );
    PlayerMeter.prototype.constructor = PlayerMeter;

    PlayerMeter.prototype.setMeterValue = function setMeterValue (val)
    {
        this.pm.visible = val >= 1;
        this.label.visible = val >= 5;

        var wedgeGeo = new THREE.CylinderBufferGeometry(
            0.4, 0.4, 0.15, 40, 1, false, -Math.PI/4, (val/10)*Math.PI/2
        );
        this.gauge.children.forEach(function (o) { o.geometry = wedgeGeo; });
    };

    PlayerMeter.prototype.adjustPlayerCount = function adjustPlayerCount (ref)
    {
        var ref_data_game = ref.data.game;
        var turnOrder = ref_data_game.turnOrder;
        var state = ref_data_game.state;

        if(state === 'setup'){
            this.setMeterValue(turnOrder.length);
        }
        else {
            this.setMeterValue(0);
        }
    };

    PlayerMeter.prototype.onclick = function onclick (evt)
    {
        var to = SH.game.turnOrder;
        if(SH.game.state === 'setup' && to.length >= 5 && to.length <= 10
            && to.includes(SH.localUser.id))
        {
            SH.socket.emit('start');
        }
    };

    return PlayerMeter;
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

		this.playerMeter = new PlayerMeter();
		this.table.add(this.playerMeter);

		// add avatar for scale
		assets.models.dummy.position.set(0, -0.12, 1.1);
		assets.models.dummy.rotateZ(Math.PI);
		this.add(assets.models.dummy);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvYXNzZXRtYW5hZ2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iZWhhdmlvci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYW5pbWF0ZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvY2FyZC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvaGF0cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdGFibGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L3V0aWxzLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9uYW1lcGxhdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2Nhc2NhZGluZ3Byb21pc2UuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JhbGxvdC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvc2VhdC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVybWV0ZXIuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlY3JldGhpdGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0bWFuaWZlc3Q6IHtcblx0XHRtb2RlbHM6IHtcblx0XHRcdHRhYmxlOiAnc3RhdGljL21vZGVsL3RhYmxlLmdsdGYnLFxuXHRcdFx0bmFtZXBsYXRlOiAnc3RhdGljL21vZGVsL25hbWVwbGF0ZS5kYWUnLFxuXHRcdFx0dG9waGF0OiAnc3RhdGljL21vZGVsL3RvcGhhdC5nbHRmJyxcblx0XHRcdHZpc29yY2FwOiAnc3RhdGljL21vZGVsL3Zpc29yX2NhcC5nbHRmJyxcblx0XHRcdGR1bW15OiAnc3RhdGljL21vZGVsL2R1bW15LmdsdGYnLFxuXHRcdFx0cGxheWVybWV0ZXI6ICdzdGF0aWMvbW9kZWwvcGxheWVybWV0ZXIuZ2x0Zidcblx0XHR9LFxuXHRcdHRleHR1cmVzOiB7XG5cdFx0XHRib2FyZF9sYXJnZTogJ3N0YXRpYy9pbWcvYm9hcmQtbGFyZ2UucG5nJyxcblx0XHRcdGJvYXJkX21lZDogJ3N0YXRpYy9pbWcvYm9hcmQtbWVkaXVtLnBuZycsXG5cdFx0XHRib2FyZF9zbWFsbDogJ3N0YXRpYy9pbWcvYm9hcmQtc21hbGwucG5nJyxcblx0XHRcdGNhcmRzOiAnc3RhdGljL2ltZy9jYXJkcy5wbmcnLFxuXHRcdFx0cmVzZXQ6ICdzdGF0aWMvaW1nL2JvbWIucG5nJyxcblx0XHRcdHRleHQ6ICdzdGF0aWMvaW1nL3RleHQucG5nJ1xuXHRcdH1cblx0fSxcblx0Y2FjaGU6IHt9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbmNsYXNzIEJlaGF2aW9yXG57XG5cdGNvbnN0cnVjdG9yKHR5cGUpe1xuXHRcdHRoaXMudHlwZSA9IHR5cGU7XG5cdH1cblxuXHRhd2FrZShvYmope1xuXHRcdHRoaXMub2JqZWN0M0QgPSBvYmo7XG5cdH1cblxuXHRzdGFydCgpeyB9XG5cblx0dXBkYXRlKGRUKXsgfVxuXG5cdGRpc3Bvc2UoKXsgfVxufVxuXG5jbGFzcyBCU3luYyBleHRlbmRzIEJlaGF2aW9yXG57XG5cdGNvbnN0cnVjdG9yKGV2ZW50TmFtZSlcblx0e1xuXHRcdHN1cGVyKCdCU3luYycpO1xuXHRcdHRoaXMuX3MgPSBTSC5zb2NrZXQ7XG5cblx0XHQvLyBsaXN0ZW4gZm9yIHVwZGF0ZSBldmVudHNcblx0XHR0aGlzLmhvb2sgPSB0aGlzLl9zLm9uKGV2ZW50TmFtZSwgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuZXZlbnROYW1lID0gZXZlbnROYW1lO1xuXHRcdHRoaXMub3duZXIgPSAwO1xuXHR9XG5cblx0dXBkYXRlRnJvbVNlcnZlcihkYXRhKVxuXHR7XG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XG5cdFx0dGhpcy5vYmplY3QzRC5yb3RhdGlvbi5mcm9tQXJyYXkoZGF0YSwgMyk7XG5cdH1cblxuXHR0YWtlT3duZXJzaGlwKClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlciAmJiBTSC5sb2NhbFVzZXIudXNlcklkKVxuXHRcdFx0dGhpcy5vd25lciA9IFNILmxvY2FsVXNlci51c2VySWQ7XG5cdH1cblxuXHR1cGRhdGUoZFQpXG5cdHtcblx0XHRpZihTSC5sb2NhbFVzZXIgJiYgU0gubG9jYWxVc2VyLnNrZWxldG9uICYmIFNILmxvY2FsVXNlci5pZCA9PT0gdGhpcy5vd25lcilcblx0XHR7XG5cdFx0XHRsZXQgaiA9IFNILmxvY2FsVXNlci5za2VsZXRvbi5nZXRKb2ludCgnSGVhZCcpO1xuXHRcdFx0dGhpcy5fcy5lbWl0KHRoaXMuZXZlbnROYW1lLCBbLi4uai5wb3NpdGlvbi50b0FycmF5KCksIC4uLmoucm90YXRpb24udG9BcnJheSgpXSk7XG5cdFx0fVxuXHR9XG5cbn1cblxuZXhwb3J0IHsgQmVoYXZpb3IsIEJTeW5jIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCB7IEJlaGF2aW9yIH0gZnJvbSAnLi9iZWhhdmlvcic7XG5cbmNsYXNzIEFuaW1hdGUgZXh0ZW5kcyBCZWhhdmlvclxue1xuXHRjb25zdHJ1Y3RvcigvL3twYXJlbnQsIHBvcywgcXVhdCwgc2NhbGUsIG1hdHJpeCwgZHVyYXRpb24sIGNhbGxiYWNrfVxuXHRcdHtwYXJlbnQ9bnVsbCwgcG9zPW51bGwsIHF1YXQ9bnVsbCwgc2NhbGU9bnVsbCwgbWF0cml4PW51bGwsIGR1cmF0aW9uPTYwMCwgY2FsbGJhY2s9KCk9Pnt9fSlcblx0e1xuXHRcdHN1cGVyKCdBbmltYXRlJyk7XG5cdFx0XG5cdFx0aWYobWF0cml4KVxuXHRcdHtcblx0XHRcdC8vIGV4dHJhY3QgcG9zaXRpb24vcm90YXRpb24vc2NhbGUgZnJvbSBtYXRyaXhcblx0XHRcdHBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cdFx0XHRxdWF0ID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblx0XHRcdHNjYWxlID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblx0XHRcdG1hdHJpeC5kZWNvbXBvc2UocG9zLCBxdWF0LCBzY2FsZSk7XG5cdFx0fVxuXG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCB7cGFyZW50LCBwb3MsIHF1YXQsIHNjYWxlLCBkdXJhdGlvbiwgY2FsbGJhY2t9KTtcblx0fVxuXG5cdGF3YWtlKG9iailcblx0e1xuXHRcdHN1cGVyLmF3YWtlKG9iaik7XG5cblx0XHQvLyBzaHVmZmxlIGhpZXJhcmNoeSwgYnV0IGtlZXAgd29ybGQgdHJhbnNmb3JtIHRoZSBzYW1lXG5cdFx0aWYodGhpcy5wYXJlbnQgJiYgdGhpcy5wYXJlbnQgIT09IG9iai5wYXJlbnQpXG5cdFx0e1xuXHRcdFx0b2JqLmFwcGx5TWF0cml4KG9iai5wYXJlbnQubWF0cml4V29ybGQpO1xuXHRcdFx0bGV0IG1hdCA9IG5ldyBUSFJFRS5NYXRyaXg0KCkuZ2V0SW52ZXJzZSh0aGlzLnBhcmVudC5tYXRyaXhXb3JsZCk7XG5cdFx0XHRvYmouYXBwbHlNYXRyaXgobWF0KTtcblxuXHRcdFx0dGhpcy5wYXJlbnQuYWRkKG9iaik7XG5cdFx0fVxuXG5cdFx0Ly8gcmVhZCBpbml0aWFsIHBvc2l0aW9uc1xuXHRcdHRoaXMuaW5pdGlhbFBvcyA9IG9iai5wb3NpdGlvbi5jbG9uZSgpO1xuXHRcdHRoaXMuaW5pdGlhbFF1YXQgPSBvYmoucXVhdGVybmlvbi5jbG9uZSgpO1xuXHRcdHRoaXMuaW5pdGlhbFNjYWxlID0gb2JqLnNjYWxlLmNsb25lKCk7XG5cdFx0dGhpcy5zdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXHR9XG5cblx0dXBkYXRlKClcblx0e1xuXHRcdC8vIGNvbXB1dGUgZWFzZS1vdXQgYmFzZWQgb24gZHVyYXRpb25cblx0XHRsZXQgbWl4ID0gKERhdGUubm93KCktdGhpcy5zdGFydFRpbWUpIC8gdGhpcy5kdXJhdGlvbjtcblx0XHRsZXQgZWFzZSA9IFRXRUVOID8gVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQgOiBuID0+IG4qKDItbik7XG5cdFx0bWl4ID0gbWl4IDwgMSA/IGVhc2UobWl4KSA6IDE7XG5cblx0XHQvLyBhbmltYXRlIHBvc2l0aW9uIGlmIHJlcXVlc3RlZFxuXHRcdGlmKCB0aGlzLnBvcyApe1xuXHRcdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5sZXJwVmVjdG9ycyh0aGlzLmluaXRpYWxQb3MsIHRoaXMucG9zLCBtaXgpO1xuXHRcdH1cblxuXHRcdC8vIGFuaW1hdGUgcm90YXRpb24gaWYgcmVxdWVzdGVkXG5cdFx0aWYoIHRoaXMucXVhdCApe1xuXHRcdFx0VEhSRUUuUXVhdGVybmlvbi5zbGVycCh0aGlzLmluaXRpYWxRdWF0LCB0aGlzLnF1YXQsIHRoaXMub2JqZWN0M0QucXVhdGVybmlvbiwgbWl4KVxuXHRcdH1cblxuXHRcdC8vIGFuaW1hdGUgc2NhbGUgaWYgcmVxdWVzdGVkXG5cdFx0aWYoIHRoaXMuc2NhbGUgKXtcblx0XHRcdHRoaXMub2JqZWN0M0Quc2NhbGUubGVycFZlY3RvcnModGhpcy5pbml0aWFsU2NhbGUsIHRoaXMuc2NhbGUsIG1peCk7XG5cdFx0fVxuXG5cdFx0Ly8gdGVybWluYXRlIGFuaW1hdGlvbiB3aGVuIGRvbmVcblx0XHRpZihtaXggPj0gMSl7XG5cdFx0XHR0aGlzLm9iamVjdDNELnJlbW92ZUJlaGF2aW9yKHRoaXMpO1xuXHRcdFx0dGhpcy5jYWxsYmFjay5jYWxsKHRoaXMub2JqZWN0M0QpO1xuXHRcdH1cblx0fVxufVxuXG5BbmltYXRlLnN0YXJ0ID0gKHRhcmdldCwgb3B0cykgPT5cbntcblx0bGV0IG9sZEFuaW0gPSB0YXJnZXQuZ2V0QmVoYXZpb3JCeVR5cGUoJ0FuaW1hdGUnKTtcblx0aWYob2xkQW5pbSl7XG5cdFx0b2xkQW5pbS5jb25zdHJ1Y3RvcihvcHRzKTtcblx0XHRvbGRBbmltLmF3YWtlKHRhcmdldCk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0dGFyZ2V0LmFkZEJlaGF2aW9yKCBuZXcgQW5pbWF0ZShvcHRzKSApO1xuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEFuaW1hdGU7XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJztcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cblxuLy8gZW51bSBjb25zdGFudHNcbmxldCBUeXBlcyA9IE9iamVjdC5mcmVlemUoe1xuXHRQT0xJQ1lfTElCRVJBTDogMCxcblx0UE9MSUNZX0ZBU0NJU1Q6IDEsXG5cdFJPTEVfTElCRVJBTDogMixcblx0Uk9MRV9GQVNDSVNUOiAzLFxuXHRST0xFX0hJVExFUjogNCxcblx0UEFSVFlfTElCRVJBTDogNSxcblx0UEFSVFlfRkFTQ0lTVDogNixcblx0SkE6IDcsXG5cdE5FSU46IDgsXG5cdEJMQU5LOiA5LFxuXHRDUkVESVRTOiAxMFxufSk7XG5cbmZ1bmN0aW9uIGRpbXNUb1VWKHtzaWRlLCBsZWZ0LCByaWdodCwgdG9wLCBib3R0b219KVxue1xuXHRpZihzaWRlKVxuXHRcdHJldHVybiBbW1xuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIodG9wLCBsZWZ0KSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGJvdHRvbSwgbGVmdCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMih0b3AsIHJpZ2h0KVxuXHRcdF0sW1xuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIoYm90dG9tLCBsZWZ0KSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGJvdHRvbSwgcmlnaHQpLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIodG9wLCByaWdodClcblx0XHRdXTtcblx0ZWxzZVxuXHRcdHJldHVybiBbW1xuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIobGVmdCwgdG9wKSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIGJvdHRvbSksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihyaWdodCwgdG9wKVxuXHRcdF0sW1xuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIobGVmdCwgYm90dG9tKSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCBib3R0b20pLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIocmlnaHQsIHRvcClcblx0XHRdXTtcbn1cblxuZnVuY3Rpb24gZ2V0VVZzKHR5cGUpXG57XG5cdGxldCBkaW1zID0ge2xlZnQ6IDAsIHJpZ2h0OiAxLCBib3R0b206IDAsIHRvcDogMX07XG5cblx0c3dpdGNoKHR5cGUpXG5cdHtcblx0Y2FzZSBUeXBlcy5QT0xJQ1lfTElCRVJBTDpcblx0XHRkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuODM0LCByaWdodDogMC45OTYsIHRvcDogMC43NTQsIGJvdHRvbTogMC45OTd9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLlBPTElDWV9GQVNDSVNUOlxuXHRcdGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC42NiwgcmlnaHQ6IDAuODIyLCB0b3A6IDAuNzU0LCBib3R0b206IDAuOTk2fTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5ST0xFX0xJQkVSQUw6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjUwNSwgcmlnaHQ6IDAuNzQ2LCB0b3A6IDAuOTk2LCBib3R0b206IDAuNjV9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLlJPTEVfRkFTQ0lTVDpcblx0XHRkaW1zID0ge2xlZnQ6IDAuNTA1LCByaWdodDogMC43NDYsIHRvcDogMC42NDUsIGJvdHRvbTogMC4zfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5ST0xFX0hJVExFUjpcblx0XHRkaW1zID0ge2xlZnQ6IDAuNzU0LCByaWdodDogMC45OTYsIHRvcDogMC42NDUsIGJvdHRvbTogMC4zfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5QQVJUWV9MSUJFUkFMOlxuXHRcdGRpbXMgPSB7bGVmdDogMC4yNTUsIHJpZ2h0OiAwLjQ5NSwgdG9wOiAwLjk5NiwgYm90dG9tOiAwLjY1fTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5QQVJUWV9GQVNDSVNUOlxuXHRcdGRpbXMgPSB7bGVmdDogMC4yNTUsIHJpZ2h0OiAwLjQ5NSwgdG9wOiAwLjY0NSwgYm90dG9tOiAwLjN9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLkpBOlxuXHRcdGRpbXMgPSB7bGVmdDogMC4wMDUsIHJpZ2h0OiAwLjI0NCwgdG9wOiAwLjk5MiwgYm90dG9tOiAwLjY1M307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuTkVJTjpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMDA2LCByaWdodDogMC4yNDMsIHRvcDogMC42NDIsIGJvdHRvbTogMC4zMDJ9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLkNSRURJVFM6XG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjAxNSwgcmlnaHQ6IDAuMjc2LCB0b3A6IDAuMzk3LCBib3R0b206IDAuNzY1fTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5CTEFOSzpcblx0ZGVmYXVsdDpcblx0XHRkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuMDIyLCByaWdodDogLjAyMiswLjI0NywgdG9wOiAwLjAyMSwgYm90dG9tOiAuMDIxKzAuMzU0M307XG5cdFx0YnJlYWs7XG5cdH1cblxuXHRyZXR1cm4gZGltc1RvVVYoZGltcyk7XG59XG5cblxuY2xhc3MgQ2FyZCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHR5cGUgPSBUeXBlcy5CTEFOSywgZG91YmxlU2lkZWQgPSB0cnVlKVxuXHR7XG5cdFx0c3VwZXIoKTtcblxuXHRcdC8vIGNyZWF0ZSB0aGUgY2FyZCBmYWNlc1xuXHRcdGxldCBmcm9udEdlbyA9IG5ldyBUSFJFRS5QbGFuZUdlb21ldHJ5KC43MTUsIDEpO1xuXHRcdGxldCBiYWNrR2VvID0gZnJvbnRHZW8uY2xvbmUoKTtcblx0XHRsZXQgY2FyZE1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KTtcblx0XHRsZXQgZnJvbnQgPSBuZXcgVEhSRUUuTWVzaChmcm9udEdlbywgY2FyZE1hdCk7XG5cdFx0bGV0IGJhY2sgPSBuZXcgVEhSRUUuTWVzaChiYWNrR2VvLCBjYXJkTWF0KTtcblx0XHRiYWNrLnBvc2l0aW9uLnNldCgwLjAwMSwgMCwgMCk7XG5cdFx0ZnJvbnQucG9zaXRpb24uc2V0KC0wLjAwMSwgMCwgMCk7XG5cdFx0YmFjay5yb3RhdGVZKE1hdGguUEkpO1xuXG5cdFx0Ly8gc2V0IHRoZSBmYWNlcyB0byB0aGUgY29ycmVjdCBwYXJ0IG9mIHRoZSB0ZXh0dXJlXG5cdFx0ZnJvbnQuZ2VvbWV0cnkuZmFjZVZlcnRleFV2cyA9IFtnZXRVVnModHlwZSldO1xuXHRcdGJhY2suZ2VvbWV0cnkuZmFjZVZlcnRleFV2cyA9IFtnZXRVVnMoIGRvdWJsZVNpZGVkID8gdHlwZSA6IFR5cGVzLkJMQU5LICldO1xuXHRcdHRoaXMuc2NhbGUuc2V0U2NhbGFyKDAuNyk7XG5cdFx0dGhpcy5hZGQoZnJvbnQsIGJhY2spO1xuXHR9XG5cblx0aGlkZSgpe1xuXHRcdHRoaXMuY2hpbGRyZW4uZm9yRWFjaChvID0+IHsgby52aXNpYmxlID0gZmFsc2U7IH0pO1xuXHR9XG5cblx0c2hvdygpe1xuXHRcdHRoaXMuY2hpbGRyZW4uZm9yRWFjaChvID0+IHsgby52aXNpYmxlID0gdHJ1ZTsgfSk7XG5cdH1cbn1cblxuY2xhc3MgQmxhbmtDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7IHN1cGVyKCk7IH1cbn1cblxuY2xhc3MgQ3JlZGl0c0NhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5DUkVESVRTKTtcblx0XHRsZXQgc2VsZiA9IHRoaXM7XG5cblx0XHRmdW5jdGlvbiBzZXRWaXNpYmlsaXR5KHtkYXRhOiB7Z2FtZToge3N0YXRlfX19KXtcblx0XHRcdGlmKHN0YXRlID09PSAnc2V0dXAnKVxuXHRcdFx0XHRzZWxmLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IHRydWU7IH0pO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRzZWxmLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IGZhbHNlOyB9KTtcblx0XHR9XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBzZXRWaXNpYmlsaXR5KTtcblx0fVxufVxuXG5jbGFzcyBMaWJlcmFsUG9saWN5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlBPTElDWV9MSUJFUkFMLCBmYWxzZSk7XG5cdH1cblx0Z29Ub1Bvc2l0aW9uKHNwb3QgPSAwKVxuXHR7XG5cdFx0c3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDQsIHNwb3QpKTtcblx0XHRsZXQgcyA9IExpYmVyYWxQb2xpY3lDYXJkLnNwb3RzO1xuXHRcdEFuaW1hdGUuc3RhcnQodGhpcywge3BhcmVudDogQXNzZXRNYW5hZ2VyLnJvb3QsIHBvczogc1sncG9zXycrc3BvdF0sIHF1YXQ6IHMucXVhdCwgc2NhbGU6IHMuc2NhbGV9KTtcblx0fVxufVxuXG5MaWJlcmFsUG9saWN5Q2FyZC5zcG90cyA9IHtcblx0cG9zXzA6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNTMzLCAwLjc2LCAtMC4zMzYpLFxuXHRwb3NfMTogbmV3IFRIUkVFLlZlY3RvcjMoMC4yNjMsIDAuNzYsIC0wLjMzNiksXG5cdHBvc18yOiBuZXcgVEhSRUUuVmVjdG9yMygtLjAwNywgMC43NiwgLTAuMzM2KSxcblx0cG9zXzM6IG5ldyBUSFJFRS5WZWN0b3IzKC0uMjc5LCAwLjc2LCAtMC4zMzYpLFxuXHRwb3NfNDogbmV3IFRIUkVFLlZlY3RvcjMoLS41NTIsIDAuNzYsIC0wLjMzNiksXG5cdHF1YXQ6IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMC43MDcxMDY3ODExODY1NDc1LCAwKSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNywgMC43LCAwLjcpXG59XG5cbmNsYXNzIEZhc2Npc3RQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0ZBU0NJU1QsIGZhbHNlKTtcblx0fVxuXHRnb1RvUG9zaXRpb24oc3BvdCA9IDApXG5cdHtcblx0XHRzcG90ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oNSwgc3BvdCkpO1xuXHRcdGxldCBzID0gRmFzY2lzdFBvbGljeUNhcmQuc3BvdHM7XG5cdFx0QW5pbWF0ZS5zdGFydCh0aGlzLCB7cGFyZW50OiBBc3NldE1hbmFnZXIucm9vdCwgcG9zOiBzWydwb3NfJytzcG90XSwgcXVhdDogcy5xdWF0LCBzY2FsZTogcy5zY2FsZX0pO1xuXHR9XG59XG5cbkZhc2Npc3RQb2xpY3lDYXJkLnNwb3RzID0ge1xuXHRwb3NfMDogbmV3IFRIUkVFLlZlY3RvcjMoLS42ODcsIDAuNzYsIDAuMzQxKSxcblx0cG9zXzE6IG5ldyBUSFJFRS5WZWN0b3IzKC0uNDE3LCAwLjc2LCAwLjM0MSksXG5cdHBvc18yOiBuZXcgVEhSRUUuVmVjdG9yMygtLjE0NiwgMC43NiwgMC4zNDEpLFxuXHRwb3NfMzogbmV3IFRIUkVFLlZlY3RvcjMoMC4xMjcsIDAuNzYsIDAuMzQxKSxcblx0cG9zXzQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNDAwLCAwLjc2LCAwLjM0MSksXG5cdHBvc181OiBuZXcgVEhSRUUuVmVjdG9yMygwLjY3MywgMC43NiwgMC4zNDEpLFxuXHRxdWF0OiBuZXcgVEhSRUUuUXVhdGVybmlvbigtMC43MDcxMDY3ODExODY1NDc1LCAwLCAwLCAwLjcwNzEwNjc4MTE4NjU0NzUpLFxuXHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMC43LCAwLjcsIDAuNylcbn1cblxuY2xhc3MgTGliZXJhbFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9MSUJFUkFMLCBmYWxzZSk7XG5cdH1cbn1cblxuY2xhc3MgRmFzY2lzdFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9GQVNDSVNULCBmYWxzZSk7XG5cdH1cbn1cblxuY2xhc3MgSGl0bGVyUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5ST0xFX0hJVExFUiwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIExpYmVyYWxQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9MSUJFUkFMLCBmYWxzZSk7XG5cdH1cbn1cblxuY2xhc3MgRmFzY2lzdFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0ZBU0NJU1QsIGZhbHNlKTtcblx0fVxufVxuXG5jbGFzcyBKYUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5KQSwgZmFsc2UpO1xuXHRcdHRoaXMuY2hpbGRyZW5bMF0ucm90YXRlWigtTWF0aC5QSS8yKTtcblx0XHR0aGlzLmNoaWxkcmVuWzFdLnJvdGF0ZVooLU1hdGguUEkvMik7XG5cdH1cbn1cblxuY2xhc3MgTmVpbkNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5ORUlOLCBmYWxzZSk7XG5cdFx0dGhpcy5jaGlsZHJlblswXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xuXHRcdHRoaXMuY2hpbGRyZW5bMV0ucm90YXRlWigtTWF0aC5QSS8yKTtcblx0fVxufVxuXG5cbmV4cG9ydCB7XG5cdENhcmQsIFR5cGVzLCBCbGFua0NhcmQsIENyZWRpdHNDYXJkLFxuXHRMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFJvbGVDYXJkLFxuXHRIaXRsZXJSb2xlQ2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZFxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbmNsYXNzIFByZXNpZGVudEhhdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnRvcGhhdDtcblx0XHR0aGlzLm1vZGVsLnBvc2l0aW9uLnNldCgwLDAsMCk7XG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBlID0+IHtcblx0XHRcdGlmKGUuZGF0YS5nYW1lLnN0YXRlID09PSAnc2V0dXAnKVxuXHRcdFx0XHR0aGlzLmlkbGUoKTtcblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRTSC5pZGxlUm9vdC5yZW1vdmUodGhpcyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRpZGxlKCl7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoMC43NSwgMCwgMCk7XG5cdFx0dGhpcy5yb3RhdGlvbi5zZXQoMCwgTWF0aC5QSS8yLCAwKTtcblx0XHRTSC5pZGxlUm9vdC5hZGQodGhpcyk7XG5cdH1cbn07XG5cbmNsYXNzIENoYW5jZWxsb3JIYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy52aXNvcmNhcDtcblx0XHR0aGlzLm1vZGVsLnBvc2l0aW9uLnNldCgwLDAuMDQsMCk7XG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCBlID0+IHtcblx0XHRcdGlmKGUuZGF0YS5nYW1lLnN0YXRlID09PSAnc2V0dXAnKVxuXHRcdFx0XHR0aGlzLmlkbGUoKTtcblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRTSC5pZGxlUm9vdC5yZW1vdmUodGhpcyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRpZGxlKCl7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoLTAuNzUsIDAsIDApO1xuXHRcdHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLzIsIDApO1xuXHRcdFNILmlkbGVSb290LmFkZCh0aGlzKTtcblx0fVxufTtcblxuZXhwb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHYW1lVGFibGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0Ly8gc2F2ZSByZWZlcmVuY2VzIHRvIHRoZSB0ZXh0dXJlc1xuXHRcdHRoaXMudGV4dHVyZXMgPSBbXG5cdFx0XHRBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9zbWFsbCxcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX21lZCxcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX2xhcmdlXG5cdFx0XTtcblxuXHRcdC8vIGRlLWZsaXAgdGV4dHVyZXNcblx0XHR0aGlzLnRleHR1cmVzLmZvckVhY2godGV4ID0+IHRleC5mbGlwWSA9IGZhbHNlKTtcblxuXHRcdC8vIGFkZCB0YWJsZSBhc3NldFxuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMudGFibGU7XG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHQvLyBzZXQgdGhlIGRlZmF1bHQgbWF0ZXJpYWxcblx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1swXSwgdHJ1ZSk7XG5cblx0XHQvLyBwb3NpdGlvbiB0YWJsZVxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDAuOCwgMCk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy5jaGFuZ2VNb2RlLmJpbmQodGhpcykpO1xuXHR9XG5cblx0Y2hhbmdlTW9kZSh7ZGF0YToge2dhbWU6IHtzdGF0ZSwgdHVybk9yZGVyfX19KVxuXHR7XG5cdFx0aWYoc3RhdGUgPT09ICdzZXR1cCcpe1xuXHRcdFx0aWYodHVybk9yZGVyLmxlbmd0aCA+PSA5KVxuXHRcdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1syXSk7XG5cdFx0XHRlbHNlIGlmKHR1cm5PcmRlci5sZW5ndGggPj0gNylcblx0XHRcdFx0dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbMV0pO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1swXSk7XG5cdFx0fVxuXHR9XG5cblx0c2V0VGV4dHVyZShuZXdUZXgsIHN3aXRjaExpZ2h0bWFwKVxuXHR7XG5cdFx0dGhpcy5tb2RlbC50cmF2ZXJzZShvID0+IHtcblx0XHRcdGlmKG8gaW5zdGFuY2VvZiBUSFJFRS5NZXNoKVxuXHRcdFx0e1xuXHRcdFx0XHRpZihzd2l0Y2hMaWdodG1hcClcblx0XHRcdFx0XHRvLm1hdGVyaWFsLmxpZ2h0TWFwID0gby5tYXRlcmlhbC5tYXA7XG5cblx0XHRcdFx0by5tYXRlcmlhbC5tYXAgPSBuZXdUZXg7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbmZ1bmN0aW9uIGdldEdhbWVJZCgpXG57XG5cdC8vIGZpcnN0IGNoZWNrIHRoZSB1cmxcblx0bGV0IHJlID0gL1s/Jl1nYW1lSWQ9KFteJl0rKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcblx0aWYocmUpe1xuXHRcdHJldHVybiByZVsxXTtcblx0fVxuXHRlbHNlIGlmKGFsdHNwYWNlICYmIGFsdHNwYWNlLmluQ2xpZW50KXtcblx0XHRyZXR1cm4gU0guZW52LnNpZDtcblx0fVxuXHRlbHNlIHtcblx0XHRsZXQgaWQgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogMTAwMDAwMDAwICk7XG5cdFx0d2luZG93LmxvY2F0aW9uLnJlcGxhY2UoJz9nYW1lSWQ9JytpZCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gcGFyc2VDU1Yoc3RyKXtcblx0aWYoIXN0cikgcmV0dXJuIFtdO1xuXHRlbHNlIHJldHVybiBzdHIuc3BsaXQoJywnKTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVRdWVzdGlvbih0ZXh0LCB0ZXh0dXJlID0gbnVsbClcbntcblx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xuXG5cdC8vIHNldCB1cCBjYW52YXNcblx0bGV0IGJtcDtcblx0aWYoIXRleHR1cmUpe1xuXHRcdGJtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdGJtcC53aWR0aCA9IDUxMjtcblx0XHRibXAuaGVpZ2h0ID0gMjU2O1xuXHR9XG5cdGVsc2Uge1xuXHRcdGJtcCA9IHRleHR1cmUuaW1hZ2U7XG5cdH1cblxuXHRsZXQgZyA9IGJtcC5nZXRDb250ZXh0KCcyZCcpO1xuXHRnLmNsZWFyUmVjdCgwLCAwLCA1MTIsIDI1Nik7XG5cdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cdGcuZmlsbFN0eWxlID0gJ3doaXRlJztcblxuXHQvLyB3cml0ZSB0ZXh0XG5cdGcuZm9udCA9ICdib2xkIDUwcHggJytmb250U3RhY2s7XG5cdGxldCBsaW5lcyA9IHRleHQuc3BsaXQoJ1xcbicpO1xuXHRmb3IobGV0IGk9MDsgaTxsaW5lcy5sZW5ndGg7IGkrKyl7XG5cdFx0Zy5maWxsVGV4dChsaW5lc1tpXSwgMjU2LCA1MCs1NSppKTtcblx0fVxuXG5cdGlmKHRleHR1cmUpe1xuXHRcdHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xuXHRcdHJldHVybiB0ZXh0dXJlO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHJldHVybiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZShibXApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIG1lcmdlT2JqZWN0cyhhLCBiLCBkZXB0aD0yKVxue1xuXHRmdW5jdGlvbiB1bmlxdWUoZSwgaSwgYSl7XG5cdFx0cmV0dXJuIGEuaW5kZXhPZihlKSA9PT0gaTtcblx0fVxuXG5cdGxldCBhSXNPYmogPSBhIGluc3RhbmNlb2YgT2JqZWN0LCBiSXNPYmogPSBiIGluc3RhbmNlb2YgT2JqZWN0O1xuXHRpZihhSXNPYmogJiYgYklzT2JqICYmIGRlcHRoID4gMClcblx0e1xuXHRcdGxldCByZXN1bHQgPSB7fTtcblx0XHRsZXQga2V5cyA9IFsuLi5PYmplY3Qua2V5cyhhKSwgLi4uT2JqZWN0LmtleXMoYildLmZpbHRlcih1bmlxdWUpO1xuXHRcdGZvcihsZXQgaT0wOyBpPGtleXMubGVuZ3RoOyBpKyspe1xuXHRcdFx0cmVzdWx0W2tleXNbaV1dID0gbWVyZ2VPYmplY3RzKGFba2V5c1tpXV0sIGJba2V5c1tpXV0sIGRlcHRoLTEpO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cdGVsc2UgaWYoYiAhPT0gdW5kZWZpbmVkKVxuXHRcdHJldHVybiBiO1xuXHRlbHNlXG5cdFx0cmV0dXJuIGE7XG59XG5cbmV4cG9ydCB7IGdldEdhbWVJZCwgcGFyc2VDU1YsIGdlbmVyYXRlUXVlc3Rpb24sIG1lcmdlT2JqZWN0cyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTmFtZXBsYXRlIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3Ioc2VhdClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLnNlYXQgPSBzZWF0O1xuXG5cdFx0Ly8gYWRkIDNkIG1vZGVsXG5cdFx0dGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy5uYW1lcGxhdGUuY2hpbGRyZW5bMF0uY2xvbmUoKTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCBNYXRoLlBJLzIpO1xuXHRcdHRoaXMubW9kZWwuc2NhbGUuc2V0U2NhbGFyKDEuMjUpO1xuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xuXG5cdFx0Ly8gZ2VuZXJhdGUgbWF0ZXJpYWxcblx0XHR0aGlzLmJtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdHRoaXMuYm1wLndpZHRoID0gTmFtZXBsYXRlLnRleHR1cmVTaXplO1xuXHRcdHRoaXMuYm1wLmhlaWdodCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAvIDI7XG5cdFx0dGhpcy5tb2RlbC5tYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG5cdFx0XHRtYXA6IG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKHRoaXMuYm1wKVxuXHRcdH0pO1xuXG5cdFx0Ly8gY3JlYXRlIGxpc3RlbmVyIHByb3hpZXNcblx0XHR0aGlzLl9ob3ZlckJlaGF2aW9yID0gbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJDb2xvcih7XG5cdFx0XHRjb2xvcjogbmV3IFRIUkVFLkNvbG9yKDB4ZmZhOGE4KVxuXHRcdH0pO1xuXHRcdHRoaXMubW9kZWwuYWRkQmVoYXZpb3IodGhpcy5faG92ZXJCZWhhdmlvcik7XG5cdFx0dGhpcy5tb2RlbC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG5cdH1cblxuXHR1cGRhdGVUZXh0KHRleHQpXG5cdHtcblx0XHRsZXQgZm9udFNpemUgPSA3LzMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NTtcblxuXHRcdC8vIHNldCB1cCBjYW52YXNcblx0XHRsZXQgZyA9IHRoaXMuYm1wLmdldENvbnRleHQoJzJkJyk7XG5cdFx0bGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnO1xuXHRcdGcuZmlsbFN0eWxlID0gJyMyMjInO1xuXHRcdGcuZmlsbFJlY3QoMCwgMCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLCBOYW1lcGxhdGUudGV4dHVyZVNpemUvMik7XG5cdFx0Zy5mb250ID0gYGJvbGQgJHtmb250U2l6ZX1weCAke2ZvbnRTdGFja31gO1xuXHRcdGcudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cdFx0Zy5maWxsU3R5bGUgPSAnd2hpdGUnO1xuXHRcdGcuZmlsbFRleHQodGV4dCwgTmFtZXBsYXRlLnRleHR1cmVTaXplLzIsICgwLjQyIC0gMC4xMikqKE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yKSk7XG5cblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcC5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cdH1cblxuXG5cblx0Y2xpY2soZSlcblx0e1xuXHRcdGlmKCF0aGlzLnNlYXQub3duZXIgJiYgU0guZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJylcblx0XHRcdHRoaXMucmVxdWVzdEpvaW4oKTtcblx0XHRlbHNlIGlmKHRoaXMuc2VhdC5vd25lciA9PT0gU0gubG9jYWxVc2VyLmlkKVxuXHRcdFx0dGhpcy5yZXF1ZXN0TGVhdmUoKTtcblx0XHRlbHNlIGlmKHRoaXMuc2VhdC5vd25lciAmJiBTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxuXHRcdFx0dGhpcy5yZXF1ZXN0S2ljaygpO1xuXHR9XG5cblx0cmVxdWVzdEpvaW4oKVxuXHR7XG5cdFx0U0guc29ja2V0LmVtaXQoJ2pvaW4nLCBPYmplY3QuYXNzaWduKHtzZWF0TnVtOiB0aGlzLnNlYXQuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpO1xuXHR9XG5cblx0cmVxdWVzdExlYXZlKClcblx0e1xuXHRcdGxldCBzZWxmID0gdGhpcztcblx0XHRpZighc2VsZi5xdWVzdGlvbilcblx0XHR7XG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VsZi5zZWF0LmJhbGxvdC5hc2tRdWVzdGlvbignQXJlIHlvdSBzdXJlIHlvdVxcbndhbnQgdG8gbGVhdmU/JywgJ2xvY2FsX2xlYXZlJylcblx0XHRcdC50aGVuKGNvbmZpcm0gPT4ge1xuXHRcdFx0XHRpZihjb25maXJtKXtcblx0XHRcdFx0XHRTSC5zb2NrZXQuZW1pdCgnbGVhdmUnLCBTSC5sb2NhbFVzZXIuaWQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNlbGYucXVlc3Rpb24gPSBudWxsO1xuXHRcdFx0fSlcblx0XHRcdC5jYXRjaCgoKSA9PiB7IHNlbGYucXVlc3Rpb24gPSBudWxsOyB9KTtcblx0XHR9XG5cdH1cblxuXHRyZXF1ZXN0S2ljaygpXG5cdHtcblx0XHRsZXQgc2VsZiA9IHRoaXM7XG5cdFx0aWYoIXNlbGYucXVlc3Rpb24pXG5cdFx0e1xuXHRcdFx0bGV0IHNlYXQgPSBTSC5zZWF0c1tTSC5wbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0uc2VhdE51bV07XG5cdFx0XHRzZWxmLnF1ZXN0aW9uID0gc2VhdC5iYWxsb3QuYXNrUXVlc3Rpb24oXG5cdFx0XHRcdCdBcmUgeW91IHN1cmUgeW91XFxud2FudCB0byB0cnkgdG8ga2lja1xcbidcblx0XHRcdFx0K1NILnBsYXllcnNbc2VsZi5zZWF0Lm93bmVyXS5kaXNwbGF5TmFtZSxcblx0XHRcdFx0J2xvY2FsX2tpY2snXG5cdFx0XHQpXG5cdFx0XHQudGhlbihjb25maXJtID0+IHtcblx0XHRcdFx0aWYoY29uZmlybSl7XG5cdFx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2tpY2snLCBTSC5sb2NhbFVzZXIuaWQsIHNlbGYuc2VhdC5vd25lcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5xdWVzdGlvbiA9IG51bGw7XG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKCgpID0+IHsgc2VsZi5xdWVzdGlvbiA9IG51bGw7IH0pO1xuXHRcdH1cblx0fVxufVxuXG5OYW1lcGxhdGUudGV4dHVyZVNpemUgPSAyNTY7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qXG4qIEhhdmUgdG8gY29tcGxldGVseSByZWltcGxlbWVudCBwcm9taXNlcyBmcm9tIHNjcmF0Y2ggZm9yIHRoaXMgOihcbiogVGhpcyBjbGFzcyBpcyBhIHByb21pc2UgdGhhdCB0cmFja3MgZGVwZW5kZW5jaWVzLCBhbmQgZXZhbHVhdGVzXG4qIHdoZW4gdGhleSBhcmUgbWV0LiBJdCdzIGFsc28gY2FuY2VsbGFibGUsIGNhbGxpbmcgaXRzIGRlcGVuZGVudHNcbiogYXMgc29vbiBhcyBpdHMgZGVwZW5kZW5jaWVzIGFyZSBtZXQuXG4qL1xuY2xhc3MgQ2FzY2FkaW5nUHJvbWlzZVxue1xuICAgIGNvbnN0cnVjdG9yKHByZXJlcVByb21pc2UsIGV4ZWNGbiwgY2xlYW51cEZuKVxuICAgIHtcbiAgICAgICAgLy8gc2V0IHVwIHN0YXRlIGluZm9ybWF0aW9uXG4gICAgICAgIHRoaXMuc3RhdGUgPSAncGVuZGluZyc7XG4gICAgICAgIHRoaXMucHJlcmVxUHJvbWlzZSA9IHByZXJlcVByb21pc2UgfHwgUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIHRoaXMuZXhlY0ZuID0gZXhlY0ZuO1xuICAgICAgICB0aGlzLmNsZWFudXBGbiA9IGNsZWFudXBGbjtcblxuICAgICAgICAvLyB0cmFjayBjYWxsYmFja3NcbiAgICAgICAgdGhpcy5fcmVzb2x2ZUNhbGxiYWNrcyA9IFtdO1xuICAgICAgICB0aGlzLl9yZWplY3RDYWxsYmFja3MgPSBbXTtcbiAgICAgICAgdGhpcy5fZXhlY1R5cGUgPSBudWxsO1xuICAgICAgICB0aGlzLl9leGVjUmVzdWx0ID0gW107XG5cbiAgICAgICAgLy8gYmluZCBldmVudHNcbiAgICAgICAgbGV0IGNiID0gdGhpcy5fcHJlcmVxU2V0dGxlZC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnByZXJlcVByb21pc2UudGhlbihjYiwgY2IpO1xuICAgIH1cblxuICAgIF9wcmVyZXFTZXR0bGVkKCl7XG4gICAgICAgIGZ1bmN0aW9uIHNldHRsZSh0eXBlKXtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiguLi5hcmdzKXtcbiAgICAgICAgICAgICAgICB0aGlzLl9leGVjU2V0dGxlZCh0eXBlLCBhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHRoaXMuc3RhdGUgPT09ICdwZW5kaW5nJyl7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gJ3J1bm5pbmcnO1xuICAgICAgICAgICAgdGhpcy5leGVjRm4oXG4gICAgICAgICAgICAgICAgc2V0dGxlKCdyZXNvbHZlJykuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICBzZXR0bGUoJ3JlamVjdCcpLmJpbmQodGhpcylcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZih0aGlzLnN0YXRlID09PSAnY2FuY2VsbGVkJyl7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gJ3NldHRsZWQnO1xuICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZUNhbGxiYWNrcy5mb3JFYWNoKGNiID0+IGNiKCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgX2V4ZWNTZXR0bGVkKHR5cGUsIHJlc3VsdCl7XG4gICAgICAgIGlmKHRoaXMuc3RhdGUgPT09ICdydW5uaW5nJyl7XG4gICAgICAgICAgICB0aGlzLl9leGVjVHlwZSA9IHR5cGU7XG4gICAgICAgICAgICB0aGlzLl9leGVjUmVzdWx0ID0gcmVzdWx0O1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9ICdjbGVhbmluZ3VwJztcbiAgICAgICAgICAgIHRoaXMuY2xlYW51cEZuKHRoaXMuX2NsZWFudXBEb25lLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgX2NsZWFudXBEb25lKCl7XG4gICAgICAgIGlmKHRoaXMuc3RhdGUgPT09ICdjbGVhbmluZ3VwJyl7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gJ3NldHRsZWQnO1xuICAgICAgICAgICAgaWYodGhpcy5fZXhlY1R5cGUgPT09ICdyZXNvbHZlJyl7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZUNhbGxiYWNrcy5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAoY2IgPT4gY2IoLi4udGhpcy5fZXhlY1Jlc3VsdCkpLmJpbmQodGhpcylcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVqZWN0Q2FsbGJhY2tzLmZvckVhY2goXG4gICAgICAgICAgICAgICAgICAgIChjYiA9PiBjYiguLi50aGlzLl9leGVjUmVzdWx0KSkuYmluZCh0aGlzKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjYW5jZWwoKXtcbiAgICAgICAgaWYodGhpcy5zdGF0ZSA9PT0gJ3J1bm5pbmcnKXtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSAnY2xlYW5pbmd1cCc7XG4gICAgICAgICAgICB0aGlzLmNsZWFudXBGbih0aGlzLl9jbGVhbnVwRG9uZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKHRoaXMuc3RhdGUgPT09ICdwZW5kaW5nJyl7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gJ2NhbmNlbGxlZCc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGVuKGRvbmVDYiwgZXJyQ2IpXG4gICAge1xuICAgICAgICBpZih0aGlzLnN0YXRlID09PSAnc2V0dGxlZCcpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmKHRoaXMuX2V4ZWNUeXBlID09PSAncmVzb2x2ZScpe1xuICAgICAgICAgICAgICAgIGRvbmVDYiguLi50aGlzLl9leGVjUmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGVyckNiKC4uLnRoaXMuX2V4ZWNSZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZUNhbGxiYWNrcy5wdXNoKGRvbmVDYik7XG4gICAgICAgICAgICBpZihlcnJDYilcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWplY3RDYWxsYmFja3MucHVzaChlcnJDYik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBjYXRjaChjYil7XG4gICAgICAgIGlmKHRoaXMuc3RhdGUgPT09ICdzZXR0bGVkJyl7XG4gICAgICAgICAgICBpZih0aGlzLl9leGVjVHlwZSA9PT0gJ3JlamVjdCcpXG4gICAgICAgICAgICAgICAgY2IoLi4udGhpcy5fZXhlY1Jlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhpcy5fcmVqZWN0Q2FsbGJhY2tzLnB1c2goY2IpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQ2FzY2FkaW5nUHJvbWlzZTtcbiIsIid1c2Ugc3RyaWN0OydcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCB7IEphQ2FyZCwgTmVpbkNhcmQgfSBmcm9tICcuL2NhcmQnO1xuaW1wb3J0IHsgZ2VuZXJhdGVRdWVzdGlvbiB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IENhc2NhZGluZ1Byb21pc2UgZnJvbSAnLi9jYXNjYWRpbmdwcm9taXNlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFsbG90IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0RcbntcbiAgICBjb25zdHJ1Y3RvcihzZWF0KVxuICAgIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5zZWF0ID0gc2VhdDtcbiAgICAgICAgdGhpcy5xdWVzdGlvbnMgPSB7fTtcbiAgICAgICAgdGhpcy5sYXN0QXNrZWQgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuX3llc0NsaWNrSGFuZGxlciA9IG51bGw7XG4gICAgICAgIHRoaXMuX25vQ2xpY2tIYW5kbGVyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmphQ2FyZCA9IG5ldyBKYUNhcmQoKTtcbiAgICAgICAgdGhpcy5uZWluQ2FyZCA9IG5ldyBOZWluQ2FyZCgpO1xuICAgICAgICBbdGhpcy5qYUNhcmQsIHRoaXMubmVpbkNhcmRdLmZvckVhY2goYyA9PiB7XG4gICAgICAgICAgICBjLnBvc2l0aW9uLnNldChjIGluc3RhbmNlb2YgSmFDYXJkID8gLTAuMSA6IDAuMSwgLTAuMSwgMCk7XG4gICAgICAgICAgICBjLnJvdGF0aW9uLnNldCgwLjUsIE1hdGguUEksIDApO1xuICAgICAgICAgICAgYy5zY2FsZS5zZXRTY2FsYXIoMC4xNSk7XG4gICAgICAgICAgICBjLmhpZGUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYWRkKHRoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkKTtcblxuICAgICAgICBsZXQgZ2VvID0gbmV3IFRIUkVFLlBsYW5lQnVmZmVyR2VvbWV0cnkoMC40LCAwLjIpO1xuICAgICAgICBsZXQgbWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHt0cmFuc3BhcmVudDogdHJ1ZX0pO1xuICAgICAgICB0aGlzLnF1ZXN0aW9uID0gbmV3IFRIUkVFLk1lc2goZ2VvLCBtYXQpO1xuICAgICAgICB0aGlzLnF1ZXN0aW9uLnBvc2l0aW9uLnNldCgwLCAwLjA1LCAwKTtcbiAgICAgICAgdGhpcy5xdWVzdGlvbi5yb3RhdGlvbi5zZXQoMCwgTWF0aC5QSSwgMCk7XG4gICAgICAgIHRoaXMucXVlc3Rpb24udmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmFkZCh0aGlzLnF1ZXN0aW9uKTtcblxuICAgICAgICBTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdm90ZXNJblByb2dyZXNzJywgdGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKHtkYXRhOiB7Z2FtZSwgcGxheWVycywgdm90ZXN9fSlcbiAgICB7XG4gICAgICAgIGxldCBzZWxmID0gdGhpcztcbiAgICAgICAgaWYoIXNlbGYuc2VhdC5vd25lcikgcmV0dXJuO1xuXG4gICAgICAgIGxldCB2aXBzID0gZ2FtZS52b3Rlc0luUHJvZ3Jlc3M7XG4gICAgICAgIGxldCB2b3Rlc0ZpbmlzaGVkID0gKFNILmdhbWUudm90ZXNJblByb2dyZXNzIHx8IFtdKS5maWx0ZXIoXG4gICAgICAgICAgICBlID0+ICF2aXBzLmluY2x1ZGVzKGUpXG4gICAgICAgICk7XG5cbiAgICAgICAgdmlwcy5mb3JFYWNoKHZJZCA9PlxuICAgICAgICB7XG4gICAgICAgICAgICBsZXQgdnMgPSBbLi4udm90ZXNbdklkXS55ZXNWb3RlcnMsIC4uLnZvdGVzW3ZJZF0ubm9Wb3RlcnNdO1xuICAgICAgICAgICAgbGV0IG52ID0gdm90ZXNbdklkXS5ub25Wb3RlcnM7XG5cbiAgICAgICAgICAgIGxldCBhc2tlZCA9IHNlbGYucXVlc3Rpb25zW3ZJZF07XG4gICAgICAgICAgICBpZighYXNrZWQgJiYgIW52LmluY2x1ZGVzKHNlbGYuc2VhdC5vd25lcikgJiYgIXZzLmluY2x1ZGVzKHNlbGYuc2VhdC5vd25lcikpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbGV0IHF1ZXN0aW9uVGV4dDtcbiAgICAgICAgICAgICAgICBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdlbGVjdCcpe1xuICAgICAgICAgICAgICAgICAgICBxdWVzdGlvblRleHQgPSBwbGF5ZXJzW3ZvdGVzW3ZJZF0udGFyZ2V0MV0uZGlzcGxheU5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJ1xcbmZvciBwcmVzaWRlbnQgYW5kXFxuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgKyBwbGF5ZXJzW3ZvdGVzW3ZJZF0udGFyZ2V0Ml0uZGlzcGxheU5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJ1xcbmZvciBjaGFuY2VsbG9yPyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYodm90ZXNbdklkXS50eXBlID09PSAnam9pbicpe1xuICAgICAgICAgICAgICAgICAgICBxdWVzdGlvblRleHQgPSB2b3Rlc1t2SWRdLmRhdGEgKyAnXFxudG8gam9pbj8nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2tpY2snKXtcbiAgICAgICAgICAgICAgICAgICAgcXVlc3Rpb25UZXh0ID0gJ1ZvdGUgdG8ga2lja1xcbidcbiAgICAgICAgICAgICAgICAgICAgICAgICsgcGxheWVyc1t2b3Rlc1t2SWRdLnRhcmdldDFdLmRpc3BsYXlOYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICArICc/JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdjb25maXJtUm9sZScpe1xuICAgICAgICAgICAgICAgICAgICBxdWVzdGlvblRleHQgPSAnWW91ciByb2xlIGlzOic7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc2VsZi5hc2tRdWVzdGlvbihxdWVzdGlvblRleHQsIHZJZClcbiAgICAgICAgICAgICAgICAudGhlbihhbnN3ZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBTSC5zb2NrZXQuZW1pdCgndm90ZScsIHZJZCwgU0gubG9jYWxVc2VyLmlkLCBhbnN3ZXIpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+IGNvbnNvbGUubG9nKCdWb3RlIHNjcnViYmVkOicsIHZJZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZih2cy5pbmNsdWRlcyhzZWxmLnNlYXQub3duZXIpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmKHNlbGYucXVlc3Rpb25zW3ZJZF0pXG4gICAgICAgICAgICAgICAgICAgIHNlbGYucXVlc3Rpb25zW3ZJZF0uY2FuY2VsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZvdGVzRmluaXNoZWQuZm9yRWFjaCgodklkKSA9PiB7XG4gICAgICAgICAgICBpZihzZWxmLnF1ZXN0aW9uc1t2SWRdKVxuICAgICAgICAgICAgICAgIHNlbGYucXVlc3Rpb25zW3ZJZF0uY2FuY2VsKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFza1F1ZXN0aW9uKHFUZXh0LCBpZClcbiAgICB7XG4gICAgICAgIGxldCBzZWxmID0gdGhpcztcbiAgICAgICAgbGV0IG5ld1EgPSBuZXcgQ2FzY2FkaW5nUHJvbWlzZShzZWxmLnF1ZXN0aW9uc1tzZWxmLmxhc3RBc2tlZF0sXG4gICAgICAgICAgICAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBpcyBzdGlsbCByZWxldmFudFxuICAgICAgICAgICAgICAgIGxldCBsYXRlc3RWb3RlcyA9IFNILmdhbWUudm90ZXNJblByb2dyZXNzO1xuICAgICAgICAgICAgICAgIGlmKCEvXmxvY2FsLy50ZXN0KGlkKSAmJiAhbGF0ZXN0Vm90ZXMuaW5jbHVkZXMoaWQpKXtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBob29rIHVwIHEvYSBjYXJkc1xuICAgICAgICAgICAgICAgIHNlbGYucXVlc3Rpb24ubWF0ZXJpYWwubWFwID0gZ2VuZXJhdGVRdWVzdGlvbihxVGV4dCwgdGhpcy5xdWVzdGlvbi5tYXRlcmlhbC5tYXApO1xuICAgICAgICAgICAgICAgIHNlbGYuamFDYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCh0cnVlKSk7XG4gICAgICAgICAgICAgICAgc2VsZi5uZWluQ2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQoZmFsc2UpKTtcblxuICAgICAgICAgICAgICAgIC8vIHNob3cgdGhlIGJhbGxvdFxuICAgICAgICAgICAgICAgIHNlbGYucXVlc3Rpb24udmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgc2VsZi5qYUNhcmQuc2hvdygpO1xuICAgICAgICAgICAgICAgIHNlbGYubmVpbkNhcmQuc2hvdygpO1xuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVzcG9uZChhbnN3ZXIpe1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVyKClcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIG9ubHkgdGhlIG93bmVyIG9mIHRoZSBiYWxsb3QgaXMgYW5zd2VyaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzZWxmLnNlYXQub3duZXIgIT09IFNILmxvY2FsVXNlci5pZCkgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBzdGlsbCBtYXR0ZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGF0ZXN0Vm90ZXMgPSBTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCEvXmxvY2FsLy50ZXN0KGlkKSAmJiAhbGF0ZXN0Vm90ZXMuaW5jbHVkZXMoaWQpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKGFuc3dlcikgc2VsZi5feWVzQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBzZWxmLl9ub0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoZG9uZSkgPT4ge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBzZWxmLnF1ZXN0aW9uc1tpZF07XG4gICAgICAgICAgICAgICAgaWYoc2VsZi5sYXN0QXNrZWQgPT09IGlkKVxuICAgICAgICAgICAgICAgICAgICBzZWxmLmxhc3RBc2tlZCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICAvLyBoaWRlIHRoZSBxdWVzdGlvblxuICAgICAgICAgICAgICAgIHNlbGYuamFDYXJkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBzZWxmLm5laW5DYXJkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzZWxmLmphQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX3llc0NsaWNrSGFuZGxlcik7XG4gICAgICAgICAgICAgICAgc2VsZi5uZWluQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX25vQ2xpY2tIYW5kbGVyKTtcbiAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gYWRkIHF1ZXN0aW9uIHRvIHF1ZXVlLCByZW1vdmUgd2hlbiBkb25lXG4gICAgICAgIHNlbGYucXVlc3Rpb25zW2lkXSA9IG5ld1E7XG4gICAgICAgIHNlbGYubGFzdEFza2VkID0gaWQ7XG4gICAgICAgIGxldCBzcGxpY2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBkZWxldGUgc2VsZi5xdWVzdGlvbnNbaWRdO1xuICAgICAgICAgICAgaWYoc2VsZi5sYXN0QXNrZWQgPT09IGlkKVxuICAgICAgICAgICAgICAgIHNlbGYubGFzdEFza2VkID0gbnVsbDtcbiAgICAgICAgfTtcbiAgICAgICAgbmV3US50aGVuKHNwbGljZSwgc3BsaWNlKTtcblxuICAgICAgICByZXR1cm4gbmV3UTtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgTmFtZXBsYXRlIGZyb20gJy4vbmFtZXBsYXRlJztcbmltcG9ydCBCYWxsb3QgZnJvbSAnLi9iYWxsb3QnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTZWF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0RcbntcbiAgICBjb25zdHJ1Y3RvcihzZWF0TnVtKVxuICAgIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLnNlYXROdW0gPSBzZWF0TnVtO1xuICAgICAgICB0aGlzLm93bmVyID0gJyc7XG5cbiAgICAgICAgLy8gcG9zaXRpb24gc2VhdFxuICAgICAgICBsZXQgeCwgeT0wLjY1LCB6O1xuICAgICAgICBzd2l0Y2goc2VhdE51bSl7XG4gICAgICAgIGNhc2UgMDogY2FzZSAxOiBjYXNlIDI6XG4gICAgICAgICAgICB4ID0gLTAuODMzICsgMC44MzMqc2VhdE51bTtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24uc2V0KHgsIHksIC0xLjA1KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6IGNhc2UgNDpcbiAgICAgICAgICAgIHogPSAtMC40MzcgKyAwLjg3NCooc2VhdE51bS0zKTtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24uc2V0KDEuNDI1LCB5LCB6KTtcbiAgICAgICAgICAgIHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLzIsIDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XG4gICAgICAgICAgICB4ID0gMC44MzMgLSAwLjgzMyooc2VhdE51bS01KTtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24uc2V0KHgsIHksIDEuMDUpO1xuICAgICAgICAgICAgdGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEksIDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgODogY2FzZSA5OlxuICAgICAgICAgICAgeiA9IDAuNDM3IC0gMC44NzQqKHNlYXROdW0tOCk7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uLnNldCgtMS40MjUsIHksIHopO1xuICAgICAgICAgICAgdGhpcy5yb3RhdGlvbi5zZXQoMCwgLTEuNSpNYXRoLlBJLCAwKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5uYW1lcGxhdGUgPSBuZXcgTmFtZXBsYXRlKHRoaXMpO1xuICAgICAgICB0aGlzLm5hbWVwbGF0ZS5wb3NpdGlvbi5zZXQoMCwgLTAuNjM1LCAwLjIyKTtcbiAgICAgICAgdGhpcy5hZGQodGhpcy5uYW1lcGxhdGUpO1xuXG4gICAgICAgIHRoaXMuYmFsbG90ID0gbmV3IEJhbGxvdCh0aGlzKTtcbiAgICAgICAgdGhpcy5iYWxsb3QucG9zaXRpb24uc2V0KDAsIC0wLjMsIDAuMjUpO1xuICAgICAgICAvL3RoaXMuYmFsbG90LnJvdGF0ZVkoMC4xKTtcbiAgICAgICAgdGhpcy5hZGQodGhpcy5iYWxsb3QpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xuICAgICAgICBTSC5hZGRFdmVudExpc3RlbmVyKCdjaGVja2VkSW4nLCAoaWQgPT4ge1xuICAgICAgICAgICAgaWYodGhpcy5vd25lciA9PT0gaWQpXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lOiBTSC5nYW1lLCBwbGF5ZXJzOiBTSC5wbGF5ZXJzfX0pO1xuICAgICAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICB1cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXG5cdHtcblx0XHRsZXQgaWRzID0gZ2FtZS50dXJuT3JkZXI7XG5cbiAgICAgICAgLy8gcmVnaXN0ZXIgdGhpcyBzZWF0IGlmIGl0J3MgbmV3bHkgY2xhaW1lZFxuXHRcdGlmKCAhdGhpcy5vd25lciApXG5cdFx0e1xuXHRcdFx0Ly8gY2hlY2sgaWYgYSBwbGF5ZXIgaGFzIGpvaW5lZCBhdCB0aGlzIHNlYXRcblx0XHRcdGZvcihsZXQgaSBpbiBpZHMpe1xuXHRcdFx0XHRpZihwbGF5ZXJzW2lkc1tpXV0uc2VhdE51bSA9PSB0aGlzLnNlYXROdW0pe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm93bmVyID0gaWRzW2ldO1xuXHRcdFx0XHRcdHRoaXMubmFtZXBsYXRlLnVwZGF0ZVRleHQocGxheWVyc1tpZHNbaV1dLmRpc3BsYXlOYW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuICAgICAgICAvLyByZXNldCB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSB2YWNhdGVkXG5cdFx0aWYoICFpZHMuaW5jbHVkZXModGhpcy5vd25lcikgKVxuXHRcdHtcbiAgICAgICAgICAgIHRoaXMub3duZXIgPSAnJztcblx0XHRcdGlmKGdhbWUuc3RhdGUgPT09ICdzZXR1cCcpe1xuXHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KCc8Sm9pbj4nKTtcblx0XHRcdH1cblx0XHR9XG5cbiAgICAgICAgLy8gdXBkYXRlIGRpc2Nvbm5lY3QgY29sb3JzXG4gICAgICAgIGVsc2UgaWYoICFwbGF5ZXJzW3RoaXMub3duZXJdLmNvbm5lY3RlZCApe1xuICAgICAgICAgICAgdGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ODA4MDgwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKCBwbGF5ZXJzW3RoaXMub3duZXJdLmNvbm5lY3RlZCApe1xuICAgICAgICAgICAgdGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ZmZmZmZmKTtcbiAgICAgICAgfVxuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGF5ZXJNZXRlciBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG4gICAgY29uc3RydWN0b3IoKVxuICAgIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICBsZXQgbW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMucGxheWVybWV0ZXI7XG4gICAgICAgIG1vZGVsLnBvc2l0aW9uLnNldCgwLCAwLjE1LCAwKTtcbiAgICAgICAgbW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJLzIsIDAsIDApO1xuICAgICAgICBtb2RlbC5zY2FsZS5zZXRTY2FsYXIoMC44KTtcblxuICAgICAgICAvLyBzZXQgdXAgcmFpbmJvdyBtZXRlclxuICAgICAgICB0aGlzLnBtID0gbW9kZWwuY2hpbGRyZW5bMF0uY2hpbGRyZW5bMF07XG4gICAgICAgIHRoaXMucG0ubWF0ZXJpYWwudmVydGV4Q29sb3JzID0gVEhSRUUuVmVydGV4Q29sb3JzO1xuICAgICAgICB0aGlzLnBtLm1hdGVyaWFsLmNvbG9yLnNldCgweGZmZmZmZik7XG4gICAgICAgIHRoaXMucG0udmlzaWJsZSA9IGZhbHNlO1xuXG4gICAgICAgIC8vIHNldCB1cCBsYWJlbFxuICAgICAgICB0aGlzLmxhYmVsID0gbW9kZWwuY2hpbGRyZW5bMF0uY2hpbGRyZW5bMV07XG4gICAgICAgIHRoaXMubGFiZWwudmlzaWJsZSA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuYWRkKG1vZGVsKTtcblxuICAgICAgICAvLyBzZXQgdXAgZ2F1Z2VcbiAgICAgICAgdGhpcy5nYXVnZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuICAgICAgICB0aGlzLmdhdWdlLnBvc2l0aW9uLnNldCgwLCAwLjE1LCAwKTtcblxuICAgICAgICBsZXQgd2VkZ2VNYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe2NvbG9yOiAweGMwYzBjMH0pO1xuICAgICAgICBmb3IobGV0IGk9MDsgaTw0OyBpKyspe1xuICAgICAgICAgICAgbGV0IHdlZGdlID0gbmV3IFRIUkVFLk1lc2gobmV3IFRIUkVFLkJ1ZmZlckdlb21ldHJ5KCksIHdlZGdlTWF0KTtcbiAgICAgICAgICAgIHdlZGdlLnJvdGF0aW9uLnNldCgwLCBpKk1hdGguUEkvMiwgMCk7XG4gICAgICAgICAgICB0aGlzLmdhdWdlLmFkZCh3ZWRnZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXRNZXRlclZhbHVlKDApO1xuICAgICAgICB0aGlzLmFkZCh0aGlzLmdhdWdlKTtcblxuICAgICAgICBTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy5hZGp1c3RQbGF5ZXJDb3VudC5iaW5kKHRoaXMpKTtcbiAgICAgICAgU0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgdGhpcy5hZGp1c3RQbGF5ZXJDb3VudC5iaW5kKHRoaXMpKTtcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMub25jbGljay5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICBzZXRNZXRlclZhbHVlKHZhbClcbiAgICB7XG4gICAgICAgIHRoaXMucG0udmlzaWJsZSA9IHZhbCA+PSAxO1xuICAgICAgICB0aGlzLmxhYmVsLnZpc2libGUgPSB2YWwgPj0gNTtcblxuICAgICAgICBsZXQgd2VkZ2VHZW8gPSBuZXcgVEhSRUUuQ3lsaW5kZXJCdWZmZXJHZW9tZXRyeShcbiAgICAgICAgICAgIDAuNCwgMC40LCAwLjE1LCA0MCwgMSwgZmFsc2UsIC1NYXRoLlBJLzQsICh2YWwvMTApKk1hdGguUEkvMlxuICAgICAgICApO1xuICAgICAgICB0aGlzLmdhdWdlLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8uZ2VvbWV0cnkgPSB3ZWRnZUdlbzsgfSk7XG4gICAgfVxuXG4gICAgYWRqdXN0UGxheWVyQ291bnQoe2RhdGE6IHtnYW1lOiB7dHVybk9yZGVyLCBzdGF0ZX19fSlcbiAgICB7XG4gICAgICAgIGlmKHN0YXRlID09PSAnc2V0dXAnKXtcbiAgICAgICAgICAgIHRoaXMuc2V0TWV0ZXJWYWx1ZSh0dXJuT3JkZXIubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0TWV0ZXJWYWx1ZSgwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uY2xpY2soZXZ0KVxuICAgIHtcbiAgICAgICAgbGV0IHRvID0gU0guZ2FtZS50dXJuT3JkZXI7XG4gICAgICAgIGlmKFNILmdhbWUuc3RhdGUgPT09ICdzZXR1cCcgJiYgdG8ubGVuZ3RoID49IDUgJiYgdG8ubGVuZ3RoIDw9IDEwXG4gICAgICAgICAgICAmJiB0by5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxuICAgICAgICB7XG4gICAgICAgICAgICBTSC5zb2NrZXQuZW1pdCgnc3RhcnQnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCAqIGFzIENhcmRzIGZyb20gJy4vY2FyZCc7XG5pbXBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfSBmcm9tICcuL2hhdHMnO1xuaW1wb3J0IEdhbWVUYWJsZSBmcm9tICcuL3RhYmxlJztcbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IHsgZ2V0R2FtZUlkLCBtZXJnZU9iamVjdHMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnO1xuaW1wb3J0IFNlYXQgZnJvbSAnLi9zZWF0JztcbmltcG9ydCBQbGF5ZXJNZXRlciBmcm9tICcuL3BsYXllcm1ldGVyJztcblxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmFzc2V0cyA9IEFzc2V0TWFuYWdlci5tYW5pZmVzdDtcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcblx0XHR0aGlzLm5lZWRzU2tlbGV0b24gPSB0cnVlO1xuXG5cdFx0Ly8gcG9seWZpbGwgZ2V0VXNlciBmdW5jdGlvblxuXHRcdGlmKCFhbHRzcGFjZS5pbkNsaWVudCl7XG5cdFx0XHRhbHRzcGFjZS5nZXRVc2VyID0gKCkgPT4ge1xuXHRcdFx0XHRsZXQgaWQsIHJlID0gL1s/Jl11c2VySWQ9KFxcZCspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRcdFx0XHRpZihyZSlcblx0XHRcdFx0XHRpZCA9IHJlWzFdO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0aWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCkudG9TdHJpbmcoKTtcblxuXHRcdFx0XHRhbHRzcGFjZS5fbG9jYWxVc2VyID0ge1xuXHRcdFx0XHRcdHVzZXJJZDogaWQsXG5cdFx0XHRcdFx0ZGlzcGxheU5hbWU6IGlkLFxuXHRcdFx0XHRcdGlzTW9kZXJhdG9yOiAvaXNNb2RlcmF0b3IvLnRlc3Qod2luZG93LmxvY2F0aW9uLnNlYXJjaClcblx0XHRcdFx0fTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ01hc3F1ZXJhZGluZyBhcycsIGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xuXHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGFsdHNwYWNlLl9sb2NhbFVzZXIpO1xuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyBnZXQgbG9jYWwgdXNlclxuXHRcdGFsdHNwYWNlLmdldFVzZXIoKS50aGVuKCh1c2VyID0+XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2NhbFVzZXIgPSB7XG5cdFx0XHRcdGlkOiB1c2VyLnVzZXJJZCxcblx0XHRcdFx0ZGlzcGxheU5hbWU6IHVzZXIuZGlzcGxheU5hbWUsXG5cdFx0XHRcdGlzTW9kZXJhdG9yOiB1c2VyLmlzTW9kZXJhdG9yXG5cdFx0XHR9O1xuXHRcdH0pLmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5nYW1lID0ge307XG5cdFx0dGhpcy5wbGF5ZXJzID0ge307XG5cdFx0dGhpcy52b3RlcyA9IHt9O1xuXHR9XG5cblx0aW5pdGlhbGl6ZShlbnYsIHJvb3QsIGFzc2V0cylcblx0e1xuXHRcdC8vIHNoYXJlIHRoZSBkaW9yYW1hIGluZm9cblx0XHRBc3NldE1hbmFnZXIuY2FjaGUgPSBhc3NldHM7XG5cdFx0dGhpcy5lbnYgPSBlbnY7XG5cblx0XHQvLyBjb25uZWN0IHRvIHNlcnZlclxuXHRcdHRoaXMuc29ja2V0ID0gaW8uY29ubmVjdCgnLycsIHtxdWVyeTogJ2dhbWVJZD0nK2dldEdhbWVJZCgpfSk7XG5cblx0XHQvLyBjcmVhdGUgdGhlIHRhYmxlXG5cdFx0dGhpcy50YWJsZSA9IG5ldyBHYW1lVGFibGUoKTtcblx0XHR0aGlzLmFkZCh0aGlzLnRhYmxlKTtcblxuXHRcdHRoaXMucmVzZXRCdXR0b24gPSBuZXcgVEhSRUUuTWVzaChcblx0XHRcdG5ldyBUSFJFRS5Cb3hHZW9tZXRyeSguMjUsLjI1LC4yNSksXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogYXNzZXRzLnRleHR1cmVzLnJlc2V0fSlcblx0XHQpO1xuXHRcdHRoaXMucmVzZXRCdXR0b24ucG9zaXRpb24uc2V0KDAsIC0wLjE4LCAwKTtcblx0XHR0aGlzLnJlc2V0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5zZW5kUmVzZXQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy50YWJsZS5hZGQodGhpcy5yZXNldEJ1dHRvbik7XG5cblx0XHQvLyBjcmVhdGUgaWRsZSBkaXNwbGF5XG5cdFx0dGhpcy5pZGxlUm9vdCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuXHRcdHRoaXMuaWRsZVJvb3QucG9zaXRpb24uc2V0KDAsIDEuODUsIDApO1xuXHRcdHRoaXMuaWRsZVJvb3QuYWRkQmVoYXZpb3IobmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuU3Bpbih7c3BlZWQ6IDAuMDAwMn0pKTtcblx0XHR0aGlzLmFkZCh0aGlzLmlkbGVSb290KTtcblxuXHRcdC8vIGNyZWF0ZSBpZGxlIHNsaWRlc2hvd1xuXHRcdGxldCBjcmVkaXRzID0gbmV3IENhcmRzLkNyZWRpdHNDYXJkKCk7XG5cdFx0dGhpcy5pZGxlUm9vdC5hZGQoY3JlZGl0cyk7XG5cblx0XHQvLyBjcmVhdGUgaGF0c1xuXHRcdHRoaXMucHJlc2lkZW50SGF0ID0gbmV3IFByZXNpZGVudEhhdCgpO1xuXHRcdHRoaXMuY2hhbmNlbGxvckhhdCA9IG5ldyBDaGFuY2VsbG9ySGF0KCk7XG5cblx0XHQvLyBjcmVhdGUgcG9zaXRpb25zXG5cdFx0dGhpcy5zZWF0cyA9IFtdO1xuXHRcdGZvcihsZXQgaT0wOyBpPDEwOyBpKyspe1xuXHRcdFx0dGhpcy5zZWF0cy5wdXNoKCBuZXcgU2VhdChpKSApO1xuXHRcdH1cblxuXHRcdHRoaXMudGFibGUuYWRkKC4uLnRoaXMuc2VhdHMpO1xuXG5cdFx0dGhpcy5wbGF5ZXJNZXRlciA9IG5ldyBQbGF5ZXJNZXRlcigpO1xuXHRcdHRoaXMudGFibGUuYWRkKHRoaXMucGxheWVyTWV0ZXIpO1xuXG5cdFx0Ly8gYWRkIGF2YXRhciBmb3Igc2NhbGVcblx0XHRhc3NldHMubW9kZWxzLmR1bW15LnBvc2l0aW9uLnNldCgwLCAtMC4xMiwgMS4xKTtcblx0XHRhc3NldHMubW9kZWxzLmR1bW15LnJvdGF0ZVooTWF0aC5QSSk7XG5cdFx0dGhpcy5hZGQoYXNzZXRzLm1vZGVscy5kdW1teSk7XG5cblx0XHR0aGlzLnNvY2tldC5vbigndXBkYXRlJywgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuc29ja2V0Lm9uKCdjaGVja2VkSW4nLCB0aGlzLmNoZWNrZWRJbi5iaW5kKHRoaXMpKTtcblxuXHRcdHRoaXMuc29ja2V0Lm9uKCdyZXNldCcsIHRoaXMuZG9SZXNldC5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLnNvY2tldC5vbignZGlzY29ubmVjdCcsIHRoaXMuZG9SZXNldC5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZUZyb21TZXJ2ZXIoZ2QsIHBkLCB2ZClcblx0e1xuXHRcdGNvbnNvbGUubG9nKGdkLCBwZCwgdmQpO1xuXG5cdFx0bGV0IGdhbWUgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdhbWUsIGdkKTtcblx0XHRsZXQgcGxheWVycyA9IG1lcmdlT2JqZWN0cyh0aGlzLnBsYXllcnMsIHBkIHx8IHt9KTtcblx0XHRsZXQgdm90ZXMgPSBtZXJnZU9iamVjdHModGhpcy52b3RlcywgdmQgfHwge30pO1xuXG5cdFx0Zm9yKGxldCBmaWVsZCBpbiBnZClcblx0XHR7XG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe1xuXHRcdFx0XHR0eXBlOiAndXBkYXRlXycrZmllbGQsXG5cdFx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0Z2FtZTogZ2FtZSxcblx0XHRcdFx0XHRwbGF5ZXJzOiBwbGF5ZXJzLFxuXHRcdFx0XHRcdHZvdGVzOiB2b3Rlc1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZihwbGF5ZXJzW3RoaXMubG9jYWxVc2VyLmlkXSAmJiAhcGxheWVyc1t0aGlzLmxvY2FsVXNlci5pZF0uY29ubmVjdGVkKXtcblx0XHRcdHRoaXMuc29ja2V0LmVtaXQoJ2NoZWNrSW4nLCB0aGlzLmxvY2FsVXNlcik7XG5cdFx0fVxuXG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcblx0XHR0aGlzLnBsYXllcnMgPSBwbGF5ZXJzO1xuXHRcdHRoaXMudm90ZXMgPSB2b3Rlcztcblx0fVxuXG5cdGNoZWNrZWRJbihwKVxuXHR7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLnBsYXllcnNbcC5pZF0sIHApO1xuXHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHR0eXBlOiAnY2hlY2tlZEluJyxcblx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxuXHRcdFx0ZGF0YTogcC5pZFxuXHRcdH0pO1xuXHR9XG5cblx0c2VuZFJlc2V0KGUpe1xuXHRcdGlmKHRoaXMubG9jYWxVc2VyLmlzTW9kZXJhdG9yKXtcblx0XHRcdGNvbnNvbGUubG9nKCdyZXF1ZXN0aW5nIHJlc2V0Jyk7XG5cdFx0XHR0aGlzLnNvY2tldC5lbWl0KCdyZXNldCcpO1xuXHRcdH1cblx0fVxuXG5cdGRvUmVzZXQoKVxuXHR7XG5cdFx0aWYoIC8mY2FjaGVCdXN0PVxcZCskLy50ZXN0KHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpICl7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24uc2VhcmNoICs9ICcxJztcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24uc2VhcmNoICs9ICcmY2FjaGVCdXN0PTEnO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgU2VjcmV0SGl0bGVyKCk7XG4iXSwibmFtZXMiOlsic3VwZXIiLCJsZXQiLCJBc3NldE1hbmFnZXIiLCJ0aGlzIiwiQ2FyZHMuQ3JlZGl0c0NhcmQiXSwibWFwcGluZ3MiOiI7OztBQUVBLFNBQWU7Q0FDZCxRQUFRLEVBQUU7RUFDVCxNQUFNLEVBQUU7R0FDUCxLQUFLLEVBQUUseUJBQXlCO0dBQ2hDLFNBQVMsRUFBRSw0QkFBNEI7R0FDdkMsTUFBTSxFQUFFLDBCQUEwQjtHQUNsQyxRQUFRLEVBQUUsNkJBQTZCO0dBQ3ZDLEtBQUssRUFBRSx5QkFBeUI7R0FDaEMsV0FBVyxFQUFFLCtCQUErQjtHQUM1QztFQUNELFFBQVEsRUFB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QUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0VBQ3pFLE1BQU07Q0FDUCxLQUFLLEtBQUssQ0FBQyxZQUFZO0VBQ3RCLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztFQUM3RCxNQUFNO0NBQ1AsS0FBSyxLQUFLLENBQUMsWUFBWTtFQUN0QixJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDNUQsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLFdBQVc7RUFDckIsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQzVELE1BQU07Q0FDUCxLQUFLLEtBQUssQ0FBQyxhQUFhO0VBQ3ZCLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztFQUM3RCxNQUFNO0NBQ1AsS0FBSyxLQUFLLENBQUMsYUFBYTtFQUN2QixJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDNUQsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLEVBQUU7RUFDWixJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDOUQsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLElBQUk7RUFDZCxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDOUQsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLE9BQU87RUFDakIsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDMUUsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLEtBQUssQ0FBQztDQUNqQjtFQUNDLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDckYsTUFBTTtFQUNOOztDQUVELE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQ3RCOzs7QUFHRCxJQUFNLElBQUksR0FBdUI7Q0FDakMsYUFDWSxDQUFDLElBQWtCLEVBQUUsV0FBa0I7Q0FDbEQ7NkJBRGdCLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBYTsyQ0FBQSxHQUFHLElBQUk7O0VBRWpERCxVQUFLLEtBQUEsQ0FBQyxJQUFBLENBQUMsQ0FBQzs7O0VBR1JDLElBQUksUUFBUSxHQUFHLElBQUksS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDaERBLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUMvQkEsSUFBSSxPQUFPLEdBQUcsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLEVBQUVDLEVBQVksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7RUFDcEZELElBQUksS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7RUFDOUNBLElBQUksSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7RUFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUMvQixLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7OztFQUd0QixLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzlDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxHQUFHLENBQUMsTUFBTSxFQUFFLFdBQVcsR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7RUFDM0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDMUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDdEI7Ozs7bUNBQUE7O0NBRUQsZUFBQSxJQUFJLG1CQUFFO0VBQ0wsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBQSxDQUFDLEVBQUMsRUFBSyxDQUFDLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUNuRCxDQUFBOztDQUVELGVBQUEsSUFBSSxtQkFBRTtFQUNMLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQyxFQUFDLEVBQUssQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDbEQsQ0FBQTs7O0VBN0JpQixLQUFLLENBQUMsUUE4QnhCLEdBQUE7O0FBRUQsQUFBNkIsQUFJN0IsSUFBTSxXQUFXLEdBQWE7Q0FBQyxvQkFDbkIsRUFBRTtFQUNaRCxJQUFLLEtBQUEsQ0FBQyxNQUFBLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztFQUNyQkMsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDOztFQUVoQixTQUFTLGFBQWEsQ0FBQyxHQUFBLENBQXdCO09BQVQsS0FBSzs7R0FDMUMsR0FBRyxLQUFLLEtBQUssT0FBTztJQUNuQixFQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQyxFQUFDLEVBQUssQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQTs7SUFFbEQsRUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUMsRUFBQyxFQUFLLENBQUMsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUE7R0FDcEQ7O0VBRUQsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQztFQUNuRDs7OztpREFBQTs7O0VBYndCLElBY3pCLEdBQUE7O0FBRUQsSUFBTSxpQkFBaUIsR0FBYTtDQUFDLDBCQUN6QixFQUFFO0VBQ1pELElBQUssS0FBQSxDQUFDLE1BQUEsS0FBSyxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQztFQUNuQzs7Ozs2REFBQTtDQUNELDRCQUFBLFlBQVksMEJBQUMsSUFBUTtDQUNyQjs2QkFEaUIsR0FBRyxDQUFDOztFQUVwQixJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUN0Q0MsSUFBSSxDQUFDLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDO0VBQ2hDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFQyxFQUFZLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztFQUNwRyxDQUFBOzs7RUFUOEIsSUFVL0IsR0FBQTs7QUFFRCxpQkFBaUIsQ0FBQyxLQUFLLEdBQUc7Q0FDekIsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDO0NBQzdDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQztDQUM3QyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQztDQUM3QyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQztDQUM3QyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQztDQUM3QyxJQUFJLEVBQUUsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7Q0FDeEUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztDQUN2QyxDQUFBOztBQUVELElBQU0saUJBQWlCLEdBQWE7Q0FBQywwQkFDekIsRUFBRTtFQUNaRixJQUFLLEtBQUEsQ0FBQyxNQUFBLEtBQUssQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDbkM7Ozs7NkRBQUE7Q0FDRCw0QkFBQSxZQUFZLDBCQUFDLElBQVE7Q0FDckI7NkJBRGlCLEdBQUcsQ0FBQzs7RUFFcEIsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDdENDLElBQUksQ0FBQyxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQztFQUNoQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRUMsRUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7RUFDcEcsQ0FBQTs7O0VBVDhCLElBVS9CLEdBQUE7O0FBRUQsaUJBQWlCLENBQUMsS0FBSyxHQUFHO0NBQ3pCLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQztDQUM1QyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUM7Q0FDNUMsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDO0NBQzVDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUM7Q0FDNUMsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQztDQUM1QyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDO0NBQzVDLElBQUksRUFBRSxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLGtCQUFrQixDQUFDO0NBQ3pFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7Q0FDdkMsQ0FBQTs7QUFFRCxBQUFtQyxBQU1uQyxBQUFtQyxBQU1uQyxBQUFrQyxBQU1sQyxBQUFvQyxBQU1wQyxBQUFvQyxBQU1wQyxJQUFNLE1BQU0sR0FBYTtDQUFDLGVBQ2QsRUFBRTtFQUNaRixJQUFLLEtBQUEsQ0FBQyxNQUFBLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDdkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3JDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNyQzs7Ozt1Q0FBQTs7O0VBTG1CLElBTXBCLEdBQUE7O0FBRUQsSUFBTSxRQUFRLEdBQWE7Q0FBQyxpQkFDaEIsRUFBRTtFQUNaQSxJQUFLLEtBQUEsQ0FBQyxNQUFBLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3JDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNyQzs7OzsyQ0FBQTs7O0VBTHFCLElBTXRCLEdBQUEsQUFHRCxBQUlFOztBQzNPRixJQUFNLFlBQVksR0FBdUI7Q0FDekMscUJBQ1ksRUFBRTs7O0VBQ1pBLFVBQUssS0FBQSxDQUFDLElBQUEsQ0FBQyxDQUFDO0VBQ1IsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7RUFDcEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDL0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQzFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDOztFQUVyQixFQUFFLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLFVBQUEsQ0FBQyxFQUFDO0dBQ3JDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLE9BQU87SUFDL0IsRUFBQUcsTUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUE7UUFDUjtJQUNKLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDQSxNQUFJLENBQUMsQ0FBQztJQUN6QjtHQUNELENBQUMsQ0FBQztFQUNIOzs7O21EQUFBOztDQUVELHVCQUFBLElBQUksbUJBQUU7RUFDTCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNuQyxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUN0QixDQUFBOzs7RUF0QnlCLEtBQUssQ0FBQyxRQXVCaEMsR0FBQSxBQUFDOztBQUVGLElBQU0sYUFBYSxHQUF1QjtDQUMxQyxzQkFDWSxFQUFFOzs7RUFDWkgsVUFBSyxLQUFBLENBQUMsSUFBQSxDQUFDLENBQUM7RUFDUixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztFQUN0QyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNsQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDMUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7O0VBRXJCLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsVUFBQSxDQUFDLEVBQUM7R0FDckMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssT0FBTztJQUMvQixFQUFBRyxNQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBQTtRQUNSO0lBQ0osRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUNBLE1BQUksQ0FBQyxDQUFDO0lBQ3pCO0dBQ0QsQ0FBQyxDQUFDO0VBQ0g7Ozs7cURBQUE7O0NBRUQsd0JBQUEsSUFBSSxtQkFBRTtFQUNMLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUMvQixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNwQyxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUN0QixDQUFBOzs7RUF0QjBCLEtBQUssQ0FBQyxRQXVCakMsR0FBQSxBQUFDLEFBRUYsQUFBdUM7O0FDbER2QyxJQUFxQixTQUFTLEdBQXVCO0NBQ3JELGtCQUNZO0NBQ1g7RUFDQ0gsVUFBSyxLQUFBLENBQUMsSUFBQSxDQUFDLENBQUM7OztFQUdSLElBQUksQ0FBQyxRQUFRLEdBQUc7R0FDZixFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUFXO0dBQzdCLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVM7R0FDM0IsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVztHQUM3QixDQUFDOzs7RUFHRixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFBLEdBQUcsRUFBQyxTQUFHLEdBQUcsQ0FBQyxLQUFLLEdBQUcsS0FBSyxHQUFBLENBQUMsQ0FBQzs7O0VBR2hELElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0VBQ25DLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUNqQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzs7O0VBR3JCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQzs7O0VBR3hDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7O0VBRTdCLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ3BFOzs7OzZDQUFBOztDQUVELG9CQUFBLFVBQVUsd0JBQUMsR0FBQTtDQUNYO3NCQUR5QixhQUFDLENBQUE7TUFBQSxLQUFLLHVCQUFFO01BQUEsU0FBUzs7RUFFekMsR0FBRyxLQUFLLEtBQUssT0FBTyxDQUFDO0dBQ3BCLEdBQUcsU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDO0lBQ3ZCLEVBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQTtRQUM5QixHQUFHLFNBQVMsQ0FBQyxNQUFNLElBQUksQ0FBQztJQUM1QixFQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUE7O0lBRWxDLEVBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQTtHQUNuQztFQUNELENBQUE7O0NBRUQsb0JBQUEsVUFBVSx3QkFBQyxNQUFNLEVBQUUsY0FBYztDQUNqQztFQUNDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQUEsQ0FBQyxFQUFDO0dBQ3JCLEdBQUcsQ0FBQyxZQUFZLEtBQUssQ0FBQyxJQUFJO0dBQzFCO0lBQ0MsR0FBRyxjQUFjO0tBQ2hCLEVBQUEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBQTs7SUFFdEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDO0lBQ3hCO0dBQ0QsQ0FBQyxDQUFDO0VBQ0gsQ0FBQTs7O0VBckRxQyxLQUFLLENBQUMsUUFzRDVDLEdBQUEsQUFBQzs7QUN2REYsU0FBUyxTQUFTO0FBQ2xCOztDQUVDQyxJQUFJLEVBQUUsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUMzRCxHQUFHLEVBQUUsQ0FBQztFQUNMLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ2I7TUFDSSxHQUFHLFFBQVEsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDO0VBQ3JDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7RUFDbEI7TUFDSTtFQUNKQSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxTQUFTLEVBQUUsQ0FBQztFQUNqRCxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDdkM7Q0FDRDs7QUFFRCxBQUtBLFNBQVMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQWM7QUFDOUM7a0NBRHVDLEdBQUcsSUFBSTs7Q0FFN0NBLElBQUksU0FBUyxHQUFHLGdEQUFnRCxDQUFDOzs7Q0FHakVBLElBQUksR0FBRyxDQUFDO0NBQ1IsR0FBRyxDQUFDLE9BQU8sQ0FBQztFQUNYLEdBQUcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQ3ZDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDO0VBQ2hCLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO0VBQ2pCO01BQ0k7RUFDSixHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztFQUNwQjs7Q0FFREEsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUM3QixDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0NBQzVCLENBQUMsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO0NBQ3ZCLENBQUMsQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDOzs7Q0FHdEIsQ0FBQyxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDO0NBQ2hDQSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQzdCLElBQUlBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQztFQUNoQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNuQzs7Q0FFRCxHQUFHLE9BQU8sQ0FBQztFQUNWLE9BQU8sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0VBQzNCLE9BQU8sT0FBTyxDQUFDO0VBQ2Y7TUFDSTtFQUNKLE9BQU8sSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ3BDO0NBQ0Q7O0FBRUQsU0FBUyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFPO0FBQ25DOzhCQURpQyxDQUFDLENBQUM7O0NBRWxDLFNBQVMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ3ZCLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDMUI7O0NBRURBLElBQUksTUFBTSxHQUFHLENBQUMsWUFBWSxNQUFNLEVBQUUsTUFBTSxHQUFHLENBQUMsWUFBWSxNQUFNLENBQUM7Q0FDL0QsR0FBRyxNQUFNLElBQUksTUFBTSxJQUFJLEtBQUssR0FBRyxDQUFDO0NBQ2hDO0VBQ0NBLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztFQUNoQkEsSUFBSSxJQUFJLEdBQUcsTUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBRSxNQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0VBQ2pFLElBQUlBLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQztHQUMvQixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ2hFO0VBQ0QsT0FBTyxNQUFNLENBQUM7RUFDZDtNQUNJLEdBQUcsQ0FBQyxLQUFLLFNBQVM7RUFDdEIsRUFBQSxPQUFPLENBQUMsQ0FBQyxFQUFBOztFQUVULEVBQUEsT0FBTyxDQUFDLENBQUMsRUFBQTtDQUNWLEFBRUQsQUFBK0Q7O0FDOUUvRCxJQUFxQixTQUFTLEdBQXVCO0NBQ3JELGtCQUNZLENBQUMsSUFBSTtDQUNoQjtFQUNDRCxVQUFLLEtBQUEsQ0FBQyxJQUFBLENBQUMsQ0FBQzs7RUFFUixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzs7O0VBR2pCLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUMzRCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNsRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDakMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7OztFQUdyQixJQUFJLENBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDNUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQztFQUN2QyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztFQUM1QyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQztHQUNqRCxHQUFHLEVBQUUsSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7R0FDdEMsQ0FBQyxDQUFDOzs7RUFHSCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDO0dBQ2pFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO0dBQ2hDLENBQUMsQ0FBQztFQUNILElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztFQUM1QyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQy9EOzs7OzZDQUFBOztDQUVELG9CQUFBLFVBQVUsd0JBQUMsSUFBSTtDQUNmO0VBQ0NDLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsU0FBUyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7OztFQUduREEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDbENBLElBQUksU0FBUyxHQUFHLGdEQUFnRCxDQUFDO0VBQ2pFLENBQUMsQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDO0VBQ3JCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDakUsQ0FBQyxDQUFDLElBQUksR0FBRyxPQUFNLEdBQUUsUUFBUSxRQUFJLEdBQUUsU0FBUyxDQUFHO0VBQzNDLENBQUMsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO0VBQ3ZCLENBQUMsQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO0VBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztFQUVuRixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztFQUMzQyxDQUFBOzs7O0NBSUQsb0JBQUEsS0FBSyxtQkFBQyxDQUFDO0NBQ1A7RUFDQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssT0FBTztHQUMvQyxFQUFBLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFBO09BQ2YsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUU7R0FDMUMsRUFBQSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBQTtPQUNoQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztHQUNyRSxFQUFBLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFBO0VBQ3BCLENBQUE7O0NBRUQsb0JBQUEsV0FBVztDQUNYO0VBQ0MsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztFQUNsRixDQUFBOztDQUVELG9CQUFBLFlBQVk7Q0FDWjtFQUNDQSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7RUFDaEIsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRO0VBQ2pCO0dBQ0MsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsa0NBQWtDLEVBQUUsYUFBYSxDQUFDO0lBQzlGLElBQUksQ0FBQyxVQUFBLE9BQU8sRUFBQztJQUNiLEdBQUcsT0FBTyxDQUFDO0tBQ1YsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDekM7SUFDRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUNyQixDQUFDO0lBQ0QsS0FBSyxDQUFDLFlBQUcsRUFBSyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztHQUN4QztFQUNELENBQUE7O0NBRUQsb0JBQUEsV0FBVztDQUNYO0VBQ0NBLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztFQUNoQixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVE7RUFDakI7R0FDQ0EsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDekQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVc7SUFDdEMseUNBQXlDO0tBQ3hDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxXQUFXO0lBQ3hDLFlBQVk7SUFDWjtJQUNBLElBQUksQ0FBQyxVQUFBLE9BQU8sRUFBQztJQUNiLEdBQUcsT0FBTyxDQUFDO0tBQ1YsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDekQ7SUFDRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUNyQixDQUFDO0lBQ0QsS0FBSyxDQUFDLFlBQUcsRUFBSyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztHQUN4QztFQUNELENBQUE7OztFQW5HcUMsS0FBSyxDQUFDLFFBb0c1Qzs7QUFFRCxTQUFTLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQzs7Ozs7Ozs7QUNuRzVCLElBQU0sZ0JBQWdCLEdBQ3RCLHlCQUNlLENBQUMsYUFBYSxFQUFFLE1BQU0sRUFBRSxTQUFTO0FBQ2hEOztJQUVJLElBQVEsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0lBQzNCLElBQVEsQ0FBQyxhQUFhLEdBQUcsYUFBYSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM1RCxJQUFRLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN6QixJQUFRLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQzs7O0lBRy9CLElBQVEsQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLENBQUM7SUFDaEMsSUFBUSxDQUFDLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztJQUMvQixJQUFRLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztJQUMxQixJQUFRLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQzs7O0lBRzFCLElBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVDLElBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztDQUNuQyxDQUFBOztBQUVMLDJCQUFJLGNBQWMsNkJBQUU7SUFDaEIsU0FBYSxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ3JCLE9BQVcsVUFBaUI7Ozs7WUFDeEIsSUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDakM7S0FDSjs7SUFFTCxHQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDO1FBQzVCLElBQVEsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQVEsQ0FBQyxNQUFNO1lBQ1gsTUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDaEMsTUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDOUIsQ0FBQztLQUNMO1NBQ0ksR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFdBQVcsQ0FBQztRQUNuQyxJQUFRLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFRLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLFVBQUEsRUFBRSxFQUFDLFNBQUcsRUFBRSxFQUFFLEdBQUEsQ0FBQyxDQUFDO0tBQzlDO0NBQ0osQ0FBQTs7QUFFTCwyQkFBSSxZQUFZLDBCQUFDLElBQUksRUFBRSxNQUFNLENBQUM7SUFDMUIsR0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQztRQUM1QixJQUFRLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUMxQixJQUFRLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQztRQUM5QixJQUFRLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQztRQUM5QixJQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDaEQ7Q0FDSixDQUFBOztBQUVMLDJCQUFJLFlBQVksMkJBQUU7OztJQUNkLEdBQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxZQUFZLENBQUM7UUFDL0IsSUFBUSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7UUFDM0IsR0FBTyxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQztZQUNoQyxJQUFRLENBQUMsaUJBQWlCLENBQUMsT0FBTztnQkFDOUIsQ0FBSyxVQUFBLEVBQUUsRUFBQyxTQUFHLEVBQUUsTUFBQSxDQUFDLFFBQUEsTUFBTyxDQUFDLFdBQVcsQ0FBQyxHQUFBLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2FBQzdDLENBQUM7U0FDTDthQUNJO1lBQ0wsSUFBUSxDQUFDLGdCQUFnQixDQUFDLE9BQU87Z0JBQzdCLENBQUssVUFBQSxFQUFFLEVBQUMsU0FBRyxFQUFFLE1BQUEsQ0FBQyxRQUFBLE1BQU8sQ0FBQyxXQUFXLENBQUMsR0FBQSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQzthQUM3QyxDQUFDO1NBQ0w7S0FDSjtDQUNKLENBQUE7O0FBRUwsMkJBQUksTUFBTSxxQkFBRTtJQUNSLEdBQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLENBQUM7UUFDNUIsSUFBUSxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUM7UUFDOUIsSUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ2hEO1NBQ0ksR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQztRQUNqQyxJQUFRLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQztLQUM1QjtDQUNKLENBQUE7O0FBRUwsMkJBQUksSUFBSSxrQkFBQyxNQUFNLEVBQUUsS0FBSztBQUN0QjtJQUNJLEdBQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTO0lBQy9CO1FBQ0ksR0FBTyxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQztZQUNoQyxNQUFVLE1BQUEsQ0FBQyxRQUFBLElBQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUMvQjthQUNJO1lBQ0wsS0FBUyxNQUFBLENBQUMsUUFBQSxJQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDOUI7S0FDSjtTQUNJO1FBQ0wsSUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4QyxHQUFPLEtBQUs7WUFDUixFQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQTtLQUN6Qzs7SUFFTCxPQUFXLElBQUksQ0FBQztDQUNmLENBQUE7O0FBRUwsMkJBQUksS0FBSyxxQkFBQyxFQUFFLENBQUM7SUFDVCxHQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDO1FBQzVCLEdBQU8sSUFBSSxDQUFDLFNBQVMsS0FBSyxRQUFRO1lBQzlCLEVBQUksRUFBRSxNQUFBLENBQUMsUUFBQSxJQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQTtLQUMvQjs7UUFFRCxFQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQTs7SUFFdkMsT0FBVyxJQUFJLENBQUM7Q0FDZixDQUFBLEFBR0wsQUFBZ0M7O0FDN0doQyxJQUFxQixNQUFNLEdBQXVCO0lBQ2xELGVBQ2UsQ0FBQyxJQUFJO0lBQ2hCO1FBQ0lELFVBQUssS0FBQSxDQUFDLElBQUEsQ0FBQyxDQUFDO1FBQ1IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7O1FBRXRCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFDN0IsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7O1FBRTVCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUMzQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7UUFDL0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQSxDQUFDLEVBQUM7WUFDbkMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLE1BQU0sR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ1osQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzs7UUFFckNDLElBQUksR0FBRyxHQUFHLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsREEsSUFBSSxHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMzRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztRQUM5QixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzs7UUFFeEIsRUFBRSxDQUFDLGdCQUFnQixDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDekU7Ozs7MENBQUE7O0lBRUQsaUJBQUEsTUFBTSxvQkFBQyxHQUFBO0lBQ1A7dUJBRGMsUUFBQyxDQUFBO1lBQUEsSUFBSSxpQkFBRTtZQUFBLE9BQU8sb0JBQUU7WUFBQSxLQUFLOztRQUUvQkEsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFBLE9BQU8sRUFBQTs7UUFFNUJBLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7UUFDaENBLElBQUksYUFBYSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTTtZQUN0RCxVQUFBLENBQUMsRUFBQyxTQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBQTtTQUN6QixDQUFDOztRQUVGLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBQSxHQUFHLEVBQUM7WUFFYkEsSUFBSSxFQUFFLEdBQUcsS0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsU0FBRSxLQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDM0RBLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUM7O1lBRTlCQSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hDLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQzNFO2dCQUNJQSxJQUFJLFlBQVksQ0FBQztnQkFDakIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQztvQkFDM0IsWUFBWSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVzswQkFDaEQsdUJBQXVCOzBCQUN2QixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVc7MEJBQ3ZDLG1CQUFtQixDQUFDO2lCQUM3QjtxQkFDSSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDO29CQUMvQixZQUFZLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxZQUFZLENBQUM7aUJBQ2pEO3FCQUNJLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLENBQUM7b0JBQy9CLFlBQVksR0FBRyxnQkFBZ0I7MEJBQ3pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVzswQkFDdkMsR0FBRyxDQUFDO2lCQUNiO3FCQUNJLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxhQUFhLENBQUM7b0JBQ3RDLFlBQVksR0FBRyxlQUFlLENBQUM7aUJBQ2xDOztnQkFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUM7aUJBQ2xDLElBQUksQ0FBQyxVQUFBLE1BQU0sRUFBQztvQkFDVCxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2lCQUN4RCxDQUFDO2lCQUNELEtBQUssQ0FBQyxZQUFHLFNBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsR0FBQSxDQUFDLENBQUM7YUFDcEQ7aUJBQ0ksR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ3BDO2dCQUNJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7b0JBQ2xCLEVBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFBO2FBQ3BDO1NBQ0osQ0FBQyxDQUFDOztRQUVILGFBQWEsQ0FBQyxPQUFPLENBQUMsVUFBQyxHQUFHLEVBQUU7WUFDeEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQztnQkFDbEIsRUFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUE7U0FDcEMsQ0FBQyxDQUFDO0tBQ04sQ0FBQTs7SUFFRCxpQkFBQSxXQUFXLHlCQUFDLEtBQUssRUFBRSxFQUFFO0lBQ3JCOzs7UUFDSUEsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2hCQSxJQUFJLElBQUksR0FBRyxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUMxRCxVQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUU7OztnQkFHZEEsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7Z0JBQzFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDL0MsTUFBTSxFQUFFLENBQUM7b0JBQ1QsT0FBTztpQkFDVjs7O2dCQUdELElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUVFLE1BQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqRixJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDeEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7OztnQkFHM0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO2dCQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNuQixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDOztnQkFFckIsU0FBUyxPQUFPLENBQUMsTUFBTSxDQUFDO29CQUNwQixTQUFTLE9BQU87b0JBQ2hCOzt3QkFFSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUEsT0FBTyxFQUFBOzs7d0JBRy9DRixJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQzt3QkFDMUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQzs0QkFDOUMsRUFBQSxNQUFNLEVBQUUsQ0FBQyxFQUFBOzs0QkFFVCxFQUFBLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFBO3FCQUN2Qjs7b0JBRUQsR0FBRyxNQUFNLEVBQUUsRUFBQSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLEVBQUE7eUJBQ3RDLEVBQUEsSUFBSSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsRUFBQTtvQkFDcEMsT0FBTyxPQUFPLENBQUM7aUJBQ2xCO2FBQ0o7WUFDRCxVQUFDLElBQUksRUFBRTtnQkFDSCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsS0FBSyxFQUFFO29CQUNwQixFQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEVBQUE7OztnQkFHMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDbkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDckIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO2dCQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDbkUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNwRSxJQUFJLEVBQUUsQ0FBQzthQUNWO1NBQ0osQ0FBQzs7O1FBR0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDMUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDcEJBLElBQUksTUFBTSxHQUFHLFlBQUc7WUFDWixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDMUIsR0FBRyxJQUFJLENBQUMsU0FBUyxLQUFLLEVBQUU7Z0JBQ3BCLEVBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsRUFBQTtTQUM3QixDQUFDO1FBQ0YsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7O1FBRTFCLE9BQU8sSUFBSSxDQUFDO0tBQ2YsQ0FBQTs7O0VBN0orQixLQUFLLENBQUMsUUE4SnpDLEdBQUE7O0FDL0pELElBQXFCLElBQUksR0FBdUI7SUFDaEQsYUFDZSxDQUFDLE9BQU87SUFDbkI7OztRQUNJRCxVQUFLLEtBQUEsQ0FBQyxJQUFBLENBQUMsQ0FBQzs7UUFFUixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQzs7O1FBR2hCQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNqQixPQUFPLE9BQU87UUFDZCxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ2xCLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO1lBQzNCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQixNQUFNO1FBQ1YsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDVixDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDcEMsTUFBTTtRQUNWLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDbEIsQ0FBQyxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLE1BQU07UUFDVixLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUNWLENBQUMsR0FBRyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNO1NBQ1Q7O1FBRUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsU0FBUyxDQUFD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
