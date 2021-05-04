export default class RoundResultsEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		this.gc.mainScene.roundResultsMenu.roundResultsEvent(e);
		this.gc.mainScene.roundResultsMenu.populateRoundResults();
		//this.gc.mainScene.roundResultsMenu.openMenu();
	}
}