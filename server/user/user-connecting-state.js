// const {UserBaseState} = require('./user-base-state.js');
// const {UserPlayingState} = require('./user-playing-state.js');
// const {UserDisconnectingState} = require('./user-disconnecting-state.js');
// const logger = require('../../logger.js');

// /* 









// NOTHING IN HERE IS USED ANYMORE.
// IT IS LEFT IN HERE FOR REFERENCE.








// */


// class UserConnectingState extends UserBaseState {
// 	constructor(user) {
// 		super(user);
// 		this.stateName = "user-connecting-state";
// 		this.worldStateDoneEventSent = false;
// 		this.teamAcks = [];
// 	}

// 	enter(dt) {
// 		//logger.log("info", this.stateName + ' enter');
// 		this.user.stateName = this.stateName;
// 		var activeUsers = this.user.gs.um.getActiveUsers();
// 		var userAgents = this.user.gs.uam.getUserAgents();
// 		var teams = this.user.gs.tm.getTeams();
// 		var theRound = this.user.gs.theRound;
// 		var ua = this.user.gs.uam.getUserAgentByID(this.user.userAgentId);
		
// 		//tell the client about his/her own user id so they can identify themselves from other users
// 		ua.insertServerToClientEvent({
// 			"eventName": "yourUser",
// 			"userId": this.user.id
// 		})
		
// 		//tell existing users about the user that joined
// 		for(var i = 0; i < userAgents.length; i++)
// 		{
// 			userAgents[i].insertTrackedEntity("user", this.user.id);
// 		}

// 		//send a message to existing users about the person that joined
// 		for(var j = 0; j < userAgents.length; j++)
// 		{
// 			userAgents[j].insertServerToClientEvent({
// 				"eventName": "fromServerChatMessage",
// 				"userId": 0,
// 				"chatMsg": "Player '" + this.user.username + "' has connected.",
// 				"isServerMessage": true
// 			});
// 		}
		
// 		/////////////////////////////////////
// 		// SENDING WORLD STATE TO NEW USER //
// 		/////////////////////////////////////

// 		//send the user who just joined a list of all the users
// 		for(var i = 0; i < activeUsers.length; i++)
// 		{
// 			ua.insertTrackedEntity("user", activeUsers[i].id);
// 		}

// 		//send the user who just joined the round state
// 		ua.insertTrackedEntity("round", theRound.id);

// 		//send the user who just joined a list of the existing teams
// 		for(var i = 0; i < teams.length; i++)
// 		{
// 			ua.insertTrackedEntity("team", teams[i].id);
// 		}

// 		//also balance the ai on the teams
// 		this.user.globalfuncs.balanceAiUsersOnTeams(this.user.gs);

// 		super.enter(dt);
// 	}

// 	update(dt) {
		
// 		//go through each worldState and check and MAKE SURE the client got them before sending the "worldStateDone" event
// 		//quite a bit hacky here, but it DOES work
// 		if(!this.worldStateDoneEventSent)
// 		{
// 			var ua = this.user.gs.uam.getUserAgentByID(this.user.userAgentId);
// 			var worldStateGood = true;

// 			//check if the tracked entities have all been created on the client side
// 			for(var i = 0; i < ua.trackedEntities.length; i++)
// 			{
// 				if(ua.trackedEntities[i].stateName !== "tracked-entity-created-state") {
// 					worldStateGood = false;
// 					break;
// 				}
// 			}

// 			if(worldStateGood && !this.worldStateDoneEventSent)
// 			{
				
// 				this.worldStateDoneEventSent = true;
// 				ua.insertServerToClientEvent({
// 					"eventName": "worldStateDone"
// 				});
// 			}
// 		}
		
// 		if(this.user.bDisconnected)
// 		{
// 			this.user.nextState = new UserDisconnectingState(this.user);
// 		}
// 		else if(this.worldStateDoneEventSent && this.user.bClientReadyToPlay)
// 		{
// 			this.user.nextState = new UserPlayingState(this.user);
// 		}

// 		super.update(dt);
// 	}

// 	cbAddTeam(miscData) {
// 		var t = this.teamAcks.find((x) => {return x.id === miscData.id;});
// 		if(t) {
// 			t.acked = true;
// 		}
// 	}

// 	exit(dt) {
// 		//logger.log("info", this.stateName + ' exit');
// 		super.exit(dt);
// 	}
// }



// exports.UserConnectingState = UserConnectingState;