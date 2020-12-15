const {TrackedEntityBaseState} = require('./tracked-entity-base-state.js');
const TrackedEntityDestroyedState = require('./tracked-entity-destroyed-state.js');

class TrackedEntityWaitDestroyAckState extends TrackedEntityBaseState {
	constructor(trackedEntity) {
		super(trackedEntity);
		this.stateName = "tracked-entity-wait-destroy-ack-state";
	}

	enter(dt) {
		//console.log(this.stateName + ' enter. UserId:' + this.trackedEntity.userId + ". EntType: " + this.trackedEntity.entType + ". EntID: " + this.trackedEntity.entId);
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
			if(event.eventName == "destroyTrackedEntityAck")
			{
				this.trackedEntity.nextState = new TrackedEntityDestroyedState.TrackedEntityDestroyedState(this.trackedEntity);
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

		//check if there exists any "create" events for the entity. If there isn't, insert a "permanentDestroy" event
		var permDelete = true;
		for(var i = 0; i < this.trackedEntity.eventQueue.length; i++)
		{
			if(this.trackedEntity.eventQueue[i].eventName === "createTrackedEntity")
			{
				permDelete = false;
			}
		}

		if(permDelete)
		{
			this.trackedEntity.user.permDeleteTrackedEntity(this.trackedEntity.entType, this.trackedEntity.entId);
		}
	}
}

exports.TrackedEntityWaitDestroyAckState = TrackedEntityWaitDestroyAckState;