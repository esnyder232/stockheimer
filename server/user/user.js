const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');
const {UserDisconnectedState} = require("./user-disconnected-state.js");
const {TrackedEntity} = require("./tracked-entity/tracked-entity.js");

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

		// this.trackedUsers = []; //user pool to track events to determine whether or not the client has instantiated it 
		// this.trackedUsersTransactions = []; //transactions for changes to be made to the trackedUsers array.
		// this.trackedGameObjects = []; //game object pool to track events to determine whether or not the client has instantiated it 
		// this.trackedGameObjectsTransactions = []; //transactions for chnages to be made to the trackedGameObjects array

		// this.trackedObjects = []; //the objects the user needs to be aware of
		// this.trackedObjectsTransactions = []; //the changes made to the trackedObjects array

		this.trackedEvents = []; //for now, these are just one off events that don't have an entity associated with. Ex: "worldStateDone", "gameServerStopped", etc
		// this.trackedFragmentEvents = []; //events that need to be fragmented over several packets

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

		//this.trackedObjects.length = 0;
		// this.trackedObjectsTransactions = [];
		this.trackedEntities.length = 0;
		this.trackedEntityTypeIdIndex = {
			"user": {},
			"gameobject": {}
		}
	}

	// insertTrackedObject(userData) {
	// 	var obj = null;

	// 	if(userData.type == "character")
	// 	{
	// 		var o = this.gs.gom.getGameObjectByID(userData.id);
	// 		if(o !== null)
	// 		{
	// 			obj = {transaction: "insert", type: "character", id: o.id};
	// 		}
	// 	}
	// 	else if(userData.type == "projectile")
	// 	{
	// 		var o = this.gs.gom.getGameObjectByID(userData.id);
	// 		if(o !== null)
	// 		{
	// 			obj = {transaction: "insert", type: "projectile", id: o.id};
	// 		}
	// 	}
	// 	else if(userData.type == "wall")
	// 	{
	// 		obj = {transaction: "insert", type: "wall", id: userData.id};
	// 	}

	// 	if(obj !== null)
	// 	{
	// 		this.trackedObjectsTransactions.push(obj);
	// 		this.isTrackedObjectsDirty = true;
	// 	}
	// }


	// deleteTrackedObject(userData) {
	// 	var obj = null;

	// 	if(userData.type == "character")
	// 	{
	// 		obj = {transaction: "delete", type: "character", id: userData.id};
	// 	}
	// 	else if(userData.type == "projectile")
	// 	{
	// 		obj = {transaction: "delete", type: "projectile", id: userData.id};
	// 	}
	// 	else if(userData.type == "wall")
	// 	{
	// 		obj = {transaction: "delete", type: "wall", id: userData.id};
	// 	}

	// 	if(obj !== null)
	// 	{
	// 		this.trackedObjectsTransactions.push(obj);
	// 		this.isTrackedObjectsDirty = true;
	// 	}
	// }


	
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

		//for now, just process the trackedEvents here
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

		//update the tracked entities
		for(var i = 0; i < this.trackedEntities.length; i++)
		{
			this.trackedEntities[i].update(dt);
		}

		//create any update events for the tracked entities
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
