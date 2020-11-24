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

		if(this.user.inputQueue.length > 0)
		{
			var c = this.user.gs.cm.getCharacterByID(this.user.characterId);
			if(c !== null)
			{
				//consolidate movement inputs
				//for now, just take the last known input
				var lastKnownInput = this.user.inputQueue[this.user.inputQueue.length - 1];

				//consolidate fire inputs
				//take first fireing input...when i actually have something to fire (bullets)

				c.inputController.up.state = lastKnownInput.up;
				c.inputController.down.state = lastKnownInput.down;
				c.inputController.left.state = lastKnownInput.left;
				c.inputController.right.state = lastKnownInput.right;

				c.isInputDirty = true;	//kinda wierd the diry flag set is HERE and not in the charcter...but whatever
			}
			
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