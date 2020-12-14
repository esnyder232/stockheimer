const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');
const {UserDisconnectedState} = require("./user-disconnected-state.js");
const {TrackedEntity} = require("./tracked-entity/tracked-entity.js");
const serverConfig = require('../server-config.json');

class User {
	constructor() {
		this.gs = null;
		this.id = null;
		this.activeId = null;
		this.isActive = false;

		this.username = "";
		this.wsId = null;

		this.wsh = null; //a direct reference to the websocket handler since the things in user will be using it often (tracked entities will use it often)

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.serverToClientEvents = []; //event queue to be processed by the packet system
		this.clientToServerEvents = []; //event queue to be processed by the main loop for events coming from the client

		this.characterId = null; //temp character id to establish a relationship between a user and character
		this.bReadyToPlay = false; //flag that gets flipped when the user sends the "readyToPlay" event
		this.bDisconnected = false; //flag that gets flipped when the user disconnects or times out

		this.inputQueue = [];

		this.trackedEvents = []; //for now, these are just one off events that don't have an entity associated with. Ex: "worldStateDone", "gameServerStopped", etc
		this.fragmentEventQueue = []; //fragmented events to be sent to the client. ONLY 1 fragmented message is sent at a time.
		this.fragmentIdCounter = 0;
		this.fragmentationLimit = Math.round(serverConfig.max_packet_event_bytes_until_fragmentation);

		this.trackedEntities = []; //entities to keep track of for this particular user. Events will be sent to the client for creation/destruction/updates/etc.
		this.trackedEntityTypeIdIndex = {
			"user": {},
			"gameobject": {}
		}; //index for the trackedEntities array
		this.trackedEntityTransactions = [];

		this.plBody = null; //used for tracking when objects are near the user
	}


	userInit(gameServer, wsId) {
		this.gs = gameServer;
		this.wsId = wsId;

		//get a direct reference to the websocket handler
		this.wsh = this.gs.wsm.getWebsocketByID(this.wsId);

		this.state = new UserDisconnectedState(this);
		this.state.enter();
	}

	userPostActivated() {
		//nothing for now
	}

	userPostStartPlaying() {
		const pl = this.gs.pl;
		const Vec2 = pl.Vec2;

		//create a tracking sensor
		var trackingSensor = pl.Circle(Vec2(0, 0), 100);

		this.plBody = this.gs.world.createBody({
			position: Vec2(0, 0),
			type: pl.Body.DYNAMIC,
			fixedRotation: true,
			userData: {type:"user", id: this.id}
		});

		this.plBody.createFixture({
			shape: trackingSensor,
			density: 0.0,
			friction: 1.0,
			isSensor: true
		});
	}

	userPreStopPlaying() {
		if(this.plBody !== null)
		{
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}
	}

	userPreDeactivated() {
		//nothing for now
	}

	userDeinit() {
		this.serverToClientEvents = [];
		this.clientToServerEvents = [];
		this.characterId = null;
		this.bReadyToPlay = false;
		this.bDisconnected = false;
		this.inputQueue = [];
		this.wsId = null;
		this.wsh = null;

		this.trackedEntities.length = 0;
		this.fragmentEventQueue.length = 0;
		this.trackedEntityTypeIdIndex = {
			"user": {},
			"gameobject": {}
		}
	}
	
	insertTrackedEntity(type, id) {
		var e = this.findTrackedEntity(type, id);

		if(e === null) {
			e = new TrackedEntity();
			e.trackedEntityInit(this.gs, this.id, type, id);

			this.trackedEntities.push(e);
			this.updateTrackedEntityIndex(type, id, e, "create");
		}

		if(e !== null)
		{
			//for now, just set priority weights here
			if(e.entType == "gameobject")
			{
				if(e.ent.type == "character")
				{
					//if the character belongs to this user, give it a high priority
					if(e.ent.userId == this.id)
					{
						e.paWeight = 1000;
					}
					else
					{
						e.paWeight = 10;
					}
				}
				else if(e.ent.type == "projectile")
				{
					e.paWeight = 1;
				}
			}

			e.eventQueue.push({
				"eventName": "createTrackedEntity",
			});
		}
	}

	//this pushes an event to the tracked entity to delete itself. (like a soft delete)
	//The tracked entity will create a "permDeleteTrackedEntity" transaction itself if it detects it won't be created again. The "permDeleteTrackedEntity" will ACTUALLY delete the tracked entity from the list
	deleteTrackedEntity(type, id) {
		var e = this.findTrackedEntity(type, id);

		if(e !== null) {
			e.eventQueue.push({
				"eventName": "deleteTrackedEntity",
			});
		}
	}

	//this actually removes the tracked entity from the list.
	//this is called from the actual tracked entity itself
	permDeleteTrackedEntity(type, id) {
		this.trackedEntityTransactions.push({
			"transaction": "permDeleteTrackedEntity",
			"type": type,
			"id": id
		});

		console.log('User tracked Entity marked for deletion. User: ' + this.username + ". Entity Type: " + type + ". Entity Id: " + id);
	}

	updateTrackedEntityIndex(type, id, obj, transaction) {
		if(transaction == "create")
		{
			this.trackedEntityTypeIdIndex[type][id] = obj;
		}
		else if(transaction == "delete")
		{
			if(this.trackedEntityTypeIdIndex[type][id] !== undefined)
			{
				delete this.trackedEntityTypeIdIndex[type][id];
			}
		}
	}

	insertTrackedEntityEvent(entType, entId, event) {
		var e = this.findTrackedEntity(entType, entId);

		if(e !== null)
		{
			e.eventQueue.push(event);
		}
	}

	findTrackedEntity(type, id) {
		if(this.trackedEntityTypeIdIndex[type][id])
		{
			return this.trackedEntityTypeIdIndex[type][id];
		}
		else
		{
			return null;
		}
	}

	update(dt) {
		this.state.update();

		//first, see if there are any fragmented messages that need to go to the client
		if(this.fragmentEventQueue.length > 0)
		{
			var fragmentInfo = this.fragmentEventQueue[0];

			if((fragmentInfo.currentFragmentNumber -1) == fragmentInfo.ackedFragmentNumber)
			{
				//fragment start
				if(fragmentInfo.currentFragmentNumber == 0)
				{
					var nextBytes = this.calculateNextFragmentBytes(fragmentInfo.n, fragmentInfo.bytesRequired, this.fragmentationLimit);

					var fragmentEvent = {
						eventName: "fragmentStart",
						fragmentLength: fragmentInfo.eventDataView.byteLength,
						fragmentData: fragmentInfo.eventDataBuffer.slice(0, nextBytes)
					};

					//see if the fragment can fit
					var info = this.wsh.canEventFit(fragmentEvent);

					if(info.canEventFit)
					{
						this.wsh.insertEvent(fragmentEvent, null, this.cbFragmentSendAck.bind(this), {fragmentId: fragmentInfo.fragmentId});
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
					var nextBytes = this.calculateNextFragmentBytes(fragmentInfo.n, fragmentInfo.bytesRequired, this.fragmentationLimit);

					//queue up the next fragment 
					var fragmentEvent = {
						eventName: "fragmentContinue",
						fragmentData: fragmentInfo.eventDataBuffer.slice(fragmentInfo.n, fragmentInfo.n + nextBytes)
					};

					//see if the fragment can fit
					var info = this.wsh.canEventFit(fragmentEvent);

					if(info.canEventFit)
					{
						this.wsh.insertEvent(fragmentEvent, null, this.cbFragmentSendAck.bind(this), {fragmentId: fragmentInfo.fragmentId});
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
					var nextBytes = this.calculateNextFragmentBytes(fragmentInfo.n, fragmentInfo.bytesRequired, this.fragmentationLimit);

					//queue up the next fragment 
					var fragmentEvent = {
						eventName: "fragmentEnd",
						fragmentData: fragmentInfo.eventDataBuffer.slice(fragmentInfo.n, fragmentInfo.n + nextBytes)
					};

					//see if the fragment can fit
					var info = this.wsh.canEventFit(fragmentEvent);

					if(info.canEventFit)
					{
						this.wsh.insertEvent(fragmentEvent, fragmentInfo.cbFinalFragmentAck);

						//the entire fragment has been sent. Splice it off the array.(the internet told me splice was faster)
						// console.log("FRAGMENT END SENT");
						// console.log(fragmentInfo);
						this.fragmentEventQueue.splice(0, 1);
					}
					else
					{
						//do nothing. The event could not fit the packet. Maybe next frame.
					}
				}
			}
		}



		//second (for now), just process the trackedEvents here
		if(this.trackedEvents.length > 0)
		{
			var processedIndexes = [];

			for(var i = 0; i < this.trackedEvents.length; i++)
			{
				//check if the websocket handler can fit the event
				var info = this.wsh.canEventFit(this.trackedEvents[i]);

				//insert the event, and reset the priority accumulator
				if(info.canEventFit)
				{
					this.wsh.insertEvent(this.trackedEvents[i]);
					processedIndexes.push(i);
				}
				else
				{
					//do nothing. The event couldn't fit...maybe next frame it can.
				}
			}

			//splice off any tracked events that were processed
			for(var i = processedIndexes.length - 1; i >= 0; i--)
			{
				this.trackedEvents.splice(i, 1);
			}
		}

		//add to the priority accumulator for tracked entities
		for(var i = 0; i < this.trackedEntities.length; i++)
		{
			if(this.trackedEntities[i].isAwake)
			{
				this.trackedEntities[i].pa += dt * this.trackedEntities[i].paWeight;
			}
		}

		//sort tracked entities
		this.trackedEntities.sort((a, b) => {return b.pa-a.pa});

		//third, update the tracked entities
		for(var i = 0; i < this.trackedEntities.length; i++)
		{
			this.trackedEntities[i].update(dt);
		}

		//fourth, create any update events for the tracked entities
		for(var i = 0; i < this.trackedEntities.length; i++)
		{
			if(this.trackedEntities[i].isAwake)
			{
				this.trackedEntities[i].createUpdateEvent(dt);
			}
		}

		//if there was any tracked entities that need to be deleted, delete them now
		if(this.trackedEntityTransactions.length > 0)
		{
			for(var i = 0; i < this.trackedEntityTransactions.length; i++)
			{
				if(this.trackedEntityTransactions[i].transaction === "permDeleteTrackedEntity")
				{
					//delete the tracked entity and update index
					var index = this.trackedEntities.findIndex((x) => {return x.entType === this.trackedEntityTransactions[i].type && x.entId === this.trackedEntityTransactions[i].id;});

					if(index >= 0)
					{
						console.log('Splicing off tracked entity. User: ' + this.username + ". Entity type: " + this.trackedEntities[index].entType + ". Entity Id: " + this.trackedEntities[index].entId);
						this.trackedEntities[index].trackedEntityDeinit();
						this.updateTrackedEntityIndex(this.trackedEntities[index].entType, this.trackedEntities[index].entId, null, "delete");
						this.trackedEntities.splice(index, 1);
					}
				}
			}
			
			this.trackedEntityTransactions.length = 0;
		}

		if(this.nextState)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}
	}

	insertFragmentEvent(event, info, cbFinalFragmentAck) {
		var fragmentInfo = {
			bytesRequired: info.bytesRequired,
			eventData: event,
			eventDataBuffer: null,
			eventDataView: null,
			fragmentId: this.getFragmentId(),
			n: 0,						//the current byte of the eventDataBuffer we are on
			currentFragmentNumber: 0, 	//the current fragment number we are trying to send in the "trackedEvents"
			ackedFragmentNumber: -1,  	//the most recent acked fragment number that was sent to the client
			maxFragmentNumber: 0,		//the max number of fragments we need to send
			cbFinalFragmentAck: cbFinalFragmentAck	//the callback for when the final fragment gets acknowledged out
		};

		//calculate the max fragments required and create the buffer
		fragmentInfo.maxFragmentNumber = Math.ceil(fragmentInfo.bytesRequired / this.fragmentationLimit) - 1;
		fragmentInfo.eventDataBuffer = new ArrayBuffer(fragmentInfo.bytesRequired);
		fragmentInfo.eventDataView = new DataView(fragmentInfo.eventDataBuffer);

		//encode the entire event in the eventDataBuffer
		this.wsh.encodeEventInBuffer(fragmentInfo.eventData, fragmentInfo.eventDataView, 0);

		//push the fragmentInfo into the fragmentEventQueue so we can keep track of it seperately
		this.fragmentEventQueue.push(fragmentInfo);
	}


	getFragmentId() {
		return this.fragmentIdCounter++;
	}

	cbFragmentSendAck(miscData) {
		// console.log('ACK FRAGMENT CALLED');
		// console.log(eventData);

		var index = this.fragmentEventQueue.findIndex((x) => {return x.fragmentId == miscData.fragmentId;});
		if(index >= 0)
		{
			this.fragmentEventQueue[index].ackedFragmentNumber++;
		}
	}

	calculateNextFragmentBytes(n, totalByteLength, fragmentationLimit)
	{
		var result = 0;

		var bytesRemaining = totalByteLength - n;

		if(Math.floor(bytesRemaining/fragmentationLimit) >= 1)
		{
			result = fragmentationLimit;
		}
		else
		{
			result = bytesRemaining;
		}

		return result;
	}



	
	///////////////////////////////////
	// EVENT SERIALIZATION FUNCTIONS //
	///////////////////////////////////
	serializeUserConnectedEvent() {
		return {
			"eventName": "userConnected",
			"userId": this.id,
			"activeUserId": this.activeId,
			"username": this.username
		};
	}

	serializeUserDisconnectedEvent() {
		return {
			"eventName": "userDisconnected",
			"userId": this.id
		};
	}

	serializeExistingUserEvent() {
		return {
			"eventName": "existingUser",
			"userId": this.id,
			"activeUserId": this.activeId,
			"username": this.username
		};
	}

}

exports.User = User;
