const {GlobalFuncs} = require('../../global-funcs.js');

class TrackedEntityBaseState {
	constructor(trackedEntity) {
		this.trackedEntity = trackedEntity;
		this.globalfuncs = new GlobalFuncs();
	}

	enter(dt) {}
	update(dt) {}
	exit(dt) {}

	createUpdateEvent(dt) {return null};
}

exports.TrackedEntityBaseState = TrackedEntityBaseState;