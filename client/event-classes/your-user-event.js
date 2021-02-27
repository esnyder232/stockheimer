export default class YourUserEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		this.gc.myUserServerId = e.userId;
		var me = this.gc.um.getUserByServerID(e.userId);

		if(!this.gc.foundMyUser && me !== null)
		{
			this.gc.foundMyUser = true;
			this.gc.myUser = me;
		}
	}
}