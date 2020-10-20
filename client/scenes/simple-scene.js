import GlobalFuncs from "../global-funcs.js"

export default class SimpleScene extends Phaser.Scene {
	constructor(config) {
		super(config);
		this.globalfuncs = new GlobalFuncs();
	}

	init() {
		console.log('init on ' + this.scene.key);

		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events},
			{event: 'destroy', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
		];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);
	}

	preload() {
		console.log('preload on ' + this.scene.key);

	}
	  
	create() {
		console.log('create on ' + this.scene.key);

	}
	
	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);
	}

	destroy() {
		console.log('destroy on ' + this.scene.key);

	}

	update(timeElapsed, dt) {
	
	}
}

