const AIAgentBaseState = require('./ai-agent-base-state.js');
const AIAgentSeekCastleState = require('./ai-agent-seek-castle-state.js');
const AIAgentSeekPlayerState = require('./ai-agent-seek-player-state.js');
const AIAgentIdleState = require('./ai-agent-idle-state.js');
const logger = require("../../../logger.js");

class AIAgentAttackPlayerState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-attack-player-state";
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

		var finalInput = {
			up: false,
			down: false,
			left: false,
			right: false,
			isFiring: false,
			isFiringAlt: false,
			characterDirection: 0.0
		}
		var inputChanged = false;


		//put straffing here if you feel like it

		//fire a bullet
		if(this.aiAgent.isAttackCurrentTimer <= 0)
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
				var angle = Math.atan(-dy / dx);
				
				//this is added to the end if we need to travel quadrant 2 or 3 of the unit circle...best comment ever.
				//this basically just flips the direction of the x and y
				var radiansToAdd = dx < 0 ? Math.PI : 0;

				angle += radiansToAdd;

				finalInput.isFiring = true;
				finalInput.characterDirection = angle;
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
		var isInSeekRange = false;
		var isInAttackRange = false;
		
		//check if current target is still in LOS. If not, switch to seeking
		if(this.checkTimer >= this.checkTimerInterval)
		{
			var temp = this.aiAgent.userCharactersInVision.find((x) => {return x.c.id == this.aiAgent.targetCharacter.id;});
			if(temp !== undefined)
			{
				isInSeekRange = true;
			}
			
			//if target is within seeking range, check if they are within attack range
			if(isInSeekRange)
			{
				this.aiAgent.updateTargetCharacterDistance();
				
				if(this.aiAgent.targetCharacterDistanceSquared <= this.aiAgent.attackingRangeSquared)
				{
					isInAttackRange = true;
				}
			}

			//if the target is within attack range, check to see if you have a LOS to them
			if(isInAttackRange) {
				var cpos = this.aiAgent.targetCharacter.getPlanckPosition();
	
				if(cpos !== null)
				{
					isLOS = this.aiAgent.lineOfSightTest(this.aiAgent.characterPos, cpos);
				}
			}

			//make a decision if you can
			//if the player is simply not in seeking distance anymore, switch to idle
			if(!isInSeekRange)
			{
				this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
			}
			//if the player is not within attacking distance or you lose LOS, switch to seek player
			else if(isInSeekRange && !(isInAttackRange && isLOS))
			{
				this.aiAgent.nextState = new AIAgentSeekPlayerState.AIAgentSeekPlayerState(this.aiAgent);
			}

			this.checkTimer = 0;
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

exports.AIAgentAttackPlayerState = AIAgentAttackPlayerState;