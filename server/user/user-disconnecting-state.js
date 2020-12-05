const {UserBaseState} = require('./user-base-state.js');
const UserDisconnectedState = require('./user-disconnected-state.js');

class UserDisconnectingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-disconnecting-state";
	}

	enter(dt) {
		console.log(this.stateName + ' enter');
		this.user.stateName = this.stateName;

		super.enter(dt);
	}

	update(dt) {
		//for now, just go to the next state immediately
		this.user.nextState = new UserDisconnectedState.UserDisconnectedState(this.user);
		super.update(dt);
	}

	exit(dt) {
		console.log(this.stateName + ' exit');

		//clean up any relationships the user may have had
		//this.gs.gameState.deactivateSLOs(this.user.characterId);
		this.user.gs.gameState.destroyUsersCharacter(this.user);
		this.user.gs.gameState.deactivateUserId(this.user.id);


		//delete SLOs
		//this.gs.slom.deleteSLO(sloID);
		
		//reset the user
		this.user.userDeinit();


		super.exit(dt);
	}
}



exports.UserDisconnectingState = UserDisconnectingState;