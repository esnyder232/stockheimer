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
		window.dispatchEvent(new CustomEvent("from-server-chat-message", {detail: {e: e}}));
	}
}