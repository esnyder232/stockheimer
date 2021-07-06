import GlobalFuncs from "../global-funcs.js";
import Resource from "../classes/resource.js";
import TilemapResourceLoader from "../resource-loaders/tilemap-resource-loader.js";
import TilesetResourceLoader from "../resource-loaders/tileset-resource-loader.js";
import SpriteResourceLoader from "../resource-loaders/sprite-resource-loader.js";



export default class ResourceManager {
	constructor() {
		this.gc = null;
		this.idCounter = 1;
		this.resourceArray = [];
		this.idIndex = {};
		this.keyIndex = {};
		this.serverIdIndex = {};
		this.resourceLoaders = {};
		this.typeIndex = {};

		this.openTransactionQueue = [];
		this.pendingTransactionQueue = [];
		this.successTransactionQueue = [];
		this.failedTransactionQueue = [];
		this.unloadTransactionQueue = [];

		this.eventDelegates = {};
	}

	init(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();

		this.phaserEventMapping = [];

		//the only reason these are here instead of the resource itself is for efficiency reasons (this way only ONE function is called when phaser is done loading, instead of one function PER RESOURCE)
		this.windowsEventMapping = [
			{event: 'loaderror', func: this.loadError.bind(this)},
			{event: 'filecomplete', func: this.fileComplete.bind(this)}
		];
		
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		this.resourceLoaders["tilemap"] = new TilemapResourceLoader();
		this.resourceLoaders["tileset"] = new TilesetResourceLoader();
		this.resourceLoaders["sprite"] = new SpriteResourceLoader();
		
		for(var key in this.resourceLoaders) {
			if (this.resourceLoaders.hasOwnProperty(key)) {
				this.resourceLoaders[key].init(this.gc);
			}
		}
	}

	loadError(e) {
		// console.log('LOAD ERROR INSIDE RESOURCE MANAGER:');
		// console.log(e);

		var key = e.detail.file.key;
		var r = null;
		var rl = null;

		//check to make sure the file still exists and is not unloaded
		r = this.getResourceByKey(key, true);
		if(r !== null && r.status !== "unload") {

			//tell the resource loader about it
			rl = this.getResourceLoader(r.resourceType);

			if(rl !== null) {
				rl.loadError(r, e)
			}
		}

		//see if any delegates need to be called as well
		if(this.eventDelegates[key] !== undefined) {
			//get the resource
			var id = this.eventDelegates[key].resourceId;
			r = this.getResourceByID(id, true);
			if(r !== null && r.status !== "unload") {
				//call the resource loaders that registered for the key
				for(var i = 0; i < this.eventDelegates[key].delegateArray.length; i++) {
					if(typeof this.eventDelegates[key].delegateArray[i].cbFileError === "function") {
						this.eventDelegates[key].delegateArray[i].cbFileError(r, e);
					}
				}
			}
		}

	}

	fileComplete(e) {
		// console.log('-------------INSIDE RESOURCE MANAGER:');
		// console.log(e.detail.key);
		// console.log(e.detail.type);
		// console.log(e.detail.data);

		var key = e.detail.key;
		var r = null;
		var rl = null;

		//check to make sure the file still exists and is not unloaded
		r = this.getResourceByKey(key, true);
		if(r !== null && r.status !== "unload") {
			//tell the resource loader about it
			rl = this.getResourceLoader(r.resourceType);

			if(rl !== null) {
				rl.fileComplete(r, e)
			}
		}

		//see if any delegates need to be called as well
		if(this.eventDelegates[key] !== undefined) {
			//get the resource
			var id = this.eventDelegates[key].resourceId;
			r = this.getResourceByID(id, true);
			if(r !== null && r.status !== "unload") {
				//call the resource loaders that registered for the key
				//console.log("=-=- now calling delegates. length: " + this.eventDelegates[key].delegateArray.length);
				for(var i = 0; i < this.eventDelegates[key].delegateArray.length; i++) {
					if(typeof this.eventDelegates[key].delegateArray[i].cbFileComplete === "function") {
						this.eventDelegates[key].delegateArray[i].cbFileComplete(r, e);
					}
				}
			}
		}
	}

	loadResource(serverResource, cbComplete) {
		var o = null;

		//check if the resource was already created
		o = this.getResourceByKey(serverResource.key, true)
		if(o === null) {
			var o = new Resource();

			o.id = this.idCounter++;
			o.serverId = serverResource.id;
			o.status = "open";
			o.key = serverResource.key;
			o.data = serverResource.data;
			o.resourceType = serverResource.resourceType;
			
			this.resourceArray.push(o);	
			this.updateIndex(o.id, o.key, o.serverId, o.resourceType, o, "create");

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
		}

		return o;
	}

	unloadResource(id) {
		var r = this.getResourceByID(id, true);
		if(r !== null && r.status !== "unload") {
			r.status = "unload";
			var transactionObj = {
				"transaction": "unload",
				"id": r.id,
				"statusMessage": ""
			}
			
			this.unloadTransactionQueue.push(transactionObj);
		}
	}

	unloadAllResources() {
		for(var i = 0; i < this.resourceArray.length; i++) {
			this.unloadResource(this.resourceArray[i].id);
		}
	}


	getResourceLoader(resourceType) {
		if(this.resourceLoaders[resourceType] !== undefined) {
			return this.resourceLoaders[resourceType];
		}
		else {
			return null;
		}
	}

	updateIndex(id, key, serverId, resourceType, obj, transaction) {
		if(transaction == 'create') {
			this.idIndex[id] = obj;
			this.keyIndex[key] = obj;
			this.serverIdIndex[serverId] = obj;
			
			if(this.typeIndex[resourceType] === undefined) {
				this.typeIndex[resourceType] = [];
			}
			this.typeIndex[resourceType].push(obj);
		}
		else if(transaction == 'delete') {
			if(this.idIndex[id] !== undefined) {
				delete this.idIndex[id];
			}

			if(this.keyIndex[key] !== undefined) {
				delete this.keyIndex[key];
			}

			if(this.serverIdIndex[serverId] !== undefined) {
				delete this.serverIdIndex[serverId]
			}

			if(this.typeIndex[resourceType] !== undefined) {
				var ind = this.typeIndex[resourceType].findIndex((x) => {return x.id === id;});
				if(ind >= 0) {
					this.typeIndex[resourceType].splice(ind, 1);
				}

				if(this.typeIndex[resourceType].length === 0) {
					delete this.typeIndex[resourceType];
				}
			}
		}
	}

	//can't wait to refactor this pile of shit!
	registerDelegate(key, resourceId, resourceType, cbFileComplete, cbFileError) {
		if(this.eventDelegates[key] === undefined) {
			this.eventDelegates[key] = {
				resourceId: null,
				delegateArray: []
			};
			this.eventDelegates[key].resourceId = resourceId;
		}

		var existingDelegateObj = this.eventDelegates[key].delegateArray.find((x) => {return x.resourceType === resourceType;});

		if(existingDelegateObj === undefined) {
			existingDelegateObj = {
				resourceType: null,
				cbFileComplete: null,
				cbFileError: null
			}

			this.eventDelegates[key].delegateArray.push(existingDelegateObj);
		}

		existingDelegateObj.resourceType = resourceType;
		existingDelegateObj.cbFileComplete = cbFileComplete;
		existingDelegateObj.cbFileError = cbFileError;
	}

	unregisterDelegate(key, resourceId, resourceType) {
		if(this.eventDelegates[key] !== undefined) {
			var existingDelegateObjIndex = this.eventDelegates[key].delegateArray.findIndex((x) => {return x.resourceType === resourceType});

			if(existingDelegateObjIndex >= 0) {
				this.eventDelegates[key].delegateArray.splice(existingDelegateObjIndex, 1);
			}
			
			if(this.eventDelegates[key].delegateArray.length === 0) {
				delete this.eventDelegates[key];
			}
		}
	}


	update(dt) {
		if(this.anyResourcesLoading()) {
			//process open transactions
			while(this.openTransactionQueue.length > 0) {
				var tr = this.openTransactionQueue.shift();
				var r = this.getResourceByID(tr.id, true);
				var rd = null;

				if(r === null || r.status === "unload") {
					tr.status = "unload";
				}

				//get resource definition
				if(tr.status === "open") {
					rd = this.getResourceLoader(r.resourceType);

					//if there is no resource definition type, just succeed the resource for now (probably gonna make a generic json resource loader in the future to handle this case)
					if(rd === null) {
						r.status = "success";
						tr.status = "success";
					}
				}

				//resource has never been loaded. So lets load it.
				if(tr.status === "open" && r.status === "open") {
					//debug
					//console.log("Resource-Manager: Now loading file. Key: '" + r.key + "', fullFilePath: '" + r.fullFilePath + "'.");
					
					r.status = "pending";
					tr.status = "pending";
					
					rd.startLoadingResource(r);
				}

				//resource is currently being read, caused by a previous transaction. Change the transaction to "pending" and just wait until its done.
				if (r.status === "pending") {
					tr.status = "pending";
				}
				//resource has already been read, and was successful. change the transaction to "success".
				else if (r.status === "success") {
					tr.status = "success";
				}
				//resource has already been read, and unloaded. change the transaction to "unload".
				else if (r.status === "unload") {
					tr.status = "unload";
				} else if (r.status === "failed") {
					tr.status = "failed";
				}

				//push transaction on pending/successful/unloaded
				if(tr.status === "pending") {
					this.pendingTransactionQueue.push(tr);
				} else if (tr.status === "success") {
					this.successTransactionQueue.push(tr);
				} else if (tr.status === "unload") {
					this.unloadTransactionQueue.push(tr);
				} else if (tr.status === "failed") {
					this.failedTransactionQueue.push(tr);
				}
			}

			//check on pending transactions
			//debug
			if(this.pendingTransactionQueue.length > 0) {
				//console.log("pending resource length: " + this.pendingTransactionQueue.length);
			}

			var pendingTransactionsCompleted = []; //list of indices to splice off from "pendingTransactionQueue"
			for(var i = 0; i < this.pendingTransactionQueue.length; i++) {
				var tr = this.pendingTransactionQueue[i];
				var r = this.getResourceByID(tr.id, true);

				if(r === null || r.status === "unload") {
					tr.status = "unload";
				}

				//check if the resource has completed/unloaded
				if(tr.status === "pending") {
					if(r.status === "success") {
						tr.status = "success";
					} else if (r.status === "unload") {
						tr.status = "unload";
					} else if (r.status === "failed") {
						tr.status = "failed";
					}
				}

				//push transaction on successful/unloaded
				if(tr.status === "success") {
					this.successTransactionQueue.push(tr);
					pendingTransactionsCompleted.push(i);
				} else if (tr.status === "unload") {
					this.unloadTransactionQueue.push(tr);
					pendingTransactionsCompleted.push(i);
				} else if (tr.status === "failed") {
					this.failedTransactionQueue.push(tr);
					pendingTransactionsCompleted.push(i);
				}
			}

			//splice off any completed pending transactions
			for(var i = pendingTransactionsCompleted.length-1; i >= 0; i--) {
				this.pendingTransactionQueue.splice(pendingTransactionsCompleted[i], 1);
			}

			pendingTransactionsCompleted = [];

			//process successful transactions
			//debug
			if(this.successTransactionQueue.length > 0) {
				//console.log("success resource length: " + this.successTransactionQueue.length);
			}

			while(this.successTransactionQueue.length > 0) {
				var tr = this.successTransactionQueue.shift();
				var r = this.getResourceByID(tr.id, true);

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

			//process failed transactions
			while(this.failedTransactionQueue.length > 0) {
				var tr = this.failedTransactionQueue.shift();
				var r = this.getResourceByID(tr.id, true);

				if(r === null || r.status === "unload") {
					tr.status = "unload";
				}

				//call the callback if it exists
				if(tr.status === "failed") {
					//log failures
					this.globalfuncs.appendToLog(r.errorMsg);

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
				//console.log("unload resource length: " + this.unloadTransactionQueue.length);
				var tr = this.unloadTransactionQueue.shift();
				var r = this.getResourceByID(tr.id, true);

				if(r !== null && r.status === "unload") {
					var rindex = this.resourceArray.findIndex((x) => {return x.id === r.id;});

					if(rindex >= 0) {
						//call unload resource to unload it from phaser
						rd = this.getResourceLoader(r.resourceType);
						
						if(rd !== null) {
							rd.unloadResource(r);
						}

						this.updateIndex(r.id, r.key, r.serverId, r.resourceType, r, "delete");
						this.resourceArray.splice(rindex, 1);
					}
				}
			}
		}
	}

	anyResourcesLoading() {
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
		else if(this.failedTransactionQueue.length > 0) {
			resourcesLoading = true;
		}
		else if(this.unloadTransactionQueue.length > 0) {
			resourcesLoading = true;
		}

		return resourcesLoading;
	}

	getResourceByID(id, includeNullData) {
		var r = null;

		if(this.idIndex[id] !== undefined) {
			r = this.idIndex[id];
		}

		if(r !== null && includeNullData !== true && r.data === null) {
			r = null;
		}

		return r;
	}

	getResourceByKey(key, includeNullData) {
		var r = null;

		if(this.keyIndex[key] !== undefined) {
			r = this.keyIndex[key];
		}

		if(r !== null && includeNullData !== true && r.data === null) {
			r = null;
		}

		return r;
	}
	
	getResourceByType(resourceType, includeNullData) {
		var arr = [];
		if(this.typeIndex[resourceType] !== undefined) {
			arr = this.typeIndex[resourceType];
		}

		if(includeNullData !== true) {
			arr = arr.filter((x) => {return x.data !== null;});
		}

		return arr;
	}

	getResourceByServerId(serverId, includeNullData) {
		var r = null;

		if(this.serverIdIndex[serverId] !== undefined) {
			r = this.serverIdIndex[serverId];
		}

		if(r !== null && includeNullData !== true && r.data === null) {
			r = null;
		}

		return r;
	}
}
