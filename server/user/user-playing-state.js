const {UserBaseState} = require('./user-base-state.js');
const {UserLeavingGameState} = require('./user-leaving-game-state.js');
const PlayingSpectatorState = require('./playing-states/playing-spectator-state.js')

const logger = require('../../logger.js');

class UserPlayingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-playing-state";
	}

	enter(dt) {
		// logger.log("info", this.stateName + ' enter');
		this.user.stateName = this.stateName;
		
		//tell the user manager this user has started playing
		this.user.gs.um.userStartPlayingId(this.user.id);

		//only do this stuff if the server says its still okay to be in the game
		if(this.user.bOkayToBeInTheGame) {

			//assign to spectator team by default
			var spectatorTeam = this.user.gs.tm.getSpectatorTeam();
			if(spectatorTeam !== null) {
				this.user.updateTeamId(spectatorTeam.id);
			}

			//create a playing state so the player can atleast start in spectator mode
			this.user.playingState = new PlayingSpectatorState.PlayingSpectatorState(this.user);
			this.user.playingState.enter();

			//register for events from the round
			if(this.user.gs.theRound !== null) {
				this.user.gs.theRound.em.batchRegisterForEvent(this.user.roundEventCallbackMapping);
			}

			//get all the existing gameobjects and put them in tracked entities for the player
			var gobs = this.user.gs.gom.getActiveGameObjects();
			var ua = this.user.gs.uam.getUserAgentByID(this.user.userAgentId);
			if(ua !== null) {
				for(var i = 0; i < gobs.length; i++) {
					ua.insertTrackedEntity("gameobject", gobs[i].id);
				}
			}
		}		

		super.enter(dt);
	}

	update(dt) {
		super.update(dt);

		//only update this stuff if the server says its still okay to be in the game
		if(this.user.bOkayToBeInTheGame) {
			
			//update playing state if they have one
			this.user.playingState.update(dt);

			if(this.user.nextPlayingState !== null) {
				this.user.playingState.exit(dt);
				this.user.nextPlayingState.enter(dt);

				this.user.playingState = this.user.nextPlayingState;
				this.user.nextPlayingState = null;

				this.user.sendUserPlayingState = true;
			}


			//tell all users about the new info if its dirty
			if(this.user.userInfoDirty) {
				var userAgents = this.user.gs.uam.getUserAgents();
				for(var i = 0; i < userAgents.length; i++) {
					userAgents[i].insertTrackedEntityEvent("user", this.user.id, this.user.serializeUpdateUserInfoEvent());
				}
				this.user.userInfoDirty = false;
			}

			//tell only the connected user if their playing state changed
			if(this.user.sendUserPlayingState) {
				var ua = this.user.gs.uam.getUserAgentByID(this.user.userAgentId);
				if(ua !== null) {
					ua.insertTrackedEntityOrderedEvent("user", this.user.id, {
						"eventName": "updateUserPlayingState",
						"userId": this.user.id,
						"userPlayingState": this.user.playingStateEnum,
						"userRespawnTime": this.user.respawnTimer,
						"userRespawnTimeAcc": this.user.respawnTimeAcc
					})
				}

				this.user.sendUserPlayingState = false;
			}
		}

		//if the user was disconnected for some reason, or the server changed maps, change state to leaving game
		if(this.user.bDisconnected || !this.user.bOkayToBeInTheGame) {
			this.user.nextState = new UserLeavingGameState(this.user);
		}
	}

	exit(dt) {
		// logger.log("info", this.stateName + ' exit');

		//tell the user manager this user has stopped playing
		this.user.gs.um.userStopPlayingId(this.user.id);

		//only do this stuff if the server says its still okay to be in the game
		if(this.user.bOkayToBeInTheGame) {
			//kill the character if there was one
			this.user.gs.gameState.destroyOwnersCharacter(this.user.id, "user");
			this.user.characterId = null;

			//unregister for events from the round
			if(this.user.gs.theRound !== null) {
				this.user.gs.theRound.em.batchUnregisterForEvent(this.user.roundEventCallbackMapping);
			}
		}

		//kill the playing state
		this.user.playingState = null;
		this.user.nextPlayingState = null;

		super.exit(dt);
	}

	processClientEvents(ua) {
		//if the server says its not okay to be in the game, delete all the events and return immediately
		if(!this.user.bOkayToBeInTheGame) {
			ua.clientToServerEvents.length = 0;
			return;
		}

		if(ua.clientToServerEvents.length > 0) {
			for(var i = 0; i < ua.clientToServerEvents.length; i++) {
				var e = ua.clientToServerEvents[i];
				switch(e.eventName)
				{
					case "fromClientChatMessage":
						var userAgents = this.user.gs.uam.getUserAgents();
						logger.log("info", "Player: " + this.user.username + ", event: fromClientChatMessage: " + e.chatMsg);
						for(var j = 0; j < userAgents.length; j++) {
							userAgents[j].insertTrackedEntityEvent('user', this.user.id, {
								"eventName": "fromServerChatMessage",
								"userId": this.user.id,
								"chatMsg": e.chatMsg,
								"isServerMessage": false
							})
						}
						
						break;
						
					case "fromClientInputs":
						this.user.inputQueue.push(e);
						break;

					case "fromClientReadyToPlay":
						this.user.bClientReadyToPlay = true;
						break;
					case "fromClientReadyToWait":
						this.user.bClientReadyToWait = true;
						break;

					case "fromClientJoinTeam":
						var existingTeamId = this.user.teamId;
						var newTeamId = null;
						var broadcastMessage = "";
						var logEventMessage = "";

						var newTeam = this.user.gs.tm.getTeamByID(e.teamId);
						
						if(newTeam !== null) {
							newTeamId = newTeam.id;
						}

						//if the new team is different than the existing, change it, and send an event
						if(newTeamId !== existingTeamId && newTeamId !== null)
						{
							this.user.updateTeamId(newTeamId);

							broadcastMessage = "Player '" + this.user.username + "' joined " + newTeam.name;
							logEventMessage = "Player: " + this.user.username + ", event: fromClientJoinTeam: joined " + newTeam.name + "(" + newTeamId + ")";
						}

						//send out usermessage and/or broadcast message
						if(broadcastMessage !== "")
						{
							this.user.gs.broadcastResponseMessage(broadcastMessage, logEventMessage);
						}

						break;
					case "fromClientChangeClass":
						var existingClassId = this.user.characterClassResourceId;
						var newClassId = null;
						var broadcastMessage = "";
						var logEventMessage = "";

						var newClassResource = this.user.gs.rm.getResourceByID(e.characterClassResourceId);
						
						if(newClassResource !== null && newClassResource.resourceType === "character-class") {
							newClassId = newClassResource.id;
						}

						//if the new class is different than the existing, change it, and send an event
						if(newClassId !== null && newClassId !== existingClassId) {
							this.user.updateCharacterClassId(newClassId);

							broadcastMessage = "Player '" + this.user.username + "' changed class to " + newClassResource.data.name;
							logEventMessage = "Player: " + this.user.username + ", event: fromClientChangeClass: chnaged class to " + newClassResource.data.name;
						}

						//send out usermessage and/or broadcast message
						if(broadcastMessage !== "") {
							this.user.gs.broadcastResponseMessage(broadcastMessage, logEventMessage);
						}
						break;


					case "fragmentStart":
					case "fragmentContinue":
					case "fragmentEnd":
						ua.fromClientFragmentEvent(e);
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

exports.UserPlayingState = UserPlayingState;