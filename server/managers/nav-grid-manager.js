const {GlobalFuncs} = require('../global-funcs.js');
const {NavGrid} = require('../classes/nav-grid.js');

class NavGridManager {
	constructor() {
		this.gs = null;
		
		this.idCounter = 0;
		this.navGridArray = [];
		this.idIndex = {};

		this.isDirty = false;
		this.transactionQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
	}

	createNavGrid() {
		var ng = new NavGrid();

		ng.id = this.idCounter++;
		this.navGridArray.push(ng);

		this.updateIndex(ng.id, ng, "create");
		this.isDirty = true;		
		return ng;
	}
	
	//this just marks the navgrid for deletion
	destroyNavGrid(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "delete",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail,
			"status": "open",
			"statusMessage": ""
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

					var ng = this.getNavGridByID(this.transactionQueue[i].id);
					if(ng)
					{
						switch(this.transactionQueue[i].transaction)
						{
							//delete the inactive nav grid
							case "delete":
								var oi = this.navGridArray.findIndex((x) => {return x.id == ng.id;});
								if(oi >= 0)
								{
									this.navGridArray.splice(oi, 1);
									this.updateIndex(ng.id, null, "delete");
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
						errorMessage = "Nav grid does not exist.";
					}

					
					if(bError)
					{
						console.log('Nav grid transaction error: ' + errorMessage + ". transaction Object: " + JSON.stringify(this.transactionQueue[i]));

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

	getNavGridByID(id) {
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

exports.NavGridManager = NavGridManager;