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
			{event: 'kill-character-click', func: this.killCharacterClick.bind(this)}
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
	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
		$("#main-scene-root").removeClass("hide");

		this.cameras.main.setZoom(0.5);
		this.cameras.main.scrollX = -400;
		this.cameras.main.scrollY = -320;

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

		this.text1 = this.add.text(-400, -400, '', { fill: '#00ff00', fontSize: "44px"});


		//create a groudn for testing
		this.groundGraphics = this.add.graphics();;
		this.groundGraphics.lineStyle(1, 0xff0000, 1.0);
		this.yAxisGraphic.moveTo(-20 * this.planckUnitsToPhaserUnitsRatio, 5 * this.planckUnitsToPhaserUnitsRatio);
		this.yAxisGraphic.lineTo(20 * this.planckUnitsToPhaserUnitsRatio, 5 * this.planckUnitsToPhaserUnitsRatio);
		this.yAxisGraphic.strokePath();

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
			newUser.text(u.username);
	
			userList.append(newUser);
	
			
	
			this.userDomElements.push({
				userId: u.userId,
				activeUserId: u.activeUserId,
				userListItem: newUser
			});
		}
	}

	addActiveCharacter(characterId) {
		console.log('adding box graphics');
		var c = this.gc.characters.find((x) => {return x.id === characterId;});
		if(c)
		{
			var boxGraphics = this.add.graphics();
			boxGraphics.lineStyle(1, 0x00ff00, 1);
			boxGraphics.moveTo(-0.5 * this.planckUnitsToPhaserUnitsRatio, -0.5 * this.planckUnitsToPhaserUnitsRatio); //top left
			boxGraphics.lineTo(0.5 * this.planckUnitsToPhaserUnitsRatio, -0.5 * this.planckUnitsToPhaserUnitsRatio); //top right
			boxGraphics.lineTo(0.5 * this.planckUnitsToPhaserUnitsRatio, 0.5 * this.planckUnitsToPhaserUnitsRatio); //bottom right
			boxGraphics.lineTo(-0.5 * this.planckUnitsToPhaserUnitsRatio, 0.5 * this.planckUnitsToPhaserUnitsRatio); //bottom left
			boxGraphics.lineTo(-0.5 * this.planckUnitsToPhaserUnitsRatio, -0.5 * this.planckUnitsToPhaserUnitsRatio); //top left

			boxGraphics.closePath();
			boxGraphics.strokePath();

			boxGraphics.setX(c.x);
			boxGraphics.setY(c.y);

			//circle sensor
			var circleGraphics = this.add.graphics();
			circleGraphics.lineStyle(1, 0x00ff00, 1);
			var circle = new Phaser.Geom.Circle(0, 0, 5*this.planckUnitsToPhaserUnitsRatio);
			circleGraphics.strokeCircleShape(circle);

			var u = this.gc.users.find((x) => {return x.userId === c.userId;});
			var usernameText = "???";
			if(u)
			{
				usernameText = u.username;
			}
			var textGraphics = this.add.text(c.x, c.y + 18, usernameText, { fill: '#00ff00', fontSize: "38px"});

			this.userPhaserElements.push({
				characterId: c.id,
				activeCharacterId: c.activeId,
				boxGraphics: boxGraphics,
				circleGraphics: circleGraphics,
				textGraphics: textGraphics
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
				this.userPhaserElements[upeIndex].circleGraphics.destroy();
				
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
		if(upe)
		{
			upe.boxGraphics.setX(e.characterPosX * this.planckUnitsToPhaserUnitsRatio);
			upe.boxGraphics.setY(e.characterPosY * this.planckUnitsToPhaserUnitsRatio * -1);
			upe.textGraphics.setY((e.characterPosY * this.planckUnitsToPhaserUnitsRatio * -1) + 18)
			upe.textGraphics.setX((e.characterPosX * this.planckUnitsToPhaserUnitsRatio)-18)

			upe.circleGraphics.setX(e.characterPosX * this.planckUnitsToPhaserUnitsRatio);
			upe.circleGraphics.setY(e.characterPosY * this.planckUnitsToPhaserUnitsRatio * -1);
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
	  
	update(timeElapsed, dt) {
		var sendInputEvent = false;

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
				'x: ' + pointer.worldX,
				'y: ' + pointer.worldY,
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
		else
		{
			if(this.gc.myCharacter !== null)
			{
				this.switchPointerMode(1); //switch to phaser mode
				tbChatInput[0].blur();
			}
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



	// createWorld() {
	// 	console.log('creating world now');
		
	// 	for(var i = 0; i < this.world.length; i++)
	// 	{
	// 		var o = this.world[i];
	// 		o.planckGraphics = [];

	// 		for(var j = 0; j < o.fixtures.length; j++)
	// 		{
	// 			var f = o.fixtures[j];
	// 			switch(f.shapeType.toLowerCase())
	// 			{
	// 				case "polygon":
	// 				case "edge":
	// 					var tempLineGraphics = this.add.graphics();

	// 					tempLineGraphics.lineStyle(1, 0x00ff00, 1);
	// 					tempLineGraphics.moveTo(f.vertices[0].x, f.vertices[0].y);

	// 					for(var v = 1; v < f.vertices.length; v++)
	// 					{
	// 						tempLineGraphics.lineTo(f.vertices[v].x, f.vertices[v].y);
	// 					}

	// 					tempLineGraphics.closePath();
	// 					tempLineGraphics.strokePath();

	// 					tempLineGraphics.setX(o.x);
	// 					tempLineGraphics.setY(o.y);

	// 					o.planckGraphics.push(tempLineGraphics);

	// 					break;
	// 			}
	// 		}
	// 	}

	// 	console.log('creating world done');
	// }

	// processDeltas(deltas) {
	// 	//update x, y of all bodies in the world
	// 	for(var i = 0; i < this.world.length; i++)
	// 	{
	// 		var obj = this.world[i];
	// 		var myDelta = deltas.find((x) => {return x.id == obj.id});
	// 		if(myDelta)
	// 		{
	// 			//console.log('myDelta x, y: %s, %s', myDelta.x, myDelta.y);
	// 			var newx = myDelta.x * this.planckUnitsToPhaserUnitsRatio;
	// 			var newy = myDelta.y * this.planckUnitsToPhaserUnitsRatio * -1;
	// 			var newa = myDelta.a * -this.radiansToDegreesRatio;

	// 			for(var j = 0; j < obj.planckGraphics.length; j++)
	// 			{
	// 				obj.planckGraphics[j].setX(newx);
	// 				obj.planckGraphics[j].setY(newy);
	// 				obj.planckGraphics[j].setAngle(newa);
	// 			}
	// 		}
	// 	}
	// }

	// convertPlankToPhaserUnits() {
	// 	console.log('converting units now');
		
	// 	for(var i = 0; i < this.world.length; i++)
	// 	{
	// 		var o = this.world[i];
	// 		for(var j = 0; j < o.fixtures.length; j++)
	// 		{
	// 			var f = o.fixtures[j];
	// 			switch(f.shapeType.toLowerCase())
	// 			{
	// 				case "polygon":
	// 				case "edge":
	// 					for(var v = 0; v < f.vertices.length; v++)
	// 					{
	// 						f.vertices[v].x = f.vertices[v].x * this.planckUnitsToPhaserUnitsRatio;
	// 						f.vertices[v].y = f.vertices[v].y * this.planckUnitsToPhaserUnitsRatio * -1;
	// 					}						
	// 					break;
	// 			}
	// 		}

	// 		o.x = o.x * this.planckUnitsToPhaserUnitsRatio;
	// 		o.y = o.y * this.planckUnitsToPhaserUnitsRatio * -1;
	// 	}

	// 	console.log('converting units done');
	// }
}

