const {GameServerBaseState} = require('./game-server-base-state.js');
const GameServerLoadingMap = require('./game-server-loading-map.js');
const logger = require('../../logger.js');

class GameServerStopped extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(dt) {
		logger.log("info", 'Game loop stopped.');
		super.enter(dt);
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
	
	startGameRequest() {
		logger.log("info", 'Start Game Request called.');
		this.gs.nextGameState = new GameServerLoadingMap.GameServerLoadingMap(this.gs);
		this.gs.tempInterval = setInterval(this.gs.gameLoop.bind(this.gs), this.gs.frameTimeStep);
	}

	joinRequest() {
		return "The game has stopped running.";
	}
}



exports.GameServerStopped = GameServerStopped;