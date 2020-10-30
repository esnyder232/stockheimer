const {GlobalFuncs} = require('../global-funcs.js');
const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerRunning} = require('./game-server-running.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class GameServerStarting extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}
	
	enter(timeElapsed, dt) {
		console.log('starting server enter');
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {
		console.log('starting server update');
		
		//do nothing for now

		this.gs.nextGameState = new GameServerRunning(this.gs);
		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		console.log('starting server exit');
		super.exit(timeElapsed, dt);
	}
	
	joinRequest() {
		return "Game is still starting up. Try again in a little bit.";
	}

}



exports.GameServerStarting = GameServerStarting;