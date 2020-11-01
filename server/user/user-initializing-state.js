const {UserBaseState} = require('./user-base-state.js');
const {UserPlayingState} = require('./user-playing-state.js');

class UserInitializingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-initializing-state";
	}

	enter(dt) {
		console.log(this.stateName + ' enter');
		this.user.stateName = this.stateName;
		super.enter(dt);
	}

	update(dt) {
		//for now, just go to the next state immediately
		this.user.nextState = new UserPlayingState(this.user);

		super.update(dt);
	}

	exit(dt) {
		console.log(this.stateName + ' exit');
		super.exit(dt);
	}
}



exports.UserInitializingState = UserInitializingState;