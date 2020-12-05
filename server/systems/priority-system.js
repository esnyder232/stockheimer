const {GlobalFuncs} = require('../global-funcs.js');
const serverConfig = require('../server-config.json');

class PrioritySystem {
	constructor() {
		this.gs = null;
		this.pl = null;
		this.world = null;
		this.globalfuncs = new GlobalFuncs();
		this.fragmentationLimit = Math.round(serverConfig.max_packet_event_bytes_until_fragmentation);
		this.fragmentIdCounter = 0; //ids for fragmentInfos
	}

	init(gs) {
		this.gs = gs;

		this.pl = this.gs.pl;
		this.world = this.gs.world;

	}

	update(dt) {
		var activeUsers = this.gs.um.getActiveUsers();

		for(var i = 0; i < activeUsers.length; i++)
		{
			//process any transactions that occured this frame
			var u = activeUsers[i];
			var wsh = this.gs.wsm.getWebsocketByID(u.wsId);
			
			if(u.isTrackedObjectsDirty)
			{
				if(u.trackedObjectsTransactions.length > 0)
				{
					for(var j = 0; j < u.trackedObjectsTransactions.length; j++)
					{
						var t = u.trackedObjectsTransactions[j];
						switch(t.transaction)
						{
							//insert the object to be tracked
							case "insert":
								//check if the object is already tracked
								var index = u.trackedObjects.findIndex((x) => {return x.id == t.id;});
								var obj = null;

								if(t.type == "character")
								{
									obj = this.gs.gom.getGameObjectByID(t.id);
								}
								else if(t.type == "projectile")
								{
									obj = this.gs.gom.getGameObjectByID(t.id);
								}
								//cheating
								if(t.type == "wall")
								{
									obj = {id: t.id, type: "wall"};
								}

								if(index < 0 && obj !== null)
								{
									var originalPriorityWeight = 1.0;
									
									//create a tracked event for the gameobject
									if(t.type == "character")
									{
										var temp = {
											"eventName": "addActiveCharacter",
											"userId": obj.userId,
											"characterId": obj.id,
											"activeCharacterId": obj.activeId,
											"characterPosX": 0,
											"characterPosY": 0,
											"characterState": "",
											"characterType": ""
										}

										if(obj.plBody !== null)
										{
											var p = obj.plBody.getPosition();
											temp.characterPosX = p.x;
											temp.characterPosY = p.y;
										}

										u.trackedEvents.push(temp);

										//if the character is the user's character, give it a higher priority
										if(obj.userId === u.id)
										{
											originalPriorityWeight = 1000000.0;
										}
										else
										{
											originalPriorityWeight = 10.0;
										}

									}
									else if(t.type == "projectile")
									{
										u.trackedEvents.push({
											"eventName": "addProjectile",
											"id": obj.id,
											"x": obj.xStarting,
											"y": obj.yStarting,
											"angle": obj.angle,
											"size": obj.size
										});
									}

									u.trackedObjects.push({
										id: t.id,
										type: t.type,
										priorityAccumulator: 0.0,
										originalPriorityWeight: originalPriorityWeight,
										actualPriorityWeight: originalPriorityWeight,
										isAwake: true
									});
								}

								break;

							//remove the object to be tracked
							case "delete":
								var index = u.trackedObjects.findIndex((x) => {return x.id == t.id;});
								var obj = null;

								if(t.type == "character")
								{
									obj = this.gs.gom.getGameObjectByID(t.id);
								}
								else if(t.type == "projectile")
								{
									obj = this.gs.gom.getGameObjectByID(t.id);
								}
								//cheating
								else if(t.type == "wall")
								{
									obj = {id: t.id, type: "wall"};
								}

								if(index >= 0 && obj !== null)
								{
									//create a tracked event for the gameobject
									if(t.type == "character")
									{
										u.trackedEvents.push({
											"eventName": "removeActiveCharacter",
											"characterId": obj.id
										});
									}
									else if(t.type == "projectile")
									{
										u.trackedEvents.push({
											"eventName": "removeProjectile",
											"id": obj.id
										});
									}


									u.trackedObjects.splice(index, 1);
								}
								break;
							default:
								//intentionally blank
								break;
						}
					}

					//delete all transactions when done with processing them
					u.trackedObjectsTransactions.length = 0;
					u.isTrackedObjectsDirty = false;

					console.log('priority system: userId: ' + u.id + ", trackedObjects: " + u.trackedObjects.length);
				}
			}

			
			
		
			//update priority accumulator and weights
			for(var j = 0; j < u.trackedObjects.length; j++)
			{
				//check if any tracked objects are sleeping/awake and modify their priority weight
				switch(u.trackedObjects[j].type)
				{
					case "character":
						var c = this.gs.gom.getGameObjectByID(u.trackedObjects[j].id);
						if(c !== null)
						{
							if(c.plBody !== null && c.plBody.isAwake()) {
								u.trackedObjects[j].actualPriorityWeight = u.trackedObjects[j].originalPriorityWeight;
								u.trackedObjects[j].isAwake = true;
							}
							else {
								u.trackedObjects[j].actualPriorityWeight = 0.0;
								u.trackedObjects[j].isAwake = false;
							}
						}
						break;
					case "projectile":
						var p = this.gs.gom.getGameObjectByID(u.trackedObjects[j].id);
						if(p !== null)
						{
							if(p.plBody !== null && p.plBody.isAwake()) {
								u.trackedObjects[j].actualPriorityWeight = u.trackedObjects[j].originalPriorityWeight;
								u.trackedObjects[j].isAwake = true;
							}
							else {
								u.trackedObjects[j].actualPriorityWeight = 0.0;
								u.trackedObjects[j].isAwake = false;
							}
						}
						break;
				}
							
				//update priority accumulator
				if(u.trackedObjects[j].isAwake)
				{
					u.trackedObjects[j].priorityAccumulator += dt * u.trackedObjects[j].actualPriorityWeight;
				}
			}

			//sort the tracked object array
			u.trackedObjects.sort((a, b) => {return b.priorityAccumulator-a.priorityAccumulator});

			//try to create an event for each object based on priority
			if(wsh !== null)
			{
				//this index keeps track of trackedEvents that were sent this frame (used for deletion at the end)
				var indexOfSentTrackedEvents = [];

				//first, see if there are any fragments that we need to queue up in the trackedEvnets. Only send fragments ONE at a time.
				if(u.trackedFragmentEvents.length > 0)
				{
					var fragmentInfo = u.trackedFragmentEvents[0];
										
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
								fragmentId: fragmentInfo.fragmentId //doesn't actually get passed to the client. Just piggy backing off the event for the acknoledgment later.
							};

							//push the fragmentStart event in the queue of other events
							fragmentInfo.n += nextBytes;
							fragmentInfo.currentFragmentNumber++;
							u.trackedEvents.push(fragmentEvent);
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
								fragmentId: fragmentInfo.fragmentId //doesn't actually get passed to the client. Just piggy backing off the event for the acknoledgment later.
							};

							fragmentInfo.n += nextBytes;
							fragmentInfo.currentFragmentNumber++;
							u.trackedEvents.push(fragmentEvent);
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
								fragmentId: fragmentInfo.fragmentId //doesn't actually get passed to the client. Just piggy backing off the event for the acknoledgment later.
							};

							fragmentInfo.n += nextBytes;
							fragmentInfo.currentFragmentNumber++;
							u.trackedEvents.push(fragmentEvent);

							//the entire fragment has been sent. Splice it off the array.(the internet told me splice was faster)
							// console.log("FRAGMENT END SENT");
							// console.log(fragmentInfo);
							u.trackedFragmentEvents.splice(0, 1);
						}
					}
				}

				//second, pack in the trackedEvents (highest priority)
				for(var j = 0; j < u.trackedEvents.length; j++)
				{
					//check if the websocket handler can fit the event
					var info = wsh.canEventFit(u.trackedEvents[j]);

					//check if the size can vary, and the size is big. If it is, we will start fragmentation. Also only do this if its NOT a fragment already
					if(!info.isFragment && info.b_size_varies && info.bytesRequired >= this.fragmentationLimit)
					{	
						var fragmentInfo = {
							bytesRequired: info.bytesRequired,
							eventData: u.trackedEvents[j],
							eventDataBuffer: null,
							eventDataView: null,
							fragmentId: this.fragmentIdCounter,
							n: 0,						//the current byte of the eventDataBuffer we are on
							currentFragmentNumber: 0, 	//the current fragment number we are trying to send in the "trackedEvents"
							ackedFragmentNumber: -1,  	//the most recent acked fragment number that was sent to the client
							maxFragmentNumber: 0		//the max number of fragments we need to send
						};

						this.fragmentIdCounter++;

						//calculate the max fragments required and create the buffer
						fragmentInfo.maxFragmentNumber = Math.ceil(fragmentInfo.bytesRequired / this.fragmentationLimit) - 1;
						fragmentInfo.eventDataBuffer = new ArrayBuffer(fragmentInfo.bytesRequired);
						fragmentInfo.eventDataView = new DataView(fragmentInfo.eventDataBuffer);

						//encode the entire event in the eventDataBuffer
						wsh.encodeEventInBuffer(fragmentInfo.eventData, fragmentInfo.eventDataView, 0);

						//push the fragmentInfo into the trackedFragmentEvents so we can keep track of it seperately
						u.trackedFragmentEvents.push(fragmentInfo);
						indexOfSentTrackedEvents.push(j); //just push it in this queue so it gets spliced off at the end
					}
					//insert the event, and reset the priority accumulator
					else if(info.canEventFit)
					{
						wsh.insertEvent(u.trackedEvents[j]);
						indexOfSentTrackedEvents.push(j);
					}
					else
					{
						//do nothing
						//continue with the tracked objects to see if any others will fit
					}
				}




				//thrid, pack in as many trackedObjects as you can based on the priorityAccumulator
				for(var j = 0; j < u.trackedObjects.length; j++)
				{
					var eventData = null;
		
					if(u.trackedObjects[j].isAwake)
					{
						//construct eventData here
						switch(u.trackedObjects[j].type)
						{
							case "character":
								var c = this.gs.gom.getGameObjectByID(u.trackedObjects[j].id);
								if(c !== null)
								{
									eventData = c.serializeActiveCharacterUpdateEvent();
								}
								break;
							case "projectile":
								var p = this.gs.gom.getGameObjectByID(u.trackedObjects[j].id);
								if(p !== null)
								{
									eventData = p.serializeProjectileUpdate();
								}
								break;
						}

						if(eventData !== null)
						{
							//check if the websocket handler can fit the event
							var info = wsh.canEventFit(eventData);

							//insert the event, and reset the priority accumulator
							if(info.canEventFit)
							{
								wsh.insertEvent(eventData);
								u.trackedObjects[j].priorityAccumulator = 0.0;
							}
							else
							{
								//do nothing
								//continue with the tracked objects to see if any others will fit
							}
						}
					}
				}

				//at the end, splice off the tracked events that we have snet out this frame
				for(var j = indexOfSentTrackedEvents.length - 1; j >= 0; j--)
				{
					u.trackedEvents.splice(indexOfSentTrackedEvents[j], 1);
				}
			}
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

	ackFragment(userId, eventData) {
		// console.log('ACK FRAGMENT CALLED');
		// console.log(eventData);

		var u = this.gs.um.getUserByID(userId);

		if(u !== null && u.trackedFragmentEvents.length > 0)
		{
			var index = u.trackedFragmentEvents.findIndex((x) => {return x.fragmentId == eventData.fragmentId;});
			if(index >= 0)
			{
				u.trackedFragmentEvents[index].ackedFragmentNumber++;
			}
		}
	}


}

exports.PrioritySystem = PrioritySystem;
