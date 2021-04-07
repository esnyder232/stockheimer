const logger = require('../../logger.js');
const {ProcessBase} = require("./process-base.js")

class RespawnProcess extends ProcessBase {
	constructor(gs, timeLength) {
		super(gs, timeLength)
		this.user = null;
	}
	
	start(dt) {

	}

	done(dt) {
		//enable the ability again here

	}
}


exports.RespawnProcess = RespawnProcess;
