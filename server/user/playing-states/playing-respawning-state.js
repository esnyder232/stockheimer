const PlayingBaseState = require('./playing-base-state.js');
const PlayingPlayingState = require('./playing-playing-state.js');
const logger = require('../../../logger.js');
const GameConstants = require('../../../shared_files/game-constants.json');


class PlayingRespawningState extends PlayingBaseState.PlayingBaseState {
	constructor(user) {
		super(user);
		this.stateName = "RESPAWNING";
	}

	enter(dt) {
		// logger.log("info", this.stateName + ' enter');
		super.enter(dt);
		
		//respawn time depends on round state
		switch(this.user.gs.theRound.getStateEnum())
		{
			case GameConstants.RoundStates["STARTING"]:
				this.user.respawnTimer = 100;
				break;

			case GameConstants.RoundStates["PLAYING"]:
				this.user.respawnTimer = 6000;
				break;

			case GameConstants.RoundStates["OVER"]:
				this.user.respawnTimer = 999999;
				break;
			default: 
				this.user.respawnTimer = 999999;
				break;
		} 
		this.respawnTimeAcc = 0;
	}

	update(dt) {
		this.user.respawnTimeAcc += dt;

		//character is done waiting for respawn timer. Respawn him and let him start playing
		if(this.user.respawnTimeAcc >= this.user.respawnTimer && this.user.characterClassReourceId !== null) {
			if(this.user.gs.theRound.getStateEnum() !== GameConstants.RoundStates["OVER"]) {
				this.user.nextPlayingState = new PlayingPlayingState.PlayingPlayingState(this.user);
			}
		}

		//an event has occured
		if(this.user.playingEventQueue.length > 0) {
			for(var i = 0; i < this.user.playingEventQueue.length; i++) {
				switch(this.user.playingEventQueue[i].eventName) {
					case "round-restarting":
						//just restart timer
						this.user.respawnTimer = 100;
						break;
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

exports.PlayingRespawningState = PlayingRespawningState;