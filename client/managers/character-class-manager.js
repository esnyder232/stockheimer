import GlobalFuncs from "../global-funcs.js";
import CharacterClass from "../classes/character-class.js";

export default class CharacterClassManager {
	constructor() {
		this.gc = null;
		this.idCounter = 1;
		this.characterClassArray = [];
		this.idIndex = {};
		this.keyIndex = {};
		this.serverIdClientIdMap = {};
	}

	init(gameClient) {
		this.gc = gameClient;
	}

	createCharacterClass(serverId) {
		var o = new CharacterClass();

		o.id = this.idCounter;
		this.idCounter++;
		this.characterClassArray.push(o);

		if(serverId !== undefined) {
			o.serverId = serverId;
			this.serverIdClientIdMap[serverId] = o.id;
		}

		this.updateIndex();
		
		return o;
	}

	//your only ever going to destroy them ALL anyway
	destroyAllCharacterClasses() {
		this.characterClassArray = [];
		this.idIndex = {};
		this.keyIndex = {};
		this.serverIdClientIdMap = {};
	}

	updateIndex(id, key, obj, transaction) {
		if(transaction == 'create') {
			this.idIndex[id] = obj;
			this.keyIndex[key] = obj;
		}
		else if(transaction == 'delete') {
			if(this.idIndex[id] !== undefined) {
				delete this.idIndex[id];
			}

			if(this.keyIndex[key] !== undefined) {
				delete this.keyIndex[key];
			}
			
			if(this.serverIdClientIdMap[obj.serverId] !== undefined) {
				delete this.serverIdClientIdMap[obj.serverId];
			}
		}
	}

	getCharacterClasses() {
		return this.characterClassArray;
	}

	getCharacterClassByID(id) {
		if(this.idIndex[id]) {
			return this.idIndex[id];
		}
		else {
			return null;
		}
	}

	getCharacterClassByKey(key) {
		if(this.keyIndex[key]) {
			return this.keyIndex[key];
		}
		else {
			return null;
		}
	}

	getCharacterClassByServerID(serverId) {
		if(this.serverIdClientIdMap[serverId] !== undefined) {
			return this.getCharacterClassByID(this.serverIdClientIdMap[serverId]);
		}
		else {
			return null;
		}
	}
}
