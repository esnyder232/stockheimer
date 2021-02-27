import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import config from '../client-config.json';
import PlayerController from "../classes/player-controller.js"
import ClientConstants from "../client-constants.js"

export default class MainScene extends Phaser.Scene {
	constructor() {
		super(config);
		this.globalfuncs = new GlobalFuncs();
		this.planckUnitsToPhaserUnitsRatio = 32;
		this.radiansToDegreesRatio = 180/3.14;
		
		this.userPhaserElements = []; //list of json objects that contain phaser specific graphic elements
		this.projectilePhaserElements = []; 

		this.playerInputKeyboardMap = {};
		this.playerController = null;

		//0 = "browser" mode
		//1 = "phaser" mode
		//When mode is "browser", the mouse is allowed to click on buttons, textboxes, scroll through stuff. The mouse events don't affect the gameplay.
		//When mode is "phaser", the mouse events get processed by the game, and mouse events become ignored by all ui elements in the browser.
		//For now, to switch modes, click "enter".
		this.currentPointerMode = 0;

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

		this.pvpEmoji = String.fromCharCode(0x2694, 0xFE0F);
		this.aiColor = 0xff0000;
		this.aiFillColor = 0xff6600;
		this.aiTextColor = "#000000";
		this.aiStrokeColor = "#ff0000";
		this.aiStrokeThickness = 3;

		this.userColor = 0x0000ff;
		this.userFillColor = 0x00ffff;
		this.userTextColor = "#0000ff";
		this.userStrokeColor = "#000000";
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

		this.characterBorderThickness = 3;

		this.castleGraphics = null;
	}

	init(data) {
		console.log('init on ' + this.scene.key + ' start');
		
		this.gc = data.gc;

		this.switchPointerMode(0); //switch to browser mode if it wasn't already
		
		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
			{event: 'exit-game-click', func: this.exitGameClick.bind(this)},
			{event: 'tb-chat-submit-click', func: this.tbChatSubmitClick.bind(this)},
			{event: 'create-character-click', func: this.createCharacterClick.bind(this)},
			{event: 'kill-character-click', func: this.killCharacterClick.bind(this)},
			{event: 'join-spectator-team', func: this.joinTeamClick.bind(this, 0)},
			{event: 'join-red-team', func: this.joinTeamClick.bind(this, 1)},
			{event: 'join-blue-team', func: this.joinTeamClick.bind(this, 2)},
			
			{event: 'spawn-enemy-player', func: this.spawnEnemyPlayer.bind(this)},
			{event: 'spawn-enemy-red', func: this.spawnEnemyRed.bind(this)},
			{event: 'toggle-pvp', func: this.togglePvp.bind(this)},
			{event: 'respawn-castle', func: this.respawnCastle.bind(this)}
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
		$("#tb-chat-input").on("keyup", this.tbChatInputKeyup.bind(this));

		//custom register on enter and stuff for pointer mode
		$("#tb-chat-input").on("click", this.chatInputClick.bind(this));
		$("#tb-enemy-password").on("click", this.passInputClick.bind(this));
		$("#ui-div").on("click", this.uiDivClick.bind(this));
		$(document).on("keyup", this.documentEnterClicked.bind(this));

		//custom registers on scroll
		$("#game-div").on("wheel", this.documentScroll.bind(this));

		//initialize castles (not sure if this actually need to be here lol)
		for(var i = 0; i < this.gc.castles.length; i++)
		{
			this.addCastle(this.gc.castles[i].id);
		}

		this.debugX = $("#debug-x");
		this.debugY = $("#debug-y");
		this.debugIsDown = $("#debug-is-down");
		this.debugAngle = $("#debug-angle");

		//always hide the kill character button and show create button
		var createCharacterBtn = $("#create-character");
		var killCharacterBtn = $("#kill-character");
		
		if(createCharacterBtn.length > 0)
		{
			createCharacterBtn.removeClass("hide");
		}
		if(killCharacterBtn.length > 0)
		{
			killCharacterBtn.addClass("hide");
		}
	}

	documentScroll(e) {

		if(this.gc.myCharacter !== null)
		{
			//browser mode
			if(this.currentPointerMode === 0)
			{
				//console.log('browser mode scroll');
				//do nothing
			}
			//phaser mode
			else if(this.currentPointerMode === 1)
			{
				e.stopPropagation();
				e.preventDefault();
	
				//scrolled down
				if(e.originalEvent.deltaY > 0)
				{
					this.cameraZoom -= 0.2;
					this.setCameraZoom();
				}
				//scrolled up
				else if(e.originalEvent.deltaY < 0)
				{
					this.cameraZoom += 0.2;
					this.setCameraZoom();
				}
			}
		}
		else
		{
			e.stopPropagation();
			e.preventDefault();

			//scrolled down
			if(e.originalEvent.deltaY > 0)
			{
				this.cameraZoom -= 0.2;
				this.setCameraZoom();
			}
			//scrolled up
			else if(e.originalEvent.deltaY < 0)
			{
				this.cameraZoom += 0.2;
				this.setCameraZoom();
			}
		}
	}

	chatInputClick(e) {
		return false; //make sure to return false here or the ui div will return the pointer mode to "phaser" 
	}

	passInputClick(e) {
		return false; //make sure to return false here or the ui div will return the pointer mode to "phaser" 
	}

	uiDivClick(e) {
		if(this.gc.myCharacter !== null)
		{
			this.switchPointerMode(1); //switch to phaser mode
		}
	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');

		//old path testing map
		// this.load.tilemapTiledJSON("my-tilemap", "assets/tilemaps/stockheimer-path-testing.json");
		// this.load.image("stockheimer-test-tileset-extruded", "assets/tilesets/stockheimer-test-tileset-extruded.png");
		// this.load.image("stockheimer-test-tileset-extra-extruded", "assets/tilesets/stockheimer-test-tileset-extra-extruded.png");

		// //"new" tech demo map
		// this.load.tilemapTiledJSON("my-tilemap", "assets/tilemaps/stockheimer-techdemo.json");
		// this.load.image("stockheimer-test-tileset-extruded", "assets/tilesets/stockheimer-test-tileset-extruded.png");
		
		// //other assets
		// this.load.image("gravestone", "assets/sprites/gravestone.png");
		// this.load.image("castle", "assets/sprites/castle.png");
	}

	create() {
		console.log('create on ' + this.scene.key + ' start');
		$("#main-scene-root").removeClass("hide");
		$(".main-scene-buttons").removeClass("hide");


		//old path testing map
		// //load tilemap
		// this.map = this.make.tilemap({key: "my-tilemap"});

		// //load tileset
		// this.tileset = this.map.addTilesetImage("stockheimer-test-tileset-extruded", "stockheimer-test-tileset-extruded", 16, 16, 10, 20);
		// this.tilesetExtra = this.map.addTilesetImage("stockheimer-test-tileset-extra-extruded", "stockheimer-test-tileset-extra-extruded", 16, 16, 10, 20);
		
		// //create layers
		// var xOffset = -(this.planckUnitsToPhaserUnitsRatio/2);
		// var yOffset = -(this.planckUnitsToPhaserUnitsRatio/2);
		// this.layer1 = this.map.createLayer("Tile Layer 1", [this.tileset, this.tilesetExtra], xOffset, yOffset).setScale(2);


		this.cameras.main.setZoom(this.cameraZoom);
		this.cameras.main.scrollX = 0;
		this.cameras.main.scrollY = 0;

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
		this.targetLineGraphic.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);

		this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
			//scrolled down
			if(deltaY > 0)
			{
				this.cameraZoom -= 0.1;
				this.setCameraZoom();
			}
			//scrolled up
			else if(deltaY < 0)
			{
				this.cameraZoom += 0.1;
				this.setCameraZoom();
			}

			return true;
		});

		

		//this.cameras.main.roundPixels = true;
		this.cameras.main.setRoundPixels(true);
	}

	createMap() {
		this.map = this.make.tilemap({key: "my-tilemap"});

		//load tileset
		this.tileset = this.map.addTilesetImage("stockheimer-test-tileset-extruded", "stockheimer-test-tileset-extruded", 16, 16, 2, 4);
		
		//create layers
		var xOffset = -(this.planckUnitsToPhaserUnitsRatio/2);
		var yOffset = -(this.planckUnitsToPhaserUnitsRatio/2);
		this.layer1 = this.map.createLayer("Tile Layer 1", this.tileset, xOffset, yOffset).setScale(2);

		this.layer1.setDepth(ClientConstants.PhaserDrawLayers.tilemapLayer)
	}

	setCameraZoom() {
		this.cameraZoom = this.cameraZoom >= this.cameraZoomMax ? this.cameraZoomMax : this.cameraZoom;
		this.cameraZoom = this.cameraZoom <= this.cameraZoomMin ? this.cameraZoomMin : this.cameraZoom;

		this.cameraZoom = Math.round(this.cameraZoom * 10)/10;
		this.cameras.main.setZoom(this.cameraZoom);

		//console.log(this.cameraZoom);
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


		$("#tb-chat-input").off("keyup");
		$("#tb-chat-input").off("click");
		$("#tb-enemy-password").off("click");
		$("#ui-div").off("click");
		$(document).off("keyup");
		$("#game-div").off("wheel");

		$("#main-scene-root").addClass("hide");
		$(".main-scene-buttons").addClass("hide");

		if(this.playerController !== null)
		{
			this.playerController.shutdown();
		}
	}

	exitGameClick() {
		this.gc.turnOnContextMenu();
		this.switchPointerMode(0); //switch to browser mode
		this.gc.gameState.exitGameClick();
	}



	switchPointerMode(mode)
	{
		console.log('switching pointer mode');
		if(mode === 1) //1 - phaser mode
		{
			this.currentPointerMode = 1;
			$("#tb-chat-input").attr('placeholder','Hit enter to chat');
			$("#ui-div").addClass("ignore-pointer-events");

			this.gc.turnOffContextMenu();
		}
		else //0 - browser mode
		{
			this.currentPointerMode = 0;
			$("#tb-chat-input").attr('placeholder','Chat message');
			$("#ui-div").removeClass("ignore-pointer-events");

			this.gc.turnOnContextMenu();
		}
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
		var sendInputEvent = false;
		//console.log('dt ' + dt);

		//update any dmg texts
		for(var i = this.damageTexts.length - 1; i >= 0; i--)
		{
			this.damageTexts[i].countdownTimer -= dt;
			if(this.damageTexts[i].countdownTimer <= 0)
			{
				if(this.damageTexts[i].textGraphics !== null)
				{
					this.damageTexts[i].textGraphics.destroy();
				}
				this.damageTexts.splice(i, 1);
			}
		}

		//update any gravestone timers
		for(var i = this.gravestones.length - 1; i >= 0; i--)
		{
			this.gravestones[i].countdownTimer -= dt;
			if(this.gravestones[i].countdownTimer <= 0)
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
		}


		//update any projectiles on the client side (no longer update driven from server side)
		for(var i = 0; i < this.projectilePhaserElements.length; i++)
		{
			var ppu = this.projectilePhaserElements[i];

			ppu.x += ppu.xSpeedPhaser * (dt/1000);
			ppu.y += ppu.ySpeedPhaser * (dt/1000);

			ppu.boxGraphics.setX(ppu.x);
			ppu.boxGraphics.setY(ppu.y);
		}

		//if you control your character, read input and send it to the server if its dirty.
		if(this.gc.myCharacter !== null)
		{
			//if pointer mode is "phaser", capture the mouse position and update turret drawing
			if(this.currentPointerMode === 1) //phaser mode
			{
				var pointer = this.input.activePointer;

				this.targetLineGraphic.clear();

				pointer.updateWorldPoint(this.cameras.main);

				//redraw the target line
				var x1 = this.gc.myCharacter.x * this.planckUnitsToPhaserUnitsRatio;
				var y1 = this.gc.myCharacter.y * this.planckUnitsToPhaserUnitsRatio * -1;
				var x2 = pointer.worldX;
				var y2 = pointer.worldY;

				this.targetLine.x1 = x1;
				this.targetLine.y1 = y1;

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
			if((this.isFiring || this.isFiringAlt) && Math.abs(this.angle - this.prevAngle) >= this.angleSmallestDelta)
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

		//update camera position
		if(this.cameraMode === 0 && this.gc.myCharacter === null)
		{
			this.cameraTarget.x = this.spectatorCamera.x;
			this.cameraTarget.y = this.spectatorCamera.y;
		}
		else if(this.cameraMode === 1 && this.gc.myCharacter !== null)
		{
			this.cameraTarget.x = this.gc.myCharacter.x;
			this.cameraTarget.y = this.gc.myCharacter.y;
		}
		else if(this.cameraMode === 2)
		{
			this.deathCamTimer += dt;
			// this.cameraTarget.x = this.defaultCenter.x;
			// this.cameraTarget.y = this.defaultCenter.y;

			if(this.deathCamTimer >= this.deathCamTimerInterval)
			{
				this.deathCamTimer = 0;
				this.switchCameraMode(0);
			}
		}

		this.cameras.main.scrollX = (this.cameraTarget.x * this.planckUnitsToPhaserUnitsRatio) - (this.scale.width/2);
		this.cameras.main.scrollY = ((this.cameraTarget.y * this.planckUnitsToPhaserUnitsRatio) * -1) - (this.scale.height/2);

		//update inputs
		this.playerController.update();
		this.prevAngle = this.angle;
		this.prevIsFiring = this.isFiring;
		this.prevIsFiringAlt = this.isFiringAlt;

		this.frameNum++;
	}


	//use this to enter "browser" pointer mode and focus on the chat input box
	documentEnterClicked(e) {
		//If the user clicks enter, focus on the chat input box, and turn the pointer mode into phaser mode
		if((e.code == "NumpadEnter" || e.code == "Enter")) {
			$("#tb-chat-input").focus();
			this.switchPointerMode(0); //switch to browser mode
		}

		return true;
	}

	tbChatInputKeyup(e) {
		//If the user clicks enter, click the play button if its enabled.
		if((e.code == "NumpadEnter" || e.code == "Enter")) {
			this.tbChatSubmitClick();
			return false; //don't allow it to propogate. Otherwise the pointer mode will turn back into phaser mode
		}

		return true;
	}



	tbChatSubmitClick() {
		var chatMsg = "";
		var tbChatInput = $("#tb-chat-input");

		chatMsg = tbChatInput.val();

		if(chatMsg !== "")
		{
			tbChatInput.val("");

			this.gc.ep.insertClientToServerEvent({
				"eventName": "fromClientChatMessage",
				"chatMsg": chatMsg
			});
		}
		//if chat was blank, and they hit enter, AND they have a character to control, then switch pointer mode back to "phaser"
		if(this.gc.myCharacter !== null)
		{
			this.switchPointerMode(1); //switch to phaser mode
			tbChatInput[0].blur();
		}
	
	}


	createCharacterClick() {
		if(this.gc.myCharacter === null)
		{
			this.gc.ep.insertClientToServerEvent({
				"eventName": "fromClientSpawnCharacter"
			});
		}
		$("#create-character")[0].blur();
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


	//READS:
	//images manager

	//WRITES:
	//images manager
	//maybe main scene
	addProjectile(e) {
		var p = this.gc.projectiles.find((x) => {return x.id === e.id;});
		if(p)
		{
			var boxGraphics = this.add.graphics();

			boxGraphics.lineStyle(1, this.projectileColor, 1);
			boxGraphics.moveTo(-p.size * this.planckUnitsToPhaserUnitsRatio, -p.size * this.planckUnitsToPhaserUnitsRatio); //top left
			boxGraphics.lineTo(p.size * this.planckUnitsToPhaserUnitsRatio, -p.size * this.planckUnitsToPhaserUnitsRatio); //top right
			boxGraphics.lineTo(p.size * this.planckUnitsToPhaserUnitsRatio, p.size * this.planckUnitsToPhaserUnitsRatio); //bottom right
			boxGraphics.lineTo(-p.size * this.planckUnitsToPhaserUnitsRatio, p.size * this.planckUnitsToPhaserUnitsRatio); //bottom left
			boxGraphics.lineTo(-p.size * this.planckUnitsToPhaserUnitsRatio, -p.size * this.planckUnitsToPhaserUnitsRatio); //top left

			boxGraphics.closePath();
			boxGraphics.strokePath();

			//calculate the xSpeed and ySpeed components (in phaser units)
			var xSpeedPhaser = (p.speed * this.planckUnitsToPhaserUnitsRatio) * Math.cos(p.angle);
			var ySpeedPhaser = (p.speed * this.planckUnitsToPhaserUnitsRatio) * Math.sin(p.angle);

			var ppu = {
				id: p.id,
				x: p.x * this.planckUnitsToPhaserUnitsRatio,
				y: p.y * this.planckUnitsToPhaserUnitsRatio * -1,
				angle: p.angle,
				boxGraphics: boxGraphics,
				speed: p.speed,
				xSpeedPhaser: xSpeedPhaser,
				ySpeedPhaser: ySpeedPhaser
			}

			boxGraphics.setX(ppu.x);
			boxGraphics.setY(ppu.y);

			boxGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);

			this.projectilePhaserElements.push(ppu);
		}
	}

	//READS:
	//none

	//WRITES:
	//images manager
	removeProjectile(e) {
		var p = this.gc.projectiles.find((x) => {return x.id === e.id});

		if(p)
		{
			var ppeIndex = this.projectilePhaserElements.findIndex((x) => {return x.id === p.id;});
			if(ppeIndex >= 0)
			{
				this.projectilePhaserElements[ppeIndex].boxGraphics.destroy();
				this.projectilePhaserElements.splice(ppeIndex, 1);
			}
		}
	}

	projectileUpdate(e) {
		var ppu = this.projectilePhaserElements.find((x) => {return x.id === e.id});

		if(ppu)
		{
			ppu.x = e.x;
			ppu.y = e.y;
			ppu.boxGraphics.setX(ppu.x * this.planckUnitsToPhaserUnitsRatio);
			ppu.boxGraphics.setY(ppu.y * this.planckUnitsToPhaserUnitsRatio * -1);
		}
	}


	//READS:
	//GOM
	//UM

	//WRITES:
	//image manager
	//text manager
	addCastle(id) {
		var c = this.gc.castles.find((x) => {return x.id === id;});
		if(c)
		{
			// var halfSize = c.size/2;
			// var boxGraphics = this.add.graphics();
			// boxGraphics.lineStyle(1, this.castleColor, 1);

			//box
			// boxGraphics.moveTo(-halfSize * this.planckUnitsToPhaserUnitsRatio, -halfSize * this.planckUnitsToPhaserUnitsRatio); //top left
			// boxGraphics.lineTo(halfSize * this.planckUnitsToPhaserUnitsRatio, -halfSize * this.planckUnitsToPhaserUnitsRatio); //top right
			// boxGraphics.lineTo(halfSize * this.planckUnitsToPhaserUnitsRatio, halfSize * this.planckUnitsToPhaserUnitsRatio); //bottom right
			// boxGraphics.lineTo(-halfSize * this.planckUnitsToPhaserUnitsRatio, halfSize * this.planckUnitsToPhaserUnitsRatio); //bottom left
			// boxGraphics.lineTo(-halfSize * this.planckUnitsToPhaserUnitsRatio, -halfSize * this.planckUnitsToPhaserUnitsRatio); //top left

			// boxGraphics.closePath();
			// boxGraphics.strokePath();
			
			// boxGraphics.setX(c.x * this.planckUnitsToPhaserUnitsRatio);
			// boxGraphics.setY(c.y * this.planckUnitsToPhaserUnitsRatio * -1);

			var usernameText = c.castleName;

			var textStyle = {
				color: this.castleTextColor, 
				fontSize: "18px",
				strokeThickness: this.castleStrokeThickness,
				stroke: this.castleStrokeColor
			}

			var textGraphics = this.add.text((c.x * this.planckUnitsToPhaserUnitsRatio)-18, (c.y * this.planckUnitsToPhaserUnitsRatio * -1) + 18 , usernameText, textStyle);
			var hpTextGraphics = this.add.text((c.x * this.planckUnitsToPhaserUnitsRatio)-18, (c.y * this.planckUnitsToPhaserUnitsRatio * -1) + 34 , c.castleHpCur + "/" + c.castleHpMax, textStyle);

//			boxGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
			textGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
			hpTextGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);

			//add castle image
			var castleImage = this.add.image((32 * this.planckUnitsToPhaserUnitsRatio), (-32 * this.planckUnitsToPhaserUnitsRatio * -1), "castle");
			castleImage.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
			castleImage.setScale(2, 2);

			this.userPhaserElements.push({
				id: c.id,
//				boxGraphics: boxGraphics,
				textGraphics: textGraphics,
				hpTextGraphics: hpTextGraphics,
				castleImage: castleImage
			});
		}
	}

	//READS:	
	//images manager

	//WRITES:
	//images manager
	removeCastle(id) {		
		var c = this.gc.castles.find((x) => {return x.id === id});

		if(c)
		{
			var upeIndex = this.userPhaserElements.findIndex((x) => {return x.id === c.id;});
			if(upeIndex >= 0)
			{
				//this.userPhaserElements[upeIndex].boxGraphics.destroy();
				this.userPhaserElements[upeIndex].textGraphics.destroy();
				this.userPhaserElements[upeIndex].hpTextGraphics.destroy();
				this.userPhaserElements[upeIndex].castleImage.destroy();
				
				this.userPhaserElements.splice(upeIndex, 1);
			}
		}
	}
	
	//READS:
	//sprite manager
	//GOM

	//WRITES:
	//text manager
	castleUpdate(e) {
		var upe = this.userPhaserElements.find((x) => {return x.id === e.id;});
		var c = this.gc.castles.find((x) => {return x.id === e.id});

		if(upe && c)
		{
			upe.hpTextGraphics.setText(c.castleHpCur + "/" + c.castleHpMax);
		}
	}


	//READS:
	//sprite manager
	//GOM
	
	//WRITES:
	//text manager
	castleDamage(e) {
		var upe = this.userPhaserElements.find((x) => {return x.id === e.id;});
		var c = this.gc.castles.find((x) => {return x.id === e.id});

		if(upe && c)
		{
			var dmgText = {
				textGraphics: null,
				countdownTimer: 750 //ms
			};

			var textStyle = {
				color: this.damageTextColor, 
				fontSize: "18px",
				strokeThickness: 1,
				stroke: this.damageTextColor
			}

			dmgText.textGraphics = this.add.text((c.x * this.planckUnitsToPhaserUnitsRatio)-10, (c.y * this.planckUnitsToPhaserUnitsRatio * -1)-28, "-" + e.damage, textStyle);

			this.damageTexts.push(dmgText)
		}
	}


	spawnEnemyPlayer() {
		this.fromClientSpawnEnemy("player");
	}

	spawnEnemyRed() {
		this.fromClientSpawnEnemy("red");
	}

	fromClientSpawnEnemy(spawnLocation) {
		this.gc.ep.insertClientToServerEvent({
			"eventName": "fromClientSpawnEnemy",
			"spawnLocation": spawnLocation
		});
	}

	togglePvp() {
		this.gc.ep.insertClientToServerEvent({
			"eventName": "fromClientTogglePvp"
		});
	}

	respawnCastle() {
		this.gc.ep.insertClientToServerEvent({
			"eventName": "fromClientSpawnEnemy",
			"spawnLocation": "respawnCastle"
		});
	}

	joinTeamClick(slotNum) {
		console.log('team clicked ' + slotNum);

		this.gc.ep.insertClientToServerEvent({
			"eventName": "fromClientJoinTeam",
			"slotNum": slotNum
		});
	}
}

