const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerStopping} = require('./game-server-stopping.js');
const {UserDisconnectingState} = require('../user/user-disconnecting-state.js');
const crypto = require('crypto');
const logger = require('../../logger.js');

class GameServerRunning extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(dt) {
		logger.log("info", 'running server enter');
		super.enter(dt);
	}

	update(dt) {
		//logger.log("info", "gameloop framenum " + this.gs.frameNum);
		var activeUsers = this.gs.um.getActiveUsers();
		var activeGameObjects = this.gs.gom.getActiveGameObjects();
		var aiAgents = this.gs.aim.getAIAgents();
		
		//process incoming messages here (might be split up based on type of messages later. Like process input HERE, and other messages later)
		for(var i = 0; i < activeUsers.length; i++)
		{
			this.processClientEvents(activeUsers[i]);
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

		//ECS TODO: CHANGE. Have the pre-physics systems run here.

		//update characters
		for(var i = 0; i < activeGameObjects.length; i++)
		{
			activeGameObjects[i].update(dt);
		}

		//physics update
		this.gs.world.step(this.gs.physicsTimeStep, this.gs.velocityIterations, this.gs.positionIterations);

		//ECS TODO: CHANGE. Have the post-physics systems run here.

		//send an empty packet to all users
		for(var i = 0; i < activeUsers.length; i++)
		{
			var wsh = this.gs.wsm.getWebsocketByID(activeUsers[i].wsId);
			if(wsh !== null)
			{
				wsh.createPacketForUser();
			}
		}


		//ECS TODO: CHANGE. Have the Life Cycle systems run here.


		//update managers
		this.gs.wsm.update(dt);
		this.gs.um.update(dt);
		this.gs.gom.update(dt);
		this.gs.tmm.update(dt);
		this.gs.ngm.update(dt);
		this.gs.aim.update(dt);
		this.gs.tm.update(dt);

		this.gs.frameNum++;

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
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

	processClientEvents(user) {
		var activeUsers = this.gs.um.getActiveUsers();

		if(user.clientToServerEvents.length > 0)
		{
			for(var i = 0; i < user.clientToServerEvents.length; i++)
			{
				var e = user.clientToServerEvents[i];
				switch(e.eventName)
				{
					case "fromClientChatMessage":
						logger.log("info", "Player: " + user.username + ", event: fromClientChatMessage: " + e.chatMsg);
						for(var j = 0; j < activeUsers.length; j++)
						{
							activeUsers[j].insertTrackedEntityEvent('user', user.id, {
								"eventName": "fromServerChatMessage",
								"userId": user.id,
								"chatMsg": e.chatMsg
							})
						}
						
						break;
	
					case "fromClientSpawnCharacter":
						var bFail = false;
						var userMessage = "";
						var broadcastMessage = "";
						var logEventMessage = "";
						var tm = null;
						logEventMessage = "Player: " + user.username + ", event: fromClientSpawnCharacter: ";

						//as long as they don't already have a character controlled, create one for the user.
						if(user.characterId !== null)
						{
							bFail = true;
							userMessage = "You already have a character spawned.";
						}

						//check if the navgrid exists (to be safe)
						if(!bFail && this.gs.activeNavGrid === null)
						{
							bFail = true;
							userMessage = "Player spawn failed. No active nav grid.";
						}

						//get the tilemap
						if(!bFail)
						{
							tm = this.gs.tmm.getTilemapByID(this.gs.activeNavGrid.tmId);
							if(tm === null)
							{
								bFail = true;
								userMessage = "Player spawn failed. Could not get the tilemap.";
							}
						}
						
						if(!bFail)
						{
							if(tm.playerSpawnZones.length === 0)
							{
								bFail = true;
								userMessage = "Player spawn failed. There are no spawn zones set for players.";
							}
						}

						//spawn the player
						if(!bFail)
						{
							//pick a random spawn zone
							var zIndex = 0;

							zIndex = Math.floor(Math.random() * tm.playerSpawnZones.length);
							if(zIndex === tm.playerSpawnZones.length)
							{
								zIndex = tm.playerSpawnZones.length-1
							}

							var z = tm.playerSpawnZones[zIndex];

							//ECS TODO: REMOVE. Change this to call a function to create an entity "Character". Then chnage this to grab each component and change them appropriately.
							var c = this.gs.gom.createGameObject('character');
							c.characterInit(this.gs);
							c.ownerId = user.id;
							c.ownerType = "user";
							user.characterId = c.id;
							c.hpMax = 25;
							c.hpCur = 25;

							
							var xStarting = z.xPlanck + (z.widthPlanck * Math.random());
							var yStarting = z.yPlanck - (z.heightPlanck * Math.random());

							c.xStarting = xStarting;
							c.yStarting = yStarting;
							

							broadcastMessage = "Player '" + user.username + "' has spawned.";
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
								
								c.ownerId = ai.id;
								c.ownerType = "ai";
								c.characterInit(this.gs);

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
									
									c.ownerId = ai.id;
									c.ownerType = "ai";
									c.characterInit(this.gs);

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

					case "fromClientTogglePvp":
						user.updateUserPvpFlag(!user.pvpEnabled);
						var broadcastMessage = "Player '" + user.username + "' updated his pvp to " + user.pvpEnabled;
						var logEventMessage = "Player: " + user.username + ", event: fromClientTogglePvp: ";

						//send out usermessage and/or broadcast message
						if(broadcastMessage !== "")
						{
							this.broadcastResponseMessage(broadcastMessage, logEventMessage);
						}
						break;

					case "fromClientJoinTeam":
						var existingTeamId = user.teamId;
						var teams = this.gs.tm.getTeams();
						var newTeamId = null;
						var newTeam = teams.find((x) => {return x.slotNum === e.slotNum;});
						var broadcastMessage = "";
						var logEventMessage = "";
						if(newTeam) {
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
						user.fromClientFragmentEvent(e);
						var stopHere = true;
						break;
					default:
						//intentionally blank
						break;
				}
			}
	
			//delete all events
			user.clientToServerEvents.length = 0;
		}
	}

	userResponseMessage(user, userMessage, logEventMessage) {
		logger.log("info", logEventMessage + userMessage);
		user.insertServerToClientEvent({
			"eventName": "killfeedMsg",
			"killfeedMsg": userMessage
		});
	}

	broadcastResponseMessage(broadcastMessage, logEventMessage) {
		logger.log("info", logEventMessage + " (broadcastMessage: " + broadcastMessage + ")");
		var activeUsers = this.gs.um.getActiveUsers();
		for(var j = 0; j < activeUsers.length; j++)
		{
			activeUsers[j].insertServerToClientEvent({
				"eventName": "killfeedMsg",
				"killfeedMsg": broadcastMessage
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

		//ECS TODO: REMOVE. Make it add a "gameObjectDestroy" tag or something like that instead of actually destroying it.

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
			var activeUsers = this.gs.um.getActiveUsers();
			for(var i = 0; i < activeUsers.length; i++)
			{
				activeUsers[i].deleteTrackedEntity("user", userId);
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

				//create event for clients for killfeed
				var activeUsers = this.gs.um.getActiveUsers();
				for(var i = 0; i < activeUsers.length; i++)
				{
					activeUsers[i].insertServerToClientEvent({
						"eventName": "killfeedMsg",
						"killfeedMsg": killFeedMessage
					});
				}
			}
		}
	}

}



exports.GameServerRunning = GameServerRunning;