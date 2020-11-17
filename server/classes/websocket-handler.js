const {GlobalFuncs} = require('../global-funcs.js');

class WebsocketHandler {
	constructor() {
		this.gs = null;
		this.ws = null;

		this.id = 0;
		this.userId = 0;

		this.localSequence = 0; 	//current local sequence number
		this.remoteSequence = 0;	//most recent remote sequence number
		this.ack = 0;				//most current ack returned by the client
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

	onclose(m) {
		console.log('websocket onclose: ' + this.id + '. userId: ' + this.userId);
		this.gs.gameState.websocketClosed(this);
	}

	onerror(m) {
		console.log("Websocket Errored for id: " + this.id + ". Error:" + m);
		this.gs.gameState.websocketErrored(this);
	}

	onpong(m) {
		console.log('socket onpong: ' + m);
	}

	onmessage(m) {
		//parse packet header
		var view = new DataView(m);
		this.remoteSequence = view.getUint16(0);
		this.ack = view.getUint16(2);

		//console.log('message recieved: remoteSequence:' + this.remoteSequence + '    ack: ' + this.ack);




		// if(m.indexOf("==custom==") == 0)
		// {
		// 	console.log('custom message:');
		// 	console.log(m.data);
		// }
		// else
		// {
		// 	var jsonMsg = this.globalfuncs.getJsonEvent(m);
	
		// 	switch(jsonMsg.event.toLowerCase())
		// 	{
		// 		case "get-world":
		// 			console.log('now getting world');
		// 			var arrBodies = this.getWorld();
		// 			this.globalfuncs.sendJsonEvent(ws, "get-world-response", JSON.stringify(arrBodies))
		// 			console.log('getting world done')
		// 			break;
		// 		case "start-event":
		// 			this.startGame(ws, jsonMsg);
		// 			break;
		// 		case "stop-event":
		// 			this.stopGame(ws, jsonMsg);
		// 			break;
		// 		case "player-input":
		// 			this.playerInputEvent(ws, jsonMsg);
		// 			break;
		// 		case "test":
		// 			console.log(jsonMsg);
		// 			this.globalfuncs.sendJsonEvent(ws, "test-ack", {t: jsonMsg.msg.t});
		// 			break;
		// 		default:
		// 			//just echo something back
		// 			this.globalfuncs.sendJsonEvent(ws, "unknown-event", JSON.stringify({}));
		// 			break;
		// 	}
		// }
	}

}

exports.WebsocketHandler = WebsocketHandler;