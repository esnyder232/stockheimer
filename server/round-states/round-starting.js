const {RoundBaseState} = require('./round-base-state.js');
const {RoundPlaying} = require('./round-playing.js');
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundStarting extends RoundBaseState {
	constructor(gs, round) {
		super(gs, round);
		this.stateName = "STARTING";
	}
	
	enter(dt) {
		logger.log("info", 'Round starting.');
		super.enter(dt);
		this.round.roundTimer = 3000;
	}

	update(dt) {
		this.round.roundTimer -= dt;

		if(this.round.roundTimer <= 0)
		{
			this.round.nextState = new RoundPlaying(this.gs, this.round);
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
}



exports.RoundStarting = RoundStarting;
