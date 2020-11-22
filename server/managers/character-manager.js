const {GlobalFuncs} = require('../global-funcs.js');
const {Character} = require('../characters/character.js');

class CharacterManager {
	constructor() {
		this.gs = null;
		
		this.idCounter = 0;
		this.characterArray = [];
		this.idIndex = {};

		this.nextAvailableActiveId = -1;
		this.activeCharacterArray = [];
		this.activeCharacterIdArray = [];
		this.maxActiveAllowed = 256;
		
		this.isDirty = false;
		this.transactionQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();

		for(var i = 0; i < this.maxActiveAllowed; i++)
		{
			this.activeCharacterIdArray.push(false);
		}

		this.nextAvailableActiveId = this.globalfuncs.findNextAvailableId(this.activeCharacterIdArray, this.nextAvailableActiveId+1, this.maxActiveAllowed);
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
	destroyCharacterId(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "delete",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
		})

		this.isDirty = true;

		//just for logging
		var character = this.getCharacterByID(id)
		if(character)
		{
			console.log('character marked for deletion. id: ' + character.id);
		}
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
			//process any transactions that occured this frame
			if(this.transactionQueue.length > 0)
			{
				for(var i = 0; i < this.transactionQueue.length; i++)
				{
					var bError = false;
					var errorMessage = "";

					var c = this.getCharacterByID(this.transactionQueue[i].id);
					if(c)
					{
						switch(this.transactionQueue[i].transaction)
						{
							//delete the inactive character
							case "delete":
								if(!c.isActive)
								{
									var ci = this.characterArray.findIndex((x) => {return x.id == c.id;});
									if(ci >= 0)
									{
										var temp = this.characterArray.splice(ci, 1);
										console.log("inactive character deleted. id: " + temp[0].id);
									}
								}
								else
								{
									bError = true;
									errorMessage = "Character is still active.";
								}
								break;
							//deactivate the active Character
							case "deactivate":
								if(c.isActive)
								{
									var ci = this.activeCharacterArray.findIndex((x) => {return x.id == c.id;})

									if(ci >= 0)
									{
										var temp = this.activeCharacterArray.splice(ci, 1)[0];
										this.activeCharacterIdArray[temp.activeId] = false;

										if(this.nextAvailableActiveId < 0)
										{
											this.nextAvailableActiveId = temp.activeId;
										}

										console.log('Character has been deactivated. id: ' + temp.id + "    activeId: " + temp.activeId);
										console.log('active character current length: ' + this.activeCharacterArray.length);

										//invalidate the id
										temp.activeId = null;
										temp.isActive = false;
									}
								}
								else 
								{
									bError = true;
									errorMessage = "Character is already deactivated.";
								}
								break;

							//activate the inactive Character
							case "activate":
								if(c.isActive)
								{
									bError = true;
									errorMessage = "Character is already activated.";
								}

								if(!bError && this.nextAvailableActiveId < 0)
								{
									bError = true;
									errorMessage = "Max allowed activated characters reached.";
								}

								if(!bError)
								{
									this.activeCharacterArray.push(c);

									c.activeId = this.nextAvailableActiveId;
									c.isActive = true;
									this.activeCharacterIdArray[c.activeId] = true;
									this.nextAvailableActiveId = this.globalfuncs.findNextAvailableId(this.activeCharacterIdArray, this.nextAvailableActiveId+1, this.maxActiveAllowed);

									console.log('Character has been activated. id: ' + c.id + "    activeId: " + c.activeId);
									console.log('active character current length: ' + this.activeCharacterArray.length);
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
						errorMessage = "Character does not exist.";
					}

					
					if(bError)
					{
						console.log('CharacterManager transaction error: ' + errorMessage + ". transaction Object: " + JSON.stringify(this.transactionQueue[i]));

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
			this.isDirty = false;
			console.log('character array current length: ' + this.characterArray.length);
			console.log('active character array current length: ' + this.activeCharacterArray.length);
		}
	}

	activateCharacterId(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "activate",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
		});
		this.isDirty = true;

		//just for logging
		var character = this.getCharacterByID(id)
		if(character)
		{
			console.log('character marked for activation. id: ' + character.id);
		}
	}

	deactivateCharacterId(id, cbSuccess, cbFail) {
		this.transactionQueue.push({
			"transaction": "deactivate",
			"id": id,
			"cbSuccess": cbSuccess,
			"cbFail": cbFail
		});
		this.isDirty = true;

		//just for logging
		var character = this.getCharacterByID(id)
		if(character)
		{
			console.log('character marked for deactifvation. id: ' + character.id);
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

	
	getActiveCharacters() {
		return this.activeCharacterArray;
	}
}

exports.CharacterManager = CharacterManager;