const {TrackedEntityBaseState} = require('./tracked-entity-base-state.js');
const TrackedEntityDestroyedState = require('./tracked-entity-destroyed-state.js');

class TrackedEntityDestroyingState extends TrackedEntityBaseState {
	constructor(trackedEntity) {
		super(trackedEntity);
		this.stateName = "tracked-entity-destroying-state";
		this.bDestroyEventSent = false;
	}

	enter(dt) {
		super.enter(dt);
		this.trackedEntity.stateName = this.stateName;

		this.bDestroyEventSent = this.trySendingCreateEvent(dt);

		//register for updates until the tracked entity is officially destroyed
		this.trackedEntity.ua.registerTrackedEntityUpdateList(this.trackedEntity.entType, this.trackedEntity.entId);
	}

	update(dt) {
		super.update(dt);

		if(!this.bDestroyEventSent) {
			this.bDestroyEventSent = this.trySendingCreateEvent(dt);
		} else {
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
		
	}

	exit(dt) {
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
			this.trackedEntity.ua.permDeleteTrackedEntity(this.trackedEntity.entType, this.trackedEntity.entId);
		}
	}


	trySendingCreateEvent(dt) {
		var bEventSent = false;
		var se = null; //serialized event

		//try to create an event to tell the client about this entity being destroyed
		//This is a little wierd...because the entity may be already destroyed in the manager. But because we have a direct reference to it, we can still serialize events.
		//This may change later....idk.
		switch(this.trackedEntity.entType)
		{
			case "user":
				se = this.trackedEntity.ent.serializeUserDisconnectedEvent();
				break;
			case "gameobject":

				//12/12/2020 - sucks...but for right now, just switch on the gameobject type
				// - we are changing SO MUCH code at once, I don't want to consolidate my events or interfaces just yet.
				switch(this.trackedEntity.ent.type)
				{
					case "projectile":
						se = this.trackedEntity.ent.serializeRemoveProjectileEvent();
						break;
					case "character":
						se = this.trackedEntity.ent.serializeRemoveActiveCharacterEvent();
						break;
					case "castle":
						se = this.trackedEntity.ent.serializeRemoveCastleEvent();
						break;
					case "persistent-projectile":
						se = this.trackedEntity.ent.serializeRemovePersistentProjectileEvent();
						break;
					case "control-point":
						se = this.trackedEntity.ent.serializeRemoveControlPointEvent();
						break;
					case "wall":
						se = this.trackedEntity.ent.serializeRemoveWallEvent();
						break;
				}
				break;

			case "team":
				se = this.trackedEntity.ent.serializeRemoveTeamEvent();
				break;
		}

		//try to add it to the wsh so it can be sent out (this is going to be repeated code on the tracked-entity-created-state. So its gonna get pulled out of here most likely in the futur)\
		if(se !== null)
		{
			//check if the websocket handler can fit the event
			var info = this.trackedEntity.ua.wsh.canEventFit(se);

			//insert the event
			if(info.canEventFit)
			{
				this.trackedEntity.ua.wsh.insertEvent(se, this.trackedEntity.cbDestroyAck.bind(this.trackedEntity));
				bEventSent = true;
			}
			else
			{
				//do nothing...the event couldn't fit. Maybe next frame it can.
			}
		}
		return bEventSent;
	}
}

exports.TrackedEntityDestroyingState = TrackedEntityDestroyingState;