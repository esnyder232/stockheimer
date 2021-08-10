class TrackedEntityBaseState {
	constructor(trackedEntity) {
		this.trackedEntity = trackedEntity;
	}

	enter(dt) {}
	update(dt) {}
	exit(dt) {}
}

exports.TrackedEntityBaseState = TrackedEntityBaseState;