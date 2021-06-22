const {GlobalFuncs} = require('../global-funcs.js');
const fs = require('fs');
const logger = require('../../logger.js');
const path = require('path');
const {Resource} = require("../classes/resource.js")
const {CharacterClassResourceRedoDefinition} = require("../resource-definition/character-class-resource-redo-definition.js")


class ResourceManagerRedo {
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
		this.failedTransactionQueue = [];

		this.resourceDefinitions = {};
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();

		this.resourceDefinitions["character-class"] = new CharacterClassResourceRedoDefinition();
		
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
			o.resourceType = resourceType;
			
			this.resourceArray.push(o);
			this.updateIndex(o.id, o.key, o, "create");
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


	/*
	A resource "status" goes in this order:
	1: open - the transaction is queued, but not started yet
	2: pending - the transaction has started, but not finished yet 
	3a: success - the transaction has finished, and is successful
	3b: failed - the transaction has finished, and has failed
	*/
	update() {
		while(this.isDirty) {
			//process open transactions
			while(this.openTransactionQueue.length > 0) {
				var tr = this.openTransactionQueue.shift();
				var r = this.getResourceByID(tr.id);
				var rd = null;

				//not sure how it would ever error here, but just incase
				if(r === null) {
					tr.status = "failed";
					tr.statusMessage = "Resource '" + tr.key + "' was never created internally.";
				}

				//get resource definition
				if(tr.status !== "failed") {
					rd = this.getResourceDefinition(r.resourceType);

					//if there is no resource definition type, just fail the resource for now (probably should read the resource root file no matter what...just as a TODO. I have no need for it right now though, so fuck it)
					if(rd === null) {
						r.status = "failed"
						r.errorMsg = "Resource-manager error. No resource definition is defined for key '" + tr.key + "', and resource definition '" + r.resourceType + "'.";
						tr.status = "failed";
					}
				}

				//process
				if(tr.status === "open") {
					//resource has never been loaded. So lets load it.
					if(r.status === "open") {
						//debug
						logger.log("info", "Resource-Manager-Redo: Now loading file. Key: '" + r.key + "', fullFilePath: '" + r.fullFilePath + "'.");
						rd.startLoadingResource(r, this.cbResourceComplete.bind(this));

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
					//resource has already been read, and failed. change the transaction to "failed".
					else if (r.status === "failed") {
						tr.status = "failed";
					}
				}

				//push transaction on pending/successful/failed
				if(tr.status === "pending") {
					this.pendingTransactionQueue.push(tr);
				} else if (tr.status === "success") {
					this.successTransactionQueue.push(tr);
				} else if (tr.status === "failed") {
					this.failedTransactionQueue.push(tr);
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

				//not sure how it would ever error here, but just incase
				if(r === null) {
					tr.status = "failed";
					tr.statusMessage = "Resource '" + tr.key + "' was never created internally.";
				}

				//check if the resource has completed/failed
				if(tr.status === "pending") {
					if(r.status === "success") {
						tr.status = "success";
					} else if (r.status === "failed") {
						tr.status = "failed";
					}
				}

				//push transaction on successful/failed
				if(tr.status === "success") {
					this.successTransactionQueue.push(tr);
					pendingTransactionsCompleted.push(i);
				} else if (tr.status === "failed") {
					this.failedTransactionQueue.push(tr);
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

				//not sure how it would ever error here, but just incase
				if(r === null) {
					tr.status = "failed";
					tr.statusMessage = "Resource '" + tr.key + "' was never created internally.";
				}

				//call the callback if it exists
				if(tr.status === "success") {
					if(typeof tr.cbComplete === "function") {
						tr.cbComplete(r);
					}
				}

				//just incase it failed for some reason
				if (tr.status === "failed") {
					this.failedTransactionQueue.push(tr);
				}
			}

			//process failed transactions
			//debug
			// if(this.failedTransactionQueue.length > 0) {
			// 	logger.log("info", "failed resource length: " + this.failedTransactionQueue.length);
			// }

			while(this.failedTransactionQueue.length > 0) {
				var tr = this.failedTransactionQueue.shift();
				var r = this.getResourceByID(tr.id);

				//call the callback if it exists
				if(r !== null) {
					if(typeof tr.cbComplete === "function") {
						tr.cbComplete(r);
					}

					//log failures
					logger.log("error", "Resource-manager error: Resource failed to load. FullFilePath: '" + r.fullFilePath + "'. Key: '" + r.key + "'. FileErrorMsg: " + r.errorMsg);
				} else {
					//log failures
					logger.log("error", "Resource-manager internal transaction error: " + tr.statusMessage);
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

	//tbh, i just don't care lol
	cbResourceComplete(resource) {
		this.isDirty = true;
	}

}

exports.ResourceManagerRedo = ResourceManagerRedo;