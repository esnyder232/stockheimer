const {UserBaseState} = require('./user-base-state.js');
const logger = require('../../logger.js');

class UserDisconnectedState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-disconnected-state";
	}

	enter(dt) {
		// logger.log("info", this.stateName + ' enter');
		this.user.stateName = this.stateName;
		super.enter(dt);
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {
		// logger.log("info", this.stateName + ' exit');
		super.exit(dt);

		//rebalance ai on teams on exit
		this.user.gs.rebalanceTeams = true;
	}

	processClientEvents(ua) {
		//intentionally blank
	}
}



exports.UserDisconnectedState = UserDisconnectedState;