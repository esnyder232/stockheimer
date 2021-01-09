const AIAgentBaseState = require('./ai-agent-base-state.js');
const AIAgentSeekCastleState = require('./ai-agent-seek-castle-state.js');
const AIAgentAttackPlayerState = require('./ai-agent-attack-player-state.js');
const AIAgentIdleState = require('./ai-agent-idle-state.js');

class AIAgentSeekPlayerState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-seek-player-state";
		this.pathValid = false;
		this.checkTimer = 0;
		this.checkTimerInterval = 1000;	//ms
	}
	
	enter(dt) {
		//console.log(this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;
		super.enter(dt);

		//find path to target
		this.findaStarPathToPlayer();
	}

	update(dt) {
		//console.log(this.stateName + ' update');
		super.update(dt);

		this.checkTimer += dt;
		var decisionMade = false;
		var isLOS = false;
		var isInSeekRange = false;
		var isInAttackRange = false;
		var isCurrentNodeReached = false;

		//checks for when traveling to the current node:
		//if the target is within seek range and comes into LOS again AND is within attacking distance, stop seeking and start attacking
		if(this.pathValid && this.checkTimer >= this.checkTimerInterval)
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

			//check to see if you have a LOS to them
			var cpos = this.aiAgent.targetCharacter.getPlanckPosition();

			if(cpos !== null)
			{
				isLOS = this.aiAgent.lineOfSightTest(this.aiAgent.characterPos, cpos);
			}

			//make a decision if you can
			//if the player is within attacking distance and you have LOS, switch to attacking.
			if(isInSeekRange && isInAttackRange && isLOS)
			{
				this.aiAgent.insertStopInput();
				this.aiAgent.nextState = new AIAgentAttackPlayerState.AIAgentAttackPlayerState(this.aiAgent);
				decisionMade = true;
			}
			//if the player is NOT within attacking distance, but you have LOS, keep seeking to the player, but change the nodes to where they are currently located
			else if (isInSeekRange && !isInAttackRange && isLOS)
			{
				this.findStraightPathToPlayer();
				decisionMade = true;
			}

			this.checkTimer = 0;
		}


		//moves toward current node (copied from castle seeking state....will be refactored later obviously)
		if(this.pathValid && !decisionMade)
		{
			var inputChanged = false;

			var finalInput = {
				up: false,
				down: false,
				left: false,
				right: false,
				isFiring: false,
				isFiringAlt: false,
				characterDirection: 0.0
			}

			//check if you have reached your current node
			if(this.aiAgent.currentNode < this.aiAgent.nodePathToCastle.length && this.aiAgent.nodePathToCastle[this.aiAgent.currentNode])
			{
				var errorX = this.aiAgent.nodePathToCastle[this.aiAgent.currentNode].x - this.aiAgent.characterPos.x;
				var errorY = (this.aiAgent.nodePathToCastle[this.aiAgent.currentNode].y * -1) - this.aiAgent.characterPos.y;
				var squaredDistance = errorX * errorX + errorY * errorY;

				//if you have reached your current node
				if(squaredDistance <= this.aiAgent.nodeRadiusSquared)
				{
					isCurrentNodeReached = true;
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
						//console.log('shimm mode disengaged!');
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
						//console.log('shimm mode engaged!');
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
			
			//input the finalInput to the character
			if(inputChanged)
			{
				this.aiAgent.character.inputQueue.push(finalInput);
			}
		}

		//checks for when REACHING the current node
		if(this.pathValid && !decisionMade && isCurrentNodeReached)
		{
			//make all these checks again (these may not have occured this frame)
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
			var cpos = this.aiAgent.targetCharacter.getPlanckPosition();

			if(cpos !== null)
			{
				isLOS = this.aiAgent.lineOfSightTest(this.aiAgent.characterPos, cpos);
			}
		

			//make a decision if you can
			//if the player is simply not in seeking distance anymore, switch to idle
			if(!isInSeekRange)
			{
				this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
			}
			//if the player is still within seeking distance, and you have LOS and is within attack range, switch to attacking
			else if(isInSeekRange && isLOS && isInAttackRange)
			{
				this.aiAgent.nextState = new AIAgentAttackPlayerState.AIAgentAttackPlayerState(this.aiAgent);
			}
			//if the player is still within seeking distance, and you have LOS, but the the player is NOT within attack range, find path straight to the player
			else if(isInSeekRange && isLOS && !isInAttackRange)
			{
				this.findStraightPathToPlayer();
			}
			//if the player is still within seeking distance, but you do NOT have LOS or the player is NOT within attack range, find a new path to the player
			else if(isInSeekRange && !(isLOS && isInAttackRange))
			{
				this.findaStarPathToPlayer();
			}
		}

		//just incase anything goes wrong.
		if(!this.pathValid)
		{
			console.log('Path is invalid. Switching back to idle.');
			this.aiAgent.targetCharacter = null;
			this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
		}

		//any state can be forced into the forced idle state with bForceIdle
		if(this.aiAgent.bForceIdle)
		{
			this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
		}
	}

	exit(dt) {
		//console.log(this.stateName + ' exit');
		super.exit(dt);

		this.aiAgent.shimmyOveride = false;
		this.aiAgent.shimmyOverrideAccumulationValue = 0;
	}

	findaStarPathToPlayer() {
		//contact the nav grid to get a path
		var aiPos = this.aiAgent.characterPos;
		var userPos = this.aiAgent.targetCharacter.getPlanckPosition();

		if(aiPos !== null && userPos !== null)
		{
			var aiNode = this.aiAgent.gs.activeNavGrid.getNode(Math.round(aiPos.x), -Math.round(aiPos.y));
			var userNode = this.aiAgent.gs.activeNavGrid.getNode(Math.round(userPos.x), -Math.round(userPos.y));

			if(aiNode !== null && userNode !== null)
			{
				this.aiAgent.nodePathToCastle = this.aiAgent.gs.activeNavGrid.AStarSearch(aiNode, userNode);
				
				if(this.aiAgent.nodePathToCastle.length > 0)
				{
					this.aiAgent.currentNode = 0;

					this.aiAgent.findNextLOSNode(aiPos);
					this.pathValid = true;
				}
			}
		}
	}

	//this is already assuming the ai has LOS to the player
	findStraightPathToPlayer() {
		var aiPos = this.aiAgent.characterPos;
		var userPos = this.aiAgent.targetCharacter.getPlanckPosition();

		this.pathValid = false;
		this.aiAgent.currentNode = 0;

		if(aiPos !== null && userPos !== null)
		{
			var aiNode = this.aiAgent.gs.activeNavGrid.getNode(Math.round(aiPos.x), -Math.round(aiPos.y));
			var userNode = this.aiAgent.gs.activeNavGrid.getNode(Math.round(userPos.x), -Math.round(userPos.y));

			if(aiNode !== null && userNode !== null)
			{
				this.aiAgent.nodePathToCastle = [];
				this.aiAgent.nodePathToCastle.push(userNode);

				this.aiAgent.currentNode = 0;
				this.pathValid = true;
			}
		}
	}
}

exports.AIAgentSeekPlayerState = AIAgentSeekPlayerState;