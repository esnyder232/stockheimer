const {ResourceDefinitionBaseClass} = require("./resource-definition-base-class.js");

class CharacterClassResourceRedoDefinition extends ResourceDefinitionBaseClass {
	constructor() {
		super();
		this.resourceType = "character-class";
	}

	init(gameServer) {
		super.init(gameServer);
	}

	startLoadingResource(resource, cbComplete) {
		super.startLoadingResource(resource, cbComplete);
		this.gs.fm.loadFile(resource.key, this.cbCharacterClassFileComplete.bind(this, resource))
		resource.filesToLoad.push(resource.key);
	}

	checkIfResourceFinished(resource) {
		//if all files are loaded in, then change the status to "success" to signal the resource is done
		if(resource.filesToLoad.length === 0) {
			resource.status = "success";
			super.callCompleteCallbacks(resource);
		}
	}

	///////////////////////////////
	// Character Class file      //
	///////////////////////////////
	cbCharacterClassFileComplete(resource, file) {
		// console.log("=== cbCharacterClasFileComplete called ===");
		// console.log(resource);
		// console.log(file);

		var filesToLoadIndex = resource.filesToLoad.findIndex((x) => {return x === file.key});
		resource.filesToLoad.splice(filesToLoadIndex, 1);

		//if the file loaded successfully, copy the data to the resource and go through and load the other files
		if(file.status === "success") {
			resource.data = JSON.parse(JSON.stringify(file.data));

			//animation set keys
			for(var key in file.data.animationSets) {
				if (file.data.animationSets.hasOwnProperty(key)) {
					var val = file.data.animationSets[key];
					this.gs.fm.loadFile(val, this.cbAnimationSetFileComplete.bind(this, resource, key));
					resource.filesToLoad.push(val);
				}
			}

			//fire key
			if(file.data.fireStateKey !== undefined) {
				this.gs.fm.loadFile(file.data.fireStateKey, this.cbFireStateKeyFileComplete.bind(this, resource));
				resource.filesToLoad.push(file.data.fireStateKey);
			}

			//alt fire key
			if(file.data.altFireStateKey !== undefined) {
				this.gs.fm.loadFile(file.data.altFireStateKey, this.cbAltFireStateKeyFileComplete.bind(this, resource));
				resource.filesToLoad.push(file.data.altFireStateKey);
			}
		} else {
			resource.data = null;
			resource.data.status = "failed";
		}
		

		this.checkIfResourceFinished(resource);
	}

	///////////////////////////////
	// Animation Set file        //
	///////////////////////////////
	cbAnimationSetFileComplete(resource, key, file) {
		// console.log("=== cbAnimationSetFileComplete called ===");
		// console.log(resource);
		// console.log(key);
		// console.log(file);
		var filesToLoadIndex = resource.filesToLoad.findIndex((x) => {return x === file.key});
		if(filesToLoadIndex >= 0) {
			resource.filesToLoad.splice(filesToLoadIndex, 1);
		}

		if(file.status === "success") {
			resource.data.animationSets[key] = JSON.parse(JSON.stringify(file.data));
		} else {
			resource.data.animationSets[key] = null;
		}

		//done
		this.checkIfResourceFinished(resource);
	}

	///////////////////////////////
	// Fire State key file       //
	///////////////////////////////
	cbFireStateKeyFileComplete(resource, file) {
		// console.log("=== cbFireStateKeyFileComplete called ===");
		// console.log(resource);
		// console.log(file);
		
		var filesToLoadIndex = resource.filesToLoad.findIndex((x) => {return x === file.key});
		if(filesToLoadIndex >= 0) {
			resource.filesToLoad.splice(filesToLoadIndex, 1);
		}

		if(file.status === "success") {
			resource.data.fireStateKey = JSON.parse(JSON.stringify(file.data));
		} else {
			resource.data.fireStateKey = null;
		}

		//done for now
		this.checkIfResourceFinished(resource);
	}

	///////////////////////////////
	// Alt Fire State key file   //
	///////////////////////////////
	cbAltFireStateKeyFileComplete(resource, file) {
		// console.log("=== cbAltFireStateKeyFileComplete called ===");
		// console.log(resource);
		// console.log(file);
		
		var filesToLoadIndex = resource.filesToLoad.findIndex((x) => {return x === file.key});
		if(filesToLoadIndex >= 0) {
			resource.filesToLoad.splice(filesToLoadIndex, 1);
		}

		if(file.status === "success") {
			resource.data.altFireStateKey = JSON.parse(JSON.stringify(file.data));
		} else {
			resource.data.altFireStateKey = null;
		}

		//done for now
		this.checkIfResourceFinished(resource);
	}

}

exports.CharacterClassResourceRedoDefinition = CharacterClassResourceRedoDefinition;