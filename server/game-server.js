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
		this.frameRate = 30; //fps
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
			var boxShape = this.pl.Box(1, 1, Vec2(0, 0));
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
		}
		catch(ex) {
			//GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			console.log(ex);
		}
		
	
	}

	onclose(socket, m) {	
		console.log('socket onclose: ' + socket.id + '. playerId: ' + socket.playerId);
		var user = this.um.getUserByID(socket.userId);

		//put user in disconnecting state
		//not sure why they would not have a user at this point, but better safe than sorry.
		if(user)
		{
			user.nextState = new UserDisconnectingState(user);
		}

		//destroy socket
		this.wsm.destroyWebsocket(socket);
		//console.log("wsm.websocketArray.length: %s", this.wsm.websocketArray.length);
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
				this.startGame(socket, jsonMsg);
				break;
			case "stop-event":
				this.stopGame(socket, jsonMsg);
				break;
			case "player-input":
				this.playerInputEvent(socket, jsonMsg);
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


	playerInputEvent(socket, jsonMsg) {
		console.log('input event')
		var msg = jsonMsg.msg;
		var player = this.pm.getPlayerByID(socket.playerId);
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