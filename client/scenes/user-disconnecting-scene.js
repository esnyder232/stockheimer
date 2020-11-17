import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"


export default class UserDisconnectingScene extends Phaser.Scene {
	constructor() {
		super();
		this.globalfuncs = new GlobalFuncs();
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
	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);
		
		$("#user-disconnecting-scene-root").addClass("hide");
	}
	  
	update(timeElapsed, dt) {
		
	}
}

