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


	// //this creates a transaction to load a tilemap
	// loadTilemap(fullFilepath, cbSuccess, cbFail) {
	// 	this.transactionQueue.push({
	// 		"transaction": "load",
	// 		"fullFilepath": fullFilepath,
	// 		"cbSuccess": cbSuccess,
	// 		"cbFail": cbFail,
	// 		"status": "open",
	// 		"statusMessage": ""
	// 	});

	// 	this.isDirty = true;
	// }
	
	// //this just marks the tilemap for deletion
	// unloadTilemap(id, cbSuccess, cbFail) {
	// 	this.transactionQueue.push({
	// 		"transaction": "unload",
	// 		"id": id,
	// 		"cbSuccess": cbSuccess,
	// 		"cbFail": cbFail,
	// 		"status": "open",
	// 		"statusMessage": ""
	// 	})

	// 	this.isDirty = true;
	// }

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
				for(var i = 0; i < this.transactionQueue.length; i++) {
					try {
						var bError = false;
						var errorMessage = "";

						var o = this.getTilemapByID(this.transactionQueue[i].id);

						if(o) {
							switch(this.transactionQueue[i].transaction) {
								case "delete":
									var oi = this.tilemapArray.findIndex((x) => {return x.id == o.id;});
									if(oi >= 0) {
										this.updateIndex(this.tilemapArray[oi].id, null, "delete");
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
						logger.log("error", 'Tilemap Manager transaction error: ' + errorMessage + ". transaction Object: " + JSON.stringify(this.transactionQueue[i]));
					}
				}



				// for(var i = 0; i < this.transactionQueue.length; i++)
				// {
				// 	if(this.transactionQueue[i].status == "open")
				// 	{
				// 		switch(this.transactionQueue[i].transaction)
				// 		{
				// 			//load the map
				// 			case "load":
				// 				var tm = this.getTilemapByFullFilepath(this.transactionQueue[i].fullFilepath);
				// 				if(!tm)
				// 				{
				// 					//load the map
				// 					fs.readFile(this.transactionQueue[i].fullFilepath, this.fileReadComplete.bind(this, this.transactionQueue[i]));
				// 					this.transactionQueue[i].status = "pending";
				// 					logger.log("info", "Now loading tile map '" + this.transactionQueue[i].fullFilepath + "'.");
				// 				}
				// 				else
				// 				{
				// 					this.transactionQueue[i].statusMessage = "Tile map '" + this.transactionQueue[i].fullFilepath + "' already loaded";
				// 					this.transactionQueue[i].status = "failed";
				// 				}
				// 				break;
				// 			//unload the map
				// 			case "unload":
				// 				var tm = this.getTilemapByID(this.transactionQueue[i].id);

				// 				if(tm)
				// 				{
				// 					var tmIndex = this.tilemapArray.findIndex((x) => {return x.id === this.transactionQueue[i].id;});
				// 					if(tmIndex >= 0)
				// 					{
				// 						//splice it off
				// 						this.tilemapArray.splice(tmIndex, 1);
				// 						this.updateIndex(tm.id, tm.fullFilepath, null, "unload");
				// 						this.transactionQueue[i].statusMessage = "Tile map with id '" + this.transactionQueue[i].id + "' has been unloaded.";
				// 						this.transactionQueue[i].status = "finished";
				// 					}
				// 					else
				// 					{
				// 						this.transactionQueue[i].statusMessage = "Tile map with id '" + this.transactionQueue[i].id + "' was found in the index, but not in the tilemapArray.";
				// 						this.transactionQueue[i].status = "failed";
				// 					}
				// 				}
				// 				else 
				// 				{
				// 					this.transactionQueue[i].statusMessage = "Tile map with id '" + this.transactionQueue[i].id + "' does not exist.";
				// 					this.transactionQueue[i].status = "failed";
				// 				}
				// 				break;
	
				// 			default:
				// 				//intentionally blank
				// 				break;
				// 		}
				// 	}
				// 	else if(this.transactionQueue[i].status == "pending")
				// 	{
				// 		//the transaction is still pending. Do nothing.
				// 	}
				// 	else if(this.transactionQueue[i].status == "finished")
				// 	{
				// 		//splice it off at the end
				// 		finishedTransactions.push(i);
				// 	}
				// 	else if(this.transactionQueue[i].status == "failed")
				// 	{
				// 		//splice it off at the end
				// 		finishedTransactions.push(i);
				// 	}



				// 	//log the results/call callbacks
				// 	if(this.transactionQueue[i].status == "failed")
				// 	{
				// 		logger.log("info", 'Tilemap Manager transaction failed: ' + this.transactionQueue[i].statusMessage + ". transaction Object: " + JSON.stringify(this.transactionQueue[i]));

				// 		//call the callback if it exists
				// 		if(this.transactionQueue[i].cbFail)
				// 		{
				// 			this.transactionQueue[i].cbFail(this.transactionQueue[i].id, this.transactionQueue[i].statusMessage);
				// 		}
				// 	}
				// 	else if(this.transactionQueue[i].status == "finished")
				// 	{
				// 		if(this.transactionQueue[i].statusMessage !== "")
				// 		{
				// 			logger.log("info", "Tilemap Manager transaction finished: " + this.transactionQueue[i].statusMessage)
				// 		}
				// 		//call the callback if it exists
				// 		if(this.transactionQueue[i].cbSuccess)
				// 		{
				// 			this.transactionQueue[i].cbSuccess(this.transactionQueue[i].id);
				// 		}
				// 	}
				// }

				//delete all transactions that are done
				// for(var i = finishedTransactions.length-1; i >= 0; i--)
				// {
				// 	this.transactionQueue.splice(finishedTransactions[i], 1);
				// }
			}
		}
	}

	// fileReadComplete(transaction, err, data) {
	// 	if(err)
	// 	{
	// 		transaction.status = "failed";
	// 		transaction.statusMessage = err;
	// 		this.isDirty = true;
	// 	}
	// 	else
	// 	{
	// 		transaction.status = "finished";

	// 		//create a json object and other stuff
	// 		var tm = new Tilemap();
	// 		tm.init(this.gs, this.idCounter++, transaction.fullFilepath, data)

	// 		transaction.id = tm.id;
			
	// 		this.tilemapArray.push(tm);
	// 		this.updateIndex(tm.id, tm.fullFilepath, tm, "load");
	// 		this.isDirty = true;
	// 	}
	// }



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

	// getTilemapByFullFilepath(fullFilepath) {
	// 	if(this.fullFilepathIndex[fullFilepath])
	// 	{
	// 		return this.fullFilepathIndex[fullFilepath];
	// 	}
	// 	else
	// 	{
	// 		return null;
	// 	}
	// }
}

exports.TilemapManager = TilemapManager;