const {GlobalFuncs} = require('../global-funcs.js');
const {Character} = require('../game-objects/character.js');
const {Projectile} = require("../game-objects/projectile.js");
const {Castle} = require("../game-objects/castle.js");
const {Wall} = require("../game-objects/wall.js");
const {Shield} = require("../game-objects/shield.js");
const logger = require('../../logger.js');

class GameObjectManager {
	constructor() {
		this.gs = null;
		
		this.gameObjectArray = [];
		this.idIndex = {};

		this.activeGameObjectArray = [];
		this.activeIdIndex = {};
		
		this.isDirty = false;
		this.transactionQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
	}

	createGameObject(type) {
		var o = null;
		var activate = true;

		switch(type)
		{
			case "character":
				o = new Character();
				break;
			case "projectile":
				o = new Projectile();
				break;
			case "castle":
				o = new Castle();
				break;
			case "shield":
				o = new Shield();
				break;
			case "wall":
				o = new Wall();
				//feels kinda hacky...but don't activate a wall object. Because its not really "active", is it?
				activate = false; 
				break;
		}

		o.id = this.gs.getGlobalGameObjectID();
		o.isActive = false;
		o.type = type;

		this.gameObjectArray.push(o);
		this.updateIndex(o.id, o, 'create');

		if(activate) {
			this.activateGameObjectId(o.id);
		}
		
		return o;
	}

	
	//this just marks the inactive object for deletion
	destroyGameObject(id) {
		this.transactionQueue.push({
			"transaction": "deactivateDelete",
			"id": id
		})

		this.isDirty = true;
	}


	updateIndex(id, obj, transaction) {
		if(transaction == 'create')
		{
			this.idIndex[id] = obj;
		}
		else if(transaction == 'delete')
		{
			if(this.idIndex[id] !== undefined)
			{
				delete this.idIndex[id];
			}
		}
		else if(transaction == "activate")
		{
			this.activeIdIndex[id] = obj;
		}
		else if(transaction == "deactivate")
		{
			if(this.activeIdIndex[id] !== undefined)
			{
				delete this.activeIdIndex[id];
			}
		}
	}



	//For objectDestruction:
	//if an object is activated...
	// end of frame 0 - call deactivate
	// end of frame 1 - call deinit, splice

	//if an object is deactivated already...
	// end of frame 0 - call deinit, splice
	update(dt) {
		if(this.isDirty)
		{
			//temp array for follow up transactions to be processed on the next frame (usually for objectDestruction)
			var followUpTransactions = [];

			//process any transactions that occured this frame
			if(this.transactionQueue.length > 0)
			{
				for(var i = 0; i < this.transactionQueue.length; i++)
				{
					try 
					{
						var bError = false;
						var errorMessage = "";

						var o = this.getGameObjectByID(this.transactionQueue[i].id);

						if(o)
						{
							switch(this.transactionQueue[i].transaction)
							{
								//delete the game object (deinit, splice)
								case "delete":
									if(!o.isActive)
									{
										var oi = this.gameObjectArray.findIndex((x) => {return x.id == o.id;});
										if(oi >= 0)
										{
											//call deinit function if it exists
											if(typeof this.gameObjectArray[oi].deinit === "function")
											{
												this.gameObjectArray[oi].deinit();
											}
											this.updateIndex(this.gameObjectArray[oi].id, null, "delete");
											this.gameObjectArray.splice(oi, 1);
										}
									}
									else
									{
										bError = true;
										errorMessage = "Game Object is still active.";
									}
									break;
								//deactivate the game object (deactivate)
								case "deactivate":
									if(o.isActive)
									{
										var oi = this.activeGameObjectArray.findIndex((x) => {return x.id == o.id;})
	
										if(oi >= 0)
										{
											//call deactivate function if it exists
											if(typeof o.deactivated === "function")
											{
												o.deactivated();
											}

											this.activeGameObjectArray[oi].isActive = false;
											this.activeGameObjectArray.splice(oi, 1);
											this.updateIndex(o.id, o, "deactivate");
										}
									}
									else 
									{
										bError = true;
										errorMessage = "Game Object is already deactivated.";
									}
									break;
								
								//deactivate, then follow up transaction for delete
								case "deactivateDelete":
									if(o.isActive)
									{
										var oi = this.activeGameObjectArray.findIndex((x) => {return x.id == o.id;})
	
										if(oi >= 0)
										{
											//call deactivate function if it exists
											if(typeof o.deactivated === "function")
											{
												o.deactivated();
											}

											this.activeGameObjectArray[oi].isActive = false;
											this.activeGameObjectArray.splice(oi, 1);
											this.updateIndex(o.id, o, "deactivate");
										}
									}

									//follup transaction
									followUpTransactions.push({
										"transaction": "delete",
										"id": o.id
									});
									break;
	
								//activate the inactive game object
								case "activate":
									if(o.isActive)
									{
										bError = true;
										errorMessage = "Game object is already activated.";
									}
	
									if(!bError)
									{
										this.activeGameObjectArray.push(o);
										o.isActive = true;
										this.updateIndex(o.id, o, "activate");

										//call activate function if it exists
										if(typeof o.activated === "function")
										{
											o.activated();
										}
									}
									break;
								default:
									//intentionally blank
									break;
							}
						}
						else
						{
							bError = true;
							errorMessage = "Game object does not exist.";
						}
					}
					catch(ex) {
						bError = true;
						errorMessage = "Exception caught: " + ex + ". Stack: " + ex.stack;
					}

					if(bError)
					{
						logger.log("error", 'Game Object transaction error: ' + errorMessage + ". transaction Object: " + JSON.stringify(this.transactionQueue[i]));
					}
				}

				//delete all transactions when done with processing them
				this.transactionQueue.length = 0;
			}

			//add any follow up transactions to the main transaction queue
			if(followUpTransactions.length > 0)
			{
				for(var i = 0; i < followUpTransactions.length; i++)
				{
					this.transactionQueue.push(followUpTransactions[i]);
				}

				followUpTransactions.length = 0;
				
				//important to dirty the game object manager here, so the follow up transactions next frame will be processed
				this.isDirty = true;
			}
			else
			{
				this.isDirty = false;
			}
		}
	}

	activateGameObjectId(id) {
		this.transactionQueue.push({
			"transaction": "activate",
			"id": id
		});
		this.isDirty = true;
	}

	deactivateGameObjectId(id) {
		this.transactionQueue.push({
			"transaction": "deactivate",
			"id": id
		});
		this.isDirty = true;
	}

	getGameObjectByID(id) {
		if(this.idIndex[id])
		{
			return this.idIndex[id];
		}
		else
		{
			return null;
		}
	}

	getActiveGameObjectID(id) {
		if(this.activeIdIndex[id])
		{
			return this.activeIdIndex[id];
		}
		else
		{
			return null;
		}
	}

	getActiveGameObjects() {
		return this.activeGameObjectArray;
	}

	getGameObjects() {
		return this.gameObjectArray;
	}
}

exports.GameObjectManager = GameObjectManager;