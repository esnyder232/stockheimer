const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');

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