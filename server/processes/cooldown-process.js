const logger = require('../../logger.js');
const {ProcessBase} = require("./process-base.js")

class CooldownProcess extends ProcessBase {
	constructor(gs, timeLength) {
		super(gs, timeLength)
		this.user = null;
	}
	
	start(dt) {
		
	}

	done(dt) {
		//this.user.globalfuncs.spawnCharacterForUser(this.user.gs, this.user);

	}
}

exports.CooldownProcess = CooldownProcess;