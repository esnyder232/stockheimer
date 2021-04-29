const {UserBaseState} = require('./user-base-state.js');
const {AiPlayingState} = require('./ai-playing-state.js');
const {AiDisconnectingState} = require('./ai-disconnecting-state.js');
const logger = require('../../logger.js');

class AiConnectingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-connecting-state";
		this.worldStateDoneEventSent = false;
		this.teamAcks = [];
	}

	enter(dt) {
		//logger.log("info", this.stateName + ' enter');
		this.user.stateName = this.stateName;
		var userAgents = this.user.gs.uam.getUserAgents();
				
		//tell existing users about the user that joined
		for(var i = 0; i < userAgents.length; i++)
		{
			userAgents[i].insertTrackedEntity("user", this.user.id);
		}

		//send a message to existing users about the person that joined
		for(var j = 0; j < userAgents.length; j++)
		{
			userAgents[j].insertServerToClientEvent({
				"eventName": "debugMsg",
				"debugMsg": "Player '" + this.user.username + "' has connected."
			});
		}
		
		super.enter(dt);
	}

	update(dt) {
		//wait for the "readyToPlay" signal from the client
		if(this.user.bDisconnected)
		{
			this.user.nextState = new AiDisconnectingState(this.user);
		}
		else
		{
			this.user.nextState = new AiPlayingState(this.user);
		}

		super.update(dt);
	}

	exit(dt) {
		//logger.log("info", this.stateName + ' exit');
		super.exit(dt);
	}
}



exports.AiConnectingState = AiConnectingState;