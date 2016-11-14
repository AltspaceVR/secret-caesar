var SecretHitler = (function () {
'use strict';

var AM = { 
	manifest: {
		models: {
			table: 'static/model/table.dae',
			tophat: 'static/model/tophat.dae',
			visorcap: 'static/model/visor_cap.dae'
		},
		textures: {
			board_large: 'static/img/board-large-baked.png',
			board_med: 'static/img/board-medium-baked.png',
			board_small: 'static/img/board-small-baked.png',
			cards: 'static/img/cards.png'
		}
	},
	cache: {}
};

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
	BLANK: 9
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

var HitlerRoleCard = (function (Card) {
	function HitlerRoleCard(secret){
		if ( secret === void 0 ) secret = false;

		Card.call(this, Types.ROLE_HITLER, false, secret);
	}

	if ( Card ) HitlerRoleCard.__proto__ = Card;
	HitlerRoleCard.prototype = Object.create( Card && Card.prototype );
	HitlerRoleCard.prototype.constructor = HitlerRoleCard;

	return HitlerRoleCard;
}(Card));

var PresidentHat = (function (superclass) {
	function PresidentHat(){
		superclass.call(this);
		this.model = AM.cache.models.tophat;
		this.model.position.set(0,0,0);
		this.model.rotation.set(-Math.PI/2, 0, 0);
		this.add(this.model);
	}

	if ( superclass ) PresidentHat.__proto__ = superclass;
	PresidentHat.prototype = Object.create( superclass && superclass.prototype );
	PresidentHat.prototype.constructor = PresidentHat;

	return PresidentHat;
}(THREE.Object3D));

var ChancellorHat = (function (superclass) {
	function ChancellorHat(){
		superclass.call(this);
		this.model = AM.cache.models.visorcap;
		this.model.position.set(0,0,0);
		this.model.rotation.set(-Math.PI/2, 0, 0);
		this.add(this.model);
	}

	if ( superclass ) ChancellorHat.__proto__ = superclass;
	ChancellorHat.prototype = Object.create( superclass && superclass.prototype );
	ChancellorHat.prototype.constructor = ChancellorHat;

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
		this.tableModel = AM.cache.models.table.children[0];
		this.tableModel.rotation.set(-Math.PI/2, 0, 0);
		this.add(this.tableModel);

		// set the default material
		this.tableModel.material.map = this.textures[0];

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

var SecretHitler = (function (superclass) {
	function SecretHitler()
	{
		superclass.call(this);
		this.assets = AM.manifest;
		this.verticalAlign = 'bottom';
		this.state = 'uninitialized';
	}

	if ( superclass ) SecretHitler.__proto__ = superclass;
	SecretHitler.prototype = Object.create( superclass && superclass.prototype );
	SecretHitler.prototype.constructor = SecretHitler;

	SecretHitler.prototype.initialize = function initialize (env, root, assets)
	{
		// share the diorama info
		AM.cache = assets;
		this.env = env;

		// connect to server
		this.socket = io.connect('/', {query: 'gameId='+getGameId()});

		// create the table
		this.gameTable = new GameTable();
		this.add(this.gameTable);

		// create president hat
		this.presidentHat = new PresidentHat();
		this.presidentHat.position.set(0.5, 1.3, 0);
		this.add(this.presidentHat);
	
		// create chancellor hat
		this.chancellorHat = new ChancellorHat();
		this.chancellorHat.position.set(-0.5, 1.3, 0);
		this.add(this.chancellorHat);

		// create test card
		var c = new HitlerRoleCard();
		c.translateY(1.3);
		this.add(c);
	};

	return SecretHitler;
}(THREE.Object3D));

var SH = new SecretHitler();

return SH;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvYXNzZXRtYW5hZ2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9wbGF5ZXJtYW5hZ2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iZWhhdmlvci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYW5pbWF0ZS5qcyIsIi4uLy4uL3NyYy9jbGllbnQvY2FyZC5qcyIsIi4uLy4uL3NyYy9jbGllbnQvaGF0cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvdGFibGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L3V0aWxzLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9zZWNyZXRoaXRsZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnQgZGVmYXVsdCB7IFxuXHRtYW5pZmVzdDoge1xuXHRcdG1vZGVsczoge1xuXHRcdFx0dGFibGU6ICdzdGF0aWMvbW9kZWwvdGFibGUuZGFlJyxcblx0XHRcdHRvcGhhdDogJ3N0YXRpYy9tb2RlbC90b3BoYXQuZGFlJyxcblx0XHRcdHZpc29yY2FwOiAnc3RhdGljL21vZGVsL3Zpc29yX2NhcC5kYWUnXG5cdFx0fSxcblx0XHR0ZXh0dXJlczoge1xuXHRcdFx0Ym9hcmRfbGFyZ2U6ICdzdGF0aWMvaW1nL2JvYXJkLWxhcmdlLWJha2VkLnBuZycsXG5cdFx0XHRib2FyZF9tZWQ6ICdzdGF0aWMvaW1nL2JvYXJkLW1lZGl1bS1iYWtlZC5wbmcnLFxuXHRcdFx0Ym9hcmRfc21hbGw6ICdzdGF0aWMvaW1nL2JvYXJkLXNtYWxsLWJha2VkLnBuZycsXG5cdFx0XHRjYXJkczogJ3N0YXRpYy9pbWcvY2FyZHMucG5nJ1xuXHRcdH1cblx0fSxcblx0Y2FjaGU6IHt9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBsYXllck1hbmFnZXJcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0dGhpcy5sb2NhbFVzZXIgPSBudWxsO1xuXHRcdHRoaXMucGxheWVycyA9IFtdO1xuXHR9XG5cblx0YWNxdWlyZUxvY2FsVXNlcigpXG5cdHtcblx0XHRpZih3aW5kb3cuYWx0c3BhY2UgJiYgYWx0c3BhY2UuaW5DbGllbnQpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2NhbFVzZXIgPSB7fTtcblxuXHRcdFx0Ly8gZ2V0IHRoZSBsb2NhbCB1c2VyIGlkIGFuZCBuYW1lXG5cdFx0XHRhbHRzcGFjZS5nZXRVc2VyKCkudGhlbigodXNlciA9PiB7XG5cdFx0XHRcdE9iamVjdC5hc3NpZ24odGhpcy5sb2NhbFVzZXIsIHVzZXIpO1xuXHRcdFx0fSkuYmluZCh0aGlzKSk7XG5cblx0XHRcdC8vIGdldCB0aGUgdXNlciB0cmFja2luZyBza2VsZXRvblxuXHRcdFx0YWx0c3BhY2UuZ2V0VGhyZWVKU1RyYWNraW5nU2tlbGV0b24oKS50aGVuKCh0cyA9PiB7XG5cdFx0XHRcdHRoaXMubG9jYWxVc2VyLnNrZWxldG9uID0gdHM7XG5cdFx0XHRcdFNILmFkZCh0cyk7XG5cdFx0XHR9KS5iaW5kKHRoaXMpKTtcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdC8vIGZha2UgdXNlciBkYXRhXG5cdFx0XHR0aGlzLmxvY2FsVXNlciA9IHtcblx0XHRcdFx0dXNlcklkOiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwKSxcblx0XHRcdFx0aXNNb2RlcmF0b3I6IGZhbHNlXG5cdFx0XHR9O1xuXHRcdFx0dGhpcy5sb2NhbFVzZXIuZGlzcGxheU5hbWUgPSAnV2ViIFVzZXIgJyt0aGlzLmxvY2FsVXNlci51c2VySWQ7XG5cdFx0fVxuXHR9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcic7XG5pbXBvcnQgUE0gZnJvbSAnLi9wbGF5ZXJtYW5hZ2VyJztcblxuY2xhc3MgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IodHlwZSl7XG5cdFx0dGhpcy50eXBlID0gdHlwZTtcblx0fVxuXG5cdGF3YWtlKG9iail7XG5cdFx0dGhpcy5vYmplY3QzRCA9IG9iajtcblx0fVxuXG5cdHN0YXJ0KCl7IH1cblxuXHR1cGRhdGUoZFQpeyB9XG5cblx0ZGlzcG9zZSgpeyB9XG59XG5cbmNsYXNzIEJTeW5jIGV4dGVuZHMgQmVoYXZpb3Jcbntcblx0Y29uc3RydWN0b3IoZXZlbnROYW1lKVxuXHR7XG5cdFx0c3VwZXIoJ0JTeW5jJyk7XG5cdFx0dGhpcy5fcyA9IFNILnNvY2tldDtcblxuXHRcdC8vIGxpc3RlbiBmb3IgdXBkYXRlIGV2ZW50c1xuXHRcdHRoaXMuaG9vayA9IHRoaXMuX3Mub24oZXZlbnROYW1lLCB0aGlzLnVwZGF0ZUZyb21TZXJ2ZXIuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5ldmVudE5hbWUgPSBldmVudE5hbWU7XG5cdFx0dGhpcy5vd25lciA9ICcnO1xuXHR9XG5cblx0dXBkYXRlRnJvbVNlcnZlcihkYXRhKVxuXHR7XG5cdFx0dGhpcy5vYmplY3QzRC5wb3NpdGlvbi5mcm9tQXJyYXkoZGF0YSwgMCk7XG5cdFx0dGhpcy5vYmplY3QzRC5xdWF0ZXJuaW9uLmZyb21BcnJheShkYXRhLCAzKTtcblx0fVxuXG5cdHRha2VPd25lcnNoaXAoKVxuXHR7XG5cdFx0aWYoUE0ubG9jYWxVc2VyICYmIFBNLmxvY2FsVXNlci51c2VySWQpXG5cdFx0XHR0aGlzLm93bmVyID0gUE0ubG9jYWxVc2VyLnVzZXJJZDtcblx0fVxuXG5cdHVwZGF0ZShkVClcblx0e1xuXHRcdGlmKFBNLmxvY2FsVXNlciAmJiBQTS5sb2NhbFVzZXIuc2tlbGV0b24gJiYgUE0ubG9jYWxVc2VyLnVzZXJJZCA9PT0gdGhpcy5vd25lcilcblx0XHR7XG5cdFx0XHRsZXQgaiA9IFBNLmxvY2FsVXNlci5za2VsZXRvbi5nZXRKb2ludCgnSGVhZCcpO1xuXHRcdFx0dGhpcy5fcy5lbWl0KHRoaXMuZXZlbnROYW1lLCBbLi4uai5wb3NpdGlvbi50b0FycmF5KCksIC4uLmoucXVhdGVybmlvbi50b0FycmF5KCldKTtcblx0XHR9XG5cdH1cblxufVxuXG5leHBvcnQgeyBCZWhhdmlvciwgQlN5bmMgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IHsgQmVoYXZpb3IgfSBmcm9tICcuL2JlaGF2aW9yJztcblxuY2xhc3MgQW5pbWF0ZSBleHRlbmRzIEJlaGF2aW9yXG57XG5cdGNvbnN0cnVjdG9yKC8ve3BhcmVudCwgcG9zLCBxdWF0LCBzY2FsZSwgbWF0cml4LCBkdXJhdGlvbiwgY2FsbGJhY2t9XG5cdFx0e3BhcmVudD1udWxsLCBwb3M9bnVsbCwgcXVhdD1udWxsLCBzY2FsZT1udWxsLCBtYXRyaXg9bnVsbCwgZHVyYXRpb249NjAwLCBjYWxsYmFjaz0oKT0+e319KVxuXHR7XG5cdFx0c3VwZXIoJ0FuaW1hdGUnKTtcblx0XHRcblx0XHRpZihtYXRyaXgpXG5cdFx0e1xuXHRcdFx0Ly8gZXh0cmFjdCBwb3NpdGlvbi9yb3RhdGlvbi9zY2FsZSBmcm9tIG1hdHJpeFxuXHRcdFx0cG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblx0XHRcdHF1YXQgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXHRcdFx0c2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXHRcdFx0bWF0cml4LmRlY29tcG9zZShwb3MsIHF1YXQsIHNjYWxlKTtcblx0XHR9XG5cblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHtwYXJlbnQsIHBvcywgcXVhdCwgc2NhbGUsIGR1cmF0aW9uLCBjYWxsYmFja30pO1xuXHR9XG5cblx0YXdha2Uob2JqKVxuXHR7XG5cdFx0c3VwZXIuYXdha2Uob2JqKTtcblxuXHRcdC8vIHNodWZmbGUgaGllcmFyY2h5LCBidXQga2VlcCB3b3JsZCB0cmFuc2Zvcm0gdGhlIHNhbWVcblx0XHRpZih0aGlzLnBhcmVudCAmJiB0aGlzLnBhcmVudCAhPT0gb2JqLnBhcmVudClcblx0XHR7XG5cdFx0XHRvYmouYXBwbHlNYXRyaXgob2JqLnBhcmVudC5tYXRyaXhXb3JsZCk7XG5cdFx0XHRsZXQgbWF0ID0gbmV3IFRIUkVFLk1hdHJpeDQoKS5nZXRJbnZlcnNlKHRoaXMucGFyZW50Lm1hdHJpeFdvcmxkKTtcblx0XHRcdG9iai5hcHBseU1hdHJpeChtYXQpO1xuXG5cdFx0XHR0aGlzLnBhcmVudC5hZGQob2JqKTtcblx0XHR9XG5cblx0XHQvLyByZWFkIGluaXRpYWwgcG9zaXRpb25zXG5cdFx0dGhpcy5pbml0aWFsUG9zID0gb2JqLnBvc2l0aW9uLmNsb25lKCk7XG5cdFx0dGhpcy5pbml0aWFsUXVhdCA9IG9iai5xdWF0ZXJuaW9uLmNsb25lKCk7XG5cdFx0dGhpcy5pbml0aWFsU2NhbGUgPSBvYmouc2NhbGUuY2xvbmUoKTtcblx0XHR0aGlzLnN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cdH1cblxuXHR1cGRhdGUoKVxuXHR7XG5cdFx0Ly8gY29tcHV0ZSBlYXNlLW91dCBiYXNlZCBvbiBkdXJhdGlvblxuXHRcdGxldCBtaXggPSAoRGF0ZS5ub3coKS10aGlzLnN0YXJ0VGltZSkgLyB0aGlzLmR1cmF0aW9uO1xuXHRcdGxldCBlYXNlID0gVFdFRU4gPyBUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dCA6IG4gPT4gbiooMi1uKTtcblx0XHRtaXggPSBtaXggPCAxID8gZWFzZShtaXgpIDogMTtcblxuXHRcdC8vIGFuaW1hdGUgcG9zaXRpb24gaWYgcmVxdWVzdGVkXG5cdFx0aWYoIHRoaXMucG9zICl7XG5cdFx0XHR0aGlzLm9iamVjdDNELnBvc2l0aW9uLmxlcnBWZWN0b3JzKHRoaXMuaW5pdGlhbFBvcywgdGhpcy5wb3MsIG1peCk7XG5cdFx0fVxuXG5cdFx0Ly8gYW5pbWF0ZSByb3RhdGlvbiBpZiByZXF1ZXN0ZWRcblx0XHRpZiggdGhpcy5xdWF0ICl7XG5cdFx0XHRUSFJFRS5RdWF0ZXJuaW9uLnNsZXJwKHRoaXMuaW5pdGlhbFF1YXQsIHRoaXMucXVhdCwgdGhpcy5vYmplY3QzRC5xdWF0ZXJuaW9uLCBtaXgpXG5cdFx0fVxuXG5cdFx0Ly8gYW5pbWF0ZSBzY2FsZSBpZiByZXF1ZXN0ZWRcblx0XHRpZiggdGhpcy5zY2FsZSApe1xuXHRcdFx0dGhpcy5vYmplY3QzRC5zY2FsZS5sZXJwVmVjdG9ycyh0aGlzLmluaXRpYWxTY2FsZSwgdGhpcy5zY2FsZSwgbWl4KTtcblx0XHR9XG5cblx0XHQvLyB0ZXJtaW5hdGUgYW5pbWF0aW9uIHdoZW4gZG9uZVxuXHRcdGlmKG1peCA+PSAxKXtcblx0XHRcdHRoaXMub2JqZWN0M0QucmVtb3ZlQmVoYXZpb3IodGhpcyk7XG5cdFx0XHR0aGlzLmNhbGxiYWNrLmNhbGwodGhpcy5vYmplY3QzRCk7XG5cdFx0fVxuXHR9XG59XG5cbkFuaW1hdGUuc3RhcnQgPSAodGFyZ2V0LCBvcHRzKSA9Plxue1xuXHRsZXQgb2xkQW5pbSA9IHRhcmdldC5nZXRCZWhhdmlvckJ5VHlwZSgnQW5pbWF0ZScpO1xuXHRpZihvbGRBbmltKXtcblx0XHRvbGRBbmltLmNvbnN0cnVjdG9yKG9wdHMpO1xuXHRcdG9sZEFuaW0uYXdha2UodGFyZ2V0KTtcblx0fVxuXHRlbHNlIHtcblx0XHR0YXJnZXQuYWRkQmVoYXZpb3IoIG5ldyBBbmltYXRlKG9wdHMpICk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQW5pbWF0ZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgQW5pbWF0ZSBmcm9tICcuL2FuaW1hdGUnO1xuXG4vLyBlbnVtIGNvbnN0YW50c1xubGV0IFR5cGVzID0gT2JqZWN0LmZyZWV6ZSh7XG5cdFBPTElDWV9MSUJFUkFMOiAwLFxuXHRQT0xJQ1lfRkFTQ0lTVDogMSxcblx0Uk9MRV9MSUJFUkFMOiAyLFxuXHRST0xFX0ZBU0NJU1Q6IDMsXG5cdFJPTEVfSElUTEVSOiA0LFxuXHRQQVJUWV9MSUJFUkFMOiA1LFxuXHRQQVJUWV9GQVNDSVNUOiA2LFxuXHRKQTogNyxcblx0TkVJTjogOCxcblx0QkxBTks6IDlcbn0pO1xuXG5mdW5jdGlvbiBkaW1zVG9VVih7c2lkZSwgbGVmdCwgcmlnaHQsIHRvcCwgYm90dG9tfSlcbntcblx0aWYoc2lkZSlcblx0XHRyZXR1cm4gW1tcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHRvcCwgbGVmdCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIGxlZnQpLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIodG9wLCByaWdodClcblx0XHRdLFtcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGJvdHRvbSwgbGVmdCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIHJpZ2h0KSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHRvcCwgcmlnaHQpXG5cdFx0XV07XG5cdGVsc2Vcblx0XHRyZXR1cm4gW1tcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIHRvcCksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihsZWZ0LCBib3R0b20pLFxuXHRcdFx0bmV3IFRIUkVFLlZlY3RvcjIocmlnaHQsIHRvcClcblx0XHRdLFtcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKGxlZnQsIGJvdHRvbSksXG5cdFx0XHRuZXcgVEhSRUUuVmVjdG9yMihyaWdodCwgYm90dG9tKSxcblx0XHRcdG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCB0b3ApXG5cdFx0XV07XG59XG5cbmZ1bmN0aW9uIGdldFVWcyh0eXBlKVxue1xuXHRsZXQgZGltcyA9IHtsZWZ0OiAwLCByaWdodDogMSwgYm90dG9tOiAwLCB0b3A6IDF9O1xuXG5cdHN3aXRjaCh0eXBlKVxuXHR7XG5cdGNhc2UgVHlwZXMuUE9MSUNZX0xJQkVSQUw6XG5cdFx0ZGltcyA9IHtzaWRlOiB0cnVlLCBsZWZ0OiAwLjgzNCwgcmlnaHQ6IDAuOTk2LCB0b3A6IDAuNzU0LCBib3R0b206IDAuOTk3fTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5QT0xJQ1lfRkFTQ0lTVDpcblx0XHRkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuNjYsIHJpZ2h0OiAwLjgyMiwgdG9wOiAwLjc1NCwgYm90dG9tOiAwLjk5Nn07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUk9MRV9MSUJFUkFMOlxuXHRcdGRpbXMgPSB7bGVmdDogMC41MDUsIHJpZ2h0OiAwLjc0NiwgdG9wOiAwLjk5NiwgYm90dG9tOiAwLjY1fTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5ST0xFX0ZBU0NJU1Q6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjUwNSwgcmlnaHQ6IDAuNzQ2LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUk9MRV9ISVRMRVI6XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjc1NCwgcmlnaHQ6IDAuOTk2LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM307XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUEFSVFlfTElCRVJBTDpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMjU1LCByaWdodDogMC40OTUsIHRvcDogMC45OTYsIGJvdHRvbTogMC42NX07XG5cdFx0YnJlYWs7XG5cdGNhc2UgVHlwZXMuUEFSVFlfRkFTQ0lTVDpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMjU1LCByaWdodDogMC40OTUsIHRvcDogMC42NDUsIGJvdHRvbTogMC4zfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5KQTpcblx0XHRkaW1zID0ge2xlZnQ6IDAuMDA1LCByaWdodDogMC4yNDQsIHRvcDogMC45OTIsIGJvdHRvbTogMC42NTN9O1xuXHRcdGJyZWFrO1xuXHRjYXNlIFR5cGVzLk5FSU46XG5cdFx0ZGltcyA9IHtsZWZ0OiAwLjAwNiwgcmlnaHQ6IDAuMjQzLCB0b3A6IDAuNjQyLCBib3R0b206IDAuMzAyfTtcblx0XHRicmVhaztcblx0Y2FzZSBUeXBlcy5CTEFOSzpcblx0ZGVmYXVsdDpcblx0XHRkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuMDIyLCByaWdodDogLjAyMiswLjI0NywgdG9wOiAwLjAyMSwgYm90dG9tOiAuMDIxKzAuMzU0M307XG5cdFx0YnJlYWs7XG5cdH1cblxuXHRyZXR1cm4gZGltc1RvVVYoZGltcyk7XG59XG5cblxuY2xhc3MgQ2FyZCBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKHR5cGUgPSBUeXBlcy5CTEFOSywgZG91YmxlU2lkZWQgPSB0cnVlLCBzZWNyZXQgPSBmYWxzZSlcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyBjcmVhdGUgdGhlIGNhcmQgZmFjZXNcblx0XHRsZXQgZnJvbnQgPSBuZXcgVEhSRUUuTWVzaChcblx0XHRcdG5ldyBUSFJFRS5QbGFuZUdlb21ldHJ5KC4zNTc1LCAuNSksXG5cdFx0XHRuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogQXNzZXRNYW5hZ2VyLmNhY2hlLnRleHR1cmVzLmNhcmRzfSlcblx0XHQpO1xuXHRcdGxldCBiYWNrID0gbmV3IFRIUkVFLk1lc2goXG5cdFx0XHRuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSguMzU3NSwgLjUpLFxuXHRcdFx0bmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IEFzc2V0TWFuYWdlci5jYWNoZS50ZXh0dXJlcy5jYXJkc30pXG5cdFx0KTtcblx0XHRiYWNrLnBvc2l0aW9uLnNldCgwLjAwNSwgMCwgMCk7XG5cdFx0YmFjay5yb3RhdGVZKE1hdGguUEkpO1xuXG5cdFx0Ly8gc2V0IHRoZSBmYWNlcyB0byB0aGUgY29ycmVjdCBwYXJ0IG9mIHRoZSB0ZXh0dXJlXG5cdFx0ZnJvbnQuZ2VvbWV0cnkuZmFjZVZlcnRleFV2cyA9IFtnZXRVVnModHlwZSldO1xuXHRcdGJhY2suZ2VvbWV0cnkuZmFjZVZlcnRleFV2cyA9IFtnZXRVVnMoIGRvdWJsZVNpZGVkID8gdHlwZSA6IFR5cGVzLkJMQU5LICldO1xuXG5cdFx0d2luZG93LnRlc3QgPSBmcm9udDtcblxuXHRcdHRoaXMuYWRkKGZyb250LCBiYWNrKTtcblx0fVxuXG59XG5cbmNsYXNzIExpYmVyYWxQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfTElCRVJBTCwgZmFsc2UsIHNlY3JldCk7XG5cdH1cblx0Z29Ub1Bvc2l0aW9uKHNwb3QgPSAwKVxuXHR7XG5cdFx0c3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDQsIHNwb3QpKTtcblx0XHRsZXQgcyA9IExpYmVyYWxQb2xpY3lDYXJkLnNwb3RzO1xuXHRcdEFuaW1hdGUuc3RhcnQodGhpcywge3BhcmVudDogQXNzZXRNYW5hZ2VyLnJvb3QsIHBvczogc1sncG9zXycrc3BvdF0sIHF1YXQ6IHMucXVhdCwgc2NhbGU6IHMuc2NhbGV9KTtcblx0fVxufVxuXG5MaWJlcmFsUG9saWN5Q2FyZC5zcG90cyA9IHtcblx0cG9zXzA6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNTMzLCAwLjc2LCAtMC4zMzYpLFxuXHRwb3NfMTogbmV3IFRIUkVFLlZlY3RvcjMoMC4yNjMsIDAuNzYsIC0wLjMzNiksXG5cdHBvc18yOiBuZXcgVEhSRUUuVmVjdG9yMygtLjAwNywgMC43NiwgLTAuMzM2KSxcblx0cG9zXzM6IG5ldyBUSFJFRS5WZWN0b3IzKC0uMjc5LCAwLjc2LCAtMC4zMzYpLFxuXHRwb3NfNDogbmV3IFRIUkVFLlZlY3RvcjMoLS41NTIsIDAuNzYsIC0wLjMzNiksXG5cdHF1YXQ6IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKDAsIDAuNzA3MTA2NzgxMTg2NTQ3NSwgMC43MDcxMDY3ODExODY1NDc1LCAwKSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNywgMC43LCAwLjcpXG59XG5cbmNsYXNzIEZhc2Npc3RQb2xpY3lDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcblx0XHRzdXBlcihUeXBlcy5QT0xJQ1lfRkFTQ0lTVCwgZmFsc2UsIHNlY3JldCk7XG5cdH1cblx0Z29Ub1Bvc2l0aW9uKHNwb3QgPSAwKVxuXHR7XG5cdFx0c3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDUsIHNwb3QpKTtcblx0XHRsZXQgcyA9IEZhc2Npc3RQb2xpY3lDYXJkLnNwb3RzO1xuXHRcdEFuaW1hdGUuc3RhcnQodGhpcywge3BhcmVudDogQXNzZXRNYW5hZ2VyLnJvb3QsIHBvczogc1sncG9zXycrc3BvdF0sIHF1YXQ6IHMucXVhdCwgc2NhbGU6IHMuc2NhbGV9KTtcblx0fVxufVxuXG5GYXNjaXN0UG9saWN5Q2FyZC5zcG90cyA9IHtcblx0cG9zXzA6IG5ldyBUSFJFRS5WZWN0b3IzKC0uNjg3LCAwLjc2LCAwLjM0MSksXG5cdHBvc18xOiBuZXcgVEhSRUUuVmVjdG9yMygtLjQxNywgMC43NiwgMC4zNDEpLFxuXHRwb3NfMjogbmV3IFRIUkVFLlZlY3RvcjMoLS4xNDYsIDAuNzYsIDAuMzQxKSxcblx0cG9zXzM6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMTI3LCAwLjc2LCAwLjM0MSksXG5cdHBvc180OiBuZXcgVEhSRUUuVmVjdG9yMygwLjQwMCwgMC43NiwgMC4zNDEpLFxuXHRwb3NfNTogbmV3IFRIUkVFLlZlY3RvcjMoMC42NzMsIDAuNzYsIDAuMzQxKSxcblx0cXVhdDogbmV3IFRIUkVFLlF1YXRlcm5pb24oLTAuNzA3MTA2NzgxMTg2NTQ3NSwgMCwgMCwgMC43MDcxMDY3ODExODY1NDc1KSxcblx0c2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNywgMC43LCAwLjcpXG59XG5cbmNsYXNzIExpYmVyYWxSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuXHRjb25zdHJ1Y3RvcihzZWNyZXQgPSBmYWxzZSl7XG5cdFx0c3VwZXIoVHlwZXMuUk9MRV9MSUJFUkFMLCBmYWxzZSwgc2VjcmV0KTtcblx0fVxufVxuXG5jbGFzcyBGYXNjaXN0Um9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3Ioc2VjcmV0ID0gZmFsc2Upe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfRkFTQ0lTVCwgZmFsc2UsIHNlY3JldCk7XG5cdH1cbn1cblxuY2xhc3MgSGl0bGVyUm9sZUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3Ioc2VjcmV0ID0gZmFsc2Upe1xuXHRcdHN1cGVyKFR5cGVzLlJPTEVfSElUTEVSLCBmYWxzZSwgc2VjcmV0KTtcblx0fVxufVxuXG5jbGFzcyBMaWJlcmFsUGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9MSUJFUkFMLCBmYWxzZSwgc2VjcmV0KTtcblx0fVxufVxuXG5jbGFzcyBGYXNjaXN0UGFydHlDYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKHNlY3JldCA9IGZhbHNlKXtcblx0XHRzdXBlcihUeXBlcy5QQVJUWV9GQVNDSVNULCBmYWxzZSwgc2VjcmV0KTtcblx0fVxufVxuXG5jbGFzcyBKYUNhcmQgZXh0ZW5kcyBDYXJkIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHRzdXBlcihUeXBlcy5KQSwgZmFsc2UsIGZhbHNlKTtcblx0XHR0aGlzLmNoaWxkcmVuWzBdLnJvdGF0ZVooLU1hdGguUEkvMik7XG5cdFx0dGhpcy5jaGlsZHJlblsxXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xuXHR9XG59XG5cbmNsYXNzIE5laW5DYXJkIGV4dGVuZHMgQ2FyZCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoVHlwZXMuTkVJTiwgZmFsc2UsIGZhbHNlKTtcblx0XHR0aGlzLmNoaWxkcmVuWzBdLnJvdGF0ZVooLU1hdGguUEkvMik7XG5cdFx0dGhpcy5jaGlsZHJlblsxXS5yb3RhdGVaKC1NYXRoLlBJLzIpO1xuXHR9XG59XG5cblxuZXhwb3J0IHtcblx0Q2FyZCwgVHlwZXMsXG5cdExpYmVyYWxQb2xpY3lDYXJkLCBGYXNjaXN0UG9saWN5Q2FyZCwgTGliZXJhbFJvbGVDYXJkLCBGYXNjaXN0Um9sZUNhcmQsXG5cdEhpdGxlclJvbGVDYXJkLCBMaWJlcmFsUGFydHlDYXJkLCBGYXNjaXN0UGFydHlDYXJkLCBKYUNhcmQsIE5laW5DYXJkXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInO1xuXG5jbGFzcyBQcmVzaWRlbnRIYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnRvcGhhdDtcblx0XHR0aGlzLm1vZGVsLnBvc2l0aW9uLnNldCgwLDAsMCk7XG5cdFx0dGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XG5cdFx0dGhpcy5hZGQodGhpcy5tb2RlbCk7XG5cdH1cbn07XG5cbmNsYXNzIENoYW5jZWxsb3JIYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRCB7XG5cdGNvbnN0cnVjdG9yKCl7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnZpc29yY2FwO1xuXHRcdHRoaXMubW9kZWwucG9zaXRpb24uc2V0KDAsMCwwKTtcblx0XHR0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSS8yLCAwLCAwKTtcblx0XHR0aGlzLmFkZCh0aGlzLm1vZGVsKTtcblx0fVxufTtcblxuZXhwb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVUYWJsZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHRcdHN1cGVyKCk7XG5cblx0XHQvLyBzYXZlIHJlZmVyZW5jZXMgdG8gdGhlIHRleHR1cmVzXG5cdFx0dGhpcy50ZXh0dXJlcyA9IFtcblx0XHRcdEFNLmNhY2hlLnRleHR1cmVzLmJvYXJkX3NtYWxsLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbWVkLFxuXHRcdFx0QU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfbGFyZ2Vcblx0XHRdO1xuXG5cdFx0Ly8gYWRkIHRhYmxlIGFzc2V0XG5cdFx0dGhpcy50YWJsZU1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnRhYmxlLmNoaWxkcmVuWzBdO1xuXHRcdHRoaXMudGFibGVNb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkvMiwgMCwgMCk7XG5cdFx0dGhpcy5hZGQodGhpcy50YWJsZU1vZGVsKTtcblxuXHRcdC8vIHNldCB0aGUgZGVmYXVsdCBtYXRlcmlhbFxuXHRcdHRoaXMudGFibGVNb2RlbC5tYXRlcmlhbC5tYXAgPSB0aGlzLnRleHR1cmVzWzBdO1xuXG5cdFx0Ly8gcG9zaXRpb24gdGFibGVcblx0XHR0aGlzLnBvc2l0aW9uLnNldCgwLCAwLjc1LCAwKTtcblx0fVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJztcblxuZnVuY3Rpb24gZ2V0R2FtZUlkKClcbntcblx0Ly8gZmlyc3QgY2hlY2sgdGhlIHVybFxuXHRsZXQgcmUgPSAvWz8mXWdhbWVJZD0oW14mXSspLy5leGVjKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXHRpZihyZSl7XG5cdFx0cmV0dXJuIHJlWzFdO1xuXHR9XG5cdGVsc2UgaWYoYWx0c3BhY2UgJiYgYWx0c3BhY2UuaW5DbGllbnQpe1xuXHRcdHJldHVybiBTSC5lbnYuc2lkO1xuXHR9XG5cdGVsc2Uge1xuXHRcdGxldCBpZCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDAgKTtcblx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZSgnP2dhbWVJZD0nK2lkKTtcblx0fVxufVxuXG5leHBvcnQgeyBnZXRHYW1lSWQgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0ICogYXMgQ2FyZHMgZnJvbSAnLi9jYXJkJztcbmltcG9ydCB7IFByZXNpZGVudEhhdCwgQ2hhbmNlbGxvckhhdCB9IGZyb20gJy4vaGF0cyc7XG5pbXBvcnQgR2FtZVRhYmxlIGZyb20gJy4vdGFibGUnO1xuaW1wb3J0IEFzc2V0TWFuYWdlciBmcm9tICcuL2Fzc2V0bWFuYWdlcic7XG5pbXBvcnQgeyBnZXRHYW1lSWQgfSBmcm9tICcuL3V0aWxzJztcblxuY2xhc3MgU2VjcmV0SGl0bGVyIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0Rcbntcblx0Y29uc3RydWN0b3IoKVxuXHR7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmFzc2V0cyA9IEFzc2V0TWFuYWdlci5tYW5pZmVzdDtcblx0XHR0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcblx0XHR0aGlzLnN0YXRlID0gJ3VuaW5pdGlhbGl6ZWQnO1xuXHR9XG5cblx0aW5pdGlhbGl6ZShlbnYsIHJvb3QsIGFzc2V0cylcblx0e1xuXHRcdC8vIHNoYXJlIHRoZSBkaW9yYW1hIGluZm9cblx0XHRBc3NldE1hbmFnZXIuY2FjaGUgPSBhc3NldHM7XG5cdFx0dGhpcy5lbnYgPSBlbnY7XG5cblx0XHQvLyBjb25uZWN0IHRvIHNlcnZlclxuXHRcdHRoaXMuc29ja2V0ID0gaW8uY29ubmVjdCgnLycsIHtxdWVyeTogJ2dhbWVJZD0nK2dldEdhbWVJZCgpfSk7XG5cblx0XHQvLyBjcmVhdGUgdGhlIHRhYmxlXG5cdFx0dGhpcy5nYW1lVGFibGUgPSBuZXcgR2FtZVRhYmxlKCk7XG5cdFx0dGhpcy5hZGQodGhpcy5nYW1lVGFibGUpO1xuXG5cdFx0Ly8gY3JlYXRlIHByZXNpZGVudCBoYXRcblx0XHR0aGlzLnByZXNpZGVudEhhdCA9IG5ldyBQcmVzaWRlbnRIYXQoKTtcblx0XHR0aGlzLnByZXNpZGVudEhhdC5wb3NpdGlvbi5zZXQoMC41LCAxLjMsIDApO1xuXHRcdHRoaXMuYWRkKHRoaXMucHJlc2lkZW50SGF0KTtcblx0XG5cdFx0Ly8gY3JlYXRlIGNoYW5jZWxsb3IgaGF0XG5cdFx0dGhpcy5jaGFuY2VsbG9ySGF0ID0gbmV3IENoYW5jZWxsb3JIYXQoKTtcblx0XHR0aGlzLmNoYW5jZWxsb3JIYXQucG9zaXRpb24uc2V0KC0wLjUsIDEuMywgMCk7XG5cdFx0dGhpcy5hZGQodGhpcy5jaGFuY2VsbG9ySGF0KTtcblxuXHRcdC8vIGNyZWF0ZSB0ZXN0IGNhcmRcblx0XHRsZXQgYyA9IG5ldyBDYXJkcy5IaXRsZXJSb2xlQ2FyZCgpO1xuXHRcdGMudHJhbnNsYXRlWSgxLjMpO1xuXHRcdHRoaXMuYWRkKGMpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgbmV3IFNlY3JldEhpdGxlcigpO1xuIl0sIm5hbWVzIjpbInRoaXMiLCJzdXBlciIsImxldCIsIkFzc2V0TWFuYWdlciIsIkNhcmRzLkhpdGxlclJvbGVDYXJkIl0sIm1hcHBpbmdzIjoiOzs7QUFFQSxTQUFlO0NBQ2QsUUFBUSxFQUFFO0VBQ1QsTUFBTSxFQUFFO0dBQ1AsS0FBSyxFQUFFLHdCQUF3QjtHQUMvQixNQUFNLEVBQUUseUJBQXlCO0dBQ2pDLFFBQVEsRUFBRSw0QkFBNEI7R0FDdEM7RUFDRCxRQUFRLEVBQUU7R0FDVCxXQUFXLEVBQUUsa0NBQWtDO0dBQy9DLFNBQVMsRUFBRSxtQ0FBbUM7R0FDOUMsV0FBVyxFQUFFLGtDQUFrQztHQUMvQyxLQUFLLEVBQUUsc0JBQXNCO0dBQzdCO0VBQ0Q7Q0FDRCxLQUFLLEVBQUUsRUFBRTtDQUNULENBQUE7O0FDYkQsSUFBcUIsYUFBYSxHQUNsQyxzQkFDWTtBQUNaO0NBQ0MsSUFBSyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7Q0FDdkIsSUFBSyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Q0FDbEIsQ0FBQTs7QUFFRix3QkFBQyxnQkFBZ0I7QUFDakI7OztDQUNDLEdBQUksTUFBTSxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsUUFBUTtDQUN4QztFQUNDLElBQUssQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDOzs7RUFHckIsUUFBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQUEsSUFBSSxFQUFDO0dBQzlCLE1BQU8sQ0FBQyxNQUFNLENBQUNBLE1BQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7R0FDcEMsQ0FBQyxD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VSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7RUFDdkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO0VBQzFDLElBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUN0QyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztFQUM1QixDQUFBOztDQUVELGtCQUFBLE1BQU07Q0FDTjs7RUFFQ0EsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7RUFDdERBLElBQUksSUFBSSxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsVUFBQSxDQUFDLEVBQUMsU0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUEsQ0FBQztFQUM3RCxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzs7RUFHOUIsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO0dBQ2IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztHQUNuRTs7O0VBR0QsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO0dBQ2QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0dBQ2xGOzs7RUFHRCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7R0FDZixJQUFJLENBQUMsUUFB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QUcsRUFBRSxDQUFDLENBQUMsQ0FBQzs7Q0FFbEQsT0FBTyxJQUFJOztDQUVYLEtBQUssS0FBSyxDQUFDLGNBQWM7RUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDMUUsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLGNBQWM7RUFDeEIsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDekUsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLFlBQVk7RUFDdEIsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0VBQzdELE1BQU07Q0FDUCxLQUFLLEtBQUssQ0FBQyxZQUFZO0VBQ3RCLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztFQUM1RCxNQUFNO0NBQ1AsS0FBSyxLQUFLLENBQUMsV0FBVztFQUNyQixJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDNUQsTUFBTTtDQUNQLEtBQUssS0FBSyxDQUFDLGFBQWE7RUFDdkIsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFB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
