const RoundBaseState = require('./round-base-state.js');
const RoundPlayingKoth = require('./round-playing-koth.js');

const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundStartingKoth extends RoundBaseState.RoundBaseState {
	constructor(gs, round) {
		super(gs, round);
		this.stateName = "STARTING";
		this.roundTimerDefault = 10000;
	}
	
	enter(dt) {
		logger.log("info", 'Round Koth starting.');
		super.enter(dt);

		//get resource for round timer
		this.round.roundTimer = this.round.globalfuncs.getValueDefault(this.gs?.currentMapResource?.data?.gameData?.roundStartingTimeLength, this.roundTimerDefault);
		this.round.roundTimeAcc = 0;

		//at the start of the round, balance out the teams regarding ai users and human users
		this.gs.rebalanceTeams = true;

		//tell users that the rouns has started
		this.round.em.emitEvent("round-restarting");

		//reset the round for koth
		var teams = this.gs.tm.getTeams();
		for(var i = 0; i < teams.length; i++) {
			if(!teams[i].isSpectatorTeam) {
				teams[i].setKothTime(10000);
				teams[i].setKothTimerOn(false);
				teams[i].resetKothTimeAcc();
			}
		}

	}

	update(dt) {
		this.round.roundTimeAcc += dt;

		if(this.round.roundTimeAcc >= this.round.roundTimer)
		{
			this.round.nextState = new RoundPlayingKoth.RoundPlayingKoth(this.gs, this.round);
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
}



exports.RoundStartingKoth = RoundStartingKoth;
