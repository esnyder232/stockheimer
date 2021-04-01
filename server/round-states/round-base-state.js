const {GlobalFuncs} = require('../global-funcs.js');

class RoundBaseState {
	constructor(gs) {
		this.gs = gs;
		this.globalfuncs = new GlobalFuncs();
	}

	enter(dt) {}
	update(dt) {}
	exit(dt) {}
}



exports.RoundBaseState = RoundBaseState;