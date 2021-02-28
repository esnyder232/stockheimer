export default class RemoveProjectileEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		this.gc.gom.destroyGameObjectServerId(e.id);
	}
}