const {UserBaseState} = require('./user-base-state.js');
const {AiDisconnectingState} = require('./ai-disconnecting-state.js');
const logger = require('../../logger.js');

class AiPlayingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "ai-playing-state";
	}

	enter(dt) {
		//logger.log("info", this.stateName + ' enter');
		this.user.stateName = this.stateName;

		this.user.gs.um.userStartPlayingId(this.user.id, this.user.userPostStartPlaying());
		super.enter(dt);
	}

	update(dt) {
		super.update(dt);

		if(this.user.bDisconnected)
		{
			this.user.nextState = new AiDisconnectingState(this.user);
		}
	}

	exit(dt) {
		//logger.log("info", this.stateName + ' exit');
		super.exit(dt);
	}
}



exports.AiPlayingState = AiPlayingState;