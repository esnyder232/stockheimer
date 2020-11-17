import Phaser from 'phaser';
import GlobalFuncs from "./global-funcs.js"
import GameClientLobby from "./game-client-states/game-client-lobby.js"
import WebsocketHandler from "./classes/websocket-handler.js"

export default class GameClient {
	constructor() {
		this.myMessages = [];
		this.globalfuncs = null;
		this.ws = null;
		this.phaserGame = null;
		this.phaserConfig = null;

		this.gameState = null;
		this.nextGameState = null;

		this.frameRate = 30; //fps
		this.previousTick = 0;
		this.physicsTimeStep = 1/this.frameRate; //seconds
		this.frameTimeStep = 1000/this.frameRate; //ms
	}

	init() {
		console.log('init on game client');
		this.globalfuncs = new GlobalFuncs();
		this.wsh = new WebsocketHandler(this);

		this.phaserConfig = {
			type: Phaser.AUTO,
			backgroundColor: '#333333',
			width: 800,
			height:600,
			parent: 'game-div',
			pixelArt: true,
			physics: {
				default: 'arcade',
				arcade: {
					debug: true,
					debugShowBody: true,
					debugShowStaticBody: true,
					debugShowVelocity: true,
					gravity: {
						y: 300
					}
				}
			},
			scale: {
				zoom:1
			}
		}

		this.phaserGame = new Phaser.Game(this.phaserConfig);

		this.phaserEventMapping = [];
		this.windowsEventMapping = [];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		this.gameState = new GameClientLobby(this);
		this.gameState.enter();
		this.gameLoop();
	}

	gameLoop() {

		//if its the designated time has passed, run the update function
		if(this.previousTick + (this.frameTimeStep) < performance.now())
		{
			var dt = performance.now() - this.previousTick;
			this.previousTick = performance.now();
			this.gameState.update(dt);

			if(this.nextGameState)
			{
				this.gameState.exit();
				this.nextGameState.enter();

				this.gameState = this.nextGameState;
				this.nextGameState = null;
			}
		}

		//recall the gameloop
		if(performance.now() - this.previousTick < this.frameTimeStep)
		{
			//the +1 is because apparently this was getting called BEFORE the 'frameTimeStep'...whatever
			setTimeout(this.gameLoop.bind(this), this.frameTimeStep+1);
		}
	}

	// connectedToServer() {
	// 	//take the websocket from server connection scene, and load up main scene
	// 	this.ws = this.scene.manager.getScene("lobby-scene").ws;
	// 	this.userName = this.scene.manager.getScene("lobby-scene").userName;

	// 	this.changeState("user-connecting");
	// }
}

//feels like a hacky way to start...oh well. Its simple atleast.
var gc = new GameClient();
gc.init();