const PlayingBaseState = require('./playing-base-state.js');
const logger = require('../../../logger.js');
const GameConstants = require('../../../shared_files/game-constants.json');

class PlayingPlayingState extends PlayingBaseState.PlayingBaseState {
	constructor(user) {
		super(user);
		this.stateName = "PLAYING";
		this.spawnFailed = false;
		this.characterDeactivatedHandleId = null;
	}

	enter(dt) {
		//logger.log("info", this.stateName + ' enter');
		super.enter(dt);
		this.user.inputQueue.length = 0;

		this.spawnFailed = this.globalfuncs.spawnCharacterForUser(this.user.gs, this.user);

		//if they spawned in when the round is starting up, don't allow them to move yet
		var c = this.user.gs.gom.getGameObjectByID(this.user.characterId);
		if(!this.spawnFailed && c !== null) {
			if(this.user.gs.theRound.getStateEnum() === GameConstants.RoundStates["STARTING"])
			{
				c.changeAllowLook(true);
				c.changeAllowMove(false);
				c.changeAllowFire(false);
				c.changeAllowAltFire(false);
			}
			
			//also register for an event for when the character dies
			this.characterDeactivatedHandleId = c.em.registerForEvent("character-deactivated", this.user.cbEventEmitted.bind(this.user));
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
						case "round-map-end":
							var c = this.user.gs.gom.getGameObjectByID(this.user.characterId);
							if(c !== null) {
								c.changeAllowLook(true);
								c.changeAllowMove(false);
								c.changeAllowFire(false);
								c.changeAllowAltFire(false);
							}
							break;
						case "round-started":
							//allow the user to move and shoot again
							var c = this.user.gs.gom.getGameObjectByID(this.user.characterId);
							if(c !== null) {
								c.changeAllowLook(true);
								c.changeAllowMove(true);
								c.changeAllowFire(true);
								c.changeAllowAltFire(true);
							}
							break;
						case "round-restarting":
							//kill the current character, and put user in respawning state
							this.user.gs.gameState.destroyOwnersCharacter(this.user.id, "user");
							this.user.determineRespawnState();
							break;
						case "character-deactivated":
							this.user.determineRespawnState();
							break;
						case "team-changed":
							this.user.gs.gameState.destroyOwnersCharacter(this.user.id, "user");
							this.user.determinePlayingState();
							break;
						case "class-changed":
							//kill the current character, and put user in respawning state
							//TODO: put in logic to save class selected in elimination mode, and respawning the user on the NEXT round (instead of immediately killing the character in the current round)
							this.user.gs.gameState.destroyOwnersCharacter(this.user.id, "user");
							this.user.determineRespawnState();
							break;
					}
				}

				this.user.playingEventQueue.length = 0;
			}
			
		}
		else {
			this.user.determineRespawnState();
		}
	}

	exit(dt) {
		//logger.log("info", this.stateName + ' exit');
		super.exit(dt);
		this.user.inputQueue.length = 0;

		var c = this.user.gs.gom.getGameObjectByID(this.user.characterId);
		if(c !== null)
		{
			c.em.unregisterForEvent("character-deactivated", this.characterDeactivatedHandleId);
		}

		this.user.characterId = null;
	}
}

exports.PlayingPlayingState = PlayingPlayingState;