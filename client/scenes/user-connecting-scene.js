import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import config from '../client-config.json';

export default class UserConnectingScene extends Phaser.Scene {
	constructor() {
		super(config);
		this.globalfuncs = new GlobalFuncs();
		this.preloadComplete = false;
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
		//"new" tech demo map
		this.load.tilemapTiledJSON("my-tilemap", "assets/tilemaps/stockheimer-techdemo.json");
		this.load.image("stockheimer-test-tileset-extruded", "assets/tilesets/stockheimer-test-tileset-extruded.png");
		
		//other assets
		this.load.image("gravestone", "assets/sprites/gravestone.png");
		this.load.image("castle", "assets/sprites/castle.png");
	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
		$("#user-connecting-scene-root").removeClass("hide");

		this.preloadComplete = true;
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

