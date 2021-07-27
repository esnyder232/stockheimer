const planck = require('planck-js');
const {performance} = require('perf_hooks');
const cookieParser = require('cookie-parser');
const {GlobalFuncs} = require('./global-funcs.js');
const {ValidFuncs} = require('./valid-funcs.js');
const {UserManager} = require('./managers/user-manager.js');
const {WebsocketManager} = require('./managers/websocket-manager.js');
const {GameServerStopped} = require('./game-server-states/game-server-stopped.js');
const {UserConnectingState} = require('./user/user-connecting-state.js');
const {CollisionSystem} = require ('./systems/collision-system.js');
const {GameObjectManager} = require ('./managers/game-object-manager.js');
const {TilemapManager} = require ('./managers/tilemap-manager.js');
const {AIAgentManager} = require ('./managers/ai-agent-manager.js');
const {UserAgentManager} = require ('./managers/user-agent-manager.js');
const {TeamManager} = require('./managers/team-manager.js');
const {ProcessManager} = require('./managers/process-manager.js');
const {ResourceManager} = require('./managers/resource-manager.js');
const {FileManager} = require('./managers/file-manager.js');

const serverConfig = require('./server-config.json');
const GameConstants = require('../shared_files/game-constants.json');
const path = require('path');
const logger = require("../logger.js");
const fs = require('fs');

class GameServer {
	constructor() {
		this.globalfuncs = new GlobalFuncs();
		this.frameRate = serverConfig.fps; 
		this.frameNum = 0;
		this.maxPlayers = serverConfig.max_players;
		this.inactivePeriod = 10000; //ms - the amount of ms worth of ack loss (packet loss) before a player is considered "inactive" by the server
		this.inactiveAckThreashold = Math.round(this.inactivePeriod/1000) * this.frameRate; //number of acks needed to be lost (packet loss) for a player to be considered "inactive" by the server

		this.runGameLoop = false;
		this.gameState = null;
		this.nextGameState = null;

		this.theRound = null; //temporary place for the only round to live

		this.physicsTimeStep = 1/this.frameRate; //seconds
		this.frameTimeStep = 1000/this.frameRate; //ms
		this.velocityIterations = 1;
		this.positionIterations = 1;

		this.previousTick = 0;

		this.globalGameObjectIDCounter = 0; //game object id that is used for all game object to have. This is used mainly in the priority system so objects from different pools can be pushed together on the same array
		
		this.world = null;
		this.pl = null;

		this.wsm = null;
		this.um = null;
		this.cm = null;
		this.cs = null;
		this.tmm = null;
		this.ngm = null;
		this.aim = null;
		this.tm = null;
		this.pm = null;
		this.uam = null;
		this.rm = null;
		this.fm = null;
		this.rmd = null;

		this.appRoot = path.join(__dirname, "..");

		this.activeNavGrid = null; //temporary
		this.activeTilemap = null; //temporary
		
		this.reportTimer = 0; //counter in ms to report number of objects and users in the server
		this.reportTimerInterval = 5000; //ms until this console logs the amount of game objects in the game

		this.castleObject = null;
		this.enemyCap = 100;

		this.minimumUsersPlaying = 24; //temporary. This is used to fill in each teams with AI if there are not enough human users playing.

		////////////////////////////////////////////////////////////////////////
		//This decides what classes/map gets loaded.
		this.classKeyList = [
			"data/character-classes/slime-mage.json",
			"data/character-classes/slime-mage-2.json",
			"data/character-classes/slime-mage-3.json"
		];

		this.mapKey = serverConfig.map_relpath;
		////////////////////////////////////////////////////////////////////////
	}

	init() {
		//logger.log("info", 'initializing game server');
		this.pl = planck;
		this.wsm = new WebsocketManager();
		this.um = new UserManager();
		this.gom = new GameObjectManager();
		this.tmm = new TilemapManager();
		this.cs = new CollisionSystem();
		this.aim = new AIAgentManager();
		this.tm = new TeamManager();
		this.pm = new ProcessManager();
		this.uam = new UserAgentManager();
		this.rm = new ResourceManager();
		this.fm = new FileManager();

		const Vec2 = this.pl.Vec2;
		if(!this.world) {
			this.world = this.pl.World({
				gravity: Vec2(0, 0)
			});
		}
		
		//logger.log("info", 'creating gameworld done');

		this.wsm.init(this);
		this.um.init(this);
		this.gom.init(this);
		this.cs.init(this);
		this.tmm.init(this);
		this.aim.init(this);
		this.tm.init(this);
		this.pm.init(this);
		this.uam.init(this);
		this.rm.init(this);
		this.fm.init(this);

		this.gameState = new GameServerStopped(this);

		//debug stuff here
		// this.fm.loadFile("data/character-classes/slime-mage.json", this.fileReadComplete.bind(this));
		// this.fm.loadFile("data/animation-sets/slime-attack-set.json", this.fileReadComplete.bind(this));
		// this.fm.loadFile("data/animation-sets/slime-idle-set.json", this.fileReadComplete.bind(this));
		// this.fm.loadFile("data/animation-sets/slime-idle-set.json", this.fileReadComplete.bind(this));
		// this.fm.loadFile("data/animation-sets/slime-idle-set2.json", this.fileReadComplete.bind(this));

		// var p2 = this.uam.createUserAgent();
		// var p3 = this.uam.createUserAgent();
		// var p4 = this.uam.createUserAgent();
		// var p5 = this.uam.createUserAgent();
		// var p6 = this.uam.createUserAgent();

		// p1.name = "p1";
		// p2.name = "p2";
		// p3.name = "p3";
		// p4.name = "p4";
		// p5.name = "p5";
		// p6.name = "p6";

		// setTimeout(() => {
		// 	console.log('killing p1 and p3');
		// 	this.uam.destroyUserAgent(p1.id);
		// 	this.uam.destroyUserAgent(p3.id);
		// }, 2000)
		
		// setTimeout(() => {
		// 	var a = this.uam;
		// 	console.log('stopping');
		// }, 3000)
		

		//fs.readFile("./assets/game-data/sprite-data.json", this.fileReadComplete.bind(this));
		// var key = "data/character-classes/slime-mage.json";

		// this.path = path.join(this.appRoot, key);

		// var stophere = true;
		
	}


	fileReadComplete(file) {
		// console.log("!!! FileReadComplete !!!");
		// console.log(" - key: " + file.key);
		// console.log(" - id: " + file.id);
		// console.log(" - status: " + file.status);
		// console.log(" - errorMsg: " + file.errorMsg);
		// console.log(" - data: " + JSON.stringify(file.data));

		// this.fm.loadFile("data/animation-sets/slime-move-set.json", this.fileReadComplete2.bind(this));
		// this.fm.loadFile("data/animation-sets/slime-idle-set.json", this.fileReadComplete2.bind(this));
		// this.fm.loadFile("data/animation-sets/slime-idle-set2.json", this.fileReadComplete2.bind(this));

		// setTimeout(() => {
		// 	logger.log("info", "=== NOW UNLOADING TEH FUILE ===");
		// 	this.fm.unloadFileByKey("data/animation-sets/slime-attack-set.json");
		// 	this.fm.loadFile("data/animation-sets/slime-attack-set.json", this.fileReadComplete2.bind(this));
		// }, 2000)

		// setTimeout(() => {
		// 	var stopHere = true;
		// 	var t = this;

		// }, 4000)
		

	}

	// fileReadComplete2(file) {
	// 	var t = this;
	// 	console.log("!!! FileReadComplete2222 !!!");
	// 	console.log(" - key: " + file.key);
	// 	console.log(" - id: " + file.id);
	// 	console.log(" - status: " + file.status);
	// 	console.log(" - errorMsg: " + file.errorMsg);
	// 	console.log(" - data: " + file.data);
	// }



	getGlobalGameObjectID() {
		return this.globalGameObjectIDCounter++;
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

			//check if the game is in a "joinable" state
			if(!authResult.bError)
			{
				authResult.errorMessage = this.gameState.joinRequest();
				authResult.bError = authResult.errorMessage != "success";
				if(authResult.bError)
				{
					authResult.userMessage = authResult.errorMessage;
				}
			}

			//check for max players
			if(!authResult.bError && this.um.activeUserArray.length >= this.um.maxAllowed)
			{
				authResult.bError = true;
				authResult.errorMessage = "Server is full.";
				authResult.userMessage = "Server is full.";
			}


			//check if cookie is in request
			if(!cookieSession)
			{
				authResult.bError = true;
				authResult.errorMessage = "Cookie session not found in request.";
				authResult.userMessage = "Cookie session not found in request.";
			}
	
			//check cookie signature
			if(!authResult.bError)
			{
				cookieSessionParsed = cookieParser.signedCookie(cookieSession, serverConfig.session_cookie_secret);
				if(cookieSessionParsed === false)
				{
					authResult.bError = true;
					authResult.errorMessage = "Invalid cookie signature for cookie session. Cookie: " + cookieSession;
					authResult.userMessage = "Invalid cookie signature.";
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
					authResult.userMessage = "User was not found.";
				}
			}

			//at this point, if there is no error, the user has been verified. Tell the usermanager to switch the user from "inactive" to "active" users
		}
		catch(ex) {
			authResult.bError = true;
			authResult.errorMessage = "Internal server error when authenticating: " + ex;
			authResult.userMessage = "Internal server error when authentication.";
			//GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			logger.log("info", ex);
		}

		if(!authResult.bError)
			authResult.userMessage = "success";

		return authResult;
	}

	onopen(user, ws) {
		try {
			//create a websocket handler and useragent
			var wsh = this.wsm.createWebsocket(ws);
			var ua = this.uam.createUserAgent();
		
			wsh.init(this, user.id, ua.id, ws);
			ua.userAgentInit(this, user.id, wsh.id);
			
			//At this point, the user was only created, not initialized. So setup user now.
			user.userInit(this);
			user.userAgentId = ua.id;
			user.userType = "user";

			//activate the user
			this.um.activateUserId(user.id, this.cbUserActivateSuccess.bind(this), this.cbUserActivateFail.bind(this));

			//setup the user's nextState
			user.nextState = new UserConnectingState(user);
		}
		catch(ex) {
			//GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			logger.log("info", ex);
		}
	}

	cbUserActivateSuccess(id) {
		//logger.log("info", 'user activation success CB called');

		//adjust all user's websocket handler's max packet size
		var userAgents = this.uam.getUserAgents();
		for(var i = 0; i < userAgents.length; i++)
		{
			//i don't know why it would EVER be null at this point. Buy just to be safe.
			if(userAgents[i].wsh !== null)
			{
				userAgents[i].wsh.updateMaxPacketSize();
			}
		}
	}

	//if user fails to be activated, do the opposite of everything you did in gameserver.onopen
	cbUserActivateFail(id, failedReason) {
		//logger.log("info", 'user activation failed CB called');

		var user = this.um.getUserByID(id);
		var wsh = this.wsm.getWebsocketByID(user.wsId);

		//close the websocket
		if(wsh !== null) {
			wsh.disconnectClient(1000, failedReason);
		}

		//unsetup the users state
		user.nextState = null;

		//deactivate the user (should already be deactivated...but do it anyway)
		this.um.deactivateUserId(user.id);

		//destroy the userAgent
		var userAgent = this.uam.getUserAgentByID(user.userAgentId);
		if(userAgent !== null) {
			this.uam.destroyUserAgent(userAgent.id);
		}
		
		//destroy the websocket handler 
		this.wsm.destroyWebsocket(wsh);
	}

	cbUserDeactivateSuccess(id) {
		//adjust all user's websocket handler's max packet size
		var userAgents = this.uam.getUserAgents();
		for(var i = 0; i < userAgents.length; i++)
		{
			//i don't know why it would EVER be null at this point. Buy just to be safe.
			if(userAgents[i].wsh !== null)
			{
				userAgents[i].wsh.updateMaxPacketSize();
			}
		}
	}


	startGame() {
		logger.log("info", "Starting game");
		this.gameState.startGameRequest();
	}

	stopGame() {
		logger.log("info", "Stopping game");
		this.gameState.stopGameRequest();
	}


	gameLoop() {

		var nowTime = performance.now();
		var dt = nowTime - this.previousTick;
		// console.log("game loop called: " + dt);

		//if its the designated time has passed, run the update function
		this.previousTick = nowTime;
		if(this.gameState)
		{
			this.gameState.update(dt);

			//report timer
			this.reportTimer += dt;
			if(this.reportTimer >= this.reportTimerInterval)
			{
				logger.log("info", "GameServer Report. Playing Users: " + this.um.getPlayingUsers().length + ". AI: " + this.aim.AIAgentArray.length + ". Gameobjects: " + this.gom.gameObjectArray.length);
				this.reportTimer = 0;
				// var temp = this.um.getActiveUsersGroupedByTeams();
				// console.log(temp);
			}
		}

		if(this.nextGameState)
		{
			this.gameState.exit();
			this.nextGameState.enter();

			this.gameState = this.nextGameState;
			this.nextGameState = null;
		}
	}




	// //the gameloop uses setTimeout + setImmediate combo to get a more accurate timer.
	// //credit: (https://timetocode.tumblr.com/post/71512510386/an-accurate-nodejs-game-loop-inbetween-settimeout)
	// //There is additional tuning parameters (set_timeout_variance) used because setTimeout does NOT have the same variance across operating systems.
	// //For example: setTimeout(..., 50) has +16ms variance on Windows 10, and +1ms variance on Debian 10 
	// //(iow, setimeout will be called between 50-66ms on windows, and 50-51ms on debian 10)
	// gameLoop() {
	// 	var nowTime = performance.now();

	// 	//if its the designated time has passed, run the update function
	// 	if(this.previousTick + (this.frameTimeStep) < nowTime)
	// 	{
	// 		var dt = nowTime - this.previousTick;
	// 		this.previousTick = nowTime;
	// 		if(this.gameState)
	// 		{
	// 			this.gameState.update(dt);

	// 			//report timer
	// 			this.reportTimer += dt;
	// 			if(this.reportTimer >= this.reportTimerInterval)
	// 			{
	// 				logger.log("info", "GameServer Report. Playing Users: " + this.um.getPlayingUsers().length + ". AI: " + this.aim.AIAgentArray.length + ". Gameobjects: " + this.gom.gameObjectArray.length);
	// 				this.reportTimer = 0;
	// 				// var temp = this.um.getActiveUsersGroupedByTeams();
	// 				// console.log(temp);
	// 			}
	// 		}

	// 		if(this.nextGameState)
	// 		{
	// 			this.gameState.exit();
	// 			this.nextGameState.enter();

	// 			this.gameState = this.nextGameState;
	// 			this.nextGameState = null;
	// 		}
	// 	}

	// 	//set either the sloppy timer (setTimeout) or accurate timer (setImmediate)
	// 	if(nowTime - this.previousTick < (this.frameTimeStep - serverConfig.set_timeout_variance))
	// 	{
	// 		//call the sloppy timer
	// 		if(this.runGameLoop)
	// 		{
	// 			setTimeout(this.gameLoop.bind(this), 1);
	// 		}
	// 	}
	// 	else
	// 	{
	// 		//call the accurate timer
	// 		setImmediate(this.gameLoop.bind(this));
	// 	}
	// }

	/* apis */
	getServerDetails(req, res) {
		var bError = false;
		var data = {};
		var main = [];
		var userMessage = "";

		try {
			var gameData = {
				currentPlayers: this.um.activeUserArray.length,
				maxPlayers: this.maxPlayers
			}
			main.push(gameData);
		}
		catch(ex) {
			userMessage = "Internal server error.";
			//GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			logger.log("info", ex);
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
		var bSessionExists = false;
	
		try
		{
			 sessionCookie = req.signedCookies["user-session"];
	
			 //if a session exists, verify it from the session-manager.
			if(sessionCookie) {
				var user = this.um.getUserByToken(sessionCookie);

				if(user)
				{
					bSessionExists = true;
					userMessage = "Existing user session found for '" + user.username + "'.";
					
					main.push({
						username: user.username,
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
			logger.log("info", req.path, "Exception caught in getGameSession: " + ex, ex.stack);
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


				//the user was not found at all
				if(!user)
				{
					bError = true;
					userMessage = "That player is already deleted.";
				}
				//the user is currently playing. This scenario occurs when:
				// 1) If they open up 2 browser windows, play in one, then try to clear their session in the other
				// 2) If the player has really bad connection issues (or they pull the ethernet cable accidentally), and THEN refresh the page when they have the bad connection.
				//	  This will cause the browser to never send the "close" frame of the websocket, and the server will think the player is still "connected" and the packets are just getting lost.
				//    The way around the 2nd problem is to have the game server detect a loss of acknowledgments for a number of seconds. If the server doesn't get acks for like, 10 seconds or so,
				//	  the server should just consider the user disconnected and inactivate them.
				//In any case, don't allow the user to destroy active users. Things will most likely break.
				else if(user.isActive)
				{
					bError = true;
					var periodText = Math.round(this.inactivePeriod/1000);
					userMessage = "Player '" + user.username + "' is currently active and playing. Please check if you have this game currently running in another window. If this player is you and you confirmed you have no other games running, your user will become inactive after " + periodText + " seconds";
				}
				//the user exists, and is inactive. Go ahead and destroy it.
				else if(!user.isActive)
				{
					this.um.destroyUserId(user.id);
					userMessage = "Player '" + user.username + "' was deleted.";
					res.clearCookie("user-session");
				}
			}
		}
		catch(ex) {
			bError = true;
			logger.log("info", req.path, "Exception caught in clearUserSession: " + ex, ex.stack);
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
		logger.log("info", "join request called");
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
			if(!bError && this.um.activeUserArray.length >= this.um.maxActiveAllowed)
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

					//the only other scenario is if userInactive doesn't exist (This scenario means the user has never connected to this site before, or they erased their user session from the lobby with "start new play" button)
					if(!user)
					{
						bUserExists = false;
					}
					//if the user is already active, deny connection to the new user (this scenario occurs when the user has 2 windows of the same browser connecting to the game at once. IE: 2 chrome tabs connecting to the same game)
					else if(user.isActive)
					{
						bError = true;
						userMessage = "This user is already playing.";
					}
					//if the user is found and is inactive, just move on to the next step in the handshake (this scenario occurs when the user refreshes the browser after they have already connected to the game atleast once)
					else if(!user.isActive)
					{
						bUserExists = true;
					}
				}
			}

			if(!bError && !bUserExists)
			{
				//if they don't have a user, create one and set a cookie
				var user = this.um.createUser();
			
				user.username = username;

				//temporarily set a state for the new user. This is kinda hacky...its just a way so the user doesn't get picked up by the update loop immediately until the user has officially joined and created a websocket.
				user.stateName = "user-disconnected-state";

				var cookieOptions = {
					signed: true,
					maxAge: 60000 * 60 * 24 * expireDays,
					httpOnly: true,
					sameSite: serverConfig.sameSite,
					secure: serverConfig.https_enabled
				};
				
				res.cookie("user-session", user.token, cookieOptions);
			}

			//if there is no error at this point. They can move on to the next step (making the websocket connection);
		}
		catch(ex) {
			userMessage = "Internal server error.";
			//GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			logger.log("info", ex);
			bError = true;
		}

		//send the response
		var statusResponse = 200;
		if(bError)		
			statusResponse = 500;

		data.main = main;
		res.status(statusResponse).json({userMessage: userMessage, data: data});
	}

	getFesources(req, res) {
		var bError = false;
		var data = [];
		var userMessage = "";

		try {
			var r = this.rm.getResourcesSerialized();
			data = r;
		}
		catch(ex) {
			userMessage = "Internal server error.";
			logger.log("error", ex);
			bError = true;
		}

		//send the response
		var statusResponse = 200;
		if(bError)		
			statusResponse = 500;

		res.status(statusResponse).json({userMessage: userMessage, data: data});
	}

}

exports.GameServer = GameServer;