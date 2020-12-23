const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerStopping} = require('./game-server-stopping.js');
const {UserDisconnectingState} = require('../user/user-disconnecting-state.js');

class GameServerRunning extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(dt) {
		console.log('running server enter');
		super.enter(dt);
	}

	update(dt) {
		var activeUsers = this.gs.um.getActiveUsers();
		var activeGameObjects = this.gs.gom.getActiveGameObjects();
		
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
							c.userId = user.id;
							user.characterId = c.id;

							this.gs.gom.activateGameObjectId(c.id, this.cbCharacterActivatedSuccess.bind(this), this.cbCharacterActivatedFailed.bind(this));
						}
						break;
	
					case "fromClientKillCharacter":
						//as long as they have an existing character, kill it.
						if(user.characterId !== null)
						{
							var c = this.gs.gom.getGameObjectByID(user.characterId);

							if(c && c.userId === user.id)
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
						
						break;

					case "fromClientKillAllEnemies":
						
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

	cbCharacterActivatedSuccess(characterId) {
		var c = this.gs.gom.getGameObjectByID(characterId);

		//just to be safe
		if(c && c.isActive)
		{
			c.characterPostActivated();
		}
	}

	cbCharacterActivatedFailed(characterId, errorMessage) {
		//character creation failed for some reason. So undo all the stuff you did on character creation
		var c = this.gs.gom.getGameObjectByID(characterId);
		if(c)
		{
			var u = this.gs.um.getUserByID(c.userId);
		}

		//reset the user's characterId to null;
		if(u)
		{
			u.characterId = null;	
		}

		//reset character's userId
		if(c)
		{
			c.userId = null
			c.characterDeinit();
		}	

		//it should already be deactivated, but do it anyway
		this.gs.gom.deactivateGameObjectId(characterId);

		//destroy character
		this.gs.gom.destroyGameObject(characterId);
	}


	destroyUsersCharacter(user)
	{
		//as long as they have an existing character, kill it.
		if(user.characterId !== null)
		{
			var c = this.gs.gom.getGameObjectByID(user.characterId);

			if(c && c.userId === user.id)
			{
				c.characterPredeactivated();
				this.gs.gom.deactivateGameObjectId(c.id, this.cbDeactivateCharacterSuccess.bind(this));

				user.characterId = null;
				c.userId = null;
			}
		}
	}

	cbDeactivateCharacterSuccess(characterId)
	{
		var c = this.gs.gom.getGameObjectByID(characterId);
		if(c)
		{
			c.characterDeinit();
			this.gs.gom.destroyGameObject(c.id);
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
				// activeUsers[i].trackedEvents.push({
				// 	"eventName": "userDisconnected",
				// 	"userId": u.id
				// });
				activeUsers[i].deleteTrackedEntity("user", userId);
			}

			//deactivate the user in the server manager
			this.gs.um.deactivateUserId(u.id);
		}
	}
}



exports.GameServerRunning = GameServerRunning;