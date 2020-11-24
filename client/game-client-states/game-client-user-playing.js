import GameClientBaseState from './game-client-base-state.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';
import MainScene from "../scenes/main-scene.js"


export default class GameClientUserPlaying extends GameClientBaseState {
	constructor(gc) {
		super(gc);
		this.ep = this.gc.ep;
		this.ms = null;
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Now playing.");
		this.ms = this.gc.phaserGame.scene.add("main-scene", MainScene, true, {
			gc: this.gc
		});

		//tell the server you are ready to play
		this.gc.wsh.clientToServerEvents.push({
			"eventName": "fromClientReadyToPlay"
		});
	}

	update(dt) {
		super.update(dt);

		this.gc.ep.processServerEvents(this.cbPreEvent.bind(this), this.cbPostEvent.bind(this));

		this.gc.wsh.createPacketForUser();
		this.gc.wsh.update(dt);
	}

	exit(dt) {
		super.exit(dt);

		this.gc.phaserGame.scene.stop("main-scene");
		this.gc.phaserGame.scene.remove("main-scene");
	}


	websocketErrored() {
		this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
	}

	websocketClosed() {
		this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
	}

	exitGameClick() {
		this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
	}

	cbPreEvent(e) {
		switch(e.eventName)
			{
				case "userDisconnected":
					this.ms.userDisconnected(e.userId);
					break;

				case "removeActiveCharacter":
					this.ms.removeActiveCharacter(e.characterId);
					break;

				default:
					//intentionally blank
					break;
			}
	}

	cbPostEvent(e) {
		switch(e.eventName)
			{
				case "userConnected":
					console.log('userconnected post called');
					console.log(e);
					this.ms.userConnected(e.userId);
					break;
			
				case "existingUser":
					this.ms.existingUser(e.userId);
					break;

				case "fromServerChatMessage":
					this.ms.fromServerChatMessage(e);
					break;
				
				case "addActiveCharacter":
					this.ms.addActiveCharacter(e.characterId);
					break;

				case "activeCharacterUpdate":
					this.ms.activeCharacterUpdate(e);
					break;

				default:
					//intentionally blank
					break;
			}
	}


	// processServerEvents() {
	// 	for(var i = this.gc.wsh.serverToClientEvents.length - 1; i >= 0; i--)
	// 	{
	// 		var e = this.gc.wsh.serverToClientEvents[i];
	// 		switch(e.eventName)
	// 		{
	// 			case "yourUser":
	// 				break;

	// 			case "userConnected":
	// 				// this.gc.users.push({
	// 				// 	userId: e.userId,
	// 				// 	activeUserId: e.activeUserId,
	// 				// 	username: e.username
	// 				// });

	// 				// //try to find your own user if you can
	// 				// if(!this.gc.foundMyUser && this.gc.myUserId !== null)
	// 				// {
	// 				// 	var me = this.gc.users.find((x) => {return x.userId == this.gc.myUserId;});
	// 				// 	if(me)
	// 				// 	{
	// 				// 		this.gc.foundMyUser = true;
	// 				// 		this.gc.myUser = me;
	// 				// 		console.log('found my user from UserConnected')
	// 				// 	}
	// 				// }

	// 				this.ms.userConnected(e);
	// 				break;
	// 			case "userDisconnected":
	// 				this.ms.userDisconnected(e);

	// 				// var userIndex = this.gc.users.findIndex((x) => {
	// 				// 	return x.userId == e.userId;
	// 				// })

	// 				// if(userIndex >= 0)
	// 				// {
	// 				// 	this.gc.users.splice(userIndex, 1);
	// 				// }

	// 				break;

	// 			case "existingUser":
	// 				// this.gc.users.push({
	// 				// 	userId: e.userId,
	// 				// 	activeUserId: e.activeUserId,
	// 				// 	username: e.username
	// 				// });

	// 				this.ms.existingUser(e);
	// 				break;

	// 			case "fromServerChatMessage":
	// 				this.ms.fromServerChatMessage(e);
	// 				break;
				
	// 			case "addActiveCharacter":
	// 				// var c = {
	// 				// 	id: e.characterId,
	// 				// 	userId: e.userId,
	// 				// 	activeId: e.activeCharacterId,
	// 				// 	x: e.characterPosX,
	// 				// 	y: e.characterPosY,
	// 				// 	state: e.characterState,
	// 				// 	type: e.characterType
	// 				// };

	// 				// this.gc.characters.push(c)

	// 				// //check if this is your character
	// 				// if(this.gc.foundMyUser && !this.gc.foundMyCharacter)
	// 				// {
	// 				// 	console.log('checking if its my character');
	// 				// 	console.log(this.gc.myUser);
	// 				// 	if(c.userId === this.gc.myUser.userId)
	// 				// 	{
	// 				// 		this.gc.foundMyCharacter = true;
	// 				// 		this.gc.myCharacter = c;
	// 				// 	}
	// 				// }

	// 				this.ms.addActiveCharacter(e, c);
	// 				break;


	// 			case "removeActiveCharacter":
	// 				console.log('removeActiveCharacter event');
	// 				console.log(e);
					
	// 				var ci = this.gc.characters.findIndex((x) => {return x.id == e.characterId});

	// 				//if the character was found, splice it off the array
	// 				if(ci >= 0)
	// 				{
						
	// 					var temp = this.gc.characters.splice(ci, 1)[0];

	// 					//check if this is your character
	// 					if(this.gc.foundMyUser && this.gc.foundMyCharacter)
	// 					{
	// 						if(temp.userId == this.gc.myUser.userId)
	// 						{
	// 							this.gc.foundMyCharacter = false;
	// 							this.gc.myCharacter = null;
	// 						}
	// 					}

	// 					this.ms.removeActiveCharacter(e, temp);
	// 				}
					
	// 				break;


	// 				case "activeCharacterUpdate":
	// 					this.ms.activeCharacterUpdate(e);
	// 					break;

	// 			default:
	// 				//intentionally blank
	// 				break;
	// 		}

	// 		this.gc.wsh.serverToClientEvents.splice(i, 1);
	// 	}
	// }
}