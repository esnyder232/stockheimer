const {UserBaseState} = require('./user-base-state.js');

class UserDisconnectedState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-disconnected-state";
	}

	enter(dt) {
		console.log(this.stateName + ' enter');
		this.user.stateName = this.stateName;
		super.enter(dt);
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {
		console.log(this.stateName + ' exit');
		super.exit(dt);
	}
}



exports.UserDisconnectedState = UserDisconnectedState;