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
		this.gc.phaserGame.scene.add("user-disconnecting-scene", UserDisconnectingScene, true, {
			gc: this.gc
		});

		this.gc.wsh.disconnectFromServer();

		this.gc.users.length = 0;
	}

	update(dt) {
		super.update(dt);
		
		//just go into the lobby state again.
		this.gc.nextGameState = new GameClientLobby(this.gc);
	}

	exit(dt) {
		super.exit(dt);
		this.globalfuncs.appendToLog("Disconnected.");
		this.gc.phaserGame.scene.stop("user-disconnecting-scene");
		this.gc.phaserGame.scene.remove("user-disconnecting-scene");
	}
	
}