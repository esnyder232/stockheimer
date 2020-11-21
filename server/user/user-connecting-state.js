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

		var activeUsers = this.user.gs.um.getActiveUsers();
		for(var i = 0; i < activeUsers.length; i++)
		{
			//tell existing users about the user that joined
			activeUsers[i].serverToClientEvents.push({
				"eventName": "userConnected",
				"userId": this.user.id,
				"activeUserId": this.user.activeId,
				"username": this.user.username
			});

			//if the current active user is not the one who just joined, send them an "existingUser" event
			if(activeUsers[i].id != this.user.id)
			{
				this.user.serverToClientEvents.push({
					"eventName": "existingUser",
					"userId": activeUsers[i].userId,
					"activeUserId": activeUsers[i].activeId,
					"username": activeUsers[i].username
				})
			}
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