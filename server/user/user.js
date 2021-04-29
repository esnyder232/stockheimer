const GlobalFuncs = require('../global-funcs.js');
const {UserDisconnectedState} = require("./user-disconnected-state.js");
const PlayingRespawningState = require('./playing-states/playing-respawning-state.js');
const PlayingSpectatorState = require('./playing-states/playing-spectator-state.js');
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
		this.userKillCount = 0;

		this.teamId = null;

		this.playingState = null;
		this.nextPlayingState = null;
		this.playingStateName = "";
		this.playingStateEnum = null;

		this.playingEventQueue = [];

		this.respawnTimer = 0;
		this.respawnTimeAcc = 0;
	}

	userInit(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs.GlobalFuncs();
		
		this.state = new UserDisconnectedState(this);
		this.state.enter();
	}

	userPostActivated() {
		//console.log('userPostActivated for ' + this.username);
		
		//assign to sepctator team by default
		var spectatorTeam = this.gs.tm.getSpectatorTeam();
		if(this.teamId === null && spectatorTeam) {
			this.teamId = spectatorTeam.id;
		}

		this.playingState = new PlayingSpectatorState.PlayingSpectatorState(this);
		this.playingState.enter();

	}

	updateTeamId(newTeamId) {
		this.teamId = newTeamId;
		this.userInfoDirty = true;
		
		this.insertPlayingEvent("team-changed");
	}

	determinePlayingState() {
		var spectatorTeam = this.gs.tm.getSpectatorTeam();

		//if the player chose any team except the spectator team, put the player in an initial playing state
		if(spectatorTeam && this.teamId !== spectatorTeam.id)
		{
			this.nextPlayingState = new PlayingRespawningState.PlayingRespawningState(this);
		}
		else
		{
			this.nextPlayingState = new PlayingSpectatorState.PlayingSpectatorState(this);
		}
	}

	userPostStartPlaying() {
		this.determinePlayingState();
	}

	userDeinit() {
		this.characterId = null;
		//this.teamId = null; //purposely commented out and left in code to remind you later: don't get rid of the teamId so the game remembers what team you were on.
		this.bReadyToPlay = false;
		this.bDisconnected = false;
		this.inputQueue = [];

		this.playingState = null;
		this.nextPlayingState = null;
		this.userAgentId = null;
		this.aiAgentId = null;
		this.playingEventQueue = [];
	}

	insertPlayingEvent(eventName, data) {
		this.playingEventQueue.push({
			eventName: eventName,
			data: data
		})
	}

	updateKillCount(amt) {
		this.userKillCount += amt;
		this.userInfoDirty = true;
	}

	update(dt) {
		//update connection state
		this.state.update();

		//update plyaing state if they have one
		this.playingState.update(dt);

		if(this.nextPlayingState !== null)
		{
			this.playingState.exit(dt);
			this.nextPlayingState.enter(dt);

			var ua = this.gs.uam.getUserAgentByID(this.userAgentId);
			if(ua !== null) {
				var te = ua.findTrackedEntity("user", this.id);
				if(te !== null)
				{
					te.insertOrderedEvent({
						"eventName": "updateUserPlayingState",
						"userId": this.id,
						"userPlayingState": this.playingStateEnum,
						"userRespawnTime": this.respawnTimer,
						"userRespawnTimeAcc": this.respawnTimeAcc
					})
				}
			}


			this.playingState = this.nextPlayingState;
			this.nextPlayingState = null;
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

		if(this.nextState)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}
	}

	///////////////////////////////////
	// EVENT SERIALIZATION FUNCTIONS //
	///////////////////////////////////
	serializeUserConnectedEvent() {
		return {
			"eventName": "userConnected",
			"userId": this.id,
			"username": this.username,
			"userKillCount": this.userKillCount,
			"teamId": this.teamId
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
			"userKillCount": this.userKillCount,
			"userRtt": 0,
			"teamId": this.teamId
		};
	}

}

exports.User = User;
