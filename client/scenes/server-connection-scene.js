export default class ServerConnectionScene extends Phaser.Scene {
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
		this.ws = new WebSocket("ws://localhost:8080");
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

