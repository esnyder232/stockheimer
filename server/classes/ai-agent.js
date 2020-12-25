const {GlobalFuncs} = require('../global-funcs.js');

//This class keeps track of nodes and edges for a particular tilemap. It also holds the functions for the actual pathing (breadth first/A*/ect).
class AIAgent {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = null;
		this.characterId = null;

		this.username = "";
	}

	aiAgentInit(gameServer, characterId) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
		this.characterId = characterId

		this.username = "AI " + this.id;
	}
}

exports.AIAgent = AIAgent;