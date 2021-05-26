import GlobalFuncs from "../global-funcs.js";

export default class SpriteResource {
	constructor() {
		this.gc = null;
		this.key = "";
		this.animationKey = ""; //auto generated in sprite resource manager by doing key + "_json"
		this.imagePath = "";
		this.animationPath = "";
		this.type = ""; //either "sprite" or "image". "Sprite" = image + animation. "Image" = image only.
		
		this.animationDataJson = {};
		this.imageLoaded = false;
		this.animationLoaded = false;
		this.spriteSheetProcessed = false;

		this.spriteLoadFinished = false;
		
	}

	spriteResourceInit(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();

		//determine the sprite type
		if(this.imagePath !== "" && this.animationPath !== "") {
			this.type = "sprite";
		}
		else if(this.imagePath !== "" && this.animationPath === "") {
			this.type = "image";
		}
		else {
			this.type = "";
		}

		//check if the resources has already been loaded into phaser (if an error occurred previously, sometimes the keys can still hang around in phaser)
		var imageTexture = this.gc.phaserGame.textures.get(this.key);
		var animationJson = this.gc.phaserGame.cache.json.get(this.animationKey);
		if(imageTexture.key === this.key) {
			this.imageLoaded = true;
		}
		if(animationJson !== undefined) {
			this.animationLoaded = true;
		}
	}
	
	loadSpriteResource() {
		if(!this.spriteLoadFinished) {
			if(this.type === "sprite") {
				//if its a sprite, get the animation data first
				if(!this.animationLoaded) {
					this.gc.resourceLoadingScene.load.json(this.animationKey, this.animationPath);
				}
				else if(!this.imageLoaded) {
					this.loadSpriteSheet();
				}
				else if(!this.spriteSheetProcessed) {
					this.createSpriteSheet();
					this.spriteLoadFinished = true;
				}
				else {
					this.spriteLoadFinished = true;
				}
			}			
			else if (this.type === "image") {
				//if its an image, load the image data
				if(!this.imageLoaded) {
					this.gc.resourceLoadingScene.load.image(this.key, this.imagePath);
				}
				else {
					this.spriteLoadFinished = true;
				}
			}
			else {
				this.spriteLoadFinished = true;
			}
		}
	}

	unloadSpriteResource() {
		if(this.animationLoaded) {
			this.globalfuncs.removeAnimsFromAseprite(this.gc.phaserGame, this.key, this.animationKey);
			this.gc.phaserGame.cache.json.remove(this.animationKey);
		}

		if(this.imageLoaded) {
			this.gc.phaserGame.textures.remove(this.key);
		}
	}

	loadErrorImage(e) {
		// console.log('!!! FILE ERROR IMAGE !!! - INSIDE SPRITE RESOURCE:');
		// console.log(e.detail.file);

		var baseMessage = "Failed to load image for: " + this.imagePath + " (key: " + this.key + ") : " + e.detail.file.xhrLoader.statusText;
		this.globalfuncs.appendToLog("Sprite-Resource: " + baseMessage);
		window.dispatchEvent(new CustomEvent("sprite-resource-load-error", {detail: {"result": "fail", "message": baseMessage}}));
		this.spriteLoadFinished = true;
	}

	loadErrorAnimation(e) {
		// console.log('!!! FILE ERROR ANIMATION !!! - INSIDE SPRITE RESOURCE:');
		// console.log(e.detail.file);

		var baseMessage = "Failed to load animation data for: " + this.animationPath + " (key: " + this.animationKey + ") : " + e.detail.file.xhrLoader.statusText;
		this.globalfuncs.appendToLog("Sprite-Resource: " + baseMessage);
		window.dispatchEvent(new CustomEvent("sprite-resource-load-error", {detail: {"result": "fail", "message": baseMessage}}));
		this.spriteLoadFinished = true;
	}

	fileCompleteImage(e) {
		// console.log('!!! FILE COMPLETE IMAGE !!! - INSIDE SPRITE RESOURCE:');
		// console.log(e.detail.key);
		// console.log(e.detail.type);
		// console.log(e.detail.data);

		this.imageLoaded = true;
		this.loadSpriteResource();
	}
	

	fileCompleteAnimation(e) {
		// var key = e.detail.key;
		// var type = e.detail.type;
		// var data = e.detail.data;

		//console.log('!!! FILE COMPLETE ANIMATION !!! - INSIDE SPRITE RESOURCE:');
		// console.log(key);
		// console.log(type);
		// console.log(data);

		this.animationLoaded = true;
		this.loadSpriteResource();
	}

	loadSpriteSheet() {
		try {
			//get the animation data
			//copying it. I don't care....i don't want to deal with phaser's wierd storage
			var animationFromPhaser = this.gc.phaserGame.cache.json.get(this.animationKey);
			if(animationFromPhaser !== undefined) {
				this.animationDataJson = JSON.parse(JSON.stringify(animationFromPhaser));
	
				//now load the sprite sheet			
				//default the framewidth and height to the whole image
				var frameWidth = this.animationDataJson.meta.size.w;
				var frameHeight = this.animationDataJson.meta.size.h;
	
				//get the first frame if it exists to get the actual framewidth and frameheight
				if(this.animationDataJson.frames.length > 0) {
					frameWidth = this.animationDataJson.frames[0].sourceSize.w;
					frameHeight = this.animationDataJson.frames[0].sourceSize.h;
				}
	
				this.gc.resourceLoadingScene.load.spritesheet(this.key, this.imagePath, {frameWidth: frameWidth, frameHeight: frameHeight});
			}
			else {
				this.imageLoaded = true;
				this.loadSpriteResource();
			}
		}
		catch(ex) {
			var baseMessage = "Exception caught when loading animation data for: " + this.animationPath + " (key: " + this.animationKey + ")";
			this.globalfuncs.appendToLog("Sprite-Resource: " + baseMessage + ": " + ex + ex.trace);
			window.dispatchEvent(new CustomEvent("sprite-resource-load-error", {detail: {"message": baseMessage}}));
			this.spriteLoadFinished = true;
		}
	}

	createSpriteSheet() {
		try {
			this.globalfuncs.createAnimsFromAseprite(this.gc.phaserGame, this.key, this.animationKey);
		}
		catch(ex) {
			var baseMessage = "Exception caught when creating the sprite sheet for: " + this.imagePath + " (key: " + this.key + ")";
			this.globalfuncs.appendToLog("Sprite-Resource: " + baseMessage + ": " + ex);
			window.dispatchEvent(new CustomEvent("sprite-resource-load-error", {detail: {"message": baseMessage}}));
			this.spriteLoadFinished = true;
		}
		
	}
}