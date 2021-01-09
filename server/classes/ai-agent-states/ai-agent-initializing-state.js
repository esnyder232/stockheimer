const AIAgentBaseState = require('./ai-agent-base-state.js');
const AIAgentSeekCastleState = require('./ai-agent-seek-castle-state.js');
const AIAgentIdleState = require('./ai-agent-idle-state.js');

//This annoying state is the first state the AI agent ever enters.
//Its sole purpose is to wait until the game object (character the ai is controlling) is activated (meaning the character is in the game loop/in planck/etc).
//THEN this state sets up references/planck bodies (for vision)/etc
class AIAgentInitializingState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-initializing-state";
	}
	
	enter(dt) {
		//console.log(this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;
		super.enter(dt);
	}

	update(dt) {
		//console.log(this.stateName + ' update');

		//wait until the character is active
		if(this.aiAgent.bCharacterIsActive)
		{
			//setup direct references because i use them so much
			this.aiAgent.character = this.aiAgent.gs.gom.getGameObjectByID(this.aiAgent.characterId);

			//just to make sure
			if(this.aiAgent.character !== null && this.aiAgent.character.isActive)
			{
				this.aiAgent.characterPos = this.aiAgent.character.plBody.getPosition();
				//var pos = character.plBody.getPosition();

				if(this.aiAgent.characterPos !== null) 
				{
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
						userData: {type:"ai-agent", id: this.aiAgent.id}
					});

					this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
				}
			}
		}
		super.update(dt);
	}

	exit(dt) {
		//console.log(this.stateName + ' exit');
		super.exit(dt);
	}
}

exports.AIAgentInitializingState = AIAgentInitializingState;