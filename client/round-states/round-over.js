import RoundBaseState from './round-base-state.js';

export default class RoundOver extends RoundBaseState {
	constructor(gc, round) {
		super(gc, round);
	}
	
	enter(dt) {
		super.enter(dt);
		console.log("Client side round. Round is now in over state.");
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
}
