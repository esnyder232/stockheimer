import GlobalFuncs from "../global-funcs.js";
import TilesetResource from "../classes/tileset-resource.js";

export default class TilesetResourceManager {
	constructor() {
		this.gc = null;
		this.idCounter = 1;
		this.tilesetResourceArray = [];
		this.idIndex = {};
		this.keyIndex = {};
		this.isDirty = false;
	}

	init(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();

		this.phaserEventMapping = [];

		//the only reason these are here instead of the tileset-resource itself is for efficiency reasons (this way only ONE function is called when phaser is done loading, instead of one function PER RESOURCE)
		this.windowsEventMapping = [
			{event: 'loaderror', func: this.loadError.bind(this)},
			{event: 'filecomplete', func: this.fileComplete.bind(this)}
		];
		
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);
	}

	loadError(e) {
		// console.log('LOAD ERROR INSIDE tileset MANAGER:');
		// console.log(e.detail.key);

		var key = e.detail.file.key;
		var sr = null;

		//check if its an tileset key
		sr = this.getTilesetResourceByKey(key);
		if(sr !== null) {
			sr.loadError(e)
			return;
		}
	}

	fileComplete(e) {
		// console.log('INSIDE tileset MANAGER:');
		// console.log(e.detail.key);
		// console.log(e.detail.type);
		// console.log(e.detail.data);

		var key = e.detail.key;
		var sr = null;

		//check if its an tileset key
		sr = this.getTilesetResourceByKey(key);
		if(sr !== null) {
			sr.fileComplete(e)
			return;
		}
	}


	createTilesetResource(key, tilesetPath) {
		if(key === undefined){
			return null;
		}

		//check if the tileset was already created
		var existing = this.getTilesetResourceByKey(key);
		if(existing !== null) {
			return existing;
		}

		var o = new TilesetResource();

		o.id = this.idCounter;
		o.key = key;
		o.tilesetPath = tilesetPath;
		
		this.idCounter++;
		this.tilesetResourceArray.push(o);
		this.isDirty = true;

		this.updateIndex(o.id, o.key, o, "create");
		
		return o;
	}

	destroyTilesetResource(id) {
		var t = this.getTilesetResourceByID(id);
		if(t !== null)
		{
			t.deleteMe = true;
			this.isDirty = true;
		}
	}


	updateIndex(id, key, obj, transaction) {
		if(transaction == 'create') {
			this.idIndex[id] = obj;
			this.keyIndex[key] = obj;
		}
		else if(transaction == 'delete') {
			if(this.idIndex[id] !== undefined) {
				delete this.idIndex[id];
			}

			if(this.keyIndex[key] !== undefined) {
				delete this.keyIndex[key];
			}
		}
	}


	update(dt) {
		if(this.isDirty) {
			//delete any players that were marked for deletion
			for(var i = this.tilesetResourceArray.length-1; i >= 0; i--) {
				if(this.tilesetResourceArray[i].deleteMe) {
					this.updateIndex(this.tilesetResourceArray[i].id, this.tilesetResourceArray[i].key, this.tilesetResourceArray[i], "delete");
					this.tilesetResourceArray.splice(i, 1);
				}
			}

			this.isDirty = false;
		}
	}

	getTilesetResources() {
		return this.tilesetResourceArray;
	}

	getTilesetResourceByID(id) {
		if(this.idIndex[id]) {
			return this.idIndex[id];
		}
		else {
			return null;
		}
	}

	getTilesetResourceByKey(key) {
		if(this.keyIndex[key]) {
			return this.keyIndex[key];
		}
		else {
			return null;
		}
	}
}
