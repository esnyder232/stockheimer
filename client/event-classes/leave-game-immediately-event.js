export default class LeaveGameImmediatelyEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		this.gc.gameState.leaveGameImmediately();
	}
}