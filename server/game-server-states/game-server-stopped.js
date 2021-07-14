const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerStarting} = require('./game-server-starting.js');
const logger = require('../../logger.js');

class GameServerStopped extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(dt) {
		logger.log("info", 'Game loop stopped.');
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
		logger.log("info", 'Game loop start request.');
		this.gs.nextGameState = new GameServerStarting(this.gs);
		this.gs.runGameLoop = true;

		this.gs.tempInterval = setInterval(this.gs.gameLoop.bind(this.gs), this.gs.frameTimeStep);
		// this.gs.gameLoop();
	}

	joinRequest() {
		return "The game has stopped running.";
	}
}



exports.GameServerStopped = GameServerStopped;