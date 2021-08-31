import RoundBaseState from './round-base-state.js';

export default class RoundOver extends RoundBaseState {
	constructor(gc, round) {
		super(gc, round);
		this.stateName = "OVER";
	}
	
	enter(dt) {
		super.enter(dt);
		//console.log("Client side round. Round is now in over state.");
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {		
		//close the round results if its open
		// this.gc.mainScene.roundResultsMenu.closeMenu();
		window.dispatchEvent(new CustomEvent("round-over"));

		super.exit(dt);
	}
}
