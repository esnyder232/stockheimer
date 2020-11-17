import GlobalFuncs from '../global-funcs.js';

export default class GameClientBaseState {
	constructor(gc) {
		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();
	}

	enter(dt) {}
	update(dt) {}
	exit(dt) {}

	//websocket event callbacks
	websocketClosed(){};
	websocketOpened(){};
	websocketErrored(){};
}
