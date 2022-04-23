export default class CharacterOffControlPointEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{		
		window.dispatchEvent(new CustomEvent("character-off-control-point", {detail: {serverId: e.id}}));
	}
}