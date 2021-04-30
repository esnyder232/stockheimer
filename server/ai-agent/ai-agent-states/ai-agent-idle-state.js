const AIAgentBaseState = require('./ai-agent-base-state.js');
const AIAgentSeekCastleState = require('./ai-agent-seek-castle-state.js');
const AIAgentSeekPlayerState = require('./ai-agent-seek-player-state.js');
const AIAgentAttackCastleState = require('./ai-agent-attack-castle-state.js');
const AIAgentAttackPlayerState = require('./ai-agent-attack-player-state.js');
const logger = require("../../../logger.js");

class AIAgentIdleState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-idle-state";
		this.checkTimer = 0;
		this.checkTimerInterval = 1000;	//ms
	}
	
	enter(dt) {
		//logger.log("info", this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;

		//stop the actor from moving
		this.aiAgent.insertStopInput();

		super.enter(dt);
	}

	update(dt) {
		//logger.log("info", this.stateName + ' update');

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
				// logger.log("info", "+++" + this.aiAgent.username + " LOS: ");
				// for(var i = 0; i < this.aiAgent.userCharactersInVision.length; i++)
				// {
				// 	var u = this.aiAgent.gs.um.getUserByID(this.aiAgent.userCharactersInVision[i].c.ownerId);
				// 	if(u !== null)
				// 	{
				// 		logger.log("info", "User: " + u.username + " LOS is: " + this.aiAgent.userCharactersInVision[i].isLOS);
				// 	}
				// }

				
				//flag to see if the castle exists
				var c = this.aiAgent.gs.castleObject;

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
				//if the castle exists, check whether to seek or attack the castle
				else if(c !== null)
				{
					this.aiAgent.updateCastleDistance();

					var isLOS = false;
					var isInAttackRange = false;
					
					//check if the castle is within attack range
					this.aiAgent.updateCastleDistance();
					
					if(this.aiAgent.castleDistanceSquared <= this.aiAgent.attackingRangeSquared)
					{
						isInAttackRange = true;
					}
		
					//if the target is within attack range, check to see if you have a LOS to them
					if(isInAttackRange) {
						var cpos = this.aiAgent.gs.castleObject.getPlanckPosition();
			
						if(cpos !== null)
						{
							isLOS = this.aiAgent.lineOfSightTest(this.aiAgent.characterPos, cpos);
						}
					}
		
					//make a decision if you can
					//if the castle is close enough to attack and you have LOS, attack teh castle
					if(isInAttackRange && isLOS)
					{
						this.aiAgent.nextState = new AIAgentAttackCastleState.AIAgentAttackCastleState(this.aiAgent);
					}
					//castle is too far away. Seek to it
					else
					{
						this.aiAgent.nextState = new AIAgentSeekCastleState.AIAgentSeekCastleState(this.aiAgent);
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