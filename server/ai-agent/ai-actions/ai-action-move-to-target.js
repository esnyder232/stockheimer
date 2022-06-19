const AIActionBase = require('./ai-action-base.js');
const logger = require("../../../logger.js");

//this is for the actions "MOVE_TO_ENEMY" and "MOVE_TO_ALLY"
class AIActionMoveToTarget extends AIActionBase.AIActionBase {
	constructor(aiAgent, actionScore) {
		super(aiAgent, actionScore);
		this.actionName = "MOVE_TO_TARGET";
		this.checkTimer = 1000;
		this.checkTimerInterval = 1000;	//ms
		this.nodePath = [];
		this.currentNode = 0;
		this.targetCharacter = null;
		
		this.characterEventCallbackMapping = [ 
			{eventName: "character-deactivated", cb: this.enemyCharacterDeactivated.bind(this), handleId: null}
		];
	}
	
	enter(dt) {
		// logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' enter');

		this.targetCharacter = this.aiAgent.gs.gom.getGameObjectByID(this.actionScore.characterId);

		if(this.targetCharacter !== null && this.targetCharacter.em !== null && this.targetCharacter.isActive === true && this.aiAgent.character?.isActive === true) {
			//register stuff to the character
			this.targetCharacter.em.batchRegisterForEvent(this.characterEventCallbackMapping);

			var currentPos = this.aiAgent.character.getPlanckPosition();
			var targetPos = this.targetCharacter.getPlanckPosition();
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

		if(this.targetCharacter?.isActive === true && this.aiAgent.character?.isActive === true) {
			var currentPos = this.aiAgent.character.getPlanckPosition();
			var targetPos = this.targetCharacter.getPlanckPosition();

			//update the path incase the target moved around alot
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

		if(this.targetCharacter !== null && this.targetCharacter.em !== null) {
			this.targetCharacter.em.batchUnregisterForEvent(this.characterEventCallbackMapping);
		}

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

exports.AIActionMoveToTarget = AIActionMoveToTarget