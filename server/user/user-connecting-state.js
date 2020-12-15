const {UserBaseState} = require('./user-base-state.js');
const {UserPlayingState} = require('./user-playing-state.js');
const {UserDisconnectingState} = require('./user-disconnecting-state.js');

class UserConnectingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-connecting-state";
	}

	enter(dt) {
		//console.log(this.stateName + ' enter');
		this.user.stateName = this.stateName;
		var activeUsers = this.user.gs.um.getActiveUsers();
		var playingUsers = this.user.gs.um.getPlayingUsers();
		
		//tell the client about his/her own user id so they can identify themselves from other users
		this.user.trackedEvents.push({
			"eventName": "yourUser",
			"userId": this.user.id
		})
		
		//tell existing users about the user that joined
		for(var i = 0; i < playingUsers.length; i++)
		{
			// activeUsers[i].trackedEvents.push({
			// 	"eventName": "userConnected",
			// 	"userId": this.user.id,
			// 	"activeUserId": this.user.activeId,
			// 	"username": this.user.username
			// });

			playingUsers[i].insertTrackedEntity("user", this.user.id);
		}





		/////////////////////////////////////
		// SENDING WORLD STATE TO NEW USER //
		/////////////////////////////////////

		// //if the current active user is not the one who just joined, send them an "existingUser" event
		// for(var i = 0; i < activeUsers.length; i++)
		// {
		// 	if(activeUsers[i].id !== this.user.id)
		// 	{
		// 		// this.user.trackedEvents.push({
		// 		// 	"eventName": "existingUser",
		// 		// 	"userId": activeUsers[i].id,
		// 		// 	"activeUserId": activeUsers[i].activeId,
		// 		// 	"username": activeUsers[i].username
		// 		// });

		// 		activeUsers[i].insertTrackedEntity("user", activeUsers[i].id);
		// 	}
		// }

		//send the user who just joined a list of all the users
		for(var i = 0; i < activeUsers.length; i++)
		{
			this.user.insertTrackedEntity("user", activeUsers[i].id);
		}



		//send a worldDone signal at the end
		//how the fuck do we send this now?!?!?
		//for now, just send this out. Its not gonna ACTUALLY wait for the world state to be acknowledged by the user, but whatever.
		this.user.trackedEvents.push({
			"eventName": "worldStateDone"
		});

		super.enter(dt);
	}

	update(dt) {
		//wait for the "readyToPlay" signal from the client

		//stopped here - if you refresh EXACTLY on the frame that the user is "ready to play", then the user is stuck in "user-playing-state" with their web socket handler deleted. So they are "playing" on the server,
		// but not playing in the browser. And because their websocket handler is deleted, I can't detect a disconnect. Wierd shit.

		//I think we just need a better way to handle this corner case (IOW, go from user-connecting-state to user-disconnecting-state directly, instead of only going to UserPlayingState)
		if(this.user.bDisconnected)
		{
			this.user.nextState = new UserDisconnectingState(this.user);
		}
		else if(this.user.bReadyToPlay)
		{
			this.user.nextState = new UserPlayingState(this.user);
		}

		super.update(dt);
	}

	exit(dt) {
		//console.log(this.stateName + ' exit');
		super.exit(dt);
	}
}



exports.UserConnectingState = UserConnectingState;