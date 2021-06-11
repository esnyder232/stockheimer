const {ResourceDefinitionBaseClass} = require("./resource-definition-base-class.js");

class CharacterClassResourceDefinition extends ResourceDefinitionBaseClass {
	constructor() {
		super();
		this.resourceType = "character-class";
	}

	init(gameServer) {
		super.init(gameServer);
	}

	

}

exports.CharacterClassResourceDefinition = CharacterClassResourceDefinition;