const RoundBaseState = require('./round-base-state.js');
const RoundStarting = require('./round-starting.js');
const RoundStartingKoth = require('./round-starting-koth.js');
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundMapStart extends RoundBaseState.RoundBaseState {
	constructor(gs, round) {
		super(gs, round);
		this.stateName = "MAPSTART";
		this.roundTimerDefault = 10000;
	}
	
	enter(dt) {
		logger.log("info", 'Round Map Start.');
		super.enter(dt);

		//get resource for round timer
		this.round.roundTimer = this.round.globalfuncs.getValueDefault(this.gs?.currentMapResource?.data?.gameData?.roundMapStartTimeLength, this.roundTimerDefault);
		this.round.roundTimeAcc = 0;
	}

	update(dt) {
		this.round.roundTimeAcc += dt;

		if(this.round.roundTimeAcc >= this.round.roundTimer) {
			//determine the round state
			if(this.gs.currentGameType === "deathmatch" || this.gs.currentGameType === "elimination") {
				this.round.nextState = new RoundStarting.RoundStarting(this.gs, this.round);
			} 
			else if (this.gs.currentGameType === "koth") {
				this.round.nextState = new RoundStartingKoth.RoundStartingKoth(this.gs, this.round);
			}
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
}



exports.RoundMapStart = RoundMapStart;
