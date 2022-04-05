class PersistentObjectResourceDefinition {
	constructor() {
		this.resourceType = "persistent-object";
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

exports.PersistentObjectResourceDefinition = PersistentObjectResourceDefinition;