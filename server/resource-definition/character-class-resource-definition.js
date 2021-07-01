class CharacterClassResourceDefinition {
	constructor() {
		this.resourceType = "character-class";
		this.gs = null;
	}

	init(gameServer) {
		this.gs = gameServer;
	}
	
	startLoadingResource(resource) {
		if(resource !== null && resource.status !== "unload") {
			this.gs.rm.linkFile(resource.id, resource, "data", resource.key, this.cbCharacterClassFileComplete.bind(this));
		}
	}

	///////////////////////////////
	// Character Class file      //
	///////////////////////////////
	cbCharacterClassFileComplete(resource, context, contextKey, contextValue) {
		// console.log("=== cbCharacterClasFileComplete called ===");
		// console.log(resource);
		// console.log(file);

		//animation set keys
		for(var animationSetKey in contextValue.animationSets) {
			if (contextValue.animationSets.hasOwnProperty(animationSetKey)) {
				var fileKey = contextValue.animationSets[animationSetKey];
				this.gs.rm.linkFile(resource.id, contextValue.animationSets, animationSetKey, fileKey, this.cbAnimationSetFileComplete.bind(this));
			}
		}

		//fire key
		if(contextValue["fireStateKey"] !== undefined) {
			this.gs.rm.linkFile(resource.id, contextValue, "fireStateKey", contextValue["fireStateKey"], this.cbFireStateKeyFileComplete.bind(this));
		}

		//alt fire key
		if(contextValue["altFireStateKey"] !== undefined) {
			this.gs.rm.linkFile(resource.id, contextValue, "altFireStateKey", contextValue["altFireStateKey"], this.cbAltFireStateKeyFileComplete.bind(this));
		}
	}

	///////////////////////////////
	// Animation Set file        //
	///////////////////////////////
	cbAnimationSetFileComplete(resource, context, contextKey, contextValue) {
		// console.log("=== cbAnimationSetFileComplete called ===");
		// console.log(resource);
		// console.log(key);
		// console.log(file);
		
		//done
	}

	///////////////////////////////
	// Fire State key file       //
	///////////////////////////////
	cbFireStateKeyFileComplete(resource, context, contextKey, contextValue) {
		// console.log("=== cbFireStateKeyFileComplete called ===");
		// console.log(resource);
		// console.log(file);
		
		//done for now
	}

	///////////////////////////////
	// Alt Fire State key file   //
	///////////////////////////////
	cbAltFireStateKeyFileComplete(resource, context, contextKey, contextValue) {
		// console.log("=== cbAltFireStateKeyFileComplete called ===");
		// console.log(resource);
		// console.log(file);
		
		//done for now
	}


}

exports.CharacterClassResourceDefinition = CharacterClassResourceDefinition;