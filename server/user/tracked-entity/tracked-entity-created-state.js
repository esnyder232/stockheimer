const {TrackedEntityBaseState} = require('./tracked-entity-base-state.js');
const {TrackedEntityDestroyingState} = require('./tracked-entity-destroying-state.js');

class TrackedEntityCreatedState extends TrackedEntityBaseState {
	constructor(trackedEntity) {
		super(trackedEntity);
		this.stateName = "tracked-entity-created-state";
	}

	enter(dt) {
		console.log(this.stateName + ' enter. UserId:' + this.trackedEntity.userId + ". EntType: " + this.trackedEntity.entType + ". EntID: " + this.trackedEntity.entId);
		super.enter(dt);
		this.trackedEntity.stateName = this.stateName;
		this.trackedEntity.trackedEntityCreated();
	}

	update(dt) {
		super.update(dt);
		var processedIndexes = [];

		//process any events from the event queue
		for(var i = 0; i < this.trackedEntity.eventQueue.length; i++)
		{
			var event = this.trackedEntity.eventQueue[i];

			//process normal events for this entity
			if(event.eventName != "deleteTrackedEntity")
			{
				//check if the websocket handler can fit the event
				var info = this.trackedEntity.user.wsh.canEventFit(event);

				//check if the size can vary, and the size is big. If it is, we will start fragmentation. Also only do this if its NOT a fragment already
				if(!info.isFragment && info.b_size_varies && info.bytesRequired >= this.trackedEntity.user.fragmentationLimit)
				{
					this.trackedEntity.user.insertFragmentEvent(event, info);

					processedIndexes.push(i); //just push it in this queue so it gets spliced off at the end
				}
				//insert the event
				else if(info.canEventFit)
				{
					this.trackedEntity.user.wsh.insertEvent(event);
					processedIndexes.push(i);
				}
				else
				{
					//do nothing. The event could not fit the packet. Maybe next frame.
				}
			}
			//the special event "deleted" means this entity no longer needs to be tracked
			else if(event.eventName == "deleteTrackedEntity")
			{
				this.trackedEntity.nextState = new TrackedEntityDestroyingState(this.trackedEntity);
				processedIndexes.push(i);
			}
		}

		//splice out any processed events
		for(var i = processedIndexes.length - 1; i >= 0; i--)
		{
			this.trackedEntity.eventQueue.splice(processedIndexes[i], 1);
		}

		//check for "awake" status
		if(this.trackedEntity.entType == "gameobject")
		{
			this.trackedEntity.isAwake = this.trackedEntity.ent.isAwake();
		}
	}

	createUpdateEvent(dt) {
		var eventData = null;
		
		//construct eventData here
		if(this.trackedEntity.entType == "gameobject")
		{
			switch(this.trackedEntity.ent.type)
			{
				case "character":
					eventData = this.trackedEntity.ent.serializeActiveCharacterUpdateEvent();
					break;
				case "projectile":
					eventData = this.trackedEntity.ent.serializeProjectileUpdateEvent();
					break;
			}
	
			if(eventData !== null)
			{
				//check if the websocket handler can fit the event
				var info = this.trackedEntity.user.wsh.canEventFit(eventData);
	
				//insert the event, and reset the priority accumulator
				if(info.canEventFit)
				{
					this.trackedEntity.user.wsh.insertEvent(eventData);
					this.trackedEntity.pa = 0.0;
				}
				else
				{
					//do nothing
					//continue with the tracked objects to see if any others will fit
				}
			}
		}
	}


	exit(dt) {
		console.log(this.stateName + ' exit. UserId:' + this.trackedEntity.userId + ". EntType: " + this.trackedEntity.entType + ". EntID: " + this.trackedEntity.entId);
		super.exit(dt);
	}
}

exports.TrackedEntityCreatedState = TrackedEntityCreatedState;