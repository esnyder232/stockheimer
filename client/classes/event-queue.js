import GlobalFuncs from "../global-funcs.js"

/*
	This event queue is used to hold onto events that are delievered from the server.
	Events flow from the event-processor to these event queues.
*/
export default class EventQueue {
	constructor() {
		this.gc = null;
		this.globalfuncs = null;

		this.eventQueue = [];
		this.orderedEventQueue = [];

		this.eventMapping = {};
	}

	eventQueueInit(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();
	}
	
	deinit() {
		this.gc = null;
		this.globalfuncs = null;
	}

	insertEvent(e) {
		this.eventQueue.push(e);
	}

	insertOrderedEvent(e) {
		this.orderedEventQueue.push(e);
	}

	registerToEvent(eventName, cb) {
		this.eventMapping[eventName] = cb;
	}

	unregisterFromEvent(eventName) {
		if(this.eventMapping[eventName] !== undefined) {
			delete this.eventMapping[eventName];
		}
	}

	batchRegisterToEvent(eventMapping) {
		for(var key in eventMapping) {
			if (eventMapping.hasOwnProperty(key)) {
				this.registerToEvent(key, eventMapping[key]);
			}
		}
	}

	batchUnregisterFromEvent(eventMapping) {
		for(var key in eventMapping) {
			if (eventMapping.hasOwnProperty(key)) {
				this.unregisterFromEvent(key);
			}
		}
	}


	//if an ordered event exits, process only 1 per frame. This gives other systems a chance to react to the event for the frame.
	processOrderedEvents() {
		if(this.orderedEventQueue.length > 0) {
			var e = this.orderedEventQueue.shift();
			
			if(this.eventMapping[e.eventName] !== undefined) {
				this.eventMapping[e.eventName](e);
			}
		}
	}

	//process all unordered events
	processEvents() {
		for(var i = 0; i < this.eventQueue.length; i++) {
			var e = this.eventQueue[i];

			if(this.eventMapping[e.eventName] !== undefined) {
				this.eventMapping[e.eventName](e);
			}
		}

		this.eventQueue.length = 0;
	}
}

