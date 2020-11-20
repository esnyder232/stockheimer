const crypto = require('crypto');
const {GlobalFuncs} = require('../global-funcs.js');
const {User} = require('../user/user.js');

class UserManager {
	constructor() {
		this.gs = null;

		this.nextAvailableId = 0;
		this.userArray = [];
		this.userIdArray = [];
		
		this.maxAllowed = 32;

		this.tempUsers = [];
		this.idIndex = {};
		this.tokenIndex = {};
		this.isDirty = false;

		this.inactiveUserArray = []; //users who haven't connected in a while and are "inactive". They are moved from the userArray to the inactiveUserArray so their IDs can be freed up
		this.inactiveUserTokenIndex = {}; //index for the inactiveUserArray based on token

	}


	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();

		for(var i = 0; i < this.maxAllowed; i++)
		{
			this.userIdArray.push(false);
		}
	}

	//this creates an "inactive" user until the user officially opens the websocket connection
	createUser() {
		var u = new User();

		//16byte game session token
		var token = crypto.randomBytes(16).toString('hex');
		
		u.token = token;

		this.inactiveUserArray.push(u);

		this.inactiveUserTokenIndex[u.token] = u;
		this.isDirty = true;

		console.log('inactive user created. token: ' + u.token);

		return u;
	}



	//this just marks the inactive player for deletion
	//only destruction of INACTIVE users are allowed. Destroying an active user will most likely break the game.
	destroyInactiveUser(user) {
		user.deleteMe = true;
		this.isDirty = true;
		console.log('user marked for deletion. username: ' + user.username + ".    token: " + user.token);
	}

	updateIndex() {
		//just rebuild the index for now
		this.idIndex = {};
		this.tokenIndex = {};
		this.inactiveUserTokenIndex = {};

		for(var i = 0; i < this.userArray.length; i++)
		{
			if(this.userArray[i])
			{
				this.idIndex[this.userArray[i].id] = this.userArray[i];
				this.tokenIndex[this.userArray[i].token] = this.userArray[i];
			}
		}

		for(var i = 0; i < this.inactiveUserArray.length; i++)
		{
			if(this.inactiveUserArray[i])
			{
				this.inactiveUserTokenIndex[this.inactiveUserArray[i].token] = this.inactiveUserArray[i];
			}
		}
	}

	update() {
		if(this.isDirty)
		{
			//delete any inactive players that were marked for deletion
			for(var i = this.inactiveUserArray.length-1; i >= 0; i--)
			{
				if(this.inactiveUserArray[i].deleteMe)
				{
					var temp = this.inactiveUserArray.splice(i, 1);
					
					console.log('inactive user deleted. username: ' + temp[0].username + ".    token: " + temp[0].token);
				}
			}

			this.updateIndex();
			this.isDirty = false;
			console.log('user current length: ' + this.userArray.length);
			console.log('user inactive current length: ' + this.inactiveUserArray.length);
		}
	}

	activateUser(user) {
		var bError = false;
		var i = this.inactiveUserArray.findIndex((x) => {return x.token === user.token;});

		if(i >= 0 && this.nextAvailableId >= 0)
		{
			var temp = this.inactiveUserArray.splice(i, 1)[0];
			this.userArray.push(temp);

			temp.id = this.nextAvailableId;
			this.userIdArray[this.nextAvailableId] = true;
			this.nextAvailableId = this.globalfuncs.findNextAvailableId(this.userIdArray, this.nextAvailableId+1, this.maxAllowed);

			//update the indexes immediately so the game logic doesn't break
			this.idIndex[temp.id] = temp;
			this.tokenIndex[temp.token] = temp;
			delete this.inactiveUserTokenIndex[temp.token]; //first time i think i've ever used the delete operator in js

			this.isDirty = true;

			console.log('User has been activated. username: ' + temp.username + '.   id: ' + temp.id);
		}
		else
		{
			bError = true; //not sure how it could get here
		}

		return bError;
	}

	inactivateUser(user) {
		var bError = false;
		var i = this.userArray.findIndex((x) => {return x.id === user.id;});

		if(i >= 0)
		{
			var temp = this.userArray.splice(i, 1)[0];
			this.inactiveUserArray.push(temp);
			this.userIdArray[temp.id] = false;

			if(this.nextAvailableId < 0)
			{
				this.nextAvailableId = temp.id;
			}

			//update the indexes immediately so the game logic doesn't break
			delete this.idIndex[temp.id];
			delete this.tokenIndex[temp.token];
			this.inactiveUserTokenIndex[temp.token] = temp;

			this.isDirty = true;

			console.log('User has been inactivated. username: ' + temp.username + '.   id: ' + temp.id);

			//invalidate the id
			temp.id = null;
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

	getInactiveUserByToken(token) {
		if(this.inactiveUserTokenIndex[token])
		{
			return this.inactiveUserTokenIndex[token];
		}
		else
		{
			return null;
		}
	}

	//Just filter for now. I have a way to index this stuff if these become bottlenecks.
	getUsersByState(userState) {
		return this.userArray.filter((x) => {return x.stateName == userState;});
	}
	
	getUsersByStates(userStatesArr) {
		return this.userArray.filter((x) => {return userStatesArr.includes(x.stateName);});
	}

	//STOPPED HERE - for some reason this isn't working...
	getUsersByNotState(notUserState) {
		return this.userArray.filter((x) => {return x.stateName != notUserState;});
	}
}

exports.UserManager = UserManager;