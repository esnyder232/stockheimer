const {UserBaseState} = require('./user-base-state.js');
const UserDisconnectedState = require('./user-disconnected-state.js');

class UserDisconnectingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-disconnecting-state";
	}

	enter(dt) {
		console.log(this.stateName + ' enter');
		this.user.stateName = this.stateName;
		super.enter(dt);
	}

	update(dt) {
		//for now, just go to the next state immediately
		this.user.nextState = new UserDisconnectedState.UserDisconnectedState(this.user);
		super.update(dt);
	}

	exit(dt) {
		console.log(this.stateName + ' exit');
		super.exit(dt);
	}
}



exports.UserDisconnectingState = UserDisconnectingState;