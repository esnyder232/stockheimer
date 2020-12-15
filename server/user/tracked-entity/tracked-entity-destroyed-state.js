const {TrackedEntityBaseState} = require('./tracked-entity-base-state.js');
const {TrackedEntityCreatingState} = require('./tracked-entity-creating-state.js');

class TrackedEntityDestroyedState extends TrackedEntityBaseState {
	constructor(trackedEntity) {
		super(trackedEntity);
		this.stateName = "tracked-entity-destroyed-state";
	}

	enter(dt) {
		//console.log(this.stateName + ' enter. UserId:' + this.trackedEntity.userId + ". EntType: " + this.trackedEntity.entType + ". EntID: " + this.trackedEntity.entId);
		super.enter(dt);
		this.trackedEntity.stateName = this.stateName;
		this.trackedEntity.trackedEntityDestroyed();
	}

	update(dt) {
		super.update(dt);

		//process the eventQueue
		var processedIndexes = [];
		for(var i = 0; i < this.trackedEntity.eventQueue.length; i++)
		{
			var event = this.trackedEntity.eventQueue[i];
			if(event.eventName == "createTrackedEntity")
			{
				this.trackedEntity.nextState = new TrackedEntityCreatingState(this.trackedEntity);
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
		//console.log(this.stateName + ' exit. UserId:' + this.trackedEntity.userId + ". EntType: " + this.trackedEntity.entType + ". EntID: " + this.trackedEntity.entId);
		super.exit(dt);
	}
}

exports.TrackedEntityDestroyedState = TrackedEntityDestroyedState;