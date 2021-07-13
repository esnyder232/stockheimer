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
import RespawnTimeMenu from "../ui-classes/respawn-timer-menu.js"
import KillFeedMenu from "../ui-classes/kill-feed-menu.js"
import RoundResultsMenu from "../ui-classes/round-results-menu.js"
import TeamScoreMenu from "../ui-classes/team-score-menu.js"

export default class MainScene extends Phaser.Scene {
	constructor() {
		super(config);
		this.globalfuncs = new GlobalFuncs();
		this.planckUnitsToPhaserUnitsRatio = 32;
		this.radiansToDegreesRatio = 180/3.14;
		
		this.userPhaserElements = []; //list of json objects that contain phaser specific graphic elements

		this.playerInputKeyboardMap = {};
		this.playerController = null;

		this.targetX = 0;
		this.targetY = 0;
		this.targetLine = null;
		this.targetLineGraphic = null;

		this.isFiring = false;
		this.isFiringAlt = false;
		this.prevIsFiring = false;
		this.prevIsFiringAlt = false;
		this.angle = 0;
		this.prevAngle = 0;
		this.angleSmallestDelta = 0.001;

		this.damageTexts = []; //little array of damage texts to popup when someone gets hurt
		this.gravestones = []; //array of gravestones to put on the game when characters die

		this.cameraTarget = {
			x: 0,
			y: 0
		}

		this.cameraZoom = 1.4;
		this.cameraZoomMax = 6;
		this.cameraZoomMin = 0.4;

		this.defaultCenter = {
			x: 32,
			y: -32
		}

		this.spectatorCamera = {
			x: 32,
			y: -32
		}

		// cameraMode = 0 means spectator mode
		// cameraMode = 1 means follow character
		// cameraMode = 2 means deathcam for 3 seconds
		this.cameraMode = 0; 
		this.deathCamTimer = 0;	//in ms, the amount of time stayed in death cam mode
		this.deathCamTimerInterval = 1500; //in ms, the amount of time to stay in death cam mode until you switch to spectator


		this.debugX = null;
		this.debugY = null;
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

		this.damageTextColor = "#000000";
		this.damageStrokeColor = "#ff0000";
		this.damageStrokeThickness = 2;

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

		this.tilesetArray = [];
		this.layerArray = [];
	}

	init(data) {
		console.log('init on ' + this.scene.key + ' start');
		
		this.gc = data.gc;
		
		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
			{event: 'exit-game-click', func: this.exitGameClick.bind(this)},
			{event: 'kill-character-click', func: this.killCharacterClick.bind(this)},
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
		this.debugIsDown = $("#debug-is-down");
		this.debugAngle = $("#debug-angle");

		//always hide the kill character button and show create button
		var killCharacterBtn = $("#kill-character");
		
		if(killCharacterBtn.length > 0)
		{
			killCharacterBtn.addClass("hide");
		}

		//created menus and small divs
		this.teamMenu = new TeamMenu();
		this.characterClassMenu = new CharacterClassMenu();
		this.chatMenu = new ChatMenu();
		this.chatMenuMinified = new ChatMenuMinified();
		this.userListMenu = new UserListMenu();
		this.roundMenu = new RoundMenu();
		this.respawnTimeMenu = new RespawnTimeMenu();
		this.killFeedMenu = new KillFeedMenu();
		this.roundResultsMenu = new RoundResultsMenu();
		this.teamScoreMenu = new TeamScoreMenu();
		

		this.teamMenu.init(this.gc);
		this.characterClassMenu.init(this.gc);
		this.chatMenu.init(this.gc);
		this.chatMenuMinified.init(this.gc);
		this.userListMenu.init(this.gc);
		this.roundMenu.init(this.gc);
		this.respawnTimeMenu.init(this.gc);
		this.killFeedMenu.init(this.gc);
		this.roundResultsMenu.init(this.gc);
		this.teamScoreMenu.init(this.gc);
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
		this.setCameraZoom();
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
				width: 1.5,
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
		this.respawnTimeMenu.activate();
		this.killFeedMenu.activate();
		this.roundResultsMenu.activate();
		this.teamScoreMenu.activate();

		//other things to create
		this.gc.mainScene.createMap();
		this.gc.debugMenu.populateAiControls();

		this.respawnMenuFlowControl(true);
	}

	createMap() {
		//create tilemap in phaser
		this.map = this.make.tilemap({key: this.gc.activeTilemap.key});

		//for each layer, create a tileset and a tile later in phaser
		for(var i = 0; i < this.gc.activeTilemap.data.tilesets.length; i++) {
			var ts = this.gc.activeTilemap.data.tilesets[i];

			//create tileset
			var newTileset = this.map.addTilesetImage(ts.name, ts.tilesetKey, ts.tilewidth, ts.tileheight, ts.margin, ts.spacing);

			//add tileset to the pile
			this.tilesetArray.push(newTileset);
		}

		for(var i = 0; i < this.gc.activeTilemap.data.layers.length; i++) {
			var l = this.gc.activeTilemap.data.layers[i];

			if(l.type === "tilelayer") {
				//create layer
				var xOffset = -(this.planckUnitsToPhaserUnitsRatio/2);
				var yOffset = -(this.planckUnitsToPhaserUnitsRatio/2);
				var newLayer = this.map.createLayer(l.name, this.tilesetArray, xOffset, yOffset).setScale(2);

				newLayer.setDepth(ClientConstants.PhaserDrawLayers.tilemapLayer)

				//add layer to the pile
				this.layerArray.push(newLayer);
			}
		}
	}

	

	setCameraZoom() {
		this.cameraZoom = this.cameraZoom >= this.cameraZoomMax ? this.cameraZoomMax : this.cameraZoom;
		this.cameraZoom = this.cameraZoom <= this.cameraZoomMin ? this.cameraZoomMin : this.cameraZoom;

		this.cameraZoom = Math.round(this.cameraZoom * 10)/10;

		this.cameras.main.setZoom(this.cameraZoom);
	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
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
		for(var i = this.gravestones.length - 1; i >= 0; i--)
		{
			if(this.gravestones[i].gravestoneImage !== null)
			{
				this.gravestones[i].gravestoneImage.destroy();
			}
			if(this.gravestones[i].gravestoneText !== null)
			{
				this.gravestones[i].gravestoneText.destroy();
			}
			this.gravestones.splice(i, 1);
		}

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

		this.teamMenu.deactivate();
		this.characterClassMenu.deactivate();
		this.chatMenu.deactivate();
		this.chatMenuMinified.deactivate();
		this.userListMenu.deactivate();
		this.roundMenu.deactivate();
		this.respawnTimeMenu.deactivate();
		this.killFeedMenu.deactivate();
		this.roundResultsMenu.deactivate();
		this.teamScoreMenu.deactivate();

		this.teamMenu.deinit();
		this.characterClassMenu.deinit();
		this.chatMenu.deinit();
		this.chatMenuMinified.deinit();
		this.userListMenu.deinit();
		this.roundMenu.deinit();
		this.respawnTimeMenu.deinit();
		this.killFeedMenu.deinit();
		this.roundResultsMenu.deinit();
		this.teamScoreMenu.deinit();

		//other stuff
		this.gc.debugMenu.clearAiControls();
	}

	exitGameClick() {
		this.gc.turnOnContextMenu();
		this.gc.gameState.exitGameClick();
	}

	switchCameraMode(mode)
	{
		console.log('switching camera mode');

		if(mode === 0) //0 - spectator mode
		{
			this.cameraMode = 0;
			this.spectatorCamera.x = this.defaultCenter.x;
			this.spectatorCamera.y = this.defaultCenter.y;
		}
		else if(mode === 1) //1 - follow character
		{
			this.cameraMode = 1;
		}
		else if (mode === 2) //2 - death cam
		{
			this.cameraMode = 2;
			this.deathCamTimer = 0;
		}
	}

	update(timeElapsed, dt) {
		var pointer = this.input.activePointer;
		var sendInputEvent = false;
		//console.log('dt ' + dt);
		//console.log("=== Client Framenum " + this.frameNum + " ===")

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


		//update round
		this.gc.theRound.update(dt);

		var teams = this.gc.tm.getTeams();
		for(var i = 0; i < teams.length; i++) {
			teams[i].update(dt);
		}

		//update users
		var activeUsers = this.gc.um.getActiveUsers();
		for(var i = 0; i < activeUsers.length; i++) {
			activeUsers[i].update(dt);
		}

		//update gameobjects
		var activeGameObjects = this.gc.gom.getActiveGameObjects();
		for(var i = 0; i < activeGameObjects.length; i++) {
			activeGameObjects[i].update(dt);
		}

		//if you control your character, read input and send it to the server if its dirty.
		if(this.gc.myCharacter !== null) {
			this.targetLineGraphic.clear();

			pointer.updateWorldPoint(this.cameras.main);

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
			
			Phaser.Geom.Line.SetToAngle(this.targetLine, x1, y1, this.angle, 100);

			this.targetLineGraphic.strokeLineShape(this.targetLine);

			//debugging text
			this.debugX.text('x: ' + Math.round(pointer.worldX) + "(" + Math.round(pointer.worldX*100 / this.planckUnitsToPhaserUnitsRatio)/100 + ")");
			this.debugY.text('y: ' + Math.round(pointer.worldY) + "(" + Math.round((pointer.worldY*100 / this.planckUnitsToPhaserUnitsRatio))/100 * -1 + ")");
			this.debugIsDown.text('isDown: ' + pointer.isDown);
			this.debugAngle.text('angle: ' + this.angle);

			//check to see if the user wants to fire a bullet
			if(pointer.leftButtonDown())
			{
				this.isFiring = true;
			}
			else
			{
				this.isFiring = false;
			}

			//firing alt
			if(pointer.rightButtonDown())
			{
				this.isFiringAlt = true;
			}
			else
			{
				this.isFiringAlt = false;
			}

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

		//camera smoothing
		var curx = this.cameraTarget.x;
		var cury = this.cameraTarget.y;
		var targetx = curx;
		var targety = cury;
		var actualx = curx;
		var actualy = cury;
		var tolerance = 0.05;
		var mySpeed = 0.07;

		//decide what the target should be
		if(this.cameraMode === 0 && this.gc.myCharacter === null)
		{
			targetx = this.spectatorCamera.x;
			targety = this.spectatorCamera.y;
			mySpeed = 0.15;
		}
		else if(this.cameraMode === 1 && this.gc.myCharacter !== null)
		{
			targetx = this.gc.myCharacter.x;
			targety = this.gc.myCharacter.y;
		}
		else if(this.cameraMode === 2)
		{
			this.deathCamTimer += dt;

			if(this.deathCamTimer >= this.deathCamTimerInterval)
			{
				this.deathCamTimer = 0;
				this.switchCameraMode(0);
			}
		}

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
		this.respawnTimeMenu.update(dt);
		this.killFeedMenu.update(dt);

		this.frameNum++;
	}

	killCharacterClick() {
		if(this.gc.myCharacter !== null)
		{
			this.gc.ep.insertClientToServerEvent({
				"eventName": "fromClientKillCharacter"
			});
		}
		$("#kill-character")[0].blur();
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

		//open the team menu if:
		// - the player has first entered the game, but does not have a teamId
		if(bFirstMenuFlow && this.gc.myUser.teamId === spectatorTeam.serverId) {
			this.teamMenu.openMenu();
			bStop = true;
		}

		//open the class menu if:
		// - the player has first entered the game, has a teamId, but does not have a class
		// - the player has a teamId, but does not have a class
		if(!bStop) {
			if(bFirstMenuFlow && this.gc.myUser.teamId !== spectatorTeam.serverId && this.gc.myUser.characterClassResourceId === null) {
				this.characterClassMenu.openMenu();
				bStop = true;
			}
			else if(this.gc.myUser.teamId !== spectatorTeam.serverId && this.gc.myUser.characterClassResourceId === null) {
				this.characterClassMenu.openMenu();
				bStop = true;
			}
		}
	}
}

