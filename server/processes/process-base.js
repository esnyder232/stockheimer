const logger = require('../../logger.js');

class ProcessBase {
	constructor(gs, timeLength) {
		this.gs = gs;
		this.timeLength = timeLength;
		this.timeAcc = 0;
		this.id = null;
		this.type = "";
	}
	
	start(dt) {
		
	}

	update(dt) {
		this.timeAcc += dt;
	}

	done(dt) {
	}
}



exports.ProcessBase = ProcessBase;
