const {UserBaseState} = require('./user-base-state.js');
const UserDisconnectedState = require('./user-disconnected-state.js');
const logger = require('../../logger.js');

class UserDisconnectingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-disconnecting-state";
	}

	enter(dt) {
		//logger.log("info", this.stateName + ' enter');
		this.user.stateName = this.stateName;

		super.enter(dt);
	}

	update(dt) {
		//for now, just go to the next state immediately
		this.user.nextState = new UserDisconnectedState.UserDisconnectedState(this.user);
		super.update(dt);
	}

	exit(dt) {
		//logger.log("info", this.stateName + ' exit');

		//clean up any relationships the user may have had
		this.user.gs.gameState.destroyOwnersCharacter(this.user.id, "user");
		this.user.gs.gameState.deactivateUserId(this.user.id);

		//send a message to existing users about the person that left
		var userAgents = this.user.gs.uam.getUserAgents();
		for(var j = 0; j < userAgents.length; j++)
		{
			userAgents[j].insertServerToClientEvent({
				"eventName": "fromServerChatMessage",
				"userId": 0,
				"chatMsg": "Player '" + this.user.username + "' has disconnected.",
				"isServerMessage": true
			});
		}

		if(this.user.userAgentId !== null) {
			this.user.gs.uam.destroyUserAgent(this.user.userAgentId);
		}

		super.exit(dt);
	}
}



exports.UserDisconnectingState = UserDisconnectingState;