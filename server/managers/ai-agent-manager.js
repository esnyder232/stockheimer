const {GlobalFuncs} = require('../global-funcs.js');
const {AIAgent} = require('../ai-agent/ai-agent.js');
const logger = require('../../logger.js');

class AIAgentManager {
	constructor() {
		this.gs = null;
		
		this.idCounter = 0;
		this.AIAgentArray = [];
		this.idIndex = {};

		this.isDirty = false;
		this.transactionQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
	}

	createAIAgent() {
		var a = new AIAgent();

		a.id = this.idCounter++;
		this.AIAgentArray.push(a);

		this.updateIndex(a.id, a, "create");
		this.isDirty = true;		
		return a;
	}
	
	//this just marks for deletion
	destroyAIAgent(id, cbSuccess, cbFail) {
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

					var a = this.getAIAgentByID(this.transactionQueue[i].id);
					if(a)
					{
						switch(this.transactionQueue[i].transaction)
						{
							//delete
							case "delete":
								var ai = this.AIAgentArray.findIndex((x) => {return x.id == a.id;});
								if(ai >= 0)
								{
									//call activate function if it exists
									if(typeof this.AIAgentArray[ai].aiAgentDeinit === "function")
									{
										this.AIAgentArray[ai].aiAgentDeinit();
									}

									this.AIAgentArray.splice(ai, 1);
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
						errorMessage = "AI Agent does not exist.";
					}

					
					if(bError)
					{
						logger.log("info", 'AI Agent transaction error: ' + errorMessage + ". transaction Object: " + JSON.stringify(this.transactionQueue[i]));

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

	getAIAgentByID(id) {
		if(this.idIndex[id])
		{
			return this.idIndex[id];
		}
		else
		{
			return null;
		}
	}

	getAIAgents() {
		return this.AIAgentArray;
	}
}

exports.AIAgentManager = AIAgentManager;