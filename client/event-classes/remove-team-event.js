export default class RemoveTeamEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		this.tm.destroyTeamServerId(e.id);
	}
}