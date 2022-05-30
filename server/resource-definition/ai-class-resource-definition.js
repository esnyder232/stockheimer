const GameConstants = require('../../shared_files/game-constants.json');

class AIClassResourceDefinition {
	constructor() {
		this.resourceType = "ai-class";
		this.gs = null;
	}

	init(gameServer) {
		this.gs = gameServer;
	}
	
	startLoadingResource(resource) {
		if(resource !== null && resource.status !== "unload") {
			this.gs.rm.linkFile(resource.id, resource, "data", resource.key, this.aiClassFileDone.bind(this));
		}
	}

	aiClassFileDone(resource, context, contextKey, contextValue) {
		if(resource.data !== null) {
			var idCounter = 0;

			for(var i = 0; i < resource.data.mainActions.length; i++ ) {
				
				//translate the action "types" in the resources to the "enum types"
				resource.data.mainActions[i].typeEnum = GameConstants.ActionTypes[resource.data.mainActions[i].type];
				if(resource.data.mainActions[i].typeEnum === undefined) {
					resource.data.mainActions[i].typeEnum = GameConstants.ActionTypes["NO_TYPE"];
				}

				//also add an id
				resource.data.mainActions[i].id = idCounter++;

				//translate the considerations "types" in the resources to the "enum types"
				for(var j = 0; j < resource.data.mainActions[i].considerations.length; j++) {
					resource.data.mainActions[i].considerations[j].typeEnum = GameConstants.ConsiderationTypes[resource.data.mainActions[i].considerations[j].type];
					

					if(resource.data.mainActions[i].considerations[j].typeEnum === undefined) {
						resource.data.mainActions[i].considerations[j].typeEnum = GameConstants.ConsiderationTypes["NO_TYPE"];
					}

					//also translate the response curves
					resource.data.mainActions[i].considerations[j].responseCurveEnum = GameConstants.ResponseCurves[resource.data.mainActions[i].considerations[j].responseCurve];
					if(resource.data.mainActions[i].considerations[j].responseCurveEnum === undefined) {
						resource.data.mainActions[i].considerations[j].responseCurveEnum = GameConstants.ResponseCurves["NO_CURVE"];
					}
				}
			}

			for(var i = 0; i < resource.data.skillActions.length; i++ ) {
				
				//translate the action "types" in the resources to the "enum types"
				resource.data.skillActions[i].typeEnum = GameConstants.ActionTypes[resource.data.skillActions[i].type];
				if(resource.data.skillActions[i].typeEnum === undefined) {
					resource.data.skillActions[i].typeEnum = GameConstants.ActionTypes["NO_TYPE"];
				}

				//also add an id
				resource.data.skillActions[i].id = idCounter++;

				//translate the considerations "types" in the resources to the "enum types"
				for(var j = 0; j < resource.data.skillActions[i].considerations.length; j++) {
					resource.data.skillActions[i].considerations[j].typeEnum = GameConstants.ConsiderationTypes[resource.data.skillActions[i].considerations[j].type];

					if(resource.data.skillActions[i].considerations[j].typeEnum === undefined) {
						resource.data.skillActions[i].considerations[j].typeEnum = GameConstants.ConsiderationTypes["NO_TYPE"];
					}

					//also translate the response curves
					resource.data.skillActions[i].considerations[j].responseCurveEnum = GameConstants.ResponseCurves[resource.data.skillActions[i].considerations[j].responseCurve];
					if(resource.data.skillActions[i].considerations[j].responseCurveEnum === undefined) {
						resource.data.skillActions[i].considerations[j].responseCurveEnum = GameConstants.ResponseCurves["NO_CURVE"];
					}
				}
			}
		}
	}
}

exports.AIClassResourceDefinition = AIClassResourceDefinition;