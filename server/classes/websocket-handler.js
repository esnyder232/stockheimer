const EventSchema = require('../../shared_files/event-schema.json');
const serverConfig = require('../server-config.json');
const logger = require("../../logger.js");

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
		this.userAgentId = null;
		this.userAgent = null; //direct reference

		this.localSequence = 0; 	//current local sequence number
		this.remoteSequence = 0;	//most recent remote sequence number
		this.ack = -1;				//most current ack returned by the client
		
		this.localSequenceMaxValue = 600;
		this.remoteSequenceMaxValue = 600;
		this.prevRemoteSequence = this.remoteSequenceMaxValue-1;

		this.maxPacketSize = 100; 					//bytes. Dynamically set based on current number of players and max bandwidth set in server config.
		this.MTU = 1000; 							//bytes. following Glenn Fiedler's advice. 1000 bytes for MTU just to be safe from IP fragmentation
		this.eventQueues = [];						//2d array (each entry in eventQueues is another array). Each array is a queue for events to be sent to the client.
		this.eventQueuesEventIdIndex = {};			//index for the eventQueues
		this.eventQueuesEventIdReverseIndex = {}; 	//reverse index of the eventQueuesEventIdIndex. This holds a mapping of "eventQueuesEventIdIndex.index" -> "EventSchema.eventId"		
		this.currentBytes = 0; 						//current bytes that are queued up to be written to the current packet
		this.headerBytes = 5;						//amount of bytes for the header information. currentBytes gets reset to this at the end of every frame.
													//packet header: 4 bytes
													//event counter: 1 byte

		this.sentPacketHistory = []; //array of sent packet data. This doesn't actually hold the packet payload, but it holds the sent/ack callbacks, and timeSent and timeAcked for each packet for ping calculation
									 //This is index by the packet sequence number.
		this.rttPacketHistoryLength = 60; //the number of packets to look back from the local sequence number to calculate the rtt

		this.recievedPacketQueue = [];

		this.wsSendOptions = {};
		this.wsSendBuffer = null;
		this.bPacketValidationError = false;		//flag to force disconnect the client on update.
	}

	init(gameServer, userId, userAgentId, ws) {
		this.gs = gameServer;
		this.userId = userId;
		this.userAgentId = userAgentId;
		this.ws = ws;
		this.userAgent = this.gs.uam.getUserAgentByID(this.userAgentId);
		this.wsSendOptions = {
			binary: true,
			compress: false
		};
		this.wsSendBuffer = new ArrayBuffer(this.MTU);
		this.currentBytes = this.headerBytes;
				
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

		for(var i = 0; i <= this.localSequenceMaxValue; i++)
		{
			this.sentPacketHistory.push({
				ackCallbacks: [],
				sendCallbacks: [],
				timeSent: 0,
				timeAcked: 0
			});
		}
	}

	//Remove all ack/send callbacks for the websocket handler. 
	//This should only be called when the user leaves the game and is currently resetting its user-agent for rejoining/map rotation.
	removeAllCallbacks() {
		for(var i = 0; i < this.sentPacketHistory.length; i++) {
			this.sentPacketHistory[i].ackCallbacks.length = 0;
			this.sentPacketHistory[i].sendCallbacks.length = 0;
		}
	}


	//should be called whenever a user joins/leaves the server to adjust max packet size for existing users
	updateMaxPacketSize() {
		var currentPlayers = this.gs.um.getActiveUsers().length;

		this.maxPacketSize = Math.round(serverConfig.max_allowed_bandwidth_bits / (currentPlayers * serverConfig.fps * 8));

		if(this.maxPacketSize > this.MTU)
		{
			this.maxPacketSize = this.MTU;
		}
	}

	onclose(code, reason) {
		if(code || reason)
		{
			logger.log("info", "Websocket-handler. websocket is now closed. Id: " + this.id + '. userId: ' + this.userId + ". Code: " + code + ". Reason: " + reason);
		}
		
		this.gs.websocketClosed(this);
	}

	onerror(e) {
		logger.log("info", "Websocket Errored for id: " + this.id + ". Error:" + e);
		this.gs.websocketErrored(this);
	}

	onpong(e) {
		logger.log("info", 'socket onpong: ' + e);
	}

	//this function queues up the packets to be decoded and processed later at the beginning of the next frame.
	onmessage(e) {
		this.recievedPacketQueue.push(e);

	}

	logPacketError(errorMsg, dvPacket, n, byteLength, eventSchema) {
		var packetDataArr = [];
		var packetDataStr = "";
		var username = "";
		
		for(var i = 0; i < dvPacket.byteLength; i++) {
			packetDataArr.push(dvPacket.getUint8(i).toString(16).padStart(2, "0"));
		}
		packetDataStr = packetDataArr.join(" ");

		var u = this.gs.um.getUserByID(this.userId);
		if(u !== null) {
			username = u.username;
		} else {
			username = "(userid) " + this.userId
		}

		
		logger.log("error", "Packet Error: " + errorMsg + 
		". User name: " + username + 
		". n: " + n + 
		". ByteLength: " + byteLength + 
		". EventSchema: " + JSON.stringify(eventSchema) + 
		". Packet data: " + packetDataStr);

	}

	//this function actually decodes the packets that came in from the client
	processClientPackets() {
		while(this.recievedPacketQueue.length > 0 && !this.bPacketValidationError) {
			var view = new DataView(this.recievedPacketQueue.shift());
			var byteLength = view.byteLength;
			var onMessageAck = 0;
			var onMessageAck = 0;

			var n = 0; //number of bytes in
			var m = 0; //event count
	
			// this.logPacketError("Error test.", view, 0, 10, null);

			//parse the packet header
			 //sequence number
			if(n + 2 < byteLength) {
				this.remoteSequence = view.getUint16(n);
				n += 2;
			} else {
				this.bPacketValidationError = true;
				this.logPacketError("Packet sequence number could not be read; offset is outside the bounds of the dataview", view, n, byteLength, null);
			}

			//the sequence number should be exactly 1 from the previous because of TCP
			// console.log("current: " + this.remoteSequence + "prev: " + this.prevRemoteSequence);
			if((this.remoteSequence - 1) !== this.prevRemoteSequence) {
				//check wrap around
				if(this.remoteSequence === 0 && this.prevRemoteSequence === (this.remoteSequenceMaxValue-1)) {
					//numbers wrapped around. Intentionally blank.
					// console.log("Numbers wrapped around.");
				} else {
					this.bPacketValidationError = true;
					this.logPacketError("Remote packet sequence number was not sequential. Remote sequence: " + this.remoteSequence + ". Previous sequence: " + this.prevRemoteSequence, view, n, byteLength, null);
				}
			}

			//ack
			if(n + 2 <= byteLength) {
				onMessageAck = view.getUint16(n);
				n += 2;
			} else {
				this.bPacketValidationError = true;
				this.logPacketError("Packet ack could not be read; offset is outside the bounds of the dataview", view, n, byteLength, null);
			}
			
			//event count. This one could be less than or equal to because there could be no events.
			if(n + 1 <= byteLength) {
				m = view.getUint8(n); //event count
				n++;
			} else {
				this.bPacketValidationError = true;
				this.logPacketError("Event count could not be read; offset is outside the bounds of the dataview", view, n, byteLength, null);
			}


	
			//logger.log("info", 'ONMESSAGE ' + this.remoteSequence + ", LOCALSEQUENCE: " + this.localSequence);
	
			//start going through the events
			for(var i = 0; i < m; i++) {
				n += this.decodeEvent(n, view, byteLength);
				if(this.bPacketValidationError) {
					break;
				}
			}

			//at this point, validate the bytes read did not cut short from the entire data buffer (at this point, ALL bytes should have been read)
			if(!this.bPacketValidationError && n < byteLength) {
				this.bPacketValidationError = true;
				this.logPacketError("Packet error: The bytes read was less than the bytes in the packet", view, n, byteLength, null);
			}

	
			//process any callbacks from the most recent ack from the client
			//EXAMPLE 1
			//this.localSequenceMaxValue = 65535;
			//this.ack = 10
			//onMessageAck = 15
			//this means, I need to process:
			// 11
			// 12
			// 13
			// 14
			// 15
			//
			// ackStart would be 11. Correct.
			// ackRange would be 4. Correct.
	
			// EXAMPLE 2 (wrap around)
			//this.localSequenceMaxValue = 65535;
			//this.ack = 65530
			//onMessageAck = 5
			//this means, I need to process:
			// 65531
			// 65532
			// 65533
			// 65534
			// 65535
			// 0
			// 1
			// 2
			// 3
			// 4
			// 5
			//
			// ackStart would be 65531. Correct.
			// ackRange would be: 10. Correct.
	
			if(!this.bPacketValidationError && onMessageAck != this.ack)
			{
				var ackStart = this.ack + 1; 
				var ackRange = onMessageAck - ackStart;
	
				//deals with sequence wrap around
				if(ackRange < 0)
				{
					ackRange = onMessageAck - ackStart + this.localSequenceMaxValue + 1;
				}
		
				// logger.log("info", '==== ON MESSAGE CALLBACK CALC ====');
				// logger.log("info", this.ack);
				// logger.log("info", onMessageAck);
				// logger.log("info", ackStart);
				// logger.log("info", ackRange);
		
				for(var i = 0; i <= ackRange; i++)
				{
					var actualIndex = (ackStart + i) % (this.localSequenceMaxValue + 1);
					//logger.log("info", '--Actual index: ' + actualIndex);
	
					//update the timeEnd for ping calculations
					this.sentPacketHistory[actualIndex].timeAcked = this.gs.currentTick;
	
					//call any ack callbacks
					if(this.sentPacketHistory[actualIndex].ackCallbacks.length > 0)
					{
						//logger.log("info", "WebSocketHandler for Userid: " + this.userId + '. Callbacks found for ack #' + actualIndex);
						for(var j = 0; j < this.sentPacketHistory[actualIndex].ackCallbacks.length; j++)
						{
							//logger.log("info", '--- CALLBACK FOR ' + actualIndex + ". MiscData: " + JSON.stringify(this.sentPacketHistory[actualIndex].ackCallbacks[j].miscData));
							
							this.sentPacketHistory[actualIndex].ackCallbacks[j].cbAck(this.sentPacketHistory[actualIndex].ackCallbacks[j].miscData)
						}
			
						this.sentPacketHistory[actualIndex].ackCallbacks.length = 0;
					}
				}
				this.ack = onMessageAck;
			}

			this.prevRemoteSequence = this.remoteSequence;
		}
	}


	calcRTT() {
		//count back from the current local sequence number, and calculate the average rtt
		var totalRtt = 0;

		for(var i = 1; i <= this.rttPacketHistoryLength; i++)
		{
			var actualIndex = this.localSequence - i;

			//deals with sequence wrap around
			if(actualIndex < 0)
			{
				actualIndex += this.localSequenceMaxValue;
			}

			var rtt = 0;
			if(this.sentPacketHistory[actualIndex].timeSent !== 0)
			{
				if(this.sentPacketHistory[actualIndex].timeAcked === 0)
				{
					rtt = this.gs.currentTick - this.sentPacketHistory[actualIndex].timeSent;
				}
				else
				{
					rtt = this.sentPacketHistory[actualIndex].timeAcked - this.sentPacketHistory[actualIndex].timeSent;
				}
			}
			totalRtt += rtt;
		}

		return Math.round(totalRtt / this.rttPacketHistoryLength);
	}


	decodeEvent(n, view, byteLength, debugMe) {
		var oldN = n;
		var eventId = 0;
		var schema = null;

		//event id
		if(!this.bPacketValidationError && (n + 1) <= byteLength) {
			eventId = view.getUint8(n);
			n++;
		} else {
			this.bPacketValidationError = true;
			this.logPacketError("Event id could not be read; offset is outside the bounds of the dataview", view, n, byteLength, null);
		}
		
		//get schema from event id
		if(!this.bPacketValidationError)  {
			schema = EventIdIndex[eventId];
			if(!schema) {
				this.bPacketValidationError = true;
				this.logPacketError("Schema does not exist for event id: " + eventId, view, n, byteLength, null);
			}
		}

		//check for out of bounds access (strings/buffers go through another check in the for loop)
		if(!this.bPacketValidationError && (n + schema.sum_min_bytes) > byteLength) {
			this.bPacketValidationError = true;
			this.logPacketError("Event could not be read; offset is outside the bounds of the dataview", view, n, byteLength, schema);
		}

		if(!this.bPacketValidationError) {
			var eventData = {};
			eventData.eventName = schema.txt_event_name;

			//go through each parameter for the event
			for(var p = 0; p < schema.parameters.length; p++) {
				var value = 0;

				switch(schema.parameters[p].txt_actual_data_type) {
					//standard decodings
					case "int8":
						value = view.getInt8(n);
						n++;
						break;
					case "int16":
						value = view.getInt16(n);
						n += 2;
						break;
					case "int32":
						value = view.getInt32(n);
						n += 4;
						break;
					case "uint8":
						value = view.getUint8(n);
						n++;
						break;
					case "uint16":
						value = view.getUint16(n);
						n += 2;
						break;
					case "uint32":
						value = view.getUint32(n);
						n += 4;
						break;
					case "str8":
						value = "";

						//string length
						var l = view.getUint8(n);
						n++;

						//string value
						if((n+l) <= byteLength) {
							for(var j = 0; j < l; j++) {
								value += String.fromCharCode(view.getUint16(n)); 
								n += 2;
							}
						} else {
							this.bPacketValidationError = true;
							this.logPacketError("Str8 value could not be read; offset is outside the bounds of the dataview", view, n, byteLength, schema);
						}
						
						break;
					case "str16":
						value = "";

						//string length
						var l = view.getUint16(n);
						n += 2;

						//string value
						if((n+l) <= byteLength) {
							for(var j = 0; j < l; j++) {
								value += String.fromCharCode(view.getUint16(n)); 
								n += 2;
							}
						} else {
							this.bPacketValidationError = true;
							this.logPacketError("Str16 value could not be read; offset is outside the bounds of the dataview", view, n, byteLength, schema);
						}
						
						break;
					case "str32":
						value = "";

						//string length
						var l = view.getUint32(n);
						n++;

						//string value
						if((n+l) <= byteLength) {
							for(var j = 0; j < l; j++) {
								value += String.fromCharCode(view.getUint16(n)); 
								n += 2;
							}
						} else {
							this.bPacketValidationError = true;
							this.logPacketError("Str32 value could not be read; offset is outside the bounds of the dataview", view, n, byteLength, schema);
						}
						
						break;
					case "float32":
						value = view.getFloat32(n);
						n += 4;
						break;

					//Custom decodings
					case "float16p0":
						value = view.getInt16(n)*1;
						n += 2;
						break;
					case "float16p1":
						value = view.getInt16(n)*0.1;
						n += 2;
						break;
					case "float16p2":
						value = view.getInt16(n)*0.01;
						n += 2;
						break;
					case "float16p3":
						value = view.getInt16(n)*0.001;
						n += 2;
						break;



					case "float8p0":
						value = view.getInt8(n)*1;
						n++;
						break;
					case "float8p1":
						value = view.getInt8(n)*0.1;
						n++;
						break;
					case "float8p2":
						value = view.getInt8(n)*0.01;
						n++;
						break;
					case "float8p3":
						value = view.getInt8(n)*0.001;
						n++;
						break;


					case "bool":
						value = view.getUint8(n) == 1 ? true : false;
						n++;
						break;

					case "dataBuffer8":
						value = null;

						//dataBuffer length
						var l = view.getUint8(n);
						n++;

						value = new ArrayBuffer(l);
						var tempView = new DataView(value);

						//dataBuffer value
						if((n+l) <= byteLength) {
							for(var j = 0; j < l; j++) {
								tempView.setUint8(j, view.getUint8(n));
								n += 1;
							}
						} else {
							this.bPacketValidationError = true;
							this.logPacketError("dataBuffer8 value could not be read; offset is outside the bounds of the dataview", view, n, byteLength, schema);
						}

						break;
					default:
						//intentionally blank
						break;

				}

				//errors could still occur if the data is a string/buffer
				if(this.bPacketValidationError) {
					break;
				}

				//create the key value pair on eventData
				eventData[schema.parameters[p].txt_param_name] = value;
			}

			if(!this.bPacketValidationError) {
				this.userAgent.clientToServerEvents.push(eventData);
			}
		}

		return n - oldN;
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
	insertEvent(eventData, cbAck, cbSend, miscData) {
		var schema = EventNameIndex[eventData.eventName];
		if(schema !== undefined)
		{
			var eventQueueIndex = this.eventQueuesEventIdIndex[schema.event_id];

			if(eventQueueIndex !== undefined)
			{
				//finally, insert the event
				this.eventQueues[eventQueueIndex].push(eventData);
				var bytesRequired = this.getEventSize(eventData);
				this.currentBytes += bytesRequired;

				//also insert the ack callback if there is any
				if(cbAck)
				{
					this.sentPacketHistory[this.localSequence].ackCallbacks.push({cbAck: cbAck, miscData: miscData});
					//logger.log("info", "WebSocketHandler for Userid: " + this.userId + '. Callbacks created for sequence # ' + this.localSequence);
				}
				if(cbSend)
				{
					this.sentPacketHistory[this.localSequence].sendCallbacks.push({cbSend: cbSend, miscData: miscData});
					//logger.log("info", "WebSocketHandler for Userid: " + this.userId + '. SEND callbacks created for sequence # ' + this.localSequence);
				}
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
							if(s !== undefined)
							{
								eventBytes += 1 + (s.length*2);
							}
							break;
						case "str16": 
							var s = eventData[schema.parameters[p].txt_param_name];
							if(s !== undefined)
							{
								eventBytes += 2 + (s.length*2);
							}
							break;
						case "str32": 
							var s = eventData[schema.parameters[p].txt_param_name];
							if(s !== undefined)
							{
								eventBytes += 4 + (s.length*2);
							}
							break;
						case "dataBuffer8": 
							var db = eventData[schema.parameters[p].txt_param_name];
							if(db !== undefined)
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

	//this assembles and encodes the queued events into a packet to be sent to the client
	createPacketForUser() {
		// var user = this.gs.um.getUserByID(this.userId);
		
		var view = new DataView(this.wsSendBuffer);
		var n = 0; //current byte within the packet
		var m = 0; //number of events

		view.setUint16(0, this.localSequence); //sequence Number
		view.setUint16(2, this.remoteSequence); //ack (most recent remote sequence number)
		n += 4;

		n += 1; //skipping 1 byte for the event count

		var bcontinue = true;

		//start going through the eventQueues
		for(var i = 0; i < this.eventQueues.length; i++)
		{
			if(!bcontinue)
			{
				break;
			}

			//for each event, encode it into the packet
			while(this.eventQueues[i].length > 0) {
				var e = this.eventQueues[i].shift();
	
				//check the length of event to make sure it fits
				var bytesRequired = this.getEventSize(e);

				if(bytesRequired <= this.currentBytes - n)
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
						logger.log("info", '!!!WARNING!!! for event ' + e.eventName + ', the event was queued, but no bytes were written. EventData: ' + JSON.stringify(e));
					}

					//mark the event for deletion (used later when double checking that all events made it through)
					e.isSent = true;
				}
				//the packet is full
				else
				{
					bcontinue = false;
				}
			}
		}

		//check to see if a callback was associated with it (mainly for fragments)
		if(this.sentPacketHistory[this.localSequence].sendCallbacks.length > 0)
		{
			//logger.log("info", "WebSocketHandler for Userid: " + this.userId + '. SEND Callbacks found for ack #' + this.localSequence);

			for(var i = 0; i < this.sentPacketHistory[this.localSequence].sendCallbacks.length; i++)
			{
				this.sentPacketHistory[this.localSequence].sendCallbacks[i].cbSend(this.sentPacketHistory[this.localSequence].sendCallbacks[i].miscData);
			}

			this.sentPacketHistory[this.localSequence].sendCallbacks.length = 0;
		}

		view.setUint8(4, m); //payload event count
	}

	//this actually sends the packet for the user (this is only seperate from createPacketForUser because its easier to profile with node debug tools to find where slow downs occur)
	sendPacketForUser() {
		//update packetHistory with timeSent
		this.sentPacketHistory[this.localSequence].timeSent = this.gs.currentTick;
		this.sentPacketHistory[this.localSequence].timeAcked = 0;

		this.localSequence++;

		//wrap around local sequence if hit the end
		this.localSequence = this.localSequence % this.localSequenceMaxValue; 

		//send the packet to the client
		this.ws.send(this.wsSendBuffer.slice(0, this.currentBytes), this.wsSendOptions);
		
		//reset the current bytes to only the header bytes
		this.currentBytes = this.headerBytes;
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
			logger.log("info", 'A user has been timed out. username: ' + u.username + '.  userId: ' + u.id);
			this.disconnectClient(1000, "User timed out server side.");
		}
		//sequence wrap around case
		else if(this.localSequence < this.ack && (this.localSequence - (this.ack - this.localSequenceMaxValue)) >= this.gs.inactiveAckThreashold)
		{
			//user timed out. Inactivate them.
			var u = this.gs.um.getUserByID(this.userId);
			logger.log("info", 'A user has been timed out. username: ' + u.username + '.  userId: ' + u.id);
			this.disconnectClient(1000, "User timed out server side.");
		}

		//disconnect the client if any packet validation error occured
		if(this.bPacketValidationError) {
			var u = this.gs.um.getUserByID(this.userId);
			logger.log("info", 'Packet validation error. username: ' + u.username + '.  userId: ' + u.id + ". User disconnected.");
			this.disconnectClient(1011, "Server packet validation error.");
		}
	}
}

exports.WebsocketHandler = WebsocketHandler;