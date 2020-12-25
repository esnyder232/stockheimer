import GlobalFuncs from "../global-funcs.js"

export default class EventProcessor {
	constructor() {
		this.gc = null;		
		this.globalfuncs = new GlobalFuncs();
		this.fragmentedServerToClientEvents = [];
	}
	
	init(gc) {
		this.gc = gc;
	}

	processServerEvents(cbPreEvent, cbPostEvent) {
		for(var i = 0; i < this.gc.wsh.serverToClientEvents.length; i++)
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
						username: e.username,
						userKillCount: e.userKillCount
					});

					console.log(e);

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
						ownerId: e.ownerId,
						ownerType: e.ownerType,
						activeId: e.activeCharacterId,
						x: e.characterPosX,
						y: e.characterPosY,
						hpMax: e.characterHpMax,
						hpCur: e.characterHpCur
					};

					//translate the owner type to a string again
					//DONT CARE!!!
					for (const key in this.gc.gameConstants.owner_types) {
						var val = this.gc.gameConstants.owner_types[key];
						if(val === c.ownerType)
						{
							c.ownerType = key;
						}
					}

					this.gc.characters.push(c)

					//check if this is your character
					if(this.gc.foundMyUser && !this.gc.foundMyCharacter)
					{
						console.log('checking if its my character');
						console.log(this.gc.myUser);
						if(c.ownerType === "user" && c.ownerId === this.gc.myUser.userId)
						{
							this.gc.foundMyCharacter = true;
							this.gc.myCharacter = c;
						}
					}
					break;


				case "removeActiveCharacter":
					var ci = this.gc.characters.findIndex((x) => {return x.id == e.characterId});

					//if the character was found, splice it off the array
					if(ci >= 0)
					{
						var temp = this.gc.characters.splice(ci, 1)[0];

						//check if this is your character
						if(this.gc.foundMyUser && this.gc.foundMyCharacter)
						{
							if(temp.ownerType === "user" && temp.ownerId === this.gc.myUser.userId)
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
							c.hpCur = e.characterHpCur;
						}
						break;

					case "addProjectile":
						this.gc.projectiles.push({
							id: e.id,
							x: e.x,
							y: e.y,
							angle: e.angle,
							size: e.size
						});
						break;

					case "removeProjectile":
						var pIndex = this.gc.projectiles.findIndex((x) => {return x.id == e.id});

						if(pIndex >= 0)
						{
							this.gc.projectiles.splice(pIndex, 1)[0];
						}
						break;

					case "projectileUpdate":
						var p = this.gc.projectiles.find((x) => {return x.id === e.id;});
						if(p)
						{
							p.x = e.x;
							p.y = e.y;
							p.angle = e.angle;
						}
						break;

					case "fragmentStart":
						var fragmentInfo = {
							fragmentLength: e.fragmentLength,
							fragmentData: new ArrayBuffer(e.fragmentLength),
							fragmentDataView: null,
							n: 0
						};

						fragmentInfo.fragmentDataView = new DataView(fragmentInfo.fragmentData);

						//copy the fragment in this message to the fragmentedServeRtoClientEvents
						var dv = new DataView(e.fragmentData);
						for(var j = 0; j < dv.byteLength; j++)
						{
							fragmentInfo.fragmentDataView.setUint8(fragmentInfo.n, dv.getUint8(j));
							fragmentInfo.n++;
						}

						this.fragmentedServerToClientEvents.push(fragmentInfo);

						break;
					case "fragmentContinue":
						if(this.fragmentedServerToClientEvents.length > 0)
						{
							var fragmentInfo = this.fragmentedServerToClientEvents[this.fragmentedServerToClientEvents.length-1];

							//copy the fragment in this message to the fragmentedServeRtoClientEvents
							var dv = new DataView(e.fragmentData);
							for(var j = 0; j < dv.byteLength; j++)
							{
								fragmentInfo.fragmentDataView.setUint8(fragmentInfo.n, dv.getUint8(j));
								fragmentInfo.n++;
							}
						}
						break;
					case "fragmentEnd":
						if(this.fragmentedServerToClientEvents.length > 0)
						{
							var fragmentInfo = this.fragmentedServerToClientEvents[this.fragmentedServerToClientEvents.length-1];

							//copy the fragment in this message to the fragmentedServeRtoClientEvents
							var dv = new DataView(e.fragmentData);
							for(var j = 0; j < dv.byteLength; j++)
							{
								fragmentInfo.fragmentDataView.setUint8(fragmentInfo.n, dv.getUint8(j));
								fragmentInfo.n++;
							}

							this.gc.wsh.decodeEvent(0, fragmentInfo.fragmentDataView, true);
						}
						break;

					case "killfeedMsg":
						this.globalfuncs.appendToLog(e.killfeedMsg);
						break;

					case "updateUserInfo":
						var u = this.gc.users.find((x) => {return x.userId === e.userId;});
						if(u)
						{
							u.userKillCount = e.userKillCount;
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
		}
		
		this.gc.wsh.serverToClientEvents.length = 0;
	}
}