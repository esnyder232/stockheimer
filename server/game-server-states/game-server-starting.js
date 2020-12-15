const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerRunning} = require('./game-server-running.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class GameServerStarting extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}
	
	enter(dt) {
		super.enter(dt);
	}

	update(dt) {		
		//do nothing for now

		this.gs.nextGameState = new GameServerRunning(this.gs);
		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
	
	joinRequest() {
		return "Game is still starting up. Try again in a little bit.";
	}

}



exports.GameServerStarting = GameServerStarting;