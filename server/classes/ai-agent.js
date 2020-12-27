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
	}

	aiAgentInit(gameServer, characterId) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
		this.characterId = characterId

		this.username = "AI " + this.id;
	}

	update(dt) {
		var character = this.gs.gom.getGameObjectByID(this.characterId);
		if(character !== null && character.isActive)
		{
			var pos = character.plBody.getPosition();
			//contact the nav grid to get a path
			if(!this.pathSet)
			{
				if(pos !== null)
				{
					this.nodePathToCastle = this.gs.activeNavGrid.getPathToCastle(Math.round(pos.x), -Math.round(pos.y));
					this.pathSet = true;
					this.followPath = true;
					this.currentNode = 0;
				}
			}
			
			//determine the node to navigate to
			if(this.followPath)
			{
				//sense if you are at your destination
				var errorX = this.nodePathToCastle[this.currentNode].x - pos.x;
				var errorY = (this.nodePathToCastle[this.currentNode].y * -1) - pos.y;
				var squaredDistance = errorX * errorX + errorY * errorY;

				if(squaredDistance <= this.nodeRadiusSquared)
				{
					this.currentNodeReached = true;
				}

				//for now, lets just do cardinal direction path steering...path steering on diagonals and arbitrary lines is getting complicated
				//current node reached
				if(this.currentNodeReached)
				{
					this.currentNode++;
					
					//destination reached
					if(this.currentNode > this.nodePathToCastle.length-1)
					{
						this.followPath = false;

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

					this.currentNodeReached = false;
				}
			}

			//navigate to the current node
			if(this.followPath)
			{
				var nodeTarget = this.nodePathToCastle[this.currentNode];

				//the *-1 is to flip the y coordinates for planck cooridnate plane
				var angle = Math.atan(((nodeTarget.y*-1) - pos.y) / (nodeTarget.x - pos.x));
				
				//this is added to the end if we need to travel quadrant 2 or 3 of the unit circle...best comment ever.
				//this basically just flips the direction of the x and y
				var radiansToAdd = (nodeTarget.x - pos.x) < 0 ? Math.PI : 0;

				angle += radiansToAdd;

				//determine the direction: N, E, S, W
				//hackilicous
				var xAngle = Math.cos(angle);
				var yAngle = Math.sin(angle);

				var finalInput = {
					up: false,
					down: false,
					left: false,
					right: false,
					isFiring: false,
					isFiringAlt: false,
					characterDirection: 0.0
				}
				if(xAngle >= 0.5)
				{
					finalInput.right = true;
				}
				else if (xAngle <= -0.5)
				{
					finalInput.left = true;
				}

				if(yAngle >= 0.5)
				{
					finalInput.up = true;
				}
				else if (yAngle <= -0.5)
				{
					finalInput.down = true;
				}

				character.inputQueue.push(finalInput);
			}
		}
	}
}

exports.AIAgent = AIAgent;