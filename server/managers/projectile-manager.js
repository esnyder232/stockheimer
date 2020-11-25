const {GlobalFuncs} = require('../global-funcs.js');
const {Bullet} = require("../projectiles/bullet.js");

class ProjectileManager {
	constructor() {
		this.gs = null;
		this.nextAvailableId = -1;
		this.projectileArray = [];
		this.projectileIdArray = []; //eh whatever
		this.idIndex = {};
		
		this.maxAllowed = 65536;
		
		this.isDirty = false;
		this.transactionQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();

		for(var i = 0; i < this.maxAllowed; i++)
		{
			this.projectileIdArray.push(false);
		}

		this.nextAvailableId = this.globalfuncs.findNextAvailableId(this.projectileIdArray, this.nextAvailableId+1, this.maxAllowed);
	}

	createProjectile(type) {
		var p = null;

		if(this.nextAvailableId >= 0)
		{
			switch(type)
			{
				case "bullet":
					p = new Bullet();
					break;
			}

			this.projectileArray.push(p);
			p.id = this.nextAvailableId;
			this.projectileIdArray[p.id] = true;
			this.nextAvailableId = this.globalfuncs.findNextAvailableId(this.projectileIdArray, this.nextAvailableId+1, this.maxAllowed);
			
			this.updateIndex(p.id, p, 'create');
			
			console.log('projectile created. Id: ' + p.id);
		}
		
		return p;
	}

	destroyProjectileId(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "delete",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
		})

		this.isDirty = true;

		//just for logging
		var p = this.getProjectileByID(id)
		if(p)
		{
			console.log('projectile marked for deletion. id: ' + p.id);
		}
	}

	updateIndex(id, obj, transaction) {
		if(transaction == 'create')
		{
			this.idIndex[id] = obj;
		}
		else if(transaction == 'delete')
		{
			if(this.idIndex !== undefined)
			{
				delete this.idIndex[id];
			}
		}
	}

	update(dt) {
		if(this.isDirty)
		{
			//process any transactions that occured this frame
			if(this.transactionQueue.length > 0)
			{
				for(var i = 0; i < this.transactionQueue.length; i++)
				{
					var bError = false;
					var errorMessage = "";

					var index = this.projectileArray.findIndex((x) => {return x.id == this.transactionQueue[i].id;});
					if(index >= 0)
					{
						console.log('Projectile deleted. id: ' + this.projectileArray[index].id);
						this.updateIndex(this.projectileArray[index].id, null, 'delete');

						if(this.nextAvailableId < 0)
						{
							this.nextAvailableId = this.projectileArray[index].id;
						}

						this.projectileArray.splice(index, 1);
					}
					else
					{
						bError = false;
						errorMessage = "Projectile does not exist.";
					}
					
					if(bError)
					{
						console.log('ProjectileManager transaction error: ' + errorMessage + ". transaction Object: " + JSON.stringify(this.transactionQueue[i]));

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
		}
	}

	getProjectileByID(id) {
		if(this.idIndex[id])
		{
			return this.idIndex[id];
		}
		else
		{
			return null;
		}
	}
}

exports.ProjectileManager = ProjectileManager;