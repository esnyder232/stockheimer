export default class UpdateUserInfoEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{

		var u = this.gc.users.find((x) => {return x.userId === e.userId;});
		if(u)
		{
			u.userKillCount = e.userKillCount;
			u.userRtt = e.userRtt;
			u.userPvp = e.userPvp;
			u.teamId = e.teamId;
		}

		var u = this.gc.users.find((x) => {return x.userId === e.userId});
		var ude = this.gc.mainScene.userDomElements.find((x) => {return x.userId === e.userId;});
		var c = this.gc.gom.getActiveGameObjects().find((x) => {return x.ownerType === "user" && x.ownerId === e.userId;})

		if(ude && u)
		{
			var pvpPart = u.userPvp ? this.gc.mainScene.pvpEmoji : "\xa0\xa0\xa0\xa0\xa0";
			var myText = pvpPart + " (kills: " + u.userKillCount + ", ping: " + u.userRtt + ") - " + u.username + " - (team " + u.teamId + ")";
			ude.userListItem.text(myText);
		}

		if(c && u)
		{
			var pvpText = "";
			pvpText = u.userPvp ? this.gc.mainScene.pvpEmoji : "";

			c.pvpGraphics.setText(pvpText);
		}
	}
}