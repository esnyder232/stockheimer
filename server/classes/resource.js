//a wrapper class for reasources. Resources are built from combining file-resources into 1 resource in the resource-manager.
//These are selectively built (like character-classes and projectiles), and they are build from file-resources
class Resource {
	constructor() {
		this.id = null;
		this.status = "";
		this.key = "";
		this.data = null;
		this.resourceType = "";
		this.filesToLoad = []; //list of files to load for this resource
	}
}

exports.Resource = Resource;