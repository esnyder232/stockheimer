import GameClientBaseState from './game-client-base-state.js';
import GameClientLobby from './game-client-lobby.js';
import UserDisconnectingScene from "../scenes/user-disconnecting-scene.js"

export default class GameClientUserDisconnecting extends GameClientBaseState {
	constructor(gc) {
		super(gc);
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Disconnecting...");
		this.gc.userDisconnectingScene = this.gc.phaserGame.scene.add("user-disconnecting-scene", UserDisconnectingScene, true, {
			gc: this.gc
		});

		//put main sleep to sleep to hide it
		this.gc.mainScene.scene.sleep();

		this.gc.wsh.disconnectClient();

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


		//unload sprite resources
		var spriteResources = this.gc.srm.getSpriteResources();
		for(var i = 0; i < spriteResources.length; i++) {
			spriteResources[i].unloadSpriteResource();
			this.gc.srm.destroySpriteResource(spriteResources[i].id);
		}

		//reset the game client
		this.gc.reset();

		//this is just to give a few update loops so the managers can clear themselves out
		this.updateCounter = 0;
		this.updateCounterLimit = 5;
	}

	update(dt) {
		super.update(dt);
		
		//update managers
		this.gc.um.update(dt);
		this.gc.gom.update(dt);
		this.gc.tm.update(dt);
		this.gc.srm.update(dt);

		this.updateCounter++;

		if(this.updateCounter >= this.updateCounterLimit)
		{
			//go back to the lobby again
			this.gc.nextGameState = new GameClientLobby(this.gc);
		}
	}

	exit(dt) {
		super.exit(dt);
		this.globalfuncs.appendToLog("Disconnected.");
		this.gc.phaserGame.scene.stop("user-disconnecting-scene");
		this.gc.phaserGame.scene.remove("user-disconnecting-scene");

		this.gc.phaserGame.scene.stop("main-scene");
		this.gc.phaserGame.scene.remove("main-scene");
		this.gc.mainScene = null;

		this.gc.userDisconnectingScene = null;

		this.gc.mainMenu.disableExitServerButton();
		
		this.gc.wsh.reset();
	}
}