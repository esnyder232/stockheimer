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
		this.round.roundTimer = 3000;

		// //kill all characters
		// var activeUsers = this.gs.um.getActiveUsers();
		// for(var i = 0; i < activeUsers.length; i++)
		// {
		// 	var user = activeUsers[i];
		// 	if(user.characterId !== null)
		// 	{
		// 		var c = this.gs.gom.getGameObjectByID(user.characterId);
		// 		if(c !== null)
		// 		{
		// 			c.hpCur = 0;
		// 		}
		// 	}
		// }
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
	}
}



exports.RoundOver = RoundOver;
