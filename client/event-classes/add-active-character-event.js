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
		c.serverX = e.characterPosX;
		c.serverY = e.characterPosY;
		c.ownerId = e.ownerId; //temporarily make ownerId = the server id (this will eventually be "c.serverOwnerId = e.ownerId;")
		c.ownerType = e.ownerType;
		c.hpCur = e.characterHpCur;
		c.hpMax = e.characterHpMax;
		c.characterClassResourceId = e.characterClassResourceId === 0 ? null : e.characterClassResourceId;
		c.shieldCur = e.characterShieldCur;
		c.shieldMax = e.characterShieldMax;

		// c.bShowPlanckSprite = this.gc.bDisplayClientCollisions;

		//translate the owner type to a string again
		//DONT CARE!!!
		for (const key in this.gc.gameConstants.OwnerTypes) {
			var val = this.gc.gameConstants.OwnerTypes[key];
			if(val === c.ownerType)
			{
				c.ownerType = key;
			}
		}

		//check if this is your character
		if(!this.gc.foundMyCharacter)
		{
			var u = this.gc.um.getUserByServerID(this.gc.myUserServerId);
			if(u !== null && c.ownerType === "user" && c.ownerId === u.serverId)
			{
				this.gc.foundMyCharacter = true;
				this.gc.myCharacter = c;
			}
		}
	}
}