const PlayingBaseState = require('./playing-base-state.js');
const logger = require('../../../logger.js');

class PlayingSpectatorState extends PlayingBaseState.PlayingBaseState {
	constructor(user) {
		super(user);
		this.stateName = "SPECTATOR";
		this.spawnFailed = false;
	}

	enter(dt) {
		super.enter(dt);
		this.user.inputQueue.length = 0;
	}

	update(dt) {
		if(this.user.playingEventQueue.length > 0)
		{
			for(var i = 0; i < this.user.playingEventQueue.length; i++)
			{
				switch(this.user.playingEventQueue[i].eventName)
				{
					case "team-changed":
						this.user.determinePlayingState();
						break;
				}
			}

			this.user.playingEventQueue.length = 0;
		}
	}

	exit(dt) {
		super.exit(dt);
		this.user.inputQueue.length = 0;
	}
}

exports.PlayingSpectatorState = PlayingSpectatorState;