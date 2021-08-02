const {GameServerBaseState} = require('./game-server-base-state.js');
const GameServerStopped = require('./game-server-stopped.js'); //Wierd, If I do the {} on this, GameServerStopped becomes undefined. It has some confliction with game-server.js's require of game-server-stopped.js.
const logger = require('../../logger.js');

//do anything here that involves stopping the game, Like deleting things in memory, saving sessions, anything.
class GameServerUnloadingMap extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(dt) {
		logger.log("info", 'Game Server unloading map ' + this.gs.currentMapResourceKey + "'.");
		super.enter(dt);
	}

	update(dt) {
		//do nothing for now

		this.gs.nextGameState = new GameServerStopped.GameServerStopped(this.gs);

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
	
	joinRequest() {
		return "The game has .";
	}
}



exports.GameServerUnloadingMap = GameServerUnloadingMap;