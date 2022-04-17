const RoundBaseState = require('./round-base-state.js');
const RoundOver = require('./round-over.js');
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundPlayingKoth extends RoundBaseState.RoundBaseState {
	constructor(gs, round) {
		super(gs, round);
		this.stateName = "PLAYING";
		this.roundTimerDefault = 60000;
		this.checkTeamCounts = true;
		this.temp = 0;
		this.anotherTemp = 1;
		this.tempKillControlPoint = 15000;

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
		this.temp += dt;

		// if(this.checkTeamCounts) {
		// 	this.checkTeamCounts = false;

		// 	var userAliveSumamry = this.gs.um.getUserAliveSummary();

		// 	//check for a winner
		// 	var teamsAlive = 0;
		// 	for(var i = 0; i < userAliveSumamry.teamArray.length; i++) {
		// 		if(userAliveSumamry.teamArray[i].usersAlive > 0) {
		// 			teamsAlive++;
		// 		}
		// 	}

		// 	//if 1 or 0 teams are left alive, move on to round over
		// 	if(teamsAlive <= 1) {
		// 		this.round.nextState = new RoundOverKoth.RoundOverKoth(this.gs, this.round);	
		// 	}
		// }

		//testing koth points on teams
		if(this.temp >= 1000) {
			this.temp = 0;
			this.anotherTemp += 1000;
			
			var teams = this.gs.tm.getTeams();
			for(var i = 0; i < teams.length; i++) {
				if(!teams[i].isSpectatorTeam) {
					teams[i].setKothTime(this.anotherTemp);
				}
			}
		}

		//testing killing a control point
		// if(this.anotherTemp >= this.tempKillControlPoint) {
		// 	var cpIds = this.gs.activeTilemap.controlPoints;
		// 	for(var i = 0; i < cpIds.length; i++) {
		// 		if(cpIds[i].isActive) {
		// 			console.log("killing cp #" + cpIds[i]);
		// 			this.gs.gom.destroyGameObject(cpIds[i].id);
		// 		}
		// 	}
		// }

		if(this.round.roundTimeAcc >= this.round.roundTimer)
		{
			this.round.nextState = new RoundOver.RoundOver(this.gs, this.round);
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



exports.RoundPlayingKoth = RoundPlayingKoth;
