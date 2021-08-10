const GlobalFuncs = require('../global-funcs.js');

class UserBaseState {
	constructor(user) {
		this.user = user;
		this.globalfuncs = new GlobalFuncs.GlobalFuncs();
	}

	enter(dt) {}
	update(dt) {}
	exit(dt) {}

	processClientEvents(ua){};
}



exports.UserBaseState = UserBaseState;