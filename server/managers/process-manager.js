const {GlobalFuncs} = require('../global-funcs.js');
const logger = require('../../logger.js');
const GameConstants = require('../../shared_files/game-constants.json');
const {RespawnProcess} = require("../processes/respawn-process.js");
const {CooldownProcess} = require("../processes/cooldown-process.js");

class ProcessManager {
	constructor() {
		this.gs = null;
		
		this.idCounter = 0;
		this.processArray = [];
		this.idIndex = {};

		this.isDirty = false;
		this.transactionQueue = [];

		this.processMap = {}; //key is key from GameConstats.ProcessTypes. Value is the constructor of the process to start/update/stop.
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();

		//create process map
		this.processMap = {
			"RESPAWN": RespawnProcess,
			"COOLDOWN": CooldownProcess
		};
	}

	createProcess(processType, timeLength) {
		var o = null;

		if(GameConstants.ProcessTypes[processType] !== undefined && this.processMap[processType] !== undefined)
		{
			o = new this.processMap[processType](this.gs, timeLength);
	
			o.id = this.idCounter;
			o.type = processType;

			this.idCounter++;
	
			this.processArray.push(o);
			this.updateIndex(o.id, o, 'create');
			this.isDirty = true;

			this.transactionQueue.push({
				"transaction": "create",
				"id": o.id
			})
		}

		return o;
	}
	
	//this just marks for deletion
	destroyProcess(id) {
		this.transactionQueue.push({
			"transaction": "delete",
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
	}

	update(dt) {

		//update the processes
		for(var i = 0; i < this.processArray.length; i++)
		{
			this.processArray[i].update(dt);

			if(this.processArray[i].timeAcc >= this.processArray[i].timeLength)
			{
				this.processArray[i].done(dt);
				this.destroyProcess(this.processArray[i].id);
			}
		}
		
		//create/delete any processes
		if(this.isDirty)
		{
			//process any transactions that occured this frame
			if(this.transactionQueue.length > 0)
			{
				for(var i = 0; i < this.transactionQueue.length; i++)
				{
					var bError = false;
					var errorMessage = "";

					var a = this.getProcessByID(this.transactionQueue[i].id);
					if(a)
					{
						switch(this.transactionQueue[i].transaction)
						{
							//create
							case "create":
								a.start();
								break;
							//delete
							case "delete":
								var ai = this.processArray.findIndex((x) => {return x.id == a.id;});
								if(ai >= 0)
								{
									this.processArray.splice(ai, 1);
									this.updateIndex(a.id, null, "delete");
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
						errorMessage = "Process does not exist.";
					}

					if(bError)
					{
						logger.log("error", 'Process transaction error: ' + errorMessage + ". transaction Object: " + JSON.stringify(this.transactionQueue[i]));
					}
				}

				//delete all transactions when done with processing them
				this.transactionQueue.length = 0;
			}

			this.isDirty = false;
		}


	}

	getProcessByID(id) {
		if(this.idIndex[id])
		{
			return this.idIndex[id];
		}
		else
		{
			return null;
		}
	}

	getProcesses() {
		return this.processArray;
	}
}

exports.ProcessManager = ProcessManager;