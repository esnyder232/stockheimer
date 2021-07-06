const PlayingBaseState = require('./playing-base-state.js');
const PlayingRespawningState = require('./playing-respawning-state.js');
const logger = require('../../../logger.js');
const GameConstants = require('../../../shared_files/game-constants.json');


class PlayingClassPickingState extends PlayingBaseState.PlayingBaseState {
	constructor(user) {
		super(user);
		this.stateName = "CLASS_PICKING";
	}

	enter(dt) {
		// logger.log("info", this.stateName + ' enter');
		this.user.updateCharacterClassId(null);
		super.enter(dt);
	}

	update(dt) {
		//wait until the player picks a class
		if(this.user.characterClassResourceId !== null) {
			this.user.nextPlayingState = new PlayingRespawningState.PlayingRespawningState(this.user);
		}

		//an event has occured
		if(this.user.playingEventQueue.length > 0) {
			for(var i = 0; i < this.user.playingEventQueue.length; i++) {
				switch(this.user.playingEventQueue[i].eventName) {
					case "team-changed":
						this.user.determinePlayingState();
						break;
				}
			}

			this.user.playingEventQueue.length = 0;
		}
	}

	exit(dt) {
		// logger.log("info", this.stateName + ' exit');
		super.exit(dt);

		this.user.respawnTimer = 0;
		this.user.respawnTimeAcc = 0;
	}
}

exports.PlayingClassPickingState = PlayingClassPickingState;