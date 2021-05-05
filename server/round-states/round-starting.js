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

		this.round.roundTimeAcc = 0;
		this.round.roundTimer = 10000;

		//at the start of the round, balance out the teams regarding ai users and human users
		var activeUsersTeams = this.gs.um.getActiveUsersGroupedByTeams();

		var totalAiUsers = 0;
		var totalHumanUsers = 0;

		for(var i = 0; i < activeUsersTeams.length; i++) {
			totalHumanUsers += activeUsersTeams[i].humanUserIds.length;
			totalAiUsers += activeUsersTeams[i].aiUserIds.length;
		}

		



	}

	update(dt) {
		this.round.roundTimeAcc += dt;

		if(this.round.roundTimeAcc >= this.round.roundTimer)
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
