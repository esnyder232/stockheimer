const AIAgentBaseState = require('./ai-agent-base-state.js');
const AIAgentSeekPlayerState = require('./ai-agent-seek-player-state.js');
const AIAgentAttackPlayerState = require('./ai-agent-attack-player-state.js');
const logger = require("../../../logger.js");

class AIAgentHealIdleState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-heal-idle-state";
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

			if(this.checkTimer >= this.checkTimerInterval) {
				var bFoundCharacterInLOS = false;

				//check if any ally is within vision
				if(this.aiAgent.allyCharactersInVision.length > 0) {
					//check if any player is within seeking range and is in LOS
					this.aiAgent.sortAllyCharactersInVision();

					//get the character with the highest hpDiff that is in LOS
					var closestLOSCharacterObject = null;
					for(var i = 0 ; i < this.aiAgent.allyCharactersInVision.length; i++) {
						var losResults = {};
						var cpos = this.aiAgent.allyCharactersInVision[i].c.getPlanckPosition();

						if(cpos !== null) {
							losResults = this.aiAgent.lineOfSightTest(this.aiAgent.characterPos, cpos);
						}

						if(losResults.isLOS) {
							closestLOSCharacterObject = this.aiAgent.allyCharactersInVision[i];
							break;
						}
					}

					//if there is a player within LOS, seek/heal the player
					if(closestLOSCharacterObject !== null) {
						bFoundCharacterInLOS = true;
						this.aiAgent.assignTargetCharacter(closestLOSCharacterObject.c);
						this.aiAgent.targetCharacterDistanceSquared = closestLOSCharacterObject.distanceSquared;

						//if the target is within attacking distance, attack the player.
						if(this.aiAgent.targetCharacterDistanceSquared <= this.aiAgent.attackingRangeSquared) {
							this.aiAgent.nextState = new AIAgentAttackPlayerState.AIAgentAttackPlayerState(this.aiAgent);
						}
						//otherwise, seek the player
						else {
							this.aiAgent.nextState = new AIAgentSeekPlayerState.AIAgentSeekPlayerState(this.aiAgent);
						}
					}
				}

				//if a character was not found in LOS, then seek the closest ally in general
				if(!bFoundCharacterInLOS) {
					var ally = this.aiAgent.findAllyToHeal();

					if(ally !== null) {
						this.aiAgent.assignTargetCharacter(ally.c);
						this.aiAgent.targetCharacterDistanceSquared = ally.distanceSquared;

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

exports.AIAgentHealIdleState = AIAgentHealIdleState;