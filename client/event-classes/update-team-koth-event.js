export default class UpdateTeamKothEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var t = this.gc.tm.getTeamByServerID(e.id);
		if(t !== null) {
			t.seq.insertEvent(e);
		}
	}
}