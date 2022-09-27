const GlobalFuncs = require('../global-funcs.js');
const {TrackedEntity} = require("./tracked-entity/tracked-entity.js");
const serverConfig = require('../server-config.json');
const logger = require('../../logger.js');
const GameConstants = require('../../shared_files/game-constants.json');

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

		this.fragmentIdCounter = 0;
		this.fragmentationLimit = Math.round(serverConfig.max_packet_event_bytes_until_fragmentation);
		this.fragmentedClientToServerIdIndex = {}; //index for fragmentedClientToServerEvents

		this.fragmentedClientToServerContinueQueue = [];
		this.fragmentedClientToServerEndQueue = [];
		this.fragmentedClientToServerErrorQueue = [];

		this.rtt = 0; //ms
		this.rttCalcTimer = 0; //ms
		this.rttCalcThreshold = 5000; //ms

		//entities to keep track of for this particular user. Events will be sent to the client for creation/destruction/updates/etc.
		this.trackedEntities = []; 

		//index for the trackedEntities array
		this.trackedEntityTypeIdIndex = {
			"user": {},
			"gameobject": {},
			"round": {},
			"team": {}
		}; 

		//transaction for the trackedEntity entries themselves.
		this.trackedEntityTransactions = [];

		/*
		--Optimization--
		The trackedEntityUpdateList is for optimization. It is a list of trackedEntities, and it serves as the list of update() calls to make on those entities.
		Before this optimization, the code used to call update() on EVERY tracked entity no matter what.
		After this optimization, the code only calls the update() on the tracked entities within this list.
		The motivation behind this optimization is that when the game reaches a large amount of gameobjects, the code was calling update() on every tracked entity that was tracking those gameobjects.
		This was reflected in the profiling on prod. The user-agent.update() was getting large based on the number of game objects it was keeping track of.
		
		The purpose of this optimization is to ONLY call a tracked entity's update() when they actually need it. 
		Tracked entities are registered for an update when an event occurs (gameobjects created/deleted, teampoints changed, etc).
		Tracked entities are also registered for an update if they are USUALLY changing through the game. Example:, characters.
		*/
		//the list of tracked entities to call update()
		this.trackedEntityUpdateList = []; 

		//an index to find the tracked entity entries within trackedEntityUpdateList
		this.trackedEntityUpdateListIndex = {
			"user": {},
			"gameobject": {},
			"round": {},
			"team": {}
		}; 

		//a list of transactions to delete entries from trackedEntityUpdateList
		this.trackedEntityUpdateListDeleteTransactions = [];
	}


	getClientToServerFragmentByID(id) {
		var f = null;

		if(this.fragmentedClientToServerIdIndex[id] !== undefined) {
			f = this.fragmentedClientToServerIdIndex[id];
		}

		return f;
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

		this.trackedEntityUpdateList.length = 0;
		this.trackedEntityUpdateListIndex = {
			"user": {},
			"gameobject": {},
			"round": {},
			"team": {}
		}; 
		this.trackedEntityUpdateListDeleteTransactions.length = 0;

		this.fragmentedClientToServerIdIndex = {};
		this.fragmentedClientToServerContinueQueue.length = 0;
		this.fragmentedClientToServerEndQueue.length = 0;
		this.fragmentedClientToServerErrorQueue.length = 0;
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
		if(this.user.bOkayToBeInTheGame) {
			var existingEnt = this.findTrackedEntity(type, id);

			if(existingEnt === null) {
				var e = new TrackedEntity();
				e.trackedEntityInit(this.gs, this.id, type, id);
	
				this.trackedEntities.push(e);
				this.updateTrackedEntityIndex(type, id, e, "create");
	
				//for now, just set priority weights here
				if(e.entType == "gameobject") {
					if(e.ent.type == "character") {
						//if the character belongs to this user, give it a high priority
						if(e.ent.ownerType === "user" && e.ent.ownerId == this.userId) {
							e.paWeight = 1000;
						}
						else {
							e.paWeight = 10;
						}
					}
					else {
						e.paWeight = 1;
					}
				}
				else {
					e.paWeight = 1;
				}
	
				e.insertEvent({
					"eventName": "createTrackedEntity",
				});
			}
	
			//register for it to be updated
			this.registerTrackedEntityUpdateList(type, id);
		}
	}

	//this just translates the current state of the fragment to an error code
	getFragmentErrorCodeState(existingFragmentInfo) {
		var errorCode = GameConstants.FragmentErrorCodes["FRAGMENT_STATE_IS_ERROR"];
		switch(existingFragmentInfo.fragmentState) {
			case GameConstants.FragmentStates["FRAGMENT_CONTINUE"]:
				errorCode = GameConstants.FragmentErrorCodes["FRAGMENT_STATE_IS_CONTINUE"];
				break;
			case GameConstants.FragmentStates["FRAGMENT_END"]:
				errorCode = GameConstants.FragmentErrorCodes["FRAGMENT_STATE_IS_END"];
				break;
			case GameConstants.FragmentStates["FRAGMENT_ERROR"]:
				errorCode = GameConstants.FragmentErrorCodes["FRAGMENT_STATE_IS_ERROR"];
				break;
		}
		return errorCode;
	}

	fromClientFragmentEvent(e) {
		// console.log("Total: " + this.fragmentedClientToServerEvents.length + ". Continue: " + this.fragmentedClientToServerContinueQueue.length + ". End: " + this.fragmentedClientToServerEndQueue.length + ". Error:" + 
		// 	this.fragmentedClientToServerErrorQueue.length);
		var bError = false;
		var errorCode = GameConstants.FragmentErrorCodes["NONE"];
		var putFragmentInErrorQueue = false;
		var fragmentInfo = null;

		switch(e.eventName) {
			case "fromClientFragmentStart":
				//see if the fragment exists already (meaning the state must be continued/ended/errored)
				var temp = this.getClientToServerFragmentByID(e.fragmentId);
				if(temp !== null) {
					errorCode = this.getFragmentErrorCodeState(temp);
					bError = true;
				} else {
					fragmentInfo = {
						fragmentState: GameConstants.FragmentStates["FRAGMENT_START"],
						fragmentLength: e.fragmentLength,
						fragmentData: null,
						fragmentDataView: null,
						fragmentId: e.fragmentId,
						n: 0,
						timeAcc: 0		//time accumulated for timeout
					};
					this.fragmentedClientToServerEvents.push(fragmentInfo);
					this.fragmentedClientToServerIdIndex[fragmentInfo.fragmentId] = fragmentInfo;
				}

				//validate length
				if(!bError && e.fragmentLength > GameConstants.Fragments["MAX_TOTAL_BYTES"]) {
					errorCode = GameConstants.FragmentErrorCodes["FRAGMENT_DATA_TOO_LONG"];
					bError = true;
					putFragmentInErrorQueue = true;
				}

				//if no error, process the fragment like normal
				if(!bError) {
					//create data buffer and view for the data coming in
					fragmentInfo.fragmentData = new ArrayBuffer(e.fragmentLength),
					fragmentInfo.fragmentDataView = new DataView(fragmentInfo.fragmentData);

					errorCode = this.copyFragmentDataFromEventToInfo(e.fragmentData, fragmentInfo, false);
					
					if(errorCode !== GameConstants.FragmentErrorCodes["NONE"]) {
						bError = true;
						putFragmentInErrorQueue = true;
					}
					//if there was no copy error, push it to the next queue (continue)
					else {
						fragmentInfo.fragmentState = GameConstants.FragmentStates["FRAGMENT_CONTINUE"];
						this.fragmentedClientToServerContinueQueue.push(fragmentInfo);
					}
				}

				break;
			case "fromClientFragmentContinue":
				//check if the fragment exists
				fragmentInfo = this.getClientToServerFragmentByID(e.fragmentId);
				if(fragmentInfo === null) {
					errorCode = GameConstants.FragmentErrorCodes["FRAGMENT_NOT_FOUND"];
					bError = true;
				} 
				
				//check the state of the fragment
				if(!bError && fragmentInfo.fragmentState !== GameConstants.FragmentStates["FRAGMENT_CONTINUE"]) {
					errorCode = this.getFragmentErrorCodeState(fragmentInfo);
					bError = true;
				}

				//if no error, continue process the fragment like normal
				if(!bError) {
					fragmentInfo.timeAcc = 0;
					errorCode = this.copyFragmentDataFromEventToInfo(e.fragmentData, fragmentInfo, false);
					
					if(errorCode !== GameConstants.FragmentErrorCodes["NONE"]) {
						bError = true;
						putFragmentInErrorQueue = true;
					}
				}

				break;
			case "fromClientFragmentEnd":
				//check if the fragment exists
				fragmentInfo = this.getClientToServerFragmentByID(e.fragmentId);
				if(fragmentInfo === null) {
					errorCode = GameConstants.FragmentErrorCodes["FRAGMENT_NOT_FOUND"];
					bError = true;
				} 
				
				//check the state of the fragment
				if(!bError && fragmentInfo.fragmentState !== GameConstants.FragmentStates["FRAGMENT_CONTINUE"]) {
					errorCode = this.getFragmentErrorCodeState(fragmentInfo);
					bError = true;
				}

				//if no error, continue process the fragment like normal
				if(!bError) {
					errorCode = this.copyFragmentDataFromEventToInfo(e.fragmentData, fragmentInfo, true);

					
					if(errorCode !== GameConstants.FragmentErrorCodes["NONE"]) {
						bError = true;
						putFragmentInErrorQueue = true;
					} 
					//if no error from copying the data, then the fragment is completed, and we can now decode it an parse it like normal.
					else {
						this.wsh.decodeEvent(0, fragmentInfo.fragmentDataView, fragmentInfo.fragmentDataView.byteLength);
						fragmentInfo.fragmentState = GameConstants.FragmentStates["FRAGMENT_END"];

						//splice it off the continue queue if it exists (thats the only queue it could possibly exist in if it is ended)
						var index = this.fragmentedClientToServerContinueQueue.findIndex(x => x.fragmentId === fragmentInfo.fragmentId);
						if(index >= 0) {
							this.fragmentedClientToServerContinueQueue.splice(index, 1);
						}
		
						//push it into end queue
						this.fragmentedClientToServerEndQueue.push(fragmentInfo);
					}
				}
				break;
		}


		//if there was an error, send an error back to the client
		if(bError) {
			this.insertServerToClientEvent({
				"eventName": "fragmentError",
				"fragmentId": e.fragmentId,
				"fragmentErrorCode": errorCode
			});

			logger.log("info", 'Fragment Error occured. UserName: ' + this.user?.username + ". Error code: " + errorCode + ". FragmentInfo: " + JSON.stringify(fragmentInfo));

			//if there was a serious error, send the fragment info to the error queue so it doesn't get processed ever again
			if(putFragmentInErrorQueue && fragmentInfo !== null) {
				fragmentInfo.fragmentState = GameConstants.FragmentStates["FRAGMENT_ERROR"];

				//splice it off the continue queue if it exists (thats the only queue it could possibly exist in if it errored)
				var index = this.fragmentedClientToServerContinueQueue.findIndex(x => x.fragmentId === fragmentInfo.fragmentId);
				if(index >= 0) {
					this.fragmentedClientToServerContinueQueue.splice(index, 1);
				}

				//push it into error queue
				this.fragmentedClientToServerErrorQueue.push(fragmentInfo);
			}
		}
	}


	//This attempts to copy the fragment event to the fragment info.
	//It returns a fragment error code from GameConstants.FragmentErrorCodes if there is an error.
	//It returns GameConstants.FragmentErrorCodes["NONE"] if no error occured.
	copyFragmentDataFromEventToInfo(eventFragmentData, fragmentInfo, isFinalFragment) {
		var bError = false;
		var errorCode = GameConstants.FragmentErrorCodes["NONE"];
		var dv = new DataView(eventFragmentData);

		//check to make sure the resulting data isn't too long
		if(fragmentInfo.n + dv.byteLength > fragmentInfo.fragmentLength) {
			bError = true;
			errorCode = GameConstants.FragmentErrorCodes["FRAGMENT_RESULT_TOO_LONG"];
		}

		//if no error, copy the fragment in event to the fragmentInfo
		if(!bError) {
			for(var j = 0; j < dv.byteLength; j++)
			{
				fragmentInfo.fragmentDataView.setUint8(fragmentInfo.n, dv.getUint8(j));
				fragmentInfo.n++;
			}	
		}

		//if its the final fragment, check to make sure the resulting data isn't too short
		if(!bError && isFinalFragment && fragmentInfo.n < fragmentInfo.fragmentLength) {
			bError = true;
			errorCode = GameConstants.FragmentErrorCodes["FRAGMENT_RESULT_TOO_SHORT"];
		}

		return errorCode;
	}
	


	//this pushes an event to the tracked entity to delete itself. (like a soft delete)
	//The tracked entity will create a "permDeleteTrackedEntity" transaction itself if it detects it won't be created again. The "permDeleteTrackedEntity" will ACTUALLY delete the tracked entity from the list
	deleteTrackedEntity(type, id) {
		if(this.user.bOkayToBeInTheGame) {
			var e = this.findTrackedEntity(type, id);

			if(e !== null) {
				e.insertEvent({
					"eventName": "deleteTrackedEntity",
				});
	
				
				//register the tracked entity for an update call
				this.registerTrackedEntityUpdateList(type, id);
			}
		}
	}

	//this actually removes the tracked entity from the list.
	//this is called from the actual tracked entity itself
	permDeleteTrackedEntity(type, id) {
		if(this.user.bOkayToBeInTheGame) {
			this.trackedEntityTransactions.push({
				"transaction": "permDeleteTrackedEntity",
				"type": type,
				"id": id
			});
	
			
			//unregister the tracked entity for an update call
			this.unregisterTrackedEntityUpdateList(type, id);
	
			//logger.log("info", 'User tracked Entity marked for deletion. User: ' + this.username + ". Entity Type: " + type + ". Entity Id: " + id);
		}
	}

	updateTrackedEntityIndex(type, id, obj, transaction) {
		if(transaction == "create") {
			this.trackedEntityTypeIdIndex[type][id] = obj;
		}
		else if(transaction == "delete") {
			if(this.trackedEntityTypeIdIndex[type][id] !== undefined) {
				delete this.trackedEntityTypeIdIndex[type][id];
			}
		}
	}

	insertTrackedEntityEvent(entType, entId, event) {
		if(this.user.bOkayToBeInTheGame) {
			var e = this.findTrackedEntity(entType, entId);

			if(e !== null) {
				e.insertEvent(event);
	
				//register the tracked entity for an update call
				this.registerTrackedEntityUpdateList(entType, entId);
			}
		}
	}

	insertTrackedEntityOrderedEvent(entType, entId, event) {
		if(this.user.bOkayToBeInTheGame) {
			var e = this.findTrackedEntity(entType, entId);

			if(e !== null) {
				e.insertOrderedEvent(event);
	
				//register the tracked entity for an update call
				this.registerTrackedEntityUpdateList(entType, entId);
			}
		}
	}


	findTrackedEntity(type, id) {
		if(this.trackedEntityTypeIdIndex[type][id]) {
			return this.trackedEntityTypeIdIndex[type][id];
		}
		else {
			return null;
		}
	}

	registerTrackedEntityUpdateList(entType, entId) {
		var ent = this.findTrackedEntity(entType, entId);

		//make sure the entity actually exists first (not sure why it wouldn't at this point, but just to be safe)
		if(ent !== null) {
			var entry = this.findTrackedEntityUpdateList(entType, entId);

			if(entry === null) {
				entry = {
					entType: entType,
					entId: entId,
					ent: ent,
					deleteMe: false	
				}
	
				this.trackedEntityUpdateList.push(entry)
	
				this.updateTrackedEntityUpdateListIndex(entType, entId, entry, "create");
			}

			// console.log("user-agent (" + this.user.username + ") - now ADDING tracked entity to UPDATE LIST: " + entType + ", id: " + entId);

			//also reset the deleteMe flag (sometimes tracked entities are unregistered, then reregistered in the same frame)
			entry.deleteMe = false;
		}
	}

	findTrackedEntityUpdateList(entType, entId) {
		if(this.trackedEntityUpdateListIndex[entType][entId]) {
			return this.trackedEntityUpdateListIndex[entType][entId];
		}
		else {
			return null;
		}
	}

	unregisterTrackedEntityUpdateList(entType, entId) {
		var ent = this.findTrackedEntity(entType, entId);

		if(ent !== null) {
			var entry = this.findTrackedEntityUpdateList(entType, entId);
			if(entry !== null) {
				entry.deleteMe = true;

				// console.log("user-agent (" + this.user.username + ") - now SUBTRACTING tracked entity from UPDATE LIST: " + entType + ", id: " + entId);

				this.trackedEntityUpdateListDeleteTransactions.push({
					entType: entType,
					entId: entId
				});
			}
		}
	}

	updateTrackedEntityUpdateListIndex(entType, entId, obj, transaction) {
		if(transaction === "create") {
			this.trackedEntityUpdateListIndex[entType][entId] = obj;
		}
		else if(transaction === "delete") {
			if(this.trackedEntityUpdateListIndex[entType][entId] !== undefined) {
				delete this.trackedEntityUpdateListIndex[entType][entId];
			}
		}
	}

	update(dt) {
		//debugging fragments
		// console.log("Total: " + this.fragmentedClientToServerEvents.length + ". Continue: " + this.fragmentedClientToServerContinueQueue.length + ". End: " + this.fragmentedClientToServerEndQueue.length + ". Error:" + 
		// 	this.fragmentedClientToServerErrorQueue.length);

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

		//update fragment list to see if any timed out
		for(var i = this.fragmentedClientToServerContinueQueue.length - 1; i >= 0; i--) {
			this.fragmentedClientToServerContinueQueue[i].timeAcc += dt;
			if(this.fragmentedClientToServerContinueQueue[i].timeAcc >= this.gs.inactivePeriod) {
				this.insertServerToClientEvent({
					"eventName": "fragmentError",
					"fragmentId": this.fragmentedClientToServerContinueQueue[i].fragmentId,
					"fragmentErrorCode": GameConstants.FragmentErrorCodes["FRAGMENT_TIMEOUT"]
				});
	
				logger.log("info", 'Fragment Error occured. UserName: ' + this.user?.username + ". Error code: " + GameConstants.FragmentErrorCodes["FRAGMENT_TIMEOUT"] + 
					". FragmentInfo: " + JSON.stringify(this.fragmentedClientToServerContinueQueue[i]));
				this.fragmentedClientToServerContinueQueue[i].fragmentState = GameConstants.FragmentStates["FRAGMENT_ERROR"];

				//push it into error queue
				this.fragmentedClientToServerErrorQueue.push(this.fragmentedClientToServerContinueQueue[i]);

				//splice it off the continue queue
				this.fragmentedClientToServerContinueQueue.splice(i, 1);
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

		//run through an update for the entities from the tracked entity update list
		//add to the priority accumulator for tracked entities
		for(var i = 0; i < this.trackedEntityUpdateList.length; i++) {
			this.trackedEntityUpdateList[i].ent.pa += dt * this.trackedEntityUpdateList[i].ent.paWeight;
		}

		//sort tracked entities
		this.trackedEntityUpdateList.sort((a, b) => {return b.ent.pa-a.ent.pa});

		//third, update the tracked entities
		for(var i = 0; i < this.trackedEntityUpdateList.length; i++) {
			// console.log("user-agent (" + this.user.username + ") - now updating tracked entity: " + this.trackedEntityUpdateList[i].entType + ", id: " + this.trackedEntityUpdateList[i].entId); 
			this.trackedEntityUpdateList[i].ent.update(dt);
		}

		//if there are any tracked entities in the update list that need to be unregistered, do it now
		while(this.trackedEntityUpdateListDeleteTransactions.length > 0) {
			var transaction = this.trackedEntityUpdateListDeleteTransactions.shift();
			var entry = this.findTrackedEntityUpdateList(transaction.entType, transaction.entId);
			if(entry !== null && entry.deleteMe) {
				var entryIndex = this.trackedEntityUpdateList.findIndex((x) => {return x.entType === entry.entType && x.entId === entry.entId;});
				if(entryIndex >= 0) {
					// console.log("user-agent (" + this.user.username + ") - now splicing tracked entity from UPDATE list: " + entry.entType + ", id: " + entry.entId);

					//update the update list's index
					this.updateTrackedEntityUpdateListIndex(entry.entType, entry.entId, entry.ent, "delete");

					//finally, splice off the entry from the update list
					this.trackedEntityUpdateList.splice(entryIndex, 1);
				}
			}
		}

		//if there was any tracked entities that need to be deleted, delete them now
		if(this.trackedEntityTransactions.length > 0) {
			for(var i = 0; i < this.trackedEntityTransactions.length; i++) {
				if(this.trackedEntityTransactions[i].transaction === "permDeleteTrackedEntity") {
					//delete the tracked entity and update index
					var index = this.trackedEntities.findIndex((x) => {return x.entType === this.trackedEntityTransactions[i].type && x.entId === this.trackedEntityTransactions[i].id;});

					if(index >= 0) {
						//logger.log("info", 'Splicing off tracked entity. User: ' + this.username + ". Entity type: " + this.trackedEntities[index].entType + ". Entity Id: " + this.trackedEntities[index].entId);

						// console.log("user-agent (" + this.user.username + ") - now splicing tracked entity PERIOD: " + this.trackedEntities[index].entType + ", id: " + this.trackedEntities[index].entId);
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

	//call this to force disconnect the user. It will eventually flip the "bDisconnected" flag, which will safely remove the user from the game.
	forceDisconnect(reason) {
		if(this.wsh !== null) {
			this.wsh.disconnectClient(1000, reason);
		}
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
