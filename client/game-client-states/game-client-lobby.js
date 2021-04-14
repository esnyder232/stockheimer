import $ from "jquery"
import GameClientBaseState from './game-client-base-state.js';
import GameClientUserConnecting from './game-client-user-connecting.js';
import LobbyScene from "../scenes/lobby-scene.js"

export default class GameClientLobby extends GameClientBaseState {
	constructor(gc) {
		super(gc);
	}
	
	enter(dt) {
		super.enter(dt);

		this.gc.lobbyScene = this.gc.phaserGame.scene.add("lobby-scene", LobbyScene, true, {
			gc: this.gc
		});

		this.gc.turnOnContextMenu();
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
		
		this.gc.phaserGame.scene.stop("lobby-scene");
		this.gc.phaserGame.scene.remove("lobby-scene");
		this.gc.lobbyScene = null;
	}

	connectUserToServer() {
		this.gc.nextGameState = new GameClientUserConnecting(this.gc);
	}
}