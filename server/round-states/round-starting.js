const RoundBaseState = require('./round-base-state.js');
const RoundPlaying = require('./round-playing.js');
const RoundPlayingElimination = require('./round-playing-elimination.js');
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundStarting extends RoundBaseState.RoundBaseState {
	constructor(gs, round) {
		super(gs, round);
		this.stateName = "STARTING";
		this.roundTimerDefault = 10000;
	}
	
	enter(dt) {
		logger.log("info", 'Round starting.');
		super.enter(dt);

		//get resource for round timer
		this.round.roundTimer = this.round.globalfuncs.getValueDefault(this.gs?.currentMapResource?.data?.gameData?.roundStartingTimeLength, this.roundTimerDefault);
		this.round.roundTimeAcc = 0;

		//at the start of the round, balance out the teams regarding ai users and human users
		this.gs.rebalanceTeams = true;

		//tell users that the rouns has started
		this.round.em.emitEvent("round-restarting");
	}

	update(dt) {
		this.round.roundTimeAcc += dt;

		if(this.round.roundTimeAcc >= this.round.roundTimer)
		{
			if(this.gs.currentGameType === "deathmatch") {
				this.round.nextState = new RoundPlaying.RoundPlaying(this.gs, this.round);
			}
			else if (this.gs.currentGameType === "elimination") {
				this.round.nextState = new RoundPlayingElimination.RoundPlayingElimination(this.gs, this.round);
			}
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
}



exports.RoundStarting = RoundStarting;
