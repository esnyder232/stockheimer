const {UserBaseState} = require('./user-base-state.js');
const logger = require('../../logger.js');

class UserDisconnectedState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-disconnected-state";
	}

	enter(dt) {
		//logger.log("info", this.stateName + ' enter');
		this.user.stateName = this.stateName;
		super.enter(dt);
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {
		//logger.log("info", this.stateName + ' exit');
		super.exit(dt);
	}
}



exports.UserDisconnectedState = UserDisconnectedState;