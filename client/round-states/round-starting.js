import RoundBaseState from './round-base-state.js';

export default class RoundStarting extends RoundBaseState {
	constructor(gc, round) {
		super(gc, round);
		this.stateName = "STARTING";
	}
	
	enter(dt) {
		super.enter(dt);
		window.dispatchEvent(new CustomEvent("round-started"));
	}

	update(dt) {
		
		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
}
