const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');

class Character {
	constructor() {
		this.gs = null;
		this.id = null;
		this.activeId = null;
		this.isActive = false;

		this.userId = null;

		this.stateName = "";
		this.state = null;
		this.nextState = null;
	}

	init(gameServer) {
		this.gs = gameServer;
	}

	reset() {
		//intentionally blank for now
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