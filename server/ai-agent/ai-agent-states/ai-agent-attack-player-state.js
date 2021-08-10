const AIAgentBaseState = require('./ai-agent-base-state.js');
const AIAgentSeekPlayerState = require('./ai-agent-seek-player-state.js');
const AIAgentIdleState = require('./ai-agent-idle-state.js');
const AIAgentHealIdleState = require('./ai-agent-heal-idle-state.js');
const logger = require("../../../logger.js");

class AIAgentAttackPlayerState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-attack-player-state";
		this.checkTimer = 0;
		this.checkTimerInterval = 500;	//ms
	}
	
	enter(dt) {
		//logger.log("info", this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;
		super.enter(dt);
	}

	update(dt) {
		//logger.log("info", this.stateName + ' update');
		super.update(dt);

		var decisionMade = false;
		var isLOS = false;
		var isInAttackRange = false;
		var inputChanged = false;


		var finalInput = {
			up: false,
			down: false,
			left: false,
			right: false,
			isFiring: false,
			isFiringAlt: false,
			characterDirection: this.aiAgent.angle
		}
		
		this.checkTimer += dt;	


		//any state can be forced into the forced idle state with bForceIdle
		if(this.aiAgent.bForceIdle) {
			if(this.aiAgent.characterRole === "heal") {
				this.aiAgent.nextState = new AIAgentHealIdleState.AIAgentHealIdleState(this.aiAgent);
			} else {
				this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
			}
			
			decisionMade = true;
		}

		//if you currently do not have a target (either the player was killed/disconnected/whatever), switch back to idle mode
		if(!decisionMade && this.aiAgent.targetCharacter === null) {
			if(this.aiAgent.characterRole === "heal") {
				this.aiAgent.nextState = new AIAgentHealIdleState.AIAgentHealIdleState(this.aiAgent);
			} else {
				this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
			}
			
			decisionMade = true;
		}

		


		//hacky as shit. if your healing, check your current allies and switch targets to the lowest hp
		if(!decisionMade && this.aiAgent.characterRole === "heal" && this.checkTimer >= this.checkTimerInterval) {
			this.aiAgent.sortAllyCharactersInVision();
			var lowestHpAlly = null;
			if(this.aiAgent.allyCharactersInVision.length > 0) {
				lowestHpAlly = this.aiAgent.allyCharactersInVision[0];
			}

			//if the lowestHpAlly's hpDiff is actually 0, that means everyone around the healer is fully healed. The healer needs to find a new target in this case.
			//Generally, this happens at the beginning of the round, and there are 2 or more healers stuck at spawn healing eachother.
			if(lowestHpAlly !== null && lowestHpAlly.hpDiff === 0) {
				lowestHpAlly =  this.aiAgent.findAllyToHeal();
			}

			if(lowestHpAlly !== null) {
				// console.log("--- lowesthpAlly detected. assigning target to character with ownerId " + lowestHpAlly.c.ownerId);
				this.aiAgent.assignTargetCharacter(lowestHpAlly.c);
			}
		}



		
		//every so often, make checks on the current status of the ai to the target
		if(!decisionMade && this.checkTimer >= this.checkTimerInterval) {
			//check if they are within attack range
			this.aiAgent.updateTargetCharacterDistance();
			
			if(this.aiAgent.targetCharacterDistanceSquared <= this.aiAgent.attackingRangeSquared) {
				isInAttackRange = true;
			}
		

			//if the target is within attack range, check to see if you have a LOS to them
			if(isInAttackRange) {
				var cpos = this.aiAgent.targetCharacter.getPlanckPosition();
	
				if(cpos !== null) {
					isLOS = this.aiAgent.lineOfSightTest(this.aiAgent.characterPos, cpos);
				}
			}

			//make a decision if you can			
			//if the player is not within attacking distance or you lose LOS, switch to seek player
			else if(!(isInAttackRange && isLOS)) {
				this.aiAgent.nextState = new AIAgentSeekPlayerState.AIAgentSeekPlayerState(this.aiAgent);
				decisionMade = true;
			}

			this.checkTimer = 0;
		}




		//put straffing here if you feel like it


		
		this.aiAgent.isAttackCurrentTimer -= dt;
		

		//fire a bullet
		if(!decisionMade && this.aiAgent.isAttackCurrentTimer <= 0)
		{
			var targetCharacterPos = null;
			targetCharacterPos = this.aiAgent.targetCharacter.getPlanckPosition();

			//NOW fire a bullet
			if(this.aiAgent.characterPos !== null && targetCharacterPos !== null)
			{
				//calculate angle
				var dx = targetCharacterPos.x - this.aiAgent.characterPos.x;
				var dy = targetCharacterPos.y - this.aiAgent.characterPos.y;

				//hack to make sure the entire server doesn't crash because 0/0 is NaN
				if(Math.abs(dx) === 0 && Math.abs(dy) === 0)
				{
					dx = 1
				}
				this.aiAgent.angle = Math.atan(-dy / dx);
				
				//this is added to the end if we need to travel quadrant 2 or 3 of the unit circle...best comment ever.
				//this basically just flips the direction of the x and y
				var radiansToAdd = dx < 0 ? Math.PI : 0;

				this.aiAgent.angle += radiansToAdd;

				finalInput.isFiring = true;

				//randomly fire the alt
				var rand = Math.random();
				if(rand >= 0.80) {
					finalInput.isFiringAlt = true;
				}
								
				finalInput.characterDirection = this.aiAgent.angle;
				inputChanged = true;
				
				this.aiAgent.isAttackCurrentTimer = this.aiAgent.isAttackInterval;
			}
		}


		//input the finalInput to the character
		this.aiAgent.user.inputQueue.push(finalInput);


		this.aiAgent.processPlayingEvents();
	}

	exit(dt) {
		//logger.log("info", this.stateName + ' exit');
		super.exit(dt);
	}
}








exports.AIAgentAttackPlayerState = AIAgentAttackPlayerState;