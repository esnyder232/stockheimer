export default class AddActiveCharacterEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var c = this.gc.gom.createGameObject("character", e.id);
		c.characterInit(this.gc);
		c.x = e.characterPosX;
		c.y = e.characterPosY;
		c.ownerId = e.ownerId; //temporarily make ownerId = the server id (this will eventually be "c.serverOwnerId = e.ownerId;")
		c.ownerType = e.ownerType;
		c.hpCur = e.characterHpCur;
		c.hpMax = e.characterHpMax;

		//translate the owner type to a string again
		//DONT CARE!!!
		for (const key in this.gc.gameConstants.owner_types) {
			var val = this.gc.gameConstants.owner_types[key];
			if(val === c.ownerType)
			{
				c.ownerType = key;
			}
		}


		//check if this is your character
		if(this.gc.foundMyUser && !this.gc.foundMyCharacter)
		{
			if(c.ownerType === "user" && c.ownerId === this.gc.myUser.userId)
			{
				this.gc.foundMyCharacter = true;
				this.gc.myCharacter = c;
			}
		}
	}
}