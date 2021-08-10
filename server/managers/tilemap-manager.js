const {GlobalFuncs} = require('../global-funcs.js');
const {Tilemap} = require('../classes/tilemap.js');
const logger = require('../../logger.js');

//This is a "manager" class of sorts. It is basically loads in Tiled maps from the Tiled software.
//The file format is assumed to be in .json format, with the layers being a csv format.
class TilemapManager {
	constructor() {
		this.gs = null;
		
		this.idCounter = 0;
		this.tilemapArray = [];
		this.idIndex = {};
		this.resourceIdIndex = {};

		this.isDirty = false;
		this.transactionQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
	}

	createTilemap(resourceId) {
		var o = null;

		o = this.getTilemapByResourceId();
		if(o === null) {
			o = new Tilemap();

			o.id = this.idCounter++;
			o.resourceId = resourceId;
	
			this.tilemapArray.push(o);
			this.updateIndex(o.id, o.resourceId, o, 'create');
		}
		
		return o;
	}

	//this just marks the inactive object for deletion
	destroyTilemap(id) {
		this.transactionQueue.push({
			"transaction": "delete",
			"id": id
		})

		this.isDirty = true;
	}

	updateIndex(id, resourceId, obj, transaction) {
		if(transaction == 'create') {
			this.idIndex[id] = obj;
			this.resourceIdIndex[resourceId] = obj;
		}
		else if(transaction == 'delete') {
			if(this.idIndex[id] !== undefined) {
				delete this.idIndex[id];
			}
			if(this.resourceIdIndex[resourceId] !== undefined) {
				delete this.resourceIdIndex[resourceId];
			}
		}
	}

	update() {
		if(this.isDirty) {
			//process any transactions that occured this frame
			if(this.transactionQueue.length > 0) {
				while(this.transactionQueue.length > 0) {
					var tr = this.transactionQueue.shift();

					try {
						var bError = false;
						var errorMessage = "";
						var o = this.getTilemapByID(tr.id);
	
						if(o) {
							switch(tr.transaction) {
								case "delete":
									var oi = this.tilemapArray.findIndex((x) => {return x.id == o.id;});
									if(oi >= 0) {
										this.updateIndex(this.tilemapArray[oi].id, this.tilemapArray[oi].resourceId, this.tilemapArray[oi], "delete");
										this.tilemapArray[oi].deinit()
										this.tilemapArray.splice(oi, 1);
									}
									
									break;
								default:
									//intentionally blank
									break;
							}
						}
						else {
							bError = true;
							errorMessage = "Tilemap does not exist.";
						}
					}
					catch(ex) {
						bError = true;
						errorMessage = "Exception caught: " + ex + ". Stack: " + ex.stack;
					}
	
					if(bError) {
						logger.log("error", 'Tilemap Manager transaction error: ' + errorMessage + ". transaction Object: " + JSON.stringify(tr));
					}
				}
			}
		}
	}

	getTilemapByID(id) {
		if(this.idIndex[id]) {
			return this.idIndex[id];
		}
		else {
			return null;
		}
	}

	getTilemapByResourceId(resourceId) {
		if(this.resourceIdIndex[resourceId]) {
			return this.resourceIdIndex[resourceId];
		}
		else {
			return null;
		}
	}
}

exports.TilemapManager = TilemapManager;