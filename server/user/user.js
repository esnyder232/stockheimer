const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');
const {UserDisconnectedState} = require("./user-disconnected-state.js");

class User {
	constructor() {
		this.gs = null;
		this.id = null;
		this.activeId = null;
		this.isActive = false;

		this.username = "";
		this.wsId = null;

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.serverToClientEvents = []; //event queue to be processed by the packet system
		this.clientToServerEvents = []; //event queue to be processed by the main loop for events coming from the client

		this.characterId = null; //temp character id to establish a relationship between a user and character

		this.inputQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;

		this.state = new UserDisconnectedState(this);
		this.state.enter();
	}

	reset() {
		this.serverToClientEvents = [];
		this.clientToServerEvents = [];
		this.characterId = null;
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
