import GlobalFuncs from "../global-funcs.js";

//there is only ever 1 tilemap resource in existance on the client. So there is no need for a "TilemapResourceManager"
export default class TilemapResource {
	constructor() {
		this.gc = null;
		this.key = "";
		this.tilemapPath = "";
		
		this.tiledDataJson = {};
		this.tilemapLoaded = false;

		this.tilemapLoadFinished = false;
		this.tilemapLoadError = false;
		this.tilemapLoadErrorMessage = "";
	}

	tilemapResourceInit(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();

		//check if the resources has already been loaded into phaser (if an error occurred previously, sometimes the keys can still hang around in phaser)
		var tileData = this.gc.phaserGame.cache.tilemap.get(this.key);
		if(tileData !== undefined) {
			this.tilemapLoaded = true;
		}

		this.windowsEventMapping = [
			{event: 'loaderror', func: this.loadError.bind(this)},
			{event: 'filecomplete', func: this.fileComplete.bind(this)}
		];
		
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);
	}

	loadTilemapResource() {
		if(!this.tilemapLoadFinished) {
			if(!this.tilemapLoaded) {
				this.gc.resourceLoadingScene.load.tilemapTiledJSON(this.key, this.tilemapPath);
			}
			else {
				this.tilemapLoadFinished = true;
			}
		}
	}

	unloadTilemapResource() {
		if(this.tilemapLoaded) {
			this.gc.phaserGame.cache.tilemap.remove(this.key);
		}

		//also unregister windows events
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
	}

	loadError(e) {
		var key = e.detail.file.key;
		if(key === this.key) {
			var baseMessage = "Failed to load tilemap for: " + this.tilemapPath + " (key: " + this.key + ") : " + e.detail.file.xhrLoader.statusText;
			this.globalfuncs.appendToLog("Tilemap-Resource: " + baseMessage);
			this.tilemapLoadErrorMessage = baseMessage;
			this.tilemapLoadError = true;
			this.tilemapLoadFinished = true;
		}
	}

	fileComplete(e) {
		if(e.detail.key === this.key) {
			this.tilemapLoaded = true;
			this.loadTilemapResource();
		}
	}
}