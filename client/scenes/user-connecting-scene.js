import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import config from '../client-config.json';

export default class UserConnectingScene extends Phaser.Scene {
	constructor() {
		super(config);
		this.globalfuncs = new GlobalFuncs();
		this.connectComplete = false;
	}

	init(data) {
		console.log('init on ' + this.scene.key + ' start');
		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
			{event: 'exit-game-click', func: this.exitGameClick.bind(this)}
		];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		this.gc = data.gc;
	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');
	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
		$("#user-connecting-scene-root").removeClass("hide");

		window.setTimeout(() => {
			this.connectComplete = true;
		}, 500)
	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);
		
		$("#user-connecting-scene-root").addClass("hide");
	}

	exitGameClick() {
		this.globalfuncs.appendToLog("Disconnecting from server.");

		this.gc.gameState.exitGameClick();
	}
	
	update(timeElapsed, dt) {

	}
}

