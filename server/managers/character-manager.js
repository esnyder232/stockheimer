const {GlobalFuncs} = require('../global-funcs.js');
const {Character} = require('../characters/character.js');

class CharacterManager {
	constructor() {
		this.gs = null;
		
		this.idCounter = 0;
		this.characterArray = [];		
		this.idIndex = {};

		this.nextAvailableActiveId = 0;
		this.activeCharacterArray = [];
		this.activeCharacterIdArray = [];
		this.maxActiveAllowed = 256;
		
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

		c.id = this.idCounter;
		c.isActive = false;
		this.idCounter++;

		this.characterArray.push(c);
		
		this.idIndex[c.id] = c;
		this.isDirty = true;

		console.log('inactive character created. id: ' + c.id);

		return c;
	}

	
	//this just marks the inactive character for deletion
	destroyInactiveCharacter(character) {
		character.deleteMe = true;
		this.isDirty = true;
		console.log('character marked for deletion. id: ' + character.id);
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
			//delete any inactive players that were marked for deletion
			for(var i = this.characterArray.length-1; i >= 0; i--)
			{
				if(this.characterArray[i].deleteMe && !this.characterArray[i].isActive)
				{
					var temp = this.characterArray.splice(i, 1);
					
					console.log("inactive character deleted. id: " + temp[0].id);
				}
			}

			this.updateIndex();
			this.isDirty = false;
			console.log('character current length: ' + this.characterArray.length);
			console.log('active character current length: ' + this.activeCharacterArray.length);
		}
	}

	activateCharacterId(id) {
		var bError = false;
		var c = this.getCharacterByID(id)

		if(c && !c.isActive && this.nextAvailableActiveId >= 0)
		{
			this.activeCharacterArray.push(c);

			c.activeId = this.nextAvailableActiveId;
			c.isActive = true;
			this.activeCharacterIdArray[this.activeId] = true;
			this.nextAvailableActiveId = this.globalfuncs.findNextAvailableId(this.activeCharacterIdArray, this.nextAvailableActiveId+1, this.maxActiveAllowed);
			
			this.isDirty = true;

			console.log('Character has been activated. id: ' + c.id + "    activeId: " + c.activeId);
			console.log('active character current length: ' + this.activeCharacterArray.length);
		}
		else
		{
			bError = true; //not sure how it could get here
		}

		return bError;
	}

	deactivateCharacterId(id) {
		var bError = false;
		var c = this.getCharacterByID(id);
		var ci = this.activeCharacterArray.findIndex((x) => {return x.id == id;});

		if(c && c.isActive && ci >= 0)
		{
			var temp = this.activeCharacterArray.splice(ci, 1)[0];
			
			this.activeCharacterIdArray[temp.activeId] = false;
			if(this.nextAvailableActiveId < 0)
			{
				this.nextAvailableActiveId = temp.activeId;
			}

			this.isDirty = true;

			console.log('Character has been deactivated. id: ' + temp.id + "    activeId: " + temp.activeId);
			console.log('active character current length: ' + this.activeCharacterArray.length);

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