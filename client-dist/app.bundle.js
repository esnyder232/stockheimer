/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/ 		var executeModules = data[2];
/******/
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 		// add entry modules from loaded chunk to deferred list
/******/ 		deferredModules.push.apply(deferredModules, executeModules || []);
/******/
/******/ 		// run deferred modules when all chunks ready
/******/ 		return checkDeferredModules();
/******/ 	};
/******/ 	function checkDeferredModules() {
/******/ 		var result;
/******/ 		for(var i = 0; i < deferredModules.length; i++) {
/******/ 			var deferredModule = deferredModules[i];
/******/ 			var fulfilled = true;
/******/ 			for(var j = 1; j < deferredModule.length; j++) {
/******/ 				var depId = deferredModule[j];
/******/ 				if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 			}
/******/ 			if(fulfilled) {
/******/ 				deferredModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 			}
/******/ 		}
/******/
/******/ 		return result;
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// Promise = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		"app": 0
/******/ 	};
/******/
/******/ 	var deferredModules = [];
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// add entry module to deferred list
/******/ 	deferredModules.push(["./client/client.js","vendors"]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ "./client/box/box.js":
/*!***************************!*\
  !*** ./client/box/box.js ***!
  \***************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Box; });
/* harmony import */ var _global_funcs_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../global-funcs.js */ "./client/global-funcs.js");


class Box {
	constructor(scene) {
		this.scene = scene;
		this.globalfuncs = new _global_funcs_js__WEBPACK_IMPORTED_MODULE_0__["default"]();
		this.group = null;
	}

	create()
	{
		//create animations
		this.globalfuncs.createSceneAnimsFromAseprite(this.scene, "box", "box-json");
		this.group = this.scene.physics.add.staticGroup();
		this.scene.physics.add.collider(this.group, this.scene.layer1);
	}

	spawn(x, y)
	{		
		var a = this.group.create(x, y, "box");
		a.setScale(0.5, 0.5);
		console.log(a);

	}

}

/***/ }),

/***/ "./client/client.js":
/*!**************************!*\
  !*** ./client/client.js ***!
  \**************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Client; });
/* harmony import */ var phaser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! phaser */ "./node_modules/phaser/dist/phaser.js");
/* harmony import */ var phaser__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(phaser__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _scenes_game_manager_scene_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./scenes/game-manager-scene.js */ "./client/scenes/game-manager-scene.js");



class Client {
	constructor() {
		this.game = {};
		this.config = {};

		this.config = {
			type: phaser__WEBPACK_IMPORTED_MODULE_0___default.a.AUTO,
			backgroundColor: '#333333',
			width: 256,
			height:256,
			parent: 'game-div',
			pixelArt: true,
			physics: {
				default: 'arcade',				
				arcade: {
					debug: true,
					debugShowBody: true,
					debugShowStaticBody: true,
					debugShowVelocity: true,
					gravity: {
						y: 300
					}
				}
			},
			scale: {
				zoom:3
			}
		}

		this.game = new phaser__WEBPACK_IMPORTED_MODULE_0___default.a.Game(this.config);
		this.game.scene.add('game-manager-scene', _scenes_game_manager_scene_js__WEBPACK_IMPORTED_MODULE_1__["default"], true);
	}
}





//feels like a hacky way to start...oh well. Its simple atleast.
var app = new Client();




/***/ }),

/***/ "./client/global-funcs.js":
/*!********************************!*\
  !*** ./client/global-funcs.js ***!
  \********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return GlobalFuncs; });
var tempGlobalMessages = [];

class GlobalFuncs {
	constructor() {
		this.tempGlobalMessages = tempGlobalMessages;
	}

	
	//Helper function to register events to emitters in phaser.
	//scene - the scene
	//eventMapping - array of mappings for events
	// Each mapping needs the following format:
	// eventMapping = [
	// {
	//	 	target: this.load,
	//	 	event: 'progress',
	//	 	delegate: this.loadProgress
	// },
	// {}...
	// ]
	// 		target - the event emitter in phaser
	//		event - the name of the event
	//		delegate - the delegate to call

	registerEvents(scene, eventMapping) {
		for(var i = 0; i < eventMapping.length; i++)
		{
			eventMapping[i].target.on(eventMapping[i].event, eventMapping[i].delegate)
		}
	}

	//Helper function to unregister events from emitters in phaser. This is the opposite of GlobalFuncs.registerEvents().
	//This is to be called in the "shutdown" event.
	unregisterEvents(scene, eventMapping) {
		for(var i = 0; i < eventMapping.length; i++)
		{
			eventMapping[i].target.off(eventMapping[i].event, eventMapping[i].delegate)
		}
	}

	createSceneAnimsFromAseprite(scene, asepriteSpritesheetKey, asepriteJsonKey) {
		//find the aseprite json file to parse from
		var json = scene.cache.json.get(asepriteJsonKey);
		var anims = scene.anims;

		//parse through the frameTags for the animations and create an animation for each one
		for(var i = 0; i < json.meta.frameTags.length; i++)
		{


			var f = json.meta.frameTags[i];
			var key = asepriteSpritesheetKey + "-" + f.name;
			var frames = anims.generateFrameNumbers(asepriteSpritesheetKey, {start: f.from, end: f.to});
			var animObject = {
				key: key,
				frames: frames,
				frameRate: 24,
				repeat: -1
			}

			//console.log(animObject);
			anims.create(animObject);
		}
	}

	//9/10/2020 - This is to fix the arcade sprite when the sprite is created in the update function instead of the create function.
	//This basically realligns the sprite body's hitbox so it doesn't get out of sync with the sprite game object.
	//You only need to call this once, and only after you create the sprite with this.scene.add.sprite(...);
	//This also works with images. 
	//If you need to set the size, scale, and offset of the body on creation, do it after you create the sprite and THEN call this function.
	/*Ex:
		var s = this.scene.physics.add.sprite(50, 50, "spritesheethere", 0);

		s.body.setOffset(5, 5);
		s.setScale(2, 1);
		s.body.setSize(10, 19, false);

		arcadeSpriteFix(s);
	*/
	arcadeSpriteFix(arcadeSprite) {
		var newx = arcadeSprite.x - (0.5 * arcadeSprite.displayWidth) + (arcadeSprite.scaleX * arcadeSprite.body.offset.x);
		var newy = arcadeSprite.y - (0.5 * arcadeSprite.displayHeight) + (arcadeSprite.scaleY * arcadeSprite.body.offset.y);

		arcadeSprite.body.position.x = newx;
		arcadeSprite.body.position.y = newy;
		arcadeSprite.body.prev.x = newx;
		arcadeSprite.body.prev.y = newy;
		arcadeSprite.body.prevFrame.x = newx;
		arcadeSprite.body.prevFrame.y = newy;
		arcadeSprite.body.transform.scaleX = arcadeSprite.scaleX;
		arcadeSprite.body.transform.scaleY = arcadeSprite.scaleY;
		arcadeSprite.body.width = Math.floor(arcadeSprite.body.width * arcadeSprite.scaleX);
		arcadeSprite.body.height = Math.floor(arcadeSprite.body.height * arcadeSprite.scaleY);
	}

}

/***/ }),

/***/ "./client/player/player-air-all-state.js":
/*!***********************************************!*\
  !*** ./client/player/player-air-all-state.js ***!
  \***********************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return PlayerAirAllState; });
/* harmony import */ var _player_air_base_state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./player-air-base-state.js */ "./client/player/player-air-base-state.js");


class PlayerAirAllState extends _player_air_base_state_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
	constructor(scene, player) {
		super(scene, player);
	}

	enter(timeElapsed, dt) {
		this.calculateAnimation();
		this.player.sprite.anims.setTimeScale(8/24);
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {

		if(this.player.playerController.right.state)
		{
			this.player.sprite.flipX = false;
			this.player.applyWalkForce(1);
		}
		else if(this.player.playerController.left.state)
		{
			this.player.sprite.flipX = true;
			this.player.applyWalkForce(-1);
		}
		else
		{
			this.player.sprite.setVelocityX(0);
		}

		this.calculateAnimation();
		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		super.exit(timeElapsed, dt);
	}

	calculateAnimation() {
		//rising
		if(this.player.sprite.body.velocity.y <= 0)
		{
			this.player.sprite.anims.play("slime-rising");
		}
		else{
			this.player.sprite.anims.play("slime-falling");
		}
	}
}

/***/ }),

/***/ "./client/player/player-air-base-state.js":
/*!************************************************!*\
  !*** ./client/player/player-air-base-state.js ***!
  \************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return PlayerAirBaseState; });
/* harmony import */ var _player_base_state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./player-base-state.js */ "./client/player/player-base-state.js");
/* harmony import */ var _player_ground_idle_state_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./player-ground-idle-state.js */ "./client/player/player-ground-idle-state.js");



class PlayerAirBaseState extends _player_base_state_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
	constructor(scene, player) {
		super(scene, player);
	}

	enter(timeElapsed, dt) {
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {
		//transfer to on ground state
		if(this.player.sprite.body.blocked.down)
		{
			this.player.nextState = new _player_ground_idle_state_js__WEBPACK_IMPORTED_MODULE_1__["default"](this.scene, this.player);
		}

		//add jump force
		if(this.player.playerController.jump.state && !this.player.playerController.jump.prevState)
		{
			this.player.applyJumpForce();
		}
		
		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		super.exit(timeElapsed, dt);
	}
}

/***/ }),

/***/ "./client/player/player-base-state.js":
/*!********************************************!*\
  !*** ./client/player/player-base-state.js ***!
  \********************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return PlayerBaseState; });
/* harmony import */ var _global_funcs_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../global-funcs.js */ "./client/global-funcs.js");


class PlayerBaseState {
	constructor(scene, player) {
		this.scene = scene;
		this.player = player;
		this.globalfuncs = new _global_funcs_js__WEBPACK_IMPORTED_MODULE_0__["default"]();
	}

	enter(timeElapsed, dt) {}
	update(timeElapsed, dt) {}
	exit(timeElapsed, dt) {
		this.player.sprite.anims.setTimeScale(24);
	}

}

/***/ }),

/***/ "./client/player/player-damaged-base-state.js":
/*!****************************************************!*\
  !*** ./client/player/player-damaged-base-state.js ***!
  \****************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return PlayerDamagedBaseState; });
/* harmony import */ var _player_base_state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./player-base-state.js */ "./client/player/player-base-state.js");
/* harmony import */ var _player_ground_idle_state_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./player-ground-idle-state.js */ "./client/player/player-ground-idle-state.js");



class PlayerDamagedBaseState extends _player_base_state_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
	
	constructor(scene, player) {
		super(scene, player);
		this.timer = 1000; //ms
	}

	enter(timeElapsed, dt) {
		this.player.sprite.setTint(0xff0000);

		//play damaged animation here
		
		//temporary. Just judging direction based on sprite direction.
		var xDir = -1;
		if(this.player.sprite.flipX)
		{
			xDir = 1;
		}

		this.player.applyDamageForce(xDir);
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {
		super.update(timeElapsed, dt);
		this.timer -= dt;

		if(this.timer <= 0)
		{
			this.player.nextState = new _player_ground_idle_state_js__WEBPACK_IMPORTED_MODULE_1__["default"](this.scene, this.player);
		}
	}

	exit(timeElapsed, dt) {
		this.player.sprite.clearTint();
		super.exit(timeElapsed, dt);
	}
	
}

/***/ }),

/***/ "./client/player/player-ground-attack-strong-state.js":
/*!************************************************************!*\
  !*** ./client/player/player-ground-attack-strong-state.js ***!
  \************************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return PlayerGroundAttackStrongState; });
/* harmony import */ var _player_ground_base_state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./player-ground-base-state.js */ "./client/player/player-ground-base-state.js");
/* harmony import */ var _player_ground_walk_state_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./player-ground-walk-state.js */ "./client/player/player-ground-walk-state.js");
/* harmony import */ var _player_ground_idle_state_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./player-ground-idle-state.js */ "./client/player/player-ground-idle-state.js");




//this state is to drive the events AND animation with dt from update
class PlayerGroundAttackStrongState extends _player_ground_base_state_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
	constructor(scene, player) {
		super(scene, player);
		this.sumTime = 0;
		this.actionFrameStart = 2;  //frame num of animation for start of action
		this.actionFrameEnd = 3;	//frame num of animation for end of action
		this.totalDuration = 500; //total duration of the animation in ms
		this.totalFrames = 1; //total number of frames in animation
		
		this.msPerFrame = 1; //calculated duration of each frame in ms
		this.currentAnimFrame = 0; //current frame of the attack

		this.swingState = 0; //0 - swing up. 1 - action. 2 - swing down
		this.animationDone = false;

		this.hitboxWidth = 18 * this.player.sprite.scaleX;
		this.hitboxHeight = 26 * this.player.sprite.scaleY;
		this.hitboxOffsetX = 8 * this.player.sprite.scaleX;
		this.hitboxOffsetY = -2 * this.player.sprite.scaleY;
	}

	enter(timeElapsed, dt) {
		this.player.sprite.anims.play("slime-attackStrong");
		
		this.player.sprite.anims.pause(this.player.sprite.anims.currentAnim.frames[this.currentAnimFrame]);
		this.totalFrames = this.player.sprite.anims.getTotalFrames();
		this.msPerFrame = this.totalDuration/this.totalFrames;
		
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {
		this.sumTime += dt;
		if(this.sumTime >= this.msPerFrame)
		{
			var temp = Math.floor(this.sumTime / this.msPerFrame);
			this.sumTime %= this.msPerFrame;
			this.currentAnimFrame += temp;
			if(this.currentAnimFrame >= this.totalFrames && this.swingState == 2)
			{
				this.currentAnimFrame = this.totalFrames - 1;
				this.animationDone = true;
			}
			else if (this.currentAnimFrame >= this.totalFrames)
			{
				this.currentAnimFrame = this.totalFrames - 1;
			}
			this.player.sprite.anims.pause(this.player.sprite.anims.currentAnim.frames[this.currentAnimFrame]);
		}

		switch(this.swingState)
		{
			case 0:
				//enter action
				if(this.currentAnimFrame >= this.actionFrameStart)
				{
					this.currentAnimFrame = this.actionFrameStart;
					this.player.sprite.anims.pause(this.player.sprite.anims.currentAnim.frames[this.currentAnimFrame]);
					this.swingState = 1;

					//create hitbox here
					this.createHitbox();
				}
				break;
			case 1:
				//make the hitbox follow the player
				this.hitbox.x = this.player.sprite.x;
				this.hitbox.y = this.player.sprite.y;
				
				//exit action
				if(this.currentAnimFrame >= this.actionFrameEnd)
				{
					this.currentAnimFrame = this.actionFrameEnd;
					this.player.sprite.anims.pause(this.player.sprite.anims.currentAnim.frames[this.currentAnimFrame]);
					this.swingState = 2;

					//delete hitbox here
					this.deleteHitbox();
				}
				break;
			case 2:
				if(this.animationDone)
				{
					this.player.sprite.anims.stop();
					this.player.nextState = new _player_ground_idle_state_js__WEBPACK_IMPORTED_MODULE_2__["default"](this.scene, this.player)
				}
				break;
		}

		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		this.player.sprite.anims.stop();
		this.deleteHitbox();
		super.exit(timeElapsed, dt);
	}

	createHitbox() {
		this.hitbox = this.scene.physics.add.image(this.player.sprite.x, this.player.sprite.y);
		this.hitbox.body.allowGravity = false;
		this.hitbox.body.setSize(this.hitboxWidth, this.hitboxHeight, true);
		this.hitbox.body.setOffset(this.hitbox.body.offset.x + this.hitboxOffsetX, this.hitbox.body.offset.y + this.hitboxOffsetY);

		this.globalfuncs.arcadeSpriteFix(this.hitbox);
	}

	deleteHitbox() {
		if(this.hitbox)
		{
			this.hitbox.destroy();
			this.hitbox = null;
		}
	}
}

/***/ }),

/***/ "./client/player/player-ground-attack-weak-state.js":
/*!**********************************************************!*\
  !*** ./client/player/player-ground-attack-weak-state.js ***!
  \**********************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return PlayerGroundAttackWeakState; });
/* harmony import */ var _player_ground_base_state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./player-ground-base-state.js */ "./client/player/player-ground-base-state.js");
/* harmony import */ var _player_ground_idle_state_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./player-ground-idle-state.js */ "./client/player/player-ground-idle-state.js");




//this state is to drive the events AND animation with dt from update
class PlayerGroundAttackWeakState extends _player_ground_base_state_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
	constructor(scene, player) {
		super(scene, player);
		this.sumTime = 0;
		this.actionFrameStart = 1;  //frame num of animation for start of action
		this.actionFrameEnd = 3;	//frame num of animation for end of action
		this.totalDuration = 500; //total duration of the animation in ms
		this.totalFrames = 1; //total number of frames in animation
		
		this.msPerFrame = 1; //calculated duration of each frame in ms
		this.currentAnimFrame = 0; //current frame of the attack

		this.swingState = 0; //0 - swing up. 1 - action. 2 - swing down
		this.animationDone = false;

		this.hitboxWidth = 12 * this.player.sprite.scaleX;
		this.hitboxHeight = 14 * this.player.sprite.scaleY;
		this.hitboxOffsetX = 0 * this.player.sprite.scaleX;
		this.hitboxOffsetY = -12 * this.player.sprite.scaleY;
	}

	enter(timeElapsed, dt) {
		this.player.sprite.anims.play("slime-attackWeak");
		
		this.player.sprite.anims.pause(this.player.sprite.anims.currentAnim.frames[this.currentAnimFrame]);
		this.totalFrames = this.player.sprite.anims.getTotalFrames();
		this.msPerFrame = this.totalDuration/this.totalFrames;

		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {
		this.sumTime += dt;
		if(this.sumTime >= this.msPerFrame)
		{
			var temp = Math.floor(this.sumTime / this.msPerFrame);
			this.sumTime %= this.msPerFrame;
			this.currentAnimFrame += temp;
			if(this.currentAnimFrame >= this.totalFrames && this.swingState == 2)
			{
				this.currentAnimFrame = this.totalFrames - 1;
				this.animationDone = true;
			}
			else if (this.currentAnimFrame >= this.totalFrames)
			{
				this.currentAnimFrame = this.totalFrames - 1;
			}
			this.player.sprite.anims.pause(this.player.sprite.anims.currentAnim.frames[this.currentAnimFrame]);
		}

		switch(this.swingState)
		{
			case 0:
				//enter action
				if(this.currentAnimFrame >= this.actionFrameStart)
				{
					this.currentAnimFrame = this.actionFrameStart;
					this.player.sprite.anims.pause(this.player.sprite.anims.currentAnim.frames[this.currentAnimFrame]);
					this.swingState = 1;

					//create hitbox here
					this.createHitbox();
				}
				break;
			case 1:
				//make the hitbox follow the player
				this.hitbox.x = this.player.sprite.x;
				this.hitbox.y = this.player.sprite.y;

				//exit action
				if(this.currentAnimFrame >= this.actionFrameEnd)
				{
					this.currentAnimFrame = this.actionFrameEnd;
					this.player.sprite.anims.pause(this.player.sprite.anims.currentAnim.frames[this.currentAnimFrame]);
					this.swingState = 2;

					//delete hitbox here
					this.deleteHitbox();
				}
				break;
			case 2:
				if(this.animationDone)
				{
					this.player.nextState = new _player_ground_idle_state_js__WEBPACK_IMPORTED_MODULE_1__["default"](this.scene, this.player)
				}
				break;
		}

		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		this.player.sprite.anims.stop();
		this.deleteHitbox();
		super.exit(timeElapsed, dt);
	}

	createHitbox() {
		this.hitbox = this.scene.physics.add.image(this.player.sprite.x, this.player.sprite.y);
		this.hitbox.body.allowGravity = false;
		this.hitbox.body.setSize(this.hitboxWidth, this.hitboxHeight, true);
		this.hitbox.body.setOffset(this.hitbox.body.offset.x + this.hitboxOffsetX, this.hitbox.body.offset.y + this.hitboxOffsetY);

		this.globalfuncs.arcadeSpriteFix(this.hitbox);

	}

	deleteHitbox() {
		if(this.hitbox)
		{
			this.hitbox.destroy();
			this.hitbox = null;
		}
	}
}

/***/ }),

/***/ "./client/player/player-ground-base-state.js":
/*!***************************************************!*\
  !*** ./client/player/player-ground-base-state.js ***!
  \***************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return PlayerGroundBaseState; });
/* harmony import */ var _player_base_state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./player-base-state.js */ "./client/player/player-base-state.js");
/* harmony import */ var _player_air_all_state_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./player-air-all-state.js */ "./client/player/player-air-all-state.js");



class PlayerGroundBaseState extends _player_base_state_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
	constructor(scene, player) {
		super(scene, player);
	}

	enter(timeElapsed, dt) {
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {
		
		//transfer to in air state
		if(!this.player.sprite.body.blocked.down)
		{
			this.player.nextState = new _player_air_all_state_js__WEBPACK_IMPORTED_MODULE_1__["default"](this.scene, this.player);
		}

		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		super.exit(timeElapsed, dt);
	}
	
}

/***/ }),

/***/ "./client/player/player-ground-idle-state.js":
/*!***************************************************!*\
  !*** ./client/player/player-ground-idle-state.js ***!
  \***************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return PlayerGroundIdleState; });
/* harmony import */ var _player_ground_base_state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./player-ground-base-state.js */ "./client/player/player-ground-base-state.js");
/* harmony import */ var _player_ground_walk_state_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./player-ground-walk-state.js */ "./client/player/player-ground-walk-state.js");
/* harmony import */ var _player_ground_attack_strong_state_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./player-ground-attack-strong-state.js */ "./client/player/player-ground-attack-strong-state.js");
/* harmony import */ var _player_ground_attack_weak_state_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./player-ground-attack-weak-state.js */ "./client/player/player-ground-attack-weak-state.js");





class PlayerGroundIdleState extends _player_ground_base_state_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
	constructor(scene, player) {
		super(scene, player);
	}

	enter(timeElapsed, dt) {
		this.player.sprite.anims.play("slime-idle");
		this.player.sprite.anims.setTimeScale(8/24);
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {

		//walk left/right
		if(this.player.playerController.right.state || this.player.playerController.left.state)
		{
			this.player.nextState = new _player_ground_walk_state_js__WEBPACK_IMPORTED_MODULE_1__["default"](this.scene, this.player);
		}

		//add jump force
		if(this.player.playerController.jump.state && !this.player.playerController.jump.prevState)
		{
			this.player.applyJumpForce();
		}

		//attacks
		if(this.player.playerController.attackWeak.state || this.player.playerController.attackWeak.state)
		{
			this.player.nextState = new _player_ground_attack_weak_state_js__WEBPACK_IMPORTED_MODULE_3__["default"](this.scene, this.player);
		}
		else if(this.player.playerController.attackStrong.state || this.player.playerController.attackStrong.state)
		{
			this.player.nextState = new _player_ground_attack_strong_state_js__WEBPACK_IMPORTED_MODULE_2__["default"](this.scene, this.player);
		}

		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		this.player.sprite.anims.stop();
		super.exit(timeElapsed, dt);
	}
}

/***/ }),

/***/ "./client/player/player-ground-walk-state.js":
/*!***************************************************!*\
  !*** ./client/player/player-ground-walk-state.js ***!
  \***************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return PlayerGroundWalkState; });
/* harmony import */ var _player_ground_base_state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./player-ground-base-state.js */ "./client/player/player-ground-base-state.js");
/* harmony import */ var _player_ground_idle_state_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./player-ground-idle-state.js */ "./client/player/player-ground-idle-state.js");
/* harmony import */ var _player_ground_attack_strong_state_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./player-ground-attack-strong-state.js */ "./client/player/player-ground-attack-strong-state.js");
/* harmony import */ var _player_ground_attack_weak_state_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./player-ground-attack-weak-state.js */ "./client/player/player-ground-attack-weak-state.js");





class PlayerGroundWalkState extends _player_ground_base_state_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
	constructor(scene, player) {
		super(scene, player);
	}

	enter(timeElapsed, dt) {
		this.player.sprite.anims.play("slime-walk");
		this.player.sprite.anims.setTimeScale(8/24);
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {
		
		//walk right
		if(this.player.playerController.right.state)
		{
			this.player.sprite.flipX = false;
			this.player.applyWalkForce(1);
		}
		//walk left
		else if(this.player.playerController.left.state)
		{
			this.player.sprite.flipX = true;
			this.player.applyWalkForce(-1);
		}
		//idle
		else
		{
			this.player.sprite.setVelocityX(0);
			this.player.nextState = new _player_ground_idle_state_js__WEBPACK_IMPORTED_MODULE_1__["default"](this.scene, this.player);
		}

		//add jump force
		if(this.player.playerController.jump.state && !this.player.playerController.jump.prevState)
		{
			this.player.applyJumpForce();
		}

		//attacks
		if(this.player.playerController.attackWeak.state || this.player.playerController.attackWeak.state)
		{
			this.player.nextState = new _player_ground_attack_weak_state_js__WEBPACK_IMPORTED_MODULE_3__["default"](this.scene, this.player);
		}
		else if(this.player.playerController.attackStrong.state || this.player.playerController.attackStrong.state)
		{
			this.player.nextState = new _player_ground_attack_strong_state_js__WEBPACK_IMPORTED_MODULE_2__["default"](this.scene, this.player);
		}

		

		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		this.player.sprite.anims.stop();
		super.exit(timeElapsed, dt);
	}
}

/***/ }),

/***/ "./client/player/player.js":
/*!*********************************!*\
  !*** ./client/player/player.js ***!
  \*********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Player; });
/* harmony import */ var _global_funcs_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../global-funcs.js */ "./client/global-funcs.js");
/* harmony import */ var _player_ground_idle_state_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./player-ground-idle-state.js */ "./client/player/player-ground-idle-state.js");
/* harmony import */ var _player_damaged_base_state_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./player-damaged-base-state.js */ "./client/player/player-damaged-base-state.js");




//the player class
class Player {
	constructor(scene) {
		this.scene = scene;
		this.globalfuncs = new _global_funcs_js__WEBPACK_IMPORTED_MODULE_0__["default"]();

		//mapping of actions to keyboard key codes. Export this to external file and load in on game startup.
		this.playerInputKeyboardMap = {
			left: 37,
			right: 39,
			up: 38,
			down: 40,
			jump: 90,
			attackWeak: 88,
			attackStrong: 67,
			start: 13,
			select: 32
		};

		//mapping of actions to gamepad buttons. Export this to external file and load in on game startup.
		this.playerInputGamepadMap = {
			jump: 'a',
			attackWeak: 'x',
			attackStrong: 'y',
			start: 'start',
			select: 'select'
		};

		//The actual controller used to control the player.
		this.playerController = {};

		//other variables
		this.debugCounter = 0;

		this.state = null; 
		this.nextState = null;

		this.walkSpeed = 100;

		//player physics variables
		this.moveVelTarget = 0;
		this.moveHysteresis = 0.5;
		this.moveVelVector = {
			x: 0,
			y: 0
		};
		this.physVelVectorFinal = {
			x: 0,
			y: 0
		}
		this.moveAccMagnitude = 50;
		this.moveFrictionCoeff = 0.1;
		
	}


	//this is a seperate function that is called by player states, and we may not want to ALWAYS call it (for example, if the player is damaged, we do not want to call the normal physics)	
	applyPlayerPhysics(dt)
	{


		/////////////////////////////////////////////
		//calculate movement acceleration and speed//
		var lowerBound = this.moveVelTarget - this.moveHysteresis;
		var upperBound = this.moveVelTarget + this.moveHysteresis;

		//determine if the player is within the target + hysteresis. If it is, snap the speed to the target.
		if(this.moveVelVector.x >= lowerBound && this.moveVelVector.x <= upperBound)
		{
			this.moveVelVector.x = this.moveVelTarget;
		}
		//apply acceleration to the direction of the target
		else
		{
			var accDirection = (this.moveVelTarget - this.moveVelVector.x) >= 0 ? 1 : -1;
			var velToAdd = (this.moveAccMagnitude * accDirection * this.moveFrictionCoeff) * dt/1000;
			var velPrediction = this.moveVelVector.x + velToAdd;

			//if the acceleration would cause the velocity to overshoot, snap velocity to the target
			if((accDirection > 0 && velPrediction >= lowerBound) || 
				(accDirection < 0 && velPrediction <= upperBound))
			{
				this.moveVelVector.x = this.moveVelTarget;
			}
			//if it undershoots, add acceleration like normal
			else
			{
				this.moveVelVector.x += velToAdd;
			}
		}
		
		this.physVelVectorFinal.x = this.moveVelVector.x;

		//apply velocities to rigid body
		//rb.velocity = physVelVectorFinal;





		//original
		// /////////////////////////////////////////////
		// //calculate movement acceleration and speed//
		// var lowerBound = moveVelTarget - moveHysteresis;
		// var upperBound = moveVelTarget + moveHysteresis;
		
		// //determine if the player is within the target + hysteresis. If it is, snap the speed to the target.
		// if(moveVelVector.x >= lowerBound && moveVelVector.x <= upperBound)
		// {
		// 	moveVelVector.x = moveVelTarget;
		// }
		// //apply acceleration to the direction of the target
		// else
		// {
		// 	var accDirection = (moveVelTarget - moveVelVector.x) >= 0 ? 1 : -1;
		// 	var velToAdd = (moveAccMagnitude * accDirection * moveFrictionCoeff) * dt;
		// 	var velPrediction = moveVelVector.x + velToAdd;

		// 	//if the acceleration would cause the velocity to overshoot, snap velocity to the target
		// 	if((accDirection > 0 && velPrediction >= lowerBound) || 
		// 		(accDirection < 0 && velPrediction <= upperBound))
		// 	{
		// 		moveVelVector.x = moveVelTarget;
		// 	}
		// 	//if it undershoots, add acceleration like normal
		// 	else
		// 	{
		// 		moveVelVector.x += velToAdd;
		// 	}
		// }
		
		// physVelVectorFinal.x = moveVelVector.x;
		// physVelVectorFinal.y = rb.velocity.y;

		// //apply velocities to rigid body
		// rb.velocity = physVelVectorFinal;
	}



	create() {
		//create animations
		this.globalfuncs.createSceneAnimsFromAseprite(this.scene, "slime", "slime-json");

		//create sprite
		var xPos = 175;
		var yPos = 80;

		this.sprite = this.scene.physics.add.sprite(xPos, yPos, "slime", 0);
		this.sprite.label = "player";
		this.sprite.setScale(2, 2);
		
		//controls
		//create a virtual button for the playerController
		for(var key in this.playerInputKeyboardMap)
		{
			var virtualButton = {
					keyCode: 0,
					phaserKeyCode: "",
					state: false,
					prevState: false,
					phaserKeyObj: {}
			};

			//find the phaserKeyCode (its innefficent I know. I don't care)
			for(var phaserKeyCode in Phaser.Input.Keyboard.KeyCodes)
			{
				if(Phaser.Input.Keyboard.KeyCodes[phaserKeyCode] == this.playerInputKeyboardMap[key])
				{
					virtualButton.phaserKeyCode = phaserKeyCode;
					break;
				}
			}

			virtualButton.keyCode = this.playerInputKeyboardMap[key];
			virtualButton.phaserKeyObj = this.scene.input.keyboard.addKey(this.playerInputKeyboardMap[key]);

			this.playerController[key] = virtualButton;
		}

		//for each virtual button, create a listener to change the virutal button's state
		for(var key in this.playerController)
		{
			this.scene.input.keyboard.on("keydown-"+this.playerController[key].phaserKeyCode, this.tempDown, this.playerController[key]);
			this.scene.input.keyboard.on("keyup-"+this.playerController[key].phaserKeyCode, this.tempUp, this.playerController[key]);
		}

		//initial state
		this.state = new _player_ground_idle_state_js__WEBPACK_IMPORTED_MODULE_1__["default"](this.scene, this);
		this.state.enter();

		//main body collision
		this.sprite.body.setSize(12, 12)
		this.sprite.body.setOffset(26, 28);
		this.scene.physics.add.collider(this.sprite, this.scene.layer1);		
		this.scene.physics.add.collider(this.sprite, this.scene.box.group, this.onCollideBox, null, this);

		//other physics stuff
		this.sprite.setDrag(0, 0);
		this.frameNum = 0;
		
		console.log(this);
	}

	
	tempDown(e) {
		this.state = true;
	}

	tempUp(e) {
		this.state = false;
	}
	

	update(timeElapsed, dt) {
		this.frameNum++;

		//testing a movement bug
		// if(this.frameNum == 5)
		// {
		// 	this.playerController.jump.state = true;
		// }
		// else if(this.frameNum == 46)
		// {
		// 	//this.scene.scene.pause(this.scene.scene.key);
		// 	this.playerController.right.state = true;
		// }
		// else if(this.frameNum == 49)
		// {
		// 	//this.scene.scene.pause(this.scene.scene.key);
		// 	this.playerController.right.state = false;
		// }
		// else if(this.frameNum == 70)
		// {
		// 	console.log('PAUSSSEE');
		// 	//this.scene.scene.pause(this.scene.scene.key);
		// 	console.log("jump state: state: %s, prevState: %s", this.playerController.jump.state, this.playerController.jump.prevState);
		// }
		

		this.state.update(timeElapsed, dt);

		//temporary for testing damage state. Press start to go into damage state.
		if(this.playerController.start.state && !this.playerController.start.prevState)
		{
			this.nextState = new _player_damaged_base_state_js__WEBPACK_IMPORTED_MODULE_2__["default"](this.scene, this);
		}





		//tsting physics - it works!
		// if(this.frameNum == 10)
		// {
		// 	this.moveVelTarget = 10;
		// }
		// else if(this.frameNum == 100)
		// {
		// 	this.moveVelTarget = 0;
		// }
		// this.applyPlayerPhysics(dt);
		// console.log("FRAMENUM: %s - physVelVectorFinal.x: %s", this.frameNum, this.physVelVectorFinal.x);


		//update the prevState on the virtual controller for the player
		for(var key in this.playerController)
		{
			this.playerController[key].prevState = this.playerController[key].state;
		}

		//change states if needed
		if(this.nextState)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}
	}

	applyJumpForce() {
		this.sprite.body.setVelocityY(-100);
	}

	applyWalkForce(xDir) {
		this.sprite.body.setVelocityX(xDir * this.walkSpeed);
	}

	applyDamageForce(xDir) {
		this.sprite.body.setVelocity(xDir * 100, -100);
	}

	postUpdate(timeElapsed, dt) {
		console.log('player post update');
	}
}



/***/ }),

/***/ "./client/scenes/game-manager-scene.js":
/*!*********************************************!*\
  !*** ./client/scenes/game-manager-scene.js ***!
  \*********************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return GameManagerScene; });
/* harmony import */ var _my_tileset_scene_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./my-tileset-scene.js */ "./client/scenes/my-tileset-scene.js");
/* harmony import */ var _server_connection_scene_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./server-connection-scene.js */ "./client/scenes/server-connection-scene.js");
/* harmony import */ var _global_funcs_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../global-funcs.js */ "./client/global-funcs.js");





class GameManagerScene extends Phaser.Scene {
	constructor() {
		super();
		this.myMessages = [];
		this.globalfuncs = new _global_funcs_js__WEBPACK_IMPORTED_MODULE_2__["default"]();
	}
	  
	create() {
		//create other scenes
		console.log('adding scenes...');

		//testing arcade physics
		this.scene.add('server-connection-scene', _server_connection_scene_js__WEBPACK_IMPORTED_MODULE_1__["default"]);
		this.scene.start('server-connection-scene');


		//some things to press and log stuff when i need to
		window.addEventListener("keyup", (e) => {
			//console.log('keycode:' + e.keyCode);
			switch(e.keyCode) {				
				case 49: //1
					console.log('1 clicked.');
					break;
				case 50: //2
					console.log('2 clicked.');
					break;
				case 51: //3
					console.log('3 clicked.');
					break;
				case 52: //4
					console.log('4 clicked.');
					break;
				case 81: //q
					console.log('q clicked.');
					console.log(this);
					break;
			}
		})
	}
	  
	update(timeElapsed, dt) {
	}


}



/***/ }),

/***/ "./client/scenes/my-tileset-scene.js":
/*!*******************************************!*\
  !*** ./client/scenes/my-tileset-scene.js ***!
  \*******************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return MyTilesetScene; });
/* harmony import */ var _global_funcs_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../global-funcs.js */ "./client/global-funcs.js");
/* harmony import */ var _player_player_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../player/player.js */ "./client/player/player.js");
/* harmony import */ var _box_box_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../box/box.js */ "./client/box/box.js");




class MyTilesetScene extends Phaser.Scene {
	constructor(config) {
		super(config);

		this.globalfuncs = new _global_funcs_js__WEBPACK_IMPORTED_MODULE_0__["default"]();
		this.player = new _player_player_js__WEBPACK_IMPORTED_MODULE_1__["default"](this);
		this.box = new _box_box_js__WEBPACK_IMPORTED_MODULE_2__["default"](this);
	}

	init() {
		console.log('init on ' + this.scene.key + ' start');
	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');
		this.load.tilemapTiledJSON("my-tilemap", "assets/tilemaps/my-tilemap.json");
		this.load.image("my-tileset", "assets/tilesets/my-tileset.png");

		this.load.spritesheet("slime", "assets/spritesheets/slime.png", {frameWidth: 64, frameHeight: 64});
		this.load.json("slime-json", "assets/spritesheets/slime.json");


		this.load.spritesheet("box", "assets/spritesheets/box.png", {frameWidth: 32, frameHeight: 32});
		this.load.json("box-json", "assets/spritesheets/box.json");
	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
		console.log(this);
		//debug grid
		this.add.grid(0, 0, 1000, 1000, 10, 10, 0x057605);

		///////////////////////////
		// create world
		///////////////////////////		
		//load tilemap
		this.map = this.make.tilemap({key: "my-tilemap"});

		//load tileset
		this.tileset = this.map.addTilesetImage("my-tileset");

		//create layers
		this.layer1 = this.map.createStaticLayer("Tile Layer 1", this.tileset, 0, 0);
		//this.layer2 = this.map.createStaticLayer("Tile Layer 2", this.tileset, 0, 0);

		//set collision for tile layer
		this.layer1.setCollisionByProperty({collides: true});

		//add debug colors to tiles
		this.layer1.renderDebug(this.add.graphics());


		///////////////////////////
		// create box
		///////////////////////////
		this.box.create();

		//spawn some boxes
		// this.box.spawn(180, 50);
		// this.box.spawn(210, 50);



		///////////////////////////
		// create player
		///////////////////////////
		this.player.create();


		///////////////////////////
		// create camera
		///////////////////////////
		// this.cameraRightBound = 300;
		// this.cameraLeftBound = -50;
		// this.cameraUpBound = -450;
		// this.cameraDownBound = 450;

		// this.cameraOffsetX = -(this.cameras.main.width / 2);
		// this.cameraOffsetY = -(this.cameras.main.height / 2);

		// this.cameraRightBoundInner = this.cameraRightBound - this.cameras.main.width;
		// this.cameraLeftBoundInner = this.cameraLeftBound;
		// this.cameraUpBoundInner = this.cameraUpBound;
		// this.cameraDownBoundInner = this.cameraDownBound - this.cameras.main.height;
	}

	  
	update(timeElapsed, dt) {

		this.player.update(timeElapsed, dt);
	
		// var newx = this.player.sprite.x + this.cameraOffsetX;
		// var newy = this.player.sprite.y + this.cameraOffsetY;

		// //prevents scrolling to the left too much
		// if(newx <= this.cameraLeftBoundInner)
		// {
		// 	newx = this.cameraLeftBoundInner;
		// }
		// //prevents scrolling to the right too much
		// else if(newx >= this.cameraRightBoundInner)
		// {
		// 	newx = this.cameraRightBoundInner;
		// }

		// //prevents scrolling up too much
		// if(newy <= this.cameraUpBoundInner)
		// {
		// 	newy = this.cameraUpBoundInner;
		// }
		// //prevents scrolling down too much
		// else if(newy >= this.cameraDownBoundInner)
		// {
		// 	newy = this.cameraDownBoundInner;
		// }

		// this.cameras.main.scrollX = newx;
		// this.cameras.main.scrollY = newy;



	}
}




/***/ }),

/***/ "./client/scenes/server-connection-scene.js":
/*!**************************************************!*\
  !*** ./client/scenes/server-connection-scene.js ***!
  \**************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return ServerConnectionScene; });
class ServerConnectionScene extends Phaser.Scene {
	constructor(config) {
		super(config);
		this.ws = null;
		this.messageSent = false;
		this.tempLineGraphicsArr = [];
		this.planckUnitsToPhaserUnitsRatio = 4;
		this.radiansToDegreesRatio = 180/3.14
	}

	init() {
		console.log('init on ' + this.scene.key + ' start');
		
		//localhost
		this.ws = new WebSocket("ws://localhost:7000");

		//prod
		//this.ws = new WebSocket("wss://stockheimer.dontcodethis.com");

		this.ws.onmessage = this.onmessage.bind(this);
		console.log(this.ws);
	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');
		this.load.image("my-tileset", "assets/tilesets/my-tileset.png");
	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
		this.cameras.main.scrollX = -150;
		this.cameras.main.scrollY = -150;

		this.xAxisGraphic = this.add.graphics();
		this.xAxisGraphic.lineStyle(1, 0xff0000, 1.0);
		this.xAxisGraphic.moveTo(0, 0);
		this.xAxisGraphic.lineTo(10, 0);
		this.xAxisGraphic.strokePath();

		this.yAxisGraphic = this.add.graphics();
		this.yAxisGraphic.lineStyle(1, 0xff0000, 1.0);
		this.yAxisGraphic.moveTo(0, 0);
		this.yAxisGraphic.lineTo(0, 10);
		this.yAxisGraphic.strokePath();

		//create functions for the start/stop/restart buttons
		window.addEventListener("start-event", this.startEvent.bind(this));
		window.addEventListener("stop-event", this.stopEvent.bind(this));
		window.addEventListener("restart-event", this.restartEvent.bind(this));
	}

	startEvent() {
		console.log('StartEvent started');
		this.sendJsonEvent(this.ws, "start-Event", "");
		console.log('StartEvent DONE');
	}

	stopEvent() {
		console.log('stopEvent started');
		this.sendJsonEvent(this.ws, "stop-Event", "");
		console.log('stopEvent DONE');
	}

	restartEvent() {
		console.log('restartEvent started');
		this.sendJsonEvent(this.ws, "restart-event", "");
		console.log('restartEvent DONE');
	}
	  
	update(timeElapsed, dt) {
		if(!this.messageSent && this.ws.readyState === WebSocket.OPEN)
		{
			console.log('now sending message');
			//this.ws.send("hello from server-connection-scene!");
			this.sendJsonEvent(this.ws, "get-world", "");
			this.messageSent = true;
		}
	}

	onmessage(e) {
		var jsonMsg = this.getJsonEvent(e.data);
		console.log('message recieved from server. Event: ' + jsonMsg.event);
		switch(jsonMsg.event.toLowerCase())
		{
			case "get-world-response":
				console.log('got world reponse!');
				this.world = JSON.parse(jsonMsg.msg);

				//convert phaser units to phaser units
				this.convertPlankToPhaserUnits();

				console.log(this.world);
				this.createWorld();
				break;
			case "world-deltas":
				console.log('got world deltas');
				var deltas = JSON.parse(jsonMsg.msg);
				this.processDeltas(deltas);
				break;
		}
		if(jsonMsg.event == "get-world-response")
		{
			
		}
	}

	sendJsonEvent(socket, event, msg) {
		if(!event)
		{
			event = "unknown"
		}
		if(!msg)
		{
			msg = ""
		}
		
		var data = {
			event: event,
			msg: msg
		}
		socket.send(JSON.stringify(data));
	}

	getJsonEvent(msg) {
		var j = {};
		if(!msg)
		{
			return j;
		}

		j = JSON.parse(msg);
		return j;
	}

	createWorld() {
		console.log('creating world now');
		
		for(var i = 0; i < this.world.length; i++)
		{
			var o = this.world[i];
			o.planckGraphics = [];

			for(var j = 0; j < o.fixtures.length; j++)
			{
				var f = o.fixtures[j];
				switch(f.shapeType.toLowerCase())
				{
					case "polygon":
					case "edge":
						var tempLineGraphics = this.add.graphics();

						tempLineGraphics.lineStyle(1, 0x00ff00, 1);
						tempLineGraphics.moveTo(f.vertices[0].x, f.vertices[0].y);

						for(var v = 1; v < f.vertices.length; v++)
						{
							tempLineGraphics.lineTo(f.vertices[v].x, f.vertices[v].y);
						}

						tempLineGraphics.closePath();
						tempLineGraphics.strokePath();

						tempLineGraphics.setX(o.x);
						tempLineGraphics.setY(o.y);

						o.planckGraphics.push(tempLineGraphics);

						break;
				}
			}
		}

		console.log('creating world done');
	}

	processDeltas(deltas) {
		//update x, y of all bodies in the world
		for(var i = 0; i < this.world.length; i++)
		{
			var obj = this.world[i];
			var myDelta = deltas.find((x) => {return x.id == obj.id});
			if(myDelta)
			{
				if(obj.id == 4)
				{
					console.log('myDelta x, y: %s, %s', myDelta.x, myDelta.y);
					var newx = myDelta.x * this.planckUnitsToPhaserUnitsRatio;
					var newy = myDelta.y * this.planckUnitsToPhaserUnitsRatio * -1;
					var newa = myDelta.a * -this.radiansToDegreesRatio;

					console.log(obj);

					for(var j = 0; j < obj.planckGraphics.length; j++)
					{
						obj.planckGraphics[j].setX(newx);
						obj.planckGraphics[j].setY(newy);
						obj.planckGraphics[j].setAngle(newa);
					}
				}
			}
		}
	}

	convertPlankToPhaserUnits() {
		console.log('converting units now');
		
		for(var i = 0; i < this.world.length; i++)
		{
			var o = this.world[i];
			for(var j = 0; j < o.fixtures.length; j++)
			{
				var f = o.fixtures[j];
				switch(f.shapeType.toLowerCase())
				{
					case "polygon":
					case "edge":
						for(var v = 0; v < f.vertices.length; v++)
						{
							f.vertices[v].x = f.vertices[v].x * this.planckUnitsToPhaserUnitsRatio;
							f.vertices[v].y = f.vertices[v].y * this.planckUnitsToPhaserUnitsRatio * -1;
						}						
						break;
				}
			}

			o.x = o.x * this.planckUnitsToPhaserUnitsRatio;
			o.y = o.y * this.planckUnitsToPhaserUnitsRatio * -1;
		}

		console.log('converting units done');
	}
}



/***/ })

/******/ });
//# sourceMappingURL=app.bundle.js.map