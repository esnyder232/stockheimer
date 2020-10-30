const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');


class Player {
	constructor() {
		this.gs = null;
	}

	init(gameServer) {
		this.gs = gameServer;
	}



}



exports.Player = Player;