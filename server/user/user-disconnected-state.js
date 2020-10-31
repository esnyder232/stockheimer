const {UserBaseStates} = require('./user-base-state.js');
//const {UserDisconnectedState} = require('./game-server-stopping.js');

class UserDisconnectedState extends UserBaseState {
	constructor(user) {
		super(user);
	}

	enter(dt) {
		console.log('user disconnected enter');
		super.enter(dt);
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {
		console.log('running server exit');
		super.exit(dt);
	}
}



exports.UserDisconnectedState = UserDisconnectedState;