import RoundBaseState from './round-base-state.js';

export default class RoundPlaying extends RoundBaseState {
	constructor(gc, round) {
		super(gc, round);
		this.stateName = "PLAYING";
	}
	
	enter(dt) {
		super.enter(dt);
		//console.log("Client side round. Round is now in playing state.");
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}
}
