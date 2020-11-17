import GameClientBaseState from './game-client-base-state.js';
import GameClientLobby from './game-client-lobby.js';
import UserDisconnectingScene from "../scenes/user-disconnecting-scene.js"

export default class GameClientUserDisconnecting extends GameClientBaseState {
	constructor(gc) {
		super(gc);

		this.uds = null;
	}
	
	enter(dt) {
		super.enter(dt);
		this.uds = this.gc.phaserGame.scene.add("user-disconnecting-scene", UserDisconnectingScene, true, {
			gc: this.gc
		});
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
		this.gc.phaserGame.scene.stop("user-disconnecting-scene");
		this.gc.phaserGame.scene.remove("user-disconnecting-scene");
	}
}