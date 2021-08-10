import GlobalFuncs from '../global-funcs.js';

export default class GameClientBaseState {
	constructor(gc) {
		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();
	}

	enter(dt) {}
	update(dt) {}
	exit(dt) {}

	//other events to be passed into the game state for it to handle
	worldDoneState(e){};
	serverMapLoaded(e){};
	leaveGameImmediately(e){};
}
