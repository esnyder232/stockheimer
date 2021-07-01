class TilesetResourceDefinition {
	constructor() {
		this.resourceType = "tileset";
		this.gs = null;
	}

	init(gameServer) {
		this.gs = gameServer;
	}
	
	startLoadingResource(resource) {
		if(resource !== null && resource.status !== "unload") {
			resource.data = {
				url: resource.key
			}
			resource.status = "success";

			this.gs.rm.checkIfResourceComplete(resource.id);
		}
	}
}

exports.TilesetResourceDefinition = TilesetResourceDefinition;