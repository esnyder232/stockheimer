import GlobalFuncs from "../global-funcs.js";

//there is only ever 1 tilemap resource in existance on the client. So there is no need for a "TilemapResourceManager"
export default class TilesetResourceLoader {
	constructor() {
		this.gc = null;
		this.resourceType = "tileset";
	}

	init(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();
	}

	startLoadingResource(resource) {
		if(resource !== null && resource.status !== "unload") {
			//check if the resources has already been loaded into phaser (if an error occurred previously, sometimes the keys can still hang around in phaser)
			var existingKey = this.gc.phaserGame.textures.exists(resource.key);
			if(existingKey) {
				this.unloadResource(resource)
			}
			
			this.gc.resourceLoadingScene.load.image(resource.key, resource.key);
		}
	}

	unloadResource(resource) {
		this.gc.phaserGame.textures.remove(resource.key);
	}

	loadError(resource, e) {		
		var baseMessage = "Failed to load tileset for: " + resource.key + ": " + e.detail.file.xhrLoader.statusText;
		this.globalfuncs.appendToLog("Tileset-resource-loader: " + baseMessage);
		resource.errorMsg = baseMessage;
		resource.status = "failed";
	}

	fileComplete(resource, e) {
		resource.status = "success";
	}
}