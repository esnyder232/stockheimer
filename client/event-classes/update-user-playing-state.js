export default class UpdateUserPlayingStateEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var user = this.gc.um.getUserByServerID(e.userId);

		if(user !== null)
		{
			user.eq.insertOrderedEvent(e);
		}
	}
}