const AIAgentBaseState = require('./ai-agent-base-state.js');
// const AIAgentSeekCastleState = require('./ai-agent-seek-castle-state.js');
const AIAgentSeekPlayerState = require('./ai-agent-seek-player-state.js');
// const AIAgentAttackCastleState = require('./ai-agent-attack-castle-state.js');
const AIAgentAttackPlayerState = require('./ai-agent-attack-player-state.js');
const logger = require("../../../logger.js");

class AIAgentIdleState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-idle-state";
		this.checkTimer = 0;
		this.checkTimerInterval = 500;	//ms
	}
	
	enter(dt) {
		//logger.log("info", this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;

		//stop the actor from moving
		this.aiAgent.insertStopInput();
		this.aiAgent.assignTargetCharacter(null);
		super.enter(dt);
	}

	update(dt) {
		//logger.log("info", this.stateName + ' update');

		if(!this.aiAgent.bForceIdle) {
			this.checkTimer += dt;

			//check for "attacked by player" event here, and go to seek player state

			if(this.checkTimer >= this.checkTimerInterval)
			{
				var bFoundCharacterInLOS = false;
				//check if any player is within vision
				if(this.aiAgent.userCharactersInVision.length > 0)
				{
					//check if any player is within seeking range and is in LOS
					this.aiAgent.sortUserCharactersInVision();

					//get the closest person that is in LOS
					var closestLOSCharacterObject = null;
					for(var i = 0 ; i < this.aiAgent.userCharactersInVision.length; i++)
					{
						var isLOS = false;
						var cpos = this.aiAgent.userCharactersInVision[i].c.getPlanckPosition();

						if(cpos !== null)
						{
							isLOS = this.aiAgent.lineOfSightTest(this.aiAgent.characterPos, cpos);
						}

						if(isLOS)
						{
							closestLOSCharacterObject = this.aiAgent.userCharactersInVision[i];
							break;
						}

						//debugging
						//this.aiAgent.userCharactersInVision[i].isLOS;
					}

					// //debug
					// logger.log("info", "+++" + this.aiAgent.username + " LOS: ");
					// for(var i = 0; i < this.aiAgent.userCharactersInVision.length; i++)
					// {
					// 	var u = this.aiAgent.gs.um.getUserByID(this.aiAgent.userCharactersInVision[i].c.ownerId);
					// 	if(u !== null)
					// 	{
					// 		logger.log("info", "User: " + u.username + " LOS is: " + this.aiAgent.userCharactersInVision[i].isLOS);
					// 	}
					// }

					//if there is a player within LOS, seek/attack the player
					if(closestLOSCharacterObject !== null)
					{
						bFoundCharacterInLOS = true;
						this.aiAgent.assignTargetCharacter(closestLOSCharacterObject.c);
						this.aiAgent.targetCharacterDistanceSquared = closestLOSCharacterObject.distanceSquared;

						//console.log('found target by LOS: ' + this.aiAgent.targetCharacter.id);

						//if the target is within attacking distance, attack the player.
						if(this.aiAgent.targetCharacterDistanceSquared <= this.aiAgent.attackingRangeSquared)
						{
							this.aiAgent.nextState = new AIAgentAttackPlayerState.AIAgentAttackPlayerState(this.aiAgent);
						}
						//otherwise, seek the player
						else
						{
							this.aiAgent.nextState = new AIAgentSeekPlayerState.AIAgentSeekPlayerState(this.aiAgent);
						}
					}
				}

				//if a character was not found in LOS, then seek the closest player in general
				if(!bFoundCharacterInLOS) {
					var nearestOpponent = this.aiAgent.findNearestOpponentTrueDistance();

					if(nearestOpponent !== null) {

						this.aiAgent.assignTargetCharacter(nearestOpponent.character);
						this.aiAgent.targetCharacterDistanceSquared = nearestOpponent.distanceSquared;

						//console.log('found target by NEAREST OPPONENT: ' + this.aiAgent.targetCharacter.id);

						//if the target is within attacking distance, attack the player.
						if(this.aiAgent.targetCharacterDistanceSquared <= this.aiAgent.attackingRangeSquared)
						{
							this.aiAgent.nextState = new AIAgentAttackPlayerState.AIAgentAttackPlayerState(this.aiAgent);
						}
						//otherwise, seek the player
						else
						{
							this.aiAgent.nextState = new AIAgentSeekPlayerState.AIAgentSeekPlayerState(this.aiAgent);
						}
					}
				}
				
				//otherwise, just do nothing (stay idle)
				this.checkTimer = 0;
			}

		}
		super.update(dt);

		this.aiAgent.processPlayingEvents();
	}

	exit(dt) {
		//logger.log("info", this.stateName + ' exit');
		super.exit(dt);
		this.aiAgent.bForceIdle = false;
	}
}

exports.AIAgentIdleState = AIAgentIdleState;