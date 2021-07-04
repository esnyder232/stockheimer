import GameClientBaseState from './game-client-base-state.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';
import GameClientUserPlaying from './game-client-user-playing.js';
import UserConnectingScene from "../scenes/user-connecting-scene.js"
import TilemapResource from "../classes/tilemap-resource.js"
import MainScene from "../scenes/main-scene.js"

export default class GameClientUserConnecting extends GameClientBaseState {
	constructor(gc) {
		super(gc);

		// NEW
		//0 - connecting websocket
		//1 - recieving game server state
		//2 - retrieve resources
		//3 - load resources and wait until they are done
		//4 - start playing


		// OLD
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

		this.connectionState = "WEBSOCKET_CONNECTION";
		this.gc.userConnectingScene.updateConnectingMessage("Connecting");


		//put main scene to sleep until we are done preloading everything
		this.gc.mainScene.scene.sleep();
		this.gc.mainMenu.enableExitServerButton();
	}


	update(dt) {
		super.update(dt);

		switch(this.connectionState)
		{
			case "WEBSOCKET_CONNECTION":
				break;
			case "RECIEVE_WORLD_STATE":
				this.gc.ep.processServerEvents();

				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);
				break;

			case "RETRIEVE_RESOURCES":
				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);
				break;

			case "LOAD_RESOURCES":
				if(!this.gc.rm.anyResourcesLoading()) {
					this.connectionState = "START_PLAYING";
				}

				this.gc.resourceLoadingScene.load.start();
				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);
				break;



			// case "RETRIEVE_SPRITE_RESOURCE_DATA":
				
			// 	this.gc.wsh.createPacketForUser();
			// 	this.gc.wsh.update(dt);
			// 	break;

			// case "LOAD_SPRITE_RESOURCES":

			// 	//check if the sprite resources have all been loaded (success or failure, doesn't matter here)
			// 	var spriteResourceArray = this.gc.srm.getSpriteResources();
			// 	var bFinished = true;

			// 	for(var i = 0; i < spriteResourceArray.length; i++) {
			// 		if(!spriteResourceArray[i].spriteLoadFinished) {
			// 			bFinished = false;
			// 			break;
			// 		}
			// 	}

			// 	//if all sprites are done loading, move onto the next state
			// 	if(bFinished) {
			// 		this.globalfuncs.appendToLog("Loading sprite resources done.")
			// 		this.connectionState = "RETRIEVE_GAME_RESOURCE_DATA";
			// 		this.gc.userConnectingScene.updateConnectingMessage("Getting game resource data");
			// 		this.gc.getGameResourceData(this.cbGetGameResourceData.bind(this));
			// 	}

			// 	this.gc.wsh.createPacketForUser();
			// 	this.gc.wsh.update(dt);
			// 	break;
			// case "RETRIEVE_GAME_RESOURCE_DATA":

			// 	this.gc.wsh.createPacketForUser();
			// 	this.gc.wsh.update(dt);
			// 	break;
			// case "LOAD_TILEMAP_RESOURCES":

			// 	//check if the tilemap resource is done loading
			// 	//if there is no error, move on to the next state
			// 	if(this.gc.theTilemapResource.tilemapLoadFinished && !this.gc.theTilemapResource.tilemapLoadError) {
			// 		this.globalfuncs.appendToLog("Loading tilemap resources done.")
			// 		this.connectionState = "LOAD_TILESET_RESOURCES";
			// 		this.gc.userConnectingScene.updateConnectingMessage("Loading tileset resources");
			// 		this.loadTilesetResources();
			// 	}
			// 	//if there is an error, tell the user and disconnect
			// 	else if (this.gc.theTilemapResource.tilemapLoadFinished && this.gc.theTilemapResource.tilemapLoadError) {
			// 		var msg = this.gc.theTilemapResource.tilemapLoadErrorMessage + ". Disconnecting.";
			// 		this.globalfuncs.appendToLog(msg);
			// 		this.gc.modalMenu.openMenu("error", msg);
			// 		this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
			// 	}
				
			// 	this.gc.wsh.createPacketForUser();
			// 	this.gc.wsh.update(dt);
			// 	break;

			// case "LOAD_TILESET_RESOURCES":
			// 	//check if the tileset resources have all been loaded (success or failure, doesn't matter here)
			// 	var tilesetResourceArray = this.gc.trm.getTilesetResources();
			// 	var bFinished = true;

			// 	for(var i = 0; i < tilesetResourceArray.length; i++) {
			// 		if(!tilesetResourceArray[i].tilesetLoadFinished) {
			// 			bFinished = false;
			// 			break;
			// 		}
			// 	}

			// 	//if all tilesets are done loading, move onto the next state
			// 	if(bFinished) {
			// 		this.globalfuncs.appendToLog("Loading tileset resources done.")
			// 		this.globalfuncs.appendToLog("Getting character class mapping data...")
			// 		this.connectionState = "RETRIEVE_CHARACTER_CLASS_MAPPING";
			// 		this.gc.userConnectingScene.updateConnectingMessage("Getting character Class mapping data.");
			// 		this.gc.getCharacterClassMappingData(this.cbGetCharacterClassMappingData.bind(this));
			// 	}

			// 	this.gc.wsh.createPacketForUser();
			// 	this.gc.wsh.update(dt);
			// 	break;

			// case "RETRIEVE_CHARACTER_CLASS_MAPPING":
				
			// 	this.gc.wsh.createPacketForUser();
			// 	this.gc.wsh.update(dt);
			// 	break;

			// case "RETRIEVE_CHARACTER_CLASS_DATA":
				
			// 	this.gc.wsh.createPacketForUser();
			// 	this.gc.wsh.update(dt);
			// 	break;

			case "START_PLAYING":
				this.gc.nextGameState = new GameClientUserPlaying(this.gc);

				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);
				break;

		}
		
		//update managers
		this.gc.um.update(dt);
		this.gc.tm.update(dt);
		// this.gc.srm.update(dt);
		// this.gc.trm.update(dt);
		this.gc.rm.update(dt);
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
		this.connectionState = "RECIEVE_WORLD_STATE";
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
		// OLD
		// this.globalfuncs.appendToLog("World state done.");
		// this.globalfuncs.appendToLog("Getting sprite resource data...");
		// this.gc.userConnectingScene.updateConnectingMessage("Getting sprite resource data");
		// this.connectionState = "RETRIEVE_SPRITE_RESOURCE_DATA";

		// this.gc.getSpriteResourceData(this.cbGetSpriteResourceData.bind(this));


		// NEW
		this.globalfuncs.appendToLog("World state done.");
		this.globalfuncs.appendToLog("Getting resources...");
		this.gc.userConnectingScene.updateConnectingMessage("Getting resources");
		this.connectionState = "RETRIEVE_RESOURCES";

		this.gc.getResources(this.cbGetResources.bind(this));
	}

	cbGetResources(bError) {
		if(bError) {
			this.globalfuncs.appendToLog("An Error has occured when retreiving resources. Disconnecting.");
			this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
		}
		else {
			//go through each resource and load them into the client's resource manager
			this.globalfuncs.appendToLog("Getting resource done.");
			this.globalfuncs.appendToLog("Loading resources...");
			this.gc.userConnectingScene.updateConnectingMessage("Loading resources");
			this.connectionState = "LOAD_RESOURCES";



			for(var i = 0; i < this.gc.resourcesResults.length; i++) {
				this.gc.rm.loadResource(this.gc.resourcesResults[i], this.cbResourceLoadComplete.bind(this));
			}
		}
	}

	cbResourceLoadComplete(resource) {
		if(resource.resourceType === "tilemap") {
			if(resource.status === "failed") {
				this.globalfuncs.appendToLog("An Error has occured when loading tilemap data. Disconnecting.");
				this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
			}
			else {
				this.gc.activeTilemap = resource;
			}
		}
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
			this.connectionState = "LOAD_SPRITE_RESOURCES";

			for(var i = 0; i < this.gc.spriteResourceData.length; i++) {
				var sr = this.gc.srm.createSpriteResource(this.gc.spriteResourceData[i].key, this.gc.spriteResourceData[i].imagePath, this.gc.spriteResourceData[i].animationPath);

				if(sr !== null) {
					sr.spriteResourceInit(this.gc);
					sr.loadSpriteResource();
				}
			}

			this.gc.resourceLoadingScene.load.start();
		}
	}

	// cbGetGameResourceData(error) {
	// 	//if an error occured, just disconnect
	// 	if(error) {
	// 		this.globalfuncs.appendToLog("An Error has occured when retreiving game resource data. Disconnecting.");
	// 		this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
	// 	}
	// 	else {
	// 		//get the map that is loaded
	// 		this.globalfuncs.appendToLog("Getting game resource data done.");
	// 		this.globalfuncs.appendToLog("Loading tilemap resources...");
	// 		this.gc.userConnectingScene.updateConnectingMessage("Loading tilemap resources");
	// 		this.connectionState = "LOAD_TILEMAP_RESOURCES";

	// 		//create tilemap resource here
	// 		var key = this.globalfuncs.getFilenameFromUrl(this.gc.gameResourceData.map_relpath);
	// 		this.gc.theTilemapResource.key = key;
	// 		this.gc.theTilemapResource.tilemapPath = this.gc.gameResourceData.map_relpath;
	// 		this.gc.theTilemapResource.tilemapResourceInit(this.gc);
	// 		this.gc.theTilemapResource.loadTilemapResource();

	// 		this.gc.resourceLoadingScene.load.start();
	// 	}
	// }

	// loadTilesetResources() {
	// 	this.globalfuncs.appendToLog("Loading tileset resources...");
	// 	//create a tileset resource for each layer in the loaded map
	// 	var tilemapData = this.gc.phaserGame.cache.tilemap.get(this.gc.theTilemapResource.key);

	// 	if(tilemapData !== undefined) {
	// 		for(var i = 0; i < tilemapData.data.tilesets.length; i++) {
	// 			var filename = this.globalfuncs.getFilenameFromUrl(tilemapData.data.tilesets[i].image)
	// 			var path = this.gc.gameResourceData.tilesets_dir_relpath + "/" + filename;

	// 			var ts = this.gc.trm.createTilesetResource(filename, path);
	// 			ts.tilesetResourceInit(this.gc);
	// 			ts.loadTilesetResource();
	// 		}

	// 		this.gc.resourceLoadingScene.load.start();
	// 	}
	// 	else {
	// 		//something VERY wierd happened here
	// 		this.globalfuncs.appendToLog("A VERY wierd error has occured when reading tilemap data: could not find the tilemap. Disconnecting.");
	// 		this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
	// 	}
	// }


	cbGetCharacterClassMappingData(error) {
		//if an error occured, just disconnect
		if(error) {
			this.globalfuncs.appendToLog("An Error has occured when retreiving character class mapping data. Disconnecting.");
			this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
		}
		else {
			this.globalfuncs.appendToLog("Getting character class mapping data done.");
			var bError = false;

			//create a character class for each object in the character class map. (this will be filled in with actual data later)
			//if ANYTHING errors here, just disconnect
			try {
				for(var i = 0; i < this.gc.characterClassMappingData.length; i++) {
					var c = this.gc.ccm.createCharacterClass(this.gc.characterClassMappingData[i].serverId);
					c.key = this.gc.characterClassMappingData[i].key;
				}
			} catch (ex) {
				console.log("Exception caught when processing character class mapping data: " + ex);
				console.log(ex.trace);
				this.globalfuncs.appendToLog("Exception caught when processing character class mapping data: " + ex);
				this.gc.modalMenu.openMenu("error", "An error occurred when processing character class mapping data. See the console for more details.");
				this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
				bError = true;
			}

			if(!bError) {
				this.globalfuncs.appendToLog("Getting character class data...");
				this.gc.userConnectingScene.updateConnectingMessage("Getting character class data.");
				this.connectionState = "RETRIEVE_CHARACTER_CLASS_DATA";
				this.gc.getCharacterClassData(this.cbGetCharacterClassData.bind(this));
			}
		}
	}

	cbGetCharacterClassData(error) {
		//if an error occured, just disconnect
		if(error) {
			this.globalfuncs.appendToLog("An Error has occured when retreiving character class data. Disconnecting.");
			this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
		}
		else {
			this.globalfuncs.appendToLog("Getting character class data done.");
			var bError = false;
			var errorMessage = "";

			//NOW fill in the character class data
			//if ANYTHING errors here, just disconnect
			try {
				var characterClassArray = this.gc.ccm.getCharacterClasses()
				for(var i = 0; i < characterClassArray.length; i++) {
					var cdata = this.gc.characterClassData.find((x) => {return x.key === characterClassArray[i].key;});

					if(cdata === undefined) {
						bError = true;
						errorMessage = "Error when processing character class data: Character class with key '" + characterClassArray[i].key + "' was not found in the character class data. Character class could not be created. Disconnecting.";
					}
					else {
						characterClassArray[i].name = cdata.name;
						characterClassArray[i].hp = cdata.hp;
						characterClassArray[i].speed = cdata.speed;
						characterClassArray[i].animationSets = cdata.animationSets;
						characterClassArray[i].idleAnimationSet = cdata.idleAnimationSet;
						characterClassArray[i].movementAnimationSet = cdata.movementAnimationSet;
						characterClassArray[i].fireStateKey = cdata.fireStateKey;
						characterClassArray[i].altFireStateKey = cdata.altFireStateKey;
					}
				}
			} catch (ex) {
				bError = true;
				errorMessage = "Exception caught when processing character class data: " + ex;
				this.globalfuncs.appendToLog(errorMessage);
				console.log(ex.trace);
			}

			if(bError) {
				this.gc.modalMenu.openMenu("error", errorMessage);
				this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
			} else {
				this.globalfuncs.appendToLog("Starting game.");
				this.gc.userConnectingScene.updateConnectingMessage("Starting game.");
				this.connectionState = "START_PLAYING";
			}
		}
	}



}