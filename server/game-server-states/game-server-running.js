const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerStopping} = require('./game-server-stopping.js');
const {UserDisconnectingState} = require('../user/user-disconnecting-state.js');
const crypto = require('crypto');

class GameServerRunning extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(dt) {
		console.log('running server enter');
		super.enter(dt);

		//this.spawnCastle();

		//testing for cpu usage on server
		//var tm = this.gs.tmm.getTilemapByID(this.gs.activeNavGrid.tmId);
		// for(var j = 0; j < 20; j++)
		// {
		// 	var z = tm.enemySpawnZones[0];

		// 	var ai = this.gs.aim.createAIAgent();
		// 	var c = this.gs.gom.createGameObject('character');
			
		// 	ai.aiAgentInit(this.gs, c.id);
			
		// 	c.ownerId = ai.id;
		// 	c.ownerType = "ai";
		// 	c.characterInit(this.gs);

		// 	var xStarting = z.xPlanck + (z.widthPlanck * Math.random());
		// 	var yStarting = z.yPlanck - (z.heightPlanck * Math.random());

		// 	c.xStarting = xStarting;
		// 	c.yStarting = yStarting;
		// 	c.hpCur = 25;
		// 	c.hpMax = 25;
		// 	c.walkingVelMagMax = 3;

		// 	ai.bForceIdle = true;

		// 	this.gs.gom.activateGameObjectId(c.id, this.cbCharacterActivatedSuccess.bind(this), this.cbCharacterActivatedFailed.bind(this));
		// }

	}

	update(dt) {
		//console.log("gameloop framenum " + this.gs.frameNum);
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

		//update characters
		for(var i = 0; i < activeGameObjects.length; i++)
		{
			activeGameObjects[i].update(dt);
		}

		//physics update
		this.gs.world.step(this.gs.physicsTimeStep, this.gs.velocityIterations, this.gs.positionIterations);

		//send an empty packet to all users
		for(var i = 0; i < activeUsers.length; i++)
		{
			var wsh = this.gs.wsm.getWebsocketByID(activeUsers[i].wsId);
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
						for(var j = 0; j < activeUsers.length; j++)
						{
							activeUsers[j].insertTrackedEntityEvent('user', user.id, {
								"eventName": "fromServerChatMessage",
								"activeUserId": user.activeId,
								"chatMsg": e.chatMsg
							})
						}
						break;
	
					case "fromClientSpawnCharacter":
						//as long as they don't already have a character controlled, create one for the user.
						if(user.characterId === null)
						{
							var c = this.gs.gom.createGameObject('character');
							c.characterInit(this.gs);
							c.ownerId = user.id;
							c.ownerType = "user";
							user.characterId = c.id;

							this.gs.gom.activateGameObjectId(c.id, this.cbCharacterActivatedSuccess.bind(this), this.cbCharacterActivatedFailed.bind(this));
						}
						break;
	
					case "fromClientKillCharacter":
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
						if(this.checkEnemyPasscode(e.enemyControlPass))
						{
							//spawn 1 enemy at the player's location
							if(e.spawnLocation === "player")
							{
								var ai = this.gs.aim.createAIAgent();
								var c = this.gs.gom.createGameObject('character');
								
								ai.aiAgentInit(this.gs, c.id);
								
								c.ownerId = ai.id;
								c.ownerType = "ai";
								c.characterInit(this.gs);
		
								//north of castle
								var xStarting = 15;
								var yStarting = -10;
		
								//south of castle
								// var xStarting = 15;
								// var yStarting = -20;
		
								//west of castle
								// var xStarting = 10;
								// var yStarting = -15;
		
								//east of castle
								// var xStarting = 20;
								// var yStarting = -15;

								var userChar = this.gs.gom.getGameObjectByID(user.characterId);
								if(userChar !== null)
								{
									var pos = userChar.plBody.getPosition();
									if(pos !== null)
									{
										xStarting = pos.x;
										yStarting = pos.y;
									}
								}
	
								c.xStarting = xStarting;
								c.yStarting = yStarting;
								c.hpCur = 25;
								c.hpMax = 25;
								c.walkingVelMagMax = 1;
								
								ai.bForceIdle = false;
	
								this.gs.gom.activateGameObjectId(c.id, this.cbCharacterActivatedSuccess.bind(this), this.cbCharacterActivatedFailed.bind(this));
							}
							//spawn 1 enemy at each red zone (enemy spawn)
							else if(e.spawnLocation === "red")
							{
								if(this.gs.activeNavGrid !== null)
								{
									var tm = this.gs.tmm.getTilemapByID(this.gs.activeNavGrid.tmId);
									if(tm !== null)
									{
										// //create 2 for congestion testing
										// var z = tm.enemySpawnZones[0];

										// //ai 1
										// var ai1 = this.gs.aim.createAIAgent();
										// var c1 = this.gs.gom.createGameObject('character');
										
										// ai1.aiAgentInit(this.gs, c1.id);
										
										// c1.ownerId = ai1.id;
										// c1.ownerType = "ai";
										// c1.characterInit(this.gs);

										// var xStarting = z.xPlanck + 1.1;
										// var yStarting = z.yPlanck - 0.5;

										// c1.xStarting = xStarting;
										// c1.yStarting = yStarting;
										// c1.hpCur = 25;
										// c1.hpMax = 25;
										// c1.walkingVelMagMax = 3;

										// this.gs.gom.activateGameObjectId(c1.id, this.cbCharacterActivatedSuccess.bind(this), this.cbCharacterActivatedFailed.bind(this));



										// //ai 2
										// var ai2 = this.gs.aim.createAIAgent();
										// var c2 = this.gs.gom.createGameObject('character');
										
										// ai2.aiAgentInit(this.gs, c2.id);
										
										// c2.ownerId = ai2.id;
										// c2.ownerType = "ai";
										// c2.characterInit(this.gs);

										// var xStarting = z.xPlanck + 1.9;
										// var yStarting = z.yPlanck - 0.5;
			
										// c2.xStarting = xStarting;
										// c2.yStarting = yStarting;
										// c2.hpCur = 25;
										// c2.hpMax = 25;
										// c2.walkingVelMagMax = 1;

										// this.gs.gom.activateGameObjectId(c2.id, this.cbCharacterActivatedSuccess.bind(this), this.cbCharacterActivatedFailed.bind(this));


										//create one for each red zone
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
											c.hpCur = 25;
											c.hpMax = 25;
											c.walkingVelMagMax = 1.8;

											this.gs.gom.activateGameObjectId(c.id, this.cbCharacterActivatedSuccess.bind(this), this.cbCharacterActivatedFailed.bind(this));
										}
									}
								}
							}
							//reusing this event to respawn the castle becasue i don't feel like making another event and exporting it.
							else if (e.spawnLocation === "respawnCastle")
							{
								this.spawnCastle();
							}
							//reusing this event to respawn the castle becasue i don't feel like making another event and exporting it.
							else if (e.spawnLocation === "destroyCastle")
							{
								if(this.gs.castleObject !== null)
								{
									this.gs.castleObject.hpCur = 0;
								}
							}
						}

						break;

					case "fromClientEnemyBehavior":
						if(this.checkEnemyPasscode(e.enemyControlPass))
						{
							if(e.enemyBehavior === "seek-castle")
							{
								var aiAgents = this.gs.aim.getAIAgents();

								for(var j = 0 ; j < aiAgents.length; j++)
								{
									aiAgents[j].bForceIdle = false;
								}
							}
							// else if(e.enemyBehavior === "seek-player")
							// {
							// 	var aiAgents = this.gs.aim.getAIAgents();

							// 	for(var j = 0 ; j < aiAgents.length; j++)
							// 	{
							// 		aiAgents[j].seekPlayer(user);
							// 	}
							// }
							else if(e.enemyBehavior === "stop")
							{
								var aiAgents = this.gs.aim.getAIAgents();

								for(var j = 0 ; j < aiAgents.length; j++)
								{
									//aiAgents[j].stop();
									aiAgents[j].bForceIdle = true;
								}
							}
						}

						break;

					case "fromClientKillAllEnemies":
						if(this.checkEnemyPasscode(e.enemyControlPass))
						{
							var allAiAgents = this.gs.aim.getAIAgents();
							for(var j = 0 ; j < allAiAgents.length; j++)
							{
								this.gs.aim.destroyAIAgent(allAiAgents[j].id);
								this.destroyOwnersCharacter(allAiAgents[j].id, "ai");
							}
						}

						break;

					case "fromClientTogglePvp":
						if(this.checkEnemyPasscode(e.enemyControlPass))
						{
							this.gs.pvpEnabled = !this.gs.pvpEnabled;

							//send a message to each active player to tell them about pvp
							var killFeedMessage = "====== PVP DISABLED ======";
							if(this.gs.pvpEnabled)
							{
								killFeedMessage = "====== PVP ENABLED ======";
							}
							var activeUsers = this.gs.um.getActiveUsers();
							for(var j = 0; j < activeUsers.length; j++)
							{
								activeUsers[j].trackedEvents.push({
									"eventName": "killfeedMsg",
									"killfeedMsg": killFeedMessage
								});
							}
						}

						
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

	spawnCastle() {
		if(this.gs.castleObject === null)
		{
			//create castle object 
			var castle = this.gs.gom.createGameObject("castle");
			this.gs.castleObject = castle; //temporary location for it

			var xc = this.gs.activeNavGrid.castleNode.x;
			var yc = -this.gs.activeNavGrid.castleNode.y;

			//get a random user for the name of the castle for now
			var castleName = "Castle";
			var activeUsers = this.gs.um.getActiveUsers();

			var randIndex = Math.floor(Math.random() * activeUsers.length);
			if(randIndex === activeUsers.length)
			{
				randIndex = activeUsers.length-1;
			}

			if(randIndex >= 0)
			{
				castleName = activeUsers[randIndex].username + "'s Castle";
			}

			castle.castleInit(this.gs, xc, yc, castleName);

			//just activate here, fuckin whatever
			this.gs.gom.activateGameObjectId(castle.id, castle.castlePostActivated.bind(castle), castle.cbCastleActivatedFailed.bind(castle));
		}
	}

	//quick and dirty check for enemy control password
	checkEnemyPasscode(input)
	{
		var result = false;

		//quick and dirty hash
		var hash = crypto.createHash('md5').update(input).digest('hex');
		
		//yup
		if(hash === "dae730c0502583c56927fe31c600536d")
		{
			result = true;
		}

		return result;
	}


	cbCharacterActivatedSuccess(characterId) {
		var c = this.gs.gom.getGameObjectByID(characterId);

		//just to be safe
		if(c && c.isActive)
		{
			c.characterPostActivated();

			//eh, just put it in here. Probably gonna be moved later.
			if(c.ownerType === "ai")
			{
				var ai = this.gs.aim.getAIAgentByID(c.ownerId);
				ai.postCharacterActivate(c.id);
			}
		}

		
	}

	cbCharacterActivatedFailed(characterId, errorMessage) {
		//character creation failed for some reason. So undo all the stuff you did on character creation
		var c = this.gs.gom.getGameObjectByID(characterId);
		if(c)
		{
			var owner = this.globalfuncs.getOwner(this.gs, c.ownerId, c.ownerType);
		}

		//reset the user's characterId to null;
		if(owner)
		{
			owner.characterId = null;	
		}

		//reset character's ownerId
		if(c)
		{
			c.ownerId = null
			c.ownerType = "";
			c.characterDeinit();
		}	

		//it should already be deactivated, but do it anyway
		this.gs.gom.deactivateGameObjectId(characterId);

		//destroy character
		this.gs.gom.destroyGameObject(characterId);
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
				c.characterPredeactivated();
				this.gs.gom.deactivateGameObjectId(c.id, this.cbDeactivateCharacterSuccess.bind(this));

			}
		}
	}

	cbDeactivateCharacterSuccess(characterId)
	{
		var c = this.gs.gom.getGameObjectByID(characterId);
		var owner = null;
		var ownerType = "";
		var ownerId = null;
		
		if(c !== null)
		{
			ownerType = c.ownerType;
			ownerId = c.ownerId;
			owner = this.globalfuncs.getOwner(this.gs, ownerId, ownerType);
		}
		
		//hacky as shit, but delete the ai agent as well if the character was controlled by an ai
		if(owner !== null && ownerType === "ai")
		{
			owner.aiAgentDeinit();
			this.gs.aim.destroyAIAgent(ownerId);
		}

		//destroy the character game object
		if(c !== null)
		{
			c.characterDeinit();
			this.gs.gom.destroyGameObject(c.id);
		}

		//disassociate the owner from the character
		if(owner !== null)
		{
			owner.characterId = null;
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
			this.gs.um.deactivateUserId(u.id);
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
						killerOwner.userKillCount--;	
					}
					else
					{
						killerOwner.userKillCount++;
					}
					
					var activeUsers = this.gs.um.getActiveUsers();
					for(var i = 0; i < activeUsers.length; i++)
					{
						activeUsers[i].trackedEvents.push({
							"eventName": "updateUserInfo",
							"userId": killerOwner.id,
							"userKillCount": killerOwner.userKillCount
						})
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

				console.log(killFeedMessage);

				//create event for clients for killfeed
				var activeUsers = this.gs.um.getActiveUsers();
				for(var i = 0; i < activeUsers.length; i++)
				{
					activeUsers[i].trackedEvents.push({
						"eventName": "killfeedMsg",
						"killfeedMsg": killFeedMessage
					});
				}
			}
		}
	}

}



exports.GameServerRunning = GameServerRunning;