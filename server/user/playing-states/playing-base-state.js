
const GameConstants = require('../../../shared_files/game-constants.json');
const GlobalFuncs = require("../../global-funcs.js");

class PlayingBaseState {
	constructor(user) {
		this.user = user;
		this.globalfuncs = new GlobalFuncs.GlobalFuncs();
	}

	enter(dt) {
		this.user.playingStateName = this.stateName;
		this.user.playingStateEnum = GameConstants.UserPlayingStates[this.stateName];
	}
	update(dt) {}
	exit(dt) {}
}



exports.PlayingBaseState = PlayingBaseState;