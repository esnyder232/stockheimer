const AIActionBase = require('./ai-action-base.js');
const logger = require("../../../logger.js");

class AIActionShootEnemy extends AIActionBase.AIActionBase {
	constructor(aiAgent, actionScore) {
		super(aiAgent, actionScore);
		this.actionName = "SHOOT_ENEMY";
		this.checkTimer = 500;
		this.checkTimerInterval = 500;	//ms

		this.characterEventCallbackMapping = [ 
			{eventName: "character-deactivated", cb: this.enemyCharacterDeactivated.bind(this), handleId: null}
		];
	}
	
	enter(dt) {
		// logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' enter');

		this.targetCharacter = this.aiAgent.gs.gom.getGameObjectByID(this.actionScore.characterId);

		if(this.targetCharacter !== null && this.targetCharacter.em !== null) {
			this.targetCharacter.em.batchRegisterForEvent(this.characterEventCallbackMapping);
		}
		
		super.enter(dt);
	}

	update(dt) {
		this.checkTimer += dt;

		if(this.checkTimer >= this.checkTimerInterval && this.targetCharacter?.isActive === true && this.aiAgent.character?.isActive === true) {
			this.checkTimer = 0;
			// logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' update');

			var targetPos = this.targetCharacter.getPlanckPosition();
			var currentPos = this.aiAgent.character.getPlanckPosition();

			//calculate angle
			var dx = targetPos.x - currentPos.x;
			var dy = targetPos.y - currentPos.y;

			//hack to make sure the entire server doesn't crash because 0/0 is NaN
			if(Math.abs(dx) === 0 && Math.abs(dy) === 0)
			{
				dx = 1
			}
			var angle = Math.atan(-dy / dx);

			//this is added to the end if we need to travel quadrant 2 or 3 of the unit circle...best comment ever.
			//this basically just flips the direction of the x and y
			angle += dx < 0 ? Math.PI : 0;

			this.aiAgent.frameInputChangeDirection(angle);
			this.aiAgent.frameInputChangeShooting(true, false);
		}
		
		super.update(dt);
	}

	exit(dt) {
		// logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' exit');

		if(this.targetCharacter !== null && this.targetCharacter.em !== null) {
			this.targetCharacter.em.batchUnregisterForEvent(this.characterEventCallbackMapping);
		}

		//stop the ai's firing
		this.aiAgent.frameInputChangeShooting(false, false);

		super.exit(dt);
	}

	enemyCharacterDeactivated() {
		// logger.log("info", "AI " + this.aiAgent.id + ": target character was deactivated. Switching to idle.");
		this.aiAgent.setNextSkillActionIdle();
	}
}

exports.AIActionShootEnemy = AIActionShootEnemy