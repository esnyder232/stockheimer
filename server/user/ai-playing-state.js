const {UserBaseState} = require('./user-base-state.js');
const {AiDisconnectingState} = require('./ai-disconnecting-state.js');
const PlayingSpectatorState = require('./playing-states/playing-spectator-state.js')
const logger = require('../../logger.js');

class AiPlayingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "ai-playing-state";
	}

	enter(dt) {
		//logger.log("info", this.stateName + ' enter');
		this.user.stateName = this.stateName;

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
			}


			//tell all users about the new info if its dirty
			if(this.user.userInfoDirty) {
				var userAgents = this.user.gs.uam.getUserAgents();
				for(var i = 0; i < userAgents.length; i++) {
					userAgents[i].insertTrackedEntityEvent("user", this.user.id, this.user.serializeUpdateUserInfoEvent());
				}
				this.user.userInfoDirty = false;
			}
		}

		if(!this.user.bOkayToBeInTheGame || this.user.bDisconnected) {
			this.user.nextState = new AiDisconnectingState(this.user);
		}
	}

	exit(dt) {
		//logger.log("info", this.stateName + ' exit');
		this.user.gs.um.userStopPlayingId(this.user.id);

		//only do this stuff if the server says its still okay to be in the game
		if(this.user.bOkayToBeInTheGame) {
			//kill the character if there was one
			this.user.gs.gameState.destroyOwnersCharacter(this.user.id, "user");
			this.user.characterId = null;

			//emit an event for ai users
			this.user.em.emitEvent("user-stopped-playing");
		}



		super.exit(dt);
	}
}



exports.AiPlayingState = AiPlayingState;