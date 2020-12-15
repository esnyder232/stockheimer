const {TrackedEntityBaseState} = require('./tracked-entity-base-state.js');
const {TrackedEntityCreatedState} = require('./tracked-entity-created-state.js');

class TrackedEntityWaitCreateAckState extends TrackedEntityBaseState {
	constructor(trackedEntity) {
		super(trackedEntity);
		this.stateName = "tracked-entity-wait-create-ack-state";
	}

	enter(dt) {
		super.enter(dt);
		this.trackedEntity.stateName = this.stateName;
	}

	update(dt) {
		super.update(dt);

		//wait for the ack from the client (the ack will create an event in the eventQueue)
		var processedIndexes = [];
		for(var i = 0; i < this.trackedEntity.eventQueue.length; i++)
		{
			var event = this.trackedEntity.eventQueue[i];
			if(event.eventName == "createTrackedEntityAck")
			{
				this.trackedEntity.nextState = new TrackedEntityCreatedState(this.trackedEntity);
				processedIndexes.push(i);
			}
		}

		//splice out any processed events
		for(var i = processedIndexes.length - 1; i >= 0; i--)
		{
			this.trackedEntity.eventQueue.splice(processedIndexes[i], 1);
		}
	}

	exit(dt) {
		super.exit(dt);
	}
}

exports.TrackedEntityWaitCreateAckState = TrackedEntityWaitCreateAckState;