const {GlobalFuncs} = require('../global-funcs.js');
const {Tilemap} = require('../classes/tilemap.js');
const fs = require('fs');
const logger = require('../../logger.js');
const {Resource} = require('../classes/resource.js');
const path = require('path');
const {FileWrapper} = require("../classes/file-wrapper.js")
const {CharacterclassResourceDefinition} = require("../resource-definition/character-class-resource-definition.js");


/*
State 1: loading
 - This state is for reading the files from disk and loading them into memory. In this state, the manager will read in the designated file. If it detects any references to other files, it will queue those up to load as well.

State 2: build
 - combine the resources into 1 coherent json object
*/

class ResourceManagerOld {
	constructor() {
		this.gs = null;
		
		this.resourceIdCounter = 0;
		this.resourceArray = [];
		this.resourceIdIndex = {};
		this.resourceKeyIndex = {};
		this.resourceTypeIndex = {};

		this.resourceDefinitions = {};

		this.fileIdCounter = 0; //used for loading internal raw resources
		this.fileArray = []; //internal array to keep track of what has already been loaded and what hasn't
		this.fileIdIndex = {};
		this.fileKeyIndex = {};

		this.isDirty = false;
		this.transactionQueue = [];

		this.cbComplete = null; //A callback for when the resource manager is in the "complete" state (completely done loading and building resources)
		this.cbError = null;	//A call back for when the resource manager encounters an error. This error could occur when loading or building resources or files. 
								//Its up to the game-server to decide whether or not the error is critical enough to abandon loading the game.

		//"idle" - waiting to be told what resources to build/load.
		//"loading" - reading the files from disk based (reading in rawResources)
		//"building" - building the resources for use (combinding rawResources into resources)
		this.state = "idle";
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();

		//resource definitions
		// this.resourceDefinitions["character-class"] = new CharacterclassResourceDefinition();

		// this.resourceDefinitions["character-class"].init(this.gs);
		
	}


	//queues a resource to be loaded
	//key is the {data} + relative_filepath + filename + file_extension
	//ex: "data/character-class/slime.json"
	loadResource(key, resourceType, cbComplete) {
		var o = null;

		//make sure its not already loaded
		var existingResource = this.getResourceByKey(key);
		if(existingResource !== null) {
			o = existingResource;
		} else {
			var fullFilepath = path.join(this.gs.appRoot, key);

			var o = new Resource();
			o.id = this.resourceIdCounter++;
			o.fullFilePath = fullFilepath;
			o.key = key;
			o.status = "open";
			o.resourceType = resourceType;
			
			this.updateResourceIndex(o.id, o.key, o.resourceType, o, "create");
		}

		//queue the resource to be loaded in (even if its already loaded, put in the transaction anyway for the callback)
		this.transactionQueue.push({
			"transaction": "load-resource",
			"id": o.id,
			"status": "open",
			"statusMessage": "",
			"cbComplete": cbComplete
		});

		this.isDirty = true;

		return o;
	}


	getResourceByID(id) {
		if(this.resourceIdIndex[id] !== undefined) {
			return this.resourceIdIndex[id];
		}
		else {
			return null;
		}
	}

	getResourceByKey(key) {
		if(this.resourceKeyIndex[key] !== undefined) {
			return this.resourceKeyIndex[key];
		}
		else {
			return null;
		}
	}

	// getResourcesByType(type) {
	// 	var arr = [];
		
		

	// 	return arr;
	// }

	getFileByID(id) {
		if(this.fileIdIndex[id] !== undefined) {
			return this.fileIdIndex[id];
		}
		else {
			return null;
		}
	}

	getFileByKey(key) {
		if(this.fileKeyIndex[key] !== undefined) {
			return this.fileKeyIndex[key];
		}
		else {
			return null;
		}
	}




	// //starts building the resources from the queue. This should only be called once, and thats when the game server starts up.
	// // cbComplete gets call once all the resources have been loaded AND built (successfully or failed)
	// // cbError gets call for EACH resource that fails to load/build.
	// // callback parameters: cbComplete()
	// //						cbError(resourceKey, resourceType, error)
	// start(cbComplete, cbError) {
	// 	if(this.state === "init") {
	// 		this.state = "loading";
	// 		this.cbComplete = cbComplete;
	// 		this.cbError = cbError;
	// 	}
	// }

	// //halts the resource manager from building. This should really only be called when there is a load/build error, and the error is critical enough to cause errors later when the game is running.
	// stop() {

	// }

	//unloads all files from queue and from memory. This should only be called once, and thats when the game server shuts down.
	unloadEverything() {

	}


	//internal function queue up a file path to load into memory from disk
	queueFile(key, cbFileComplete) {
		var o = null;

		//make sure its not already loaded
		var existingFile = this.getFileByKey(key);
		if(existingFile !== null) {
			o = existingFile;
		}
		else {
			var fullFilepath = path.join(this.gs.appRoot, key);

			var o = new FileWrapper();
			o.id = this.fileIdCounter++;
			o.fullFilePath = fullFilepath;
			o.key = key;
			o.status = "open";
			
			this.updateFileIndex(o.id, o.key, o, "create");
		}

		//queue the file to be loaded in
		this.transactionQueue.push({
			"transaction": "load-file",
			"id": o.id,
			"status": "open",
			"statusMessage": "",
			"chFileComplete": cbFileComplete
		});

		this.isDirty = true;
		return o;
	}



	updateResourceIndex(id, key, resourceType, obj, transaction) {
		if(transaction == 'create') {
			this.resourceIdIndex[id] = obj;
			this.resourceKeyIndex[key] = obj;
			if(this.resourceTypeIndex[resourceType] === undefined) {
				this.resourceTypeIndex[resourceType] = [];
			}
			this.resourceTypeIndex[resourceType].push(obj);
		}
		else if(transaction == 'delete') {
			if(this.resourceIdIndex[id] !== undefined) {
				delete this.resourceIdIndex[id];
			}
			if(this.resourceKeyIndex[key] !== undefined) {
				delete this.resourceKeyIndex[key];
			}
			if(this.resourceTypeIndex[resourceType] !== undefined) {
				var index = this.resourceTypeIndex[resourceType].findIndex((x) => {return x.id === id});
				if(index > 0) {
					this.resourceTypeIndex[resourceType].splice(index, 1);
				}
			}
		}
	}

	updateFileIndex(id, key, obj, transaction) {
		if(transaction == 'create') {
			this.fileIdIndex[id] = obj;
			this.fileKeyIndex[key] = obj;
		}
		else if(transaction == 'delete') {
			if(this.fileIdIndex[id] !== undefined) {
				delete this.fileIdIndex[id];
			}
			if(this.fileKeyIndex[key] !== undefined) {
				delete this.fileKeyIndex[key];
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
			var finishedTransactions = []; //array of indexes for transactions that are complete. They will be truncated off at the end of the loop
			var moreTransactions = []; //array transactions that need to be completed. They will be added to the transactionQueue at the end of the loop

			//process any transactions that occured this frame
			if(this.transactionQueue.length > 0)
			{
				for(var i = 0; i < this.transactionQueue.length; i++)
				{
					if(this.transactionQueue[i].status == "open")
					{
						var bError = false;
						switch(this.transactionQueue[i].transaction)
						{
							//start loading the resource
							case "load-resource":
								var r = this.getResourceByID(this.transactionQueue[i].id);
								
								if(r === null) {
									bError = true;
									this.transactionQueue[i].statusMessage = "Resource '" + this.transactionQueue[i].fullFilepath + "' was never queued for load.";
									this.transactionQueue[i].status = "failed";
								}

								//the resource is already loaded, queued for loading, or failed to load already. This is not necesarily an "error", but it does mean we should not load the resource again.
								if(!bError && r.status !== "open") {
									bError = true;
									this.transactionQueue[i].status = "failed";
								}

								//start the resource by loading the file at the full file path.
								if(!bError){
									logger.log("info", "Now processing resource. Key: '" + r.key + "', fullFilePath: '" + r.fullFilePath + "'.");
									this.queueFile(r.key);
									this.transactionQueue[i].status = "complete";
									finishedTransactions.push(i);
								}
								break;
							//start loading the file
							case "load-file": 
								var r = this.getFileByID(this.transactionQueue[i].id);
									
								if(r === null) {
									bError = true;
									this.transactionQueue[i].statusMessage = "File '" + this.transactionQueue[i].fullFilepath + "' was never queued for load.";
									this.transactionQueue[i].status = "failed";
								}

								//the file is already loaded, queued for loading, or failed to load already. This is not necesarily an "error", but it does mean we should not load the file again.
								if(!bError && r.status !== "open") {
									bError = true;
									this.transactionQueue[i].status = "failed";
								}

								//start loading the file at the full file path.
								if(!bError){
									fs.readFile(r.fullFilePath, this.fileReadComplete.bind(this, this.transactionQueue[i]));
									this.transactionQueue[i].status = "pending-file";
									logger.log("info", "Now loading file '" + this.transactionQueue[i].fullFilepath + "'.");
								}
								break;

							//unload the resource. Not used, so its commented out for now
							// case "unload":
							// 	var tm = this.getTilemapByID(this.transactionQueue[i].id);

							// 	if(tm)
							// 	{
							// 		var tmIndex = this.tilemapArray.findIndex((x) => {return x.id === this.transactionQueue[i].id;});
							// 		if(tmIndex >= 0)
							// 		{
							// 			//splice it off
							// 			this.tilemapArray.splice(tmIndex, 1);
							// 			this.updateIndex(tm.id, tm.fullFilepath, null, "unload");
							// 			this.transactionQueue[i].statusMessage = "Tile map with id '" + this.transactionQueue[i].id + "' has been unloaded.";
							// 			this.transactionQueue[i].status = "finished";
							// 		}
							// 		else
							// 		{
							// 			this.transactionQueue[i].statusMessage = "Tile map with id '" + this.transactionQueue[i].id + "' was found in the index, but not in the tilemapArray.";
							// 			this.transactionQueue[i].status = "failed";
							// 		}
							// 	}
							// 	else 
							// 	{
							// 		this.transactionQueue[i].statusMessage = "Tile map with id '" + this.transactionQueue[i].id + "' does not exist.";
							// 		this.transactionQueue[i].status = "failed";
							// 	}
//								break;
	
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
				for(var i = finishedTransactions.length-1; i >= 0; i--) {
					this.transactionQueue.splice(finishedTransactions[i], 1);
				}

				//add any transactions if they are queued up
				for(var i = 0; i < moreTransactions.length; i++) {
					this.transactionQueue.push(moreTransactions[i]);
				}
			}

			if(this.transactionQueue.length == 0) {
				this.isDirty = false;
			}
		}
	}

	fileReadComplete(transaction, err, data) {
		if(err) {
			transaction.status = "failed";
			transaction.statusMessage = err;
			this.isDirty = true;
		}
		else {
			transaction.status = "finished";

			var f = this.getFileByID(transaction.id);

			if(f !== null) {				
				try {
					//copy the data out of the data into the file-resource
					f.data = JSON.parse(JSON.stringify(data));

					//parse the data to get other data files to load
					this.getCharacterClassFiles(r);
				}
				catch(ex) {
					logger.log("error", "Exception cuaght when parsing data in resource-manager: " + ex);
				}

				this.isDirty = true;
			}
		}
	}

	//this returns a list of files that were found in the characterClassFileResource
	getCharacterClassFiles(characterClassFileResource) {
		var data = characterClassFileResource.data;

		if(data !== undefined) {
			
			//animations sets
			if(data.animationSets) {
				for(var i = 0; i < data.animationSets.length; i++) {
					var stophere = true;
				}
			}


			// {
			// 	"name": "Slime Mage",
			// 	"hp": 100,
			// 	"speed": 19,
			// 	"animationSets": [
			// 		{"idle": "data/animation-sets/slime-idle-set.json"},
			// 		{"move": "data/animation-sets/slime-move-set.json"},
			// 		{"attack": "data/animation-sets/slime-attack-set.json"},
			// 		{"cast": "data/animation-sets/slime-fire-set.json"}
			// 	],
			// 	"fireStateKey": "data/character-class-states/slime-attack.json",
			// 	"altFireStateKey": "data/character-class-states/slime-fire.json"
			// }
		}
	}

	

}

exports.ResourceManagerOld = ResourceManagerOld;