import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class ChatMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.isVisible = false;
		this.activated = false;

		this.menu = null;
		this.chatHistory = null;
		this.chatHistoryItemTemplate = null;
		this.chatInput = null;

		this.windowsEventMapping = [];
	}

	init(gc) {
		this.reset();

		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'toggle-chat-menu',  func: this.toggleMenu.bind(this)},
			{event: 'close-chat-menu', func: this.closeMenu.bind(this)},
			{event: 'from-server-chat-message', func: this.fromServerchatMessageEvent.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#chat-menu");
		this.chatHistory = $("#chat-history");
		this.chatHistoryItemTemplate = $("#chat-history-item-template");
		this.chatInput = $("#tb-chat-input");

		//reset to initial state
		this.menu.addClass("hide");
		this.isVisible = false;

		//custom event registration
		this.chatInput.on("keyup", this.tbChatInputKeyup.bind(this));
		this.activated = true;
	}

	toggleMenu() {
		if(this.isVisible) {
			this.closeMenu();
		}
		else {
			this.openMenu();
			window.dispatchEvent(new CustomEvent("chat-menu-opened"));
		}
	}

	openMenu() {
		this.menu.removeClass("hide");
		this.isVisible = true;

		//focus on textbox
		if(this.chatInput)
		{
			this.chatInput[0].focus();
		}

		//scroll to bottom
		this.chatHistory[0].scrollTop = this.chatHistory[0].scrollHeight;
	}


	tbChatInputKeyup(e) {
		if((e.code == "NumpadEnter" || e.code == "Enter")) {
			this.tbChatSubmitClick();
		}

		e.preventDefault();
		e.stopPropagation();
	}

	tbChatSubmitClick() {
		var chatMsg = "";
		chatMsg = this.chatInput.val();

		if(chatMsg !== "")
		{
			this.chatInput.val("");

			this.gc.ep.insertClientToServerEvent({
				"eventName": "fromClientChatMessage",
				"chatMsg": chatMsg
			});
		}

		this.closeMenu();
	}



	closeMenu() {
		if(this.activated) {
			this.menu.addClass("hide");

			window.dispatchEvent(new CustomEvent("chat-menu-closed"));
			this.isVisible = false;
		}
	}
	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);

		if(this.activated) {
			this.chatInput.off("keyup");
		}
		
		this.activated = false;
	}

	deinit() {
		this.reset();
	}

	fromServerchatMessageEvent(e) {
		var newChat = this.chatHistoryItemTemplate.clone();
		var newChatTs = newChat.find("span[name='chat-history-ts']");
		var newChatName = newChat.find("span[name='chat-history-name']");
		var newChatMsg = newChat.find("span[name='chat-history-msg']");

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

		newChat.removeClass("hide");
		newChatTs.text(ts);
		newChatName.text(username + ": ");
		newChatMsg.text(e.detail.e.chatMsg);

		this.chatHistory.append(newChat);


		//determine if you should scroll
		var chatMsgHeight = newChat.height();
		var scrollTop = this.chatHistory[0].scrollTop;
		var scrollHeight = this.chatHistory[0].scrollHeight;
		var chatHistoryHeight = this.chatHistory.height();

		//scroll if your close enough to the bottom of the chat, auto scroll
		if(scrollTop >= ((scrollHeight - chatHistoryHeight) - (chatMsgHeight * 3)))
		{
			this.chatHistory[0].scrollTop = this.chatHistory[0].scrollHeight;
		}
	}
}