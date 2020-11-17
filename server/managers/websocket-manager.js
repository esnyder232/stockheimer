const {GlobalFuncs} = require('../global-funcs.js');
const {WebsocketHandler} = require('../classes/websocket-handler.js');

class WebsocketManager {
	constructor() {
		this.gs = null;
		this.idCounter = 1;
		this.websocketArray = [];
		this.idIndex = {};
		this.isDirty = false;
	}

	init(gameServer) {
		this.gs = gameServer;
	}

	//this doesn't actually CREATE the websocket, it creates a websocketHandler class and passes the actual websocket to it.
	createWebsocket(ws) {
		var wsh = new WebsocketHandler();

		wsh.id = this.idCounter;
		this.idCounter++;
		this.websocketArray.push(wsh);
		this.isDirty = true;

		this.updateIndex();
		
		console.log('websocket created. Id: ' + wsh.id);
		return wsh;
	}

	//this just marks the player for deletion
	destroyWebsocket(wsh) {
		wsh.deleteMe = true;
		this.isDirty = true;
		console.log('websocket marked for deletion. Id: ' + wsh.id);
	}

	updateIndex() {
		//just rebuild the index for now
		this.idIndex = {};
		for(var i = 0; i < this.websocketArray.length; i++)
		{
			if(this.websocketArray[i])
			{
				this.idIndex[this.websocketArray[i].id] = this.websocketArray[i];
			}
		}
	}

	update() {
		if(this.isDirty)
		{
			//delete any players that were marked for deletion
			for(var i = this.websocketArray.length-1; i >= 0; i--)
			{
				if(this.websocketArray[i].deleteMe)
				{
					var temp = this.websocketArray.splice(i, 1);
					console.log('websocket destroyed. Id: ' + temp[0].id);
				}
			}

			this.updateIndex();
			this.isDirty = false;
			console.log('websocket current length: ' + this.websocketArray.length);
		}
	}

	getWebsocketByID(id) {
		if(this.idIndex[id])
		{
			return this.idIndex[id];
		}
		else
		{
			return null;
		}
	}
}

exports.WebsocketManager = WebsocketManager;