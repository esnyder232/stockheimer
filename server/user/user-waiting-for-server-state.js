const {UserBaseState} = require('./user-base-state.js');
const {UserJoiningGameState} = require('./user-joining-game-state.js');
const {UserDisconnectingState} = require('./user-disconnecting-state.js');
const logger = require('../../logger.js');

class UserWaitingForServerState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-waiting-for-server-state";
		this.serverWaitTimer = 250;
		this.serverWaitTimerAcc = 0;
	}

	enter(dt) {
		// logger.log("info", this.stateName + ' enter');
		this.user.stateName = this.stateName;
		this.user.bOkayToBeInTheGame = false;

		super.enter(dt);
	}

	update(dt) {
		this.serverWaitTimerAcc += dt;
		if(this.serverWaitTimerAcc >= this.serverWaitTimer) {
			this.serverWaitTimerAcc = 0;
			//poll to see if the server is done loading the map
			if(this.user.gs.bServerMapLoaded) {
				//send the "serverMapLoaded" event to the client, and wait for the acknoledgement before moving on.
				var ua = this.user.gs.uam.getUserAgentByID(this.user.userAgentId);
				if(ua !== null) {
					ua.insertServerToClientEvent({
						"eventName": "serverMapLoaded"
					}, this.cbServerMapLoadedAck.bind(this));
				}
			}
		}

		if(this.user.bOkayToBeInTheGame) {
			this.user.nextState = new UserJoiningGameState(this.user);
		}

		//if something went wrong or the client disconnected for some reason, go to the disconnecting state
		if(this.user.bDisconnected) {
			this.user.nextState = new UserDisconnectingState(this.user);
		}

		super.update(dt);
	}

	exit(dt) {
		// logger.log("info", this.stateName + ' exit');
		super.exit(dt);
	}

	cbServerMapLoadedAck() {
		if(!this.user.bOkayToBeInTheGame) {
			this.user.bOkayToBeInTheGame = true;
		}
	}

	processClientEvents(ua) {
		//delete all events if the user recieved any (he shouldn't recieve any in this state)
		ua.clientToServerEvents.length = 0;
	}
}

exports.UserWaitingForServerState = UserWaitingForServerState;