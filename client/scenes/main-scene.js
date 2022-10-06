import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import config from '../client-config.json';
import PlayerController from "../classes/player-controller.js"
import ClientConstants from "../client-constants.js"
import TeamMenu from "../ui-classes/team-menu.js"
import CharacterClassMenu from "../ui-classes/character-class-menu.js";
import ChatMenu from "../ui-classes/chat-menu.js"
import ChatMenuMinified from "../ui-classes/chat-menu-minified.js"
import UserListMenu from "../ui-classes/user-list-menu.js"
import RoundMenu from "../ui-classes/round-menu.js"
import ControlPointMenu from "../ui-classes/control-point-menu.js"
import RespawnTimerMenu from "../ui-classes/respawn-timer-menu.js"
import KillFeedMenu from "../ui-classes/kill-feed-menu.js"
import RoundResultsMenu from "../ui-classes/round-results-menu.js"
import TeamScoreMenu from "../ui-classes/team-score-menu.js"
import KothTimerMenu from "../ui-classes/koth-timer-menu.js"

import RoundStartMenu from "../ui-classes/round-start-menu.js"

export default class MainScene extends Phaser.Scene {
	constructor() {
		super(config);
		this.globalfuncs = new GlobalFuncs();
		this.planckUnitsToPhaserUnitsRatio = 32;
		this.planckScale = 1;
		this.baseTileWidth = 16;
		this.radiansToDegreesRatio = 180/3.14;
		
		this.userPhaserElements = []; //list of json objects that contain phaser specific graphic elements

		this.playerInputKeyboardMap = {};
		this.playerController = null;

		this.targetX = 0;
		this.targetY = 0;
		this.targetLine = null;
		this.targetLineGraphic = null;
		this.targetLineLength = 100;
		this.targetLineLengthStandard = 100;
		this.targetLineLengthSniper = 1500;

		this.isFiring = false;
		this.isFiringAlt = false;
		this.prevIsFiring = false;
		this.prevIsFiringAlt = false;
		this.angle = 0;
		this.prevAngle = 0;
		this.angleSmallestDelta = 0.001;

		this.damageTexts = []; //little array of damage texts to popup when someone gets hurt
		this.gravestones = []; //array of gravestones to put on the game when characters die
		this.debugServerCircles = []; //temp array for debugging server objects, like projectiles and raycasts
		this.hitscanArray = [];

		this.cameraTarget = {
			x: 0,
			y: 0
		}

		// this.cameraZoom = 1.4;
		this.cameraZoom = 1.0;
		this.cameraZoomMax = 6;
		this.cameraZoomMin = 0.4;
		this.cameraZoomPrev = this.cameraZoom;


		this.defaultCenter = {
			x: 0,
			y: 0
		}

		this.spectatorCamera = {
			x: 0,
			y: 0
		}

		this.cameraMode = ClientConstants.CameraModes["CAMERA_MODE_SPECTATOR"]; 
		this.deathCamTimer = 0;	//in ms, the amount of time stayed in death cam mode
		this.deathCamTimerInterval = 1500; //in ms, the amount of time to stay in death cam mode until you switch to spectator


		this.debugX = null;
		this.debugY = null;
		this.debugScreenX = null;
		this.debugScreenY = null;
		this.debugIsDown = null;
		this.debugAngle = null;

		this.frameNum = 0;

		// this.pvpEmoji = String.fromCharCode(0x2694, 0xFE0F);
		this.aiColor = 0xff0000;
		this.aiFillColor = 0xff6600;
		this.aiTextColor = "#000000";
		this.aiStrokeColor = "#ff0000";
		this.aiStrokeThickness = 3;

		this.userStrokeThickness = 1;

		this.damageTextColor = "#ff0000";
		this.damageStrokeColor = "#000000";
		this.damageStrokeThickness = 2;

		this.healTextColor = "#00ff00";
		this.healStrokeColor = "#000000";
		this.healStrokeThickness = 2;

		this.projectileColor = 0xff0000;
				
		this.castleColor = 0x000000;
		this.castleFillColor = 0xffffff;
		this.castleTextColor = "#ffffff";
		this.castleStrokeColor = "#000000";
		this.castleStrokeThickness = 5;

		this.gravestoneTextColor = "#ffffff";
		this.gravestoneStrokeColor = "#000000";
		this.gravestoneStrokeThickness = 2;

		this.teamMenu = null;
		this.characterClassMenu = null;
		this.chatMenu = null;
		this.chatMenuMinified = null;
		this.userListMenu = null;
		this.roundMenu = null;
		this.respawnTimerMenu = null;
		this.killFeedMenu = null;
		this.roundResultsMenu = null;
		this.teamScoreMenu = null;
		this.kothTimerMenu = null;
		this.roundStartMenu = null;
		this.controlPointMenu = null;

		this.tilesetArray = [];
		this.layerArray = [];

		this.currentTick = 0;
		this.previousTick = 0;

		///////////////////////////
		// various camera variables
		this.frameCharacterPosX = 0;			//character pos for the frame, planck units
		this.frameCharacterPosY = 0;
		this.pointerFromCenterX = 0;			//distance of the pointer from center screen, screen units
		this.pointerFromCenterY = 0;
		this.pointerFromCenterPrevX = 0;		//previous distance of the pointer from center screen, screen units
		this.pointerFromCenterPrevY = 0;
		//
		///////////////////////////

		///////////////////////////
		// sniper camera variables
		this.zoomAnchorX = 0;					//anchor point when zooming in, planck units
		this.zoomAnchorY = 0;
		this.zoomMinorPansX = 0;			//accumulation of minor camera pans based on mouse distance from anchor point, planck units
		this.zoomMinorPansY = 0;

		this.sniperMaxZoomBreakpoint = 1.9;		//zoom break point before the mouse movements become less sensitive
		this.cameraZoomBeforeSniper = 1.0;		//used to return the camera to previous zoom before they are in scope
		this.sniperDefaultZoomLevel = 2.0;		//zoom level to jump to when in scope
		this.bCameraZoomChange = false;
		this.isSniperClass = false;
		//
		///////////////////////////

	}

	init(data) {
		console.log('init on ' + this.scene.key + ' start');
		
		this.gc = data.gc;
		
		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
			{event: "team-changed", func: this.teamChanged.bind(this)}
		];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);
		
		//mapping of actions to keyboard key codes. Export this to external file and load in on game startup.
		this.playerInputKeyboardMap = {
			left: 65,
			right: 68,
			up: 87,
			down: 83
		};

		//custom registers
		$(window).on("keyup", this.windowInputKeyup.bind(this));

		//phaser scene input events
		this.input.on("gameout", this.gameout.bind(this));
		this.input.on("gameover", this.gameover.bind(this));
		this.input.on("wheel", this.wheel.bind(this));

		this.debugX = $("#debug-x");
		this.debugY = $("#debug-y");
		this.debugScreenX = $("#debug-screen-x");
		this.debugScreenY = $("#debug-screen-y");
		this.debugIsDown = $("#debug-is-down");
		this.debugAngle = $("#debug-angle");

		//created menus and small divs
		this.teamMenu = new TeamMenu();
		this.characterClassMenu = new CharacterClassMenu();
		this.chatMenu = new ChatMenu();
		this.chatMenuMinified = new ChatMenuMinified();
		this.userListMenu = new UserListMenu();
		this.roundMenu = new RoundMenu();
		this.respawnTimerMenu = new RespawnTimerMenu();
		this.killFeedMenu = new KillFeedMenu();
		this.roundResultsMenu = new RoundResultsMenu();
		this.teamScoreMenu = new TeamScoreMenu();
		this.kothTimerMenu = new KothTimerMenu();
		this.roundStartMenu = new RoundStartMenu();
		this.controlPointMenu = new ControlPointMenu();
		

		this.teamMenu.init(this.gc);
		this.characterClassMenu.init(this.gc);
		this.chatMenu.init(this.gc);
		this.chatMenuMinified.init(this.gc);
		this.userListMenu.init(this.gc);
		this.roundMenu.init(this.gc);
		this.respawnTimerMenu.init(this.gc);
		this.killFeedMenu.init(this.gc);
		this.roundResultsMenu.init(this.gc);
		this.teamScoreMenu.init(this.gc);
		this.kothTimerMenu.init(this.gc);
		this.roundStartMenu.init(this.gc);
		this.controlPointMenu.init(this.gc);
	}

	gameout(time, e) {
		this.gc.turnOnContextMenu();
	}

	gameover(time, e) {
		this.gc.turnOffContextMenu();
	}

	wheel(pointer, currentlyOver, deltaX, deltaY, deltaZ) {
		//scrolled down
		if(deltaY > 0) {
			this.cameraZoom -= 0.2;
		}
		//scrolled up
		else if(deltaY < 0) {
			this.cameraZoom += 0.2;
		}
		this.bCameraZoomChange = true;
	}


	windowInputKeyup(e) {
		// console.log(e.code);
		switch(e.code) {
			case "Escape":
				window.dispatchEvent(new CustomEvent("toggle-main-menu"));
				break;
			case "Comma":
				window.dispatchEvent(new CustomEvent("toggle-team-menu"));
				break;
			case "Enter":
			case "NumpadEnter":
				window.dispatchEvent(new CustomEvent("toggle-chat-menu"));
				break;
			case "Tab":
				window.dispatchEvent(new CustomEvent("toggle-user-list-menu"));
				break
		}
	}

	//used to close all menus within the menu group
	//....should really just pull all the menus out and put them in game-client one day
	closeMenuGroup() {
		this.gc.mainMenu.closeMenu();
		this.teamMenu.closeMenu();
		this.characterClassMenu.closeMenu();
	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');
	}

	create() {
		console.log('create on ' + this.scene.key + ' start');
		
		this.currentTick = performance.now();
		this.previousTick = this.currentTick;
	}

	//prepending "stockheimer" just in case this name conflicts with Phaser's scene life cycle....I don't see it anywhere in the api, but i don't want to risk it.
	stockheimerActivate() {
		console.log('stockheimerActivate on ' + this.scene.key + ' start');

		$("#main-scene-root").removeClass("hide");

		this.cameras.main.setZoom(this.cameraZoom);
		this.cameras.main.scrollX = 0;
		this.cameras.main.scrollY = 0;

		this.playerController = new PlayerController(this);
		this.playerController.init(this.playerInputKeyboardMap);

		this.targetLineGraphic = this.add.graphics({
			lineStyle: {
				width: 0.5,
				color: 0xff0000
			},
			fillStyle: {
				color: 0xff0000
			}
		});

		this.targetLine = new Phaser.Geom.Line(0, 0, 0, 0);		
		this.targetLineGraphic.setDepth(ClientConstants.PhaserDrawLayers.hitboxLayer);

		//this.cameras.main.roundPixels = true;
		this.cameras.main.setRoundPixels(true);

		//activated ui classes
		this.teamMenu.activate();
		this.characterClassMenu.activate();
		this.chatMenu.activate();
		this.chatMenuMinified.activate();
		this.userListMenu.activate();
		this.roundMenu.activate();
		this.respawnTimerMenu.activate();
		this.killFeedMenu.activate();
		this.roundResultsMenu.activate();
		this.teamScoreMenu.activate();
		this.kothTimerMenu.activate();
		this.roundStartMenu.activate();
		this.controlPointMenu.activate();

		//other things to create
		this.gc.mainScene.createMap();
		this.gc.debugMenu.populateDebugMenu();

		this.respawnMenuFlowControl(true);

		//set cursor
		this.input.setDefaultCursor('url(assets/cursors/ProX.cur), pointer');
	}

	createMap() {
		//create tilemap in phaser
		this.map = this.make.tilemap({key: this.gc.activeTilemap.key});

		this.planckScale = 1;

		//for each layer, create a tileset and a tile later in phaser
		for(var i = 0; i < this.gc.activeTilemap.data.tilesets.length; i++) {
			var ts = this.gc.activeTilemap.data.tilesets[i];

			//create tileset
			var newTileset = this.map.addTilesetImage(ts.name, ts.tilesetKey, ts.tilewidth, ts.tileheight, ts.margin, ts.spacing);

			//add tileset to the pile
			this.tilesetArray.push(newTileset);
		}

		//find properties on the tilemap for scaling and stuff
		if(this.gc.activeTilemap.data.properties !== undefined && this.gc.activeTilemap.data.properties !== null) {
			for(var i = 0; i < this.gc.activeTilemap.data.properties.length; i++) {
				var currentProperty = this.gc.activeTilemap.data.properties[i];

				//a property with "planckScale" on it will be used for tiledUnitsToPlanckUnits scaling
				if(currentProperty.name.toLowerCase() === "planckscale"
				&& currentProperty.type === "float")
				{
					if(typeof currentProperty.value === "number") {
						this.planckScale = Math.abs(currentProperty.value);
					}
				}
			}
		}

		//adjust the scaling based on tilewidth (i'm assuming all tilesets' tilewidth are the same width as the tilewidth set in the map)
		this.graphicsScale = this.planckScale * (this.baseTileWidth / this.gc.activeTilemap.data.tilewidth);

		//create each layer
		for(var i = 0; i < this.gc.activeTilemap.data.layers.length; i++) {
			var l = this.gc.activeTilemap.data.layers[i];

			if(l.type === "tilelayer" && l.visible) {
				//create layer
				var xOffset = -(this.planckUnitsToPhaserUnitsRatio/2) * this.planckScale;
				var yOffset = -(this.planckUnitsToPhaserUnitsRatio/2) * this.planckScale;
				var newLayer = this.map.createLayer(l.name, this.tilesetArray, xOffset, yOffset).setScale(this.graphicsScale * 2);
				var layerDepth = ClientConstants.PhaserDrawLayers.tilemapBaseLayer + i;
				
				//search for propeties for depth and stuff
				if(l.properties !== undefined && l.properties !== null) {
					for(var j = 0; j < l.properties.length; j++) {
						var currentProperty = l.properties[j];
						//a bool property with "topLayer" on it will be used for the top layer depth
						if(currentProperty.name.toLowerCase() === "toplayer"
						&& currentProperty.type === "bool"
						&& currentProperty.value === true)
						{
							layerDepth = ClientConstants.PhaserDrawLayers.tilemapTopLayer + i;
						}
					}
				}
				

				newLayer.setDepth(layerDepth);

				//add layer to the pile
				this.layerArray.push(newLayer);
			}
		}

		//calculate the center of the map for spectator/death cam
		var width = this.globalfuncs.getValueDefault(this.gc.activeTilemap?.data?.width, 0);
		var height = this.globalfuncs.getValueDefault(this.gc.activeTilemap?.data?.height, 0);

		this.defaultCenter.x = (width/2) * this.planckScale;
		this.defaultCenter.y = -(height/2) * this.planckScale;

		this.spectatorCamera.x = (width/2) * this.planckScale;
		this.spectatorCamera.y = -(height/2) * this.planckScale;
	}

	

	setCameraZoom() {
		this.cameraZoom = this.cameraZoom >= this.cameraZoomMax ? this.cameraZoomMax : this.cameraZoom;
		this.cameraZoom = this.cameraZoom <= this.cameraZoomMin ? this.cameraZoomMin : this.cameraZoom;

		this.cameraZoom = Math.round(this.cameraZoom * 10)/10;

		//for some reason, i get some tile bleeding SOMETIMES when the zoom is on an odd number (like 1.3, 1.5)
		//this is just a quick hack to make sure the zoom is always on an even number to stop the tile bleeding
		var temp = Math.round(this.cameraZoom * 10);
		this.cameraZoom += temp % 2 === 0 ? 0 : 0.1

		this.cameras.main.setZoom(this.cameraZoom);

		console.log("zoom is now: " + this.cameraZoom);
	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.gc.turnOnContextMenu();
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);

		//clear out damage texts
		for(var i = this.damageTexts.length - 1; i >= 0; i--)
		{
			if(this.damageTexts[i].textGraphics !== null)
			{
				this.damageTexts[i].textGraphics.destroy();
			}
			this.damageTexts.splice(i, 1);
		}

		//clear gravestones
		for(var i = this.gravestones.length - 1; i >= 0; i--) {
			if(this.gravestones[i].gravestoneImage !== null) {
				this.gravestones[i].gravestoneImage.destroy();
			}
			if(this.gravestones[i].gravestoneText !== null) {
				this.gravestones[i].gravestoneText.destroy();
			}
			this.gravestones.splice(i, 1);
		}

		//clear hitscans
		for(var i = this.hitscanArray.length - 1; i >= 0; i--) {
			this.hitscanArray[i].deinit();
		}

		this.hitscanArray.length = 0;

		$(window).off("keyup");
		$(document).off("keyup");

		$("#main-scene-root").addClass("hide");

		if(this.playerController !== null)
		{
			this.playerController.shutdown();
		}

		this.userListMenu.closeMenu();
		this.gc.mainMenu.closeMenu();
		this.chatMenu.closeMenu();
		this.roundResultsMenu.closeMenu();
		this.teamScoreMenu.closeMenu();
		this.roundStartMenu.closeMenu();

		this.teamMenu.deactivate();
		this.characterClassMenu.deactivate();
		this.chatMenu.deactivate();
		this.chatMenuMinified.deactivate();
		this.userListMenu.deactivate();
		this.roundMenu.deactivate();
		this.respawnTimerMenu.deactivate();
		this.killFeedMenu.deactivate();
		this.roundResultsMenu.deactivate();
		this.teamScoreMenu.deactivate();
		this.kothTimerMenu.deactivate();
		this.roundStartMenu.deactivate();
		this.controlPointMenu.deactivate();

		this.teamMenu.deinit();
		this.characterClassMenu.deinit();
		this.chatMenu.deinit();
		this.chatMenuMinified.deinit();
		this.userListMenu.deinit();
		this.roundMenu.deinit();
		this.respawnTimerMenu.deinit();
		this.killFeedMenu.deinit();
		this.roundResultsMenu.deinit();
		this.teamScoreMenu.deinit();
		this.kothTimerMenu.deinit();
		
		this.roundStartMenu.deinit();
		this.controlPointMenu.deinit();

		//other stuff
		this.gc.debugMenu.clearDebugMenu();
	}


	switchCameraMode(mode)
	{
		console.log('switching camera mode to ' + mode);
		this.cameraMode = mode;

		//here are things that always happen everytime we enter the new camera mode
		switch(this.cameraMode) {
			case ClientConstants.CameraModes["CAMERA_MODE_SPECTATOR"]:
				this.spectatorCamera.x = this.defaultCenter.x;
				this.spectatorCamera.y = this.defaultCenter.y;
				break;
			case ClientConstants.CameraModes["CAMERA_MODE_DEATH_CAM"]:
				this.deathCamTimer = 0;
				break;
			default:
				//nothing
				break;
		}



		// if(mode === 0) //0 - spectator mode
		// {
		// 	this.spectatorCamera.x = this.defaultCenter.x;
		// 	this.spectatorCamera.y = this.defaultCenter.y;
		// }
		// else if(mode === 1) //1 - follow character
		// {
		// 	this.cameraMode = 1;
		// }
		// else if (mode === 2) //2 - death cam
		// {
		// 	this.cameraMode = 2;
		// 	this.deathCamTimer = 0;
		// }
		// else if (mode === 7) { //7 - zniper zoom 
		// 	this.cameraMode = 7
		// }
		// else if (mode === 8) { //8 - zniper zoom exit
		// 	this.cameraMode = 8
		// }
		// else if (mode === 9) { //9 - sniper zoom enter
		// 	this.cameraMode = 9
		// }
	}

	update(timeElapsed, fakeDt) {
		// console.log("==== UPDATE " + this.gc.frameNum + " ====");
		// console.log(". Zooms: " + this.cameraZoom + ", " + this.cameraZoomPrev);
		this.currentTick = performance.now();
		var dt = this.currentTick - this.previousTick;
		var pointer = this.input.activePointer;
		var sendInputEvent = false;

		//update any dmg texts
		for(var i = this.damageTexts.length - 1; i >= 0; i--) {
			this.damageTexts[i].countdownTimer -= dt;
			if(this.damageTexts[i].countdownTimer <= 0) {
				if(this.damageTexts[i].textGraphics !== null) {
					this.damageTexts[i].textGraphics.destroy();
				}
				this.damageTexts.splice(i, 1);
			}
		}

		//update any gravestone timers
		for(var i = this.gravestones.length - 1; i >= 0; i--) {
			this.gravestones[i].countdownTimer -= dt;
			if(this.gravestones[i].countdownTimer <= 0) {
				if(this.gravestones[i].gravestoneImage !== null) {
					this.gravestones[i].gravestoneImage.destroy();
				}
				if(this.gravestones[i].gravestoneText !== null) {
					this.gravestones[i].gravestoneText.destroy();
				}
				this.gravestones.splice(i, 1);
			}
		}

		//update hitscans
		for(var i = this.hitscanArray.length - 1; i >= 0; i--) {
			this.hitscanArray[i].sceneUpdate(dt);
			if(this.hitscanArray[i].timeLengthAcc >= this.hitscanArray[i].timeLength) {
				this.hitscanArray[i].deinit();
				this.hitscanArray.splice(i, 1);
			}
		}

		//update gameobjects
		var activeGameObjects = this.gc.gom.getActiveGameObjects();
		for(var i = 0; i < activeGameObjects.length; i++) {
			activeGameObjects[i].sceneUpdate(dt);
		}

		pointer.updateWorldPoint(this.cameras.main);

		//grab the character position for this frame (so I don't have to check for its existance every single time)
		if(this.gc.myCharacter !== null) {
			this.frameCharacterPosX = this.gc.myCharacter.x;
			this.frameCharacterPosY = this.gc.myCharacter.y;
		}

		//update any various camera variables
		this.pointerFromCenterX = pointer.x - this.cameras.main.width/2;
		this.pointerFromCenterY = pointer.y - this.cameras.main.height/2;
		
		if(pointer.leftButtonDown()) {
			this.isFiring = true;
		}
		else {
			this.isFiring = false;
		}

		if(pointer.rightButtonDown()) {
			this.isFiringAlt = true;
		}
		else {
			this.isFiringAlt = false;
		}


		//if you control your character, read input and send it to the server if its dirty.
		if(this.gc.myCharacter !== null) {
			this.targetLineGraphic.clear();

			// pointer.updateWorldPoint(this.cameras.main);

			//redraw the target line
			var x1 = this.gc.myCharacter.x * this.planckUnitsToPhaserUnitsRatio;
			var y1 = this.gc.myCharacter.y * this.planckUnitsToPhaserUnitsRatio * -1;
			var x2 = pointer.worldX;
			var y2 = pointer.worldY;

			this.targetLine.x1 = x1;
			this.targetLine.y1 = y1;
			this.targetLine.x2 = x2;
			this.targetLine.y2 = y2;

			this.angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
			this.angle = (Math.round((this.angle*1000))/1000)
			
			Phaser.Geom.Line.SetToAngle(this.targetLine, x1, y1, this.angle, this.targetLineLength);

			this.targetLineGraphic.strokeLineShape(this.targetLine);

			//if input changes, send the input event
			if(this.playerController.isDirty)
			{
				//debugging
				// var inputText = "";
				// for(var key in this.playerInputKeyboardMap)
				// {
				// 	inputText += this.playerController[key].state ? '1' : '0';
				// }
				// console.log(inputText);

				sendInputEvent = true;
			}

			//if the user fires/stops firing. send the input event
			if(this.prevIsFiring != this.isFiring)
			{
				sendInputEvent = true;
			}

			if(this.prevIsFiringAlt != this.isFiringAlt)
			{
				sendInputEvent = true;
			}

			//if the user is currently firing, and the angle changes, send the input event
			// if((this.isFiring || this.isFiringAlt) && Math.abs(this.angle - this.prevAngle) >= this.angleSmallestDelta)
			// {
			// 	sendInputEvent = true;
			// }

			//send inputs on EVERY angle change
			if(Math.abs(this.angle - this.prevAngle) >= this.angleSmallestDelta)
			{
				sendInputEvent = true;
			}

			//send the input event this frame if needed
			if(sendInputEvent)
			{
				//console.log('sending input event');
				this.gc.ep.insertClientToServerEvent({
					"eventName": "fromClientInputs",
					"up": this.playerController.up.state,
					"down": this.playerController.down.state,
					"left": this.playerController.left.state,
					"right": this.playerController.right.state,
					"isFiring": this.isFiring,
					"isFiringAlt": this.isFiringAlt,
					"characterDirection": this.angle
				});
			}
		}
		//if you DON'T control your character yet (hasn't spawned or is dead), read the input to control the spectator/death camera
		else
		{
			//debugging
			var inputText = "";
			for(var key in this.playerInputKeyboardMap)
			{
				inputText += this.playerController[key].state ? '1' : '0';
			}
			//console.log(inputText + " " + this.playerController.anyInput);

			if(this.playerController.anyInput)
			{

				var vx = 0;
				var vy = 0;

				if(this.playerController.up.state)
				{
					vy += 0.20;
				}
				if(this.playerController.down.state)
				{
					vy -= 0.20;
				}
				if(this.playerController.right.state)
				{
					vx += 0.20;
				}
				if(this.playerController.left.state)
				{
					vx -= 0.20;
				}

				if(vx !== 0 || vy !== 0)
				{
					this.spectatorCamera.x += vx;
					this.spectatorCamera.y += vy;
				}
			}
		}
		
		// temp testing for sniper camera zoom alternate 3
		if(this.isSniperClass && this.gc.myCharacter !== null && this.prevIsFiringAlt != this.isFiringAlt) {
			if(this.isFiringAlt === true) {
				this.switchCameraMode(ClientConstants.CameraModes["CAMERA_MODE_SNIPER_ENTER"]);
				this.targetLineLength = this.targetLineLengthSniper;
			} else {
				this.switchCameraMode(ClientConstants.CameraModes["CAMERA_MODE_SNIPER_EXIT"]);
				this.targetLineLength = this.targetLineLengthStandard;
			}
		}


		//if the wheel was scrolled, change the camera zoom
		if(this.bCameraZoomChange) {
			this.bCameraZoomChange = false;
			this.setCameraZoom();

			//if the camera mode is in sniper zoom, pan the camera to the appropriate location as well
			if(this.cameraMode === ClientConstants.CameraModes["CAMERA_MODE_SNIPER_AIMING"]) {
				//recalculate the anchor point for the zoom
				var tempCenterScreenPlanckUnitsX = (this.cameras.main.scrollX + this.cameras.main.width/2) / this.planckUnitsToPhaserUnitsRatio;
				var tempCenterScreenPlanckUnitsY = (this.cameras.main.scrollY + this.cameras.main.height/2) / this.planckUnitsToPhaserUnitsRatio * -1;

				//when recalculating, we need to "back out" the character position from the current screen position (if we don't, it doubles up and pans the camera in a wierd way)
				this.zoomAnchorX = tempCenterScreenPlanckUnitsX - this.frameCharacterPosX + (this.pointerFromCenterX * ((1 / this.cameraZoomPrev) - (1 / this.cameraZoom))) / this.planckUnitsToPhaserUnitsRatio;
				this.zoomAnchorY = tempCenterScreenPlanckUnitsY - this.frameCharacterPosY + (this.pointerFromCenterY * ((1 / this.cameraZoomPrev) - (1 / this.cameraZoom))) / this.planckUnitsToPhaserUnitsRatio * -1;
	
				//reset the minor pans
				this.zoomMinorPansX = 0;
				this.zoomMinorPansY = 0;
			}
		}


		//debugging text
		this.debugX.text('x: ' + Math.round(pointer.worldX) + "(" + Math.round(pointer.worldX*100 / this.planckUnitsToPhaserUnitsRatio)/100 + ")");
		this.debugY.text('y: ' + Math.round(pointer.worldY) + "(" + Math.round((pointer.worldY*100 / this.planckUnitsToPhaserUnitsRatio))/100 * -1 + ")");
		this.debugScreenX.text('screen: ' + Math.round(pointer.x) + ', ' + Math.round(pointer.y));
		this.debugIsDown.text('isDown: ' + pointer.isDown);
		this.debugAngle.text('angle: ' + this.angle);


		//camera smoothing
		var curx = this.cameraTarget.x;
		var cury = this.cameraTarget.y;
		var targetx = curx;
		var targety = cury;
		var tolerance = 0.05;
		var mySpeed = 0.07;

		//decide what the target should be
		if(this.cameraMode === ClientConstants.CameraModes["CAMERA_MODE_SPECTATOR"] && this.gc.myCharacter === null) {
			targetx = this.spectatorCamera.x;
			targety = this.spectatorCamera.y;
			mySpeed = 0.15;
		}
		else if(this.cameraMode === ClientConstants.CameraModes["CAMERA_MODE_FOLLOW_CHARACTER"] && this.gc.myCharacter !== null) {
			targetx = this.gc.myCharacter.x;
			targety = this.gc.myCharacter.y;
		}
		else if(this.cameraMode === ClientConstants.CameraModes["CAMERA_MODE_DEATH_CAM"]) {
			this.deathCamTimer += dt;

			if(this.deathCamTimer >= this.deathCamTimerInterval) {
				this.deathCamTimer = 0;
				this.switchCameraMode(ClientConstants.CameraModes["CAMERA_MODE_SPECTATOR"]);
			}
		}
		else if (this.cameraMode === ClientConstants.CameraModes["CAMERA_MODE_SNIPER_AIMING"]) {
			var diffx = this.pointerFromCenterX - this.pointerFromCenterPrevX;
			var diffy = this.pointerFromCenterY - this.pointerFromCenterPrevY;

			if(this.cameraZoom <= this.sniperMaxZoomBreakpoint) {
				this.zoomMinorPansX += diffx / this.planckUnitsToPhaserUnitsRatio;
				this.zoomMinorPansY += diffy / this.planckUnitsToPhaserUnitsRatio * -1;
			} else {
				this.zoomMinorPansX += (diffx/2) / this.planckUnitsToPhaserUnitsRatio;
				this.zoomMinorPansY += (diffy/2) / this.planckUnitsToPhaserUnitsRatio * -1;
			}

			//character pos + anchor + mod
			targetx = this.frameCharacterPosX + this.zoomAnchorX + this.zoomMinorPansX;
			targety = this.frameCharacterPosY + this.zoomAnchorY + this.zoomMinorPansY;
			mySpeed = 1.00;
		}
		else if(this.cameraMode === ClientConstants.CameraModes["CAMERA_MODE_SNIPER_EXIT"]) {
			//snap the camera back to character in 1 frame
			if(this.gc.myCharacter !== null) {
				
				targetx= this.gc.myCharacter.x;
				targety = this.gc.myCharacter.y;
			}
			mySpeed = 1.00;
			this.cameraZoom = this.cameraZoomBeforeSniper;
			this.setCameraZoom();

			this.switchCameraMode(ClientConstants.CameraModes["CAMERA_MODE_FOLLOW_CHARACTER"]);
		}
		else if(this.cameraMode === ClientConstants.CameraModes["CAMERA_MODE_SNIPER_ENTER"]) {
			//calculate the zoom anchor
			this.zoomAnchorX = (this.pointerFromCenterX * ((1 / this.cameraZoom) - (1 / this.sniperDefaultZoomLevel))) / this.planckUnitsToPhaserUnitsRatio;
			this.zoomAnchorY = (this.pointerFromCenterY * ((1 / this.cameraZoom) - (1 / this.sniperDefaultZoomLevel))) / this.planckUnitsToPhaserUnitsRatio * -1;

			//reset the minor pans
			this.zoomMinorPansX = 0;
			this.zoomMinorPansY = 0;
			
			targetx = this.frameCharacterPosX + this.zoomAnchorX;
			targety = this.frameCharacterPosY + this.zoomAnchorY;
			mySpeed = 1.00;

			this.cameraZoomBeforeSniper = this.cameraZoom;
			if(this.cameraZoom < this.sniperDefaultZoomLevel) {
				this.cameraZoom = this.sniperDefaultZoomLevel;
				this.setCameraZoom();
			}

			this.switchCameraMode(ClientConstants.CameraModes["CAMERA_MODE_SNIPER_AIMING"]);
		}


		//actually move the camera
		//slowly pan the camera on character
		var actualx = curx;
		var actualy = cury;

		actualx = targetx;
		actualy = targety;

		//slowly pan to target
		if(curx <= targetx - tolerance || curx >= targetx + tolerance ) {
			actualx = ((targetx - curx) * mySpeed) + curx;
		}

		if(cury <= targety - tolerance || cury >= targety + tolerance ) {
			actualy = ((targety - cury) * mySpeed) + cury;
		}
	
		this.cameraTarget.x = actualx;
		this.cameraTarget.y = actualy;
		
		this.cameras.main.scrollX = (this.cameraTarget.x * this.planckUnitsToPhaserUnitsRatio) - (this.scale.width/2);
		this.cameras.main.scrollY = ((this.cameraTarget.y * this.planckUnitsToPhaserUnitsRatio) * -1) - (this.scale.height/2);
	

		//update inputs
		this.playerController.update();
		this.prevAngle = this.angle;
		this.prevIsFiring = this.isFiring;
		this.prevIsFiringAlt = this.isFiringAlt;

		//update menus
		this.roundMenu.update(dt);
		this.respawnTimerMenu.update(dt);
		this.killFeedMenu.update(dt);
		this.controlPointMenu.update(dt);
		this.kothTimerMenu.update(dt);

		//save variables for next frame's calculations
		this.previousTick = this.currentTick;
		this.cameraZoomPrev = this.cameraZoom;
		this.pointerFromCenterPrevX = this.pointerFromCenterX;
		this.pointerFromCenterPrevY = this.pointerFromCenterY;
		this.frameNum++;
	}



	teamChanged(e) {
		//only call the respawnMenuFlow if the user is the client's user
		if(this.gc.myUserServerId!== null && e.detail.serverId === this.gc.myUserServerId) {
			this.respawnMenuFlowControl(false);
		}
	}

	//this function drives the process of team/class picker menu. Basically, it opens/closes the team/class picker based on if you belong to a team/have a class picked.
	//Its to guide the user through the respawning flow
	respawnMenuFlowControl(bFirstMenuFlow) {
		var spectatorTeam = this.gc.tm.getSpectatorTeam();
		var bStop = false;

		//special case. Do NOT open anything if:
		// - the username has "_spec" at the end (this is just so when I stream on twitch, the spectator cam is auto set for me)
		var specRegex = /_spec$/;
		if(specRegex.test(this.gc.myUser?.username)) {
			bStop = true;
			this.cameraZoom -= 0.3;
			this.setCameraZoom();
		}

		//open the team menu if:
		// - the player has first entered the game, but does not have a teamId
		if(!bStop && bFirstMenuFlow && (this.gc.myUser?.teamId === 0 || this.gc.myUser?.teamId === spectatorTeam.serverId)) {
			this.teamMenu.openMenu();
			bStop = true;
		}

		//open the class menu if:
		// - the player has first entered the game, has a teamId, but does not have a class
		// - the player has a teamId, but does not have a class
		if(!bStop) {
			if(bFirstMenuFlow && this.gc.myUser?.teamId !== spectatorTeam.serverId && this.gc.myUser?.characterClassResourceId === null) {
				this.characterClassMenu.openMenu();
				bStop = true;
			}
			else if(this.gc.myUser?.teamId !== spectatorTeam.serverId && this.gc.myUser?.characterClassResourceId === null) {
				this.characterClassMenu.openMenu();
				bStop = true;
			}
		}
	}
}

