const {GlobalFuncs} = require('../global-funcs.js');
const fs = require('fs');
const logger = require('../../logger.js');
const path = require('path');
const {FileWrapper} = require("../classes/file-wrapper.js")


//This manager actually reads files and calls callbacks when finished. It also acts as a cache for the files.
//The callback will be called when this manager's update() is called.

class FileManager {
	constructor() {
		this.gs = null;

		this.idCounter = 0; 
		this.fileArray = [];
		this.idIndex = {};
		this.keyIndex = {};

		this.isDirty = false;
		this.openTransactionQueue = [];
		this.pendingTransactionQueue = [];
		this.successTransactionQueue = [];
		this.failedTransactionQueue = [];
		this.unloadTransactionQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
	}


	//queues a file to be loaded
	//key is the relative path to the file
	//ex: "data/character-class/slime.json"
	loadFile(key, cbComplete) {
		var o = null;

		//check if its already been loaded/pending
		o = this.getFileByKey(key);

		if(o === null) {
			var fullFilepath = path.join(this.gs.appRoot, key);

			o = new FileWrapper();
			o.id = this.idCounter++;
			o.fullFilePath = fullFilepath;
			o.key = key;
			o.status = "open";

			this.fileArray.push(o);
			this.updateIndex(o.id, o.key, o, "create");
		}

		//this is to handle cases where the file is trying to be unloaded/loaded in the same frame. 
		//This will basically just force the file manager to read from disk again.
		if(o.status === "unload") {
			o.status = "open";
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

	unloadFile(id) {
		var f = this.getFileByID(id);
		if(f !== null && f.status !== "unload") {
			f.status = "unload";
			var transactionObj = {
				"transaction": "unload",
				"id": f.id,
				"statusMessage": ""
			}
			
			this.unloadTransactionQueue.push(transactionObj);
			this.isDirty = true;
		}
	}
	
	unloadFileByKey(key) {
		var f = this.getFileByKey(key);
		if(f !== null) {
			this.unloadFile(f.id);
		}
	}

	unloadAllFiles() {
		for(var i = 0; i < this.fileArray.length; i++) {
			this.unloadFile(this.fileArray[i].id);
		}
		
		this.isDirty = true;
	}

	getFileByID(id) {
		if(this.idIndex[id] !== undefined) {
			return this.idIndex[id];
		}
		else {
			return null;
		}
	}

	getFileByKey(key) {
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

	/*
	A file "status" goes in this order:
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
				var f = this.getFileByID(tr.id);

				if(f === null || f.status === "unload") {
					tr.status = "failed";
					tr.statusMessage = "File was not found or has been previously unloaded.";
				}

				//process
				if(tr.status === "open") {
					//file has never been loaded. So lets load it.
					if(f.status === "open") {
						//debug
						//logger.log("info", "File-manager: Now loading file. Key: '" + f.key + "', fullFilePath: '" + f.fullFilePath + "'.");
						fs.readFile(f.fullFilePath, this.fileReadComplete.bind(this, tr));

						f.status = "pending";
						tr.status = "pending";
					}
					//file is currently being read, caused by a previous transaction. Change the transaction to "pending" and just wait until its done.
					else if (f.status === "pending") {
						tr.status = "pending";
					}
					//file has already been read, and was successful. change the transaction to "success".
					else if (f.status === "success") {
						tr.status = "success";
					}
					//file has already been read, and failed. change the transaction to "failed".
					else if (f.status === "failed") {
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
			// 	logger.log("info", "pending file length: " + this.pendingTransactionQueue.length);
			// }

			var pendingTransactionsCompleted = []; //list of indices to splice off from "pendingTransactionQueue"
			for(var i = 0; i < this.pendingTransactionQueue.length; i++) {
				var tr = this.pendingTransactionQueue[i];
				var f = this.getFileByID(tr.id);

				if(f === null || f.status === "unload") {
					tr.status = "failed";
					tr.statusMessage = "File was not found or has been previously unloaded.";
				}

				//check if the file has completed/failed
				if(tr.status === "pending") {
					if(f.status === "success") {
						tr.status = "success";
					} else if (f.status === "failed") {
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
			// 	logger.log("info", "success file length: " + this.successTransactionQueue.length);
			// }

			while(this.successTransactionQueue.length > 0) {
				var tr = this.successTransactionQueue.shift();
				var f = this.getFileByID(tr.id);

				if(f === null || f.status === "unload") {
					tr.status = "failed";
					tr.statusMessage = "File was not found or has been previously unloaded.";
				}

				//call the callback if it exists
				if(tr.status === "success") {
					if(typeof tr.cbComplete === "function") {
						tr.cbComplete(f);
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
			// 	logger.log("info", "failed file length: " + this.failedTransactionQueue.length);
			// }

			while(this.failedTransactionQueue.length > 0) {
				var tr = this.failedTransactionQueue.shift();
				var f = this.getFileByID(tr.id);

				//call the callback if it exists
				if(f !== null) {
					//only call the callback if the file officially 'failed'. It could have been 'unloaded' as well, and we don't want to call the call back in that case.
					if(f.status === "failed" && typeof tr.cbComplete === "function") {
						tr.cbComplete(f);
					}
					
					//log failures
					logger.log("error", "File-manager error: File failed to load. Key: '" + f.key + "'. File Error Message: " + f.errorMsg + ". Transaction Error Message: " + tr.statusMessage);
				} else {
					//log failures
					logger.log("error", "File-manager error: File failed to load.Key: '" + tr.key + ". Transaction Error Message: " + tr.statusMessage);
				}
			}

			//process unload transactions
			while(this.unloadTransactionQueue.length > 0) {
				var tr = this.unloadTransactionQueue.shift();
				var f = this.getFileByID(tr.id);

				if(f !== null && f.status === "unload") {
					var findex = this.fileArray.findIndex((x) => {return x.id === f.id;});

					if(findex >= 0) {
						this.updateIndex(f.id, f.key, f, "delete");
						this.fileArray.splice(findex, 1);
					}
				}
			}

			//check if the open transaction still has items in it. If it does, redirty the manager and process them again.
			//This can occur if the cbComplete callback loads more files.
			if(this.openTransactionQueue.length > 0) {
				//debug
				//logger.log("info", "FOUND OPEN TRANSACTIONS. Resetting the dirty flag.");

				this.isDirty = true;
			} else {
				this.isDirty = false;
			}
		}
	}

	fileReadComplete(tr, err, data) {
		var f = this.getFileByID(tr.id);

		//testing unloading
		// if(f !== null) {
		// 	this.unloadFile(f.id);
		// }

		if(f === null || f.status === "unload") {
			tr.status = "failed";
			tr.statusMessage = "File was not found or has been previously unloaded."; 
		}

		if(tr.status === "pending") {
			if(err) {
				f.status = "failed";
				f.errorMsg = err;

				tr.status = "failed";
			}
			else {
				//parse the file's data, and store it in the file wrapper
				try {
					//copy the data out of the data into the file
					f.data = JSON.parse(data);
					f.status = "success";
					tr.status = "success";
				}
				catch(ex) {
					//logger.log("error", "Exception caught when parsing file: " + ex);
					f.status = "failed";
					f.errorMsg = "Exception caught when parsing file: " + ex;
					tr.status = "failed";
				}
			}
		}

		this.isDirty = true;
	}
}

exports.FileManager = FileManager;