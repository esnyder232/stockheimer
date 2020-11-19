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

		this.playerInputKeyboardMap = {};
		this.playerController = {};
	}

	init(data) {
		console.log('init on ' + this.scene.key + ' start');
		
		this.gc = data.gc;
		
		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
			{event: 'exit-game-click', func: this.exitGameClick.bind(this)},
			{event: 'tb-chat-submit-click', func: this.tbChatSubmitClick.bind(this)}
		];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);
		
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

		//custom register on keyup
		$("#tb-chat-input").on("keyup", this.tbChatInputKeyup.bind(this));
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

		$("#main-scene-root").addClass("hide");
	}

	exitGameClick() {
		this.gc.gameState.exitGameClick();
	}

	userConnected(e) {
		this.addUser(e.userId, e.username);
	}

	
	userDisconnected(e) {
		this.removeUser(e.userId);
	}

	existingUser(e) {
		this.addUser(e.userId, e.username);
	}

	addUser(userId, username)
	{
		var userList = $("#user-list");
		var userListItemTemplate = $("#user-list-item-template");
		
		var newUser = userListItemTemplate.clone();
		newUser.removeClass("hide");
		newUser.text(username);

		userList.append(newUser);

		this.userDomElements.push({
			userId: userId,
			userListItem: newUser
		});
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
		this.playerController.update();
	}


	tbChatInputKeyup(e) {
		//If the user clicks enter, click the play button if its enabled.
		if((e.code == "NumpadEnter" || e.code == "Enter")) {
			this.tbChatSubmitClick();
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
	}


	fromServerChatMessage(e) {
		var chatHistory = $("#chat-history");
		var chatHistoryItemTemplate = $("#chat-history-item-template");
		var newChat = chatHistoryItemTemplate.clone();
		
		var newChatTs = newChat.find("div[name='chat-history-ts']");
		var newChatName = newChat.find("div[name='chat-history-name']");
		var newChatMsg = newChat.find("div[name='chat-history-msg']");


		var u = this.gc.users.find((x) => {return x.userId == e.userId;});
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

