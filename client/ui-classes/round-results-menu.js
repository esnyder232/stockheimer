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
		this.activated = false;

		this.menu = null;

		this.windowsEventMapping = [];

		this.roundResultsWinner = null;
		this.roundResultsStandings = null;
		this.roundResultsStandingsItemTemplate = null;
		this.mvpBestTableBody = null;
		this.mvpWorstTableBody = null;
		this.mvpItemTemplate = null;
		this.roundResultsGameRules = null;
		this.matchWinText = null;
		this.matchWinTextTitle = null;
		this.matchWinTextRules = null;

		this.winningTeamServerIds = [];
		this.mvpBestUserServerIds = [];
		this.mvpWorstUserServerIds = [];
		this.mvpBestHeals = [];
		this.mvpWorstHeals = [];
	}

	init(gc) {
		this.reset();

		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();
	}

	roundStarted() {
		this.closeMenu();
		this.matchWinText.addClass("hide");
	}

	roundOver() {
		this.closeMenu();
	}

	roundMapEnd() {
		this.closeMenu();
		this.matchWinText.addClass("hide");
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'close-round-results-menu', func: this.closeMenu.bind(this)},
			{event: 'round-results', func: this.roundResultsEvent.bind(this)},
			{event: 'team-wins-updated', func: this.teamWinsUpdated.bind(this)},
			{event: 'team-wins-updated', func: this.teamWinsUpdated.bind(this)},
			{event: 'round-started', func: this.roundStarted.bind(this)},
			{event: 'round-over', func: this.roundOver.bind(this)},
			{event: 'round-map-end', func: this.roundMapEnd.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements		
		this.menu = $("#round-results-menu");
		this.roundResultsWinner = $("#round-results-winner");
		this.roundResultsStandings = $("#round-results-standings");
		this.roundResultsStandingsItemTemplate = $("#round-results-standings-item-template");
		this.mvpBestTableBody = $("#mvp-best-tbody");
		this.mvpWorstTableBody = $("#mvp-worst-tbody");
		this.mvpItemTemplate = $("#mvp-item-template");
		this.roundResultsGameRules = $("#round-results-game-rules");
		this.matchWinText = $("#match-win-text");
		this.matchWinTextTitle = $("#match-win-text-title");
		this.matchWinTextRules = $("#match-win-text-rules");

		//gametype and rules
		var gameType = "";
		var gameRules = "";
		if(this.gc.currentGameType === "deathmatch") {
			gameType = "Deathmatch";
			gameRules = "First to " + this.gc.matchWinCondition + " wins";
		} else if (this.gc.currentGameType === "elimination") {
			gameType = "Elimination";
			gameRules = "First to " + this.gc.matchWinCondition + " wins";
		}

		var finalText = "(" + gameType + ": " + gameRules + ")";

		this.roundResultsGameRules.text(finalText);

		//reset to initial state
		this.menu.addClass("hide");
		this.matchWinText.addClass("hide");
		this.activated = true;
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
			this.roundResultsWinner.css("color", "");
		}

		//populate the team standings
		this.populateTeamStandings();
		
		//populate the mvp best players
		for(var i = 0; i < this.mvpBestUserServerIds.length; i++) {
			this.createMVPItem(this.mvpBestTableBody, this.mvpBestUserServerIds[i], this.mvpBestHeals[i]);
		}

		//populate the mvp worst players
		for(var i = 0; i < this.mvpWorstUserServerIds.length; i++) {
			this.createMVPItem(this.mvpWorstTableBody, this.mvpWorstUserServerIds[i], this.mvpWorstHeals[i]);
		}
	}

	
	populateTeamStandings() {
		var teams = this.gc.tm.getTeams();
		var teamsSorted = [];

		for(var i = 0; i < teams.length; i++) {
			if(!teams[i].isSpectatorTeam) {
				teamsSorted.push({
					index: i,
					roundWins: teams[i].roundWins,
					slotNum: teams[i].slotNum
				})
			}
		}

		//sort by roundWins desc, slotnum asc
		teamsSorted.sort((a, b) => {return b.roundWins - a.roundWins || a.slotNum - b.slotNum;});

		for(var i = 0; i < teamsSorted.length; i++) {
			this.createTeamStandingItem(teams[teamsSorted[i].index]);
		}
	}


	createTeamStandingItem(team) {
		console.log("==== Adding ITEM === ");
		var newItem = this.roundResultsStandingsItemTemplate.clone();
		newItem.removeClass("hide");
		newItem.removeAttr("id");
	
		var newItemTeam = newItem.find("div[name='round-results-standings-team']");
		var newItemWins = newItem.find("div[name='round-results-standings-wins']");

		newItemTeam.text(team.name);
		newItemWins.text(team.roundWins);

		//color the row the team colors
		newItem.css("color", team.killFeedTextColor);

		this.roundResultsStandings.append(newItem);
	}


	createMVPItem(tBody, userServerId, heals) {
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
			var newItemHeals = newItem.find("td[name='mvp-heals-value']");

			newItemTeam.text(team.name);
			newItemName.text(user.username);
			newItemPoints.text(user.roundUserKillCount);
			newItemDeaths.text(user.roundUserDeathCount);
			newItemHeals.text(heals);
			

			//color the row the team colors
			newItem.css("color", team.killFeedTextColor);
		}

		tBody.append(newItem);
	}


	roundResultsEvent(serverEvent) {
		var e = serverEvent.detail.e;
		this.winningTeamServerIds = [];
		this.mvpBestUserServerIds = [];
		this.mvpWorstUserServerIds = [];
		this.mvpBestHeals = [];
		this.mvpWorstHeals = [];

		var winningTeamIdSplit = e.winningTeamCsv.split(",");
		var bestCsvSplit = e.mvpBestCsv.split(",");
		var worstCsvSplit = e.mvpWorstCsv.split(",");
		var bestMvpsHealsCsv = e.bestMvpsHealsCsv.split(",");
		var worstMvpsHeals = e.worstMvpsHealsCsv.split(",");
		
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

		for(var i = 0; i < bestMvpsHealsCsv.length; i++) {
			if(this.globalfuncs.isNumeric(bestMvpsHealsCsv[i])) {
				this.mvpBestHeals.push(parseFloat(bestMvpsHealsCsv[i]));
			}
		}

		for(var i = 0; i < worstMvpsHeals.length; i++) {
			if(this.globalfuncs.isNumeric(worstMvpsHeals[i])) {
				this.mvpWorstHeals.push(parseFloat(worstMvpsHeals[i]));
			}
		}



		if(e.matchWon) {
			var teamName = "???";
			var gameType = "";
			var gameRules = "";

			//winner text
			var t = this.gc.tm.getTeamByServerID(e.matchWinnerTeamId);
			if(t !== null) {
				teamName = t.name;
			}

			//gametype and rules
			if(this.gc.currentGameType === "deathmatch") {
				gameType = "Deathmatch";
				gameRules = "First to " + this.gc.matchWinCondition + " wins";
			} else if (this.gc.currentGameType === "elimination") {
				gameType = "Elimination";
				gameRules = "First to " + this.gc.matchWinCondition + " wins";
			}

			var finalText = "(" + gameType + ": " + gameRules + ")";

			this.matchWinText.removeClass("hide");
			this.matchWinTextTitle.text(teamName + " wins the match!");
			this.matchWinTextRules.text(finalText)

			this.matchWinTextTitle.css("color", t.killFeedTextColor);
		}

		this.populateRoundResults();
		this.openMenu();
	}

	teamWinsUpdated() {
		this.roundResultsStandings.empty();
		this.populateTeamStandings();
	}


	clearRoundResults() {
		this.roundResultsWinner.empty();
		this.mvpBestTableBody.empty();
		this.mvpWorstTableBody.empty();
		this.roundResultsStandings.empty();
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
		this.matchWinText.addClass("hide");
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		if(this.activated) {
			this.clearRoundResults();
		}
		this.activated = false;
	}

	deinit() {
		this.reset();
	}
}