const {UserBaseState} = require('./user-base-state.js');
const UserDisconnectingState = require('./user-disconnecting-state.js');
const UserWaitingForServerState = require('./user-waiting-for-server-state.js');
const logger = require('../../logger.js');

class UserLeavingGameState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-leaving-game-state";
		this.kickTimer = 5000; //used to kick the client if they are taking too long on this state.
		this.kickTimerAcc = 0;
	}

	enter(dt) {
		// logger.log("info", this.stateName + ' enter');
		this.user.stateName = this.stateName;
		this.user.bClientReadyToWait = false; //reset the client flag to false

		super.enter(dt);

		//THIS is where we want to cleanup ANY thing on the user on the server side. Delete any tracked entities, rounds, states, anything.
		//After this state, the only states the user can go to are "waiting-for-server" and "disconnecting".
		//So basically, this state NEEDS to cleanup the user and treat him as if he just joined the server.
		this.clearOutUser();
		this.clearOutUserAgent();

		var ua = this.user.gs.uam.getUserAgentByID(this.user.userAgentId);
		if(ua !== null) {
			ua.insertServerToClientEvent({
				"eventName": "leaveGameImmediately"
			});
		}
	}

	update(dt) {
		this.kickTimerAcc += dt;

		//If they take too long in this state, then kick them. (usually this occurs if the client has the browser minimized)
		if(this.kickTimerAcc > this.kickTimer) {
			var ua = this.user.gs.uam.getUserAgentByID(this.user.userAgentId);
			if(ua !== null) {
				ua.forceDisconnect();
			}
		}

		//if the server just changed maps, wait for confirmation that the client has unloaded stuff before going back to waiting-for-server state
		if(this.user.bClientReadyToWait) {
			this.user.nextState = new UserWaitingForServerState.UserWaitingForServerState(this.user);
		}

		//if the user disconnected for any reason, just go to the disconnected state. 
		if(this.user.bDisconnected || this.kickTimerAcc > this.kickTimer) {
			this.user.nextState = new UserDisconnectingState.UserDisconnectingState(this.user);
		}
		
		super.update(dt);
	}

	exit(dt) {
		// logger.log("info", this.stateName + ' exit');

		//clear them out AGAIN. This is just incase there were any events/fragments created from packets
		//that were in transit from client to server while switching states.
		this.clearOutUser();
		this.clearOutUserAgent();

		this.user.bClientReadyToWait = false; //reset the client flag to false

		super.exit(dt);
	}

	clearOutUser() {		
		this.user.characterId = null;
		this.user.inputQueue.length = 0;

		this.user.userKillCount = 0;
		this.user.inputQueue.length = 0;
		this.user.userKillCount = 0;
		this.user.userDeathCount - 0;
		this.user.roundUserKillCount = 0;
		this.user.roundUserDeathCount = 0;
		this.user.teamId = null;
		this.user.characterClassResourceId = null;
		this.user.playingState = null;
		this.user.nextPlayingState = null;
		this.user.playingStateName = "";
		this.user.playintStateEnum = null;

		this.user.playingEventQueue.length = 0;
		this.user.respawnTimer = 0;
		this.user.respawnTimeAcc = 0;
		this.user.sendUserPlayingState = false;

		this.user.bOkayToBeInTheGame = false;
		this.user.bClientReadyToPlay = false;
		this.user.bClientReadyToWait = false;
	}

	clearOutUserAgent() {
		var ua = this.user.gs.uam.getUserAgentByID(this.user.userAgentId);
		if(ua !== null) {
			ua.serverToClientEvents.length = 0;
			ua.clientToServerEvents.length = 0;
			ua.fragmentedClientToServerEvents.length = 0;
			ua.fragmentedServerToClientEvents.length = 0;
			ua.fragmentIdCounter = 0;
			
			//clear out anything that has to do with tracked entities
			for(var i = 0; i < ua.trackedEntities.length; i++) {
				ua.trackedEntities[i].trackedEntityDeinit();
			}
			ua.trackedEntities.length = 0;
			ua.trackedEntityTransactions.length = 0;
			ua.trackedEntityUpdateList.length = 0;
			ua.trackedEntityUpdateListIndex.length = 0;
			ua.trackedEntityUpdateListDeleteTransactions.length = 0;

			//reset the indexes too
			ua.trackedEntityTypeIdIndex = {
				"user": {},
				"gameobject": {},
				"round": {},
				"team": {}
			}; 
			ua.trackedEntityUpdateListIndex = {
				"user": {},
				"gameobject": {},
				"round": {},
				"team": {}
			};

			//remove all callbacks from the websocket handler as well
			ua.wsh.removeAllCallbacks()
		}
	}

	processClientEvents(ua) {
		if(ua.clientToServerEvents.length > 0) {
			for(var i = 0; i < ua.clientToServerEvents.length; i++) {
				var e = ua.clientToServerEvents[i];
				switch(e.eventName) {
					//this should be the only event the user cares about in this state
					case "fromClientReadyToWait":
						this.user.bClientReadyToWait = true;
						break;
					default:
						//intentionally blank
						break;
				}
			}
					
			//delete all events
			ua.clientToServerEvents.length = 0;
		}
	}
}



exports.UserLeavingGameState = UserLeavingGameState;