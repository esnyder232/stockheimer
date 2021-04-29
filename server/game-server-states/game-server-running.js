const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerStopping} = require('./game-server-stopping.js');
const {AiConnectingState} = require('../user/ai-connecting-state.js');
const {Round} = require('../classes/round.js');
const GameConstants = require('../../shared_files/game-constants.json');

const crypto = require('crypto');
const logger = require('../../logger.js');

class GameServerRunning extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(dt) {
		logger.log("info", 'running server enter');
		super.enter(dt);

		//start a round
		this.gs.theRound = new Round();
		this.gs.theRound.roundInit(this.gs);
	}

	update(dt) {
		//logger.log("info", "gameloop framenum " + this.gs.frameNum);
		var activeUsers = this.gs.um.getActiveUsers();
		var userAgents = this.gs.uam.getUserAgents();
		var activeGameObjects = this.gs.gom.getActiveGameObjects();
		var aiAgents = this.gs.aim.getAIAgents();
		
		//process incoming messages here (might be split up based on type of messages later. Like process input HERE, and other messages later)
		for(var i = 0; i < userAgents.length; i++)
		{
			this.processClientEvents(userAgents[i]);
		}

		//update users
		for(var i = 0; i < activeUsers.length; i++)
		{
			activeUsers[i].update(dt);
		}

		//update ai
		for(var i = 0; i < aiAgents.length; i++) 
		{
			aiAgents[i].update(dt);
		}

		//update characters
		for(var i = 0; i < activeGameObjects.length; i++)
		{
			activeGameObjects[i].update(dt);
		}

		//physics update
		this.gs.world.step(this.gs.physicsTimeStep, this.gs.velocityIterations, this.gs.positionIterations);


		//update round
		this.gs.theRound.update(dt);

		//update user agents to fill each user's packet with events
		for(var i = 0; i < userAgents.length; i++)
		{
			userAgents[i].update(dt);
		}

		//create/send packet for all useragents
		for(var i = 0; i < userAgents.length; i++)
		{
			var wsh = this.gs.wsm.getWebsocketByID(userAgents[i].wsId);
			if(wsh !== null)
			{
				wsh.createPacketForUser();
			}
		}

		//update managers
		this.gs.wsm.update(dt);
		this.gs.um.update(dt);
		this.gs.gom.update(dt);
		this.gs.tmm.update(dt);
		this.gs.ngm.update(dt);
		this.gs.aim.update(dt);
		this.gs.tm.update(dt);
		this.gs.pm.update(dt);
		this.gs.uam.update(dt);

		this.gs.frameNum++;

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);

		this.gs.theRound.deinit();
	}
	
	stopGameRequest() {
		this.gs.nextGameState = new GameServerStopping(this.gs);
	}

	joinRequest() {
		return "success";
	}

	websocketClosed(wsh) {
		var user = this.gs.um.getUserByID(wsh.userId);

		if(user)
		{
			user.bDisconnected = true;
		}

		this.gs.wsm.destroyWebsocket(wsh);
	}

	websocketErrored(wsh) {
		var user = this.gs.um.getUserByID(wsh.userId);

		//put user in disconnecting state
		//not sure why they would not have a user at this point, but better safe than sorry.
		if(user)
		{
			user.bDisconnected = true;
		}

		this.gs.wsm.destroyWebsocket(wsh);
	}

	processClientEvents(ua) {
		var user = this.gs.um.getUserByID(ua.userId);
		if(user !== null) {
			if(ua.clientToServerEvents.length > 0) {
				for(var i = 0; i < ua.clientToServerEvents.length; i++) {
					var e = ua.clientToServerEvents[i];
					switch(e.eventName)
					{
						case "fromClientChatMessage":
							var userAgents = this.gs.uam.getUserAgents();
							logger.log("info", "Player: " + user.username + ", event: fromClientChatMessage: " + e.chatMsg);
							for(var j = 0; j < userAgents.length; j++) {
								userAgents[j].insertTrackedEntityEvent('user', user.id, {
									"eventName": "fromServerChatMessage",
									"userId": user.id,
									"chatMsg": e.chatMsg
								})
							}
							
							break;
		
						case "fromClientKillCharacter":
							logger.log("info", "Player: " + user.username + ", event: fromClientKillCharacter: ");
							//as long as they have an existing character, kill it.
							if(user.characterId !== null)
							{
								var c = this.gs.gom.getGameObjectByID(user.characterId);
	
								if(c && c.ownerId === user.id)
								{
									c.hpCur = 0;
								}
							}
							break;

						case "fromClientSpawnAi":
							logger.log("info", "Player: " + user.username + ", event: fromClientSpawnAi: teamId: " + e.teamId);
							var aiUser = this.gs.um.createUser();
							aiUser.username = "AI " + aiUser.id;
							aiUser.stateName = "user-disconnected-state";
							aiUser.userType = "ai";
							aiUser.updateTeamId(e.teamId);

							//create an ai agent
							//var ua = this.uam.createUserAgent();

							//At this point, the user was only created, not initialized. So setup user now.
							aiUser.userInit(this.gs);
							//user.aiAgentId = ua.id;
				
							//activate the user
							this.gs.um.activateUserId(aiUser.id, this.cbAiUserActivateSuccess.bind(this), this.cbAiUserActivateFail.bind(this));
				
							//setup the user's nextState
							aiUser.nextState = new AiConnectingState(aiUser);
			
							break;

						case "fromClientKillAllAi":
							logger.log("info", "Player: " + user.username + ", event: fromClientKillAllAi: teamId: " + e.teamId);
							var activeUsers = this.gs.um.getActiveUsers();
							for(var i = 0; i < activeUsers.length; i++) {
								if(activeUsers[i].userType === "ai" && activeUsers[i].teamId === e.teamId) {
									activeUsers[i].bDisconnected = true;
								}
							}
							break;

						case "fromClientKillRandomAi":
							logger.log("info", "Player: " + user.username + ", event: fromClientKillRandomAi: teamId: " + e.teamId);
							var activeUsers = this.gs.um.getActiveUsers();
							var teamAiUsers = [];

							for(var i = 0; i < activeUsers.length; i++) {
								if(activeUsers[i].userType === "ai" && activeUsers[i].teamId === e.teamId) {
									teamAiUsers.push(activeUsers[i]);
								}
							}

							if(teamAiUsers.length > 0) {
								var killIndex = Math.floor(teamAiUsers.length * Math.random());

								if(killIndex === teamAiUsers.length) {
									killIndex = teamAiUsers.length-1
								}

								teamAiUsers[killIndex].bDisconnected = true;
							}
							break;
							
						case "fromClientInputs":
							user.inputQueue.push(e);
							break;
	
						case "fromClientReadyToPlay":
							user.bReadyToPlay = true;
							break;
	
						case "fromClientSpawnEnemy":
							var bFail = false;
							var broadcastMessage = "";
							var userMessage = "";
							var logEventMessage = "";
							logEventMessage = "Player: " + user.username + ", event: fromClientSpawnEnemy " + e.spawnLocation + ": ";
	
							//spawn 1 enemy at the player's location
							if(e.spawnLocation === "player")
							{
								//check if the user has a character
								var userChar = this.gs.gom.getGameObjectByID(user.characterId);
								if(userChar === null)
								{
									bFail = true;
									userMessage = "You must have a character spawned to spawn enemies around you.";
								}
	
								//check enemy cap
								if(!bFail)
								{
									bFail = this.checkEnemyCap();
									if(bFail)
									{
										userMessage = "Only " + this.gs.enemyCap + " enemies are allowed to spawn with this tech demo. Kill some enemies to spawn more."
									}
								}
								
								if(!bFail)
								{
									var ai = this.gs.aim.createAIAgent();
									var c = this.gs.gom.createGameObject('character');
									
									ai.aiAgentInit(this.gs, c.id);
									
									//randomize the ai team for now
									var team = this.gs.tm.getRandomTeam();
									if(team !== null) {
										ai.teamId = team.id;
									}
									
									c.ownerId = ai.id;
									c.ownerType = "ai";
									c.characterInit(this.gs);
									c.teamId = ai.teamId;
	
									var pos = userChar.getPlanckPosition();
									var xStarting = (pos.x - 1) + (2 * Math.random());
									var yStarting = (pos.y + 1) - (2 * Math.random());
		
									c.xStarting = xStarting;
									c.yStarting = yStarting;
									c.hpCur = 5;
									c.hpMax = 5;
									c.walkingVelMagMax = 1.5;
		
	
									broadcastMessage = "Player '" + user.username + "' spawned 1 enemy at player's location.";
								}
							}
							//spawn 1 enemy at each red zone (enemy spawn)
							else if(e.spawnLocation === "red")
							{
								var tm = null;
	
								//check enemy cap
								if(!bFail)
								{
									bFail = this.checkEnemyCap();
									if(bFail)
									{
										userMessage = "Only " + this.gs.enemyCap + " enemies are allowed to spawn with this tech demo. Kill some enemies to spawn more."
									}
								}
	
								//check if the navgrid exists (to be safe)
								if(!bFail && this.gs.activeNavGrid === null)
								{
									bFail = true;
									userMessage = "Enemy spawn failed. No active nav grid.";
								}
	
								//get the tilemap
								if(!bFail)
								{
									tm = this.gs.tmm.getTilemapByID(this.gs.activeNavGrid.tmId);
									if(tm === null)
									{
										bFail = true;
										userMessage = "Enemy spawn failed. Could not get the tilemap.";
									}
								}
								
								//spawn enemies at each red zone.
								if(!bFail)
								{
									for(var j = 0; j < tm.enemySpawnZones.length; j++)
									{
										var z = tm.enemySpawnZones[j];
	
										var ai = this.gs.aim.createAIAgent();
										var c = this.gs.gom.createGameObject('character');
										
										ai.aiAgentInit(this.gs, c.id);
										
										//randomize the ai team for now
										var team = this.gs.tm.getRandomTeam();
										if(team !== null) {
											ai.teamId = team.id;
										}
	
										c.ownerId = ai.id;
										c.ownerType = "ai";
										c.characterInit(this.gs);
										c.teamId = ai.teamId;
	
										var xStarting = z.xPlanck + (z.widthPlanck * Math.random());
										var yStarting = z.yPlanck - (z.heightPlanck * Math.random());
	
										c.xStarting = xStarting;
										c.yStarting = yStarting;
										c.hpCur = 5;
										c.hpMax = 5;
										c.walkingVelMagMax = 1.5;
	
	
										broadcastMessage = "Player '" + user.username + "' spawned 1 enemy on each red zone.";
									}
								}
							}
							//reusing this event to respawn the castle becasue i don't feel like making another event and exporting it.
							else if (e.spawnLocation === "respawnCastle")
							{
								if(this.gs.castleObject !== null)
								{
									bFail = true;
									userMessage = "Only one castle can exist at a time."
								}
	
								if(!bFail)
								{
									//create castle object 
									var castle = this.gs.gom.createGameObject("castle");
									this.gs.castleObject = castle; //temporary location for it
	
									var xc = this.gs.activeNavGrid.castleNode.x;
									var yc = -this.gs.activeNavGrid.castleNode.y;
									
									var castleName = user.username + "'s Castle";
	
									castle.castleInit(this.gs, xc, yc, castleName);
	
	
									broadcastMessage = "Player '" + user.username + "' spawned '" + castleName + "'";
								}
							}
	
	
							//send out usermessage and/or broadcast message
							if(userMessage !== "")
							{
								this.userResponseMessage(user, userMessage, logEventMessage);
							}
							if(broadcastMessage !== "")
							{
								this.broadcastResponseMessage(broadcastMessage, logEventMessage);
							}
	
							break;
	
						case "fromClientJoinTeam":
							var existingTeamId = user.teamId;
							var newTeamId = null;
							var broadcastMessage = "";
							var logEventMessage = "";
	
							var newTeam = this.gs.tm.getTeamByID(e.teamId);
							
							if(newTeam !== null) {
								newTeamId = newTeam.id;
							}
	
							//if the new team is different than the existing, change it, and send an event
							if(newTeamId !== existingTeamId && newTeamId !== null)
							{
								user.updateTeamId(newTeamId);
	
								broadcastMessage = "Player '" + user.username + "' joined " + newTeam.name;
								logEventMessage = "Player: " + user.username + ", event: fromClientJoinTeam: joined " + newTeam.name + "(" + newTeamId + ")";
							}
	
							//send out usermessage and/or broadcast message
							if(broadcastMessage !== "")
							{
								this.broadcastResponseMessage(broadcastMessage, logEventMessage);
							}
	
							break;
	
						case "fragmentStart":
						case "fragmentContinue":
						case "fragmentEnd":
							ua.fromClientFragmentEvent(e);
							break;
						default:
							//intentionally blank
							break;
					}
				}
		
				//delete all events
				ua.clientToServerEvents.length = 0;
			}
	
		}
	}


	cbAiUserActivateSuccess(id) {
		//logger.log("info", 'user activation success CB called');

		//call the user's post activation step
		var u = this.gs.um.getUserByID(id);
		if(u) {
			u.userPostActivated();
		}
	}

	//if ai user fails to be activated
	cbAiUserActivateFail(id, failedReason) {
		//logger.log("info", 'user activation failed CB called');

		var user = this.gs.um.getUserByID(id);

		//unsetup the users state
		if(user !== null){
			user.nextState = null;
			
			//unsetup the user
			user.userDeinit();
		}
	}



	userResponseMessage(user, userMessage, logEventMessage) {
		logger.log("info", logEventMessage + userMessage);
		var ua = this.gs.uam.getUserAgentByID(user.userAgentId);
		if(ua !== null) {
			ua.insertServerToClientEvent({
				"eventName": "debugMsg",
				"debugMsg": userMessage
			});
		}
	}

	broadcastResponseMessage(broadcastMessage, logEventMessage) {
		logger.log("info", logEventMessage + " (broadcastMessage: " + broadcastMessage + ")");
		var userAgents = this.gs.uam.getUserAgents();
		for(var j = 0; j < userAgents.length; j++)
		{
			userAgents[j].insertServerToClientEvent({
				"eventName": "debugMsg",
				"debugMsg": broadcastMessage
			});
		}
	}
	


	checkEnemyCap() {
		var bFail = false;
		var enemyNum = this.gs.aim.getAIAgents().length;
		if(enemyNum >= this.gs.enemyCap)
		{
			bFail = true;
		}

		return bFail;
	}


	destroyOwnersCharacter(ownerId, ownerType)
	{
		var owner = this.globalfuncs.getOwner(this.gs, ownerId, ownerType);

		//as long as they have an existing character, kill it.
		if(owner !== null && owner.characterId !== null)
		{
			var c = this.gs.gom.getGameObjectByID(owner.characterId);

			if(c && c.ownerId === owner.id)
			{
				this.gs.gom.destroyGameObject(c.id);
			}
		}
	}


	//deactivates the user and sends events out to the clients
	deactivateUserId(userId) {
		var u = this.gs.um.getUserByID(userId);
		if(u && u.isActive)
		{
			//tell existing users about the user that disconnected
			var userAgents = this.gs.uam.getUserAgents();
			for(var i = 0; i < userAgents.length; i++)
			{
				userAgents[i].deleteTrackedEntity("user", userId);
			}

			//deactivate the user in the server manager
			this.gs.um.deactivateUserId(u.id, this.gs.cbUserDeactivateSuccess.bind(this.gs));
		}
	}


	characterDied(characterId) {
		var c = this.gs.gom.getGameObjectByID(characterId);

		if(c !== null)
		{
			//get the killer
			var killerOwner = this.gs.globalfuncs.getOwner(this.gs, c.lastHitByOwnerId, c.lastHitByOwnerType);

			//get the victim
			var victimOwner = this.gs.globalfuncs.getOwner(this.gs, c.ownerId, c.ownerType);

			//increase the users killcount if applicable, and announce it in the kill feed.
			//This will probably be gone later or moved somewhere else later.
			if(killerOwner !== null && victimOwner !== null)
			{
				//if the killer is a user, increase that user's killcount
				if(c.lastHitByOwnerType === "user")
				{
					if(killerOwner.id === victimOwner.id && c.ownerType === "user")
					{
						killerOwner.updateKillCount(-1);
					}
					else
					{
						killerOwner.updateKillCount(1);
					}
				}

				//announce the killer and victim in the kill feed
				var killFeedMessage = "";

				if(killerOwner.id === victimOwner.id && c.ownerType === "user")
				{
					killFeedMessage = killerOwner.username + " decided to kill himself."
				}
				else
				{
					killFeedMessage = killerOwner.username + " killed " + victimOwner.username;
				}

				logger.log("info", killFeedMessage);

				var killerType = GameConstants.OwnerTypes[c.lastHitByOwnerType];
				var victimType = GameConstants.OwnerTypes[c.ownerType];

				if(killerType === undefined) {
					killerType = GameConstants.OwnerTypes["none"];
				}

				if(victimType === undefined) {
					victimType = GameConstants.OwnerTypes["none"];
				}

				//create event for clients for killfeed
				var userAgents = this.gs.uam.getUserAgents();
				for(var i = 0; i < userAgents.length; i++)
				{
					userAgents[i].insertServerToClientEvent({
						"eventName": "killFeedMsg",
						"killerId": killerOwner.id,
						"killerType": killerType,
						"killerName": killerOwner.username,
						"killerTeam": killerOwner.teamId,
						"victimId": victimOwner.id,
						"victimType": victimType,
						"victimName": victimOwner.username,
						"victimTeam": victimOwner.teamId
					});
				}
			}
		}
	}

}



exports.GameServerRunning = GameServerRunning;