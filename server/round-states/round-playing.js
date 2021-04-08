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
		this.round.roundTimeAcc = 0;
		this.round.roundTimer = 120000;

		// //allow all active character. Kinda hacky and probably not gonna remain her for long....
		// var activeUsers = this.gs.um.getActiveUsers();
		// for(var i = 0; i < activeUsers.length; i++)
		// {
		// 	var user = activeUsers[i];
		// 	if(user.characterId !== null)
		// 	{
		// 		var c = this.gs.gom.getGameObjectByID(user.characterId);
		// 		if(c !== null)
		// 		{
		// 			c.changeAllowMove(true);
		// 			c.changeAllowShoot(true);
		// 		}
		// 	}
		// }
	}

	update(dt) {
		this.round.roundTimeAcc += dt;

		if(this.round.roundTimeAcc >= this.round.roundTimer)
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
