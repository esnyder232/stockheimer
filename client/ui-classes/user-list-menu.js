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
		this.userListTeamContainer = null;
		this.userListItemTemplate = null;
		this.userListTeamContentsTemplate = null;
		this.userListGameType = null;
		this.userListGameRules = null;

	// 	<div class="user-list-game-summary">
	// 	<div class="user-list-game-type" id="user-list-game-type">
	// 		Elimination
	// 	</div>
	// 	<div class="user-list-game-rules" id="user-list-game-rules">
	// 		First to 5 round wins.
	// 	</div>
	// </div>

		this.contentsWidth = 400; //pixels

		this.activated = false;

		this.windowsEventMapping = [];
		this.userIdUserListItemMap = {}; //key: userId. value: object containing jquery objects for the user in the list
		this.teamIdUserItemMap = {}; //key: teamId. value: object containing user information regarding their ordering in the user list
		this.userListItemOrdered = [];
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
			{event: 'team-points-updated', func: this.teamPointsUpdated.bind(this)},
			{event: 'user-rtt-updated', func: this.userRttUpdated.bind(this)},
			{event: 'round-map-end', func: this.openMenu.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#user-list-menu");
		this.userCountDiv = $("#user-list-player-count");
		this.userListTeamContainer = $("#user-list-team-container");
		this.userListTeamContentsTemplate = $("#user-list-team-contents-template");
		this.userListItemTemplate = $("#ul-item-template");
		this.userListSpectatorList = $("#user-list-spectator-list");
		this.userListSpectatorItemTemplate = $("#user-lists-spectator-item-template");
		this.userListGameType = $("#user-list-game-type");
		this.userListGameRules = $("#user-list-game-rules");

		//gametype and rules
		var gameType = "";
		var gameRules = "";
		if(this.gc.currentGameType === "deathmatch") {
			gameType = "Deathmatch";
			gameRules = "First to " + this.gc.matchWinCondition + " wins";
		} else if (this.gc.currentGameType === "elimination") {
			gameType = "Elimination";
			gameRules = "First to " + this.gc.matchWinCondition + " wins";
		} else if (this.gc.currentGameType === "koth") {
			gameType = "King of the Hill";
			gameRules = "First to " + this.gc.matchWinCondition + " wins";
		}

		this.userListGameType.text(gameType);
		this.userListGameRules.text(gameRules);

		//get the width of the template content, and recalculate the width on the teams container
		this.contentsWidth = this.userListTeamContentsTemplate.outerWidth(true);
		var numTeams = 0;
		var teams = this.gc.tm.getTeams();
		if(teams.length > 0) {
			//minus spectator team
			numTeams = teams.length - 1;
		}

		//calculate the width of the teams container plus a little extra
		var finalWidth = (this.contentsWidth * numTeams) + 20;
		this.userListTeamContainer.css("width", finalWidth + "px");

		//reset to initial state
		this.menu.addClass("hide");
		this.isVisible = false;

		//build team contents
		var teams = this.gc.tm.getTeams();
		for(var i = 0; i < teams.length; i++) {
			if(!teams[i].isSpectatorTeam) {
				this.addTeamContents(teams[i]);
			}
		}

		//build initial user list
		var users = this.gc.um.getUsers();
		for(var i = 0; i < users.length; i++) {
			this.addUserListItem(users[i]);
		}

		//update other things initially
		for (const key in this.teamIdUserItemMap) {
			if (this.teamIdUserItemMap.hasOwnProperty(key)) {
				//this.removeTeamContents(this.teamIdUserItemMap[key]);
				this.updateTeamNumPlayers(this.teamIdUserItemMap[key].teamId)
				this.reorderTeamList(this.teamIdUserItemMap[key]);
				this.redrawTeamList(this.teamIdUserItemMap[key]);
			}
		}

		this.activated = true;
	}

	addTeamContents(team) {
		var newTeam = this.userListTeamContentsTemplate.clone()
		newTeam.removeAttr("id");
		newTeam.removeClass("hide");
		
		var obj = {
			teamId: team.serverId,
			teamContents: newTeam,
			divTitle: newTeam.find("div[name='team-title']"),
			divNumPlayers: newTeam.find("div[name='team-num-players']"),
			divRoundWins: newTeam.find("div[name='team-round-wins']"),
			divRoundPoints: newTeam.find("div[name='team-round-points']"),
			tbody: newTeam.find("tbody[name='ul-tbody']"),
			numPlayers: 0,
			userListItemOrdered: []
		};

		obj.divTitle.text(team.name);
		obj.divRoundPoints.text(team.roundPoints);
		obj.divRoundWins.text(team.roundWins);
		obj.divNumPlayers.text(team.numPlayers);

		this.teamIdUserItemMap[obj.teamId] = obj;

		this.userListTeamContainer.append(obj.teamContents);
	}

	removeTeamContents(teamObj) {
		teamObj.divTitle.remove();
		teamObj.divNumPlayers.remove();
		teamObj.divRoundPoints.remove();
		teamObj.divRoundWins.remove();
		teamObj.tbody.remove();
		teamObj.teamContents.remove();


		teamObj.divTitle = null;
		teamObj.divNumPlayers = null;
		teamObj.divRoundPoints = null;
		teamObj.divRoundWins = null;
		teamObj.tbody = null;
		teamObj.teamContents = null;
		teamObj.userListItemOrdered = [];

		delete this.userListTeamContainer[teamObj.teamId];
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
		if(this.activated) {
			this.menu.addClass("hide");
			window.dispatchEvent(new CustomEvent("user-list-menu-closed"));
			this.isVisible = false;
		}
	}
	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);

		if(this.activated) {
			//remove user list items from javascript memory
			for (const key in this.userIdUserListItemMap) {
				if (this.userIdUserListItemMap.hasOwnProperty(key)) {
					this.removeUserListItem(this.userIdUserListItemMap[key]);
				}
			}

			//redraw for the last time
			for (const key in this.teamIdUserItemMap) {
				if (this.teamIdUserItemMap.hasOwnProperty(key)) {
					this.reorderTeamList(this.teamIdUserItemMap[key]);
					this.redrawTeamList(this.teamIdUserItemMap[key]);
				}
			}

			//remove team items from javascript memory
			for (const key in this.teamIdUserItemMap) {
				if (this.teamIdUserItemMap.hasOwnProperty(key)) {
					this.removeTeamContents(this.teamIdUserItemMap[key]);
				}
			}

			//clear out user list
			this.userListTeamContainer.empty();
			this.userListSpectatorList.empty();
		}

		this.activated = false;
	}

	deinit() {
		this.reset();
	}

	addUserListItem(user) {
		this.currentUsers++;

		var newUserListItem = this.userListItemTemplate.clone();
		newUserListItem.removeClass("hide");
		newUserListItem.removeAttr("id");

		var divSpectator = this.userListSpectatorItemTemplate.clone();
		divSpectator.removeClass("hide");
		divSpectator.removeAttr("id");

		var obj = {
			serverId: user.serverId,
			teamId: user.teamId, //serves as the "old" teamId when looking up stuff later
			userKillCount: user.userKillCount,	//stored on here for sorting later
			userDeathCount: user.userDeathCount,//stored on here for sorting later
			listItem: newUserListItem,
			tdName: newUserListItem.find("td[name='ul-name-value']"),
			tdPoints: newUserListItem.find("td[name='ul-points-value']"),
			tdPing: newUserListItem.find("td[name='ul-ping-value']"),
			tdDeaths: newUserListItem.find("td[name='ul-deaths-value']"),
			divSpectator: divSpectator
		};

		obj.tdName.text(user.username);
		obj.tdPoints.text(user.userKillCount);
		obj.tdDeaths.text(user.userDeathCount);
		obj.tdPing.text(user.userRtt);
		obj.divSpectator.text(user.username);

		//if the user is your own, highlight it
		if(user.serverId === this.gc.myUserServerId) {
			obj.listItem.addClass("ul-tr-highlight");
			obj.divSpectator.addClass("ul-tr-highlight");
		}

		this.userIdUserListItemMap[user.serverId] = obj;

		var team = this.gc.tm.getTeamByServerID(user.teamId);
		var teamItem = this.teamIdUserItemMap[user.teamId];
		if(team !== null) {
			//append the spectator username to the spectator div
			if(team.isSpectatorTeam) {
				this.userListSpectatorList.append(obj.divSpectator)
			}
			//update the team list
			else if(teamItem !== undefined) {
				teamItem.numPlayers++;

				//only redraw if this is currently activated, otherwise its going to resort/redraw 30 or so times on the initial join
				if(this.activated) {
					this.updateTeamNumPlayers(teamItem.teamId);
					this.reorderTeamList(teamItem);
					this.redrawTeamList(teamItem);
				}
			}
		}

		this.userCountDiv.text("Players: " + this.currentUsers + "/32");
	}

	removeUserListItem(userObj) {
		this.currentUsers--;
		if(userObj !== undefined)
		{
			//update team player number if the user was part of a playing team
			var teamObj = this.teamIdUserItemMap[userObj.teamId];

			if(teamObj !== undefined) {
				teamObj.numPlayers--;
				userObj.teamId = null; //updateing teamId here so the teamListing draws correctly

				//only redraw if this is currently activated, otherwise its going to resort/redraw 30 or so times on the initial join
				if(this.activated) {
					this.updateTeamNumPlayers(teamObj.teamId);
					this.reorderTeamList(teamObj);
					this.redrawTeamList(teamObj);
				}
				
			}
			
			userObj.listItem.remove();
			userObj.tdName.remove();
			userObj.tdPoints.remove();
			userObj.tdPing.remove();
			userObj.tdDeaths.remove();
			userObj.divSpectator.remove();

			userObj.listItem = null;
			userObj.tdName = null;
			userObj.tdPoints = null;
			userObj.tdPing = null;
			userObj.tdDeaths = null;
			userObj.divSpectator = null;

			delete this.userIdUserListItemMap[userObj.serverId];
		}

		this.userCountDiv.text("Players: " + this.currentUsers + "/32");
	}

	userConnectedEvent(e) {
		if(this.activated) {
			var u = this.gc.um.getUserByServerID(e.userId);

			if(u !== null) {
				this.addUserListItem(u);
			}
		}
	}

	userDisconnectedEvent(e) {
		if(this.activated) {
			var u = this.gc.um.getUserByServerID(e.userId);
			var userObj = undefined;

			if(u !== null) {
				userObj = this.userIdUserListItemMap[u.serverId];
			}

			if(u !== null && userObj !== undefined) {
				this.removeUserListItem(userObj);
			}
		}
	}

	userInfoUpdated(e) {
		if(this.activated) {
			var u = this.gc.um.getUserByServerID(e.detail.serverId);
			var userObj = undefined;

			if(u !== null) {
				var userObj = this.userIdUserListItemMap[u.serverId];
			}

			if(u !== null && userObj !== undefined) {
				var oldTeamObj = undefined;
				var newTeamObj = undefined;
				var newTeam = null;

				oldTeamObj = this.teamIdUserItemMap[userObj.teamId];

				newTeam = this.gc.tm.getTeamByServerID(u.teamId);
				newTeamObj = this.teamIdUserItemMap[u.teamId];

				//update stats
				userObj.userKillCount = u.userKillCount;
				userObj.userDeathCount = u.userDeathCount;

				//if the team has changed, update the number of players and hide/unhide the spectator div
				if(u.teamId !== userObj.teamId) {
					//first, reset everything so its all hidden or detached
					userObj.listItem.detach();
					userObj.divSpectator.detach();

					//if the user is on the spectator team, show them on the spectator list
					if(newTeam.isSpectatorTeam) {
						this.userListSpectatorList.append(userObj.divSpectator);
					}

					//update the player count on the new and old teams if applicable
					if(newTeamObj !== undefined) {
						newTeamObj.numPlayers++;
						this.updateTeamNumPlayers(newTeamObj.teamId);
					}

					if(oldTeamObj !== undefined) {
						oldTeamObj.numPlayers--;
						this.updateTeamNumPlayers(oldTeamObj.teamId);
					}
				}

				//update teamId now (this needs to be updated before we reorder and redraw the team list)
				userObj.teamId = u.teamId;

				//update the user list on the new team
				if(newTeamObj !== undefined) {
					this.reorderTeamList(newTeamObj);
					this.redrawTeamList(newTeamObj);
				}

				//update the user list on the old team if the id is different
				if(oldTeamObj !== undefined && newTeamObj !== undefined && newTeamObj.teamId !== oldTeamObj.teamId) {
					this.reorderTeamList(oldTeamObj);
					this.redrawTeamList(oldTeamObj);
				}
				
				//update dom
				userObj.tdPoints.text(userObj.userKillCount);
				userObj.tdDeaths.text(userObj.userDeathCount);
			}
		}
	}

	updateTeamNumPlayers(teamId) {
		var teamObj = this.teamIdUserItemMap[teamId];
		if(teamObj !== undefined) {
			teamObj.divNumPlayers.text(teamObj.numPlayers);
		}
	}

	teamPointsUpdated(e) {
		if(this.activated) {
			var t = this.gc.tm.getTeamByServerID(e.detail.serverId);
			
			if(t !== null) {
				var teamObj = this.teamIdUserItemMap[t.serverId];
				if(teamObj !== undefined) {
					//update points
					teamObj.divRoundPoints.text(t.roundPoints);

					//update wins
					teamObj.divRoundWins.text(t.roundWins);
				}
			}
		}
	}

	userRttUpdated(e) {
		if(this.activated) {
			var u = this.gc.um.getUserByServerID(e.detail.serverId);
			var userObj = undefined;

			if(u !== null) {
				var userObj = this.userIdUserListItemMap[u.serverId];
			}

			if(u !== null && userObj !== undefined) {
				//update ping
				userObj.tdPing.text(u.userRtt);
			}
		}
	}

	reorderTeamList(teamObj) {
		var arrTeamMembers = [];

		//find the team members for the teamObj
		for (const key in this.userIdUserListItemMap) {
			if (this.userIdUserListItemMap.hasOwnProperty(key)) {
				if(this.userIdUserListItemMap[key].teamId === teamObj.teamId) {
					arrTeamMembers.push({
						serverId: this.userIdUserListItemMap[key].serverId,
						userKillCount: this.userIdUserListItemMap[key].userKillCount,
						userDeathCount: this.userIdUserListItemMap[key].userDeathCount,
					})
				}
			}
		}

		//sort by points desc, then death asc
		teamObj.userListItemOrdered = arrTeamMembers.sort((a, b) => {return b.userKillCount - a.userKillCount || a.userDeathCount - b.userDeathCount});
	}

	redrawTeamList(teamObj) {
		//first, detach everything from the tbody for users on that team
		for (const key in this.userIdUserListItemMap) {
			if (this.userIdUserListItemMap.hasOwnProperty(key)) {
				if(this.userIdUserListItemMap[key].teamId === teamObj.teamId) {
					this.userIdUserListItemMap[key].listItem.detach();
				}
			}
		}

		//second, attach everything to the tbody for users on that team IN ORDER
		for(var i = 0; i < teamObj.userListItemOrdered.length; i++) {
			var serverId = teamObj.userListItemOrdered[i].serverId;
			var userObj = this.userIdUserListItemMap[serverId];
			if(userObj !== undefined) {
				teamObj.tbody.append(userObj.listItem);
			}
		}
	}
}