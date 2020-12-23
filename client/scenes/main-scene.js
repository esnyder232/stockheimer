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
		this.text1 = null;

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

		this.cameraDirty = false;

		this.defaultCenter = {
			x: 15 * this.planckUnitsToPhaserUnitsRatio,
			y: 15 * this.planckUnitsToPhaserUnitsRatio * -1
		}

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
			{event: 'spawn-stationary-enemy', func: this.spawnStationaryEnemy.bind(this)},
			{event: 'spawn-patrol-enemy', func: this.spawnPatrolEnemy.bind(this)},
			{event: 'spawn-seeking-enemy', func: this.spawnSeekingEnemy.bind(this)},
			{event: 'kill-all-enemies', func: this.killAllEnemies.bind(this)}
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
		$("#ui-div").on("click", this.uiDivClick.bind(this));
		$(document).on("keyup", this.documentEnterClicked.bind(this));

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
	}

	chatInputClick(e) {
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
		this.load.image("my-tileset", "assets/tilesets/stockheimer-test-tileset.png");
		this.load.image("my-tileset-extra", "assets/tilesets/stockheimer-test-tileset-extra.png");
	}

	create() {
		console.log('create on ' + this.scene.key + ' start');
		$("#main-scene-root").removeClass("hide");

		//load tilemap
		this.map = this.make.tilemap({key: "my-tilemap"});
		console.log('MAPPPPPP:')
		console.log(this)
		//load tileset
		this.tileset = this.map.addTilesetImage("testing-tileset", "my-tileset");
		this.tilesetExtra = this.map.addTilesetImage("stockheimer-test-tileset-extra", "my-tileset-extra");
		
		//create layers
		this.layer1 = this.map.createStaticLayer("Tile Layer 1", [this.tileset, this.tilesetExtra], 0, 0).setScale(2);
		//this.layer1 = this.map.createStaticLayer("Tile Layer 1", this.tilesetExtra, 0, 0);

		//this.map.setScale(3, 3);
		console.log(this);

		this.cameras.main.setZoom(1);
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

		this.text1 = this.add.text(600, 375, '', { fill: '#0000ff', fontSize: "22px"});


		//create walls for testing (hard coded just do i can move on)
		// this.groundGraphics = this.add.graphics();
		// this.groundGraphics.lineStyle(1, 0xff0000, 1.0);
		// this.yAxisGraphic.moveTo(-24 * this.planckUnitsToPhaserUnitsRatio, 19 * this.planckUnitsToPhaserUnitsRatio * -1);
		// this.yAxisGraphic.lineTo(24 * this.planckUnitsToPhaserUnitsRatio, 19 * this.planckUnitsToPhaserUnitsRatio * -1);
		// this.yAxisGraphic.lineTo(24 * this.planckUnitsToPhaserUnitsRatio, -17 * this.planckUnitsToPhaserUnitsRatio * -1);
		// this.yAxisGraphic.lineTo(-24 * this.planckUnitsToPhaserUnitsRatio, -17 * this.planckUnitsToPhaserUnitsRatio * -1);
		// this.yAxisGraphic.lineTo(-24 * this.planckUnitsToPhaserUnitsRatio, 19 * this.planckUnitsToPhaserUnitsRatio * -1);
		// this.yAxisGraphic.strokePath();

		//draw the trackign sensor for testing
		// this.trackingSensorGraphics = this.add.graphics();
		// this.trackingSensorGraphics.lineStyle(1, 0x00ff00, 1);
		// var trackingSensorCircle = new Phaser.Geom.Circle(0, 0, 10*this.planckUnitsToPhaserUnitsRatio);
		// this.trackingSensorGraphics.strokeCircleShape(trackingSensorCircle);


		//get the map and draw it (hard coded for now)		
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
		$("#ui-div").off("click");
		$(document).off("keyup");

		$("#main-scene-root").addClass("hide");

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
		console.log('adding box graphics');
		var c = this.gc.characters.find((x) => {return x.id === characterId;});
		if(c)
		{
			var halfSize = this.characterSize/2;
			var boxGraphics = this.add.graphics();
			boxGraphics.lineStyle(1, 0x0000ff, 1);
			boxGraphics.moveTo(-halfSize * this.planckUnitsToPhaserUnitsRatio, -halfSize * this.planckUnitsToPhaserUnitsRatio); //top left
			boxGraphics.lineTo(halfSize * this.planckUnitsToPhaserUnitsRatio, -halfSize * this.planckUnitsToPhaserUnitsRatio); //top right
			boxGraphics.lineTo(halfSize * this.planckUnitsToPhaserUnitsRatio, halfSize * this.planckUnitsToPhaserUnitsRatio); //bottom right
			boxGraphics.lineTo(-halfSize * this.planckUnitsToPhaserUnitsRatio, halfSize * this.planckUnitsToPhaserUnitsRatio); //bottom left
			boxGraphics.lineTo(-halfSize * this.planckUnitsToPhaserUnitsRatio, -halfSize * this.planckUnitsToPhaserUnitsRatio); //top left

			boxGraphics.closePath();
			boxGraphics.strokePath();
			
			boxGraphics.setX(c.x * this.planckUnitsToPhaserUnitsRatio);
			boxGraphics.setY(c.y * this.planckUnitsToPhaserUnitsRatio * -1);

			var u = this.gc.users.find((x) => {return x.userId === c.userId;});
			var usernameText = "???";
			if(u)
			{
				usernameText = u.username;
			}
			var textGraphics = this.add.text((c.x * this.planckUnitsToPhaserUnitsRatio)-18, (c.y * this.planckUnitsToPhaserUnitsRatio * -1) + 18 , usernameText, { fill: '#0000ff', fontSize: "38px"});
			var hpTextGraphics = this.add.text((c.x * this.planckUnitsToPhaserUnitsRatio)-18, (c.y * this.planckUnitsToPhaserUnitsRatio * -1) + 50 , c.hpCur + "/" + c.hpMax, { fill: '#0000ff', fontSize: "38px"});

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
			}
		}
	}

	switchPointerMode(mode)
	{
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
			upe.hpTextGraphics.setY((e.characterPosY * this.planckUnitsToPhaserUnitsRatio * -1) + 50)
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

			dmgText.textGraphics = this.add.text((c.x * this.planckUnitsToPhaserUnitsRatio)-18, (c.y * this.planckUnitsToPhaserUnitsRatio * -1)-18, "-" + e.damage, { fill: '#ff0000', fontSize: "38px"});

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


		//if pointer mode is "phaser", capture the mouse position and update turret drawing
		if(this.currentPointerMode === 1) //phaser mode
		{
			var pointer = this.input.activePointer;

			this.targetLineGraphic.clear();

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
			this.text1.setText([
				'x: ' + Math.round(pointer.worldX) + "(" + Math.round(pointer.worldX / this.planckUnitsToPhaserUnitsRatio) + ")",
				'y: ' + Math.round(pointer.worldY) + "(" + Math.round((pointer.worldY / this.planckUnitsToPhaserUnitsRatio)) * -1 + ")",
				'isDown: ' + pointer.isDown,
				'angle: ' + this.angle
			]);

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

			boxGraphics.lineStyle(1, 0x00ffff, 1);
			boxGraphics.moveTo(-p.size * this.planckUnitsToPhaserUnitsRatio, -p.size * this.planckUnitsToPhaserUnitsRatio); //top left
			boxGraphics.lineTo(p.size * this.planckUnitsToPhaserUnitsRatio, -p.size * this.planckUnitsToPhaserUnitsRatio); //top right
			boxGraphics.lineTo(p.size * this.planckUnitsToPhaserUnitsRatio, p.size * this.planckUnitsToPhaserUnitsRatio); //bottom right
			boxGraphics.lineTo(-p.size * this.planckUnitsToPhaserUnitsRatio, p.size * this.planckUnitsToPhaserUnitsRatio); //bottom left
			boxGraphics.lineTo(-p.size * this.planckUnitsToPhaserUnitsRatio, -p.size * this.planckUnitsToPhaserUnitsRatio); //top left

			boxGraphics.closePath();
			boxGraphics.strokePath();

			boxGraphics.setX(p.x * this.planckUnitsToPhaserUnitsRatio);
			boxGraphics.setY(p.y * this.planckUnitsToPhaserUnitsRatio * -1);
		
			this.projectilePhaserElements.push({
				id: p.id,
				x: p.x,
				y: p.y,
				angle: p.angle,
				boxGraphics: boxGraphics
			});
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


	spawnStationaryEnemy() {
		console.log('spawning stationary enemy');
		this.fromClientSpawnEnemy("stationary");
	}

	spawnPatrolEnemy() {
		console.log('spawning patrol enemy');
		this.fromClientSpawnEnemy("patrol");
	}

	spawnSeekingEnemy() {
		console.log('spawning seeeking enemy');
		this.fromClientSpawnEnemy("seeking");
	}

	killAllEnemies() {
		console.log('kill all enemies');
		this.fromClientKillAllEnemies();
	}

	fromClientSpawnEnemy(enemyType) {
		this.gc.wsh.clientToServerEvents.push({
			"eventName": "fromClientSpawnEnemy",
			"enemyType": enemyType
		});
	}

	fromClientKillAllEnemies() {
		this.gc.wsh.clientToServerEvents.push({
			"eventName": "fromClientKillAllEnemies"
		});
	}
}

