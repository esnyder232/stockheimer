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

		//the only way out of this state is to actually BE CONNECTED to the server. So set bDisconnected to false now.
		//This SHOULD be already set to false...but seemed to be a bug that caused the bDisconnected flag to be set to true.
		this.user.bDisconnected = false; 
	}

	processClientEvents(ua) {
		//intentionally blank
	}
}



exports.UserDisconnectedState = UserDisconnectedState;