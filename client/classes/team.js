import GlobalFuncs from "../global-funcs.js";

export default class Team {
	constructor() {
		this.id = null;
		this.serverId = null;
		this.gc = null;
		this.slotNum = null;
		this.name = "??? team";
		this.globalfuncs = null;
	}

	teamInit(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();
	}
}
