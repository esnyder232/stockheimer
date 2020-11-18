const {UserBaseState} = require('./user-base-state.js');
const {UserPlayingState} = require('./user-playing-state.js');

class UserConnectingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-connecting-state";
	}

	enter(dt) {
		console.log(this.stateName + ' enter');
		this.user.stateName = this.stateName;

		//tell existing users about the user that joined
		var activeUsers = this.user.gs.um.getUsersByNotState("user-disconnected-state");
		for(var i = 0; i < activeUsers.length; i++)
		{
			activeUsers[i].serverToClientEvents.push({
				"event": "userConnected",
				"userId": this.user.id,
				"username": this.user.username
			});
		}

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



exports.UserConnectingState = UserConnectingState;