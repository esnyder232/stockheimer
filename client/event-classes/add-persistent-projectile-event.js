export default class AddPersistentProjectileEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var c = this.gc.gom.getGameObjectByServerID(e.characterId);

		if(c !== null) {
			var pp = this.gc.gom.createGameObject("persistent-projectile", e.id);
			pp.persistentProjectileInit(this.gc);
			pp.serverCharacterId = e.characterId;
			pp.ownerId = e.userId;
			pp.characterId = c.id;
			pp.x = c.x;
			pp.y = c.y;
			pp.angle = e.angle;
			pp.serverAngle = e.angle;
			pp.teamId = e.teamId;
			pp.persistentProjectileResourceId = e.persistentProjectileResourceId === 0 ? null : e.persistentProjectileResourceId;
		}
	}
}