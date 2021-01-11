const {TrackedEntityBaseState} = require('./tracked-entity-base-state.js');
const {TrackedEntityWaitDestroyAckState} = require('./tracked-entity-wait-destroy-ack-state.js');

class TrackedEntityDestroyingState extends TrackedEntityBaseState {
	constructor(trackedEntity) {
		super(trackedEntity);
		this.stateName = "tracked-entity-destroying-state";
	}

	enter(dt) {
		super.enter(dt);
		this.trackedEntity.stateName = this.stateName;
	}

	update(dt) {
		super.update(dt);

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
				}
				break;
		}

		//try to add it to the wsh so it can be sent out (this is going to be repeated code on the tracked-entity-created-state. So its gonna get pulled out of here most likely in the futur)\
		if(se !== null)
		{
			//check if the websocket handler can fit the event
			var info = this.trackedEntity.user.wsh.canEventFit(se);

			//insert the event
			if(info.canEventFit)
			{
				this.trackedEntity.user.wsh.insertEvent(se, this.trackedEntity.cbDestroyAck.bind(this.trackedEntity));

				//for right now, just move on to the next state
				this.trackedEntity.nextState = new TrackedEntityWaitDestroyAckState(this.trackedEntity);
			}
			else
			{
				//do nothing...the event couldn't fit. Maybe next frame it can.
			}
		}
	}

	exit(dt) {
		super.exit(dt);
	}
}

exports.TrackedEntityDestroyingState = TrackedEntityDestroyingState;