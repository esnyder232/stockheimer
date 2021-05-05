import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class ChatMenuMinified {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.isVisible = true;

		this.menu = null;
		this.chatHistory = null;
		this.chatHistoryItemTemplate = null;

		this.windowsEventMapping = [];

		this.chatDestroyTimeoutMs = 15000;
	}

	init(gc) {
		this.reset();
		this.gc = gc;

		this.globalfuncs = new GlobalFuncs();
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'chat-menu-opened', func: this.chatMenuOpened.bind(this)},
			{event: 'chat-menu-closed', func: this.chatMenuClosed.bind(this)},
			{event: 'from-server-chat-message', func: this.fromServerchatMessageEvent.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#chat-menu-minified");
		this.chatHistory = $("#chat-history-minified");
		this.chatHistoryItemTemplate = $("#chat-history-minified-item-template");

		//reset to initial state
		this.menu.removeClass("invisible");
		this.isVisible = true;
	}

	chatMenuClosed() {
		this.menu.removeClass("invisible");
		this.isVisible = true;
	}

	chatMenuOpened() {
		this.menu.addClass("invisible");
		this.isVisible = false;
	}
	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
	}

	deinit() {
		this.reset();
	}

	
	fromServerchatMessageEvent(e) {
		var newChat = this.chatHistoryItemTemplate.clone();
		var newChatTs = newChat.find("span[name='chat-history-minified-ts']");
		var newChatName = newChat.find("span[name='chat-history-minified-name']");
		var newChatMsg = newChat.find("span[name='chat-history-minified-msg']");

		//check if its from an actual user or a server message
		var username = "???";
		var u = null;

		if(e.detail.e.isServerMessage) {
			u = {
				username: "[Server]"
			}
		}
		else {
			var u = this.gc.um.getUserByServerID(e.detail.e.userId);
		}
		
		if(u !== null) {
			username = u.username;
		}

		var tsOptions = {
			hour: 'numeric',
			minute:'numeric',
			second:'numeric',
			hour12: false
		}
		var ts = new Intl.DateTimeFormat('en-US', tsOptions).format(Date.now())

		newChat.removeClass("invisible");
		newChatTs.text(ts);
		newChatName.text(username + ": ");
		newChatMsg.text(e.detail.e.chatMsg);

		window.setTimeout(() => {
			newChat.addClass("fade-out");
		}, 100);

		//meh...might as well use a timeout
		window.setTimeout(() => {
			newChat.remove();
		}, this.chatDestroyTimeoutMs)

		this.chatHistory.append(newChat);
	}
}