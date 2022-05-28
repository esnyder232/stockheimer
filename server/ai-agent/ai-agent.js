const {GlobalFuncs} = require('../global-funcs.js');
const GameConstants = require('../../shared_files/game-constants.json');
const {AIAgentWaitingState} = require('./ai-agent-states/ai-agent-waiting-state.js');
const AIActionIdle = require('./ai-actions/ai-action-idle.js');

const logger = require("../../logger.js");

class AIAgent {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = null;
		this.userId = null;
		this.characterId = null;
		this.user = null; 			//direct reference to the user
		this.character = null; 		//direct reference to the character the ai agent is controlling
		this.username = "";

		this.playingEventQueue = [];
		
		this.state = null;
		this.nextState = null;
		this.stateName = "";
		this.targetCharacterDeactivatedHandleId = null;

		this.characterEventCallbackMapping = [ 
			{eventName: "character-deactivated", cb: this.cbEventEmitted.bind(this), handleId: null}
		];

		this.userEventCallbackMapping = [ 
			{eventName: "user-stopped-playing", cb: this.cbEventEmitted.bind(this), handleId: null}
		]


		this.aiClassResource = null;
		this.mainActionScores = [];
		this.mainAction = null;
		this.nextMainAction = null;

		this.skillActionScores = [];
		this.skillAction = null;
		this.nextSkillAction = null;

		this.frameInput = {
			up: false,
			down: false,
			left: false,
			right: false,
			isFiring: false,
			isFiringAlt: false,
			characterDirection: 0.0
		};
	}

	aiAgentInit(gameServer, userId) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
		this.userId = userId;

		this.user = this.gs.um.getUserByID(this.userId);
		this.username = "AI " + this.id + " (old)";

		this.user.em.batchRegisterForEvent(this.userEventCallbackMapping);

		this.state = new AIAgentWaitingState(this);
		this.nextState = null;
		this.state.enter();

		//create a fake idle action
		this.mainAction = new AIActionIdle.AIActionIdle(this, {
			"resource": {
				"type": "IDLE",
				"typeEnum": GameConstants.ActionTypes["IDLE"]
			},
			"score": 0
		});

		this.mainAction.enter();


		//create a fake idle skill
		this.skillAction = new AIActionIdle.AIActionIdle(this, {
			"resource": {
				"type": "IDLE",
				"typeEnum": GameConstants.ActionTypes["IDLE"]
			},
			"score": 0
		});

		this.skillAction.enter();

	}

	//called before the ai agent is deleted from the ai-agent-manager
	aiAgentDeinit() {
		// console.log("AiAgent " + this.id + " deinit called!");
		//also exit the current state and action for cleanup purposes
		this.state.exit();
		this.state = null;
		this.nextState = null;

		this.mainAction.exit();
		this.mainAction = null;
		this.nextMainAction = null;

		this.skillAction.exit();
		this.skillAction = null;
		this.nextSkillAction = null;

		this.user = null;
		this.character = null;
		this.aiClassResource = null;
		this.mainActionScores.length = 0;
		this.skillActionScores.length = 0;
	}


	setNextMainActionIdle() {
		//create a fake "idle" initial state
		this.nextMainAction = new AIActionIdle.AIActionIdle(this, {
			"resource": {
				"type": "IDLE",
				"typeEnum": GameConstants.ActionTypes["IDLE"]
			},
			"score": 0
		});
	}

	setNextSkillActionIdle() {
		//create a fake "idle" initial state
		this.nextSkillAction = new AIActionIdle.AIActionIdle(this, {
			"resource": {
				"type": "IDLE",
				"typeEnum": GameConstants.ActionTypes["IDLE"]
			},
			"score": 0
		});
	}


	cbEventEmitted(eventName, owner) {
		this.playingEventQueue.push({
			eventName: eventName
		})
	}

	processPlayingEvents() {
		if(this.user.bOkayToBeInTheGame) {
			if(this.playingEventQueue.length > 0) {
				for(var i = 0; i < this.playingEventQueue.length; i++) {
					switch(this.playingEventQueue[i].eventName) {
						case "character-deactivated":
							//unregister events
							this.character.em.batchUnregisterForEvent(this.characterEventCallbackMapping);
	
							//change state back to waiting
							this.nextState = new AIAgentWaitingState(this);
							break;
						case "user-stopped-playing":
							//unregister events
							this.user.em.batchUnregisterForEvent(this.userEventCallbackMapping);

							if(this.character !== null) {
								this.character.em.batchUnregisterForEvent(this.characterEventCallbackMapping);
							}
	
							//destroy this ai agent
							this.gs.aim.destroyAIAgent(this.id);
							break;
					}
				}
				this.playingEventQueue.length = 0;
			}
		}
	}

	frameInputChangeMovement(up, down, left, right) {
		this.frameInput.up = up;
		this.frameInput.down = down;
		this.frameInput.left = left;
		this.frameInput.right = right;
	}

	frameInputChangeShooting(isFiring, isFiringAlt) {
		this.frameInput.isFiring = isFiring;
		this.frameInput.isFiringAlt = isFiringAlt;
	}

	frameInputChangeDirection(characterDirection) {
		this.frameInput.characterDirection = characterDirection;
	}


	update(dt) {
		this.state.update(dt);
		this.mainAction.update(dt);
		this.skillAction.update(dt);

		if(this.nextState !== null) {
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}

		if(this.nextMainAction !== null) {
			this.mainAction.exit();
			this.nextMainAction.enter();

			this.mainAction = this.nextMainAction;
			this.nextMainAction = null;
		}

		if(this.nextSkillAction !== null) {
			this.skillAction.exit();
			this.nextSkillAction.enter();

			this.skillAction = this.nextSkillAction;
			this.nextSkillAction = null;
		}

		//input the frameInput into the user to go to the character
		this.user.inputQueue.push(this.frameInput);
	}
}

exports.AIAgent = AIAgent;