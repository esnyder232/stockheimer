import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class RoundResultsMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.isVisible = false;

		this.menu = null;

		this.windowsEventMapping = [];

		this.roundResultsWinner = null;
		this.mvpBestTableBody = null;
		this.mvpWorstTableBody = null;
		this.mvpItemTemplate = null;

		this.winningTeamServerIds = [];
		this.mvpBestUserServerIds = [];
		this.mvpWorstUserServerIds = [];
	}

	init(gc) {
		this.reset();

		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'close-round-results-menu', func: this.closeMenu.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements		
		this.menu = $("#round-results-menu");
		this.roundResultsWinner = $("#round-results-winner");
		this.mvpBestTableBody = $("#mvp-best-tbody");
		this.mvpWorstTableBody = $("#mvp-worst-tbody");
		this.mvpItemTemplate = $("#mvp-item-template");

		//reset to initial state
		this.menu.addClass("hide");
	}

	populateRoundResults() {
		//clear previous results if there is any
		this.clearRoundResults();

		//populate the winning text
		if(this.winningTeamServerIds.length === 1) {
			var winningTeam = this.gc.tm.getTeamByServerID(this.winningTeamServerIds[0]);

			if(winningTeam !== null) {
				this.roundResultsWinner.text(winningTeam.name + " wins!");
				this.roundResultsWinner.css("color", winningTeam.killFeedTextColor);
			}
		}
		else if(this.winningTeamServerIds.length > 1) {
			var winningTeamNamesArray = [];
			for(var i = 0; i < this.winningTeamServerIds.length; i++) {
				var winningTeam = this.gc.tm.getTeamByServerID(this.winningTeamServerIds[i]);

				if(winningTeam !== null) {
					winningTeamNamesArray.push(winningTeam.name);
				}
			}

			this.roundResultsWinner.text("Stalemate! " + winningTeamNamesArray.join(" & ") + " tied!");
		}
		
		//populate the mvp best players
		for(var i = 0; i < this.mvpBestUserServerIds.length; i++) {
			this.createMVPItem(this.mvpBestTableBody, this.mvpBestUserServerIds[i]);
		}

		//populate the mvp worst players
		for(var i = 0; i < this.mvpWorstUserServerIds.length; i++) {
			this.createMVPItem(this.mvpWorstTableBody, this.mvpWorstUserServerIds[i]);
		}
	}

	createMVPItem(tBody, userServerId) {
		var newItem = this.mvpItemTemplate.clone();
		newItem.removeClass("hide");
		newItem.removeAttr("id");

		//find the user
		var user = this.gc.um.getUserByServerID(userServerId);
		var team = null;

		if(user !== null) {
			team = this.gc.tm.getTeamByServerID(user.teamId);
		}

		if(user !== null && team !== null) {
			var newItemTeam = newItem.find("td[name='mvp-team-value']");
			var newItemName = newItem.find("td[name='mvp-name-value']");
			var newItemPoints = newItem.find("td[name='mvp-points-value']");
			var newItemDeaths = newItem.find("td[name='mvp-deaths-value']");

			newItemTeam.text(team.name);
			newItemName.text(user.username);
			newItemPoints.text(user.userKillCount);
			newItemDeaths.text(123);

			//color the row the team colors
			newItem.css("color", team.killFeedTextColor);
		}

		tBody.append(newItem);
	}


	roundResultsEvent(e) {
		this.winningTeamServerIds = [];
		this.mvpBestUserServerIds = [];
		this.mvpWorstUserServerIds = [];

		var winningTeamIdSplit = e.winningTeamCsv.split(",");
		var bestCsvSplit = e.mvpBestCsv.split(",");
		var worstCsvSplit = e.mvpWorstCsv.split(",");

		for(var i = 0; i < winningTeamIdSplit.length; i++) {
			if(this.globalfuncs.isNumeric(winningTeamIdSplit[i])) {
				this.winningTeamServerIds.push(parseFloat(winningTeamIdSplit[i]));
			}
		}

		for(var i = 0; i < bestCsvSplit.length; i++) {
			if(this.globalfuncs.isNumeric(bestCsvSplit[i])) {
				this.mvpBestUserServerIds.push(parseFloat(bestCsvSplit[i]));
			}
		}

		for(var i = 0; i < worstCsvSplit.length; i++) {
			if(this.globalfuncs.isNumeric(worstCsvSplit[i])) {
				this.mvpWorstUserServerIds.push(parseFloat(worstCsvSplit[i]));
			}
		}
	}


	clearRoundResults() {
		this.roundResultsWinner.empty();
		this.mvpBestTableBody.empty();
		this.mvpWorstTableBody.empty();
	}

	openMenu() {
		this.menu.removeClass("hide");		
		this.isVisible = true;
	}

	closeMenu() {
		this.menu.addClass("hide");
		this.isVisible = false;
	}
	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.clearRoundResults();
	}

	deinit() {
		this.reset();
	}
}