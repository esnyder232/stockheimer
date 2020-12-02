const {GlobalFuncs} = require('../global-funcs.js');

class PrioritySystem {
	constructor() {
		this.gs = null;
		this.pl = null;
		this.world = null;
		this.globalfuncs = new GlobalFuncs();
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
									obj = this.gs.cm.getCharacterByID(t.id);
								}
								else if(t.type == "projectile")
								{
									obj = this.gs.pm.getProjectileByID(t.id);
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
									obj = this.gs.cm.getCharacterByID(t.id);
								}
								else if(t.type == "projectile")
								{
									obj = this.gs.pm.getProjectileByID(t.id);
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
						var c = this.gs.cm.getCharacterByID(u.trackedObjects[j].id);
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
						var p = this.gs.pm.getProjectileByID(u.trackedObjects[j].id);
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

				//first, try to pack in the trackedEvents (highest priority)
				for(var j = 0; j < u.trackedEvents.length; j++)
				{
					//check if the websocket handler can fit the event
					var canFit = wsh.canEventFit(u.trackedEvents[j]);

					//insert the event, and reset the priority accumulator
					if(canFit)
					{
						wsh.insertEvent(u.trackedEvents[j]);
						indexOfSentTrackedEvents.push(j);
					}
					else
					{
						//do nothing
						//continue with the tracked objects to see if any others will fit
						//possibly start a fragmentation if the event allows it.
					}
				}


				//second, pack in as many trackedObjects as you can based on the priorityAccumulator
				for(var j = 0; j < u.trackedObjects.length; j++)
				{
					var eventData = null;
		
					if(u.trackedObjects[j].isAwake)
					{
						//construct eventData here
						switch(u.trackedObjects[j].type)
						{
							case "character":
								var c = this.gs.cm.getCharacterByID(u.trackedObjects[j].id);
								if(c !== null)
								{
									eventData = c.serializeActiveCharacterUpdateEvent();
								}
								break;
							case "projectile":
								var p = this.gs.pm.getProjectileByID(u.trackedObjects[j].id);
								if(p !== null)
								{
									eventData = p.serializeProjectileUpdate();
								}
								break;
						}

						if(eventData !== null)
						{
							//check if the websocket handler can fit the event
							var canFit = wsh.canEventFit(eventData);

							//insert the event, and reset the priority accumulator
							if(canFit)
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
}

exports.PrioritySystem = PrioritySystem;
