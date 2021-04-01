const {RoundBaseState} = require('./round-base-state.js');
const {RoundPlaying} = require('./round-playing.js');
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundStarting extends RoundBaseState {
	constructor(gs) {
		super(gs);
	}
	
	enter(dt) {
		logger.log("info", 'Round starting.');
		super.enter(dt);
		this.gs.roundTimer = 3000;
	}

	update(dt) {
		this.gs.roundTimer -= dt;

		if(this.gs.roundTimer <= 0)
		{
			//this.gs.nextRoundState = new RoundPlaying(this.gs);
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
}



exports.RoundStarting = RoundStarting;
