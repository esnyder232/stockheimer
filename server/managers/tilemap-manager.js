const {GlobalFuncs} = require('../global-funcs.js');
const {Tilemap} = require('../classes/tilemap.js');
const fs = require('fs');
const logger = require('../../logger.js');

//This is a "manager" class of sorts. It is basically loads in Tiled maps from the Tiled software.
//The file format is assumed to be in .json format, with the layers being a csv format.
class TilemapManager {
	constructor() {
		this.gs = null;
		
		this.idCounter = 0;
		this.tilemapArray = [];
		this.idIndex = {};
		this.fullFilepathIndex = {};

		this.isDirty = false;
		this.transactionQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
	}

	//this creates a transaction to load a tilemap
	loadTilemap(fullFilepath, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "load",
			"fullFilepath": fullFilepath,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail,
			"status": "open",
			"statusMessage": ""
		});

		this.isDirty = true;
	}
	
	//this just marks the tilemap for deletion
	unloadTilemap(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "unload",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail,
			"status": "open",
			"statusMessage": ""
		})

		this.isDirty = true;
	}

	updateIndex(id, fullFilepath, obj, transaction) {
		if(transaction == 'load')
		{
			this.idIndex[id] = obj;
			this.fullFilepathIndex[fullFilepath] = obj;
		}
		else if(transaction == 'unload')
		{
			if(this.idIndex[id] !== undefined)
			{
				delete this.idIndex[id];
			}
			if(this.fullFilepathIndex[fullFilepath] !== undefined)
			{
				delete this.fullFilepathIndex[fullFilepath];
			}

		}
	}

	/*
	A transaction "status" goes in this order:
	1: open - the transaction is queued, but not started yet
	2: pending - the transaction has started, but not finished yet
	3a: finished - the transaction has finished, and is successful
	3b: failed - the transaction has finished, and has failed
	*/

	update() {
		if(this.isDirty)
		{
			var finishedTransactions = [];

			//process any transactions that occured this frame
			if(this.transactionQueue.length > 0)
			{
				for(var i = 0; i < this.transactionQueue.length; i++)
				{
					if(this.transactionQueue[i].status == "open")
					{
						switch(this.transactionQueue[i].transaction)
						{
							//load the map
							case "load":
								var tm = this.getTilemapByFullFilepath(this.transactionQueue[i].fullFilepath);
								if(!tm)
								{
									//load the map
									fs.readFile(this.transactionQueue[i].fullFilepath, this.fileReadComplete.bind(this, this.transactionQueue[i]));
									this.transactionQueue[i].status = "pending";
									logger.log("info", "Now loading tile map '" + this.transactionQueue[i].fullFilepath + "'.");
								}
								else
								{
									this.transactionQueue[i].statusMessage = "Tile map '" + this.transactionQueue[i].fullFilepath + "' already loaded";
									this.transactionQueue[i].status = "failed";
								}
								break;
							//unload the map
							case "unload":
								var tm = this.getTilemapByID(this.transactionQueue[i].id);

								if(tm)
								{
									var tmIndex = this.tilemapArray.findIndex((x) => {return x.id === this.transactionQueue[i].id;});
									if(tmIndex >= 0)
									{
										//splice it off
										this.tilemapArray.splice(tmIndex, 1);
										this.updateIndex(tm.id, tm.fullFilepath, null, "unload");
										this.transactionQueue[i].statusMessage = "Tile map with id '" + this.transactionQueue[i].id + "' has been unloaded.";
										this.transactionQueue[i].status = "finished";
									}
									else
									{
										this.transactionQueue[i].statusMessage = "Tile map with id '" + this.transactionQueue[i].id + "' was found in the index, but not in the tilemapArray.";
										this.transactionQueue[i].status = "failed";
									}
								}
								else 
								{
									this.transactionQueue[i].statusMessage = "Tile map with id '" + this.transactionQueue[i].id + "' does not exist.";
									this.transactionQueue[i].status = "failed";
								}
								break;
	
							default:
								//intentionally blank
								break;
						}
					}
					else if(this.transactionQueue[i].status == "pending")
					{
						//the transaction is still pending. Do nothing.
					}
					else if(this.transactionQueue[i].status == "finished")
					{
						//splice it off at the end
						finishedTransactions.push(i);
					}
					else if(this.transactionQueue[i].status == "failed")
					{
						//splice it off at the end
						finishedTransactions.push(i);
					}



					//log the results/call callbacks
					if(this.transactionQueue[i].status == "failed")
					{
						logger.log("info", 'Tilemap Manager transaction failed: ' + this.transactionQueue[i].statusMessage + ". transaction Object: " + JSON.stringify(this.transactionQueue[i]));

						//call the callback if it exists
						if(this.transactionQueue[i].cbFail)
						{
							this.transactionQueue[i].cbFail(this.transactionQueue[i].id, this.transactionQueue[i].statusMessage);
						}
					}
					else if(this.transactionQueue[i].status == "finished")
					{
						if(this.transactionQueue[i].statusMessage !== "")
						{
							logger.log("info", "Tilemap Manager transaction finished: " + this.transactionQueue[i].statusMessage)
						}
						//call the callback if it exists
						if(this.transactionQueue[i].cbSuccess)
						{
							this.transactionQueue[i].cbSuccess(this.transactionQueue[i].id);
						}
					}
				}

				//delete all transactions that are done
				for(var i = finishedTransactions.length-1; i >= 0; i--)
				{
					this.transactionQueue.splice(finishedTransactions[i], 1);
				}
			}

			if(this.transactionQueue.length == 0)
			{
				this.isDirty = false;
			}
		}
	}

	fileReadComplete(transaction, err, data) {
		if(err)
		{
			transaction.status = "failed";
			transaction.statusMessage = err;
			this.isDirty = true;
		}
		else
		{
			transaction.status = "finished";

			//create a json object and other stuff
			var tm = new Tilemap();
			tm.init(this.gs, this.idCounter++, transaction.fullFilepath, data)

			transaction.id = tm.id;
			
			this.tilemapArray.push(tm);
			this.updateIndex(tm.id, tm.fullFilepath, tm, "load");
			this.isDirty = true;
		}
	}



	getTilemapByID(id) {
		if(this.idIndex[id])
		{
			return this.idIndex[id];
		}
		else
		{
			return null;
		}
	}

	getTilemapByFullFilepath(fullFilepath) {
		if(this.fullFilepathIndex[fullFilepath])
		{
			return this.fullFilepathIndex[fullFilepath];
		}
		else
		{
			return null;
		}
	}
}

exports.TilemapManager = TilemapManager;