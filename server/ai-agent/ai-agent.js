const {GlobalFuncs} = require('../global-funcs.js');
const GameConstants = require('../../shared_files/game-constants.json');
const {AIAgentWaitingState} = require('./ai-agent-states/ai-agent-waiting-state.js');
const AIActionIdle = require('./ai-actions/ai-action-idle.js');

const logger = require("../../logger.js");

class AIAgent {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = null;
		this.userId = null;
		this.characterId = null;
		this.user = null; 			//direct reference to the user
		this.character = null; 		//direct reference to the character the ai agent is controlling
		this.username = "";

		this.playingEventQueue = [];
		
		this.state = null;
		this.nextState = null;
		this.stateName = "";
		this.targetCharacterDeactivatedHandleId = null;

		this.characterEventCallbackMapping = [ 
			{eventName: "character-deactivated", cb: this.cbEventEmitted.bind(this), handleId: null}
		];

		this.userEventCallbackMapping = [ 
			{eventName: "user-stopped-playing", cb: this.cbEventEmitted.bind(this), handleId: null}
		]


		this.aiClassResource = null;
		this.characterClassResource = null;

		this.mainActionScores = [];
		this.mainAction = null;
		this.nextMainAction = null;

		this.skillActionScores = [];
		this.skillAction = null;
		this.nextSkillAction = null;

		this.frameInput = {
			up: false,
			down: false,
			left: false,
			right: false,
			isFiring: false,
			isFiringAlt: false,
			characterDirection: 0.0
		};

		this.actionHistory = [];

		///////////////////
		// shimmying stuff used for moving the character along the path
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

		//
		///////////////////
	}

	aiAgentInit(gameServer, userId) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
		this.userId = userId;

		this.user = this.gs.um.getUserByID(this.userId);
		this.username = "AI " + this.id + " (old)";

		this.user.em.batchRegisterForEvent(this.userEventCallbackMapping);

		this.state = new AIAgentWaitingState(this);
		this.nextState = null;
		this.state.enter();

		//create a fake idle action
		this.mainAction = new AIActionIdle.AIActionIdle(this, {
			"resource": {
				"type": "IDLE",
				"typeEnum": GameConstants.ActionTypes["IDLE"]
			},
			"score": 0
		});

		this.mainAction.enter();


		//create a fake idle skill
		this.skillAction = new AIActionIdle.AIActionIdle(this, {
			"resource": {
				"type": "IDLE",
				"typeEnum": GameConstants.ActionTypes["IDLE"]
			},
			"score": 0
		});

		this.skillAction.enter();

	}

	//called before the ai agent is deleted from the ai-agent-manager
	aiAgentDeinit() {
		// console.log("AiAgent " + this.id + " deinit called!");
		//also exit the current state and action for cleanup purposes
		this.state.exit();
		this.state = null;
		this.nextState = null;

		this.mainAction.exit();
		this.mainAction = null;
		this.nextMainAction = null;

		this.skillAction.exit();
		this.skillAction = null;
		this.nextSkillAction = null;

		this.user = null;
		this.character = null;
		this.aiClassResource = null;
		this.mainActionScores.length = 0;
		this.skillActionScores.length = 0;

		this.characterClassResource = null;
	}


	setNextMainActionIdle() {
		//create a fake "idle" initial state
		this.nextMainAction = new AIActionIdle.AIActionIdle(this, {
			"resource": {
				"type": "IDLE",
				"typeEnum": GameConstants.ActionTypes["IDLE"]
			},
			"score": 0
		});
	}

	setNextSkillActionIdle() {
		//create a fake "idle" initial state
		this.nextSkillAction = new AIActionIdle.AIActionIdle(this, {
			"resource": {
				"type": "IDLE",
				"typeEnum": GameConstants.ActionTypes["IDLE"]
			},
			"score": 0
		});
	}


	cbEventEmitted(eventName, owner) {
		this.playingEventQueue.push({
			eventName: eventName
		})
	}

	processPlayingEvents() {
		if(this.user.bOkayToBeInTheGame) {
			if(this.playingEventQueue.length > 0) {
				for(var i = 0; i < this.playingEventQueue.length; i++) {
					switch(this.playingEventQueue[i].eventName) {
						case "character-deactivated":
							//unregister events
							this.character.em.batchUnregisterForEvent(this.characterEventCallbackMapping);
	
							//change state back to waiting
							this.nextState = new AIAgentWaitingState(this);
							break;
						case "user-stopped-playing":
							//unregister events
							this.user.em.batchUnregisterForEvent(this.userEventCallbackMapping);

							if(this.character !== null) {
								this.character.em.batchUnregisterForEvent(this.characterEventCallbackMapping);
							}
	
							//destroy this ai agent
							this.gs.aim.destroyAIAgent(this.id);
							break;
					}
				}
				this.playingEventQueue.length = 0;
			}
		}
	}

	frameInputChangeMovement(up, down, left, right) {
		this.frameInput.up = up;
		this.frameInput.down = down;
		this.frameInput.left = left;
		this.frameInput.right = right;
	}

	frameInputChangeShooting(isFiring, isFiringAlt) {
		this.frameInput.isFiring = isFiring;
		this.frameInput.isFiringAlt = isFiringAlt;
	}

	frameInputChangeDirection(characterDirection) {
		this.frameInput.characterDirection = characterDirection;
	}


	//This takes in a nodepath, a character's currentPosition, and the currentNode to travel too, and navigates the character to the currentNode to travel too.
	//This returns the next node to travel too (it returns the nodePath index of the next node to travel to).
	//Ex:
	//If the currentNode is 2, and it was reached, this returns the next path in the character's unobstructed LOS. Example: 3 or 7.
	//If the currentNode is 2, and it was not reached, this returns 2.
	//If the currentNode is 2, and the nodePath's length is 2, it returns 2.
	moveAlongPath(currentPos, nodePath, currentNode, dt) {
		//check if you have reached your current node
		if(currentNode < nodePath.length && nodePath[currentNode]) {
			var errorX = nodePath[currentNode].xPlanck - currentPos.x;
			var errorY = (nodePath[currentNode].yPlanck * -1) - currentPos.y;
			var squaredDistance = errorX * errorX + errorY * errorY;

			//if you have reached your current node
			if(squaredDistance <= this.nodeRadiusSquared) {
				currentNode++;

				//find the next node in the line of sight
				currentNode = this.findNextLOSNode(currentPos, nodePath, currentNode);
				
				//destination reached
				if(currentNode > nodePath.length-1) {
					//stop the character
					this.frameInputChangeMovement(false, false, false, false);
				}
			}
		}
		
		//travel to the next node
		//if shimmy is engaged, do that instead of navigating to the next node
		if(this.shimmyOveride) {
			this.frameInputChangeMovement(this.shimmyInput.up, this.shimmyInput.down, this.shimmyInput.left, this.shimmyInput.right);
			this.shimmyCurrentTimer -= dt;

			//turn off shimmy mode
			if(this.shimmyCurrentTimer <= 0) {
				// logger.log("info", 'shimm mode disengaged!');
				this.shimmyOveride = false;
				currentNode = this.findNextLOSNode(currentPos, nodePath, currentNode);
				// this.findNextLOSNode(currentPos);
			}
		}
		//navigate to the current node if there are any left
		else if(currentNode < nodePath.length && nodePath[currentNode]) {
			var finalInput = this.calcSteeringStraightLine(currentPos, {x: nodePath[currentNode].xPlanck, y: -1*nodePath[currentNode].yPlanck});
			this.frameInputChangeMovement(finalInput.up, finalInput.down, finalInput.left, finalInput.right);

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
					this.shimmyInput.angle = ((randAngleMultiplier * Math.PI/4) * randAngleDir) + finalInput.angle;

					//translate the shimmy angle into actual inputs
					var xAngle = Math.cos(this.shimmyInput.angle);
					var yAngle = Math.sin(this.shimmyInput.angle);

					this.shimmyInput.up = false;
					this.shimmyInput.down = false;
					this.shimmyInput.left = false;
					this.shimmyInput.right = false;
					
					if(xAngle >= 0.5) this.shimmyInput.right = true; else if(xAngle <= -0.5) this.shimmyInput.left = true;
					if(yAngle >= 0.5) this.shimmyInput.up = true; else if(yAngle <= -0.5) this.shimmyInput.down = true;

					this.shimmyCurrentTimer = this.shimmyTimeLength + randShimmyTimeLength;
				}
			}
		}

		//save the currentPosition for shimmy calculation next time
		this.prevCharacterPosition.x = currentPos.x;
		this.prevCharacterPosition.y = currentPos.y;

		return currentNode;
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

	//Returns a node path from the currentPos to the targetPos.
	//The node path can be a straight line if the character's LOS is unobstructed.
	//This takes into account the clearance of the character as well.
	getPathToTarget(currentPos, targetPos, characterClearance) {
		var pathResults = {
			nodePath: [],
			currentNode: 0
		};
		var losResults = null;


		//check to see if you have a LOS to them
		if(targetPos !== null && currentPos !== null) {
			losResults = this.lineOfSightTest(currentPos, targetPos);

			//if you have line of sight, and the path is onobstructed, move in a straight line to the target.
			if (losResults.pathUnobstructed) {
				pathResults.currentNode = 0;
				var userNode = this.gs.activeTilemap.getNode(targetPos.x, -targetPos.y, characterClearance);

				if(userNode !== null) {
					pathResults.currentNode = 0;
					pathResults.nodePath = [];
					pathResults.nodePath.push(userNode);
				}
			}
			//if the user doesn't even have LOS, find the player with A*
			else {
				pathResults.nodePath = this.gs.activeTilemap.AStarSearch(currentPos, targetPos, characterClearance);
				
				if(pathResults.nodePath.length > 0) {
					pathResults.currentNode = this.findNextLOSNode(currentPos, pathResults.nodePath, pathResults.currentNode);
				}
			}
		}

		return pathResults;
	}


	
	//Returns the next node along the node path that has an unobstructed line of sight of the current position (current character's position).
	//The returned node will always be < nodePath.length-1
	findNextLOSNode(currentPos, nodePath, nodeStartLOSTest) {
		const Vec2 = this.gs.pl.Vec2;
		//do line of sight tests to get the next logical node
		var currentNode = nodeStartLOSTest;
		var pathToNodeUnobstructed = true;
		var losResults = {};
		while(pathToNodeUnobstructed) {
			if(currentNode < nodePath.length-1) {
				var nodePos = new Vec2(nodePath[currentNode + 1].xPlanck, -nodePath[currentNode + 1].yPlanck);

				losResults = this.lineOfSightTest(currentPos, nodePos);
				pathToNodeUnobstructed = losResults.pathUnobstructed;
				if(pathToNodeUnobstructed) {
					//logger.log("info", 'current node in LOS(' + nodePath[currentNode + 1].x + ',' + nodePath[currentNode + 1].y + '). Skipping the node.')
					currentNode++
				}
				else {
					//intentionally empty
					//logger.log("info", 'current node NOT in LOS(' + nodePath[currentNode + 1].x + ',' + nodePath[currentNode + 1].y + ').')
				}
			}
			//final node is reached
			else {
				pathToNodeUnobstructed = false;
			}
		}

		return currentNode;
	}

	//this just resets things for pathing purposes. Like shimming counters and inputs.
	resetPathingVariables() {
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
	}


	lineOfSightTest(pos, pos2) {
		const Vec2 = this.gs.pl.Vec2;
		var losResults = {
			isLOS: true,
			pathUnobstructed: true
		}

		var p1 = new Vec2(pos.x, pos.y);
		var p2 = new Vec2(pos2.x, pos2.y);

		this.lineOfSightObjects = [];
		this.gs.world.rayCast(p1, p2, this.lineOfSightCallback.bind(this));

		//if objects were detected in front of the ai, then calculate avoidance vector
		if(this.lineOfSightObjects.length > 0)
		{
			for(var i = 0; i < this.lineOfSightObjects.length; i++)			
			{
				var userData = this.lineOfSightObjects[i].fixture.getBody().getUserData()
				if(userData.type === "wall" && userData.collideProjectiles) {
					losResults.isLOS = false;
					losResults.pathUnobstructed = false;
					break;
				}
				else if(userData.type === "wall" && !userData.collideProjectiles) {
					losResults.pathUnobstructed = false;
				}
			}
		}

		return losResults;
	}

	lineOfSightCallback(fixture, point, normal, fraction) {
		this.lineOfSightObjects.push({
			fixture: fixture,
			point: point,
			normal: normal,
			fraction: fraction
		});
	}



	update(dt) {
		this.state.update(dt);
		this.mainAction.update(dt);
		this.skillAction.update(dt);

		if(this.nextState !== null) {
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}

		if(this.nextMainAction !== null) {
			this.mainAction.exit();
			this.nextMainAction.enter();

			this.mainAction = this.nextMainAction;
			this.nextMainAction = null;
		}

		if(this.nextSkillAction !== null) {
			this.skillAction.exit();
			this.nextSkillAction.enter();

			this.skillAction = this.nextSkillAction;
			this.nextSkillAction = null;
		}

		//input the frameInput into the user to go to the character
		this.user.inputQueue.push(this.frameInput);
	}
}

exports.AIAgent = AIAgent;