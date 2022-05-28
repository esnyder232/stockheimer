const AIActionBase = require('./ai-action-base.js');
const logger = require("../../../logger.js");

class AIActionStayCloseToEnemy extends AIActionBase.AIActionBase {
	constructor(aiAgent, actionScore) {
		super(aiAgent, actionScore);
		this.actionName = "STAY_CLOSE_TO_ENEMY";
	}
	
	enter(dt) {
		// logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' enter');

		//stop the aiAgent's character
		this.aiAgent.frameInputChangeMovement(false, false, false, false);

		super.enter(dt);
	}

	update(dt) {
		super.update(dt);
	}

	exit(dt) {
		// logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' exit');

		super.exit(dt);
	}
}

exports.AIActionStayCloseToEnemy = AIActionStayCloseToEnemy