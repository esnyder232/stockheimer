const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerStarting} = require('./game-server-starting.js');

class GameServerStopped extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(dt) {
		console.log('stopped server enter');
		this.gs.runGameLoop = false;
		super.enter(dt);
	}

	update(dt) {
		console.log('stopped server update');
		super.update(dt);
	}

	exit(dt) {
		console.log('stopped server exit');
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