const PlayingBaseState = require('./playing-base-state.js');
const PlayingRespawningState = require('./playing-respawning-state.js');
const logger = require('../../../logger.js');
const GameConstants = require('../../../shared_files/game-constants.json');

class PlayingPlayingState extends PlayingBaseState.PlayingBaseState {
	constructor(user) {
		super(user);
		this.stateName = "PLAYING";
		this.spawnFailed = false;
	}

	enter(dt) {
		//logger.log("info", this.stateName + ' enter');
		super.enter(dt);
		this.user.inputQueue.length = 0;

		this.spawnFailed = this.globalfuncs.spawnCharacterForUser(this.user.gs, this.user);

		//if they spawned in when the round is starting up, don't allow them to move yet
		if(!this.spawnFailed && this.user.gs.theRound.getStateEnum() === GameConstants.RoundStates["STARTING"])
		{
			var c = this.user.gs.gom.getGameObjectByID(this.user.characterId);
			if(c !== null)
			{
				c.changeAllowMove(false);
				c.changeAllowShoot(false);
			}
		}
	}

	update(dt) {
		//if it failed for some reason, just return to the respawning state
		if(!this.spawnFailed)
		{
			if(this.user.inputQueue.length > 0)
			{
				var c = this.user.gs.gom.getGameObjectByID(this.user.characterId);
	
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

			if(this.user.playingEventQueue.length > 0)
			{
				for(var i = 0; i < this.user.playingEventQueue.length; i++)
				{
					switch(this.user.playingEventQueue[i].eventName)
					{
						case "round-started":
							//allow the user to move and shoot again
							var c = this.user.gs.gom.getGameObjectByID(this.user.characterId);
							if(c !== null)
							{
								c.changeAllowMove(true);
								c.changeAllowShoot(true);
							}
							break;
						case "round-restarting":
							//kill the current character, and put user in respawning state
							this.user.gs.gameState.destroyOwnersCharacter(this.user.id, "user");
							this.user.characterId = null;
							this.user.nextPlayingState = new PlayingRespawningState.PlayingRespawningState(this.user);
							break;
						case "character-died":
							this.user.characterId = null;
							this.user.nextPlayingState = new PlayingRespawningState.PlayingRespawningState(this.user);
							break;
						case "team-changed":
							this.user.gs.gameState.destroyOwnersCharacter(this.user.id, "user");
							this.user.characterId = null;
							this.user.determinePlayingState();
							break;
					}
				}

				this.user.playingEventQueue.length = 0;
			}
			
		}
		else
		{
			this.nextPlayingState = new PlayingRespawningState.PlayingRespawningState(this.user);
		}
	}

	exit(dt) {
		//logger.log("info", this.stateName + ' exit');		
		super.exit(dt);
		this.user.inputQueue.length = 0;
	}
}

exports.PlayingPlayingState = PlayingPlayingState;