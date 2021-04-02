export default class UpdateRoundStateEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var theRound = this.gc.theRound;

		if(theRound)
		{
			theRound.insertOrderedEvent(e);
		}
	}
}