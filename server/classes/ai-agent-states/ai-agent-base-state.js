const {GlobalFuncs} = require('../../global-funcs.js');

class AIAgentBaseState {
	constructor(aiAgent) {
		this.aiAgent = aiAgent;
		this.globalfuncs = new GlobalFuncs();
	}

	enter(dt) {}
	update(dt) {}
	exit(dt) {}
}



exports.AIAgentBaseState = AIAgentBaseState;