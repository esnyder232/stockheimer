export default class UpdateUserRttEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var u = this.gc.um.getUserByServerID(e.userId);
		if(u !== null)
		{
			u.seq.insertEvent(e);
		}
	}
}