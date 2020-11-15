const {GlobalFuncs} = require('../global-funcs.js');
const {Character} = require('../characters/character.js');

class CharacterManager {
	constructor() {
		this.gs = null;
		this.idCounter = 1;
		this.characterArray = [];
		this.idIndex = {};
		this.isDirty = false;
	}

	init(gameServer) {
		this.gs = gameServer;
	}

	createCharacter() {
		var c = new Character();

		c.id = this.idCounter;

		this.idCounter++;
		this.characterArray.push(c);
		this.isDirty = true;

		console.log('Character created. Id: ' + c.id);
		return c;
	}

	destroyCharacter(c) {
		c.deleteMe = true;
		this.isDirty = true;
		console.log('Character marked for deletion. Id: ' + c.id);
	}

	updateIndex() {
		//just rebuild the index for now
		this.idIndex = {};
		for(var i = 0; i < this.characterArray.length; i++)
		{
			if(this.characterArray[i])
			{
				this.idIndex[this.characterArray[i].id] = this.characterArray[i];
			}
		}
	}

	update() {
		if(this.isDirty)
		{
			//delete any players that were marked for deletion
			for(var i = this.characterArray.length-1; i >= 0; i--)
			{
				if(this.characterArray[i].deleteMe)
				{
					var temp = this.characterArray.splice(i, 1);
					console.log('Character destroyed. Id: ' + temp[0].id);
				}
			}

			this.updateIndex();
			this.isDirty = false;
			console.log('Character current length: ' + this.characterArray.length);
		}
	}

	getCharacterByID(id) {
		if(this.idIndex[id])
		{
			return this.idIndex[id];
		}
		else
		{
			return null;
		}
	}
}

exports.CharacterManager = CharacterManager;