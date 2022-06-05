const AIAgentBaseState = require('./ai-agent-base-state.js');
const GameConstants = require('../../../shared_files/game-constants.json');
const logger = require("../../../logger.js");
const AIActionIdle = require("../ai-actions/ai-action-idle.js");
const AIActionMoveToTarget = require("../ai-actions/ai-action-move-to-target.js");
const AIActionMoveAwayEnemy = require("../ai-actions/ai-action-move-away-enemy.js");
const AIActionStayCloseToEnemy = require("../ai-actions/ai-action-stay-close-to-enemy.js");
const AIActionShootTarget = require("../ai-actions/ai-action-shoot-target.js");
const AIActionAltShootTarget = require("../ai-actions/ai-action-alt-shoot-target.js");
const AIActionMoveAwayAlly = require("../ai-actions/ai-action-move-away-ally.js");


class AIAgentPlayingState extends AIAgentBaseState.AIAgentBaseState {
	constructor(aiAgent) {
		super(aiAgent);
		this.stateName = "ai-agent-playing-state";
		this.checkTimer = 0;
		this.checkTimerInterval = 100;	//ms
		this.spectatorTeamId = null;

		//for now, just map the enum values to the constructors
		this.ActionTypeClassMapping = {};
		this.ActionTypeClassMapping[GameConstants.ActionTypes["IDLE"]] = AIActionIdle.AIActionIdle;
		this.ActionTypeClassMapping[GameConstants.ActionTypes["MOVE_TO_ENEMY"]] = AIActionMoveToTarget.AIActionMoveToTarget;
		this.ActionTypeClassMapping[GameConstants.ActionTypes["MOVE_TO_ALLY"]] = AIActionMoveToTarget.AIActionMoveToTarget;
		this.ActionTypeClassMapping[GameConstants.ActionTypes["MOVE_AWAY_ENEMY"]] = AIActionMoveAwayEnemy.AIActionMoveAwayEnemy;
		this.ActionTypeClassMapping[GameConstants.ActionTypes["STAY_CLOSE_TO_ENEMY"]] = AIActionStayCloseToEnemy.AIActionStayCloseToEnemy;
		this.ActionTypeClassMapping[GameConstants.ActionTypes["SHOOT_ENEMY"]] = AIActionShootTarget.AIActionShootTarget;
		this.ActionTypeClassMapping[GameConstants.ActionTypes["SHOOT_ALLY"]] = AIActionShootTarget.AIActionShootTarget;
		this.ActionTypeClassMapping[GameConstants.ActionTypes["ALT_SHOOT_ENEMY"]] = AIActionAltShootTarget.AIActionAltShootTarget;
		this.ActionTypeClassMapping[GameConstants.ActionTypes["ALT_SHOOT_ALLY"]] = AIActionAltShootTarget.AIActionAltShootTarget;
		this.ActionTypeClassMapping[GameConstants.ActionTypes["ALT_SHOOT_SELF"]] = AIActionAltShootTarget.AIActionAltShootTarget;
		this.ActionTypeClassMapping[GameConstants.ActionTypes["MOVE_AWAY_ALLY"]] = AIActionMoveAwayAlly.AIActionMoveAwayAlly;


		
	}
	
	enter(dt) {
		// logger.log("info", this.stateName + ' enter');
		this.aiAgent.stateName = this.stateName;

		this.spectatorTeamId = this.aiAgent.gs.tm.getSpectatorTeam().id;
		super.enter(dt);
	}

	update(dt) {
		//logger.log("info", this.stateName + ' update');
		this.checkTimer += dt;

		if(this.checkTimer >= this.checkTimerInterval) {
			this.checkTimer = 0;

			this.populateActionScores();
			
			//think
			for(var i = 0; i < this.aiAgent.mainActionScores.length; i++) {
				this.aiAgent.mainActionScores[i].score = this.calculateScore(this.aiAgent.mainActionScores[i]);
			}

			for(var i = 0; i < this.aiAgent.skillActionScores.length; i++) {
				this.aiAgent.skillActionScores[i].score = this.calculateScore(this.aiAgent.skillActionScores[i]);
			}

			//score/act
			if(this.aiAgent.mainActionScores.length > 0) {
				//sort the scores and find the winner
				this.aiAgent.mainActionScores.sort((a, b) => {return b.score - a.score;});
							
				// var debughere = true;
				// logger.log("info", "AI " + this.aiAgent.id + " winning action: " + this.aiAgent.mainActionScores[0].resource.type);
				var bReplaceAction = false;
				
				if(this.aiAgent.mainAction !== null) {
					//check to see if the action is equivalent to the one the ai agent is already executing. if they are NOT equal, then replace it with the winning action
					if(!this.aiAgent.globalfuncs.areAiActionsEqual(this.aiAgent.mainAction, this.aiAgent.mainActionScores[0])) {
						bReplaceAction = true;
					}
				} else {
					bReplaceAction = true;
				}

				if(bReplaceAction) {
					this.aiAgent.nextMainAction = new this.ActionTypeClassMapping[this.aiAgent.mainActionScores[0].resource.typeEnum](this.aiAgent, this.aiAgent.mainActionScores[0]);

					//also mark in the history when this action was chosen
					this.aiAgent.actionHistory[this.aiAgent.mainActionScores[0].resource.id].tsPrev = this.aiAgent.gs.currentTick;
				}

			}

			if(this.aiAgent.skillActionScores.length > 0) {
				//sort the scores and find the winner
				this.aiAgent.skillActionScores.sort((a, b) => {return b.score - a.score;});
							
				// var debughere = true;
				// logger.log("info", "AI " + this.aiAgent.id + " winning action: " + this.aiAgent.skillActionScores[0].resource.type);
				var bReplaceAction = false;

				if(this.aiAgent.skillAction !== null) {
					//check to see if the action is equivalent to the one the ai agent is already executing. if they are NOT equal, then replace it with the winning action
					if(!this.aiAgent.globalfuncs.areAiActionsEqual(this.aiAgent.skillAction, this.aiAgent.skillActionScores[0])) {
						bReplaceAction = true;
					}
				} else {
					bReplaceAction = true;
				}

				if(bReplaceAction) {
					this.aiAgent.nextSkillAction = new this.ActionTypeClassMapping[this.aiAgent.skillActionScores[0].resource.typeEnum](this.aiAgent, this.aiAgent.skillActionScores[0]);

					//also mark in the history when this action was chosen
					this.aiAgent.actionHistory[this.aiAgent.skillActionScores[0].resource.id].tsPrev = this.aiAgent.gs.currentTick;
				}
			}
		}

		super.update(dt);
		this.aiAgent.processPlayingEvents();
	}

	exit(dt) {
		// logger.log("info", this.stateName + ' exit');
		this.aiAgent.mainActionScores.length = 0;
		this.aiAgent.skillActionScores.length = 0;
		this.aiAgent.setNextMainActionIdle();
		this.aiAgent.setNextSkillActionIdle();

		super.exit(dt);
	}

	
	


	populateActionScores() {
		this.aiAgent.mainActionScores.length = 0;
		this.aiAgent.skillActionScores.length = 0;

		if(this.aiAgent.aiClassResource !== null && this.aiAgent.aiClassResource.data !== null)  {
			for(var i = 0; i < this.aiAgent.aiClassResource.data.mainActions.length; i++) {
				this.populateWithTargets(this.aiAgent.mainActionScores, this.aiAgent.aiClassResource.data.mainActions[i]);
			}
			for(var i = 0; i < this.aiAgent.aiClassResource.data.skillActions.length; i++) {
				this.populateWithTargets(this.aiAgent.skillActionScores, this.aiAgent.aiClassResource.data.skillActions[i]);
			}
		}
	}

	populateWithTargets(actionScoresArr, actionResource) {
		//split the actions based on the type
		switch(actionResource.typeEnum) {
			case GameConstants.ActionTypes["MOVE_AWAY_ENEMY"]:
			case GameConstants.ActionTypes["MOVE_TO_ENEMY"]:
			case GameConstants.ActionTypes["STAY_CLOSE_TO_ENEMY"]:
			case GameConstants.ActionTypes["SHOOT_ENEMY"]:
			case GameConstants.ActionTypes["ALT_SHOOT_ENEMY"]:
				//calculate the "enemies" for this ai
				//for now, just get characters from the playing users. It would overall better to have a list of active characters ready to go, but that requires some effort to do (game object manager should keep track of it i think)
				var playingUsers = this.aiAgent.gs.um.getPlayingUsers();

				//add the characterid to the list of targets if its NOT on your current team
				for(var j = 0; j < playingUsers.length; j++) {

					//check to make the user actually has an active character
					if(playingUsers[j].characterId !== null && 
						playingUsers[j].teamId !== this.spectatorTeamId &&
						playingUsers[j].teamId !== this.aiAgent.user.teamId &&
						this.aiAgent.gs.gom.getGameObjectByID(playingUsers[j].characterId)?.isActive) {
							actionScoresArr.push({
								"resource": actionResource,
								"characterId": playingUsers[j].characterId,
								"score": 0
							});
					}
				}

				break;

			case GameConstants.ActionTypes["MOVE_AWAY_ALLY"]:
			case GameConstants.ActionTypes["MOVE_TO_ALLY"]:
			case GameConstants.ActionTypes["SHOOT_ALLY"]:
			case GameConstants.ActionTypes["ALT_SHOOT_ALLY"]:
				//calculate the "allies" for this ai
				var playingUsers = this.aiAgent.gs.um.getPlayingUsers();

				//add the characterid to the list of targets if its NOT on your current team
				for(var j = 0; j < playingUsers.length; j++) {

					//check to make the user actually has an active character
					if(playingUsers[j].characterId !== null && 
						playingUsers[j].teamId !== this.spectatorTeamId &&
						playingUsers[j].teamId === this.aiAgent.user.teamId &&
						playingUsers[j].characterId !== this.aiAgent.character.id &&
						this.aiAgent.gs.gom.getGameObjectByID(playingUsers[j].characterId)?.isActive) {
							actionScoresArr.push({
								"resource": actionResource,
								"characterId": playingUsers[j].characterId,
								"score": 0
							});
					}
				}
				break;
			case GameConstants.ActionTypes["NO_TYPE"]:
				//intentionally blank
				break;
				
			case GameConstants.ActionTypes["ALT_SHOOT_SELF"]:
				actionScoresArr.push({
					"resource": actionResource,
					"characterId": this.aiAgent.character.id,
					"score": 0
				});
				break;
			default:
				actionScoresArr.push({
					"resource": actionResource,
					"score": 0
				});
				break;
		}
	}



	calculateScore(action) {
		// console.log("Calculating for AI " + this.aiAgent.id +" - " + action.resource.type + ".");
		var considerationScoreAccum = 1;


		//STOPPED HERE
		// First, put in ai for each class. That way you can see more considerations that are required.
		// - do healer next
		// 
		//
		// Do a blackboard based on the following in order:
		// - per consideration calculation
		// - per context targets
		// - check time
		//
		// also stagger the ai utility scoring on a frequency basis. And make sure the blackboard caching lasts that long.
	


		//score all the considerations against each target
		var x = 0;
		for(var i = 0; i < action.resource.considerations.length; i++) {
			x = 0;

			//calculate the 'x' in the correct context
			switch(action.resource.considerations[i].typeEnum) {
				case GameConstants.ConsiderationTypes["MY_DISTANCE_SQUARED_FROM_TARGET"]:
					x = this.considerationDistanceSquaredFromEnemy(action, action.resource.considerations[i])
					break;				
				case GameConstants.ConsiderationTypes["MY_DISTANCE_SQUARED_FROM_ANY_ENEMY"]:
					x = this.considerationDistanceSquaredFromAnyEnemy(action, action.resource.considerations[i])
					break;
				case GameConstants.ConsiderationTypes["HAS_LINE_OF_SIGHT_FROM_TARGET"]:
					x = this.considerationHasLineOfSightFromEnemy(action, action.resource.considerations[i])
					break;
				case GameConstants.ConsiderationTypes["HAS_PATH_UNOBSTRUCTED_TO_TARGET"]:
					x = this.considerationHasPathUnobstructedToEnemy(action, action.resource.considerations[i])
					break;
				case GameConstants.ConsiderationTypes["MS_PASSED_SINCE_SAME_ACTION"]:
					x = this.considerationMsPassedSinceSameAction(action, action.resource.considerations[i]);
					break;
				case GameConstants.ConsiderationTypes["SKILL_OFF_COOLDOWN"]:
					x = this.considerationSkillOffCooldown(action, action.resource.considerations[i]);
					break;
				case GameConstants.ConsiderationTypes["MY_HEALTH_PERCENTAGE"]:
					x = this.considerationMyHealthPercentage(action, action.resource.considerations[i]);
					break;
				case GameConstants.ConsiderationTypes["MY_TARGETS_HEALTH_PERCENTAGE"]:
					x = this.considerationMyTargetsHealthPercentage(action, action.resource.considerations[i]);
					break;
				case GameConstants.ConsiderationTypes["MY_TARGETS_HEALTH_CAPACITY"]:
					x = this.considerationMyTargetsHealthCapacity(action, action.resource.considerations[i]);
					break;
				case GameConstants.ConsiderationTypes["TARGET_CONTAINS_TAG_HEALER"]:
					x = this.considerationTargetContainsTagHealer(action, action.resource.considerations[i]);
					break;
				default:
					break;
			}

			considerationScoreAccum *= this.calculateConsiderationScore(x, action.resource.considerations[i]);

			//debugging
			// var temp = this.calculateConsiderationScore(x, action.resource.considerations[i]);
			// console.log(" - Score calculate - x: " + x + ", y: " + temp);
		}

		return considerationScoreAccum;
	}


	//////////////////////////////////////////
	// CONSIDERATIONS 						//
	//////////////////////////////////////////
	// These functions take in an action/consideration pair, and returns an x value for the consideration
	// The x here has no limits. It becomes normalized later.


	//returns x as 0 (used for a base value for some actions. Like idling or stopping.)
	considerationBase(action, consideration) {
		return 0;
	}

	//returns x as distance from enemy squared
	considerationDistanceSquaredFromEnemy(action, consideration) {
		var xSquared = 0;

		//get the context for 'x'
		var myPos = this.aiAgent.character.getPlanckPosition();
		var enemyC = this.aiAgent.gs.gom.getGameObjectByID(action.characterId);
		var enemyPos = null;
		if(enemyC !== null) {
			enemyPos = enemyC.getPlanckPosition();
		}

		//at this point, it is okay to calculate X and run through the response curve
		if(myPos !== null && enemyPos !== null) {
			xSquared = Math.pow(enemyPos.x - myPos.x, 2) + Math.pow(enemyPos.y - myPos.y, 2);
		}

		return xSquared;
	}

	considerationDistanceSquaredFromAnyEnemy(action, consideration) {
		var xSquared = 99999;
		
		var myPos = this.aiAgent.character.getPlanckPosition();
		
		if(myPos !== null) {
			var playingUsers = this.aiAgent.gs.um.getPlayingUsers();
			
			for(var j = 0; j < playingUsers.length; j++) {
				if(playingUsers[j].characterId !== null && 
					playingUsers[j].teamId !== this.spectatorTeamId &&
					playingUsers[j].teamId !== this.aiAgent.user.teamId) {
						var enemyPos = this.aiAgent.gs.gom.getGameObjectByID(playingUsers[j].characterId).getPlanckPosition();

						if(enemyPos !== null) {
							var temp = Math.pow(enemyPos.x - myPos.x, 2) + Math.pow(enemyPos.y - myPos.y, 2);
							xSquared = temp < xSquared ? temp : xSquared;
						}
				}
			}
		}
		return xSquared;
	}

	considerationHasLineOfSightFromEnemy(action, consideration) {
		var bLineOfSight = 0;
		
		var myPos = this.aiAgent.character.getPlanckPosition();
		var enemyC = this.aiAgent.gs.gom.getGameObjectByID(action.characterId);
		var enemyPos = null;
		if(enemyC !== null) {
			enemyPos = enemyC.getPlanckPosition();
		}

		//at this point, it is okay to calculate X and run through the response curve
		if(myPos !== null && enemyPos !== null) {
			bLineOfSight = this.aiAgent.lineOfSightTest(myPos, enemyPos).isLOS ? 1 : 0;
		}

		// console.log("LOS TEST: " + bLineOfSight);

		return bLineOfSight;
	}


	considerationHasPathUnobstructedToEnemy(action, consideration) {
		var bUnobstructedPath = 0;
		
		var myPos = this.aiAgent.character.getPlanckPosition();
		var enemyC = this.aiAgent.gs.gom.getGameObjectByID(action.characterId);
		var enemyPos = null;
		if(enemyC !== null) {
			enemyPos = enemyC.getPlanckPosition();
		}

		//at this point, it is okay to calculate X and run through the response curve
		if(myPos !== null && enemyPos !== null) {
			bUnobstructedPath = this.aiAgent.lineOfSightTest(myPos, enemyPos).pathUnobstructed ? 1 : 0;
		}

		// console.log("Unobstructed TEST: " + bUnobstructedPath);

		return bUnobstructedPath;
	}



	considerationMsPassedSinceSameAction(action, consideration) {
		return this.aiAgent.gs.currentTick - this.aiAgent.actionHistory[action.resource.id].tsPrev;
	}

	considerationSkillOffCooldown(action, consideration) {
		var x = 0;
		var resourceKey = "";
		switch(action.resource.typeEnum) {
			case GameConstants.ActionTypes["SHOOT_ENEMY"]:
			case GameConstants.ActionTypes["SHOOT_ALLY"]:
				resourceKey = this.aiAgent.characterClassResource.data["fireStateKey"];
				break;
			case GameConstants.ActionTypes["ALT_SHOOT_ENEMY"]:
			case GameConstants.ActionTypes["ALT_SHOOT_ALLY"]:
			case GameConstants.ActionTypes["ALT_SHOOT_SELF"]:
				resourceKey = this.aiAgent.characterClassResource.data["altFireStateKey"];
				break;
		}

		// }
		// if(action.resource.typeEnum === GameConstants.ActionTypes["SHOOT_ENEMY"] || action.resource.typeEnum === GameConstants.ActionTypes["SHOOT_AL_ENEMY"]) 
		// 	resourceKey = this.aiAgent.characterClassResource.data["fireStateKey"];
		// else if(action.resource.typeEnum === GameConstants.ActionTypes["ALT_SHOOT_ENEMY"])
		// 	resourceKey = this.aiAgent.characterClassResource.data["altFireStateKey"];
			
		var cooldownState = this.aiAgent.character.getStateCooldown(resourceKey);
		
		return cooldownState?.onCooldown === false ? 1 : 0;
	}



	considerationMyHealthPercentage(action, consideration) {
		return (this.aiAgent.character.hpCur / this.aiAgent.character.hpMax) * 100;
	}

	considerationMyTargetsHealthPercentage(action, consideration) {
		var targetHealthPercentage = 0;
		var targetCharacter = this.aiAgent.gs.gom.getGameObjectByID(action.characterId);

		if(targetCharacter.isActive) {
			targetHealthPercentage = (targetCharacter.hpCur / targetCharacter.hpMax) * 100;
		}

		// console.log("target health percentage: " + targetHealthPercentage);

		return targetHealthPercentage;
	}

	considerationMyTargetsHealthCapacity(action, consideration) {
		var targetHealthPercentage = 0;
		var targetCharacter = this.aiAgent.gs.gom.getGameObjectByID(action.characterId);

		if(targetCharacter.isActive) {
			targetHealthPercentage = targetCharacter.hpMax;
		}

		// console.log("target health percentage: " + targetHealthPercentage);

		return targetHealthPercentage;
	}
	
	considerationTargetContainsTagHealer(action, consideration) {
		var hasHealerTag = 0;
		var targetCharacter = this.aiAgent.gs.gom.getGameObjectByID(action.characterId);

		if(targetCharacter.isActive) {
			hasHealerTag = targetCharacter.characterClassResource.data["aiTagsEnum"].includes(GameConstants.AITags.HEALER) === true ? 1 : 0;
			if(hasHealerTag === 0) {
				var stophere = true;
			}
		}

		// console.log("target health percentage: " + targetHealthPercentage);

		return hasHealerTag;
	}
	




	//////////////////////////////////////////
	// RESPONSE CURVES	 					//
	//////////////////////////////////////////
	calculateConsiderationScore(x, consideration) {
		var y = 0;

		//normalize x
		x = (x - consideration.xMin) / (consideration.xMax - consideration.xMin);

		//clamp x
		x = this.aiAgent.globalfuncs.clamp(x, 0, 1);

		//find y from response curve
		y = this.calculateFromResponseCurve(x, consideration.responseCurveEnum, consideration.responseCurveParameters);

		//clamp y
		var yMax = consideration.yMax ? consideration.yMax : 1.0;
		var yMin = consideration.yMin ? consideration.yMin : 0.0;
		y = this.aiAgent.globalfuncs.clamp(y, yMin, yMax);

		return y;
	}


	calculateFromResponseCurve(x, responseCurveEnum, responseCurveParameters) {
		var y = 0;
		var A = responseCurveParameters.A;
		var B = responseCurveParameters.B;
		var h = responseCurveParameters.h;
		var k = responseCurveParameters.k;
		
		switch(responseCurveEnum) {
			case GameConstants.ResponseCurves["LINEAR"]:
				y = A*(x - h) + k;
				break;
			case GameConstants.ResponseCurves["PARABOLA"]:
				y = A*Math.pow(x - h, 2) + k;
				break;
			case GameConstants.ResponseCurves["INVERSE"]:
				x = x === 0 ? 0.0001 : x;
				y = (A/(x - h)) + k;
				break;
			case GameConstants.ResponseCurves["LOGARITHMIC"]:
				x = x <= h ? h + 0.0000001 : x;
				y = A*Math.log10(x - h) + k;
				break;
			case GameConstants.ResponseCurves["LOGISTIC"]:
				y = (A/(1 + Math.pow(Math.E, -B*(x - h)))) + k;
				break;
			case GameConstants.ResponseCurves["6POLY"]:
				y = A*Math.pow(x - h, 6) + k;
				break;
		}

		return y;
	}





}

exports.AIAgentPlayingState = AIAgentPlayingState;