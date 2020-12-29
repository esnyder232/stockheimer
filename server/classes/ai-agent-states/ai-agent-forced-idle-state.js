const {AIAgentBaseState} = require('./ai-agent-base-state.js');
const {AIAgentSeekCastleState} = require('./ai-agent-seek-castle-state.js');

class AIAgentForcedIdleState extends AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-forced-idle-state";
	}
	
	enter(dt) {
		console.log(this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;
		super.enter(dt);
	}

	update(dt) {
		console.log(this.stateName + ' update');
		super.update(dt);
	}

	exit(dt) {
		console.log(this.stateName + ' exit');
		super.exit(dt);
	}
}

exports.AIAgentForcedIdleState = AIAgentForcedIdleState;