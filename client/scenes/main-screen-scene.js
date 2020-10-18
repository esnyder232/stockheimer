
export default class MainScreenScene extends Phaser.Scene {
	constructor(config) {
		super(config);
	}

	init() {
		console.log('init on ' + this.scene.key + ' start');

	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');

	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
		// var a = $("player-name-container");
		// console.log(a);
	}
	  
	update(timeElapsed, dt) {
	
	}
}

