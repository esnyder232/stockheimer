const AIActionBase = require('./ai-action-base.js');
const logger = require("../../../logger.js");

class AIActionMoveToControlPoint extends AIActionBase.AIActionBase {
	constructor(aiAgent, actionScore) {
		super(aiAgent, actionScore);
		this.actionName = "MOVE_TO_CONTROL_POINT";
		this.checkTimer = 1000;
		this.checkTimerInterval = 1000;	//ms
		this.nodePath = [];
		this.currentNode = 0;
		this.targetControlPoint = null;
	}
	
	enter(dt) {
		// logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' enter');

		this.targetControlPoint = this.aiAgent.gs.gom.getGameObjectByID(this.actionScore.controlPointId);

		if(this.targetControlPoint !== null && this.targetControlPoint.isActive === true && this.aiAgent.character?.isActive === true) {
			var currentPos = this.aiAgent.character.getPlanckPosition();
			var targetPos = this.targetControlPoint.getPlanckPosition();
			if(targetPos !== null) {
				var pathResults = this.aiAgent.getPathToTarget(currentPos, targetPos, this.aiAgent.character.characterClearance);
				this.nodePath = pathResults.nodePath;
				this.currentNode = pathResults.currentNode;
			}
		}

		this.aiAgent.resetPathingVariables();

		super.enter(dt);
	}

	update(dt) {
		this.checkTimer += dt;

		if(this.aiAgent.character?.isActive === true) {
			var currentPos = this.aiAgent.character.getPlanckPosition();
			var targetPos = this.targetControlPoint.getPlanckPosition();

			//update the path incase the character was moved off the control point
			if(this.checkTimer >= this.checkTimerInterval) {
				this.checkTimer = 0;
				var pathResults = this.aiAgent.getPathToTarget(currentPos, targetPos, this.aiAgent.character.characterClearance);
				this.nodePath = pathResults.nodePath;
				this.currentNode = pathResults.currentNode;
			}

			//move the character along the path
			this.currentNode = this.aiAgent.moveAlongPath(currentPos, this.nodePath, this.currentNode, dt);
		}
		super.update(dt);
	}

	exit(dt) {
		// logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' exit');

		//stop the aiAgent's character
		this.aiAgent.frameInputChangeMovement(false, false, false, false);
		this.aiAgent.resetPathingVariables();

		super.exit(dt);
	}


	enemyCharacterDeactivated() {
		// logger.log("info", "AI " + this.aiAgent.id + ": target character was deactivated. Switching to idle.");
		this.aiAgent.setNextMainActionIdle();
	}
}

exports.AIActionMoveToControlPoint = AIActionMoveToControlPoint