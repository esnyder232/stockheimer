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
		u.roundUserKillCount = e.roundUserKillCount;
		u.userDeathCount = e.userDeathCount;
		u.roundUserDeathCount = e.roundUserDeathCount;
		u.characterClassResourceId = e.characterClassResourceId === 0 ? null : e.characterClassResourceId;

		if(!this.gc.foundMyUser)
		{
			if(u.serverId === this.gc.myUserServerId)
			{
				this.gc.foundMyUser = true;
				this.gc.myUser = u;
			}
		}

		this.gc.mainScene.userListMenu.userConnectedEvent(e);

	}
}