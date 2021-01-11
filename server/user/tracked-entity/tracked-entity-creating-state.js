const {TrackedEntityBaseState} = require('./tracked-entity-base-state.js');
const {TrackedEntityWaitCreateAckState} = require('./tracked-entity-wait-create-ack-state.js');

class TrackedEntityCreatingState extends TrackedEntityBaseState {
	constructor(trackedEntity) {
		super(trackedEntity);
		this.stateName = "tracked-entity-creating-state";
		//this.isCreateEventFragmented = false;
	}

	enter(dt) {
		super.enter(dt);
		this.trackedEntity.stateName = this.stateName;
	}

	update(dt) {
		super.update(dt);
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
				}
				break;
		}

		if(event !== null)
		{
			//check if the websocket handler can fit the event
			var info = this.trackedEntity.user.wsh.canEventFit(event);

			//insert the event
			//fragment
			if(!info.isFragment && info.b_size_varies && info.bytesRequired >= this.trackedEntity.user.fragmentationLimit)
			{
				this.trackedEntity.user.insertFragmentEvent(event, info, this.trackedEntity.cbCreateAck.bind(this.trackedEntity));
				
				//for right now, just move on to the next state
				this.trackedEntity.nextState = new TrackedEntityWaitCreateAckState(this.trackedEntity);
			}
			//insert the event
			else if(info.canEventFit)
			{
				this.trackedEntity.user.wsh.insertEvent(event, this.trackedEntity.cbCreateAck.bind(this.trackedEntity));

				//for right now, just move on to the next state
				this.trackedEntity.nextState = new TrackedEntityWaitCreateAckState(this.trackedEntity);
			}
			else
			{
				//do nothing. The event could not fit the packet. Maybe next frame.
			}
		}
	}

	exit(dt) {
		super.exit(dt);
	}
}

exports.TrackedEntityCreatingState = TrackedEntityCreatingState;