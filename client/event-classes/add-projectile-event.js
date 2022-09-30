export default class AddProjectileEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var p = this.gc.gom.createGameObject("projectile", e.id);
		p.projectileInit(this.gc);
		p.characterId = e.characterId;
		p.x = e.x;
		p.y = e.y;
		p.angle = e.angle;
		p.size = e.size;
		p.speed = e.speed;
		p.teamId = e.teamId;
		p.projectileResourceId = e.projectileResourceId === 0 ? null : e.projectileResourceId;
	}
}