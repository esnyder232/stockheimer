const {GlobalFuncs} = require('../global-funcs.js');
const GameConstants = require('../../shared_files/game-constants.json');

class RoundBaseState {
	constructor(gs, round) {
		this.gs = gs;
		this.globalfuncs = new GlobalFuncs();
		this.round = round;
		this.stateName = "";
	}

	updateStateName() {
		this.round.stateName = this.stateName;
		this.round.stateEnum = GameConstants.RoundStates[this.stateName];
	}

	enter(dt) {
		this.updateStateName();
	}
	update(dt) {}
	exit(dt) {}
}



exports.RoundBaseState = RoundBaseState;