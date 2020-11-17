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
	}
	
	init(gc) {
		this.gc = gc;
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

		//parse the packet header
		this.remoteSequence = view.getUint16(0);
		this.ack = view.getUint16(2);

		console.log('message recieved: remoteSequence:' + this.remoteSequence + '    ack: ' + this.ack);

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
		console.log('creating packet for user: ' + this.gc.username + '    localSequenceNumber: ' + this.localSequence);

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

