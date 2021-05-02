const {GlobalFuncs} = require('../global-funcs.js');
const {AIAgentWaitingState} = require('./ai-agent-states/ai-agent-waiting-state.js');

const logger = require("../../logger.js");

class AIAgent {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = null;
		this.userId = null;
		this.characterId = null;
		this.teamId = null;
		this.user = null; //direct reference to the user

		this.playingEventQueue = [];

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

		//this.attackTarget = false;
		this.targetCharacterIdToAttack = null;
		this.targetCharacter = null;
		this.targetCharacterDistanceSquared = 0;
		this.attackingRangeSquared = 49;
		this.playerSeekingRange = 10;

		this.castleDistanceSquared = 0;

		this.userCharactersInVision = [];
		this.isAttackInterval = 500; //ms
		this.isAttackCurrentTimer = 0; //ms

		this.state = null;
		this.nextState = null;
		this.stateName = "";

		this.bForceIdle = false;	//used to force the ai-agent to go to the "forced idle" state. Mainly for debugging.

		this.character = null; 		//direct reference to the character the ai agent is controlling
		this.characterPos = null;	//direct reference to the character's planck position vector
		this.teamId = 0;

		this.targetCharacterDeactivatedHandleId = null;

		this.characterEventCallbackMapping = [ 
			{eventName: "character-deactivated", cb: this.cbEventEmitted.bind(this), handleId: null}
		];

		this.userEventCallbackMapping = [ 
			{eventName: "user-deactivated", cb: this.cbEventEmitted.bind(this), handleId: null}
		]
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
	}

	aiAgentDeinit() {
		this.user = null;
		this.character = null;
		this.characterPos = null;
		this.nextState = null;

		if(this.aiAgent.targetCharacter !== null && this.targetCharacterDeactivatedHandleId !== null) {
			this.aiAgent.targetCharacter.em.unregisterForEvent("character-deactivated", this.targetCharacterDeactivatedHandleId)
		}
	}

	cbEventEmitted(eventName, owner) {
		this.playingEventQueue.push({
			eventName: eventName
		})
	}

	processPlayingEvents() {
		if(this.playingEventQueue.length > 0) {
			for(var i = 0; i < this.playingEventQueue.length; i++) {
				switch(this.playingEventQueue[i].eventName) {
					case "character-deactivated":
						//unregister events
						this.character.em.batchUnregisterForEvent(this.characterEventCallbackMapping);

						//change state back to waiting
						this.nextState = new AIAgentWaitingState(this);
						break;
					case "user-deactivated":
						//unregister events
						this.user.em.batchUnregisterForEvent(this.userEventCallbackMapping);

						//destroy this ai agent
						this.gs.aim.destroyAIAgent(this.id);
						break;
				}
			}
			this.playingEventQueue.length = 0;
		}
	}



	characterEnteredVision(c) {
		var a = this.userCharactersInVision.find((x) => {return x.c === c});
		if(c.id !== this.characterId && a === undefined && c.ownerType === "user")
		{
			//quick hack to filter out anyone who is not on the ai agent's team
			var u = this.gs.um.getUserByID(c.ownerId);
			if(u !== null && u.teamId !== this.user.teamId) {
				var characterDistanceObj = {
					c: c,
					distanceSquared: 99999
				};
	
				this.userCharactersInVision.push(characterDistanceObj);	
			}
		}
	}

	characterExitedVision(c) {
		var i = this.userCharactersInVision.findIndex((x) => {return x.c === c});
		if(i >= 0)
		{
			this.userCharactersInVision.splice(i, 1);
		}
	}

	sortUserCharactersInVision() {
		if(this.characterPos !== null && this.userCharactersInVision.length > 0)
		{
			//first get the squared distance for each user character
			for(var i = 0; i < this.userCharactersInVision.length; i++)
			{
				var co = this.userCharactersInVision[i];
				var cop = co.c.getPlanckPosition();
				if(cop !== null)
				{
					var dx = cop.x - this.characterPos.x;
					var dy = cop.y - this.characterPos.y;
					co.distanceSquared = dx*dx + dy*dy;
				}
				else
				{
					co.distanceSquared = 999999;
				}
			}

			//next, sort
			this.userCharactersInVision.sort((a, b) => {return a.distanceSquared - b.distanceSquared;});

			// //debug
			// logger.log("info", "+++" + this.username + " distances: ");
			// for(var i = 0; i < this.userCharactersInVision.length; i++)
			// {
			// 	var u = this.gs.um.getUserByID(this.userCharactersInVision[i].c.ownerId);
			// 	if(u !== null)
			// 	{
			// 		logger.log("info", "User: " + u.username + " distance squared is: " + this.userCharactersInVision[i].distanceSquared)
			// 	}
			// }
		}
	}

	updateTargetCharacterDistance() {
		if(this.characterPos !== null && this.targetCharacter !== null)
		{
			var cop = this.targetCharacter.getPlanckPosition();
			if(cop !== null)
			{
				var dx = cop.x - this.characterPos.x;
				var dy = cop.y - this.characterPos.y;
				this.targetCharacterDistanceSquared = dx*dx + dy*dy;
			}
			else
			{
				this.targetCharacterDistanceSquared = 999999;
			}
		}

		//debugging
		//logger.log("info", 'updateing target character distance: ' + this.targetCharacterDistanceSquared);
	}

	updateCastleDistance() {
		if(this.characterPos !== null && this.gs.castleObject !== null)
		{
			var cpos = this.gs.castleObject.getPlanckPosition();
			if(cpos !== null)
			{
				var dx = cpos.x - this.characterPos.x;
				var dy = cpos.y - this.characterPos.y;
				this.castleDistanceSquared = dx*dx + dy*dy;
			}
			else
			{
				this.castleDistanceSquared = 999999;
			}
		}

		//debugging
		//logger.log("info", 'updateing castle distance: ' + this.castleDistanceSquared);
	}

	seekCastle() {
		var character = this.gs.gom.getGameObjectByID(this.characterId);
		if(character !== null && character.isActive)
		{
			var pos = character.plBody.getPosition();

			//contact the nav grid to get a path
			if(this.characterPos !== null)
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

	insertStopInput() {
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
		this.user.inputQueue.push(finalInput);
	}

	update(dt) {
		
		this.state.update(dt);

		if(this.nextState !== null)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}
	}

	//finds the nearest opponent based on true distance (not manhattan distance, and not path finding)
	findNearestOpponentTrueDistance() {
		var nearestOpponent = null;

		if(this.character !== null && this.characterPos !== null) {
			var opponents = [];
			var activeGameObjects = this.gs.gom.getActiveGameObjects();
			var spectatorTeamId = this.gs.tm.getSpectatorTeam().id;
	
			//get all opponents
			for(var i = 0; i < activeGameObjects.length; i++) {
				//meh...don't care about the string comparison for now
				if(activeGameObjects[i].type === "character" 
				&& activeGameObjects[i].teamId !== spectatorTeamId 
				&& activeGameObjects[i].teamId !== this.user.teamId
				&& activeGameObjects[i].id !== this.user.characterId) {
					opponents.push({
						character: activeGameObjects[i],
						distanceSquared: 9999
					});
				}
			}
	
			//go through opponents, and calculate true distance squared
			for(var i = 0; i < opponents.length; i++) {
				var opponentPos = opponents[i].character.plBody.getPosition();
				var dx = opponentPos.x - this.characterPos.x;
				var dy = opponentPos.y - this.characterPos.y;
				opponents[i].distanceSquared = dx*dx + dy*dy;
			}

			//find the closest opponent
			if(opponents.length > 0) {
				nearestOpponent = opponents.reduce((acc, cur) => {return  cur.distanceSquared < acc.distanceSquared ? cur : acc})
			}
		}

		return nearestOpponent;
	}



	findaStarPathToPlayer() {
		//contact the nav grid to get a path
		var aiPos = this.characterPos;
		var userPos = this.targetCharacter.getPlanckPosition();

		if(aiPos !== null && userPos !== null)
		{
			var aiNode = this.gs.activeNavGrid.getNode(Math.round(aiPos.x), -Math.round(aiPos.y));
			var userNode = this.gs.activeNavGrid.getNode(Math.round(userPos.x), -Math.round(userPos.y));

			if(aiNode !== null && userNode !== null)
			{
				this.nodePathToCastle = this.gs.activeNavGrid.AStarSearch(aiNode, userNode);
				
				if(this.nodePathToCastle.length > 0)
				{
					this.currentNode = 0;

					this.findNextLOSNode(aiPos);
				}
			}
		}
	}

	//this is already assuming the ai has LOS to the player
	findStraightPathToPlayer() {
		var aiPos = this.characterPos;
		var userPos = this.targetCharacter.getPlanckPosition();

		this.currentNode = 0;

		if(aiPos !== null && userPos !== null)
		{
			var aiNode = this.gs.activeNavGrid.getNode(Math.round(aiPos.x), -Math.round(aiPos.y));
			var userNode = this.gs.activeNavGrid.getNode(Math.round(userPos.x), -Math.round(userPos.y));

			if(aiNode !== null && userNode !== null)
			{
				this.nodePathToCastle = [];
				this.nodePathToCastle.push(userNode);

				this.currentNode = 0;
			}
		}
	}


	assignTargetCharacter(character) {
		// logger.log("info", 'assign target called for ' + this.id);

		//if there was an old targetCharacter, unregister from their event emitter
		if(this.targetCharacter !== null && this.targetCharacterDeactivatedHandleId !== null) {
			if(this.targetCharacter.em === null) {
				var stopHere = true;
			}

			this.targetCharacter.em.unregisterForEvent("character-deactivated", this.targetCharacterDeactivatedHandleId)
			this.targetCharacterDeactivatedHandleId = null;
		}

		this.targetCharacter = character;

		//register a function for when the target character is deactivated
		if(this.targetCharacter !== null && this.targetCharacter.em !== null) {
			this.targetCharacterDeactivatedHandleId = this.targetCharacter.em.registerForEvent("character-deactivated", this.cbTargetCharacterDeactivated.bind(this));
		}
	}

	cbTargetCharacterDeactivated() {
		// logger.log("info", 'cbTargetCharacterDeactivated called for ' + this.id);
		
		if(this.targetCharacter !== null && this.targetCharacterDeactivatedHandleId !== null) {
			this.targetCharacter.em.unregisterForEvent("character-deactivated", this.targetCharacterDeactivatedHandleId)
		}

		this.targetCharacter = null;
		this.targetCharacterDeactivatedHandleId = null;
	}



	calcSeekSteering(pos) {
		var velVec = {
			x: 0,
			y: 0
		}
		var nodeTarget = this.nodePathToCastle[this.currentNode];

		//the *-1 is to flip the y coordinates for planck cooridnate plane
		var dx = nodeTarget.x - pos.x;
		var dy = (nodeTarget.y*-1) - pos.y;

		if(Math.abs(dx) === 0 && Math.abs(dy) === 0)
		{
			dx = 1;
		}
		var angle = Math.atan(dy / dx);
		
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
		const Vec2 = this.gs.pl.Vec2;
		//do line of sight tests to get the next logical node
		var nodeInLOS = true;
		while(nodeInLOS)
		{
			if(this.currentNode < this.nodePathToCastle.length-1)
			{
				var nodePos = new Vec2(this.nodePathToCastle[this.currentNode + 1].x, -this.nodePathToCastle[this.currentNode + 1].y);

				nodeInLOS = this.lineOfSightTest(pos, nodePos);
				if(nodeInLOS)
				{
					//logger.log("info", 'current node in LOS(' + this.nodePathToCastle[this.currentNode + 1].x + ',' + this.nodePathToCastle[this.currentNode + 1].y + '). Skipping the node.')
					this.currentNode++
				}
				else
				{
					//logger.log("info", 'current node NOT in LOS(' + this.nodePathToCastle[this.currentNode + 1].x + ',' + this.nodePathToCastle[this.currentNode + 1].y + ').')
				}
			}
			//final node is reached
			else
			{
				nodeInLOS = false;
			}
		}
	}



	lineOfSightTest(pos, pos2)
	{
		const Vec2 = this.gs.pl.Vec2;
		var isInLOS = true;

		var p1 = new Vec2(pos.x, pos.y);
		var p2 = new Vec2(pos2.x, pos2.y);

		this.lineOfSightObjects = [];
		this.gs.world.rayCast(p1, p2, this.lineOfSightCallback.bind(this));

		//if objects were detected in front of the ai, then calculate avoidance vector
		if(this.lineOfSightObjects.length > 0)
		{
			for(var i = 0; i < this.lineOfSightObjects.length; i++)			
			{
				if(this.lineOfSightObjects[i].fixture.getBody().getUserData().type === "wall")
				{
					isInLOS = false;
					break;
				}
			}
		}

		return isInLOS;
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