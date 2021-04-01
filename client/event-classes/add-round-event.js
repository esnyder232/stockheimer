export default class AddRoundEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		console.log("Add round event recieved");
	}
}