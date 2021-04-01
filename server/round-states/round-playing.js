const {RoundBaseState} = require('./round-base-state.js');
const RoundOver = require('./round-over.js');
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundPlaying extends RoundBaseState {
	constructor(gs) {
		super(gs);
	}
	
	enter(dt) {
		logger.log("info", 'Round playing.');
		super.enter(dt);
		this.gs.roundTimer = 3000;
	}

	update(dt) {
		this.gs.roundTimer -= dt;

		if(this.gs.roundTimer <= 0)
		{
			this.gs.nextRoundState = new RoundOver.RoundOver(this.gs);
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
}



exports.RoundPlaying = RoundPlaying;
