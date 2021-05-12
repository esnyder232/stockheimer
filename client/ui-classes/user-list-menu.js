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

		this.contentsWidth = 400; //pixels

		this.activated = false;

		this.windowsEventMapping = [];
		this.userIdUserListItemMap = {}; //key: userId. value: object containing jquery objects for the user in the list
		this.teamIdUserItemMap = {}; //key: teamId. value: object containing user information regarding their ordering in the user list
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
		this.activated = true;

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
		//update player numbers
		for(var i = 0; i < teams.length; i++) {
			this.updateTeamNumPlayers(teams[i].serverId)
		}
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
			divRoundPoints: newTeam.find("div[name='team-round-points']"),
			tbody: newTeam.find("tbody[name='ul-tbody']"),
			numPlayers: 0
		};

		obj.divTitle.text(team.name);
		obj.divRoundPoints.text(team.roundPoints);
		obj.divNumPlayers.text(team.numPlayers);

		this.teamIdUserItemMap[obj.teamId] = obj;

		this.userListTeamContainer.append(obj.teamContents);
	}

	removeTeamContents(teamObj) {
		console.log('Now removing team contents ' + teamObj.teamId)
		teamObj.divTitle.remove();
		teamObj.divNumPlayers.remove();
		teamObj.divRoundPoints.remove();
		teamObj.tbody.remove();
		teamObj.teamContents.remove();


		teamObj.divTitle = null;
		teamObj.divNumPlayers = null;
		teamObj.divRoundPoints = null;
		teamObj.tbody = null;
		teamObj.teamContents = null;

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
		this.menu.addClass("hide");
		window.dispatchEvent(new CustomEvent("user-list-menu-closed"));
		this.isVisible = false;
	}
	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);

		//remove user list items from javascript memory
		for (const key in this.userIdUserListItemMap) {
			if (this.userIdUserListItemMap.hasOwnProperty(key)) {
				this.removeUserListItem(this.userIdUserListItemMap[key]);
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
			teamId: user.teamId, //serves as the "old" teamId when
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

		this.userIdUserListItemMap[user.serverId] = obj;

		var team = this.gc.tm.getTeamByServerID(user.teamId);
		var teamItem = this.teamIdUserItemMap[user.teamId];
		if(team !== null) {
			//append the spectator username to the spectator div
			if(team.isSpectatorTeam) {
				this.userListSpectatorList.append(obj.divSpectator)
			}
			//append the listitem to the team
			else if(teamItem !== undefined) {
				teamItem.tbody.append(obj.listItem);
				teamItem.numPlayers++;
				obj.divSpectator.detach();
				this.updateTeamNumPlayers(teamItem.teamId);
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
				this.updateTeamNumPlayers(teamObj.teamId);
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
				//update score
				userObj.tdPoints.text(u.userKillCount);

				//update death
				userObj.tdDeaths.text(u.userDeathCount);

				//update ping
				userObj.tdPing.text(u.userRtt);

				//if the team has changed, move the user tr around to the new team
				if(u.teamId !== userObj.teamId) {
					//first, reset everything so its all hidden or detached
					userObj.listItem.detach();
					userObj.divSpectator.detach();
					
					var newTeam = null;
					var oldTeamObj = undefined;
					var newTeamObj = undefined;

					oldTeamObj = this.teamIdUserItemMap[userObj.teamId];

					newTeam = this.gc.tm.getTeamByServerID(u.teamId);
					newTeamObj = this.teamIdUserItemMap[u.teamId];


					//if the user is no longer on the spectator team, add to new team (extra checks for safety)
					if(!newTeam.isSpectatorTeam && newTeamObj !== undefined) {
						newTeamObj.tbody.append(userObj.listItem);
					}
					//if the user IS on the spectator team
					else if(newTeam.isSpectatorTeam) {
						this.userListSpectatorList.append(userObj.divSpectator);
					}
					
					//update the player count on the teams that changed
					if(newTeamObj !== undefined) {
						newTeamObj.numPlayers++;
						this.updateTeamNumPlayers(newTeamObj.teamId);
					}

					if(oldTeamObj !== undefined) {
						oldTeamObj.numPlayers--;
						this.updateTeamNumPlayers(oldTeamObj.teamId);
					}
				
				}

				//update teamId
				userObj.teamId = u.teamId;
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
}