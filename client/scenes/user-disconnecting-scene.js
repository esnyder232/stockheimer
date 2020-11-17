import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import config from '../client-config.json';

export default class UserDisconnectingScene extends Phaser.Scene {
	constructor() {
		super(config);
		this.globalfuncs = new GlobalFuncs();
		this.disconnectComplete = false;
	}

	init(data) {
		console.log('init on ' + this.scene.key + ' start');

		this.gc = data.gc;

		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
		];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);
	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');
	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
		$("#user-disconnecting-scene-root").removeClass("hide");

		try{
			if(this.game.ws)
			{
				this.gc.ws.close();
			}
		} catch(ex) {
			this.globalfuncs.appendToLog("Exception caught when closing websocket: " + ex);
		}

		window.setTimeout(() => {
			this.disconnectComplete = true;
		}, 500)
	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);
		
		$("#user-disconnecting-scene-root").addClass("hide");
	}
	  
	update(timeElapsed, dt) {
		if(this.disconnectComplete)
		{
			console.log('Disconnect complete.');
			this.gc.changeState("server-connection");
		}
	}
}

