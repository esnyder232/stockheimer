const {RoundBaseState} = require('./round-base-state.js');
const RoundOver = require('./round-over.js');
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundPlaying extends RoundBaseState {
	constructor(gs, round) {
		super(gs, round);
		this.stateName = "PLAYING";
	}
	
	enter(dt) {
		logger.log("info", 'Round playing.');
		super.enter(dt);
		this.round.roundTimer = 3000;
	}

	update(dt) {
		this.round.roundTimer -= dt;

		if(this.round.roundTimer <= 0)
		{
			this.round.nextState = new RoundOver.RoundOver(this.gs, this.round);
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
}



exports.RoundPlaying = RoundPlaying;
