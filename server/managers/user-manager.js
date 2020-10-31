const crypto = require('crypto');
const {GlobalFuncs} = require('../global-funcs.js');
const {User} = require('../user/user.js');

class UserManager {
	constructor() {
		this.gs = null;
		this.idCounter = 1;
		this.userArray = [];
		this.idIndex = {};
		this.tokenIndex = {};
		this.isDirty = false;
		this.tempUsers = [];
	}

	init(gameServer) {
		this.gs = gameServer;
	}

	//this creates the user and adds it to the array.
	//A "temp" user is a brand new user who hasn't established the websocket connection yet to initialize it.
	//A temp user is only alive for a few seconds, then gets deleted when the userManager updates.
	//A temp user becomes permanent after the user establishes the websocket connection. The code will call "UserManager.userVerified()" to make this happen.
	//The whole point of a "temp" user is to prevent the UserManager from being flooded by users. Just in case someone finds the "join-request" api and decides to spam it. This just helps mitigate the memory damage a bit.
	createUser(bTemp) {
		var user = new User();

		//16byte game session token
		var token = crypto.randomBytes(16).toString('hex');

		user.id = this.idCounter;
		user.token = token;

		this.idCounter++;
		this.userArray.push(user);
		this.isDirty = true;

		//adding user directly to the index. This should probably be handled only by the update function so its tied to the game loop, but this is just so the user can establish a connection without depending on the gameloop.
		this.idIndex[user.id] = user;
		this.tokenIndex[user.token] = user;

		//add the user to the temp list.
		if(bTemp)
		{
			this.tempUsers.push({
				user: user,
				tsCreated: Date.now(),
				msLifetime: 2000
			})
		}

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
				this.idIndex[this.userArray[i].id] = this.userArray[i];
				this.tokenIndex[this.userArray[i].token] = this.userArray[i];
			}
		}
	}

	update() {
		if(this.tempUsers.length > 0)
		{
			//update tempUsers and see if any of them need to be deleted
			var now = Date.now();			
			for(var i = this.tempUsers.length-1; i >= 0; i--)
			{
				if(now - this.tempUsers[i].tsCreated >= this.tempUsers[i].msLifetime)
				{
					this.destroyUser(this.tempUsers[i].user);
					this.tempUsers.splice(i, 1);
				}
			}
		}

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

	userVerified(user) {
		var tempUserIndex = this.tempUsers.findIndex((x) => {return x.user === user;});
		if(tempUserIndex >= 0)
		{
			var msToVerify = Date.now() - this.tempUsers[tempUserIndex].tsCreated;
			this.tempUsers.splice(this.tempUserIndex, 1);
			console.log('UserManager: user id ' + user.id + ' verified (' + msToVerify + 'ms). Removed from temp user list.');
		}
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

	//Just filter for now. I have a backup if this becomes the bottleneck.
	getUsersByState(userState) {
		return this.userArray.filter((x) => {return x.state == userState;});
	}
	
}

exports.UserManager = UserManager;