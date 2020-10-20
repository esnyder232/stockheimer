import MyTilesetScene from "./my-tileset-scene.js"
import ServerConnectionScene from "./server-connection-scene.js"
import MainScene from "./main-scene.js"
import GlobalFuncs from "../global-funcs.js"


export default class GameManagerScene extends Phaser.Scene {
	constructor() {
		super();
		this.myMessages = [];
		this.globalfuncs = new GlobalFuncs();
		this.ws = null;
	}

	init() {
		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
			{event: 'join-game', func: this.joinGame.bind(this)}
		];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);
	}
	  
	create() {
		console.log('adding scenes...');
		this.scene.add('server-connection-scene', ServerConnectionScene);
		this.scene.start('server-connection-scene');


		//some things to press and log stuff when i need to
		window.addEventListener("keyup", (e) => {
			switch(e.code.toLowerCase()) {				
				case "digit1": 
					console.log('1 clicked.');
					this.scene.manager.getIndex("server-connection-scene");
					this.scene.manager.stop("server-connection-scene");
					this.scene.manager.remove("server-connection-scene");
					break;
				case "digit2":
					console.log('2 clicked.');
					this.scene.add('server-connection-scene', ServerConnectionScene);
					this.scene.start('server-connection-scene');
					break;
				case "digit3":
					console.log('3 clicked.');
					break;
				case "digit4":
					console.log('4 clicked.');
					break;
				case "keyq":
					console.log('q clicked.');
					console.log(this);
					break;
			}
		})
	}

	joinGame() {
		console.log('now joining game');
		
	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);
	}

	destroy() {
		console.log('destroy on ' + this.scene.key);

	}
}

