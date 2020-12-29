const {AIAgentBaseState} = require('./ai-agent-base-state.js');
const {AIAgentSeekPlayerState} = require('./ai-agent-seek-player-state.js');
const {AIAgentAttackCastleState} = require('./ai-agent-attack-castle-state.js');
const {AIAgentForcedIdleState} = require('./ai-agent-forced-idle-state.js');

class AIAgentSeekCastleState extends AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-seek-castle-state";
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

exports.AIAgentSeekCastleState = AIAgentSeekCastleState;