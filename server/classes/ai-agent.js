const {GlobalFuncs} = require('../global-funcs.js');

//This class keeps track of nodes and edges for a particular tilemap. It also holds the functions for the actual pathing (breadth first/A*/ect).
class AIAgent {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = null;
		this.characterId = null;

		this.username = "";
		this.pathSet = false;
		this.nodePathToCastle = [];
		this.currentNode = 0;
		this.followPath = false;
		
		this.currentNodeReached = false;
		this.nodeRadiusSquared = 0.01; //radius to determine if the character has reached its current node

		this.shimmyOveride = false;		//this tells the ai to shimmy to the left or right of their intended direction (in case there is an obstacle in the way)
		this.shimmyCurrentTimer = 0;	//current time to shimmy left or right
		this.shimmyTimeLength = 300;	//ms to follow shimmy velocity direction
		this.shimmyTimeLengthVariance = 300; //+-ms variance to shimmyTimeLength
		this.shimmyDirection = {
			x: 0,
			y: 0
		};
		this.shimmyOverrideAccumulationValue = 0; //basically, number of frames the entity hasn't moved
		this.shimmyOverrideAccumulationThreshold = 5; //number of frames to determine if the shimmyOverride should be engaged.
		this.agentPrevPosition = {
			x: 0,
			y: 0
		}

		this.attackTarget = false;
		this.targetCharacterIdToAttack = null;

		this.charactersInVision = [];
		this.isAttackInterval = 1000; //ms
		this.isAttackCurrentTimer = 0; //ms
	}

	aiAgentInit(gameServer, characterId) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
		this.characterId = characterId

		this.username = "AI " + this.id;
	}

	characterEnteredVision(characterId) {
		if(characterId !== this.characterId && !this.charactersInVision.includes(characterId))
		{
			this.charactersInVision.push(characterId);

			//check if target is a user. If so, attack him.
			if(this.targetCharacterIdToAttack === null)
			{
				var c = this.gs.gom.getGameObjectByID(characterId);
				if(c !== null && c.ownerType === 'user')
				{
					this.attackTarget = true;
					this.targetCharacterIdToAttack = characterId;
				}
			}
		}
	}

	characterExitedVision(characterId) {
		if(this.charactersInVision.includes(characterId))
		{
			var i = this.charactersInVision.findIndex((x) => {return x === characterId});
			if(i >= 0)
			{
				this.charactersInVision.splice(i, 1);

				//if the target was the currently attacked target, scan if there are other characters to attack. If not, turn attacking off.
				if(this.targetCharacterIdToAttack === characterId)
				{
					var nextUser = this.charactersInVision.find((x) => {
						var c = this.gs.gom.getGameObjectByID(x);
						if(c !== null)
						{
							return c.ownerType === 'user';
						}
						return false;
					});

					//switch attacking to next user
					if(nextUser !== undefined) 
					{
						this.attackTarget = true;
						this.targetCharacterIdToAttack = nextUser;
					}
					//turn off attacking
					else
					{
						this.attackTarget = false;
						this.targetCharacterIdToAttack = null;
					}
				}
			}
		}
	}

	postCharacterActivate(characterId) {
		var character = this.gs.gom.getGameObjectByID(this.characterId);
		if(character !== null && character.isActive)
		{
			var pos = character.plBody.getPosition();
			if(pos !== null) 
			{
				//create a aiVision body for the ai agent
				const Vec2 = this.gs.pl.Vec2;
				const pl = this.gs.pl;
				
				var trackingSensor = pl.Circle(Vec2(0, 0), 8);

				//attach the sensor to the character. Meh, we'll see how choatic it gets :)
				character.plBody.createFixture({
					shape: trackingSensor,
					density: 0.0,
					friction: 1.0,
					isSensor: true,
					userData: {type:"ai-agent", id:this.id}
				});
			}
		}
	}

	seekCastle() {
		var character = this.gs.gom.getGameObjectByID(this.characterId);
		if(character !== null && character.isActive)
		{
			var pos = character.plBody.getPosition();

			//contact the nav grid to get a path
			if(pos !== null)
			{
				this.nodePathToCastle = this.gs.activeNavGrid.getPathToCastle(Math.round(pos.x), -Math.round(pos.y));

				if(this.nodePathToCastle.length > 0)
				{
					this.pathSet = true;
					this.followPath = true;
					this.currentNode = 0;

					this.findNextLOSNode(pos);
				}
			}
		}
	}

	seekPlayer(user) {
		var aiCharacter = this.gs.gom.getGameObjectByID(this.characterId);
		var userCharacter = this.gs.gom.getGameObjectByID(user.characterId);
		if(aiCharacter !== null && aiCharacter.isActive && userCharacter !== null && userCharacter.isActive)
		{
			var aiPos = aiCharacter.plBody.getPosition();
			var userPos = userCharacter.plBody.getPosition();

			//contact the nav grid to get a path
			if(aiPos !== null && userPos !== null)
			{
				var aiNode = this.gs.activeNavGrid.getNode(Math.round(aiPos.x), -Math.round(aiPos.y));
				var userNode = this.gs.activeNavGrid.getNode(Math.round(userPos.x), -Math.round(userPos.y));

				if(aiNode !== null && userNode !== null)
				{
					this.nodePathToCastle = this.gs.activeNavGrid.AStarSearch(aiNode, userNode);
					
					if(this.nodePathToCastle.length > 0)
					{
						this.pathSet = true;
						this.followPath = true;
						this.currentNode = 0;

						this.findNextLOSNode(aiPos);
					}
				}
			}
		}
	}

	stop() {
		this.pathSet = false;
		this.followPath = false;
		this.currentNode = 0;
		this.nodePathToCastle = [];

		var character = this.gs.gom.getGameObjectByID(this.characterId);
		if(character !== null && character.isActive)
		{
			var finalInput = {
				up: false,
				down: false,
				left: false,
				right: false,
				isFiring: false,
				isFiringAlt: false,
				characterDirection: 0.0
			}
	
			//stop the character
			character.inputQueue.push(finalInput);
		}
	}


	update(dt) {
		var character = this.gs.gom.getGameObjectByID(this.characterId);
		if(character !== null && character.isActive)
		{
			var pos = character.plBody.getPosition();
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

			//shoot bullets at target
			if(this.attackTarget)
			{
				//fire a bullet
				if(this.isAttackCurrentTimer <= 0)
				{
					var targetCharacter = this.gs.gom.getGameObjectByID(this.targetCharacterIdToAttack);
					var targetCharacterPos = null;
					
					//checks n' shit
					if(targetCharacter !== null)
					{
						if(targetCharacter.plBody !== null)
						{
							targetCharacterPos = targetCharacter.plBody.getPosition();
						}
					}

					//NOW fire a bullet
					if(targetCharacterPos !== null)
					{
						//calculate angle
						dx = targetCharacterPos.x - pos.x;
						dy = targetCharacterPos.y - pos.y;

						var angle = Math.atan(-dy / dx);
						
						//this is added to the end if we need to travel quadrant 2 or 3 of the unit circle...best comment ever.
						//this basically just flips the direction of the x and y
						var radiansToAdd = dx < 0 ? Math.PI : 0;

						angle += radiansToAdd;

						finalInput.isFiring = true;
						finalInput.characterDirection = angle;
						inputChanged = true;
						
						this.isAttackCurrentTimer = this.isAttackInterval;
					}
				}
			}

			if(this.isAttackCurrentTimer > 0)
			{
				this.isAttackCurrentTimer -= dt;
				if(this.isAttackCurrentTimer <= 0)
				{
					finalInput.isFiring = false;
					inputChanged = true;
				}
			}

			//determine the node to navigate to
			if(this.followPath)
			{
				//sense if you are at your destination
				if(this.nodePathToCastle[this.currentNode])
				{
					var errorX = this.nodePathToCastle[this.currentNode].x - pos.x;
					var errorY = (this.nodePathToCastle[this.currentNode].y * -1) - pos.y;
					var squaredDistance = errorX * errorX + errorY * errorY;
	
					if(squaredDistance <= this.nodeRadiusSquared)
					{
						this.currentNodeReached = true;
					}
				}
				
				//for now, lets just do cardinal direction path steering...path steering on diagonals and arbitrary lines is getting complicated
				//current node reached
				if(this.currentNodeReached)
				{
					this.currentNode++;

					this.findNextLOSNode(pos);
					
					//destination reached
					if(this.currentNode > this.nodePathToCastle.length-1)
					{
						this.followPath = false;

						//stop the character
						finalInput.up = false;
						finalInput.down = false;
						finalInput.left = false;
						finalInput.right = false;
						inputChanged = true;
					}

					this.currentNodeReached = false;
				}
			}

			//navigate to the current node
			if(this.followPath)
			{
				if(this.nodePathToCastle[this.currentNode])
				{
					var seekVelVec = {
						x: 0,
						y: 0,
					}
					var avoidanceVelVec = {
						x: 0,
						y: 0,
					}
					var finalVelVec = {
						x: 0,
						y: 0
					};

					//engage shimmy steering
					if(this.shimmyOveride)
					{
						seekVelVec.x = this.shimmyDirection.x;
						seekVelVec.y = this.shimmyDirection.y;
						this.shimmyCurrentTimer -= dt;

						//turn off shimmy mode
						if(this.shimmyCurrentTimer <= 0)
						{
							//console.log('shimm mode disengaged!');
							this.shimmyOveride = false;
							this.findNextLOSNode(pos);
						}
					}
					//steer like normal
					else
					{
						seekVelVec = this.calcSeekSteering(pos);
						//avoidanceVelVec = this.calcAvoidanceSteering(pos, seekVelVec);
					}
					
					finalVelVec.x = seekVelVec.x + avoidanceVelVec.x;
					finalVelVec.y = seekVelVec.y + avoidanceVelVec.y;
					//console.log("avoidanceVelVec: x: " + avoidanceVelVec.x + ", y: " + avoidanceVelVec.y)

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
					if(!this.shimmyOveride)
					{
						var dx = Math.abs(this.agentPrevPosition.x - pos.x);
						var dy = Math.abs(this.agentPrevPosition.y - pos.y);
						
						if(dx < 0.01 && dy < 0.01)
						{
							this.shimmyOverrideAccumulationValue += 1;
						}
	
						//engage shimmy mode
						if(this.shimmyOverrideAccumulationValue >= this.shimmyOverrideAccumulationThreshold)
						{
							//console.log('shimm mode engaged!');
							this.shimmyOveride = true;
							this.shimmyOverrideAccumulationValue = 0;

							var randAngleMultiplier = Math.floor(Math.random() * 2) + 1;
							var randAngleDir = Math.floor(Math.random() * 2) === 0 ? 1 : -1;
							var randShimmyTimeLength = Math.floor(Math.random() * this.shimmyTimeLengthVariance);

							var shimmyAngle = (randAngleMultiplier * Math.PI/4) * randAngleDir;
							this.shimmyDirection.x = Math.cos(angle + shimmyAngle);
							this.shimmyDirection.y = Math.sin(angle + shimmyAngle);
							this.shimmyCurrentTimer = this.shimmyTimeLength + randShimmyTimeLength;
						}
					}

					this.agentPrevPosition.x = pos.x;
					this.agentPrevPosition.y = pos.y;
				}
			}


			//input the finalInput to the character
			if(inputChanged)
			{
				character.inputQueue.push(finalInput);
			}
		}
	}

	calcSeekSteering(pos) {
		var velVec = {
			x: 0,
			y: 0
		}
		var nodeTarget = this.nodePathToCastle[this.currentNode];

		//the *-1 is to flip the y coordinates for planck cooridnate plane
		var angle = Math.atan(((nodeTarget.y*-1) - pos.y) / (nodeTarget.x - pos.x));
		
		//this is added to the end if we need to travel quadrant 2 or 3 of the unit circle...best comment ever.
		//this basically just flips the direction of the x and y
		var radiansToAdd = (nodeTarget.x - pos.x) < 0 ? Math.PI : 0;

		angle += radiansToAdd;

		velVec.x = Math.cos(angle);
		velVec.y = Math.sin(angle);
		
		return velVec;
		
	}


	calcAvoidanceSteering(pos, seekVelVec) {
		const Vec2 = this.gs.pl.Vec2;
		var velVec = {
			x: 0,
			y: 0
		}

		var p1 = new Vec2(pos.x, pos.y);
		var p2 = new Vec2(pos.x + (seekVelVec.x * 0.5), pos.y + (seekVelVec.y * 0.5));

		this.raycastObjects = [];
		this.gs.world.rayCast(p1, p2, this.fixtureCallback.bind(this));

		//if objects were detected in front of the ai, then calculate avoidance vector
		if(this.raycastObjects.length > 0)
		{
			var avoidanceForce = 15;
			var firstObjectPos = this.raycastObjects[0].fixture.getBody().getPosition();
			velVec.x = (pos.x - firstObjectPos.x) * avoidanceForce;
			velVec.y = (pos.y - firstObjectPos.y) * avoidanceForce;

			// var nodeTarget = this.nodePathToCastle[this.currentNode];
	
			// //the *-1 is to flip the y coordinates for planck cooridnate plane
			// var angle = Math.atan(((nodeTarget.y*-1) - pos.y) / (nodeTarget.x - pos.x));
			
			// //this is added to the end if we need to travel quadrant 2 or 3 of the unit circle...best comment ever.
			// //this basically just flips the direction of the x and y
			// var radiansToAdd = (nodeTarget.x - pos.x) < 0 ? Math.PI : 0;
	
			// angle += radiansToAdd;
	
			// velVec.x = character.walkingVelMagMax * Math.cos(angle);
			// velVec.y = character.walkingVelMagMax * Math.sin(angle);
		}

		
		return velVec;
	}

	fixtureCallback(fixture, point, normal, fraction) {
		this.raycastObjects.push({
			fixture: fixture,
			point: point,
			normal: normal,
			fraction: fraction
		});
	}

	//Reassigns the this.currentNode to be the next node that is in the lino of sight of the current position.
	//this.currentNode will always be < this.nodePathToCastle.length-1
	findNextLOSNode(pos)
	{
		//do line of sight tests to get the next logical node
		var nodeInLOS = true;
		while(nodeInLOS)
		{
			if(this.currentNode < this.nodePathToCastle.length-1)
			{
				nodeInLOS = this.lineOfSightTest(pos, this.nodePathToCastle[this.currentNode + 1]);
				if(nodeInLOS)
				{
					//console.log('current node in LOS(' + this.nodePathToCastle[this.currentNode + 1].x + ',' + this.nodePathToCastle[this.currentNode + 1].y + '). Skipping the node.')
					this.currentNode++
				}
				else
				{
					//console.log('current node NOT in LOS(' + this.nodePathToCastle[this.currentNode + 1].x + ',' + this.nodePathToCastle[this.currentNode + 1].y + ').')
				}
			}
			//final node is reached
			else
			{
				nodeInLOS = false;
			}
		}
	}



	lineOfSightTest(pos, node)
	{
		const Vec2 = this.gs.pl.Vec2;
		var isNodeInLOS = true;

		var p1 = new Vec2(pos.x, pos.y);
		var p2 = new Vec2(node.x, -node.y);

		this.lineOfSightObjects = [];
		this.gs.world.rayCast(p1, p2, this.lineOfSightCallback.bind(this));

		//if objects were detected in front of the ai, then calculate avoidance vector
		if(this.lineOfSightObjects.length > 0)
		{
			for(var i = 0; i < this.lineOfSightObjects.length; i++)			
			{
				if(this.lineOfSightObjects[i].fixture.getBody().getUserData().type === "wall")
				{
					isNodeInLOS = false;
					break;
				}
			}
		}

		return isNodeInLOS;
	}

	lineOfSightCallback(fixture, point, normal, fraction) {
		this.lineOfSightObjects.push({
			fixture: fixture,
			point: point,
			normal: normal,
			fraction: fraction
		});
	}
}

exports.AIAgent = AIAgent;