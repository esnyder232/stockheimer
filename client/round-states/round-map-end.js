import RoundBaseState from './round-base-state.js';

export default class RoundMapEnd extends RoundBaseState {
	constructor(gc, round) {
		super(gc, round);
		this.stateName = "MAPEND";
	}
	
	enter(dt) {
		super.enter(dt);
		window.dispatchEvent(new CustomEvent("round-map-end"));
	}

	update(dt) {
		
		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
}
