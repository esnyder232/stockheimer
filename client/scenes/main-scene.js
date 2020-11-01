import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import config from '../client-config.json';
import PlayerController from "../classes/player-controller.js"

export default class MainScene extends Phaser.Scene {
	constructor() {
		super(config);
		this.globalfuncs = new GlobalFuncs();
		this.messageSent = false;
		this.tempLineGraphicsArr = [];
		this.planckUnitsToPhaserUnitsRatio = 4;
		this.radiansToDegreesRatio = 180/3.14
		this.ws = null;
		this.userName = "";
		this.players = [];
		this.playerInputKeyboardMap = {};
		this.playerController = {};
	}

	init(data) {
		console.log('init on ' + this.scene.key + ' start');
		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
			{event: 'exit-game-click', func: this.exitGameClick.bind(this)},
			{event: 'start-event', func: this.startEvent.bind(this)},
			{event: 'stop-event', func: this.stopEvent.bind(this)},
			{event: 'restart-event', func: this.restartEvent.bind(this)}
		];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		this.ws = data.ws;
		this.userName = data.userName;
		
		this.ws.onmessage = this.onmessage.bind(this);
		this.ws.onclose = this.onclose.bind(this);
		this.ws.onerror = this.onerror.bind(this);
		this.ws.onopen = this.onopen.bind(this);

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
	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');
		this.load.image("my-tileset", "assets/tilesets/my-tileset.png");
	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
		$("#main-scene-root").removeClass("hide");

		this.cameras.main.setZoom(2);
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

		//BUG: this breaks the input when the scene ends.
		// this.playerController.init(this.playerInputKeyboardMap); 
		

		//quick controls
		// for(var key in this.playerInputKeyboardMap)
		// {
		// 	var virtualButton = {
		// 			keyCode: 0,
		// 			phaserKeyCode: "",
		// 			state: false,
		// 			prevState: false,
		// 			phaserKeyObj: {}
		// 	};

		// 	//find the phaserKeyCode (its innefficent I know. I don't care)
		// 	for(var phaserKeyCode in Phaser.Input.Keyboard.KeyCodes)
		// 	{
		// 		if(Phaser.Input.Keyboard.KeyCodes[phaserKeyCode] == this.playerInputKeyboardMap[key])
		// 		{
		// 			virtualButton.phaserKeyCode = phaserKeyCode;
		// 			break;
		// 		}
		// 	}

		// 	virtualButton.keyCode = this.playerInputKeyboardMap[key];
		// 	virtualButton.phaserKeyObj = this.input.keyboard.addKey(this.playerInputKeyboardMap[key]);

		// 	this.playerController[key] = virtualButton;
		// }

		// //for each virtual button, create a listener to change the virutal button's state
		// for(var key in this.playerController)
		// {
		// 	this.input.keyboard.on("keydown-"+this.playerController[key].phaserKeyCode, this.tempDown, this.playerController[key]);
		// 	this.input.keyboard.on("keyup-"+this.playerController[key].phaserKeyCode, this.tempUp, this.playerController[key]);
		// }

	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);
		
		$("#main-scene-root").addClass("hide");
	}

	exitGameClick() {
		this.globalfuncs.appendToLog("Disconnecting from server.");
		
		try{
			this.ws.close();
		} catch(ex) {
			this.globalfuncs.appendToLog("Exception caught when closing websocket: " + ex);
		}
		this.scene.manager.getScene("game-manager-scene").exitServer();
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

	jumpEvent() {
		console.log('jumpEvent started');
		this.sendJsonEvent(this.ws, "jump-event", "");
	}
	  
	update(timeElapsed, dt) {
		if(!this.messageSent && this.ws.readyState === WebSocket.OPEN)
		{
			console.log('now sending message');
			this.sendJsonEvent(this.ws, "get-world", "");
			this.messageSent = true;
		}

		if(this.playerController.isDirty)
		{
			var inputs = {};
			for(var key in this.playerController.inputKeyboardMap)
			{				
				var val = this.playerController[key].state;
				inputs[key] = val == true ? 1 : 0;
			}

			this.sendJsonEvent(this.ws, "player-input", inputs)
		}

		this.playerController.update();



	}

	tempDown(e) {
		console.log('down now')
		this.state = true;
	}

	tempUp(e) {
		this.state = false;
	}

	onclose(e) {
		console.log('Websocket is now closed.');
	}

	onopen(e) {
		console.log('Websocket is now opened.');
	}

	onerror(e) {
		console.log('Websocket error: ' + e);
	}

	onmessage(e) {
		var jsonMsg = this.getJsonEvent(e.data);
		//console.log('message recieved from server. Event: ' + jsonMsg.event);
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
				//console.log('got world deltas');
				var deltas = JSON.parse(jsonMsg.msg);
				this.processDeltas(deltas);
				break;
			case "sn-test":
				var msg = JSON.parse(jsonMsg.msg);
				console.log('Recieved packet. sn: %s', msg.sn)
				break;
			case "player-update":

				break;
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
				//console.log('myDelta x, y: %s, %s', myDelta.x, myDelta.y);
				var newx = myDelta.x * this.planckUnitsToPhaserUnitsRatio;
				var newy = myDelta.y * this.planckUnitsToPhaserUnitsRatio * -1;
				var newa = myDelta.a * -this.radiansToDegreesRatio;

				for(var j = 0; j < obj.planckGraphics.length; j++)
				{
					obj.planckGraphics[j].setX(newx);
					obj.planckGraphics[j].setY(newy);
					obj.planckGraphics[j].setAngle(newa);
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

