import GameClientBaseState from './game-client-base-state.js';
import GameClientLobby from './game-client-lobby.js';

export default class GameClientUserDisconnecting extends GameClientBaseState {
	constructor(gc) {
		super(gc);
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Disconnecting from server...");
		this.gc.userConnectingScene.updateConnectingMessage("Disconnecting from server...");
		this.gc.wsh.disconnectClient();

		this.updateCounterLimit = 10;
		this.updateCounter = 0;

		this.gc.ep.setAllEventEnable(false);

	}

	update(dt) {
		super.update(dt);
		
		//update event processor too so it can rebuild its event functions
		this.gc.wsh.processServerPackets();
		this.gc.ep.processServerEvents();

		//update managers
		this.gc.um.update(dt);
		this.gc.gom.update(dt);
		this.gc.tm.update(dt);
		this.gc.rm.update(dt);

		this.updateCounter++;

		if(this.updateCounter >= this.updateCounterLimit) {
			//go back to the lobby again
			this.gc.nextGameState = new GameClientLobby(this.gc);
		}
	}

	exit(dt) {
		super.exit(dt);
		this.globalfuncs.appendToLog("Disconnected from server.");

		//reset the game client
		this.gc.reset();

		this.gc.phaserGame.scene.stop("user-connecting-scene");
		this.gc.phaserGame.scene.remove("user-connecting-scene");
		this.gc.userConnectingScene = null;

		this.gc.mainMenu.disableExitServerButton();
		
		this.gc.activeTilemap = null;

		this.gc.wsh.reset();
	}
}