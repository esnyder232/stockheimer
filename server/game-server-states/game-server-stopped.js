const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerStarting} = require('./game-server-starting.js');

class GameServerStopped extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(dt) {
		this.gs.runGameLoop = false;
		super.enter(dt);
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
	
	startGameRequest() {
		this.gs.nextGameState = new GameServerStarting(this.gs);
		this.gs.runGameLoop = true;

		this.gs.gameLoop();
	}

	joinRequest() {
		return "The game has stopped running.";
	}
}



exports.GameServerStopped = GameServerStopped;