const RoundBaseState = require('./round-base-state.js');
const logger = require('../../logger.js');

class RoundMapEnd extends RoundBaseState.RoundBaseState {
	constructor(gs, round) {
		super(gs, round);
		this.stateName = "MAPEND";
		this.roundTimerDefault = 10000;
	}
	
	enter(dt) {
		logger.log("info", 'Round Map End.');
		super.enter(dt);

		//get resource for round timer
		this.round.roundTimer = this.round.globalfuncs.getValueDefault(this.gs?.currentMapResource?.data?.gameData?.roundMapEndTimeLength, this.roundTimerDefault);
		this.round.roundTimeAcc = 0;

		//tell users that the rouns has started
		this.round.em.emitEvent("round-map-end");
	}

	update(dt) {
		this.round.roundTimeAcc += dt;

		if(this.round.roundTimeAcc >= this.round.roundTimer) {
			this.gs.rotateMapNow = true;
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
}



exports.RoundMapEnd = RoundMapEnd;
