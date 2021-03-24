const {GlobalFuncs} = require('../global-funcs.js');


class Team {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = null;
		this.name = "??? team";
		this.slotNum = 0;
	}

	teamInit(gameServer) {
		this.gs = gameServer;

		this.globalfuncs = new GlobalFuncs();		
	}
}

exports.Team = Team;