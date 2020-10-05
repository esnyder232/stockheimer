import GlobalFuncs from "../global-funcs.js"
import Player from "../player/player.js"
import Box from "../box/box.js"

export default class MyTilesetScene extends Phaser.Scene {
	constructor(config) {
		super(config);

		this.globalfuncs = new GlobalFuncs();
		this.player = new Player(this);
		this.box = new Box(this);
	}

	init() {
		console.log('init on ' + this.scene.key + ' start');
	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');
		this.load.tilemapTiledJSON("my-tilemap", "assets/tilemaps/my-tilemap.json");
		this.load.image("my-tileset", "assets/tilesets/my-tileset.png");

		this.load.spritesheet("slime", "assets/spritesheets/slime.png", {frameWidth: 64, frameHeight: 64});
		this.load.json("slime-json", "assets/spritesheets/slime.json");


		this.load.spritesheet("box", "assets/spritesheets/box.png", {frameWidth: 32, frameHeight: 32});
		this.load.json("box-json", "assets/spritesheets/box.json");
	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
		console.log(this);
		//debug grid
		this.add.grid(0, 0, 1000, 1000, 10, 10, 0x057605);

		///////////////////////////
		// create world
		///////////////////////////		
		//load tilemap
		this.map = this.make.tilemap({key: "my-tilemap"});

		//load tileset
		this.tileset = this.map.addTilesetImage("my-tileset");

		//create layers
		this.layer1 = this.map.createStaticLayer("Tile Layer 1", this.tileset, 0, 0);
		//this.layer2 = this.map.createStaticLayer("Tile Layer 2", this.tileset, 0, 0);

		//set collision for tile layer
		this.layer1.setCollisionByProperty({collides: true});

		//add debug colors to tiles
		this.layer1.renderDebug(this.add.graphics());


		///////////////////////////
		// create box
		///////////////////////////
		this.box.create();

		//spawn some boxes
		// this.box.spawn(180, 50);
		// this.box.spawn(210, 50);



		///////////////////////////
		// create player
		///////////////////////////
		this.player.create();


		///////////////////////////
		// create camera
		///////////////////////////
		// this.cameraRightBound = 300;
		// this.cameraLeftBound = -50;
		// this.cameraUpBound = -450;
		// this.cameraDownBound = 450;

		// this.cameraOffsetX = -(this.cameras.main.width / 2);
		// this.cameraOffsetY = -(this.cameras.main.height / 2);

		// this.cameraRightBoundInner = this.cameraRightBound - this.cameras.main.width;
		// this.cameraLeftBoundInner = this.cameraLeftBound;
		// this.cameraUpBoundInner = this.cameraUpBound;
		// this.cameraDownBoundInner = this.cameraDownBound - this.cameras.main.height;
	}

	  
	update(timeElapsed, dt) {

		this.player.update(timeElapsed, dt);
	
		// var newx = this.player.sprite.x + this.cameraOffsetX;
		// var newy = this.player.sprite.y + this.cameraOffsetY;

		// //prevents scrolling to the left too much
		// if(newx <= this.cameraLeftBoundInner)
		// {
		// 	newx = this.cameraLeftBoundInner;
		// }
		// //prevents scrolling to the right too much
		// else if(newx >= this.cameraRightBoundInner)
		// {
		// 	newx = this.cameraRightBoundInner;
		// }

		// //prevents scrolling up too much
		// if(newy <= this.cameraUpBoundInner)
		// {
		// 	newy = this.cameraUpBoundInner;
		// }
		// //prevents scrolling down too much
		// else if(newy >= this.cameraDownBoundInner)
		// {
		// 	newy = this.cameraDownBoundInner;
		// }

		// this.cameras.main.scrollX = newx;
		// this.cameras.main.scrollY = newy;



	}
}


