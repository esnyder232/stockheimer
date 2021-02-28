const {GlobalFuncs} = require('../global-funcs.js');


class Team {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = null;
		this.name = "??? team";
	}

	init(gameServer, id) {
		this.gs = gameServer;
		this.id = id;

		this.globalfuncs = new GlobalFuncs();		
	}
}

exports.Team = Team;