class TrackedEntityBaseState {
	constructor(trackedEntity) {
		this.trackedEntity = trackedEntity;
	}

	enter(dt) {}
	update(dt) {}
	exit(dt) {}

	createUpdateEvent(dt) {return null};
}

exports.TrackedEntityBaseState = TrackedEntityBaseState;