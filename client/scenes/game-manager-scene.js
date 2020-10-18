import MyTilesetScene from "./my-tileset-scene.js"
import ServerConnectionScene from "./server-connection-scene.js"
import MainScreenScene from "./main-screen-scene.js"
import GlobalFuncs from "../global-funcs.js"


export default class GameManagerScene extends Phaser.Scene {
	constructor() {
		super();
		this.myMessages = [];
		this.globalfuncs = new GlobalFuncs();
	}
	  
	create() {
		console.log('adding scenes...');
		this.scene.add('main-screen-scene', MainScreenScene);
		this.scene.start('main-screen-scene');


		//some things to press and log stuff when i need to
		window.addEventListener("keyup", (e) => {
			switch(e.code.toLowerCase()) {				
				case "digit1": 
					console.log('1 clicked.');
					break;
				case "digit2":
					console.log('2 clicked.');
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
	  
	update(timeElapsed, dt) {
	}


}

