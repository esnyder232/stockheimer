const {TrackedEntityBaseState} = require('./tracked-entity-base-state.js');
const {TrackedEntityWaitCreateAckState} = require('./tracked-entity-wait-create-ack-state.js');

class TrackedEntityCreatingState extends TrackedEntityBaseState {
	constructor(trackedEntity) {
		super(trackedEntity);
		this.stateName = "tracked-entity-creating-state";
		this.isCreateEventFragmented = false;
	}

	enter(dt) {
		console.log(this.stateName + ' enter. UserId:' + this.trackedEntity.userId + ". EntType: " + this.trackedEntity.entType + ". EntID: " + this.trackedEntity.entId);
		super.enter(dt);
		this.trackedEntity.stateName = this.stateName;
	}

	update(dt) {
		super.update(dt);
		var event = null; //create event

		//complex way (fragmentation)
		// //continue sending fragments of the create event
		// if(this.isCreateEventFragmented)
		// {
		// 	if(this.trackedEntity.fragmentEventQueue.length > 0)
		// 	{
		// 		var fragmentInfo = this.trackedEntity.fragmentEventQueue[0];
									
		// 		if((fragmentInfo.currentFragmentNumber -1) == fragmentInfo.ackedFragmentNumber)
		// 		{
		// 			//fragment start
		// 			if(fragmentInfo.currentFragmentNumber == 0)
		// 			{
		// 				var nextBytes = this.trackedEntity.calculateNextFragmentBytes(fragmentInfo.n, fragmentInfo.bytesRequired, this.trackedEntity.fragmentationLimit);

		// 				var fragmentEvent = {
		// 					eventName: "fragmentStart",
		// 					fragmentLength: fragmentInfo.eventDataView.byteLength,
		// 					fragmentData: fragmentInfo.eventDataBuffer.slice(0, nextBytes)
		// 				};

		// 				//see if the fragment can fit
		// 				var info = this.trackedEntity.user.wsh.canEventFit(fragmentEvent);

		// 				if(info.canEventFit)
		// 				{
		// 					this.trackedEntity.user.wsh.insertEvent(fragmentEvent, null, this.trackedEntity.cbFragmentSendAck.bind(this.trackedEntity), {fragmentId: fragmentInfo.fragmentId});
		// 					fragmentInfo.n += nextBytes;
		// 					fragmentInfo.currentFragmentNumber++;
		// 				}
		// 				else
		// 				{
		// 					//do nothing. The event could not fit the packet. Maybe next frame.
		// 				}
		// 			}
		// 			//fragment continue
		// 			else if(fragmentInfo.currentFragmentNumber < fragmentInfo.maxFragmentNumber)
		// 			{
		// 				//calculate the next bytes
		// 				var nextBytes = this.trackedEntity.calculateNextFragmentBytes(fragmentInfo.n, fragmentInfo.bytesRequired, this.trackedEntity.fragmentationLimit);

		// 				//queue up the next fragment 
		// 				var fragmentEvent = {
		// 					eventName: "fragmentContinue",
		// 					fragmentData: fragmentInfo.eventDataBuffer.slice(fragmentInfo.n, fragmentInfo.n + nextBytes)
		// 				};

		// 				//see if the fragment can fit
		// 				var info = this.trackedEntity.user.wsh.canEventFit(fragmentEvent);

		// 				if(info.canEventFit)
		// 				{
		// 					this.trackedEntity.user.wsh.insertEvent(fragmentEvent, null, this.trackedEntity.cbFragmentSendAck.bind(this.trackedEntity), {fragmentId: fragmentInfo.fragmentId});
		// 					fragmentInfo.n += nextBytes;
		// 					fragmentInfo.currentFragmentNumber++;
		// 				}
		// 				else
		// 				{
		// 					//do nothing. The event could not fit the packet. Maybe next frame.
		// 				}
		// 			}
		// 			//fragment end
		// 			else if(fragmentInfo.currentFragmentNumber == fragmentInfo.maxFragmentNumber)
		// 			{
		// 				//calculate the next bytes
		// 				var nextBytes = this.trackedEntity.calculateNextFragmentBytes(fragmentInfo.n, fragmentInfo.bytesRequired, this.trackedEntity.fragmentationLimit);

		// 				//queue up the next fragment 
		// 				var fragmentEvent = {
		// 					eventName: "fragmentEnd",
		// 					fragmentData: fragmentInfo.eventDataBuffer.slice(fragmentInfo.n, fragmentInfo.n + nextBytes)
		// 				};

		// 				//see if the fragment can fit
		// 				var info = this.trackedEntity.user.wsh.canEventFit(fragmentEvent);

		// 				if(info.canEventFit)
		// 				{
		// 					this.trackedEntity.user.wsh.insertEvent(fragmentEvent, this.trackedEntity.cbCreateAck.bind(this.trackedEntity));

		// 					//the entire fragment has been sent. Splice it off the array.(the internet told me splice was faster)
		// 					// console.log("FRAGMENT END SENT");
		// 					// console.log(fragmentInfo);
		// 					this.trackedEntity.fragmentEventQueue.splice(0, 1);
							
		// 					//for right now, just move on to the next state
		// 					this.trackedEntity.nextState = new TrackedEntityWaitCreateAckState(this.trackedEntity);
		// 				}
		// 				else
		// 				{
		// 					//do nothing. The event could not fit the packet. Maybe next frame.
		// 				}
		// 			}
		// 		}
		// 	}
		// }
		// else 
		// {
		// 	//try to create an event to tell the client about this entity
		// 	switch(this.trackedEntity.entType)
		// 	{
		// 		case "user":
		// 			event = this.trackedEntity.ent.serializeUserConnectedEvent();
		// 			break;
		// 		case "gameobject":

		// 			//12/12/2020 - sucks...but for right now, just switch on the gameobject type
		// 			// - we are changing SO MUCH code at once, I don't want to consolidate my events or interfaces just yet.
		// 			switch(this.trackedEntity.ent.type)
		// 			{
		// 				case "projectile":
		// 					event = this.trackedEntity.ent.serializeAddProjectileEvent();
		// 					break;
		// 				case "character":
		// 					event = this.trackedEntity.ent.serializeAddActiveCharacterEvent();
		// 					break;
		// 			}
		// 			break;
		// 	}
			
		// 	if(event !== null)
		// 	{
		// 		//check if the websocket handler can fit the event
		// 		var info = this.trackedEntity.user.wsh.canEventFit(event);

		// 		//check if the size can vary, and the size is big. If it is, we will start fragmentation. Also only do this if its NOT a fragment already
		// 		if(!info.isFragment && info.b_size_varies && info.bytesRequired >= this.trackedEntity.fragmentationLimit)
		// 		{	
		// 			var fragmentInfo = {
		// 				bytesRequired: info.bytesRequired,
		// 				eventData: event,
		// 				eventDataBuffer: null,
		// 				eventDataView: null,
		// 				fragmentId: this.trackedEntity.getFragmentId(),
		// 				n: 0,						//the current byte of the eventDataBuffer we are on
		// 				currentFragmentNumber: 0, 	//the current fragment number we are trying to send in the "trackedEvents"
		// 				ackedFragmentNumber: -1,  	//the most recent acked fragment number that was sent to the client
		// 				maxFragmentNumber: 0		//the max number of fragments we need to send
		// 			};

		// 			//calculate the max fragments required and create the buffer
		// 			fragmentInfo.maxFragmentNumber = Math.ceil(fragmentInfo.bytesRequired / this.trackedEntity.fragmentationLimit) - 1;
		// 			fragmentInfo.eventDataBuffer = new ArrayBuffer(fragmentInfo.bytesRequired);
		// 			fragmentInfo.eventDataView = new DataView(fragmentInfo.eventDataBuffer);

		// 			//encode the entire event in the eventDataBuffer
		// 			this.trackedEntity.user.wsh.encodeEventInBuffer(fragmentInfo.eventData, fragmentInfo.eventDataView, 0);

		// 			//push the fragmentInfo into the fragmentEventQueue so we can keep track of it seperately
		// 			this.trackedEntity.fragmentEventQueue.push(fragmentInfo);
		// 			this.isCreateEventFragmented = true;
		// 		}
		// 		//insert the event
		// 		else if(info.canEventFit)
		// 		{
		// 			this.trackedEntity.user.wsh.insertEvent(se, this.trackedEntity.cbCreateAck.bind(this.trackedEntity));

		// 			//for right now, just move on to the next state
		// 			this.trackedEntity.nextState = new TrackedEntityWaitCreateAckState(this.trackedEntity);
		// 		}
		// 		else
		// 		{
		// 			//do nothing. The event could not fit the packet. Maybe next frame.
		// 		}
		// 	}
		// }
		





		//simple way (no fragmentation)
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
				}
				break;
		}

		if(event !== null)
		{
			//check if the websocket handler can fit the event
			var info = this.trackedEntity.user.wsh.canEventFit(event);

			//insert the event
			if(info.canEventFit)
			{
				this.trackedEntity.user.wsh.insertEvent(event, this.trackedEntity.cbCreateAck.bind(this.trackedEntity));

				//for right now, just move on to the next state
				this.trackedEntity.nextState = new TrackedEntityWaitCreateAckState(this.trackedEntity);
			}
			else
			{
				//do nothing...the event couldn't fit. Maybe next frame it can.
			}
		}
	}

	exit(dt) {
		console.log(this.stateName + ' exit. UserId:' + this.trackedEntity.userId + ". EntType: " + this.trackedEntity.entType + ". EntID: " + this.trackedEntity.entId);
		super.exit(dt);
	}
}

exports.TrackedEntityCreatingState = TrackedEntityCreatingState;