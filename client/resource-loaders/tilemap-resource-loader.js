import GlobalFuncs from "../global-funcs.js";

//there is only ever 1 tilemap resource in existance on the client. So there is no need for a "TilemapResourceManager"
export default class TilemapResourceLoader {
	constructor() {
		this.gc = null;
		this.resourceType = "tilemap";
	}

	init(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();
	}

	startLoadingResource(resource) {
		if(resource !== null && resource.status !== "unload") {
			//check if the resources has already been loaded into phaser (if an error occurred previously, sometimes the keys can still hang around in phaser)
			var existingKey = this.gc.phaserGame.cache.tilemap.has(resource.key);
			if(existingKey) {
				this.unloadResource(resource)
			}
			
			this.gc.resourceLoadingScene.load.tilemapTiledJSON(resource.key, resource.key);
		}
	}

	unloadResource(resource) {
		this.gc.phaserGame.cache.tilemap.remove(resource.key);
	}

	loadError(resource, e) {		
		var baseMessage = "Failed to load tilemap for: " + resource.key + ": " + e.detail.file.xhrLoader.statusText;
		this.globalfuncs.appendToLog("Tilemap-resource-loader: " + baseMessage);
		resource.errorMsg = baseMessage;
		resource.status = "failed";
	}

	fileComplete(resource, e) {
		resource.status = "success";
	}
}