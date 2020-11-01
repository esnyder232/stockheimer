const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');
const {UserDisconnectedState} = require("./user-disconnected-state.js");

class User {
	constructor() {
		this.gs = null;
		this.username = "";
		this.stateName = "";

		this.state = null;
		this.nextState = null;
	}

	init(gameServer) {
		this.gs = gameServer;

		this.state = new UserDisconnectedState(this);
		this.state.enter();
	}

	update(dt) {
		this.state.update();

		if(this.nextState)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}
	}



}



exports.User = User;