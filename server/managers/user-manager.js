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
	destroyUser(user) {
		user.deleteMe = true;
		this.isDirty = true;
		console.log('user marked for deletion. username: ' + user.username + ".    token: " + user.token);
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
			//delete any inactive players that were marked for deletion
			for(var i = this.userArray.length-1; i >= 0; i--)
			{
				if(this.userArray[i].deleteMe && !this.userArray[i].isActive)
				{
					var temp = this.userArray.splice(i, 1);
					
					console.log('inactive user deleted. username: ' + temp[0].username + ".    token: " + temp[0].token);
				}
			}

			this.updateIndex();
			this.isDirty = false;
			console.log('user array current length: ' + this.userArray.length);
			console.log('active user current length: ' + this.activeUserArray.length);
		}
	}

	activateUserId(id) {
		var bError = false;
		var u = this.getUserByID(id);
		
		if(u && !u.isActive && this.nextAvailableActiveId >= 0)
		{
			this.activeUserArray.push(u);

			u.activeId = this.nextAvailableActiveId;
			u.isActive = true;
			this.activeUserIdArray[u.activeId] = true;
			this.nextAvailableActiveId = this.globalfuncs.findNextAvailableId(this.activeUserIdArray, this.nextAvailableActiveId+1, this.maxActiveAllowed);

			this.isDirty = true;

			console.log('User has been activated. username: ' + u.username + '.   id: ' + u.id + ".   activeId: " + u.activeId);
		}
		else
		{
			bError = true; //not sure how it could get here
		}

		return bError;
	}

	deactivateUserId(id) {
		var bError = false;
		var u = this.getUserByID(id)
		var ui = this.activeUserArray.findIndex((x) => {return x.id == id;})

		if(u && u.isActive && ui >= 0)
		{
			var temp = this.activeUserArray.splice(ui, 1)[0];
			this.activeUserIdArray[temp.activeId] = false;

			if(this.nextAvailableActiveId < 0)
			{
				this.nextAvailableActiveId = temp.activeId;
			}

			this.isDirty = true;

			console.log('User has been inactivated. username: ' + temp.username + '.   id: ' + temp.id);

			//invalidate the id
			temp.activeId = null;
			temp.isActive = false;
		}
		else
		{
			bError = true; //not sure how it could get here
		}

		return bError;
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