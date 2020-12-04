const {GlobalFuncs} = require('../global-funcs.js');
const EventSchema = require('../../shared_files/event-schema.json');
const serverConfig = require('../server-config.json');

//load in the event schema and build indexes. Do it outside the class so it only does this step once.
var EventIdIndex = {};
var EventNameIndex = {};

for(var i = 0; i < EventSchema.events.length; i++)
{
	if(EventSchema.events[i] != null && EventSchema.events[i].txt_event_name)
	{
		EventIdIndex[EventSchema.events[i].event_id] = EventSchema.events[i];
		EventNameIndex[EventSchema.events[i].txt_event_name] = EventSchema.events[i];
	}
}

class WebsocketHandler {
	constructor() {
		this.gs = null;
		this.ws = null;

		this.id = null;
		this.userId = null;

		this.localSequence = 0; 	//current local sequence number
		this.remoteSequence = 0;	//most recent remote sequence number
		this.ack = 0;				//most current ack returned by the client
		
		this.localSequenceMaxValue = 65535;

		this.maxPacketSize = 500; //bytes
		this.eventQueues = [];	//2d array (each entry in eventQueues is another array). Each array is a queue for events to be sent to the client.
		this.eventQueuesEventIdIndex = {}; //index for the eventQueues
		this.eventQueuesEventIdReverseIndex = {}; //reverse index of the eventQueuesEventIdIndex. This holds a mapping of "eventQueuesEventIdIndex.index" -> "EventSchema.eventId"
		this.isEventQueuesDirty = false;
		this.currentBytes = 0; //current bytes that are queued up to be written to the current packet
	}

	init(gameServer, userId, ws) {
		this.gs = gameServer;
		this.userId = userId;
		this.ws = ws;

		//calculate maxPacketSize through config values
		this.maxPacketSize = Math.round(serverConfig.max_allowed_bandwidth_bits / (serverConfig.max_players * serverConfig.fps * 8));
				
		//setup actual websocket callbacks
		ws.on("close", this.onclose.bind(this));
		ws.on("error", this.onerror.bind(this));
		ws.on("message", this.onmessage.bind(this));
		ws.on("pong", this.onpong.bind(this));
		ws.binaryType = 'arraybuffer';

		for(var i = 0; i < EventSchema.events.length; i++)
		{
			this.eventQueues.push([]);
			this.eventQueuesEventIdIndex[EventSchema.events[i].event_id] = i;
			this.eventQueuesEventIdReverseIndex[i] = EventSchema.events[i];
		}
	}

	onclose(code, reason) {
		console.log('Websocket-handler. websocket is now closed. Id: ' + this.id + '. userId: ' + this.userId);
		if(code || reason)
		{
			console.log("Code: " + code + ". Reason: " + reason);
		}
		
		this.gs.gameState.websocketClosed(this);
	}

	onerror(e) {
		console.log("Websocket Errored for id: " + this.id + ". Error:" + e);
		this.gs.gameState.websocketErrored(this);
	}

	onpong(e) {
		console.log('socket onpong: ' + e);
	}

	onmessage(e) {
		var user = this.gs.um.getUserByID(this.userId);
		var view = new DataView(e);
		var n = 0; //number of bytes in
		var m = 0; //event count
		var bytesRead = 0;

		//parse the packet header
		this.remoteSequence = view.getUint16(n);
		n += 2;
		bytesRead += 2;

		this.ack = view.getUint16(n);
		n += 2;
		bytesRead += 2;
		
		m = view.getUint8(n); //event count
		n++;
		bytesRead += 1;

		//start going through the events
		for(var i = 0; i < m; i++)
		{
			var eventId = view.getUint8(n);
			n++;
			bytesRead += 1;

			var schema = EventIdIndex[eventId];

			if(schema) 
			{
				var eventData = {};
				eventData.eventName = schema.txt_event_name;

				//go through each parameter for the event
				for(var p = 0; p < schema.parameters.length; p++)
				{
					var value = 0;

					switch(schema.parameters[p].txt_actual_data_type)
					{
						//standard decodings
						case "int8":
							value = view.getInt8(n);
							n++;
							bytesRead++;
							break;
						case "int16":
							value = view.getInt16(n);
							n += 2;
							bytesRead += 2;
							break;
						case "int32":
							value = view.getInt32(n);
							n += 4;
							bytesRead += 4;
							break;
						case "uint8":
							value = view.getUint8(n);
							n++;
							bytesRead++;
							break;
						case "uint16":
							value = view.getUint16(n);
							n += 2;
							bytesRead += 2;
							break;
						case "uint32":
							value = view.getUint32(n);
							n += 4;
							bytesRead += 4;
							break;
						case "str8":
							value = "";

							//string length
							var l = view.getUint8(n);
							n++;
							bytesRead++;

							//string value
							for(var j = 0; j < l; j++)
							{
								value += String.fromCharCode(view.getUint16(n)); 
								n += 2;
								bytesRead += 2;
							}
							break;
						case "str16":
							value = "";

							//string length
							var l = view.getUint16(n);
							n++;
							bytesRead++;

							//string value
							for(var j = 0; j < l; j++)
							{
								value += String.fromCharCode(view.getUint16(n)); 
								n += 2;
								bytesRead += 2;
							}
							break;
						case "str32":
							value = "";

							//string length
							var l = view.getUint32(n);
							n++;
							bytesRead++;

							//string value
							for(var j = 0; j < l; j++)
							{
								value += String.fromCharCode(view.getUint16(n)); 
								n += 2;
								bytesRead += 2;
							}
							break;
						case "float32":
							value = view.getFloat32(n);
							n += 4;
							bytesRead += 4;
							break;

						//Custom decodings
						case "float16p0":
							value = view.getInt16(n)*1;
							n += 2;
							bytesRead += 2;
							break;
						case "float16p1":
							value = view.getInt16(n)*0.1;
							n += 2;
							bytesRead += 2;
							break;
						case "float16p2":
							value = view.getInt16(n)*0.01;
							n += 2;
							bytesRead += 2;
							break;
						case "float16p3":
							value = view.getInt16(n)*0.001;
							n += 2;
							bytesRead += 2;
							break;



						case "float8p0":
							value = view.getInt8(n)*1;
							n++;
							bytesRead++;
							break;
						case "float8p1":
							value = view.getInt8(n)*0.1;
							n++;
							bytesRead++;
							break;
						case "float8p2":
							value = view.getInt8(n)*0.01;
							n++;
							bytesRead++;
							break;
						case "float8p3":
							value = view.getInt8(n)*0.001;
							n++;
							bytesRead++;
							break;


						case "bool":
							value = view.getUint8(n) == 1 ? true : false;
							n++;
							bytesRead++;
							break;
						default:
							//intentionally blank
							break;

					}

					//create the key value pair on eventData
					eventData[schema.parameters[p].txt_param_name] = value;
				}

				user.clientToServerEvents.push(eventData);
			}
		}
	}



	//calculates the currentBytes used in the current packet. Used internally.
	calculateBytesUsed() {
		if(this.isEventQueuesDirty)
		{
			//recalculate the current bytes for the packet
			this.currentBytes = 0;

			//packet header
			this.currentBytes += 2;
			this.currentBytes += 2;

			//event count
			this.currentBytes += 1;

			//calculate the size for each event
			for(var i = 0; i < this.eventQueues.length; i++)
			{
				//see if there were any events queued up for this particular event queue
				if(this.eventQueues[i].length > 0)
				{
					//for each event, calculate the bytes the event would take up
					for(var j = 0; j < this.eventQueues[i].length; j++)
					{
						var eventBytes = this.getEventSize(this.eventQueues[i][j]);

						//add the event bytes to current bytes to be written
						this.currentBytes += eventBytes;
					}
				}
			}
			this.isEventQueuesDirty = false;
		}

	}

	//calculates how many bytes the event will be required for current packet
	getEventSize(eventData) {
		var eventBytes = 0;
		var schema = EventNameIndex[eventData.eventName];

		if(schema)
		{
			eventBytes++; //eventId
			eventBytes += this.getInternalEventSize(schema, eventData);
		}

		return eventBytes;
	}

	//used for the priority system to get information before inserting an event
	canEventFit(eventData) {
		var result = {
			canEventFit: false,
			bytesRequired: 0,
			b_size_varies: false,
			isFragment: false
		};

		var schema = EventNameIndex[eventData.eventName];

		//get bytes required
		result.bytesRequired = this.getEventSize(eventData);
		result.b_size_varies = schema.b_size_varies;

		//calculate current bytes
		this.calculateBytesUsed();

		//see if it can fit
		result.canEventFit = result.bytesRequired <= (this.maxPacketSize - this.currentBytes);

		//see if its a fragment
		if(eventData.eventName == "fragmentStart" || eventData.eventName == "fragmentContinue" || eventData.eventName == "fragmentEnd")
		{
			result.isFragment = true;
		}

		return result;
	}

	//insert the event into the eventQueues
	insertEvent(eventData, cbAck) {
		var schema = EventNameIndex[eventData.eventName];
		if(schema !== undefined)
		{
			var eventQueueIndex = this.eventQueuesEventIdIndex[schema.event_id];

			if(eventQueueIndex !== undefined)
			{
				//finally, insert the event
				this.eventQueues[eventQueueIndex].push(eventData);
				this.isEventQueuesDirty = true;
			}
		}
	}

	//helper function for websocke-handler. This just finds the bytes required for the internals for an event WITHOUT including the event header
	getInternalEventSize(schema, eventData) {
		var eventBytes = 0;

		//check the length of event to make sure it fits
		//there is a variable sized parameter (most likely a string)
		if(schema !== undefined && schema.b_size_varies)
		{
			//find the variable length parameters, and determine the bytes required
			for(var p = 0; p < schema.parameters.length; p++)
			{
				if(schema.parameters[p].b_size_varies)
				{
					switch(schema.parameters[p].txt_actual_data_type)
					{
						case "str8": 
							var s = eventData[schema.parameters[p].txt_param_name];
							if(s)
							{
								eventBytes += 1 + (s.length*2);
							}
							break;
						case "str16": 
							var s = eventData[schema.parameters[p].txt_param_name];
							if(s)
							{
								eventBytes += 2 + (s.length*2);
							}
							break;
						case "str32": 
							var s = eventData[schema.parameters[p].txt_param_name];
							if(s)
							{
								eventBytes += 4 + (s.length*2);
							}
							break;
						case "dataBuffer8": 
							var db = eventData[schema.parameters[p].txt_param_name];
							if(db)
							{
								eventBytes += 1 + (db.byteLength);
							}
							break;
						default:
							//intentionally blank
							break;
					}
				}
				else
				{
					eventBytes += schema.parameters[p].min_bytes;
				}
			}
		}
		else
		{
			eventBytes += schema.sum_min_bytes;
		}

		return eventBytes;
	}


	//encode the event in the buffer at the nth byte. This is assuming the buffer is big enough already to fit the event.
	//the "view" is a DataView for a buffer (javascript stuff)
	encodeEventInBuffer(eventData, view, n)
	{
		var oldN = n;

		var schema = EventNameIndex[eventData.eventName];

		if(schema !== null)
		{
			//event header
			view.setUint8(n, schema.event_id);
			n++;

			//go through the parameters and encode each one
			for(var p = 0; p < schema.parameters.length; p++)
			{
				var value = eventData[schema.parameters[p].txt_param_name];
				switch(schema.parameters[p].txt_actual_data_type)
				{
					//standard encoding
					case "int8":
						view.setInt8(n, value);
						n++;
						break;
					case "int16":
						view.setInt16(n, value);
						n += 2;
						break;
					case "int32":
						view.setInt32(n, value);
						n += 4;
						break;
					case "uint8":
						view.setUint8(n, value);
						n++;
						break;
					case "uint16":
						view.setUint16(n, value);
						n += 2;
						break;
					case "uint32":
						view.setUint32(n, value);
						n += 4;
						break;
					case "str8":
						//string length
						view.setUint8(n, value.length);
						n++;

						//string value
						for(var j = 0; j < value.length; j++)
						{
							view.setUint16(n, value.charCodeAt(j)); 
							n += 2;
						}
						break;
					case "str16":
						//string length
						view.setUint16(n, value.length);
						n += 2;

						//string value
						for(var j = 0; j < value.length; j++)
						{
							view.setUint16(n, value.charCodeAt(j)); 
							n += 2;
						}
						break;
					case "str32":
						//string length
						view.setUint32(n, value.length);
						n += 4;

						//string value
						for(var j = 0; j < value.length; j++)
						{
							view.setUint16(n, value.charCodeAt(j)); 
							n += 2;
						}
						break;
					case "float32":
						view.setFloat32(n, value);
						n += 4;
						break;

					//Custom encodings
					case "float16p0":
						view.setInt16(n, Math.round(value/1));
						n += 2;
						break;
					case "float16p1":
						view.setInt16(n, Math.round(value/0.1));
						n += 2;
						break;
					case "float16p2":
						view.setInt16(n, Math.round(value/0.01));
						n += 2;
						break;
					case "float16p3":
						view.setInt16(n, Math.round(value/0.001));
						n += 2;
						break;

					case "float8p0":
						view.setInt8(n, Math.round(value/1));
						n++;
						break;
					case "float8p1":
						view.setInt8(n, Math.round(value/0.1));
						n++;
						break;
					case "float8p2":
						view.setInt8(n, Math.round(value/0.01));
						n++;
						break;
					case "float8p3":
						view.setInt8(n, Math.round(value/0.001));
						n++;
						break;

					case "bool":
						view.setUint8(n, value ? 1 : 0);
						n++;
						break;

					case "dataBuffer8":
						//buffer length
						view.setUint8(n, value.byteLength);
						n++;

						var dv = new DataView(value);
						
						//buffer value (there is probably a way to slice directly from the value databuffer to the ACTUAL packet databuffer...but I couldn't figure it out :P)
						for(var j = 0; j < dv.byteLength; j++)
						{
							view.setUint8(n, dv.getUint8(j));
							n += 1;
						}
						break;
					default:
						//intentionally blank
						break;
				}
			}
		}

		return n - oldN;
	}


	createPacketForUser() {
		//console.log('creating packet for user: ' + user.username + '    localSequenceNumber: ' + this.localSequence);
		
		var user = this.gs.um.getUserByID(this.userId);
		var buffer = new ArrayBuffer(this.maxPacketSize);
		var view = new DataView(buffer);
		var n = 0; //current byte within the packet
		var m = 0; //number of events

		view.setUint16(0, this.localSequence); //sequence Number
		view.setUint16(2, this.remoteSequence); //ack (most recent remote sequence number)
		n += 4;

		n += 1; //skipping 1 byte for the event count

		this.localSequence++;
		this.localSequence = this.localSequence % this.localSequenceMaxValue;

		var bcontinue = true;

		//start going through the eventQueues
		for(var i = 0; i < this.eventQueues.length; i++)
		{
			if(!bcontinue)
			{
				break;
			}

			if(this.eventQueues[i].length > 0)
			{
				//for each event, envode it into the packet
				for(var j = 0; j < this.eventQueues[i].length; j++)
				{
					var e = this.eventQueues[i][j];
		
					//check the length of event to make sure it fits
					var bytesRequired = this.getEventSize(e);

					if(bytesRequired <= this.maxPacketSize - n)
					{
						//encode the event
						var bytesWritten = this.encodeEventInBuffer(e, view, n);

						if(bytesWritten > 0)
						{
							n += bytesWritten;
							
							//increase event count
							m++;
						}
						else
						{
							console.log('!!!WARNING!!! for event ' + e.eventName + ', the event was queued, but no bytes were written. EventData: ' + JSON.stringify(e));
						}

						//mark the event for deletion (used later when double checking that all events made it through)
						e.isSent = true;
						this.isEventQueuesDirty = true;
					}
					//the packet is full
					else
					{
						bcontinue = false;
					}
				}
			}
		}

		//delete events that were processed, and log a warning when they aren't (should happen, but you never know)
		for(var i = 0; i < this.eventQueues.length; i++)
		{
			if(this.eventQueues[i].length > 0)
			{
				for(var j = this.eventQueues[i].length - 1; j >= 0; j--)
				{
					//console.log('CHECKING IF ' + this.eventQueues[i][j].eventName + " is sent...");
					//doublecheck - log the events that were not sent
					if(!this.eventQueues[i][j].isSent)
					{
						console.log('!!!WARNING!!! - an event was queued with a websocketHandler but was not sent!');
						console.log(' - User: ' + user.username);
						console.log(' - event: ' + JSON.stringify(this.eventQueues[i][j]));
					}

					//check to see if it was a fragment event. If it was, contact the priority manager for feedback.
					if(this.eventQueues[i][j].eventName == "fragmentStart" || this.eventQueues[i][j].eventName == "fragmentContinue" || this.eventQueues[i][j].eventName == "fragmentEnd")
					{
						this.gs.prioritySystem.ackFragment(this.userId, this.eventQueues[i][j]);
					}

					//console.log('Splicing');
					this.eventQueues[i].splice(j, 1);
				}
			}
		}

		view.setUint8(4, m); //payload event count
		this.ws.send(buffer);
	}



	disconnectClient(code, reason) {
		//if its OPEN or CONNECTING
		if(this.ws.readyState === 0 || this.ws.readyState === 1)
		{
			this.ws.close(code, reason);
		}
	}

	update(dt) {
		
		if(this.localSequence >= this.ack && (this.localSequence - this.ack) >= this.gs.inactiveAckThreashold)
		{
			//user timed out. Inactivate them.
			var u = this.gs.um.getUserByID(this.userId);
			console.log('A user has been timed out. username: ' + u.username + '.  userId: ' + u.id);
			this.disconnectClient(1000, "User timed out server side.");
		}
		//sequence wrap around case
		else if(this.localSequence < this.ack && (this.localSequence - (this.ack - this.localSequenceMaxValue)) >= this.gs.inactiveAckThreashold)
		{
			//user timed out. Inactivate them.
			var u = this.gs.um.getUserByID(this.userId);
			console.log('A user has been timed out. username: ' + u.username + '.  userId: ' + u.id);
			this.disconnectClient(1000, "User timed out server side.");
		}
	}
}

exports.WebsocketHandler = WebsocketHandler;