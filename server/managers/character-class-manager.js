const {GlobalFuncs} = require('../global-funcs.js');
const {CharacterClass} = require('../classes/character-class.js');
const logger = require('../../logger.js');

class CharacterClassManager {
	constructor() {
		this.gs = null;
		
		this.idCounter = 0;
		this.characterClassArray = [];
		this.idIndex = {};

		this.isDirty = false;
		this.transactionQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
	}

	createCharacterClass() {
		var o = new CharacterClass();

		o.id = this.idCounter++;
		this.characterClassArray.push(o);

		this.updateIndex(o.id, o, "create");
		return o;
	}
	
	//never gonna call this anyway so....don't know why its here
	destroyCharacterClass(id) {
		var oi = this.characterClassArray.findIndex((x) => {return x.id === id;});
		if(oi >= 0) {
			this.characterClassArray.splice(oi, 1);
			this.updateIndex(o.id, null, "delete");
		}
	}

	updateIndex(id, obj, transaction) {
		if(transaction == 'create') {
			this.idIndex[id] = obj;
		}
		else if(transaction == 'delete') {
			if(this.idIndex[id] !== undefined) {
				delete this.idIndex[id];
			}
		}
	}

	getCharacterClassByID(id) {
		if(this.idIndex[id]) {
			return this.idIndex[id];
		}
		else {
			return null;
		}
	}

	getCharacterClasses() {
		return this.characterClassArray;
	}
}

exports.CharacterClassManager = CharacterClassManager;