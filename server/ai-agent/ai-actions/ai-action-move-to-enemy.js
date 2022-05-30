const AIActionBase = require('./ai-action-base.js');
const logger = require("../../../logger.js");

class AIActionMoveToEnemy extends AIActionBase.AIActionBase {
	constructor(aiAgent, actionScore) {
		super(aiAgent, actionScore);
		this.actionName = "MOVE_TO_ENEMY";
		this.checkTimer = 1000;
		this.checkTimerInterval = 1000;	//ms
		this.nodePath = [];
		this.currentNode = 0;
		this.characterClearance = 0.7;
		this.nodeRadiusSquared = 0.01;	//radius to determine if the character has reached its current node
		
		this.shimmyOveride = false;		//this tells the ai to shimmy to the left or right of their intended direction (in case there is an obstacle in the way)
		this.shimmyCurrentTimer = 0;	//current time to shimmy left or right
		this.shimmyTimeLength = 300;	//ms to follow shimmy velocity direction
		this.shimmyTimeLengthVariance = 300; //+-ms variance to shimmyTimeLength
		this.shimmyDirection = {
			x: 0,
			y: 0
		};
		this.shimmyOverrideAccumulationValue = 0; 		//basically, number of frames the entity hasn't moved
		this.shimmyOverrideAccumulationThreshold = 5;	//number of frames to determine if the shimmyOverride should be engaged.
		this.shimmyInput = {
			angle: 0,
			up: false,
			down: false,
			left: false,
			right: false
		};

		this.prevCharacterPosition = {x: 0, y: 0};


		this.characterEventCallbackMapping = [ 
			{eventName: "character-deactivated", cb: this.enemyCharacterDeactivated.bind(this), handleId: null}
		];
	}
	
	enter(dt) {
		// logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' enter');

		this.targetCharacter = this.aiAgent.gs.gom.getGameObjectByID(this.actionScore.characterId);

		if(this.targetCharacter !== null && this.targetCharacter.em !== null) {
			//register stuff to the character
			this.targetCharacter.em.batchRegisterForEvent(this.characterEventCallbackMapping);

			//calculate clearance, and find a path to the target
			//clearance = raidus*2*size
			var cr = this.aiAgent.character.characterClassResource;
			var plRadius = this.aiAgent.globalfuncs.getValueDefault(cr?.data?.planckData?.plRadius, 0.375);
			var size = this.aiAgent.globalfuncs.getValueDefault(cr?.data?.size, 1);
			this.characterClearance = plRadius * 2 * size;
			
			this.getPathToTarget();
		}

		super.enter(dt);
	}

	update(dt) {
		this.checkTimer += dt;

		if(this.targetCharacter?.isActive === true && this.aiAgent.character?.isActive === true) {
			var currentPos = this.aiAgent.character.getPlanckPosition();
			var finalInput = {};

			//update the path incase the target moved around alot
			if(this.checkTimer >= this.checkTimerInterval) {
				this.checkTimer = 0;

				this.getPathToTarget();
			}
	
			//check if you have reached your current node
			if(this.currentNode < this.nodePath.length && this.nodePath[this.currentNode]) {
				var errorX = this.nodePath[this.currentNode].xPlanck - currentPos.x;
				var errorY = (this.nodePath[this.currentNode].yPlanck * -1) - currentPos.y;
				var squaredDistance = errorX * errorX + errorY * errorY;
	
				//if you have reached your current node
				if(squaredDistance <= this.nodeRadiusSquared) {
					this.currentNode++;
	
					//find the next node in the line of sight
					this.findNextLOSNode(currentPos);
					
					//destination reached
					if(this.currentNode > this.nodePath.length-1) {
						//stop the character
						this.aiAgent.frameInputChangeMovement(false, false, false, false);
					}
				}
			}
			
			//travel to the next node
			//if shimmy is engaged, do that instead of navigating to the next node
			if(this.shimmyOveride) {
				this.aiAgent.frameInputChangeMovement(this.shimmyInput.up, this.shimmyInput.down, this.shimmyInput.left, this.shimmyInput.right);
				this.shimmyCurrentTimer -= dt;

				//turn off shimmy mode
				if(this.shimmyCurrentTimer <= 0) {
					// logger.log("info", 'shimm mode disengaged!');
					this.shimmyOveride = false;
					this.findNextLOSNode(currentPos);
				}
			}
			//navigate to the current node if there are any left
			else if(this.currentNode < this.nodePath.length && this.nodePath[this.currentNode]) {
				finalInput = this.calcSteeringStraightLine(currentPos, {x: this.nodePath[this.currentNode].xPlanck, y: -1*this.nodePath[this.currentNode].yPlanck});
				this.aiAgent.frameInputChangeMovement(finalInput.up, finalInput.down, finalInput.left, finalInput.right);

				//check position from prev position. If you haven't moved in a while, add to the shimmy accumulator
				if(!this.shimmyOveride){
					var dx = Math.abs(this.prevCharacterPosition.x - currentPos.x);
					var dy = Math.abs(this.prevCharacterPosition.y - currentPos.y);
					
					if(dx < 0.01 && dy < 0.01) {
						this.shimmyOverrideAccumulationValue += 1;
					}

					//engage shimmy mode
					if(this.shimmyOverrideAccumulationValue >= this.shimmyOverrideAccumulationThreshold) {
						// logger.log("info", 'shimm mode engaged!');
						this.shimmyOveride = true;
						this.shimmyOverrideAccumulationValue = 0;

						var randAngleMultiplier = Math.floor(Math.random() * 2) + 1; 			//1-2
						var randAngleDir = Math.floor(Math.random() * 2) === 0 ? 1 : -1;		//-1 or 1
						var randShimmyTimeLength = Math.floor(Math.random() * this.shimmyTimeLengthVariance);

						//get a random angle between +-45 to 90 degrees from where you want to go
						this.shimmyInput.angle = ((randAngleMultiplier * Math.PI/4) * randAngleDir) * finalInput.angle;

						//translate the shimmy angle into actual inputs
						var xAngle = Math.cos(this.shimmyInput.angle);
						var yAngle = Math.sin(this.shimmyInput.angle);
						
						if(xAngle >= 0.5) this.shimmyInput.right = true; else if(xAngle <= -0.5) this.shimmyInput.left = true;
						if(yAngle >= 0.5) this.shimmyInput.up = true; else if(yAngle <= -0.5) this.shimmyInput.down = true;

						this.shimmyCurrentTimer = this.shimmyTimeLength + randShimmyTimeLength;
					}
				}
			}

			this.prevCharacterPosition.x = currentPos.x;
			this.prevCharacterPosition.y = currentPos.y;
		}
		super.update(dt);
	}

	exit(dt) {
		// logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' exit');

		if(this.targetCharacter !== null && this.targetCharacter.em !== null) {
			this.targetCharacter.em.batchUnregisterForEvent(this.characterEventCallbackMapping);
		}

		//stop the aiAgent's character
		this.aiAgent.frameInputChangeMovement(false, false, false, false);
		
		super.exit(dt);
	}

	//This returns the inputs for steering the character from the starting to the ending position.
	//The starting and ending positions are assumed to be in planck coordinates.
	//startingPos: 	{x:0, y:0}
	//endingPos: 	{x:1, y:0}
	calcSteeringStraightLine(startingPos, endingPos) {
		var finalInput = {
			angle: 0,
			up: false,
			down: false,
			left: false,
			right: false
		};

		var dx = endingPos.x - startingPos.x;
		var dy = endingPos.y - startingPos.y;

		if(Math.abs(dx) === 0 && Math.abs(dy) === 0) {
			dx = 1;
		}
		finalInput.angle = Math.atan(dy / dx);
		
		//this is added to the end if we need to travel quadrant 2 or 3 of the unit circle...best comment ever.
		//this basically just flips the direction of the x and y
		finalInput.angle += (endingPos.x - startingPos.x) < 0 ? Math.PI : 0;
		
		//hackilicous
		var xAngle = Math.cos(finalInput.angle);
		var yAngle = Math.sin(finalInput.angle);
		
		if(xAngle >= 0.5) finalInput.right = true; else if(xAngle <= -0.5) finalInput.left = true;
		if(yAngle >= 0.5) finalInput.up = true; else if(yAngle <= -0.5) finalInput.down = true;

		return finalInput;
	}

	getPathToTarget() {
		var targetPos = this.targetCharacter.getPlanckPosition();
		var currentPos = this.aiAgent.character.getPlanckPosition();
		var losResults = null;

		//check to see if you have a LOS to them
		if(targetPos !== null && currentPos !== null) {
			losResults = this.aiAgent.lineOfSightTest(currentPos, targetPos);

			//if you have line of sight, and the path is onobstructed, move in a straight line to the target.
			if (losResults.pathUnobstructed) {
				this.currentNode = 0;
				var userNode = this.aiAgent.gs.activeTilemap.getNode(targetPos.x, -targetPos.y, this.characterClearance);

				if(userNode !== null) {
					this.currentNode = 0;
					this.nodePath = [];
					this.nodePath.push(userNode);
				}

			}
			//if the user doesn't even have LOS, find the player with A*
			else {
				this.nodePath = this.aiAgent.gs.activeTilemap.AStarSearch(currentPos, targetPos, this.characterClearance);
				
				if(this.nodePath.length > 0) {
					this.currentNode = 0;
					this.findNextLOSNode(currentPos);
				}
			}
		}
	}

	enemyCharacterDeactivated() {
		// logger.log("info", "AI " + this.aiAgent.id + ": target character was deactivated. Switching to idle.");
		this.aiAgent.setNextMainActionIdle();
	}


	//Reassigns the this.currentNode to be the next node that is in the line of sight of the current position.
	//this.currentNode will always be < this.nodePath.length-1
	findNextLOSNode(pos) {
		const Vec2 = this.aiAgent.gs.pl.Vec2;
		//do line of sight tests to get the next logical node
		var pathToNodeUnobstructed = true;
		var losResults = {};
		while(pathToNodeUnobstructed) {
			if(this.currentNode < this.nodePath.length-1) {
				var nodePos = new Vec2(this.nodePath[this.currentNode + 1].xPlanck, -this.nodePath[this.currentNode + 1].yPlanck);

				losResults = this.aiAgent.lineOfSightTest(pos, nodePos);
				pathToNodeUnobstructed = losResults.pathUnobstructed;
				if(pathToNodeUnobstructed) {
					//logger.log("info", 'current node in LOS(' + this.nodePath[this.currentNode + 1].x + ',' + this.nodePath[this.currentNode + 1].y + '). Skipping the node.')
					this.currentNode++
				}
				else {
					//logger.log("info", 'current node NOT in LOS(' + this.nodePath[this.currentNode + 1].x + ',' + this.nodePath[this.currentNode + 1].y + ').')
				}
			}
			//final node is reached
			else {
				pathToNodeUnobstructed = false;
			}
		}
	}


}

exports.AIActionMoveToEnemy = AIActionMoveToEnemy