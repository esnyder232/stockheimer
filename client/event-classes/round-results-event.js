export default class RoundResultsEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		window.dispatchEvent(new CustomEvent("round-results", {detail: {e: e}}));
	}
}