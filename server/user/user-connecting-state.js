const {UserBaseState} = require('./user-base-state.js');
const {UserPlayingState} = require('./user-playing-state.js');

class UserConnectingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-connecting-state";
	}

	enter(dt) {
		console.log(this.stateName + ' enter');
		this.user.stateName = this.stateName;
		var activeUsers = this.user.gs.um.getActiveUsers();
		
		//tell the client about his/her own user id so they can identify themselves from other users
		this.user.serverToClientEvents.push({
			"eventName": "yourUser",
			"userId": this.user.id
		})
		
		//tell existing users about the user that joined
		for(var i = 0; i < activeUsers.length; i++)
		{
			activeUsers[i].serverToClientEvents.push({
				"eventName": "userConnected",
				"userId": this.user.id,
				"activeUserId": this.user.activeId,
				"username": this.user.username
			});
		}





		/////////////////////////////////////
		// SENDING WORLD STATE TO NEW USER //
		/////////////////////////////////////

		//if the current active user is not the one who just joined, send them an "existingUser" event
		for(var i = 0; i < activeUsers.length; i++)
		{
			if(activeUsers[i].id !== this.user.id)
			{
				this.user.serverToClientEvents.push({
					"eventName": "existingUser",
					"userId": activeUsers[i].id,
					"activeUserId": activeUsers[i].activeId,
					"username": activeUsers[i].username
				});
			}
		}


		//tell the client about the existing active characters
		var activeCharacters = this.user.gs.cm.getActiveCharacters();
		for(var i = 0; i < activeCharacters.length; i++)
		{
			//just to be safe
			if(activeCharacters[i] && activeCharacters[i].isActive)
			{
				//now tell all active clients about the new active character
				this.user.serverToClientEvents.push( {
					"eventName": "addActiveCharacter",
					"userId": activeCharacters[i].userId,
					"characterId": activeCharacters[i].id,
					"activeCharacterId": activeCharacters[i].activeId,
					"characterPosX": 5,
					"characterPosY": 5,
					"characterState": "",
					"characterType": ""
				})
			}
		}

		//send a worldDone signal at the end
		this.user.serverToClientEvents.push({
			"eventName": "worldStateDone"
		});

		super.enter(dt);
	}

	update(dt) {
		//wait for the "readyToPlay" signal from the client
		if(this.user.bReadyToPlay)
		{
			this.user.nextState = new UserPlayingState(this.user);
		}

		super.update(dt);
	}

	exit(dt) {
		console.log(this.stateName + ' exit');
		super.exit(dt);
	}
}



exports.UserConnectingState = UserConnectingState;