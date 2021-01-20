import GlobalFuncs from "../global-funcs.js"

//the player class
export default class User {
	constructor() {
		this.gc = null;
		this.globalfuncs = new GlobalFuncs();
		this.userId = null;
		this.activeUserId = null;
		this.username = null;
		this.userKillCount = null;
		this.userRtt = 0;
	}
	
	init(gc, userId, activeUserId, username, userKillCount) {
		this.gc = gc;
		this.userId = userId;
		this.activeUserId = activeUserId;
		this.username = username;
		this.userKillCount = userKillCount;
	}
}

