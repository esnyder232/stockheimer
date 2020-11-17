const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');
const {UserDisconnectedState} = require("./user-disconnected-state.js");

class User {
	constructor() {
		this.gs = null;
		this.username = "";
		this.id = 0;
		this.wsId = 0;

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.primaryCharacters = []; //characters to be sent to the client every frame
		this.secondaryCharacters = []; //characters to be sent to the client every other frame (or more as necessary)
	}

	init(gameServer) {
		this.gs = gameServer;

		this.state = new UserDisconnectedState(this);
		this.state.enter();
	}

	update(dt) {
		if(this.state === null)
		{
			console.log('STATE IS NULL for user ' + + this.usiderId + '!!!');
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
