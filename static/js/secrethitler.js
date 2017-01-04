var SecretHitler = (function () {
'use strict';

var AM = {
	manifest: {
		models: {
			table: 'static/model/table.dae',
			nameplate: 'static/model/nameplate.dae',
			tophat: 'static/model/tophat.gltf',
			visorcap: 'static/model/visor_cap.gltf',
			dummy: 'static/model/dummy.gltf',
			playermeter: 'static/model/playermeter.gltf'
		},
		textures: {
			board_large: 'static/img/board-large-baked.png',
			board_med: 'static/img/board-medium-baked.png',
			board_small: 'static/img/board-small-baked.png',
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
			if(turnOrder.length >= 9)
				{ this.model.material.map = this.textures[2]; }
			else if(turnOrder.length >= 7)
				{ this.model.material.map = this.textures[1]; }
			else
				{ this.model.material.map = this.textures[0]; }
		}
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

	var aIsObj = a instanceof Object, bIsObj = b instanceof Object;
	if(aIsObj && bIsObj && depth > 0)
	{
		function unique(e, i, a){
			return a.indexOf(e) === i;
		}

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
				if(players[ids[i]].seatNum === this$1.seatNum){
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
        model.scale.setScalar(0.8);

        // set up rainbow meter
        this.pm = model.children[0].children[0];
        this.pm.material.vertexColors = THREE.VertexColors;
        this.pm.material.color.set(0xffffff);
        //this.pm.material.needsUpdate = true;
        this.pm.visible = false;

        // set up label
        this.label = model.children[0].children[1].children[0];
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
        this.addEventListener('cursorup', this.onclick.bind(this));
    }

    if ( superclass ) PlayerMeter.__proto__ = superclass;
    PlayerMeter.prototype = Object.create( superclass && superclass.prototype );
    PlayerMeter.prototype.constructor = PlayerMeter;

    PlayerMeter.prototype.setMeterValue = function setMeterValue (val)
    {
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
            this.pm.visible = true;
            this.label.visible = turnOrder.length >= 5;
        }
        else {
            this.pm.visible = false;
            this.label.visible = false;
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
					isModerator: false
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

		this.playerMeter = new PlayerMeter();
		this.table.add(this.playerMeter);

		// add avatar for scale
		assets.models.dummy.position.set(0, 0, 1.1);
		assets.models.dummy.rotateZ(Math.PI);
		this.add(assets.models.dummy);

		this.socket.on('update', this.updateFromServer.bind(this));
		this.socket.on('checkedIn', this.checkedIn.bind(this));
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

	SecretHitler.prototype.reset = function reset (e){
		if(this.localUser.isModerator){
			console.log('requesting reset');
			this.socket.emit('reset');
		}
	};

	return SecretHitler;
}(THREE.Object3D));

var SH = new SecretHitler();

return SH;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvYXNzZXRtYW5hZ2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iZWhhdmlvci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYW5pbWF0ZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvY2FyZC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvaGF0cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdGFibGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L3V0aWxzLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9uYW1lcGxhdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2Nhc2NhZGluZ3Byb21pc2UuanMiLCIuLi8uLi9zcmMvY2xpZW50L2JhbGxvdC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvc2VhdC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVybWV0ZXIuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlY3JldGhpdGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0bWFuaWZlc3Q6IHtcblx0XHRtb2RlbHM6IHtcblx0XHRcdHRhYmxlOiAnc3RhdGljL21vZGVsL3RhYmxlLmRhZScsXG5cdFx0XHRuYW1lcGxhdGU6ICdzdGF0aWMvbW9kZWwvbmFtZXBsYXRlLmRhZScsXG5cdFx0XHR0b3BoYXQ6ICdzdGF0aWMvbW9kZWwvdG9waGF0LmdsdGYnLFxuXHRcdFx0dmlzb3JjYXA6ICdzdGF0aWMvbW9kZWwvdmlzb3JfY2FwLmdsdGYnLFxuXHRcdFx0ZHVtbXk6ICdzdGF0aWMvbW9kZWwvZHVtbXkuZ2x0ZicsXG5cdFx0XHRwbGF5ZXJtZXRlcjogJ3N0YXRpYy9tb2RlbC9wbGF5ZXJtZXRlci5nbHRmJ1xuXHRcdH0sXG5cdFx0dGV4dHVyZXM6IHtcblx0XHRcdGJvYXJkX2xhcmdlOiAnc3RhdGljL2ltZy9ib2FyZC1sYXJnZS1iYWtlZC5wbmcnLFxuXHRcdFx0Ym9hcmRfbWVkOiAnc3RhdGljL2ltZy9ib2FyZC1tZWRpdW0tYmFrZWQucG5nJyxcblx0XHRcdGJvYXJkX3NtYWxsOiAnc3RhdGljL2ltZy9ib2FyZC1zbWFsbC1iYWtlZC5wbmcnLFxuXHRcdFx0Y2FyZHM6ICdzdGF0aWMvaW1nL2NhcmRzLnBuZycsXG5cdFx0XHRyZXNldDogJ3N0YXRpYy9pbWcvYm9tYi5wbmcnLFxuXHRcdFx0dGV4dDogJ3N0YXRpYy9pbWcvdGV4dC5wbmcnXG5cdFx0fVxuXHR9LFxuXHRjYWNoZToge31cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuY2xhc3MgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IodHlwZSl7XG5cdFx0dGhpcy50eXBlID0gdHlwZTtcblx0fVxuXG5cdGF3YWtlKG9iail7XG5cdFx0dGhpcy5vYmplY3QzRCA9IG9iajtcblx0fVxuXG5cdHN0YXJ0KCl7IH1cblxuXHR1cGRhdGUoZFQpeyB9XG5cblx0ZGlzcG9zZSgpeyB9XG59XG5cbmNsYXNzIEJTeW5jIGV4dGVuZHMgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IoZXZlbnROYW1lKVxuXHR7XG5cdFx0c3VwZXIoJ0JTeW5jJyk7XG5cdFx0dGhpcy5fcyA9IFNILnNvY2tldDtcblxuXHRcdC8vIGxpc3RlbiBmb3IgdXBkYXRlIGV2ZW50c1xuXHRcdHRoaXMuaG9vayA9IHRoaXMuX3Mub24oZXZlbnROYW1lLCB0aGlzLnVwZGF0ZUZyb21TZXJ2ZXIuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5ldmVudE5hbWUgPSBldmVudE5hbWU7XG5cdFx0dGhpcy5vd25lciA9IDA7XG5cdH1cblxuXHR1cGRhdGVGcm9tU2VydmVyKGRhdGEpXG5cdHtcblx0XHR0aGlzLm9iamVjdDNELnBvc2l0aW9uLmZyb21BcnJheShkYXRhLCAwKTtcblx0XHR0aGlzLm9iamVjdDNELnJvdGF0aW9uLmZyb21BcnJheShkYXRhLCAzKTtcblx0fVxuXG5cdHRha2VPd25lcnNoaXAoKVxuXHR7XG5cdFx0aWYoU0gubG9jYWxVc2VyICYmIFNILmxvY2FsVXNlci51c2VySWQpXG5cdFx0XHR0aGlzLm93bmVyID0gU0gubG9jYWxVc2VyLnVzZXJJZDtcblx0fVxuXG5cdHVwZGF0ZShkVClcblx0e1xuXHRcdGlmKFNILmxvY2FsVXNlciAmJiBTSC5sb2NhbFVzZXIuc2tlbGV0b24gJiYgU0gubG9jYWxVc2VyLmlkID09PSB0aGlzLm93bmVyKVxuXHRcdHtcblx0XHRcdGxldCBqID0gU0gubG9jYWxVc2VyLnNrZWxldG9uLmdldEpvaW50KCdIZWFkJyk7XG5cdFx0XHR0aGlzLl9zLmVtaXQodGhpcy5ldmVudE5hbWUsIFsuLi5qLnBvc2l0aW9uLnRvQXJyYXkoKSwgLi4uai5yb3RhdGlvbi50b0FycmF5KCldKTtcblx0XHR9XG5cdH1cblxufVxuXG5leHBvcnQgeyBCZWhhdmlvciwgQlN5bmMgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IHsgQmVoYXZpb3IgfSBmcm9tICcuL2JlaGF2aW9yJztcblxuY2xhc3MgQW5pbWF0ZSBleHRlbmRzIEJlaGF2aW9yXG57XG5cdGNvbnN0cnVjdG9yKC8ve3BhcmVudCwgcG9zLCBxdWF0LCBzY2FsZSwgbWF0cml4LCBkdXJhdGlvbiwgY2FsbGJhY2t9XG5cdFx0e3BhcmVudD1udWxsLCBwb3M9bnVsbCwgcXVhdD1udWxsLCBzY2FsZT1udWxsLCBtYXRyaXg9bnVsbCwgZHVyYXRpb249NjAwLCBjYWxsYmFjaz0oKT0+e319KVxuXHR7XG5cdFx0c3VwZXIoJ0FuaW1hdGUnKTtcblx0XHRcblx0XHRpZihtYXRyaXgpXG5cdFx0e1xuXHRcdFx0Ly8gZXh0cmFjdCBwb3NpdGlvbi9yb3RhdGlvbi9zY2FsZSBmcm9tIG1hdHJpeFxuXHRcdFx0cG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblx0XHRcdHF1YXQgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXHRcdFx0c2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXHRcdFx0bWF0cml4LmRlY29tcG9zZShwb3MsIHF1YXQsIHNjYWxlKTtcblx0XHR9XG5cblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHtwYXJlbnQsIHBvcywgcXVhdCwgc2NhbGUsIGR1cmF0aW9uLCBjYWxsYmFja30pO1xuXHR9XG5cblx0YXdha2Uob2JqKVxuXHR7XG5cdFx0c3VwZXIuYXdha2Uob2JqKTtcblxuXHRcdC8vIHNodWZmbGUgaGllcmFyY2h5LCBidXQga2VlcCB3b3JsZCB0cmFuc2Zvcm0gdGhlIHNhbWVcblx0XHRpZih0aGlzLnBhcmVudCAmJiB0aGlzLnBhcmVudCAhPT0gb2JqLnBhcmVudClcblx0XHR7XG5cdFx0XHRvYmouYXBwbHlNYXRyaXgob2JqLnBhcmVudC5tYXRyaXhXb3JsZCk7XG5cdFx0XHRsZXQgbWF0ID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5nZXRJbnZlcnNlKHRoaXMucGFyZW50Lm1hdHJpeFdvcmxkKTtcblx0XHRcdG9iai5hcHBseU1hdHJpeChtYXQpO1xuXG5cdFx0XHR0aGlzLnBhcmVudC5hZGQob2JqKTtcblx0XHR9XG5cblx0XHQvLyByZWFkIGluaXRpYWwgcG9zaXRpb25zXG5cdFx0dGhpcy5pbml0aWFsUG9zID0gb2JqLnBvc2l0aW9uLmNsb25lKCk7XG5cdFx0dGhpcy5pbml0aWFsUXVhdCA9IG9iai5xdWF0ZXJuaW9uLmNsb25lKCk7XG5cdFx0dGhpcy5pbml0aWFsU2NhbGUgPSBvYmouc2NhbGUuY2xvbmUoKTtcblx0XHR0aGlzLnN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cdH1cblxuXHR1cGRhdGUoKVxuXHR7XG5cdFx0Ly8gY29tcHV0ZSBlYXNlLW91dCBiYXNlZCBvbiBkdXJhdGlvblxuXHRcdGxldCBtaXggPSAoRGF0ZS5ub3coKS10aGlzLnN0YXJ0VGltZSkgLyB0aGlzLmR1cmF0aW9uO1xuXHRcdGxldCBlYXNlID0gVFdFRU4gPyBUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dCA6IG4gPT4gbiooMi1uKTtcblx0XHRtaXggPSBtaXggPCAxID8gZWFzZShtaXgpIDogMTtcblxuXHRcdC8vIGFuaW1hdGUgcG9zaXRpb24gaWYgcmVxdWVzdGVkXG5cdFx0aWYoIHRoaXMucG9zICl7XG5cdFx0XHR0aGlzLm9iamVjdDNELnBvc2l0aW9uLmxlcnBWZWN0b3JzKHRoaXMuaW5pdGlhbFBvcywgdGhpcy5wb3MsIG1peCk7XG5cdFx0fVxuXG5cdFx0Ly8gYW5pbWF0ZSByb3RhdGlvbiBpZiByZXF1ZXN0ZWRcblx0XHRpZiggdGhpcy5xdWF0ICl7XG5cdFx0XHRUSFJFRS5RdWF0ZXJuaW9uLnNsZXJwKHRoaXMuaW5pdGlhbFF1YXQsIHRoaXMucXVhdCwgdGhpcy5vYmplY3QzRC5xdWF0ZXJuaW9uLCBtaXgpXG5cdFx0fVxuXG5cdFx0Ly8gYW5pbWF0ZSBzY2FsZSBpZiByZXF1ZXN0ZWRcblx0XHRpZiggdGhpcy5zY2FsZSApe1xuXHRcdFx0dGhpcy5vYmplY3QzRC5zY2FsZS5sZXJwVmVjdG9ycyh0aGlzLmluaXRpYWxTY2FsZSwgdGhpcy5zY2FsZSwgbWl4KTtcblx0XHR9XG5cblx0XHQvLyB0ZXJtaW5hdGUgYW5pbWF0aW9uIHdoZW4gZG9uZVxuXHRcdGlmKG1peCA+PSAxKXtcblx0XHRcdHRoaXMub2JqZWN0M0QucmVtb3ZlQmVoYXZpb3IodGhpcyk7XG5cdFx0XHR0aGlzLmNhbGxiYWNrLmNhbGwodGhpcy5vYmplY3QzRCk7XG5cdFx0fVxuXHR9XG59XG5cbkFuaW1hdGUuc3RhcnQgPSAodGFyZ2V0LCBvcHRzKSA9Plxue1xuXHRsZXQgb2xkQW5pbSA9IHRhcmdldC5nZXRCZWhhdmlvckJ5VHlwZSgnQW5pbWF0ZScpO1xuXHRpZihvbGRBbmltKXtcblx0XHRvbGRBbmltLmNvbnN0cnVjdG9yKG9wdHMpO1xuXHRcdG9sZEFuaW0uYXdha2UodGFyZ2V0KTtcblx0fVxuXHRlbHNlIHtcblx0XHR0YXJnZXQuYWRkQmVoYXZpb3IoIG5ldyBBbmltYXRlKG9wdHMpICk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQW5pbWF0ZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuXG4vLyBlbnVtIGNvbnN0YW50c1xubGV0IFR5cGVzID0gT2JqZWN0LmZyZWV6ZSh7XG5cdFBPTElDWV9MSUJFUkFMOiAwLFxuXHRQT0xJQ1lfRkFTQ0lTVDogMSxcblx0Uk9MRV9MSUJFUkFMOiAyLFxuXHRST0xFX0ZBU0NJU1Q6IDMsXG5cdFJPTEVfSElUTEVSOiA0LFxuXHRQQVJUWV9MSUJFUkFMOiA1LFxuXHRQQVJUWV9GQVNDSVNUOiA2LFxuXHRKQTogNyxcblx0TkVJTjogOCxcblx0QkxBTks6IDksXG5cdENSRURJVFM6IDEwXG59KTtcblxuZnVuY3Rpb24gZGltc1RvVVYoe3NpZGUsIGxlZnQsIHJpZ2h0LCB0b3AsIGJvdHRvbX0pXG57XG5cdGlmKHNpZGUpXG5cdFx0cmV0dXJuIFtbXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMih0b3AsIGxlZnQpLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIoYm90dG9tLCBsZWZ0KSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHRvcCwgcmlnaHQpXG5cdFx0XSxbXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIGxlZnQpLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIoYm90dG9tLCByaWdodCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMih0b3AsIHJpZ2h0KVxuXHRcdF1dO1xuXHRlbHNlXG5cdFx0cmV0dXJuIFtbXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihsZWZ0LCB0b3ApLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIobGVmdCwgYm90dG9tKSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCB0b3ApXG5cdFx0XSxbXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihsZWZ0LCBib3R0b20pLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIocmlnaHQsIGJvdHRvbSksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihyaWdodCwgdG9wKVxuXHRcdF1dO1xufVxuXG5mdW5jdGlvbiBnZXRVVnModHlwZSlcbntcblx0bGV0IGRpbXMgPSB7bGVmdDogMCwgcmlnaHQ6IDEsIGJvdHRvbTogMCwgdG9wOiAxfTtcblxuXHRzd2l0Y2godHlwZSlcblx0e1xuXHRjYXNlIFR5cGVzLlBPTElDWV9MSUJFUkFMOlxuXHRcdGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC44MzQsIHJpZ2h0OiAwLjk5NiwgdG9wOiAwLjc1NCwgYm90dG9tOiAwLjk5N307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUE9MSUNZX0ZBU0NJU1Q6XG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjY2LCByaWdodDogMC44MjIsIHRvcDogMC43NTQsIGJvdHRvbTogMC45OTZ9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLlJPTEVfTElCRVJBTDpcblx0XHRkaW1zID0ge2xlZnQ6IDAuNTA1LCByaWdodDogMC43NDYsIHRvcDogMC45OTYsIGJvdHRvbTogMC42NX07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUk9MRV9GQVNDSVNUOlxuXHRcdGRpbXMgPSB7bGVmdDogMC41MDUsIHJpZ2h0OiAwLjc0NiwgdG9wOiAwLjY0NSwgYm90dG9tOiAwLjN9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLlJPTEVfSElUTEVSOlxuXHRcdGRpbXMgPSB7bGVmdDogMC43NTQsIHJpZ2h0OiAwLjk5NiwgdG9wOiAwLjY0NSwgYm90dG9tOiAwLjN9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLlBBUlRZX0xJQkVSQUw6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjI1NSwgcmlnaHQ6IDAuNDk1LCB0b3A6IDAuOTk2LCBib3R0b206IDAuNjV9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLlBBUlRZX0ZBU0NJU1Q6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjI1NSwgcmlnaHQ6IDAuNDk1LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuSkE6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjAwNSwgcmlnaHQ6IDAuMjQ0LCB0b3A6IDAuOTkyLCBib3R0b206IDAuNjUzfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5ORUlOOlxuXHRcdGRpbXMgPSB7bGVmdDogMC4wMDYsIHJpZ2h0OiAwLjI0MywgdG9wOiAwLjY0MiwgYm90dG9tOiAwLjMwMn07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuQ1JFRElUUzpcblx0XHRkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuMDE1LCByaWdodDogMC4yNzYsIHRvcDogMC4zOTcsIGJvdHRvbTogMC43NjV9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLkJMQU5LOlxuXHRkZWZhdWx0OlxuXHRcdGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC4wMjIsIHJpZ2h0OiAuMDIyKzAuMjQ3LCB0b3A6IDAuMDIxLCBib3R0b206IC4wMjErMC4zNTQzfTtcblx0XHRicmVhaztcblx0fVxuXG5cdHJldHVybiBkaW1zVG9VVihkaW1zKTtcbn1cblxuXG5jbGFzcyBDYXJkIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IodHlwZSA9IFR5cGVzLkJMQU5LLCBkb3VibGVTaWRlZCA9IHRydWUpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0Ly8gY3JlYXRlIHRoZSBjYXJkIGZhY2VzXG5cdFx0bGV0IGZyb250R2VvID0gbmV3IFRIUkVFLlBsYW5lR2VvbWV0cnkoLjcxNSwgMSk7XG5cdFx0bGV0IGJhY2tHZW8gPSBmcm9udEdlby5jbG9uZSgpO1xuXHRcdGxldCBjYXJkTWF0ID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IEFzc2V0TWFuYWdlci5jYWNoZS50ZXh0dXJlcy5jYXJkc30pO1xuXHRcdGxldCBmcm9udCA9IG5ldyBUSFJFRS5NZXNoKGZyb250R2VvLCBjYXJkTWF0KTtcblx0XHRsZXQgYmFjayA9IG5ldyBUSFJFRS5NZXNoKGJhY2tHZW8sIGNhcmRNYXQpO1xuXHRcdGJhY2sucG9zaXRpb24uc2V0KDAuMDAxLCAwLCAwKTtcblx0XHRmcm9udC5wb3NpdGlvbi5zZXQoLTAuMDAxLCAwLCAwKTtcblx0XHRiYWNrLnJvdGF0ZVkoTWF0aC5QSSk7XG5cblx0XHQvLyBzZXQgdGhlIGZhY2VzIHRvIHRoZSBjb3JyZWN0IHBhcnQgb2YgdGhlIHRleHR1cmVcblx0XHRmcm9udC5nZW9tZXRyeS5mYWNlVmVydGV4VXZzID0gW2dldFVWcyh0eXBlKV07XG5cdFx0YmFjay5nZW9tZXRyeS5mYWNlVmVydGV4VXZzID0gW2dldFVWcyggZG91YmxlU2lkZWQgPyB0eXBlIDogVHlwZXMuQkxBTksgKV07XG5cdFx0dGhpcy5zY2FsZS5zZXRTY2FsYXIoMC43KTtcblx0XHR0aGlzLmFkZChmcm9udCwgYmFjayk7XG5cdH1cblxuXHRoaWRlKCl7XG5cdFx0dGhpcy5jaGlsZHJlbi5mb3JFYWNoKG8gPT4geyBvLnZpc2libGUgPSBmYWxzZTsgfSk7XG5cdH1cblxuXHRzaG93KCl7XG5cdFx0dGhpcy5jaGlsZHJlbi5mb3JFYWNoKG8gPT4geyBvLnZpc2libGUgPSB0cnVlOyB9KTtcblx0fVxufVxuXG5jbGFzcyBCbGFua0NhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXsgc3VwZXIoKTsgfVxufVxuXG5jbGFzcyBDcmVkaXRzQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLkNSRURJVFMpO1xuXHRcdGxldCBzZWxmID0gdGhpcztcblxuXHRcdGZ1bmN0aW9uIHNldFZpc2liaWxpdHkoe2RhdGE6IHtnYW1lOiB7c3RhdGV9fX0pe1xuXHRcdFx0aWYoc3RhdGUgPT09ICdzZXR1cCcpXG5cdFx0XHRcdHNlbGYuY2hpbGRyZW4uZm9yRWFjaChvID0+IHsgby52aXNpYmxlID0gdHJ1ZTsgfSk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHNlbGYuY2hpbGRyZW4uZm9yRWFjaChvID0+IHsgby52aXNpYmxlID0gZmFsc2U7IH0pO1xuXHRcdH1cblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIHNldFZpc2liaWxpdHkpO1xuXHR9XG59XG5cbmNsYXNzIExpYmVyYWxQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUE9MSUNZX0xJQkVSQUwsIGZhbHNlKTtcblx0fVxuXHRnb1RvUG9zaXRpb24oc3BvdCA9IDApXG5cdHtcblx0XHRzcG90ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oNCwgc3BvdCkpO1xuXHRcdGxldCBzID0gTGliZXJhbFBvbGljeUNhcmQuc3BvdHM7XG5cdFx0QW5pbWF0ZS5zdGFydCh0aGlzLCB7cGFyZW50OiBBc3NldE1hbmFnZXIucm9vdCwgcG9zOiBzWydwb3NfJytzcG90XSwgcXVhdDogcy5xdWF0LCBzY2FsZTogcy5zY2FsZX0pO1xuXHR9XG59XG5cbkxpYmVyYWxQb2xpY3lDYXJkLnNwb3RzID0ge1xuXHRwb3NfMDogbmV3IFRIUkVFLlZlY3RvcjMoMC41MzMsIDAuNzYsIC0wLjMzNiksXG5cdHBvc18xOiBuZXcgVEhSRUUuVmVjdG9yMygwLjI2MywgMC43NiwgLTAuMzM2KSxcblx0cG9zXzI6IG5ldyBUSFJFRS5WZWN0b3IzKC0uMDA3LCAwLjc2LCAtMC4zMzYpLFxuXHRwb3NfMzogbmV3IFRIUkVFLlZlY3RvcjMoLS4yNzksIDAuNzYsIC0wLjMzNiksXG5cdHBvc180OiBuZXcgVEhSRUUuVmVjdG9yMygtLjU1MiwgMC43NiwgLTAuMzM2KSxcblx0cXVhdDogbmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMC43MDcxMDY3ODExODY1NDc1LCAwLjcwNzEwNjc4MTE4NjU0NzUsIDApLFxuXHRzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMC43LCAwLjcsIDAuNylcbn1cblxuY2xhc3MgRmFzY2lzdFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfRkFTQ0lTVCwgZmFsc2UpO1xuXHR9XG5cdGdvVG9Qb3NpdGlvbihzcG90ID0gMClcblx0e1xuXHRcdHNwb3QgPSBNYXRoLm1heCgwLCBNYXRoLm1pbig1LCBzcG90KSk7XG5cdFx0bGV0IHMgPSBGYXNjaXN0UG9saWN5Q2FyZC5zcG90cztcblx0XHRBbmltYXRlLnN0YXJ0KHRoaXMsIHtwYXJlbnQ6IEFzc2V0TWFuYWdlci5yb290LCBwb3M6IHNbJ3Bvc18nK3Nwb3RdLCBxdWF0OiBzLnF1YXQsIHNjYWxlOiBzLnNjYWxlfSk7XG5cdH1cbn1cblxuRmFzY2lzdFBvbGljeUNhcmQuc3BvdHMgPSB7XG5cdHBvc18wOiBuZXcgVEhSRUUuVmVjdG9yMygtLjY4NywgMC43NiwgMC4zNDEpLFxuXHRwb3NfMTogbmV3IFRIUkVFLlZlY3RvcjMoLS40MTcsIDAuNzYsIDAuMzQxKSxcblx0cG9zXzI6IG5ldyBUSFJFRS5WZWN0b3IzKC0uMTQ2LCAwLjc2LCAwLjM0MSksXG5cdHBvc18zOiBuZXcgVEhSRUUuVmVjdG9yMygwLjEyNywgMC43NiwgMC4zNDEpLFxuXHRwb3NfNDogbmV3IFRIUkVFLlZlY3RvcjMoMC40MDAsIDAuNzYsIDAuMzQxKSxcblx0cG9zXzU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNjczLCAwLjc2LCAwLjM0MSksXG5cdHF1YXQ6IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKC0wLjcwNzEwNjc4MTE4NjU0NzUsIDAsIDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSksXG5cdHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygwLjcsIDAuNywgMC43KVxufVxuXG5jbGFzcyBMaWJlcmFsUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5ST0xFX0xJQkVSQUwsIGZhbHNlKTtcblx0fVxufVxuXG5jbGFzcyBGYXNjaXN0Um9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5ST0xFX0ZBU0NJU1QsIGZhbHNlKTtcblx0fVxufVxuXG5jbGFzcyBIaXRsZXJSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfSElUTEVSLCBmYWxzZSk7XG5cdH1cbn1cblxuY2xhc3MgTGliZXJhbFBhcnR5Q2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLlBBUlRZX0xJQkVSQUwsIGZhbHNlKTtcblx0fVxufVxuXG5jbGFzcyBGYXNjaXN0UGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuUEFSVFlfRkFTQ0lTVCwgZmFsc2UpO1xuXHR9XG59XG5cbmNsYXNzIEphQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLkpBLCBmYWxzZSk7XG5cdFx0dGhpcy5jaGlsZHJlblswXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xuXHRcdHRoaXMuY2hpbGRyZW5bMV0ucm90YXRlWigtTWF0aC5QSS8yKTtcblx0fVxufVxuXG5jbGFzcyBOZWluQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHN1cGVyKFR5cGVzLk5FSU4sIGZhbHNlKTtcblx0XHR0aGlzLmNoaWxkcmVuWzBdLnJvdGF0ZVooLU1hdGguUEkvMik7XG5cdFx0dGhpcy5jaGlsZHJlblsxXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xuXHR9XG59XG5cblxuZXhwb3J0IHtcblx0Q2FyZCwgVHlwZXMsIEJsYW5rQ2FyZCwgQ3JlZGl0c0NhcmQsXG5cdExpYmVyYWxQb2xpY3lDYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgTGliZXJhbFJvbGVDYXJkLCBGYXNjaXN0Um9sZUNhcmQsXG5cdEhpdGxlclJvbGVDYXJkLCBMaWJlcmFsUGFydHlDYXJkLCBGYXNjaXN0UGFydHlDYXJkLCBKYUNhcmQsIE5laW5DYXJkXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuY2xhc3MgUHJlc2lkZW50SGF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMudG9waGF0O1xuXHRcdHRoaXMubW9kZWwucG9zaXRpb24uc2V0KDAsMCwwKTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCAwKTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblxuXHRcdFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsICgoZSkgPT4ge1xuXHRcdFx0aWYoZS5kYXRhLmdhbWUuc3RhdGUgPT09ICdzZXR1cCcpIHRoaXMuaWRsZSgpO1xuXHRcdH0pLmJpbmQodGhpcykpO1xuXHR9XG5cblx0aWRsZSgpe1xuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAuNzUsIDAsIDApO1xuXHRcdHRoaXMucm90YXRpb24uc2V0KDAsIE1hdGguUEkvMiwgMCk7XG5cdFx0U0guaWRsZVJvb3QuYWRkKHRoaXMpO1xuXHR9XG59O1xuXG5jbGFzcyBDaGFuY2VsbG9ySGF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMudmlzb3JjYXA7XG5cdFx0dGhpcy5tb2RlbC5wb3NpdGlvbi5zZXQoMCwwLjA0LDApO1xuXHRcdHRoaXMubW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJLzIsIDAsIDApO1xuXHRcdHRoaXMuYWRkKHRoaXMubW9kZWwpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3N0YXRlJywgKChlKSA9PiB7XG5cdFx0XHRpZihlLmRhdGEuZ2FtZS5zdGF0ZSA9PT0gJ3NldHVwJykgdGhpcy5pZGxlKCk7XG5cdFx0fSkuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRpZGxlKCl7XG5cdFx0dGhpcy5wb3NpdGlvbi5zZXQoLTAuNzUsIDAsIDApO1xuXHRcdHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLzIsIDApO1xuXHRcdFNILmlkbGVSb290LmFkZCh0aGlzKTtcblx0fVxufTtcblxuZXhwb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHYW1lVGFibGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuXHRjb25zdHJ1Y3RvcigpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0Ly8gc2F2ZSByZWZlcmVuY2VzIHRvIHRoZSB0ZXh0dXJlc1xuXHRcdHRoaXMudGV4dHVyZXMgPSBbXG5cdFx0XHRBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9zbWFsbCxcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX21lZCxcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX2xhcmdlXG5cdFx0XTtcblxuXHRcdC8vIGFkZCB0YWJsZSBhc3NldFxuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMudGFibGUuY2hpbGRyZW5bMF07XG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XG5cdFx0dGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cblx0XHQvLyBzZXQgdGhlIGRlZmF1bHQgbWF0ZXJpYWxcblx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcCA9IHRoaXMudGV4dHVyZXNbMF07XG5cblx0XHQvLyBwb3NpdGlvbiB0YWJsZVxuXHRcdHRoaXMucG9zaXRpb24uc2V0KDAsIDEuMCwgMCk7XG5cblx0XHRTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfdHVybk9yZGVyJywgdGhpcy5jaGFuZ2VNb2RlLmJpbmQodGhpcykpO1xuXHR9XG5cblx0Y2hhbmdlTW9kZSh7ZGF0YToge2dhbWU6IHtzdGF0ZSwgdHVybk9yZGVyfX19KVxuXHR7XG5cdFx0aWYoc3RhdGUgPT09ICdzZXR1cCcpe1xuXHRcdFx0aWYodHVybk9yZGVyLmxlbmd0aCA+PSA5KVxuXHRcdFx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcCA9IHRoaXMudGV4dHVyZXNbMl07XG5cdFx0XHRlbHNlIGlmKHR1cm5PcmRlci5sZW5ndGggPj0gNylcblx0XHRcdFx0dGhpcy5tb2RlbC5tYXRlcmlhbC5tYXAgPSB0aGlzLnRleHR1cmVzWzFdO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aGlzLm1vZGVsLm1hdGVyaWFsLm1hcCA9IHRoaXMudGV4dHVyZXNbMF07XG5cdFx0fVxuXHR9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInO1xuXG5mdW5jdGlvbiBnZXRHYW1lSWQoKVxue1xuXHQvLyBmaXJzdCBjaGVjayB0aGUgdXJsXG5cdGxldCByZSA9IC9bPyZdZ2FtZUlkPShbXiZdKykvLmV4ZWMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG5cdGlmKHJlKXtcblx0XHRyZXR1cm4gcmVbMV07XG5cdH1cblx0ZWxzZSBpZihhbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudCl7XG5cdFx0cmV0dXJuIFNILmVudi5zaWQ7XG5cdH1cblx0ZWxzZSB7XG5cdFx0bGV0IGlkID0gTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwMCApO1xuXHRcdHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKCc/Z2FtZUlkPScraWQpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHBhcnNlQ1NWKHN0cil7XG5cdGlmKCFzdHIpIHJldHVybiBbXTtcblx0ZWxzZSByZXR1cm4gc3RyLnNwbGl0KCcsJyk7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlUXVlc3Rpb24odGV4dCwgdGV4dHVyZSA9IG51bGwpXG57XG5cdGxldCBmb250U3RhY2sgPSAnXCJIZWx2ZXRpY2EgTmV1ZVwiLCBIZWx2ZXRpY2EsIEFyaWFsLCBTYW5zLVNlcmlmJztcblxuXHQvLyBzZXQgdXAgY2FudmFzXG5cdGxldCBibXA7XG5cdGlmKCF0ZXh0dXJlKXtcblx0XHRibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHRibXAud2lkdGggPSA1MTI7XG5cdFx0Ym1wLmhlaWdodCA9IDI1Njtcblx0fVxuXHRlbHNlIHtcblx0XHRibXAgPSB0ZXh0dXJlLmltYWdlO1xuXHR9XG5cblx0bGV0IGcgPSBibXAuZ2V0Q29udGV4dCgnMmQnKTtcblx0Zy5jbGVhclJlY3QoMCwgMCwgNTEyLCAyNTYpO1xuXHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xuXHRnLmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG5cblx0Ly8gd3JpdGUgdGV4dFxuXHRnLmZvbnQgPSAnYm9sZCA1MHB4ICcrZm9udFN0YWNrO1xuXHRsZXQgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcblx0Zm9yKGxldCBpPTA7IGk8bGluZXMubGVuZ3RoOyBpKyspe1xuXHRcdGcuZmlsbFRleHQobGluZXNbaV0sIDI1NiwgNTArNTUqaSk7XG5cdH1cblxuXHRpZih0ZXh0dXJlKXtcblx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcblx0XHRyZXR1cm4gdGV4dHVyZTtcblx0fVxuXHRlbHNlIHtcblx0XHRyZXR1cm4gbmV3IFRIUkVFLkNhbnZhc1RleHR1cmUoYm1wKTtcblx0fVxufVxuXG5mdW5jdGlvbiBtZXJnZU9iamVjdHMoYSwgYiwgZGVwdGg9Milcbntcblx0bGV0IGFJc09iaiA9IGEgaW5zdGFuY2VvZiBPYmplY3QsIGJJc09iaiA9IGIgaW5zdGFuY2VvZiBPYmplY3Q7XG5cdGlmKGFJc09iaiAmJiBiSXNPYmogJiYgZGVwdGggPiAwKVxuXHR7XG5cdFx0ZnVuY3Rpb24gdW5pcXVlKGUsIGksIGEpe1xuXHRcdFx0cmV0dXJuIGEuaW5kZXhPZihlKSA9PT0gaTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0ID0ge307XG5cdFx0bGV0IGtleXMgPSBbLi4uT2JqZWN0LmtleXMoYSksIC4uLk9iamVjdC5rZXlzKGIpXS5maWx0ZXIodW5pcXVlKTtcblx0XHRmb3IobGV0IGk9MDsgaTxrZXlzLmxlbmd0aDsgaSsrKXtcblx0XHRcdHJlc3VsdFtrZXlzW2ldXSA9IG1lcmdlT2JqZWN0cyhhW2tleXNbaV1dLCBiW2tleXNbaV1dLCBkZXB0aC0xKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXHRlbHNlIGlmKGIgIT09IHVuZGVmaW5lZClcblx0XHRyZXR1cm4gYjtcblx0ZWxzZVxuXHRcdHJldHVybiBhO1xufVxuXG5leHBvcnQgeyBnZXRHYW1lSWQsIHBhcnNlQ1NWLCBnZW5lcmF0ZVF1ZXN0aW9uLCBtZXJnZU9iamVjdHMgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE5hbWVwbGF0ZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHNlYXQpXG5cdHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zZWF0ID0gc2VhdDtcblxuXHRcdC8vIGFkZCAzZCBtb2RlbFxuXHRcdHRoaXMubW9kZWwgPSBBTS5jYWNoZS5tb2RlbHMubmFtZXBsYXRlLmNoaWxkcmVuWzBdLmNsb25lKCk7XG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgTWF0aC5QSS8yKTtcblx0XHR0aGlzLm1vZGVsLnNjYWxlLnNldFNjYWxhcigxLjI1KTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblxuXHRcdC8vIGdlbmVyYXRlIG1hdGVyaWFsXG5cdFx0dGhpcy5ibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHR0aGlzLmJtcC53aWR0aCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZTtcblx0XHR0aGlzLmJtcC5oZWlnaHQgPSBOYW1lcGxhdGUudGV4dHVyZVNpemUgLyAyO1xuXHRcdHRoaXMubW9kZWwubWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuXHRcdFx0bWFwOiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZSh0aGlzLmJtcClcblx0XHR9KTtcblxuXHRcdC8vIGNyZWF0ZSBsaXN0ZW5lciBwcm94aWVzXG5cdFx0dGhpcy5faG92ZXJCZWhhdmlvciA9IG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLkhvdmVyQ29sb3Ioe1xuXHRcdFx0Y29sb3I6IG5ldyBUSFJFRS5Db2xvcigweGZmYThhOClcblx0XHR9KTtcblx0XHR0aGlzLm1vZGVsLmFkZEJlaGF2aW9yKHRoaXMuX2hvdmVyQmVoYXZpb3IpO1xuXHRcdHRoaXMubW9kZWwuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLmNsaWNrLmJpbmQodGhpcykpO1xuXHR9XG5cblx0dXBkYXRlVGV4dCh0ZXh0KVxuXHR7XG5cdFx0bGV0IGZvbnRTaXplID0gNy8zMiAqIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAqIDAuNjU7XG5cblx0XHQvLyBzZXQgdXAgY2FudmFzXG5cdFx0bGV0IGcgPSB0aGlzLmJtcC5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdGxldCBmb250U3RhY2sgPSAnXCJIZWx2ZXRpY2EgTmV1ZVwiLCBIZWx2ZXRpY2EsIEFyaWFsLCBTYW5zLVNlcmlmJztcblx0XHRnLmZpbGxTdHlsZSA9ICcjMjIyJztcblx0XHRnLmZpbGxSZWN0KDAsIDAsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSwgTmFtZXBsYXRlLnRleHR1cmVTaXplLzIpO1xuXHRcdGcuZm9udCA9IGBib2xkICR7Zm9udFNpemV9cHggJHtmb250U3RhY2t9YDtcblx0XHRnLnRleHRBbGlnbiA9ICdjZW50ZXInO1xuXHRcdGcuZmlsbFN0eWxlID0gJ3doaXRlJztcblx0XHRnLmZpbGxUZXh0KHRleHQsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZS8yLCAoMC40MiAtIDAuMTIpKihOYW1lcGxhdGUudGV4dHVyZVNpemUvMikpO1xuXG5cdFx0dGhpcy5tb2RlbC5tYXRlcmlhbC5tYXAubmVlZHNVcGRhdGUgPSB0cnVlO1xuXHR9XG5cblxuXG5cdGNsaWNrKGUpXG5cdHtcblx0XHRpZighdGhpcy5zZWF0Lm93bmVyICYmIFNILmdhbWUuc3RhdGUgPT09ICdzZXR1cCcpXG5cdFx0XHR0aGlzLnJlcXVlc3RKb2luKCk7XG5cdFx0ZWxzZSBpZih0aGlzLnNlYXQub3duZXIgPT09IFNILmxvY2FsVXNlci5pZClcblx0XHRcdHRoaXMucmVxdWVzdExlYXZlKCk7XG5cdFx0ZWxzZSBpZih0aGlzLnNlYXQub3duZXIgJiYgU0guZ2FtZS50dXJuT3JkZXIuaW5jbHVkZXMoU0gubG9jYWxVc2VyLmlkKSlcblx0XHRcdHRoaXMucmVxdWVzdEtpY2soKTtcblx0fVxuXG5cdHJlcXVlc3RKb2luKClcblx0e1xuXHRcdFNILnNvY2tldC5lbWl0KCdqb2luJywgT2JqZWN0LmFzc2lnbih7c2VhdE51bTogdGhpcy5zZWF0LnNlYXROdW19LCBTSC5sb2NhbFVzZXIpKTtcblx0fVxuXG5cdHJlcXVlc3RMZWF2ZSgpXG5cdHtcblx0XHRsZXQgc2VsZiA9IHRoaXM7XG5cdFx0aWYoIXNlbGYucXVlc3Rpb24pXG5cdFx0e1xuXHRcdFx0c2VsZi5xdWVzdGlvbiA9IHNlbGYuc2VhdC5iYWxsb3QuYXNrUXVlc3Rpb24oJ0FyZSB5b3Ugc3VyZSB5b3VcXG53YW50IHRvIGxlYXZlPycsICdsb2NhbF9sZWF2ZScpXG5cdFx0XHQudGhlbihjb25maXJtID0+IHtcblx0XHRcdFx0aWYoY29uZmlybSl7XG5cdFx0XHRcdFx0U0guc29ja2V0LmVtaXQoJ2xlYXZlJywgU0gubG9jYWxVc2VyLmlkKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRzZWxmLnF1ZXN0aW9uID0gbnVsbDtcblx0XHRcdH0pXG5cdFx0XHQuY2F0Y2goKCkgPT4geyBzZWxmLnF1ZXN0aW9uID0gbnVsbDsgfSk7XG5cdFx0fVxuXHR9XG5cblx0cmVxdWVzdEtpY2soKVxuXHR7XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXHRcdGlmKCFzZWxmLnF1ZXN0aW9uKVxuXHRcdHtcblx0XHRcdGxldCBzZWF0ID0gU0guc2VhdHNbU0gucGxheWVyc1tTSC5sb2NhbFVzZXIuaWRdLnNlYXROdW1dO1xuXHRcdFx0c2VsZi5xdWVzdGlvbiA9IHNlYXQuYmFsbG90LmFza1F1ZXN0aW9uKFxuXHRcdFx0XHQnQXJlIHlvdSBzdXJlIHlvdVxcbndhbnQgdG8gdHJ5IHRvIGtpY2tcXG4nXG5cdFx0XHRcdCtTSC5wbGF5ZXJzW3NlbGYuc2VhdC5vd25lcl0uZGlzcGxheU5hbWUsXG5cdFx0XHRcdCdsb2NhbF9raWNrJ1xuXHRcdFx0KVxuXHRcdFx0LnRoZW4oY29uZmlybSA9PiB7XG5cdFx0XHRcdGlmKGNvbmZpcm0pe1xuXHRcdFx0XHRcdFNILnNvY2tldC5lbWl0KCdraWNrJywgU0gubG9jYWxVc2VyLmlkLCBzZWxmLnNlYXQub3duZXIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNlbGYucXVlc3Rpb24gPSBudWxsO1xuXHRcdFx0fSlcblx0XHRcdC5jYXRjaCgoKSA9PiB7IHNlbGYucXVlc3Rpb24gPSBudWxsOyB9KTtcblx0XHR9XG5cdH1cbn1cblxuTmFtZXBsYXRlLnRleHR1cmVTaXplID0gMjU2O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKlxuKiBIYXZlIHRvIGNvbXBsZXRlbHkgcmVpbXBsZW1lbnQgcHJvbWlzZXMgZnJvbSBzY3JhdGNoIGZvciB0aGlzIDooXG4qIFRoaXMgY2xhc3MgaXMgYSBwcm9taXNlIHRoYXQgdHJhY2tzIGRlcGVuZGVuY2llcywgYW5kIGV2YWx1YXRlc1xuKiB3aGVuIHRoZXkgYXJlIG1ldC4gSXQncyBhbHNvIGNhbmNlbGxhYmxlLCBjYWxsaW5nIGl0cyBkZXBlbmRlbnRzXG4qIGFzIHNvb24gYXMgaXRzIGRlcGVuZGVuY2llcyBhcmUgbWV0LlxuKi9cbmNsYXNzIENhc2NhZGluZ1Byb21pc2VcbntcbiAgICBjb25zdHJ1Y3RvcihwcmVyZXFQcm9taXNlLCBleGVjRm4sIGNsZWFudXBGbilcbiAgICB7XG4gICAgICAgIC8vIHNldCB1cCBzdGF0ZSBpbmZvcm1hdGlvblxuICAgICAgICB0aGlzLnN0YXRlID0gJ3BlbmRpbmcnO1xuICAgICAgICB0aGlzLnByZXJlcVByb21pc2UgPSBwcmVyZXFQcm9taXNlIHx8IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB0aGlzLmV4ZWNGbiA9IGV4ZWNGbjtcbiAgICAgICAgdGhpcy5jbGVhbnVwRm4gPSBjbGVhbnVwRm47XG5cbiAgICAgICAgLy8gdHJhY2sgY2FsbGJhY2tzXG4gICAgICAgIHRoaXMuX3Jlc29sdmVDYWxsYmFja3MgPSBbXTtcbiAgICAgICAgdGhpcy5fcmVqZWN0Q2FsbGJhY2tzID0gW107XG4gICAgICAgIHRoaXMuX2V4ZWNUeXBlID0gbnVsbDtcbiAgICAgICAgdGhpcy5fZXhlY1Jlc3VsdCA9IFtdO1xuXG4gICAgICAgIC8vIGJpbmQgZXZlbnRzXG4gICAgICAgIGxldCBjYiA9IHRoaXMuX3ByZXJlcVNldHRsZWQuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5wcmVyZXFQcm9taXNlLnRoZW4oY2IsIGNiKTtcbiAgICB9XG5cbiAgICBfcHJlcmVxU2V0dGxlZCgpe1xuICAgICAgICBmdW5jdGlvbiBzZXR0bGUodHlwZSl7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oLi4uYXJncyl7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXhlY1NldHRsZWQodHlwZSwgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLnN0YXRlID09PSAncGVuZGluZycpe1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9ICdydW5uaW5nJztcbiAgICAgICAgICAgIHRoaXMuZXhlY0ZuKFxuICAgICAgICAgICAgICAgIHNldHRsZSgncmVzb2x2ZScpLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgc2V0dGxlKCdyZWplY3QnKS5iaW5kKHRoaXMpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYodGhpcy5zdGF0ZSA9PT0gJ2NhbmNlbGxlZCcpe1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9ICdzZXR0bGVkJztcbiAgICAgICAgICAgIHRoaXMuX3Jlc29sdmVDYWxsYmFja3MuZm9yRWFjaChjYiA9PiBjYigpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9leGVjU2V0dGxlZCh0eXBlLCByZXN1bHQpe1xuICAgICAgICBpZih0aGlzLnN0YXRlID09PSAncnVubmluZycpe1xuICAgICAgICAgICAgdGhpcy5fZXhlY1R5cGUgPSB0eXBlO1xuICAgICAgICAgICAgdGhpcy5fZXhlY1Jlc3VsdCA9IHJlc3VsdDtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSAnY2xlYW5pbmd1cCc7XG4gICAgICAgICAgICB0aGlzLmNsZWFudXBGbih0aGlzLl9jbGVhbnVwRG9uZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9jbGVhbnVwRG9uZSgpe1xuICAgICAgICBpZih0aGlzLnN0YXRlID09PSAnY2xlYW5pbmd1cCcpe1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9ICdzZXR0bGVkJztcbiAgICAgICAgICAgIGlmKHRoaXMuX2V4ZWNUeXBlID09PSAncmVzb2x2ZScpe1xuICAgICAgICAgICAgICAgIHRoaXMuX3Jlc29sdmVDYWxsYmFja3MuZm9yRWFjaChcbiAgICAgICAgICAgICAgICAgICAgKGNiID0+IGNiKC4uLnRoaXMuX2V4ZWNSZXN1bHQpKS5iaW5kKHRoaXMpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlamVjdENhbGxiYWNrcy5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAoY2IgPT4gY2IoLi4udGhpcy5fZXhlY1Jlc3VsdCkpLmJpbmQodGhpcylcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2FuY2VsKCl7XG4gICAgICAgIGlmKHRoaXMuc3RhdGUgPT09ICdydW5uaW5nJyl7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gJ2NsZWFuaW5ndXAnO1xuICAgICAgICAgICAgdGhpcy5jbGVhbnVwRm4odGhpcy5fY2xlYW51cERvbmUuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZih0aGlzLnN0YXRlID09PSAncGVuZGluZycpe1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9ICdjYW5jZWxsZWQnO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhlbihkb25lQ2IsIGVyckNiKVxuICAgIHtcbiAgICAgICAgaWYodGhpcy5zdGF0ZSA9PT0gJ3NldHRsZWQnKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZih0aGlzLl9leGVjVHlwZSA9PT0gJ3Jlc29sdmUnKXtcbiAgICAgICAgICAgICAgICBkb25lQ2IoLi4udGhpcy5fZXhlY1Jlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBlcnJDYiguLi50aGlzLl9leGVjUmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3Jlc29sdmVDYWxsYmFja3MucHVzaChkb25lQ2IpO1xuICAgICAgICAgICAgaWYoZXJyQ2IpXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVqZWN0Q2FsbGJhY2tzLnB1c2goZXJyQ2IpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgY2F0Y2goY2Ipe1xuICAgICAgICBpZih0aGlzLnN0YXRlID09PSAnc2V0dGxlZCcpe1xuICAgICAgICAgICAgaWYodGhpcy5fZXhlY1R5cGUgPT09ICdyZWplY3QnKVxuICAgICAgICAgICAgICAgIGNiKC4uLnRoaXMuX2V4ZWNSZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMuX3JlamVjdENhbGxiYWNrcy5wdXNoKGNiKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IENhc2NhZGluZ1Byb21pc2U7XG4iLCIndXNlIHN0cmljdDsnXG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgeyBKYUNhcmQsIE5laW5DYXJkIH0gZnJvbSAnLi9jYXJkJztcbmltcG9ydCB7IGdlbmVyYXRlUXVlc3Rpb24gfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBDYXNjYWRpbmdQcm9taXNlIGZyb20gJy4vY2FzY2FkaW5ncHJvbWlzZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEJhbGxvdCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG4gICAgY29uc3RydWN0b3Ioc2VhdClcbiAgICB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuc2VhdCA9IHNlYXQ7XG4gICAgICAgIHRoaXMucXVlc3Rpb25zID0ge307XG4gICAgICAgIHRoaXMubGFzdEFza2VkID0gbnVsbDtcblxuICAgICAgICB0aGlzLl95ZXNDbGlja0hhbmRsZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9ub0NsaWNrSGFuZGxlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5qYUNhcmQgPSBuZXcgSmFDYXJkKCk7XG4gICAgICAgIHRoaXMubmVpbkNhcmQgPSBuZXcgTmVpbkNhcmQoKTtcbiAgICAgICAgW3RoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkXS5mb3JFYWNoKGMgPT4ge1xuICAgICAgICAgICAgYy5wb3NpdGlvbi5zZXQoYyBpbnN0YW5jZW9mIEphQ2FyZCA/IC0wLjEgOiAwLjEsIC0wLjEsIDApO1xuICAgICAgICAgICAgYy5yb3RhdGlvbi5zZXQoMC41LCBNYXRoLlBJLCAwKTtcbiAgICAgICAgICAgIGMuc2NhbGUuc2V0U2NhbGFyKDAuMTUpO1xuICAgICAgICAgICAgYy5oaWRlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFkZCh0aGlzLmphQ2FyZCwgdGhpcy5uZWluQ2FyZCk7XG5cbiAgICAgICAgbGV0IGdlbyA9IG5ldyBUSFJFRS5QbGFuZUJ1ZmZlckdlb21ldHJ5KDAuNCwgMC4yKTtcbiAgICAgICAgbGV0IG1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7dHJhbnNwYXJlbnQ6IHRydWV9KTtcbiAgICAgICAgdGhpcy5xdWVzdGlvbiA9IG5ldyBUSFJFRS5NZXNoKGdlbywgbWF0KTtcbiAgICAgICAgdGhpcy5xdWVzdGlvbi5wb3NpdGlvbi5zZXQoMCwgMC4wNSwgMCk7XG4gICAgICAgIHRoaXMucXVlc3Rpb24ucm90YXRpb24uc2V0KDAsIE1hdGguUEksIDApO1xuICAgICAgICB0aGlzLnF1ZXN0aW9uLnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5hZGQodGhpcy5xdWVzdGlvbik7XG5cbiAgICAgICAgU0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3ZvdGVzSW5Qcm9ncmVzcycsIHRoaXMudXBkYXRlLmJpbmQodGhpcykpO1xuICAgIH1cblxuICAgIHVwZGF0ZSh7ZGF0YToge2dhbWUsIHBsYXllcnMsIHZvdGVzfX0pXG4gICAge1xuICAgICAgICBsZXQgc2VsZiA9IHRoaXM7XG4gICAgICAgIGlmKCFzZWxmLnNlYXQub3duZXIpIHJldHVybjtcblxuICAgICAgICBsZXQgdmlwcyA9IGdhbWUudm90ZXNJblByb2dyZXNzO1xuICAgICAgICBsZXQgdm90ZXNGaW5pc2hlZCA9IChTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcyB8fCBbXSkuZmlsdGVyKFxuICAgICAgICAgICAgZSA9PiAhdmlwcy5pbmNsdWRlcyhlKVxuICAgICAgICApO1xuXG4gICAgICAgIHZpcHMuZm9yRWFjaCh2SWQgPT5cbiAgICAgICAge1xuICAgICAgICAgICAgbGV0IHZzID0gWy4uLnZvdGVzW3ZJZF0ueWVzVm90ZXJzLCAuLi52b3Rlc1t2SWRdLm5vVm90ZXJzXTtcbiAgICAgICAgICAgIGxldCBudiA9IHZvdGVzW3ZJZF0ubm9uVm90ZXJzO1xuXG4gICAgICAgICAgICBsZXQgYXNrZWQgPSBzZWxmLnF1ZXN0aW9uc1t2SWRdO1xuICAgICAgICAgICAgaWYoIWFza2VkICYmICFudi5pbmNsdWRlcyhzZWxmLnNlYXQub3duZXIpICYmICF2cy5pbmNsdWRlcyhzZWxmLnNlYXQub3duZXIpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGxldCBxdWVzdGlvblRleHQ7XG4gICAgICAgICAgICAgICAgaWYodm90ZXNbdklkXS50eXBlID09PSAnZWxlY3QnKXtcbiAgICAgICAgICAgICAgICAgICAgcXVlc3Rpb25UZXh0ID0gcGxheWVyc1t2b3Rlc1t2SWRdLnRhcmdldDFdLmRpc3BsYXlOYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICArICdcXG5mb3IgcHJlc2lkZW50IGFuZFxcbidcbiAgICAgICAgICAgICAgICAgICAgICAgICsgcGxheWVyc1t2b3Rlc1t2SWRdLnRhcmdldDJdLmRpc3BsYXlOYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICArICdcXG5mb3IgY2hhbmNlbGxvcj8nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2pvaW4nKXtcbiAgICAgICAgICAgICAgICAgICAgcXVlc3Rpb25UZXh0ID0gdm90ZXNbdklkXS5kYXRhICsgJ1xcbnRvIGpvaW4/JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZih2b3Rlc1t2SWRdLnR5cGUgPT09ICdraWNrJyl7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXN0aW9uVGV4dCA9ICdWb3RlIHRvIGtpY2tcXG4nXG4gICAgICAgICAgICAgICAgICAgICAgICArIHBsYXllcnNbdm90ZXNbdklkXS50YXJnZXQxXS5kaXNwbGF5TmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgKyAnPyc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc2VsZi5hc2tRdWVzdGlvbihxdWVzdGlvblRleHQsIHZJZClcbiAgICAgICAgICAgICAgICAudGhlbihhbnN3ZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBTSC5zb2NrZXQuZW1pdCgndm90ZScsIHZJZCwgU0gubG9jYWxVc2VyLmlkLCBhbnN3ZXIpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+IGNvbnNvbGUubG9nKCdWb3RlIHNjcnViYmVkOicsIHZJZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZih2cy5pbmNsdWRlcyhzZWxmLnNlYXQub3duZXIpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmKHNlbGYucXVlc3Rpb25zW3ZJZF0pXG4gICAgICAgICAgICAgICAgICAgIHNlbGYucXVlc3Rpb25zW3ZJZF0uY2FuY2VsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZvdGVzRmluaXNoZWQuZm9yRWFjaCgodklkKSA9PiB7XG4gICAgICAgICAgICBpZihzZWxmLnF1ZXN0aW9uc1t2SWRdKVxuICAgICAgICAgICAgICAgIHNlbGYucXVlc3Rpb25zW3ZJZF0uY2FuY2VsKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFza1F1ZXN0aW9uKHFUZXh0LCBpZClcbiAgICB7XG4gICAgICAgIGxldCBzZWxmID0gdGhpcztcbiAgICAgICAgbGV0IG5ld1EgPSBuZXcgQ2FzY2FkaW5nUHJvbWlzZShzZWxmLnF1ZXN0aW9uc1tzZWxmLmxhc3RBc2tlZF0sXG4gICAgICAgICAgICAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBpcyBzdGlsbCByZWxldmFudFxuICAgICAgICAgICAgICAgIGxldCBsYXRlc3RWb3RlcyA9IFNILmdhbWUudm90ZXNJblByb2dyZXNzO1xuICAgICAgICAgICAgICAgIGlmKCEvXmxvY2FsLy50ZXN0KGlkKSAmJiAhbGF0ZXN0Vm90ZXMuaW5jbHVkZXMoaWQpKXtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBob29rIHVwIHEvYSBjYXJkc1xuICAgICAgICAgICAgICAgIHNlbGYucXVlc3Rpb24ubWF0ZXJpYWwubWFwID0gZ2VuZXJhdGVRdWVzdGlvbihxVGV4dCwgdGhpcy5xdWVzdGlvbi5tYXRlcmlhbC5tYXApO1xuICAgICAgICAgICAgICAgIHNlbGYuamFDYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgcmVzcG9uZCh0cnVlKSk7XG4gICAgICAgICAgICAgICAgc2VsZi5uZWluQ2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQoZmFsc2UpKTtcblxuICAgICAgICAgICAgICAgIC8vIHNob3cgdGhlIGJhbGxvdFxuICAgICAgICAgICAgICAgIHNlbGYucXVlc3Rpb24udmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgc2VsZi5qYUNhcmQuc2hvdygpO1xuICAgICAgICAgICAgICAgIHNlbGYubmVpbkNhcmQuc2hvdygpO1xuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVzcG9uZChhbnN3ZXIpe1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVyKClcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIG9ubHkgdGhlIG93bmVyIG9mIHRoZSBiYWxsb3QgaXMgYW5zd2VyaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzZWxmLnNlYXQub3duZXIgIT09IFNILmxvY2FsVXNlci5pZCkgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBzdGlsbCBtYXR0ZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGF0ZXN0Vm90ZXMgPSBTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCEvXmxvY2FsLy50ZXN0KGlkKSAmJiAhbGF0ZXN0Vm90ZXMuaW5jbHVkZXMoaWQpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKGFuc3dlcikgc2VsZi5feWVzQ2xpY2tIYW5kbGVyID0gaGFuZGxlcjtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBzZWxmLl9ub0NsaWNrSGFuZGxlciA9IGhhbmRsZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoZG9uZSkgPT4ge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBzZWxmLnF1ZXN0aW9uc1tpZF07XG4gICAgICAgICAgICAgICAgaWYoc2VsZi5sYXN0QXNrZWQgPT09IGlkKVxuICAgICAgICAgICAgICAgICAgICBzZWxmLmxhc3RBc2tlZCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICAvLyBoaWRlIHRoZSBxdWVzdGlvblxuICAgICAgICAgICAgICAgIHNlbGYuamFDYXJkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBzZWxmLm5laW5DYXJkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzZWxmLmphQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX3llc0NsaWNrSGFuZGxlcik7XG4gICAgICAgICAgICAgICAgc2VsZi5uZWluQ2FyZC5yZW1vdmVFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHNlbGYuX25vQ2xpY2tIYW5kbGVyKTtcbiAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gYWRkIHF1ZXN0aW9uIHRvIHF1ZXVlLCByZW1vdmUgd2hlbiBkb25lXG4gICAgICAgIHNlbGYucXVlc3Rpb25zW2lkXSA9IG5ld1E7XG4gICAgICAgIHNlbGYubGFzdEFza2VkID0gaWQ7XG4gICAgICAgIGxldCBzcGxpY2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBkZWxldGUgc2VsZi5xdWVzdGlvbnNbaWRdO1xuICAgICAgICAgICAgaWYoc2VsZi5sYXN0QXNrZWQgPT09IGlkKVxuICAgICAgICAgICAgICAgIHNlbGYubGFzdEFza2VkID0gbnVsbDtcbiAgICAgICAgfTtcbiAgICAgICAgbmV3US50aGVuKHNwbGljZSwgc3BsaWNlKTtcblxuICAgICAgICByZXR1cm4gbmV3UTtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgTmFtZXBsYXRlIGZyb20gJy4vbmFtZXBsYXRlJztcbmltcG9ydCBCYWxsb3QgZnJvbSAnLi9iYWxsb3QnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTZWF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0RcbntcbiAgICBjb25zdHJ1Y3RvcihzZWF0TnVtKVxuICAgIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLnNlYXROdW0gPSBzZWF0TnVtO1xuICAgICAgICB0aGlzLm93bmVyID0gJyc7XG5cbiAgICAgICAgLy8gcG9zaXRpb24gc2VhdFxuICAgICAgICBsZXQgeCwgeT0wLjY1LCB6O1xuICAgICAgICBzd2l0Y2goc2VhdE51bSl7XG4gICAgICAgIGNhc2UgMDogY2FzZSAxOiBjYXNlIDI6XG4gICAgICAgICAgICB4ID0gLTAuODMzICsgMC44MzMqc2VhdE51bTtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24uc2V0KHgsIHksIC0xLjA1KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6IGNhc2UgNDpcbiAgICAgICAgICAgIHogPSAtMC40MzcgKyAwLjg3NCooc2VhdE51bS0zKTtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24uc2V0KDEuNDI1LCB5LCB6KTtcbiAgICAgICAgICAgIHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJLzIsIDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XG4gICAgICAgICAgICB4ID0gMC44MzMgLSAwLjgzMyooc2VhdE51bS01KTtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24uc2V0KHgsIHksIDEuMDUpO1xuICAgICAgICAgICAgdGhpcy5yb3RhdGlvbi5zZXQoMCwgLU1hdGguUEksIDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgODogY2FzZSA5OlxuICAgICAgICAgICAgeiA9IDAuNDM3IC0gMC44NzQqKHNlYXROdW0tOCk7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uLnNldCgtMS40MjUsIHksIHopO1xuICAgICAgICAgICAgdGhpcy5yb3RhdGlvbi5zZXQoMCwgLTEuNSpNYXRoLlBJLCAwKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5uYW1lcGxhdGUgPSBuZXcgTmFtZXBsYXRlKHRoaXMpO1xuICAgICAgICB0aGlzLm5hbWVwbGF0ZS5wb3NpdGlvbi5zZXQoMCwgLTAuNjM1LCAwLjIyKTtcbiAgICAgICAgdGhpcy5hZGQodGhpcy5uYW1lcGxhdGUpO1xuXG4gICAgICAgIHRoaXMuYmFsbG90ID0gbmV3IEJhbGxvdCh0aGlzKTtcbiAgICAgICAgdGhpcy5iYWxsb3QucG9zaXRpb24uc2V0KDAsIC0wLjMsIDAuMjUpO1xuICAgICAgICAvL3RoaXMuYmFsbG90LnJvdGF0ZVkoMC4xKTtcbiAgICAgICAgdGhpcy5hZGQodGhpcy5iYWxsb3QpO1xuXG5cdFx0U0guYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlX3R1cm5PcmRlcicsIHRoaXMudXBkYXRlT3duZXJzaGlwLmJpbmQodGhpcykpO1xuICAgICAgICBTSC5hZGRFdmVudExpc3RlbmVyKCdjaGVja2VkSW4nLCAoaWQgPT4ge1xuICAgICAgICAgICAgaWYodGhpcy5vd25lciA9PT0gaWQpXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lOiBTSC5nYW1lLCBwbGF5ZXJzOiBTSC5wbGF5ZXJzfX0pO1xuICAgICAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICB1cGRhdGVPd25lcnNoaXAoe2RhdGE6IHtnYW1lLCBwbGF5ZXJzfX0pXG5cdHtcblx0XHRsZXQgaWRzID0gZ2FtZS50dXJuT3JkZXI7XG5cbiAgICAgICAgLy8gcmVnaXN0ZXIgdGhpcyBzZWF0IGlmIGl0J3MgbmV3bHkgY2xhaW1lZFxuXHRcdGlmKCAhdGhpcy5vd25lciApXG5cdFx0e1xuXHRcdFx0Ly8gY2hlY2sgaWYgYSBwbGF5ZXIgaGFzIGpvaW5lZCBhdCB0aGlzIHNlYXRcblx0XHRcdGZvcihsZXQgaSBpbiBpZHMpe1xuXHRcdFx0XHRpZihwbGF5ZXJzW2lkc1tpXV0uc2VhdE51bSA9PT0gdGhpcy5zZWF0TnVtKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vd25lciA9IGlkc1tpXTtcblx0XHRcdFx0XHR0aGlzLm5hbWVwbGF0ZS51cGRhdGVUZXh0KHBsYXllcnNbaWRzW2ldXS5kaXNwbGF5TmFtZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cbiAgICAgICAgLy8gcmVzZXQgdGhpcyBzZWF0IGlmIGl0J3MgbmV3bHkgdmFjYXRlZFxuXHRcdGlmKCAhaWRzLmluY2x1ZGVzKHRoaXMub3duZXIpIClcblx0XHR7XG4gICAgICAgICAgICB0aGlzLm93bmVyID0gJyc7XG5cdFx0XHRpZihnYW1lLnN0YXRlID09PSAnc2V0dXAnKXtcblx0XHRcdFx0dGhpcy5uYW1lcGxhdGUudXBkYXRlVGV4dCgnPEpvaW4+Jyk7XG5cdFx0XHR9XG5cdFx0fVxuXG4gICAgICAgIC8vIHVwZGF0ZSBkaXNjb25uZWN0IGNvbG9yc1xuICAgICAgICBlbHNlIGlmKCAhcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcbiAgICAgICAgICAgIHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweDgwODA4MCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiggcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQgKXtcbiAgICAgICAgICAgIHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweGZmZmZmZik7XG4gICAgICAgIH1cblx0fVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGxheWVyTWV0ZXIgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuICAgIGNvbnN0cnVjdG9yKClcbiAgICB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgbGV0IG1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnBsYXllcm1ldGVyO1xuICAgICAgICBtb2RlbC5wb3NpdGlvbi5zZXQoMCwgMC4xNSwgMCk7XG4gICAgICAgIG1vZGVsLnNjYWxlLnNldFNjYWxhcigwLjgpO1xuXG4gICAgICAgIC8vIHNldCB1cCByYWluYm93IG1ldGVyXG4gICAgICAgIHRoaXMucG0gPSBtb2RlbC5jaGlsZHJlblswXS5jaGlsZHJlblswXTtcbiAgICAgICAgdGhpcy5wbS5tYXRlcmlhbC52ZXJ0ZXhDb2xvcnMgPSBUSFJFRS5WZXJ0ZXhDb2xvcnM7XG4gICAgICAgIHRoaXMucG0ubWF0ZXJpYWwuY29sb3Iuc2V0KDB4ZmZmZmZmKTtcbiAgICAgICAgLy90aGlzLnBtLm1hdGVyaWFsLm5lZWRzVXBkYXRlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5wbS52aXNpYmxlID0gZmFsc2U7XG5cbiAgICAgICAgLy8gc2V0IHVwIGxhYmVsXG4gICAgICAgIHRoaXMubGFiZWwgPSBtb2RlbC5jaGlsZHJlblswXS5jaGlsZHJlblsxXS5jaGlsZHJlblswXTtcbiAgICAgICAgdGhpcy5sYWJlbC52aXNpYmxlID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5hZGQobW9kZWwpO1xuXG4gICAgICAgIC8vIHNldCB1cCBnYXVnZVxuICAgICAgICB0aGlzLmdhdWdlID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG4gICAgICAgIHRoaXMuZ2F1Z2UucG9zaXRpb24uc2V0KDAsIDAuMTUsIDApO1xuXG4gICAgICAgIGxldCB3ZWRnZU1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4YzBjMGMwfSk7XG4gICAgICAgIGZvcihsZXQgaT0wOyBpPDQ7IGkrKyl7XG4gICAgICAgICAgICBsZXQgd2VkZ2UgPSBuZXcgVEhSRUUuTWVzaChuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKSwgd2VkZ2VNYXQpO1xuICAgICAgICAgICAgd2VkZ2Uucm90YXRpb24uc2V0KDAsIGkqTWF0aC5QSS8yLCAwKTtcbiAgICAgICAgICAgIHRoaXMuZ2F1Z2UuYWRkKHdlZGdlKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldE1ldGVyVmFsdWUoMCk7XG4gICAgICAgIHRoaXMuYWRkKHRoaXMuZ2F1Z2UpO1xuXG4gICAgICAgIFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLmFkanVzdFBsYXllckNvdW50LmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2N1cnNvcnVwJywgdGhpcy5vbmNsaWNrLmJpbmQodGhpcykpO1xuICAgIH1cblxuICAgIHNldE1ldGVyVmFsdWUodmFsKVxuICAgIHtcbiAgICAgICAgbGV0IHdlZGdlR2VvID0gbmV3IFRIUkVFLkN5bGluZGVyQnVmZmVyR2VvbWV0cnkoXG4gICAgICAgICAgICAwLjQsIDAuNCwgMC4xNSwgNDAsIDEsIGZhbHNlLCAtTWF0aC5QSS80LCAodmFsLzEwKSpNYXRoLlBJLzJcbiAgICAgICAgKTtcbiAgICAgICAgdGhpcy5nYXVnZS5jaGlsZHJlbi5mb3JFYWNoKG8gPT4geyBvLmdlb21ldHJ5ID0gd2VkZ2VHZW87IH0pO1xuICAgIH1cblxuICAgIGFkanVzdFBsYXllckNvdW50KHtkYXRhOiB7Z2FtZToge3R1cm5PcmRlciwgc3RhdGV9fX0pXG4gICAge1xuICAgICAgICBpZihzdGF0ZSA9PT0gJ3NldHVwJyl7XG4gICAgICAgICAgICB0aGlzLnNldE1ldGVyVmFsdWUodHVybk9yZGVyLmxlbmd0aCk7XG4gICAgICAgICAgICB0aGlzLnBtLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5sYWJlbC52aXNpYmxlID0gdHVybk9yZGVyLmxlbmd0aCA+PSA1O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wbS52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmxhYmVsLnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uY2xpY2soZXZ0KVxuICAgIHtcbiAgICAgICAgbGV0IHRvID0gU0guZ2FtZS50dXJuT3JkZXI7XG4gICAgICAgIGlmKFNILmdhbWUuc3RhdGUgPT09ICdzZXR1cCcgJiYgdG8ubGVuZ3RoID49IDUgJiYgdG8ubGVuZ3RoIDw9IDEwXG4gICAgICAgICAgICAmJiB0by5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKVxuICAgICAgICB7XG4gICAgICAgICAgICBTSC5zb2NrZXQuZW1pdCgnc3RhcnQnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCAqIGFzIENhcmRzIGZyb20gJy4vY2FyZCc7XG5pbXBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfSBmcm9tICcuL2hhdHMnO1xuaW1wb3J0IEdhbWVUYWJsZSBmcm9tICcuL3RhYmxlJztcbmltcG9ydCBBc3NldE1hbmFnZXIgZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuaW1wb3J0IHsgZ2V0R2FtZUlkLCBtZXJnZU9iamVjdHMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnO1xuaW1wb3J0IFNlYXQgZnJvbSAnLi9zZWF0JztcbmltcG9ydCBQbGF5ZXJNZXRlciBmcm9tICcuL3BsYXllcm1ldGVyJztcblxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmFzc2V0cyA9IEFzc2V0TWFuYWdlci5tYW5pZmVzdDtcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcblx0XHR0aGlzLm5lZWRzU2tlbGV0b24gPSB0cnVlO1xuXG5cdFx0Ly8gcG9seWZpbGwgZ2V0VXNlciBmdW5jdGlvblxuXHRcdGlmKCFhbHRzcGFjZS5pbkNsaWVudCl7XG5cdFx0XHRhbHRzcGFjZS5nZXRVc2VyID0gKCkgPT4ge1xuXHRcdFx0XHRsZXQgaWQsIHJlID0gL1s/Jl11c2VySWQ9KFxcZCspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRcdFx0XHRpZihyZSlcblx0XHRcdFx0XHRpZCA9IHJlWzFdO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0aWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMCkudG9TdHJpbmcoKTtcblxuXHRcdFx0XHRhbHRzcGFjZS5fbG9jYWxVc2VyID0ge1xuXHRcdFx0XHRcdHVzZXJJZDogaWQsXG5cdFx0XHRcdFx0ZGlzcGxheU5hbWU6IGlkLFxuXHRcdFx0XHRcdGlzTW9kZXJhdG9yOiBmYWxzZVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRjb25zb2xlLmxvZygnTWFzcXVlcmFkaW5nIGFzJywgYWx0c3BhY2UuX2xvY2FsVXNlcik7XG5cdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoYWx0c3BhY2UuX2xvY2FsVXNlcik7XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIGdldCBsb2NhbCB1c2VyXG5cdFx0YWx0c3BhY2UuZ2V0VXNlcigpLnRoZW4oKHVzZXIgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcblx0XHRcdFx0aWQ6IHVzZXIudXNlcklkLFxuXHRcdFx0XHRkaXNwbGF5TmFtZTogdXNlci5kaXNwbGF5TmFtZSxcblx0XHRcdFx0aXNNb2RlcmF0b3I6IHVzZXIuaXNNb2RlcmF0b3Jcblx0XHRcdH07XG5cdFx0fSkuYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLmdhbWUgPSB7fTtcblx0XHR0aGlzLnBsYXllcnMgPSB7fTtcblx0XHR0aGlzLnZvdGVzID0ge307XG5cdH1cblxuXHRpbml0aWFsaXplKGVudiwgcm9vdCwgYXNzZXRzKVxuXHR7XG5cdFx0Ly8gc2hhcmUgdGhlIGRpb3JhbWEgaW5mb1xuXHRcdEFzc2V0TWFuYWdlci5jYWNoZSA9IGFzc2V0cztcblx0XHR0aGlzLmVudiA9IGVudjtcblxuXHRcdC8vIGNvbm5lY3QgdG8gc2VydmVyXG5cdFx0dGhpcy5zb2NrZXQgPSBpby5jb25uZWN0KCcvJywge3F1ZXJ5OiAnZ2FtZUlkPScrZ2V0R2FtZUlkKCl9KTtcblxuXHRcdC8vIGNyZWF0ZSB0aGUgdGFibGVcblx0XHR0aGlzLnRhYmxlID0gbmV3IEdhbWVUYWJsZSgpO1xuXHRcdHRoaXMuYWRkKHRoaXMudGFibGUpO1xuXG5cdFx0dGhpcy5yZXNldEJ1dHRvbiA9IG5ldyBUSFJFRS5NZXNoKFxuXHRcdFx0bmV3IFRIUkVFLkJveEdlb21ldHJ5KC4yNSwuMjUsLjI1KSxcblx0XHRcdG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBhc3NldHMudGV4dHVyZXMucmVzZXR9KVxuXHRcdCk7XG5cdFx0dGhpcy5yZXNldEJ1dHRvbi5wb3NpdGlvbi5zZXQoMCwgLTAuMTgsIDApO1xuXHRcdHRoaXMucmVzZXRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLnJlc2V0LmJpbmQodGhpcykpO1xuXHRcdHRoaXMudGFibGUuYWRkKHRoaXMucmVzZXRCdXR0b24pO1xuXG5cdFx0Ly8gY3JlYXRlIGlkbGUgZGlzcGxheVxuXHRcdHRoaXMuaWRsZVJvb3QgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblx0XHR0aGlzLmlkbGVSb290LnBvc2l0aW9uLnNldCgwLCAxLjg1LCAwKTtcblx0XHR0aGlzLmlkbGVSb290LmFkZEJlaGF2aW9yKG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLlNwaW4oe3NwZWVkOiAwLjAwMDJ9KSk7XG5cdFx0dGhpcy5hZGQodGhpcy5pZGxlUm9vdCk7XG5cblx0XHQvLyBjcmVhdGUgaWRsZSBzbGlkZXNob3dcblx0XHRsZXQgY3JlZGl0cyA9IG5ldyBDYXJkcy5DcmVkaXRzQ2FyZCgpO1xuXHRcdHRoaXMuaWRsZVJvb3QuYWRkKGNyZWRpdHMpO1xuXG5cdFx0Ly8gY3JlYXRlIGhhdHNcblx0XHR0aGlzLnByZXNpZGVudEhhdCA9IG5ldyBQcmVzaWRlbnRIYXQoKTtcblx0XHR0aGlzLmNoYW5jZWxsb3JIYXQgPSBuZXcgQ2hhbmNlbGxvckhhdCgpO1xuXG5cdFx0Ly8gY3JlYXRlIHBvc2l0aW9uc1xuXHRcdHRoaXMuc2VhdHMgPSBbXTtcblx0XHRmb3IobGV0IGk9MDsgaTwxMDsgaSsrKXtcblx0XHRcdHRoaXMuc2VhdHMucHVzaCggbmV3IFNlYXQoaSkgKTtcblx0XHR9XG5cblx0XHR0aGlzLnRhYmxlLmFkZCguLi50aGlzLnNlYXRzKTtcblxuXHRcdHRoaXMucGxheWVyTWV0ZXIgPSBuZXcgUGxheWVyTWV0ZXIoKTtcblx0XHR0aGlzLnRhYmxlLmFkZCh0aGlzLnBsYXllck1ldGVyKTtcblxuXHRcdC8vIGFkZCBhdmF0YXIgZm9yIHNjYWxlXG5cdFx0YXNzZXRzLm1vZGVscy5kdW1teS5wb3NpdGlvbi5zZXQoMCwgMCwgMS4xKTtcblx0XHRhc3NldHMubW9kZWxzLmR1bW15LnJvdGF0ZVooTWF0aC5QSSk7XG5cdFx0dGhpcy5hZGQoYXNzZXRzLm1vZGVscy5kdW1teSk7XG5cblx0XHR0aGlzLnNvY2tldC5vbigndXBkYXRlJywgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuc29ja2V0Lm9uKCdjaGVja2VkSW4nLCB0aGlzLmNoZWNrZWRJbi5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdHVwZGF0ZUZyb21TZXJ2ZXIoZ2QsIHBkLCB2ZClcblx0e1xuXHRcdGNvbnNvbGUubG9nKGdkLCBwZCwgdmQpO1xuXG5cdFx0bGV0IGdhbWUgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdhbWUsIGdkKTtcblx0XHRsZXQgcGxheWVycyA9IG1lcmdlT2JqZWN0cyh0aGlzLnBsYXllcnMsIHBkIHx8IHt9KTtcblx0XHRsZXQgdm90ZXMgPSBtZXJnZU9iamVjdHModGhpcy52b3RlcywgdmQgfHwge30pO1xuXG5cdFx0Zm9yKGxldCBmaWVsZCBpbiBnZClcblx0XHR7XG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoe1xuXHRcdFx0XHR0eXBlOiAndXBkYXRlXycrZmllbGQsXG5cdFx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0Z2FtZTogZ2FtZSxcblx0XHRcdFx0XHRwbGF5ZXJzOiBwbGF5ZXJzLFxuXHRcdFx0XHRcdHZvdGVzOiB2b3Rlc1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZihwbGF5ZXJzW3RoaXMubG9jYWxVc2VyLmlkXSAmJiAhcGxheWVyc1t0aGlzLmxvY2FsVXNlci5pZF0uY29ubmVjdGVkKXtcblx0XHRcdHRoaXMuc29ja2V0LmVtaXQoJ2NoZWNrSW4nLCB0aGlzLmxvY2FsVXNlcik7XG5cdFx0fVxuXG5cdFx0dGhpcy5nYW1lID0gZ2FtZTtcblx0XHR0aGlzLnBsYXllcnMgPSBwbGF5ZXJzO1xuXHRcdHRoaXMudm90ZXMgPSB2b3Rlcztcblx0fVxuXG5cdGNoZWNrZWRJbihwKVxuXHR7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLnBsYXllcnNbcC5pZF0sIHApO1xuXHRcdHRoaXMuZGlzcGF0Y2hFdmVudCh7XG5cdFx0XHR0eXBlOiAnY2hlY2tlZEluJyxcblx0XHRcdGJ1YmJsZXM6IGZhbHNlLFxuXHRcdFx0ZGF0YTogcC5pZFxuXHRcdH0pO1xuXHR9XG5cblx0cmVzZXQoZSl7XG5cdFx0aWYodGhpcy5sb2NhbFVzZXIuaXNNb2RlcmF0b3Ipe1xuXHRcdFx0Y29uc29sZS5sb2coJ3JlcXVlc3RpbmcgcmVzZXQnKTtcblx0XHRcdHRoaXMuc29ja2V0LmVtaXQoJ3Jlc2V0Jyk7XG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBTZWNyZXRIaXRsZXIoKTtcbiJdLCJuYW1lcyI6WyJzdXBlciIsImxldCIsIkFzc2V0TWFuYWdlciIsInRoaXMiLCJDYXJkcy5DcmVkaXRzQ2FyZCJdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsU0FBZTtDQUNkLFFBQVEsRUFBRTtFQUNULE1BQU0sRUFBRTtHQUNQLEtBQUssRUFBRSx3QkFBd0I7R0FDL0IsU0FBUyxFQUFFLDRCQUE0QjtHQUN2QyxNQUFNLEVBQUUsMEJBQTBCO0dBQ2xDLFFBQVEsRUFBRSw2QkFBNkI7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QUFBOztDQUVELGtCQUFBLE1BQU07Q0FDTjs7RUFFQ0EsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7RUFDdERBLElBQUksSUFBSSxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsVUFBQSxDQUFDLEVBQUMsU0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUEsQ0FBQztFQUM3RCxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzs7RUFHOUIsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO0dBQ2IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztHQUNuRTs7O0VBR0QsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO0dBQ2QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0dBQ2xGOzs7RUFHRCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7R0FDZixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0dBQ3BFOzs7RUFHRCxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7R0FDWCxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUNuQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7R0FDbEM7RUFDRCxDQUFBOzs7RUFuRW9CLFFBb0VyQixHQUFBOztBQUVELE9BQU8sQ0FBQyxLQUFLLEdBQUcsVUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFO0NBRTlCQSxJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7Q0FDbEQsR0FBRyxPQUFPLENBQUM7RUFDVixPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQzFCLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDdEI7TUFDSTtFQUNKLE1BQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztFQUN4QztDQUNELENBQUEsQUFFRCxBQUF1Qjs7QUM5RXZCQSxJQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0NBQ3pCLGNBQWMsRUFBRSxDQUFDO0NBQ2pCLGNBQWMsRUFBRSxDQUFDO0NBQ2pCLFlBQVksRUFBRSxDQUFDO0NBQ2YsWUFBWSxFQUFFLENBQUM7Q0FDZixXQUFXLEVBQUUsQ0FBQztDQUNkLGFBQWEsRUFBRSxDQUFDO0NBQ2hCLGFBQWEsRUFBRSxDQUFDO0NBQ2hCLEVBQUUsRUFBRSxDQUFDO0NBQ0wsSUFBSSxFQUFFLENBQUM7Q0FDUCxLQUFLLEVBQUUsQ0FBQztDQUNSLE9BQU8sRUFBRSxFQUFFO0NBQ1gsQ0FBQyxDQUFDOztBQUVILFNBQVMsUUFBUSxDQUFDLEdBQUE7QUFDbEI7S0FEbUIsSUFBSSxZQUFFO0tBQUEsSUFBSSxZQUFFO0tBQUEsS0FBSyxhQUFFO0tBQUEsR0FBRyxXQUFFO0tBQUEsTUFBTTs7Q0FFaEQsR0FBRyxJQUFJO0VBQ04sRUFBQSxPQUFPLENBQUM7R0FDUCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztHQUM1QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQztHQUMvQixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQztHQUM3QixDQUFDO0dBQ0QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUM7R0FDL0IsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUM7R0FDaEMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUM7R0FDN0IsQ0FBQyxDQUFDLEVBQUE7O0VBRUgsRUFBQSxPQUFPLENBQUM7R0FDUCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQztHQUM1QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztHQUMvQixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQztHQUM3QixDQUFDO0dBQ0QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUM7R0FDL0IsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUM7R0FDaEMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUM7R0FDN0IsQ0FBQyxDQUFDLEVBQUE7Q0FDSjs7QUFFRCxTQUFTLE1BQU0sQ0FBQyxJQUFJO0FBQ3BCO0NBQ0NBLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDOztDQUVsRCxPQUFPLElBQUk7O0NBRVgsS0FBSyxLQUFLLENBQUMsY0FBYztFQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztFQUMxRSxNQUFN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
