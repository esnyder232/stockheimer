const {UserBaseState} = require('./user-base-state.js');
const UserDisconnectedState = require('./user-disconnected-state.js');
const logger = require('../../logger.js');

class UserDisconnectingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-disconnecting-state";
	}

	enter(dt) {
		// logger.log("info", this.stateName + ' enter');
		this.user.stateName = this.stateName;

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

		//just in case idk
		var ua = this.user.gs.uam.getUserAgentByID(this.user.userAgentId);
		if(ua !== null) {
			ua.forceDisconnect();
		}

		super.enter(dt);
	}

	update(dt) {
		//for now, just go to the next state immediately
		this.user.nextState = new UserDisconnectedState.UserDisconnectedState(this.user);
		super.update(dt);
	}

	exit(dt) {
		// logger.log("info", this.stateName + ' exit');
		
		logger.log("info", this.user.username + ' has disconnected.');

		//tell existing users about the user that disconnected
		var userAgents = this.user.gs.uam.getUserAgents();
		for(var i = 0; i < userAgents.length; i++) {
			userAgents[i].deleteTrackedEntity("user", this.user.id);
		}

		//deactivate the user in the server manager
		this.user.gs.um.deactivateUserId(this.user.id, this.user.gs.cbUserDeactivateSuccess.bind(this.user.gs));

		//destroy the user agent as well
		if(this.user.userAgentId !== null) {
			this.user.gs.uam.destroyUserAgent(this.user.userAgentId);
		}

		super.exit(dt);
	}

	processClientEvents(ua) {
		//delete all events if the user recieved any (he shouldn't recieve any in this state)
		ua.clientToServerEvents.length = 0;
	}
}



exports.UserDisconnectingState = UserDisconnectingState;