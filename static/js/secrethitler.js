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

var GameState = function GameState (id) {
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

GameState.prototype.nextPresident = function nextPresident () {
  var turn = 0;

// this is the first round, choose president randomly
  if (!this.president) {
    turn = Math.floor(Math.random() * this.turnOrder.length);
  } else if (this.specialElection) {
// this is a special election, so count from president emeritus
    turn = this.players[this.lastPresident].turnOrder;
  } else {
// a regular election: power passes to the left
    turn = this.players[this.president].turnOrder;
  }

  return this.turnOrder[ (turn + 1) % this.turnOrder.length ]
};

GameState.prototype.drawPolicies = function drawPolicies () {

};

var Player = function Player (userId, displayName, isModerator) {
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

prototypeAccessors.party.get = function () {
  if (this.role === 'hitler') { return 'fascist' }
  else { return this.role }
};

Object.defineProperties( Player.prototype, prototypeAccessors );

var PlayerManager = function PlayerManager () {
  this.localUser = null;
  this.players = [];
};

PlayerManager.prototype.acquireLocalUser = function acquireLocalUser () {
    var this$1 = this;

  if (window.altspace && altspace.inClient) {
    this.localUser = {};

// get the local user id and name
    altspace.getUser().then(function (user) {
      Object.assign(this$1.localUser, user);
    });

// get the user tracking skeleton
    altspace.getThreeJSTrackingSkeleton().then(function (ts) {
      this$1.localUser.skeleton = ts;
      SH.add(ts);
    });
  } else {
// fake user data
    this.localUser = {
      userId: Math.floor(Math.random() * 1000000),
      isModerator: false
    };
    this.localUser.displayName = 'Web User ' + this.localUser.userId;
  }
};

var Behavior = function Behavior (type) {
  this.type = type;
};

Behavior.prototype.awake = function awake (obj) {
  this.object3D = obj;
};

Behavior.prototype.start = function start () { };

Behavior.prototype.update = function update (dT) { };

Behavior.prototype.dispose = function dispose () { };

var Animate = (function (Behavior$$1) {
  function Animate (// {parent, pos, quat, scale, matrix, duration, callback}
    ref) {
    var parent = ref.parent; if ( parent === void 0 ) parent = null;
    var pos = ref.pos; if ( pos === void 0 ) pos = null;
    var quat = ref.quat; if ( quat === void 0 ) quat = null;
    var scale = ref.scale; if ( scale === void 0 ) scale = null;
    var matrix = ref.matrix; if ( matrix === void 0 ) matrix = null;
    var duration = ref.duration; if ( duration === void 0 ) duration = 600;
    var callback = ref.callback; if ( callback === void 0 ) callback = function () {};

    Behavior$$1.call(this, 'Animate');

    if (matrix) {
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

  Animate.prototype.awake = function awake (obj) {
    Behavior$$1.prototype.awake.call(this, obj);

// shuffle hierarchy, but keep world transform the same
    if (this.parent && this.parent !== obj.parent) {
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

  Animate.prototype.update = function update () {
// compute ease-out based on duration
    var mix = (Date.now() - this.startTime) / this.duration;
    var ease = TWEEN ? TWEEN.Easing.Quadratic.Out : function (n) { return n * (2 - n); };
    mix = mix < 1 ? ease(mix) : 1;

// animate position if requested
    if (this.pos) {
      this.object3D.position.lerpVectors(this.initialPos, this.pos, mix);
    }

// animate rotation if requested
    if (this.quat) {
      THREE.Quaternion.slerp(this.initialQuat, this.quat, this.object3D.quaternion, mix);
    }

// animate scale if requested
    if (this.scale) {
      this.object3D.scale.lerpVectors(this.initialScale, this.scale, mix);
    }

// terminate animation when done
    if (mix >= 1) {
      this.object3D.removeBehavior(this);
      this.callback.call(this.object3D);
    }
  };

  return Animate;
}(Behavior));

Animate.start = function (target, opts) {
  var oldAnim = target.getBehaviorByType('Animate');
  if (oldAnim) {
    oldAnim.constructor(opts);
    oldAnim.awake(target);
  } else {
    target.addBehavior(new Animate(opts));
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

function dimsToUV (ref) {
  var side = ref.side;
  var left = ref.left;
  var right = ref.right;
  var top = ref.top;
  var bottom = ref.bottom;

  if (side) {
    return [[
      new THREE.Vector2(top, left),
      new THREE.Vector2(bottom, left),
      new THREE.Vector2(top, right)
    ], [
      new THREE.Vector2(bottom, left),
      new THREE.Vector2(bottom, right),
      new THREE.Vector2(top, right)
    ]]
  } else {
    return [[
      new THREE.Vector2(left, top),
      new THREE.Vector2(left, bottom),
      new THREE.Vector2(right, top)
    ], [
      new THREE.Vector2(left, bottom),
      new THREE.Vector2(right, bottom),
      new THREE.Vector2(right, top)
    ]]
  }
}

function getUVs (type) {
  var dims = {left: 0, right: 1, bottom: 0, top: 1};

  switch (type) {
    case Types.POLICY_LIBERAL:
      dims = {side: true, left: 0.834, right: 0.996, top: 0.754, bottom: 0.997};
      break
    case Types.POLICY_FASCIST:
      dims = {side: true, left: 0.66, right: 0.822, top: 0.754, bottom: 0.996};
      break
    case Types.ROLE_LIBERAL:
      dims = {left: 0.505, right: 0.746, top: 0.996, bottom: 0.65};
      break
    case Types.ROLE_FASCIST:
      dims = {left: 0.505, right: 0.746, top: 0.645, bottom: 0.3};
      break
    case Types.ROLE_HITLER:
      dims = {left: 0.754, right: 0.996, top: 0.645, bottom: 0.3};
      break
    case Types.PARTY_LIBERAL:
      dims = {left: 0.255, right: 0.495, top: 0.996, bottom: 0.65};
      break
    case Types.PARTY_FASCIST:
      dims = {left: 0.255, right: 0.495, top: 0.645, bottom: 0.3};
      break
    case Types.JA:
      dims = {left: 0.005, right: 0.244, top: 0.992, bottom: 0.653};
      break
    case Types.NEIN:
      dims = {left: 0.006, right: 0.243, top: 0.642, bottom: 0.302};
      break
    case Types.CREDITS:
      dims = {side: true, left: 0.015, right: 0.276, top: 0.397, bottom: 0.765};
      break
    case Types.BLANK:
    default:
      dims = {side: true, left: 0.022, right: 0.022 + 0.247, top: 0.021, bottom: 0.021 + 0.3543};
      break
  }

  return dimsToUV(dims)
}

var Card = (function (superclass) {
  function Card (type, doubleSided) {
    if ( type === void 0 ) type = Types.BLANK;
    if ( doubleSided === void 0 ) doubleSided = true;

    superclass.call(this);

// create the card faces
    var frontGeo = new THREE.PlaneGeometry(0.715, 1);
    var backGeo = frontGeo.clone();
    var cardMat = new THREE.MeshBasicMaterial({map: AM.cache.textures.cards});
    var front = new THREE.Mesh(frontGeo, cardMat);
    var back = new THREE.Mesh(backGeo, cardMat);
    back.position.set(0.001, 0, 0);
    front.position.set(-0.001, 0, 0);
    back.rotateY(Math.PI);

// set the faces to the correct part of the texture
    front.geometry.faceVertexUvs = [getUVs(type)];
    back.geometry.faceVertexUvs = [getUVs(doubleSided ? type : Types.BLANK)];
    this.scale.setScalar(0.7);
    this.add(front, back);
  }

  if ( superclass ) Card.__proto__ = superclass;
  Card.prototype = Object.create( superclass && superclass.prototype );
  Card.prototype.constructor = Card;

  Card.prototype.hide = function hide () {
    this.children.forEach(function (o) { o.visible = false; });
  };

  Card.prototype.show = function show () {
    this.children.forEach(function (o) { o.visible = true; });
  };

  return Card;
}(THREE.Object3D));

var CreditsCard = (function (Card) {
  function CreditsCard () {
    Card.call(this, Types.CREDITS);
    var self = this;

    function setVisibility (ref) {
      var state = ref.data.game.state;

      if (state === 'setup') {
        self.children.forEach(function (o) { o.visible = true; });
      } else {
        self.children.forEach(function (o) { o.visible = false; });
      }
    }

    SH.addEventListener('update_state', setVisibility);
  }

  if ( Card ) CreditsCard.__proto__ = Card;
  CreditsCard.prototype = Object.create( Card && Card.prototype );
  CreditsCard.prototype.constructor = CreditsCard;

  return CreditsCard;
}(Card));

var LiberalPolicyCard = (function (Card) {
  function LiberalPolicyCard () {
    Card.call(this, Types.POLICY_LIBERAL, false);
  }

  if ( Card ) LiberalPolicyCard.__proto__ = Card;
  LiberalPolicyCard.prototype = Object.create( Card && Card.prototype );
  LiberalPolicyCard.prototype.constructor = LiberalPolicyCard;
  LiberalPolicyCard.prototype.goToPosition = function goToPosition (spot) {
    if ( spot === void 0 ) spot = 0;

    spot = Math.max(0, Math.min(4, spot));
    var s = LiberalPolicyCard.spots;
    Animate.start(this, {parent: AM.root, pos: s['pos_' + spot], quat: s.quat, scale: s.scale});
  };

  return LiberalPolicyCard;
}(Card));

LiberalPolicyCard.spots = {
  pos_0: new THREE.Vector3(0.533, 0.76, -0.336),
  pos_1: new THREE.Vector3(0.263, 0.76, -0.336),
  pos_2: new THREE.Vector3(-0.007, 0.76, -0.336),
  pos_3: new THREE.Vector3(-0.279, 0.76, -0.336),
  pos_4: new THREE.Vector3(-0.552, 0.76, -0.336),
  quat: new THREE.Quaternion(0, 0.7071067811865475, 0.7071067811865475, 0),
  scale: new THREE.Vector3(0.7, 0.7, 0.7)
};

var FascistPolicyCard = (function (Card) {
  function FascistPolicyCard () {
    Card.call(this, Types.POLICY_FASCIST, false);
  }

  if ( Card ) FascistPolicyCard.__proto__ = Card;
  FascistPolicyCard.prototype = Object.create( Card && Card.prototype );
  FascistPolicyCard.prototype.constructor = FascistPolicyCard;
  FascistPolicyCard.prototype.goToPosition = function goToPosition (spot) {
    if ( spot === void 0 ) spot = 0;

    spot = Math.max(0, Math.min(5, spot));
    var s = FascistPolicyCard.spots;
    Animate.start(this, {parent: AM.root, pos: s['pos_' + spot], quat: s.quat, scale: s.scale});
  };

  return FascistPolicyCard;
}(Card));

FascistPolicyCard.spots = {
  pos_0: new THREE.Vector3(-0.687, 0.76, 0.341),
  pos_1: new THREE.Vector3(-0.417, 0.76, 0.341),
  pos_2: new THREE.Vector3(-0.146, 0.76, 0.341),
  pos_3: new THREE.Vector3(0.127, 0.76, 0.341),
  pos_4: new THREE.Vector3(0.400, 0.76, 0.341),
  pos_5: new THREE.Vector3(0.673, 0.76, 0.341),
  quat: new THREE.Quaternion(-0.7071067811865475, 0, 0, 0.7071067811865475),
  scale: new THREE.Vector3(0.7, 0.7, 0.7)
};

var JaCard = (function (Card) {
  function JaCard () {
    Card.call(this, Types.JA, false);
    this.children[0].rotateZ(-Math.PI / 2);
    this.children[1].rotateZ(-Math.PI / 2);
  }

  if ( Card ) JaCard.__proto__ = Card;
  JaCard.prototype = Object.create( Card && Card.prototype );
  JaCard.prototype.constructor = JaCard;

  return JaCard;
}(Card));

var NeinCard = (function (Card) {
  function NeinCard () {
    Card.call(this, Types.NEIN, false);
    this.children[0].rotateZ(-Math.PI / 2);
    this.children[1].rotateZ(-Math.PI / 2);
  }

  if ( Card ) NeinCard.__proto__ = Card;
  NeinCard.prototype = Object.create( Card && Card.prototype );
  NeinCard.prototype.constructor = NeinCard;

  return NeinCard;
}(Card));

var PresidentHat = (function (superclass) {
  function PresidentHat () {
    var this$1 = this;

    superclass.call(this);
    this.model = AM.cache.models.tophat;
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(-Math.PI / 2, 0, 0);
    this.add(this.model);

    SH.addEventListener('update_state', function (e) {
      if (e.data.game.state === 'setup') { this$1.idle(); }
    });
  }

  if ( superclass ) PresidentHat.__proto__ = superclass;
  PresidentHat.prototype = Object.create( superclass && superclass.prototype );
  PresidentHat.prototype.constructor = PresidentHat;

  PresidentHat.prototype.idle = function idle () {
    this.position.set(0.75, 0, 0);
    this.rotation.set(0, Math.PI / 2, 0);
    SH.idleRoot.add(this);
  };

  return PresidentHat;
}(THREE.Object3D));

var ChancellorHat = (function (superclass) {
  function ChancellorHat () {
    var this$1 = this;

    superclass.call(this);
    this.model = AM.cache.models.visorcap;
    this.model.position.set(0, 0.04, 0);
    this.model.rotation.set(-Math.PI / 2, 0, 0);
    this.add(this.model);

    SH.addEventListener('update_state', function (e) {
      if (e.data.game.state === 'setup') { this$1.idle(); }
    });
  }

  if ( superclass ) ChancellorHat.__proto__ = superclass;
  ChancellorHat.prototype = Object.create( superclass && superclass.prototype );
  ChancellorHat.prototype.constructor = ChancellorHat;

  ChancellorHat.prototype.idle = function idle () {
    this.position.set(-0.75, 0, 0);
    this.rotation.set(0, -Math.PI / 2, 0);
    SH.idleRoot.add(this);
  };

  return ChancellorHat;
}(THREE.Object3D));

var GameTable = (function (superclass) {
  function GameTable () {
    superclass.call(this);

// save references to the textures
    this.textures = [
      AM.cache.textures.board_small,
      AM.cache.textures.board_med,
      AM.cache.textures.board_large
    ];

// add table asset
    this.model = AM.cache.models.table.children[0];
    this.model.rotation.set(-Math.PI / 2, 0, 0);
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

  GameTable.prototype.changeMode = function changeMode (ref) {
    var ref_data_game = ref.data.game;
    var state = ref_data_game.state;
    var turnOrder = ref_data_game.turnOrder;

    if (state === 'setup') {
      if (turnOrder.length >= 9) { this.model.material.map = this.textures[2]; } else if (turnOrder.length >= 7) {
        this.model.material.map = this.textures[1];
      } else {
        this.model.material.map = this.textures[0];
      }
    }
  };

  return GameTable;
}(THREE.Object3D));

function getGameId () {
// first check the url
  var re = /[?&]gameId=([^&]+)/.exec(window.location.search);
  if (re) {
    return re[1]
  } else if (altspace && altspace.inClient) {
    return SH.env.sid
  } else {
    var id = Math.floor(Math.random() * 100000000);
    window.location.replace('?gameId=' + id);
  }
}

function generateQuestion (text, texture) {
  if ( texture === void 0 ) texture = null;

  var fontStack = '"Helvetica Neue", Helvetica, Arial, Sans-Serif';

// set up canvas
  var bmp;
  if (!texture) {
    bmp = document.createElement('canvas');
    bmp.width = 512;
    bmp.height = 256;
  } else {
    bmp = texture.image;
  }

  var g = bmp.getContext('2d');
  g.clearRect(0, 0, 512, 256);
  g.textAlign = 'center';
  g.fillStyle = 'white';

// write text
  g.font = 'bold 50px ' + fontStack;
  var lines = text.split('\n');
  for (var i = 0; i < lines.length; i++) {
    g.fillText(lines[i], 256, 50 + 55 * i);
  }

  if (texture) {
    texture.needsUpdate = true;
    return texture
  } else {
    return new THREE.CanvasTexture(bmp)
  }
}

var Nameplate = (function (superclass) {
  function Nameplate (seat) {
    superclass.call(this);

    this.seat = seat;

// add 3d model
    this.model = AM.cache.models.nameplate.children[0].clone();
    this.model.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
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

  Nameplate.prototype.updateText = function updateText (text) {
    var fontSize = 7 / 32 * Nameplate.textureSize * 0.65;

// set up canvas
    var g = this.bmp.getContext('2d');
    var fontStack = '"Helvetica Neue", Helvetica, Arial, Sans-Serif';
    g.fillStyle = '#222';
    g.fillRect(0, 0, Nameplate.textureSize, Nameplate.textureSize / 2);
    g.font = "bold " + fontSize + "px " + fontStack;
    g.textAlign = 'center';
    g.fillStyle = 'white';
    g.fillText(text, Nameplate.textureSize / 2, (0.42 - 0.12) * (Nameplate.textureSize / 2));

    this.model.material.map.needsUpdate = true;
  };

  Nameplate.prototype.click = function click (e) {
    if (!this.seat.owner && SH.game.state === 'setup') {
      this.requestJoin();
    } else if (this.seat.owner === SH.localUser.id) {
      this.requestLeave();
    } else if (this.seat.owner && SH.game.turnOrder.includes(SH.localUser.id)) {
      this.requestKick();
    }
  };

  Nameplate.prototype.requestJoin = function requestJoin () {
    SH.socket.emit('join', Object.assign({seatNum: this.seat.seatNum}, SH.localUser));
  };

  Nameplate.prototype.requestLeave = function requestLeave () {
    var self = this;
    if (!self.question) {
      self.question = self.seat.ballot.askQuestion('Are you sure you\nwant to leave?', 'local_leave')
        .then(function (confirm) {
          if (confirm) {
            SH.socket.emit('leave', SH.localUser.id);
          }
          self.question = null;
        })
        .catch(function () { self.question = null; });
    }
  };

  Nameplate.prototype.requestKick = function requestKick () {
    var self = this;
    if (!self.question) {
      var seat = SH.seats[SH.players[SH.localUser.id].seatNum];
      self.question = seat.ballot.askQuestion(("Are you sure you\nwant to try to kick\n" + (SH.players[self.seat.owner].displayName)), 'local_kick')
        .then(function (confirm) {
          if (confirm) {
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
var CascadingPromise = function CascadingPromise (prereqPromise, execFn, cleanupFn) {
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

CascadingPromise.prototype._prereqSettled = function _prereqSettled () {
  function settle (type) {
    return function () {
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];

      this._execSettled(type, args);
    }
  }

  if (this.state === 'pending') {
    this.state = 'running';
    this.execFn(
              settle('resolve').bind(this),
              settle('reject').bind(this)
          );
  } else if (this.state === 'cancelled') {
    this.state = 'settled';
    this._resolveCallbacks.forEach(function (cb) { return cb(); });
  }
};

CascadingPromise.prototype._execSettled = function _execSettled (type, result) {
  if (this.state === 'running') {
    this._execType = type;
    this._execResult = result;
    this.state = 'cleaningup';
    this.cleanupFn(this._cleanupDone.bind(this));
  }
};

CascadingPromise.prototype._cleanupDone = function _cleanupDone () {
    var this$1 = this;

  if (this.state === 'cleaningup') {
    this.state = 'settled';
    if (this._execType === 'resolve') {
      this._resolveCallbacks.forEach(
                  function (cb) { return cb.apply(void 0, this$1._execResult); }
              );
    } else {
      this._rejectCallbacks.forEach(
                  function (cb) { return cb.apply(void 0, this$1._execResult); }
              );
    }
  }
};

CascadingPromise.prototype.cancel = function cancel () {
  if (this.state === 'running') {
    this.state = 'cleaningup';
    this.cleanupFn(this._cleanupDone.bind(this));
  } else if (this.state === 'pending') {
    this.state = 'cancelled';
  }
};

CascadingPromise.prototype.then = function then (doneCb, errCb) {
  if (this.state === 'settled') {
    if (this._execType === 'resolve') {
      doneCb.apply(void 0, this._execResult);
    } else {
      errCb.apply(void 0, this._execResult);
    }
  } else {
    this._resolveCallbacks.push(doneCb);
    if (errCb) {
      this._rejectCallbacks.push(errCb);
    }
  }

  return this
};

CascadingPromise.prototype.catch = function catch$1 (cb) {
  if (this.state === 'settled') {
    if (this._execType === 'reject') { cb.apply(void 0, this._execResult); }
  } else { this._rejectCallbacks.push(cb); }

  return this
};

var Ballot = (function (superclass) {
  function Ballot (seat) {
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

  Ballot.prototype.update = function update (ref) {
    var ref_data = ref.data;
    var game = ref_data.game;
    var players = ref_data.players;
    var votes = ref_data.votes;

    var self = this;
    if (!self.seat.owner) { return }

    var vips = game.votesInProgress;
    var votesFinished = (SH.game.votesInProgress || []).filter(
            function (e) { return !vips.includes(e); }
        );

    vips.forEach(function (vId) {
      var vs = votes[vId].yesVoters.concat( votes[vId].noVoters);
      var nv = votes[vId].nonVoters;

      var asked = self.questions[vId];
      if (!asked && !nv.includes(self.seat.owner) && !vs.includes(self.seat.owner)) {
        var questionText;
        if (votes[vId].type === 'elect') {
          questionText = players[votes[vId].target1].displayName +
                        '\nfor president and\n' +
                        players[votes[vId].target2].displayName +
                        '\nfor chancellor?';
        } else if (votes[vId].type === 'join') {
          questionText = votes[vId].data + '\nto join?';
        } else if (votes[vId].type === 'kick') {
          questionText = 'Vote to kick\n' +
                        players[votes[vId].target1].displayName +
                        '?';
        }

        self.askQuestion(questionText, vId)
                .then(function (answer) {
                  SH.socket.emit('vote', vId, SH.localUser.id, answer);
                })
                .catch(function () { return console.log('Vote scrubbed:', vId); });
      } else if (vs.includes(self.seat.owner)) {
        if (self.questions[vId]) { self.questions[vId].cancel(); }
      }
    });

    votesFinished.forEach(function (vId) {
      if (self.questions[vId]) {
        self.questions[vId].cancel();
      }
    });
  };

  Ballot.prototype.askQuestion = function askQuestion (qText, id) {
    var this$1 = this;

    var self = this;
    var newQ = new CascadingPromise(self.questions[self.lastAsked],
            function (resolve, reject) {
                // make sure the answer is still relevant
              var latestVotes = SH.game.votesInProgress;
              if (!/^local/.test(id) && !latestVotes.includes(id)) {
                reject();
                return
              }

                // hook up q/a cards
              self.question.material.map = generateQuestion(qText, this$1.question.material.map);
              self.jaCard.addEventListener('cursorup', respond(true));
              self.neinCard.addEventListener('cursorup', respond(false));

                // show the ballot
              self.question.visible = true;
              self.jaCard.show();
              self.neinCard.show();

              function respond (answer) {
                function handler () {
                        // make sure only the owner of the ballot is answering
                  if (self.seat.owner !== SH.localUser.id) { return }

                        // make sure the answer still matters
                  var latestVotes = SH.game.votesInProgress;
                  if (!/^local/.test(id) && !latestVotes.includes(id)) {
                    reject();
                  } else {
                    resolve(answer);
                  }
                }

                if (answer) { self._yesClickHandler = handler; }
                else { self._noClickHandler = handler; }
                return handler
              }
            },
            function (done) {
              delete self.questions[id];
              if (self.lastAsked === id) { self.lastAsked = null; }

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
      if (self.lastAsked === id) {
        self.lastAsked = null;
      }
    };
    newQ.then(splice, splice);

    return newQ
  };

  return Ballot;
}(THREE.Object3D));

var Seat = (function (superclass) {
  function Seat (seatNum) {
    superclass.call(this);

    this.seatNum = seatNum;
    this.owner = 0;

// position seat
    var x = 0.65;
    var y = 0.65;
    var z = null;
    switch (seatNum) {
      case 0: case 1: case 2:
        x = -0.833 + 0.833 * seatNum;
        this.position.set(x, y, -1.05);
        break
      case 3: case 4:
        z = -0.437 + 0.874 * (seatNum - 3);
        this.position.set(1.425, y, z);
        this.rotation.set(0, -Math.PI / 2, 0);
        break
      case 5: case 6: case 7:
        x = 0.833 - 0.833 * (seatNum - 5);
        this.position.set(x, y, 1.05);
        this.rotation.set(0, -Math.PI, 0);
        break
      case 8: case 9:
        z = 0.437 - 0.874 * (seatNum - 8);
        this.position.set(-1.425, y, z);
        this.rotation.set(0, -1.5 * Math.PI, 0);
        break
    }

    this.nameplate = new Nameplate(this);
    this.nameplate.position.set(0, -0.635, 0.22);
    this.add(this.nameplate);

    this.ballot = new Ballot(this);
    this.ballot.position.set(0, -0.3, 0.25);
        // this.ballot.rotateY(0.1);
    this.add(this.ballot);

    SH.addEventListener('update_turnOrder', this.updateOwnership.bind(this));
  }

  if ( superclass ) Seat.__proto__ = superclass;
  Seat.prototype = Object.create( superclass && superclass.prototype );
  Seat.prototype.constructor = Seat;

  Seat.prototype.updateOwnership = function updateOwnership (ref) {
    var this$1 = this;
    var ref_data = ref.data;
    var game = ref_data.game;
    var players = ref_data.players;

    var ids = game.turnOrder;

// register this seat if it's newly claimed
    if (!this.owner) {
// check if a player has joined at this seat
      for (var i in ids) {
        if (players[ids[i]].seatNum === this$1.seatNum) {
          this$1.owner = ids[i];
          this$1.nameplate.updateText(players[ids[i]].displayName);
        }
      }
    }

// reset this seat if it's newly vacated
    if (!ids.includes(this.owner)) {
      this.owner = 0;
      if (game.state === 'setup') {
        this.nameplate.updateText('<Join>');
      }
    } else if (!players[this.owner].connected) {
// update disconnect colors
      this.nameplate.model.material.color.setHex(0x808080);
    } else if (players[this.owner].connected) {
      this.nameplate.model.material.color.setHex(0xffffff);
    }
  };

  return Seat;
}(THREE.Object3D));

var SecretHitler = (function (superclass) {
  function SecretHitler () {
    var this$1 = this;

    superclass.call(this);
    this.assets = AM.manifest;
    this.verticalAlign = 'bottom';
    this.needsSkeleton = true;

// polyfill getUser function
    if (!altspace.inClient) {
      altspace.getUser = function () {
        var re = /[?&]userId=(\d+)/.exec(window.location.search);
        var id = null;
        if (re) {
          id = JSON.parse(re[1]);
        } else {
          id = Math.floor(Math.random() * 10000000);
        }

        altspace._localUser = {
          userId: id,
          displayName: 'Guest' + id,
          isModerator: false
        };
        console.log('Masquerading as', altspace._localUser);
        return Promise.resolve(altspace._localUser)
      };
    }

// get local user
    altspace.getUser().then(function (user) {
      this$1.localUser = {
        id: user.userId,
        displayName: user.displayName,
        isModerator: user.isModerator
      };
    });

    this.game = {};
    this.players = {};
    this.votes = {};
  }

  if ( superclass ) SecretHitler.__proto__ = superclass;
  SecretHitler.prototype = Object.create( superclass && superclass.prototype );
  SecretHitler.prototype.constructor = SecretHitler;

  SecretHitler.prototype.initialize = function initialize (env, root, assets) {
    var this$1 = this;

// share the diorama info
    AM.cache = assets;
    this.env = env;

// connect to server
    this.socket = io.connect('/', {query: 'gameId=' + getGameId()});

// create the table
    this.table = new GameTable();
    this.add(this.table);

    this.resetButton = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.25, 0.25),
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
    for (var i = 0; i < 10; i++) {
      this$1.seats.push(new Seat(i));
    }

    (ref = this.table).add.apply(ref, this.seats);

// add avatar for scale
    assets.models.dummy.position.set(0, 0, 1.1);
    assets.models.dummy.rotateZ(Math.PI);
    this.add(assets.models.dummy);

    this.socket.on('update', this.updateFromServer.bind(this));
    var ref;
  };

  SecretHitler.prototype.updateFromServer = function updateFromServer (gd, pd, vd) {
    var this$1 = this;

    console.log(gd, pd, vd);

    var game = Object.assign({}, this.game, gd);
    var players = Object.assign({}, this.players, pd);
    var votes = Object.assign({}, this.votes, vd);

    for (var field in gd) {
      this$1.dispatchEvent({
        type: 'update_' + field,
        bubbles: false,
        data: {
          game: game,
          players: players,
          votes: votes
        }
      });
    }

    if (players[this.localUser.id] && !players[this.localUser.id].connected) {
      this.socket.emit('checkIn', this.localUser);
    }

    this.game = game;
    this.players = players;
    this.votes = votes;
  };

  SecretHitler.prototype.reset = function reset (e) {
    if (this.localUser.isModerator) {
      console.log('requesting reset');
      this.socket.emit('reset');
    }
  };

  return SecretHitler;
}(THREE.Object3D));

var SH = new SecretHitler();

return SH;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGllbnQvYXNzZXRtYW5hZ2VyLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9nYW1lb2JqZWN0cy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvcGxheWVybWFuYWdlci5qcyIsIi4uLy4uL3NyYy9jbGllbnQvYmVoYXZpb3IuanMiLCIuLi8uLi9zcmMvY2xpZW50L2FuaW1hdGUuanMiLCIuLi8uLi9zcmMvY2xpZW50L2NhcmQuanMiLCIuLi8uLi9zcmMvY2xpZW50L2hhdHMuanMiLCIuLi8uLi9zcmMvY2xpZW50L3RhYmxlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC91dGlscy5qcyIsIi4uLy4uL3NyYy9jbGllbnQvbmFtZXBsYXRlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9jYXNjYWRpbmdwcm9taXNlLmpzIiwiLi4vLi4vc3JjL2NsaWVudC9iYWxsb3QuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlYXQuanMiLCIuLi8uLi9zcmMvY2xpZW50L3NlY3JldGhpdGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxuZXhwb3J0IGRlZmF1bHQge1xuICBtYW5pZmVzdDoge1xuICAgIG1vZGVsczoge1xuICAgICAgdGFibGU6ICdzdGF0aWMvbW9kZWwvdGFibGUuZGFlJyxcbiAgICAgIG5hbWVwbGF0ZTogJ3N0YXRpYy9tb2RlbC9uYW1lcGxhdGUuZGFlJyxcbiAgICAgIHRvcGhhdDogJ3N0YXRpYy9tb2RlbC90b3BoYXQuZ2x0ZicsXG4gICAgICB2aXNvcmNhcDogJ3N0YXRpYy9tb2RlbC92aXNvcl9jYXAuZ2x0ZicsXG4gICAgICBkdW1teTogJ3N0YXRpYy9tb2RlbC9kdW1teS5nbHRmJ1xuICAgIH0sXG4gICAgdGV4dHVyZXM6IHtcbiAgICAgIGJvYXJkX2xhcmdlOiAnc3RhdGljL2ltZy9ib2FyZC1sYXJnZS1iYWtlZC5wbmcnLFxuICAgICAgYm9hcmRfbWVkOiAnc3RhdGljL2ltZy9ib2FyZC1tZWRpdW0tYmFrZWQucG5nJyxcbiAgICAgIGJvYXJkX3NtYWxsOiAnc3RhdGljL2ltZy9ib2FyZC1zbWFsbC1iYWtlZC5wbmcnLFxuICAgICAgY2FyZHM6ICdzdGF0aWMvaW1nL2NhcmRzLnBuZycsXG4gICAgICByZXNldDogJ3N0YXRpYy9pbWcvYm9tYi5wbmcnXG4gICAgfVxuICB9LFxuICBjYWNoZToge31cbn1cbiIsIid1c2Ugc3RyaWN0J1xuXG5jbGFzcyBHYW1lU3RhdGVcbntcbiAgY29uc3RydWN0b3IgKGlkKSB7XG4gICAgdGhpcy5pZCA9IGlkXG5cbiAgICB0aGlzLnN0YXRlID0gJ2lkbGUnXG5cbiAgICB0aGlzLnR1cm5PcmRlciA9IFtdIC8vIGFycmF5IG9mIHVzZXJJZHNcbiAgICB0aGlzLnByZXNpZGVudCA9IDAgLy8gdXNlcklkXG4gICAgdGhpcy5jaGFuY2VsbG9yID0gMCAvLyB1c2VySWRcbiAgICB0aGlzLmxhc3RQcmVzaWRlbnQgPSAwIC8vIHVzZXJJZFxuICAgIHRoaXMubGFzdENoYW5jZWxsb3IgPSAwIC8vIHVzZXJJZFxuXG4gICAgdGhpcy5saWJlcmFsUG9saWNpZXMgPSAwXG4gICAgdGhpcy5mYXNjaXN0UG9saWNpZXMgPSAwXG4gICAgdGhpcy5kZWNrRmFzY2lzdCA9IDExXG4gICAgdGhpcy5kZWNrTGliZXJhbCA9IDZcbiAgICB0aGlzLmRpc2NhcmRGYXNjaXN0ID0gMFxuICAgIHRoaXMuZGlzY2FyZExpYmVyYWwgPSAwXG4gICAgdGhpcy5zcGVjaWFsRWxlY3Rpb24gPSBmYWxzZVxuICAgIHRoaXMuZmFpbGVkVm90ZXMgPSAwXG4gIH1cblxuICBuZXh0UHJlc2lkZW50ICgpIHtcbiAgICBsZXQgdHVybiA9IDBcblxuLy8gdGhpcyBpcyB0aGUgZmlyc3Qgcm91bmQsIGNob29zZSBwcmVzaWRlbnQgcmFuZG9tbHlcbiAgICBpZiAoIXRoaXMucHJlc2lkZW50KSB7XG4gICAgICB0dXJuID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhpcy50dXJuT3JkZXIubGVuZ3RoKVxuICAgIH0gZWxzZSBpZiAodGhpcy5zcGVjaWFsRWxlY3Rpb24pIHtcbi8vIHRoaXMgaXMgYSBzcGVjaWFsIGVsZWN0aW9uLCBzbyBjb3VudCBmcm9tIHByZXNpZGVudCBlbWVyaXR1c1xuICAgICAgdHVybiA9IHRoaXMucGxheWVyc1t0aGlzLmxhc3RQcmVzaWRlbnRdLnR1cm5PcmRlclxuICAgIH0gZWxzZSB7XG4vLyBhIHJlZ3VsYXIgZWxlY3Rpb246IHBvd2VyIHBhc3NlcyB0byB0aGUgbGVmdFxuICAgICAgdHVybiA9IHRoaXMucGxheWVyc1t0aGlzLnByZXNpZGVudF0udHVybk9yZGVyXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudHVybk9yZGVyWyAodHVybiArIDEpICUgdGhpcy50dXJuT3JkZXIubGVuZ3RoIF1cbiAgfVxuXG4gIGRyYXdQb2xpY2llcyAoKSB7XG5cbiAgfVxufVxuXG5jbGFzcyBQbGF5ZXJcbntcbiAgY29uc3RydWN0b3IgKHVzZXJJZCA9IDAsIGRpc3BsYXlOYW1lID0gJ2R1bW15JywgaXNNb2RlcmF0b3IgPSBmYWxzZSkge1xuICAgIHRoaXMudXNlcklkID0gdXNlcklkXG4gICAgdGhpcy5kaXNwbGF5TmFtZSA9IGRpc3BsYXlOYW1lXG4gICAgdGhpcy5pc01vZGVyYXRvciA9IGZhbHNlXG4gICAgdGhpcy50dXJuT3JkZXIgPSAtMSAvLyB1bmtub3duIHVudGlsIGdhbWUgc3RhcnRzXG5cbiAgICB0aGlzLnJvbGUgPSAndW5hc3NpZ25lZCcgLy8gb25lIG9mICd1bmFzc2lnbmVkJywgJ2hpdGxlcicsICdmYXNjaXN0JywgJ2xpYmVyYWwnXG4gICAgdGhpcy5zdGF0ZSA9ICdub3JtYWwnIC8vIG9uZSBvZiAnbm9ybWFsJywgJ2ludmVzdGlnYXRlZCcsICdkZWFkJ1xuICB9XG5cbiAgZ2V0IHBhcnR5ICgpIHtcbiAgICBpZiAodGhpcy5yb2xlID09PSAnaGl0bGVyJykgcmV0dXJuICdmYXNjaXN0J1xuICAgIGVsc2UgcmV0dXJuIHRoaXMucm9sZVxuICB9XG59XG5cbmV4cG9ydCB7IEdhbWVTdGF0ZSwgUGxheWVyIH1cbiIsIid1c2Ugc3RyaWN0J1xuXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInXG5pbXBvcnQgeyBQbGF5ZXIgfSBmcm9tICcuL2dhbWVvYmplY3RzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQbGF5ZXJNYW5hZ2VyXG57XG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICB0aGlzLmxvY2FsVXNlciA9IG51bGxcbiAgICB0aGlzLnBsYXllcnMgPSBbXVxuICB9XG5cbiAgYWNxdWlyZUxvY2FsVXNlciAoKSB7XG4gICAgaWYgKHdpbmRvdy5hbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudCkge1xuICAgICAgdGhpcy5sb2NhbFVzZXIgPSB7fVxuXG4vLyBnZXQgdGhlIGxvY2FsIHVzZXIgaWQgYW5kIG5hbWVcbiAgICAgIGFsdHNwYWNlLmdldFVzZXIoKS50aGVuKHVzZXIgPT4ge1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMubG9jYWxVc2VyLCB1c2VyKVxuICAgICAgfSlcblxuLy8gZ2V0IHRoZSB1c2VyIHRyYWNraW5nIHNrZWxldG9uXG4gICAgICBhbHRzcGFjZS5nZXRUaHJlZUpTVHJhY2tpbmdTa2VsZXRvbigpLnRoZW4odHMgPT4ge1xuICAgICAgICB0aGlzLmxvY2FsVXNlci5za2VsZXRvbiA9IHRzXG4gICAgICAgIFNILmFkZCh0cylcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbi8vIGZha2UgdXNlciBkYXRhXG4gICAgICB0aGlzLmxvY2FsVXNlciA9IHtcbiAgICAgICAgdXNlcklkOiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwKSxcbiAgICAgICAgaXNNb2RlcmF0b3I6IGZhbHNlXG4gICAgICB9XG4gICAgICB0aGlzLmxvY2FsVXNlci5kaXNwbGF5TmFtZSA9ICdXZWIgVXNlciAnICsgdGhpcy5sb2NhbFVzZXIudXNlcklkXG4gICAgfVxuICB9XG59XG4iLCIndXNlIHN0cmljdCdcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJ1xuaW1wb3J0IFBNIGZyb20gJy4vcGxheWVybWFuYWdlcidcblxuY2xhc3MgQmVoYXZpb3JcbntcbiAgY29uc3RydWN0b3IgKHR5cGUpIHtcbiAgICB0aGlzLnR5cGUgPSB0eXBlXG4gIH1cblxuICBhd2FrZSAob2JqKSB7XG4gICAgdGhpcy5vYmplY3QzRCA9IG9ialxuICB9XG5cbiAgc3RhcnQgKCkgeyB9XG5cbiAgdXBkYXRlIChkVCkgeyB9XG5cbiAgZGlzcG9zZSAoKSB7IH1cbn1cblxuY2xhc3MgQlN5bmMgZXh0ZW5kcyBCZWhhdmlvclxue1xuICBjb25zdHJ1Y3RvciAoZXZlbnROYW1lKSB7XG4gICAgc3VwZXIoJ0JTeW5jJylcbiAgICB0aGlzLl9zID0gU0guc29ja2V0XG5cbi8vIGxpc3RlbiBmb3IgdXBkYXRlIGV2ZW50c1xuICAgIHRoaXMuaG9vayA9IHRoaXMuX3Mub24oZXZlbnROYW1lLCB0aGlzLnVwZGF0ZUZyb21TZXJ2ZXIuYmluZCh0aGlzKSlcbiAgICB0aGlzLmV2ZW50TmFtZSA9IGV2ZW50TmFtZVxuICAgIHRoaXMub3duZXIgPSAndW5vd25lZCdcbiAgfVxuXG4gIHVwZGF0ZUZyb21TZXJ2ZXIgKGRhdGEpIHtcbiAgICB0aGlzLm9iamVjdDNELnBvc2l0aW9uLmZyb21BcnJheShkYXRhLCAwKVxuICAgIHRoaXMub2JqZWN0M0Qucm90YXRpb24uZnJvbUFycmF5KGRhdGEsIDMpXG4gIH1cblxuICB0YWtlT3duZXJzaGlwICgpIHtcbiAgICBpZiAoUE0ubG9jYWxVc2VyICYmIFBNLmxvY2FsVXNlci51c2VySWQpIHtcbiAgICAgIHRoaXMub3duZXIgPSBQTS5sb2NhbFVzZXIudXNlcklkXG4gICAgfVxuICB9XG5cbiAgdXBkYXRlIChkVCkge1xuICAgIGlmIChQTS5sb2NhbFVzZXIgJiYgUE0ubG9jYWxVc2VyLnNrZWxldG9uICYmIFBNLmxvY2FsVXNlci51c2VySWQgPT09IHRoaXMub3duZXIpIHtcbiAgICAgIGxldCBqID0gUE0ubG9jYWxVc2VyLnNrZWxldG9uLmdldEpvaW50KCdIZWFkJylcbiAgICAgIHRoaXMuX3MuZW1pdCh0aGlzLmV2ZW50TmFtZSwgWy4uLmoucG9zaXRpb24udG9BcnJheSgpLCAuLi5qLnJvdGF0aW9uLnRvQXJyYXkoKV0pXG4gICAgfVxuICB9XG5cbn1cblxuZXhwb3J0IHsgQmVoYXZpb3IsIEJTeW5jIH1cbiIsIid1c2Ugc3RyaWN0J1xuXG5pbXBvcnQgeyBCZWhhdmlvciB9IGZyb20gJy4vYmVoYXZpb3InXG5cbmNsYXNzIEFuaW1hdGUgZXh0ZW5kcyBCZWhhdmlvclxue1xuICBjb25zdHJ1Y3RvciAoLy8ge3BhcmVudCwgcG9zLCBxdWF0LCBzY2FsZSwgbWF0cml4LCBkdXJhdGlvbiwgY2FsbGJhY2t9XG4gICAge3BhcmVudCA9IG51bGwsIHBvcyA9IG51bGwsIHF1YXQgPSBudWxsLCBzY2FsZSA9IG51bGwsIG1hdHJpeCA9IG51bGwsIGR1cmF0aW9uID0gNjAwLCBjYWxsYmFjayA9ICgpID0+IHt9fSkge1xuICAgIHN1cGVyKCdBbmltYXRlJylcblxuICAgIGlmIChtYXRyaXgpIHtcbi8vIGV4dHJhY3QgcG9zaXRpb24vcm90YXRpb24vc2NhbGUgZnJvbSBtYXRyaXhcbiAgICAgIHBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKClcbiAgICAgIHF1YXQgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpXG4gICAgICBzY2FsZSA9IG5ldyBUSFJFRS5WZWN0b3IzKClcbiAgICAgIG1hdHJpeC5kZWNvbXBvc2UocG9zLCBxdWF0LCBzY2FsZSlcbiAgICB9XG5cbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIHtwYXJlbnQsIHBvcywgcXVhdCwgc2NhbGUsIGR1cmF0aW9uLCBjYWxsYmFja30pXG4gIH1cblxuICBhd2FrZSAob2JqKSB7XG4gICAgc3VwZXIuYXdha2Uob2JqKVxuXG4vLyBzaHVmZmxlIGhpZXJhcmNoeSwgYnV0IGtlZXAgd29ybGQgdHJhbnNmb3JtIHRoZSBzYW1lXG4gICAgaWYgKHRoaXMucGFyZW50ICYmIHRoaXMucGFyZW50ICE9PSBvYmoucGFyZW50KSB7XG4gICAgICBvYmouYXBwbHlNYXRyaXgob2JqLnBhcmVudC5tYXRyaXhXb3JsZClcbiAgICAgIGxldCBtYXQgPSBuZXcgVEhSRUUuTWF0cml4NCgpLmdldEludmVyc2UodGhpcy5wYXJlbnQubWF0cml4V29ybGQpXG4gICAgICBvYmouYXBwbHlNYXRyaXgobWF0KVxuXG4gICAgICB0aGlzLnBhcmVudC5hZGQob2JqKVxuICAgIH1cblxuLy8gcmVhZCBpbml0aWFsIHBvc2l0aW9uc1xuICAgIHRoaXMuaW5pdGlhbFBvcyA9IG9iai5wb3NpdGlvbi5jbG9uZSgpXG4gICAgdGhpcy5pbml0aWFsUXVhdCA9IG9iai5xdWF0ZXJuaW9uLmNsb25lKClcbiAgICB0aGlzLmluaXRpYWxTY2FsZSA9IG9iai5zY2FsZS5jbG9uZSgpXG4gICAgdGhpcy5zdGFydFRpbWUgPSBEYXRlLm5vdygpXG4gIH1cblxuICB1cGRhdGUgKCkge1xuLy8gY29tcHV0ZSBlYXNlLW91dCBiYXNlZCBvbiBkdXJhdGlvblxuICAgIGxldCBtaXggPSAoRGF0ZS5ub3coKSAtIHRoaXMuc3RhcnRUaW1lKSAvIHRoaXMuZHVyYXRpb25cbiAgICBsZXQgZWFzZSA9IFRXRUVOID8gVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQgOiBuID0+IG4gKiAoMiAtIG4pXG4gICAgbWl4ID0gbWl4IDwgMSA/IGVhc2UobWl4KSA6IDFcblxuLy8gYW5pbWF0ZSBwb3NpdGlvbiBpZiByZXF1ZXN0ZWRcbiAgICBpZiAodGhpcy5wb3MpIHtcbiAgICAgIHRoaXMub2JqZWN0M0QucG9zaXRpb24ubGVycFZlY3RvcnModGhpcy5pbml0aWFsUG9zLCB0aGlzLnBvcywgbWl4KVxuICAgIH1cblxuLy8gYW5pbWF0ZSByb3RhdGlvbiBpZiByZXF1ZXN0ZWRcbiAgICBpZiAodGhpcy5xdWF0KSB7XG4gICAgICBUSFJFRS5RdWF0ZXJuaW9uLnNsZXJwKHRoaXMuaW5pdGlhbFF1YXQsIHRoaXMucXVhdCwgdGhpcy5vYmplY3QzRC5xdWF0ZXJuaW9uLCBtaXgpXG4gICAgfVxuXG4vLyBhbmltYXRlIHNjYWxlIGlmIHJlcXVlc3RlZFxuICAgIGlmICh0aGlzLnNjYWxlKSB7XG4gICAgICB0aGlzLm9iamVjdDNELnNjYWxlLmxlcnBWZWN0b3JzKHRoaXMuaW5pdGlhbFNjYWxlLCB0aGlzLnNjYWxlLCBtaXgpXG4gICAgfVxuXG4vLyB0ZXJtaW5hdGUgYW5pbWF0aW9uIHdoZW4gZG9uZVxuICAgIGlmIChtaXggPj0gMSkge1xuICAgICAgdGhpcy5vYmplY3QzRC5yZW1vdmVCZWhhdmlvcih0aGlzKVxuICAgICAgdGhpcy5jYWxsYmFjay5jYWxsKHRoaXMub2JqZWN0M0QpXG4gICAgfVxuICB9XG59XG5cbkFuaW1hdGUuc3RhcnQgPSAodGFyZ2V0LCBvcHRzKSA9PiB7XG4gIGxldCBvbGRBbmltID0gdGFyZ2V0LmdldEJlaGF2aW9yQnlUeXBlKCdBbmltYXRlJylcbiAgaWYgKG9sZEFuaW0pIHtcbiAgICBvbGRBbmltLmNvbnN0cnVjdG9yKG9wdHMpXG4gICAgb2xkQW5pbS5hd2FrZSh0YXJnZXQpXG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0LmFkZEJlaGF2aW9yKG5ldyBBbmltYXRlKG9wdHMpKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEFuaW1hdGVcbiIsIid1c2Ugc3RyaWN0J1xuXG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJ1xuaW1wb3J0IEFuaW1hdGUgZnJvbSAnLi9hbmltYXRlJ1xuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJ1xuXG4vLyBlbnVtIGNvbnN0YW50c1xubGV0IFR5cGVzID0gT2JqZWN0LmZyZWV6ZSh7XG4gIFBPTElDWV9MSUJFUkFMOiAwLFxuICBQT0xJQ1lfRkFTQ0lTVDogMSxcbiAgUk9MRV9MSUJFUkFMOiAyLFxuICBST0xFX0ZBU0NJU1Q6IDMsXG4gIFJPTEVfSElUTEVSOiA0LFxuICBQQVJUWV9MSUJFUkFMOiA1LFxuICBQQVJUWV9GQVNDSVNUOiA2LFxuICBKQTogNyxcbiAgTkVJTjogOCxcbiAgQkxBTks6IDksXG4gIENSRURJVFM6IDEwXG59KVxuXG5mdW5jdGlvbiBkaW1zVG9VViAoe3NpZGUsIGxlZnQsIHJpZ2h0LCB0b3AsIGJvdHRvbX0pIHtcbiAgaWYgKHNpZGUpIHtcbiAgICByZXR1cm4gW1tcbiAgICAgIG5ldyBUSFJFRS5WZWN0b3IyKHRvcCwgbGVmdCksXG4gICAgICBuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIGxlZnQpLFxuICAgICAgbmV3IFRIUkVFLlZlY3RvcjIodG9wLCByaWdodClcbiAgICBdLCBbXG4gICAgICBuZXcgVEhSRUUuVmVjdG9yMihib3R0b20sIGxlZnQpLFxuICAgICAgbmV3IFRIUkVFLlZlY3RvcjIoYm90dG9tLCByaWdodCksXG4gICAgICBuZXcgVEhSRUUuVmVjdG9yMih0b3AsIHJpZ2h0KVxuICAgIF1dXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFtbXG4gICAgICBuZXcgVEhSRUUuVmVjdG9yMihsZWZ0LCB0b3ApLFxuICAgICAgbmV3IFRIUkVFLlZlY3RvcjIobGVmdCwgYm90dG9tKSxcbiAgICAgIG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCB0b3ApXG4gICAgXSwgW1xuICAgICAgbmV3IFRIUkVFLlZlY3RvcjIobGVmdCwgYm90dG9tKSxcbiAgICAgIG5ldyBUSFJFRS5WZWN0b3IyKHJpZ2h0LCBib3R0b20pLFxuICAgICAgbmV3IFRIUkVFLlZlY3RvcjIocmlnaHQsIHRvcClcbiAgICBdXVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldFVWcyAodHlwZSkge1xuICBsZXQgZGltcyA9IHtsZWZ0OiAwLCByaWdodDogMSwgYm90dG9tOiAwLCB0b3A6IDF9XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSBUeXBlcy5QT0xJQ1lfTElCRVJBTDpcbiAgICAgIGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC44MzQsIHJpZ2h0OiAwLjk5NiwgdG9wOiAwLjc1NCwgYm90dG9tOiAwLjk5N31cbiAgICAgIGJyZWFrXG4gICAgY2FzZSBUeXBlcy5QT0xJQ1lfRkFTQ0lTVDpcbiAgICAgIGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC42NiwgcmlnaHQ6IDAuODIyLCB0b3A6IDAuNzU0LCBib3R0b206IDAuOTk2fVxuICAgICAgYnJlYWtcbiAgICBjYXNlIFR5cGVzLlJPTEVfTElCRVJBTDpcbiAgICAgIGRpbXMgPSB7bGVmdDogMC41MDUsIHJpZ2h0OiAwLjc0NiwgdG9wOiAwLjk5NiwgYm90dG9tOiAwLjY1fVxuICAgICAgYnJlYWtcbiAgICBjYXNlIFR5cGVzLlJPTEVfRkFTQ0lTVDpcbiAgICAgIGRpbXMgPSB7bGVmdDogMC41MDUsIHJpZ2h0OiAwLjc0NiwgdG9wOiAwLjY0NSwgYm90dG9tOiAwLjN9XG4gICAgICBicmVha1xuICAgIGNhc2UgVHlwZXMuUk9MRV9ISVRMRVI6XG4gICAgICBkaW1zID0ge2xlZnQ6IDAuNzU0LCByaWdodDogMC45OTYsIHRvcDogMC42NDUsIGJvdHRvbTogMC4zfVxuICAgICAgYnJlYWtcbiAgICBjYXNlIFR5cGVzLlBBUlRZX0xJQkVSQUw6XG4gICAgICBkaW1zID0ge2xlZnQ6IDAuMjU1LCByaWdodDogMC40OTUsIHRvcDogMC45OTYsIGJvdHRvbTogMC42NX1cbiAgICAgIGJyZWFrXG4gICAgY2FzZSBUeXBlcy5QQVJUWV9GQVNDSVNUOlxuICAgICAgZGltcyA9IHtsZWZ0OiAwLjI1NSwgcmlnaHQ6IDAuNDk1LCB0b3A6IDAuNjQ1LCBib3R0b206IDAuM31cbiAgICAgIGJyZWFrXG4gICAgY2FzZSBUeXBlcy5KQTpcbiAgICAgIGRpbXMgPSB7bGVmdDogMC4wMDUsIHJpZ2h0OiAwLjI0NCwgdG9wOiAwLjk5MiwgYm90dG9tOiAwLjY1M31cbiAgICAgIGJyZWFrXG4gICAgY2FzZSBUeXBlcy5ORUlOOlxuICAgICAgZGltcyA9IHtsZWZ0OiAwLjAwNiwgcmlnaHQ6IDAuMjQzLCB0b3A6IDAuNjQyLCBib3R0b206IDAuMzAyfVxuICAgICAgYnJlYWtcbiAgICBjYXNlIFR5cGVzLkNSRURJVFM6XG4gICAgICBkaW1zID0ge3NpZGU6IHRydWUsIGxlZnQ6IDAuMDE1LCByaWdodDogMC4yNzYsIHRvcDogMC4zOTcsIGJvdHRvbTogMC43NjV9XG4gICAgICBicmVha1xuICAgIGNhc2UgVHlwZXMuQkxBTks6XG4gICAgZGVmYXVsdDpcbiAgICAgIGRpbXMgPSB7c2lkZTogdHJ1ZSwgbGVmdDogMC4wMjIsIHJpZ2h0OiAwLjAyMiArIDAuMjQ3LCB0b3A6IDAuMDIxLCBib3R0b206IDAuMDIxICsgMC4zNTQzfVxuICAgICAgYnJlYWtcbiAgfVxuXG4gIHJldHVybiBkaW1zVG9VVihkaW1zKVxufVxuXG5jbGFzcyBDYXJkIGV4dGVuZHMgVEhSRUUuT2JqZWN0M0RcbntcbiAgY29uc3RydWN0b3IgKHR5cGUgPSBUeXBlcy5CTEFOSywgZG91YmxlU2lkZWQgPSB0cnVlKSB7XG4gICAgc3VwZXIoKVxuXG4vLyBjcmVhdGUgdGhlIGNhcmQgZmFjZXNcbiAgICBsZXQgZnJvbnRHZW8gPSBuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSgwLjcxNSwgMSlcbiAgICBsZXQgYmFja0dlbyA9IGZyb250R2VvLmNsb25lKClcbiAgICBsZXQgY2FyZE1hdCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBBc3NldE1hbmFnZXIuY2FjaGUudGV4dHVyZXMuY2FyZHN9KVxuICAgIGxldCBmcm9udCA9IG5ldyBUSFJFRS5NZXNoKGZyb250R2VvLCBjYXJkTWF0KVxuICAgIGxldCBiYWNrID0gbmV3IFRIUkVFLk1lc2goYmFja0dlbywgY2FyZE1hdClcbiAgICBiYWNrLnBvc2l0aW9uLnNldCgwLjAwMSwgMCwgMClcbiAgICBmcm9udC5wb3NpdGlvbi5zZXQoLTAuMDAxLCAwLCAwKVxuICAgIGJhY2sucm90YXRlWShNYXRoLlBJKVxuXG4vLyBzZXQgdGhlIGZhY2VzIHRvIHRoZSBjb3JyZWN0IHBhcnQgb2YgdGhlIHRleHR1cmVcbiAgICBmcm9udC5nZW9tZXRyeS5mYWNlVmVydGV4VXZzID0gW2dldFVWcyh0eXBlKV1cbiAgICBiYWNrLmdlb21ldHJ5LmZhY2VWZXJ0ZXhVdnMgPSBbZ2V0VVZzKGRvdWJsZVNpZGVkID8gdHlwZSA6IFR5cGVzLkJMQU5LKV1cbiAgICB0aGlzLnNjYWxlLnNldFNjYWxhcigwLjcpXG4gICAgdGhpcy5hZGQoZnJvbnQsIGJhY2spXG4gIH1cblxuICBoaWRlICgpIHtcbiAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IGZhbHNlIH0pXG4gIH1cblxuICBzaG93ICgpIHtcbiAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2gobyA9PiB7IG8udmlzaWJsZSA9IHRydWUgfSlcbiAgfVxufVxuXG5jbGFzcyBCbGFua0NhcmQgZXh0ZW5kcyBDYXJkIHtcbiAgLy8gY29uc3RydWN0b3IgKCkgeyBzdXBlcigpIH1cbn1cblxuY2xhc3MgQ3JlZGl0c0NhcmQgZXh0ZW5kcyBDYXJkIHtcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHN1cGVyKFR5cGVzLkNSRURJVFMpXG4gICAgbGV0IHNlbGYgPSB0aGlzXG5cbiAgICBmdW5jdGlvbiBzZXRWaXNpYmlsaXR5ICh7ZGF0YToge2dhbWU6IHtzdGF0ZX19fSkge1xuICAgICAgaWYgKHN0YXRlID09PSAnc2V0dXAnKSB7XG4gICAgICAgIHNlbGYuY2hpbGRyZW4uZm9yRWFjaChvID0+IHsgby52aXNpYmxlID0gdHJ1ZSB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5jaGlsZHJlbi5mb3JFYWNoKG8gPT4geyBvLnZpc2libGUgPSBmYWxzZSB9KVxuICAgICAgfVxuICAgIH1cblxuICAgIFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIHNldFZpc2liaWxpdHkpXG4gIH1cbn1cblxuY2xhc3MgTGliZXJhbFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHN1cGVyKFR5cGVzLlBPTElDWV9MSUJFUkFMLCBmYWxzZSlcbiAgfVxuICBnb1RvUG9zaXRpb24gKHNwb3QgPSAwKSB7XG4gICAgc3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDQsIHNwb3QpKVxuICAgIGxldCBzID0gTGliZXJhbFBvbGljeUNhcmQuc3BvdHNcbiAgICBBbmltYXRlLnN0YXJ0KHRoaXMsIHtwYXJlbnQ6IEFzc2V0TWFuYWdlci5yb290LCBwb3M6IHNbJ3Bvc18nICsgc3BvdF0sIHF1YXQ6IHMucXVhdCwgc2NhbGU6IHMuc2NhbGV9KVxuICB9XG59XG5cbkxpYmVyYWxQb2xpY3lDYXJkLnNwb3RzID0ge1xuICBwb3NfMDogbmV3IFRIUkVFLlZlY3RvcjMoMC41MzMsIDAuNzYsIC0wLjMzNiksXG4gIHBvc18xOiBuZXcgVEhSRUUuVmVjdG9yMygwLjI2MywgMC43NiwgLTAuMzM2KSxcbiAgcG9zXzI6IG5ldyBUSFJFRS5WZWN0b3IzKC0wLjAwNywgMC43NiwgLTAuMzM2KSxcbiAgcG9zXzM6IG5ldyBUSFJFRS5WZWN0b3IzKC0wLjI3OSwgMC43NiwgLTAuMzM2KSxcbiAgcG9zXzQ6IG5ldyBUSFJFRS5WZWN0b3IzKC0wLjU1MiwgMC43NiwgLTAuMzM2KSxcbiAgcXVhdDogbmV3IFRIUkVFLlF1YXRlcm5pb24oMCwgMC43MDcxMDY3ODExODY1NDc1LCAwLjcwNzEwNjc4MTE4NjU0NzUsIDApLFxuICBzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMC43LCAwLjcsIDAuNylcbn1cblxuY2xhc3MgRmFzY2lzdFBvbGljeUNhcmQgZXh0ZW5kcyBDYXJkIHtcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHN1cGVyKFR5cGVzLlBPTElDWV9GQVNDSVNULCBmYWxzZSlcbiAgfVxuICBnb1RvUG9zaXRpb24gKHNwb3QgPSAwKSB7XG4gICAgc3BvdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDUsIHNwb3QpKVxuICAgIGxldCBzID0gRmFzY2lzdFBvbGljeUNhcmQuc3BvdHNcbiAgICBBbmltYXRlLnN0YXJ0KHRoaXMsIHtwYXJlbnQ6IEFzc2V0TWFuYWdlci5yb290LCBwb3M6IHNbJ3Bvc18nICsgc3BvdF0sIHF1YXQ6IHMucXVhdCwgc2NhbGU6IHMuc2NhbGV9KVxuICB9XG59XG5cbkZhc2Npc3RQb2xpY3lDYXJkLnNwb3RzID0ge1xuICBwb3NfMDogbmV3IFRIUkVFLlZlY3RvcjMoLTAuNjg3LCAwLjc2LCAwLjM0MSksXG4gIHBvc18xOiBuZXcgVEhSRUUuVmVjdG9yMygtMC40MTcsIDAuNzYsIDAuMzQxKSxcbiAgcG9zXzI6IG5ldyBUSFJFRS5WZWN0b3IzKC0wLjE0NiwgMC43NiwgMC4zNDEpLFxuICBwb3NfMzogbmV3IFRIUkVFLlZlY3RvcjMoMC4xMjcsIDAuNzYsIDAuMzQxKSxcbiAgcG9zXzQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuNDAwLCAwLjc2LCAwLjM0MSksXG4gIHBvc181OiBuZXcgVEhSRUUuVmVjdG9yMygwLjY3MywgMC43NiwgMC4zNDEpLFxuICBxdWF0OiBuZXcgVEhSRUUuUXVhdGVybmlvbigtMC43MDcxMDY3ODExODY1NDc1LCAwLCAwLCAwLjcwNzEwNjc4MTE4NjU0NzUpLFxuICBzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMC43LCAwLjcsIDAuNylcbn1cblxuY2xhc3MgTGliZXJhbFJvbGVDYXJkIGV4dGVuZHMgQ2FyZCB7XG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICBzdXBlcihUeXBlcy5ST0xFX0xJQkVSQUwsIGZhbHNlKVxuICB9XG59XG5cbmNsYXNzIEZhc2Npc3RSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgc3VwZXIoVHlwZXMuUk9MRV9GQVNDSVNULCBmYWxzZSlcbiAgfVxufVxuXG5jbGFzcyBIaXRsZXJSb2xlQ2FyZCBleHRlbmRzIENhcmQge1xuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgc3VwZXIoVHlwZXMuUk9MRV9ISVRMRVIsIGZhbHNlKVxuICB9XG59XG5cbmNsYXNzIExpYmVyYWxQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHN1cGVyKFR5cGVzLlBBUlRZX0xJQkVSQUwsIGZhbHNlKVxuICB9XG59XG5cbmNsYXNzIEZhc2Npc3RQYXJ0eUNhcmQgZXh0ZW5kcyBDYXJkIHtcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHN1cGVyKFR5cGVzLlBBUlRZX0ZBU0NJU1QsIGZhbHNlKVxuICB9XG59XG5cbmNsYXNzIEphQ2FyZCBleHRlbmRzIENhcmQge1xuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgc3VwZXIoVHlwZXMuSkEsIGZhbHNlKVxuICAgIHRoaXMuY2hpbGRyZW5bMF0ucm90YXRlWigtTWF0aC5QSSAvIDIpXG4gICAgdGhpcy5jaGlsZHJlblsxXS5yb3RhdGVaKC1NYXRoLlBJIC8gMilcbiAgfVxufVxuXG5jbGFzcyBOZWluQ2FyZCBleHRlbmRzIENhcmQge1xuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgc3VwZXIoVHlwZXMuTkVJTiwgZmFsc2UpXG4gICAgdGhpcy5jaGlsZHJlblswXS5yb3RhdGVaKC1NYXRoLlBJIC8gMilcbiAgICB0aGlzLmNoaWxkcmVuWzFdLnJvdGF0ZVooLU1hdGguUEkgLyAyKVxuICB9XG59XG5cbmV4cG9ydCB7XG4gIENhcmQsIFR5cGVzLCBCbGFua0NhcmQsIENyZWRpdHNDYXJkLCBMaWJlcmFsUG9saWN5Q2FyZCwgRmFzY2lzdFBvbGljeUNhcmQsIExpYmVyYWxSb2xlQ2FyZCwgRmFzY2lzdFJvbGVDYXJkLCBIaXRsZXJSb2xlQ2FyZCwgTGliZXJhbFBhcnR5Q2FyZCwgRmFzY2lzdFBhcnR5Q2FyZCwgSmFDYXJkLCBOZWluQ2FyZFxufVxuIiwiJ3VzZSBzdHJpY3QnXG5cbmltcG9ydCBBTSBmcm9tICcuL2Fzc2V0bWFuYWdlcidcbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcidcblxuY2xhc3MgUHJlc2lkZW50SGF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0RcbntcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnRvcGhhdFxuICAgIHRoaXMubW9kZWwucG9zaXRpb24uc2V0KDAsIDAsIDApXG4gICAgdGhpcy5tb2RlbC5yb3RhdGlvbi5zZXQoLU1hdGguUEkgLyAyLCAwLCAwKVxuICAgIHRoaXMuYWRkKHRoaXMubW9kZWwpXG5cbiAgICBTSC5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVfc3RhdGUnLCAoZSkgPT4ge1xuICAgICAgaWYgKGUuZGF0YS5nYW1lLnN0YXRlID09PSAnc2V0dXAnKSB0aGlzLmlkbGUoKVxuICAgIH0pXG4gIH1cblxuICBpZGxlICgpIHtcbiAgICB0aGlzLnBvc2l0aW9uLnNldCgwLjc1LCAwLCAwKVxuICAgIHRoaXMucm90YXRpb24uc2V0KDAsIE1hdGguUEkgLyAyLCAwKVxuICAgIFNILmlkbGVSb290LmFkZCh0aGlzKVxuICB9XG59O1xuXG5jbGFzcyBDaGFuY2VsbG9ySGF0IGV4dGVuZHMgVEhSRUUuT2JqZWN0M0RcbntcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLm1vZGVsID0gQU0uY2FjaGUubW9kZWxzLnZpc29yY2FwXG4gICAgdGhpcy5tb2RlbC5wb3NpdGlvbi5zZXQoMCwgMC4wNCwgMClcbiAgICB0aGlzLm1vZGVsLnJvdGF0aW9uLnNldCgtTWF0aC5QSSAvIDIsIDAsIDApXG4gICAgdGhpcy5hZGQodGhpcy5tb2RlbClcblxuICAgIFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV9zdGF0ZScsIChlKSA9PiB7XG4gICAgICBpZiAoZS5kYXRhLmdhbWUuc3RhdGUgPT09ICdzZXR1cCcpIHRoaXMuaWRsZSgpXG4gICAgfSlcbiAgfVxuXG4gIGlkbGUgKCkge1xuICAgIHRoaXMucG9zaXRpb24uc2V0KC0wLjc1LCAwLCAwKVxuICAgIHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJIC8gMiwgMClcbiAgICBTSC5pZGxlUm9vdC5hZGQodGhpcylcbiAgfVxufTtcblxuZXhwb3J0IHsgUHJlc2lkZW50SGF0LCBDaGFuY2VsbG9ySGF0IH1cbiIsIid1c2Ugc3RyaWN0J1xuXG5pbXBvcnQgQU0gZnJvbSAnLi9hc3NldG1hbmFnZXInXG5pbXBvcnQgU0ggZnJvbSAnLi9zZWNyZXRoaXRsZXInXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdhbWVUYWJsZSBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICBzdXBlcigpXG5cbi8vIHNhdmUgcmVmZXJlbmNlcyB0byB0aGUgdGV4dHVyZXNcbiAgICB0aGlzLnRleHR1cmVzID0gW1xuICAgICAgQU0uY2FjaGUudGV4dHVyZXMuYm9hcmRfc21hbGwsXG4gICAgICBBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9tZWQsXG4gICAgICBBTS5jYWNoZS50ZXh0dXJlcy5ib2FyZF9sYXJnZVxuICAgIF1cblxuLy8gYWRkIHRhYmxlIGFzc2V0XG4gICAgdGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy50YWJsZS5jaGlsZHJlblswXVxuICAgIHRoaXMubW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJIC8gMiwgMCwgMClcbiAgICB0aGlzLm1vZGVsLnNjYWxlLnNldFNjYWxhcigxLjI1KVxuICAgIHRoaXMuYWRkKHRoaXMubW9kZWwpXG5cbi8vIHNldCB0aGUgZGVmYXVsdCBtYXRlcmlhbFxuICAgIHRoaXMubW9kZWwubWF0ZXJpYWwubWFwID0gdGhpcy50ZXh0dXJlc1swXVxuXG4vLyBwb3NpdGlvbiB0YWJsZVxuICAgIHRoaXMucG9zaXRpb24uc2V0KDAsIDEuMCwgMClcblxuICAgIFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLmNoYW5nZU1vZGUuYmluZCh0aGlzKSlcbiAgfVxuXG4gIGNoYW5nZU1vZGUgKHtkYXRhOiB7Z2FtZToge3N0YXRlLCB0dXJuT3JkZXJ9fX0pIHtcbiAgICBpZiAoc3RhdGUgPT09ICdzZXR1cCcpIHtcbiAgICAgIGlmICh0dXJuT3JkZXIubGVuZ3RoID49IDkpIHsgdGhpcy5tb2RlbC5tYXRlcmlhbC5tYXAgPSB0aGlzLnRleHR1cmVzWzJdIH0gZWxzZSBpZiAodHVybk9yZGVyLmxlbmd0aCA+PSA3KSB7XG4gICAgICAgIHRoaXMubW9kZWwubWF0ZXJpYWwubWFwID0gdGhpcy50ZXh0dXJlc1sxXVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5tb2RlbC5tYXRlcmlhbC5tYXAgPSB0aGlzLnRleHR1cmVzWzBdXG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnXG5cbmltcG9ydCBTSCBmcm9tICcuL3NlY3JldGhpdGxlcidcblxuZnVuY3Rpb24gZ2V0R2FtZUlkICgpIHtcbi8vIGZpcnN0IGNoZWNrIHRoZSB1cmxcbiAgbGV0IHJlID0gL1s/Jl1nYW1lSWQ9KFteJl0rKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKVxuICBpZiAocmUpIHtcbiAgICByZXR1cm4gcmVbMV1cbiAgfSBlbHNlIGlmIChhbHRzcGFjZSAmJiBhbHRzcGFjZS5pbkNsaWVudCkge1xuICAgIHJldHVybiBTSC5lbnYuc2lkXG4gIH0gZWxzZSB7XG4gICAgbGV0IGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMDAwKVxuICAgIHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKCc/Z2FtZUlkPScgKyBpZClcbiAgfVxufVxuXG5mdW5jdGlvbiBwYXJzZUNTViAoc3RyKSB7XG4gIGlmICghc3RyKSByZXR1cm4gW11cbiAgZWxzZSByZXR1cm4gc3RyLnNwbGl0KCcsJylcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVRdWVzdGlvbiAodGV4dCwgdGV4dHVyZSA9IG51bGwpIHtcbiAgbGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnXG5cbi8vIHNldCB1cCBjYW52YXNcbiAgbGV0IGJtcFxuICBpZiAoIXRleHR1cmUpIHtcbiAgICBibXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKVxuICAgIGJtcC53aWR0aCA9IDUxMlxuICAgIGJtcC5oZWlnaHQgPSAyNTZcbiAgfSBlbHNlIHtcbiAgICBibXAgPSB0ZXh0dXJlLmltYWdlXG4gIH1cblxuICBsZXQgZyA9IGJtcC5nZXRDb250ZXh0KCcyZCcpXG4gIGcuY2xlYXJSZWN0KDAsIDAsIDUxMiwgMjU2KVxuICBnLnRleHRBbGlnbiA9ICdjZW50ZXInXG4gIGcuZmlsbFN0eWxlID0gJ3doaXRlJ1xuXG4vLyB3cml0ZSB0ZXh0XG4gIGcuZm9udCA9ICdib2xkIDUwcHggJyArIGZvbnRTdGFja1xuICBsZXQgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKVxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgZy5maWxsVGV4dChsaW5lc1tpXSwgMjU2LCA1MCArIDU1ICogaSlcbiAgfVxuXG4gIGlmICh0ZXh0dXJlKSB7XG4gICAgdGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWVcbiAgICByZXR1cm4gdGV4dHVyZVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZShibXApXG4gIH1cbn1cblxuZXhwb3J0IHsgZ2V0R2FtZUlkLCBwYXJzZUNTViwgZ2VuZXJhdGVRdWVzdGlvbiB9XG4iLCIndXNlIHN0cmljdCdcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJ1xuaW1wb3J0IEFNIGZyb20gJy4vYXNzZXRtYW5hZ2VyJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBOYW1lcGxhdGUgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuICBjb25zdHJ1Y3RvciAoc2VhdCkge1xuICAgIHN1cGVyKClcblxuICAgIHRoaXMuc2VhdCA9IHNlYXRcblxuLy8gYWRkIDNkIG1vZGVsXG4gICAgdGhpcy5tb2RlbCA9IEFNLmNhY2hlLm1vZGVscy5uYW1lcGxhdGUuY2hpbGRyZW5bMF0uY2xvbmUoKVxuICAgIHRoaXMubW9kZWwucm90YXRpb24uc2V0KC1NYXRoLlBJIC8gMiwgMCwgTWF0aC5QSSAvIDIpXG4gICAgdGhpcy5tb2RlbC5zY2FsZS5zZXRTY2FsYXIoMS4yNSlcbiAgICB0aGlzLmFkZCh0aGlzLm1vZGVsKVxuXG4vLyBnZW5lcmF0ZSBtYXRlcmlhbFxuICAgIHRoaXMuYm1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcbiAgICB0aGlzLmJtcC53aWR0aCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZVxuICAgIHRoaXMuYm1wLmhlaWdodCA9IE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAvIDJcbiAgICB0aGlzLm1vZGVsLm1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcbiAgICAgIG1hcDogbmV3IFRIUkVFLkNhbnZhc1RleHR1cmUodGhpcy5ibXApXG4gICAgfSlcblxuLy8gY3JlYXRlIGxpc3RlbmVyIHByb3hpZXNcbiAgICB0aGlzLl9ob3ZlckJlaGF2aW9yID0gbmV3IGFsdHNwYWNlLnV0aWxpdGllcy5iZWhhdmlvcnMuSG92ZXJDb2xvcih7XG4gICAgICBjb2xvcjogbmV3IFRIUkVFLkNvbG9yKDB4ZmZhOGE4KVxuICAgIH0pXG4gICAgdGhpcy5tb2RlbC5hZGRCZWhhdmlvcih0aGlzLl9ob3ZlckJlaGF2aW9yKVxuICAgIHRoaXMubW9kZWwuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCB0aGlzLmNsaWNrLmJpbmQodGhpcykpXG4gIH1cblxuICB1cGRhdGVUZXh0ICh0ZXh0KSB7XG4gICAgbGV0IGZvbnRTaXplID0gNyAvIDMyICogTmFtZXBsYXRlLnRleHR1cmVTaXplICogMC42NVxuXG4vLyBzZXQgdXAgY2FudmFzXG4gICAgbGV0IGcgPSB0aGlzLmJtcC5nZXRDb250ZXh0KCcyZCcpXG4gICAgbGV0IGZvbnRTdGFjayA9ICdcIkhlbHZldGljYSBOZXVlXCIsIEhlbHZldGljYSwgQXJpYWwsIFNhbnMtU2VyaWYnXG4gICAgZy5maWxsU3R5bGUgPSAnIzIyMidcbiAgICBnLmZpbGxSZWN0KDAsIDAsIE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSwgTmFtZXBsYXRlLnRleHR1cmVTaXplIC8gMilcbiAgICBnLmZvbnQgPSBgYm9sZCAke2ZvbnRTaXplfXB4ICR7Zm9udFN0YWNrfWBcbiAgICBnLnRleHRBbGlnbiA9ICdjZW50ZXInXG4gICAgZy5maWxsU3R5bGUgPSAnd2hpdGUnXG4gICAgZy5maWxsVGV4dCh0ZXh0LCBOYW1lcGxhdGUudGV4dHVyZVNpemUgLyAyLCAoMC40MiAtIDAuMTIpICogKE5hbWVwbGF0ZS50ZXh0dXJlU2l6ZSAvIDIpKVxuXG4gICAgdGhpcy5tb2RlbC5tYXRlcmlhbC5tYXAubmVlZHNVcGRhdGUgPSB0cnVlXG4gIH1cblxuICBjbGljayAoZSkge1xuICAgIGlmICghdGhpcy5zZWF0Lm93bmVyICYmIFNILmdhbWUuc3RhdGUgPT09ICdzZXR1cCcpIHtcbiAgICAgIHRoaXMucmVxdWVzdEpvaW4oKVxuICAgIH0gZWxzZSBpZiAodGhpcy5zZWF0Lm93bmVyID09PSBTSC5sb2NhbFVzZXIuaWQpIHtcbiAgICAgIHRoaXMucmVxdWVzdExlYXZlKClcbiAgICB9IGVsc2UgaWYgKHRoaXMuc2VhdC5vd25lciAmJiBTSC5nYW1lLnR1cm5PcmRlci5pbmNsdWRlcyhTSC5sb2NhbFVzZXIuaWQpKSB7XG4gICAgICB0aGlzLnJlcXVlc3RLaWNrKClcbiAgICB9XG4gIH1cblxuICByZXF1ZXN0Sm9pbiAoKSB7XG4gICAgU0guc29ja2V0LmVtaXQoJ2pvaW4nLCBPYmplY3QuYXNzaWduKHtzZWF0TnVtOiB0aGlzLnNlYXQuc2VhdE51bX0sIFNILmxvY2FsVXNlcikpXG4gIH1cblxuICByZXF1ZXN0TGVhdmUgKCkge1xuICAgIGxldCBzZWxmID0gdGhpc1xuICAgIGlmICghc2VsZi5xdWVzdGlvbikge1xuICAgICAgc2VsZi5xdWVzdGlvbiA9IHNlbGYuc2VhdC5iYWxsb3QuYXNrUXVlc3Rpb24oJ0FyZSB5b3Ugc3VyZSB5b3VcXG53YW50IHRvIGxlYXZlPycsICdsb2NhbF9sZWF2ZScpXG4gICAgICAgIC50aGVuKGNvbmZpcm0gPT4ge1xuICAgICAgICAgIGlmIChjb25maXJtKSB7XG4gICAgICAgICAgICBTSC5zb2NrZXQuZW1pdCgnbGVhdmUnLCBTSC5sb2NhbFVzZXIuaWQpXG4gICAgICAgICAgfVxuICAgICAgICAgIHNlbGYucXVlc3Rpb24gPSBudWxsXG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoKSA9PiB7IHNlbGYucXVlc3Rpb24gPSBudWxsIH0pXG4gICAgfVxuICB9XG5cbiAgcmVxdWVzdEtpY2sgKCkge1xuICAgIGxldCBzZWxmID0gdGhpc1xuICAgIGlmICghc2VsZi5xdWVzdGlvbikge1xuICAgICAgbGV0IHNlYXQgPSBTSC5zZWF0c1tTSC5wbGF5ZXJzW1NILmxvY2FsVXNlci5pZF0uc2VhdE51bV1cbiAgICAgIHNlbGYucXVlc3Rpb24gPSBzZWF0LmJhbGxvdC5hc2tRdWVzdGlvbihgQXJlIHlvdSBzdXJlIHlvdVxcbndhbnQgdG8gdHJ5IHRvIGtpY2tcXG4ke1NILnBsYXllcnNbc2VsZi5zZWF0Lm93bmVyXS5kaXNwbGF5TmFtZX1gLCAnbG9jYWxfa2ljaycpXG4gICAgICAgIC50aGVuKGNvbmZpcm0gPT4ge1xuICAgICAgICAgIGlmIChjb25maXJtKSB7XG4gICAgICAgICAgICBTSC5zb2NrZXQuZW1pdCgna2ljaycsIFNILmxvY2FsVXNlci5pZCwgc2VsZi5zZWF0Lm93bmVyKVxuICAgICAgICAgIH1cbiAgICAgICAgICBzZWxmLnF1ZXN0aW9uID0gbnVsbFxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKCkgPT4geyBzZWxmLnF1ZXN0aW9uID0gbnVsbCB9KVxuICAgIH1cbiAgfVxufVxuXG5OYW1lcGxhdGUudGV4dHVyZVNpemUgPSAyNTZcbiIsIid1c2Ugc3RyaWN0J1xuXG4vKlxuKiBIYXZlIHRvIGNvbXBsZXRlbHkgcmVpbXBsZW1lbnQgcHJvbWlzZXMgZnJvbSBzY3JhdGNoIGZvciB0aGlzIDooXG4qIFRoaXMgY2xhc3MgaXMgYSBwcm9taXNlIHRoYXQgdHJhY2tzIGRlcGVuZGVuY2llcywgYW5kIGV2YWx1YXRlc1xuKiB3aGVuIHRoZXkgYXJlIG1ldC4gSXQncyBhbHNvIGNhbmNlbGxhYmxlLCBjYWxsaW5nIGl0cyBkZXBlbmRlbnRzXG4qIGFzIHNvb24gYXMgaXRzIGRlcGVuZGVuY2llcyBhcmUgbWV0LlxuKi9cbmNsYXNzIENhc2NhZGluZ1Byb21pc2VcbntcbiAgY29uc3RydWN0b3IgKHByZXJlcVByb21pc2UsIGV4ZWNGbiwgY2xlYW51cEZuKSB7XG4gICAgICAgIC8vIHNldCB1cCBzdGF0ZSBpbmZvcm1hdGlvblxuICAgIHRoaXMuc3RhdGUgPSAncGVuZGluZydcbiAgICB0aGlzLnByZXJlcVByb21pc2UgPSBwcmVyZXFQcm9taXNlIHx8IFByb21pc2UucmVzb2x2ZSgpXG4gICAgdGhpcy5leGVjRm4gPSBleGVjRm5cbiAgICB0aGlzLmNsZWFudXBGbiA9IGNsZWFudXBGblxuXG4gICAgICAgIC8vIHRyYWNrIGNhbGxiYWNrc1xuICAgIHRoaXMuX3Jlc29sdmVDYWxsYmFja3MgPSBbXVxuICAgIHRoaXMuX3JlamVjdENhbGxiYWNrcyA9IFtdXG4gICAgdGhpcy5fZXhlY1R5cGUgPSBudWxsXG4gICAgdGhpcy5fZXhlY1Jlc3VsdCA9IFtdXG5cbiAgICAgICAgLy8gYmluZCBldmVudHNcbiAgICBsZXQgY2IgPSB0aGlzLl9wcmVyZXFTZXR0bGVkLmJpbmQodGhpcylcbiAgICB0aGlzLnByZXJlcVByb21pc2UudGhlbihjYiwgY2IpXG4gIH1cblxuICBfcHJlcmVxU2V0dGxlZCAoKSB7XG4gICAgZnVuY3Rpb24gc2V0dGxlICh0eXBlKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5fZXhlY1NldHRsZWQodHlwZSwgYXJncylcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5zdGF0ZSA9PT0gJ3BlbmRpbmcnKSB7XG4gICAgICB0aGlzLnN0YXRlID0gJ3J1bm5pbmcnXG4gICAgICB0aGlzLmV4ZWNGbihcbiAgICAgICAgICAgICAgICBzZXR0bGUoJ3Jlc29sdmUnKS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgIHNldHRsZSgncmVqZWN0JykuYmluZCh0aGlzKVxuICAgICAgICAgICAgKVxuICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0ZSA9PT0gJ2NhbmNlbGxlZCcpIHtcbiAgICAgIHRoaXMuc3RhdGUgPSAnc2V0dGxlZCdcbiAgICAgIHRoaXMuX3Jlc29sdmVDYWxsYmFja3MuZm9yRWFjaChjYiA9PiBjYigpKVxuICAgIH1cbiAgfVxuXG4gIF9leGVjU2V0dGxlZCAodHlwZSwgcmVzdWx0KSB7XG4gICAgaWYgKHRoaXMuc3RhdGUgPT09ICdydW5uaW5nJykge1xuICAgICAgdGhpcy5fZXhlY1R5cGUgPSB0eXBlXG4gICAgICB0aGlzLl9leGVjUmVzdWx0ID0gcmVzdWx0XG4gICAgICB0aGlzLnN0YXRlID0gJ2NsZWFuaW5ndXAnXG4gICAgICB0aGlzLmNsZWFudXBGbih0aGlzLl9jbGVhbnVwRG9uZS5iaW5kKHRoaXMpKVxuICAgIH1cbiAgfVxuXG4gIF9jbGVhbnVwRG9uZSAoKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUgPT09ICdjbGVhbmluZ3VwJykge1xuICAgICAgdGhpcy5zdGF0ZSA9ICdzZXR0bGVkJ1xuICAgICAgaWYgKHRoaXMuX2V4ZWNUeXBlID09PSAncmVzb2x2ZScpIHtcbiAgICAgICAgdGhpcy5fcmVzb2x2ZUNhbGxiYWNrcy5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICBjYiA9PiBjYiguLi50aGlzLl9leGVjUmVzdWx0KVxuICAgICAgICAgICAgICAgIClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3JlamVjdENhbGxiYWNrcy5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICBjYiA9PiBjYiguLi50aGlzLl9leGVjUmVzdWx0KVxuICAgICAgICAgICAgICAgIClcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjYW5jZWwgKCkge1xuICAgIGlmICh0aGlzLnN0YXRlID09PSAncnVubmluZycpIHtcbiAgICAgIHRoaXMuc3RhdGUgPSAnY2xlYW5pbmd1cCdcbiAgICAgIHRoaXMuY2xlYW51cEZuKHRoaXMuX2NsZWFudXBEb25lLmJpbmQodGhpcykpXG4gICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlID09PSAncGVuZGluZycpIHtcbiAgICAgIHRoaXMuc3RhdGUgPSAnY2FuY2VsbGVkJ1xuICAgIH1cbiAgfVxuXG4gIHRoZW4gKGRvbmVDYiwgZXJyQ2IpIHtcbiAgICBpZiAodGhpcy5zdGF0ZSA9PT0gJ3NldHRsZWQnKSB7XG4gICAgICBpZiAodGhpcy5fZXhlY1R5cGUgPT09ICdyZXNvbHZlJykge1xuICAgICAgICBkb25lQ2IoLi4udGhpcy5fZXhlY1Jlc3VsdClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVyckNiKC4uLnRoaXMuX2V4ZWNSZXN1bHQpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3Jlc29sdmVDYWxsYmFja3MucHVzaChkb25lQ2IpXG4gICAgICBpZiAoZXJyQ2IpIHtcbiAgICAgICAgdGhpcy5fcmVqZWN0Q2FsbGJhY2tzLnB1c2goZXJyQ2IpXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGNhdGNoIChjYikge1xuICAgIGlmICh0aGlzLnN0YXRlID09PSAnc2V0dGxlZCcpIHtcbiAgICAgIGlmICh0aGlzLl9leGVjVHlwZSA9PT0gJ3JlamVjdCcpIHsgY2IoLi4udGhpcy5fZXhlY1Jlc3VsdCkgfVxuICAgIH0gZWxzZSB7IHRoaXMuX3JlamVjdENhbGxiYWNrcy5wdXNoKGNiKSB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IENhc2NhZGluZ1Byb21pc2VcbiIsIid1c2Ugc3RyaWN0OydcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJ1xuaW1wb3J0IHsgSmFDYXJkLCBOZWluQ2FyZCB9IGZyb20gJy4vY2FyZCdcbmltcG9ydCB7IGdlbmVyYXRlUXVlc3Rpb24gfSBmcm9tICcuL3V0aWxzJ1xuaW1wb3J0IENhc2NhZGluZ1Byb21pc2UgZnJvbSAnLi9jYXNjYWRpbmdwcm9taXNlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBCYWxsb3QgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuICBjb25zdHJ1Y3RvciAoc2VhdCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnNlYXQgPSBzZWF0XG4gICAgdGhpcy5xdWVzdGlvbnMgPSB7fVxuICAgIHRoaXMubGFzdEFza2VkID0gbnVsbFxuXG4gICAgdGhpcy5feWVzQ2xpY2tIYW5kbGVyID0gbnVsbFxuICAgIHRoaXMuX25vQ2xpY2tIYW5kbGVyID0gbnVsbFxuXG4gICAgdGhpcy5qYUNhcmQgPSBuZXcgSmFDYXJkKClcbiAgICB0aGlzLm5laW5DYXJkID0gbmV3IE5laW5DYXJkKCk7XG4gICAgW3RoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkXS5mb3JFYWNoKGMgPT4ge1xuICAgICAgYy5wb3NpdGlvbi5zZXQoYyBpbnN0YW5jZW9mIEphQ2FyZCA/IC0wLjEgOiAwLjEsIC0wLjEsIDApXG4gICAgICBjLnJvdGF0aW9uLnNldCgwLjUsIE1hdGguUEksIDApXG4gICAgICBjLnNjYWxlLnNldFNjYWxhcigwLjE1KVxuICAgICAgYy5oaWRlKClcbiAgICB9KVxuICAgIHRoaXMuYWRkKHRoaXMuamFDYXJkLCB0aGlzLm5laW5DYXJkKVxuXG4gICAgbGV0IGdlbyA9IG5ldyBUSFJFRS5QbGFuZUJ1ZmZlckdlb21ldHJ5KDAuNCwgMC4yKVxuICAgIGxldCBtYXQgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe3RyYW5zcGFyZW50OiB0cnVlfSlcbiAgICB0aGlzLnF1ZXN0aW9uID0gbmV3IFRIUkVFLk1lc2goZ2VvLCBtYXQpXG4gICAgdGhpcy5xdWVzdGlvbi5wb3NpdGlvbi5zZXQoMCwgMC4wNSwgMClcbiAgICB0aGlzLnF1ZXN0aW9uLnJvdGF0aW9uLnNldCgwLCBNYXRoLlBJLCAwKVxuICAgIHRoaXMucXVlc3Rpb24udmlzaWJsZSA9IGZhbHNlXG4gICAgdGhpcy5hZGQodGhpcy5xdWVzdGlvbilcblxuICAgIFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV92b3Rlc0luUHJvZ3Jlc3MnLCB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKVxuICB9XG5cbiAgdXBkYXRlICh7ZGF0YToge2dhbWUsIHBsYXllcnMsIHZvdGVzfX0pIHtcbiAgICBsZXQgc2VsZiA9IHRoaXNcbiAgICBpZiAoIXNlbGYuc2VhdC5vd25lcikgcmV0dXJuXG5cbiAgICBsZXQgdmlwcyA9IGdhbWUudm90ZXNJblByb2dyZXNzXG4gICAgbGV0IHZvdGVzRmluaXNoZWQgPSAoU0guZ2FtZS52b3Rlc0luUHJvZ3Jlc3MgfHwgW10pLmZpbHRlcihcbiAgICAgICAgICAgIGUgPT4gIXZpcHMuaW5jbHVkZXMoZSlcbiAgICAgICAgKVxuXG4gICAgdmlwcy5mb3JFYWNoKHZJZCA9PiB7XG4gICAgICBsZXQgdnMgPSBbLi4udm90ZXNbdklkXS55ZXNWb3RlcnMsIC4uLnZvdGVzW3ZJZF0ubm9Wb3RlcnNdXG4gICAgICBsZXQgbnYgPSB2b3Rlc1t2SWRdLm5vblZvdGVyc1xuXG4gICAgICBsZXQgYXNrZWQgPSBzZWxmLnF1ZXN0aW9uc1t2SWRdXG4gICAgICBpZiAoIWFza2VkICYmICFudi5pbmNsdWRlcyhzZWxmLnNlYXQub3duZXIpICYmICF2cy5pbmNsdWRlcyhzZWxmLnNlYXQub3duZXIpKSB7XG4gICAgICAgIGxldCBxdWVzdGlvblRleHRcbiAgICAgICAgaWYgKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2VsZWN0Jykge1xuICAgICAgICAgIHF1ZXN0aW9uVGV4dCA9IHBsYXllcnNbdm90ZXNbdklkXS50YXJnZXQxXS5kaXNwbGF5TmFtZSArXG4gICAgICAgICAgICAgICAgICAgICAgICAnXFxuZm9yIHByZXNpZGVudCBhbmRcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllcnNbdm90ZXNbdklkXS50YXJnZXQyXS5kaXNwbGF5TmFtZSArXG4gICAgICAgICAgICAgICAgICAgICAgICAnXFxuZm9yIGNoYW5jZWxsb3I/J1xuICAgICAgICB9IGVsc2UgaWYgKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2pvaW4nKSB7XG4gICAgICAgICAgcXVlc3Rpb25UZXh0ID0gdm90ZXNbdklkXS5kYXRhICsgJ1xcbnRvIGpvaW4/J1xuICAgICAgICB9IGVsc2UgaWYgKHZvdGVzW3ZJZF0udHlwZSA9PT0gJ2tpY2snKSB7XG4gICAgICAgICAgcXVlc3Rpb25UZXh0ID0gJ1ZvdGUgdG8ga2lja1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgcGxheWVyc1t2b3Rlc1t2SWRdLnRhcmdldDFdLmRpc3BsYXlOYW1lICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc/J1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5hc2tRdWVzdGlvbihxdWVzdGlvblRleHQsIHZJZClcbiAgICAgICAgICAgICAgICAudGhlbihhbnN3ZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgU0guc29ja2V0LmVtaXQoJ3ZvdGUnLCB2SWQsIFNILmxvY2FsVXNlci5pZCwgYW5zd2VyKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+IGNvbnNvbGUubG9nKCdWb3RlIHNjcnViYmVkOicsIHZJZCkpXG4gICAgICB9IGVsc2UgaWYgKHZzLmluY2x1ZGVzKHNlbGYuc2VhdC5vd25lcikpIHtcbiAgICAgICAgaWYgKHNlbGYucXVlc3Rpb25zW3ZJZF0pIHsgc2VsZi5xdWVzdGlvbnNbdklkXS5jYW5jZWwoKSB9XG4gICAgICB9XG4gICAgfSlcblxuICAgIHZvdGVzRmluaXNoZWQuZm9yRWFjaCgodklkKSA9PiB7XG4gICAgICBpZiAoc2VsZi5xdWVzdGlvbnNbdklkXSkge1xuICAgICAgICBzZWxmLnF1ZXN0aW9uc1t2SWRdLmNhbmNlbCgpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGFza1F1ZXN0aW9uIChxVGV4dCwgaWQpIHtcbiAgICBsZXQgc2VsZiA9IHRoaXNcbiAgICBsZXQgbmV3USA9IG5ldyBDYXNjYWRpbmdQcm9taXNlKHNlbGYucXVlc3Rpb25zW3NlbGYubGFzdEFza2VkXSxcbiAgICAgICAgICAgIChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBpcyBzdGlsbCByZWxldmFudFxuICAgICAgICAgICAgICBsZXQgbGF0ZXN0Vm90ZXMgPSBTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzc1xuICAgICAgICAgICAgICBpZiAoIS9ebG9jYWwvLnRlc3QoaWQpICYmICFsYXRlc3RWb3Rlcy5pbmNsdWRlcyhpZCkpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoKVxuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBob29rIHVwIHEvYSBjYXJkc1xuICAgICAgICAgICAgICBzZWxmLnF1ZXN0aW9uLm1hdGVyaWFsLm1hcCA9IGdlbmVyYXRlUXVlc3Rpb24ocVRleHQsIHRoaXMucXVlc3Rpb24ubWF0ZXJpYWwubWFwKVxuICAgICAgICAgICAgICBzZWxmLmphQ2FyZC5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHJlc3BvbmQodHJ1ZSkpXG4gICAgICAgICAgICAgIHNlbGYubmVpbkNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCByZXNwb25kKGZhbHNlKSlcblxuICAgICAgICAgICAgICAgIC8vIHNob3cgdGhlIGJhbGxvdFxuICAgICAgICAgICAgICBzZWxmLnF1ZXN0aW9uLnZpc2libGUgPSB0cnVlXG4gICAgICAgICAgICAgIHNlbGYuamFDYXJkLnNob3coKVxuICAgICAgICAgICAgICBzZWxmLm5laW5DYXJkLnNob3coKVxuXG4gICAgICAgICAgICAgIGZ1bmN0aW9uIHJlc3BvbmQgKGFuc3dlcikge1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZXIgKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIG9ubHkgdGhlIG93bmVyIG9mIHRoZSBiYWxsb3QgaXMgYW5zd2VyaW5nXG4gICAgICAgICAgICAgICAgICBpZiAoc2VsZi5zZWF0Lm93bmVyICE9PSBTSC5sb2NhbFVzZXIuaWQpIHJldHVyblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIGFuc3dlciBzdGlsbCBtYXR0ZXJzXG4gICAgICAgICAgICAgICAgICBsZXQgbGF0ZXN0Vm90ZXMgPSBTSC5nYW1lLnZvdGVzSW5Qcm9ncmVzc1xuICAgICAgICAgICAgICAgICAgaWYgKCEvXmxvY2FsLy50ZXN0KGlkKSAmJiAhbGF0ZXN0Vm90ZXMuaW5jbHVkZXMoaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCgpXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcilcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoYW5zd2VyKSBzZWxmLl95ZXNDbGlja0hhbmRsZXIgPSBoYW5kbGVyXG4gICAgICAgICAgICAgICAgZWxzZSBzZWxmLl9ub0NsaWNrSGFuZGxlciA9IGhhbmRsZXJcbiAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlclxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKGRvbmUpID0+IHtcbiAgICAgICAgICAgICAgZGVsZXRlIHNlbGYucXVlc3Rpb25zW2lkXVxuICAgICAgICAgICAgICBpZiAoc2VsZi5sYXN0QXNrZWQgPT09IGlkKSB7IHNlbGYubGFzdEFza2VkID0gbnVsbCB9XG5cbiAgICAgICAgICAgICAgICAvLyBoaWRlIHRoZSBxdWVzdGlvblxuICAgICAgICAgICAgICBzZWxmLmphQ2FyZC5oaWRlKClcbiAgICAgICAgICAgICAgc2VsZi5uZWluQ2FyZC5oaWRlKClcbiAgICAgICAgICAgICAgc2VsZi5xdWVzdGlvbi52aXNpYmxlID0gZmFsc2VcbiAgICAgICAgICAgICAgc2VsZi5qYUNhcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCBzZWxmLl95ZXNDbGlja0hhbmRsZXIpXG4gICAgICAgICAgICAgIHNlbGYubmVpbkNhcmQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY3Vyc29ydXAnLCBzZWxmLl9ub0NsaWNrSGFuZGxlcilcbiAgICAgICAgICAgICAgZG9uZSgpXG4gICAgICAgICAgICB9XG4gICAgICAgIClcblxuICAgICAgICAvLyBhZGQgcXVlc3Rpb24gdG8gcXVldWUsIHJlbW92ZSB3aGVuIGRvbmVcbiAgICBzZWxmLnF1ZXN0aW9uc1tpZF0gPSBuZXdRXG4gICAgc2VsZi5sYXN0QXNrZWQgPSBpZFxuICAgIGxldCBzcGxpY2UgPSAoKSA9PiB7XG4gICAgICBkZWxldGUgc2VsZi5xdWVzdGlvbnNbaWRdXG4gICAgICBpZiAoc2VsZi5sYXN0QXNrZWQgPT09IGlkKSB7XG4gICAgICAgIHNlbGYubGFzdEFza2VkID0gbnVsbFxuICAgICAgfVxuICAgIH1cbiAgICBuZXdRLnRoZW4oc3BsaWNlLCBzcGxpY2UpXG5cbiAgICByZXR1cm4gbmV3UVxuICB9XG59XG4iLCIndXNlIHN0cmljdCdcblxuaW1wb3J0IFNIIGZyb20gJy4vc2VjcmV0aGl0bGVyJ1xuaW1wb3J0IE5hbWVwbGF0ZSBmcm9tICcuL25hbWVwbGF0ZSdcbmltcG9ydCBCYWxsb3QgZnJvbSAnLi9iYWxsb3QnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNlYXQgZXh0ZW5kcyBUSFJFRS5PYmplY3QzRFxue1xuICBjb25zdHJ1Y3RvciAoc2VhdE51bSkge1xuICAgIHN1cGVyKClcblxuICAgIHRoaXMuc2VhdE51bSA9IHNlYXROdW1cbiAgICB0aGlzLm93bmVyID0gMFxuXG4vLyBwb3NpdGlvbiBzZWF0XG4gICAgbGV0IHggPSAwLjY1XG4gICAgbGV0IHkgPSAwLjY1XG4gICAgbGV0IHogPSBudWxsXG4gICAgc3dpdGNoIChzZWF0TnVtKSB7XG4gICAgICBjYXNlIDA6IGNhc2UgMTogY2FzZSAyOlxuICAgICAgICB4ID0gLTAuODMzICsgMC44MzMgKiBzZWF0TnVtXG4gICAgICAgIHRoaXMucG9zaXRpb24uc2V0KHgsIHksIC0xLjA1KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAzOiBjYXNlIDQ6XG4gICAgICAgIHogPSAtMC40MzcgKyAwLjg3NCAqIChzZWF0TnVtIC0gMylcbiAgICAgICAgdGhpcy5wb3NpdGlvbi5zZXQoMS40MjUsIHksIHopXG4gICAgICAgIHRoaXMucm90YXRpb24uc2V0KDAsIC1NYXRoLlBJIC8gMiwgMClcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XG4gICAgICAgIHggPSAwLjgzMyAtIDAuODMzICogKHNlYXROdW0gLSA1KVxuICAgICAgICB0aGlzLnBvc2l0aW9uLnNldCh4LCB5LCAxLjA1KVxuICAgICAgICB0aGlzLnJvdGF0aW9uLnNldCgwLCAtTWF0aC5QSSwgMClcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgODogY2FzZSA5OlxuICAgICAgICB6ID0gMC40MzcgLSAwLjg3NCAqIChzZWF0TnVtIC0gOClcbiAgICAgICAgdGhpcy5wb3NpdGlvbi5zZXQoLTEuNDI1LCB5LCB6KVxuICAgICAgICB0aGlzLnJvdGF0aW9uLnNldCgwLCAtMS41ICogTWF0aC5QSSwgMClcbiAgICAgICAgYnJlYWtcbiAgICB9XG5cbiAgICB0aGlzLm5hbWVwbGF0ZSA9IG5ldyBOYW1lcGxhdGUodGhpcylcbiAgICB0aGlzLm5hbWVwbGF0ZS5wb3NpdGlvbi5zZXQoMCwgLTAuNjM1LCAwLjIyKVxuICAgIHRoaXMuYWRkKHRoaXMubmFtZXBsYXRlKVxuXG4gICAgdGhpcy5iYWxsb3QgPSBuZXcgQmFsbG90KHRoaXMpXG4gICAgdGhpcy5iYWxsb3QucG9zaXRpb24uc2V0KDAsIC0wLjMsIDAuMjUpXG4gICAgICAgIC8vIHRoaXMuYmFsbG90LnJvdGF0ZVkoMC4xKTtcbiAgICB0aGlzLmFkZCh0aGlzLmJhbGxvdClcblxuICAgIFNILmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZV90dXJuT3JkZXInLCB0aGlzLnVwZGF0ZU93bmVyc2hpcC5iaW5kKHRoaXMpKVxuICB9XG5cbiAgdXBkYXRlT3duZXJzaGlwICh7ZGF0YToge2dhbWUsIHBsYXllcnN9fSkge1xuICAgIGxldCBpZHMgPSBnYW1lLnR1cm5PcmRlclxuXG4vLyByZWdpc3RlciB0aGlzIHNlYXQgaWYgaXQncyBuZXdseSBjbGFpbWVkXG4gICAgaWYgKCF0aGlzLm93bmVyKSB7XG4vLyBjaGVjayBpZiBhIHBsYXllciBoYXMgam9pbmVkIGF0IHRoaXMgc2VhdFxuICAgICAgZm9yIChsZXQgaSBpbiBpZHMpIHtcbiAgICAgICAgaWYgKHBsYXllcnNbaWRzW2ldXS5zZWF0TnVtID09PSB0aGlzLnNlYXROdW0pIHtcbiAgICAgICAgICB0aGlzLm93bmVyID0gaWRzW2ldXG4gICAgICAgICAgdGhpcy5uYW1lcGxhdGUudXBkYXRlVGV4dChwbGF5ZXJzW2lkc1tpXV0uZGlzcGxheU5hbWUpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbi8vIHJlc2V0IHRoaXMgc2VhdCBpZiBpdCdzIG5ld2x5IHZhY2F0ZWRcbiAgICBpZiAoIWlkcy5pbmNsdWRlcyh0aGlzLm93bmVyKSkge1xuICAgICAgdGhpcy5vd25lciA9IDBcbiAgICAgIGlmIChnYW1lLnN0YXRlID09PSAnc2V0dXAnKSB7XG4gICAgICAgIHRoaXMubmFtZXBsYXRlLnVwZGF0ZVRleHQoJzxKb2luPicpXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghcGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQpIHtcbi8vIHVwZGF0ZSBkaXNjb25uZWN0IGNvbG9yc1xuICAgICAgdGhpcy5uYW1lcGxhdGUubW9kZWwubWF0ZXJpYWwuY29sb3Iuc2V0SGV4KDB4ODA4MDgwKVxuICAgIH0gZWxzZSBpZiAocGxheWVyc1t0aGlzLm93bmVyXS5jb25uZWN0ZWQpIHtcbiAgICAgIHRoaXMubmFtZXBsYXRlLm1vZGVsLm1hdGVyaWFsLmNvbG9yLnNldEhleCgweGZmZmZmZilcbiAgICB9XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0J1xuXG5pbXBvcnQgKiBhcyBDYXJkcyBmcm9tICcuL2NhcmQnXG5pbXBvcnQgeyBQcmVzaWRlbnRIYXQsIENoYW5jZWxsb3JIYXQgfSBmcm9tICcuL2hhdHMnXG5pbXBvcnQgR2FtZVRhYmxlIGZyb20gJy4vdGFibGUnXG5pbXBvcnQgQXNzZXRNYW5hZ2VyIGZyb20gJy4vYXNzZXRtYW5hZ2VyJ1xuaW1wb3J0IHsgZ2V0R2FtZUlkIH0gZnJvbSAnLi91dGlscydcbmltcG9ydCBOYW1lcGxhdGUgZnJvbSAnLi9uYW1lcGxhdGUnXG5pbXBvcnQgU2VhdCBmcm9tICcuL3NlYXQnXG5cbmNsYXNzIFNlY3JldEhpdGxlciBleHRlbmRzIFRIUkVFLk9iamVjdDNEXG57XG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5hc3NldHMgPSBBc3NldE1hbmFnZXIubWFuaWZlc3RcbiAgICB0aGlzLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJ1xuICAgIHRoaXMubmVlZHNTa2VsZXRvbiA9IHRydWVcblxuLy8gcG9seWZpbGwgZ2V0VXNlciBmdW5jdGlvblxuICAgIGlmICghYWx0c3BhY2UuaW5DbGllbnQpIHtcbiAgICAgIGFsdHNwYWNlLmdldFVzZXIgPSAoKSA9PiB7XG4gICAgICAgIGxldCByZSA9IC9bPyZddXNlcklkPShcXGQrKS8uZXhlYyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKVxuICAgICAgICBsZXQgaWQgPSBudWxsXG4gICAgICAgIGlmIChyZSkge1xuICAgICAgICAgIGlkID0gSlNPTi5wYXJzZShyZVsxXSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwKVxuICAgICAgICB9XG5cbiAgICAgICAgYWx0c3BhY2UuX2xvY2FsVXNlciA9IHtcbiAgICAgICAgICB1c2VySWQ6IGlkLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnR3Vlc3QnICsgaWQsXG4gICAgICAgICAgaXNNb2RlcmF0b3I6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJ01hc3F1ZXJhZGluZyBhcycsIGFsdHNwYWNlLl9sb2NhbFVzZXIpXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoYWx0c3BhY2UuX2xvY2FsVXNlcilcbiAgICAgIH1cbiAgICB9XG5cbi8vIGdldCBsb2NhbCB1c2VyXG4gICAgYWx0c3BhY2UuZ2V0VXNlcigpLnRoZW4odXNlciA9PiB7XG4gICAgICB0aGlzLmxvY2FsVXNlciA9IHtcbiAgICAgICAgaWQ6IHVzZXIudXNlcklkLFxuICAgICAgICBkaXNwbGF5TmFtZTogdXNlci5kaXNwbGF5TmFtZSxcbiAgICAgICAgaXNNb2RlcmF0b3I6IHVzZXIuaXNNb2RlcmF0b3JcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy5nYW1lID0ge31cbiAgICB0aGlzLnBsYXllcnMgPSB7fVxuICAgIHRoaXMudm90ZXMgPSB7fVxuICB9XG5cbiAgaW5pdGlhbGl6ZSAoZW52LCByb290LCBhc3NldHMpIHtcbi8vIHNoYXJlIHRoZSBkaW9yYW1hIGluZm9cbiAgICBBc3NldE1hbmFnZXIuY2FjaGUgPSBhc3NldHNcbiAgICB0aGlzLmVudiA9IGVudlxuXG4vLyBjb25uZWN0IHRvIHNlcnZlclxuICAgIHRoaXMuc29ja2V0ID0gaW8uY29ubmVjdCgnLycsIHtxdWVyeTogJ2dhbWVJZD0nICsgZ2V0R2FtZUlkKCl9KVxuXG4vLyBjcmVhdGUgdGhlIHRhYmxlXG4gICAgdGhpcy50YWJsZSA9IG5ldyBHYW1lVGFibGUoKVxuICAgIHRoaXMuYWRkKHRoaXMudGFibGUpXG5cbiAgICB0aGlzLnJlc2V0QnV0dG9uID0gbmV3IFRIUkVFLk1lc2goXG4gICAgICBuZXcgVEhSRUUuQm94R2VvbWV0cnkoMC4yNSwgMC4yNSwgMC4yNSksXG4gICAgICBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogYXNzZXRzLnRleHR1cmVzLnJlc2V0fSlcbiAgICApXG4gICAgdGhpcy5yZXNldEJ1dHRvbi5wb3NpdGlvbi5zZXQoMCwgLTAuMTgsIDApXG4gICAgdGhpcy5yZXNldEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjdXJzb3J1cCcsIHRoaXMucmVzZXQuYmluZCh0aGlzKSlcbiAgICB0aGlzLnRhYmxlLmFkZCh0aGlzLnJlc2V0QnV0dG9uKVxuXG4vLyBjcmVhdGUgaWRsZSBkaXNwbGF5XG4gICAgdGhpcy5pZGxlUm9vdCA9IG5ldyBUSFJFRS5PYmplY3QzRCgpXG4gICAgdGhpcy5pZGxlUm9vdC5wb3NpdGlvbi5zZXQoMCwgMS44NSwgMClcbiAgICB0aGlzLmlkbGVSb290LmFkZEJlaGF2aW9yKG5ldyBhbHRzcGFjZS51dGlsaXRpZXMuYmVoYXZpb3JzLlNwaW4oe3NwZWVkOiAwLjAwMDJ9KSlcbiAgICB0aGlzLmFkZCh0aGlzLmlkbGVSb290KVxuXG4vLyBjcmVhdGUgaWRsZSBzbGlkZXNob3dcbiAgICBsZXQgY3JlZGl0cyA9IG5ldyBDYXJkcy5DcmVkaXRzQ2FyZCgpXG4gICAgdGhpcy5pZGxlUm9vdC5hZGQoY3JlZGl0cylcblxuLy8gY3JlYXRlIGhhdHNcbiAgICB0aGlzLnByZXNpZGVudEhhdCA9IG5ldyBQcmVzaWRlbnRIYXQoKVxuICAgIHRoaXMuY2hhbmNlbGxvckhhdCA9IG5ldyBDaGFuY2VsbG9ySGF0KClcblxuLy8gY3JlYXRlIHBvc2l0aW9uc1xuICAgIHRoaXMuc2VhdHMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTA7IGkrKykge1xuICAgICAgdGhpcy5zZWF0cy5wdXNoKG5ldyBTZWF0KGkpKVxuICAgIH1cblxuICAgIHRoaXMudGFibGUuYWRkKC4uLnRoaXMuc2VhdHMpXG5cbi8vIGFkZCBhdmF0YXIgZm9yIHNjYWxlXG4gICAgYXNzZXRzLm1vZGVscy5kdW1teS5wb3NpdGlvbi5zZXQoMCwgMCwgMS4xKVxuICAgIGFzc2V0cy5tb2RlbHMuZHVtbXkucm90YXRlWihNYXRoLlBJKVxuICAgIHRoaXMuYWRkKGFzc2V0cy5tb2RlbHMuZHVtbXkpXG5cbiAgICB0aGlzLnNvY2tldC5vbigndXBkYXRlJywgdGhpcy51cGRhdGVGcm9tU2VydmVyLmJpbmQodGhpcykpXG4gIH1cblxuICB1cGRhdGVGcm9tU2VydmVyIChnZCwgcGQsIHZkKSB7XG4gICAgY29uc29sZS5sb2coZ2QsIHBkLCB2ZClcblxuICAgIGxldCBnYW1lID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nYW1lLCBnZClcbiAgICBsZXQgcGxheWVycyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMucGxheWVycywgcGQpXG4gICAgbGV0IHZvdGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy52b3RlcywgdmQpXG5cbiAgICBmb3IgKGxldCBmaWVsZCBpbiBnZCkge1xuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KHtcbiAgICAgICAgdHlwZTogJ3VwZGF0ZV8nICsgZmllbGQsXG4gICAgICAgIGJ1YmJsZXM6IGZhbHNlLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgZ2FtZTogZ2FtZSxcbiAgICAgICAgICBwbGF5ZXJzOiBwbGF5ZXJzLFxuICAgICAgICAgIHZvdGVzOiB2b3Rlc1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cblxuICAgIGlmIChwbGF5ZXJzW3RoaXMubG9jYWxVc2VyLmlkXSAmJiAhcGxheWVyc1t0aGlzLmxvY2FsVXNlci5pZF0uY29ubmVjdGVkKSB7XG4gICAgICB0aGlzLnNvY2tldC5lbWl0KCdjaGVja0luJywgdGhpcy5sb2NhbFVzZXIpXG4gICAgfVxuXG4gICAgdGhpcy5nYW1lID0gZ2FtZVxuICAgIHRoaXMucGxheWVycyA9IHBsYXllcnNcbiAgICB0aGlzLnZvdGVzID0gdm90ZXNcbiAgfVxuXG4gIHJlc2V0IChlKSB7XG4gICAgaWYgKHRoaXMubG9jYWxVc2VyLmlzTW9kZXJhdG9yKSB7XG4gICAgICBjb25zb2xlLmxvZygncmVxdWVzdGluZyByZXNldCcpXG4gICAgICB0aGlzLnNvY2tldC5lbWl0KCdyZXNldCcpXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBTZWNyZXRIaXRsZXIoKVxuIl0sIm5hbWVzIjpbInRoaXMiLCJzdXBlciIsImxldCIsIkFzc2V0TWFuYWdlciIsIkNhcmRzLkNyZWRpdHNDYXJkIl0sIm1hcHBpbmdzIjoiOzs7QUFFQSxTQUFlO0VBQ2IsUUFBUSxFQUFFO0lBQ1IsTUFBTSxFQUFFO01BQ04sS0FBSyxFQUFFLHdCQUF3QjtNQUMvQixTQUFTLEVBQUUsNEJBQTRCO01BQ3ZDLE1BQU0sRUFBRSwwQkFBMEI7TUFDbEMsUUFBUSxFQUFFLDZCQUE2QjtNQUN2QyxLQUFLLEVBQUUseUJBQXlCO0tBQ2pDO0lBQ0QsUUFBUSxFQUFFO01BQ1IsV0FBVyxFQUFFLGtDQUFrQztNQUMvQyxTQUFTLEVBQUUsbUNBQW1DO01BQzlDLFdBQVcsRUFBRSxrQ0FBa0M7TUFDL0MsS0FBSyxFQUFFLHNCQUFzQjtNQUM3QixLQUFLLEVBQUUscUJBQXFCO0tBQzdCO0dBQ0Y7RUFDRCxLQUFLLEVBQUUsRUFBRTtDQUNWLENBQUE7O0FDbEJELElBQU0sU0FBUyxHQUNmLGtCQUNhLEVBQUUsRUFBRSxFQUFFO0VBQ2pCLElBQU0sQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFBOztFQUVkLElBQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFBOztFQUVyQixJQUFNLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtFQUNyQixJQUFNLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTtFQUNwQixJQUFNLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQTtFQUNyQixJQUFNLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQTtFQUN4QixJQUFNLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQTs7RUFFekIsSUFBTSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUE7RUFDMUIsSUFBTSxDQUFDLGVBQWUs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
