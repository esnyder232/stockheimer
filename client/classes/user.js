import GlobalFuncs from "../global-funcs.js"
import $ from "jquery"

export default class User {
	constructor() {
		this.gc = null;
		this.globalfuncs = null;
		this.serverId = null;
		this.id = null;
		this.userId = null;
		this.username = null;
		this.userKillCount = null;
		this.userRtt = 0;
		this.teamId = null;
		this.userPvp = true;

		this.userListItem = null;
	}
	
	userInit(gc) {
		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();
	}

	activated() {
	}

	deactivated() {
	}

	deinit() {
		this.gc = null;
		this.globalfuncs = null;
	}

	UpdateUserInfoEvent(e) {
		this.userKillCount = e.userKillCount;
		this.userRtt = e.userRtt;
		this.userPvp = e.userPvp;
		this.teamId = e.teamId;
	
		var c = this.gc.gom.getActiveGameObjects().find((x) => {return x.ownerType === "user" && x.ownerId === e.userId;});
		//DEBUG: this should be out of here
		if(c)
		{
			//c.pvpGraphics.setText(pvpPart);
		}
	}
}

