const {GlobalFuncs} = require('../../global-funcs.js');
const {TrackedEntityDestroyedState} = require("./tracked-entity-destroyed-state.js");
const serverConfig = require('../../server-config.json');

class TrackedEntity {
	constructor() {
		this.gs = null;
		this.userId = null;

		this.user = null; //direct reference to the user
		this.ent = null; //direct reference to the entity
		
		this.entId = null;
		this.entType = null;
		this.eventQueue = [];
		this.fragmentEventQueue = [];
		this.pa = 0.0;//priority accumulator
		this.paWeight = 1; //original priority weight
		this.isAwake = false;

		this.fragmentIdCounter = 0;
		this.fragmentationLimit = Math.round(serverConfig.max_packet_event_bytes_until_fragmentation);

		this.stateName = "";
		this.state = null;
		this.nextState = null;
	}

	//called when this gets created and put onto the user's trackedEntity array. Only ever called once.
	trackedEntityInit(gs, userId, entType, entId)
	{
		this.gs = gs;
		this.userId = userId;
		this.entType = entType;
		this.entId = entId;

		//get direct reference to user since this will be using it alot
		this.user = this.gs.um.getUserByID(this.userId);

		//get direct reference to the entity
		if(entType === "user")
		{
			this.ent = this.gs.um.getUserByID(this.entId);
		}
		else if(entType === "gameobject")
		{
			this.ent = this.gs.gom.getGameObjectByID(this.entId);
		}

		this.state = new TrackedEntityDestroyedState(this);
		this.state.enter();
	}

	//called when the tracked entity's state is created. 
	trackedEntityCreated() {
		//nothing for now
	}

	//called when the tracked entity's state is destroyed
	trackedEntityDestroyed() {
		this.fragmentEventQueue.length = 0;
	}


	//called when this gets spliced off the user's trackedEntity array. Only ever called once.
	trackedEntityDeinit() {
		this.ent = null;
		this.user = null;
		this.state = null;
		this.nextState = null;
	}

	update(dt) {
		this.state.update();

		if(this.nextState)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}
	}

	createUpdateEvent(dt) {
		this.state.createUpdateEvent(dt);
	}

	getFragmentId() {
		return this.fragmentIdCounter++;
	}

	cbCreateAck() {
		this.eventQueue.push({
			"eventName": "createTrackedEntityAck"
		});
	}

	cbDestroyAck() {
		this.eventQueue.push({
			"eventName": "destroyTrackedEntityAck"
		});
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


}

exports.TrackedEntity = TrackedEntity;