import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class TeamScoreMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.isVisible = false;

		this.menu = null;
		this.teamScoreList = null;
		this.teamScoreItemTemplate = null;
		this.teamScoreItems = [];

		this.activated = false;

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
			{event: 'team-points-updated', func: this.teamPointsUpdated.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#team-score-menu");
		this.teamScoreList = $("#team-score-list");
		this.teamScoreItemTemplate = $("#team-score-item-template");

		//reset to initial state
		this.menu.removeClass("hide");
		this.isVisible = true;
		this.activated = true;

		//build initial team list
		this.redrawAllTeamScores();
		// var teams = this.gc.tm.getTeams();
		// for(var i = 0; i < teams.length; i++) {
		// 	this.addTeamScoreItem(teams[i]);
		// }
	}

	openMenu() {
		this.menu.removeClass("hide");		
		this.isVisible = true;
	}

	closeMenu() {
		if(this.activated) {
			this.menu.addClass("hide");
			this.isVisible = false;
		}
	}
	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		if(this.activated) {
			this.teamScoreList.empty();
		}
		this.activated = false;
	}

	deinit() {
		this.reset();
	}

	// addTeamScoreItem(team) {
	// 	console.log('adding team score item NOW');
	// 	var newItem = this.teamScoreItemTemplate.clone();
	// 	newUserListItem.removeClass("hide");
	// 	newUserListItem.text("(kills: " + user.userKillCount + ", deaths: " + user.userDeathCount + ", ping: " + user.userRtt + ") - " + user.username + " - (team " + user.teamId + ")");

	// 	this.userList.append(newUserListItem);

	// 	this.userIdUserListItemMap[user.serverId] = newUserListItem;
	// }

	// removeTeamScoreItem(team) {
	// 	console.log('removing team score item NOW');
	// 	// if(this.userIdUserListItemMap[user.serverId] !== undefined)
	// 	// {
	// 	// 	this.userIdUserListItemMap[user.serverId].remove();
	// 	// 	delete this.userIdUserListItemMap[user.serverId];
	// 	// }
	// }

	//for now, just redraw all the scores in the correct order.
	redrawAllTeamScores() {
		//clear out old scores
		this.teamScoreList.empty();

		var teams = this.gc.tm.getTeams();
		var teamsSorted = [];

		for(var i = 0; i < teams.length; i++) {
			if(!teams[i].isSpectatorTeam) {
				teamsSorted.push(i);
			}
		}

		teamsSorted.sort((a, b) => {return teams[b].roundPoints - teams[a].roundPoints;});

		for(var i = 0; i < teamsSorted.length; i++) {
			var t = teams[teamsSorted[i]];
			
			var newItem = this.teamScoreItemTemplate.clone();
			newItem.removeClass("hide");
			newItem.removeAttr("id");
			newItem.text(t.name + " - " + t.roundPoints);
			newItem.css("color", t.killFeedTextColor);

			this.teamScoreList.append(newItem);
		}
	}

	teamPointsUpdated(e) {
		// console.log("TEAM INFO UPDATED CALLED NOW.");
		// console.log(e);
		this.redrawAllTeamScores();
		// if(this.activated) {
		// 	var u = this.gc.um.getUserByServerID(e.detail.serverId);

		// 	if(u !== null) {
		// 		if(this.userIdUserListItemMap[u.serverId] !== undefined) {
		// 			//update userListItem
		// 			var myText = "(kills: " + u.userKillCount + ", deaths: " + u.userDeathCount + ", ping: " + u.userRtt + ") - " + u.username + " - (team " + u.teamId + ")";
		// 			this.userIdUserListItemMap[u.serverId].text(myText);
		// 		}
		// 	}
		// }
	}
}