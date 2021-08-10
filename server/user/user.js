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
		this.inputQueue = [];
	
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
			{eventName: "round-map-end", cb: this.cbEventEmitted.bind(this), handleId: null},
			
		]
		
		this.em = null;

		//This is a flag to be set when its okay for the user to be in the game. This essentially drives when the user NEEDS to leave the game because of map rotation.
		//This gets set to true ONLY when the user is in the "user-waiting-for-server-state", when the server has the map loaded
		//This gets set to false ONLY when the user is in the "user-joining-game-state" or "user-playing-state", when the server is unloading maps.
		this.bOkayToBeInTheGame = false;

		this.bClientReadyToPlay = false; //flag for when the client has finished loading resources/world state, and is ready to play.
		this.bClientReadyToWait = false; //flag for when the client has finished unloading resources/world state (user-leaving-game-state), and is ready to go into the user-waiting-for-server-state.
		this.bDisconnected = false; //flag that gets flipped when the user disconnects or times out
	}


	userInit(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs.GlobalFuncs();
		this.em = new EventEmitter(this);
		
		this.state = new UserDisconnectedState(this);
		this.state.enter();
	}

	activated() {
		// console.log('user activated for ' + this.username);
	}

	deactivated() {
		// console.log('user deactivated called for ' + this.username);
		
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
		if(spectatorTeam && this.teamId !== null && this.teamId !== spectatorTeam.id) {
			this.nextPlayingState = new PlayingClassPickingState.PlayingClassPickingState(this);
		}
		else {
			this.nextPlayingState = new PlayingSpectatorState.PlayingSpectatorState(this);
		}
	}

	userDeinit() {
		//fucking whatever
		this.gs.rebalanceTeams = true;

		this.characterId = null;
		this.teamId = null;
		this.characterClassResourceId = null;
		this.bClientReadyToWait = false;
		this.bDisconnected = false;
		this.inputQueue = [];

		this.playingState = null;
		this.nextPlayingState = null;
		this.userAgentId = null;
		this.aiAgentId = null;
		this.playingEventQueue = [];
		this.em.eventEmitterDeinit();
		this.em = null;
		this.state = null;
		this.nextState = null;
		this.globalfuncs = null;
		this.gs = null;
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
		//update user state
		this.state.update(dt);

		if(this.nextState) {
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}	

		this.em.update(dt);
	}

	processClientEvents() {
		if(this.userType === "user") {
			var ua = this.gs.uam.getUserAgentByID(this.userAgentId);
			if(ua !== null) {
				this.state.processClientEvents(ua);
			}
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
