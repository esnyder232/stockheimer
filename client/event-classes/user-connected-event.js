export default class UserConnectedEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var u = this.gc.um.createUser(e.userId);
		u.userInit(this.gc);
		u.username = e.username;
		u.userKillCount = e.userKillCount;
		u.teamId = e.teamId;

		if(!this.gc.foundMyUser)
		{
			if(u.serverId === this.gc.myUserServerId)
			{
				this.gc.foundMyUser = true;
				this.gc.myUser = u;
			}
		}
	}
}