const AIActionBase = require('./ai-action-base.js');
const logger = require("../../../logger.js");

class AIActionMoveAwayEnemy extends AIActionBase.AIActionBase {
	constructor(aiAgent, actionScore) {
		super(aiAgent, actionScore);
		this.actionName = "MOVE_AWAY_ENEMY";
		this.checkTimer = 0;
		this.checkTimerInterval = 500;	//ms

		this.characterEventCallbackMapping = [ 
			{eventName: "character-deactivated", cb: this.enemyCharacterDeactivated.bind(this), handleId: null}
		];

		this.inputChanged = false;
		this.finalInput = {
			up: false,
			down: false,
			left: false,
			right: false,
			isFiring: false,
			isFiringAlt: false,
			characterDirection: this.aiAgent.angle
		}
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


			this.inputChanged = false;
			var finalVelVec = {
				x: 0,
				y: 0
			};

			var targetPos = this.targetCharacter.getPlanckPosition();
			var currentPos = this.aiAgent.character.getPlanckPosition();

			//just do current position - target position for now.
			//do path finding later
			finalVelVec.x = currentPos.x - targetPos.x;
			finalVelVec.y = currentPos.y - targetPos.y;

			if(Math.abs(finalVelVec.x) === 0 && Math.abs(finalVelVec.y) === 0)
			{
				finalVelVec.x = 1;
			}

			//the *-1 is to flip the y coordinates for planck cooridnate plane
			var angle = Math.atan((finalVelVec.y) / finalVelVec.x);
			
			//this is added to the end if we need to travel quadrant 2 or 3 of the unit circle...best comment ever.
			//this basically just flips the direction of the x and y
			angle += finalVelVec.x < 0 ? Math.PI : 0;

			//determine the direction: N, E, S, W
			//hackilicous
			var xAngle = Math.cos(angle);
			var yAngle = Math.sin(angle);

			if(xAngle >= 0.5)
			{
				this.finalInput.right = true;
			}
			else if (xAngle <= -0.5)
			{
				this.finalInput.left = true;
			}

			if(yAngle >= 0.5)
			{
				this.finalInput.up = true;
			}
			else if (yAngle <= -0.5)
			{
				this.finalInput.down = true;
			}

			//input the finalInput to the character
			this.aiAgent.user.inputQueue.push(this.finalInput);
			
		}
		
		super.update(dt);
	}

	exit(dt) {
		// logger.log("info", "AI " + this.aiAgent.id + ", action " + this.actionName + ' exit');

		if(this.targetCharacter !== null && this.targetCharacter.em !== null) {
			this.targetCharacter.em.batchUnregisterForEvent(this.characterEventCallbackMapping);
		}

		//stop the aiAgent's character
		this.aiAgent.user.inputQueue.push({
			up: false,
			down: false,
			left: false,
			right: false,
			isFiring: false,
			isFiringAlt: false,
			characterDirection: 0.0
		});

		super.exit(dt);
	}
	
	enemyCharacterDeactivated() {
		// logger.log("info", "AI " + this.aiAgent.id + ": target character was deactivated. Switching to idle.");
		this.aiAgent.setNextMainActionIdle();
	}
}

exports.AIActionMoveAwayEnemy = AIActionMoveAwayEnemy