const {GlobalFuncs} = require('../../global-funcs.js');

class AIActionBase {
	constructor(aiAgent, actionScore) {
		this.aiAgent = aiAgent;
		this.globalfuncs = new GlobalFuncs();
		this.actionScore = actionScore;
	}

	enter(dt) {}
	update(dt) {}
	exit(dt) {}
}



exports.AIActionBase = AIActionBase;