import GlobalFuncs from "../global-funcs.js";
import SpriteResource from "../classes/sprite-resource.js";

export default class SpriteResourceManager {
	constructor() {
		this.gc = null;
		this.idCounter = 1;
		this.spriteResourceArray = [];
		this.idIndex = {};
		this.keyIndex = {};
		this.animationKeyIndex = {};
		this.isDirty = false;
	}

	init(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();

		this.phaserEventMapping = [];

		//the only reason these are here instead of the sprite-resource itself is for efficiency reasons (this way only ONE function is called when phaser is done loading, instead of one function PER RESOURCE)
		this.windowsEventMapping = [
			{event: 'loaderror', func: this.loadError.bind(this)},
			{event: 'filecomplete', func: this.fileComplete.bind(this)}
		];
		
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);
	}

	loadError(e) {
		// console.log('LOAD ERROR INSIDE SPRITE MANAGER:');
		// console.log(e.detail.key);

		var key = e.detail.file.key;
		var sr = null;

		//check if its an sprite key
		sr = this.getSpriteResourceByKey(key);
		if(sr !== null) {
			sr.loadErrorImage(e)
			return;
		}

		//check if its an animation key
		sr = this.getSpriteResourceByAnimationKey(key);
		if(sr !== null) {
			sr.loadErrorAnimation(e)
			return;
		}

	}

	fileComplete(e) {
		// console.log('INSIDE SPRITE MANAGER:');
		// console.log(e.detail.key);
		// console.log(e.detail.type);
		// console.log(e.detail.data);

		var key = e.detail.key;
		var sr = null;

		//check if its an sprite key
		sr = this.getSpriteResourceByKey(key);
		if(sr !== null) {
			sr.fileCompleteImage(e)
			return;
		}

		//check if its an animation key
		sr = this.getSpriteResourceByAnimationKey(key);
		if(sr !== null) {
			sr.fileCompleteAnimation(e)
			return;
		}
	}


	createSpriteResource(key, imagePath, animationPath) {
		if(key === undefined){
			return null;
		}

		//check if the sprite was already created
		var existing = this.getSpriteResourceByKey(key)
		if(existing !== null) {
			return existing;
		}

		var o = new SpriteResource();

		o.id = this.idCounter;
		o.key = key;
		o.imagePath = imagePath;
		o.animationPath = animationPath;
		o.animationKey = key + "_json"; //auto generate animation key (even if there isn't one to load)
		
		this.idCounter++;
		this.spriteResourceArray.push(o);
		this.isDirty = true;

		this.updateIndex(o.id, o.key, o.animationKey, o, "create");
		
		return o;
	}

	destroySpriteResource(id) {
		var t = this.getSpriteResourceByID(id);
		if(t !== null)
		{
			t.deleteMe = true;
			this.isDirty = true;
		}
	}


	updateIndex(id, key, animationKey, obj, transaction) {
		if(transaction == 'create') {
			this.idIndex[id] = obj;
			this.keyIndex[key] = obj;
			this.animationKeyIndex[animationKey] = obj;
		}
		else if(transaction == 'delete') {
			if(this.idIndex[id] !== undefined) {
				delete this.idIndex[id];
			}

			if(this.keyIndex[key] !== undefined) {
				delete this.keyIndex[key];
			}

			if(this.animationKeyIndex[animationKey] !== undefined) {
				delete this.animationKeyIndex[animationKey]
			}
		}
	}


	update(dt) {
		if(this.isDirty) {
			//delete any players that were marked for deletion
			for(var i = this.spriteResourceArray.length-1; i >= 0; i--) {
				if(this.spriteResourceArray[i].deleteMe) {
					this.updateIndex(this.spriteResourceArray[i].id, this.spriteResourceArray[i].key, this.spriteResourceArray[i].animationKey, this.spriteResourceArray[i], "delete");
					this.spriteResourceArray.splice(i, 1);
				}
			}

			this.isDirty = false;
		}
	}

	getSpriteResources() {
		return this.spriteResourceArray;
	}

	getSpriteResourceByID(id) {
		if(this.idIndex[id]) {
			return this.idIndex[id];
		}
		else {
			return null;
		}
	}

	getSpriteResourceByKey(key) {
		if(this.keyIndex[key]) {
			return this.keyIndex[key];
		}
		else {
			return null;
		}
	}

	getSpriteResourceByAnimationKey(animationKey) {
		if(this.animationKeyIndex[animationKey]) {
			return this.animationKeyIndex[animationKey];
		}
		else {
			return null;
		}
	}
}
