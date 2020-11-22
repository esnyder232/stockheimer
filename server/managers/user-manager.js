const crypto = require('crypto');
const {GlobalFuncs} = require('../global-funcs.js');
const {User} = require('../user/user.js');

class UserManager {
	constructor() {
		this.gs = null;

		this.idCounter = 0;
		this.userArray = [];
		this.idIndex = {};
		this.tokenIndex = {};

		this.nextAvailableActiveId = 0;
		this.activeUserArray = [];
		this.activeUserIdArray = [];
		this.maxActiveAllowed = 32;
		
		this.isDirty = false;
		this.transactionQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();

		for(var i = 0; i < this.maxActiveAllowed; i++)
		{
			this.activeUserIdArray.push(false);
		}
	}

	//this creates an "inactive" user until the user officially opens the websocket connection
	createUser() {
		var u = new User();

		//16byte game session token
		var token = crypto.randomBytes(16).toString('hex');
		
		u.token = token;
		u.id = this.idCounter;
		u.isActive = false;

		this.idCounter++;
		this.userArray.push(u);

		this.idIndex[u.id] = u;
		this.tokenIndex[u.token] = u;
		this.isDirty = true;

		console.log('inactive user created. token: ' + u.token);

		return u;
	}

	//this just marks the inactive player for deletion
	//only destruction of INACTIVE users are allowed. Destroying an active user will most likely break the game.
	destroyUserId(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "delete",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
		})

		this.isDirty = true;

		//just for logging
		var user = this.getUserByID(id)
		if(user)
		{
			console.log('user marked for deletion. username: ' + user.username + ".    token: " + user.token);
		}
	}

	updateIndex() {
		//just rebuild the index for now
		this.idIndex = {};
		this.tokenIndex = {};

		for(var i = 0; i < this.userArray.length; i++)
		{
			if(this.userArray[i])
			{
				this.idIndex[this.userArray[i].id] = this.userArray[i];
				this.tokenIndex[this.userArray[i].token] = this.userArray[i];
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

					var u = this.getUserByID(this.transactionQueue[i].id);
					if(u)
					{
						switch(this.transactionQueue[i].transaction)
						{
							//delete the inactive user
							case "delete":
								if(!u.isActive)
								{
									var ui = this.userArray.findIndex((x) => {return x.id == u.id;});
									if(ui >= 0)
									{
										var temp = this.userArray.splice(ui, 1);
										console.log('inactive user deleted. username: ' + temp[0].username + ".    token: " + temp[0].token);
									}
								}
								else
								{
									bError = true;
									errorMessage = "User is still active.";
								}
								break;
	
							//deactivate the active user
							case "deactivate":
								if(u.isActive)
								{
									var ui = this.activeUserArray.findIndex((x) => {return x.id == u.id;})

									if(ui >= 0)
									{
										var temp = this.activeUserArray.splice(ui, 1)[0];
										this.activeUserIdArray[temp.activeId] = false;

										if(this.nextAvailableActiveId < 0)
										{
											this.nextAvailableActiveId = temp.activeId;
										}

										console.log('User has been inactivated. username: ' + temp.username + '.   id: ' + temp.id);

										//invalidate the id
										temp.activeId = null;
										temp.isActive = false;
									}
								}
								else 
								{
									bError = true;
									errorMessage = "User is already deactivated.";
								}
								break;
	
							//activate the inactive user
							case "activate":
								if(u.isActive)
								{
									bError = true;
									errorMessage = "User is already activated.";
								}

								if(!bError && this.nextAvailableActiveId < 0)
								{
									bError = true;
									errorMessage = "Max allowed activated users reached.";
								}

								if(!bError)
								{
									this.activeUserArray.push(u);

									u.activeId = this.nextAvailableActiveId;
									u.isActive = true;
									this.activeUserIdArray[u.activeId] = true;
									this.nextAvailableActiveId = this.globalfuncs.findNextAvailableId(this.activeUserIdArray, this.nextAvailableActiveId+1, this.maxActiveAllowed);

									console.log('User has been activated. username: ' + u.username + '.   id: ' + u.id + ".   activeId: " + u.activeId);
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
						errorMessage = "User does not exist.";
					}

					
					if(bError)
					{
						console.log('UserManager transaction error: ' + errorMessage + ". transaction Object: " + JSON.stringify(this.transactionQueue[i]));

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
			console.log('user array current length: ' + this.userArray.length);
			console.log('active user current length: ' + this.activeUserArray.length);
		}
	}

	//make a transaction object for the user
	activateUserId(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "activate",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
		});
		this.isDirty = true;

		//just for logging
		var user = this.getUserByID(id)
		if(user)
		{
			console.log('user marked for activation. username: ' + user.username + ".    token: " + user.token);
		}
		

		// var bError = false;
		// var u = this.getUserByID(id);
		
		// if(u && !u.isActive && this.nextAvailableActiveId >= 0)
		// {
		// 	this.activeUserArray.push(u);

		// 	u.activeId = this.nextAvailableActiveId;
		// 	u.isActive = true;
		// 	this.activeUserIdArray[u.activeId] = true;
		// 	this.nextAvailableActiveId = this.globalfuncs.findNextAvailableId(this.activeUserIdArray, this.nextAvailableActiveId+1, this.maxActiveAllowed);

		// 	this.isDirty = true;

		// 	console.log('User has been activated. username: ' + u.username + '.   id: ' + u.id + ".   activeId: " + u.activeId);
		// }
		// else
		// {
		// 	bError = true; //not sure how it could get here
		// }

		// return bError;
	}

	deactivateUserId(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "deactivate",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
		});
		this.isDirty = true;

		//just for logging
		var user = this.getUserByID(id)
		if(user)
		{
			console.log('user marked for deactifvation. username: ' + user.username + ".    token: " + user.token);
		}
		// var bError = false;
		// var u = this.getUserByID(id)
		// var ui = this.activeUserArray.findIndex((x) => {return x.id == id;})

		// if(u && u.isActive && ui >= 0)
		// {
		// 	var temp = this.activeUserArray.splice(ui, 1)[0];
		// 	this.activeUserIdArray[temp.activeId] = false;

		// 	if(this.nextAvailableActiveId < 0)
		// 	{
		// 		this.nextAvailableActiveId = temp.activeId;
		// 	}

		// 	this.isDirty = true;

		// 	console.log('User has been inactivated. username: ' + temp.username + '.   id: ' + temp.id);

		// 	//invalidate the id
		// 	temp.activeId = null;
		// 	temp.isActive = false;
		// }
		// else
		// {
		// 	bError = true; //not sure how it could get here
		// }

		// return bError;
	}


	getUserByID(id) {
		if(this.idIndex[id])
		{
			return this.idIndex[id];
		}
		else
		{
			return null;
		}
	}

	getUserByToken(token) {
		if(this.tokenIndex[token])
		{
			return this.tokenIndex[token];
		}
		else
		{
			return null;
		}
	}

	//Just filter for now. I have a way to index this stuff if these become bottlenecks.
	getUsersByState(userState) {
		return this.activeUserArray.filter((x) => {return x.stateName == userState;});
	}
	
	getUsersByStates(userStatesArr) {
		return this.activeUserArray.filter((x) => {return userStatesArr.includes(x.stateName);});
	}

	getActiveUsers() {
		return this.activeUserArray;
	}
}

exports.UserManager = UserManager;