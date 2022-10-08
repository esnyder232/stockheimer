import GameClientBaseState from './game-client-base-state.js';
import GameClientUserLeavingGame from './game-client-user-leaving-game.js';
import GameClientUserPlaying from './game-client-user-playing.js';

import MainScene from "../scenes/main-scene.js"
import MainUiScene from "../scenes/main-ui-scene.js"

export default class GameClientUserJoiningGame extends GameClientBaseState {
	constructor(gc) {
		super(gc);

		// NEW
		//0 - recieving game server state
		//1 - retrieve resources
		//2 - load resources and wait until they are done
		//3 - start playing
		this.connectionState = "RECIEVE_WORLD_STATE";

		this.gc.ep.setAllEventEnable(false);
		this.gc.ep.setEventEnable("serverMapLoaded", true);
		this.gc.ep.setEventEnable("userConnected", true);
		this.gc.ep.setEventEnable("userDisconnected", true);
		this.gc.ep.setEventEnable("updateUserInfo", true);
		this.gc.ep.setEventEnable("yourUser", true);
		this.gc.ep.setEventEnable("worldStateDone", true);
		this.gc.ep.setEventEnable("addTeam", true);
		this.gc.ep.setEventEnable("updateTeamKoth", true);
		this.gc.ep.setEventEnable("updateTeam", true);
		this.gc.ep.setEventEnable("removeTeam", true);
		this.gc.ep.setEventEnable("addRound", true);
		this.gc.ep.setEventEnable("updateRoundState", true);
		this.gc.ep.setEventEnable("leaveGameImmediately", true);
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Joining game. Getting world state...");
		this.gc.userConnectingScene.updateConnectingMessage("Joining game. Getting world state...");
		this.connectionState = "RECIEVE_WORLD_STATE";

		//create main scene
		this.gc.mainScene = this.gc.phaserGame.scene.add("main-scene", MainScene, true, {
			gc: this.gc
		});

		//create main ui scene
		this.gc.mainUiScene = this.gc.phaserGame.scene.add("main-ui-scene", MainUiScene, true, {
			gc: this.gc
		});
		

		//put main scene to sleep until we are done preloading everything
		this.gc.mainScene.scene.sleep();
		this.gc.mainUiScene.scene.sleep();
	}


	update(dt) {
		super.update(dt);

		switch(this.connectionState) {
			case "RECIEVE_WORLD_STATE":
				break;

			case "RETRIEVE_RESOURCES":
				break;

			case "LOAD_RESOURCES":
				if(!this.gc.rm.anyResourcesLoading()) {
					this.connectionState = "START_PLAYING";
				}

				this.gc.resourceLoadingScene.load.start();
				break;

			case "START_PLAYING":
				this.gc.nextGameState = new GameClientUserPlaying(this.gc);
				break;

		}
		
		//update managers
		this.gc.wsh.processServerPackets();
		this.gc.ep.processServerEvents();
		this.gc.ep.insertEventsIntoPacket();
		this.gc.wsh.createPacketForUser();
		this.gc.wsh.sendPacketForUser();
		this.gc.wsh.update(dt);
		this.gc.um.update(dt);
		this.gc.tm.update(dt);
		this.gc.rm.update(dt);

		if(this.gc.bDisconnect || !this.gc.wsConnected || !this.gc.bServerMapLoaded) {
			this.gc.nextGameState = new GameClientUserLeavingGame(this.gc);
		}
	}

	exit(dt) {
		super.exit(dt);
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
			this.gc.bDisconnect = true;
		}
		else {
			//go through each resource and load them into the client's resource manager
			this.globalfuncs.appendToLog("Getting resource done.");
			this.globalfuncs.appendToLog("Loading resources...");
			this.gc.userConnectingScene.updateConnectingMessage("Loading resources");
			this.connectionState = "LOAD_RESOURCES";

			console.log("Resource results:");
			console.log(this.gc.resourcesResults)

			for(var i = 0; i < this.gc.resourcesResults.length; i++) {
				this.gc.rm.loadResource(this.gc.resourcesResults[i], this.cbResourceLoadComplete.bind(this));
			}
		}
	}

	cbResourceLoadComplete(resource) {
		if(resource.resourceType === "tilemap") {
			if(resource.status === "failed") {
				this.globalfuncs.appendToLog("An Error has occured when loading tilemap data. Disconnecting.");
				this.gc.bDisconnect = true;
			}
			else {
				this.gc.activeTilemap = resource;
			}
		} else if (resource.resourceType === "map") {
			if(resource.status === "failed") {
				this.globalfuncs.appendToLog("An Error has occured when loading map data. Disconnecting.");
				this.gc.bDisconnect = true;
			}
			else {
				this.gc.currentMapResource = resource;
				this.gc.currentGameType = this.globalfuncs.getValueDefault(resource?.data?.gameData?.type, "deathmatch");
				this.gc.matchWinCondition = this.globalfuncs.getValueDefault(resource?.data?.gameData?.matchWinCondition, 1);
				
			}
		}
	}

	leaveGameImmediately(e) {
		this.gc.bServerMapLoaded = false;
	}
}