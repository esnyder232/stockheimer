const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');
const {Player} = require('../classes/player.js');


class PlayerManager {
	constructor() {
		this.gs = null;
		this.idCounter = 1;
		this.playerArray = [];
		this.idIndex = {};
		this.isDirty = false;
	}

	init(gameServer) {
		this.gs = gameServer;
	}

	createPlayer() {
		var p = new Player();
		p.id = this.idCounter;
		this.idCounter++;
		this.playerArray.push(p);

		this.isDirty = true;

		console.log('player created. Id: ' + p.id);
		return p;
	}

	//this just marks the player for deletion
	destroyPlayer(player) {
		player.deleteMe = true;
		this.isDirty = true;
		console.log('player marked for deletion. Id: ' + p.id);
	}

	updateIndex() {
		//just rebuild the index for now
		this.idIndex = {};
		for(var i = 0; i < this.playerArray.length; i++)
		{
			if(this.playerArray[i])
			{
				this.idIndex[this.playerArray[i].id] = i;
			}
		}
	}

	update() {
		if(this.isDirty)
		{
			//delete any players that were marked for deletion
			for(var i = this.playerArray.length-1; i >= 0; i--)
			{
				if(this.playerArray[i].deleteMe)
				{
					var temp = this.playerArray.splice(i, 1);
					console.log('player destroyed. Id: ' + temp[0].id);
				}
			}

			this.updateIndex();
			this.isDirty = false;
			console.log('playerArray current length: ' + this.playerArray.length);
		}
	}

	getPlayerByID(id) {
		if(this.idIndex[id] !== undefined)
		{
			return this.playerArray[this.idIndex[id]];
		}
		else
		{
			return null;
		}
	}

}



exports.PlayerManager = PlayerManager;