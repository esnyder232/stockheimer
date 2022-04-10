const {TrackedEntityBaseState} = require('./tracked-entity-base-state.js');
const {TrackedEntityDestroyingState} = require('./tracked-entity-destroying-state.js');

class TrackedEntityCreatedState extends TrackedEntityBaseState {
	constructor(trackedEntity) {
		super(trackedEntity);
		this.stateName = "tracked-entity-created-state";
	}

	enter(dt) {
		super.enter(dt);
		this.trackedEntity.stateName = this.stateName;
		
		//check if this entity should be unregistered from the update list
		this.checkAlwaysRegister();
	}

	update(dt) {
		super.update(dt);
		var orderedProcessedIndexes = [];
		var processedIndexes = [];

		//FIRST - process any ordered events from the event queue
		//4/1/2021 - Note: ordered events are NOT going to be fragmentable at this time (too much going on at once code change wise)
		var continueProcessingEvents = true;
		for(var i = 0; i < this.trackedEntity.orderedEventQueue.length; i++) {
			if(!continueProcessingEvents) {
				break;
			}

			var event = this.trackedEntity.orderedEventQueue[i];
			
			//check if the websocket handler can fit the event
			var info = this.trackedEntity.ua.wsh.canEventFit(event);
			
			//insert the event
			if(info.canEventFit) {
				this.trackedEntity.ua.wsh.insertEvent(event);
				orderedProcessedIndexes.push(i);
			}
			else {
				//stop processing events
				continueProcessingEvents = false;
			}
		}

		//splice out any processed events
		for(var i = orderedProcessedIndexes.length - 1; i >= 0; i--) {
			this.trackedEntity.orderedEventQueue.splice(orderedProcessedIndexes[i], 1);
		}


		//SECOND - process any events from the event queue
		for(var i = 0; i < this.trackedEntity.eventQueue.length; i++) {
			var event = this.trackedEntity.eventQueue[i];

			//process normal events for this entity
			if(event.eventName != "deleteTrackedEntity") {
				//check if the websocket handler can fit the event
				var info = this.trackedEntity.ua.wsh.canEventFit(event);

				//check if the size can vary, and the size is big. If it is, we will start fragmentation. Also only do this if its NOT a fragment already
				if(!info.isFragment && info.b_size_varies && info.bytesRequired >= this.trackedEntity.ua.fragmentationLimit) {
					this.trackedEntity.ua.insertFragmentEvent(event, info);

					processedIndexes.push(i); //just push it in this queue so it gets spliced off at the end
				}
				//insert the event
				else if(info.canEventFit) {
					this.trackedEntity.ua.wsh.insertEvent(event);
					processedIndexes.push(i);
				}
				else {
					//do nothing. The event could not fit the packet. Maybe next frame.
				}
			}
			//the special event "deleted" means this entity no longer needs to be tracked
			else if(event.eventName == "deleteTrackedEntity") {
				this.trackedEntity.nextState = new TrackedEntityDestroyingState(this.trackedEntity);
				processedIndexes.push(i);
			}
		}

		//splice out any processed events
		for(var i = processedIndexes.length - 1; i >= 0; i--) {
			this.trackedEntity.eventQueue.splice(processedIndexes[i], 1);
		}

		//create and update event
		this.createUpdateEvent(dt);

		//check if the tracked entity should be unregistered from the user agent's update list
		if(!this.trackedEntity.bAlwaysRegisterUpdate) {
			this.checkToUnregister();
		}
	}

	createUpdateEvent(dt) {
		var eventData = [];
		
		//construct eventData here
		if(this.trackedEntity.entType == "gameobject") {
			switch(this.trackedEntity.ent.type) {
				case "character":
					//check if its generally dirty
					if(this.trackedEntity.ent.checkDirty()) {
						eventData.push(this.trackedEntity.ent.serializeActiveCharacterUpdateEvent());
					}

					//check if the shield stat is dirty
					if(this.trackedEntity.ent.checkDirtyShield()) {
						eventData.push(this.trackedEntity.ent.serializeActiveCharacterShieldUpdateEvent());
					}
					break;
				case "castle":
					eventData.push(this.trackedEntity.ent.serializeCastleUpdateEvent());
					break;
				case "persistent-projectile":
					eventData.push(this.trackedEntity.ent.serializeUpdatePersistentProjectileEvent());
					break;
			}

			for(var i = 0; i < eventData.length; i++) {
				//check if the websocket handler can fit the event
				var info = this.trackedEntity.ua.wsh.canEventFit(eventData[i]);
	
				//insert the event, and reset the priority accumulator
				if(info.canEventFit) {
					this.trackedEntity.ua.wsh.insertEvent(eventData[i]);
					this.trackedEntity.pa = 0.0;
				}
				else {
					//do nothing
					//continue with other tracked objects to see if any others will fit
				}
			}

			eventData.length = 0;
		}
	}

	exit(dt) {
		super.exit(dt);
	}

	//a one time call from enter(). This just checks if the entity should always be registered in the user agent
	checkAlwaysRegister() {
		//if the entity is USUALLY dirty every frame, do not unregister. Its a bit subjective on what is USUALLY dirty...depends on what its doing in the game.
		//The logic for whether its USUALLY dirty every frame is hard coded here basically
		// if(this.trackedEntity.ent.type === "user") {
		// 	this.trackedEntity.bAlwaysRegisterUpdate = true;
		// }
		if((this.trackedEntity.entType === "gameobject" && this.trackedEntity.ent.type === "character") ||
		   (this.trackedEntity.entType === "gameobject" && this.trackedEntity.ent.type === "persistent-projectile")) {
			this.trackedEntity.bAlwaysRegisterUpdate = true;
			// console.log("tracked-entity-created-state: This tracked entity is marked to alwaysRegisterUpdate. (type: " + this.trackedEntity.entType + ", id: " + this.trackedEntity.entId + ")");
		}
	}

	//checks if this entity should be unregistered from the update list for the user-agent (for optimization purposes)
	checkToUnregister() {
		var bUnregister = true;

		//if there is still anything in the event queues, do not unregister
		if(this.trackedEntity.orderedEventQueue.length > 0 || this.trackedEntity.eventQueue.length > 0) {
			bUnregister = false;
		}

		if(bUnregister) {
			this.trackedEntity.ua.unregisterTrackedEntityUpdateList(this.trackedEntity.entType, this.trackedEntity.entId);
		}
	}
}

exports.TrackedEntityCreatedState = TrackedEntityCreatedState;