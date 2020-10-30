const {GlobalFuncs} = require('../global-funcs.js');

class GameServerBaseState {
	constructor(gs) {
		this.gs = gs;
		this.globalfuncs = new GlobalFuncs();
	}

	enter(timeElapsed, dt) {}
	update(timeElapsed, dt) {}
	exit(timeElapsed, dt) {}

	startGameRequest() {}
	stopGameRequest() {}
	joinRequest() {}

}



exports.GameServerBaseState = GameServerBaseState;