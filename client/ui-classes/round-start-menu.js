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

		this.roundStartGametype = null;
		this.roundStartRules = null;
		this.roundStartRoundNum = null;
		
		this.gameType = "";
		this.gameRules = "";
	}

	init(gc) {
		this.reset();

		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();
	}

	roundStarted() {
		this.menu.removeClass("fade-out-5");
		this.menu.removeClass("hide");
		this.updateRoundNumText();
		window.setTimeout(() => {
			this.menu.addClass("fade-out-5");
		}, 100);
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'round-started', func: this.roundStarted.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements		
		this.menu = $("#round-start-menu");
		this.roundStartGametype = $("#round-start-gametype");
		this.roundStartRules = $("#round-start-rules");
		this.roundStartRoundNum = $("#round-start-round-num");

		//gametype and rules
		this.gameType = "";
		this.gameRules = "";
		
		if(this.gc.currentGameType === "deathmatch") {
			this.gameType = "Deathmatch";
			this.gameRules = "First to " + this.gc.matchWinCondition + " wins";
		} else if (this.gc.currentGameType === "elimination") {
			this.gameType = "Elimination";
			this.gameRules = "First to " + this.gc.matchWinCondition + " wins";
		}

		this.roundStartGametype.text(this.gameType);
		this.roundStartRules.text(this.gameRules);
		
		this.updateRoundNumText();

		//reset to initial state
		this.menu.addClass("hide");
		this.activated = true;
	}

	updateRoundNumText() {
		var roundText = "Round " + this.gc.theRound.roundNum;
		this.roundStartRoundNum.text(roundText);
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
		this.menu.addClass("hide");
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.activated = false;
	}

	deinit() {
		this.reset();
	}
}