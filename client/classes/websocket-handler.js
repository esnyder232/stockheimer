import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import ClientConfig from '../client-config.json';

export default class WebsocketHandler {
	constructor() {
		this.gc = null;
		this.ws = null;
		this.globalfuncs = new GlobalFuncs();

		this.localSequence = 0; 	//current local sequence number
		this.remoteSequence = 0;	//most recent remote sequence number
		this.ack = 0;				//most current ack returned by the server

		this.maxPacketSize = 130; 	//bytes

		this.eventSchema = {};
		this.eventIdIndex = {};
		this.eventNameIndex = {};

		this.serverToClientEvents = []; //event queue to be processed by the main loop
		this.clientToServerEvents = []; //event queue to be processed by the main loop for events going from client to server
	}
	
	init(gc) {
		this.gc = gc;

		//fetch the event schema
		$.ajax({url: "./shared_files/event-schema.json", method: "GET"})
		.done((responseData, textStatus, xhr) => {
			this.eventSchema = responseData;
			this.buildSchemaIndex();
		})
		.fail((xhr) => {
			var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			this.globalfuncs.appendToLog('VERY BAD ERROR: Failed to get event-schema.');
		})
	}

	buildSchemaIndex() {
		for(var i = 0; i < this.eventSchema.events.length; i++)
		{
			this.eventIdIndex[this.eventSchema.events[i].event_id] = this.eventSchema.events[i];
			this.eventNameIndex[this.eventSchema.events[i].txt_event_name] = this.eventSchema.events[i];
		}
		console.log(this.eventNameIndex);
	}



	createWebSocket() {
		var bFail = false;
		try {
			this.ws = new WebSocket(ClientConfig.ws_address);
			this.ws.binaryType = "arraybuffer";

			this.ws.onclose = this.onclose.bind(this);
			this.ws.onerror = this.onerror.bind(this);
			this.ws.onopen = this.onopen.bind(this);
			this.ws.onmessage = this.onmessage.bind(this);
		}
		catch(ex) {
			bFail = true;
			this.globalfuncs.appendToLog(ex);
		}
		
		return bFail;
	}

	disconnectFromServer() {
		//if its OPEN or CONNECTING
		if(this.ws.readyState === 0 || this.ws.readyState === 1)
		{
			this.ws.close();
		}
	}

	onclose() {
		this.globalfuncs.appendToLog("WebsocketHandler: Websocket is now closed.");
		this.gc.gameState.websocketClosed();
	}

	onopen(e) {
		this.gc.gameState.websocketOpened();
	}

	onerror(e) {
		this.globalfuncs.appendToLog("WebsocketHandler: Websocket error:" + e);
		this.gc.gameState.websocketErrored();
	}

	onmessage(e) {
		var view = new DataView(e.data);
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

		//console.log('message recieved: remoteSequence:' + this.remoteSequence + '    ack: ' + this.ack);

		//start going through the events
		for(var i = 0; i < m; i++)
		{
			var eventId = view.getUint8(n);
			n++;
			bytesRead += 1;

			var schema = this.eventIdIndex[eventId];

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

				this.serverToClientEvents.push(eventData);
			}
		}
	}


	
	createPacketForUser()
	{
		var buffer = new ArrayBuffer(this.maxPacketSize);
		var view = new DataView(buffer);
		var n = 0; //current byte within the packet
		var m = 0; //number of events
		var bytesWritten = 0;

		view.setUint16(0, this.localSequence); //sequence Number
		view.setUint16(2, this.remoteSequence); //ack (most recent remote sequence number)
		n += 4;
		bytesWritten += 4;

		n += 1; //skipping 1 byte for the event count
		bytesWritten++;

		this.localSequence++;

		var bcontinue = true;

		for(var i = this.clientToServerEvents.length - 1; i >= 0; i--)
		{
			if(!bcontinue)
			{
				break;
			}

			var e = this.clientToServerEvents[i];
			var schema = this.eventNameIndex[e.eventName];

			if(schema)
			{
				var bytesRequired = 0;

				bytesRequired++; //eventId

				//check the length of event to make sure it fits
				//there is a variable sized parameter (most likely a string)
				if(schema.b_size_varies)
				{
					//find the variable length parameters, and determine the bytes required
					for(var p = 0; p < schema.parameters.length; p++)
					{
						if(schema.parameters[p].b_size_varies)
						{
							switch(schema.parameters[p].txt_actual_data_type)
							{
								case "str8": 
									var s = e[schema.parameters[p].txt_param_name];
									if(s)
									{
										bytesRequired += 1 + s.length*2;
									}
									break;
								case "str16": 
									var s = e[schema.parameters[p].txt_param_name];
									if(s)
									{
										bytesRequired += 2 + s.length*2;
									}
									break;
								case "str32": 
									var s = e[schema.parameters[p].txt_param_name];
									if(s)
									{
										bytesRequired += 4 + s.length*2;
									}
									break;
								default:
									//intentionally blank
									break;
							}
						}
						else
						{
							bytesRequired += schema.parameters[p].min_bytes;
						}
					}
				}
				else
				{
					bytesRequired = schema.sum_min_bytes;
				}

				if(bytesRequired <= this.maxPacketSize - bytesWritten)
				{
					view.setUint8(n, schema.event_id);
					n++;
					bytesWritten++;

					//go through the parameters and encode each one
					for(var p = 0; p < schema.parameters.length; p++)
					{
						var value = e[schema.parameters[p].txt_param_name];
						switch(schema.parameters[p].txt_actual_data_type)
						{
							//standard encoding
							case "int8":
								view.setInt8(n, value);
								n++;
								bytesWritten++;
								break;
							case "int16":
								view.setInt16(n, value);
								n += 2;
								bytesWritten += 2;
								break;
							case "int32":
								view.setInt32(n, value);
								n += 4;
								bytesWritten += 4;
								break;
							case "uint8":
								view.setUint8(n, value);
								n++;
								bytesWritten++;
								break;
							case "uint16":
								view.setUint16(n, value);
								n += 2;
								bytesWritten += 2;
								break;
							case "uint32":
								view.setUint32(n, value);
								n += 4;
								bytesWritten += 4;
								break;
							case "str8":
								//string length
								view.setUint8(n, value.length);
								n++;
								bytesWritten++;

								//string value
								for(var j = 0; j < value.length; j++)
								{
									view.setUint16(n, value.charCodeAt(j)); 
									n += 2;
									bytesWritten += 2;
								}
								break;
							case "str16":
								//string length
								view.setUint16(n, value.length);
								n += 2;
								bytesWritten += 2;

								//string value
								for(var j = 0; j < value.length; j++)
								{
									view.setUint16(n, value.charCodeAt(j)); 
									n += 2;
									bytesWritten += 2;
								}
								break;
							case "str32":
								//string length
								view.setUint32(n, value.length);
								n += 4;
								bytesWritten += 4;

								//string value
								for(var j = 0; j < value.length; j++)
								{
									view.setUint16(n, value.charCodeAt(j)); 
									n += 2;
									bytesWritten += 2;
								}
								break;
							case "float32":
								view.setFloat32(n, value);
								n += 4;
								bytesWritten += 4;
								break;

							//Custom encodings
							case "float16p0":
								view.setInt16(n, Math.round(value/1));
								n += 2;
								bytesWritten += 2;
								break;
							case "float16p1":
								view.setInt16(n, Math.round(value/0.1));
								n += 2;
								bytesWritten += 2;
								break;
							case "float16p2":
								view.setInt16(n, Math.round(value/0.01));
								n += 2;
								bytesWritten += 2;
								break;
							case "float16p3":
								view.setInt16(n, Math.round(value/0.001));
								n += 2;
								bytesWritten += 2;
								break;



							case "float8p0":
								view.setInt8(n, Math.round(value/1));
								n++;
								bytesWritten++;
								break;
							case "float8p1":
								view.setInt8(n, Math.round(value/0.1));
								n++;
								bytesWritten++;
								break;
							case "float8p2":
								view.setInt8(n, Math.round(value/0.01));
								n++;
								bytesWritten++;
								break;
							case "float8p3":
								view.setInt8(n, Math.round(value/0.001));
								n++;
								bytesWritten++;
								break;


							case "bool":
								view.setUint8(n, value ? 1 : 0);
								n++;
								bytesWritten++;
								break;
							default:
								//intentionally blank
								break;
						}
					}
				}
				//the packet is full
				else
				{
					bcontinue = false;
				}
			}

			//delete event for now
			this.clientToServerEvents.splice(i, 1);
			m++;
		}

		view.setUint8(4, m); //payload event count
		this.ws.send(buffer);
	}




	update(timeElapsed, dt) {
		
	}
}

