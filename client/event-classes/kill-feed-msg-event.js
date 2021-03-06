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
		var msg = e.killerName + " killed " + e.victimName;
		this.globalfuncs.appendToLog(msg);
		window.dispatchEvent(new CustomEvent("kill-feed-msg", {detail: {e: e}}));
	}
}