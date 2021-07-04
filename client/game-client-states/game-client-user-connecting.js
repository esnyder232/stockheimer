import GameClientBaseState from './game-client-base-state.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';
import GameClientUserPlaying from './game-client-user-playing.js';
import UserConnectingScene from "../scenes/user-connecting-scene.js"
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
		this.connectionState = "WEBSOCKET_CONNECTION";
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

			case "START_PLAYING":
				this.gc.nextGameState = new GameClientUserPlaying(this.gc);

				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);
				break;

		}
		
		//update managers
		this.gc.um.update(dt);
		this.gc.tm.update(dt);
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
}