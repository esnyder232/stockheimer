//a wrapper class around the data from a file being loaded by the file-manager.
class FileWrapper {
	constructor() {
		this.id = null;
		this.status = "";
		this.key = "";
		this.fullFilePath = "";
		this.data = null;
		this.errorMsg = "";
	}
}

exports.FileWrapper = FileWrapper;