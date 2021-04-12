export default class UpdateUserInfoEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var u = this.gc.um.getUserByServerID(e.userId);
		if(u !== null)
		{
			u.eq.insertEvent(e);
		}

		this.gc.mainScene.userListMenu.updateUserInfoEvent(e);
	}
}