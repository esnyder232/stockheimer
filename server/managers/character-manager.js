const {GlobalFuncs} = require('../global-funcs.js');
const {Character} = require('../characters/character.js');

class CharacterManager {
	constructor() {
		this.gs = null;
		this.nextAvailableId = 0;
		this.characterArray = [];
		this.characterIdArray = [];
		
		this.maxAllowed = 256;

		this.idIndex = {};
		this.isDirty = false;
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();

		for(var i = 0; i < this.maxAllowed; i++)
		{
			this.characterIdArray.push(false);
		}
	}

	createCharacter() {
		var result = null;

		if(this.nextAvailableId >= 0)
		{
			result = new Character();

			result.id = this.nextAvailableId;

			this.characterIdArray[this.nextAvailableId] = true;
			this.characterArray.push(result);

			this.globalfuncs.findNextAvailableId(this.nextAvailableId+1);

			this.isDirty = true;
			console.log('Character created. Id: ' + result.id);
		}

		return result;
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
					this.characterIdArray[temp[0].id] = false;
					if(this.nextAvailableId < 0)
					{
						this.nextAvailableId = temp[0].id;
					}

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