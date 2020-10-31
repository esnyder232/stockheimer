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
		this.serverDetails = {};
		this.userSession = {};
		this.ws = null;
		this.username = "";

		this.currentlyConnecting = false;

		this.enablePlayButton = false;
		this.enableUsername = true;
		this.enableNewButton = false;
	}

	init() {
		console.log('init on ' + this.scene.key + ' start');
		
		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
			{event: 'player-submit-click', func: this.playerSubmitClick.bind(this)},
			{event: 'player-new-click', func: this.playerNewClick.bind(this)},
			{event: 'player-username-change', func: this.playerUsernameChange.bind(this)}
			
		];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//a custom register function for "keyup"s. I have to do it this way because I can't figure out how to pass the "key" event through a custom windows event.
		$("#user-name").on("keyup", this.playerUsernameKeyup.bind(this));
		$(document).on("keyup", this.playerUsernameKeyup.bind(this));
	}

	playerUsernameKeyup(e) {
		//If the user clicks enter, click the play button if its enabled.
		//apparently "keyCode" is obsolete. Whatever.
		if(this.enablePlayButton && (e.code == "NumpadEnter" || e.code == "Enter")) {
			this.playerSubmitClick();
		}
	}

	playerUsernameChange() {
		this.checkUsernameEnablePlayButton();
		this.updateUI();
	}

	//whatever!
	checkUsernameEnablePlayButton() {
		var usernameInput = $("#user-name");
		if(usernameInput.val() === "") {
			this.enablePlayButton = false;
		}
		else {
			this.enablePlayButton = true;
		}

	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');

	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');

		//enable ui
		$("#server-connection-scene-root").removeClass("hide");
		this.enableUsername = true;
		this.enablePlayButton = false;
		this.enableNewButton = false;

		var data = {};
		//get server details, like ip, how many people are currently playing, etc
		$.ajax({url: "./api/get-server-details", method: "GET", data: data})
		.done((responseData, textStatus, xhr) => {			
			this.serverDetails = this.globalfuncs.getDataObjectFromArray(responseData.data.main, 0);
			var playersDiv = $("#game-server-details-players")[0];
			playersDiv.textContent = "Players: " + this.serverDetails.currentPlayers + "/" + this.serverDetails.maxPlayers;
		})
		.fail((xhr) => {
			var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			this.globalfuncs.appendToLog('Failed to get server details: ' + responseData.userMessage);
		})


		//get user session if it exists
		$.ajax({url: "./api/get-user-session", method: "GET", data: data})
		.done((responseData, textStatus, xhr) => {
			this.userSession = this.globalfuncs.getDataObjectFromArray(responseData.data.main, 0);
			if(this.userSession.sessionExists) {
				var usernameInput = $("#user-name");
				usernameInput.val(this.userSession.username);
				this.enableUsername = !this.userSession.sessionExists;
				this.enableNewButton = this.userSession.sessionExists;
			}
		})
		.fail((xhr) => {
			var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			this.globalfuncs.appendToLog('Failed to get user session: ' + responseData.userMessage);
		})
		.always(() => {
			this.checkUsernameEnablePlayButton();
			this.updateUI();
		})
	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);

		//a custom register function for "keydown" for player name. I have to do it this way because I can't figure out how to pass the "key" event through a custom windows event.
		$("#user-name").off("keyup");
		$(document).off("keyup");
		$("#server-connection-scene-root").addClass("hide");
	}

	destroy() {
		console.log('destroy on ' + this.scene.key);
	}


	updateUI() {
		var usernameInput = $("#user-name");
		var playerSubmitButton = $("#player-submit");
		var playerNewButton = $("#player-new");

		usernameInput.attr("disabled", !this.enableUsername);
		playerSubmitButton.attr("disabled", !this.enablePlayButton);
		playerNewButton.attr("disabled", !this.enableNewButton);
	}


	playerSubmitClick() {
		//connect with the server and establish the websocket
		if(!this.currentlyConnecting)
		{
			this.currentlyConnecting = true;
			this.enablePlayButton = false;
			this.enableUsername = false;
			this.enableNewButton = false;

			this.updateUI();

			var usernameInput = $("#user-name");
			this.username = usernameInput[0].value;
			
			var data = {username: this.username};
			this.globalfuncs.appendToLog("Connecting...");

			//try to connect to server
			$.ajax({url: "./api/join-request", method: "POST", data: data})
			.done((responseData, textStatus, xhr) => {
				//at this point, it is safe to create the websocket connection
				this.createWebSocket();
			})
			.fail((xhr) => {
				var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
				this.globalfuncs.appendToLog('Failed to connect to server: ' + responseData.userMessage);
				
				this.currentlyConnecting = false;
				this.checkUsernameEnablePlayButton();
				this.enableUsername = !this.userSession.sessionExists;
				this.enableNewButton = this.userSession.sessionExists;
				this.updateUI();
			})
		}
	}

	playerNewClick() {
		if(!this.currentlyConnecting)
		{
			//warn the player
			var heyhey = confirm("This will permanently delete your current player and let you create a new one. Continue?");
			if(heyhey)
			{
				//delete the player from the database
				var data = {};
				$.ajax({url: "./api/clear-user-session", method: "POST", data: data})
				.done((responseData, textStatus, xhr) => {
					this.globalfuncs.appendToLog(responseData.userMessage);

					var usernameInput = $("#user-name");
					usernameInput.val("");
					this.userSession.sessionExists = false;
					this.enableUsername = !this.userSession.sessionExists;
					this.enableNewButton = this.userSession.sessionExists;
				})
				.fail((xhr) => {
					var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
					this.globalfuncs.appendToLog('Failed to clear user session: ' + responseData.userMessage);
				})
				.always(() => {
					this.checkUsernameEnablePlayButton();
					this.updateUI();
				})
			}
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

			this.currentlyConnecting = false;
			this.checkUsernameEnablePlayButton();
			this.enableUsername = !this.userSession.sessionExists;
			this.updateUI();
		}
		
	}

	oncloseTemp(e) {
		this.globalfuncs.appendToLog("Socket was closed unexpectedly when connecting.");
		console.log(e);

		this.currentlyConnecting = false;
		this.checkUsernameEnablePlayButton();
		this.enableUsername = !this.userSession.sessionExists;
		this.updateUI();
	}

	onerrorTemp(e) {
		this.globalfuncs.appendToLog("Socket errored when connecting.");
		console.log(e);

		this.currentlyConnecting = false;
		this.checkUsernameEnablePlayButton();
		this.enableUsername = !this.userSession.sessionExists;
		this.updateUI();
	}

	onopenTemp(e) {
		this.globalfuncs.appendToLog("Connected.");
		
		//dispatch event so game manager can switch scenes.
		this.scene.manager.getScene("game-manager-scene").connectedToServer();
	}

	update(timeElapsed, dt) {
	
	}
}

