export default class AddTeamEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var t = this.gc.tm.createTeam(e.id);
		t.teamInit(this.gc);
		t.slotNum = e.slotNum;
		t.name=  e.name;
	}
}