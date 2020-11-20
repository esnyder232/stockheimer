import Phaser from 'phaser';
import GlobalFuncs from "./global-funcs.js"
import GameClientLobby from "./game-client-states/game-client-lobby.js"
import WebsocketHandler from "./classes/websocket-handler.js"

export default class GameClient {
	constructor() {
		this.globalfuncs = null;
		this.phaserGame = null;
		this.phaserConfig = null;

		this.gameState = null;
		this.nextGameState = null;

		this.wsh = null;

		this.users = []; //temp living location for users

		this.frameRate = 30; //fps
		this.previousTick = 0;
		this.physicsTimeStep = 1/this.frameRate; //seconds
		this.frameTimeStep = 1000/this.frameRate; //ms

		this.inactivePeriod = 10000; //ms - the amount of ms worth of ack loss (packet loss) before a player is considered "inactive" by the server
		this.inactiveAckThreashold = Math.round(this.inactivePeriod/1000) * this.frameRate; //number of acks needed to be lost (packet loss) for a player to be considered "inactive" by the server
	}

	init() {
		console.log('init on game client');
		this.globalfuncs = new GlobalFuncs();
		this.wsh = new WebsocketHandler();

		this.wsh.init(this);

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
}

//feels like a hacky way to start...oh well. Its simple atleast.
var gc = new GameClient();
gc.init();