const {GlobalFuncs} = require('../global-funcs.js');
const {Character} = require('../characters/character.js');
const {Bullet} = require("../projectiles/bullet.js");
const {Castle} = require("../classes/castle.js");

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

	//this creates an "inactive" Game Object
	createGameObject(type) {
		var o = null;

		switch(type)
		{
			case "character":
				o = new Character();
				break;
			case "projectile":
				o = new Bullet();
				break;
			case "castle":
				o = new Castle();
				break;
		}

		o.id = this.gs.getGlobalGameObjectID();
		o.isActive = false;
		o.type = type;

		this.gameObjectArray.push(o);
		this.updateIndex(o.id, o, 'create');
		
		return o;
	}

	
	//this just marks the inactive object for deletion
	destroyGameObject(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "delete",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
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

	update() {
		if(this.isDirty)
		{
			//process any transactions that occured this frame
			if(this.transactionQueue.length > 0)
			{
				for(var i = 0; i < this.transactionQueue.length; i++)
				{
					var bError = false;
					var errorMessage = "";

					var o = this.getGameObjectByID(this.transactionQueue[i].id);
					if(o)
					{
						switch(this.transactionQueue[i].transaction)
						{
							//delete the inactive game object
							case "delete":
								if(!o.isActive)
								{
									var oi = this.gameObjectArray.findIndex((x) => {return x.id == o.id;});
									if(oi >= 0)
									{
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
							//deactivate the active game object
							case "deactivate":
								if(o.isActive)
								{
									var oi = this.activeGameObjectArray.findIndex((x) => {return x.id == o.id;})

									if(oi >= 0)
									{
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
								}
								break;
							default:
								//intentionally blank
								break;
						}
					}
					else
					{
						bError = false;
						errorMessage = "Game object does not exist.";
					}

					
					if(bError)
					{
						console.log('Game Object transaction error: ' + errorMessage + ". transaction Object: " + JSON.stringify(this.transactionQueue[i]));

						//call the callback if it exists
						if(this.transactionQueue[i].cbFail)
						{
							this.transactionQueue[i].cbFail(this.transactionQueue[i].id, errorMessage);
						}
					}
					else
					{
						//call the callback if it exists
						if(this.transactionQueue[i].cbSuccess)
						{
							this.transactionQueue[i].cbSuccess(this.transactionQueue[i].id);
						}
					}
				}

				//delete all transactions when done with processing them
				this.transactionQueue.length = 0;
			}
			
			this.isDirty = false;
		}
	}

	activateGameObjectId(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "activate",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
		});
		this.isDirty = true;
	}

	deactivateGameObjectId(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "deactivate",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
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

	
	getActiveGameObjects() {
		return this.activeGameObjectArray;
	}
}

exports.GameObjectManager = GameObjectManager;