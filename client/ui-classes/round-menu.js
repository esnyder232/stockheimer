import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class RoundMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.windowsEventMapping = [];

		this.menu = null;

		this.internalSampleTimer = 250; //sample timer so i don't run jquery 60 times a second
		this.bUpdateRoundTimer = true;
	}

	init(gc) {
		this.gc = gc;

		this.globalfuncs = new GlobalFuncs();
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'round-added', func: this.roundAdded.bind(this)},
			{event: 'round-state-updated', func: this.roundStateUpdated.bind(this)},
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#round-menu");
		this.roundTimer = $("#round-timer");
		this.roundState = $("#round-state");

		//reset to initial state
		this.roundTimer.text("12:00");
		this.roundState.text("Initializing");
	}

	roundAdded() {
		this.updateRoundTimer();
		this.updateRoundStateDiv();
	}
	
	roundStateUpdated() {
		this.updateTimerState();
		this.updateRoundTimer();
		this.updateRoundStateDiv();
	}

	updateRoundStateDiv() {
		switch(this.gc.theRound.stateName) {
			case "MAPSTART":
				this.roundState.removeClass("hide");
				this.roundState.text("Waiting for players to join");
				break;
			case "STARTING":
				this.roundState.removeClass("hide");
				this.roundState.text("Round Starting");
				break;
			case "PLAYING":
				this.roundState.addClass("hide");
				break;
			case "OVER":
				this.roundState.removeClass("hide");
				this.roundState.text("Round Over");
				break;
			case "MAPEND":
				this.roundState.removeClass("hide");
				this.roundState.text("Changing Maps");
				break;
		}
	}

	updateTimerState() {
		switch(this.gc.theRound.stateName) {
			case "MAPSTART":
				this.roundTimer.removeClass("hide");
				this.bUpdateRoundTimer = true;
				break;
			case "STARTING":
				this.roundTimer.removeClass("hide");
				this.bUpdateRoundTimer = true;
				break;
			case "PLAYING":
				//in koth, we hide the time when playing
				if(this.gc.currentGameType === "koth") {
					this.roundTimer.addClass("hide");
					this.bUpdateRoundTimer = false;
				} else {
					this.roundTimer.removeClass("hide");
					this.bUpdateRoundTimer = true;
				}
				break;
			case "OVER":
				this.roundTimer.removeClass("hide");
				this.bUpdateRoundTimer = true;
				break;
			case "MAPEND":
				this.roundTimer.removeClass("hide");
				this.bUpdateRoundTimer = true;
				break;
		}
	}


	updateRoundTimer() {
		this.roundTimer.text(this.gc.theRound.getMinutes() + ":" + this.gc.theRound.getSeconds())
	}
	

	update(dt) {
		if(this.bUpdateRoundTimer) {
			this.internalSampleTimer -= dt;
			if(this.internalSampleTimer <= 0)
			{
				this.updateRoundTimer();
				this.internalSampleTimer = 250;
			}
		}
	}

	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
	}

	deinit() {
		this.reset();
	}


}