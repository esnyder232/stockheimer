const {UserBaseState} = require('./user-base-state.js');
const UserDisconnectedState = require('./user-disconnected-state.js');
const logger = require('../../logger.js');

class AiDisconnectingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "ai-disconnecting-state";
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

		//kill the ai user from the user manager
		this.user.gs.um.deactivateUserId(this.user.id);
		this.user.gs.um.destroyUserId(this.user.id);
		this.user.gs.aim.destroyAIAgent(this.user.aiAgentId);

		//delete the tracked entity for ALL user agents (regardless if they're playing or not)
		var userAgents = this.user.gs.uam.getUserAgents();
		for(var i = 0; i < userAgents.length; i++) {
			userAgents[i].deleteTrackedEntity("user", this.user.id);
		}

		//send a message only to playing users about the person that left
		var playingUsers = this.user.gs.um.getPlayingUsers();
		for(var j = 0; j < playingUsers.length; j++) {
			var ua = this.user.gs.uam.getUserAgentByID(playingUsers[j].userAgentId);
			if(ua !== null) {
				//give the user a chat message showing the ai user disconnected
				ua.insertServerToClientEvent({
					"eventName": "fromServerChatMessage",
					"userId": 0,
					"chatMsg": "Player '" + this.user.username + "' has disconnected.",
					"isServerMessage": true
				});
			}
		}

		super.exit(dt);
	}
}

exports.AiDisconnectingState = AiDisconnectingState;