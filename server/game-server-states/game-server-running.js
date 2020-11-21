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

		//physics update
		this.gs.world.step(this.gs.physicsTimeStep, this.gs.velocityIterations, this.gs.positionIterations);
		


		//send an empty packet to all users
		for(var i = 0; i < activeUsers.length; i++)
		{
			this.gs.ps.createPacketForUser(activeUsers[i]);
		}


		//update managers
		this.gs.wsm.update(dt);
		this.gs.um.update(dt);
		this.gs.cm.update(dt);

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

		//put user in disconnecting state
		//not sure why they would not have a user at this point, but better safe than sorry.
		if(user)
		{
			user.nextState = new UserDisconnectingState(user);
		}

		this.gs.wsm.destroyWebsocket(wsh);
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
		for(var i = user.clientToServerEvents.length - 1; i >= 0; i--)
		{
			var e = user.clientToServerEvents[i];
			switch(e.eventName)
			{
				case "fromClientChatMessage":
					for(var j = 0; j < activeUsers.length; j++)
					{
						activeUsers[j].serverToClientEvents.push({
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
						c.init(this.gs);
						c.userId = user.id;
						user.characterId = c.id;

						var bError = this.gs.cm.activateCharacterId(c.id);
						if(!bError)
						{
							//now tell all active clients about the new active character
							for(var j = 0; j < activeUsers.length; j++)
							{
								activeUsers[j].serverToClientEvents.push( {
									"eventName": "addActiveCharacter",
									"userId": user.id,
									"characterId": c.id,
									"activeCharacterId": c.activeId,
									"characterPosX": 5,
									"characterPosY": 5,
									"characterState": "",
									"characterType": ""
								})
							}
						}
						else
						{
							console.log('Error when spawning character.');
						}
					}
					break;

				case "fromClientKillCharacter":
					//as long as they have an existing character, kill it.
					if(user.characterId !== null)
					{
						var c = this.gs.cm.getCharacterByID(user.characterId);

						if(c && c.userId === user.id)
						{
							this.gs.cm.deactivateCharacterId(c.id);
							user.characterId = null;
							c.userId = null;
	
							this.gs.cm.destroyCharacter(c);
							
							//now tell all active clients about removing the active character
							for(var j = 0; j < activeUsers.length; j++)
							{
								activeUsers[j].serverToClientEvents.push( {
									"eventName": "removeActiveCharacter",
									"characterId": c.id
								});
							}
						}
					}
					break;

				default:
					//intentionally blank
					break;
			}

			user.clientToServerEvents.splice(i, 1);
		}
	}
}



exports.GameServerRunning = GameServerRunning;