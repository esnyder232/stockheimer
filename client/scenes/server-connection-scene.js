import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import config from '../client-config.json';

/*
This scene is the first scene they can interact with.
The player enters a name here, and clicks play to enter the main game.
NOTE: There is almost no point to this being a "scene". Might as well just be a webpage. Oh well.
*/
export default class ServerConnectionScene extends Phaser.Scene {
	constructor(config) {
		super(config);
		this.globalfuncs = new GlobalFuncs();
		this.main = {};
		this.ws = null;
	}

	init() {
		console.log('init on ' + this.scene.key + ' start');
		
		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
			{event: 'player-submit-click', func: this.playerSubmitClick.bind(this)}
		];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');

	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
		$("#server-connection-scene-root").removeClass("hide");

		var data = {};
		//get server details, like ip, how many people are currently playing, etc
		$.ajax({url: "./api/get-server-details", method: "GET", data: data})
		.done((responseData, textStatus, xhr) => {
			
			this.main = this.globalfuncs.getDataObjectFromArray(responseData.data.main, 0);
			var playersDiv = $("#game-server-details-players")[0];

			playersDiv.textContent = "Players: " + this.main.currentPlayers + "/" + this.main.maxPlayers;
		})
		.fail((xhr) => {
			var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			this.globalfuncs.appendToLog('Failed to get server details: ' + responseData.userMessage);
		})
	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);
		$("#server-connection-scene-root").addClass("hide");
	}

	destroy() {
		console.log('destroy on ' + this.scene.key);

	}

	playerSubmitClick() {
		console.log('player submit click');
		
		//connect with the server and establish the websocket
		if(!this.currentlyConnecting)
		{
			//this.currentlyConnecting = true;

			var playerNameInput = $("#player-name");
			var playerSubmitButton = $("#player-submit");

			playerNameInput[0].disabled = true;
			playerSubmitButton[0].disabled = true;

			var playerName = playerNameInput[0].value;
			
			var data = {playerName: playerName};
			
			this.globalfuncs.appendToLog("Connecting...");

			//try to connect to server
			$.ajax({url: "./api/try-connect", method: "GET", data: data})
			.done((responseData, textStatus, xhr) => {
				//at this point, it is safe to create the websocket connection
				this.createWebSocket();
			})
			.fail((xhr) => {
				var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
				this.globalfuncs.appendToLog('Failed to connect to server: ' + responseData.userMessage);
			})
		}
	}

	createWebSocket() {
		try {
			this.ws = new WebSocket(config.ws_address);

			this.ws.onclose = this.oncloseTemp.bind(this);
			this.ws.onerror = this.onerrorTemp.bind(this);
			this.ws.onopen = this.onopenTemp.bind(this);
		}
		catch(ex) {
			this.globalfuncs.appendToLog(ex);
		}
		
	}

	oncloseTemp(e) {
		this.globalfuncs.appendToLog("Socket was closed unexpectedly when connecting. Connection failed. " + e)
	}

	onerrorTemp(e) {
		this.globalfuncs.appendToLog("Socket error when connecting: " + e);
	}

	onopenTemp(e) {
		this.globalfuncs.appendToLog("Connected.");
		
		//dispatch event so game manager can switch scenes.
		this.scene.manager.getScene("game-manager-scene").connectedToServer();
	}

	update(timeElapsed, dt) {
	
	}
}

