import GlobalFuncs from "../global-funcs.js";

export default class KillFeedMsgEvent {
	constructor() {
		this.gc = null;
		this.globalfuncs = null;
	}

	init(gc) {
		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();
	}

	processEvent(e)
	{
		this.gc.mainScene.killFeedMenu.killFeedMsgEvent(e);
	}
}