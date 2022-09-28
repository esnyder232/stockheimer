export default class AddWallEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		// console.log("CREATING WALL " + e.id);
		var p = this.gc.gom.createStaticGameObject("wall", e.id);
		// p.projectileInit(this.gc);
		// p.x = e.x;
		// p.y = e.y;
		// p.angle = e.angle;
		// p.size = e.size;
		// p.speed = e.speed;
		// p.teamId = e.teamId;
		// p.projectileResourceId = e.projectileResourceId === 0 ? null : e.projectileResourceId;
	}
}