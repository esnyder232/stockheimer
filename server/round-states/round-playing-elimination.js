const RoundBaseState = require('./round-base-state.js');
const RoundOverElimination = require('./round-over-elimination.js');
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundPlayingElimination extends RoundBaseState.RoundBaseState {
	constructor(gs, round) {
		super(gs, round);
		this.stateName = "PLAYING";
		this.roundTimerDefault = 60000;
		this.checkTeamCounts = true;

		this.eventCallbackMapping = [ 
			{eventName: "character-deactivated", cb: this.cbCharacterDeactivated.bind(this), handleId: null}
		];

		this.gs.em.batchRegisterForEvent(this.eventCallbackMapping);
	}
	
	enter(dt) {
		logger.log("info", 'Round playing.');
		super.enter(dt);
		this.round.roundTimeAcc = 0;
		this.round.roundTimer = this.round.globalfuncs.getValueDefault(this.gs?.currentMapResource?.data?.gameData?.roundPlayingTimeLength, this.roundTimerDefault);
		
		//tell users that the rouns has started
		this.round.em.emitEvent("round-started");

	}

	update(dt) {
		this.round.roundTimeAcc += dt;

		if(this.checkTeamCounts) {
			this.checkTeamCounts = false;

			var userAliveSumamry = this.gs.um.getUserAliveSummary();

			//check for a winner
			var teamsAlive = 0;
			for(var i = 0; i < userAliveSumamry.teamArray.length; i++) {
				if(userAliveSumamry.teamArray[i].usersAlive > 0) {
					teamsAlive++;
				}
			}

			//if 1 or 0 teams are left alive, move on to round over
			if(teamsAlive <= 1) {
				this.round.nextState = new RoundOverElimination.RoundOverElimination(this.gs, this.round);	
			}
		}


		if(this.round.roundTimeAcc >= this.round.roundTimer)
		{
			this.round.nextState = new RoundOverElimination.RoundOverElimination(this.gs, this.round);
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
		this.gs.em.batchUnregisterForEvent(this.eventCallbackMapping);
	}

	cbCharacterDeactivated(eventName, owner, eventData) {
		this.checkTeamCounts = true;
	}
}



exports.RoundPlayingElimination = RoundPlayingElimination;
