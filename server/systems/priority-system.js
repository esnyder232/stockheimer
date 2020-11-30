const {GlobalFuncs} = require('../global-funcs.js');

class PrioritySystem {
	constructor() {
		this.gs = null;
		this.pl = null;
		this.world = null;
		this.globalfuncs = new GlobalFuncs();
	}

	init(gs) {
		this.gs = gs;

		this.pl = this.gs.pl;
		this.world = this.gs.world;
	}

	update(dt) {
		var playingUsers = this.gs.um.getPlayingUsers();

		for(var i = 0; i < playingUsers.length; i++)
		{
			//go through the objects the user is tracking
		}

	}

}

exports.PrioritySystem = PrioritySystem;
