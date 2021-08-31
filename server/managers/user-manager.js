const crypto = require('crypto');
const GlobalFuncs = require('../global-funcs.js');
const {User} = require('../user/user.js');
const serverConfig = require('../server-config.json');
const logger = require('../../logger.js');

class UserManager {
	constructor() {
		this.gs = null;

		this.idCounter = 0;
		this.userArray = [];
		this.idIndex = {};
		this.tokenIndex = {};

		this.nextAvailableActiveId = -1;
		this.activeUserArray = [];
		this.activeUserIdArray = [];
		this.maxActiveAllowed = serverConfig.max_players;

		this.playingUserArray = [];
		
		this.isDirty = false;
		this.transactionQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs.GlobalFuncs();

		for(var i = 0; i < this.maxActiveAllowed; i++)
		{
			this.activeUserIdArray.push(false);
		}

		this.nextAvailableActiveId = this.globalfuncs.findNextAvailableId(this.activeUserIdArray, this.nextAvailableActiveId+1, this.maxActiveAllowed);
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
			//temp array for follow up transactions to be processed on the next frame (usually for userDeinit)
			var followUpTransactions = [];

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
									}

									//check if they were playing as well (they absolutely shouldn't be, but check anyway)
									var playingIndex = this.playingUserArray.findIndex((x) => {return x.id === this.transactionQueue[i].id});

									if(playingIndex >= 0)
									{
										this.playingUserArray.splice(playingIndex, 1);
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
										//call deactivate function if it exists
										if(typeof this.activeUserArray[ui].deactivated === "function")
										{
											this.activeUserArray[ui].deactivated();
										}

										var temp = this.activeUserArray.splice(ui, 1)[0];
										this.activeUserIdArray[temp.activeId] = false;

										if(this.nextAvailableActiveId < 0)
										{
											this.nextAvailableActiveId = temp.activeId;
										}

										//invalidate the id
										temp.activeId = null;
										temp.isActive = false;

										//follup transaction
										followUpTransactions.push({
											"transaction": "userDeinit",
											"id": u.id
										});
									}

									//check if they were playing as well (they shouldn't be, but check anyway)
									var playingIndex = this.playingUserArray.findIndex((x) => {return x.id === this.transactionQueue[i].id});

									if(playingIndex >= 0)
									{
										this.playingUserArray.splice(playingIndex, 1);
									}

								}
								else 
								{
									bError = true;
									errorMessage = "User is already deactivated.";
								}
								break;


							//deinit the inactive user
							case "userDeinit":
								if(u.isActive)
								{
									bError = true;
									errorMessage = "Error in deinit transation. User is still activated.";
								}

								if(!bError)
								{
									//call activate function if it exists
									if(typeof u.userDeinit === "function")
									{
										u.userDeinit();
									}
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

									//call activate function if it exists
									if(typeof u.activated === "function")
									{
										u.activated();
									}
								}
								break;

							case "startPlaying":
								//check to see if he's already added
								var playingIndex = this.playingUserArray.findIndex((x) => {return x.id === this.transactionQueue[i].id});

								if(playingIndex >= 0)
								{
									bError = true;
									errorMessage = "User is already playing.";
								}

								if(!bError)
								{
									this.playingUserArray.push(u);

									logger.log("info", 'User has started playing. username: ' + u.username + '.   id: ' + u.id + ".   activeId: " + u.activeId);
								}
								break;
							case "stopPlaying":
								//check to see if he's already added
								var playingIndex = this.playingUserArray.findIndex((x) => {return x.id === this.transactionQueue[i].id});

								if(playingIndex < 0)
								{
									bError = true;
									errorMessage = "User was not playing.";
								}

								if(!bError)
								{
									this.playingUserArray.splice(playingIndex, 1);

									logger.log("info", 'User has stopped playing. username: ' + u.username + '.   id: ' + u.id + ".   activeId: " + u.activeId);
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
						logger.log("info", 'UserManager transaction error: ' + errorMessage + ". transaction Object: " + JSON.stringify(this.transactionQueue[i]));

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

	//make a transaction object for the user
	activateUserId(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "activate",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
		});
		this.isDirty = true;
	}

	deactivateUserId(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "deactivate",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
		});
		this.isDirty = true;
	}

	//marks the user as starting to play
	userStartPlayingId(id, cbSuccess, cbFail)
	{
		this.transactionQueue.push({
			"transaction": "startPlaying",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
		});
		this.isDirty = true;
	}

	//marks the user as stopping to play
	userStopPlayingId(id, cbSuccess, cbFail)
	{
		this.transactionQueue.push({
			"transaction": "stopPlaying",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
		});
		this.isDirty = true;
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

	getActiveUsers() {
		return this.activeUserArray;
	}

	getPlayingUsers() {
		return this.playingUserArray;
	}

	getUsers() {
		return this.userArray;
	}
	
	//gets summary of active users (mainly used for rebalancing ai on teams)
	getActiveUsersSummary() {
		var summary = {
			totalUsers: 0,
			totalHumans: 0,
			totalAis: 0,
			teams: []

		};
		var teams = this.gs.tm.getTeams();
		var tempTeamIndex = {};

		for(var i = 0; i < teams.length; i++) {
			var obj = {
				teamId: teams[i].id,
				isSpectatorTeam: teams[i].isSpectatorTeam,
				humanUserIds: [],
				aiUserIds : [],
				totalUsers: 0
			}
			summary.teams.push(obj);

			tempTeamIndex[teams[i].id] = obj;
		}

		for(var i = 0; i < this.activeUserArray.length; i++) {
			summary.totalUsers++;
			if(this.activeUserArray[i].userType === "user") {
				summary.totalHumans++;
			}
			else if (this.activeUserArray[i].userType === "ai") {
				summary.totalAis++;
			}

			if(tempTeamIndex[this.activeUserArray[i].teamId] !== undefined) {
				if(this.activeUserArray[i].userType === "user") {
					tempTeamIndex[this.activeUserArray[i].teamId].humanUserIds.push(this.activeUserArray[i].id);
					tempTeamIndex[this.activeUserArray[i].teamId].totalUsers++;
				}
				else if (this.activeUserArray[i].userType === "ai") {
					tempTeamIndex[this.activeUserArray[i].teamId].aiUserIds.push(this.activeUserArray[i].id);
					tempTeamIndex[this.activeUserArray[i].teamId].totalUsers++;
				}
			}
		}

		return summary;
	}

	getUserAliveSummary() {
		var activeUsers = this.gs.um.getActiveUsers();
		var teams = this.gs.tm.getTeams();
		var userAliveSumamry = {
			teamArray: [],
			teamIndex: {}
		};

		var spectatorTeam = this.gs.tm.getSpectatorTeam();
		
		//initlize team summary 
		for(var i = 0; i < teams.length; i++) {
			if(teams[i].id !== spectatorTeam.id) {
				var teamObj = {
					teamId: teams[i].id,
					usersAlive: 0,
					hpCurSum: 0,
					hpMaxSum: 0,
					hpAverage: 0
				};
				userAliveSumamry.teamArray.push(teamObj);
				userAliveSumamry.teamIndex[teams[i].id] = teamObj;
			}
		}

		//count all users that are alive (essentially active characters)
		for(var i = 0; i < activeUsers.length; i++) {
			if(activeUsers[i].teamId !== null && activeUsers[i].teamId !== spectatorTeam.id) {
				var c = this.gs.gom.getActiveGameObjectID(activeUsers[i].characterId);

				if(c !== null) {
					userAliveSumamry.teamIndex[c.teamId].usersAlive += 1;
					userAliveSumamry.teamIndex[c.teamId].hpCurSum += c.hpCur;
					userAliveSumamry.teamIndex[c.teamId].hpMaxSum += c.hpMax;
				}
			}
		}

		//calculate average of hp
		for(var i = 0; i < userAliveSumamry.teamArray.length; i++) {
			if(userAliveSumamry.teamArray[i].hpMaxSum > 0) {
				userAliveSumamry.teamArray[i].hpAverage = userAliveSumamry.teamArray[i].hpCurSum / userAliveSumamry.teamArray[i].hpMaxSum;
			}
		}

		return userAliveSumamry;
	}

}

exports.UserManager = UserManager;