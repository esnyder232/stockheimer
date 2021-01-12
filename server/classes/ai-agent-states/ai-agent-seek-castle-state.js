const AIAgentBaseState = require('./ai-agent-base-state.js');
const AIAgentSeekPlayerState = require('./ai-agent-seek-player-state.js');
const AIAgentAttackCastleState = require('./ai-agent-attack-castle-state.js');
const AIAgentAttackPlayerState = require('./ai-agent-attack-player-state.js');
const AIAgentIdleState = require('./ai-agent-idle-state.js');

class AIAgentSeekCastleState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-seek-castle-state";
		this.checkTimer = 0;
		this.checkTimerInterval = 1000;
	}
	
	enter(dt) {
		//console.log(this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;

		this.aiAgent.nodePathToCastle = this.aiAgent.gs.activeNavGrid.getPathToCastle(Math.round(this.aiAgent.characterPos.x), -Math.round(this.aiAgent.characterPos.y));
		if(this.aiAgent.nodePathToCastle.length > 0)
		{
			this.aiAgent.currentNode = 0;
			this.aiAgent.findNextLOSNode(this.aiAgent.characterPos);
		}

		super.enter(dt);
	}

	update(dt) {
		//console.log(this.stateName + ' update');
		var inputChanged = false;
		var decisionMade = false;

		var finalInput = {
			up: false,
			down: false,
			left: false,
			right: false,
			isFiring: false,
			isFiringAlt: false,
			characterDirection: 0.0
		}


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
					decisionMade = true;
				}
				//otherwise, seek the player
				else
				{
					this.aiAgent.nextState = new AIAgentSeekPlayerState.AIAgentSeekPlayerState(this.aiAgent);
					decisionMade = true;
				}
			}

			this.checkTimer = 0;
		}

		//check if you have reached your current node
		if(!decisionMade && this.aiAgent.currentNode < this.aiAgent.nodePathToCastle.length && this.aiAgent.nodePathToCastle[this.aiAgent.currentNode])
		{
			var errorX = this.aiAgent.nodePathToCastle[this.aiAgent.currentNode].x - this.aiAgent.characterPos.x;
			var errorY = (this.aiAgent.nodePathToCastle[this.aiAgent.currentNode].y * -1) - this.aiAgent.characterPos.y;
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
		if(!decisionMade && this.aiAgent.currentNode < this.aiAgent.nodePathToCastle.length && this.aiAgent.nodePathToCastle[this.aiAgent.currentNode])
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

			if(Math.abs(finalVelVec.x) === 0 && Math.abs(finalVelVec.y) === 0)
			{
				finalVelVec.x = 1
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
		if(!decisionMade && inputChanged)
		{
			this.aiAgent.character.inputQueue.push(finalInput);
		}


		//flag to see if the castle exists
		var c = this.aiAgent.gs.castleObject;

		//if the castle exists, check if its close enough to attack
		if(c !== null)
		{
			this.aiAgent.updateCastleDistance();

			var isLOS = false;
			var isInAttackRange = false;
			
			//check if the castle is within attack range
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
			//if the castle is close enough to attack and you have LOS, attack the castle
			if(isInAttackRange && isLOS)
			{
				this.aiAgent.nextState = new AIAgentAttackCastleState.AIAgentAttackCastleState(this.aiAgent);
			}
		}
		//castle does not exist. Go to idle
		else
		{
			this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
		}


		//any state can be forced into the forced idle state with bForceIdle
		if(this.aiAgent.bForceIdle)
		{
			this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
		}

		super.update(dt);
	}

	exit(dt) {
		//console.log(this.stateName + ' exit');
		super.exit(dt);
		
		this.aiAgent.shimmyOveride = false;
		this.aiAgent.shimmyOverrideAccumulationValue = 0;
	}
}

exports.AIAgentSeekCastleState = AIAgentSeekCastleState;