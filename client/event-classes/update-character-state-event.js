export default class UpdateCharacterStateEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var c = this.gc.gom.getGameObjectByServerID(e.characterId);

		if(c !== null) {
			c.seq.insertOrderedEvent(e);
		}
	}
}