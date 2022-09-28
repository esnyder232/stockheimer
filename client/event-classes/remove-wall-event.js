export default class RemoveWallEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		// console.log("DESTROYING WALL");
		this.gc.gom.destroyGameObjectServerId(e.id);
	}
}