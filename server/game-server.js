const planck = require('planck-js');
const crypto = require('crypto');
const {performance} = require('perf_hooks');
const cookieParser = require('cookie-parser');
const {GlobalFuncs} = require('./global-funcs.js');
const {ValidFuncs} = require('./valid-funcs.js');
const {UserManager} = require('./managers/user-manager.js');
const {WebsocketManager} = require('./managers/websocket-manager.js');
const {GameServerStopped} = require('./game-server-states/game-server-stopped.js');
const {UserInitializingState} = require('./user/user-initializing-state.js');
const {UserDisconnectingState} = require('./user/user-disconnecting-state.js');
const serverConfig = require('./server-config.json');

class GameServer {
	constructor() {
		this.world = null;		
		this.globalfuncs = new GlobalFuncs();
		this.frameRate = 10; //fps
		this.frameNum = 0;
		this.maxPlayers = 30;
		this.runGameLoop = false;
		this.gameState = null;
		this.nextGameState = null;
		
		this.physicsTimeStep = 1/this.frameRate; //seconds
		this.frameTimeStep = 1000/this.frameRate; //ms
		this.velocityIterations = 6;
		this.positionIterations = 2;

		this.previousTick = 0;
		
		this.world = null;
		this.pl = null;

		this.wsm = null;
		this.um = null;
	}

	init() {
		console.log('initializing game server');
		this.pl = planck;
		this.wsm = new WebsocketManager();
		this.um = new UserManager();
		
		this.wsm.init(this);
		this.um.init(this);

		this.gameState = new GameServerStopped(this);
		
		const Vec2 = this.pl.Vec2;
		
		if(!this.world) {
			this.world = this.pl.World({
				gravity: Vec2(0, -10)
			});
		
			//origin lines
			var xAxisBody = this.world.createBody({
				position: Vec2(0, 0),
				userData: {id: 1}
			});
			var xAxisShape = this.pl.Edge(Vec2(0, 0), Vec2(1, 0));
			xAxisBody.createFixture(xAxisShape);
		
			var yAxisBody = this.world.createBody({
				position: Vec2(0, 0),
				userData: {id: 2}
			});
			var yAxisShape = this.pl.Edge(Vec2(0, 0), Vec2(0, 1));
			yAxisBody.createFixture(yAxisShape);
		
			//ground
			var ground = this.world.createBody({
				position: Vec2(0, -10),
				userData: {id: 3}
			});	
			var groundShape = this.pl.Box(20, 5, Vec2(0,0));
			ground.createFixture(groundShape, 0);
		
			
			//box
			this.boxBody = this.world.createBody({
				position: Vec2(1.5, 3.1),
				type: this.pl.Body.DYNAMIC,
				userData: {id: 4}
			});
			var boxShape = this.pl.Box(1, 1);
			this.boxBody.createFixture({
				shape: boxShape,
				density: 1.0,
				friction: 0.3
			});
		
			var boxShape2 = this.pl.Box(1, 1, Vec2(-1, -1));
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
	}

	endContact(a, b, c) {
		console.log('endContact!');
	}

	

	wsAuthenticate(req, socket, head) {
		var authResult = {
			bError: false,
			errorMessage: "",
			user: null,
			userMessage: ""
		};

		//get the session cookie that was set from the join-request api
		var reqCookies = null;
		var cookieSession = null;
		var cookieSessionParsed = false;

		try {
			reqCookies = this.globalfuncs.parseCookies(req);
			cookieSession = reqCookies["user-session"];

			//check if cookie is in request
			if(!cookieSession)
			{
				authResult.bError = true;
				authResult.errorMessage = "Cookie session not found in request.";
			}
	
			//check cookie signature
			if(!authResult.bError)
			{
				cookieSessionParsed = cookieParser.signedCookie(cookieSession, serverConfig.session_cookie_secret);
				if(cookieSessionParsed === false)
				{
					authResult.bError = true;
					authResult.errorMessage = "Invalid cookie signature for cookie session. Cookie: " + cookieSession;
				}
			}

			//get the user from the user manager. They SHOULD exist at this point
			if(!authResult.bError)
			{
				authResult.user = this.um.getUserByToken(cookieSessionParsed);
				if(!authResult.user)
				{
					authResult.bError = true;
					authResult.errorMessage = "User was not found. User session parsed: " + cookieSessionParsed;
				}
				else
				{
					//at this point, the user has been verified. Tell the UserManager so the user becomes permanent.
					this.um.userVerified(authResult.user);
				}
			}
		}
		catch(ex) {
			authResult.bError = true;
			authResult.errorMessage = "Internal server error when authenticating: " + ex;
			//GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			console.log(ex);
		}

		authResult.userMessage = "success";
		if(authResult.bError)
			authResult.userMessage = "Could not authenticate user."

		return authResult;
	}

	onopen(user, ws) {
		console.log('onopen called');
		
		try {
			//create websocket entry 
			this.wsm.createWebsocket(ws);

			//setup websocket
			ws.on("close", this.onclose.bind(this, ws));
			ws.on("error", this.onerror.bind(this, ws));
			ws.on("message", this.onmessage.bind(this, ws));
			ws.on("pong", this.onpong.bind(this, ws));

			ws.userId = user.id;

			//At this point, the user was only created, not initialized. So setup user now.
			user.init(this);
			user.nextState = new UserInitializingState(user);

			//manually run a state change from disconnected to initializing so it can be picked up by the game-server's update loop
			user.state.exit(0);
			user.nextState.enter(0);
			user.state = user.nextState;
			user.nextState = null;

			const Vec2 = this.pl.Vec2;
			var boxShape = this.pl.Box(0.5, 0.5, Vec2(0, 0));
			var playerBody = this.world.createBody({
				position: Vec2(-10, -1),
				type: this.pl.Body.DYNAMIC,
				userData: {userId: user.id}
			});
			playerBody.createFixture({
				shape: boxShape,
				density: 1.0,
				friction: 0.3
			});	

			user.playerBody = playerBody;

			// setTimeout(() => {
			// 	this.stringTest(ws, "hello");
			// }, 500)

			// //testing strings
			// setTimeout(() => {
			// 	var complexMsg = "hello〆"
			// 	var msgLength = complexMsg.length;

			// 	//I want this: (msgLength)(complexMsg) as small as I can.
			// 	//Which means I want this: (00001010)(0010.......10010)
			// 	//And I need to translate it on the other side.
			// 	var buffer = new ArrayBuffer(1 + (msgLength*2));
			// 	var myView = new Int8Array(buffer);

			// 	myView[0] = msgLength;

			// 	var n = 1; //byte counter for buffer
			// 	for(var i = 0; i < complexMsg.length; i++)
			// 	{
			// 		var cc = complexMsg.charCodeAt(i);
			// 		var byte1 = cc & 0xff;
			// 		var byte2 = (cc >> 8) & 0xff;

			// 		myView[n+1] = byte2;
			// 		myView[n] = byte1;
			// 		console.log('byte1: ' + byte1);
			// 		console.log('byte2: ' + byte2);
			// 		console.log('cc: ' + cc);
			// 		n += 2;
			// 	}

			// 	var test = complexMsg.charCodeAt(5);
			// 	var testArr = [];
			// 	var myByte = test & 0xff;
			// 	var myLeftover = test & 0xff00;
			// 	var stopHere = true;

			// 	ws.send(buffer);

			// 	//this.stringTest(ws, );
			// }, 1000)

			//testing ints
			setTimeout(() => {
				var int1Min = -128;
				var int1Max = 128;
				var int2Min = -32768;
				var int2ax = 32768;
				var int3Min = -8388608;
				var int3Max = 8388608;
				var int4Min = -2147483648;
				var int4Max = 2147483648;

			}, 1000)

			//testing floats
			setTimeout(() => {

				//testing floats
				var f1 = 10000.53;
				var f2 = -10000.53;
				
				var buffer = new ArrayBuffer(20);
				var myView = new DataView(buffer);

				myView.setFloat32(0, f1);
				myView.setFloat32(4, f2);
				
				var f1Again = myView.getFloat32(0);
				var f2Again = myView.getFloat32(4);











				//testing ints
				var i1 = 123;
				var i2 = 12356;
				var i3 = -118;
				var i4 = -11765;


				var buffer3 = new ArrayBuffer(40);
				var myView3 = new DataView(buffer3);
				myView3.setInt8(0, i1);
				myView3.setUint8(4, i1);
				myView3.setInt16(8, i2);
				myView3.setUint16(12, i2);
				myView3.setInt8(16, i3);
				myView3.setInt16(20, i4);

				var i1Returned = myView3.getInt8(0);
				var i1ReturnedU = myView3.getUint8(4);
				var i2Returned = myView3.getInt16(8);
				var i2ReturnedU = myView3.getUint16(12);
				var i3Returned = myView3.getInt8(16);
				var i4Returned = myView3.getInt16(20);


				var buffer4 = new ArrayBuffer(20);
				var myIntView4 = new Int16Array(buffer4);

				myIntView4[0] = i2;
				myIntView4[1] = i4;

				var i1ReturnedFromView = myIntView4[0];
				var i2ReturnedFromView = myIntView4[1];




				//testing limits of int
				var int1Min = -128;
				var int1Max = 127;
				var uint1Max = 255;
				var int2Min = -32768;
				var int2Max = 32767;
				var uint2Max = 65535;
				var int4Min = -2147483648;
				var int4Max = 2147483647;
				var uint4Max = 4294967295;

				var buffer4 = new ArrayBuffer(100);
				var myView4 = new DataView(buffer4);
				myView4.setInt8(0, int1Min);
				myView4.setInt8(4, int1Max);
				myView4.setUint8(8, uint1Max);

				myView4.setInt16(12, int2Min);
				myView4.setInt16(16, int2Max);
				myView4.setUint16(20, uint2Max);

				myView4.setInt32(24, int4Min);
				myView4.setInt32(28, int4Max);
				myView4.setUint32(32, uint4Max);

				var int1MinReturned = myView4.getInt8(0);
				var int1MaxReturned = myView4.getInt8(4);
				var uint1MaxReturned = myView4.getUint8(8);
				var int2MinReturned = myView4.getInt16(12);
				var int2MaxReturned = myView4.getInt16(16);
				var uint2MaxReturned = myView4.getUint16(20);
				var int3MinReturned = myView4.getInt32(24);
				var int3MaxReturned = myView4.getInt32(28);
				var uint3MaxReturned = myView4.getUint32(32);

				//ws.send(buffer4);







				//bools
				var b1 = true;
				var b2 = false;
				var b3 = false;
				var b4 = true;
				var b5 = false;

				var buffer5 = new ArrayBuffer(1);
				var boolView = new DataView(buffer5);

				var boolByte = b1 ? 1 : 0;
				boolByte = (boolByte << 1) + (b2 ? 1 : 0);
				boolByte = (boolByte << 1) + (b3 ? 1 : 0);
				boolByte = (boolByte << 1) + (b4 ? 1 : 0);
				boolByte = (boolByte << 1) + (b5 ? 1 : 0);

				boolView.setUint8(0, boolByte);




				var boolByteReturned = boolView.getUint8(0);
				var b1Returned = false;
				var b2Returned = false;
				var b3Returned = false;
				var b4Returned = false;
				var b5Returned = false;

				b5Returned = (boolByteReturned & 1) === 1 ? true : false;
				boolByteReturned = boolByteReturned >> 1;

				b4Returned = (boolByteReturned & 1) === 1 ? true : false;
				boolByteReturned = boolByteReturned >> 1;

				b3Returned = (boolByteReturned & 1) === 1 ? true : false;
				boolByteReturned = boolByteReturned >> 1;

				b2Returned = (boolByteReturned & 1) === 1 ? true : false;
				boolByteReturned = boolByteReturned >> 1;

				b1Returned = (boolByteReturned & 1) === 1 ? true : false;
				boolByteReturned = boolByteReturned >> 1;
				
								
				var stopHere = true;




			}, 1000)



		}
		catch(ex) {
			//GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			console.log(ex);
		}
		
	
	}

	onclose(ws, m) {	
		console.log('websocket onclose: ' + ws.id + '. playerId: ' + ws.playerId);
		var user = this.um.getUserByID(ws.userId);

		//put user in disconnecting state
		//not sure why they would not have a user at this point, but better safe than sorry.
		if(user)
		{
			user.nextState = new UserDisconnectingState(user);
		}

		//destroy socket
		this.wsm.destroyWebsocket(ws);
		//console.log("wsm.websocketArray.length: %s", this.wsm.websocketArray.length);
	}

	onerror(ws, m) {
		console.log('socket onerror: ' + m);
	}

	onpong(ws, m) {
		console.log('socket onpong: ' + m);
	}

	onmessage(ws, m) {

		if(m.indexOf("==custom==") == 0)
		{
			console.log('custom message:');
			console.log(m.data);
		}
		else
		{
			var jsonMsg = this.globalfuncs.getJsonEvent(m);
	
			switch(jsonMsg.event.toLowerCase())
			{
				case "get-world":
					console.log('now getting world');
					var arrBodies = this.getWorld();
					this.globalfuncs.sendJsonEvent(ws, "get-world-response", JSON.stringify(arrBodies))
					console.log('getting world done')
					break;
				case "start-event":
					this.startGame(ws, jsonMsg);
					break;
				case "stop-event":
					this.stopGame(ws, jsonMsg);
					break;
				case "player-input":
					this.playerInputEvent(ws, jsonMsg);
					break;
				case "test":
					console.log(jsonMsg);
					this.globalfuncs.sendJsonEvent(ws, "test-ack", {t: jsonMsg.msg.t});
					break;
				default:
					//just echo something back
					this.globalfuncs.sendJsonEvent(ws, "unknown-event", JSON.stringify({}));
					break;
			}
		}
	}


	stringTest(ws, msg)
	{
		var fullMsg = "==custom==" + msg;
		ws.send(fullMsg)
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


	playerInputEvent(ws, jsonMsg) {
		console.log('input event')
		var msg = jsonMsg.msg;
		var player = this.pm.getPlayerByID(ws.playerId);
		if(player)
		{
			const Vec2 = this.pl.Vec2;

			var p = player.playerBody.getWorldPoint(new Vec2(0, 0));
			var f = new Vec2(0, 10);
			player.playerBody.applyLinearImpulse(f, p, true);
		}
	}

	startGame() {
		console.log("Starting game");
		this.gameState.startGameRequest();
	}

	stopGame() {
		console.log("Stopping game");
		this.gameState.stopGameRequest();
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
			if(this.gameState)
			{
				this.gameState.update();
			}

			if(this.nextGameState)
			{
				this.gameState.exit();
				this.nextGameState.enter();

				this.gameState = this.nextGameState;
				this.nextGameState = null;
			}
		}

		//set either the sloppy timer (setTimeout) or accurate timer (setImmediate)
		if(performance.now() - this.previousTick < (this.frameTimeStep - serverConfig.set_timeout_variance))
		{
			//call the sloppy timer
			if(this.runGameLoop)
			{
				setTimeout(this.gameLoop.bind(this), 1);
			}
		}
		else
		{
			//call the accurate timer
			setImmediate(this.gameLoop.bind(this));
		}
	}


	sendWorldDeltas() {
		//just send everything for now
		var arrBodies = this.getWorld();
		
		for(var i = 0; i < this.wsm.websocketArray.length; i++)
		{
			this.globalfuncs.sendJsonEvent(this.wsm.websocketArray[i], "world-deltas", JSON.stringify(arrBodies));
		}
	}



	/* apis */
	getServerDetails(req, res) {
		var bError = false;
		var data = {};
		var main = [];
		var userMessage = "";

		try {
			var gameData = {
				currentPlayers: this.wsm.websocketArray.length,
				maxPlayers: this.maxPlayers
			}
			main.push(gameData);
		}
		catch(ex) {
			userMessage = "Internal server error.";
			//GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			console.log(ex);
			bError = true;
		}

		//send the response
		var statusResponse = 200;
		if(bError)		
			statusResponse = 500;

		data.main = main;
		res.status(statusResponse).json({userMessage: userMessage, data: data});
	}

	getUserSession(req, res) {
		var bError = false;
		var data = {};
		var main = [];
		var userMessage = "";
		var sessionCookie = "";
		var expireDays = 365*10;
		var bSessionExists = false;
	
		try
		{
			 sessionCookie = req.signedCookies["user-session"];
	
			 //if a session exists, verify it from the session-manager.
			if(sessionCookie) {
				var session = this.um.getUserByToken(sessionCookie);
				if(session)
				{
					bSessionExists = true;
					userMessage = "Existing user session found for '" + session.username + "'.";
					
					main.push({
						username: session.username,
						sessionExists: true
					});
				}
			}

			if(!bSessionExists) {
				main.push({
					username: "",
					sessionExists: false
				});
			}
		}
		catch(ex) {
			bError = true;
			console.log(req.path, "Exception caught in getGameSession: " + ex, ex.stack);
			userMessage = "Internal server error.";
		}
	
		//send the response
		var statusResponse = 200;
		if(bError)		
			statusResponse = 500;

		data.main = main;
		res.status(statusResponse).json({userMessage: userMessage, data: data});
	}

	clearUserSession(req, res) {
		var bError = false;
		var data = {};
		var main = [];
		var userMessage = "";
		var sessionCookie = "";
	
		try
		{
			 sessionCookie = req.signedCookies["user-session"];
	
			 //if a session exists, verify it from the session-manager.
			if(sessionCookie) {
				var user = this.um.getUserByToken(sessionCookie);
				if(user)
				{
					this.um.destroyUser(user);
					userMessage = "Player '" + user.username + "' was deleted.";
				}
			}
		}
		catch(ex) {
			bError = true;
			console.log(req.path, "Exception caught in clearUserSession: " + ex, ex.stack);
			userMessage = "Internal server error.";
		}
	
		//send the response
		var statusResponse = 200;
		if(bError)		
			statusResponse = 500;

		data.main = main;
		res.status(statusResponse).json({userMessage: userMessage, data: data});

	}

	//This is called when the player initially tries to connect to the game.
	//This is where we can do checks for if the players are at maximum capicity, or player name filtering, etc.
	//If the player is allowed to connect and they don't have a user setup yet, this also creates the user for them in UserManager and sets the user-session cookie on the client.
	joinRequest(req, res) {
		console.log("join request called")
		var bError = false;
		var data = {};
		var main = [];
		var userMessage = "";
		var reqSessionCookie = "";
		var expireDays = 365*10;
		var bUserExists = false;
		var username = "";

		try {
			username = req.body.username;

			//check if the game is in a "joinable" state
			if(!bError)
			{
				userMessage = this.gameState.joinRequest();
				bError = userMessage != "success";
			}

			//validate inputs
			if(!bError)
			{
				userMessage = ValidFuncs.validateUsername(username);
				bError = userMessage != "success";
			}

			//check for max players
			if(!bError && this.wsm.websocketArray.length >= this.maxPlayers)
			{
				bError = true;
				userMessage = "Server is full.";
			}

			//At this point, the user can join.
			//create the user and set the cookie if they don't exist
			if(!bError)
			{
				reqSessionCookie = req.signedCookies["user-session"];
	
				//if a session exists, verify it from the session-manager.
				if(reqSessionCookie) {
					var user = this.um.getUserByToken(reqSessionCookie);

					if(user)
					{
						bUserExists = true;
					}
				}

				//if they don't have a user, create one and set a cookie
				if(!bUserExists)
				{
					var user = this.um.createUser(true);
					user.username = username;

					//temporarily set a state for the new user. This is kinda hacky...its just a way so the user doesn't get picked up by the update loop immediately until the user has officially joined and created a websocket.
					user.stateName = "user-disconnected-state";

					var cookieOptions = {
						signed: true,
						maxAge: 60000 * 60 * 24 * expireDays,
						httpOnly: true,
						sameSite: "strict",
						secure: serverConfig.https_enabled
					};
					
					res.cookie("user-session", user.token, cookieOptions);
				}
			}
		}
		catch(ex) {
			userMessage = "Internal server error.";
			//GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			console.log(ex);
			bError = true;
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