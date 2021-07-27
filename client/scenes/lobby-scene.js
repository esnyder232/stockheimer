import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

/*
This scene is the first scene they can interact with.
The player enters a name here, and clicks play to enter the main game.
NOTE: There is almost no point to this being a "scene". Might as well just be a webpage. Oh well.
*/
export default class LobbyScene extends Phaser.Scene {
	constructor(config) {
		super(config);
		this.globalfuncs = new GlobalFuncs();
		this.serverDetails = {};
		this.userSession = {};
		this.ws = null;
		this.username = "";

		this.currentlyConnecting = false;
		this.enableUsername = true;

		this.showPlayButton = true;
		this.showNewButton = false;
		this.showExistingButton = false;

		this.enablePlayButton = false;
		this.enableNewButton = false;
		this.enableExistingButton = false;
	}

	init(data) {
		console.log('init on ' + this.scene.key + ' start');

		this.gc = data.gc;
		
		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
			{event: 'player-submit-click', func: this.playerSubmitClick.bind(this)},
			{event: 'player-new-click', func: this.playerNewClick.bind(this)}
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
			//firefox unfocus bug fix
			document.activeElement.blur();
			
			this.playerSubmitClick();
		}
		else {
			this.checkUsernameEnablePlayButton();
			this.updateUI();
		}
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
		$("#lobby-scene-root").removeClass("hide");
		this.enableUsername = true;
		this.enablePlayButton = false;
		this.enableNewButton = false;

		this.showPlayButton = true;
		this.showNewButton = false;
		this.showExistingButton = false;

		var data = {};

		//there is a timeout on the api because the server needs time to update itself (1/30 of a second)
		window.setTimeout(() => {
			//get server details, like ip, how many people are currently playing, etc
			$.ajax({url: "./api/get-server-details", method: "GET", data: data})
			.done((responseData, textStatus, xhr) => {			
				this.serverDetails = this.globalfuncs.getDataObjectFromArray(responseData.data.main, 0);
				var playersDiv = $("#game-server-details-players")[0];
				playersDiv.textContent = "Players: " + this.serverDetails.currentPlayers + "/" + this.serverDetails.maxPlayers;
			})
			.fail((xhr) => {
				var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);

				var msg = 'Failed to get server details: ' + responseData.userMessage;
				this.globalfuncs.appendToLog(msg);
				this.gc.modalMenu.openMenu("error", msg);
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
					this.enableExistingButton = this.userSession.sessionExists;
					
					this.showPlayButton = !this.userSession.sessionExists;
					this.showExistingButton = this.userSession.sessionExists;
					this.showNewButton = this.userSession.sessionExists;
				}
			})
			.fail((xhr) => {
				var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);

				var msg = 'Failed to get user session: ' + responseData.userMessage;
				this.globalfuncs.appendToLog(msg);
				this.gc.modalMenu.openMenu("error", msg);
			})
			.always(() => {
				this.checkUsernameEnablePlayButton();
				this.updateUI();
			})
		}, 100);
	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);

		//a custom register function for "keyup" for player name. I have to do it this way because I can't figure out how to pass the "key" event through a custom windows event.
		$("#user-name").off("keyup");
		$(document).off("keyup");
		$("#lobby-scene-root").addClass("hide");
	}

	destroy() {
		console.log('destroy on ' + this.scene.key);
	}


	updateUI() {
		var usernameInput = $("#user-name");
		var playerSubmitButton = $("#player-submit");
		var playerNewButton = $("#player-new");
		var playerExistingButton = $("#player-submit-existing")

		usernameInput.attr("disabled", !this.enableUsername);		
		
		playerSubmitButton.attr("disabled", !this.enablePlayButton);
		if(this.showPlayButton)
		{
			playerSubmitButton.removeClass("hide");
		}
		else
		{
			playerSubmitButton.addClass("hide");
		}
		
		playerNewButton.attr("disabled", !this.enableNewButton);
		if(this.showNewButton)
		{
			playerNewButton.removeClass("hide");
		}
		else
		{
			playerNewButton.addClass("hide");
		}

		playerExistingButton.attr("disabled", !this.enableExistingButton);
		if(this.showExistingButton)
		{
			playerExistingButton.removeClass("hide");
		}
		else
		{
			playerExistingButton.addClass("hide");
		}

		
	}


	playerSubmitClick() {
		//connect with the server and establish the websocket
		if(!this.currentlyConnecting)
		{
			this.currentlyConnecting = true;
			this.enablePlayButton = false;
			this.enableUsername = false;
			this.enableNewButton = false;
			this.enableExistingButton = false;

			this.updateUI();

			var usernameInput = $("#user-name");
			this.username = usernameInput[0].value;
			
			var data = {username: this.username};

			//try to connect to server
			$.ajax({url: "./api/join-request", method: "POST", data: data})
			.done((responseData, textStatus, xhr) => {
				this.gc.username = this.username;
				this.gc.gameState.connectUserToServer();
			})
			.fail((xhr) => {
				var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);

				var msg = 'Failed to connect to server: ' + responseData.userMessage;
				this.globalfuncs.appendToLog(msg);
				this.gc.modalMenu.openMenu("error", msg);
				
				this.currentlyConnecting = false;
				this.checkUsernameEnablePlayButton();
				this.enableUsername = !this.userSession.sessionExists;
				this.enableNewButton = this.userSession.sessionExists;
				this.enableExistingButton = this.userSession.sessionExists;
				this.updateUI();
			})
		}
	}

	playerNewClick() {
		if(!this.currentlyConnecting)
		{
			//warn the player
			//TODO: switch over to the custom confirm menu when you figure out how to do contextual "enter" key (so the user doesn't accidentally hit enter and bypasses the confirm)
			//this.gc.confirmMenu.openMenu("This will permanently delete your current player and let you create a new one.", this.cbPlayerNewClickConfirm.bind(this));
			
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
					this.enableExistingButton = this.userSession.sessionExists;
					
					this.showPlayButton = !this.userSession.sessionExists;
					this.showExistingButton = this.userSession.sessionExists;
					this.showNewButton = this.userSession.sessionExists;
				})
				.fail((xhr) => {
					var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
					
					var msg = 'Failed to clear user session: ' + responseData.userMessage;
					this.globalfuncs.appendToLog(msg);
					this.gc.modalMenu.openMenu("error", msg);

				})
				.always(() => {
					this.checkUsernameEnablePlayButton();
					this.updateUI();
				})
			}
		}
	}

	cbPlayerNewClickConfirm(answer) {
		if(answer) {
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
				this.enableExistingButton = this.userSession.sessionExists;
				
				this.showPlayButton = !this.userSession.sessionExists;
				this.showExistingButton = this.userSession.sessionExists;
				this.showNewButton = this.userSession.sessionExists;
			})
			.fail((xhr) => {
				var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
				
				var msg = 'Failed to clear user session: ' + responseData.userMessage;
				this.globalfuncs.appendToLog(msg);
				this.gc.modalMenu.openMenu("error", msg);

			})
			.always(() => {
				this.checkUsernameEnablePlayButton();
				this.updateUI();
			})
		}
	}

	update(timeElapsed, dt) {
	
	}

}

