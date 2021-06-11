//a wrapper class around the data from a file being loaded by the resource-manager.
class FileWrapper {
	constructor() {
		this.id = null;
		this.status = "";
		this.key = "";
		this.fullFilePath = "";
		this.data = null;
	}
}

exports.FileWrapper = FileWrapper;