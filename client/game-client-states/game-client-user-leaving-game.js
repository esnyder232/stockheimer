import GameClientBaseState from './game-client-base-state.js';
import GameClientUserWaitingForServer from './game-client-user-waiting-for-server.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';


export default class GameClientUserLeavingGame extends GameClientBaseState {
	constructor(gc) {
		super(gc);
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Leaving game...");

		this.gc.bServerMapLoaded = false;

		//destroy all game objects
		var allObjects = this.gc.gom.getGameObjects();

		for(var i = 0; i < allObjects.length; i++)
		{
			this.gc.gom.destroyGameObject(allObjects[i].id);
		}

		//destroy all users
		var allUsers = this.gc.um.getUsers();

		for(var i = 0; i < allUsers.length; i++)
		{
			this.gc.um.destroyUser(allUsers[i].id);
		}

		//destroy all teams
		var allTeams = this.gc.tm.getTeams();

		for(var i = 0; i < allTeams.length; i++)
		{
			this.gc.tm.destroyTeam(allTeams[i].id);
		}

		//unload resources
		this.gc.rm.unloadAllResources();

		//clear out event processor stuff
		this.gc.ep.serverToClientEvents.length = 0;
		this.gc.ep.clientToServerEvents.length = 0;
		this.gc.ep.fragmentedClientToServerEvents.length = 0;
		this.gc.ep.fragmentedServerToClientEvents.length = 0;
		this.gc.ep.fragmentIdCounter = 0;
		
		//remove all callbacks from the websocket handler as well
		this.gc.wsh.removeAllCallbacks()

		//remove references on game client
		this.gc.myUserServerId = null;
		this.gc.myUser = null;
		this.gc.myCharacter = null;
		this.gc.foundMyUser = false;
		this.gc.foundMyCharacter = false;
		this.gc.theRound = null;
		this.gc.activeTilemap = null;
		this.gc.resourcesResults.length = 0;
		this.gc.currentMapResource = null;
		this.gc.currentGameType = "";
		

		//this is just to give a few update loops so the managers can clear themselves out
		this.updateCounter = 0;
		this.updateCounterLimit = 5;

		//essentially ignore all events coming from the server. 
		//In this state, the client should just be cleaning up any resources on their side, then either going to wait for the server to load the next map, or go straight to disconnecting.
		this.gc.ep.setAllEventEnable(false);
	}

	update(dt) {
		super.update(dt);
		
		//update managers
		this.gc.ep.processServerEvents();
		this.gc.ep.insertEventsIntoPacket();
		this.gc.wsh.createPacketForUser();
		this.gc.wsh.update(dt);

		this.gc.um.update(dt);
		this.gc.gom.update(dt);
		this.gc.tm.update(dt);
		this.gc.rm.update(dt);

		this.updateCounter++;

		if(this.updateCounter >= this.updateCounterLimit) {
			if(this.gc.bDisconnect || !this.gc.wsConnected) {
				this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
			}
			else {
				//tell the server you are done leaving the game on the client side, and ready to wait again
				this.gc.ep.insertClientToServerEvent({
					"eventName": "fromClientReadyToWait"
				});

				//just go back to waiting for server state
				this.gc.nextGameState = new GameClientUserWaitingForServer(this.gc);
			}
		}
	}

	exit(dt) {
		super.exit(dt);
		this.globalfuncs.appendToLog("You have left the game.");

		this.gc.phaserGame.scene.stop("main-scene");
		this.gc.phaserGame.scene.remove("main-scene");
		this.gc.mainScene = null;
		this.gc.activeTilemap = null;
	}
}