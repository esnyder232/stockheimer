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
		//STOPPED HERE
		//Basically, all these game objects are erroring on the client side when the user exits the server and there are characters still on the screen. (in the "deactivated" function on the character.js, it is calling for "mainScene", which is already destroyed. That is the source of the error)
		//the question is....what am i gonna do? Do i make the main scene last forever? Do I make the main scene last only until user-disconnecting-state? 
		//Is there someway I can avoid all that? Because its nice to know that "one-state" has "one-scene".

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

		this.gc.wsh.reset();


	}
	
}