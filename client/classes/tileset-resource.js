import GlobalFuncs from "../global-funcs.js";

export default class TilesetResource {
	constructor() {
		this.gc = null;
		this.key = "";
		this.tilesetPath = "";
		
		this.tilesetLoaded = false;
		this.tilesetLoadFinished = false;
	}

	tilesetResourceInit(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();

		//check if the resources has already been loaded into phaser (if an error occurred previously, sometimes the keys can still hang around in phaser)
		var tilesetImage = this.gc.phaserGame.textures.get(this.key);
		if(tilesetImage.key === this.key) {
			this.tilesetLoaded = true;
		}
	}

	loadTilesetResource() {
		if(!this.tilesetLoadFinished) {
			if(!this.tilesetLoaded) {
				this.gc.resourceLoadingScene.load.image(this.key, this.tilesetPath);
			}
			else {
				this.tilesetLoadFinished = true;
			}
		}
	}

	unloadTilesetResource() {
		if(this.tilesetLoaded) {
			this.gc.phaserGame.textures.remove(this.key);
		}
	}

	loadError(e) {
		var baseMessage = "Failed to load tileset image for: " + this.tilesetPath + " (key: " + this.key + ") : " + e.detail.file.xhrLoader.statusText;
		this.globalfuncs.appendToLog("Tileset-Resource: " + baseMessage);
		window.dispatchEvent(new CustomEvent("resource-load-error", {detail: {"message": baseMessage}}));
		this.tilesetLoadFinished = true;
	
	}

	fileComplete(e) {
		this.tilesetLoaded = true;
		this.loadTilesetResource();
	
	}
}