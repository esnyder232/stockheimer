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
		this.teamScoreTitle = null;
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
		this.teamScoreTitle = $("#team-score-title");
		this.teamScoreList = $("#team-score-list");
		this.teamScoreItemTemplate = $("#team-score-item-template");

		//reset to initial state
		if(this.gc.currentGameType === "koth") {
			this.isVisible = false;
			this.menu.addClass("hide");
		} else {
			this.isVisible = true;
			this.menu.removeClass("hide");
		}
		
		this.activated = true;

		//build initial team list
		this.redrawAllTeamScores();
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

	//for now, just redraw all the scores in the correct order.
	redrawAllTeamScores() {
		if(this.isVisible) {
			if(this.gc.currentGameType === "deathmatch") {
				this.teamScoreTitle.text("Deathmatch");
	
				//clear out old scores
				this.teamScoreList.empty();
	
				var teams = this.gc.tm.getTeams();
				var teamsSorted = [];
	
				for(var i = 0; i < teams.length; i++) {
					if(!teams[i].isSpectatorTeam) {
						teamsSorted.push({
							index: i,
							roundPoints: teams[i].roundPoints
						});
					}
				}
	
				teamsSorted.sort((a, b) => {return b.roundPoints - a.roundPoints;});
	
				for(var i = 0; i < teamsSorted.length; i++) {
					var t = teams[teamsSorted[i].index];
					
					var newItem = this.teamScoreItemTemplate.clone();
					newItem.removeClass("hide");
					newItem.removeAttr("id");
					newItem.text(t.name + " - " + t.roundPoints);
					newItem.css("color", t.killFeedTextColor);
	
					this.teamScoreList.append(newItem);
				}
			} else if(this.gc.currentGameType === "elimination") {
				this.teamScoreTitle.text("Elimination");
	
				//clear out old scores
				this.teamScoreList.empty();
	
				var teams = this.gc.tm.getTeams();
				var teamsSorted = [];
	
				for(var i = 0; i < teams.length; i++) {
					if(!teams[i].isSpectatorTeam) {
						teamsSorted.push({
							index: i,
							slotNum: teams[i].slotNum
						});
					}
				}
	
				teamsSorted.sort((a, b) => {return b.slotNum - a.slotNum;});
	
				for(var i = 0; i < teamsSorted.length; i++) {
					var t = teams[teamsSorted[i].index];
					
					var newItem = this.teamScoreItemTemplate.clone();
					newItem.removeClass("hide");
					newItem.removeAttr("id");
					newItem.text(t.name + " - " + t.usersAlive);
					newItem.css("color", t.killFeedTextColor);
	
					this.teamScoreList.append(newItem);
				}
			}
		}
	}

	teamPointsUpdated(e) {
		this.redrawAllTeamScores();
	}
}