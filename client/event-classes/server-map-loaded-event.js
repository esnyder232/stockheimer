export default class ServerMapLoadedEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		this.gc.gameState.serverMapLoaded();
	}
}