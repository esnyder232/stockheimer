const {GlobalFuncs} = require('../global-funcs.js');

class GameServerBaseState {
	constructor(gs) {
		this.gs = gs;
		this.globalfuncs = new GlobalFuncs();
	}

	enter(dt) {}
	update(dt) {}
	exit(dt) {}

	startGameRequest() {}
	stopGameRequest() {}
	joinRequest() {}

	cbUserDeactivateSuccess(id) {}
}



exports.GameServerBaseState = GameServerBaseState;