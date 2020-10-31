const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerRunning} = require('./game-server-running.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class GameServerStarting extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}
	
	enter(dt) {
		console.log('starting server enter');
		super.enter(dt);
	}

	update(dt) {
		console.log('starting server update');
		
		//do nothing for now

		this.gs.nextGameState = new GameServerRunning(this.gs);
		super.update(dt);
	}

	exit(dt) {
		console.log('starting server exit');
		super.exit(dt);
	}
	
	joinRequest() {
		return "Game is still starting up. Try again in a little bit.";
	}

}



exports.GameServerStarting = GameServerStarting;