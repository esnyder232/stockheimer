const AIAgentBaseState = require('./ai-agent-base-state.js');
const AIAgentAttackPlayerState = require('./ai-agent-attack-player-state.js');
const AIAgentIdleState = require('./ai-agent-idle-state.js');
const AIAgentHealIdleState = require('./ai-agent-heal-idle-state.js');
const logger = require("../../../logger.js");

class AIAgentSeekPlayerState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-seek-player-state";
		this.pathValid = false;
		this.checkTimer = 0;
		this.checkTimerInterval = 500;	//ms
		this.prevAltFireInput = false;
	}
	
	enter(dt) {
		//logger.log("info", this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;
		this.aiAgent.nodePathToCastle = [];
		super.enter(dt);
	}

	update(dt) {
		//logger.log("info", this.stateName + ' update');
		super.update(dt);

		var decisionMade = false;
		var losResults = {};
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

			//if the lowestHpAlly's hpDiff is actually 0, that means everyone around the healer is fully healed. Continue seeking to target character and ignore people around you.
			//Generally, this happens at the beginning of the round, and there are 2 or more healers stuck at spawn healing eachother.
			if(lowestHpAlly !== null && lowestHpAlly.hpDiff === 0) {
				lowestHpAlly = null;
			}

			if(lowestHpAlly !== null) {
				this.aiAgent.assignTargetCharacter(lowestHpAlly.c);
			}
		}


		//every so often, make checks on the current status of the ai to the target
		if(!decisionMade && this.checkTimer >= this.checkTimerInterval)
		{
			//check if the target is in attack range
			this.aiAgent.updateTargetCharacterDistance();
			
			if(this.aiAgent.targetCharacterDistanceSquared <= this.aiAgent.attackingRangeSquared)
			{
				isInAttackRange = true;
			}

			//check to see if you have a LOS to them
			var cpos = this.aiAgent.targetCharacter.getPlanckPosition();

			if(cpos !== null)
			{
				losResults = this.aiAgent.lineOfSightTest(this.aiAgent.characterPos, cpos);
			}

			//make a decision if you can
			//if the player is within attacking distance and you have LOS, switch to attacking.
			if(isInAttackRange && losResults.isLOS)
			{
				this.aiAgent.insertStopInput();
				this.aiAgent.nextState = new AIAgentAttackPlayerState.AIAgentAttackPlayerState(this.aiAgent);
				decisionMade = true;
			}
			//if the player is NOT within attacking distance, but you have LOS and the path is unobstructed, keep seeking to the player, but change the nodes to where they are currently located
			//IOW, move in a straight line to the target.
			else if (!isInAttackRange && losResults.isLOS && losResults.pathUnobstructed)
			{
				this.aiAgent.findStraightPathToPlayer();
				// decisionMade = true;
			}
			//if the user doesn't even have LOS, find the player with A*
			else {
				this.aiAgent.findaStarPathToPlayer();
			}

			this.checkTimer = 0;
		}




		//if you currently have a path to travel on, keep traveling on it
		if(this.aiAgent.nodePathToCastle.length > 0) {


			//check if you have reached your current node
			if(this.aiAgent.currentNode < this.aiAgent.nodePathToCastle.length && this.aiAgent.nodePathToCastle[this.aiAgent.currentNode])
			{
				var errorX = this.aiAgent.nodePathToCastle[this.aiAgent.currentNode].xPlanck - this.aiAgent.characterPos.x;
				var errorY = (this.aiAgent.nodePathToCastle[this.aiAgent.currentNode].yPlanck * -1) - this.aiAgent.characterPos.y;
				var squaredDistance = errorX * errorX + errorY * errorY;

				//if you have reached your current node
				if(squaredDistance <= this.aiAgent.nodeRadiusSquared)
				{
					this.aiAgent.currentNode++;

					//find the next node in the line of sight
					this.aiAgent.findNextLOSNode(this.aiAgent.characterPos);
					
					//destination reached
					if(this.aiAgent.currentNode > this.aiAgent.nodePathToCastle.length-1)
					{
						//stop the character
						finalInput.up = false;
						finalInput.down = false;
						finalInput.left = false;
						finalInput.right = false;
						inputChanged = true;
					}
				}
			}
			
			//navigate to the current node if there are any left
			if(this.aiAgent.currentNode < this.aiAgent.nodePathToCastle.length && this.aiAgent.nodePathToCastle[this.aiAgent.currentNode])
			{
				var seekVelVec = {
					x: 0,
					y: 0,
				}
				var finalVelVec = {
					x: 0,
					y: 0
				};

				//engage shimmy steering
				if(this.aiAgent.shimmyOveride)
				{
					seekVelVec.x = this.aiAgent.shimmyDirection.x;
					seekVelVec.y = this.aiAgent.shimmyDirection.y;
					this.aiAgent.shimmyCurrentTimer -= dt;

					//turn off shimmy mode
					if(this.aiAgent.shimmyCurrentTimer <= 0)
					{
						//logger.log("info", 'shimm mode disengaged!');
						this.aiAgent.shimmyOveride = false;
						this.aiAgent.findNextLOSNode(this.aiAgent.characterPos);
					}
				}
				//steer like normal
				else
				{
					seekVelVec = this.aiAgent.calcSeekSteering(this.aiAgent.characterPos);
				}
				
				finalVelVec.x = seekVelVec.x;
				finalVelVec.y = seekVelVec.y;

				if(Math.abs(finalVelVec.x) === 0 && Math.abs(finalVelVec.y) === 0)
				{
					finalVelVec.x = 1;
				}

				//the *-1 is to flip the y coordinates for planck cooridnate plane
				var angle = Math.atan((finalVelVec.y) / finalVelVec.x);
				
				//this is added to the end if we need to travel quadrant 2 or 3 of the unit circle...best comment ever.
				//this basically just flips the direction of the x and y
				var radiansToAdd = finalVelVec.x < 0 ? Math.PI : 0;

				angle += radiansToAdd;

				//determine the direction: N, E, S, W
				//hackilicous
				var xAngle = Math.cos(angle);
				var yAngle = Math.sin(angle);

				if(xAngle >= 0.5)
				{
					finalInput.right = true;
					inputChanged = true;
				}
				else if (xAngle <= -0.5)
				{
					finalInput.left = true;
					inputChanged = true;
				}

				if(yAngle >= 0.5)
				{
					finalInput.up = true;
					inputChanged = true;
				}
				else if (yAngle <= -0.5)
				{
					finalInput.down = true;
					inputChanged = true;
				}



				//check position from prev position. If you haven't moved in a while, add to the shimmy accumulator
				if(!this.aiAgent.shimmyOveride)
				{
					var dx = Math.abs(this.aiAgent.agentPrevPosition.x - this.aiAgent.characterPos.x);
					var dy = Math.abs(this.aiAgent.agentPrevPosition.y - this.aiAgent.characterPos.y);
					
					if(dx < 0.01 && dy < 0.01)
					{
						this.aiAgent.shimmyOverrideAccumulationValue += 1;
					}

					//engage shimmy mode
					if(this.aiAgent.shimmyOverrideAccumulationValue >= this.aiAgent.shimmyOverrideAccumulationThreshold)
					{
						//logger.log("info", 'shimm mode engaged!');
						this.aiAgent.shimmyOveride = true;
						this.aiAgent.shimmyOverrideAccumulationValue = 0;

						var randAngleMultiplier = Math.floor(Math.random() * 2) + 1;
						var randAngleDir = Math.floor(Math.random() * 2) === 0 ? 1 : -1;
						var randShimmyTimeLength = Math.floor(Math.random() * this.aiAgent.shimmyTimeLengthVariance);

						var shimmyAngle = (randAngleMultiplier * Math.PI/4) * randAngleDir;
						this.aiAgent.shimmyDirection.x = Math.cos(angle + shimmyAngle);
						this.aiAgent.shimmyDirection.y = Math.sin(angle + shimmyAngle);
						this.aiAgent.shimmyCurrentTimer = this.aiAgent.shimmyTimeLength + randShimmyTimeLength;
					}
				}

				this.aiAgent.agentPrevPosition.x = this.aiAgent.characterPos.x;
				this.aiAgent.agentPrevPosition.y = this.aiAgent.characterPos.y;
			}


		}

		this.aiAgent.isAttackCurrentTimer -= dt;

		//fire a bullet
		if(!decisionMade && losResults.isLOS && this.aiAgent.isAttackCurrentTimer <= 0)
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

		this.aiAgent.shimmyOveride = false;
		this.aiAgent.shimmyOverrideAccumulationValue = 0;
		this.aiAgent.nodePathToCastle = [];
	}

}







exports.AIAgentSeekPlayerState = AIAgentSeekPlayerState;