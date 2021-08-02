import $ from "jquery"
import Phaser from 'phaser';
import GlobalFuncs from "./global-funcs.js"
import GameClientLobby from "./game-client-states/game-client-lobby.js"
import WebsocketHandler from "./classes/websocket-handler.js"
import EventProcessor from "./classes/event-processor.js"
import GameObjectManager from "./managers/game-object-manager.js"
import UserManager from "./managers/user-manager.js"
import TeamManager from "./managers/team-manager.js"
import ResourceManager from "./managers/resource-manager.js"
import ResourceLoadingScene from "./scenes/resource-loading-scene.js"
import Marked from "marked";
import ModalMenu from "./ui-classes/modal-menu.js"
import ConfirmMenu from "./ui-classes/confirm-menu.js"
import QuickMenu from "./ui-classes/quick-menu.js"
import DebugMenu from "./ui-classes/debug-menu.js"
import MainMenu from "./ui-classes/main-menu.js"


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
		this.um = null;
		this.tm = null;
		this.rm = null;

		this.myUserServerId = null;
		this.myUser = null;
		this.myCharacter = null;
		this.foundMyUser = false;
		this.foundMyCharacter = false;

		this.frameRate = 30; //fps
		this.previousTick = 0;
		this.frameTimeStep = 1000/this.frameRate; //ms
		this.frameNum = 0; //debugging

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
		this.resourceLoadingScene = null;

		//menus
		this.quickMenu = null;
		this.mainMenu = null;
		this.modalMenu = null;
		this.confirmMenu = null;
		this.debugMenu = null;

		this.gameConstants = {};
		this.gameConstantsInverse = {};

		//probably temporary until there are more
		this.theRound = null;
		this.activeTilemap = null;
		this.bDisplayServerSightlines = false;

		////////////////////////////////////
		// api end points for resources
		//probably temporary place for these api end points to live
		this.resourcesApi = "./api/get-resources";
		this.resourcesResults = [];
		////////////////////////////////////
	}

	init() {
		console.log('init on game client');
		this.globalfuncs = new GlobalFuncs();
		this.wsh = new WebsocketHandler();
		this.ep = new EventProcessor();
		this.gom = new GameObjectManager();
		this.um = new UserManager();
		this.tm = new TeamManager();
		this.rm = new ResourceManager();

		this.wsh.init(this, this.ep);
		this.ep.init(this, this.wsh);
		this.gom.init(this);
		this.um.init(this);
		this.tm.init(this);
		this.rm.init(this);

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
			},
			input: {
				keyboard: true,
				mouse: true,
				windowEvents: false
			},
			callbacks: {
				postBoot: this.cbPostBoot.bind(this)
			}
		}

		this.phaserGame = new Phaser.Game(this.phaserConfig);


		//add the resource loading scene and hide it.
		this.phaserGame.scene.add("resource-loading-scene", ResourceLoadingScene, true, {
			gc: this
		});
		

		this.phaserEventMapping = [];
		this.windowsEventMapping = [];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//add events to allow users to type in the text boxes
		var textboxes = $("input[type='text']");
		textboxes.on("focus", () => {
			this.phaserGame.input.keyboard.preventDefault = false;
			this.phaserGame.input.keyboard.enabled = false;
			this.phaserGame.input.mouse.enabled = false;
		});

		textboxes.on("blur", () => {
			this.phaserGame.input.keyboard.preventDefault = true;
			this.phaserGame.input.keyboard.enabled = true;
			this.phaserGame.input.mouse.enabled = true;
		});

		document.addEventListener("keydown", (e) => {
			switch(e.code)
			{
				case "Tab":
					e.preventDefault();
					break;
			}
		})

		//fetch the game constants
		$.ajax({url: "./shared_files/game-constants.json", method: "GET"})
		.done((responseData, textStatus, xhr) => {
			this.gameConstants = responseData;

			//compute the inverse of game constants
			for(var enumKey in this.gameConstants)
			{
				if (this.gameConstants.hasOwnProperty(enumKey)) 
				{
					this.gameConstantsInverse[enumKey] = {};

					for(var key in this.gameConstants[enumKey])
					{
						if (this.gameConstants[enumKey].hasOwnProperty(key)) 
						{
							var val = this.gameConstants[enumKey][key];
							this.gameConstantsInverse[enumKey][val] = key
						}
					}
				}
			}
		})
		.fail((xhr) => {
			var msg = "VERY BAD ERROR: Failed to get game-constants.";
			this.globalfuncs.appendToLog(msg);
			this.gc.modalMenu.openMenu("error", msg);
		})

		//get the change log
		$.ajax({url: "./CHANGELOG", method: "GET"})
		.done((responseData, textStatus, xhr) => {
			this.changelogRaw = responseData;
			this.changelogFinal = Marked(this.changelogRaw);
			$("#change-log").html(this.changelogFinal);
		})
		.fail((xhr) => {
			var msg = "Failed to get change log.";
			this.globalfuncs.appendToLog(msg);
			this.gc.modalMenu.openMenu("error", msg);
		})



		this.gameState = new GameClientLobby(this);
		this.gameState.enter();
		this.gameLoop();
		console.log(this);

		$(document).on("contextmenu", this.contextMenuListener.bind(this));

		//hide loading text
		$(".loading-text").addClass("hide");

		//menus
		this.quickMenu = new QuickMenu();
		this.mainMenu = new MainMenu();
		this.modalMenu = new ModalMenu();
		this.confirmMenu = new ConfirmMenu();
		
		this.debugMenu = new DebugMenu();

		this.quickMenu.init(this);
		this.mainMenu.init(this);
		this.modalMenu.init(this)
		this.confirmMenu.init(this)
		this.debugMenu.init(this);

		this.quickMenu.activate();
		this.mainMenu.activate();
		this.modalMenu.activate();
		this.confirmMenu.activate();
		this.debugMenu.activate();

		this.quickMenu.hideMainSceneIcon();
		this.mainMenu.disableExitServerButton();


		//debugging / testing
		//this.modalMenu.openMenu("error", "Hello, this is an error message!!!");

		//this.confirmMenu.openMenu("Test Message", "Test Title", "Can Confirm", "CANCELE IT TNOPNONNO", this.cbTest.bind(this));

		// this.debugPrintFunc();
	}


	cbPostBoot() {
		console.log("PHASER IS READY");
		this.resourceLoadingScene = this.phaserGame.scene.getScene("resource-loading-scene");
		this.lobbyScene = this.phaserGame.scene.getScene("lobby-scene");
	}

	debugPrintFunc() {
		console.log('team array length: ' + this.tm.getTeams().length);
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

	getResources(cb) {
		$.ajax({url: this.resourcesApi, method: "GET"})
		.done((responseData, textStatus, xhr) => {
			this.resourcesResults = this.globalfuncs.getDataArray(responseData.data, 0);
			cb(false);
		})
		.fail((xhr) => {
			var msg = 'Failed to get resource data. Status: ' + xhr.statusText + '(code ' + xhr.status + ').';
			this.globalfuncs.appendToLog(msg);
			this.modalMenu.openMenu("error", msg);
			cb(true);
		})
	}

	reset() {
		this.myUserServerId = null;
		this.myCharacter = null;
		this.myUser = null;
		this.foundMyUser = false;
		this.foundMyCharacter = false;
		this.resourcesResults = [];
		this.ep.reset();
		this.theRound = null;
	}

	gameLoop() {
		var nowTime = performance.now();

		//if its the designated time has passed, run the update function
		if(this.previousTick + (this.frameTimeStep) <= nowTime)
		{
			var dt = nowTime - this.previousTick;
			this.previousTick = nowTime;
			try {
				//console.log("=== FRAME " + this.frameNum + " ===")
				this.gameState.update(dt);

				if(this.nextGameState)
				{
					this.gameState.exit();
					this.nextGameState.enter();
	
					this.gameState = this.nextGameState;
					this.nextGameState = null;
				}

				//this.frameNum++;
			}
			catch(ex) {
				this.globalfuncs.appendToLog("Exception caught in game loop: " + ex)
				console.log(ex);
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