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

		//first, see if there are any fragments that we need to queue up in the trackedEvnets. Only send fragments ONE at a time.
		if(this.trackedEntity.fragmentEventQueue.length > 0)
		{
			var fragmentInfo = this.trackedEntity.fragmentEventQueue[0];
								
			if((fragmentInfo.currentFragmentNumber -1) == fragmentInfo.ackedFragmentNumber)
			{
				//fragment start
				if(fragmentInfo.currentFragmentNumber == 0)
				{
					var nextBytes = this.trackedEntity.calculateNextFragmentBytes(fragmentInfo.n, fragmentInfo.bytesRequired, this.trackedEntity.fragmentationLimit);

					var fragmentEvent = {
						eventName: "fragmentStart",
						fragmentLength: fragmentInfo.eventDataView.byteLength,
						fragmentData: fragmentInfo.eventDataBuffer.slice(0, nextBytes)
					};

					//see if the fragment can fit
					var info = this.trackedEntity.user.wsh.canEventFit(fragmentEvent);

					if(info.canEventFit)
					{
						this.trackedEntity.user.wsh.insertEvent(fragmentEvent, null, this.trackedEntity.cbFragmentSendAck.bind(this.trackedEntity), {fragmentId: fragmentInfo.fragmentId});
						fragmentInfo.n += nextBytes;
						fragmentInfo.currentFragmentNumber++;
					}
					else
					{
						//do nothing. The event could not fit the packet. Maybe next frame.
					}
				}
				//fragment continue
				else if(fragmentInfo.currentFragmentNumber < fragmentInfo.maxFragmentNumber)
				{
					//calculate the next bytes
					var nextBytes = this.trackedEntity.calculateNextFragmentBytes(fragmentInfo.n, fragmentInfo.bytesRequired, this.trackedEntity.fragmentationLimit);

					//queue up the next fragment 
					var fragmentEvent = {
						eventName: "fragmentContinue",
						fragmentData: fragmentInfo.eventDataBuffer.slice(fragmentInfo.n, fragmentInfo.n + nextBytes)
					};

					//see if the fragment can fit
					var info = this.trackedEntity.user.wsh.canEventFit(fragmentEvent);

					if(info.canEventFit)
					{
						this.trackedEntity.user.wsh.insertEvent(fragmentEvent, null, this.trackedEntity.cbFragmentSendAck.bind(this.trackedEntity), {fragmentId: fragmentInfo.fragmentId});
						fragmentInfo.n += nextBytes;
						fragmentInfo.currentFragmentNumber++;
					}
					else
					{
						//do nothing. The event could not fit the packet. Maybe next frame.
					}
				}
				//fragment end
				else if(fragmentInfo.currentFragmentNumber == fragmentInfo.maxFragmentNumber)
				{
					//calculate the next bytes
					var nextBytes = this.trackedEntity.calculateNextFragmentBytes(fragmentInfo.n, fragmentInfo.bytesRequired, this.trackedEntity.fragmentationLimit);

					//queue up the next fragment 
					var fragmentEvent = {
						eventName: "fragmentEnd",
						fragmentData: fragmentInfo.eventDataBuffer.slice(fragmentInfo.n, fragmentInfo.n + nextBytes)
					};

					//see if the fragment can fit
					var info = this.trackedEntity.user.wsh.canEventFit(fragmentEvent);

					if(info.canEventFit)
					{
						this.trackedEntity.user.wsh.insertEvent(fragmentEvent);

						//the entire fragment has been sent. Splice it off the array.(the internet told me splice was faster)
						// console.log("FRAGMENT END SENT");
						// console.log(fragmentInfo);
						this.trackedEntity.fragmentEventQueue.splice(0, 1);
					}
					else
					{
						//do nothing. The event could not fit the packet. Maybe next frame.
					}
				}
			}
		}

		//second, process any events from the event queue
		for(var i = 0; i < this.trackedEntity.eventQueue.length; i++)
		{
			var event = this.trackedEntity.eventQueue[i];

			//process normal events for this entity
			if(event.eventName != "deleteTrackedEntity")
			{
				//check if the websocket handler can fit the event
				var info = this.trackedEntity.user.wsh.canEventFit(event);

				//check if the size can vary, and the size is big. If it is, we will start fragmentation. Also only do this if its NOT a fragment already
				if(!info.isFragment && info.b_size_varies && info.bytesRequired >= this.trackedEntity.fragmentationLimit)
				{	
					var fragmentInfo = {
						bytesRequired: info.bytesRequired,
						eventData: event,
						eventDataBuffer: null,
						eventDataView: null,
						fragmentId: this.trackedEntity.getFragmentId(),
						n: 0,						//the current byte of the eventDataBuffer we are on
						currentFragmentNumber: 0, 	//the current fragment number we are trying to send in the "trackedEvents"
						ackedFragmentNumber: -1,  	//the most recent acked fragment number that was sent to the client
						maxFragmentNumber: 0		//the max number of fragments we need to send
					};

					//calculate the max fragments required and create the buffer
					fragmentInfo.maxFragmentNumber = Math.ceil(fragmentInfo.bytesRequired / this.trackedEntity.fragmentationLimit) - 1;
					fragmentInfo.eventDataBuffer = new ArrayBuffer(fragmentInfo.bytesRequired);
					fragmentInfo.eventDataView = new DataView(fragmentInfo.eventDataBuffer);

					//encode the entire event in the eventDataBuffer
					this.trackedEntity.user.wsh.encodeEventInBuffer(fragmentInfo.eventData, fragmentInfo.eventDataView, 0);

					//push the fragmentInfo into the fragmentEventQueue so we can keep track of it seperately
					this.trackedEntity.fragmentEventQueue.push(fragmentInfo);
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