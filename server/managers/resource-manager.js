const {GlobalFuncs} = require('../global-funcs.js');
const fs = require('fs');
const logger = require('../../logger.js');
const path = require('path');
const {Resource} = require("../classes/resource.js")
const {CharacterClassResourceDefinition} = require("../resource-definition/character-class-resource-definition.js")
// const {CharacterClassResourceRedoDefinition} = require("../resource-definition/character-class-resource-redo-definition.js")
// const {CharacterClassResourceRedoRedoDefinition} = require("../resource-definition/character-class-resource-redo-redo-definition.js")

class ResourceManager {
	constructor() {
		this.gs = null;

		this.idCounter = 0; 
		this.resourceArray = [];
		this.idIndex = {};
		this.keyIndex = {};

		this.isDirty = false;
		this.openTransactionQueue = [];
		this.pendingTransactionQueue = [];
		this.successTransactionQueue = [];
		this.unloadTransactionQueue = [];

		this.resourceDefinitions = {};
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();

		this.resourceDefinitions["character-class"] = new CharacterClassResourceDefinition();
		
		for(var key in this.resourceDefinitions) {
			if (this.resourceDefinitions.hasOwnProperty(key)) {
				this.resourceDefinitions[key].init(this.gs);
			}
		}
	}


	//queues a resource to be loaded
	//key is the relative path to the root file for the resource
	//ex: "data/character-class/slime.json"
	//resourceType is resource definition type
	loadResource(key, resourceType, cbComplete) {
		var o = null;

		//check if its already been loaded/pending
		o = this.getResourceByKey(key);

		if(o === null) {
			var fullFilepath = path.join(this.gs.appRoot, key);

			o = new Resource();
			o.id = this.idCounter++;
			o.fullFilePath = fullFilepath;
			o.key = key;
			o.status = "open";
			o.filesToLoad = [];
			o.resourceType = resourceType;
			
			this.resourceArray.push(o);
			this.updateIndex(o.id, o.key, o, "create");
		}

		
		//this is to handle cases where the resource is trying to be unloaded/loaded in the same frame. 
		//This will basically just force the resource manager to reload the resource.
		if(o.status === "unload") {
			o.status = "open";
			o.filesToLoad = [];
		}

		//queue transaction
		var transactionObj = {
			"transaction": "load",
			"id": o.id,
			"key": o.key,
			"cbComplete": cbComplete,
			"status": "open",
			"statusMessage": ""
		}

		this.openTransactionQueue.push(transactionObj);
		this.isDirty = true;

		return o;
	}


	unloadResource(id) {
		var r = this.getResourceByID(id);
		if(r !== null && r.status !== "unload") {
			r.status = "unload";
			var transactionObj = {
				"transaction": "unload",
				"id": r.id,
				"statusMessage": ""
			}
			
			this.unloadTransactionQueue.push(transactionObj);
			this.isDirty = true;
		}
	}
	
	unloadResourceByKey(key) {
		var r = this.getResourceByKey(key);
		if(r !== null) {
			this.unloadResource(r.id);
		}
	}

	unloadAllResources() {
		for(var i = 0; i < this.resourceArray.length; i++) {
			this.unloadResource(this.resourceArray[i].id);
		}
		
		this.isDirty = true;
	}


	getResourceByID(id) {
		if(this.idIndex[id] !== undefined) {
			return this.idIndex[id];
		}
		else {
			return null;
		}
	}

	getResourceByKey(key) {
		if(this.keyIndex[key] !== undefined) {
			return this.keyIndex[key];
		}
		else {
			return null;
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

	getResourceDefinition(resourceType) {
		if(this.resourceDefinitions[resourceType] !== undefined) {
			return this.resourceDefinitions[resourceType];
		}
		else {
			return null;
		}
	}

	//returns true if any resources are still currently open/pending/succeded
	anyResourcesProcessing() {
		var resourcesLoading = false;
		if(this.openTransactionQueue.length > 0) {
			resourcesLoading = true;
		} 
		else if(this.pendingTransactionQueue.length > 0) {
			resourcesLoading = true;
		}
		//capture this one too. Sometimes it could be in the middle of a "success" callback
		else if(this.successTransactionQueue.length > 0) {
			resourcesLoading = true;
		}

		return resourcesLoading;
	}


	/*
	A resource "status" goes in this order:
	1: open - the resource is queued, but not started yet
	2: pending - the resource has started, but not finished yet 
	3: success - the resource has finished loaded
	4: unload - the resource is being unloaded or has unloaded (generally, this is to signal other transactions that they should stop the )
	*/
	update() {
		while(this.isDirty) {
			//process open transactions
			while(this.openTransactionQueue.length > 0) {
				var tr = this.openTransactionQueue.shift();
				var r = this.getResourceByID(tr.id);
				var rd = null;

				if(r === null || r.status === "unload") {
					tr.status = "unload";
				}

				//get resource definition
				if(tr.status === "open") {
					rd = this.getResourceDefinition(r.resourceType);

					//if there is no resource definition type, just succeed the resource for now (probably gonna make a generic json resource loader in the future to handle this case)
					if(rd === null) {
						r.status = "success"
						tr.status = "success";
					}
				}

				//process
				if(tr.status === "open") {
					//resource has never been loaded. So lets load it.
					if(r.status === "open") {
						//debug
						logger.log("info", "Resource-Manager: Now loading file. Key: '" + r.key + "', fullFilePath: '" + r.fullFilePath + "'.");
						rd.startLoadingResource(r);

						r.status = "pending";
						tr.status = "pending";
					}
					//resource is currently being read, caused by a previous transaction. Change the transaction to "pending" and just wait until its done.
					else if (r.status === "pending") {
						tr.status = "pending";
					}
					//resource has already been read, and was successful. change the transaction to "success".
					else if (r.status === "success") {
						tr.status = "success";
					}
					//resource has already been read, and unloaded. change the transaction to "unload".
					else if (r.status === "unload") {
						tr.status = "unload";
					}
				}

				//push transaction on pending/successful/unloaded
				if(tr.status === "pending") {
					this.pendingTransactionQueue.push(tr);
				} else if (tr.status === "success") {
					this.successTransactionQueue.push(tr);
				} else if (tr.status === "unload") {
					this.unloadTransactionQueue.push(tr);
				}
			}

			//check on pending transactions
			//debug
			// if(this.pendingTransactionQueue.length > 0) {
			// 	logger.log("info", "pending resource length: " + this.pendingTransactionQueue.length);
			// }

			var pendingTransactionsCompleted = []; //list of indices to splice off from "pendingTransactionQueue"
			for(var i = 0; i < this.pendingTransactionQueue.length; i++) {
				var tr = this.pendingTransactionQueue[i];
				var r = this.getResourceByID(tr.id);

				if(r === null || r.status === "unload") {
					tr.status = "unload";
				}

				//check if the resource has completed/unloaded
				if(tr.status === "pending") {
					if(r.status === "success") {
						tr.status = "success";
					} else if (r.status === "unload") {
						tr.status = "unload";
					}
				}

				//push transaction on successful/unloaded
				if(tr.status === "success") {
					this.successTransactionQueue.push(tr);
					pendingTransactionsCompleted.push(i);
				} else if (tr.status === "unload") {
					this.unloadTransactionQueue.push(tr);
					pendingTransactionsCompleted.push(i);
				}
			}

			//splice off any completed pending transactions
			for(var i = pendingTransactionsCompleted.length-1; i >= 0; i--) {
				this.pendingTransactionQueue.splice(i, 1);
			}

			pendingTransactionsCompleted = [];

			//process successful transansations
			//debug
			// if(this.successTransactionQueue.length > 0) {
			// 	logger.log("info", "success resource length: " + this.successTransactionQueue.length);
			// }

			while(this.successTransactionQueue.length > 0) {
				var tr = this.successTransactionQueue.shift();
				var r = this.getResourceByID(tr.id);

				if(r === null || r.status === "unload") {
					tr.status = "unload";
				}

				//call the callback if it exists
				if(tr.status === "success") {
					if(typeof tr.cbComplete === "function") {
						tr.cbComplete(r);
					}
				}

				//just incase it unloaded for some reason
				if (tr.status === "unload") {
					this.unloadTransactionQueue.push(tr);
				}
			}

			//process unload transactions
			while(this.unloadTransactionQueue.length > 0) {
				var tr = this.unloadTransactionQueue.shift();
				var r = this.getResourceByID(tr.id);

				if(r !== null && r.status === "unload") {
					var rindex = this.resourceArray.findIndex((x) => {return x.id === r.id;});

					if(rindex >= 0) {
						this.updateIndex(r.id, r.key, r, "delete");
						this.resourceArray.splice(rindex, 1);
					}
				}
			}

			//check if the open transaction still has items in it. If it does, redirty the manager and process them again.
			//This can occur if the cbComplete callback loads more resources.
			if(this.openTransactionQueue.length > 0) {
				//debug
				//logger.log("info", "FOUND OPEN TRANSACTIONS. Resetting the dirty flag.");

				this.isDirty = true;
			} else {
				this.isDirty = false;
			}
		}
	}


	///////////////////////////////////////////////
	// Helper functions for resource definitions //
	///////////////////////////////////////////////
	//...they had to live somewhere

	checkIfResourceComplete(resourceId) {
		var r = this.gs.rm.getResourceByID(resourceId);

		if(r.filesToLoad.length === 0) {
			var stophere = true;
		}

		if(r !== null && r.status !== "unload") {
			if( r.filesToLoad.length === 0) {
				r.status = "success";

				//dirty the manager so the manager knows to check the status change
				this.isDirty = true;
			}
		}
	}

	
	linkFile(resourceId, context, contextKey, fileKey, cbNextFunc) {
		var r = this.gs.rm.getResourceByID(resourceId);
		if(r !== null && r.status !== "unload") {
			this.gs.fm.loadFile(fileKey, this.cbFileLoadComplete.bind(this, resourceId, context, contextKey, fileKey, cbNextFunc));
			r.filesToLoad.push(fileKey);
		}
	}

	cbFileLoadComplete(resourceId, context, contextKey, fileKey, cbNextFunc, file) {
		var r = this.gs.rm.getResourceByID(resourceId);
		var contextValue = null;

		//exit early if the resource was unloaded
		if(r === null || r.status === "unload") {
			return;
		}

		if(file === null || file.status === "unload" || file.status === "failed") {
			contextValue = null;
		} else {
			contextValue = JSON.parse(JSON.stringify(file.data));
		}

		context[contextKey] = contextValue;
		var filesToLoadIndex = r.filesToLoad.findIndex((x) => {return x === fileKey});
		r.filesToLoad.splice(filesToLoadIndex, 1);

		//if the file was loaded correctly, call the callback
		if(contextValue !== null && typeof cbNextFunc === "function") {
			cbNextFunc(r, context, contextKey, contextValue);
		}

		this.checkIfResourceComplete(resourceId);
	}
}

exports.ResourceManager = ResourceManager;