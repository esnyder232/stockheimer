const {UserBaseState} = require('./user-base-state.js');
const {UserPlayingState} = require('./user-playing-state.js');
const {UserLeavingGameState} = require('./user-leaving-game-state.js');
const logger = require('../../logger.js');

class UserJoiningGameState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-joining-game-state";
		this.worldStateDoneEventSent = false;
	}

	enter(dt) {
		// logger.log("info", this.stateName + ' enter');
		this.user.stateName = this.stateName;
		var activeUsers = this.user.gs.um.getActiveUsers();
		var userAgents = this.user.gs.uam.getUserAgents();
		var teams = this.user.gs.tm.getTeams();
		var theRound = this.user.gs.theRound;
		var ua = this.user.gs.uam.getUserAgentByID(this.user.userAgentId);

		//tell the client about his/her own user id so they can identify themselves from other users
		ua.insertServerToClientEvent({
			"eventName": "yourUser",
			"userId": this.user.id
		})
		
		//tell existing users about the user that joined
		for(var i = 0; i < userAgents.length; i++) {
			userAgents[i].insertTrackedEntity("user", this.user.id);
		}

		/////////////////////////////////////
		// SENDING WORLD STATE TO NEW USER //
		/////////////////////////////////////

		//send the user who just joined a list of all the users
		for(var i = 0; i < activeUsers.length; i++)
		{
			ua.insertTrackedEntity("user", activeUsers[i].id);
		}

		//send the user who just joined the round state
		ua.insertTrackedEntity("round", theRound.id);

		//send the user who just joined a list of the existing teams
		for(var i = 0; i < teams.length; i++)
		{
			ua.insertTrackedEntity("team", teams[i].id);
		}

		//also balance the ai on the teams
		this.user.gs.rebalanceTeams = true;;

		super.enter(dt);
	}

	update(dt) {
		
		//only do this stuff if the server its still okay to be in the game
		if(this.user.bOkayToBeInTheGame) {
			//go through each worldState and check and MAKE SURE the client got them before sending the "worldStateDone" event
			//quite a bit hacky here, but it DOES work
			if(!this.worldStateDoneEventSent)
			{
				var ua = this.user.gs.uam.getUserAgentByID(this.user.userAgentId);
				var worldStateGood = true;

				//check if the tracked entities have all been created on the client side
				for(var i = 0; i < ua.trackedEntities.length; i++)
				{
					if(ua.trackedEntities[i].stateName !== "tracked-entity-created-state") {
						worldStateGood = false;
						break;
					}
				}

				if(worldStateGood && !this.worldStateDoneEventSent)
				{
					this.worldStateDoneEventSent = true;
					ua.insertServerToClientEvent({
						"eventName": "worldStateDone"
					});
				}
			}
		}
		
		//wait for the "bClientReadyToPlay" signal from the client
		if(this.worldStateDoneEventSent && this.user.bClientReadyToPlay) {
			this.user.nextState = new UserPlayingState(this.user);
		}

		//if the user wants to disconnect or the server is changing maps, leave the game
		if(this.user.bDisconnected || !this.user.bOkayToBeInTheGame) {
			this.user.nextState = new UserLeavingGameState(this.user);
		}
		

		super.update(dt);
	}

	exit(dt) {
		// logger.log("info", this.stateName + ' exit');
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
					//this should literally be the only event the user cares about in this state
					case "fromClientReadyToPlay":
						this.user.bClientReadyToPlay = true;
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

exports.UserJoiningGameState = UserJoiningGameState;