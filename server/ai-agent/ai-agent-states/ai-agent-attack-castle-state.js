const AIAgentBaseState = require('./ai-agent-base-state.js');
// const AIAgentSeekCastleState = require('./ai-agent-seek-castle-state.js');
const AIAgentIdleState = require('./ai-agent-idle-state.js');
const logger = require("../../../logger.js");

class AIAgentAttackCastleState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-attack-castle-state";
		this.checkTimer = 0;
		this.checkTimerInterval = 1000;	//ms
	}
	
	enter(dt) {
		//logger.log("info", this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;
		super.enter(dt);
	}

	update(dt) {
		//logger.log("info", this.stateName + ' update');
		super.update(dt);

		var c = this.aiAgent.gs.castleObject;

		if(c !== null)
		{
			var finalInput = {
				up: false,
				down: false,
				left: false,
				right: false,
				isFiring: false,
				isFiringAlt: false,
				characterDirection: this.aiAgent.angle
			}
			var inputChanged = false;
	
			//fire a bullet
			if(this.aiAgent.isAttackCurrentTimer <= 0)
			{
				var targetCharacterPos = null;
				targetCharacterPos = c.getPlanckPosition();
	
				//NOW fire a bullet
				if(this.aiAgent.characterPos !== null && targetCharacterPos !== null)
				{
					//calculate angle
					var dx = targetCharacterPos.x - this.aiAgent.characterPos.x;
					var dy = targetCharacterPos.y - this.aiAgent.characterPos.y;
					
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
					finalInput.characterDirection = this.aiAgent.angle;
					inputChanged = true;
					
					this.aiAgent.isAttackCurrentTimer = this.aiAgent.isAttackInterval;
				}
			}
	
			if(this.aiAgent.isAttackCurrentTimer > 0)
			{
				this.aiAgent.isAttackCurrentTimer -= dt;
				if(this.aiAgent.isAttackCurrentTimer <= 0)
				{
					finalInput.isFiring = false;
					inputChanged = true;
				}
			}
	
			//input the finalInput to the character
			if(inputChanged)
			{
				this.aiAgent.character.inputQueue.push(finalInput);
			}
	
	
			this.checkTimer += dt;
			var isLOS = false;
			var isInAttackRange = false;
			
			//check if current target is still in LOS. If not, switch to seeking
			if(this.checkTimer >= this.checkTimerInterval)
			{
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
				//if the castle is not in attacking range and you don't have LOS, switch to seeking castle
				// if(!(isInAttackRange && isLOS))
				// {
				// 	this.aiAgent.nextState = new AIAgentSeekCastleState.AIAgentSeekCastleState(this.aiAgent);
				// }
	
				this.checkTimer = 0;
			}
		}
		//castle does not exist. go back to idle.
		else
		{
			this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
		}


		//any state can be forced into the forced idle state with bForceIdle
		if(this.aiAgent.bForceIdle)
		{
			this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
		}

		this.aiAgent.processPlayingEvents();
	}

	exit(dt) {
		//logger.log("info", this.stateName + ' exit');
		super.exit(dt);
	}
}

exports.AIAgentAttackCastleState = AIAgentAttackCastleState;