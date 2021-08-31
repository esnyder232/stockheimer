//A small class for registering/unregistering callbacks to ambigious events
class EventEmitter {
	constructor(owner) {
		this.eventCallbacks = {};
		this.handleIdCounter = 1;
		this.owner = owner; //owner of the eventEmitter. This owner is passed to each callback when an event is emitted.
		this.unregisterRequestQueue = [];
	}

	eventEmitterDeinit() {
		this.eventCallbacks = {};
		this.owner = null;
		this.unregisterRequestQueue = [];
	}

	//register a callback for an event. Returns a handleId (int). The handleId is used later to unregister.
	//parameters that will be passed to the callback:
	// eventName - the event name
	// owner - the owner of the event emitter
	registerForEvent(eventName, cb) {
		if(this.eventCallbacks[eventName] === undefined) {
			this.eventCallbacks[eventName] = [];
		}

		var cbObj = {
			handleId: this.handleIdCounter,
			cb: cb
		};

		this.eventCallbacks[eventName].push(cbObj);
		this.handleIdCounter++;

		return cbObj.handleId;
	}

	unregisterForEvent(eventName, handleId) {
		this.unregisterRequestQueue.push({
			eventName: eventName,
			handleId: handleId
		});
	}

	/*shortcut for registering a bunch of functions all at once. This also automaticlaly stores the handleId on each object in the eventMappings argument.
	eventMappings format: 
	eventMappings = [
		{eventName: "round-restarting", cb: this.cbEventEmitted.bind(this), handleId: null},
		{eventName: "round-started", cb: this.cbEventEmitted.bind(this), handleId: null},
		...
	]
	*/
	batchRegisterForEvent(eventMappings) {
		for(var i = 0; i < eventMappings.length; i++) {
			var handleId = this.registerForEvent(eventMappings[i].eventName, eventMappings[i].cb);
			eventMappings[i].handleId = handleId;
		}
	}

	batchUnregisterForEvent(eventMappings) {
		for(var i = 0; i < eventMappings.length; i++) {
			this.unregisterForEvent(eventMappings[i].eventName, eventMappings[i].handleId);
		}
	}

	emitEvent(eventName, eventData) {
		if(this.eventCallbacks[eventName] === undefined) {
			return;
		}

		for(var i = 0; i < this.eventCallbacks[eventName].length; i++) {
			this.eventCallbacks[eventName][i].cb(eventName, this.owner, eventData);
		}
	}

	update(dt) {
		if(this.unregisterRequestQueue.length > 0) {
			//splice the callbacks off if any
			for(var i = 0; i < this.unregisterRequestQueue.length; i++) {
				if(this.eventCallbacks[this.unregisterRequestQueue[i].eventName] !== undefined) {
					var index = this.eventCallbacks[this.unregisterRequestQueue[i].eventName].findIndex((x) => {return x.handleId === this.unregisterRequestQueue[i].handleId;});

					if(index >= 0) {
						this.eventCallbacks[this.unregisterRequestQueue[i].eventName].splice(index, 1);
					}
				}
			}

			this.unregisterRequestQueue.length = 0;
		}
	}
}

exports.EventEmitter = EventEmitter;
