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
}

exports.CharacterClassResourceDefinition = CharacterClassResourceDefinition;