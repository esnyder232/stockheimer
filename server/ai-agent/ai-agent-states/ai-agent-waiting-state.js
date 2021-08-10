const AIAgentBaseState = require('./ai-agent-base-state.js');
const AIAgentIdleState = require('./ai-agent-idle-state.js');
const AIAgentHealIdleState = require('./ai-agent-heal-idle-state.js');
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




			//calculate attack range of ai (probably a shitty way to do this, oh well)
			this.aiAgent.attackingRangeSquared = 10;

			//get the projectile that the character can shoot
			var cr = this.aiAgent.character.characterClassResource;
			var fireStateResource = null;
			var projectileResource = null;

			if(cr !== null) {
				fireStateResource = this.aiAgent.gs.rm.getResourceByKey(cr?.data?.fireStateKey);
				if(fireStateResource !== null) {
					projectileResource = this.aiAgent.gs.rm.getResourceByKey(fireStateResource?.data?.projectileKey);
				}
			}

			//calculate the range of the primary projectile
			if(projectileResource !== null) {
				var speed = projectileResource?.data?.physicsData?.speed;
				var spawnOffsetLength = projectileResource?.data?.projectileData?.spawnOffsetLength;
				var timeLength = projectileResource?.data?.projectileData?.timeLength;

				if(speed !== undefined && spawnOffsetLength !== undefined && timeLength !== undefined) {
					var temp = speed*(timeLength/1000) + spawnOffsetLength;
					this.aiAgent.attackingRangeSquared = temp*temp;

					if(this.aiAgent.attackingRangeSquared < 1) {
						this.aiAgent.attackingRangeSquared = 1;
					}

					// console.log("AIAgent for character class '" +cr?.data?.name + "', range calculated to be: " + this.aiAgent.attackingRangeSquared);
				}
			}

			//determine if you are a healing or an attacking role (for now, just look at the primary projectile)
			if(projectileResource !== null) {
				var characterEffects = this.aiAgent.globalfuncs.getValueDefault(projectileResource?.data?.characterEffectData, []);

				//if you find any healing, you are for sure a healing class. Thats the law.
				var healingEffect = characterEffects.find((x) => {return x.type === "heal";});

				if(healingEffect !== undefined) {
					this.aiAgent.characterRole = "heal";
				} else {
					this.aiAgent.characterRole = "damage";
				}
			}

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

			if(this.aiAgent.characterRole === "heal") {
				this.aiAgent.nextState = new AIAgentHealIdleState.AIAgentHealIdleState(this.aiAgent);
			} else {
				this.aiAgent.nextState = new AIAgentIdleState.AIAgentIdleState(this.aiAgent);
			}
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