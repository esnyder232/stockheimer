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
		this.updateRoundTimer();
		this.updateRoundStateDiv();
	}

	updateRoundStateDiv() {
		switch(this.gc.theRound.stateName) {
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
		}
	}

	updateRoundTimer() {
		this.roundTimer.text(this.gc.theRound.getMinutes() + ":" + this.gc.theRound.getSeconds())
	}
	

	update(dt) {
		this.internalSampleTimer -= dt;
		if(this.internalSampleTimer <= 0)
		{
			this.updateRoundTimer();
			this.internalSampleTimer = 250;
		}
	}

	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
	}

	deinit() {
		this.reset();
	}


}