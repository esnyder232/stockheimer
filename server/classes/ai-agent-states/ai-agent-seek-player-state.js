const {AIAgentBaseState} = require('./ai-agent-base-state.js');
const {AIAgentSeekCastleState} = require('./ai-agent-seek-castle-state.js');
const {AIAgentForcedIdleState} = require('./ai-agent-forced-idle-state.js');
const {AIAgentAttackPlayerState} = require('./ai-agent-attack-player-state.js');

class AIAgentSeekPlayerState extends AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-seek-player-state";
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

exports.AIAgentSeekPlayerState = AIAgentSeekPlayerState;