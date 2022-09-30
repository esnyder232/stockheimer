const {TrackedEntityBaseState} = require('./tracked-entity-base-state.js');
const {TrackedEntityCreatedState} = require('./tracked-entity-created-state.js');

class TrackedEntityCreatingState extends TrackedEntityBaseState {
	constructor(trackedEntity) {
		super(trackedEntity);
		this.stateName = "tracked-entity-creating-state";
		this.bCreateEventSent = false;
	}

	enter(dt) {
		super.enter(dt);
		this.trackedEntity.stateName = this.stateName;

		//immediately try to send the creation event to speed things along
		this.bCreateEventSent = this.trySendingCreateEvent(dt);
	}

	update(dt) {

		//if the create event wasn't sent earlier (packet may have been full), try sending it again
		if(!this.bCreateEventSent) {
			this.bCreateEventSent = this.trySendingCreateEvent(dt);
		} else {
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



		super.update(dt);
		
	}

	exit(dt) {
		super.exit(dt);
	}

	trySendingCreateEvent(dt) {
		var bEventSent = false;
		var event = null; //create event
		
		switch(this.trackedEntity.entType)
		{
			case "user":
				event = this.trackedEntity.ent.serializeUserConnectedEvent();
				break;
			case "gameobject":

				//12/12/2020 - sucks...but for right now, just switch on the gameobject type
				// - we are changing SO MUCH code at once, I don't want to consolidate my events or interfaces just yet.
				switch(this.trackedEntity.ent.type)
				{
					case "projectile":
						event = this.trackedEntity.ent.serializeAddProjectileEvent();
						break;
					case "character":
						event = this.trackedEntity.ent.serializeAddActiveCharacterEvent();
						break;
					case "castle":
						event = this.trackedEntity.ent.serializeAddCastleEvent();
						break;
					case "persistent-projectile":
						event = this.trackedEntity.ent.serializeAddPersistentProjectileEvent();
						break;
					case "control-point":
						event = this.trackedEntity.ent.serializeAddControlPointEvent();
						break;
					case "wall":
						event = this.trackedEntity.ent.serializeAddWallEvent();
						break;
				}
				break;
			case "round":
				event = this.trackedEntity.ent.serializeAddRoundEvent();
				break;
			case "team":
				event = this.trackedEntity.ent.serializeAddTeamEvent();
				break;
		}

		if(event !== null)
		{
			//check if the websocket handler can fit the event
			var info = this.trackedEntity.ua.wsh.canEventFit(event);

			//insert the event
			//fragment
			if(!info.isFragment && info.b_size_varies && info.bytesRequired > this.trackedEntity.ua.fragmentationLimit)
			{
				this.trackedEntity.ua.insertFragmentEvent(event, info, this.trackedEntity.cbCreateAck.bind(this.trackedEntity));
				bEventSent = true;
			}
			//insert the event
			else if(info.canEventFit)
			{
				this.trackedEntity.ua.wsh.insertEvent(event, this.trackedEntity.cbCreateAck.bind(this.trackedEntity));
				bEventSent = true;
			}
			else
			{
				//do nothing. The event could not fit the packet. Maybe next frame.
			}
		}

		return bEventSent;
	}
}

exports.TrackedEntityCreatingState = TrackedEntityCreatingState;