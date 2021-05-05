import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class UserListMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.isVisible = false;

		this.menu = null;
		this.userCountDiv = null;
		this.userList = null;
		this.userListItemTemplate = null;

		this.activated = false;

		this.windowsEventMapping = [];
		this.userIdUserListItemMap = {}; //key: userId. value: jquery object containing userListItem
		this.currentUsers = 0;
	}

	init(gc) {
		this.reset();

		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'toggle-user-list-menu',  func: this.toggleMenu.bind(this)},
			{event: 'close-user-list-menu', func: this.closeMenu.bind(this)},
			{event: 'user-info-updated', func: this.userInfoUpdated.bind(this)},
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#user-list-menu");
		this.userCountDiv = $("#user-list-player-count");
		this.userList = $("#user-list");
		this.userListItemTemplate = $("#user-list-item-template");

		//reset to initial state
		this.menu.addClass("hide");
		this.isVisible = false;
		this.activated = true;

		//build initial user list
		var users = this.gc.um.getUsers();
		for(var i = 0; i < users.length; i++)
		{
			this.addUserListItem(users[i]);
		}
	}

	toggleMenu() {
		if(this.isVisible) {
			this.closeMenu();
		}
		else {
			this.openMenu();
			window.dispatchEvent(new CustomEvent("user-list-menu-opened"));
		}
	}

	openMenu() {
		this.menu.removeClass("hide");		
		this.isVisible = true;
	}

	closeMenu() {
		this.menu.addClass("hide");
		window.dispatchEvent(new CustomEvent("user-list-menu-closed"));
		this.isVisible = false;
	}
	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);

		//remove user list items
		var users = this.gc.um.getUsers();
		for(var key in this.userIdUserListItemMap)
		{
			if (this.userIdUserListItemMap.hasOwnProperty(key)) {
				this.userIdUserListItemMap[key].remove();
				delete this.userIdUserListItemMap[key];
			}
		}
	}

	deinit() {
		this.reset();
	}

	addUserListItem(user) {
		this.currentUsers++;

		var newUserListItem = this.userListItemTemplate.clone();
		newUserListItem.removeClass("hide");
		newUserListItem.text("(kills: " + user.userKillCount + ", deaths: " + user.userDeathCount + ", ping: " + user.userRtt + ") - " + user.username + " - (team " + user.teamId + ")");

		this.userList.append(newUserListItem);

		this.userIdUserListItemMap[user.serverId] = newUserListItem;

		this.userCountDiv.text("Players: " + this.currentUsers + "/32");
	}

	removeUserListItem(user) {
		this.currentUsers--;

		if(this.userIdUserListItemMap[user.serverId] !== undefined)
		{
			this.userIdUserListItemMap[user.serverId].remove();
			delete this.userIdUserListItemMap[user.serverId];
		}

		this.userCountDiv.text("Players: " + this.currentUsers + "/32");
	}

	userConnectedEvent(e) {
		if(this.activated)
		{
			var u = this.gc.um.getUserByServerID(e.userId);

			if(u !== null)
			{
				this.addUserListItem(u);
			}
		}
	}

	userDisconnectedEvent(e) {
		if(this.activated)
		{
			var u = this.gc.um.getUserByServerID(e.userId);

			if(u !== null)
			{
				this.removeUserListItem(u);				
			}
		}
	}

	userInfoUpdated(e) {
		if(this.activated)
		{
			var u = this.gc.um.getUserByServerID(e.detail.serverId);

			if(u !== null)
			{
				if(this.userIdUserListItemMap[u.serverId] !== undefined)
				{
					//update userListItem
					var myText = "(kills: " + u.userKillCount + ", deaths: " + u.userDeathCount + ", ping: " + u.userRtt + ") - " + u.username + " - (team " + u.teamId + ")";
					this.userIdUserListItemMap[u.serverId].text(myText);
				}
			}
		}

		// if(this.gc.myUserServerId!== null && e.detail.serverId === this.gc.myUserServerId)
		// {
		// 	this.updateRespawnMessage();
		// }
	}

	// updateUserInfoEvent(e) {
	// 	if(this.activated)
	// 	{
	// 		var u = this.gc.um.getUserByServerID(e.userId);

	// 		if(u !== null)
	// 		{
	// 			if(this.userIdUserListItemMap[u.serverId] !== undefined)
	// 			{
	// 				//update userListItem
	// 				var myText = "(kills: " + u.userKillCount + ", deaths: " + u.userDeathCount + ", ping: " + u.userRtt + ") - " + u.username + " - (team " + u.teamId + ")";
	// 				this.userIdUserListItemMap[u.serverId].text(myText);
	// 			}
	// 		}
	// 	}
	// }
}