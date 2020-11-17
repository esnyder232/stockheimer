import GameClientBaseState from './game-client-base-state.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';
import MainScene from "../scenes/main-scene.js"

export default class GameClientUserPlaying extends GameClientBaseState {
	constructor(gc) {
		super(gc);
		this.ms = null;
	}
	
	enter(dt) {
		super.enter(dt);
		this.ms = this.gc.phaserGame.scene.add("main-scene", MainScene, true, {
			gc: this.gc,
			ws: this.gc.ws,
			userName: this.gc.userName
		});
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);

		this.gc.phaserGame.scene.stop("main-scene");
		this.gc.phaserGame.scene.remove("main-scene");
	}
}