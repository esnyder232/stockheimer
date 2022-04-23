export default class CharacterOnControlPointEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		window.dispatchEvent(new CustomEvent("character-on-control-point", {detail: {serverId: e.id}}));
	}
}