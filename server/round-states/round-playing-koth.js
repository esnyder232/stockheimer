const RoundBaseState = require('./round-base-state.js');
const RoundOverKoth = require('./round-over-koth.js');
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
		this.currentlyOwningTeamId = 0;
		this.currentlyOwningTeamRef = null;
		this.cpRef = null;

		this.eventCallbackMapping = [ 
			{eventName: "control-point-captured", cb: this.cbControlPointCaptured.bind(this), handleId: null},
		];

		this.gs.em.batchRegisterForEvent(this.eventCallbackMapping);
	}
	
	enter(dt) {
		logger.log("info", 'Round playing.');
		super.enter(dt);
		this.round.roundTimeAcc = 0;
		this.round.roundTimer = this.round.globalfuncs.getValueDefault(this.gs?.currentMapResource?.data?.gameData?.roundPlayingTimeLength, this.roundTimerDefault);

		//just consider the first controlpoint to be the hill
		if(this.gs.activeTilemap.controlPoints.length !== 0) {
			this.cpRef = this.gs.activeTilemap.controlPoints[0];
		}
		
		//tell users that the rouns has started
		this.round.em.emitEvent("round-started");

	}

	update(dt) {
		this.temp += dt;

		//check if there is a winner
		if(this.currentlyOwningTeamRef !== null && this.currentlyOwningTeamRef.kothTime === this.currentlyOwningTeamRef.kothTimeAcc) {
			//check if anyone is currently capturing the control point
			if(this.cpRef !== null && 
				this.cpRef.ownerTeamId === this.currentlyOwningTeamId && 
				this.cpRef.capturingTeamId === 0 &&
				this.cpRef.teamsOccupyingPoint <= 1) {
					this.round.nextState = new RoundOverKoth.RoundOverKoth(this.gs, this.round, this.currentlyOwningTeamId, this.currentlyOwningTeamRef);
			}
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
		this.gs.em.batchUnregisterForEvent(this.eventCallbackMapping);
		this.currentlyOwningTeamId = 0;
		this.currentlyOwningTeamRef = null;
		this.cpRef = null;
	}

	cbControlPointCaptured(eventName, owner, eventData) {
		var owningTeam = this.gs.tm.getTeamByID(eventData.ownerTeamId);
		if(owningTeam !== null && !owningTeam.isSpectatorTeam) {
			owningTeam.setKothTimerOn(true);
			this.currentlyOwningTeamId = eventData.ownerTeamId;
			this.currentlyOwningTeamRef = owningTeam;
		}
	}

}



exports.RoundPlayingKoth = RoundPlayingKoth;
