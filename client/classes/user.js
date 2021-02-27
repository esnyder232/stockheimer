import GlobalFuncs from "../global-funcs.js"
import $ from "jquery"

//the player class
export default class User {
	constructor() {
		this.gc = null;
		this.globalfuncs = null;
		this.id = null;
		this.userId = null;
		this.username = null;
		this.userKillCount = null;
		this.userRtt = 0;
		this.teamId = null;
		this.userPvp = true;

		this.userListItem = null;
	}
	
	userInit(gc) {
		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();
	}

	activated() {
		var activeUsers = this.gc.um.getActiveUsers();
		var userCountDiv = $("#user-list-player-count");
		var userList = $("#user-list");
		var userListItemTemplate = $("#user-list-item-template");

		this.userListItem = userListItemTemplate.clone();
		this.userListItem.removeClass("hide");
		this.userListItem.text("(kills: " + this.userKillCount + ") - " + this.username);
		userList.append(this.userListItem);

		userCountDiv.text("Players: " + activeUsers.length + "/32");
	}

	deactivated() {
		//remove dom elements
		this.userListItem.remove();
		this.userListItem = null;
	}

	deinit() {
		var userCountDiv = $("#user-list-player-count");
		
		//update player count
		var activeUsers = this.gc.um.getActiveUsers();
		userCountDiv.text("Players: " + activeUsers.length + "/32");

		this.gc = null;
		this.globalfuncs = null;
	}

	UpdateUserInfoEvent(e) {
		this.userKillCount = e.userKillCount;
		this.userRtt = e.userRtt;
		this.userPvp = e.userPvp;
		this.teamId = e.teamId;
	
		//update userListItem
		var pvpPart = this.userPvp ? this.gc.mainScene.pvpEmoji : "\xa0\xa0\xa0\xa0\xa0";
		var myText = pvpPart + " (kills: " + this.userKillCount + ", ping: " + this.userRtt + ") - " + this.username + " - (team " + this.teamId + ")";
		this.userListItem.text(myText);

		var c = this.gc.gom.getActiveGameObjects().find((x) => {return x.ownerType === "user" && x.ownerId === e.userId;});
		//DEBUG: this should be out of here
		if(c)
		{
			c.pvpGraphics.setText(pvpPart);
		}
	}
}

