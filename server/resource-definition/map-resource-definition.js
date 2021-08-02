class MapResourceDefinition {
	constructor() {
		this.resourceType = "map";
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

exports.MapResourceDefinition = MapResourceDefinition;