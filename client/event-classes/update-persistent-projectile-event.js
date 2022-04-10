export default class UpdatePersistentProjectileEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var pp = this.gc.gom.getGameObjectByServerID(e.id);
		if(pp !== null) {
			pp.seq.insertEvent(e);
		}
	}
}