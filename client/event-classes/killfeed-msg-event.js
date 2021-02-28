import GlobalFuncs from "../global-funcs.js";

export default class KillfeedMsgEvent {
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
		this.globalfuncs.appendToLog(e.killfeedMsg);
	}
}