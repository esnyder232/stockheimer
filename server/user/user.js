const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');
const {UserDisconnectedState} = require("./user-disconnected-state.js");

class User {
	constructor() {
		this.gs = null;
		this.username = "";
		this.userId = 0;

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.eventWriter = null;
		this.eventQueue = [];
		this.wsBuffer = null;
		this.wsView = null;
		this.maxBufferSize = 130;
	}

	init(gameServer) {
		this.gs = gameServer;
		this.eventBuffer = new ArrayBuffer(this.maxBufferSize);

		this.state = new UserDisconnectedState(this);
		this.state.enter();

		// this.eventWriter = new EventWriter();
		// this.eventWriter.init(this);
	}

	update(dt) {
		if(this.state === null)
		{
			console.log('STATE IS NULL for user ' + + this.userId + '!!!');
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