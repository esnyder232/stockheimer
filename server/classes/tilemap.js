const {GlobalFuncs} = require('../global-funcs.js');

//This is basically a wrapper wrapper class for Tiled exports (json exports from the Tiled program by Thorbjørn Lindeijer)
class Tilemap {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = null;
		this.fullFilepath = "";
		this.rawData = null;
		this.jsonData = null;
	}

	init(gameServer, id, fullFilepath, rawData) {
		this.gs = gameServer;
		this.id = id;
		this.fullFilepath = fullFilepath;
		this.rawData = rawData;

		this.globalfuncs = new GlobalFuncs();

		this.jsonData = JSON.parse(rawData);



		var stopHere = true;
	}

	
}

exports.Tilemap = Tilemap;