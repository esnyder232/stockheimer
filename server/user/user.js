const GlobalFuncs = require('../global-funcs.js');
const {UserDisconnectedState} = require("./user-disconnected-state.js");
const PlayingRespawningState = require('./playing-states/playing-respawning-state.js');
const PlayingClassPickingState = require('./playing-states/playing-class-picking-state.js');
const PlayingSpectatorState = require('./playing-states/playing-spectator-state.js');
const {EventEmitter} = require('../classes/event-emitter.js');
const logger = require('../../logger.js');

class User {
	constructor() {
		this.gs = null;
		this.id = null;
		this.activeId = null;
		this.isActive = false;
		this.globalfuncs = null;
		this.userAgentId = null;
		this.aiAgentId = null;
		this.userType = "";

		this.username = "";

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.characterId = null; //temp character id to establish a relationship between a user and character
		this.bReadyToPlay = false; //flag that gets flipped when the user sends the "readyToPlay" event
		this.bDisconnected = false; //flag that gets flipped when the user disconnects or times out

		this.inputQueue = [];
	
		this.plBody = null; //used for tracking when objects are near the user
		this.userKillCount = 0;		//total kills
		this.userDeathCount = 0;	//total deaths
		this.roundUserKillCount = 0;//kills in current round
		this.roundUserDeathCount = 0;	//deaths in current round

		this.teamId = null;
		this.characterClassResourceId = null;

		this.playingState = null;
		this.nextPlayingState = null;
		this.playingStateName = "";
		this.playingStateEnum = null;

		this.playingEventQueue = [];

		this.respawnTimer = 0;
		this.respawnTimeAcc = 0;

		this.sendUserPlayingState = false;

		this.roundEventCallbackMapping = [ 
			{eventName: "round-restarting", cb: this.cbEventEmitted.bind(this), handleId: null},
			{eventName: "round-started", cb: this.cbEventEmitted.bind(this), handleId: null},
		]
		
		this.em = null;
	}

	userInit(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs.GlobalFuncs();
		this.em = new EventEmitter(this);
		
		this.state = new UserDisconnectedState(this);
		this.state.enter();
	}

	activated() {
		//console.log('user activated for ' + this.username);
		
		//assign to sepctator team by default
		var spectatorTeam = this.gs.tm.getSpectatorTeam();
		if(this.teamId === null && spectatorTeam) {
			this.teamId = spectatorTeam.id;
		}

		this.playingState = new PlayingSpectatorState.PlayingSpectatorState(this);
		this.playingState.enter();

		//register for events from the round
		this.gs.theRound.em.batchRegisterForEvent(this.roundEventCallbackMapping);
	}

	deactivated() {
		// console.log('user deactivated called for ' + this.username);
		//unregister for events from the round
		this.gs.theRound.em.batchUnregisterForEvent(this.roundEventCallbackMapping);

		this.em.emitEvent("user-deactivated");
	}


	updateTeamId(newTeamId) {
		this.teamId = newTeamId;
		this.userInfoDirty = true;
		
		this.playingEventQueue.push({
			eventName: "team-changed"
		})
	}

	updateCharacterClassId(newClassId) {
		this.characterClassResourceId = newClassId;
		this.userInfoDirty = true;
		
		this.playingEventQueue.push({
			eventName: "class-changed"
		})
	}

	determinePlayingState() {
		var spectatorTeam = this.gs.tm.getSpectatorTeam();

		//if the player chose any team except the spectator team, put the player in an initial playing state
		if(spectatorTeam && this.teamId !== spectatorTeam.id) {
			this.nextPlayingState = new PlayingClassPickingState.PlayingClassPickingState(this);
		}
		else {
			this.nextPlayingState = new PlayingSpectatorState.PlayingSpectatorState(this);
		}
	}

	userPostStartPlaying() {
		this.determinePlayingState();
	}

	userDeinit() {
		//fucking whatever
		this.globalfuncs.balanceAiUsersOnTeams(this.gs);

		this.characterId = null;
		//this.teamId = null; //purposely commented out and left in code to remind you later: don't get rid of the teamId so the game remembers what team you were on.
		this.characterClassResourceId = null;
		this.bReadyToPlay = false;
		this.bDisconnected = false;
		this.inputQueue = [];

		this.playingState = null;
		this.nextPlayingState = null;
		this.userAgentId = null;
		this.aiAgentId = null;
		this.playingEventQueue = [];
		this.em.eventEmitterDeinit();
		this.em = null;
	}

	//just queue the events that occured and handle them in the user's own update loop
	cbEventEmitted(eventName, owner) {
		this.playingEventQueue.push({
			eventName: eventName
		})
	}

	updateKillCount(amt) {
		this.userKillCount += amt;
		this.roundUserKillCount += amt;
		this.userInfoDirty = true;
	}

	updateDeathsCount(amt) {
		this.userDeathCount += amt;
		this.roundUserDeathCount += amt;
		this.userInfoDirty = true;
	}

	resetRoundCounts() {
		this.roundUserKillCount = 0;
		this.roundUserDeathCount = 0;
		this.userInfoDirty = true;
	}

	update(dt) {
		//update connection state
		this.state.update();

		//update playing state if they have one
		this.playingState.update(dt);
		if(this.nextPlayingState !== null) {
			this.playingState.exit(dt);
			this.nextPlayingState.enter(dt);

			this.playingState = this.nextPlayingState;
			this.nextPlayingState = null;

			this.sendUserPlayingState = true;
		}

		//update user state
		if(this.nextState) {
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}

		//tell all users about the new info if its dirty
		if(this.userInfoDirty) {
			var userAgents = this.gs.uam.getUserAgents();
			for(var i = 0; i < userAgents.length; i++)
			{
				userAgents[i].insertTrackedEntityEvent("user", this.id, this.serializeUpdateUserInfoEvent());
			}
			this.userInfoDirty = false;
		}
		
		//tell only the connected user if their playing state changed
		if(this.sendUserPlayingState) {
			var ua = this.gs.uam.getUserAgentByID(this.userAgentId);
			if(ua !== null) {
				var te = ua.findTrackedEntity("user", this.id);
				if(te !== null) {
					te.insertOrderedEvent({
						"eventName": "updateUserPlayingState",
						"userId": this.id,
						"userPlayingState": this.playingStateEnum,
						"userRespawnTime": this.respawnTimer,
						"userRespawnTimeAcc": this.respawnTimeAcc
					})
				}
			}

			this.sendUserPlayingState = false;
		}



		this.em.update(dt);
	}

	///////////////////////////////////
	// EVENT SERIALIZATION FUNCTIONS //
	///////////////////////////////////
	serializeUserConnectedEvent() {
		return {
			"eventName": "userConnected",
			"userId": this.id,
			"username": this.username,
			"teamId": this.teamId,
			"userKillCount": this.userKillCount,
			"roundUserKillCount": this.roundUserKillCount,
			"userDeathCount": this.userDeathCount,
			"roundUserDeathCount": this.roundUserDeathCount,
			"characterClassResourceId": this.characterClassResourceId
		};
	}

	serializeUserDisconnectedEvent() {
		return {
			"eventName": "userDisconnected",
			"userId": this.id
		};
	}

	serializeUpdateUserInfoEvent() {
		return {
			"eventName": "updateUserInfo",
			"userId": this.id,
			"teamId": this.teamId,
			"userKillCount": this.userKillCount,
			"roundUserKillCount": this.roundUserKillCount,
			"userDeathCount": this.userDeathCount,
			"roundUserDeathCount": this.roundUserDeathCount,
			"characterClassResourceId": this.characterClassResourceId
		};
	}

}

exports.User = User;
