const {GlobalFuncs} = require('../global-funcs.js');

//This is basically a wrapper wrapper class for Tiled exports (json exports from the Tiled program by Thorbjørn Lindeijer)
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