const planck = require('planck-js');
const {GlobalFuncs} = require('./global-funcs.js');
const serverConfig = require('./server-config.json');
const {performance} = require('perf_hooks');

class GameServer {
	constructor() {
		this.world = null;		
		this.globalfuncs = new GlobalFuncs();
		this.frameRate = 1; //fps
		this.isRunning = false;
		this.frameNum = 0;
		this.socketArr = [];
		this.wsIDCounter = 1;
		
		this.physicsTimeStep = 1/this.frameRate; //seconds
		this.frameTimeStep = 1000/this.frameRate; //ms
		this.velocityIterations = 6;
		this.positionIterations = 2;

		this.actualDtArr = [];
		this.actualDtArrMaxLength = 30;
		this.actualDtArrCurrentIndex = 0;
		this.actualDtAvg = 0; //actual dt per second (should be 1 second)
		this.actualDtTotal = 0; //temp variable

		this.previousTick = 0;

		this.dtPrevious = 0;
		this.dtStart = 0;
	}

	init() {
		console.log('initializing game server');
		for(var i = 0; i < this.actualDtArrMaxLength; i++)
		{
			this.actualDtArr.push(0);
		}
		const pl = planck;
		const Vec2 = pl.Vec2;
		
		if(!this.world) {
			this.world = pl.World({
				gravity: Vec2(0, -10)
			});
		
			//origin lines
			var xAxisBody = this.world.createBody({
				position: Vec2(0, 0),
				userData: {id: 1}
			});
			var xAxisShape = pl.Edge(Vec2(0, 0), Vec2(1, 0));
			xAxisBody.createFixture(xAxisShape);
		
			var yAxisBody = this.world.createBody({
				position: Vec2(0, 0),
				userData: {id: 2}
			});
			var yAxisShape = pl.Edge(Vec2(0, 0), Vec2(0, 1));
			yAxisBody.createFixture(yAxisShape);
		
			//ground
			var ground = this.world.createBody({
				position: Vec2(0, -10),
				userData: {id: 3}
			});	
			var groundShape = pl.Box(20, 5, Vec2(0,0));
			ground.createFixture(groundShape, 0);
		
			
			//box
			this.boxBody = this.world.createBody({
				position: Vec2(1.5, 3.1),
				type: pl.Body.DYNAMIC,
				userData: {id: 4}
			});
			var boxShape = pl.Box(1, 1);
			this.boxBody.createFixture({
				shape: boxShape,
				density: 1.0,
				friction: 0.3
			});
		
			var boxShape2 = pl.Box(1, 1, Vec2(-1, -1));
			this.boxBody.createFixture({
				shape: boxShape2,
				density: 1.0,
				friction: 0.3
			});	

			this.world.on("begin-contact", this.beginContact.bind(this));
			this.world.on("end-contact", this.endContact.bind(this));
		}

		console.log('creating gameworld done');
	}

	beginContact(a, b, c) {
		console.log('beginContact!');
		var stophere = true;
	}

	endContact(a, b, c) {
		console.log('endContact!');
	}

	onopen(socket) {
		console.log('Websocket connected!');

		socket.id = this.wsIDCounter;
		socket.sn = 1;
		this.wsIDCounter++;
		this.socketArr.push(socket);

		socket.on("close", this.onclose.bind(this, socket));
		socket.on("error", this.onerror.bind(this, socket));
		socket.on("message", this.onmessage.bind(this, socket));
		socket.on("pong", this.onpong.bind(this, socket));
		socket.ping("this is a ping");
	}

	onclose(socket, m) {	
		console.log('socket onclose: ' + m);
		console.log("looking for socket");
		var index = this.socketArr.findIndex((x) => {return x.id === socket.id;});
		this.socketArr.splice(index, 1);
		console.log("index is: %s. socketArr.length: %s", index, this.socketArr.length);
	}

	onerror(socket, m) {
		console.log('socket onerror: ' + m);
	}

	onpong(socket, m) {
		console.log('socket onpong: ' + m);
	}

	onmessage(socket, m) {
		var jsonMsg = this.globalfuncs.getJsonEvent(m);
	
		switch(jsonMsg.event.toLowerCase())
		{
			case "get-world":
				console.log('now getting world');
				var arrBodies = this.getWorld();
				this.globalfuncs.sendJsonEvent(socket, "get-world-response", JSON.stringify(arrBodies))
				console.log('getting world done')
				break;
			case "start-event":
				this.startEvent(socket, jsonMsg);
				break;
			case "stop-event":
				this.stopEvent(socket, jsonMsg);
				break;
			case "restart-event":
				this.restartEvent(socket, jsonMsg);
				break;
			default:
				//just echo something back
				this.globalfuncs.sendJsonEvent(socket, "unknown-event", "Unknown Event");
				break;
		}
	}

	getWorld() {

		var currentBody = this.world.getBodyList();
		var arrBodies = [];
		var fixtureIDCounter = 1;
		while(currentBody)
		{
			var bodyObj = {
				id: 0,
				x: 0,
				y: 0,
				a: 0,
				fixtures: []
			};

			var pos = currentBody.getPosition();
			bodyObj.x = pos.x;
			bodyObj.y = pos.y;
			bodyObj.a = currentBody.getAngle();

			var temp = currentBody.getUserData();
			bodyObj.id = temp.id;

			var currentFixture = currentBody.getFixtureList();
			while(currentFixture)
			{
				var shape = currentFixture.getShape();
				var vertices = [];
				switch(currentFixture.getType().toLowerCase())
				{
					case "polygon":
						for(var i = 0; i < shape.m_vertices.length; i++)
						{
							var v = {
								x: shape.m_vertices[i].x,
								y: shape.m_vertices[i].y
							};
							vertices.push(v)
						}
						break;
					case "edge":
						var v1 = {
							x: shape.m_vertex1.x,
							y: shape.m_vertex1.y
						};
						var v2 = {
							x: shape.m_vertex2.x,
							y: shape.m_vertex2.y
						};
						vertices.push(v1);
						vertices.push(v2);
						break;
					default:
						break;
				}

				var fixtureObj = {
					id: fixtureIDCounter,
					shapeType: currentFixture.getType(),
					radius: shape.getRadius(),
					vertices: vertices
				}

				bodyObj.fixtures.push(fixtureObj);
				currentFixture = currentFixture.getNext();
				fixtureIDCounter++;
			}

			arrBodies.push(bodyObj);
			currentBody = currentBody.getNext();
		}

		return arrBodies;
	}

	startEvent(socket, jsonMsg) {
		console.log('starting simulation');
		this.startGameLoop();
	}
	
	stopEvent(socket, jsonMsg) {
		console.log('stopping simulation');
		this.stopGameLoop();
	}
	
	restartEvent(socket, jsonMsg) {
		console.log('restarting simulation');
		
	}

	//starts the gameworld game loop
	startGameLoop() {
		if(!this.isRunning)
		{
			this.isRunning = true;
			console.log("Starting game loop");
			this.dtPrevious = performance.now();
			this.gameLoop();
		}
	}

	stopGameLoop() {
		if(this.isRunning)
		{
			this.isRunning = false;
			console.log("Stopping game loop");
		}
	}

	//the gameloop uses setTimeout + setImmediate combo to get a more accurate timer.
	//credit: (https://timetocode.tumblr.com/post/71512510386/an-accurate-nodejs-game-loop-inbetween-settimeout)
	//There is additional tuning parameters (set_timeout_variance) used because setTimeout does NOT have the same variance across operating systems.
	//For example: setTimeout(..., 50) has +16ms variance on Windows 10, and +1ms variance on Debian 10 
	//(iow, setimeout will be called between 50-66ms on windows, and 50-51ms on debian 10)
	gameLoop() {

		//if its the designated time has passed, run the update function
		if(this.previousTick + (this.frameTimeStep) < performance.now())
		{
			this.previousTick = performance.now();
			this.update();
		}

		//set either the sloppy timer (setTimeout) or accurate timer (setImmediate)
		if(performance.now() - this.previousTick < (this.frameTimeStep - serverConfig.set_timeout_variance))
		{
			//call the sloppy timer
			setTimeout(this.gameLoop.bind(this), 1);
		}
		else
		{
			//call the accurate timer
			setImmediate(this.gameLoop.bind(this));
		}
	}


	update() {

		this.dtStart = performance.now();
		var dtDiff = this.dtStart - this.dtPrevious;
		this.dtPrevious = this.dtStart;
		console.log('UPDATE CALLED: ' + dtDiff);

		//send out just a packet with a sequence number
		for(var i = 0; i < this.socketArr.length; i++)
		{
			var m = {sn: this.socketArr[i].sn};
			this.globalfuncs.sendJsonEvent(this.socketArr[i], "sn-test", JSON.stringify(m));
			console.log('Sent packet for client: %s, sn: %s', this.socketArr[i].id, this.socketArr[i].sn);
			this.socketArr[i].sn++;
		}



		//process input here

		//physics update
		//this.world.step(this.timeStep, this.velocityIterations, this.positionIterations);
		
		//if its time, send 
		//this.sendWorldDeltas();

		// this.actualDtArr[this.actualDtArrCurrentIndex] = dtDiff;
		// this.actualDtArrCurrentIndex++;

		// if(this.actualDtArrCurrentIndex >= this.actualDtArrMaxLength)
		// {
		// 	this.actualDtArrCurrentIndex = 0;
		// 	this.actualDtTotal = 0;
		// 	for(var i = 0; i < this.actualDtArrMaxLength; i++)
		// 	{
		// 		this.actualDtTotal += this.actualDtArr[i];
		// 	}

		// 	//this.actualDtAvg = Math.round(this.actualDtTotal / 30);
		// 	console.log(this.actualDtTotal);
		// }


		
		this.frameNum++;
	}

	sendWorldDeltas() {
		//just send everything for now
		var arrBodies = this.getWorld();
		
		for(var i = 0; i < this.socketArr.length; i++)
		{
			this.globalfuncs.sendJsonEvent(this.socketArr[i], "world-deltas", JSON.stringify(arrBodies));
		}
	}


	/* apis */
	getServerDetails(req, res) {
		console.log('get server details called');
		var bError = false;
		var data = {};
		var main = [];
		var userMessage = "";

		try {
			userMessage = "hello from game server.";
			var gameData = {
				currentPlayers: this.socketArr.length,
				maxPlayers: 30
			}
			main.push(gameData);
		}
		catch(ex) {
			userMessage = "Internal server error.";
			//GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			console.log(ex);
			var bError = true;
		}

		//send the response
		var statusResponse = 200;
		if(bError)		
			statusResponse = 500;

		data.main = main;
		res.status(statusResponse).json({userMessage: userMessage, data: data});
	}

}

exports.GameServer = GameServer;