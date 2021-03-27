import $ from "jquery"

export default class FromServerChatMessageEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		this.gc.mainScene.chatMenu.fromServerchatMessageEvent(e);
		this.gc.mainScene.chatMenuMinified.fromServerchatMessageEvent(e);
	}
}