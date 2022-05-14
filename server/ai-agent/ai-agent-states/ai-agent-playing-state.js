const AIAgentBaseState = require('./ai-agent-base-state.js');
const logger = require("../../../logger.js");

class AIAgentPlayingState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-playing-state";
		this.checkTimer = 0;
		this.checkTimerInterval = 1000;	//ms
	}
	
	enter(dt) {
		logger.log("info", this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;
		super.enter(dt);
	}

	update(dt) {
		//logger.log("info", this.stateName + ' update');
		this.checkTimer += dt;

		if(this.checkTimer >= this.checkTimerInterval) {
			console.log("I'm in!");
			this.checkTimer = 0;


			
			//think
			for(var i = 0; i < this.aiAgent.aiClassResource.data.mainActions.length; i++) {

			}



			//act



		}

		super.update(dt);
		this.aiAgent.processPlayingEvents();
	}

	exit(dt) {
		logger.log("info", this.stateName + ' exit');
		this.aiAgent.aiClassResource = null;
		super.exit(dt);
	}
}

exports.AIAgentPlayingState = AIAgentPlayingState;