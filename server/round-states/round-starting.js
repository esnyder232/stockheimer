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

		var activeUsers = this.gs.um.getActiveUsers();

		//tell all users that the round has started
		// for(var i = 0; i < activeUsers.length; i++)
		// {
		// 	//this.globalfuncs.spawnCharacterForUser(this.gs, activeUsers[i]);
		// 	this.activeUsers.insertPlayingEvent("round-starting");
		// }

		this.round.roundTimeAcc = 0;
		this.round.roundTimer = 10000;
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
