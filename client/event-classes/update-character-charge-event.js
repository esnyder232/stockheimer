export default class UpdateCharacterChargeEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var c = this.gc.gom.getGameObjectByServerID(e.id);
		if(c !== null) {
			c.seq.insertEvent(e);
		}
	}
}