const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');
//const {UserDisconnectedState} = require("./user-disconnected-state.js");

class Character {
	constructor() {
		this.gs = null;
		this.id = 0;
		this.userId = 0;

		this.stateName = "";
		this.state = null;
		this.nextState = null;
	}

	init(gameServer) {
		this.gs = gameServer;
		
		// this.state = new UserDisconnectedState(this);
		// this.state.enter();
	}

	update(dt) {
		//this.state.update();

		if(this.nextState)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}
	}
}

exports.Character = Character;