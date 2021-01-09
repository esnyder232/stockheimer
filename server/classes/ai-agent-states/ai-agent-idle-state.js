const AIAgentBaseState = require('./ai-agent-base-state.js');
const AIAgentSeekCastleState = require('./ai-agent-seek-castle-state.js');
const AIAgentSeekPlayerState = require('./ai-agent-seek-player-state.js');
const AIAgentAttackPlayerState = require('./ai-agent-attack-player-state.js');

class AIAgentIdleState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-idle-state";
		this.checkTimer = 0;
		this.checkTimerInterval = 1000;	//ms
	}
	
	enter(dt) {
		//console.log(this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;

		//stop the actor from moving
		this.aiAgent.insertStopInput();

		super.enter(dt);
	}

	update(dt) {
		//console.log(this.stateName + ' update');

		if(!this.aiAgent.bForceIdle)
		{

			this.checkTimer += dt;

			//check for "attacked by player" event here, and go to seek player state

			if(this.checkTimer >= this.checkTimerInterval)
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
				// console.log("+++" + this.aiAgent.username + " LOS: ");
				// for(var i = 0; i < this.aiAgent.userCharactersInVision.length; i++)
				// {
				// 	var u = this.aiAgent.gs.um.getUserByID(this.aiAgent.userCharactersInVision[i].c.ownerId);
				// 	if(u !== null)
				// 	{
				// 		console.log("User: " + u.username + " LOS is: " + this.aiAgent.userCharactersInVision[i].isLOS);
				// 	}
				// }


				//if there is a player within LOS, seek/attack the player
				if(closestLOSCharacterObject !== null)
				{
					this.aiAgent.targetCharacter = closestLOSCharacterObject.c;
					this.aiAgent.targetCharacterDistanceSquared = closestLOSCharacterObject.distanceSquared;

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
				//else, just seek the castle
				else
				{
					this.aiAgent.nextState = new AIAgentSeekCastleState.AIAgentSeekCastleState(this.aiAgent);
				}

				this.checkTimer = 0;
			}

		}
		super.update(dt);
	}

	exit(dt) {
		//console.log(this.stateName + ' exit');
		super.exit(dt);
		this.aiAgent.bForceIdle = false;
	}
}

exports.AIAgentIdleState = AIAgentIdleState;