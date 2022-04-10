export default class RemovePersistentProjectileEvent {
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