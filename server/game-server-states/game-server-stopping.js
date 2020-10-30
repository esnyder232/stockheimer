const {GlobalFuncs} = require('../global-funcs.js');
const {GameServerBaseState} = require('./game-server-base-state.js');
// const anything = require('./game-server-stopped.js');
const GameServerStopped = require('./game-server-stopped.js'); //Wierd, If I do the {} on this, GameServerStopped becomes undefined. It has some confliction with game-server.js's require of game-server-stopped.js.


//do anything here that involves stopping the game, Like deleting things in memory, saving sessions, anything.
class GameServerStopping extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(timeElapsed, dt) {
		console.log('stopping server enter');
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {
		console.log('stopping server update');

		//do nothing for now

		this.gs.nextGameState = new GameServerStopped.GameServerStopped(this.gs);

		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		console.log('stopping server exit');
		super.exit(timeElapsed, dt);
	}
	
	joinRequest() {
		return "The game has stopped running.";
	}
}



exports.GameServerStopping = GameServerStopping;