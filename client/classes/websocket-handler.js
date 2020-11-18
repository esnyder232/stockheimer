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

		this.serverToClientEvents = []; //event queue to be processed by the main loop
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
		}
		console.log(this.eventIdIndex);
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






















			// switch(eventId)
			// {
			// 	case 1: //userconnected
			// 		var userId = view.getUint8(n);
			// 		n++;
			// 		var usernameLength = view.getUint8(n);
			// 		n++;
					
			// 		//username
			// 		var username = "";
			// 		for(var j = 0; j < usernameLength; j++)
			// 		{
			// 			username += String.fromCharCode(view.getUint16(n));
			// 			n += 2;
			// 			// return String.fromCharCode.apply(null, new Uint16Array(buf));
			// 		}

			// 		console.log('userConnected Event results:');
			// 		console.log(userId);
			// 		console.log(usernameLength);
			// 		console.log(username);

			// 		break;
			// 	default:
			// 		//intentionally blank
			// 		break;
			// }
		}



		// if(e.data instanceof ArrayBuffer)
		// {
		// 	console.log('array buffer recieved');
		// 	console.log(e.data);

		// 	var myView4 = new DataView(e.data);

		// 	var int1MinReturned = myView4.getInt8(0);
		// 	var int1MaxReturned = myView4.getInt8(4);
		// 	var uint1MaxReturned = myView4.getUint8(8);
		// 	var int2MinReturned = myView4.getInt16(12);
		// 	var int2MaxReturned = myView4.getInt16(16);
		// 	var uint2MaxReturned = myView4.getUint16(20);
		// 	var int3MinReturned = myView4.getInt32(24);
		// 	var int3MaxReturned = myView4.getInt32(28);
		// 	var uint3MaxReturned = myView4.getUint32(32);


		// 	console.log('===========================');
		// 	console.log(int1MinReturned);
		// 	console.log(int1MaxReturned);
		// 	console.log(uint1MaxReturned);
		// 	console.log(int2MinReturned);
		// 	console.log(int2MaxReturned);
		// 	console.log(uint2MaxReturned);
		// 	console.log(int3MinReturned);
		// 	console.log(int3MaxReturned);
		// 	console.log(uint3MaxReturned);

		// 	// var myView = new Int8Array(e.data);
		// 	// var myLength = myView[0]*2;
		// 	// console.log('mylength: ' + myLength);

		// 	// for(var n = 1; n < myLength; n += 2)
		// 	// {
		// 	// 	var byte1 = myView[n];
		// 	// 	var byte2 = myView[n+1];
		// 	// 	var myChar = "";
		// 	// 	console.log('mychar at n: ' + n);
		// 	// 	console.log(myChar);

		// 	// 	byte2 = byte2 << 8;
		// 	// 	var finalChar = byte2 + byte1;

		// 	// 	console.log('finalchar: ' + finalChar);
		// 	// 	console.log(String.fromCharCode(finalChar));
		// 	// }
			
		// }

		// else if(e.data.indexOf("==custom==") == 0)
		// {
		// 	console.log('custom message:');
		// 	var customMsg = e.data.replace("==custom==", "");
		// 	console.log(customMsg);
		// 	console.log(customMsg.length);
		// }
		// else
		// {
		// 	var jsonMsg = this.getJsonEvent(e.data);
		// 	//console.log('message recieved from server. Event: ' + jsonMsg.event);
		// 	switch(jsonMsg.event.toLowerCase())
		// 	{
		// 		case "get-world-response":
		// 			console.log('got world reponse!');
		// 			this.world = JSON.parse(jsonMsg.msg);

		// 			//convert phaser units to phaser units
		// 			this.convertPlankToPhaserUnits();

		// 			console.log(this.world);
		// 			this.createWorld();
		// 			break;
		// 		case "world-deltas":
		// 			//console.log('got world deltas');
		// 			var deltas = JSON.parse(jsonMsg.msg);
		// 			this.processDeltas(deltas);
		// 			break;
		// 		case "sn-test":
		// 			var msg = JSON.parse(jsonMsg.msg);
		// 			console.log('Recieved packet. sn: %s', msg.sn)
		// 			break;
		// 		case "player-update":

		// 			break;
		// 		case "test-ack":
		// 			console.log('from server test-ack: ' + jsonMsg.msg.t);
		// 			break;
		// 		case "unknown-event":
		// 			console.log('from server: unknown-event');
		// 			break;
		// 	}
		// }
		
	}


	
	createPacketForUser()
	{
		//console.log('creating packet for user: ' + this.gc.username + '    localSequenceNumber: ' + this.localSequence);

		var buffer = new ArrayBuffer(this.maxPacketSize);
		var view = new DataView(buffer);

		view.setUint16(0, this.localSequence); //sequence Number
		view.setUint16(2, this.remoteSequence); //ack (most recent remote sequence number)

		this.localSequence++;

		this.ws.send(buffer);
	}




	update(timeElapsed, dt) {
		
	}
}

