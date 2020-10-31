const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');


class User {
	constructor() {
		this.gs = null;
		this.username = "";
		this.stateName = "";

		this.stateDirty = false;
		this.isDirty = false;
	}

	init(gameServer) {
		this.gs = gameServer;
	}



}



exports.User = User;