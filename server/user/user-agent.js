const GlobalFuncs = require('../global-funcs.js');
const {TrackedEntity} = require("./tracked-entity/tracked-entity.js");
const serverConfig = require('../server-config.json');
const logger = require('../../logger.js');

class UserAgent {
	constructor() {
		this.gs = null;
		this.id = null;
		this.activeId = null;
		this.isActive = false;
		this.globalfuncs = null;

		this.wsId = null;
		this.userId = null;
		this.wsh = null; //a direct reference to the websocket handler (tracked entities will use it often)
		this.user = null; //a direct reference to ther user

		this.serverToClientEvents = []; //event queue to be processed by the packet system
		this.clientToServerEvents = []; //event queue to be processed by the main loop for events coming from the client

		this.fragmentedClientToServerEvents = []; //fragmented events from client to the server
		this.fragmentedServerToClientEvents = []; //fragmented events to be sent to the client. ONLY 1 fragmented message is sent at a time.

		this.inputQueue = [];
		
		this.fragmentIdCounter = 0;
		this.fragmentationLimit = Math.round(serverConfig.max_packet_event_bytes_until_fragmentation);

		this.trackedEntities = []; //entities to keep track of for this particular user. Events will be sent to the client for creation/destruction/updates/etc.
		this.trackedEntityTypeIdIndex = {
			"user": {},
			"gameobject": {},
			"round": {},
			"team": {}
		}; //index for the trackedEntities array
		this.trackedEntityTransactions = [];

		this.plBody = null; //used for tracking when objects are near the user
		this.userKillCount = 0;

		this.rtt = 0; //ms
		this.rttCalcTimer = 0; //ms
		this.rttCalcThreshold = 1000; //ms
	}

	userAgentInit(gameServer, userId, wsId) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs.GlobalFuncs();
		this.userId = userId;
		this.wsId = wsId;
		
		//get a direct reference to the websocket handler
		this.wsh = this.gs.wsm.getWebsocketByID(this.wsId);
		this.user = this.gs.um.getUserByID(this.userId);
	}

	userAgentDeinit() {
		this.serverToClientEvents = [];
		this.clientToServerEvents = [];
		this.inputQueue = [];
		this.userId = null;
		this.user = null;
		this.wsId = null;
		this.wsh = null;

		this.trackedEntities.length = 0;
		this.fragmentedServerToClientEvents.length = 0;
		this.trackedEntityTypeIdIndex = {
			"user": {},
			"gameobject": {},
			"round": {},
			"team": {}
		}
	}

	//inserts the event into the serverToclient array so it can be processed later in the update loop
	insertServerToClientEvent(eventData, cbAck, cbSend, miscData) {
		this.serverToClientEvents.push({
			eventData: eventData,
			cbAck: cbAck,
			cbSend: cbSend,
			miscData: miscData
		});
	}
	
	insertTrackedEntity(type, id) {
		var existingEnt = this.findTrackedEntity(type, id);

		if(existingEnt === null) {
			var e = new TrackedEntity();
			e.trackedEntityInit(this.gs, this.id, type, id);

			this.trackedEntities.push(e);
			this.updateTrackedEntityIndex(type, id, e, "create");

			//for now, just set priority weights here
			if(e.entType == "gameobject")
			{
				if(e.ent.type == "character")
				{
					//if the character belongs to this user, give it a high priority
					if(e.ent.ownerType === "user" && e.ent.ownerId == this.userId)
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
				else if(e.ent.type == "castle")
				{
					e.paWeight = 1;
				}
			}
			else
			{
				e.paWeight = 1;
			}

			e.insertEvent({
				"eventName": "createTrackedEntity",
			});
		}
	}

	fromClientFragmentEvent(e) {
		switch(e.eventName)
		{
			case "fragmentStart":
				var fragmentInfo = {
					fragmentLength: e.fragmentLength,
					fragmentData: new ArrayBuffer(e.fragmentLength),
					fragmentDataView: null,
					fragmentId: e.fragmentId,
					n: 0
				};

				fragmentInfo.fragmentDataView = new DataView(fragmentInfo.fragmentData);
				
				//copy the fragment in this message to the fragmentedClientToServerEvents
				var dv = new DataView(e.fragmentData);
				for(var j = 0; j < dv.byteLength; j++)
				{
					fragmentInfo.fragmentDataView.setUint8(fragmentInfo.n, dv.getUint8(j));
					fragmentInfo.n++;
				}

				this.fragmentedClientToServerEvents.push(fragmentInfo);

				break;
			case "fragmentContinue":
				var fragmentInfo = this.fragmentedClientToServerEvents.find((x) => {return x.fragmentId === e.fragmentId;});

				if(fragmentInfo)
				{
					//copy the fragment in this message to the fragmentedClientToServerEvents
					var dv = new DataView(e.fragmentData);
					
					for(var j = 0; j < dv.byteLength; j++)
					{
						fragmentInfo.fragmentDataView.setUint8(fragmentInfo.n, dv.getUint8(j));
						fragmentInfo.n++;
					}
				}
				break;
			case "fragmentEnd":
				var fragmentInfoIndex = this.fragmentedClientToServerEvents.findIndex((x) => {return x.fragmentId === e.fragmentId;});

				if(fragmentInfoIndex >= 0)
				{
					var fragmentInfo = this.fragmentedClientToServerEvents[fragmentInfoIndex];
					
					//copy the fragment in this message to the fragmentedClientToServerEvents
					var dv = new DataView(e.fragmentData);
					for(var j = 0; j < dv.byteLength; j++)
					{
						fragmentInfo.fragmentDataView.setUint8(fragmentInfo.n, dv.getUint8(j));
						fragmentInfo.n++;
					}

					this.wsh.decodeEvent(0, fragmentInfo.fragmentDataView, true);
					this.fragmentedClientToServerEvents.splice(fragmentInfoIndex, 1);
				}
				break;
		}
	}

	//this pushes an event to the tracked entity to delete itself. (like a soft delete)
	//The tracked entity will create a "permDeleteTrackedEntity" transaction itself if it detects it won't be created again. The "permDeleteTrackedEntity" will ACTUALLY delete the tracked entity from the list
	deleteTrackedEntity(type, id) {
		var e = this.findTrackedEntity(type, id);

		if(e !== null) {
			e.insertEvent({
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

		//logger.log("info", 'User tracked Entity marked for deletion. User: ' + this.username + ". Entity Type: " + type + ". Entity Id: " + id);
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
			e.insertEvent(event);
		}
	}

	insertTrackedEntityOrderedEvent(entType, entId, event) {
		var e = this.findTrackedEntity(entType, entId);

		if(e !== null)
		{
			e.insertOrderedEvent(event);
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
		//update rtt if its time
		this.rttCalcTimer += dt;
		if(this.rttCalcTimer >= this.rttCalcThreshold)
		{
			this.rtt = this.wsh.calcRTT();
			this.rttCalcTimer = 0;

			//tell all user agents about the new rtt
			var userAgents = this.gs.uam.getUserAgents();
			for(var i = 0; i < userAgents.length; i++)
			{
				userAgents[i].insertTrackedEntityEvent("user", this.userId, this.serializeUpdateUserRttEvent());
			}
		}

		//first, see if there are any fragmented messages that need to go to the client
		if(this.fragmentedServerToClientEvents.length > 0)
		{
			var processedFragementedEvents = [];
			for(var i = 0; i < this.fragmentedServerToClientEvents.length; i++)
			{
				var fragmentInfo = this.fragmentedServerToClientEvents[i];

				if((fragmentInfo.currentFragmentNumber -1) == fragmentInfo.ackedFragmentNumber)
				{
					//fragment start
					if(fragmentInfo.currentFragmentNumber == 0)
					{
						var nextBytes = this.calculateNextFragmentBytes(fragmentInfo.n, fragmentInfo.bytesRequired, this.fragmentationLimit);
						
						var fragmentEvent = {
							eventName: "fragmentStart",
							fragmentLength: fragmentInfo.eventDataView.byteLength,
							fragmentData: fragmentInfo.eventDataBuffer.slice(0, nextBytes),
							fragmentId: fragmentInfo.fragmentId
						};
	
						//see if the fragment can fit
						var info = this.wsh.canEventFit(fragmentEvent);
	
						if(info.canEventFit)
						{
							// console.log('SENDING FRAGMENT START');
							// console.log({fragmentId: fragmentInfo.fragmentId, "eventjson": JSON.stringify(fragmentInfo.eventData)});

							this.wsh.insertEvent(fragmentEvent, this.cbFragmentSendAck.bind(this), null, {fragmentId: fragmentInfo.fragmentId});
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
							fragmentData: fragmentInfo.eventDataBuffer.slice(fragmentInfo.n, fragmentInfo.n + nextBytes),
							fragmentId: fragmentInfo.fragmentId
						};
	
						//see if the fragment can fit
						var info = this.wsh.canEventFit(fragmentEvent);
	
						if(info.canEventFit)
						{
							// console.log('SENDING FRAGMENT CONTINUE');
							// console.log({fragmentId: fragmentInfo.fragmentId, "eventjson": JSON.stringify(fragmentInfo.eventData)});
							
							this.wsh.insertEvent(fragmentEvent, this.cbFragmentSendAck.bind(this), null, {fragmentId: fragmentInfo.fragmentId});
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
							fragmentData: fragmentInfo.eventDataBuffer.slice(fragmentInfo.n, fragmentInfo.n + nextBytes),
							fragmentId: fragmentInfo.fragmentId
						};
	
						//see if the fragment can fit
						var info = this.wsh.canEventFit(fragmentEvent);
	
						if(info.canEventFit)
						{
							// console.log('SENDING FRAGMENT END');
							// console.log({fragmentId: fragmentInfo.fragmentId, "eventjson": JSON.stringify(fragmentInfo.eventData)});

							this.wsh.insertEvent(fragmentEvent, fragmentInfo.cbFinalFragmentAck, fragmentInfo.cbFinalFragmentSend, fragmentInfo.cbFinalFragmentMiscData);
	
							//the entire fragment has been sent. Splice it off the array.(the internet told me splice was faster)
							processedFragementedEvents.push(i);
						}
						else
						{
							//do nothing. The event could not fit the packet. Maybe next frame.
						}
					}
				}
			}

			//splice off fragmented messages if we're done with them
			for(var i = processedFragementedEvents.length - 1; i >= 0; i--)
			{
				this.fragmentedServerToClientEvents.splice(processedFragementedEvents[i], 1);
			}

		}



		//second (for now), just process the serverToClientEvents here
		if(this.serverToClientEvents.length > 0)
		{
			var processedIndexes = [];

			for(var i = 0; i < this.serverToClientEvents.length; i++)
			{
				//check if the websocket handler can fit the event
				var info = this.wsh.canEventFit(this.serverToClientEvents[i].eventData);

				//insert the event, and reset the priority accumulator
				if(!info.isFragment && info.b_size_varies && info.bytesRequired > this.fragmentationLimit)
				{
					this.insertFragmentEvent(this.serverToClientEvents[i].eventData, info, this.serverToClientEvents[i].cbAck, this.serverToClientEvents[i].cbSend, this.serverToClientEvents[i].miscData);

					processedIndexes.push(i); //just push it in this queue so it gets spliced off at the end
				}
				else if(info.canEventFit)
				{
					this.wsh.insertEvent(this.serverToClientEvents[i].eventData, this.serverToClientEvents[i].cbAck, this.serverToClientEvents[i].cbSend, this.serverToClientEvents[i].miscData);
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
				this.serverToClientEvents.splice(i, 1);
			}
		}

		//add to the priority accumulator for tracked entities
		for(var i = 0; i < this.trackedEntities.length; i++)
		{
			if(this.trackedEntities[i].isDirty)
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
			if(this.trackedEntities[i].isDirty)
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
						//logger.log("info", 'Splicing off tracked entity. User: ' + this.username + ". Entity type: " + this.trackedEntities[index].entType + ". Entity Id: " + this.trackedEntities[index].entId);
						this.trackedEntities[index].trackedEntityDeinit();
						this.updateTrackedEntityIndex(this.trackedEntities[index].entType, this.trackedEntities[index].entId, null, "delete");
						this.trackedEntities.splice(index, 1);
					}
				}
			}
			
			this.trackedEntityTransactions.length = 0;
		}
	}

	insertFragmentEvent(event, info, cbFinalFragmentAck, cbFinalFragmentSend, cbFinalFragmentMiscData) {
		var fragmentInfo = {
			bytesRequired: info.bytesRequired,
			eventData: event,
			eventDataBuffer: null,
			eventDataView: null,
			fragmentId: this.getFragmentId(),
			n: 0,						//the current byte of the eventDataBuffer we are on
			currentFragmentNumber: 0, 	//the current fragment number we are trying to send in the "serverToClientEvents"
			ackedFragmentNumber: -1,  	//the most recent acked fragment number that was sent to the client
			maxFragmentNumber: 0,		//the max number of fragments we need to send
			cbFinalFragmentAck: cbFinalFragmentAck, //the callback for when the final fragment gets acknowledged out
			cbFinalFragmentSend: cbFinalFragmentSend, //the callback for when the final framgnets gets sent out
			cbFinalFragmentMiscData: cbFinalFragmentMiscData //the misc data to be passed back into the cbFinalFragmentAck and cbFinalFragmentSend callbacks
		};

		//calculate the max fragments required and create the buffer
		fragmentInfo.maxFragmentNumber = Math.floor(fragmentInfo.bytesRequired / this.fragmentationLimit);
		fragmentInfo.eventDataBuffer = new ArrayBuffer(fragmentInfo.bytesRequired);
		fragmentInfo.eventDataView = new DataView(fragmentInfo.eventDataBuffer);

		// console.log('INSERTING FRAGMENT EVENT NOW');
		// console.log(fragmentInfo);

		//encode the entire event in the eventDataBuffer
		this.wsh.encodeEventInBuffer(fragmentInfo.eventData, fragmentInfo.eventDataView, 0);

		//push the fragmentInfo into the fragmentEventQueue so we can keep track of it seperately
		this.fragmentedServerToClientEvents.push(fragmentInfo);
	}


	getFragmentId() {
		return this.fragmentIdCounter++;
	}

	cbFragmentSendAck(miscData) {
		// logger.log("info", 'ACK FRAGMENT CALLED');
		// console.log("info", miscData);

		var index = this.fragmentedServerToClientEvents.findIndex((x) => {return x.fragmentId === miscData.fragmentId;});
		if(index >= 0)
		{
			// console.log('ACKING FRAGMENT NUMBNER NOW');
			this.fragmentedServerToClientEvents[index].ackedFragmentNumber++;
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

	serializeUpdateUserRttEvent() {
		return {
			"eventName": "updateUserRtt",
			"userId": this.userId,
			"userRtt": this.rtt
		}
	}

}

exports.UserAgent = UserAgent;
