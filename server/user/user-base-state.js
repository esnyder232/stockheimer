const {GlobalFuncs} = require('../global-funcs.js');

class UserBaseState {
	constructor(user) {
		this.user = user;
		this.globalfuncs = new GlobalFuncs();
	}

	enter(dt) {}
	update(dt) {}
	exit(dt) {}

	disconnectRequest() {}
}



exports.UserBaseState = UserBaseState;