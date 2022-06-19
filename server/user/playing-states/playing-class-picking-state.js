const PlayingBaseState = require('./playing-base-state.js');
const logger = require('../../../logger.js');
const ServerConfig = require('../../server-config.json');


class PlayingClassPickingState extends PlayingBaseState.PlayingBaseState {
	constructor(user) {
		super(user);
		this.stateName = "CLASS_PICKING";
	}

	enter(dt) {
		// logger.log("info", this.stateName + ' enter');
		this.user.updateCharacterClassId(null);
		super.enter(dt);

		//if the name is "beepboop", pick a class
		if(ServerConfig.allow_simulated_user_ai_agents && this.user.username.indexOf("beepboop") === 0) {
			logger.log("info", "Detected a 'beepboop'. Picking a class for '" + this.user.username + "'");
			// var randomClass = this.user.globalfuncs.getRandomClass(this.user.gs);
			var randomClass = this.user.globalfuncs.getSpecificClass(this.user.gs, "data/character-classes/slime-defender.json")

			if(randomClass !== null) {
				this.user.updateCharacterClassId(randomClass.id);
			}
		}
	}

	update(dt) {
		//wait until the player picks a class
		if(this.user.characterClassResourceId !== null) {
			this.user.determineRespawnState();
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