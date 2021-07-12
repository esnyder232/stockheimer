class CharacterClassStateResourceDefinition {
	constructor() {
		this.resourceType = "character-class-state";
		this.gs = null;
	}

	init(gameServer) {
		this.gs = gameServer;
	}
	
	startLoadingResource(resource) {
		if(resource !== null && resource.status !== "unload") {
			this.gs.rm.linkFile(resource.id, resource, "data", resource.key);
		}
	}
}

exports.CharacterClassStateResourceDefinition = CharacterClassStateResourceDefinition;