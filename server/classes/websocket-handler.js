const {GlobalFuncs} = require('../global-funcs.js');
const EventSchema = require('../../shared_files/event-schema.json');

//load in the event schema and build indexes. Do it outside the class so it only does this step once.
var EventIdIndex = {};

for(var i = 0; i < EventSchema.events.length; i++)
{
	if(EventSchema.events[i] != null && EventSchema.events[i].txt_event_name)
	{
		EventIdIndex[EventSchema.events[i].event_id] = EventSchema.events[i];
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
	}

	init(gameServer, userId, ws) {
		this.gs = gameServer;
		this.userId = userId;
		this.ws = ws;
				
		//setup actual websocket callbacks
		ws.on("close", this.onclose.bind(this));
		ws.on("error", this.onerror.bind(this));
		ws.on("message", this.onmessage.bind(this));
		ws.on("pong", this.onpong.bind(this));
		ws.binaryType = 'arraybuffer';
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