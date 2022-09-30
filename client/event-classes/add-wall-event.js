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
		var w = this.gc.gom.createStaticGameObject("wall", e.id);
		w.wallInit(this.gc);
		w.x = e.x;
		w.y = e.y;
		w.size = e.size;
		w.impassable = e.impassable;
		w.collideProjectiles = e.collideProjectiles;

		w.bShowPlanckSprite = this.gc.bDisplayClientCollisions;

		w.createWall();
		w.createWallGraphic();
	}
}