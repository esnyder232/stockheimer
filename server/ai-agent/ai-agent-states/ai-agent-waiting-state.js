const AIAgentBaseState = require('./ai-agent-base-state.js');
const AIAgentPlayingState = require('./ai-agent-playing-state.js');
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
		
		super.enter(dt);
	}

	update(dt) {
		//logger.log("info", this.stateName + ' update');
		var bContinue = true;

		//check if the user is playing
		if(this.aiAgent.user.stateName === "ai-playing-state" || this.aiAgent.user.stateName === "user-playing-state") {
			bContinue = true;
		}
		else {
			bContinue = false;
		}

		//check if the ai needs to pick a team. They need to pick a team if they are currently on spectator team
		var spectatorTeam = this.aiAgent.gs.tm.getSpectatorTeam();
		if(bContinue && spectatorTeam !== null && (this.aiAgent.user.teamId === null || this.aiAgent.user.teamId === spectatorTeam.id)) {
			var smallestTeam = this.aiAgent.globalfuncs.getSmallestTeam(this.aiAgent.gs);
			if(smallestTeam !== null && smallestTeam.id !== spectatorTeam.id) {
				this.aiAgent.user.updateTeamId(smallestTeam.id);
				logger.log("info", "ai " + this.aiAgent.user.username + " has joined team " + smallestTeam.name);
			}

			bContinue = false;
		}

		//check if the ai needs to pick a class
		if(bContinue && this.aiAgent.user.playingStateName === "CLASS_PICKING") {
			var randomClass = this.aiAgent.globalfuncs.getRandomClass(this.aiAgent.gs);
			if(randomClass !== null) {
				this.aiAgent.user.updateCharacterClassId(randomClass.id);
				this.aiAgent.aiClassResource = this.aiAgent.gs.rm.getResourceByKey(randomClass.data?.aiClass);

				//prepopulate the scores for the utility ai
				if(this.aiAgent.aiClassResource !== null) {
					logger.log("info", "ai " + this.aiAgent.user.username + " has picked the class " + randomClass.data.name + ". Using " + this.aiAgent.aiClassResource.key + " ai class.");

					//fill in the history arrays
					this.aiAgent.actionHistory.length = 0;

					for(var i = 0; i < this.aiAgent.aiClassResource.data.mainActions.length; i++) {
						this.aiAgent.actionHistory.push({
							id: this.aiAgent.aiClassResource.data.mainActions[i].id,
							type: this.aiAgent.aiClassResource.data.mainActions[i].type,
							tsPrev: 0
						});
					}

					for(var i = 0; i < this.aiAgent.aiClassResource.data.skillActions.length; i++) {
						this.aiAgent.actionHistory.push({
							id: this.aiAgent.aiClassResource.data.skillActions[i].id,
							type: this.aiAgent.aiClassResource.data.skillActions[i].type,
							tsPrev: 0
						});
					}



				} else {
					logger.log("info", "WARNING: ai " + this.aiAgent.user.username + " has picked the class " + randomClass.data.name + ", but there is no ai class found for " + randomClass.data?.aiClass + ".");
				}
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

			this.aiAgent.character.em.batchRegisterForEvent(this.aiAgent.characterEventCallbackMapping);

			this.aiAgent.nextState = new AIAgentPlayingState.AIAgentPlayingState(this.aiAgent);
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