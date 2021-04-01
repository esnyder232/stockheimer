export default class UpdateRoundStateEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		console.log("!!!! UPDATING ROUND STATE EVENT RECIEVED !!! - " + e.roundState);
	}
}