const {GlobalFuncs} = require('../global-funcs.js');
const {Character} = require('../characters/character.js');

class CharacterManager {
	constructor() {
		this.gs = null;
		this.nextAvailableActiveId = 0;
		this.characterArray = [];
		this.activeCharacterArray = [];
		this.activeCharacterIdArray = [];

		this.staticIdCounter = 0;
		this.maxActiveAllowed = 256;

		this.staticIdIndex = {};
		this.isDirty = false;
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();

		for(var i = 0; i < this.maxActiveAllowed; i++)
		{
			this.activeCharacterIdArray.push(false);
		}
	}

	//this creates an "inactive" character
	createCharacter() {
		var c = new Character();

		c.staticId = this.staticIdCounter;
		c.isActive = false;
		this.staticIdCounter++;

		this.characterArray.push(c);
		
		this.staticIdIndex[c.staticId] = c;
		this.isDirty = true;

		console.log('inactive character created. staticId: ' + c.staticId);

		return c;
	}

	
	//this just marks the inactive character for deletion
	destroyInactiveCharacter(character) {
		character.deleteMe = true;
		this.isDirty = true;
		console.log('character marked for deletion. staticId: ' + character.staticId);
	}

	updateIndex() {
		//just rebuild the index for now
		this.staticIdIndex = {};

		for(var i = 0; i < this.characterArray.length; i++)
		{
			if(this.characterArray[i])
			{
				this.staticIdIndex[this.characterArray[i].staticId] = this.characterArray[i];
			}
		}
	}

	update() {
		if(this.isDirty)
		{
			//delete any inactive players that were marked for deletion
			for(var i = this.characterArray.length-1; i >= 0; i--)
			{
				if(this.characterArray[i].deleteMe && !this.characterArray[i].isActive)
				{
					var temp = this.characterArray.splice(i, 1);
					
					console.log("inactive character deleted. staticId: " + temp[0].staticId);
				}
			}

			this.updateIndex();
			this.isDirty = false;
			console.log('character current length: ' + this.characterArray.length);
			console.log('active character current length: ' + this.activeCharacterArray.length);
		}
	}

	activateCharacterStaticId(staticId) {
		var bError = false;
		var c = this.getCharacterByStaticID(staticId)

		if(c && !c.isActive && this.nextAvailableActiveId >= 0)
		{
			this.activeCharacterArray.push(c);

			c.id = this.nextAvailableActiveId;
			c.isActive = true;
			this.activeCharacterIdArray[this.nextAvailableActiveId] = true;
			this.nextAvailableActiveId = this.globalfuncs.findNextAvailableId(this.activeCharacterIdArray, this.nextAvailableActiveId+1, this.maxActiveAllowed);
			
			this.isDirty = true;

			console.log('Character has been activated. staticId: ' + c.staticId + "    id: " + c.id);
			console.log('active character current length: ' + this.activeCharacterArray.length);
		}
		else
		{
			bError = true; //not sure how it could get here
		}

		return bError;
	}

	deactivateCharacterStaticId(staticId) {
		var bError = false;
		var c = this.getCharacterByStaticID(staticId)
		var ci = this.activeCharacterArray.findIndex((x) => {return x.staticId == staticId;})

		if(c && c.isActive && ci >= 0)
		{
			var temp = this.activeCharacterArray.splice(ci, 1)[0];
			temp.isActive = false;

			this.activeCharacterIdArray[temp.id] = false;
			if(this.nextAvailableActiveId < 0)
			{
				this.nextAvailableActiveId = temp.id;
			}

			this.isDirty = true;

			console.log('Character has been deactivated. staticId: ' + temp.staticId + "    id: " + temp.id);
			console.log('active character current length: ' + this.activeCharacterArray.length);

			//invalidate the id
			temp.id = null;
		}
		else
		{
			bError = true; //not sure how it could get here
		}

		return bError;
	}


	getCharacterByStaticID(staticId) {
		if(this.staticIdIndex[staticId])
		{
			return this.staticIdIndex[staticId];
		}
		else
		{
			return null;
		}
	}
}

exports.CharacterManager = CharacterManager;