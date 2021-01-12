import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import config from '../client-config.json';
import PlayerController from "../classes/player-controller.js"

export default class MainScene extends Phaser.Scene {
	constructor() {
		super(config);
		this.globalfuncs = new GlobalFuncs();
		this.planckUnitsToPhaserUnitsRatio = 32;
		this.radiansToDegreesRatio = 180/3.14
		
		this.userDomElements = [];	//list of json objects that contain user spcific dom elements
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
		this.characterSize = 0.75;

		this.cameraTarget = {
			x: 0,
			y: 0
		}

		this.cameraZoom = 1.4;
		this.cameraZoomMax = 6;
		this.cameraZoomMin = 0.5;

		this.defaultCenter = {
			x: 15 ,
			y: -15
		}

		this.debugX = null;
		this.debugY = null;
		this.debugIsDown = null;
		this.debugAngle = null;

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
			
			// {event: 'spawn-stationary-enemy', func: this.spawnStationaryEnemy.bind(this)},
			// {event: 'spawn-patrol-enemy', func: this.spawnPatrolEnemy.bind(this)},
			// {event: 'spawn-castle-seek-enemy', func: this.spawnCastleSeekEnemy.bind(this)},

			{event: 'spawn-enemy-player', func: this.spawnEnemyPlayer.bind(this)},
			{event: 'spawn-enemy-red', func: this.spawnEnemyRed.bind(this)},
			{event: 'make-enemies-seek-castle', func: this.makeEnemiesSeekCastle.bind(this)},
			{event: 'make-enemies-seek-player', func: this.makeEnemiesSeekPlayer.bind(this)},
			{event: 'make-enemies-stop', func: this.makeEnemiesStop.bind(this)},
			{event: 'kill-all-enemies', func: this.killAllEnemies.bind(this)},
			{event: 'toggle-pvp', func: this.togglePvp.bind(this)},
			{event: 'respawn-castle', func: this.respawnCastle.bind(this)},
			{event: 'destroy-castle', func: this.destroyCastle.bind(this)}
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
		$("#game-div").on("mousewheel", this.documentScroll.bind(this));

		//initialize userlist
		for(var i = 0; i < this.gc.users.length; i++)
		{
			this.addUser(this.gc.users[i]. userId);
		}

		//initialize active characters on screen
		for(var i = 0; i < this.gc.characters.length; i++)
		{
			this.addActiveCharacter(this.gc.characters[i].id);
		}

		//initialize castles (not sure if this actually need to be here lol)
		for(var i = 0; i < this.gc.castles.length; i++)
		{
			this.addCastle(this.gc.castles[i].id);
		}

		this.debugX = $("#debug-x");
		this.debugY = $("#debug-y");
		this.debugIsDown = $("#debug-is-down");
		this.debugAngle = $("#debug-angle");
	}

	documentScroll(e) {
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
				this.cameraZoom -= 0.1;
				this.setCameraZoom();
			}
			//scrolled up
			else if(e.originalEvent.deltaY < 0)
			{
				this.cameraZoom += 0.1;
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
		this.load.tilemapTiledJSON("my-tilemap", "assets/tilemaps/stockheimer-path-testing.json");
		this.load.image("stockheimer-test-tileset-extruded", "assets/tilesets/stockheimer-test-tileset-extruded.png");
		this.load.image("stockheimer-test-tileset-extra-extruded", "assets/tilesets/stockheimer-test-tileset-extra-extruded.png");
	}

	create() {
		console.log('create on ' + this.scene.key + ' start');
		$("#main-scene-root").removeClass("hide");
		$(".main-scene-buttons").removeClass("hide");

		//load tilemap
		this.map = this.make.tilemap({key: "my-tilemap"});

		//load tileset
		this.tileset = this.map.addTilesetImage("stockheimer-test-tileset-extruded", "stockheimer-test-tileset-extruded", 16, 16, 1, 2);
		this.tilesetExtra = this.map.addTilesetImage("stockheimer-test-tileset-extra-extruded", "stockheimer-test-tileset-extra-extruded", 16, 16, 1, 2);
		
		//create layers
		var xOffset = -(this.planckUnitsToPhaserUnitsRatio/2);
		var yOffset = -(this.planckUnitsToPhaserUnitsRatio/2);
		this.layer1 = this.map.createStaticLayer("Tile Layer 1", [this.tileset, this.tilesetExtra], xOffset, yOffset).setScale(2);

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

		// this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
		// 	//scrolled down
		// 	if(deltaY > 0)
		// 	{
		// 		this.cameraZoom -= 0.1;
		// 		this.setCameraZoom();
		// 	}
		// 	//scrolled up
		// 	else if(deltaY < 0)
		// 	{
		// 		this.cameraZoom += 0.1;
		// 		this.setCameraZoom();
		// 	}

		// 	return true;
		// });
	}

	setCameraZoom() {
		console.log(this.cameraZoom);
		this.cameraZoom = this.cameraZoom >= this.cameraZoomMax ? this.cameraZoomMax : this.cameraZoom;
		this.cameraZoom = this.cameraZoom <= this.cameraZoomMin ? this.cameraZoomMin : this.cameraZoom;
		this.cameras.main.setZoom(this.cameraZoom);
	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);
		
		//clear out all userDomElements
		for(var i = this.userDomElements.length - 1; i >= 0; i--)
		{
			this.removeUser(this.userDomElements[i].userId);
		}

		//clear out damage texts
		//update any dmg texts
		for(var i = this.damageTexts.length - 1; i >= 0; i--)
		{
			if(this.damageTexts[i].textGraphics !== null)
			{
				this.damageTexts[i].textGraphics.destroy();
			}
			this.damageTexts.splice(i, 1);
		}

		$("#tb-chat-input").off("keyup");
		$("#tb-chat-input").off("click");
		$("#tb-enemy-password").off("click");
		$("#ui-div").off("click");
		$(document).off("keyup");
		$("#game-div").off("mousewheel");

		

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

	userConnected(userId) {
		this.addUser(userId);
	}

	
	userDisconnected(userId) {
		this.removeUser(userId);
	}

	existingUser(userId) {
		this.addUser(userId);
	}

	addUser(userId)
	{
		var u = this.gc.users.find((x) => {return x.userId == userId;});

		if(u) 
		{
			var userList = $("#user-list");
			var userListItemTemplate = $("#user-list-item-template");
			
			var newUser = userListItemTemplate.clone();
			newUser.removeClass("hide");
			newUser.text("(kills: " + u.userKillCount + ") - " + u.username);
	
			userList.append(newUser);
	
			this.userDomElements.push({
				userId: u.userId,
				activeUserId: u.activeUserId,
				userListItem: newUser
			});
		}
		
		var userCountDiv = $("#user-list-player-count");
		userCountDiv.text("Players: " + this.gc.users.length + "/32");
	}

	addActiveCharacter(characterId) {
		var c = this.gc.characters.find((x) => {return x.id === characterId;});
		if(c)
		{
			var halfSize = this.characterSize/2;
			var boxGraphics = this.add.graphics();
			boxGraphics.lineStyle(1, 0x0000ff, 1);

			//box
			// boxGraphics.moveTo(-halfSize * this.planckUnitsToPhaserUnitsRatio, -halfSize * this.planckUnitsToPhaserUnitsRatio); //top left
			// boxGraphics.lineTo(halfSize * this.planckUnitsToPhaserUnitsRatio, -halfSize * this.planckUnitsToPhaserUnitsRatio); //top right
			// boxGraphics.lineTo(halfSize * this.planckUnitsToPhaserUnitsRatio, halfSize * this.planckUnitsToPhaserUnitsRatio); //bottom right
			// boxGraphics.lineTo(-halfSize * this.planckUnitsToPhaserUnitsRatio, halfSize * this.planckUnitsToPhaserUnitsRatio); //bottom left
			// boxGraphics.lineTo(-halfSize * this.planckUnitsToPhaserUnitsRatio, -halfSize * this.planckUnitsToPhaserUnitsRatio); //top left

			//circle
			boxGraphics.beginPath();
			boxGraphics.arc(0, 0, this.planckUnitsToPhaserUnitsRatio * 0.375, 0, Math.PI*2, false, 0.01);

			boxGraphics.closePath();
			boxGraphics.strokePath();
			
			boxGraphics.setX(c.x * this.planckUnitsToPhaserUnitsRatio);
			boxGraphics.setY(c.y * this.planckUnitsToPhaserUnitsRatio * -1);

			var usernameText = "???";
			if(c.ownerType === "user")
			{
				var u = this.gc.users.find((x) => {return x.userId === c.ownerId;});
				
				if(u)
				{
					usernameText = u.username;
				}
			}
			else if(c.ownerType === "ai")
			{
				usernameText = "AI " + c.ownerId
			}
			
			var textStyle = {
				color: '#0000ff', 
				fontSize: "18px",
				strokeThickness: 1,
				stroke: '#0000ff'
			}

			var textGraphics = this.add.text((c.x * this.planckUnitsToPhaserUnitsRatio)-18, (c.y * this.planckUnitsToPhaserUnitsRatio * -1) + 18 , usernameText, textStyle);
			var hpTextGraphics = this.add.text((c.x * this.planckUnitsToPhaserUnitsRatio)-18, (c.y * this.planckUnitsToPhaserUnitsRatio * -1) + 34 , c.hpCur + "/" + c.hpMax, textStyle);

			this.userPhaserElements.push({
				characterId: c.id,
				activeCharacterId: c.activeId,
				boxGraphics: boxGraphics,
				textGraphics: textGraphics,
				hpTextGraphics: hpTextGraphics
			});

			//check if this is your character your controlling. If it is, then switch pointer modes
			if(this.gc.c !== null && this.gc.myCharacter !== null && c.id === this.gc.myCharacter.id)
			{
				this.switchPointerMode(1); //switch to phaser mode
				var createCharacterBtn = $("#create-character");
				var killCharacterBtn = $("#kill-character");

				if(createCharacterBtn.length > 0)
				{
					createCharacterBtn.addClass("hide");
				}
				if(killCharacterBtn.length > 0)
				{
					killCharacterBtn.removeClass("hide");
				}
			}
		}
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




	removeActiveCharacter(characterId) {
		var c = this.gc.characters.find((x) => {return x.id === characterId});

		if(c)
		{
			var upeIndex = this.userPhaserElements.findIndex((x) => {return x.characterId === c.id;});
			if(upeIndex >= 0)
			{
				this.userPhaserElements[upeIndex].boxGraphics.destroy();
				this.userPhaserElements[upeIndex].textGraphics.destroy();
				this.userPhaserElements[upeIndex].hpTextGraphics.destroy();
				
				this.userPhaserElements.splice(upeIndex, 1);

				//check if this is your character your controlling. If it is, then switch pointer modes
				if(this.gc.c !== null && this.gc.myCharacter !== null && c.id === this.gc.myCharacter.id)
				{
					this.switchPointerMode(0); //switch to browser mode

					//also destroy the target line
					this.targetLineGraphic.clear();

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
			}
		}
	}

	activeCharacterUpdate(e) {
		var upe = this.userPhaserElements.find((x) => {return x.activeCharacterId === e.activeCharacterId;});
		var c = this.gc.characters.find((x) => {return x.activeId === e.activeCharacterId});

		if(upe && c)
		{
			upe.boxGraphics.setX(e.characterPosX * this.planckUnitsToPhaserUnitsRatio);
			upe.boxGraphics.setY(e.characterPosY * this.planckUnitsToPhaserUnitsRatio * -1);
			upe.textGraphics.setX((e.characterPosX * this.planckUnitsToPhaserUnitsRatio)-18)
			upe.textGraphics.setY((e.characterPosY * this.planckUnitsToPhaserUnitsRatio * -1) + 18)

			upe.hpTextGraphics.setX((e.characterPosX * this.planckUnitsToPhaserUnitsRatio)-18)
			upe.hpTextGraphics.setY((e.characterPosY * this.planckUnitsToPhaserUnitsRatio * -1) + 34)
			upe.hpTextGraphics.setText(c.hpCur + "/" + c.hpMax);

		}
	}

	characterDamage(e) {
		var upe = this.userPhaserElements.find((x) => {return x.activeCharacterId === e.activeCharacterId;});
		var c = this.gc.characters.find((x) => {return x.activeId === e.activeCharacterId});

		if(upe && c)
		{
			var dmgText = {
				textGraphics: null,
				countdownTimer: 750 //ms
			};

			var textStyle = {
				color: '#ff0000', 
				fontSize: "18px",
				strokeThickness: 1,
				stroke: '#ff0000'
			}

			dmgText.textGraphics = this.add.text((c.x * this.planckUnitsToPhaserUnitsRatio)-18, (c.y * this.planckUnitsToPhaserUnitsRatio * -1)-18, "-" + e.damage, textStyle);

			this.damageTexts.push(dmgText)
		}
	}

	updateUserInfo(e) {
		var u = this.gc.users.find((x) => {return x.userId === e.userId});
		var ude = this.userDomElements.find((x) => {return x.userId === e.userId;});

		if(ude && u)
		{
			var myText = "(kills: " + u.userKillCount + ") - " + u.username;
			ude.userListItem.text(myText);
		}
	}

	removeUser(userId) {
		var udeIndex = this.userDomElements.findIndex((x) => {return x.userId == userId;});
		
		if(udeIndex >= 0)
		{
			//remove dom elements
			this.userDomElements[udeIndex].userListItem.remove();

			//remove the user itself from the list
			this.userDomElements.splice(udeIndex, 1);
		}
	
	}

	userDisconnectedPost() {
		var userCountDiv = $("#user-list-player-count");
		userCountDiv.text("Players: " + this.gc.users.length + "/32");
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

		//update any projectiles on the client side (no longer update driven from server side)
		for(var i = 0; i < this.projectilePhaserElements.length; i++)
		{
			var ppu = this.projectilePhaserElements[i];

			ppu.x += ppu.xSpeedPhaser * (dt/1000);
			ppu.y += ppu.ySpeedPhaser * (dt/1000);

			ppu.boxGraphics.setX(ppu.x);
			ppu.boxGraphics.setY(ppu.y);
		}


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
			this.gc.wsh.clientToServerEvents.push({
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

		//update camera position
		if(this.gc.myCharacter !== null)
		{
			this.cameraTarget.x = this.gc.myCharacter.x;
			this.cameraTarget.y = this.gc.myCharacter.y;
		}
		else
		{
			this.cameraTarget.x = this.defaultCenter.x;
			this.cameraTarget.y = this.defaultCenter.y;
		}

		this.cameras.main.scrollX = (this.cameraTarget.x * this.planckUnitsToPhaserUnitsRatio) - (this.scale.width/2);
		this.cameras.main.scrollY = ((this.cameraTarget.y * this.planckUnitsToPhaserUnitsRatio) * -1) - (this.scale.height/2);

		//update inputs
		this.playerController.update();
		this.prevAngle = this.angle;
		this.prevIsFiring = this.isFiring;
		this.prevIsFiringAlt = this.isFiringAlt;
	}


	//use this to enter "browser" pointer mode and focus on the chat input box
	documentEnterClicked(e) {
		//If the user clicks enter, focus on the chat input box, and turn the pointer mode into phaser mode
		if(this.currentPointerMode === 1 && (e.code == "NumpadEnter" || e.code == "Enter")) {
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

			this.gc.wsh.clientToServerEvents.push({
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


	fromServerChatMessage(e) {
		var chatHistory = $("#chat-history");
		var chatHistoryItemTemplate = $("#chat-history-item-template");
		var newChat = chatHistoryItemTemplate.clone();
		
		var newChatTs = newChat.find("div[name='chat-history-ts']");
		var newChatName = newChat.find("div[name='chat-history-name']");
		var newChatMsg = newChat.find("div[name='chat-history-msg']");


		var u = this.gc.users.find((x) => {return x.activeUserId == e.activeUserId;});
		var username = "???";
		if(u)
		{
			username = u.username;
		}

		var tsOptions = {
			hour: 'numeric',
			minute:'numeric',
			second:'numeric',
			hour12: false
		}
		var ts = new Intl.DateTimeFormat('en-US', tsOptions).format(Date.now())

		newChat.removeClass("hide");
		newChatTs.text(ts);
		newChatName.text(username + ": ");
		newChatMsg.text(e.chatMsg);

		chatHistory.append(newChat);

		//determine if you should scroll
		var chatMsgHeight = newChat.height();
		var scrollTop = chatHistory[0].scrollTop;
		var scrollHeight = chatHistory[0].scrollHeight;
		var chatHistoryHeight = chatHistory.height();
		
		//scroll if your close enough to the bottom of the chat, auto scroll
		if(scrollTop >= ((scrollHeight - chatHistoryHeight) - (chatMsgHeight * 3)))
		{
			chatHistory[0].scrollTop = chatHistory[0].scrollHeight;
		}
	}

	createCharacterClick() {
		if(this.gc.myCharacter === null)
		{
			this.gc.wsh.clientToServerEvents.push({
				"eventName": "fromClientSpawnCharacter"
			});
		}
		$("#create-character")[0].blur();
	}

	killCharacterClick() {
		if(this.gc.myCharacter !== null)
		{
			this.gc.wsh.clientToServerEvents.push({
				"eventName": "fromClientKillCharacter"
			});
		}
		$("#kill-character")[0].blur();
	}


	addProjectile(e) {
		var p = this.gc.projectiles.find((x) => {return x.id === e.id;});
		if(p)
		{
			var boxGraphics = this.add.graphics();

			boxGraphics.lineStyle(1, 0xff0000, 1);
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

			this.projectilePhaserElements.push(ppu);
		}
	}

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

	addCastle(id) {
		var c = this.gc.castles.find((x) => {return x.id === id;});
		if(c)
		{
			var halfSize = c.size/2;
			var boxGraphics = this.add.graphics();
			boxGraphics.lineStyle(1, 0x0000ff, 1);

			//box
			boxGraphics.moveTo(-halfSize * this.planckUnitsToPhaserUnitsRatio, -halfSize * this.planckUnitsToPhaserUnitsRatio); //top left
			boxGraphics.lineTo(halfSize * this.planckUnitsToPhaserUnitsRatio, -halfSize * this.planckUnitsToPhaserUnitsRatio); //top right
			boxGraphics.lineTo(halfSize * this.planckUnitsToPhaserUnitsRatio, halfSize * this.planckUnitsToPhaserUnitsRatio); //bottom right
			boxGraphics.lineTo(-halfSize * this.planckUnitsToPhaserUnitsRatio, halfSize * this.planckUnitsToPhaserUnitsRatio); //bottom left
			boxGraphics.lineTo(-halfSize * this.planckUnitsToPhaserUnitsRatio, -halfSize * this.planckUnitsToPhaserUnitsRatio); //top left

			boxGraphics.closePath();
			boxGraphics.strokePath();
			
			boxGraphics.setX(c.x * this.planckUnitsToPhaserUnitsRatio);
			boxGraphics.setY(c.y * this.planckUnitsToPhaserUnitsRatio * -1);

			var usernameText = c.castleName;

			var textStyle = {
				color: '#0000ff', 
				fontSize: "18px",
				strokeThickness: 1,
				stroke: '#0000ff'
			}

			var textGraphics = this.add.text((c.x * this.planckUnitsToPhaserUnitsRatio)-18, (c.y * this.planckUnitsToPhaserUnitsRatio * -1) + 18 , usernameText, textStyle);
			var hpTextGraphics = this.add.text((c.x * this.planckUnitsToPhaserUnitsRatio)-18, (c.y * this.planckUnitsToPhaserUnitsRatio * -1) + 34 , c.castleHpCur + "/" + c.castleHpMax, textStyle);

			this.userPhaserElements.push({
				id: c.id,
				boxGraphics: boxGraphics,
				textGraphics: textGraphics,
				hpTextGraphics: hpTextGraphics
			});
		}
	}

	removeCastle(id) {		
		var c = this.gc.castles.find((x) => {return x.id === id});

		if(c)
		{
			var upeIndex = this.userPhaserElements.findIndex((x) => {return x.id === c.id;});
			if(upeIndex >= 0)
			{
				this.userPhaserElements[upeIndex].boxGraphics.destroy();
				this.userPhaserElements[upeIndex].textGraphics.destroy();
				this.userPhaserElements[upeIndex].hpTextGraphics.destroy();
				
				this.userPhaserElements.splice(upeIndex, 1);
			}
		}
	}
	
	castleUpdate(e) {
		var upe = this.userPhaserElements.find((x) => {return x.id === e.id;});
		var c = this.gc.castles.find((x) => {return x.id === e.id});

		if(upe && c)
		{
			upe.hpTextGraphics.setText(c.castleHpCur + "/" + c.castleHpMax);
		}
	}

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
				color: '#ff0000', 
				fontSize: "18px",
				strokeThickness: 1,
				stroke: '#ff0000'
			}

			dmgText.textGraphics = this.add.text((c.x * this.planckUnitsToPhaserUnitsRatio)-18, (c.y * this.planckUnitsToPhaserUnitsRatio * -1)-18, "-" + e.damage, textStyle);

			this.damageTexts.push(dmgText)
		}
	}


	spawnEnemyPlayer() {
		console.log('spawning enemy at player');
		this.fromClientSpawnEnemy("player");
	}

	spawnEnemyRed() {
		console.log('spawning enemy at red');
		this.fromClientSpawnEnemy("red");
	}

	makeEnemiesSeekCastle() {
		console.log('making enemies seek castle');
		this.fromClientMakeEnemyBehavior("seek-castle");
	}

	makeEnemiesSeekPlayer() {
		console.log('making enemies seek player');
		this.fromClientMakeEnemyBehavior("seek-player");
	}

	makeEnemiesStop() {
		console.log('making enemies stop');
		this.fromClientMakeEnemyBehavior("stop");
	}

	killAllEnemies() {
		console.log('kill all enemies');
		this.fromClientKillAllEnemies();
	}

	fromClientSpawnEnemy(spawnLocation) {
		var pass = $("#tb-enemy-password").val();
		
		this.gc.wsh.clientToServerEvents.push({
			"eventName": "fromClientSpawnEnemy",
			"spawnLocation": spawnLocation,
			"enemyControlPass": pass
		});
	}

	fromClientMakeEnemyBehavior(enemyBehavior) {
		var pass = $("#tb-enemy-password").val();
		if(!pass)
			pass = "";
		
		this.gc.wsh.clientToServerEvents.push({
			"eventName": "fromClientEnemyBehavior",
			"enemyBehavior": enemyBehavior,
			"enemyControlPass": pass
		});
	}

	fromClientKillAllEnemies() {
		var pass = $("#tb-enemy-password").val();
		if(!pass)
			pass = "";

		this.gc.wsh.clientToServerEvents.push({
			"eventName": "fromClientKillAllEnemies",
			"enemyControlPass": pass
		});
	}

	togglePvp() {
		var pass = $("#tb-enemy-password").val();
		if(!pass)
			pass = "";

		this.gc.wsh.clientToServerEvents.push({
			"eventName": "fromClientTogglePvp",
			"enemyControlPass": pass
		});
	}

	respawnCastle() {
		var pass = $("#tb-enemy-password").val();
		if(!pass)
			pass = "";

		this.gc.wsh.clientToServerEvents.push({
			"eventName": "fromClientSpawnEnemy",
			"spawnLocation": "respawnCastle",
			"enemyControlPass": pass
		});
	}

	destroyCastle() {
		var pass = $("#tb-enemy-password").val();
		if(!pass)
			pass = "";

		this.gc.wsh.clientToServerEvents.push({
			"eventName": "fromClientSpawnEnemy",
			"spawnLocation": "destroyCastle",
			"enemyControlPass": pass
		});
	}
}

