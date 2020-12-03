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
		var playingUsers = this.gs.um.getPlayingUsers();
		var activeCharacters = this.gs.cm.getActiveCharacters();
		var projectiles = this.gs.pm.projectileArray;
		
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
		for(var i = 0; i < activeCharacters.length; i++)
		{
			activeCharacters[i].update(dt);
		}

		//update projectiles
		for(var i = 0; i < projectiles.length; i++)
		{
			projectiles[i].update(dt);
		}

		//physics update
		this.gs.world.step(this.gs.physicsTimeStep, this.gs.velocityIterations, this.gs.positionIterations);

		//update systems
		this.gs.prioritySystem.update(dt);

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
		this.gs.cm.update(dt);
		this.gs.pm.update(dt);

		this.gs.frameNum++;

		super.update(dt);
	}

	exit(dt) {
		console.log('running server exit');
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

		//put user in disconnecting state if it was active
		//Its important to check if its active, because it may not have been activated yet from the handshake since we are doing transactions now in the userManager
		if(user && user.isActive)
		{
			user.nextState = new UserDisconnectingState(user);
			this.gs.wsm.destroyWebsocket(wsh);
		}
	}

	websocketErrored(wsh) {
		var user = this.gs.um.getUserByID(wsh.userId);

		//put user in disconnecting state
		//not sure why they would not have a user at this point, but better safe than sorry.
		if(user)
		{
			user.nextState = new UserDisconnectingState(user);
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
							activeUsers[j].trackedEvents.push({
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
							var c = this.gs.cm.createCharacter();
							c.characterInit(this.gs);
							c.userId = user.id;
							user.characterId = c.id;

							this.gs.cm.activateCharacterId(c.id, this.cbCharacterActivatedSuccess.bind(this), this.cbCharacterActivatedFailed.bind(this));
						}
						break;
	
					case "fromClientKillCharacter":
						this.destroyUsersCharacter(user);
						break;

					case "fromClientInputs":
						user.inputQueue.push(e);
						break;

					case "fromClientReadyToPlay":
						user.bReadyToPlay = true;
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
		//var activeUsers = this.gs.um.getActiveUsers();
		var c = this.gs.cm.getCharacterByID(characterId);

		//just to be safe
		if(c && c.isActive)
		{
			c.characterPostActivated();
		}
	}

	cbCharacterActivatedFailed(characterId, errorMessage) {
		//character creation failed for some reason. So undo all the stuff you did on character creation
		var c = this.gs.cm.getCharacterByID(characterId);
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
		this.gs.cm.deactivateCharacterId(characterId);

		//destroy character
		this.gs.cm.destroyCharacterId(characterId);
	}


	destroyUsersCharacter(user)
	{
		//as long as they have an existing character, kill it.
		if(user.characterId !== null)
		{
			var c = this.gs.cm.getCharacterByID(user.characterId);

			if(c && c.userId === user.id)
			{
				c.characterPredeactivated();
				this.gs.cm.deactivateCharacterId(c.id, this.cbDeactivateCharacterSuccess.bind(this));

				user.characterId = null;
				c.userId = null;
			}
		}
	}

	cbDeactivateCharacterSuccess(characterId)
	{
		var c = this.gs.cm.getCharacterByID(characterId);
		if(c)
		{
			c.characterDeinit();
			this.gs.cm.destroyCharacterId(c.id);
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
				activeUsers[i].trackedEvents.push({
					"eventName": "userDisconnected",
					"userId": u.id
				});
			}

			//deactivate the user in the server manager
			this.gs.um.deactivateUserId(u.id);
		}
	}
}



exports.GameServerRunning = GameServerRunning;