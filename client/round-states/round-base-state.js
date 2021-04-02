import GlobalFuncs from '../global-funcs.js';

export default class RoundBaseState {
	constructor(gc, round) {
		this.gc = gc;
		this.round = round;
		this.globalfuncs = new GlobalFuncs();
	}

	enter(dt) {}
	update(dt) {}
	exit(dt) {}
}
