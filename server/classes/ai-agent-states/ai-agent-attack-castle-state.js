const AIAgentBaseState = require('./ai-agent-base-state.js');
const AIAgentSeekCastleState = require('./ai-agent-seek-castle-state.js');
const AIAgentIdleState = require('./ai-agent-idle-state.js');

class AIAgentAttackCastleState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-attack-castle-state";
	}
	
	enter(dt) {
		//console.log(this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;
		super.enter(dt);
	}

	update(dt) {
		//console.log(this.stateName + ' update');
		super.update(dt);

		//any state can be forced into the forced idle state with bForceIdle
		if(this.aiAgent.bForceIdle)
		{
			this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
		}
	}

	exit(dt) {
		//console.log(this.stateName + ' exit');
		super.exit(dt);
	}
}

exports.AIAgentAttackCastleState = AIAgentAttackCastleState;