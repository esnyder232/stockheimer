import GameClientBaseState from './game-client-base-state.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';
import GameClientUserPlaying from './game-client-user-playing.js';
import UserConnectingScene from "../scenes/user-connecting-scene.js"
import TilemapResource from "../classes/tilemap-resource.js"
import MainScene from "../scenes/main-scene.js"

export default class GameClientUserConnecting extends GameClientBaseState {
	constructor(gc) {
		super(gc);

		//a mini state machine within this state machine.
		//0 - connecting websocket
		//1 - recieving game server state
		//2 - retrieve sprite resource data
		//3 - retrieving/loading sprite resources
		//4 - retrieving/loading tilemap resources
		//5 - retrieving class resources
		//6 - retrieving class state resources
		//7 - retrieving projectile resouces
		//8 - loading classes states
		//9 - loading classes
		//10 - start playing
		this.connectionState = 0;
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Connecting...");
		this.gc.userConnectingScene = this.gc.phaserGame.scene.add("user-connecting-scene", UserConnectingScene, true, {
			gc: this.gc
		});
		
		var bFail = this.gc.wsh.createWebSocket();
		
		if(bFail)
		{
			this.websocketErrored();
		}
		
		//create main scene
		this.gc.mainScene = this.gc.phaserGame.scene.add("main-scene", MainScene, true, {
			gc: this.gc
		});

		this.connectionState = this.gc.gameConstants["UserConnectingInternalStates"]["WEBSOCKET_CONNECTION"];
		this.gc.userConnectingScene.updateConnectingMessage("Connecting");


		//put main scene to sleep until we are done preloading everything
		this.gc.mainScene.scene.sleep();

		this.gc.mainMenu.enableExitServerButton();
		
		//create a tile map resource for later when we load the tilemap
		this.gc.theTilemapResource = new TilemapResource();
	}

	update(dt) {
		super.update(dt);

		switch(this.connectionState)
		{
			case this.gc.gameConstants["UserConnectingInternalStates"]["WEBSOCKET_CONNECTION"]:
				break;
			case this.gc.gameConstants["UserConnectingInternalStates"]["RECIEVE_WORLD_STATE"]:
				this.gc.ep.processServerEvents();

				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);

				break;
			case this.gc.gameConstants["UserConnectingInternalStates"]["RETRIEVE_SPRITE_RESOURCE_DATA"]:
				
				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);
				break;
			case this.gc.gameConstants["UserConnectingInternalStates"]["LOAD_SPRITE_RESOURCES"]:

				//check if the sprite resources have all been loaded (success or failure, doesn't matter here)
				var spriteResourceArray = this.gc.srm.getSpriteResources();
				var bSpritesFinised = true;

				for(var i = 0; i < spriteResourceArray.length; i++) {
					if(!spriteResourceArray[i].spriteLoadFinished) {
						bSpritesFinised = false;
						break;
					}
				}

				//if all sprites are done loading, move onto the next state
				if(bSpritesFinised) {
					this.globalfuncs.appendToLog("Loading sprite resources done.")
					this.connectionState = this.gc.gameConstants["UserConnectingInternalStates"]["RETRIEVE_GAME_RESOURCE_DATA"];
					this.gc.userConnectingScene.updateConnectingMessage("Getting game resource data");
					this.gc.getGameResourceData(this.cbGetGameResourceData.bind(this));
				}

				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);
				break;
			case this.gc.gameConstants["UserConnectingInternalStates"]["RETRIEVE_GAME_RESOURCE_DATA"]:

				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);
				break;
			case this.gc.gameConstants["UserConnectingInternalStates"]["LOAD_TILEMAP_RESOURCES"]:

				//check if the tilemap resource is done loading
				//if there is no error, move on to the next state
				if(this.gc.theTilemapResource.tilemapLoadFinished && !this.gc.theTilemapResource.tilemapLoadError) {
					this.globalfuncs.appendToLog("Loading tilemap resources done.")
					this.connectionState = this.gc.gameConstants["UserConnectingInternalStates"]["START_PLAYING"];
					this.gc.userConnectingScene.updateConnectingMessage("Loading tileset resources");
					//this.gc.getGameResourceData(this.cbGetGameResourceData.bind(this));
				}
				//if there is an error, tell the user and disconnect
				else if (this.gc.theTilemapResource.tilemapLoadFinished && this.gc.theTilemapResource.tilemapLoadError) {
					var msg = this.gc.theTilemapResource.tilemapLoadErrorMessage + ". Disconnecting.";
					this.globalfuncs.appendToLog(msg);
					this.gc.modalMenu.openMenu("error", msg);
					this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
				}
				
				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);
				break;

			case this.gc.gameConstants["UserConnectingInternalStates"]["LOAD_TILESET_RESOURCES"]:

				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);
				break;
			case this.gc.gameConstants["UserConnectingInternalStates"]["START_PLAYING"]:
				this.gc.nextGameState = new GameClientUserPlaying(this.gc);

				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);
				break;

		}
		
		//update managers
		this.gc.um.update(dt);
		this.gc.tm.update(dt);
		this.gc.srm.update(dt);
	}

	exit(dt) {
		super.exit(dt);
		this.gc.phaserGame.scene.stop("user-connecting-scene");
		this.gc.phaserGame.scene.remove("user-connecting-scene");

		this.gc.userConnectingScene = null;
	}

	websocketOpened() {
		this.globalfuncs.appendToLog("Connected.");
		this.globalfuncs.appendToLog("Getting world state...");
		this.gc.userConnectingScene.updateConnectingMessage("Getting world state");
		this.connectionState = this.gc.gameConstants["UserConnectingInternalStates"]["RECIEVE_WORLD_STATE"];
	}

	websocketErrored() {
		this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
	}

	websocketClosed() {
		this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
	}

	exitGameClick() {
		this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
	}

	worldDoneState(e) {
		this.globalfuncs.appendToLog("World state done.");
		this.globalfuncs.appendToLog("Getting sprite resource data...");
		this.gc.userConnectingScene.updateConnectingMessage("Getting sprite resource data");
		this.connectionState = this.gc.gameConstants["UserConnectingInternalStates"]["RETRIEVE_SPRITE_RESOURCE_DATA"];

		this.gc.getSpriteResourceData(this.cbGetSpriteResourceData.bind(this));
	}

	cbGetSpriteResourceData(error) {
		//if an error occured, just disconnect
		if(error) {
			this.globalfuncs.appendToLog("An Error has occured when retreiving sprite resource data. Disconnecting.");
			this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
		}
		else {
			//go through each sprite resource and load it into phaser
			this.globalfuncs.appendToLog("Getting sprite resource data done.");
			this.globalfuncs.appendToLog("Loading sprite resources...");
			this.gc.userConnectingScene.updateConnectingMessage("Loading sprite resources");
			this.connectionState = this.gc.gameConstants["UserConnectingInternalStates"]["LOAD_SPRITE_RESOURCES"];

			for(var i = 0; i < this.gc.spriteResourceData.length; i++) {
				var sr = this.gc.srm.createSpriteResource(this.gc.spriteResourceData[i].key, this.gc.spriteResourceData[i].imagePath, this.gc.spriteResourceData[i].animationPath);

				if(sr !== null) {
					sr.spriteResourceInit(this.gc);
					sr.loadSpriteResource();
				}
			}

			//hard coded tilemaps for now
			// this.gc.resourceLoadingScene.load.tilemapTiledJSON("my-tilemap", "assets/tilemaps/stockheimer-techdemo.json");
			this.gc.resourceLoadingScene.load.image("stockheimer-test-tileset-extruded", "assets/tilesets/stockheimer-test-tileset-extruded.png");
			
			this.gc.resourceLoadingScene.load.start();
		}
	}

	cbGetGameResourceData(error) {
		//if an error occured, just disconnect
		if(error) {
			this.globalfuncs.appendToLog("An Error has occured when retreiving game resource data. Disconnecting.");
			this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
		}
		else {
			//get the map that is loaded
			this.globalfuncs.appendToLog("Getting game resource data done.");
			this.globalfuncs.appendToLog("Loading tilemap resources...");
			this.gc.userConnectingScene.updateConnectingMessage("Loading tilemap resources");
			this.connectionState = this.gc.gameConstants["UserConnectingInternalStates"]["LOAD_TILEMAP_RESOURCES"];

			//create tilemap resource here
			var key = this.globalfuncs.getFilenameFromUrl(this.gc.gameResourceData.map_relpath);
			this.gc.theTilemapResource.key = key;
			this.gc.theTilemapResource.tilemapPath = this.gc.gameResourceData.map_relpath;
			this.gc.theTilemapResource.tilemapResourceInit(this.gc);
			this.gc.theTilemapResource.loadTilemapResource();

			this.gc.resourceLoadingScene.load.start();
		}
	}
}