import $ from "jquery"

export default class UserDisconnectedEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		this.gc.um.destroyUserServerId(e.userId);
	}
}