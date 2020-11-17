// import MyTilesetScene from "./my-tileset-scene.js"
// // import ServerConnectionScene from "./lobby-scene.js"
// // import UserConnectingScene from "./user-connecting-scene.js"
// // import UserDisconnectingScene from "./user-disconnecting-scene.js"
// // import MainScene from "./main-scene.js"
// import GlobalFuncs from "../global-funcs.js"
// import GameClientLobby from "./game-client-states/game-client-lobby.js"


// //honestly, this could just be a stand alone class. It doesn't have to be "scene", but whatever.
// export default class GameManagerScene extends Phaser.Scene {
// 	constructor() {
// 		super();
// 		this.myMessages = [];
// 		this.globalfuncs = new GlobalFuncs();
// 		this.ws = null;

// 		this.gameState = null;
// 		this.nextGameState = null;
// 	}

// 	init() {
// 		console.log('init on game manager scene');
// 		this.phaserEventMapping = [
// 			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
// 		];
// 		this.windowsEventMapping = [
// 		];

// 		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
// 		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);
// 	}
	  
// 	create() {
// 		this.gameState = new GameClientLobby(this);
// 		this.gameState.enter();
// 	}

// 	update(timeElapsed, dt) {
// 		this.gameState.update(timeElapsed, dt);

// 		if(this.nextGameState) {
// 			this.gameState.exit(timeElapsed, dt);
// 			this.nextGameState.enter(timeElapsed, dt);

// 			this.gameState = this.nextGameState;
// 			this.nextGameState = null;
// 		}
// 	}


// 	connectedToServer() {
// 		//take the websocket from server connection scene, and load up main scene
// 		this.ws = this.scene.manager.getScene("lobby-scene").ws;
// 		this.userName = this.scene.manager.getScene("lobby-scene").userName;

// 		this.changeState("user-connecting");
// 	}

// 	shutdown() {
// 		console.log('shutdown on ' + this.scene.key);
// 		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
// 		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);
// 	}

// 	destroy() {
// 		console.log('destroy on ' + this.scene.key);
// 	}

// 	//cheap way to do this...i don't feel like making a full blown state machine right now
// 	// changeState(newState) {
// 	// 	//exit current state
// 	// 	switch(this.gameState)
// 	// 	{
// 	// 		case "server-connection":
// 	// 			this.scene.manager.stop("server-connection-scene");
// 	// 			this.scene.manager.remove("server-connection-scene");
// 	// 			break;

// 	// 		case "user-connecting":
// 	// 			this.scene.manager.stop("user-connecting-scene");
// 	// 			this.scene.manager.remove("user-connecting-scene");
// 	// 			break;

// 	// 		case "user-connected":
// 	// 			this.scene.manager.stop("main-scene");
// 	// 			this.scene.manager.remove("main-scene");
// 	// 			break;

// 	// 		case "user-disconnecting":
// 	// 			this.scene.manager.stop("user-disconnecting-scene");
// 	// 			this.scene.manager.remove("user-disconnecting-scene");
// 	// 			break;
// 	// 		default:
// 	// 			//intentionally nothing
// 	// 			break;
// 	// 	}

// 	// 	//enter new state
// 	// 	switch(newState)
// 	// 	{
// 	// 		case "server-connection":
// 	// 			this.scene.manager.add("server-connection-scene", ServerConnectionScene, true, {
// 	// 				gm: this
// 	// 			});
// 	// 			break;

// 	// 		case "user-connecting":
// 	// 			this.scene.manager.add("user-connecting-scene", UserConnectingScene, true, {
// 	// 				gm: this,
// 	// 				ws: this.ws
// 	// 			});
// 	// 			break;

// 	// 		case "user-connected":
// 	// 			this.scene.manager.add("main-scene", MainScene, true,  {
// 	// 				gm: this,
// 	// 				ws: this.ws,
// 	// 				userName: this.userName
// 	// 			});
// 	// 			break;

// 	// 		case "user-disconnecting":
// 	// 			this.scene.manager.add("user-disconnecting-scene", UserDisconnectingScene, true, {
// 	// 				gm: this
// 	// 			});
// 	// 			break;
// 	// 		default:
// 	// 			//intentionally nothing
// 	// 			break;
// 	// 	}


// 	// 	this.gameState = newState;
// 	// }

// }

