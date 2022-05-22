const AIActionBase = require('./ai-action-base.js');
const logger = require("../../../logger.js");

class AIActionMoveAwayEnemy extends AIActionBase.AIActionBase {
	constructor(aiAgent, actionScore) {
		super(aiAgent, actionScore);
		this.actionName = "MOVE_AWAY_ENEMY";
		this.checkTimer = 0;
		this.checkTimerInterval = 500;	//ms
	}
	
	enter(dt) {
		logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' enter');
		super.enter(dt);
	}

	update(dt) {
		this.checkTimer += dt;

		if(this.checkTimer >= this.checkTimerInterval) {
			this.checkTimer = 0;
			// logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' update');

		}
		
		super.update(dt);
	}

	exit(dt) {
		logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' exit');
		super.exit(dt);
	}
}

exports.AIActionMoveAwayEnemy = AIActionMoveAwayEnemy