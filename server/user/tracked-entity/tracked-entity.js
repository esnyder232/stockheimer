const {GlobalFuncs} = require('../../global-funcs.js');
const {TrackedEntityDestroyedState} = require("./tracked-entity-destroyed-state.js");

class TrackedEntity {
	constructor() {
		this.gs = null;
		this.userAgentId = null;

		this.userAgent = null; //direct reference to the user
		this.ent = null; //direct reference to the entity
		
		this.entId = null;
		this.entType = null;
		this.eventQueue = []; //unordered event queue. Events in here will reach the client in any ordered way (whatever fits)
		this.orderedEventQueue = []; //ordered event queue. Events in here will reach the client in the exact order that they were inserted. This is slower than eventQueue, but it ensures order of events.
		this.pa = 0.0;//priority accumulator
		this.paWeight = 1; //original priority weight
		this.isDirty = false;
		this.bAlwaysRegisterUpdate = false;

		this.stateName = "";
		this.state = null;
		this.nextState = null;
	}

	//called when this gets created and put onto the user's trackedEntity array. Only ever called once.
	trackedEntityInit(gs, userAgentId, entType, entId)
	{
		this.gs = gs;
		this.userAgentId = userAgentId;
		this.entType = entType;
		this.entId = entId;

		//get direct reference to user since this will be using it alot
		this.ua = this.gs.uam.getUserAgentByID(this.userAgentId);

		//get direct reference to the entity
		if(entType === "user")
		{
			this.ent = this.gs.um.getUserByID(this.entId);
		}
		else if(entType === "gameobject")
		{
			this.ent = this.gs.gom.getGameObjectByID(this.entId);
		}
		else if(entType === "round")
		{
			this.ent = this.gs.theRound;
		}
		else if(entType === "team")
		{
			this.ent = this.gs.tm.getTeamByID(this.entId);
		}

		this.state = new TrackedEntityDestroyedState(this);
		this.state.enter();
	}

	insertEvent(event) {
		this.eventQueue.push(event);
	}

	insertOrderedEvent(event) {
		this.orderedEventQueue.push(event);
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

	cbCreateAck(miscData) {
		this.eventQueue.push({
			"eventName": "createTrackedEntityAck"
		});
	}

	cbDestroyAck(miscData) {
		this.eventQueue.push({
			"eventName": "destroyTrackedEntityAck"
		});
	}
}

exports.TrackedEntity = TrackedEntity;