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

		this.packetArray = [];
	}

	init(gameServer) {
		this.gs = gameServer;

		this.state = new UserDisconnectedState(this);
		this.state.enter();
	}

	update(dt) {
		if(this.state === null)
		{
			console.log('STATE IS NULL!!!');
			var stopHere = true;
		}
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