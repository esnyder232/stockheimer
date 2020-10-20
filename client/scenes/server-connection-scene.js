import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

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

		var data = {};
		//get server details, like ip, how many people are currently playing, etc
		$.ajax({url: "./api/get-server-details", method: "GET", data: data})
		.done((responseData, textStatus, xhr) => {
			for(var i = 0; i < 20; i++)
			{
				this.appendToLog('get-server-details returned succesfully');
			}
			
			this.main = this.globalfuncs.getDataObjectFromArray(responseData.data.main, 0);
			console.log(responseData);
		})
		.fail((xhr) => {
			console.log('get-server-details failed');
			// var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			// this.msgGetBlog.messageError(responseData.userMessage);
			
		})

	}

	appendToLog(msg) {		
		var timestamp = new Date().toLocaleTimeString('en-US', {hour12: false});
		var msgWithTimestamp = timestamp + ": " + msg;

		console.log(msgWithTimestamp);

		var s = document.createElement('div');
		s.textContent = msgWithTimestamp;

		var log = $("#server-connection-scene-log")[0];
		log.appendChild(s)
		log.scrollTop = log.scrollHeight;
		
	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');

	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
		$("#server-connection-scene-root").removeClass("hide");
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
		


	}
	  
	update(timeElapsed, dt) {
	
	}
}

