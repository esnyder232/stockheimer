import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class KothTimerMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.isVisible = false;
		this.activated = false;

		this.menu = null;
		this.kothTimerContainer = null;
		this.kothTimerItemTemplate = null;
		this.internalSampleTimer = 250;
		this.kothTimerMap = {};
		this.activeKothObj = null;

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
			{event: 'team-koth-updated', func: this.teamKothUpdated.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#koth-timer-menu");
		this.kothTimerContainer = $("#koth-timer-container");
		this.kothTimerItemTemplate = $("#koth-timer-item-template");

		//reset to initial state
		if(this.gc.currentGameType === "koth") {
			this.menu.removeClass("hide");
			this.isVisible = true;
		} else {
			this.menu.addClass("hide");
			this.isVisible = false;
		}


		if(this.isVisible) {
			//build timers
			var allTeams = this.gc.tm.getTeams();
			for(var i = 0; i < allTeams.length; i++) {
				if(!allTeams[i].isSpectatorTeam) {
					var kothObj = this.addKothTimerContents(allTeams[i]);
					this.redrawKothTimer(kothObj);
					this.updateKothTimerText(kothObj);
				}
			}
			this.setActiveKothObj();
		}
		
		this.activated = true;
	}

	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		for(var key in this.kothTimerMap) {
			if (this.kothTimerMap.hasOwnProperty(key)) {
				this.removeKothTimerContents(this.kothTimerMap[key]);
			}
		}
		this.activated = false;
	}

	deinit() {
		this.reset();
	}


	addKothTimerContents(team) {
		var newTimer = this.kothTimerItemTemplate.clone()
		newTimer.removeAttr("id");
		newTimer.removeClass("hide");
		
		var kothObj = {
			serverId: team.serverId,
			kothContents: newTimer[0],
			teamRef: team,
			divText: newTimer.find("div[name='koth-timer-text']")[0]
		};

		//color the timers
		var borderColor = team.controlPointOwnerColor;
		kothObj.kothContents.style.borderColor = borderColor;

		this.kothTimerMap[kothObj.serverId] = kothObj;
		this.kothTimerContainer.append(kothObj.kothContents);

		return kothObj;
	}

	removeKothTimerContents(kothObj) {
		kothObj.divText.parentNode.removeChild(kothObj.divText);
		kothObj.kothContents.parentNode.removeChild(kothObj.kothContents);

		kothObj.kothContents = null;
		kothObj.divText = null;
		kothObj.teamRef = null;
		
		delete this.kothTimerMap[kothObj.serverId];
	}

	teamKothUpdated(e) {
		if(this.kothTimerMap[e.detail.serverId] !== undefined) {
			var kothObj = this.kothTimerMap[e.detail.serverId];
			this.redrawKothTimer(kothObj);
			this.updateKothTimerText(kothObj);
			this.setActiveKothObj();
		}
	}

	setActiveKothObj() {
		//go through the teams and find the one that is on
		var allTeams = this.gc.tm.getTeams();
		this.activeKothObj = null;
		for(var i = 0; i < allTeams.length; i++) {
			if(!allTeams[i].isSpectatorTeam && allTeams[i].kothTimerOn) {
				this.activeKothObj = this.kothTimerMap[allTeams[i].serverId];
				break;
			}
		}
	}

	//redraws colors based on if the 
	redrawKothTimer(kothObj) {
		if(kothObj.teamRef.kothTimerOn) {
			kothObj.kothContents.classList.add("koth-timer-active");
			kothObj.kothContents.classList.remove("koth-timer-inactive");
		} else {
			kothObj.kothContents.classList.add("koth-timer-inactive");
			kothObj.kothContents.classList.remove("koth-timer-active");
		}
	}

	//updates and redraws the time
	updateKothTimerText(kothObj) {
		kothObj.divText.textContent = kothObj.teamRef.getKothMinutes() + ":" + kothObj.teamRef.getKothSeconds();
	}


	update(dt) {
		if(this.activeKothObj !== null) {
			this.internalSampleTimer -= dt;
			if(this.internalSampleTimer <= 0) {
				this.updateKothTimerText(this.activeKothObj);
				this.internalSampleTimer = 250;
			}
		}
	}
}