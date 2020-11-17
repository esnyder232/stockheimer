import GameClientBaseState from './game-client-base-state.js';
import GameClientUserConnecting from './game-client-user-connecting.js';
import LobbyScene from "../scenes/lobby-scene.js"

export default class GameClientLobby extends GameClientBaseState {
	constructor(gc) {
		super(gc);
		this.lobbyScene = null;
	}
	
	enter(dt) {
		console.log('initializing LOBBY scene');
		super.enter(dt);

		this.lobbyScene = this.gc.phaserGame.scene.add("lobby-scene", LobbyScene, true, {
			gc: this.gc
		});
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);

		this.gc.phaserGame.scene.stop("lobby-scene");
		this.gc.phaserGame.scene.remove("lobby-scene");
	}

	connectUserToServer() {
		this.gc.nextGameState = new GameClientUserConnecting(this.gc);
	}
}