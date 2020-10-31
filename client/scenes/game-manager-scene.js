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
		console.log('init on game manager scene');
		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
		];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);
	}
	  
	create() {
		console.log('adding scenes...');
		this.scene.add('server-connection-scene', ServerConnectionScene);
		this.scene.start('server-connection-scene');
	}

	connectedToServer() {
		console.log('connected to server called on game manager scene');

		//take the websocket from server connection scene, and load up main scene
		this.ws = this.scene.manager.getScene("server-connection-scene").ws;
		this.userName = this.scene.manager.getScene("server-connection-scene").userName;
		this.scene.manager.add("main-scene", MainScene, true, {
			ws: this.ws,
			userName: this.userName
		});
		this.scene.manager.stop("server-connection-scene");
		this.scene.manager.remove("server-connection-scene");
	}

	exitServer() {
		//close the websocket, and restart the server connection scene
		this.ws = this.scene.manager.getScene("main-scene").ws;
		
		
		this.scene.manager.add("server-connection-scene", ServerConnectionScene, true);
		this.scene.manager.stop("main-scene");
		this.scene.manager.remove("main-scene");
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

