import Round from "../classes/round.js"

export default class AddRoundEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		this.gc.theRound = new Round();
		this.gc.theRound.roundInit(this.gc);
		this.gc.theRound.eq.insertOrderedEvent(e);
	}
}