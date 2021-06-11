//base class for resource definitions. Not sure if there is going to be anything on here or not...but it atleast defines the interface.
class ResourceDefinitionBaseClass {
	constructor() {
		this.id = null;
		this.status = "";
		this.resourceType = "";

		this.errorList = [];
		
		this.gs = null;
		this.rm = null;
	}

	init(gameServer) {
		this.gs = gameServer;
		this.rm = this.gs.rm;
	}
}

exports.ResourceDefinitionBaseClass = ResourceDefinitionBaseClass;