import GlobalFuncs from "../global-funcs.js"

export default class EventProcessor {
	constructor() {
		this.gc = null;		
		this.globalfuncs = new GlobalFuncs();
	}
	
	init(gc) {
		this.gc = gc;
	}

	processServerEvents(cbPreEvent, cbPostEvent) {
		for(var i = this.gc.wsh.serverToClientEvents.length - 1; i >= 0; i--)
		{
			var e = this.gc.wsh.serverToClientEvents[i];
			//call preevent callback. This is mostly just called when things get deleted and the scenes have a chance to update their view accordingly
			if(cbPreEvent)
			{
				cbPreEvent(e);
			}

			switch(e.eventName)
			{
				case "yourUser":
					this.gc.myUserId = e.userId;
					console.log('MY USERID IS: ' + this.gc.myUserId);
					
					//try to find your own user if you can
					var me = this.gc.users.find((x) => {return x.userId == this.gc.myUserId;});
					if(!this.gc.foundMyUser && me)
					{
						this.gc.foundMyUser = true;
						this.gc.myUser = me;
						console.log('found my user from YourUser')
						console.log(this.gc.myUser);
					}
					break;

				case "userConnected":
					this.gc.users.push({
						userId: e.userId,
						activeUserId: e.activeUserId,
						username: e.username
					});

					//try to find your own user if you can
					if(!this.gc.foundMyUser && this.gc.myUserId !== null)
					{
						var me = this.gc.users.find((x) => {return x.userId == this.gc.myUserId;});
						if(me)
						{
							this.gc.foundMyUser = true;
							this.gc.myUser = me;
							console.log('found my user from UserConnected')
						}
					}
					break;
				case "userDisconnected":
					var userIndex = this.gc.users.findIndex((x) => {
						return x.userId == e.userId;
					})

					if(userIndex >= 0)
					{
						this.gc.users.splice(userIndex, 1);
					}

					break;

				case "existingUser":
					this.gc.users.push({
						userId: e.userId,
						activeUserId: e.activeUserId,
						username: e.username
					});
					break;

				case "fromServerChatMessage":
					break;
				
				case "addActiveCharacter":
					var c = {
						id: e.characterId,
						userId: e.userId,
						activeId: e.activeCharacterId,
						x: e.characterPosX,
						y: e.characterPosY,
						state: e.characterState,
						type: e.characterType
					};

					this.gc.characters.push(c)

					//check if this is your character
					if(this.gc.foundMyUser && !this.gc.foundMyCharacter)
					{
						console.log('checking if its my character');
						console.log(this.gc.myUser);
						if(c.userId === this.gc.myUser.userId)
						{
							this.gc.foundMyCharacter = true;
							this.gc.myCharacter = c;
						}
					}
					break;


				case "removeActiveCharacter":
					console.log('removeActiveCharacter event');
					console.log(e);
					
					var ci = this.gc.characters.findIndex((x) => {return x.id == e.characterId});

					//if the character was found, splice it off the array
					if(ci >= 0)
					{
						var temp = this.gc.characters.splice(ci, 1)[0];

						//check if this is your character
						if(this.gc.foundMyUser && this.gc.foundMyCharacter)
						{
							if(temp.userId == this.gc.myUser.userId)
							{
								this.gc.foundMyCharacter = false;
								this.gc.myCharacter = null;
							}
						}
					}
					break;

					case "activeCharacterUpdate":
						var c = this.gc.characters.find((x) => {return x.activeId === e.activeCharacterId});
						if(c)
						{
							c.x = e.characterPosX;
							c.y = e.characterPosY;
						}
						break;

				default:
					//intentionally blank
					break;
			}

			//post event callback. This will probably be the most used call back.
			if(cbPostEvent)
			{
				cbPostEvent(e);
			}

			this.gc.wsh.serverToClientEvents.splice(i, 1);
		}
	}
}