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
		var chatHistory = $("#chat-history");
		var chatHistoryItemTemplate = $("#chat-history-item-template");
		
		var newChat = chatHistoryItemTemplate.clone();
		var newChatTs = newChat.find("div[name='chat-history-ts']");
		var newChatName = newChat.find("div[name='chat-history-name']");
		var newChatMsg = newChat.find("div[name='chat-history-msg']");

		var u = this.gc.um.getUserByServerID(e.userId);
		
		var username = "???";
		if(u)
		{
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
		newChatMsg.text(e.chatMsg);

		chatHistory.append(newChat);


		//determine if you should scroll
		var chatMsgHeight = newChat.height();
		var scrollTop = chatHistory[0].scrollTop;
		var scrollHeight = chatHistory[0].scrollHeight;
		var chatHistoryHeight = chatHistory.height();

		//scroll if your close enough to the bottom of the chat, auto scroll
		if(scrollTop >= ((scrollHeight - chatHistoryHeight) - (chatMsgHeight * 3)))
		{
			chatHistory[0].scrollTop = chatHistory[0].scrollHeight;
		}
	}
}