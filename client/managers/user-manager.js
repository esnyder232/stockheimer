import GlobalFuncs from '../global-funcs.js';
import User from '../classes/user.js';

export default class UserManager {
	constructor() {
		this.gc = null;
		
		this.userArray = [];
		this.idIndex = {};

		this.activeUserArray = [];
		this.activeIdIndex = {};
		this.serverIdClientIdMap = {};
		
		this.isDirty = false;
		this.transactionQueue = [];
		this.idCounter = 0;
	}

	init(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();
	}

	createUser(serverId) {
		var o = new User();

		o.id = this.idCounter++;

		this.userArray.push(o);

		if(serverId !== undefined)
		{
			this.serverIdClientIdMap[serverId] = o.id;
			o.serverId = serverId
		}
		
		this.updateIndex(o.id, o, 'create');

		//go ahead and put in the activate transaction as well
		this.activateUserId(o.id);
		
		return o;
	}


	destroyUserServerId(serverId) {
		if(this.serverIdClientIdMap[serverId] !== undefined)
		{
			this.destroyUser(this.serverIdClientIdMap[serverId]);
		}
	}

	//this just marks the inactive object for deletion
	destroyUser(id) {
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

			if(this.serverIdClientIdMap[obj.serverId] !== undefined)
			{
				delete this.serverIdClientIdMap[obj.serverId];
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
	update() {
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

						var o = this.getUserByID(this.transactionQueue[i].id);

						if(o)
						{
							switch(this.transactionQueue[i].transaction)
							{
								//delete the game object (deinit, splice)
								case "delete":
									if(!o.isActive)
									{
										var oi = this.userArray.findIndex((x) => {return x.id == o.id;});
										if(oi >= 0)
										{
											//call deinit function if it exists
											if(typeof this.userArray[oi].deinit === "function")
											{
												this.userArray[oi].deinit();
											}
											this.updateIndex(this.userArray[oi].id, this.userArray[oi], "delete");
											this.userArray.splice(oi, 1);
										}
									}
									else
									{
										bError = true;
										errorMessage = "User is still active.";
									}
									break;
								//deactivate the game object (deactivate)
								case "deactivate":
									if(o.isActive)
									{
										var oi = this.activeUserArray.findIndex((x) => {return x.id == o.id;})
	
										if(oi >= 0)
										{
											//call deactivate function if it exists
											if(typeof o.deactivated === "function")
											{
												o.deactivated();
											}

											this.activeUserArray[oi].isActive = false;
											this.activeUserArray.splice(oi, 1);
											this.updateIndex(o.id, o, "deactivate");
										}
									}
									else 
									{
										bError = true;
										errorMessage = "User is already deactivated.";
									}
									break;
								
								//deactivate, then follow up transaction for delete
								case "deactivateDelete":
									if(o.isActive)
									{
										var oi = this.activeUserArray.findIndex((x) => {return x.id == o.id;})
	
										if(oi >= 0)
										{
											//call deactivate function if it exists
											if(typeof o.deactivated === "function")
											{
												o.deactivated();
											}

											this.activeUserArray[oi].isActive = false;
											this.activeUserArray.splice(oi, 1);
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
										errorMessage = "User is already activated.";
									}
	
									if(!bError)
									{
										this.activeUserArray.push(o);
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
							errorMessage = "User does not exist.";
						}
					}
					catch(ex) {
						bError = true;
						errorMessage = "Exception caught: " + ex + ". Stack: " + ex.stack;
					}

					if(bError)
					{
						console.log('User transaction error: ' + errorMessage + ". transaction Object: " + JSON.stringify(this.transactionQueue[i]));
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

	activateUserServerId(serverId) {
		if(this.serverIdClientIdMap[serverId] !== undefined)
		{
			this.activateUserId(this.serverIdClientIdMap[serverId]);
		}
	}

	activateUserId(id) {
		this.transactionQueue.push({
			"transaction": "activate",
			"id": id
		});
		this.isDirty = true;
	}

	deactivateUserServerId(serverId) {
		if(this.serverIdClientIdMap[serverId] !== undefined)
		{
			this.deactivateUserId(this.serverIdClientIdMap[serverId]);
		}
	}

	deactivateUserId(id) {
		this.transactionQueue.push({
			"transaction": "deactivate",
			"id": id
		});
		this.isDirty = true;
	}


	getUserByServerID(serverId) {
		if(this.serverIdClientIdMap[serverId] !== undefined)
		{
			return this.getUserByID(this.serverIdClientIdMap[serverId]);
		}
		else 
		{
			return null;
		}
	}

	getUserByID(id) {
		if(this.idIndex[id] !== undefined)
		{
			return this.idIndex[id];
		}
		else
		{
			return null;
		}
	}
	
	getActiveUsers() {
		return this.activeUserArray;
	}

	getUsers() {
		return this.userArray;
	}
}
