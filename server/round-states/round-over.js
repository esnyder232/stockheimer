const {RoundBaseState} = require('./round-base-state.js');
const RoundStarting = require('./round-starting.js');
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundOver extends RoundBaseState {
	constructor(gs, round) {
		super(gs, round);
		this.stateName = "OVER";
	}
	
	enter(dt) {
		logger.log("info", 'Round over.');
		super.enter(dt);
		this.round.roundTimer = 3000;
	}

	update(dt) {
		this.round.roundTimer -= dt;

		if(this.round.roundTimer <= 0)
		{
			this.round.nextState = new RoundStarting.RoundStarting(this.gs, this.round);
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
}



exports.RoundOver = RoundOver;
