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
		this.round.roundTimeAcc = 0;
		this.round.roundTimer = 10000;

		//calculate and send the results to the users
		


		var userAgents = this.gs.uam.getUserAgents();
		for(var i = 0; i < userAgents.length; i++) {
			userAgents[i].insertServerToClientEvent({
				"eventName": "roundResults",
				"winningTeamCsv": "2,3",
				"mvpBestCsv": "0,0,0",
				"mvpWorstCsv": "0,0"
			});
		}
	}

	update(dt) {
		this.round.roundTimeAcc += dt;

		if(this.round.roundTimeAcc >= this.round.roundTimer)
		{
			this.round.nextState = new RoundStarting.RoundStarting(this.gs, this.round);
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);

		//tell all active users the round is restarting. Let them sort themselves out.
		this.round.em.emitEvent("round-restarting");
		
	}
}



exports.RoundOver = RoundOver;
