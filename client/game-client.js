import $ from "jquery"
import Phaser from 'phaser';
import GlobalFuncs from "./global-funcs.js"
import GameClientLobby from "./game-client-states/game-client-lobby.js"
import WebsocketHandler from "./classes/websocket-handler.js"
import EventProcessor from "./classes/event-processor.js"
import GameObjectManager from "./managers/game-object-manager.js"
import Marked from "marked";

export default class GameClient {
	constructor() {
		this.globalfuncs = null;
		this.phaserGame = null;
		this.phaserConfig = null;

		this.gameState = null;
		this.nextGameState = null;

		this.wsh = null;
		this.ep = null;
		this.gom = null;

		this.users = []; //temp living location for users
		this.characters = [];
		this.projectiles = [];
		this.castles = [];

		this.myUserId = null;
		this.myUser = null;
		this.myCharacter = null;
		this.foundMyUser = false;
		this.foundMyCharacter = false;

		this.frameRate = 30; //fps
		this.previousTick = 0;
		this.physicsTimeStep = 1/this.frameRate; //seconds
		this.frameTimeStep = 1000/this.frameRate; //ms

		this.inactivePeriod = 10000; //ms - the amount of ms worth of ack loss (packet loss) before a player is considered "inactive" by the server
		this.inactiveAckThreashold = Math.round(this.inactivePeriod/1000) * this.frameRate; //number of acks needed to be lost (packet loss) for a player to be considered "inactive" by the server

		this.isContextMenuOn = true;

		this.changelogRaw = "";
		this.changelogFinal = null;
		
		//scenes
		this.lobbyScene = null;
		this.mainScene = null;
		this.userConnectingScene = null;
		this.userDisconnectingScene = null;
	}

	init() {
		console.log('init on game client');
		this.globalfuncs = new GlobalFuncs();
		this.wsh = new WebsocketHandler();
		this.ep = new EventProcessor();
		this.gom = new GameObjectManager();

		this.wsh.init(this, this.ep);
		this.ep.init(this, this.wsh);
		this.gom.init(this);

		this.phaserConfig = {
			type: Phaser.AUTO,
			backgroundColor: '#333333',
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
				parent: "game-div",
				mode: Phaser.Scale.RESIZE,
				width: 800,
				height: 600,
				zoom:1
			}
		}


		this.phaserGame = new Phaser.Game(this.phaserConfig);

		this.phaserEventMapping = [];
		this.windowsEventMapping = [];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//add events to allow users to type in the text boxes
		var textboxes = $("input[type='text'], input[type='password']");
		textboxes.on("focus", () => {
			this.phaserGame.input.keyboard.preventDefault = false;
			this.phaserGame.input.keyboard.enabled = false;
		});

		textboxes.on("blur", () => {
			this.phaserGame.input.keyboard.preventDefault = true;
			this.phaserGame.input.keyboard.enabled = true;
		});

		//fetch the game constants
		$.ajax({url: "./shared_files/game-constants.json", method: "GET"})
		.done((responseData, textStatus, xhr) => {
			this.gameConstants = responseData;
		})
		.fail((xhr) => {
			this.globalfuncs.appendToLog('VERY BAD ERROR: Failed to get game-constants.');
		})

		//get the change log
		$.ajax({url: "./CHANGELOG", method: "GET"})
		.done((responseData, textStatus, xhr) => {
			this.changelogRaw = responseData;
			this.changelogFinal = Marked(this.changelogRaw);
			$("#change-log").html(this.changelogFinal);
		})
		.fail((xhr) => {
			this.globalfuncs.appendToLog('Failed to get change log.');
		})



		this.gameState = new GameClientLobby(this);
		this.gameState.enter();
		this.gameLoop();
		console.log(this);

		$(document).on("contextmenu", this.contextMenuListener.bind(this));

		//hide loading text
		$(".loading-text").addClass("hide");

		//debugging / testing
		// var a1 = this.gom.createGameObject("character", 1);
		// var a2 = this.gom.createGameObject("character", 2);
		// var a3 = this.gom.createGameObject("character", 3);
		// a1.characterInit(this);
		// a2.characterInit(this);
		// a3.characterInit(this);

		// this.debugPrintFunc();

		// this.gom.update(0);

		// this.debugPrintFunc();
		// this.gom.destroyGameObject(a1.id);
		
		// this.gom.update(0);
		
		// this.debugPrintFunc();
		
		// this.gom.update(0);

		// this.debugPrintFunc();

	}

	debugPrintFunc() {
		console.log('active character length: ' + this.gom.getActiveGameObjects().length);
	}

	turnOffContextMenu() {
		this.isContextMenuOn = false;
	}

	turnOnContextMenu() {
		this.isContextMenuOn = true;
	}

	contextMenuListener(e) {
		if(this.isContextMenuOn)
		{
			return true;
		}
		else
		{
			e.preventDefault();
			return false;
		}
	}



	reset() {
		this.users.length = 0;
		this.characters.length = 0;
		this.projectiles.length = 0;
		this.myUserId = null;
		this.myCharacter = null;
		this.myUser = null;
		this.foundMyUser = false;
		this.foundMyCharacter = false;
		this.castles = [];
		this.ep.reset();
	}

	gameLoop() {
		var nowTime = performance.now();

		//if its the designated time has passed, run the update function
		if(this.previousTick + (this.frameTimeStep) <= nowTime)
		{
			var dt = nowTime - this.previousTick;
			this.previousTick = nowTime;
			try {
				this.gameState.update(dt);

				if(this.nextGameState)
				{
					this.gameState.exit();
					this.nextGameState.enter();
	
					this.gameState = this.nextGameState;
					this.nextGameState = null;
				}
			}
			catch(ex) {
				this.globalfuncs.appendToLog("Exception caught in game loop: " + ex)
				console.log(ex);
				var stopHere = true;
			}
		}

		//recall the gameloop
		if(nowTime - this.previousTick < this.frameTimeStep)
		{
			//the +1 is because apparently this was getting called BEFORE the 'frameTimeStep'...whatever
			window.setTimeout(this.gameLoop.bind(this), this.frameTimeStep+1);
		}
	}
}

//feels like a hacky way to start...oh well. Its simple atleast.
var gc = new GameClient();
gc.init();

//adding game client to phaser global library is for debugging purposes;
Phaser.myGameClient = gc;