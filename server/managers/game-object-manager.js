const {GlobalFuncs} = require('../global-funcs.js');
const {Character} = require('../characters/character.js');
const {Bullet} = require("../projectiles/bullet.js");

class GameObjectManager {
	constructor() {
		this.gs = null;
		
		//this.idCounter = 0;
		this.gameObjectArray = [];
		this.idIndex = {};

		this.nextAvailableActiveId = -1;
		this.activeGameObjectArray = [];
		this.activeGameObjectIdArray = [];
		this.maxActiveAllowed = 65536;
		
		this.isDirty = false;
		this.transactionQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();

		for(var i = 0; i < this.maxActiveAllowed; i++)
		{
			this.activeGameObjectIdArray.push(false);
		}

		this.nextAvailableActiveId = this.globalfuncs.findNextAvailableId(this.activeGameObjectIdArray, this.nextAvailableActiveId+1, this.maxActiveAllowed);
	}

	//this creates an "inactive" Game Object
	createGameObject(type) {
		var o = null;

		if(this.nextAvailableActiveId >= 0)
		{
			switch(type)
			{
				case "character":
					o = new Character();
					break;
				case "projectile":
					o = new Bullet();
					break;
			}

			if(o !== null)
			{
				o.id = this.gs.getGlobalGameObjectID();
				o.isActive = false;
				o.type = type;
		
				this.gameObjectArray.push(o);
				this.updateIndex(o.id, o, 'create');
			}
		}
		
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
										this.activeGameObjectIdArray[this.activeGameObjectArray[oi].activeId] = false;

										if(this.nextAvailableActiveId < 0)
										{
											this.nextAvailableActiveId = this.activeGameObjectArray[oi].activeId;
										}

										//invalidate the id
										this.activeGameObjectArray[oi].activeId = null;
										this.activeGameObjectArray[oi].isActive = false;

										this.activeGameObjectArray.splice(oi, 1);
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

								if(!bError && this.nextAvailableActiveId < 0)
								{
									bError = true;
									errorMessage = "Max allowed activated game objects reached.";
								}

								if(!bError)
								{
									this.activeGameObjectArray.push(o);

									o.activeId = this.nextAvailableActiveId;
									o.isActive = true;
									this.activeGameObjectIdArray[o.activeId] = true;
									this.nextAvailableActiveId = this.globalfuncs.findNextAvailableId(this.activeGameObjectIdArray, this.nextAvailableActiveId+1, this.maxActiveAllowed);
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

			this.updateIndex();
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