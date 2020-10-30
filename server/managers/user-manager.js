const {GlobalFuncs} = require('../global-funcs.js');
const crypto = require('crypto');

class UserManager {
	constructor() {
		this.gs = null;
		this.idCounter = 1;
		this.userArray = [];
		this.idIndex = {};
		this.tokenIndex = {};
		this.isDirty = false;
	}

	init(gameServer) {
		this.gs = gameServer;
	}

	createUser() {
		var user = {
			username: "",
			id: 0,
			token: ""
		}

		//16byte game session token
		var token = crypto.randomBytes(16).toString('hex');

		user.id = this.idCounter;
		user.token = token;
		user.username = "hello";

		this.idCounter++;
		this.userArray.push(user);
		this.isDirty = true;

		console.log('user created. Id: ' + user.id + '. token: ' + user.token);
		return user;
	}

	//this just marks the player for deletion
	destroyUser(user) {
		user.deleteMe = true;
		this.isDirty = true;
		console.log('user marked for deletion. Id: ' + user.id);
	}

	updateIndex() {
		//just rebuild the index for now
		this.idIndex = {};
		this.tokenIndex = {};

		for(var i = 0; i < this.userArray.length; i++)
		{
			if(this.userArray[i])
			{
				this.idIndex[this.userArray[i].id] = i;
				this.tokenIndex[this.userArray[i].token] = i;
			}
		}
	}

	update() {
		if(this.isDirty)
		{
			//delete any players that were marked for deletion
			for(var i = this.userArray.length-1; i >= 0; i--)
			{
				if(this.userArray[i].deleteMe)
				{
					var temp = this.userArray.splice(i, 1);
					console.log('user destroyed. Id: ' + temp[0].id);
				}
			}

			this.updateIndex();
			this.isDirty = false;
			console.log('user current length: ' + this.userArray.length);
		}
	}

	getUserByID(id) {
		if(this.idIndex[id] !== undefined)
		{
			return this.userArray[this.idIndex[id]];
		}
		else
		{
			return null;
		}
	}

	getUserByToken(token) {
		if(this.tokenIndex[token] !== undefined)
		{
			return this.userArray[this.tokenIndex[token]];
		}
		else
		{
			return null;
		}
	}

	
}

exports.UserManager = UserManager;