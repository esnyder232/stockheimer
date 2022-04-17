export default class UpdateControlPointEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var cp = this.gc.gom.getGameObjectByServerID(e.id);
		if(cp !== null) {
			cp.seq.insertEvent(e);
		}
	}
}