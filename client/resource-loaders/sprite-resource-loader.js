import GlobalFuncs from "../global-funcs.js";

//there is only ever 1 tilemap resource in existance on the client. So there is no need for a "TilemapResourceManager"
export default class SpriteResourceLoader {
	constructor() {
		this.gc = null;
		this.resourceType = "sprite";
	}

	init(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();
	}

	startLoadingResource(resource) {
		if(resource !== null && resource.status !== "unload") {
			//check if the resources has already been loaded into phaser (if an error occurred previously, sometimes the keys can still hang around in phaser)
			var imageTextureExists = this.gc.phaserGame.textures.exists(resource.key);
			var animationJsonExists = this.gc.phaserGame.cache.json.has(resource.data.animationKey);
			if(imageTextureExists || animationJsonExists) {
				this.unloadResource(resource);
			}

			//attaching sprite specific loading info to the resource (its just easier this way)
			resource.imageLoaded = false;
			resource.animationLoaded = false;
			resource.spriteSheetProcessed = false;
			if(resource.data.imagePath !== "" && resource.data.animationPath !== "") {
				resource.spriteType = "sprite";
			}
			else if(resource.data.imagePath !== "" && resource.data.animationPath === "") {
				resource.spriteType = "image";
			}
			else {
				resource.spriteType = "";
			}

			//register delegates with resource manager
			if(resource.data.animationPath !== "") {
				this.gc.rm.registerDelegate(resource.data.animationPath, resource.id, this.resourceType, this.fileComplete.bind(this), this.loadError.bind(this));
			}

			this.continueLoadingSprite(resource);
		}
	}

	continueLoadingSprite(resource) {
		if(resource !== null && resource.status !== "unload" && resource.status !== "failed") {
			if(resource.spriteType === "sprite") {
				//if its a sprite, get the animation data first
				if(!resource.animationLoaded) {
					this.gc.resourceLoadingScene.load.json(resource.data.animationPath, resource.data.animationPath);
				}
				else if(!resource.imageLoaded) {
					this.loadSpriteSheet(resource);
				}
				else if(!resource.spriteSheetProcessed) {
					this.createSpriteSheet(resource);
				}
				else {
					resource.status = "success";
				}
			}
			else if (resource.spriteType === "image") {
				//if its an image, load the image data
				if(!resource.imageLoaded) {
					this.gc.resourceLoadingScene.load.image(resource.key, resource.data.imagePath);
				}
				else {
					resource.status = "success";
				}
			}
			else {
				resource.status = "success";
			}
		}
	}


	unloadResource(resource) {
		//unload animation
		this.globalfuncs.removeAnimsFromAseprite(this.gc.phaserGame, resource.key, resource.data.animationPath);
		this.gc.phaserGame.cache.json.remove(resource.data.animationPath);

		//unload image
		this.gc.phaserGame.textures.remove(resource.key);

		this.gc.rm.unregisterDelegate(resource.data.animationPath, resource.id, this.resourceType);
	}

	loadError(resource, e) {
		//determine which file was loaded
		var baseMessage = "";
		if(e.detail.file.key === resource.key) {
			baseMessage = "Failed to load sprite image for key " + resource.key + ", imagePath: " + resource.data.imagePath + ", reason: " + e.detail.file.xhrLoader.statusText;
		}
		else if(e.detail.file.key === resource.data.animationPath) {
			baseMessage = "Failed to load animation data for key " + resource.key + ", animationPath: " + resource.data.imagePath + ", reason: " + e.detail.file.xhrLoader.statusText;
		}
		
		this.globalfuncs.appendToLog("Sprite-resource-loader: " + baseMessage);
		resource.errorMsg = baseMessage;
		resource.status = "failed";
	}

	fileComplete(resource, e) {
		//determine which file was loaded
		if(e.detail.key === resource.key) {
			resource.imageLoaded = true;
		}
		else if(e.detail.key === resource.data.animationPath) {
			resource.animationLoaded = true;
		}

		this.continueLoadingSprite(resource);
	}


	loadSpriteSheet(resource) {
		try {
			//get the animation data
			var animationFromPhaser = this.gc.phaserGame.cache.json.get(resource.data.animationPath);
			if(animationFromPhaser !== undefined) {	
				//now load the sprite sheet			
				//default the framewidth and height to the whole image
				var frameWidth = animationFromPhaser.meta.size.w;
				var frameHeight = animationFromPhaser.meta.size.h;
	
				//get the first frame if it exists to get the actual framewidth and frameheight
				if(animationFromPhaser.frames.length > 0) {
					frameWidth = animationFromPhaser.frames[0].sourceSize.w;
					frameHeight = animationFromPhaser.frames[0].sourceSize.h;
				}
	
				this.gc.resourceLoadingScene.load.spritesheet(resource.key, resource.data.imagePath, {frameWidth: frameWidth, frameHeight: frameHeight});
			}
			else {
				resource.status = "failed";
				resource.errorMsg = "Sprite-resource-loader: failed to retrieve animation data from phaser's cache."
			}
		}
		catch(ex) {
			var baseMessage = "Exception caught when loading animation data for " + resource.key;
			this.globalfuncs.appendToLog("Sprite-resource-loader: " + baseMessage + " : " + ex);
			resource.status = "failed";
			resource.errorMsg = baseMessage;
		}
	}

	createSpriteSheet(resource) {
		try {
			this.globalfuncs.createAnimsFromAseprite(this.gc.phaserGame, resource.key, resource.data.animationPath);
			resource.spriteSheetProcessed = true;
			
			this.continueLoadingSprite(resource);
		}
		catch(ex) {
			var baseMessage = "Exception caught when creating sprite sheet for " + resource.key;
			this.globalfuncs.appendToLog("Sprite-resource-loader: " + baseMessage + ": " + ex);
			resource.status = "failed";
			resource.errorMsg = baseMessage;
		}
	}
}