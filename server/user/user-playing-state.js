const {UserBaseState} = require('./user-base-state.js');
const {UserDisconnectingState} = require('./user-disconnecting-state.js');

class UserPlayingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-playing-state";
	}

	enter(dt) {
		console.log(this.stateName + ' enter');
		this.user.stateName = this.stateName;

		this.user.gs.um.userStartPlayingId(this.user.id);
		super.enter(dt);
	}

	update(dt) {
		super.update(dt);

		var firingInputFound = false;

		if(this.user.inputQueue.length > 0)
		{
			var c = this.user.gs.cm.getCharacterByID(this.user.characterId);

			//if you are currently controlling a character, just pass the input events to the character itself
			if(c !== null)
			{
				for(var i = 0; i < this.user.inputQueue.length; i++)
				{
					c.inputQueue.push(this.user.inputQueue[i]);
				}
			}
			
			//clear out input queue at end of frame
			this.user.inputQueue.length = 0;
		}
	}

	exit(dt) {
		console.log(this.stateName + ' exit');
		this.user.gs.um.userStopPlayingId(this.user.id);
		super.exit(dt);
	}
}



exports.UserPlayingState = UserPlayingState;