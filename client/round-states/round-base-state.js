import GlobalFuncs from '../global-funcs.js';

export default class RoundBaseState {
	constructor(gc, round) {
		this.gc = gc;
		this.round = round;
		this.globalfuncs = new GlobalFuncs();
	}

	
	updateStateName() {
		this.round.stateName = this.stateName;
		this.round.stateEnum = this.gc.gameConstants.RoundStates[this.stateName];
	}

	enter(dt) {
		this.updateStateName();
	}
	update(dt) {}
	exit(dt) {}
}
