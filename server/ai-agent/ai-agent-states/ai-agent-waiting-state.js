const AIAgentBaseState = require('./ai-agent-base-state.js');
// const AIAgentSeekCastleState = require('./ai-agent-seek-castle-state.js');
const AIAgentIdleState = require('./ai-agent-idle-state.js');
const {CollisionCategories, CollisionMasks} = require('../../data/collision-data.js');
const logger = require("../../../logger.js");

//this state just waits for the user and character to initialize and become activated.
class AIAgentWaitingState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-waiting-state";
	}
	
	enter(dt) {
		// logger.log("info", this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;
		this.aiAgent.character = null;
		this.aiAgent.characterPos = null;

		
		this.aiAgent.assignTargetCharacter(null);
		
		super.enter(dt);
	}

	update(dt) {
		//logger.log("info", this.stateName + ' update');
		var bContinue = true;

		//check if the user is playing
		if(this.aiAgent.user.stateName !== "ai-playing-state") {
			bContinue = false;
		}

		//check if the ai needs to pick a class
		if(bContinue && this.aiAgent.user.playingStateName === "CLASS_PICKING") {
			var randomClass = this.globalfuncs.getRandomClass(this.aiAgent.gs);
			if(randomClass !== null) {
				this.aiAgent.user.updateCharacterClassId(randomClass.id);
				logger.log("info", "ai " + this.aiAgent.user.username + " has picked the class " + randomClass.data.name);
			}

			bContinue = false;
		}

		//check if the character the user is controlling is activated
		if(bContinue) {
			var c = this.aiAgent.gs.gom.getGameObjectByID(this.aiAgent.user.characterId);
			if(c === null || !c.isActive) {
				bContinue = false;
			}
		}

		//at this point, the user is playing and the character the user is controlling is activated.
		if(bContinue) {
			//setup direct references because i use them so much in other states
			this.aiAgent.character = this.aiAgent.gs.gom.getGameObjectByID(this.aiAgent.user.characterId);
			this.aiAgent.characterPos = this.aiAgent.character.plBody.getPosition();

			//////////////////////////////////////////
			// old (may be removed completely later)
			//create a aiVision body for the ai agent
			const Vec2 = this.aiAgent.gs.pl.Vec2;
			const pl = this.aiAgent.gs.pl;

			var trackingSensor = pl.Circle(Vec2(0, 0), this.aiAgent.playerSeekingRange);

			//attach the player seeking sensor to the character. Meh, we'll see how choatic it gets :)
			this.aiAgent.character.plBody.createFixture({
				shape: trackingSensor,
				density: 0.0,
				friction: 1.0,
				isSensor: true,
				filterCategoryBits: CollisionCategories["ai_sensor"],
				filterMaskBits: CollisionMasks["ai_sensor"],
				userData: {type:"ai-agent", id: this.aiAgent.id}
			});
			//////////////////////////////////////////

			this.aiAgent.character.em.batchRegisterForEvent(this.aiAgent.characterEventCallbackMapping);

			//go to the next state
			this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
		}

		this.aiAgent.processPlayingEvents();

		super.update(dt);
	}

	exit(dt) {
		// logger.log("info", this.stateName + ' exit');
		super.exit(dt);
	}
}

exports.AIAgentWaitingState = AIAgentWaitingState;