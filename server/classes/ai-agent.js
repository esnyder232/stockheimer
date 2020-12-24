const {GlobalFuncs} = require('../global-funcs.js');

//This class keeps track of nodes and edges for a particular tilemap. It also holds the functions for the actual pathing (breadth first/A*/ect).
class AIAgent {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = null;
		this.characterId = null;
	}

	init(gameServer, characterId) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
		this.characterId = characterId
	}
}

exports.AIAgent = AIAgent;